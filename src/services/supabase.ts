import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 환경 변수에서 설정 값 가져오기
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'dummy-anon-key';

// 개발 환경에서 환경 변수 확인
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase 설정 상태:', {
    hasUrl: !!process.env.REACT_APP_SUPABASE_URL,
    hasKey: !!process.env.REACT_APP_SUPABASE_ANON_KEY,
    urlPreview: supabaseUrl.substring(0, 20) + '...'
  });
  
  if (!process.env.REACT_APP_SUPABASE_URL) {
    console.warn('⚠️ REACT_APP_SUPABASE_URL이 설정되지 않았습니다. 더미 URL을 사용합니다.');
  }
}

// Supabase 클라이언트 생성 (오류 처리 포함)
let supabase: SupabaseClient;

// 더 엄격한 URL 검증
const isValidSupabaseUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('supabase') || url.includes('dummy');
  } catch {
    return false;
  }
};

// 유효한 URL과 키가 있는지 확인
const hasValidConfig: boolean = Boolean(
  isValidSupabaseUrl(supabaseUrl) && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'dummy-anon-key' &&
  supabaseUrl !== 'https://dummy.supabase.co'
);

if (!hasValidConfig) {
  console.warn('⚠️ Supabase 설정이 완료되지 않았습니다. 로컬 모드로 실행됩니다.');
  console.log('Supabase를 사용하려면 .env 파일에 다음 변수들을 설정하세요:');
  console.log('- REACT_APP_SUPABASE_URL');
  console.log('- REACT_APP_SUPABASE_ANON_KEY');
}

try {
  // 더미 값이라도 오류 없이 클라이언트 생성
  supabase = createClient(
    supabaseUrl, 
    supabaseAnonKey,
    {
      auth: {
        persistSession: hasValidConfig,
        autoRefreshToken: hasValidConfig
      }
    }
  );
} catch (error) {
  console.error('Supabase 클라이언트 생성 실패:', error);
  // 최후의 수단으로 기본 더미 클라이언트 생성
  supabase = createClient(
    'https://dummy.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkR1bW15IiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

export { supabase, hasValidConfig };

// 데이터베이스 스키마 타입 정의
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          password_hash: string;
          profile_image: string | null;
          subscription_type: string;
          subscription_expires: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          email: string;
          password_hash: string;
          profile_image?: string | null;
          subscription_type?: string;
          subscription_expires?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          password_hash?: string;
          profile_image?: string | null;
          subscription_type?: string;
          subscription_expires?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          content: string | null;
          status: string;
          thumbnail_url: string | null;
          video_url: string | null;
          duration: number | null;
          views: number;
          likes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          content?: string | null;
          status?: string;
          thumbnail_url?: string | null;
          video_url?: string | null;
          duration?: number | null;
          views?: number;
          likes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          content?: string | null;
          status?: string;
          thumbnail_url?: string | null;
          video_url?: string | null;
          duration?: number | null;
          views?: number;
          likes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_scripts: {
        Row: {
          id: string;
          project_id: string;
          script_content: string;
          script_type: string; // 'main', 'subtitle', 'voiceover' 등
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          script_content: string;
          script_type?: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          script_content?: string;
          script_type?: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          message_type: string; // 'user', 'assistant', 'system'
          content: string;
          metadata: any; // JSON 형태로 추가 정보 저장
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          message_type: string;
          content: string;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          message_type?: string;
          content?: string;
          metadata?: any;
          created_at?: string;
        };
      };
      project_images: {
        Row: {
          id: string;
          project_id: string;
          image_type: string; // 'thumbnail', 'background', 'character', 'scene'
          image_url: string;
          image_name: string;
          file_size: number;
          mime_type: string;
          metadata: any; // JSON 형태로 추가 정보 저장
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          image_type: string;
          image_url: string;
          image_name: string;
          file_size: number;
          mime_type: string;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          image_type?: string;
          image_url?: string;
          image_name?: string;
          file_size?: number;
          mime_type?: string;
          metadata?: any;
          created_at?: string;
        };
      };
      project_workflow_data: {
        Row: {
          id: string;
          project_id: string;
          workflow_type: string; // 'story', 'character', 'scene', 'voice'
          workflow_data: any; // JSON 형태로 워크플로우 데이터 저장
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          workflow_type: string;
          workflow_data: any;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          workflow_type?: string;
          workflow_data?: any;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          theme: string;
          language: string;
          notification_email: boolean;
          notification_push: boolean;
          auto_save: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          theme?: string;
          language?: string;
          notification_email?: boolean;
          notification_push?: boolean;
          auto_save?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          theme?: string;
          language?: string;
          notification_email?: boolean;
          notification_push?: boolean;
          auto_save?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_stats: {
        Row: {
          id: string;
          user_id: string;
          total_projects: number;
          total_videos: number;
          total_views: number;
          total_likes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_projects?: number;
          total_videos?: number;
          total_views?: number;
          total_likes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_projects?: number;
          total_videos?: number;
          total_views?: number;
          total_likes?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_activity_logs: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          description: string;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          description: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: string;
          description?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
    };
  };
} 