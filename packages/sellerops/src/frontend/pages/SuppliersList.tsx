/**
 * SellerOps Suppliers List Page
 *
 * 공급자 목록 및 승인 요청 관리
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  ChevronRight,
} from 'lucide-react';
import type { SupplierListItemDto } from '../../dto/index.js';

interface SuppliersListProps {
  sellerId: string;
  apiBaseUrl?: string;
  onViewOffers?: (supplierId: string) => void;
}

export const SuppliersList: React.FC<SuppliersListProps> = ({
  sellerId,
  apiBaseUrl = '/api/v1/sellerops',
  onViewOffers,
}) => {
  const [suppliers, setSuppliers] = useState<SupplierListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [requestingId, setRequestingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSuppliers();
  }, [sellerId]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiBaseUrl}/suppliers?sellerId=${sellerId}`
      );
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      const data = await response.json();
      setSuppliers(data);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestApproval = async (supplierId: string) => {
    setRequestingId(supplierId);
    try {
      const response = await fetch(
        `${apiBaseUrl}/suppliers/${supplierId}/request-approval?sellerId=${sellerId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: '승인을 요청합니다.' }),
        }
      );
      const result = await response.json();
      if (result.success) {
        alert('승인 요청이 전송되었습니다.');
        fetchSuppliers();
      } else {
        alert(result.message);
      }
    } catch (err) {
      alert('승인 요청에 실패했습니다.');
    } finally {
      setRequestingId(null);
    }
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            승인됨
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            대기중
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            거절됨
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            미요청
          </span>
        );
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">공급자 관리</h1>
        <p className="text-gray-600">공급자 목록 및 승인 요청 관리</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="공급자 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Suppliers List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          공급자가 없습니다
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{supplier.name}</h3>
                    <p className="text-sm text-gray-500">
                      {supplier.contactEmail}
                    </p>
                  </div>
                </div>
                {getApprovalBadge(supplier.approvalStatus)}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>등록 상품: {supplier.productCount}개</span>
              </div>

              <div className="flex gap-2">
                {supplier.approvalStatus === 'none' && (
                  <button
                    onClick={() => handleRequestApproval(supplier.id)}
                    disabled={requestingId === supplier.id}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {requestingId === supplier.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        승인 요청
                      </>
                    )}
                  </button>
                )}

                {supplier.approvalStatus === 'approved' && onViewOffers && (
                  <button
                    onClick={() => onViewOffers(supplier.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
                  >
                    상품 보기
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {supplier.approvalStatus === 'pending' && (
                  <div className="flex-1 text-center py-2 text-yellow-600 text-sm">
                    승인 대기 중...
                  </div>
                )}

                {supplier.approvalStatus === 'rejected' && (
                  <button
                    onClick={() => handleRequestApproval(supplier.id)}
                    disabled={requestingId === supplier.id}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    재요청
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuppliersList;
