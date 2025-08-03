import { ChangeEvent, useState } from 'react';
import { DollarSign, Percent, Calendar, Download, TrendingUp, TrendingDown, Filter } from 'lucide-react';

interface CommissionData {
  vendorId: string;
  vendorName: string;
  businessName: string;
  period: string;
  sales: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'paid' | 'pending' | 'processing';
  paidDate?: string;
}

const mockCommissionData: CommissionData[] = [
  {
    vendorId: '1',
    vendorName: '김판매',
    businessName: '프리미엄 건강식품',
    period: '2024-03',
    sales: 15000000,
    commissionRate: 10,
    commissionAmount: 1500000,
    status: 'paid',
    paidDate: '2024-03-10'
  },
  {
    vendorId: '2',
    vendorName: '이공급',
    businessName: '오가닉 라이프',
    period: '2024-03',
    sales: 8500000,
    commissionRate: 10,
    commissionAmount: 850000,
    status: 'pending'
  },
  {
    vendorId: '3',
    vendorName: '박판매',
    businessName: '헬스케어 프로',
    period: '2024-03',
    sales: 12000000,
    commissionRate: 8,
    commissionAmount: 960000,
    status: 'processing'
  },
  {
    vendorId: '4',
    vendorName: '최공급',
    businessName: '웰빙 마켓',
    period: '2024-02',
    sales: 5200000,
    commissionRate: 10,
    commissionAmount: 520000,
    status: 'paid',
    paidDate: '2024-02-10'
  }
];

interface CommissionRate {
  category: string;
  rate: number;
  minSales?: number;
}

const commissionRates: CommissionRate[] = [
  { category: '일반 상품', rate: 10 },
  { category: '프리미엄 상품', rate: 8 },
  { category: '대량 판매자', rate: 7, minSales: 50000000 },
  { category: '신규 판매자', rate: 12 }
];

const VendorsCommission = () => {
  const [commissions] = useState(mockCommissionData);
  const [selectedPeriod, setSelectedPeriod] = useState('2024-03');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredCommissions = commissions.filter((commission: any) => {
    const matchesPeriod = commission.period === selectedPeriod || selectedPeriod === 'all';
    const matchesStatus = statusFilter === 'all' || commission.status === statusFilter;
    return matchesPeriod && matchesStatus;
  });

  const totalCommission = filteredCommissions.reduce((sum: number, c) => sum + c.commissionAmount, 0);
  const paidCommission = filteredCommissions
    .filter((c: any) => c.status === 'paid')
    .reduce((sum: number, c) => sum + c.commissionAmount, 0);
  const pendingCommission = filteredCommissions
    .filter((c: any) => c.status === 'pending' || c.status === 'processing')
    .reduce((sum: number, c) => sum + c.commissionAmount, 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            지급완료
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            대기중
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            처리중
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-modern-accent" />
            수수료 관리
          </h1>
          <p className="text-modern-text-secondary mt-1">
            판매자별 수수료를 확인하고 정산을 관리하세요.
          </p>
        </div>
        <button className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors flex items-center gap-2">
          <Download className="w-4 h-4" />
          수수료 내역 다운로드
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">이번 달 총 수수료</p>
                <p className="text-2xl font-bold text-modern-text-primary">
                  ₩{totalCommission.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-modern-accent opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">지급 완료</p>
                <p className="text-2xl font-bold text-modern-success">
                  ₩{paidCommission.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">미지급 수수료</p>
                <p className="text-2xl font-bold text-modern-warning">
                  ₩{pendingCommission.toLocaleString()}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">평균 수수료율</p>
                <p className="text-2xl font-bold text-modern-primary">9.5%</p>
              </div>
              <Percent className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Commission Rates */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-semibold">수수료율 정책</h2>
        </div>
        <div className="wp-card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {commissionRates.map((rate, index) => (
              <div key={index} className="border border-modern-border-primary rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-modern-text-primary">{rate.category}</span>
                  <span className="text-xl font-bold text-modern-primary">{rate.rate}%</span>
                </div>
                {rate.minSales && (
                  <p className="text-xs text-modern-text-secondary">
                    최소 매출: ₩{rate.minSales.toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-modern-text-secondary" />
          <select
            value={selectedPeriod}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">전체 기간</option>
            <option value="2024-03">2024년 3월</option>
            <option value="2024-02">2024년 2월</option>
            <option value="2024-01">2024년 1월</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-modern-text-secondary" />
          <select
            value={statusFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
          >
            <option value="all">모든 상태</option>
            <option value="paid">지급완료</option>
            <option value="pending">대기중</option>
            <option value="processing">처리중</option>
          </select>
        </div>
      </div>

      {/* Commission Table */}
      <div className="wp-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  판매자 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  기간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  매출액
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  수수료율
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  수수료
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  지급일
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-modern-border-primary">
              {filteredCommissions.map((commission: any) => (
                <tr key={`${commission.vendorId}-${commission.period}`} className="hover:bg-modern-bg-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-modern-text-primary">
                        {commission.businessName}
                      </div>
                      <div className="text-sm text-modern-text-secondary">
                        {commission.vendorName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    {commission.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    ₩{commission.sales.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    {commission.commissionRate}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-modern-text-primary">
                    ₩{commission.commissionAmount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(commission.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-secondary">
                    {commission.paidDate ? new Date(commission.paidDate).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {commission.status === 'pending' && (
                      <button className="text-modern-primary hover:text-modern-primary-hover">
                        지급하기
                      </button>
                    )}
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

export default VendorsCommission;