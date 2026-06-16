/**
 * PharmacyB2BProducts - 약국 상품·거래 > 상품 화면
 *
 * 약국에서 취급할 상품 목록을 조회한다.
 * 데이터 소스는 GlycoPharm 상품 API(pharmacyApi.getProducts)이며,
 * KPA/K-Cosmetics 와의 SupplierProductOffer 기반 공통 정렬은 후속 작업이다.
 */

import { useState, useEffect } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { DataTable, type Column } from '@o4o/ui';
import { pharmacyApi, type PharmacyProduct } from '@/api/pharmacy';

export default function PharmacyB2BProducts() {
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 상품 로드
  useEffect(() => {
    loadProducts();
  }, [currentPage, searchQuery]);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await pharmacyApi.getProducts({
        search: searchQuery || undefined,
        page: currentPage,
        pageSize: itemsPerPage,
      });

      if (response.success && response.data) {
        setProducts(response.data.items);
        setTotalCount(response.data.total);
      } else {
        throw new Error('상품을 불러올 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Products load error:', err);
      setError(err.message || '상품을 불러오는데 실패했습니다.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // 테이블 컬럼 정의
  const columns: Column<Record<string, any>>[] = [
    { key: 'image', title: '이미지', dataIndex: 'image', width: '80px' },
    { key: 'name', title: '상품명', dataIndex: 'name', sortable: true },
    { key: 'supplier', title: '공급자', dataIndex: 'supplier', width: '150px' },
    { key: 'category', title: '카테고리', dataIndex: 'category', width: '120px' },
    { key: 'price', title: '가격', dataIndex: 'price', width: '120px', align: 'right' },
    { key: 'stock', title: '재고', dataIndex: 'stock', width: '80px', align: 'center', sortable: true },
    { key: 'status', title: '상태', dataIndex: 'status', width: '100px', align: 'center' },
    { key: 'actions', title: '', dataIndex: 'actions', width: '100px' },
  ];

  // 상태 배지 렌더링
  const renderStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      active: { label: '활성', className: 'bg-green-100 text-green-700' },
      inactive: { label: '비활성', className: 'bg-slate-100 text-slate-600' },
      out_of_stock: { label: '품절', className: 'bg-red-100 text-red-700' },
    };

    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // 가격 포맷팅
  const formatPrice = (price: number) => {
    return `₩${price.toLocaleString()}`;
  };

  // 테이블 행 데이터 변환
  const tableRows = products.map((product) => ({
    id: product.id,
    image: product.thumbnailUrl ? (
      <img
        src={product.thumbnailUrl}
        alt={product.name}
        className="w-12 h-12 object-cover rounded"
      />
    ) : (
      <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-400 text-xs">
        NO IMAGE
      </div>
    ),
    name: <span className="font-medium">{product.name}</span>,
    supplier: product.supplierName,
    category: product.categoryName,
    price: (
      <div className="text-right">
        {product.salePrice ? (
          <>
            <div className="font-bold text-red-600">{formatPrice(product.salePrice)}</div>
            <div className="text-xs text-slate-400 line-through">{formatPrice(product.price)}</div>
          </>
        ) : (
          <div className="font-bold">{formatPrice(product.price)}</div>
        )}
      </div>
    ),
    stock: <span className={product.stock === 0 ? 'text-red-600' : ''}>{product.stock}</span>,
    status: renderStatusBadge(product.status),
    actions: (
      <div className="flex gap-2">
        <button
          onClick={() => console.log('View:', product.id)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          보기
        </button>
        <button
          onClick={() => console.log('Edit:', product.id)}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
        >
          편집
        </button>
      </div>
    ),
  }));

  // 페이지네이션 처리
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">상품 관리</h1>
          <p className="text-slate-500 text-sm">
            {loading
              ? '불러오는 중...'
              : `약국에서 취급할 상품을 확인합니다 · 총 ${totalCount}개`}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="상품명으로 검색..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* 상품 테이블 */}
      {error ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">오류가 발생했습니다</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <button
            onClick={loadProducts}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            다시 시도
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          dataSource={tableRows}
          rowKey="id"
          loading={loading}
          emptyText="등록된 상품이 없습니다."
        />
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {totalCount}개 중 {(currentPage - 1) * itemsPerPage + 1}-
              {Math.min(currentPage * itemsPerPage, totalCount)}개 표시
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                처음
              </button>
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="px-3 py-1 text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                마지막
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
