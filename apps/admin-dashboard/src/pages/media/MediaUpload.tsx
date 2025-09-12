import { FC, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, CheckCircle, AlertCircle, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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

const MediaUpload: FC = () => {
  const navigate = useNavigate();
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const addFiles = (files: File[]) => {
    const newFiles: UploadFile[] = files.map((file) => ({
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
      const removed = prev.find((f) => f.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return files;
    });
  };

  const uploadFile = async (uploadFile: UploadFile): Promise<boolean> => {
    try {
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
              ? { ...f, progress: Math.min(f.progress + 20, 90) }
              : f
          )
        );
      }, 300);

      const response = await authClient.api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(progressInterval);

      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'success', progress: 100 }
            : f
        )
      );

      return true;
    } catch (error) {
      setUploadFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? { ...f, status: 'error', error: 'Upload failed' }
            : f
        )
      );
      return false;
    }
  };

  const startUpload = async () => {
    setIsUploading(true);
    const pendingFiles = uploadFiles.filter((f) => f.status === 'pending');
    
    let successCount = 0;
    for (const file of pendingFiles) {
      const success = await uploadFile(file);
      if (success) successCount++;
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`);
      
      // If all files uploaded successfully, redirect to library
      if (successCount === pendingFiles.length) {
        setTimeout(() => {
          navigate('/media/library');
        }, 1500);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="wrap">
      <h1>Upload New Media</h1>
      
      <div style={{ marginTop: '20px' }}>
        {uploadFiles.length === 0 ? (
          // WordPress-style upload area
          <div
            className="upload-ui"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              border: `4px dashed ${isDragging ? '#2271b1' : '#c3c4c7'}`,
              borderRadius: '4px',
              padding: '120px 20px',
              textAlign: 'center',
              background: isDragging ? '#f0f8ff' : '#fff',
              transition: 'all 0.2s ease'
            }}
          >
            <div className="upload-inline-content">
              <h2 style={{ fontSize: '23px', fontWeight: 400, margin: '0 0 1em' }}>
                Drop files to upload
              </h2>
              <p style={{ fontSize: '20px', margin: '0 0 2em' }}>or</p>
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Files
              </Button>
              <p style={{ marginTop: '30px', fontSize: '14px', color: '#646970' }}>
                Maximum upload file size: 100 MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(Array.from(e.target.files));
                }
              }}
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
          </div>
        ) : (
          // Files list
          <div>
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>{uploadFiles.length} file{uploadFiles.length > 1 ? 's' : ''} selected</h2>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Add More Files
                </Button>
                <Button
                  onClick={startUpload}
                  disabled={isUploading || uploadFiles.every((f) => f.status !== 'pending')}
                >
                  Start Upload
                </Button>
              </div>
            </div>

            <div className="media-uploader-status" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'grid', gap: '10px' }}>
                {uploadFiles.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="media-uploader-item"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '15px',
                      background: uploadFile.status === 'error' ? '#fcf0f1' : '#fff',
                      border: '1px solid #c3c4c7',
                      borderRadius: '4px'
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: '60px', height: '60px', marginRight: '15px', flexShrink: 0 }}>
                      {uploadFile.preview ? (
                        <img
                          src={uploadFile.preview}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '2px'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: '#f0f0f1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '2px'
                        }}>
                          <File className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* File info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="filename" style={{ 
                        fontWeight: 500, 
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {uploadFile.file.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#646970' }}>
                        {formatFileSize(uploadFile.file.size)}
                      </div>
                      {uploadFile.status === 'uploading' && (
                        <div style={{ marginTop: '8px' }}>
                          <Progress value={uploadFile.progress} className="h-2" />
                        </div>
                      )}
                      {uploadFile.status === 'error' && (
                        <div style={{ fontSize: '13px', color: '#d63638', marginTop: '4px' }}>
                          {uploadFile.error}
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div style={{ marginLeft: '15px' }}>
                      {uploadFile.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {uploadFile.status === 'uploading' && (
                        <div className="spinner is-active"></div>
                      )}
                      {uploadFile.status === 'success' && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                      {uploadFile.status === 'error' && (
                        <AlertCircle className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(Array.from(e.target.files));
                }
              }}
              accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaUpload;