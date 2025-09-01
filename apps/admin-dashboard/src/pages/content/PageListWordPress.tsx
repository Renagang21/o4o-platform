import { useState, FC } from 'react';
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
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { formatDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Post, PostStatus } from '@o4o/types';
import { useAdminNotices } from '@/hooks/useAdminNotices';

/**
 * WordPress-style Page List with Row Actions
 */
const PageListWordPress: FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [selectedPages, setSelectedPages] = useState<any[]>([]);

  // Default column configuration
  const defaultColumns: ColumnOption[] = [
    { id: 'title', label: 'Title', visible: true, required: true },
    { id: 'author', label: 'Author', visible: true },
    { id: 'template', label: 'Template', visible: true },
    { id: 'comments', label: 'Comments', visible: true },
    { id: 'date', label: 'Date', visible: true }
  ];

  // Use screen options hook
  const {
    options,
    itemsPerPage,
    isColumnVisible,
    updateColumnVisibility,
    setItemsPerPage
  } = useScreenOptions('pages-list', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch pages
  const { data, isLoading } = useQuery({
    queryKey: ['pages', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('type', 'page');
      
      const response = await authClient.api.get(`/posts?${params}`);
      return response.data;
    }
  });

  // Delete page mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.delete(`/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      success('Page moved to trash.');
    },
    onError: () => {
      error('Failed to delete page.');
    }
  });

  // Duplicate page mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.post(`/posts/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      success('Page duplicated successfully.');
    },
    onError: () => {
      error('Failed to duplicate page.');
    }
  });

  // Get status badge
  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Scheduled</Badge>;
      case 'trash':
        return <Badge variant="destructive">Trash</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (selectedPages.length === 0) {
      error('No pages selected.');
      return;
    }
    
    switch (action) {
      case 'trash':
        success(`${selectedPages.length} page(s) moved to trash.`);
        setSelectedPages([]);
        break;
      case 'publish':
        success(`${selectedPages.length} page(s) published.`);
        setSelectedPages([]);
        break;
      default:
        break;
    }
  };

  // Define table columns - only show visible ones
  const allColumns: WordPressTableColumn[] = [
    { id: 'title', label: 'Title', sortable: true },
    { id: 'author', label: 'Author' },
    { id: 'template', label: 'Template' },
    { id: 'comments', label: '', width: '50px', align: 'center' },
    { id: 'date', label: 'Date', sortable: true }
  ];
  
  const columns = allColumns.filter((col: any) => isColumnVisible(col.id));

  // Transform pages to table rows
  const pages = data?.posts || [];
  const rows: WordPressTableRow[] = pages.map((page: Post) => ({
    id: page.id,
    data: {
      title: (
        <div>
          <strong>
            <a href={`/content/pages/${page.id}/edit`} className="row-title">
              {page.title}
            </a>
          </strong>
          {page.status !== 'published' && (
            <span className="ml-2">— {getStatusBadge(page.status)}</span>
          )}
        </div>
      ),
      author: page.author?.name || 'Unknown',
      template: page.template || 'Default Template',
      comments: (
        <span className="comment-count">
          <span className="screen-reader-text">{page.commentCount || 0} comments</span>
          <span aria-hidden="true">💬 {page.commentCount || 0}</span>
        </span>
      ),
      date: (
        <div>
          <abbr title={formatDate(page.createdAt)}>
            {page.status === 'published' ? 'Published' : 'Last Modified'}
          </abbr>
          <br />
          {formatDate(page.createdAt)}
        </div>
      )
    },
    actions: [
      {
        label: 'Edit',
        href: `/content/pages/${page.id}/edit`,
        primary: true
      },
      {
        label: 'Quick Edit',
        onClick: () => console.log('Quick edit page:', page.id)
      },
      {
        label: 'Trash',
        onClick: () => deleteMutation.mutate(page.id),
        destructive: true
      },
      {
        label: 'View',
        href: `/pages/${page.slug}`,
        external: true
      },
      {
        label: 'Duplicate',
        onClick: () => duplicateMutation.mutate(page.id)
      }
    ]
  }));

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">Pages</h1>
      
      <Button 
        className="page-title-action ml-2"
        onClick={() => window.location.href = '/content/pages/new'}
      >
        Add New
      </Button>
      
      <hr className="wp-header-end" />

      {/* Search and Filters */}
      <div className="tablenav top">
        <div className="alignleft actions bulkactions">
          <Select onValueChange={handleBulkAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Bulk Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trash">Move to Trash</SelectItem>
              <SelectItem value="publish">Publish</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="secondary" 
            size="sm" 
            className="ml-2"
            onClick={() => handleBulkAction('apply')}
          >
            Apply
          </Button>
        </div>

        <div className="alignleft actions">
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="trash">Trash</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" className="ml-2">
            Filter
          </Button>
        </div>

        <div className="tablenav-pages">
          <div className="displaying-num">{pages.length} items</div>
        </div>
      </div>

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedPages}
        onSelectRow={(rowId, selected) => {
          if (selected) {
            setSelectedPages([...selectedPages, rowId]);
          } else {
            setSelectedPages(selectedPages.filter(id => id !== rowId));
          }
        }}
        onSelectAll={(selected) => {
          if (selected) {
            setSelectedPages(pages.map((page: Post) => page.id));
          } else {
            setSelectedPages([]);
          }
        }}
        loading={isLoading}
        emptyMessage="No pages found."
        className="wp-list-table widefat fixed striped pages"
      />

      {/* Bottom table nav */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <div className="displaying-num">{pages.length} items</div>
        </div>
      </div>

      {/* Screen Options */}
      <ScreenOptionsReact
        columns={options.columns}
        itemsPerPage={itemsPerPage}
        onColumnVisibilityChange={updateColumnVisibility}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default PageListWordPress;