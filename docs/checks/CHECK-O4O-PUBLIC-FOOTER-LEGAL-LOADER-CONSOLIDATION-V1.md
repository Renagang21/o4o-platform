# CHECK-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1

> **WO:** [WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1](../work-orders/WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1.md)
> **선행:** [IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1](../investigations/IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md) · LINK-GUARD · LEGAL-GUARD
> **작성일:** 2026-06-13
> **상태:** ✅ **완료** — 구현 + 4서비스 tsc + 4서비스 배포 + 엔드포인트 sanity 전부 PASS. (순수 refactor, 동작 불변.)

## 1. 목적
4서비스 분산 `loadFooterLegal` 중복을 공통 factory로 정리 + Neture dead footer 제거. Footer Core 아님. 화면 결과 불변.

## 2. 선행/IR 반영
IR에서 footer 법정정보는 이미 `PublicLegalFooterInfo` + `service_legal_profiles` 공통. LINK-GUARD(dead link)·LEGAL-GUARD(ContactPage 하드코딩) 이후, 남은 loader 중복·Neture footer 중복만 정리.

## 3. loader 중복 조사
- GP/KCos/Neture: **byte-동일**(axios `api.get('/public/services/:key/footer-legal')` → `res.data?.data ?? null`).
- KPA: plain `fetch(${API_BASE}/api/v1/...)` → `json?.data ?? null`.
- `@o4o/shared-space-ui`: `main`/`types`=`./src/index.ts` (소스 직접 소비, dist 빌드 불필요).

## 4. 공통 loader 위치
- 신규 `packages/shared-space-ui/src/legal/footerLegalLoader.ts` — `createFooterLegalLoader(fetchBody)`. `index.ts` export.
- 계약: serviceKey path 조립 → `fetchBody` → `body?.data ?? null`, 오류 → null. **placeholder/실값 fallback 없음, serviceKey 조건문 없음, UI 미담당.**

## 5. 서비스별 적용
| 서비스 | 어댑터 | 비고 |
|--------|--------|------|
| GlycoPharm | `createFooterLegalLoader(async p => (await api.get(p)).data)` | axios body unwrap |
| K-Cosmetics | 동일 | axios |
| Neture | 동일 | axios |
| KPA Society | `createFooterLegalLoader(async p => { const r = await fetch(\`${API_BASE}/api/v1${p}\`); return r.ok ? r.json() : null; })` | fetch |
- 전부 `module-level const` → useEffect dep 안정성 유지. `PublicLegalFooterInfo` 사용 불변.

## 6~7. Neture footer 중복 조사·단일화
- NetureLayout 임베드(공개 주력)·MainLayout 임베드(`/o4o/*`)는 **서로 다른 layout** → 유지(중복 아님, 렌더 불변).
- standalone `components/Footer.tsx`: **import 0건(barrel/dynamic 포함) = dead code** → **제거**.

## 8~10. 불변 확인
- Footer 디자인 변경 없음 · Footer link 변경 없음(이전 WO 결과 유지: Neture `/about` 없음, GP `/education` 없음, KPA `/policy`) · legal block 동작 유지 · placeholder/하드코딩 재등장 없음 · backend/API/DB 미수정.

## 11. 정적 검증
| 대상 | 결과 |
|------|------|
| web-glycopharm tsc | ✅ 0 |
| web-k-cosmetics tsc | ✅ 0 |
| web-kpa-society tsc | ✅ 0 |
| web-neture tsc | ✅ 0 |
> (다른 세션 store-ui-core WIP 위양성 제외. 본 작업 파일 신규 에러 0.)

## 12. 엔드포인트 sanity (동작 불변 근거)
- 4서비스 `GET /api/v1/public/services/:key/footer-legal` 전부 `{ success:true, data:null }`(법정정보 미설정 → 비표시). factory가 기대하는 `{data}` shape 일치 → `body?.data ?? null` = null. refactor 전후 동일(legal block 비표시).

## 13. 배포
| 대상 | 결과 |
|------|------|
| Deploy Web Services (공통 패키지 변경 → 4서비스) | ✅ deploy-neture/glycopharm/k-cosmetics/kpa-society **전부 success** |
> backend 무변경 → API/migration 대상 없음.

## 14. 브라우저 UI smoke
- Playwright 점유로 시각 렌더 확인 보류. 순수 refactor(동작 동일) + 4서비스 tsc 0 + 4서비스 배포 success + 엔드포인트 shape 일치로 갈음. 브라우저 가용 시 4서비스 `/` footer 1회 확인 권장.

## 15. Commit
- WO: `798e01f19`. 코드: `26c3db249`(7 files: factory+index+4 adapters+dead Footer 삭제, net −35줄). 본 CHECK: 별도 path-specific.

## 16. 후속
1. `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1` — GP/KCos 한정 얇은 FooterCore
2. `CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1` — Footer 정비 완료 마일스톤

---
*End of CHECK-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1*
