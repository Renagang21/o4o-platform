/**
 * DisplayManagement Page
 *
 * 진열 관리 페이지 - 매장 내 상품 진열 현황 관리
 */

import React, { useState, useEffect } from 'react';

interface DisplayItem {
  id: string;
  productId: string;
  productName?: string;
  location: string;
  faceCount: number;
  displayOrder: number;
  isVisible: boolean;
  lastCheckedAt?: string;
}

interface DisplayManagementProps {
  sellerId: string;
  apiBaseUrl?: string;
}

export const DisplayManagement: React.FC<DisplayManagementProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/cosmetics-seller',
}) => {
  const [displays, setDisplays] = useState<DisplayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDisplays();
  }, [sellerId]);

  const fetchDisplays = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiBaseUrl}/display/seller/${sellerId}`);
      const result = await response.json();
      if (result.success) {
        setDisplays(result.data);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">진열 정보 로딩 중...</div>;
  }

  if (error) {
    return <div className="error">오류: {error}</div>;
  }

  return (
    <div className="display-management">
      <h2>진열 관리</h2>
      <div className="display-list">
        {displays.length === 0 ? (
          <p>등록된 진열 정보가 없습니다.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>위치</th>
                <th>상품</th>
                <th>페이싱</th>
                <th>진열순서</th>
                <th>상태</th>
                <th>최근 점검</th>
              </tr>
            </thead>
            <tbody>
              {displays.map((display) => (
                <tr key={display.id}>
                  <td>{display.location}</td>
                  <td>{display.productName || display.productId}</td>
                  <td>{display.faceCount}</td>
                  <td>{display.displayOrder}</td>
                  <td>{display.isVisible ? '노출' : '숨김'}</td>
                  <td>
                    {display.lastCheckedAt
                      ? new Date(display.lastCheckedAt).toLocaleDateString()
                      : '-'}
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

export default DisplayManagement;
