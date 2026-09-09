# CHECK — WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1

> **상태**: CLOSED — 코드 · DB · GCP · DNS 전 축 삭제 완료
> **작성일**: 2026-09-08 · **갱신**: 2026-09-09
> **기준선**: `origin/main` = `7971407f0` (CI green anchor `a7914fd12`)
> **작업 격리**: worktree `C:/tmp/o4o-gp-erasure` · branch `work/glycopharm-complete-erasure-v1`

---

## 1. 목적

GlycoPharm(`glycopharm.co.kr` / `serviceKey='glycopharm'`)을 O4O 플랫폼에서 완전히 삭제한다.
종료 안내 · 리다이렉트 · 데이터 이전 · 호환성 유지는 만들지 않는다.

승인된 선행 결정(사용자, 2026-09-08):

| 항목 | 결정 |
|---|---|
| `store_blog_*` | 공통 Store 도메인으로 relocate (삭제 금지) |
| Neture 파트너 모집 | GlycoPharm 상품 의존부만 제거, 모집 본체는 유지 |
| SSL 인증서 | GlycoPharm SAN 제외한 새 인증서로 교체 |
| DNS · 도메인 | 작업자는 GCP 까지, 등록기관은 소유자 직접 |
| 공용 `users` | 삭제 범위 제외 |

---

## 2. 조사 실측 (삭제 전)

### 2-1. 전용 자산

| 축 | 실측 |
|---|---|
| 프론트엔드 | `services/web-glycopharm/` 304 파일 — 외부 import 0 |
| 백엔드 | `routes/glycopharm/` 57 · `modules/glycopharm/` 1 · `middleware/glycopharm-scope.middleware.ts` |
| 관리자 | `apps/admin-dashboard/src/pages/glycopharm/` 7 |
| 배포 | `deploy-glycopharm` job · Cloud Run `glycopharm-web` · `neg-glycopharm-web` · `backend-glycopharm-web` · `path-matcher-glycopharm` |
| DB 전용 | 테이블 13 + view 1 |

`apps/glycopharm-web/` 은 **추적되지 않는 빌드 잔여물**(dist + node_modules)이며 정본이 아니다.

### 2-2. 운영 DB 실측 (2026-09-08)

```text
전용 테이블 총 9행
  glycopharm_applications 4 / glycopharm_contents 4 / glycopharm_members 1
  나머지 10개 테이블 전부 0행 (glycopharm_products = 0)

공유 테이블 service_key='glycopharm' 총 305행
  action_logs 191 · cms_contents 66 · notifications 13 · roles 7
  password_reset_tokens 6 · service_memberships 4 · service_credentials 4
  contact_inquiries 4 · organization_product_listings 2 · 기타 8

role_assignments(glycopharm:*) 7 · organization_service_enrollments 2
platform_services 1 · organizations(GlycoPharm division) 1
```

---

## 3. 잘못된 경계에서 꺼낸 공통 자산 (삭제 아님)

WO 중지 조건 ①의 해소. 삭제에 앞서 **먼저 꺼냈다.**

| 자산 | 이전 위치 | 새 위치 | 근거 |
|---|---|---|---|
| `StoreBlogPost` · `StoreBlogSettings` | `routes/glycopharm/entities/` | `modules/store/entities/` | KPA · K-Cosmetics · PharmacyHub · o4o-store · hub-content 소비 |
| `TemplateProfile` · `StoreBlockType` · `StoreBlock` | `routes/glycopharm/entities/glycopharm-pharmacy.entity.ts` | `modules/store/types/store-template.ts` | KPA store template · store layout · store-public 소비 |
| bare role `pharmacy` · `customer` · `supplier` · `partner` | `roles.service_key='glycopharm'` | `neture` / `platform` 로 재귀속 | 실측: supplier 6 · customer 8 · pharmacy 2 배정이 살아 있고 Neture 공급자가 보유 |

**테이블명 · 스키마 · 데이터는 변경하지 않았다.** 파일 이동 + import 갱신 + entity registry 재지정만 수행.
중복 entity 등록 기간 없음 (`check-typeorm-entities.mjs` 통과).

---

## 4. Neture 결합부 처리

| 대상 | 처분 | 근거 |
|---|---|---|
| `GET /partner/recruiting-products` | 삭제 | `GlycopharmRepository.findPartnerRecruitingProducts()` 유일 소비 |
| `operator-recruiting.controller.ts` (전체) | 삭제 | 파일 전체가 `GlycopharmProduct` mutation |
| `RecruitingProductsPage` · `RecruitingProductsOverviewPage` | 삭제 | 위 API 외 데이터원 없음 |
| `recruitingApi` · `RecruitingProduct` | 삭제 | 소비처 0 |
| `partner-dashboard.controller.ts` | **유지** — 상품 enrichment만 제거 | 콘텐츠 링크 계열은 GlycoPharm 무관 |
| `PartnerDashboardItem.productName/category/price/pharmacyName` | 삭제 | glycopharm_products 파생 필드 |
| Neture 파트너 모집 본체 (`neture_partner_recruitments`) | **유지** | offer/ProductMaster 축 — GlycoPharm 무관 |

`neture_partner_dashboard_items` · `neture_partner_recruitments` 모두 프로덕션 0행 — 운영 영향 없음.
대체 데이터원 · 신규 ProductMaster adapter 는 만들지 않았다.

---

## 5. 추가로 제거한 껍데기 (판단 기록)

소비처가 GlycoPharm 뿐이어서 제거 후 기능이 남지 않는 경로:

| 대상 | 근거 |
|---|---|
| `GET /api/v1/home/preview` (`modules/home/`) | glycopharm 조직 해석 + `glycopharm_products` 집계 전제 · 프런트 소비처 0 |
| `/api/v1/store-hub/ai` 라우터 (`modules/store-ai/controllers/store-ai.controller.ts`) | 가드가 `serviceKey='glycopharm'` 고정 · 코드 주석이 web-glycopharm 을 유일 소비처로 명시 · 프런트 호출 0 |
| `apps/admin-dashboard/src/api/service-applications.ts` + 페이지 2 + 라우트 2 | `ServiceType = 'glycopharm'` 단일 멤버 |
| `controllers/forum/forum-organizations.ts` | `FORUM_ORGS` 가 GLYCOPHARM 단일 · importer 0 |

`modules/store-ai` 의 **product-ai-\* 계열은 Neture 상품 DB 가 사용하므로 유지**했다.

### 응답 shape 보존 (소비처 회귀 방지)

`GET /{store}/:slug` (store-public-home) 의 `productCount` · `logo` · `hero_image` 는
`glycopharm_products` · `glycopharm_pharmacy_extensions` 가 유일 출처였고 **둘 다 프로덕션 0행**이라
이미 모든 매장에 0/null 을 반환하고 있었다. KPA · K-Cos 블로그 og:image 소비처의 shape 를
깨지 않기 위해 **키는 유지하고 값은 상수(0/null)로** 두었다. 대체 데이터원은 만들지 않았다.

---

## 6. 삭제 범위 — 코드

```text
파일 삭제      404
파일 수정      302
파일 이동        2 (store_blog_* entity)
신규             2 (store-template.ts · DROP migration)
```

주요 계약 제거:

- `SERVICE_KEYS.GLYCOPHARM` · `SERVICE_KEYS.GLYCOPHARM_EVENT_OFFER` · `GLYCOPHARM_OPL_SERVICE_KEYS`
- `GLYCOPHARM_SCOPE_CONFIG` (@o4o/security-core)
- `types/roles.ts` GlycoPharmRole → `LegacyBareRole` 로 재정의
- `config/service-scopes.ts` glycopharm scope · `config/service-catalog.ts` 카탈로그 항목
- `TARGET_TO_EVENT_OFFER_KEY` / `TARGET_SERVICE_LABEL` / `RETAIL_ORDER_SERVICE_KEYS` 의 glycopharm 축
- `StoreOwnerServiceKey` union (api-server · store-ui-core) · `STORE_SERVICE_ORG_LINKAGE`
- CORS allowlist(`setup-middlewares.ts`) · 쿠키 도메인(`cookie.utils.ts`) · slug 예약어
- `GLYCOPHARM_STORE_CONFIG` (store-ui-core) · guide copy · operator-ux-core serviceConfig · templates
- 가입 시 `glycopharm_applications`/`glycopharm_members` 자동 생성 · 운영자 알림

배포 경로:

- `deploy-web-services.yml` — `deploy-glycopharm` job · path filter · detect-changes · env · summary
- `ci-pipeline.yml` — web-glycopharm Vitest step
- `e2e-auth-runtime.yml` — GlycoPharm credential 게이트 · AuthContext path filter

---

## 7. 잔류 문자열 분류

`glycopharm` 문자열은 **의도적으로 남긴 3개 부류**를 제외하고 제거했다.

| 분류 | 위치 | 처분 근거 |
|---|---|---|
| 적용 완료 migration 이력 | `apps/api-server/src/database/migrations/` 99 파일 | 이미 적용된 과거 기록. 파일 삭제는 이력을 지울 뿐 스키마를 되돌리지 않으며 `migrations` 테이블과 어긋난다 |
| 과거 WO 감사 증적 | `docs/checks/` · `docs/investigations/` · `docs/ir/` · `docs/archive/` · `tmp/**` | CLAUDE.md §16-1 — 기록물은 정비 대상이 아니다 |
| 공통화 이력 주석 | `packages/store-ui-core` · `shared-space-ui` · `account-ui` 등의 `WO-...-GLYCOPHARM-...` 주석 | 공통 컴포넌트가 왜 존재하는지에 대한 출처 기록. 제거 시 추적성 손실 |

**서비스 계약(라우트 · 서비스 키 · role · 도메인 · 배포)에는 잔류 0.**

---

## 8. 검증 결과

| 게이트 | 결과 |
|---|---|
| `pnpm run build:packages` | ✅ |
| `pnpm --filter '@o4o/api-server^...' run build` | ✅ |
| `pnpm --filter @o4o/api-server run type-check` | ✅ 0 errors |
| `pnpm run type-check:frontend` | ✅ OK |
| `pnpm run typecheck:app-store-packages` | ✅ |
| `node scripts/lint-ratchet.mjs` | ✅ 51 errors (baseline 51 유지) |
| `node scripts/check-typeorm-entities.mjs` | ✅ DEFINED_BUT_UNREGISTERED 0 / 중복 0 / stale 0 |
| api-server Jest (전체) | ✅ (§8-1) |
| admin-dashboard Vitest | ✅ 13 files / 230 tests |
| packages/ui · auth-utils · auth-react · store-ui-core · operator-core-ui · shared-space-ui | ✅ |
| packages/account-ui · asset-copy-core Jest | ✅ 20 / 64 |
| services/web-kpa-society Vitest | ✅ 14 |
| api-server multi-tenant Vitest | ✅ 75 |

`node scripts/check-forbidden-tables.mjs` 는 위반 2건(`o4o_payments` · `neture_settlement_orders`)을
보고하지만 **GlycoPharm 과 무관한 선행 상태**이고 CI 게이트가 아니다 (ci-pipeline 미등록).

### 8-1. 수정한 계약 테스트

raw-source 계약 spec 이 GlycoPharm 파일·키를 단언하고 있어 함께 정비했다.
**단언을 약화한 것이 아니라 모집단에서 GlycoPharm 축을 뺐다.**

- 삭제: `glycopharm-billing-invoices` · `glycopharm-featured-products` ·
  `glycopharm-forum-service-boundary` · `security/isolation` (전부 GlycoPharm 전용)
- 픽스처 재지정: GlycoPharm 을 임의의 "타 서비스" 샘플로 쓰던 spec 은 `pharmacy-hub` / `k-cosmetics` 로 교체
- 개수 계약 갱신: `admin-route-auth-boundary` 8 → 6 · `service-legal-scope` 5 → 4 ·
  `listing-service-key` 4 → 3 · `store-service-key-residual` 3 → 2 · `forum-owner-area` LOC 3103 → 2177
- 신규 가드: `b2b-remaining-debt-final-closure` 에 `routes/glycopharm` **비존재** 단언 추가

### 8-2. 부수 발견 (수정 안 함 · 별도 WO 후보)

`MembershipApprovalService` 의 `ALL_SERVICE_KEYS` / `ALL_SERVICE_KEYS_H` 에
**`pharmacy-hub` 가 원래부터 없다.** 플랫폼 관리자 전체 탈퇴 시 PH role 이 회수되지 않는다.
GlycoPharm 과 무관한 선행 갭이라 이번 범위에서 건드리지 않았다.

---

## 9. DB 삭제 계약

`20270326000000-DropGlycopharmService.ts` — main 배포 성공 후 CI/CD 로 실행.

순서:

```text
1. 공용 bare role 재귀속   supplier·partner → neture / pharmacy·customer → platform
2. role_assignments LIKE 'glycopharm:%' 삭제 → roles service_key='glycopharm' 삭제
3. 공유 테이블 50곳의 service_key='glycopharm' 행 삭제 (+ glycopharm-event-offer)
4. organization_service_enrollments service_code='glycopharm' 삭제
5. platform_services code='glycopharm' 삭제
6. v_glycopharm_pharmacies DROP → 전용 테이블 13개 FK 역순 DROP
```

사전 검증 (프로덕션 실측):

- 대상 컬럼 50/50 실재 확인
- 삭제 예정 행수 = 조사 실측과 일치 (공유 305 + enrollment 2 + service 1 + assignment 7 + role 3)
- 외부 → glycopharm_* 방향 FK **0건** (glycopharm_* → users/organizations 단방향만 존재)
- 공용 `users` 는 어떤 문에서도 대상이 아니다

멱등: 모든 문 `IF EXISTS` / 조건부. `down()` 은 복원하지 않는다 (서비스 폐지).

---

## 9-A. 실행 결과 (2026-09-09)

### 배포

| 커밋 | 내용 |
|---|---|
| `83853d8d3` | 코드 삭제 본체 |
| `7a9d574da` | 마이그레이션 role 재귀속 충돌 수정 |

1차 배포에서 마이그레이션이 실패했다:
`duplicate key value violates unique constraint "idx_roles_service_role"`.
`roles` 의 unique index 는 `(service_key, role_key)` 인데 bare role `supplier`/`partner` 를
`neture` 로 옮기면 Neture 의 canonical row(`neture:supplier` → role_key `supplier`)와 충돌한다.
**트랜잭션 롤백으로 DB 는 무변경**이었고(실측 확인), `platform` 축 재귀속으로 수정해 재배포했다.
roles 삭제도 `service_key` 기준 → `name LIKE 'glycopharm:%'` 로 좁혔다.

전 워크플로 결과: CI Pipeline ✅ / Deploy API ✅ / Deploy Web Services ✅ /
Deploy Admin ✅ / CodeQL ✅ / E2E ❌(**선행 실패** — 모든 서비스 E2E secret 미설정,
이 워크플로는 이전 6회 연속 동일 사유로 실패해 왔다)

### DB (마이그레이션 적용 후 실측)

```text
glycopharm_* 테이블      0      glycopharm view            0
roles(service_key=gp)    0      role_assignments(gp:*)     0
service_memberships      0      service_credentials        0
platform_services        0      organization_enrollments   0
cms_contents             0      action_logs                0

users                   57  (불변)
bare role 4종            4  (보존)   bare 배정               15  (보존)
```

### GCP

| 자원 | 결과 |
|---|---|
| Cloud Run `glycopharm-web` | 삭제 |
| NEG `neg-glycopharm-web` | 삭제 |
| Backend `backend-glycopharm-web` | 삭제 |
| URL map hostRule + `path-matcher-glycopharm` + `api.glycopharm.co.kr` | 제거 |
| 컨테이너 이미지 130 태그 | 전량 삭제 |
| Certificate Manager 엔트리 3 | 삭제 |
| DNS authorization 3 | 삭제 |

### 인증서 — 조사 시 판단 정정

**조사 단계의 인증서 판단은 틀렸다.** `cert-final-neture-v3`(classic)는
`PROVISIONING_FAILED_PERMANENTLY` 인 **죽은 잔재**였고 실제 TLS 는 Certificate Manager
`o4o-main-cert-map` → `cm-cert-neture`(ACTIVE) 가 제공하고 있었다.

실제 수행:

```text
1. glycopharm 매핑 엔트리 3개 삭제 (공유 인증서 무접촉)
2. cm-cert-neture-v2 생성 — GlycoPharm 3개 제외한 13 도메인, DNS authz 기반
3. ACTIVE 확인 후 13개 엔트리를 v2 로 전환
4. 실측: 전 도메인 SAN 13개 · glycopharm 0 · HTTPS 14/14 = 200
5. proxy 에서 죽은 classic cert 분리 → 재실측 14/14 = 200
6. cert-final-neture-v3 · cm-cert-neture 삭제
```

무중단으로 완료했다 (중단 창 불필요).

### 프로덕션 실측

```text
/api/v1/glycopharm/**        404      /api/v1/home/preview        404
/api/v1/store-hub/ai/health  404      api /health · /auth/status  200

neture · www · admin · api / kpa-society · www / k-cosmetics · www /
glucoseview · www / pharmacyhub · www / siteguide · www   → 14/14 200

glycopharm.co.kr · www · api  → TLS 인증서 없음 (no peer certificate)
```

### 남은 관측 — DNS 의존

`glycopharm.co.kr` 은 **등록기관 DNS 가 아직 LB 를 가리키고 있어** 평문 HTTP 로는
LB 기본 백엔드(Neture)가 응답한다. hostRule 이 사라졌으므로 GlycoPharm 콘텐츠는 아니며,
HTTPS 는 인증서가 없어 성립하지 않는다. **종료 안내·리다이렉트를 만들지 않는다는 계약에 따라
LB 규칙을 추가하지 않았다.** 소유자가 DNS 를 삭제하면 해소된다.

---

## 10. 소유자 조치 영역 — 완료

### 10-1. GCP — 완료 (§9-A 참조)

### 10-2. 등록기관 — 완료 (2026-09-09 · 소유자 직접 수행)

`netureyoutube` 프로젝트에 **Cloud DNS 존이 없다.** DNS 는 외부 등록기관(가비아)에 있어
소유자가 직접 처리했다. 작업자(AI) 권한 밖이므로 실행 주체는 소유자다.

| 항목 | 결과 |
|---|---|
| 등록기관 | 가비아 |
| 삭제한 DNS 레코드 | 6건 — `glycopharm.co.kr` · `www` · `api` 의 A 레코드 + `_acme-challenge` CNAME 포함 |
| 잔여 레코드 | 0 (MX · TXT 포함) |
| 도메인 갱신 | **연장하지 않기로 확정** — 2026-12-26 자연 만료 예정 (등록기관 자동갱신 설정 화면은 작업자가 직접 확인하지 않았으므로 `AUTORENEW=OFF` 로 단정하지 않는다) |
| 주차(파킹) 페이지 | 없음 |

외부 DNS 실측 (소유자 보고):

```text
glycopharm.co.kr       → DNS 응답 없음
www.glycopharm.co.kr   → DNS 응답 없음
api.glycopharm.co.kr   → DNS 응답 없음
```

이로써 §9-A 의 "남은 관측 — DNS 의존"(평문 HTTP 가 LB 기본 백엔드로 유입되던 현상)은 해소되었다.
종료 안내 · 리다이렉트 · 주차 페이지를 남기지 않는다는 계약을 그대로 만족한다.

### 10-3. 저장소 활성 설정 잔재 정리 (2026-09-09 · 독립 점검 후속)

DNS 종결 후 독립 점검에서 **실행되는 설정에 남은 GlycoPharm 등록 정보 2건**이 확인되어 제거했다.
주석 · 문서 · 과거 migration 이 아니라 런타임에 평가되는 값이므로 §11 의
`GLYCOPHARM_SERVICE_CONTRACT = 0` 판정과 어긋나 있었다.

| 대상 | 잔재 | 처분 | 소비처 실측 |
|---|---|---|---|
| `packages/types/src/service-branding.ts` | `SERVICE_BRANDING.glycopharm` (`displayName` · `subtitle`) | 삭제 | `SERVICE_BRANDING` 직접 소비 0 (barrel `types/index.ts` re-export 만). 래퍼 `getServiceDisplayName` 은 `packages/ui` · `packages/operator-core-ui` 2곳이 쓰지만 **미등록 키는 serviceKey 를 그대로 반환**하는 fallback 이라 동작 불변 |
| `apps/api-server/src/bootstrap/setup-middlewares.ts` | CORS allowlist 의 `https://glycopharm-web-3e3aws7zqa-du.a.run.app` | 삭제 | Cloud Run 서비스가 이미 없어 도달 불가. raw-source 계약 spec(`signage-player-web-deployment-contract`)은 signage-player origin 존재만 단언하고 allowlist 개수는 단언하지 않는다 |

`node scripts/quality/check-literal-consumers.mjs` 로 두 파일의 raw-source 소비처를 함께 조사했다
(프로토콜 §3-A). `service-branding.ts` = 0건, `setup-middlewares.ts` = RAW_SOURCE_CONTRACT 1건이며
그 spec 은 이번 변경과 무관하다.

**범위 밖으로 두어 손대지 않은 것** (§7 잔류 문자열 분류 그대로): 과거 migration ·
기록물 문서 · 공통화 출처 주석 · `REMOVED` 주석 · git history.

#### 10-3-A. 재검색에서 추가로 드러난 동종 잔재 5건 — **처리 완료 (§10-4)**

위 2건을 제거한 뒤 `git grep` 으로 **주석·문서·migration 을 제외한 활성 소스**를 재검색한 결과,
같은 성격(런타임에 평가되는 표시명 · 설정 맵)의 잔재가 **5건 더** 확인되었다.
후속 WO 가 지시한 수정 대상 3파일 밖이라 **그 시점에는 고치지 않고 보고만 했다** (CLAUDE.md 실행 원칙 — 범위 외 수정 금지).
이후 `WO-O4O-GLYCOPHARM-RUNTIME-MAP-RESIDUAL-FINAL-CLOSURE-V1` 로 5건 전부 제거했다 — **§10-4**.

| # | 위치 | 잔재 | 성격 |
|---|---|---|---|
| 1 | `apps/api-server/src/common/auth/account-access.policy.ts:114` | allowlist 항목 `'GET /api/v1/glycopharm/members/me'` | 존재하지 않는 라우트에 대한 접근 허용 항목. 라우트가 없어 도달 불가 |
| 2 | `apps/api-server/src/modules/contact-inquiry/public-contact-inquiry.controller.ts:31` | `SERVICE_DISPLAY_NAME.glycopharm = 'GlycoPharm'` | 문의 이메일 제목용 표시명 맵 |
| 3 | `apps/api-server/src/modules/neture/services/neture-dashboard.service.ts:75-79` | `serviceConfig.glycopharm` — `url` · `ordersPath` · `supportEmail` · `features` | 공급자 대시보드용 서비스 설정. `https://glycopharm.neture.co.kr` · `support@glycopharm.kr` 포함 |
| 4 | `packages/ui/src/operator-user-detail/UserDetailPage.tsx:64` | `SERVICE_LABELS.glycopharm = 'GlycoPharm'` | 가입 서비스 표의 하드코딩 표시명 맵 |
| 5 | `services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx:35` | `SERVICE_KEY_LABELS.glycopharm = { text: '혈당관리', ... }` | 진열 뱃지 표시명 맵 |

**공통 성격**: 전부 `serviceKey` 를 키로 하는 **조회 맵 또는 allowlist** 이고, `glycopharm` 키를 가진
데이터·라우트·membership 이 전부 0 이라 **현재 어떤 요청도 이 항목에 도달하지 않는다.**
따라서 기능·데이터·보안 영향은 없다. 그러나 §11 의 "활성 계약 0" 을 문자 그대로 만족시키려면
제거해야 하며, 이번 WO 의 완료 조건 `GLYCOPHARM_ACTIVE_BRANDING = 0` 은
**3파일 범위만으로는 성립하지 않는다** (2 · 4 · 5 가 표시명 맵이다).

`#4` 는 이미 별도 CHECK 에 잔여로 기록돼 있던 항목이다 —
`docs/checks/CHECK-O4O-OPERATOR-USER-DETAIL-PASSWORD-SERVICEKEY-SELECTION-V1.md` §7 잔여 3
("`SERVICE_LABELS` 하드코딩 → `getServiceDisplayName` 정렬"). 이번 `SERVICE_BRANDING` 정리와
같은 축이므로 후속 WO 에서 함께 처리했다 (§10-4).

---

### 10-4. 런타임 맵 잔재 5건 제거 — WO-O4O-GLYCOPHARM-RUNTIME-MAP-RESIDUAL-FINAL-CLOSURE-V1

§10-3-A 의 5건을 **한 커밋에서 전부 제거**했다. 대체 설정·대체 fallback 은 만들지 않았다.

| # | 파일 | 제거한 것 | 제거 후 동작 |
|---|---|---|---|
| 1 | `apps/api-server/src/common/auth/account-access.policy.ts` | allowlist 항목 `'GET /api/v1/glycopharm/members/me'` 1줄 | 라우트 자체가 없으므로 도달 경로 변화 0. 공용 인증 정책이 삭제된 경로를 특별 취급하지 않는다 |
| 2 | `apps/api-server/src/modules/contact-inquiry/public-contact-inquiry.controller.ts` | `SERVICE_DISPLAY_NAME.glycopharm` | 맵은 `?? serviceKey` 성격의 미스 처리를 이미 갖고 있어 다른 서비스 제목 불변 |
| 3 | `apps/api-server/src/modules/neture/services/neture-dashboard.service.ts` | `serviceConfig.glycopharm` 전체 (`url` · `ordersPath` · `supportEmail` · `features`) | 기존 `defaultConfig` 가 그대로 미스를 받는다. **신규 fallback 추가 없음** |
| 4 | `packages/ui/src/operator-user-detail/UserDetailPage.tsx` | `SERVICE_LABELS.glycopharm` | 미등록 키는 원문 `serviceKey` 로 표기 |
| 5 | `services/web-kpa-society/src/pages/pharmacy/PharmacySellPage.tsx` | `SERVICE_KEY_LABELS.glycopharm` | 미등록 키는 뱃지 미표기 |

**소비처 안전 확인** — 5개 파일 모두 프로토콜 §3-A 의 raw-source 조사를 함께 수행했다.

```text
node scripts/quality/check-literal-consumers.mjs --source <각 파일>
→ 5개 파일 전부 "살아있는 소비처 합계: 0건" (검출된 참조는 전부 HISTORICAL_DOC)
```

#### 10-4-A. 활성 소스 전수 재검색 결과 (분류)

대상 `apps/** packages/** services/** .github/** scripts/**`,
검색어 `glycopharm` · `GlycoPharm` · `GLYCOPHARM` · `glycopharm-web` · `glycopharm.co.kr` · `api/v1/glycopharm`.

| 분류 | 건수 | 처리 |
|---|:---:|---|
| `ACTIVE_RUNTIME_CONFIG` | **0** | §10-4 에서 5건 전부 제거 |
| `ACTIVE_SERVICE_CONTRACT` | **0** | 라우트 · scope · serviceKey 상수 · CORS · 브랜딩 전부 이전 단계에서 제거됨 |
| `ACTIVE_TEST_CONTRACT` | 유지 | GlycoPharm **부재를 단언**하는 회귀 테스트 (`b2b-remaining-debt-final-closure` · `cosmetics-product-query` · `ecommerce-core-and-commerce-residue-retirement`) 와 과거 계약을 재현한 단위 테스트 fixture (`createRouteGuard.test` · `UserDetailPasswordModal.test` · `getUserDisplayName.test`). 삭제하면 재유입 가드가 사라지므로 **손대지 않는다** |
| `HISTORICAL_COMMENT` | 유지 | `REMOVED (WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1)` 주석 · 공통화 출처 주석 · JSDoc 서비스 열거 |
| `APPLIED_MIGRATION` | 유지 | `migrations/**` · `migrations-sql/**` 과거 적용 산출물 |
| `AUDIT_DOCUMENT` | 유지 | `docs/**` 기록물 (CLAUDE.md §16-1 대상 아님) |

**범위 밖으로 판정해 손대지 않은 실행 파일 2건** (동종이 아니라 보고만 한다):

- `apps/api-server/scripts/delete-seed-data.sql` — 이미 DROP 된 `glycopharm_products` 를 지우는 **1회성 seed 정리 SQL**. 런타임 설정이 아니고 자동 실행 경로도 없다 (dead script).
- `packages/lms-ui/package.json` `description` — 패키지 설명 문구의 서비스 열거. 실행 의미 없음.

#### 10-4-B. 검증 실측 (로컬)

| 항목 | 결과 |
|---|---|
| `pnpm run build:packages` | PASS |
| api-server `tsc --noEmit` | PASS · 0 errors |
| `npm run type-check:frontend` | PASS (`type-check:frontend: OK`) |
| api-server Jest 전체 | **237 suites / 3,802 tests PASS** |
| `packages/ui` vitest | 2 files / 19 tests PASS |
| `packages/operator-core-ui` vitest | 4 files / 47 tests PASS |
| raw-source 소비처 (`check-literal-consumers.mjs`) | 5개 파일 전부 살아있는 소비처 0건 |

#### 10-4-C. CI · CodeQL · 배포 실측 — `601cd98c2`

| 워크플로 | 결과 |
|---|---|
| CI Pipeline | ✅ success |
| CodeQL Security Analysis | ✅ success |
| Deploy API Server | ✅ success |
| Deploy Web Services | ✅ success |
| Deploy Admin Dashboard | ✅ success |

필수 워크플로 5개 전부 성공. 이로써 §11 판정을 로컬 검증 기준이 아닌 **CI 기준 최종 판정**으로 확정한다.

**범위 밖으로 남긴 2건은 종결을 막지 않는다** (GlycoPharm 런타임도 서비스 계약도 아니다).
추후 일반 dead script · 문구 정비 때 함께 제거할 수 있으며, 이를 위해 본 작업을 다시 열지 않는다.

- `apps/api-server/scripts/delete-seed-data.sql` — 이미 DROP 된 테이블 대상 수동 dead script
- `packages/lms-ui/package.json` `description` — 설명 문구

---

## 11. 판정

```text
GLYCOPHARM_APPLICATION            = ABSENT
GLYCOPHARM_ACTIVE_ROUTES          = 0
GLYCOPHARM_SERVICE_CONTRACT       = 0
GLYCOPHARM_ACTIVE_DATA            = 0
GLYCOPHARM_DEPLOY_TARGETS         = 0
GLYCOPHARM_CLOUD_RESOURCES        = 0
GLYCOPHARM_TLS                    = 0
OTHER_SERVICE_DATA_CHANGE         = 0
OTHER_SERVICE_REGRESSION          = PASS

GLYCOPHARM_ACTIVE_RUNTIME_CONFIG    = 0
GLYCOPHARM_ACTIVE_SERVICE_CONTRACT  = 0
GLYCOPHARM_ACTIVE_ALLOWLISTS        = 0   (account-access.policy — 제거 완료 §10-4)
GLYCOPHARM_ACTIVE_SERVICE_KEYS      = 0
GLYCOPHARM_ACTIVE_BRANDING          = 0   (SERVICE_BRANDING · 표시명 맵 3종 — 제거 완료)
GLYCOPHARM_ACTIVE_SERVICE_CONFIG    = 0   (neture-dashboard serviceConfig — 제거 완료 §10-4)
GLYCOPHARM_ACTIVE_CORS_ORIGIN       = 0   (제거 완료)
GLYCOPHARM_RESIDUAL_DISPLAY_CONFIG  = 0   (§10-4 — 5건 전부 제거)

GLYCOPHARM_SERVICE_ERASURE        = CLOSED
GLYCOPHARM_INFRA_ERASURE          = CLOSED
GLYCOPHARM_GCP_ERASURE            = CLOSED
GLYCOPHARM_DNS_RECORDS            = 0
GLYCOPHARM_DNS_ERASURE            = CLOSED
GLYCOPHARM_DOMAIN_RENEWAL         = NOT_PLANNED
GLYCOPHARM_DOMAIN                 = EXPIRES_NATURALLY_ON_2026-12-26
GLYCOPHARM_DOMAIN_ERASURE         = CLOSED

CI_PIPELINE                       = SUCCESS  (601cd98c2)
CODEQL                            = SUCCESS  (601cd98c2)
DEPLOY_WORKFLOWS                  = SUCCESS  (API · Web · Admin — 601cd98c2)

GLYCOPHARM_COMPLETE_ERASURE       = CLOSED   (CI 기준 최종 확정 — §10-4-C)
  └ 서비스 · 라우트 · 데이터 · 배포 · GCP · TLS · DNS · 런타임 설정 맵 전 축.
    남은 문자열은 회귀 가드 테스트 · 주석 · 과거 migration · 기록물뿐이며 실행 의미가 없다.
```

---

## 12. 문서 정합

```text
문서 정합: 발견 4건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
```

- `CLAUDE.md` — §1 Shared Module 소비처 목록 · §4 OrderType · §5 Store Production Material ·
  §6 인프라 표에서 GlycoPharm 제거 (WO 범위 내 계약 변경이라 인라인 처리)
- `README.md` · `SETUP.md` · `scripts/README.md` · `ui-guidelines/**` — 서비스 열거 정정
- `docs/baseline/legacy/GLYCOPHARM-LEGACY-POSTMORTEM.md` — **유지**. 과거 사고 기록물이며 §16-1 대상 아님
- 별도 WO 제안 1건: §8-2 `pharmacy-hub` 가 membership 전체 탈퇴 대상에서 누락된 선행 갭
