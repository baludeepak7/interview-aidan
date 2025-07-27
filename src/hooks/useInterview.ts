import { useState, useCallback, useRef } from 'react';
import { Message, InterviewState, EvaluationResponse } from '../types/interview';
import { audioService } from '../services/audioService';
import { apiService } from '../services/apiService';
import { toast } from 'react-toastify';

export const useInterview = (sessionId: string) => {
  const [state, setState] = useState<InterviewState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const speechTimeoutRef = useRef<NodeJS.Timeout>();
  const messageIdCounter = useRef(0);
  const initializationRef = useRef(false);

  const generateUniqueId = useCallback((type: 'ai' | 'candidate') => {
    messageIdCounter.current += 1;
    return `${type}_${Date.now()}_${messageIdCounter.current}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addMessage = useCallback((type: 'ai' | 'candidate', content: string) => {
    const message: Message = {
      id: generateUniqueId(type),
      type,
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
    return message;
  }, [generateUniqueId]);

  const handleMicToggle = useCallback((enabled: boolean) => {
    setIsMicEnabled(enabled);
    
    if (!enabled) {
      // Mic turned off - stop any ongoing speech recognition
      audioService.stopRecording();
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      setCurrentTranscript('');
    } else if (enabled && state === 'recording' && isWaitingForResponse) {
      // Mic turned on during recording state - restart speech recognition
      console.log('🎤 Mic enabled during recording - restarting speech recognition');
    }
  }, [state, isWaitingForResponse]);
  const initializeInterview = useCallback(async (sessionId: string) => {
    if (initializationRef.current || isInitialized) {
      console.log('🚫 Interview already initializing or initialized');
      return;
    }

    try {
      console.log('🚀 Starting interview initialization...');
      initializationRef.current = true;
      setState('playing-question');
      
      // Get the first question
      const initialQuestion = await apiService.getInitialQuestion();
      console.log('📝 Got initial question:', initialQuestion);
      
      // Add AI message
      addMessage('ai', initialQuestion);
      
      // Speak the question
      console.log('🔊 AI speaking question...');
      await audioService.speakText(initialQuestion);
      
      // Now wait for candidate response
      console.log('👂 Waiting for candidate response...');
      setState('recording');
      setIsWaitingForResponse(true);
      setIsInitialized(true);
      
    } catch (error) {
      console.error('❌ Failed to initialize interview:', error);
      toast.error('Failed to start interview. Please refresh and try again.');
      setState('idle');
      initializationRef.current = false;
    }
  }, [addMessage, isInitialized]);

  const handleSpeechResult = useCallback(async (transcript: string) => {
    if (!transcript.trim() || !isWaitingForResponse || state !== 'recording' || !isMicEnabled) {
      console.log('🚫 Ignoring speech result:', { 
        hasTranscript: !!transcript.trim(), 
        isWaiting: isWaitingForResponse, 
        state, 
        micEnabled: isMicEnabled 
      });
      return;
    }

    console.log('🎤 Speech detected:', transcript);
    
    // Clear any existing timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }

    // Update current transcript for real-time display
    setCurrentTranscript(transcript);

    // Set a timeout to auto-submit after 3 seconds of silence (increased from 2)
    speechTimeoutRef.current = setTimeout(async () => {
      console.log('⏰ Auto-submitting after silence timeout');
      await submitAnswer(transcript);
    }, 3000); // Increased to 3 seconds for more comfortable timing
  }, [isWaitingForResponse, state, isMicEnabled]);

  const submitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim() || !isWaitingForResponse || !isMicEnabled) {
      console.log('🚫 Cannot submit answer:', { 
        hasAnswer: !!answer.trim(), 
        isWaiting: isWaitingForResponse, 
        micEnabled: isMicEnabled 
      });
      return;
    }

    try {
      console.log('📤 Submitting answer:', answer);
      setState('evaluating');
      setIsWaitingForResponse(false);
      setCurrentTranscript('');
      
      // Clear any pending timeouts
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }

      // Add candidate's response
      addMessage('candidate', answer);

      // Get the last AI question for context
      const lastAiMessage = messages.filter(m => m.type === 'ai').pop();
      
      // Evaluate the answer
      console.log('🤖 AI evaluating response...');
      const evaluation = await apiService.evaluateAnswer(
        sessionId,
        lastAiMessage?.content || '',
        answer
      );

      console.log('📊 Evaluation result:', evaluation);

      // Add AI feedback
      setState('playing-question');
      addMessage('ai', evaluation.feedback);
      
      // Speak the feedback
      console.log('🔊 AI speaking feedback...');
      await audioService.speakText(evaluation.feedback);

      if (!evaluation.isComplete && evaluation.nextQuestion) {
        // Add and speak the next question
        console.log('❓ Next question:', evaluation.nextQuestion);
        addMessage('ai', evaluation.nextQuestion);
        
        console.log('🔊 AI speaking next question...');
        await audioService.speakText(evaluation.nextQuestion);
        
        // Wait for next response
        if (isMicEnabled) {
          console.log('👂 Waiting for next response...');
          setState('recording');
          setIsWaitingForResponse(true);
        } else {
          console.log('🎤 Mic disabled - staying in idle state');
          setState('idle');
        }
      } else {
        // Interview completed
        console.log('✅ Interview completed!');
        setState('idle');
        toast.success('Interview completed! Thank you for your time.');
      }

    } catch (error) {
      console.error('❌ Failed to submit answer:', error);
      toast.error('Failed to process your response. Please try again.');
      
      // Only return to recording state if mic is enabled
      if (isMicEnabled) {
        setState('recording');
        setIsWaitingForResponse(true);
      } else {
        setState('idle');
      }
    }
  }, [sessionId, messages, addMessage, isWaitingForResponse, isMicEnabled]);

  const stopAllAudio = useCallback(() => {
    console.log('🛑 Stopping all audio...');
    audioService.stopSpeaking();
    audioService.stopRecording();
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
    }
    setState('idle');
    setIsWaitingForResponse(false);
    setCurrentTranscript('');
  }, []);

  return {
    state,
    messages,
    currentTranscript,
    isInitialized,
    isWaitingForResponse,
    isMicEnabled,
    initializeInterview,
    submitAnswer,
    stopAllAudio,
    handleSpeechResult,
    setCurrentTranscript,
    handleMicToggle
  };
};