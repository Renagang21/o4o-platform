# IR-O4O-FOUR-RETIRED-SERVICES-FULL-RETIREMENT-CENSUS-V1

> **조사 전용 문서.** 코드 변경 0 / DB write 0 / migration 0 / 배포 0 / Cloud 변경 0.
> 작성일: 2026-10-15 · 기준 HEAD: `c7f2c29eb` (origin/main) · 브랜치: `wo/four-service-full-retirement-v1`
> 대상: K-Cosmetics · GlycoPharm · GlucoseView · SiteGuide **완전 퇴역** (작업 지시 2026-10-15 — 데이터 전부 테스트 데이터, 재개용 보존 없음)

---

## 0. 결론 요약

| 서비스 | 코드 활성 잔여 | DB 잔여 | 전용 Cloud 리소스 | 외부 도메인 |
|---|---|---|---|---|
| K-Cosmetics | **大** — api-server 약 60 파일 · 공통 package 15+ · web 4 앱 · 테스트 약 165 | 전용 테이블 14(행 2) · 공유 테이블 20종 57행 · enum label 1 | 0 (Cloud Run · LB host · cert · 이미지 없음) | `k-cosmetics.site` · `retail.neture.co.kr` |
| GlycoPharm | 小 — `glycocare` 운영자 scope 묶음(GlucoseView 공통) | 0 | 0 | `glycopharm.co.kr` |
| GlucoseView | 小 — 입력 filter 1 · 예시 문자열 2 · `glycocare` 묶음 | 0 (테이블 drop 완료) | 0 | `glucoseview.co.kr` |
| SiteGuide | 小 — 퇴역 type 거부 분기 1 + spec 2 | 0 (schema drop 완료) | 0 | `siteguide.co.kr` |

- **실제 데이터 삭제 대상은 K-Cosmetics 뿐이다.** 나머지 셋은 DB · 스토리지 잔여 0, 정리 대상은 코드 · 문서 · 설정이다.
- 전용 GCP 인프라(Cloud Run 서비스 · NEG · backend · URL map host · 인증서 · cert map entry · DNS authorization · Artifact Registry 이미지 · secret · service account · GitHub secret/variable)는 네 서비스 모두 **이미 0** 이다.
- Cloud DNS managed zone 은 프로젝트에 없다 — 네 도메인의 DNS · 등록 · 자동연장은 외부 등록기관 관할이며 **별도 보고 대상**(§5).

## 1. 조사 방법

- 코드: `git grep -i` (`k-?cosmetic|kcos|cosmetics`, `glyco-?pharm|glycocare`, `glucose-?view|glucosecare`, `site-?guide`) + 분류. 의약품 데이터 스크립트(`apps/api-server/src/scripts/data/**`, easy-drug · otc · hff)의 glycerin · glucose 등은 **오탐**으로 제외.
- DB: cloud-sql-proxy 경유 `BEGIN TRANSACTION READ ONLY` — 퇴역 이름 schema/table/enum 검색 + 모든 base table 의 서비스 식별성 text/array 컬럼과 jsonb 컬럼 정규식 count. 개인정보 컬럼 미조회.
- Cloud: `gcloud run|compute|certificate-manager|dns|secrets|storage|iam|artifacts` list/describe, `gh secret|variable list`.

## 2. DB 잔여 (production, 2026-10-15 실측)

### 2-1. K-Cosmetics 전용 테이블 — DROP 대상

| 위치 | 테이블 | 행 |
|---|---|---|
| schema `cosmetics` | brands · lines · price_logs · price_policies · product_logs · products · store_applications · store_listings · store_members · store_playlist_items · store_playlists · stores (12, 모두 `cosmetics_` 접두) | 0 |
| `public` | `cosmetics_members` | 0 |
| `public` | `cosmetics_contents` | 2 (draft 1 · published 1) |

- 외부 테이블에서 이 14개로 향하는 FK 0 · 의존 view 0.
- enum `checkout_orders_order_type_enum` label `COSMETICS` 잔존 — 사용 행 0 (GlycoPharm label 제거 선례: PR #219).

### 2-2. 공유 테이블의 K-Cosmetics 행 — 행 삭제 또는 원소 제거

| 테이블 | 값 | 행 | 처리안 |
|---|---|---|---|
| `service_memberships` | `k-cosmetics` active | 3 | 삭제 (3 사용자 모두 다른 서비스 membership 보유 — 사용자 보존) |
| `role_assignments` | `cosmetics:admin` 2 · `cosmetics:operator` 3 (모두 inactive) | 5 | 삭제 (3 사용자 모두 다른 role 보유) |
| `roles` | service_key `cosmetics` | 7 | 삭제 (role_assignments 선삭제 후) |
| `platform_services` | `k-cosmetics` · `cosmetics` (active) | 2 | 삭제 |
| `operator_invitations` | `k-cosmetics` / `cosmetics:operator` accepted | 1 | 삭제 |
| `service_policy_documents` · `user_policy_acceptances` | `k-cosmetics` | 2 · 3 | 삭제 (acceptance 선삭제) |
| `service_legal_profiles` · `service_contact_settings` · `service_audience_policies` · `operator_notification_settings` · `guide_contents` | `k-cosmetics` | 각 1 | 삭제 |
| `contact_inquiries` | `k-cosmetics` (status spam) | 3 | 삭제 |
| `notifications` | `k-cosmetics` | 5 | 삭제 |
| `organization_product_listings` | `k-cosmetics` | 1 | 삭제 (cart 참조 확인 후) |
| `offer_service_approvals` | `k-cosmetics` approved | 1 | 삭제 |
| `supplier_product_offers.service_keys` | `{kpa-society,k-cosmetics}` | 1 | **원소 제거만** — offer 는 KPA 가 사용 (공유 데이터 보존) |
| `media_assets` | `cosmetics` (internal, gcs `media/…`) | 5 | 행 삭제 + GCS 객체 5 삭제 (같은 경로 공유 행 0) |
| `store_asset_derivations` | `cosmetics` | 1 | 삭제 |
| `action_logs` | service_key `k-cosmetics` 10 · meta jsonb 5 | 10~15 | §2-4 분류 |
| `canonical_demo_repair_snapshots.snapshot` | jsonb 내 serviceKey | 2 | §2-4 분류 |

- `checkout_orders` order_type `COSMETICS` · metadata serviceKey 퇴역 값: **0 행**.

### 2-3. GlycoPharm · GlucoseView · SiteGuide

- 퇴역 이름 schema · table · enum label · 서비스 키 행 **0**. (`DropGlucoseviewAndCgmTables` · `DropCareTables` · `DropSiteGuideSchema` 실행 완료, GlycoPharm 은 PR #218 · #219 · #221 로 정리 완료.)

### 2-4. 감사 · 이력 성격 (별도 분류)

| 대상 | 성격 | 제안 |
|---|---|---|
| `typeorm_migrations` 퇴역 이름 행 | migration provenance (ordered fingerprint 검증 대상) | **KEEP** — 삭제 시 legacy history fingerprint 불일치로 migration runner 가 차단됨 |
| `action_logs` K-Cos 행 | 운영자 행위 감사 로그 · 테스트 데이터 | 삭제 가능(FK · 집계 의존 확인 후). 판단 필요 시 사용자 확인 |
| `canonical_demo_repair_snapshots` 2행 | Demo 계정 repair 이전 상태 snapshot | snapshot 내용 확인 후 퇴역 키 부분만 판단 — 복구 도구 입력이므로 단순 삭제 전 소비처 확인 |

## 3. 스토리지

- 버킷 5개(`o4o-media-library` · `neture-db-final-export` · `netureyoutube_cloudbuild` · `o4o-video-temp-output` · `yaksasite`) 중 퇴역 서비스 **전용 버킷 0**. 객체 경로는 UUID 기반이라 이름 검색 0 건.
- 퇴역 서비스 소유 객체는 DB 참조로만 식별 — `media_assets` service_key `cosmetics` 5행의 `gcs_path` 5객체(§2-2).

## 4. 코드 잔여 (분류)

### 4-1. K-Cosmetics — ACTIVE_RUNTIME (제거 대상)

- **서비스 정의**: `constants/service-keys.ts`(COSMETICS · K_COSMETICS · K_COSMETICS_EVENT_OFFER) · `config/service-catalog.ts`(retired row · `cosmetics` alias) · `config/service-scopes.ts` · `config/community-catalog.ts` · `types/roles.ts`(6 role) · `app-manifests/appsCatalog.ts`(serviceGroup · `forum-cosmetics` app) · `event-offer-service-mapping.ts` · `buyer-order-service-scope.ts` · `modules/neture/constants/approval-service-keys.ts`.
- **퇴역 호환 분기(데이터 삭제 후 제거)**: `middleware/retired-service.middleware.ts` 의 cosmetics 판정 · `routes/cart/store-cart.routes.ts` `RETIRED_CART_SERVICE_KEYS` · web-store `hasOnlyRetiredWorkspaces` · `UnifiedStoreLayout`/`RetiredServiceNotice` · `KcosRetired` 페이지(`/work/k-cosmetics/*`) · web-neture `home-entry.ts` `RETIRED_SERVICE_KEYS` · admin `PlatformUsersPage` 퇴역 라벨. ※ pharmacy-hub 와 공유하는 분기 — PH 정리(PR #609 · #610)와 같은 파일.
- **live SQL over 전용 테이블**: `routes/platform/store-network.service.ts` · `physical-store.service.ts`(`cosmetics.cosmetics_stores`) · `store-owner-termination.service.ts` · `content-resource-core.ts`(`cosmetics_contents`) · `MembershipApprovalService`(`cosmetics_members` INSERT). **테이블 DROP 전에 반드시 제거.**
- **allowlist · alias map**: signage · community · lecture · kpa-branch · subdomain scope middleware, operator routes 5종, forum operator/admin, cms-content, store QR/POP/product-request controller, contact-inquiry 3종, policy-acceptance, service-legal-scope, lms-service-scope, store-entitlement, store-membership, terms-acceptance policy, tenant-context.
- **package**: `packages/forum-cosmetics/`(전체) · `api-types/src/cosmetics.ts` · `security-core` COSMETICS_SCOPE_CONFIG · `store-ui-core`(COSMETICS_STORE_CONFIG · handoff rewrite · StoreOwnerGuard) · `capabilities` · `ai-core` · `platform-core`(entity service union) · `cms-core` view-system · `types/service-branding` · `operator-ux-core` · `ui` · `operator-core-ui` · `shared-space-ui`(type union · 안내 copy).
- **frontend**: web-neture(event-offer presentation K-Cos enabled · supplier/operator/admin AI 화면 약 15 파일) · web-account `UserProfileCard` · admin-dashboard 5 파일 · web-kpa-society(주석 위주).
- **도구**: `scripts/neture-pharmacy/retirement-census.ts` · `scripts/deployment/demo-store-cleanup.mjs` · `scripts/reset/O4O-RESET-DRYRUN-V1.sql` · `scripts/delete-seed-data.sql` · privacy erasure inventory — **삭제 완료까지 유지**, 이후 cosmetics 분기 제거.
- **테스트**: api-server 약 131 · multi-tenant tests · frontend 약 34 · e2e screenshot 7.
- **설정**: `.claude/settings.json` WebFetch `k-cosmetics.site`.

### 4-2. GlycoPharm · GlucoseView 공통 — `glycocare` 운영자 scope

- `packages/types/src/operator-policy.ts`(`OperatorScopeKey 'glycocare'` · `GLYCOCARE_OPERATOR_POLICY`) · admin-dashboard `OperatorFeatureGuard`(`GlycoCareOnlyGuard`) · `guards/index.ts` · `OperatorScopeBadge` · `policy-notice-messages.ts` · `config/service-entry.ts`(`glucosecare` entry, `/admin/glucosecare` · `/admin/glycocare`) · `MyPolicyPage.tsx:189` · guard test. backend 가 `user.scopes` 를 채우지 않아 현재 inert — 제거 대상.
- GlucoseView: `modules/neture/services/supplier-offer-registration.service.ts:180-183` 의 `glucoseview` filter 는 **입력 guard** 역할 — 제거 시 등록 서비스 키 allowlist 로 대체 필요. `role-revoke-safety.ts` 주석 · `representative-entry-return-handoff.spec.ts` 예시 문자열.
- 설정: `.claude/settings.json` WebFetch `glycopharm.co.kr` · `scripts/reset/O4O-RESET-DRYRUN-V1.sql` 주석.

### 4-3. SiteGuide

- `controllers/platformInquiryController.ts` `RETIRED_INQUIRY_TYPES` 거부 분기 — 컬럼이 varchar(50)이므로 **유효 3 type positive allowlist 로 대체 후** 제거. `entities/PlatformInquiry.ts` 주석 · `platform-inquiry-retired-type.spec.ts` · `service-ai-extensions.spec.ts` · `packages/ai-core/README.md`.

### 4-4. 판단 필요 (오탐 가능)

| 대상 | 내용 |
|---|---|
| `packages/pharmacy-ai-insight` | glucose/CGM 입력 기반 약사 AI insight. GlucoseView 식별자 0 · serviceGroups `yaksa` · 선행 CHECK 가 명시 유지. **기본: KEEP(일반 기능)** — CGM 계열 전체 퇴역이면 별도 결정 |
| forum AI domain `'cosmetics'` (`ForumAIService` 외) · `copilot/insight-rules.ts` | K-Cos 뷰티 포럼 잔재로 보임 — 구현 시 소비처 확인 후 제거 |
| `platform-core/reserved-slugs.ts` `'cosmetics'` | 예약 slug — 유지 가능 |
| `cosmetics` 상품 카테고리 · cosmetics census 스크립트 · `kpa_store_contents` | **오탐 — KEEP** (ProductMaster 카테고리 · KPA 공용 테이블명) |

### 4-5. HISTORICAL (편집하지 않음)

- `apps/api-server/src/database/**` migration · baseline · manifest (K-Cos 26 · GlucoseView 11 · SiteGuide 4 파일) — 실행 이력 · fingerprint 정합 대상. 단 전용 테이블 DROP 은 **새 incremental migration** 으로 수행하고 canonical baseline 재생성 여부는 migration 표준에 따른다.
- docs/checks · investigations · archive · work-orders · ir — 기록물.

### 4-6. 기준 문서 (정본 갱신 대상)

- `CLAUDE.md` §9 K-Cosmetics "잔여 유지 계약" · `docs/CANONICAL-INDEX.md` · `docs/architecture/K-COSMETICS-RETIREMENT-RESIDUE-CONTRACT-V1.md`(완전 퇴역 후 SUPERSEDED) · `COSMETICS-DOMAIN-RULES.md` · `docs/services/cosmetics/*` · `docs/guides/services/kcos/README.md`.
- GlucoseView 언급 기준 문서 19 (identity · role standard · store layer · user structure · rbac IR 등), SiteGuide 2.
- 게시된 법률 문서(약관 · 개인정보 처리방침 · 매장 경영자 계약)의 서비스명 언급은 게시본이므로 개정 절차 대상 — 이 트랙에서 직접 수정하지 않는다.

## 5. 외부 도메인 (별도 보고 · 이 트랙에서 실행 안 함)

| 도메인 | 상태 |
|---|---|
| `k-cosmetics.site` · `retail.neture.co.kr` | LB host · cert 없음. `retail.neture.co.kr` 은 neture.co.kr 하위 레코드 — 등록기관 DNS 레코드 삭제 필요 여부 확인 |
| `glycopharm.co.kr` · `glucoseview.co.kr` · `siteguide.co.kr` | GCP 연결 0. 등록 해지 · 자동연장 변경은 소유자가 등록기관에서 결정 |
| Google OAuth 승인 origin | console 전용 — CLI 로 조회 불가, 소유자 확인 필요 |

## 6. 실행 순서 (제안)

1. **선행**: PharmacyHub 정리 PR(#609 · #610) 통합 · 배포 완료 — 같은 퇴역 호환 파일을 수정하므로 순차.
2. **PR-1 (코드, 데이터 무관)**: GlycoPharm · GlucoseView · SiteGuide 잔여 제거(allowlist 대체 포함) + K-Cos 런타임 진입점 · 전용 테이블 live SQL · allowlist · package 제거. 삭제 도구 · 검증 경로는 유지.
3. **DB 삭제 (운영 write · 사용자 승인)**: plan(dry-run count) → 단일 tx 로 §2-2 행 삭제 · 원소 제거 → GCS 객체 5 삭제 → 잔여 0 · 공유 offer · 사용자 보존 확인.
4. **PR-2 (migration)**: 전용 테이블 14 + schema `cosmetics` DROP + enum label `COSMETICS` 제거 incremental migration (CI 자동 실행).
5. **PR-3 (마감)**: 삭제 도구 · 퇴역 호환 분기 · 서비스 키 · 테스트 정리, 기준 문서 갱신, `.claude/settings.json` 도메인 정리.
6. 외부 도메인 · OAuth origin 보고(§5).
