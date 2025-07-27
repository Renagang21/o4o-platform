/**
 * Partner Policies Component
 * 파트너스 정책 관리 - 승인/커미션/등급 시스템
 */

import { useState } from 'react';
import {
  Users,
  UserCheck,
  TrendingUp,
  Award,
  DollarSign,
  Plus,
  Trash2,
  Edit3,
  Info
} from 'lucide-react';

interface PartnerTier {
  name: string;
  minSales: number;
  commissionRate: number;
}

interface PartnerPoliciesSettings {
  autoApproval: boolean;
  commissionRate: number;
  tierLevels: PartnerTier[];
}

interface PartnerPoliciesProps {
  settings: PartnerPoliciesSettings;
  onUpdate: (updates: Partial<PartnerPoliciesSettings>) => void;
}

const PartnerPolicies: React.FC<PartnerPoliciesProps> = ({ settings, onUpdate }) => {
  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [newTier, setNewTier] = useState<PartnerTier>({
    name: '',
    minSales: 0,
    commissionRate: 0
  });
  const [showAddTier, setShowAddTier] = useState(false);

  const handleAutoApprovalToggle = () => {
    onUpdate({ autoApproval: !settings.autoApproval });
  };

  const handleCommissionRateChange = (rate: number) => {
    onUpdate({ commissionRate: rate });
  };

  const handleTierUpdate = (index: number, tier: PartnerTier) => {
    const newTiers = [...settings.tierLevels];
    newTiers[index] = tier;
    onUpdate({ tierLevels: newTiers });
    setEditingTier(null);
  };

  const handleTierDelete = (index: number) => {
    if (confirm('이 등급을 삭제하시겠습니까?')) {
      const newTiers = settings.tierLevels.filter((_, i: any) => i !== index);
      onUpdate({ tierLevels: newTiers });
    }
  };

  const handleAddTier = () => {
    if (!newTier.name.trim()) {
      alert('등급명을 입력해주세요.');
      return;
    }
    
    const newTiers = [...settings.tierLevels, newTier];
    // Sort by minSales ascending
    newTiers.sort((a: any, b: any) => a.minSales - b.minSales);
    
    onUpdate({ tierLevels: newTiers });
    setNewTier({ name: '', minSales: 0, commissionRate: 0 });
    setShowAddTier(false);
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Users className="w-6 h-6 mr-3 text-blue-600" />
          파트너스 정책 관리
        </h2>
        <p className="text-gray-600 mt-2">
          파트너 승인 프로세스, 커미션 비율, 등급 시스템을 설정하고 관리합니다.
        </p>
      </div>

      {/* Auto Approval Settings */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-green-600" />
            파트너 승인 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-1">자동 승인</div>
              <div className="text-sm text-gray-600">
                신규 파트너 신청을 자동으로 승인할지 설정합니다.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoApproval}
                onChange={handleAutoApprovalToggle}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">자동 승인 정책 안내</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>자동 승인 활성화 시 모든 신청이 즉시 승인됩니다</li>
                  <li>비활성화 시 관리자의 수동 검토 후 승인됩니다</li>
                  <li>높은 보안이 필요한 경우 수동 승인을 권장합니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Base Commission Rate */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-600" />
            기본 커미션 설정
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                기본 커미션 비율 (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.1"
                  value={settings.commissionRate}
                  onChange={(e: any) => handleCommissionRateChange(parseFloat(e.target.value) || 0)}
                  className="wp-input pr-8"
                  placeholder="5.0"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                신규 파트너의 기본 커미션 비율을 설정합니다.
              </p>
            </div>
            
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <div className="font-medium mb-2">커미션 계산 예시</div>
                <div className="space-y-1">
                  <div>주문 금액: {formatCurrency(100000)}</div>
                  <div>커미션 비율: {settings.commissionRate}%</div>
                  <div className="font-semibold border-t border-green-300 pt-1">
                    파트너 수익: {formatCurrency(100000 * settings.commissionRate / 100)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Tier System */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center">
              <Award className="w-5 h-5 mr-2 text-purple-600" />
              파트너 등급 시스템
            </h3>
            <button
              onClick={() => setShowAddTier(true)}
              className="wp-button-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              등급 추가
            </button>
          </div>
        </div>
        <div className="wp-card-body">
          <div className="space-y-4">
            {settings.tierLevels.map((tier, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                {editingTier === index ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          등급명
                        </label>
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e: any) => handleTierUpdate(index, { ...tier, name: e.target.value })}
                          className="wp-input"
                          placeholder="브론즈"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          최소 매출 (원)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={tier.minSales}
                          onChange={(e: any) => handleTierUpdate(index, { ...tier, minSales: parseInt(e.target.value) || 0 })}
                          className="wp-input"
                          placeholder="1000000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          커미션 비율 (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          step="0.1"
                          value={tier.commissionRate}
                          onChange={(e: any) => handleTierUpdate(index, { ...tier, commissionRate: parseFloat(e.target.value) || 0 })}
                          className="wp-input"
                          placeholder="5.0"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setEditingTier(null)}
                        className="wp-button-secondary"
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleTierUpdate(index, tier)}
                        className="wp-button-primary"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          index === 0 ? 'bg-orange-400' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-yellow-400' :
                          'bg-purple-400'
                        }`} />
                        <div>
                          <div className="font-semibold text-gray-900">{tier.name}</div>
                          <div className="text-sm text-gray-600">
                            최소 매출: {formatCurrency(tier.minSales)} | 커미션: {tier.commissionRate}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingTier(index)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleTierDelete(index)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add New Tier Form */}
            {showAddTier && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">새 등급 추가</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        등급명
                      </label>
                      <input
                        type="text"
                        value={newTier.name}
                        onChange={(e: any) => setNewTier({ ...newTier, name: e.target.value })}
                        className="wp-input"
                        placeholder="다이아몬드"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        최소 매출 (원)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={newTier.minSales}
                        onChange={(e: any) => setNewTier({ ...newTier, minSales: parseInt(e.target.value) || 0 })}
                        className="wp-input"
                        placeholder="20000000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        커미션 비율 (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.1"
                        value={newTier.commissionRate}
                        onChange={(e: any) => setNewTier({ ...newTier, commissionRate: parseFloat(e.target.value) || 0 })}
                        className="wp-input"
                        placeholder="15.0"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowAddTier(false);
                        setNewTier({ name: '', minSales: 0, commissionRate: 0 });
                      }}
                      className="wp-button-secondary"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddTier}
                      className="wp-button-primary"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tier System Info */}
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start">
              <Award className="w-5 h-5 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-purple-800">
                <div className="font-medium mb-1">등급 시스템 동작 방식</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>파트너의 누적 매출에 따라 자동으로 등급이 결정됩니다</li>
                  <li>상위 등급일수록 높은 커미션 비율을 적용받습니다</li>
                  <li>등급 변경은 매월 1일에 자동으로 재계산됩니다</li>
                  <li>등급 변경 시 파트너에게 자동으로 알림이 발송됩니다</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Statistics */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            현재 파트너 현황
          </h3>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">127</div>
              <div className="text-sm text-blue-800">총 파트너</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">23</div>
              <div className="text-sm text-green-800">승인 대기</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">89</div>
              <div className="text-sm text-purple-800">활성 파트너</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(12500000)}</div>
              <div className="text-sm text-orange-800">이번 달 총 커미션</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerPolicies;