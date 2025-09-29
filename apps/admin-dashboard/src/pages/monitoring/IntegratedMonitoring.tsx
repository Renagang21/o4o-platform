import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Shield, 
  AlertTriangle, 
  HardDrive, 
  Activity,
  RefreshCw,
  Download,
  Calendar,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { authClient } from '@o4o/auth-client';
import PerformanceDashboard from './PerformanceDashboard';

interface MonitoringSummary {
  backup: {
    lastBackup: Date | null;
    nextBackup: Date | null;
    backupSize: string;
    status: 'success' | 'failed' | 'running';
    totalBackups: number;
    failedBackups: number;
  };
  errors: {
    critical: number;
    error: number;
    warning: number;
    recent: Array<{
      id: string;
      level: string;
      message: string;
      timestamp: Date;
    }>;
  };
  security: {
    blockedIPs: number;
    failedLogins: number;
    suspiciousActivities: number;
    recentEvents: Array<{
      id: string;
      type: string;
      severity: string;
      ipAddress: string;
      timestamp: Date;
    }>;
  };
  system: {
    health: 'healthy' | 'degraded' | 'critical';
    uptime: number;
    cpu: number;
    memory: number;
    disk: number;
  };
}

export default function IntegratedMonitoring() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch monitoring summary
  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ['monitoring-summary'],
    queryFn: async () => {
      const response = await authClient.api.get<MonitoringSummary>('/monitoring/summary');
      return response.data;
    },
    refetchInterval: 30000 // 30 seconds
  });

  // Manual backup trigger
  const triggerBackup = async () => {
    try {
      await authClient.api.post('/monitoring/backup/trigger');
      refetch();
    } catch (error) {
    // Error logging - use proper error handler
    }
  };

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
      </div>
    );
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'degraded': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, 'destructive' | 'secondary' | 'default'> = {
      critical: 'destructive',
      high: 'destructive',
      error: 'destructive',
      warning: 'default',
      medium: 'default',
      low: 'secondary',
      info: 'secondary'
    };
    return <Badge variant={colors[severity] || 'default'}>{severity}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-gray-500 mt-1">Comprehensive system health and security monitoring</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Health Alert */}
      {summary.system.health !== 'healthy' && (
        <Alert variant={summary.system.health === 'critical' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>System Health: {summary.system.health.toUpperCase()}</AlertTitle>
          <AlertDescription>
            System performance is {summary.system.health}. Please check the performance dashboard for details.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Health */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className={`w-4 h-4 ${getHealthColor(summary.system.health)}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold capitalize ${getHealthColor(summary.system.health)}`}>
              {summary.system.health}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>CPU: {summary.system.cpu}%</span>
              <span>Mem: {summary.system.memory}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Backup Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">Backup Status</CardTitle>
              <HardDrive className={`w-4 h-4 ${summary.backup.status === 'success' ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.backup.status === 'running' ? (
                <span className="text-blue-500">Running...</span>
              ) : (
                summary.backup.lastBackup ? 
                  new Date(summary.backup.lastBackup).toLocaleDateString() : 
                  'Never'
              )}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{summary.backup.totalBackups} total</span>
              <span>{summary.backup.backupSize}</span>
            </div>
          </CardContent>
        </Card>

        {/* Error Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">Error Alerts</CardTitle>
              <AlertTriangle className={`w-4 h-4 ${summary.errors.critical > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-4">
              <span className="text-2xl font-bold text-red-500">{summary.errors.critical}</span>
              <span className="text-lg text-orange-500">{summary.errors.error}</span>
              <span className="text-sm text-yellow-500">{summary.errors.warning}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Critical / Error / Warning</p>
          </CardContent>
        </Card>

        {/* Security Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">Security</CardTitle>
              <Shield className={`w-4 h-4 ${summary.security.suspiciousActivities > 0 ? 'text-yellow-500' : 'text-green-500'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Blocked IPs</span>
                <span className="font-medium">{summary.security.blockedIPs}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Failed Logins</span>
                <span className="font-medium">{summary.security.failedLogins}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Errors */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Errors</CardTitle>
                <CardDescription>Latest error alerts from the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.errors.recent.length === 0 ? (
                    <p className="text-sm text-gray-500">No recent errors</p>
                  ) : summary.errors.recent && Array.isArray(summary.errors.recent) ? (
                    summary.errors.recent.slice(0, 5).map((error) => (
                      <div key={error.id} className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium line-clamp-1">{error.message}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(error.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {getSeverityBadge(error.level)}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No recent errors</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Security Events */}
            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>Latest security-related activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.security.recentEvents && Array.isArray(summary.security.recentEvents) && summary.security.recentEvents.length > 0 ? (
                    summary.security.recentEvents.slice(0, 5).map((event) => (
                      <div key={event.id} className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{event.type}</p>
                          <p className="text-xs text-gray-500">
                            {event.ipAddress} • {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {getSeverityBadge(event.severity)}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No recent security events</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common monitoring and maintenance tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4"
                  onClick={triggerBackup}
                  disabled={summary.backup.status === 'running'}
                >
                  <Download className="w-5 h-5 mb-2" />
                  <span className="text-xs">Manual Backup</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4"
                  onClick={() => setActiveTab('errors')}
                >
                  <AlertTriangle className="w-5 h-5 mb-2" />
                  <span className="text-xs">View Errors</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4"
                  onClick={() => setActiveTab('security')}
                >
                  <Shield className="w-5 h-5 mb-2" />
                  <span className="text-xs">Security Logs</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex-col py-4"
                  onClick={() => window.location.href = '/admin/settings'}>
                  <Settings className="w-5 h-5 mb-2" />
                  <span className="text-xs">Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceDashboard />
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Management</CardTitle>
              <CardDescription>Manage and monitor system backups</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Backup Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Last Backup</p>
                  <p className="font-medium">
                    {summary.backup.lastBackup ? 
                      new Date(summary.backup.lastBackup).toLocaleString() : 
                      'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Next Backup</p>
                  <p className="font-medium">
                    {summary.backup.nextBackup ? 
                      new Date(summary.backup.nextBackup).toLocaleString() : 
                      'Not scheduled'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="font-medium">
                    {summary.backup.totalBackups > 0 
                      ? `${((summary.backup.totalBackups - summary.backup.failedBackups) / summary.backup.totalBackups * 100).toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Size</p>
                  <p className="font-medium">{summary.backup.backupSize}</p>
                </div>
              </div>

              {/* Backup Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={triggerBackup}
                  disabled={summary.backup.status === 'running'}
                >
                  {summary.backup.status === 'running' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Start Backup
                    </>
                  )}
                </Button>
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors">
          {/* Error details would go here */}
          <Card>
            <CardHeader>
              <CardTitle>Error Log</CardTitle>
              <CardDescription>System errors and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Error log details would be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          {/* Security details would go here */}
          <Card>
            <CardHeader>
              <CardTitle>Security Audit Log</CardTitle>
              <CardDescription>Security events and access logs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Security audit log would be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}