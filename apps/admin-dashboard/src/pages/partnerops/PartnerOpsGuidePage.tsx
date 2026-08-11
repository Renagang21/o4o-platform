/**
 * PartnerOpsGuidePage — PartnerOps 안내 화면
 *
 * WO-O4O-PARTNEROPS-AFFILIATE-SURFACE-RETIRE-OR-GUIDE-V1
 *
 * 경로: /partnerops/* 전체 (dashboard · profile · routines · links · conversions ·
 *        settlement · ai-builder 및 하위 경로 모두 이 화면으로 연결된다)
 *
 * 왜 기능 화면이 아니라 안내 화면인가
 *   1. `packages/partnerops/src/backend` 에 route factory 는 있으나 api-server 가 마운트하지 않는다
 *      (`createRoutes` 호출 0건). 프로덕션에서 `/api/v1/partnerops/*` 는 전부 404 + text/html 이다.
 *   2. install hook 이 만드는 `partnerops_*` 테이블과 partner-core 의 `partner_*` 엔티티가 갈라져 있어
 *      어느 쪽이 canonical 인지 정해지지 않았다.
 *   3. 전통 affiliate 수익·전환·자동 커미션 정산은 현재 O4O 방향과 맞지 않는다.
 *
 *   직전 WO(WO-O4O-PARTNEROPS-ACTIVE-DEMO-FALLBACK-AUDIT-AND-GUIDE-V1)에서 데모 데이터 위장은
 *   제거했으나, 사용자는 여전히 실패 카드가 있는 화면 6개를 볼 수 있었다. 이번 WO 는 그 surface 를
 *   단일 안내 화면으로 통합한다.
 *
 *   backend 복구 · route mount · 테이블 migration 은 이번 범위가 아니다(WO §4 금지사항).
 *   app manifest 와 route guard(AdminProtectedRoute · AppRouteGuard)는 그대로 유지한다.
 *
 * 이 화면은 API 를 호출하지 않는다.
 */

import { Users } from 'lucide-react';

/** 이 화면으로 통합된, 더 이상 제공하지 않는 기능 */
const RETIRED_CAPABILITIES: { label: string; note: string }[] = [
  { label: '추적 링크', note: '파트너 링크 생성 · 클릭 추적' },
  { label: '전환 분석', note: '링크 기반 주문 전환 집계' },
  { label: '커미션 정산', note: '자동 커미션 계산 · 정산 배치 · 지급' },
  { label: '콘텐츠/루틴', note: '추천 루틴 작성 · 게시' },
  { label: '파트너 프로필', note: '파트너 신청 · 정산 계좌 등록' },
  { label: 'AI Builder', note: '루틴 · 추천 자동 생성' },
];

export default function PartnerOpsGuidePage() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerIcon}>
          <Users size={20} style={{ color: '#4f46e5' }} />
        </div>
        <div>
          <h1 style={s.title}>PartnerOps 안내</h1>
          <p style={s.subtitle}>이 화면에서는 파트너 기능을 제공하지 않습니다.</p>
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionTitle}>현재 상태</h2>
        <p style={s.body}>
          PartnerOps는 현재 운영 API가 연결되지 않은 기능입니다. O4O의 파트너/인플루언서 협업 방향은
          별도 기획으로 정리 중입니다. 현재 이 화면에서는 링크 추적, 전환 분석, 자동 커미션 정산을
          제공하지 않습니다.
        </p>
        <p style={s.bodyLast}>
          이전에는 조회 실패 화면이 여러 개 노출됐습니다. 실제로 동작하지 않는 화면을 각각 열어두는 대신
          이 안내 하나로 통합했습니다.
        </p>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionTitle}>제공하지 않는 기능</h2>
        <div style={s.grid}>
          {RETIRED_CAPABILITIES.map((c) => (
            <div key={c.label} style={s.box}>
              <p style={s.boxLabel}>{c.label}</p>
              <p style={s.boxDesc}>{c.note}</p>
            </div>
          ))}
        </div>
      </div>

      <p style={s.footnote}>
        파트너 협업 방향이 확정되면 이 화면은 새 기준에 따라 다시 설계됩니다
        (`WO-O4O-PARTNEROPS-AFFILIATE-SURFACE-RETIRE-OR-GUIDE-V1`).
      </p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' },
  header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: { fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 },
  subtitle: { fontSize: 13, color: '#64748b', margin: '4px 0 0' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 24,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' },
  body: { fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 12px' },
  bodyLast: { fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  box: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '12px 14px',
  },
  boxLabel: { fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' },
  boxDesc: { fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 },
  footnote: { fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.6 },
};
