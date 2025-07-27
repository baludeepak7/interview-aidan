import React from 'react';
import { Message } from '../types/interview';

interface ChatMessageProps {
  message: Message;
  onPlayAudio?: (text: string) => void;
  isAudioPlaying?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ 
  message, 
  onPlayAudio, 
  isAudioPlaying = false 
}) => {
  const isAI = message.type === 'ai';
  
  return (
    <div className={`d-flex mb-3 ${isAI ? 'justify-content-start' : 'justify-content-end'}`}>
      <div className={`card border-0 shadow-sm ${isAI ? 'bg-light' : 'bg-primary text-white'}`} 
           style={{ maxWidth: '80%' }}>
        <div className="card-body p-3">
          <div className="d-flex align-items-start">
            <div className={`me-2 ${isAI ? 'text-primary' : 'text-white'}`}>
              <i className={`bi ${isAI ? 'bi-robot' : 'bi-person-fill'} fs-5`}></i>
            </div>
            <div className="flex-grow-1">
              <div className="fw-bold mb-1 small">
                {isAI ? 'AI Interviewer' : 'You'}
              </div>
              <div>{message.content}</div>
              {isAI && (
                <div className="mt-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onPlayAudio?.(message.content)}
                    disabled={isAudioPlaying}
                  >
                    <i className={`bi ${isAudioPlaying ? 'bi-volume-up-fill' : 'bi-play-fill'} me-1`}></i>
                    {isAudioPlaying ? 'Playing...' : 'Play'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className={`text-end mt-2 small ${isAI ? 'text-muted' : 'text-white-50'}`}>
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
};