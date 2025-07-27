import React, { useState, useEffect } from 'react';
import { Session, InterviewState } from '../types/interview';

interface MeetingHeaderProps {
  session: Session;
  state: InterviewState;
  onEndInterview: () => void;
  connectionQuality?: 'excellent' | 'good' | 'poor';
}

export const MeetingHeader: React.FC<MeetingHeaderProps> = ({ 
  session, 
  state, 
  onEndInterview,
  connectionQuality = 'excellent'
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const elapsed = Math.floor((now.getTime() - session.startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(timer);
  }, [session.startTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getConnectionInfo = () => {
    const qualityMap = {
      excellent: { color: 'success', bars: 4, text: 'Excellent' },
      good: { color: 'warning', bars: 3, text: 'Good' },
      poor: { color: 'danger', bars: 2, text: 'Poor' }
    };
    return qualityMap[connectionQuality];
  };

  const connectionInfo = getConnectionInfo();

  const getStateInfo = () => {
    switch (state) {
      case 'playing-question':
        return { icon: 'volume-up-fill', text: 'AI Speaking', color: 'info' };
      case 'recording':
        return { icon: 'mic-fill', text: 'Listening', color: 'success' };
      case 'processing-speech':
        return { icon: 'cpu-fill', text: 'Processing', color: 'warning' };
      case 'evaluating':
        return { icon: 'brain', text: 'Evaluating', color: 'primary' };
      default:
        return { icon: 'check-circle-fill', text: 'Ready', color: 'success' };
    }
  };

  const stateInfo = getStateInfo();

  return (
    <div className="meeting-header bg-teams-dark text-white">
      <div className="container-fluid px-4 py-3">
        <div className="row align-items-center">
          {/* Left: Meeting Info */}
          <div className="col-lg-4 col-md-6">
            <div className="d-flex align-items-center">
              <div className="meeting-icon me-3">
                <div className="icon-circle bg-primary d-flex align-items-center justify-content-center">
                  <i className="bi bi-camera-video-fill fs-5"></i>
                </div>
              </div>
              <div>
                <h6 className="mb-0 fw-semibold text-white">AI Interview Session</h6>
                <div className="d-flex align-items-center text-light opacity-75 small">
                  <div className="connection-quality me-2">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`connection-bar ${i < connectionInfo.bars ? `bg-${connectionInfo.color}` : 'bg-secondary'}`}
                      />
                    ))}
                  </div>
                  <span className="me-2">{connectionInfo.text}</span>
                  <span>• {formatTime(elapsedTime)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Current State */}
          <div className="col-lg-4 col-md-6 text-center">
            <div className="current-state">
              <div className={`state-indicator badge bg-${stateInfo.color} px-3 py-2 rounded-pill`}>
                <i className={`bi bi-${stateInfo.icon} me-2`}></i>
                <span className="fw-medium">{stateInfo.text}</span>
              </div>
            </div>
          </div>

          {/* Right: Session Info & Controls */}
          <div className="col-lg-4 text-end">
            <div className="d-flex align-items-center justify-content-end gap-3">
              {/* Participant Info */}
              <div className="participant-summary d-flex align-items-center">
                <div className="participant-avatar me-2">
                  <div className="avatar-sm bg-success rounded-circle d-flex align-items-center justify-content-center">
                    <i className="bi bi-person-fill text-white small"></i>
                  </div>
                </div>
                <div className="text-start">
                  <div className="fw-medium small">{session.candidateName}</div>
                  <div className="text-light opacity-75 x-small">Candidate</div>
                </div>
              </div>

              {/* Session Details */}
              <div className="session-info text-end d-none d-md-block">
                <div className="fw-medium small">{currentTime.toLocaleTimeString()}</div>
                <div className="text-light opacity-75 x-small">ID: {session.id.slice(-6)}</div>
              </div>

              {/* Meeting Actions */}
              <div className="meeting-actions">
                <div className="dropdown">
                  <button
                    className="btn btn-outline-light btn-sm"
                    type="button"
                    data-bs-toggle="dropdown"
                    title="Meeting options"
                  >
                    <i className="bi bi-three-dots-vertical"></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <h6 className="dropdown-header">Meeting Options</h6>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#">
                        <i className="bi bi-gear me-2"></i>Settings
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#">
                        <i className="bi bi-volume-up me-2"></i>Audio Settings
                      </a>
                    </li>
                    <li>
                      <a className="dropdown-item" href="#">
                        <i className="bi bi-camera-video me-2"></i>Video Settings
                      </a>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <a className="dropdown-item" href="#">
                        <i className="bi bi-info-circle me-2"></i>Connection Info
                      </a>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <a className="dropdown-item text-danger" href="#" onClick={onEndInterview}>
                        <i className="bi bi-telephone-x me-2"></i>End Interview
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};