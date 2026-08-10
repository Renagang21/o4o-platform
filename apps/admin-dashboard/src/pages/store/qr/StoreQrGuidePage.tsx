/**
 * StoreQrGuidePage — 운영자 콘솔의 매장 QR 안내 화면
 *
 * WO-O4O-ADMIN-STORE-QR-LEGACY-UI-GUIDE-V1
 *
 * 경로: /store/qr · /store/qr/create (두 경로 모두 이 화면으로 연결된다)
 *
 * 왜 생성 화면이 아니라 안내 화면인가
 *   기존 `QrListPage` · `QrCreatePage` 는 `/api/v1/pharmacy/qr/*` 를 호출했다.
 *   그 route 는 service router 안에만 마운트돼 있어(`/api/v1/{kpa|glycopharm|cosmetics}/pharmacy/qr/*`)
 *   admin-dashboard 의 호출은 생성 시점부터 계속 404 였다 — 한 번도 동작한 적이 없다.
 *   판정 근거: docs/investigations/IR-O4O-ADMIN-QR-SOURCE-PRODUCTS-LEGACY-ROUTE-AUDIT-V1.md (REPLACE)
 *
 *   단순히 service segment 를 붙여 되살리지 않는다. 해당 route 의 guard 는 `store_owner` 이고,
 *   QR 생성·적용은 매장 경영자의 실행 자산 생성 기능이다. 운영자 콘솔은 자료를 검수·게시하고
 *   매장이 그 자료를 QR·태블릿 등에 적용한다.
 *
 * 이 화면은 API 를 호출하지 않는다.
 */

import { QrCode, ExternalLink } from 'lucide-react';

/**
 * 서비스별 매장 경영자 QR 화면.
 * 경로는 각 서비스 App.tsx 의 실제 route 이고, 도메인은 service-catalog SSOT 값이다.
 */
const STORE_QR_ENTRIES: { service: string; url: string; note: string }[] = [
  {
    service: 'KPA-Society',
    url: 'https://kpa-society.co.kr/store/marketing/qr',
    note: '약국 매장 QR 관리',
  },
  {
    service: 'GlycoPharm',
    url: 'https://glycopharm.co.kr/store/marketing/qr',
    note: '매장 QR 관리',
  },
  {
    service: 'K-Cosmetics',
    url: 'https://k-cosmetics.site/store/marketing/qr',
    note: '매장 QR 관리',
  },
  {
    service: 'Pharmacy-Hub',
    url: 'https://pharmacyhub.co.kr/store-owner/qr',
    note: '매장 실행 자산 — QR',
  },
];

export default function StoreQrGuidePage() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerIcon}>
          <QrCode size={20} style={{ color: '#2563EB' }} />
        </div>
        <div>
          <h1 style={s.title}>매장 QR 안내</h1>
          <p style={s.subtitle}>이 화면에서는 QR을 직접 생성하지 않습니다.</p>
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionTitle}>QR은 매장 화면에서 만듭니다</h2>
        <p style={s.body}>
          QR 생성과 적용은 매장 경영자의 실행 자산 기능입니다. 운영자는 매장에 제공할 자료를
          검수·게시하고, 매장 경영자가 그 자료를 QR·태블릿 등에 적용합니다.
        </p>

        <div style={s.roleGrid}>
          <div style={s.roleBox}>
            <p style={s.roleLabel}>공급자</p>
            <p style={s.roleDesc}>자료 제공</p>
          </div>
          <div style={s.roleBox}>
            <p style={s.roleLabel}>운영자</p>
            <p style={s.roleDesc}>검수 · 표준화 · 노출 정책 관리</p>
          </div>
          <div style={s.roleBox}>
            <p style={s.roleLabel}>매장 경영자</p>
            <p style={s.roleDesc}>QR · 태블릿 · 콘텐츠 선택 및 적용</p>
          </div>
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionTitle}>서비스별 매장 QR 화면</h2>
        <p style={s.body}>
          매장 경영자 계정으로 로그인한 뒤 아래 화면에서 QR을 생성하세요.
        </p>
        <div style={s.linkList}>
          {STORE_QR_ENTRIES.map((e) => (
            <a
              key={e.service}
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              style={s.linkRow}
            >
              <div style={{ minWidth: 0 }}>
                <p style={s.linkService}>{e.service}</p>
                <p style={s.linkNote}>{e.note}</p>
              </div>
              <span style={s.linkUrl}>
                {e.url.replace('https://', '')}
                <ExternalLink size={13} style={{ marginLeft: 6, flexShrink: 0 }} />
              </span>
            </a>
          ))}
        </div>
      </div>

      <p style={s.footnote}>
        운영자 콘솔의 QR 생성 화면은 동작하지 않아 안내로 대체했습니다
        (`WO-O4O-ADMIN-STORE-QR-LEGACY-UI-GUIDE-V1`).
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
    backgroundColor: '#eff6ff',
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
  body: { fontSize: 13, color: '#475569', lineHeight: 1.6, margin: '0 0 16px' },
  roleGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 },
  roleBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    padding: '12px 14px',
  },
  roleLabel: { fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 4px' },
  roleDesc: { fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 },
  linkList: { display: 'flex', flexDirection: 'column', gap: 8 },
  linkRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    textDecoration: 'none',
  },
  linkService: { fontSize: 13, fontWeight: 600, color: '#1e293b', margin: '0 0 2px' },
  linkNote: { fontSize: 12, color: '#64748b', margin: 0 },
  linkUrl: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 12,
    color: '#2563EB',
    whiteSpace: 'nowrap',
  },
  footnote: { fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.6 },
};
