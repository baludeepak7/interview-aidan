class AudioService {
  private synthesis: SpeechSynthesis;
  private recognition: SpeechRecognition | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
    }

    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
    }
  }

  async speakText(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any currently speaking utterances
      this.synthesis.cancel();
      
      // Wait a bit for cancellation to complete
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        utterance.onend = () => resolve();
        utterance.onerror = (event) => {
          // Don't reject on interrupted error if we cancelled it
          if (event.error === 'interrupted') {
            resolve();
          } else {
            reject(new Error(`Speech synthesis error: ${event.error}`));
          }
        };

        this.synthesis.speak(utterance);
      }, 100);
    });
  }

  async startRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      let finalTranscript = '';

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // For demo purposes, we'll resolve with interim results for better UX
        if (interimTranscript) {
          // This would typically update a state for real-time display
        }
      };

      this.recognition.onend = () => {
        resolve(finalTranscript || 'Could not transcribe audio. Please try again.');
      };

      this.recognition.onerror = (event) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.start();
    });
  }

  stopRecording() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
}

export const audioService = new AudioService();