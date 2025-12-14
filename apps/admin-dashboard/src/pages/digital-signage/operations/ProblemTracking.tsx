/**
 * Digital Signage Problem Tracking
 *
 * Simple view of failed actions and offline displays.
 * Phase 12: Operations convenience features
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  operationsApi,
  ActionExecution,
  Display,
} from '@/lib/api/digitalSignage';

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeSince(dateStr?: string): string {
  if (!dateStr) return 'Never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export default function ProblemTracking() {
  const [failedActions, setFailedActions] = useState<ActionExecution[]>([]);
  const [offlineDisplays, setOfflineDisplays] = useState<Display[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [failedRes, offlineRes] = await Promise.all([
      operationsApi.getFailedActions(),
      operationsApi.getOfflineDisplays(),
    ]);

    if (!failedRes.success || !offlineRes.success) {
      setError('Failed to load problem data');
    } else {
      setFailedActions(failedRes.data || []);
      setOfflineDisplays(offlineRes.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const hasProblems = failedActions.length > 0 || offlineDisplays.length > 0;

  if (loading && failedActions.length === 0 && offlineDisplays.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Problem Tracking</h1>
          <p className="text-muted-foreground text-sm">
            Failed actions and offline displays
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/digital-signage/operations">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
          <Button onClick={loadData} variant="outline" disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* No Problems */}
      {!hasProblems && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-4xl mb-4">All systems operational</div>
            <p className="text-muted-foreground">
              No failed actions or offline displays detected.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Failed Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Failed Actions
              {failedActions.length > 0 && (
                <Badge variant="destructive">{failedActions.length}</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {failedActions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No failed actions
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Media List</TableHead>
                  <TableHead>Display Slot</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedActions.slice(0, 10).map(action => (
                  <TableRow key={action.id}>
                    <TableCell>
                      <div>{formatDate(action.createdAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeSince(action.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {action.mediaList?.name || action.mediaListId.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      {action.displaySlot?.name || action.displaySlotId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      <span className="text-destructive text-sm">
                        {action.error || 'Unknown error'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link to={`/digital-signage/actions/${action.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {failedActions.length > 10 && (
            <div className="mt-4 text-center">
              <Link to="/digital-signage/operations/history?status=failed">
                <Button variant="link">
                  View all {failedActions.length} failed actions
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offline Displays */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Offline Displays
              {offlineDisplays.length > 0 && (
                <Badge variant="destructive">{offlineDisplays.length}</Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {offlineDisplays.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              All displays are online
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Heartbeat</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offlineDisplays.map(display => (
                  <TableRow key={display.id}>
                    <TableCell className="font-medium">{display.name}</TableCell>
                    <TableCell>{display.location || '-'}</TableCell>
                    <TableCell>
                      <div>{formatDate(display.lastHeartbeat)}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTimeSince(display.lastHeartbeat)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {display.deviceId || '-'}
                    </TableCell>
                    <TableCell>
                      <Link to={`/digital-signage/displays/${display.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      {hasProblems && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Troubleshooting Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>Offline displays:</strong> Check network connectivity and power status. Verify the Device Agent is running.
              </li>
              <li>
                <strong>Failed actions:</strong> Review the error message for details. Common causes include invalid media URLs or slot configuration issues.
              </li>
              <li>
                <strong>Repeated failures:</strong> Consider checking the schedule configuration or media list integrity.
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
