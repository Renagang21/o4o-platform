import { useState, useEffect, FC } from 'react';

interface PartnerInfo {
  id: string;
  name: string;
  email: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  joinDate: string;
  status: 'active' | 'suspended' | 'pending';
  specialties: string[];
  followerCount: number;
  platforms: string[];
}

interface EarningsData {
  totalEarnings: number;
  monthlyEarnings: number;
  commissionEarnings: number;
  bonusEarnings: number;
  signupBonus: number;
  pendingPayouts: number;
  lastPayoutDate: string;
}

interface PerformanceMetrics {
  clickCount: number;
  conversionRate: number;
  averageOrderValue: number;
  customerSatisfaction: number;
  monthlyGrowth: number;
  tierProgress: number;
  nextTierRequirement: string;
}

interface MonthlyGoal {
  targetSales: number;
  currentSales: number;
  targetCustomers: number;
  currentCustomers: number;
  progressPercentage: number;
  remainingAmount: number;
}

interface LegalCompliance {
  commissionRate: number;
  withinLegalLimit: boolean;
  marketingGuidelines: boolean;
  noMultiLevel: boolean;
  educationCompleted: boolean;
  lastEducationDate: string;
}

interface PartnerDashboardProps {
  partnerId: string;
}

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ partnerId }) => {
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal | null>(null);
  const [compliance, setCompliance] = useState<LegalCompliance | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');

  // 샘플 데이터 (실제로는 API에서 가져올 것)
  useEffect(() => {
    // 파트너 정보
    setPartnerInfo({
      id: partnerId,
      name: '박인플루',
      email: 'park.influencer@example.com',
      tier: 'gold',
      joinDate: '2024-01-15',
      status: 'active',
      specialties: ['건강기능식품', '뷰티', '라이프스타일'],
      followerCount: 125000,
      platforms: ['Instagram', 'YouTube', 'Blog']
    });

    // 수익 데이터
    setEarnings({
      totalEarnings: 2050000,
      monthlyEarnings: 1850000,
      commissionEarnings: 1850000,
      bonusEarnings: 150000,
      signupBonus: 50000,
      pendingPayouts: 235000,
      lastPayoutDate: '2024-06-01'
    });

    // 성과 지표
    setPerformance({
      clickCount: 12547,
      conversionRate: 4.8,
      averageOrderValue: 127000,
      customerSatisfaction: 4.7,
      monthlyGrowth: 15,
      tierProgress: 67,
      nextTierRequirement: '₩8,150,000 매출 달성 필요'
    });

    // 월간 목표
    setMonthlyGoal({
      targetSales: 15000000,
      currentSales: 10050000,
      targetCustomers: 50,
      currentCustomers: 35,
      progressPercentage: 67,
      remainingAmount: 4950000
    });

    // 법적 준수 현황
    setCompliance({
      commissionRate: 25,
      withinLegalLimit: true,
      marketingGuidelines: true,
      noMultiLevel: true,
      educationCompleted: true,
      lastEducationDate: '2024-05-15'
    });
  }, [partnerId]);

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
        return '브론즈 파트너';
      case 'silver':
        return '실버 파트너';
      case 'gold':
        return '골드 파트너';
      case 'platinum':
        return '플래티넘 파트너';
      default:
        return '파트너';
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

  const renderProgressBar = (percentage: number, color: string = 'bg-o4o-primary-500') => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );

  if (!partnerInfo || !earnings || !performance || !monthlyGoal || !compliance) {
    return <div className="flex items-center justify-center h-64">로딩 중...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-o4o-primary-400 to-o4o-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {partnerInfo.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{partnerInfo.name}</h1>
              <div className="flex items-center space-x-3 mt-1">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTierColor(partnerInfo.tier)}`}>
                  🏆 {getTierLabel(partnerInfo.tier)}
                </span>
                <span className="text-sm text-gray-600">
                  수수료율: {compliance.commissionRate}%
                </span>
                <span className="text-sm text-gray-600">
                  팔로워: {formatNumber(partnerInfo.followerCount)}명
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-600">가입일</p>
            <p className="font-medium">{partnerInfo.joinDate}</p>
          </div>
        </div>
      </div>

      {/* 이번 달 수익 현황 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">💰 이번 달 수익 현황</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-green-700">추천 수수료</h3>
            <p className="text-2xl font-bold text-green-900">{formatCurrency(earnings.commissionEarnings)}</p>
            <p className="text-xs text-green-600 mt-1">전월 대비 +15%</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-700">성과 보너스</h3>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(earnings.bonusEarnings)}</p>
            <p className="text-xs text-blue-600 mt-1">목표 달성 보너스</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-purple-700">신규 가입 보너스</h3>
            <p className="text-2xl font-bold text-purple-900">{formatCurrency(earnings.signupBonus)}</p>
            <p className="text-xs text-purple-600 mt-1">5명 추천</p>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700">총 수익</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(earnings.totalEarnings)}</p>
            <p className="text-xs text-gray-600 mt-1">정산 예정: {formatCurrency(earnings.pendingPayouts)}</p>
          </div>
        </div>
      </div>

      {/* 성과 지표 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 성과 지표</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">클릭 수</h3>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(performance.clickCount)}</p>
            <p className="text-xs text-green-600 mt-1">전월 대비 +15%</p>
          </div>
          
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">전환율</h3>
            <p className="text-2xl font-bold text-gray-900">{performance.conversionRate}%</p>
            <p className="text-xs text-blue-600 mt-1">목표 5% 달성 예정</p>
          </div>
          
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">평균 주문액</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(performance.averageOrderValue)}</p>
            <p className="text-xs text-purple-600 mt-1">업계 평균 대비 +20%</p>
          </div>
          
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600">고객 만족도</h3>
            <p className="text-2xl font-bold text-gray-900">{performance.customerSatisfaction}/5.0</p>
            <div className="flex justify-center mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`text-sm ${i < Math.floor(performance.customerSatisfaction) ? 'text-yellow-400' : 'text-gray-300'}`}>
                  ⭐
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 이번 달 목표 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">🎯 이번 달 목표</h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">추천 매출</span>
                <span className="text-sm text-gray-900">
                  {formatCurrency(monthlyGoal.currentSales)} / {formatCurrency(monthlyGoal.targetSales)}
                </span>
              </div>
              {renderProgressBar(monthlyGoal.progressPercentage, 'bg-green-500')}
              <p className="text-xs text-gray-600 mt-1">진행률: {monthlyGoal.progressPercentage}%</p>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">신규 고객</span>
                <span className="text-sm text-gray-900">
                  {monthlyGoal.currentCustomers}명 / {monthlyGoal.targetCustomers}명
                </span>
              </div>
              {renderProgressBar((monthlyGoal.currentCustomers / monthlyGoal.targetCustomers) * 100, 'bg-blue-500')}
              <p className="text-xs text-gray-600 mt-1">달성 {monthlyGoal.currentCustomers}명</p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <h4 className="text-sm font-medium text-yellow-800">플래티넘 승급까지</h4>
              <p className="text-lg font-bold text-yellow-900">{formatCurrency(monthlyGoal.remainingAmount)} 남음</p>
              <div className="mt-2">
                {renderProgressBar(performance.tierProgress, 'bg-yellow-500')}
              </div>
              <p className="text-xs text-yellow-700 mt-1">{performance.nextTierRequirement}</p>
            </div>
          </div>
        </div>

        {/* 법적 준수 현황 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">⚖️ 법적 준수 현황</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="text-sm font-medium text-green-800">수수료율 준수</span>
              </div>
              <span className="text-sm text-green-700">{compliance.commissionRate}% (35% 미만 유지)</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="text-sm font-medium text-green-800">마케팅 가이드 준수</span>
              </div>
              <span className="text-sm text-green-700">준수</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="text-sm font-medium text-green-800">다단계 금지</span>
              </div>
              <span className="text-sm text-green-700">위반 사항 없음</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="text-sm font-medium text-green-800">교육 이수</span>
              </div>
              <span className="text-sm text-green-700">최신 교육 완료 ({compliance.lastEducationDate})</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 mb-2">📚 추천 교육 과정</h4>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• 파트너 마케팅 윤리 고급 과정</li>
              <li>• 법적 리스크 관리 심화 과정</li>
              <li>• 신제품 소개 및 마케팅 전략</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 빠른 액션 버튼들 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">🚀 빠른 액션</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:border-o4o-primary-300 hover:bg-o4o-primary-50 transition-colors text-left">
            <div className="text-2xl mb-2">🎨</div>
            <h3 className="font-medium text-gray-900">마케팅 소재</h3>
            <p className="text-sm text-gray-600">배너, 영상, 카피 다운로드</p>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:border-o4o-primary-300 hover:bg-o4o-primary-50 transition-colors text-left">
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-medium text-gray-900">성과 분석</h3>
            <p className="text-sm text-gray-600">상세 리포트 및 인사이트</p>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:border-o4o-primary-300 hover:bg-o4o-primary-50 transition-colors text-left">
            <div className="text-2xl mb-2">🎓</div>
            <h3 className="font-medium text-gray-900">교육 센터</h3>
            <p className="text-sm text-gray-600">최신 교육 과정 수강</p>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:border-o4o-primary-300 hover:bg-o4o-primary-50 transition-colors text-left">
            <div className="text-2xl mb-2">💬</div>
            <h3 className="font-medium text-gray-900">지원 요청</h3>
            <p className="text-sm text-gray-600">전담 매니저 상담</p>
          </button>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">📝 최근 활동</h2>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-green-600">💰</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">수수료 ₩1,250,000 정산 완료</p>
              <p className="text-xs text-gray-600">2시간 전</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-blue-600">🛍️</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">새로운 주문 15건 발생</p>
              <p className="text-xs text-gray-600">4시간 전</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-purple-600">🎯</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">월간 목표 67% 달성</p>
              <p className="text-xs text-gray-600">1일 전</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <span className="text-orange-600">📚</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">법적 준수 교육 과정 완료</p>
              <p className="text-xs text-gray-600">3일 전</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerDashboard;