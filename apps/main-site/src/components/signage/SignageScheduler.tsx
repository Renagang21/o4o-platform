import { useState, FC } from 'react';
import { Plus, X } from 'lucide-react';

interface TimeRange {
  start: string;
  end: string;
}

interface SignageSchedulerProps {
  schedule: {
    days: string[];
    timeRanges: TimeRange[];
  };
  onChange: (schedule: { days: string[]; timeRanges: TimeRange[] }) => void;
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const SignageScheduler: React.FC<SignageSchedulerProps> = ({
  schedule,
  onChange
}) => {
  const [selectedDays, setSelectedDays] = useState<string[]>(schedule.days);
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>(schedule.timeRanges);

  const handleDayToggle = (day: string) => {
    const newDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    setSelectedDays(newDays);
    onChange({ days: newDays, timeRanges });
  };

  const handleAddTimeRange = () => {
    const newTimeRanges = [
      ...timeRanges,
      { start: '09:00', end: '18:00' }
    ];
    setTimeRanges(newTimeRanges);
    onChange({ days: selectedDays, timeRanges: newTimeRanges });
  };

  const handleRemoveTimeRange = (index: number) => {
    const newTimeRanges = timeRanges.filter((_, i) => i !== index);
    setTimeRanges(newTimeRanges);
    onChange({ days: selectedDays, timeRanges: newTimeRanges });
  };

  const handleTimeRangeChange = (
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    const newTimeRanges = timeRanges.map((range, i) =>
      i === index ? { ...range, [field]: value } : range
    );
    setTimeRanges(newTimeRanges);
    onChange({ days: selectedDays, timeRanges: newTimeRanges });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-main mb-4">송출 요일</h3>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => handleDayToggle(day)}
              className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                selectedDays.includes(day)
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-text-main">송출 시간</h3>
          <button
            onClick={handleAddTimeRange}
            className="inline-flex items-center px-3 py-1.5 bg-secondary text-text-secondary rounded-lg hover:bg-secondary-dark transition-colors duration-200"
          >
            <Plus className="w-4 h-4 mr-1" />
            시간 추가
          </button>
        </div>
        <div className="space-y-3">
          {timeRanges.map((range, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 bg-secondary p-3 rounded-lg"
            >
              <input
                type="time"
                value={range.start}
                onChange={(e) =>
                  handleTimeRangeChange(index, 'start', e.target.value)
                }
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-text-secondary">~</span>
              <input
                type="time"
                value={range.end}
                onChange={(e) =>
                  handleTimeRangeChange(index, 'end', e.target.value)
                }
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => handleRemoveTimeRange(index)}
                className="p-2 text-text-secondary hover:text-text-main transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SignageScheduler; 