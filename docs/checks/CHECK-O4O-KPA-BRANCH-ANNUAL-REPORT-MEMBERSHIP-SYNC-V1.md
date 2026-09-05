# CHECK — 신상신고 제출본 → 회원 원장 sync (W3)

- **WO**: `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1`
- **일자**: 2026-09-05
- **판정**: **CLOSED** — E2E 14항목 전부 프로덕션 실측 통과
- **선행**: [W1](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1.md) · [W2](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1.md) · [W2 종결](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-PRODUCTION-E2E-CLOSURE-V1.md)
- **commit**: `7d0cae057` (migration + service + route) · `824b1c44b` (23505 → 409) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr` · DB `o4o_platform`)

---

## 0. 결과 요약

| # | E2E 항목 | 결과 |
|:--:|---|:---:|
| 1 | submitted report 생성 | ✅ (제한사항 §3-2) |
| 2 | sync 전 `kpa_members` 값 기록 | ✅ |
| 3 | sync 실행 | ✅ 200 `applied:true` |
| 4 | 대상 4필드 실제 DB 변경 확인 | ✅ |
| 5 | `synced_changes` 정확성 | ✅ |
| 6 | `synced_to_membership=true` | ✅ |
| 7 | 동일 sync 재실행 → no-op | ✅ |
| 8 | draft sync → 차단 | ✅ 409 |
| 9 | 다른 분회 report → 차단 | ✅ 404 |
| 10 | 다른 사용자 report → 차단 | ✅ (3각도) |
| 11 | 미변경 필드는 update 하지 않음 | ✅ |
| 12 | 실패 유도 → transaction rollback | ✅ 409 + 원장 무변경 |
| 13 | 제출 snapshot `values` 불변 | ✅ md5 동일 |
| 14 | 타 서비스 / 타 회원 데이터 불변 | ✅ |

---

## 1. sync 대상 필드

Template(`annual_report_templates.schema`)이 `syncToMembership: true` + `syncTarget` 으로
이미 선언하고 있었다. **코드에 매핑을 복제하지 않고 schema 를 읽는다.**

| Template field | ownership | syncTarget | 컬럼 타입 |
|---|---|---|---|
| `personal.licenseNumber` | auto | `kpa_members.license_number` | varchar(100) |
| `employment.activityType` | auto | `kpa_members.activity_type` | varchar(50) |
| `employment.workplaceName` | auto | `kpa_members.pharmacy_name` | varchar(200) |
| `employment.workplaceRoadAddress` | auto | `kpa_members.pharmacy_address` | varchar(300) |

**`personal.university` 는 제외했다.** `kpa_members.university_name` 은 주석상 "약대생 재학
대학명"이고 신고서의 "출신 대학교"와 의미가 다르다 (WO 주의사항).

`employment.activityType` 의 선택지 11종은 `KpaActivityType` 11종과 **정확히 일치**함을
확인했다 (`pharmacy_owner` … `inactive`). 그래도 코드는 값이 Template 의 `options` 안에
있는지 다시 확인한 뒤에만 원장에 넘긴다.

---

## 2. write path

```
POST /api/v1/kpa-branch/branches/:branchSlug/operator/annual-reports/:reportId/sync
  requireAuth → requireKpaBranchScope('kpa-branch:operator') → resolveBranch → requireBranchScope
     → OperatorAnnualReportController.sync
        → AnnualReportMembershipSyncService.syncReport({ reportId, organizationId, actorUserId })
```

### 2-1. 자동 sync 를 채택하지 않은 이유 (WO 가 판단하라고 한 지점)

조사 결과 **기존에 sync 경로는 존재하지 않았다** — `syncToMembership` 은 Template 의 플래그로만
있었고 이를 읽는 코드도, `synced_to_membership` / `synced_changes` 컬럼도 없었다. 따라서
"이미 있는 자동 sync 구조"는 없었고 경로를 새로 정해야 했다.

**운영자 명시 실행**을 택했다.

| 근거 | 내용 |
|---|---|
| 검수와의 순서 | W4 가 운영자 검수·반려다. 제출 즉시 자동 반영하면 **반려해도 원장은 이미 바뀐 뒤**가 된다 |
| 도메인 경계 | `annual_reports` 는 kpa-branch 축, `kpa_members` 는 KPA 축이다. 도메인 간 write 를 회원 행위가 암묵적으로 트리거하지 않게 한다 |
| 감사 | 반영 주체(`syncedBy`)를 남기려면 실행자가 있어야 한다. 자동 반영에는 실행자가 없다 |
| 되돌리기 | 잘못된 제출이 209개 분회에 자동 전파되면 회수 경로가 없다 |

회원 제출 직후 자동 반영은 **채택하지 않았다** (WO: "임의 채택하지 말고 기존 설계와 위험도를 보고 판단").

### 2-2. 쓰기 경계 — allowlist

Template 의 `syncTarget` 을 읽되, **코드가 정한 4개 컬럼 allowlist 를 통과한 것만** 쓴다.

```ts
const SYNC_TARGET_ALLOWLIST = {
  'kpa_members.license_number':   { column: 'license_number',   maxLength: 100 },
  'kpa_members.activity_type':    { column: 'activity_type',    maxLength: 50  },
  'kpa_members.pharmacy_name':    { column: 'pharmacy_name',    maxLength: 200 },
  'kpa_members.pharmacy_address': { column: 'pharmacy_address', maxLength: 300 },
};
```

Template 이 나중에 다른 `syncTarget` 을 선언해도 **쓰기 범위는 넓어지지 않는다** —
목록 밖은 쓰지 않고 `TARGET_NOT_ALLOWED` 로 기록만 남긴다. UPDATE 문의 컬럼명은
allowlist 를 통과한 상수에서만 나오므로 schema 값이 SQL 로 흘러들지 않는다.

### 2-3. 무엇을 쓰지 않는가

| 대상 | 처리 |
|---|---|
| `association` / `member`-only 필드 | 원장에 반영하지 않는다 (`syncToMembership` 이 없다) |
| 제출 스냅샷 `values` | **쓰지 않는다.** sync 컬럼만 UPDATE (원칙 9) |
| 원장 → 신고서 역방향 | 없다. 과거 report 를 현재 원장값으로 재작성하지 않는다 (원칙 10) |
| `kpa_members` 행이 없는 회원 | **만들지 않는다.** 404 `MEMBER_LEDGER_NOT_FOUND` — 분회 신고서가 KPA 회원자격을 만들어내면 안 된다 |
| 빈 값 | 원장을 지우지 않는다 (`EMPTY_VALUE` skip). sync 대상 4필드는 모두 required 라 정상 제출본에서는 발생하지 않는다 |

### 2-4. 값이 원장에 들어갈 수 없을 때 — 조용히 버리지 않는다

길이 초과(`TOO_LONG`) · 선택지 밖(`NOT_IN_OPTIONS`)은 **422 `SYNC_VALUE_INVALID` 로 전체를
실패**시킨다. 해당 필드만 건너뛰면 제출된 값이 소리 없이 사라진다. `UNCHANGED` / `EMPTY_VALUE` /
`TARGET_NOT_ALLOWED` 는 정상 skip 으로 기록에 남긴다.

---

## 3. migration · 상태 컬럼

### 3-1. `20270323000000-AddAnnualReportMembershipSync`

```sql
ALTER TABLE annual_reports ADD COLUMN synced_to_membership boolean NOT NULL DEFAULT false;
ALTER TABLE annual_reports ADD COLUMN synced_changes jsonb;

CHK_annual_reports_synced_submitted  CHECK (synced_to_membership = false OR status = 'submitted')
CHK_annual_reports_synced_changes    CHECK (synced_to_membership = false OR synced_changes IS NOT NULL)
IDX_annual_reports_sync_pending      (organization_id, year) WHERE status='submitted' AND synced_to_membership=false
```

컬럼은 WO 가 명시한 2개만 추가했다. 실행 주체·시각은 별도 컬럼을 만들지 않고 `synced_changes`
안에 담았다.

**"draft 는 sync 될 수 없다"를 애플리케이션이 아니라 DB 가 강제한다.** 코드 경로가 늘어나도
이 불변식은 깨지지 않는다. 두 번째 CHECK 는 "기록 없는 반영"을 막는다.

프로덕션 실측:

```
typeorm_migrations : AddAnnualReportMembershipSync20270323000000
columns            : synced_to_membership boolean NOT NULL DEFAULT false / synced_changes jsonb NULL
constraints        : CHK_annual_reports_synced_submitted · CHK_annual_reports_synced_changes
index              : IDX_annual_reports_sync_pending
```

### 3-2. ⚠️ E2E fixture 의 제한 — submitted 상태를 SQL 로 승격했다

신고기간(2026-01-01~02-28)이 종료됐고, **W2 종결에서 역할 예외(`canBypassPeriod`)를 제거**해
프로덕션에서 submit 경로로 제출본을 새로 만들 수 없다.

- 공유 자원인 `annual_report_templates.period_end` 를 임시로 늘리는 방법은 **쓰지 않았다** —
  209개 분회가 함께 쓰는 양식이라 승인된 fixture 범위(2계정 + namgu) 밖의 영향이 생긴다.
- 대신 **서버가 만든 draft `values` 를 그대로 두고 status 만 승격**했다.
  `values` 는 draft API 가 ownership 필터 + association 주입을 거쳐 생성한 실제 서버 산출물이다.
- 승격 전에 두 draft 모두 **필수항목 누락 0** (제출 검증을 통과하는 상태)임을 schema 기준으로 확인했다.
- 제출 경로 자체(422 → 200 `submitted`)는 [W2 종결 §3-1](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-PRODUCTION-E2E-CLOSURE-V1.md)에서 이미 프로덕션 실측했다.

즉 본 WO 가 검증한 것은 **sync 경로**이며, submit 경로를 재실측하지 않았다.

---

## 4. transaction / idempotency

### 4-1. 원자성

`kpa_members` UPDATE 와 `annual_reports` 플래그 UPDATE 를 **하나의 `AppDataSource.transaction`**
으로 묶는다. 원장 쓰기가 실패하면 `synced_to_membership` 도 서지 않는다 (원칙 8).

### 4-2. 멱등성 — 2중

1. **플래그 단락**: `synced_to_membership && synced_changes` 면 즉시 no-op 반환.
   기존 `synced_changes` 를 **덮어쓰지 않는다** (원칙 6).
2. **값 비교**: 플래그가 없더라도 `before === after` 인 항목은 `UNCHANGED` 로 건너뛴다.
   비교는 `norm()`(trim + `''`→null)으로 정규화해 `NULL`/`''`/공백을 같게 본다.

### 4-3. 원장 제약 충돌 = 409 (`824b1c44b`)

`IDX_kpa_members_license_number_unique` 처럼 이미 다른 회원이 쓰는 값을 반영하려는 경우는
서버 결함이 아니라 운영 충돌이다. PostgreSQL `23505` 를 **409 `SYNC_CONFLICT`** 로 매핑하고
위반 constraint 이름을 함께 돌려준다. 트랜잭션은 이미 롤백된 상태다.

---

## 5. `synced_changes` 실측 예시 (프로덕션 DB 원문)

```json
{
  "changes": [
    { "key": "personal.licenseNumber",   "target": "kpa_members.license_number",
      "before": null,          "after": "9000001" },
    { "key": "employment.workplaceName", "target": "kpa_members.pharmacy_name",
      "before": "테스트 약국", "after": "W3동기화약국" }
  ],
  "skipped": [
    { "key": "employment.activityType",         "target": "kpa_members.activity_type",    "reason": "UNCHANGED" },
    { "key": "employment.workplaceRoadAddress", "target": "kpa_members.pharmacy_address", "reason": "UNCHANGED" }
  ],
  "syncedAt": "2026-09-05T02:25:45.516Z",
  "syncedBy": "cfd2a5e7-db28-4842-bd5c-4814cba49ca5",
  "templateId": "837b4436-3d0c-4c03-9ef8-7f811e883263"
}
```

- `syncedBy` = **운영자**(sohae2100) 이고 원장이 바뀐 대상은 **신고서 주인**(renagang21) 이다.
- `templateId` 는 제출 당시 양식이다 — 현재 active 양식이 아니라 스냅샷을 따라간다.

---

## 6. E2E 결과 (프로덕션)

### 6-1. 정상 sync (E2E 3~6·11)

```
POST /branches/namgu/operator/annual-reports/f46c362b…/sync   → 200
  applied=true  alreadySynced=false  syncedToMembership=true
  changes 2건 / skipped 2건(UNCHANGED)
```

DB 대조 — sync 전/후:

| 필드 | before | after |
|---|---|---|
| `license_number` | `NULL` | `9000001` |
| `pharmacy_name` | `테스트 약국` | `W3동기화약국` |
| `activity_type` | `pharmacy_owner` | `pharmacy_owner` (미변경) |
| `pharmacy_address` | `08295 서울 구로구 공원로 47 304` | 동일 (미변경) |

**E2E 11 확인**: 값이 같은 2필드는 UPDATE 문에 아예 포함되지 않았고 `skipped` 에 `UNCHANGED` 로 기록됐다.

### 6-2. 멱등 (E2E 7)

```
같은 report 재호출 → 200  applied=false  alreadySynced=true
changes 2건 유지 · syncedAt 이 1차와 동일 → 기록을 덮어쓰지 않았다
```

### 6-3. draft 차단 (E2E 8)

```
member draft   → 409 REPORT_NOT_SUBMITTED
operator draft → 409 REPORT_NOT_SUBMITTED
```

승격 **전**에 실행했다. DB CHECK 제약이 2중 방어로 남는다.

### 6-4. rollback (E2E 12) — 실제 제약 위반으로 유도

operator 신고서의 면허번호를 member 가 sync 로 갖게 된 `9000001` 과 충돌시켰다.
같은 신고서는 `pharmacy_name` 도 `W3롤백확인약국` 으로 바꾸려 했으므로, 트랜잭션이
새면 그 값이 남는다.

```
POST …/cee1a130…/sync → 409 SYNC_CONFLICT
   constraint: IDX_kpa_members_license_number_unique
```

롤백 후 실측:

```
sohae2100 kpa_members  license_number = 99992        (미변경)
                       pharmacy_name  = 네뚜레약국    (미변경 — 부분 반영 0)
                       updated_at     = 2026-05-18   (행 자체가 안 바뀜)
annual_reports         status=submitted · synced_to_membership=f · synced_changes IS NULL
                       values md5 = ec3b9d…4bd3 (제출 시점과 동일)
```

**부분 반영 0** 이 확인됐다.

### 6-5. snapshot 불변 (E2E 13)

sync 전 기록한 md5 와 sync 후 md5 가 두 신고서 모두 동일하다.

```
f46c362b… (sync 성공) 4ef645cab1e3b12275b750aa87388cc8 → 동일
cee1a130… (sync 실패) ec3b9d6441a0944e66a39bd773ec4bd4 → 동일
```

### 6-6. 타 서비스 / 타 회원 불변 (E2E 14)

```
kpa_members 7행 중 최근 2시간 내 변경 = 1행 (신고서 주인만)
두 계정의 service_memberships 13 / role_assignments 25 / service_credentials 10 / users.status active 2
kpa_organizations type='group' 209 · annual_report_templates(kpa-branch) 1
```

---

## 7. tenant / cross-user 방어 (E2E 9·10)

| 시나리오 | 결과 |
|---|---|
| 다른 분회(donggu) 소속 제출본을 namgu 경로로 sync | **404 `REPORT_NOT_FOUND`** — 조회가 `(id, organization_id)` 복합 조건이라 존재해도 닿지 않는다 |
| operator 가 `:branchSlug=donggu` 로 호출 | **403 `BRANCH_SCOPE_MISMATCH`** — 분회 가드에서 먼저 차단 |
| member 가 operator 전용 sync 호출 | **403 `FORBIDDEN`** (`Required scope: kpa-branch:operator`) |
| 존재하지 않는 reportId | **404 `REPORT_NOT_FOUND`** |
| **원장 대상이 요청자로 바뀌는가** | **아니오** — operator 가 실행했지만 operator 자신의 `kpa_members.updated_at` 은 2026-05-18 그대로. 쓰기 대상은 언제나 `report.user_id` |

마지막 항목이 cross-user 방어의 핵심이다. `syncedBy`(운영자)와 원장 대상(신고서 주인)이
서로 다른 값으로 실측됐다.

---

## 8. fixture before / after

### 8-1. 부여 (§WO 검증 fixture)

W2 종결에서 원복했으므로 kpa-branch 접근 계정이 0명이었다. 최소 6행을 다시 부여했다.

| 테이블 | row id | 대상 |
|---|---|---|
| `service_memberships` | `e8789457-eed1-4472-978b-991e12118a8e` | renagang21 |
| `service_memberships` | `7738bd8a-c7f2-4bbf-8eeb-2193f6f2a5bd` | sohae2100 |
| `role_assignments` | `20cdd7e9-bcee-4dfc-8d00-aed9303e7ec0` | renagang21 · `kpa-branch:member` |
| `role_assignments` | `c2d0f00f-4252-4fe1-a482-508ea31b32dc` | sohae2100 · `kpa-branch:operator` |
| `branch_memberships` | `8c95e2b7-ec3d-4163-85e3-1dcfa8372e0e` | renagang21 · namgu |
| `branch_memberships` | `5237a0ac-923d-4477-8197-6478c5c944ce` | sohae2100 · namgu |

E2E 중 생성한 `annual_reports` 3건:

| id | 소유 | 조직 | 연도 | 용도 |
|---|---|---|---|---|
| `f46c362b-c05f-4b7d-9805-a2ef40c68462` | renagang21 | namgu | 2026 | 정상 sync |
| `cee1a130-544a-460a-ad51-0ccb4e580dc0` | sohae2100 | namgu | 2026 | rollback 유도 |
| `dbb7fe06-8a72-4400-b0b0-3fe345747b05` | renagang21 | donggu | 2025 | cross-tenant |

### 8-2. 원복 — 회원 원장까지 되돌렸다

**WO 의 원복 목록에는 `kpa_members` 가 없지만 함께 복원했다.** sync 는 성격상 운영 회원
원장을 실제로 바꾸므로, 되돌리지 않으면 운영 데이터에 테스트 값(`9000001` / `W3동기화약국`)이
남는다.

착수 시점 값 복원:

```
renagang21  license_number : 9000001      → NULL
            pharmacy_name  : W3동기화약국 → 테스트 약국
            activity_type / pharmacy_address : sync 가 건드리지 않았다 (UNCHANGED)
sohae2100   전 필드 미변경 (rollback 으로 애초에 쓰이지 않음)
```

> `license_number` 의 원래 형태가 `''` 인지 `NULL` 인지는 화면 출력만으로는 구분되지 않았다.
> `kpa_members` 전체에 **빈 문자열 행이 0건**(VALUE 5 / NULL 2)임을 확인해 `NULL` 로 확정했고,
> 복원 후 분포가 착수 시점과 같은 **VALUE 4 / NULL 3** 으로 돌아온 것으로 재확인했다.

원복 후 실측:

```
annual_reports 0 · branch_memberships 0 · kpa-branch roles 0
kpa-branch service_memberships 0 · kpa-branch credentials 0

불변: kpa_organizations type='group' 209 · kpa_members 7 · users.status active 2
      두 계정 memberships 11 · roles 23 · credentials 10 · templates 1
```

게이트 재실증:

```
kpa-branch 로그인      → 401 SERVICE_NOT_MEMBER (두 계정)
L1 토큰 me/annual-report / operator/templates / operator sync → 403 MEMBERSHIP_NOT_FOUND
타 서비스 L1 로그인    → 200
public kpa-branch 4종  → 200
```

---

## 9. 회귀 · 빌드 게이트

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (api-server) | clean |
| `eslint` (신규·수정 5파일) | clean |
| migration 프로덕션 적용 | ✅ (§3-1) |
| Deploy API Server `7d0cae057` | success |
| Deploy API Server `824b1c44b` | success |
| CodeQL `824b1c44b` | success |
| **CI Pipeline `824b1c44b`** | **success** |

### 9-1. CI Pipeline red 해소 (타 세션)

W2 종결 시점까지 `Code Quality Check` 가 baseline desync 로 red 였으나,
병렬 세션의 `84d787691` (`WO-O4O-CI-LINT-RATCHET-BASELINE-DESYNC-CLOSURE-V1`) 로 해소됐다.
본 WO 의 최종 커밋 `824b1c44b` 에서 **CI Pipeline 이 success** 다.

`7d0cae057` 의 CI Pipeline / CodeQL 은 `cancelled` 인데, 내가 직후에 `824b1c44b` 를 push 해
같은 concurrency group 이 교체된 결과다. 최종 커밋이 green 이므로 게이트는 충족됐다.

---

## 10. 미해결 · 후속

| # | 항목 | 비고 |
|:--:|---|---|
| C1 | **운영자용 신고서 목록 화면·API** | 현재 sync 는 `reportId` 를 받는데 운영자가 그 id 를 얻을 경로가 없다. 목록은 **W4 검수 UI 의 본체**이므로 이번 WO 에서 만들지 않았다. `IDX_annual_reports_sync_pending` 을 미리 깔아 뒀다 |
| C2 | 프런트 sync 버튼 | C1 과 함께 W4 |
| C3 | `MEMBER_LEDGER_NOT_FOUND` 실측 | `kpa_members` 행이 없는 kpa-branch 회원을 만들지 않아 런타임 미실측. 코드 경로는 정적 확인만 했다 |
| C4 | `TARGET_NOT_ALLOWED` · `SYNC_VALUE_INVALID` 실측 | 현재 Template 의 4개 syncTarget 이 전부 allowlist 안이고 값도 유효해 발생하지 않았다. 방어 코드는 존재하나 런타임 미실측 |
| C5 | W2 §8 의 A1~A4 | 변동 없음 (R9 원장 부재 · 파일 업로드 · training/fee 원장 · `AnnualReportFormPage.tsx` 제거 후보) |
| C6 | **W4 운영자 검수·반려** | 다음 작업. `status` 확장 시 `CHK_annual_reports_synced_submitted` 를 함께 재검토해야 한다 (반려된 신고서의 sync 취급) |

---

## 11. 문서 정합 (CLAUDE.md §16)

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

---

## 12. 중지 조건 판단

**중지하지 않고 진행했다.** 승인된 2계정 + namgu 분회 밖의 production 권한 변경이 없었다.

- 권한 부여는 승인 범위 6행뿐이고 전부 원복했다.
- `annual_report_templates`(209개 분회 공유)는 **읽기만** 했다 — 신고기간을 임시로 늘리지 않았다(§3-2).
- `kpa_members` write 는 본 WO 의 대상이며(sync 그 자체), E2E 로 바뀐 값은 착수 시점 값으로 복원했다.
- migration 은 WO 가 지시한 컬럼 2개 추가이며 기존 데이터를 변경하지 않는다(DEFAULT false / NULL).
