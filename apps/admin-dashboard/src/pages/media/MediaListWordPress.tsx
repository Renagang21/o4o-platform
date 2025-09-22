import React, { useState, useEffect, useRef, FC } from 'react';
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
import { formatDate, formatFileSize } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import toast from 'react-hot-toast';

// Helper to get a representative icon for a file
const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image')) return '🖼️';
  if (mimeType.startsWith('video')) return '🎬';
  if (mimeType.startsWith('audio')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  return '📁';
};

interface MediaItem {
  id: string;
  title: string;
  filename: string;
  author: { name: string };
  attachedTo?: { title: string };
  createdAt: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  url: string;
}

type SortField = 'title' | 'date' | null;
type SortOrder = 'asc' | 'desc';

const MediaListWordPress: FC = () => {
  const queryClient = useQueryClient();
  const { success, error } = useAdminNotices();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Persist activeTab in sessionStorage
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'audio' | 'unattached'>(() => {
    const saved = sessionStorage.getItem('media-active-tab');
    return (saved as 'all' | 'image' | 'video' | 'audio' | 'unattached') || 'all';
  });
  
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Screen Options state - load from localStorage
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('media-visible-columns');
    return saved ? JSON.parse(saved) : {
      author: true,
      uploadedTo: true,
      date: true
    };
  });
  
  // Items per page state - default 20
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('media-items-per-page');
    return saved ? parseInt(saved) : 20;
  });
  
  // Save activeTab to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem('media-active-tab', activeTab);
  }, [activeTab]);
  
  // Clean up hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // Save visible columns to localStorage when they change
  useEffect(() => {
    localStorage.setItem('media-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  
  // Save items per page to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('media-items-per-page', itemsPerPage.toString());
  }, [itemsPerPage]);

  // Fetch media from API
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('limit', '1000');  // API expects 'limit' not 'per_page'
        
        const response = await authClient.api.get(`/v1/content/media?${params}`);
        console.log('Media API Response:', response.data); // Debug log
        
        // Handle different response structures
        let mediaData = [];
        if (Array.isArray(response.data)) {
          mediaData = response.data;
        } else if (response.data.data?.media) {
          // API returns data.media array
          mediaData = response.data.data.media;
        } else if (response.data.data) {
          mediaData = response.data.data;
        } else if (response.data.items) {
          mediaData = response.data.items;
        }
        
        const transformedMedia = mediaData.map((item: any) => {
          // Use thumbnailUrl from API or fall back to main URL for images
          let thumbnailUrl = item.thumbnailUrl || (item.isImage ? item.url : null);
          
          // Ensure URLs are already absolute from the API
          // The API already provides absolute URLs
          
          return {
            id: item.id || item._id,
            title: item.originalFilename || item.filename || item.name || 'Untitled',
            filename: item.filename || item.name,
            author: { name: item.uploadedBy?.name || item.uploader?.name || 'Unknown' },
            attachedTo: item.attachedTo || null,
            createdAt: item.createdAt || item.uploadedAt || item.created_at,
            mimeType: item.mimeType || item.mime_type || 'application/octet-stream',
            size: item.size || 0,
            width: item.width,
            height: item.height,
            thumbnailUrl: thumbnailUrl,
            url: item.url
          };
        });
        
        console.log('Transformed media:', transformedMedia); // Debug log
        setMedia(transformedMedia);
      } catch (err) {
        console.error('Failed to fetch media:', err);
        // Fallback to empty array instead of mock data
        setMedia([]);
        error('Failed to load media library');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMedia();
  }, []);
  
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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMedia(new Set(getFilteredMedia().map(m => m.id)));
    } else {
      setSelectedMedia(new Set());
    }
  };

  const handleSelectMedia = (id: string) => {
    const newSelection = new Set(selectedMedia);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedMedia(newSelection);
  };

  const handleEdit = (id: string) => {
    // Handle edit functionality
    // TODO: Implement edit functionality
  };

  const handleDelete = async (id: string) => {
    if (confirm('정말 이 미디어를 삭제하시겠습니까?')) {
      try {
        await authClient.api.delete(`/v1/content/media/${id}`);
        setMedia(prevMedia => prevMedia.filter(m => m.id !== id));
        toast.success('Media deleted successfully');
      } catch (error) {
        toast.error('Failed to delete media');
      }
    }
  };

  const handleView = (id: string) => {
    const mediaItem = media.find(m => m.id === id);
    if (mediaItem) {
      window.open(mediaItem.url, '_blank');
    }
  };

  const handleApplyBulkAction = async () => {
    if (!selectedBulkAction) {
      alert('Please select an action.');
      return;
    }
    
    if (selectedMedia.size === 0) {
      alert('No media selected.');
      return;
    }
    
    if (selectedBulkAction === 'delete') {
      if (confirm(`선택한 ${selectedMedia.size}개의 미디어를 삭제하시겠습니까?`)) {
        try {
          const promises = Array.from(selectedMedia).map(id => 
            authClient.api.delete(`/v1/content/media/${id}`)
          );
          
          await Promise.all(promises);
          setMedia(prevMedia => prevMedia.filter(m => !selectedMedia.has(m.id)));
          setSelectedMedia(new Set());
          setSelectedBulkAction('');
          toast.success('Selected media deleted successfully');
        } catch (error) {
          toast.error('Failed to delete selected media');
        }
      }
    }
  };

  const handleSearch = () => {
    // Search functionality is handled in getFilteredMedia()
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getFilteredMedia = () => {
    let filtered = media;
    
    // Filter by tab
    if (activeTab === 'image') {
      filtered = filtered.filter(m => m.mimeType.startsWith('image/'));
    } else if (activeTab === 'video') {
      filtered = filtered.filter(m => m.mimeType.startsWith('video/'));
    } else if (activeTab === 'audio') {
      filtered = filtered.filter(m => m.mimeType.startsWith('audio/'));
    } else if (activeTab === 'unattached') {
      filtered = filtered.filter(m => !m.attachedTo);
    }
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.author.name.toLowerCase().includes(searchQuery.toLowerCase())
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
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return 0;
      });
    } else {
      // Default sort by date desc
      filtered = [...filtered].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    
    // Apply pagination limit
    return filtered.slice(0, itemsPerPage);
  };

  const getTypeCounts = () => {
    const image = media.filter(m => m.mimeType.startsWith('image/')).length;
    const video = media.filter(m => m.mimeType.startsWith('video/')).length;
    const audio = media.filter(m => m.mimeType.startsWith('audio/')).length;
    const unattached = media.filter(m => !m.attachedTo).length;
    const all = media.length;
    return { all, image, video, audio, unattached };
  };

  const counts = getTypeCounts();
  const filteredMedia = getFilteredMedia();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0f1' }}>
        <div className="text-gray-600">Loading media...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
      {/* Header with Breadcrumb and Screen Options */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb 
            items={[
              { label: 'Admin', path: '/admin' },
              { label: '미디어', path: '/admin/media' },
              { label: 'Library' }
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
                      업로더
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        checked={visibleColumns.uploadedTo}
                        onChange={() => handleColumnToggle('uploadedTo')}
                        className="mr-2" 
                      />
                      업로드 위치
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
                  </div>
                  
                  {/* Pagination Settings */}
                  <div className="border-t border-gray-200 mt-3 pt-3">
                    <h3 className="font-medium text-sm mb-3">Pagination</h3>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">페이징 항목 수:</label>
                      <input
                        type="number"
                        value={itemsPerPage}
                        onChange={(e) => handleItemsPerPageChange(e.target.value)}
                        onBlur={(e) => {
                          if (!e.target.value || e.target.value === '0') {
                            setItemsPerPage(20);
                          }
                        }}
                        min="1"
                        max="999"
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <h1 className="text-2xl font-normal text-gray-900">Media Library</h1>
          <button
            onClick={() => window.location.href = '/media/new'}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Add New
          </button>
        </div>

        {/* Type Tabs */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setActiveTab('all')}
            className={`text-sm ${activeTab === 'all' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            모두 ({counts.all})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('image')}
            className={`text-sm ${activeTab === 'image' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            이미지 ({counts.image})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('audio')}
            className={`text-sm ${activeTab === 'audio' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            오디오 ({counts.audio})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('video')}
            className={`text-sm ${activeTab === 'video' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            비디오 ({counts.video})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('unattached')}
            className={`text-sm ${activeTab === 'unattached' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
          >
            연결되지 않음 ({counts.unattached})
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
                {selectedBulkAction === 'delete' ? 'Delete Permanently' : 'Bulk Actions'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('delete');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Delete Permanently
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedMedia.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedMedia.size === 0}
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
              placeholder="미디어 검색..."
            />
            <button
              onClick={handleSearch}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
            >
              미디어 검색
            </button>
          </div>
        </div>

        {/* Item count */}
        <div className="text-sm text-gray-600 mb-2">
          {filteredMedia.length} items
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
                    checked={selectedMedia.size === filteredMedia.length && filteredMedia.length > 0}
                  />
                </th>
                <th className="px-3 py-3 text-left">
                  <button 
                    onClick={() => handleSort('title')}
                    className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black"
                  >
                    파일
                    {sortField === 'title' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3 opacity-50" />
                    )}
                  </button>
                </th>
                {visibleColumns.author && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">업로더</th>
                )}
                {visibleColumns.uploadedTo && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">업로드 위치</th>
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
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((mediaItem) => (
                <tr
                  key={mediaItem.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                  onMouseEnter={() => {
                    // Clear any existing timeout
                    if (hoverTimeoutRef.current) {
                      clearTimeout(hoverTimeoutRef.current);
                    }
                    // Set new timeout to show menu after 300ms
                    hoverTimeoutRef.current = setTimeout(() => {
                      setHoveredRow(mediaItem.id);
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
                      checked={selectedMedia.has(mediaItem.id)}
                      onChange={() => handleSelectMedia(mediaItem.id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div>
                      <div className="flex items-center gap-3">
                        {mediaItem.thumbnailUrl ? (
                          <img 
                            src={mediaItem.thumbnailUrl} 
                            alt={mediaItem.title} 
                            className="w-15 h-15 object-cover rounded" 
                          />
                        ) : (
                          <div className="w-15 h-15 bg-gray-100 rounded flex items-center justify-center text-2xl">
                            {getFileIcon(mediaItem.mimeType)}
                          </div>
                        )}
                        <div>
                          <button 
                            onClick={() => handleEdit(mediaItem.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm text-left"
                          >
                            {mediaItem.title}
                          </button>
                          <div className="text-xs text-gray-500 mt-1">
                            {mediaItem.filename}
                          </div>
                        </div>
                      </div>
                      {hoveredRow === mediaItem.id && (
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <button
                            onClick={() => handleEdit(mediaItem.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleDelete(mediaItem.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete Permanently
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleView(mediaItem.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  {visibleColumns.author && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {mediaItem.author.name}
                    </td>
                  )}
                  {visibleColumns.uploadedTo && (
                    <td className="px-3 py-3 text-sm">
                      {mediaItem.attachedTo ? (
                        <strong><a href="#" className="text-blue-600 hover:text-blue-800">{mediaItem.attachedTo.title}</a></strong>
                      ) : (
                        <em className="text-gray-500">(Unattached)</em>
                      )}
                    </td>
                  )}
                  {visibleColumns.date && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      <div>업로드됨</div>
                      <div>{formatDate(mediaItem.createdAt)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatFileSize(mediaItem.size)}
                      </div>
                      {mediaItem.width && mediaItem.height && (
                        <div className="text-xs text-gray-500">
                          {mediaItem.width} × {mediaItem.height}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
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
                {selectedBulkAction === 'delete' ? 'Delete Permanently' : 'Bulk Actions'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 bottom-full mb-1 w-48 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('delete');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Delete Permanently
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedMedia.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedMedia.size === 0}
            >
              Apply
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredMedia.length} items
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaListWordPress;
