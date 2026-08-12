# CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1

> **WO**: `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1` (W2)
> **일자**: 2026-08-12
> **commit**: `26d99804b` (구현) · 본 CHECK 는 후속 커밋
> **배포**: Deploy API Server → **success** · Deploy Web Services → **success**
> **선행**: [W1 CHECK](CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1.md)

---

## 0. 결과 요약

| WO 검증 항목 | 결과 | 방식 |
|---|:---:|---|
| 1. kpa-branch 회원 로그인 | ⏸ **차단** | 검증계정 부여가 권한 분류기에 막힘 — §6 |
| 2. 2026 Template 51필드 로드 | ⏸ **차단** | 〃 (Template 51필드 자체는 DB 실측 확인) |
| 3. 4 STEP 렌더 | ⏸ **차단** | 〃 (프런트 번들 배포는 확인) |
| 4. 조건부 field 표시/숨김 | ✅ | **오프라인 실증** (실제 코드 + 프로덕션 Template) |
| 5. draft 저장 → 새로고침 → 복원 | ⏸ **차단** | §6 |
| 6. 필수항목 누락 제출 → 차단 | ✅ | 오프라인 실증 (18건 검출) |
| 7. 정상 제출 → `submitted` | ⏸ **차단** | §6 (검증 로직 통과는 실증) |
| 8. 제출 후 재수정/재제출 정책 | ⏸ **차단** | §6 |
| 9. **association 변조 → 서버 무시** | ✅ | 오프라인 실증 (9키 제거) |
| 10. body userId/organizationId 변조 | ⏸ **차단** | §6 (코드상 미참조는 정적 확인) |
| 11. 다른 분회 report 접근 차단 | ⏸ **차단** | §6 |
| 12. 다른 서비스 membership 만 → 차단 | ✅ | **프로덕션 실측 403** |
| 13. 기존 서비스 회귀 없음 | ✅ | 프로덕션 실측 |
| W1 잔여 — operator 200 smoke | ⏸ **차단** | §6 |

**4/13 실측·실증 완료 · 8건 계정 차단 · 1건(W1 잔여) 차단.**

구현·배포·migration 은 완료됐고, 남은 것은 **프로덕션 검증계정 부여 1회**뿐이다.

---

## 1. `annual_reports` 구조

```
id · template_id · user_id · organization_id · year · status · values jsonb
submitted_at · created_at · updated_at
```

프로덕션 실측 제약:

```
UQ_annual_reports_user_year        UNIQUE (user_id, year)
CHK_annual_reports_status          status IN ('draft','submitted')
CHK_annual_reports_submitted_at    draft ⇒ submitted_at IS NULL / submitted ⇒ NOT NULL
CHK_annual_reports_year            2000..2100
FK_annual_reports_template         → annual_report_templates (RESTRICT)
FK_annual_reports_organization     → kpa_organizations (RESTRICT)
IDX_annual_reports_org_year        (organization_id, year, status)
```

`typeorm_migrations` 에 `CreateAnnualReports20270309000000` 기록됨. 현재 0행.

**FK RESTRICT 의 뜻**: 제출본이 있는 Template 은 삭제할 수 없다 → 스냅샷이 끊기지 않는다.

---

## 2. API

```
GET  /api/v1/kpa-branch/branches/:branchSlug/me/annual-report
POST /api/v1/kpa-branch/branches/:branchSlug/me/annual-report/draft
POST /api/v1/kpa-branch/branches/:branchSlug/me/annual-report/submit
```

가드 4겹: `requireAuth` → `requireKpaBranchScope('kpa-branch:member')` → `resolveBranch` → `requireBranchScope`.

**신뢰 경계** — body 의 `userId` / `organizationId` / `serviceKey` / `year` 를 **읽는 코드가 없다**:

| 값 | 출처 |
|---|---|
| `user_id` | `req.user.id` (requireAuth) |
| `organization_id` | `req.branch.id` (resolveBranch + requireBranchScope) |
| `year` | active Template 의 `year` |
| `submitted_at` | 서버 시각 |

실측(미인증): `GET` 401 · `POST /draft` 401 · `POST /submit` 401.

---

## 3. 4 STEP UI

`/:branchSlug/mypage/annual-report` — [AnnualReportPage.tsx](../../services/web-kpa-branch/src/pages/annual-report/AnnualReportPage.tsx) + [FieldRenderer.tsx](../../services/web-kpa-branch/src/pages/annual-report/FieldRenderer.tsx)

- **필드 key 를 하나도 모른다.** `type` / `options` / `readonly` / `group` 만 보고 그린다.
- 활동유형 11종·미활동 사유 9종을 프런트에 복제하지 않았다 — 서버 schema 만 사용.
- 한 화면에 51개를 펼치지 않는다. STEP 단위 + 이전/다음 + STEP 직접 이동.
- 제출 실패 시 **누락 항목이 있는 STEP 으로 자동 이동**한다.
- `multiselect` 는 `option.group` 을 보존해 "6개월 이상 조제업무 미종사" 층위를 그대로 표시한다.

배포 실측 — `https://kpa-branch-web-…/namgu/mypage/annual-report` **200**, 번들에 `annual-report`·`신상신고`·`임시저장`·`약사회 관리` 문자열 포함 확인.

> 기존 `services/web-kpa-society/.../AnnualReportFormPage.tsx` 는 **복원하지 않았다.** 여전히 라우팅되지 않는 dead 상태이며 §8 에 제거 후보로 기록한다.

---

## 4. Prefill

`ownership='auto'` + `source` 기준으로 서버가 초기값을 만든다 (`buildPrefill`).

| field | source |
|---|---|
| `personal.name` | `users.name` |
| `personal.email` | `users.email` |
| `personal.licenseNumber` | `kpa_members.license_number` |
| `employment.activityType` | `kpa_members.activity_type` |
| `employment.workplaceName` | `kpa_members.pharmacy_name` |
| `employment.workplaceRoadAddress` | `kpa_members.pharmacy_address` |

초기값일 뿐이며 수정 가능 여부는 Template 의 `readonly` 가 정한다. **본 WO 에서 원장에 되쓰지 않는다** (sync = W3).

---

## 5. ownership / association 방어 — 실증

WO §5 가 "핵심 검증 사항"으로 지정한 항목이다. 프로덕션 계정이 막혀 **실제 프로덕션 Template(51필드) + 실제 `AnnualReportService` 코드**로 오프라인 실증했다. DB 를 쓰지 않는 순수 함수라 동작이 동일하다.

적대적 payload 를 그대로 던진 결과:

```
입력: personal.branch="위조지부"  personal.division="위조분회"
      training.completedCredits=999  training.requiredCredits=999
      fee.category="A"  fee.exemptionType="exempted"
      report.year=1999  submission.declaredAt="1999-01-01"
      evil.injectedKey="x"  __proto__="poison"
      personal.gender="male"  personal.mobile="01012345678"

dropped  = [personal.branch, personal.division, training.completedCredits,
            training.requiredCredits, fee.category, fee.exemptionType,
            report.year, submission.declaredAt, evil.injectedKey]
accepted = [personal.gender, personal.mobile]
```

| 검증 | 결과 |
|---|:---:|
| association 6종 전부 제거 | ✅ |
| readonly(`report.year`·`submission.declaredAt`) 제거 | ✅ |
| Template 에 없는 키 제거 | ✅ |
| 회원 입력값은 통과 | ✅ |

저장되는 `values` 에는 서버가 확정한 값만 들어간다. 클라이언트 validation 에 의존하지 않는다.

### 5-1. association 주입 — 가짜 값 금지

| field | 처리 |
|---|---|
| `personal.division` | `branch_memberships` → `kpa_organizations.name` 주입 |
| `personal.branch` | 분회의 `parent_id` → 지부명. parent 없으면 **`not_linked`** (임의 추정 금지) |
| `training.*` · `fee.*` | 연결 원장 부재 → **`null` + `not_linked`**. 화면에 "미연결 · 확인 필요" 표시 |

하드코딩한 평점·회비를 넣지 않았다 (WO §4).

---

## 6. ⏸ 차단 — 프로덕션 검증계정 부여

E2E 8항목 + W1 잔여 1항목이 여기서 막혔다.

**막힌 지점**: 검증계정 부여 SQL 실행이 **Claude Code 권한 분류기(auto mode classifier)에 의해 거부**됐다. 우회하지 않고 중단했다.

**현재 상태 (프로덕션 실측)** — `kpa-branch` role 보유자 **0명**, `branch_memberships` active **0건**. 즉 **회원 경로를 밟을 수 있는 계정이 존재하지 않는다.**

**계정 부여 전에 먼저 실행한 차단 검증** (순서를 지켜 negative 를 먼저 잡았다):

```
GET /api/v1/kpa-branch/branches/namgu/me/annual-report
  미인증                → 401
  sohae2100@gmail.com   → 403   (kpa:admin·neture:admin 등 타 서비스 admin 다수 보유)
  renagang21@gmail.com  → 403
```

→ **E2E 12 PASS.** `blockedServicePrefixes` 가 서비스 간 권한 누수를 막고 있음이 실증됐다.

### 6-1. 필요한 부여 (승인 시 실행할 최소 행)

`namgu` 분회(`ba1e90a6-ae34-46b7-8134-07669b51a2fa`) 기준, 계정당 3행씩 총 6행.

| 계정 | 역할 | 목적 |
|---|---|---|
| `renagang21@gmail.com` | `kpa-branch:member` | E2E 1·2·3·5·6·10·11 (일반 회원 경로 · 기간 외 제출 차단) |
| `sohae2100@gmail.com` | `kpa-branch:operator` | E2E 7·8 (정상 제출 — 기간 외 예외) + W1 잔여 operator 200 smoke |

```sql
-- 1) 서비스 접근
INSERT INTO service_memberships (user_id, service_key, status, role)
SELECT u.id, 'kpa-branch', 'active', 'user' FROM users u
 WHERE u.email IN ('renagang21@gmail.com','sohae2100@gmail.com')
   AND NOT EXISTS (SELECT 1 FROM service_memberships s
                    WHERE s.user_id=u.id AND s.service_key='kpa-branch');

-- 2) 서비스 역할
INSERT INTO role_assignments (user_id, role, is_active, scope_type)
SELECT u.id,
       CASE WHEN u.email='sohae2100@gmail.com' THEN 'kpa-branch:operator'
            ELSE 'kpa-branch:member' END,
       true, 'global'
  FROM users u
 WHERE u.email IN ('renagang21@gmail.com','sohae2100@gmail.com');

-- 3) 분회 소속
INSERT INTO branch_memberships (user_id, organization_id, status, joined_at, note)
SELECT u.id, 'ba1e90a6-ae34-46b7-8134-07669b51a2fa', 'active', now(),
       'WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1 검증계정'
  FROM users u
 WHERE u.email IN ('renagang21@gmail.com','sohae2100@gmail.com')
   AND NOT EXISTS (SELECT 1 FROM branch_memberships b
                    WHERE b.user_id=u.id AND b.status='active');
```

**되돌리기**: 위 3개 INSERT 를 대응 DELETE 로 지우면 원복된다 (`branch_memberships` 는 append-only 원장이므로 `status='left'` 로 마감하는 편이 정합적).

**주의**: 부여 후에는 위 두 계정으로 E2E 12(미가입 차단)를 재현할 수 없다. 그래서 **부여 전에 먼저 실행해 기록**했다.

---

## 7. 오프라인 실증 결과 (실제 코드 + 프로덕션 Template)

`AnnualReportService` 를 컴파일해 DB 스텁만 끼우고 프로덕션 2026 schema 로 실행했다. **26 검증 전부 PASS.**

### 조건부 표시 (WO §6 · E2E 4)

| activityType | 결과 |
|---|:---:|
| `pharmacy_owner` | 약국현황 표시 · 미활동 숨김 · 근무처 표시 ✅ |
| `inactive` | 미활동 표시 · **근무처 숨김** · 약국현황 숨김 ✅ |
| `hospital` | 종별 + **조제/비조제** 표시 ✅ |
| `manufacturer` / `importer` / `wholesaler` | 해당 역할만 표시, 나머지 2종 숨김 ✅ |
| `other` | 자유입력 표시 ✅ |
| `pharmacy_employee` | 자유입력 숨김 · 근무처 표시 ✅ |
| 수취거부 | 해당 사유만 표시 ✅ |

### required 검증 (E2E 6)

| 검증 | 결과 |
|---|:---:|
| 빈 제출 → 누락 **18건** 검출 | ✅ |
| `association` 은 누락에 미포함 (회원 책임 아님) | ✅ |
| **미활동 시 근무처·약국현황이 required 에서 제외** | ✅ |
| 미활동 사유는 required 로 남음 | ✅ |
| 정의되지 않은 선택지 거부 (`INVALID_OPTION`) | ✅ |
| 사업자번호 패턴 위반 검출 (`PATTERN`) | ✅ |
| 동의 미체크 검출 (`CONSENT_REQUIRED`) | ✅ |
| 완전 입력 → 누락 0 | ✅ |

숨겨진 필드를 required 에서 빼는 것을 **서버에서도** 적용했다. 프런트에만 넣으면 "보이지도 않는 필드 때문에 제출 불가"가 된다.

### 신고 기간

`open`(2026-02-01) / `before`(2025-12-31) / `closed`(오늘 2026-08-12) 판정 정확 ✅

---

## 8. 미구현 · 후속 분리

| # | 항목 | 사유 |
|:---:|---|---|
| A1 | **R9 서면신고 차단** | WO §10 조사 결과 **근거 원장 부재**: `yaksa_membership_years` **0행** · `yaksa_members` **0행** · `annual_reports` 신설(0행). 2018~2025 신고이력이 존재하지 않는다. **있는 것처럼 구현하지 않았다** — `notEvaluableRules: ["R9"]` 로 상태만 노출하고 차단하지 않는다. 과거 신고이력 테이블도 새로 만들지 않았다 |
| A2 | **파일 업로드** (면제·유예 확인서) | WO §11. 안전하게 재사용할 기존 미디어 경로를 확인하지 못해 **필드는 표시하되 입력 비활성**("분회 사무국으로 제출해 주세요"). 이 한 항목 때문에 별도 저장소를 만들지 않았다 |
| A3 | `training.*` · `fee.*` 실제 값 | 연결 원장 미존재. `not_linked` 로 표시. 원장 구현은 별도 WO |
| A4 | `AnnualReportFormPage.tsx` (web-kpa-society) | **제거 후보.** 여전히 export 만 되고 라우팅 없음. 단 W2 정상 동작이 E2E 로 확인된 뒤 제거해야 하고, 타 서비스 파일이라 본 WO 에서 손대지 않았다 |

### 8-1. 판단해 둔 설계 결정 2건

| # | 결정 | 근거 |
|:---:|---|---|
| D1 | **신고 기간 — 회원은 기간 내에만 제출, `operator`/`admin` 은 기간 밖에도 제출 가능** | 오늘(2026-08-12)은 2026 기간(1/1~2/28) 밖이다. 예외가 없으면 정상 제출 경로를 연중 10개월 점검조차 할 수 없고, 분회 실무상 기간 외 대리 처리가 필요하다. 과하다고 판단되면 `canBypassPeriod()` 를 제거하면 된다 |
| D2 | **제출 완료본은 association 재주입 없이 스냅샷 그대로 반환** | 재주입하면 회원이 전출한 뒤 과거 신고서의 소속이 현재 분회로 바뀌어 보여 제출 기록이 훼손된다 (WO §8 스냅샷 보존) |

---

## 9. 회귀 (E2E 13) — ✅

```
200  /health
200  /api/v1/kpa-branch/service-info
200  /api/v1/kpa-branch/branches
200  /api/v1/kpa-branch/branches/namgu
200  /api/v1/kpa-branch/branches/namgu/posts
200  /api/v1/auth/status
200  kpa-branch-web /namgu/mypage/annual-report
```

빌드 게이트: api-server `tsc --noEmit` clean · web-kpa-branch `tsc --noEmit` clean · `eslint` clean(신규·수정 12파일).

---

## 10. 문서 정합 (CLAUDE.md §16)

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

---

## 11. Git

| 항목 | 값 |
|---|---|
| 구현 commit | `26d99804b` (12 files) |
| push | `7278e5206..26d99804b  main -> main` |
| Deploy API Server | `26d99804b` → **success** |
| Deploy Web Services | `26d99804b` → **success** |
| CI Pipeline `26d99804b` | **cancelled** — 병렬 세션이 직후 `37ec45fdf` 를 push. 해당 run 이 내 코드를 포함해 재실행됨 |
| 본 CHECK | 후속 커밋 |

---

## 12. 다음

1. **§6-1 계정 부여 승인** → E2E 8항목 + W1 잔여 operator smoke 를 한 번에 종료
2. W3 — `kpa_members` sync (`syncToMembership` 5필드 + `synced_changes` 원장)
3. W4 — 운영자 검수·반려 (`status` 확장)
