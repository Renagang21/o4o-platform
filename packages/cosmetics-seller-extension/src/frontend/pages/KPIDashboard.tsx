/**
 * KPIDashboard Page
 *
 * KPI 대시보드 페이지 - 판매원 성과 지표 현황
 */

import React, { useState, useEffect } from 'react';

interface KPIItem {
  id: string;
  periodType: 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  consultationCount: number;
  conversionRate: number;
  salesAmount: number;
  averageTransactionValue: number;
  newCustomerCount: number;
  repeatCustomerCount: number;
  topSellingProducts: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    revenue: number;
  }>;
}

interface KPISummary {
  totalConsultations: number;
  averageConversionRate: number;
  totalSalesAmount: number;
  periodCount: number;
}

interface KPIDashboardProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/cosmetics-seller',
}) => {
  const [kpis, setKpis] = useState<KPIItem[]>([]);
  const [summary, setSummary] = useState<KPISummary | null>(null);
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [sellerId, periodType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kpisRes, summaryRes] = await Promise.all([
        fetch(`${apiBaseUrl}/kpi/seller/${sellerId}?periodType=${periodType}&limit=30`),
        fetch(`${apiBaseUrl}/kpi/seller/${sellerId}/summary`),
      ]);

      const kpisData = await kpisRes.json();
      const summaryData = await summaryRes.json();

      if (kpisData.success) {
        setKpis(kpisData.data);
      }
      if (summaryData.success) {
        setSummary(summaryData.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleComputeDaily = async () => {
    try {
      const response = await fetch(
        `${apiBaseUrl}/kpi/seller/${sellerId}/compute/daily`,
        { method: 'POST' }
      );
      const result = await response.json();
      if (result.success) {
        fetchData();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const getPeriodLabel = (type: string) => {
    switch (type) {
      case 'daily':
        return '일별';
      case 'weekly':
        return '주별';
      case 'monthly':
        return '월별';
      default:
        return type;
    }
  };

  if (loading) {
    return <div className="loading">KPI 데이터 로딩 중...</div>;
  }

  if (error) {
    return <div className="error">오류: {error}</div>;
  }

  return (
    <div className="kpi-dashboard">
      <h2>KPI 대시보드</h2>

      {summary && (
        <div className="stats-summary">
          <div className="stat-card">
            <span className="stat-value">{summary.totalConsultations}</span>
            <span className="stat-label">총 상담</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{summary.averageConversionRate}%</span>
            <span className="stat-label">평균 전환율</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatCurrency(summary.totalSalesAmount)}</span>
            <span className="stat-label">총 매출</span>
          </div>
        </div>
      )}

      <div className="controls">
        <div className="period-selector">
          {(['daily', 'weekly', 'monthly'] as const).map((type) => (
            <button
              key={type}
              className={periodType === type ? 'active' : ''}
              onClick={() => setPeriodType(type)}
            >
              {getPeriodLabel(type)}
            </button>
          ))}
        </div>
        <button onClick={handleComputeDaily} className="btn-compute">
          오늘 KPI 계산
        </button>
      </div>

      <div className="kpi-list">
        {kpis.length === 0 ? (
          <p>KPI 데이터가 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>기간</th>
                <th>상담 수</th>
                <th>전환율</th>
                <th>매출</th>
                <th>객단가</th>
                <th>신규 고객</th>
                <th>재방문 고객</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((kpi) => (
                <tr key={kpi.id}>
                  <td>
                    {new Date(kpi.periodStart).toLocaleDateString()} ~{' '}
                    {new Date(kpi.periodEnd).toLocaleDateString()}
                  </td>
                  <td>{kpi.consultationCount}</td>
                  <td>{kpi.conversionRate}%</td>
                  <td>{formatCurrency(kpi.salesAmount)}</td>
                  <td>{formatCurrency(kpi.averageTransactionValue)}</td>
                  <td>{kpi.newCustomerCount}</td>
                  <td>{kpi.repeatCustomerCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default KPIDashboard;
