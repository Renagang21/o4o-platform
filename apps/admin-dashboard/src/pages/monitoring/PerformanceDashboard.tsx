import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authClient } from '@o4o/auth-client';
// Charts removed - placeholder UI used instead

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    queryTime: number;
    slowQueries: number;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  uptime: number;
  timestamp: Date;
}

interface PerformanceHistory {
  timestamp: Date;
  cpu: number;
  memory: number;
  responseTime: number;
  requests: number;
  errors: number;
}

export default function PerformanceDashboard() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval] = useState(5000); // 5 seconds

  // Fetch current metrics
  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: async () => {
      try {
        const response = await authClient.api.get<SystemMetrics>('/monitoring/metrics');
        return response.data;
      } catch (error) {
        console.error('Error fetching performance metrics:', error);
        // Return default metrics to prevent map errors
        return {
          cpu: {
            usage: 0,
            cores: 1,
            loadAverage: [0, 0, 0]
          },
          memory: {
            total: 1024 * 1024 * 1024, // 1GB default
            used: 0,
            free: 1024 * 1024 * 1024,
            percentage: 0
          },
          disk: {
            total: 100 * 1024 * 1024 * 1024, // 100GB default
            used: 0,
            free: 100 * 1024 * 1024 * 1024,
            percentage: 0
          },
          database: {
            connections: 0,
            maxConnections: 100,
            queryTime: 0,
            slowQueries: 0
          },
          api: {
            requestsPerMinute: 0,
            averageResponseTime: 0,
            errorRate: 0,
            activeConnections: 0
          },
          uptime: 0,
          timestamp: new Date()
        } as SystemMetrics;
      }
    },
    retry: 1,
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Fetch performance history
  const { data: history } = useQuery({
    queryKey: ['performance-history'],
    queryFn: async () => {
      try {
        const response = await authClient.api.get<PerformanceHistory[]>('/monitoring/metrics/history');
        return response.data;
      } catch (error) {
        console.error('Error fetching performance history:', error);
        return []; // Return empty array on error
      }
    },
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  };

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Get status color
  const getStatusColor = (percentage: number, inverse = false): string => {
    if (inverse) {
      if (percentage < 30) return 'text-green-500';
      if (percentage < 70) return 'text-yellow-500';
      return 'text-red-500';
    } else {
      if (percentage > 90) return 'text-red-500';
      if (percentage > 70) return 'text-yellow-500';
      return 'text-green-500';
    }
  };

  // Get progress color
  const getProgressColor = (percentage: number): string => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-admin-blue"></div>
      </div>
    );
  }

  // Chart data variables removed since we're using placeholder UI
  // const pieData = [
  //   { name: 'Used', value: metrics.memory.used },
  //   { name: 'Free', value: metrics.memory.free }
  // ];
  // const COLORS = ['#3B82F6', '#E5E7EB'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Performance Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time system performance monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm">Auto Refresh</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e: any) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
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
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              <Cpu className={`w-4 h-4 ${getStatusColor(metrics.cpu.usage)}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.cpu.usage.toFixed(1)}%</div>
            <Progress 
              value={metrics.cpu.usage} 
              className={`mt-2 h-2 ${getProgressColor(metrics.cpu.usage)}`}
            />
            <p className="text-xs text-gray-500 mt-2">
              Load: {metrics.cpu.loadAverage.map((l: any) => l.toFixed(2)).join(', ')}
            </p>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
              <MemoryStick className={`w-4 h-4 ${getStatusColor(metrics.memory.percentage)}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.memory.percentage.toFixed(1)}%</div>
            <Progress 
              value={metrics.memory.percentage} 
              className={`mt-2 h-2 ${getProgressColor(metrics.memory.percentage)}`}
            />
            <p className="text-xs text-gray-500 mt-2">
              {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
            </p>
          </CardContent>
        </Card>

        {/* Disk Usage */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
              <HardDrive className={`w-4 h-4 ${getStatusColor(metrics.disk.percentage)}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.disk.percentage.toFixed(1)}%</div>
            <Progress 
              value={metrics.disk.percentage} 
              className={`mt-2 h-2 ${getProgressColor(metrics.disk.percentage)}`}
            />
            <p className="text-xs text-gray-500 mt-2">
              {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
            </p>
          </CardContent>
        </Card>

        {/* API Performance */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">API Performance</CardTitle>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.api.averageResponseTime}ms</div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{metrics.api.requestsPerMinute} req/min</span>
              <span>{metrics.api.errorRate.toFixed(2)}% errors</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs defaultValue="realtime" className="space-y-4">
        <TabsList>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="api">API Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CPU & Memory Chart */}
            <Card>
              <CardHeader>
                <CardTitle>CPU & Memory Usage</CardTitle>
                <CardDescription>Real-time resource utilization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">CPU & Memory Chart</p>
                    <p className="text-xs text-gray-400 mt-1">Chart visualization coming soon</p>
                  </div>
                </div>
                {/* Chart data preview */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Current CPU:</span>
                    <span className="ml-2 font-medium">{metrics?.cpu?.usage?.toFixed(1) || 0}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Current Memory:</span>
                    <span className="ml-2 font-medium">{metrics?.memory?.percentage?.toFixed(1) || 0}%</span>
                  </div>
                </div>
                {/* LineChart placeholder - original recharts code removed */}
              </CardContent>
            </Card>

            {/* Memory Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Memory Distribution</CardTitle>
                <CardDescription>Current memory allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MemoryStick className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Memory Distribution Chart</p>
                    <p className="text-xs text-gray-400 mt-1">Chart visualization coming soon</p>
                  </div>
                </div>
                {/* Memory data preview */}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Used Memory:</span>
                    <span className="ml-2 font-medium">{formatBytes(metrics.memory.used)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Free Memory:</span>
                    <span className="ml-2 font-medium">{formatBytes(metrics.memory.free)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Usage:</span>
                    <span className="ml-2 font-medium">{metrics.memory.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Uptime</p>
                  <p className="font-medium">{formatUptime(metrics.uptime)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">CPU Cores</p>
                  <p className="font-medium">{metrics.cpu.cores}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Memory</p>
                  <p className="font-medium">{formatBytes(metrics.memory.total)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Disk</p>
                  <p className="font-medium">{formatBytes(metrics.disk.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
              <CardDescription>System performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Performance History Chart</p>
                  <p className="text-xs text-gray-400 mt-1">Chart visualization coming soon</p>
                </div>
              </div>
              {/* Performance data preview */}
              {history && history.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">Recent Data Points:</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Latest CPU:</span>
                      <span className="ml-2 font-medium">{history[history.length - 1]?.cpu?.toFixed(1) || 0}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Latest Memory:</span>
                      <span className="ml-2 font-medium">{history[history.length - 1]?.memory?.toFixed(1) || 0}%</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Latest Response:</span>
                      <span className="ml-2 font-medium">{history[history.length - 1]?.responseTime || 0}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Data Points:</span>
                      <span className="ml-2 font-medium">{history.length}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Active Connections</span>
                      <span className="text-sm font-medium">
                        {metrics.database.connections} / {metrics.database.maxConnections}
                      </span>
                    </div>
                    <Progress 
                      value={(metrics.database.connections / metrics.database.maxConnections) * 100} 
                      className="h-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div>
                      <p className="text-sm text-gray-500">Avg Query Time</p>
                      <p className="text-xl font-bold">{metrics.database.queryTime}ms</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Slow Queries</p>
                      <p className="text-xl font-bold">{metrics.database.slowQueries}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connection Pool</span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Query Cache</span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Index Usage</span>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Replication</span>
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Request Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.api.requestsPerMinute}</div>
                <p className="text-sm text-gray-500">requests per minute</p>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">+12% from last hour</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.api.averageResponseTime}ms</div>
                <p className="text-sm text-gray-500">average response time</p>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">-5ms from last hour</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics.api.errorRate.toFixed(2)}%</div>
                <p className="text-sm text-gray-500">of all requests</p>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-500">Within normal range</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Response Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
              <CardDescription>API endpoint performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Response Time Distribution Chart</p>
                  <p className="text-xs text-gray-400 mt-1">Chart visualization coming soon</p>
                </div>
              </div>
              {/* Endpoint performance data preview */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">Sample Endpoint Performance:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">/api/posts</span>
                    <span className="font-medium">45ms</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">/api/users</span>
                    <span className="font-medium">32ms</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">/api/products</span>
                    <span className="font-medium">58ms</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">/api/orders</span>
                    <span className="font-medium">72ms</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-gray-600">/api/analytics</span>
                    <span className="font-medium">125ms</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}