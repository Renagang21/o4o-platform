import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronDown,
  ChevronUp,
  Settings,
  MessageSquare,
  Calendar,
  Search
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import toast from 'react-hot-toast';

interface Page {
  id: string;
  title: string;
  slug: string;
  author: string;
  template: string;
  comments: number;
  date: string;
  status: 'published' | 'draft' | 'pending' | 'trash';
  views: number;
}

type SortField = 'title' | 'date' | null;
type SortOrder = 'asc' | 'desc';

const PageList = () => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Persist activeTab in sessionStorage
  const [activeTab, setActiveTab] = useState<'all' | 'published' | 'draft' | 'trash'>(() => {
    const saved = sessionStorage.getItem('pages-active-tab');
    return (saved as 'all' | 'published' | 'draft' | 'trash') || 'all';
  });
  
  // Fetch pages from API
  useEffect(() => {
    const fetchPages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        
        const params = new URLSearchParams();
        params.append('type', 'page');
        params.append('per_page', '1000');
        
        const response = await fetch(`${apiUrl}/api/pages?${params}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            setError('Authentication required. Please login.');
            window.location.href = '/login';
          } else {
            setError(`Failed to fetch pages: ${response.status}`);
          }
          setPages([]);
          return;
        }
        
        const data = await response.json();
        
        const pagesArray = data.data || data.posts || [];
        const transformedPages = pagesArray.map((page: any) => {
          let date = new Date().toISOString().split('T')[0];
          try {
            if (page.publishedAt) {
              date = new Date(page.publishedAt).toISOString().split('T')[0];
            } else if (page.createdAt) {
              date = new Date(page.createdAt).toISOString().split('T')[0];
            }
          } catch (err) {
            console.warn('Failed to parse date for page:', page.id, err);
          }
          
          return {
            id: page.id || page._id,
            title: page.title || 'Untitled',
            slug: page.slug || '',
            author: page.author?.name || page.authorName || 'Unknown',
            template: page.template || 'Default Template',
            comments: page.commentCount || 0,
            date: date,
            status: page.status || 'draft',
            views: page.views || 0
          };
        });
        
        setPages(transformedPages);
        sessionStorage.setItem('pages-data', JSON.stringify(transformedPages));
        setError(null);
      } catch (error) {
        console.error('Failed to fetch pages:', error);
        setError('Failed to load pages. Please try again.');
        setPages([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPages();
  }, []);
  
  // Save activeTab to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('pages-active-tab', activeTab);
  }, [activeTab]);
  
  // Filtering and sorting states
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Columns visibility
  const [visibleColumns, setVisibleColumns] = useState({
    author: true,
    template: true,
    comments: true,
    date: true,
    status: true
  });
  
  // Quick edit state
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState({
    title: '',
    slug: '',
    status: 'published' as 'published' | 'draft'
  });
  
  // Row actions hover state
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  const handleColumnToggle = (column: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };
  
  const counts = {
    all: pages.length,
    published: pages.filter(p => p.status === 'published').length,
    draft: pages.filter(p => p.status === 'draft').length,
    trash: pages.filter(p => p.status === 'trash').length
  };
  
  const handleAddNew = () => {
    navigate('/editor/pages/new');
  };
  
  const handleEdit = (id: string) => {
    navigate(`/editor/pages/${id}`);
  };
  
  const handleQuickEdit = (page: Page) => {
    setQuickEditId(page.id);
    setQuickEditData({
      title: page.title,
      slug: page.slug,
      status: page.status as 'published' | 'draft'
    });
  };
  
  const handleSaveQuickEdit = async () => {
    if (quickEditId) {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        
        const response = await fetch(`${apiUrl}/api/pages/${quickEditId}`, {
          method: 'PUT',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(quickEditData)
        });
        
        if (response.ok) {
          setPages(prevPages => prevPages.map(p => 
            p.id === quickEditId 
              ? { ...p, ...quickEditData }
              : p
          ));
          setQuickEditId(null);
          toast.success('Page updated successfully');
        } else {
          toast.error('Failed to update page');
        }
      } catch (error) {
        console.error('Quick edit error:', error);
        toast.error('Failed to update page');
      }
    }
  };
  
  const handleCancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditData({
      title: '',
      slug: '',
      status: 'published'
    });
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('정말 이 페이지를 휴지통으로 이동하시겠습니까?')) {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        
        const response = await fetch(`${apiUrl}/api/pages/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'trash' })
        });
        
        if (response.ok) {
          setPages(prevPages => prevPages.map(p => 
            p.id === id ? { ...p, status: 'trash' as const } : p
          ));
          toast.success('Page moved to trash');
        } else {
          toast.error('Failed to delete page');
        }
      } catch (error) {
        toast.error('Failed to delete page');
      }
    }
  };
  
  const handlePermanentDelete = async (id: string) => {
    if (confirm('이 페이지를 영구적으로 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        
        const response = await fetch(`${apiUrl}/api/pages/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          }
        });
        
        if (response.ok) {
          setPages(prevPages => prevPages.filter(p => p.id !== id));
          sessionStorage.removeItem('pages-data');
          toast.success('Page deleted permanently');
        } else {
          toast.error('Failed to delete page');
        }
      } catch (error) {
        toast.error('Failed to delete page');
      }
    }
  };
  
  const handleRestore = async (id: string) => {
    if (confirm('이 페이지를 복원하시겠습니까?')) {
      try {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
        
        const response = await fetch(`${apiUrl}/api/pages/${id}`, {
          method: 'PUT',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: 'draft' })
        });
        
        if (response.ok) {
          setPages(prevPages => prevPages.map(p => 
            p.id === id ? { ...p, status: 'draft' as const } : p
          ));
          toast.success('Page restored');
        } else {
          toast.error('Failed to restore page');
        }
      } catch (error) {
        toast.error('Failed to restore page');
      }
    }
  };
  
  const handleView = (id: string) => {
    window.open(`/preview/pages/${id}`, '_blank');
  };
  
  const handleApplyBulkAction = async () => {
    if (!selectedBulkAction) {
      alert('Please select an action.');
      return;
    }
    
    if (selectedPages.size === 0) {
      alert('No pages selected.');
      return;
    }
    
    if (selectedBulkAction === 'trash') {
      if (confirm(`선택한 ${selectedPages.size}개의 페이지를 휴지통으로 이동하시겠습니까?`)) {
        try {
          const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
          const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';
          
          const promises = Array.from(selectedPages).map(id => 
            fetch(`${apiUrl}/api/pages/${id}`, {
              method: 'PUT',
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ status: 'trash' })
            })
          );
          
          const results = await Promise.all(promises);
          const allSuccessful = results.every(r => r.ok);
          
          if (allSuccessful) {
            setPages(prevPages => prevPages.map(p => 
              selectedPages.has(p.id) ? { ...p, status: 'trash' as const } : p
            ));
            setSelectedPages(new Set());
            setSelectedBulkAction('');
            toast.success('Pages moved to trash');
          } else {
            toast.error('Some pages failed to move to trash');
          }
        } catch (error) {
          toast.error('Failed to move pages to trash');
        }
      }
    }
  };
  
  const handleSearch = () => {
    // Search functionality is handled in getFilteredPages()
  };
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  const getFilteredPages = () => {
    let filtered = pages;
    
    // Filter by tab
    if (activeTab === 'published') {
      filtered = filtered.filter(p => p.status === 'published');
    } else if (activeTab === 'draft') {
      filtered = filtered.filter(p => p.status === 'draft');
    } else if (activeTab === 'trash') {
      filtered = filtered.filter(p => p.status === 'trash');
    }
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  };
  
  const filteredPages = getFilteredPages();
  
  const handleRowHover = (id: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    if (id) {
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredRow(id);
      }, 100);
    } else {
      setHoveredRow(null);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="text-gray-600">Loading pages...</div>
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
              { label: 'Admin' },
              { label: '페이지' },
              { label: '모든 페이지' }
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
                      작성자
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.template}
                        onChange={() => handleColumnToggle('template')}
                        className="mr-2" 
                      />
                      템플릿
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
                  
                  {/* Pagination Settings */}
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <h3 className="font-medium text-sm mb-3">Pagination</h3>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">페이징 항목 수:</label>
                      <input
                        type="number"
                        value={itemsPerPage}
                        onChange={(e) => setItemsPerPage(Number(e.target.value))}
                        min="1"
                        max="999"
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setShowScreenOptions(false)}
                        className="ml-auto px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        적용
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">1-999 사이의 숫자를 입력하세요</p>
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
          <h1 className="text-2xl font-normal text-gray-900">Pages</h1>
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

        {/* Bulk Actions and Search */}
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
                selectedBulkAction && selectedPages.size > 0 
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              Apply
            </button>
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages..."
                className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 pr-8"
              />
              <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <button 
              onClick={handleSearch}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Search Pages
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-white border-b border-gray-200">
                <th className="w-10 px-3 py-2">
                  <input 
                    type="checkbox"
                    checked={selectedPages.size > 0 && selectedPages.size === filteredPages.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPages(new Set(filteredPages.map(p => p.id)));
                      } else {
                        setSelectedPages(new Set());
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left px-3 py-2">
                  <button
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                  >
                    제목
                    {sortField === 'title' && (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </th>
                {visibleColumns.author && (
                  <th className="text-left px-3 py-2 text-sm font-medium text-gray-900">작성자</th>
                )}
                {visibleColumns.template && (
                  <th className="text-left px-3 py-2 text-sm font-medium text-gray-900">템플릿</th>
                )}
                {visibleColumns.comments && (
                  <th className="text-center px-3 py-2">
                    <MessageSquare className="w-4 h-4 text-gray-600 mx-auto" />
                  </th>
                )}
                {visibleColumns.date && (
                  <th className="text-left px-3 py-2">
                    <button
                      onClick={() => handleSort('date')}
                      className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-blue-600"
                    >
                      날짜
                      {sortField === 'date' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-3 py-2 text-sm font-medium text-gray-900">상태</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No pages found.
                  </td>
                </tr>
              ) : (
                filteredPages.slice(0, itemsPerPage).map((page) => (
                  <React.Fragment key={page.id}>
                    {quickEditId === page.id ? (
                      <tr className="bg-gray-50">
                        <td className="px-3 py-3" colSpan={7}>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <input
                                type="text"
                                value={quickEditData.title}
                                onChange={(e) => setQuickEditData({ ...quickEditData, title: e.target.value })}
                                placeholder="Title"
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                              />
                              <input
                                type="text"
                                value={quickEditData.slug}
                                onChange={(e) => setQuickEditData({ ...quickEditData, slug: e.target.value })}
                                placeholder="Slug"
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <select
                              value={quickEditData.status}
                              onChange={(e) => setQuickEditData({ ...quickEditData, status: e.target.value as 'published' | 'draft' })}
                              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="published">Published</option>
                              <option value="draft">Draft</option>
                            </select>
                            <button
                              onClick={handleSaveQuickEdit}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Update
                            </button>
                            <button
                              onClick={handleCancelQuickEdit}
                              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr 
                        className="border-b border-gray-100 hover:bg-gray-50"
                        onMouseEnter={() => handleRowHover(page.id)}
                        onMouseLeave={() => handleRowHover(null)}
                      >
                        <td className="px-3 py-3">
                          <input 
                            type="checkbox"
                            checked={selectedPages.has(page.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedPages);
                              if (e.target.checked) {
                                newSelected.add(page.id);
                              } else {
                                newSelected.delete(page.id);
                              }
                              setSelectedPages(newSelected);
                            }}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div>
                            <a 
                              href={`/editor/pages/${page.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600"
                              onClick={(e) => {
                                e.preventDefault();
                                handleEdit(page.id);
                              }}
                            >
                              {page.title}
                            </a>
                            {page.status === 'draft' && (
                              <span className="ml-2 text-xs text-gray-500">— Draft</span>
                            )}
                            {/* Row Actions */}
                            {hoveredRow === page.id && (
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                {activeTab !== 'trash' ? (
                                  <>
                                    <button 
                                      onClick={() => handleEdit(page.id)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      Edit
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button 
                                      onClick={() => handleQuickEdit(page)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      Quick Edit
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button 
                                      onClick={() => handleDelete(page.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      Trash
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button 
                                      onClick={() => handleView(page.id)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      View
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleRestore(page.id)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      Restore
                                    </button>
                                    <span className="text-gray-400">|</span>
                                    <button 
                                      onClick={() => handlePermanentDelete(page.id)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      Delete Permanently
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        {visibleColumns.author && (
                          <td className="px-3 py-3 text-sm text-gray-600">{page.author}</td>
                        )}
                        {visibleColumns.template && (
                          <td className="px-3 py-3 text-sm text-gray-600">{page.template}</td>
                        )}
                        {visibleColumns.comments && (
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center">
                              <MessageSquare className="w-3 h-3 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-600">{page.comments}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.date && (
                          <td className="px-3 py-3 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              {page.date}
                            </div>
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              page.status === 'published' 
                                ? 'bg-green-100 text-green-800' 
                                : page.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : page.status === 'trash'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {page.status === 'published' ? 'Published' : 
                               page.status === 'draft' ? 'Draft' :
                               page.status === 'trash' ? 'Trash' : page.status}
                            </span>
                          </td>
                        )}
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination info */}
        <div className="mt-4 text-sm text-gray-600">
          {filteredPages.length} items
        </div>
      </div>
    </div>
  );
};

export default PageList;