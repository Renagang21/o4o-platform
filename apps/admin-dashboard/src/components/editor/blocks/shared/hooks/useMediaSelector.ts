/**
 * useMediaSelector Hook
 * MediaSelector 컴포넌트의 상태와 로직을 관리하는 커스텀 훅
 */

import { useState, useCallback, useEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';
import { ContentApi } from '@/api/contentApi';
import { MediaFile } from '@/types/content';
import {
  MediaItem,
  MediaSelectorState,
  MediaFilters,
  MediaUploadProgress,
  UseMediaSelectorReturn
} from '../types';

// Transform MediaFile to MediaItem
const transformMediaFile = (file: MediaFile): MediaItem => ({
  id: file.id,
  url: file.url,
  type: file.type === 'image' ? 'image' : file.type === 'video' ? 'video' : 'image',
  title: file.name,
  alt: file.altText || file.name,
  width: file.dimensions?.width,
  height: file.dimensions?.height,
  fileSize: file.size,
  mimeType: file.mimeType,
  thumbnailUrl: file.thumbnailUrl,
  caption: file.caption,
  uploadedAt: file.uploadedAt
});

interface UseMediaSelectorOptions {
  multiple?: boolean;
  maxSelection?: number;
  acceptedTypes?: ('image' | 'video')[];
  initialSelection?: MediaItem[];
  enabled?: boolean;
}

export const useMediaSelector = (options: UseMediaSelectorOptions = {}): UseMediaSelectorReturn => {
  const {
    multiple = false,
    maxSelection = multiple ? 50 : 1,
    acceptedTypes = ['image', 'video'],
    initialSelection = [],
    enabled = true
  } = options;

  // State
  const [state, setState] = useState<MediaSelectorState>({
    selectedFiles: initialSelection.map(item => item.id),
    viewMode: 'grid',
    filters: {
      searchTerm: '',
      fileType: acceptedTypes.length === 1 ? acceptedTypes[0] : 'all'
    },
    showUploader: false,
    uploadProgress: [],
    isUploading: false,
    previewItem: null
  });

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView();

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
    queryKey: ['mediaFiles', state.filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await ContentApi.getMediaFiles(
        pageParam,
        50,
        undefined,
        state.filters.fileType === 'all' ? undefined : state.filters.fileType,
        state.filters.searchTerm
      );
      return response;
    },
    getNextPageParam: (lastPage) => {
      const { pagination } = lastPage;
      if (pagination && pagination.currentPage < pagination.totalPages) {
        return pagination.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled
  });

  // Auto-load more when scrolled to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Get all files from pages
  const allFiles = data?.pages?.flatMap(page =>
    Array.isArray(page?.data) ? page.data.map(transformMediaFile) : []
  ) || [];

  // Actions
  const selectFile = useCallback((fileId: string) => {
    setState(prev => {
      if (multiple) {
        const newSelection = prev.selectedFiles.includes(fileId)
          ? prev.selectedFiles.filter(id => id !== fileId)
          : [...prev.selectedFiles, fileId].slice(0, maxSelection);

        if (newSelection.length === maxSelection && prev.selectedFiles.length < maxSelection) {
          toast.error(`최대 ${maxSelection}개까지 선택할 수 있습니다.`);
        }

        return {
          ...prev,
          selectedFiles: newSelection
        };
      } else {
        return {
          ...prev,
          selectedFiles: [fileId]
        };
      }
    });
  }, [multiple, maxSelection]);

  const selectAll = useCallback(() => {
    setState(prev => {
      const isAllSelected = prev.selectedFiles.length === allFiles.length;
      const newSelection = isAllSelected
        ? []
        : allFiles.slice(0, maxSelection).map(file => file.id);

      if (!isAllSelected && allFiles.length > maxSelection) {
        toast.error(`최대 ${maxSelection}개까지 선택할 수 있습니다.`);
      }

      return {
        ...prev,
        selectedFiles: newSelection
      };
    });
  }, [allFiles, maxSelection]);

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedFiles: []
    }));
  }, []);

  const updateFilter = useCallback((key: keyof MediaFilters, value: any) => {
    setState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [key]: value
      }
    }));
  }, []);

  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    setState(prev => ({
      ...prev,
      viewMode: mode
    }));
  }, []);

  const uploadFiles = useCallback(async (files: File[]) => {
    setState(prev => ({ ...prev, isUploading: true, showUploader: true }));

    const uploadItems: MediaUploadProgress[] = files.map(file => ({
      file,
      progress: 0,
      status: 'uploading' as const
    }));

    setState(prev => ({ ...prev, uploadProgress: uploadItems }));

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          uploadProgress: prev.uploadProgress.map(item => ({
            ...item,
            progress: Math.min(item.progress + Math.random() * 20, 90)
          }))
        }));
      }, 500);

      await ContentApi.uploadFiles(files);

      clearInterval(progressInterval);

      setState(prev => ({
        ...prev,
        uploadProgress: prev.uploadProgress.map(item => ({
          ...item,
          progress: 100,
          status: 'success' as const
        }))
      }));

      toast.success(`${files.length}개 파일이 업로드되었습니다.`);

      // Refresh media list
      setTimeout(() => {
        refetch();
        setState(prev => ({
          ...prev,
          showUploader: false,
          uploadProgress: []
        }));
      }, 1000);

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        uploadProgress: prev.uploadProgress.map(item => ({
          ...item,
          status: 'error' as const,
          error: error.message || '업로드에 실패했습니다.'
        }))
      }));
      toast.error('업로드에 실패했습니다.');
    } finally {
      setState(prev => ({ ...prev, isUploading: false }));
    }
  }, [refetch]);

  const setPreviewItem = useCallback((item: MediaItem | null) => {
    setState(prev => ({
      ...prev,
      previewItem: item
    }));
  }, []);

  // Computed values
  const selectedFileObjects = allFiles.filter(file =>
    state.selectedFiles.includes(file.id)
  );

  const canSelectMore = state.selectedFiles.length < maxSelection;
  const isAllSelected = state.selectedFiles.length === allFiles.length && allFiles.length > 0;

  return {
    state,
    actions: {
      selectFile,
      selectAll,
      clearSelection,
      updateFilter,
      setViewMode,
      uploadFiles,
      setPreviewItem
    },
    computed: {
      selectedFileObjects,
      canSelectMore,
      isAllSelected
    },
    // Additional data for consumers
    allFiles,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    loadMoreRef,
    refetch
  };
};

export default useMediaSelector;