/**
 * SellerDashboard Page
 *
 * 판매원 대시보드 - 전체 현황 요약 페이지
 */

import React, { useState, useEffect } from 'react';

interface DashboardStats {
  display: {
    totalDisplays: number;
    averageFaceCount: number;
  };
  sample: {
    totalSamples: number;
    lowStockCount: number;
  };
  inventory: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  consultation: {
    totalConsultations: number;
    conversionRate: number;
  };
  kpi: {
    todayConsultations: number;
    todaySales: number;
  };
}

interface SellerDashboardProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const SellerDashboard: React.FC<SellerDashboardProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/cosmetics-seller',
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, [sellerId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [displayRes, sampleRes, inventoryRes, consultationRes] = await Promise.all([
        fetch(`${apiBaseUrl}/display/seller/${sellerId}/stats`),
        fetch(`${apiBaseUrl}/sample/seller/${sellerId}/stats`),
        fetch(`${apiBaseUrl}/inventory/seller/${sellerId}/stats`),
        fetch(`${apiBaseUrl}/consultation/seller/${sellerId}/stats`),
      ]);

      const displayData = await displayRes.json();
      const sampleData = await sampleRes.json();
      const inventoryData = await inventoryRes.json();
      const consultationData = await consultationRes.json();

      setStats({
        display: displayData.success
          ? displayData.data
          : { totalDisplays: 0, averageFaceCount: 0 },
        sample: sampleData.success
          ? sampleData.data
          : { totalSamples: 0, lowStockCount: 0 },
        inventory: inventoryData.success
          ? inventoryData.data
          : { totalProducts: 0, lowStockCount: 0, outOfStockCount: 0 },
        consultation: consultationData.success
          ? consultationData.data
          : { totalConsultations: 0, conversionRate: 0 },
        kpi: { todayConsultations: 0, todaySales: 0 },
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">대시보드 로딩 중...</div>;
  }

  if (error) {
    return <div className="error">오류: {error}</div>;
  }

  if (!stats) {
    return <div className="no-data">데이터가 없습니다.</div>;
  }

  return (
    <div className="seller-dashboard">
      <h2>판매원 대시보드</h2>

      <div className="dashboard-grid">
        {/* 진열 현황 */}
        <div className="dashboard-card">
          <h3>진열 현황</h3>
          <div className="card-content">
            <div className="metric">
              <span className="metric-value">{stats.display.totalDisplays}</span>
              <span className="metric-label">총 진열</span>
            </div>
            <div className="metric">
              <span className="metric-value">{stats.display.averageFaceCount}</span>
              <span className="metric-label">평균 페이싱</span>
            </div>
          </div>
        </div>

        {/* 샘플 현황 */}
        <div className="dashboard-card">
          <h3>샘플 현황</h3>
          <div className="card-content">
            <div className="metric">
              <span className="metric-value">{stats.sample.totalSamples}</span>
              <span className="metric-label">총 샘플</span>
            </div>
            <div className="metric warning">
              <span className="metric-value">{stats.sample.lowStockCount}</span>
              <span className="metric-label">부족 품목</span>
            </div>
          </div>
        </div>

        {/* 재고 현황 */}
        <div className="dashboard-card">
          <h3>재고 현황</h3>
          <div className="card-content">
            <div className="metric">
              <span className="metric-value">{stats.inventory.totalProducts}</span>
              <span className="metric-label">총 품목</span>
            </div>
            <div className="metric warning">
              <span className="metric-value">{stats.inventory.lowStockCount}</span>
              <span className="metric-label">재고 부족</span>
            </div>
            <div className="metric danger">
              <span className="metric-value">{stats.inventory.outOfStockCount}</span>
              <span className="metric-label">품절</span>
            </div>
          </div>
        </div>

        {/* 상담 현황 */}
        <div className="dashboard-card">
          <h3>상담 성과</h3>
          <div className="card-content">
            <div className="metric">
              <span className="metric-value">{stats.consultation.totalConsultations}</span>
              <span className="metric-label">총 상담</span>
            </div>
            <div className="metric success">
              <span className="metric-value">{stats.consultation.conversionRate}%</span>
              <span className="metric-label">전환율</span>
            </div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h3>빠른 작업</h3>
        <div className="action-buttons">
          <a href="#display" className="action-btn">
            진열 관리
          </a>
          <a href="#sample" className="action-btn">
            샘플 관리
          </a>
          <a href="#inventory" className="action-btn">
            재고 관리
          </a>
          <a href="#consultation" className="action-btn">
            상담 기록
          </a>
          <a href="#kpi" className="action-btn">
            KPI 확인
          </a>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
