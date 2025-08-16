import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Image, Download, Copy, Check, Languages, Trash2, RefreshCw, Volume2, VolumeX, Play, Pause, X, Film, Save, FolderDown, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { SavedStyle, Character, StyleAnalysis, Script as WorkflowScript } from '../types/index';
import { generateTTS, downloadAudio, TTSRequest } from '../services/ttsApi';
import { SupertoneAPI } from '../services/supertoneApi';
import BulkVideoDownloader from './BulkVideoDownloader';

interface PromptGeneratorProps {
  styleAnalysis?: StyleAnalysis;
  characters: Character[];
  savedStyles: SavedStyle[];
  script?: WorkflowScript; // 스크립트 데이터 추가
  onSaveState?: (state: any) => void;
  getSavedState?: () => any;
  onTabChange?: (tabIndex: number) => void; // 탭 변경 함수 추가
  onScriptsChange?: (scripts: Script[]) => void; // scripts 변경 콜백 추가
  currentProject?: any; // 현재 프로젝트 정보 추가
  onUpdateStyleAnalysis?: (updatedStyle: StyleAnalysis) => void; // 스타일 분석 업데이트 콜백 추가
}

interface Script {
  id: string;
  text: string;
  type: 'script' | 'style' | 'character';
  generatedPrompt?: string;
  generatedImage?: string;
  generatedImages?: string[]; // 여러 이미지 저장 (여러 캐릭터 시드용)
  seedNumber?: number; // 시드번호 추가
  seedNumbers?: number[]; // 여러 시드번호 저장
  isGeneratingImage?: boolean;
  isGeneratingPrompt?: boolean; // 추가: 프롬프트 생성 중 표시
  generatedAudio?: string; // TTS 오디오 데이터
  isGeneratingTTS?: boolean; // TTS 생성 중 표시
  isPlayingAudio?: boolean; // 오디오 재생 중 표시
  generatedVideo?: string; // 비디오 데이터
  isGeneratingVideo?: boolean; // 비디오 생성 중 표시
}

interface ImageSettings {
  model: string;
  aspectRatio: string;
  steps: number;
  guidanceScale: number;
}

interface CharacterSettings {
  description: string;
}

interface TTSSettings {
  provider: 'elevenlabs' | 'supertone';
  voice_id: string;
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  speed: number;
  // 슈퍼톤 전용 설정
  pitch?: number;
  emotion?: string;
  language?: string;
}

interface AudioSegment {
  scriptId: string;
  startTime: number;
  endTime: number;
  duration: number;
  audioData: string;
}

interface FailedItem {
  id: string;
  scriptId: string;
  type: 'prompt' | 'image' | 'tts' | 'video';
  error: string;
  timestamp: Date;
  scriptText: string;
}

const PromptGenerator: React.FC<PromptGeneratorProps> = ({ styleAnalysis, characters, savedStyles, script, onSaveState, getSavedState, onTabChange, onScriptsChange, currentProject, onUpdateStyleAnalysis }) => {
  const [scripts, setScripts] = useState<Script[]>([
    { id: '1', text: '', type: 'script' }
  ]);
  
  // 슈퍼톤 API 인스턴스
  const supertoneAPI = new SupertoneAPI();
  
  // 실패 항목 추적
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [showFailedItems, setShowFailedItems] = useState(false);
  
  // 프로그레스 바 상태
  const [showProgressBar, setShowProgressBar] = useState(false);
  
  // 스타일 번역 상태
  const [isTranslatingStyle, setIsTranslatingStyle] = useState(false);
  


  // 저장된 상태 복원
  useEffect(() => {
    if (getSavedState) {
      const savedState = getSavedState();
      if (savedState) {
        setScripts(savedState.scripts || [{ id: '1', text: '', type: 'script' }]);
        setImageSettings(savedState.imageSettings || {
          model: 'runware:97@1',
          aspectRatio: '16:9',
          steps: 50,
          guidanceScale: 20
        });
        setTranslatedPrompts(savedState.translatedPrompts || {});
        setAudioSegments(savedState.audioSegments || []);
        setCombinedAudioData(savedState.combinedAudioData || '');
        setCombinedAudioDuration(savedState.combinedAudioDuration || 0);
        setTTSSettings(savedState.ttsSettings || {
          provider: 'elevenlabs',
          voice_id: '21m00Tcm4TlvDq8ikWAM',
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
          speed: 1.0,
          pitch: 0,
          emotion: 'neutral',
          language: 'ko'
        });
        setVideosGenerated(savedState.videosGenerated || false);
      }
    }
  }, []); // 컴포넌트 마운트 시에만 실행

  // 스크립트 데이터가 있으면 줄바꿈으로 분리하여 초기화
  useEffect(() => {
    if (script?.confirmed && script.content) {
      // 스크립트 내용 로드 로그 제거 (성능 개선)
      
      // 약간의 지연을 두고 저장된 상태 확인 (컴포넌트 마운트 완료 후)
      setTimeout(() => {
        const savedState = getSavedState?.();
        // 저장된 상태 확인 로그 제거 (성능 개선)
        
        // 저장된 상태가 있고, 스크립트 개수가 맞는 경우 저장된 상태를 복원
        if (savedState && savedState.scripts && savedState.scripts.length > 0) {
          // 저장된 상태 복원 로그 제거 (성능 개선)
          
          // 생성 중 상태를 모두 false로 초기화하여 복원
          const restoredScripts = savedState.scripts.map((script: any) => ({
            ...script,
            isGeneratingImage: false,
            isGeneratingPrompt: false,
            isGeneratingTTS: false,
            isPlayingAudio: false
          }));
          setScripts(restoredScripts);
          
          // 다른 상태들도 복원
          if (savedState.imageSettings) setImageSettings(savedState.imageSettings);
          if (savedState.translatedPrompts) setTranslatedPrompts(savedState.translatedPrompts);
          if (savedState.audioSegments) setAudioSegments(savedState.audioSegments);
          if (savedState.combinedAudioData) setCombinedAudioData(savedState.combinedAudioData);
          if (savedState.combinedAudioDuration) setCombinedAudioDuration(savedState.combinedAudioDuration);
          if (savedState.ttsSettings) setTTSSettings(savedState.ttsSettings);
          if (savedState.videosGenerated !== undefined) setVideosGenerated(savedState.videosGenerated);
        } else {
          // 저장된 상태가 없거나 유효하지 않은 경우에만 초기화
          console.log('저장된 상태가 없어서 스크립트 초기화');
          const scriptLines = script.content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

          if (scriptLines.length > 0) {
            console.log(`스크립트 초기화: ${scriptLines.length}개 스크립트 발견`);
            const newScripts = scriptLines.map((text, index) => {
              return {
                id: (index + 1).toString(),
                text,
                type: 'script' as const,
                seedNumber: undefined // 캐릭터 시드번호는 나중에 설정
              };
            });
            console.log('생성된 스크립트들:', newScripts.map(s => ({ id: s.id, text: s.text.substring(0, 30) + '...' })));
            setScripts(newScripts);
          }
        }
      }, 100); // 100ms 지연
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script?.content]); // script.content만 의존성으로 변경
  
  const [imageSettings, setImageSettings] = useState<ImageSettings>({
    model: 'runware:97@1',
    aspectRatio: '16:9',
    steps: 50,
    guidanceScale: 20
  });
  
  const [showImageSettings, setShowImageSettings] = useState(false);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isTranslatingAll, setIsTranslatingAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [translatedPrompts, setTranslatedPrompts] = useState<{ [key: string]: string }>({});
  const [isTranslating, setIsTranslating] = useState<{ [key: string]: boolean }>({});
  const [showStyleSettings, setShowStyleSettings] = useState(false);
  const [showCharacterSettings, setShowCharacterSettings] = useState(false);
  const [showScriptSettings, setShowScriptSettings] = useState(false);
  const [scriptSettingsText, setScriptSettingsText] = useState('');
  const [characterSettings, setCharacterSettings] = useState<CharacterSettings>({
    description: ''
  });
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [ttsSettings, setTTSSettings] = useState<TTSSettings>({
    provider: 'elevenlabs',
    voice_id: '21m00Tcm4TlvDq8ikWAM', // Rachel (기본 음성)
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
    speed: 1.0,
    pitch: 0,
    emotion: 'neutral',
    language: 'ko'
  });
  const [audioSegments, setAudioSegments] = useState<AudioSegment[]>([]);
  const [isGeneratingCombinedAudio, setIsGeneratingCombinedAudio] = useState(false);
  const [combinedAudioData, setCombinedAudioData] = useState<string>('');
  const [isPlayingCombinedAudio, setIsPlayingCombinedAudio] = useState(false);
  const [combinedAudioDuration, setCombinedAudioDuration] = useState(0);
  const [combinedAudioCurrentTime, setCombinedAudioCurrentTime] = useState(0);
  const [combinedAudioElement, setCombinedAudioElement] = useState<HTMLAudioElement | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videosGenerated, setVideosGenerated] = useState(false); // 비디오 생성 완료 상태
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkDownloader, setShowBulkDownloader] = useState(false);

  
  // 다운로드 모달 관련 상태
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState({
    images: false,
    ttsIndividual: false,
    ttsUnified: false,
    ttsSplit: false, // 분할 TTS 다운로드
    srtUnified: false,
    srtSplitUnified: false,
    srtSplitTTSBased: false, // 분할 TTS 기반 자막
    srtStoryChannel: false,
    videosOnly: false,
    videosWithSubtitles: false
  });
  const [modalSrtPreviewContent, setModalSrtPreviewContent] = useState<string>('');
  const [modalStoryChannelSrtContent, setModalStoryChannelSrtContent] = useState<string>('');
  const [modalSplitUnifiedSrtContent, setModalSplitUnifiedSrtContent] = useState<string>('');
  const [showModalSrtPreview, setShowModalSrtPreview] = useState(false);
  const [showModalStoryChannelSrtPreview, setShowModalStoryChannelSrtPreview] = useState(false);
  const [showModalSplitUnifiedSrtPreview, setShowModalSplitUnifiedSrtPreview] = useState(false);

  // 상태 변경 시 저장
  useEffect(() => {
    if (onSaveState) {
      const stateToSave = {
        scripts,
        imageSettings,
        translatedPrompts,
        audioSegments,
        combinedAudioData,
        combinedAudioDuration,
        ttsSettings,
        videosGenerated
      };
      onSaveState(stateToSave);
    }
  }, [scripts, imageSettings, translatedPrompts, audioSegments, combinedAudioData, combinedAudioDuration, ttsSettings, videosGenerated, onSaveState]);

  // 브라우저 탭 변경 시 상태 저장
  useEffect(() => {
    const saveStateOnTabChange = () => {
      if (onSaveState) {
        const stateToSave = {
          scripts,
          imageSettings,
          translatedPrompts,
          audioSegments,
          combinedAudioData,
          combinedAudioDuration,
          ttsSettings,
          videosGenerated
        };
        onSaveState(stateToSave);
        console.log('브라우저 탭 변경으로 상태 저장:', stateToSave);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveStateOnTabChange();
      }
    };

    const handleBeforeUnload = () => {
      saveStateOnTabChange();
    };

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 클린업
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [scripts, imageSettings, translatedPrompts, audioSegments, combinedAudioData, combinedAudioDuration, ttsSettings, videosGenerated, onSaveState]);

  // 즉시 상태 저장 함수
  const saveStateImmediately = () => {
    if (onSaveState) {
      const stateToSave = {
        scripts,
        imageSettings,
        translatedPrompts,
        audioSegments,
        combinedAudioData,
        combinedAudioDuration,
        ttsSettings,
        videosGenerated
      };
      onSaveState(stateToSave);
      console.log('즉시 상태 저장 완료');
    }
  };

  // scripts 변경 시 외부로 전달 (초기화가 아닌 실제 변경일 때만)
  useEffect(() => {
    // 스크립트가 실제로 변경되었을 때만 외부로 전달
    if (scripts.length > 0 && onScriptsChange) {
      // 스크립트 변경 로그 제거 (성능 개선)
      
      onScriptsChange(scripts);
    }
  }, [scripts, onScriptsChange]);

  // scripts 변경 시 자동 저장 (별도 useEffect로 분리)
  useEffect(() => {
    if (onSaveState && scripts.length > 0) {
      const stateToSave = {
        scripts,
        imageSettings,
        translatedPrompts,
        audioSegments,
        combinedAudioData,
        combinedAudioDuration,
        ttsSettings,
        videosGenerated
      };
      onSaveState(stateToSave);
      // 자동 저장 로그 제거 (성능 개선)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scripts]);

  // 수동 저장 함수
  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      if (onSaveState) {
        const stateToSave = {
          scripts,
          imageSettings,
          translatedPrompts,
          audioSegments,
          combinedAudioData,
          combinedAudioDuration,
          ttsSettings,
          videosGenerated
        };
        onSaveState(stateToSave);
        setLastSaved(new Date());
        console.log('수동 저장 완료:', new Date().toLocaleString());
      }
    } catch (error) {
      console.error('수동 저장 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 이미지 상세설정 토글
  const toggleImageSettings = () => {
    setShowImageSettings(!showImageSettings);
  };

  // 스타일 설정 보기
  const toggleStyleSettings = () => {
    setShowStyleSettings(!showStyleSettings);
  };

  // 캐릭터 설정 보기
  const toggleCharacterSettings = () => {
    setShowCharacterSettings(!showCharacterSettings);
  };

  // TTS 설정 토글
  const toggleTTSSettings = () => {
    setShowTTSSettings(!showTTSSettings);
  };

  // 스크립트 설정 토글
  const toggleScriptSettings = () => {
    if (!showScriptSettings) {
      // 원본 스크립트 내용이 있으면 그것을 사용, 없으면 현재 스크립트들을 합치기
      if (script?.confirmed && script.content) {
        setScriptSettingsText(script.content);
      } else {
        const allScriptText = scripts
          .filter(script => script.text.trim())
          .map(script => script.text)
          .join('\n');
        setScriptSettingsText(allScriptText);
      }
    }
    setShowScriptSettings(!showScriptSettings);
  };

  // 스크립트 적용
  const applyScriptChanges = () => {
    if (!scriptSettingsText.trim()) return;

    // 줄바꿈 기준으로 스크립트 분리
    const scriptLines = scriptSettingsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    // 기존 스크립트 데이터를 보존하면서 새로운 스크립트 배열 생성
    const newScripts = scriptLines.map((text, index) => {
      const existingScript = scripts.find(s => s.id === (index + 1).toString());
      
      return {
        id: (index + 1).toString(),
        text,
        type: 'script' as const,
        // 기존 데이터 보존
        generatedPrompt: existingScript?.generatedPrompt,
        generatedImage: existingScript?.generatedImage,
        generatedImages: existingScript?.generatedImages,
        seedNumber: existingScript?.seedNumber,
        seedNumbers: existingScript?.seedNumbers,
        generatedAudio: existingScript?.generatedAudio,
        generatedVideo: existingScript?.generatedVideo,
        isGeneratingImage: existingScript?.isGeneratingImage,
        isGeneratingPrompt: existingScript?.isGeneratingPrompt,
        isGeneratingTTS: existingScript?.isGeneratingTTS,
        isPlayingAudio: existingScript?.isPlayingAudio
      };
    });

    setScripts(newScripts);
    setShowScriptSettings(false);
  };

  // 스크립트 텍스트 업데이트
  const updateScriptText = (id: string, text: string) => {
    setScripts(scripts.map(script => 
      script.id === id ? { ...script, text } : script
    ));
  };

  // 시드번호 업데이트
  const updateSeedNumber = (id: string, seedNumber: number) => {
    setScripts(scripts.map(script => 
      script.id === id ? { ...script, seedNumber } : script
    ));
  };



  // 스크립트에서 캐릭터명을 감지하여 해당 캐릭터의 시드번호를 찾는 함수
  const findCharacterSeedsFromScript = (scriptText: string): number[] => {
    if (!characters || characters.length === 0) return [];
    
    const foundSeeds: number[] = [];
    
    // 확정된 캐릭터들 중에서 스크립트에 포함된 캐릭터명 찾기
    for (const character of characters) {
      if (character.confirmed && character.seedNumber && scriptText.includes(character.name)) {
        foundSeeds.push(character.seedNumber);
      }
    }
    
        return foundSeeds;
  };

  // 기존 함수와의 호환성을 위한 함수 (첫 번째 시드만 반환)
  const findCharacterSeedFromScript = (scriptText: string): number | undefined => {
    const seeds = findCharacterSeedsFromScript(scriptText);
    return seeds.length > 0 ? seeds[0] : undefined;
  };

  // 실패 항목 추가 함수
  const addFailedItem = (scriptId: string, type: 'prompt' | 'image' | 'tts' | 'video', error: string) => {
    const script = scripts.find(s => s.id === scriptId);
    const newFailedItem: FailedItem = {
      id: Date.now().toString(),
      scriptId,
      type,
      error,
      timestamp: new Date(),
      scriptText: script?.text.substring(0, 50) + (script?.text.length && script.text.length > 50 ? '...' : '') || '알 수 없음'
    };
    
    setFailedItems(prev => [newFailedItem, ...prev]);
  };

  // 실패 항목 삭제 함수
  const removeFailedItem = (id: string) => {
    setFailedItems(prev => prev.filter(item => item.id !== id));
  };

  // 모든 실패 항목 삭제
  const clearAllFailedItems = () => {
    setFailedItems([]);
  };

  // 프로그레스 계산 함수들
  const getPromptProgress = () => {
    const scriptsWithText = scripts.filter(s => s.text.trim());
    const completed = scriptsWithText.filter(s => s.generatedPrompt).length;
    const generating = scriptsWithText.filter(s => s.isGeneratingPrompt).length;
    return {
      total: scriptsWithText.length,
      completed,
      generating,
      percentage: scriptsWithText.length > 0 ? Math.round((completed / scriptsWithText.length) * 100) : 0
    };
  };

  const getTTSProgress = () => {
    const scriptsWithText = scripts.filter(s => s.text.trim());
    const completed = scriptsWithText.filter(s => s.generatedAudio).length;
    const generating = scriptsWithText.filter(s => s.isGeneratingTTS).length;
    return {
      total: scriptsWithText.length,
      completed,
      generating,
      percentage: scriptsWithText.length > 0 ? Math.round((completed / scriptsWithText.length) * 100) : 0
    };
  };

  const getImageProgress = () => {
    const scriptsWithPrompts = scripts.filter(s => s.generatedPrompt);
    const completed = scriptsWithPrompts.filter(s => s.generatedImage).length;
    const generating = scriptsWithPrompts.filter(s => s.isGeneratingImage).length;
    return {
      total: scriptsWithPrompts.length,
      completed,
      generating,
      percentage: scriptsWithPrompts.length > 0 ? Math.round((completed / scriptsWithPrompts.length) * 100) : 0
    };
  };

  const getVideoProgress = () => {
    const scriptsWithImages = scripts.filter(s => s.generatedImage);
    const completed = scriptsWithImages.filter(s => s.generatedVideo).length;
    const generating = scriptsWithImages.filter(s => s.isGeneratingVideo).length;
    return {
      total: scriptsWithImages.length,
      completed,
      generating,
      percentage: scriptsWithImages.length > 0 ? Math.round((completed / scriptsWithImages.length) * 100) : 0
    };
  };

  // 스타일 설명 번역 및 적용 함수
  const translateAndApplyStyle = async () => {
    if (!characterSettings.description.trim()) {
      alert('스타일 설명을 입력해주세요.');
      return;
    }

    setIsTranslatingStyle(true);

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: `다음 한국어 스타일 설명을 영어로 번역하고, 이미지 생성에 적합한 영어 스타일 프롬프트로 변환해주세요. 구체적이고 전문적인 영어 표현을 사용하여 시각적 스타일을 정확히 묘사해주세요.

스타일 설명: ${characterSettings.description}

영어 스타일 프롬프트만 출력해주세요.`,
          context: '',
          systemPrompt: '당신은 전문적인 이미지 스타일 번역가입니다. 한국어 스타일 설명을 영어로 번역하여 이미지 생성 AI가 이해할 수 있는 정확하고 구체적인 영어 스타일 프롬프트로 변환합니다.',
          hasImage: false
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // 번역된 영어 스타일을 확정된 스타일에 반영
        const translatedStyle = data.content.trim();
        
        // styleAnalysis가 있으면 기존 content에 추가, 없으면 새로 생성
        const newStyleContent = styleAnalysis?.content 
          ? `${styleAnalysis.content}, ${translatedStyle}`
          : translatedStyle;

        // StyleAnalysis 업데이트 (상위 컴포넌트로 전달)
        if (styleAnalysis && onUpdateStyleAnalysis) {
          // 기존 스타일 분석에 번역된 스타일 추가
          const updatedStyleAnalysis = {
            ...styleAnalysis,
            content: newStyleContent
          };
          
          // 상위 컴포넌트에 업데이트된 스타일 전달
          onUpdateStyleAnalysis(updatedStyleAnalysis);
          console.log('번역된 스타일이 적용되었습니다:', translatedStyle);
          alert(`스타일이 성공적으로 번역되어 적용되었습니다!\n\n번역된 스타일:\n${translatedStyle}\n\n확정된 스타일에 추가되었습니다.`);
        } else {
          alert('스타일 설정을 먼저 확정해주세요.');
        }

        // 입력 필드 초기화
        setCharacterSettings({...characterSettings, description: ''});
        
      } else {
        console.error('스타일 번역 실패');
        alert('스타일 번역에 실패했습니다.');
      }
    } catch (error) {
      console.error('스타일 번역 오류:', error);
      alert('스타일 번역 중 오류가 발생했습니다.');
    } finally {
      setIsTranslatingStyle(false);
    }
  };

  // 새 스크립트 추가 (현재 사용하지 않음)
  // const addNewScript = () => {
  //   const newId = (scripts.length + 1).toString();
  //   setScripts([...scripts, { id: newId, text: '', type: 'script' }]);
  // };

  // 스크립트 삭제
  const removeScript = (id: string) => {
    if (scripts.length > 1) {
      setScripts(scripts.filter(script => script.id !== id));
    }
  };

  // 비율을 픽셀 크기로 변환
  const getAspectRatioDimensions = (aspectRatio: string) => {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1024, height: 576 };
      case '9:16':
        return { width: 576, height: 1024 };
      case '1:1':
        return { width: 1024, height: 1024 };
      default:
        return { width: 1024, height: 576 };
    }
  };

  // 프롬프트 생성 (재시도 로직 포함)
  const generatePrompt = async (script: Script, retryCount = 0) => {
    if (!script.text.trim()) return;

    const maxRetries = 3; // 최대 재시도 횟수

    // 함수형 업데이트로 상태 업데이트
    setScripts(prevScripts => 
      prevScripts.map(s => 
        s.id === script.id ? { 
          ...s, 
          isGeneratingPrompt: true,
          generatedPrompt: undefined // 재생성 시 기존 프롬프트 초기화
        } : s
      )
    );

    // 스타일 정보와 캐릭터 정보를 컨텍스트로 구성
    let context = '';

    try {
      // 스타일 정보가 확정되었는지 확인
      if (!styleAnalysis?.confirmed) {
        throw new Error('스타일 설정을 먼저 확정해주세요.');
      }

      // 재시도 시 더 구체적인 요청 메시지 사용
      const detailedMessage = retryCount > 0 
        ? `다음 스크립트를 영어로 번역하고, 주어진 스타일을 반영한 상세하고 구체적인 그림 프롬프트로 만들어주세요. 프롬프트는 최소 50단어 이상의 상세한 묘사를 포함해야 합니다.

스크립트: ${script.text}

스타일: ${styleAnalysis.content}

영어로 된 상세하고 구체적인 그림 프롬프트만 출력해주세요. 간단한 단어나 짧은 문구가 아닌 풍부한 묘사를 포함해주세요.`
        : `다음 스크립트를 영어로 번역하고, 주어진 스타일을 반영한 그림 프롬프트로 만들어주세요.

스크립트: ${script.text}

스타일: ${styleAnalysis.content}

영어 그림 프롬프트만 출력해주세요.`;

      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: detailedMessage,
          context: context,
          systemPrompt: retryCount > 0 
            ? '당신은 전문적인 이미지 프롬프트 생성기입니다. 주어진 스크립트를 영어로 번역하고, 스타일 정보를 반영하여 상세하고 구체적인 그림 프롬프트를 생성합니다. 프롬프트는 반드시 50단어 이상이어야 하며, 장면, 조명, 색감, 분위기 등을 포함한 풍부한 묘사를 담아야 합니다.'
            : '당신은 전문적인 이미지 프롬프트 생성기입니다. 주어진 스크립트를 영어로 번역하고, 스타일 정보를 반영하여 그림 프롬프트를 생성합니다.',
          hasImage: false
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // 영어 프롬프트만 추출 (따옴표 안의 내용 또는 전체 내용에서 영어만)
        let generatedPrompt = '';
        
        // 먼저 따옴표 안의 내용을 찾아보기
        const promptMatch = data.content.match(/"([^"]+)"/);
        if (promptMatch) {
          generatedPrompt = promptMatch[1];
        } else {
          // 따옴표가 없으면 전체 내용에서 영어 프롬프트만 추출
          // 한국어 설명이나 다른 텍스트를 제거하고 영어 프롬프트만 남기기
          const lines = data.content.split('\n');
          const englishLines = lines.filter((line: string) => {
            const trimmed = line.trim();
            // 영어가 포함된 줄만 선택 (한국어만 있는 줄 제외)
            return trimmed && /[a-zA-Z]/.test(trimmed) && !/^[가-힣\s]+$/.test(trimmed);
          });
          generatedPrompt = englishLines.join(', ').trim();
        }
        
        // 프롬프트 길이 검증 (10자 이하면 재시도)
        if (generatedPrompt.length <= 10 && retryCount < maxRetries) {
          console.log(`프롬프트가 너무 짧습니다 (${generatedPrompt.length}자). 재시도 중... (${retryCount + 1}/${maxRetries})`);
          // 1초 후 재시도
          setTimeout(() => {
            generatePrompt(script, retryCount + 1);
          }, 1000);
          return;
        }
        
        // 프롬프트가 여전히 짧으면 경고 메시지와 함께 저장
        if (generatedPrompt.length <= 10) {
          generatedPrompt = `${generatedPrompt} (재생성 권장: 프롬프트가 너무 짧습니다)`;
        }
        
        // 함수형 업데이트로 상태 업데이트
        setScripts(prevScripts => 
          prevScripts.map(s => 
            s.id === script.id ? { 
              ...s, 
              generatedPrompt,
              isGeneratingPrompt: false 
            } : s
          )
        );
        
        // 프롬프트 생성 완료 후 즉시 저장
        setTimeout(() => {
          handleManualSave();
        }, 100);
      } else {
        console.error('프롬프트 생성 실패');
        addFailedItem(script.id, 'prompt', '프롬프트 생성 API 응답 실패');
        setScripts(prevScripts => 
          prevScripts.map(s => 
            s.id === script.id ? { ...s, isGeneratingPrompt: false } : s
          )
        );
      }
    } catch (error) {
      console.error('프롬프트 생성 오류:', error);
      addFailedItem(script.id, 'prompt', (error as Error).message);
      setScripts(prevScripts => 
        prevScripts.map(s => 
          s.id === script.id ? { ...s, isGeneratingPrompt: false } : s
        )
      );
    }
  };

  // 프롬프트 일괄생성
  const generateAllPrompts = async () => {
    const scriptsWithText = scripts.filter(script => script.text.trim());
    if (scriptsWithText.length === 0) return;

    // 스타일 정보가 확정되었는지 확인
    if (!styleAnalysis?.confirmed) {
      alert('스타일 설정을 먼저 확정해주세요.');
      return;
    }

    setIsGeneratingPrompts(true);
    
    try {
      // 모든 스크립트를 동시에 처리
      const promises = scriptsWithText.map(script => generatePrompt(script));
      await Promise.all(promises);
    } catch (error) {
      console.error('일괄 프롬프트 생성 오류:', error);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  // 프롬프트 일괄번역
  const translateAllPrompts = async () => {
    const scriptsWithPrompts = scripts.filter(script => script.generatedPrompt && !translatedPrompts[script.id]);
    if (scriptsWithPrompts.length === 0) return;

    setIsTranslatingAll(true);
    
    // 모든 프롬프트를 동시에 번역
    const promises = scriptsWithPrompts.map(script => translatePrompt(script.generatedPrompt!, script.id));
    await Promise.all(promises);
    
    setIsTranslatingAll(false);
  };

  // 이미지 생성
  const generateImage = async (script: Script) => {
    if (!script.generatedPrompt) return;

    // 함수형 업데이트로 상태 업데이트
    setScripts(prevScripts => 
      prevScripts.map(s => 
        s.id === script.id ? { ...s, isGeneratingImage: true } : s
      )
    );

    // 스타일과 캐릭터 정보를 조합한 프롬프트 생성
    let enhancedPrompt = script.generatedPrompt;
    
    // 스타일 정보 추가 (이미 프롬프트 생성 시 포함되었지만, 추가 보강)
    if (styleAnalysis?.confirmed && styleAnalysis.content) {
      // 스타일 정보가 이미 포함되어 있지 않은 경우에만 추가
      if (!enhancedPrompt.toLowerCase().includes(styleAnalysis.content.toLowerCase())) {
        enhancedPrompt = `${enhancedPrompt}, ${styleAnalysis.content}`;
      }
    }
    
    // 캐릭터 시드번호 자동 적용 (여러 캐릭터 지원)
    const characterSeeds = findCharacterSeedsFromScript(script.text);
    const finalSeed = script.seedNumber || (characterSeeds.length > 0 ? characterSeeds[0] : undefined);
    
    // 디버깅: 최종 프롬프트 출력
    console.log('=== 이미지 생성 프롬프트 ===');
    console.log('스크립트 ID:', script.id);
    console.log('스크립트 텍스트:', script.text);
    console.log('원본 프롬프트:', script.generatedPrompt);
    console.log('최종 프롬프트:', enhancedPrompt);
    console.log('사용자 입력 시드번호:', script.seedNumber);
    console.log('발견된 캐릭터 시드번호들:', characterSeeds);
    console.log('최종 사용 시드번호:', finalSeed);
    console.log('========================');

    try {
      const dimensions = getAspectRatioDimensions(imageSettings.aspectRatio);
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          model: imageSettings.model,
          width: dimensions.width,
          height: dimensions.height,
          steps: imageSettings.steps,
          guidanceScale: imageSettings.guidanceScale,
          num_images: 1,
          seed: finalSeed, // 캐릭터 시드번호 우선 적용
          seeds: characterSeeds // 여러 캐릭터 시드번호 전송
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // 응답 데이터 검증
        if (!data.images || !data.images[0]) {
          console.error(`스크립트 ${script.id}: 이미지 데이터가 없습니다.`, data);
          setScripts(prevScripts => 
            prevScripts.map(s => 
              s.id === script.id ? { ...s, isGeneratingImage: false } : s
            )
          );
          return;
        }

        // 함수형 업데이트로 상태 업데이트
        setScripts(prevScripts => {
          const updatedScripts = prevScripts.map(s => 
            s.id === script.id ? { 
              ...s, 
              generatedImage: data.images[0], // 첫 번째 이미지를 기본 이미지로 설정
              generatedImages: data.images, // 모든 이미지 저장
              seedNumber: finalSeed || data.seeds?.[0], // 첫 번째 시드번호
              seedNumbers: data.seeds || [finalSeed], // 모든 시드번호 저장
              isGeneratingImage: false 
            } : s
          );
          
          // 디버깅: 업데이트된 스크립트 확인
          const updatedScript = updatedScripts.find(s => s.id === script.id);
          console.log(`스크립트 ${script.id}: 이미지 생성 성공`);
          console.log('업데이트된 스크립트:', {
            id: updatedScript?.id,
            hasImage: !!updatedScript?.generatedImage,
            hasMultipleImages: !!updatedScript?.generatedImages?.length,
            imageCount: updatedScript?.generatedImages?.length || 0,
            imageUrl: updatedScript?.generatedImage?.substring(0, 100) + '...',
            seedNumber: updatedScript?.seedNumber,
            seedNumbers: updatedScript?.seedNumbers
          });
          
          return updatedScripts;
        });
        
        // 이미지 생성 완료 후 즉시 저장
        setTimeout(() => {
          handleManualSave();
        }, 100);
      } else {
        const errorText = await response.text();
        console.error(`스크립트 ${script.id}: 이미지 생성 실패 - HTTP ${response.status}`, errorText);
        setScripts(prevScripts => 
          prevScripts.map(s => 
            s.id === script.id ? { ...s, isGeneratingImage: false } : s
          )
        );
      }
    } catch (error) {
      console.error(`스크립트 ${script.id}: 이미지 생성 오류:`, error);
      setScripts(prevScripts => 
        prevScripts.map(s => 
          s.id === script.id ? { ...s, isGeneratingImage: false } : s
        )
      );
    }
  };

  // 이미지 일괄생성
  const generateAllImages = async () => {
    console.log(`전체 스크립트 개수: ${scripts.length}`);
    console.log('스크립트 목록:', scripts.map(s => ({ id: s.id, text: s.text.substring(0, 50), hasPrompt: !!s.generatedPrompt, hasImage: !!s.generatedImage })));
    
    const scriptsWithPrompts = scripts.filter(script => script.generatedPrompt && !script.generatedImage);
    if (scriptsWithPrompts.length === 0) {
      alert('생성할 이미지가 없습니다. 프롬프트를 먼저 생성해주세요.');
      return;
    }

    console.log(`이미지 일괄생성 시작: ${scriptsWithPrompts.length}개 스크립트`);
    console.log('생성할 스크립트 ID들:', scriptsWithPrompts.map(s => s.id));
    setIsGeneratingImages(true);
    
    try {
      // 모든 이미지를 동시에 생성
      const promises = scriptsWithPrompts.map(script => generateImage(script));
      await Promise.all(promises);
      
      // 생성 결과 확인
      const successCount = scripts.filter(script => script.generatedImage).length;
      const totalCount = scripts.filter(script => script.generatedPrompt).length;
      
      console.log(`이미지 생성 완료: ${successCount}/${totalCount} 성공`);
      
      if (successCount < totalCount) {
        alert(`${totalCount}개 중 ${successCount}개 이미지 생성 완료. 실패한 이미지는 다시 시도해주세요.`);
      } else {
        alert(`${successCount}개 이미지 생성이 완료되었습니다!`);
      }
    } catch (error) {
      console.error('이미지 일괄생성 오류:', error);
      alert('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // 프롬프트 복사
  const copyPrompt = async (prompt: string, id: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('복사 실패:', error);
    }
  };

  // 프롬프트 번역
  const translatePrompt = async (prompt: string, scriptId: string) => {
    if (!prompt.trim()) return;

    setIsTranslating(prev => ({ ...prev, [scriptId]: true }));

    try {
      const response = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: `다음 영어 프롬프트를 한국어로 번역해주세요: ${prompt}`,
          context: '',
          systemPrompt: '당신은 도움이 되는 AI 어시스턴트입니다. 영어로 작성된 이미지 생성 프롬프트를 한국어로 자연스럽게 번역해주세요. 번역 시에는 프롬프트의 의미와 의도를 정확히 전달하되, 한국어로 자연스럽게 표현해주세요.',
          hasImage: false
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // "한국어 번역:" 부분 제거
        const translatedText = data.content.replace(/^한국어 번역:\s*\n*/, '').trim();
        setTranslatedPrompts(prev => ({ ...prev, [scriptId]: translatedText }));
      } else {
        console.error('번역 실패');
      }
    } catch (error) {
      console.error('번역 오류:', error);
    } finally {
      setIsTranslating(prev => ({ ...prev, [scriptId]: false }));
    }
  };

  // 이미지 다운로드
  const downloadImage = (imageData: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 이미지 일괄 다운로드
  const downloadAllImages = async () => {
    const scriptsWithImages = scripts.filter(script => script.generatedImage);
    
    if (scriptsWithImages.length === 0) {
      alert('다운로드할 이미지가 없습니다.');
      return;
    }

    // 현재 프로젝트명을 기본값으로 설정
    const defaultProjectName = currentProject?.name || '프로젝트';
    setImageFolderName(defaultProjectName);
    
    // 폴더명 입력 모달 표시
    setShowImageFolderNameModal(true);
  };

  // 이미지 다운로드 실행
  const executeImageDownload = async () => {
    if (!imageFolderName.trim()) {
      alert('프로젝트명을 입력해주세요.');
      return;
    }

    const scriptsWithImages = scripts
      .filter(script => script.generatedImage)
      .sort((a, b) => parseInt(a.id) - parseInt(b.id)); // ID 순으로 정렬

    try {
      // 각 이미지를 순차적으로 다운로드
      for (const script of scriptsWithImages) {
        if (script.generatedImage) {
          const scriptNumber = parseInt(script.id);
          
          // 이미지 다운로드
          const imageLink = document.createElement('a');
          imageLink.href = script.generatedImage;
          imageLink.download = `${scriptNumber}_${imageFolderName}.png`;
          document.body.appendChild(imageLink);
          imageLink.click();
          document.body.removeChild(imageLink);
          
          // 다운로드 간격을 두어 브라우저가 처리할 시간을 줌
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      alert(`${scriptsWithImages.length}개의 이미지 다운로드가 시작되었습니다.\n\n📄 파일명 형식: \n  - 1_${imageFolderName}.png, 2_${imageFolderName}.png, ...\n\n💡 팁: 다운로드 완료 후 ${imageFolderName} 폴더를 만들어서 이미지들을 정리하세요.`);
    } catch (error) {
      console.error('이미지 다운로드 오류:', error);
      alert('이미지 다운로드 중 오류가 발생했습니다.');
    }
    
    setShowImageFolderNameModal(false);
    setImageFolderName('');
  };

  // TTS 생성 함수
  const generateTTSForScript = async (script: Script, isBatchMode: boolean = false) => {
    if (!script.text.trim()) return;

    // 일괄 모드가 아닐 때만 개별적으로 상태 설정
    if (!isBatchMode) {
      setScripts(prevScripts => 
        prevScripts.map(s => 
          s.id === script.id ? { 
            ...s, 
            isGeneratingTTS: true,
            generatedAudio: undefined // 재생성 시 기존 오디오 초기화
          } : s
        )
      );
    }

    try {
      let response: { success: boolean; audio?: string; error?: string };

      if (ttsSettings.provider === 'supertone') {
        // 슈퍼톤 TTS 사용 - 슈퍼톤 전용 voice_id 사용
        const supertoneVoiceId = ttsSettings.voice_id.startsWith('ff') || ttsSettings.voice_id.length > 20 
          ? ttsSettings.voice_id 
          : 'ff700760946618e1dcf7bd'; // 기본 Garret 음성
        
        response = await supertoneAPI.generateTTS({
          text: script.text,
          voice_id: supertoneVoiceId,
          speed: ttsSettings.speed,
          pitch: ttsSettings.pitch || 0,
          emotion: ttsSettings.emotion || 'neutral',
          language: ttsSettings.language || 'ko'
        });
      } else {
        // ElevenLabs TTS 사용 (기본) - ElevenLabs 전용 voice_id 사용
        const elevenlabsVoiceId = ttsSettings.voice_id.length === 20 && !ttsSettings.voice_id.startsWith('ff')
          ? ttsSettings.voice_id 
          : '21m00Tcm4TlvDq8ikWAM'; // 기본 ElevenLabs 음성
        
        const ttsRequest: TTSRequest = {
          text: script.text,
          voice_id: elevenlabsVoiceId,
          voice_settings: {
            stability: ttsSettings.stability,
            similarity_boost: ttsSettings.similarity_boost,
            style: ttsSettings.style,
            use_speaker_boost: ttsSettings.use_speaker_boost
          }
        };
        response = await generateTTS(ttsRequest);
      }

      if (response.success && response.audio) {
        setScripts(prevScripts => 
          prevScripts.map(s => 
            s.id === script.id ? { 
              ...s, 
              generatedAudio: response.audio,
              isGeneratingTTS: false
            } : s
          )
        );
        
        // TTS 생성 완료 후 즉시 저장
        setTimeout(() => {
          handleManualSave();
        }, 100);
      } else {
        throw new Error(response.error || 'TTS 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('TTS 생성 오류:', error);
      addFailedItem(script.id, 'tts', (error as Error).message);
      setScripts(prevScripts => 
        prevScripts.map(s => 
          s.id === script.id ? { 
            ...s, 
            isGeneratingTTS: false
          } : s
        )
      );
    }
  };

  // TTS 일괄 생성
  const generateAllTTS = async () => {
    const scriptsWithText = scripts.filter(script => script.text.trim());
    
    if (scriptsWithText.length === 0) {
      alert('TTS를 생성할 스크립트가 없습니다.');
      return;
    }

    // 기존 TTS가 있는지 확인
    const hasExistingTTS = scriptsWithText.some(script => script.generatedAudio);
    
    if (hasExistingTTS) {
      const confirmed = window.confirm('기존 TTS가 있습니다. 모든 TTS를 재생성하시겠습니까?');
      if (!confirmed) return;
    }

    // 모든 스크립트를 TTS 생성 중 상태로 설정
    setScripts(prevScripts => 
      prevScripts.map(script => 
        scriptsWithText.some(s => s.id === script.id) 
          ? { ...script, isGeneratingTTS: true }
          : script
      )
    );

    try {
      // 모든 스크립트에 대해 동시에 TTS 생성 (기존 TTS가 있어도 재생성)
      const promises = scriptsWithText.map(script => generateTTSForScript(script, true));
      await Promise.all(promises);
      console.log('모든 TTS 생성 완료');
    } catch (error) {
      console.error('일괄 TTS 생성 중 오류:', error);
      alert('일부 TTS 생성에 실패했습니다.');
    } finally {
      // 일괄생성에 포함된 스크립트들만 TTS 생성 중 상태를 해제
      setScripts(prevScripts => 
        prevScripts.map(script => 
          scriptsWithText.some(s => s.id === script.id)
            ? { ...script, isGeneratingTTS: false }
            : script
        )
      );
    }
  };

  // 오디오 재생/정지 함수
  const toggleAudioPlayback = (script: Script) => {
    if (!script.generatedAudio) return;

    if (script.isPlayingAudio) {
      // 재생 중이면 정지
      setScripts(prevScripts => 
        prevScripts.map(s => 
          s.id === script.id ? { ...s, isPlayingAudio: false } : s
        )
      );
    } else {
      // 정지 중이면 재생
      setScripts(prevScripts => 
        prevScripts.map(s => 
          s.id === script.id ? { ...s, isPlayingAudio: true } : s
        )
      );
      
      const audio = new Audio(script.generatedAudio);
      audio.onended = () => {
        setScripts(prevScripts => 
          prevScripts.map(s => 
            s.id === script.id ? { ...s, isPlayingAudio: false } : s
          )
        );
      };
      audio.play().catch(error => {
        console.error('오디오 재생 오류:', error);
        setScripts(prevScripts => 
          prevScripts.map(s => 
            s.id === script.id ? { ...s, isPlayingAudio: false } : s
          )
        );
      });
    }
  };

  // TTS 다운로드 함수
  const downloadTTS = (script: Script) => {
    if (!script.generatedAudio) return;
    downloadAudio(script.generatedAudio, `tts_${script.id}_${Date.now()}.mp3`);
  };

  // TTS 일괄 다운로드
  const downloadAllTTS = () => {
    const scriptsWithAudio = scripts.filter(script => script.generatedAudio);
    
    if (scriptsWithAudio.length === 0) {
      alert('다운로드할 TTS가 없습니다.');
      return;
    }

    scriptsWithAudio.forEach((script, index) => {
      setTimeout(() => {
        downloadTTS(script);
      }, index * 100); // 100ms 간격으로 다운로드
    });
  };

  // 분할 TTS 다운로드 함수
  const downloadSplitTTS = async () => {
    try {
      const scriptsWithText = scripts.filter(s => s.text.trim().length > 0);
      if (scriptsWithText.length === 0) {
        alert('분할 TTS를 생성할 스크립트가 없습니다.');
        return;
      }

      console.log('🎵 분할 TTS 다운로드 시작...');

      const projectName = currentProject?.name?.replace(/[^a-zA-Z0-9가-힣]/g, '_') || 'project';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      let totalSegments = 0;

      for (let i = 0; i < scriptsWithText.length; i++) {
        const script = scriptsWithText[i];
        console.log(`📝 스크립트 ${i + 1} 분할 TTS 생성 중...`);
        
        // 분할 TTS 생성
        const splitTTS = await generateSplitTTS(script);
        
        // 각 세그먼트 다운로드
        for (let j = 0; j < splitTTS.length; j++) {
          const segment = splitTTS[j];
          totalSegments++;
          
          // 파일명 형식: 2_프로젝트명_스크립트번호_세그먼트번호_타임스탬프.mp3
          const filename = `2_${projectName}_스크립트${i + 1}_세그먼트${j + 1}_${timestamp}.mp3`;
          
          // 데이터 URL을 직접 다운로드
          const a = document.createElement('a');
          a.href = segment.audioUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // 다운로드 간격
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      alert(`분할 TTS 다운로드가 완료되었습니다!\n총 ${totalSegments}개 세그먼트 다운로드됨\n파일명 형식: 2_${projectName}_스크립트번호_세그먼트번호_${timestamp}.mp3`);
    } catch (error) {
      console.error('분할 TTS 다운로드 오류:', error);
      alert('분할 TTS 다운로드 중 오류가 발생했습니다.');
    }
  };

  // 오디오 길이를 가져오는 함수


  const getAudioDuration = (audioUrl: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        resolve(5); // 오류 시 기본 5초
      });
    });
  };

  // 오디오 파형 분석을 통한 정확한 시간 계산
  const analyzeAudioTimings = async (audioUrl: string, segments: string[]): Promise<number[]> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audio = new Audio();
      
      audio.addEventListener('canplaythrough', async () => {
        try {
          // 오디오를 AudioBuffer로 변환
          const response = await fetch(audioUrl);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          const channelData = audioBuffer.getChannelData(0);
          const sampleRate = audioBuffer.sampleRate;
          const duration = audioBuffer.duration;
          
          // 파형 분석을 통한 세그먼트별 시간 계산
          const timings: number[] = [];
          let currentSegmentIndex = 0;
          let currentTime = 0;
          
          // 무음 임계값 설정
          const silenceThreshold = 0.01;
          const minSilenceDuration = 0.1; // 100ms
          
          let silenceStart = -1;
          let lastSpeechEnd = 0;
          
          // 오디오 데이터를 분석하여 음성 구간과 무음 구간 찾기
          for (let i = 0; i < channelData.length; i++) {
            const time = i / sampleRate;
            const amplitude = Math.abs(channelData[i]);
            
            if (amplitude > silenceThreshold) {
              // 음성 구간
              if (silenceStart !== -1) {
                // 무음 구간이 끝남
                const silenceDuration = time - silenceStart;
                if (silenceDuration >= minSilenceDuration) {
                  // 충분히 긴 무음 구간을 세그먼트 구분점으로 사용
                  const segmentDuration = time - lastSpeechEnd;
                  timings.push(segmentDuration);
                  currentSegmentIndex++;
                  
                  if (currentSegmentIndex >= segments.length - 1) {
                    // 마지막 세그먼트는 남은 시간으로
                    const remainingTime = duration - time;
                    timings.push(remainingTime);
                    break;
                  }
                  
                  lastSpeechEnd = time;
                }
                silenceStart = -1;
              }
            } else {
              // 무음 구간
              if (silenceStart === -1) {
                silenceStart = time;
              }
            }
          }
          
          // 세그먼트 수와 맞지 않으면 텍스트 비율로 조정
          if (timings.length !== segments.length) {
            console.warn(`파형 분석 결과 세그먼트 수 불일치: ${timings.length} vs ${segments.length}`);
            const totalChars = segments.reduce((sum, seg) => sum + seg.length, 0);
            const adjustedTimings: number[] = [];
            
            for (const segment of segments) {
              const ratio = segment.length / totalChars;
              const segmentDuration = duration * ratio;
              adjustedTimings.push(segmentDuration);
            }
            
            resolve(adjustedTimings);
          } else {
            resolve(timings);
          }
          
        } catch (error) {
          console.error('오디오 파형 분석 오류:', error);
          reject(error);
        } finally {
          audioContext.close();
        }
      });
      
      audio.addEventListener('error', reject);
      audio.src = audioUrl;
    });
  };

  // 통합 SRT 파일 생성 함수 (비동기)
  const generateUnifiedSRT = async () => {
    // TTS가 생성된 스크립트들만 필터링
    const scriptsWithTTS = scripts.filter(script => script.text.trim() && script.generatedAudio);
    if (scriptsWithTTS.length === 0) {
      return '통합 자막을 생성하려면 먼저 TTS를 생성해주세요.';
    }

    let srtContent = '';
    let subtitleIndex = 1;
    let currentTime = 0;

    // SRT 시간 형식으로 변환 (00:00:00,000)
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const milliseconds = Math.floor((seconds % 1) * 1000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    };

    // 각 스크립트의 실제 오디오 길이를 순차적으로 가져와서 처리
    for (const script of scriptsWithTTS) {
      try {
        const duration = await getAudioDuration(script.generatedAudio!);
        const startTime = currentTime;
        const endTime = currentTime + duration;

        // SRT 항목 추가
        srtContent += `${subtitleIndex}\n`;
        srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        srtContent += `${script.text}\n\n`;

        subtitleIndex++;
        currentTime = endTime;
      } catch (error) {
        console.error(`스크립트 ${script.id} 오디오 길이 가져오기 실패:`, error);
        // 오류 시 기본 5초로 처리
        const duration = 5;
        const startTime = currentTime;
        const endTime = currentTime + duration;

        srtContent += `${subtitleIndex}\n`;
        srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        srtContent += `${script.text}\n\n`;

        subtitleIndex++;
        currentTime = endTime;
      }
    }

    return srtContent;
  };

  // 통합 SRT 파일 다운로드 함수
  const downloadUnifiedSRT = async () => {
    try {
      const srtContent = await generateUnifiedSRT();
      if (!srtContent || srtContent.includes('TTS를 생성해주세요')) {
        alert('통합 자막을 생성하려면 먼저 TTS를 생성해주세요.');
        return;
      }

      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'unified_subtitles.srt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('통합 자막 파일(SRT)이 다운로드되었습니다!');
    } catch (error) {
      console.error('통합 SRT 생성 오류:', error);
      alert('통합 자막 파일 생성 중 오류가 발생했습니다.');
    }
  };

    // 썰채널용 텍스트 분할 함수 (3-4단어씩 강제 분할)
  const splitTextIntoSentences = (text: string): string[] => {
    console.log('원본 텍스트:', text); // 디버깅용
    
    // 먼저 구두점으로 기본 분할
    let sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) {
      sentences = [text]; // 구두점이 없으면 전체 텍스트 사용
    }
    
    const result: string[] = [];
    
    for (const sentence of sentences) {
      // 각 문장을 단어로 분할
      const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
      console.log('단어 배열:', words); // 디버깅용
      
      // 3-4단어씩 묶어서 자막 생성
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(' ').trim();
        if (chunk.length > 0) {
          result.push(chunk);
          console.log('분할된 조각:', chunk); // 디버깅용
        }
      }
    }
    
    console.log('최종 결과:', result); // 디버깅용
    return result.length > 0 ? result : [text];
  };

  // 텍스트를 적당한 크기의 청크로 분할하는 함수 (통합 분할자막용)
  const splitTextIntoChunks = (text: string): string[] => {
    // 먼저 문장 단위로 분할
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) {
      return [text];
    }
    
    const chunks: string[] = [];
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) continue;
      
      // 문장이 짧으면 그대로 사용
      if (trimmedSentence.length <= 40) {
        chunks.push(trimmedSentence);
        continue;
      }
      
      // 쉼표나 자연스러운 구두점을 기준으로 분할
      const commaParts = trimmedSentence.split(/[,，]/);
      
      if (commaParts.length > 1) {
        // 쉼표가 있으면 쉼표 기준으로 분할
        for (let i = 0; i < commaParts.length; i++) {
          const part = commaParts[i].trim();
          if (part.length > 0) {
            // 쉼표가 있던 부분은 쉼표를 포함해서 추가
            if (i < commaParts.length - 1) {
              chunks.push(part + ',');
            } else {
              chunks.push(part);
            }
          }
        }
      } else {
        // 쉼표가 없으면 "그리고", "하지만" 등의 연결어 기준으로 분할
        const connectorParts = trimmedSentence.split(/\s+(그리고|하지만|그런데|그러나|또한|또는)\s+/);
        
        if (connectorParts.length > 1) {
          for (let i = 0; i < connectorParts.length; i++) {
            const part = connectorParts[i].trim();
            if (part.length > 0) {
              chunks.push(part);
            }
          }
        } else {
          // 연결어도 없으면 단어 단위로 분할하되 문맥 고려
          const words = trimmedSentence.split(/\s+/);
          let currentChunk = '';
          
          for (const word of words) {
            const testChunk = currentChunk + (currentChunk ? ' ' : '') + word;
            
            // 30-50자 범위를 유지하면서 분할
            if (testChunk.length > 50) {
              if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
              }
              currentChunk = word;
            } else {
              currentChunk = testChunk;
            }
          }
          
          // 마지막 청크 추가
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
        }
      }
    }
    
    return chunks.length > 0 ? chunks : [text];
  };

  // 썰채널용 통합 SRT 파일 생성 함수
  const generateStoryChannelSRT = async () => {
    const scriptsWithTTS = scripts.filter(script => script.text.trim() && script.generatedAudio);
    if (scriptsWithTTS.length === 0) {
      return '썰채널용 자막을 생성하려면 먼저 TTS를 생성해주세요.';
    }

    let srtContent = '';
    let subtitleIndex = 1;
    let currentTime = 0;

    // SRT 시간 형식으로 변환
    const formatTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const milliseconds = Math.floor((seconds % 1) * 1000);
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
    };

    // 각 스크립트를 문장 단위로 분할하여 처리
    for (const script of scriptsWithTTS) {
      try {
        const totalDuration = await getAudioDuration(script.generatedAudio!);
        const sentences = splitTextIntoSentences(script.text);
        const sentenceDuration = totalDuration / sentences.length; // 각 문장의 평균 시간

        for (const sentence of sentences) {
          const startTime = currentTime;
          const endTime = currentTime + sentenceDuration;

          // SRT 항목 추가
          srtContent += `${subtitleIndex}\n`;
          srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
          srtContent += `${sentence}\n\n`;

          subtitleIndex++;
          currentTime = endTime;
        }
      } catch (error) {
        console.error(`스크립트 ${script.id} 처리 실패:`, error);
        // 오류 시 전체 텍스트를 하나의 블록으로 처리
        const duration = 5;
        const startTime = currentTime;
        const endTime = currentTime + duration;

        srtContent += `${subtitleIndex}\n`;
        srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
        srtContent += `${script.text}\n\n`;

        subtitleIndex++;
        currentTime = endTime;
      }
    }

    return srtContent;
  };

  // 썰채널용 SRT 파일 다운로드 함수
  const downloadStoryChannelSRT = async () => {
    try {
      const srtContent = await generateStoryChannelSRT();
      if (!srtContent || srtContent.includes('TTS를 생성해주세요')) {
        alert('썰채널용 자막을 생성하려면 먼저 TTS를 생성해주세요.');
        return;
      }

      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'story_channel_subtitles.srt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('썰채널용 자막 파일(SRT)이 다운로드되었습니다!');
    } catch (error) {
      console.error('썰채널용 SRT 생성 오류:', error);
      alert('썰채널용 자막 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 오디오에서 실제 발화 시작점(무음 끝)을 찾는 함수
  const analyzeSpeechStart = async (audioUrl: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      fetch(audioUrl)
        .then(res => res.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
          const channelData = audioBuffer.getChannelData(0);
          const sampleRate = audioBuffer.sampleRate;
          const silenceThreshold = 0.01;
          // 0.01보다 커지는 첫 시점(=발화 시작)
          for (let i = 0; i < channelData.length; i++) {
            if (Math.abs(channelData[i]) > silenceThreshold) {
              audioContext.close();
              resolve(i / sampleRate);
              return;
            }
          }
          audioContext.close();
          resolve(0); // 전부 무음이면 0
        })
        .catch(err => {
          audioContext.close();
          resolve(0); // 실패 시 0
        });
    });
  };

  const generateSplitUnifiedSRT = async () => {
    try {
      const scriptsWithAudio = scripts.filter(s => s.generatedAudio);
      if (scriptsWithAudio.length === 0) {
        throw new Error('TTS가 생성된 스크립트가 없습니다.');
      }

      // 1. 각 스크립트의 오디오에서 실제 발화 시작점 분석
      const speechStartTimes: number[] = [];
      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        if (script.generatedAudio) {
          const start = await analyzeSpeechStart(script.generatedAudio);
          speechStartTimes.push(start);
        } else {
          speechStartTimes.push(0);
        }
      }

      // 2. 각 오디오의 전체 길이도 미리 구함
      const audioDurations: number[] = [];
      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        if (script.generatedAudio) {
          const duration = await getAudioDuration(script.generatedAudio);
          audioDurations.push(duration);
        } else {
          audioDurations.push(0);
        }
      }

      // 3. SRT 생성 - 연속적인 시간 보장
      let acc = 0;
      let srtContent = '';
      let subtitleNumber = 1;

      // SRT 시간 형식 함수
      const formatSRTTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
      };

      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        const segments = splitTextIntoChunks(script.text);
        const ttsStart = acc + speechStartTimes[i];
        const ttsEnd = acc + audioDurations[i];
        const totalDuration = ttsEnd - ttsStart;
        const totalChars = segments.reduce((sum, seg) => sum + seg.length, 0);
        let segStart = ttsStart;
        
        for (let j = 0; j < segments.length; j++) {
          const seg = segments[j];
          const ratio = seg.length / totalChars;
          const segDuration = totalDuration * ratio;
          let segEnd = segStart + segDuration;
          
          // 마지막 세그먼트가면 다음 스크립트 시작 전까지 연장
          if (j === segments.length - 1) {
            const nextScriptStart = (i < scriptsWithAudio.length - 1) 
              ? acc + audioDurations[i] + speechStartTimes[i + 1] 
              : acc + audioDurations[i];
            segEnd = nextScriptStart;
          }
          
          srtContent += `${subtitleNumber}\n`;
          srtContent += `${formatSRTTime(segStart)} --> ${formatSRTTime(segEnd)}\n`;
          srtContent += `${seg.trim()}\n\n`;
          subtitleNumber++;
          segStart = segEnd;
        }
        acc += audioDurations[i];
      }

      return srtContent;
    } catch (error) {
      console.error('통합 분할자막 생성 오류:', error);
      throw error;
    }
  };

  // 파형 분석 기반 자막 생성 함수 (최적화된 설정값 사용)
  const generateWaveformBasedSRT = async () => {
    try {
      const scriptsWithAudio = scripts.filter(s => s.generatedAudio);
      if (scriptsWithAudio.length === 0) {
        throw new Error('TTS가 생성된 스크립트가 없습니다.');
      }

      console.log('🎵 파형 분석 기반 자막 생성 시작...');

      // 파형 분석 설정값 (최적화된 값들)
      const WAVEFORM_THRESHOLD = 0.004;        // 소음 임계값
      const MIN_SPEECH_DURATION = 0.5;         // 최소 발화 길이 (초)
      const MIN_SILENCE_DURATION = 0.4;        // 최소 무음 길이 (초)

      // 1. 각 스크립트의 파형 분석으로 발화 구간 감지
      const speechSegments: Array<{start: number, end: number, duration: number}[]> = [];
      
      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        if (script.generatedAudio) {
          console.log(`📊 스크립트 ${i + 1} 파형 분석 중...`);
          const segments = await detectSpeechSegmentsFromAudio(
            script.generatedAudio, 
            WAVEFORM_THRESHOLD, 
            MIN_SPEECH_DURATION, 
            MIN_SILENCE_DURATION
          );
          speechSegments.push(segments);
          console.log(`   ✅ ${segments.length}개 발화 구간 감지`);
        } else {
          speechSegments.push([]);
        }
      }

      // 2. 각 오디오의 전체 길이 구함
      const audioDurations: number[] = [];
      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        if (script.generatedAudio) {
          const duration = await getAudioDuration(script.generatedAudio);
          audioDurations.push(duration);
        } else {
          audioDurations.push(0);
        }
      }

      // 3. 파형 분석 기반 SRT 생성
      let srtContent = '';
      let subtitleNumber = 1;
      let accumulatedTime = 0;

      // SRT 시간 형식 함수
      const formatSRTTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
      };

      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        const segments = speechSegments[i];
        
        if (segments.length === 0) {
          console.log(`⚠️ 스크립트 ${i + 1}: 발화 구간을 감지할 수 없어 기본 방식 사용`);
          // 발화 구간을 감지할 수 없는 경우 기본 방식 사용
          const textChunks = splitTextIntoChunks(script.text);
          const scriptStartTime = accumulatedTime;
          const scriptEndTime = accumulatedTime + audioDurations[i];
          const scriptDuration = scriptEndTime - scriptStartTime;
          const totalChars = textChunks.reduce((sum, chunk) => sum + chunk.length, 0);
          
          let chunkStartTime = scriptStartTime;
          for (let j = 0; j < textChunks.length; j++) {
            const chunk = textChunks[j];
            const ratio = chunk.length / totalChars;
            const chunkDuration = scriptDuration * ratio;
            let chunkEndTime = chunkStartTime + chunkDuration;
            
            // 마지막 청크는 다음 스크립트 시작까지 연장
            if (j === textChunks.length - 1) {
              const nextScriptStartTime = (i < scriptsWithAudio.length - 1) 
                ? accumulatedTime + audioDurations[i] 
                : accumulatedTime + audioDurations[i];
              chunkEndTime = nextScriptStartTime;
            }
            
            srtContent += `${subtitleNumber}\n`;
            srtContent += `${formatSRTTime(chunkStartTime)} --> ${formatSRTTime(chunkEndTime)}\n`;
            srtContent += `${chunk.trim()}\n\n`;
            subtitleNumber++;
            chunkStartTime = chunkEndTime;
          }
        } else {
          // 파형 분석 결과를 사용하여 자막 생성
          console.log(`🎯 스크립트 ${i + 1}: 파형 분석 결과로 자막 생성`);
          
          for (let j = 0; j < segments.length; j++) {
            const segment = segments[j];
            const segmentStartTime = accumulatedTime + segment.start;
            const segmentEndTime = accumulatedTime + segment.end;
            
            // 텍스트를 발화 구간에 맞게 분할
            const textChunks = splitTextIntoChunks(script.text);
            const chunksPerSegment = Math.ceil(textChunks.length / segments.length);
            const startChunkIndex = j * chunksPerSegment;
            const endChunkIndex = Math.min((j + 1) * chunksPerSegment, textChunks.length);
            
            const segmentText = textChunks.slice(startChunkIndex, endChunkIndex).join(' ');
            
            srtContent += `${subtitleNumber}\n`;
            srtContent += `${formatSRTTime(segmentStartTime)} --> ${formatSRTTime(segmentEndTime)}\n`;
            srtContent += `${segmentText.trim()}\n\n`;
            subtitleNumber++;
          }
        }
        
        // 다음 스크립트를 위해 누적 시간 업데이트
        accumulatedTime += audioDurations[i];
      }

      console.log('✅ 파형 분석 기반 자막 생성 완료');
      return srtContent;
    } catch (error) {
      console.error('파형 분석 기반 자막 생성 오류:', error);
      throw error;
    }
  };

  // 파형에서 발화 구간 자동 감지 함수
  const detectSpeechSegmentsFromAudio = async (
    audioUrl: string, 
    threshold: number = 0.004, 
    minDuration: number = 0.5, 
    minSilence: number = 0.4
  ): Promise<Array<{start: number, end: number, duration: number}>> => {
    try {
      console.log(`🔍 파형 분석 시작: threshold=${threshold}, minDuration=${minDuration}, minSilence=${minSilence}`);
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const samplesPerFrame = Math.floor(sampleRate * 0.01); // 10ms 프레임
      
      console.log(`📊 오디오 정보: 길이=${audioBuffer.duration.toFixed(2)}초, 샘플레이트=${sampleRate}, 총샘플=${channelData.length}`);
      
      let segments: Array<{start: number, end: number, duration: number}> = [];
      let isInSpeech = false;
      let speechStart = 0;
      let silenceCount = 0;
      const silenceThreshold = Math.floor(minSilence * sampleRate / samplesPerFrame);
      
      console.log(`🎯 분석 설정: 프레임당샘플=${samplesPerFrame}, 무음임계=${silenceThreshold}프레임`);
      
      // 프레임 단위로 분석
      for (let i = 0; i < channelData.length; i += samplesPerFrame) {
        let maxAmplitude = 0;
        
        // 현재 프레임의 최대 진폭 계산
        for (let j = 0; j < samplesPerFrame && i + j < channelData.length; j++) {
          maxAmplitude = Math.max(maxAmplitude, Math.abs(channelData[i + j]));
        }
        
        const currentTime = i / sampleRate;
        
        if (maxAmplitude > threshold) {
          // 발화 감지
          if (!isInSpeech) {
            speechStart = currentTime;
            isInSpeech = true;
            silenceCount = 0;
            console.log(`🗣️ 발화 시작: ${currentTime.toFixed(3)}초 (진폭: ${maxAmplitude.toFixed(6)})`);
          }
        } else {
          // 무음 감지
          if (isInSpeech) {
            silenceCount++;
            
            if (silenceCount >= silenceThreshold) {
              // 발화 구간 종료
              const speechEnd = currentTime;
              const duration = speechEnd - speechStart;
              
              if (duration >= minDuration) {
                segments.push({
                  start: speechStart,
                  end: speechEnd,
                  duration: duration
                });
                console.log(`✅ 발화 구간 감지: ${speechStart.toFixed(3)}초 ~ ${speechEnd.toFixed(3)}초 (${duration.toFixed(3)}초)`);
              } else {
                console.log(`⚠️ 너무 짧은 발화 무시: ${speechStart.toFixed(3)}초 ~ ${speechEnd.toFixed(3)}초 (${duration.toFixed(3)}초)`);
              }
              
              isInSpeech = false;
            }
          }
        }
      }
      
      // 마지막 발화 구간 처리
      if (isInSpeech) {
        const speechEnd = audioBuffer.duration;
        const duration = speechEnd - speechStart;
        
        if (duration >= minDuration) {
          segments.push({
            start: speechStart,
            end: speechEnd,
            duration: duration
          });
          console.log(`✅ 마지막 발화 구간: ${speechStart.toFixed(3)}초 ~ ${speechEnd.toFixed(3)}초 (${duration.toFixed(3)}초)`);
        }
      }
      
      console.log(`🎉 파형 분석 완료: ${segments.length}개 발화 구간 감지`);
      return segments;
    } catch (error) {
      console.error('파형 분석 오류:', error);
      return [];
    }
  };

  // 연속적인 자막 생성을 위한 새로운 함수 - 파형 분석 기반으로 정확한 시작점 잡기
  const generateContinuousSplitUnifiedSRT = async () => {
    try {
      const scriptsWithAudio = scripts.filter(s => s.generatedAudio);
      if (scriptsWithAudio.length === 0) {
        throw new Error('TTS가 생성된 스크립트가 없습니다.');
      }

      console.log('🎵 파형 분석 기반 통합 분할자막 생성 시작...');

      // 파형 분석 설정값 (사용자 최적 설정값)
      const WAVEFORM_THRESHOLD = 0.004;        // 소음 임계값
      const MIN_SPEECH_DURATION = 0.5;         // 최소 발화 길이 (초)
      const MIN_SILENCE_DURATION = 0.4;        // 최소 무음 길이 (초) - 핵심!

      // 1. 각 스크립트의 파형 분석으로 정확한 발화 시작점 찾기
      const speechStartTimes: number[] = [];
      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        if (script.generatedAudio) {
          console.log(`📊 스크립트 ${i + 1} 파형 분석 중...`);
          
          // 파형 분석으로 발화 구간 감지
          const segments = await detectSpeechSegmentsFromAudio(
            script.generatedAudio, 
            WAVEFORM_THRESHOLD, 
            MIN_SPEECH_DURATION, 
            MIN_SILENCE_DURATION
          );
          
          if (segments.length > 0) {
            // 첫 번째 발화 구간의 시작점을 사용
            const firstSegment = segments[0];
            speechStartTimes.push(firstSegment.start);
            console.log(`   ✅ 발화 시작점: ${firstSegment.start.toFixed(3)}초`);
          } else {
            // 파형 분석으로 감지할 수 없는 경우 더 민감한 설정으로 재시도
            console.log(`   ⚠️ 파형 분석 실패, 더 민감한 설정으로 재시도`);
            const retrySegments = await detectSpeechSegmentsFromAudio(
              script.generatedAudio, 
              0.002,   // 약간 낮은 임계값
              0.3,     // 약간 짧은 최소 발화 길이
              0.3      // 약간 짧은 최소 무음 길이
            );
            
            if (retrySegments.length > 0) {
              const firstSegment = retrySegments[0];
              speechStartTimes.push(firstSegment.start);
              console.log(`   ✅ 재시도 성공 - 발화 시작점: ${firstSegment.start.toFixed(3)}초`);
            } else {
              // 그래도 실패하면 기존 방식 사용
              console.log(`   ❌ 재시도도 실패, 기존 방식 사용`);
              const start = await analyzeSpeechStart(script.generatedAudio);
              speechStartTimes.push(start);
            }
          }
        } else {
          speechStartTimes.push(0);
        }
      }

      // 2. 각 오디오의 전체 길이도 미리 구함
      const audioDurations: number[] = [];
      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        if (script.generatedAudio) {
          const duration = await getAudioDuration(script.generatedAudio);
          audioDurations.push(duration);
        } else {
          audioDurations.push(0);
        }
      }

      // 3. 파형 분석 기반으로 완전히 연속적인 SRT 생성
      let srtContent = '';
      let subtitleNumber = 1;

      // SRT 시간 형식 함수
      const formatSRTTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
      };

      // 각 스크립트의 실제 시작점과 끝점 계산
      const scriptTimings: Array<{start: number, end: number}> = [];
      let currentTime = 0;
      
      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const scriptStartTime = currentTime + speechStartTimes[i];
        const scriptEndTime = currentTime + audioDurations[i];
        
        scriptTimings.push({
          start: scriptStartTime,
          end: scriptEndTime
        });
        
        // 다음 스크립트를 위해 현재 시간 업데이트
        currentTime = scriptEndTime;
      }
      
      // 각 스크립트별로 자막 생성
      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        const segments = splitTextIntoChunks(script.text);
        const currentTiming = scriptTimings[i];
        
        // 다음 스크립트의 시작점 (현재 자막이 끝나는 지점)
        const nextScriptStart = (i < scriptsWithAudio.length - 1) 
          ? scriptTimings[i + 1].start 
          : currentTiming.end;
        
        // 현재 자막이 유지되어야 할 전체 시간
        const totalDuration = nextScriptStart - currentTiming.start;
        const totalChars = segments.reduce((sum, seg) => sum + seg.length, 0);
        
        let segmentStartTime = currentTiming.start;
        
        for (let j = 0; j < segments.length; j++) {
          const seg = segments[j];
          const ratio = seg.length / totalChars;
          const segmentDuration = totalDuration * ratio;
          let segmentEndTime = segmentStartTime + segmentDuration;
          
          // 마지막 세그먼트는 다음 스크립트 시작점까지 정확히 연장
          if (j === segments.length - 1) {
            segmentEndTime = nextScriptStart;
          }
          
          srtContent += `${subtitleNumber}\n`;
          srtContent += `${formatSRTTime(segmentStartTime)} --> ${formatSRTTime(segmentEndTime)}\n`;
          srtContent += `${seg.trim()}\n\n`;
          subtitleNumber++;
          segmentStartTime = segmentEndTime;
        }
      }

      console.log('✅ 파형 분석 기반 통합 분할자막 생성 완료');
      return srtContent;
    } catch (error) {
      console.error('파형 분석 기반 통합 분할자막 생성 오류:', error);
      throw error;
    }
  };

  // 파형 분석 기반 자막 다운로드
  const downloadWaveformBasedSRT = async () => {
    try {
      const srtContent = await generateWaveformBasedSRT();
      if (!srtContent) {
        alert('파형 분석 기반 자막을 생성하려면 먼저 TTS를 생성해주세요.');
        return;
      }

      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `waveform_based_srt_${currentProject?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'project'}.srt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('파형 분석 기반 자막 파일(SRT)이 다운로드되었습니다!');
    } catch (error) {
      console.error('파형 분석 기반 자막 다운로드 오류:', error);
      alert('파형 분석 기반 자막 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 통합 분할자막 다운로드
  const downloadSplitUnifiedSRT = async () => {
    try {
      const srtContent = await generateContinuousSplitUnifiedSRT();
      if (!srtContent) {
        alert('파형 분석 기반 통합 분할자막을 생성하려면 먼저 TTS를 생성해주세요.');
        return;
      }

      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `split_unified_srt_${currentProject?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'project'}.srt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('파형 분석 기반 통합 분할자막 파일(SRT)이 다운로드되었습니다!');
    } catch (error) {
      console.error('통합 분할자막 다운로드 오류:', error);
      alert('파형 분석 기반 통합 분할자막 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 분할 TTS 기반 자막 다운로드
  const downloadSplitTTSBasedSRT = async () => {
    try {
      const srtContent = await generateSplitTTSBasedSRT();
      if (!srtContent) {
        alert('분할 TTS 기반 자막을 생성하려면 먼저 스크립트를 입력해주세요.');
        return;
      }

      // 폴더 선택 다이얼로그 (브라우저 제한으로 인해 기본 다운로드 폴더 사용)
      const projectName = currentProject?.name?.replace(/[^a-zA-Z0-9가-힣]/g, '_') || 'project';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `1_${projectName}_분할TTS자막_${timestamp}.srt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`분할 TTS 기반 자막 파일이 다운로드되었습니다!\n파일명: 1_${projectName}_분할TTS자막_${timestamp}.srt`);
    } catch (error) {
      console.error('분할 TTS 기반 자막 다운로드 오류:', error);
      alert('분할 TTS 기반 자막 파일 생성 중 오류가 발생했습니다.');
    }
  };

  // 비디오만 일괄 다운로드 함수
  const downloadAllVideosOnly = async () => {
    const videosWithVideo = scripts.filter(script => script.generatedVideo);
    
    if (videosWithVideo.length === 0) {
      alert('다운로드할 비디오가 없습니다.');
      return;
    }

    try {
      let downloadCount = 0;

      for (const script of videosWithVideo) {
        if (script.generatedVideo) {
          // 비디오 파일 다운로드
          const videoResponse = await fetch(script.generatedVideo);
          const videoBlob = await videoResponse.blob();
          const videoUrl = URL.createObjectURL(videoBlob);
          const videoLink = document.createElement('a');
          videoLink.href = videoUrl;
          videoLink.download = `video_${script.id}.mp4`;
          document.body.appendChild(videoLink);
          videoLink.click();
          document.body.removeChild(videoLink);
          URL.revokeObjectURL(videoUrl);

          downloadCount++;
          
          // 다운로드 간 지연 (브라우저 제한 방지)
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      alert(`총 ${downloadCount}개의 비디오가 다운로드되었습니다!`);
    } catch (error) {
      console.error('비디오 일괄 다운로드 오류:', error);
      alert('비디오 다운로드 중 오류가 발생했습니다.');
    }
  };

  // AudioBuffer를 WAV로 변환하는 함수
  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length * buffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    
    // WAV 헤더 작성
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, buffer.numberOfChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * buffer.numberOfChannels * 2, true);
    view.setUint16(32, buffer.numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);
    
    // 오디오 데이터 작성
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  // TTS 통합 다운로드 함수
  const downloadUnifiedTTS = async () => {
    const scriptsWithTTS = scripts.filter(script => script.generatedAudio);
    
    if (scriptsWithTTS.length === 0) {
      alert('통합할 TTS가 없습니다.');
      return;
    }

    try {
      console.log(`TTS 통합 시작: ${scriptsWithTTS.length}개 파일`);
      
      // AudioContext 생성 (사용자 인터랙션 후이므로 안전)
      let audioContext;
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('AudioContext 생성 성공');
      } catch (err) {
        console.error('AudioContext 생성 실패:', err);
        alert('오디오 컨텍스트 생성에 실패했습니다. 브라우저가 Web Audio API를 지원하지 않을 수 있습니다.');
        return;
      }

      const audioBuffers: AudioBuffer[] = [];
      
      // 모든 TTS 파일을 순차적으로 로드
      let loadCount = 0;
      for (const script of scriptsWithTTS) {
        if (script.generatedAudio) {
          try {
            console.log(`TTS 파일 ${loadCount + 1}/${scriptsWithTTS.length} 로딩 중...`);
            
            const response = await fetch(script.generatedAudio);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            console.log(`ArrayBuffer 크기: ${arrayBuffer.byteLength} bytes`);
            
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            console.log(`AudioBuffer 생성: ${audioBuffer.duration}초, ${audioBuffer.sampleRate}Hz`);
            
            audioBuffers.push(audioBuffer);
            loadCount++;
          } catch (err) {
            console.error(`스크립트 ${script.id} TTS 로드 실패:`, err);
            alert(`스크립트 ${script.id}의 TTS 파일 로드에 실패했습니다: ${err}`);
            return;
          }
        }
      }
      
      if (audioBuffers.length === 0) {
        alert('유효한 TTS 파일이 없습니다.');
        return;
      }
      
      console.log(`모든 TTS 파일 로드 완료: ${audioBuffers.length}개`);
      
      // 총 길이 계산
      const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
      const sampleRate = audioBuffers[0].sampleRate;
      const numberOfChannels = audioBuffers[0].numberOfChannels;
      
      console.log(`통합 버퍼 생성: ${totalLength} 샘플, ${sampleRate}Hz, ${numberOfChannels} 채널`);
      console.log(`예상 파일 크기: ${(totalLength * numberOfChannels * 2 / 1024 / 1024).toFixed(2)}MB`);
      
             // 메모리 체크
       if (totalLength > 100000000) { // 약 37분 이상의 오디오
         const proceed = window.confirm('통합될 오디오가 매우 깁니다. 계속하시겠습니까? (메모리 부족이 발생할 수 있습니다)');
         if (!proceed) return;
       }
      
      // 통합 AudioBuffer 생성
      let mergedBuffer;
      try {
        mergedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);
        console.log('통합 AudioBuffer 생성 성공');
      } catch (err) {
        console.error('AudioBuffer 생성 실패:', err);
        alert('통합 오디오 버퍼 생성에 실패했습니다. 파일이 너무 클 수 있습니다.');
        return;
      }
      
      // 오디오 데이터 복사
      let offset = 0;
      for (let bufferIndex = 0; bufferIndex < audioBuffers.length; bufferIndex++) {
        const buffer = audioBuffers[bufferIndex];
        console.log(`버퍼 ${bufferIndex + 1} 복사 중... (오프셋: ${offset})`);
        
        try {
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = mergedBuffer.getChannelData(channel);
            const sourceData = buffer.getChannelData(channel);
            channelData.set(sourceData, offset);
          }
          offset += buffer.length;
        } catch (err) {
          console.error(`버퍼 ${bufferIndex + 1} 복사 실패:`, err);
          alert(`오디오 데이터 복사 중 오류가 발생했습니다: ${err}`);
          return;
        }
      }
      
      console.log('모든 오디오 데이터 복사 완료');
      
      // WAV 파일로 변환
      console.log('WAV 변환 시작...');
      let wavBlob;
      try {
        wavBlob = audioBufferToWav(mergedBuffer);
        console.log(`WAV 변환 완료: ${(wavBlob.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (err) {
        console.error('WAV 변환 실패:', err);
        alert(`WAV 변환 중 오류가 발생했습니다: ${err}`);
        return;
      }
      
      // 다운로드
      try {
        const url = URL.createObjectURL(wavBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'unified_tts.wav';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        console.log('다운로드 완료');
        alert(`총 ${scriptsWithTTS.length}개의 TTS가 통합되어 다운로드되었습니다!`);
      } catch (err) {
        console.error('다운로드 실패:', err);
        alert(`파일 다운로드 중 오류가 발생했습니다: ${err}`);
      }
      
    } catch (error) {
      console.error('TTS 통합 다운로드 전체 오류:', error);
      alert(`TTS 통합 다운로드 중 오류가 발생했습니다: ${error}`);
    }
  };



  // 다운로드 옵션 토글 함수
  const toggleDownloadOption = (option: keyof typeof downloadOptions) => {
    setDownloadOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // 모달 SRT 미리보기 토글 함수
  const toggleModalSrtPreview = async () => {
    if (!showModalSrtPreview) {
      setShowModalSrtPreview(true);
      setModalSrtPreviewContent('미리보기를 생성 중입니다...');
      try {
        const srtContent = await generateUnifiedSRT();
        setModalSrtPreviewContent(srtContent);
      } catch (error) {
        console.error('모달 SRT 미리보기 생성 오류:', error);
        setModalSrtPreviewContent('미리보기 생성 중 오류가 발생했습니다.');
      }
    } else {
      setShowModalSrtPreview(false);
      setModalSrtPreviewContent('');
    }
  };

  // 모달 썰채널용 SRT 미리보기 토글 함수
  const toggleModalStoryChannelSrtPreview = async () => {
    if (!showModalStoryChannelSrtPreview) {
      setShowModalStoryChannelSrtPreview(true);
      setModalStoryChannelSrtContent('썰채널용 미리보기를 생성 중입니다...');
      try {
        const srtContent = await generateStoryChannelSRT();
        setModalStoryChannelSrtContent(srtContent);
      } catch (error) {
        console.error('모달 썰채널용 SRT 미리보기 생성 오류:', error);
        setModalStoryChannelSrtContent('미리보기 생성 중 오류가 발생했습니다.');
      }
    } else {
      setShowModalStoryChannelSrtPreview(false);
      setModalStoryChannelSrtContent('');
    }
  };

  // 모달 통합 분할자막 미리보기 토글 함수
  const toggleModalSplitUnifiedSrtPreview = async () => {
    if (!showModalSplitUnifiedSrtPreview) {
      setShowModalSplitUnifiedSrtPreview(true);
      setModalSplitUnifiedSrtContent('파형 분석 기반 통합 분할자막 미리보기를 생성 중입니다...');
      try {
        const srtContent = await generateContinuousSplitUnifiedSRT();
        setModalSplitUnifiedSrtContent(srtContent);
      } catch (error) {
        console.error('모달 통합 분할자막 미리보기 생성 오류:', error);
        setModalSplitUnifiedSrtContent('미리보기 생성 중 오류가 발생했습니다.');
      }
    } else {
      setShowModalSplitUnifiedSrtPreview(false);
      setModalSplitUnifiedSrtContent('');
    }
  };

  // 다운로드 모달에서 비디오+자막 다운로드 함수
  const downloadVideosWithSubtitlesFromModal = async () => {
    const videosToDownload = scripts
      .filter(script => script.generatedVideo)
      .sort((a, b) => parseInt(a.id) - parseInt(b.id));
    
    if (videosToDownload.length === 0) {
      alert('다운로드할 비디오가 없습니다.');
      return;
    }

    // 다운로드 모달을 닫고 BulkVideoDownloader 모달을 엽니다
    setShowDownloadModal(false);
    setShowBulkDownloader(true);
  };

  // 선택된 항목들 일괄 다운로드 함수
  const executeSelectedDownloads = async () => {
    let downloadCount = 0;
    
    try {
      if (downloadOptions.images && scripts.filter(s => s.generatedImage).length > 0) {
        await downloadAllImages();
        downloadCount++;
      }
      
      if (downloadOptions.ttsIndividual && scripts.filter(s => s.generatedAudio).length > 0) {
        await downloadAllTTS();
        downloadCount++;
      }
      
      if (downloadOptions.ttsUnified && scripts.filter(s => s.generatedAudio).length > 0) {
        await downloadUnifiedTTS();
        downloadCount++;
      }
      
      if (downloadOptions.ttsSplit && scripts.filter(s => s.text.trim()).length > 0) {
        await downloadSplitTTS();
        downloadCount++;
      }
      
      if (downloadOptions.srtUnified && scripts.filter(s => s.text.trim()).length > 0) {
        await downloadUnifiedSRT();
        downloadCount++;
      }
      
      if (downloadOptions.srtSplitUnified && scripts.filter(s => s.text.trim() && s.generatedAudio).length > 0) {
        await downloadSplitUnifiedSRT();
        downloadCount++;
      }
      
      if (downloadOptions.srtSplitTTSBased && scripts.filter(s => s.text.trim()).length > 0) {
        await downloadSplitTTSBasedSRT();
        downloadCount++;
      }
      
      if (downloadOptions.srtStoryChannel && scripts.filter(s => s.text.trim() && s.generatedAudio).length > 0) {
        await downloadStoryChannelSRT();
        downloadCount++;
      }
      
      if (downloadOptions.videosOnly && scripts.filter(s => s.generatedVideo).length > 0) {
        await downloadAllVideosOnly();
        downloadCount++;
      }
      
      if (downloadOptions.videosWithSubtitles && scripts.filter(s => s.generatedVideo).length > 0) {
        await downloadVideosWithSubtitlesFromModal();
        downloadCount++;
      }
      
      if (downloadCount === 0) {
        alert('다운로드할 항목을 선택해주세요.');
      } else {
        setShowDownloadModal(false);
        // 옵션 초기화
        setDownloadOptions({
          images: false,
          ttsIndividual: false,
          ttsUnified: false,
          ttsSplit: false,
          srtUnified: false,
          srtSplitUnified: false,
          srtSplitTTSBased: false,
          srtStoryChannel: false,
          videosOnly: false,
          videosWithSubtitles: false
        });
      }
    } catch (error) {
      console.error('일괄 다운로드 오류:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  // 통합 오디오 생성 함수
  const generateCombinedAudio = async () => {
    const scriptsWithAudio = scripts.filter(script => script.generatedAudio);
    
    if (scriptsWithAudio.length === 0) {
      alert('통합할 TTS가 없습니다. 먼저 개별 TTS를 생성해주세요.');
      return;
    }

    setIsGeneratingCombinedAudio(true);

    try {
      // 각 오디오 세그먼트의 정보를 수집
      const segments: AudioSegment[] = [];
      let currentTime = 0;

      for (const script of scriptsWithAudio) {
        if (script.generatedAudio) {
          // 오디오 길이를 추정 (실제로는 오디오 파일을 분석해야 함)
          const estimatedDuration = script.text.length * 0.1; // 대략적인 추정
          
          segments.push({
            scriptId: script.id,
            startTime: currentTime,
            endTime: currentTime + estimatedDuration,
            duration: estimatedDuration,
            audioData: script.generatedAudio
          });
          
          currentTime += estimatedDuration;
        }
      }

      setAudioSegments(segments);

      // 서버에 통합 오디오 생성 요청
      const response = await fetch('/api/combine-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          segments: segments.map(seg => ({
            audioData: seg.audioData,
            startTime: seg.startTime
          }))
        })
      });

      if (!response.ok) {
        throw new Error('통합 오디오 생성에 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.success && data.combinedAudio) {
        setCombinedAudioData(data.combinedAudio);
        console.log('통합 오디오 생성 완료');
      } else {
        throw new Error(data.error || '통합 오디오 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('통합 오디오 생성 오류:', error);
      alert('통합 오디오 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingCombinedAudio(false);
    }
  };

  // 통합 오디오 재생/정지
  const toggleCombinedAudioPlayback = () => {
    if (!combinedAudioElement) return;

    if (isPlayingCombinedAudio) {
      // 재생 중지
      combinedAudioElement.pause();
      setIsPlayingCombinedAudio(false);
    } else {
      // 재생 시작
      combinedAudioElement.play();
      setIsPlayingCombinedAudio(true);
    }
  };

  // 시크바 클릭으로 구간 이동
  const handleSeek = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!combinedAudioElement) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * combinedAudioDuration;
    
    combinedAudioElement.currentTime = newTime;
    setCombinedAudioCurrentTime(newTime);
  };

  // 통합 오디오 다운로드
  const downloadCombinedAudio = () => {
    if (!combinedAudioData) return;
    downloadAudio(combinedAudioData, `combined_audio_${Date.now()}.mp3`);
  };

  // 시간 포맷팅 함수
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };



  // 통합 오디오 요소 초기화
  useEffect(() => {
    if (combinedAudioData) {
      const audio = new Audio(combinedAudioData);
      
      audio.addEventListener('loadedmetadata', () => {
        setCombinedAudioDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCombinedAudioCurrentTime(audio.currentTime);
      });
      
      audio.addEventListener('ended', () => {
        setIsPlayingCombinedAudio(false);
        setCombinedAudioCurrentTime(0);
      });
      
      setCombinedAudioElement(audio);
      
      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('ended', () => {});
      };
    }
  }, [combinedAudioData]);

  // 개별 비디오 생성 함수
  const generateIndividualVideo = async (script: Script) => {
    if (!script.generatedImage || !script.generatedAudio) {
      alert('이미지와 TTS가 필요합니다.');
      return;
    }

    try {
      console.log('개별 비디오 생성 요청:', {
        scriptId: script.id,
        imageUrl: script.generatedImage.substring(0, 100) + '...',
        audioLength: script.generatedAudio.length
      });

      const response = await fetch('/api/generate-individual-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: script.generatedAudio,
          imageData: script.generatedImage,
          scriptId: script.id
        })
      });

      if (!response.ok) {
        throw new Error('개별 비디오 생성에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        console.log(`개별 비디오 생성 성공 - 스크립트 ${script.id}:`, data.video.substring(0, 100) + '...');
        
        // 스크립트에 비디오 데이터 추가
        setScripts(prevScripts => {
          const updatedScripts = prevScripts.map(s => 
            s.id === script.id ? { ...s, generatedVideo: data.video } : s
          );
          
          // 즉시 상위 컴포넌트에 변경사항 전달
          setTimeout(() => {
            if (onScriptsChange) {
              console.log(`비디오 생성 후 scripts 전달 - 스크립트 ${script.id}:`, updatedScripts);
              onScriptsChange(updatedScripts);
            }
          }, 100);
          
          return updatedScripts;
        });
        
        // 오디오 길이 측정
        const getAudioDuration = (audioData: string): Promise<number> => {
          return new Promise((resolve) => {
            const audio = new Audio(audioData);
            audio.addEventListener('loadedmetadata', () => {
              resolve(audio.duration);
            });
            audio.addEventListener('error', () => {
              // 오류 시 대략적인 추정
              resolve(script.text.length * 0.1);
            });
          });
        };

        const actualDuration = await getAudioDuration(script.generatedAudio || '');
        
        // 개별 비디오 정보를 WorkflowData에 저장
        const individualVideo = {
          id: `video_${script.id}`,
          scriptId: script.id,
          scriptText: script.text,
          videoData: data.video,
          audioData: script.generatedAudio || '',
          imageData: script.generatedImage || '',
          duration: actualDuration, // 실제 오디오 길이 사용
          confirmed: false
        };
        
        // 기존 상태에서 individualVideos 배열을 안전하게 가져와서 새로 추가
        let currentState = {};
        try {
          if (getSavedState && typeof getSavedState === 'function') {
            currentState = getSavedState() || {};
          }
        } catch (error) {
          console.warn('getSavedState 호출 오류:', error);
          currentState = {};
        }
        const prevVideos = Array.isArray((currentState as any)?.individualVideos) ? (currentState as any).individualVideos : [];
        const videos = [...prevVideos.filter((v: any) => v.scriptId !== script.id), individualVideo];
        if (onSaveState && typeof onSaveState === 'function') {
                  onSaveState({
          ...currentState,
          individualVideos: videos
        });
        }
        
        // 비디오 생성 완료 후 즉시 저장
        setTimeout(() => {
          console.log(`비디오 생성 완료 후 상태 저장 - 스크립트 ${script.id}`);
          handleManualSave();
          saveStateImmediately();
          
          // 현재 scripts 상태를 다시 전달하여 강제 동기화
          if (onScriptsChange) {
            setScripts(currentScripts => {
              console.log(`강제 동기화 - 스크립트 ${script.id} 비디오 상태:`, 
                currentScripts.map(s => ({ 
                  id: s.id, 
                  hasVideo: !!s.generatedVideo,
                  videoExists: s.id === script.id ? !!s.generatedVideo : !!s.generatedVideo
                }))
              );
              onScriptsChange(currentScripts);
              return currentScripts;
            });
          }
        }, 100);
        
        console.log(`스크립트 ${script.id} 비디오 생성 완료`);
      } else {
        throw new Error(data.error || '개별 비디오 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('개별 비디오 생성 오류:', error);
      alert(`개별 비디오 생성 오류: ${error.message}`);
    }
  };

  // 모든 개별 비디오 생성
  const generateAllIndividualVideos = async () => {
    const scriptsWithAssets = scripts.filter(script => 
      script.generatedImage && script.generatedAudio
    );
    
    if (scriptsWithAssets.length === 0) {
      alert('생성할 비디오가 없습니다. 이미지와 TTS를 먼저 생성해주세요.');
      return;
    }

    console.log(`비디오 일괄생성 시작: ${scriptsWithAssets.length}개 스크립트`);
    console.log('스크립트 ID 목록:', scriptsWithAssets.map(s => s.id));
    
    setIsGeneratingVideo(true);
    try {
      // 모든 스크립트에 대해 동시에 비디오 생성 (이미 생성된 것도 재생성)
      const promises = scriptsWithAssets.map(script => generateIndividualVideo(script));
      await Promise.all(promises);
      
      // 생성 결과 확인
      const successCount = scripts.filter(script => script.generatedVideo).length;
      const totalCount = scriptsWithAssets.length;
      
      console.log(`비디오 생성 완료: ${successCount}/${totalCount} 성공`);
      
      // 일괄 생성 완료 후 강제 상태 동기화
      setTimeout(() => {
        console.log('일괄 비디오 생성 완료 후 강제 동기화 시작');
        saveStateImmediately();
        
        if (onScriptsChange) {
          setScripts(currentScripts => {
            const videosCount = currentScripts.filter(s => s.generatedVideo).length;
            console.log(`일괄 생성 완료 후 scripts 동기화: 총 ${currentScripts.length}개 중 ${videosCount}개 비디오 있음`);
            onScriptsChange(currentScripts);
            return currentScripts;
          });
        }
      }, 300);
      
      if (successCount < totalCount) {
        alert(`${totalCount}개 중 ${successCount}개 비디오 생성 완료. 실패한 비디오는 다시 시도해주세요.`);
      } else {
        alert(`${successCount}개 비디오 생성이 완료되었습니다!`);
        setVideosGenerated(true); // 비디오 생성 완료 상태 설정
      }
    } catch (error) {
      console.error('일괄 비디오 생성 오류:', error);
      alert('일부 비디오 생성에 실패했습니다.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };



  // 개별 비디오 다운로드 함수
  const downloadIndividualVideo = (script: Script) => {
    if (script.generatedVideo) {
      // 비디오 다운로드
      const link = document.createElement('a');
      link.href = script.generatedVideo;
      link.download = `video_${script.id}_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // SRT 자막 파일도 함께 생성하고 다운로드
      generateAndDownloadSRT(script);
    }
  };

  // SRT 자막 파일 생성 및 다운로드 함수
  const generateAndDownloadSRT = async (script: Script) => {
    try {
      const srtContent = await generateSRTContent(script);
      
      if (srtContent) {
        // SRT 파일 다운로드
        const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `subtitle_${script.id}_${Date.now()}.srt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`스크립트 ${script.id} SRT 자막 파일 생성 완료`);
      }
    } catch (error) {
      console.error('SRT 자막 파일 생성 오류:', error);
    }
  };

  // 파일명 입력 상태 (비디오용)
  const [showFolderNameModal, setShowFolderNameModal] = useState(false);
  const [folderName, setFolderName] = useState('');
  
  // 이미지 파일명 입력 상태
  const [showImageFolderNameModal, setShowImageFolderNameModal] = useState(false);
  const [imageFolderName, setImageFolderName] = useState('');



  // 실제 다운로드 실행
  const executeDownload = async () => {
    if (!folderName.trim()) {
      alert('폴더명을 입력해주세요.');
      return;
    }

    const videosToDownload = scripts
      .filter(script => script.generatedVideo)
      .sort((a, b) => parseInt(a.id) - parseInt(b.id)); // 스크립트 ID 순서대로 정렬
    
    try {
      // 폴더 선택 다이얼로그 표시 (브라우저 지원 시)
      let selectedFolder: any = null;
      
      // 폴더 선택 API 지원 확인
      if ('showDirectoryPicker' in window) {
        try {
          selectedFolder = await (window as any).showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'downloads'
          });
        } catch (error) {
          console.log('폴더 선택이 취소되었거나 지원되지 않습니다:', error);
        }
      }

      if (selectedFolder) {
        // 폴더가 선택된 경우: 파일을 직접 폴더에 저장
        for (const script of videosToDownload) {
          if (script.generatedVideo) {
            try {
              const scriptNumber = parseInt(script.id);
              const videoFileName = `${scriptNumber}_${folderName}.mp4`;
              const srtFileName = `${scriptNumber}_${folderName}.srt`;
              
              // 비디오 파일 저장
              const response = await fetch(script.generatedVideo);
              const blob = await response.blob();
              
              const fileHandle = await selectedFolder.getFileHandle(videoFileName, { create: true });
              const writable = await fileHandle.createWritable();
              await writable.write(blob);
              await writable.close();
              
              // SRT 자막 파일 생성 및 저장
              const srtContent = await generateSRTContent(script);
              const srtBlob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
              
              const srtFileHandle = await selectedFolder.getFileHandle(srtFileName, { create: true });
              const srtWritable = await srtFileHandle.createWritable();
              await srtWritable.write(srtBlob);
              await srtWritable.close();
              
              console.log(`파일 저장 완료: ${videoFileName}, ${srtFileName}`);
            } catch (error) {
              console.error(`파일 저장 실패 (스크립트 ${script.id}):`, error);
            }
          }
        }
        
        alert(`${videosToDownload.length}개의 비디오와 자막 파일이 선택한 폴더에 저장되었습니다!\n\n📁 저장 위치: ${selectedFolder.name} 폴더\n📄 파일명 형식: \n  - 1_${folderName}.mp4, 2_${folderName}.mp4, ...\n  - 1_${folderName}.srt, 2_${folderName}.srt, ...`);
      } else {
        // 폴더 선택이 안된 경우: 기존 방식으로 다운로드
        alert(`폴더 선택이 취소되었습니다. 다운로드 폴더에 비디오와 자막 파일들이 저장됩니다.\n\n📁 권장사항: 다운로드 완료 후 '${folderName}' 폴더를 만들어서 파일들을 정리하세요.`);
        
        // 각 비디오와 SRT를 순차적으로 다운로드
        for (const script of videosToDownload) {
          if (script.generatedVideo) {
            const scriptNumber = parseInt(script.id);
            
            // 비디오 다운로드
            const videoLink = document.createElement('a');
            videoLink.href = script.generatedVideo;
            videoLink.download = `${scriptNumber}_${folderName}.mp4`;
            document.body.appendChild(videoLink);
            videoLink.click();
            document.body.removeChild(videoLink);
            
            // SRT 자막 파일 다운로드
            const srtContent = await generateSRTContent(script);
            const srtBlob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
            const srtUrl = URL.createObjectURL(srtBlob);
            const srtLink = document.createElement('a');
            srtLink.href = srtUrl;
            srtLink.download = `${scriptNumber}_${folderName}.srt`;
            document.body.appendChild(srtLink);
            srtLink.click();
            document.body.removeChild(srtLink);
            URL.revokeObjectURL(srtUrl);
            
            // 다운로드 간격을 두어 브라우저가 처리할 시간을 줌
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        alert(`${videosToDownload.length}개의 비디오와 자막 파일 다운로드가 시작되었습니다.\n\n📄 파일명 형식: \n  - 1_${folderName}.mp4, 2_${folderName}.mp4, ...\n  - 1_${folderName}.srt, 2_${folderName}.srt, ...\n\n💡 팁: 다운로드 완료 후 ${folderName} 폴더를 만들어서 파일들을 정리하세요.`);
      }
      
      setShowFolderNameModal(false);
      setFolderName('');
    } catch (error) {
      console.error('비디오 다운로드 오류:', error);
      alert('비디오 다운로드 중 오류가 발생했습니다.');
    }
  };

  // SRT 콘텐츠 생성 함수 (generateAndDownloadSRT에서 분리)
  const generateSRTContent = async (script: Script): Promise<string> => {
    try {
      // 오디오 길이 측정
      const getAudioDuration = (audioData: string): Promise<number> => {
        return new Promise((resolve) => {
          const audio = new Audio(audioData);
          audio.addEventListener('loadedmetadata', () => {
            resolve(audio.duration);
          });
          audio.addEventListener('error', () => {
            // 오류 시 대략적인 추정 (분당 250자 기준)
            const estimatedDuration = script.text.length / 4.2; // 초당 약 4.2자
            resolve(estimatedDuration);
          });
        });
      };

      const audioDuration = script.generatedAudio 
        ? await getAudioDuration(script.generatedAudio)
        : script.text.length / 4.2; // 오디오가 없으면 추정

      // 문맥을 고려한 자연스러운 텍스트 분할 (20-25자 이내)
      const smartSplitText = (text: string): string[] => {
        const segments: string[] = [];
        const targetLength = 22; // 목표 길이 (20-25자 범위의 중간)
        const maxLength = 25; // 최대 길이
        
        let currentPos = 0;
        
        while (currentPos < text.length) {
          let endPos = Math.min(currentPos + targetLength, text.length);
          
          // 끝까지 왔거나 남은 글자가 적으면 그대로 마무리
          if (endPos >= text.length || text.length - currentPos <= maxLength) {
            segments.push(text.substring(currentPos).trim());
            break;
          }
          
          // 자연스러운 분할점 찾기 (우선순위 순)
          let bestSplitPos = endPos;
          
          // 1순위: 문장 끝 (마침표, 느낌표, 물음표 뒤)
          for (let i = endPos; i >= currentPos + 10; i--) {
            if (i < text.length && /[.!?]\s/.test(text.substring(i, i + 2))) {
              bestSplitPos = i + 1;
              break;
            }
          }
          
          // 2순위: 쉼표 뒤 (자연스러운 호흡)
          if (bestSplitPos === endPos) {
            for (let i = endPos; i >= currentPos + 8; i--) {
              if (i < text.length && /[,，]\s/.test(text.substring(i, i + 2))) {
                bestSplitPos = i + 1;
                break;
              }
            }
          }
          
          // 3순위: 접속사 앞 (그리고, 하지만, 그런데 등)
          if (bestSplitPos === endPos) {
            const conjunctions = ['그리고', '하지만', '그런데', '또한', '그래서', '따라서', '그러나', '그러므로'];
            for (const conj of conjunctions) {
              const conjPos = text.indexOf(conj, currentPos + 8);
              if (conjPos !== -1 && conjPos <= endPos && conjPos >= currentPos + 8) {
                bestSplitPos = conjPos;
                break;
              }
            }
          }
          
          // 4순위: 숫자 뒤 (첫 번째, 두 번째 등)
          if (bestSplitPos === endPos) {
            for (let i = endPos; i >= currentPos + 8; i--) {
              if (i < text.length && /[번째째]\s/.test(text.substring(i, i + 2))) {
                bestSplitPos = i + 1;
                break;
              }
            }
          }
          
          // 5순위: 조사 뒤 공백
          if (bestSplitPos === endPos) {
            for (let i = endPos; i >= currentPos + 8; i--) {
              if (i < text.length && /[은는이가을를에서로의와과도만]\s/.test(text.substring(i, i + 2))) {
                bestSplitPos = i + 1;
                break;
              }
            }
          }
          
          // 6순위: 일반 공백
          if (bestSplitPos === endPos) {
            for (let i = endPos; i >= currentPos + 10; i--) {
              if (text[i] === ' ') {
                bestSplitPos = i;
                break;
              }
            }
          }
          
          // 분할점이 너무 앞쪽이면 강제로 뒤로 이동
          if (bestSplitPos < currentPos + 15) {
            bestSplitPos = Math.min(currentPos + maxLength, text.length);
          }
          
          const segment = text.substring(currentPos, bestSplitPos).trim();
          if (segment.length > 0) {
            segments.push(segment);
          }
          
          currentPos = bestSplitPos;
          
          // 무한루프 방지
          if (currentPos === bestSplitPos && bestSplitPos < text.length) {
            currentPos++;
          }
        }
        
        return segments.filter(s => s.length > 0);
      };

      // 줄바꿈 추가 함수 - 단순하고 자연스럽게
      const addLineBreaks = (text: string): string => {
        // 20자 이내면 줄바꿈 없이 그대로
        if (text.length <= 20) return text;
        
        // 쉼표가 있고 적절한 위치에 있으면 쉼표 뒤에서 분할
        const commaIndex = text.indexOf(',');
        if (commaIndex !== -1 && commaIndex >= 8 && commaIndex <= 15) {
          const part1 = text.substring(0, commaIndex + 1).trim();
          const part2 = text.substring(commaIndex + 1).trim();
          if (part2.length > 0) {
            return `${part1}\n${part2}`;
          }
        }
        
        // 중간점 근처에서 적절한 분할점 찾기
        const midPoint = Math.floor(text.length / 2);
        let bestSplit = midPoint;
        
        // 중간점 ±3 범위에서 공백이나 조사 찾기
        for (let i = midPoint - 3; i <= midPoint + 3 && i < text.length; i++) {
          if (i > 5 && i < text.length - 3) {
            const char = text[i];
            if (char === ' ' || '은는이가을를에서의와과'.includes(char)) {
              bestSplit = char === ' ' ? i : i + 1;
              break;
            }
          }
        }
        
        const line1 = text.substring(0, bestSplit).trim();
        const line2 = text.substring(bestSplit).trim();
        
        return line2 ? `${line1}\n${line2}` : line1;
      };

      const segments = smartSplitText(script.text);
      const totalChars = segments.reduce((sum, seg) => sum + seg.length, 0);

      // SRT 형식으로 자막 생성
      let currentTime = 0;
      const srtContent = segments
        .map((segment, index) => {
          // 각 세그먼트의 길이에 비례해서 시간 할당
          const segmentChars = segment.length;
          const segmentDuration = Math.max(2.0, (segmentChars / totalChars) * audioDuration); // 최소 2초로 여유있게
          
          const startTime = currentTime;
          const endTime = currentTime + segmentDuration;
          currentTime = endTime;
          
          // 시간을 SRT 형식(HH:MM:SS,mmm)으로 변환
          const formatSRTTime = (seconds: number): string => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            const wholeSecs = Math.floor(secs);
            const milliseconds = Math.floor((secs - wholeSecs) * 1000);
            
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${wholeSecs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
          };

          // 줄바꿈 적용
          const textWithLineBreaks = addLineBreaks(segment);

          return `${index + 1}\n${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n${textWithLineBreaks}\n`;
        })
        .join('\n');

      return srtContent;
    } catch (error) {
      console.error('SRT 콘텐츠 생성 오류:', error);
      return '';
    }
  };

  // 분할자막용 TTS 생성 함수
  const generateSplitTTS = async (script: Script) => {
    try {
      console.log('🎵 분할자막용 TTS 생성 시작...');
      
      const segments = splitTextIntoChunks(script.text);
      const splitTTS: Array<{text: string, audioUrl: string, duration: number}> = [];
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i].trim();
        if (segment.length === 0) continue;
        
        console.log(`📝 세그먼트 ${i + 1}/${segments.length} TTS 생성: "${segment}"`);
        
        // TTS 생성
        const ttsRequest: TTSRequest = {
          text: segment,
          voice_id: ttsSettings.voice_id,
          voice_settings: {
            stability: ttsSettings.stability,
            similarity_boost: ttsSettings.similarity_boost,
            style: ttsSettings.style,
            use_speaker_boost: ttsSettings.use_speaker_boost
          }
        };
        
        const ttsResponse = await generateTTS(ttsRequest);
        if (ttsResponse.success && ttsResponse.audio) {
          // TTS API에서 반환되는 audio는 이미 base64로 인코딩된 데이터 URL이거나 base64 문자열
          let audioUrl: string;
          
          if (ttsResponse.audio.startsWith('data:audio/')) {
            // 이미 데이터 URL인 경우
            audioUrl = ttsResponse.audio;
          } else {
            // base64 문자열인 경우 데이터 URL로 변환
            audioUrl = `data:audio/mpeg;base64,${ttsResponse.audio}`;
          }
          
          // 오디오 길이 측정
          const duration = await getAudioDuration(audioUrl);
          
          splitTTS.push({
            text: segment,
            audioUrl: audioUrl,
            duration: duration
          });
          
          console.log(`✅ 세그먼트 ${i + 1} TTS 생성 완료: ${duration.toFixed(2)}초`);
        } else {
          console.error(`❌ 세그먼트 ${i + 1} TTS 생성 실패`);
        }
      }
      
      console.log(`🎉 분할자막용 TTS 생성 완료: ${splitTTS.length}개 세그먼트`);
      return splitTTS;
    } catch (error) {
      console.error('분할자막용 TTS 생성 오류:', error);
      throw error;
    }
  };

  // 분할 TTS 기반 자막 생성 함수
  const generateSplitTTSBasedSRT = async () => {
    try {
      const scriptsWithAudio = scripts.filter(s => s.text.trim().length > 0);
      if (scriptsWithAudio.length === 0) {
        throw new Error('생성할 스크립트가 없습니다.');
      }

      console.log('🎵 분할 TTS 기반 자막 생성 시작...');

      let srtContent = '';
      let subtitleNumber = 1;
      let currentTime = 0;

      // SRT 시간 형식 함수
      const formatSRTTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const milliseconds = Math.floor((seconds % 1) * 1000);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
      };

      for (let i = 0; i < scriptsWithAudio.length; i++) {
        const script = scriptsWithAudio[i];
        console.log(`📝 스크립트 ${i + 1} 분할 TTS 생성 중...`);
        
        // 분할 TTS 생성
        const splitTTS = await generateSplitTTS(script);
        
        // 각 세그먼트에 대해 자막 생성
        for (let j = 0; j < splitTTS.length; j++) {
          const segment = splitTTS[j];
          const startTime = currentTime;
          const endTime = currentTime + segment.duration;
          
          srtContent += `${subtitleNumber}\n`;
          srtContent += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
          srtContent += `${segment.text}\n\n`;
          
          subtitleNumber++;
          currentTime = endTime;
        }
        
        // 스크립트 간 호흡구간 추가 (0.5초)
        if (i < scriptsWithAudio.length - 1) {
          currentTime += 0.5;
        }
      }

      console.log('✅ 분할 TTS 기반 자막 생성 완료');
      return srtContent;
    } catch (error) {
      console.error('분할 TTS 기반 자막 생성 오류:', error);
      throw error;
    }
  };



  return (
    <div className="p-6 space-y-6">
      {/* 헤더 및 저장 상태 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🎬 프롬프트 생성</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">스크립트를 기반으로 이미지, TTS, 비디오를 생성합니다</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              마지막 저장: {lastSaved instanceof Date 
                ? lastSaved.toLocaleTimeString() 
                : new Date(lastSaved).toLocaleTimeString()
              }
            </div>
          )}
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
          >
            <Save size={14} />
            {isSaving ? '저장 중...' : '수동 저장'}
          </button>
        </div>
      </div>

      {/* 상태 정보 표시 */}
      <div className="flex gap-4 text-sm mb-4">
        <div className={`flex items-center gap-2 ${styleAnalysis?.confirmed ? 'text-green-600' : 'text-yellow-600'}`}>
          <div className={`w-2 h-2 rounded-full ${styleAnalysis?.confirmed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          스타일: {styleAnalysis?.confirmed ? '확정됨' : '미확정'}
        </div>
        <div className={`flex items-center gap-2 ${characters.filter(char => char.confirmed).length > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
          <div className={`w-2 h-2 rounded-full ${characters.filter(char => char.confirmed).length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          캐릭터: {characters.filter(char => char.confirmed).length}개 확정
        </div>
        <div className={`flex items-center gap-2 ${script?.confirmed ? 'text-green-600' : 'text-yellow-600'}`}>
          <div className={`w-2 h-2 rounded-full ${script?.confirmed ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          스크립트: {script?.confirmed ? '불러옴' : '미확정'}
        </div>
        <div className={`flex items-center gap-2 ${Object.keys(translatedPrompts).length > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
          <div className={`w-2 h-2 rounded-full ${Object.keys(translatedPrompts).length > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          번역: {Object.keys(translatedPrompts).length}개 완료
        </div>
      </div>

      {/* 설정 버튼 그룹 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={toggleStyleSettings}
          className="px-3 py-2 text-sm bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
        >
          스타일 설정 {showStyleSettings ? '접기' : '펼치기'}
        </button>
        <button
          onClick={toggleCharacterSettings}
          className="px-3 py-2 text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
        >
          캐릭터 설정 {showCharacterSettings ? '접기' : '펼치기'}
        </button>
        <button
          onClick={toggleScriptSettings}
          className="px-3 py-2 text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          스크립트 설정 {showScriptSettings ? '접기' : '펼치기'}
        </button>
        <button
          onClick={toggleImageSettings}
          className="px-3 py-2 text-sm bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-800 transition-colors"
        >
          이미지 상세설정 {showImageSettings ? '접기' : '펼치기'}
        </button>
        <button
          onClick={toggleTTSSettings}
          className="px-3 py-2 text-sm bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
        >
          TTS 설정 {showTTSSettings ? '접기' : '펼치기'}
        </button>
      </div>

      {/* 생성 버튼 그룹 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <button
          onClick={generateAllPrompts}
          disabled={isGeneratingPrompts || scripts.filter(s => s.text.trim()).length === 0 || !styleAnalysis?.confirmed}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          title={!styleAnalysis?.confirmed ? '스타일 설정을 먼저 확정해주세요' : ''}
        >
          <MessageSquare size={16} />
          {isGeneratingPrompts ? '프롬프트 생성 중...' : '프롬프트 일괄생성'}
        </button>
        
        <button
          onClick={translateAllPrompts}
          disabled={isTranslatingAll || scripts.filter(s => s.generatedPrompt && !translatedPrompts[s.id]).length === 0}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <Languages size={16} />
          {isTranslatingAll ? '번역 중...' : '프롬프트 일괄번역'}
        </button>
        
        <button
          onClick={generateAllImages}
          disabled={isGeneratingImages || scripts.filter(s => s.generatedPrompt && !s.generatedImage).length === 0}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Image size={16} />
          {isGeneratingImages ? '이미지 생성 중...' : '이미지 일괄생성'}
        </button>
        
        <button
          onClick={generateAllTTS}
          disabled={scripts.filter(s => s.text.trim()).length === 0 || scripts.some(s => s.isGeneratingTTS)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Volume2 size={16} />
          {scripts.some(s => s.isGeneratingTTS) 
            ? 'TTS 생성 중...' 
            : scripts.filter(s => s.text.trim() && s.generatedAudio).length > 0 
              ? 'TTS 일괄 재생성' 
              : 'TTS 일괄생성'
          }
        </button>
        
        <button
          onClick={generateCombinedAudio}
          disabled={
            isGeneratingCombinedAudio || 
            scripts.filter(s => s.generatedAudio).length === 0 ||
            scripts.some(s => s.isGeneratingTTS)
          }
          className="flex items-center justify-center gap-2 px-4 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
        >
          <Volume2 size={16} />
          {isGeneratingCombinedAudio ? '통합 오디오 생성 중...' : '통합 오디오 생성'}
        </button>
        
        <button
          onClick={generateAllIndividualVideos}
          disabled={isGeneratingVideo || scripts.filter(s => s.generatedImage && s.generatedAudio && !s.generatedVideo).length === 0}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <Image size={16} />
          {isGeneratingVideo ? '개별 비디오 생성 중...' : '개별 비디오 일괄생성'}
        </button>
        




      </div>

      {/* 통합 오디오 플레이어 */}
      {combinedAudioData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Volume2 size={20} className="text-indigo-600" />
              통합 오디오 플레이어
            </h3>
            <button
              onClick={downloadCombinedAudio}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
            >
              <Download size={14} />
              다운로드
            </button>
          </div>
          
          {/* 오디오 컨트롤 */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={toggleCombinedAudioPlayback}
              className="flex items-center justify-center w-12 h-12 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors"
            >
              {isPlayingCombinedAudio ? <Pause size={20} /> : <Play size={20} />}
            </button>
            
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>{formatTime(combinedAudioCurrentTime)}</span>
                <span>{formatTime(combinedAudioDuration)}</span>
              </div>
              <div 
                className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 cursor-pointer relative"
                onClick={handleSeek}
              >
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(combinedAudioCurrentTime / combinedAudioDuration) * 100}%` }}
                ></div>
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-indigo-600 rounded-full shadow-md cursor-pointer hover:bg-indigo-700 transition-colors"
                  style={{ left: `${(combinedAudioCurrentTime / combinedAudioDuration) * 100}%`, marginLeft: '-8px' }}
                ></div>
              </div>
            </div>
          </div>
          

        </div>
      )}



      {/* 다운로드 버튼 그룹 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => setShowDownloadModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          <Download size={20} />
          다운로드
        </button>

        <button
          onClick={() => setShowBulkDownloader(true)}
          disabled={scripts.filter(s => s.generatedVideo).length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <FolderDown size={16} />
          비디오 일괄다운로드 ({scripts.filter(s => s.generatedVideo).length}개)
        </button>

        <button
          onClick={() => onTabChange && onTabChange(4)}
          disabled={scripts.filter(s => s.generatedVideo).length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <Film size={16} />
          비디오 편집하기
        </button>
      </div>



      {/* 스크립트 설정 섹션 */}
      {showScriptSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">스크립트 편집 (줄바꿈으로 구분)</h3>
          </div>
          <div className="space-y-4">
            {/* 스크립트 상태 표시 */}
            {script?.confirmed ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">확정된 스크립트 불러옴</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  스크립트 작성 탭에서 확정된 내용이 자동으로 불러와졌습니다. 아래에서 수정할 수 있습니다.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  스크립트 작성 탭에서 스크립트를 확정해주세요. 또는 아래에서 직접 입력할 수 있습니다.
                </p>
              </div>
            )}
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                스크립트 내용 (줄바꿈으로 각 문장을 구분)
              </label>
              <textarea
                value={scriptSettingsText}
                onChange={(e) => setScriptSettingsText(e.target.value)}
                placeholder="스크립트를 입력하세요. 각 줄이 하나의 문장/장면으로 처리됩니다."
                className="w-full h-64 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={toggleScriptSettings}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={applyScriptChanges}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 상세설정 섹션 */}
      {showImageSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">이미지 상세설정</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">모델</label>
              <select
                value={imageSettings.model}
                onChange={(e) => setImageSettings({...imageSettings, model: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled
              >
                <option value="runware:97@1">Runware 97 (고정)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">비율</label>
              <select
                value={imageSettings.aspectRatio}
                onChange={(e) => setImageSettings({...imageSettings, aspectRatio: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="16:9">16:9 (가로형)</option>
                <option value="9:16">9:16 (세로형)</option>
                <option value="1:1">1:1 (정사각형)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">스텝 (최대: 50)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={imageSettings.steps}
                onChange={(e) => setImageSettings({...imageSettings, steps: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">가이던스 스케일 (최대: 20)</label>
              <input
                type="number"
                min="0.1"
                max="20"
                step="0.1"
                value={imageSettings.guidanceScale}
                onChange={(e) => setImageSettings({...imageSettings, guidanceScale: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* TTS 설정 섹션 */}
      {showTTSSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">TTS 설정</h3>
          </div>
          
          {/* TTS 공급자 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TTS 공급자</label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="elevenlabs"
                  checked={ttsSettings.provider === 'elevenlabs'}
                  onChange={(e) => setTTSSettings({
                    ...ttsSettings, 
                    provider: e.target.value as 'elevenlabs',
                    voice_id: '21m00Tcm4TlvDq8ikWAM' // ElevenLabs 기본 음성으로 변경
                  })}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">🌍 ElevenLabs</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="supertone"
                  checked={ttsSettings.provider === 'supertone'}
                  onChange={(e) => setTTSSettings({
                    ...ttsSettings, 
                    provider: e.target.value as 'supertone',
                    voice_id: 'ff700760946618e1dcf7bd' // Supertone 기본 음성으로 변경
                  })}
                  className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">🇰🇷 Supertone</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">음성 선택</label>
              <select
                value={ttsSettings.voice_id}
                onChange={(e) => setTTSSettings({...ttsSettings, voice_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {ttsSettings.provider === 'elevenlabs' ? (
                  <>
                    <option value="21m00Tcm4TlvDq8ikWAM">Rachel (여성, 한국어 지원)</option>
                    <option value="AZnzlk1XvdvUeBnXmlld">Domi (여성, 영어)</option>
                    <option value="EXAVITQu4vr4xnSDxMaL">Bella (여성, 영어)</option>
                    <option value="VR6AewLTigWG4xSOukaG">Arnold (남성, 영어)</option>
                    <option value="pNInz6obpgDQGcFmaJgB">Adam (남성, 영어)</option>
                    <option value="yoZ06aMxZJJ28mfd3POQ">Sam (남성, 영어)</option>
                  </>
                ) : (
                  <>
                    <option value="ff700760946618e1dcf7bd">Garret (남성, 영어)</option>
                    <option value="aeda85bfe699f338b74d68">한국어 여성 (기본)</option>
                    <option value="2974e7e7940bcc352ee78e">Toma (남성, 한국어)</option>
                    <option value="korean_male_01">한국어 남성 1</option>
                  </>
                )}
              </select>
            </div>
            
            {/* ElevenLabs 전용 설정들 */}
            {ttsSettings.provider === 'elevenlabs' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">안정성 (0-1)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={ttsSettings.stability}
                  onChange={(e) => setTTSSettings({...ttsSettings, stability: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <span className="text-sm text-gray-500">{ttsSettings.stability}</span>
              </div>
            )}
            
            {ttsSettings.provider === 'elevenlabs' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">유사성 부스트 (0-1)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={ttsSettings.similarity_boost}
                  onChange={(e) => setTTSSettings({...ttsSettings, similarity_boost: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <span className="text-sm text-gray-500">{ttsSettings.similarity_boost}</span>
              </div>
            )}
            
            {ttsSettings.provider === 'elevenlabs' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">스타일 (0-1)</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={ttsSettings.style}
                  onChange={(e) => setTTSSettings({...ttsSettings, style: parseFloat(e.target.value)})}
                  className="w-full"
                />
                <span className="text-sm text-gray-500">{ttsSettings.style}</span>
              </div>
            )}
            
            {ttsSettings.provider === 'elevenlabs' && (
              <div className="flex items-center">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-3">스피커 부스트</label>
                <input
                  type="checkbox"
                  checked={ttsSettings.use_speaker_boost}
                  onChange={(e) => setTTSSettings({...ttsSettings, use_speaker_boost: e.target.checked})}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">속도 (0.5-2.0)</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={ttsSettings.speed}
                onChange={(e) => setTTSSettings({...ttsSettings, speed: parseFloat(e.target.value)})}
                className="w-full"
              />
              <span className="text-sm text-gray-500">{ttsSettings.speed}x</span>
            </div>

            {/* 슈퍼톤 전용 설정들 */}
            {ttsSettings.provider === 'supertone' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">언어</label>
                  <select
                    value={ttsSettings.language || 'ko'}
                    onChange={(e) => setTTSSettings({...ttsSettings, language: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="ko">한국어</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">감정</label>
                  <select
                    value={ttsSettings.emotion || 'neutral'}
                    onChange={(e) => setTTSSettings({...ttsSettings, emotion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="neutral">중성</option>
                    <option value="happy">기쁨</option>
                    <option value="sad">슬픔</option>
                    <option value="angry">화남</option>
                    <option value="excited">흥분</option>
                    <option value="calm">차분함</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">피치 (-20 ~ 20)</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="1"
                    value={ttsSettings.pitch || 0}
                    onChange={(e) => setTTSSettings({...ttsSettings, pitch: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{ttsSettings.pitch || 0}</span>
                </div>
              </>
            )}
          </div>
          
          <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
            <h4 className="font-medium text-indigo-800 dark:text-indigo-200 mb-2">
              {ttsSettings.provider === 'elevenlabs' ? 'ElevenLabs 설정 설명' : 'Supertone 설정 설명'}
            </h4>
            <ul className="text-sm text-indigo-700 dark:text-indigo-300 space-y-1">
              {ttsSettings.provider === 'elevenlabs' ? (
                <>
                  <li>• <strong>안정성</strong>: 음성의 일관성 (높을수록 안정적)</li>
                  <li>• <strong>유사성 부스트</strong>: 원본 음성과의 유사도 (높을수록 유사)</li>
                  <li>• <strong>스타일</strong>: 감정 표현의 강도 (높을수록 표현적)</li>
                  <li>• <strong>스피커 부스트</strong>: 음성 품질 향상</li>
                  <li>• <strong>속도</strong>: 재생 속도 조절</li>
                </>
              ) : (
                <>
                  <li>• <strong>언어</strong>: 한국어 또는 영어 선택</li>
                  <li>• <strong>감정</strong>: 음성의 감정 톤 설정</li>
                  <li>• <strong>피치</strong>: 음성의 높낮이 조절</li>
                  <li>• <strong>속도</strong>: 재생 속도 조절</li>
                  <li>🇰🇷 <strong>한국어 특화</strong>: 자연스러운 한국어 발음</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* 스타일 설정 섹션 */}
      {showStyleSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">스타일 설정</h3>
          </div>
          <div className="space-y-4">
            {styleAnalysis?.confirmed ? (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">확정된 스타일</h4>
                <p className="text-sm text-green-700 dark:text-green-300">{styleAnalysis.content}</p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">스타일 설정 탭에서 스타일을 확정해주세요.</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">스타일 설명</label>
              <div className="space-y-3">
                <textarea
                  value={characterSettings.description}
                  onChange={(e) => setCharacterSettings({...characterSettings, description: e.target.value})}
                  placeholder="한국어로 스타일을 설명하세요... (예: 미니어처 디오라마, 틸트 시프트 효과, 영화 같은 조명)"
                  className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={translateAndApplyStyle}
                    disabled={isTranslatingStyle || !characterSettings.description.trim() || !styleAnalysis?.confirmed}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    title={!styleAnalysis?.confirmed ? '스타일 설정을 먼저 확정해주세요' : ''}
                  >
                    {isTranslatingStyle ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        번역 중...
                      </>
                    ) : (
                      <>
                        <Languages size={16} />
                        적용하기
                      </>
                    )}
                  </button>
                  {styleAnalysis?.confirmed && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      💡 입력한 한국어 설명이 영어로 번역되어 확정된 스타일에 추가됩니다
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 캐릭터 설정 섹션 */}
      {showCharacterSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">캐릭터 설정</h3>
          </div>
          <div className="space-y-4">
            {/* 확정된 캐릭터들 표시 */}
            {characters.filter(char => char.confirmed).length > 0 ? (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-white">확정된 캐릭터들</h4>
                {characters.filter(char => char.confirmed).map((character, index) => (
                  <div key={character.id} className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-green-800 dark:text-green-200">{character.name}</h5>
                        <p className="text-sm text-green-700 dark:text-green-300">{character.prompt}</p>
                      </div>
                      {character.seedNumber && (
                        <span className="px-2 py-1 text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded">
                          시드: {character.seedNumber}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">캐릭터 설정 탭에서 캐릭터를 확정해주세요.</p>
              </div>
            )}
            
            {/* 캐릭터 설명 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                캐릭터 설명
              </label>
              <textarea
                value={characterSettings.description}
                onChange={(e) => setCharacterSettings(prev => ({ ...prev, description: e.target.value }))}
                placeholder="캐릭터에 대한 간단한 설명을 입력하세요..."
                className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* 스크립트 입력 */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">스크립트 목록 ({scripts.length}개)</h3>
        </div>
        
        {scripts.map((script, index) => {
          return (
            <div key={`script-${script.id}-${index}`} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                스크립트 {script.id}
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => generatePrompt(script)}
                  disabled={!script.text.trim() || script.isGeneratingPrompt || !styleAnalysis?.confirmed}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  title={!styleAnalysis?.confirmed ? '스타일 설정을 먼저 확정해주세요' : ''}
                >
                  <MessageSquare size={12} />
                  {script.isGeneratingPrompt ? '생성 중...' : '프롬프트'}
                </button>
                
                <button
                  onClick={() => generateImage(script)}
                  disabled={!script.generatedPrompt || script.isGeneratingImage}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <Image size={12} />
                  {script.isGeneratingImage ? '생성 중...' : '이미지'}
                </button>
                
                <button
                  onClick={() => generateTTSForScript(script)}
                  disabled={!script.text.trim() || script.isGeneratingTTS}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Volume2 size={12} />
                  {script.isGeneratingTTS ? '생성 중...' : 'TTS'}
                </button>
                
                {scripts.length > 1 && (
                  <button
                    onClick={() => removeScript(script.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    title="스크립트 삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
            
            <textarea
              value={script.text}
              onChange={(e) => updateScriptText(script.id, e.target.value)}
              placeholder="스크립트를 입력하세요..."
              className="w-full h-20 p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
            
            {script.generatedPrompt && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">생성된 프롬프트:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => generatePrompt(script)}
                      disabled={script.isGeneratingPrompt || !styleAnalysis?.confirmed}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 transition-colors"
                      title={!styleAnalysis?.confirmed ? '스타일 설정을 먼저 확정해주세요' : '프롬프트 재생성'}
                    >
                      <RefreshCw size={12} className={script.isGeneratingPrompt ? 'animate-spin' : ''} />
                      {script.isGeneratingPrompt ? '재생성 중...' : '재생성'}
                    </button>
                    <button
                      onClick={() => translatePrompt(script.generatedPrompt!, script.id)}
                      disabled={isTranslating[script.id]}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50 transition-colors"
                    >
                      <Languages size={12} />
                      {isTranslating[script.id] ? '번역 중...' : '번역'}
                    </button>
                    <button
                      onClick={() => copyPrompt(script.generatedPrompt!, script.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      {copiedId === script.id ? <Check size={12} /> : <Copy size={12} />}
                      {copiedId === script.id ? '복사됨' : '복사'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{script.generatedPrompt}</p>
                
                {/* 번역된 프롬프트 표시 */}
                {translatedPrompts[script.id] && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">한국어 번역:</span>
                      <button
                        onClick={() => copyPrompt(translatedPrompts[script.id], `translated_${script.id}`)}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                      >
                        {copiedId === `translated_${script.id}` ? <Check size={10} /> : <Copy size={10} />}
                        {copiedId === `translated_${script.id}` ? '복사됨' : '번역본 복사'}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{translatedPrompts[script.id]}</p>
                  </div>
                )}
              </div>
            )}
            
            {script.generatedImage && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    생성된 이미지{script.generatedImages && script.generatedImages.length > 1 ? ` (${script.generatedImages.length}개)` : ''}:
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-600 dark:text-gray-400">시드:</span>
                      <input
                        type="number"
                        value={script.seedNumber || ''}
                        onChange={(e) => updateSeedNumber(script.id, parseInt(e.target.value) || 0)}
                        placeholder="시드번호"
                        className="w-32 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => downloadImage(script.generatedImage!, `image_${script.id}.png`)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                    >
                      <Download size={12} />
                      다운로드
                    </button>
                  </div>
                </div>
                
                {/* 여러 이미지가 있는 경우 그리드로 표시 */}
                {script.generatedImages && script.generatedImages.length > 1 ? (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {script.generatedImages.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <div className="absolute top-1 left-1 z-10 px-1 py-0.5 text-xs bg-black bg-opacity-50 text-white rounded">
                          시드: {script.seedNumbers?.[index] || 'N/A'}
                        </div>
                        <img 
                          src={imageUrl} 
                          alt={`Generated ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform duration-300"
                          onLoad={() => console.log(`이미지 ${index + 1} 로드 성공: 스크립트 ${script.id}`)}
                          onError={(e) => console.error(`이미지 ${index + 1} 로드 실패: 스크립트 ${script.id}`, e)}
                          onClick={() => {
                            // 이미지 클릭 시 확대 모달 표시
                            const modal = document.createElement('div');
                            modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
                            modal.onclick = () => document.body.removeChild(modal);
                            
                            const img = document.createElement('img');
                            img.src = imageUrl;
                            img.className = 'max-w-full max-h-full object-contain rounded-lg';
                            img.onclick = (e) => e.stopPropagation();
                            
                            const closeBtn = document.createElement('button');
                            closeBtn.className = 'absolute top-4 right-4 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 transition-colors';
                            closeBtn.innerHTML = '✕';
                            closeBtn.onclick = () => document.body.removeChild(modal);
                            
                            modal.appendChild(img);
                            modal.appendChild(closeBtn);
                            document.body.appendChild(modal);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* 디버깅: 이미지 URL 표시 */}
                    <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                      이미지 URL: {script.generatedImage.substring(0, 100)}...
                    </div>
                    <img 
                      src={script.generatedImage} 
                      alt="Generated" 
                      className="w-full max-w-xs aspect-square object-cover rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform duration-300"
                      onLoad={() => console.log(`이미지 로드 성공: 스크립트 ${script.id}`)}
                      onError={(e) => console.error(`이미지 로드 실패: 스크립트 ${script.id}`, e)}
                      onClick={() => {
                        // 이미지 클릭 시 확대 모달 표시
                        const modal = document.createElement('div');
                        modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
                        modal.onclick = () => document.body.removeChild(modal);
                        
                        const img = document.createElement('img');
                        img.src = script.generatedImage!;
                        img.className = 'max-w-full max-h-full object-contain rounded-lg';
                        img.onclick = (e) => e.stopPropagation();
                        
                        const closeBtn = document.createElement('button');
                        closeBtn.className = 'absolute top-4 right-4 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 transition-colors';
                        closeBtn.innerHTML = '✕';
                        closeBtn.onclick = () => document.body.removeChild(modal);
                        
                        modal.appendChild(img);
                        modal.appendChild(closeBtn);
                        document.body.appendChild(modal);
                      }}
                    />
                  </>
                )}
              </div>
            )}
            
            {script.generatedAudio && (
              <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">생성된 TTS:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleAudioPlayback(script)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                    >
                      {script.isPlayingAudio ? <VolumeX size={12} /> : <Volume2 size={12} />}
                      {script.isPlayingAudio ? '정지' : '재생'}
                    </button>
                    <button
                      onClick={() => downloadTTS(script)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                    >
                      <Download size={12} />
                      다운로드
                    </button>
                    <button
                      onClick={() => generateTTSForScript(script)}
                      disabled={script.isGeneratingTTS}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 transition-colors"
                      title="TTS 재생성"
                    >
                      <RefreshCw size={12} className={script.isGeneratingTTS ? 'animate-spin' : ''} />
                      {script.isGeneratingTTS ? '재생성 중...' : '재생성'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                  <Volume2 size={12} />
                  <span>오디오 파일이 생성되었습니다. 재생 버튼을 클릭하여 들을 수 있습니다.</span>
                </div>
              </div>
            )}
            
            {script.generatedVideo && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">생성된 비디오:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => downloadIndividualVideo(script)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      <Download size={12} />
                      비디오+자막
                    </button>
                    <button
                      onClick={() => generateIndividualVideo(script)}
                      disabled={!script.generatedImage || !script.generatedAudio}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 transition-colors"
                      title="비디오 재생성"
                    >
                      <RefreshCw size={12} />
                      재생성
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <Image size={12} />
                  <span>비디오 파일이 생성되었습니다. 다운로드 버튼을 클릭하여 저장할 수 있습니다.</span>
                </div>
              </div>
            )}
          </div>
        );
        })}
      </div>

      {/* 통합 오디오 정보 섹션 */}
      {audioSegments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">오디오 타임라인</h3>
            <span className="text-sm text-gray-500">
              총 {audioSegments.length}개 세그먼트, {audioSegments[audioSegments.length - 1]?.endTime.toFixed(1)}초
            </span>
          </div>
          
          <div className="space-y-2">
            {audioSegments.map((segment, index) => (
              <div key={segment.scriptId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded">
                    스크립트 {segment.scriptId}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {segment.startTime.toFixed(1)}s - {segment.endTime.toFixed(1)}s ({segment.duration.toFixed(1)}s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const script = scripts.find(s => s.id === segment.scriptId);
                      if (script?.generatedAudio) {
                        const audio = new Audio(script.generatedAudio);
                        audio.play();
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    <Volume2 size={12} />
                    재생
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {combinedAudioData && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-800 dark:text-green-200">통합 오디오 생성 완료</h4>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    모든 세그먼트가 하나의 오디오로 합쳐졌습니다.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleCombinedAudioPlayback}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    {isPlayingCombinedAudio ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {isPlayingCombinedAudio ? '정지' : '재생'}
                  </button>
                  <button
                    onClick={downloadCombinedAudio}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    <Download size={14} />
                    다운로드
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 파일명 입력 모달 */}
      {showFolderNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">폴더명 입력</h3>
              <button
                onClick={() => {
                  setShowFolderNameModal(false);
                  setFolderName('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                폴더명을 입력하세요
              </label>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="예: my_videos"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    executeDownload();
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                폴더 선택 후 입력한 폴더명이 파일명에 포함되어 저장됩니다. (예: 1_my_videos.mp4, 2_my_videos.mp4...)
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowFolderNameModal(false);
                  setFolderName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeDownload}
                disabled={!folderName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 파일명 입력 모달 */}
      {showImageFolderNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">이미지 파일명 설정</h3>
              <button
                onClick={() => {
                  setShowImageFolderNameModal(false);
                  setImageFolderName('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                프로젝트명을 입력하세요
              </label>
              <input
                type="text"
                value={imageFolderName}
                onChange={(e) => setImageFolderName(e.target.value)}
                placeholder="예: 공포스토리"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    executeImageDownload();
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                입력한 프로젝트명이 파일명에 포함되어 저장됩니다. (예: 1_공포스토리.png, 2_공포스토리.png...)
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowImageFolderNameModal(false);
                  setImageFolderName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={executeImageDownload}
                disabled={!imageFolderName.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 다운로드 모달 */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDownloadModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">📥 다운로드 옵션</h2>
              <button 
                onClick={() => setShowDownloadModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 이미지 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">🖼️ 이미지</h3>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={downloadOptions.images}
                    onChange={() => toggleDownloadOption('images')}
                    disabled={scripts.filter(s => s.generatedImage).length === 0}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={`${scripts.filter(s => s.generatedImage).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    이미지 일괄다운로드 ({scripts.filter(s => s.generatedImage).length}개)
                  </span>
                </label>
              </div>

              {/* 오디오 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">🎵 오디오</h3>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={downloadOptions.ttsIndividual}
                    onChange={() => toggleDownloadOption('ttsIndividual')}
                    disabled={scripts.filter(s => s.generatedAudio).length === 0}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={`${scripts.filter(s => s.generatedAudio).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    TTS 일괄다운로드 ({scripts.filter(s => s.generatedAudio).length}개)
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={downloadOptions.ttsUnified}
                    onChange={() => toggleDownloadOption('ttsUnified')}
                    disabled={scripts.filter(s => s.generatedAudio).length === 0}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={`${scripts.filter(s => s.generatedAudio).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    TTS 통합다운로드 (하나의 긴 오디오)
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={downloadOptions.ttsSplit}
                    onChange={() => toggleDownloadOption('ttsSplit')}
                    disabled={scripts.filter(s => s.text.trim()).length === 0}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={`${scripts.filter(s => s.text.trim()).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    분할 TTS 다운로드 (세그먼트별 개별 파일)
                  </span>
                </label>
              </div>

              {/* 자막 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">📄 자막</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 flex-1">
                      <input 
                        type="checkbox" 
                        checked={downloadOptions.srtUnified}
                        onChange={() => toggleDownloadOption('srtUnified')}
                        disabled={scripts.filter(s => s.text.trim()).length === 0}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className={`${scripts.filter(s => s.text.trim()).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        통합 자막(SRT)
                      </span>
                    </label>
                    <button 
                      onClick={toggleModalSrtPreview}
                      disabled={scripts.filter(s => s.text.trim()).length === 0}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                    >
                      {showModalSrtPreview ? '숨기기' : '미리보기'}
                    </button>
                  </div>
                  {showModalSrtPreview && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 border">
                      <pre className="text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {modalSrtPreviewContent || '미리보기를 생성 중입니다...'}
                      </pre>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 flex-1">
                      <input 
                        type="checkbox" 
                        checked={downloadOptions.srtSplitUnified}
                        onChange={() => toggleDownloadOption('srtSplitUnified')}
                        disabled={scripts.filter(s => s.text.trim() && s.generatedAudio).length === 0}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className={`${scripts.filter(s => s.text.trim() && s.generatedAudio).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        통합 분할자막 (파형 분석 기반)
                      </span>
                    </label>
                    <button 
                      onClick={toggleModalSplitUnifiedSrtPreview}
                      disabled={scripts.filter(s => s.text.trim() && s.generatedAudio).length === 0}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                    >
                      {showModalSplitUnifiedSrtPreview ? '숨기기' : '미리보기'}
                    </button>
                  </div>
                  {showModalSplitUnifiedSrtPreview && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 border">
                      <pre className="text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {modalSplitUnifiedSrtContent || '파형 분석 기반 통합 분할자막 미리보기를 생성 중입니다...'}
                      </pre>
                    </div>
                  )}
                  
                  {/* 분할 TTS 기반 자막 */}
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 flex-1">
                      <input 
                        type="checkbox" 
                        checked={downloadOptions.srtSplitTTSBased}
                        onChange={() => toggleDownloadOption('srtSplitTTSBased')}
                        disabled={scripts.filter(s => s.text.trim()).length === 0}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className={`${scripts.filter(s => s.text.trim()).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        분할 TTS 기반 자막 (100% 싱크 보장)
                      </span>
                    </label>
                    <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      새로고침
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                    ※ 텍스트를 분할하여 각 세그먼트별로 TTS를 생성하고 정확한 자막을 만듭니다.
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-3 flex-1">
                      <input 
                        type="checkbox" 
                        checked={downloadOptions.srtStoryChannel}
                        onChange={() => toggleDownloadOption('srtStoryChannel')}
                        disabled={scripts.filter(s => s.text.trim() && s.generatedAudio).length === 0}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className={`${scripts.filter(s => s.text.trim() && s.generatedAudio).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        썰채널용 자막 (문장별 분할)
                      </span>
                    </label>
                    <button 
                      onClick={toggleModalStoryChannelSrtPreview}
                      disabled={scripts.filter(s => s.text.trim() && s.generatedAudio).length === 0}
                      className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                    >
                      {showModalStoryChannelSrtPreview ? '숨기기' : '미리보기'}
                    </button>
                  </div>
                  {showModalStoryChannelSrtPreview && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 border">
                      <pre className="text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {modalStoryChannelSrtContent || '썰채널용 미리보기를 생성 중입니다...'}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* 비디오 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">🎬 비디오</h3>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={downloadOptions.videosOnly}
                    onChange={() => toggleDownloadOption('videosOnly')}
                    disabled={scripts.filter(s => s.generatedVideo).length === 0}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={`${scripts.filter(s => s.generatedVideo).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    비디오 일괄다운로드 ({scripts.filter(s => s.generatedVideo).length}개)
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={downloadOptions.videosWithSubtitles}
                    onChange={() => toggleDownloadOption('videosWithSubtitles')}
                    disabled={scripts.filter(s => s.generatedVideo).length === 0}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={`${scripts.filter(s => s.generatedVideo).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    비디오+자막 일괄다운로드
                  </span>
                </label>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  ※ 비디오+자막은 비디오편집 탭에서 더 많은 옵션으로 이용 가능합니다.
                </div>
              </div>
            </div>

            {/* 버튼 그룹 */}
            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button 
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={executeSelectedDownloads}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                선택한 항목 다운로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 비디오 일괄 다운로드 모달 */}
      <BulkVideoDownloader
        scripts={scripts.map(script => ({
          id: script.id,
          text: script.text,
          generatedVideo: script.generatedVideo,
          generatedAudio: script.generatedAudio
        }))}
        isOpen={showBulkDownloader}
        onClose={() => setShowBulkDownloader(false)}
      />

      {/* 프로그레스 바 - 우측 하단 고정 */}
      <div className="fixed bottom-4 right-4 z-50">
        {/* 프로그레스 토글 버튼 */}
        <button
          onClick={() => setShowProgressBar(!showProgressBar)}
          className="mb-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-200 flex items-center gap-2"
          title="생성 현황 보기"
        >
          {showProgressBar ? <EyeOff size={20} /> : <Eye size={20} />}
          <span className="text-sm font-medium">
            {scripts.filter(s => s.isGeneratingPrompt || s.isGeneratingTTS || s.isGeneratingImage).length > 0 
              ? '생성 중...' 
              : '현황'
            }
          </span>
        </button>

        {/* 프로그레스 바 패널 */}
        {showProgressBar && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-80 mb-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">생성 현황</h3>
              <button
                onClick={() => setShowProgressBar(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 프롬프트 생성 현황 */}
              {(() => {
                const progress = getPromptProgress();
                return (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        📝 프롬프트 생성
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {progress.completed}/{progress.total} ({progress.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                    {progress.generating > 0 && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        {progress.generating}개 생성 중...
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TTS 생성 현황 */}
              {(() => {
                const progress = getTTSProgress();
                return (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        🎵 TTS 생성
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {progress.completed}/{progress.total} ({progress.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                    {progress.generating > 0 && (
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                        {progress.generating}개 생성 중...
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 이미지 생성 현황 */}
              {(() => {
                const progress = getImageProgress();
                return progress.total > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        🖼️ 이미지 생성
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {progress.completed}/{progress.total} ({progress.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                    {progress.generating > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {progress.generating}개 생성 중...
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 비디오 생성 현황 */}
              {(() => {
                const progress = getVideoProgress();
                return progress.total > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        🎬 비디오 생성
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {progress.completed}/{progress.total} ({progress.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.percentage}%` }}
                      ></div>
                    </div>
                    {progress.generating > 0 && (
                      <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {progress.generating}개 생성 중...
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 실패 항목 표시 */}
              {failedItems.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                      <AlertTriangle size={14} />
                      실패 항목
                    </span>
                    <button
                      onClick={() => setShowFailedItems(!showFailedItems)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {showFailedItems ? '숨기기' : `${failedItems.length}개 보기`}
                    </button>
                  </div>
                  
                  {showFailedItems && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {failedItems.slice(0, 5).map(item => (
                        <div key={item.id} className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
                          <div className="font-medium text-red-800 dark:text-red-200">
                            {item.type.toUpperCase()} 실패
                          </div>
                          <div className="text-red-600 dark:text-red-400 truncate">
                            {item.scriptText}
                          </div>
                          <div className="text-red-500 dark:text-red-500 mt-1 text-xs">
                            {item.error}
                          </div>
                        </div>
                      ))}
                      {failedItems.length > 5 && (
                        <div className="text-xs text-gray-500 text-center">
                          외 {failedItems.length - 5}개 더...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptGenerator; 