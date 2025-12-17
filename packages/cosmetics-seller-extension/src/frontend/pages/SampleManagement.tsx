/**
 * SampleManagement Page
 *
 * 샘플 관리 페이지 - 매장 샘플 재고 및 사용 현황 관리
 *
 * Uses cosmetics-sample-display-extension API:
 * - GET /api/v1/cosmetics-sample/inventory/:storeId
 * - GET /api/v1/cosmetics-sample/inventory/:storeId/stats
 * - POST /api/v1/cosmetics-sample/inventory/receive
 */

import React, { useState, useEffect } from 'react';

interface SampleItem {
  id: string;
  productId: string;
  productName?: string;
  quantityRemaining: number;  // Updated field name from API
  minimumStock: number;       // Updated field name from API
  sampleType: string;
  status: string;
  lastRefilledAt?: string;
  expiryDate?: string;
}

interface SampleStats {
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  outOfStockItems: number;
}

interface SampleManagementProps {
  sellerId: string;
  storeId?: string;  // Added storeId for store-based API
  apiBaseUrl?: string;
}

export const SampleManagement: React.FC<SampleManagementProps> = ({
  sellerId,
  storeId,
  apiBaseUrl = '/api/v1/cosmetics-sample',  // Updated to use new API
}) => {
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [stats, setStats] = useState<SampleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Use storeId if provided, fallback to sellerId
  const effectiveStoreId = storeId || sellerId;

  useEffect(() => {
    fetchData();
  }, [effectiveStoreId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use new cosmetics-sample-display-extension API endpoints
      const [samplesRes, statsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/inventory/${effectiveStoreId}`),
        fetch(`${apiBaseUrl}/inventory/${effectiveStoreId}/stats`),
      ]);

      if (!samplesRes.ok) {
        throw new Error(`Failed to fetch samples: ${samplesRes.statusText}`);
      }
      if (!statsRes.ok) {
        throw new Error(`Failed to fetch stats: ${statsRes.statusText}`);
      }

      const samplesData = await samplesRes.json();
      const statsData = await statsRes.json();

      // Handle both array response and wrapped response
      setSamples(Array.isArray(samplesData) ? samplesData : (samplesData.data || []));
      setStats(statsData.stats || statsData.data || statsData);
    } catch (err: any) {
      console.error('Sample fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefill = async (inventoryId: string, productId: string, quantity: number) => {
    try {
      // Use new receive endpoint for refill
      const response = await fetch(`${apiBaseUrl}/inventory/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: effectiveStoreId,
          productId,
          quantity,
          sampleType: 'trial',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record refill');
      }

      // Refresh data after successful refill
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading">샘플 정보 로딩 중...</div>;
  }

  if (error) {
    return <div className="error">오류: {error}</div>;
  }

  return (
    <div className="sample-management">
      <h2>샘플 관리</h2>

      {stats && (
        <div className="stats-summary">
          <div className="stat-card">
            <span className="stat-value">{stats.totalItems || 0}</span>
            <span className="stat-label">총 품목 수</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.totalQuantity || 0}</span>
            <span className="stat-label">총 샘플 수량</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.lowStockItems || 0}</span>
            <span className="stat-label">부족 품목</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.outOfStockItems || 0}</span>
            <span className="stat-label">품절 품목</span>
          </div>
        </div>
      )}

      <div className="sample-list">
        {samples.length === 0 ? (
          <p>등록된 샘플 정보가 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>상품</th>
                <th>현재 수량</th>
                <th>최소 수량</th>
                <th>상태</th>
                <th>최근 보충</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample) => (
                <tr
                  key={sample.id}
                  className={sample.quantityRemaining <= sample.minimumStock ? 'low-stock' : ''}
                >
                  <td>{sample.productName || sample.productId}</td>
                  <td>{sample.quantityRemaining}</td>
                  <td>{sample.minimumStock}</td>
                  <td>
                    <span className={`status-${sample.status || 'in_stock'}`}>
                      {sample.status === 'low_stock' ? '부족' :
                       sample.status === 'out_of_stock' ? '품절' :
                       sample.status === 'pending_refill' ? '보충대기' : '정상'}
                    </span>
                  </td>
                  <td>
                    {sample.lastRefilledAt
                      ? new Date(sample.lastRefilledAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td>
                    <button
                      onClick={() => handleRefill(sample.id, sample.productId, 10)}
                      className="btn-refill"
                    >
                      보충
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SampleManagement;
