/**
 * Schedule Page
 *
 * Simple time-based scheduling for pharmacy signage.
 * Features:
 * - Morning / Afternoon / Evening time slots
 * - Assign playlists to time slots
 * - View today's schedule
 */

import React, { useState } from 'react';
import { useSchedules, usePlaylists } from '../hooks/usePharmacySignage.js';
import type { TimeSlot, PharmacyScheduleDto } from '../../backend/dto/index.js';

const TIME_SLOT_INFO: Record<TimeSlot, { label: string; defaultStart: string; defaultEnd: string; icon: string }> = {
  morning: {
    label: '오전',
    defaultStart: '09:00',
    defaultEnd: '12:00',
    icon: '🌅',
  },
  afternoon: {
    label: '오후',
    defaultStart: '12:00',
    defaultEnd: '18:00',
    icon: '☀️',
  },
  evening: {
    label: '저녁',
    defaultStart: '18:00',
    defaultEnd: '21:00',
    icon: '🌙',
  },
};

interface TimeSlotCardProps {
  timeSlot: TimeSlot;
  schedule: PharmacyScheduleDto | undefined;
  playlists: { id: string; name: string }[];
  onSetSchedule: (timeSlot: TimeSlot, playlistId: string) => void;
  onRemoveSchedule: (scheduleId: string) => void;
}

const TimeSlotCard: React.FC<TimeSlotCardProps> = ({
  timeSlot,
  schedule,
  playlists,
  onSetSchedule,
  onRemoveSchedule,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(schedule?.playlistId || '');

  const info = TIME_SLOT_INFO[timeSlot];

  const handleSave = () => {
    if (selectedPlaylistId) {
      onSetSchedule(timeSlot, selectedPlaylistId);
    }
    setIsEditing(false);
  };

  const handleRemove = () => {
    if (schedule && window.confirm('이 시간대 편성을 삭제하시겠습니까?')) {
      onRemoveSchedule(schedule.id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{info.icon}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{info.label}</h3>
            <p className="text-sm text-gray-600">
              {schedule?.startTime || info.defaultStart} - {schedule?.endTime || info.defaultEnd}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                플레이리스트 선택
              </label>
              <select
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택해주세요</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!selectedPlaylistId}
                className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedPlaylistId(schedule?.playlistId || '');
                }}
                className="py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        ) : schedule ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-gray-900">{schedule.playlistName}</p>
                <p className="text-sm text-gray-500">
                  {schedule.isActive ? '현재 활성화됨' : '대기 중'}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  schedule.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {schedule.isActive ? '재생 중' : '예정'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-2 px-4 border border-blue-300 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50"
              >
                변경
              </button>
              <button
                onClick={handleRemove}
                className="py-2 px-4 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                삭제
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-500 mb-4">편성된 플레이리스트가 없습니다</p>
            <button
              onClick={() => setIsEditing(true)}
              className="py-2 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              플레이리스트 지정
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const Schedule: React.FC = () => {
  const { schedules, loading, error, refresh, setSchedule, removeSchedule } = useSchedules();
  const { playlists } = usePlaylists();

  const getScheduleForSlot = (timeSlot: TimeSlot): PharmacyScheduleDto | undefined => {
    return schedules.find((s) => s.timeSlot === timeSlot);
  };

  const handleSetSchedule = async (timeSlot: TimeSlot, playlistId: string) => {
    await setSchedule(timeSlot, playlistId);
  };

  const handleRemoveSchedule = async (scheduleId: string) => {
    await removeSchedule(scheduleId);
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button onClick={refresh} className="mt-2 text-sm text-red-600 underline">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">편성표</h1>
          <p className="text-gray-500 mt-1">시간대별 플레이리스트를 지정하세요</p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          새로고침
        </button>
      </div>

      {/* Time Slot Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">시간대 안내</h3>
        <div className="flex flex-wrap gap-4 text-sm text-blue-800">
          <span>🌅 오전: 09:00 - 12:00</span>
          <span>☀️ 오후: 12:00 - 18:00</span>
          <span>🌙 저녁: 18:00 - 21:00</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-lg shadow">
              <div className="h-20 bg-gray-200 rounded-t-lg"></div>
              <div className="p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['morning', 'afternoon', 'evening'] as TimeSlot[]).map((timeSlot) => (
            <TimeSlotCard
              key={timeSlot}
              timeSlot={timeSlot}
              schedule={getScheduleForSlot(timeSlot)}
              playlists={playlists.map((p) => ({ id: p.id, name: p.name }))}
              onSetSchedule={handleSetSchedule}
              onRemoveSchedule={handleRemoveSchedule}
            />
          ))}
        </div>
      )}

      {/* Today's Schedule Summary */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">오늘의 편성 요약</h2>
        </div>
        <div className="p-6">
          {schedules.length > 0 ? (
            <div className="space-y-3">
              {schedules.map((schedule) => {
                const info = TIME_SLOT_INFO[schedule.timeSlot];
                return (
                  <div
                    key={schedule.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span>{info.icon}</span>
                      <div>
                        <p className="font-medium">{info.label}</p>
                        <p className="text-sm text-gray-500">
                          {schedule.startTime} - {schedule.endTime}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{schedule.playlistName}</p>
                      <p
                        className={`text-sm ${
                          schedule.isActive ? 'text-green-600' : 'text-gray-500'
                        }`}
                      >
                        {schedule.isActive ? '현재 재생 중' : '대기 중'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              오늘 편성된 플레이리스트가 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;
