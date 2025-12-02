/**
 * 개인화 설정 컴포넌트
 *
 * - 개인화 ON/OFF 토글
 * - 행동 수집 설정
 * - 추천 표시 설정
 */

import React, { useState, useEffect } from 'react';
import { Toggle } from 'lucide-react';
import {
  getPersonalizationSettings,
  savePersonalizationSettings,
  clearAllSignals
} from '../../services/signalTracker';
import { trackPersonalizationToggle } from '../../utils/analytics';
import toast from 'react-hot-toast';

export const PersonalizationSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    collectBehavior: true,
    showRecommendations: true
  });

  useEffect(() => {
    const loadedSettings = getPersonalizationSettings();
    setSettings(loadedSettings);
  }, []);

  const handleToggle = (key: 'enabled' | 'collectBehavior' | 'showRecommendations') => {
    const newSettings = {
      ...settings,
      [key]: !settings[key]
    };

    // enabled가 false가 되면 모든 신호 삭제
    if (key === 'enabled' && !newSettings.enabled) {
      if (confirm('개인화를 비활성화하면 저장된 모든 행동 데이터가 삭제됩니다. 계속하시겠습니까?')) {
        clearAllSignals();
        savePersonalizationSettings(newSettings);
        setSettings(newSettings);
        trackPersonalizationToggle(false);
        toast.success('개인화가 비활성화되었습니다.');

        // 페이지 새로고침
        setTimeout(() => window.location.reload(), 1000);
      }
    } else {
      savePersonalizationSettings(newSettings);
      setSettings(newSettings);

      if (key === 'enabled') {
        trackPersonalizationToggle(newSettings.enabled);
      }

      toast.success('설정이 저장되었습니다.');
    }
  };

  return (
    <div className="personalization-settings bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">개인화 설정</h2>
      <p className="text-sm text-gray-600 mb-6">
        귀하의 사용 패턴을 분석하여 맞춤형 콘텐츠를 제공합니다.
        언제든지 비활성화할 수 있으며, 데이터는 익명으로 처리됩니다.
      </p>

      <div className="space-y-4">
        {/* 개인화 활성화/비활성화 */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <div className="font-medium text-gray-900">개인화 활성화</div>
            <div className="text-sm text-gray-500 mt-1">
              역할 및 행태 기반 맞춤 콘텐츠 표시
            </div>
          </div>
          <button
            onClick={() => handleToggle('enabled')}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={settings.enabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* 행동 수집 */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200">
          <div>
            <div className="font-medium text-gray-900">행동 데이터 수집</div>
            <div className="text-sm text-gray-500 mt-1">
              메뉴 클릭, 카드 실행 등의 행동 기록
            </div>
          </div>
          <button
            onClick={() => handleToggle('collectBehavior')}
            disabled={!settings.enabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.collectBehavior && settings.enabled ? 'bg-blue-600' : 'bg-gray-300'
            } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="switch"
            aria-checked={settings.collectBehavior && settings.enabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.collectBehavior && settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* 추천 표시 */}
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="font-medium text-gray-900">추천 표시</div>
            <div className="text-sm text-gray-500 mt-1">
              사이드바 추천 및 관련 콘텐츠 표시
            </div>
          </div>
          <button
            onClick={() => handleToggle('showRecommendations')}
            disabled={!settings.enabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.showRecommendations && settings.enabled ? 'bg-blue-600' : 'bg-gray-300'
            } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="switch"
            aria-checked={settings.showRecommendations && settings.enabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.showRecommendations && settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 개인정보 처리 방침 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-900 mb-2">개인정보 보호</h3>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• 수집된 데이터는 익명으로 처리됩니다</li>
          <li>• 개인 식별 정보는 저장되지 않습니다</li>
          <li>• 데이터는 최대 30일간 보존됩니다</li>
          <li>• 언제든지 삭제 요청할 수 있습니다</li>
        </ul>
      </div>
    </div>
  );
};

export default PersonalizationSettings;
