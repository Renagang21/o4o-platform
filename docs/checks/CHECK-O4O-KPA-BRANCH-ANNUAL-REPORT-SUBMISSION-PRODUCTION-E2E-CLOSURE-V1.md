# CHECK — 신상신고(W2) production E2E 종결

- **WO**: `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-PRODUCTION-E2E-CLOSURE-V1`
- **일자**: 2026-09-05
- **판정**: **CLOSED** — W2 의 ⏸ 차단 8항목 + W1 잔여 1항목 전부 프로덕션 실측 완료
- **선행**: [W1 CHECK](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1.md) · [W2 CHECK](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1.md) · [credential CHECK](CHECK-O4O-KPA-BRANCH-SERVICE-CREDENTIAL-ONBOARDING-V1.md)
- **commit**: `33425df07` (기간 정책 통일) · 본 CHECK 는 후속 커밋
- **환경**: 프로덕션 (`https://api.neture.co.kr` · `https://kpa-society.co.kr/kpa` · DB `o4o_platform`)

> W2 CHECK 는 2026-08-12 시점 기록이며 그 시점의 "⏸ 차단" 판정을 그대로 보존한다
> (CLAUDE.md §16-1 — 기록물은 사후 수정 대상이 아니다). 본 문서가 그 후속 종결 기록이다.

---

## 0. 결과 요약

| # | W2 검증 항목 | W2(2026-08-12) | 본 WO(2026-09-05) |
|:--:|---|:---:|:---:|
| 1 | kpa-branch 회원 로그인 | ⏸ 차단 | ✅ 실측 |
| 2 | 2026 Template 51필드 로드 | ⏸ 차단 | ✅ 실측 |
| 3 | 4 STEP 렌더 | ⏸ 차단 | ✅ **브라우저 실측** |
| 4 | 조건부 field 표시/숨김 | ✅ 오프라인 | ✅ **브라우저 실측으로 승격** |
| 5 | draft 저장 → 새로고침 → 복원 | ⏸ 차단 | ✅ **브라우저 실측** |
| 6 | 필수항목 누락 제출 차단 | ✅ 오프라인 | ✅ **프로덕션 422 실측으로 승격** |
| 7 | 정상 제출 → `submitted` | ⏸ 차단 | ✅ 실측 |
| 8 | 제출 후 재수정/재제출 정책 | ⏸ 차단 | ✅ 실측 (409) |
| 9 | association 변조 → 서버 무시 | ✅ 오프라인 | ✅ **프로덕션 + DB 실측으로 승격** |
| 10 | body userId/organizationId 변조 | ⏸ 차단 | ✅ 실측 (DB 대조) |
| 11 | 다른 분회 report 접근 차단 | ⏸ 차단 | ✅ 실측 (403) |
| 12 | 다른 서비스 membership 만 → 차단 | ✅ | ✅ **fixture 원복 후 재실측** |
| 13 | 기존 서비스 회귀 없음 | ✅ | ✅ 재실측 |
| — | W1 잔여 — operator 200 smoke | ⏸ 차단 | ✅ 실측 |

**전 항목 종결.** 추가로 신고기간 정책을 확정하고(§5) 검증 fixture 를 원복했다(§8).

---

## 1. fixture before / after

### 1-1. ⚠️ 착수 시점 실측 — fixture 는 이미 존재했다

W2 CHECK 는 "계정 부여가 권한 분류기에 막혀 미실행"으로 기록돼 있으나, **실제로는 CHECK 작성
다음 날(2026-08-13) 부여가 완료돼 있었다.** 본 WO 는 신규 부여 없이 기존 fixture 를 사용했다.

| 축 | before (2026-09-05 착수) | 생성 시각 |
|---|---|---|
| `service_memberships(kpa-branch)` | 2건 — `dbb7561e…`(renagang21) · `e1d3ad4f…`(sohae2100), 둘 다 `active` / role `user` | 2026-08-13 00:08:59 |
| `role_assignments(kpa-branch:*)` | 2건 — `ceba9219…` `kpa-branch:member`(renagang21) · `d141043d…` `kpa-branch:operator`(sohae2100), `is_active=t` | 2026-08-13 00:04:44 |
| `branch_memberships` | 2건 — `361abd0f…`(renagang21) · `361ea985…`(sohae2100), 둘 다 namgu `ba1e90a6…` `active`, note = `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1 검증계정` | 2026-08-13 00:04:44 |
| `service_credentials(kpa-branch)` | **0건** | — |
| `annual_reports` | 0건 | — |

부여 대상은 WO 가 승인한 2계정 + namgu 뿐이며 그 범위를 벗어난 권한 변경은 하지 않았다.

### 1-2. 로그인 경로 — L1 fallback

`service_credentials(kpa-branch)` 가 0건이므로 로그인은 `service_credentials.password_hash ??
users.password` dual-read 의 **L1 fallback** 으로 성사된다
(credential CHECK §1 의 구조 그대로). 즉 본 검증은 **L2 credential 을 새로 만들지 않았다.**

### 1-3. after (원복 후) — §8 참조

---

## 2. W1 잔여 — operator 200 smoke

`sohae2100@gmail.com` (`kpa-branch:operator`) 로 실측.

```
GET /branches/namgu/operator/annual-report-templates        200  · 1건 (2026 v1 active)
GET /branches/namgu/operator/annual-report-templates/2026   200
     steps=4  fields=51  rules=11   period 2026-01-01 ~ 2026-02-28
     응답 필드: id · serviceKey · year · version · title · status · periodStart · periodEnd
              · templateVersion · stepCount · fieldCount · ruleCount · ownershipBreakdown
              · updatedAt · isActive · fallbackToLatestVersion · schema
```

W1 CHECK 의 검증 7("operator 조회 정상")이 **⚠️ 부분 → ✅** 로 종결된다.
W1 §3 의 DB 실측값(`steps=4 / fields=51 / rules=11`)과 API 응답이 일치한다.

---

## 3. W2 회원 E2E — 실제 API + 브라우저

### 3-1. API 경로 (프로덕션)

| 검증 | 결과 |
|---|---|
| GET `/me/annual-report` (operator) | 200 · `report=null` · `notEvaluableRules=["R9"]` |
| prefill (`ownership='auto'`) | `personal.name` `personal.licenseNumber` `personal.email` `employment.activityType` `employment.workplaceName` `employment.workplaceRoadAddress` 실제 원장값으로 채워짐 |
| association 주입 | `personal.branch="부산광역시약사회"` · `personal.division="남구약사회"` = **서버 확정값** |
| `associationLinkStatus` | `personal.branch`/`personal.division` = `resolved`, `training.*`(3) · `fee.*`(2) = `not_linked` — 가짜 값 없음 |
| 빈 제출 | **422 `VALIDATION_FAILED` · 누락 18건** (W2 오프라인 실증 18건과 정확히 일치) |
| 정상 제출 | **200 · `status='submitted'`** · `submittedAt=2026-09-05T01:06:01.719Z` |
| 제출 스냅샷 | `{templateId: 837b4436…, organizationId: ba1e90a6…(namgu), year: 2026}` |
| 재제출 | **409 `ALREADY_SUBMITTED`** |
| 제출 후 draft 저장 | **409 `ALREADY_SUBMITTED`** (제출본을 덮어쓰지 않는다) |
| 제출 후 GET | `readonly=true` · `report.status='submitted'` |
| 다른 분회(`donggu`) 접근 | **403 `BRANCH_SCOPE_MISMATCH`** (operator·member 모두) |
| member draft 저장 → 재조회 | 200 → 저장값 그대로 복원 |

제출은 8라운드 루프가 아니라 **2라운드**로 통과했다(1차 422 → 스키마 정의로 값 생성 → 2차 200).
값은 **field 정의(type·options·validation.pattern)만 보고 생성**했다 — 필드 이름을 추측하지 않았다.

### 3-2. 브라우저 (Playwright chromium, 실제 폼 로그인)

토큰 주입이 아니라 `/kpa/login` 폼 제출로 로그인했다.

| 검증 | 결과 |
|---|---|
| 4 STEP 렌더 | `01. 약관동의` / `02. 인적사항` / `03. 취업현황` / `04. 기타사항` |
| STEP 별 표시 필드 수 | 2 / 18 / 11 / 10 (합 41 — 51 중 조건부 숨김 10개 제외) |
| prefill 화면 반영 | 성명·Email·소속 지부(부산광역시약사회)·소속 분회(남구약사회)·신고년도(2026) |
| draft 저장 → **실제 새로고침** → 복원 | 입력 `0107477708` → "임시저장했습니다." → `reload()` → 동일 값 복원 ✅ |
| 제출 버튼 (member · 기간 종료) | 존재하되 **disabled** |
| 제출완료본 (operator) | "제출이 완료되어 읽기 전용입니다" · 임시저장/제출 버튼 **0개** |
| console error | 0 (분회 홈페이지 미게시로 인한 API 404 제외) |

#### 조건부 표시/숨김 (E2E 4) — 활동유형 전환 실측

| activityType | STEP 03 표시 필드 |
|---|---|
| `pharmacy_owner` | 활동유형 · 근무처 5 · 사업자번호 · 요양기관기호 · 한약(첩약) · 동물약품 · 의약분업 |
| `inactive` | 활동유형 · **미활동 사유** · 미활동 부가 설명 — **근무처 전부 숨김** (R8) |
| `hospital` | 활동유형 · **의료기관 종별** · **업무 구분** · 근무처 5 (R3) |

W2 확정사항 2건(조제/비조제 = 의료기관 공통 R3, 미활동 시 근무처 숨김 R8)이 화면에서 그대로 동작한다.

> **오탐 1건 정정**: 최초 측정에서 `/kpa/me` 가 "등록된 분회 소속이 없습니다"로 보였으나,
> 이는 로딩 완료를 기다리지 않은 **테스트 타이밍 문제**였다. `networkidle` 대기 후 재측정하면
> member = `현재 소속 남구약사회 / 가입 상태 active / 역할 분회 회원`,
> operator = `… / 역할 분회 운영자` 로 정상 렌더된다. 코드 결함 아님.

---

## 4. association / 신뢰경계 변조 방어 (E2E 9·10)

적대적 payload 를 프로덕션에 그대로 전송했다.

```
body: { userId: 00000000-…-000000000001,        ← 존재하지 않는 사용자
        organizationId: 469e388a-…(donggu),      ← 다른 분회
        serviceKey: 'kpa-society', year: 1999,
        values: { personal.branch:'위조지부', personal.division:'위조분회',
                  training.completedCredits:999, training.requiredCredits:999,
                  fee.category:'A', fee.exemptionType:'exempted',
                  report.year:1999, submission.declaredAt:'1999-01-01',
                  evil.injectedKey:'x' } }
```

**서버 응답 `ignoredKeys` = 위 9키 전부.** 저장된 값:

| key | 저장값 |
|---|---|
| `personal.branch` | `부산광역시약사회` (서버 확정) |
| `personal.division` | `남구약사회` (서버 확정) |
| `report.year` | `2026` (Template 연도) |
| `submission.declaredAt` | `2026-09-05` (서버 시각) |
| `training.*` · `fee.*` | `null` (미연결 — 999/'A' 미반영) |
| `evil.injectedKey` | 저장되지 않음 |

### DB 직접 대조 (프로덕션 SELECT)

```
annual_reports 2건 — 둘 다 org_slug = namgu, year = 2026
organization_id <> namgu 인 행                       : 0
values ? 'evil.injectedKey' / 'evil.x'               : false / false
values->>'personal.branch'  = 부산광역시약사회        (두 행 모두)
values->>'personal.division'= 남구약사회              (두 행 모두)
jsonb_typeof(values->'training.completedCredits')    : null
```

`userId`/`organizationId` 변조에도 **행 소유자·소속이 요청자·namgu 로 고정**됐다.
W2 §2 의 "body 의 userId/organizationId 를 읽는 코드가 없다"가 런타임으로 확인됐다.

---

## 5. 신고 기간 정책 최종화 (WO §5)

### 5-1. 변경 전 상태

W2 설계결정 D1 로 `canBypassPeriod()` 가 있었다 — `kpa-branch:operator` / `:admin` 은 기간 밖에도
제출 가능. 착수 시점 실측:

```
operator  GET period → {status:'closed', canSubmit:true,  bypassReason:'OPERATOR_BYPASS'}
member    GET period → {status:'closed', canSubmit:false, bypassReason:null}
```

이 예외를 이용해 **정상 제출 E2E(§3-1)를 먼저 완주**한 뒤 예외를 제거했다
(WO §5 의 "정상 E2E 검증에 필요한 범위까지만 확인 후 제거" 순서).

### 5-2. 변경 (`33425df07`)

`/me/annual-report/*` 는 **본인 신고** 경로다. 누가 요청하든 신고 주체는 요청자 자신이므로
member / operator / admin 에 같은 기간 정책을 적용한다.

| 파일 | 변경 |
|---|---|
| `MemberAnnualReportController.ts` | `canBypassPeriod()` 삭제 · `submit` 은 `period!=='open'` 이면 무조건 403 · `period.canSubmit = (status==='open')` · `bypassReason` 필드 제거 |
| `lib/api/annualReport.ts` | `period` 타입에서 `bypassReason` 제거 |
| `AnnualReportPage.tsx` | 도달 불가능해진 `"(운영자 권한으로 제출할 수 있습니다)"` 문구 제거 |

운영자가 기간 밖에 회원 신고를 **대신** 처리하는 기능은 이 경로가 아니라 별도 운영자 경로의
문제이므로 이번 WO 에서 만들지 않았다(WO §5 명시).

### 5-3. 변경 후 재검증 (배포 완료 리비전 기준)

```
operator  GET period → {status:'closed', canSubmit:false}    submit → 403 REPORT_PERIOD_CLOSED
member    GET period → {status:'closed', canSubmit:false}    submit → 403 REPORT_PERIOD_CLOSED
```

- **역할 무관 동일 차단 확인.** operator 의 403 은 `ALREADY_SUBMITTED`(409)보다 먼저 나온다 —
  기간 게이트가 존재 검사보다 앞에 있다는 뜻이다.
- draft 는 여전히 기간과 무관하다: member 200 / operator 409(이미 제출) — 설계대로다.
- 이미 제출된 신고서는 정책 변경 후에도 스냅샷 그대로 보존됐다.
- 브라우저: 두 계정 모두 `"(운영자 권한으로 제출할 수 있습니다)"` **문구 없음**,
  member 화면은 `"신고 기간이 종료되었습니다. 임시저장은 가능하지만 제출은 할 수 없습니다."`

---

## 6. snapshot 정책 (WO §6)

제출 완료본은 제출 당시 저장된 조합을 그대로 반환한다.

```
templateId      837b4436-3d0c-4c03-9ef8-7f811e883263
organizationId  ba1e90a6-ae34-46b7-8134-07669b51a2fa (namgu)
year            2026
submittedAt     2026-09-05T01:06:01.719Z
values          32키 (제출 시점 스냅샷)
```

제출 후 GET 은 `readonly=true` 이며 association 을 **재주입하지 않는다**
(`existing.status === 'submitted'` 분기가 `{...existing.values}` 만 반환).
전출·조직변경 후에도 과거 신고서의 소속이 현재 원장 값으로 바뀌지 않는다 — W2 설계결정 D2 유지.

FK `RESTRICT`(`FK_annual_reports_template` · `FK_annual_reports_organization`) 로 제출본이 있는
Template/조직은 삭제되지 않아 스냅샷 참조가 끊기지 않는다.

---

## 7. tenant · cross-service 경계

| 검증 | 결과 |
|---|---|
| 다른 분회(`donggu`) `/me/annual-report` | **403 `BRANCH_SCOPE_MISMATCH`** — operator·member 모두 |
| 저장 행의 `organization_id` | 전부 namgu (변조 무시, §4) |
| 분회 A/B 혼선 | 0 — 두 계정 모두 namgu 소속이며 donggu 는 차단 |
| 미인증 | 401 (W2 §2 기록 유지) |

**다른 서비스만 가진 사용자 차단(E2E 12)** 은 fixture 를 원복한 뒤 재실측했다 — §8-2.

---

## 8. fixture 원복 (WO §7)

### 8-1. 삭제 대상 — 단일 트랜잭션, 명시 id 만

```sql
BEGIN;
DELETE FROM annual_reports      WHERE id IN ('c73a19ae-…','2704cb71-…');            -- DELETE 2 (본 WO E2E 생성)
DELETE FROM branch_memberships  WHERE id IN ('361ea985-…','361abd0f-…');            -- DELETE 2 (W2 검증계정)
DELETE FROM role_assignments    WHERE id IN ('ceba9219-…','d141043d-…');            -- DELETE 2 (W2 검증계정)
DELETE FROM service_memberships WHERE id IN ('dbb7561e-…','e1d3ad4f-…');            -- DELETE 2 (W2 검증계정)
COMMIT;
```

`branch_memberships` 는 append-only 원장이지만 **`status='left'` 마감이 아니라 삭제**를 택했다 —
이 행들은 실제 전출 사건이 아니라 note 로 명시된 검증 fixture 이며, `left` 로 남기면 일어나지 않은
전출 이력을 209개 분회 원장에 남기게 된다. WO §7 의 목표 상태(`kpa-branch 검증 fixture 0`)와도 일치한다.

> 이 4개 DELETE 중 `annual_reports` 2건만 본 WO 가 만든 행이고, 나머지 6건은 2026-08-13 에
> 선행 세션이 만든 **같은 WO 계열(W2)의 검증 fixture** 다. WO §7 의 목표 상태를 기준으로 함께 제거했다.

### 8-2. 원복 후 실측

```
annual_reports                        0
branch_memberships                    0
role_assignments  LIKE 'kpa-branch:%' 0
service_memberships kpa-branch        0
service_credentials kpa-branch        0
```

**불변 확인 (건드리지 않은 축):**

```
kpa_organizations type='group'                209   (209개 분회 무손상)
users status='active' (2계정)                   2   (users.status 불변)
두 계정의 service_memberships 잔여               11   (13 − kpa-branch 2)
두 계정의 role_assignments 잔여                  23   (25 − kpa-branch 2)
두 계정의 service_credentials                   10   (전량 불변 — kpa-branch credential 은 애초에 0)
annual_report_templates(kpa-branch)             1   (2026 v1 active 보존)
```

**게이트 재실증 (E2E 12·13):**

```
kpa-branch 로그인   renagang21 → 401 SERVICE_NOT_MEMBER
                   sohae2100  → 401 SERVICE_NOT_MEMBER
L1 토큰으로 접근    /branches/namgu/me/annual-report            → 403 MEMBERSHIP_NOT_FOUND
                   /branches/namgu/operator/annual-report-…    → 403 MEMBERSHIP_NOT_FOUND
                   /me/access → membershipStatus='none', roles=[]
타 서비스 회귀      두 계정 L1 로그인 200
public 회귀        /service-info /branches /branches/namgu /branches/namgu/posts → 전부 200
```

fixture 부여 → E2E → 원복의 **전 구간에서 게이트가 대칭으로 동작**함이 확인됐다.

---

## 9. 회귀 · 빌드 게이트

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (api-server) | clean |
| `tsc -b` (web-kpa-branch) | clean |
| `eslint` (수정 5파일) | clean |
| Deploy API Server `33425df07` | **success** |
| Deploy Web Services `33425df07` | **success** |
| CodeQL `33425df07` | **success** |
| public kpa-branch API 4종 | 200 |
| 타 서비스 로그인 | 200 |

### 9-1. CI Pipeline — 선행 실패 (이번 변경과 무관)

```
89332f865 (본 WO 이전) : Code Quality Check FAILURE
33425df07 (본 WO)      : Code Quality Check FAILURE — 같은 job
ESLint: 57 errors (baseline 55)
```

신규 오류로 열거된 파일은 `apps/admin-dashboard/src/pages/cpt-engine/**`,
`apps/admin-dashboard/src/services/ai/reference-fetcher.service.ts`,
`apps/api-server/src/__tests__/**` 이며 **kpa-branch / annual-report 파일은 하나도 없다.**
현재 변경과 무관한 선행 실패이므로 손대지 않았다 (CLAUDE.md 중지 조건).

---

## 10. 미해결 · 후속

W2 §8 의 A1~A4 는 그대로 유효하며 본 WO 에서 해소 대상이 아니었다.

| # | 항목 | 상태 |
|:--:|---|---|
| A1 | R9 서면신고 차단 | 근거 원장 부재 — `notEvaluableRules:["R9"]` 로 상태만 노출. **런타임에서도 R9 만 not-evaluable 로 보고됨을 확인** |
| A2 | 파일 업로드(면제·유예 확인서) | 필드 표시·입력 비활성 유지 |
| A3 | `training.*` · `fee.*` 실제 값 | `not_linked` 5필드 — 원장 구현은 별도 WO |
| A4 | `AnnualReportFormPage.tsx` (web-kpa-society) | **제거 후보 확정 가능** — W2 정상 동작이 E2E 로 확인됐으므로 전제 조건은 충족됐다. 타 서비스 파일이라 본 WO 에서 손대지 않았다 |
| B1 | **W3 `ANNUAL-REPORT-MEMBERSHIP-SYNC-V1`** | 다음 작업. `syncToMembership` 5필드 + `synced_changes` 원장 |
| B2 | 운영자 기간 외 대리 처리 | §5 에서 `/me/*` 경로의 예외를 제거했다. 실제 필요가 확인되면 **별도 운영자 경로**로 설계한다 (본인 신고 경로에 역할 예외를 되돌리지 않는다) |
| B3 | 재검증 시 fixture 재부여 | 원복으로 kpa-branch 접근 계정이 다시 0명이다. W3 검증 때 §1-1 과 같은 3축 6행을 다시 만들어야 한다 |

---

## 11. 문서 정합 (CLAUDE.md §16)

```text
문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

- 발견 1건: W2 CHECK 의 "⏸ 차단 8건 · 계정 부여 미실행" 기술이 실제 이력(2026-08-13 부여 완료)과
  어긋난다. 다만 **`docs/checks/**` 는 §16-1 상 정비 대상이 아닌 기록물**이므로 수정하지 않고
  본 문서 §1-1 에 사실관계를 기록했다.
- `docs/baseline/**` · `docs/architecture/**` 에 신상신고 관련 stale 기준 문서는 없다.

---

## 12. 중지 조건 판단 (WO 중지 조건)

**중지하지 않고 진행했다.** 승인 범위를 벗어난 production 권한 변경이 필요하지 않았다.

- 신규 권한 부여 **0건** — fixture 가 이미 존재해 승인된 2계정 + namgu 밖으로 나갈 일이 없었다.
- DB write 는 §8 의 DELETE 8행뿐이며 전부 WO §7 이 지시한 원복이다.
- `users` · `service_credentials` · 타 서비스 memberships/roles · `kpa_organizations` ·
  `annual_report_templates` 는 읽기만 했다.
- migration · schema 변경 · dependency · CI 인프라 변경 없음.
