import React, { useState, useEffect } from 'react';
import { Image, Download, Check, X, RefreshCw, Hash, Send, Bot, User, Plus, Save, Sparkles, Trash2, MoreVertical, Copy } from 'lucide-react';
import { Character, ChatMessage, Script, StyleAnalysis } from '../types/index';

interface CharacterManagerProps {
  characters: Character[];
  onUpdateCharacter: (characterId: string, updates: Partial<Character>) => void;
  onConfirmCharacter: (characterId: string) => void;
  isLoading: boolean;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  script?: Script; // 스크립트 데이터 추가
  styleAnalysis?: StyleAnalysis; // 스타일 분석 데이터 추가
  onTabChange?: (tabIndex: number) => void;
}

interface CharacterForm {
  id: string;
  name: string;
  prompt: string;
  generatedImages: string[];
  selectedImageIndex?: number;
  seedNumber?: number;
  confirmed: boolean;
}

const CharacterManager: React.FC<CharacterManagerProps> = ({
  characters,
  onUpdateCharacter,
  onConfirmCharacter,
  isLoading,
  messages,
  onSendMessage,
  script,
  styleAnalysis,
  onTabChange
}) => {
  const [generatingImages, setGeneratingImages] = useState<{ [key: string]: boolean }>({});
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [detectedImagePrompts, setDetectedImagePrompts] = useState<Array<{prompt: string, characterName: string}>>([]);
  const [characterForms, setCharacterForms] = useState<CharacterForm[]>([]);
  const [selectedImageModal, setSelectedImageModal] = useState<{ url: string; name: string; index: number } | null>(null);
  const [imageMenuOpen, setImageMenuOpen] = useState<{ formId: string; imageIndex: number } | null>(null);
  const [isGeneratingFromScript, setIsGeneratingFromScript] = useState(false);
  const [isConfirmingAll, setIsConfirmingAll] = useState(false);

  // 초기 캐릭터 폼 설정 - characters 배열과 동기화
  useEffect(() => {
    if (characters.length > 0) {
      // characters 배열을 characterForms로 변환
      const formsFromCharacters = characters.map(char => ({
        id: char.id,
        name: char.name,
        prompt: char.prompt,
        generatedImages: char.generatedImages || [],
        selectedImageIndex: char.selectedImageIndex,
        seedNumber: char.seedNumber,
        confirmed: char.confirmed
      }));
      setCharacterForms(formsFromCharacters);
    }
  }, [characters]);

  // 대화에서 이미지 프롬프트 자동 감지
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        const imagePrompts = detectImagePromptsFromMessage(lastMessage.content);
        
        if (imagePrompts.length > 0) {
          setDetectedImagePrompts(prev => {
            // 중복 체크를 위해 기존 프롬프트와 비교
            const newPrompts = imagePrompts.filter(newPrompt => 
              !prev.some(existingPrompt => 
                existingPrompt.prompt === newPrompt.prompt && 
                existingPrompt.characterName === newPrompt.characterName
              )
            );
            return [...prev, ...newPrompts];
          });
        }
      }
    }
  }, [messages.length]);



  // 메시지에서 이미지 생성 프롬프트 감지 함수

  const detectImagePromptsFromMessage = (content: string): Array<{prompt: string, characterName: string}> => {
    const prompts: Array<{prompt: string, characterName: string}> = [];
    
    // "🎨 이미지 생성 프롬프트 감지됨" 패턴 찾기
    const detectionPattern = /🎨\s*이미지\s*생성\s*프롬프트\s*감지됨\s*\((\d+)개\)/;
    const match = content.match(detectionPattern);
    
    if (match) {
      // 새로운 패턴: 캐릭터 이름과 프롬프트 (Unified Silla Warriors\n\n이미지 생성\nprompt)
      const characterPattern = /([^\n]+)\s*\n\n이미지\s*생성\s*\n([^\n]+(?:\n[^\n]+)*?)(?=\n\n[^\n]+\s*\n\n이미지\s*생성\s*\n|$)/g;
      let characterMatch;
      
      while ((characterMatch = characterPattern.exec(content)) !== null) {
        const characterName = characterMatch[1].trim();
        const prompt = characterMatch[2].trim();
        
        // 중복 체크: 같은 캐릭터 이름과 프롬프트가 이미 있는지 확인
        const isDuplicate = prompts.some(p => 
          p.characterName === characterName && p.prompt === prompt
        );
        
        if (!isDuplicate) {
          prompts.push({
            prompt: prompt,
            characterName: characterName
          });
        }
      }
    }
    
    // 새로운 패턴: 넘버링이 있는 캐릭터와 프롬프트 (1. Unified Silla Warriors, 2. "prompt")
    const numberedPattern = /(\d+)\.\s*([^"]+)\s*\n\s*(\d+)\.\s*"([^"]+)"/g;
    let numberedMatch;
    
    while ((numberedMatch = numberedPattern.exec(content)) !== null) {
      const [, number1, name, number2, prompt] = numberedMatch;
      if (prompt && prompt.length > 20 && /[a-zA-Z]/.test(prompt)) {
        const characterName = name.trim();
        
        // 중복 체크
        const isDuplicate = prompts.some(p => 
          p.characterName === characterName && p.prompt === prompt.trim()
        );
        
        if (!isDuplicate) {
          prompts.push({
            prompt: prompt.trim(),
            characterName: characterName
          });
        }
      }
    }
    
    // 넘버링이 없는 패턴: 1. 김철수\n"prompt"
    const noNumberedPattern = /(\d+)\.\s*([^"]+)\s*\n\s*"([^"]+)"/g;
    let noNumberedMatch;
    
    while ((noNumberedMatch = noNumberedPattern.exec(content)) !== null) {
      const [, number, name, prompt] = noNumberedMatch;
      if (prompt && prompt.length > 20 && /[a-zA-Z]/.test(prompt)) {
        const characterName = name.trim();
        
        // 중복 체크
        const isDuplicate = prompts.some(p => 
          p.characterName === characterName && p.prompt === prompt.trim()
        );
        
        if (!isDuplicate) {
          prompts.push({
            prompt: prompt.trim(),
            characterName: characterName
          });
        }
      }
    }
    
    // 기존 패턴도 유지 (숫자로 시작하는 캐릭터 패턴)
    const characterPattern = /(\d+)\.\s*([^"]+)\s*\n\s*"([^"]+)"/g;
    let match2;
    
    while ((match2 = characterPattern.exec(content)) !== null) {
      const [, number, name, prompt] = match2;
      if (prompt && prompt.length > 20 && /[a-zA-Z]/.test(prompt)) {
        const characterName = name.trim();
        
        // 중복 체크
        const isDuplicate = prompts.some(p => 
          p.characterName === characterName && p.prompt === prompt.trim()
        );
        
        if (!isDuplicate) {
          prompts.push({
            prompt: prompt.trim(),
            characterName: characterName
          });
        }
      }
    }
    
    // 따옴표로 둘러싸인 영어 프롬프트 패턴 감지 (기존 방식)
    const promptPattern = /"([^"]+[a-zA-Z][^"]*)"|'([^']+[a-zA-Z][^']*)'/g;
    let promptMatch;
    
    while ((promptMatch = promptPattern.exec(content)) !== null) {
      const prompt = promptMatch[1] || promptMatch[2];
      if (prompt && prompt.length > 20 && /[a-zA-Z]/.test(prompt)) {
        // 이미 캐릭터 패턴으로 감지된 프롬프트는 제외
        const isAlreadyDetected = prompts.some(p => p.prompt === prompt.trim());
        if (!isAlreadyDetected) {
          prompts.push({
            prompt: prompt.trim(),
            characterName: `캐릭터 ${prompts.length + 1}`
          });
        }
      }
    }
    
    return prompts;
  };



  // 캐릭터 폼 추가
  const addCharacterForm = () => {
    const newForm: CharacterForm = {
      id: Date.now().toString(),
      name: '',
      prompt: '',
      generatedImages: [],
      confirmed: false
    };
    setCharacterForms(prev => [...prev, newForm]);
  };

  // 스크립트 기반 캐릭터 생성
  const generateCharactersFromScript = async () => {
    console.log('=== 스크립트 기반 캐릭터 생성 ===');
    console.log('스크립트 객체:', script);
    console.log('스크립트 확정 여부:', script?.confirmed);
    console.log('스크립트 내용:', script?.content);
    console.log('==============================');
    
    if (!script?.confirmed || !script.content) {
      alert('먼저 스크립트를 확정해주세요.');
      return;
    }

    // 기존 캐릭터 폼들의 이미지 생성 프롬프트가 비어있는지 확인
    const hasExistingPrompts = characterForms.some(form => form.prompt.trim() !== '');
    if (hasExistingPrompts) {
      alert('이미지 생성 프롬프트가 비어있어야 스크립트 기반 캐릭터 생성이 가능합니다. 기존 프롬프트를 모두 지워주세요.');
      return;
    }

    setIsGeneratingFromScript(true);

    try {
      const message = `다음 스크립트에서 등장하는 인물들을 분석해서 영어 이미지 생성 프롬프트만 딱 뽑아주세요.

스크립트:
${script.content}

각 인물에 대해 다음 형식으로만 작성해주세요:
1. [인물 이름 한글로]
"영어 이미지 생성 프롬프트"

캐릭터가 여러 명이라면 번호를 매겨서 구분해주세요. 인물 이름은 한글로 작성하고, 프롬프트는 영어로 작성해주세요. 한국어 설명이나 다른 내용은 포함하지 말고 인물 이름과 영어 프롬프트만 작성해주세요.`;

      onSendMessage(message);
    } catch (error) {
      console.error('스크립트 기반 캐릭터 생성 오류:', error);
      alert('캐릭터 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingFromScript(false);
    }
  };

  // 캐릭터 폼 삭제
  const removeCharacterForm = (id: string) => {
    if (characterForms.length > 1) {
      setCharacterForms(prev => prev.filter(form => form.id !== id));
    }
  };

  // 캐릭터 폼 업데이트
  const updateCharacterForm = (id: string, updates: Partial<CharacterForm>) => {
    setCharacterForms(prev => prev.map(form => 
      form.id === id ? { ...form, ...updates } : form
    ));
  };

  // 이미지 생성 함수
  const generateImage = async (formId: string, prompt: string) => {
    if (!prompt.trim()) {
      alert('프롬프트를 입력해주세요.');
      return;
    }

    const form = characterForms.find(f => f.id === formId);
    if (!form) {
      alert('캐릭터 폼을 찾을 수 없습니다.');
      return;
    }

    setGeneratingImages(prev => ({ ...prev, [formId]: true }));
    
    // 스타일 분석을 프롬프트에 적용
    const enhancedPrompt = applyStyleToPrompt(prompt);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          model: 'runware:97@1',
          width: 1024,
          height: 1024,
          steps: 30,
          num_images: 4,
          characterName: form.name
        }),
      });

      if (!response.ok) {
        throw new Error('이미지 생성에 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        updateCharacterForm(formId, { 
          generatedImages: data.images,
          selectedImageIndex: 0, // 첫 번째 이미지 자동 선택
          seedNumber: data.seeds?.[0] || generateRandomSeed() // 첫 번째 시드번호 사용
        });
      }
    } catch (error) {
      console.error('이미지 생성 오류:', error);
      alert('이미지 생성에 실패했습니다.');
    } finally {
      setGeneratingImages(prev => ({ ...prev, [formId]: false }));
    }
  };

  // 대화에서 감지된 프롬프트로 이미지 생성
  const generateImageFromPrompt = async (promptData: {prompt: string, characterName: string}) => {
    const tempId = `temp-${Date.now()}`;
    setGeneratingImages(prev => ({ ...prev, [tempId]: true }));
    
    // 스타일 분석을 프롬프트에 적용
    const enhancedPrompt = applyStyleToPrompt(promptData.prompt);
    
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          model: 'runware:97@1',
          width: 1024,
          height: 1024,
          steps: 30,
          num_images: 4,
          characterName: promptData.characterName
        }),
      });

      if (!response.ok) {
        throw new Error('이미지 생성에 실패했습니다.');
      }

      const data = await response.json();
      
      if (data.images && data.images.length > 0) {
        // 새로운 캐릭터 폼으로 추가
        const newForm: CharacterForm = {
          id: Date.now().toString(),
          name: promptData.characterName,
          prompt: promptData.prompt,
          generatedImages: data.images,
          selectedImageIndex: 0, // 첫 번째 이미지 자동 선택
          seedNumber: data.seeds?.[0] || generateRandomSeed(), // 첫 번째 시드번호 사용
          confirmed: false
        };
        
        setCharacterForms(prev => [...prev, newForm]);
        
        // 감지된 프롬프트 목록에서 제거
        setDetectedImagePrompts(prev => prev.filter(p => p.prompt !== promptData.prompt));
      }
    } catch (error) {
      console.error('이미지 생성 오류:', error);
      alert('이미지 생성에 실패했습니다.');
    } finally {
      setGeneratingImages(prev => ({ ...prev, [tempId]: false }));
    }
  };

  // 스타일 분석을 프롬프트에 적용하는 함수
  const applyStyleToPrompt = (basePrompt: string): string => {
    if (!styleAnalysis?.confirmed || !styleAnalysis.content) {
      return basePrompt;
    }
    
    // 스타일 분석 내용에서 스타일 관련 키워드 추출
    const styleKeywords = styleAnalysis.content
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0)
      .join(', ');
    
    // 기본 프롬프트에 스타일 키워드 추가
    return `${basePrompt}, ${styleKeywords}`;
  };

  // 감지된 모든 프롬프트로 일괄 이미지 생성
  const generateAllImagesFromPrompts = async () => {
    if (detectedImagePrompts.length === 0) return;
    
    // 모든 프롬프트에 대해 동시에 이미지 생성
    const promises = detectedImagePrompts.map(promptData => generateImageFromPrompt(promptData));
    
    try {
      await Promise.all(promises);
      console.log('모든 이미지 생성 완료');
    } catch (error) {
      console.error('일괄 이미지 생성 중 오류:', error);
      alert('일부 이미지 생성에 실패했습니다.');
    }
  };

  // 이미지 선택 함수
  const selectImage = (formId: string, imageIndex: number) => {
    updateCharacterForm(formId, { selectedImageIndex: imageIndex });
  };

  // 시드번호 설정 함수
  const setSeedNumber = (formId: string, seed: number) => {
    updateCharacterForm(formId, { seedNumber: seed });
  };

  // 랜덤 시드번호 생성
  const generateRandomSeed = () => {
    return Math.floor(Math.random() * 1000000);
  };

  // 이미지 다운로드 함수
  const downloadImage = (imageUrl: string, characterName: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${characterName}_image_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 이미지 URL 복사 함수
  const copyImageUrl = async (imageUrl: string) => {
    try {
      await navigator.clipboard.writeText(imageUrl);
      alert('이미지 URL이 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('URL 복사 실패:', error);
      alert('URL 복사에 실패했습니다.');
    }
  };

  // 이미지 크게 보기 모달 열기
  const openImageModal = (imageUrl: string, characterName: string, index: number) => {
    setSelectedImageModal({ url: imageUrl, name: characterName, index });
  };

  // 이미지 크게 보기 모달 닫기
  const closeImageModal = () => {
    setSelectedImageModal(null);
  };

  // 이미지 메뉴 토글
  const toggleImageMenu = (formId: string, imageIndex: number) => {
    setImageMenuOpen(prev => 
      prev?.formId === formId && prev?.imageIndex === imageIndex 
        ? null 
        : { formId, imageIndex }
    );
  };

  // 메시지 전송 함수
  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage);
      setInputMessage('');
    }
  };

  // Enter 키로 메시지 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 모든 캐릭터 확정
  const confirmAllCharacters = async () => {
    if (!isAllCharactersComplete()) {
      alert('모든 캐릭터의 정보를 완성해주세요.');
      return;
    }

    setIsConfirmingAll(true);

    try {
      const confirmedCount = characterForms.filter(form => 
        form.name.trim() && form.prompt.trim() && form.selectedImageIndex !== undefined && form.seedNumber !== undefined
      ).length;

      // 완성된 캐릭터들을 업데이트하고 확정
      characterForms.forEach(form => {
        if (form.name.trim() && form.prompt.trim() && form.selectedImageIndex !== undefined && form.seedNumber !== undefined) {
          const character: Character = {
            id: form.id,
            name: form.name,
            description: '',
            personality: '',
            appearance: '',
            prompt: form.prompt,
            generatedImages: form.generatedImages,
            selectedImageIndex: form.selectedImageIndex,
            seedNumber: form.seedNumber,
            confirmed: true
          };
          
          console.log('캐릭터 확정 중:', character);
          
          // 캐릭터 업데이트 및 확정
          onUpdateCharacter(character.id, character);
          onConfirmCharacter(character.id);
          
          console.log('캐릭터 확정 완료:', character.name, character.id);
          
          // characterForms 상태도 업데이트
          updateCharacterForm(form.id, { confirmed: true });
        }
      });

      // 성공 메시지 표시
      alert(`${confirmedCount}개의 캐릭터가 성공적으로 확정되었습니다!`);
      
      // 최종생성 탭으로 이동
      if (onTabChange) {
        onTabChange(3);
      }
    } catch (error) {
      console.error('캐릭터 확정 오류:', error);
      alert('캐릭터 확정 중 오류가 발생했습니다.');
    } finally {
      setIsConfirmingAll(false);
    }
  };

  // 모든 캐릭터가 완료되었는지 확인
  const isAllCharactersComplete = () => {
    return characterForms.every(form => 
      form.name.trim() && 
      form.prompt.trim() && 
      form.selectedImageIndex !== undefined && 
      form.seedNumber !== undefined
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* 캐릭터 설정 대화 인터페이스 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-sm text-gray-600 mb-4">
          캐릭터에 대해 자유롭게 대화하여 이미지 생성 프롬프트를 만들어보세요.
        </div>
        
        {/* 메시지 목록 */}
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {message.role === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                  <span className="text-xs font-medium">
                    {message.role === 'user' ? '사용자' : 'AI'}
                  </span>
                </div>
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 메시지 입력 */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="캐릭터에 대해 이야기해보세요..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <Send className="w-4 h-4" />
            <span>전송</span>
          </button>
        </div>
      </div>

      {/* 감지된 이미지 프롬프트 알림 */}
      {detectedImagePrompts.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-purple-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-purple-800">
              🎨 이미지 생성 프롬프트 감지됨 ({detectedImagePrompts.length}개)
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={generateAllImagesFromPrompts}
                disabled={Object.values(generatingImages).some(Boolean)}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {Object.values(generatingImages).some(Boolean) ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>일괄 생성 ({detectedImagePrompts.length}개)</span>
              </button>
              <button
                onClick={() => setDetectedImagePrompts([])}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          {/* 스타일 적용 정보 표시 */}
          {styleAnalysis?.confirmed && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">스타일 분석이 적용됩니다</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">{styleAnalysis.content}</p>
            </div>
          )}
          
          <div className="space-y-3">
            {detectedImagePrompts.map((promptData, index) => (
              <div
                key={index}
                className="border border-purple-200 rounded-lg p-3 bg-white"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-purple-900">{promptData.characterName}</h4>
                  <button
                    onClick={() => generateImageFromPrompt(promptData)}
                    disabled={Object.values(generatingImages).some(Boolean)}
                    className="px-3 py-1 bg-purple-500 text-white text-sm rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center space-x-1"
                  >
                    {Object.values(generatingImages).some(Boolean) ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>이미지 생성</span>
                  </button>
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{promptData.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* 캐릭터 이미지 관리 섹션 */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">캐릭터 이미지 관리</h3>
          <div className="flex gap-2">
            {script?.confirmed && (
              <button
                onClick={generateCharactersFromScript}
                disabled={isGeneratingFromScript || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="스크립트에서 캐릭터 자동 생성"
              >
                {isGeneratingFromScript ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                {isGeneratingFromScript ? '생성 중...' : '스크립트 기반 캐릭터 생성'}
              </button>
            )}
            <button
              onClick={addCharacterForm}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus size={16} />
              캐릭터 추가
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {characterForms.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <Image className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">캐릭터가 없습니다</h3>
              <p className="text-gray-500 mb-4">
                스크립트 기반 캐릭터 생성 버튼을 사용하거나<br />
                캐릭터 추가 버튼으로 수동으로 캐릭터를 추가해주세요.
              </p>
            </div>
          ) : (
            characterForms.map((form, index) => (
            <div
              key={form.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <h4 className="text-lg font-medium">캐릭터 {index + 1}</h4>
                </div>
                {characterForms.length > 1 && (
                  <button
                    onClick={() => removeCharacterForm(form.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* 캐릭터 이름 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  캐릭터 이름
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateCharacterForm(form.id, { name: e.target.value })}
                  placeholder="캐릭터 이름을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* 이미지 생성 프롬프트 */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  이미지 생성 프롬프트
                </label>
                <textarea
                  value={form.prompt}
                  onChange={(e) => updateCharacterForm(form.id, { prompt: e.target.value })}
                  placeholder="이미지 생성을 위한 프롬프트를 입력하세요..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  rows={2}
                />
              </div>

              {/* 이미지 생성 버튼 */}
              <div className="mb-3">
                <button
                  onClick={() => generateImage(form.id, form.prompt)}
                  disabled={!form.prompt.trim() || generatingImages[form.id]}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {generatingImages[form.id] ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Image className="w-4 h-4" />
                  )}
                  <span>
                    {generatingImages[form.id] ? '생성 중...' : '이미지 생성'}
                  </span>
                </button>
              </div>

              {/* 생성된 이미지들 */}
              {form.generatedImages.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">생성된 이미지</h5>
                  <div className="grid grid-cols-3 gap-3">
                    {form.generatedImages.map((imageUrl, imageIndex) => (
                      <div
                        key={imageIndex}
                        className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden aspect-square ${
                          form.selectedImageIndex === imageIndex
                            ? 'border-blue-500'
                            : 'border-gray-200'
                        }`}
                        onClick={() => selectImage(form.id, imageIndex)}
                      >
                        <img
                          src={imageUrl}
                          alt={`캐릭터 ${index + 1} 이미지 ${imageIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* 선택 표시 */}
                        {form.selectedImageIndex === imageIndex && (
                          <div className="absolute top-2 left-2 bg-blue-500 text-white rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        
                        {/* 메뉴 버튼 */}
                        <div className="absolute top-2 right-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleImageMenu(form.id, imageIndex);
                            }}
                            className="opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-all duration-200"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                          
                          {/* 메뉴 드롭다운 */}
                          {imageMenuOpen?.formId === form.id && imageMenuOpen?.imageIndex === imageIndex && (
                            <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openImageModal(imageUrl, form.name || `캐릭터 ${index + 1}`, imageIndex);
                                  setImageMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                              >
                                <Image className="w-3 h-3" />
                                <span>크게 보기</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadImage(imageUrl, form.name || `캐릭터 ${index + 1}`, imageIndex);
                                  setImageMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                              >
                                <Download className="w-3 h-3" />
                                <span>다운로드</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyImageUrl(imageUrl);
                                  setImageMenuOpen(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                              >
                                <Copy className="w-3 h-3" />
                                <span>URL 복사</span>
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* 캐릭터명과 시드번호 표시 */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                          <div className="text-white text-xs font-medium mb-1">{form.name}</div>
                          {form.seedNumber && (
                            <div className="text-white text-xs opacity-80">시드: {form.seedNumber}</div>
                          )}
                        </div>
                        
                        {/* 호버 오버레이 */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 시드번호 설정 */}
              {form.selectedImageIndex !== undefined && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시드번호
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={form.seedNumber || ''}
                      onChange={(e) => setSeedNumber(form.id, parseInt(e.target.value) || 0)}
                      placeholder="시드번호를 입력하세요"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      onClick={() => setSeedNumber(form.id, generateRandomSeed())}
                      className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center space-x-1"
                    >
                      <Hash className="w-4 h-4" />
                      <span>랜덤</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 완료 상태 표시 */}
              {form.name.trim() && form.prompt.trim() && form.selectedImageIndex !== undefined && form.seedNumber !== undefined && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {form.confirmed ? '확정됨' : '완료'}
                  </span>
                </div>
              )}
            </div>
          ))
          )}
        </div>

        {/* 전체 확정 버튼 */}
        {characterForms.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={confirmAllCharacters}
              disabled={!isAllCharactersComplete() || isConfirmingAll}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isConfirmingAll ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-5 h-5" />
              )}
              <span>{isConfirmingAll ? '확정 중...' : '모든 캐릭터 확정'}</span>
            </button>
            {!isAllCharactersComplete() && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                모든 캐릭터의 정보를 완성해주세요.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 이미지 크게 보기 모달 */}
      {selectedImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-all duration-200 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImageModal.url}
              alt={`${selectedImageModal.name} 이미지 ${selectedImageModal.index + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
              <p className="text-sm">{selectedImageModal.name} - 이미지 {selectedImageModal.index + 1}</p>
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 외부 클릭 시 닫기 */}
      {imageMenuOpen && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setImageMenuOpen(null)}
        />
      )}
    </div>
  );
};

export default CharacterManager; 