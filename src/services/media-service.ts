import * as FileSystem from 'expo-file-system/legacy';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { deleteWebMedia, getWebMedia, isWebMediaUri, saveWebMedia, webMediaObjectUrl } from '@/services/web-media-store';

const mediaDir = `${FileSystem.documentDirectory}media/`;
const maxMediaBytes = 50 * 1024 * 1024;

const base64Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function decodeBase64(value: string) {
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array((value.length / 4) * 3 - padding);
  let outputIndex = 0;

  for (let index = 0; index < value.length; index += 4) {
    const a = base64Alphabet.indexOf(value[index]);
    const b = base64Alphabet.indexOf(value[index + 1]);
    const c = value[index + 2] === '=' ? 0 : base64Alphabet.indexOf(value[index + 2]);
    const d = value[index + 3] === '=' ? 0 : base64Alphabet.indexOf(value[index + 3]);
    const chunk = (a << 18) | (b << 12) | (c << 6) | d;

    if (outputIndex < bytes.length) bytes[outputIndex++] = (chunk >> 16) & 0xff;
    if (outputIndex < bytes.length) bytes[outputIndex++] = (chunk >> 8) & 0xff;
    if (outputIndex < bytes.length) bytes[outputIndex++] = chunk & 0xff;
  }

  return bytes;
}

export function encodeBase64(bytes: Uint8Array) {
  const parts: string[] = [];
  const chunkSize = 3 * 8192;

  for (let start = 0; start < bytes.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, bytes.length);
    let part = '';
    for (let index = start; index < end; index += 3) {
      const a = bytes[index];
      const hasB = index + 1 < end;
      const hasC = index + 2 < end;
      const b = hasB ? bytes[index + 1] : 0;
      const c = hasC ? bytes[index + 2] : 0;
      part +=
        base64Alphabet[a >> 2] +
        base64Alphabet[((a & 3) << 4) | (b >> 4)] +
        (hasB ? base64Alphabet[((b & 15) << 2) | (c >> 6)] : '=') +
        (hasC ? base64Alphabet[c & 63] : '=');
    }
    parts.push(part);
  }

  return parts.join('');
}

export async function readMediaForBackup(uri: string) {
  if (Platform.OS === 'web') {
    if (!isWebMediaUri(uri)) throw new Error('O arquivo do anexo não está no armazenamento local do Nexo.');
    const blob = await getWebMedia(uri);
    if (!blob) throw new Error('O arquivo físico de um anexo não foi encontrado.');
    if (blob.size > maxMediaBytes) throw new Error('Um anexo excede o limite de backup de 50 MB.');
    const base64 = encodeBase64(new Uint8Array(await blob.arrayBuffer()));
    return { base64, sizeBytes: blob.size };
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) throw new Error('O arquivo físico de um anexo não foi encontrado.');
  const sizeBytes = 'size' in info && typeof info.size === 'number' ? info.size : undefined;
  if (sizeBytes === undefined) throw new Error('Não foi possível verificar o tamanho de um anexo.');
  if (sizeBytes > maxMediaBytes) throw new Error('Um anexo excede o limite de backup de 50 MB.');
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return { base64, sizeBytes };
}

export async function restoreBackupMedia(base64: string, fileName: string, mimeType: string | null) {
  if (Platform.OS === 'web') {
    const bytes = decodeBase64(base64);
    const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
    if (blob.size > maxMediaBytes) throw new Error('Um anexo excede o limite de restauração de 50 MB.');
    return saveWebMedia(blob);
  }

  await ensureMediaDirectory();
  const extension = /\.([a-z0-9]{1,10})$/i.exec(fileName)?.[0]?.toLowerCase() || '.bin';
  const destination = `${mediaDir}${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  try {
    await FileSystem.writeAsStringAsync(destination, base64, { encoding: FileSystem.EncodingType.Base64 });
    const info = await FileSystem.getInfoAsync(destination);
    if (!info.exists) throw new Error('Não foi possível preparar um arquivo do backup.');
    return destination;
  } catch (error) {
    await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined);
    throw error;
  }
}

export async function removeRestoredMedia(uri: string) {
  if (Platform.OS === 'web') {
    await deleteWebMedia(uri);
    return;
  }
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function ensureMediaDirectory() {
  if (Platform.OS === 'web') return;
  const info = await FileSystem.getInfoAsync(mediaDir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
}

export async function copyMediaToAppStorage(uri: string, name: string, webFile?: Blob) {
  if (Platform.OS === 'web') {
    const blob = webFile || (await fetch(uri).then((response) => response.blob()));
    if (!blob) throw new Error('Não foi possível ler o arquivo selecionado.');
    if (blob.size > maxMediaBytes) throw new Error('O arquivo excede o limite local de 50 MB.');
    return { uri: await saveWebMedia(blob), size: blob.size, mimeType: blob.type || null };
  }
  await ensureMediaDirectory();
  const safeName = name.replace(/[^a-z0-9._-]/gi, '_');
  const destination = `${mediaDir}${Date.now()}-${safeName || 'media'}`;
  const isAndroidContentUri = Platform.OS === 'android' && uri.startsWith('content://');
  try {
    if (isAndroidContentUri) await new File(uri).copy(new File(destination));
    else await FileSystem.copyAsync({ from: uri, to: destination });
  } catch (copyError) {
    if (isAndroidContentUri) {
      await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => undefined);
      const reason = copyError instanceof Error && copyError.message ? ` ${copyError.message}` : '';
      throw new Error(`Não foi possível salvar o arquivo selecionado.${reason}`);
    }
    try {
      await FileSystem.moveAsync({ from: uri, to: destination });
    } catch {
      const reason = copyError instanceof Error && copyError.message ? ` ${copyError.message}` : '';
      throw new Error(`Não foi possível salvar o arquivo selecionado.${reason}`);
    }
  }
  const info = await FileSystem.getInfoAsync(destination);
  if (!info.exists) throw new Error('O arquivo selecionado não ficou disponível no armazenamento do app.');
  const size = 'size' in info && typeof info.size === 'number' ? info.size : null;
  if (size && size > maxMediaBytes) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    throw new Error('O arquivo excede o limite local de 50 MB.');
  }
  return { uri: destination, size, mimeType: null };
}

export async function resolveMediaUri(uri: string): Promise<string | null> {
  if (Platform.OS !== 'web') return (await FileSystem.getInfoAsync(uri)).exists ? uri : null;
  if (isWebMediaUri(uri)) return webMediaObjectUrl(uri);
  if (uri.startsWith('blob:')) {
    try {
      const response = await fetch(uri);
      return response.ok ? uri : null;
    } catch {
      return null;
    }
  }
  return uri.startsWith('data:') || uri.startsWith('http:') || uri.startsWith('https:') ? uri : null;
}
export async function pickFile() {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: Platform.OS !== 'android', multiple: false });
  if (result.canceled) return null;
  const file = result.assets?.[0];
  if (!file) throw new Error('Nenhum arquivo foi selecionado.');
  if (file.size && file.size > maxMediaBytes) throw new Error('O arquivo excede o limite local de 50 MB.');
  const stored = await copyMediaToAppStorage(file.uri, file.name, file.file);
  return { ...file, uri: stored.uri, size: file.size ?? stored.size ?? undefined };
}
export async function pickImage() {
  await ensureMediaDirectory();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão para acessar fotos foi negada.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled) return null;
  const image = result.assets[0];
  const stored = await copyMediaToAppStorage(image.uri, 'image.jpg', image.file);
  return { ...image, uri: stored.uri };
}
export async function captureImage() {
  await ensureMediaDirectory();
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão para usar a câmera foi negada.');
  const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
  if (result.canceled) return null;
  const image = result.assets[0];
  const stored = await copyMediaToAppStorage(image.uri, 'camera.jpg', image.file);
  return { ...image, uri: stored.uri };
}
