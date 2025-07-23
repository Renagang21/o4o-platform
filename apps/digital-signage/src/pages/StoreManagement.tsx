import { useState, useEffect } from 'react';
import { Plus, Settings, Monitor, Calendar, BarChart3, Play, Pause, SkipForward } from 'lucide-react';

interface Store {
  id: string;
  name: string;
  description?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
  phone?: string;
  businessHours?: string;
  status: 'active' | 'inactive' | 'suspended';
  displaySettings?: {
    resolution: string;
    orientation: 'landscape' | 'portrait';
    defaultTemplate: string;
  };
  manager: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

interface PlaybackStatus {
  isPlaying: boolean;
  currentItem?: {
    id: string;
    contentId: string;
    title: string;
    type: string;
    url: string;
    duration: number;
    position: number;
  };
  playlist?: {
    id: string;
    name: string;
  };
  schedule?: {
    id: string;
    name: string;
  };
}

export default function StoreManagement() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // This would come from auth context - using dynamic value to avoid TS literal type inference
  const userRole = (['admin', 'manager'] as const)[0] as 'admin' | 'manager';

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      fetchPlaybackStatus(selectedStore.id);
      // Set up polling for real-time updates
      const interval = setInterval(() => {
        fetchPlaybackStatus(selectedStore.id);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedStore]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/signage/stores', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stores');
      }

      const data = await response.json();
      setStores(data.data.stores);
      
      // Auto-select first store for managers
      if (userRole === 'manager' && data.data.stores.length > 0) {
        setSelectedStore(data.data.stores[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlaybackStatus = async (storeId: string) => {
    try {
      const response = await fetch(`/api/signage/stores/${storeId}/playback/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlaybackStatus(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch playback status:', err);
    }
  };

  const handlePlaybackControl = async (action: string, position?: number) => {
    if (!selectedStore) return;

    try {
      const response = await fetch(`/api/signage/stores/${selectedStore.id}/playback/control`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, position })
      });

      if (response.ok) {
        // Refresh playback status
        fetchPlaybackStatus(selectedStore.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Control action failed');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', text: 'Inactive' },
      suspended: { color: 'bg-red-100 text-red-800', text: 'Suspended' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
      {/* Store List */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Stores</h2>
              {userRole === 'admin' && (
                <button
                  onClick={() => console.log('Create modal would open')}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </button>
              )}
            </div>
          </div>

          <div className="divide-y">
            {stores.map((store) => (
              <div
                key={store.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedStore?.id === store.id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                }`}
                onClick={() => setSelectedStore(store)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">{store.name}</h3>
                  {getStatusBadge(store.status)}
                </div>
                
                {store.address && (
                  <p className="text-sm text-gray-600 mb-2">
                    {store.address.city}, {store.address.state}
                  </p>
                )}
                
                <div className="text-xs text-gray-500">
                  Manager: {store.manager.name}
                </div>
              </div>
            ))}
          </div>

          {stores.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Monitor className="w-8 h-8 mx-auto mb-2" />
              <p>No stores found</p>
            </div>
          )}
        </div>
      </div>

      {/* Store Details & Controls */}
      <div className="lg:col-span-2">
        {selectedStore ? (
          <div className="space-y-6">
            {/* Store Info */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{selectedStore.name}</h1>
                  <p className="text-gray-600">{selectedStore.description}</p>
                </div>
                <div className="flex space-x-2">
                  {getStatusBadge(selectedStore.status)}
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedStore.address && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Address</h3>
                    <p className="text-sm text-gray-600">
                      {selectedStore.address.street}<br />
                      {selectedStore.address.city}, {selectedStore.address.state} {selectedStore.address.zipcode}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Manager</h3>
                  <p className="text-sm text-gray-600">
                    {selectedStore.manager.name}<br />
                    {selectedStore.manager.email}
                  </p>
                </div>

                {selectedStore.displaySettings && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Display Settings</h3>
                    <p className="text-sm text-gray-600">
                      {selectedStore.displaySettings.resolution} • {selectedStore.displaySettings.orientation}
                    </p>
                  </div>
                )}

                {selectedStore.businessHours && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">Business Hours</h3>
                    <p className="text-sm text-gray-600">{selectedStore.businessHours}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Current Playback Status */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Playback</h2>
              
              {playbackStatus?.isPlaying ? (
                <div className="space-y-4">
                  {/* Now Playing */}
                  {playbackStatus.currentItem && (
                    <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{playbackStatus.currentItem.title}</h3>
                        <p className="text-sm text-gray-600">
                          {formatDuration(playbackStatus.currentItem.position)} / {formatDuration(playbackStatus.currentItem.duration)}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {playbackStatus.currentItem.type.toUpperCase()}
                      </div>
                    </div>
                  )}

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={() => handlePlaybackControl('pause')}
                      className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handlePlaybackControl('next')}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Playlist & Schedule Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {playbackStatus.playlist && (
                      <div>
                        <span className="font-medium text-gray-900">Playlist: </span>
                        <span className="text-gray-600">{playbackStatus.playlist.name}</span>
                      </div>
                    )}
                    {playbackStatus.schedule && (
                      <div>
                        <span className="font-medium text-gray-900">Schedule: </span>
                        <span className="text-gray-600">{playbackStatus.schedule.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Monitor className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Playback</h3>
                  <p className="text-gray-600 mb-4">No content is currently playing on this display</p>
                  <button
                    onClick={() => handlePlaybackControl('play')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center mx-auto"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Playback
                  </button>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="bg-white border rounded-lg p-4 hover:bg-gray-50 flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Manage Schedules</span>
              </button>
              
              <button className="bg-white border rounded-lg p-4 hover:bg-gray-50 flex items-center space-x-3">
                <Monitor className="w-5 h-5 text-green-600" />
                <span className="font-medium">Manage Playlists</span>
              </button>
              
              <button className="bg-white border rounded-lg p-4 hover:bg-gray-50 flex items-center space-x-3">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <span className="font-medium">View Analytics</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border h-96 flex items-center justify-center">
            <div className="text-center">
              <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Store</h3>
              <p className="text-gray-600">Choose a store from the list to view details and controls</p>
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