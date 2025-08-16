import React from 'react';
import { 
  Palette, 
  FileText, 
  Users, 
  Image, 
  Check, 
  Clock,
  TrendingUp,
  BarChart3,
  FolderOpen
} from 'lucide-react';
import { Project } from '../types/index';

interface DashboardProps {
  workflowData: any;
  onTabChange: (tabIndex: number) => void;
  currentProject?: Project | null;
  onProjectListClick?: () => void;
  onRefreshProjects?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  workflowData, 
  onTabChange, 
  currentProject,
  onProjectListClick,
  onRefreshProjects 
}) => {
  const tabs = [
    { id: 0, title: '스타일 설정', icon: Palette, description: '이미지 스타일 분석' },
    { id: 1, title: '스크립트 작성', icon: FileText, description: '공포 스크립트 작성' },
    { id: 2, title: '캐릭터 설정', icon: Users, description: '캐릭터 시트 생성' },
    { id: 3, title: '최종생성', icon: Image, description: '장면별 프롬프트 생성' }
  ];

  const isTabCompleted = (tabIndex: number) => {
    switch (tabIndex) {
      case 0: return workflowData.styleAnalysis?.confirmed;
      case 1: return workflowData.script?.confirmed;
      case 2: return workflowData.characters?.some((char: any) => char.confirmed);
      case 3: return workflowData.prompts?.some((prompt: any) => prompt.sceneNumber > 0 && prompt.confirmed);
      default: return false;
    }
  };

  const getProgressPercentage = () => {
    const completedSteps = tabs.filter(tab => isTabCompleted(tab.id)).length;
    return Math.round((completedSteps / tabs.length) * 100);
  };

  const getNextIncompleteTab = () => {
    return tabs.find(tab => !isTabCompleted(tab.id));
  };

  // 프로젝트가 선택되지 않았거나 메인 프로젝트인 경우
  if (!currentProject || currentProject.type !== 'sub') {
    return (
      <div className="flex-1 flex flex-col h-full">
        {/* 헤더 */}
        <div className="p-6 border-b border-light-200 dark:border-dark-700 transition-colors duration-300">
          <h1 className="text-2xl font-bold text-light-900 dark:text-white mb-2 transition-colors duration-300">대시보드</h1>
          <p className="text-light-600 dark:text-gray-400 transition-colors duration-300">AI 스토리 생성 프로젝트 관리</p>
        </div>

        {/* 프로젝트 선택 안내 */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <FolderOpen className="w-10 h-10 text-primary-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-light-900 dark:text-white mb-3">
              프로젝트를 선택하세요
            </h2>
            
            <p className="text-light-600 dark:text-gray-400 mb-6">
              작업을 시작하려면 먼저 프로젝트를 선택하거나 새로 만들어야 합니다.
              프로젝트별로 스타일, 스크립트, 캐릭터 등의 데이터가 분리되어 관리됩니다.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={onProjectListClick}
                className="w-full toss-button flex items-center justify-center space-x-2"
              >
                <FolderOpen className="w-4 h-4" />
                <span>프로젝트 목록 보기</span>
              </button>
              
              {onRefreshProjects && (
                <button
                  onClick={() => {
                    console.log('🔄 수동 프로젝트 새로고침 버튼 클릭');
                    onRefreshProjects();
                  }}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>프로젝트 새로고침</span>
                </button>
              )}
              
              <p className="text-sm text-light-500 dark:text-gray-400">
                또는 사이드바의 <FolderOpen className="w-4 h-4 inline" /> 버튼을 클릭하세요
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = getProgressPercentage();
  const nextTab = getNextIncompleteTab();

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-4 md:p-6 border-b border-light-200 dark:border-dark-700 transition-colors duration-300">
        <h1 className="text-xl md:text-2xl font-bold text-light-900 dark:text-white mb-2 transition-colors duration-300">대시보드</h1>
        <p className="text-sm md:text-base text-light-600 dark:text-gray-400 transition-colors duration-300 truncate">
          {currentProject.name} - 프로젝트 진행 상황
        </p>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto toss-scrollbar">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          
          {/* 진행률 카드 */}
          <div className="toss-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-light-900 dark:text-white">전체 진행률</h2>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-primary-500" />
                <span className="text-2xl font-bold text-primary-500">{progressPercentage}%</span>
              </div>
            </div>
            
            {/* 진행률 바 */}
            <div className="w-full bg-light-200 dark:bg-dark-700 rounded-full h-3 mb-4">
              <div 
                className="bg-primary-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            <p className="text-sm text-light-600 dark:text-gray-400">
              {progressPercentage === 100 
                ? '모든 단계가 완료되었습니다! 🎉' 
                : `${tabs.length - tabs.filter(tab => isTabCompleted(tab.id)).length}개 단계가 남았습니다.`
              }
            </p>
          </div>

          {/* 다음 단계 카드 */}
          {nextTab && (
            <div className="toss-card bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
              <div className="flex items-center space-x-3 mb-3">
                <Clock className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">다음 단계</h3>
              </div>
              <p className="text-primary-600 dark:text-primary-400 mb-4">
                {nextTab.title}를 진행해보세요
              </p>
              <button
                onClick={() => onTabChange(nextTab.id)}
                className="toss-button"
              >
                {nextTab.title} 시작하기
              </button>
            </div>
          )}

          {/* 단계별 진행 상황 */}
          <div className="toss-card">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-light-900 dark:text-white">단계별 진행 상황</h2>
            </div>
            
            <div className="space-y-3">
              {tabs.map((tab, index) => {
                const IconComponent = tab.icon;
                const isCompleted = isTabCompleted(tab.id);
                
                return (
                  <div
                    key={tab.id}
                    className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isCompleted
                        ? 'bg-light-50 dark:bg-dark-700 border-light-200 dark:border-dark-600'
                        : 'bg-white dark:bg-dark-800 border-light-200 dark:border-dark-600 hover:border-primary-300 dark:hover:border-primary-600'
                    }`}
                    onClick={() => onTabChange(tab.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center ${
                        isCompleted 
                          ? 'bg-toss-success text-white' 
                          : 'bg-light-200 dark:bg-dark-700 text-light-600 dark:text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <Check className="w-4 h-4 md:w-5 md:h-5" />
                        ) : (
                          <IconComponent className="w-4 h-4 md:w-5 md:h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-medium text-sm md:text-base ${
                          isCompleted 
                            ? 'text-light-900 dark:text-white' 
                            : 'text-light-700 dark:text-gray-300'
                        }`}>
                          {tab.title}
                        </h3>
                        <p className="text-xs md:text-sm text-light-500 dark:text-gray-400 truncate">
                          {tab.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {isCompleted && (
                        <span className="text-xs bg-toss-success text-white px-2 py-1 rounded-full">
                          완료
                        </span>
                      )}
                      <span className="text-sm text-light-500 dark:text-gray-400">
                        {index + 1}/{tabs.length}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="toss-card">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <Palette className="w-4 h-4 md:w-5 md:h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-light-500 dark:text-gray-400">스타일 분석</p>
                  <p className="text-base md:text-lg font-semibold text-light-900 dark:text-white">
                    {workflowData.styleAnalysis?.confirmed ? '완료' : '대기'}
                  </p>
                </div>
              </div>
            </div>

            <div className="toss-card">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 md:w-5 md:h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-light-500 dark:text-gray-400">캐릭터</p>
                  <p className="text-base md:text-lg font-semibold text-light-900 dark:text-white">
                    {workflowData.characters?.filter((char: any) => char.confirmed).length || 0}개
                  </p>
                </div>
              </div>
            </div>

            <div className="toss-card sm:col-span-2 lg:col-span-1">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <Image className="w-4 h-4 md:w-5 md:h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-light-500 dark:text-gray-400">프롬프트</p>
                  <p className="text-base md:text-lg font-semibold text-light-900 dark:text-white">
                    {workflowData.prompts?.filter((prompt: any) => prompt.confirmed).length || 0}개
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 