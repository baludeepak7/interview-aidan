import React, { useState, useEffect } from 'react';
import { InterviewState } from '../types/interview';

interface RecordingControlsProps {
  state: InterviewState;
  transcript: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSubmitAnswer: (answer: string) => void;
  onTranscriptChange: (transcript: string) => void;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  state,
  transcript,
  onStartRecording,
  onStopRecording,
  onSubmitAnswer,
  onTranscriptChange
}) => {
  const [recordingTime, setRecordingTime] = useState(0);
  const [editedTranscript, setEditedTranscript] = useState('');

  useEffect(() => {
    setEditedTranscript(transcript);
  }, [transcript]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (state === 'recording') {
      setRecordingTime(0);
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    onSubmitAnswer(editedTranscript.trim());
    setEditedTranscript('');
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing-speech' || state === 'evaluating';
  const canRecord = state === 'idle';
  const canSubmit = editedTranscript.trim().length > 0 && state === 'idle';

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h6 className="card-title d-flex align-items-center">
          <i className="bi bi-mic me-2 text-primary"></i>
          Your Response
        </h6>
        
        {/* Recording Status */}
        {isRecording && (
          <div className="alert alert-info d-flex align-items-center mb-3">
            <div className="spinner-grow spinner-grow-sm text-danger me-2" role="status">
              <span className="visually-hidden">Recording...</span>
            </div>
            <div>
              <strong>Recording... {formatTime(recordingTime)}</strong>
              <div className="small">Speak clearly into your microphone</div>
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="alert alert-warning d-flex align-items-center mb-3">
            <div className="spinner-border spinner-border-sm text-warning me-2" role="status">
              <span className="visually-hidden">Processing...</span>
            </div>
            <div>
              <strong>Processing...</strong>
              <div className="small">
                {state === 'processing-speech' ? 'Converting speech to text' : 'Evaluating your answer'}
              </div>
            </div>
          </div>
        )}

        {/* Transcript Input */}
        <div className="mb-3">
          <label htmlFor="transcript" className="form-label">
            Your Answer {editedTranscript && <span className="text-muted">({editedTranscript.length} characters)</span>}
          </label>
          <textarea
            id="transcript"
            className="form-control"
            rows={4}
            value={editedTranscript}
            onChange={(e) => setEditedTranscript(e.target.value)}
            placeholder="Click the microphone to record your answer, or type here..."
            disabled={isProcessing}
          />
        </div>

        {/* Control Buttons */}
        <div className="d-flex gap-2 flex-wrap">
          {!isRecording ? (
            <button
              className="btn btn-outline-primary"
              onClick={onStartRecording}
              disabled={!canRecord}
              title="Start voice recording"
            >
              <i className="bi bi-mic-fill me-2"></i>
              Start Recording
            </button>
          ) : (
            <button
              className="btn btn-danger"
              onClick={onStopRecording}
              title="Stop voice recording"
            >
              <i className="bi bi-stop-fill me-2"></i>
              Stop Recording
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing}
            title="Submit your answer"
          >
            {isProcessing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Processing...
              </>
            ) : (
              <>
                <i className="bi bi-send-fill me-2"></i>
                Submit Answer
              </>
            )}
          </button>

          {editedTranscript && (
            <button
              className="btn btn-outline-secondary"
              onClick={() => setEditedTranscript('')}
              disabled={isProcessing}
              title="Clear answer"
            >
              <i className="bi bi-trash me-2"></i>
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};