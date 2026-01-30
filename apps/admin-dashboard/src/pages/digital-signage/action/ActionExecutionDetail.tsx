/**
 * Action Execution Detail
 *
 * Detail view for an action execution with manual controls
 * Phase 6: Digital Signage Management UI
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  PlayCircle,
  Pause,
  Play,
  Square,
  Loader2,
  Image,
  Calendar,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react';
import {
  actionApi,
  type ActionExecution,
  type ExecutionStatus,
} from '@/lib/api/digitalSignage';

const STATUS_CONFIG: Record<ExecutionStatus, { color: string; label: string; bgColor: string }> = {
  pending: { color: 'text-gray-700', label: 'Pending', bgColor: 'bg-gray-100' },
  running: { color: 'text-blue-700', label: 'Running', bgColor: 'bg-blue-100' },
  paused: { color: 'text-yellow-700', label: 'Paused', bgColor: 'bg-yellow-100' },
  completed: { color: 'text-green-700', label: 'Completed', bgColor: 'bg-green-100' },
  stopped: { color: 'text-orange-700', label: 'Stopped', bgColor: 'bg-orange-100' },
  failed: { color: 'text-red-700', label: 'Failed', bgColor: 'bg-red-100' },
};

export default function ActionExecutionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [action, setAction] = useState<ActionExecution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isControlling, setIsControlling] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await actionApi.getExecution(id);
      if (response.success && response.data) {
        setAction(response.data);
      } else {
        setError(response.error || 'Failed to load action');
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh for active actions
    const interval = setInterval(() => {
      if (action?.status === 'running' || action?.status === 'paused') {
        fetchData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [id, action?.status]);

  const handleControl = async (controlAction: 'pause' | 'resume' | 'stop') => {
    if (!id) return;
    setIsControlling(true);
    setError(null);

    try {
      let response;
      switch (controlAction) {
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
        fetchData();
      } else {
        setError(response.error || `Failed to ${controlAction}`);
      }
    } catch (err) {
      setError(`Failed to ${controlAction}`);
    } finally {
      setIsControlling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !action) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Action not found'}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/admin/digital-signage/actions')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[action.status];
  const canPause = action.status === 'running';
  const canResume = action.status === 'paused';
  const canStop = action.status === 'running' || action.status === 'paused';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/digital-signage/actions')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <PlayCircle className="h-6 w-6" />
              Action Execution
            </h1>
            <p className="text-muted-foreground">
              {action.mediaList?.name || action.mediaListId}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Status and Controls */}
      <Card className={statusConfig.bgColor}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} text-lg px-4 py-2`}>
                {statusConfig.label}
              </Badge>
              {(action.status === 'running' || action.status === 'paused') && (
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    action.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'
                  }`} />
                  <span className="text-sm">
                    {action.status === 'running' ? 'Playback in progress' : 'Playback paused'}
                  </span>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            {(canPause || canResume || canStop) && (
              <div className="flex gap-2">
                {canPause && (
                  <Button
                    variant="outline"
                    onClick={() => handleControl('pause')}
                    disabled={isControlling}
                  >
                    {isControlling ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Pause className="h-4 w-4 mr-2" />
                    )}
                    Pause
                  </Button>
                )}
                {canResume && (
                  <Button
                    variant="outline"
                    onClick={() => handleControl('resume')}
                    disabled={isControlling}
                  >
                    {isControlling ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Resume
                  </Button>
                )}
                {canStop && (
                  <Button
                    variant="destructive"
                    onClick={() => handleControl('stop')}
                    disabled={isControlling}
                  >
                    {isControlling ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4 mr-2" />
                    )}
                    Stop
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timing Info */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">
                {new Date(action.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Started</p>
              <p className="font-medium">
                {action.startedAt
                  ? new Date(action.startedAt).toLocaleString()
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Ended</p>
              <p className="font-medium">
                {action.completedAt
                  ? new Date(action.completedAt).toLocaleString()
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="font-medium">
                {action.startedAt && action.completedAt
                  ? `${Math.round(
                      (new Date(action.completedAt).getTime() -
                        new Date(action.startedAt).getTime()) /
                        1000
                    )} seconds`
                  : action.startedAt
                  ? 'In progress...'
                  : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* References */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Media Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="h-4 w-4" />
              Media Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {action.mediaList ? (
              <Link
                to={`/admin/digital-signage/media/sources/${action.mediaListId}`}
                className="text-primary hover:underline font-medium"
              >
                {action.mediaList.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">{action.mediaListId}</span>
            )}
          </CardContent>
        </Card>

        {/* Display Slot */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="h-4 w-4" />
              Display Slot
            </CardTitle>
          </CardHeader>
          <CardContent>
            {action.displaySlot ? (
              <div>
                <span className="font-medium">{action.displaySlot.name}</span>
                {action.displaySlot.display && (
                  <Link
                    to={`/admin/digital-signage/displays/${action.displaySlot.displayId}`}
                    className="text-sm text-primary hover:underline block"
                  >
                    {action.displaySlot.display.name}
                  </Link>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{action.displaySlotId}</span>
            )}
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent>
            {action.schedule ? (
              <Link
                to={`/admin/digital-signage/schedules/${action.scheduleId}`}
                className="text-primary hover:underline font-medium"
              >
                {action.schedule.name}
              </Link>
            ) : action.scheduleId ? (
              <span className="text-muted-foreground">{action.scheduleId}</span>
            ) : (
              <span className="text-muted-foreground">Manual execution</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Info */}
      {action.status === 'failed' && action.error && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Error:</strong> {action.error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
