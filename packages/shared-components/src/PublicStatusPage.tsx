import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Globe,
  Server,
  Database,
  Monitor
} from 'lucide-react';

interface StatusPageData {
  overall: {
    status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'maintenance';
    message: string;
  };
  components: Component[];
  incidents: {
    active: Incident[];
    recent: Incident[];
  };
  maintenance: {
    upcoming: Maintenance[];
    active: Maintenance[];
  };
  lastUpdated: string;
}

interface Component {
  id: string;
  name: string;
  status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'maintenance';
  uptime: number;
  responseTime?: number;
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: 'none' | 'minor' | 'major' | 'critical';
  createdAt: string;
  updates?: IncidentUpdate[];
}

interface IncidentUpdate {
  id: string;
  status: string;
  message: string;
  timestamp: string;
}

interface Maintenance {
  id: string;
  title: string;
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

const PublicStatusPage: React.FC = () => {
  const [statusData, setStatusData] = useState<StatusPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStatusData = async () => {
    try {
      const response = await fetch('/api/status');
      if (response.ok) {
        const data = await response.json();
        setStatusData(data.data || data);
        setLastRefresh(new Date());
        setError(null);
      } else {
        throw new Error('Failed to fetch status data');
      }
    } catch (err) {
      console.error('Failed to fetch status data:', err);
      setError('Unable to load system status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusData();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchStatusData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded_performance':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'partial_outage':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'major_outage':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'maintenance':
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'degraded_performance':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'partial_outage':
        return 'text-orange-700 bg-orange-50 border-orange-200';
      case 'major_outage':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'maintenance':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case 'investigating':
        return 'text-red-700 bg-red-100';
      case 'identified':
        return 'text-orange-700 bg-orange-100';
      case 'monitoring':
        return 'text-yellow-700 bg-yellow-100';
      case 'resolved':
        return 'text-green-700 bg-green-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const getComponentIcon = (name: string) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('api')) return <Server className="w-5 h-5" />;
    if (lowerName.includes('database')) return <Database className="w-5 h-5" />;
    if (lowerName.includes('web') || lowerName.includes('website')) return <Globe className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading system status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Status</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchStatusData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!statusData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">System Status</h1>
          <p className="text-gray-600">Current status of all our services and systems</p>
          {lastRefresh && (
            <p className="text-sm text-gray-500 mt-2">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Overall Status */}
        <div className={`rounded-lg border p-6 mb-8 ${getStatusColor(statusData.overall.status)}`}>
          <div className="flex items-center justify-center mb-4">
            {getStatusIcon(statusData.overall.status)}
            <h2 className="text-xl font-semibold ml-2">
              {statusData.overall.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h2>
          </div>
          <p className="text-center">{statusData.overall.message}</p>
        </div>

        {/* Active Incidents */}
        {statusData.incidents.active.length > 0 && (
          <div className="bg-white rounded-lg border mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                Active Incidents
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {statusData.incidents.active.map((incident) => (
                <div key={incident.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{incident.title}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getIncidentStatusColor(incident.status)}`}>
                      {incident.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Started: {formatDate(incident.createdAt)}
                  </p>
                  {incident.updates && incident.updates.length > 0 && (
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Latest Update:</p>
                      <p className="text-sm text-gray-600">
                        {incident.updates[incident.updates.length - 1].message}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Maintenance */}
        {(statusData.maintenance.active.length > 0 || statusData.maintenance.upcoming.length > 0) && (
          <div className="bg-white rounded-lg border mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                Scheduled Maintenance
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {statusData.maintenance.active.map((maintenance) => (
                <div key={maintenance.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{maintenance.title}</h4>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                      In Progress
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{maintenance.description}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(maintenance.scheduledStart)} - {formatDate(maintenance.scheduledEnd)}
                  </p>
                </div>
              ))}
              {statusData.maintenance.upcoming.map((maintenance) => (
                <div key={maintenance.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{maintenance.title}</h4>
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                      Scheduled
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{maintenance.description}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(maintenance.scheduledStart)} - {formatDate(maintenance.scheduledEnd)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Components Status */}
        <div className="bg-white rounded-lg border mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Service Status</h3>
          </div>
          <div className="p-6">
            <div className="grid gap-4">
              {statusData.components.map((component) => (
                <div key={component.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    {getComponentIcon(component.name)}
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{component.name}</p>
                      <div className="flex items-center mt-1">
                        {getStatusIcon(component.status)}
                        <span className="ml-2 text-sm text-gray-600">
                          {component.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Uptime: {formatUptime(component.uptime)}
                    </p>
                    {component.responseTime && (
                      <p className="text-sm text-gray-600">
                        Response: {component.responseTime}ms
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Incidents */}
        {statusData.incidents.recent.length > 0 && (
          <div className="bg-white rounded-lg border">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent Incidents</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {statusData.incidents.recent.slice(0, 5).map((incident) => (
                  <div key={incident.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{incident.title}</p>
                      <p className="text-sm text-gray-600">{formatDate(incident.createdAt)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getIncidentStatusColor(incident.status)}`}>
                      {incident.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Subscribe to updates • Contact support • View incident history
          </p>
          <button
            onClick={fetchStatusData}
            className="mt-4 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors inline-flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh Status
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublicStatusPage;