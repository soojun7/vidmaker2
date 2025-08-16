import { supabase } from './supabase';
import { Database } from './supabase';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

type ProjectScript = Database['public']['Tables']['project_scripts']['Row'];
type ProjectScriptInsert = Database['public']['Tables']['project_scripts']['Insert'];
type ProjectScriptUpdate = Database['public']['Tables']['project_scripts']['Update'];

type ChatMessage = Database['public']['Tables']['chat_messages']['Row'];
type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert'];

type ProjectImage = Database['public']['Tables']['project_images']['Row'];
type ProjectImageInsert = Database['public']['Tables']['project_images']['Insert'];

type ProjectWorkflowData = Database['public']['Tables']['project_workflow_data']['Row'];
type ProjectWorkflowDataInsert = Database['public']['Tables']['project_workflow_data']['Insert'];

// 클라이언트 사이드에서는 간단한 토큰 생성 사용 (한글 지원)
const generateSimpleToken = (userId: string, username: string, email: string, subscription_type: string = 'free'): string => {
  const payload = {
    userId,
    username,
    email,
    subscription_type,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7일
  };
  // 한글을 안전하게 인코딩
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
};

// 토큰 검증 (여러 형식 지원)
const verifySimpleToken = (token: string) => {
  try {
    let payload;
    
    // JWT 토큰인지 확인 (점으로 구분된 3부분)
    if (token.includes('.') && token.split('.').length === 3) {
      try {
        payload = JSON.parse(atob(token.split('.')[1]));
      } catch (jwtError) {
        // JWT 실패 시 간단한 Base64로 시도
        payload = JSON.parse(decodeURIComponent(escape(atob(token))));
      }
    } else {
      // 간단한 Base64 토큰
      payload = JSON.parse(decodeURIComponent(escape(atob(token))));
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp > currentTime) {
      return payload;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// 사용자 등록 (백엔드 API 사용)
export const registerUser = async (username: string, email: string, password: string) => {
  try {
    console.log('🔄 백엔드 회원가입 API 호출:', username, email);
    console.log('요청 URL:', '/api/auth/register');
    console.log('요청 시간:', new Date().toISOString());
    
    const requestBody = {
      username,
      email,
      password
    };
    console.log('요청 본문:', { ...requestBody, password: '***' });
    
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('응답 상태:', response.status, response.statusText);
    console.log('응답 헤더:', Object.fromEntries(response.headers));

    const data = await response.json();
    console.log('🔄 백엔드 회원가입 응답:', data);

    if (response.ok && data.success) {
      console.log('✅ API 호출 성공');
      console.log('토큰 존재 여부:', !!data.token);
      console.log('사용자 정보 존재 여부:', !!data.user);
      
      return {
        success: true,
        message: data.message || '회원가입이 완료되었습니다',
        token: data.token,
        user: data.user
      };
    } else {
      console.log('❌ API 호출 실패:', data.error);
      throw new Error(data.error || '회원가입에 실패했습니다');
    }
  } catch (error) {
    console.error('❌ 회원가입 API 오류:', error);
    console.error('오류 타입:', typeof error);
    console.error('오류 스택:', error instanceof Error ? error.stack : 'No stack');
    
    return {
      success: false,
      message: error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다'
    };
  }
};

// 사용자 로그인 (백엔드 API 사용)
export const loginUser = async (username: string, password: string) => {
  try {
    console.log('🔄 백엔드 로그인 API 호출:', username);
    console.log('요청 URL:', '/api/auth/login');
    console.log('요청 시간:', new Date().toISOString());
    
    const requestBody = {
      username,
      password
    };
    console.log('요청 본문:', { ...requestBody, password: '***' });
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('응답 상태:', response.status, response.statusText);
    console.log('응답 헤더:', Object.fromEntries(response.headers));

    const data = await response.json();
    console.log('🔄 백엔드 로그인 응답:', data);

    if (response.ok && data.success) {
      console.log('✅ API 호출 성공');
      console.log('토큰 존재 여부:', !!data.token);
      console.log('사용자 정보 존재 여부:', !!data.user);
      
      return {
        success: true,
        message: data.message || '로그인이 완료되었습니다',
        token: data.token,
        user: data.user
      };
    } else {
      console.log('❌ API 호출 실패:', data.error);
      throw new Error(data.error || '로그인에 실패했습니다');
    }
  } catch (error) {
    console.error('❌ 로그인 API 오류:', error);
    console.error('오류 타입:', typeof error);
    console.error('오류 스택:', error instanceof Error ? error.stack : 'No stack');
    
    return {
      success: false,
      message: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다'
    };
  }
};

// 사용자 정보 조회
export const getUserById = async (userId: string) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return user;
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    throw error;
  }
};

// 프로젝트 생성
export const createProject = async (userId: string, projectData: {
  title: string;
  description?: string;
  content?: string;
}) => {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        title: projectData.title,
        description: projectData.description || '',
        content: projectData.content || '',
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;

    // 사용자 통계 업데이트
    await supabase
      .from('user_stats')
      .update({ total_projects: supabase.rpc('increment') })
      .eq('user_id', userId);

    return project;
  } catch (error) {
    console.error('프로젝트 생성 오류:', error);
    throw error;
  }
};

// 사용자 프로젝트 목록 조회
export const getUserProjects = async (userId: string) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return projects;
  } catch (error) {
    console.error('프로젝트 목록 조회 오류:', error);
    throw error;
  }
};

// 프로젝트 수정
export const updateProject = async (projectId: string, userId: string, updates: {
  title?: string;
  description?: string;
  content?: string;
}) => {
  try {
    const { data: project, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return project;
  } catch (error) {
    console.error('프로젝트 수정 오류:', error);
    throw error;
  }
};

// 프로젝트 삭제
export const deleteProject = async (projectId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId);

    if (error) throw error;

    // 사용자 통계 업데이트
    await supabase
      .from('user_stats')
      .update({ total_projects: supabase.rpc('decrement') })
      .eq('user_id', userId);

    return true;
  } catch (error) {
    console.error('프로젝트 삭제 오류:', error);
    throw error;
  }
};

// 사용자 설정 업데이트
export const updateUserSettings = async (userId: string, settings: {
  theme?: string;
  language?: string;
  notification_email?: boolean;
  notification_push?: boolean;
  auto_save?: boolean;
}) => {
  try {
    const { data: userSettings, error } = await supabase
      .from('user_settings')
      .update(settings)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return userSettings;
  } catch (error) {
    console.error('사용자 설정 업데이트 오류:', error);
    throw error;
  }
};

// 사용자 통계 업데이트
export const updateUserStats = async (userId: string, stats: {
  total_projects?: number;
  total_videos?: number;
  total_views?: number;
  total_likes?: number;
}) => {
  try {
    const { data: userStats, error } = await supabase
      .from('user_stats')
      .update(stats)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return userStats;
  } catch (error) {
    console.error('사용자 통계 업데이트 오류:', error);
    throw error;
  }
};

// 사용자 활동 로그 기록
export const logUserActivity = async (userId: string, activityType: string, description: string) => {
  try {
    const { error } = await supabase
      .from('user_activity_logs')
      .insert({
        user_id: userId,
        activity_type: activityType,
        description: description
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('활동 로그 기록 오류:', error);
    throw error;
  }
};

// 토큰 인증
export const authenticateToken = (token: string) => {
  return verifySimpleToken(token);
}; 

// 프로젝트 관련 API
export const projectApi = {
  // 프로젝트 생성
  async createProject(project: ProjectInsert): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();

    if (error) {
      console.error('프로젝트 생성 오류:', error);
      return null;
    }

    return data;
  },

  // 프로젝트 목록 조회
  async getProjects(userId: string): Promise<Project[]> {
    try {
      // userId 유효성 검사
      if (!userId || typeof userId !== 'string') {
        console.warn('유효하지 않은 user_id:', userId);
        return [];
      }

      // UUID 형식 검사 (8-4-4-4-12 형식)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.warn('UUID 형식이 아닌 user_id:', userId, '- 프로젝트 조회를 건너뜁니다.');
        return [];
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('프로젝트 목록 조회 오류:', {
          error,
          userId,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        return [];
      }

      return data || [];
    } catch (catchError) {
      console.error('프로젝트 목록 조회 예외:', catchError);
      return [];
    }
  },

  // 프로젝트 조회
  async getProject(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('프로젝트 조회 오류:', error);
      return null;
    }

    return data;
  },

  // 프로젝트 업데이트
  async updateProject(projectId: string, updates: ProjectUpdate): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('프로젝트 업데이트 오류:', error);
      return null;
    }

    return data;
  },

  // 프로젝트 삭제
  async deleteProject(projectId: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      console.error('프로젝트 삭제 오류:', error);
      return false;
    }

    return true;
  }
};

// 스크립트 관련 API
export const scriptApi = {
  // 스크립트 저장
  async saveScript(script: ProjectScriptInsert): Promise<ProjectScript | null> {
    const { data, error } = await supabase
      .from('project_scripts')
      .insert(script)
      .select()
      .single();

    if (error) {
      console.error('스크립트 저장 오류:', error);
      return null;
    }

    return data;
  },

  // 스크립트 조회
  async getScript(projectId: string, scriptType: string): Promise<ProjectScript | null> {
    const { data, error } = await supabase
      .from('project_scripts')
      .select('*')
      .eq('project_id', projectId)
      .eq('script_type', scriptType)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('스크립트 조회 오류:', error);
      return null;
    }

    return data;
  },

  // 스크립트 업데이트
  async updateScript(scriptId: string, updates: ProjectScriptUpdate): Promise<ProjectScript | null> {
    const { data, error } = await supabase
      .from('project_scripts')
      .update(updates)
      .eq('id', scriptId)
      .select()
      .single();

    if (error) {
      console.error('스크립트 업데이트 오류:', error);
      return null;
    }

    return data;
  },

  // 프로젝트의 모든 스크립트 조회
  async getProjectScripts(projectId: string): Promise<ProjectScript[]> {
    const { data, error } = await supabase
      .from('project_scripts')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('프로젝트 스크립트 조회 오류:', error);
      return [];
    }

    return data || [];
  }
};

// 채팅 메시지 관련 API
export const chatApi = {
  // 메시지 저장
  async saveMessage(message: ChatMessageInsert): Promise<ChatMessage | null> {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error('채팅 메시지 저장 오류:', error);
      return null;
    }

    return data;
  },

  // 프로젝트의 채팅 메시지 조회
  async getProjectMessages(projectId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('채팅 메시지 조회 오류:', error);
      return [];
    }

    return data || [];
  },

  // 메시지 삭제
  async deleteMessage(messageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      console.error('채팅 메시지 삭제 오류:', error);
      return false;
    }

    return true;
  }
};

// 이미지 관련 API
export const imageApi = {
  // 이미지 정보 저장
  async saveImageInfo(imageInfo: ProjectImageInsert): Promise<ProjectImage | null> {
    const { data, error } = await supabase
      .from('project_images')
      .insert(imageInfo)
      .select()
      .single();

    if (error) {
      console.error('이미지 정보 저장 오류:', error);
      return null;
    }

    return data;
  },

  // 프로젝트의 이미지 목록 조회
  async getProjectImages(projectId: string, imageType?: string): Promise<ProjectImage[]> {
    let query = supabase
      .from('project_images')
      .select('*')
      .eq('project_id', projectId);

    if (imageType) {
      query = query.eq('image_type', imageType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('이미지 목록 조회 오류:', error);
      return [];
    }

    return data || [];
  },

  // 이미지 정보 삭제
  async deleteImageInfo(imageId: string): Promise<boolean> {
    const { error } = await supabase
      .from('project_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('이미지 정보 삭제 오류:', error);
      return false;
    }

    return true;
  }
};

// 워크플로우 데이터 관련 API
export const workflowApi = {
  // 워크플로우 데이터 저장
  async saveWorkflowData(workflowData: ProjectWorkflowDataInsert): Promise<ProjectWorkflowData | null> {
    const { data, error } = await supabase
      .from('project_workflow_data')
      .insert(workflowData)
      .select()
      .single();

    if (error) {
      console.error('워크플로우 데이터 저장 오류:', error);
      return null;
    }

    return data;
  },

  // 워크플로우 데이터 조회
  async getWorkflowData(projectId: string, workflowType: string): Promise<ProjectWorkflowData | null> {
    const { data, error } = await supabase
      .from('project_workflow_data')
      .select('*')
      .eq('project_id', projectId)
      .eq('workflow_type', workflowType)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('워크플로우 데이터 조회 오류:', error);
      return null;
    }

    return data;
  },

  // 프로젝트의 모든 워크플로우 데이터 조회
  async getProjectWorkflowData(projectId: string): Promise<ProjectWorkflowData[]> {
    const { data, error } = await supabase
      .from('project_workflow_data')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('프로젝트 워크플로우 데이터 조회 오류:', error);
      return [];
    }

    return data || [];
  }
};

// Supabase Storage 관련 API
export const storageApi = {
  // 이미지 업로드
  async uploadImage(file: File, projectId: string, imageType: string): Promise<string | null> {
    const fileName = `${projectId}/${imageType}/${Date.now()}_${file.name}`;
    
    const { error } = await supabase.storage
      .from('project-images')
      .upload(fileName, file);

    if (error) {
      console.error('이미지 업로드 오류:', error);
      return null;
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from('project-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  },

  // 이미지 삭제
  async deleteImage(filePath: string): Promise<boolean> {
    const { error } = await supabase.storage
      .from('project-images')
      .remove([filePath]);

    if (error) {
      console.error('이미지 삭제 오류:', error);
      return false;
    }

    return true;
  },

  // 비디오 업로드
  async uploadVideo(file: File, projectId: string): Promise<string | null> {
    const fileName = `${projectId}/videos/${Date.now()}_${file.name}`;
    
    const { error } = await supabase.storage
      .from('project-videos')
      .upload(fileName, file);

    if (error) {
      console.error('비디오 업로드 오류:', error);
      return null;
    }

    // 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from('project-videos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }
};

// 사용자 앱 상태 관리 API (localStorage 대체)
export const appStateApi = {
  // 앱 상태 저장/업데이트
  async saveAppState(userId: string, appState: any): Promise<boolean> {
    const { error } = await supabase
      .from('user_app_states')
      .upsert({
        user_id: userId,
        app_state: appState,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('앱 상태 저장 오류:', error);
      return false;
    }

    return true;
  },

  // 앱 상태 조회
  async getAppState(userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('user_app_states')
      .select('app_state')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('앱 상태 조회 오류:', error);
      return null;
    }

    return data?.app_state || null;
  },

  // 앱 상태 삭제
  async deleteAppState(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('user_app_states')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('앱 상태 삭제 오류:', error);
      return false;
    }

    return true;
  }
}; 