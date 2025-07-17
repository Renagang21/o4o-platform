/**
 * Policy Settings System - 관리자 정책 설정 시스템
 * WordPress 수준의 완전 커스터마이징 정책 관리
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Users,
  Package,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCcw,
  Info,
  Clock,
  Bell,
  Archive,
  Globe,
  Database,
  Zap
} from 'lucide-react';

// Components
import PartnerPolicies from './components/PartnerPolicies';
import SalesTargetPolicies from './components/SalesTargetPolicies';
import InventoryPolicies from './components/InventoryPolicies';
import UserSecurityPolicies from './components/UserSecurityPolicies';

// Types
interface PolicyCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: 'active' | 'warning' | 'error';
  lastModified: string;
  modifiedBy: string;
}

interface PolicySettings {
  partners: {
    autoApproval: boolean;
    commissionRate: number;
    tierLevels: Array<{
      name: string;
      minSales: number;
      commissionRate: number;
    }>;
  };
  sales: {
    monthlyTarget: number;
    alertThreshold: number;
    bonusThreshold: number;
  };
  inventory: {
    lowStockThreshold: number;
    criticalStockThreshold: number;
    autoReorder: boolean;
  };
  users: {
    requireApproval: boolean;
    sessionTimeout: number;
    passwordPolicy: {
      minLength: number;
      requireSpecialChars: boolean;
    };
  };
}

const PolicySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('partners');
  const [settings, setSettings] = useState<PolicySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Policy categories configuration
  const policyCategories: PolicyCategory[] = [
    {
      id: 'partners',
      name: '파트너스 정책',
      description: '파트너 승인, 커미션 비율, 등급 시스템 관리',
      icon: <Users className="w-5 h-5" />,
      color: 'blue',
      status: 'active',
      lastModified: '2024-12-29 14:30',
      modifiedBy: '관리자'
    },
    {
      id: 'sales',
      name: '매출 목표 설정',
      description: '월 매출 목표, 알림 임계값, 보너스 기준 설정',
      icon: <Target className="w-5 h-5" />,
      color: 'green',
      status: 'active',
      lastModified: '2024-12-28 09:15',
      modifiedBy: '관리자'
    },
    {
      id: 'inventory',
      name: '재고 관리 정책',
      description: '재고 부족 임계값, 자동 주문, 품질 관리 설정',
      icon: <Package className="w-5 h-5" />,
      color: 'orange',
      status: 'warning',
      lastModified: '2024-12-27 16:45',
      modifiedBy: '관리자'
    },
    {
      id: 'users',
      name: '사용자 보안 정책',
      description: '사용자 승인, 세션 관리, 비밀번호 정책 설정',
      icon: <Shield className="w-5 h-5" />,
      color: 'red',
      status: 'active',
      lastModified: '2024-12-26 11:20',
      modifiedBy: '관리자'
    }
  ];

  // Load settings
  useEffect(() => {
    loadPolicySettings();
  }, []);

  const loadPolicySettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockSettings: PolicySettings = {
        partners: {
          autoApproval: false,
          commissionRate: 5.0,
          tierLevels: [
            { name: '브론즈', minSales: 0, commissionRate: 3.0 },
            { name: '실버', minSales: 1000000, commissionRate: 5.0 },
            { name: '골드', minSales: 5000000, commissionRate: 7.0 },
            { name: '플래티넘', minSales: 10000000, commissionRate: 10.0 }
          ]
        },
        sales: {
          monthlyTarget: 50000000,
          alertThreshold: 80,
          bonusThreshold: 110
        },
        inventory: {
          lowStockThreshold: 10,
          criticalStockThreshold: 3,
          autoReorder: false
        },
        users: {
          requireApproval: true,
          sessionTimeout: 8,
          passwordPolicy: {
            minLength: 8,
            requireSpecialChars: true
          }
        }
      };
      
      setSettings(mockSettings);
    } catch (error) {
      console.error('Failed to load policy settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings || !hasChanges) return;
    
    setIsSaving(true);
    try {
      // Simulate API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setHasChanges(false);
      setLastSaved(new Date());
      
      // Success notification could be added here
    } catch (error) {
      console.error('Failed to save policy settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('모든 변경사항을 취소하고 이전 설정으로 되돌리시겠습니까?')) {
      loadPolicySettings();
      setHasChanges(false);
    }
  };

  const updateSettings = useCallback((category: keyof PolicySettings, updates: Partial<PolicySettings[keyof PolicySettings]>) => {
    if (!settings) return;
    
    setSettings(prev => ({
      ...prev!,
      [category]: {
        ...prev![category],
        ...updates
      }
    }));
    setHasChanges(true);
  }, [settings]);

  const getTabColor = (categoryId: string) => {
    const category = policyCategories.find(c => c.id === categoryId);
    if (!category) return 'gray';
    
    const colors = {
      blue: 'border-blue-500 text-blue-600',
      green: 'border-green-500 text-green-600',
      orange: 'border-orange-500 text-orange-600',
      red: 'border-red-500 text-red-600'
    };
    
    return colors[category.color as keyof typeof colors] || 'border-gray-500 text-gray-600';
  };

  const getStatusColor = (status: PolicyCategory['status']) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  const getStatusText = (status: PolicyCategory['status']) => {
    const texts = {
      active: '정상',
      warning: '주의',
      error: '오류'
    };
    return texts[status];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">정책 설정을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 -mx-6 -mt-6 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Settings className="w-6 h-6 mr-3 text-blue-600" />
              정책 설정 시스템
            </h1>
            <p className="text-gray-600 mt-1">
              O4O 플랫폼의 모든 정책을 중앙에서 관리하고 제어하세요
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {lastSaved && (
              <div className="flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
              </div>
            )}
            
            {hasChanges && (
              <button
                onClick={handleReset}
                className="wp-button-secondary"
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                되돌리기
              </button>
            )}
            
            <button
              onClick={handleSave}
              className={`wp-button-primary ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!hasChanges || isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  변경사항 저장
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Policy Categories Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {policyCategories.map((category) => (
          <div
            key={category.id}
            className={`wp-card cursor-pointer transition-all duration-200 hover:shadow-lg ${
              activeTab === category.id 
                ? `border-2 ${getTabColor(category.id).split(' ')[0]} bg-blue-50` 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab(category.id)}
          >
            <div className="wp-card-body">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${
                  category.color === 'blue' ? 'bg-blue-100' :
                  category.color === 'green' ? 'bg-green-100' :
                  category.color === 'orange' ? 'bg-orange-100' :
                  'bg-red-100'
                }`}>
                  {category.icon}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(category.status)}`}>
                  {getStatusText(category.status)}
                </span>
              </div>
              
              <h3 className="font-semibold text-gray-900 mb-2">
                {category.name}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                {category.description}
              </p>
              
              <div className="text-xs text-gray-500">
                <div>최종 수정: {category.lastModified}</div>
                <div>수정자: {category.modifiedBy}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Policy Content */}
        <div className="lg:col-span-3">
          <div className="wp-card">
            <div className="wp-card-body">
              {activeTab === 'partners' && settings && (
                <PartnerPolicies
                  settings={settings.partners}
                  onUpdate={(updates) => updateSettings('partners', updates)}
                />
              )}
              
              {activeTab === 'sales' && settings && (
                <SalesTargetPolicies
                  settings={settings.sales}
                  onUpdate={(updates) => updateSettings('sales', updates)}
                />
              )}
              
              {activeTab === 'inventory' && settings && (
                <InventoryPolicies
                  settings={settings.inventory}
                  onUpdate={(updates) => updateSettings('inventory', updates)}
                />
              )}
              
              {activeTab === 'users' && settings && (
                <UserSecurityPolicies
                  settings={settings.users}
                  onUpdate={(updates) => updateSettings('users', updates)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Policy Info & History */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Policy Info */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <Info className="w-5 h-5 mr-2 text-blue-600" />
                정책 정보
              </h3>
            </div>
            <div className="wp-card-body">
              {(() => {
                const currentCategory = policyCategories.find(c => c.id === activeTab);
                if (!currentCategory) return null;
                
                return (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">정책 분류</div>
                      <div className="flex items-center">
                        {currentCategory.icon}
                        <span className="ml-2 text-gray-900">{currentCategory.name}</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">현재 상태</div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentCategory.status)}`}>
                        {getStatusText(currentCategory.status)}
                      </span>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">최종 수정</div>
                      <div className="text-sm text-gray-600">{currentCategory.lastModified}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">수정자</div>
                      <div className="text-sm text-gray-600">{currentCategory.modifiedBy}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                빠른 작업
              </h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-3">
                <button className="w-full wp-button-secondary text-left justify-start">
                  <Archive className="w-4 h-4 mr-2" />
                  정책 백업 생성
                </button>
                <button className="w-full wp-button-secondary text-left justify-start">
                  <Database className="w-4 h-4 mr-2" />
                  설정 내보내기
                </button>
                <button className="w-full wp-button-secondary text-left justify-start">
                  <Globe className="w-4 h-4 mr-2" />
                  기본값으로 복원
                </button>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <Bell className="w-5 h-5 mr-2 text-orange-600" />
                시스템 알림
              </h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-3">
                <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-yellow-800">재고 정책 검토 필요</div>
                    <div className="text-yellow-700">일부 임계값이 권장 수준을 벗어났습니다.</div>
                  </div>
                </div>
                
                <div className="flex items-start p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-blue-800">새로운 기능 사용 가능</div>
                    <div className="text-blue-700">자동 승인 시스템이 업데이트되었습니다.</div>
                  </div>
                </div>
                
                <div className="flex items-start p-3 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-green-800">정책 동기화 완료</div>
                    <div className="text-green-700">모든 설정이 성공적으로 적용되었습니다.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Indicator */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-orange-100 border border-orange-300 rounded-lg p-4 shadow-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
            <span className="text-orange-800 font-medium">저장되지 않은 변경사항이 있습니다</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicySettings;