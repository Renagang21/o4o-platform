# WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1

> **유형:** 구현 (중복 제거 refactor — 기능 변화 없음)
> **선행:** [IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1](../investigations/IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md), [WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1](WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1.md), [WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1](WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1.md)
> **작성일:** 2026-06-13
> **CHECK 산출물:** `docs/checks/CHECK-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1.md`

---

## 1. 목적
4서비스에 분산된 footer legal profile loader(`loadFooterLegal`) 중복을 공통 factory로 정리 + Neture footer 계열 dead code 정리. Footer Core 아님 — loader/사용 방식만 얇게 정비. **화면 결과 불변.**

## 2. 핵심 원칙
디자인·링크·법정정보 표시 결과 불변 · `PublicLegalFooterInfo` 계속 사용 · backend/API/DB 미수정 · route 미변경 · Footer Core 미생성 · 중복 loader/footer만 정리 · 기능 변화 없는 refactor.

## 3. 조사 결과
- `loadFooterLegal`: **GP/KCos/Neture 3개 byte-동일**(axios `api.get('/public/services/:key/footer-legal')` → `res.data?.data ?? null`). **KPA만 plain `fetch(${API_BASE}/api/v1/...)` → `json?.data ?? null`**.
- `@o4o/shared-space-ui`: `main`/`types`=`./src/index.ts` (**소스 직접 소비, dist 빌드 불필요**). exports=`{".":"./src/index.ts"}`.
- Neture footer: NetureLayout 임베드(공개 주력)·MainLayout 임베드(`/o4o/*`)는 **서로 다른 layout**(중복 아님). standalone `components/Footer.tsx`는 **import 0건 = dead code**.

## 4. 설계
### 4.1 공통 factory (신규)
`packages/shared-space-ui/src/legal/footerLegalLoader.ts`:
```ts
export function createFooterLegalLoader(
  fetchBody: (path: string) => Promise<{ data?: PublicLegalProfileDto | null } | null | undefined>,
): (serviceKey: string) => Promise<PublicLegalProfileDto | null>
```
책임: serviceKey path 조립 → `fetchBody` 호출 → `body?.data ?? null`, 오류 → null. **placeholder/실값 fallback 없음, UI 미담당, serviceKey 조건문 없음.** index.ts에서 export.

### 4.2 서비스 어댑터 (얇게)
- GP/KCos/Neture: `export const loadFooterLegal = createFooterLegalLoader(async (path) => (await api.get(path)).data);` (axios body unwrap)
- KPA: `createFooterLegalLoader(async (path) => { const r = await fetch(\`${API_BASE}/api/v1${path}\`); return r.ok ? r.json() : null; })`
- module-level const → useEffect dep 안정성 유지(인라인 arrow 아님).

### 4.3 Neture dead code 정리
- `services/web-neture/src/components/Footer.tsx`(import 0건) 제거.
- NetureLayout/MainLayout 임베드 footer는 **유지**(서로 다른 layout, 렌더 결과 불변).

## 5. endpoint
기존 `/api/v1/public/services/:serviceKey/footer-legal` 그대로. response shape/ backend 불변. serviceKey만 서비스별 전달.

## 6. 제외
PublicFooterCore / GP-KCos Core / 4서비스 footer 통합 / 디자인·링크 변경 / `PublicLegalFooterInfo` UI 변경 / backend·API·DB·migration / Admin 설정 / 법정정보 실값 / Neture ContactPage 추가 변경.

## 7. 검증
4서비스 footer 렌더 불변 · 전부 `PublicLegalFooterInfo` 유지 · local `loadFooterLegal` 중복 제거(공통 factory 사용) · 실값 fallback 없음 · 값 없/오류 시 비표시 · placeholder 재등장 없음 · 이전 WO 링크 유지(Neture `/about` 없음, GP `/education` 없음, KPA `/policy`) · backend 미수정 · 디자인 불변 · 4서비스 tsc 통과 · 변경 서비스 배포 · 가능 시 브라우저 smoke.

## 8. Smoke
배포 후 GP `/`(`/lms` 유지·legal 정상), KCos `/`, KPA `/`(`/policy` 유지), Neture `/`·`/contact`(`/about` 없음·하드코딩 없음·legal 정상). 공통 package 변경이라 4서비스 전부 확인 권장.

## 9. 배포
`packages/shared-space-ui` 변경 → 4 web 서비스 영향. detect-changes가 일부 skip 가능 → 각 web 재배포 확인, 필요 시 `workflow_dispatch`로 명시 배포.

## 10. staged 가드
허용: `packages/shared-space-ui/**`, `services/web-*/**`, CHECK. **금지: `apps/api-server/**`.** commit 명시 경로.

## 11. CHECK 문서
`docs/checks/CHECK-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1.md` — 목적·선행 반영·loader 중복 조사·공통 loader 위치·서비스별 적용·Neture footer 중복 조사·단일화 결과·디자인 불변·링크 불변·legal block 유지·placeholder 재등장 없음·backend 미수정·tsc·smoke·배포·commit.

## 12. 후속
1. `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1` — GP/KCos 한정 FooterCore
2. `CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1` — Footer 정비 완료 마일스톤

---

*End of WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1*
