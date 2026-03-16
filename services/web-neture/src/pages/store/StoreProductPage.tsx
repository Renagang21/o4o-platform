/**
 * StoreProductPage - 매장 상품 상세 (공통 랜딩 페이지)
 *
 * Work Order: WO-O4O-STORE-PRODUCT-PAGE-V1
 * Enhanced: WO-O4O-STORE-PRODUCT-PAGE-ENHANCEMENT-V1
 *
 * Routes:
 * - /store/:storeSlug/product/:productSlug (V2 slug-based)
 * - /store/product/:offerId (V1 backward compat)
 *
 * 구조:
 * 1. Hero — 상품 이미지 + 상품명 + 브랜드
 * 2. Price — 매장 가격 + 구매 버튼
 * 3. Pharmacist Comment — 약사 코멘트 (StoreProductProfile)
 * 4. Description — 상품 설명 (StoreProductProfile / SupplierProductOffer)
 * 5. Store Info — 매장 정보
 * 6. QR Share — QR 코드 + 공유 + 다운로드
 *
 * 유입 경로: QR / Tablet / 전자상거래 목록 / 검색 / 외부 링크
 * ?ref=TOKEN 파라미터 캡처 → sessionStorage
 * ?org=UUID 파라미터 → StoreProductProfile 조회 시 매장 컨텍스트
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  ArrowLeft,
  Package,
  Minus,
  Plus,
  MapPin,
  Phone,
  Clock,
  QrCode,
  Share2,
  MessageSquare,
  FileText,
  Store,
  Download,
  Printer,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../../lib/api/index.js';
import { addToCart } from '../../lib/cart.js';
import { captureReferralToken } from '../../lib/referral.js';

// ── Types ──

interface ProductDetail {
  offer_id: string;
  master_id: string;
  product_name: string;
  manufacturer_name: string | null;
  brand_name: string | null;
  specification: string | null;
  supplier_name: string;
  price_general: number;
  consumer_reference_price: number | null;
  image_url: string | null;
  product_slug?: string;
  store_slug?: string;
  supplier_id?: string;
  // Extended fields (from StoreProductProfile)
  display_name?: string | null;
  pharmacist_comment?: string | null;
  description?: string | null;
  // Store info
  store_name?: string | null;
  store_address?: string | null;
  store_phone?: string | null;
  store_hours?: string | null;
  // Listing override
  listing_price?: number | null;
}

export default function StoreProductPage() {
  const { offerId, storeSlug, productSlug } = useParams<{
    offerId?: string;
    storeSlug?: string;
    productSlug?: string;
  }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState(false);
  const [flyerLoading, setFlyerLoading] = useState<number | null>(null);

  useEffect(() => {
    captureReferralToken();
  }, []);

  useEffect(() => {
    let path: string | null = null;
    const orgId = searchParams.get('org');
    const orgParam = orgId ? `?org=${encodeURIComponent(orgId)}` : '';

    if (storeSlug && productSlug) {
      path = `/neture/store/${storeSlug}/product/${productSlug}${orgParam}`;
    } else if (offerId) {
      path = `/neture/store/product/${offerId}${orgParam}`;
    }
    if (!path) { setLoading(false); return; }

    (async () => {
      try {
        const res = await api.get(path!);
        setProduct(res.data.data || null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [offerId, storeSlug, productSlug, searchParams]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      offerId: product.offer_id,
      name: product.product_name,
      imageUrl: product.image_url,
      priceGeneral: displayPrice,
      supplierId: product.supplier_id || product.offer_id,
      supplierName: product.supplier_name,
    }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.product_name, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleDownloadQr = useCallback(() => {
    const canvas = qrRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `qr-${product?.product_name || 'product'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }, [product]);

  const handleDownloadFlyer = useCallback(async (template: 1 | 4 | 8) => {
    if (!product) return;
    setFlyerLoading(template);
    try {
      const orgId = searchParams.get('org');
      const orgParam = orgId ? `&org=${encodeURIComponent(orgId)}` : '';
      const res = await api.get(`/neture/store/product/${product.offer_id}/flyer?template=${template}${orgParam}`, {
        responseType: 'blob',
      });
      const blob = res.data as Blob;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `flyer-${product.product_name}-${template}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      // ignore
    } finally {
      setFlyerLoading(null);
    }
  }, [product, searchParams]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-6 bg-gray-200 rounded w-2/3 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
        </div>
      </div>
    );
  }

  // ── Not Found ──
  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Package size={32} className="text-gray-400" />
        </div>
        <p className="text-gray-600 font-medium mb-2">제품을 찾을 수 없습니다</p>
        <Link to="/" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const displayPrice = product.listing_price ?? product.price_general;
  const hasDiscount = product.consumer_reference_price && product.consumer_reference_price > displayPrice;
  const storeName = product.store_name || (storeSlug ? decodeURIComponent(storeSlug) : '매장');
  const pageUrl = window.location.href;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Back navigation */}
      <Link
        to="/store/cart"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        장바구니
      </Link>

      {/* ══════════════════════════════════════════
          Section 1: Hero — 상품 이미지 + 기본 정보
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-[400px] flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.product_name}
                className="w-full h-[300px] md:h-[400px] object-cover"
              />
            ) : (
              <div className="w-full h-[300px] md:h-[400px] bg-gray-100 flex items-center justify-center">
                <Package size={48} className="text-gray-300" />
              </div>
            )}
          </div>

          {/* Info + Price + Actions */}
          <div className="flex-1 p-6 md:p-8 flex flex-col">
            {/* Supplier */}
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
              {product.supplier_name}
            </p>

            {/* Product Name */}
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight mb-3">
              {product.display_name || product.product_name}
            </h1>

            {/* Meta */}
            <div className="space-y-1 mb-5">
              {product.brand_name && (
                <p className="text-sm text-gray-500">
                  브랜드: <span className="text-gray-700">{product.brand_name}</span>
                </p>
              )}
              {product.manufacturer_name && (
                <p className="text-sm text-gray-500">
                  제조사: <span className="text-gray-700">{product.manufacturer_name}</span>
                </p>
              )}
              {product.specification && (
                <p className="text-sm text-gray-500">
                  규격: <span className="text-gray-700">{product.specification}</span>
                </p>
              )}
            </div>

            {/* ══════════════════════════════════════
                Section 2: Price + 구매
            ══════════════════════════════════════ */}
            <div className="mt-auto">
              {/* Price */}
              <div className="mb-5">
                {hasDiscount && (
                  <p className="text-sm text-gray-400 line-through">
                    ₩{product.consumer_reference_price!.toLocaleString()}
                  </p>
                )}
                <p className="text-3xl font-bold text-gray-900">
                  ₩{displayPrice.toLocaleString()}
                </p>
              </div>

              {/* Quantity */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-sm text-gray-500">수량</span>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-10 text-center text-sm font-semibold text-gray-900">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(999, q + 1))}
                    className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-colors ${
                    added
                      ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                      : 'border-primary-600 text-primary-600 hover:bg-primary-50'
                  }`}
                >
                  <ShoppingCart size={18} />
                  {added ? '담겼습니다!' : '장바구니'}
                </button>
                <button
                  onClick={() => { handleAddToCart(); navigate('/store/cart'); }}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  바로 구매
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Section 3: 약사 코멘트
      ══════════════════════════════════════════ */}
      {product.pharmacist_comment && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">약사 추천</h2>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {product.pharmacist_comment}
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Section 4: 상품 설명
      ══════════════════════════════════════════ */}
      {product.description && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText size={16} className="text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">상품 설명</h2>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {product.description}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          Section 5: 매장 정보
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
            <Store size={16} className="text-purple-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">매장 정보</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">{storeName}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {product.store_address || '주소 정보가 등록되지 않았습니다'}
              </p>
            </div>
          </div>
          {product.store_phone && (
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-gray-400 flex-shrink-0" />
              <a href={`tel:${product.store_phone}`} className="text-sm text-primary-600 hover:text-primary-700">
                {product.store_phone}
              </a>
            </div>
          )}
          {product.store_hours && (
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-gray-400 flex-shrink-0" />
              <p className="text-sm text-gray-600">{product.store_hours}</p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Section 6: QR 코드 + 공유
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <QrCode size={16} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">QR 코드 & 공유</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-xl border border-gray-200">
              <QRCodeCanvas
                ref={qrRef}
                value={pageUrl}
                size={160}
                level="M"
                marginSize={2}
              />
            </div>
            <button
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              <Download size={14} />
              QR 다운로드
            </button>
          </div>

          {/* Share + Flyer Actions */}
          <div className="flex-1 flex flex-col gap-4 justify-center">
            <p className="text-sm text-gray-500">
              이 QR 코드를 스캔하면 이 상품 페이지로 바로 연결됩니다.
              매장 POP나 전단지에 활용하세요.
            </p>
            <button
              onClick={handleShare}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                shared
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Share2 size={16} />
              {shared ? '링크가 복사되었습니다!' : '이 상품 공유하기'}
            </button>

            {/* Flyer Templates */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                <Printer size={12} className="inline mr-1" />
                전단지 PDF 다운로드
              </p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { t: 1 as const, label: 'A4 1분할', desc: '카운터 POP' },
                  { t: 4 as const, label: 'A4 4분할', desc: '상품 전단' },
                  { t: 8 as const, label: 'A4 8분할', desc: 'QR 카드' },
                ] as const).map(({ t, label, desc }) => (
                  <button
                    key={t}
                    onClick={() => handleDownloadFlyer(t)}
                    disabled={flyerLoading !== null}
                    className="flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-center disabled:opacity-50"
                  >
                    <span className="text-xs font-semibold text-gray-800">
                      {flyerLoading === t ? '생성 중...' : label}
                    </span>
                    <span className="text-[10px] text-gray-400">{desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
