/**
 * SellerOps Suppliers List Page
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Package,
  CheckCircle,
  Clock,
  Send,
  ChevronRight,
} from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contactEmail: string;
  status: string;
  approvalStatus: 'none' | 'pending' | 'approved' | 'rejected';
  productCount: number;
}

const SuppliersList: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      setSuppliers([
        {
          id: '1',
          name: '화장품 공급사 A',
          contactEmail: 'supplier-a@example.com',
          status: 'active',
          approvalStatus: 'approved',
          productCount: 156,
        },
        {
          id: '2',
          name: '건강식품 공급사 B',
          contactEmail: 'supplier-b@example.com',
          status: 'active',
          approvalStatus: 'pending',
          productCount: 89,
        },
        {
          id: '3',
          name: '생활용품 공급사 C',
          contactEmail: 'supplier-c@example.com',
          status: 'active',
          approvalStatus: 'none',
          productCount: 234,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

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
                  <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                    승인 요청
                  </button>
                )}

                {supplier.approvalStatus === 'approved' && (
                  <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50">
                    상품 보기
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {supplier.approvalStatus === 'pending' && (
                  <div className="flex-1 text-center py-2 text-yellow-600 text-sm">
                    승인 대기 중...
                  </div>
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
