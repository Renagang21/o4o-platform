/**
 * CategoryListPage - 카테고리별 상품 목록
 * 접근 불가 상품은 잠금 표시
 */

import { Link, useParams } from 'react-router-dom';
import type { Product, BuyerStatus, BuyerType } from '../../types';

// Mock 데이터
const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: '기초 보습 크림 (업소용)',
    description: '대용량 보습 크림 500ml',
    categoryId: 'cosmetics',
    supplierId: 'sup-1',
    supplierName: '코스메틱팜',
    requiredBuyerTypes: ['general', 'pharmacy', 'medical'],
    taxType: 'taxable',
    minOrderQty: 10,
    unit: '개',
    contentIds: [],
    serviceDistribution: true,
    hasActiveContentEvent: true,
  },
  {
    id: 'prod-2',
    name: '기능성 세럼 (B2B)',
    description: '미백/주름개선 기능성 세럼',
    categoryId: 'cosmetics',
    supplierId: 'sup-1',
    supplierName: '코스메틱팜',
    requiredBuyerTypes: ['general', 'pharmacy', 'medical'],
    taxType: 'taxable',
    minOrderQty: 20,
    unit: '개',
    contentIds: [],
    serviceDistribution: true,
    hasActiveContentEvent: false,
  },
  {
    id: 'prod-3',
    name: '일반의약품 A',
    description: '약국 전용 일반의약품',
    categoryId: 'pharmacy',
    supplierId: 'sup-2',
    supplierName: '제약유통',
    requiredBuyerTypes: ['pharmacy'],
    taxType: 'exempt',
    minOrderQty: 5,
    unit: '박스',
    contentIds: [],
    serviceDistribution: true,
    hasActiveContentEvent: false,
  },
];

const categoryNames: Record<string, string> = {
  cosmetics: '화장품',
  pharmacy: '약국제품',
  supplies: '사업자 공통',
};

// Mock 구매자 상태
const mockBuyerStatus: BuyerStatus = 'verified';
const mockBuyerType: BuyerType = 'general';

interface ProductCardProps {
  product: Product;
  buyerStatus: BuyerStatus;
  buyerType: BuyerType;
}

function ProductCard({ product, buyerStatus, buyerType }: ProductCardProps) {
  const isVerified = buyerStatus === 'verified';
  const hasAccess = product.requiredBuyerTypes.includes(buyerType);
  const canAccess = isVerified && hasAccess;

  const getLockReason = () => {
    if (!isVerified) return '사업자 인증 필요';
    if (!hasAccess) {
      if (product.requiredBuyerTypes.includes('pharmacy')) {
        return '약국 인증 필요';
      }
      return '접근 권한 없음';
    }
    return '';
  };

  return (
    <div style={styles.productCard}>
      <div style={styles.productInfo}>
        <div style={styles.productNameRow}>
          <h3 style={styles.productName}>{product.name}</h3>
          {product.hasActiveContentEvent && (
            <span style={styles.contentEventIcon} title="현재 해당 상품과 연관된 콘텐츠 이벤트가 진행 중입니다.">
              📘
            </span>
          )}
        </div>
        <p style={styles.productDesc}>{product.description}</p>
        <p style={styles.supplierName}>공급: {product.supplierName}</p>
        <p style={styles.orderInfo}>
          최소 주문: {product.minOrderQty}{product.unit}
        </p>
      </div>
      <div style={styles.productAction}>
        {canAccess ? (
          <Link
            to={`/procurement/product/${product.id}`}
            style={styles.viewButton}
          >
            상세 보기
          </Link>
        ) : (
          <div style={styles.lockInfo}>
            <span style={styles.lockIcon}>🔒</span>
            <span style={styles.lockText}>{getLockReason()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryListPage() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const categoryName = categoryNames[categoryId || ''] || '카테고리';

  const filteredProducts = mockProducts.filter(
    (p) => p.categoryId === categoryId
  );

  return (
    <div style={styles.container}>
      {/* B2B 인지 라벨 */}
      <div style={styles.b2bBanner}>
        <span style={styles.b2bLabel}>B2B 조달 상품</span>
        <span style={styles.b2bNote}>서비스 주문과는 별도로 처리됩니다.</span>
      </div>

      <div style={styles.header}>
        <Link to="/procurement" style={styles.backLink}>
          ← B2B 조달
        </Link>
        <h1 style={styles.title}>{categoryName}</h1>
        <p style={styles.subtitle}>
          {filteredProducts.length}개 상품
        </p>
      </div>

      <div style={styles.productList}>
        {filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              buyerStatus={mockBuyerStatus}
              buyerType={mockBuyerType}
            />
          ))
        ) : (
          <div style={styles.emptyState}>
            <p>현재 표시할 정보가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  b2bBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#eef2ff',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  b2bLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#4f46e5',
    padding: '4px 10px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    border: '1px solid #c7d2fe',
  },
  b2bNote: {
    fontSize: '13px',
    color: '#6366f1',
  },
  header: {
    marginBottom: '32px',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '12px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  productCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  productInfo: {
    flex: 1,
  },
  productNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  productName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
  },
  contentEventIcon: {
    fontSize: '16px',
    cursor: 'help',
  },
  productDesc: {
    fontSize: '14px',
    color: '#475569',
    margin: '0 0 8px 0',
  },
  supplierName: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 4px 0',
  },
  orderInfo: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
  productAction: {
    marginLeft: '20px',
  },
  viewButton: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '6px',
    textDecoration: 'none',
  },
  lockInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 16px',
    backgroundColor: '#FEF3C7',
    borderRadius: '6px',
  },
  lockIcon: {
    fontSize: '14px',
  },
  lockText: {
    fontSize: '13px',
    color: '#92400E',
  },
  emptyState: {
    padding: '60px 20px',
    textAlign: 'center',
    color: '#64748b',
  },
};
