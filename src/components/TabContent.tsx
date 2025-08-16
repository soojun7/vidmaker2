import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ChatInterface from './ChatInterface';
import DirectInput from './DirectInput';
import StylePanel from './StylePanel';
import PromptGenerator from './PromptGenerator';
import CharacterManager from './CharacterManager';
import VideoEditor from './VideoEditor';
import { ChatMessage, WorkflowData, SavedStyle, Character } from '../types/index';

interface TabContentProps {
  activeTab: number;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onDirectInputSave?: (content: string) => void;
  onDirectInputConfirm?: (content: string) => void;
  onConfirm: () => void;
  onPromptConfirm?: (prompts: Array<{ sceneNumber: number; sceneDescription: string; prompt: string }>) => void;
  workflowData: WorkflowData;
  isLoading: boolean;
  uploadedImage?: string | null;
  onImageUpload?: (file: File) => void;
  onRemoveImage?: () => void;
  onBackToProjectList?: () => void;
  showBackButton?: boolean;
  onSaveStyle?: (style: Omit<SavedStyle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteStyle?: (id: string) => void;
  onUpdateStyle?: (id: string, updates: Partial<SavedStyle>) => void;
  onUseStyle?: (style: SavedStyle) => void;
  onUpdateCharacter?: (characterId: string, updates: Partial<Character>) => void;
  onConfirmCharacter?: (characterId: string) => void;
  onTabChange?: (tabIndex: number) => void;
  onAddMessage?: (message: ChatMessage) => void;
  onSavePromptGeneratorState?: (state: any) => void;
  getPromptGeneratorState?: () => any;
  onScriptsChange?: (scripts: any[]) => void;
  currentProject?: any;
  onUpdateStyleAnalysis?: (updatedStyle: any) => void;
}

const TabContent: React.FC<TabContentProps> = ({
  activeTab,
  messages,
  onSendMessage,
  onDirectInputSave,
  onDirectInputConfirm,
  onConfirm,
  onPromptConfirm,
  workflowData,
  isLoading,
  uploadedImage,
  onImageUpload,
  onRemoveImage,
  onBackToProjectList,
  showBackButton = false,
  onSaveStyle,
  onDeleteStyle,
  onUpdateStyle,
  onUseStyle,
  onUpdateCharacter,
  onConfirmCharacter,
  onTabChange,
  onAddMessage,
  onSavePromptGeneratorState,
  getPromptGeneratorState,
  onScriptsChange,
  currentProject,
  onUpdateStyleAnalysis
}) => {
  const [isDirectInputMode, setIsDirectInputMode] = useState(false);
  const [directInputContent, setDirectInputContent] = useState<{ [key: number]: string }>({});
  const getTabConfig = () => {
    switch (activeTab) {
      case 0: // 스타일 설정
        return {
          title: '스타일 설정',
          description: '이미지나 스타일에 대해 자유롭게 대화하세요',
          placeholder: '메시지를 입력하세요...',
          context: '',
          isConfirmable: messages.length > 0 && !workflowData.styleAnalysis?.confirmed
        };
      
      case 1: // 스크립트 작성
        return {
          title: '스크립트 작성',
          description: '스크립트에 대해 자유롭게 대화하세요',
          placeholder: '메시지를 입력하세요...',
          context: '',
          isConfirmable: messages.length > 0 && !workflowData.script?.confirmed
        };
      
      case 2: // 캐릭터 설정
        let characterContext = '';
        if (workflowData.script?.confirmed) {
          characterContext = `스크립트 내용: ${workflowData.script.content}`;
        }
        if (workflowData.styleAnalysis?.confirmed) {
          characterContext += characterContext ? `\n\n스타일 분석: ${workflowData.styleAnalysis.content}` : `스타일 분석: ${workflowData.styleAnalysis.content}`;
        }
        return {
          title: '캐릭터 설정',
          description: '스크립트와 스타일을 기반으로 캐릭터에 대해 자유롭게 대화하세요',
          placeholder: '메시지를 입력하세요...',
          context: characterContext,
          isConfirmable: messages.length > 0 && !workflowData.characters?.some(char => char.confirmed)
        };
      
      case 3: // 최종생성
        let promptContext = '';
        if (workflowData.characters?.some(char => char.confirmed)) {
          promptContext = `확정된 캐릭터들: ${workflowData.characters?.filter(char => char.confirmed).map(char => char.name).join(', ')}`;
        }
        if (workflowData.styleAnalysis?.confirmed) {
          promptContext += promptContext ? `\n\n스타일 분석: ${workflowData.styleAnalysis.content}` : `스타일 분석: ${workflowData.styleAnalysis.content}`;
        }
        return {
          title: '최종생성',
          description: '스크립트, 캐릭터, 스타일을 기반으로 이미지 생성 프롬프트를 만들어보세요',
          placeholder: '메시지를 입력하세요...',
          context: promptContext,
          isConfirmable: messages.length > 0 && !workflowData.prompts?.some(prompt => prompt.sceneNumber > 0 && prompt.confirmed)
        };
      
      case 4: // 자막생성
        return {
          title: '자막생성',
          description: '스크립트별 TTS 길이를 인식하여 자막을 생성하세요',
          placeholder: '',
          context: '',
          isConfirmable: false
        };

      default:
        return {
          title: '알 수 없음',
          description: '',
          placeholder: '',
          context: '',
          isConfirmable: false
        };
    }
  };

  const config = getTabConfig();

  // 탭이 변경될 때 직접 입력 모드 초기화
  React.useEffect(() => {
    setIsDirectInputMode(false);
  }, [activeTab]);

  const handleDirectInputSave = (content: string) => {
    // 현재 탭의 직접 입력 내용 저장
    setDirectInputContent(prev => ({
      ...prev,
      [activeTab]: content
    }));
    
    if (onDirectInputSave) {
      onDirectInputSave(content);
    }
  };

  const handleSwitchToDirectInput = () => {
    setIsDirectInputMode(true);
  };

  const handleSwitchToChat = () => {
    setIsDirectInputMode(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-6 border-b border-light-200 dark:border-dark-700 transition-colors duration-300">
        <div className="flex items-center space-x-3 mb-2">
          {showBackButton && onBackToProjectList && (
            <button
              onClick={onBackToProjectList}
              className="p-2 rounded-lg hover:bg-light-100 dark:hover:bg-dark-700 transition-colors"
              title="프로젝트 목록으로 돌아가기"
            >
              <ChevronRight className="w-5 h-5 text-light-600 dark:text-gray-400 rotate-180" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-light-900 dark:text-white transition-colors duration-300">{config.title}</h1>
        </div>
        <p className="text-light-600 dark:text-gray-400 transition-colors duration-300">{config.description}</p>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 p-6">
        <div className="h-full flex">
          <div className={`${activeTab === 0 ? 'flex-1 mr-6' : 'flex-1'}`}>
            {activeTab === 2 ? (
              // 캐릭터 설정 탭
              <CharacterManager
                characters={workflowData.characters || []}
                onUpdateCharacter={onUpdateCharacter || (() => {})}
                onConfirmCharacter={onConfirmCharacter || (() => {})}
                isLoading={isLoading}
                messages={messages}
                onSendMessage={onSendMessage}
                script={workflowData.script}
                styleAnalysis={workflowData.styleAnalysis}
                onTabChange={onTabChange}
              />
            ) : activeTab === 3 ? (
              // 최종생성 탭
              <PromptGenerator 
                styleAnalysis={workflowData.styleAnalysis}
                characters={workflowData.characters || []}
                savedStyles={workflowData.savedStyles || []}
                script={workflowData.script}
                onSaveState={onSavePromptGeneratorState}
                getSavedState={getPromptGeneratorState}
                onTabChange={onTabChange}
                onScriptsChange={onScriptsChange}
                currentProject={currentProject}
                onUpdateStyleAnalysis={onUpdateStyleAnalysis}
              />
                         ) : activeTab === 4 ? (
               // 비디오편집 탭  
               (() => {
                 // PromptGenerator 상태에서 scripts 가져오기
                 const promptGeneratorState = getPromptGeneratorState?.();
                 const scriptsFromPromptGenerator = promptGeneratorState?.scripts || [];
                 
                 // workflowData와 PromptGenerator 상태 모두 확인
                 const workflowScripts = workflowData.scripts || [];
                 
                 // 더 많은 데이터가 있는 쪽을 사용
                 const scriptsToPass = scriptsFromPromptGenerator.length > 0 ? scriptsFromPromptGenerator : workflowScripts;
                 
                 console.log('TabContent - VideoEditor에 scripts 전달:', {
                   promptGeneratorScriptsCount: scriptsFromPromptGenerator.length,
                   workflowScriptsCount: workflowScripts.length,
                   finalScriptsCount: scriptsToPass.length,
                   videosCount: scriptsToPass.filter((s: any) => s.generatedVideo).length,
                   scripts: scriptsToPass.map((s: any) => ({ 
                     id: s.id, 
                     hasVideo: !!s.generatedVideo,
                     hasAudio: !!s.generatedAudio,
                     hasImage: !!s.generatedImage,
                     text: s.text.substring(0, 30) + '...'
                   }))
                 });
                 
                 return (
                   <VideoEditor
                     scripts={scriptsToPass}
                   />
                 );
               })()
             ) : isDirectInputMode ? (
              <DirectInput
                title={config.title}
                description={config.description}
                placeholder={config.placeholder}
                currentContent={directInputContent[activeTab] || ''}
                onSave={handleDirectInputSave}
                onSwitchToChat={handleSwitchToChat}
                isConfirmable={config.isConfirmable}
                onConfirm={() => onDirectInputConfirm && onDirectInputConfirm(directInputContent[activeTab] || '')}
                onSaveStyle={activeTab === 0 ? onSaveStyle : undefined}
                showStyleSaveButton={activeTab === 0}
                uploadedImage={uploadedImage}
              />
            ) : (
              <ChatInterface
                messages={messages}
                onSendMessage={onSendMessage}
                onConfirm={onConfirm}
                isConfirmable={config.isConfirmable}
                placeholder={config.placeholder}
                context={config.context}
                isLoading={isLoading}
                onImageUpload={activeTab === 0 ? onImageUpload : undefined}
                uploadedImage={uploadedImage}
                onSaveStyle={activeTab === 0 ? onSaveStyle : undefined}
                showStyleSaveButton={activeTab === 0}
                onSwitchToDirectInput={handleSwitchToDirectInput}
                isScriptTab={activeTab === 1}
                onAddMessage={onAddMessage}
              />
            )}
          </div>
          
          {/* 스타일 설정 탭에서만 우측 패널 표시 */}
          {activeTab === 0 && onSaveStyle && onDeleteStyle && onUpdateStyle && onUseStyle && (
            <StylePanel
              savedStyles={workflowData.savedStyles || []}
              onSaveStyle={onSaveStyle}
              onDeleteStyle={onDeleteStyle}
              onUpdateStyle={onUpdateStyle}
              onUseStyle={onUseStyle}
              currentContent={messages.length > 0 ? messages[messages.length - 1]?.content : undefined}
              currentImage={uploadedImage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default TabContent; 