import { useState, useEffect, FC } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, Users, TrendingUp, Target, Link as LinkIcon,
  BarChart3, Calendar, Award, Gift, Settings, 
  ExternalLink, Copy, Download, Eye, MessageCircle
} from 'lucide-react';

// 공통 타입 import
import { User, RolePageProps } from '../../../../types/user';

interface PartnerStats {
  totalEarnings: number;
  monthlyEarnings: number;
  totalClicks: number;
  monthlyClicks: number;
  conversionRate: number;
  totalReferrals: number;
  monthlyReferrals: number;
  pendingCommission: number;
  availableCommission: number;
  partnerLevel: string;
  nextLevelRequirement: number;
}

interface CommissionHistory {
  id: string;
  date: string;
  type: 'sale' | 'referral' | 'bonus';
  amount: number;
  status: 'paid' | 'pending' | 'cancelled';
  description: string;
  orderNumber?: string;
}

interface ReferralLink {
  id: string;
  name: string;
  url: string;
  clicks: number;
  conversions: number;
  earnings: number;
  createdDate: string;
}

const PartnerMyPage: React.FC<RolePageProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [partnerStats, setPartnerStats] = useState<PartnerStats>({
    totalEarnings: 1850000,
    monthlyEarnings: 320000,
    totalClicks: 12547,
    monthlyClicks: 2847,
    conversionRate: 4.8,
    totalReferrals: 89,
    monthlyReferrals: 18,
    pendingCommission: 150000,
    availableCommission: 280000,
    partnerLevel: 'Gold',
    nextLevelRequirement: 2000000
  });

  const [commissionHistory, setCommissionHistory] = useState<CommissionHistory[]>([]);
  const [referralLinks, setReferralLinks] = useState<ReferralLink[]>([]);

  useEffect(() => {
    // 모의 커미션 내역
    const mockCommissionHistory: CommissionHistory[] = [
      {
        id: '1',
        date: '2025.01.20',
        type: 'sale',
        amount: 15000,
        status: 'paid',
        description: '오메가3 제품 판매 수수료',
        orderNumber: 'ORD-20250120-001'
      },
      {
        id: '2',
        date: '2025.01.19',
        type: 'referral',
        amount: 50000,
        status: 'pending',
        description: '신규 파트너 추천 보너스'
      },
      {
        id: '3',
        date: '2025.01.18',
        type: 'sale',
        amount: 8500,
        status: 'paid',
        description: '비타민 제품 판매 수수료',
        orderNumber: 'ORD-20250118-003'
      }
    ];

    // 모의 추천 링크
    const mockReferralLinks: ReferralLink[] = [
      {
        id: '1',
        name: '오메가3 전용 링크',
        url: 'https://neture.com/omega3?ref=partner123',
        clicks: 1547,
        conversions: 89,
        earnings: 450000,
        createdDate: '2024.12.01'
      },
      {
        id: '2',
        name: '종합비타민 링크',
        url: 'https://neture.com/vitamin?ref=partner123',
        clicks: 892,
        conversions: 34,
        earnings: 180000,
        createdDate: '2024.12.15'
      }
    ];

    setCommissionHistory(mockCommissionHistory);
    setReferralLinks(mockReferralLinks);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('링크가 복사되었습니다!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return '💰';
      case 'referral': return '👥';
      case 'bonus': return '🎁';
      default: return '💳';
    }
  };

  const menuItems = [
    { id: 'overview', name: '대시보드', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'commission', name: '수수료 내역', icon: <DollarSign className="w-5 h-5" /> },
    { id: 'links', name: '추천 링크', icon: <LinkIcon className="w-5 h-5" /> },
    { id: 'referrals', name: '추천 고객', icon: <Users className="w-5 h-5" /> },
    { id: 'analytics', name: '성과 분석', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'materials', name: '마케팅 자료', icon: <Download className="w-5 h-5" /> },
    { id: 'education', name: '교육 센터', icon: <Award className="w-5 h-5" /> },
    { id: 'support', name: '지원 요청', icon: <MessageCircle className="w-5 h-5" /> },
    { id: 'settings', name: '설정', icon: <Settings className="w-5 h-5" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* 왼쪽: 메뉴 */}
        <div className="lg:col-span-1">
          {/* 파트너 등급 카드 */}
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-xl p-6 mb-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🤝</div>
              <div className="text-xl font-bold mb-2">{partnerStats.partnerLevel} 파트너</div>
              <div className="text-sm opacity-90">
                다음 등급까지 {(partnerStats.nextLevelRequirement - partnerStats.totalEarnings).toLocaleString()}원
              </div>
              <div className="w-full bg-white bg-opacity-20 rounded-full h-2 mt-3">
                <div 
                  className="bg-white h-2 rounded-full" 
                  style={{ 
                    width: `${(partnerStats.totalEarnings / partnerStats.nextLevelRequirement) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* 빠른 액션 */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 mb-6">
            <h3 className="font-semibold mb-3">빠른 액션</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setActiveTab('links')}
                className="w-full text-left bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm hover:bg-blue-100"
              >
                🔗 새 추천 링크 생성
              </button>
              <button 
                onClick={() => setActiveTab('materials')}
                className="w-full text-left bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm hover:bg-green-100"
              >
                📥 마케팅 자료 다운로드
              </button>
              <button 
                onClick={() => setActiveTab('support')}
                className="w-full text-left bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-sm hover:bg-purple-100"
              >
                💬 매니저 상담 요청
              </button>
            </div>
          </div>

          {/* 메뉴 */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                } ${activeTab === item.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 오른쪽: 콘텐츠 */}
        <div className="lg:col-span-3">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* 수익 통계 */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <DollarSign className="w-8 h-8 text-green-500" />
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">+12.5%</span>
                  </div>
                  <p className="text-sm text-gray-600">이번 달 수익</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {partnerStats.monthlyEarnings.toLocaleString()}원
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">+8.3%</span>
                  </div>
                  <p className="text-sm text-gray-600">이번 달 클릭</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {partnerStats.monthlyClicks.toLocaleString()}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Target className="w-8 h-8 text-purple-500" />
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">+2.1%</span>
                  </div>
                  <p className="text-sm text-gray-600">전환율</p>
                  <p className="text-2xl font-bold text-gray-900">{partnerStats.conversionRate}%</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-orange-500" />
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">+5</span>
                  </div>
                  <p className="text-sm text-gray-600">이번 달 추천</p>
                  <p className="text-2xl font-bold text-gray-900">{partnerStats.monthlyReferrals}명</p>
                </div>
              </div>

              {/* 수수료 현황 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-bold mb-6">수수료 현황</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {partnerStats.availableCommission.toLocaleString()}원
                    </div>
                    <div className="text-sm text-gray-600">출금 가능</div>
                    <button className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                      출금 신청
                    </button>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600 mb-1">
                      {partnerStats.pendingCommission.toLocaleString()}원
                    </div>
                    <div className="text-sm text-gray-600">정산 대기</div>
                    <div className="mt-3 text-xs text-yellow-600">매월 15일 정산</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {partnerStats.totalEarnings.toLocaleString()}원
                    </div>
                    <div className="text-sm text-gray-600">누적 수익</div>
                    <div className="mt-3 text-xs text-blue-600">세금계산서 발행 가능</div>
                  </div>
                </div>
              </div>

              {/* 최근 수수료 내역 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">최근 수수료 내역</h3>
                  <button onClick={() => setActiveTab('commission')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    전체보기 →
                  </button>
                </div>
                
                <div className="space-y-4">
                  {commissionHistory.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{getTypeIcon(item.type)}</div>
                        <div>
                          <div className="font-medium text-gray-900">{item.description}</div>
                          <div className="text-sm text-gray-500">{item.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">
                          +{item.amount.toLocaleString()}원
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                          {item.status === 'paid' ? '지급완료' : 
                           item.status === 'pending' ? '대기중' : '취소됨'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 성과 추천 링크 */}
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">성과 좋은 추천 링크</h3>
                  <button onClick={() => setActiveTab('links')} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    전체보기 →
                  </button>
                </div>
                
                <div className="space-y-4">
                  {referralLinks.map((link) => (
                    <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-gray-900">{link.name}</div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(link.url)}
                            className="text-blue-600 hover:text-blue-700"
                            title="링크 복사"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => window.open(link.url, '_blank')}
                            className="text-gray-600 hover:text-gray-700"
                            title="링크 열기"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                          <div className="font-bold text-blue-600">{link.clicks.toLocaleString()}</div>
                          <div className="text-gray-600">클릭</div>
                        </div>
                        <div>
                          <div className="font-bold text-green-600">{link.conversions}</div>
                          <div className="text-gray-600">전환</div>
                        </div>
                        <div>
                          <div className="font-bold text-purple-600">{link.earnings.toLocaleString()}원</div>
                          <div className="text-gray-600">수익</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 다른 탭들 */}
          {activeTab !== 'overview' && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold">
                  {menuItems.find(item => item.id === activeTab)?.name}
                </h3>
              </div>
              
              <div className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p>해당 기능은 개발 중입니다.</p>
                  <p className="text-sm mt-2">곧 다양한 파트너 전용 기능을 제공할 예정입니다.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PartnerMyPage;
