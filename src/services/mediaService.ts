class MediaService {
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recognition: SpeechRecognition | null = null;
  private isRecognitionActive = false;
  private onTranscriptCallback: ((text: string) => void) | null = null;

  constructor() {
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
    }

    if (this.recognition) {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript && this.onTranscriptCallback) {
          this.onTranscriptCallback(finalTranscript);
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };
    }
  }

  async initializeMedia(): Promise<{ video: boolean; audio: boolean }> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      return { video: true, audio: true };
    } catch (error) {
      console.error('Failed to access media devices:', error);
      
      // Try audio only
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        });
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
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const isEnabled = videoTracks[0].enabled;
        videoTracks[0].enabled = !isEnabled;
        return !isEnabled;
      }
    }
    return false;
  }

  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const isEnabled = audioTracks[0].enabled;
        audioTracks[0].enabled = !isEnabled;
        
        // Start/stop speech recognition based on audio state
        if (!isEnabled) {
          this.startSpeechRecognition();
        } else {
          this.stopSpeechRecognition();
        }
        
        return !isEnabled;
      }
    }
    return false;
  }

  startSpeechRecognition(onTranscript?: (text: string) => void) {
    if (this.recognition && !this.isRecognitionActive) {
      this.onTranscriptCallback = onTranscript || null;
      this.recognition.start();
      this.isRecognitionActive = true;
    }
  }

  stopSpeechRecognition() {
    if (this.recognition && this.isRecognitionActive) {
      this.recognition.stop();
      this.isRecognitionActive = false;
    }
  }

  async speakText(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(`Speech synthesis error: ${event.error}`));

      window.speechSynthesis.speak(utterance);
    });
  }

  stopSpeaking() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  cleanup() {
    this.stopSpeechRecognition();
    this.stopSpeaking();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const mediaService = new MediaService();