export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageData?: string; // 이미지가 첨부된 경우의 이미지 데이터
}

export interface TabData {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  confirmedData?: any;
}

export interface StyleAnalysis {
  id: string;
  content: string;
  confirmed: boolean;
}

export interface Script {
  id: string;
  content: string;
  confirmed: boolean;
  text: string; // 스크립트 텍스트
  generatedAudio?: string; // TTS 오디오 데이터
  generatedImage?: string; // 생성된 이미지
  generatedVideo?: string; // 생성된 비디오
}

export interface Character {
  id: string;
  name: string;
  description: string;
  personality: string;
  appearance: string;
  prompt: string; // 캐릭터 이미지 생성용 프롬프트
  generatedImages: string[]; // 생성된 이미지들
  selectedImageIndex?: number; // 선택된 이미지 인덱스
  seedNumber?: number; // 캐릭터 시드 번호
  confirmed: boolean;
}

export interface Prompt {
  id: string;
  sceneNumber: number;
  sceneDescription: string;
  prompt: string;
  confirmed: boolean;
}

export interface SavedStyle {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  imageData?: string; // 스타일 이미지가 있는 경우
}

export interface IndividualVideo {
  id: string;
  scriptId: string;
  scriptText: string;
  videoData: string; // base64 비디오 데이터
  audioData: string; // base64 오디오 데이터
  imageData: string; // base64 이미지 데이터
  duration: number; // 비디오 길이 (초)
  confirmed: boolean;
}

export interface WorkflowData {
  styleAnalysis?: StyleAnalysis;
  script?: Script;
  characters?: Character[];
  prompts?: Prompt[];
  savedStyles?: SavedStyle[]; // 저장된 스타일들
  individualVideos?: IndividualVideo[]; // 개별 비디오들
  scripts?: Script[]; // PromptGenerator의 스크립트 목록
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  workflowData: WorkflowData;
  tabMessages: { [key: number]: ChatMessage[] };
  tabPromptGeneratorStates?: { [key: number]: any }; // 탭별 PromptGenerator 상태
  thumbnail?: string; // 프로젝트 썸네일 이미지
  tags?: string[]; // 프로젝트 태그
  status: 'draft' | 'in-progress' | 'completed';
  parentId?: string; // 상위 프로젝트 ID (하위 프로젝트인 경우)
  children?: Project[]; // 하위 프로젝트들
  level: number; // 프로젝트 깊이 (0: 루트, 1: 하위, 2: 하위의 하위...)
  type: 'main' | 'sub'; // 프로젝트 타입
}

// Electron API 타입 정의
declare global {
  interface Window {
    electronAPI?: {
      selectDirectory: () => Promise<{
        canceled: boolean;
        filePaths: string[];
      }>;
    };
  }
} 