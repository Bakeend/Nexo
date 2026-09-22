import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/design/theme';
import { Header, PrimaryButton, SecondaryButton } from '@/components/ui';
import { AppDialog, useSnackbar } from '@/components/visual';
import { appendNoteBlock, createAttachment, createInboxCapture, listAttachments } from '@/database/repositories';
import { copyMediaToAppStorage } from '@/services/media-service';
export default function AudioCapture() {
  const { showSnackbar } = useSnackbar();
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [status, setStatus] = useState('');
  const [permissionError, setPermissionError] = useState(false);
  const start = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setPermissionError(true);
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus('Gravando…');
  };
  const stop = async () => {
    await recorder.stop();
    if (recorder.uri) {
      const audio = await copyMediaToAppStorage(recorder.uri, `audio-${Date.now()}.m4a`);
      if (noteId) {
        const existingAudioCount = (await listAttachments(noteId)).filter((item) => item.type === 'audio').length;
        const friendlyName = existingAudioCount === 0 ? 'Nova gravação de voz' : `Gravação de voz ${existingAudioCount + 1}`;
        const attachment = await createAttachment({
          itemId: noteId,
          itemType: 'note',
          type: 'audio',
          originalName: friendlyName,
          localPath: audio.uri,
          mimeType: 'audio/m4a',
          sizeBytes: audio.size,
          durationMs: state.durationMillis,
        });
        await appendNoteBlock(noteId, { type: 'audio', attachmentId: attachment.id, label: friendlyName });
        setStatus('Áudio inserido na nota');
        showSnackbar('Áudio anexado à nota');
      } else {
        const friendlyName = 'Nova gravação de voz';
        const capture = await createInboxCapture(`Áudio: ${friendlyName}`, 'audio');
        await createAttachment({
          itemId: capture.itemId,
          itemType: 'audio',
          type: 'audio',
          originalName: friendlyName,
          localPath: audio.uri,
          mimeType: 'audio/m4a',
          sizeBytes: audio.size,
          durationMs: state.durationMillis,
        });
        setStatus('Áudio salvo na Caixa de entrada');
        showSnackbar('Áudio salvo na Caixa de entrada');
      }
    }
  };
  return (
    <View style={styles.root}>
      <Header title="Gravar áudio" onBack={() => router.back()} />
      <View style={styles.content}>
        <View style={styles.timer}>
          <Text style={styles.timerText}>
            {Math.floor((state.durationMillis || 0) / 1000)
              .toString()
              .padStart(2, '0')}
            s
          </Text>
          <Text style={styles.status}>{status || 'Pronto para gravar'}</Text>
        </View>
        {state.isRecording ? (
          <>
            <PrimaryButton title="Finalizar gravação" onPress={stop} />
            <SecondaryButton title="Pausar" onPress={() => recorder.pause()} />
          </>
        ) : (
          <PrimaryButton title="Começar a gravar" onPress={start} icon="mic-outline" />
        )}
      </View>
      <AppDialog
        visible={permissionError}
        title="Permissão necessária"
        message="Ative o microfone para gravar um áudio."
        confirmLabel="Entendi"
        onClose={() => setPermissionError(false)}
        onConfirm={() => setPermissionError(false)}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  timer: { alignItems: 'center', marginBottom: spacing.xl },
  timerText: { ...typography.display, color: colors.ink },
  status: { ...typography.body, color: colors.inkMuted, marginTop: spacing.sm },
});
