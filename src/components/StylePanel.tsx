import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Tag, 
  Calendar, 
  Image as ImageIcon,
  Edit3,
  Trash2,
  Copy,
  Star
} from 'lucide-react';
import { SavedStyle } from '../types/index';

interface StylePanelProps {
  savedStyles: SavedStyle[];
  onSaveStyle: (style: Omit<SavedStyle, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteStyle: (id: string) => void;
  onUpdateStyle: (id: string, updates: Partial<SavedStyle>) => void;
  onUseStyle: (style: SavedStyle) => void;
  currentContent?: string;
  currentImage?: string | null;
}

const StylePanel: React.FC<StylePanelProps> = ({
  savedStyles,
  onSaveStyle,
  onDeleteStyle,
  onUpdateStyle,
  onUseStyle,
  currentContent,
  currentImage
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<SavedStyle | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<SavedStyle | null>(null);
  const [newStyleData, setNewStyleData] = useState({
    name: '',
    description: '',
    content: '',
    tags: [] as string[],
    tagInput: ''
  });

  const filteredStyles = savedStyles.filter(style =>
    style.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    style.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    style.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSaveStyle = () => {
    if (!newStyleData.name.trim() || !newStyleData.content.trim()) return;

    onSaveStyle({
      name: newStyleData.name,
      description: newStyleData.description,
      content: newStyleData.content,
      tags: newStyleData.tags,
      imageData: currentImage || undefined
    });

    setNewStyleData({ name: '', description: '', content: '', tags: [], tagInput: '' });
    setShowSaveModal(false);
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

  const handleEditStyle = (style: SavedStyle) => {
    setEditingStyle(style);
    setNewStyleData({
      name: style.name,
      description: style.description,
      content: style.content,
      tags: style.tags,
      tagInput: ''
    });
    setShowSaveModal(true);
  };

  const handleUpdateStyle = () => {
    if (!editingStyle || !newStyleData.name.trim()) return;

    onUpdateStyle(editingStyle.id, {
      name: newStyleData.name,
      description: newStyleData.description,
      content: newStyleData.content,
      tags: newStyleData.tags,
      updatedAt: new Date()
    });

    setEditingStyle(null);
    setNewStyleData({ name: '', description: '', content: '', tags: [], tagInput: '' });
    setShowSaveModal(false);
  };

  const handleUseStyle = (style: SavedStyle) => {
    setSelectedStyle(style);
    setShowConfirmModal(true);
  };

  const handleConfirmUseStyle = () => {
    if (selectedStyle && onUseStyle) {
      onUseStyle(selectedStyle);
      setShowConfirmModal(false);
      setSelectedStyle(null);
    }
  };

  return (
    <div className="w-80 bg-white dark:bg-dark-800 border-l border-light-200 dark:border-dark-700 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-light-200 dark:border-dark-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-light-900 dark:text-white">저장된 스타일</h2>
          <button
            onClick={() => {
              setNewStyleData(prev => ({ ...prev, content: currentContent || '' }));
              setShowSaveModal(true);
            }}
            disabled={!currentContent}
            className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="현재 스타일 저장"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-light-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder="스타일 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-light-50 dark:bg-dark-700 border border-light-300 dark:border-dark-600 rounded-lg text-light-900 dark:text-white placeholder-light-500 dark:placeholder-gray-400 focus:outline-none focus:border-primary-500 transition-colors"
          />
        </div>
      </div>

      {/* 스타일 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredStyles.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="w-12 h-12 text-light-400 dark:text-gray-500 mx-auto mb-3" />
            <p className="text-light-600 dark:text-gray-400 text-sm">
              {searchTerm ? '검색 결과가 없습니다' : '저장된 스타일이 없습니다'}
            </p>
          </div>
        ) : (
          filteredStyles.map((style) => (
            <div
              key={style.id}
              className="bg-light-50 dark:bg-dark-700 rounded-lg p-3 border border-light-200 dark:border-dark-600 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all duration-200 cursor-pointer group"
              onClick={() => handleUseStyle(style)}
            >
              {/* 스타일 헤더 */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-medium text-light-900 dark:text-white text-sm mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {style.name}
                  </h3>
                  {style.description && (
                    <p className="text-xs text-light-600 dark:text-gray-400 line-clamp-2">
                      {style.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-1 ml-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleUseStyle(style)}
                    className="p-1 text-primary-500 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded transition-colors"
                    title="스타일 사용"
                  >
                    <Star className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleEditStyle(style)}
                    className="p-1 text-light-500 dark:text-gray-400 hover:bg-light-100 dark:hover:bg-dark-600 rounded transition-colors"
                    title="편집"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteStyle(style.id)}
                    className="p-1 text-toss-error hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* 썸네일 */}
              {style.imageData && (
                <div className="mb-2">
                  <img
                    src={style.imageData}
                    alt={style.name}
                    className="w-full h-20 object-cover rounded border border-light-200 dark:border-dark-600"
                  />
                </div>
              )}

              {/* 태그 */}
              {style.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {style.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs bg-light-200 dark:bg-dark-600 text-light-700 dark:text-gray-300 px-2 py-1 rounded-full flex items-center space-x-1"
                    >
                      <Tag className="w-2 h-2" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* 메타 정보 */}
              <div className="flex items-center justify-between text-xs text-light-500 dark:text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(style.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                    클릭하여 사용
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(style.content);
                    }}
                    className="p-1 hover:bg-light-100 dark:hover:bg-dark-600 rounded transition-colors"
                    title="내용 복사"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 저장 모달 */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-light-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-light-900 dark:text-white">
                {editingStyle ? '스타일 편집' : '스타일 저장'}
              </h3>
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
              
              {/* 상세 프롬프트 필드 - 저장/편집 모드 모두에서 표시 */}
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
                        <Tag className="w-2 h-2" />
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
                  setShowSaveModal(false);
                  setEditingStyle(null);
                  setNewStyleData({ name: '', description: '', content: '', tags: [], tagInput: '' });
                }}
                className="flex-1 px-4 py-2 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-gray-300 rounded-lg hover:bg-light-200 dark:hover:bg-dark-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={editingStyle ? handleUpdateStyle : handleSaveStyle}
                disabled={!newStyleData.name.trim() || !newStyleData.content.trim()}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingStyle ? '수정' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 확정 확인 모달 */}
      {showConfirmModal && selectedStyle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-light-200 dark:border-dark-700">
              <h3 className="text-lg font-semibold text-light-900 dark:text-white">스타일 확정</h3>
            </div>
            
            <div className="p-6">
              <p className="text-light-700 dark:text-gray-300 mb-4">
                <span className="font-medium text-primary-500">"{selectedStyle.name}"</span> 스타일로 확정하시겠습니까?
              </p>
              
              {selectedStyle.description && (
                <div className="mb-4 p-3 bg-light-50 dark:bg-dark-700 rounded-lg">
                  <p className="text-sm text-light-600 dark:text-gray-400 mb-2">스타일 설명:</p>
                  <p className="text-sm text-light-800 dark:text-gray-200">{selectedStyle.description}</p>
                </div>
              )}
              
              <div className="mb-4 p-3 bg-light-50 dark:bg-dark-700 rounded-lg">
                <p className="text-sm text-light-600 dark:text-gray-400 mb-2">스타일 내용:</p>
                <p className="text-sm text-light-800 dark:text-gray-200 whitespace-pre-wrap line-clamp-4">
                  {selectedStyle.content}
                </p>
              </div>
              
              {selectedStyle.tags.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-light-600 dark:text-gray-400 mb-2">태그:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedStyle.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 p-6 border-t border-light-200 dark:border-dark-700">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedStyle(null);
                }}
                className="flex-1 px-4 py-2 bg-light-100 dark:bg-dark-700 text-light-700 dark:text-gray-300 rounded-lg hover:bg-light-200 dark:hover:bg-dark-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmUseStyle}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                확정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StylePanel; 