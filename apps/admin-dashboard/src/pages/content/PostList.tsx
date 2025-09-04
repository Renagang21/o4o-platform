import { useState, FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { formatDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../utils/apiClient';
import type { Post, PostStatus } from '@o4o/types';
import { useAdminNotices } from '@/hooks/useAdminNotices';

/**
 * WordPress-style Post List
 * Standardized with WordPressTable component
 */
const PostList: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);

  // Default column configuration
  const defaultColumns: ColumnOption[] = [
    { id: 'title', label: 'Title', visible: true, required: true },
    { id: 'author', label: 'Author', visible: true },
    { id: 'categories', label: 'Categories', visible: true },
    { id: 'tags', label: 'Tags', visible: true },
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
  } = useScreenOptions('content-posts-list', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch posts
  const { data, isLoading } = useQuery({
    queryKey: ['posts', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('type', 'post');
      
      const response = await apiClient.get(`/posts?${params}`);
      return response;
    }
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      success('Post moved to trash.');
    },
    onError: () => {
      error('Failed to delete post.');
    }
  });

  // Duplicate post mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post(`/posts/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      success('Post duplicated successfully.');
    },
    onError: () => {
      error('Failed to duplicate post.');
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
    if (selectedPosts.length === 0) {
      error('No posts selected.');
      return;
    }
    
    switch (action) {
      case 'delete':
        success(`${selectedPosts.length} post(s) moved to trash.`);
        setSelectedPosts([]);
        break;
      case 'publish':
        success(`${selectedPosts.length} post(s) published.`);
        setSelectedPosts([]);
        break;
      case 'draft':
        success(`${selectedPosts.length} post(s) moved to draft.`);
        setSelectedPosts([]);
        break;
      default:
        break;
    }
  };

  const posts = data?.posts || [];

  // Define table columns - only show visible ones
  const allColumns: WordPressTableColumn[] = [
    { id: 'title', label: 'Title', sortable: true },
    { id: 'author', label: 'Author' },
    { id: 'categories', label: 'Categories' },
    { id: 'tags', label: 'Tags' },
    { id: 'comments', label: 'Comments', align: 'center' },
    { id: 'date', label: 'Date', sortable: true }
  ];
  
  const columns = allColumns.filter(col => isColumnVisible(col.id));

  // Transform posts to table rows
  const rows: WordPressTableRow[] = posts.map((post: Post) => ({
    id: post.id,
    data: {
      title: (
        <div>
          <strong>
            <Link to={`/content/posts/${post.id}/edit`} className="row-title">
              {post.title || '(No Title)'}
            </Link>
          </strong>
          {post.status !== 'published' && (
            <span className="ml-2"> — {getStatusBadge(post.status)}</span>
          )}
        </div>
      ),
      author: (
        <div className="text-sm">
          <div className="font-medium">{post.author?.name}</div>
          <div className="text-gray-500">{post.author?.email}</div>
        </div>
      ),
      categories: post.categories?.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {post.categories.map((category: any) => (
            <a key={category.id} href={`/posts?category=${category.id}`} className="text-blue-600 hover:underline text-sm">
              {category.name}
            </a>
          ))}
        </div>
      ) : (
        <span className="text-gray-400">—</span>
      ),
      tags: post.tags?.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {post.tags.map((tag: any) => (
            <a key={tag} href={`/posts?tag=${tag}`} className="text-blue-600 hover:underline text-sm">
              {tag}
            </a>
          ))}
        </div>
      ) : (
        <span className="text-gray-400">—</span>
      ),
      comments: (
        <div className="text-center">
          <span className="comment-count">{post.commentCount || 0}</span>
        </div>
      ),
      date: (
        <div>
          <abbr title={formatDate(post.publishedAt || post.createdAt)}>
            {post.status === 'published' ? 'Published' : 'Last Modified'}
          </abbr>
          <br />
          {formatDate(post.publishedAt || post.updatedAt)}
        </div>
      )
    },
    actions: [
      {
        label: 'Edit',
        onClick: () => navigate(`/content/posts/${post.id}/edit`),
        primary: true
      },
      {
        label: 'Quick Edit',
        onClick: () => {} // TODO: Implement quick edit functionality
      },
      {
        label: 'Trash',
        onClick: () => deleteMutation.mutate(post.id),
        destructive: true
      },
      {
        label: 'View',
        href: `/posts/${post.slug}`,
        external: true
      },
      {
        label: 'Duplicate',
        onClick: () => duplicateMutation.mutate(post.id)
      }
    ]
  }));

  // Bulk actions configuration
  const bulkActions = [
    {
      value: 'edit',
      label: 'Edit'
    },
    {
      value: 'delete',
      label: 'Move to Trash',
      action: async () => handleBulkAction('delete')
    },
    {
      value: 'publish',
      label: 'Publish',
      action: async () => handleBulkAction('publish')
    },
    {
      value: 'draft',
      label: 'Move to Draft',
      action: async () => handleBulkAction('draft')
    }
  ];

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">Posts</h1>
      
      <Link to="/content/posts/new" className="page-title-action">
        Add New
      </Link>
      
      <hr className="wp-header-end" />

      {/* Filters */}
      <div className="wp-filter">
        <div className="filter-items">
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PostStatus | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="trash">Trash</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="search-box">
            <Input
              type="search"
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[300px]"
            />
            <Button variant="secondary">
              Search Posts
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions - Top */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedPosts.length}
        onActionExecute={(action) => handleBulkAction(action)}
        isProcessing={false}
        position="top"
      />

      {/* WordPress Table */}
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedPosts}
        onSelectRow={(rowId, selected) => {
          if (selected) {
            setSelectedPosts([...selectedPosts, rowId]);
          } else {
            setSelectedPosts(selectedPosts.filter(id => id !== rowId));
          }
        }}
        onSelectAll={(selected) => {
          if (selected) {
            setSelectedPosts(posts.map((p: Post) => p.id));
          } else {
            setSelectedPosts([]);
          }
        }}
        loading={isLoading}
        emptyMessage="No posts found. Create your first post!"
        className="wp-list-table widefat fixed striped posts"
      />

      {/* Bulk Actions - Bottom */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedPosts.length}
        onActionExecute={(action) => handleBulkAction(action)}
        isProcessing={false}
        position="bottom"
      />

      {/* Pagination */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{posts.length} items</span>
        </div>
      </div>

      {/* Screen Options */}
      <ScreenOptionsReact
        columns={options.columns}
        itemsPerPage={itemsPerPage}
        onColumnToggle={updateColumnVisibility}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default PostList;