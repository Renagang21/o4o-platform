/**
 * ListingDisplayForm
 *
 * Phase 1: Listing 개별 디스플레이 설정 폼
 * - 운영자가 특정 Listing의 디스플레이 설정을 관리
 * - channelSpecificData.display 필드 편집
 */

import React, { useState, useEffect } from 'react';
import type {
  ListingDisplayConfig,
  ListingVisibility,
  DeviceType,
} from '@o4o/types';

interface ListingDisplayFormProps {
  /** 현재 디스플레이 설정 */
  initialConfig?: ListingDisplayConfig;
  /** 사용 가능한 코너 목록 */
  availableCorners: Array<{ id: string; name: string }>;
  /** 사용 가능한 디바이스 목록 */
  availableDevices: Array<{ id: string; name: string; type: DeviceType }>;
  /** 저장 핸들러 */
  onSave: (config: ListingDisplayConfig) => void | Promise<void>;
  /** 취소 핸들러 */
  onCancel?: () => void;
  /** 저장 중 상태 */
  isSaving?: boolean;
}

const VISIBILITY_OPTIONS: Array<{ value: ListingVisibility; label: string; description: string }> = [
  { value: 'visible', label: '표시', description: '일반 노출' },
  { value: 'featured', label: '추천', description: '상단 강조 노출' },
  { value: 'hidden', label: '숨김', description: '해당 위치에서 숨김' },
];

export const ListingDisplayForm: React.FC<ListingDisplayFormProps> = ({
  initialConfig,
  availableCorners,
  availableDevices,
  onSave,
  onCancel,
  isSaving = false,
}) => {
  const [config, setConfig] = useState<ListingDisplayConfig>({
    visibility: 'visible',
    sortOrder: 0,
    ...initialConfig,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 초기값 변경 시 동기화
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        visibility: 'visible',
        sortOrder: 0,
        ...initialConfig,
      });
    }
  }, [initialConfig]);

  const handleChange = (field: keyof ListingDisplayConfig, value: string | number | undefined) => {
    setConfig(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value,
    }));
    // 에러 클리어
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // sortOrder 유효성 검사
    if (config.sortOrder !== undefined && config.sortOrder < 0) {
      newErrors.sortOrder = '정렬 순서는 0 이상이어야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    // undefined 필드 제거
    const cleanConfig: ListingDisplayConfig = {};
    if (config.deviceId) cleanConfig.deviceId = config.deviceId;
    if (config.corner) cleanConfig.corner = config.corner;
    if (config.sortOrder !== undefined) cleanConfig.sortOrder = config.sortOrder;
    if (config.visibility) cleanConfig.visibility = config.visibility;
    if (config.deviceType) cleanConfig.deviceType = config.deviceType;

    await onSave(cleanConfig);
  };

  const handleReset = () => {
    setConfig({
      visibility: 'visible',
      sortOrder: 0,
    });
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 노출 상태 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          노출 상태
        </label>
        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map(option => (
            <label
              key={option.value}
              className={`
                flex items-center p-3 border rounded-lg cursor-pointer transition-colors
                ${config.visibility === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <input
                type="radio"
                name="visibility"
                value={option.value}
                checked={config.visibility === option.value}
                onChange={(e) => handleChange('visibility', e.target.value as ListingVisibility)}
                className="sr-only"
              />
              <div>
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-sm text-gray-500">{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 코너 선택 */}
      <div>
        <label htmlFor="corner" className="block text-sm font-medium text-gray-700 mb-1">
          코너
        </label>
        <select
          id="corner"
          value={config.corner || ''}
          onChange={(e) => handleChange('corner', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">선택 안함 (전체 코너)</option>
          {availableCorners.map(corner => (
            <option key={corner.id} value={corner.id}>
              {corner.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          특정 코너에서만 이 상품을 노출하려면 선택하세요
        </p>
      </div>

      {/* 디바이스 선택 */}
      <div>
        <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-1">
          디바이스
        </label>
        <select
          id="deviceId"
          value={config.deviceId || ''}
          onChange={(e) => {
            const deviceId = e.target.value;
            handleChange('deviceId', deviceId);
            // 디바이스 선택 시 deviceType 자동 설정
            if (deviceId) {
              const device = availableDevices.find(d => d.id === deviceId);
              if (device) {
                handleChange('deviceType', device.type);
              }
            } else {
              handleChange('deviceType', undefined);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">선택 안함 (전체 디바이스)</option>
          {availableDevices.map(device => (
            <option key={device.id} value={device.id}>
              {device.name} ({device.type})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          특정 디바이스에서만 이 상품을 노출하려면 선택하세요
        </p>
      </div>

      {/* 정렬 순서 */}
      <div>
        <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
          정렬 순서
        </label>
        <input
          type="number"
          id="sortOrder"
          min="0"
          value={config.sortOrder ?? 0}
          onChange={(e) => handleChange('sortOrder', parseInt(e.target.value, 10) || 0)}
          className={`
            w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${errors.sortOrder ? 'border-red-500' : 'border-gray-300'}
          `}
        />
        {errors.sortOrder && (
          <p className="mt-1 text-sm text-red-600">{errors.sortOrder}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          숫자가 작을수록 먼저 표시됩니다 (0이 가장 앞)
        </p>
      </div>

      {/* 현재 설정 미리보기 */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">현재 설정 요약</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>
            <span className="font-medium">노출:</span>{' '}
            {VISIBILITY_OPTIONS.find(o => o.value === config.visibility)?.label || '표시'}
          </div>
          <div>
            <span className="font-medium">코너:</span>{' '}
            {config.corner
              ? availableCorners.find(c => c.id === config.corner)?.name || config.corner
              : '전체'
            }
          </div>
          <div>
            <span className="font-medium">디바이스:</span>{' '}
            {config.deviceId
              ? availableDevices.find(d => d.id === config.deviceId)?.name || config.deviceId
              : '전체'
            }
          </div>
          <div>
            <span className="font-medium">정렬 순서:</span> {config.sortOrder ?? 0}
          </div>
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        >
          초기화
        </button>
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isSaving}
            >
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className={`
              px-6 py-2 text-sm font-medium text-white rounded-lg
              ${isSaving
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ListingDisplayForm;
