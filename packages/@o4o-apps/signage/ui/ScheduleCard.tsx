interface Schedule {
  id: string;
  deviceId: string;
  playlistId: string;
  startTime: string;
  endTime: string;
  daysOfWeek?: number[];
  daysOfWeekLabels?: string[];
  startDate?: string;
  endDate?: string;
  active: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

interface ScheduleCardProps {
  schedules: Schedule[];
}

export function ScheduleCard({ schedules }: ScheduleCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 10) return 'bg-red-100 text-red-800';
    if (priority >= 5) return 'bg-orange-100 text-orange-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedules</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage digital signage scheduling
          </p>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Create Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600">No schedules created yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Create your first schedule to automate playlist playback
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {schedule.startTime} - {schedule.endTime}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getPriorityColor(
                        schedule.priority
                      )}`}
                    >
                      Priority {schedule.priority}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        schedule.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {schedule.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Days of Week</p>
                      {schedule.daysOfWeekLabels && schedule.daysOfWeekLabels.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {schedule.daysOfWeekLabels.map((day) => (
                            <span
                              key={day}
                              className="inline-flex items-center rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                            >
                              {day}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-gray-500">All days</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700">Date Range</p>
                      <p className="mt-2 text-sm text-gray-600">
                        {schedule.startDate ? formatDate(schedule.startDate) : 'No start'} →{' '}
                        {schedule.endDate ? formatDate(schedule.endDate) : 'No end'}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700">IDs</p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-gray-600">
                          Device:{' '}
                          <span className="font-mono">
                            {schedule.deviceId.substring(0, 8)}...
                          </span>
                        </p>
                        <p className="text-xs text-gray-600">
                          Playlist:{' '}
                          <span className="font-mono">
                            {schedule.playlistId.substring(0, 8)}...
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4">
                <button className="rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                  Edit
                </button>
                <button className="rounded bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                  View Details
                </button>
                <button className="ml-auto rounded bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
