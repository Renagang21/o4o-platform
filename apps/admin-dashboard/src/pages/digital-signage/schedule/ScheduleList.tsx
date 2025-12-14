/**
 * Schedule List
 *
 * List view for schedules
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
  Plus,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { scheduleApi, type Schedule, type ScheduleType } from '@/lib/api/digitalSignage';
import ScheduleForm from './ScheduleForm';

const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  once: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export default function ScheduleList() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const fetchSchedules = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await scheduleApi.list();
      if (response.success && response.data) {
        setSchedules(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load schedules');
      }
    } catch (err) {
      setError('Failed to load schedules');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    const response = await scheduleApi.delete(id);
    if (response.success) {
      fetchSchedules();
    } else {
      setError(response.error || 'Failed to delete');
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingSchedule(null);
    fetchSchedules();
  };

  const columns: AGTableColumn<Schedule>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (schedule) => (
        <Link
          to={`/admin/digital-signage/schedules/${schedule.id}`}
          className="font-medium text-primary hover:underline"
        >
          {schedule.name}
        </Link>
      ),
    },
    {
      key: 'scheduleType',
      header: 'Type',
      render: (schedule) => (
        <Badge variant="outline">
          {SCHEDULE_TYPE_LABELS[schedule.scheduleType]}
        </Badge>
      ),
    },
    {
      key: 'startTime',
      header: 'Start Time',
      render: (schedule) => (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {schedule.startTime}
        </div>
      ),
    },
    {
      key: 'mediaList',
      header: 'Media List',
      render: (schedule) => (
        <span className="text-sm">
          {schedule.mediaList?.name || schedule.mediaListId}
        </span>
      ),
    },
    {
      key: 'displaySlot',
      header: 'Display Slot',
      render: (schedule) => (
        <span className="text-sm">
          {schedule.displaySlot?.name || schedule.displaySlotId}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (schedule) => (
        <span className="text-sm">{schedule.priority}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (schedule) => (
        <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
          {schedule.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (schedule) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingSchedule(schedule)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(schedule.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
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
            <Calendar className="h-6 w-6" />
            Schedules
          </h1>
          <p className="text-muted-foreground">
            Manage playback schedules for digital signage
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Schedule
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {schedules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No schedules created yet</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setShowForm(true)}
              >
                Create your first schedule
              </Button>
            </div>
          ) : (
            <AGTable data={schedules} columns={columns} keyField="id" />
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {(showForm || editingSchedule) && (
        <ScheduleForm
          schedule={editingSchedule}
          onClose={() => {
            setShowForm(false);
            setEditingSchedule(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
