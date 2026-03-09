/**
 * StorefrontProductDetailPage — Public Product Detail
 *
 * WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1
 *
 * 경로: /store/:slug/products/:id
 * 공개 페이지 — 인증 불필요
 *
 * API: GET /api/v1/stores/:slug/products/:id (이미 구현됨)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Plus, Minus } from 'lucide-react';
import * as cartService from '../../services/cartService';
import { extractReferralFromUrl, saveReferralCookie } from '../../utils/referral';

// ============================================================================
// Types
// ============================================================================

interface ProductDetail {
  id: string;
  name: string;
  description?: string;
  category?: string;
  manufacturer?: string;
  barcode?: string;
  price?: number;
  salePrice?: number;
  imageUrl?: string;
  supplierName?: string;
}

// ============================================================================
// API
// ============================================================================

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return `${base}/api/v1/stores`;
}

async function fetchProduct(slug: string, productId: string): Promise<ProductDetail | null> {
  const res = await fetch(`${getApiBase()}/${encodeURIComponent(slug)}/products/${productId}`);
  const json = await res.json();
  if (!json.success || !json.data || json.data.length === 0) return null;
  // The products endpoint returns an array; take first item
  const p = Array.isArray(json.data) ? json.data[0] : json.data;
  return {
    id: p.id,
    name: p.name || p.productName || '상품',
    description: p.description,
    category: p.category,
    manufacturer: p.manufacturer || p.manufacturerName,
    barcode: p.barcode,
    price: p.price != null ? Number(p.price) : undefined,
    salePrice: p.salePrice != null ? Number(p.salePrice) : (p.sale_price != null ? Number(p.sale_price) : undefined),
    imageUrl: p.imageUrl || p.image_url,
    supplierName: p.supplierName || p.supplier_name,
  };
}

// ============================================================================
// Component
// ============================================================================

export function StorefrontProductDetailPage() {
  const { slug, id } = useParams<{ slug: string; id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // WO-O4O-REFERRAL-ATTRIBUTION-V1: ref 파라미터 → cookie 저장
  useEffect(() => {
    const referral = extractReferralFromUrl();
    if (referral) saveReferralCookie(referral);
  }, []);

  useEffect(() => {
    if (!slug || !id) return;
    setLoading(true);
    fetchProduct(slug, id)
      .then((p) => {
        if (!p) setError('상품을 찾을 수 없습니다.');
        else setProduct(p);
      })
      .catch(() => setError('상품 정보를 불러오는 데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [slug, id]);

  useEffect(() => {
    if (slug) setCartCount(cartService.getCartItemCount(slug));
  }, [slug, addedToCart]);

  const handleAddToCart = () => {
    if (!slug || !product) return;
    const price = product.salePrice ?? product.price ?? 0;
    cartService.addItem(slug, {
      productId: product.id,
      productName: product.name,
      unitPrice: price,
      imageUrl: product.imageUrl,
    }, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const displayPrice = product ? (product.salePrice ?? product.price) : null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#94a3b8', fontSize: '15px' }}>불러오는 중...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>상품을 찾을 수 없습니다</h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>{error || '존재하지 않는 상품입니다.'}</p>
          <Link to={`/store/${slug}`} style={{ color: '#2563eb', fontSize: '14px', textDecoration: 'none' }}>매장으로 돌아가기</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => navigate(`/store/${slug}`)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#1e293b', fontSize: '15px', fontWeight: 600, padding: 0 }}
          >
            <ArrowLeft size={20} />
            매장으로
          </button>
          <button
            onClick={() => navigate(`/store/${slug}/checkout`)}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
          >
            <ShoppingCart size={22} color="#1e293b" />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '2px',
                backgroundColor: '#2563eb', color: '#fff', fontSize: '11px', fontWeight: 700,
                width: '18px', height: '18px', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Product Image */}
        {product.imageUrl ? (
          <div style={{ width: '100%', aspectRatio: '1', backgroundColor: '#fff', overflow: 'hidden' }}>
            <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#94a3b8', fontSize: '48px' }}>📦</span>
          </div>
        )}

        {/* Product Info */}
        <div style={{ padding: '20px 16px' }}>
          {product.category && (
            <span style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
              {product.category}
            </span>
          )}
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: '8px 0 4px' }}>{product.name}</h1>
          {product.manufacturer && (
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '4px' }}>{product.manufacturer}</p>
          )}
          {product.supplierName && (
            <p style={{ fontSize: '13px', color: '#94a3b8' }}>공급: {product.supplierName}</p>
          )}

          {/* Price */}
          {displayPrice != null && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              {product.salePrice != null && product.price != null && product.salePrice < product.price && (
                <span style={{ fontSize: '14px', color: '#94a3b8', textDecoration: 'line-through', marginRight: '8px' }}>
                  {product.price.toLocaleString()}원
                </span>
              )}
              <span style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                {displayPrice.toLocaleString()}원
              </span>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>상품 설명</h3>
              <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{product.description}</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Bar — Add to Cart */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        backgroundColor: '#fff', borderTop: '1px solid #e2e8f0', padding: '12px 16px',
      }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Quantity */}
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#f8fafc', cursor: 'pointer' }}
            >
              <Minus size={16} color="#64748b" />
            </button>
            <span style={{ width: '40px', textAlign: 'center', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: '#f8fafc', cursor: 'pointer' }}
            >
              <Plus size={16} color="#64748b" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            style={{
              flex: 1, height: '44px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontSize: '15px', fontWeight: 600, color: '#fff',
              backgroundColor: addedToCart ? '#059669' : '#2563eb',
              transition: 'background-color 0.2s',
            }}
          >
            {addedToCart ? '담았습니다!' : `장바구니 담기${displayPrice != null ? ` · ${(displayPrice * quantity).toLocaleString()}원` : ''}`}
          </button>
        </div>
      </div>

      {/* Spacer for bottom bar */}
      <div style={{ height: '68px' }} />
    </div>
  );
}

export default StorefrontProductDetailPage;
