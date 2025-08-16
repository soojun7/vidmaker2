const ELEVENLABS_API_KEY = 'sk_22710d1f809696e927fafea8216eb42d21700e4504705735';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

export interface TTSRequest {
  text: string;
  voice_id?: string;
  model_id?: string;
  voice_settings?: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
}

export interface TTSResponse {
  audio: string; // base64 encoded audio
  success: boolean;
  error?: string;
}

// 기본 음성 설정
const defaultVoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true
};

// 기본 음성 ID (한국어에 적합한 음성)
const defaultVoiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel (여성 음성)

// TTS 생성 함수
export const generateTTS = async (request: TTSRequest): Promise<TTSResponse> => {
  try {
    // 타임아웃 설정 (5분)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);
    
    const response = await fetch('/api/generate-tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: request.text,
        voice_id: request.voice_id || defaultVoiceId,
        model_id: request.model_id || 'eleven_multilingual_v2',
        voice_settings: request.voice_settings || defaultVoiceSettings
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`TTS API 오류: ${response.status} - ${errorData.error || '알 수 없는 오류'}`);
    }

    const data = await response.json();
    
    if (data.success && data.audio) {
      return {
        audio: data.audio,
        success: true
      };
    } else {
      throw new Error(data.error || 'TTS 생성에 실패했습니다.');
    }

  } catch (error) {
    console.error('TTS 생성 오류:', error);
    return {
      audio: '',
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류'
    };
  }
};

// 사용 가능한 음성 목록 가져오기
export const getAvailableVoices = async () => {
  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`음성 목록 조회 실패: ${response.status}`);
    }

    const data = await response.json();
    return data.voices || [];
  } catch (error) {
    console.error('음성 목록 조회 오류:', error);
    return [];
  }
};

// 오디오 재생 함수
export const playAudio = (audioData: string) => {
  const audio = new Audio(audioData);
  audio.play().catch(error => {
    console.error('오디오 재생 오류:', error);
  });
};

// 오디오 다운로드 함수
export const downloadAudio = (audioData: string, filename: string = 'tts-audio.mp3') => {
  const link = document.createElement('a');
  link.href = audioData;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}; 