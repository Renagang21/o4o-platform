import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Server,
  Database,
  Globe,
  Monitor,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Settings,
  Bell,
  Eye,
  BarChart3,
  Gauge
} from 'lucide-react';

interface SystemStatus {
  overallStatus: 'healthy' | 'degraded' | 'down';
  services: ServiceHealth[];
  alerts: {
    active: number;
    critical: number;
    warning: number;
    resolved: number;
  };
  timestamp: string;
}

interface ServiceHealth {
  serviceName: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details: {
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    errorCount: number;
  };
}

interface Alert {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  formattedValue: string;
  ageInMinutes: number;
}

interface MetricData {
  timestamp: string;
  value: number;
}

interface PerformanceMetrics {
  responseTime: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  errorRate: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface InfrastructureMetrics {
  cpu: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  memory: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
  disk: {
    current: number;
    average: number;
    trend: 'up' | 'down' | 'stable';
  };
}

const OperationsDashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [infrastructureMetrics, setInfrastructureMetrics] = useState<InfrastructureMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const [statusResponse, alertsResponse, perfResponse, infraResponse] = await Promise.all([
        fetch('/api/operations/system/status'),
        fetch('/api/operations/alerts?limit=10'),
        fetch('/api/operations/performance/metrics?hours=1'),
        fetch('/api/operations/infrastructure/metrics?hours=1')
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setSystemStatus(statusData.data);
      }

      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json();
        setAlerts(alertsData.data.alerts || []);
      }

      if (perfResponse.ok) {
        const perfData = await perfResponse.json();
        setPerformanceMetrics(perfData.data);
      }

      if (infraResponse.ok) {
        const infraData = await infraResponse.json();
        setInfrastructureMetrics(infraData.data);
      }

      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchDashboardData();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  // Status color helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
      case 'down':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading operations dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 font-medium">Error</span>
        </div>
        <p className="text-red-600 mt-1">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operations Dashboard</h1>
          <p className="text-gray-600">
            24/7 system monitoring and alerting
            {lastUpdated && (
              <span className="ml-2 text-sm">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh: {autoRefresh ? 'On' : 'Off'}
          </button>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Status Overview */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Status</p>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus.overallStatus)}`}>
                  {systemStatus.overallStatus === 'healthy' ? (
                    <CheckCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 mr-1" />
                  )}
                  {systemStatus.overallStatus.charAt(0).toUpperCase() + systemStatus.overallStatus.slice(1)}
                </div>
              </div>
              <Activity className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{systemStatus.alerts.active}</p>
                <p className="text-xs text-red-600">{systemStatus.alerts.critical} critical</p>
              </div>
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Services</p>
                <p className="text-2xl font-bold text-gray-900">{systemStatus.services.length}</p>
                <p className="text-xs text-green-600">
                  {systemStatus.services.filter(s => s.status === 'healthy').length} healthy
                </p>
              </div>
              <Server className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(systemStatus.services.reduce((sum, s) => sum + s.responseTime, 0) / systemStatus.services.length)}ms
                </p>
                {performanceMetrics && (
                  <div className="flex items-center text-xs">
                    {getTrendIcon(performanceMetrics.responseTime.trend)}
                    <span className="ml-1 text-gray-600">vs avg</span>
                  </div>
                )}
              </div>
              <Gauge className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services Health */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Server className="w-5 h-5 mr-2" />
              Services Health
            </h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {systemStatus?.services.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      service.status === 'healthy' ? 'bg-green-500' :
                      service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{service.serviceName}</p>
                      <p className="text-sm text-gray-600">{service.responseTime}ms response</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">CPU: {service.details.cpuUsage.toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">Memory: {service.details.memoryUsage.toFixed(0)}MB</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Recent Alerts
            </h3>
          </div>
          <div className="p-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>No active alerts</p>
                <p className="text-sm">All systems are operating normally</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-sm opacity-75 mt-1">
                          {alert.formattedValue} • {alert.ageInMinutes}m ago
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {(performanceMetrics || infrastructureMetrics) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceMetrics && (
            <>
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Response Time</p>
                  {getTrendIcon(performanceMetrics.responseTime.trend)}
                </div>
                <p className="text-2xl font-bold text-gray-900">{performanceMetrics.responseTime.current}ms</p>
                <p className="text-xs text-gray-600">Avg: {performanceMetrics.responseTime.average}ms</p>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Error Rate</p>
                  {getTrendIcon(performanceMetrics.errorRate.trend)}
                </div>
                <p className="text-2xl font-bold text-gray-900">{performanceMetrics.errorRate.current}%</p>
                <p className="text-xs text-gray-600">Avg: {performanceMetrics.errorRate.average}%</p>
              </div>
            </>
          )}

          {infrastructureMetrics && (
            <>
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">CPU Usage</p>
                  {getTrendIcon(infrastructureMetrics.cpu.trend)}
                </div>
                <p className="text-2xl font-bold text-gray-900">{infrastructureMetrics.cpu.current}%</p>
                <p className="text-xs text-gray-600">Avg: {infrastructureMetrics.cpu.average}%</p>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                  {getTrendIcon(infrastructureMetrics.memory.trend)}
                </div>
                <p className="text-2xl font-bold text-gray-900">{infrastructureMetrics.memory.current}%</p>
                <p className="text-xs text-gray-600">Avg: {infrastructureMetrics.memory.average}%</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a
            href="/api/status"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            Status Page
          </a>
          <a
            href="/health/detailed"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Health Check
          </a>
          <button
            onClick={() => window.open('/api/operations/dashboard', '_blank')}
            className="flex items-center justify-center px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Full Dashboard
          </button>
          <button
            onClick={() => window.open('/api/analytics', '_blank')}
            className="flex items-center justify-center px-4 py-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default OperationsDashboard;