// src/lib/sounds.ts

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playExpense() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  // Coin drop effect: short descending frequency
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.2);
}

export function playIncome() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  // Power-up effect: ascending frequency
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
  osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
  osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.25);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

export function playBudgetExceeded() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  // Dissonant error sound
  osc1.type = 'sawtooth';
  osc2.type = 'triangle';
  
  osc1.frequency.setValueAtTime(150, ctx.currentTime);
  osc2.frequency.setValueAtTime(160, ctx.currentTime);
  
  osc1.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
  osc2.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.35);
  osc2.stop(ctx.currentTime + 0.35);
}

export function playGoalComplete() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [
    { freq: 440, time: 0 },   // A4
    { freq: 554.37, time: 0.1 }, // C#5
    { freq: 659.25, time: 0.2 }, // E5
    { freq: 880, time: 0.3 }, // A5
  ];

  notes.forEach((note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);
    
    gain.gain.setValueAtTime(0, ctx.currentTime + note.time);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + note.time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + note.time + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + note.time);
    osc.stop(ctx.currentTime + note.time + 0.25);
  });
}

export function playAIInsight() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  // Soft tick/chime
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  
  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
}

export function playCoinDrop() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  const gain2 = ctx.createGain();

  // High metallic "clink"
  osc1.type = 'sine';
  osc2.type = 'triangle';
  
  // Coin hitting
  osc1.frequency.setValueAtTime(1800, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
  
  // Resonant ring
  osc2.frequency.setValueAtTime(2400, ctx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.2);

  gain1.gain.setValueAtTime(0, ctx.currentTime);
  gain1.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

  gain2.gain.setValueAtTime(0, ctx.currentTime);
  gain2.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  
  osc2.connect(gain2);
  gain2.connect(ctx.destination);

  osc1.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.3);
  osc2.stop(ctx.currentTime + 0.3);
}
