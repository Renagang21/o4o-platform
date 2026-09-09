# CHECK-O4O-KPA-BRANCH-MEMBER-AFFILIATION-TRANSFER-OPERATIONS-V1

- **WO**: `WO-O4O-KPA-BRANCH-MEMBER-AFFILIATION-TRANSFER-OPERATIONS-V1` (분회 전입·전출 운영)
- **실행일**: 2026-09-09
- **구현 커밋**: `dd7fc3b48` (origin/main 반영 확인)
- **마이그레이션**: 0건 (신규 테이블·컬럼 없음)
- **판정**: PASS

---

## 1. 기존 affiliation 구조 (§1 조사 결과)

| 축 | 테이블 | 성격 |
|---|---|---|
| Identity | `users` | 사람 |
| RBAC | `role_assignments` | 권한 |
| 서비스 축 | `service_memberships` · `service_credentials` | 서비스 가입·자격 |
| **분회 소속** | `branch_memberships` | 조직 소속 (본 WO 대상) |

`branch_memberships` 는 **append-only** 모델이다.

- 전출 = `status='left'` + `left_at` 기록 (행 삭제 없음)
- 전입 = **항상 새 행 INSERT** (과거 행 재활성화 없음)
- active 는 회원당 최대 1건 — 부분 UNIQUE `UQ_branch_memberships_active_user` 로 DB 가 강제

조사 결론: 백엔드 canonical 로직(`join` = 트랜잭션 transfer, `leave`, `listByBranch`)은 **이미 존재**했다.
부족한 것은 ① 운영자용 소속 이력 조회 ② 프런트 액션 전부. 신규 소속 시스템은 만들지 않았다.

## 2. 재사용한 기존 로직 (§4)

`BranchMembershipService` 의 canonical join/leave 를 그대로 사용했다.
`join()` 이 곧 서버 측 transfer 이며, source/target 을 클라이언트가 지정하지 않는다.
target = URL `:branchSlug` → `resolveBranch` 가 결정, source = 서버가 조회한 현재 active 행.
요청 body 의 `organizationId` · `sourceOrganizationId` · `targetOrganizationId` 는 읽지 않는다.

최소 확장분:

- `getHistoryForBranch(userId, organizationId)` — tenant 선확인 후 parameterized raw SQL (§7 Guard Rules 준수)
- `join()` / `leave()` 에 `effectiveDate` 수용 + 발령일 역전 방어
- `GET /branches/:branchSlug/operator/members/:userId/history` 라우트 (기존 `...operatorGuards` 동일 적용)

## 3. 운영자 UI (§2 · §10)

`services/web-kpa-branch/src/pages/operator/MembersConsolePage.tsx` — W7 콘솔에 최소 확장.

- 회원 상세에 **소속** 영역: 분회명 · 상태 · 가입일 · 전출일
- action 3종: `소속 이력 보기` / `전출 처리`(active 일 때만) / 헤더의 `전입·소속 등록`
- 이력 테이블: 이동 순서 · 분회 · 가입일 · 전출일 · 상태 · 사유
- 목록 필터: `재적(active, 기본)` / `전출(left)` / `전체`
- 처리 후 목록·상세 동시 갱신

전입 대상 지정은 **이메일 정확일치 1건**만 해석한다 (전국 회원 검색 = §12 범위 밖).
새 회원관리 프레임워크는 만들지 않았다.

## 4. 상태 전이 (§3 · §5)

```
(없음) --join--> A(active)
A(active) --join(B)--> A(left, left_at=D) + B(active, joined_at=D)   [원자적]
B(active) --join(A)--> B(left) + A(active) 새 행 INSERT               [재전입도 새 행]
X(active) --leave--> X(left, left_at=D)
```

재전입(A→B→A)에서 **과거 A 행을 재활성화하지 않는다**. 실측으로 확인(§10 E7).

## 5. transaction · unique (§6)

- `join()` / `leave()` 모두 단일 트랜잭션 + 현재 active 행에 `setLock('pessimistic_write')`
- 실패 시 전량 롤백 — 부분 상태 없음 (E11 발령일 역전 probe 로 확인: 409 후 소속 불변)
- duplicate join 차단: 같은 분회 재요청 → 409 `BRANCH_MEMBERSHIP_CONFLICT`
- 기존 partial unique `UQ_branch_memberships_active_user` 유지 (변경 없음)

## 6. 과거 원장 불변 (§8)

전입·전출 처리는 `annual_reports` · `branch_fee_ledgers` · `branch_education_credit_ledgers` 를
**읽지도 쓰지도 않는다**. E2E 후 실측에서 3종 원장의 `organization_id` 가 전부 최초 분회(namgu) 그대로였다.

## 7. tenant · 권한 (§7)

- 가드 스택 `requireAuth → requireKpaBranchScope('kpa-branch:operator') → resolveBranch → requireBranchScope`
- 분회 결정은 URL `:branchSlug` (또는 Host) — body 신뢰 없음
- UUID 단독 조회 없음: 이력 조회도 `(user_id, organization_id)` 로 소속 선확인 후 반환
- 타 분회 대상 전입·전출 → 403 `BRANCH_SCOPE_MISMATCH` (E10-1 · E10-2)

## 8. service identity 축 불변 (§9)

E2E 전 구간에서 `service_memberships` · `service_credentials` · `role_assignments` 에 대한
write 는 0건이다. fixture 행을 제외한 전 행의 `created_at`/`updated_at` 변동 0건으로 실측 확인.

## 9. Production E2E 결과

대상: A = `namgu`, B = `donggu`, 회원 M 1명 + 운영자 2명 (전부 검증 fixture).

| # | 항목 | 결과 |
|---|---|---|
| E1 | A 신규 소속 | 201, joinedAt 2026-03-01 |
| E2 | A active 1건 (DB) | PASS |
| E3 | A→B 전입 (canonical transfer) | 201, donggu joinedAt 2026-06-01 |
| E4 | old 행 종료 (`left` + `left_at`) | PASS |
| E5 | B active 생성 | PASS |
| E6 | active 총 1건 | PASS |
| E7 | B→A 재전입 = 새 행 | 201, 과거 행 재활성화 아님 |
| E8 | 전출 처리 | PASS (leave 경로) |
| E9 | duplicate join 차단 | 409 `BRANCH_MEMBERSHIP_CONFLICT` |
| E10 | 타 분회 직접 처리 차단 | 403 ×2 `BRANCH_SCOPE_MISMATCH` |
| E11 | 발령일 역전 (원자성 probe) | 409, 소속 불변 |
| E12 | W7 목록·상세 즉시 반영 | 200, 최신 소속 반영 |
| E13 | 소속 이력 조회 | 200, 3건 오래된 순 + `isCurrentBranch` 정확 / 무관 userId 는 404 |
| E14 | 과거 `annual_reports` org 불변 | PASS |
| E15 | 과거 `branch_fee_ledgers` org 불변 | PASS |
| E16 | 과거 `branch_education_credit_ledgers` org 불변 | PASS |
| E17 | service membership·credential·role 불변 | PASS (touched 0건) |
| E18 | 타 서비스 불변 | PASS (kpa-branch 외 행 무변동) |
| E19 | fixture 원복 | PASS |

이력 실측 (M):

```
namgu  left    2026-03-01 ~ 2026-06-01
donggu left    2026-06-01 ~ 2026-09-01
namgu  active  2026-09-01 ~
active 총 1건
```

## 10. fixture 원복 (§11)

이번에 만든 row id 만 삭제했다. 검증 fixture 를 left history 로 남기지 않았다.

- `branch_memberships` (운영자 2 + 회원 M 이력 3) / `annual_reports` 1 / `branch_fee_ledgers` 1 /
  `branch_education_credit_ledgers` 1 / `role_assignments` 2 / `service_credentials` 2 / `service_memberships` 2
- 원복 후 관련 테이블 전부 **0행** = 작업 전 baseline 과 동일
- 회원 M 의 service 축 md5 3종이 baseline 과 **완전 일치**
- 원복 확인: 기존 세션 쿠키로 콘솔 호출 → 403 `MEMBERSHIP_NOT_FOUND`

## 11. 범위 밖 (§12) — 손대지 않음

지부/본회 승인 · 대량 CSV 전입 · 전국 회원 검색 · 회비 자동 정산 · 과거 원장 이전 · CRM ·
가입승인 UI 통합 · operator-core-ui 공통화.

별건으로 남은 `/branches/namgu/site` 초기 404 및 `fee.exemptionType` 보강은 본 WO 에 섞지 않았다.

## 12. 변경 파일

- `apps/api-server/src/routes/kpa-branch/kpa-branch.routes.ts`
- `apps/api-server/src/services/kpa-branch/BranchMembershipService.ts`
- `apps/api-server/src/controllers/kpa-branch/BranchMemberController.ts`
- `services/web-kpa-branch/src/lib/api/memberConsole.ts`
- `services/web-kpa-branch/src/pages/operator/MembersConsolePage.tsx`

## 13. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
