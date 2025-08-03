import { useState, useEffect, useCallback, FC, Component } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Monitor, Play, Pause, Upload, Settings, Eye, Tv, 
  RefreshCw, Clock, BarChart3, Search, Filter, TrendingUp,
  Activity, AlertCircle, CheckCircle, XCircle, Calendar,
  Users, Layers, PlayCircle, PauseCircle
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import axios from '../../api/client';

// Types
interface SignageContent {
  id: string;
  title: string;
  description?: string;
  type: 'youtube' | 'vimeo';
  url: string;
  videoId: string;
  thumbnailUrl?: string;
  duration?: number;
  status: 'pending' | 'approved' | 'rejected' | 'inactive';
  tags?: string[];
  isPublic: boolean;
  createdBy: string;
  creator?: { id: string; username: string };
  approvedBy?: string;
  approver?: { id: string; username: string };
  approvedAt?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface Store {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'suspended';
  managerId: string;
  manager?: { id: string; username: string };
  displaySettings?: {
    resolution: string;
    orientation: 'landscape' | 'portrait';
  };
}

interface Analytics {
  totalContent: number;
  totalStores: number;
  totalPlaylists: number;
  totalPlaytime: number;
  activeStores: number;
  topContent: Array<{ id: string; title: string; playCount: number }>;
  storeActivity: Array<{ id: string; name: string; lastActivity: string; status: string }>;
  contentByType: { youtube: number; vimeo: number };
}

interface LiveDashboard {
  activeStores: number;
  currentlyPlaying: number;
  totalViewTime: number;
  liveActivity: Array<{
    storeId: string;
    storeName: string;
    currentContent?: string;
    status: string;
    lastActivity: string;
  }>;
}

const EnhancedSignageDashboard: FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // State
  const [contents, setContents] = useState([]);
  const [stores, setStores] = useState([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [liveDashboard, setLiveDashboard] = useState<LiveDashboard | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Fetch Analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await axios.get('/api/signage/analytics');
      setAnalytics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  }, []);

  // Fetch Live Dashboard
  const fetchLiveDashboard = useCallback(async () => {
    try {
      const params = selectedStore ? { storeId: selectedStore.id } : {};
      const response = await axios.get('/api/signage/dashboard/live', { params });
      setLiveDashboard(response.data.data);
    } catch (error) {
      console.error('Failed to fetch live dashboard:', error);
    }
  }, [selectedStore]);

  // Fetch Contents
  const fetchContents = useCallback(async () => {
    try {
      const params: Record<string, string | number> = {
        page: 1,
        limit: 20,
        sortBy: 'latest'
      };
      
      if (searchQuery) params.search = searchQuery;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (selectedStore) params.storeId = selectedStore.id;
      
      const response = await axios.get('/api/signage/contents', { params });
      setContents(response.data.data.contents);
    } catch (error) {
      console.error('Failed to fetch contents:', error);
      showToast('Failed to load contents', 'error');
    }
  }, [searchQuery, filterStatus, selectedStore, showToast]);

  // Fetch Stores
  const fetchStores = useCallback(async () => {
    try {
      const response = await axios.get('/api/signage/stores');
      setStores(response.data.data.stores);
      if (response.data.data.stores.length > 0 && !selectedStore) {
        setSelectedStore(response.data.data.stores[0]);
      }
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  }, [selectedStore]);

  // Initial Load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAnalytics(),
        fetchStores(),
        fetchContents(),
        fetchLiveDashboard()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [fetchAnalytics, fetchStores, fetchContents, fetchLiveDashboard]);

  // Auto-refresh Live Dashboard
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveDashboard();
    }, 30000); // 30 seconds
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchLiveDashboard]);

  // Playback Control
  const handlePlaybackControl = async (storeId: string, action: 'play' | 'pause' | 'stop' | 'restart') => {
    try {
      await axios.post(`/api/signage/stores/${storeId}/playback/control`, { action });
      showToast(`Playback ${action} command sent`, 'success');
      fetchLiveDashboard();
    } catch (error) {
      showToast('Failed to control playback', 'error');
    }
  };

  // Content Approval
  const handleContentApproval = async (contentId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      await axios.patch(`/api/signage/contents/${contentId}/approval`, { action, reason });
      showToast(`Content ${action}d successfully`, 'success');
      fetchContents();
    } catch (error) {
      showToast(`Failed to ${action} content`, 'error');
    }
  };

  // Status Badge Component
  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      inactive: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      playing: 'bg-blue-100 text-blue-800',
      idle: 'bg-gray-100 text-gray-800'
    };
    
    const icons = {
      pending: AlertCircle,
      approved: CheckCircle,
      rejected: XCircle,
      inactive: AlertCircle,
      active: CheckCircle,
      playing: PlayCircle,
      idle: PauseCircle
    };
    
    const Icon = icons[status as keyof typeof icons] || AlertCircle;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.inactive}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <h1 className="text-xl font-bold text-gray-900">📺 Enhanced Signage Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchLiveDashboard()}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <Link
                to="/signage/tv"
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Tv className="w-4 h-4" />
                TV Display
              </Link>
              <Link
                to="/signage/content/upload"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Add Content
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Content</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalContent}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Layers className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Stores</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.activeStores}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Monitor className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Playtime</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.floor(analytics.totalPlaytime / 3600)}h</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Playlists</p>
                  <p className="text-2xl font-bold text-gray-900">{analytics.totalPlaylists}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Live Dashboard */}
          <div className="lg:col-span-1 space-y-6">
            {/* Live Activity */}
            {liveDashboard && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Live Activity
                  </h2>
                  <span className="text-xs text-gray-500">Auto-refresh: 30s</span>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">{liveDashboard.activeStores}</p>
                      <p className="text-xs text-gray-600">Active Stores</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">{liveDashboard.currentlyPlaying}</p>
                      <p className="text-xs text-gray-600">Now Playing</p>
                    </div>
                  </div>
                  
                  {liveDashboard.liveActivity.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700">Store Status</h3>
                      {liveDashboard.liveActivity.slice(0, 5).map((activity: any) => (
                        <div key={activity.storeId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{activity.storeName}</p>
                            {activity.currentContent && (
                              <p className="text-xs text-gray-600 truncate">{activity.currentContent}</p>
                            )}
                          </div>
                          <StatusBadge status={activity.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Store Selector */}
            {stores.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Store Management</h3>
                <select
                  value={selectedStore?.id || ''}
                  onChange={(e: any) => {
                    const store = stores.find(s => s.id === e.target.value);
                    setSelectedStore(store || null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Stores</option>
                  {stores.map((store: any) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.status})
                    </option>
                  ))}
                </select>
                
                {selectedStore && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <StatusBadge status={selectedStore.status} />
                    </div>
                    {selectedStore.displaySettings && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Display:</span>
                        <span className="text-gray-900">{selectedStore.displaySettings.resolution}</span>
                      </div>
                    )}
                    
                    <div className="pt-3 flex gap-2">
                      <button
                        onClick={() => handlePlaybackControl(selectedStore.id, 'play')}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Play
                      </button>
                      <button
                        onClick={() => handlePlaybackControl(selectedStore.id, 'pause')}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top Content */}
            {analytics && analytics.topContent.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Top Content
                </h3>
                <div className="space-y-2">
                  {analytics.topContent.map((content, index) => (
                    <div key={content.id} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400 w-6">#{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{content.title}</p>
                        <p className="text-xs text-gray-600">{content.playCount} plays</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Content List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              {/* Search and Filters */}
              <div className="p-6 border-b">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search content..."
                      value={searchQuery}
                      onChange={(e: any) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e: any) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              {/* Content Grid */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contents.map((content: any) => (
                    <div key={content.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="relative">
                        {content.thumbnailUrl ? (
                          <img
                            src={content.thumbnailUrl}
                            alt={content.title}
                            className="w-full h-40 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/api/placeholder/400/200';
                            }}
                          />
                        ) : (
                          <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                            <Monitor className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                        
                        <div className="absolute top-2 right-2">
                          <StatusBadge status={content.status} />
                        </div>
                        
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs capitalize">
                          {content.type}
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 truncate">{content.title}</h3>
                        {content.description && (
                          <p className="text-sm text-gray-600 truncate mt-1">{content.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          {content.creator && (
                            <span className="text-xs text-gray-500">By {content.creator.username}</span>
                          )}
                          {content.duration && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.floor(content.duration / 60)}:{(content.duration % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        
                        {content.tags && content.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {content.tags.slice(0, 3).map((tag: any) => (
                              <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Admin Actions */}
                        {user?.role === 'admin' && content.status === 'pending' && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleContentApproval(content.id, 'approve')}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Rejection reason:');
                                if (reason) handleContentApproval(content.id, 'reject', reason);
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          </div>
                        )}
                        
                        {/* Regular Actions */}
                        <div className="flex gap-2 mt-3">
                          <Link
                            to={`/signage/content/${content.id}`}
                            className="flex-1 text-center px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            View Details
                          </Link>
                          {(user?.role === 'admin' || content.createdBy === user?.id) && (
                            <Link
                              to={`/signage/content/edit/${content.id}`}
                              className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                            >
                              <Settings className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {contents.length === 0 && (
                  <div className="text-center py-12">
                    <Monitor className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No content found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSignageDashboard;