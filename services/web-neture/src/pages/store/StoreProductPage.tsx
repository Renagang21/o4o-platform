/**
 * StoreProductPage - 판매자 매장 상품 상세 페이지
 * 기본 템플릿 (Default Template)
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface ProductDetail {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  images: string[];
  category: string;
  options: ProductOption[];
  stock: number;
  rating: number;
  reviewCount: number;
  storeId: string;
  storeName: string;
}

interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

// 임시 데이터
const mockProduct: ProductDetail = {
  id: '1',
  name: 'K-뷰티 하이드레이팅 세럼 30ml',
  price: 35000,
  originalPrice: 45000,
  description: `프리미엄 히알루론산과 비타민 복합체가 함유된 고보습 세럼입니다.

• 히알루론산 3중 복합체로 깊은 수분 공급
• 비타민 B5, B3 함유로 피부장벽 강화
• 산뜻한 제형으로 끈적임 없이 흡수
• 모든 피부 타입에 적합

사용방법:
세안 후 토너를 바른 뒤, 적당량을 덜어 얼굴 전체에 부드럽게 펴 발라주세요.`,
  images: [],
  category: '스킨케어',
  options: [
    { id: 'size', name: '용량', values: ['30ml', '50ml', '100ml'] },
  ],
  stock: 156,
  rating: 4.8,
  reviewCount: 234,
  storeId: 'demo-store',
  storeName: '뷰티코리아',
};

export function StoreProductPage() {
  const { storeId, productId } = useParams<{ storeId: string; productId: string }>();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    // 실제로는 API 호출
    setTimeout(() => {
      setProduct(mockProduct);
      // 기본 옵션 선택
      const defaultOptions: Record<string, string> = {};
      mockProduct.options.forEach(opt => {
        defaultOptions[opt.id] = opt.values[0];
      });
      setSelectedOptions(defaultOptions);
      setLoading(false);
    }, 300);
  }, [storeId, productId]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>상품 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={styles.errorContainer}>
        <h2>상품을 찾을 수 없습니다</h2>
        <Link to={`/store/${storeId}`} style={styles.backLink}>매장으로 돌아가기</Link>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const calcDiscount = (original: number, current: number) => {
    return Math.round(((original - current) / original) * 100);
  };

  const handleAddToCart = () => {
    alert(`장바구니에 추가되었습니다!\n수량: ${quantity}개`);
  };

  const handleBuyNow = () => {
    alert('구매 페이지로 이동합니다.');
  };

  return (
    <div style={styles.container}>
      {/* 브레드크럼 */}
      <div style={styles.breadcrumb}>
        <Link to="/" style={styles.breadcrumbLink}>홈</Link>
        <span style={styles.breadcrumbSep}>/</span>
        <Link to={`/store/${storeId}`} style={styles.breadcrumbLink}>{product.storeName}</Link>
        <span style={styles.breadcrumbSep}>/</span>
        <span style={styles.breadcrumbCurrent}>{product.name}</span>
      </div>

      <div style={styles.productWrapper}>
        {/* 상품 이미지 */}
        <div style={styles.imageSection}>
          <div style={styles.mainImage}>
            {product.images.length > 0 ? (
              <img src={product.images[0]} alt={product.name} style={styles.image} />
            ) : (
              <div style={styles.imagePlaceholder}>🛍️</div>
            )}
            {product.originalPrice && (
              <span style={styles.discountBadge}>
                {calcDiscount(product.originalPrice, product.price)}% OFF
              </span>
            )}
          </div>
        </div>

        {/* 상품 정보 */}
        <div style={styles.infoSection}>
          <Link to={`/store/${storeId}`} style={styles.storeName}>
            🏪 {product.storeName}
          </Link>

          <h1 style={styles.productName}>{product.name}</h1>

          <div style={styles.rating}>
            <span style={styles.ratingStars}>⭐ {product.rating}</span>
            <span style={styles.reviewCount}>({product.reviewCount} 리뷰)</span>
          </div>

          <div style={styles.priceSection}>
            {product.originalPrice && (
              <span style={styles.originalPrice}>{formatPrice(product.originalPrice)}원</span>
            )}
            <span style={styles.currentPrice}>{formatPrice(product.price)}원</span>
          </div>

          {/* 옵션 선택 */}
          {product.options.map(option => (
            <div key={option.id} style={styles.optionGroup}>
              <label style={styles.optionLabel}>{option.name}</label>
              <div style={styles.optionButtons}>
                {option.values.map(value => (
                  <button
                    key={value}
                    style={{
                      ...styles.optionButton,
                      ...(selectedOptions[option.id] === value ? styles.optionButtonActive : {}),
                    }}
                    onClick={() => setSelectedOptions(prev => ({ ...prev, [option.id]: value }))}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* 수량 선택 */}
          <div style={styles.quantitySection}>
            <label style={styles.optionLabel}>수량</label>
            <div style={styles.quantityControl}>
              <button
                style={styles.quantityButton}
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span style={styles.quantityValue}>{quantity}</span>
              <button
                style={styles.quantityButton}
                onClick={() => setQuantity(prev => prev + 1)}
                disabled={quantity >= product.stock}
              >
                +
              </button>
            </div>
            <span style={styles.stockInfo}>재고: {product.stock}개</span>
          </div>

          {/* 총 금액 */}
          <div style={styles.totalSection}>
            <span style={styles.totalLabel}>총 금액</span>
            <span style={styles.totalPrice}>{formatPrice(product.price * quantity)}원</span>
          </div>

          {/* 구매 버튼 */}
          <div style={styles.buttonGroup}>
            <button style={styles.cartButton} onClick={handleAddToCart}>
              🛒 장바구니
            </button>
            <button style={styles.buyButton} onClick={handleBuyNow}>
              바로구매
            </button>
          </div>
        </div>
      </div>

      {/* 상품 설명 */}
      <div style={styles.descriptionSection}>
        <h2 style={styles.sectionTitle}>상품 상세</h2>
        <div style={styles.description}>
          {product.description.split('\n').map((line, idx) => (
            <p key={idx} style={styles.descriptionLine}>{line || <br />}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    color: '#64748B',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: PRIMARY_COLOR,
    borderRadius: '50%',
    marginBottom: '16px',
  },
  errorContainer: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  backLink: {
    display: 'inline-block',
    marginTop: '20px',
    color: PRIMARY_COLOR,
    textDecoration: 'none',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  breadcrumbLink: {
    color: '#64748B',
    textDecoration: 'none',
  },
  breadcrumbSep: {
    color: '#CBD5E1',
  },
  breadcrumbCurrent: {
    color: '#0F172A',
    fontWeight: 500,
  },
  productWrapper: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '40px',
    marginBottom: '40px',
  },
  imageSection: {},
  mainImage: {
    position: 'relative',
    aspectRatio: '1',
    backgroundColor: '#f1f5f9',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '80px',
  },
  discountBadge: {
    position: 'absolute',
    top: '16px',
    left: '16px',
    padding: '6px 12px',
    backgroundColor: '#DC2626',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '4px',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
  },
  storeName: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#64748B',
    textDecoration: 'none',
    marginBottom: '12px',
  },
  productName: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0F172A',
    margin: '0 0 12px',
    lineHeight: 1.3,
  },
  rating: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  ratingStars: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#F59E0B',
  },
  reviewCount: {
    fontSize: '14px',
    color: '#64748B',
  },
  priceSection: {
    marginBottom: '24px',
  },
  originalPrice: {
    display: 'block',
    fontSize: '16px',
    color: '#94a3b8',
    textDecoration: 'line-through',
    marginBottom: '4px',
  },
  currentPrice: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#0F172A',
  },
  optionGroup: {
    marginBottom: '20px',
  },
  optionLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0F172A',
    marginBottom: '8px',
  },
  optionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  optionButton: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#64748B',
    cursor: 'pointer',
  },
  optionButtonActive: {
    borderColor: PRIMARY_COLOR,
    color: PRIMARY_COLOR,
    fontWeight: 600,
  },
  quantitySection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  quantityControl: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  quantityButton: {
    width: '40px',
    height: '40px',
    backgroundColor: '#f8fafc',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
  },
  quantityValue: {
    width: '50px',
    textAlign: 'center',
    fontSize: '16px',
    fontWeight: 600,
  },
  stockInfo: {
    fontSize: '13px',
    color: '#64748B',
  },
  totalSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 0',
    borderTop: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '24px',
  },
  totalLabel: {
    fontSize: '16px',
    color: '#64748B',
  },
  totalPrice: {
    fontSize: '28px',
    fontWeight: 700,
    color: PRIMARY_COLOR,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
  },
  cartButton: {
    flex: 1,
    padding: '16px 24px',
    backgroundColor: '#fff',
    border: `2px solid ${PRIMARY_COLOR}`,
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    color: PRIMARY_COLOR,
    cursor: 'pointer',
  },
  buyButton: {
    flex: 1,
    padding: '16px 24px',
    backgroundColor: PRIMARY_COLOR,
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
  },
  descriptionSection: {
    padding: '40px 0',
    borderTop: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0F172A',
    marginBottom: '24px',
  },
  description: {
    fontSize: '15px',
    color: '#374151',
    lineHeight: 1.8,
  },
  descriptionLine: {
    margin: 0,
  },
};
