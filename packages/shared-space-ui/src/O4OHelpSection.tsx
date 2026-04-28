/**
 * O4OHelpSection — O4O 공통 도움 + 확장 영역
 *
 * WO-O4O-COMMON-HELP-SECTION-KPA-APPLY-V1
 *
 * Home 하단에 위치하여 두 가지 역할을 수행한다:
 * 1. 사용 방법 안내 — 주요 기능 진입 안내 (매장 등록, 상품 등록, 콘텐츠 활용)
 * 2. 다른 서비스 보기 — GlycoPharm, K-Cosmetics, Market Trial
 *
 * props로 overrides 가능. 기본값은 O4O 표준 항목.
 */

import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { O4OHelpSectionProps, O4OHelpUsageItem, O4OHelpServiceItem } from './types';

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_USAGE_ITEMS: O4OHelpUsageItem[] = [
  { title: '매장 등록', description: '약국·매장을 플랫폼에 등록하고 운영을 시작하세요', href: '#' },
  { title: '상품 등록', description: '취급 상품을 등록하고 파트너에게 공급하세요', href: '#' },
  { title: '콘텐츠 활용', description: '매장용 디지털 콘텐츠를 검색하고 활용하세요', href: '#' },
];

/** 전체 서비스 목록. currentServiceKey와 일치하는 항목은 렌더링에서 제외된다. */
const ALL_SERVICE_ITEMS: O4OHelpServiceItem[] = [
  {
    serviceKey: 'kpa-society',
    title: 'KPA Society',
    description: '약사회 회원을 위한 커뮤니티·학술·서비스 통합 플랫폼입니다',
    href: 'https://kpa-society.co.kr/',
    external: true,
  },
  {
    serviceKey: 'glycopharm',
    title: 'GlycoPharm',
    description: '약국 고객의 혈당 관리와 상담을 체계적으로 지원하는 서비스입니다',
    href: 'https://www.glycopharm.co.kr',
    external: true,
  },
  {
    serviceKey: 'k-cosmetics',
    title: 'K-Cosmetics',
    description: '약국에서 취급할 수 있는 다양한 제품과 판매 확장을 돕는 서비스입니다',
    href: 'https://www.k-cosmetics.site/',
    external: true,
  },
  {
    serviceKey: 'market-trial',
    title: 'Market Trial',
    description: '신제품 체험과 공동구매를 통해 새로운 상품 기회를 확인할 수 있습니다',
    href: 'https://neture.co.kr/market-trial',
    external: true,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function O4OHelpSection({
  usageTitle = '이렇게 사용할 수 있습니다',
  usageItems = DEFAULT_USAGE_ITEMS,
  servicesTitle = '다른 서비스 보기',
  serviceItems,
  currentServiceKey,
}: O4OHelpSectionProps) {
  const resolvedServiceItems = serviceItems
    ?? (currentServiceKey
      ? ALL_SERVICE_ITEMS.filter((item) => item.serviceKey !== currentServiceKey)
      : ALL_SERVICE_ITEMS);
  useEffect(() => {
    const id = 'shared-o4ohelp-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .ss-help-usage-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      .ss-help-service-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
      }
      @media (min-width: 640px) {
        .ss-help-usage-grid { grid-template-columns: repeat(3, 1fr); }
        .ss-help-service-grid { grid-template-columns: repeat(3, 1fr); }
      }
      .ss-help-card:hover {
        border-color: #cbd5e1;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  return (
    <section style={styles.section}>
      {/* Block 1: 사용 방법 */}
      <div style={styles.block}>
        <h2 style={styles.blockTitle}>{usageTitle}</h2>
        <div className="ss-help-usage-grid">
          {usageItems.map((item) => (
            <UsageCard key={item.title} item={item} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Block 2: 다른 서비스 */}
      <div style={styles.block}>
        <h2 style={styles.blockTitle}>{servicesTitle}</h2>
        <div className="ss-help-service-grid">
          {resolvedServiceItems.map((item) => (
            <ServiceCard key={item.title} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UsageCard({ item }: { item: O4OHelpUsageItem }) {
  const inner = (
    <>
      <p style={styles.cardTitle}>{item.title}</p>
      <p style={styles.cardDesc}>{item.description}</p>
    </>
  );

  if (item.href === '#') {
    return (
      <div style={{ ...styles.card, cursor: 'default' }} className="ss-help-card">
        {inner}
        <span style={styles.soon}>준비중</span>
      </div>
    );
  }

  return (
    <Link to={item.href} style={styles.card} className="ss-help-card">
      {inner}
      <span style={styles.arrow}>→</span>
    </Link>
  );
}

function ServiceCard({ item }: { item: O4OHelpServiceItem }) {
  const inner = (
    <>
      <p style={styles.cardTitle}>{item.title}</p>
      <p style={styles.cardDesc}>{item.description}</p>
      <span style={styles.arrow}>→</span>
    </>
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.card}
        className="ss-help-card"
      >
        {inner}
      </a>
    );
  }

  return (
    <a href={item.href} style={styles.card} className="ss-help-card">
      {inner}
    </a>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  section: {
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    padding: '40px 0',
  },
  block: {
    marginBottom: 0,
  },
  blockTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 14px 0',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    margin: '28px 0',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '16px 18px',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  cardTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  cardDesc: {
    fontSize: '0.8125rem',
    color: '#64748b',
    lineHeight: 1.5,
    margin: '2px 0 6px 0',
    flex: 1,
  },
  arrow: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#2563EB',
    marginTop: 'auto',
  },
  soon: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#94a3b8',
    marginTop: 'auto',
  },
};
