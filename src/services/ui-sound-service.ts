import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useUIStore } from '@/stores/ui.store';
import { isSingleTypedCharacter } from '@/utils/typing-sound';

export type UISound =
  | 'tap-soft'
  | 'selection-click'
  | 'pop'
  | 'success-tick'
  | 'complete'
  | 'complete-soft'
  | 'attach'
  | 'error-soft'
  | 'undo-soft'
  | 'swipe-soft'
  | 'clock-tick'
  | 'capture'
  | 'record-start'
  | 'record-stop';

const sources = {
  'tap-soft': require('../../assets/sounds/tap-soft.wav'),
  'selection-click': require('../../assets/sounds/selection-click.wav'),
  pop: require('../../assets/sounds/pop.wav'),
  'success-tick': require('../../assets/sounds/success-tick.wav'),
  complete: require('../../assets/sounds/complete.wav'),
  attach: require('../../assets/sounds/attach.wav'),
  'error-soft': require('../../assets/sounds/error-soft.wav'),
} as const;

const aliases: Record<UISound, keyof typeof sources> = {
  'tap-soft': 'tap-soft',
  'selection-click': 'selection-click',
  pop: 'pop',
  'success-tick': 'success-tick',
  complete: 'complete',
  'complete-soft': 'success-tick',
  attach: 'attach',
  'error-soft': 'error-soft',
  'undo-soft': 'success-tick',
  'swipe-soft': 'tap-soft',
  'clock-tick': 'selection-click',
  capture: 'success-tick',
  'record-start': 'pop',
  'record-stop': 'success-tick',
};

const players = new Map<keyof typeof sources, AudioPlayer>();
const typingSource = require('../../assets/sounds/typing-key.wav');
const typingPlayers: AudioPlayer[] = [];
let typingPlayerIndex = 0;
let lastTypingSoundAt = 0;
let lastSoundAt = 0;
let lastSound: UISound | null = null;

function getPlayer(sound: keyof typeof sources) {
  let player = players.get(sound);
  if (!player) {
    player = createAudioPlayer(sources[sound], { updateInterval: 100 });
    player.volume = 0.18;
    players.set(sound, player);
  }
  return player;
}

export function preloadUISounds() {
  if (!useUIStore.getState().uiSoundsEnabled) return;
  (Object.keys(sources) as (keyof typeof sources)[]).forEach(getPlayer);
}

export function stopUISounds() {
  players.forEach((player) => player.pause());
}

export function preloadTypingSound() {
  if (!useUIStore.getState().typingSoundEnabled) return;
  while (typingPlayers.length < 2) {
    const player = createAudioPlayer(typingSource, { updateInterval: 100 });
    player.volume = 0.22;
    typingPlayers.push(player);
  }
}

export function stopTypingSound() {
  typingPlayers.forEach((player) => player.pause());
}

export function playTypingSound(previous: string, next: string) {
  if (!useUIStore.getState().typingSoundEnabled || !isSingleTypedCharacter(previous, next)) return;
  const now = Date.now();
  if (now - lastTypingSoundAt < 55) return;
  lastTypingSoundAt = now;
  try {
    preloadTypingSound();
    const player = typingPlayers[typingPlayerIndex++ % typingPlayers.length];
    void player
      .seekTo(0)
      .then(() => {
        if (useUIStore.getState().typingSoundEnabled) player.play();
      })
      .catch(() => {
        if (useUIStore.getState().typingSoundEnabled) player.play();
      });
  } catch {
    // Optional typing sound must never interrupt text input.
  }
}

export function playUISound(sound: UISound) {
  if (!useUIStore.getState().uiSoundsEnabled) return;
  const now = Date.now();
  if (lastSound === sound && now - lastSoundAt < 650) return;
  if (sound !== 'error-soft' && now - lastSoundAt < 90) return;
  if (
    sound === 'success-tick' &&
    lastSound &&
    ['success-tick', 'complete', 'complete-soft', 'attach', 'capture', 'record-stop', 'undo-soft'].includes(lastSound) &&
    now - lastSoundAt < 650
  )
    return;
  lastSoundAt = now;
  lastSound = sound;

  try {
    const player = getPlayer(aliases[sound]);
    void player
      .seekTo(0)
      .then(() => player.play())
      .catch(() => player.play());
  } catch {
    // UI sounds are optional and must never interrupt an interaction.
  }
}
