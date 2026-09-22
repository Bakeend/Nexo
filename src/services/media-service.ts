import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const mediaDir = `${FileSystem.documentDirectory}media/`;
const maxMediaBytes = 50 * 1024 * 1024;
export async function ensureMediaDirectory() {
  const info = await FileSystem.getInfoAsync(mediaDir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
}

export async function copyMediaToAppStorage(uri: string, name: string) {
  await ensureMediaDirectory();
  const safeName = name.replace(/[^a-z0-9._-]/gi, '_');
  const destination = `${mediaDir}${Date.now()}-${safeName || 'media'}`;
  try {
    await FileSystem.copyAsync({ from: uri, to: destination });
  } catch (copyError) {
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
  return { uri: destination, size };
}
export async function pickFile() {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const file = result.assets?.[0];
  if (!file) throw new Error('Nenhum arquivo foi selecionado.');
  if (file.size && file.size > maxMediaBytes) throw new Error('O arquivo excede o limite local de 50 MB.');
  const stored = await copyMediaToAppStorage(file.uri, file.name);
  return { ...file, uri: stored.uri, size: file.size ?? stored.size ?? undefined };
}
export async function pickImage() {
  await ensureMediaDirectory();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão para acessar fotos foi negada.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled) return null;
  const image = result.assets[0];
  const stored = await copyMediaToAppStorage(image.uri, 'image.jpg');
  return { ...image, uri: stored.uri };
}
export async function captureImage() {
  await ensureMediaDirectory();
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão para usar a câmera foi negada.');
  const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
  if (result.canceled) return null;
  const image = result.assets[0];
  const stored = await copyMediaToAppStorage(image.uri, 'camera.jpg');
  return { ...image, uri: stored.uri };
}
