import { useState } from 'react';
import SignageScheduler from '../../components/signage/SignageScheduler';

interface TimeRange {
  start: string;
  end: string;
}

export default function ScheduleManager() {
  const [schedule, setSchedule] = useState<{
    days: string[];
    timeRanges: TimeRange[];
  }>({
    days: [],
    timeRanges: []
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage content schedules for your digital displays
        </p>
      </div>
      <SignageScheduler schedule={schedule} onChange={setSchedule} />
    </div>
  );
}