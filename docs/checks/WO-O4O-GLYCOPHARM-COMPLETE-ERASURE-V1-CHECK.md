# CHECK — WO-O4O-GLYCOPHARM-COMPLETE-ERASURE-V1

> **상태**: 코드 단계 완료 · 배포/DB/GCP 단계 대기
> **작성일**: 2026-09-08
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

## 10. 미완 — 소유자 조치 필요

### 10-1. GCP (작업자 범위, 코드 배포 후 수행)

```text
Cloud Run          glycopharm-web 삭제
NEG                neg-glycopharm-web 삭제
Backend service    backend-glycopharm-web 삭제
URL map            o4o-global-lb — hostRule(glycopharm.co.kr·www) + path-matcher-glycopharm 제거
                   path-matcher-api hostRule 에서 api.glycopharm.co.kr 제거
컨테이너 이미지     gcr.io/netureyoutube/glycopharm-web 삭제
SSL 인증서         cert-final-neture-v3 → GlycoPharm SAN 제외한 새 인증서로 교체
```

**인증서 교체 주의**: `cert-final-neture-v3` 는 프로젝트 내 **유일한 인증서**이며
유일한 HTTPS proxy(`o4o-global-lb-target-proxy-2`)에 연결돼 있고 상태가
`PROVISIONING_FAILED_PERMANENTLY` 다. 새 인증서가 **ACTIVE 가 된 뒤에만** proxy 를 교체하고,
Neture · KPA · K-Cosmetics · GlucoseView HTTPS 실측 후에만 기존 인증서를 분리·삭제한다.
새 인증서가 활성화되지 않으면 **기존 인증서를 제거하지 말고 중단 보고**한다.

새 인증서 SAN (GlycoPharm 3개 제외):

```text
neture.co.kr · www.neture.co.kr · admin.neture.co.kr · api.neture.co.kr
glucoseview.co.kr · www.glucoseview.co.kr · api.glucoseview.co.kr
kpa-society.co.kr · www.kpa-society.co.kr · api.kpa-society.co.kr
k-cosmetics.site · www.k-cosmetics.site · api.k-cosmetics.site
```

### 10-2. 등록기관 (소유자 직접 — 작업자 권한 밖)

`netureyoutube` 프로젝트에 **Cloud DNS 존이 없다.** DNS 는 외부 등록기관에 있다.

```text
1. glycopharm.co.kr        A/AAAA 레코드 삭제
2. www.glycopharm.co.kr    삭제
3. api.glycopharm.co.kr    삭제
4. MX · TXT · CNAME 잔여 레코드 확인 후 삭제
5. 도메인 자동갱신 해제
6. 즉시 삭제 기능이 있으면 도메인 삭제 / 없으면 만료 처리
```

---

## 11. 판정

```text
GLYCOPHARM_APPLICATION            = ABSENT
GLYCOPHARM_ACTIVE_ROUTES          = 0
GLYCOPHARM_SERVICE_CONTRACT       = 0
GLYCOPHARM_DEPLOY_TARGETS         = 0
OTHER_SERVICE_REGRESSION          = PASS

GLYCOPHARM_ACTIVE_DATA            = PENDING_MIGRATION   (배포 후 실행)
GLYCOPHARM_CLOUD_RESOURCES        = PENDING             (배포 후 수행)
GLYCOPHARM_DNS_RECORDS            = PENDING_OWNER_ACTION
GLYCOPHARM_DOMAIN_AUTORENEW       = PENDING_OWNER_ACTION

GLYCOPHARM_GCP_ERASURE            = IN_PROGRESS
GLYCOPHARM_DOMAIN_ERASURE         = PENDING_OWNER_ACTION
GLYCOPHARM_COMPLETE_ERASURE       = OPEN
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
