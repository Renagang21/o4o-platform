/**
 * StoreProductPage - 매장 상품 상세 (공통 랜딩 페이지)
 *
 * Work Order: WO-O4O-STORE-PRODUCT-PAGE-V1
 *
 * Routes:
 * - /store/:storeSlug/product/:productSlug (V2 slug-based)
 * - /store/product/:offerId (V1 backward compat)
 *
 * 구조:
 * 1. Hero — 상품 이미지 + 상품명 + 브랜드
 * 2. Price — 매장 가격 + 구매 버튼
 * 3. Pharmacist Comment — 약사 코멘트 (StoreProductProfile)
 * 4. Description — 상품 설명 (SupplierProductOffer)
 * 5. Store Info — 매장 정보
 * 6. QR Share — QR 공유
 *
 * 유입 경로: QR / Tablet / 전자상거래 목록 / 검색 / 외부 링크
 * ?ref=TOKEN 파라미터 캡처 → sessionStorage
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { API_BASE_URL, fetchWithTimeout } from '../../lib/api/index.js';
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
  // Extended fields (from StoreProductProfile / Offer)
  display_name?: string | null;
  pharmacist_comment?: string | null;
  description?: string | null;
  short_description?: string | null;
  // Store info
  store_name?: string | null;
  store_address?: string | null;
  store_phone?: string | null;
  store_hours?: string | null;
  // Listing override
  listing_price?: number | null;
}

// ── Mock fallbacks for fields not yet returned by API ──

const MOCK_PHARMACIST_COMMENT = '이 제품은 일상적인 건강 관리에 적합합니다. 식후에 1정씩 복용하시고, 다른 약물과 함께 복용 시 약사에게 상담해 주세요.';
const MOCK_DESCRIPTION = '본 제품은 엄격한 품질 관리 기준에 따라 제조되었으며, 식약처 기준을 충족합니다. 개봉 후에는 서늘하고 건조한 곳에 보관해 주세요.';

export default function StoreProductPage() {
  const { offerId, storeSlug, productSlug } = useParams<{
    offerId?: string;
    storeSlug?: string;
    productSlug?: string;
  }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    captureReferralToken();
  }, []);

  useEffect(() => {
    let url: string | null = null;
    if (storeSlug && productSlug) {
      url = `${API_BASE_URL}/api/v1/neture/store/${storeSlug}/product/${productSlug}`;
    } else if (offerId) {
      url = `${API_BASE_URL}/api/v1/neture/store/product/${offerId}`;
    }
    if (!url) { setLoading(false); return; }

    (async () => {
      try {
        const res = await fetchWithTimeout(url!);
        if (res.ok) {
          const result = await res.json();
          setProduct(result.data || null);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [offerId, storeSlug, productSlug]);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      offerId: product.offer_id,
      name: product.product_name,
      imageUrl: product.image_url,
      priceGeneral: displayPrice,
      supplierId: product.offer_id,
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
  const pharmacistComment = product.pharmacist_comment || MOCK_PHARMACIST_COMMENT;
  const description = product.description || MOCK_DESCRIPTION;
  const storeName = product.store_name || (storeSlug ? decodeURIComponent(storeSlug) : '매장');

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
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <MessageSquare size={16} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">약사 추천</h2>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {pharmacistComment}
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Section 4: 상품 설명
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText size={16} className="text-blue-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">상품 설명</h2>
        </div>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {description}
        </div>
      </div>

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
          Section 6: QR 공유
      ══════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
            <QrCode size={16} className="text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">공유</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
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
        </div>
      </div>
    </div>
  );
}
