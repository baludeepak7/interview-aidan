import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '../services/apiService';
import { toast } from 'react-toastify';

export const LandingPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [passcode, setPasscode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passcode.trim()) {
      setError('Please enter a passcode');
      return;
    }

    setIsValidating(true);
    setError('');

    try {
      const result = await apiService.validatePasscode(passcode,sessionId || '');
      console.log('Validation result:', result);
      if (result.valid && result.sessionId) {
        toast.success(`Welcome, ${result.candidate_id}!`);
        navigate(`/interview/${result.sessionId}`, { 
          state: { candidateName: result.candidate_id } 
        });
      } else {
        setError('Invalid passcode. Please check and try again.');
        setPasscode('');
      }
    } catch (error) {
      console.error('Validation error:', error);
      setError('Unable to validate passcode. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-gradient"
         style={{ 
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
         }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <div className="bg-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                       style={{ width: '80px', height: '80px' }}>
                    <i className="bi bi-robot text-white fs-1"></i>
                  </div>
                  <h2 className="fw-bold text-dark">AI Interview</h2>
                  <p className="text-muted">Enter your unique passcode to begin</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="passcode" className="form-label fw-semibold">
                      Passcode
                    </label>
                    <input
                      type="text"
                      id="passcode"
                      className={`form-control form-control-lg ${error ? 'is-invalid' : ''}`}
                      value={passcode}
                      onChange={(e) => {
                        setPasscode(e.target.value);
                        setError('');
                      }}
                      placeholder="Enter your passcode"
                      disabled={isValidating}
                      autoFocus
                      maxLength={20}
                    />
                    {error && (
                      <div className="invalid-feedback">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {error}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 mb-3"
                    disabled={isValidating || !passcode.trim()}
                  >
                    {isValidating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Validating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-right-circle me-2"></i>
                        Enter Interview
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center">
                  <small className="text-muted">
                    Need help? Contact your interviewer for assistance
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};