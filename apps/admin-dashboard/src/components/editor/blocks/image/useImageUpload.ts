/**
 * useImageUpload Hook
 * 이미지 업로드 로직을 관리하는 커스텀 훅
 */

import { useState, useCallback } from 'react';
import { mediaApi } from '@/services/api/postApi';

interface UploadResult {
  url: string;
  id: string;
  width: number;
  height: number;
}

export const useImageUpload = (
  onUploadComplete: (result: UploadResult & { alt: string }) => void
) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await mediaApi.upload(file, (progress) => {
        setUploadProgress(progress);
      });

      if (result.success && result.data) {
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          onUploadComplete({
            url: result.data!.url,
            id: result.data!.id,
            width: img.naturalWidth,
            height: img.naturalHeight,
            alt: file.name.replace(/\.[^/.]+$/, '')
          });
        };
        img.src = result.data.url;
      }
    } catch (error) {
      // Error handled
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadComplete]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, dropZoneRef: React.RefObject<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));

    if (imageFile) {
      handleFileUpload(imageFile);
    }
  }, [handleFileUpload]);

  return {
    isUploading,
    uploadProgress,
    isDragOver,
    handleFileUpload,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop
  };
};
