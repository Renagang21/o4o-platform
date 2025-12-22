/**
 * Pharmacy Signage Dashboard Page
 *
 * Main dashboard showing:
 * - Display status summary
 * - Currently playing content
 * - Today's schedule
 */

import React from 'react';
import { useDashboard, useDisplays } from '../hooks/usePharmacySignage.js';

export const Dashboard: React.FC = () => {
  const { dashboard, loading, error, refresh } = useDashboard();
  const { displays } = useDisplays();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm text-red-600 underline"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">사이니지 대시보드</h1>
        <button
          onClick={refresh}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          새로고침
        </button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Displays Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">디스플레이</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">
              {dashboard?.displays.online || 0}
            </span>
            <span className="text-gray-500 mb-1">
              / {dashboard?.displays.total || 0} 온라인
            </span>
          </div>
          {(dashboard?.displays.offline || 0) > 0 && (
            <p className="text-sm text-yellow-600 mt-2">
              {dashboard?.displays.offline}개 오프라인
            </p>
          )}
        </div>

        {/* Playlists Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">플레이리스트</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold">
              {dashboard?.playlists.active || 0}
            </span>
            <span className="text-gray-500 mb-1">
              / {dashboard?.playlists.total || 0} 활성화
            </span>
          </div>
        </div>

        {/* Currently Playing */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">현재 재생 중</h3>
          <div className="text-3xl font-bold">
            {dashboard?.currentlyPlaying.length || 0}
          </div>
        </div>
      </div>

      {/* Currently Playing Details */}
      {dashboard?.currentlyPlaying && dashboard.currentlyPlaying.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">현재 재생 중인 콘텐츠</h2>
          </div>
          <div className="divide-y">
            {dashboard.currentlyPlaying.map((item) => (
              <div key={item.displayId} className="px-6 py-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{item.displayName}</p>
                  <p className="text-sm text-gray-500">{item.playlistName}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  재생 중
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Schedule */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">오늘의 편성표</h2>
        </div>
        {dashboard?.scheduledToday && dashboard.scheduledToday.length > 0 ? (
          <div className="divide-y">
            {dashboard.scheduledToday.map((schedule) => (
              <div key={schedule.id} className="px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-20 text-center">
                    <span className="text-sm font-medium text-gray-700">
                      {schedule.startTime} - {schedule.endTime}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{schedule.playlistName}</p>
                    <p className="text-sm text-gray-500">
                      {schedule.timeSlot === 'morning' && '오전'}
                      {schedule.timeSlot === 'afternoon' && '오후'}
                      {schedule.timeSlot === 'evening' && '저녁'}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    schedule.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {schedule.isActive ? '활성' : '대기'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            오늘 예정된 편성이 없습니다.
          </div>
        )}
      </div>

      {/* Quick Display Status */}
      {displays.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">디스플레이 상태</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {displays.map((display) => (
              <div
                key={display.id}
                className="border rounded-lg p-4 flex items-center gap-4"
              >
                <div
                  className={`w-3 h-3 rounded-full ${
                    display.status === 'online'
                      ? 'bg-green-500'
                      : display.status === 'offline'
                      ? 'bg-gray-400'
                      : 'bg-red-500'
                  }`}
                />
                <div>
                  <p className="font-medium">{display.name}</p>
                  <p className="text-sm text-gray-500">
                    {display.status === 'online' && '온라인'}
                    {display.status === 'offline' && '오프라인'}
                    {display.status === 'error' && '오류'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
