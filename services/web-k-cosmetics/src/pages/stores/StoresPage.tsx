/**
 * StoresPage - 매장 디렉토리
 * WO-KCOS-HOME-UI-V1
 *
 * 성격: 소비자(관광객 + 일부 국내 사용자) 대상
 * 언어: 기본 영어, 다국어 스위치 제공
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, ServiceTag, SERVICE_TAG_LABELS_EN, SERVICE_TAG_LABELS_KO } from '../../types';

// 샘플 데이터
const sampleStores: Store[] = [
  {
    id: '1',
    slug: 'beauty-lab-gangnam',
    name: '뷰티랩 강남점',
    nameEn: 'Beauty Lab Gangnam',
    location: '서울 강남구',
    locationEn: 'Gangnam, Seoul',
    address: '서울시 강남구 테헤란로 123',
    addressEn: '123 Teheran-ro, Gangnam-gu, Seoul',
    isVerified: true,
    serviceTags: ['english_ok', 'try_on', 'group_friendly'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '2',
    slug: 'kbeauty-store-myeongdong',
    name: 'K뷰티스토어 명동점',
    nameEn: 'K-Beauty Store Myeongdong',
    location: '서울 중구',
    locationEn: 'Myeongdong, Seoul',
    address: '서울시 중구 명동길 45',
    addressEn: '45 Myeongdong-gil, Jung-gu, Seoul',
    isVerified: true,
    serviceTags: ['english_ok', 'group_friendly', 'japanese_ok', 'chinese_ok'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '3',
    slug: 'cosme-house-busan',
    name: '코스메하우스 부산점',
    nameEn: 'Cosme House Busan',
    location: '부산 해운대구',
    locationEn: 'Haeundae, Busan',
    address: '부산시 해운대구 해운대로 567',
    addressEn: '567 Haeundae-ro, Haeundae-gu, Busan',
    isVerified: true,
    serviceTags: ['try_on', 'guide_partner', 'english_ok'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '4',
    slug: 'jeju-beauty-jeju',
    name: '제주뷰티 본점',
    nameEn: 'Jeju Beauty Main Store',
    location: '제주 제주시',
    locationEn: 'Jeju City, Jeju',
    address: '제주시 연동 789',
    addressEn: '789 Yeondong, Jeju City, Jeju',
    isVerified: true,
    serviceTags: ['english_ok', 'chinese_ok', 'group_friendly', 'try_on'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '5',
    slug: 'incheon-duty-free',
    name: '인천공항 뷰티존',
    nameEn: 'Incheon Airport Beauty Zone',
    location: '인천 중구',
    locationEn: 'Incheon Airport',
    address: '인천시 중구 공항로 272',
    addressEn: '272 Gonghang-ro, Jung-gu, Incheon',
    isVerified: true,
    serviceTags: ['english_ok', 'japanese_ok', 'chinese_ok', 'group_friendly'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '6',
    slug: 'daegu-skin-care',
    name: '대구스킨케어 본점',
    nameEn: 'Daegu Skincare Main',
    location: '대구 중구',
    locationEn: 'Jung-gu, Daegu',
    address: '대구시 중구 동성로 234',
    addressEn: '234 Dongseong-ro, Jung-gu, Daegu',
    isVerified: true,
    serviceTags: ['try_on', 'english_ok'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
];

type Language = 'en' | 'ko';

const regions = [
  { value: '', labelEn: 'All Regions', labelKo: '전체 지역' },
  { value: 'seoul', labelEn: 'Seoul', labelKo: '서울' },
  { value: 'busan', labelEn: 'Busan', labelKo: '부산' },
  { value: 'jeju', labelEn: 'Jeju', labelKo: '제주' },
  { value: 'incheon', labelEn: 'Incheon', labelKo: '인천' },
  { value: 'daegu', labelEn: 'Daegu', labelKo: '대구' },
];

export function StoresPage() {
  const [lang, setLang] = useState<Language>('en');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedTag, setSelectedTag] = useState<ServiceTag | ''>('');

  const tagLabels = lang === 'en' ? SERVICE_TAG_LABELS_EN : SERVICE_TAG_LABELS_KO;

  const filteredStores = sampleStores.filter((store) => {
    if (selectedRegion) {
      const locationLower = store.locationEn?.toLowerCase() || store.location.toLowerCase();
      if (!locationLower.includes(selectedRegion)) return false;
    }
    if (selectedTag && !store.serviceTags.includes(selectedTag)) {
      return false;
    }
    return true;
  });

  return (
    <div style={styles.page}>
      {/* 페이지 헤더 */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>
            {lang === 'en' ? 'Find Verified Stores' : '검증된 매장 찾기'}
          </h1>
          <p style={styles.subtitle}>
            {lang === 'en'
              ? 'Discover trusted K-Cosmetics partner stores across Korea'
              : '전국의 검증된 K-Cosmetics 파트너 매장을 찾아보세요'}
          </p>

          {/* 언어 스위치 */}
          <div style={styles.langSwitch}>
            <button
              style={{
                ...styles.langButton,
                ...(lang === 'en' ? styles.langButtonActive : {}),
              }}
              onClick={() => setLang('en')}
            >
              EN
            </button>
            <button
              style={{
                ...styles.langButton,
                ...(lang === 'ko' ? styles.langButtonActive : {}),
              }}
              onClick={() => setLang('ko')}
            >
              KO
            </button>
          </div>
        </div>
      </div>

      {/* 필터 바 */}
      <div style={styles.filterBar}>
        <div style={styles.filterContent}>
          <select
            style={styles.select}
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            {regions.map((r) => (
              <option key={r.value} value={r.value}>
                {lang === 'en' ? r.labelEn : r.labelKo}
              </option>
            ))}
          </select>

          <select
            style={styles.select}
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value as ServiceTag | '')}
          >
            <option value="">
              {lang === 'en' ? 'All Services' : '전체 서비스'}
            </option>
            {Object.entries(tagLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <span style={styles.resultCount}>
            {filteredStores.length} {lang === 'en' ? 'stores' : '개 매장'}
          </span>
        </div>
      </div>

      {/* 매장 그리드 */}
      <div style={styles.container}>
        <div style={styles.grid}>
          {filteredStores.map((store) => (
            <StoreCard key={store.id} store={store} lang={lang} tagLabels={tagLabels} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface StoreCardProps {
  store: Store;
  lang: Language;
  tagLabels: Record<ServiceTag, string>;
}

function StoreCard({ store, lang, tagLabels }: StoreCardProps) {
  const name = lang === 'en' && store.nameEn ? store.nameEn : store.name;
  const location = lang === 'en' && store.locationEn ? store.locationEn : store.location;

  return (
    <div style={styles.card}>
      <div style={styles.cardImage}>
        <span style={styles.placeholderIcon}>🏪</span>
      </div>

      <div style={styles.cardContent}>
        <h3 style={styles.storeName}>{name}</h3>
        <p style={styles.storeLocation}>{location}</p>

        {store.isVerified && (
          <div style={styles.verifiedBadge}>
            <span style={styles.verifiedIcon}>✓</span>
            <span>Verified</span>
          </div>
        )}

        <div style={styles.tags}>
          {store.serviceTags.slice(0, 3).map((tag) => (
            <span key={tag} style={styles.tag}>
              {tagLabels[tag]}
            </span>
          ))}
        </div>

        <Link to={`/stores/${store.slug}`} style={styles.viewButton}>
          {lang === 'en' ? 'View Store' : '매장 보기'}
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '48px 24px',
    textAlign: 'center',
  },
  headerContent: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: '#aaa',
    margin: '0 0 24px 0',
  },
  langSwitch: {
    display: 'inline-flex',
    gap: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: '4px',
    borderRadius: '8px',
  },
  langButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#aaa',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  langButtonActive: {
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  filterBar: {
    backgroundColor: '#fff',
    borderBottom: '1px solid #e9ecef',
    padding: '16px 24px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  filterContent: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  select: {
    padding: '10px 16px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    minWidth: '150px',
  },
  resultCount: {
    fontSize: '14px',
    color: '#666',
    marginLeft: 'auto',
  },
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
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
    height: '140px',
    backgroundColor: '#f1f3f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: '56px',
    opacity: 0.5,
  },
  cardContent: {
    padding: '20px',
  },
  storeName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 4px 0',
  },
  storeLocation: {
    fontSize: '14px',
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
    padding: '4px 10px',
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
    padding: '4px 10px',
    borderRadius: '4px',
  },
  viewButton: {
    display: 'block',
    width: '100%',
    padding: '12px',
    textAlign: 'center',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },
};
