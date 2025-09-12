import { FC, useState, useCallback, useReducer } from 'react';
import { 
  Grid, 
  List, 
  Upload, 
  Search, 
  Filter,
  X,
  Trash2,
  Download,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import MediaGrid from '@/components/media/MediaGrid';
import MediaList from '@/components/media/MediaList';
import MediaToolbar from '@/components/media/MediaToolbar';
import MediaUploadArea from '@/components/media/MediaUploadArea';
import { cn } from '@/lib/utils';

// Types
export interface MediaItem {
  id: string;
  title: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | 'other';
  size: number;
  width?: number;
  height?: number;
  uploadedBy: {
    id: string;
    name: string;
  };
  uploadedAt: string;
  alt?: string;
  caption?: string;
  description?: string;
  attachedTo?: {
    id: string;
    title: string;
    type: string;
  };
}

// State management
interface MediaLibraryState {
  viewMode: 'grid' | 'list';
  selectedItems: string[];
  filters: {
    mediaType: string;
    date: string;
    search: string;
  };
  sort: {
    by: 'date' | 'title' | 'size';
    order: 'asc' | 'desc';
  };
  showUploader: boolean;
}

type MediaAction = 
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' }
  | { type: 'SELECT_ITEM'; payload: string }
  | { type: 'DESELECT_ITEM'; payload: string }
  | { type: 'SELECT_ALL'; payload: string[] }
  | { type: 'SET_SELECTION'; payload: string[] }  // For single selection in picker mode
  | { type: 'SELECT_MULTIPLE'; payload: string[] } // For multi selection
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_FILTER'; payload: { key: string; value: string } }
  | { type: 'SET_SORT'; payload: { by: string; order: string } }
  | { type: 'TOGGLE_UPLOADER' };

const mediaReducer = (state: MediaLibraryState, action: MediaAction): MediaLibraryState => {
  switch (action.type) {
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    case 'SELECT_ITEM':
      return { 
        ...state, 
        selectedItems: [...state.selectedItems, action.payload] 
      };
    case 'DESELECT_ITEM':
      return { 
        ...state, 
        selectedItems: state.selectedItems.filter(id => id !== action.payload) 
      };
    case 'SELECT_ALL':
      return { ...state, selectedItems: action.payload };
    case 'SET_SELECTION':
      return { ...state, selectedItems: action.payload };
    case 'SELECT_MULTIPLE':
      return { 
        ...state, 
        selectedItems: [...new Set([...state.selectedItems, ...action.payload])]
      };
    case 'CLEAR_SELECTION':
      return { ...state, selectedItems: [] };
    case 'SET_FILTER':
      return { 
        ...state, 
        filters: { ...state.filters, [action.payload.key]: action.payload.value } 
      };
    case 'SET_SORT':
      return { 
        ...state, 
        sort: { by: action.payload.by as any, order: action.payload.order as any }
      };
    case 'TOGGLE_UPLOADER':
      return { ...state, showUploader: !state.showUploader };
    default:
      return state;
  }
};

const initialState: MediaLibraryState = {
  viewMode: 'grid',
  selectedItems: [],
  filters: {
    mediaType: 'all',
    date: 'all',
    search: ''
  },
  sort: {
    by: 'date',
    order: 'desc'
  },
  showUploader: false
};

// WordPress-style MediaLibrary props
interface MediaLibraryProps {
  mode?: 'manage' | 'picker';  // 'manage' for full page, 'picker' for selection modal
  multiple?: boolean;           // Allow multiple selection in picker mode
  accept?: string;              // File type filter (e.g., 'image/*')
  onSelect?: (items: MediaItem | MediaItem[]) => void;  // Callback when items selected
  onClose?: () => void;         // Callback for closing in picker mode
}

const MediaLibrary: FC<MediaLibraryProps> = ({
  mode = 'manage',
  multiple = false,
  accept,
  onSelect,
  onClose
}) => {
  const queryClient = useQueryClient();
  const [state, dispatch] = useReducer(mediaReducer, initialState);
  const [page, setPage] = useState(1);
  const itemsPerPage = 40;

  // Fetch media items
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['media', state.filters, state.sort, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        sortBy: state.sort.by,
        sortOrder: state.sort.order,
      });

      if (state.filters.search) {
        params.append('search', state.filters.search);
      }
      if (state.filters.mediaType !== 'all') {
        params.append('mediaType', state.filters.mediaType);
      }
      if (state.filters.date !== 'all') {
        params.append('date', state.filters.date);
      }

      const response = await authClient.api.get(`/media?${params}`);
      return response.data;
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => authClient.api.delete(`/media/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast.success(`${state.selectedItems.length} items permanently deleted.`);
      dispatch({ type: 'CLEAR_SELECTION' });
    },
    onError: () => {
      toast.error('Failed to delete selected items.');
    }
  });

  // Handlers
  const handleItemSelect = useCallback((itemId: string, isSelected: boolean) => {
    if (mode === 'picker' && !multiple) {
      // In single picker mode, replace selection
      dispatch({ 
        type: 'SET_SELECTION', 
        payload: isSelected ? [itemId] : []
      });
    } else {
      // Normal multi-selection mode
      dispatch({ 
        type: isSelected ? 'SELECT_ITEM' : 'DESELECT_ITEM', 
        payload: itemId 
      });
    }
  }, [mode, multiple]);

  const handleSelectAll = useCallback(() => {
    if (data?.items) {
      if (state.selectedItems.length === data.items.length) {
        dispatch({ type: 'CLEAR_SELECTION' });
      } else {
        dispatch({ 
          type: 'SELECT_ALL', 
          payload: data.items.map((item: MediaItem) => item.id) 
        });
      }
    }
  }, [data, state.selectedItems]);

  const handleBulkDelete = useCallback(() => {
    if (state.selectedItems.length === 0) return;
    
    const message = `Are you sure you want to permanently delete ${state.selectedItems.length} item${state.selectedItems.length > 1 ? 's' : ''}? This action cannot be undone.`;
    
    if (confirm(message)) {
      deleteMutation.mutate(state.selectedItems);
    }
  }, [state.selectedItems, deleteMutation]);

  const handleSearch = useCallback((value: string) => {
    dispatch({ type: 'SET_FILTER', payload: { key: 'search', value } });
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((key: string, value: string) => {
    dispatch({ type: 'SET_FILTER', payload: { key, value } });
    setPage(1);
  }, []);

  const handleUploadComplete = useCallback(() => {
    refetch();
    dispatch({ type: 'TOGGLE_UPLOADER' });
  }, [refetch]);

  const mediaItems = data?.items || [];
  const totalItems = data?.total || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Handle selection in picker mode
  const handleSelectItems = useCallback(() => {
    if (mode === 'picker' && onSelect) {
      const selected = state.selectedItems;
      if (selected.length > 0) {
        // Find full media items from data
        const selectedItems = mediaItems.filter((item: MediaItem) => 
          selected.includes(item.id)
        );
        
        onSelect(multiple ? selectedItems : selectedItems[0]);
        onClose?.();
      }
    }
  }, [mode, onSelect, onClose, state.selectedItems, mediaItems, multiple]);

  return (
    <div className="wrap">
      {/* WordPress-style heading */}
      <h1 className="wp-heading-inline">
        {mode === 'picker' ? 'Select Media' : 'Media Library'}
      </h1>
      {mode === 'manage' && (
        <a 
          href="#" 
          className="page-title-action"
          onClick={(e) => {
            e.preventDefault();
            dispatch({ type: 'TOGGLE_UPLOADER' });
          }}
        >
          Add New
        </a>
      )}
      
      {/* Picker mode controls */}
      {mode === 'picker' && (
        <div className="media-toolbar wp-filter" style={{ marginTop: '10px' }}>
          <div className="media-toolbar-primary">
            <Button
              onClick={handleSelectItems}
              disabled={state.selectedItems.length === 0}
              className="mr-2"
            >
              Select {state.selectedItems.length > 0 ? `(${state.selectedItems.length})` : ''}
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      )}
      
      <hr className="wp-header-end" />

      {/* Upload area (WordPress style) */}
      {state.showUploader && (
        <MediaUploadArea
          onClose={() => dispatch({ type: 'TOGGLE_UPLOADER' })}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Toolbar */}
      <MediaToolbar
        viewMode={state.viewMode}
        onViewModeChange={(mode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode })}
        selectedCount={state.selectedItems.length}
        onBulkDelete={handleBulkDelete}
        onClearSelection={() => dispatch({ type: 'CLEAR_SELECTION' })}
      />

      {/* Filters */}
      <div className="media-toolbar wp-filter">
        <div className="media-toolbar-secondary">
          <div className="view-switch media-grid-view-switch">
            <Select 
              value={state.filters.mediaType}
              onValueChange={(value) => handleFilterChange('mediaType', value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All media items</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                <SelectItem value="unattached">Unattached</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={state.filters.date}
              onValueChange={(value) => handleFilterChange('date', value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="0">Today</SelectItem>
                <SelectItem value="1">Yesterday</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="this-month">This month</SelectItem>
                <SelectItem value="last-month">Last month</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange('mediaType', 'all')}
              disabled={state.filters.mediaType === 'all' && state.filters.date === 'all'}
            >
              Reset filters
            </Button>
          </div>

          <div className="search-form">
            <label htmlFor="media-search-input" className="media-search-input-label">
              Search
            </label>
            <Input
              type="search"
              id="media-search-input"
              className="search"
              value={state.filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search media..."
            />
          </div>
        </div>
      </div>

      {/* Bulk actions bar */}
      {state.selectedItems.length > 0 && (
        <div className="tablenav top">
          <div className="alignleft actions bulkactions">
            <label htmlFor="bulk-action-selector-top" className="screen-reader-text">
              Select bulk action
            </label>
            <select id="bulk-action-selector-top">
              <option value="-1">Bulk actions</option>
              <option value="delete">Delete permanently</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
            >
              Apply
            </Button>
            <span className="ml-2 text-sm text-gray-600">
              {state.selectedItems.length} selected
            </span>
          </div>
        </div>
      )}

      {/* Media content */}
      {isLoading ? (
        <div className="spinner is-active" style={{ float: 'none', margin: '50px auto' }}></div>
      ) : mediaItems.length === 0 ? (
        <div className="no-media" style={{ padding: '40px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '18px', margin: '0 0 20px' }}>No media files found.</p>
          <Button
            onClick={() => dispatch({ type: 'TOGGLE_UPLOADER' })}
          >
            <Upload className="w-4 h-4 mr-2" />
            Add New Media
          </Button>
        </div>
      ) : state.viewMode === 'grid' ? (
        <MediaGrid
          items={mediaItems}
          selectedIds={state.selectedItems}
          onItemSelect={handleItemSelect}
          onItemDelete={(id) => deleteMutation.mutate([id])}
        />
      ) : (
        <MediaList
          items={mediaItems}
          selectedIds={state.selectedItems}
          onItemSelect={handleItemSelect}
          onSelectAll={handleSelectAll}
          onItemDelete={(id) => deleteMutation.mutate([id])}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="tablenav bottom">
          <div className="tablenav-pages">
            <span className="displaying-num">{totalItems} items</span>
            <span className="pagination-links">
              <button
                className="prev-page button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <span className="screen-reader-text">Previous page</span>
                <span aria-hidden="true">‹</span>
              </button>
              <span className="paging-input">
                <label htmlFor="current-page-selector" className="screen-reader-text">
                  Current Page
                </label>
                <input
                  className="current-page"
                  id="current-page-selector"
                  type="text"
                  value={page}
                  size={3}
                  aria-describedby="table-paging"
                  onChange={(e) => {
                    const newPage = parseInt(e.target.value);
                    if (newPage > 0 && newPage <= totalPages) {
                      setPage(newPage);
                    }
                  }}
                />
                <span className="tablenav-paging-text">
                  {' of '}
                  <span className="total-pages">{totalPages}</span>
                </span>
              </span>
              <button
                className="next-page button"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                <span className="screen-reader-text">Next page</span>
                <span aria-hidden="true">›</span>
              </button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;