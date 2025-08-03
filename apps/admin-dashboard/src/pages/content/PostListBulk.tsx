import { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge'; // Not used in bulk view
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Post, PostStatus } from '@o4o/types';
import toast from 'react-hot-toast';
import { useBulkActions } from '@/hooks/useBulkActions';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { SelectableTable } from '@/components/common/SelectableTable';
import { RowActions } from '@/components/common/RowActions';
import { useState } from 'react';

/**
 * WordPress-style Posts list with bulk actions
 */
const PostListBulk: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');

  // Posts query
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('type', 'post');
      
      const response = await authClient.api.get(`/posts?${params}`);
      return response.data;
    }
  });

  const posts = data?.posts || [];

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => authClient.api.delete(`/posts/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Selected posts deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete some posts');
    }
  });

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[], status: PostStatus }) => {
      await Promise.all(ids.map(id => 
        authClient.api.patch(`/posts/${id}`, { status })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Posts status updated successfully');
    },
    onError: () => {
      toast.error('Failed to update some posts');
    }
  });

  // Single post delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.delete(`/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete post');
    }
  });

  // Bulk actions configuration
  const bulkActions = [
    {
      value: 'trash',
      label: 'Move to Trash',
      action: async (ids: string[]) => {
        await bulkStatusMutation.mutateAsync({ ids, status: 'trash' });
      },
      confirmMessage: 'Are you sure you want to move {count} post(s) to trash?'
    },
    {
      value: 'delete',
      label: 'Delete Permanently',
      action: async (ids: string[]) => {
        await bulkDeleteMutation.mutateAsync(ids);
      },
      confirmMessage: 'Are you sure you want to permanently delete {count} post(s)? This cannot be undone.',
      isDestructive: true
    },
    {
      value: 'publish',
      label: 'Publish',
      action: async (ids: string[]) => {
        await bulkStatusMutation.mutateAsync({ ids, status: 'published' });
      }
    },
    {
      value: 'draft',
      label: 'Move to Draft',
      action: async (ids: string[]) => {
        await bulkStatusMutation.mutateAsync({ ids, status: 'draft' });
      }
    }
  ];

  const {
    // selectedIds, // Used by BulkActionBar component
    selectedCount,
    isAllSelected,
    isSomeSelected,
    isProcessing,
    toggleAll,
    toggleItem,
    executeBulkAction,
    isSelected
  } = useBulkActions({
    items: posts,
    idField: 'id',
    actions: bulkActions
  });

  // Table columns
  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (post: Post) => (
        <div>
          <Link to={`/posts/${post.id}/edit`} className="font-medium text-blue-600 hover:text-blue-800">
            {post.title || '(no title)'}
          </Link>
          {post.status === 'draft' && <span className="text-gray-500 text-sm ml-2">— Draft</span>}
        </div>
      )
    },
    {
      key: 'author',
      label: 'Author',
      render: (post: Post) => post.author?.name || 'Unknown'
    },
    {
      key: 'categories',
      label: 'Categories',
      render: (post: Post) => (
        <div className="text-sm text-gray-600">
          {post.categories?.map(cat => cat.name).join(', ') || '—'}
        </div>
      )
    },
    {
      key: 'tags',
      label: 'Tags',
      render: (post: Post) => (
        <div className="text-sm text-gray-600">
          {post.tags?.map(tag => tag.name).join(', ') || '—'}
        </div>
      )
    },
    {
      key: 'comments',
      label: 'Comments',
      render: (post: Post) => (
        <div className="text-center">
          <span className="comment-count">{post.commentCount || 0}</span>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (post: Post) => (
        <div className="text-sm">
          <div>{post.status === 'published' ? 'Published' : 'Last Modified'}</div>
          <div className="text-gray-600">{formatDate(post.updatedAt || post.createdAt)}</div>
        </div>
      )
    }
  ];

  // Row actions
  const getRowActions = (post: Post) => {
    const actions = [
      {
        label: 'Edit',
        onClick: () => navigate(`/posts/${post.id}/edit`)
      },
      {
        label: 'Quick Edit',
        onClick: () => {
          // TODO: Implement quick edit
          toast('Quick Edit coming soon!');
        }
      },
      {
        label: 'Trash',
        onClick: async () => {
          if (confirm('Are you sure you want to move this post to trash?')) {
            await deleteMutation.mutateAsync(post.id);
          }
        },
        className: 'text-red-600'
      },
      {
        label: 'View',
        href: `/posts/${post.slug}`,
        target: '_blank'
      }
    ];

    return <RowActions actions={actions} />;
  };

  // Status badge - Not used in bulk view
  /*
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
  */

  return (
    <div className="wrap">
      <h1 className="wp-heading-inline">Posts</h1>
      <Link to="/posts/new" className="page-title-action">
        Add New
      </Link>
      <hr className="wp-header-end" />

      {/* Filters */}
      <div className="wp-filter">
        <div className="filter-items">
          <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as PostStatus | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All posts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All posts</SelectItem>
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
              onChange={(e: any) => setSearchQuery(e.target.value)}
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
        selectedCount={selectedCount}
        onActionExecute={executeBulkAction}
        isProcessing={isProcessing}
        position="top"
      />

      {/* Posts Table */}
      {isLoading ? (
        <div className="text-center py-8">Loading posts...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">Error loading posts</div>
      ) : (
        <SelectableTable
          columns={columns}
          data={posts}
          idField="id"
          isAllSelected={isAllSelected}
          isSomeSelected={isSomeSelected}
          onToggleAll={toggleAll}
          onToggleItem={toggleItem}
          isSelected={isSelected}
          rowActions={getRowActions}
          emptyMessage="No posts found"
        />
      )}

      {/* Bulk Actions - Bottom */}
      <BulkActionBar
        actions={bulkActions}
        selectedCount={selectedCount}
        onActionExecute={executeBulkAction}
        isProcessing={isProcessing}
        position="bottom"
      />

      {/* Pagination */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">{posts.length} items</span>
          {/* TODO: Add pagination controls */}
        </div>
      </div>
    </div>
  );
};

export default PostListBulk;