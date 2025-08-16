import React, { useState } from 'react';
import { FolderOpen, AlertCircle } from 'lucide-react';

interface FolderPickerProps {
  onPathSelected: (path: string, directoryHandle?: any) => void;
  title?: string;
  description?: string;
}

const FolderPicker: React.FC<FolderPickerProps> = ({
  onPathSelected,
  title = "저장 경로 선택",
  description = "파일을 저장할 경로를 설정해주세요"
}) => {
  const [useCustomPath, setUseCustomPath] = useState(false);
  const [customPath, setCustomPath] = useState('');
  const [error, setError] = useState('');

  // 폴더 선택 (File System Access API 또는 사용자 입력)
  const handlePathSelect = async () => {
    try {
      // File System Access API 지원 확인 (Chrome 86+, Edge 86+)
      if ('showDirectoryPicker' in window && window.isSecureContext) {
        console.log('🔧 File System Access API 지원 확인됨');
        const handle = await (window as any).showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'downloads'
        });
        console.log('✅ 폴더 선택 완료:', handle.name);
        onPathSelected(handle.name, handle);
      } else {
        console.log('⚠️ File System Access API 미지원, 직접 입력 모드로 전환');
        setUseCustomPath(true);
      }
    } catch (error) {
      console.error('폴더 선택 오류:', error);
      console.log('📝 폴더 선택 실패, 직접 입력 모드로 전환');
      setUseCustomPath(true);
    }
  };

  // 사용자 정의 경로 설정
  const handleCustomPathSubmit = () => {
    if (!customPath.trim()) {
      setError('저장할 경로를 입력해주세요.');
      return;
    }
    console.log('📝 사용자 정의 경로 설정:', customPath);
    onPathSelected(customPath);
    setError('');
  };

  // 기본 다운로드 폴더 사용
  const useDefaultDownloadFolder = () => {
    console.log('📂 기본 다운로드 폴더 사용');
    onPathSelected('Downloads (브라우저 기본)');
    setError('');
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <FolderOpen className="w-16 h-16 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {description}
        </p>
        
        {/* 경로 설정 방법 안내 */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          {'showDirectoryPicker' in window && window.isSecureContext ? (
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💾 폴더를 직접 선택하거나 경로를 입력할 수 있습니다 (Chrome/Edge 최신 버전)
            </p>
          ) : (
            <p className="text-sm text-green-700 dark:text-green-300">
              📂 경로를 직접 입력하거나 기본 다운로드 폴더를 사용할 수 있습니다
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        {!useCustomPath ? (
          <div className="space-y-3">
            {'showDirectoryPicker' in window && window.isSecureContext && (
              <>
                <button
                  onClick={handlePathSelect}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center justify-center"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  폴더 선택 (권장)
                </button>
                <div className="text-sm text-gray-500 dark:text-gray-400">또는</div>
              </>
            )}
            
            <button
              onClick={() => setUseCustomPath(true)}
              className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg"
            >
              경로 직접 입력
            </button>
            
            <button
              onClick={useDefaultDownloadFolder}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
            >
              기본 다운로드 폴더 사용
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                저장할 폴더 경로
              </label>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="예: /Users/사용자명/Downloads/내폴더"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                <strong>💡 팁:</strong> 경로를 입력하더라도 실제로는 브라우저의 기본 다운로드 폴더에 저장됩니다. 
                파일명에 경로 정보가 포함되어 구분하기 쉽게 됩니다.
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setUseCustomPath(false);
                  setCustomPath('');
                  setError('');
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                뒤로
              </button>
              <button
                onClick={handleCustomPathSubmit}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderPicker;
