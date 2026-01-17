/**
 * ScheduleCalendar
 *
 * Sprint 2-5: Visual schedule calendar
 * - Day/Week/Month views
 * - Drag to create/resize schedules
 * - Conflict detection
 * - Priority visualization
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  signageScheduleApi,
  playlistApi,
  type SignageSchedule,
  type SignagePlaylist,
  type ScheduleCalendarEvent,
  type SchedulePriority,
  type DayOfWeekV2,
  type CreateScheduleDto,
} from '@/lib/api/signageV2';

type ViewMode = 'day' | 'week' | 'month';

const DAYS_OF_WEEK: DayOfWeekV2[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const PRIORITY_COLORS: Record<SchedulePriority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-gray-400',
};

const PRIORITY_OPTIONS: { value: SchedulePriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

export default function ScheduleCalendar() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<SignageSchedule[]>([]);
  const [events, setEvents] = useState<ScheduleCalendarEvent[]>([]);
  const [playlists, setPlaylists] = useState<SignagePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<SignageSchedule | null>(null);
  const [newSchedule, setNewSchedule] = useState<Partial<CreateScheduleDto>>({
    name: '',
    priority: 'normal',
    daysOfWeek: [],
  });

  // Calculate date range based on view mode
  const dateRange = useMemo(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      start.setDate(start.getDate() - start.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }, [currentDate, viewMode]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [schedulesRes, playlistsRes, calendarRes] = await Promise.all([
          signageScheduleApi.list(),
          playlistApi.list(),
          signageScheduleApi.getCalendar(
            dateRange.start.toISOString(),
            dateRange.end.toISOString()
          ),
        ]);

        if (schedulesRes.success && schedulesRes.data) {
          setSchedules(schedulesRes.data.items || []);
        }

        if (playlistsRes.success && playlistsRes.data) {
          setPlaylists(playlistsRes.data.items || []);
        }

        if (calendarRes.success && calendarRes.data) {
          setEvents(calendarRes.data);
        }
      } catch (err) {
        setError('Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dateRange]);

  // Navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Create schedule
  const handleCreateSchedule = async () => {
    if (!newSchedule.name || !newSchedule.playlistId) {
      setError('Name and playlist are required');
      return;
    }

    try {
      const response = await signageScheduleApi.create(newSchedule as CreateScheduleDto);
      if (response.success) {
        setCreateDialogOpen(false);
        setNewSchedule({ name: '', priority: 'normal', daysOfWeek: [] });
        // Reload data
        const schedulesRes = await signageScheduleApi.list();
        if (schedulesRes.success && schedulesRes.data) {
          setSchedules(schedulesRes.data.items || []);
        }
      } else {
        setError(response.error || 'Failed to create schedule');
      }
    } catch (err) {
      setError('Failed to create schedule');
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (schedule: SignageSchedule) => {
    try {
      const response = await signageScheduleApi.delete(schedule.id);
      if (response.success) {
        setSchedules(prev => prev.filter(s => s.id !== schedule.id));
        setEditDialogOpen(false);
        setSelectedSchedule(null);
      } else {
        setError(response.error || 'Failed to delete schedule');
      }
    } catch (err) {
      setError('Failed to delete schedule');
    }
  };

  // Format date header
  const formatDateHeader = () => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    if (viewMode === 'day') {
      options.day = 'numeric';
      options.weekday = 'long';
    } else if (viewMode === 'week') {
      const weekStart = new Date(dateRange.start);
      const weekEnd = new Date(dateRange.end);
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return currentDate.toLocaleDateString('en-US', options);
  };

  // Get week dates
  const weekDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(dateRange.start);
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [dateRange]);

  // Get schedules for a specific time slot
  const getSchedulesForSlot = (date: Date, hour: number): SignageSchedule[] => {
    const dayName = DAYS_OF_WEEK[date.getDay()];

    return schedules.filter(schedule => {
      if (!schedule.isActive) return false;

      // Check if schedule applies to this day
      if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
        if (!schedule.daysOfWeek.includes(dayName)) return false;
      }

      // Check time range
      if (schedule.timeStart && schedule.timeEnd) {
        const [startHour] = schedule.timeStart.split(':').map(Number);
        const [endHour] = schedule.timeEnd.split(':').map(Number);

        if (hour < startHour || hour >= endHour) return false;
      }

      return true;
    });
  };

  // Check for conflicts
  const hasConflicts = (date: Date, hour: number): boolean => {
    const slotsSchedules = getSchedulesForSlot(date, hour);
    return slotsSchedules.length > 1;
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Schedule Calendar</h1>
          <p className="text-muted-foreground">Manage content scheduling</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Schedule
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Calendar Controls */}
      <div className="flex items-center justify-between border rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateDate('prev')}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateDate('next')}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Today
          </Button>
          <span className="font-medium ml-4">{formatDateHeader()}</span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(v: ViewMode) => setViewMode(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-8 border-b bg-muted/50">
            <div className="p-2 border-r text-center text-sm text-muted-foreground">
              Time
            </div>
            {weekDates.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={i}
                  className={`p-2 text-center ${i < 6 ? 'border-r' : ''} ${isToday ? 'bg-primary/10' : ''}`}
                >
                  <div className="text-sm text-muted-foreground">{DAY_LABELS[i]}</div>
                  <div className={`font-medium ${isToday ? 'text-primary' : ''}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time slots */}
          <div className="max-h-[600px] overflow-y-auto">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                <div className="p-2 border-r text-sm text-muted-foreground text-center">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {weekDates.map((date, dayIndex) => {
                  const slotSchedules = getSchedulesForSlot(date, hour);
                  const hasConflict = hasConflicts(date, hour);

                  return (
                    <div
                      key={dayIndex}
                      className={`p-1 min-h-[48px] ${dayIndex < 6 ? 'border-r' : ''} ${
                        hasConflict ? 'bg-yellow-50' : ''
                      }`}
                    >
                      {slotSchedules.map(schedule => (
                        <button
                          key={schedule.id}
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setEditDialogOpen(true);
                          }}
                          className={`w-full text-left text-xs p-1 rounded mb-1 text-white truncate ${
                            PRIORITY_COLORS[schedule.priority]
                          }`}
                        >
                          {schedule.name}
                        </button>
                      ))}
                      {hasConflict && (
                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                          <AlertTriangle className="w-3 h-3" />
                          Conflict
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="max-h-[600px] overflow-y-auto">
            {HOURS.map(hour => {
              const slotSchedules = getSchedulesForSlot(currentDate, hour);
              const hasConflict = slotSchedules.length > 1;

              return (
                <div key={hour} className="flex border-b last:border-b-0">
                  <div className="w-20 p-3 border-r text-sm text-muted-foreground text-center shrink-0">
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                  <div className={`flex-1 p-2 min-h-[64px] ${hasConflict ? 'bg-yellow-50' : ''}`}>
                    {slotSchedules.map(schedule => (
                      <button
                        key={schedule.id}
                        onClick={() => {
                          setSelectedSchedule(schedule);
                          setEditDialogOpen(true);
                        }}
                        className={`w-full text-left p-2 rounded mb-1 text-white ${
                          PRIORITY_COLORS[schedule.priority]
                        }`}
                      >
                        <div className="font-medium">{schedule.name}</div>
                        <div className="text-xs opacity-80">
                          {schedule.playlist?.name || 'No playlist'}
                        </div>
                      </button>
                    ))}
                    {hasConflict && (
                      <div className="flex items-center gap-1 text-sm text-yellow-600 mt-1">
                        <AlertTriangle className="w-4 h-4" />
                        Schedule conflict detected
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-7 bg-muted/50 border-b">
            {DAY_LABELS.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 42 }, (_, i) => {
              const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const startOffset = firstDay.getDay();
              const date = new Date(firstDay);
              date.setDate(date.getDate() - startOffset + i);

              const isCurrentMonth = date.getMonth() === currentDate.getMonth();
              const isToday = date.toDateString() === new Date().toDateString();

              // Check if any schedules apply to this date
              const dayName = DAYS_OF_WEEK[date.getDay()];
              const daySchedules = schedules.filter(s =>
                s.isActive &&
                (!s.daysOfWeek || s.daysOfWeek.length === 0 || s.daysOfWeek.includes(dayName))
              );

              return (
                <div
                  key={i}
                  className={`min-h-[100px] border-b border-r p-2 ${
                    !isCurrentMonth ? 'bg-muted/30' : ''
                  } ${isToday ? 'bg-primary/10' : ''}`}
                >
                  <div className={`text-sm ${isToday ? 'font-bold text-primary' : isCurrentMonth ? '' : 'text-muted-foreground'}`}>
                    {date.getDate()}
                  </div>
                  <div className="mt-1 space-y-1">
                    {daySchedules.slice(0, 3).map(schedule => (
                      <div
                        key={schedule.id}
                        className={`text-xs px-1 py-0.5 rounded text-white truncate ${PRIORITY_COLORS[schedule.priority]}`}
                      >
                        {schedule.name}
                      </div>
                    ))}
                    {daySchedules.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{daySchedules.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule List */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-4">All Schedules</h3>
        <div className="space-y-2">
          {schedules.map(schedule => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-3 border rounded hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[schedule.priority]}`} />
                <div>
                  <div className="font-medium">{schedule.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {schedule.playlist?.name || 'No playlist'} •{' '}
                    {schedule.timeStart && schedule.timeEnd
                      ? `${schedule.timeStart} - ${schedule.timeEnd}`
                      : 'All day'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                  {schedule.isActive ? 'Active' : 'Inactive'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedSchedule(schedule);
                    setEditDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Schedule Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Schedule</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newSchedule.name || ''}
                onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                placeholder="Schedule name"
              />
            </div>

            <div className="space-y-2">
              <Label>Playlist *</Label>
              <Select
                value={newSchedule.playlistId || ''}
                onValueChange={(v) => setNewSchedule({ ...newSchedule, playlistId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select playlist" />
                </SelectTrigger>
                <SelectContent>
                  {playlists.map(playlist => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={newSchedule.priority || 'normal'}
                onValueChange={(v: SchedulePriority) => setNewSchedule({ ...newSchedule, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={newSchedule.timeStart || ''}
                  onChange={(e) => setNewSchedule({ ...newSchedule, timeStart: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={newSchedule.timeEnd || ''}
                  onChange={(e) => setNewSchedule({ ...newSchedule, timeEnd: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day, i) => {
                  const isSelected = newSchedule.daysOfWeek?.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const current = newSchedule.daysOfWeek || [];
                        const updated = isSelected
                          ? current.filter(d => d !== day)
                          : [...current, day];
                        setNewSchedule({ ...newSchedule, daysOfWeek: updated });
                      }}
                      className={`px-3 py-1 rounded border ${
                        isSelected ? 'bg-primary text-primary-foreground' : ''
                      }`}
                    >
                      {DAY_LABELS[i]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Details</DialogTitle>
          </DialogHeader>

          {selectedSchedule && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p className="font-medium">{selectedSchedule.name}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Playlist</Label>
                <p className="font-medium">{selectedSchedule.playlist?.name || 'Not set'}</p>
              </div>

              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[selectedSchedule.priority]}`} />
                <span className="capitalize">{selectedSchedule.priority} Priority</span>
              </div>

              <div>
                <Label className="text-muted-foreground">Time</Label>
                <p>
                  {selectedSchedule.timeStart && selectedSchedule.timeEnd
                    ? `${selectedSchedule.timeStart} - ${selectedSchedule.timeEnd}`
                    : 'All day'}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">Days</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedSchedule.daysOfWeek && selectedSchedule.daysOfWeek.length > 0 ? (
                    selectedSchedule.daysOfWeek.map(day => (
                      <Badge key={day} variant="secondary" className="capitalize">
                        {day.slice(0, 3)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">All days</span>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => selectedSchedule && handleDeleteSchedule(selectedSchedule)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button
              onClick={() => navigate(`/admin/digital-signage/v2/schedules/${selectedSchedule?.id}`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
