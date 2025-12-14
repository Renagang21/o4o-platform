/**
 * Schedule Detail
 *
 * Detail view for a schedule
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
  Pencil,
  Trash2,
  Calendar,
  Clock,
  ListVideo,
  LayoutGrid,
  Play,
} from 'lucide-react';
import {
  scheduleApi,
  actionApi,
  type Schedule,
  type ScheduleType,
  type ActionExecution,
} from '@/lib/api/digitalSignage';
import ScheduleForm from './ScheduleForm';

const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  once: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ScheduleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [actions, setActions] = useState<ActionExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    try {
      const [scheduleRes, actionsRes] = await Promise.all([
        scheduleApi.get(id),
        actionApi.list({ scheduleId: id, limit: 10 }),
      ]);

      if (scheduleRes.success && scheduleRes.data) {
        setSchedule(scheduleRes.data);
      } else {
        setError(scheduleRes.error || 'Failed to load schedule');
      }

      if (actionsRes.success && actionsRes.data) {
        setActions(actionsRes.data.data || []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this schedule?')) return;

    const response = await scheduleApi.delete(id);
    if (response.success) {
      navigate('/admin/digital-signage/schedules');
    } else {
      setError(response.error || 'Failed to delete');
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

  if (error || !schedule) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Schedule not found'}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/admin/digital-signage/schedules')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/digital-signage/schedules')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              {schedule.name}
            </h1>
            <p className="text-muted-foreground">
              {SCHEDULE_TYPE_LABELS[schedule.scheduleType]} Schedule
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Schedule Info */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                {schedule.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <Badge variant="outline">
                {SCHEDULE_TYPE_LABELS[schedule.scheduleType]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <p className="font-medium">{schedule.priority}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">
                  {schedule.startTime}
                  {schedule.endTime && ` - ${schedule.endTime}`}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">
                {new Date(schedule.startDate).toLocaleDateString()}
              </p>
            </div>
            {schedule.endDate && (
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">
                  {new Date(schedule.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
            {schedule.scheduleType === 'weekly' && schedule.daysOfWeek && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Days of Week</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {schedule.daysOfWeek.map((day) => (
                    <Badge key={day} variant="secondary" className="text-xs">
                      {DAY_NAMES[day]}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Target Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Media List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListVideo className="h-4 w-4" />
              Media List
            </CardTitle>
          </CardHeader>
          <CardContent>
            {schedule.mediaList ? (
              <Link
                to={`/admin/digital-signage/media/lists/${schedule.mediaListId}`}
                className="text-primary hover:underline font-medium"
              >
                {schedule.mediaList.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">{schedule.mediaListId}</span>
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
            {schedule.displaySlot ? (
              <div>
                <span className="font-medium">{schedule.displaySlot.name}</span>
                {schedule.displaySlot.display && (
                  <Link
                    to={`/admin/digital-signage/displays/${schedule.displaySlot.displayId}`}
                    className="text-sm text-primary hover:underline ml-2"
                  >
                    ({schedule.displaySlot.display.name})
                  </Link>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{schedule.displaySlotId}</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Recent Actions
          </CardTitle>
          <Link to="/admin/digital-signage/actions">
            <Button size="sm" variant="outline">
              View All Actions
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No actions executed yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map((action) => (
                <Link
                  key={action.id}
                  to={`/admin/digital-signage/actions/${action.id}`}
                  className="block p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          action.status === 'completed'
                            ? 'default'
                            : action.status === 'running'
                            ? 'secondary'
                            : action.status === 'failed'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {action.status}
                      </Badge>
                      <span className="text-sm">
                        {new Date(action.startedAt || action.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {action.mediaSource && (
                      <span className="text-sm text-muted-foreground">
                        {action.mediaSource.name}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {showForm && (
        <ScheduleForm
          schedule={schedule}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
