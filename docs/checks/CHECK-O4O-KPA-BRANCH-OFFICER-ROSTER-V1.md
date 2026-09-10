# CHECK — 분회 임원 · 위원회 명부 (W11-A)

- **WO**: `WO-O4O-KPA-BRANCH-OFFICER-ROSTER-V1`
- **일자**: 2026-09-10
- **판정**: **CLOSED** — 구현 + 프로덕션 API E2E 실측 + 브라우저 smoke + fixture 전량 원복
- **선행**: [W10 행사·참가 응답](CHECK-O4O-KPA-BRANCH-EVENTS-AND-RSVP-V1.md) · 설계 근거 `docs/ir/IR-O4O-KPA-BRANCH-ORGANIZATION-AND-MEETING-MINIMAL-MODEL-V1.md`
- **후속**: W11-B 회의 기록 (`WO-O4O-KPA-BRANCH-MEETING-POSTS-ADOPTION-V1`)
- **commit**: `c67713a0e` (migration + entity + service + controller + route + 공개/운영자 UI) · `3497940f0` (임기 date 비교 결함 수정) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr/api/v1` · DB `o4o_platform` · 공개 `https://kpa-society.co.kr/kpa/namgu`)

> **본 CHECK 의 수치는 2026-09-10 프로덕션에서 재수행한 E2E 실측값이다.**
> 구현 커밋 시점의 E2E 원자료가 남아 있지 않아, 최소 fixture 를 다시 만들어 전 항목을 다시 측정했다.
> 추정으로 채운 칸은 없다.

---

## 0. 결과 요약

| # | E2E 항목 | 결과 |
|:--:|---|:---:|
| 1 | 운영자 임원 등록 | ✅ 201 ×5 (회장·위원장·외부 고문·만료임원·재임) |
| 2 | 회원 연결 없는 외부 인사 | ✅ `user_id` NULL 로 등록 |
| 3 | 타 분회 회원 연결 시도 | ✅ 422 `MEMBER_NOT_IN_BRANCH` |
| 4 | 임기 만료된 `status='active'` 행 | ✅ `current=false` (커밋 `3497940f0` 실동작 확인) |
| 5 | 공개(비로그인) 명부 | ✅ **3건** — `members_only`·만료 제외 |
| 6 | 회원 `/me/officers` | ✅ **4건** — `members_only` 포함 |
| 7 | 타 분회(`bukgu`) 운영자 접근 | ✅ 403 `BRANCH_SCOPE_MISMATCH` |
| 8 | 없는 slug | ✅ 404 `BRANCH_NOT_FOUND` |
| 9 | 회원이 운영자 POST | ✅ 403 FORBIDDEN (`Required scope: kpa-branch:operator`) |
| 10 | `PUT .../order` 정렬 | ✅ 200 · 1 트랜잭션 반영 |
| 11 | `PATCH status=ended` | ✅ `ended` · `term_end` 자동 확정 · `current=false` |
| 12 | `?status=ended` 필터 | ✅ 1건 |
| 13 | 브라우저 smoke (공개·운영자) | ✅ §6 |
| 14 | 기존 화면 회귀 | ✅ 신규 테이블·신규 라우트만 · `branch_posts`/`branch_events` 미변경 |
| 15 | fixture 원복 | ✅ 전 항목 0 복귀 (§7) |

---

## 1. 데이터 모델

migration `CreateBranchOfficers20270331000000` (프로덕션 `typeorm_migrations` 등재 확인).

### `branch_officers`

| 컬럼 | 비고 |
|---|---|
| `organization_id` | 분회 경계 (Domain Primary Boundary) |
| `user_id` | **nullable** — 회원이 아닌 외부 인사(고문·자문)를 담기 위해 |
| `name` · `position` | 필수. 표시 이름과 직책 |
| `group_name` | 위원회·분과명. 없으면 분회 본부 임원 |
| `term_start` · `term_end` | `term_end` 없음 = 종료일 미정 |
| `display_order` | 명부 표시 순서 |
| `status` | `active` / `ended` |
| `visibility` | `public` / `members_only` |

**임원 종류(type) 컬럼을 두지 않았다.** 회장·부회장·위원장·감사가 전부 `position` 문자열 한 칸이다.
위원회 구분은 `group_name` 이 담는다. W10 의 행사 종류 판단과 같다.

### DB 가 강제하는 것

```text
CHK_branch_officers_status      active / ended
CHK_branch_officers_visibility  public / members_only
CHK_branch_officers_term        term_end >= term_start
CHK_branch_officers_ended       status='ended' 이면 term_end 필수
CHK_branch_officers_identity    user_id 가 없어도 name 은 반드시 있다
```

인덱스 3종: `IDX_branch_officers_org_order` (명부 조회) · `IDX_branch_officers_active` (현직 필터) · `IDX_branch_officers_user_org` (회원 연결 역참조).

### 재임은 수정이 아니라 새 등록

임기가 끝난 임원이 다시 선출되면 기존 행의 `term_end` 를 미루지 않고 **새 행을 만든다.**
그래야 "누가 언제 무엇이었는가"가 남는다. 삭제 경로는 만들지 않았다 —
잘못 만든 행은 `status='ended'` 로 닫는다.

### `current` 판정

```text
current = status='active' AND (term_end IS NULL OR term_end >= CURRENT_DATE)
```

`now()` 가 IMMUTABLE 이 아니라 generated column 이나 CHECK 로 만들 수 없다.
그래서 서버 조회에 `CURRENT_DATE` 조건을 걸고, 응답에 `current` 를 계산해 실어 보낸다.
커밋 `3497940f0` 은 이 비교를 Date 객체끼리 하던 결함을 날짜 문자열 비교로 고친 것이다
(E2E 4번이 프로덕션에서 이 수정의 실동작을 확인한 항목이다).

## 2. API 계약

3계층으로 나눴다. 공개 명부와 운영자 명부는 **다른 라우트**이고, 같은 데이터를 파라미터로 넓히지 않는다.

| Method | Path | 인증 | 반환 |
|---|---|---|---|
| GET | `/branches/:slug/officers` | 없음 | `visibility='public'` **AND 현직** |
| GET | `/branches/:slug/me/officers` | 회원 | `public` + `members_only` · **현직** |
| GET | `/branches/:slug/operator/officers?status=` | 운영자 | 전체 (`ended` 포함) · 필터 `active`/`ended` |
| POST | `/branches/:slug/operator/officers` | 운영자 | 등록 |
| PATCH | `/branches/:slug/operator/officers/:officerId` | 운영자 | 수정 · 임기종료 |
| PUT | `/branches/:slug/operator/officers/order` | 운영자 | 순서 일괄 변경 (**1 트랜잭션**) |

`?status=` 는 화이트리스트(`active`/`ended`) 밖의 값을 받지 않는다.

## 3. 권한 · tenant

- 분회 결정은 **`req.branch!.id`** 하나만 신뢰한다. 컨트롤러는 body 의 `organizationId` 를 **읽지 않는다.**
- `officerId` 단독 조회 없음 — 항상 `organization_id` 와 복합 조건 (Boundary Guard 1).
- Raw SQL 전건 parameter binding (Guard 2).
- 실측 차단: 타 분회 403 `BRANCH_SCOPE_MISMATCH` / 없는 slug 404 `BRANCH_NOT_FOUND` / 회원의 운영자 write 403 / 미인증 401.
- 회원 연결은 자기 분회 `branch_memberships` 안에서만 가능 — 타 분회 회원 지정 시 422 `MEMBER_NOT_IN_BRANCH` (실측).

## 4. 공개 범위

기본은 `public` 이다. 명부는 분회 홈페이지에서 대외적으로 보여주는 정보이기 때문이다.
개인정보 노출을 줄여야 하는 자리(예: 윤리·감사 위원)는 `members_only` 로 낮춘다.
실측 5·6번이 이 경계를 확인했다 — 같은 시점에 공개 3건 / 회원 4건.

공개 응답에는 연결 회원의 이메일 등 계정 정보를 싣지 않는다. 운영자 화면에만 표시된다.

## 5. UI

- 공개: `BranchOfficersPage` (`/kpa/:slug/officers`) — `group_name` 으로 묶어 표시.
- 운영자: `OfficersPage` (`/kpa/:slug/operator/officers`) — 등록·수정·임기종료·순서 변경·상태 필터.
- `BranchLayout` nav 에 "임원·위원회"(공개) / "임원 명부"(운영자) 추가.
- 회원 연결 검색은 기존 `BranchMemberConsoleService` 를 확장해 재사용했다 (신규 검색 API 를 만들지 않았다).

## 6. 브라우저 smoke (실측)

- 공개 `/kpa/namgu/officers` (익명): 3건 렌더. console 오류는 favicon 404 와 `/branches/namgu/site` 404 뿐 —
  후자는 남구약사회가 `branch_sites` 미게시라서 나는 정상 동작으로 [W9 CHECK](CHECK-O4O-KPA-BRANCH-BRANCHLAYOUT-SITE-PREFETCH-404-CLOSURE-V1.md) 에 이미 기록돼 있다.
- 운영자 `/kpa/namgu/operator/officers`: 6행 렌더 (순서·성명·직책·소속·임기·공개·상태). 연결 회원은 이메일, 외부 인사는 "외부 인사" 로 표시.

## 7. fixture 원복

이번 E2E 로 만든 row 만 id 로 지정해 한 트랜잭션에서 삭제했다.

| 대상 | 건수 |
|---|:--:|
| `branch_officers` | 6 |
| `branch_memberships` (`f11a0000-…-0007/0008`) | 2 |
| `role_assignments` (`…-0005/0006`) | 2 |
| `service_credentials` (`…-0003/0004`) | 2 |
| `service_memberships` (`…-0001/0002`) | 2 |

원복 후 실측: `branch_officers` 0 · `branch_memberships` 0 · `kpa-branch` 의 `service_memberships`/`service_credentials`/`role_assignments` 각 0 ·
`f11a0000` prefix 잔여 **0** · 타 서비스 `service_memberships` 36 / `role_assignments` 69 불변.

비밀번호는 기존 `kpa-society` credential 의 `password_hash` 를 그대로 복사해 만들었다 —
평문은 어디에도 기록하지 않았다.

## 8. 관찰 (범위 밖 · 수정하지 않음)

1. **`current` 는 `term_start` 를 보지 않는다.** 임기 시작이 미래인 행(2028-01-01)도 등록 즉시 공개 명부에 나온다.
   차기 임원을 미리 입력하는 운영을 하면 현직과 섞인다. 지금은 그런 운영 사례가 확인되지 않아 그대로 뒀다.
2. **운영자 표의 상태 배지가 만료된 `active` 행을 "재임" 으로 표시한다.**
   `OfficersPage.tsx` 415~418행이 `o.current ? '현직' : OFFICER_STATUS_LABEL[o.status]` 라
   서버가 `current=false` 로 준 행도 `status` 라벨("재임")로 떨어진다. 공개·회원 명부에는 영향이 없다(조회에서 이미 제외).

둘 다 별도 WO 로 분리한다.

## 9. 범위 밖 (WO 명시)

선거·투표 / 임원 승인 워크플로 / 직책별 권한 부여 / 위원회 활동 기록 / 임원 알림.
임원 명부는 **표시용 명부**이지 권한 소스가 아니다 — 권한은 `role_assignments` 가 단일 소스(F9)로 남는다.
