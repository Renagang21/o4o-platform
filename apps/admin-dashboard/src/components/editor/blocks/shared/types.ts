/**
 * Shared types for MediaSelector and related components
 */

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

export interface MediaSelectorConfig {
  multiple: boolean;
  acceptedTypes: ('image' | 'video')[];
  maxSelection: number;
  title: string;
  enableUpload: boolean;
  enablePreview: boolean;
  enableSearch: boolean;
  enableFilters: boolean;
  viewModes: ('grid' | 'list')[];
  defaultViewMode: 'grid' | 'list';
}

export interface MediaUploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export interface MediaFilters {
  searchTerm: string;
  fileType: 'all' | 'image' | 'video';
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  folder?: string;
}

export interface MediaSelectorState {
  selectedFiles: string[];
  viewMode: 'grid' | 'list';
  filters: MediaFilters;
  showUploader: boolean;
  uploadProgress: MediaUploadProgress[];
  isUploading: boolean;
  previewItem: MediaItem | null;
}

export type ViewMode = 'grid' | 'list';
export type FilterType = 'all' | 'image' | 'video';
export type MediaType = 'image' | 'video';

// Hook return types
export interface UseMediaSelectorReturn {
  state: MediaSelectorState;
  actions: {
    selectFile: (fileId: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
    updateFilter: (key: keyof MediaFilters, value: any) => void;
    setViewMode: (mode: ViewMode) => void;
    uploadFiles: (files: File[]) => Promise<void>;
    setPreviewItem: (item: MediaItem | null) => void;
  };
  computed: {
    selectedFileObjects: MediaItem[];
    canSelectMore: boolean;
    isAllSelected: boolean;
  };
  // Additional data properties
  allFiles: MediaItem[];
  isLoading: boolean;
  error: any;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  loadMoreRef: (node?: Element | null) => void;
  refetch: () => void;
}

// Component variant props
export interface CompactMediaSelectorProps extends Omit<MediaSelectorProps, 'isOpen'> {
  variant?: 'compact' | 'inline';
  height?: number;
}

export interface InlineMediaBrowserProps {
  selectedItems?: MediaItem[];
  onSelectionChange: (items: MediaItem[]) => void;
  multiple?: boolean;
  acceptedTypes?: ('image' | 'video')[];
  maxSelection?: number;
  height?: number;
  showToolbar?: boolean;
}