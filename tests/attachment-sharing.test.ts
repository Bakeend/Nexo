import { getAttachmentMimeType } from '@/services/attachment-sharing';
import type { Attachment } from '@/types/domain';

function attachment(overrides: Partial<Attachment> = {}) {
  return {
    id: 'attachment-1',
    itemId: 'item-1',
    itemType: 'file',
    type: 'file',
    originalName: 'video.mp4',
    localPath: 'file:///app/video.mp4',
    mimeType: null,
    sizeBytes: null,
    thumbnailPath: null,
    durationMs: null,
    pinned: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  } satisfies Attachment;
}

describe('attachment sharing', () => {
  it('infers a video MIME type when the picker did not provide one', () => {
    expect(getAttachmentMimeType(attachment())).toBe('video/mp4');
  });

  it('uses the saved MIME type for formats without a known extension', () => {
    expect(getAttachmentMimeType(attachment({ originalName: 'arquivo.bin', mimeType: 'application/x-custom' }))).toBe(
      'application/x-custom',
    );
  });

  it('replaces a generic MIME type with a more useful extension guess', () => {
    expect(getAttachmentMimeType(attachment({ originalName: 'clip.webm', mimeType: 'application/octet-stream' }))).toBe('video/webm');
  });
});
