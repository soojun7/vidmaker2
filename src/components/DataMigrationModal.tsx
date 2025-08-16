import React, { useState, useEffect } from 'react';
import { DataMigrationService } from '../services/dataMigrationService';
import { DataService } from '../services/dataService';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onMigrationComplete: () => void;
}

const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  isOpen,
  onClose,
  userId,
  onMigrationComplete
}) => {
  const [migrationStatus, setMigrationStatus] = useState<{
    hasLocalData: boolean;
    hasSupabaseData: boolean;
    needsMigration: boolean;
  } | null>(null);
  
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationMessage, setMigrationMessage] = useState('');
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const checkMigrationStatus = async () => {
    try {
      const dataMigrationService = DataMigrationService.getInstance();
      const status = await dataMigrationService.checkMigrationStatus(userId);
      setMigrationStatus(status);
    } catch (error) {
      console.error('마이그레이션 상태 확인 오류:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkMigrationStatus();
    }
  }, [isOpen, userId]);

  const handleMigration = async () => {
    if (!migrationStatus?.needsMigration) return;

    setIsMigrating(true);
    setMigrationProgress(0);
    setMigrationMessage('마이그레이션을 시작합니다...');

    try {
      // 진행률 시뮬레이션
      const progressInterval = setInterval(() => {
        setMigrationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      // 실제 마이그레이션 실행
      const dataMigrationService = DataMigrationService.getInstance();
      const result = await dataMigrationService.migrateAllData(userId);
      
      clearInterval(progressInterval);
      setMigrationProgress(100);
      setMigrationResult(result);

      if (result.success) {
        setMigrationMessage('마이그레이션이 완료되었습니다!');
        // 데이터 서비스 초기화
        const dataService = DataService.getInstance();
        await dataService.initialize(userId);
        onMigrationComplete();
      } else {
        setMigrationMessage(`마이그레이션 실패: ${result.message}`);
      }
    } catch (error) {
      console.error('마이그레이션 오류:', error);
      setMigrationResult({
        success: false,
        message: `마이그레이션 중 오류 발생: ${error}`
      });
      setMigrationMessage('마이그레이션 중 오류가 발생했습니다.');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCleanup = async () => {
    console.log('ℹ️ 정리 기능 비활성화 - 서버 전용 모드');
    setMigrationMessage('서버 전용 모드 - 정리 작업 불필요');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">데이터 마이그레이션</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isMigrating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!migrationStatus ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">상태를 확인하는 중...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 상태 정보 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">현재 상태</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>로컬 데이터:</span>
                  <span className={migrationStatus.hasLocalData ? 'text-green-600' : 'text-gray-500'}>
                    {migrationStatus.hasLocalData ? '있음' : '없음'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>클라우드 데이터:</span>
                  <span className={migrationStatus.hasSupabaseData ? 'text-green-600' : 'text-gray-500'}>
                    {migrationStatus.hasSupabaseData ? '있음' : '없음'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>마이그레이션 필요:</span>
                  <span className={migrationStatus.needsMigration ? 'text-orange-600' : 'text-gray-500'}>
                    {migrationStatus.needsMigration ? '예' : '아니오'}
                  </span>
                </div>
              </div>
            </div>

            {/* 마이그레이션 진행률 */}
            {isMigrating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>진행률</span>
                  <span>{migrationProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${migrationProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">{migrationMessage}</p>
              </div>
            )}

            {/* 결과 메시지 */}
            {migrationResult && (
              <div className={`rounded-lg p-4 ${
                migrationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {migrationResult.success ? (
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className={`font-medium ${
                    migrationResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {migrationResult.success ? '성공' : '실패'}
                  </span>
                </div>
                <p className={`mt-1 text-sm ${
                  migrationResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {migrationResult.message}
                </p>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="flex space-x-3">
              {migrationStatus.needsMigration && !isMigrating && !migrationResult && (
                <button
                  onClick={handleMigration}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  마이그레이션 시작
                </button>
              )}

              {migrationResult?.success && (
                <button
                  onClick={handleCleanup}
                  className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  서버 전용 모드
                </button>
              )}

              <button
                onClick={onClose}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                disabled={isMigrating}
              >
                {migrationResult?.success ? '완료' : '취소'}
              </button>
            </div>

            {/* 정보 메시지 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-blue-900 mb-1">마이그레이션 정보</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 모든 데이터가 서버에서 실시간 관리됩니다</li>
                <li>• PC/모바일 간 자동 동기화가 활성화됩니다</li>
                <li>• 브라우저나 기기 변경 시에도 데이터가 유지됩니다</li>
                <li>• 기존 데이터는 백업 후 안전하게 정리됩니다</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataMigrationModal; 