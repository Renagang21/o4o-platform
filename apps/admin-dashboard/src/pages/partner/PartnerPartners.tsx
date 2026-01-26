import { useState } from 'react';
import { Share2, Users, Link, TrendingUp, Search, Filter, MoreVertical, CheckCircle, Clock } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';

interface PartnerPartner {
  id: string;
  name: string;
  email: string;
  website?: string;
  type: 'influencer' | 'blog' | 'business' | 'individual';
  status: 'active' | 'pending' | 'inactive';
  joinedAt: string;
  stats: {
    clicks: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
  };
  commissionRate: number;
  paymentMethod: string;
}

const PartnerPartners = () => {
  // Partner data - empty until API integration
  const [partners] = useState<PartnerPartner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredPartners = partners.filter((partner: any) => {
    const matchesSearch = partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         partner.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || partner.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || partner.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'influencer': return '인플루언서';
      case 'blog': return '블로그';
      case 'business': return '비즈니스';
      case 'individual': return '개인';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            활성
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            대기
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            비활성
          </span>
        );
      default:
        return null;
    }
  };

  const totalStats = partners.reduce((acc: any, partner: any) => ({
    clicks: acc.clicks + partner.stats.clicks,
    conversions: acc.conversions + partner.stats.conversions,
    revenue: acc.revenue + partner.stats.revenue
  }), { clicks: 0, conversions: 0, revenue: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <Share2 className="w-8 h-8 text-modern-primary" />
            파트너사 관리
          </h1>
          <p className="text-modern-text-secondary mt-1">
            파트너 파트너를 관리하고 성과를 추적하세요.
          </p>
        </div>
        <RouterLink
          to="/partner/partners/new"
          className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors"
        >
          새 파트너사 추가
        </RouterLink>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">전체 파트너사</p>
                <p className="text-2xl font-bold text-modern-text-primary">{partners.length}</p>
              </div>
              <Users className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 클릭수</p>
                <p className="text-2xl font-bold text-modern-primary">
                  {totalStats.clicks.toLocaleString()}
                </p>
              </div>
              <Link className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 전환수</p>
                <p className="text-2xl font-bold text-modern-success">
                  {totalStats.conversions.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
        <div className="o4o-card">
          <div className="o4o-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 매출액</p>
                <p className="text-2xl font-bold text-modern-accent">
                  ₩{totalStats.revenue.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-modern-text-tertiary w-5 h-5" />
            <input
              type="text"
              placeholder="이름, 이메일로 검색..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-modern-text-secondary" />
          <select
            value={typeFilter}
            onChange={(e: any) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 유형</option>
            <option value="influencer">인플루언서</option>
            <option value="blog">블로그</option>
            <option value="business">비즈니스</option>
            <option value="individual">개인</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 상태</option>
            <option value="active">활성</option>
            <option value="pending">대기</option>
            <option value="inactive">비활성</option>
          </select>
        </div>
      </div>

      {/* Partners Table */}
      <div className="o4o-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  파트너사 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  유형
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  클릭수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  전환율
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  매출액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  수수료율
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-modern-border-primary">
              {filteredPartners.map((partner: any) => (
                <tr key={partner.id} className="hover:bg-modern-bg-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-modern-primary rounded-full flex items-center justify-center">
                        <Share2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-modern-text-primary">
                          {partner.name}
                        </div>
                        <div className="text-sm text-modern-text-secondary">
                          {partner.email}
                        </div>
                        {partner.website && (
                          <a href={partner.website} target="_blank" rel="noopener noreferrer" 
                             className="text-xs text-modern-primary hover:underline">
                            {partner.website}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    {getTypeLabel(partner.type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(partner.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    {partner.stats.clicks.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    {partner.stats.conversionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-modern-text-primary">
                    ₩{partner.stats.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    {partner.commissionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-modern-text-secondary hover:text-modern-text-primary">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PartnerPartners;