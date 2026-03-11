/**
 * Operator Product Detail Page
 * WO-O4O-PRODUCT-MASTER-CONSOLE-V1
 *
 * /api/v1/operator/products/:productId — 상품 상세 + 이미지 + 공급자 오퍼
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Loader2,
  AlertCircle,
  Image as ImageIcon,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Barcode,
  Factory,
  Tag,
} from 'lucide-react';
import { getAccessToken } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

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
  gcsPath: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
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
  consumerReferencePrice: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// ─── API Helper ──────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || body?.message || `API error ${res.status}`);
  }
  return res.json();
}

// ─── Sub-components ──────────────────────────────────────────

function ApprovalBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
    APPROVED: { label: '승인', className: 'bg-green-100 text-green-700', icon: CheckCircle },
    PENDING: { label: '대기', className: 'bg-amber-100 text-amber-700', icon: Clock },
    REJECTED: { label: '거부', className: 'bg-red-100 text-red-700', icon: XCircle },
  };
  const c = config[status] || { label: status, className: 'bg-slate-100 text-slate-600', icon: Clock };
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

function DistributionBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    PUBLIC: { label: '공개', className: 'bg-blue-100 text-blue-700' },
    SERVICE: { label: '서비스', className: 'bg-purple-100 text-purple-700' },
    PRIVATE: { label: '비공개', className: 'bg-slate-100 text-slate-600' },
  };
  const c = config[type] || { label: type, className: 'bg-slate-100 text-slate-600' };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────

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

  // ─── Render ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-slate-500 text-sm">상품 정보 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate('/operator/products')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          상품 목록으로
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-700">{error || '상품을 찾을 수 없습니다'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Back button + Title */}
      <div>
        <button
          onClick={() => navigate('/operator/products')}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          상품 목록으로
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{product.marketingName}</h1>
        {product.regulatoryName && product.regulatoryName !== product.marketingName && (
          <p className="text-sm text-slate-500 mt-1">{product.regulatoryName}</p>
        )}
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" />
          상품 정보
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow icon={Barcode} label="바코드" value={product.barcode} mono />
          <InfoRow icon={Tag} label="브랜드" value={product.brandName || '-'} />
          <InfoRow icon={Factory} label="제조사" value={product.manufacturerName} />
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
                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Images */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-green-600" />
          상품 이미지
          <span className="text-sm font-normal text-slate-400 ml-1">({images.length})</span>
        </h2>
        {images.length === 0 ? (
          <div className="py-8 text-center">
            <ImageIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">등록된 이미지가 없습니다</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative group">
                <img
                  src={img.imageUrl}
                  alt={`Product image ${img.sortOrder}`}
                  className="w-full aspect-square rounded-lg object-cover border border-slate-200"
                />
                {img.isPrimary && (
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-primary-500 text-white text-[10px] font-medium rounded">
                    대표
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supplier Offers */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" />
          공급자 오퍼
          <span className="text-sm font-normal text-slate-400 ml-1">({suppliers.length})</span>
        </h2>
        {suppliers.length === 0 ? (
          <div className="py-8 text-center">
            <Truck className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">연결된 공급자가 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">공급자</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500">유통 타입</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">일반가</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">골드가</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">플래티넘가</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-slate-500">재고</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">승인</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-slate-500">활성</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {offer.supplierName || offer.supplierId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <DistributionBadge type={offer.distributionType} />
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-700">
                      {formatPrice(offer.priceGeneral)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-500">
                      {formatPrice(offer.priceGold)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-500">
                      {formatPrice(offer.pricePlatinum)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <span className={offer.stockQuantity <= offer.lowStockThreshold ? 'text-red-600 font-medium' : 'text-slate-700'}>
                        {offer.stockQuantity}
                      </span>
                      {offer.reservedQuantity > 0 && (
                        <span className="text-slate-400 text-xs ml-1">({offer.reservedQuantity} 예약)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ApprovalBadge status={offer.approvalStatus} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {offer.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-slate-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helper component ────────────────────────────────────────

function InfoRow({ label, value, mono, icon: Icon }: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: typeof Package;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />}
      <div className={Icon ? '' : 'pl-7'}>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-sm text-slate-800 ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}
