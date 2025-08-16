import { scriptApi, chatApi, imageApi, workflowApi, storageApi, appStateApi } from './supabaseApi';
import { projectApi } from './projectApi';
import { DataMigrationService } from './dataMigrationService';

// Supabase 기반 데이터 관리 서비스
export class DataService {
  private static instance: DataService;
  private currentUserId: string | null = null;
  private isInitialized = false;

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // 서비스 초기화
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    
    // 마이그레이션 상태 확인 및 실행
    const dataMigrationService = DataMigrationService.getInstance();
    const migrationStatus = await dataMigrationService.checkMigrationStatus(userId);
    
    if (migrationStatus.needsMigration) {
      console.log('ℹ️ 마이그레이션 불필요 - 서버 전용 모드');
      const result = await dataMigrationService.migrateAllData(userId);
      console.log('✅ 서버 전용 모드 활성화:', result.message);
    }
    
    this.isInitialized = true;
  }

  // 프로젝트 관련 데이터 관리
  get projectService() {
    return {
      // 프로젝트 목록 조회
      getProjects: async (): Promise<any[]> => {
        if (!this.currentUserId) {
          console.warn('사용자 ID가 설정되지 않았습니다. 빈 배열을 반환합니다.');
          return [];
        }
        return await projectApi.getProjects();
      },

      // 프로젝트 생성
      createProject: async (projectData: any): Promise<any> => {
        if (!this.currentUserId) throw new Error('사용자 ID가 설정되지 않았습니다.');
        
        const project = await projectApi.createProject({
          title: projectData.title,
          description: projectData.description,
          content: projectData.content
        });

        return project;
      },

      // 프로젝트 업데이트
      updateProject: async (projectId: string, updates: any): Promise<any> => {
        return await projectApi.updateProject(projectId, updates);
      },

      // 프로젝트 삭제
      deleteProject: async (projectId: string): Promise<boolean> => {
        try {
          await projectApi.deleteProject(projectId);
          return true;
        } catch (error) {
          console.error('프로젝트 삭제 오류:', error);
          return false;
        }
      }
    };
  }

  // 스크립트 관련 데이터 관리
  get scriptService() {
    return {
      // 스크립트 저장
      saveScript: async (projectId: string, scriptContent: string, scriptType: string = 'main'): Promise<any> => {
        return await scriptApi.saveScript({
          project_id: projectId,
          script_content: scriptContent,
          script_type: scriptType,
          version: 1
        });
      },

      // 스크립트 조회
      getScript: async (projectId: string, scriptType: string = 'main'): Promise<any> => {
        return await scriptApi.getScript(projectId, scriptType);
      },

      // 프로젝트의 모든 스크립트 조회
      getProjectScripts: async (projectId: string): Promise<any[]> => {
        return await scriptApi.getProjectScripts(projectId);
      }
    };
  }

  // 채팅 메시지 관련 데이터 관리
  get chatService() {
    return {
      // 메시지 저장
      saveMessage: async (projectId: string, message: any): Promise<any> => {
        if (!this.currentUserId) throw new Error('사용자 ID가 설정되지 않았습니다.');
        
        return await chatApi.saveMessage({
          project_id: projectId,
          user_id: this.currentUserId,
          message_type: message.role || 'user',
          content: message.content,
          metadata: {
            timestamp: message.timestamp,
            id: message.id
          }
        });
      },

      // 프로젝트의 채팅 메시지 조회
      getProjectMessages: async (projectId: string): Promise<any[]> => {
        return await chatApi.getProjectMessages(projectId);
      },

      // 메시지 삭제
      deleteMessage: async (messageId: string): Promise<boolean> => {
        return await chatApi.deleteMessage(messageId);
      }
    };
  }

  // 이미지 관련 데이터 관리
  get imageService() {
    return {
      // 이미지 업로드 및 정보 저장
      uploadImage: async (file: File, projectId: string, imageType: string = 'general'): Promise<any> => {
        // Supabase Storage에 업로드
        const imageUrl = await storageApi.uploadImage(file, projectId, imageType);
        
        if (!imageUrl) {
          throw new Error('이미지 업로드 실패');
        }

        // 이미지 정보를 데이터베이스에 저장
        const imageInfo = await imageApi.saveImageInfo({
          project_id: projectId,
          image_type: imageType,
          image_url: imageUrl,
          image_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          metadata: {
            uploadedAt: new Date().toISOString()
          }
        });

        return imageInfo;
      },

      // 프로젝트의 이미지 목록 조회
      getProjectImages: async (projectId: string, imageType?: string): Promise<any[]> => {
        return await imageApi.getProjectImages(projectId, imageType);
      },

      // 이미지 삭제
      deleteImage: async (imageId: string, filePath?: string): Promise<boolean> => {
        // 데이터베이스에서 이미지 정보 삭제
        const deleted = await imageApi.deleteImageInfo(imageId);
        
        // Storage에서도 파일 삭제 (filePath가 제공된 경우)
        if (deleted && filePath) {
          await storageApi.deleteImage(filePath);
        }

        return deleted;
      }
    };
  }

  // 워크플로우 데이터 관리
  get workflowService() {
    return {
      // 워크플로우 데이터 저장
      saveWorkflowData: async (projectId: string, workflowType: string, data: any): Promise<any> => {
        return await workflowApi.saveWorkflowData({
          project_id: projectId,
          workflow_type: workflowType,
          workflow_data: data,
          version: 1
        });
      },

      // 워크플로우 데이터 조회
      getWorkflowData: async (projectId: string, workflowType: string): Promise<any> => {
        return await workflowApi.getWorkflowData(projectId, workflowType);
      },

      // 프로젝트의 모든 워크플로우 데이터 조회
      getProjectWorkflowData: async (projectId: string): Promise<any[]> => {
        return await workflowApi.getProjectWorkflowData(projectId);
      }
    };
  }

  // 앱 상태 데이터 관리 (완전 서버 기반)
  get appStateService() {
    return {
      // 전체 앱 상태 저장 (로컬 스토리지 완전 대체)
      saveAppState: async (stateData: any): Promise<void> => {
        if (!this.currentUserId) throw new Error('사용자 ID가 설정되지 않았습니다.');
        
        // 사용자별 전체 앱 상태를 서버에 저장
        await this.workflowService.saveWorkflowData(this.currentUserId, 'global_app_state', {
          ...stateData,
          lastSaved: new Date().toISOString(),
          deviceInfo: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        });
      },

      // 전체 앱 상태 로드
      loadAppState: async (): Promise<any> => {
        if (!this.currentUserId) throw new Error('사용자 ID가 설정되지 않았습니다.');
        
        const workflowData = await this.workflowService.getWorkflowData(this.currentUserId, 'global_app_state');
        return workflowData?.workflow_data || null;
      },

      // 프로젝트별 탭 메시지 저장
      saveTabMessages: async (projectId: string, tabId: number, messages: any[]): Promise<void> => {
        await this.workflowService.saveWorkflowData(projectId, `tab_messages_${tabId}`, {
          messages,
          lastSaved: new Date().toISOString()
        });
      },

      // 프로젝트별 탭 메시지 로드
      loadTabMessages: async (projectId: string, tabId: number): Promise<any[]> => {
        const workflowData = await this.workflowService.getWorkflowData(projectId, `tab_messages_${tabId}`);
        return workflowData?.workflow_data?.messages || [];
      },

      // 프로젝트별 모든 탭 메시지 일괄 저장
      saveAllTabMessages: async (projectId: string, allTabMessages: Record<number, any[]>): Promise<void> => {
        const savePromises = Object.entries(allTabMessages).map(([tabId, messages]) => 
          this.appStateService.saveTabMessages(projectId, Number(tabId), messages)
        );
        await Promise.all(savePromises);
      },

      // 프로젝트별 모든 탭 메시지 일괄 로드
      loadAllTabMessages: async (projectId: string): Promise<Record<number, any[]>> => {
        const tabMessages: Record<number, any[]> = {};
        
        // 5개 탭 (0-4) 메시지 모두 로드
        const loadPromises = [0, 1, 2, 3, 4].map(async (tabId) => {
          const messages = await this.appStateService.loadTabMessages(projectId, tabId);
          tabMessages[tabId] = messages;
        });
        
        await Promise.all(loadPromises);
        return tabMessages;
      },

      // 프롬프트 생성기 상태 저장
      savePromptGeneratorState: async (projectId: string, tabId: number, state: any): Promise<void> => {
        await this.workflowService.saveWorkflowData(projectId, `prompt_generator_${tabId}`, {
          ...state,
          lastSaved: new Date().toISOString()
        });
      },

      // 프롬프트 생성기 상태 로드
      loadPromptGeneratorState: async (projectId: string, tabId: number): Promise<any> => {
        const workflowData = await this.workflowService.getWorkflowData(projectId, `prompt_generator_${tabId}`);
        return workflowData?.workflow_data || null;
      },

      // 모든 프롬프트 생성기 상태 일괄 저장
      saveAllPromptGeneratorStates: async (projectId: string, allStates: Record<number, any>): Promise<void> => {
        const savePromises = Object.entries(allStates).map(([tabId, state]) => {
          if (state) {
            return this.appStateService.savePromptGeneratorState(projectId, Number(tabId), state);
          }
          return Promise.resolve();
        });
        await Promise.all(savePromises);
      },

      // 모든 프롬프트 생성기 상태 일괄 로드
      loadAllPromptGeneratorStates: async (projectId: string): Promise<Record<number, any>> => {
        const states: Record<number, any> = {};
        
        const loadPromises = [0, 1, 2, 3, 4].map(async (tabId) => {
          const state = await this.appStateService.loadPromptGeneratorState(projectId, tabId);
          states[tabId] = state;
        });
        
        await Promise.all(loadPromises);
        return states;
      }
    };
  }

  // 프로젝트 데이터 실시간 동기화
  async syncProjectData(projectId: string): Promise<void> {
    try {
      // 프로젝트의 모든 관련 데이터를 동기화
      const [scripts, messages, images, workflowData, tabMessages, promptStates] = await Promise.all([
        this.scriptService.getProjectScripts(projectId),
        this.chatService.getProjectMessages(projectId),
        this.imageService.getProjectImages(projectId),
        this.workflowService.getProjectWorkflowData(projectId),
        this.appStateService.loadAllTabMessages(projectId),
        this.appStateService.loadAllPromptGeneratorStates(projectId)
      ]);

      console.log(`✅ 프로젝트 ${projectId} 데이터 동기화 완료:`, {
        scripts: scripts.length,
        messages: messages.length,
        images: images.length,
        workflowData: workflowData.length,
        tabMessages: Object.keys(tabMessages).length,
        promptStates: Object.keys(promptStates).filter(key => promptStates[Number(key)]).length
      });
    } catch (error) {
      console.error('❌ 프로젝트 데이터 동기화 오류:', error);
    }
  }

  // 전체 사용자 데이터 동기화 (PC/모바일 간 완전 동기화)
  async syncAllUserData(): Promise<{
    projects: any[],
    appState: any,
    totalSyncedProjects: number
  }> {
    if (!this.currentUserId) throw new Error('사용자 ID가 설정되지 않았습니다.');

    try {
      console.log('🔄 전체 사용자 데이터 동기화 시작...');

      // 1. 프로젝트 목록 동기화
      const projects = await this.projectService.getProjects();
      
      // 2. 전역 앱 상태 동기화
      const appState = await this.appStateService.loadAppState();
      
      // 3. 각 프로젝트별 상세 데이터 동기화
      const syncPromises = projects.map(project => this.syncProjectData(project.id));
      await Promise.all(syncPromises);

      console.log('✅ 전체 사용자 데이터 동기화 완료:', {
        projectCount: projects.length,
        hasAppState: !!appState
      });

      return {
        projects,
        appState,
        totalSyncedProjects: projects.length
      };
    } catch (error) {
      console.error('❌ 전체 사용자 데이터 동기화 오류:', error);
      throw error;
    }
  }

  // 사용자 설정 관리
  get settingsService() {
    return {
      // 사용자 설정 저장
      saveSettings: async (settings: any): Promise<void> => {
        if (!this.currentUserId) throw new Error('사용자 ID가 설정되지 않았습니다.');
        
        // 사용자 설정을 워크플로우 데이터로 저장
        await this.workflowService.saveWorkflowData(this.currentUserId, 'user_settings', {
          ...settings,
          lastSaved: new Date().toISOString()
        });
      },

      // 사용자 설정 로드
      loadSettings: async (): Promise<any> => {
        if (!this.currentUserId) throw new Error('사용자 ID가 설정되지 않았습니다.');
        
        const workflowData = await this.workflowService.getWorkflowData(this.currentUserId, 'user_settings');
        return workflowData?.workflow_data || {};
      }
    };
  }

  // 데이터 백업 및 복원
  get backupService() {
    return {
      // 프로젝트 데이터 백업
      backupProject: async (projectId: string): Promise<any> => {
        const [project, scripts, messages, images, workflowData] = await Promise.all([
          projectApi.getProject(projectId),
          this.scriptService.getProjectScripts(projectId),
          this.chatService.getProjectMessages(projectId),
          this.imageService.getProjectImages(projectId),
          this.workflowService.getProjectWorkflowData(projectId)
        ]);

        return {
          project,
          scripts,
          messages,
          images,
          workflowData,
          backupDate: new Date().toISOString()
        };
      },

      // 프로젝트 데이터 복원
      restoreProject: async (backupData: any): Promise<boolean> => {
        try {
          // 프로젝트 복원
          if (backupData.project) {
            await projectApi.createProject(backupData.project);
          }

          // 관련 데이터 복원
          if (backupData.scripts) {
            for (const script of backupData.scripts) {
              await this.scriptService.saveScript(script.project_id, script.script_content, script.script_type);
            }
          }

          if (backupData.messages) {
            for (const message of backupData.messages) {
              await this.chatService.saveMessage(message.project_id, message);
            }
          }

          if (backupData.workflowData) {
            for (const workflow of backupData.workflowData) {
              await this.workflowService.saveWorkflowData(workflow.project_id, workflow.workflow_type, workflow.workflow_data);
            }
          }

          return true;
        } catch (error) {
          console.error('프로젝트 복원 오류:', error);
          return false;
        }
      }
    };
  }
}

// 싱글톤 인스턴스 export
export const dataService = DataService.getInstance(); 