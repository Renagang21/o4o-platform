/**
 * GuideIntroKpaPage — KPA-Society 위치
 *
 * WO-KPA-GUIDE-INTRO-SUBPAGES-V1
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

const ITEMS = [
  {
    label: '커뮤니티 기반 서비스',
    detail:
      'KPA-Society는 약사회 회원이 모이는 온라인 공간입니다. 포럼·교육·자료실이 주요 채널이며, 이 세 축이 약사 간 지식 공유와 협력의 토대가 됩니다.',
    channels: ['포럼 — 토론·질의·정보 공유', '교육(LMS) — 강의 수강 및 이수 관리', '자료실 — 공동 자료 업로드·열람'],
  },
  {
    label: '약사 네트워크',
    detail:
      '약사회 회원은 플랫폼 계정으로 다양한 역할을 수행합니다. 강사로서 강의를 개설하거나, 포럼 운영자로 커뮤니티를 관리하거나, 약국 운영자로 매장을 등록할 수 있습니다.',
    channels: ['회원 — 커뮤니티 참여 및 콘텐츠 이용', '강사 — 강의 개설 및 수강생 관리', '약국 운영자 — 매장 등록 및 O4O 서비스 이용'],
  },
  {
    label: '매장 연결 구조',
    detail:
      '약국은 O4O 매장으로 등록되면 공급자 상품을 취급하고 고객 서비스를 운영할 수 있습니다. 커뮤니티에서 공유된 정보가 매장 운영으로 연결되는 것이 KPA-Society의 핵심 흐름입니다.',
    channels: ['상품 수급 — 공급자 카탈로그에서 취급 상품 선택', '콘텐츠 활용 — Hub 콘텐츠를 매장 사이니지·블로그에 적용', '고객 응대 — 약사 전문성 기반 상담·판매'],
  },
];

export function GuideIntroKpaPage() {
  return (
    <div>
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>O4O 개요</p>
          <h1 style={styles.heroTitle}>KPA-Society 위치</h1>
          <p style={styles.heroDesc}>
            약사 커뮤니티가 O4O 플랫폼 안에서 맡는 역할과 연결 구조입니다.
          </p>
        </div>
      </div>

      {ITEMS.map((item, idx) => (
        <PageSection key={item.label} last={idx === ITEMS.length - 1}>
          <PageContainer>
            <div style={styles.block}>
              <h2 style={styles.blockTitle}>{item.label}</h2>
              <p style={styles.blockDesc}>{item.detail}</p>
              <ul style={styles.list}>
                {item.channels.map((ch) => (
                  <li key={ch} style={styles.listItem}>
                    <span style={styles.listDot} />
                    {ch}
                  </li>
                ))}
              </ul>
            </div>
          </PageContainer>
        </PageSection>
      ))}

      <div style={styles.bottomNav}>
        <PageContainer>
          <div style={styles.bottomNavInner}>
            <Link to="/guide/intro/structure" style={styles.navMuted}>← O4O 기본 구조</Link>
            <Link to="/guide/intro/operation" style={styles.navPrimary}>운영 구조 →</Link>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  hero: { backgroundColor: '#1e293b', padding: '48px 0 40px' },
  heroInner: { maxWidth: 720, margin: '0 auto', padding: '0 24px' },
  heroEyebrow: {
    fontSize: '0.8125rem', fontWeight: 500, color: '#94a3b8',
    margin: '0 0 10px 0', textTransform: 'uppercase', letterSpacing: '0.08em',
  },
  heroTitle: { fontSize: '1.875rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 12px 0', lineHeight: 1.25 },
  heroDesc: { fontSize: '1rem', color: '#94a3b8', lineHeight: 1.7, margin: 0 },
  block: { paddingTop: 4, paddingBottom: 4 },
  blockTitle: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 10px 0' },
  blockDesc: { fontSize: '0.9375rem', color: '#475569', lineHeight: 1.7, margin: '0 0 14px 0', maxWidth: 600 },
  list: { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 },
  listItem: { display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9375rem', color: '#334155' },
  listDot: { width: 6, height: 6, borderRadius: '50%', backgroundColor: '#2563eb', flexShrink: 0 },
  bottomNav: { borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '20px 0' },
  bottomNavInner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  navPrimary: { fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', textDecoration: 'none' },
  navMuted: { fontSize: '0.875rem', color: '#64748b', textDecoration: 'none' },
};
