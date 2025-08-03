import { ChangeEvent, FC, useRef, useState } from 'react';
import {
  Upload,
  FolderOpen,
  Grid,
  List,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  MoreVertical,
  Image,
  FileText,
  Film,
  Music,
  File,
  X,
  FolderPlus,
  Tag,
  Copy,
  Move,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { MediaItem, MediaFolder, MediaType } from '@o4o/types'
import toast from 'react-hot-toast'
import MediaUploadDialog from '@/components/media/MediaUploadDialog'
import MediaDetails from '@/components/media/MediaDetails'
import FolderManager from '@/components/media/FolderManager'

// type ViewMode = 'grid' | 'list' // Commented out as it's not used

const MediaLibrary: FC = () => {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [viewMode, setViewMode] = useState('grid')
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState({
    mediaType: 'all',
    folderId: undefined,
    status: 'all'
  })
  const [isUploaderOpen, setIsUploaderOpen] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [isFolderManagerOpen, setIsFolderManagerOpen] = useState(false)
  const [page, setPage] = useState(1)
  const limit = 24

  // Fetch media items
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['media', { ...filter, search: searchQuery, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString() as any,
        limit: limit.toString() as any,
      })

      if (searchQuery) params.append('search', searchQuery)
      if (filter.mediaType && filter.mediaType !== 'all') params.append('mediaType', filter.mediaType)
      if (filter.folderId) params.append('folderId', filter.folderId)
      if (filter.status && filter.status !== 'all') params.append('status', filter.status)

      const response = await authClient.api.get(`/media?${params}`)
      return response.data
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return authClient.api.post('/media/bulk', {
        action: 'delete',
        mediaIds: ids
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
      toast.success('미디어가 삭제되었습니다')
      setSelectedItems([])
    },
    onError: () => {
      toast.error('삭제에 실패했습니다')
    }
  })

  // Handle file upload
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setIsUploaderOpen(true)
    }
  }

  // Handle item selection
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev: any) =>
      prev.includes(itemId)
        ? prev.filter((id: any) => id !== itemId)
        : [...prev, itemId]
    )
  }

  const selectAll = () => {
    if (data?.items) {
      setSelectedItems(data.items.map((item: MediaItem) => item.id))
    }
  }

  const clearSelection = () => {
    setSelectedItems([])
  }

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return
    
    if (confirm(`정말 ${selectedItems.length}개의 미디어를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(selectedItems)
    }
  }

  // Get media icon
  const getMediaIcon = (mediaType: MediaType) => {
    switch (mediaType) {
      case 'image':
        return <Image className="w-5 h-5" />
      case 'video':
        return <Film className="w-5 h-5" />
      case 'audio':
        return <Music className="w-5 h-5" />
      case 'document':
        return <FileText className="w-5 h-5" />
      default:
        return <File className="w-5 h-5" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">미디어 라이브러리</h1>
          <p className="text-gray-600 mt-1">이미지, 비디오, 문서를 관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={"outline" as const}
            onClick={() => setIsFolderManagerOpen(true)}
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            폴더 관리
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            업로드
          </Button>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="미디어 검색..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select 
            value={filter.mediaType || 'all'} 
            onValueChange={(value: string) => setFilter({ ...filter, mediaType: value as MediaType | 'all' })}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="미디어 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 유형</SelectItem>
              <SelectItem value="image">이미지</SelectItem>
              <SelectItem value="video">비디오</SelectItem>
              <SelectItem value="audio">오디오</SelectItem>
              <SelectItem value="document">문서</SelectItem>
              <SelectItem value="other">기타</SelectItem>
            </SelectContent>
          </Select>

          {data?.folders && data.folders.length > 0 && (
            <Select 
              value={filter.folderId || 'all'} 
              onValueChange={(value: string) => setFilter({ ...filter, folderId: value === 'all' ? undefined : value as any })}
            >
              <SelectTrigger className="w-[180px]">
                <FolderOpen className="w-4 h-4 mr-2" />
                <SelectValue placeholder="폴더" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 폴더</SelectItem>
                <SelectItem value="uncategorized">미분류</SelectItem>
                {data.folders.map((folder: MediaFolder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-3">
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedItems.length}개 선택됨
              </span>
              <Button
                variant={"ghost" as const}
                size={"sm" as const}
                onClick={clearSelection}
              >
                <X className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger>
                  <Button variant={"outline" as const} size={"sm" as const}>
                    일괄 작업
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    다운로드
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Move className="w-4 h-4 mr-2" />
                    폴더 이동
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Tag className="w-4 h-4 mr-2" />
                    태그 추가
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleBulkDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size={"sm" as const}
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size={"sm" as const}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Media Grid/List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : data?.items?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Image className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">미디어가 없습니다</p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              첫 미디어 업로드
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data?.items?.map((item: MediaItem) => (
            <div
              key={item.id}
              className={`group relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                selectedItems.includes(item.id) 
                  ? 'border-blue-500 shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMedia(item)}
            >
              {/* Thumbnail */}
              <div className="aspect-square bg-gray-100 relative">
                {item.mediaType === 'image' && item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.alt || item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {getMediaIcon(item.mediaType)}
                  </div>
                )}
                
                {/* Selection checkbox */}
                <div
                  className="absolute top-2 left-2 z-10"
                  onClick={(e: any) => {
                    e.stopPropagation()
                    toggleItemSelection(item.id)
                  }}
                >
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    className="bg-white shadow-sm"
                  />
                </div>

                {/* Status badge */}
                {item.status !== 'ready' && (
                  <Badge
                    variant={item.status === 'processing' ? 'secondary' : 'destructive'}
                    className="absolute top-2 right-2"
                  >
                    {item.status === 'processing' ? '처리중' : '실패'}
                  </Badge>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex items-center gap-2">
                    <Button
                      size={"sm" as const}
                      variant="secondary"
                      onClick={(e: any) => {
                        e.stopPropagation()
                        setSelectedMedia(item)
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger onClick={(e: any) => e.stopPropagation()}>
                        <Button size={"sm" as const} variant="secondary">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>
                          <Edit2 className="w-4 h-4 mr-2" />
                          편집
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          URL 복사
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          다운로드
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            if (confirm('정말 삭제하시겠습니까?')) {
                              deleteMutation.mutate([item.id])
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-2">
                <p className="text-xs font-medium truncate">{item.title}</p>
                <p className="text-xs text-gray-500">{formatFileSize(item.size)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // List view
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <Checkbox
                    checked={selectedItems.length === data?.items?.length && data?.items?.length > 0}
                    onCheckedChange={(checked: boolean) => checked ? selectAll() : clearSelection()}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">미디어</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">크기</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">업로드</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.items?.map((item: MediaItem) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {item.mediaType === 'image' && item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.alt || item.title}
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                          {getMediaIcon(item.mediaType)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-gray-500">{item.filename}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={"outline" as const}>{item.mediaType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatFileSize(item.size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div>
                      <p>{new Date(item.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs">{item.uploadedBy.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant={"ghost" as const} size={"sm" as const}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedMedia(item)}>
                          <Eye className="w-4 h-4 mr-2" />
                          보기
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit2 className="w-4 h-4 mr-2" />
                          편집
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          URL 복사
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          다운로드
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            if (confirm('정말 삭제하시겠습니까?')) {
                              deleteMutation.mutate([item.id])
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">
            총 {data.total}개 중 {(page - 1) * limit + 1}-{Math.min(page * limit, data.total)}개 표시
          </span>
          <div className="flex gap-2">
            <Button
              variant={"outline" as const}
              size={"sm" as const}
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              이전
            </Button>
            <Button
              variant={"outline" as const}
              size={"sm" as const}
              onClick={() => setPage(page + 1)}
              disabled={page === data.totalPages}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {/* Media Upload Dialog */}
      <MediaUploadDialog
        _isOpen={isUploaderOpen}
        onClose={() => {
          setIsUploaderOpen(false)
          fileInputRef.current!.value = ''
        }}
        onUploadComplete={() => {
          refetch()
          setIsUploaderOpen(false)
          fileInputRef.current!.value = ''
        }}
        files={fileInputRef.current?.files || undefined}
        folderId={filter.folderId}
      />

      {/* Media Details */}
      {selectedMedia && (
        <MediaDetails
          media={selectedMedia}
          onClose={() => setSelectedMedia(null)}
          onUpdate={() => refetch()}
          onDelete={() => {
            refetch()
            setSelectedMedia(null)
          }}
        />
      )}

      {/* Folder Manager */}
      <FolderManager
        _isOpen={isFolderManagerOpen}
        onClose={() => setIsFolderManagerOpen(false)}
        onFolderSelect={(folderId) => {
          setFilter({ ...filter, folderId: folderId as any })
          setIsFolderManagerOpen(false)
        }}
      />
    </div>
  )
}

export default MediaLibrary