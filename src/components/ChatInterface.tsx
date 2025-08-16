import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Upload, X, ZoomIn, Tag, Save, Image, Download, Clock } from 'lucide-react';
import { ChatMessage } from '../types/index';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, imageData?: string) => void;
  onConfirm: () => void;
  isConfirmable: boolean;
  placeholder?: string;
  context?: string;
  isLoading?: boolean;
  onImageUpload?: (file: File) => void;
  uploadedImage?: string | null;
  onSaveStyle?: (style: { name: string; description: string; content: string; tags: string[]; imageData?: string }) => void;
  showStyleSaveButton?: boolean;
  onSwitchToDirectInput?: () => void;
  isScriptTab?: boolean; // 스크립트 작성 탭인지 확인
  onAddMessage?: (message: ChatMessage) => void; // 메시지 직접 추가 함수
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onConfirm,
  isConfirmable,
  placeholder = "Claude와 대화하세요...",
  context,
  isLoading = false,
  onImageUpload,
  uploadedImage,
  onSaveStyle,
  showStyleSaveButton,
  onSwitchToDirectInput,
  isScriptTab = false,
  onAddMessage
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showStyleSaveModal, setShowStyleSaveModal] = useState(false);
  const [styleToSave, setStyleToSave] = useState<string>('');
  const [newStyleData, setNewStyleData] = useState({
    name: '',
    description: '',
    content: '',
    tags: [] as string[],
    tagInput: ''
  });
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [scriptLength, setScriptLength] = useState({ hours: 0, minutes: 30 }); // 기본 30분
  const [scriptCategory, setScriptCategory] = useState('미설정'); // 기본 카테고리
  const [isGeneratingLongScript, setIsGeneratingLongScript] = useState(false); // 긴 스크립트 생성 중 상태
  const [scriptSegments, setScriptSegments] = useState<string[]>([]); // 생성된 스크립트 세그먼트들
  const [currentSegment, setCurrentSegment] = useState(0); // 현재 생성 중인 세그먼트
  const [totalSegments, setTotalSegments] = useState(0); // 총 필요한 세그먼트 수
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 스크립트 길이 계산 함수 (7666자/13114bytes = 17분 30초 기준)
  const calculateScriptLength = (hours: number, minutes: number) => {
    const totalMinutes = hours * 60 + minutes;
    const totalSeconds = totalMinutes * 60;
    
    // 17분 30초 = 1050초 기준으로 계산
    const baseSeconds = 1050;
    const baseChars = 7666;
    const baseBytes = 13114;
    
    const ratio = totalSeconds / baseSeconds;
    const estimatedChars = Math.round(baseChars * ratio);
    const estimatedBytes = Math.round(baseBytes * ratio);
    
    return { chars: estimatedChars, bytes: estimatedBytes };
  };

  // 긴 스크립트 분할 생성 함수
  const generateLongScript = async (initialMessage: string) => {
    // 사용자가 입력한 메시지에서 문자 수 추출
    const charMatch = initialMessage.match(/\((\d+)자 이상\)/);
    const targetChars = charMatch ? parseInt(charMatch[1]) : 3000; // 기본값 3000자
    
    const maxCharsPerSegment = 3000; // 한 번에 생성할 수 있는 최대 글자수 (Claude API 제한 고려)
    const segments = Math.ceil(targetChars / maxCharsPerSegment);
    
    setTotalSegments(segments);
    setCurrentSegment(0);
    setScriptSegments([]);
    setIsGeneratingLongScript(true);
    
    // 첫 번째 세그먼트 생성
    await generateScriptSegment(initialMessage, 0, segments);
  };

  // 스크립트 세그먼트 생성 함수
  const generateScriptSegment = async (baseMessage: string, segmentIndex: number, totalSegments: number) => {
    try {
      let segmentMessage = '';
      
      if (segmentIndex === 0) {
        // 첫 번째 세그먼트 - 전체 요청사항 포함
        const categoryInfo = scriptCategory !== '미설정' ? `\n\n[카테고리: ${scriptCategory}]\n${getCategoryRequirements(scriptCategory)}` : '';
        segmentMessage = baseMessage + categoryInfo + '\n\n위 요청사항에 따라 바로 스크립트를 작성해주세요. 확인 질문이나 추가 설명 없이 바로 시작해주세요.';
        
        // 첫 번째 세그먼트만 화면에 표시
        onSendMessage(segmentMessage);
      } else {
        // 이어서 쓸 세그먼트 - 백그라운드에서만 처리
        const { chars: targetChars } = calculateScriptLength(scriptLength.hours, scriptLength.minutes);
        const maxCharsPerSegment = 3000;
        const remainingChars = targetChars - (segmentIndex * maxCharsPerSegment);
        
        segmentMessage = `이어서 써주세요. 앞서 작성한 내용에 자연스럽게 연결하여 계속 작성해주세요. 전체 목표는 ${targetChars.toLocaleString()}자이고, 현재 ${(segmentIndex + 1)}번째 세그먼트입니다.`;
        
        // 첫 번째 메시지에서 원본 요청사항 추출
        const firstMessage = messages.find(msg => msg.role === 'user');
        if (!firstMessage) {
          throw new Error('첫 번째 메시지를 찾을 수 없습니다.');
        }
        
        // 원본 요청사항에서 transcript 추출 (간단한 방법)
        const transcriptMatch = firstMessage.content.match(/Transcript:\s*([\s\S]*?)(?=\n\n|$)/);
        const transcript = transcriptMatch ? transcriptMatch[1].trim() : '';
        
        // 백그라운드에서 API 호출 (화면에 표시하지 않음)
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: segmentMessage,
            scriptCategory: scriptCategory,
            scriptLengthHours: scriptLength.hours,
            scriptLengthMinutes: scriptLength.minutes,
            transcript: transcript,
            context: context || ''
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          // 세그먼트 내용만 저장 (화면에 표시하지 않음)
          setScriptSegments(prev => [...prev, data.content]);
          
          // 모든 세그먼트가 완성되었는지 확인
          if (segmentIndex + 1 >= totalSegments) {
            // 모든 세그먼트 완성 - 서버에서 합쳐서 최종 결과 생성
            combineAndDisplayFinalScript();
          } else {
            // 잠시 후 다음 세그먼트 생성
            setTimeout(() => {
              generateNextSegment();
            }, 2000); // 2초 대기
          }
        } else {
          throw new Error('API 호출 실패');
        }
      }
      
    } catch (error) {
      console.error('스크립트 세그먼트 생성 오류:', error);
      setIsGeneratingLongScript(false);
    }
  };

  // 다음 세그먼트 생성 함수
  const generateNextSegment = async () => {
    if (currentSegment < totalSegments - 1) {
      const nextSegment = currentSegment + 1;
      setCurrentSegment(nextSegment);
      
      // 첫 번째 메시지의 원본 내용을 가져와서 다음 세그먼트 생성
      const firstMessage = messages.find(msg => msg.role === 'user');
      if (firstMessage) {
        console.log(`다음 세그먼트 생성 시작: ${nextSegment + 1}/${totalSegments}`);
        await generateScriptSegment(firstMessage.content, nextSegment, totalSegments);
      }
    } else {
      console.log('모든 세그먼트 생성 완료');
      // 모든 세그먼트 완성 - 서버에서 합쳐서 최종 결과 생성
      combineAndDisplayFinalScript();
    }
  };

  // 카테고리별 요청사항 반환 함수
  const getCategoryRequirements = (category: string) => {
    switch (category) {
      case '미스테리/사건':
        return '미스테리/사건 카테고리 요청사항:\n\n1. 도입부 (Hook + 개요)\n충격적인 장면 묘사 → 예고/티저 → 오늘 다룰 내용 소개\n\nHook: 실제 사건의 충격적인 순간으로 시작\n예고: "진실은 달랐습니다", "하지만 이것은 시작에 불과했습니다" 등\n개요: 오늘 다룰 인물과 사건의 간략한 소개\n\n2. 본문 구조 (인물별 에피소드)\n각 인물마다 동일한 4단계 구조:\nA. 배경 설정\n시대적 배경 → 인물 소개 → 성격/환경 → 범행 동기 형성\n\n사건이 일어난 시대와 장소\n범인의 기본 정보와 외모\n어린 시절/성장 과정의 문제점\n범행으로 이어지는 심리적 동기\n\nB. 첫 번째 범행\n구체적 날짜/시간 → 피해자 소개 → 접근 방식 → 범행 과정 → 결과\n\n정확한 시간과 장소 명시\n피해자의 배경과 범인과의 관계\n범인의 접근 및 유인 방법\n상세한 범행 과정 묘사\n즉각적인 결과와 범인의 반응\n\nC. 연쇄 범행\n패턴 확립 → 수법 발전 → 추가 피해자들 → 대담해지는 과정\n\n범행 수법의 체계화\n시간이 지나면서 변화하는 양상\n여러 피해자들의 사례\n범인의 심리적 변화\n\nD. 수사와 체포\n단서 발견 → 수사 과정 → 결정적 증거 → 체포 과정 → 재판과 처벌\n\n경찰이 의심하기 시작한 계기\n수사상의 어려움과 돌파구\n범인 검거의 결정적 순간\n재판 과정과 최종 판결\n\n3. 마무리\n전체 사건 정리 → 사회적 영향 → 교훈 → 다음 예고\n\n사건의 전체적 의미와 충격\n이후 사회 변화나 제도 개선\n우리가 얻을 수 있는 교훈\n시청자들에게 전하는 메시지\n\n4. 서술 기법\n\n시간순 진행: 명확한 연대기적 구성\n현장감 연출: 구체적 시간, 장소, 대화 포함\n심리 분석: 범인의 내면과 동기 탐구\n사회적 맥락: 당시 시대 상황 설명\n긴장감 조성: "하지만", "그러나", "마침내" 등 전환어 사용\n감정 호소: 피해자에 대한 동정과 범인에 대한 분노 유발\n\n5. 문체 특징\n\n2-3문장 단위로 자연스러운 줄바꿈\n대화체와 설명체의 적절한 조화\n독자의 호기심을 자극하는 질문 삽입\n구체적 수치와 고유명사로 신뢰성 확보\n감정적 몰입을 위한 생생한 묘사\n\n중요: 위의 구조를 참고하되, "장면", "씬", "[~교훈]" 등의 구분 표시 없이 모든 내용이 자연스럽게 이어지는 하나의 완전한 스크립트로 작성해주세요.\n\n제가 Transcript: 에 첨부한 스크립트를, 위와 같은 스크립트의 구조로 글자수 : 이상의 스크립트를 작성해주세요.\n글자가 너무 길면 이어서 쓰겠습니다. 대신 이어서 쓸까요?를 묻지마세요.\n\n첨부한 스크립트의 내용을 참고하여 구성이나 순서, 문장구성이나 단어선택을 적절히 다르게 사용하여 다른 스크립트처럼 써주세요. 단, 내용을 아예 바꿔버리면 안돼.';
      case '미설정':
      default:
        return '';
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 스크립트 세그먼트 자동 생성 처리
  useEffect(() => {
    if (isGeneratingLongScript && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // AI 응답을 받았고, 아직 저장되지 않은 경우
      if (lastMessage.role === 'assistant' && !scriptSegments.includes(lastMessage.content)) {
        console.log(`세그먼트 ${currentSegment + 1} 저장: ${lastMessage.content.length}자`);
        
        // 현재 세그먼트 저장
        setScriptSegments(prev => [...prev, lastMessage.content]);
        
        // 다음 세그먼트가 있으면 생성 시작
        if (currentSegment < totalSegments - 1) {
          setTimeout(() => {
            generateNextSegment();
          }, 2000); // 2초 대기
        } else {
          console.log('모든 세그먼트 생성 완료');
          // 모든 세그먼트 완성 - 서버에서 합쳐서 최종 결과 생성
          combineAndDisplayFinalScript();
        }
      }
    }
  }, [messages, isGeneratingLongScript, currentSegment, scriptSegments, totalSegments]);

  // 최종 스크립트 합치기 및 표시 함수
  const combineAndDisplayFinalScript = async () => {
    try {
      const combinedScript = scriptSegments.join('\n\n');
      const totalChars = combinedScript.length;
      
      console.log(`최종 스크립트 생성 완료: ${totalChars.toLocaleString()}자`);
      
      // 서버에 최종 스크립트 전송하여 합쳐진 결과로 표시
      const response = await fetch('/api/combine-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptSegments: scriptSegments,
          totalChars: totalChars,
          originalRequest: inputMessage
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        // 합쳐진 최종 스크립트를 AI 답변으로 시뮬레이션
        const finalMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: result.combinedScript,
          timestamp: new Date()
        };
        
        // 메시지 목록에 직접 추가
        if (onAddMessage) {
          onAddMessage(finalMessage);
        }
        
        // 상태 초기화
        setIsGeneratingLongScript(false);
        setScriptSegments([]);
        setCurrentSegment(0);
        setTotalSegments(0);
      } else {
        console.error('스크립트 합치기 실패');
        // 실패 시 기본 합치기
        const finalMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: combinedScript,
          timestamp: new Date()
        };
        
        // 메시지 목록에 직접 추가
        if (onAddMessage) {
          onAddMessage(finalMessage);
        }
        
        // 상태 초기화
        setIsGeneratingLongScript(false);
        setScriptSegments([]);
        setCurrentSegment(0);
        setTotalSegments(0);
      }
      
    } catch (error) {
      console.error('스크립트 합치기 중 오류:', error);
      // 오류 시 기본 합치기
      const combinedScript = scriptSegments.join('\n\n');
      const totalChars = combinedScript.length;
      
      const finalMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: combinedScript,
        timestamp: new Date()
      };
      
      // 메시지 목록에 직접 추가
      if (onAddMessage) {
        onAddMessage(finalMessage);
      }
      
      // 상태 초기화
      setIsGeneratingLongScript(false);
      setScriptSegments([]);
      setCurrentSegment(0);
      setTotalSegments(0);
    }
  };

  // 스크립트 세그먼트가 업데이트될 때마다 로그 출력
  useEffect(() => {
    if (scriptSegments.length > 0) {
      const totalChars = scriptSegments.join('').length;
      console.log(`스크립트 세그먼트 ${scriptSegments.length}/${totalSegments} 완료. 총 ${totalChars.toLocaleString()}자 생성됨`);
    }
  }, [scriptSegments, totalSegments]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    console.log('드롭 이벤트 발생');
    const files = Array.from(e.dataTransfer.files);
    console.log('드롭된 파일들:', files);
    
    const imageFile = files.find(file => file.type.startsWith('image/'));
    console.log('이미지 파일:', imageFile);
    
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setInputImage(result);
        // 이미지 업로드 시 기본 분석 메시지 설정
        setInputMessage('이 이미지를 분석해서 이런 그림체를 그대로 구현할수있는 프롬프트를 알려줘.\n프롬프트만 딱 복붙할수있게 빼줘.\n\n--ar 16:9 --style raw 이런 비율은 생략해줘.');
        console.log('입력창에 이미지 설정됨');
      };
      reader.readAsDataURL(imageFile);
    } else {
      console.log('이미지 파일이 아님');
    }
  };

  const handleSendMessage = () => {
    console.log('handleSendMessage 호출됨');
    console.log('isScriptTab:', isScriptTab);
    console.log('inputMessage:', inputMessage);
    console.log('messages.length:', messages.length);
    
    if (inputMessage.trim() || inputImage) {
      let messageToSend = inputMessage;
      
      // 스크립트 작성 탭이고 첫 번째 메시지인 경우에만 요청사항 추가
      if (isScriptTab && inputMessage.trim() && messages.length === 0) {
        console.log('스크립트 탭 감지, 입력 메시지:', inputMessage);
        
        // 현재 스크립트 길이 설정에서 예상 글자수 계산
        console.log(`현재 스크립트 길이 설정: ${scriptLength.hours}시간 ${scriptLength.minutes}분`);
        const { chars } = calculateScriptLength(scriptLength.hours, scriptLength.minutes);
        let targetChars = chars;
        console.log(`현재 설정 기준 예상 글자수: ${targetChars.toLocaleString()}자`);
        
        // 기본 요청사항 구성 (카테고리가 미설정이 아닌 경우에만 카테고리 요청사항 포함)
        let defaultRequest = '';
        
        if (scriptCategory !== '미설정') {
          defaultRequest = `[카테고리: ${scriptCategory}]
${getCategoryRequirements(scriptCategory)}

제가 Transcript: 에 첨부한 스크립트를, 위와 같은 스크립트의 구조로 글자수 : 이상의 스크립트를 작성해주세요.
글자가 너무 길면 이어서 쓰겠습니다. 대신 이어서 쓸까요?를 묻지마세요.

첨부한 스크립트의 내용을 참고하여 구성이나 순서, 문장구성이나 단어선택을 적절히 다르게 사용하여 다른 스크립트처럼 써주세요. 단, 내용을 아예 바꿔버리면 안돼.

위 요청사항에 따라 바로 스크립트를 작성해주세요. 확인 질문이나 추가 설명 없이 바로 시작해주세요.`;
        } else {
          defaultRequest = `제가 Transcript: 에 첨부한 스크립트를, 글자수 : 이상의 스크립트를 작성해주세요.
글자가 너무 길면 이어서 쓰겠습니다. 대신 이어서 쓸까요?를 묻지마세요.

첨부한 스크립트의 내용을 참고하여 구성이나 순서, 문장구성이나 단어선택을 적절히 다르게 사용하여 다른 스크립트처럼 써주세요. 단, 내용을 아예 바꿔버리면 안돼.

위 요청사항에 따라 바로 스크립트를 작성해주세요. 확인 질문이나 추가 설명 없이 바로 시작해주세요.`;
        }

        // 기본 요청사항에서 "글자수 : " 패턴 찾기
        const charCountMatch = defaultRequest.match(/글자수\\s*:\\s*([^\\s]*)/);
        console.log('기본 요청사항 charCountMatch:', charCountMatch);
        
        if (charCountMatch) {
          const charCountContent = charCountMatch[1];
          
          if (charCountContent.trim() === '' || charCountContent.trim() === '이상') {
            // 빈 경우 현재 스크립트 길이 설정에서 예상 글자수로 교체
            console.log(`기본 요청사항 빈 글자수 감지, 현재 설정 기준 예상 글자수로 교체: ${targetChars.toLocaleString()}자`);
            // 기본 요청사항에서 빈 글자수를 예상 글자수로 교체
            const updatedRequest = defaultRequest.replace(/글자수\\s*:\\s*[^\\s]*/, `글자수 : ${targetChars.toLocaleString()}`);
            messageToSend = updatedRequest;
            console.log('변환된 기본 요청사항:', messageToSend);
          } else if (/^\d+$/.test(charCountContent)) {
            // 숫자가 있는 경우
            targetChars = parseInt(charCountContent);
            console.log(`기본 요청사항에서 요청한 문자 수: ${targetChars.toLocaleString()}자`);
            
            // 스크립트 길이 설정 업데이트
            const ratio = targetChars / chars;
            const newTotalMinutes = Math.round((scriptLength.hours * 60 + scriptLength.minutes) * ratio);
            const newHours = Math.floor(newTotalMinutes / 60);
            const newMinutes = newTotalMinutes % 60;
            setScriptLength({ hours: newHours, minutes: newMinutes });
            console.log(`스크립트 길이 설정 업데이트: ${newHours}시간 ${newMinutes}분`);
          } else {
            // 다른 내용이 있는 경우에도 예상 글자수로 교체
            console.log(`기본 요청사항 글자수에 다른 내용 감지, 현재 설정 기준 예상 글자수로 교체: ${targetChars.toLocaleString()}자`);
            const updatedRequest = defaultRequest.replace(/글자수\\s*:\\s*[^\\s]*/, `글자수 : ${targetChars.toLocaleString()}`);
            messageToSend = updatedRequest;
            console.log('변환된 기본 요청사항:', messageToSend);
          }
        } else {
          // "글자수 : " 패턴이 없는 경우에도 현재 예상 글자수를 사용
          console.log(`기본 요청사항에 "글자수 : " 패턴 없음, 현재 설정 기준 예상 글자수 사용: ${targetChars.toLocaleString()}자`);
          messageToSend = defaultRequest;
        }
        
        // 사용자 입력 메시지와 기본 요청사항을 함께 전송
        const lengthInfo = `\n\n[스크립트 길이 설정: ${targetChars.toLocaleString()}자 이상]`;
        
        // 사용자 입력 메시지를 포함한 최종 메시지 구성 (카테고리 정보는 이미 defaultRequest에 포함됨)
        messageToSend = `${messageToSend}${lengthInfo}\n\n사용자 요청: ${inputMessage}\n\n위 요청사항에 따라 바로 스크립트를 작성해주세요. 확인 질문이나 추가 설명 없이 바로 시작해주세요.`;
        
        console.log('최종 전송할 메시지:', messageToSend);
        
        // 3,000자 이상인 경우 분할 생성 (Claude API 제한 고려)
        if (targetChars >= 3000) {
          generateLongScript(messageToSend);
          setInputMessage('');
          setInputImage(null);
          return;
        }
      }
      
      onSendMessage(messageToSend, inputImage || undefined);
      setInputMessage('');
      setInputImage(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const removeInputImage = () => {
    setInputImage(null);
  };

  const handleImageClick = (imageSrc: string) => {
    setSelectedImage(imageSrc);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // API 오류 메시지 처리
  const getErrorMessage = (error: string) => {
    if (error.includes('과부하')) {
      return 'API 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
    }
    if (error.includes('529')) {
      return 'API 서버가 과부하 상태입니다. 잠시 후 다시 시도해주세요.';
    }
    if (error.includes('API 호출 실패')) {
      return 'API 호출 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
    return error;
  };

  const handleSaveStyleClick = (content: string) => {
    setStyleToSave(content);
    setNewStyleData(prev => ({ ...prev, content }));
    setShowStyleSaveModal(true);
  };

  const handleSaveStyle = () => {
    if (!newStyleData.name.trim() || !newStyleData.content.trim() || !onSaveStyle) return;

    onSaveStyle({
      name: newStyleData.name,
      description: newStyleData.description,
      content: newStyleData.content,
      tags: newStyleData.tags,
      imageData: uploadedImage || undefined
    });

    setNewStyleData({ name: '', description: '', content: '', tags: [], tagInput: '' });
    setShowStyleSaveModal(false);
    setStyleToSave('');
  };

  const handleAddTag = () => {
    if (newStyleData.tagInput.trim() && !newStyleData.tags.includes(newStyleData.tagInput.trim())) {
      setNewStyleData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewStyleData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // 이미지 생성 함수
  const generateImage = async (prompt: string) => {
    setGeneratingImages(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          model: 'runware:97@1',
          width: 1024,
          height: 1024,
          steps: 30,
          num_images: 1
        }),
      });

      if (!response.ok) {
        throw new Error('이미지 생성에 실패했습니다.');
      }

      const data = await response.json();
      if (data.images && data.images.length > 0) {
        setGeneratedImages(prev => [...prev, data.images[0]]);
      }
    } catch (error) {
      console.error('이미지 생성 오류:', error);
      alert('이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setGeneratingImages(false);
    }
  };

  // 이미지 다운로드 함수
  const downloadImage = (imageUrl: string, filename: string = 'generated-image.png') => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-light-200 dark:border-dark-700 transition-colors duration-300">
      {/* 헤더 */}
      <div className="p-4 border-b border-light-200 dark:border-dark-700 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bot className="w-6 h-6 text-primary-500" />
            <div>
              <h3 className="text-lg font-semibold text-light-900 dark:text-white transition-colors duration-300">Claude AI</h3>
              <p className="text-sm text-light-600 dark:text-gray-400 transition-colors duration-300">스마트한 AI 어시스턴트</p>
            </div>
          </div>
          {onSwitchToDirectInput && (
            <button
              onClick={onSwitchToDirectInput}
              className="p-2 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-gray-300 rounded-lg hover:bg-light-200 dark:hover:bg-dark-600 transition-colors flex items-center space-x-2"
              title="직접 입력 모드로 전환"
            >
              <Save className="w-4 h-4" />
              <span className="text-sm">직접 입력</span>
            </button>
          )}
        </div>
      </div>

      {/* 컨텍스트 표시 */}
      {context && (
        <div className="p-4 bg-light-50 dark:bg-dark-700 border-b border-light-200 dark:border-dark-700 transition-colors duration-300">
          <p className="text-sm text-light-800 dark:text-gray-300 transition-colors duration-300">
            <span className="font-medium text-primary-500">컨텍스트:</span> {context}
          </p>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 toss-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center text-light-600 dark:text-gray-500 py-8 transition-colors duration-300">
            <Bot className="w-12 h-12 mx-auto mb-4 text-light-500 dark:text-gray-600 transition-colors duration-300" />
            <p>Claude와 대화를 시작하세요</p>
            <p className="text-sm text-light-500 dark:text-gray-400 mt-2 transition-colors duration-300">이미지를 입력창에 드래그해서 분석해보세요</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start space-x-3 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' 
                        ? 'bg-primary-500' 
                        : 'bg-light-200 dark:bg-dark-600'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`chat-message ${
                      message.role === 'user' ? 'user' : 'assistant'
                    }`}
                  >
                    {message.content.startsWith('이미지 업로드:') && uploadedImage ? (
                      <div>
                        <p className="text-sm text-light-700 dark:text-gray-300 mb-2 transition-colors duration-200">{message.content}</p>
                        <img
                          src={uploadedImage}
                          alt="업로드된 이미지"
                          className="w-48 h-32 object-cover rounded-xl border border-light-200 dark:border-gray-600 transition-colors duration-300"
                        />
                      </div>
                    ) : (
                      <div>
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {/* 이미지가 첨부된 메시지인지 확인하고 미리보기 표시 */}
                        {message.role === 'user' && message.imageData && (
                          <div className="mt-3 relative inline-block group">
                            <img
                              src={message.imageData}
                              alt="첨부된 이미지"
                              className="w-32 h-24 object-cover rounded-xl border border-light-200 dark:border-gray-600 cursor-pointer hover:scale-105 transition-transform duration-300"
                              onClick={() => handleImageClick(message.imageData || '')}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-all duration-200">
                              <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                            </div>
                          </div>
                        )}
                        {/* Claude 답변에 스타일 저장 버튼과 이미지 생성 버튼 추가 */}
                        {message.role === 'assistant' && (
                          <div className="mt-3 flex items-center space-x-2">
                            {showStyleSaveButton && onSaveStyle && (
                              <button
                                onClick={() => handleSaveStyleClick(message.content)}
                                className="px-3 py-1.5 bg-primary-500 text-white text-xs rounded-lg hover:bg-primary-600 transition-colors flex items-center space-x-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5v14" />
                                </svg>
                                <span>스타일 저장</span>
                              </button>
                            )}
                            
                            {/* 이미지 생성 버튼 */}
                            <button
                              onClick={() => generateImage(message.content)}
                              disabled={generatingImages}
                              className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                            >
                              {generatingImages ? (
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Image className="w-3 h-3" />
                              )}
                              <span>{generatingImages ? '생성 중...' : '이미지 생성'}</span>
                            </button>
                          </div>
                        )}
                        
                        {/* 생성된 이미지들 표시 */}
                        {message.role === 'assistant' && generatedImages.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h4 className="text-sm font-medium text-light-700 dark:text-gray-300">생성된 이미지:</h4>
                            <div className="grid grid-cols-3 gap-3">
                              {generatedImages.map((imageUrl, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={imageUrl}
                                    alt={`생성된 이미지 ${index + 1}`}
                                    className="w-full aspect-square object-cover rounded-lg border border-light-200 dark:border-gray-600 cursor-pointer hover:scale-105 transition-transform duration-300"
                                    onClick={() => handleImageClick(imageUrl)}
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg flex items-center justify-center transition-all duration-200">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleImageClick(imageUrl);
                                        }}
                                        className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-colors"
                                        title="확대보기"
                                      >
                                        <ZoomIn className="w-3 h-3 text-gray-700" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          downloadImage(imageUrl, `generated-image-${index + 1}.png`);
                                        }}
                                        className="p-1 bg-white bg-opacity-80 rounded-full hover:bg-opacity-100 transition-colors"
                                        title="다운로드"
                                      >
                                        <Download className="w-3 h-3 text-gray-700" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                    <p className="text-xs text-light-500 dark:text-gray-400 mt-2 transition-colors duration-300">
                      {message.timestamp instanceof Date 
                        ? message.timestamp.toLocaleTimeString()
                        : new Date(message.timestamp).toLocaleTimeString()
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}
            
            {/* AI 답변 로딩 애니메이션 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-light-200 dark:bg-dark-600">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="chat-message assistant">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary-500 rounded-full ai-typing-dots"></div>
                        <div className="w-2 h-2 bg-primary-500 rounded-full ai-typing-dots"></div>
                        <div className="w-2 h-2 bg-primary-500 rounded-full ai-typing-dots"></div>
                      </div>
                      <span className="text-sm text-light-600 dark:text-gray-400 transition-colors duration-300">AI가 답변을 생성하고 있습니다...</span>
                    </div>
                    {/* 스켈레톤 로딩 효과 */}
                    <div className="mt-3 space-y-2">
                      <div className="h-4 bg-light-400 dark:bg-gray-600 rounded animate-pulse" style={{ width: '80%' }}></div>
                      <div className="h-4 bg-light-400 dark:bg-gray-600 rounded animate-pulse" style={{ width: '60%' }}></div>
                      <div className="h-4 bg-light-400 dark:bg-gray-600 rounded animate-pulse" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 스크립트 설정 (스크립트 작성 탭에서만 표시) */}
      {isScriptTab && (
        <>
          {/* 스크립트 길이 설정 */}
          <div className="p-4 border-t border-light-200 dark:border-dark-700 transition-colors duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-light-700 dark:text-gray-300">스크립트 길이 설정</span>
              </div>
              <div className="text-xs text-light-500 dark:text-gray-400">
                예상: {calculateScriptLength(scriptLength.hours, scriptLength.minutes).chars.toLocaleString()}자 / {calculateScriptLength(scriptLength.hours, scriptLength.minutes).bytes.toLocaleString()}bytes
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-light-700 dark:text-gray-300">시간:</label>
                <select
                  value={scriptLength.hours}
                  onChange={(e) => setScriptLength(prev => ({ ...prev, hours: parseInt(e.target.value) }))}
                  className="px-2 py-1 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={i} value={i}>{i}시간</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-light-700 dark:text-gray-300">분:</label>
                <select
                  value={scriptLength.minutes}
                  onChange={(e) => setScriptLength(prev => ({ ...prev, minutes: parseInt(e.target.value) }))}
                  className="px-2 py-1 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i * 5} value={i * 5}>{i * 5}분</option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-light-500 dark:text-gray-400">
                총 {scriptLength.hours}시간 {scriptLength.minutes}분
              </div>
            </div>
          </div>

          {/* 스크립트 카테고리 설정 */}
          <div className="p-4 border-t border-light-200 dark:border-dark-700 transition-colors duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-primary-500" />
                <span className="text-sm font-medium text-light-700 dark:text-gray-300">스크립트 카테고리 설정</span>
              </div>
              <div className="text-xs text-light-500 dark:text-gray-400">
                {scriptCategory === '미설정' ? '요청사항 없음' : '카테고리별 요청사항 적용'}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-light-700 dark:text-gray-300">카테고리:</label>
                <select
                  value={scriptCategory}
                  onChange={(e) => setScriptCategory(e.target.value)}
                  className="px-3 py-1 text-sm border border-light-300 dark:border-dark-600 rounded-md bg-white dark:bg-dark-800 text-light-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="미설정">미설정</option>
                  <option value="미스테리/사건">미스테리/사건</option>
                </select>
              </div>
            </div>
          </div>

          {/* 긴 스크립트 생성 상태 표시 */}
          {isGeneratingLongScript && (
            <div className="p-4 border-t border-light-200 dark:border-dark-700 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    긴 스크립트 생성 중...
                  </span>
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  {currentSegment + 1}/{totalSegments}
                </span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentSegment + 1) / totalSegments) * 100}%` }}
                ></div>
              </div>
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                현재까지 {scriptSegments.join('').length.toLocaleString()}자 생성됨
              </div>
            </div>
          )}
        </>
      )}

      {/* 입력 영역 */}
      <div className="p-4 border-t border-light-200 dark:border-dark-700 transition-colors duration-300">
        {/* 이미지 미리보기 */}
        {inputImage && (
          <div className="mb-3 relative inline-block">
            <img
              src={inputImage}
              alt="입력 이미지"
              className="w-32 h-24 object-cover rounded-xl border border-light-200 dark:border-gray-600 transition-colors duration-300"
            />
            <button
              onClick={removeInputImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        <div className="flex space-x-3">
          {/* 이미지 업로드 버튼 */}
          <div className="flex flex-col space-y-2">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const result = event.target?.result as string;
                    setInputImage(result);
                    // 이미지 업로드 시 기본 분석 메시지 설정
                    setInputMessage('이 이미지를 분석해서 이런 그림체를 그대로 구현할수있는 프롬프트를 알려줘.\n프롬프트만 딱 복붙할수있게 빼줘.\n\n--ar 16:9 --style raw 이런 비율은 생략해줘.');
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="hidden"
            />
            <label
              htmlFor="image-upload"
              className="p-3 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-gray-300 rounded-lg hover:bg-light-200 dark:hover:bg-dark-600 transition-colors cursor-pointer flex items-center justify-center"
              title="이미지 업로드"
            >
              <Upload className="w-4 h-4" />
            </label>
          </div>
          
          <div className="flex-1 relative">
            <div
              className={`relative ${
                isDragOver ? 'bg-primary-50 bg-opacity-10' : ''
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary-500 bg-opacity-20 rounded-lg z-10">
                  <div className="text-center text-white">
                    <Upload className="w-8 h-8 mx-auto mb-1" />
                    <p className="text-sm font-medium">이미지를 여기에 놓으세요</p>
                  </div>
                </div>
              )}
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className="w-full p-3 pr-12 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white placeholder-light-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:border-primary-500 transition-colors duration-200"
                rows={3}
              />
              <button
                onClick={handleSendMessage}
                disabled={(!inputMessage.trim() && !inputImage) || isLoading}
                className="absolute right-2 bottom-2 p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {isConfirmable && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-toss-success text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2 shadow-sm"
            >
              <span>확정</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 이미지 모달 */}
      {showImageModal && selectedImage && (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeImageModal}>
        <div className="relative max-w-4xl max-h-4xl">
          <img
            src={selectedImage}
            alt="확대된 이미지"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-75 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}

      {/* 스타일 저장 모달 */}
      {showStyleSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-light-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-light-900 dark:text-white">스타일 저장</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-light-700 dark:text-gray-300 mb-2">
                  스타일 이름 *
                </label>
                <input
                  type="text"
                  value={newStyleData.name}
                  onChange={(e) => setNewStyleData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="스타일 이름을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-light-700 dark:text-gray-300 mb-2">
                  설명
                </label>
                <textarea
                  value={newStyleData.description}
                  onChange={(e) => setNewStyleData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  rows={3}
                  placeholder="스타일에 대한 설명을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-light-700 dark:text-gray-300 mb-2">
                  상세 프롬프트 *
                </label>
                <textarea
                  value={newStyleData.content}
                  onChange={(e) => setNewStyleData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full p-3 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  rows={5}
                  placeholder="스타일의 상세 프롬프트를 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-light-700 dark:text-gray-300 mb-2">
                  태그
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newStyleData.tagInput}
                    onChange={(e) => setNewStyleData(prev => ({ ...prev, tagInput: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 p-2 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="태그 입력 후 Enter"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    추가
                  </button>
                </div>
                {newStyleData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {newStyleData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full flex items-center space-x-1"
                      >
                        <Tag className="w-2 h-2" />
                        <span>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-primary-900 dark:hover:text-primary-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-light-200 dark:border-dark-700">
              <button
                onClick={() => {
                  setShowStyleSaveModal(false);
                  setNewStyleData({ name: '', description: '', content: '', tags: [], tagInput: '' });
                  setStyleToSave('');
                }}
                className="flex-1 px-4 py-2 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-gray-300 rounded-lg hover:bg-light-200 dark:hover:bg-dark-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveStyle}
                disabled={!newStyleData.name.trim() || !newStyleData.content.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface; 