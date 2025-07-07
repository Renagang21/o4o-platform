import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalPageViews: number;
  totalActions: number;
  totalFeedback: number;
  totalErrors: number;
  systemUptime: number;
  avgResponseTime: number;
  errorRate: number;
  userEngagement: number;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
}

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  title: string;
  message: string;
  formattedValue: string;
  isRecurring: boolean;
  occurrenceCount: number;
  ageInHours: number;
  createdAt: string;
}

interface RealTimeMetrics {
  activeSessions: number;
  recentActions: number;
  recentErrors: number;
  currentAlerts: number;
  timestamp: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsDashboard: React.FC = () => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<any>(null);
  const [systemAnalytics, setSystemAnalytics] = useState<any>(null);
  const [timeRange, setTimeRange] = useState(7); // days
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
    fetchAlerts();
    fetchRealTimeMetrics();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchRealTimeMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const [overviewRes, userRes, systemRes] = await Promise.all([
        fetch(`/api/analytics/overview?days=${timeRange}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/analytics/users?days=${timeRange}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`/api/analytics/system?days=${timeRange}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (!overviewRes.ok || !userRes.ok || !systemRes.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [overviewData, userData, systemData] = await Promise.all([
        overviewRes.json(),
        userRes.json(),
        systemRes.json()
      ]);

      setOverview(overviewData.data);
      setUserAnalytics(userData.data);
      setSystemAnalytics(systemData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/analytics/alerts?limit=10', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      setAlerts(data.data.alerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const fetchRealTimeMetrics = async () => {
    try {
      const response = await fetch('/api/analytics/real-time', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch real-time metrics');
      }

      const data = await response.json();
      setRealTimeMetrics(data.data);
    } catch (err) {
      console.error('Error fetching real-time metrics:', err);
    }
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve', note?: string) => {
    try {
      const response = await fetch(`/api/analytics/alerts/${alertId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ note })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} alert`);
      }

      // Refresh alerts
      fetchAlerts();
    } catch (err) {
      console.error(`Error ${action}ing alert:`, err);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Error loading analytics</p>
        <p>{error}</p>
        <button 
          onClick={() => {
            setError(null);
            fetchAnalyticsData();
          }}
          className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex space-x-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={1}>Last 24 hours</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Real-time Metrics */}
      {realTimeMetrics && (
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Real-time Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{realTimeMetrics.activeSessions}</div>
              <div className="text-sm text-gray-600">Active Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{realTimeMetrics.recentActions}</div>
              <div className="text-sm text-gray-600">Recent Actions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{realTimeMetrics.recentErrors}</div>
              <div className="text-sm text-gray-600">Recent Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{realTimeMetrics.currentAlerts}</div>
              <div className="text-sm text-gray-600">Active Alerts</div>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Last updated: {new Date(realTimeMetrics.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{overview.totalUsers}</p>
                <p className="text-sm text-green-600">+{overview.newUsers} new</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-3xl font-bold text-gray-900">{overview.activeUsers}</p>
                <p className="text-sm text-blue-600">{Math.round(overview.userEngagement)}% engagement</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-3xl font-bold text-gray-900">{Math.round(overview.avgResponseTime)}ms</p>
                <div className={`inline-block px-2 py-1 rounded text-xs ${
                  overview.avgResponseTime < 500 ? 'bg-green-100 text-green-800' :
                  overview.avgResponseTime < 1000 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {overview.avgResponseTime < 500 ? 'Excellent' :
                   overview.avgResponseTime < 1000 ? 'Good' : 'Slow'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getHealthColor(overview.systemHealth)}`}></div>
                  <p className="text-lg font-semibold text-gray-900 capitalize">{overview.systemHealth}</p>
                </div>
                <p className="text-sm text-gray-600">{overview.errorRate.toFixed(2)}% error rate</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Analytics Chart */}
      {userAnalytics && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">User Engagement</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Daily Active Users</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={userAnalytics.trends.dailyActiveUsers.map((users: number, index: number) => ({
                  day: index + 1,
                  users
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">User Types</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={Object.entries(userAnalytics.demographics.userTypes).map(([type, count]) => ({
                      name: type,
                      value: count
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {Object.entries(userAnalytics.demographics.userTypes).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* System Performance Chart */}
      {systemAnalytics && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">System Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Response Time Trends</h3>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={systemAnalytics.performance.trends.map((time: number, index: number) => ({
                  time: index + 1,
                  responseTime: time
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="responseTime" stroke="#82ca9d" fill="#82ca9d" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Top Slow Endpoints</h3>
              <div className="space-y-2">
                {systemAnalytics.endpoints.slice(0, 5).map((endpoint: any, index: number) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium text-gray-700 truncate">{endpoint.endpoint}</span>
                    <span className="text-sm text-gray-600">{endpoint.avgResponseTime}ms</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Active Alerts</h2>
          <div className="space-y-3">
            {alerts.filter(alert => alert.status === 'active').slice(0, 5).map((alert) => (
              <div key={alert.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">{alert.type}</span>
                      {alert.isRecurring && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                          Recurring ({alert.occurrenceCount}x)
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 mt-1">{alert.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {alert.ageInHours}h ago • Value: {alert.formattedValue}
                    </p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => handleAlertAction(alert.id, 'resolve')}
                      className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Metrics</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Sessions</span>
                <span className="text-sm font-medium">{overview.totalSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Duration</span>
                <span className="text-sm font-medium">{Math.round(overview.avgSessionDuration)}min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Page Views</span>
                <span className="text-sm font-medium">{overview.totalPageViews}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">User Activity</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Actions</span>
                <span className="text-sm font-medium">{overview.totalActions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Feedback Submitted</span>
                <span className="text-sm font-medium">{overview.totalFeedback}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Error Encounters</span>
                <span className="text-sm font-medium">{overview.totalErrors}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="text-sm font-medium">{overview.systemUptime}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Error Rate</span>
                <span className="text-sm font-medium">{overview.errorRate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Health Status</span>
                <span className={`text-sm font-medium capitalize ${
                  overview.systemHealth === 'excellent' ? 'text-green-600' :
                  overview.systemHealth === 'good' ? 'text-blue-600' :
                  overview.systemHealth === 'warning' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {overview.systemHealth}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;