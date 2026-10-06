# WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1

> **상태**: DRAFT
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-05
> **근거 WO/IR**: [`WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1`](WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md) TODO 3-4 · 설계 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §7 · §15
> **담당**: 공통 커뮤니티 · Forum 트랙 (Store/Commerce 트랙은 접근 판정만 제공)

세미프랜차이즈 커뮤니티의 **실제 게시판 이용(글 · 댓글)** 을 만든다. 원래 WO §3-8 범위이며, PR #308 은 접근 판정까지만 구현했다 — 이 작업이 끝나기 전에는 세미프랜차이즈 커뮤니티 이용을 완료로 표시하지 않는다.

## 1. 현재 상태 (PR #308)

- 접근 판정 구현: `communities.slug = semi_franchises.community_key` 인 커뮤니티는 `requireCommunityAccess` · `GET /api/v1/communities/:key/access` 에서 **세미프랜차이즈 가입 active 약국 조직의 owner/admin/manager** 만 허용(`modules/neture-pharmacy/services/semi-franchise-community-access.ts`). `community_memberships` 를 만들거나 동기화하지 않는다.
- 게시판 없음: 포럼 원장 경계가 정적 카탈로그(`config/community-catalog.ts` `forumStorageCodes`)에 묶여 있어 DB 커뮤니티(개설 승인 커뮤니티 포함)에 게시판 mount · 저장 파티션이 없다.

## 2. 해야 할 것

1. DB 커뮤니티(세미프랜차이즈 커뮤니티 포함) 게시판의 저장 파티션 규칙 — Forum Core 무수정, adapter 로(o4o-common-structure §13).
2. mount — 커뮤니티 key 로 해석되는 forum 라우터. 읽기 · 쓰기 모두 위 접근 판정을 먼저 통과.
3. 운영 권한 — 세미프랜차이즈 담당 운영자(`neture:operator` ∧ `semi_franchise_operators`)의 게시판 관리 범위.
4. 화면 — 내 매장 세미프랜차이즈 화면의 "커뮤니티" 진입(현재 텍스트 표시만).

## 3. 하지 않는 것

- 세미프랜차이즈 가입 상태를 `community_memberships` 로 복제 · 동기화.
- 일반 커뮤니티의 독립 가입 정책 변경.
