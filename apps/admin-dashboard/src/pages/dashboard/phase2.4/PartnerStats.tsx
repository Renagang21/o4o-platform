/**
 * Partner Stats Component (Phase 2.4)
 * Display partner list with sorting, search, and sparklines
 */

import React, { useState, useMemo } from 'react';
import { useOperationsStats } from '../../../hooks/api/useDashboard';

interface Partner {
  id: string;
  userId: string;
  tier: string;
  totalRevenue: number;
  refundRate: number;
  status: string;
  last7DaysTrend: number[]; // Sparkline data
}

/**
 * v1.2: WO-O4O-FINAL-MOCK-REMOVAL-DB-CONNECTION-V1
 * Mock 데이터 제거됨
 * TODO: 실제 API 구현 시 아래와 같이 호출
 * const response = await authClient.api.get('/api/v1/partners/stats');
 * return response.data.partners;
 */
const getPartners = (): Partner[] => {
  // 현재 기능 미구현 - 빈 배열 반환
  return [];
};

export function PartnerStats() {
  const { data: operations, isLoading } = useOperationsStats();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'refundRate'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const itemsPerPage = 10;

  // v1.2: API 호출 (현재 빈 배열 반환)
  const allPartners = useMemo(() => getPartners(), []);

  // Filter and sort partners
  const filteredPartners = useMemo(() => {
    let filtered = allPartners.filter((p) =>
      p.userId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    filtered.sort((a, b) => {
      const aValue = sortBy === 'revenue' ? a.totalRevenue : a.refundRate;
      const bValue = sortBy === 'revenue' ? b.totalRevenue : b.refundRate;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return filtered;
  }, [allPartners, searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredPartners.length / itemsPerPage);
  const paginatedPartners = filteredPartners.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Sparkline renderer (simple SVG line chart)
  const renderSparkline = (data: number[]) => {
    if (data.length === 0) return null;

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 60;
    const height = 20;

    const points = data
      .map((value, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((value - min) / range) * height;
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <svg width={width} height={height} className="inline-block">
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  const handleSort = (column: 'revenue' | 'refundRate') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleRowClick = (partnerId: string) => {
    setSelectedPartnerId(partnerId);
    // In real implementation, navigate to partner detail page or expand row
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Partner Statistics</h2>
        <div className="text-sm text-gray-600">
          Total Partners: <span className="font-bold">{filteredPartners.length}</span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by email..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to first page on search
          }}
          className="border rounded px-3 py-2 w-full max-w-md text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Partner Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Tier</th>
              <th
                className="px-4 py-3 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('revenue')}
              >
                Total Revenue {sortBy === 'revenue' && (sortOrder === 'desc' ? '↓' : '↑')}
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('refundRate')}
              >
                Refund Rate {sortBy === 'refundRate' && (sortOrder === 'desc' ? '↓' : '↑')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">7-Day Trend</th>
              <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPartners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No partners found
                </td>
              </tr>
            ) : (
              paginatedPartners.map((partner) => (
                <tr
                  key={partner.id}
                  onClick={() => handleRowClick(partner.id)}
                  className={`border-b hover:bg-blue-50 cursor-pointer transition-colors ${
                    selectedPartnerId === partner.id ? 'bg-blue-100' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-gray-900">{partner.userId}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        partner.tier === 'PLATINUM'
                          ? 'bg-purple-100 text-purple-800'
                          : partner.tier === 'GOLD'
                          ? 'bg-yellow-100 text-yellow-800'
                          : partner.tier === 'SILVER'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {partner.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    ₩{partner.totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-medium ${
                        partner.refundRate < 0.05
                          ? 'text-green-600'
                          : partner.refundRate < 0.1
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {(partner.refundRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">{renderSparkline(partner.last7DaysTrend)}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        partner.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {partner.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredPartners.length)} of{' '}
            {filteredPartners.length} partners
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded text-sm ${
                    currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Selected Partner Detail (placeholder) */}
      {selectedPartnerId && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          <div className="flex justify-between items-center">
            <span className="text-blue-800">
              Selected: <span className="font-medium">{selectedPartnerId}</span>
            </span>
            <button
              onClick={() => setSelectedPartnerId(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
          <div className="mt-2 text-xs text-blue-700">
            Click to navigate to partner detail page (integration pending)
          </div>
        </div>
      )}
    </div>
  );
}
