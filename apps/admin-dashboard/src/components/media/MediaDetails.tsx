import React, { useState } from 'react'
import { X, Download, Copy, Trash2, Save, ExternalLink, Calendar, User, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { MediaItem, MediaEditDto } from '@o4o/types'
import toast from 'react-hot-toast'

interface MediaDetailsProps {
  media: MediaItem
  onClose: () => void
  onUpdate: () => void
  onDelete: () => void
}

const MediaDetails: React.FC<MediaDetailsProps> = ({
  media,
  onClose,
  onUpdate,
  onDelete
}) => {
  const queryClient = useQueryClient()
  const [editData, setEditData] = useState<MediaEditDto>({
    title: media.title,
    alt: media.alt,
    caption: media.caption,
    description: media.description,
    tags: media.tags,
    folderId: media.folderId,
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: MediaEditDto) => {
      return authClient.api.put(`/media/${media.id}`, data)
    },
    onSuccess: () => {
      toast.success('미디어가 업데이트되었습니다')
      queryClient.invalidateQueries({ queryKey: ['media'] })
      onUpdate()
    },
    onError: () => {
      toast.error('업데이트에 실패했습니다')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      return authClient.api.delete(`/media/${media.id}`)
    },
    onSuccess: () => {
      toast.success('미디어가 삭제되었습니다')
      queryClient.invalidateQueries({ queryKey: ['media'] })
      onDelete()
    },
    onError: () => {
      toast.error('삭제에 실패했습니다')
    }
  })

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Copy URL to clipboard
  const copyUrl = () => {
    navigator.clipboard.writeText(media.url)
    toast.success('URL이 복사되었습니다')
  }

  // Handle save
  const handleSave = () => {
    updateMutation.mutate(editData)
  }

  // Handle delete
  const handleDelete = () => {
    if (confirm('정말 이 미디어를 삭제하시겠습니까?')) {
      deleteMutation.mutate()
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>미디어 상세</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyUrl}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(media.url, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = media.url
                  a.download = media.filename
                  a.click()
                }}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview */}
            <div>
              <div className="bg-gray-100 rounded-lg p-4">
                {media.mediaType === 'image' ? (
                  <img
                    src={media.url}
                    alt={media.alt || media.title}
                    className="w-full h-auto rounded"
                  />
                ) : media.mediaType === 'video' ? (
                  <video
                    src={media.url}
                    controls
                    className="w-full h-auto rounded"
                  />
                ) : media.mediaType === 'audio' ? (
                  <audio
                    src={media.url}
                    controls
                    className="w-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <ImageIcon className="w-16 h-16 mb-4" />
                    <p className="text-sm">미리보기를 사용할 수 없습니다</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => window.open(media.url, '_blank')}
                    >
                      파일 열기
                    </Button>
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-gray-500">파일명</span>
                  <span className="text-sm font-medium">{media.filename}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-gray-500">유형</span>
                  <Badge variant="outline">{media.mimeType}</Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-gray-500">크기</span>
                  <span className="text-sm font-medium">{formatFileSize(media.size)}</span>
                </div>
                {(media.width && media.height) && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-500">크기</span>
                    <span className="text-sm font-medium">{media.width} × {media.height}px</span>
                  </div>
                )}
                {media.duration && (
                  <div className="flex items-center justify-between py-2 border-b">
                    <span className="text-sm text-gray-500">길이</span>
                    <span className="text-sm font-medium">
                      {Math.floor(media.duration / 60)}:{(media.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    업로드
                  </span>
                  <span className="text-sm font-medium">
                    {new Date(media.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    업로더
                  </span>
                  <span className="text-sm font-medium">{media.uploadedBy.name}</span>
                </div>
              </div>
            </div>

            {/* Edit form */}
            <div>
              <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">일반</TabsTrigger>
                  <TabsTrigger value="metadata">메타데이터</TabsTrigger>
                  <TabsTrigger value="usage">사용처</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general" className="space-y-4">
                  <div>
                    <Label htmlFor="title">제목</Label>
                    <Input
                      id="title"
                      value={editData.title || ''}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="미디어 제목"
                    />
                  </div>

                  {media.mediaType === 'image' && (
                    <div>
                      <Label htmlFor="alt">대체 텍스트</Label>
                      <Input
                        id="alt"
                        value={editData.alt || ''}
                        onChange={(e) => setEditData({ ...editData, alt: e.target.value })}
                        placeholder="이미지를 설명하는 텍스트"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        스크린 리더 사용자를 위한 이미지 설명
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="caption">캡션</Label>
                    <Textarea
                      id="caption"
                      value={editData.caption || ''}
                      onChange={(e) => setEditData({ ...editData, caption: e.target.value })}
                      placeholder="미디어 캡션"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">설명</Label>
                    <Textarea
                      id="description"
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      placeholder="미디어에 대한 상세 설명"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">태그</Label>
                    <Input
                      id="tags"
                      value={editData.tags?.join(', ') || ''}
                      onChange={(e) => setEditData({ 
                        ...editData, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      })}
                      placeholder="태그1, 태그2, 태그3"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      쉼표로 구분하여 입력
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      저장
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="metadata" className="space-y-4">
                  {media.metadata && Object.entries(media.metadata).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(media.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-2 border-b">
                          <span className="text-sm text-gray-500">{key}</span>
                          <span className="text-sm font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">
                      메타데이터가 없습니다
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="usage" className="space-y-4">
                  {media.attachedTo && media.attachedTo.length > 0 ? (
                    <div className="space-y-2">
                      {media.attachedTo.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium text-sm">{attachment.postTitle}</p>
                            <p className="text-xs text-gray-500">{attachment.postType}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/content/${attachment.postType}/${attachment.postId}/edit`, '_blank')}
                          >
                            편집
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">
                      사용처가 없습니다
                    </p>
                  )}
                </TabsContent>
              </Tabs>

              {/* URL Copy */}
              <div className="mt-6 p-4 bg-gray-50 rounded">
                <Label>파일 URL</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={media.url}
                    readOnly
                    className="bg-white"
                  />
                  <Button
                    variant="outline"
                    onClick={copyUrl}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Variations */}
              {media.variations && Object.keys(media.variations).length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <Label>이미지 크기</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">원본</span>
                      <span className="text-sm text-gray-500">
                        {media.width} × {media.height}px
                      </span>
                    </div>
                    {Object.entries(media.variations).map(([size, variation]) => variation && (
                      <div key={size} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{size}</span>
                        <span className="text-sm text-gray-500">
                          {variation.width} × {variation.height}px
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MediaDetails