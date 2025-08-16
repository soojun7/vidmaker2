// 앱 상태 서버 저장 API
const API_BASE_URL = '';

interface AppStateData {
  projects?: any[];
  currentProject?: any;
  tabStates?: any;
  workflowData?: any;
  tabMessages?: any;
  tabPromptGeneratorStates?: any;
}

class AppStateAPI {
  // 서버에서 앱 상태 불러오기 (AuthContext 토큰 사용)
  async loadAppState(): Promise<AppStateData | null> {
    try {
      const token = (window as any).__AUTH_TOKEN__;
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      const response = await fetch(`${API_BASE_URL}/api/app-state`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          // 저장된 상태가 없는 경우
          return null;
        }
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ 서버에서 앱 상태 로드 성공:', data.success);
      
      return data.appState;
    } catch (error) {
      console.error('❌ 앱 상태 로드 실패:', error);
      throw error;
    }
  }

  // 서버에 앱 상태 저장하기 (AuthContext 토큰 사용)
  async saveAppState(appState: AppStateData): Promise<boolean> {
    try {
      const token = (window as any).__AUTH_TOKEN__;
      if (!token) {
        throw new Error('인증 토큰이 없습니다');
      }

      console.log('📤 서버에 앱 상태 저장 시작...');

      const response = await fetch(`${API_BASE_URL}/api/app-state`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state: appState })
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ 서버에 앱 상태 저장 성공:', data.message);
      
      return data.success;
    } catch (error) {
      console.error('❌ 앱 상태 저장 실패:', error);
      throw error;
    }
  }

  // 앱 상태를 최적화해서 저장 (대용량 데이터 제외)
  optimizeAppStateForStorage(appState: AppStateData): AppStateData {
    const optimized: AppStateData = {};

    // 프로젝트 데이터 최적화 (대용량 미디어 데이터 제외)
    if (appState.projects) {
      optimized.projects = appState.projects.map(project => ({
        ...project,
        workflowData: project.workflowData ? {
          ...project.workflowData,
          scripts: (project.workflowData.scripts || []).map((script: any) => ({
            id: script.id,
            text: script.text,
            confirmed: script.confirmed,
            // 대용량 데이터 제외: generatedVideo, generatedAudio, generatedImage
          }))
        } : undefined
      }));
    }

    // 현재 프로젝트 최적화
    if (appState.currentProject) {
      optimized.currentProject = {
        ...appState.currentProject,
        workflowData: appState.currentProject.workflowData ? {
          ...appState.currentProject.workflowData,
          scripts: (appState.currentProject.workflowData.scripts || []).map((script: any) => ({
            id: script.id,
            text: script.text,
            confirmed: script.confirmed,
          }))
        } : undefined
      };
    }

    // 탭 상태들 (UI 상태만 유지)
    if (appState.tabStates) {
      optimized.tabStates = appState.tabStates;
    }

    // 메시지 데이터 최적화 (텍스트만 유지)
    if (appState.tabMessages) {
      optimized.tabMessages = Object.keys(appState.tabMessages).reduce((acc: any, key) => {
        acc[key] = appState.tabMessages[key]?.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        }));
        return acc;
      }, {});
    }

    // 프롬프트 생성기 상태
    if (appState.tabPromptGeneratorStates) {
      optimized.tabPromptGeneratorStates = appState.tabPromptGeneratorStates;
    }

    return optimized;
  }

  // 더 이상 사용하지 않음 - 서버 전용 모드
  async migrateFromLocalStorage(): Promise<boolean> {
    console.log('ℹ️ 마이그레이션 기능은 비활성화됨 - 서버 전용 모드');
    return true;
  }
}

export const appStateApi = new AppStateAPI();
export default appStateApi;
