# 일부 이용자 서비스(공급자 · 파트너 · 약국협업체) admin 의 「서비스 데이터만 삭제」 범위 조사

> **상태**: ACTIVE
> **작성일**: 2026-11-07 · **최종 갱신**: 2026-11-07
> **실행 위치**: BOTH
> **인계**: claude/vibrant-allen-56f5dq · push 전 · 다음 실행자 CLOUD (코드 조사) → LOCAL (운영 건수 확인)
> **근거**: 2026-11-07 사용자 확정(아래 §2) · admin.neture.co.kr 운영자 메뉴 정리 PR(같은 branch) · [`WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1`](WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1.md) · [`WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1`](WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1.md) · [`O4O-PRIVACY-DATA-RETENTION-POLICY-V1`](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md)

이 문서는 **조사 지시서**다. 삭제 기능 구현 · 운영 데이터 변경은 범위 밖이며, 조사 결과로 범위를 확정한 뒤 별도 구현 WO 를 연다.

## 1. 배경 — 현재 코드 (2026-11-07 main `03f13810` 기준)

| 항목 | 현재 상태 | 근거 |
|---|---|---|
| 서비스 관계 삭제 API | `DELETE /api/v1/operator/members/:userId` → `MembershipApprovalService.deleteMember`. hard 는 해당 서비스 `service_memberships` 만 지우고 `users` 는 건드리지 않는다(Identity 분리 완료) | `services/approval/MembershipApprovalService.ts` STEP H4 주석 · `routes/operator/membership.routes.ts:68` |
| admin.neture.co.kr 중앙 운영 화면 | `supplier` · `funding` · `lecture` · `community` 의 `members` 영역은 `allowDestructiveActions={false}` — admin 도 관계 삭제 버튼이 없다. 상태 변경(활성 · 정지 · 탈퇴)만 가능 | `apps/admin-dashboard/src/pages/operators/central-operation-renderers.tsx` |
| partner-support | 회원 이용 정지 · 해제, 글 · 댓글 숨김 · 복구. 서비스 데이터 삭제 경로 미확인 | `CentralPartnerModeration` · `PartnerCommunityOperator` |
| 약국협업체 | `pharmcoop` 은 중앙 운영에 「연합회 가입·참여 운영」만 있다. drugstore · carepharm 등은 각자 서브도메인 운영 화면 | `packages/types/src/central-operation-menu.ts` · [`O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1`](../baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md) |
| 계정 · 개인자료 완전삭제 | platform admin 만. `DELETE /api/v1/admin/users/:id` (운영 실행은 `ACCOUNT_ERASURE_MODE=apply` 필요) | `WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1` |

## 2. 사용자 확정 (2026-11-07)

- 강의 · 커뮤니티 · 유통기반 펀딩은 neture.co.kr 의 **모든 가입자에게 제공하는 공통 서비스**라 admin.neture.co.kr 에서 운영한다. 계정 해지는 neture operator, 계정 완전삭제는 platform admin 이 한다.
- 공급자 · 파트너 · 약국협업체는 **일부 이용자만 쓰는 서비스**라 해당 서비스 운영자가 이용자를 관리한다.
  - 그 서비스의 **operator 는 참여 해지(복구 가능)** 를 한다.
  - 그 서비스의 **admin 은 그 서비스의 데이터만 삭제**한다. **서비스 사용자(계정)는 삭제할 수 없다.**
- 강의별 수강 해지는 강사가 정한다. admin.neture.co.kr 운영 업무가 아니다.

## 3. 조사할 질문

각 서비스(supplier · partner-support · pharmcoop, 필요하면 drugstore · carepharm)마다 아래를 표로 답한다.

1. **서비스 데이터 목록** — 그 서비스 참여로 생기는 테이블 · 파일(GCS) · 외부 연동 기록. 소유 주체(개인 / 사업자 조직 / 다른 사용자와 공유)를 구분한다.
2. **삭제 · 보존 분류** — 각 항목을 「서비스 데이터 삭제 시 지움 / 익명화 / 법정 보존(기간) / 다른 주체 소유라 유지」로 분류한다.
   - 공급자: 공급자 신청 · 증빙 파일, `neture_suppliers`, 상품 제안 · 공급 offer, 매장과의 B2B 주문 · 정산(`checkout_orders` 원장 — §4 CLAUDE.md 단일 원장, 삭제 대상 아님 추정) 을 반드시 포함한다. 공급자 사업자 접근은 serviceKey 가 아니라 `organization_members → organizations(type='supplier') → neture_suppliers` 가 판정한다(FROZEN, `O4O-SUPPLIER-DOMAIN-BOUNDARY-V1` §7) — 개인 관계 삭제와 사업자 조직 데이터 삭제를 구분한다.
   - 파트너: 게시글 · 댓글 · 신고 · 운영 이력. 다른 사용자의 댓글이 달린 글의 처리.
   - 약국협업체: `semi_franchise_memberships` · 운영자 지정 · 사업별 매장 콘텐츠.
3. **기존 경로 재사용 가능성** — `deleteMember` hard 경로 · 각 도메인의 기존 cleanup/erasure 서비스(`account-erasure` 의 domain handler 등)가 이미 지우는 범위와 빠진 범위.
4. **선행 조건** — 참여 해지(operator) 상태여야만 삭제 가능하게 할지. 회원 계정 삭제는 사전 정지 불요(정책 2026-11-03)지만, 서비스 데이터 삭제는 별도 판단이 필요하다 — 판단 근거와 제안을 적는다(결정은 사용자).
5. **권한 경계** — `{service}:admin` 이 자기 서비스 데이터만 지우는지, `platform:super_admin` 은 어느 경로를 쓰는지. serviceKey 는 URL 경로에서만(CLAUDE.md §7 Guard Rule 4).
6. **UI 위치** — admin.neture.co.kr 중앙 운영(`/operations/{service}/members`) 에서 admin 에게만 「서비스 데이터 삭제」를 열지, 각 서비스 운영 화면에 둘지.

## 4. 설계 판단 (조사 전 가정 — 조사 결과로 확정)

| 판단 | 가정 | 근거 |
|---|---|---|
| 계정(`users`)은 서비스 데이터 삭제로 건드리지 않는다 | 확정 | §2 사용자 확정 · Identity 분리 WO |
| 주문 · 정산 원장은 서비스 데이터 삭제 대상이 아니다 | 가정 | CLAUDE.md §4 단일 원장 · 법정 보존 가능성 |
| 다른 사용자 · 사업자 소유 자료는 유지한다 | 확정 | 개인정보 정책 §보존 |
| 구현은 core 먼저(API · 도메인 handler) → UI 나중 | 가정 | AGENTS.md §4-3 R2 |

## 5. 범위 밖

- 실제 삭제 기능 구현 · migration · 운영 DB write (구현 WO 와 통합 담당 승인 필요 — AGENTS.md §5)
- 공통 서비스(강의 · 커뮤니티 · 펀딩)의 계정 삭제 — 기존 계정 완전삭제 경로
- 강의 수강 관계 정리(강사 업무)

## 6. TODO

- [ ] [CLOUD] §3-1 · §3-2 서비스별 데이터 목록과 삭제 · 보존 분류표 작성 (코드 · entity · migration 기준)
- [ ] [CLOUD] §3-3 기존 삭제 경로가 지우는 범위와 빠진 범위 대조
- [ ] [CLOUD] §3-4 · §3-5 · §3-6 제안 작성 → 사용자 결정 요청
- [ ] [LOCAL] §7 read-only 조회로 서비스별 대상 규모 확인(건수만, 마스킹)
- [ ] [CLOUD] 결과로 구현 WO 작성(서비스별 1 PR · core 먼저)

## 7. 검증 계획 — LOCAL read-only 조회

`o4o_readonly` 계정만 사용한다(AGENTS.md §5). 원문(이름 · 이메일 · 상호) 대신 상태 · 건수만 기록한다.

```sql
-- Q1. 서비스별 참여 관계 상태 분포 (삭제 대상 규모)
SELECT service_key, status, COUNT(*) AS n
FROM service_memberships
WHERE service_key IN ('supplier', 'partner-support', 'pharmcoop')
GROUP BY service_key, status
ORDER BY service_key, status;

-- Q2. 해지(정지 · 탈퇴)된 공급 참여자 중 사업자 조직 데이터가 남은 수
SELECT COUNT(DISTINCT sm.user_id) AS n
FROM service_memberships sm
JOIN organization_members om ON om.user_id = sm.user_id
JOIN organizations o ON o.id = om.organization_id AND o.type = 'supplier'
WHERE sm.service_key = 'supplier' AND sm.status IN ('suspended', 'withdrawn');
```

판정:
- Q1 에서 `suspended` · `withdrawn` 이 0 이면 서비스 데이터 삭제 구현은 급하지 않다 → 구현 WO 우선순위를 낮춘다.
- Q2 가 0 보다 크면 「개인 관계는 해지됐지만 사업자 조직 데이터가 남은」 경우가 실제로 있다 → 개인 관계 삭제와 사업자 데이터 삭제를 분리 설계해야 한다(§3-2).
- 테이블 · 컬럼 이름이 다르면 조회를 멈추고 CLOUD 조사 결과(§6 첫 항목)로 쿼리를 고친 뒤 다시 실행한다.

## 문서 정합

해당 없음 (작성 시점)
