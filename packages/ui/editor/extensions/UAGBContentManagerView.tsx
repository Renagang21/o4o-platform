// UAGB Content Manager View - Spectra 스타일
// Post Creation된 데이터를 관리하는 뷰 컴포넌트

import React, { useState, useEffect, useMemo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBTextControl,
  UAGBSelectControl,
  UAGBToggleControl,
  UAGBColorControl,
  UAGBNumberControl
} from './tiptap-block';
import { 
  Table, Settings, Palette, Layout, Search, Filter, Plus,
  Edit3, Trash2, Eye, MoreHorizontal, CheckSquare, Square,
  Grid, List, Columns, Maximize2, Minimize2, RefreshCw,
  Calendar, User, Tag, MessageCircle, TrendingUp, ExternalLink
} from 'lucide-react';
import { 
  UAGBContentManagerAttributes,
  ContentManagerAction,
  ContentManagerFilter,
  ContentManagerSort,
  getPostsAPI,
  updatePostAPI,
  deletePostAPI
} from './UAGBContentManagerBlock';

interface UAGBContentManagerViewProps {
  node: {
    attrs: UAGBContentManagerAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBContentManagerAttributes>) => void;
  selected: boolean;
}

// Mock Post Data (실제로는 API에서 가져옴)
interface PostItem {
  id: string;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'private' | 'trash';
  author: string;
  date: string;
  modified: string;
  views: number;
  thumbnail?: string;
  excerpt: string;
  fields: Record<string, any>;
}

export const UAGBContentManagerView: React.FC<UAGBContentManagerViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('manager');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data State
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  // UI State
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<ContentManagerFilter>({
    status: 'all',
    postType: node.attrs.defaultPostType,
    author: '',
    dateRange: { start: '', end: '' },
    search: ''
  });
  const [sort, setSort] = useState<ContentManagerSort>({
    field: 'date',
    direction: 'desc'
  });
  
  const attrs = node.attrs;

  // 🚀 실제 API 데이터 로딩
  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const data = await getPostsAPI(
        filters.postType,
        currentPage,
        attrs.itemsPerPage,
        { ...filters, search: searchTerm },
        sort
      );
      
      setPosts(data.items);
      setTotalCount(data.metadata.totalCount);
    } catch (error) {
      console.error('Failed to load posts:', error);
      // Fallback to mock data
      generateMockPosts();
    } finally {
      setIsLoading(false);
    }
  };

  // Mock 데이터 생성 (API 실패 시 사용)
  const generateMockPosts = () => {
    const mockPosts: PostItem[] = [
      {
        id: '1',
        title: 'Getting Started with React TypeScript',
        slug: 'react-typescript-guide',
        status: 'published',
        author: 'John Doe',
        date: '2024-06-20',
        modified: '2024-06-21',
        views: 1250,
        thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=80&h=80&fit=crop',
        excerpt: 'Learn how to set up a modern React project with TypeScript...',
        fields: {}
      },
      {
        id: '2', 
        title: 'Modern CSS Techniques for 2024',
        slug: 'modern-css-2024',
        status: 'draft',
        author: 'Jane Smith',
        date: '2024-06-18',
        modified: '2024-06-19',
        views: 890,
        thumbnail: 'https://images.unsplash.com/photo-1545670723-196ed0954986?w=80&h=80&fit=crop',
        excerpt: 'Discover the latest CSS features including Container Queries...',
        fields: {}
      },
      {
        id: '3',
        title: 'Building Scalable Node.js APIs',
        slug: 'scalable-nodejs-apis',
        status: 'published',
        author: 'Mike Johnson',
        date: '2024-06-15',
        modified: '2024-06-16',
        views: 672,
        excerpt: 'Best practices for creating robust and scalable REST APIs...',
        fields: {}
      }
    ];
    
    setPosts(mockPosts);
    setTotalCount(mockPosts.length);
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadPosts();
  }, [currentPage, filters, sort, searchTerm]);

  // 필터링된 포스트
  const filteredPosts = useMemo(() => {
    let result = posts;
    
    if (filters.status !== 'all') {
      result = result.filter(post => post.status === filters.status);
    }
    
    if (searchTerm) {
      result = result.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return result;
  }, [posts, filters, searchTerm]);

  // 상태별 색상
  const getStatusColor = (status: string) => {
    return attrs.statusColors[status as keyof typeof attrs.statusColors] || '#6b7280';
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([]);
    } else {
      setSelectedPosts(filteredPosts.map(post => post.id));
    }
  };

  // 개별 선택/해제
  const toggleSelectPost = (postId: string) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  // 액션 실행
  const executeAction = async (action: ContentManagerAction, postId?: string) => {
    try {
      switch (action) {
        case 'edit':
          if (postId) {
            alert(`편집 모드: ${postId}`);
            // TODO: 편집 모달 구현
          }
          break;
          
        case 'delete':
          if (postId && confirm('정말로 삭제하시겠습니까?')) {
            await deletePostAPI(postId);
            await loadPosts(); // 목록 새로고침
          }
          break;
          
        case 'publish':
          if (postId) {
            await updatePostAPI(postId, { status: 'published' });
            await loadPosts();
          }
          break;
          
        case 'unpublish':
          if (postId) {
            await updatePostAPI(postId, { status: 'draft' });
            await loadPosts();
          }
          break;
          
        case 'bulk_delete':
          if (selectedPosts.length > 0 && confirm(`선택된 ${selectedPosts.length}개 항목을 삭제하시겠습니까?`)) {
            await Promise.all(selectedPosts.map(id => deletePostAPI(id)));
            setSelectedPosts([]);
            await loadPosts();
          }
          break;
          
        case 'bulk_publish':
          if (selectedPosts.length > 0) {
            await Promise.all(selectedPosts.map(id => updatePostAPI(id, { status: 'published' })));
            setSelectedPosts([]);
            await loadPosts();
          }
          break;
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('작업을 완료할 수 없습니다.');
    }
  };

  // Table View 렌더링
  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
        <thead style={{ backgroundColor: attrs.tableHeaderColor }}>
          <tr>
            {attrs.enableBulkActions && (
              <th className="p-3 text-left">
                <button 
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center w-5 h-5"
                >
                  {selectedPosts.length === filteredPosts.length ? 
                    <CheckSquare size={16} className="text-blue-600" /> : 
                    <Square size={16} className="text-gray-400" />
                  }
                </button>
              </th>
            )}
            
            {attrs.showThumbnails && <th className="p-3 text-left">Image</th>}
            
            {attrs.columns.title && (
              <th className="p-3 text-left cursor-pointer hover:bg-gray-100" 
                  onClick={() => setSort({ field: 'title', direction: sort.direction === 'asc' ? 'desc' : 'asc' })}>
                Title
              </th>
            )}
            
            {attrs.columns.status && <th className="p-3 text-left">Status</th>}
            {attrs.columns.author && <th className="p-3 text-left">Author</th>}
            {attrs.columns.date && <th className="p-3 text-left">Date</th>}
            {attrs.columns.views && <th className="p-3 text-left">Views</th>}
            {attrs.columns.actions && <th className="p-3 text-left">Actions</th>}
          </tr>
        </thead>
        
        <tbody>
          {filteredPosts.map((post, index) => (
            <tr 
              key={post.id}
              className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
              style={{ 
                backgroundColor: selectedPosts.includes(post.id) ? '#eff6ff' : 'transparent'
              }}
            >
              {attrs.enableBulkActions && (
                <td className="p-3">
                  <button 
                    onClick={() => toggleSelectPost(post.id)}
                    className="flex items-center justify-center w-5 h-5"
                  >
                    {selectedPosts.includes(post.id) ? 
                      <CheckSquare size={16} className="text-blue-600" /> : 
                      <Square size={16} className="text-gray-400" />
                    }
                  </button>
                </td>
              )}
              
              {attrs.showThumbnails && (
                <td className="p-3">
                  {post.thumbnail ? (
                    <img 
                      src={post.thumbnail} 
                      alt={post.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                      <FileText size={16} className="text-gray-400" />
                    </div>
                  )}
                </td>
              )}
              
              {attrs.columns.title && (
                <td className="p-3">
                  <div>
                    <div className="font-medium text-gray-900">{post.title}</div>
                    <div className="text-sm text-gray-500 mt-1">{post.excerpt}</div>
                  </div>
                </td>
              )}
              
              {attrs.columns.status && (
                <td className="p-3">
                  <span 
                    className="px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getStatusColor(post.status) }}
                  >
                    {post.status}
                  </span>
                </td>
              )}
              
              {attrs.columns.author && (
                <td className="p-3 text-sm text-gray-600">{post.author}</td>
              )}
              
              {attrs.columns.date && (
                <td className="p-3 text-sm text-gray-600">
                  {new Date(post.date).toLocaleDateString()}
                </td>
              )}
              
              {attrs.columns.views && (
                <td className="p-3 text-sm text-gray-600">{post.views.toLocaleString()}</td>
              )}
              
              {attrs.columns.actions && (
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {attrs.permissions.canEdit && (
                      <button
                        onClick={() => executeAction('edit', post.id)}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    
                    {attrs.permissions.canView && (
                      <button
                        className="p-1 text-green-600 hover:bg-green-100 rounded"
                        title="View"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    
                    {attrs.permissions.canDelete && (
                      <button
                        onClick={() => executeAction('delete', post.id)}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    
                    <button
                      className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      title="More actions"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      
      {filteredPosts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Table size={48} className="mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium mb-2">No posts found</h3>
          <p>Try adjusting your filters or create a new post.</p>
        </div>
      )}
    </div>
  );

  // Pagination
  const totalPages = Math.ceil(totalCount / attrs.itemsPerPage);

  return (
    <NodeViewWrapper>
      <div 
        className={`uagb-content-manager ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}
        style={{
          minHeight: attrs.containerHeight > 0 ? `${attrs.containerHeight}px` : 'auto',
          border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        {/* 헤더 */}
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Table className="w-5 h-5 text-blue-600" />
              {attrs.showTitle && (
                <h2 className="text-lg font-semibold text-gray-900">{attrs.managerTitle}</h2>
              )}
              {isLoading && <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />}
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Type Toggle */}
              <div className="flex items-center bg-white rounded-lg border">
                <button
                  onClick={() => updateAttributes({ viewType: 'table' })}
                  className={`p-2 ${attrs.viewType === 'table' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Table View"
                >
                  <Table size={16} />
                </button>
                <button
                  onClick={() => updateAttributes({ viewType: 'grid' })}
                  className={`p-2 ${attrs.viewType === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Grid View"
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => updateAttributes({ viewType: 'list' })}
                  className={`p-2 ${attrs.viewType === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="List View"
                >
                  <List size={16} />
                </button>
              </div>
              
              {/* Fullscreen Toggle */}
              {attrs.enableFullscreen && (
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              )}
              
              {/* Settings */}
              <button
                onClick={() => setIsEditorOpen(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                title="Settings"
              >
                <Settings size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 검색 */}
            {attrs.enableSearch && (
              <div className="flex items-center gap-2 min-w-64">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            {/* 필터 */}
            {attrs.enableFilters && (
              <>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="private">Private</option>
                  <option value="trash">Trash</option>
                </select>
                
                <select
                  value={filters.postType}
                  onChange={(e) => setFilters({ ...filters, postType: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {attrs.postTypes.map(postType => (
                    <option key={postType} value={postType}>{postType}</option>
                  ))}
                </select>
              </>
            )}
            
            {/* 벌크 액션 */}
            {attrs.enableBulkActions && selectedPosts.length > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600">{selectedPosts.length} selected</span>
                <button
                  onClick={() => executeAction('bulk_publish')}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Publish
                </button>
                <button
                  onClick={() => executeAction('bulk_delete')}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-auto">
          {attrs.viewType === 'table' && renderTableView()}
          
          {/* TODO: Grid, List, Kanban 뷰 구현 */}
          {attrs.viewType !== 'table' && (
            <div className="p-8 text-center text-gray-500">
              <Layout size={48} className="mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">{attrs.viewType.charAt(0).toUpperCase() + attrs.viewType.slice(1)} View</h3>
              <p>Coming soon! Currently showing table view.</p>
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {attrs.showPagination && totalPages > 1 && (
          <div className="bg-gray-50 border-t border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * attrs.itemsPerPage) + 1} to {Math.min(currentPage * attrs.itemsPerPage, totalCount)} of {totalCount} results
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages, currentPage - 2 + i));
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 border rounded text-sm ${
                        currentPage === pageNum 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 설정 모달 */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-4/5 flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Content Manager Settings</h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 설정 탭 */}
            <div className="flex-1 overflow-hidden">
              <UAGBTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                tabs={[
                  {
                    id: 'manager',
                    label: 'Manager Settings',
                    icon: <Table className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-96">
                        <UAGBPanel title="Basic Settings">
                          <UAGBTextControl
                            label="Manager Title"
                            value={attrs.managerTitle}
                            onChange={(managerTitle) => updateAttributes({ managerTitle })}
                          />
                          
                          <UAGBToggleControl
                            label="Show Title"
                            checked={attrs.showTitle}
                            onChange={(showTitle) => updateAttributes({ showTitle })}
                          />
                          
                          <UAGBNumberControl
                            label="Items Per Page"
                            value={attrs.itemsPerPage}
                            min={5}
                            max={100}
                            onChange={(itemsPerPage) => updateAttributes({ itemsPerPage })}
                          />
                        </UAGBPanel>
                        
                        <UAGBPanel title="Display Options">
                          <div className="grid grid-cols-2 gap-4">
                            <UAGBToggleControl
                              label="Enable Search"
                              checked={attrs.enableSearch}
                              onChange={(enableSearch) => updateAttributes({ enableSearch })}
                            />
                            
                            <UAGBToggleControl
                              label="Enable Filters"
                              checked={attrs.enableFilters}
                              onChange={(enableFilters) => updateAttributes({ enableFilters })}
                            />
                            
                            <UAGBToggleControl
                              label="Enable Bulk Actions"
                              checked={attrs.enableBulkActions}
                              onChange={(enableBulkActions) => updateAttributes({ enableBulkActions })}
                            />
                            
                            <UAGBToggleControl
                              label="Show Thumbnails"
                              checked={attrs.showThumbnails}
                              onChange={(showThumbnails) => updateAttributes({ showThumbnails })}
                            />
                          </div>
                        </UAGBPanel>
                      </div>
                    )
                  },
                  
                  {
                    id: 'columns',
                    label: 'Columns',
                    icon: <Columns className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-96">
                        <UAGBPanel title="Table Columns">
                          <div className="grid grid-cols-2 gap-4">
                            <UAGBToggleControl
                              label="Title"
                              checked={attrs.columns.title}
                              onChange={(title) => updateAttributes({ 
                                columns: { ...attrs.columns, title }
                              })}
                            />
                            
                            <UAGBToggleControl
                              label="Status"
                              checked={attrs.columns.status}
                              onChange={(status) => updateAttributes({ 
                                columns: { ...attrs.columns, status }
                              })}
                            />
                            
                            <UAGBToggleControl
                              label="Author"
                              checked={attrs.columns.author}
                              onChange={(author) => updateAttributes({ 
                                columns: { ...attrs.columns, author }
                              })}
                            />
                            
                            <UAGBToggleControl
                              label="Date"
                              checked={attrs.columns.date}
                              onChange={(date) => updateAttributes({ 
                                columns: { ...attrs.columns, date }
                              })}
                            />
                            
                            <UAGBToggleControl
                              label="Views"
                              checked={attrs.columns.views}
                              onChange={(views) => updateAttributes({ 
                                columns: { ...attrs.columns, views }
                              })}
                            />
                            
                            <UAGBToggleControl
                              label="Actions"
                              checked={attrs.columns.actions}
                              onChange={(actions) => updateAttributes({ 
                                columns: { ...attrs.columns, actions }
                              })}
                            />
                          </div>
                        </UAGBPanel>
                      </div>
                    )
                  },
                  
                  {
                    id: 'style',
                    label: 'Styling',
                    icon: <Palette className="w-4 h-4" />,
                    content: (
                      <div className="p-6 space-y-6 overflow-y-auto max-h-96">
                        <UAGBPanel title="Table Colors">
                          <UAGBColorControl
                            label="Header Background"
                            value={attrs.tableHeaderColor}
                            onChange={(tableHeaderColor) => updateAttributes({ tableHeaderColor })}
                          />
                          
                          <UAGBColorControl
                            label="Row Hover Color"
                            value={attrs.tableRowHoverColor}
                            onChange={(tableRowHoverColor) => updateAttributes({ tableRowHoverColor })}
                          />
                        </UAGBPanel>
                        
                        <UAGBPanel title="Status Colors">
                          <UAGBColorControl
                            label="Published"
                            value={attrs.statusColors.published}
                            onChange={(published) => updateAttributes({ 
                              statusColors: { ...attrs.statusColors, published }
                            })}
                          />
                          
                          <UAGBColorControl
                            label="Draft"
                            value={attrs.statusColors.draft}
                            onChange={(draft) => updateAttributes({ 
                              statusColors: { ...attrs.statusColors, draft }
                            })}
                          />
                          
                          <UAGBColorControl
                            label="Private"
                            value={attrs.statusColors.private}
                            onChange={(private: string) => updateAttributes({ 
                              statusColors: { ...attrs.statusColors, private }
                            })}
                          />
                          
                          <UAGBColorControl
                            label="Trash"
                            value={attrs.statusColors.trash}
                            onChange={(trash) => updateAttributes({ 
                              statusColors: { ...attrs.statusColors, trash }
                            })}
                          />
                        </UAGBPanel>
                      </div>
                    )
                  }
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default UAGBContentManagerView;