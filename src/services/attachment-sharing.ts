import * as Sharing from 'expo-sharing';
import type { Attachment } from '@/types/domain';

export async function shareAttachment(attachment: Attachment) {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(attachment.localPath, {
    mimeType: attachment.mimeType || undefined,
    dialogTitle: attachment.originalName || 'Compartilhar anexo',
  });
  return true;
}
