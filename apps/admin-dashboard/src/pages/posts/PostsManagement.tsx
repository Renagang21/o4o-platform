import { FC, useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
import type { Post, PostStatus } from '@o4o/types';
import toast from 'react-hot-toast';
import { WordPressTableWithInlineEdit, WordPressTableColumn, WordPressTableRow } from '@/components/common/WordPressTableWithInlineEdit';
import { useQuickEdit } from '@/hooks/useQuickEdit';
import { PostQuickEdit } from '@/components/content/PostQuickEdit';
import { ScreenOptionsReact } from '@/components/common/ScreenOptionsEnhanced';
import { useScreenOptions, ColumnOption } from '@/hooks/useScreenOptions';
import { PostsHelp } from '@/components/help/PostsHelp';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import '@/styles/wordpress-posts-complete.css';

/**
 * WordPress-style Posts Management Component
 * Complete implementation with status tabs, filters, and WordPress authentic layout
 * 
 * Features:
 * - Status tabs navigation (All, Mine, Published, Draft, Trash)
 * - Date, Category, and Format filters
 * - WordPress 3-tier layout structure
 * - Quick Edit inline editing
 * - Full pagination support
 */
const PostsManagement: FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useAuthStore(state => state.user);
  
  // State management
  const [searchQuery, setSearchQuery] = useState(searchParams.get('s') || '');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all' | 'mine'>(
    (searchParams.get('status') as any) || 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('category') || 'all');
  const [formatFilter, setFormatFilter] = useState(searchParams.get('format') || 'all');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  
  // Pagination state
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Status counts state
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    mine: 0,
    published: 0,
    draft: 0,
    scheduled: 0,
    private: 0,
    trash: 0
  });

  // Default column configuration
  const defaultColumns: ColumnOption[] = [
    { id: 'title', label: 'Title', visible: true, required: true },
    { id: 'author', label: 'Author', visible: true },
    { id: 'categories', label: 'Categories', visible: true },
    { id: 'tags', label: 'Tags', visible: true },
    { id: 'comments', label: 'Comments', visible: true }
  ];

  // Screen options hook
  const {
    options,
    itemsPerPage,
    isColumnVisible,
    updateColumnVisibility,
    setItemsPerPage
  } = useScreenOptions('posts-management', {
    columns: defaultColumns,
    itemsPerPage: 20
  });

  // Fetch status counts
  const { data: countsData } = useQuery({
    queryKey: ['posts-counts'],
    queryFn: async () => {
      try {
        // API endpoint not implemented yet - return mock data
        return {
          all: 0,
          mine: 0,
          published: 0,
          draft: 0,
          scheduled: 0,
          private: 0,
          trash: 0
        };
        // TODO: Uncomment when API is ready
        // const response = await authClient.api.get('/v1/posts/counts');
        return response.data;
      } catch (err) {
        console.error('Failed to fetch post counts:', err);
        return null;
      }
    }
  });

  useEffect(() => {
    if (countsData) {
      setStatusCounts(countsData);
    }
  }, [countsData]);


  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/categories');
      return response.data;
    }
  });

  const categories = categoriesData || [];

  // Posts query with pagination and filters
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', statusFilter, searchQuery, currentPage, itemsPerPage, dateFilter, categoryFilter, formatFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        
        // Handle status filter
        if (statusFilter === 'mine') {
          params.set('authorId', currentUser?.id || '');
        } else if (statusFilter !== 'all') {
          params.set('status', statusFilter);
        }
        
        if (searchQuery) params.set('search', searchQuery);
        if (dateFilter !== 'all') params.set('date', dateFilter);
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        if (formatFilter !== 'all') params.set('format', formatFilter);
        
        params.set('type', 'post');
        params.set('page', currentPage.toString());
        params.set('limit', itemsPerPage.toString());
        
        const response = await authClient.api.get(`/v1/posts?${params}`);
        
        // Handle pagination metadata
        if (response.data.meta) {
          setTotalPages(response.data.meta.totalPages || 1);
          setTotalItems(response.data.meta.totalItems || 0);
        } else if (response.data.pagination) {
          setTotalPages(response.data.pagination.pages || 1);
          setTotalItems(response.data.pagination.total || 0);
        }
        
        return response.data;
      } catch (err) {
        console.error('Failed to fetch posts:', err);
        throw err;
      }
    }
  });

  // Handle different response structures
  const posts = Array.isArray(data) ? data : (data?.posts || data?.data || []);

  // Quick edit mutation
  const quickEditMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const updateData: any = {
        title: data.title,
        slug: data.slug,
        status: data.status,
        authorId: data.authorId,
        categoryIds: data.categoryIds,
        commentStatus: data.commentStatus,
        pingStatus: data.pingStatus
      };

      // Handle tags
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
      queryClient.invalidateQueries({ queryKey: ['posts-counts'] });
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
    return {
      title: post.title,
      slug: post.slug,
      status: post.status,
      authorId: post.author?.id,
      categoryIds: post.categories?.map((c: any) => c.id) || [],
      tags: post.tags?.map((t: any) => t.name).join(', ') || '',
      commentStatus: post.commentStatus || 'open',
      pingStatus: post.pingStatus || 'open',
      password: post.password || '',
      isPrivate: post.status === 'private',
      isSticky: post.isSticky || false
    };
  };

  // Bulk actions handler
  const handleBulkAction = async () => {
    if (!bulkAction || selectedRows.length === 0) {
      toast.error('Please select posts and an action');
      return;
    }

    try {
      switch (bulkAction) {
        case 'edit':
          // TODO: Implement bulk edit
          toast.info('Bulk edit not yet implemented');
          break;
        case 'trash':
          await Promise.all(
            selectedRows.map(id => authClient.api.patch(`/posts/${id}`, { status: 'trash' }))
          );
          toast.success(`Moved ${selectedRows.length} posts to trash`);
          break;
        case 'publish':
          await Promise.all(
            selectedRows.map(id => authClient.api.patch(`/posts/${id}`, { status: 'published' }))
          );
          toast.success(`Published ${selectedRows.length} posts`);
          break;
      }
      setSelectedRows([]);
      setBulkAction('');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts-counts'] });
    } catch (error) {
      toast.error('Failed to perform bulk action');
    }
  };

  // Single post delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.delete(`/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['posts-counts'] });
      toast.success('Post deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete post');
    }
  });

  // Table columns configuration
  const allColumns: WordPressTableColumn[] = [
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
      label: '',
      align: 'center',
      width: '50px'
    }
  ];
  
  const columns = allColumns.filter(col => isColumnVisible(col.id));

  // Transform posts to table rows
  const rows: WordPressTableRow[] = posts.map((post: Post) => ({
    id: post.id,
    data: {
      title: (
        <div>
          <Link to={`/editor/posts/${post.id}`} className="row-title">
            <strong>{post.title || '(no title)'}</strong>
          </Link>
          {post.status === 'draft' && <span className="post-state"> — Draft</span>}
          {post.status === 'private' && <span className="post-state"> — Private</span>}
          {post.isSticky && <span className="post-state"> — Sticky</span>}
        </div>
      ),
      author: post.author?.name || 'Unknown',
      categories: (
        <div className="text-sm">
          {post.categories?.map((cat: any) => cat.name).join(', ') || '—'}
        </div>
      ),
      tags: (
        <div className="text-sm">
          {post.tags?.map((tag: any) => tag.name).join(', ') || '—'}
        </div>
      ),
      comments: (
        <span className="comment-count">
          <span className="comment-count-approved">
            <span className="screen-reader-text">{post.commentCount || 0} comments</span>
            <span aria-hidden="true">💬</span>
            <span className="comment-count-no">{post.commentCount || 0}</span>
          </span>
        </span>
      )
    },
    actions: [
      {
        label: 'Edit',
        onClick: () => navigate(`/editor/posts/${post.id}`)
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

  // Handle status filter change
  const handleStatusClick = (status: string) => {
    setStatusFilter(status as any);
    const newParams = new URLSearchParams(searchParams);
    if (status !== 'all') {
      newParams.set('status', status);
    } else {
      newParams.delete('status');
    }
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  // Handle search
  const handleSearch = () => {
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('s', searchQuery);
    if (statusFilter !== 'all') newParams.set('status', statusFilter);
    if (dateFilter !== 'all') newParams.set('date', dateFilter);
    if (categoryFilter !== 'all') newParams.set('category', categoryFilter);
    if (formatFilter !== 'all') newParams.set('format', formatFilter);
    newParams.set('page', '1'); // Reset to first page on search
    setSearchParams(newParams);
  };

  // Handle filter changes
  const handleFilterApply = () => {
    const newParams = new URLSearchParams();
    if (searchQuery) newParams.set('s', searchQuery);
    if (statusFilter !== 'all') newParams.set('status', statusFilter);
    if (dateFilter !== 'all') newParams.set('date', dateFilter);
    if (categoryFilter !== 'all') newParams.set('category', categoryFilter);
    if (formatFilter !== 'all') newParams.set('format', formatFilter);
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', page.toString());
    setSearchParams(newParams);
  };

  // Calculate pagination info
  const startItem = ((currentPage - 1) * itemsPerPage) + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);


  return (
    <div className="wrap" style={{ 
      backgroundColor: '#f0f0f1',
      minHeight: '100vh',
      padding: '20px',
      marginRight: '20px'
    }}>
      <PostsHelp />
      
      {/* Screen Options - Top Right - properly aligned */}
      <div className="screen-options-wrap" style={{ 
        position: 'absolute', 
        top: '0', 
        right: '0',
        zIndex: 100,
        display: 'inline-block',
        verticalAlign: 'middle'
      }}>
        <ScreenOptionsReact
          columns={options.columns || defaultColumns}
          itemsPerPage={itemsPerPage}
          onColumnToggle={updateColumnVisibility}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
      
      {/* Title and Add New - First Row - Properly aligned */}
      <div style={{ position: 'relative', marginBottom: '20px', display: 'flex', alignItems: 'center', height: '40px' }}>
        <h1 className="wp-heading-inline" style={{ margin: 0, lineHeight: '40px', display: 'inline-block' }}>Posts</h1>
        <Link to="/editor/posts/new" className="page-title-action" style={{ 
          marginLeft: '10px',
          display: 'inline-flex',
          alignItems: 'center',
          height: '28px'
        }}>
          Add New
        </Link>
      </div>
      <hr className="wp-header-end" style={{ clear: 'both', margin: '10px 0' }} />

      {/* Status tabs and Search - Second Row */}
      <div className="wp-filter" style={{ 
        marginBottom: '10px',
        background: 'transparent',
        padding: '10px 0',
        overflow: 'hidden'
      }}>
        <ul className="subsubsub" style={{ float: 'left', margin: '8px 0' }}>
          <li className="all">
            <a 
              href="#" 
              className={statusFilter === 'all' ? 'current' : ''}
              onClick={(e) => { e.preventDefault(); handleStatusClick('all'); }}
              aria-current={statusFilter === 'all' ? 'page' : undefined}
            >
              All <span className="count">({statusCounts.all})</span>
            </a> |
          </li>
          <li className="mine">
            <a 
              href="#" 
              className={statusFilter === 'mine' ? 'current' : ''}
              onClick={(e) => { e.preventDefault(); handleStatusClick('mine'); }}
            >
              Mine <span className="count">({statusCounts.mine})</span>
            </a> |
          </li>
          <li className="publish">
            <a 
              href="#" 
              className={statusFilter === 'published' ? 'current' : ''}
              onClick={(e) => { e.preventDefault(); handleStatusClick('published'); }}
            >
              Published <span className="count">({statusCounts.published})</span>
            </a> |
          </li>
          <li className="draft">
            <a 
              href="#" 
              className={statusFilter === 'draft' ? 'current' : ''}
              onClick={(e) => { e.preventDefault(); handleStatusClick('draft'); }}
            >
              Draft <span className="count">({statusCounts.draft})</span>
            </a> |
          </li>
          <li className="trash">
            <a 
              href="#" 
              className={statusFilter === 'trash' ? 'current' : ''}
              onClick={(e) => { e.preventDefault(); handleStatusClick('trash'); }}
            >
              Trash <span className="count">({statusCounts.trash})</span>
            </a>
          </li>
        </ul>
        
        <p className="search-box" style={{ float: 'right', margin: 0 }}>
          <Input
            type="search"
            id="post-search-input"
            name="s"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ width: '200px', marginRight: '8px' }}
          />
          <Button 
            type="submit"
            id="search-submit"
            className="button"
            onClick={handleSearch}
          >
            Search Posts
          </Button>
        </p>
        
        <div style={{ clear: 'both' }}></div>
      </div>

      {/* Filters and Pagination - Third Row */}
      <div className="tablenav top">
        <div className="alignleft actions bulkactions">
          <label htmlFor="bulk-action-selector-top" className="screen-reader-text">
            Select bulk action
          </label>
          <Select value={bulkAction} onValueChange={setBulkAction}>
            <SelectTrigger id="bulk-action-selector-top" style={{ width: '150px' }}>
              <SelectValue placeholder="Bulk actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Bulk actions</SelectItem>
              <SelectItem value="edit">Edit</SelectItem>
              <SelectItem value="trash">Move to Trash</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            type="submit"
            className="button action"
            onClick={handleBulkAction}
            style={{ marginLeft: '8px' }}
          >
            Apply
          </Button>
        </div>

        <div className="alignleft actions">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger style={{ width: '150px', marginLeft: '8px' }}>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Format Filter */}
          <Select value={formatFilter} onValueChange={setFormatFilter}>
            <SelectTrigger style={{ width: '150px', marginLeft: '8px' }}>
              <SelectValue placeholder="All formats" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="aside">Aside</SelectItem>
              <SelectItem value="gallery">Gallery</SelectItem>
              <SelectItem value="link">Link</SelectItem>
              <SelectItem value="image">Image</SelectItem>
              <SelectItem value="quote">Quote</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="chat">Chat</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            type="submit"
            className="button"
            onClick={handleFilterApply}
            style={{ marginLeft: '8px' }}
          >
            Filter
          </Button>
        </div>

        {/* Pagination - Right side */}
        <div className="tablenav-pages">
          <span className="displaying-num">
            {totalItems} items
          </span>
          
          {totalPages > 1 && (
            <span className="pagination-links">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="first-page button"
                aria-label="First page"
              >
                «
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="prev-page button"
                aria-label="Previous page"
              >
                ‹
              </Button>
              
              <span className="paging-input">
                <label htmlFor="current-page-selector" className="screen-reader-text">
                  Current Page
                </label>
                <input 
                  className="current-page"
                  id="current-page-selector"
                  type="text"
                  value={currentPage}
                  size={1}
                  aria-describedby="table-paging"
                  readOnly
                />
                <span className="tablenav-paging-text">
                  {' '}of <span className="total-pages">{totalPages}</span>
                </span>
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="next-page button"
                aria-label="Next page"
              >
                ›
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="last-page button"
                aria-label="Last page"
              >
                »
              </Button>
            </span>
          )}
        </div>
        
        <br className="clear" />
      </div>

      {error && (
        <div className="notice notice-error">
          <p>Error loading posts: {error instanceof Error ? error.message : 'Please try again.'}</p>
        </div>
      )}

      {/* WordPress Table with Inline Edit - White background with padding */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #c3c4c7',
        boxShadow: '0 1px 1px rgba(0,0,0,0.04)',
        marginTop: '20px',
        marginRight: '20px'
      }}>
      <WordPressTableWithInlineEdit
        columns={columns}
        rows={rows}
        selectable={true}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        loading={isLoading}
        emptyMessage="No posts found."
        inlineEditRows={inlineEditRows}
        editingRowId={quickEdit.editingId}
      />
      </div>

      {/* Bottom pagination only - no duplicate bulk actions */}
      <div className="tablenav bottom">
        <div className="tablenav-pages">
          <span className="displaying-num">
            {totalItems} items
          </span>
          
          {totalPages > 1 && (
            <span className="pagination-links">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="first-page button"
                aria-label="First page"
              >
                «
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="prev-page button"
                aria-label="Previous page"
              >
                ‹
              </Button>
              
              <span className="screen-reader-text">Current Page</span>
              <span className="paging-input">
                {currentPage} of <span className="total-pages">{totalPages}</span>
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="next-page button"
                aria-label="Next page"
              >
                ›
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="last-page button"
                aria-label="Last page"
              >
                »
              </Button>
            </span>
          )}
        </div>
        
        <br className="clear" />
      </div>
    </div>
  );
};

export default PostsManagement;