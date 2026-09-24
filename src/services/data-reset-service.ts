import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { deleteAllUserData as deleteAllUserDataFromDatabase } from '@/database/repositories';
import { clearStoredMedia } from '@/services/media-service';
import { cancelAllScheduledReminders } from '@/services/notification-service';

async function clearLocalBackups() {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return;

  const directory = FileSystem.documentDirectory;
  const names = await FileSystem.readDirectoryAsync(directory);
  await Promise.all(
    names
      .filter((name) => name.startsWith('nexo-backup-') && name.endsWith('.nexo-backup'))
      .map((name) => FileSystem.deleteAsync(`${directory}${name}`, { idempotent: true })),
  );
}

export async function deleteAllUserData() {
  await cancelAllScheduledReminders();
  await clearStoredMedia();
  await clearLocalBackups();
  await deleteAllUserDataFromDatabase();
}
