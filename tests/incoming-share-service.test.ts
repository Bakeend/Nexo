import type { ResolvedSharePayload, SharePayload } from 'expo-sharing';
import { createInboxAttachmentCapture, createInboxCapture } from '@/database/repositories';
import { copyMediaToAppStorage, removeRestoredMedia } from '@/services/media-service';
import {
  getIncomingShareAttachmentType,
  getIncomingShareFileName,
  getIncomingShareSignature,
  ingestIncomingShare,
} from '@/services/incoming-share-service';

jest.mock('@/database/repositories', () => ({
  createInboxAttachmentCapture: jest.fn(),
  createInboxCapture: jest.fn(),
}));
jest.mock('@/services/media-service', () => ({
  copyMediaToAppStorage: jest.fn(),
  removeRestoredMedia: jest.fn(),
}));

const inboxAttachmentCapture = createInboxAttachmentCapture as jest.MockedFunction<typeof createInboxAttachmentCapture>;
const inboxCapture = createInboxCapture as jest.MockedFunction<typeof createInboxCapture>;
const copyMedia = copyMediaToAppStorage as jest.MockedFunction<typeof copyMediaToAppStorage>;
const removeMedia = removeRestoredMedia as jest.MockedFunction<typeof removeRestoredMedia>;

function payload(overrides: Partial<SharePayload>): SharePayload {
  return { value: 'content://shared/item', shareType: 'file', mimeType: 'application/pdf', ...overrides };
}

describe('incoming share service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    copyMedia.mockResolvedValue({ uri: 'file:///app/media/shared.pdf', size: 120, mimeType: null });
    inboxCapture.mockResolvedValue({} as Awaited<ReturnType<typeof createInboxCapture>>);
    inboxAttachmentCapture.mockResolvedValue({} as Awaited<ReturnType<typeof createInboxAttachmentCapture>>);
    removeMedia.mockResolvedValue(undefined);
  });

  it('keeps the original filename and falls back to MIME-aware names', () => {
    const image = payload({ value: 'content://provider/random-id', shareType: 'image', mimeType: 'image/png' });
    const resolved = {
      ...image,
      originalName: 'minha-foto.png',
      contentUri: image.value,
      contentType: 'image',
      contentMimeType: 'image/png',
      contentSize: 20,
    } as ResolvedSharePayload;

    expect(getIncomingShareFileName(image, resolved)).toBe('minha-foto.png');
    expect(getIncomingShareFileName(payload({ value: 'content://provider/12345' }))).toBe('Arquivo compartilhado.pdf');
    expect(getIncomingShareAttachmentType(image)).toBe('image');
  });

  it('imports text, URLs and binary payloads as independent Inbox entries', async () => {
    const shared = [
      payload({ value: 'texto selecionado', shareType: 'text', mimeType: 'text/plain' }),
      payload({ value: 'https://nexo.app', shareType: 'url', mimeType: 'text/plain' }),
      payload({ value: 'content://provider/photo', shareType: 'image', mimeType: 'image/jpeg' }),
    ];

    const result = await ingestIncomingShare(shared);

    expect(result).toEqual({ imported: 3, failed: 0, errors: [] });
    expect(inboxCapture).toHaveBeenNthCalledWith(1, 'texto selecionado', 'quick_capture');
    expect(inboxCapture).toHaveBeenNthCalledWith(2, 'https://nexo.app', 'quick_capture');
    expect(inboxAttachmentCapture).toHaveBeenCalledWith(
      expect.objectContaining({ itemType: 'image', type: 'image', mimeType: 'image/jpeg' }),
    );
  });

  it('continues a multiple share after an individual file fails', async () => {
    copyMedia.mockRejectedValueOnce(new Error('arquivo indisponível'));

    const result = await ingestIncomingShare([
      payload({ value: 'content://provider/broken' }),
      payload({ value: 'content://provider/valid', mimeType: 'application/pdf' }),
    ]);

    expect(result.imported).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.errors).toEqual(['arquivo indisponível']);
    expect(inboxAttachmentCapture).toHaveBeenCalledTimes(1);
  });

  it('removes copied media when database persistence fails', async () => {
    inboxAttachmentCapture.mockRejectedValueOnce(new Error('database failure'));

    const result = await ingestIncomingShare([payload({ value: 'content://provider/photo', shareType: 'image', mimeType: 'image/jpeg' })]);

    expect(result).toMatchObject({ imported: 0, failed: 1 });
    expect(removeMedia).toHaveBeenCalledWith('file:///app/media/shared.pdf');
  });

  it('creates a stable signature from the native payload shape', () => {
    expect(getIncomingShareSignature([payload({ value: 'a' })])).toBe(
      getIncomingShareSignature([payload({ value: 'a', mimeType: 'application/pdf' })]),
    );
    expect(getIncomingShareSignature([payload({ value: 'a' })])).not.toBe(getIncomingShareSignature([payload({ value: 'b' })]));
  });
});
