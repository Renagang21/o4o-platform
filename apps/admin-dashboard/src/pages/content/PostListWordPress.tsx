import { useState, FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { WordPressTable, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTable';
import WordPressListLayout from '@/components/common/WordPressListLayout';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { formatDate } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Post, PostStatus } from '@o4o/types';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { useNavigate } from 'react-router-dom';

/**
 * WordPress-style Post List with Row Actions
 */
const PostListWordPress: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [selectedPosts, setSelectedPosts] = useState<any[]>([]);

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
  } = useScreenOptions('posts-list', {
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
      
      const response = await authClient.api.get(`/posts?${params}`);
      return response.data;
    }
  });

  // Delete post mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.delete(`/posts/${id}`);
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
      await authClient.api.post(`/posts/${id}/duplicate`);
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
      case 'trash':
        success(`${selectedPosts.length} post(s) moved to trash.`);
        setSelectedPosts([]);
        break;
      case 'publish':
        success(`${selectedPosts.length} post(s) published.`);
        setSelectedPosts([]);
        break;
      default:
        break;
    }
  };

  // Define table columns - only show visible ones
  const allColumns: WordPressTableColumn[] = [
    { id: 'title', label: 'Title', sortable: true },
    { id: 'author', label: 'Author' },
    { id: 'categories', label: 'Categories' },
    { id: 'tags', label: 'Tags' },
    { id: 'comments', label: '', width: '50px', align: 'center' },
    { id: 'date', label: 'Date', sortable: true }
  ];
  
  const columns = allColumns.filter((col: any) => isColumnVisible(col.id));

  // Transform posts to table rows
  const posts = data?.posts || [];
  const rows: WordPressTableRow[] = posts.map((post: Post) => ({
    id: post.id,
    data: {
      title: (
        <div>
          <strong>
            <a href={`/content/posts/${post.id}/edit`} className="row-title">
              {post.title}
            </a>
          </strong>
          {post.status !== 'published' && (
            <span className="ml-2">— {getStatusBadge(post.status)}</span>
          )}
        </div>
      ),
      author: post.author?.name || 'Unknown',
      categories: post.categories?.map((cat: any) => cat.name).join(', ') || '—',
      tags: post.tags?.map((tag: any) => tag.name).join(', ') || '—',
      comments: (
        <span className="comment-count">
          <span className="screen-reader-text">{post.commentCount || 0} comments</span>
          <span aria-hidden="true">💬 {post.commentCount || 0}</span>
        </span>
      ),
      date: (
        <div>
          <abbr title={formatDate(post.createdAt)}>
            {post.status === 'published' ? 'Published' : 'Last Modified'}
          </abbr>
          <br />
          {formatDate(post.createdAt)}
        </div>
      )
    },
    actions: [
      { label: 'Edit', href: `/content/posts/${post.id}/edit` },
      { label: 'Quick Edit', onClick: () => {/* Quick edit action */} },
      { 
        label: 'Trash', 
        onClick: () => deleteMutation.mutate(post.id),
        isDelete: true 
      },
      { label: 'View', href: `/preview/post/${post.id}` },
      { 
        label: 'Clone', 
        onClick: () => duplicateMutation.mutate(post.id) 
      }
    ]
  }));

  return (
    <WordPressListLayout
      title="Posts"
      subtitle="Manage your blog posts and articles"
      addNewLabel="Add New Post"
      onAddNew={() => navigate('/content/posts/new')}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search posts..."
      filters={[
        {
          value: statusFilter,
          onChange: (value) => setStatusFilter(value as PostStatus | 'all'),
          options: [
            { value: 'all', label: 'All Statuses' },
            { value: 'published', label: 'Published' },
            { value: 'draft', label: 'Draft' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'trash', label: 'Trash' }
          ],
          placeholder: 'Filter by status'
        }
      ]}
      bulkActions={[
        { value: 'trash', label: 'Move to Trash' },
        { value: 'publish', label: 'Publish' }
      ]}
      onBulkAction={handleBulkAction}
      selectedCount={selectedPosts.length}
      totalItems={posts.length}
      loading={isLoading}
      screenOptions={
        <ScreenOptionsReact
          title="Screen Options"
          columns={options.columns || defaultColumns}
          onColumnToggle={updateColumnVisibility}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      }
    >
      <WordPressTable
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedPosts}
        onSelectRow={(id, selected) => {
          if (selected) {
            setSelectedPosts([...selectedPosts, id]);
          } else {
            setSelectedPosts(selectedPosts.filter((postId: any) => postId !== id));
          }
        }}
        onSelectAll={(selected) => {
          if (selected) {
            setSelectedPosts(posts.map((p: Post) => p.id));
          } else {
            setSelectedPosts([]);
          }
        }}
        emptyMessage="No posts found."
      />
    </WordPressListLayout>
  );
};

export default PostListWordPress;