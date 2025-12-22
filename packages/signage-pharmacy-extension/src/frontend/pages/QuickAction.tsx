/**
 * Quick Action Page
 *
 * Execute playlists immediately on displays.
 * Features:
 * - Select a playlist
 * - Select a display/slot
 * - Choose execute mode (immediate/replace)
 * - Execute and monitor status
 */

import React, { useState, useEffect } from 'react';
import { usePlaylists, useDisplays, useQuickAction } from '../hooks/usePharmacySignage.js';
import type { PharmacyQuickActionDto } from '../../backend/dto/index.js';

export const QuickAction: React.FC = () => {
  const { playlists, loading: playlistsLoading } = usePlaylists();
  const { displays, loading: displaysLoading, refresh: refreshDisplays } = useDisplays();
  const { executing, lastResult, execute, stop } = useQuickAction();

  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [selectedDisplayId, setSelectedDisplayId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [executeMode, setExecuteMode] = useState<'immediate' | 'replace'>('immediate');
  const [duration, setDuration] = useState<number>(0); // 0 = unlimited
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

  const selectedDisplay = displays.find((d) => d.id === selectedDisplayId);
  const availableSlots = selectedDisplay?.slots || [];

  // Reset slot when display changes
  useEffect(() => {
    setSelectedSlotId('');
  }, [selectedDisplayId]);

  const handleExecute = async () => {
    if (!selectedPlaylistId || !selectedSlotId) return;

    const action: PharmacyQuickActionDto = {
      playlistId: selectedPlaylistId,
      displaySlotId: selectedSlotId,
      executeMode,
      duration: duration > 0 ? duration : undefined,
    };

    const result = await execute(action);
    if (result.success && result.executionId) {
      setCurrentExecutionId(result.executionId);
    }
  };

  const handleStop = async () => {
    if (currentExecutionId) {
      await stop(currentExecutionId, 'User requested stop');
      setCurrentExecutionId(null);
    }
  };

  const loading = playlistsLoading || displaysLoading;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">즉시 실행</h1>
          <p className="text-gray-500 mt-1">지금 바로 플레이리스트를 재생하세요</p>
        </div>
        <button
          onClick={refreshDisplays}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
        >
          디스플레이 새로고침
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-6">재생 설정</h2>

          <div className="space-y-6">
            {/* Playlist Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                플레이리스트 선택 *
              </label>
              <select
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">플레이리스트를 선택하세요</option>
                {playlists.map((playlist) => (
                  <option key={playlist.id} value={playlist.id}>
                    {playlist.name} ({playlist.items.length}개 콘텐츠)
                  </option>
                ))}
              </select>
            </div>

            {/* Display Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                디스플레이 선택 *
              </label>
              <select
                value={selectedDisplayId}
                onChange={(e) => setSelectedDisplayId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">디스플레이를 선택하세요</option>
                {displays.map((display) => (
                  <option key={display.id} value={display.id}>
                    {display.name} ({display.status === 'online' ? '온라인' : '오프라인'})
                  </option>
                ))}
              </select>
            </div>

            {/* Slot Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                슬롯 선택 *
              </label>
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!selectedDisplayId}
              >
                <option value="">슬롯을 선택하세요</option>
                {availableSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.slotName} ({slot.status === 'IDLE' ? '대기' : slot.status})
                  </option>
                ))}
              </select>
              {!selectedDisplayId && (
                <p className="text-sm text-gray-500 mt-1">먼저 디스플레이를 선택하세요</p>
              )}
            </div>

            {/* Execute Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                실행 모드
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExecuteMode('immediate')}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    executeMode === 'immediate'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium">대기열 추가</p>
                  <p className="text-xs text-gray-500">현재 재생이 끝나면 시작</p>
                </button>
                <button
                  type="button"
                  onClick={() => setExecuteMode('replace')}
                  className={`p-3 border rounded-lg text-left transition-colors ${
                    executeMode === 'replace'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <p className="font-medium">즉시 교체</p>
                  <p className="text-xs text-gray-500">현재 재생을 중단하고 시작</p>
                </button>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                재생 시간 (초)
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0 = 무제한"
              />
              <p className="text-sm text-gray-500 mt-1">
                0을 입력하면 수동으로 중지할 때까지 재생됩니다
              </p>
            </div>

            {/* Execute Button */}
            <div className="pt-4">
              <button
                onClick={handleExecute}
                disabled={!selectedPlaylistId || !selectedSlotId || executing}
                className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors ${
                  !selectedPlaylistId || !selectedSlotId || executing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                }`}
              >
                {executing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    실행 중...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    재생 시작
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Status & Result */}
        <div className="space-y-6">
          {/* Current Execution */}
          {currentExecutionId && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">현재 실행</h2>
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-800">재생 중</p>
                  <p className="text-sm text-green-600">ID: {currentExecutionId.slice(0, 8)}...</p>
                </div>
                <button
                  onClick={handleStop}
                  className="py-2 px-4 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600"
                >
                  중지
                </button>
              </div>
            </div>
          )}

          {/* Last Result */}
          {lastResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">마지막 실행 결과</h2>
              <div
                className={`p-4 rounded-lg border ${
                  lastResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {lastResult.success ? (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  <span
                    className={`font-medium ${
                      lastResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {lastResult.success ? '실행 성공' : '실행 실패'}
                  </span>
                </div>
                {lastResult.status && (
                  <p className="text-sm mt-2">상태: {lastResult.status}</p>
                )}
                {lastResult.error && (
                  <p className="text-sm text-red-600 mt-2">{lastResult.error}</p>
                )}
              </div>
            </div>
          )}

          {/* Display Status Quick View */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">디스플레이 상태</h2>
            {displays.length > 0 ? (
              <div className="space-y-3">
                {displays.map((display) => (
                  <div
                    key={display.id}
                    className={`p-3 rounded-lg border ${
                      display.id === selectedDisplayId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            display.status === 'online'
                              ? 'bg-green-500'
                              : display.status === 'offline'
                              ? 'bg-gray-400'
                              : 'bg-red-500'
                          }`}
                        />
                        <span className="font-medium">{display.name}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {display.slots.length}개 슬롯
                      </span>
                    </div>
                    {display.currentPlaylistName && (
                      <p className="text-sm text-gray-500 mt-1 ml-6">
                        현재: {display.currentPlaylistName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">
                등록된 디스플레이가 없습니다
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickAction;
