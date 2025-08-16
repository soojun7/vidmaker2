const PROXY_API_URL = '/api/claude';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  system?: string;
}

export interface ClaudeResponse {
  content: ClaudeMessage[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export const callClaudeAPI = async (
  userMessage: string, 
  context?: string,
  systemPrompt?: string,
  imageData?: string,
  conversationHistory?: ClaudeMessage[]
): Promise<string> => {
  try {
    const response = await fetch(PROXY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userMessage,
        context,
        systemPrompt,
        imageData,
        conversationHistory
      })
    });

    if (!response.ok) {
      throw new Error(`프록시 서버 호출 실패: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '알 수 없는 오류가 발생했습니다');
    }

    return data.content;
  } catch (error) {
    console.error('Claude API 호출 오류:', error);
    throw error;
  }
};

// 탭별 시스템 프롬프트
export const getSystemPrompt = (tabIndex: number): string => {
  return '당신은 도움이 되는 AI 어시스턴트입니다.';
}; 