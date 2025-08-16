import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Copy,
  Calendar,
  Tag,
  Image as ImageIcon,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Project } from '../types/index';

interface ProjectListProps {
  projects: Project[];
  onProjectSelect: (project: Project) => void;
  onNewProject: (parentId?: string) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (project: Project) => void;
  currentMainProject?: Project | null;
  onBackToMainList?: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onProjectSelect,
  onNewProject,
  onDeleteProject,
  onDuplicateProject,
  currentMainProject,
  onBackToMainList
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'in-progress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'name'>('updatedAt');
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // 디버깅용: 뒤로가기 버튼 조건 확인
  useEffect(() => {
    console.log('ProjectList 렌더링 - 뒤로가기 버튼 조건 확인:', { 
      currentMainProject: !!currentMainProject, 
      onBackToMainList: !!onBackToMainList,
      currentMainProjectType: currentMainProject?.type,
      currentMainProjectName: currentMainProject?.name
    });
  }, [currentMainProject, onBackToMainList]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 계층적 구조로 프로젝트 정리
  const buildProjectTree = (projects: Project[]): Project[] => {
    const projectMap = new Map<string, Project>();
    const rootProjects: Project[] = [];

    // 모든 프로젝트를 맵에 추가
    projects.forEach(project => {
      projectMap.set(project.id, { ...project, children: [] });
    });

    // 계층 구조 구성
    projects.forEach(project => {
      const projectWithChildren = projectMap.get(project.id)!;
      
      if (project.parentId && projectMap.has(project.parentId)) {
        const parent = projectMap.get(project.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(projectWithChildren);
      } else {
        rootProjects.push(projectWithChildren);
      }
    });

    return rootProjects;
  };

  // 현재 메인 프로젝트가 있으면 해당 프로젝트의 하위 프로젝트들만 필터링
  const getProjectsToShow = () => {
    if (currentMainProject) {
      return projects.filter(project => project.parentId === currentMainProject.id);
    }
    return buildProjectTree(projects);
  };

  const projectTree = getProjectsToShow();

  const toggleExpanded = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const filteredProjects = projectTree
    .filter(project => {
      const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (project.tags && project.tags.some(tag => tag && tag.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'updatedAt':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-light-200 dark:bg-dark-700 text-light-700 dark:text-gray-300';
      case 'in-progress':
        return 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300';
      case 'completed':
        return 'bg-toss-success/10 text-toss-success';
      default:
        return 'bg-light-200 dark:bg-dark-700 text-light-700 dark:text-gray-300';
    }
  };

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'draft':
        return '초안';
      case 'in-progress':
        return '진행중';
      case 'completed':
        return '완료';
      default:
        return '알 수 없음';
    }
  };

  const getProgressPercentage = (project: Project) => {
    const tabs = ['styleAnalysis', 'script', 'characters', 'prompts'];
    const completedSteps = tabs.filter(tab => {
      // workflowData가 없으면 안전하게 처리
      if (!project.workflowData) return false;
      
      switch (tab) {
        case 'styleAnalysis':
          return project.workflowData.styleAnalysis?.confirmed;
        case 'script':
          return project.workflowData.script?.confirmed;
        case 'characters':
          return project.workflowData.characters?.some(char => char.confirmed);
        case 'prompts':
          return project.workflowData.prompts?.some(prompt => prompt.sceneNumber > 0 && prompt.confirmed);
        default:
          return false;
      }
    }).length;
    
    return Math.round((completedSteps / tabs.length) * 100);
  };

  const renderProjectCard = (project: Project, level: number = 0) => {
    const progressPercentage = getProgressPercentage(project);
    const isExpanded = expandedProjects.has(project.id);
    const hasChildren = project.children && project.children.length > 0;

    return (
      <div key={project.id} className="space-y-4">
        <div
          className={`toss-card hover:shadow-md transition-all duration-200 cursor-pointer group ${
            level > 0 ? 'ml-6 border-l-2 border-light-200 dark:border-dark-700' : ''
          } ${!currentMainProject ? 'h-80 flex flex-col' : 'min-h-fit'}`}
          onClick={() => onProjectSelect(project)}
        >
          {/* 프로젝트 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpanded(project.id);
                  }}
                  className="p-1 hover:bg-light-100 dark:hover:bg-dark-700 rounded transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-light-600 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-light-600 dark:text-gray-400" />
                  )}
                </button>
              )}
              
              {project.type === 'main' ? (
                <FolderOpen className="w-5 h-5 text-primary-500" />
              ) : (
                <Folder className="w-5 h-5 text-light-500 dark:text-gray-400" />
              )}
              
              <h3 className="font-semibold text-light-900 dark:text-white">
                {project.name}
              </h3>
              
              {project.type === 'main' && (
                <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full">
                  메인
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(project.status)}`}>
                {getStatusText(project.status)}
              </span>
              
              {/* 액션 버튼 */}
              <div className="relative dropdown-container">
                <button 
                  className="w-8 h-8 bg-white dark:bg-dark-800 rounded-full flex items-center justify-center shadow-sm border border-light-200 dark:border-dark-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdown(openDropdown === project.id ? null : project.id);
                  }}
                >
                  <MoreVertical className="w-4 h-4 text-light-600 dark:text-gray-400" />
                </button>
                
                {/* 드롭다운 메뉴 */}
                {openDropdown === project.id && (
                  <div className="absolute right-0 top-10 w-40 bg-white dark:bg-dark-800 rounded-lg shadow-lg border border-light-200 dark:border-dark-700 py-1 z-10">
                    {project.type === 'main' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewProject(project.id);
                          setOpenDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-light-700 dark:text-gray-300 hover:bg-light-100 dark:hover:bg-dark-700 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>하위 프로젝트 추가</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateProject(project);
                        setOpenDropdown(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-light-700 dark:text-gray-300 hover:bg-light-100 dark:hover:bg-dark-700 flex items-center space-x-2"
                    >
                      <Copy className="w-4 h-4" />
                      <span>복제</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                        setOpenDropdown(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-toss-error hover:bg-light-100 dark:hover:bg-dark-700 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>삭제</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 썸네일 */}
          {!currentMainProject && (
            <div className="relative mb-4">
              {project.thumbnail ? (
                <img
                  src={project.thumbnail}
                  alt={project.name}
                  className="w-full h-40 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-40 bg-light-100 dark:bg-dark-700 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-light-500 dark:text-gray-400" />
                </div>
              )}
              
              {/* 진행률 오버레이 */}
              <div className="absolute bottom-2 left-2 right-2">
                <div className="bg-black bg-opacity-50 rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          {/* 프로젝트 정보 */}
          <div className={!currentMainProject ? 'flex-1 flex flex-col' : ''}>
            {project.description && (
              <p className={`text-light-600 dark:text-gray-400 mb-3 line-clamp-2 ${!currentMainProject ? 'text-sm flex-1' : 'text-sm'}`}>
                {project.description}
              </p>
            )}
            
            {/* 태그 */}
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {project.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="text-xs bg-light-100 dark:bg-dark-700 text-light-600 dark:text-gray-400 px-2 py-1 rounded-full flex items-center space-x-1"
                  >
                    <Tag className="w-3 h-3" />
                    <span>{tag}</span>
                  </span>
                ))}
                {project.tags.length > 3 && (
                  <span className="text-xs text-light-500 dark:text-gray-500">
                    +{project.tags.length - 3}
                  </span>
                )}
              </div>
            )}
            
            {/* 메타 정보 */}
            <div className={`flex items-center justify-between text-xs text-light-500 dark:text-gray-500 ${!currentMainProject ? 'mt-auto' : ''}`}>
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
              </div>
              {!currentMainProject && <span>{progressPercentage}% 완료</span>}
            </div>
          </div>
        </div>

        {/* 하위 프로젝트들 */}
        {isExpanded && hasChildren && (
          <div className="space-y-4">
            {project.children!.map(child => renderProjectCard(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* 헤더 */}
      <div className="p-6 border-b border-light-200 dark:border-dark-700 transition-colors duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {currentMainProject && onBackToMainList && (
              <button
                onClick={() => {
                  console.log('뒤로가기 버튼 클릭됨');
                  console.log('클릭 시 상태:', { 
                    currentMainProject, 
                    onBackToMainList: !!onBackToMainList 
                  });
                  onBackToMainList();
                }}
                className="p-2 rounded-lg hover:bg-light-100 dark:hover:bg-dark-700 transition-colors"
                title="메인 프로젝트 목록으로 돌아가기"
              >
                <ChevronRight className="w-5 h-5 text-light-600 dark:text-gray-400 rotate-180" />
              </button>
            )}

            <h1 className="text-2xl font-bold text-light-900 dark:text-white">
              {currentMainProject ? `${currentMainProject.name} - 하위 프로젝트` : '메인 프로젝트'}
            </h1>
          </div>
          <button
            onClick={() => onNewProject(currentMainProject?.id)}
            className="toss-button flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{currentMainProject ? '새 하위 프로젝트' : '새 메인 프로젝트'}</span>
          </button>
        </div>
        
        {/* 검색 및 필터 */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-light-500 dark:text-gray-400" />
            <input
              type="text"
              placeholder="프로젝트 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="toss-input pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="toss-input w-auto"
            >
              <option value="all">모든 상태</option>
              <option value="draft">초안</option>
              <option value="in-progress">진행중</option>
              <option value="completed">완료</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="toss-input w-auto"
            >
              <option value="updatedAt">최근 수정</option>
              <option value="createdAt">생성일</option>
              <option value="name">이름순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div className="flex-1 p-6 overflow-y-auto toss-scrollbar">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-light-100 dark:bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <ImageIcon className="w-8 h-8 text-light-500 dark:text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-light-900 dark:text-white mb-2">
              {searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다' : 
               currentMainProject ? '하위 프로젝트가 없습니다' : '메인 프로젝트가 없습니다'}
            </h3>
            <p className="text-light-600 dark:text-gray-400 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? '다른 검색어나 필터를 시도해보세요' 
                : currentMainProject 
                  ? '새 하위 프로젝트를 만들어보세요'
                  : '새 메인 프로젝트를 만들어보세요'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => onNewProject(currentMainProject?.id)}
                className="toss-button"
              >
                {currentMainProject ? '첫 하위 프로젝트 만들기' : '첫 메인 프로젝트 만들기'}
              </button>
            )}
          </div>
        ) : (
          <div className={currentMainProject ? "space-y-6" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"}>
            {filteredProjects.map((project) => renderProjectCard(project))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList; 