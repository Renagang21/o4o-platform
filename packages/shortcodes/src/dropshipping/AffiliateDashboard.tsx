/**
 * Affiliate Dashboard Shortcode Component
 * [affiliate_dashboard] - 제휴자 전용 대시보드
 */

import React, { useEffect, useState, useCallback } from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ className = '', children }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
);

// Mock auth hook for now
const useAuth = () => ({ user: { id: 'affiliate-1', role: 'affiliate' } });

// Mock API
const api = {
  get: async (_url: string): Promise<{ data: any }> => {
    // API call to fetch data
    return { data: { links: [], commissions: [] } };
  }
};
import { 
  DollarSign,
  TrendingUp,
  Users,
  Link2,
  MousePointerClick,
  ShoppingCart,
  Calendar,
  Copy,
  ExternalLink,
  Award
} from 'lucide-react';

interface AffiliateStats {
  totalEarnings: number;
  monthlyEarnings: number;
  pendingCommission: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  activeLinks: number;
  totalReferrals: number;
}

interface AffiliateLink {
  id: string;
  productId: string;
  productName: string;
  shortLink: string;
  fullLink: string;
  clicks: number;
  conversions: number;
  earnings: number;
  createdAt: string;
}

interface CommissionHistory {
  id: string;
  orderId: string;
  productName: string;
  orderAmount: number;
  commission: number;
  status: 'pending' | 'approved' | 'paid';
  date: string;
}

export const AffiliateDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<AffiliateStats>({
    totalEarnings: 0,
    monthlyEarnings: 0,
    pendingCommission: 0,
    totalClicks: 0,
    totalConversions: 0,
    conversionRate: 0,
    activeLinks: 0,
    totalReferrals: 0
  });
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [commissionHistory, setCommissionHistory] = useState<CommissionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const fetchAffiliateData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch affiliate dashboard data
      const [statsRes, linksRes, commissionRes] = await Promise.all([
        api.get(`/api/affiliate/dashboard/stats/${user.id}`),
        api.get(`/api/affiliate/links/${user.id}?limit=5`),
        api.get(`/api/affiliate/commissions/${user.id}?limit=10`)
      ]);

      setStats(statsRes.data || {
        totalEarnings: 0,
        monthlyEarnings: 0,
        pendingCommission: 0,
        totalClicks: 0,
        totalConversions: 0,
        conversionRate: 0,
        activeLinks: 0,
        totalReferrals: 0
      });
      
      setAffiliateLinks(linksRes.data?.links || []);
      setCommissionHistory(commissionRes.data?.commissions || []);
    } catch (error) {
      console.error('Failed to fetch affiliate data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAffiliateData();
  }, [fetchAffiliateData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const copyToClipboard = async (text: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(linkId);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'approved':
        return 'text-blue-600 bg-blue-100';
      case 'paid':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'approved':
        return '승인됨';
      case 'paid':
        return '지급완료';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="affiliate-dashboard space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">제휴 대시보드</h1>
        <p className="text-gray-600">제휴 수익과 실적을 확인하세요</p>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">총 수익</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.totalEarnings)}</p>
              <p className="text-sm text-blue-100 mt-1">전체 기간</p>
            </div>
            <DollarSign className="h-10 w-10 text-blue-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">이번 달 수익</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.monthlyEarnings)}</p>
              <p className="text-sm text-green-100 mt-1">+15% 전월 대비</p>
            </div>
            <TrendingUp className="h-10 w-10 text-green-200" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">대기 수수료</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.pendingCommission)}</p>
              <p className="text-sm text-yellow-100 mt-1">정산 예정</p>
            </div>
            <Calendar className="h-10 w-10 text-yellow-200" />
          </div>
        </Card>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 클릭수</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClicks.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">누적</p>
            </div>
            <MousePointerClick className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전환수</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalConversions}</p>
              <p className="text-xs text-gray-500 mt-1">구매 완료</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전환율</p>
              <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">클릭 대비</p>
            </div>
            <Award className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">활성 링크</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeLinks}개</p>
              <p className="text-xs text-gray-500 mt-1">사용 중</p>
            </div>
            <Link2 className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Affiliate Links */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">제휴 링크 실적</h2>
          <a href="/affiliate/links" className="text-sm text-blue-600 hover:text-blue-700">
            링크 관리 →
          </a>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">상품명</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">링크</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">클릭</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">전환</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">수익</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-700">작업</th>
              </tr>
            </thead>
            <tbody>
              {affiliateLinks.length > 0 ? (
                affiliateLinks.map((link) => (
                  <tr key={link.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{link.productName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {link.shortLink}
                      </code>
                    </td>
                    <td className="py-3 px-4 text-center">{link.clicks}</td>
                    <td className="py-3 px-4 text-center">{link.conversions}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(link.earnings)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(link.fullLink, link.id)}
                          className="text-gray-600 hover:text-blue-600"
                        >
                          {copiedLink === link.id ? (
                            <span className="text-xs text-green-600">복사됨!</span>
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        <a
                          href={link.fullLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-600 hover:text-blue-600"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    제휴 링크가 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Commission History */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">수수료 내역</h2>
          <a href="/affiliate/commissions" className="text-sm text-blue-600 hover:text-blue-700">
            전체 내역 보기 →
          </a>
        </div>
        
        <div className="space-y-3">
          {commissionHistory.length > 0 ? (
            commissionHistory.map((commission) => (
              <div key={commission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{commission.productName}</p>
                  <p className="text-sm text-gray-600">
                    주문 #{commission.orderId} · {new Date(commission.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">{formatCurrency(commission.commission)}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(commission.orderAmount)}의 5%
                  </p>
                </div>
                <div className="ml-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(commission.status)}`}>
                    {getStatusText(commission.status)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">수수료 내역이 없습니다</p>
          )}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 작업</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
            <Link2 className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">링크 생성</p>
          </button>
          <button className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">추천인 관리</p>
          </button>
          <button className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <TrendingUp className="h-6 w-6 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">실적 분석</p>
          </button>
          <button className="p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
            <DollarSign className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">정산 요청</p>
          </button>
        </div>
      </Card>
    </div>
  );
};