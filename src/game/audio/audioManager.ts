/**
 * 16-Bit Systemic Game Engine - Audio System
 * Handles seamless playback of the 8 provided industrial metal/synth tracks,
 * dynamic combat/sector crossfades, real-time frequency analysis for VU meters,
 * and procedural 16-bit sound effect synthesis.
 */

import { AudioTrackKey, TrackMetadata } from '../types';

export const SOUNDTRACK_TRACKS: Record<AudioTrackKey, TrackMetadata> = {
  clock_in_sort_the_rain: {
    key: 'clock_in_sort_the_rain',
    title: 'Clock In: Sort the Rain',
    filename: '/assets/aistudio/Clock_In__Sort_the_Rain_34b39441.m4a',
    vibeUk: 'Індустріальний біт, сортувальні конвеєри, ритмічний дощ цеху',
    duration: '03:01',
    role: 'ambient'
  },
  warehouse_assault: {
    key: 'warehouse_assault',
    title: 'Warehouse Assault',
    filename: '/assets/aistudio/Warehouse_Assault_53c95232.m4a',
    vibeUk: 'Бойова тривога складу, штурмові дрони, важкий метал',
    duration: '03:17',
    role: 'combat'
  },
  corroded_machine_pulse: {
    key: 'corroded_machine_pulse',
    title: 'Corroded Machine Pulse',
    filename: '/assets/aistudio/Corroded_Machine_Pulse_143e2cc7.m4a',
    vibeUk: 'Пульсація корозійного реактора, токсичний ритм, кислотний бас',
    duration: '03:33',
    role: 'ambient'
  },
  frost_and_static: {
    key: 'frost_and_static',
    title: 'Frost and Static',
    filename: '/assets/aistudio/Frost_and_Static_be472e0a.m4a',
    vibeUk: 'Кріо-конденсат, морозний статичний шум, крижаний синтез',
    duration: '04:10',
    role: 'ambient'
  },
  shadowy_space: {
    key: 'shadowy_space',
    title: 'Shadowy Space',
    filename: '/assets/aistudio/Shadowy_Space_d0d736a1.m4a',
    vibeUk: 'Підземні кабельні канали, стелс-напруга, темні коридори',
    duration: '03:49',
    role: 'ambient'
  },
  circuitry_chase: {
    key: 'circuitry_chase',
    title: 'Circuitry Chase',
    filename: '/assets/aistudio/Circuitry_Chase_51d2dcb6.m4a',
    vibeUk: 'Перевантаження контурів, шалений темп, аварійна евакуація',
    duration: '03:22',
    role: 'chase'
  },
  concrete_hell: {
    key: 'concrete_hell',
    title: 'Concrete Hell',
    filename: '/assets/aistudio/Concrete_Hell_a5ba47d7.m4a',
    vibeUk: 'Бетонний ад, скрегіт бронеплит, наближення до ядра',
    duration: '03:59',
    role: 'combat'
  },
  mechanicus: {
    key: 'mechanicus',
    title: 'Mechanicus',
    filename: '/assets/aistudio/Mechanicus_5e449249.m4a',
    vibeUk: 'Культ древнього механізму, бос Архітектор Корпусу, фінальний гімн сталі',
    duration: '04:40',
    role: 'boss'
  }
};

class AudioManager {
  private audioCtx: AudioContext | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private currentTrackKey: AudioTrackKey | null = null;
  private analyser: AnalyserNode | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.65;
  private sfxVolume: number = 0.75;
  private audioInitialized: boolean = false;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;

  public init() {
    if (this.audioInitialized) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
      this.audioInitialized = true;
    } catch {
      // AudioContext might be restricted until first user interaction
    }
  }

  public ensureContext() {
    if (!this.audioCtx) {
      this.init();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public playTrack(trackKey: AudioTrackKey, loop: boolean = true) {
    this.ensureContext();
    const track = SOUNDTRACK_TRACKS[trackKey];
    if (!track) return;

    if (this.currentTrackKey === trackKey && this.currentAudio && !this.currentAudio.paused) {
      return; // Already playing
    }

    // Smooth fade out current
    if (this.currentAudio) {
      const oldAudio = this.currentAudio;
      const fadeStep = 0.1;
      const fadeInterval = setInterval(() => {
        if (oldAudio.volume > fadeStep) {
          oldAudio.volume = Math.max(0, oldAudio.volume - fadeStep);
        } else {
          oldAudio.pause();
          clearInterval(fadeInterval);
        }
      }, 50);
    }

    try {
      const audio = new Audio(track.filename);
      audio.loop = loop;
      audio.volume = this.isMuted ? 0 : this.musicVolume;
      audio.crossOrigin = 'anonymous';

      // Connect to analyser if supported
      if (this.audioCtx && this.analyser) {
        try {
          const source = this.audioCtx.createMediaElementSource(audio);
          source.connect(this.analyser);
          this.analyser.connect(this.audioCtx.destination);
        } catch {
          // Fallback directly to audio element output
        }
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Browser autoplay policy might block until click
        });
      }

      this.currentAudio = audio;
      this.currentTrackKey = trackKey;
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  public pauseMusic() {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  public resumeMusic() {
    this.ensureContext();
    if (this.currentAudio && !this.isMuted) {
      this.currentAudio.play().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.currentAudio) {
      this.currentAudio.volume = this.isMuted ? 0 : this.musicVolume;
    }
    return this.isMuted;
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.currentAudio && !this.isMuted) {
      this.currentAudio.volume = this.musicVolume;
    }
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  public getCurrentTrack(): TrackMetadata | null {
    if (!this.currentTrackKey) return null;
    return SOUNDTRACK_TRACKS[this.currentTrackKey] || null;
  }

  public getAudioFrequencyLevels(): number[] {
    if (!this.analyser || !this.frequencyData) {
      return [0, 0, 0, 0, 0, 0, 0, 0];
    }
    this.analyser.getByteFrequencyData(this.frequencyData);
    const bands: number[] = [];
    const step = Math.floor(this.frequencyData.length / 8) || 1;
    for (let i = 0; i < 8; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += this.frequencyData[i * step + j] || 0;
      }
      bands.push(Math.min(1, (sum / step) / 255));
    }
    return bands;
  }

  /**
   * Procedural 16-Bit Sound Effects Synthesis via Web Audio API
   */
  public playSfx(
    type: 
      | 'swing' 
      | 'heavy_hit' 
      | 'parry' 
      | 'dash' 
      | 'explosion' 
      | 'shock' 
      | 'freeze' 
      | 'laser' 
      | 'pickup' 
      | 'terminal' 
      | 'boss_roar' 
      | 'player_hurt'
  ) {
    if (this.isMuted || !this.audioCtx) return;
    this.ensureContext();

    const now = this.audioCtx.currentTime;
    const masterGain = this.audioCtx.createGain();
    masterGain.gain.setValueAtTime(this.sfxVolume * 0.45, now);
    masterGain.connect(this.audioCtx.destination);

    switch (type) {
      case 'swing': {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      case 'heavy_hit': {
        // Square wave crunch + noise pop
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }

      case 'parry': {
        // High metal ringing ding
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc1.type = 'sine';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(1240, now);
        osc2.frequency.setValueAtTime(1860, now);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
        break;
      }

      case 'dash': {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'explosion': {
        // Low rumble white noise sweep
        const bufferSize = this.audioCtx.sampleRate * 0.4;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.audioCtx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.linearRampToValueAtTime(40, now + 0.4);
        const gain = this.audioCtx.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        noise.start(now);
        break;
      }

      case 'shock': {
        // Fast pitch modulation buzz
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.setValueAtTime(800, now + 0.04);
        osc.frequency.setValueAtTime(500, now + 0.08);
        osc.frequency.setValueAtTime(900, now + 0.12);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'freeze': {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.linearRampToValueAtTime(1400, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'laser': {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'pickup': {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.setValueAtTime(780, now + 0.06);
        osc.frequency.setValueAtTime(1040, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }

      case 'terminal': {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'player_hurt': {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.18);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }

      case 'boss_roar': {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(45, now + 0.6);
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }
    }
  }
}

export const audioManager = new AudioManager();
