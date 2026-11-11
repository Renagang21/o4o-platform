# IR-O4O-CORE-CONSOLIDATION-V1 — O4O Core 중앙화 및 원격 공동개발 접근 경계 조사

> **상태**: DRAFT (조사 전용 · 코드 · DB · CI · 배포 · GitHub 설정 변경 없음)
> **작성일**: 2026-11-11
> **기준 코드**: `origin/main` `fb649107`
> **실행 위치**: CLOUD (저장소 코드 · 문서 정적 조사만. 운영 DB · GCP · GitHub 설정 조회 없음)
> **목적**: 원격 공동개발자 역할 확대와 저장소 Private 전환을 앞두고, 흩어진 Core 의 실제 위치 · 소유권 · 의존을 확인하고 통합 방안과 접근 경계(A/B/C)를 제안한다
> **관련**: [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) · [`USER-OPERATOR-FREEZE-V1`](../architecture/USER-OPERATOR-FREEZE-V1.md) · [`core-boundary`](../baseline/core-boundary.md) · [`IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md) · [`IR-O4O-PRIVATE-CI-BUDGET-V1`](IR-O4O-PRIVATE-CI-BUDGET-V1.md) · [`IR-O4O-PR-FILE-OVERLAP-AND-CONFLICT-HOTSPOTS-V1`](IR-O4O-PR-FILE-OVERLAP-AND-CONFLICT-HOTSPOTS-V1.md)

---

## 0. 요약

1. **실제 Core 구현은 거의 전부 `apps/api-server` 안에 있다.** 인증 · RBAC · 서비스 가입(`modules/auth`), 주문 단일 지점(`services/checkout.service.ts`), 상품 마스터 · 식별자 · 공급 오퍼 · 유통 · 가격 규칙(`modules/neture`, 351파일), 매장 진열 원장(`modules/store-core`), AI 사용량 · 정산(`modules/ai-policy`), Personal Assistant 판단(`services/assistant`)이 모두 api-server 의 단일 `AppDataSource` 와 같은 DB 트랜잭션을 전제로 묶여 있다.
2. **`packages/*-core` 는 이름과 실제가 많이 다르다.** 동결 Core 로 적힌 `auth-core` 는 소비처 0 인 껍데기다. `platform-core` 는 매장 slug · 정책 엔티티 패키지, `store-core` 는 import 0 인 KPI 엔진이다. `operator-ux-core` · `admin-ux-core` · `store-ui-core` 는 React UI 다. 패키지 중 업무 계약을 실제로 담은 것은 `payment-core` · `security-core` · `ai-core`(실행부) · 엔티티 패키지 몇 개뿐이다.
3. **소비처 0 패키지가 9개다.** `auth-core` · `api-types` · `content-core` · `forum-cosmetics` · `organization-forum` · `organization-lms` · `operator-core` · `store-core` · `pharmacy-ai-insight`(admin 의 mock 페이지 1곳). 대부분 은퇴 잔재다.
4. **`core/` 최상위 디렉터리로 옮기는 안은 권장하지 않는다.** 다음 경로 고정점을 모두 고쳐야 하지만 런타임 이득은 없다.
   - pnpm workspace
   - api-server `tsconfig` paths(`../../packages/*/dist`)
   - `scripts/ci/detect-affected.mjs` 의 `WORKSPACE_DIRS`
   - `packages/` 를 경로로 쓰는 스크립트 · CI 파일 46개
   - deploy path filter · labeler · CODEOWNERS
   진짜 Core 는 api-server 안에 있으므로 packages 를 옮겨도 Core 가 한곳에 모이지 않는다.
5. **권장안은 「물리 이동 없이 경계를 선언하고 기계로 지키는 방식」이다.**
   - ① Core 경로 목록(registry)을 한 문서로 정리한다.
   - ② `CODEOWNERS` 와 자동 라벨로 B 등급 변경을 표시하고 검토한다. 현재 CODEOWNERS 는 존재하지 않는 조직 팀을 가리켜 효과가 없다.
   - ③ 소비처 0 패키지와 중복 구현을 제거 · 일원화한다.
   - ④ 필요한 경우에만 api-server 안의 작은 묶음을 `src/core/` 로 옮긴다(`move:` PR).
6. **C 등급(소스 분리)은 현재 구조에서 비용이 이득보다 크다.** Private 저장소의 협업자는 저장소 전체를 읽는다. 숨기려면 별도 Private 저장소와 사설 패키지 레지스트리가 필요하고, CI 토큰과 교차 저장소 테스트도 필요하다. 분리할 수 있는 것은 순수 규칙 함수와 Assistant 판단 프롬프트 정도다. 1인 유지보수 기준으로는 **지금 분리하지 않고**, 숨길 필요가 확인된 항목만 「프롬프트 · 정책 값을 소스 밖 설정으로 빼는 방식」(§7-3)을 먼저 검토하는 것을 권한다.

---

## 1. 조사 방법과 한계

- **소비처 판정 근거:** 각 workspace `package.json` 의 의존성 선언, `dist` · `node_modules` 를 뺀 실제 `import` · `require` 문, `apps/api-server/src/bootstrap/register-routes.ts` 의 route 등록, `apps/api-server/src/database/entities.ts`(DataSource 엔티티 단일 registry · `database/connection.ts:12,104`). 문자열 · 주석만 걸린 것은 소비처에서 뺐다.
- **수치의 성격:** 소비처 수는 import 하는 **파일 수**다. 여러 줄로 나뉜 import 는 근사치다.
- **조사 방식:** 4개 영역을 나눠 조사했다. 핵심 주장은 아래 명령으로 다시 확인했다.
  - 소비처 0: `auth-core` · `api-types` · `forum-cosmetics` · `organization-lms` · `organization-forum` · `content-core` · `store-core` · `operator-core`
  - `organizations` 이중 매핑
  - organization-core 의 `role_assignments` 쓰기
  - Skill 구현 0
  - FREEZE 문서 경로 부재
  - `createOrder` 위치
- **확인하지 못한 것:** 운영 DB 의 실제 테이블 · 행, 런타임 동적 import, 운영 트래픽, GitHub 플랜 기능. 각 절에 「미확인」으로 표시했다.

---

## 2. 빌드 · 배포 구조 (이동 비용의 근거)

| 항목 | 현재 | 근거 |
|---|---|---|
| API 번들 | tsup 이 `@o4o/*` workspace 패키지를 **번들에 인라인**한다. 외부 의존만 external 로 둔다 | `apps/api-server/tsup.config.ts`, `Dockerfile:64-81` (dist 파일만 COPY) |
| API 의 패키지 해석 | `tsconfig.json` paths `@o4o/*` → `../../packages/*/dist`. subpath 일부는 개별 매핑 | `apps/api-server/tsconfig.json:26-40` |
| 배포 빌드 순서 | `pnpm --filter '@o4o/api-server^...' run build` 로 의존 패키지 dist 를 만든 뒤 `build:api`(tsup) | `.github/workflows/deploy-api.yml:323,367` |
| 엔티티 등록 | 단일 `AppDataSource`. `entities.ts` 의 import 99개 중 12개가 패키지 엔티티(cms · signage · action-log · education · forum · interactive-content · lms · mail · market-trial · organization · platform-core 2) | `database/entities.ts` |
| 엔티티를 가진 패키지 | interactive-content-core 10 · digital-signage-core 9 · forum-core 5 · education-extension 5 · cms-core 5 · platform-core 4 · market-trial 4 · organization-core 2 · mail-core 2 · lms-core 2 · payment-core 1 · forum-cosmetics 1 · content-core 1 · asset-copy-core 1 · action-log-core 1 | `@Entity(` 정의 수 |
| migration | 모두 api-server `database/migrations`(604개)와 incremental manifest 로 관리한다. 패키지 안의 migration(forum-core `src/migrations/001~004`)은 등록돼 있지 않다 | `database/migration-config.ts` |
| CI 영향 범위 판정 | workspace 의존 그래프로 영향 서비스를 정한다. `WORKSPACE_DIRS = ['apps','packages','packages/@o4o-apps','services']` | `scripts/ci/detect-affected.mjs:83` |
| `packages/` 경로 고정 | 스크립트 · CI · tsconfig · vite 설정 46개 파일이 `packages/<이름>` 을 직접 적는다 | `grep -rlE "packages/" .github scripts apps/*/tsconfig* services/*/tsconfig* services/*/vite.config* tsconfig*` |

**의미:**
- 패키지는 독립 배포 단위가 아니다. api-server 번들의 소스 조각이다.
- 패키지를 어디로 옮기든 런타임 경계는 바뀌지 않고, 위 고정점만 고쳐야 한다.
- 반대로 별도 저장소로 떼어 내면 「dist 를 어디서 받아 오는가」(사설 레지스트리 · 토큰)가 새로 생긴다.

로컬 주의(조사 중 발견): `apps/api-server/package.json` 의 `build:deps` 에는 `platform-core` · `security-core` 가 빠져 있다. 로컬에서 `build:api:full` 을 실행하면 오래된 dist 가 번들될 수 있다. 반대로 api-server 가 쓰지 않는 `@o4o/ui` 는 빌드한다. 배포는 `^...` 필터를 쓰므로 영향이 없다.

---

## 3. 현행 Core 전체 목록 (실제 경로 · 책임 · 소유권)

### 3-A. Platform Core — 인증 · 회원 · 가입 · 역할 · 조직

| 모듈 | 실제 경로 · 규모 | 책임 | 소비처 | 엔티티 · 테이블 | 비고 |
|---|---|---|---|---|---|
| 인증 · RBAC · 가입 본체 | `apps/api-server/src/modules/auth` (48파일) | session · account · email · google · social · handoff · signup-terms controller, `role-assignment.service.ts` · `role.service.ts` | `/api/v1/auth` · `/api/auth`(`register-routes.ts:141-142,414`) | User · Role · Permission · RoleAssignment · ServiceMembership · LoginAttempt (`entities.ts:18-66,530-542`) | F9 · F10 · F11 동결 대상의 실물 |
| 인증 미들웨어 | `common/middleware/auth.middleware.ts`(barrel → `auth/authentication` · `authorization` · `service-access`), `membership-guard.middleware.ts`(12곳 import) | requireAuth · requireAdmin · 가입 게이트 | api-server 전역 | — | `middleware/service-membership.middleware.ts:33` 에 비슷한 책임의 가드가 따로 있다(중복 후보) |
| 승인 엔진 · 회원 콘솔 | `controllers/admin/AdminUserController.ts`, `controllers/operator/MembershipConsoleController.ts` | 가입 승인 · 거부 · 회원 관리 | admin · operator route | — | |
| 약관 · 법적 고지 | `modules/policy-acceptance`(7) · `modules/service-legal`(12) | 약관 동의 증빙 · 서비스 법적 프로필 | `/api/v1/auth/policy-acceptances` 등 | `service_legal_profiles` · `service_policy_documents` | FREEZE 문서의 Core 목록 밖 |
| 연결 계정 | `entities/LinkedAccount.ts` | `linked_accounts` | auth | 1 | auth-core manifest 가 소유를 선언했지만 실물은 api-server |
| `@o4o/security-core` | `packages/security-core` (4파일 · 453줄) | `createServiceScopeGuard`, 서비스별 `*_SCOPE_CONFIG`, `resolveCanonicalServiceKey`(role prefix ↔ `service_memberships.service_key`) | api-server 54파일, admin 1 | 없음 | **테스트 0**. supplier · community · funding scope 미들웨어는 이 가드를 거치지 않는다(중복 경로) |
| `@o4o/auth-utils` | 22파일 | 응답 파싱, `hasRole`, `membershipGate`, handoff returnTo | api-server 18, auth-react 14, web-* 9곳 | 없음 | `auth-client/src/rbac.ts:103` 에 `hasRole` 이 중복된다 |
| `@o4o/auth-client` | 16파일 | axios transport · refresh · SSO · handoff | admin 83, auth-react 11 등 | 없음 | 테스트가 `services/web-*` 소스를 import(테스트 한정 역방향) |
| `@o4o/auth-react` · `auth-context` · `account-ui` | 59 · 11 · 53파일 | 서비스 프론트 인증 훅 · 가드 · 로그인 UI / admin 전용 Provider / MyPage UI | web-* 다수 / admin 단독 / web-* | 없음 | auth-context 와 auth-react 의 책임이 겹친다 |
| `@o4o/platform-core` | 20파일 | **이름과 달리** 매장 Store Identity(slug) · Store Policy · 결제 설정 | api-server 16 | `platform_store_slugs` · `_history` · `platform_store_policies` · `platform_store_payment_configs` | 패키지가 엔티티를 소유한다 |
| `@o4o/organization-core` | 21파일 | Organization · OrganizationMember 엔티티, OrganizationService, PermissionService | api-server 2, forum-core 1 | `organizations` · `organization_members` | ① **`organizations` 이중 매핑**: api-server `modules/store-core/entities/organization-store.entity.ts:26` 도 `@Entity('organizations')` 다. ② **`role_assignments` 두 번째 쓰기 경로**: `PermissionService.ts:96,325`. RBAC F9 의 「Write 단일 경로」와 충돌한다. 런타임 호출자는 미확인 |
| `@o4o/auth-core` | 6파일 | manifest · activate/deactivate 뿐 | **0** | 선언만 있음 | 동결 Core 목록에 있지만 껍데기다 |
| `@o4o/capabilities` · `@o4o/types` · `@o4o/api-types` | 4 · 53 · 2파일 | Store capability registry / 범용 타입 / OpenAPI 생성 cosmetics 타입 | api-server 4 / 16 workspace / **0** | 없음 | `UserRole` 이 `packages/types/src/auth.ts:3`(string) 와 `apps/api-server/src/types/auth.ts:9`(enum) 에 이중 정의돼 있다 |

### 3-B. Business Core — 상품 · 식별자 · 공급자/매장 연결 · 주문 계약

| 모듈 | 실제 경로 · 규모 | 공통 계약 · 규칙 | 서비스별 업무 구현 | 엔티티 · 소유 |
|---|---|---|---|---|
| 주문 단일 지점 | `services/checkout.service.ts:159` `createOrder(dto, manager?)` + `services/cart/*` | 주문 생성 계약. 호출처 5곳(b2b-checkout-confirm.core · event-offer-cart-checkout · kpa event-offer · neture-pharmacy 주입 · store-cart) | — | `checkout_orders` · `checkout_payments` · `checkout_order_logs`(`entities/checkout/`), `store_cart_items`(`entities/cart/`) |
| 상품 · 공급 · 유통 · 가격 | `modules/neture` (351파일 · 약 6.6만 줄) | `master-link-policy.ts`, `offer-write-policy.ts`, `supplier-offer-distribution.service.ts`, `offer-service-approval` · `offer-service-price` · `spot-price-policy` · `recruitment-supply-price` · `bulk-match` · `alias` · `catalog` service, `utils/product-identifier.util.ts`, `guards/drug-commerce.guard.ts` | 정산 · 대시보드 · copilot · AI · 판매자 모집 · 공급자 onboarding. **같은 디렉터리에 공통 규칙과 섞여 있다** | `product_masters` · `product_identifiers` · `product_aliases` · `product_categories` · `brands` · `product_images` · `shared_product_descriptions` · `supplier_product_offers` · `offer_service_approvals` · `offer_service_prices` · `spot_price_policies` · `neture_suppliers` · `neture_settlements` |
| 승인 · listing | `modules/product-policy-v2` (590줄) | 승인과 listing 을 원자적으로 생성(트랜잭션) | — | `entities/ProductApproval.ts`(모듈 밖) |
| 매장 진열 원장 | `modules/store-core` (10파일) | listing · channel 원장 | — | `organization_product_listings`(모듈 밖 참조 64파일) · `organization_product_channels` · `organization_channels` · `store_product_profiles` · `organizations`(확장 뷰) |
| `@o4o/payment-core` | 15파일 | 결제 상태머신 · 계약 인터페이스 | api-server 7파일(어댑터 `services/payment/adapters/*`) | `PaymentEventLog` 정의는 있으나 **미등록 · migration 0**. 테스트 0 |
| 그 밖의 패키지 | asset-copy-core(스냅샷 엔진 · `o4o_asset_snapshots`) · action-log-core(`action_logs`, 감사 로그) · market-trial(엔티티 4 · funding 축) | 공통 엔진 | — | 패키지 소유 |
| UI 성격 패키지 | store-asset-policy-core · hub-core(소비 1) · tablet-kiosk-core · store-products-ui · hospital-pharmacy-core | — | UI · 서비스 도메인 | 없음 |
| 소비처 0 | `@o4o/store-core`(KPI 엔진 · import 0, 존재만 확인하는 spec 이 있음) · `@o4o/operator-core` | — | — | 없음 |

**식별자 중복:** GTIN · 바코드 정규화가 3곳에 따로 있다.
- `utils/gtin.ts:28`
- `modules/neture/utils/product-identifier.util.ts` — 의도적으로 gtin.ts 를 쓰지 않는다
- `modules/neture/product-description-intake/contracts.ts:20`

cafe24 · store-local-products 에도 바코드 처리가 있다(세부 미확인).

**쓰기 경로 중복:**
- `pharmacy-cart.service.ts:151-197` 이 `store_cart_items` 를 raw SQL 로 직접 쓴다.
- `pharmacy-payment.service.ts:119-129` 가 payment-core 를 거치지 않고 `o4o_payments` 에 쓴다(정본상 등록된 예외).

**원장 이중화:** `catalog_products` · `store_products`(소비 1곳)가 ProductMaster 와 느슨하게만 연결된다.

### 3-C. AI Core — 실행기 · 사용량 · 정책 · Personal Assistant

| 모듈 | 실제 경로 · 규모 | 일반 실행 도구 | 업무 판단 정책 | 엔티티 · 테이블 |
|---|---|---|---|---|
| `@o4o/ai-core` | 27파일 · 약 2.8k줄 (FROZEN 표기) | `orchestration/execute*.ts`, gemini · openai provider, `run-extension.ts`, extension contract | **섞여 있음**: `context-builder.ts:12-28` 서비스별 제약 문구, `action-keys.ts`, `policies/ai.policy.ts:64`, `cards/card-exposure.types.ts:48`. 이 중 action keys · 기본 정책은 테스트 외 사용처가 없다 | 없음. api-server 약 50파일이 import |
| 사용량 · 정산 · 가격 | `modules/ai-policy` (18파일) | `ai-quota.service.ts`(예약 · advisory lock), `ai-accounted-execution.ts`, `ai-native-metering.ts`, `ai-pricing.ts`(`AI_PRICING_CATALOG`), billing | `ai-policy-executor.service.ts`(scope 별 정책 선택) | `ai_llm_policies` · `ai_usage_quota` · `ai_usage_aggregate` · `ai_billing_summary` + raw SQL `ai_usage_reservations` |
| provider 직접 호출 | `services/ai-proxy.service.ts`, `ai-tools/work-planner.ts`, `ai-tools/multimodal-chat.ts`, `automation/tts-narration`, `store-ai/product-ocr`, `neture-pharmacy/consultation-google.ts`, `ai-model-registry.service.ts` (7파일) | ai-core 를 거치지 않는 fetch(멀티모달 · TTS · grounding) | — | accounted 실행 · native metering 으로 사용량은 기록한다 |
| 모델 · 정책 출처 | `ai_llm_policies` · `ai_query_policy` · `ai_model_settings` · `ai_settings` **4곳** | `services/ai-management/model-controls.ts` · `catalog.ts`(읽기 전용 inventory)가 모아 보여 줌 | | |
| 프롬프트 | `@o4o/ai-prompts`(store · admin) + api-server `services/ai-prompts/*`(11파일) | — | **프롬프트 저장소가 2곳**이다. `./care` export 와 tsconfig 경로는 대상 소스가 없다 | |
| 파일 이해 | `@o4o/file-understanding-core` (7파일) | 서버 · 브라우저 공용 decode · profile · normalize | 판단은 api-server `structure-inference.service.ts` | 없음 |
| Personal Assistant 판단 | `services/assistant` (8파일 · 2.2k줄, 전용 테스트 9) | 저장소: `assistant-task-store.ts` · `procedural-memory-store.ts`(raw SQL) | `assistant-planning.ts:83,120`, `assistant-understanding.ts:213,321`(시스템 프롬프트), 메모리 · 소유권 규칙 | `assistant_tasks` · `assistant_procedural_patterns` · `assistant_run_frames` · `assistant_work_data_*` · `assistant_method_sharing_consents` |
| Execution | `services/ai-tools` (49파일 · 14.7k줄) | `work-agent-runtime` · `work-run-executor` · `work-target-resolver` · 실행기 | **섞여 있음**: `work-planner.ts:65` 시스템 프롬프트, `unified-request-router.ts`, `task-modality-router.ts`, `workflow-candidate.ts`, `work-experience.ts` | `local_agent_*` 4개 |
| PC 실행 측 | `tools/o4o-local-agent`(약 10.1k줄 · workspace 밖) · `tools/o4o-chrome-extension` | 로컬 실행 · SQLite(`local_experience_patterns` 등) | — | 내장 Node 22.18.0 계약 · Windows installer CI · web-neture 배포에 동봉(`deploy-web-services.yml:287`) |
| AI Core 가 아닌 것 | `modules/external-ai`(MCP · OAuth 서버) · `modules/personal-mail` · `modules/automation`(영상 · TTS) · `modules/store-ai` · `copilot` · `services/ai-extensions` | 도구 노출 계층 · 서비스 업무 | | |
| 소비처 사실상 0 | `@o4o/pharmacy-ai-insight` | admin 의 mock 데이터 페이지 1곳(lazy). api-server 는 의존만 선언하고 import 0 | | |

**Task / Experience / Skill / Execution 구현 상태**(정본 [`O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2`](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §18 대비):

| 개념 | 상태 |
|---|---|
| Task | 구현됨 |
| Experience | 구현됨(local SQLite + cloud `assistant_procedural_patterns`) |
| Skill | **미구현.** `services/assistant` · `services/ai-tools` · `tools/o4o-local-agent/src` 에서 `skill` 0건. 정본의 「E(Skill) 미착수」와 일치한다 |
| Execution | 구현됨 |

### 3-D. 기타 공통 패키지 — 콘텐츠 · LMS · forum · signage · UI

| 분류 | 패키지 | 판단 |
|---|---|---|
| 엔티티 · 계약 소유(백엔드) | cms-core(동결 · 엔티티 5) · forum-core(`/entities` · `/utils` 만 실사용) · digital-signage-core(엔티티 9) · interactive-content-core(엔티티 10) · education-extension(엔티티 5) · lms-core(facade + InstructorApplication) · mail-core(엔티티 2) · cpt-registry(api-server 1곳) | 엔티티는 Core 성격이다. 패키지 안의 서비스 · 컨트롤러 계층은 상당수가 쓰이지 않거나 api-server 와 중복된다 |
| 프론트 · 서버 공유 계약 | screen-content-core(서버 `store-public-screen-set-resolve.ts` 가 같은 규칙을 재구현) · types | 계약 후보 |
| 공통 UI 라이브러리 | ui · content-editor · block-renderer · slide-app · appearance-system · error-handling · lms-ui · lms-client · shared-space-ui · operator-ux-core · operator-core-ui(291파일 · 5.5만 줄) · store-ui-core · tablet-screen-set-editor · admin-ux-core · utils(React 컴포넌트가 섞여 있음) | packages 유지. 이름에 `core` 가 붙은 UI 패키지 3개는 Core 가 아니다 |
| 소비처 0 · 잔재 | content-core(SKELETON · 엔티티 미등록) · forum-cosmetics(K-Cos) · organization-forum · organization-lms · api-types(cosmetics) | 제거 검토 |
| 패키지 내부 dead code | forum-core `src/admin-ui/*`(admin-dashboard 별칭을 import · 빌드 제외) · backend search · 미등록 migration 4개 / lms-core EngagementLog / interactive-content-core 서비스 계층(api-server `modules/lms` · `modules/survey` 와 중복) / market-trial routes · controllers · lifecycle | 정리 대상 |

---

## 4. 의존관계와 역방향 의존

- **패키지 → apps/services 방향의 런타임 import 는 0 이다.** 4개 영역 모두 확인했다. 계층 규칙 `Core → Extension → Feature → Service` 의 역방향 위반은 런타임에는 없다.
- **테스트 · dead code 한정 역방향:**
  - `packages/auth-client/__tests__/service-refresh-endpoint.test.ts:10-11` 이 `services/web-store` · `web-pharmacy-business` 소스를 import 한다.
  - `packages/store-ui-core/src/api/__tests__/serviceAdapters.test.ts` 가 `services/*/src/api/tablet` 을 import 한다.
  - `packages/forum-core/src/admin-ui/*` 18파일이 admin-dashboard 별칭(`@/components/ui/*`)을 import 한다. 빌드 대상에서 빠져 있다.
- **같은 책임의 이중 구현(역방향보다 실질적인 문제):**

| 축 | 위치 1 | 위치 2 |
|---|---|---|
| `role_assignments` 쓰기 | `modules/auth/services/role-assignment.service.ts` | `packages/organization-core/src/services/PermissionService.ts:325` |
| `organizations` 엔티티 | `packages/organization-core/src/entities/Organization.ts:29` | `modules/store-core/entities/organization-store.entity.ts:26` |
| `UserRole` | `packages/types/src/auth.ts:3` (string) | `apps/api-server/src/types/auth.ts:9` (enum) |
| `hasRole` | `packages/auth-utils` | `packages/auth-client/src/rbac.ts:103` |
| 서비스 scope 가드 | `security-core` `createServiceScopeGuard` | supplier · community · funding scope middleware |
| 가입 게이트 | `common/middleware/membership-guard.middleware.ts` | `middleware/service-membership.middleware.ts:33` |
| GTIN 정규화 | `utils/gtin.ts` | `neture/utils/product-identifier.util.ts` · `product-description-intake/contracts.ts` |
| cart 쓰기 | `services/cart/store-cart.service.ts`(엔티티) | `pharmacy-cart.service.ts`(raw SQL) |
| 상품 원장 | `product_masters` | `catalog_products` · `store_products` |
| AI 프롬프트 | `@o4o/ai-prompts` | api-server `services/ai-prompts/*` |
| AI 모델 · 정책 출처 | `ai_llm_policies` | `ai_query_policy` · `ai_model_settings` · `ai_settings` |
| Quiz · Survey 서비스 | `interactive-content-core` | api-server `modules/lms` · `modules/survey` |
| local-agent 계약 | `services/local-agent/browser-dom-contract.ts` · `ai-tools/work-experience.ts` | `tools/o4o-local-agent` `browser-dom-limits.mjs` · `handlers.mjs` (대조 테스트가 양쪽 소스를 읽는다) |

**결합 강도(분리 비용의 근거):**
- checkout 확정은 한 SQL 에서 `supplier_product_offers ⋈ product_masters ⋈ neture_suppliers ⋈ offer_service_prices` 를 조인한다(`b2b-checkout-confirm.core.ts:182-205`).
- `createOrder(dto, manager)` 는 호출자 트랜잭션 안에서 실행된다. 이벤트 오퍼 수량 확보, cart `FOR UPDATE`(`pharmacy-cart.service.ts:298`), 승인 + listing 원자 생성이 모두 같은 DB 트랜잭션을 전제한다.
- Assistant 테이블은 `work_run_coordination` 외래키와 같은 DB 를 전제한다. quota 정산은 `executeAccounted*` 를 반드시 통과한다.

---

## 5. 정본 문서와 실제 코드의 차이

16-2 에 따라 **보고만** 한다. 정본은 고치지 않는다.

| 문서 | 차이 |
|---|---|
| `O4O-CORE-FREEZE-V1` §2 | 적힌 경로 중 `modules/auth/controllers/auth.controller.ts` · `services/user.service.ts` · `services/refresh-token.service.ts` 가 없다. 실제 컨트롤러는 6종으로 나뉘었다. Core 를 4개(Auth · Membership · Approval · RBAC)로 정의하지만, 실제 가드 정본인 security-core 와 policy-acceptance · service-legal · handoff 는 목록 밖이다 |
| `CLAUDE.md` §3 · `docs/baseline/core-boundary.md` | 동결 Core 를 `auth-core` · `cms-core` · `platform-core` · `organization-core` **패키지**로 적고 근거를 CORE-FREEZE 로 든다. 그러나 CORE-FREEZE 의 Core 는 api-server 파일 기준이고 cms-core 언급이 없다. `auth-core` 는 소비처 0, `platform-core` 는 매장 slug · 정책 패키지다. **「동결 Core」라는 말이 가리키는 대상이 두 문서에서 서로 다르다** |
| `RBAC-FREEZE-DECLARATION-V1` §2 · §4 | Write 단일 경로 규정 ↔ organization-core `PermissionService.assignRole`. 「`UserRole` enum 에 등록」 ↔ UserRole 이중 정의 |
| `USER-OPERATOR-FREEZE-V1` §3 | 「각 서비스 RoleGuard.tsx」 ↔ 실제로는 web-neture · web-pharmacy-business 2곳뿐이다. 공통 판정은 auth-utils `membershipGate` · auth-react `createRouteGuard` 로 옮겨졌다 |
| auth-core `manifest.ts:47` | `ownsTables` 에 `refresh_tokens` 가 남아 있다 ↔ CORE-FREEZE 31행은 DEAD_RETIRE 로 정정했다 |
| `NETURE-DISTRIBUTION-ENGINE-FREEZE-V1` §8 · §9 | `neture_supplier_products` → 실제 `supplier_product_offers`. `product-policy-v2.internal.routes.ts` 없음. store-hub · pharmacy-products 컨트롤러는 `routes/o4o-store/controllers/` 에 있다 |
| `CHECKOUT-STABLE-DECLARATION-V2` · B2B 계약 | `PharmacyHubCartCheckoutService` · `PharmacyHubPaymentEventHandler` 서술이 남아 있다(코드 없음). B2B 계약 §5 제목은 「3개 축」(본문 주석은 5축). `web-pharmacy-business/src/utils/worktableCart.ts` 없음 |
| `STORE-LAYER-ARCHITECTURE` §3.3 | 「api-server 가 `@o4o/store-core` 를 소비」 ↔ 실제 import 0 |
| `APP-LMS-BASELINE` §9 | 「lms-client 없음 · LMS Template 없음」 ↔ lms-client · lms-ui 가 있고 쓰인다. K-Cosmetics 를 「구현 예정」으로 남겨 은퇴와 충돌한다 |
| `CONTENT-STABLE-DECLARATION-V1:161` | Frozen 패키지 `@o4o/hub-exploration-core` 가 저장소에 없다 |
| `CANONICAL-INDEX` §6 · Content Core 개요 | 「Content Core = 단일 출처」 ↔ `@o4o-apps/content-core` 는 SKELETON · 소비 0 · 엔티티 미등록 |
| `.github/CODEOWNERS` | `@o4o-platform/*-team` 을 지정한다. 저장소 소유자는 개인 계정(`Renagang21`)이라 이 조직 팀은 존재할 수 없다. 현재 **아무 효과가 없다**(조직 존재 여부는 미확인) |

---

## 6. 분류 — 통합 대상 · 유지 대상 · 제거 검토 대상

### 6-1. Core 통합 대상

여기서 「통합」은 물리 이동이 아니라 **Core registry 에 등재하고 B 등급으로 관리**한다는 뜻이다.

| 영역 | 대상 |
|---|---|
| identity · authorization | api-server `modules/auth` · `common/middleware/auth/*` · `membership-guard` · `service-membership.middleware` · `modules/user` · `policy-acceptance` · `service-legal` · `entities/LinkedAccount.ts` · `AdminUserController` · `MembershipConsoleController` / `@o4o/security-core` / `@o4o/auth-utils`(판정 계약) · `@o4o/auth-client`(transport 계약) |
| organization | `@o4o/organization-core` 엔티티 + `OrganizationService`. `organizations` 이중 매핑과 `PermissionService.assignRole` 은 정리가 필요하다 |
| commerce-contract | `services/checkout.service.ts` · `services/cart/*` · `entities/checkout/*` · `entities/cart/*` · `@o4o/payment-core` |
| product | `modules/neture/entities/*` · neture 공통 규칙 파일(§3-B) · `modules/product-policy-v2` · `entities/ProductApproval.ts` · `modules/store-core/entities/*` · `utils/gtin.ts` |
| ai | `@o4o/ai-core` 실행부 · `modules/ai-policy` · `@o4o/file-understanding-core` |
| assistant | `services/assistant/*` · ai-tools 의 판단 파일(work-planner · routers · workflow-candidate) · local-agent 프로토콜 계약 양쪽 |
| contracts · schema | `apps/api-server/src/database/entities.ts` · `database/migrations` · incremental manifest · `@o4o/types` 의 auth · 계약 부분 · `@o4o/platform-core` · 엔티티 패키지(cms · forum `/entities` · signage · interactive-content · education · lms · mail · market-trial · action-log · asset-copy) |

### 6-2. 유지 대상 (지금 위치 그대로, A 등급 중심)

- **공통 UI 라이브러리:** ui · content-editor · block-renderer · slide-app · appearance-system · error-handling · lms-ui · lms-client · shared-space-ui · operator-ux-core · operator-core-ui · store-ui-core · tablet-screen-set-editor · admin-ux-core · account-ui · auth-react · auth-context · store-products-ui · store-asset-policy-core · tablet-kiosk-core · hub-core · ai-components · hospital-pharmacy-core
- **서비스 업무:** neture-pharmacy · cooperation-workflows · store-ai · copilot · ai-extensions · store-entitlement · external-sales · cafe24 · credit · point · automation · external-ai · personal-mail · content-guard · media · lms · survey
- **서비스 업무 프롬프트:** `@o4o/ai-prompts` 는 Core 밖에 둔다
- **그 밖:** capabilities · cpt-registry · utils(UI 부분 분리는 선택)

### 6-3. 제거 검토 대상 (별도 WO · 각 항목은 소비처 재확인 후)

| 대상 | 근거 | 함께 정리할 것 |
|---|---|---|
| `packages/auth-core` | import · 의존 0 | 부재 · 경로를 고정하는 spec, `appsCatalog.ts:180` · `disabled-apps.registry.ts:49` 메타, `platform-core/manifest.ts:27`, CLAUDE.md §3 · core-boundary 의 동결 목록(문서 작업) |
| `packages/api-types` · `forum-cosmetics` · `organization-forum` · `organization-lms` · `content-core` | 소비 0 · K-Cos 등 잔재 | api-server 의 선언만 있는 의존(content-core · organization-forum · block-renderer · utils), `appsCatalog.ts:391,404` |
| `packages/operator-core` · `packages/store-core` | 소비 0(store-core 는 「존재」만 단언하는 spec 있음) | `ecommerce-core-and-commerce-residue-retirement.spec.ts:217` |
| `packages/pharmacy-ai-insight` | api-server import 0, admin mock 페이지 | admin `routes/apps.routes.tsx:12` |
| 패키지 내부 dead code | forum-core admin-ui · search · 미등록 migration, lms-core EngagementLog, interactive-content-core 서비스 계층, market-trial routes · lifecycle, payment-core `PaymentEventLog`(미등록), ai-core 의 미사용 서비스별 정책 상수, ai-prompts `./care` | |
| 레거시 경로 | `NetureService.createOrder` + 410 route, `catalog_products` · `store_products` 이중 원장(운영 데이터 확인 후) | 운영 DB 확인은 LOCAL |

---

## 7. 원격 공동개발자 접근 범위 (A / B / C)

### 7-1. 전제

- **Private 저장소에서 협업자 권한은 저장소 단위다.** read 권한이 있으면 모든 파일을 읽는다. 같은 저장소 안의 C 를 숨길 방법은 없다.
- **B 는 「읽기 · 수정 · PR 은 자유, 병합 전에 표시 · 검토」로 구현한다.** 현재도 병합은 통합 담당만 하므로(AGENTS.md §4), 새 승인 계층을 만들 필요는 없다. B 경로를 바꾼 PR 이 **자동으로 눈에 띄게** 하면 충분하다.
  - CODEOWNERS 를 실제 계정으로 고친다.
  - `.github/labeler.yml` 에 `core-change` 라벨을 추가한다.
  - (선택) ruleset 의 code owner review 를 켠다. 개인 소유 Private 저장소에서 이 기능의 플랜 조건은 **미확인**이다.
- C 는 별도 Private 저장소나 서버 서비스로 분리해야만 의미가 있다(§7-3).

### 7-2. 모듈별 분류

| 등급 | 대상 |
|---|---|
| **A — 일반 개발** | §6-2 전부. web-* 서비스 전체. ai-tools 실행기 중 사이트 어댑터. bootstrap 에 route 를 추가하는 수준(§4-3 R6 의 정렬 규칙) |
| **B — 계약 변경 승인** | §6-1 전부. 특히 다음: 인증 · RBAC · 가입(F9 · F10 · F11), `security-core`(테스트 0 · 54파일 파급), `checkout.service.ts` · `services/cart/*` · checkout · cart 엔티티, neture 상품 · 오퍼 · 가격 규칙 파일, `product-policy-v2`, `store-core` 엔티티, `payment-core`, `ai-core` exports · provider interface, `ai-policy` quota · 가격 스키마, `file-understanding-core` contract, local-agent 프로토콜 양쪽 · 내장 Node 22.18.0 · installer 계약, `database/entities.ts` · `migrations` · manifest, 루트 `build:packages`, `.github/` · `.claude/` |
| **C — 소스 분리 후보** | ① Personal Assistant 판단 정책: `services/assistant/*` 의 계획 · 판정 · 이해 시스템 프롬프트, `work-planner` · 라우터의 판단 프롬프트, Experience → Skill 승격 규칙(**Skill 은 미구현이라 처음부터 분리 설계가 가능한 유일한 대상**). ② 핵심 업무 연결 규칙 중 **순수 함수 부분**: `master-link-policy` · `offer-write-policy` · 식별자 정규화 · drug-commerce 판정 · 상태 enum. 엔티티 · 트랜잭션 서비스는 공유 DataSource 때문에 분리할 수 없다 |
| **C 로 두지 않는 것** | 인증 Core. 가정대로 **B 유지**가 맞다. 소스를 숨겨도 보안 이득이 작다(보안은 키 · 시크릿에 있고, 시크릿은 이미 저장소 밖 Secret Manager 에 있다). 숨기면 모든 서비스 개발이 막힌다 |

### 7-3. C 분리 방식 비교 (실행하지 않음)

| 방식 | 무엇을 숨기나 | 필요한 것 | 부담 (1인 유지보수 기준) |
|---|---|---|---|
| ① 별도 Private 저장소 + 사설 패키지 | 순수 규칙 · 프롬프트 소스 | GitHub Packages 등 레지스트리, 버전 publish, 본 저장소 CI · Cloud Build 의 읽기 토큰, 로컬 개발자 토큰 | **높음.** 두 저장소의 버전을 맞춰야 하고, 협업자 CI 에서는 실제 구현 없이 빌드해야 한다(stub 필요). 교차 저장소 대조 테스트가 깨진다 |
| ② 별도 서버 서비스 | Assistant 판단 전체 | 새 Cloud Run 서비스, 원격 accounting API(quota 정산), 인증 서비스 간 호출, DB 소유 재설계 | **매우 높음.** 트랜잭션 · 외래키(`work_run_coordination`) · 메모리 캐시를 다시 설계해야 한다 |
| ③ **소스 밖 설정으로 이동** | 프롬프트 문구 · 정책 수치 · 판단 임계값 | 이미 있는 패턴 재사용: `AI_PRICING_CATALOG` 처럼 환경 변수 · Secret · DB 설정에서 읽는다. 저장소에는 기본값 · 스키마 · 로더만 남긴다 | **낮음.** 코드 구조는 그대로다. 협업자는 실행 경로를 보지만 운영 값은 보지 않는다. 단, 값 변경 이력과 테스트 fixture 관리가 필요하다 |
| ④ 분리하지 않음 (B 로 관리) | 없음 | CODEOWNERS · 라벨 | **최저.** 협업자 신뢰 수준에 따라 충분할 수 있다 |

**권장:** 지금은 ④로 시작한다. Assistant 판단 프롬프트처럼 「소스는 보여도 되지만 운영 문구 · 값은 보이면 안 되는」 항목이 확정되면 ③을 적용한다. ①·②는 협업자 범위가 저장소 단위 신뢰로 부족하다고 결정됐을 때에만 별도 IR 로 다시 산정한다.

---

## 8. 목표 디렉터리 구조 비교

| 안 | 구조 | 장점 | 단점 | 판단 |
|---|---|---|---|---|
| **α. 최상위 `core/`** (작업 지시 §5 후보) | `core/{identity,authorization,organization,product,ai,assistant,contracts}` | 이름만으로 Core 가 보인다 | ① 진짜 Core(api-server 내부)는 엔티티 · DataSource · 트랜잭션 때문에 패키지로 뺄 수 없다. 결국 `core/` 에는 껍데기 · 엔티티 패키지만 들어가고 Core 가 두 곳으로 갈라진다. ② workspace · tsconfig paths · detect-affected · 46개 경로 파일 · deploy filter 를 바꿔야 한다. ③ 이동 PR 이 열려 있는 동안 다른 PR 이 막힌다(§4-3 R3) | **비권장** |
| **β. 기존 `packages/*-core` 유지 + 정리** | 위치 유지. 소비 0 패키지 제거, 이름과 실제가 다른 패키지는 문서 · 이름 정정 | 빌드 · CI 변경이 거의 없다 | api-server 안의 Core 는 여전히 흩어져 보인다 | 1단계로 채택 |
| **γ. api-server 내부 `src/core/` + registry** | `apps/api-server/src/core/{identity,authorization,commerce,product,ai,assistant}` — 실제 Core 구현을 api-server 안에서만 모은다. packages 는 β 그대로 | 런타임 · 번들 · DataSource 구조가 그대로다. 「Core 는 여기」를 경로로 보여 줄 수 있다. CODEOWNERS 한 줄로 B 를 지정할 수 있다 | 내부 import 경로를 대량으로 바꿔야 한다(예: OPL 참조 64파일, SupplierProductOffer 54파일). neture 모듈은 공통 규칙과 업무 구현이 섞여 있어 먼저 분리 기준이 필요하다 | 선택. 작은 묶음(identity · authorization)부터 |
| **δ. 이동 없이 registry 만** | 경로는 그대로 두고 `docs/baseline/O4O-CORE-REGISTRY-V1.md`(가칭)에 Core 경로 · 등급 · 소유를 표로 둔다. 같은 목록을 CODEOWNERS · labeler 가 사용한다 | 비용이 가장 낮다. 즉시 효과(B 표시)가 있다 | 경로를 봐서는 Core 인지 알 수 없다 | **1단계로 채택** |

**권장 목표:** δ + β 로 시작하고, 효과를 본 뒤 γ 를 묶음 단위로 선택 적용한다. 최상위 `core/`(α)는 채택하지 않는다.

---

## 9. 단계별 구현 순서 (각 단계 = 별도 WO · 별도 PR)

| 단계 | 내용 | 영향 | 검증 | 복구 |
|---|---|---|---|---|
| **0. 문서 정합** (문서 전용 PR) | 「동결 Core」 정의 일원화(CLAUDE.md §3 · core-boundary ↔ CORE-FREEZE), CORE-FREEZE §2 경로 갱신, §5 의 drift 목록 처리. Core registry 문서 신설 | 문서만 | `check-doc-sensitive` · 링크 확인 | revert |
| **1. 경계 표시** (CI · 설정 PR · §5 위험 변경 → 통합 담당 승인) | CODEOWNERS 를 실제 계정 · registry 경로로 교체, `labeler.yml` 에 `core-change` 라벨 추가. (선택) ruleset code owner review | `.github/` | 시험 PR 에서 B 경로 변경 시 라벨 · 리뷰 요청이 붙는지 확인 | revert. ruleset 은 설정 화면에서 끈다 |
| **2. 잔재 제거** (패키지별 소형 PR) | §6-3 의 소비 0 패키지 9개와 선언만 있는 의존 · spec · catalog 메타 정리 | 루트 · 각 `package.json` · `pnpm-lock.yaml`(§5 dependency 변경 → 승인), api-server `build:deps` | `pnpm install --frozen-lockfile` · `build:packages` · api-server type-check · 관련 jest · `detect-affected` 테스트 | revert(엔티티 · 테이블은 건드리지 않으므로 DB 영향 없음) |
| **3. 중복 일원화** (축별 PR, §4 표) | UserRole · hasRole → 한 계약. GTIN 정규화 3 → 1. scope 가드 → security-core(**테스트 먼저 추가**). `PermissionService.assignRole` 제거 또는 RA 서비스 위임. `organizations` 이중 매핑 정리(엔티티 매핑만 · 스키마 불변 확인). 프롬프트 저장소 2 → 1 | api-server · packages. `organizations` 는 core-hub lane(§4-3) | 축별 기존 spec + 신규 spec, 엔티티 매핑은 격리 PostgreSQL 회귀(SETUP §5) | revert. 스키마는 바꾸지 않는다(바뀌면 별도 migration WO) |
| **4. AI 실행부 정리** | ai-core 에서 서비스별 정책 상수를 밖으로 이동. provider 직접 호출 7파일을 Core provider(멀티모달 · TTS · grounding)로 옮길지 결정. 모델 · 정책 출처 4 → 통합안 IR | ai-core(FROZEN → WO 필요) · ai-policy | accounted 실행 · quota spec, provider mock | revert |
| **5. (선택) api-server `src/core/` 이동** | identity · authorization 부터 `move:` PR(동작 변경 0 · 목표 2시간 · §4-3 R3). 그다음 commerce-contract. neture 는 공통 규칙 · 업무 구현 분리 기준을 먼저 정한다 | api-server 내부 import, jest 경로 | type-check · 전체 API jest 3 shard · tsup 번들 · `entities.ts` 등록 수 불변 | revert(순수 이동이므로 기계적) |
| **6. (조건부) C 처리** | §7-3 ③ 프롬프트 · 정책 값 외부화 → 필요할 때만 ①·② 재산정 IR | assistant · ai-tools | 기본값 fixture 로 기존 spec 유지 | 기본값 fallback |

**순서 근거:**
- 0~2 는 비용이 낮고 되돌리기 쉽다. 이후 단계의 소음(잔재 · 잘못된 문서)을 먼저 없앤다.
- 3 은 실제 버그 위험(RBAC 이중 쓰기 · 이중 매핑)을 줄인다.
- 5 · 6 은 효과를 본 뒤 선택한다.
- 각 단계는 §4-3 lane(core-hub · shared-package · migration)과 R7 통합 순서를 따른다.

---

## 10. 예상 개발 부담과 유지보수 영향

| 항목 | 부담 | 유지보수 영향 |
|---|---|---|
| 0 · 1 (문서 · 표시) | 작음(PR 2~3개) | 공동개발자가 「어디가 Core 인가」를 문서와 PR 라벨로 바로 안다. 통합 담당의 검토 대상이 좁혀진다 |
| 2 (잔재 9개) | 작음~중간(패키지당 소형 PR, lockfile 변경 포함) | 빌드 시간 · 혼동이 준다. 「동결 Core 인데 소비 0」 같은 모순이 사라진다 |
| 3 (중복 일원화) | 중간(축별 1 PR, RBAC · organizations 는 신중) | 같은 규칙을 두 곳에서 고치는 일이 사라진다. RBAC 단일 쓰기 경로를 회복한다 |
| 4 (AI) | 중간 | 사용량 · 가격 · 모델 정책의 출처가 하나가 된다 |
| 5 (`src/core/` 이동) | 중간~큼(import 대량 변경 · 열린 PR 충돌) | 경로만으로 Core 를 알 수 있다. 이동 중에는 다른 PR 을 멈춰야 한다 |
| α (`core/` 최상위) | 큼(46+ 경로 파일 · workspace · CI) | Core 가 오히려 두 곳으로 갈라진다. **비권장** |
| C ①·② (저장소 · 서버 분리) | 큼~매우 큼, 상시 부담(버전 · 토큰 · stub) | 1인 유지보수 원칙과 충돌한다 |

---

## 11. 추가 판단이 필요한 사항 (사용자 · 통합 담당)

1. **「동결 Core」의 정의.** CORE-FREEZE(api-server 파일 기준 4축)와 CLAUDE.md §3(패키지 4개) 중 어느 쪽을 정본으로 삼을지 정해야 한다. 이 IR 은 「api-server 실물 + registry」 쪽을 권한다.
2. **공동개발자 신뢰 범위.** 저장소 전체 읽기를 허용할지 정해야 한다. 허용하면 C 는 ④(분리 없음)로 충분하다. 허용하지 않으면 어느 항목을 숨길지 구체 목록이 필요하다(③ 외부화 대상).
3. **B 강제 수준.** 라벨 · CODEOWNERS 표시만 할지, ruleset code owner review 까지 켤지 정해야 한다. 개인 소유 Private 저장소의 플랜 조건 확인이 필요하다.
4. **`organizations` 이중 매핑 · `PermissionService.assignRole` 처리 방향.** organization-core 를 api-server 로 흡수할지, 패키지를 유지하고 쓰기 경로만 막을지 정해야 한다.
5. **`catalog_products` · `store_products` 원장의 운명.** 운영 데이터 확인이 필요하다(LOCAL read-only).
6. **Skill 설계 위치.** Skill 은 미구현이다. 처음부터 별도 경계(③ 또는 분리 저장소)로 설계할지 정해야 한다.

### 미확인 (후속 조사 시 LOCAL · 별도 확인)

- 운영 DB 존재 · 행 수: `content_assets` · `cosmetics_forum_meta` · `lms_engagement_logs` · `payment_event_logs` · `catalog_products` · `store_products`
- `work_run_coordination` 의 원 migration (canonical baseline · manifest 에만 보인다)
- 각 Core 테이블 생성 migration 전수 대조. 확인한 것은 `service_memberships` · `role_assignments` 뿐이다
- 패키지 lifecycle · manifest 의 런타임 호출 여부(선행 IR 은 install/uninstall 호출 0 을 확인했다)
- supplier · community · funding scope 가드가 RA 기반인지
- 서비스별 route guard 전수 조사
- forum-core 권한 utils 의 런타임 도달 여부
- `AiEngine` · `ai_query_logs` 실사용
- GitHub `@o4o-platform` 조직 · 팀 존재 여부, 개인 소유 Private 저장소의 CODEOWNERS · ruleset 플랜 조건

---

## 문서 정합

`발견 12건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`

- 발견 12건은 §5 표의 12행이다(한 행에 같은 문서의 세부 차이 여러 개를 묶었다).
- 이번 작업은 조사 전용이라 기준 문서를 수정하지 않았다(16-2).
- 별도 WO 제안은 §9 단계 0 「문서 정합 · Core registry」이다.
