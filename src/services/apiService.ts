import { EvaluationResponse } from '../types/interview';

class ApiService {
  private baseUrl = '/api';

  async validatePasscode(passcode: string): Promise<{ valid: boolean; sessionId?: string; candidateName?: string }> {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const validCodes = {
      'DEMO123': { sessionId: 'sess_001', candidateName: 'John Doe' },
      'TEST456': { sessionId: 'sess_002', candidateName: 'Jane Smith' },
      'INTERVIEW': { sessionId: 'sess_003', candidateName: 'Alex Johnson' }
    };

    const result = validCodes[passcode as keyof typeof validCodes];
    return result ? { valid: true, ...result } : { valid: false };
  }

  async evaluateAnswer(sessionId: string, question: string, answer: string): Promise<EvaluationResponse> {
    // Simulate API call with variable delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    const responses = [
      {
        feedback: "Great answer! Your experience with React and TypeScript shows strong technical foundation. I particularly liked how you mentioned component lifecycle management.",
        score: 8.5,
        nextQuestion: "Can you walk me through how you would optimize a React application for performance?",
        isComplete: false
      },
      {
        feedback: "Good explanation. Your understanding of state management is solid. However, consider mentioning useCallback and useMemo for optimization.",
        score: 7.2,
        nextQuestion: "Tell me about a challenging bug you've encountered and how you debugged it.",
        isComplete: false
      },
      {
        feedback: "Excellent problem-solving approach! Your systematic debugging methodology demonstrates senior-level thinking.",
        score: 9.1,
        nextQuestion: "How do you ensure code quality and maintainability in your projects?",
        isComplete: false
      },
      {
        feedback: "Thank you for sharing your insights on code quality. Based on our conversation, you've demonstrated strong technical skills and problem-solving abilities. We'll be in touch soon!",
        score: 8.8,
        nextQuestion: "",
        isComplete: true
      }
    ];

    return responses[0];
  }

  async getInitialQuestion(): Promise<string> {
    const questions = [
      "Tell me about yourself and your experience with React development."
    ];
    
    return questions[0];
  }
}

export const apiService = new ApiService();