import type { ResolvedSharePayload, SharePayload } from 'expo-sharing';
import { createInboxAttachmentCapture, createInboxCapture } from '@/database/repositories';
import { copyMediaToAppStorage, removeRestoredMedia } from '@/services/media-service';

export type IncomingShareImportResult = {
  imported: number;
  failed: number;
  errors: string[];
};

export function getIncomingShareSignature(payloads: SharePayload[]) {
  return JSON.stringify(payloads.map(({ value, shareType, mimeType }) => ({ value, shareType, mimeType: mimeType || null })));
}

export function isTextSharePayload(payload: SharePayload) {
  return payload.shareType === 'text' || payload.shareType === 'url';
}

export function isBinarySharePayload(payload: SharePayload) {
  return !isTextSharePayload(payload);
}

export function getIncomingShareAttachmentType(payload: SharePayload): 'image' | 'audio' | 'file' {
  if (payload.shareType === 'image' || payload.mimeType?.toLowerCase().startsWith('image/')) return 'image';
  if (payload.shareType === 'audio' || payload.mimeType?.toLowerCase().startsWith('audio/')) return 'audio';
  return 'file';
}

function getResolvedPayload(payload: SharePayload, index: number, resolvedPayloads: ResolvedSharePayload[]) {
  const indexed = resolvedPayloads[index];
  if (indexed && indexed.value === payload.value && indexed.shareType === payload.shareType) return indexed;
  return resolvedPayloads.find((candidate) => candidate.value === payload.value && candidate.shareType === payload.shareType);
}

function basenameFromUri(uri: string) {
  const withoutQuery = uri.split(/[?#]/, 1)[0];
  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    // Keep the URI as-is when its path is not valid percent-encoding.
  }
  const candidate = decoded.split(/[\\/]/).pop()?.trim() || '';
  if (!candidate || candidate.length > 120 || /^\d+$/.test(candidate) || candidate.includes(':')) return null;
  if (uri.startsWith('content://') && !/\.[a-z0-9]{1,10}$/i.test(candidate)) return null;
  return candidate;
}

function extensionFromMimeType(mimeType: string | null, attachmentType: 'image' | 'audio' | 'file') {
  const knownExtensions: Record<string, string> = {
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/ogg': '.ogg',
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  if (mimeType && knownExtensions[mimeType.toLowerCase()]) return knownExtensions[mimeType.toLowerCase()];
  if (attachmentType === 'image') return '.jpg';
  if (attachmentType === 'audio') return '.m4a';
  return '.bin';
}

export function getIncomingShareFileName(payload: SharePayload, resolvedPayload?: ResolvedSharePayload | null) {
  const resolvedName = resolvedPayload?.originalName?.trim();
  if (resolvedName) return resolvedName.split(/[\\/]/).pop() || resolvedName;

  const uriName = basenameFromUri(payload.value);
  if (uriName) return uriName;

  const attachmentType = getIncomingShareAttachmentType(payload);
  return `${attachmentType === 'image' ? 'Imagem' : attachmentType === 'audio' ? 'Áudio' : 'Arquivo'} compartilhado${extensionFromMimeType(
    payload.mimeType || null,
    attachmentType,
  )}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Não foi possível importar o item compartilhado.';
}

export async function ingestIncomingShare(payloads: SharePayload[], resolvedPayloads: ResolvedSharePayload[] = []) {
  const result: IncomingShareImportResult = { imported: 0, failed: 0, errors: [] };

  for (const [index, payload] of payloads.entries()) {
    try {
      const value = payload.value.trim();
      if (!value) throw new Error('O conteúdo compartilhado está vazio.');

      if (isTextSharePayload(payload)) {
        await createInboxCapture(value, 'quick_capture');
      } else {
        const resolvedPayload = getResolvedPayload(payload, index, resolvedPayloads);
        const attachmentType = getIncomingShareAttachmentType(payload);
        const fileName = getIncomingShareFileName(payload, resolvedPayload);
        const mimeType = resolvedPayload?.contentMimeType || payload.mimeType || null;
        const stored = await copyMediaToAppStorage(value, fileName);
        try {
          await createInboxAttachmentCapture({
            rawText: fileName,
            itemType: attachmentType,
            type: attachmentType,
            localPath: stored.uri,
            originalName: fileName,
            mimeType,
            sizeBytes: stored.size,
          });
        } catch (error) {
          await removeRestoredMedia(stored.uri).catch(() => undefined);
          throw error;
        }
      }
      result.imported += 1;
    } catch (error) {
      result.failed += 1;
      result.errors.push(getErrorMessage(error));
    }
  }

  return result;
}
