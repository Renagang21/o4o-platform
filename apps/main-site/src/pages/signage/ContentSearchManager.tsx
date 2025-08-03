import { FC, FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Upload, Calendar, Tag, Clock, 
  ChevronLeft, ChevronRight, Grid, List, SortAsc,
  Youtube, Video, Eye, Edit, Trash2, CheckCircle,
  XCircle, AlertCircle, Download, Share2
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import axios from '../../api/client';

interface VideoContent {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail: string;
  duration: number;
  platform: 'youtube' | 'vimeo';
  status: 'pending' | 'approved' | 'rejected' | 'inactive';
  tags: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName?: string;
}

interface SearchOptions {
  query?: string;
  contentType?: 'youtube' | 'vimeo';
  status?: 'pending' | 'approved' | 'rejected' | 'inactive';
  tags?: string[];
  sortBy?: 'latest' | 'popular' | 'duration' | 'name';
  dateRange?: {
    start?: string;
    end?: string;
  };
  page: number;
  limit: number;
}

interface SearchResult {
  content: VideoContent[];
  totalCount: number;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ContentSearchManager: FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // State
  const [searchOptions, setSearchOptions] = useState({
    page: 1,
    limit: 20,
    sortBy: 'latest'
  });
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Set<string>>(new Set());

  // Popular tags (in real app, fetch from API)
  const popularTags = [
    'promotion', 'sale', 'new-product', 'announcement', 
    'holiday', 'event', 'tutorial', 'brand'
  ];

  // Search content
  const searchContent = useCallback(async () => {
    setLoading(true);
    try {
      // Convert to API format
      const searchPayload = {
        ...searchOptions,
        tags: selectedTags.length > 0 ? selectedTags : undefined
      };

      const response = await axios.post('/api/signage/contents/search', searchPayload);
      setSearchResult(response.data.data);
    } catch (error) {
      showToast('Search failed', 'error');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchOptions, selectedTags, showToast]);

  // Initial search
  useEffect(() => {
    searchContent();
  }, [searchContent]);

  // Handle search input
  const handleSearchInput = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchOptions(prev => ({ ...prev, page: 1 }));
    searchContent();
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setSearchOptions(prev => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle content selection
  const toggleContentSelection = (contentId: string) => {
    const newSelection = new Set(selectedContent);
    if (newSelection.has(contentId)) {
      newSelection.delete(contentId);
    } else {
      newSelection.add(contentId);
    }
    setSelectedContent(newSelection);
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedContent.size === 0) return;
    
    if (!confirm(`Delete ${selectedContent.size} content items?`)) return;
    
    try {
      // In real app, implement bulk delete API
      for (const contentId of selectedContent) {
        await axios.delete(`/api/signage/contents/${contentId}`);
      }
      showToast(`Deleted ${selectedContent.size} items`, 'success');
      setSelectedContent(new Set());
      searchContent();
    } catch (error) {
      showToast('Failed to delete content', 'error');
    }
  };

  // Delete single content
  const handleDelete = async (contentId: string) => {
    if (!confirm('Delete this content?')) return;
    
    try {
      await axios.delete(`/api/signage/contents/${contentId}`);
      showToast('Content deleted', 'success');
      searchContent();
    } catch (error) {
      showToast('Failed to delete content', 'error');
    }
  };

  // Status badge
  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    
    const icons = {
      pending: AlertCircle,
      approved: CheckCircle,
      rejected: XCircle,
      inactive: AlertCircle
    };
    
    const Icon = icons[status as keyof typeof icons] || AlertCircle;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.inactive}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  // Content type icon
  const getContentIcon = (type: string) => {
    return type === 'youtube' ? Youtube : Video;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Content Search & Management</h1>
            
            <div className="flex items-center gap-3">
              {selectedContent.size > 0 && (
                <>
                  <span className="text-sm text-gray-600">
                    {selectedContent.size} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Selected
                  </button>
                  <button
                    onClick={() => setSelectedContent(new Set())}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Clear Selection
                  </button>
                </>
              )}
              
              <Link
                to="/signage/content/upload"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Content
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search Bar */}
        <form onSubmit={handleSearchInput} className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by title, description, or tags..."
                value={searchOptions.query || ''}
                onChange={(e: any) => setSearchOptions(prev => ({ ...prev, query: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
            
            <button
              type="submit"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t space-y-4">
              {/* Content Type & Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                  <select
                    value={searchOptions.contentType || ''}
                    onChange={(e: any) => setSearchOptions(prev => ({ 
                      ...prev, 
                      contentType: e.target.value as 'youtube' | 'vimeo' | undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={searchOptions.status || ''}
                    onChange={(e: any) => setSearchOptions(prev => ({ 
                      ...prev, 
                      status: e.target.value as 'pending' | 'approved' | 'rejected' | 'inactive' | undefined 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={searchOptions.sortBy || 'latest'}
                    onChange={(e: any) => setSearchOptions(prev => ({ 
                      ...prev, 
                      sortBy: e.target.value as 'latest' | 'popular' | 'duration' | 'name' 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="latest">Latest</option>
                    <option value="popular">Most Popular</option>
                    <option value="duration">Duration</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={searchOptions.dateRange?.start || ''}
                    onChange={(e: any) => setSearchOptions(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, start: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={searchOptions.dateRange?.end || ''}
                    onChange={(e: any) => setSearchOptions(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, end: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {popularTags.map((tag: any) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (selectedTags.includes(tag)) {
                          setSelectedTags(selectedTags.filter(t => t !== tag));
                        } else {
                          setSelectedTags([...selectedTags, tag]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Tag className="inline w-3 h-3 mr-1" />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {searchResult && (
              <p className="text-gray-600">
                Found <span className="font-semibold text-gray-900">{searchResult.totalCount}</span> results
                {searchOptions.query && (
                  <span> for "<span className="font-medium">{searchOptions.query}</span>"</span>
                )}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        )}

        {/* Results */}
        {!loading && searchResult && (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResult.content.map((content: any) => {
                  const ContentIcon = getContentIcon(content.type);
                  
                  return (
                    <div key={content.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                      {/* Thumbnail */}
                      <div className="relative aspect-video">
                        {content.thumbnailUrl ? (
                          <img
                            src={content.thumbnailUrl}
                            alt={content.title}
                            className="w-full h-full object-cover rounded-t-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/api/placeholder/400/225';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-t-lg">
                            <ContentIcon className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        
                        {/* Selection Checkbox */}
                        <div className="absolute top-2 left-2">
                          <input
                            type="checkbox"
                            checked={selectedContent.has(content.id)}
                            onChange={() => toggleContentSelection(content.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </div>
                        
                        {/* Status Badge */}
                        <div className="absolute top-2 right-2">
                          {getStatusBadge(content.status)}
                        </div>
                        
                        {/* Duration */}
                        {content.duration && (
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                            {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
                          </div>
                        )}
                      </div>
                      
                      {/* Content Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 truncate">{content.title}</h3>
                        {content.description && (
                          <p className="text-sm text-gray-600 truncate mt-1">{content.description}</p>
                        )}
                        
                        {/* Tags */}
                        {content.tags && content.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {content.tags.slice(0, 3).map((tag: string) => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                            {content.tags.length > 3 && (
                              <span className="text-xs text-gray-500">+{content.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                        
                        {/* Meta Info */}
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                          <span>{content.creator?.username || 'Unknown'}</span>
                          <span>{new Date(content.createdAt).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2 mt-3">
                          <Link
                            to={`/signage/content/${content.id}`}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                          
                          {(user?.role === 'admin' || content.createdBy === user?.id) && (
                            <>
                              <Link
                                to={`/signage/content/edit/${content.id}`}
                                className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </Link>
                              
                              <button
                                onClick={() => handleDelete(content.id)}
                                className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedContent.size === searchResult.content.length && selectedContent.size > 0}
                          onChange={(e: any) => {
                            if (e.target.checked) {
                              setSelectedContent(new Set(searchResult.content.map(c => c.id)));
                            } else {
                              setSelectedContent(new Set());
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {searchResult.content.map((content: any) => {
                      const ContentIcon = getContentIcon(content.type);
                      
                      return (
                        <tr key={content.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedContent.has(content.id)}
                              onChange={() => toggleContentSelection(content.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                {content.thumbnailUrl ? (
                                  <img className="h-10 w-10 rounded-full object-cover" src={content.thumbnailUrl} alt="" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <ContentIcon className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{content.title}</div>
                                {content.description && (
                                  <div className="text-sm text-gray-500 truncate max-w-xs">{content.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-900">
                              <ContentIcon className="w-4 h-4" />
                              {content.type}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(content.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {content.duration ? (
                              <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-gray-400" />
                                {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div>
                              <div>{new Date(content.createdAt).toLocaleDateString()}</div>
                              <div className="text-xs">{content.creator?.username}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/signage/content/${content.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                              
                              {(user?.role === 'admin' || content.createdBy === user?.id) && (
                                <>
                                  <Link
                                    to={`/signage/content/edit/${content.id}`}
                                    className="text-indigo-600 hover:text-indigo-900"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Link>
                                  
                                  <button
                                    onClick={() => handleDelete(content.id)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* No Results */}
            {searchResult.content.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                <p className="text-gray-600">Try adjusting your search criteria</p>
              </div>
            )}

            {/* Pagination */}
            {searchResult.pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => handlePageChange(searchResult.pagination.page - 1)}
                    disabled={searchResult.pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, searchResult.pagination.totalPages) }, (_, i) => {
                    const page = i + Math.max(1, searchResult.pagination.page - 2);
                    if (page > searchResult.pagination.totalPages) return null;
                    
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === searchResult.pagination.page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }).filter(Boolean)}
                  
                  <button
                    onClick={() => handlePageChange(searchResult.pagination.page + 1)}
                    disabled={searchResult.pagination.page === searchResult.pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ContentSearchManager;