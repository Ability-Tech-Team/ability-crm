'use client';

/**
 * Plays the user-supplied notification tune from `/sounds/notify.aac`.
 *
 * Browsers require a prior user gesture before audio can play; the first
 * call after a fresh page load may be blocked silently. Subsequent calls
 * (after the user has interacted with the tab) will play normally.
 */
const SOUND_URL = '/sounds/notify.mp3';

let cachedAudio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (cachedAudio) return cachedAudio;
  const audio = new Audio(SOUND_URL);
  audio.preload = 'auto';
  audio.volume = 0.8;
  cachedAudio = audio;
  return audio;
}

export function playNotificationSound(): void {
  const audio = getAudio();
  if (!audio) return;
  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers throw if the media isn't ready yet — safe to ignore.
  }
  const result = audio.play();
  if (result && typeof result.catch === 'function') {
    result.catch(() => undefined);
  }
}
