/**
 * ImageUploader Component
 * 이미지 업로드 영역 컴포넌트
 */

import React from 'react';
import { ImageIcon, Upload, FileImage, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  isUploading: boolean;
  uploadProgress: number;
  isDragOver: boolean;
  dropZoneRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onMediaLibraryOpen: () => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  isUploading,
  uploadProgress,
  isDragOver,
  dropZoneRef,
  fileInputRef,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileSelect,
  onMediaLibraryOpen
}) => {
  return (
    <div
      ref={dropZoneRef}
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 text-center transition-all min-h-48',
        isDragOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50',
        isUploading && 'pointer-events-none opacity-50'
      )}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={onFileSelect}
      />

      {isUploading ? (
        <div className="space-y-4">
          <Upload className="h-16 w-16 mx-auto text-blue-500 animate-pulse" />
          <div className="w-full max-w-xs mx-auto">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <ImageIcon className="h-16 w-16 mx-auto text-gray-400" />
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload an image
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop an image here, or click to select
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Supports: JPG, PNG, GIF, WebP • Maximum size: 10MB
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={onMediaLibraryOpen}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Media Library
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileImage className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
