/**
 * Inline Media Browser
 * 페이지 내에 임베드되는 인라인 미디어 브라우저
 */

import { useState, useCallback } from 'react';
import {
  Image,
  Video,
  Upload,
  Search,
  Grid3X3,
  List,
  Filter,
  RefreshCw,
  Check,
  X,
  Eye,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMediaSelector } from './hooks/useMediaSelector';
import { MediaItem, InlineMediaBrowserProps } from './types';
import { formatFileSize } from './utils/mediaUtils';
import { cn } from '@/lib/utils';

const InlineMediaBrowser: React.FC<InlineMediaBrowserProps> = ({
  selectedItems = [],
  onSelectionChange,
  multiple = false,
  acceptedTypes = ['image', 'video'],
  maxSelection = multiple ? 50 : 1,
  height = 600,
  showToolbar = true
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const {
    state,
    actions,
    computed,
    allFiles,
    isLoading,
    error,
    loadMoreRef,
    isFetchingNextPage,
    refetch
  } = useMediaSelector({
    multiple,
    maxSelection,
    acceptedTypes,
    initialSelection: selectedItems,
    enabled: true
  });

  // Handle selection changes
  const handleSelectionChange = useCallback((fileId: string) => {
    actions.selectFile(fileId);

    // Get updated selection
    const updatedSelection = state.selectedFiles.includes(fileId)
      ? state.selectedFiles.filter(id => id !== fileId)
      : multiple
        ? [...state.selectedFiles, fileId].slice(0, maxSelection)
        : [fileId];

    const selectedObjects = allFiles.filter(file => updatedSelection.includes(file.id));
    onSelectionChange(selectedObjects);
  }, [actions, state.selectedFiles, multiple, maxSelection, allFiles, onSelectionChange]);

  // Filter options
  const filterOptions = [
    { value: 'all', label: '모든 파일' },
    { value: 'image', label: '이미지만' },
    { value: 'video', label: '비디오만' }
  ];

  const renderMediaItem = (item: MediaItem, index: number) => {
    const isSelected = state.selectedFiles.includes(item.id);

    if (viewMode === 'list') {
      return (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all group",
            isSelected
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          )}
          onClick={() => handleSelectionChange(item.id)}
        >
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {item.type === 'image' ? (
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.alt || item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
              {item.title}
            </h4>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Badge variant="secondary" className="text-xs">
                {item.type}
              </Badge>
              {item.fileSize && (
                <span>{formatFileSize(item.fileSize)}</span>
              )}
              {item.width && item.height && (
                <span>{item.width} × {item.height}</span>
              )}
            </div>
            {item.uploadedAt && (
              <p className="text-xs text-gray-400 mt-1">
                {new Date(item.uploadedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setPreviewItem(item);
              }}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      );
    }

    // Grid view
    return (
      <div
        key={item.id}
        className={cn(
          "relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all group",
          isSelected
            ? "ring-2 ring-blue-500 ring-offset-2"
            : "hover:ring-2 hover:ring-gray-300 hover:ring-offset-1"
        )}
        onClick={() => handleSelectionChange(item.id)}
      >
        {item.type === 'image' ? (
          <img
            src={item.thumbnailUrl || item.url}
            alt={item.alt || item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <Video className="w-8 h-8 text-white" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />

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

        {/* Actions */}
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setPreviewItem(item);
            }}
            size="sm"
            variant="secondary"
            className="h-6 w-6 p-0 bg-white/80 hover:bg-white"
          >
            <Eye className="w-3 h-3" />
          </Button>
        </div>

        {/* Type indicator */}
        {item.type === 'video' && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-xs bg-black/70 text-white">
              비디오
            </Badge>
          </div>
        )}
      </div>
    );
  };

  // Preview Modal
  const PreviewModal = () => {
    if (!previewItem) return null;

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
        onClick={() => setPreviewItem(null)}
      >
        <div className="max-w-4xl max-h-screen p-8 relative">
          <Button
            onClick={() => setPreviewItem(null)}
            variant="secondary"
            size="sm"
            className="absolute -top-2 -right-2 rounded-full"
          >
            <X className="w-4 h-4" />
          </Button>

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
            <div className="flex items-center gap-2 text-sm opacity-80 mt-1">
              <span className="capitalize">{previewItem.type}</span>
              {previewItem.fileSize && (
                <>
                  <span>•</span>
                  <span>{formatFileSize(previewItem.fileSize)}</span>
                </>
              )}
              {previewItem.width && previewItem.height && (
                <>
                  <span>•</span>
                  <span>{previewItem.width} × {previewItem.height}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full border rounded-lg bg-white">
      {/* Toolbar */}
      {showToolbar && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">미디어 라이브러리</h3>
            <div className="flex items-center gap-2">
              {state.selectedFiles.length > 0 && (
                <Badge variant="secondary">
                  {state.selectedFiles.length}개 선택
                </Badge>
              )}
              <Button
                onClick={() => refetch()}
                size="sm"
                variant="outline"
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="파일명으로 검색..."
                  value={state.filters.searchTerm}
                  onChange={(e) => actions.updateFilter('searchTerm', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2">
              {acceptedTypes.length > 1 && (
                <Select
                  value={state.filters.fileType}
                  onValueChange={(value) => actions.updateFilter('fileType', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    "p-2 rounded transition-colors",
                    viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'
                  )}
                  title="그리드 뷰"
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
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {multiple && allFiles.length > 0 && (
                <Button
                  onClick={actions.selectAll}
                  size="sm"
                  variant="outline"
                >
                  {computed.isAllSelected ? '전체 해제' : '전체 선택'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        className="p-4 overflow-y-auto"
        style={{ height: showToolbar ? `${height - 140}px` : `${height}px` }}
      >
        {error ? (
          <div className="flex items-center justify-center h-32 text-red-600">
            <span>미디어를 불러오는데 실패했습니다.</span>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            <span className="ml-2 text-gray-600">미디어를 불러오는 중...</span>
          </div>
        ) : allFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Image className="w-12 h-12 mb-3" />
            <span className="text-lg font-medium mb-1">미디어 파일이 없습니다</span>
            <span className="text-sm">검색 조건을 변경하거나 새 파일을 업로드하세요</span>
          </div>
        ) : (
          <>
            <div className={cn(
              viewMode === 'grid'
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                : "space-y-3"
            )}>
              {allFiles.map((item, index) => renderMediaItem(item, index))}
            </div>

            {/* Load More */}
            <div ref={loadMoreRef} className="flex justify-center py-6">
              {isFetchingNextPage && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      <PreviewModal />
    </div>
  );
};

export default InlineMediaBrowser;