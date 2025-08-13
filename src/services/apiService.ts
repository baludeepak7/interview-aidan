import { EvaluationResponse } from '../types/interview';

class ApiService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://44.204.249.41:8000';

  async validatePasscode(passcode: string, session_id: string): Promise<{ valid: boolean; sessionId?: string; candidate_id?: string }> {

    const response = await fetch(`${this.baseUrl}/api/v1/validate/passcode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        passcode: passcode,
        session_id: session_id
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to validate passcode');
    }

    const result = await response.json();
    const bearerToken = result.access_token;
    if (bearerToken) {
      localStorage.setItem('access_token', bearerToken);
    }
    result.sessionId = session_id;
    return result.status === 'success' ? { valid: true, ...result } : { valid: false };
  }

  async evaluateAnswer(question: string, answer: string): Promise<EvaluationResponse> {
    const resp = await fetch(`${this.baseUrl}/api/v1/interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify({
        candidate_answer: answer,
        ai_question: question
      })
    });

    const data = await resp.json();
    const response =   {
        feedback: "",
        score: 0,
        nextQuestion: data.ai_question==null?data.ai_question : data.ai_question,
        isComplete: data.interview_completed===true?true : false,
        audio_base64: data.audio_base64 || ""
      };

    return response;
  }

  async getInitialQuestion(): Promise<string> {
      const resp = await fetch(`${this.baseUrl}/api/v1/interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
      },
      body: JSON.stringify({
        candidate_answer: "start the interview",
        ai_question: "",
        "remaining_minutes": "15"
      })
    });
    const response = await resp.json();    
    return response.ai_question;
  }
}

export const apiService = new ApiService();