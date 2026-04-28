/**
 * GuideUsagePage — 서비스 활용 방법
 *
 * WO-KPA-GUIDE-USAGE-PAGE-V1
 *
 * IR-KPA-GUIDE-USAGE-FLOW-AUDIT-V1 조사 결과 기반.
 * 매장 운영 흐름 7단계를 코드 기준으로 추출한 실제 흐름을 설명한다.
 *
 * 흐름:
 *   상품 확보 → 채널 진열 → 고객 유입 → 상담 요청 → 고객 대응 → 콘텐츠 활용 → 사이니지
 *
 * 공개 페이지 (인증 불필요).
 */

import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';

// ─── 데이터 ───────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    step: '01',
    title: '상품 확보',
    route: '/store/commerce/products',
    routeLabel: '/store/commerce/products',
    description:
      '플랫폼 B2B 카탈로그에서 취급할 상품을 선택해 내 매장에 추가합니다. 승인 후 소매가를 설정하고 노출을 활성화하면 판매 준비가 완료됩니다.',
    items: [
      {
        label: 'B2B 카탈로그 탐색',
        detail: '공급사별로 공급 가능한 상품을 확인합니다. 매장 허브(/store-hub/b2b)에서 상품 목록을 탐색합니다.',
      },
      {
        label: '내 매장에 추가',
        detail: '상품 옆 + 버튼으로 신청합니다. 승인 전까지는 대기(pending) 상태로 표시됩니다.',
      },
      {
        label: '소매가 설정 및 활성화',
        detail: 'B2C 탭(/store/commerce/products/b2c)에서 소매가를 입력하고 노출 토글을 켭니다.',
      },
    ],
  },
  {
    step: '02',
    title: '채널 진열',
    route: '/store/channels',
    routeLabel: '/store/channels',
    description:
      '승인된 상품을 4개 채널(B2C·KIOSK·TABLET·SIGNAGE)에 배치합니다. 채널마다 노출 상품과 진열 순서를 독립적으로 구성합니다.',
    items: [
      {
        label: '채널 선택',
        detail: 'B2C(온라인 스토어), KIOSK, TABLET(키오스크 상담), SIGNAGE(사이니지) 중 목적에 맞는 채널을 선택합니다.',
      },
      {
        label: '상품 추가 및 순서 설정',
        detail: '채널에 상품을 추가하고 진열 순서를 조정합니다. 채널별로 노출 여부를 독립 제어합니다.',
      },
      {
        label: '채널 승인',
        detail: '채널은 플랫폼 승인(PENDING → APPROVED) 후 활성화됩니다. 승인 전에는 고객에게 노출되지 않습니다.',
      },
    ],
  },
  {
    step: '03',
    title: '고객 유입',
    route: '/store/marketing/qr',
    routeLabel: '/store/marketing/qr',
    description:
      'QR 코드를 생성해 고객이 온라인 스토어·태블릿·콘텐츠 페이지로 바로 진입하도록 유도합니다. QR 스캔 분석으로 유입 현황을 파악합니다.',
    items: [
      {
        label: 'QR 코드 생성',
        detail: '목적에 따라 랜딩 유형을 선택합니다. 상품 링크(product), 태블릿 상담(tablet), 콘텐츠 페이지(page), 외부 링크(link).',
      },
      {
        label: 'QR 출력 및 부착',
        detail: '생성된 QR을 인쇄해 매장 진열대·포스터·POP 자료에 부착합니다.',
      },
      {
        label: '스캔 분석',
        detail: '스캔 수, 디바이스 분포, 상위 QR 순위를 /store/analytics/marketing에서 확인합니다.',
      },
    ],
  },
  {
    step: '04',
    title: '상담 요청',
    route: '/tablet/:slug',
    routeLabel: '/tablet/:slug (고객 화면)',
    description:
      '고객이 태블릿 키오스크에서 관심 상품을 선택하고 상담을 요청합니다. 인증 없이 접근 가능하며, 요청 후 처리 상태를 실시간으로 확인합니다.',
    items: [
      {
        label: '태블릿에서 상품 탐색',
        detail: 'TABLET 채널에 진열된 상품이 그리드로 표시됩니다. 상품을 탭하면 상세 오버레이가 열립니다.',
      },
      {
        label: '관심 표시 / 상담 요청',
        detail: '이름과 메모를 입력해 요청을 제출합니다. 이름과 메모는 선택 사항입니다.',
      },
      {
        label: '상태 실시간 추적',
        detail: '요청 후 화면에서 처리 상태(대기 중 → 확인됨 → 완료)를 3초 간격으로 자동 갱신합니다.',
      },
    ],
  },
  {
    step: '05',
    title: '고객 대응',
    route: '/store/requests',
    routeLabel: '/store/requests',
    description:
      '직원 화면에서 고객 요청을 실시간으로 확인하고 상태를 처리합니다. 5초 간격으로 자동 갱신되며, 확인·완료·취소 세 가지 액션을 제공합니다.',
    items: [
      {
        label: '요청 실시간 확인',
        detail: '새 요청이 도착하면 목록 상단에 표시됩니다. 상품명, 고객 메모, 요청 시각이 함께 표시됩니다.',
      },
      {
        label: '확인(ACKNOWLEDGED)',
        detail: '"확인" 버튼을 누르면 고객 화면에 "확인됨" 상태가 표시됩니다. 직원이 인지했음을 고객에게 알립니다.',
      },
      {
        label: '완료(COMPLETED) / 취소(CANCELLED)',
        detail: '상담 후 "완료"로 마무리합니다. 필요 시 "취소"로 처리합니다.',
      },
    ],
  },
  {
    step: '06',
    title: '콘텐츠 활용',
    route: '/store/content',
    routeLabel: '/store/content',
    description:
      '자료실에 콘텐츠를 업로드하고 게시 상태를 관리합니다. 게시된 콘텐츠는 공개 매장 페이지에 자동으로 노출됩니다.',
    items: [
      {
        label: '자료실 업로드',
        detail: '이미지·문서·동영상을 자료실에 업로드합니다. 초안(draft) 상태로 저장되어 공개 전까지 노출되지 않습니다.',
      },
      {
        label: '게시 상태 관리',
        detail: 'draft → published로 전환하면 공개 스토어에 노출됩니다. 필요 시 hidden으로 숨깁니다.',
      },
      {
        label: '채널 노출 설정',
        detail: '콘텐츠마다 홈(home) 또는 사이니지(signage) 채널 노출 여부를 개별 설정합니다.',
      },
    ],
  },
  {
    step: '07',
    title: '사이니지 운영',
    route: '/store/marketing/signage/playlist',
    routeLabel: '/store/marketing/signage/playlist',
    description:
      '매장 디스플레이에 재생할 콘텐츠를 플레이리스트로 구성하고 시간·요일 스케줄을 설정합니다.',
    items: [
      {
        label: '플레이리스트 구성',
        detail: '동영상·이미지를 플레이리스트에 추가하고 재생 순서를 조정합니다.',
      },
      {
        label: '스케줄 설정',
        detail: '시간대·요일별로 다른 플레이리스트를 재생하도록 스케줄을 설정합니다.',
      },
      {
        label: '허브 라이브러리 활용',
        detail: '매장 허브(/store-hub/signage)에서 플랫폼 공용 사이니지 콘텐츠를 탐색해 내 매장에 활용합니다.',
      },
    ],
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function GuideUsagePage() {
  return (
    <div>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <p style={styles.heroEyebrow}>이용 가이드</p>
          <h1 style={styles.heroTitle}>서비스 활용 방법</h1>
          <p style={styles.heroDesc}>
            약국 매장 운영의 실제 흐름입니다. 상품 확보부터 고객 상담 대응, 콘텐츠 활용까지 단계별로 설명합니다.
          </p>
          {/* 흐름 요약 */}
          <div style={styles.flowBar}>
            {['상품 확보', '채널 진열', '고객 유입', '상담 요청', '고객 대응', '콘텐츠 활용', '사이니지'].map(
              (label, idx, arr) => (
                <span key={label} style={styles.flowBarItem}>
                  <span style={styles.flowBarLabel}>{label}</span>
                  {idx < arr.length - 1 && <span style={styles.flowBarArrow}>→</span>}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      {SECTIONS.map((section, idx) => (
        <PageSection key={section.step} last={idx === SECTIONS.length - 1}>
          <PageContainer>
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <span style={styles.sectionStep}>{section.step}</span>
                <h2 style={styles.sectionTitle}>{section.title}</h2>
                <span style={styles.sectionRoute}>{section.routeLabel}</span>
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
            <Link to="/guide/intro" style={styles.navLinkMuted}>← O4O 개요</Link>
            <div style={styles.navLinkGroup}>
              <Link to="/guide/features" style={styles.navLinkPrimary}>기능별 이용 방법 →</Link>
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
  flowBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  flowBarItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  flowBarLabel: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#cbd5e1',
  },
  flowBarArrow: {
    fontSize: '0.75rem',
    color: '#475569',
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
    flexWrap: 'wrap',
  },
  sectionStep: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    borderRadius: 4,
    padding: '2px 7px',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  sectionRoute: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 4,
    padding: '2px 8px',
    fontFamily: 'monospace',
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
