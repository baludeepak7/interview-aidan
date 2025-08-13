class MediaService {
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private recognition: SpeechRecognition | null = null;
  private isRecognitionActive = false;
  private onTranscriptCallback: ((text: string) => void) | null = null;
  private transcriptBuffer = '';
  private backoffMs = 300;
  private maxBackoffMs = 5000;

  constructor() {
    this.initializeSpeechRecognition();
  }

  private get SR(): any {
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  }

  private initializeSpeechRecognition() {
    if (!this.SR) {
      console.warn('Web Speech API not supported in this browser.');
      return;
    }
    this.recognition = new this.SR();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newFinal = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        const t = r[0].transcript;
        if (r.isFinal) newFinal += t;
        else interim += t;
      }
      if (newFinal) this.transcriptBuffer = (this.transcriptBuffer + ' ' + newFinal).trim();
      if (this.onTranscriptCallback) {
        this.onTranscriptCallback((this.transcriptBuffer + ' ' + interim).trim());
      }
      // reset backoff on successful audio
      this.backoffMs = 300;
    };

    this.recognition.onerror = (e: any) => {
      console.error('Speech recognition error:', e.error);
      // Common recoverable errors
      if (['no-speech', 'audio-capture', 'network'].includes(e.error)) {
        if (this.isRecognitionActive) {
          setTimeout(() => {
            try { this.recognition?.start(); } catch {}
          }, this.backoffMs);
          this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
        }
      }
      // not-allowed = permissions denied; don’t loop
    };

    // Chrome frequently calls end/ audioend: restart if user expects continuous listening
    this.recognition.onend = () => {
      if (this.isRecognitionActive) {
        setTimeout(() => {
          try { this.recognition?.start(); } catch {}
        }, 200);
      }
    };
    this.recognition.onaudioend = () => {
      if (this.isRecognitionActive) {
        setTimeout(() => {
          try { this.recognition?.start(); } catch {}
        }, 200);
      }
    };
  }

  setLanguage(lang: string) {
    if (this.recognition) this.recognition.lang = lang;
  }

  setTranscriptCallback(cb: (text: string) => void) {
    this.onTranscriptCallback = cb;
  }

  clearTranscriptBuffer() {
    this.transcriptBuffer = '';
  }

  async ensureMicPermission(): Promise<boolean> {
    try {
      // Priming permission greatly reduces 'no-speech'
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      // keep a reference so the browser keeps track open
      if (!this.localStream) this.localStream = stream;
      return true;
    } catch (e) {
      console.error('Microphone permission denied:', e);
      return false;
    }
  }

  async initializeMedia(): Promise<{ video: boolean; audio: boolean }> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      return { video: true, audio: true };
    } catch (error) {
      console.error('Failed to access media devices:', error);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        return { video: false, audio: true };
      } catch (audioError) {
        console.error('Failed to access audio:', audioError);
        return { video: false, audio: false };
      }
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  toggleVideo(): boolean {
    const tracks = this.localStream?.getVideoTracks();
    if (tracks && tracks.length) {
      tracks[0].enabled = !tracks[0].enabled;
      return tracks[0].enabled;
    }
    return false;
  }

  toggleAudio(): boolean {
    const tracks = this.localStream?.getAudioTracks();
    if (tracks && tracks.length) {
      const wasEnabled = tracks[0].enabled;
      tracks[0].enabled = !wasEnabled;
      if (wasEnabled) this.stopSpeechRecognition(); // pause STT when mic muted
      return tracks[0].enabled;
    }
    return false;
  }

  async startSpeechRecognition(onTranscript?: (text: string) => void) {
    if (!this.recognition || this.isRecognitionActive) return;
    // Call only after a user gesture (click) to avoid autoplay/permission issues
    const ok = await this.ensureMicPermission();
    if (!ok) return;

    this.onTranscriptCallback = onTranscript || this.onTranscriptCallback;
    this.backoffMs = 300;
    try {
      console.log('Media service: Starting speech recognition...');
      this.recognition.start();
      this.isRecognitionActive = true;
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }

  stopSpeechRecognition() {
    if (this.recognition && this.isRecognitionActive) {
      try { this.recognition.stop(); } catch {}
      this.isRecognitionActive = false;
    }
  }

  async speakText(base64String: string): Promise<void> {
    // Pause STT to avoid capturing TTS audio
    const wasListening = this.isRecognitionActive;
    if (wasListening) this.stopSpeechRecognition();

    const bytes = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = 'auto';

    try {
      await audio.play();
      await new Promise<void>((resolve, reject) => {
        const done = () => { cleanup(); resolve(); };
        const fail = (e: Event) => { cleanup(); reject(e); };
        const cleanup = () => {
          audio.removeEventListener('ended', done);
          audio.removeEventListener('error', fail);
          URL.revokeObjectURL(url);
        };
        audio.addEventListener('ended', done, { once: true });
        audio.addEventListener('error', fail, { once: true });
      });
    } finally {
      // Optionally resume STT after TTS
      if (wasListening) {
        // tiny delay to avoid immediate re-capture of tail audio
        setTimeout(() => this.startSpeechRecognition(this.onTranscriptCallback || undefined), 150);
      }
    }
  }

  stopSpeaking() {
    // Only applies to speechSynthesis path; your current TTS uses <audio>
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }

  stopRecording() {
    this.stopSpeechRecognition();
  }

  cleanup() {
    this.stopSpeechRecognition();
    this.stopSpeaking();
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const mediaService = new MediaService();
