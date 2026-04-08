type AudioStartResult = {
  ok: boolean;
  message: string;
};

export type LoveAudioController = {
  start: () => Promise<AudioStartResult>;
  stop: () => void;
};

export function createLoveAudioController(): LoveAudioController {
  let audioContext: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let gainNode: GainNode | null = null;

  return {
    async start() {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioCtor) {
        return {
          ok: false,
          message: "A trilha nao esta disponivel neste dispositivo.",
        };
      }

      audioContext = audioContext ?? new AudioCtor();
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      if (oscillator) {
        return {
          ok: true,
          message: "Nossa trilha ja esta tocando.",
        };
      }

      oscillator = audioContext.createOscillator();
      gainNode = audioContext.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(392, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(440, audioContext.currentTime + 1.8);
      oscillator.frequency.linearRampToValueAtTime(392, audioContext.currentTime + 3.6);
      oscillator.frequency.linearRampToValueAtTime(523.25, audioContext.currentTime + 5.4);
      oscillator.frequency.linearRampToValueAtTime(440, audioContext.currentTime + 7.2);

      gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.03, audioContext.currentTime + 1.2);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start();

      return {
        ok: true,
        message: "Nossa trilha esta tocando agora.",
      };
    },

    stop() {
      if (!audioContext || !oscillator || !gainNode) {
        oscillator = null;
        gainNode = null;
        return;
      }

      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.35);
      oscillator.stop(audioContext.currentTime + 0.35);
      oscillator = null;
      gainNode = null;
    },
  };
}
