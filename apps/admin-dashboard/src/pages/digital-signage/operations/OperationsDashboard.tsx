/**
 * Digital Signage Operations Dashboard
 *
 * Summary view for Digital Signage Core operations.
 * Phase 12: Operations convenience features
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  operationsApi,
  OperationsSummary,
  OperationsStats,
} from '@/lib/api/digitalSignage';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

export default function OperationsDashboard() {
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [stats, setStats] = useState<OperationsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [summaryRes, statsRes] = await Promise.all([
      operationsApi.getSummary(),
      operationsApi.getStats(),
    ]);

    if (!summaryRes.success || !statsRes.success) {
      setError('Failed to load operations data');
    } else {
      setSummary(summaryRes.data!);
      setStats(statsRes.data!);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !summary) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Digital Signage Operations</h1>
          <p className="text-muted-foreground text-sm">
            System status overview
          </p>
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Display Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Displays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.totalDisplays ?? 0}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="default" className="bg-green-500">
                {summary?.onlineDisplays ?? 0} Online
              </Badge>
              <Badge variant="secondary">
                {summary?.offlineDisplays ?? 0} Offline
              </Badge>
            </div>
            <Link
              to="/digital-signage/operations/display-status"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              View status map
            </Link>
          </CardContent>
        </Card>

        {/* Slots Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Display Slots
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.totalSlots ?? 0}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="default" className="bg-blue-500">
                {summary?.busySlots ?? 0} Busy
              </Badge>
              <Badge variant="secondary">
                {(summary?.totalSlots ?? 0) - (summary?.busySlots ?? 0)} Idle
              </Badge>
            </div>
            <Link
              to="/digital-signage/display-slots"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              Manage slots
            </Link>
          </CardContent>
        </Card>

        {/* Running Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Running Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary?.runningActions ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Currently executing
            </p>
            <Link
              to="/digital-signage/actions"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              View all actions
            </Link>
          </CardContent>
        </Card>

        {/* Failed Actions (24h) */}
        <Card className={summary?.failedActionsLast24h ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${summary?.failedActionsLast24h ? 'text-destructive' : ''}`}>
              {summary?.failedActionsLast24h ?? 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Actions failed in last 24 hours
            </p>
            <Link
              to="/digital-signage/operations/problems"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              View problems
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Execution Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Executions</span>
                <span className="font-medium">{stats?.totalExecutions ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Runtime</span>
                <span className="font-medium">{formatDuration(stats?.totalRuntime ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Completed</span>
                <Badge variant="default" className="bg-green-500">
                  {stats?.completedCount ?? 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Stopped</span>
                <Badge variant="secondary">{stats?.stoppedCount ?? 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Failed</span>
                <Badge variant="destructive">{stats?.failedCount ?? 0}</Badge>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <Link
                to="/digital-signage/operations/history"
                className="text-sm text-primary hover:underline"
              >
                View full history
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/digital-signage/media/sources">
                <Button variant="outline" className="w-full justify-start">
                  Media Sources
                </Button>
              </Link>
              <Link to="/digital-signage/media/lists">
                <Button variant="outline" className="w-full justify-start">
                  Media Lists
                </Button>
              </Link>
              <Link to="/digital-signage/displays">
                <Button variant="outline" className="w-full justify-start">
                  Displays
                </Button>
              </Link>
              <Link to="/digital-signage/schedules">
                <Button variant="outline" className="w-full justify-start">
                  Schedules
                </Button>
              </Link>
              <Link to="/digital-signage/operations/history">
                <Button variant="outline" className="w-full justify-start">
                  Action History
                </Button>
              </Link>
              <Link to="/digital-signage/operations/problems">
                <Button variant="outline" className="w-full justify-start">
                  Problem Tracking
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
