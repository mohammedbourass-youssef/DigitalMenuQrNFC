/**
 * Notification sound.
 *
 * Browsers refuse `play()` until the user has interacted with the page, so the
 * rejection is expected on the first notifications after a fresh login and is
 * always swallowed: audio is a nice-to-have, never a source of UI errors.
 */

/** Same storage key style as the rest of the app (`snackx.*`). */
const MUTED_STORAGE_KEY = 'snackx.notifications.muted';

const SOUND_URL = `${import.meta.env.BASE_URL}sounds/notification.mp3`;
const SOUND_VOLUME = 0.6;

let audio: HTMLAudioElement | null = null;
let muted = readMuted();

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === 'true';
  } catch {
    /* storage unavailable (private mode) - fall back to sound on */
    return false;
  }
}

function writeMuted(value: boolean): void {
  try {
    localStorage.setItem(MUTED_STORAGE_KEY, String(value));
  } catch {
    /* keep the in-memory value for this session */
  }
}

/** Preload once, lazily, so the file is warm before the first notification. */
function getAudio(): HTMLAudioElement | null {
  if (audio) return audio;
  if (typeof Audio === 'undefined') return null;

  try {
    audio = new Audio(SOUND_URL);
    audio.preload = 'auto';
    audio.volume = SOUND_VOLUME;
    return audio;
  } catch (error) {
    console.error('[notifications] could not create the audio element', error);
    audio = null;
    return null;
  }
}

export function isSoundMuted(): boolean {
  return muted;
}

/** Persisted mute toggle; sound is on by default. */
export function setSoundMuted(next: boolean): boolean {
  muted = next;
  writeMuted(next);
  if (!next) {
    // Playing on unmute doubles as a preview and as a user gesture that unlocks audio.
    void playNotificationSound();
  }
  return muted;
}

export function toggleSoundMuted(): boolean {
  return setSoundMuted(!muted);
}

/** Warms the audio element up. Safe to call on mount. */
export function preloadNotificationSound(): void {
  getAudio();
}

/** Never throws and never rejects. */
export async function playNotificationSound(): Promise<void> {
  if (muted) return;

  const element = getAudio();
  if (!element) return;

  try {
    element.currentTime = 0;
    await element.play();
  } catch {
    // Blocked by the autoplay policy (no user interaction yet), or the file
    // failed to load. The snackbar still appears either way.
  }
}
