import React, { useState, useRef, useEffect } from 'react';
import { Message, InterviewState } from '../types/interview';
import { ChatMessage } from './ChatMessage';

interface InterviewChatProps {
  messages: Message[];
  state: InterviewState;
  currentTranscript: string;
  onPlayAudio: (text: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSubmitAnswer: (answer: string) => void;
  onTranscriptChange: (transcript: string) => void;
  isAudioPlaying: boolean;
}

export const InterviewChat: React.FC<InterviewChatProps> = ({
  messages,
  state,
  currentTranscript,
  onPlayAudio,
  onStartRecording,
  onStopRecording,
  onSubmitAnswer,
  onTranscriptChange,
  isAudioPlaying
}) => {
  const [inputText, setInputText] = useState('');
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setInputText(currentTranscript);
  }, [currentTranscript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmitAnswer(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing-speech' || state === 'evaluating';
  const canSubmit = inputText.trim().length > 0 && state === 'idle';

  return (
    <div className="interview-chat h-100 d-flex flex-column">
      {/* Chat Header */}
      <div className="chat-header bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center">
          <i className="bi bi-chat-dots text-primary me-2 fs-5"></i>
          <h6 className="mb-0 fw-semibold">Interview Chat</h6>
          <span className="badge bg-primary ms-2">{messages.length}</span>
        </div>
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => setIsChatExpanded(!isChatExpanded)}
        >
          <i className={`bi ${isChatExpanded ? 'bi-chevron-down' : 'bi-chevron-up'}`}></i>
        </button>
      </div>

      {isChatExpanded && (
        <>
          {/* Messages Area */}
          <div className="messages-area flex-grow-1 p-3" style={{ overflowY: 'auto', maxHeight: '400px' }}>
            {messages.length === 0 ? (
              <div className="text-center text-muted py-4">
                <i className="bi bi-chat-square-dots fs-1 mb-3 d-block opacity-50"></i>
                <p className="mb-0">Interview conversation will appear here</p>
                <small>Questions and answers will be displayed in real-time</small>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onPlayAudio={onPlayAudio}
                    isAudioPlaying={isAudioPlaying}
                  />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="input-area border-top bg-light p-3">
            {/* Recording Status */}
            {isRecording && (
              <div className="alert alert-danger d-flex align-items-center mb-3 py-2">
                <div className="recording-dot me-2"></div>
                <small className="mb-0 fw-bold">Recording your response...</small>
                <button
                  className="btn btn-sm btn-outline-danger ms-auto"
                  onClick={onStopRecording}
                >
                  <i className="bi bi-stop-fill me-1"></i>
                  Stop
                </button>
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <div className="alert alert-info d-flex align-items-center mb-3 py-2">
                <div className="spinner-border spinner-border-sm text-info me-2" role="status">
                  <span className="visually-hidden">Processing...</span>
                </div>
                <small className="mb-0">
                  {state === 'processing-speech' ? 'Converting speech to text...' : 'AI is evaluating your response...'}
                </small>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <textarea
                  ref={inputRef}
                  className="form-control"
                  placeholder="Type your response or use voice recording..."
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    onTranscriptChange(e.target.value);
                  }}
                  onKeyPress={handleKeyPress}
                  disabled={isProcessing}
                  rows={2}
                  style={{ resize: 'none' }}
                />
                <div className="input-group-append d-flex">
                  {/* Voice Recording Button */}
                  <button
                    type="button"
                    className={`btn ${isRecording ? 'btn-danger' : 'btn-outline-primary'}`}
                    onClick={isRecording ? onStopRecording : onStartRecording}
                    disabled={isProcessing}
                    title={isRecording ? 'Stop recording' : 'Start voice recording'}
                  >
                    <i className={`bi ${isRecording ? 'bi-stop-fill' : 'bi-mic-fill'}`}></i>
                  </button>

                  {/* Send Button */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!canSubmit || isProcessing}
                    title="Send response"
                  >
                    {isProcessing ? (
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Sending...</span>
                      </div>
                    ) : (
                      <i className="bi bi-send-fill"></i>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Character Count */}
            {inputText && (
              <div className="text-end mt-2">
                <small className="text-muted">{inputText.length} characters</small>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};