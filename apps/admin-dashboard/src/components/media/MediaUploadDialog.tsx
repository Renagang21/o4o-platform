import { useState, useEffect, useCallback, FC } from 'react';
import { Upload, X, Check, AlertCircle, File, Image, Film, Music, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { authClient } from '@o4o/auth-client'
import type { MediaType } from '@o4o/types'
import toast from 'react-hot-toast'

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  preview?: string
  metadata?: {
    title?: string
    alt?: string
    caption?: string
  }
}

interface MediaUploadDialogProps {
  _isOpen: boolean
  onClose: () => void
  onUploadComplete: () => void
  files?: FileList | null
  folderId?: string
  acceptedTypes?: string[]
  maxFileSize?: number // bytes
}

const MediaUploadDialog: FC<MediaUploadDialogProps> = ({
  _isOpen,
  onClose,
  onUploadComplete,
  files,
  folderId,
  acceptedTypes,
  maxFileSize = 100 * 1024 * 1024 // 100MB default
}) => {
  const [uploadFiles, setUploadFiles] = useState<any[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [currentEditingFile, setCurrentEditingFile] = useState<string | null>(null)

  // Initialize files when opened
  useEffect(() => {
    if (_isOpen && files && files.length > 0) {
      const newFiles: UploadFile[] = Array.from(files).map((file: File) => ({
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: 'pending' as const,
        progress: 0,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        }
      }))
      setUploadFiles(newFiles)
    }
  }, [_isOpen, files])

  // Clean up preview URLs
  useEffect(() => {
    return () => {
      uploadFiles.forEach((file: any) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [uploadFiles])

  // Get media type from file
  const getMediaType = (file: File): MediaType => {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type.startsWith('video/')) return 'video'
    if (file.type.startsWith('audio/')) return 'audio'
    if (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('msword') || 
        file.type.includes('spreadsheet') || file.type.includes('presentation')) return 'document'
    if (file.type.includes('zip') || file.type.includes('rar') || file.type.includes('tar')) return 'archive'
    return 'other'
  }

  // Get file icon
  const getFileIcon = (mediaType: MediaType) => {
    switch (mediaType) {
      case 'image':
        return <Image className="w-8 h-8" />
      case 'video':
        return <Film className="w-8 h-8" />
      case 'audio':
        return <Music className="w-8 h-8" />
      case 'document':
        return <FileText className="w-8 h-8" />
      default:
        return <File className="w-8 h-8" />
    }
  }

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles.length > 0) {
      const newFiles: UploadFile[] = Array.from(droppedFiles).map((file: any) => ({
        file,
        id: `${Date.now()}-${Math.random()}`,
        status: 'pending',
        progress: 0,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        metadata: {
          title: file.name.replace(/\.[^/.]+$/, ''),
        }
      }))
      setUploadFiles((prev: any) => [...prev, ...newFiles])
    }
  }, [])

  // Remove file
  const removeFile = (fileId: string) => {
    setUploadFiles((prev: any) => {
      const file = prev.find((f: any) => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f: any) => f.id !== fileId)
    })
  }

  // Update file metadata
  const updateFileMetadata = (fileId: string, metadata: Partial<UploadFile['metadata']>) => {
    setUploadFiles((prev: any) => prev.map((file: any) =>
      file.id === fileId
        ? { ...file, metadata: { ...file.metadata, ...metadata } }
        : file
    ))
  }

  // Upload single file
  const uploadFile = async (uploadFile: UploadFile) => {
    const formData = new FormData()
    formData.append('file', uploadFile.file)
    formData.append('title', uploadFile.metadata?.title || uploadFile.file.name)
    if (uploadFile.metadata?.alt) formData.append('alt', uploadFile.metadata.alt)
    if (uploadFile.metadata?.caption) formData.append('caption', uploadFile.metadata.caption)
    if (folderId) formData.append('folderId', folderId)

    try {
      // Update status to uploading
      setUploadFiles((prev: any) => prev.map((f: any) =>
        f.id === uploadFile.id ? { ...f, status: 'uploading' } : f
      ))

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadFiles((prev: any) => prev.map((f: any) =>
          f.id === uploadFile.id && f.status === 'uploading'
            ? { ...f, progress: Math.min(f.progress + 10, 90) }
            : f
        ))
      }, 200)

      const response = await authClient.api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      clearInterval(progressInterval)

      // Update status to success
      setUploadFiles((prev: any) => prev.map((f: any) =>
        f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
      ))

      return response.data
    } catch (error: any) {
      // Update status to error
      setUploadFiles((prev: any) => prev.map((f: any) =>
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: '업로드 실패' } 
          : f
      ))
      throw error
    }
  }

  // Start upload
  const startUpload = async () => {
    setIsUploading(true)
    const pendingFiles = uploadFiles.filter((f: any) => f.status === 'pending')
    
    let successCount = 0
    let errorCount = 0

    for (const file of pendingFiles) {
      try {
        await uploadFile(file)
        successCount++
      } catch (error: any) {
        errorCount++
    // Error logging - use proper error handler
      }
    }

    setIsUploading(false)

    if (successCount > 0) {
      toast.success(`${successCount}개 파일이 업로드되었습니다`)
      if (errorCount === 0) {
        onUploadComplete()
      }
    }

    if (errorCount > 0) {
      toast.error(`${errorCount}개 파일 업로드에 실패했습니다`)
    }
  }

  const pendingCount = uploadFiles.filter((f: any) => f.status === 'pending').length
  const uploadingCount = uploadFiles.filter((f: any) => f.status === 'uploading').length
  const successCount = uploadFiles.filter((f: any) => f.status === 'success').length
  const errorCount = uploadFiles.filter((f: any) => f.status === 'error').length

  return (
    <Dialog open={_isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>미디어 업로드</DialogTitle>
          <DialogDescription>
            이미지, 비디오, 문서 등을 업로드합니다
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {uploadFiles.length === 0 ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.multiple = true
                input.accept = acceptedTypes?.join(',') || '*'
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files
                  if (files) {
                    const newFiles: UploadFile[] = Array.from(files).map((file: any) => ({
                      file,
                      id: `${Date.now()}-${Math.random()}`,
                      status: 'pending',
                      progress: 0,
                      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
                      metadata: {
                        title: file.name.replace(/\.[^/.]+$/, ''),
                      }
                    }))
                    setUploadFiles(newFiles)
                  }
                }
                input.click()
              }}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="text-sm text-gray-500">
                최대 {formatFileSize(maxFileSize)} 크기의 파일 지원
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploadFiles.map((uploadFile: any) => (
                <div
                  key={uploadFile.id}
                  className={`border rounded-lg p-4 ${
                    uploadFile.status === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Preview */}
                    <div className="flex-shrink-0">
                      {uploadFile.preview ? (
                        <img
                          src={uploadFile.preview}
                          alt=""
                          className="w-20 h-20 rounded object-cover"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                          {getFileIcon(getMediaType(uploadFile.file))}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm truncate">
                            {uploadFile.metadata?.title || uploadFile.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(uploadFile.file.size)} · {getMediaType(uploadFile.file)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {uploadFile.status === 'pending' && (
                            <>
                              <Button
                                variant={"ghost" as const}
                                size={"sm" as const}
                                onClick={() => setCurrentEditingFile(uploadFile.id)}
                              >
                                편집
                              </Button>
                              <Button
                                variant={"ghost" as const}
                                size={"sm" as const}
                                onClick={() => removeFile(uploadFile.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {uploadFile.status === 'uploading' && (
                            <Badge variant="secondary">업로드 중</Badge>
                          )}
                          {uploadFile.status === 'success' && (
                            <Badge className="bg-green-100 text-green-800">
                              <Check className="w-3 h-3 mr-1" />
                              완료
                            </Badge>
                          )}
                          {uploadFile.status === 'error' && (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              실패
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      {uploadFile.status === 'uploading' && (
                        <Progress value={uploadFile.progress} className="h-1" />
                      )}

                      {/* Error message */}
                      {uploadFile.error && (
                        <p className="text-xs text-red-600 mt-1">{uploadFile.error}</p>
                      )}

                      {/* Metadata form */}
                      {currentEditingFile === uploadFile.id && (
                        <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded">
                          <div>
                            <Label htmlFor={`title-${uploadFile.id}`}>제목</Label>
                            <Input
                              id={`title-${uploadFile.id}`}
                              value={uploadFile.metadata?.title || ''}
                              onChange={(e: any) => updateFileMetadata(uploadFile.id, { title: e.target.value })}
                              placeholder="미디어 제목"
                            />
                          </div>
                          {getMediaType(uploadFile.file) === 'image' && (
                            <div>
                              <Label htmlFor={`alt-${uploadFile.id}`}>대체 텍스트</Label>
                              <Input
                                id={`alt-${uploadFile.id}`}
                                value={uploadFile.metadata?.alt || ''}
                                onChange={(e: any) => updateFileMetadata(uploadFile.id, { alt: e.target.value })}
                                placeholder="이미지 설명"
                              />
                            </div>
                          )}
                          <div>
                            <Label htmlFor={`caption-${uploadFile.id}`}>캡션</Label>
                            <Textarea
                              id={`caption-${uploadFile.id}`}
                              value={uploadFile.metadata?.caption || ''}
                              onChange={(e: any) => updateFileMetadata(uploadFile.id, { caption: e.target.value })}
                              placeholder="미디어 캡션"
                              rows={2}
                            />
                          </div>
                          <Button
                            variant={"outline" as const}
                            size={"sm" as const}
                            onClick={() => setCurrentEditingFile(null)}
                          >
                            완료
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              {pendingCount > 0 && <span>{pendingCount}개 대기 중</span>}
              {uploadingCount > 0 && <span className="ml-3">{uploadingCount}개 업로드 중</span>}
              {successCount > 0 && <span className="ml-3 text-green-600">{successCount}개 완료</span>}
              {errorCount > 0 && <span className="ml-3 text-red-600">{errorCount}개 실패</span>}
            </div>
            <div className="flex gap-2">
              <Button variant={"outline" as const} onClick={onClose}>
                취소
              </Button>
              <Button
                onClick={startUpload}
                disabled={pendingCount === 0 || isUploading}
              >
                {isUploading ? '업로드 중...' : `${pendingCount}개 업로드`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MediaUploadDialog