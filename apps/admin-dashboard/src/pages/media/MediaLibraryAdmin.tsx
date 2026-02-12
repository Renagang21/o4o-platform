import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { formatDate, formatFileSize } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { authClient } from '@o4o/auth-client';
import { toast } from 'react-hot-toast';
import { getFileTypeFromMime, getFileIcon, getFileColorClass } from '@/utils/fileIcons';

interface MediaItem {
  id: string;
  title: string;
  filename: string;
  author: string;
  createdAt: string;
  mimeType: string;
  size: number;
  thumbnailUrl?: string;
  url: string;
  isImage?: boolean;
}

const MediaLibraryAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'document' | 'unattached'>('all');

  // Fetch media from API
  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/content/media?limit=100');
      
      let mediaData = [];
      if (response.data?.data?.media) {
        mediaData = response.data.data.media;
      } else if (Array.isArray(response.data)) {
        mediaData = response.data;
      }

      const transformed = mediaData.map((item: any) => {
        // Ensure thumbnailUrl has proper format
        let thumbnailUrl = item.thumbnailUrl;
        if (!thumbnailUrl && item.isImage && item.url) {
          thumbnailUrl = item.url;
        }
        // Add API base URL if needed
        if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
          thumbnailUrl = `https://api.neture.co.kr${thumbnailUrl}`;
        }
        
        let url = item.url;
        if (url && !url.startsWith('http')) {
          url = `https://api.neture.co.kr${url}`;
        }

        return {
          id: item.id,
          title: item.originalFilename || item.filename || 'Untitled',
          filename: item.filename,
          author: item.uploadedBy?.name || item.uploadedBy?.email?.split('@')[0] || currentUser?.name || currentUser?.email?.split('@')[0] || '작성자',
          createdAt: item.createdAt,
          mimeType: item.mimeType || 'application/octet-stream',
          size: parseInt(item.size) || 0,
          thumbnailUrl,
          url,
          isImage: item.isImage || (item.mimeType && item.mimeType.startsWith('image/'))
        };
      });

      setMedia(transformed);
    } catch (err) {
      toast.error('Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string, newTitle: string) => {
    try {
      await authClient.api.put(`/content/media/${id}`, { title: newTitle });
      setMedia(prev => prev.map(m => 
        m.id === id ? { ...m, title: newTitle } : m
      ));
      toast.success('Media updated');
    } catch (error) {
      toast.error('Failed to update media');
    }
  };

  const handleDelete = async (id: string) => {
    // Use non-blocking confirmation
    const shouldDelete = window.confirm('Delete this media permanently?');
    if (!shouldDelete) return;

    // Find the item to delete for potential restoration
    const itemToDelete = media.find(m => m.id === id);
    if (!itemToDelete) return;

    // Optimistically remove from UI immediately for better perceived performance
    setMedia(prev => prev.filter(m => m.id !== id));
    
    try {
      // Get token from localStorage directly
      let token = localStorage.getItem('accessToken') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('authToken');
      
      // Also check admin-auth-storage
      if (!token) {
        const authStorage = localStorage.getItem('admin-auth-storage');
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            if (parsed.state?.accessToken || parsed.state?.token) {
              token = parsed.state.accessToken || parsed.state.token;
            }
          } catch (e) {
            // Invalid JSON, ignore
          }
        }
      }
      
      if (!token) {
        // Restore the item if auth fails
        setMedia(prev => [...prev, itemToDelete].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        toast.error('Authentication required. Please login again.');
        return;
      }
      
      // Perform delete request
      await authClient.api.delete(`/content/media/${id}`);
      
      toast.success('Media deleted successfully');
    } catch (error: any) {
      // Restore the item on error
      setMedia(prev => [...prev, itemToDelete].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      toast.error(`Failed to delete: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMedia.size === 0) return;
    
    const shouldDelete = window.confirm(`Delete ${selectedMedia.size} items permanently?`);
    if (!shouldDelete) return;

    // Store items to potentially restore
    const itemsToDelete = media.filter(m => selectedMedia.has(m.id));
    const selectedIds = new Set(selectedMedia);
    
    // Optimistically update UI immediately
    setMedia(prev => prev.filter(m => !selectedIds.has(m.id)));
    setSelectedMedia(new Set());
    toast.loading(`Deleting ${selectedIds.size} items...`);

    try {
      // Get token from localStorage directly
      let token = localStorage.getItem('accessToken') || 
                  localStorage.getItem('token') || 
                  localStorage.getItem('authToken');
      
      // Also check admin-auth-storage
      if (!token) {
        const authStorage = localStorage.getItem('admin-auth-storage');
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage);
            if (parsed.state?.accessToken || parsed.state?.token) {
              token = parsed.state.accessToken || parsed.state.token;
            }
          } catch (e) {
            // Invalid JSON, ignore
          }
        }
      }
      
      if (!token) {
        // Restore items if auth fails
        setMedia(prev => [...prev, ...itemsToDelete].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        setSelectedMedia(selectedIds);
        toast.error('Authentication required. Please login again.');
        return;
      }
      
      // Delete items in parallel but don't block UI
      const deletePromises = Array.from(selectedIds).map(id =>
        authClient.api.delete(`/content/media/${id}`).catch(error => {
          // Failed to delete media item
          return { error, id };
        })
      );
      
      // Process results in background
      Promise.all(deletePromises).then(results => {
        const failedDeletions = results.filter(r => r && 'error' in r);
        if (failedDeletions.length > 0) {
          // Restore only the failed items
          const failedIds = failedDeletions.map((f: any) => f.id);
          const failedItems = itemsToDelete.filter(item => failedIds.includes(item.id));
          setMedia(prev => [...prev, ...failedItems].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
          toast.error(`Failed to delete ${failedDeletions.length} item(s)`);
        } else {
          toast.success('Selected media deleted successfully');
        }
      });
    } catch (error: any) {
      // Restore all items on complete failure
      setMedia(prev => [...prev, ...itemsToDelete].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setSelectedMedia(selectedIds);
      toast.error(`Failed to delete: ${error.response?.data?.message || error.message}`);
    }
  };

  // Filter media based on active tab and search
  const getFilteredMedia = () => {
    let filtered = media;

    // Tab filter
    if (activeTab === 'image') {
      filtered = filtered.filter(m => m.mimeType.startsWith('image/'));
    } else if (activeTab === 'document') {
      filtered = filtered.filter(m => {
        const fileType = getFileTypeFromMime(m.mimeType, m.filename);
        return ['document', 'markdown', 'json', 'pdf', 'text', 'spreadsheet'].includes(fileType);
      });
    } else if (activeTab === 'unattached') {
      // For now, show all as we don't track attachments
      filtered = filtered;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(query) ||
        m.filename.toLowerCase().includes(query)
      );
    }

    // Sort by date desc
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const filteredMedia = getFilteredMedia();

  // Count media types
  const counts = {
    all: media.length,
    image: media.filter(m => m.mimeType.startsWith('image/')).length,
    document: media.filter(m => {
      const fileType = getFileTypeFromMime(m.mimeType, m.filename);
      return ['document', 'markdown', 'json', 'pdf', 'text', 'spreadsheet'].includes(fileType);
    }).length,
    unattached: media.length // Simplified - all are unattached for now
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading media...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-3">
        <AdminBreadcrumb 
          items={[
            { label: 'Dashboard', path: '/' },
            { label: 'Media', path: '/media' },
            { label: 'Library' }
          ]}
        />
      </div>

      <div className="px-8 py-6">
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-2xl font-normal">Media Library</h1>
          <button
            onClick={() => navigate('/media/new')}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            Add New
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <button
            onClick={() => setActiveTab('all')}
            className={activeTab === 'all' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
          >
            All ({counts.all})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('image')}
            className={activeTab === 'image' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
          >
            Images ({counts.image})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('document')}
            className={activeTab === 'document' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
          >
            Documents ({counts.document})
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setActiveTab('unattached')}
            className={activeTab === 'unattached' ? 'font-medium' : 'text-blue-600 hover:text-blue-800'}
          >
            Unattached ({counts.unattached})
          </button>
        </div>

        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-4">
          {/* Bulk Actions */}
          <div className="flex items-center gap-2">
            <select 
              className="text-sm border border-gray-300 rounded px-3 py-1.5"
              defaultValue=""
            >
              <option value="">Bulk Actions</option>
              <option value="delete">Delete Permanently</option>
            </select>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50"
              disabled={selectedMedia.size === 0}
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
              className="px-3 py-1.5 text-sm border border-gray-300 rounded"
              placeholder="Search media..."
            />
          </div>
        </div>

        {/* Count */}
        <div className="text-sm text-gray-600 mb-2">
          {filteredMedia.length} items
        </div>

        {/* Media Table */}
        <div className="bg-white border rounded">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMedia(new Set(filteredMedia.map(m => m.id)));
                      } else {
                        setSelectedMedia(new Set());
                      }
                    }}
                    checked={selectedMedia.size === filteredMedia.length && filteredMedia.length > 0}
                  />
                </th>
                <th className="px-3 py-3 text-left text-sm font-medium">File</th>
                <th className="px-3 py-3 text-left text-sm font-medium">Author</th>
                <th className="px-3 py-3 text-left text-sm font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedMedia.has(item.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedMedia);
                        if (e.target.checked) {
                          newSelected.add(item.id);
                        } else {
                          newSelected.delete(item.id);
                        }
                        setSelectedMedia(newSelected);
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      {item.thumbnailUrl || item.isImage ? (
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : (
                        <div className={`w-16 h-16 rounded border flex items-center justify-center ${getFileColorClass(getFileTypeFromMime(item.mimeType, item.filename))}`}>
                          {getFileIcon(getFileTypeFromMime(item.mimeType, item.filename), 'w-8 h-8')}
                        </div>
                      )}
                      
                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{item.filename}</div>

                        {/* File URL */}
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="text"
                            value={item.url}
                            readOnly
                            className="flex-1 text-xs px-2 py-1 bg-gray-50 border border-gray-200 rounded font-mono text-gray-600 cursor-pointer hover:bg-gray-100"
                            onClick={(e) => e.currentTarget.select()}
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.url);
                              toast.success('URL copied to clipboard!');
                            }}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                            title="Copy URL"
                          >
                            Copy URL
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <button
                            onClick={() => {
                              // Simple edit - change title
                              const newTitle = prompt('Edit title:', item.title);
                              if (newTitle && newTitle !== item.title) {
                                handleEdit(item.id, newTitle);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Edit
                          </button>
                          <span className="text-gray-400">|</span>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete Permanently
                          </button>
                          <span className="text-gray-400">|</span>
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">
                    {item.author}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">
                    <div>{formatDate(item.createdAt)}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatFileSize(item.size)}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredMedia.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                    No media found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MediaLibraryAdmin;