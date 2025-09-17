import { useState, FC } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { formatDate, formatFileSize } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Media } from '@o4o/types';
import { useAdminNotices } from '@/hooks/useAdminNotices';

// Helper to get a representative icon for a file
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image')) return '🖼️';
  if (mimeType.startsWith('video')) return '🎬';
  if (mimeType.startsWith('audio')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  return '📁';
};

const MediaListWordPress: FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'audio' | 'video'>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  const defaultColumns: ColumnOption[] = [
    { id: 'file', label: 'File', visible: true, required: true },
    { id: 'author', label: 'Author', visible: true },
    { id: 'uploadedTo', label: 'Uploaded to', visible: true },
    { id: 'date', label: 'Date', visible: true },
  ];

  const {
    options,
    itemsPerPage,
    isColumnVisible,
    updateColumnVisibility,
    setItemsPerPage
  } = useScreenOptions('media-list', {
    columns: defaultColumns,
    itemsPerPage: 20,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['media', typeFilter, dateFilter, searchQuery, page, itemsPerPage],
    queryFn: async () => {
      // API 서버가 준비될 때까지 목업 데이터를 사용합니다.
      // console.log('Fetching media with params:', { typeFilter, dateFilter, searchQuery, page, itemsPerPage });
      return {
        media: [
          {
            id: '1',
            title: 'My Awesome Picture',
            filename: 'my-awesome-pic.jpg',
            author: { name: 'John Doe' },
            attachedTo: { title: 'My Awesome Post' },
            createdAt: new Date().toISOString(),
            mimeType: 'image/jpeg',
            size: 123456,
            width: 1920,
            height: 1080,
            thumbnailUrl: '/placeholder-150x150.png',
            url: '/placeholder-1920x1080.png'
          }
        ],
        pagination: {
          totalItems: 1,
          totalPages: 1,
          currentPage: 1,
        }
      }
      /*
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (dateFilter !== 'all') params.set('date', dateFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', page.toString());
      params.set('perPage', itemsPerPage.toString());
      
      const response = await authClient.api.get(`/media?${params}`);
      return response.data;
      */
    }
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      // await authClient.api.delete(`/media`, { data: { ids } });
      // console.log('Deleting media items:', ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      success(`${selectedMedia.length} media item(s) deleted successfully.`);
      setSelectedMedia([]);
    },
    onError: () => {
      error('Failed to delete media items.');
    }
  });

  const handleBulkAction = (action: string) => {
    if (selectedMedia.length === 0) {
      error('No items selected.');
      return;
    }
    if (action === 'delete') {
      deleteMutation.mutate(selectedMedia);
    }
  };

  const allColumns: WordPressTableColumn[] = [
    { id: 'file', label: 'File', sortable: true },
    { id: 'author', label: 'Author' },
    { id: 'uploadedTo', label: 'Uploaded to' },
    { id: 'date', label: 'Date', sortable: true },
  ];
  
  const columns = allColumns.filter(col => isColumnVisible(col.id));

  const mediaItems: Media[] = data?.media || [];
  const rows: WordPressTableRow[] = mediaItems.map((item: Media) => ({
    id: item.id,
    data: {
      file: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {item.thumbnailUrl ? (
            <img src={item.thumbnailUrl} alt={item.title} style={{ width: 60, height: 60, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 60, height: 60, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {getFileIcon(item.mimeType)}
            </div>
          )}
          <div>
            <strong>
              <a href="#" className="row-title">
                {item.title}
              </a>
            </strong>
            <p className="filename" style={{ margin: 0, color: '#646970' }}>
              {item.filename}
            </p>
          </div>
        </div>
      ),
      author: item.author?.name || '—',
      uploadedTo: item.attachedTo ? (
        <strong><a href="#">{item.attachedTo.title}</a></strong>
      ) : (
        <em>(Unattached)</em>
      ),
      date: (
        <div>
          {formatDate(item.createdAt)}
          <br />
          <span style={{ color: '#646970', fontSize: '12px' }}>
            {formatFileSize(item.size)}
          </span>
          {item.width && item.height && (
            <>
              <br />
              <span style={{ color: '#646970', fontSize: '12px' }}>
                {item.width} × {item.height}
              </span>
            </>
          )}
        </div>
      )
    },
    actions: [
      { label: 'Edit', onClick: () => { /* Handle Edit */ } },
      { label: 'Delete Permanently', onClick: () => deleteMutation.mutate([item.id]), destructive: true },
      { label: 'View', href: item.url, external: true },
    ]
  }));

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">Media Library</h1>
      <Button 
        className="page-title-action ml-2"
        onClick={() => window.location.href = '/media/new'}
      >
        Add New
      </Button>
      <hr className="wp-header-end" />

      <div className="tablenav top">
        <div className="alignleft actions bulkactions">
          <Select onValueChange={handleBulkAction}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Bulk Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="delete">Delete Permanently</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" className="ml-2" onClick={() => handleBulkAction('apply')}>Apply</Button>_        </div>

        <div className="alignleft actions">
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All media items</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="video">Video</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v: any) => setDateFilter(v)}>
             <SelectTrigger className="w-40 ml-2"><SelectValue /></SelectTrigger>
             <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                {/* Dates would be populated from an API call */}
             </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" className="ml-2">Filter</Button>
        </div>
        
        <div className="tablenav-pages">
          <span className="displaying-num">{data?.pagination?.totalItems || 0} items</span>
          {/* Real pagination component will go here */}
        </div>
      </div>

      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedMedia}
        onSelectRow={(rowId, selected) => {
          setSelectedMedia(current => 
            selected ? [...current, rowId] : current.filter(id => id !== rowId)
          );
        }}
        onSelectAll={(selected) => {
          setSelectedMedia(selected ? mediaItems.map(item => item.id) : []);
        }}
        loading={isLoading}
        emptyMessage="No media items found."
        className="wp-list-table widefat fixed striped media"
      />
      
      <div className="tablenav bottom">
        {/* Pagination and bulk actions could be repeated here */}
      </div>
      
      <ScreenOptionsReact
        columns={options.columns}
        itemsPerPage={itemsPerPage}
        onColumnVisibilityChange={updateColumnVisibility}
        onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setPage(1);
        }}
      />
    </div>
  );
};

export default MediaListWordPress;