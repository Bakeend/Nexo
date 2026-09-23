import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { getDatabaseSizeBytes } from '@/database/database';
import { listStoredAttachments } from '@/database/repositories';
import { getWebMedia, isWebMediaUri } from '@/services/web-media-store';
import type { Attachment } from '@/types/domain';

export type StorageCategory = 'database' | 'file' | 'image' | 'audio' | 'backup';
export type StorageBreakdown = Record<StorageCategory, number>;
export type StorageSummary = {
  bytes: StorageBreakdown;
  totalBytes: number;
  attachmentCount: number;
  unavailableCount: number;
  freeDeviceBytes: number | null;
  totalDeviceBytes: number | null;
};

export function formatStorageBytes(bytes: number): string {
  if (bytes < 1024) return `${Math.max(0, Math.round(bytes))} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)) - 1, units.length - 1);
  const value = bytes / 1024 ** (unitIndex + 1);
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`;
}

async function localFileSize(uri: string): Promise<number | null> {
  try {
    if (Platform.OS === 'web') {
      if (!isWebMediaUri(uri)) return null;
      return (await getWebMedia(uri))?.size ?? null;
    }
    if (!FileSystem.documentDirectory || !uri.startsWith(FileSystem.documentDirectory)) return null;
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists && 'size' in info && typeof info.size === 'number' ? info.size : null;
  } catch {
    return null;
  }
}

async function backupSize(): Promise<number> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return 0;
  try {
    const names = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
    const sizes = await Promise.all(
      names
        .filter((name) => name.startsWith('nexo-backup-') && name.endsWith('.nexo-backup'))
        .map((name) => localFileSize(`${FileSystem.documentDirectory}${name}`)),
    );
    return sizes.reduce<number>((total, size) => total + (size ?? 0), 0);
  } catch {
    return 0;
  }
}

export async function getStorageSummary(): Promise<StorageSummary> {
  const [attachments, databaseSize, backups] = await Promise.all([
    listStoredAttachments(),
    getDatabaseSizeBytes().catch(() => null),
    backupSize(),
  ]);
  const bytes: StorageBreakdown = { database: databaseSize ?? 0, file: 0, image: 0, audio: 0, backup: backups };
  const seen = new Set<string>();
  let unavailableCount = databaseSize === null ? 1 : 0;
  const items: { uri: string; type: Attachment['type'] }[] = [];
  for (const attachment of attachments) {
    for (const uri of [attachment.localPath, attachment.thumbnailPath]) {
      if (!uri || seen.has(uri)) continue;
      seen.add(uri);
      items.push({ uri, type: attachment.type });
    }
  }
  const sizes = await Promise.all(items.map((item) => localFileSize(item.uri)));
  sizes.forEach((size, index) => {
    if (size === null) unavailableCount += 1;
    else bytes[items[index].type] += size;
  });
  const [freeDeviceBytes, totalDeviceBytes] =
    Platform.OS === 'web'
      ? [null, null]
      : await Promise.all([
          FileSystem.getFreeDiskStorageAsync().catch(() => null),
          FileSystem.getTotalDiskCapacityAsync().catch(() => null),
        ]);
  return {
    bytes,
    totalBytes: Object.values(bytes).reduce((total, value) => total + value, 0),
    attachmentCount: attachments.length,
    unavailableCount,
    freeDeviceBytes,
    totalDeviceBytes,
  };
}
