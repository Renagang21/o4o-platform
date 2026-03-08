/**
 * StoreProductPage - 매장 제품 상세
 *
 * Work Order: WO-O4O-PARTNER-HUB-CORE-V2
 *
 * Routes:
 * - /store/:storeSlug/product/:productSlug (V2 slug-based)
 * - /store/product/:offerId (V1 backward compat)
 *
 * - 제품 정보 표시
 * - 장바구니 담기
 * - ?ref=TOKEN 파라미터 캡처 → sessionStorage
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Package } from 'lucide-react';
import { API_BASE_URL, fetchWithTimeout } from '../../lib/api/index.js';
import { addToCart } from '../../lib/cart.js';
import { captureReferralToken } from '../../lib/referral.js';

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
}

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

  useEffect(() => {
    captureReferralToken();
  }, []);

  useEffect(() => {
    let url: string | null = null;
    if (storeSlug && productSlug) {
      // V2 slug-based route
      url = `${API_BASE_URL}/api/v1/neture/store/${storeSlug}/product/${productSlug}`;
    } else if (offerId) {
      // V1 UUID-based route (backward compat)
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
      priceGeneral: product.price_general,
      supplierId: product.offer_id, // use offer context
      supplierName: product.supplier_name,
    }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loadingText}>불러오는 중...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={styles.container}>
        <p style={styles.loadingText}>제품을 찾을 수 없습니다.</p>
        <Link to="/store/cart" style={styles.backLink}>
          <ArrowLeft size={16} /> 장바구니로 이동
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Link to="/store/cart" style={styles.backLink}>
        <ArrowLeft size={16} /> 장바구니
      </Link>

      <div style={styles.productCard}>
        {/* Image */}
        <div style={styles.imageSection}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.product_name} style={styles.image} />
          ) : (
            <div style={styles.imagePlaceholder}>
              <Package size={48} style={{ color: '#94a3b8' }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={styles.infoSection}>
          <p style={styles.supplierName}>{product.supplier_name}</p>
          <h1 style={styles.productName}>{product.product_name}</h1>

          {product.brand_name && (
            <p style={styles.meta}>브랜드: {product.brand_name}</p>
          )}
          {product.manufacturer_name && (
            <p style={styles.meta}>제조사: {product.manufacturer_name}</p>
          )}
          {product.specification && (
            <p style={styles.meta}>규격: {product.specification}</p>
          )}

          {product.consumer_reference_price && product.consumer_reference_price > product.price_general && (
            <p style={styles.refPrice}>소비자가 ₩{product.consumer_reference_price.toLocaleString()}</p>
          )}
          <p style={styles.price}>₩{product.price_general.toLocaleString()}</p>

          {/* Quantity */}
          <div style={styles.qtyRow}>
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              style={styles.qtyBtn}
            >
              -
            </button>
            <span style={styles.qtyValue}>{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(1000, q + 1))}
              style={styles.qtyBtn}
            >
              +
            </button>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button onClick={handleAddToCart} style={styles.addBtn}>
              <ShoppingCart size={18} />
              {added ? '담겼습니다!' : '장바구니 담기'}
            </button>
            <button onClick={() => { handleAddToCart(); navigate('/store/cart'); }} style={styles.buyBtn}>
              바로 구매
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  loadingText: {
    textAlign: 'center' as const,
    color: '#64748b',
    padding: '60px 0',
    fontSize: '14px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '24px',
  },
  productCard: {
    display: 'flex',
    gap: '32px',
    backgroundColor: '#fff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    flexWrap: 'wrap' as const,
  },
  imageSection: {
    flex: '0 0 320px',
    maxWidth: '320px',
  },
  image: {
    width: '100%',
    borderRadius: '12px',
    objectFit: 'cover' as const,
  },
  imagePlaceholder: {
    width: '100%',
    height: '320px',
    borderRadius: '12px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    flex: 1,
    minWidth: '240px',
  },
  supplierName: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  productName: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 12px 0',
    lineHeight: 1.3,
  },
  meta: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 4px 0',
  },
  refPrice: {
    fontSize: '14px',
    color: '#94a3b8',
    textDecoration: 'line-through',
    margin: '16px 0 4px 0',
  },
  price: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '4px 0 20px 0',
  },
  qtyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  qtyBtn: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    backgroundColor: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    minWidth: '32px',
    textAlign: 'center' as const,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '10px',
    border: '1px solid #2563eb',
    backgroundColor: '#fff',
    color: '#2563eb',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  buyBtn: {
    padding: '12px 24px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
