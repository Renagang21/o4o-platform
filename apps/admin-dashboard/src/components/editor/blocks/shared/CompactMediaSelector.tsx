/**
 * Compact Media Selector
 * 작은 공간에서 사용할 수 있는 컴팩트한 미디어 선택기
 */

import { useState, useCallback } from 'react';
import {
  Image,
  Video,
  Upload,
  X,
  Grid3X3,
  List,
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useMediaSelector } from './hooks/useMediaSelector';
import { MediaItem, CompactMediaSelectorProps } from './types';
import { cn } from '@/lib/utils';

const CompactMediaSelector: React.FC<CompactMediaSelectorProps> = ({
  onSelect,
  multiple = false,
  acceptedTypes = ['image', 'video'],
  selectedItems = [],
  maxSelection = multiple ? 10 : 1,
  title = '미디어 선택',
  variant = 'compact',
  height = 400,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const {
    state,
    actions,
    computed,
    allFiles,
    isLoading,
    loadMoreRef,
    isFetchingNextPage
  } = useMediaSelector({
    multiple,
    maxSelection,
    acceptedTypes,
    initialSelection: selectedItems,
    enabled: isOpen
  });

  const handleSelect = useCallback((fileId: string) => {
    actions.selectFile(fileId);
  }, [actions]);

  const handleConfirm = useCallback(() => {
    if (multiple) {
      onSelect(computed.selectedFileObjects);
    } else if (computed.selectedFileObjects.length > 0) {
      onSelect(computed.selectedFileObjects[0]);
    }
    setIsOpen(false);
  }, [multiple, computed.selectedFileObjects, onSelect]);

  const renderMediaItem = (item: MediaItem) => {
    const isSelected = state.selectedFiles.includes(item.id);

    if (viewMode === 'list') {
      return (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-3 p-2 rounded cursor-pointer transition-colors",
            isSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
          )}
          onClick={() => handleSelect(item.id)}
        >
          <div className="w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0">
            {item.type === 'image' ? (
              <img
                src={item.thumbnailUrl || item.url}
                alt={item.alt || item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <Video className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            <p className="text-xs text-gray-500 capitalize">{item.type}</p>
          </div>
          {isSelected && (
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full" />
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
          "relative aspect-square rounded cursor-pointer transition-all group",
          isSelected
            ? "ring-2 ring-blue-500 ring-offset-1"
            : "hover:ring-2 hover:ring-gray-300"
        )}
        onClick={() => handleSelect(item.id)}
      >
        {item.type === 'image' ? (
          <img
            src={item.thumbnailUrl || item.url}
            alt={item.alt || item.title}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 rounded flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </div>
        )}

        {isSelected && (
          <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </div>
    );
  };

  const CompactContent = () => (
    <div className="space-y-4" style={{ height: `${height}px` }}>
      {/* Search and View Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="검색..."
            value={state.filters.searchTerm}
            onChange={(e) => actions.updateFilter('searchTerm', e.target.value)}
            className="pl-8 h-8"
          />
        </div>
        <div className="flex bg-gray-100 rounded p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-1 rounded transition-colors",
              viewMode === 'grid' ? 'bg-white shadow-sm' : ''
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-1 rounded transition-colors",
              viewMode === 'list' ? 'bg-white shadow-sm' : ''
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media Grid/List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          </div>
        ) : allFiles.length === 0 ? (
          <div className="text-center py-8">
            <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">미디어 파일이 없습니다</p>
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid'
              ? "grid grid-cols-4 gap-2"
              : "space-y-1"
          )}>
            {allFiles.map(renderMediaItem)}
          </div>
        )}

        {/* Load More */}
        <div ref={loadMoreRef} className="h-4">
          {isFetchingNextPage && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-2 border-t">
        <p className="text-xs text-gray-600">
          {state.selectedFiles.length > 0
            ? `${state.selectedFiles.length}개 선택`
            : '파일을 선택하세요'
          }
        </p>
        <Button
          onClick={handleConfirm}
          disabled={state.selectedFiles.length === 0}
          size="sm"
        >
          선택
        </Button>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className={cn("border rounded-lg p-4", className)}>
        <CompactContent />
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50 h-8 px-3 ${className}`}>
        <Upload className="w-4 h-4 mr-2" />
        {title}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <CompactContent />
      </DialogContent>
    </Dialog>
  );
};

export default CompactMediaSelector;