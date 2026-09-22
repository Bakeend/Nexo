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
  await FileSystem.copyAsync({ from: uri, to: destination });
  const info = await FileSystem.getInfoAsync(destination);
  const size = 'size' in info && typeof info.size === 'number' ? info.size : null;
  if (size && size > maxMediaBytes) {
    await FileSystem.deleteAsync(destination, { idempotent: true });
    throw new Error('O arquivo excede o limite local de 50 MB.');
  }
  return { uri: destination, size };
}
export async function pickFile() {
  await ensureMediaDirectory();
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (result.canceled) return null;
  const file = result.assets[0];
  const destination = `${mediaDir}${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
  if (file.size && file.size > maxMediaBytes) throw new Error('O arquivo excede o limite local de 50 MB.');
  await FileSystem.copyAsync({ from: file.uri, to: destination });
  return { ...file, uri: destination };
}
export async function pickImage() {
  await ensureMediaDirectory();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão para acessar fotos foi negada.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled) return null;
  const image = result.assets[0];
  const destination = `${mediaDir}${Date.now()}-image.jpg`;
  await FileSystem.copyAsync({ from: image.uri, to: destination });
  return { ...image, uri: destination };
}
export async function captureImage() {
  await ensureMediaDirectory();
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('Permissão para usar a câmera foi negada.');
  const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
  if (result.canceled) return null;
  const image = result.assets[0];
  const destination = `${mediaDir}${Date.now()}-camera.jpg`;
  await FileSystem.copyAsync({ from: image.uri, to: destination });
  return { ...image, uri: destination };
}
