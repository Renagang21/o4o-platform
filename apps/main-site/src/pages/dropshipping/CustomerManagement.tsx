import { useState, FC } from 'react';
import CustomerTierManager from '../../components/dropshipping/CustomerTierManager';

type CustomerType = 'b2c' | 'b2b';

const CustomerManagement: FC = () => {
  const [customerType, setCustomerType] = useState<CustomerType>('b2c');

  const handleTierUpdate = (customerId: string, newTier: string) => {
    // console.log('고객 등급 업데이트:', { customerId, newTier });
    // 실제로는 API 호출하여 등급 업데이트
  };

  const handleCustomerAction = (customerId: string, action: string) => {
    // console.log('고객 액션:', { customerId, action });
    // 실제로는 각 액션에 따른 처리 (이메일 발송, 서비스 제공 등)
  };

  const getCustomerTypeStats = () => {
    if (customerType === 'b2c') {
      return {
        total: 1247,
        member: 856,
        premium: 312,
        vip: 79,
        monthlyGrowth: 12.5,
        totalRevenue: 156700000,
        avgOrderValue: 127000
      };
    } else {
      return {
        total: 89,
        corporate: 45,
        premium_corporate: 32,
        enterprise_vip: 12,
        monthlyGrowth: 8.3,
        totalRevenue: 2840000000,
        avgOrderValue: 15600000
      };
    }
  };

  const stats = getCustomerTypeStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number | undefined) => {
    return new Intl.NumberFormat('ko-KR').format(num || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">고객 관리</h1>
              <span className="text-sm text-gray-500">
                고객 등급과 혜택을 관리하여 충성도를 높이세요
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setCustomerType('b2c')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    customerType === 'b2c'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  👤 B2C 고객
                </button>
                <button
                  onClick={() => setCustomerType('b2b')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    customerType === 'b2b'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🏢 B2B 고객
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 고객 통계 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-role-customer bg-opacity-20 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">총 고객 수</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.total)}명</p>
                <p className="text-xs text-green-600 mt-1">월간 성장률: +{stats.monthlyGrowth}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-trust-verified bg-opacity-20 rounded-lg">
                <span className="text-2xl">💰</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">월 총 매출</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-trust-pending bg-opacity-20 rounded-lg">
                <span className="text-2xl">🛒</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">평균 주문액</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgOrderValue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center">
              <div className="p-2 bg-o4o-primary-100 rounded-lg">
                <span className="text-2xl">⭐</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  {customerType === 'b2c' ? 'VIP 고객' : 'Enterprise VIP'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {customerType === 'b2c' ? formatNumber(stats.vip) : formatNumber(stats.enterprise_vip)}명
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 등급별 분포 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {customerType === 'b2c' ? '🎯 B2C 고객 등급별 분포' : '🏢 B2B 고객 등급별 분포'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {customerType === 'b2c' ? (
              <>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 mb-2">
                    👤 일반 회원
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.member)}명</p>
                  <p className="text-sm text-gray-600 mt-1">
                    기본 혜택 • 0% 할인 • 표준 배송
                  </p>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 mb-2">
                    💎 프리미엄 회원
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.premium)}명</p>
                  <p className="text-sm text-blue-600 mt-1">
                    5-10% 할인 • 우선 CS • 프리미엄 제품
                  </p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 mb-2">
                    👑 VIP 회원
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.vip)}명</p>
                  <p className="text-sm text-purple-600 mt-1">
                    10-20% 할인 • 무료배송 • 독점 제품
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 mb-2">
                    🏢 기업 회원
                  </div>
                  <p className="text-2xl font-bold text-green-900">{formatNumber(stats.corporate)}개사</p>
                  <p className="text-sm text-green-600 mt-1">
                    대량 할인 • 월 정산 • 기업 전용 제품
                  </p>
                </div>

                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 mb-2">
                    🏛️ 프리미엄 기업
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{formatNumber(stats.premium_corporate)}개사</p>
                  <p className="text-sm text-blue-600 mt-1">
                    추가 할인 • 맞춤 개발 • 전담 관리자
                  </p>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700 mb-2">
                    🏆 Enterprise VIP
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{formatNumber(stats.enterprise_vip)}개사</p>
                  <p className="text-sm text-purple-600 mt-1">
                    최대 할인 • 24시간 지원 • OEM 서비스
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 고객 등급 관리 시스템 */}
        <CustomerTierManager
          customerType={customerType}
          onTierUpdate={handleTierUpdate}
          onCustomerAction={handleCustomerAction}
        />

        {/* 고객 관리 팁 */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 고객 등급 관리 팁</h3>
          
          {customerType === 'b2c' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">등급 승급 전략</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• 구매 이력 기반 자동 승급 설정</li>
                  <li>• 생일/기념일 특별 혜택 제공</li>
                  <li>• 리뷰 작성 시 추가 포인트 적립</li>
                  <li>• 친구 추천 시 양방향 혜택</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">고객 유지 방법</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• VIP 전용 이벤트 정기 개최</li>
                  <li>• 개인화된 제품 추천 서비스</li>
                  <li>• 구매 주기 분석 후 리마인드</li>
                  <li>• 고객 만족도 조사 및 개선</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">B2B 관계 강화</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• 장기 계약 체결 시 특별 할인</li>
                  <li>• 전담 계정 매니저 배정</li>
                  <li>• 맞춤형 솔루션 개발 지원</li>
                  <li>• 정기적인 비즈니스 리뷰 미팅</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">기업 고객 확장</h4>
                <ul className="space-y-1 text-blue-700">
                  <li>• 업계별 맞춤 제품 포트폴리오</li>
                  <li>• 대량 구매 시 단계별 할인</li>
                  <li>• OEM/ODM 서비스 제공</li>
                  <li>• 24시간 기술 지원 서비스</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerManagement;