import { useState } from 'react';
import { DollarSign, Calendar, Download, TrendingUp, Users, CreditCard, FileText } from 'lucide-react';

interface CommissionEntry {
  id: string;
  partnerId: string;
  partnerName: string;
  period: string;
  sales: number;
  clicks: number;
  conversions: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'paid' | 'pending' | 'processing' | 'hold';
  paidDate?: string;
  paymentMethod: string;
  invoice?: string;
}

const PartnerCommission = () => {
  // Commission data - empty until API integration
  const [commissions] = useState<CommissionEntry[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('2024-03');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredCommissions = commissions.filter((commission: any) => {
    const matchesPeriod = selectedPeriod === 'all' || commission.period === selectedPeriod;
    const matchesStatus = selectedStatus === 'all' || commission.status === selectedStatus;
    return matchesPeriod && matchesStatus;
  });

  const totalCommission = filteredCommissions.reduce((sum: any, c: any) => sum + c.commissionAmount, 0);
  const paidCommission = filteredCommissions
    .filter((c: any) => c.status === 'paid')
    .reduce((sum: any, c: any) => sum + c.commissionAmount, 0);
  const pendingCommission = filteredCommissions
    .filter((c: any) => c.status === 'pending' || c.status === 'processing')
    .reduce((sum: any, c: any) => sum + c.commissionAmount, 0);
  const averageCommissionRate = filteredCommissions.length > 0
    ? filteredCommissions.reduce((sum: any, c: any) => sum + c.commissionRate, 0) / filteredCommissions.length
    : 0;

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
      case 'hold':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            보류
          </span>
        );
      default:
        return null;
    }
  };

  const handlePayCommission = (_commissionId: string) => {
    // TODO: Implement payment processing
  };

  const handleDownloadInvoice = (_invoice: string) => {
    // TODO: Implement invoice download
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <DollarSign className="w-8 h-8 text-modern-accent" />
            파트너 수수료 현황
          </h1>
          <p className="text-modern-text-secondary mt-1">
            파트너 파트너의 수수료를 확인하고 정산을 관리하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors flex items-center gap-2">
            <FileText className="w-4 h-4" />
            정산 보고서
          </button>
          <button className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            내역 다운로드
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">총 수수료</p>
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
              <CreditCard className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">미지급 금액</p>
                <p className="text-2xl font-bold text-modern-warning">
                  ₩{pendingCommission.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">평균 수수료율</p>
                <p className="text-2xl font-bold text-modern-primary">
                  {averageCommissionRate.toFixed(1)}%
                </p>
              </div>
              <Users className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Schedule Notice */}
      <div className="wp-card bg-blue-50 border-blue-200">
        <div className="wp-card-body">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">정산 일정 안내</p>
              <p className="text-sm text-blue-800 mt-1">
                파트너 수수료는 매월 10일에 정산됩니다. 최소 정산 금액은 ₩100,000이며, 
                미달 시 다음 달로 이월됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <select
          value={selectedPeriod}
          onChange={(e: any) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
        >
          <option value="all">전체 기간</option>
          <option value="2024-03">2024년 3월</option>
          <option value="2024-02">2024년 2월</option>
          <option value="2024-01">2024년 1월</option>
        </select>
        <select
          value={selectedStatus}
          onChange={(e: any) => setSelectedStatus(e.target.value)}
          className="px-4 py-2 border border-modern-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-modern-primary"
        >
          <option value="all">모든 상태</option>
          <option value="paid">지급완료</option>
          <option value="pending">대기중</option>
          <option value="processing">처리중</option>
          <option value="hold">보류</option>
        </select>
      </div>

      {/* Commission Table */}
      <div className="wp-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  파트너사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  기간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  실적
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
                  지급 방법
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-modern-border-primary">
              {filteredCommissions.map((commission: any) => (
                <tr key={commission.id} className="hover:bg-modern-bg-hover">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-modern-text-primary">
                      {commission.partnerName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    {commission.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-modern-text-primary">
                      <span className="font-medium">{commission.conversions}</span> 전환
                    </div>
                    <div className="text-xs text-modern-text-secondary">
                      {commission.clicks.toLocaleString()} 클릭
                    </div>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                    {commission.paymentMethod}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {commission.status === 'pending' && (
                      <button
                        onClick={() => handlePayCommission(commission.id)}
                        className="text-modern-primary hover:text-modern-primary-hover"
                      >
                        지급하기
                      </button>
                    )}
                    {commission.invoice && (
                      <button
                        onClick={() => handleDownloadInvoice(commission.invoice!)}
                        className="text-modern-primary hover:text-modern-primary-hover"
                      >
                        인보이스
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">이번 달 정산 예정</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              {filteredCommissions
                .filter((c: any) => c.status === 'pending' && c.period === selectedPeriod)
                .map((commission: any) => (
                  <div key={commission.id} className="flex items-center justify-between py-2 border-b border-modern-border-primary last:border-b-0">
                    <div>
                      <p className="font-medium text-modern-text-primary">{commission.partnerName}</p>
                      <p className="text-sm text-modern-text-secondary">{commission.paymentMethod}</p>
                    </div>
                    <p className="font-medium text-modern-text-primary">
                      ₩{commission.commissionAmount.toLocaleString()}
                    </p>
                  </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-modern-border-primary">
              <div className="flex items-center justify-between">
                <p className="font-medium text-modern-text-primary">총 정산 예정액</p>
                <p className="text-xl font-bold text-modern-accent">
                  ₩{filteredCommissions
                    .filter((c: any) => c.status === 'pending' && c.period === selectedPeriod)
                    .reduce((sum: number, c) => sum + c.commissionAmount, 0)
                    .toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">정산 방법별 현황</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-modern-text-secondary">계좌이체</span>
                <span className="text-sm font-medium text-modern-text-primary">
                  ₩{commissions
                    .filter((c: any) => c.paymentMethod === '계좌이체')
                    .reduce((sum: number, c) => sum + c.commissionAmount, 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-modern-text-secondary">페이팔</span>
                <span className="text-sm font-medium text-modern-text-primary">
                  ₩{commissions
                    .filter((c: any) => c.paymentMethod === '페이팔')
                    .reduce((sum: number, c) => sum + c.commissionAmount, 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-modern-text-secondary">세금계산서</span>
                <span className="text-sm font-medium text-modern-text-primary">
                  ₩{commissions
                    .filter((c: any) => c.paymentMethod === '세금계산서')
                    .reduce((sum: number, c) => sum + c.commissionAmount, 0)
                    .toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnerCommission;