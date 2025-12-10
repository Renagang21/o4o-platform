/**
 * InventoryManagement Page
 *
 * 재고 관리 페이지 - 매장 재고 현황 및 조정 관리
 */

import React, { useState, useEffect } from 'react';

interface InventoryItem {
  id: string;
  productId: string;
  productName?: string;
  quantity: number;
  reorderLevel: number;
  maxStockLevel: number;
  lastRestockedAt?: string;
  lastAuditedAt?: string;
}

interface InventoryStats {
  totalProducts: number;
  totalQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  recentAdjustments: number;
}

interface InventoryManagementProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/cosmetics-seller',
}) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [sellerId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, statsRes] = await Promise.all([
        fetch(`${apiBaseUrl}/inventory/seller/${sellerId}`),
        fetch(`${apiBaseUrl}/inventory/seller/${sellerId}/stats`),
      ]);

      const invData = await invRes.json();
      const statsData = await statsRes.json();

      if (invData.success) {
        setInventory(invData.data);
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

  const handleAdjust = async (inventoryId: string, quantity: number, reason: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/inventory/${inventoryId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, reason }),
      });
      const result = await response.json();
      if (result.success) {
        fetchData();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading">재고 정보 로딩 중...</div>;
  }

  if (error) {
    return <div className="error">오류: {error}</div>;
  }

  return (
    <div className="inventory-management">
      <h2>재고 관리</h2>

      {stats && (
        <div className="stats-summary">
          <div className="stat-card">
            <span className="stat-value">{stats.totalProducts}</span>
            <span className="stat-label">총 품목</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.totalQuantity}</span>
            <span className="stat-label">총 수량</span>
          </div>
          <div className="stat-card warning">
            <span className="stat-value">{stats.lowStockCount}</span>
            <span className="stat-label">재고 부족</span>
          </div>
          <div className="stat-card danger">
            <span className="stat-value">{stats.outOfStockCount}</span>
            <span className="stat-label">품절</span>
          </div>
        </div>
      )}

      <div className="inventory-list">
        {inventory.length === 0 ? (
          <p>등록된 재고 정보가 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>상품</th>
                <th>현재 수량</th>
                <th>재주문 수준</th>
                <th>최대 수량</th>
                <th>상태</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.quantity === 0
                      ? 'out-of-stock'
                      : item.quantity <= item.reorderLevel
                        ? 'low-stock'
                        : ''
                  }
                >
                  <td>{item.productName || item.productId}</td>
                  <td>{item.quantity}</td>
                  <td>{item.reorderLevel}</td>
                  <td>{item.maxStockLevel}</td>
                  <td>
                    {item.quantity === 0 ? (
                      <span className="status-danger">품절</span>
                    ) : item.quantity <= item.reorderLevel ? (
                      <span className="status-warning">부족</span>
                    ) : (
                      <span className="status-ok">정상</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleAdjust(item.id, 10, 'restock')}
                      className="btn-restock"
                    >
                      입고
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

export default InventoryManagement;
