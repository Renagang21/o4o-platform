import { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  Trash2,
  Edit2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { DayOfWeek } from '@/types';
import { displayApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface ScheduleData {
  id: string;
  pharmacy_id: string;
  name: string;
  playlist_id: string;
  days_of_week: number[] | string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  playlist?: {
    id: string;
    name: string;
  };
}

const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
const dayColors: Record<number, string> = {
  0: 'bg-red-100 text-red-700',
  1: 'bg-slate-100 text-slate-700',
  2: 'bg-slate-100 text-slate-700',
  3: 'bg-slate-100 text-slate-700',
  4: 'bg-slate-100 text-slate-700',
  5: 'bg-slate-100 text-slate-700',
  6: 'bg-blue-100 text-blue-700',
};

// 시간대 슬롯 (1시간 단위)
const timeSlots = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8; // 8시 ~ 21시
  return `${hour.toString().padStart(2, '0')}:00`;
});

function parseDaysOfWeek(days: number[] | string): number[] {
  if (Array.isArray(days)) return days;
  if (typeof days === 'string') {
    return days.split(',').map(Number).filter(n => !isNaN(n));
  }
  return [];
}

export default function SchedulesPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await displayApi.getSchedules({
        pharmacy_id: user?.pharmacyId,
      });
      if (response.error) {
        setError(response.error.message);
      } else {
        setSchedules((response.data || []) as ScheduleData[]);
      }
    } catch {
      setError('스케줄을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await displayApi.deleteSchedule(id);
      if (response.error) {
        alert(response.error.message);
      } else {
        setSchedules(schedules.filter(s => s.id !== id));
      }
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  const handleToggleActive = async (schedule: ScheduleData) => {
    try {
      const response = await displayApi.updateSchedule(schedule.id, {
        is_active: !schedule.is_active,
      });
      if (response.error) {
        alert(response.error.message);
      } else {
        setSchedules(schedules.map(s =>
          s.id === schedule.id ? { ...s, is_active: !s.is_active } : s
        ));
      }
    } catch {
      alert('상태 변경에 실패했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-2 text-slate-600">로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="mt-4 text-red-600">{error}</p>
        <button
          onClick={loadSchedules}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-green-600" />
            스케줄 관리
          </h1>
          <p className="text-slate-500 mt-1">
            시간대별 재생 스케줄을 설정하세요
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'list'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              목록
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-4 py-2 text-sm font-medium ${
                viewMode === 'timeline'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              타임라인
            </button>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 스케줄
          </button>
        </div>
      </div>

      {viewMode === 'list' ? (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">이름</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">요일</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">시간</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">상태</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-slate-600">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedules.map((schedule) => {
                const daysOfWeek = parseDaysOfWeek(schedule.days_of_week);
                return (
                  <tr key={schedule.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{schedule.name}</div>
                      {schedule.playlist && (
                        <div className="text-xs text-slate-500">{schedule.playlist.name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {daysOfWeek.map((day) => (
                          <span
                            key={day}
                            className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded ${dayColors[day] || 'bg-slate-100'}`}
                          >
                            {dayLabels[day]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Clock className="w-4 h-4" />
                        {schedule.start_time} - {schedule.end_time}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(schedule)}
                        className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${
                          schedule.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {schedule.is_active ? (
                          <>
                            <Play className="w-3 h-3" />
                            활성
                          </>
                        ) : (
                          <>
                            <Pause className="w-3 h-3" />
                            비활성
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(schedule.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Timeline View */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">주간 스케줄</h3>
              <div className="flex items-center gap-2">
                <button className="p-1 rounded hover:bg-slate-100">
                  <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <span className="text-sm text-slate-600">이번 주</span>
                <button className="p-1 rounded hover:bg-slate-100">
                  <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-8 border-b border-slate-200">
                <div className="p-3 text-sm font-medium text-slate-600">시간</div>
                {dayLabels.map((day, i) => (
                  <div
                    key={i}
                    className={`p-3 text-center text-sm font-medium ${
                      i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-slate-600'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Time Slots */}
              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 border-b border-slate-100">
                  <div className="p-3 text-xs text-slate-500">{time}</div>
                  {dayLabels.map((_, dayIndex) => {
                    const activeSchedule = schedules.find((s) => {
                      const daysOfWeek = parseDaysOfWeek(s.days_of_week);
                      const startHour = parseInt(s.start_time.split(':')[0]);
                      const endHour = parseInt(s.end_time.split(':')[0]);
                      const currentHour = parseInt(time.split(':')[0]);
                      return (
                        s.is_active &&
                        daysOfWeek.includes(dayIndex as DayOfWeek) &&
                        currentHour >= startHour &&
                        currentHour < endHour
                      );
                    });
                    return (
                      <div key={dayIndex} className="p-1 min-h-[40px]">
                        {activeSchedule && (
                          <div className="h-full bg-primary-100 rounded px-2 py-1">
                            <span className="text-xs font-medium text-primary-700 truncate block">
                              {activeSchedule.name}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {schedules.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-slate-800">스케줄이 없습니다</h3>
          <p className="mt-2 text-slate-500">시간대별 재생 스케줄을 추가하세요</p>
          <button
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            새 스케줄
          </button>
        </div>
      )}
    </div>
  );
}
