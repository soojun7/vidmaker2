// 완전 서버 기반 동기화 서비스 (PC/모바일 통합)
import { DataService } from './dataService';

interface SyncState {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  syncInProgress: boolean;
}

class SyncService {
  private static instance: SyncService;
  private dataService: DataService;
  private syncState: SyncState = {
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingChanges: 0,
    syncInProgress: false
  };
  private syncCallbacks: Set<(state: SyncState) => void> = new Set();

  private constructor() {
    this.dataService = DataService.getInstance();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  static getInstance(): SyncService {
    if (!SyncService.instance) {
      SyncService.instance = new SyncService();
    }
    return SyncService.instance;
  }

  // 네트워크 상태 감지
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 네트워크 연결됨 - 자동 동기화 시작');
      this.updateSyncState({ isOnline: true });
      this.forcSync();
    });

    window.addEventListener('offline', () => {
      console.log('📡 네트워크 연결 끊김 - 오프라인 모드');
      this.updateSyncState({ isOnline: false });
    });
  }

  // 주기적 동기화 (30초마다)
  private startPeriodicSync(): void {
    setInterval(() => {
      if (this.syncState.isOnline && !this.syncState.syncInProgress) {
        this.forcSync();
      }
    }, 30000); // 30초
  }

  // 동기화 상태 업데이트
  private updateSyncState(updates: Partial<SyncState>): void {
    this.syncState = { ...this.syncState, ...updates };
    this.notifyCallbacks();
  }

  // 콜백 알림
  private notifyCallbacks(): void {
    this.syncCallbacks.forEach(callback => callback(this.syncState));
  }

  // 동기화 상태 구독
  subscribe(callback: (state: SyncState) => void): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  // 강제 동기화
  async forcSync(): Promise<boolean> {
    if (this.syncState.syncInProgress) {
      console.log('⏳ 이미 동기화가 진행 중입니다.');
      return false;
    }

    if (!this.syncState.isOnline) {
      console.log('📡 오프라인 상태 - 동기화 불가');
      return false;
    }

    try {
      this.updateSyncState({ syncInProgress: true });
      console.log('🔄 전체 데이터 동기화 시작...');

      // 전체 사용자 데이터 동기화
      const syncResult = await this.dataService.syncAllUserData();

      this.updateSyncState({
        syncInProgress: false,
        lastSyncTime: new Date(),
        pendingChanges: 0
      });

      console.log('✅ 동기화 완료:', {
        projects: syncResult.totalSyncedProjects,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('❌ 동기화 실패:', error);
      this.updateSyncState({ syncInProgress: false });
      return false;
    }
  }

  // 프로젝트별 동기화
  async syncProject(projectId: string): Promise<boolean> {
    if (!this.syncState.isOnline) {
      console.log('📡 오프라인 상태 - 프로젝트 동기화 불가');
      return false;
    }

    try {
      console.log(`🔄 프로젝트 ${projectId} 동기화 시작...`);
      await this.dataService.syncProjectData(projectId);
      console.log(`✅ 프로젝트 ${projectId} 동기화 완료`);
      return true;
    } catch (error) {
      console.error(`❌ 프로젝트 ${projectId} 동기화 실패:`, error);
      return false;
    }
  }

  // 앱 상태 동기화
  async syncAppState(appState: any): Promise<boolean> {
    if (!this.syncState.isOnline) {
      console.log('📡 오프라인 상태 - 앱 상태 동기화 불가');
      return false;
    }

    try {
      await this.dataService.appStateService.saveAppState(appState);
      console.log('💾 앱 상태 동기화 완료');
      return true;
    } catch (error) {
      console.error('❌ 앱 상태 동기화 실패:', error);
      return false;
    }
  }

  // 동기화 상태 조회
  getSyncState(): SyncState {
    return { ...this.syncState };
  }

  // 마지막 동기화 시간 포맷
  getLastSyncTimeFormatted(): string {
    if (!this.syncState.lastSyncTime) {
      return '동기화 안됨';
    }

    const now = new Date();
    const diff = now.getTime() - this.syncState.lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  }

  // 디바이스 정보 동기화
  async syncDeviceInfo(): Promise<void> {
    const deviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenSize: `${screen.width}x${screen.height}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lastActive: new Date().toISOString()
    };

    console.log('📱 디바이스 정보 동기화:', deviceInfo);
    
    // 디바이스 정보를 사용자 설정에 저장
    try {
      const settings = await this.dataService.settingsService.loadSettings();
      await this.dataService.settingsService.saveSettings({
        ...settings,
        deviceInfo,
        lastDeviceSync: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ 디바이스 정보 동기화 실패:', error);
    }
  }
}

export const syncService = SyncService.getInstance();
export default syncService;
