import { FC, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  preview?: string;
}

const MediaNew: FC = () => {
  const navigate = useNavigate();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const addFiles = (fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList).map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      status: 'pending',
      progress: 0,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    }));
    setUploadFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadFiles((prev) => {
      const files = prev.filter((f) => f.id !== id);
      // Clean up preview URL
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return files;
    });
  };

  const uploadFile = async (uploadFile: UploadFile) => {
    try {
      // Update status to uploading
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'uploading', progress: 10 }
            : f
        )
      );

      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('title', uploadFile.file.name.replace(/\.[^/.]+$/, ''));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);

      const response = await authClient.api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);

      // Update status to success
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      );

      return response.data;
    } catch (error) {
      // Update status to error
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: '업로드 실패' }
            : f
        )
      );
      throw error;
    }
  };

  const startUpload = async () => {
    setIsUploading(true);
    const pendingFiles = uploadFiles.filter((f) => f.status === 'pending');

    let successCount = 0;
    let errorCount = 0;

    for (const file of pendingFiles) {
      try {
        await uploadFile(file);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount}개 파일이 업로드되었습니다`);
      if (errorCount === 0) {
        setTimeout(() => {
          navigate('/media/library');
        }, 1500);
      }
    }

    if (errorCount > 0) {
      toast.error(`${errorCount}개 파일 업로드에 실패했습니다`);
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        addFiles(files);
      }
    };
    input.click();
  };

  return (
    <div className="wp-admin-content">
      <div className="wrap">
        <h1 className="wp-heading-inline">새 미디어 추가</h1>
        
        <div className="mt-6">
          {uploadFiles.length === 0 ? (
            <div
              className={`border-4 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleFileSelect}
              style={{ cursor: 'pointer' }}
            >
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                파일을 여기에 드래그하거나 클릭하여 선택하세요
              </h3>
              <p className="text-sm text-gray-500">
                최대 업로드 파일 크기: 100MB
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileSelect();
                }}
              >
                파일 선택
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  {uploadFiles.length}개 파일 선택됨
                </h3>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleFileSelect}
                  >
                    파일 추가
                  </Button>
                  <Button
                    onClick={startUpload}
                    disabled={isUploading || uploadFiles.every((f) => f.status !== 'pending')}
                  >
                    업로드 시작
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {uploadFiles.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className={`border rounded-lg p-4 ${
                      uploadFile.status === 'error'
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {uploadFile.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {uploadFile.status === 'pending' && (
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {uploadFile.preview && (
                      <img
                        src={uploadFile.preview}
                        alt=""
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}

                    {uploadFile.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    )}

                    {uploadFile.status === 'success' && (
                      <div className="text-green-600 text-sm">
                        ✓ 업로드 완료
                      </div>
                    )}

                    {uploadFile.status === 'error' && (
                      <div className="text-red-600 text-sm">
                        {uploadFile.error || '업로드 실패'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaNew;