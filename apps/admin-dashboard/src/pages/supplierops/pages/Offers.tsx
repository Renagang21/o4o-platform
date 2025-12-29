/**
 * SupplierOps Offers Page
 *
 * Refactored: PageHeader pattern applied (card grid layout preserved)
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Tag, Users } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';

interface Offer {
  id: string;
  productId: string;
  productName: string;
  price: number;
  stock: number;
  minOrderQuantity: number;
  isActive: boolean;
  activeSellers: number;
}

const Offers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Demo data
    setTimeout(() => {
      setOffers([
        {
          id: '1',
          productId: '1',
          productName: '프리미엄 에센스 세럼',
          price: 32000,
          stock: 150,
          minOrderQuantity: 1,
          isActive: true,
          activeSellers: 3,
        },
        {
          id: '2',
          productId: '2',
          productName: '수분 크림',
          price: 25000,
          stock: 80,
          minOrderQuantity: 1,
          isActive: true,
          activeSellers: 5,
        },
        {
          id: '3',
          productId: '3',
          productName: '클렌징 폼',
          price: 12000,
          stock: 200,
          minOrderQuantity: 2,
          isActive: false,
          activeSellers: 0,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredOffers = offers.filter((o) =>
    o.productName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // PageHeader actions
  const headerActions = [
    {
      id: 'create-offer',
      label: 'Offer 생성',
      icon: <Plus className="w-4 h-4" />,
      onClick: () => {
        console.log('Create offer clicked');
      },
      variant: 'primary' as const,
    },
  ];

  return (
    <div className="p-6">
      {/* PageHeader */}
      <PageHeader
        title="Offer 관리"
        subtitle="Seller에게 제공하는 가격/재고 Offer를 관리하세요"
        actions={headerActions}
      />

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="상품명 검색..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>등록된 Offer가 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className={`bg-white rounded-lg shadow p-4 ${
                !offer.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold">{offer.productName}</h3>
                  <p className="text-sm text-gray-500">Offer #{offer.id}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    offer.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {offer.isActive ? '활성' : '비활성'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">판매가</span>
                  <span className="font-medium">{offer.price.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">재고</span>
                  <span className="font-medium">{offer.stock}개</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">최소주문</span>
                  <span className="font-medium">{offer.minOrderQuantity}개</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  <span>판매자 {offer.activeSellers}명</span>
                </div>
                <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                  <Edit className="w-4 h-4" />
                  수정
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Offers;
