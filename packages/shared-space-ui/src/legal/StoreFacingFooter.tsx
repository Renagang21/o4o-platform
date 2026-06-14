/**
 * StoreFacingFooter — store-facing 화면 공통 compact 푸터
 *
 * WO-O4O-STORE-FACING-FOOTER-COVERAGE-V1
 *
 * 매장 HUB / 내 매장·내 약국 등 store-facing 사용자 화면 하단에 표시하는 compact 푸터.
 * 전체 공개 푸터(brand 장문·다컬럼) 대신 최소 신뢰/문의 접근만 제공한다:
 *   - 이용약관 / 개인정보처리방침 / 문의 링크 (서비스별 route 주입)
 *   - 동적 법정정보(PublicLegalFooterInfo) — 값 없으면 비표시
 *   - copyright
 *
 * 원칙:
 *   - 법정정보 실값은 service_legal_profiles(공통 loader 주입). 하드코딩 금지.
 *   - 색상/링크는 서비스 무관 inherit/주입 — PublicLegalFooterInfo 와 동일하게 inline style 사용
 *     (Tailwind content-glob 의존 회피).
 *   - SPA 네비게이션 유지: react-router Link 사용.
 */
import { type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PublicLegalFooterInfo, type PublicLegalProfileDto } from './PublicLegalFooterInfo';

export interface StoreFacingFooterLinks {
  /** 이용약관 route (GP/KCos `/terms`, KPA `/policy`) */
  terms: string;
  /** 개인정보처리방침 route */
  privacy: string;
  /** 문의 route */
  contact: string;
}

export interface StoreFacingFooterProps {
  serviceKey: string;
  /** copyright 표기명 */
  serviceName: string;
  /** service 측 주입: public 법정정보 조회. 미설정/비활성/오류 → null. */
  loadProfile: (serviceKey: string) => Promise<PublicLegalProfileDto | null>;
  links: StoreFacingFooterLinks;
  /** "이용약관" 라벨 override (기본 "이용약관"). KPA도 라벨 동일, route만 `/policy`. */
  termsLabel?: string;
}

export function StoreFacingFooter({
  serviceKey,
  serviceName,
  loadProfile,
  links,
  termsLabel = '이용약관',
}: StoreFacingFooterProps) {
  const year = new Date().getFullYear();
  const linkStyle: CSSProperties = { color: '#475569', textDecoration: 'none', fontSize: 13 };

  return (
    <footer
      style={{
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff',
        color: '#64748b',
        padding: '20px 16px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 10 }}>
          <Link to={links.terms} style={linkStyle}>{termsLabel}</Link>
          <Link to={links.privacy} style={linkStyle}>개인정보처리방침</Link>
          <Link to={links.contact} style={linkStyle}>문의</Link>
        </nav>
        <PublicLegalFooterInfo serviceKey={serviceKey} loadProfile={loadProfile} linkColor="#475569" />
        <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
          © {year} {serviceName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
