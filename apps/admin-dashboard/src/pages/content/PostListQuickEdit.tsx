import { FC, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Badge } from '@/components/ui/badge'; // Not used in quick edit view
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
import { useQuickEdit } from '@/hooks/useQuickEdit';
import { BulkActionBar } from '@/components/common/BulkActionBar';
// import { SelectableTable } from '@/components/common/SelectableTable'; // Not used
import { RowActions } from '@/components/common/RowActions';
import { PostQuickEdit } from '@/components/content/PostQuickEdit';
import { ScreenMeta } from '@/components/common/ScreenMeta';
import { PostsHelp } from '@/components/help/PostsHelp';
import { useState } from 'react';

/**
 * WordPress-style Posts list with bulk actions and quick edit
 */
const PostListQuickEdit: FC = () => {
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

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id: any) => authClient.api.delete(`/posts/${id}`)));
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
      await Promise.all(ids.map((id: any) => 
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
    // selectedIds, // Not used directly
    selectedCount,
    isAllSelected,
    // isSomeSelected, // Not used
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
          {post.categories?.map((cat: any) => cat.name).join(', ') || '—'}
        </div>
      )
    },
    {
      key: 'tags',
      label: 'Tags',
      render: (post: Post) => (
        <div className="text-sm text-gray-600">
          {post.tags?.map((tag: any) => tag.name).join(', ') || '—'}
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

  // Row actions with Quick Edit
  const getRowActions = (post: Post) => {
    const actions = [
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
    ];

    return <RowActions actions={actions} visible={!quickEdit.isEditing(post.id)} />;
  };

  // Status badge - Not used in quick edit view
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

  // Custom table render to handle quick edit rows
  const renderTableBody = () => {
    if (posts.length === 0) {
      return (
        <tr>
          <td colSpan={columns.length + 1} className="colspanchange text-center py-4">
            No posts found
          </td>
        </tr>
      );
    }

    return posts.map((post: Post, index: number) => {
      const itemId = String(post.id);
      const selected = isSelected(itemId);
      const isBeingEdited = quickEdit.isEditing(itemId);
      
      return (
        <Fragment key={itemId}>
          <tr
            className={`${selected ? 'selected' : ''} ${index % 2 === 0 ? 'alternate' : ''} ${isBeingEdited ? 'hidden' : ''}`}
          >
            <th scope="row" className="check-column">
              <label className="screen-reader-text" htmlFor={`cb-select-${itemId}`}>
                Select {post.title || `Post ${itemId}`}
              </label>
              <input
                type="checkbox"
                id={`cb-select-${itemId}`}
                checked={selected}
                onChange={() => toggleItem(itemId)}
              />
            </th>
            {columns.map((column: any) => (
              <td
                key={column.key}
                className={`column-${column.key}`}
              >
                {column.render ? column.render(post) : (post as any)[column.key]}
                {column.key === columns[0].key && getRowActions(post)}
              </td>
            ))}
          </tr>
          {isBeingEdited && (
            <PostQuickEdit
              post={post}
              formData={quickEdit.formData}
              onUpdate={quickEdit.updateField}
              onSave={quickEdit.saveEdit}
              onCancel={quickEdit.cancelEdit}
              isLoading={quickEdit.isLoading}
              categories={categories}
            />
          )}
        </Fragment>
      );
    });
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

      {/* Posts Table with Quick Edit */}
      {isLoading ? (
        <div className="text-center py-8">Loading posts...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">Error loading posts</div>
      ) : (
        <table className="wp-list-table widefat fixed striped posts">
          <thead>
            <tr>
              <td className="manage-column column-cb check-column">
                <label className="screen-reader-text" htmlFor="cb-select-all">
                  Select All
                </label>
                <input
                  type="checkbox"
                  id="cb-select-all"
                  checked={isAllSelected}
                  onChange={toggleAll}
                />
              </td>
              {columns.map((column: any) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`manage-column column-${column.key}${column.sortable ? ' sortable' : ''}`}
                >
                  {column.sortable ? (
                    <a href="#">
                      <span>{column.label}</span>
                      <span className="sorting-indicator"></span>
                    </a>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody id="the-list">
            {renderTableBody()}
          </tbody>
          <tfoot>
            <tr>
              <td className="manage-column column-cb check-column">
                <label className="screen-reader-text" htmlFor="cb-select-all-2">
                  Select All
                </label>
                <input
                  type="checkbox"
                  id="cb-select-all-2"
                  checked={isAllSelected}
                  onChange={toggleAll}
                />
              </td>
              {columns.map((column: any) => (
                <th key={column.key} scope="col" className={`manage-column column-${column.key}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </tfoot>
        </table>
      )}


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

export default PostListQuickEdit;