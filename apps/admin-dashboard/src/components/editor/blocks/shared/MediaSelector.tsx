/**
 * MediaSelector Component
 * Cover Block과 Gallery Block에서 공용으로 사용하는 미디어 선택 컴포넌트
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Search,
  Grid3X3,
  List,
  Check,
  Upload,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  FileImage,
  FileVideo,
  Loader2,
  AlertCircle,
  Eye,
  Download,
  Trash2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { MediaFile } from '@/types/content';
import { ContentApi } from '@/api/contentApi';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/utils/format';
import MediaGrid from '@/components/media/MediaGrid';

export interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  title: string;
  alt?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  caption?: string;
  uploadedAt?: string;
}

export interface MediaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem[] | MediaItem) => void;
  multiple?: boolean;
  acceptedTypes?: ('image' | 'video')[];
  selectedItems?: MediaItem[];
  maxSelection?: number;
  title?: string;
  className?: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'image' | 'video';

const MediaSelector: React.FC<MediaSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  acceptedTypes = ['image', 'video'],
  selectedItems = [],
  maxSelection = multiple ? 50 : 1,
  title = '미디어 선택',
  className
}) => {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filters, setFilters] = useState({
    searchTerm: '',
    fileType: acceptedTypes.length === 1 ? acceptedTypes[0] : ('all' as FilterType)
  });
  const [showUploader, setShowUploader] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const { ref: loadMoreRef, inView } = useInView();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Transform MediaFile to MediaItem
  const transformMediaFile = (file: any): MediaItem => {
    // Determine type from mimeType
    let mediaType: 'image' | 'video' = 'image';
    if (file.mimeType) {
      if (file.mimeType.startsWith('video/')) {
        mediaType = 'video';
      } else if (file.mimeType.startsWith('image/')) {
        mediaType = 'image';
      }
    }
    
    return {
      id: file.id,
      url: file.url || file.path || '',
      type: mediaType,
      title: file.originalFilename || file.filename || file.name || file.title || 'Untitled',
      alt: file.altText || file.alt || file.originalFilename || file.filename || '',
      width: file.width || file.dimensions?.width,
      height: file.height || file.dimensions?.height,
      fileSize: file.size || file.fileSize,
      mimeType: file.mimeType || file.mime_type,
      thumbnailUrl: file.thumbnailUrl || file.thumbnail || file.url,
      caption: file.caption || file.description || '',
      uploadedAt: file.uploadedAt || file.createdAt || file.created_at
    };
  };

  // Fetch media files with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    error
  } = useInfiniteQuery({
    queryKey: ['mediaFiles', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await ContentApi.getMediaFiles(
        pageParam,
        10,
        undefined,
        filters.fileType === 'all' ? undefined : filters.fileType,
        filters.searchTerm
      );
      return response;
    },
    getNextPageParam: (lastPage) => {
      // Handle nested response structure: { success: true, data: { media: [], pagination: {} } }
      const pagination = lastPage?.data?.pagination || lastPage?.pagination;
      if (pagination && pagination.page < pagination.totalPages) {
        return pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: isOpen
  });

  // Auto-load more when scrolled to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Only initialize selections when selectedItems are explicitly provided
  useEffect(() => {
    if (isOpen && selectedItems && selectedItems.length > 0) {
      setSelectedFiles(selectedItems.map(item => item.id));
    }
    // Don't clear selection automatically - let user manually select/deselect
  }, [isOpen]); // Removed selectedItems from dependencies to prevent unwanted resets

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedFiles.length > 0) {
            // Inline confirm selection logic
            onClose();
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSelectAll();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedFiles]); // Remove undefined functions from dependencies

  const allFiles = data?.pages?.flatMap(page => {
    // API response structure: { success: true, data: { media: [...], pagination: {...} } }
    const mediaArray = (page as any)?.data?.media || (page as any)?.media || (page as any)?.data || [];
    return Array.isArray(mediaArray) ? mediaArray.map(transformMediaFile) : [];
  }) || [];

  const selectedFileObjects = allFiles.filter(file => selectedFiles.includes(file.id));

  // Handle file selection
  const handleFileSelect = useCallback((fileId: string) => {
    if (multiple) {
      setSelectedFiles(prev => {
        if (prev.includes(fileId)) {
          return prev.filter(id => id !== fileId);
        }
        if (prev.length >= maxSelection) {
          toast.error(`최대 ${maxSelection}개까지 선택할 수 있습니다.`);
          return prev;
        }
        return [...prev, fileId];
      });
    } else {
      setSelectedFiles([fileId]);
    }
  }, [multiple, maxSelection]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedFiles.length === allFiles.length) {
      setSelectedFiles([]);
    } else {
      const fileIds = allFiles.slice(0, maxSelection).map(file => file.id);
      setSelectedFiles(fileIds);
      if (allFiles.length > maxSelection) {
        toast.error(`최대 ${maxSelection}개까지 선택할 수 있습니다.`);
      }
    }
  }, [selectedFiles.length, allFiles, maxSelection]);

  // Handle confirm selection
  const handleConfirmSelection = useCallback(() => {
    if (multiple) {
      onSelect(selectedFileObjects);
    } else if (selectedFileObjects.length > 0) {
      onSelect(selectedFileObjects[0]);
    }
    // Clear selection after confirming for next time
    setSelectedFiles([]);
    onClose();
  }, [multiple, selectedFileObjects, onSelect, onClose]);

  // Handle cancel - don't clear selection to maintain state
  const handleCancel = useCallback(() => {
    // Keep selection state for better UX
    onClose();
  }, [onClose]);

  // Update filter
  const updateFilter = useCallback((key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // File drop handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setShowUploader(true);
    handleFileUpload(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => {
      acc[`${type}/*`] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles: 10,
    maxSize: 100 * 1024 * 1024, // 100MB
    noClick: true
  });

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    const uploadItems: UploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadProgress(uploadItems);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => prev.map(item => ({
          ...item,
          progress: Math.min(item.progress + Math.random() * 20, 90)
        })));
      }, 500);

      await ContentApi.uploadFiles(files);

      clearInterval(progressInterval);

      setUploadProgress(prev => prev.map(item => ({
        ...item,
        progress: 100,
        status: 'success' as const
      })));

      toast.success(`${files.length}개 파일이 업로드되었습니다.`);

      // Refresh media list
      setTimeout(() => {
        refetch();
        setShowUploader(false);
        setUploadProgress([]);
      }, 1000);

    } catch (error: any) {
      setUploadProgress(prev => prev.map(item => ({
        ...item,
        status: 'error' as const,
        error: error.message || '업로드에 실패했습니다.'
      })));
      toast.error('업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // Render file icon
  const renderFileIcon = (item: MediaItem) => {
    if (item.type === 'video') {
      return <FileVideo className="w-8 h-8 text-purple-500" />;
    }
    return <FileImage className="w-8 h-8 text-blue-500" />;
  };

  // Render media item
  const renderMediaItem = (item: MediaItem, index: number) => {
    const isSelected = selectedFiles.includes(item.id);

    if (viewMode === 'list') {
      return (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all",
            isSelected
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          )}
          onClick={() => handleFileSelect(item.id)}
          role="button"
          tabIndex={0}
          aria-label={`Select ${item.title}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleFileSelect(item.id);
            }
          }}
        >
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
            {item.type === 'image' ? (
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.alt || item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-6 h-6 text-purple-500" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {item.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span className="capitalize">{item.type}</span>
              {item.fileSize && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(item.fileSize)}</span>
                </>
              )}
              {item.width && item.height && (
                <>
                  <span>•</span>
                  <span>{item.width} × {item.height}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewItem(item);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="미리보기"
            >
              <Eye className="w-4 h-4" />
            </button>

            {isSelected && (
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>
      );
    }

    // Grid view
    return (
      <div
        key={item.id}
        className={cn(
          "relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all group",
          "border-2",
          isSelected
            ? "border-blue-500 shadow-lg shadow-blue-500/30"
            : "border-gray-300 hover:border-blue-400 hover:shadow-md"
        )}
        onClick={() => handleFileSelect(item.id)}
        role="button"
        tabIndex={0}
        aria-label={`Select ${item.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFileSelect(item.id);
          }
        }}
      >
        {item.type === 'image' ? (
          <img
            src={item.thumbnailUrl || item.url}
            alt={item.alt || item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <Play className="w-8 h-8 text-white opacity-80" />
          </div>
        )}

        {/* Overlay - 선택된 경우 파란색 오버레이 추가 */}
        <div className={cn(
          "absolute inset-0 transition-all",
          isSelected 
            ? "bg-blue-500 bg-opacity-10" 
            : "bg-black bg-opacity-0 group-hover:bg-opacity-10"
        )} />

        {/* Selection indicator */}
        <div className="absolute top-2 right-2">
          {isSelected ? (
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
          ) : (
            <div className="w-6 h-6 border-2 border-white rounded-full bg-black bg-opacity-20 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Preview button */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreviewItem(item);
            }}
            className="p-1 bg-black bg-opacity-50 text-white rounded hover:bg-opacity-70"
            title="미리보기"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Type indicator */}
        {item.type === 'video' && (
          <div className="absolute bottom-2 left-2">
            <div className="px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded">
              비디오
            </div>
          </div>
        )}
      </div>
    );
  };

  // Upload modal
  const UploadModal = () => {
    if (!showUploader) return null;

    return (
      <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-10">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">파일 업로드</h3>
            <button
              onClick={() => setShowUploader(false)}
              disabled={isUploading}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {uploadProgress.length > 0 && (
            <div className="space-y-3">
              {uploadProgress.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate">{item.file.name}</span>
                    <span className="text-xs text-gray-500">
                      {Math.round(item.progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        item.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.error && (
                    <p className="text-xs text-red-600">{item.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Preview modal
  const PreviewModal = () => {
    if (!previewItem) return null;

    return (
      <div
        className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-20"
        onClick={() => setPreviewItem(null)}
      >
        <div className="max-w-4xl max-h-screen p-8 relative">
          <button
            onClick={() => setPreviewItem(null)}
            className="absolute -top-4 -right-4 p-2 bg-white rounded-full text-gray-600 hover:text-gray-800"
          >
            <X className="w-5 h-5" />
          </button>

          {previewItem.type === 'image' ? (
            <img
              src={previewItem.url}
              alt={previewItem.alt || previewItem.title}
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={previewItem.url}
              controls
              className="max-w-full max-h-full"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent text-white">
            <h3 className="font-medium">{previewItem.title}</h3>
            {previewItem.caption && (
              <p className="text-sm opacity-80 mt-1">{previewItem.caption}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn("fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-selector-title"
      {...getRootProps()}
    >
      <div
        className="bg-white rounded-lg max-w-6xl w-full mx-4 h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 id="media-selector-title" className="text-xl font-semibold text-gray-900">
              {title}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
              aria-label="닫기"
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
                  onChange={(e) => updateFilter('searchTerm', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="검색"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {acceptedTypes.length > 1 && (
                <select
                  value={filters.fileType}
                  onChange={(e) => updateFilter('fileType', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label="파일 타입 필터"
                >
                  <option value="all">모든 파일</option>
                  {acceptedTypes.map(type => (
                    <option key={type} value={type}>
                      {type === 'image' ? '이미지' : '비디오'}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                  )}
                  title="그리드 뷰"
                  aria-label="그리드 뷰"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                  )}
                  title="리스트 뷰"
                  aria-label="리스트 뷰"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <input {...getInputProps()} />
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.multiple = true;
                  input.accept = acceptedTypes.map(type => `${type}/*`).join(',');
                  input.onchange = (e) => {
                    const files = Array.from((e.target as HTMLInputElement).files || []);
                    if (files.length > 0) {
                      setShowUploader(true);
                      handleFileUpload(files);
                    }
                  };
                  input.click();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                aria-label="파일 업로드"
              >
                <Upload className="w-4 h-4" />
                업로드
              </button>

              {multiple && allFiles.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  aria-label={selectedFiles.length === allFiles.length ? '전체 선택 해제' : '전체 선택'}
                >
                  {selectedFiles.length === allFiles.length ? '전체 해제' : '전체 선택'}
                </button>
              )}
            </div>
          </div>

          {isDragActive && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-dashed border-blue-500 rounded-lg flex items-center justify-center">
              <div className="text-blue-600 text-lg font-medium">
                파일을 여기에 놓으세요
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" ref={scrollRef}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">미디어를 불러오는 중...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-600">
              <AlertCircle className="w-8 h-8 mr-2" />
              <span>미디어를 불러오는데 실패했습니다.</span>
            </div>
          ) : allFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileImage className="w-16 h-16 mb-4" />
              <span className="text-lg font-medium mb-2">미디어 파일이 없습니다</span>
              <span className="text-sm">파일을 업로드하거나 검색 조건을 변경해보세요</span>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <MediaGrid
                  items={allFiles.map(file => ({
                    ...file,
                    filename: file.title,
                    mediaType: file.type,
                    size: file.fileSize || 0
                  }))}
                  selectedIds={selectedFiles}
                  onItemSelect={(id, selected) => {
                    if (selected) {
                      handleFileSelect(id);
                    } else {
                      setSelectedFiles(prev => prev.filter(fileId => fileId !== id));
                    }
                  }}
                  onItemView={(item) => setPreviewItem(item)}
                />
              ) : (
                <div className="space-y-2">
                  {allFiles.map((item, index) => renderMediaItem(item, index))}
                </div>
              )}

              {/* Load More Trigger */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {isFetchingNextPage && (
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
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
                <span>
                  {selectedFiles.length}개 선택됨
                  {multiple && maxSelection > 1 && ` (최대 ${maxSelection}개)`}
                </span>
              ) : (
                <span>파일을 선택하세요</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmSelection}
                disabled={selectedFiles.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                선택 완료
              </button>
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        <UploadModal />

        {/* Preview Modal */}
        <PreviewModal />
      </div>
    </div>
  );
};

export default MediaSelector;