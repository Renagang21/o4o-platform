/**
 * OwnerSelector Component
 *
 * 콘텐츠 소유 주체 선택 컴포넌트
 * - 소유 주체 유형 선택
 * - 소유자 검색 및 선택
 */

import { useState } from 'react';
import type { ContentOwner, ContentOwnerType } from '../types/ContentTypes.js';
import { OWNER_TYPE_LABELS } from '../types/ContentTypes.js';

interface OwnerSelectorProps {
  value: ContentOwner | null;
  onChange: (owner: ContentOwner) => void;
  availableOwners?: ContentOwner[];
  disabled?: boolean;
}

const OWNER_TYPE_ICONS: Record<ContentOwnerType, string> = {
  individual: '👤',
  business: '🏪',
  organization: '🏛️',
  platform: '🌐',
};

export function OwnerSelector({
  value,
  onChange,
  availableOwners = [],
  disabled = false,
}: OwnerSelectorProps) {
  const [selectedType, setSelectedType] = useState<ContentOwnerType | ''>(
    value?.type || ''
  );
  const [searchQuery, setSearchQuery] = useState('');

  // 선택된 유형에 해당하는 소유자 필터링
  const filteredOwners = availableOwners.filter((owner) => {
    if (selectedType && owner.type !== selectedType) return false;
    if (searchQuery) {
      return owner.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleTypeChange = (type: ContentOwnerType) => {
    setSelectedType(type);
    setSearchQuery('');
  };

  const handleOwnerSelect = (owner: ContentOwner) => {
    onChange(owner);
  };

  return (
    <div className="space-y-4">
      {/* 소유 주체 유형 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          소유 주체 유형
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(OWNER_TYPE_LABELS) as ContentOwnerType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              disabled={disabled}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                selectedType === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span>{OWNER_TYPE_ICONS[type]}</span>
              <span>{OWNER_TYPE_LABELS[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 소유자 검색 및 선택 */}
      {selectedType && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            소유자 선택
          </label>

          {/* 검색 입력 */}
          <input
            type="text"
            placeholder="소유자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:outline-none"
          />

          {/* 소유자 목록 */}
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
            {filteredOwners.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                해당하는 소유자가 없습니다
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredOwners.map((owner) => (
                  <button
                    key={owner.id}
                    type="button"
                    onClick={() => handleOwnerSelect(owner)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 p-3 text-left text-sm hover:bg-gray-50 ${
                      value?.id === owner.id ? 'bg-blue-50' : ''
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className="text-lg">{OWNER_TYPE_ICONS[owner.type]}</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{owner.name}</div>
                      <div className="text-xs text-gray-500">
                        {OWNER_TYPE_LABELS[owner.type]}
                      </div>
                    </div>
                    {value?.id === owner.id && (
                      <span className="text-blue-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 선택된 소유자 표시 */}
      {value && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-600 mb-1">선택된 소유 주체</div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{OWNER_TYPE_ICONS[value.type]}</span>
            <div>
              <div className="font-medium text-gray-900">{value.name}</div>
              <div className="text-xs text-gray-500">
                {OWNER_TYPE_LABELS[value.type]}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OwnerSelector;
