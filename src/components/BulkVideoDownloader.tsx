import React, { useState } from 'react';
import { FolderDown, Download, X, AlertCircle, CheckCircle, FolderOpen } from 'lucide-react';
import FolderPicker from './FolderPicker';

interface Script {
  id: string;
  text: string;
  generatedVideo?: string;
  generatedAudio?: string;
}

interface BulkVideoDownloaderProps {
  scripts: Script[];
  isOpen: boolean;
  onClose: () => void;
}

interface DownloadStep {
  step: 'path' | 'title' | 'downloading' | 'complete';
}

const BulkVideoDownloader: React.FC<BulkVideoDownloaderProps> = ({
  scripts,
  isOpen,
  onClose
}) => {
  const [currentStep, setCurrentStep] = useState<DownloadStep['step']>('path');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [folderTitle, setFolderTitle] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadedCount, setDownloadedCount] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);
  const [showFolderPicker, setShowFolderPicker] = useState<boolean>(false);

  // 비디오가 있는 스크립트만 필터링
  const videosWithVideo = scripts.filter(script => script.generatedVideo);

  // SRT 자막 파일 생성 함수
  const generateSRTContent = (script: Script): string => {
    if (!script.generatedAudio) {
      return `1\n00:00:00,000 --> 00:00:05,000\n${script.text}\n\n`;
    }
    
    // 기본적으로 5초 길이로 가정 (실제로는 오디오 길이 분석 필요)
    const duration = 5000; // 5초 (밀리초)
    const startTime = "00:00:00,000";
    const endTime = `00:00:0${Math.floor(duration / 1000)},${String(duration % 1000).padStart(3, '0')}`;
    
    return `1\n${startTime} --> ${endTime}\n${script.text}\n\n`;
  };

  // 폴더 선택 결과 처리
  const handleFolderSelect = (pathOrHandle: string | any, handle?: any) => {
    if (handle) {
      setDirectoryHandle(handle);
      setSelectedPath(pathOrHandle as string);
    } else {
      setDirectoryHandle(null);
      setSelectedPath(pathOrHandle as string);
    }
    setCurrentStep('title');
    setShowFolderPicker(false);
    setError('');
  };

  const handleTitleSubmit = () => {
    if (!folderTitle.trim()) {
      setError('폴더 제목을 입력해주세요.');
      return;
    }
    setError('');
    setCurrentStep('downloading');
    startDownload();
  };

  const startDownload = async () => {
    if (videosWithVideo.length === 0) {
      setError('다운로드할 비디오가 없습니다.');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadedCount(0);

    try {
      const totalVideos = videosWithVideo.length;

      for (let i = 0; i < videosWithVideo.length; i++) {
        const script = videosWithVideo[i];
        
        if (script.generatedVideo) {
          // 비디오 파일 다운로드
          const videoResponse = await fetch(script.generatedVideo);
          const videoBlob = await videoResponse.blob();
          
          // 파일명 생성: 경로 정보 포함
          const pathPrefix = selectedPath && selectedPath !== 'Downloads (브라우저 기본)' 
            ? selectedPath.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') + '_'
            : '';
          const videoFileName = `${pathPrefix}${String(i + 1).padStart(2, '0')}_${folderTitle}.mp4`;
          const srtFileName = `${pathPrefix}${String(i + 1).padStart(2, '0')}_${folderTitle}.srt`;
          
          // SRT 자막 파일 생성
          const srtContent = generateSRTContent(script);
          const srtBlob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
          
          // File System Access API를 사용하여 선택한 폴더에 저장
          if (directoryHandle && 'showDirectoryPicker' in window) {
            try {
              // 비디오 파일 저장
              const videoFileHandle = await directoryHandle.getFileHandle(videoFileName, { create: true });
              const videoWritable = await videoFileHandle.createWritable();
              await videoWritable.write(videoBlob);
              await videoWritable.close();
              
              // SRT 자막 파일 저장
              const srtFileHandle = await directoryHandle.getFileHandle(srtFileName, { create: true });
              const srtWritable = await srtFileHandle.createWritable();
              await srtWritable.write(srtBlob);
              await srtWritable.close();
            } catch (fsError) {
              console.error('File System Access API 오류, 기본 다운로드로 대체:', fsError);
              // 오류 발생시 기본 다운로드 방식으로 대체
              const videoUrl = URL.createObjectURL(videoBlob);
              const videoLink = document.createElement('a');
              videoLink.href = videoUrl;
              videoLink.download = videoFileName;
              videoLink.style.display = 'none';
              document.body.appendChild(videoLink);
              videoLink.click();
              document.body.removeChild(videoLink);
              URL.revokeObjectURL(videoUrl);
              
              // SRT 파일 다운로드
              const srtUrl = URL.createObjectURL(srtBlob);
              const srtLink = document.createElement('a');
              srtLink.href = srtUrl;
              srtLink.download = srtFileName;
              srtLink.style.display = 'none';
              document.body.appendChild(srtLink);
              srtLink.click();
              document.body.removeChild(srtLink);
              URL.revokeObjectURL(srtUrl);
            }
          } else {
            // File System Access API를 사용할 수 없는 경우 기본 다운로드
            const videoUrl = URL.createObjectURL(videoBlob);
            const videoLink = document.createElement('a');
            videoLink.href = videoUrl;
            videoLink.download = videoFileName;
            videoLink.style.display = 'none';
            document.body.appendChild(videoLink);
            videoLink.click();
            document.body.removeChild(videoLink);
            URL.revokeObjectURL(videoUrl);
            
            // SRT 파일 다운로드
            const srtUrl = URL.createObjectURL(srtBlob);
            const srtLink = document.createElement('a');
            srtLink.href = srtUrl;
            srtLink.download = srtFileName;
            srtLink.style.display = 'none';
            document.body.appendChild(srtLink);
            srtLink.click();
            document.body.removeChild(srtLink);
            URL.revokeObjectURL(srtUrl);
          }

          // 진행률 업데이트
          const progress = ((i + 1) / totalVideos) * 100;
          setDownloadProgress(progress);
          setDownloadedCount(i + 1);
          
          // 다운로드 간 지연 (브라우저 제한 방지)
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setCurrentStep('complete');
    } catch (error) {
      console.error('비디오 일괄 다운로드 오류:', error);
      setError('비디오 다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const resetModal = () => {
    setCurrentStep('path');
    setSelectedPath('');
    setFolderTitle('');
    setDownloadProgress(0);
    setDownloadedCount(0);
    setIsDownloading(false);
    setError('');
    setDirectoryHandle(null);
    setShowFolderPicker(false);
  };

  const handleClose = () => {
    if (!isDownloading) {
      resetModal();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            비디오+자막 일괄 다운로드 ({videosWithVideo.length}개)
          </h3>
          {!isDownloading && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        {/* 단계별 UI */}
        {currentStep === 'path' && !showFolderPicker && (
          <div className="space-y-4">
            <div className="text-center">
              <FolderOpen className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                비디오와 자막 파일을 저장할 경로를 설정해주세요
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => setShowFolderPicker(true)}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center justify-center"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  폴더 선택하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FolderPicker 컴포넌트 */}
        {showFolderPicker && (
          <div className="space-y-4">
            <FolderPicker
              onPathSelected={handleFolderSelect}
              title="다운로드 폴더 선택"
              description="비디오와 자막 파일을 저장할 폴더를 선택하세요"
            />
            <button
              onClick={() => setShowFolderPicker(false)}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
            >
              취소
            </button>
          </div>
        )}

        {currentStep === 'title' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                선택된 저장 경로
              </label>
              <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                {selectedPath || '브라우저 기본 다운로드 폴더'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                폴더 및 파일 제목
              </label>
              <input
                type="text"
                value={folderTitle}
                onChange={(e) => setFolderTitle(e.target.value)}
                placeholder="예: 우리의 이야기"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                파일명: {selectedPath && selectedPath !== 'Downloads (브라우저 기본)' ? `${selectedPath.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_` : ''}01_{folderTitle}.mp4, {selectedPath && selectedPath !== 'Downloads (브라우저 기본)' ? `${selectedPath.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_')}_` : ''}01_{folderTitle}.srt, ...
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setCurrentStep('path')}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
              >
                이전
              </button>
              <button
                onClick={handleTitleSubmit}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                다운로드 시작
              </button>
            </div>
          </div>
        )}

        {currentStep === 'downloading' && (
          <div className="space-y-4">
            <div className="text-center">
              <Download className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                비디오와 자막 파일을 다운로드하고 있습니다...
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {downloadedCount} / {videosWithVideo.length} 완료
              </p>
            </div>

            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {Math.round(downloadProgress)}% 완료
            </p>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                다운로드가 완료되었습니다!
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                총 {downloadedCount}개의 비디오와 자막 파일이 다운로드되었습니다.
              </p>
              <button
                onClick={handleClose}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg"
              >
                완료
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkVideoDownloader;
