import { useState } from 'react';
import { Link, Copy, QrCode, BarChart3, ExternalLink, Plus, Eye, Trash2 } from 'lucide-react';

interface AffiliateLink {
  id: string;
  partnerId: string;
  partnerName: string;
  url: string;
  shortUrl: string;
  campaign?: string;
  product?: {
    id: string;
    name: string;
    image?: string;
  };
  stats: {
    clicks: number;
    conversions: number;
    revenue: number;
  };
  createdAt: string;
  status: 'active' | 'paused' | 'expired';
}

const mockLinks: AffiliateLink[] = [
  {
    id: '1',
    partnerId: '1',
    partnerName: '김인플루언서',
    url: 'https://neture.co.kr/products/probiotic-plus',
    shortUrl: 'https://link.neture.co.kr/kim123',
    campaign: '봄맞이 프로모션',
    product: {
      id: '1',
      name: '프로바이오틱스 플러스',
      image: '/placeholder.jpg'
    },
    stats: {
      clicks: 3420,
      conversions: 102,
      revenue: 3060000
    },
    createdAt: '2024-03-01',
    status: 'active'
  },
  {
    id: '2',
    partnerId: '2',
    partnerName: '건강 블로그',
    url: 'https://neture.co.kr/products/omega3-premium',
    shortUrl: 'https://link.neture.co.kr/health456',
    product: {
      id: '2',
      name: '오메가3 프리미엄',
      image: '/placeholder.jpg'
    },
    stats: {
      clicks: 1890,
      conversions: 56,
      revenue: 1680000
    },
    createdAt: '2024-03-05',
    status: 'active'
  },
  {
    id: '3',
    partnerId: '1',
    partnerName: '김인플루언서',
    url: 'https://neture.co.kr/collections/spring-sale',
    shortUrl: 'https://link.neture.co.kr/spring2024',
    campaign: '봄 세일 특집',
    stats: {
      clicks: 5230,
      conversions: 178,
      revenue: 5340000
    },
    createdAt: '2024-02-20',
    status: 'active'
  },
  {
    id: '4',
    partnerId: '4',
    partnerName: '웰니스 샵',
    url: 'https://neture.co.kr/products/multivitamin-gold',
    shortUrl: 'https://link.neture.co.kr/wellness789',
    product: {
      id: '3',
      name: '멀티비타민 골드'
    },
    stats: {
      clicks: 980,
      conversions: 29,
      revenue: 870000
    },
    createdAt: '2024-01-15',
    status: 'paused'
  }
];

const AffiliateLinks = () => {
  const [links] = useState<AffiliateLink[]>(mockLinks);
  const [selectedPartner, setSelectedPartner] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  // TODO: Implement create modal
  // const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredLinks = links.filter(link => {
    const matchesPartner = selectedPartner === 'all' || link.partnerId === selectedPartner;
    const matchesStatus = selectedStatus === 'all' || link.status === selectedStatus;
    return matchesPartner && matchesStatus;
  });

  const handleCopyLink = (shortUrl: string) => {
    navigator.clipboard.writeText(shortUrl);
    // TODO: Show toast notification
    console.log('Link copied:', shortUrl);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            활성
          </span>
        );
      case 'paused':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            일시정지
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            만료
          </span>
        );
      default:
        return null;
    }
  };

  const totalStats = filteredLinks.reduce((acc, link) => ({
    clicks: acc.clicks + link.stats.clicks,
    conversions: acc.conversions + link.stats.conversions,
    revenue: acc.revenue + link.stats.revenue
  }), { clicks: 0, conversions: 0, revenue: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <Link className="w-8 h-8 text-modern-primary" />
            추천 링크 관리
          </h1>
          <p className="text-modern-text-secondary mt-1">
            제휴 추천 링크를 생성하고 성과를 추적하세요.
          </p>
        </div>
        <button
          onClick={() => {
            // TODO: Implement create modal
            console.log('Create new link');
          }}
          className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          새 링크 생성
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">활성 링크</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  {links.filter(l => l.status === 'active').length}
                </p>
              </div>
              <Link className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 클릭수</p>
                <p className="text-2xl font-bold text-modern-primary">
                  {totalStats.clicks.toLocaleString()}
                </p>
              </div>
              <Eye className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">전환수</p>
                <p className="text-2xl font-bold text-modern-success">
                  {totalStats.conversions}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">평균 전환율</p>
                <p className="text-2xl font-bold text-modern-accent">
                  {totalStats.clicks > 0 ? ((totalStats.conversions / totalStats.clicks) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={selectedPartner}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedPartner(e.target.value)}
          className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
        >
          <option value="all">모든 제휴사</option>
          <option value="1">김인플루언서</option>
          <option value="2">건강 블로그</option>
          <option value="4">웰니스 샵</option>
        </select>
        <select
          value={selectedStatus}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
        >
          <option value="all">모든 상태</option>
          <option value="active">활성</option>
          <option value="paused">일시정지</option>
          <option value="expired">만료</option>
        </select>
      </div>

      {/* Links Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLinks.map((link) => (
          <div key={link.id} className="wp-card">
            <div className="wp-card-body">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-modern-text-primary">
                      {link.partnerName}
                    </h3>
                    {getStatusBadge(link.status)}
                  </div>
                  {link.campaign && (
                    <p className="text-sm text-modern-text-secondary mb-1">
                      캠페인: {link.campaign}
                    </p>
                  )}
                  {link.product && (
                    <p className="text-sm text-modern-text-secondary">
                      상품: {link.product.name}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button className="p-1.5 text-modern-text-secondary hover:text-modern-text-primary">
                    <QrCode className="w-5 h-5" />
                  </button>
                  <button className="p-1.5 text-modern-text-secondary hover:text-modern-danger">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Link URLs */}
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs text-modern-text-secondary mb-1">단축 URL</p>
                  <div className="flex items-center gap-2 p-2 bg-modern-bg-tertiary rounded-lg">
                    <code className="flex-1 text-sm text-modern-primary">{link.shortUrl}</code>
                    <button
                      onClick={() => handleCopyLink(link.shortUrl)}
                      className="p-1 hover:bg-modern-bg-hover rounded"
                    >
                      <Copy className="w-4 h-4 text-modern-text-secondary" />
                    </button>
                    <a
                      href={link.shortUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 hover:bg-modern-bg-hover rounded"
                    >
                      <ExternalLink className="w-4 h-4 text-modern-text-secondary" />
                    </a>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-modern-text-secondary mb-1">원본 URL</p>
                  <p className="text-xs text-modern-text-tertiary truncate">{link.url}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-modern-border-primary">
                <div className="text-center">
                  <p className="text-2xl font-bold text-modern-text-primary">
                    {link.stats.clicks.toLocaleString()}
                  </p>
                  <p className="text-xs text-modern-text-secondary">클릭수</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-modern-success">
                    {link.stats.conversions}
                  </p>
                  <p className="text-xs text-modern-text-secondary">전환수</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-modern-accent">
                    {link.stats.clicks > 0 ? ((link.stats.conversions / link.stats.clicks) * 100).toFixed(1) : 0}%
                  </p>
                  <p className="text-xs text-modern-text-secondary">전환율</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-modern-border-primary">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-modern-text-secondary">
                    생성일: {new Date(link.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                  <p className="text-sm font-medium text-modern-text-primary">
                    매출: ₩{link.stats.revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredLinks.length === 0 && (
        <div className="wp-card">
          <div className="wp-card-body text-center py-12">
            <Link className="w-12 h-12 text-modern-text-tertiary mx-auto mb-4" />
            <p className="text-modern-text-secondary">추천 링크가 없습니다.</p>
            <button
              onClick={() => {
                // TODO: Implement create modal
                console.log('Create first link');
              }}
              className="mt-4 px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors"
            >
              첫 링크 생성하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AffiliateLinks;