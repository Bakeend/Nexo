import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, useThemeColors, useThemeStyles, type AppColors } from '@/design/theme';
import { findAttachment } from '@/database/repositories';
import { resolveMediaUri } from '@/services/media-service';
import { AnimatedPressable } from '@/motion/AnimatedPressable';
import { motionDuration } from '@/motion/tokens';
import { useReducedMotion } from '@/motion/useReducedMotion';

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';
type AudioPlaybackValue = {
  currentAttachmentId: string | null;
  isBuffering: boolean;
  stateFor: (attachmentId: string) => PlaybackState;
  toggle: (attachmentId: string) => Promise<void>;
  stop: (attachmentId?: string) => void;
};
type AudioPlaybackActions = Pick<AudioPlaybackValue, 'toggle' | 'stop'>;

const AudioPlaybackContext = createContext<AudioPlaybackValue | null>(null);
const AudioPlaybackActionsContext = createContext<AudioPlaybackActions | null>(null);

export function AudioPlaybackProvider({ children }: PropsWithChildren) {
  const player = useAudioPlayer(null, { updateInterval: 120 });
  const status = useAudioPlayerStatus(player);
  const [currentAttachmentId, setCurrentAttachmentId] = useState<string | null>(null);
  const [loadingAttachmentId, setLoadingAttachmentId] = useState<string | null>(null);
  const [errorAttachmentId, setErrorAttachmentId] = useState<string | null>(null);
  const requestRef = useRef(0);
  const [playerRequestId, setPlayerRequestId] = useState<number | null>(null);
  const playerErrorRequestRef = useRef<{
    requestId: number;
    attachmentId: string;
    errorCleared: boolean;
    errorHandled: boolean;
  } | null>(null);
  const latestPlayerErrorRef = useRef(status.error);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latestPlayerErrorRef.current = status.error;
  }, [status.error]);

  useEffect(() => {
    const playerErrorRequest = playerErrorRequestRef.current;
    if (playerErrorRequest && playerErrorRequest.requestId === playerRequestId && playerErrorRequest.requestId === requestRef.current) {
      if (!status.error) playerErrorRequest.errorCleared = true;
      if (
        status.error &&
        playerErrorRequest.errorCleared &&
        !playerErrorRequest.errorHandled &&
        playerErrorRequest.attachmentId === currentAttachmentId
      ) {
        playerErrorRequest.errorHandled = true;
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
        setLoadingAttachmentId(null);
        setErrorAttachmentId(currentAttachmentId);
        player.pause();
      }
    }

    if (status.playing && loadingAttachmentId) {
      setLoadingAttachmentId(null);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
    if (status.didJustFinish && currentAttachmentId && loadingAttachmentId !== currentAttachmentId) {
      setCurrentAttachmentId(null);
      setLoadingAttachmentId(null);
      setErrorAttachmentId(null);
      playerErrorRequestRef.current = null;
      setPlayerRequestId(null);
      player.pause();
      player.seekTo(0).catch(() => undefined);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  }, [currentAttachmentId, loadingAttachmentId, player, playerRequestId, status.didJustFinish, status.error, status.playing]);

  useEffect(
    () => () => {
      requestRef.current += 1;
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    },
    [],
  );

  const stateFor = useCallback(
    (attachmentId: string): PlaybackState => {
      if (currentAttachmentId !== attachmentId) return 'idle';
      if (loadingAttachmentId === attachmentId) return 'loading';
      if (errorAttachmentId === attachmentId) return 'error';
      return status.playing ? 'playing' : 'paused';
    },
    [currentAttachmentId, errorAttachmentId, loadingAttachmentId, status.playing],
  );

  const toggle = useCallback(
    async (attachmentId: string) => {
      if (currentAttachmentId === attachmentId && loadingAttachmentId === attachmentId) return;
      if (currentAttachmentId === attachmentId && errorAttachmentId !== attachmentId) {
        setErrorAttachmentId(null);
        if (status.playing) {
          player.pause();
        } else {
          player.play();
        }
        return;
      }

      const request = ++requestRef.current;
      playerErrorRequestRef.current = null;
      setPlayerRequestId(null);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
      setCurrentAttachmentId(attachmentId);
      setLoadingAttachmentId(attachmentId);
      setErrorAttachmentId(null);
      player.pause();

      try {
        const attachment = await findAttachment(attachmentId);
        if (request !== requestRef.current) return;
        if (!attachment || attachment.type !== 'audio') throw new Error('Gravação não encontrada.');
        const resolvedUri = await resolveMediaUri(attachment.localPath);
        if (!resolvedUri) throw new Error('O arquivo de áudio não está disponível neste dispositivo.');
        if (request !== requestRef.current) return;

        const errorCleared = latestPlayerErrorRef.current === null;
        player.replace(resolvedUri);
        playerErrorRequestRef.current = {
          requestId: request,
          attachmentId,
          errorCleared,
          errorHandled: false,
        };
        setPlayerRequestId(request);
        player.play();
        loadingTimerRef.current = setTimeout(() => {
          if (request !== requestRef.current) return;
          loadingTimerRef.current = null;
          const playerErrorRequest = playerErrorRequestRef.current;
          if (playerErrorRequest?.requestId === request) playerErrorRequest.errorHandled = true;
          player.pause();
          setLoadingAttachmentId(null);
          setErrorAttachmentId(attachmentId);
        }, 12000);
      } catch {
        if (request !== requestRef.current) return;
        setLoadingAttachmentId(null);
        setErrorAttachmentId(attachmentId);
      }
    },
    [currentAttachmentId, errorAttachmentId, loadingAttachmentId, player, status.playing],
  );

  const stop = useCallback(
    (attachmentId?: string) => {
      if (!currentAttachmentId || (attachmentId && currentAttachmentId !== attachmentId)) return;
      requestRef.current += 1;
      playerErrorRequestRef.current = null;
      setPlayerRequestId(null);
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
      player.pause();
      player.replace(null);
      setCurrentAttachmentId(null);
      setLoadingAttachmentId(null);
      setErrorAttachmentId(null);
    },
    [currentAttachmentId, player],
  );

  const actions = useMemo<AudioPlaybackActions>(() => ({ toggle, stop }), [stop, toggle]);
  const value = useMemo<AudioPlaybackValue>(
    () => ({
      currentAttachmentId,
      isBuffering: Boolean(currentAttachmentId && status.isBuffering),
      stateFor,
      toggle,
      stop,
    }),
    [currentAttachmentId, stateFor, status.isBuffering, stop, toggle],
  );

  return (
    <AudioPlaybackActionsContext.Provider value={actions}>
      <AudioPlaybackContext.Provider value={value}>{children}</AudioPlaybackContext.Provider>
    </AudioPlaybackActionsContext.Provider>
  );
}

export function useAudioPlayback() {
  const context = useContext(AudioPlaybackContext);
  if (!context) throw new Error('useAudioPlayback deve ser usado dentro de AudioPlaybackProvider');
  return context;
}

export function useAudioPlaybackActions() {
  const context = useContext(AudioPlaybackActionsContext);
  if (!context) throw new Error('useAudioPlaybackActions deve ser usado dentro de AudioPlaybackProvider');
  return context;
}

export function InlineAudioPlayer({ attachmentId }: { attachmentId: string }) {
  const colors = useThemeColors();
  const styles = useThemeStyles(makeStyles);
  const { isBuffering, stateFor, toggle } = useAudioPlayback();
  const reducedMotion = useReducedMotion();
  const state = stateFor(attachmentId);
  const playing = state === 'playing';
  const [iconProgress] = useState(() => new Animated.Value(playing ? 1 : 0));
  useEffect(() => {
    Animated.timing(iconProgress, {
      toValue: playing ? 1 : 0,
      duration: reducedMotion ? 80 : motionDuration.fast,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [iconProgress, playing, reducedMotion]);
  const playOpacity = iconProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const pauseOpacity = iconProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const playScale = iconProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] });
  const pauseScale = iconProgress.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const [loadingProgress] = useState(() => new Animated.Value(0));
  const loading = state === 'loading' || isBuffering;
  const [showSpinner, setShowSpinner] = useState(loading);
  useEffect(() => {
    if (loading) setShowSpinner(true);
    Animated.timing(loadingProgress, {
      toValue: loading ? 1 : 0,
      duration: reducedMotion ? 80 : motionDuration.fast,
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished && !loading) setShowSpinner(false);
    });
  }, [loading, loadingProgress, reducedMotion]);

  return (
    <View style={styles.player}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pausar áudio' : state === 'error' ? 'Tentar reproduzir áudio novamente' : 'Reproduzir áudio'}
        accessibilityState={{ busy: loading }}
        disabled={loading}
        onPress={() => void toggle(attachmentId)}
        style={[styles.playButton, loading && styles.playButtonDisabled]}
        pressedScale={0.92}
      >
        <View style={styles.iconStack}>
          <Animated.View style={[styles.playerIcon, { opacity: loadingProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            <Animated.View style={[styles.playerIcon, { opacity: playOpacity, transform: [{ scale: playScale }] }]}>
              <Ionicons name="play" size={19} color={colors.accentDark} />
            </Animated.View>
            <Animated.View style={[styles.playerIcon, { opacity: pauseOpacity, transform: [{ scale: pauseScale }] }]}>
              <Ionicons name="pause" size={19} color={colors.accentDark} />
            </Animated.View>
          </Animated.View>
          {showSpinner ? (
            <Animated.View style={[styles.playerIcon, { opacity: loadingProgress }]}>
              <ActivityIndicator size="small" color={colors.accent} />
            </Animated.View>
          ) : null}
        </View>
      </AnimatedPressable>
      <Waveform playing={playing} />
    </View>
  );
}

function Waveform({ playing }: { playing: boolean }) {
  const styles = useThemeStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const [restingHeights] = useState(() => [
    0.25, 0.48, 0.7, 0.36, 0.58, 0.82, 0.42, 0.66, 0.3, 0.55, 0.75, 0.4, 0.62, 0.32, 0.8, 0.5, 0.68, 0.38, 0.58, 0.28,
  ]);
  const [bars] = useState(() => restingHeights.map((height) => new Animated.Value(height)));
  useEffect(() => {
    if (!playing) {
      const reset = bars.map((bar, index) =>
        Animated.timing(bar, {
          toValue: restingHeights[index],
          duration: reducedMotion ? 80 : motionDuration.normal,
          useNativeDriver: Platform.OS !== 'web',
        }),
      );
      reset.forEach((animation) => animation.start());
      return () => reset.forEach((animation) => animation.stop());
    }
    if (reducedMotion) {
      bars.forEach((bar, index) => bar.setValue(0.42 + (index % 3) * 0.12));
      return;
    }
    const animations = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 34),
          Animated.timing(bar, {
            toValue: 0.65 + (index % 4) * 0.2,
            duration: 180 + (index % 3) * 45,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(bar, {
            toValue: 0.2 + (index % 2) * 0.15,
            duration: 190 + (index % 4) * 35,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]),
      ),
    );
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [bars, playing, reducedMotion, restingHeights]);

  return (
    <View accessibilityLabel="Forma de onda do áudio" style={styles.waveform}>
      {bars.map((bar, index) => (
        <Animated.View key={index} style={[styles.waveBar, { transform: [{ scaleY: bar }] }]} />
      ))}
    </View>
  );
}

const makeStyles = (colors: AppColors) =>
  StyleSheet.create({
    player: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
    },
    playerActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    playButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    iconStack: { width: 21, height: 21, alignItems: 'center', justifyContent: 'center' },
    playerIcon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    playButtonDisabled: { opacity: 0.65 },
    pressed: { opacity: 0.72 },
    waveform: { flex: 1, height: 32, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    waveBar: { width: 3, height: 28, borderRadius: 2, backgroundColor: colors.accent },
  });
