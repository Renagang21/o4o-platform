# CHECK-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-FRONTEND-FIX-V1

> **유형:** CHECK (frontend 소규모 fix)
> **작성일:** 2026-06-13
> **WO:** WO-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-FRONTEND-FIX-V1
> **선행:** [IR-...-SERVICEKEY-LABELING-AUDIT-V1](../investigations/IR-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-LABELING-AUDIT-V1.md) · [CHECK-...-CONTAMINATION-COUNT-V1](./CHECK-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-CONTAMINATION-COUNT-V1.md)
> **상태:** ✅ **완료** — GP frontend service_key 명시 전송 보정, glycopharm-web tsc 0 errors.

## 1. 목적

GlycoPharm Supply Catalog frontend 가 apply/catalog 요청에 canonical `service_key:'glycopharm'` 을 명시 전송하도록 보정한다. backend 기본값(`'kpa-society'`) 의존을 제거하여, 향후 GP 신규 신청/조회가 올바른 service_key 로 저장·조회되게 한다. K-Cosmetics 패턴과 대칭.

## 2. 선행 IR/CHECK 기준

- IR: GP frontend 가 service_key 미전송 → backend 기본값 `'kpa-society'` 오염. 수정은 frontend 전송이 정답(backend mount-fallback 은 KPA/KCos 규약 불일치로 불가).
- CHECK(count): production `product_approvals`·OPL 기존 오염 count = **0** → backfill/remediation 불필요. 신규 데이터 방지만 필요.

## 3. 수정 범위

| 파일 | 변경 |
|---|---|
| [services/web-glycopharm/src/api/pharmacyProducts.ts](../../services/web-glycopharm/src/api/pharmacyProducts.ts) | `applyBySupplyProductId` body + `getCatalog` query 에 `service_key:'glycopharm'` 추가 |

타입 파일 변경 없음(기존 `ProductApplication.service_key: string` 그대로). backend/DB/migration/KPA/KCos/Neture 무변경.

## 4. K-Cosmetics 대조

| 항목 | K-Cosmetics | GlycoPharm 수정 후 | 판정 |
|---|---|---|---|
| apply 전송 | body `{ supplyProductId, service_key: 'k-cosmetics' }` (pharmacyProducts.ts:70-72) | body `{ supplyProductId, service_key: 'glycopharm' }` | ✅ 대칭 |
| getCatalog 전송 | query `searchParams.set('service_key','k-cosmetics')` (line 60) | query `searchParams.set('service_key','glycopharm')` | ✅ 대칭 |
| backend 수신 | 공유 컨트롤러 `body.service_key`(apply) / `query.service_key`(catalog) | 동일 공유 컨트롤러 | ✅ 동일 endpoint |

shared `/pharmacy/products/catalog` 는 KCos 가 이미 `service_key` query 를 전송 중이므로 GP `'glycopharm'` 전송도 검증된 동작(`resolveServiceKeyFromQuery` 유효 키).

## 5. GlycoPharm apply service_key 보정

```ts
// before
const res = await api.post('/glycopharm/pharmacy/products/apply', { supplyProductId });
// after
const res = await api.post('/glycopharm/pharmacy/products/apply', {
  supplyProductId,
  service_key: 'glycopharm',
});
```
→ SERVICE/PRIVATE 신청이 `product_approvals.service_key='glycopharm'` 로, PUBLIC 이 OPL `service_key='glycopharm'` 로 저장됨(backend `resolveServiceKeyFromBody` 가 body 값 사용).

## 6. GlycoPharm catalog service_key 보정

```ts
const searchParams = new URLSearchParams();
searchParams.set('service_key', 'glycopharm');   // 추가
...
```
→ catalog 조회도 canonical key 명시(KCos 대칭). 현재 `/catalog` 핸들러는 service_key 로 필터하지 않으나, 기본값 비의존 + 향후 service-scoped 조회 대비.

## 7. 제외/무변경 항목

backend / DB / migration / KPA / K-Cosmetics / Neture / ProductApprovalV2Service / operator product-applications route / GP·KCos operator approval surface / menu config / storefront·channel·OPC / checkout·order·cart / EventOffer / 유통참여형 펀딩·Market Trial — **전부 무변경.** operator surface enable 미재개.

## 8. 검증 결과

- ✅ `pnpm --filter glycopharm-web exec tsc --noEmit` → **0 errors** (exit 0).
- ✅ 정적: GP apply body 에 `service_key:'glycopharm'` 포함, getCatalog query 에 포함 확인.
- ✅ KCos 변경 0건, backend 변경 0건, DB/migration 0건.
- ✅ diff = `services/web-glycopharm/src/api/pharmacyProducts.ts` 단일 파일(+9/-1, 주석 포함).
- 주의: 동시 세션 footer-core/LMS WIP 존재(`*/lib/footerLegal.ts`, `shared-space-ui/*`, neture `Footer.tsx`, kpa `LmsCoursesPage`) — 본 WO 파일과 **무관/무중복**. path-specific staging 으로 격리.

## 9. 완료 판정

✅ **완료.** GP frontend 가 apply/catalog 양 경로에 canonical `service_key:'glycopharm'` 명시 전송. 신규 GP 데이터 라벨링 정상화. 기존 오염 count=0 이므로 보정 불필요. tsc PASS.

## 10. 후속 작업

보류 중 WO 재개:
```
WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1
  Phase 1 ✅ (677a9e61c, backend controller serviceKey/scope 일반화)
  Phase 2  GP/KCos backend route mount
  Phase 3  frontend 공통 콘솔 추출 (packages/operator-core-ui)
  Phase 4  GP/KCos operator pages
  Phase 5  GP/KCos route/menu 노출
```
GP 라벨링 정상화 완료로 GP operator surface 를 `serviceKey='glycopharm'` 로 안전하게 열 수 있음. KCos 는 독립 enable 가능.

---
*End of CHECK-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-FRONTEND-FIX-V1*
