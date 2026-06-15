# CHECK-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1

> **작업명:** WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1
> **유형:** 기능 추가 — 서비스별 "약국 대상 서비스 여부" DB 정책 + admin.neture.co.kr 설정 화면 + 후속 gate 용 helper. **gate 실제 적용은 제외**(다음 WO).
> **결과: PASS — `service_audience_policies` 전용 테이블(serviceKey UNIQUE, is_pharmacy_target_service) + 4서비스 seed(kpa-society/glycopharm=true, k-cosmetics/neture=false) + neture:admin API(GET list / PUT :serviceKey) + web-neture 로컬 admin 페이지(/admin/settings/service-audience) + `isPharmacyAudienceService()` helper(후속 의약품 gate 기준). api-server typecheck 0 · web-neture build ✓.**
> 선행 조사: 사용자 승인(후보 A 단순형 + web-neture 로컬 페이지) — 2026-06-15

---

## 1. 조사 결론 (구현 전 확정)

- 서비스 key SSOT = **코드 상수** `service-catalog.ts`(DB 아님). per-service 설정 DB 패턴은 이미 3종(`service_legal_profiles`/`service_policy_documents`/`service_contact_settings`) 존재 → 동일 패턴 재사용.
- **기존 하드코딩 발견:** `offer.service.ts:67` `PHARMACY_ALLOWED_SERVICE_KEYS=['glycopharm','kpa-society']` + `assertPharmacyOnlyServiceKeys`(createSupplierOffer 시 의약품 비약국 차단). **본 정책이 이를 대체할 SSOT** — 후속 gate WO 에서 교체.
- **사용자 결정:** DB 후보 **A 단순형**(`is_pharmacy_target_service` boolean) + admin UI **web-neture 로컬 페이지**(shared operator-core-ui 미사용 — Neture admin 전용 platform 설정).

## 2. 구현 요약

- 전용 테이블 `service_audience_policies`(serviceKey당 1 row, UNIQUE) — `is_pharmacy_target_service` boolean + `note` + `updated_by`.
- migration 에 **4서비스 초기값 seed**(idempotent `ON CONFLICT DO NOTHING`): kpa-society/glycopharm=true, k-cosmetics/neture=false (기존 하드코딩과 정합).
- `ServiceAudienceService`: list(카탈로그×정책 병합) / get / upsert / **`isPharmacyAudienceService(serviceKey)`**(row 부재 시 레거시 상수 fallback — 후속 gate 안전 기준).
- neture:admin API + web-neture 로컬 admin 페이지(서비스별 약국 대상 토글 + 메모).
- **gate 실제 적용·B2B/판매자모집/서비스등록 흐름 변경 없음**(WO 제외 범위 준수).

## 3. 변경 파일 (12)

**Backend (7)**
| 파일 | 변경 |
|------|------|
| `.../neture/entities/ServiceAudiencePolicy.entity.ts` | **신규** entity(`service_audience_policies`) |
| `.../neture/entities/index.ts` | export |
| `database/connection.ts` | entities 등록 |
| `database/migrations/20260615160000-CreateServiceAudiencePolicies.ts` | **신규** — 테이블 + UNIQUE + 4서비스 seed |
| `.../neture/services/service-audience.service.ts` | **신규** — list/get/upsert + `isPharmacyAudienceService` helper |
| `.../neture/controllers/admin-service-audience.controller.ts` | **신규** — GET `/` · PUT `/:serviceKey` (requireAuth + neture:admin) |
| `.../neture/neture.routes.ts` | `/admin/service-audience-policies` 마운트 |

**Frontend (4)**
| 파일 | 변경 |
|------|------|
| `web-neture/src/lib/api/admin.ts` | `serviceAudiencePolicyApi`(list/update) + 타입 |
| `web-neture/src/pages/admin/ServiceAudiencePolicyPage.tsx` | **신규** 로컬 admin 페이지(토글+메모) |
| `web-neture/src/config/operatorMenuGroups.ts` | admin system 메뉴 "약국 대상 서비스 설정" |
| `web-neture/src/App.tsx` | lazy import + `/admin/settings/service-audience` route |

**Docs (1)**: 본 CHECK.

## 4. API

- `GET  /api/v1/neture/admin/service-audience-policies` → 카탈로그 전 서비스 + 정책 병합 목록(`{serviceKey, serviceName, isPharmacyTargetService, note, updatedAt, persisted}`).
- `PUT  /api/v1/neture/admin/service-audience-policies/:serviceKey` → upsert(`{isPharmacyTargetService?, note?}`).
- 가드: `requireAuth` + `requireNetureScope('neture:admin')`.

## 5. 초기값/seed

- migration seed 로 4서비스 명시 주입(idempotent). row 부재 시 helper 는 `['glycopharm','kpa-society']` fallback → seed 전·신규 서비스에도 안전.
- 기존 무-seed 패턴과 달리 seed 한 이유: 본 정책은 초기값이 **정책적으로 확정**(약국=kpa-society/glycopharm)되어 gate 기준의 정확성이 필요.

## 6. 후속 gate 연결 (이번 WO 제외, 참조용)

- 다음 WO(WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1): `offer.service.ts assertPharmacyOnlyServiceKeys` 의 하드코딩 `PHARMACY_ALLOWED_SERVICE_KEYS` 를 `ServiceAudienceService.isPharmacyAudienceService()` 참조로 교체. 적용 지점: createSupplierOffer(기존) + submitForApproval/createPendingApprovals(서비스별 승인). 의약품 판단: `product_masters.regulatory_type='DRUG'`/`drug_category`.

## 7. 제외 범위 (WO 준수)

의약품 service gate 실제 적용 / B2B·판매자 모집·서비스 등록 기능 / 가격 정책 / Product·Offer·Approval·Listing 구조 / operator-core-ui shared 컴포넌트 / 다른 서비스 admin 연결 / package.json·lock. **모두 미수행.**

## 8. 검증

- **api-server:** `tsc --noEmit` **0 errors** ✅
- **web-neture:** `build ✓ (~11s)` ✅
- **정적:** entity/migration/service/controller/route 신규, 기존 흐름(offer/approval/supplier) 무변경. helper 는 정의만(아직 미호출 — 후속 gate). 메뉴/route 1줄씩 additive.
- **browser/DB smoke:** 미수행 — dev·인증 guard. **배포 후 권장:** ① `/admin/settings/service-audience` 4서비스 표시·토글·메모 저장 ② (read-only) `service_audience_policies` 테이블·4 seed row 확인(gcloud) ③ 기존 admin 설정 화면 회귀 없음.

## 9. 완료 판정 / 후속

**PASS.** 약국 대상 서비스 여부 DB 정책 + admin 설정 + 후속 gate helper foundation. gate 미적용(다음 WO), 기존 흐름 무변경.

**커밋:** path-specific 12파일 · `<commit>`.
**차기 WO:** **WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1** — 의약품 제품을 B2B/서비스 승인/판매자 모집으로 연결 시 대상 serviceKey 가 약국 대상인지 `isPharmacyAudienceService` 로 검증, 비약국이면 차단(하드코딩 상수 교체).

---

*Date: 2026-06-15 · 기능 추가 PASS · 약국 대상 서비스 정책(service_audience_policies, 4서비스 seed) + neture:admin API + web-neture 로컬 설정 페이지 + isPharmacyAudienceService helper. gate 미적용(후속). api-server typecheck 0 · web-neture build ✓. 배포 후 smoke 권장.*
