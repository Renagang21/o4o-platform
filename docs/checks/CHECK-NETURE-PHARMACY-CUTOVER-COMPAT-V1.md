# CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-06
> **근거 WO**: WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1 (사용자 지시 2026-10-06 — 운영 promote 전 해결 대상 2건) · 설계 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1` §17](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)

Neture 약국 매장 commerce(PR #308 계열) 운영 전환 전 호환성 보강의 검증 기록 · 전환 계획이다.
**운영 DB · migration · 배포 · 변수 · LB · 도메인은 건드리지 않았다.** 아래 DB 검증은 모두 일회용 격리 PostgreSQL 이다.

## 1. 해결 대상

| # | 문제 | 해결 |
|---|---|---|
| A | migration 이 `idx_org_listing_unique_v2` 를 부분 UNIQUE 로 교체 → 구버전 API 의 `ON CONFLICT (organization_id, service_key, offer_id)` 실패 · 배포 중/롤백 시 공급 · 승인 · 진열 경로 장애 | 인덱스 교체를 2단계로 분리. 1단계는 전체 UNIQUE 유지 · 부분 인덱스가 필요한 이벤트 재신청은 API 가 `409 EVENT_REAPPLY_NOT_YET_SUPPORTED` 로 명시 거절 |
| B | 승인된 Neture 약국이 pharmacy.neture.co.kr(kpa-society) 에서 403 — kpa-society membership 이 없어서 | 이용 자격 = Neture 기본 가입 active ∧ pharmacy 세미프랜차이즈 가입 active. 직접 로그인 · handoff(발급 · 교환) · 화면 게이트에 같은 판정. 미충족은 상태별 안내 + 신청 링크 |

## 2. 1단계 임시 제한 범위

- 같은 세미프랜차이즈 운영 조직 · 같은 offer 로 **두 번째 이벤트 신청**(종료 후 재신청 · 동시 복수 이벤트) → 409 + 안내 문구. 500 이 아니다.
- 첫 이벤트 신청 · 승인 · 노출 · 주문 · 한도 · 취소 · 수량 복원은 그대로 동작.
- KPA/KCos 이벤트 · 일반 진열 행 유일성은 원래부터 전체 UNIQUE 이므로 영향 없음.

## 3. 격리 DB 검증 (PostgreSQL 15.17, docker 일회용, 검증 후 삭제)

| 항목 | 결과 |
|---|---|
| baseline fresh bootstrap + incremental 1..16 (`src/migrate.ts`) | SUCCESS · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · fingerprint `c8325ff5…` (6155 lines) — `expected-schema-states.ts` 갱신 |
| `idx_org_listing_unique_v2` 정의 | `(organization_id, service_key, offer_id)` · WHERE 없음(전체 UNIQUE) |
| [1단계] 구버전 `ON CONFLICT (cols) DO UPDATE` ×2 | 성공 · 1행 |
| [1단계] 신버전 `ON CONFLICT (cols) WHERE service_key <> 'neture-event-offer'` DO NOTHING / DO UPDATE | 성공 · 1행 유지 |
| [1단계] 같은 조직 · 이벤트 offer 두 번째 행 | `duplicate key` — API 가 409 로 사전 차단하는 범위 |
| [2단계 시뮬레이션, ROLLBACK] 부분 UNIQUE 교체 후 신버전 | 성공 |
| [2단계 시뮬레이션] 구버전 `ON CONFLICT (cols)` | `no unique or exclusion constraint matching the ON CONFLICT specification` — 2단계 이후 구버전 롤백 불가 근거 |
| [2단계 시뮬레이션] 이벤트 두 번째 행 | 성공 |
| 통합 spec `neture-pharmacy-commerce.integration` | 18/18 PASS — 기본 가입 · 세미프랜차이즈 · 공급 제안 · 이벤트(재신청 409) · 모집 · 장바구니 · 주문 · 테스트 결제 · 공급자 주문 · **pharmacy 호스트 이용 자격 SQL**(단계별 next · 정지 · 탈퇴 · kpa-society 재해석 금지) |

## 4. 단위 · 빌드 검증

| 대상 | 결과 |
|---|---|
| api-server jest (handoff 4 · 세미프랜차이즈 handoff 신규 · 로그인 eligibility · email/google auth · service-catalog 2 · community catalog · neture-pharmacy rules) | 11 suites · 326 PASS |
| api-server jest (schema drift classifier · auth migration guard · google-only cleanup) | 53 PASS · 4 skipped(기존) |
| api-server `tsc --noEmit` | 0 error |
| auth-react vitest | 106 PASS |
| web-kpa-society vitest (MembershipGate 세미프랜차이즈 신규 포함) | 40 PASS · `tsc` 0 · `vite build` 성공 |
| web-neture `tsc` | 0 error |

실브라우저 smoke 는 하지 않았다 — 운영 배포 전이고 Google 인증 약국 계정이 없다(§6 의 운영 검증 항목).

## 5. 전환 순서 (실행 안 함 — 사용자 승인 후)

1. 이 PR + PR #308 계열 main 통합(production 통합 큐 순서).
2. API 배포 = 1단계 migration 자동 실행(CI). 인덱스 불변이므로 배포 중 구 revision 과 신 revision 이 공존해도 쿼리 실패 없음.
3. web-kpa-society(pharmacy 호스트) · web-neture · web-store 배포. 화면이 API 보다 먼저 나가도 `service-access` 조회 실패 → 기존 membership 판정(차단 쪽)으로 닫힌다.
4. 운영 검증 흐름: **로그인 → 기본 가입 신청 → 운영자 승인 → pharmacy 세미프랜차이즈 신청 → 담당 운영자 승인 → pharmacy.neture.co.kr 직접 로그인 · store → pharmacy handoff 접근(MembershipGate 통과) → 내 매장 공급 옵션 → 장바구니 → 주문 → 테스트 결제**. 각 미충족 단계에서 안내 문구 · 신청 링크 확인.
   - 보정 (2026-10-06): 공급 옵션 · 장바구니 · 주문 · 테스트 결제(`/neture/pharmacy/*`)는 **store.neture.co.kr(web-store)** 화면이다 — pharmacy 호스트에는 없다. pharmacy 호스트에서는 §8 의 OK 범위(내 매장 홈 · B2B 카탈로그 · 자료함 · 블로그/POP/QR · 플레이리스트 등)와 BLOCKED 범위(매장 HUB 장바구니 · 사이니지 · 포럼 쓰기)를 각각 확인한다.
5. 안정화 후 2단계 migration WO(부분 UNIQUE + 409 해제).

## 6. 롤백 가능 범위

**검증한 범위로 한정한다.** 롤백 대상으로 확인한 구버전 = 현재 운영 API **`e0be29869`(Cloud Run revision `o4o-core-api-03834-fuh`, 2026-10-06 조회)** 하나다. 그 이전 API 버전은 검증하지 않았다.

| 검증 | 범위 · 결과 |
|---|---|
| 대상 쿼리 | `e0be29869` 에서 `organization_product_listings` 를 `ON CONFLICT (organization_id, service_key, offer_id)` 로 쓰는 **9개 지점 전부** — `PharmacyHubHandledProductController.ts:196`(DO UPDATE · RETURNING) · `product-approval-v2.service.ts:187`(INSERT…SELECT DO UPDATE) · `seller-recruitment.service.ts:650` · `event-offer.service.ts:963` · `store-product-library.controller.ts:237` · `auto-listing.utils.ts:84 · 145 · 198 · 245`(DO NOTHING). 같은 테이블의 `(organization_id, service_key, master_id) WHERE offer_id IS NULL` 2지점은 다른 인덱스(`idx_org_listing_unique_master`, 이번 변경 무관) |
| 방법 | 일회용 로컬 PostgreSQL 17.9(운영 15 와 `ON CONFLICT` arbiter 추론 규칙 동일)에 baseline 의 테이블 · 두 UNIQUE 인덱스를 만들고 각 지점의 컬럼 목록 · `ON CONFLICT` 절을 원문 그대로, 같은 키로 2회 실행(충돌 경로 포함). auto-listing 의 소스 JOIN 은 arbiter 추론과 무관해 상수 SELECT 로 대체. 검증 후 서버 중지 |
| 1단계(이 PR, 전체 UNIQUE) | 9개 지점 **전부 성공** · 신버전 `WHERE service_key <> 'neture-event-offer'` 형태도 성공 |
| 2단계 시뮬레이션(부분 UNIQUE) | 9개 지점 **전부 `42P10`**(arbiter 추론 실패) · 신버전 형태는 성공 |
| `seller_recruitments` | `e0be29869` 에 이 테이블 대상 `ON CONFLICT` · 제약 이름 참조 0건(grep). `NULLS NOT DISTINCT` 인덱스에서 구버전 형태 쓰기(`semi_franchise_id` NULL) 중복은 종전처럼 unique 위반 |

검증하지 않은 것: 위 9개 외 다른 테이블 · 다른 구버전 코드 경로가 새 테이블 · 컬럼과 공존하는지의 런타임 확인(구버전은 새 테이블을 읽지 않는다는 정적 판단뿐), 실제 Cloud Run 롤백 실행.

| 시점 | API 롤백 대상 | 비고 |
|---|---|---|
| 1단계 배포 후 | `e0be29869`(rev `03834-fuh`) — 위 9개 지점 검증 범위 | 인덱스 불변 · 새 테이블/컬럼(nullable)은 구버전이 읽지 않음. `seller_recruitments` 유일성은 `semi_franchise_id` 포함 `NULLS NOT DISTINCT` 로 바뀌지만 구버전 쓰기(semi_franchise_id NULL)에는 기존과 같은 유일성이며 구버전 코드에 이 제약 대상 `ON CONFLICT` 없음. 단 새 API 가 세미프랜차이즈별 모집을 만든 뒤 롤백하면 구버전 화면에 같은 제품 · 공급자 모집이 여러 건 보일 수 있다(데이터 표시 차이, 쿼리 실패 아님) |
| 2단계 배포 후 | 1단계 이후 API 까지만 | 구버전 `ON CONFLICT (cols)` 실패(§3). 더 되돌리려면 인덱스를 전체 UNIQUE 로 먼저 복원해야 하며, 그 시점에 이벤트 중복 행이 있으면 복원 불가 |
| 화면 | 언제든 가능 | 구 화면은 kpa-society membership 만 보므로 세미프랜차이즈 약국이 다시 403 안내를 받을 뿐 |

## 7. 담당 경계 · 남은 사항

- **인증 · 가입 트랙 소유 파일을 이번에 수정했다**(사용자 지시 "직접 로그인과 handoff 에 동일하게 적용"): `services/auth/email-auth.service.ts` · `google-auth.service.ts` · `modules/auth/controllers/{email-auth,google-auth,handoff}.controller.ts` · `common/auth/service-login-eligibility.policy.ts` · `config/service-catalog.ts`(`semiFranchiseAccessKey`) · `packages/auth-react`(`serviceAccess` 노출) · web-kpa-society `MembershipGate` · `LoginModal` · `HandoffPage` · web-neture `home-entry.ts`. 변경은 kpa-society 대상 + `semiFranchiseAccessKey` 가 있을 때만 동작하는 추가 분기이고, 다른 서비스 · 기존 active membership 경로는 무변경(테스트로 고정). 인증 트랙 리뷰 대상.
- KPA forum 계열 backend 라우트는 kpa-society membership 을 요구 → 세미프랜차이즈 자격만 있는 약국은 그 화면 불가(공통 Forum 트랙 `WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1`). 범위 · 화면 안내는 §8-3.
- PR #328 은 이 변경과 합치지 않았다. #328 CHECK 의 운영 전환 절(§9-3 · §9-5 · §9-6 · §9-7)에 이 문서를 선행 조건으로 참조하도록 갱신 완료(`5cb02ddcf`).
- 2단계 인덱스 전환(부분 UNIQUE + 409 해제)은 별도 후속 WO 로 유지.

## 8. pharmacy 호스트 기본 메뉴 → backend API 접근 점검 (2026-10-06, 정적 판정)

대상 사용자: kpa-society membership 없음 · Neture 기본 가입 active(`neture:store_owner`) · pharmacy 세미프랜차이즈 active · 약국 조직 owner 1개. web-kpa-society 에 hostname 분기는 없고 pharmacy.neture.co.kr = web-kpa-society 그대로다. `/kpa/me-context` 의 `isStoreOwner('kpa')` 가 Neture 원장으로 판정되므로(#308 `store-owner.utils.ts`) 내 매장 메뉴 노출 · `PharmacyGuard` · `HubGuard` 는 통과한다.

### 8-1. OK

알림 · 포인트 · 커뮤니티 홈 · 포럼 읽기 · 콘텐츠 · 자료실 · 사이니지 HUB 읽기 · 설문 · 마이페이지(약사 정보 블록은 비어 보임) · 내 매장 홈 · 약국 정보 · 대시보드(`createRequireStoreOwner('kpa')`) · B2B 카탈로그 · 신청 · 경영활용/자체 상품 · 태블릿 · Screen Set · 블로그 · POP · QR · 약국 자료함/HUB 가져오기 · 판매자 모집 · 외국인 판매지원 · 내 서비스 · 매장 HUB 이벤트 목록 · 사이니지 플레이리스트(`/kpa/store-playlists`).

### 8-2. BLOCKED · DEGRADED (포럼 외 — 이 PR 범위 밖, 수정하지 않음)

| # | 기능 | 차단 지점 (코드 확인) | 결과 |
|---|---|---|---|
| 1 | 매장 HUB 장바구니 · 이벤트 "담기" · 주문 작업대 · 주문 확정 | `routes/cart/store-cart.routes.ts:115` `hasActiveServiceMembership(buyerId, 'kpa-society')` | 403 `SERVICE_MEMBERSHIP_REQUIRED`. 발주 내역은 항상 비어 있음(DEGRADED) |
| 2 | 발주 취소 | `routes/kpa/controllers/kpa-checkout.controller.ts:247` `requireActiveServiceMembership(KPA_SOCIETY)` | 403 (1 때문에 주문이 생기지 않아 실제 도달은 드묾) |
| 3 | 내 매장 사이니지 동영상 · 스케줄 · 사이니지 플레이리스트 · TV 재생 | `middleware/signage-role.middleware.ts` `hasSignageServiceMembership`(kpa-society 를 membership 축으로 강제) | 403 `MEMBERSHIP_NOT_ACTIVE`, 페이지 "데이터를 불러오지 못했습니다" |
| 4 | 사이니지 HUB 커뮤니티 업로드 · 삭제 | 같은 파일 `requireSignageCommunity` | 403 (쓰기만) |
| 5 | **[조건부] 매장 경영자 계약 deadlock** — kpa-society `store_owner_agreement` 가 게시되면 | 요구: `policy-acceptance.service` 가 Neture 원장 기준으로 승낙 요구 / 승낙: `modules/policy-acceptance/policy-acceptance.routes.ts:72-100` 이 `service_memberships('kpa-society')` active + `kpa:store_owner` 요구 | 승낙 불가 → 매장 API 428 · 내 매장 메뉴 소실. **#308 의 Neture 원장 약국 전체** 해당. 운영 게시 여부 미조회(UNKNOWN) — 계약 게시 WO 의 선행 조건으로 걸어야 함 |
| 6 | (UX) 로그인 후 착지 | `config/dashboard.ts` `KPA_ROLE_PRIORITY` 가 `kpa:store_owner` 기준 | 커뮤니티 홈 착지 → 쓰기 막힌 포럼을 먼저 권함 |

1~4 의 메뉴는 그대로 노출되고 누르면 오류 toast/문구만 뜬다 — 이용 가능한 것처럼 보인다.

### 8-3. 포럼 범위 · 화면 안내

- 읽기는 OK. 차단: `requireCommunityAccess('pharmacy')`(`kpa.routes.ts:670`) 가 걸린 글 · 수정 · 삭제 · 좋아요 · 고정 · 댓글 쓰기 → 403 `COMMUNITY_ACCESS_DENIED`, 포럼 개설신청(`forum-request.service.ts` `kpa_members` 요구) → 403 `NOT_MEMBER`.
- 화면 안내: **막힌다는 표시가 없다.** 홈 포럼 카드 · `ForumWritePrompt` · 글쓰기 · "+ 포럼 개설신청" 버튼이 로그인 여부만 보고 노출된다. 실패 시 `ForumWritePage.tsx:100` 은 새 글 실패에도 "이 글을 수정할 권한이 없습니다." 를 띄운다. 프런트는 `/api/v1/communities` 의 `canParticipate` 를 쓰지 않는다.
- 역방향 위험: 운영자가 pharmacy 세미프랜차이즈 `community_key` 를 `'pharmacy'` 로 설정하면 세미프랜차이즈 분기가 먼저 실행돼 기존 kpa-society · pharmacy-hub 회원의 포럼 쓰기가 막힌다. 운영 값 UNKNOWN.
- 처리: Forum 트랙(`WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1`) 소관 — CTA 를 `canParticipate` 기준으로 숨기거나 자격 안내로 교체, 403 문구 정정, `community_key` 설정 규칙 명문화.

### 8-4. 후속 제안 (별도 WO — 권한 · API contract · 공통 모듈 변경이라 이 PR 에서 하지 않음)

- A. 계약 승낙 판정을 pending 판정과 같은 Neture 원장 기준으로(계약 게시 WO 선행 조건).
- B. 장바구니 · 발주 취소: kpa-society 에 한해 "membership active OR `isStoreOwner('kpa')`(Neture 원장)" 단일 helper.
- C. 사이니지 membership 게이트: kpa-society 는 `isStoreOwner('kpa')` 결과로 대체(커뮤니티 쓰기는 포럼 정책과 함께).
- E. (선택) `/store` 착지 기준에 `isStoreOwner` 반영.

정적 판정 전제: JWT roles 에 `neture:store_owner` 가 실림 · 약국 조직 1개. 실브라우저 smoke 미실시.

## 9. 인증 · 가입 트랙 리뷰 (2026-10-06)

판정: **APPROVE with notes** — 기존 KPA 회원 경로 · 다른 서비스 경로 회귀 결함 0.

- 기존 kpa-society row 보유자: 직접 로그인은 `isServiceLoginAllowed` 가 먼저 통과(새 조회 0), handoff active 는 세미프랜차이즈 조회 0, MembershipGate active 는 조회 0(테스트 고정). pending/withdrawn 이면서 세미프랜차이즈 미충족이면 종전 code(`HANDOFF_TARGET_NOT_ACTIVE` · `HANDOFF_TARGET_WITHDRAWN`) 그대로.
- 다른 서비스: `semiFranchiseAccessKey` 는 kpa-society 에만 있음. auth-react `serviceAccess` 는 서버가 보낼 때만 붙어 다른 소비처 동작 불변.
- handoff 발급 · 교환 모두 재검증. 서비스 키는 토큰 payload · 카탈로그 · URL 에서 파생(Guard Rule 4 충족). SQL 파라미터 바인딩 · 조직 축 조건 · 같은 조직에서 두 자격 동시 active 요구.
- **정책 확인 필요**: kpa-society row 가 **suspended / withdrawn** 이어도 Neture 두 자격이 active 면 handoff · 화면 게이트를 통과한다(직접 로그인은 원래 모든 상태 row 를 통과시켜 세 경로 결과는 일관). `service-catalog.ts` 주석 "그 row 의 종전 판정은 그대로" 와 다르다. KPA 정지(징계성)를 Neture 경로가 넘어도 되는지 판단 필요 — 이 경우의 테스트도 없음.
- 관찰: non-active kpa row 사용자의 handoff 에서 자격 조회가 throw 하면 403 대신 500. 비회원 전원의 안내가 "Neture 약국 가입" 문구 · store 링크로 바뀜(pharmacy 호스트 한정).
- merge · promote · 변수 설정 · 운영 DB 변경 · 데이터 정리 · LB/도메인 변경 · 기존 PH 서버/도메인/인증서 변경: **0 건**.
