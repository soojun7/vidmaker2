// ============================================================================
// 슈퍼톤 API 완전 통합 패키지
// 다른 프로젝트에 복사 붙여넣기만 하면 바로 사용 가능
// ============================================================================

// ===== 1. 타입 정의 =====
export interface SupertoneTTSRequest {
  text: string;
  voice_id?: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
  language?: string;
}

export interface SupertoneTTSResponse {
  audio: string; // base64 encoded audio
  success: boolean;
  error?: string;
}

export interface SupertoneVoice {
  id: string;
  name: string;
  language: string;
  gender: string;
  description?: string;
}

export interface SupertoneEmotion {
  id: string;
  name: string;
}

// ===== 2. API 클라이언트 =====
export class SupertoneAPI {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultVoiceId: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.REACT_APP_SUPERTONE_API_KEY || '3fe1f95cd6aa829dbd9cc5db99b15eb6';
    this.baseUrl = '/api'; // 프록시 사용
    this.defaultVoiceId = 'ff700760946618e1dcf7bd'; // Garret
  }

  // TTS 생성 (재시도 메커니즘 포함)
  async generateTTS(request: SupertoneTTSRequest): Promise<SupertoneTTSResponse> {
    const maxRetries = 3;
    const retryDelay = 2000;
   
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Supertone TTS 생성 시도 ${attempt}/${maxRetries}: ${request.text.substring(0, 50)}...`);
       
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000);
       
        const response = await fetch(`${this.baseUrl}/generate-supertone-tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: request.text,
            voice_id: request.voice_id || this.defaultVoiceId,
            speed: request.speed || 1.0,
            pitch: request.pitch || 0,
            emotion: request.emotion || 'neutral',
            language: request.language || 'ko'
          }),
          signal: controller.signal
        });
       
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Supertone API 오류: ${response.status} - ${errorData.error || '알 수 없는 오류'}`);
        }

        const data = await response.json();
       
        if (data.success && data.audio) {
          console.log(`Supertone TTS 생성 성공 (시도 ${attempt})`);
          return {
            audio: data.audio,
            success: true
          };
        } else {
          throw new Error(data.error || 'Supertone TTS 생성에 실패했습니다.');
        }

      } catch (error) {
        console.error(`Supertone TTS 생성 시도 ${attempt} 실패:`, error);
       
        if (attempt < maxRetries && this.isRetryableError(error)) {
          console.log(`${retryDelay}ms 후 재시도합니다...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
       
        return {
          audio: '',
          success: false,
          error: error instanceof Error ? error.message : '알 수 없는 오류'
        };
      }
    }
   
    return {
      audio: '',
      success: false,
      error: '모든 재시도가 실패했습니다.'
    };
  }

  // 음성 목록 조회
  async getVoices(): Promise<SupertoneVoice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/supertone-voices`);
      const data = await response.json();
     
      if (data.success && data.voices) {
        return data.voices.map((voice: any) => ({
          id: voice.voice_id,
          name: voice.name,
          language: voice.language,
          gender: voice.gender,
          description: voice.description
        }));
      } else {
        return this.getDefaultVoices();
      }
    } catch (error) {
      console.error('Supertone 음성 목록 조회 오류:', error);
      return this.getDefaultVoices();
    }
  }

  // 감정 목록
  getEmotions(): SupertoneEmotion[] {
    return [
      { id: 'neutral', name: '중성' },
      { id: 'happy', name: '기쁨' },
      { id: 'sad', name: '슬픔' },
      { id: 'angry', name: '화남' },
      { id: 'excited', name: '흥분' },
      { id: 'calm', name: '차분함' }
    ];
  }

  // 오디오 재생
  playAudio(audioData: string): void {
    const audio = new Audio(audioData);
    audio.play().catch(error => {
      console.error('Supertone 오디오 재생 오류:', error);
    });
  }

  // 오디오 다운로드
  downloadAudio(audioData: string, filename: string = 'supertone-audio.mp3'): void {
    const link = document.createElement('a');
    link.href = audioData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private isRetryableError(error: any): boolean {
    if (!(error instanceof Error)) return false;
   
    const message = error.message.toLowerCase();
    return message.includes('econnreset') ||
           message.includes('network') ||
           message.includes('timeout') ||
           message.includes('500');
  }

  private getDefaultVoices(): SupertoneVoice[] {
    return [
      { id: 'ff700760946618e1dcf7bd', name: 'Garret', language: 'en', gender: 'male' },
      { id: 'aeda85bfe699f338b74d68', name: '한국어 여성 (기본)', language: 'ko', gender: 'female' },
      { id: '2974e7e7940bcc352ee78e', name: 'Toma', language: 'ko', gender: 'male' },
      { id: 'korean_male_01', name: '한국어 남성 1', language: 'ko', gender: 'male' }
    ];
  }
}

// ===== 3. 유틸리티 함수들 =====
export const supertoneUtils = {
  // 텍스트 길이 체크 (슈퍼톤 제한)
  validateTextLength: (text: string): { valid: boolean; message?: string } => {
    if (text.length === 0) {
      return { valid: false, message: '텍스트가 비어있습니다.' };
    }
    if (text.length > 5000) {
      return { valid: false, message: '텍스트가 너무 깁니다. (최대 5000자)' };
    }
    return { valid: true };
  },

  // 배치 처리를 위한 텍스트 분할
  splitTextForBatch: (text: string, maxLength: number = 1000): string[] => {
    if (text.length <= maxLength) return [text];
   
    const sentences = text.split(/[.!?。！？]/).filter(s => s.trim());
    const batches: string[] = [];
    let currentBatch = '';
   
    for (const sentence of sentences) {
      if (currentBatch.length + sentence.length > maxLength) {
        if (currentBatch) batches.push(currentBatch.trim());
        currentBatch = sentence;
      } else {
        currentBatch += (currentBatch ? '. ' : '') + sentence;
      }
    }
   
    if (currentBatch) batches.push(currentBatch.trim());
    return batches;
  },

  // 오디오 파일 크기 계산 (대략적)
  estimateAudioSize: (textLength: number, quality: 'low' | 'medium' | 'high' = 'medium'): number => {
    const baseSize = textLength * 100; // 100 bytes per character (rough estimate)
    const qualityMultiplier = { low: 0.5, medium: 1, high: 2 }[quality];
    return Math.round(baseSize * qualityMultiplier);
  }
};

// ===== 4. 기본 내보내기 =====
export default SupertoneAPI;
