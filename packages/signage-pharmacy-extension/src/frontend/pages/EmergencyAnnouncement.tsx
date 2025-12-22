/**
 * Emergency Announcement Page
 *
 * Phase 3: Quick announcement feature for common pharmacy situations.
 * Executes immediately in 'replace' mode and can return to normal schedule.
 */

import React, { useState } from 'react';
import {
  EMERGENCY_PRESETS,
  type EmergencyPreset,
  renderEmergencyMessage,
} from '../data/emergencyPresets.js';
import { useQuickAction, useDisplays } from '../hooks/usePharmacySignage.js';

interface PresetCardProps {
  preset: EmergencyPreset;
  isActive: boolean;
  onSelect: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({ preset, isActive, onSelect }) => {
  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
      blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
      red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
      purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
      gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800' },
      indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800' },
    };
    return colors[color] || colors.gray;
  };

  const colorClasses = getColorClasses(preset.color);

  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
        isActive
          ? `${colorClasses.bg} ${colorClasses.border}`
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses.bg}`}>
          <span className={`text-lg ${colorClasses.text}`}>
            {preset.icon === 'Coffee' && '☕'}
            {preset.icon === 'Clock' && '🕐'}
            {preset.icon === 'AlertTriangle' && '⚠️'}
            {preset.icon === 'Users' && '👥'}
            {preset.icon === 'Timer' && '⏱️'}
            {preset.icon === 'Edit' && '✏️'}
          </span>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{preset.name}</h3>
          <p className="text-sm text-gray-500">{preset.description}</p>
        </div>
      </div>
    </button>
  );
};

interface VariableInputProps {
  variable: NonNullable<EmergencyPreset['variables']>[number];
  value: string;
  onChange: (value: string) => void;
}

const VariableInput: React.FC<VariableInputProps> = ({ variable, value, onChange }) => {
  if (variable.type === 'select') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {variable.label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {variable.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (variable.type === 'time') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {variable.label}
        </label>
        <input
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {variable.label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={variable.defaultValue}
      />
    </div>
  );
};

export const EmergencyAnnouncement: React.FC = () => {
  const { displays } = useDisplays();
  const { executing, execute, stop, lastResult } = useQuickAction();

  const [selectedPreset, setSelectedPreset] = useState<EmergencyPreset | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [selectedDisplayId, setSelectedDisplayId] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);

  const selectedDisplay = displays.find((d) => d.id === selectedDisplayId);
  const availableSlots = selectedDisplay?.slots || [];

  // Initialize variable values when preset is selected
  React.useEffect(() => {
    if (selectedPreset?.variables) {
      const defaultValues: Record<string, string> = {};
      for (const variable of selectedPreset.variables) {
        defaultValues[variable.key] = variable.defaultValue || '';
      }
      setVariableValues(defaultValues);
    }
  }, [selectedPreset]);

  // Reset slot when display changes
  React.useEffect(() => {
    setSelectedSlotId('');
  }, [selectedDisplayId]);

  const handleVariableChange = (key: string, value: string) => {
    setVariableValues((prev) => ({ ...prev, [key]: value }));
  };

  const previewMessage = selectedPreset
    ? renderEmergencyMessage(selectedPreset, variableValues)
    : '';

  const handleExecute = async () => {
    if (!selectedPreset || !selectedSlotId) return;

    // In a real implementation, this would create a temporary MediaList
    // with the announcement content and execute it
    // For MVP, we use the quick action with metadata

    const result = await execute({
      playlistId: 'emergency-announcement', // Special ID for emergency
      displaySlotId: selectedSlotId,
      executeMode: 'replace',
      duration: selectedPreset.defaultDuration || undefined,
      priority: 100, // High priority for emergency
    });

    if (result.success && result.executionId) {
      setActiveExecutionId(result.executionId);
    }
  };

  const handleStop = async () => {
    if (activeExecutionId) {
      await stop(activeExecutionId, 'Emergency announcement ended');
      setActiveExecutionId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">긴급 공지</h1>
          <p className="text-gray-500 mt-1">
            지금 바로 공지를 띄우고, 끝나면 원래 편성으로 돌아갑니다
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Preset Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">공지 유형 선택</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EMERGENCY_PRESETS.map((preset) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  isActive={selectedPreset?.id === preset.id}
                  onSelect={() => setSelectedPreset(preset)}
                />
              ))}
            </div>
          </div>

          {/* Variable Inputs */}
          {selectedPreset && selectedPreset.variables && selectedPreset.variables.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">세부 설정</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedPreset.variables.map((variable) => (
                  <VariableInput
                    key={variable.key}
                    variable={variable}
                    value={variableValues[variable.key] || ''}
                    onChange={(value) => handleVariableChange(variable.key, value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Display Selection */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">표시할 디스플레이</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  디스플레이
                </label>
                <select
                  value={selectedDisplayId}
                  onChange={(e) => setSelectedDisplayId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택하세요</option>
                  {displays.map((display) => (
                    <option key={display.id} value={display.id}>
                      {display.name} ({display.status === 'online' ? '온라인' : '오프라인'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  슬롯
                </label>
                <select
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedDisplayId}
                >
                  <option value="">선택하세요</option>
                  {availableSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.slotName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          {/* Message Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">미리보기</h2>
            {selectedPreset ? (
              <div className="bg-gray-900 text-white rounded-lg p-6 min-h-40 flex items-center justify-center text-center">
                <p className="text-lg whitespace-pre-line">{previewMessage}</p>
              </div>
            ) : (
              <div className="bg-gray-100 rounded-lg p-6 min-h-40 flex items-center justify-center text-center text-gray-500">
                공지 유형을 선택하면 미리보기가 표시됩니다
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-6">
            {activeExecutionId ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-medium">공지 표시 중</span>
                </div>
                <button
                  onClick={handleStop}
                  className="w-full py-3 px-4 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                >
                  공지 종료하기
                </button>
                <p className="text-sm text-gray-500 text-center">
                  종료하면 원래 편성으로 돌아갑니다
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={handleExecute}
                  disabled={!selectedPreset || !selectedSlotId || executing}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    !selectedPreset || !selectedSlotId || executing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
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
                    '지금 공지 띄우기'
                  )}
                </button>

                {!selectedPreset && (
                  <p className="text-sm text-gray-500 text-center">
                    먼저 공지 유형을 선택하세요
                  </p>
                )}
                {selectedPreset && !selectedSlotId && (
                  <p className="text-sm text-gray-500 text-center">
                    디스플레이와 슬롯을 선택하세요
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Last Result */}
          {lastResult && !activeExecutionId && (
            <div
              className={`rounded-lg p-4 ${
                lastResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p className={`text-sm ${lastResult.success ? 'text-green-700' : 'text-red-700'}`}>
                {lastResult.success ? '공지가 정상적으로 종료되었습니다.' : lastResult.error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmergencyAnnouncement;
