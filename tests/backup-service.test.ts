import { backupSchema, mapRestoredAttachmentRows } from '@/services/backup-service';
import { decodeBase64, encodeBase64 } from '@/services/media-service';

jest.mock('@/database/database', () => ({ db: {} }));

const legacyBackup = {
  schemaVersion: 1,
  exportedAt: '2026-09-23T00:00:00.000Z',
  notes: [],
  tasks: [],
  reminders: [],
  attachments: [{ id: 'attachment-1', localPath: 'file:///old-device/photo.jpg' }],
};

const backupWithMedia = {
  schemaVersion: 2,
  exportedAt: '2026-09-23T00:00:00.000Z',
  notes: [
    {
      id: 'note-1',
      title: 'Photo note',
      content: '',
      contentFormat: 'blocks-v1',
      spaceId: null,
      pinned: false,
      archivedAt: null,
      deletedAt: null,
      createdAt: '2026-09-23T00:00:00.000Z',
      updatedAt: '2026-09-23T00:00:00.000Z',
    },
  ],
  tasks: [],
  reminders: [],
  attachments: [
    {
      id: 'attachment-1',
      itemId: 'note-1',
      itemType: 'note',
      type: 'image',
      originalName: 'photo.jpg',
      localPath: 'file:///old-device/photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
      thumbnailPath: 'file:///old-device/photo-thumb.jpg',
      durationMs: null,
      createdAt: '2026-09-23T00:00:00.000Z',
      deletedAt: null,
    },
  ],
  attachmentMedia: [
    {
      attachmentId: 'attachment-1',
      field: 'localPath',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
      contentBase64: 'AQID',
    },
    {
      attachmentId: 'attachment-1',
      field: 'thumbnailPath',
      fileName: 'photo-thumb.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 3,
      contentBase64: 'BAUG',
    },
  ],
};

describe('backup format', () => {
  it('continues to accept schema version 1 backups', () => {
    expect(backupSchema.parse(legacyBackup)).toMatchObject({ schemaVersion: 1, attachments: legacyBackup.attachments });
  });

  it('accepts a version 2 backup with original and thumbnail bytes', () => {
    expect(backupSchema.parse(backupWithMedia)).toMatchObject({ schemaVersion: 2, attachmentMedia: backupWithMedia.attachmentMedia });
  });

  it('rejects a version 2 attachment whose file content is missing', () => {
    expect(backupSchema.safeParse({ ...backupWithMedia, attachmentMedia: [] }).success).toBe(false);
  });

  it('rejects mismatched file sizes and malformed Base64 content', () => {
    const media = [...backupWithMedia.attachmentMedia];
    media[0] = { ...media[0], sizeBytes: 4 };
    expect(backupSchema.safeParse({ ...backupWithMedia, attachmentMedia: media }).success).toBe(false);

    media[0] = { ...backupWithMedia.attachmentMedia[0], contentBase64: 'AQ!D' };
    expect(backupSchema.safeParse({ ...backupWithMedia, attachmentMedia: media }).success).toBe(false);
  });

  it('rejects attachment filenames that could escape the media directory', () => {
    const media = [...backupWithMedia.attachmentMedia];
    media[0] = { ...media[0], fileName: '../photo.jpg' };
    expect(backupSchema.safeParse({ ...backupWithMedia, attachmentMedia: media }).success).toBe(false);
  });

  it('maps attachment paths to newly restored media paths', () => {
    const parsed = backupSchema.parse(backupWithMedia);
    if (parsed.schemaVersion !== 2) throw new Error('Expected version 2');
    const mapped = mapRestoredAttachmentRows(
      parsed.attachments,
      new Map([
        ['attachment-1:localPath', 'file:///new-device/media/restored-photo.jpg'],
        ['attachment-1:thumbnailPath', 'file:///new-device/media/restored-thumb.jpg'],
      ]),
    );

    expect(mapped[0].localPath).toBe('file:///new-device/media/restored-photo.jpg');
    expect(mapped[0].thumbnailPath).toBe('file:///new-device/media/restored-thumb.jpg');
    expect(mapped[0].localPath).not.toContain('old-device');
  });

  it('refuses to map an attachment when restored content is missing', () => {
    const parsed = backupSchema.parse(backupWithMedia);
    if (parsed.schemaVersion !== 2) throw new Error('Expected version 2');
    expect(() => mapRestoredAttachmentRows(parsed.attachments, new Map())).toThrow('arquivo original');
  });

  it('round trips bytes through the portable Base64 helpers', () => {
    const bytes = new Uint8Array([0, 1, 2, 127, 128, 255]);
    expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
    expect(encodeBase64(new Uint8Array())).toBe('');
  });
});
