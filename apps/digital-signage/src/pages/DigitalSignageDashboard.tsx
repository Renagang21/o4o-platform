import { useState, useEffect } from 'react';
import { Monitor, Video, Calendar, BarChart3, Play, Clock, TrendingUp } from 'lucide-react';
import SignageContent from './SignageContent';
import StoreManagement from './StoreManagement';
import PlaylistManager from './PlaylistManager';
import ScheduleManager from './ScheduleManager';

interface Store {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'maintenance';
  location?: string;
}

interface StorePerformance {
  storeId: string;
  totalDuration: number;
  contentCount: number;
}

interface DashboardStats {
  totalStores: number;
  activeStores: number;
  totalContent: number;
  approvedContent: number;
  totalPlaylists: number;
  activeSchedules: number;
  totalPlaytime: number;
  recentActivity: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
}

export default function DigitalSignageDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedStoreId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // This would come from auth context - using dynamic value to avoid TS literal type inference
  const userRole = (['admin', 'manager'] as const)[0] as 'admin' | 'manager';

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // This would typically be multiple API calls combined
      const [storesResponse, contentResponse, analyticsResponse] = await Promise.all([
        fetch('/api/signage/stores', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/signage/contents?limit=1', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/signage/analytics/store-performance', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const storesData = await storesResponse.json();
      const contentData = await contentResponse.json();
      const analyticsData = await analyticsResponse.json();

      const stores = storesData.data?.stores as Store[] || [];
      const performances = analyticsData.data as StorePerformance[] || [];

      setStats({
        totalStores: stores.length,
        activeStores: stores.filter((s) => s.status === 'active').length,
        totalContent: contentData.data?.pagination?.total || 0,
        approvedContent: 0, // Would need separate API call
        totalPlaylists: 0, // Would need separate API call
        activeSchedules: 0, // Would need separate API call
        totalPlaytime: performances.reduce((sum, store) => sum + store.totalDuration, 0),
        recentActivity: []
      });
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'content', label: 'Content', icon: Video },
    { id: 'stores', label: 'Stores', icon: Monitor },
    { id: 'playlists', label: 'Playlists', icon: Play },
    { id: 'schedules', label: 'Schedules', icon: Calendar },
  ];

  if (userRole === 'manager') {
    // Filter tabs for store managers
    tabs.splice(2, 1); // Remove stores tab
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Digital Signage</h1>
                <p className="text-gray-600">Manage your digital signage content and displays</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                  {userRole === 'admin' ? 'Admin' : 'Store Manager'}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6">
              <nav className="flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-1 py-2 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Monitor className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Stores</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '-' : `${stats?.activeStores || 0}/${stats?.totalStores || 0}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Video className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Content</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '-' : stats?.totalContent || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Play className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Schedules</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '-' : stats?.activeSchedules || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Playtime</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {loading ? '-' : formatPlaytime(stats?.totalPlaytime || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <button
                onClick={() => setActiveTab('content')}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center">
                  <Video className="w-8 h-8 text-blue-600 mr-4" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Manage Content</h3>
                    <p className="text-gray-600">Upload and organize video content</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('stores')}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow text-left"
                disabled={userRole === 'manager'}
              >
                <div className="flex items-center">
                  <Monitor className="w-8 h-8 text-green-600 mr-4" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Store Controls</h3>
                    <p className="text-gray-600">Monitor and control displays</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('schedules')}
                className="bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center">
                  <Calendar className="w-8 h-8 text-purple-600 mr-4" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Schedule Content</h3>
                    <p className="text-gray-600">Automate content playback</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="p-6">
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {stats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div className="flex-1">
                          <p className="text-gray-900">{activity.message}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && <SignageContent />}

        {activeTab === 'stores' && userRole === 'admin' && <StoreManagement />}

        {activeTab === 'playlists' && (
          <div>
            {selectedStoreId ? (
              <PlaylistManager storeId={selectedStoreId} />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Store</h3>
                <p className="text-gray-600 mb-4">Choose a store to manage its playlists</p>
                <button
                  onClick={() => setActiveTab('stores')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Go to Stores
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'schedules' && (
          <div>
            {selectedStoreId ? (
              <ScheduleManager storeId={selectedStoreId} />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Store</h3>
                <p className="text-gray-600 mb-4">Choose a store to manage its schedules</p>
                <button
                  onClick={() => setActiveTab('stores')}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Go to Stores
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}