import React, { useState } from 'react';
import { X, Tag, Plus } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (projectData: { name: string; description: string; tags: string[]; parentId?: string }) => void;
  parentProject?: { id: string; name: string };
}

const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  parentProject
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreateProject({
        name: name.trim(),
        description: description.trim(),
        tags: tags,
        parentId: parentProject?.id
      });
      handleClose();
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setTags([]);
    setNewTag('');
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-light-200 dark:border-dark-700">
          <h2 className="text-xl font-semibold text-light-900 dark:text-white">
            {parentProject ? '하위 프로젝트 생성' : '새 메인 프로젝트'}
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-light-500 dark:text-gray-400 hover:bg-light-100 dark:hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 상위 프로젝트 정보 */}
        {parentProject && (
          <div className="px-6 py-3 bg-light-50 dark:bg-dark-700 border-b border-light-200 dark:border-dark-600">
            <p className="text-sm text-light-600 dark:text-gray-400">
              상위 프로젝트: <span className="font-medium text-light-900 dark:text-white">{parentProject.name}</span>
            </p>
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 프로젝트 이름 */}
          <div>
            <label className="block text-sm font-medium text-light-900 dark:text-white mb-2">
              프로젝트 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 이름을 입력하세요"
              className="toss-input"
              required
            />
          </div>

          {/* 프로젝트 설명 */}
          <div>
            <label className="block text-sm font-medium text-light-900 dark:text-white mb-2">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
              className="toss-input"
              rows={3}
            />
          </div>

          {/* 태그 */}
          <div>
            <label className="block text-sm font-medium text-light-900 dark:text-white mb-2">
              태그
            </label>
            
            {/* 태그 입력 */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="태그를 입력하세요"
                className="toss-input flex-1"
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!newTag.trim()}
                className="px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* 태그 목록 */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center space-x-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-3 py-1 rounded-full text-sm"
                  >
                    <Tag className="w-3 h-3" />
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-primary-900 dark:hover:text-primary-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 toss-button-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex-1 toss-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {parentProject ? '하위 프로젝트 생성' : '메인 프로젝트 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewProjectModal; 