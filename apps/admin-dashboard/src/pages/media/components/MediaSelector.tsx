import { useState, useEffect, FC } from 'react';
import { 
  X, 
  Search, 
  Grid3X3, 
  List,
  Check,
  Upload
} from 'lucide-react'
import { MediaFile } from '@/types/content'
import { ContentApi } from '@/api/contentApi'
import MediaGrid from './MediaGrid'
import MediaList from './MediaList'
import MediaUploader from './MediaUploader'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import toast from 'react-hot-toast'

interface MediaSelectorProps {
  multiple?: boolean
  allowedTypes?: string[]
  onSelect: (files: MediaFile[]) => void
  onClose: () => void
  maxFiles?: number
  initialSelection?: string[]
}

const MediaSelector: FC<MediaSelectorProps> = ({
  multiple = true,
  allowedTypes = ['image'],
  onSelect,
  onClose,
  maxFiles = 10,
  initialSelection = []
}) => {
  const [selectedFiles, setSelectedFiles] = useState(initialSelection)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showUploader, setShowUploader] = useState(false)
  const [filters, setFilters] = useState({
    searchTerm: '',
    fileType: allowedTypes.length === 1 ? allowedTypes[0] : ''
  })

  const { ref: loadMoreRef, inView } = useInView()

  // Fetch media files with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['mediaFiles', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await ContentApi.getMediaFiles(
        pageParam,
        50,
        undefined,
        filters.fileType,
        filters.searchTerm
      )
      return response
    },
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage
      if (pagination && pagination.currentPage < pagination.totalPages) {
        return pagination.currentPage + 1
      }
      return undefined
    },
    initialPageParam: 1
  })

  // Auto-load more when scrolled to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  const allFiles = data?.pages.flatMap(page => page.data) || []
  const selectedFileObjects = allFiles.filter((file: any) => selectedFiles.includes(file.id))

  const handleFileSelect = (fileId: string) => {
    if (multiple) {
      setSelectedFiles((prev: any) => {
        if (prev.includes(fileId)) {
          return prev.filter((id: any) => id !== fileId)
        }
        if (prev.length >= maxFiles) {
          toast.error(`최대 ${maxFiles}개까지 선택할 수 있습니다.`)
          return prev
        }
        return [...prev, fileId]
      })
    } else {
      setSelectedFiles([fileId])
    }
  }

  const handleSelectAll = () => {
    if (selectedFiles.length === allFiles.length) {
      setSelectedFiles([])
    } else {
      const fileIds = allFiles.slice(0, maxFiles).map((file: any) => file.id)
      setSelectedFiles(fileIds)
      if (allFiles.length > maxFiles) {
        toast.error(`최대 ${maxFiles}개까지 선택할 수 있습니다.`)
      }
    }
  }

  const handleConfirmSelection = () => {
    onSelect(selectedFileObjects)
  }

  const handleUploadComplete = async (files: File[]) => {
    try {
      await ContentApi.uploadFiles(files)
      toast.success(`${files.length}개 파일이 업로드되었습니다.`)
      refetch()
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('업로드에 실패했습니다.')
    }
  }

  const updateFilter = (key: string, value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: value
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full mx-4 h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">미디어 선택</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="파일명으로 검색..."
                  value={filters.searchTerm}
                  onChange={(e: any) => updateFilter('searchTerm', e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {allowedTypes.length > 1 && (
                <select
                  value={filters.fileType}
                  onChange={(e: any) => updateFilter('fileType', e.target.value)}
                  className="wp-select"
                >
                  <option value="">모든 파일</option>
                  {allowedTypes.map((type: any) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              )}

              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                  title="그리드 뷰"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                  title="리스트 뷰"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowUploader(true)}
                className="wp-button-secondary"
              >
                <Upload className="w-4 h-4 mr-2" />
                업로드
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="loading-spinner" />
              <span className="ml-2 text-gray-600">미디어를 불러오는 중...</span>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <MediaGrid
                  files={allFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onSelectAll={handleSelectAll}
                />
              ) : (
                <MediaList
                  files={allFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onSelectAll={handleSelectAll}
                />
              )}

              {/* Load More Trigger */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="p-4 text-center">
                  {isFetchingNextPage && (
                    <>
                      <div className="loading-spinner inline-block" />
                      <span className="ml-2 text-gray-600">더 불러오는 중...</span>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedFiles.length > 0 ? (
                <span>{selectedFiles.length}개 선택됨</span>
              ) : (
                <span>파일을 선택하세요</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="wp-button-secondary"
              >
                취소
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={selectedFiles.length === 0}
                className="wp-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4 mr-2" />
                선택 완료
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploader && (
        <MediaUploader
          onUpload={handleUploadComplete}
          onClose={() => setShowUploader(false)}
          allowedTypes={allowedTypes.map((type: any) => `${type}/*`)}
        />
      )}
    </div>
  )
}

export default MediaSelector