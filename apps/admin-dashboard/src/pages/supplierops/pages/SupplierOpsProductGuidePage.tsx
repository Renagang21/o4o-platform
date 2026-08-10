/**
 * SupplierOpsProductGuidePage — 운영자 콘솔의 공급자 상품 안내 화면
 *
 * WO-O4O-SUPPLIEROPS-PRODUCT-CREATE-LEGACY-UI-GUIDE-V1
 *
 * 경로: /supplierops/products · /supplierops/products/new · /supplierops/products/create
 *       (세 경로 모두 이 화면으로 연결된다)
 *
 * 왜 목록·등록 화면이 아니라 안내 화면인가
 *   기존 `Products` 는 API 를 호출하지 않고 `setTimeout` 으로 화장품 예시 3건을 넣는
 *   데모 화면이었다. 실제 공급자 상품이 아니라 하드코딩 값이다.
 *
 *   기존 `ProductCreatePage` → `SupplierProductForm` 의 저장은
 *   `createVendorProduct` → `apiRequest('/vendor/products')` 로 갔다.
 *   `apiRequest` 는 admin 오리진에 `fetch('/api/...')` 하는데 admin nginx 에는
 *   `/api` reverse proxy 가 없어 `index.html` 이 HTTP 200 으로 돌아왔다.
 *   `response.ok === true` 를 통과한 뒤 `response.json()` 에서 실패해
 *   사용자에게는 원인이 지워진 "제품 저장에 실패했습니다" 토스트만 보였다.
 *   backend 에는 `vendor/products` route 가 아예 없다 — 한 번도 동작한 적이 없다.
 *   판정 근거: docs/checks/CHECK-O4O-ADMIN-VENDOR-APIREQUEST-SAME-ORIGIN-FIX-V1.md (HOLD)
 *
 *   단순히 origin 을 고쳐 되살리지 않는다. 공급자 상품 등록·수정의 canonical 원장은
 *   Neture 공급자 화면(`/api/v1/neture/supplier/products`)이며, 이는 backend 주석에도
 *   명시돼 있다(PharmacyHubSupplierProductController.ts:13).
 *
 * 이 화면은 API 를 호출하지 않는다.
 */

import { Package, ExternalLink } from 'lucide-react';

/**
 * Neture 공급자 상품 화면.
 * 경로는 services/web-neture/src/App.tsx 의 실제 route 이고, 도메인은 service-catalog SSOT 값이다.
 */
const SUPPLIER_PRODUCT_ENTRIES: { label: string; url: string; note: string }[] = [
  {
    label: '공급자 상품 목록',
    url: 'https://neture.co.kr/supplier/products',
    note: '등록한 상품 조회 · 수정 · 승인 상태 확인',
  },
  {
    label: '상품 등록',
    url: 'https://neture.co.kr/supplier/products/new',
    note: '상품 신규 등록',
  },
  {
    label: '대량 등록',
    url: 'https://neture.co.kr/supplier/products/bulk',
    note: 'CSV · 엑셀 일괄 등록',
  },
  {
    label: '가져오기 도우미',
    url: 'https://neture.co.kr/supplier/products/import-assistant',
    note: '외부 상품 정보 붙여넣기 자동 채움',
  },
];

export default function SupplierOpsProductGuidePage() {
  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.headerIcon}>
          <Package size={20} style={{ color: '#2563EB' }} />
        </div>
        <div>
          <h1 style={s.title}>공급자 상품 안내</h1>
          <p style={s.subtitle}>이 화면에서는 공급자 상품을 직접 등록하지 않습니다.</p>
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionTitle}>상품 등록은 Neture 공급자 화면에서 합니다</h2>
        <p style={s.body}>
          공급자 상품의 등록·수정·승인 요청은 Neture 공급자 원장이 담당합니다. 운영자 콘솔은
          등록된 상품을 검수하고 서비스별 노출·공급 정책을 관리합니다.
        </p>

        <div style={s.roleGrid}>
          <div style={s.roleBox}>
            <p style={s.roleLabel}>공급자</p>
            <p style={s.roleDesc}>상품 등록 · 정보 보강</p>
          </div>
          <div style={s.roleBox}>
            <p style={s.roleLabel}>운영자</p>
            <p style={s.roleDesc}>검수 · 승인 · 노출 정책 관리</p>
          </div>
          <div style={s.roleBox}>
            <p style={s.roleLabel}>매장 경영자</p>
            <p style={s.roleDesc}>공급 상품 선택 및 매장 적용</p>
          </div>
        </div>
      </div>

      <div style={s.card}>
        <h2 style={s.sectionTitle}>Neture 공급자 상품 화면</h2>
        <p style={s.body}>공급자 계정으로 로그인한 뒤 아래 화면에서 진행하세요.</p>
        <div style={s.linkList}>
          {SUPPLIER_PRODUCT_ENTRIES.map((e) => (
            <a
              key={e.url}
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              style={s.linkRow}
            >
              <div style={{ minWidth: 0 }}>
                <p style={s.linkService}>{e.label}</p>
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
        운영자 콘솔의 공급자 상품 목록·등록 화면은 실제 저장 API 가 없어 안내로 대체했습니다
        (`WO-O4O-SUPPLIEROPS-PRODUCT-CREATE-LEGACY-UI-GUIDE-V1`).
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
  title: { fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 },
  subtitle: { fontSize: 13, color: '#6B7280', margin: '2px 0 0' },
  card: {
    backgroundColor: '#fff',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 8px' },
  body: { fontSize: 13, lineHeight: 1.7, color: '#4B5563', margin: '0 0 16px' },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 8,
  },
  roleBox: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: '10px 12px' },
  roleLabel: { fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 },
  roleDesc: { fontSize: 12, color: '#6B7280', margin: '2px 0 0', lineHeight: 1.5 },
  linkList: { display: 'flex', flexDirection: 'column', gap: 8 },
  linkRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    textDecoration: 'none',
    color: 'inherit',
  },
  linkService: { fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 },
  linkNote: { fontSize: 12, color: '#6B7280', margin: '2px 0 0' },
  linkUrl: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 12,
    color: '#2563EB',
    whiteSpace: 'nowrap',
  },
  footnote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', margin: '8px 0 0' },
};
