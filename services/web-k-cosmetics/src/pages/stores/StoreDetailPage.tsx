/**
 * StoreDetailPage - 개별 매장 페이지
 * WO-KCOS-HOME-UI-V1
 *
 * 성격: 한국 내 매장이 소비자를 직접 만나는 화면
 * 언어: 기본 한국어, 매장 설정에 따라 다국어 지원
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Store, SERVICE_TAG_LABELS_KO, SERVICE_TAG_LABELS_EN } from '../../types';

// 샘플 데이터 (추후 API 연동)
const sampleStoreDetail: Store & {
  descriptionKo: string;
  descriptionEn: string;
  brands: string[];
  operatingHours: string;
  operatingHoursEn: string;
} = {
  id: '1',
  slug: 'beauty-lab-gangnam',
  name: '뷰티랩 강남점',
  nameEn: 'Beauty Lab Gangnam',
  location: '서울 강남구',
  locationEn: 'Gangnam, Seoul',
  address: '서울시 강남구 테헤란로 123, 2층',
  addressEn: '2F, 123 Teheran-ro, Gangnam-gu, Seoul',
  isVerified: true,
  serviceTags: ['english_ok', 'try_on', 'group_friendly'],
  descriptionKo: `뷰티랩 강남점은 K-Beauty의 핵심 지역인 강남에 위치한 프리미엄 화장품 매장입니다.

다양한 한국 화장품 브랜드를 직접 체험하고 전문 상담을 받으실 수 있습니다.
관광객 분들을 위한 영어 상담 서비스도 제공하고 있습니다.`,
  descriptionEn: `Beauty Lab Gangnam is a premium cosmetics store located in Gangnam, the heart of K-Beauty.

Experience various Korean cosmetics brands firsthand and receive expert consultation.
English consultation service is available for tourists.`,
  brands: ['LANEIGE', 'Sulwhasoo', 'COSRX', 'Innisfree', 'ETUDE', 'MISSHA'],
  operatingHours: '매일 10:00 - 21:00 (설날/추석 당일 휴무)',
  operatingHoursEn: 'Daily 10:00 AM - 9:00 PM (Closed on Lunar New Year & Chuseok)',
  phone: '02-1234-5678',
  website: 'https://beautylab.example.com',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

type Language = 'ko' | 'en';

export function StoreDetailPage() {
  const { storeSlug: _storeSlug } = useParams<{ storeSlug: string }>();
  const [lang, setLang] = useState<Language>('ko');

  // 실제로는 _storeSlug로 API 호출 (추후 구현)
  const store = sampleStoreDetail;
  const tagLabels = lang === 'ko' ? SERVICE_TAG_LABELS_KO : SERVICE_TAG_LABELS_EN;

  const name = lang === 'en' && store.nameEn ? store.nameEn : store.name;
  const location = lang === 'en' && store.locationEn ? store.locationEn : store.location;
  const address = lang === 'en' && store.addressEn ? store.addressEn : store.address;
  const description = lang === 'en' ? store.descriptionEn : store.descriptionKo;
  const hours = lang === 'en' ? store.operatingHoursEn : store.operatingHours;

  return (
    <div style={styles.page}>
      {/* 상단 Hero */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          {/* 뒤로가기 */}
          <Link to="/stores" style={styles.backLink}>
            ← {lang === 'ko' ? '매장 목록' : 'Back to Stores'}
          </Link>

          {/* 매장명 및 Verified */}
          <div style={styles.heroHeader}>
            <h1 style={styles.storeName}>{name}</h1>
            {store.isVerified && (
              <span style={styles.verifiedBadge}>
                ✓ Verified Store
              </span>
            )}
          </div>

          <p style={styles.location}>{location}</p>

          {/* 언어 토글 */}
          <div style={styles.langSwitch}>
            <button
              style={{
                ...styles.langButton,
                ...(lang === 'ko' ? styles.langButtonActive : {}),
              }}
              onClick={() => setLang('ko')}
            >
              한국어
            </button>
            <button
              style={{
                ...styles.langButton,
                ...(lang === 'en' ? styles.langButtonActive : {}),
              }}
              onClick={() => setLang('en')}
            >
              English
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={styles.container}>
        <div style={styles.content}>
          {/* 서비스 태그 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              {lang === 'ko' ? '제공 서비스' : 'Services'}
            </h2>
            <div style={styles.tags}>
              {store.serviceTags.map((tag) => (
                <span key={tag} style={styles.tag}>
                  {tagLabels[tag]}
                </span>
              ))}
            </div>
          </section>

          {/* 매장 소개 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              {lang === 'ko' ? '매장 소개' : 'About'}
            </h2>
            <p style={styles.description}>{description}</p>
          </section>

          {/* 취급 브랜드 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              {lang === 'ko' ? '취급 브랜드' : 'Brands'}
            </h2>
            <div style={styles.brands}>
              {store.brands.map((brand) => (
                <span key={brand} style={styles.brandTag}>
                  {brand}
                </span>
              ))}
            </div>
          </section>

          {/* 영업 정보 */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>
              {lang === 'ko' ? '영업 정보' : 'Store Info'}
            </h2>
            <div style={styles.infoList}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>
                  {lang === 'ko' ? '주소' : 'Address'}
                </span>
                <span style={styles.infoValue}>{address}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>
                  {lang === 'ko' ? '영업시간' : 'Hours'}
                </span>
                <span style={styles.infoValue}>{hours}</span>
              </div>
              {store.phone && (
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>
                    {lang === 'ko' ? '전화' : 'Phone'}
                  </span>
                  <span style={styles.infoValue}>{store.phone}</span>
                </div>
              )}
            </div>
          </section>

          {/* 책임 고지 (필수) */}
          <section style={styles.disclaimer}>
            <div style={styles.disclaimerContent}>
              <span style={styles.disclaimerIcon}>⚠️</span>
              <div>
                <p style={styles.disclaimerText}>
                  {lang === 'ko'
                    ? '본 매장의 상품 구매 및 결제, 고객 서비스는 해당 매장에서 직접 담당합니다.'
                    : 'All purchases, payments, and customer service are handled directly by this store.'}
                </p>
                <p style={styles.disclaimerSub}>
                  {lang === 'ko'
                    ? 'K-Cosmetics.site는 매장 정보 제공 플랫폼이며, 직접 판매를 하지 않습니다.'
                    : 'K-Cosmetics.site is an information platform and does not sell products directly.'}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  hero: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    padding: '32px 24px 48px',
  },
  heroContent: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-block',
    color: '#aaa',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '24px',
  },
  heroHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '8px',
  },
  storeName: {
    fontSize: '32px',
    fontWeight: 700,
    margin: 0,
  },
  verifiedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '13px',
    color: '#4caf50',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    padding: '6px 12px',
    borderRadius: '20px',
  },
  location: {
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
  },
  langButtonActive: {
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  content: {},
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid #e9ecef',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: '0 0 16px 0',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tag: {
    fontSize: '13px',
    color: '#495057',
    backgroundColor: '#e9ecef',
    padding: '8px 14px',
    borderRadius: '20px',
  },
  description: {
    fontSize: '15px',
    color: '#333',
    lineHeight: 1.8,
    whiteSpace: 'pre-line',
    margin: 0,
  },
  brands: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  brandTag: {
    fontSize: '14px',
    color: '#1a1a1a',
    backgroundColor: '#f8f9fa',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    fontWeight: 500,
  },
  infoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    gap: '16px',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#666',
    minWidth: '80px',
    flexShrink: 0,
  },
  infoValue: {
    fontSize: '14px',
    color: '#1a1a1a',
  },
  disclaimer: {
    backgroundColor: '#fff3e0',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid #ffcc80',
  },
  disclaimerContent: {
    display: 'flex',
    gap: '12px',
  },
  disclaimerIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  disclaimerText: {
    fontSize: '14px',
    color: '#1a1a1a',
    margin: '0 0 4px 0',
    lineHeight: 1.5,
  },
  disclaimerSub: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
  },
};
