import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown,
  ChevronUp,
  Settings,
  MessageSquare,
  Calendar,
  User,
  Tag,
  FolderOpen,
  Search
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { postApi } from '@/services/api/postApi';

interface Post {
  id: string;
  title: string;
  slug: string;
  author: string;
  categories: string[];
  tags: string[];
  comments: number;
  date: string;
  status: 'published' | 'draft' | 'pending' | 'trash';
  views: number;
}

type SortField = 'title' | 'date' | null;
type SortOrder = 'asc' | 'desc';

const Posts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Persist activeTab in sessionStorage to maintain state when navigating back
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'trash'>(() => {
    const saved = sessionStorage.getItem('posts-active-tab');
    return (saved as 'all' | 'published' | 'draft' | 'trash') || 'all';
  });
  
  // Fetch posts from API on component mount and when activeTab changes
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        
        // Get API URL from environment or use production URL
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        
        // Build query params based on activeTab
        const params = new URLSearchParams();
        if (activeTab === 'all') {
          // Exclude trash posts for 'all' tab
          params.append('excludeStatus', 'trash');
        } else {
          // Filter by specific status
          params.append('status', activeTab);
        }
        
        const response = await fetch(`${apiUrl}/api/posts?${params}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        
        if (!response.ok) {
          // If API fails, fall back to mock data temporarily
          if (response.status === 401) {
            setError('Authentication required. Please login.');
          } else if (response.status === 500 || response.status === 503) {
            // Use mock data if server has issues
            setPosts([
              { 
                id: 'ec6ee714-552b-44da-8666-57d249292dc2', 
                title: 'Welcome to Our New Platform',
                slug: 'welcome-new-platform',
                author: 'Admin',
                categories: ['공지사항'],
                tags: ['featured', 'news'],
                comments: 5,
                date: '2024-01-20',
                status: 'published',
                views: 234
              },
              { 
                id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 
                title: 'Getting Started Guide',
                slug: 'getting-started-guide',
                author: 'Editor',
                categories: ['튜토리얼'],
                tags: ['tutorial', 'guide'],
                comments: 12,
                date: '2024-01-18',
                status: 'published',
                views: 456
              },
              { 
                id: 'b2c3d4e5-f678-90ab-cdef-123456789012', 
                title: 'Draft: Upcoming Features',
                slug: 'draft-upcoming-features',
                author: 'Admin',
                categories: ['이벤트'],
                tags: ['draft'],
                comments: 0,
                date: '2024-01-22',
                status: 'draft',
                views: 0
              }
            ]);
            setError('Server temporarily unavailable. Showing sample data.');
          } else {
            throw new Error(`Failed to fetch posts: ${response.status}`);
          }
          return;
        }
        
        const data = await response.json();
        
        // Transform API response to match our Post interface
        // API returns data.data array, not data.posts
        const postsArray = data.data || data.posts || [];
        const transformedPosts = postsArray.map((post: any) => ({
          id: post.id, // Use UUID from server
          title: post.title || 'Untitled',
          slug: post.slug || '',
          author: post.author?.name || post.author?.email || 'Unknown',
          categories: post.categories?.map((cat: any) => typeof cat === 'string' ? cat : cat.name) || [],
          tags: post.tags?.map((tag: any) => typeof tag === 'string' ? tag : tag.name) || [],
          comments: post.commentCount || 0,
          date: post.publishedAt ? new Date(post.publishedAt).toISOString().split('T')[0] : new Date(post.createdAt).toISOString().split('T')[0],
          status: post.status || 'draft',
          views: post.views || 0
        }));
        
        setPosts(transformedPosts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load posts');
        // Fall back to mock data with UUIDs
        setPosts([
          { 
            id: 'ec6ee714-552b-44da-8666-57d249292dc2', 
            title: 'Welcome to Our New Platform',
            slug: 'welcome-new-platform',
            author: 'Admin',
            categories: ['공지사항'],
            tags: ['featured', 'news'],
            comments: 5,
            date: '2024-01-20',
            status: 'published',
            views: 234
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPosts();
  }, [activeTab]); // Refetch when activeTab changes
  
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Save activeTab to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('posts-active-tab', activeTab);
  }, [activeTab]);
  
  // Clean up hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState({
    title: '',
    slug: '',
    status: 'published' as Post['status'],
    author: '',
    date: ''
  });
  
  // Screen Options state - load from localStorage
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
  
  // Save visible columns to localStorage when they change
  useEffect(() => {
    localStorage.setItem('posts-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  
  const handleColumnToggle = (column: string) => {
    setVisibleColumns((prev: any) => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedPosts(new Set(getFilteredPosts().map(p => p.id)));
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

  const handleAddNew = () => {
    navigate('/editor/posts/new');
  };

  const handleEdit = (id: string) => {
    // Navigate to Gutenberg editor with post ID
    navigate(`/editor/posts/${id}`);
  };

  const handleQuickEdit = (id: string) => {
    const post = posts.find(p => p.id === id);
    if (post) {
      setQuickEditId(id);
      setQuickEditData({
        title: post.title,
        slug: post.slug,
        status: post.status,
        author: post.author,
        date: post.date
      });
    }
  };

  const handleSaveQuickEdit = () => {
    if (quickEditId) {
      setPosts(posts.map(post => 
        post.id === quickEditId
          ? {
              ...post,
              title: quickEditData.title,
              slug: quickEditData.slug,
              status: quickEditData.status,
              author: quickEditData.author,
              date: quickEditData.date
            }
          : post
      ));
      setQuickEditId(null);
    }
  };

  const handleCancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditData({
      title: '',
      slug: '',
      status: 'published',
      author: '',
      date: ''
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 이 글을 휴지통으로 이동하시겠습니까?')) {
      try {
        const response = await postApi.update({
          id,
          status: 'trash'
        });
        
        if (response.success) {
          setPosts(prevPosts => prevPosts.map(p => 
            p.id === id ? { ...p, status: 'trash' as const } : p
          ));
        } else {
          alert('휴지통으로 이동하는데 실패했습니다.');
        }
      } catch (error) {
        alert('휴지통으로 이동 중 오류가 발생했습니다.');
      }
    }
  };
  
  const handlePermanentDelete = async (id: string) => {
    if (confirm('이 글을 영구적으로 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
      try {
        const response = await postApi.delete(id, true);
        
        if (response.success) {
          // Remove from local state
          setPosts(prevPosts => prevPosts.filter(p => p.id !== id));
          // Also remove from sessionStorage to prevent stale data
          sessionStorage.removeItem('posts-data');
        } else {
          alert('삭제에 실패했습니다.');
        }
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleRestore = async (id: string) => {
    if (confirm('이 글을 복원하시겠습니까?')) {
      try {
        const response = await postApi.update({
          id,
          status: 'draft'
        });
        
        if (response.success) {
          setPosts(prevPosts => prevPosts.map(p => 
            p.id === id ? { ...p, status: 'draft' as const } : p
          ));
        } else {
          alert('복원에 실패했습니다.');
        }
      } catch (error) {
        alert('복원 중 오류가 발생했습니다.');
      }
    }
  };

  const handleView = (id: string) => {
    // Open preview in new tab
    window.open(`/preview/posts/${id}`, '_blank');
  };

  const handleApplyBulkAction = async () => {
    if (!selectedBulkAction) {
      alert('Please select an action.');
      return;
    }
    
    if (selectedPosts.size === 0) {
      alert('No posts selected.');
      return;
    }
    
    if (selectedBulkAction === 'trash') {
      if (confirm(`선택한 ${selectedPosts.size}개의 글을 휴지통으로 이동하시겠습니까?`)) {
        try {
          // Process each selected post
          const promises = Array.from(selectedPosts).map(id => 
            postApi.update({
              id,
              status: 'trash'
            })
          );
          
          const results = await Promise.all(promises);
          const allSuccessful = results.every(r => r.success);
          
          if (allSuccessful) {
            setPosts(prevPosts => prevPosts.map(p => 
              selectedPosts.has(p.id) ? { ...p, status: 'trash' as const } : p
            ));
            setSelectedPosts(new Set());
            setSelectedBulkAction('');
          } else {
            alert('일부 글을 휴지통으로 이동하는데 실패했습니다.');
          }
        } catch (error) {
          alert('휴지통으로 이동 중 오류가 발생했습니다.');
        }
      }
    } else if (selectedBulkAction === 'edit') {
      // Bulk edit functionality
      alert('Bulk edit feature coming soon');
    }
  };

  const handleSearch = () => {
    // Implement search
    // Search functionality is handled in getFilteredPosts()
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getFilteredPosts = () => {
    let filtered = posts;
    
    // Filter by tab
    if (activeTab === 'published') {
      filtered = filtered.filter(p => p.status === 'published');
    } else if (activeTab === 'draft') {
      filtered = filtered.filter(p => p.status === 'draft');
    } else if (activeTab === 'trash') {
      filtered = filtered.filter(p => p.status === 'trash');
    } else if (activeTab === 'all') {
      // 'all' tab should exclude trash
      filtered = filtered.filter(p => p.status !== 'trash');
    }
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        if (sortField === 'title') {
          return sortOrder === 'asc' 
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        } else if (sortField === 'date') {
          return sortOrder === 'asc'
            ? new Date(a.date).getTime() - new Date(b.date).getTime()
            : new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      });
    } else {
      // Default sort by date desc
      filtered = [...filtered].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }
    
    return filtered;
  };

  const getStatusCounts = () => {
    const all = posts.length;  // 휴지통 포함 전체 개수
    const published = posts.filter(p => p.status === 'published').length;
    const draft = posts.filter(p => p.status === 'draft').length;
    const trash = posts.filter(p => p.status === 'trash').length;
    return { all, published, draft, trash };
  };

  const counts = getStatusCounts();
  const filteredPosts = getFilteredPosts();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="text-gray-600">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
      {/* Show error message if any */}
      {error && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mx-8 mt-4">
          <p className="text-sm text-yellow-700">{error}</p>
        </div>
      )}
      
      {/* Header with Breadcrumb and Screen Options */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb 
            items={[
              { label: 'Admin', href: '/admin' },
              { label: '글', href: '/admin/posts' },
              { label: '모든 글' }
            ]}
          />
          
          {/* Screen Options Button */}
          <div className="relative">
            <button
              onClick={() => setShowScreenOptions(!showScreenOptions)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
              Screen Options
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showScreenOptions && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                <div className="p-4">
                  <h3 className="font-medium text-sm mb-3">Columns</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.author}
                        onChange={() => handleColumnToggle('author')}
                        className="mr-2" 
                      />
                      글쓴이
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.categories}
                        onChange={() => handleColumnToggle('categories')}
                        className="mr-2" 
                      />
                      카테고리
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.tags}
                        onChange={() => handleColumnToggle('tags')}
                        className="mr-2" 
                      />
                      태그
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.comments}
                        onChange={() => handleColumnToggle('comments')}
                        className="mr-2" 
                      />
                      댓글
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.date}
                        onChange={() => handleColumnToggle('date')}
                        className="mr-2" 
                      />
                      날짜
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.status}
                        onChange={() => handleColumnToggle('status')}
                        className="mr-2" 
                      />
                      상태
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Title and Add New */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal text-gray-900">Posts</h1>
          <button
            onClick={handleAddNew}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Add New
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`text-sm ${activeTab === 'all' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            모든 ({counts.all})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('published')}
            className={`text-sm ${activeTab === 'published' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            발행됨 ({counts.published})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('draft')}
            className={`text-sm ${activeTab === 'draft' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            임시글 ({counts.draft})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('trash')}
            className={`text-sm ${activeTab === 'trash' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            휴지통 ({counts.trash || 0})
          </button>
        </div>

        {/* Search Box */}
        <div className="flex justify-between items-center mb-4">
          {/* Bulk Actions Bar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {selectedBulkAction === 'trash' ? 'Move to Trash' : selectedBulkAction === 'edit' ? 'Edit' : 'Bulk Actions'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('edit');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('trash');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Move to Trash
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedPosts.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedPosts.size === 0}
            >
              Apply
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="글 검색..."
            />
            <button
              onClick={handleSearch}
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
                    // Quick Edit Row
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <td colSpan={100} className="p-4">
                        <div className="bg-white border border-gray-300 rounded p-4">
                          <h3 className="font-medium text-sm mb-3">Quick Edit</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                              <input
                                type="text"
                                value={quickEditData.title}
                                onChange={(e) => setQuickEditData({...quickEditData, title: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                              <input
                                type="text"
                                value={quickEditData.slug}
                                onChange={(e) => setQuickEditData({...quickEditData, slug: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                              <input
                                type="text"
                                value={quickEditData.author}
                                onChange={(e) => setQuickEditData({...quickEditData, author: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                              <input
                                type="date"
                                value={quickEditData.date}
                                onChange={(e) => setQuickEditData({...quickEditData, date: e.target.value})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                              <select
                                value={quickEditData.status}
                                onChange={(e) => setQuickEditData({...quickEditData, status: e.target.value as Post['status']})}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                                <option value="pending">Pending Review</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={handleSaveQuickEdit}
                              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Update
                            </button>
                            <button
                              onClick={handleCancelQuickEdit}
                              className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    // Normal Row
                    <tr
                      className="border-b border-gray-100 hover:bg-gray-50"
                      onMouseEnter={() => {
                        // Clear any existing timeout
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                        }
                        // Set new timeout to show menu after 300ms
                        hoverTimeoutRef.current = setTimeout(() => {
                          setHoveredRow(post.id);
                        }, 300);
                      }}
                      onMouseLeave={() => {
                        // Clear timeout if mouse leaves before menu shows
                        if (hoverTimeoutRef.current) {
                          clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = null;
                        }
                        setHoveredRow(null);
                      }}
                    >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedPosts.has(post.id)}
                      onChange={() => handleSelectPost(post.id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div>
                      <button 
                        onClick={() => handleEdit(post.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm text-left"
                      >
                        {post.title}
                        {post.status === 'draft' && <span className="ml-2 text-gray-500">— 임시글</span>}
                      </button>
                      {hoveredRow === post.id && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {post.status === 'trash' ? (
                            // Trash actions
                            <>
                              <button
                                onClick={() => handleRestore(post.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Restore
                              </button>
                              <span className="text-gray-400">|</span>
                              <button
                                onClick={() => handlePermanentDelete(post.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Delete Permanently
                              </button>
                            </>
                          ) : (
                            // Normal actions
                            <>
                              <button
                                onClick={() => handleEdit(post.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Edit
                              </button>
                              <span className="text-gray-400">|</span>
                              <button
                                onClick={() => handleQuickEdit(post.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                Quick Edit
                              </button>
                              <span className="text-gray-400">|</span>
                              <button
                                onClick={() => handleDelete(post.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Trash
                              </button>
                              <span className="text-gray-400">|</span>
                              <button
                                onClick={() => handleView(post.id)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                View
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  {visibleColumns.author && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {post.author}
                    </td>
                  )}
                  {visibleColumns.categories && (
                    <td className="px-3 py-3 text-sm">
                      {post.categories.map((cat, idx) => (
                        <span key={idx}>
                          <a href="#" className="text-blue-600 hover:text-blue-800">{cat}</a>
                          {idx < post.categories.length - 1 && ', '}
                        </span>
                      ))}
                      {post.categories.length === 0 && '—'}
                    </td>
                  )}
                  {visibleColumns.tags && (
                    <td className="px-3 py-3 text-sm">
                      {post.tags.map((tag, idx) => (
                        <span key={idx}>
                          <a href="#" className="text-blue-600 hover:text-blue-800">{tag}</a>
                          {idx < post.tags.length - 1 && ', '}
                        </span>
                      ))}
                      {post.tags.length === 0 && '—'}
                    </td>
                  )}
                  {visibleColumns.comments && (
                    <td className="px-3 py-3 text-sm text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                        {post.comments}
                      </div>
                    </td>
                  )}
                  {visibleColumns.date && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      <div>발행됨</div>
                      <div>{post.date}</div>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-3 py-3 text-sm">
                      {post.status === 'published' && (
                        <span className="text-green-600">발행됨</span>
                      )}
                      {post.status === 'draft' && (
                        <span className="text-orange-600">임시글</span>
                      )}
                      {post.status === 'pending' && (
                        <span className="text-yellow-600">대기중</span>
                      )}
                      {post.status === 'trash' && (
                        <span className="text-red-600">휴지통</span>
                      )}
                    </td>
                  )}
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {selectedBulkAction === 'trash' ? 'Move to Trash' : selectedBulkAction === 'edit' ? 'Edit' : 'Bulk Actions'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 bottom-full mb-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('edit');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setSelectedBulkAction('trash');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Move to Trash
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedPosts.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedPosts.size === 0}
            >
              Apply
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredPosts.length} items
          </div>
        </div>
      </div>
    </div>
  );
};

export default Posts;