import { useState, FC } from 'react';
import PartnerDashboard from '../../components/dropshipping/PartnerDashboard';
import CommissionManagementSystem from '../../components/dropshipping/CommissionManagementSystem';

type ViewMode = 'dashboard' | 'partner_list' | 'commission_management' | 'partner_detail';
type UserRole = 'supplier' | 'partner' | 'admin';

interface Partner {
  id: string;
  name: string;
  email: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  status: 'active' | 'pending' | 'suspended';
  joinDate: string;
  specialties: string[];
  platforms: string[];
  followerCount: number;
  monthlyEarnings: number;
  commissionRate: number;
  performanceScore: number;
}

const PartnerManagement: React.FC = () => {
  const [currentRole, setCurrentRole] = useState<UserRole>('supplier');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('partner_001');

  // 샘플 파트너 데이터
  const [partners] = useState<Partner[]>([
    {
      id: 'partner_001',
      name: '박인플루',
      email: 'park.influencer@example.com',
      tier: 'gold',
      status: 'active',
      joinDate: '2024-01-15',
      specialties: ['건강기능식품', '뷰티', '라이프스타일'],
      platforms: ['Instagram', 'YouTube', 'Blog'],
      followerCount: 125000,
      monthlyEarnings: 1850000,
      commissionRate: 25,
      performanceScore: 87
    },
    {
      id: 'partner_002',
      name: '이크라우드',
      email: 'lee.crowd@example.com',
      tier: 'platinum',
      status: 'active',
      joinDate: '2023-08-20',
      specialties: ['크라우드펀딩', '헬스케어', '테크'],
      platforms: ['YouTube', 'Blog', 'Newsletter'],
      followerCount: 250000,
      monthlyEarnings: 3200000,
      commissionRate: 30,
      performanceScore: 94
    },
    {
      id: 'partner_003',
      name: '김마케팅',
      email: 'kim.marketing@example.com',
      tier: 'silver',
      status: 'pending',
      joinDate: '2024-05-10',
      specialties: ['의료기기', 'B2B 마케팅'],
      platforms: ['LinkedIn', 'Blog'],
      followerCount: 45000,
      monthlyEarnings: 0,
      commissionRate: 18,
      performanceScore: 0
    }
  ]);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'text-orange-600 bg-orange-100';
      case 'silver':
        return 'text-gray-600 bg-gray-100';
      case 'gold':
        return 'text-yellow-600 bg-yellow-100';
      case 'platinum':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return '브론즈';
      case 'silver':
        return '실버';
      case 'gold':
        return '골드';
      case 'platinum':
        return '플래티넘';
      default:
        return tier;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-trust-verified bg-opacity-10 text-trust-verified';
      case 'pending':
        return 'bg-trust-pending bg-opacity-10 text-trust-pending';
      case 'suspended':
        return 'bg-trust-warning bg-opacity-10 text-trust-warning';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'pending':
        return '승인 대기';
      case 'suspended':
        return '정지';
      default:
        return status;
    }
  };

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

  const handleCommissionApprove = (requestId: string, rate: number, conditions?: string) => {
    console.log('수수료 승인:', { requestId, rate, conditions });
    // 실제로는 API 호출
  };

  const handleCommissionReject = (requestId: string, reason: string) => {
    console.log('수수료 거절:', { requestId, reason });
    // 실제로는 API 호출
  };

  const renderPartnerCard = (partner: Partner) => (
    <div key={partner.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-o4o-primary-400 to-o4o-primary-600 rounded-full flex items-center justify-center text-white font-bold">
            {partner.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{partner.name}</h3>
            <p className="text-sm text-gray-600">{partner.email}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierColor(partner.tier)}`}>
                🏆 {getTierLabel(partner.tier)}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(partner.status)}`}>
                {getStatusLabel(partner.status)}
              </span>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => {
            setSelectedPartnerId(partner.id);
            setViewMode('partner_detail');
          }}
          className="text-sm text-o4o-primary-600 hover:text-o4o-primary-700 font-medium"
        >
          상세 보기
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <span className="text-xs text-gray-600">팔로워</span>
          <p className="font-medium">{formatNumber(partner.followerCount)}명</p>
        </div>
        <div>
          <span className="text-xs text-gray-600">월 수익</span>
          <p className="font-medium">{formatCurrency(partner.monthlyEarnings)}</p>
        </div>
        <div>
          <span className="text-xs text-gray-600">수수료율</span>
          <p className="font-medium">{partner.commissionRate}%</p>
        </div>
        <div>
          <span className="text-xs text-gray-600">성과 점수</span>
          <p className="font-medium">{partner.performanceScore}점</p>
        </div>
      </div>

      <div className="mb-3">
        <span className="text-xs text-gray-600">전문 분야</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {partner.specialties.map((specialty, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
            >
              {specialty}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <span className="text-xs text-gray-600">활동 플랫폼</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {partner.platforms.map((platform, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
            >
              {platform}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-sm">
        <span className="text-gray-600">가입일: {partner.joinDate}</span>
        <div className="flex items-center space-x-2">
          {partner.status === 'pending' && (
            <>
              <button className="text-trust-verified hover:text-trust-verified font-medium">
                승인
              </button>
              <span className="text-gray-300">|</span>
              <button className="text-trust-warning hover:text-trust-warning font-medium">
                거절
              </button>
            </>
          )}
          {partner.status === 'active' && (
            <button className="text-o4o-primary-600 hover:text-o4o-primary-700 font-medium">
              관리
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderNavigationTabs = () => (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'dashboard'
                ? 'border-o4o-primary-500 text-o4o-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📊 대시보드
          </button>
          
          <button
            onClick={() => setViewMode('partner_list')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'partner_list'
                ? 'border-o4o-primary-500 text-o4o-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            👥 파트너 목록
          </button>
          
          {currentRole === 'supplier' && (
            <button
              onClick={() => setViewMode('commission_management')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                viewMode === 'commission_management'
                  ? 'border-o4o-primary-500 text-o4o-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💰 수수료 관리
            </button>
          )}
        </nav>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (viewMode) {
      case 'dashboard':
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 파트너 통계 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-role-partner bg-opacity-20 rounded-lg">
                    <span className="text-2xl">🤝</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">활성 파트너</p>
                    <p className="text-2xl font-bold text-gray-900">{partners.filter(p => p.status === 'active').length}명</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-trust-pending bg-opacity-20 rounded-lg">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">승인 대기</p>
                    <p className="text-2xl font-bold text-gray-900">{partners.filter(p => p.status === 'pending').length}명</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-trust-verified bg-opacity-20 rounded-lg">
                    <span className="text-2xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">월 총 수수료</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(partners.reduce((sum, p) => sum + p.monthlyEarnings, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center">
                  <div className="p-2 bg-trust-verified bg-opacity-20 rounded-lg">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">평균 성과</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Math.round(partners.filter(p => p.performanceScore > 0).reduce((sum, p) => sum + p.performanceScore, 0) / partners.filter(p => p.performanceScore > 0).length)}점
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 등급별 파트너 분포 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">등급별 파트너 분포</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['bronze', 'silver', 'gold', 'platinum'].map(tier => {
                  const count = partners.filter(p => p.tier === tier).length;
                  return (
                    <div key={tier} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTierColor(tier)} mb-2`}>
                        {getTierLabel(tier)}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{count}명</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 최고 성과 파트너 */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏆 최고 성과 파트너</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners
                  .filter(p => p.status === 'active')
                  .sort((a, b) => b.performanceScore - a.performanceScore)
                  .slice(0, 3)
                  .map(renderPartnerCard)}
              </div>
            </div>
          </div>
        );

      case 'partner_list':
        return (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">전체 파트너 목록</h2>
              <button className="inline-flex items-center px-4 py-2 bg-o4o-primary-500 text-white text-sm font-medium rounded-md hover:bg-o4o-primary-600">
                <span className="mr-2">+</span>
                새 파트너 초대
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {partners.map(renderPartnerCard)}
            </div>
          </div>
        );

      case 'commission_management':
        return (
          <CommissionManagementSystem
            userRole={currentRole as "admin" | "supplier"}
            onApprove={handleCommissionApprove}
            onReject={handleCommissionReject}
          />
        );

      case 'partner_detail':
        return (
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
              <button
                onClick={() => setViewMode('partner_list')}
                className="inline-flex items-center text-sm text-o4o-primary-600 hover:text-o4o-primary-700"
              >
                ← 파트너 목록으로 돌아가기
              </button>
            </div>
            <PartnerDashboard partnerId={selectedPartnerId} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">파트너 관리</h1>
              <span className="text-sm text-gray-500">
                파트너와의 협력을 통해 비즈니스를 확장하세요
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">역할:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as UserRole)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-o4o-primary-500"
              >
                <option value="supplier">공급자</option>
                <option value="partner">파트너</option>
                <option value="admin">관리자</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 네비게이션 탭 */}
      {renderNavigationTabs()}

      {/* 메인 콘텐츠 */}
      {renderContent()}
    </div>
  );
};

export default PartnerManagement;