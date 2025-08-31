import React, { useState, useCallback, useRef } from 'react';
import { 
  Upload, 
  X, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Image,
  Video,
  File,
  Trash2
} from 'lucide-react';

interface MediaFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  url?: string;
  thumbnailUrl?: string;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    frameRate?: number;
    codec?: string;
  };
}

interface MediaUploadProps {
  acceptedTypes?: string[];
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  autoUpload?: boolean;
  uploadEndpoint?: string;
  onUploadStart?: (file: MediaFile) => void;
  onUploadProgress?: (file: MediaFile, progress: number) => void;
  onUploadComplete?: (file: MediaFile) => void;
  onUploadError?: (file: MediaFile, error: string) => void;
  onFilesChange?: (files: MediaFile[]) => void;
}

const DEFAULT_ACCEPTED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp'
];

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export const MediaUpload: React.FC<MediaUploadProps> = ({
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxFileSize = MAX_FILE_SIZE,
  maxFiles = 10,
  autoUpload = true,
  uploadEndpoint = '/api/signage/media/upload',
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onUploadError,
  onFilesChange
}) => {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Upload file to server
  const uploadFile = useCallback(async (mediaFile: MediaFile) => {
    const controller = new AbortController();
    uploadControllersRef.current.set(mediaFile.id, controller);

    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.id === mediaFile.id ? { ...f, status: 'uploading' } : f
    ));
    onUploadStart?.(mediaFile);

    const formData = new FormData();
    formData.append('file', mediaFile.file);
    formData.append('type', mediaFile.type);
    formData.append('name', mediaFile.name);

    try {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setFiles(prev => prev.map(f => 
            f.id === mediaFile.id ? { ...f, progress } : f
          ));
          onUploadProgress?.(mediaFile, progress);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          
          setFiles(prev => prev.map(f => 
            f.id === mediaFile.id ? {
              ...f,
              status: 'completed',
              progress: 100,
              url: response.url,
              thumbnailUrl: response.thumbnailUrl,
              metadata: response.metadata
            } : f
          ));

          const completedFile = {
            ...mediaFile,
            status: 'completed' as const,
            url: response.url,
            thumbnailUrl: response.thumbnailUrl,
            metadata: response.metadata
          };
          
          onUploadComplete?.(completedFile);
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        throw new Error('Network error occurred');
      });

      // Set abort handler
      controller.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      // Send request
      xhr.open('POST', uploadEndpoint);
      xhr.send(formData);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setFiles(prev => prev.map(f => 
        f.id === mediaFile.id ? { ...f, status: 'error', error: errorMessage } : f
      ));
      onUploadError?.(mediaFile, errorMessage);
    } finally {
      uploadControllersRef.current.delete(mediaFile.id);
    }
  }, [onUploadStart, onUploadProgress, onUploadComplete, onUploadError]);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: MediaFile[] = [];
    const errors: string[] = [];

    Array.from(selectedFiles).forEach((file) => {
      // Validate file type
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: 지원하지 않는 파일 형식입니다`);
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: 파일 크기가 너무 큽니다 (최대 ${formatFileSize(maxFileSize)})`);
        return;
      }

      // Check max files limit
      if (files.length + newFiles.length >= maxFiles) {
        errors.push(`최대 ${maxFiles}개 파일만 업로드할 수 있습니다`);
        return;
      }

      const mediaFile: MediaFile = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending'
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        mediaFile.preview = URL.createObjectURL(file);
      }

      // Create video thumbnail
      if (file.type.startsWith('video/')) {
        createVideoThumbnail(file).then(thumbnail => {
          setFiles(prev => prev.map(f => 
            f.id === mediaFile.id ? { ...f, preview: thumbnail } : f
          ));
        });
      }

      newFiles.push(mediaFile);
    });

    if (errors.length > 0) {
      console.error('File validation errors:', errors);
      // Show errors to user
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);

    // Auto upload if enabled
    if (autoUpload) {
      newFiles.forEach(file => uploadFile(file));
    }
  }, [files, acceptedTypes, maxFileSize, maxFiles, autoUpload, onFilesChange, uploadFile]);

  // Cancel upload
  const cancelUpload = (fileId: string) => {
    const controller = uploadControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
      uploadControllersRef.current.delete(fileId);
    }

    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Remove file
  const removeFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    
    setFiles(prev => prev.filter(f => f.id !== fileId));
    onFilesChange?.(files.filter(f => f.id !== fileId));
  };

  // Retry failed upload
  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      uploadFile(file);
    }
  };

  // Create video thumbnail
  const createVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      video.autoplay = true;
      video.muted = true;
      video.src = URL.createObjectURL(file);

      video.onloadeddata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context?.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
          URL.revokeObjectURL(video.src);
        }, 'image/jpeg', 0.7);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Failed to load video'));
      };
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Get file icon
  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-8
          transition-all duration-200 cursor-pointer
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <Upload className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="text-sm text-gray-500">
            최대 {formatFileSize(maxFileSize)}, {maxFiles}개 파일까지 업로드 가능
          </p>
          <p className="text-xs text-gray-400 mt-2">
            지원 형식: MP4, WebM, JPEG, PNG, GIF
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-900">
            업로드 파일 ({files.length})
          </h3>
          
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center space-x-4">
                {/* Preview */}
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.size)}
                  </p>

                  {/* Progress Bar */}
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">업로드 중...</span>
                        <span className="text-gray-900">{file.progress}%</span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  {file.status === 'processing' && (
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      처리 중...
                    </div>
                  )}

                  {file.status === 'completed' && (
                    <div className="mt-2 flex items-center text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      업로드 완료
                    </div>
                  )}

                  {file.status === 'error' && (
                    <div className="mt-2 flex items-center text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      {file.error || '업로드 실패'}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  {file.status === 'uploading' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelUpload(file.id);
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}

                  {file.status === 'error' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        retryUpload(file.id);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      재시도
                    </button>
                  )}

                  {(file.status === 'completed' || file.status === 'pending') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {file.metadata && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {file.metadata.width && file.metadata.height && (
                      <span>{file.metadata.width} × {file.metadata.height}</span>
                    )}
                    {file.metadata.duration && (
                      <span>{Math.round(file.metadata.duration)}초</span>
                    )}
                    {file.metadata.frameRate && (
                      <span>{file.metadata.frameRate}fps</span>
                    )}
                    {file.metadata.codec && (
                      <span>{file.metadata.codec}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload All Button (for manual upload mode) */}
      {!autoUpload && files.some(f => f.status === 'pending') && (
        <div className="mt-4">
          <button
            onClick={() => {
              files.filter(f => f.status === 'pending').forEach(uploadFile);
            }}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            모두 업로드 ({files.filter(f => f.status === 'pending').length}개)
          </button>
        </div>
      )}
    </div>
  );
};