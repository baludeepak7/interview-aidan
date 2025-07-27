import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { MeetingHeader } from '../components/MeetingHeader';
import { VideoCall } from '../components/VideoCall';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useInterview } from '../hooks/useInterview';
import { Session } from '../types/interview';
import { toast } from 'react-toastify';

export const InterviewPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const candidateName = location.state?.candidateName || 'Unknown Candidate';
  
  const [session] = useState<Session>({
    id: sessionId || '',
    candidateName,
    startTime: new Date(),
    currentQuestionIndex: 0,
    status: 'active'
  });

  const {
    state,
    messages,
    currentTranscript,
    isInitialized,
    isWaitingForResponse,
    isMicEnabled,
    initializeInterview,
    stopAllAudio,
    handleSpeechResult,
    handleMicToggle: interviewHandleMicToggle
  } = useInterview(sessionId || '');

  useEffect(() => {
    if (!sessionId) {
      toast.error('Invalid session. Redirecting to landing page.');
      navigate('/');
      return;
    }

    if (!isInitialized) {
      initializeInterview(sessionId);
    }
  }, [sessionId, isInitialized, initializeInterview, navigate]);

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, [stopAllAudio]);

  const handleMicToggle = (enabled: boolean) => {
    // Update the interview state first
    interviewHandleMicToggle(enabled);
    
    // Then show appropriate toast messages
    if (enabled) {
      if (isWaitingForResponse) {
        toast.info('Microphone enabled - speak your answer');
      } else {
        toast.info('Microphone enabled');
      }
    } else {
      toast.info('Microphone muted');
    }
  };

  const handleVideoToggle = (enabled: boolean) => {
    if (enabled) {
      toast.info('Camera enabled');
    } else {
      toast.info('Camera disabled');
    }
  };

  const handleEndInterview = () => {
    const confirmEnd = window.confirm(
      'Are you sure you want to end the interview? This action cannot be undone.'
    );
    
    if (confirmEnd) {
      stopAllAudio();
      navigate('/', { replace: true });
      toast.success('Interview ended. Thank you for your time!');
    }
  };

  const handleTranscript = (transcript: string) => {
    // Handle manual submit
    if (transcript.startsWith('SUBMIT_NOW:')) {
      const actualTranscript = transcript.replace('SUBMIT_NOW:', '');
      // Force submit the current transcript
      if (actualTranscript.trim()) {
        // This will be handled by the interview hook
        handleSpeechResult(actualTranscript);
      }
      return;
    }
    
    handleSpeechResult(transcript);
  };

  if (!sessionId) {
    return null;
  }

  if (!isInitialized) {
    return (
      <div className="interview-loading min-vh-100 d-flex align-items-center justify-content-center bg-teams-dark">
        <div className="text-center text-white">
          <LoadingSpinner size="lg" />
          <h4 className="mt-4 mb-2">Joining Interview...</h4>
          <p className="text-light opacity-75">Setting up your audio and video</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-page min-vh-100 bg-teams-dark">
      {/* Meeting Header */}
      <MeetingHeader 
        session={session}
        state={state}
        onEndInterview={handleEndInterview}
      />

      {/* Main Video Interface */}
      <div className="meeting-content" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="container-fluid h-100 p-4">
          <VideoCall
            candidateName={session.candidateName}
            state={state}
            onMicToggle={handleMicToggle}
            onVideoToggle={handleVideoToggle}
            onEndCall={handleEndInterview}
            onTranscript={handleTranscript}
          />
        </div>
      </div>

      {/* Conversation History Modal (Optional) */}
      <div className="modal fade" id="conversationModal" tabIndex={-1}>
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="bi bi-chat-dots me-2"></i>
                Interview Conversation
              </h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {messages.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-chat-square-dots fs-1 opacity-50"></i>
                  <p className="mt-3">No conversation yet</p>
                </div>
              ) : (
                <div className="conversation-history">
                  {messages.map((message, index) => (
                    <div key={message.id} className={`message mb-3 ${message.type === 'ai' ? 'ai-message' : 'candidate-message'}`}>
                      <div className={`d-flex ${message.type === 'candidate' ? 'justify-content-end' : ''}`}>
                        <div className={`message-bubble p-3 rounded-3 ${
                          message.type === 'ai' 
                            ? 'bg-light text-dark' 
                            : 'bg-primary text-white'
                        }`} style={{ maxWidth: '80%' }}>
                          <div className="d-flex align-items-start">
                            <i className={`bi ${message.type === 'ai' ? 'bi-robot' : 'bi-person-fill'} me-2 mt-1`}></i>
                            <div className="flex-grow-1">
                              <div className="fw-medium small mb-1">
                                {message.type === 'ai' ? 'AI Interviewer' : 'You'}
                              </div>
                              <div>{message.content}</div>
                              <div className={`text-end mt-2 small ${message.type === 'ai' ? 'text-muted' : 'text-white-50'}`}>
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};