/**
 * GuideIntroPage — O4O 개요
 *
 * WO-KPA-GUIDE-INTRO-PAGE-V1
 *
 * O4O 플랫폼의 기본 구조와 KPA-Society의 위치를 한 화면에 정리한다.
 * 공개 페이지 (인증 불필요).
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

// ─── 데이터 ───────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    title: 'O4O 기본 구조',
    description:
      'O4O는 공급자·운영자·매장이 하나의 플랫폼 위에서 역할을 나누는 구조입니다. 각 주체는 독립적으로 움직이지만 공통된 규칙으로 연결됩니다.',
    items: [
      {
        label: '공급자',
        detail: '상품과 콘텐츠를 생산하고 플랫폼에 등록하는 주체입니다.',
      },
      {
        label: '운영자',
        detail: '플랫폼 정책을 설정하고 공급자·매장을 관리합니다.',
      },
      {
        label: '매장',
        detail: '공급자의 상품과 콘텐츠를 받아 고객에게 직접 판매·전달합니다.',
      },
    ],
  },
  {
    title: 'KPA-Society 위치',
    description:
      'KPA-Society는 약사 커뮤니티를 기반으로 플랫폼에 참여하는 서비스입니다. 약국은 매장 역할을 하며, 포럼·교육·자료실로 구성원 간 네트워크를 형성합니다.',
    items: [
      {
        label: '커뮤니티 기반 서비스',
        detail: '포럼, 교육, 자료실이 약사 네트워크의 중심 채널입니다.',
      },
      {
        label: '약사 네트워크',
        detail: '약사회 회원이 서로 정보를 공유하고 업무를 협력합니다.',
      },
      {
        label: '매장 연결 구조',
        detail: '약국은 O4O 매장으로 등록되어 상품 수급·고객 응대를 운영합니다.',
      },
    ],
  },
  {
    title: '운영 구조',
    description:
      '운영자가 정책을 설정하면 매장이 실행하고, 커뮤니티가 그 경험을 확장합니다. 세 층위가 순환하며 서비스가 성장합니다.',
    items: [
      {
        label: '운영자 중심 구조',
        detail: '승인, 정책, 커미션 등 플랫폼 규칙을 운영자가 담당합니다.',
      },
      {
        label: '매장 실행 구조',
        detail: '약국이 상품을 취급하고 고객에게 직접 서비스를 제공합니다.',
      },
      {
        label: '커뮤니티 확장 구조',
        detail: '포럼과 교육이 매장 운영 노하우를 네트워크 전체에 확산합니다.',
      },
    ],
  },
  {
    title: '핵심 개념',
    description:
      'O4O 플랫폼이 추구하는 방향은 작은 사업자들이 정보와 구조를 공유하며 함께 성장하는 것입니다.',
    items: [
      {
        label: '소규모 사업자 연대',
        detail: '개별 약국이 플랫폼을 통해 대형 유통망과 대등하게 경쟁합니다.',
      },
      {
        label: '세미 프랜차이즈 구조',
        detail: '브랜드 통일 없이도 공통 운영 체계를 공유하는 느슨한 연합 모델입니다.',
      },
      {
        label: '정보 기반 판매',
        detail: '약사의 전문 지식이 콘텐츠로 전환되어 매장 신뢰도와 매출을 높입니다.',
      },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function GuideIntroPage() {
  return (
    <div>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>이용 가이드</p>
          <h1 style={styles.heroTitle}>O4O 개요</h1>
          <p style={styles.heroDesc}>
            O4O 플랫폼의 구조와 KPA-Society가 그 안에서 어떤 역할을 하는지 정리합니다.
          </p>
          <div style={styles.heroNav}>
            <Link to="/guide/usage" style={styles.heroNavLink}>다음: 서비스 활용 방법 →</Link>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      {SECTIONS.map((section, idx) => (
        <PageSection key={section.title} last={idx === SECTIONS.length - 1}>
          <PageContainer>
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionNumber}>0{idx + 1}</span>
                <h2 style={styles.sectionTitle}>{section.title}</h2>
              </div>
              <p style={styles.sectionDesc}>{section.description}</p>
              <div style={styles.cardGrid}>
                {section.items.map((item) => (
                  <div key={item.label} style={styles.card}>
                    <p style={styles.cardLabel}>{item.label}</p>
                    <p style={styles.cardDetail}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </PageContainer>
        </PageSection>
      ))}

      {/* Bottom Nav */}
      <div style={styles.bottomNav}>
        <PageContainer>
          <div style={styles.bottomNavInner}>
            <Link to="/" style={styles.navLinkMuted}>← 홈으로</Link>
            <div style={styles.navLinkGroup}>
              <Link to="/guide/usage" style={styles.navLinkPrimary}>서비스 활용 방법 →</Link>
              <Link to="/guide/features" style={styles.navLinkMuted}>기능별 이용 방법</Link>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  hero: {
    backgroundColor: '#1e293b',
    padding: '56px 0 48px',
  },
  heroInner: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '0 24px',
  },
  heroEyebrow: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#94a3b8',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  heroTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#f8fafc',
    margin: '0 0 14px 0',
    lineHeight: 1.25,
  },
  heroDesc: {
    fontSize: '1rem',
    color: '#94a3b8',
    lineHeight: 1.7,
    margin: '0 0 24px 0',
  },
  heroNav: {
    marginTop: 8,
  },
  heroNavLink: {
    fontSize: '0.875rem',
    color: '#60a5fa',
    textDecoration: 'none',
    fontWeight: 500,
  },
  section: {
    paddingTop: 8,
    paddingBottom: 8,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  sectionNumber: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    padding: '2px 7px',
    letterSpacing: '0.04em',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  sectionDesc: {
    fontSize: '0.9375rem',
    color: '#475569',
    lineHeight: 1.7,
    margin: '0 0 20px 0',
    maxWidth: 640,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  card: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '16px 18px',
  },
  cardLabel: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 6px 0',
  },
  cardDetail: {
    fontSize: '0.8125rem',
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },
  bottomNav: {
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    padding: '20px 0',
  },
  bottomNavInner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  navLinkGroup: {
    display: 'flex',
    gap: 20,
    alignItems: 'center',
  },
  navLinkPrimary: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#2563eb',
    textDecoration: 'none',
  },
  navLinkMuted: {
    fontSize: '0.875rem',
    color: '#64748b',
    textDecoration: 'none',
  },
};
