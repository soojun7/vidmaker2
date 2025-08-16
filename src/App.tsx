import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Home, FolderOpen, User, Lock } from 'lucide-react';
import Sidebar from './components/Sidebar';
import TabContent from './components/TabContent';
import Dashboard from './components/Dashboard';
import ProjectList from './components/ProjectList';
import NewProjectModal from './components/NewProjectModal';
import UserProfile from './components/UserProfile';
import AuthPage from './components/AuthPage';
import DataMigrationModal from './components/DataMigrationModal';
import AdminPage from './components/AdminPage';
import MobileApp from './components/MobileApp';
import SyncStatus from './components/SyncStatus';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useDeviceDetection } from './hooks/useDeviceDetection';

import { ChatMessage, WorkflowData, StyleAnalysis, Script, Character, Prompt, Project, SavedStyle } from './types/index';
import { callClaudeAPI, getSystemPrompt } from './services/claudeApi';
import { supabase } from './services/supabase';
import { DataService } from './services/dataService';
import { appStateApi } from './services/appStateApi';
import { syncService } from './services/syncService';

const AppContent: React.FC = () => {
  const { user, token, loading } = useAuth();
  const deviceInfo = useDeviceDetection();
  const { isMobile } = deviceInfo;

  // 디바이스 감지 디버깅
  useEffect(() => {
    console.log('📱 디바이스 감지 결과:', {
      isMobile,
      isTablet: deviceInfo.isTablet,
      isDesktop: deviceInfo.isDesktop,
      screenWidth: deviceInfo.screenWidth,
      screenHeight: deviceInfo.screenHeight,
      userAgent: deviceInfo.userAgent
    });
  }, [deviceInfo]);
  const [activeTab, setActiveTab] = useState(-1); // -1은 대시보드, 0-3은 기존 탭들
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [workflowData, setWorkflowData] = useState<WorkflowData>({
    styleAnalysis: undefined,
    script: undefined,
    characters: [],
    prompts: [],
    savedStyles: [],
    individualVideos: [],
    scripts: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  // 사이드바 상태
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // 프로젝트 관리 상태
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentMainProject, setCurrentMainProject] = useState<Project | null>(null);
  const [showProjectList, setShowProjectList] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [parentProjectForNew, setParentProjectForNew] = useState<{ id: string; name: string } | undefined>(undefined);
  
  // 사용자 프로필 상태
  const [showUserProfile, setShowUserProfile] = useState(false);

  // 어드민 페이지 상태
  const [showAdminPage, setShowAdminPage] = useState(false);

  // 데이터 마이그레이션 모달 상태
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [isDataServiceInitialized, setIsDataServiceInitialized] = useState(false);

  // 탭별 메시지 관리
  const [tabMessages, setTabMessages] = useState<{ [key: number]: ChatMessage[] }>({
    0: [],
    1: [],
    2: [],
    3: [],
    4: []
  });

  // 탭별 PromptGenerator 상태 관리
  const [tabPromptGeneratorStates, setTabPromptGeneratorStates] = useState<{ [key: number]: any }>({
    0: null,
    1: null,
    2: null,
    3: null,
    4: null
  });

  // 100% 서버 기반 데이터 관리 시스템 v3.0 - FINAL
  useEffect(() => {
    console.log('🚀 === 서버 전용 모드 v3.0 - FINAL VERSION === 🚀');
    console.log('🌟 100% 서버 기반 데이터 관리 시스템 활성화!');
    console.log('📱 PC/모바일 완전 실시간 동기화');
    console.log('🚫 localStorage 완전 제거 - 순수 서버 저장만 사용');
    console.log('☁️ 모든 데이터는 클라우드에서 실시간 관리됩니다');
    console.log('🎯 빌드 타임스탬프: ' + new Date().toISOString());
    console.log('🔥 NO MORE LOCALSTORAGE ERRORS! 🔥');
  }, []);

  // 서버에서 앱 상태 실시간 로드
  const loadAppStateFromServer = useCallback(async () => {
    if (!user?.id || !token || !isDataServiceInitialized) return;

    try {
      console.log('📥 서버에서 앱 상태 로드 시작...');
      const dataService = DataService.getInstance();
      
      // 전체 사용자 데이터 동기화
      const syncResult = await dataService.syncAllUserData();
      
      if (syncResult.projects) {
        const convertedProjects = syncResult.projects.map(convertApiProjectToSafeProject);
        setProjects(convertedProjects);
        console.log(`✅ ${convertedProjects.length}개 프로젝트 로드 완료`);
      }

      if (syncResult.appState) {
        // 앱 상태 복원
        const {
          currentProject,
          currentMainProject,
          workflowData,
          tabMessages,
          tabPromptGeneratorStates,
          activeTab,
          uploadedImage,
          isSidebarCollapsed
        } = syncResult.appState;

        if (currentProject) setCurrentProject(currentProject);
        if (currentMainProject) setCurrentMainProject(currentMainProject);
        if (workflowData) setWorkflowData(workflowData);
        if (tabMessages) setTabMessages(tabMessages);
        if (tabPromptGeneratorStates) setTabPromptGeneratorStates(tabPromptGeneratorStates);
        if (typeof activeTab === 'number') setActiveTab(activeTab);
        if (uploadedImage) setUploadedImage(uploadedImage);
        if (typeof isSidebarCollapsed === 'boolean') setIsSidebarCollapsed(isSidebarCollapsed);

        console.log('✅ 앱 상태 복원 완료');
      }
    } catch (error) {
      console.error('❌ 서버 상태 로드 실패:', error);
    }
  }, [user?.id, token, isDataServiceInitialized]);

  // 서버에 앱 상태 실시간 저장 (syncService 사용)
  const saveAppStateToServer = useCallback(async () => {
    if (!user?.id || !token || !isDataServiceInitialized) return;

    try {
      const appState = {
        projects,
        currentProject,
        currentMainProject,
        workflowData,
        tabMessages,
        tabPromptGeneratorStates,
        activeTab,
        uploadedImage,
        isSidebarCollapsed,
        lastSaved: new Date().toISOString(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          platform: navigator.platform
        }
      };

      await syncService.syncAppState(appState);
      console.log('💾 앱 상태 동기화 완료');
    } catch (error) {
      console.error('❌ 앱 상태 동기화 실패:', error);
    }
  }, [
    user?.id, 
    token, 
    isDataServiceInitialized,
    projects,
    currentProject,
    currentMainProject,
    workflowData,
    tabMessages,
    tabPromptGeneratorStates,
    activeTab,
    uploadedImage,
    isSidebarCollapsed
  ]);

  // 로그인 후 서버에서 상태 로드
  useEffect(() => {
    if (user?.id && token && isDataServiceInitialized) {
      loadAppStateFromServer();
    }
  }, [user?.id, token, isDataServiceInitialized, loadAppStateFromServer]);

  // 상태 변경 시 자동 서버 저장 (3초 디바운스)
  useEffect(() => {
    if (!user?.id || !token || !isDataServiceInitialized) return;

    const timeoutId = setTimeout(() => {
      saveAppStateToServer();
    }, 3000); // 3초 디바운스

    return () => clearTimeout(timeoutId);
  }, [saveAppStateToServer]);

  // 데이터 서비스 초기화
  const initializeDataService = useCallback(async () => {
    if (!user?.id) {
      console.log('사용자가 로그인하지 않았습니다. 데이터 서비스 초기화를 건너뜁니다.');
      return;
    }
    
    try {
      const dataService = DataService.getInstance();
      await dataService.initialize(user.id);
      setIsDataServiceInitialized(true);
      console.log('데이터 서비스 초기화 완료');
    } catch (error) {
      console.error('데이터 서비스 초기화 오류:', error);
      // 마이그레이션 모달 표시
      setShowMigrationModal(true);
    }
  }, [user?.id]);

  // 마이그레이션 완료 핸들러
  const handleMigrationComplete = useCallback(() => {
    setShowMigrationModal(false);
    setIsDataServiceInitialized(true);
    // 프로젝트 목록 새로고침
    fetchUserProjects();
  }, []);

  // API 프로젝트를 안전한 로컬 타입으로 변환하는 함수
  const convertApiProjectToSafeProject = (apiProject: any): Project => {
    console.log('🔄 프로젝트 변환 중:', {
      id: apiProject.id,
      title: apiProject.title,
      hasContent: !!apiProject.content
    });
    
    // content 필드에서 추가 데이터 파싱
    let contentData: any = {};
    if (apiProject.content) {
      try {
        contentData = JSON.parse(apiProject.content);
        console.log('📋 Content 파싱 성공:', contentData);
      } catch (error) {
        console.warn('⚠️ Content 파싱 실패:', error);
        contentData = {};
      }
    }
    
    return {
      id: apiProject.id ? apiProject.id.toString() : Date.now().toString(),
      name: apiProject.title || '제목 없음',
      description: apiProject.description || '',
      createdAt: new Date(apiProject.created_at || Date.now()),
      updatedAt: new Date(apiProject.updated_at || apiProject.created_at || Date.now()),
      workflowData: contentData.workflowData || {
        styleAnalysis: undefined,
        script: undefined,
        characters: [],
        prompts: [],
        savedStyles: [],
        individualVideos: [],
        scripts: []
      },
      tabMessages: contentData.tabMessages || { 0: [], 1: [], 2: [], 3: [], 4: [] },
      status: contentData.status || 'draft',
      level: contentData.level || 0,
      type: contentData.type || 'main',
      tags: contentData.tags || [],
      parentId: contentData.parentId // 중요: parentId 설정
    };
  };

  // 사용자별 프로젝트 로드 함수 (강화된 디버깅 포함)
  const fetchUserProjects = useCallback(async () => {
    console.log('=== 🔍 PC 프로젝트 로드 시작 ===');
    
    if (!user?.id) {
      console.log('❌ 사용자가 로그인하지 않았습니다. 프로젝트 로드를 건너뜁니다.');
      setProjects([]);
      return;
    }
    
    // 서버 기반 인증 상태 확인
    console.log('🔑 서버 기반 토큰 상태:', {
      hasToken: !!token,
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString()
    });
    
    if (!token) {
      console.error('❌ 토큰이 없습니다! 로그인 상태를 확인하세요.');
      alert('로그인 토큰이 없습니다. 다시 로그인해주세요.');
      return;
    }
    
    try {
      console.log('🌐 API 요청 정보:', {
        url: '/api/projects',
        method: 'GET',
        hasAuthHeader: !!token,
        userAgent: navigator.userAgent.substring(0, 100)
      });
      
      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📡 API 응답 상태:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API 응답 오류:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText
        });
        
        if (response.status === 401) {
          alert('인증이 만료되었습니다. 다시 로그인해주세요.');
        } else if (response.status === 403) {
          alert('권한이 없습니다. 관리자에게 문의하세요.');
        } else {
          alert(`서버 오류가 발생했습니다. (${response.status})`);
        }
        
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('📦 API 응답 데이터:', {
        success: data.success,
        projectCount: data.projects ? data.projects.length : 0,
        dataKeys: Object.keys(data),
        sampleProject: data.projects && data.projects.length > 0 ? data.projects[0] : null
      });
      
      const apiProjects = data.projects || [];
      
      if (apiProjects.length === 0) {
        console.log('📭 프로젝트가 없습니다. 새 프로젝트를 만들어주세요.');
      }
      
      // API 프로젝트를 안전한 로컬 타입으로 변환
      const convertedProjects = apiProjects.map(convertApiProjectToSafeProject);
      console.log('✅ 안전한 프로젝트 변환 완료:', {
        원본개수: apiProjects.length,
        변환개수: convertedProjects.length,
        프로젝트목록: convertedProjects.map((p: Project) => ({ id: p.id, name: p.name }))
      });
      
      setProjects(convertedProjects);
      console.log('🎉 PC 프로젝트 로드 성공적으로 완료!');
      
    } catch (error) {
      console.error('❌ PC 프로젝트 로드 치명적 오류:', {
        error: error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      });
      setProjects([]);
      
      // 사용자에게 더 구체적인 오류 메시지 표시
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('네트워크 연결을 확인하고 다시 시도해주세요.');
      } else {
        alert('프로젝트를 불러오는 중 오류가 발생했습니다. 페이지를 새로고침하거나 다시 로그인해주세요.');
      }
    }
    
    console.log('=== 🔍 PC 프로젝트 로드 완료 ===');
  }, [user?.id]);

  // 사용자가 변경될 때 데이터 초기화 및 프로젝트 로드
  useEffect(() => {
    if (user) {
      console.log('👤 사용자 로그인 감지:', {
        userId: user.id,
        email: user.email,
        timestamp: new Date().toISOString()
      });
      
      // 데이터 서비스 초기화 (백그라운드에서 실행)
      initializeDataService();
      
      // 사용자가 로그인하면 모든 데이터 초기화
      setMessages([]);
      setWorkflowData({});
      setUploadedImage(null);
      setCurrentProject(null);
      setCurrentMainProject(null);
      setTabMessages({
        0: [],
        1: [],
        2: [],
        3: [],
        4: []
      });
      setTabPromptGeneratorStates({
        0: null,
        1: null,
        2: null,
        3: null,
        4: null
      });
      setActiveTab(-1); // 대시보드로 이동
      
      // 잠깐 후에 프로젝트 로드 (UI 상태 정리 후)
      setTimeout(() => {
        console.log('⏰ 지연된 프로젝트 로드 시작...');
        fetchUserProjects();
      }, 100);
    } else {
      console.log('👤 사용자 로그아웃 감지');
      // 로그아웃 시 프로젝트 초기화
      setProjects([]);
      setIsDataServiceInitialized(false);
    }
  }, [user?.id, fetchUserProjects]);

  // activeTab이나 해당 탭의 메시지가 변경될 때 messages 상태 업데이트
  useEffect(() => {
    if (activeTab >= 0) {
      const currentTabMessages = tabMessages[activeTab] || [];
      setMessages(currentTabMessages);
    }
  }, [activeTab, tabMessages]);

  const handleImageUpload = (file: File) => {
    console.log('handleImageUpload 호출됨:', file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      console.log('이미지 데이터 읽기 완료, 길이:', result.length);
      setUploadedImage(result);
      
      // 이미지 업로드 완료 (자동 분석 요청 제거)
    };
    
    reader.onerror = (error) => {
      console.error('파일 읽기 오류:', error);
    };
    
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
  };

  const handleSendMessage = async (message: string, imageData?: string) => {
    const imageToUse = imageData || uploadedImage;
    console.log('handleSendMessage 호출됨, uploadedImage 존재:', !!uploadedImage);
    console.log('handleSendMessage 호출됨, 전달받은 imageData 존재:', !!imageData);
    console.log('handleSendMessage 호출됨, 최종 사용할 이미지 존재:', !!imageToUse);
    if (imageToUse) {
      console.log('사용할 이미지 길이:', imageToUse.length);
      console.log('사용할 이미지 시작 부분:', imageToUse.substring(0, 50));
    }
    
    // 스타일 설정 탭에서 이미지가 첨부된 첫 번째 대화인지 확인
    const isFirstImageMessage = activeTab === 0 && imageToUse && (tabMessages[activeTab] || []).length === 0;
    
    // 첫 번째 이미지 메시지인 경우 자동으로 요청사항 추가
    const finalMessage = isFirstImageMessage 
      ? "Analyze ONLY the pure art style and drawing technique of these images. Focus on:\n\n1. Overall art style and genre characteristics\n2. Character design approach (facial structure, proportions, expression handling)\n3. Color palette and color usage\n4. Lighting and shading techniques\n5. Texture and detail treatment methods\n6. Composition and layout features\n\nThen create a detailed English prompt that can reproduce this art style.\n\nIMPORTANT: Do NOT analyze clothing, objects, backgrounds, or any specific content. Focus ONLY on the drawing technique, brush strokes, line quality, and pure art style. This is for creating a universal art style prompt that can be applied to any subject matter.\n\nRequirements:\n- Remove all technical parameters like --ar, --v, --q, --s, --c, --seed, etc.\n- Remove all text from the image unless specifically requested\n- Focus only on visual elements and artistic style\n- Provide clean, parameter-free English prompt"
      : message;
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: finalMessage,
      timestamp: new Date(),
      imageData: imageToUse || undefined
    };

    // 현재 탭의 메시지에 추가
    const updatedTabMessages = {
      ...tabMessages,
      [activeTab]: [...(tabMessages[activeTab] || []), newMessage]
    };
    setTabMessages(updatedTabMessages);
    setIsLoading(true);

    try {
      // 컨텍스트 생성 (이전 탭의 내용을 참고용으로만 제공)
      let context = '';
      switch (activeTab) {
        case 0: // 스타일 설정
          if (uploadedImage) {
            context = `업로드된 이미지가 있습니다.`;
          }
          break;
        case 1: // 스크립트 작성
          // 스크립트 작성 시에는 스타일 컨텍스트를 받지 않음
          break;
        case 2: // 캐릭터 설정
          if (workflowData.script?.confirmed) {
            context = `이전 탭에서 확정된 스크립트 내용: ${workflowData.script.content}`;
          }
          if (workflowData.styleAnalysis?.confirmed) {
            context += context ? `\n\n확정된 스타일 분석: ${workflowData.styleAnalysis.content}` : `확정된 스타일 분석: ${workflowData.styleAnalysis.content}`;
          }
          break;
        case 3: // 프롬프트 생성
          if (workflowData.characters?.some(char => char.confirmed)) {
            const characterNames = workflowData.characters?.filter(char => char.confirmed).map(char => char.name).join(', ');
            context = `이전 탭에서 확정된 캐릭터들: ${characterNames}`;
          }
          if (workflowData.styleAnalysis?.confirmed) {
            context += context ? `\n\n확정된 스타일 분석: ${workflowData.styleAnalysis.content}` : `확정된 스타일 분석: ${workflowData.styleAnalysis.content}`;
          }
          break;
      }

      // Claude API 호출
      const systemPrompt = getSystemPrompt(activeTab);
      console.log('Claude API 호출 전, imageData 전달:', !!imageToUse);
      
      // 현재 탭의 대화 히스토리 생성 (마지막 메시지 제외)
      const currentMessages = tabMessages[activeTab] || [];
      const conversationHistory = currentMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      const aiResponseText = await callClaudeAPI(finalMessage, context, systemPrompt, imageToUse || undefined, conversationHistory);
      
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date()
      };

      const finalTabMessages = {
        ...updatedTabMessages,
        [activeTab]: [...updatedTabMessages[activeTab], aiResponse]
      };
      setTabMessages(finalTabMessages);
      setIsLoading(false);
    } catch (error) {
      console.error('Claude API 호출 오류:', error);
      
      // 에러 메시지 표시
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. API 호출 중 오류가 발생했습니다. 다시 시도해주세요.',
        timestamp: new Date()
      };

      const finalTabMessages = {
        ...updatedTabMessages,
        [activeTab]: [...updatedTabMessages[activeTab], errorMessage]
      };
      setTabMessages(finalTabMessages);
      setIsLoading(false);
    }
  };

  // 직접 입력 모드에서 메시지 처리
  const handleDirectInputSave = (content: string) => {
    const aiResponse: ChatMessage = {
      id: Date.now().toString(),
      role: 'assistant',
      content: content,
      timestamp: new Date()
    };

    // 현재 탭의 메시지에 추가
    const updatedTabMessages = {
      ...tabMessages,
      [activeTab]: [...(tabMessages[activeTab] || []), aiResponse]
    };
    setTabMessages(updatedTabMessages);
  };

  const handleConfirm = () => {
    const currentMessages = tabMessages[activeTab] || [];
    const lastAssistantMessage = currentMessages
      .filter(msg => msg.role === 'assistant')
      .pop();

    if (!lastAssistantMessage) return;

    switch (activeTab) {
      case 0: // 스타일 설정
        const styleAnalysis: StyleAnalysis = {
          id: Date.now().toString(),
          content: lastAssistantMessage.content,
          confirmed: true
        };
        setWorkflowData(prev => ({ ...prev, styleAnalysis }));
        // 다음 탭으로 이동
        setActiveTab(1);
        break;

      case 1: // 스크립트 작성
        const script: Script = {
          id: Date.now().toString(),
          content: lastAssistantMessage.content,
          confirmed: true,
          text: lastAssistantMessage.content
        };
        setWorkflowData(prev => ({ ...prev, script }));
        // 다음 탭으로 이동
        setActiveTab(2);
        break;

      case 2: // 캐릭터 설정
        const character: Character = {
          id: Date.now().toString(),
          name: "주인공",
          description: lastAssistantMessage.content,
          personality: "성실하지만 소심함",
          appearance: "평범한 체격, 피곤한 표정",
          prompt: "",
          generatedImages: [],
          confirmed: true
        };
        
        // 캐릭터 이미지 생성 프롬프트도 함께 생성
        const characterPrompt: Prompt = {
          id: (Date.now() + 1).toString(),
          sceneNumber: 0, // 캐릭터 시트는 0으로 구분
          sceneDescription: `${character.name} 캐릭터 이미지`,
          prompt: lastAssistantMessage.content,
          confirmed: true
        };
        
        setWorkflowData(prev => ({ 
          ...prev, 
          characters: [...(prev.characters || []), character],
          prompts: [...(prev.prompts || []), characterPrompt]
        }));
        // 다음 탭으로 이동
        setActiveTab(3);
        break;

      case 3: // 최종생성
        // 이 경우는 PromptGenerator에서 처리됨
        break;
    }
  };

  // 최종생성 탭에서 확정된 프롬프트들을 처리
  const handlePromptConfirm = (prompts: Array<{ sceneNumber: number; sceneDescription: string; prompt: string }>) => {
    const newPrompts: Prompt[] = prompts.map(prompt => ({
      id: Date.now().toString() + Math.random(),
      sceneNumber: prompt.sceneNumber,
      sceneDescription: prompt.sceneDescription,
      prompt: prompt.prompt,
      confirmed: true
    }));
    
    setWorkflowData(prev => ({ 
      ...prev, 
      prompts: [...(prev.prompts || []), ...newPrompts] 
    }));
    
    // 마지막 탭이므로 이동하지 않음
  };

  // 직접 입력 모드에서 확정 처리
  const handleDirectInputConfirm = (content: string) => {
    // 먼저 메시지로 저장
    handleDirectInputSave(content);
    
    // 워크플로우에 반영
    switch (activeTab) {
      case 0: // 스타일 설정
        const styleAnalysis: StyleAnalysis = {
          id: Date.now().toString(),
          content: content,
          confirmed: true
        };
        setWorkflowData(prev => ({ ...prev, styleAnalysis }));
        // 다음 탭으로 이동
        setActiveTab(1);
        break;

      case 1: // 스크립트 작성
        const script: Script = {
          id: Date.now().toString(),
          content: content,
          confirmed: true,
          text: content
        };
        setWorkflowData(prev => ({ ...prev, script }));
        // 다음 탭으로 이동
        setActiveTab(2);
        break;

      case 2: // 캐릭터 설정
        const character: Character = {
          id: Date.now().toString(),
          name: "주인공",
          description: content,
          personality: "성실하지만 소심함",
          appearance: "평범한 체격, 피곤한 표정",
          prompt: "",
          generatedImages: [],
          confirmed: true
        };
        
        // 캐릭터 이미지 생성 프롬프트도 함께 생성
        const characterPrompt: Prompt = {
          id: (Date.now() + 1).toString(),
          sceneNumber: 0, // 캐릭터 시트는 0으로 구분
          sceneDescription: `${character.name} 캐릭터 이미지`,
          prompt: content,
          confirmed: true
        };
        
        setWorkflowData(prev => ({ 
          ...prev, 
          characters: [...(prev.characters || []), character],
          prompts: [...(prev.prompts || []), characterPrompt]
        }));
        // 다음 탭으로 이동
        setActiveTab(3);
        break;

      case 3: // 최종생성
        // 직접 입력 모드에서는 단일 프롬프트로 처리
        const prompt: Prompt = {
          id: Date.now().toString(),
          sceneNumber: 1,
          sceneDescription: "직접 입력 프롬프트",
          prompt: content,
          confirmed: true
        };
        setWorkflowData(prev => ({ 
          ...prev, 
          prompts: [...(prev.prompts || []), prompt] 
        }));
        // 마지막 탭이므로 이동하지 않음
        break;
    }
  };

  const handleHomeClick = () => {
    setActiveTab(-1); // 대시보드로 이동
    setShowProjectList(false);
  };

  // 프로젝트가 선택되지 않았는데 작업 탭에 접근하려고 하면 대시보드로 리다이렉트
  useEffect(() => {
    if (activeTab >= 0 && (!currentProject || currentProject.type !== 'sub')) {
      setActiveTab(-1); // 대시보드로 이동
    }
  }, [activeTab, currentProject]);

  const handleProjectListClick = () => {
    setShowProjectList(true);
    setActiveTab(-1);
  };

  const handleProfileClick = () => {
    setShowUserProfile(true);
    setActiveTab(-1);
  };

  const handleAdminPageClick = () => {
    setShowAdminPage(true);
    setActiveTab(-1);
  };

  // 사이드바 토글 함수
  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleNewProject = (parentId?: string) => {
    if (parentId) {
      const parent = projects.find(p => p.id === parentId);
      if (parent) {
        // 하위 프로젝트의 하위는 생성 불가
        if (parent.type === 'sub') {
          alert('하위 프로젝트에는 더 이상 하위 프로젝트를 생성할 수 없습니다.');
          return;
        }
        setParentProjectForNew({ id: parent.id, name: parent.name });
      }
    } else {
      // 메인 프로젝트 목록에서는 메인 프로젝트만 생성 가능
      setParentProjectForNew(undefined);
    }
    setShowNewProjectModal(true);
  };

  const handleCreateProject = async (projectData: { name: string; description: string; tags: string[]; parentId?: string }) => {
    try {
      // AuthContext에서 토큰 사용
      
      // 디버깅 정보 추가
      console.log('=== PC 프로젝트 생성 디버깅 ===');
      console.log('현재 user:', user);
      console.log('저장된 token:', !!token);
      console.log('프로젝트 데이터:', projectData);
      
      if (!token) {
        console.error('토큰이 없습니다!');
        alert('로그인이 필요합니다. 다시 로그인해주세요.');
        return;
      }
      
      if (!user) {
        console.error('사용자 정보가 없습니다!');
        alert('사용자 인증에 문제가 있습니다. 다시 로그인해주세요.');
        return;
      }
      
      console.log('🔄 PC에서 프로젝트 생성 API 호출...');
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: projectData.name,
          description: projectData.description,
          content: JSON.stringify({
            tags: projectData.tags,
            parentId: projectData.parentId,
            level: projectData.parentId ? 1 : 0,
            type: projectData.parentId ? 'sub' : 'main'
          })
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ PC 프로젝트 생성 성공:', data);
        
        // 프로젝트 목록 새로고침 (서버에서 최신 상태 가져오기)
        await fetchUserProjects();
        
        // UI 상태 업데이트
        if (!projectData.parentId) {
          // 메인 프로젝트인 경우 프로젝트 목록에 남아있음
          setCurrentProject(null);
          setShowProjectList(true);
        } else {
          // 하위 프로젝트인 경우 새로 생성된 프로젝트로 이동
          const safeNewProject = convertApiProjectToSafeProject(data.project);
          setCurrentProject(safeNewProject);
          setWorkflowData({});
          setTabMessages({ 0: [], 1: [], 2: [], 3: [], 4: [] });
          setActiveTab(0);
          setShowProjectList(false);
        }
      } else {
        console.error('PC 프로젝트 생성 실패:', response.status);
        const errorData = await response.text();
        console.error('오류 내용:', errorData);
        alert('프로젝트 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('PC 프로젝트 생성 오류:', error);
      alert('프로젝트 생성 중 오류가 발생했습니다.');
    }
  };

  const handleProjectSelect = async (project: Project) => {
    // 메인 프로젝트인 경우 하위 프로젝트 목록을 보여줌
    if (project.type === 'main') {
      setCurrentProject(project);
      setCurrentMainProject(project);
      setShowProjectList(true);
      return;
    }
    
    // 하위 프로젝트인 경우 서버에서 상세 데이터 로드
    console.log('📥 프로젝트 선택 - 서버에서 상세 데이터 로드 중...', project.id);
    const detailedProject = await loadProjectFromServer(project.id);
    
    if (detailedProject) {
      setCurrentProject(detailedProject);
      setWorkflowData(detailedProject.workflowData);
      setTabMessages(detailedProject.tabMessages);
      setTabPromptGeneratorStates(detailedProject.tabPromptGeneratorStates || { 0: null, 1: null, 2: null, 3: null });
      setActiveTab(0);
      setShowProjectList(false);
      console.log('✅ 프로젝트 상세 데이터 로드 완료');
    } else {
      // 서버에서 로드 실패 시 기본 데이터 사용
      console.warn('⚠️ 서버 로드 실패, 기본 데이터 사용');
      setCurrentProject(project);
      setWorkflowData(project.workflowData);
      setTabMessages(project.tabMessages);
      setTabPromptGeneratorStates(project.tabPromptGeneratorStates || { 0: null, 1: null, 2: null, 3: null });
      setActiveTab(0);
      setShowProjectList(false);
    }
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (currentProject?.id === projectId) {
      setCurrentProject(null);
      setWorkflowData({});
      setTabMessages({ 0: [], 1: [], 2: [], 3: [] });
      setTabPromptGeneratorStates({ 0: null, 1: null, 2: null, 3: null });
      setActiveTab(-1);
    }
    if (currentMainProject?.id === projectId) {
      setCurrentMainProject(null);
    }
  };

  const handleDuplicateProject = (project: Project) => {
    const duplicatedProject: Project = {
      ...project,
      id: Date.now().toString(),
      name: `${project.name} (복사본)`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setProjects(prev => [duplicatedProject, ...prev]);
  };

  const handleBackToMainList = () => {
    console.log('handleBackToMainList 호출됨');
    console.log('현재 상태:', { 
      currentProject, 
      currentMainProject,
      showProjectList, 
      activeTab 
    });
    
    setCurrentProject(null);
    setCurrentMainProject(null);
    setShowProjectList(true);
    
    console.log('상태 변경 후:', { 
      currentProject: null, 
      currentMainProject: null,
      showProjectList: true 
    });
  };

  // 스타일 저장 및 관리 함수들
  const handleSaveStyle = (styleData: Omit<SavedStyle, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newStyle: SavedStyle = {
      id: Date.now().toString(),
      ...styleData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setWorkflowData(prev => ({
      ...prev,
      savedStyles: [...(prev.savedStyles || []), newStyle]
    }));
  };

  const handleDeleteStyle = (styleId: string) => {
    setWorkflowData(prev => ({
      ...prev,
      savedStyles: (prev.savedStyles || []).filter(style => style.id !== styleId)
    }));
  };

  const handleUpdateStyle = (styleId: string, updates: Partial<SavedStyle>) => {
    setWorkflowData(prev => ({
      ...prev,
      savedStyles: (prev.savedStyles || []).map(style => 
        style.id === styleId ? { ...style, ...updates } : style
      )
    }));
  };

  const handleUseStyle = (style: SavedStyle) => {
    // 스타일을 현재 대화에 추가
    const styleMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `저장된 스타일 "${style.name}"을 사용하겠습니다: ${style.content}`,
      timestamp: new Date()
    };

    const updatedTabMessages = {
      ...tabMessages,
      [activeTab]: [...(tabMessages[activeTab] || []), styleMessage]
    };
    setTabMessages(updatedTabMessages);

    // 스타일을 확정 상태로 설정
    const styleAnalysis: StyleAnalysis = {
      id: Date.now().toString(),
      content: style.content,
      confirmed: true
    };
    setWorkflowData(prev => ({ ...prev, styleAnalysis }));

    // 다음 탭으로 자동 이동
    setActiveTab(1);
  };

  // 캐릭터 업데이트 함수
  const handleUpdateCharacter = (characterId: string, updates: Partial<Character>) => {
    setWorkflowData(prev => {
      const existingCharacter = prev.characters?.find(char => char.id === characterId);
      
      if (existingCharacter) {
        // 기존 캐릭터 업데이트
        return {
          ...prev,
          characters: prev.characters?.map(char => 
            char.id === characterId ? { ...char, ...updates } : char
          ) || []
        };
      } else {
        // 새 캐릭터 추가 (updates가 완전한 Character 객체인 경우)
        const newCharacter = updates as Character;
        return {
          ...prev,
          characters: [...(prev.characters || []), newCharacter]
        };
      }
    });
  };

  // 캐릭터 확정 함수
  const handleConfirmCharacter = (characterId: string) => {
    setWorkflowData(prev => ({
      ...prev,
      characters: prev.characters?.map(char => 
        char.id === characterId ? { ...char, confirmed: true } : char
      ) || []
    }));
  };

  // 스타일 분석 업데이트 함수
  const handleUpdateStyleAnalysis = (updatedStyle: StyleAnalysis) => {
    setWorkflowData(prev => ({
      ...prev,
      styleAnalysis: updatedStyle
    }));
  };

  const handleAddMessage = (message: ChatMessage) => {
    // 현재 탭의 메시지에 직접 추가
    const updatedTabMessages = {
      ...tabMessages,
      [activeTab]: [...(tabMessages[activeTab] || []), message]
    };
    setTabMessages(updatedTabMessages);
  };

  // PromptGenerator 상태 저장
  const handleSavePromptGeneratorState = useCallback((state: any) => {
    console.log('App - handleSavePromptGeneratorState 호출:', {
      state,
      scriptsCount: state?.scripts?.length || 0,
      videosCount: state?.scripts?.filter((s: any) => s.generatedVideo).length || 0
    });
    
    // workflowData에 저장
    setWorkflowData(prev => ({
      ...prev,
      ...state,
      individualVideos: state.individualVideos ?? prev.individualVideos,
    }));
    
    // tabPromptGeneratorStates에도 저장 (탭 3)
    setTabPromptGeneratorStates(prev => ({
      ...prev,
      3: state
    }));
  }, []);

  // PromptGenerator 상태 복원
  const getPromptGeneratorState = useCallback(() => {
    // 현재 프로젝트의 PromptGenerator 상태를 반환 (탭 3)
    const savedState = tabPromptGeneratorStates[3];
    console.log('App - getPromptGeneratorState 호출:', {
      tabPromptGeneratorStates,
      activeTab: 3,
      savedState: savedState ? '있음' : '없음',
      scriptsCount: savedState?.scripts?.length || 0,
      videosCount: savedState?.scripts?.filter((s: any) => s.generatedVideo).length || 0
    });
    return savedState || null;
  }, [tabPromptGeneratorStates]);

  // scripts 변경 핸들러
  const handleScriptsChange = useCallback((scripts: any[]) => {
    console.log('App - handleScriptsChange 호출됨, scripts:', scripts);
    console.log('App - scripts 개수:', scripts.length);
    console.log('App - 비디오가 있는 scripts:', scripts.filter(s => s.generatedVideo).length + '개');
    
    // 각 스크립트의 상태 확인
    scripts.forEach((script, index) => {
      console.log(`App - 스크립트 ${index + 1} (ID: ${script.id}):`, {
        text: script.text.substring(0, 30) + '...',
        hasVideo: !!script.generatedVideo,
        videoLength: script.generatedVideo ? script.generatedVideo.length : 0
      });
    });
    
    setWorkflowData(prev => {
      const newData = {
        ...prev,
        scripts: scripts
      };
      console.log('App - workflowData 업데이트 완료:', {
        previousScriptsCount: prev.scripts?.length || 0,
        newScriptsCount: scripts.length,
        previousVideosCount: prev.scripts?.filter(s => s.generatedVideo).length || 0,
        newVideosCount: scripts.filter(s => s.generatedVideo).length
      });
      return newData;
    });
  }, []);

  // 프로젝트 자동 저장을 위한 ref
  const prevWorkflowDataRef = useRef<WorkflowData>({});
  const prevTabMessagesRef = useRef<{ [key: number]: ChatMessage[] }>({ 0: [], 1: [], 2: [], 3: [] });
  const prevTabPromptGeneratorStatesRef = useRef<{ [key: number]: any }>({ 0: null, 1: null, 2: null, 3: null });

  // 서버에 프로젝트 데이터 저장하는 함수 (100% 서버 기반)
  const saveProjectToServer = useCallback(async (projectToSave: Project) => {
    if (!projectToSave || !user?.id) {
      console.log('⚠️ 저장할 프로젝트나 사용자 정보가 없습니다.');
      return;
    }

    try {
      if (!token) {
        console.warn('⚠️ 토큰이 없어 서버 저장을 건너뜁니다.');
        return;
      }

      console.log('💾 서버에 프로젝트 저장 중...', projectToSave.id);
      
      const response = await fetch(`/api/projects/${projectToSave.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: projectToSave.name,
          description: projectToSave.description,
          content: JSON.stringify({
            workflowData: projectToSave.workflowData,
            tabMessages: projectToSave.tabMessages,
            tabPromptGeneratorStates: projectToSave.tabPromptGeneratorStates,
            status: projectToSave.status,
            tags: projectToSave.tags
          })
        })
      });

      if (response.ok) {
        console.log('✅ 서버 저장 성공:', projectToSave.id);
      } else {
        console.warn('⚠️ 서버 저장 실패:', response.status);
      }
    } catch (error) {
      console.error('❌ 서버 저장 오류:', error);
    }
  }, [user?.id]);

  // 서버에서 프로젝트 상세 데이터 로드하는 함수
  const loadProjectFromServer = useCallback(async (projectId: string): Promise<Project | null> => {
    try {
      if (!token) {
        console.warn('⚠️ 토큰이 없어 프로젝트 상세 로드를 건너뜁니다.');
        return null;
      }

      console.log('📥 서버에서 프로젝트 상세 로드 중...', projectId);
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const projectData = data.project;
        
        // 서버 데이터를 안전하게 변환
        const safeProject = convertApiProjectToSafeProject(projectData);
        
        // content 필드에서 추가 데이터 복원
        if (projectData.content) {
          try {
            const contentData = JSON.parse(projectData.content);
            safeProject.workflowData = contentData.workflowData || safeProject.workflowData;
            safeProject.tabMessages = contentData.tabMessages || safeProject.tabMessages;
            safeProject.tabPromptGeneratorStates = contentData.tabPromptGeneratorStates;
            safeProject.status = contentData.status || safeProject.status;
            safeProject.tags = contentData.tags || safeProject.tags;
          } catch (parseError) {
            console.warn('⚠️ 프로젝트 content 파싱 실패:', parseError);
          }
        }
        
        console.log('✅ 서버에서 프로젝트 상세 로드 성공:', projectId);
        return safeProject;
      } else {
        console.warn('⚠️ 서버에서 프로젝트 상세 로드 실패:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ 서버 프로젝트 로드 오류:', error);
      return null;
    }
  }, []);

  // 프로젝트 변경 시 서버에 자동 저장
  useEffect(() => {
    if (currentProject && user?.id) {
      const timeoutId = setTimeout(() => {
        saveProjectToServer(currentProject);
      }, 2000); // 2초 디바운스

      return () => clearTimeout(timeoutId);
    }
  }, [currentProject, saveProjectToServer, user?.id]);

  // 브라우저 탭 변경 및 페이지 이탈 시 서버에 저장
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && currentProject) {
        saveProjectToServer(currentProject);
        console.log('📤 브라우저 탭 변경으로 서버에 저장');
      }
    };

    const handleBeforeUnload = () => {
      if (currentProject) {
        // 동기적으로 저장 (페이지 이탈 시)
        navigator.sendBeacon('/api/projects/save-sync', JSON.stringify({
          projectId: currentProject.id,
          data: currentProject
        }));
        console.log('📤 페이지 이탈로 서버에 동기 저장');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentProject, saveProjectToServer]);

  // 프로젝트 상태 변경 시 자동 업데이트 (서버 저장은 별도 useEffect에서 처리)
  useEffect(() => {
    if (currentProject) {
      // workflowData나 tabMessages가 실제로 변경되었는지 확인
      const workflowDataChanged = JSON.stringify(workflowData) !== JSON.stringify(prevWorkflowDataRef.current);
      const tabMessagesChanged = JSON.stringify(tabMessages) !== JSON.stringify(prevTabMessagesRef.current);
      const tabPromptGeneratorStatesChanged = JSON.stringify(tabPromptGeneratorStates) !== JSON.stringify(prevTabPromptGeneratorStatesRef.current);
      
      if (workflowDataChanged || tabMessagesChanged || tabPromptGeneratorStatesChanged) {
        const updatedProject: Project = {
          ...currentProject,
          workflowData,
          tabMessages,
          tabPromptGeneratorStates,
          updatedAt: new Date()
        };
        
        // 로컬 상태만 업데이트 (서버 저장은 위의 useEffect에서 자동 처리)
        setProjects(prev => 
          prev.map(p => p.id === currentProject.id ? updatedProject : p)
        );
        setCurrentProject(updatedProject);
        
        // ref 업데이트
        prevWorkflowDataRef.current = workflowData;
        prevTabMessagesRef.current = tabMessages;
        prevTabPromptGeneratorStatesRef.current = tabPromptGeneratorStates;
        
        console.log('📝 프로젝트 상태 로컬 업데이트 완료 (서버 저장은 자동 처리)');
      }
    }
  }, [workflowData, tabMessages, tabPromptGeneratorStates, currentProject]);

  // 로딩 중이면 로딩 화면 표시
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-light-50 dark:bg-dark-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인되지 않은 경우 인증 페이지 표시
  if (!user) {
    return <AuthPage />;
  }

  // 모바일 디바이스인 경우 모바일 전용 앱 렌더링
  if (isMobile) {
    console.log('🚀 모바일 앱 렌더링 시작');
    return <MobileApp />;
  }

  console.log('🖥️ PC 앱 렌더링 시작');
  return (
    <div className="flex h-screen bg-light-50 dark:bg-dark-900 transition-colors duration-300">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        workflowData={workflowData}
        onHomeClick={handleHomeClick}
        onProjectListClick={handleProjectListClick}
        onProfileClick={handleProfileClick}
        onAdminPageClick={handleAdminPageClick}
        currentProject={currentProject}
        isCollapsed={isSidebarCollapsed}
        onToggle={handleSidebarToggle}
      />
      <div className={`flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} ${isSidebarCollapsed ? 'ml-0' : 'ml-0 md:ml-64'} pb-16 md:pb-0`}>
        {/* 동기화 상태 표시 */}
        <div className="fixed top-4 right-4 z-50">
          <SyncStatus />
        </div>
        
        {showAdminPage ? (
          <AdminPage onBackToDashboard={() => setShowAdminPage(false)} />
        ) : showUserProfile ? (
          <UserProfile onBackToDashboard={() => setShowUserProfile(false)} />
        ) : showProjectList ? (
          <ProjectList
            projects={projects}
            onProjectSelect={handleProjectSelect}
            onNewProject={handleNewProject}
            onDeleteProject={handleDeleteProject}
            onDuplicateProject={handleDuplicateProject}
            currentMainProject={currentMainProject}
            onBackToMainList={handleBackToMainList}
          />
        ) : activeTab === -1 ? (
          <Dashboard
            workflowData={workflowData}
            onTabChange={setActiveTab}
            currentProject={currentProject}
            onProjectListClick={handleProjectListClick}
            onRefreshProjects={fetchUserProjects}
          />
        ) : (
                      <TabContent
              activeTab={activeTab}
              messages={messages}
              onSendMessage={handleSendMessage}
              onDirectInputSave={handleDirectInputSave}
              onDirectInputConfirm={handleDirectInputConfirm}
              onConfirm={handleConfirm}
              onPromptConfirm={handlePromptConfirm}
              workflowData={workflowData}
              isLoading={isLoading}
              uploadedImage={uploadedImage}
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
              onBackToProjectList={handleBackToMainList}
              showBackButton={currentProject?.type === 'sub'}
              onSaveStyle={handleSaveStyle}
              onDeleteStyle={handleDeleteStyle}
              onUpdateStyle={handleUpdateStyle}
              onUseStyle={handleUseStyle}
              onUpdateCharacter={handleUpdateCharacter}
              onConfirmCharacter={handleConfirmCharacter}
              onTabChange={setActiveTab}
              onAddMessage={handleAddMessage}
              onSavePromptGeneratorState={handleSavePromptGeneratorState}
              getPromptGeneratorState={getPromptGeneratorState}
              onScriptsChange={handleScriptsChange}
              currentProject={currentProject}
              onUpdateStyleAnalysis={handleUpdateStyleAnalysis}
            />
        )}
      </div>
      
      {/* 새 프로젝트 모달 */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreateProject={handleCreateProject}
        parentProject={parentProjectForNew}
      />

      {/* 모바일 하단 네비게이션 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-800 border-t border-light-200 dark:border-dark-700 z-50">
        <div className="flex justify-around items-center py-2">
          <button
            onClick={handleHomeClick}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
              activeTab === -1 
                ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'text-light-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">홈</span>
          </button>
          
          <button
            onClick={handleProjectListClick}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
              showProjectList 
                ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'text-light-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400'
            }`}
          >
            <FolderOpen className="w-5 h-5" />
            <span className="text-xs mt-1">프로젝트</span>
          </button>
          
          <button
            onClick={handleProfileClick}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
              showUserProfile 
                ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'text-light-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs mt-1">프로필</span>
          </button>
          
          {user?.email === 'itnamlittle@gmail.com' && (
            <button
              onClick={handleAdminPageClick}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors duration-200 ${
                showAdminPage 
                  ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'text-light-600 dark:text-gray-400 hover:text-primary-500 dark:hover:text-primary-400'
              }`}
            >
              <Lock className="w-5 h-5" />
              <span className="text-xs mt-1">관리</span>
            </button>
          )}
        </div>
      </div>

      {/* 데이터 마이그레이션 모달 */}
      <DataMigrationModal
        isOpen={showMigrationModal}
        onClose={() => setShowMigrationModal(false)}
        userId={user?.id || ''}
        onMigrationComplete={handleMigrationComplete}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App; 