/**
 * PartnershipRequestListPage - 파트너 모집 제품 목록
 *
 * 제품별 파트너 프로그램 목록을 테이블로 표시.
 * 파트너 신청 -> 매장 대시보드에 표시 -> 승인 시 파트너 대시보드에 등록
 *
 * TODO: Mock 데이터 -> API 연동 전환
 */

import { useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import { useAuth } from '../../../contexts';

// 파트너 모집 제품 타입
interface PartnerProduct {
  id: string;
  imageUrl: string;
  productName: string;
  manufacturer: string;
  consumerPrice: number;
  commissionRate: number; // 퍼센트 (예: 15)
  requestCompany: string;
  mallUrl: string;
  status: 'recruiting' | 'closed';
}

// Mock 데이터
const MOCK_PRODUCTS: PartnerProduct[] = [
  {
    id: '1',
    imageUrl: '',
    productName: '프리미엄 히알루론산 세럼 30ml',
    manufacturer: '더마랩코리아',
    consumerPrice: 38000,
    commissionRate: 15,
    requestCompany: '글라이코팜 강남점',
    mallUrl: 'https://glycopharm.neture.co.kr',
    status: 'recruiting',
  },
  {
    id: '2',
    imageUrl: '',
    productName: '비타민C 더블 세럼 50ml',
    manufacturer: '네이처메디컬',
    consumerPrice: 45000,
    commissionRate: 12,
    requestCompany: '뷰티랩 코스메틱',
    mallUrl: 'https://k-cosmetics.neture.co.kr',
    status: 'recruiting',
  },
  {
    id: '3',
    imageUrl: '',
    productName: '콜라겐 부스팅 크림 50g',
    manufacturer: '바이오더마텍',
    consumerPrice: 52000,
    commissionRate: 18,
    requestCompany: '우리동네약국',
    mallUrl: 'https://glycopharm.neture.co.kr',
    status: 'recruiting',
  },
  {
    id: '4',
    imageUrl: '',
    productName: '센텔라 진정 토너 200ml',
    manufacturer: '그린팜코리아',
    consumerPrice: 28000,
    commissionRate: 20,
    requestCompany: '헬스케어 파마시',
    mallUrl: 'https://glycopharm.neture.co.kr',
    status: 'recruiting',
  },
  {
    id: '5',
    imageUrl: '',
    productName: '레티놀 나이트 크림 30g',
    manufacturer: '더마랩코리아',
    consumerPrice: 62000,
    commissionRate: 10,
    requestCompany: '뷰티랩 코스메틱',
    mallUrl: 'https://k-cosmetics.neture.co.kr',
    status: 'closed',
  },
  {
    id: '6',
    imageUrl: '',
    productName: 'AHA/BHA 클렌징 폼 150ml',
    manufacturer: '클린스킨랩',
    consumerPrice: 22000,
    commissionRate: 25,
    requestCompany: '글라이코팜 강남점',
    mallUrl: 'https://glycopharm.neture.co.kr',
    status: 'recruiting',
  },
];

function formatPrice(price: number): string {
  return price.toLocaleString('ko-KR') + '원';
}

export default function PartnershipRequestListPage() {
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recruiting' | 'closed'>('all');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const filtered = MOCK_PRODUCTS.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.requestCompany.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApply = (productId: string) => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      return;
    }
    // TODO: API 호출 - 파트너 신청
    setAppliedIds((prev) => new Set(prev).add(productId));
    alert('파트너 신청이 완료되었습니다.\n매장 대시보드에서 승인 후 파트너 대시보드에 등록됩니다.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">파트너 모집 제품</h1>
        <p className="text-gray-600 text-sm">
          제품별 파트너 프로그램에 참여하세요. 신청 후 매장에서 승인하면 파트너로 등록됩니다.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="제품명, 제조사, 업체명 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'recruiting' | 'closed')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="all">전체 상태</option>
          <option value="recruiting">모집 중</option>
          <option value="closed">마감</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">이미지</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">제품명</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">제조사</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">소비자가</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">수수료</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">요청 업체</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">몰 URL</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600 w-28">신청</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    해당하는 제품이 없습니다
                  </td>
                </tr>
              ) : (
                filtered.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    {/* 이미지 */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-xs">IMG</span>
                        )}
                      </div>
                    </td>
                    {/* 제품명 */}
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{product.productName}</span>
                    </td>
                    {/* 제조사 */}
                    <td className="px-4 py-3 text-gray-600">{product.manufacturer}</td>
                    {/* 소비자가 */}
                    <td className="px-4 py-3 text-right text-gray-900 font-medium tabular-nums">
                      {formatPrice(product.consumerPrice)}
                    </td>
                    {/* 수수료 */}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                        {product.commissionRate}%
                      </span>
                    </td>
                    {/* 요청 업체 */}
                    <td className="px-4 py-3 text-gray-700">{product.requestCompany}</td>
                    {/* 몰 URL */}
                    <td className="px-4 py-3">
                      <a
                        href={product.mallUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                      >
                        방문
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    {/* 신청 */}
                    <td className="px-4 py-3 text-center">
                      {product.status === 'closed' ? (
                        <span className="text-xs text-gray-400">마감</span>
                      ) : appliedIds.has(product.id) ? (
                        <span className="text-xs text-green-600 font-medium">신청 완료</span>
                      ) : (
                        <button
                          onClick={() => handleApply(product.id)}
                          className="px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 transition-colors"
                        >
                          파트너 신청
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer info */}
      <p className="mt-4 text-xs text-gray-400">
        총 {filtered.length}개 제품 | 파트너 신청 후 매장 대시보드에서 승인 시 파트너 대시보드에 등록됩니다.
      </p>
    </div>
  );
}
