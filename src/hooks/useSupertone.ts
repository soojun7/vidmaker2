// ===== React Hook =====
import { useState, useEffect } from 'react';
import { SupertoneAPI, SupertoneTTSRequest, SupertoneVoice, SupertoneEmotion } from '../services/supertoneApi';

export const useSupertone = (apiKey?: string) => {
  const [supertoneAPI] = useState(() => new SupertoneAPI(apiKey));
  const [voices, setVoices] = useState<SupertoneVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadVoices = async () => {
      try {
        setIsLoading(true);
        const voiceList = await supertoneAPI.getVoices();
        setVoices(voiceList);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '음성 목록 로드 실패');
      } finally {
        setIsLoading(false);
      }
    };

    loadVoices();
  }, [supertoneAPI]);

  const generateTTS = async (request: SupertoneTTSRequest) => {
    setIsLoading(true);
    setError(null);
   
    try {
      const result = await supertoneAPI.generateTTS(request);
      if (!result.success) {
        setError(result.error || 'TTS 생성 실패');
      }
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'TTS 생성 중 오류 발생';
      setError(errorMessage);
      return { audio: '', success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    generateTTS,
    voices,
    emotions: supertoneAPI.getEmotions(),
    playAudio: supertoneAPI.playAudio.bind(supertoneAPI),
    downloadAudio: supertoneAPI.downloadAudio.bind(supertoneAPI),
    isLoading,
    error
  };
};
