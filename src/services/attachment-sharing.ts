import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { resolveMediaUri } from '@/services/media-service';
import type { Attachment } from '@/types/domain';

const mimeTypesByExtension: Record<string, string> = {
  avi: 'video/x-msvideo',
  flac: 'audio/flac',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  m4a: 'audio/mp4',
  m4v: 'video/x-m4v',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  ogv: 'video/ogg',
  pdf: 'application/pdf',
  wav: 'audio/wav',
  webm: 'video/webm',
  wmv: 'video/x-ms-wmv',
};

function extensionFrom(value: string | null | undefined) {
  const name = value?.split(/[?#]/, 1)[0];
  return name ? /\.([a-z0-9]{1,10})$/i.exec(name)?.[1]?.toLowerCase() : undefined;
}

export function getAttachmentMimeType(attachment: Attachment) {
  const storedMimeType = attachment.mimeType?.trim();
  const guessedMimeType = mimeTypesByExtension[extensionFrom(attachment.originalName) || extensionFrom(attachment.localPath) || ''];

  if (storedMimeType && storedMimeType !== 'application/octet-stream') return storedMimeType;
  return guessedMimeType || storedMimeType || 'application/octet-stream';
}

export async function openAttachmentExternally(attachment: Attachment, resolvedUri?: string | null) {
  const uri = resolvedUri || (await resolveMediaUri(attachment.localPath));
  if (!uri) throw new Error('O arquivo do anexo não está disponível.');

  if (Platform.OS === 'web') {
    const openedWindow = window.open(uri, '_blank', 'noopener,noreferrer');
    if (!openedWindow) throw new Error('O navegador bloqueou a abertura do arquivo.');
    return;
  }

  if (!(await Sharing.isAvailableAsync())) throw new Error('Nenhum aplicativo compatível está disponível.');
  await Sharing.shareAsync(uri, {
    mimeType: getAttachmentMimeType(attachment),
    dialogTitle: 'Abrir com aplicativo',
  });
}

export async function shareAttachment(attachment: Attachment) {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(attachment.localPath, {
    mimeType: getAttachmentMimeType(attachment),
    dialogTitle: attachment.originalName || 'Compartilhar anexo',
  });
  return true;
}
