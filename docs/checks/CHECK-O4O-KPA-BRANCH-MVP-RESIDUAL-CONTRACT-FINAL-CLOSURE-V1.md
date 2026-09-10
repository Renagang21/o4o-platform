# CHECK — KPA 분회 MVP 잔여 계약 최종 마감

- **WO**: `WO-O4O-KPA-BRANCH-MVP-RESIDUAL-CONTRACT-FINAL-CLOSURE-V1`
- **선행 CHECK**: [`CHECK-O4O-KPA-BRANCH-TENANT-ONBOARDING-AND-MVP-PRODUCTION-E2E-V1.md`](CHECK-O4O-KPA-BRANCH-TENANT-ONBOARDING-AND-MVP-PRODUCTION-E2E-V1.md)
- **소스 커밋**: `eeb42387e`
- **검증일**: 2026-09-10 (production · `https://api.neture.co.kr/api/v1`)
- **판정**: **PASS** — 대상 3건 모두 계약 명시, 회귀 이상 없음

목표는 새 기능이 아니라 **known contract ambiguity 를 0 으로 만드는 것**이다.
서버 가드는 약화하지 않았고, 과거 제출본·기존 스냅샷은 손대지 않았으며, 물리삭제 의미를 새로 만들지 않았다.

---

## A. `me/access` entryPoints 역할 계층 비대칭

### 원인

`GET /kpa-branch/me/access` 의 `entryPoints` 가 JWT role 문자열 **정확 일치**로 계산되어,
실제 가드(`requireKpaBranchScope` = `createMembershipScopeGuard(KPA_BRANCH_SCOPE_CONFIG)`)와 **양방향으로** 어긋났다.

| 방향 | 실제 서버 | 수정 전 entryPoints |
|---|---|---|
| ① 운영자가 회원 화면 | 접근 **가능** (`scopeRoleMapping['kpa-branch:member']` 에 operator·admin 포함) | `member: false` — 접근 가능한 화면이 빠졌다 |
| ② membership `pending` 계정 | 접근 **불가** (`MEMBERSHIP_NOT_ACTIVE`) | `member: true` — 접근 불가한 화면이 나왔다 |

②는 kpa-branch 가 **가입 신청 시점에 role prefix 를 저장**하기 때문에 발생한다. pending 사용자도 `kpa-branch:member` 문자열을 갖는다.

### 수정 (최소)

- 서버 가드 **무변경**.
- `entryPoints` 를 접근계약 SSOT 인 `KPA_BRANCH_SCOPE_CONFIG` 에서 파생시킨다 (`computeEntryPoints`) — 계층·`platformBypass` 를 중복 기술하지 않아 drift 가 생기지 않는다.
- membership 판정을 JWT 스냅샷이 아니라 가드 2단계와 **같은** `getServiceMembershipStatusFromDb` 로 맞췄다.

파일: [`kpa-branch.routes.ts`](../../apps/api-server/src/routes/kpa-branch/kpa-branch.routes.ts)

### 실측 (production)

| # | 주체 | `/me/access` | entryPoints | 실제 라우트 |
|---|---|---|---|---|
| A-0 | anonymous | 401 `AUTH_REQUIRED` | — | — |
| A-1 | `platform:super_admin` (kpa-branch membership `none`) | 200 | `member/operator/admin = true` | bypass 계약과 일치 |
| A-2 | membership `pending` | **403 `ACCOUNT_ACCESS_RESTRICTED`** | 노출 자체가 없음 | member 라우트도 403 동일 |
| A-3 | operator (`active`) | 200 | `member:true · operator:true · admin:false` | member 200 / admin 403 — **완전 일치** |
| A-4 | member (`active`) | 200 | `member:true · operator:false · admin:false` | member 200 / operator 403 / admin 403 — **완전 일치** |
| A-5 | operator → 타 분회 `hoengseonggun` | — | — | 403 `BRANCH_SCOPE_MISMATCH` (tenant isolation 유지) |

"서버에서 접근 가능한데 빠진 화면" 0건, "접근 불가한데 나온 화면" 0건.

---

## B. 신상신고 `fee.category` 스냅샷 ↔ `associationLinkStatus` 시점 비대칭

### 원인

제출본 응답에서 `values`(= 제출 당시 스냅샷)와 `associationLinkStatus`(= **현재** 연결 가능 여부)가
같은 레벨에 이름 구분 없이 나란히 실려 **같은 시점처럼** 읽혔다. 프론트는 스냅샷 값 옆에 현재 연결 배지를 그렸다.

### 수정 (최소 — 계약 문구만)

- `valuesSource: 'submitted_snapshot' | 'draft_composed'` 추가 → 응답이 스스로 시점을 말한다.
- `associationLinkStatus` → **`currentAssociationLinkStatus`** 로 개명 (현재값임이 이름에 있다).
- 제출본(`submitted_snapshot`)에서는 `not_linked` 배지를 표시하지 않는다.
- **과거 제출본 덮어쓰기 없음 · `annual_reports` migration/rewrite 없음 · 스키마 변경 없음.**

파일: [`MemberAnnualReportController.ts`](../../apps/api-server/src/controllers/kpa-branch/MemberAnnualReportController.ts) · [`annualReport.ts`](../../services/web-kpa-branch/src/lib/api/annualReport.ts) · [`AnnualReportPage.tsx`](../../services/web-kpa-branch/src/pages/annual-report/AnnualReportPage.tsx)

### 실측 (production · 2027년도 양식 신설 후)

| # | 시점 | `valuesSource` | `values['fee.category']` | `currentAssociationLinkStatus['fee.category']` |
|---|---|---|---|---|
| B-1 | 제출 전 | `draft_composed` | `null` | `not_linked` |
| B-3 | 제출 직후 (원장 `A1_pharmacy_owner`) | `submitted_snapshot` | `A` | `resolved` |
| B-5 | 원장을 `B1_pharmacy_employee` 로 변경 후 | `submitted_snapshot` | **`A` (불변)** | `resolved` |

- 제출 스냅샷 전체 불변: **true**
- legacy `associationLinkStatus` 키 부재: **true**
- DB 직접 확인 (read-only):
  `annual_reports.values->>'fee.category' = 'A'` (submitted) / `branch_fee_ledgers.fee_category = 'B1_pharmacy_employee'`
  → **회비 원장이 바뀌어도 과거 제출본은 원장값으로 덮어써지지 않는다.**

---

## C. `branch_posts` DELETE soft delete 응답 계약

### 원인

`DELETE .../operator/posts/:id` 응답이 `{ id }` 뿐이라, 소비자가 물리삭제인지 soft delete 인지 알 수 없었다.
엔티티는 `@DeleteDateColumn deleted_at` 이며 TypeORM 조회는 기본적으로 soft-deleted 를 제외한다.

### 수정 (최소)

의미는 그대로 두고 응답에만 명시: `{ id, deleted: true, deletionMode: 'soft', deletedAt }`.
**hard delete 경로 미도입 · 라우트/권한/테이블 무변경.** 프론트 타입도 같은 형태로 맞췄다.

파일: [`BranchSiteController.ts`](../../apps/api-server/src/controllers/kpa-branch/BranchSiteController.ts) · [`branch.ts`](../../services/web-kpa-branch/src/lib/api/branch.ts)

### 실측 (production · notice / resource / meeting 3종 동일)

| # | 확인 | notice | resource | meeting |
|---|---|---|---|---|
| C-2 | 삭제 전 노출 (public / member / operator) | T/T/T | T/T/T | F/T/T (기존 회원전용 규칙) |
| C-3 | DELETE 응답 | `{deleted:true, deletionMode:"soft", deletedAt:…}` | 동일 | 동일 |
| C-4 | 같은 DELETE 재실행 | 404 `BRANCH_POST_NOT_FOUND` | 동일 | 동일 |
| C-5 | 삭제 후 노출 | F/F/F | F/F/F | F/F/F |
| C-DB | 물리 잔존 | `deleted_at IS NOT NULL` 3행 모두 잔존 — 물리삭제 아님 |

3개 분류가 **같은 계약**이다.

---

## 회귀 확인

| 항목 | 결과 |
|---|---|
| anonymous | `/me/access` 401 · 공개 글 목록 정상 |
| member (`active`) | member 200 / operator 403 / admin 403 |
| operator (`active`) | member 200 / operator 200 / admin 403 |
| platform admin (`platform:super_admin`) | bypass 유지, entryPoints 전부 true |
| `/me/access` | membership·roles·currentBranch·entryPoints 모두 응답, DB 판정과 일치 |
| annual report submitted snapshot | 제출 후 `readonly:true`, values 불변 |
| fee ledger 변경 후 과거 report | **불변** (API·DB 양쪽 확인) |
| post soft delete 후 목록 | public/member/operator 3개 목록 모두 제외 |
| notice/resource/meeting | 삭제 계약 동일 |
| tenant isolation | 타 분회 operator 접근 403 `BRANCH_SCOPE_MISMATCH` |

---

## 범위 밖 발견 (수정하지 않음 · 별도 WO 후보)

[`pharmacy-hub.routes.ts:145`](../../apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts#L145) 이
kpa-branch 와 **같은 정확일치 패턴**으로 진입점을 계산한다 (`storeOwner` / `operator`).
동일한 계층·bypass 비대칭이 있을 수 있으나 본 WO 범위 밖이므로 보고만 한다.

---

## fixture

검증 계정 2개(`@o4o-fixture.test`)와 2027 양식·회비 정책·검증 글 3건은 **이번 검증에서 생성**한 것이며,
원복은 이번에 만든 row id / 이번 사용자 / 2027 연도로만 좁힌 트랜잭션 스크립트로 수행한다
(`kpa_organizations` 총계 및 분회 글 삭제 건수를 커밋 직전 대조, 이탈 시 ROLLBACK).
**DB 데이터 변경이므로 사용자 승인 후 실행했다 (2026-09-10 승인).**

### 원복 실행 결과

| 대상 | 삭제 |
|---|---|
| `branch_posts` (검증 글 3건, id 지정) | 3 |
| `branch_fee_ledgers` / `branch_fee_policies`(2027) | 1 / 2 |
| `annual_reports` / `annual_report_templates`(2027 검증본) | 1 / 1 |
| `branch_memberships` | 2 |
| `account_activities` / `action_logs` / `email_verification_tokens` | 13 / 13 / 1 |
| `role_assignments` / `service_credentials` / `service_memberships` / `users` | 2 / 2 / 2 / 2 |

단일 트랜잭션 COMMIT. 커밋 직전 대조: `kpa_organizations` **228행 불변**, 분회 글 3→0(검증 3건과 정확히 일치).

### 잔여 0 확인 (read-only, 원복 후)

`@o4o-fixture.test` 계정 · fixture user id 기준 11개 축 전부 0:
users(이메일 패턴) · users(id) · service_memberships · service_credentials · role_assignments ·
branch_memberships · annual_reports · annual_report_templates(2027) · branch_fee_ledgers ·
branch_fee_policies(2027) · branch_posts(`withDeleted` 포함) → **잔여 합계 0**.

불변 확인: `kpa_organizations` 228 · 2026 신상신고 양식 1건 유지 · 실제 분회/실계정/타 서비스 데이터 무변경.

---

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (pharmacy-hub entryPoints 동일 패턴)
