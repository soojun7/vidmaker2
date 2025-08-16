// 완전 서버 기반 모드 - 마이그레이션 기능 비활성화

export class DataMigrationService {
  private static instance: DataMigrationService;

  static getInstance(): DataMigrationService {
    if (!DataMigrationService.instance) {
      DataMigrationService.instance = new DataMigrationService();
    }
    return DataMigrationService.instance;
  }

  // 모든 기능이 비활성화됨 - 서버 전용 모드
  private getLocalStorageData(): any {
    console.log('ℹ️ 마이그레이션 기능 완전 비활성화 - 서버 전용 모드');
    return null;
  }

  async migrateProjects(userId: string): Promise<boolean> {
    console.log('ℹ️ 프로젝트 마이그레이션 비활성화 - 서버 전용 모드');
    return true;
  }

  async migrateWorkflowData(userId: string): Promise<boolean> {
    console.log('ℹ️ 워크플로우 마이그레이션 비활성화 - 서버 전용 모드');
    return true;
  }

  async migrateImages(userId: string): Promise<boolean> {
    console.log('ℹ️ 이미지 마이그레이션 비활성화 - 서버 전용 모드');
    return true;
  }

  async migrateMessages(userId: string): Promise<boolean> {
    console.log('ℹ️ 메시지 마이그레이션 비활성화 - 서버 전용 모드');
    return true;
  }

  async migrateAllData(userId: string): Promise<{
    success: boolean;
    message: string;
    details: any;
  }> {
    console.log('ℹ️ 전체 마이그레이션 비활성화 - 서버 전용 모드');
    return {
      success: true,
      message: '서버 전용 모드 - 마이그레이션 불필요',
      details: {}
    };
  }

  async checkMigrationStatus(userId: string): Promise<{
    hasLocalData: boolean;
    hasSupabaseData: boolean;
    needsMigration: boolean;
  }> {
    console.log('ℹ️ 마이그레이션 상태 체크 비활성화 - 서버 전용 모드');
    return {
      hasLocalData: false,
      hasSupabaseData: true,
      needsMigration: false
    };
  }

  async cleanupLocalStorage(): Promise<boolean> {
    console.log('ℹ️ 로컬 스토리지 정리 비활성화 - 서버 전용 모드');
    return true;
  }
}

// 싱글톤 인스턴스 export
export const dataMigrationService = DataMigrationService.getInstance();