import React from 'react';
import { 
  Home, 
  FolderOpen,
  Palette,
  FileText,
  Users,
  Image,
  Check,
  Sun,
  Moon,
  Film,
  Lock,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types/index';

interface SidebarProps {
  activeTab: number;
  onTabChange: (tabIndex: number) => void;
  workflowData: any;
  onHomeClick?: () => void;
  onProjectListClick?: () => void;
  onProfileClick?: () => void;
  currentProject?: Project | null;
  isCollapsed?: boolean;
  onToggle?: () => void;
  onAdminPageClick?: () => void; // 추가
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  workflowData, 
  onHomeClick, 
  onProjectListClick,
  onProfileClick,
  currentProject,
  isCollapsed = false,
  onToggle,
  onAdminPageClick // 추가
}) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  
  const tabs = [
    { id: 0, title: '스타일 설정', icon: Palette, description: '이미지 스타일 분석' },
    { id: 1, title: '스크립트 작성', icon: FileText, description: '공포 스크립트 작성' },
    { id: 2, title: '캐릭터 설정', icon: Users, description: '캐릭터 시트 생성' },
    { id: 3, title: '프롬프트 생성', icon: Image, description: '장면별 프롬프트 생성' },
    { id: 4, title: '비디오 편집', icon: Film, description: '씬별 비디오 편집' },
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

  // 프로젝트가 선택되지 않았거나 메인 프로젝트인 경우 작업 탭 비활성화
  const isProjectSelected = currentProject && currentProject.type === 'sub';

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-dark-800 h-screen flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 border-r border-light-200 dark:border-dark-700 shadow-sm 
      md:relative md:block 
      ${isCollapsed ? 'hidden md:block' : 'hidden md:block'}`}>
      {/* 상단 섹션 */}
      <div className="flex flex-col p-4 space-y-4">
        {/* 토글 버튼 */}
        <div className="flex justify-between items-center">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-light-900 dark:text-white">Vid Maker</h2>
          )}
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg text-light-600 hover:text-primary-500 hover:bg-light-100 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-dark-700 transition-all duration-200"
              title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* 네비게이션 버튼들 */}
        <div className={`space-y-2 ${isCollapsed ? 'px-1' : ''}`}>
          <button
            onClick={onHomeClick}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isCollapsed ? 'p-2' : 'p-3'} rounded-xl text-light-600 hover:text-primary-500 hover:bg-light-100 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-dark-700 transition-all duration-200`}
            title="대시보드"
          >
            <Home className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
            {!isCollapsed && <span className="ml-3 text-sm font-medium">대시보드</span>}
          </button>
          
          <button
            onClick={onProjectListClick}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isCollapsed ? 'p-2' : 'p-3'} rounded-xl text-light-600 hover:text-primary-500 hover:bg-light-100 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-dark-700 transition-all duration-200`}
            title="프로젝트 목록"
          >
            <FolderOpen className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
            {!isCollapsed && <span className="ml-3 text-sm font-medium">프로젝트</span>}
          </button>
        </div>

        {/* 구분선 */}
        <div className="border-t border-light-200 dark:border-dark-700"></div>

        {/* 현재 프로젝트 정보 */}
        {!isCollapsed && currentProject && currentProject.type === 'sub' && (
          <div className="p-3 bg-light-50 dark:bg-dark-700 rounded-xl">
            <div className="text-xs text-light-500 dark:text-gray-400 mb-1">현재 프로젝트</div>
            <div className="text-sm font-medium text-light-900 dark:text-white truncate" title={currentProject.name}>
              {currentProject.name}
            </div>
          </div>
        )}

        {/* 작업 탭들 */}
        <div className={`space-y-1 ${isCollapsed ? 'px-1' : ''}`}>
          {!isCollapsed && (
            <div className="text-xs text-light-500 dark:text-gray-400 px-3 py-2 font-medium">
              작업 단계
            </div>
          )}
          
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            const isCompleted = isTabCompleted(tab.id);
            const isDisabled = !isProjectSelected;
            
            return (
              <button
                key={tab.id}
                onClick={() => isDisabled ? null : onTabChange(tab.id)}
                disabled={isDisabled}
                className={`relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isCollapsed ? 'p-2' : 'p-3'} rounded-xl transition-all duration-200 ${
                  isDisabled 
                    ? 'text-light-300 dark:text-gray-600 cursor-not-allowed opacity-50'
                    : isActive 
                      ? 'bg-primary-500 text-white shadow-sm' 
                      : 'text-light-600 hover:text-primary-500 hover:bg-light-100 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-dark-700'
                }`}
                title={isDisabled 
                  ? `${tab.title} - 프로젝트를 선택하세요`
                  : `${tab.title} - ${tab.description}`
                }
              >
                {isDisabled ? (
                  <Lock className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
                ) : (
                  <IconComponent className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
                )}
                {!isCollapsed && (
                  <span className="ml-3 text-sm font-medium">{tab.title}</span>
                )}
                {isCompleted && !isDisabled && (
                  <div className={`absolute ${isCollapsed ? '-top-0.5 -right-0.5' : 'right-2'} ${isCollapsed ? 'w-2.5 h-2.5' : 'w-3 h-3'} bg-toss-success rounded-full flex items-center justify-center shadow-sm`}>
                    <Check className={`${isCollapsed ? 'w-1.5 h-1.5' : 'w-2 h-2'} text-white`} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* 하단 영역 - 사용자 정보 및 설정 */}
      <div className={`mt-auto p-4 ${isCollapsed ? 'px-1' : ''} space-y-2`}>
        {/* 어드민 페이지 버튼 (admin 계정만) */}
        {user && (user.email === 'admin@vidmaker.com' || user.subscription_type === 'admin') && (
          <button
            onClick={onAdminPageClick}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isCollapsed ? 'p-2' : 'p-3'} rounded-xl text-indigo-600 hover:text-white hover:bg-indigo-500 dark:text-indigo-400 dark:hover:text-white dark:hover:bg-indigo-700 transition-all duration-200`}
            title="어드민 페이지"
          >
            <Lock className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
            {!isCollapsed && (
              <span className="ml-3 text-sm font-medium">어드민 페이지</span>
            )}
          </button>
        )}
        {/* 사용자 정보 */}
        {!isCollapsed && user && (
          <div className="p-3 bg-light-50 dark:bg-dark-700 rounded-xl">
            <div className="text-xs text-light-500 dark:text-gray-400 mb-1">로그인된 사용자</div>
            <div className="text-sm font-medium text-light-900 dark:text-white truncate" title={user.username}>
              {user.username}
            </div>
          </div>
        )}

        {/* 사용자 프로필 버튼 */}
        <button
          onClick={onProfileClick}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isCollapsed ? 'p-2' : 'p-3'} rounded-xl text-light-600 hover:text-primary-500 hover:bg-light-100 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-dark-700 transition-all duration-200`}
          title="사용자 프로필"
        >
          <User className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
          {!isCollapsed && (
            <span className="ml-3 text-sm font-medium">프로필</span>
          )}
        </button>

        {/* 테마 토글 */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isCollapsed ? 'p-2' : 'p-3'} rounded-xl text-light-600 hover:text-primary-500 hover:bg-light-100 dark:text-gray-400 dark:hover:text-primary-400 dark:hover:bg-dark-700 transition-all duration-200`}
          title={theme === 'dark' ? '라이트모드로 전환' : '다크모드로 전환'}
        >
          {theme === 'dark' ? (
            <Sun className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
          ) : (
            <Moon className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
          )}
          {!isCollapsed && (
            <span className="ml-3 text-sm font-medium">
              {theme === 'dark' ? '라이트 모드' : '다크 모드'}
            </span>
          )}
        </button>

        {/* 로그아웃 버튼 */}
        <button
          onClick={logout}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-start'} ${isCollapsed ? 'p-2' : 'p-3'} rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 transition-all duration-200`}
          title="로그아웃"
        >
          <LogOut className={`${isCollapsed ? 'w-4 h-4' : 'w-5 h-5'}`} />
          {!isCollapsed && (
            <span className="ml-3 text-sm font-medium">로그아웃</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 