import { FC, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { WordPressTableWithInlineEdit, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTableWithInlineEdit';
import { BulkActionBar } from '@/components/common/BulkActionBar';
import { useBulkActions } from '@/hooks/useBulkActions';
import { useQuickEdit } from '@/hooks/useQuickEdit';
import { PostQuickEdit } from '@/components/content/PostQuickEdit';
import { ScreenMeta } from '@/components/common/ScreenMeta';
import { PostsHelp } from '@/components/help/PostsHelp';

/**
 * WordPress-style Posts list with quick edit functionality
 * Standardized with WordPressTableWithInlineEdit component
 */
const PostListQuickEdit: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

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

  // Categories query
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/categories');
      return response.data;
    }
  });

  const categories = categoriesData || [];

  // Quick edit mutation
  const quickEditMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      // Transform quick edit data to API format
      const updateData: any = {
        title: data.title,
        slug: data.slug,
        status: data.status,
        authorId: data.authorId,
        categoryIds: data.categoryIds,
        commentStatus: data.commentStatus,
        pingStatus: data.pingStatus
      };

      // Handle date
      if (data.publishYear && data.publishMonth && data.publishDay) {
        updateData.publishedAt = new Date(
          parseInt(data.publishYear),
          parseInt(data.publishMonth) - 1,
          parseInt(data.publishDay)
        ).toISOString();
      }

      // Handle tags (comma-separated string to array)
      if (data.tags) {
        updateData.tags = data.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }

      // Handle password and privacy
      if (data.password) {
        updateData.password = data.password;
      }
      if (data.isPrivate) {
        updateData.status = 'private';
      }

      updateData.isSticky = data.isSticky;

      await authClient.api.patch(`/posts/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post updated successfully');
    },
    onError: () => {
      toast.error('Failed to update post');
    }
  });

  // Quick edit hook
  const quickEdit = useQuickEdit({
    onSave: async (id, data) => {
      await quickEditMutation.mutateAsync({ id, data });
    }
  });

  // Prepare quick edit initial data
  const prepareQuickEditData = (post: Post) => {
    const publishDate = new Date(post.publishedAt || post.createdAt);
    
    return {
      title: post.title,
      slug: post.slug,
      status: post.status,
      authorId: post.author?.id,
      categoryIds: post.categories?.map((c: any) => c.id) || [],
      tags: post.tags?.map((t: any) => t.name).join(', ') || '',
      publishYear: publishDate.getFullYear().toString() as any,
      publishMonth: (publishDate.getMonth() + 1).toString().padStart(2, '0'),
      publishDay: publishDate.getDate().toString().padStart(2, '0'),
      commentStatus: post.commentStatus || 'open',
      pingStatus: post.pingStatus || 'open',
      password: post.password || '',
      isPrivate: post.status === 'private',
      isSticky: post.isSticky || false
    };
  };

  // Bulk mutations
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id: any) => authClient.api.delete(`/posts/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Selected posts deleted successfully');
      setSelectedRows([]);
    },
    onError: () => {
      toast.error('Failed to delete some posts');
    }
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[], status: PostStatus }) => {
      await Promise.all(ids.map((id: any) => 
        authClient.api.patch(`/posts/${id}`, { status })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Posts status updated successfully');
      setSelectedRows([]);
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
    selectedCount,
    isProcessing,
    executeBulkAction
  } = useBulkActions({
    items: posts,
    idField: 'id',
    actions: bulkActions,
    selectedIds: selectedRows
  });

  // Table columns configuration
  const columns: WordPressTableColumn[] = [
    {
      id: 'title',
      label: 'Title',
      sortable: true
    },
    {
      id: 'author',
      label: 'Author'
    },
    {
      id: 'categories',
      label: 'Categories'
    },
    {
      id: 'tags',
      label: 'Tags'
    },
    {
      id: 'comments',
      label: 'Comments',
      align: 'center',
      width: '80px'
    },
    {
      id: 'date',
      label: 'Date',
      sortable: true,
      width: '150px'
    }
  ];

  // Transform posts to table rows
  const rows: WordPressTableRow[] = posts.map((post: Post) => ({
    id: post.id,
    data: {
      title: (
        <div>
          <Link to={`/posts/${post.id}/edit`} className="font-medium text-blue-600 hover:text-blue-800">
            {post.title || '(no title)'}
          </Link>
          {post.status === 'draft' && <span className="text-gray-500 text-sm ml-2">— Draft</span>}
        </div>
      ),
      author: post.author?.name || 'Unknown',
      categories: (
        <div className="text-sm text-gray-600">
          {post.categories?.map((cat: any) => cat.name).join(', ') || '—'}
        </div>
      ),
      tags: (
        <div className="text-sm text-gray-600">
          {post.tags?.map((tag: any) => tag.name).join(', ') || '—'}
        </div>
      ),
      comments: (
        <span className="comment-count">{post.commentCount || 0}</span>
      ),
      date: (
        <div className="text-sm">
          <div>{post.status === 'published' ? 'Published' : 'Last Modified'}</div>
          <div className="text-gray-600">{formatDate(post.updatedAt || post.createdAt)}</div>
        </div>
      )
    },
    actions: [
      {
        label: 'Edit',
        onClick: () => navigate(`/posts/${post.id}/edit`)
      },
      {
        label: 'Quick Edit',
        onClick: () => {
          quickEdit.startEdit(post.id, prepareQuickEditData(post));
        },
        className: 'quick-edit'
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
    ]
  }));

  // Inline edit rows configuration
  const inlineEditRows = posts.map((post: Post) => ({
    rowId: post.id,
    renderEdit: () => (
      <PostQuickEdit
        post={post}
        formData={quickEdit.formData}
        onUpdate={quickEdit.updateField}
        onSave={quickEdit.saveEdit}
        onCancel={quickEdit.cancelEdit}
        isLoading={quickEdit.isLoading}
        categories={categories}
      />
    )
  }));

  // Handle row selection
  const handleSelectRow = (rowId: string, selected: boolean) => {
    if (selected) {
      setSelectedRows([...selectedRows, rowId]);
    } else {
      setSelectedRows(selectedRows.filter(id => id !== rowId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(posts.map((p: Post) => p.id));
    } else {
      setSelectedRows([]);
    }
  };

  return (
    <div className="wrap">
      <PostsHelp />
      <ScreenMeta />
      
      <h1 className="wp-heading-inline">Posts</h1>
      <Link to="/editor/posts/new" className="page-title-action">
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

      {/* WordPress Table with Inline Edit */}
      <WordPressTableWithInlineEdit
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        loading={isLoading}
        emptyMessage="No posts found. Create your first post!"
        inlineEditRows={inlineEditRows}
        editingRowId={quickEdit.editingId}
      />

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

      {error && (
        <div className="notice notice-error">
          <p>Error loading posts. Please try again.</p>
        </div>
      )}
    </div>
  );
};

export default PostListQuickEdit;