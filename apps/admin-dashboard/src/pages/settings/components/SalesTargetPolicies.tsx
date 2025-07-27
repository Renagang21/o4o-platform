/**
 * Sales Target Policies Component
 * 매출 목표 및 알림 임계값 설정 컴포넌트
 */

import { useState, useMemo } from 'react';
import {
  Target,
  TrendingUp,
  AlertTriangle,
  Award,
  Calendar,
  DollarSign,
  Bell,
  BarChart3,
  Info,
  Zap
} from 'lucide-react';

interface SalesTargetSettings {
  monthlyTarget: number;
  alertThreshold: number;
  bonusThreshold: number;
}

interface SalesTargetPoliciesProps {
  settings: SalesTargetSettings;
  onUpdate: (updates: Partial<SalesTargetSettings>) => void;
}

const SalesTargetPolicies: FC<SalesTargetPoliciesProps> = ({ settings, onUpdate }) => {
  const [_previewMode, _setPreviewMode] = useState(false);

  // Mock current sales data for demonstration
  const currentMonthSales = 37500000; // 3,750만원
  const lastMonthSales = 42000000; // 4,200만원
  const yearlyTarget = settings.monthlyTarget * 12;
  const currentProgress = (currentMonthSales / settings.monthlyTarget) * 100;

  const handleTargetChange = (target: number) => {
    onUpdate({ monthlyTarget: target });
  };

  const handleAlertThresholdChange = (threshold: number) => {
    onUpdate({ alertThreshold: threshold });
  };

  const handleBonusThresholdChange = (threshold: number) => {
    onUpdate({ bonusThreshold: threshold });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  // const _formatNumber = (_num: number) => {
  //   return new Intl.NumberFormat('ko-KR').format(_num);
  // };

  const getProgressColor = (progress: number) => {
    if (progress >= settings.bonusThreshold) return 'bg-green-500';
    if (progress >= settings.alertThreshold) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= settings.bonusThreshold) return { text: '목표 초과 달성!', color: 'text-green-600', icon: <Award className="w-4 h-4" /> };
    if (progress >= settings.alertThreshold) return { text: '목표 근접', color: 'text-yellow-600', icon: <TrendingUp className="w-4 h-4" /> };
    return { text: '목표 미달', color: 'text-red-600', icon: <AlertTriangle className="w-4 h-4" /> };
  };

  const alertAmount = useMemo(() => {
    return (settings.monthlyTarget * settings.alertThreshold) / 100;
  }, [settings.monthlyTarget, settings.alertThreshold]);

  const bonusAmount = useMemo(() => {
    return (settings.monthlyTarget * settings.bonusThreshold) / 100;
  }, [settings.monthlyTarget, settings.bonusThreshold]);

  const progressStatus = getProgressStatus(currentProgress);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Target className="w-6 h-6 mr-3 text-green-600" />
          매출 목표 설정
        </h2>
        <p className="text-gray-600 mt-2">
          월 매출 목표와 알림 임계값을 설정하여 효율적인 매출 관리를 하세요.
        </p>
      </div>

      {/* Current Performance Overview */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              이번 달 매출 현황
            </h3>
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${progressStatus.color} bg-opacity-10`}>
              {progressStatus.icon}
              <span className="ml-1">{progressStatus.text}</span>
            </div>
          </div>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(currentMonthSales)}</div>
              <div className="text-sm text-blue-800">현재 매출</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{formatCurrency(settings.monthlyTarget)}</div>
              <div className="text-sm text-gray-800">월 목표</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{currentProgress.toFixed(1)}%</div>
              <div className="text-sm text-green-800">달성률</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>진행률</span>
              <span>{currentProgress.toFixed(1)}% ({formatCurrency(currentMonthSales)} / {formatCurrency(settings.monthlyTarget)})</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(currentProgress)}`}
                style={{ width: `${Math.min(100, currentProgress)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span className="text-yellow-600">{settings.alertThreshold}% (알림)</span>
              <span className="text-green-600">{settings.bonusThreshold}% (보너스)</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Target Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            월 매출 목표 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                월 매출 목표 (원)
              </label>
              <input
                type="number"
                min="0"
                step="1000000"
                value={settings.monthlyTarget}
                onChange={(e: any) => handleTargetChange(parseInt(e.target.value) || 0)}
                className="wp-input"
                placeholder="50000000"
              />
              <p className="text-sm text-gray-500 mt-1">
                매월 달성하고자 하는 매출 목표를 설정합니다.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <div className="font-medium mb-2">연간 목표 예상</div>
                <div className="space-y-1">
                  <div>월 목표: {formatCurrency(settings.monthlyTarget)}</div>
                  <div className="font-semibold border-t border-green-300 pt-1">
                    연 목표: {formatCurrency(yearlyTarget)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Threshold Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Bell className="w-5 h-5 mr-2 text-yellow-600" />
            알림 임계값 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="space-y-6">
            {/* Alert Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                알림 임계값 (%)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={settings.alertThreshold}
                      onChange={(e: any) => handleAlertThresholdChange(parseInt(e.target.value) || 0)}
                      className="wp-input pr-8"
                      placeholder="80"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    이 비율에 도달하면 알림을 발송합니다.
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium mb-1">알림 발송 시점</div>
                    <div>매출 {formatCurrency(alertAmount)} 달성 시</div>
                    <div className="text-xs mt-1 text-yellow-700">
                      (목표의 {settings.alertThreshold}% 달성)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bonus Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                보너스 임계값 (%)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min="100"
                      max="200"
                      step="5"
                      value={settings.bonusThreshold}
                      onChange={(e: any) => handleBonusThresholdChange(parseInt(e.target.value) || 100)}
                      className="wp-input pr-8"
                      placeholder="110"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    이 비율을 초과하면 보너스 지급 대상이 됩니다.
                  </p>
                </div>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-green-800">
                    <div className="font-medium mb-1">보너스 지급 시점</div>
                    <div>매출 {formatCurrency(bonusAmount)} 초과 시</div>
                    <div className="text-xs mt-1 text-green-700">
                      (목표의 {settings.bonusThreshold}% 초과)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Zap className="w-5 h-5 mr-2 text-purple-600" />
            자동 알림 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">일일 매출 알림</div>
                  <div className="text-sm text-gray-600">매일 자정에 당일 매출 요약 발송</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">주간 보고서</div>
                  <div className="text-sm text-gray-600">매주 월요일에 주간 매출 분석 발송</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">목표 달성 알림</div>
                  <div className="text-sm text-gray-600">임계값 도달 시 즉시 알림 발송</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">알림 발송 대상</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>관리자 (CEO, 매니저)</li>
                    <li>영업팀 (팀장, 담당자)</li>
                    <li>마케팅팀 (마케팅 매니저)</li>
                    <li>재무팀 (CFO, 회계 담당자)</li>
                  </ul>
                  <div className="mt-2 text-xs text-blue-700">
                    알림 대상은 사용자 관리에서 개별 설정 가능합니다.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Performance */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-gray-600" />
            최근 성과 요약
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{formatCurrency(currentMonthSales)}</div>
              <div className="text-sm text-blue-800">이번 달</div>
              <div className="text-xs text-blue-700 mt-1">
                {currentProgress >= 100 ? '목표 달성!' : `${(100 - currentProgress).toFixed(1)}% 남음`}
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-600">{formatCurrency(lastMonthSales)}</div>
              <div className="text-sm text-gray-800">지난 달</div>
              <div className={`text-xs mt-1 ${currentMonthSales > lastMonthSales ? 'text-green-600' : 'text-red-600'}`}>
                {currentMonthSales > lastMonthSales ? '▲' : '▼'} {Math.abs(((currentMonthSales - lastMonthSales) / lastMonthSales * 100)).toFixed(1)}%
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">89.2%</div>
              <div className="text-sm text-green-800">평균 달성률</div>
              <div className="text-xs text-green-700 mt-1">최근 6개월</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">4회</div>
              <div className="text-sm text-purple-800">목표 초과 달성</div>
              <div className="text-xs text-purple-700 mt-1">최근 12개월</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesTargetPolicies;