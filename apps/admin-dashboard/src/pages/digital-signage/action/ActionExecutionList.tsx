/**
 * Action Execution List
 *
 * List view for action executions with manual control
 * Phase 6: Digital Signage Management UI
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AGTable, type AGTableColumn } from '@/components/ag/AGTable';
import {
  Play,
  Pause,
  Square,
  PlayCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  actionApi,
  type ActionExecution,
  type ExecutionStatus,
} from '@/lib/api/digitalSignage';

const STATUS_CONFIG: Record<ExecutionStatus, { color: string; label: string }> = {
  pending: { color: 'bg-gray-100 text-gray-700', label: 'Pending' },
  running: { color: 'bg-blue-100 text-blue-700', label: 'Running' },
  paused: { color: 'bg-yellow-100 text-yellow-700', label: 'Paused' },
  completed: { color: 'bg-green-100 text-green-700', label: 'Completed' },
  stopped: { color: 'bg-orange-100 text-orange-700', label: 'Stopped' },
  failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
};

export default function ActionExecutionList() {
  const [actions, setActions] = useState<ActionExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controllingId, setControllingId] = useState<string | null>(null);

  const fetchActions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await actionApi.listExecutions();
      if (response.success && response.data) {
        setActions(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load actions');
      }
    } catch (err) {
      setError('Failed to load actions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
    // Refresh every 10 seconds for active actions
    const interval = setInterval(fetchActions, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleControl = async (
    id: string,
    action: 'pause' | 'resume' | 'stop'
  ) => {
    setControllingId(id);
    setError(null);

    try {
      let response;
      switch (action) {
        case 'pause':
          response = await actionApi.pause(id);
          break;
        case 'resume':
          response = await actionApi.resume(id);
          break;
        case 'stop':
          response = await actionApi.stop(id);
          break;
      }

      if (response.success) {
        fetchActions();
      } else {
        setError(response.error || `Failed to ${action}`);
      }
    } catch (err) {
      setError(`Failed to ${action}`);
    } finally {
      setControllingId(null);
    }
  };

  const columns: AGTableColumn<ActionExecution>[] = [
    {
      key: 'status',
      header: 'Status',
      render: (action) => {
        const config = STATUS_CONFIG[action.status];
        return (
          <Badge className={config.color}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'mediaSource',
      header: 'Media',
      render: (action) => (
        <Link
          to={`/admin/digital-signage/actions/${action.id}`}
          className="font-medium text-primary hover:underline"
        >
          {action.mediaList?.name || action.mediaListId}
        </Link>
      ),
    },
    {
      key: 'displaySlot',
      header: 'Display Slot',
      render: (action) => (
        <span className="text-sm">
          {action.displaySlot?.name || action.displaySlotId}
        </span>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (action) => (
        action.schedule ? (
          <Link
            to={`/admin/digital-signage/schedules/${action.scheduleId}`}
            className="text-sm text-primary hover:underline"
          >
            {action.schedule.name}
          </Link>
        ) : (
          <span className="text-sm text-muted-foreground">
            {action.scheduleId ? 'Unknown' : 'Manual'}
          </span>
        )
      ),
    },
    {
      key: 'startedAt',
      header: 'Started',
      render: (action) => (
        <span className="text-sm text-muted-foreground">
          {action.startedAt
            ? new Date(action.startedAt).toLocaleString()
            : '-'}
        </span>
      ),
    },
    {
      key: 'completedAt',
      header: 'Ended',
      render: (action) => (
        <span className="text-sm text-muted-foreground">
          {action.completedAt
            ? new Date(action.completedAt).toLocaleString()
            : '-'}
        </span>
      ),
    },
    {
      key: 'controls',
      header: 'Controls',
      render: (action) => {
        const isControlling = controllingId === action.id;
        const canPause = action.status === 'running';
        const canResume = action.status === 'paused';
        const canStop = action.status === 'running' || action.status === 'paused';

        if (!canPause && !canResume && !canStop) {
          return <span className="text-sm text-muted-foreground">-</span>;
        }

        return (
          <div className="flex gap-1">
            {canPause && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleControl(action.id, 'pause')}
                disabled={isControlling}
                title="Pause"
              >
                {isControlling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Pause className="h-3 w-3" />
                )}
              </Button>
            )}
            {canResume && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleControl(action.id, 'resume')}
                disabled={isControlling}
                title="Resume"
              >
                {isControlling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
            )}
            {canStop && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleControl(action.id, 'stop')}
                disabled={isControlling}
                title="Stop"
              >
                {isControlling ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Square className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PlayCircle className="h-6 w-6" />
            Action Executions
          </h1>
          <p className="text-muted-foreground">
            Monitor and control playback actions
          </p>
        </div>
        <Button variant="outline" onClick={fetchActions}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Active Actions Summary */}
      {actions.filter((a) => a.status === 'running' || a.status === 'paused').length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">
                  {actions.filter((a) => a.status === 'running').length} running
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                <span className="text-sm font-medium">
                  {actions.filter((a) => a.status === 'paused').length} paused
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {actions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <PlayCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No action executions found</p>
              <p className="text-sm">Actions are created from schedules</p>
            </div>
          ) : (
            <AGTable data={actions} columns={columns} rowKey="id" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
