import React, { useState } from 'react';
import { Save, MessageSquare } from 'lucide-react';

interface DirectInputProps {
  title: string;
  description: string;
  placeholder: string;
  currentContent?: string;
  onSave: (content: string) => void;
  onSwitchToChat: () => void;
  isConfirmable: boolean;
  onConfirm: () => void;
  onSaveStyle?: (style: { name: string; description: string; content: string; tags: string[]; imageData?: string }) => void;
  showStyleSaveButton?: boolean;
  uploadedImage?: string | null;
}

const DirectInput: React.FC<DirectInputProps> = ({
  title,
  description,
  placeholder,
  currentContent = '',
  onSave,
  onSwitchToChat,
  isConfirmable,
  onConfirm,
  onSaveStyle,
  showStyleSaveButton = false,
  uploadedImage
}) => {
  const [content, setContent] = useState(currentContent);
  const [showStyleSaveModal, setShowStyleSaveModal] = useState(false);
  const [newStyleData, setNewStyleData] = useState({
    name: '',
    description: '',
    content: '',
    tags: [] as string[],
    tagInput: ''
  });

  const handleSave = () => {
    if (content.trim()) {
      onSave(content);
    }
  };

  const handleConfirm = () => {
    if (content.trim()) {
      onSave(content);
      onConfirm();
    }
  };

  const handleSaveStyleClick = () => {
    setNewStyleData(prev => ({ ...prev, content }));
    setShowStyleSaveModal(true);
  };

  const handleSaveStyle = () => {
    if (!newStyleData.name.trim() || !newStyleData.content.trim() || !onSaveStyle) return;

    onSaveStyle({
      name: newStyleData.name,
      description: newStyleData.description,
      content: newStyleData.content,
      tags: newStyleData.tags,
      imageData: uploadedImage || undefined
    });

    setNewStyleData({ name: '', description: '', content: '', tags: [], tagInput: '' });
    setShowStyleSaveModal(false);
  };

  const handleAddTag = () => {
    if (newStyleData.tagInput.trim() && !newStyleData.tags.includes(newStyleData.tagInput.trim())) {
      setNewStyleData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.tagInput.trim()],
        tagInput: ''
      }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewStyleData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-light-200 dark:border-dark-700 transition-colors duration-300">
      {/* 헤더 */}
      <div className="p-4 border-b border-light-200 dark:border-dark-700 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Save className="w-6 h-6 text-primary-500" />
            <div>
              <h3 className="text-lg font-semibold text-light-900 dark:text-white transition-colors duration-300">직접 입력</h3>
              <p className="text-sm text-light-600 dark:text-gray-400 transition-colors duration-300">{description}</p>
            </div>
          </div>
          <button
            onClick={onSwitchToChat}
            className="p-2 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-gray-300 rounded-lg hover:bg-light-200 dark:hover:bg-dark-600 transition-colors flex items-center space-x-2"
            title="AI 대화 모드로 전환"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-sm">AI 대화</span>
          </button>
        </div>
      </div>

      {/* 입력 영역 */}
      <div className="flex-1 p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="w-full h-full p-4 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white placeholder-light-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:border-primary-500 transition-colors"
          rows={20}
        />
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t border-light-200 dark:border-dark-700 transition-colors duration-300">
        <div className="flex justify-between items-center">
          <div className="text-sm text-light-600 dark:text-gray-400">
            {content.length}자 입력됨
          </div>
          <div className="flex space-x-3">
            {showStyleSaveButton && onSaveStyle && (
              <button
                onClick={handleSaveStyleClick}
                disabled={!content.trim()}
                className="px-3 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5v14" />
                </svg>
                <span>스타일 저장</span>
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!content.trim()}
              className="px-4 py-2 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-gray-300 rounded-lg hover:bg-light-200 dark:hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              저장
            </button>
            {isConfirmable && (
              <button
                onClick={handleConfirm}
                disabled={!content.trim()}
                className="px-6 py-2 bg-toss-success text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
              >
                <span>확정</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 스타일 저장 모달 */}
      {showStyleSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-light-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-light-900 dark:text-white">스타일 저장</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-light-700 dark:text-gray-300 mb-2">
                  스타일 이름 *
                </label>
                <input
                  type="text"
                  value={newStyleData.name}
                  onChange={(e) => setNewStyleData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                  placeholder="스타일 이름을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-light-700 dark:text-gray-300 mb-2">
                  설명
                </label>
                <textarea
                  value={newStyleData.description}
                  onChange={(e) => setNewStyleData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  rows={3}
                  placeholder="스타일에 대한 설명을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-light-700 dark:text-gray-300 mb-2">
                  상세 프롬프트 *
                </label>
                <textarea
                  value={newStyleData.content}
                  onChange={(e) => setNewStyleData(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full p-3 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  rows={5}
                  placeholder="스타일의 상세 프롬프트를 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-light-700 dark:text-gray-300 mb-2">
                  태그
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newStyleData.tagInput}
                    onChange={(e) => setNewStyleData(prev => ({ ...prev, tagInput: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    className="flex-1 p-2 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors"
                    placeholder="태그 입력 후 Enter"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    추가
                  </button>
                </div>
                {newStyleData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {newStyleData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full flex items-center space-x-1"
                      >
                        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <span>{tag}</span>
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-primary-900 dark:hover:text-primary-100"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t border-light-200 dark:border-dark-700">
              <button
                onClick={() => {
                  setShowStyleSaveModal(false);
                  setNewStyleData({ name: '', description: '', content: '', tags: [], tagInput: '' });
                }}
                className="flex-1 px-4 py-2 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-gray-300 rounded-lg hover:bg-light-200 dark:hover:bg-dark-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveStyle}
                disabled={!newStyleData.name.trim() || !newStyleData.content.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectInput; 