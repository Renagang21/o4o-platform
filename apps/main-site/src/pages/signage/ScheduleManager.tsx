import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, Play, Edit, Trash2, AlertCircle } from 'lucide-react';

interface Schedule {
  id: string;
  name: string;
  description?: string;
  type: 'daily' | 'weekly' | 'one_time';
  status: 'active' | 'inactive' | 'expired';
  startTime: string;
  endTime: string;
  daysOfWeek?: number[];
  specificDate?: string;
  validFrom?: string;
  validUntil?: string;
  priority: number;
  playlist: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface ScheduleManagerProps {
  storeId: string;
}

export default function ScheduleManager({ storeId }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchSchedules();
    fetchActiveSchedule();
  }, [storeId]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/signage/stores/${storeId}/schedules`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const data = await response.json();
      setSchedules(data.data.schedules);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSchedule = async () => {
    try {
      const response = await fetch(`/api/signage/stores/${storeId}/schedules/active`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSchedule(data.data.activeSchedule);
      }
    } catch (err: any) {
      console.error('Failed to fetch active schedule:', err);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await fetch(`/api/signage/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      fetchSchedules();
      fetchActiveSchedule();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-800', text: 'Inactive' },
      expired: { color: 'bg-red-100 text-red-800', text: 'Expired' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      daily: { color: 'bg-blue-100 text-blue-800', text: 'Daily' },
      weekly: { color: 'bg-purple-100 text-purple-800', text: 'Weekly' },
      one_time: { color: 'bg-orange-100 text-orange-800', text: 'One Time' }
    };

    const config = typeConfig[type as keyof typeof typeConfig];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatTime = (time: string) => {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDaysOfWeek = (days?: number[]) => {
    if (!days || days.length === 0) return 'No days selected';
    if (days.length === 7) return 'Every day';
    return days.map((day: any) => dayNames[day]).join(', ');
  };

  const isScheduleActive = (schedule: Schedule) => {
    return activeSchedule?.id === schedule.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule Manager</h1>
          <p className="text-gray-600">Manage content schedules for this store</p>
        </div>
        <button
          onClick={() => {/* TODO: Implement create modal */}}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Schedule
        </button>
      </div>

      {/* Active Schedule Alert */}
      {activeSchedule && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <Play className="w-5 h-5 text-green-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800">Currently Active</h3>
              <p className="text-sm text-green-700 mt-1">
                <strong>{activeSchedule.name}</strong> is currently playing{' '}
                <strong>{activeSchedule.playlist.name}</strong>
              </p>
              <p className="text-xs text-green-600 mt-1">
                {formatTime(activeSchedule.startTime)} - {formatTime(activeSchedule.endTime)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Schedules List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">All Schedules</h2>
        </div>

        {schedules.length > 0 ? (
          <div className="divide-y">
            {schedules.map((schedule: any) => (
              <div
                key={schedule.id}
                className={`p-6 ${
                  isScheduleActive(schedule) ? 'bg-green-50 border-l-4 border-green-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{schedule.name}</h3>
                      {getStatusBadge(schedule.status)}
                      {getTypeBadge(schedule.type)}
                      {isScheduleActive(schedule) && (
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-medium">
                          NOW PLAYING
                        </span>
                      )}
                    </div>

                    {schedule.description && (
                      <p className="text-gray-600 mb-3">{schedule.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-900">Time:</span>
                        <p className="text-gray-600">
                          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                        </p>
                      </div>

                      <div>
                        <span className="font-medium text-gray-900">Playlist:</span>
                        <p className="text-gray-600">{schedule.playlist.name}</p>
                      </div>

                      {schedule.type === 'weekly' && (
                        <div>
                          <span className="font-medium text-gray-900">Days:</span>
                          <p className="text-gray-600">{formatDaysOfWeek(schedule.daysOfWeek)}</p>
                        </div>
                      )}

                      {schedule.type === 'one_time' && schedule.specificDate && (
                        <div>
                          <span className="font-medium text-gray-900">Date:</span>
                          <p className="text-gray-600">
                            {new Date(schedule.specificDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      <div>
                        <span className="font-medium text-gray-900">Priority:</span>
                        <p className="text-gray-600">{schedule.priority}</p>
                      </div>
                    </div>

                    {(schedule.validFrom || schedule.validUntil) && (
                      <div className="mt-3 text-sm">
                        <span className="font-medium text-gray-900">Valid period:</span>
                        <p className="text-gray-600">
                          {schedule.validFrom && new Date(schedule.validFrom).toLocaleDateString()}
                          {schedule.validFrom && schedule.validUntil && ' - '}
                          {schedule.validUntil && new Date(schedule.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Edit Schedule"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Schedules</h3>
            <p className="text-gray-600 mb-4">Create your first schedule to automate content playback</p>
            <button
              onClick={() => {/* TODO: Implement create modal */}}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center mx-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Schedule
            </button>
          </div>
        )}
      </div>

      {/* Schedule Conflicts Warning */}
      {schedules.length > 1 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Schedule Conflicts</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Make sure to check for time conflicts between schedules. Higher priority schedules will take precedence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <Calendar className="w-5 h-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-900">Total Schedules</p>
              <p className="text-2xl font-bold text-gray-900">{schedules.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <Play className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-900">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {schedules.filter((s: any) => s.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-purple-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-900">Weekly</p>
              <p className="text-2xl font-bold text-gray-900">
                {schedules.filter((s: any) => s.type === 'weekly').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-orange-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-gray-900">One Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {schedules.filter((s: any) => s.type === 'one_time').length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}