import React, { useState, useEffect, useRef } from 'react';
import { InterviewState } from '../types/interview';
import { mediaService } from '../services/mediaService';

interface VideoCallProps {
  candidateName: string;
  state: InterviewState;
  onMicToggle: (enabled: boolean) => void;
  onVideoToggle: (enabled: boolean) => void;
  onEndCall: () => void;
  onTranscript: (text: string) => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  candidateName,
  state,
  onMicToggle,
  onVideoToggle,
  onEndCall,
  onTranscript
}) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [mediaInitialized, setMediaInitialized] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const candidateVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    initializeMedia();
    return () => {
      mediaService.cleanup();
    };
  }, []);

  useEffect(() => {
    // Only start speech recognition if mic is on, media is initialized, 
    // we're in recording state, and not during AI speaking
    if (isMicOn && mediaInitialized && state === 'recording') {
      console.log('state here --'+state)
      mediaService.startSpeechRecognition((transcript) => {
        setCurrentTranscript(transcript);
        onTranscript(transcript);
      });
    } else {
      mediaService.stopSpeechRecognition();
      setCurrentTranscript('');
    }
  }, [isMicOn, mediaInitialized, state, onTranscript]);

  const initializeMedia = async () => {
    try {
      const { video, audio } = await mediaService.initializeMedia();
      setIsVideoOn(video);
      setIsMicOn(audio);
      setMediaInitialized(true);

      const stream = mediaService.getLocalStream();
      if (stream && candidateVideoRef.current) {
        candidateVideoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to initialize media:', error);
    }
  };

  const handleMicToggle = async () => {
  if (!isMicOn) {
    // First turning ON → ensure mic permission for this origin
    await mediaService.initializeMedia();
    mediaService.clearTranscriptBuffer();
  }

  const newState = mediaService.toggleAudio();
  setIsMicOn(newState);
  setCurrentTranscript(''); // Clear transcript when toggling mic
  onMicToggle(newState);
};

  const handleVideoToggle = () => {
    const newState = mediaService.toggleVideo();
    setIsVideoOn(newState);
    onVideoToggle(newState);
  };

  const getStateIndicator = () => {
    switch (state) {
      case 'playing-question':
        return { text: 'AI is speaking...', color: 'info', icon: 'volume-up-fill' };
      case 'recording':
        return { text: 'Your turn to speak...', color: 'success', icon: 'mic-fill' };
      case 'processing-speech':
        return { text: 'Processing speech...', color: 'warning', icon: 'cpu' };
      case 'evaluating':
        return { text: 'AI is evaluating...', color: 'primary', icon: 'cpu-fill' };
      default:
        return { text: 'Ready', color: 'success', icon: 'check-circle' };
    }
  };

  const stateInfo = getStateIndicator();

  return (
    <div className="video-call-container position-relative h-100">
      {/* Main Video Grid */}
      <div className="video-grid h-100">
        <div className="row h-100 g-3">
          {/* AI Interviewer Video */}
          <div className="col-md-6">
            <div className="video-frame h-100 position-relative bg-dark rounded-3 overflow-hidden">
              <div className="video-content d-flex align-items-center justify-content-center h-100">
                <div className="text-center text-white">
                  <div className="ai-avatar mb-3">
                    <div className="avatar-circle bg-gradient-primary d-inline-flex align-items-center justify-content-center"
                         style={{ width: '120px', height: '120px', borderRadius: '50%' }}>
                      <img
  src="https://randomuser.me/api/portraits/men/32.jpg"
  alt="Human Interviewer"
  style={{
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    objectFit: 'cover',
    boxShadow: '0 2px 8px rgba(0,0,0,0.10)'
  }}
/>
                    </div>
                  </div>
                  <h4 className="mb-2 fw-semibold">Aidan</h4>
                  <div className={`status-badge badge bg-${stateInfo.color} px-3 py-2 rounded-pill`}>
                    <i className={`bi bi-${stateInfo.icon} me-2`}></i>
                    {stateInfo.text}
                  </div>
                </div>
              </div>
              
              {/* AI Status Overlay */}
              <div className="video-overlay position-absolute bottom-0 start-0 end-0 p-3">
                <div className="d-flex justify-content-between align-items-end">
                  <div className="participant-info bg-dark bg-opacity-75 text-white px-3 py-2 rounded-pill">
                    <i className="bi bi-robot me-2"></i>
                    <small className="fw-medium">Aidan</small>
                  </div>
                  {state === 'playing-question' && (
                    <div className="speaking-indicator bg-info text-white px-3 py-2 rounded-pill">
                      <div className="d-flex align-items-center">
                        <div className="audio-wave me-2">
                          <div className="wave-bar"></div>
                          <div className="wave-bar"></div>
                          <div className="wave-bar"></div>
                        </div>
                        <small>Speaking</small>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Candidate Video */}
          <div className="col-md-6">
            <div className="video-frame h-100 position-relative bg-dark rounded-3 overflow-hidden">
              {isVideoOn ? (
                <video
                  ref={candidateVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-100 h-100 object-fit-cover"
                />
              ) : (
                <div className="video-content d-flex align-items-center justify-content-center h-100">
                  <div className="text-center text-white">
                    <div className="avatar-circle bg-secondary d-inline-flex align-items-center justify-content-center mb-3"
                         style={{ width: '120px', height: '120px', borderRadius: '50%' }}>
                      <i className="bi bi-camera-video-off" style={{ fontSize: '3.5rem' }}></i>
                    </div>
                    <h4 className="mb-2 fw-semibold">{candidateName}</h4>
                    <small className="text-warning">Camera Off</small>
                  </div>
                </div>
              )}

              {/* Live Transcript Overlay */}
              {currentTranscript && isMicOn && state === 'recording' && (
                <div className="transcript-overlay position-absolute top-0 start-0 end-0 p-3">
                  <div className="bg-dark bg-opacity-90 text-white p-3 rounded-3">
                    <div className="d-flex align-items-start">
                      <i className="bi bi-mic-fill text-success me-2 mt-1"></i>
                      <div className="flex-grow-1">
                        <small className="text-success fw-medium d-block mb-1">You're speaking:</small>
                        <div className="transcript-text">{currentTranscript}</div>
                        <small className="text-muted">Will auto-submit 3 seconds after you stop speaking...</small>
                        <div className="mt-2">
                          <button 
                            className="btn btn-sm btn-success me-2"
                            onClick={() => onTranscript('SUBMIT_NOW:' + currentTranscript)}
                          >
                            <i className="bi bi-check-lg me-1"></i>
                            Submit Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Candidate Status Overlay */}
              <div className="video-overlay position-absolute bottom-0 start-0 end-0 p-3">
                <div className="d-flex justify-content-between align-items-end">
                  <div className="participant-info bg-dark bg-opacity-75 text-white px-3 py-2 rounded-pill">
                    <i className="bi bi-person-fill me-2"></i>
                    <small className="fw-medium">{candidateName} (You)</small>
                  </div>
                  <div className="d-flex gap-2">
                    {!isMicOn && (
                      <div className="status-indicator bg-danger text-white p-2 rounded-circle">
                        <i className="bi bi-mic-mute-fill"></i>
                      </div>
                    )}
                    {!isVideoOn && (
                      <div className="status-indicator bg-warning text-white p-2 rounded-circle">
                        <i className="bi bi-camera-video-off-fill"></i>
                      </div>
                    )}
                    {isMicOn && currentTranscript && state === 'recording' && (
                      <div className="status-indicator bg-success text-white px-3 py-2 rounded-pill">
                        <i className="bi bi-mic-fill me-1"></i>
                        <small>Speaking</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Meeting Controls */}
      <div className="meeting-controls position-absolute bottom-0 start-50 translate-middle-x">
        <div className="controls-container bg-dark bg-opacity-95 backdrop-blur rounded-pill px-4 py-3 shadow-lg">
          <div className="d-flex align-items-center gap-3">
            {/* Microphone Control */}
            <button
              className={`btn btn-control ${isMicOn ? 'btn-light' : 'btn-danger'}`}
              onClick={handleMicToggle}
              title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
            >
              <i className={`bi ${isMicOn ? 'bi-mic-fill' : 'bi-mic-mute-fill'}`}></i>
            </button>

            {/* Video Control */}
            <button
              className={`btn btn-control ${isVideoOn ? 'btn-light' : 'btn-warning'}`}
              onClick={handleVideoToggle}
              title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
            >
              <i className={`bi ${isVideoOn ? 'bi-camera-video-fill' : 'bi-camera-video-off-fill'}`}></i>
            </button>

            {/* Screen Share (Disabled) */}
            <button
              className="btn btn-control btn-light opacity-50"
              disabled
              title="Screen sharing not available"
            >
              <i className="bi bi-display"></i>
            </button>

            {/* More Options */}
            <div className="dropdown">
              <button
                className="btn btn-control btn-light"
                type="button"
                data-bs-toggle="dropdown"
                title="More options"
              >
                <i className="bi bi-three-dots"></i>
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><a className="dropdown-item" href="#"><i className="bi bi-gear me-2"></i>Settings</a></li>
                <li><a className="dropdown-item" href="#"><i className="bi bi-volume-up me-2"></i>Audio Settings</a></li>
                <li><hr className="dropdown-divider" /></li>
                <li><a className="dropdown-item text-muted" href="#"><i className="bi bi-info-circle me-2"></i>Connection Info</a></li>
              </ul>
            </div>

            {/* End Call */}
            <button
              className="btn btn-control btn-danger ms-2"
              onClick={onEndCall}
              title="End interview"
            >
              <i className="bi bi-telephone-x-fill"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};