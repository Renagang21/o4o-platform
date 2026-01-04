/**
 * StoreHomePage - 판매자 매장 홈페이지
 * 기본 템플릿 (Default Template)
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface StoreInfo {
  id: string;
  name: string;
  description: string;
  logo?: string;
  banner?: string;
  categories: string[];
  rating: number;
  reviewCount: number;
  productCount: number;
  followerCount: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  category: string;
}

// 임시 데이터 - 실제로는 API에서 가져옴
const mockStore: StoreInfo = {
  id: 'demo-store',
  name: '뷰티코리아',
  description: 'K-뷰티 전문 스토어입니다. 최고의 품질, 합리적인 가격으로 만나보세요.',
  categories: ['스킨케어', '메이크업', '헤어케어', '바디케어'],
  rating: 4.8,
  reviewCount: 1234,
  productCount: 156,
  followerCount: 5678,
};

const mockProducts: Product[] = [
  { id: '1', name: 'K-뷰티 세럼 30ml', price: 35000, originalPrice: 45000, category: '스킨케어' },
  { id: '2', name: '수분 크림 50ml', price: 28000, category: '스킨케어' },
  { id: '3', name: '클렌징 폼 150ml', price: 18000, originalPrice: 22000, category: '스킨케어' },
  { id: '4', name: '마스크팩 10매', price: 15000, category: '스킨케어' },
  { id: '5', name: '립스틱 세트', price: 32000, category: '메이크업' },
  { id: '6', name: '아이섀도우 팔레트', price: 48000, originalPrice: 55000, category: '메이크업' },
];

export function StoreHomePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 실제로는 API 호출
    setTimeout(() => {
      setStore(mockStore);
      setProducts(mockProducts);
      setLoading(false);
    }, 300);
  }, [storeId]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p>매장 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div style={styles.errorContainer}>
        <h2>매장을 찾을 수 없습니다</h2>
        <p>요청하신 매장이 존재하지 않거나 비공개 상태입니다.</p>
        <Link to="/" style={styles.backLink}>홈으로 돌아가기</Link>
      </div>
    );
  }

  const filteredProducts = selectedCategory === '전체'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  const calcDiscount = (original: number, current: number) => {
    return Math.round(((original - current) / original) * 100);
  };

  return (
    <div style={styles.container}>
      {/* 배너 영역 */}
      <div style={styles.banner}>
        {store.banner ? (
          <img src={store.banner} alt="Store Banner" style={styles.bannerImage} />
        ) : (
          <div style={styles.bannerPlaceholder}>
            <span style={styles.bannerText}>{store.name}</span>
          </div>
        )}
      </div>

      {/* 스토어 정보 */}
      <div style={styles.storeInfo}>
        <div style={styles.storeHeader}>
          <div style={styles.storeLogo}>
            {store.logo ? (
              <img src={store.logo} alt={store.name} style={styles.logoImage} />
            ) : (
              <span style={styles.logoPlaceholder}>🏪</span>
            )}
          </div>
          <div style={styles.storeDetails}>
            <h1 style={styles.storeName}>{store.name}</h1>
            <p style={styles.storeDescription}>{store.description}</p>
            <div style={styles.storeStats}>
              <span style={styles.statItem}>
                <span style={styles.statIcon}>⭐</span>
                <span style={styles.statValue}>{store.rating}</span>
                <span style={styles.statLabel}>({store.reviewCount})</span>
              </span>
              <span style={styles.statDivider}>|</span>
              <span style={styles.statItem}>
                <span style={styles.statIcon}>📦</span>
                <span style={styles.statValue}>{store.productCount}</span>
                <span style={styles.statLabel}>상품</span>
              </span>
              <span style={styles.statDivider}>|</span>
              <span style={styles.statItem}>
                <span style={styles.statIcon}>❤️</span>
                <span style={styles.statValue}>{store.followerCount}</span>
                <span style={styles.statLabel}>팔로워</span>
              </span>
            </div>
          </div>
          <button style={styles.followButton}>팔로우</button>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div style={styles.categoryTabs}>
        <button
          style={{
            ...styles.categoryTab,
            ...(selectedCategory === '전체' ? styles.categoryTabActive : {}),
          }}
          onClick={() => setSelectedCategory('전체')}
        >
          전체
        </button>
        {store.categories.map(cat => (
          <button
            key={cat}
            style={{
              ...styles.categoryTab,
              ...(selectedCategory === cat ? styles.categoryTabActive : {}),
            }}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 상품 목록 */}
      <div style={styles.productGrid}>
        {filteredProducts.map(product => (
          <Link key={product.id} to={`/store/${storeId}/product/${product.id}`} style={styles.productCard}>
            <div style={styles.productThumbnail}>
              {product.thumbnail ? (
                <img src={product.thumbnail} alt={product.name} style={styles.thumbnailImage} />
              ) : (
                <div style={styles.thumbnailPlaceholder}>🛍️</div>
              )}
              {product.originalPrice && (
                <span style={styles.discountBadge}>
                  {calcDiscount(product.originalPrice, product.price)}%
                </span>
              )}
            </div>
            <div style={styles.productInfo}>
              <span style={styles.productCategory}>{product.category}</span>
              <h3 style={styles.productName}>{product.name}</h3>
              <div style={styles.productPrice}>
                <span style={styles.currentPrice}>{formatPrice(product.price)}원</span>
                {product.originalPrice && (
                  <span style={styles.originalPrice}>{formatPrice(product.originalPrice)}원</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div style={styles.emptyProducts}>
          <span style={styles.emptyIcon}>📦</span>
          <p style={styles.emptyText}>해당 카테고리에 상품이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 0 40px',
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
    animation: 'spin 1s linear infinite',
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
  banner: {
    width: '100%',
    height: '200px',
    backgroundColor: '#f1f5f9',
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, #1D4ED8 100%)`,
  },
  bannerText: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#fff',
  },
  storeInfo: {
    padding: '0 20px',
  },
  storeHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '20px',
    padding: '24px 0',
    borderBottom: '1px solid #e2e8f0',
  },
  storeLogo: {
    width: '80px',
    height: '80px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '-40px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    borderRadius: '12px',
  },
  logoPlaceholder: {
    fontSize: '36px',
  },
  storeDetails: {
    flex: 1,
  },
  storeName: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0F172A',
    margin: '0 0 8px',
  },
  storeDescription: {
    fontSize: '14px',
    color: '#64748B',
    margin: '0 0 12px',
    lineHeight: 1.5,
  },
  storeStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  statIcon: {
    fontSize: '14px',
  },
  statValue: {
    fontWeight: 600,
    color: '#0F172A',
  },
  statLabel: {
    color: '#64748B',
  },
  statDivider: {
    color: '#CBD5E1',
  },
  followButton: {
    padding: '10px 24px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  categoryTabs: {
    display: 'flex',
    gap: '8px',
    padding: '20px',
    overflowX: 'auto',
    borderBottom: '1px solid #e2e8f0',
  },
  categoryTab: {
    padding: '8px 16px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    fontSize: '14px',
    color: '#64748B',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  categoryTabActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
    color: '#fff',
  },
  productGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '20px',
    padding: '24px 20px',
  },
  productCard: {
    display: 'block',
    textDecoration: 'none',
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  productThumbnail: {
    position: 'relative',
    height: '200px',
    backgroundColor: '#f1f5f9',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  },
  discountBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    padding: '4px 8px',
    backgroundColor: '#DC2626',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '4px',
  },
  productInfo: {
    padding: '16px',
  },
  productCategory: {
    fontSize: '12px',
    color: '#64748B',
  },
  productName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0F172A',
    margin: '6px 0 10px',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  productPrice: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  currentPrice: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#0F172A',
  },
  originalPrice: {
    fontSize: '13px',
    color: '#94a3b8',
    textDecoration: 'line-through',
  },
  emptyProducts: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyText: {
    color: '#64748B',
  },
};
