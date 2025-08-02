import { useState, FC } from 'react';
import UserRoleSwitch from '../../components/common/UserRoleSwitch';
import TrustIndicator from '../../components/common/TrustIndicator';

type UserRole = 'supplier' | 'reseller' | 'partner' | 'customer';

interface DashboardStats {
  totalProducts: number;
  activePartners: number;
  monthlyRevenue: number;
  totalCustomers: number;
  conversionRate: number;
  avgOrderValue: number;
}

const DropshippingDashboard: FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('supplier');
  const [stats] = useState<DashboardStats>({
    totalProducts: 147,
    activePartners: 23,
    monthlyRevenue: 45680000,
    totalCustomers: 1247,
    conversionRate: 4.8,
    avgOrderValue: 127000
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  const getRoleDashboard = () => {
    switch (currentRole) {
      case 'supplier':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-role-supplier bg-opacity-20 rounded-lg">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">등록 제품</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalProducts)}개</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-role-partner bg-opacity-20 rounded-lg">
                  <span className="text-2xl">🤝</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">활성 파트너</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.activePartners)}명</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-trust-verified bg-opacity-20 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">월 매출</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-role-customer bg-opacity-20 rounded-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">총 고객</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalCustomers)}명</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'reseller':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-role-reseller bg-opacity-20 rounded-lg">
                  <span className="text-2xl">🛍️</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">선택 가능 제품</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalProducts)}개</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-trust-verified bg-opacity-20 rounded-lg">
                  <span className="text-2xl">📈</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">전환율</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-trust-pending bg-opacity-20 rounded-lg">
                  <span className="text-2xl">💵</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">평균 주문액</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.avgOrderValue)}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'partner':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-role-partner bg-opacity-20 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">이번 달 수수료</p>
                  <p className="text-2xl font-bold text-gray-900">₩1,850,000</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-trust-verified bg-opacity-20 rounded-lg">
                  <span className="text-2xl">👆</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">클릭 수</p>
                  <p className="text-2xl font-bold text-gray-900">12,547</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-trust-pending bg-opacity-20 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">전환율</p>
                  <p className="text-2xl font-bold text-gray-900">4.8%</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'customer':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-role-customer bg-opacity-20 rounded-lg">
                  <span className="text-2xl">🛒</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">구매 가능 제품</p>
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalProducts)}개</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-trust-verified bg-opacity-20 rounded-lg">
                  <span className="text-2xl">⭐</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">나의 등급</p>
                  <p className="text-2xl font-bold text-gray-900">VIP</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-trust-pending bg-opacity-20 rounded-lg">
                  <span className="text-2xl">🎁</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">할인 혜택</p>
                  <p className="text-2xl font-bold text-gray-900">20%</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getQuickActions = () => {
    switch (currentRole) {
      case 'supplier':
        return [
          { icon: '📦', title: '새 제품 등록', description: '신제품을 플랫폼에 등록하세요', href: '/dropshipping/products/new' },
          { icon: '🤝', title: '파트너 관리', description: '파트너 현황을 확인하고 관리하세요', href: '/dropshipping/partners' },
          { icon: '💰', title: '수수료 설정', description: '파트너 수수료율을 관리하세요', href: '/dropshipping/commission' },
          { icon: '📊', title: '매출 분석', description: '상세한 매출 리포트를 확인하세요', href: '/dropshipping/analytics' }
        ];

      case 'reseller':
        return [
          { icon: '🔍', title: '제품 탐색', description: '판매할 제품을 찾아보세요', href: '/dropshipping/products' },
          { icon: '🎨', title: '제품 커스터마이징', description: '브랜드에 맞게 제품을 커스터마이징하세요', href: '/dropshipping/customize' },
          { icon: '👥', title: '고객 관리', description: '고객 현황과 주문을 관리하세요', href: '/dropshipping/customers' },
          { icon: '📈', title: '성과 분석', description: '판매 성과를 분석해보세요', href: '/dropshipping/performance' }
        ];

      case 'partner':
        return [
          { icon: '🎨', title: '마케팅 소재', description: '배너, 영상, 카피를 다운로드하세요', href: '/dropshipping/marketing-assets' },
          { icon: '📊', title: '성과 분석', description: '추천 성과와 수수료를 확인하세요', href: '/dropshipping/partner-analytics' },
          { icon: '🎓', title: '교육 센터', description: '최신 교육 과정을 수강하세요', href: '/dropshipping/education' },
          { icon: '💬', title: '지원 요청', description: '전담 매니저와 상담하세요', href: '/dropshipping/support' }
        ];

      case 'customer':
        return [
          { icon: '🛍️', title: '쇼핑하기', description: '원하는 제품을 찾아보세요', href: '/shop' },
          { icon: '📦', title: '주문 현황', description: '주문 및 배송 현황을 확인하세요', href: '/orders' },
          { icon: '💎', title: '등급 혜택', description: '나의 등급별 혜택을 확인하세요', href: '/benefits' },
          { icon: '📝', title: '리뷰 작성', description: '구매한 제품에 대한 리뷰를 작성하세요', href: '/reviews' }
        ];

      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">o4o 드랍쉬핑 플랫폼</h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-o4o-primary-100 text-o4o-primary-800">
                Beta
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <TrustIndicator
                score={94}
                type="supplier"
                details={{
                  verified: true,
                  expertReviewed: true,
                  userRating: 4.8,
                  certifications: ['ISO', 'GMP', 'FDA']
                }}
                size="small"
                showDetails={false}
              />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">플랫폼 신뢰도</p>
                <p className="text-xs text-gray-600">94점 (최고 등급)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 역할 전환 섹션 */}
        <div className="mb-8">
          <UserRoleSwitch
            currentRole={currentRole}
            availableRoles={['supplier', 'reseller', 'partner', 'customer']}
            onRoleChange={(role) => setCurrentRole(role as UserRole)}
            showDescription={true}
          />
        </div>

        {/* 대시보드 통계 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {currentRole === 'supplier' && '📊 공급자 대시보드'}
            {currentRole === 'reseller' && '🛍️ 판매자 대시보드'}
            {currentRole === 'partner' && '🤝 파트너 대시보드'}
            {currentRole === 'customer' && '👤 고객 대시보드'}
          </h2>
          {getRoleDashboard()}
        </div>

        {/* 빠른 액션 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🚀 빠른 액션</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {getQuickActions().map((action, index) => (
              <a
                key={index}
                href={action.href}
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-o4o-primary-300 hover:shadow-md transition-all"
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <h3 className="font-medium text-gray-900">{action.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
              </a>
            ))}
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 최근 활동</h2>
          <div className="space-y-3">
            {currentRole === 'supplier' && (
              <>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600">✅</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">새로운 파트너 "박인플루" 승인 완료</p>
                    <p className="text-xs text-gray-600">2시간 전</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-blue-600">📦</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">신제품 "프리미엄 비타민 D3" 등록 완료</p>
                    <p className="text-xs text-gray-600">4시간 전</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-purple-600">💰</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">수수료율 조정 요청 3건 검토 필요</p>
                    <p className="text-xs text-gray-600">1일 전</p>
                  </div>
                </div>
              </>
            )}

            {currentRole === 'reseller' && (
              <>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600">🛍️</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">새로운 주문 15건 접수</p>
                    <p className="text-xs text-gray-600">1시간 전</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-blue-600">📦</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">제품 "콜라겐 젤리" 커스터마이징 완료</p>
                    <p className="text-xs text-gray-600">3시간 전</p>
                  </div>
                </div>
              </>
            )}

            {currentRole === 'partner' && (
              <>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600">💰</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">수수료 ₩850,000 정산 완료</p>
                    <p className="text-xs text-gray-600">2시간 전</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-blue-600">👆</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">추천 링크 클릭 200회 돌파</p>
                    <p className="text-xs text-gray-600">4시간 전</p>
                  </div>
                </div>
              </>
            )}

            {currentRole === 'customer' && (
              <>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-green-600">📦</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">주문한 "오메가3" 배송 완료</p>
                    <p className="text-xs text-gray-600">1일 전</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-blue-600">⭐</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">VIP 등급으로 승급 완료</p>
                    <p className="text-xs text-gray-600">3일 전</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DropshippingDashboard;