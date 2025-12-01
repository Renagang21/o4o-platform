import { FC, useState, useEffect } from 'react';
import { DollarSign, Download, Calendar, Users, Package } from 'lucide-react';
import { OrganizationSelector } from '@/components/organization/OrganizationSelector';
import { DataTable } from '@/components/common/DataTable';
import { useGroupbuyCampaigns, GroupbuyCampaign } from '@/hooks/groupbuy/useGroupbuyCampaigns';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';

interface SettlementSummary {
  campaignId: string;
  campaignName: string;
  productName: string;
  totalParticipants: number;
  totalQuantity: number;
  totalRevenue: number;
  commission: number;
  netRevenue: number;
  startDate: string;
  endDate: string;
  status: 'pending' | 'completed' | 'failed';
  organizationName?: string;
}

interface SettlementStats {
  totalCampaigns: number;
  totalRevenue: number;
  totalCommission: number;
  totalNetRevenue: number;
  completedCount: number;
  pendingCount: number;
}

export const GroupbuySettlementPage: FC = () => {
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [settlements, setSettlements] = useState<SettlementSummary[]>([]);
  const [stats, setStats] = useState<SettlementStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Fetch campaigns for settlement calculation
  const { campaigns } = useGroupbuyCampaigns({
    organizationId: selectedOrg || undefined,
    status: 'completed'
  });

  useEffect(() => {
    calculateSettlements();
  }, [campaigns, dateRange]);

  const calculateSettlements = () => {
    setLoading(true);

    try {
      // Filter campaigns by date range
      const filteredCampaigns = campaigns.filter(campaign => {
        const endDate = new Date(campaign.endDate);
        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);
        return endDate >= rangeStart && endDate <= rangeEnd;
      });

      // Calculate settlement data
      const settlementData: SettlementSummary[] = filteredCampaigns.map(campaign => {
        const totalRevenue = campaign.currentQuantity * campaign.groupPrice;
        const commission = totalRevenue * 0.05; // 5% commission
        const netRevenue = totalRevenue - commission;

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          productName: campaign.product?.name || 'Unknown Product',
          totalParticipants: campaign.participantCount,
          totalQuantity: campaign.currentQuantity,
          totalRevenue,
          commission,
          netRevenue,
          startDate: campaign.startDate,
          endDate: campaign.endDate,
          status: campaign.status === 'completed' ? 'completed' : 'pending',
          organizationName: campaign.organization?.name
        };
      });

      setSettlements(settlementData);

      // Calculate summary stats
      const statsData: SettlementStats = {
        totalCampaigns: settlementData.length,
        totalRevenue: settlementData.reduce((sum, s) => sum + s.totalRevenue, 0),
        totalCommission: settlementData.reduce((sum, s) => sum + s.commission, 0),
        totalNetRevenue: settlementData.reduce((sum, s) => sum + s.netRevenue, 0),
        completedCount: settlementData.filter(s => s.status === 'completed').length,
        pendingCount: settlementData.filter(s => s.status === 'pending').length
      };

      setStats(statsData);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Generate CSV
    const headers = [
      '캠페인명', '상품명', '참여자 수', '총 수량', '총 매출', '수수료', '순수익',
      '시작일', '종료일', '상태', '조직'
    ];

    const rows = settlements.map(s => [
      s.campaignName,
      s.productName,
      s.totalParticipants,
      s.totalQuantity,
      s.totalRevenue,
      s.commission,
      s.netRevenue,
      s.startDate.split('T')[0],
      s.endDate.split('T')[0],
      s.status === 'completed' ? '완료' : '대기',
      s.organizationName || '-'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `groupbuy_settlement_${dateRange.start}_${dateRange.end}.csv`;
    link.click();

    toast.success('정산 리포트를 다운로드했습니다.');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const columns = [
    {
      title: '캠페인',
      dataIndex: 'campaignName',
      key: 'campaignName',
      render: (text: string, record: SettlementSummary) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-sm text-gray-500">{record.productName}</div>
        </div>
      )
    },
    {
      title: '조직',
      dataIndex: 'organizationName',
      key: 'organizationName',
      render: (text: string) => text || '-'
    },
    {
      title: '참여 현황',
      key: 'participants',
      render: (_: any, record: SettlementSummary) => (
        <div className="text-sm">
          <div>{record.totalParticipants}명</div>
          <div className="text-gray-500">{record.totalQuantity}개</div>
        </div>
      )
    },
    {
      title: '총 매출',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      render: (value: number) => (
        <span className="font-medium text-blue-600">{formatCurrency(value)}</span>
      )
    },
    {
      title: '수수료',
      dataIndex: 'commission',
      key: 'commission',
      render: (value: number) => (
        <span className="text-orange-600">{formatCurrency(value)}</span>
      )
    },
    {
      title: '순수익',
      dataIndex: 'netRevenue',
      key: 'netRevenue',
      render: (value: number) => (
        <span className="font-bold text-green-600">{formatCurrency(value)}</span>
      )
    },
    {
      title: '종료일',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (value: string) => new Date(value).toLocaleDateString('ko-KR')
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'completed'
            ? 'bg-green-100 text-green-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {value === 'completed' ? '완료' : '대기'}
        </span>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공동구매 정산 리포트</h1>
          <p className="text-gray-600 mt-1">완료된 캠페인의 정산 내역을 확인하세요</p>
        </div>

        <button
          onClick={handleExport}
          disabled={settlements.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          CSV 다운로드
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 매출</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.totalRevenue)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">순수익</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(stats.totalNetRevenue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">완료 캠페인</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.completedCount}건
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">수수료</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(stats.totalCommission)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              조직 선택
            </label>
            <OrganizationSelector
              value={selectedOrg}
              onChange={setSelectedOrg}
              placeholder="전체 조직"
              filterByPermission={true}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              시작일
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료일
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Settlement Table */}
      <div className="bg-white rounded-lg shadow border">
        <DataTable
          columns={columns}
          dataSource={settlements}
          rowKey="campaignId"
          loading={loading}
          emptyText="정산 내역이 없습니다"
        />
      </div>
    </div>
  );
};

export default GroupbuySettlementPage;
