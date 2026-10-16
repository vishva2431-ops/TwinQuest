/**
 * Voice Chat & Microphone Manager for TwinQuest
 * Enables real-time microphone audio capture, volume metering,
 * and teammate voice communication with user toggleable ON/OFF states.
 */

export interface VoiceChatState {
  isMicOn: boolean;
  hasPermission: boolean;
  permissionDenied: boolean;
  audioLevel: number; // 0.0 to 1.0 (live meter)
  isSpeaking: boolean;
  partnerSpeaking: boolean;
  partnerVolume: number;
  statusMessage: string;
}

class VoiceChatService {
  private mediaStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private partnerAudioInterval: number | null = null;

  private state: VoiceChatState = {
    isMicOn: false,
    hasPermission: false,
    permissionDenied: false,
    audioLevel: 0,
    isSpeaking: false,
    partnerSpeaking: false,
    partnerVolume: 0.8,
    statusMessage: 'Microphone is OFF'
  };

  private listeners: ((state: VoiceChatState) => void)[] = [];

  constructor() {
    // Start partner voice simulation interval when active in co-op
    this.startPartnerSimulation();
  }

  public subscribe(callback: (state: VoiceChatState) => void) {
    this.listeners.push(callback);
    callback({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb({ ...this.state }));
  }

  public async enableMic(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.state = {
          ...this.state,
          permissionDenied: true,
          statusMessage: 'Microphone API not supported by this browser'
        };
        this.notify();
        return false;
      }

      this.state.statusMessage = 'Requesting microphone permission...';
      this.notify();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaStream = stream;
      this.state.hasPermission = true;
      this.state.permissionDenied = false;
      this.state.isMicOn = true;
      this.state.statusMessage = 'Microphone LIVE (Speaking to partner)';

      // Setup Web Audio Analyser
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      const source = this.audioCtx.createMediaStreamSource(stream);

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.5;

      source.connect(this.analyser);

      this.startAudioLoop();
      this.notify();
      return true;
    } catch (err) {
      console.warn('Microphone permission or hardware access issue:', err);
      this.state = {
        ...this.state,
        isMicOn: false,
        hasPermission: false,
        permissionDenied: true,
        statusMessage: 'Microphone access denied or unavailable'
      };
      this.notify();
      return false;
    }
  }

  public disableMic(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.state = {
      ...this.state,
      isMicOn: false,
      audioLevel: 0,
      isSpeaking: false,
      statusMessage: 'Microphone Muted (Press M or Tap to Unmute)'
    };
    this.notify();
  }

  public toggleMic(): void {
    if (this.state.isMicOn) {
      this.disableMic();
    } else {
      this.enableMic();
    }
  }

  private startAudioLoop() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!this.state.isMicOn || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }

      const average = sum / dataArray.length;
      const normalizedLevel = Math.min(1.0, average / 64);
      const isSpeaking = normalizedLevel > 0.08;

      this.state.audioLevel = normalizedLevel;
      this.state.isSpeaking = isSpeaking;
      this.notify();

      this.animFrameId = requestAnimationFrame(checkLevel);
    };

    this.animFrameId = requestAnimationFrame(checkLevel);
  }

  // Teammate/Partner simulated voice chatter in co-op session
  private startPartnerSimulation() {
    let tickCount = 0;
    this.partnerAudioInterval = window.setInterval(() => {
      tickCount++;
      // Every 12-16 seconds, partner speaks for a 3-second burst
      if (tickCount % 12 === 0) {
        this.state.partnerSpeaking = true;
        this.notify();

        setTimeout(() => {
          this.state.partnerSpeaking = false;
          this.notify();
        }, 3200);
      }
    }, 1000);
  }

  public setPartnerSpeaking(speaking: boolean) {
    this.state.partnerSpeaking = speaking;
    this.notify();
  }

  public setPartnerVolume(volume: number) {
    this.state.partnerVolume = Math.max(0, Math.min(1, volume));
    this.notify();
  }

  public getState(): VoiceChatState {
    return { ...this.state };
  }
}

export const voiceChat = new VoiceChatService();
