import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  onImageUpload: (file: File) => void;
  uploadedImage?: string | null;
  onRemoveImage: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUpload,
  uploadedImage,
  onRemoveImage
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      onImageUpload(imageFile);
    }
  }, [onImageUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      onImageUpload(imageFile);
    }
  }, [onImageUpload]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {uploadedImage ? (
        <div className="relative">
          <img
            src={uploadedImage}
            alt="업로드된 이미지"
            className="w-full h-64 object-cover rounded-xl border-2 border-dashed border-light-300 dark:border-dark-600 shadow-sm"
          />
          <button
            onClick={onRemoveImage}
            className="absolute top-2 right-2 p-2 bg-toss-error text-white rounded-full hover:bg-red-600 transition-colors shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          className={`w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragOver
              ? 'border-primary-500 bg-primary-50 bg-opacity-10'
              : 'border-light-300 dark:border-dark-600 hover:border-primary-500 dark:hover:border-primary-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center space-y-4">
            {isDragOver ? (
              <Upload className="w-12 h-12 text-primary-500 animate-bounce" />
            ) : (
              <ImageIcon className="w-12 h-12 text-light-500 dark:text-gray-400" />
            )}
            
            <div className="text-center">
              <p className="text-lg font-medium text-light-700 dark:text-gray-300 mb-2">
                {isDragOver ? '이미지를 여기에 놓으세요' : '이미지를 드래그하거나 클릭하세요'}
              </p>
              <p className="text-sm text-light-500 dark:text-gray-500">
                JPG, PNG, GIF 파일을 지원합니다
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUpload; 