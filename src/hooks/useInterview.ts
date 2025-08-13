import { useState, useCallback, useRef } from 'react';
import { Message, InterviewState } from '../types/interview';
import { mediaService } from '../services/mediaService';
import { apiService } from '../services/apiService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

/**
 * useInterview hook
 * - Debounces STT with a 3s silence timer
 * - Prevents double submits using cycle versioning + a submitting guard
 * - Cancels/ignores timers created before/after submit properly
 */
export const useInterview = (sessionId: string) => {
  const [state, setState] = useState<InterviewState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  // NOTE: use ReturnType<typeof setTimeout> to be browser-safe
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messageIdCounter = useRef(0);
  const initializationRef = useRef(false);

  // Prevent re-entrancy and stale timers
  const isSubmittingRef = useRef(false);
  const cycleRef = useRef(0); // increments each time we (re)enter a listening window

  const navigate = useNavigate();

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

  const startListeningForNextAnswer = useCallback(() => {
    cycleRef.current += 1; // new listening cycle
    setCurrentTranscript('');
    setState('recording');
    setIsWaitingForResponse(true);
  }, []);

  const handleMicToggle = useCallback((enabled: boolean) => {
    setIsMicEnabled(enabled);
    console.log('🎤 Mic toggled:', enabled, 'Current state:', state);
    
    if (!enabled) {
      // Mic turned off - clear transcript and stop any pending submissions
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }
      setCurrentTranscript('');
      
      // If we were waiting for response, stay in idle until mic is re-enabled
      if (isWaitingForResponse) {
        setState('idle');
      }
    } else if (enabled && isWaitingForResponse && !isAISpeaking) {
      // Mic turned on and we're waiting for response - start recording
      console.log('🎤 Mic enabled - starting recording state');
      startListeningForNextAnswer();
    }
  }, [state, isWaitingForResponse, isAISpeaking, startListeningForNextAnswer]);

  const initializeInterview = useCallback(async (sessionId: string) => {
    if (initializationRef.current || isInitialized) {
      console.log('🚫 Interview already initializing or initialized');
      return;
    }

    try {
      console.log('🚀 Starting interview initialization...');
      setIsInitialized(true);
      initializationRef.current = true;
      setState('playing-question');

      // Get the first question
      const result = await apiService.evaluateAnswer("", "start the interview");
      addMessage('ai', result.nextQuestion);

      // Speak the question
      setIsAISpeaking(true);
      console.log('🔊 AI speaking question...');
      await mediaService.speakText(result.audio_base64);
      setIsAISpeaking(false);

      // Now wait for candidate response
      console.log('👂 Waiting for candidate response and state set to recording...');
      startListeningForNextAnswer();
    } catch (error) {
      console.error('❌ Failed to initialize interview:', error);
      toast.error('Failed to start interview. Please refresh and try again.');
      setState('idle');
      initializationRef.current = false;
    }
  }, [addMessage, isInitialized, startListeningForNextAnswer]);

  const handleSpeechResult = useCallback(async (transcript: string) => {
    if (
      !transcript.trim() ||
      !isWaitingForResponse ||
      state !== 'recording' ||
      !isMicEnabled ||
      isAISpeaking ||
      isSubmittingRef.current // ignore while a submit is underway
    ) {
      // console.log('🚫 Ignoring speech result');
      return;
    }

    // Update current transcript for real-time display
    setCurrentTranscript(transcript);

    // Clear any existing timeout
    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
    }

    // Capture the cycle we’re in now
    const myCycle = cycleRef.current;

    // Set a timeout to auto-submit after 3 seconds of silence
    speechTimeoutRef.current = setTimeout(async () => {
      // Only submit if we're still in the same listening cycle & still recording
      if (
        myCycle === cycleRef.current &&
        isWaitingForResponse &&
        state === 'recording' &&
        !isAISpeaking &&
        isMicEnabled &&
        !isSubmittingRef.current
      ) {
        await submitAnswer(transcript);
      }
    }, 3000);
  }, [isWaitingForResponse, state, isMicEnabled, isAISpeaking]);

  const submitAnswer = useCallback(async (answer: string) => {
    if (isSubmittingRef.current) return; // already submitting
    if (!answer.trim() || !isWaitingForResponse || !isMicEnabled) {
      console.log('🚫 Cannot submit answer:', { 
        hasAnswer: !!answer.trim(), 
        isWaiting: isWaitingForResponse, 
        micEnabled: isMicEnabled 
      });
      return;
    }

    // Invalidate any pending timers instantly and mark as submitting
    cycleRef.current += 1; // kill stale timers for this cycle
    isSubmittingRef.current = true;

    try {
      console.log('📤 Submitting answer:', answer);
      setState('evaluating');
      setIsWaitingForResponse(false);
      setCurrentTranscript('');

      // Clear any pending timeout
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
        speechTimeoutRef.current = null;
      }

      // Add candidate's response
      addMessage('candidate', answer);

      // Get the last AI question for context
      const lastAiMessage = messages.filter(m => m.type === 'ai').pop();
      
      // Evaluate the answer
      console.log('🤖 AI evaluating response...');
      const evaluation = await apiService.evaluateAnswer(
        lastAiMessage?.content || '',
        answer
      );

      console.log('📊 Evaluation result:', evaluation);

      // Queue up playing next question
      setState('playing-question');

      if (evaluation.nextQuestion) {
        // Add and speak the next question
        console.log('❓ Next question:', evaluation.nextQuestion);
        addMessage('ai', evaluation.nextQuestion);
        
        setIsAISpeaking(true);
        console.log('🔊 AI speaking next question...');
        await mediaService.speakText(evaluation.audio_base64);
        setIsAISpeaking(false);
        
        if (isMicEnabled) {
          console.log('👂 Waiting for next response...');
          startListeningForNextAnswer();
        } else {
          console.log('🎤 Mic disabled - staying in idle state');
          setState('idle');
        }
      }
      
      if (evaluation.isComplete) {
        // Interview completed
        console.log('✅ Interview completed!');
        setState('idle');
        toast.success('Interview completed! Thank you for your time.');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Failed to submit answer:', error);
      toast.error('Failed to process your response. Please try again.');
      
      // Only return to recording state if mic is enabled
      if (isMicEnabled) {
        startListeningForNextAnswer();
      } else {
        setState('idle');
      }
    } finally {
      isSubmittingRef.current = false; // release
      mediaService.clearTranscriptBuffer?.();
      setCurrentTranscript('');
    }
  }, [messages, addMessage, isWaitingForResponse, isMicEnabled, navigate, startListeningForNextAnswer]);

  const stopAllAudio = useCallback(() => {
    console.log('🛑 Stopping all audio...');
    mediaService.stopSpeaking?.();
    mediaService.stopRecording?.();
    setIsAISpeaking(false);

    if (speechTimeoutRef.current) {
      clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = null;
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
    isAISpeaking,
    initializeInterview,
    submitAnswer,
    stopAllAudio,
    handleSpeechResult,
    setCurrentTranscript,
    handleMicToggle
  };
};
