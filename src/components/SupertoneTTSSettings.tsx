import React, { useState } from 'react';
import { useSupertone } from '../hooks/useSupertone';

export interface SupertoneTTSSettings {
  voice_id: string;
  speed: number;
  pitch: number;
  emotion: string;
  language: string;
}

interface SupertoneTTSSettingsProps {
  onSettingsChange: (settings: SupertoneTTSSettings) => void;
  initialSettings?: Partial<SupertoneTTSSettings>;
}

export const SupertoneTTSSettings: React.FC<SupertoneTTSSettingsProps> = ({
  onSettingsChange,
  initialSettings = {}
}) => {
  const { voices, emotions } = useSupertone();
  const [settings, setSettings] = useState<SupertoneTTSSettings>({
    voice_id: 'ff700760946618e1dcf7bd',
    speed: 1.1,
    pitch: 0,
    emotion: 'neutral',
    language: 'ko',
    ...initialSettings
  });

  const updateSettings = (newSettings: Partial<SupertoneTTSSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    onSettingsChange(updated);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🇰🇷 Supertone TTS 설정</h3>
     
      {/* 음성 선택 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">음성 선택</label>
        <select
          value={settings.voice_id}
          onChange={(e) => updateSettings({ voice_id: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
        >
          {voices.map(voice => (
            <option key={voice.id} value={voice.id}>
              {voice.name} ({voice.gender}, {voice.language})
            </option>
          ))}
        </select>
      </div>

      {/* 감정 선택 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">감정</label>
        <select
          value={settings.emotion}
          onChange={(e) => updateSettings({ emotion: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
        >
          {emotions.map(emotion => (
            <option key={emotion.id} value={emotion.id}>{emotion.name}</option>
          ))}
        </select>
      </div>

      {/* 속도 조절 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">속도: {settings.speed}x</label>
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={settings.speed}
          onChange={(e) => updateSettings({ speed: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* 피치 조절 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">피치: {settings.pitch}</label>
        <input
          type="range"
          min="-20"
          max="20"
          step="1"
          value={settings.pitch}
          onChange={(e) => updateSettings({ pitch: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* 언어 선택 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">언어</label>
        <select
          value={settings.language}
          onChange={(e) => updateSettings({ language: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
        >
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </div>
    </div>
  );
};

// ===== 사용 예제 컴포넌트 =====
export const SupertoneTTSDemo: React.FC = () => {
  const { generateTTS, playAudio, downloadAudio, isLoading, error } = useSupertone();
  const [text, setText] = useState('안녕하세요, 슈퍼톤 TTS 테스트입니다.');
  const [settings, setSettings] = useState<SupertoneTTSSettings>({
    voice_id: 'ff700760946618e1dcf7bd',
    speed: 1.1,
    pitch: 0,
    emotion: 'neutral',
    language: 'ko'
  });
  const [lastAudio, setLastAudio] = useState<string | null>(null);

  const handleGenerate = async () => {
    const result = await generateTTS({
      text,
      ...settings
    });

    if (result.success) {
      setLastAudio(result.audio);
      playAudio(result.audio);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Supertone TTS 데모</h2>
     
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* 텍스트 입력 */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">텍스트 입력</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 border rounded-md h-24 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
          placeholder="음성으로 변환할 텍스트를 입력하세요..."
        />
      </div>

      {/* 설정 패널 */}
      <SupertoneTTSSettings
        onSettingsChange={setSettings}
        initialSettings={settings}
      />

      {/* 생성 버튼 */}
      <button
        onClick={handleGenerate}
        disabled={isLoading || !text.trim()}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg"
      >
        {isLoading ? '🔄 생성 중...' : '🎤 음성 생성'}
      </button>

      {/* 오디오 컨트롤 */}
      {lastAudio && (
        <div className="flex space-x-2">
          <button
            onClick={() => playAudio(lastAudio)}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
          >
            🔊 재생
          </button>
          <button
            onClick={() => downloadAudio(lastAudio, `supertone-${Date.now()}.mp3`)}
            className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded"
          >
            💾 다운로드
          </button>
        </div>
      )}
    </div>
  );
};
