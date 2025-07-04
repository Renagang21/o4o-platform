import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  X, 
  File, 
  Image, 
  Video, 
  Music, 
  FileText,
  AlertCircle,
  CheckCircle,
  Loader
} from 'lucide-react'
import { formatFileSize } from '@/utils/format'

interface MediaUploaderProps {
  onUpload: (files: File[]) => Promise<void>
  onClose: () => void
  currentFolder?: string
  maxFiles?: number
  maxFileSize?: number
  allowedTypes?: string[]
}

interface UploadingFile {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

const MediaUploader: React.FC<MediaUploaderProps> = ({
  onUpload,
  onClose,
  currentFolder,
  maxFiles = 20,
  maxFileSize = 100 * 1024 * 1024, // 100MB
  allowedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf']
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error: any) => {
          let message = '업로드할 수 없는 파일입니다.'
          if (error.code === 'file-too-large') {
            message = `파일 크기가 너무 큽니다. (최대 ${formatFileSize(maxFileSize)})`
          } else if (error.code === 'file-invalid-type') {
            message = '지원하지 않는 파일 형식입니다.'
          }
          
          setUploadingFiles(prev => [...prev, {
            file,
            progress: 0,
            status: 'error',
            error: message
          }])
        })
      })
    }

    // Add accepted files
    const newFiles = acceptedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const
    }))
    
    setUploadingFiles(prev => [...prev, ...newFiles])
  }, [maxFileSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize: maxFileSize,
    accept: allowedTypes.reduce((acc, type) => {
      const [category, extension] = type.split('/')
      if (extension === '*') {
        if (category === 'image') {
          acc[type] = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg']
        } else if (category === 'video') {
          acc[type] = ['.mp4', '.webm', '.ogg', '.mov']
        } else if (category === 'audio') {
          acc[type] = ['.mp3', '.wav', '.ogg', '.m4a']
        }
      } else {
        acc[type] = [`.${extension}`]
      }
      return acc
    }, {} as Record<string, string[]>)
  })

  const startUpload = async () => {
    const pendingFiles = uploadingFiles.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    setIsUploading(true)

    // Update status to uploading
    setUploadingFiles(prev => prev.map(f => 
      f.status === 'pending' ? { ...f, status: 'uploading' } : f
    ))

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => prev.map(f => {
          if (f.status === 'uploading' && f.progress < 90) {
            return { ...f, progress: f.progress + 10 }
          }
          return f
        }))
      }, 300)

      // Upload files
      await onUpload(pendingFiles.map(f => f.file))

      // Clear progress interval
      clearInterval(progressInterval)

      // Mark all as success
      setUploadingFiles(prev => prev.map(f => 
        f.status === 'uploading' ? { ...f, status: 'success', progress: 100 } : f
      ))

      // Close after a short delay
      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (error) {
      // Mark failed uploads
      setUploadingFiles(prev => prev.map(f => 
        f.status === 'uploading' 
          ? { ...f, status: 'error', error: '업로드 실패' } 
          : f
      ))
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file: File) => {
    const type = file.type.split('/')[0]
    switch (type) {
      case 'image':
        return <Image className="w-8 h-8 text-blue-500" />
      case 'video':
        return <Video className="w-8 h-8 text-purple-500" />
      case 'audio':
        return <Music className="w-8 h-8 text-green-500" />
      default:
        if (file.type === 'application/pdf') {
          return <FileText className="w-8 h-8 text-red-500" />
        }
        return <File className="w-8 h-8 text-gray-500" />
    }
  }

  const canUpload = uploadingFiles.some(f => f.status === 'pending') && !isUploading

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">파일 업로드</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isUploading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          {currentFolder && (
            <p className="text-sm text-gray-600 mt-1">
              업로드 위치: {currentFolder}
            </p>
          )}
        </div>

        {/* Dropzone */}
        <div className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-lg text-blue-600">파일을 여기에 놓으세요...</p>
            ) : (
              <>
                <p className="text-lg text-gray-700 mb-2">
                  파일을 드래그하거나 클릭하여 선택하세요
                </p>
                <p className="text-sm text-gray-500">
                  최대 {maxFiles}개, 파일당 최대 {formatFileSize(maxFileSize)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* File List */}
        {uploadingFiles.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              업로드 파일 ({uploadingFiles.length}개)
            </h3>
            <div className="space-y-2">
              {uploadingFiles.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    item.status === 'error' 
                      ? 'border-red-200 bg-red-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {getFileIcon(item.file)}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {item.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {item.error && (
                      <p className="text-xs text-red-600 mt-1">{item.error}</p>
                    )}
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {item.status === 'pending' && !isUploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                    {item.status === 'uploading' && (
                      <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {uploadingFiles.filter(f => f.status === 'pending').length}개 대기 중
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                disabled={isUploading}
                className="wp-button-secondary"
              >
                취소
              </button>
              <button
                onClick={startUpload}
                disabled={!canUpload}
                className="wp-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    업로드
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MediaUploader