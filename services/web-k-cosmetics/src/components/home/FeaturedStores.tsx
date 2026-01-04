/**
 * FeaturedStores - 추천 매장 섹션
 * WO-KCOS-HOME-UI-V1
 *
 * 주의: 가격/장바구니/구매 CTA 금지
 */

import { Link } from 'react-router-dom';
import { Store, SERVICE_TAG_LABELS_KO } from '../../types';

// 샘플 데이터 (추후 API 연동)
const sampleStores: Store[] = [
  {
    id: '1',
    slug: 'beauty-lab-gangnam',
    name: '뷰티랩 강남점',
    location: '서울 강남구',
    address: '서울시 강남구 테헤란로 123',
    isVerified: true,
    serviceTags: ['english_ok', 'try_on'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '2',
    slug: 'kbeauty-store-myeongdong',
    name: 'K뷰티스토어 명동점',
    location: '서울 중구',
    address: '서울시 중구 명동길 45',
    isVerified: true,
    serviceTags: ['english_ok', 'group_friendly', 'japanese_ok'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '3',
    slug: 'cosme-house-busan',
    name: '코스메하우스 부산점',
    location: '부산 해운대구',
    address: '부산시 해운대구 해운대로 567',
    isVerified: true,
    serviceTags: ['try_on', 'guide_partner'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '4',
    slug: 'jeju-beauty-jeju',
    name: '제주뷰티 본점',
    location: '제주 제주시',
    address: '제주시 연동 789',
    isVerified: true,
    serviceTags: ['english_ok', 'chinese_ok', 'group_friendly'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

export function FeaturedStores() {
  return (
    <section style={styles.section}>
      <div style={styles.container}>
        <h2 style={styles.sectionTitle}>검증된 파트너 매장</h2>
        <p style={styles.sectionDesc}>
          플랫폼 기준을 충족한 매장들을 만나보세요
        </p>

        <div style={styles.grid}>
          {sampleStores.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>

        <div style={styles.viewAll}>
          <Link to="/stores" style={styles.viewAllButton}>
            전체 매장 보기 →
          </Link>
        </div>
      </div>
    </section>
  );
}

function StoreCard({ store }: { store: Store }) {
  return (
    <div style={styles.card}>
      {/* 로고/이미지 영역 */}
      <div style={styles.cardImage}>
        <span style={styles.placeholderIcon}>🏪</span>
      </div>

      {/* 정보 영역 */}
      <div style={styles.cardContent}>
        <h3 style={styles.storeName}>{store.name}</h3>
        <p style={styles.storeLocation}>{store.location}</p>

        {/* Verified 배지 */}
        {store.isVerified && (
          <div style={styles.verifiedBadge}>
            <span style={styles.verifiedIcon}>✓</span>
            <span>Verified</span>
          </div>
        )}

        {/* 서비스 태그 */}
        <div style={styles.tags}>
          {store.serviceTags.slice(0, 2).map((tag) => (
            <span key={tag} style={styles.tag}>
              {SERVICE_TAG_LABELS_KO[tag]}
            </span>
          ))}
        </div>

        {/* CTA: View Store만 허용 */}
        <Link to={`/stores/${store.slug}`} style={styles.viewButton}>
          매장 보기
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#f8f9fa',
    padding: '64px 24px',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 8px 0',
    textAlign: 'center',
  },
  sectionDesc: {
    fontSize: '15px',
    color: '#666',
    margin: '0 0 40px 0',
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e9ecef',
    transition: 'box-shadow 0.2s',
  },
  cardImage: {
    height: '120px',
    backgroundColor: '#f1f3f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: '48px',
    opacity: 0.5,
  },
  cardContent: {
    padding: '16px',
  },
  storeName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 4px 0',
  },
  storeLocation: {
    fontSize: '13px',
    color: '#666',
    margin: '0 0 12px 0',
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#2e7d32',
    backgroundColor: '#e8f5e9',
    padding: '4px 8px',
    borderRadius: '4px',
    marginBottom: '12px',
  },
  verifiedIcon: {
    fontWeight: 700,
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '16px',
  },
  tag: {
    fontSize: '11px',
    color: '#495057',
    backgroundColor: '#f1f3f5',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  viewButton: {
    display: 'block',
    width: '100%',
    padding: '10px',
    textAlign: 'center',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
  },
  viewAll: {
    textAlign: 'center',
    marginTop: '40px',
  },
  viewAllButton: {
    display: 'inline-block',
    padding: '12px 32px',
    backgroundColor: 'transparent',
    color: '#1a1a1a',
    textDecoration: 'none',
    border: '2px solid #1a1a1a',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    transition: 'background-color 0.2s, color 0.2s',
  },
};
