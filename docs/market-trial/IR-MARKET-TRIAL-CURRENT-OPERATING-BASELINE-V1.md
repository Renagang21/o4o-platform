# IR-MARKET-TRIAL-CURRENT-OPERATING-BASELINE-V1

> **Market Trial 현재 운영 기준선 문서**
>
> 작성일: 2026-04-15
> 상태: Active Baseline

---

## 1. Overview

Market Trial은 **공급자(Supplier)가 제안한 시범판매를 약국 회원이 참여하여 상품을 검증하는** O4O 플랫폼 Extension App이다.

### 핵심 가치

- 공급자: 신규 상품의 시장 반응을 사전 검증하고, 성공 시 정식 유통으로 전환
- 약국 회원: 신규 상품을 사전 체험하고, 보상(현금/제품)을 받으며 취급 여부를 결정
- 플랫폼: Trial 성과 데이터 기반의 상품 큐레이션 및 유통 최적화

### 시스템 위치

```
Extension App (@o4o/market-trial)
├── packages/market-trial/          ← Core 패키지 (Entity, Service, Types)
├── apps/api-server/controllers/    ← API Controller (Public + Operator)
├── apps/api-server/routes/         ← Route 정의
├── services/web-kpa-society/       ← 참여자 허브 (Hub)
├── services/web-neture/            ← 운영 관리 (본진)
├── services/web-glycopharm/        ← 게이트웨이
└── services/web-k-cosmetics/       ← 게이트웨이
```

---

## 2. Core Structure (3-Service Architecture)

Market Trial은 3개 서비스에 걸쳐 역할이 분리된다.

### 2.1. Neture (본진 / Origin)

| 항목 | 내용 |
|------|------|
| 역할 | Trial 생성, 승인, 운영 관리, 상품 전환 |
| 사용자 | 공급자(Supplier), 네뚜레 운영자(Operator) |
| Route 기반 | `/api/v1/neture/operator/market-trial/*` |
| 주요 기능 | Trial CRUD, 1차 승인(SUBMITTED→RECRUITING), 상태 전이, 참여자 관리, CSV Export, 퍼널 분석, 상품 전환, 매장 진열 등록, 전환 알림 |

**운영자 API 전체 목록:**

| Method | Path | 기능 |
|--------|------|------|
| GET | `/` | 전체 Trial 목록 |
| GET | `/products/search` | 상품 검색 (전환 모달용) |
| GET | `/:id` | Trial 상세 (ServiceApproval + forumLink 포함) |
| GET | `/:id/funnel` | 퍼널 집계 (참여→관심→취급→주문→진열) |
| GET | `/:id/participants` | 참여자 목록 (필터 지원) |
| GET | `/:id/participants/export` | 참여자 CSV 다운로드 |
| PATCH | `/:id/participants/:pid/reward-status` | 보상 이행 상태 변경 |
| PATCH | `/:id/participants/:pid/conversion` | 고객 전환 단계 변경 |
| POST | `/:id/participants/:pid/listing` | 매장 진열 자동 등록 |
| PATCH | `/:id/status` | Trial 상태 전환 (수동) |
| PATCH | `/:id/approve` | 1차 승인 |
| PATCH | `/:id/reject` | 1차 반려 |
| POST | `/:id/convert` | Trial→상품 전환 |

### 2.2. KPA Society (허브 / Hub)

| 항목 | 내용 |
|------|------|
| 역할 | 약국 회원의 Trial 참여, 허브 페이지, 포럼 연동 |
| 사용자 | 약국 회원(Pharmacy Member) |
| Route 기반 | `/market-trial/*` (프론트엔드), `/api/market-trial/*` (API) |
| 주요 기능 | Gateway 접근 체크, Trial 목록/상세, 참여(Join), 내 참여 현황, 포럼 딥링크 |

**Public/Auth API 목록:**

| Method | Path | Auth | 기능 |
|--------|------|------|------|
| GET | `/gateway` | Optional | 접근 상태 + 오픈 Trial 요약 |
| GET | `/` | Optional | Trial 목록 (상태/서비스 필터) |
| GET | `/:id` | Optional | Trial 상세 |
| POST | `/` | Required | Trial 생성 (공급자) |
| GET | `/my` | Required | 내 Trial 목록 (공급자) |
| GET | `/my-participations` | Required | 내 참여 목록 |
| GET | `/:id/participation` | Required | 특정 Trial 참여 상태 |
| GET | `/:id/results` | Required | 공급자용 결과 조회 |
| POST | `/:id/join` | Required | Trial 참여 |
| PATCH | `/:id/submit` | Required | Trial 제출 (DRAFT→SUBMITTED) |

**프론트엔드 컴포넌트:**

| 컴포넌트 | 위치 | 역할 |
|----------|------|------|
| `MarketTrialSection` | 커뮤니티 홈 (3번째 섹션) | 모집중 Trial 최대 3건 노출, Gateway 기반 접근 분기 |
| `MarketTrialHubPage` | `/market-trial` | Trial 전체 목록 |
| `MarketTrialDetailPage` | `/market-trial/:id` | Trial 상세 + 참여 폼 + 포럼 딥링크 |

### 2.3. GlycoPharm / K-Cosmetics (게이트웨이 / Gateway)

| 항목 | 내용 |
|------|------|
| 역할 | Trial 노출, KPA 허브로 리다이렉트 |
| 사용자 | 해당 서비스 회원 |
| Route 기반 | Gateway API (`/api/market-trial/gateway?serviceKey=glycopharm`) |
| 주요 기능 | 서비스별 visibleServiceKeys 필터링, 서비스 운영자 Trial 조회 |

**서비스 운영자 API (2차 승인 — DEPRECATED):**

| Method | Path | 상태 |
|--------|------|------|
| GET | `/api/v1/:serviceKey/operator/market-trial/` | 유지 (목록 조회) |
| GET | `/api/v1/:serviceKey/operator/market-trial/:id` | 유지 (상세 조회) |
| PATCH | `/:id/approve` | **403 반환** (단일 승인 전환됨) |
| PATCH | `/:id/reject` | **403 반환** (단일 승인 전환됨) |

---

## 3. User Flows

### 3.1. 공급자 흐름 (Supplier Flow)

```
공급자 로그인 (Neture)
  → Trial 작성 (DRAFT)
    → title, description, outcomeSnapshot, visibleServiceKeys,
       fundingStartAt, fundingEndAt, trialPeriodDays, maxParticipants
  → Trial 제출 (DRAFT → SUBMITTED)
  → [대기] Neture 운영자 심사
  → 승인 시: RECRUITING + 포럼 게시글 자동 생성
  → 결과 확인: /api/market-trial/:id/results
    → 참여 통계, 전환 파이프라인, 매장 진열 수, 포럼 링크
```

### 3.2. 참여자 흐름 (Participant Flow)

```
약국 회원 로그인 (KPA Society)
  → 커뮤니티 홈 → MarketTrialSection (모집중 Trial 노출)
  → 또는 /market-trial (허브 페이지)
  → Trial 상세 → 보상 선택 (cash/product)
  → 참여 (POST /api/market-trial/:id/join)
  → [참여 후] 포럼 딥링크로 토론 참여
  → [Trial 종료 후] 보상 수령
```

### 3.3. 운영자 흐름 (Neture Operator Flow)

```
네뚜레 운영자 로그인
  → Trial 관리 목록 (status 필터)
  → SUBMITTED Trial 심사
    → 승인: SUBMITTED → RECRUITING (visibleServiceKeys 지정)
    → 반려: SUBMITTED → CLOSED
  → RECRUITING 관리
    → 참여자 목록, 퍼널 분석
    → 상태 전환: RECRUITING → DEVELOPMENT → OUTCOME_CONFIRMING
  → 이행 관리
    → 참여자 보상 이행 (pending → fulfilled)
    → 고객 전환 추적 (none → interested → considering → adopted → first_order)
  → 상품 전환
    → Trial → 기존 상품 연결 (convertToProduct)
    → 매장 진열 자동 등록 (createListingFromParticipant)
    → 전환 알림 발송 (product 보상 참여자)
  → 종료: FULFILLED → CLOSED
```

---

## 4. Role Definitions

### 4.1. 역할별 접근 매트릭스

| 역할 | Trial 생성 | Trial 참여 | 1차 승인 | 참여자 관리 | 상품 전환 | 포럼 접근 |
|------|:----------:|:----------:|:--------:|:-----------:|:---------:|:---------:|
| Supplier | O | X | X | X (결과 조회만) | X | 읽기/쓰기 |
| Pharmacy Member | X | O | X | X | X | 읽기/쓰기 |
| Neture Operator | X | X | O | O | O | X |
| Service Operator | X | X | X (DEPRECATED) | 조회만 | X | X |
| Guest | X | X | X | X | X | X |

### 4.2. Gateway 접근 상태 (AccessStatus)

Gateway API는 사용자 상태에 따라 아래 값을 반환한다:

| accessStatus | 조건 | 프론트엔드 동작 |
|--------------|------|----------------|
| `accessible` | 로그인 + KPA 멤버십 + 약국 회원(left_at IS NULL) | Trial 목록 노출, "참여하기" CTA |
| `not_logged_in` | 미로그인 | "로그인 후 참여" 배너 |
| `no_kpa_membership` | 로그인했으나 KPA 멤버십 없음 | "회원 가입 후 참여" 안내 |
| `not_pharmacy_member` | KPA 멤버십 있으나 약국 소속 없음 | "약국 인증 후 참여" 안내 |
| `no_trials` | 접근 가능하나 모집중 Trial 없음 | 섹션 숨김 |

**Gateway 접근 체크 로직 (순서):**

1. 로그인 체크 (`req.user.id`)
2. KPA 멤버십 체크 (`service_memberships WHERE service_key IN ('kpa', 'kpa-society')`)
3. 약국 회원 체크 (`organization_members JOIN organizations WHERE left_at IS NULL`)
4. 모집중 Trial 조회 (`status = 'recruiting'`, serviceKey 필터 optional)

---

## 5. Service Boundaries

### 5.1. 서비스 간 경계 정책

| 규칙 | 설명 |
|------|------|
| **데이터 소유권** | `market_trials`, `market_trial_participants` 등 모든 Market Trial 테이블은 Neture 도메인 소유 |
| **참여 채널** | 참여(Join)는 KPA Society 프론트엔드에서만 가능 |
| **가시성 제어** | `visibleServiceKeys` JSONB 배열로 서비스별 노출 제어 |
| **Cross-domain 조회** | Gateway API는 `organization_members`, `service_memberships` JOIN — 읽기 전용 |
| **포럼 연동** | `market_trial_forums` 매핑 테이블로 forum_post와 연결 (forum-core는 별도 도메인) |
| **상품 연동** | `convertedProductId`는 `supplier_product_offers.id` 참조 (FK 없음, UUID 연결) |
| **매장 진열** | `organization_product_listings` INSERT — source_type='market_trial' 태깅 |

### 5.2. 서비스 키 정규화

| DB 값 | 실제 의미 | 비고 |
|--------|-----------|------|
| `kpa` | KPA Society 멤버십 | 일부 사용자의 service_memberships |
| `kpa-society` | KPA Society 멤버십 | 미들웨어에서 `kpa → kpa-society` 매핑 |

Gateway는 `service_key IN ('kpa', 'kpa-society')`로 양쪽 모두 처리한다.

---

## 6. Data Model

### 6.1. 테이블 목록

| 테이블 | 유형 | 설명 |
|--------|------|------|
| `market_trials` | Core | Trial 캠페인 |
| `market_trial_participants` | Core | 참여자 펀딩 기록 |
| `market_trial_forums` | Core | Trial↔Forum Post 매핑 |
| `market_trial_decisions` | Core | 참여자 사후 결정 (CONTINUE/STOP) |
| `market_trial_service_approvals` | Core | 서비스별 승인 (DEPRECATED) |
| `market_trial_shipping_addresses` | Extension | 배송지 수집 |
| `market_trial_fulfillments` | Extension | 이행 추적 |

### 6.2. Trial Status Lifecycle

```
DRAFT                    ← 공급자 작성 중
  ↓ [submit]
SUBMITTED                ← 운영자 심사 대기
  ↓ [approve]                ↓ [reject]
RECRUITING               CLOSED
  ↓ [manual / auto]
DEVELOPMENT              ← 시범 준비/진행
  ↓ [manual]
OUTCOME_CONFIRMING       ← 결과 확정, 결정 수집
  ↓ [manual]
FULFILLED                ← 이행 완료
  ↓ [manual]
CLOSED                   ← 종료 (터미널)
```

**Pre-launch 상태** (Public API 미노출): `DRAFT`, `SUBMITTED`, `APPROVED`

**자동 전이**:
- 펀딩 기간 만료 + 목표 달성 → `DEVELOPMENT`
- 펀딩 기간 만료 + 목표 미달 → `CLOSED`

### 6.3. Customer Conversion Pipeline

참여자별 고객 전환 추적 (운영자가 수동 업데이트):

```
none → interested → considering → adopted → first_order
(참여만)  (관심 있음)  (취급 검토)   (취급 시작)  (첫 주문 완료)
```

- `adopted` 이상에서 매장 진열 등록 가능
- `first_order`는 최종 전환 확인

### 6.4. 포럼 연동

- Trial 승인 시 `forum_category` `f0000000-0a00-4000-f000-0000000000f1` (시범판매 카테고리)에 자동 게시글 생성
- `market_trial_forums` 테이블에 `marketTrialId ↔ forumId` 매핑 저장
- 프론트엔드에서 `forumPostId`를 통해 `/forum/post/:slug` 딥링크 제공
- 포럼 접근 권한: 공급자 + 참여자만 읽기/쓰기, 게스트 불가

---

## 7. Completed Features (구현 완료)

### Phase 1 (Foundation)

| Feature | WO | 상태 |
|---------|-----|------|
| DB Persistence (In-memory → TypeORM) | WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1 | DONE |
| 8-state TrialStatus 통일 | WO-MARKET-TRIAL-POLICY-ALIGNMENT-V1 | DONE |
| visibleServiceKeys 서비스 가시성 | WO-MARKET-TRIAL-B2B-API-UNIFICATION-V1 | DONE |
| Neture 단일 승인 (2차 승인 제거) | WO-MARKET-TRIAL-NETURE-SINGLE-APPROVAL-TRANSITION-V1 | DONE |

### Phase 2 (Participant Hub)

| Feature | WO | 상태 |
|---------|-----|------|
| Gateway API (접근 상태 + Trial 요약) | WO-MARKET-TRIAL-SERVICE-ENTRY-BANNER-AND-GATEWAY-V1 | DONE |
| KPA 커뮤니티 홈 블록 | WO-MARKET-TRIAL-COMMUNITY-HOME-BLOCK-IMPLEMENT-V1 | DONE |
| KPA 상세 + 포럼 딥링크 | WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1 | DONE |
| 내 참여 현황 | WO-MARKET-TRIAL-MY-PARTICIPATION-STATUS-V1 | DONE |
| 포럼 카테고리 연동 | WO-MARKET-TRIAL-KPA-FORUM-INTEGRATION-V1 | DONE |

### Phase 3 (Operations)

| Feature | WO | 상태 |
|---------|-----|------|
| 참여자 관리 + CSV Export | WO-MARKET-TRIAL-PARTICIPANT-EXPORT-V1 | DONE |
| 보상 이행 관리 | WO-MARKET-TRIAL-SETTLEMENT-AND-FULFILLMENT-MANAGEMENT-V1 | DONE |
| 상품 전환 (Trial→Product) | WO-MARKET-TRIAL-TO-PRODUCT-CONVERSION-FLOW-V1 | DONE |
| 매장 진열 자동 등록 | WO-MARKET-TRIAL-LISTING-AUTOLINK-V1 | DONE |
| 고객 전환 추적 | WO-MARKET-TRIAL-PARTICIPANT-TO-CUSTOMER-FLOW-V1 | DONE |
| 퍼널 집계 API | WO-MARKET-TRIAL-OPERATIONS-CONSOLIDATION-V1 | DONE |
| 전환 알림 발송 | WO-MARKET-TRIAL-CONVERSION-NOTIFICATION-V1 | DONE |
| 공급자 결과 조회 | WO-MARKET-TRIAL-SUPPLIER-RESULTS-AND-FEEDBACK-V1 | DONE |
| 상품 검색 (전환 모달) | WO-MARKET-TRIAL-PRODUCT-LINK-SEARCH-UI-V1 | DONE |

### Stabilization

| Feature | WO | 상태 |
|---------|-----|------|
| Gateway 500 에러 수정 | fix(market-trial) 2be70a347 | DONE |
| 포럼 카테고리 리시드 | fix 518794b74 | DONE |
| ServiceSwitcher 통합 | 선확인 — 이미 구현됨 | DONE |
| SSO Handoff (Redis) | 선확인 — 이미 구현됨 | DONE |

---

## 8. Exclusions (미포함 / 범위 외)

### 현재 미구현

| 항목 | 설명 | 비고 |
|------|------|------|
| **자동 주문 생성** | Trial 이행 → checkout_orders 자동 생성 | 수동 운영 (운영자가 직접 처리) |
| **결제 연동** | 참여비 결제, 보상금 정산 | 현재 무료 참여, 보상은 오프라인 |
| **Decision 수집 UI** | 참여자 사후 결정(CONTINUE/STOP) 프론트엔드 | 백엔드 API 존재, 프론트엔드 미구현 |
| **배송지 수집 UI** | `market_trial_shipping_addresses` 프론트엔드 | 테이블 존재, UI 미구현 |
| **이행 추적 UI** | `market_trial_fulfillments` 프론트엔드 | 테이블 존재, UI 미구현 |
| **GlycoPharm/K-Cosmetics Trial 노출** | 게이트웨이 서비스에서 직접 Trial 노출 | 현재 KPA 허브로 리다이렉트만 |
| **알림 채널 확장** | 푸시 알림, 이메일 알림 | 현재 in_app 알림만 |
| **Trial 수정** | DRAFT 상태 Trial 수정 | 삭제 후 재생성 방식 |
| **참여 취소** | 참여자의 참여 취소 | 미구현 |

### 구조적 제약

| 항목 | 제약 |
|------|------|
| **OrderType** | `GLYCOPHARM` BLOCKED — Market Trial은 독립 유통 경로 |
| **2차 승인** | DEPRECATED — 서비스별 approve/reject는 403 반환 |
| **participantType** | 현재 `seller`만 사용 (partner 미활성화) |
| **contributionAmount** | 현재 항상 `0` (무료 참여) |

---

## 9. Future Direction

### 단기 (Next Phase)

1. **Decision 수집 프론트엔드** — OUTCOME_CONFIRMING 상태에서 참여자에게 CONTINUE/STOP 결정 UI 제공
2. **배송지 수집 + 이행 추적 UI** — product 보상 참여자 배송 관리
3. **GlycoPharm 내 Trial 카드** — 게이트웨이에서 직접 Trial 요약 노출 (리다이렉트 없이)

### 중기

4. **참여비 결제 연동** — 참여 시 contributionAmount > 0, E-commerce Core 통해 결제
5. **자동 주문 생성** — 상품 전환 + 매장 진열 → 첫 주문 자동 생성
6. **Partner 역할 활성화** — 지역 약사회/도매상 등 파트너 참여

### 장기

7. **Trial Analytics Dashboard** — 운영자용 전체 Trial 성과 대시보드
8. **AI 추천** — Trial 매칭 (약국 특성 ↔ 상품 특성)
9. **Trial Template** — 반복 Trial 템플릿화

---

## 10. Key File Locations

| 구분 | 파일 |
|------|------|
| **Core Package** | `packages/market-trial/` |
| **Entity** | `packages/market-trial/src/entities/MarketTrial.entity.ts` |
| **Participant Entity** | `packages/market-trial/src/entities/MarketTrialParticipant.entity.ts` |
| **Decision Entity** | `packages/market-trial/src/entities/MarketTrialDecision.entity.ts` |
| **Forum Entity** | `packages/market-trial/src/entities/MarketTrialForum.entity.ts` |
| **Service Approval Entity** | `packages/market-trial/src/entities/MarketTrialServiceApproval.entity.ts` |
| **Core Service** | `packages/market-trial/src/services/MarketTrialService.ts` |
| **Decision Service** | `packages/market-trial/src/services/MarketTrialDecisionService.ts` |
| **Forum Service** | `packages/market-trial/src/services/MarketTrialForumService.ts` |
| **Public Controller** | `apps/api-server/src/controllers/market-trial/marketTrialController.ts` |
| **Operator Controller** | `apps/api-server/src/controllers/market-trial/marketTrialOperatorController.ts` |
| **Public Routes** | `apps/api-server/src/routes/market-trial.routes.ts` |
| **Operator Routes** | `apps/api-server/src/routes/market-trial-operator.routes.ts` |
| **Migration (Core Tables)** | `apps/api-server/src/database/migrations/20260222700000-CreateMarketTrialTables.ts` |
| **Migration (Service Approvals)** | `apps/api-server/src/database/migrations/20260320000002-CreateMarketTrialServiceApprovals.ts` |
| **Migration (Forum Reseed)** | `apps/api-server/src/database/migrations/20260415260000-ReseedMarketTrialForumCategory.ts` |
| **KPA Home Section** | `services/web-kpa-society/src/components/home/MarketTrialSection.tsx` |
| **KPA Hub Page** | `services/web-kpa-society/src/pages/market-trial/MarketTrialHubPage.tsx` |
| **KPA Detail Page** | `services/web-kpa-society/src/pages/market-trial/MarketTrialDetailPage.tsx` |
| **KPA API Client** | `services/web-kpa-society/src/api/marketTrial.ts` |
| **Service Catalog** | `apps/api-server/src/config/service-catalog.ts` |

---

## 11. Known Issues & Fixes (Resolved)

| 이슈 | 원인 | 수정 | Commit |
|------|------|------|--------|
| Gateway 500 error | `organization_members`에 `status` 컬럼 없음 → SQL 에러 | `om.status` → `om.id` + `left_at IS NULL` 패턴 | `2be70a347` |
| Gateway empty trials | `service_key = 'kpa-society'`만 조회 → `kpa` 멤버십 누락 | `IN ('kpa', 'kpa-society')` | `2be70a347` |
| Forum category 삭제됨 | `CleanupForumTestData` 마이그레이션이 Trial 포럼 카테고리 삭제 | Reseed 마이그레이션 생성 | `518794b74` |

---

*Version: 1.0*
*Last Updated: 2026-04-15*
*Author: AI-assisted (Claude Code)*
