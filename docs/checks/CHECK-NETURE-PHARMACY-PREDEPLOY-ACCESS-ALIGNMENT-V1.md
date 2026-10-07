# CHECK-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-06
> **근거 WO**: WO-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1 (사용자 방향 확정 2026-10-06 — "기능이 있어야 할 위치 기준으로 처리") · 선행 [`CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1`](CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1.md) §8 · §9

PR #332(운영 전환 호환 · pharmacy 호스트 이용 자격) 위에 쌓은 후속 PR 의 검증 기록이다. **운영 배포 전에 필요한 수정**을 담는다.
**운영 DB · migration · 배포 · 변수 · 계약 내용 · 계약 게시는 건드리지 않았다.**

## 1. 처리 기준과 결과

| 항목 | 기준 (사용자 확정) | 처리 |
|---|---|---|
| 옛 HUB 장바구니 · 이벤트 담기 · 주문 작업대 · 발주 내역 · 취소 | pharmacy 에서 권한을 넓히지 않는다. 내 매장의 새 Neture commerce 로 연결하고 옛 진입을 제거 | backend 무변경(옛 KPA 장바구니는 계속 kpa-society active 전용). web-kpa-society 에서 Neture 약국에게만 옛 진입을 새 경로(`store.neture.co.kr/store/pharmacy/{supply,cart,orders}`)로 안내 — §2 |
| 사이니지 동영상 · 스케줄 · TV 재생 | 내 매장 기본 기능. Neture 기본 승인 + 그 약국 조직 운영 권한으로 이용. pharmacy 가입을 조건으로 요구하지 않음 | `signage-role.middleware` store 계열 3 게이트에 Neture 원장 매장 진입 추가 — §3 |
| 계약 승낙 deadlock | 운영 배포 전 해결. 적용 대상과 승낙 API 자격이 같아야 함 | kpa-society 매장계약의 요구 · 승낙이 같은 함수(`isPharmacyLedgerStoreOwner`) — §4 |
| Forum | 별도 트랙 유지. 지금 쓸 수 없는 쓰기는 안내하거나 숨김 | 서버 판정(`/communities/pharmacy/access`)으로 쓰기 CTA 를 안내로 교체 · 403 문구 정정 — §5 |

## 2. 옛 commerce 진입 (web-kpa-society)

- 판정 `isNetureCommerceUser(user)`(`lib/netureCommerce.ts`): super_admin 아님 ∧ kpa-society membership 이 active 아님 ∧ (`neture:store_owner` 또는 neture active ∧ 서버 판정 `isStoreOwner`). backend 차단 조건(kpa-society active 여부)과 같은 축이라 KPA 회원 · 겸유자는 대상 아님.
- route 래퍼 `NetureCommerceRedirect` — `/store-hub/event-offers` · `/store-hub/cart` · `/event-offers/:id` · `/store/commerce/order-worktable` · `/store/commerce/orders`. 대상이면 화면 대신 새 commerce 안내(공급 옵션 · 이벤트 / 장바구니 / 주문 내역 · 취소 버튼), 아니면 children 그대로(기존 가드 · 화면 불변).
- 메뉴: 매장 HUB 사이드바의 이벤트·특가 · 장바구니 → Neture 약국에게는 `주문·이벤트`(`/store-hub/neture-commerce` 안내) 한 항목. 내 매장 사이드바의 `발주 내역`은 Neture 약국에게 숨김(config 는 App 에서 파생, `KPA_SOCIETY_STORE_CONFIG` 상수 불변).
- `PharmacyB2BPage`: Neture 약국은 이벤트 탭 = 안내, 선택 작업 = `내 매장에서 주문하기 →`(작업대 담기 대신), 하단 안내 문구 교체.
- 가드 정렬: `PharmacyOwnerOnlyGuard` 가 `kpa:store_owner` role 만 보아 Neture 약국이 **취급 중인 O4O 제품 · 매장 경영활용 제품 · 매장 자체 상품 · 다국어 상품 콘텐츠** 화면에서 AccessDenied 였다(backend `createRequireStoreOwner('kpa')` 는 원장 기준 허용). `HubGuard` 와 같은 기준(role 또는 서버 판정 `user.isStoreOwner`)으로 정렬. 선행 CHECK §8-1 의 "OK" 판정 정정.

## 3. 사이니지 (`apps/api-server/src/middleware/signage-role.middleware.ts`)

- `resolveLedgerPharmacyStoreEntry` — serviceKey `kpa-society` · membership 없음일 때만, **요청 org** 에 대해 `isStoreOwner(ds, userId, 'kpa', org)`(Neture 기본 가입 원장 active ∧ 그 조직 owner/admin/manager ∧ 매장계약). 판정 org 가 요청 org 와 다르면 차단, 판정 오류도 차단(fail-closed). 세미프랜차이즈 가입은 보지 않는다.
- 적용: `requireSignageStore`(media 쓰기 · schedules · playlist 쓰기) · `requireSignageOperatorOrStore`(media · playlists 읽기 — **operator 분기는 건너뜀**) · `allowSignageStoreRead`(TV 재생 active-content 등 — 헤더/쿼리로 명시한 org 만, `user.organizationId` 추정 안 씀). 소유(`organization_members`) · 서비스 귀속 검사는 그대로 거친다.
- 매장계약 미동의 → 428 `STORE_OWNER_AGREEMENT_REQUIRED` + `pendingPolicyAcceptances`(내 매장 API 와 같은 응답).
- 열지 않음: `requireSignageCommunity`(커뮤니티 업로드 · 삭제) · operator · HQ · 다른 서비스(k-cosmetics 등). kpa-society 회원은 원장 판정 없이 기존 경로.

## 4. 매장 경영자 계약 승낙

- `PolicyAcceptanceService.isPharmacyLedgerStoreOwner` — 요구 판정(`getPendingStoreOwnerAgreementsForUser`)의 기존 SQL 을 메서드로 추출.
- `POST /auth/policy-acceptances`: `documentType=store_owner_agreement` ∧ `serviceKey=kpa-society` 이면 이 함수만으로 판정(kpa-society membership · `kpa:store_owner` 조회 0). 그 밖(terms 전체 · k-cosmetics · pharmacy-hub 매장계약)은 코드 · 순서 · 오류 code 불변.
- 부수 변화: kpa-society membership + `kpa:store_owner` 는 있지만 Neture 원장이 없는 사용자는 kpa 매장계약을 승낙할 수 없다(403 `STORE_OWNER_REQUIRED`). 이 사용자는 원래 요구 대상도 아니다 — 요구 · 승낙 일치.
- 계약 내용 변경 · 운영 게시 0.

## 5. Forum 안내 (공통 Forum 트랙 `WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1` 로 인계)

- `lib/forumWriteAccess.tsx` — `GET /api/v1/communities/pharmacy/access`(세미프랜차이즈 분기 반영 단건 판정) 조회. `allowed === false` 가 확인될 때만 숨김 · 안내, 미인증 · 실패는 기존 화면(회귀 없음).
- 적용: `ForumWritePrompt`(글쓰기 유도 → 안내) · `ForumListPage` 글쓰기 2곳 · `ForumFeedPage` `+ 글쓰기` → 안내 · `MyPostsPage` 빈 목록 글쓰기 · `ForumDetailPage` 좋아요 비활성 · 댓글 폼 → 안내 · `ForumWritePage` 새 글 폼 → 안내.
- `+ 포럼 개설신청`: backend 가 `kpa_members` active 를 요구하므로 kpa-society 가입이 active 가 아닌 로그인 사용자에게 숨김. (ForumHubTemplate `infoLinks` 의 `포럼 개설 신청` 텍스트 링크는 정적 config 라 그대로 — 진입 시 기존 403 `NOT_MEMBER`.)
- 403 문구: 새 글 실패에 "이 글을 수정할 권한이 없습니다." 를 쓰지 않는다 — `COMMUNITY_ACCESS_DENIED` · `COMMUNITY_MEMBERSHIP_REQUIRED` · `SEMI_FRANCHISE_MEMBERSHIP_REQUIRED` 별 안내(댓글 · 좋아요 실패도 같음).
- **인계 — `community_key` 위험**: `requireCommunityAccess(key)` 는 `semi_franchises.community_key = key AND status='active'` 행이 있으면 그 결과로 확정한다. active 세미프랜차이즈의 `community_key` 를 `'pharmacy'` 로 두면 KPA(`kpa.routes.ts:670`) · Pharmacy-Hub(`pharmacy-hub.routes.ts:615`) 포럼 쓰기가 세미프랜차이즈 가입 약국 운영자 전용이 되어 **기존 kpa-society · pharmacy-hub 회원 전원이 403**(`SEMI_FRANCHISE_MEMBERSHIP_REQUIRED`), super_admin 예외도 없다. `GET /communities` 목록은 이 분기를 반영하지 않아 화면 · 서버 판정이 어긋난다. `semi-franchise.service.ts` create · update 는 `community_key` 를 trim 만 하고 저장 — 카탈로그 key(`pharmacy` · `cosmetics` · `o4o-general`) 충돌 검증 없음. 운영 값 미조회. 권고: 카탈로그 key 와 겹치는 값 400 거절 · 세미프랜차이즈 key 규칙 명문화(Forum 트랙).

## 6. 검증 (로컬, worktree `D:/o4o-wt/neture-pharmacy-cutover-compat-v1`)

| 대상 | 결과 |
|---|---|
| api-server jest — `signage-neture-pharmacy-ledger-store-entry`(신규 S1~S5) · `security/terms-acceptance-gate`(매장계약 4 케이스 추가: 원장 약국 pending→승낙→pending 0 · **게시 계약 → 내 매장 가드 428 → 승낙 → 통과** · 원장 아님 403 · k-cosmetics 종전 기준) · `signage-cross-service-org-guard` · `signage-servicekey-canonicalization` · `store-owner-backcompat-servicekey` · `neture-pharmacy-handoff-semi-franchise` | 6 suites · 128 PASS |
| api-server `tsc --noEmit` | 0 error |
| web-kpa-society vitest — `NetureCommerceRedirect`(신규 N1 · N2) · `forumWriteAccess`(신규 F1~F3) · MembershipGate 등 | 6 files · 61 PASS |
| web-kpa-society `tsc --noEmit` | 0 error |
| eslint (변경 · 신규 파일) | 0 error (warning 6 = 손대지 않은 기존 줄) |

실브라우저 smoke 는 하지 않았다 — 운영 배포 전이고 Neture 약국 계정이 없다. 운영 검증 항목은 §7.

## 7. 운영 배포 선행 조건 · 운영 검증 (실행 안 함)

- 배포 선행: PR #332 → 이 PR main 통합(둘 다 API LEVEL_3 · 같은 promote). 사이니지 · 계약 deadlock 이 이 PR 로 해소되므로 **이 PR 통합 전 promote 하지 않는다**.
- 운영 검증(배포 후): Neture 승인 약국 계정으로 ① pharmacy 호스트 매장 HUB `주문·이벤트` → 안내 → store 호스트 공급 옵션 · 장바구니 · 주문 · 취소 ② 옛 URL 직접 진입 안내 ③ 매장 경영활용 제품 · 자체 상품 화면 진입 ④ 내 매장 사이니지 동영상 · 스케줄 · TV 재생 ⑤ (계약 게시 WO 시) 승낙 → 내 매장 진입 ⑥ 포럼 읽기 가능 · 쓰기 버튼 대신 안내. 회귀: KPA 회원 계정의 옛 장바구니 · 주문 · 사이니지 · 포럼 쓰기 정상.

## 8. 하지 않은 것

- 옛 KPA 장바구니 · 발주 취소 backend 권한 확장(사용자 기준: 하지 않음).
- `/store` 착지 기준(`KPA_ROLE_PRIORITY`) 변경 · 사이니지 커뮤니티 쓰기 개방 · `community_key` 검증 구현(Forum 트랙).
- `StoreB2bPayButton` 의 기본 `returnPath='/store-hub/orders'`(존재하지 않는 route) — 범위 밖 기존 결함, 보고만.
- merge · promote · 운영 DB 변경 · 계약 게시: **0 건**.
