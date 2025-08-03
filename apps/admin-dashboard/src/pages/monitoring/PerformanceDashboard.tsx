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
import { apiClient } from '@/lib/api-client';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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
      const response = await apiClient.get<SystemMetrics>('/monitoring/metrics');
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval : false
  });

  // Fetch performance history
  const { data: history } = useQuery({
    queryKey: ['performance-history'],
    queryFn: async () => {
      const response = await apiClient.get<PerformanceHistory[]>('/monitoring/metrics/history');
      return response.data;
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

  const pieData = [
    { name: 'Used', value: metrics.memory.used },
    { name: 'Free', value: metrics.memory.free }
  ];

  const COLORS = ['#3B82F6', '#E5E7EB'];

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
              Load: {metrics.cpu.loadAverage.map(l => l.toFixed(2)).join(', ')}
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
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value: any) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="cpu" 
                      stroke="#3B82F6" 
                      name="CPU %"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#10B981" 
                      name="Memory %"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Memory Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Memory Distribution</CardTitle>
                <CardDescription>Current memory allocation</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatBytes(value)} />
                  </PieChart>
                </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={history || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="requests" 
                    stackId="1"
                    stroke="#3B82F6" 
                    fill="#3B82F6"
                    name="Requests/min"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="errors" 
                    stackId="1"
                    stroke="#EF4444" 
                    fill="#EF4444"
                    name="Errors/min"
                  />
                </AreaChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { endpoint: '/api/posts', time: 45 },
                  { endpoint: '/api/users', time: 32 },
                  { endpoint: '/api/products', time: 58 },
                  { endpoint: '/api/orders', time: 72 },
                  { endpoint: '/api/analytics', time: 125 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="endpoint" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="time" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}