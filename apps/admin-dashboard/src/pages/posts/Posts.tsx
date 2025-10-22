import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';

// Custom hooks
import { usePostsData, PostStatus, SortField, SortOrder } from '@/hooks/posts/usePostsData';
import { usePostsActions } from '@/hooks/posts/usePostsActions';

// Components
import { PostsStatusTabs } from '@/components/posts/PostsStatusTabs';
import { PostsBulkActions } from '@/components/posts/PostsBulkActions';
import { PostsScreenOptions } from '@/components/posts/PostsScreenOptions';
import { QuickEditRow } from '@/components/posts/QuickEditRow';
import { PostRow } from '@/components/posts/PostRow';

const PostsRefactored = () => {
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState<PostStatus>(() => {
    const saved = sessionStorage.getItem('posts-active-tab');
    return (saved as PostStatus) || 'all';
  });
  
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState<{
    title: string;
    slug: string;
    status: 'pending' | 'draft' | 'published' | 'trash';
    categoryIds: string[];
    tags: string;
  }>({
    title: '',
    slug: '',
    status: 'published',
    categoryIds: [],
    tags: ''
  });
  
  // Screen Options state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('posts-visible-columns');
    return saved ? JSON.parse(saved) : {
      author: true,
      categories: true,
      tags: true,
      comments: true,
      date: true,
      status: true
    };
  });
  
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('posts-items-per-page');
    return saved ? parseInt(saved) : 20;
  });

  // Custom hooks
  const { 
    posts, 
    setPosts, 
    loading, 
    error, 
    filteredPosts, 
    counts 
  } = usePostsData({
    activeTab,
    searchQuery,
    sortField,
    sortOrder,
    itemsPerPage
  });

  const {
    handleQuickEdit,
    handleTrash,
    handlePermanentDelete,
    handleRestore,
    handleBulkAction
  } = usePostsActions({ posts, setPosts });

  // Effects
  useEffect(() => {
    sessionStorage.setItem('posts-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('posts-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    localStorage.setItem('posts-items-per-page', itemsPerPage.toString());
  }, [itemsPerPage]);

  // Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPosts(new Set(filteredPosts.map(p => p.id)));
    } else {
      setSelectedPosts(new Set());
    }
  };

  const handleSelectPost = (id: string) => {
    const newSelection = new Set(selectedPosts);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedPosts(newSelection);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleColumnToggle = (column: string) => {
    setVisibleColumns((prev: any) => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleItemsPerPageChange = (value: string) => {
    const num = parseInt(value) || 20;
    if (num < 1) {
      setItemsPerPage(1);
    } else if (num > 999) {
      setItemsPerPage(999);
    } else {
      setItemsPerPage(num);
    }
  };

  const handleApplyBulkAction = async () => {
    const success = await handleBulkAction(selectedBulkAction, selectedPosts);
    if (success) {
      setSelectedPosts(new Set());
      setSelectedBulkAction('');
    }
  };

  const handleQuickEditClick = (id: string) => {
    const post = posts.find(p => p.id === id);
    if (post) {
      setQuickEditId(id);
      setQuickEditData({
        title: post.title,
        slug: post.slug,
        status: post.status as 'pending' | 'draft' | 'published' | 'trash',
        categoryIds: post.categories || [],
        tags: post.tags ? post.tags.join(', ') : ''
      });
    }
  };

  const handleSaveQuickEdit = async () => {
    if (quickEditId) {
      const success = await handleQuickEdit(quickEditId, quickEditData);
      if (success) {
        setQuickEditId(null);
      }
    }
  };

  const handleCancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditData({
      title: '',
      slug: '',
      status: 'published',
      categoryIds: [],
      tags: ''
    });
  };

  const getColumnCount = () => {
    return 2 + Object.values(visibleColumns).filter(Boolean).length;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="text-gray-600">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
      {/* Error message */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-8 mt-4">
          <p className="text-sm text-yellow-700">{error}</p>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb 
            items={[
              { label: 'Admin', path: '/admin' },
              { label: '글', path: '/admin/posts' },
              { label: '모든 글' }
            ]}
          />
          
          <PostsScreenOptions
            show={showScreenOptions}
            setShow={setShowScreenOptions}
            visibleColumns={visibleColumns}
            onColumnToggle={handleColumnToggle}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Title and Add New */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal text-gray-900">Posts</h1>
          <button
            onClick={() => navigate('/editor/posts/new')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Add New
          </button>
        </div>

        {/* Status Tabs */}
        <PostsStatusTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={counts}
        />

        {/* Search and Bulk Actions */}
        <div className="flex justify-between items-center mb-4">
          <PostsBulkActions
            selectedAction={selectedBulkAction}
            setSelectedAction={setSelectedBulkAction}
            onApply={handleApplyBulkAction}
            disabled={!selectedBulkAction || selectedPosts.size === 0}
            isTrashView={activeTab === 'trash'}
          />

          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="글 검색..."
            />
            <button
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              글 검색
            </button>
          </div>
        </div>

        {/* Item count */}
        <div className="text-sm text-gray-600 mb-2">
          {filteredPosts.length} items
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedPosts.size === filteredPosts.length && filteredPosts.length > 0}
                  />
                </th>
                <th className="px-3 py-3 text-left">
                  <button 
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                  >
                    제목
                    {sortField === 'title' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </th>
                {visibleColumns.author && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">글쓴이</th>
                )}
                {visibleColumns.categories && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">카테고리</th>
                )}
                {visibleColumns.tags && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">태그</th>
                )}
                {visibleColumns.comments && (
                  <th className="px-3 py-3 text-center">
                    <MessageSquare className="w-4 h-4 text-gray-700 mx-auto" />
                  </th>
                )}
                {visibleColumns.date && (
                  <th className="px-3 py-3 text-left">
                    <button 
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                    >
                      날짜
                      {sortField === 'date' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((post) => (
                <React.Fragment key={post.id}>
                  {quickEditId === post.id ? (
                    <QuickEditRow
                      data={quickEditData}
                      onChange={setQuickEditData}
                      onSave={handleSaveQuickEdit}
                      onCancel={handleCancelQuickEdit}
                      colSpan={getColumnCount()}
                    />
                  ) : (
                    <PostRow
                      post={post}
                      selected={selectedPosts.has(post.id)}
                      hovered={hoveredRow === post.id}
                      onSelect={() => handleSelectPost(post.id)}
                      onHover={setHoveredRow}
                      onEdit={() => navigate(`/editor/posts/${post.id}`)}
                      onQuickEdit={() => handleQuickEditClick(post.id)}
                      onDelete={() => handleTrash(post.id)}
                      onRestore={() => handleRestore(post.id)}
                      onPermanentDelete={() => handlePermanentDelete(post.id)}
                      onView={() => window.open(`/preview/posts/${post.id}`, '_blank')}
                      visibleColumns={visibleColumns}
                    />
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-4">
          <PostsBulkActions
            selectedAction={selectedBulkAction}
            setSelectedAction={setSelectedBulkAction}
            onApply={handleApplyBulkAction}
            disabled={!selectedBulkAction || selectedPosts.size === 0}
            isTrashView={activeTab === 'trash'}
          />
          
          <div className="text-sm text-gray-600">
            {filteredPosts.length} items
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostsRefactored;