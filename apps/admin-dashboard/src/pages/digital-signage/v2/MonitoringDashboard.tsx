/**
 * Monitoring Dashboard
 *
 * Sprint 2-5: Admin Dashboard - Real-time signage monitoring
 * Phase 2: Digital Signage Production Upgrade
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { authClient } from '@o4o/auth-client';
import {
  ChannelHeartbeat,
  PlaybackLogSummary,
} from '@/lib/api/signageV2';
import {
  RefreshCw,
  Monitor,
  MonitorOff,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Eye,
  Zap,
  Server,
  Cpu,
  HardDrive,
} from 'lucide-react';

// Mock data for demonstration - replace with actual API calls
const mockChannels = [
  { id: '1', name: 'Lobby Display', organizationName: 'HQ Building' },
  { id: '2', name: 'Cafeteria Screen', organizationName: 'HQ Building' },
  { id: '3', name: 'Conference Room A', organizationName: 'HQ Building' },
  { id: '4', name: 'Entrance Kiosk', organizationName: 'Branch Office' },
  { id: '5', name: 'Waiting Area', organizationName: 'Branch Office' },
];

interface MonitoringStats {
  totalChannels: number;
  onlineChannels: number;
  offlineChannels: number;
  warningChannels: number;
  totalPlaybacks: number;
  avgCompletionRate: number;
  errorCount: number;
  avgUptime: number;
}

interface HeartbeatData extends ChannelHeartbeat {
  channelName: string;
  organizationName: string;
  status: 'online' | 'warning' | 'offline';
  currentPlaylist?: string;
  currentMedia?: string;
  memoryUsage?: number;
  cpuUsage?: number;
}

interface PlaybackAnomaly {
  id: string;
  channelId: string;
  channelName: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export default function MonitoringDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Data states
  const [stats, setStats] = useState<MonitoringStats>({
    totalChannels: 0,
    onlineChannels: 0,
    offlineChannels: 0,
    warningChannels: 0,
    totalPlaybacks: 0,
    avgCompletionRate: 0,
    errorCount: 0,
    avgUptime: 0,
  });
  const [heartbeats, setHeartbeats] = useState<HeartbeatData[]>([]);
  const [anomalies, setAnomalies] = useState<PlaybackAnomaly[]>([]);
  const [playbackLogs, setPlaybackLogs] = useState<PlaybackLogSummary[]>([]);

  // Load monitoring data
  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      // In production, these would be actual API calls
      // const [heartbeatRes, anomalyRes, statsRes] = await Promise.all([
      //   authClient.api.get('/api/signage/monitoring/heartbeats'),
      //   authClient.api.get('/api/signage/monitoring/anomalies'),
      //   authClient.api.get('/api/signage/monitoring/stats'),
      // ]);

      // Mock data for demonstration
      const mockHeartbeats: HeartbeatData[] = mockChannels.map((ch, idx) => ({
        channelId: ch.id,
        channelName: ch.name,
        organizationName: ch.organizationName,
        lastHeartbeat: new Date(Date.now() - Math.random() * 300000).toISOString(),
        playerVersion: '2.0.1',
        deviceType: idx % 2 === 0 ? 'web' : 'android',
        platform: idx % 2 === 0 ? 'Chrome/120.0' : 'Android TV 12',
        uptimeSec: Math.floor(Math.random() * 86400),
        isOnline: Math.random() > 0.2,
        status: Math.random() > 0.8 ? 'warning' : Math.random() > 0.15 ? 'online' : 'offline',
        currentPlaylist: `Playlist ${Math.floor(Math.random() * 5) + 1}`,
        currentMedia: `Media Item ${Math.floor(Math.random() * 10) + 1}`,
        memoryUsage: 30 + Math.random() * 50,
        cpuUsage: 10 + Math.random() * 40,
      }));

      const mockAnomalies: PlaybackAnomaly[] = [
        {
          id: '1',
          channelId: '2',
          channelName: 'Cafeteria Screen',
          type: 'error',
          message: 'Media playback failed: Network timeout',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
        },
        {
          id: '2',
          channelId: '4',
          channelName: 'Entrance Kiosk',
          type: 'warning',
          message: 'High memory usage detected (85%)',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '3',
          channelId: '1',
          channelName: 'Lobby Display',
          type: 'info',
          message: 'Player updated to version 2.0.1',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: '4',
          channelId: '3',
          channelName: 'Conference Room A',
          type: 'warning',
          message: 'Schedule conflict detected',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
        },
      ];

      const onlineCount = mockHeartbeats.filter(h => h.status === 'online').length;
      const warningCount = mockHeartbeats.filter(h => h.status === 'warning').length;
      const offlineCount = mockHeartbeats.filter(h => h.status === 'offline').length;

      setHeartbeats(mockHeartbeats);
      setAnomalies(mockAnomalies);
      setStats({
        totalChannels: mockChannels.length,
        onlineChannels: onlineCount,
        offlineChannels: offlineCount,
        warningChannels: warningCount,
        totalPlaybacks: Math.floor(Math.random() * 10000) + 5000,
        avgCompletionRate: 85 + Math.random() * 12,
        errorCount: mockAnomalies.filter(a => a.type === 'error').length,
        avgUptime: 95 + Math.random() * 4,
      });
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  // Format uptime
  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  // Format relative time
  const formatRelativeTime = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  // Get anomaly icon
  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time status of all signage channels
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </div>
          <Select
            value={refreshInterval.toString()}
            onValueChange={(v) => setRefreshInterval(parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {autoRefresh ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Online Channels</p>
                <p className="text-3xl font-bold">
                  {stats.onlineChannels}
                  <span className="text-lg text-muted-foreground">/{stats.totalChannels}</span>
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Monitor className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-3">
              <Progress
                value={(stats.onlineChannels / stats.totalChannels) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Uptime</p>
                <p className="text-3xl font-bold">{stats.avgUptime.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-sm">
              {stats.avgUptime >= 99 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Excellent</span>
                </>
              ) : stats.avgUptime >= 95 ? (
                <>
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-600">Good</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-600">Needs attention</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
                <p className="text-3xl font-bold">{stats.avgCompletionRate.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              {stats.totalPlaybacks.toLocaleString()} total playbacks
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Errors</p>
                <p className="text-3xl font-bold">{stats.errorCount}</p>
              </div>
              <div className={`h-12 w-12 rounded-full ${stats.errorCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'} flex items-center justify-center`}>
                <AlertTriangle className={`h-6 w-6 ${stats.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={stats.warningChannels > 0 ? 'secondary' : 'outline'}>
                {stats.warningChannels} warnings
              </Badge>
              <Badge variant={stats.offlineChannels > 0 ? 'destructive' : 'outline'}>
                {stats.offlineChannels} offline
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels" className="gap-2">
            <Monitor className="h-4 w-4" />
            Channels ({heartbeats.length})
          </TabsTrigger>
          <TabsTrigger value="anomalies" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Anomalies ({anomalies.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Zap className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Channel Status</CardTitle>
              <CardDescription>
                Real-time heartbeat data from all connected players
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Organization</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Last Heartbeat</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Resources</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heartbeats.map((hb) => (
                    <TableRow key={hb.channelId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(hb.status)}
                          <Badge
                            variant="outline"
                            className={`${getStatusColor(hb.status)} text-white border-0`}
                          >
                            {hb.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{hb.channelName}</p>
                          {hb.currentPlaylist && (
                            <p className="text-xs text-muted-foreground">
                              Playing: {hb.currentPlaylist}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{hb.organizationName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{hb.deviceType}</p>
                          <p className="text-xs text-muted-foreground">{hb.platform}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">v{hb.playerVersion}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(hb.lastHeartbeat)}
                        </div>
                      </TableCell>
                      <TableCell>{formatUptime(hb.uptimeSec)}</TableCell>
                      <TableCell>
                        <div className="space-y-1 min-w-[100px]">
                          <div className="flex items-center gap-2 text-xs">
                            <Cpu className="h-3 w-3" />
                            <Progress value={hb.cpuUsage} className="h-1.5 flex-1" />
                            <span className="w-8">{hb.cpuUsage?.toFixed(0)}%</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <HardDrive className="h-3 w-3" />
                            <Progress value={hb.memoryUsage} className="h-1.5 flex-1" />
                            <span className="w-8">{hb.memoryUsage?.toFixed(0)}%</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies">
          <Card>
            <CardHeader>
              <CardTitle>Playback Anomalies</CardTitle>
              <CardDescription>
                Recent errors, warnings, and notable events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {anomalies.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <p className="text-muted-foreground">No anomalies detected</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {anomalies.map((anomaly) => (
                    <div
                      key={anomaly.id}
                      className={`p-4 border rounded-lg ${
                        anomaly.type === 'error'
                          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'
                          : anomaly.type === 'warning'
                          ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30'
                          : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getAnomalyIcon(anomaly.type)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{anomaly.channelName}</span>
                              <Badge variant="outline" className="text-xs">
                                {anomaly.type}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(anomaly.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{anomaly.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Playback Statistics</CardTitle>
                <CardDescription>24-hour performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Play className="h-5 w-5 text-green-500" />
                      <span>Total Playbacks</span>
                    </div>
                    <span className="text-xl font-bold">{stats.totalPlaybacks.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-500" />
                      <span>Completion Rate</span>
                    </div>
                    <span className="text-xl font-bold">{stats.avgCompletionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span>Error Rate</span>
                    </div>
                    <span className="text-xl font-bold">
                      {((stats.errorCount / stats.totalPlaybacks) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Eye className="h-5 w-5 text-purple-500" />
                      <span>Avg. View Duration</span>
                    </div>
                    <span className="text-xl font-bold">32.5s</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Infrastructure metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        <span className="text-sm">API Response Time</span>
                      </div>
                      <span className="text-sm font-medium">45ms</span>
                    </div>
                    <Progress value={15} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        <span className="text-sm">Storage Usage</span>
                      </div>
                      <span className="text-sm font-medium">2.3 GB / 10 GB</span>
                    </div>
                    <Progress value={23} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span className="text-sm">WebSocket Connections</span>
                      </div>
                      <span className="text-sm font-medium">{stats.onlineChannels} active</span>
                    </div>
                    <Progress value={(stats.onlineChannels / 100) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm">CDN Cache Hit Rate</span>
                      </div>
                      <span className="text-sm font-medium">94.2%</span>
                    </div>
                    <Progress value={94.2} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Channel Performance Comparison</CardTitle>
                <CardDescription>Performance metrics by channel</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Playbacks (24h)</TableHead>
                      <TableHead>Completion Rate</TableHead>
                      <TableHead>Errors</TableHead>
                      <TableHead>Avg. Load Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockChannels.map((ch, idx) => {
                      const playbacks = Math.floor(Math.random() * 500) + 100;
                      const completion = 80 + Math.random() * 18;
                      const errors = Math.floor(Math.random() * 5);
                      const loadTime = (0.5 + Math.random() * 2).toFixed(1);

                      return (
                        <TableRow key={ch.id}>
                          <TableCell className="font-medium">{ch.name}</TableCell>
                          <TableCell>{playbacks}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={completion} className="w-20 h-2" />
                              <span className="text-sm">{completion.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={errors > 0 ? 'destructive' : 'outline'}>
                              {errors}
                            </Badge>
                          </TableCell>
                          <TableCell>{loadTime}s</TableCell>
                          <TableCell>
                            {idx % 4 === 0 ? (
                              <Badge variant="outline" className="bg-green-500 text-white border-0">
                                Excellent
                              </Badge>
                            ) : idx % 3 === 0 ? (
                              <Badge variant="outline" className="bg-yellow-500 text-white border-0">
                                Good
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-500 text-white border-0">
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
