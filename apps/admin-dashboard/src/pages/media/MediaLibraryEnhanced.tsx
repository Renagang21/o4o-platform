import { useState } from 'react';
import { Grid, List, Image as ImageIcon, FileText, Film, Music, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { formatDate, formatFileSize } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface MediaItem {
  id: string;
  title: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
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

export default function MediaLibraryEnhanced() {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page] = useState(1); // Reserved for pagination

  // Default column configuration for list view
  const defaultColumns: ColumnOption[] = [
    { id: 'title', label: 'File', visible: true, required: true },
    { id: 'author', label: 'Author', visible: true },
    { id: 'attachedTo', label: 'Uploaded to', visible: true },
    { id: 'date', label: 'Date', visible: true },
    { id: 'dimensions', label: 'Dimensions', visible: false },
    { id: 'fileSize', label: 'File size', visible: false },
    { id: 'mimeType', label: 'MIME type', visible: false }
  ];

  // Use screen options hook
  const {
    options,
    itemsPerPage,
    isColumnVisible,
    updateColumnVisibility,
    setItemsPerPage
  } = useScreenOptions('media-library', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch media
  const { data, isLoading } = useQuery({
    queryKey: ['media', search, typeFilter, dateFilter, page, itemsPerPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      });
      
      if (search) params.append('search', search);
      if (typeFilter) params.append('type', typeFilter);
      if (dateFilter) params.append('date', dateFilter);

      const response = await apiClient.get(`/media?${params}`);
      return response.data;
    }
  });

  // Delete media
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiClient.delete(`/media/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      success('Selected items permanently deleted.');
      setSelectedMedia([]);
    },
    onError: () => {
      error('Failed to delete media.');
    }
  });

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedMedia.length === 0) {
      error('No items selected.');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete ${selectedMedia.length} item(s)?`)) {
      deleteMutation.mutate(selectedMedia);
    }
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (mimeType.startsWith('video/')) return <Film className="w-4 h-4" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-600" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <Archive className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // Define table columns
  const allColumns: WordPressTableColumn[] = [
    { id: 'title', label: 'File', sortable: true },
    { id: 'author', label: 'Author' },
    { id: 'attachedTo', label: 'Uploaded to' },
    { id: 'date', label: 'Date', sortable: true },
    { id: 'dimensions', label: 'Dimensions' },
    { id: 'fileSize', label: 'File size' },
    { id: 'mimeType', label: 'MIME type' }
  ];
  
  const columns = allColumns.filter(col => isColumnVisible(col.id));

  // Transform media to table rows
  const media = data?.media || [];
  const rows: WordPressTableRow[] = media.map((item: MediaItem) => ({
    id: item.id,
    data: {
      title: (
        <div className="media-title">
          <strong>
            <a href={`/media/${item.id}/edit`} className="row-title">
              {getFileIcon(item.mimeType)} {item.title || item.filename}
            </a>
          </strong>
          <p className="filename">{item.filename}</p>
        </div>
      ),
      author: item.uploadedBy?.name || 'Unknown',
      attachedTo: item.attachedTo ? (
        <a href={`/${item.attachedTo.type}s/${item.attachedTo.id}/edit`}>
          {item.attachedTo.title}
        </a>
      ) : (
        <span className="text-gray-500">(Unattached)</span>
      ),
      date: formatDate(item.uploadedAt),
      dimensions: item.width && item.height ? `${item.width} × ${item.height}` : '—',
      fileSize: formatFileSize(item.size),
      mimeType: item.mimeType
    },
    actions: [
      { label: 'Edit', href: `/media/${item.id}/edit` },
      { label: 'View', href: item.url, onClick: () => window.open(item.url, '_blank') },
      { 
        label: 'Delete Permanently', 
        onClick: () => {
          if (confirm('Are you sure you want to permanently delete this file?')) {
            deleteMutation.mutate([item.id]);
          }
        },
        isDelete: true 
      },
      { label: 'Download', href: item.url, onClick: () => {
        const a = document.createElement('a');
        a.href = item.url;
        a.download = item.filename;
        a.click();
      }}
    ]
  }));

  return (
    <div className="wrap">
      {/* Screen Options */}
      <div className="relative">
        <ScreenOptionsReact
          title="Screen Options"
          columns={viewMode === 'list' ? (options.columns || defaultColumns) : undefined}
          onColumnToggle={updateColumnVisibility}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          customOptions={[
            {
              id: 'show-thumbnails',
              label: 'Show thumbnails in list view',
              checked: true,
              description: 'Display thumbnail previews in the list view'
            }
          ]}
        />
      </div>
      
      <h1 className="wp-heading-inline">Media Library</h1>
      <a href="/media/new" className="page-title-action">Add New</a>
      
      {/* View Mode Toggle */}
      <div className="view-switch media-grid-view-switch">
        <button
          className={viewMode === 'list' ? 'view-list current' : 'view-list'}
          onClick={() => setViewMode('list')}
          title="List view"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          className={viewMode === 'grid' ? 'view-grid current' : 'view-grid'}
          onClick={() => setViewMode('grid')}
          title="Grid view"
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>
      
      {/* Filters */}
      <div className="media-toolbar wp-filter">
        <div className="media-toolbar-secondary">
          <div className="view-switch media-grid-view-switch">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All media items" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All media items</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                <SelectItem value="archive">Archives</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All dates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All dates</SelectItem>
                <SelectItem value="0">Today</SelectItem>
                <SelectItem value="1">Yesterday</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="search-form">
            <label htmlFor="media-search-input" className="media-search-input-label">
              Search
            </label>
            <Input
              type="search"
              id="media-search-input"
              className="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media..."
            />
          </div>
        </div>
        
        <div className="media-toolbar-primary search-form">
          {selectedMedia.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              Delete Permanently
            </Button>
          )}
        </div>
      </div>

      {/* Media Content */}
      {viewMode === 'grid' ? (
        // Grid View
        <div className="media-grid">
          {isLoading ? (
            <div className="spinner is-active"></div>
          ) : media.length === 0 ? (
            <div className="no-media">No media files found.</div>
          ) : (
            <div className="attachments">
              {media.map((item: MediaItem) => (
                <div
                  key={item.id}
                  className={`attachment ${selectedMedia.includes(item.id) ? 'selected' : ''}`}
                  onClick={() => {
                    if (selectedMedia.includes(item.id)) {
                      setSelectedMedia(selectedMedia.filter(id => id !== item.id));
                    } else {
                      setSelectedMedia([...selectedMedia, item.id]);
                    }
                  }}
                >
                  <div className="attachment-preview">
                    <div className="thumbnail">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.alt || item.title} />
                      ) : (
                        <div className="icon">{getFileIcon(item.mimeType)}</div>
                      )}
                    </div>
                  </div>
                  <button type="button" className="check">
                    <span className="media-modal-icon"></span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // List View
        <WordPressTable
          columns={columns}
          rows={rows}
          selectable={true}
          selectedRows={selectedMedia}
          onSelectRow={(id, selected) => {
            if (selected) {
              setSelectedMedia([...selectedMedia, id]);
            } else {
              setSelectedMedia(selectedMedia.filter(mediaId => mediaId !== id));
            }
          }}
          onSelectAll={(selected) => {
            if (selected) {
              setSelectedMedia(media.map((m: MediaItem) => m.id));
            } else {
              setSelectedMedia([]);
            }
          }}
          loading={isLoading}
          emptyMessage="No media files found."
        />
      )}
      
      {/* Pagination */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{data?.total || 0} items</span>
        </div>
        <br className="clear" />
      </div>
    </div>
  );
}