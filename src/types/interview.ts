export interface Message {
  id: string;
  type: 'ai' | 'candidate';
  content: string;
  timestamp: Date;
  isPlaying?: boolean;
  isRecording?: boolean;
}

export interface Session {
  id: string;
  candidateName: string;
  startTime: Date;
  currentQuestionIndex: number;
  status: 'active' | 'completed' | 'paused';
}

export interface EvaluationResponse {
  feedback: string;
  score: number;
  nextQuestion: string;
  isComplete: boolean;
  audio_base64: string;
}

export type InterviewState = 
  | 'idle'
  | 'playing-question'
  | 'recording'
  | 'processing-speech'
  | 'evaluating'
  | 'displaying-feedback';