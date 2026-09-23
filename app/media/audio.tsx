import { goBackOrHome } from '@/navigation/back';
import { RecordingPresets, requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { Header, PrimaryButton, SecondaryButton } from '@/components/ui';
import { AppDialog, useSnackbar } from '@/components/visual';
import { appendNoteBlock, createAttachment, createInboxCapture, listAttachments } from '@/database/repositories';
import { copyMediaToAppStorage } from '@/services/media-service';
import { useReducedMotion } from '@/motion/useReducedMotion';
import { motionDuration, motionEasing } from '@/motion/tokens';
import { playUISound } from '@/services/ui-sound-service';
export default function AudioCapture() {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const { showSnackbar } = useSnackbar();
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  const reducedMotion = useReducedMotion();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [status, setStatus] = useState('');
  const [permissionError, setPermissionError] = useState(false);
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pulse] = useState(() => new Animated.Value(0));
  const [micScale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reducedMotion) return;
    micScale.setValue(0.9);
    Animated.timing(micScale, {
      toValue: 1,
      duration: motionDuration.fast,
      easing: motionEasing.enter,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [micScale, reducedMotion, saved, state.isRecording]);
  useEffect(() => {
    if (!state.isRecording || reducedMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: motionEasing.standard, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: motionEasing.standard, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reducedMotion, state.isRecording]);
  const start = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPermissionError(true);
        playUISound('error-soft');
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSaved(false);
      setPaused(false);
      setStatus('Gravando…');
      playUISound('record-start');
    } catch {
      setStatus('Não foi possível iniciar a gravação');
      playUISound('error-soft');
    }
  };
  const resume = () => {
    recorder.record();
    setPaused(false);
    setStatus('Gravando…');
    playUISound('record-start');
  };
  const stop = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await recorder.stop();
      setPaused(false);
      if (!recorder.uri) throw new Error('Gravação indisponível');
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
          mimeType: audio.mimeType || 'audio/m4a',
          sizeBytes: audio.size,
          durationMs: state.durationMillis,
        });
        await appendNoteBlock(noteId, { type: 'audio', attachmentId: attachment.id, label: friendlyName });
        setStatus('Áudio inserido na nota');
        showSnackbar('Áudio anexado à nota', 'info');
      } else {
        const friendlyName = 'Nova gravação de voz';
        const capture = await createInboxCapture(`Áudio: ${friendlyName}`, 'audio');
        await createAttachment({
          itemId: capture.itemId,
          itemType: 'audio',
          type: 'audio',
          originalName: friendlyName,
          localPath: audio.uri,
          mimeType: audio.mimeType || 'audio/m4a',
          sizeBytes: audio.size,
          durationMs: state.durationMillis,
        });
        setStatus('Áudio salvo na Caixa de entrada');
        showSnackbar('Áudio salvo na Caixa de entrada', 'info');
      }
      setSaved(true);
      playUISound('record-stop');
    } catch {
      setStatus('Não foi possível salvar a gravação');
      playUISound('error-soft');
    } finally {
      setSaving(false);
    }
  };
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Header title="Gravar áudio" onBack={() => goBackOrHome()} />
      <View style={styles.content}>
        <View style={styles.timer}>
          <Animated.View
            style={[
              styles.recordIndicator,
              state.isRecording && styles.activeIndicator,
              saved && styles.savedIndicator,
              { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] }) }] },
            ]}
          >
            <Animated.View style={{ transform: [{ scale: micScale }] }}>
              <Ionicons
                name={saved ? 'checkmark' : state.isRecording ? 'mic' : paused ? 'pause' : 'mic-outline'}
                size={24}
                color={saved || state.isRecording ? colors.white : colors.accent}
              />
            </Animated.View>
          </Animated.View>
          <Text style={styles.timerText}>
            {Math.floor((state.durationMillis || 0) / 1000)
              .toString()
              .padStart(2, '0')}
            s
          </Text>
          <Text style={styles.status}>{status || 'Pronto para gravar'}</Text>
          {state.isRecording || paused ? <RecordingWaveform active={state.isRecording} reducedMotion={reducedMotion} /> : null}
        </View>
        {state.isRecording ? (
          <>
            <PrimaryButton title="Finalizar gravação" onPress={stop} loading={saving} />
            <SecondaryButton
              title="Pausar"
              onPress={() => {
                recorder.pause();
                setPaused(true);
                setStatus('Gravação pausada');
              }}
            />
          </>
        ) : paused ? (
          <>
            <PrimaryButton title="Continuar gravando" onPress={resume} icon="play-outline" />
            <SecondaryButton title="Finalizar gravação" onPress={stop} loading={saving} />
          </>
        ) : (
          <PrimaryButton title="Começar a gravar" onPress={start} icon="mic-outline" disabled={saving} />
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
    </SafeAreaView>
  );
}

function RecordingWaveform({ active, reducedMotion }: { active: boolean; reducedMotion: boolean }) {
  const styles = useThemeStyles(makeStyles);
  const [restingHeights] = useState(() => [0.35, 0.58, 0.78, 0.46, 0.7, 0.9, 0.5, 0.76, 0.42, 0.64, 0.84, 0.48]);
  const [bars] = useState(() => restingHeights.map((height) => new Animated.Value(height)));

  useEffect(() => {
    if (!active || reducedMotion) {
      bars.forEach((bar, index) => {
        bar.stopAnimation();
        Animated.timing(bar, {
          toValue: restingHeights[index],
          duration: reducedMotion ? 80 : motionDuration.normal,
          useNativeDriver: Platform.OS !== 'web',
        }).start();
      });
      return;
    }
    const animations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 38),
          Animated.timing(bar, {
            toValue: 0.56 + (index % 4) * 0.1,
            duration: 260,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(bar, {
            toValue: 0.28 + (index % 3) * 0.12,
            duration: 290,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
      ),
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [active, bars, reducedMotion, restingHeights]);

  return (
    <View accessibilityLabel="Nível do áudio" style={styles.waveform}>
      {bars.map((bar, index) => (
        <Animated.View key={index} style={[styles.waveBar, { transform: [{ scaleY: bar }] }]} />
      ))}
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
    timer: { alignItems: 'center', marginBottom: spacing.xl, gap: spacing.xs },
    timerText: { ...typography.display, color: colors.ink },
    status: { ...typography.body, color: colors.inkMuted, marginTop: spacing.sm },
    recordIndicator: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
      marginBottom: spacing.md,
    },
    activeIndicator: { backgroundColor: colors.danger },
    savedIndicator: { backgroundColor: colors.success },
    waveform: {
      height: 32,
      width: '78%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
    },
    waveBar: { width: 3, height: 27, borderRadius: 2, backgroundColor: colors.accent },
  });
