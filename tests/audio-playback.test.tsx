import React, { useEffect } from 'react';
import { act, cleanup, render } from '@testing-library/react-native';
import { findAttachment } from '@/database/repositories';
import { AudioPlaybackProvider, useAudioPlayback } from '@/components/audio-playback';
import { resolveMediaUri } from '@/services/media-service';
import type { Attachment } from '@/types/domain';

const mockPlayer = {
  replace: jest.fn(),
  play: jest.fn(),
  pause: jest.fn(),
  seekTo: jest.fn().mockResolvedValue(undefined),
};

type MockStatus = { playing: boolean; isBuffering: boolean; error: string | null; didJustFinish: boolean };

let mockStatus: MockStatus = { playing: false, isBuffering: false, error: null, didJustFinish: false };

jest.mock('expo-audio', () => ({
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => mockStatus,
}));

jest.mock('@/database/repositories', () => ({ findAttachment: jest.fn() }));
jest.mock('@/services/media-service', () => ({ resolveMediaUri: jest.fn() }));

const mockFindAttachment = jest.mocked(findAttachment);
const mockResolveMediaUri = jest.mocked(resolveMediaUri);

let playback!: ReturnType<typeof useAudioPlayback>;

function Probe() {
  const value = useAudioPlayback();
  useEffect(() => {
    playback = value;
  }, [value]);
  return null;
}

async function renderProvider() {
  renderProviderResult = await render(
    <AudioPlaybackProvider>
      <Probe />
    </AudioPlaybackProvider>,
  );
  return renderProviderResult;
}

function audioAttachment(id: string, type: Attachment['type'] = 'audio'): Attachment {
  return {
    id,
    itemId: `item-${id}`,
    itemType: 'note',
    type,
    originalName: `${id}.m4a`,
    localPath: `file://${id}.m4a`,
    mimeType: 'audio/mp4',
    sizeBytes: null,
    thumbnailPath: null,
    durationMs: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function startToggle(attachmentId: string) {
  let operation!: Promise<void>;
  await act(async () => {
    operation = playback.toggle(attachmentId);
    await Promise.resolve();
  });
  return { operation };
}

async function rerenderWithStatus(nextStatus: MockStatus) {
  mockStatus = nextStatus;
  await renderProviderResult.rerender(
    <AudioPlaybackProvider>
      <Probe />
    </AudioPlaybackProvider>,
  );
}

let renderProviderResult: Awaited<ReturnType<typeof render>>;

beforeEach(() => {
  jest.clearAllMocks();
  mockStatus = { playing: false, isBuffering: false, error: null, didJustFinish: false };
  mockFindAttachment.mockReset();
  mockResolveMediaUri.mockReset();
  mockPlayer.seekTo.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('AudioPlaybackProvider', () => {
  it('ignores the stale resolution when playback switches quickly from A to B', async () => {
    const audioA = deferred<string | null>();
    mockFindAttachment.mockImplementation(async (id) => audioAttachment(id));
    mockResolveMediaUri.mockImplementation((uri) => (uri.includes('A.m4a') ? audioA.promise : Promise.resolve('file://B.m4a')));
    await renderProvider();

    const { operation: firstRequest } = await startToggle('A');
    expect(mockResolveMediaUri).toHaveBeenCalledWith('file://A.m4a');

    let secondRequest!: Promise<void>;
    await act(async () => {
      secondRequest = playback.toggle('B');
      await Promise.resolve();
    });
    await act(async () => secondRequest);

    expect(mockPlayer.replace).toHaveBeenCalledTimes(1);
    expect(mockPlayer.replace).toHaveBeenCalledWith('file://B.m4a');
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    expect(playback.currentAttachmentId).toBe('B');

    await act(async () => {
      audioA.resolve('file://A.m4a');
      await firstRequest;
    });

    expect(mockPlayer.replace).toHaveBeenCalledTimes(1);
    expect(mockPlayer.replace).not.toHaveBeenCalledWith('file://A.m4a');
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    expect(playback.currentAttachmentId).toBe('B');
  });

  it('sets error for missing, non-audio, and unavailable or rejected media resolutions', async () => {
    await renderProvider();

    mockFindAttachment.mockResolvedValueOnce(undefined);
    await act(async () => playback.toggle('missing'));
    expect(playback.stateFor('missing')).toBe('error');
    expect(mockResolveMediaUri).not.toHaveBeenCalled();

    mockFindAttachment.mockResolvedValueOnce(audioAttachment('image', 'image'));
    await act(async () => playback.toggle('image'));
    expect(playback.stateFor('image')).toBe('error');
    expect(mockResolveMediaUri).not.toHaveBeenCalled();

    mockFindAttachment.mockResolvedValueOnce(audioAttachment('gone'));
    mockResolveMediaUri.mockResolvedValueOnce(null);
    await act(async () => playback.toggle('gone'));
    expect(playback.stateFor('gone')).toBe('error');

    mockFindAttachment.mockResolvedValueOnce(audioAttachment('resolver-error'));
    mockResolveMediaUri.mockRejectedValueOnce(new Error('resolver failed'));
    await act(async () => playback.toggle('resolver-error'));
    expect(playback.stateFor('resolver-error')).toBe('error');
  });

  it('does not replace or play media when an unresolved request finishes after unmount', async () => {
    const media = deferred<string | null>();
    mockFindAttachment.mockResolvedValue(audioAttachment('late'));
    mockResolveMediaUri.mockReturnValue(media.promise);
    await renderProvider();

    const { operation: request } = await startToggle('late');
    expect(mockResolveMediaUri).toHaveBeenCalledTimes(1);
    await renderProviderResult.unmount();

    await act(async () => {
      media.resolve('file://late.m4a');
      await request;
    });

    expect(mockPlayer.replace).not.toHaveBeenCalled();
    expect(mockPlayer.play).not.toHaveBeenCalled();
  });

  it('clears the playback timeout when unmounted while waiting for the player to start', async () => {
    mockFindAttachment.mockResolvedValue(audioAttachment('loading'));
    mockResolveMediaUri.mockResolvedValue('file://loading.m4a');
    await renderProvider();
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const timersBeforePlayback = jest.getTimerCount();

    await act(async () => playback.toggle('loading'));
    expect(playback.stateFor('loading')).toBe('loading');
    const timeoutIndex = setTimeoutSpy.mock.calls.findIndex((call) => call[1] === 12000);
    expect(timeoutIndex).toBeGreaterThanOrEqual(0);
    const playbackTimeout = setTimeoutSpy.mock.results[timeoutIndex].value;
    const timersDuringPlayback = jest.getTimerCount();
    expect(timersDuringPlayback).toBeGreaterThan(timersBeforePlayback);

    await renderProviderResult.unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledWith(playbackTimeout);
    await act(async () => jest.advanceTimersByTimeAsync(12000));
    expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
  });

  it('immediately reports a current player error during loading and clears its timeout', async () => {
    mockFindAttachment.mockResolvedValue(audioAttachment('player-error'));
    mockResolveMediaUri.mockResolvedValue('file://player-error.m4a');
    await renderProvider();
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
    const timersBeforePlayback = jest.getTimerCount();

    await act(async () => playback.toggle('player-error'));
    expect(playback.stateFor('player-error')).toBe('loading');
    const timeoutIndex = setTimeoutSpy.mock.calls.findIndex((call) => call[1] === 12000);
    expect(timeoutIndex).toBeGreaterThanOrEqual(0);
    const playbackTimeout = setTimeoutSpy.mock.results[timeoutIndex].value;
    const timersDuringPlayback = jest.getTimerCount();
    expect(timersDuringPlayback).toBeGreaterThan(timersBeforePlayback);

    await rerenderWithStatus({ playing: false, isBuffering: false, error: 'Audio source failed', didJustFinish: false });
    expect(playback.stateFor('player-error')).toBe('error');
    expect(mockPlayer.pause).toHaveBeenCalledTimes(2);
    expect(clearTimeoutSpy).toHaveBeenCalledWith(playbackTimeout);

    await act(async () => jest.advanceTimersByTimeAsync(12000));
    expect(playback.stateFor('player-error')).toBe('error');
    expect(mockPlayer.pause).toHaveBeenCalledTimes(2);
  });

  it('does not apply a previous source error to a newly requested attachment', async () => {
    const uriB = deferred<string | null>();
    mockFindAttachment.mockImplementation(async (id) => audioAttachment(id));
    mockResolveMediaUri.mockImplementation((uri) => (uri.includes('A.m4a') ? Promise.resolve('file://A.m4a') : uriB.promise));
    await renderProvider();
    jest.useFakeTimers();

    await act(async () => playback.toggle('A'));
    await rerenderWithStatus({ playing: true, isBuffering: false, error: null, didJustFinish: false });
    await rerenderWithStatus({ playing: false, isBuffering: false, error: 'Previous source failed', didJustFinish: false });
    expect(playback.stateFor('A')).toBe('error');

    const { operation: requestB } = await startToggle('B');
    expect(playback.stateFor('B')).toBe('loading');
    await act(async () => {
      uriB.resolve('file://B.m4a');
      await requestB;
    });
    expect(playback.stateFor('B')).toBe('loading');
    expect(mockPlayer.replace).toHaveBeenLastCalledWith('file://B.m4a');

    await rerenderWithStatus({ playing: false, isBuffering: false, error: null, didJustFinish: false });
    expect(playback.stateFor('B')).toBe('loading');
    await rerenderWithStatus({ playing: false, isBuffering: false, error: 'New source failed', didJustFinish: false });
    expect(playback.stateFor('B')).toBe('error');
  });

  it('pauses and reports an error when playback has not started after 12 seconds', async () => {
    mockFindAttachment.mockResolvedValue(audioAttachment('timeout'));
    mockResolveMediaUri.mockResolvedValue('file://timeout.m4a');
    await renderProvider();
    jest.useFakeTimers();

    await act(async () => playback.toggle('timeout'));
    expect(playback.stateFor('timeout')).toBe('loading');
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTimeAsync(11999));
    expect(playback.stateFor('timeout')).toBe('loading');
    await act(async () => jest.advanceTimersByTimeAsync(1));

    expect(mockPlayer.pause).toHaveBeenCalledTimes(2);
    expect(playback.stateFor('timeout')).toBe('error');
  });

  it('tracks playing and paused transitions from the player status', async () => {
    mockFindAttachment.mockResolvedValue(audioAttachment('transitions'));
    mockResolveMediaUri.mockResolvedValue('file://transitions.m4a');
    await renderProvider();
    jest.useFakeTimers();

    await act(async () => playback.toggle('transitions'));
    expect(playback.stateFor('transitions')).toBe('loading');

    await rerenderWithStatus({ playing: true, isBuffering: false, error: null, didJustFinish: false });
    expect(playback.stateFor('transitions')).toBe('playing');
    await act(async () => jest.advanceTimersByTimeAsync(12000));
    expect(playback.stateFor('transitions')).toBe('playing');
    expect(mockPlayer.pause).toHaveBeenCalledTimes(1);

    await rerenderWithStatus({ playing: false, isBuffering: false, error: null, didJustFinish: false });
    expect(playback.stateFor('transitions')).toBe('paused');

    await act(async () => playback.toggle('transitions'));
    expect(mockPlayer.play).toHaveBeenCalledTimes(2);
    await rerenderWithStatus({ playing: true, isBuffering: false, error: null, didJustFinish: false });
    expect(playback.stateFor('transitions')).toBe('playing');

    await act(async () => playback.toggle('transitions'));
    expect(mockPlayer.pause).toHaveBeenCalledTimes(2);
    await rerenderWithStatus({ playing: false, isBuffering: false, error: null, didJustFinish: false });
    expect(playback.stateFor('transitions')).toBe('paused');
  });
});
