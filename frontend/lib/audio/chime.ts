/**
 * chime.ts — Web Audio API synthesized notification sound.
 * 100% royalty-free and copyright-free chime generator.
 * Auto-stops after ~3.5 seconds. Handles browser autoplay restrictions.
 */

let audioCtx: AudioContext | null = null;
let isMutedState = false;
let activeGainNode: GainNode | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("vegito_sound_muted");
    if (stored !== null) return stored === "true";
  }
  return isMutedState;
}

export function setAudioMuted(muted: boolean): void {
  isMutedState = muted;
  if (typeof window !== "undefined") {
    localStorage.setItem("vegito_sound_muted", String(muted));
  }
  if (muted) {
    stopNotificationSound();
  }
}

export function toggleAudioMute(): boolean {
  const next = !isAudioMuted();
  setAudioMuted(next);
  return next;
}

export async function resumeAudioContext(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if ((ctx.state as string) === "suspended") {
    try {
      await ctx.resume();
      return (ctx.state as string) === "running";
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Plays a pleasant 3-tone notification chime (880Hz -> 1046Hz -> 1318Hz).
 * Returns true if audio played, false if muted or autoplay blocked.
 */
export async function playNotificationSound(): Promise<boolean> {
  if (isAudioMuted()) return false;

  const ctx = getAudioContext();
  if (!ctx) return false;

  if ((ctx.state as string) === "suspended") {
    try {
      await ctx.resume();
    } catch {
      // Autoplay blocked by browser policy
      return false;
    }
    if ((ctx.state as string) === "suspended") {
      return false;
    }
  }

  // Stop any previous playing sound
  stopNotificationSound();

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.25, now);
  masterGain.connect(ctx.destination);
  activeGainNode = masterGain;

  // 3-tone chime sequence: A5 (880Hz) -> C6 (1046.5Hz) -> E6 (1318.5Hz)
  const notes = [
    { freq: 880, start: 0.0, duration: 0.8 },
    { freq: 1046.5, start: 0.2, duration: 0.9 },
    { freq: 1318.5, start: 0.4, duration: 1.8 },
  ];

  notes.forEach(({ freq, start, duration }) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + start);

    // Smooth envelope: fast attack, exponential decay
    noteGain.gain.setValueAtTime(0, now + start);
    noteGain.gain.linearRampToValueAtTime(0.3, now + start + 0.03);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

    osc.connect(noteGain);
    noteGain.connect(masterGain);

    osc.start(now + start);
    osc.stop(now + start + duration);
  });

  // Second chime chime burst at 1.8s for clear alerting
  const secondNotes = [
    { freq: 1046.5, start: 1.8, duration: 0.6 },
    { freq: 1318.5, start: 2.0, duration: 1.4 },
  ];

  secondNotes.forEach(({ freq, start, duration }) => {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + start);

    noteGain.gain.setValueAtTime(0, now + start);
    noteGain.gain.linearRampToValueAtTime(0.25, now + start + 0.03);
    noteGain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

    osc.connect(noteGain);
    noteGain.connect(masterGain);

    osc.start(now + start);
    osc.stop(now + start + duration);
  });

  // Auto-stop after exactly 3.0 seconds
  setTimeout(() => {
    stopNotificationSound();
  }, 3000);

  return true;
}

export function stopNotificationSound(): void {
  if (activeGainNode) {
    try {
      activeGainNode.gain.setValueAtTime(0, 0);
      activeGainNode.disconnect();
    } catch {
      // Ignored
    }
    activeGainNode = null;
  }
}

// In-memory cache of played event IDs to guarantee deduplication across reconnects
const playedEventIds = new Set<string>();

/**
 * Plays the 3-second notification ringtone once per event_id.
 * Reconnects, component re-renders, or window re-focuses will NOT replay the sound
 * for an event that has already rung.
 */
export async function playNotificationSoundOnce(eventId?: string): Promise<boolean> {
  if (eventId) {
    if (playedEventIds.has(eventId)) {
      return false;
    }
    playedEventIds.add(eventId);
    // Maintain a bounded set size
    if (playedEventIds.size > 500) {
      const first = playedEventIds.values().next().value;
      if (first) playedEventIds.delete(first);
    }
  }
  return playNotificationSound();
}
