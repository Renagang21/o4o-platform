/**
 * PharmacyB2BProducts - B2B 상품 리스트 (WordPress 스타일 UI 검증용)
 *
 * ※ 본 화면은 B2B 주문 UI 검증용입니다.
 * 실제 B2B 전용 상품 API는 백엔드 구현 대기 중입니다.
 */

import { useState, useEffect } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { WordPressTable, type WordPressTableColumn, type WordPressTableRow } from '@/components/common/WordPressTable';
import { type RowAction } from '@/components/common/RowActions';
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

  // WordPress 테이블 컬럼 정의
  const columns: WordPressTableColumn[] = [
    { id: 'image', label: '이미지', width: '80px' },
    { id: 'name', label: '상품명', sortable: true },
    { id: 'supplier', label: '공급자', width: '150px' },
    { id: 'category', label: '카테고리', width: '120px' },
    { id: 'price', label: '가격', width: '120px', align: 'right' },
    { id: 'stock', label: '재고', width: '80px', align: 'center', sortable: true },
    { id: 'status', label: '상태', width: '100px', align: 'center' },
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

  // WordPress 테이블 행 데이터 변환
  const tableRows: WordPressTableRow[] = products.map((product) => {
    const actions: RowAction[] = [
      {
        label: '보기',
        onClick: () => console.log('View:', product.id),
      },
      {
        label: '편집',
        onClick: () => console.log('Edit:', product.id),
      },
    ];

    return {
      id: product.id,
      data: {
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
      },
      actions,
    };
  });

  // 페이지네이션 처리
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* 검증용 안내 배너 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">B2B UI 검증용 화면</p>
            <p className="text-blue-700">
              본 화면은 WordPress 스타일 테이블 UI 검증을 위한 페이지입니다.
              실제 B2B 전용 상품 API는 백엔드 구현 대기 중이며,
              현재는 일반 상품 API를 사용하여 UI/UX를 테스트합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">B2B 상품 관리</h1>
          <p className="text-slate-500 text-sm">
            {loading ? '불러오는 중...' : `총 ${totalCount}개의 상품`}
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

      {/* WordPress Style Table */}
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
        <WordPressTable
          columns={columns}
          rows={tableRows}
          loading={loading}
          emptyMessage="등록된 상품이 없습니다."
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
