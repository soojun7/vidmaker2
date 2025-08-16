import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Plus, 
  User, 
  ArrowLeft, 
  ArrowRight,
  Upload,
  Mic,
  Play,
  Share2,
  Check,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';
import SyncStatus from './SyncStatus';

// API Project 타입을 로컬 타입으로 변환하는 함수
const convertApiProjectToProject = (apiProject: any): Project => ({
  id: apiProject.id,
  name: apiProject.title || '제목 없음',
  description: apiProject.description,
  createdAt: new Date(apiProject.created_at),
  updatedAt: new Date(apiProject.updated_at),
  workflowData: {},
  tabMessages: {},
  status: 'draft' as const,
  level: 0,
  type: 'main' as const
});

interface MobileAppProps {
  // 데스크톱과 동일한 props들
  onBack?: () => void;
}

const MobileApp: React.FC<MobileAppProps> = ({ onBack }) => {
  const { user, token } = useAuth();
  const [currentView, setCurrentView] = useState<'home' | 'projects' | 'workflow' | 'profile' | 'project-edit'>('home');
  const [workflowStep, setWorkflowStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // 디버깅용 로그
  useEffect(() => {
    console.log('🔥 MobileApp 컴포넌트 로드됨');
    console.log('📱 사용자 정보:', user);
    console.log('🔑 토큰 존재:', !!token);
  }, []);

  useEffect(() => {
    console.log('📊 프로젝트 상태 변경:', projects);
  }, [projects]);

  // 프로젝트 데이터 로드
  useEffect(() => {
    if (user && token) {
      loadProjects();
    }
  }, [user, token]);

  const loadProjects = async () => {
    try {
      console.log('🔄 프로젝트 로드 시작...', { user: user?.email, hasToken: !!token });
      setLoading(true);
      
      // API에서 직접 fetch 호출 (projectApi 대신)
      const response = await fetch('/api/projects', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('프로젝트 로드 실패');
      }
      
      const data = await response.json();
      const apiProjects = data.projects || [];
      console.log('✅ 프로젝트 로드 완료:', apiProjects);
      
      // API 프로젝트를 로컬 타입으로 변환
      const convertedProjects = apiProjects.map(convertApiProjectToProject);
      setProjects(convertedProjects);
    } catch (error) {
      console.error('❌ 프로젝트 로드 오류:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // 워크플로우 단계들 (PC 버전과 동일)
  const workflowSteps = [
    { id: 0, title: '스타일 설정', icon: Upload, desc: '이미지 스타일 분석 및 설정' },
    { id: 1, title: '스크립트 작성', icon: Mic, desc: '공포 스크립트 작성' },
    { id: 2, title: '캐릭터 설정', icon: User, desc: '캐릭터 시트 생성' },
    { id: 3, title: '프롬프트 생성', icon: Settings, desc: '장면별 프롬프트 생성' },
    { id: 4, title: '비디오 편집', icon: Play, desc: '씬별 비디오 편집' }
  ];

  // 페이지 전환 애니메이션
  const handleViewChange = (newView: typeof currentView) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentView(newView);
      setIsTransitioning(false);
    }, 150);
  };

  // 프로젝트 선택 핸들러
  const handleProjectClick = (project: Project) => {
    console.log('📱 프로젝트 선택됨:', project);
    console.log('🔥 handleProjectClick 함수 실행됨');
    
    // 프로젝트 설정 및 편집 모드로 이동
    setSelectedProject(project);
    setWorkflowStep(0); // 워크플로우 첫 단계부터 시작
    handleViewChange('project-edit');
  };

  // 터치 이벤트 디버깅 핸들러
  const handleTouchDebug = (event: any, project: Project) => {
    console.log('👆 터치 이벤트 발생:', {
      type: event.type,
      target: event.target.tagName,
      projectName: project.name,
      timestamp: new Date().toISOString()
    });
  };

  // 메인 홈 화면
  const renderHome = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-primary-50 to-white dark:from-dark-900 dark:to-dark-800">
      {/* 헤더 */}
      <div className="px-6 pt-16 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">안녕하세요!</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">무엇을 만들어볼까요?</p>
          </div>
          <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* 빠른 액션 카드 */}
        <div className="bg-white dark:bg-dark-700 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-dark-600">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">새 프로젝트</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">AI로 영상을 만들어보세요</p>
            </div>
            <button
              onClick={() => {
                setWorkflowStep(0);
                handleViewChange('workflow');
              }}
              className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-lg hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-7 h-7 text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* 최근 프로젝트 */}
      <div className="flex-1 px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">최근 프로젝트</h2>
          <button 
            onClick={() => handleViewChange('projects')}
            className="text-primary-500 text-sm font-medium"
          >
            전체보기
          </button>
        </div>

        {/* 프로젝트 카드들 */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">프로젝트 로딩 중...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 dark:text-gray-400">아직 프로젝트가 없습니다</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">새 프로젝트를 만들어보세요!</p>
            </div>
          ) : (
            projects.slice(0, 3).map((project) => (
              <div 
                key={project.id} 
                onClick={() => handleProjectClick(project)}
                onTouchStart={(e) => handleTouchDebug(e, project)}
                onTouchEnd={(e) => handleTouchDebug(e, project)}
                onMouseDown={(e) => handleTouchDebug(e, project)}
                style={{ WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                className="bg-white dark:bg-dark-700 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors active:scale-95 transform touch-manipulation"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                    <Play className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {project.updatedAt.toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log('🔘 화살표 버튼 클릭됨');
                      handleProjectClick(project);
                    }}
                    className="p-2 text-gray-400 hover:text-primary-500 touch-manipulation"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // 워크플로우 화면
  const renderWorkflow = () => {
    const currentStep = workflowSteps[workflowStep];
    const IconComponent = currentStep.icon;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-dark-900">
        {/* 헤더 */}
        <div className="px-6 pt-16 pb-6 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => {
                // 선택된 프로젝트가 있으면 프로젝트 편집으로, 없으면 홈으로
                if (selectedProject) {
                  handleViewChange('project-edit');
                } else {
                  handleViewChange('home');
                }
              }}
              className="p-2 text-white/80 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="text-white/80 text-sm">
                {selectedProject ? `${selectedProject.name} - ` : ''}단계 {workflowStep + 1}/5
              </div>
              <h1 className="text-white text-xl font-semibold">{currentStep.title}</h1>
            </div>
            <button className="p-2 text-white/80 hover:text-white">
              <Settings className="w-6 h-6" />
            </button>
          </div>

          {/* 진행률 바 */}
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-white rounded-full h-2 transition-all duration-500"
              style={{ width: `${((workflowStep + 1) / 5) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 p-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <IconComponent className="w-10 h-10 text-primary-500" />
            </div>
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              {currentStep.desc}
            </p>
          </div>

          {/* 단계별 콘텐츠 */}
          <div className="bg-gray-50 dark:bg-dark-800 rounded-2xl p-6 min-h-80">
            {workflowStep === 0 && (
              <div className="text-center space-y-6">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">이미지를 업로드하거나<br />카메라로 촬영하세요</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-dark-600">
                    <Upload className="w-6 h-6 text-gray-600 dark:text-gray-300 mx-auto mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-300">갤러리</span>
                  </button>
                  <button className="bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-dark-600">
                    <div className="w-6 h-6 bg-gray-600 dark:bg-gray-300 rounded mx-auto mb-2"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">카메라</span>
                  </button>
                </div>
              </div>
            )}

            {workflowStep === 1 && (
              <div className="space-y-6">
                <textarea
                  placeholder="공포 스크립트를 입력하세요..."
                  className="w-full h-40 p-4 border border-gray-200 dark:border-dark-600 rounded-xl bg-white dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                ></textarea>
                <div className="flex justify-center">
                  <button className="bg-primary-500 text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:bg-primary-600">
                    <Mic className="w-5 h-5" />
                    <span>음성으로 입력</span>
                  </button>
                </div>
              </div>
            )}

            {workflowStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">캐릭터 설정</h3>
                {[1, 2].map((char) => (
                  <div key={char} className="bg-white dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-dark-600">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <input
                        placeholder={`캐릭터 ${char} 이름`}
                        className="flex-1 px-3 py-2 border border-gray-200 dark:border-dark-600 rounded-lg bg-gray-50 dark:bg-dark-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      />
                    </div>
                    <textarea
                      placeholder="캐릭터 설명..."
                      className="w-full h-20 p-3 border border-gray-200 dark:border-dark-600 rounded-lg bg-gray-50 dark:bg-dark-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                    ></textarea>
                  </div>
                ))}
              </div>
            )}

            {workflowStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">프롬프트 생성</h3>
                <div className="bg-white dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-dark-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">장면별 프롬프트</span>
                    <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-2 py-1 rounded">자동 생성</span>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((scene) => (
                      <div key={scene} className="bg-gray-50 dark:bg-dark-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">장면 {scene}</span>
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">프롬프트가 생성되었습니다</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="w-full bg-primary-500 text-white py-3 rounded-xl font-medium hover:bg-primary-600">
                  프롬프트 재생성
                </button>
              </div>
            )}

            {workflowStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">비디오 편집</h3>
                <div className="bg-white dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-dark-600">
                  <div className="text-center mb-4">
                    <div className="w-full h-32 bg-gray-100 dark:bg-dark-800 rounded-lg flex items-center justify-center mb-3">
                      <Play className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">프리뷰 영상</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300">음성 설정</span>
                      <button className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">설정</button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700 dark:text-gray-300">자막 설정</span>
                      <button className="text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded">편집</button>
                    </div>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-to-r from-primary-500 to-primary-600 text-white py-4 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-primary-600 hover:to-primary-700">
                  <Play className="w-5 h-5" />
                  <span>최종 비디오 생성</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <div className="p-6 bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700">
          <div className="flex justify-between">
            <button
              onClick={() => setWorkflowStep(Math.max(0, workflowStep - 1))}
              disabled={workflowStep === 0}
              className="px-6 py-3 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <button
              onClick={() => setWorkflowStep(Math.min(4, workflowStep + 1))}
              disabled={workflowStep === 4}
              className="px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {workflowStep === 4 ? '완료' : '다음'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 프로젝트 리스트
  const renderProjects = () => (
    <div className="flex flex-col h-full bg-white dark:bg-dark-900">
      <div className="px-6 pt-16 pb-6">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => handleViewChange('home')}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">프로젝트</h1>
          <button 
            onClick={() => {
              setWorkflowStep(0);
              handleViewChange('workflow');
            }}
            className="p-2 text-primary-500 hover:text-primary-600"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 px-6">
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">프로젝트 로딩 중...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">프로젝트가 없습니다</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">첫 번째 AI 비디오를 만들어보세요!</p>
              <button
                onClick={() => {
                  setWorkflowStep(0);
                  handleViewChange('workflow');
                }}
                className="bg-primary-500 text-white px-6 py-3 rounded-xl hover:bg-primary-600 transition-colors"
              >
                새 프로젝트 시작
              </button>
            </div>
          ) : (
            projects.map((project) => (
              <div 
                key={project.id} 
                onClick={() => handleProjectClick(project)}
                onTouchStart={(e) => handleTouchDebug(e, project)}
                onTouchEnd={(e) => handleTouchDebug(e, project)}
                onMouseDown={(e) => handleTouchDebug(e, project)}
                style={{ WebkitTapHighlightColor: 'rgba(0,0,0,0.1)' }}
                className="bg-white dark:bg-dark-700 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors active:scale-95 transform touch-manipulation"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{project.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      {project.description || 'AI 비디오 프로젝트'}
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${project.status === 'completed' ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {project.status === 'completed' ? '완료' : '진행중'}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400">
                        {project.updatedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation(); // 프로젝트 클릭 이벤트 방지
                      console.log('📤 공유 버튼 클릭:', project.name);
                      alert(`프로젝트 "${project.name}" 공유 기능은 곧 추가됩니다!`);
                    }}
                    className="p-2 text-gray-400 hover:text-primary-500"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // 프로젝트 편집 화면
  const renderProjectEdit = () => {
    if (!selectedProject) {
      return (
        <div className="flex flex-col h-full bg-white dark:bg-dark-900 items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">프로젝트를 찾을 수 없습니다.</p>
          <button 
            onClick={() => handleViewChange('home')}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg"
          >
            홈으로 돌아가기
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full bg-white dark:bg-dark-900">
        {/* 헤더 */}
        <div className="px-6 pt-16 pb-6 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => handleViewChange('home')}
              className="p-2 text-white/80 hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-center">
              <div className="text-white/80 text-sm">프로젝트 편집</div>
              <h1 className="text-white text-xl font-semibold">{selectedProject.name}</h1>
            </div>
            <button 
              onClick={() => {
                alert('프로젝트 설정 메뉴는 곧 추가됩니다!');
              }}
              className="p-2 text-white/80 hover:text-white"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>

          {/* 프로젝트 정보 */}
          <div className="bg-white/10 rounded-xl p-4 mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium">{selectedProject.name}</h3>
                <p className="text-white/70 text-sm">
                  {selectedProject.description || 'AI 비디오 프로젝트'}
                </p>
                <p className="text-white/60 text-xs">
                  {selectedProject.updatedAt.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 워크플로우 단계 선택 */}
        <div className="flex-1 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">편집할 단계를 선택하세요</h2>
          
          <div className="space-y-3">
            {workflowSteps.map((step, index) => {
              const IconComponent = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    setWorkflowStep(index);
                    handleViewChange('workflow');
                  }}
                  className="w-full bg-white dark:bg-dark-700 rounded-xl p-4 border border-gray-200 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                      <IconComponent className="w-6 h-6 text-primary-500" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-medium text-gray-900 dark:text-white">{step.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{step.desc}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* 빠른 액션 */}
          <div className="mt-8 space-y-3">
            <h3 className="text-md font-medium text-gray-900 dark:text-white">빠른 액션</h3>
            
            <button 
              onClick={() => {
                alert('프로젝트 미리보기 기능은 곧 추가됩니다!');
              }}
              className="w-full bg-green-500 text-white rounded-xl p-4 flex items-center justify-center space-x-2 hover:bg-green-600 transition-colors"
            >
              <Play className="w-5 h-5" />
              <span>프로젝트 미리보기</span>
            </button>

            <button 
              onClick={() => {
                alert('프로젝트 공유 기능은 곧 추가됩니다!');
              }}
              className="w-full bg-blue-500 text-white rounded-xl p-4 flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              <span>프로젝트 공유</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 프로필 화면
  const renderProfile = () => (
    <div className="flex flex-col h-full bg-white dark:bg-dark-900">
      <div className="px-6 pt-16 pb-6">
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => handleViewChange('home')}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">프로필</h1>
          <div className="w-10"></div>
        </div>

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{user?.email}</h2>
          <p className="text-gray-600 dark:text-gray-300">크리에이터</p>
        </div>
      </div>

      <div className="flex-1 px-6">
        <div className="space-y-3">
          {[
            { title: '계정 설정', desc: '프로필 및 보안 설정' },
            { title: '구독 관리', desc: '플랜 및 결제 정보' },
            { title: '고객 지원', desc: '도움말 및 문의' },
            { title: '알림 설정', desc: '푸시 알림 관리' }
          ].map((item, index) => (
            <div key={index} className="bg-white dark:bg-dark-700 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-dark-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden">
      {/* 동기화 상태 (모바일) */}
      <div className="fixed top-4 right-4 z-50">
        <SyncStatus />
      </div>
      
      {/* 메인 콘텐츠 */}
      <div className={`h-full transition-opacity duration-150 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentView === 'home' && renderHome()}
        {currentView === 'workflow' && renderWorkflow()}
        {currentView === 'projects' && renderProjects()}
        {currentView === 'profile' && renderProfile()}
        {currentView === 'project-edit' && renderProjectEdit()}
      </div>

      {/* 하단 탭 네비게이션 (홈과 프로젝트에서만) */}
      {(currentView === 'home' || currentView === 'projects' || currentView === 'profile') && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-800 border-t border-gray-200 dark:border-dark-700 px-6 py-4 safe-area-bottom">
          <div className="flex justify-around">
            <button
              onClick={() => handleViewChange('home')}
              className={`flex flex-col items-center space-y-1 ${
                currentView === 'home' ? 'text-primary-500' : 'text-gray-400'
              }`}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs">홈</span>
            </button>
            <button
              onClick={() => handleViewChange('projects')}
              className={`flex flex-col items-center space-y-1 ${
                currentView === 'projects' ? 'text-primary-500' : 'text-gray-400'
              }`}
            >
              <Play className="w-6 h-6" />
              <span className="text-xs">프로젝트</span>
            </button>
            <button
              onClick={() => {
                setWorkflowStep(0);
                handleViewChange('workflow');
              }}
              className="flex flex-col items-center space-y-1 text-gray-400"
            >
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mb-1">
                <Plus className="w-6 h-6 text-white" />
              </div>
            </button>
            <button
              onClick={() => handleViewChange('profile')}
              className={`flex flex-col items-center space-y-1 ${
                currentView === 'profile' ? 'text-primary-500' : 'text-gray-400'
              }`}
            >
              <User className="w-6 h-6" />
              <span className="text-xs">프로필</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileApp;
