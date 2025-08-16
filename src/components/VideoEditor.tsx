import React, { useState, useEffect, useRef } from 'react';
import { Download, RotateCcw, Eye, Settings, ChevronDown, ChevronUp, FileDown, FolderDown } from 'lucide-react';
import { Script } from '../types/index';
import BulkVideoDownloader from './BulkVideoDownloader';
import FolderPicker from './FolderPicker';

interface VideoEditorProps {
  scripts: Script[];
  onSaveState?: (state: any) => void;
  getSavedState?: () => any;
}

interface SceneSettings {
  scriptId: string;
  effects: VideoEffect[];
  transition?: Transition;
  startTime: number;
  duration: number;
  volume: number; // 0-100
  brightness: number; // 0-200 (100이 기본)
  contrast: number; // 0-200 (100이 기본)
  saturation: number; // 0-200 (100이 기본)
  visualEffects?: {
    fadeIn: { enabled: boolean; duration: number; };
    fadeOut: { enabled: boolean; duration: number; };
    zoomIn: { enabled: boolean; intensity: number; duration: number; };
    zoomOut: { enabled: boolean; intensity: number; duration: number; };
    blur: { enabled: boolean; intensity: number; };
    sharpen: { enabled: boolean; intensity: number; };
    vintage: { enabled: boolean; intensity: number; };
    blackWhite: { enabled: boolean; intensity: number; };
    sepia: { enabled: boolean; intensity: number; };
    rotation: { enabled: boolean; angle: number; };
  };
  subtitles: {
    enabled: boolean;
    fontFamily: 'AppleSDGothicNeo' | 'Arial' | 'Helvetica' | 'TimesNewRoman' | 'Courier';
    fontSize: number; // 24-48
    fontColor: 'white' | 'yellow' | 'red' | 'blue' | 'green' | 'orange' | 'purple'; // 색상 옵션
    position: 'bottom' | 'center' | 'top';
    hasBackground: boolean;
    backgroundColor: 'black' | 'white' | 'red' | 'blue' | 'green' | 'yellow' | 'transparent';
    backgroundOpacity: number; // 0-100
  };
}

interface VideoEffect {
  id: string;
  type: 'blur' | 'sharpen' | 'glow' | 'vintage' | 'noir' | 'warm';
  intensity: number; // 0-100
  duration: number; // 초
}

interface Transition {
  id: string;
  type: 'fade' | 'slide' | 'dissolve' | 'wipe' | 'zoom';
  duration: number; // 초
}

const VideoEditor: React.FC<VideoEditorProps> = ({ scripts, onSaveState, getSavedState }) => {
  const [sceneSettings, setSceneSettings] = useState<SceneSettings[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [scene1PreviewVideo, setScene1PreviewVideo] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'full' | 'scene1'>('scene1');

  
  // 다운로드 모달 관련 상태
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState({
    videosOnly: false,
    videosWithSubtitles: false,
    ttsUnified: false,
    srtUnified: false,
    srtStoryChannel: false
  });
  const [modalSrtPreviewContent, setModalSrtPreviewContent] = useState<string>('');
  const [modalStoryChannelSrtContent, setModalStoryChannelSrtContent] = useState<string>('');
  const [showModalSrtPreview, setShowModalSrtPreview] = useState(false);
  const [showModalStoryChannelSrtPreview, setShowModalStoryChannelSrtPreview] = useState(false);
  const [showBulkDownloader, setShowBulkDownloader] = useState(false);
  
  // 폴더 선택 관련 상태
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);
  const [pendingDownloadAction, setPendingDownloadAction] = useState<() => void>(() => {});
  const videoRef = useRef<HTMLVideoElement>(null);

  // 전역 설정 상태
  const [globalSettings, setGlobalSettings] = useState({
    // 기본 비디오 효과
    volume: 100,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    // 시각 효과
    visualEffects: {
      fadeIn: {
        enabled: false,
        duration: 1.0
      },
      fadeOut: {
        enabled: false,
        duration: 1.0
      },
      zoomIn: {
        enabled: false,
        intensity: 20,
        duration: 2.0
      },
      zoomOut: {
        enabled: false,
        intensity: 20,
        duration: 2.0
      },
      blur: {
        enabled: false,
        intensity: 5
      },
      sharpen: {
        enabled: false,
        intensity: 50
      },
      vintage: {
        enabled: false,
        intensity: 50
      },
      blackWhite: {
        enabled: false,
        intensity: 100
      },
      sepia: {
        enabled: false,
        intensity: 50
      },
      rotation: {
        enabled: false,
        angle: 0
      }
    },
    // 자막 효과
    subtitles: {
      enabled: true,
      fontFamily: 'AppleSDGothicNeo' as const,
      fontSize: 32,
      fontColor: 'white' as const,
      position: 'bottom' as const,
      hasBackground: true,
      backgroundColor: 'black' as const,
      backgroundOpacity: 50
    }
  });

  // UI 섹션 펼치기/접기 상태 (처음에는 모두 접어둠)
  const [expandedSections, setExpandedSections] = useState({
    videoEffects: false,
    subtitleEffects: false,
    visualEffects: false
  });

  // 생성된 비디오가 있는 스크립트들만 필터링
  const videosWithScripts = scripts.filter(script => script.generatedVideo);
  
  // 디버깅 정보
  console.log('VideoEditor - 전체 scripts:', scripts);
  console.log('VideoEditor - scripts 개수:', scripts.length);
  console.log('VideoEditor - videosWithScripts:', videosWithScripts);
  console.log('VideoEditor - videosWithScripts 개수:', videosWithScripts.length);
  
  // 각 스크립트의 비디오 상태 상세 로그
  scripts.forEach((script, index) => {
    console.log(`VideoEditor - 스크립트 ${index + 1} (ID: ${script.id}):`, {
      text: script.text.substring(0, 50) + '...',
      hasVideo: !!script.generatedVideo,
      videoUrl: script.generatedVideo ? script.generatedVideo.substring(0, 100) + '...' : 'null'
    });
  });

  // scripts props 변경 감지
  useEffect(() => {
    console.log('VideoEditor - scripts props 변경 감지:', {
      scriptsLength: scripts.length,
      videosWithScriptsLength: videosWithScripts.length,
      scripts: scripts.map(s => ({ id: s.id, hasVideo: !!s.generatedVideo }))
    });
  }, [scripts, videosWithScripts.length]);

  // 초기 씬 설정 생성
  useEffect(() => {
    if (videosWithScripts.length > 0 && sceneSettings.length === 0) {
      const initialSettings: SceneSettings[] = videosWithScripts.map((script, index) => ({
        scriptId: script.id,
        effects: [],
        transition: index < videosWithScripts.length - 1 ? {
          id: `transition-${script.id}`,
          type: 'fade' as const,
          duration: 0.5
        } : undefined,
        startTime: index * 5, // 기본 5초씩 배치
        duration: 5,
        volume: 100,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        visualEffects: globalSettings.visualEffects,
        subtitles: {
          enabled: true,
          fontFamily: 'AppleSDGothicNeo' as const,
          fontSize: 32,
          fontColor: 'white' as const,
          position: 'bottom' as const,
          hasBackground: true,
          backgroundColor: 'black' as const,
          backgroundOpacity: 50
        }
      }));
      setSceneSettings(initialSettings);
    }
  }, [videosWithScripts, sceneSettings.length, globalSettings.visualEffects]);

  // 전역 설정 업데이트
  const updateGlobalSettings = (updates: Partial<typeof globalSettings>) => {
    console.log('전역 설정 업데이트:', updates);
    setGlobalSettings(prev => ({
      ...prev,
      ...updates
    }));
  };

  // 시각 효과 업데이트
  const updateVisualEffect = (effectName: string, updates: any) => {
    console.log(`시각 효과 ${effectName} 업데이트:`, updates);
    setGlobalSettings(prev => ({
      ...prev,
      visualEffects: {
        ...prev.visualEffects,
        [effectName]: {
          ...prev.visualEffects[effectName as keyof typeof prev.visualEffects],
          ...updates
        }
      }
    }));
  };

  // 섹션 펼치기/접기 토글
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 전체 씬에 전역 설정 적용
  const applyGlobalSettingsToAllScenes = () => {
    const confirmed = window.confirm('현재 전역 설정을 모든 씬에 적용하시겠습니까?\n(기존 설정은 모두 덮어쓰여집니다)');
    if (!confirmed) return;
    
         const newSettings: SceneSettings[] = videosWithScripts.map((script, index) => ({
       scriptId: script.id,
       effects: [],
       transition: index < videosWithScripts.length - 1 ? {
         id: `transition-${script.id}`,
         type: 'fade' as const,
         duration: 0.5
       } : undefined,
       startTime: index * 5,
       duration: 5,
       volume: globalSettings.volume,
       brightness: globalSettings.brightness,
       contrast: globalSettings.contrast,
       saturation: globalSettings.saturation,
       visualEffects: globalSettings.visualEffects,
       subtitles: globalSettings.subtitles
     }));
    
    setSceneSettings(newSettings);
    console.log('전역 설정을 모든 씬에 적용 완료:', globalSettings);
    alert('전역 설정이 모든 씬에 적용되었습니다!');
  };

  // 씬1 미리보기 생성 (전역 설정 적용)
  const generateScene1Preview = async () => {
    if (videosWithScripts.length === 0) return;
    
    setIsGenerating(true);
    try {
      const firstScript = videosWithScripts[0];
      
      // 첫 번째 씬에 전역 설정을 적용한 임시 설정 생성
             const tempSceneSettings: SceneSettings = {
         scriptId: firstScript.id,
         effects: [],
         transition: undefined,
         startTime: 0,
         duration: 5,
         volume: globalSettings.volume,
         brightness: globalSettings.brightness,
         contrast: globalSettings.contrast,
         saturation: globalSettings.saturation,
         visualEffects: globalSettings.visualEffects,
         subtitles: globalSettings.subtitles
       };

      console.log('씬1 미리보기 생성 - 적용할 설정:', tempSceneSettings);

      // 백엔드에 씬1만 처리하도록 요청
      const response = await fetch('/api/generate-final-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenes: [tempSceneSettings],
          scripts: [firstScript]
        })
      });

      if (!response.ok) {
        throw new Error('씬1 미리보기 생성에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setScene1PreviewVideo(data.video);
        setPreviewMode('scene1');
        setPreviewVideo(null);
        alert('씬1 미리보기 생성 완료!');
      } else {
        throw new Error(data.error || '씬1 미리보기 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('씬1 미리보기 생성 오류:', error);
      alert('씬1 미리보기 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 전체 미리보기 비디오 생성 (모든 씬 연결)
  const generatePreview = async () => {
    setIsGenerating(true);
    try {
      console.log('전체 미리보기 생성 시작:', {
        scenesCount: videosWithScripts.length,
        sceneSettings: sceneSettings
      });

      // 씬 설정 상세 로그
      sceneSettings.forEach((setting, index) => {
        console.log(`씬 ${index + 1} 설정:`, {
          scriptId: setting.scriptId,
          volume: setting.volume,
          brightness: setting.brightness,
          contrast: setting.contrast,
          saturation: setting.saturation,
          subtitles: setting.subtitles
        });
      });

      // 백엔드에 모든 씬을 연결한 최종 비디오 생성 요청
      const response = await fetch('/api/generate-final-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenes: sceneSettings,
          scripts: videosWithScripts
        })
      });

      if (!response.ok) {
        throw new Error('전체 미리보기 생성에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setPreviewVideo(data.video);
        setPreviewMode('full');
        setScene1PreviewVideo(null);
        alert('전체 미리보기 생성 완료!');
      } else {
        throw new Error(data.error || '전체 미리보기 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('전체 미리보기 생성 오류:', error);
      alert('전체 미리보기 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 최종 비디오 내보내기
  const exportFinalVideo = async () => {
    setIsGenerating(true);
    try {
      // 백엔드로 편집 설정 전송하여 최종 비디오 생성
      const exportData = {
        scenes: sceneSettings,
        scripts: videosWithScripts
      };
      
      console.log('비디오 내보내기 데이터:', exportData);
      
      // 실제 구현에서는 백엔드 API 호출
      await new Promise(resolve => setTimeout(resolve, 5000)); // 임시 딜레이
      
      alert('최종 비디오 내보내기 완료! (임시 구현)');
    } catch (error) {
      console.error('비디오 내보내기 오류:', error);
      alert('비디오 내보내기에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 오디오 길이를 가져오는 함수
  const getAudioDuration = (audioUrl: string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        resolve(5); // 오류 시 기본 5초
      });
    });
  };

  // 통합 SRT 파일 생성 함수 (비동기)
  const generateUnifiedSRT = async () => {
    // 비디오와 오디오(TTS)가 모두 있는 스크립트들만 필터링
    const scriptsWithVideoAndAudio = scripts.filter(script => 
      script.generatedVideo && script.generatedAudio
    );
    
    if (scriptsWithVideoAndAudio.length === 0) {
      return '통합 자막을 생성하려면 비디오와 TTS가 모두 필요합니다.';
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
    for (const script of scriptsWithVideoAndAudio) {
      try {
        // 실제 TTS 오디오 길이 가져오기
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
        // 오류 시 씬 설정의 지속 시간 또는 기본 5초 사용
        const sceneSettingForScript = sceneSettings.find(setting => setting.scriptId === script.id);
        const duration = sceneSettingForScript?.duration || 5;
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
      if (!srtContent || srtContent.includes('비디오와 TTS가 모두 필요합니다')) {
        alert('통합 자막을 생성하려면 비디오와 TTS가 모두 필요합니다.');
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

  // 폴더 선택 후 다운로드 실행
  const handleFolderSelected = (path: string, handle?: any) => {
    setSelectedPath(path);
    setDirectoryHandle(handle);
    setShowFolderPicker(false);
    
    // 보류 중인 다운로드 실행
    if (pendingDownloadAction) {
      pendingDownloadAction();
    }
  };

  // 폴더 선택을 요구하는 다운로드 시작
  const executeSelectedDownloads = async () => {
    const hasSelectedOptions = Object.values(downloadOptions).some(option => option);
    
    if (!hasSelectedOptions) {
      alert('다운로드할 항목을 선택해주세요.');
      return;
    }

    // 폴더 선택을 위한 함수 설정
    setPendingDownloadAction(() => performDownloads);
    setShowFolderPicker(true);
  };

  // 실제 다운로드 수행
  const performDownloads = async () => {
    let downloadCount = 0;
    
    try {
      if (downloadOptions.videosOnly && videosWithScripts.length > 0) {
        await downloadAllVideosOnly();
        downloadCount++;
      }
      
      if (downloadOptions.videosWithSubtitles && videosWithScripts.length > 0) {
        await downloadAllVideosAndSubtitles();
        downloadCount++;
      }
      
      if (downloadOptions.ttsUnified && scripts.filter(s => s.generatedAudio).length > 0) {
        await downloadUnifiedTTS();
        downloadCount++;
      }
      
      if (downloadOptions.srtUnified && scripts.filter(s => s.generatedVideo && s.generatedAudio).length > 0) {
        await downloadUnifiedSRT();
        downloadCount++;
      }
      
      if (downloadOptions.srtStoryChannel && scripts.filter(s => s.generatedVideo && s.generatedAudio).length > 0) {
        await downloadStoryChannelSRT();
        downloadCount++;
      }
      
      if (downloadCount > 0) {
        setShowDownloadModal(false);
        alert(`${downloadCount}개 항목이 다운로드되었습니다!`);
        // 옵션 초기화
        setDownloadOptions({
          videosOnly: false,
          videosWithSubtitles: false,
          ttsUnified: false,
          srtUnified: false,
          srtStoryChannel: false
        });
      }
    } catch (error) {
      console.error('일괄 다운로드 오류:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  // 썰채널용 텍스트 분할 함수 (3-4단어씩 강제 분할)
  const splitTextIntoSentences = (text: string): string[] => {
    console.log('VideoEditor 원본 텍스트:', text); // 디버깅용
    
    // 먼저 구두점으로 기본 분할
    let sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) {
      sentences = [text]; // 구두점이 없으면 전체 텍스트 사용
    }
    
    const result: string[] = [];
    
    for (const sentence of sentences) {
      // 각 문장을 단어로 분할
      const words = sentence.trim().split(/\s+/).filter(w => w.length > 0);
      console.log('VideoEditor 단어 배열:', words); // 디버깅용
      
      // 3-4단어씩 묶어서 자막 생성
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(' ').trim();
        if (chunk.length > 0) {
          result.push(chunk);
          console.log('VideoEditor 분할된 조각:', chunk); // 디버깅용
        }
      }
    }
    
    console.log('VideoEditor 최종 결과:', result); // 디버깅용
    return result.length > 0 ? result : [text];
  };

  // 썰채널용 통합 SRT 파일 생성 함수
  const generateStoryChannelSRT = async () => {
    const scriptsWithVideoAndAudio = scripts.filter(script => 
      script.generatedVideo && script.generatedAudio
    );
    
    if (scriptsWithVideoAndAudio.length === 0) {
      return '썰채널용 자막을 생성하려면 비디오와 TTS가 모두 필요합니다.';
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
    for (const script of scriptsWithVideoAndAudio) {
      try {
        // 실제 TTS 오디오 길이 가져오기
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
        // 오류 시 씬 설정의 지속 시간 또는 기본 5초 사용
        const sceneSettingForScript = sceneSettings.find(setting => setting.scriptId === script.id);
        const duration = sceneSettingForScript?.duration || 5;
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
      if (!srtContent || srtContent.includes('비디오와 TTS가 모두 필요합니다')) {
        alert('썰채널용 자막을 생성하려면 비디오와 TTS가 모두 필요합니다.');
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

  // 비디오만 일괄 다운로드 함수
  const downloadAllVideosOnly = async () => {
    if (videosWithScripts.length === 0) {
      alert('다운로드할 비디오가 없습니다.');
      return;
    }

    try {
      let downloadCount = 0;

      for (const script of videosWithScripts) {
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
      console.log(`VideoEditor TTS 통합 시작: ${scriptsWithTTS.length}개 파일`);
      
      // AudioContext 생성 (사용자 인터랙션 후이므로 안전)
      let audioContext;
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('VideoEditor AudioContext 생성 성공');
      } catch (err) {
        console.error('VideoEditor AudioContext 생성 실패:', err);
        alert('오디오 컨텍스트 생성에 실패했습니다. 브라우저가 Web Audio API를 지원하지 않을 수 있습니다.');
        return;
      }

      const audioBuffers: AudioBuffer[] = [];
      
      // 모든 TTS 파일을 순차적으로 로드
      let loadCount = 0;
      for (const script of scriptsWithTTS) {
        if (script.generatedAudio) {
          try {
            console.log(`VideoEditor TTS 파일 ${loadCount + 1}/${scriptsWithTTS.length} 로딩 중...`);
            
            const response = await fetch(script.generatedAudio);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            console.log(`VideoEditor ArrayBuffer 크기: ${arrayBuffer.byteLength} bytes`);
            
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            console.log(`VideoEditor AudioBuffer 생성: ${audioBuffer.duration}초, ${audioBuffer.sampleRate}Hz`);
            
            audioBuffers.push(audioBuffer);
            loadCount++;
          } catch (err) {
            console.error(`VideoEditor 스크립트 ${script.id} TTS 로드 실패:`, err);
            alert(`스크립트 ${script.id}의 TTS 파일 로드에 실패했습니다: ${err}`);
            return;
          }
        }
      }
      
      if (audioBuffers.length === 0) {
        alert('유효한 TTS 파일이 없습니다.');
        return;
      }
      
      console.log(`VideoEditor 모든 TTS 파일 로드 완료: ${audioBuffers.length}개`);
      
      // 총 길이 계산
      const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
      const sampleRate = audioBuffers[0].sampleRate;
      const numberOfChannels = audioBuffers[0].numberOfChannels;
      
      console.log(`VideoEditor 통합 버퍼 생성: ${totalLength} 샘플, ${sampleRate}Hz, ${numberOfChannels} 채널`);
      console.log(`VideoEditor 예상 파일 크기: ${(totalLength * numberOfChannels * 2 / 1024 / 1024).toFixed(2)}MB`);
      
             // 메모리 체크
       if (totalLength > 100000000) { // 약 37분 이상의 오디오
         const proceed = window.confirm('통합될 오디오가 매우 깁니다. 계속하시겠습니까? (메모리 부족이 발생할 수 있습니다)');
         if (!proceed) return;
       }
      
      // 통합 AudioBuffer 생성
      let mergedBuffer;
      try {
        mergedBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);
        console.log('VideoEditor 통합 AudioBuffer 생성 성공');
      } catch (err) {
        console.error('VideoEditor AudioBuffer 생성 실패:', err);
        alert('통합 오디오 버퍼 생성에 실패했습니다. 파일이 너무 클 수 있습니다.');
        return;
      }
      
      // 오디오 데이터 복사
      let offset = 0;
      for (let bufferIndex = 0; bufferIndex < audioBuffers.length; bufferIndex++) {
        const buffer = audioBuffers[bufferIndex];
        console.log(`VideoEditor 버퍼 ${bufferIndex + 1} 복사 중... (오프셋: ${offset})`);
        
        try {
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const channelData = mergedBuffer.getChannelData(channel);
            const sourceData = buffer.getChannelData(channel);
            channelData.set(sourceData, offset);
          }
          offset += buffer.length;
        } catch (err) {
          console.error(`VideoEditor 버퍼 ${bufferIndex + 1} 복사 실패:`, err);
          alert(`오디오 데이터 복사 중 오류가 발생했습니다: ${err}`);
          return;
        }
      }
      
      console.log('VideoEditor 모든 오디오 데이터 복사 완료');
      
      // WAV 파일로 변환
      console.log('VideoEditor WAV 변환 시작...');
      let wavBlob;
      try {
        wavBlob = audioBufferToWav(mergedBuffer);
        console.log(`VideoEditor WAV 변환 완료: ${(wavBlob.size / 1024 / 1024).toFixed(2)}MB`);
      } catch (err) {
        console.error('VideoEditor WAV 변환 실패:', err);
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
        
        console.log('VideoEditor 다운로드 완료');
        alert(`총 ${scriptsWithTTS.length}개의 TTS가 통합되어 다운로드되었습니다!`);
      } catch (err) {
        console.error('VideoEditor 다운로드 실패:', err);
        alert(`파일 다운로드 중 오류가 발생했습니다: ${err}`);
      }
      
    } catch (error) {
      console.error('VideoEditor TTS 통합 다운로드 전체 오류:', error);
      alert(`TTS 통합 다운로드 중 오류가 발생했습니다: ${error}`);
    }
  };



  // 개별 SRT 파일들 다운로드 함수 (기존 방식)
  const downloadIndividualSRTs = () => {
    if (videosWithScripts.length === 0) {
      alert('생성된 비디오가 없습니다.');
      return;
    }

    videosWithScripts.forEach((script, index) => {
      const srtContent = `1\n00:00:00,000 --> 00:00:05,000\n${script.text}\n\n`;
      
      const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `subtitle_scene_${index + 1}.srt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    alert(`${videosWithScripts.length}개의 개별 자막 파일이 다운로드되었습니다!`);
  };

  // 비디오와 자막 일괄 다운로드 함수
  const downloadAllVideosAndSubtitles = async () => {
    if (videosWithScripts.length === 0) {
      alert('다운로드할 비디오가 없습니다.');
      return;
    }

    const choice = window.confirm(
      '자막 파일을 어떻게 다운로드하시겠습니까?\n\n' +
      'OK: 통합된 하나의 SRT 파일\n' +
      'Cancel: 스크립트별 개별 SRT 파일들'
    );

    try {
      // 비디오 파일들 다운로드
      for (let i = 0; i < videosWithScripts.length; i++) {
        const script = videosWithScripts[i];
        if (script.generatedVideo) {
          const link = document.createElement('a');
          link.href = script.generatedVideo;
          link.download = `video_scene_${i + 1}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // 다운로드 간격 (브라우저 제한 방지)
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 자막 파일 다운로드
      if (choice) {
        // 통합 SRT 파일 다운로드
        downloadUnifiedSRT();
      } else {
        // 개별 SRT 파일들 다운로드
        await new Promise(resolve => setTimeout(resolve, 1000));
        downloadIndividualSRTs();
      }

      alert(`비디오 다운로드 완료!\n- 비디오: ${videosWithScripts.length}개\n- 자막: ${choice ? '통합 1개 파일' : videosWithScripts.length + '개 개별 파일'}`);
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">🎬 비디오 편집</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">전역 설정으로 모든 씬의 효과와 자막을 일괄 편집하세요</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RotateCcw size={16} />
              새로고침
            </button>
            <button
              onClick={downloadUnifiedSRT}
              disabled={videosWithScripts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              title="모든 스크립트가 합쳐진 통합 SRT 파일을 다운로드합니다"
            >
              <FileDown size={16} />
              통합 자막(SRT)
            </button>
            
            <button
              onClick={downloadStoryChannelSRT}
              disabled={scripts.filter(s => s.generatedVideo && s.generatedAudio).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              title="문장 단위로 세분화된 썰채널용 SRT 파일을 다운로드합니다"
            >
              <FileDown size={16} />
              썰채널용 자막
            </button>
            
            <button
              onClick={() => setShowDownloadModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <Download size={20} />
              다운로드
            </button>

            <button
              onClick={() => setShowBulkDownloader(true)}
              disabled={videosWithScripts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <FolderDown size={16} />
              비디오 일괄다운로드 ({videosWithScripts.length}개)
            </button>
            <button
              onClick={generateScene1Preview}
              disabled={isGenerating || videosWithScripts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              title="씬1에 현재 설정을 적용한 미리보기를 생성합니다"
            >
              <Eye size={16} />
              {isGenerating ? '생성 중...' : '씬1 미리보기'}
            </button>
            <button
              onClick={generatePreview}
              disabled={isGenerating || videosWithScripts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              title="모든 씬을 연결한 전체 미리보기를 생성합니다"
            >
              <Eye size={16} />
              {isGenerating ? '생성 중...' : '전체 미리보기'}
            </button>
            <button
              onClick={exportFinalVideo}
              disabled={isGenerating || videosWithScripts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Download size={16} />
              {isGenerating ? '내보내는 중...' : '최종 비디오 내보내기'}
            </button>
          </div>
        </div>

        {videosWithScripts.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="mb-4">편집할 비디오가 없습니다. 먼저 프롬프트 생성 탭에서 비디오를 생성해주세요.</div>
            <div className="text-sm space-y-2">
              <div>디버깅 정보:</div>
              <div>• 전체 스크립트 개수: {scripts.length}개</div>
              <div>• 비디오가 있는 스크립트: {videosWithScripts.length}개</div>
              {scripts.length > 0 && (
                <div className="text-left max-w-md mx-auto space-y-1">
                  {scripts.map((script, index) => (
                    <div key={script.id} className="text-xs">
                      • 스크립트 {index + 1}: {script.generatedVideo ? '비디오 있음 ✅' : '비디오 없음 ❌'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 다운로드 안내 */}
        {videosWithScripts.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📥 다운로드 옵션</h4>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <div>• <strong>통합 자막(SRT)</strong>: 모든 스크립트가 연속된 시간축으로 합쳐진 하나의 SRT 파일</div>
              <div>• <strong>비디오+자막 일괄 다운로드</strong>: 모든 비디오 파일 + 자막 파일을 한번에 다운로드</div>
              <div className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                💡 일괄 다운로드 시 통합 SRT vs 개별 SRT 파일 선택 가능
              </div>
            </div>
          </div>
        )}
      </div>

      {videosWithScripts.length > 0 && (
        <>
          {/* 미리보기 영역 */}
          {(previewVideo || scene1PreviewVideo) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  📺 {previewMode === 'full' ? '전체 미리보기' : '씬1 미리보기'}
                </h3>
                <div className="flex gap-2">
                  {scene1PreviewVideo && previewMode === 'scene1' && (
                    <button
                      onClick={() => {
                        setScene1PreviewVideo(null);
                        setPreviewMode('full');
                      }}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      씬1 미리보기 닫기
                    </button>
                  )}
                  {previewVideo && previewMode === 'full' && (
                    <button
                      onClick={() => {
                        setPreviewVideo(null);
                        setPreviewMode('scene1');
                      }}
                      className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                      전체 미리보기 닫기
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-center">
                <video
                  ref={videoRef}
                  src={previewMode === 'scene1' ? scene1PreviewVideo! : previewVideo!}
                  controls
                  className="max-w-full max-h-96 rounded-lg shadow-lg"
                  key={previewMode === 'scene1' ? scene1PreviewVideo : previewVideo}
                >
                  미리보기를 지원하지 않는 브라우저입니다.
                </video>
              </div>
              {previewMode === 'scene1' && (
                <div className="mt-3 text-center text-sm text-gray-600 dark:text-gray-400">
                  현재 전역 설정이 씬1에 적용된 미리보기입니다.
                </div>
              )}
            </div>
          )}

                     {/* 전역 설정 패널 */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             {/* 기본 비디오 효과 설정 */}
             <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
               <button
                 onClick={() => toggleSection('videoEffects')}
                 className="flex items-center justify-between w-full mb-4"
               >
                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white">🎛️ 기본 효과</h3>
                 {expandedSections.videoEffects ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
               </button>
              
              {expandedSections.videoEffects && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">볼륨</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={globalSettings.volume}
                      onChange={(e) => updateGlobalSettings({ volume: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400">{globalSettings.volume}%</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">밝기</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={globalSettings.brightness}
                      onChange={(e) => updateGlobalSettings({ brightness: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400">{globalSettings.brightness}%</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">대비</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={globalSettings.contrast}
                      onChange={(e) => updateGlobalSettings({ contrast: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400">{globalSettings.contrast}%</div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">채도</label>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={globalSettings.saturation}
                      onChange={(e) => updateGlobalSettings({ saturation: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="text-center text-xs text-gray-500 dark:text-gray-400">{globalSettings.saturation}%</div>
                  </div>
                </div>
                             )}
             </div>

             {/* 시각 효과 설정 */}
             <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
               <button
                 onClick={() => toggleSection('visualEffects')}
                 className="flex items-center justify-between w-full mb-4"
               >
                 <h3 className="text-lg font-semibold text-gray-900 dark:text-white">✨ 시각 효과</h3>
                 {expandedSections.visualEffects ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
               </button>
               
               {expandedSections.visualEffects && (
                 <div className="space-y-4">
                   {/* 페이드 효과 */}
                   <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                     <h4 className="font-medium text-gray-900 dark:text-white mb-3">페이드 효과</h4>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-sm text-gray-700 dark:text-gray-300">페이드 인</label>
                           <button
                             onClick={() => updateVisualEffect('fadeIn', { 
                               enabled: !globalSettings.visualEffects.fadeIn.enabled 
                             })}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                               globalSettings.visualEffects.fadeIn.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 globalSettings.visualEffects.fadeIn.enabled ? 'translate-x-5' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {globalSettings.visualEffects.fadeIn.enabled && (
                           <input
                             type="range"
                             min="0.1"
                             max="3"
                             step="0.1"
                             value={globalSettings.visualEffects.fadeIn.duration}
                             onChange={(e) => updateVisualEffect('fadeIn', { duration: parseFloat(e.target.value) })}
                             className="w-full"
                           />
                         )}
                         <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                           {globalSettings.visualEffects.fadeIn.duration}초
                         </div>
                       </div>
                       
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-sm text-gray-700 dark:text-gray-300">페이드 아웃</label>
                           <button
                             onClick={() => updateVisualEffect('fadeOut', { 
                               enabled: !globalSettings.visualEffects.fadeOut.enabled 
                             })}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                               globalSettings.visualEffects.fadeOut.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 globalSettings.visualEffects.fadeOut.enabled ? 'translate-x-5' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {globalSettings.visualEffects.fadeOut.enabled && (
                           <input
                             type="range"
                             min="0.1"
                             max="3"
                             step="0.1"
                             value={globalSettings.visualEffects.fadeOut.duration}
                             onChange={(e) => updateVisualEffect('fadeOut', { duration: parseFloat(e.target.value) })}
                             className="w-full"
                           />
                         )}
                         <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                           {globalSettings.visualEffects.fadeOut.duration}초
                         </div>
                       </div>
                     </div>
                   </div>

                   {/* 줌 효과 */}
                   <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                     <h4 className="font-medium text-gray-900 dark:text-white mb-3">줌 효과</h4>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-sm text-gray-700 dark:text-gray-300">줌 인</label>
                           <button
                             onClick={() => updateVisualEffect('zoomIn', { 
                               enabled: !globalSettings.visualEffects.zoomIn.enabled 
                             })}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                               globalSettings.visualEffects.zoomIn.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 globalSettings.visualEffects.zoomIn.enabled ? 'translate-x-5' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {globalSettings.visualEffects.zoomIn.enabled && (
                           <>
                             <label className="text-xs text-gray-600 dark:text-gray-400">강도: {globalSettings.visualEffects.zoomIn.intensity}%</label>
                             <input
                               type="range"
                               min="5"
                               max="50"
                               value={globalSettings.visualEffects.zoomIn.intensity}
                               onChange={(e) => updateVisualEffect('zoomIn', { intensity: parseInt(e.target.value) })}
                               className="w-full mb-2"
                             />
                             <label className="text-xs text-gray-600 dark:text-gray-400">시간: {globalSettings.visualEffects.zoomIn.duration}초</label>
                             <input
                               type="range"
                               min="0.5"
                               max="5"
                               step="0.1"
                               value={globalSettings.visualEffects.zoomIn.duration}
                               onChange={(e) => updateVisualEffect('zoomIn', { duration: parseFloat(e.target.value) })}
                               className="w-full"
                             />
                           </>
                         )}
                       </div>
                       
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-sm text-gray-700 dark:text-gray-300">줌 아웃</label>
                           <button
                             onClick={() => updateVisualEffect('zoomOut', { 
                               enabled: !globalSettings.visualEffects.zoomOut.enabled 
                             })}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                               globalSettings.visualEffects.zoomOut.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 globalSettings.visualEffects.zoomOut.enabled ? 'translate-x-5' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {globalSettings.visualEffects.zoomOut.enabled && (
                           <>
                             <label className="text-xs text-gray-600 dark:text-gray-400">강도: {globalSettings.visualEffects.zoomOut.intensity}%</label>
                             <input
                               type="range"
                               min="5"
                               max="50"
                               value={globalSettings.visualEffects.zoomOut.intensity}
                               onChange={(e) => updateVisualEffect('zoomOut', { intensity: parseInt(e.target.value) })}
                               className="w-full mb-2"
                             />
                             <label className="text-xs text-gray-600 dark:text-gray-400">시간: {globalSettings.visualEffects.zoomOut.duration}초</label>
                             <input
                               type="range"
                               min="0.5"
                               max="5"
                               step="0.1"
                               value={globalSettings.visualEffects.zoomOut.duration}
                               onChange={(e) => updateVisualEffect('zoomOut', { duration: parseFloat(e.target.value) })}
                               className="w-full"
                             />
                           </>
                         )}
                       </div>
                     </div>
                   </div>

                   {/* 필터 효과 */}
                   <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                     <h4 className="font-medium text-gray-900 dark:text-white mb-3">필터 효과</h4>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-sm text-gray-700 dark:text-gray-300">블러</label>
                           <button
                             onClick={() => updateVisualEffect('blur', { 
                               enabled: !globalSettings.visualEffects.blur.enabled 
                             })}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                               globalSettings.visualEffects.blur.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 globalSettings.visualEffects.blur.enabled ? 'translate-x-5' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {globalSettings.visualEffects.blur.enabled && (
                           <>
                             <label className="text-xs text-gray-600 dark:text-gray-400">강도: {globalSettings.visualEffects.blur.intensity}</label>
                             <input
                               type="range"
                               min="1"
                               max="20"
                               value={globalSettings.visualEffects.blur.intensity}
                               onChange={(e) => updateVisualEffect('blur', { intensity: parseInt(e.target.value) })}
                               className="w-full"
                             />
                           </>
                         )}
                       </div>
                       
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-sm text-gray-700 dark:text-gray-300">샤프닝</label>
                           <button
                             onClick={() => updateVisualEffect('sharpen', { 
                               enabled: !globalSettings.visualEffects.sharpen.enabled 
                             })}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                               globalSettings.visualEffects.sharpen.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 globalSettings.visualEffects.sharpen.enabled ? 'translate-x-5' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {globalSettings.visualEffects.sharpen.enabled && (
                           <>
                             <label className="text-xs text-gray-600 dark:text-gray-400">강도: {globalSettings.visualEffects.sharpen.intensity}%</label>
                             <input
                               type="range"
                               min="10"
                               max="100"
                               value={globalSettings.visualEffects.sharpen.intensity}
                               onChange={(e) => updateVisualEffect('sharpen', { intensity: parseInt(e.target.value) })}
                               className="w-full"
                             />
                           </>
                         )}
                       </div>
                     </div>
                   </div>

                   {/* 스타일 효과 */}
                   <div>
                     <h4 className="font-medium text-gray-900 dark:text-white mb-3">스타일 효과</h4>
                     <div className="grid grid-cols-3 gap-3">
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-sm text-gray-700 dark:text-gray-300">빈티지</label>
                           <button
                             onClick={() => updateVisualEffect('vintage', { 
                               enabled: !globalSettings.visualEffects.vintage.enabled 
                             })}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                               globalSettings.visualEffects.vintage.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 globalSettings.visualEffects.vintage.enabled ? 'translate-x-5' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {globalSettings.visualEffects.vintage.enabled && (
                           <>
                             <label className="text-xs text-gray-600 dark:text-gray-400">{globalSettings.visualEffects.vintage.intensity}%</label>
                             <input
                               type="range"
                               min="10"
                               max="100"
                               value={globalSettings.visualEffects.vintage.intensity}
                               onChange={(e) => updateVisualEffect('vintage', { intensity: parseInt(e.target.value) })}
                               className="w-full"
                             />
                           </>
                         )}
                       </div>
                       
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-sm text-gray-700 dark:text-gray-300">흑백</label>
                           <button
                             onClick={() => updateVisualEffect('blackWhite', { 
                               enabled: !globalSettings.visualEffects.blackWhite.enabled 
                             })}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                               globalSettings.visualEffects.blackWhite.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 globalSettings.visualEffects.blackWhite.enabled ? 'translate-x-5' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {globalSettings.visualEffects.blackWhite.enabled && (
                           <>
                             <label className="text-xs text-gray-600 dark:text-gray-400">{globalSettings.visualEffects.blackWhite.intensity}%</label>
                             <input
                               type="range"
                               min="0"
                               max="100"
                               value={globalSettings.visualEffects.blackWhite.intensity}
                               onChange={(e) => updateVisualEffect('blackWhite', { intensity: parseInt(e.target.value) })}
                               className="w-full"
                             />
                           </>
                         )}
                       </div>
                       
                       <div>
                         <div className="flex items-center justify-between mb-2">
                           <label className="text-sm text-gray-700 dark:text-gray-300">세피아</label>
                           <button
                             onClick={() => updateVisualEffect('sepia', { 
                               enabled: !globalSettings.visualEffects.sepia.enabled 
                             })}
                             className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                               globalSettings.visualEffects.sepia.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                             }`}
                           >
                             <span
                               className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                 globalSettings.visualEffects.sepia.enabled ? 'translate-x-5' : 'translate-x-1'
                               }`}
                             />
                           </button>
                         </div>
                         {globalSettings.visualEffects.sepia.enabled && (
                           <>
                             <label className="text-xs text-gray-600 dark:text-gray-400">{globalSettings.visualEffects.sepia.intensity}%</label>
                             <input
                               type="range"
                               min="10"
                               max="100"
                               value={globalSettings.visualEffects.sepia.intensity}
                               onChange={(e) => updateVisualEffect('sepia', { intensity: parseInt(e.target.value) })}
                               className="w-full"
                             />
                           </>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
               )}
             </div>

             {/* 자막 효과 설정 */}
             <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => toggleSection('subtitleEffects')}
                className="flex items-center justify-between w-full mb-4"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">📝 자막 효과</h3>
                {expandedSections.subtitleEffects ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              
              {expandedSections.subtitleEffects && (
                <div className="space-y-4">
                  {/* 자막 켜기/끄기 */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      자막 표시
                    </label>
                    <button
                      onClick={() => updateGlobalSettings({ 
                        subtitles: { ...globalSettings.subtitles, enabled: !globalSettings.subtitles.enabled }
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        globalSettings.subtitles.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          globalSettings.subtitles.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                                     {globalSettings.subtitles.enabled && (
                     <>
                       {/* 폰트 선택 */}
                       <div>
                         <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                           폰트
                         </label>
                         <select
                           value={globalSettings.subtitles.fontFamily}
                           onChange={(e) => updateGlobalSettings({ 
                             subtitles: { ...globalSettings.subtitles, fontFamily: e.target.value as any }
                           })}
                           className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                         >
                           <option value="AppleSDGothicNeo">Apple SD Gothic Neo</option>
                           <option value="Arial">Arial</option>
                           <option value="Helvetica">Helvetica</option>
                           <option value="TimesNewRoman">Times New Roman</option>
                           <option value="Courier">Courier</option>
                         </select>
                       </div>

                       {/* 폰트 크기 */}
                       <div>
                         <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                           폰트 크기
                         </label>
                         <input
                           type="range"
                           min="24"
                           max="60"
                           value={globalSettings.subtitles.fontSize}
                           onChange={(e) => updateGlobalSettings({ 
                             subtitles: { ...globalSettings.subtitles, fontSize: parseInt(e.target.value) }
                           })}
                           className="w-full"
                         />
                         <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                           {globalSettings.subtitles.fontSize}px
                         </div>
                       </div>
                       
                       {/* 폰트 색상 */}
                       <div>
                         <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                           폰트 색상
                         </label>
                         <div className="flex gap-2 flex-wrap">
                           {['white', 'yellow', 'red', 'blue', 'green', 'orange', 'purple'].map(color => (
                             <button
                               key={color}
                               onClick={() => updateGlobalSettings({ 
                                 subtitles: { ...globalSettings.subtitles, fontColor: color as any }
                               })}
                               className={`w-8 h-8 rounded-full border-2 ${
                                 globalSettings.subtitles.fontColor === color 
                                   ? 'border-gray-900 dark:border-white ring-2 ring-blue-500' 
                                   : 'border-gray-300 dark:border-gray-600'
                               }`}
                               style={{ 
                                 backgroundColor: color === 'white' ? '#ffffff' : color,
                                 border: color === 'white' ? '2px solid #ccc' : undefined
                               }}
                               title={color}
                             />
                           ))}
                         </div>
                       </div>
                       
                       {/* 자막 위치 */}
                       <div>
                         <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                           자막 위치
                         </label>
                         <div className="flex gap-2">
                           {[
                             { value: 'top', label: '상단' },
                             { value: 'center', label: '중앙' },
                             { value: 'bottom', label: '하단' }
                           ].map(pos => (
                             <button
                               key={pos.value}
                               onClick={() => updateGlobalSettings({ 
                                 subtitles: { ...globalSettings.subtitles, position: pos.value as any }
                               })}
                               className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                 globalSettings.subtitles.position === pos.value
                                   ? 'bg-blue-600 text-white border-blue-600'
                                   : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                               }`}
                             >
                               {pos.label}
                             </button>
                           ))}
                         </div>
                       </div>

                       {/* 배경 유무 */}
                       <div className="flex items-center justify-between">
                         <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                           배경 표시
                         </label>
                         <button
                           onClick={() => updateGlobalSettings({ 
                             subtitles: { ...globalSettings.subtitles, hasBackground: !globalSettings.subtitles.hasBackground }
                           })}
                           className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                             globalSettings.subtitles.hasBackground ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                           }`}
                         >
                           <span
                             className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                               globalSettings.subtitles.hasBackground ? 'translate-x-6' : 'translate-x-1'
                             }`}
                           />
                         </button>
                       </div>

                       {/* 배경 색상 (배경이 활성화된 경우만) */}
                       {globalSettings.subtitles.hasBackground && (
                         <div>
                           <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                             배경 색상
                           </label>
                           <div className="flex gap-2 flex-wrap">
                             {['black', 'white', 'red', 'blue', 'green', 'yellow', 'transparent'].map(color => (
                               <button
                                 key={color}
                                 onClick={() => updateGlobalSettings({ 
                                   subtitles: { ...globalSettings.subtitles, backgroundColor: color as any }
                                 })}
                                 className={`w-8 h-8 rounded-full border-2 ${
                                   globalSettings.subtitles.backgroundColor === color 
                                     ? 'border-gray-900 dark:border-white ring-2 ring-blue-500' 
                                     : 'border-gray-300 dark:border-gray-600'
                                 }`}
                                 style={{ 
                                   backgroundColor: color === 'transparent' ? 'transparent' : (color === 'white' ? '#ffffff' : color),
                                   border: color === 'white' ? '2px solid #ccc' : undefined,
                                   backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : undefined,
                                   backgroundSize: color === 'transparent' ? '10px 10px' : undefined,
                                   backgroundPosition: color === 'transparent' ? '0 0, 0 5px, 5px -5px, -5px 0px' : undefined
                                 }}
                                 title={color === 'transparent' ? '투명' : color}
                               />
                             ))}
                           </div>
                         </div>
                       )}
                       
                                               {/* 배경 투명도 (배경이 활성화된 경우만) */}
                        {globalSettings.subtitles.hasBackground && (
                         <div>
                           <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                             배경 투명도
                           </label>
                           <input
                             type="range"
                             min="0"
                             max="100"
                             value={globalSettings.subtitles.backgroundOpacity}
                             onChange={(e) => updateGlobalSettings({ 
                               subtitles: { ...globalSettings.subtitles, backgroundOpacity: parseInt(e.target.value) }
                             })}
                             className="w-full"
                           />
                           <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                             {globalSettings.subtitles.backgroundOpacity}%
                           </div>
                         </div>
                       )}
                     </>
                   )}
                </div>
              )}
            </div>
          </div>

          {/* 전체 적용 버튼 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <button
                onClick={applyGlobalSettingsToAllScenes}
                disabled={videosWithScripts.length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors mx-auto"
              >
                <Settings size={20} />
                현재 설정을 모든 씬에 적용
              </button>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                 위에서 설정한 기본 효과, 시각 효과, 자막 효과가 모든 씬에 적용됩니다.
               </p>
            </div>
          </div>



          {/* 씬 목록 (읽기 전용) */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🎞️ 씬 목록</h3>
            <div className="space-y-3">
              {videosWithScripts.map((script, index) => {
                const sceneSettingForScript = sceneSettings.find(setting => setting.scriptId === script.id);
                const duration = sceneSettingForScript?.duration || 5;
                const startTime = sceneSettings.slice(0, index).reduce((total, setting) => total + (setting.duration || 5), 0);
                
                return (
                  <div
                    key={script.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">씬 {index + 1}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md">
                            {script.text.substring(0, 50)}...
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {Math.floor(startTime / 60)}:{(startTime % 60).toString().padStart(2, '0')} - {Math.floor((startTime + duration) / 60)}:{((startTime + duration) % 60).toString().padStart(2, '0')} ({duration}초)
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        비디오 준비됨 ✅
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* 다운로드 모달 */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowDownloadModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
              {/* 비디오 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">🎬 비디오</h3>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={downloadOptions.videosOnly}
                    onChange={() => toggleDownloadOption('videosOnly')}
                    disabled={videosWithScripts.length === 0}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={`${videosWithScripts.length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    비디오 일괄다운로드 ({videosWithScripts.length}개)
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={downloadOptions.videosWithSubtitles}
                    onChange={() => toggleDownloadOption('videosWithSubtitles')}
                    disabled={videosWithScripts.length === 0}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className={`${videosWithScripts.length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    비디오+자막 일괄다운로드 ({videosWithScripts.length}개)
                  </span>
                </label>
              </div>

              {/* 오디오 섹션 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">🎵 오디오</h3>
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
              </div>

              {/* 자막 섹션 */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2">📄 자막</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-3 flex-1">
                        <input 
                          type="checkbox" 
                          checked={downloadOptions.srtUnified}
                          onChange={() => toggleDownloadOption('srtUnified')}
                          disabled={scripts.filter(s => s.generatedVideo && s.generatedAudio).length === 0}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className={`${scripts.filter(s => s.generatedVideo && s.generatedAudio).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          통합 자막(SRT)
                        </span>
                      </label>
                      <button 
                        onClick={toggleModalSrtPreview}
                        disabled={scripts.filter(s => s.generatedVideo && s.generatedAudio).length === 0}
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
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-3 flex-1">
                        <input 
                          type="checkbox" 
                          checked={downloadOptions.srtStoryChannel}
                          onChange={() => toggleDownloadOption('srtStoryChannel')}
                          disabled={scripts.filter(s => s.generatedVideo && s.generatedAudio).length === 0}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className={`${scripts.filter(s => s.generatedVideo && s.generatedAudio).length === 0 ? 'text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          썰채널용 자막 (문장별 분할)
                        </span>
                      </label>
                      <button 
                        onClick={toggleModalStoryChannelSrtPreview}
                        disabled={scripts.filter(s => s.generatedVideo && s.generatedAudio).length === 0}
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
        scripts={videosWithScripts.map(script => ({
          id: script.id,
          text: script.text,
          generatedVideo: script.generatedVideo
        }))}
        isOpen={showBulkDownloader}
        onClose={() => setShowBulkDownloader(false)}
      />

      {/* 폴더 선택 모달 */}
      {showFolderPicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                저장 경로 선택
              </h3>
              <button
                onClick={() => setShowFolderPicker(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <FolderPicker
              onPathSelected={handleFolderSelected}
              title="다운로드 경로 설정"
              description="선택한 파일들을 저장할 경로를 설정해주세요"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoEditor; 