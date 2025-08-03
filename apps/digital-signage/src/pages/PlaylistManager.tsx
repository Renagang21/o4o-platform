import { useState, useEffect } from 'react';
import { Plus, Play, Edit, Trash2, Clock, Video, Image } from 'lucide-react';

interface PlaylistItem {
  id: string;
  type: 'video' | 'image';
  order: number;
  duration?: number;
  customSettings?: {
    volume?: number;
    autoplay?: boolean;
    startTime?: number;
    endTime?: number;
  };
  content?: {
    id: string;
    title: string;
    type: string;
    url: string;
    thumbnailUrl?: string;
  };
  imageUrl?: string;
  title?: string;
  createdAt: string;
}

interface Playlist {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'scheduled';
  isDefault: boolean;
  loop: boolean;
  totalDuration: number;
  itemCount: number;
  createdAt: string;
}

interface PlaylistManagerProps {
  storeId: string;
}

export default function PlaylistManager({ storeId }: PlaylistManagerProps) {
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistItems, setPlaylistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlaylists();
  }, [storeId]);

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistItems(selectedPlaylist.id);
    }
  }, [selectedPlaylist]);

  const fetchPlaylists = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/signage/stores/${storeId}/playlists`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlists');
      }

      const data = await response.json();
      setPlaylists(data.data.playlists);
      
      // Auto-select first playlist
      if (data.data.playlists.length > 0 && !selectedPlaylist) {
        setSelectedPlaylist(data.data.playlists[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaylistItems = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/signage/playlists/${playlistId}/items`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch playlist items');
      }

      const data = await response.json();
      setPlaylistItems(data.data.items.sort((a: PlaylistItem, b: PlaylistItem) => a.order - b.order));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch playlist items');
    }
  };

  const handleMoveUp = async (_itemId: string, currentIndex: number) => {
    if (currentIndex === 0 || !selectedPlaylist) return;
    
    const items = Array.from(playlistItems);
    const [movedItem] = items.splice(currentIndex, 1);
    items.splice(currentIndex - 1, 0, movedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    setPlaylistItems(updatedItems);

    try {
      const itemOrders = updatedItems.map((item, index) => ({
        id: item.id,
        order: index + 1
      }));

      const response = await fetch(`/api/signage/playlists/${selectedPlaylist.id}/items/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ items: itemOrders })
      });

      if (!response.ok) {
        throw new Error('Failed to reorder items');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder items');
      // Revert on error
      fetchPlaylistItems(selectedPlaylist.id);
    }
  };

  const handleMoveDown = async (_itemId: string, currentIndex: number) => {
    if (currentIndex === playlistItems.length - 1 || !selectedPlaylist) return;
    
    const items = Array.from(playlistItems);
    const [movedItem] = items.splice(currentIndex, 1);
    items.splice(currentIndex + 1, 0, movedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));
    setPlaylistItems(updatedItems);

    try {
      const itemOrders = updatedItems.map((item, index) => ({
        id: item.id,
        order: index + 1
      }));

      const response = await fetch(`/api/signage/playlists/${selectedPlaylist.id}/items/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ items: itemOrders })
      });

      if (!response.ok) {
        throw new Error('Failed to reorder items');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder items');
      fetchPlaylistItems(selectedPlaylist.id);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from the playlist?')) return;

    try {
      const response = await fetch(`/api/signage/playlist-items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete playlist item');
      }

      // Refresh items
      if (selectedPlaylist) {
        fetchPlaylistItems(selectedPlaylist.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', text: 'Inactive' },
      scheduled: { color: 'bg-blue-100 text-blue-800', text: 'Scheduled' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Playlist List */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Playlists</h2>
              <button
                onClick={() => console.log('Create modal would open')}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-3 h-3 mr-1" />
                Create
              </button>
            </div>
          </div>

          <div className="divide-y">
            {playlists.map((playlist: any) => (
              <div
                key={playlist.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedPlaylist?.id === playlist.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                }`}
                onClick={() => setSelectedPlaylist(playlist)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{playlist.name}</h3>
                  {getStatusBadge(playlist.status)}
                </div>
                
                {playlist.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{playlist.description}</p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{playlist.itemCount} items</span>
                  <span>{formatDuration(playlist.totalDuration)}</span>
                </div>

                {playlist.isDefault && (
                  <div className="mt-2">
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
                      Default
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {playlists.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Play className="w-8 h-8 mx-auto mb-2" />
              <p>No playlists found</p>
            </div>
          )}
        </div>
      </div>

      {/* Playlist Items */}
      <div className="lg:col-span-2">
        {selectedPlaylist ? (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-semibold text-gray-900">{selectedPlaylist.name}</h2>
                    {getStatusBadge(selectedPlaylist.status)}
                    {selectedPlaylist.isDefault && (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">
                        Default
                      </span>
                    )}
                  </div>
                  
                  {selectedPlaylist.description && (
                    <p className="text-gray-600 mt-1">{selectedPlaylist.description}</p>
                  )}

                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>{playlistItems.length} items</span>
                    <span>{formatDuration(selectedPlaylist.totalDuration)}</span>
                    {selectedPlaylist.loop && <span>Loop enabled</span>}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => console.log('Add item modal would open')}
                    className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Item
                  </button>
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Playlist Items List */}
            <div className="p-4">
              {playlistItems.length > 0 ? (
                <div className="space-y-2">
                  {playlistItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-gray-50 rounded-lg p-4 border"
                    >
                      <div className="flex items-center space-x-4">
                        {/* Order Controls */}
                        <div className="flex flex-col space-y-1">
                          <button
                            onClick={() => handleMoveUp(item.id, index)}
                            disabled={index === 0}
                            className={`p-1 rounded ${
                              index === 0 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveDown(item.id, index)}
                            disabled={index === playlistItems.length - 1}
                            className={`p-1 rounded ${
                              index === playlistItems.length - 1 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            ↓
                          </button>
                        </div>

                        {/* Order Number */}
                        <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium">
                          {item.order}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            {item.type === 'video' ? (
                              <Video className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Image className="w-4 h-4 text-green-600" />
                            )}
                            <h4 className="font-medium text-gray-900 truncate">
                              {item.title || item.content?.title || 'Untitled'}
                            </h4>
                          </div>

                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(item.duration || 0)}
                            </span>
                            
                            {item.type === 'video' && item.content && (
                              <span className="capitalize">
                                {item.content.type}
                              </span>
                            )}

                            {item.customSettings?.volume && (
                              <span>Volume: {item.customSettings.volume}%</span>
                            )}
                          </div>
                        </div>

                        {/* Thumbnail */}
                        {(item.content?.thumbnailUrl || item.imageUrl) && (
                          <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden">
                            <img
                              src={item.content?.thumbnailUrl || item.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex space-x-1">
                          <button className="p-1 text-gray-600 hover:bg-gray-200 rounded">
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Empty Playlist</h3>
                  <p className="text-gray-600 mb-4">Add content to get started</p>
                  <button
                    onClick={() => console.log('Add item modal would open')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center mx-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Item
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border h-96 flex items-center justify-center">
            <div className="text-center">
              <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Playlist</h3>
              <p className="text-gray-600">Choose a playlist from the list to view and edit its content</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}