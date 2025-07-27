import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Video, Music, Archive, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';

interface UploadFile {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  uploadedUrl?: string;
  webpUrl?: string;
}

interface MediaItem {
  id: string;
  url: string;
  webpUrl?: string;
  name: string;
  type: string;
  size: number;
  createdAt?: string;
  altText?: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

interface MediaUploaderProps {
  onUploadComplete?: (files: MediaItem[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number; // in bytes
}

const DEFAULT_ACCEPT = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'],
  'video/*': ['.mp4', '.webm', '.ogg'],
  'audio/*': ['.mp3', '.wav', '.ogg'],
  'application/pdf': ['.pdf']
};

export default function MediaUploader({
  onUploadComplete,
  accept = DEFAULT_ACCEPT,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024 // 10MB
}: MediaUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [convertToWebP, setConvertToWebP] = useState(true);
  const queryClient = useQueryClient();

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, fileId }: { file: File; fileId: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('convertToWebP', convertToWebP.toString());

      // Track upload progress
      const config = {
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          updateFileProgress(fileId, percentCompleted);
        }
      };

      const response = await apiClient.post('/api/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        ...config
      });

      return response.data;
    },
    onSuccess: (data, variables) => {
      updateFileStatus(variables.fileId, 'completed', {
        uploadedUrl: data.url,
        webpUrl: data.webpUrl
      });
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success('파일이 업로드되었습니다');
    },
    onError: (error: unknown, variables) => {
      const message = error instanceof Error ? error.message : '업로드 실패';
      updateFileStatus(variables.fileId, 'error', { error: message });
      toast.error(message);
    }
  });

  // Update file progress
  const updateFileProgress = (fileId: string, progress: number) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, progress } : f
    ));
  };

  // Update file status
  const updateFileStatus = (fileId: string, status: UploadFile['status'], data?: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status, ...data } : f
    ));
  };

  // Remove file
  const removeFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Handle file drop/select
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      
      return {
        id,
        file,
        preview,
        progress: 0,
        status: 'pending' as const
      };
    });

    setFiles(prev => [...prev, ...newFiles]);

    // Auto-start upload
    newFiles.forEach(uploadFile => {
      updateFileStatus(uploadFile.id, 'uploading');
      uploadMutation.mutate({ file: uploadFile.file, fileId: uploadFile.id });
    });
  }, [convertToWebP]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize
  });

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-8 h-8" />;
    if (file.type.startsWith('video/')) return <Video className="w-8 h-8" />;
    if (file.type.startsWith('audio/')) return <Music className="w-8 h-8" />;
    if (file.type === 'application/pdf') return <FileText className="w-8 h-8" />;
    return <Archive className="w-8 h-8" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Check if any files are uploading
  const isUploading = files.some(f => f.status === 'uploading' || f.status === 'processing');

  return (
    <div className="space-y-4">
      {/* WebP conversion toggle */}
      <div className="flex items-center space-x-2">
        <Switch
          id="webp-convert"
          checked={convertToWebP}
          onCheckedChange={setConvertToWebP}
          disabled={isUploading}
        />
        <Label htmlFor="webp-convert" className="cursor-pointer">
          WebP로 자동 변환 (이미지 크기 30-50% 감소)
        </Label>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p className="text-lg text-blue-600">파일을 여기에 놓으세요</p>
        ) : (
          <>
            <p className="text-lg text-gray-600 mb-2">
              파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-sm text-gray-500">
              최대 {maxFiles}개 파일, 각 {formatFileSize(maxSize)} 이하
            </p>
          </>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map(file => (
            <Card key={file.id} className="p-4">
              <div className="flex items-start space-x-4">
                {/* Preview or icon */}
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                    {getFileIcon(file.file)}
                  </div>
                )}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.file.size)}
                        {file.webpUrl && ' • WebP 변환 완료'}
                      </p>
                    </div>
                    <Button
                      variant={"ghost" as const}
                      size={"sm" as const}
                      onClick={() => removeFile(file.id)}
                      disabled={file.status === 'uploading'}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Progress */}
                  {(file.status === 'uploading' || file.status === 'processing') && (
                    <div className="mt-2">
                      <Progress value={file.progress} className="h-2" />
                      <p className="text-xs text-gray-500 mt-1">
                        {file.status === 'processing' ? 'WebP 변환 중...' : `${file.progress}% 업로드 중...`}
                      </p>
                    </div>
                  )}

                  {/* Error */}
                  {file.status === 'error' && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{file.error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Success */}
                  {file.status === 'completed' && (
                    <p className="text-sm text-green-600 mt-2">
                      업로드 완료
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Upload complete callback */}
      {onUploadComplete && files.some(f => f.status === 'completed') && (
        <Button
          onClick={() => {
            const completedFiles = files
              .filter(f => f.status === 'completed')
              .map(f => ({
                id: f.id,
                name: f.file.name,
                url: f.uploadedUrl || '',
                webpUrl: f.webpUrl,
                size: f.file.size,
                type: f.file.type
              }));
            onUploadComplete(completedFiles);
          }}
          className="w-full"
        >
          선택 완료 ({files.filter(f => f.status === 'completed').length}개 파일)
        </Button>
      )}
    </div>
  );
}