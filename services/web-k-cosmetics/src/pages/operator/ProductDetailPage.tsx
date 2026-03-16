/**
 * Operator Product Detail Page
 * WO-O4O-PRODUCT-MASTER-CONSOLE-V1
 *
 * Cookie-based auth (K-Cosmetics)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/apiClient';

// ─── Types ───────────────────────────────────────────────────

interface ProductDetail {
  id: string;
  barcode: string;
  regulatoryType: string;
  regulatoryName: string;
  marketingName: string;
  legacyBrandName: string | null;
  manufacturerName: string;
  specification: string | null;
  originCountry: string | null;
  tags: string[];
  mfdsPermitNumber: string | null;
  mfdsProductId: string;
  isMfdsVerified: boolean;
  mfdsSyncedAt: string | null;
  brandId: string | null;
  brandName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProductImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
}

interface SupplierOffer {
  id: string;
  supplierId: string;
  supplierName: string | null;
  distributionType: string;
  approvalStatus: string;
  isActive: boolean;
  priceGeneral: number;
  priceGold: number | null;
  pricePlatinum: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
}

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const url = path.replace(/^\/api\/v1/, '') || '/';
  const response = await api.get(url);
  return response.data;
}

// ─── Component ───────────────────────────────────────────────

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [detailData, supplierData] = await Promise.all([
          apiFetch<{ success: boolean; product: ProductDetail; images: ProductImage[] }>(
            `/api/v1/operator/products/${productId}`
          ),
          apiFetch<{ success: boolean; suppliers: SupplierOffer[] }>(
            `/api/v1/operator/products/${productId}/suppliers`
          ),
        ]);

        if (detailData.success) {
          setProduct(detailData.product);
          setImages(detailData.images);
        }
        if (supplierData.success) {
          setSuppliers(supplierData.suppliers);
        }
      } catch (err: any) {
        console.error('Failed to load product detail:', err);
        setError(err?.message || '상품 정보를 불러올 수 없습니다');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [productId]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return '-';
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null || price === undefined) return '-';
    return `${price.toLocaleString()}원`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-pink-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">상품 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/operator/products')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          ← 상품 목록으로
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-700">{error || '상품을 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  const approvalLabel: Record<string, { text: string; cls: string }> = {
    APPROVED: { text: '승인', cls: 'bg-green-100 text-green-700' },
    PENDING: { text: '대기', cls: 'bg-amber-100 text-amber-700' },
    REJECTED: { text: '거부', cls: 'bg-red-100 text-red-700' },
  };

  const distLabel: Record<string, string> = {
    PUBLIC: '공개',
    SERVICE: '서비스',
    PRIVATE: '비공개',
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => navigate('/operator/products')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 mb-4"
        >
          ← 상품 목록으로
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{product.marketingName}</h1>
        {product.regulatoryName && product.regulatoryName !== product.marketingName && (
          <p className="text-sm text-slate-500 mt-1">{product.regulatoryName}</p>
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">상품 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-8">
          <InfoRow label="바코드" value={product.barcode} mono />
          <InfoRow label="브랜드" value={product.brandName || '-'} />
          <InfoRow label="제조사" value={product.manufacturerName} />
          <InfoRow label="카테고리" value={product.categoryName || '-'} />
          <InfoRow label="규격" value={product.specification || '-'} />
          <InfoRow label="원산지" value={product.originCountry || '-'} />
          <InfoRow label="규제 유형" value={product.regulatoryType} />
          <InfoRow label="식약처 ID" value={product.mfdsProductId} mono />
          <InfoRow label="식약처 허가번호" value={product.mfdsPermitNumber || '-'} />
          <InfoRow label="MFDS 검증" value={product.isMfdsVerified ? '검증됨' : '미검증'} />
          <InfoRow label="등록일" value={formatDate(product.createdAt)} />
          <InfoRow label="수정일" value={formatDate(product.updatedAt)} />
        </div>
        {product.tags && product.tags.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2">태그</p>
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Images */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          상품 이미지 <span className="text-sm font-normal text-slate-400">({images.length})</span>
        </h2>
        {images.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">등록된 이미지가 없습니다</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <img
                  src={img.imageUrl}
                  alt={`Product image ${img.sortOrder}`}
                  className="w-full aspect-square rounded-lg object-cover border border-slate-200"
                />
                {img.isPrimary && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-pink-600 text-white text-[10px] font-medium rounded">
                    대표
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supplier Offers */}
      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          공급자 오퍼 <span className="text-sm font-normal text-slate-400">({suppliers.length})</span>
        </h2>
        {suppliers.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">연결된 공급자가 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">공급자</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">유통</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">일반가</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">골드가</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">플래티넘가</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">재고</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">승인</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">활성</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((offer) => {
                  const approval = approvalLabel[offer.approvalStatus] || { text: offer.approvalStatus, cls: 'bg-slate-100 text-slate-600' };
                  return (
                    <tr key={offer.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        {offer.supplierName || offer.supplierId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {distLabel[offer.distributionType] || offer.distributionType}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-700">{formatPrice(offer.priceGeneral)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-500">{formatPrice(offer.priceGold)}</td>
                      <td className="px-4 py-3 text-sm text-right text-slate-500">{formatPrice(offer.pricePlatinum)}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className={offer.stockQuantity <= offer.lowStockThreshold ? 'text-red-600 font-medium' : 'text-slate-700'}>
                          {offer.stockQuantity}
                        </span>
                        {offer.reservedQuantity > 0 && (
                          <span className="text-slate-400 text-xs ml-1">({offer.reservedQuantity})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${approval.cls}`}>
                          {approval.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {offer.isActive ? '✓' : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}
