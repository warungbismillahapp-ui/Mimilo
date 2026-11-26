/**
 * MIMILO Notification Utilities
 * - playNotificationSound : Web Audio API (no external files needed)
 * - vibrateDevice         : Vibration API
 * - triggerNotification   : sound + vibration combined
 * - formatWANumber        : normalize WA numbers to 62xxxxxxxxxx format
 */

export const playNotificationSound = (type: 'chat' | 'listing' = 'chat'): void => {
  try {
    const AudioCtxClass = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();

    const beep = (freq: number, start: number, duration: number, vol = 0.9): void => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gainNode.gain.setValueAtTime(0, start);
      gainNode.gain.linearRampToValueAtTime(vol, start + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
      osc.start(start);
      osc.stop(start + duration + 0.06);
    };

    const t = ctx.currentTime;
    if (type === 'chat') {
      // Double-ping — WA-style message sound
      beep(880,  t,        0.15, 0.9);
      beep(1200, t + 0.13, 0.22, 0.75);
    } else {
      // Three-tone ascending — new listing alert
      beep(660,  t,        0.10, 0.9);
      beep(880,  t + 0.14, 0.10, 0.9);
      beep(1100, t + 0.28, 0.24, 1.0);
    }
  } catch {
    // AudioContext blocked or not supported — silent fail
  }
};

export const vibrateDevice = (pattern: number[] = [200, 100, 200]): void => {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    // Vibration API not supported
  }
};

/** Play sound AND vibrate — use this everywhere for a full notification */
export const triggerNotification = (type: 'chat' | 'listing' = 'chat'): void => {
  playNotificationSound(type);
  vibrateDevice(type === 'chat' ? [150, 80, 150] : [200, 100, 200, 100, 200]);
};

/**
 * Normalize any phone number to WhatsApp-compatible format (62xxxxxxxxxx).
 * Handles:  08xx → 628xx  |  +62xx → 62xx  |  62xx → unchanged
 */
export const formatWANumber = (raw: string): string => {
  let num = raw.replace(/\D/g, '');                    // strip non-digits
  if (num.startsWith('0')) num = '62' + num.slice(1);  // 08xx → 628xx
  return num;
};
