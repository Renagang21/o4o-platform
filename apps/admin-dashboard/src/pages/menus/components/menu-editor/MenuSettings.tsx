import { FC, useState, useEffect } from 'react';
import { Settings, MapPin, Check } from 'lucide-react';
import type { Menu } from '../../../../api/menuApi';
import MenuApi from '../../../../api/menuApi';

export interface MenuSettingsProps {
  menu: Partial<Menu> | null;
  onUpdate: (updates: Partial<Menu>) => void;
  onNameChange: (name: string) => void;
  onLocationChange: (location: string) => void;
}

interface MenuLocation {
  id: string;
  key: string;
  name: string;
  description?: string;
}

/**
 * Menu Settings Component
 * Handles menu name, slug, location, and other general settings
 */
export const MenuSettings: FC<MenuSettingsProps> = ({
  menu,
  onUpdate,
  onNameChange,
  onLocationChange
}) => {
  const [locations, setLocations] = useState<MenuLocation[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Load available menu locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        setIsLoadingLocations(true);
        const response = await MenuApi.getMenuLocations();
        if (response.data) {
          setLocations(response.data);
        }
      } catch (error) {
        console.error('Failed to load menu locations:', error);
        // Use default locations as fallback
        setLocations([
          { id: '1', key: 'primary', name: '주 메뉴', description: '사이트 상단 내비게이션' },
          { id: '2', key: 'footer', name: '푸터 메뉴', description: '사이트 하단 링크' },
          { id: '3', key: 'mobile', name: '모바일 메뉴', description: '모바일 전용 내비게이션' },
          { id: '4', key: 'social', name: '소셜 링크', description: '소셜 미디어 링크' }
        ]);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    loadLocations();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-gray-600" />
        <h2 className="text-lg font-semibold text-gray-900">메뉴 설정</h2>
      </div>

      <div className="space-y-6">
        {/* Menu Name */}
        <div>
          <label htmlFor="menu-name" className="block text-sm font-medium text-gray-700 mb-2">
            메뉴 이름 *
          </label>
          <input
            id="menu-name"
            type="text"
            value={menu?.name || ''}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="예: 주 메뉴"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            이 이름은 관리자 화면에서만 표시됩니다
          </p>
        </div>

        {/* Menu Slug */}
        <div>
          <label htmlFor="menu-slug" className="block text-sm font-medium text-gray-700 mb-2">
            슬러그
          </label>
          <input
            id="menu-slug"
            type="text"
            value={menu?.slug || ''}
            onChange={(e) => onUpdate({ slug: e.target.value })}
            placeholder="자동 생성됨"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            URL에 사용되는 고유 식별자 (자동 생성됨)
          </p>
        </div>

        {/* Menu Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <MapPin className="w-4 h-4 inline mr-1" />
            메뉴 위치
          </label>

          {isLoadingLocations ? (
            <div className="text-sm text-gray-500">위치 목록 불러오는 중...</div>
          ) : (
            <div className="space-y-2">
              {locations.map((location) => (
                <label
                  key={location.id}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    menu?.location === location.key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="menu-location"
                    value={location.key}
                    checked={menu?.location === location.key}
                    onChange={(e) => onLocationChange(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{location.name}</span>
                      {menu?.location === location.key && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    {location.description && (
                      <p className="text-xs text-gray-500 mt-1">{location.description}</p>
                    )}
                  </div>
                </label>
              ))}

              <label
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  !menu?.location
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="menu-location"
                  value=""
                  checked={!menu?.location}
                  onChange={() => onLocationChange('')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">위치 지정 안함</span>
                    {!menu?.location && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    나중에 위치를 지정하거나 코드에서 직접 사용
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Menu Description */}
        <div>
          <label htmlFor="menu-description" className="block text-sm font-medium text-gray-700 mb-2">
            설명 (선택사항)
          </label>
          <textarea
            id="menu-description"
            value={menu?.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="이 메뉴에 대한 설명을 입력하세요"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
          <input
            id="menu-active"
            type="checkbox"
            checked={menu?.is_active ?? true}
            onChange={(e) => onUpdate({ is_active: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="menu-active" className="flex-1 cursor-pointer">
            <span className="font-medium text-gray-900">메뉴 활성화</span>
            <p className="text-xs text-gray-500 mt-1">
              비활성화하면 프론트엔드에 표시되지 않습니다
            </p>
          </label>
        </div>
      </div>
    </div>
  );
};
