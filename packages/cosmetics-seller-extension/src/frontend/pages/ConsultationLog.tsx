/**
 * ConsultationLog Page
 *
 * 상담 로그 페이지 - 고객 상담 내역 관리
 */

import React, { useState, useEffect } from 'react';

interface ConsultationItem {
  id: string;
  workflowSessionId?: string;
  customerId?: string;
  resultStatus: 'pending' | 'completed' | 'no_purchase' | 'cancelled';
  consultationDurationMinutes?: number;
  recommendedProducts: Array<{
    productId: string;
    productName?: string;
    reason?: string;
    wasAccepted?: boolean;
  }>;
  purchasedProducts: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    price: number;
  }>;
  notes?: string;
  createdAt: string;
}

interface ConsultationStats {
  totalConsultations: number;
  completedConsultations: number;
  conversionRate: number;
  averageDuration: number;
  totalRecommendations: number;
  totalPurchases: number;
}

interface ConsultationLogProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const ConsultationLog: React.FC<ConsultationLogProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/cosmetics-seller',
}) => {
  const [logs, setLogs] = useState<ConsultationItem[]>([]);
  const [stats, setStats] = useState<ConsultationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [sellerId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/consultation/seller/${sellerId}?limit=50`),
        fetch(`${apiBaseUrl}/consultation/seller/${sellerId}/stats`),
      ]);

      const logsData = await logsRes.json();
      const statsData = await statsRes.json();

      if (logsData.success) {
        setLogs(logsData.data);
      }
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '구매 완료';
      case 'no_purchase':
        return '미구매';
      case 'cancelled':
        return '취소';
      default:
        return '진행 중';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'status-success';
      case 'no_purchase':
        return 'status-warning';
      case 'cancelled':
        return 'status-danger';
      default:
        return 'status-pending';
    }
  };

  if (loading) {
    return <div className="loading">상담 로그 로딩 중...</div>;
  }

  if (error) {
    return <div className="error">오류: {error}</div>;
  }

  return (
    <div className="consultation-log">
      <h2>상담 로그</h2>

      {stats && (
        <div className="stats-summary">
          <div className="stat-card">
            <span className="stat-value">{stats.totalConsultations}</span>
            <span className="stat-label">총 상담</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.completedConsultations}</span>
            <span className="stat-label">구매 전환</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.conversionRate}%</span>
            <span className="stat-label">전환율</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.averageDuration}분</span>
            <span className="stat-label">평균 상담 시간</span>
          </div>
        </div>
      )}

      <div className="log-list">
        {logs.length === 0 ? (
          <p>상담 기록이 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>일시</th>
                <th>상태</th>
                <th>추천 상품</th>
                <th>구매 상품</th>
                <th>상담 시간</th>
                <th>비고</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>
                    <span className={getStatusClass(log.resultStatus)}>
                      {getStatusLabel(log.resultStatus)}
                    </span>
                  </td>
                  <td>{log.recommendedProducts.length}개</td>
                  <td>{log.purchasedProducts.length}개</td>
                  <td>
                    {log.consultationDurationMinutes
                      ? `${log.consultationDurationMinutes}분`
                      : '-'}
                  </td>
                  <td>{log.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ConsultationLog;
