import React, { useState, useEffect } from 'react';
import { Session, InterviewState } from '../types/interview';

interface SessionHeaderProps {
  session: Session;
  state: InterviewState;
  messageCount: number;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({ session, state, messageCount }) => {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [session.startTime]);

  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getStateInfo = () => {
    switch (state) {
      case 'playing-question':
        return { icon: 'bi-volume-up-fill', text: 'AI Speaking', color: 'info' };
      case 'recording':
        return { icon: 'bi-mic-fill', text: 'Recording', color: 'danger' };
      case 'processing-speech':
        return { icon: 'bi-cpu', text: 'Processing', color: 'warning' };
      case 'evaluating':
        return { icon: 'bi-brain', text: 'Evaluating', color: 'primary' };
      default:
        return { icon: 'bi-pause-circle', text: 'Ready', color: 'success' };
    }
  };

  const stateInfo = getStateInfo();

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-body py-3">
        <div className="row align-items-center">
          <div className="col-md-4">
            <div className="d-flex align-items-center">
              <div className="avatar-circle bg-primary text-white me-3 d-flex align-items-center justify-content-center"
                   style={{ width: '40px', height: '40px', borderRadius: '50%' }}>
                <i className="bi bi-person-fill"></i>
              </div>
              <div>
                <h6 className="mb-0">{session.candidateName}</h6>
                <small className="text-muted">Session: {session.id}</small>
              </div>
            </div>
          </div>
          
          <div className="col-md-4 text-center">
            <div className="d-flex align-items-center justify-content-center">
              <i className={`bi ${stateInfo.icon} text-${stateInfo.color} me-2`}></i>
              <span className={`badge bg-${stateInfo.color} px-3 py-2`}>
                {stateInfo.text}
              </span>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="row text-center">
              <div className="col-6">
                <div className="fw-bold text-primary">{formatElapsedTime(elapsedTime)}</div>
                <small className="text-muted">Duration</small>
              </div>
              <div className="col-6">
                <div className="fw-bold text-success">{Math.floor(messageCount / 2)}</div>
                <small className="text-muted">Questions</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};