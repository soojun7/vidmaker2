interface Project {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

interface CreateProjectData {
  title: string;
  description?: string;
  content?: string;
}

class ProjectApi {
  private baseUrl = '/api';

  private getAuthHeaders(): HeadersInit {
    // AuthContext에서 제공하는 토큰 사용 (localStorage 의존성 제거)
    const token = this.getTokenFromContext();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  private getTokenFromContext(): string | null {
    // 완전 서버 기반 인증 - window 객체에서만 토큰 가져오기
    return (window as any).__AUTH_TOKEN__ || null;
  }

  // 프로젝트 목록 조회
  async getProjects(): Promise<Project[]> {
    try {
      const headers = this.getAuthHeaders();
      console.log('🔄 ProjectApi getProjects 호출:', {
        url: `${this.baseUrl}/projects`,
        hasToken: !!this.getTokenFromContext(),
        headers: Object.keys(headers)
      });

      const response = await fetch(`${this.baseUrl}/projects`, {
        method: 'GET',
        headers,
      });

      console.log('📡 ProjectApi 응답:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ProjectApi 오류 응답:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ ProjectApi 성공 응답:', {
        projectCount: data.projects?.length || 0,
        success: data.success
      });
      return data.projects || [];
    } catch (error) {
      console.error('❌ 프로젝트 목록 조회 실패:', error);
      throw error;
    }
  }

  // 프로젝트 생성
  async createProject(projectData: CreateProjectData): Promise<Project> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '프로젝트 생성에 실패했습니다');
      }

      const data = await response.json();
      return data.project;
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      throw error;
    }
  }

  // 프로젝트 수정
  async updateProject(projectId: string, projectData: Partial<CreateProjectData>): Promise<Project> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '프로젝트 수정에 실패했습니다');
      }

      const data = await response.json();
      return data.project;
    } catch (error) {
      console.error('프로젝트 수정 오류:', error);
      throw error;
    }
  }

  // 프로젝트 삭제
  async deleteProject(projectId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '프로젝트 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
      throw error;
    }
  }

  // 프로젝트 상세 조회
  async getProject(projectId: string): Promise<Project> {
    try {
      const response = await fetch(`${this.baseUrl}/projects/${projectId}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('프로젝트를 불러오는데 실패했습니다');
      }

      const data = await response.json();
      return data.project;
    } catch (error) {
      console.error('프로젝트 조회 오류:', error);
      throw error;
    }
  }
}

export const projectApi = new ProjectApi();
export type { Project, CreateProjectData }; 