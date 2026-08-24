/**
 * Two short ascending beeps, synthesised on the spot.
 *
 * Audible over gym noise and costs no audio asset, which matters because the
 * native shells bundle the whole web build.
 */
export function playChime() {
  try {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const now = context.currentTime;

    [880, 1174].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.35, now + index * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.22 + 0.2);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.22);
      oscillator.stop(now + index * 0.22 + 0.22);
    });

    setTimeout(() => void context.close(), 900);
  } catch {
    // Autoplay blocked or WebAudio unavailable: the haptic still fires.
  }
}
