import * as FileSystem from 'expo-file-system/legacy';
import { getDatabaseSizeBytes } from '@/database/database';
import { listStoredAttachments } from '@/database/repositories';
import { formatStorageBytes, getStorageSummary } from '@/services/storage-service';

jest.mock('@/database/database', () => ({ getDatabaseSizeBytes: jest.fn() }));
jest.mock('@/database/repositories', () => ({ listStoredAttachments: jest.fn() }));
jest.mock('@/services/web-media-store', () => ({ getWebMedia: jest.fn(), isWebMediaUri: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///app/',
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  getFreeDiskStorageAsync: jest.fn(),
  getTotalDiskCapacityAsync: jest.fn(),
}));

const fileSystem = FileSystem as jest.Mocked<typeof FileSystem>;
const databaseSize = getDatabaseSizeBytes as jest.MockedFunction<typeof getDatabaseSizeBytes>;
const storedAttachments = listStoredAttachments as jest.MockedFunction<typeof listStoredAttachments>;

describe('storage summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    databaseSize.mockResolvedValue(120);
    storedAttachments.mockResolvedValue([
      { id: 'image-1', type: 'image', localPath: 'file:///app/image.jpg', thumbnailPath: 'file:///app/thumb.jpg' },
      { id: 'image-2', type: 'image', localPath: 'file:///app/image.jpg', thumbnailPath: null },
      { id: 'audio-1', type: 'audio', localPath: 'file:///app/missing.m4a', thumbnailPath: null },
    ] as Awaited<ReturnType<typeof listStoredAttachments>>);
    fileSystem.readDirectoryAsync.mockResolvedValue(['nexo-backup-one.nexo-backup', 'other.txt']);
    fileSystem.getInfoAsync.mockImplementation(async (uri) => {
      const size = {
        'file:///app/image.jpg': 500,
        'file:///app/thumb.jpg': 50,
        'file:///app/nexo-backup-one.nexo-backup': 200,
      }[uri];
      return size === undefined
        ? { exists: false, isDirectory: false, uri }
        : { exists: true, isDirectory: false, uri, size, modificationTime: 0 };
    });
    fileSystem.getFreeDiskStorageAsync.mockResolvedValue(2000);
    fileSystem.getTotalDiskCapacityAsync.mockResolvedValue(4000);
  });

  it('counts physical files once and separates database, media, and backup use', async () => {
    const summary = await getStorageSummary();
    expect(summary.bytes).toEqual({ database: 120, image: 550, audio: 0, file: 0, backup: 200 });
    expect(summary.totalBytes).toBe(870);
    expect(summary.attachmentCount).toBe(3);
    expect(summary.unavailableCount).toBe(1);
    expect(summary.freeDeviceBytes).toBe(2000);
    expect(summary.totalDeviceBytes).toBe(4000);
    expect(fileSystem.getInfoAsync).toHaveBeenCalledTimes(4);
  });

  it('formats small and large values without implying unavailable data is zero', () => {
    expect(formatStorageBytes(0)).toBe('0 B');
    expect(formatStorageBytes(1536)).toBe('1.5 KB');
    expect(formatStorageBytes(12 * 1024 * 1024)).toBe('12 MB');
  });
});
