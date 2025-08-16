import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Check, Clock, Smartphone, Monitor } from 'lucide-react';
import { syncService } from '../services/syncService';

interface SyncState {
  isOnline: boolean;
  lastSyncTime: Date | null;
  pendingChanges: number;
  syncInProgress: boolean;
}

const SyncStatus: React.FC = () => {
  const [syncState, setSyncState] = useState<SyncState>(syncService.getSyncState());
  const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');

  useEffect(() => {
    // 디바이스 타입 감지
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setDeviceType(isMobile ? 'mobile' : 'desktop');

    // 동기화 상태 구독
    const unsubscribe = syncService.subscribe((state) => {
      setSyncState(state);
    });

    // 디바이스 정보 동기화
    syncService.syncDeviceInfo();

    return unsubscribe;
  }, []);

  const handleForceSync = async () => {
    await syncService.forcSync();
  };

  const getStatusColor = () => {
    if (!syncState.isOnline) return 'text-red-500';
    if (syncState.syncInProgress) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!syncState.isOnline) return '오프라인';
    if (syncState.syncInProgress) return '동기화 중...';
    return '동기화됨';
  };

  return (
    <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* 네트워크 상태 아이콘 */}
      <div className={`flex items-center ${getStatusColor()}`}>
        {syncState.isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
      </div>

      {/* 디바이스 타입 아이콘 */}
      <div className="text-gray-500">
        {deviceType === 'mobile' ? (
          <Smartphone className="w-4 h-4" />
        ) : (
          <Monitor className="w-4 h-4" />
        )}
      </div>

      {/* 상태 텍스트 */}
      <div className="flex-1">
        <div className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        <div className="text-xs text-gray-500">
          {syncState.lastSyncTime ? (
            <div className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{syncService.getLastSyncTimeFormatted()}</span>
            </div>
          ) : (
            '아직 동기화되지 않음'
          )}
        </div>
      </div>

      {/* 동기화 버튼 */}
      <button
        onClick={handleForceSync}
        disabled={syncState.syncInProgress || !syncState.isOnline}
        className={`p-2 rounded-lg border transition-colors ${
          syncState.syncInProgress || !syncState.isOnline
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
        }`}
        title="수동 동기화"
      >
        <RefreshCw 
          className={`w-4 h-4 ${syncState.syncInProgress ? 'animate-spin' : ''}`} 
        />
      </button>

      {/* 성공 표시 */}
      {syncState.lastSyncTime && !syncState.syncInProgress && syncState.isOnline && (
        <div className="text-green-500">
          <Check className="w-4 h-4" />
        </div>
      )}

      {/* 대기 중인 변경사항 */}
      {syncState.pendingChanges > 0 && (
        <div className="bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full text-xs">
          {syncState.pendingChanges}
        </div>
      )}
    </div>
  );
};

export default SyncStatus;
