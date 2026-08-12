# CHECK-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1

> **WO**: `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1`
> **일자**: 2026-08-12
> **commit**: `ac476ceee` (코드) · 본 CHECK/IR 은 후속 커밋
> **배포**: Deploy API Server (Cloud Run) `ac476ceee` → **success**
> **선행 IR**: [IR-…-2026-TEMPLATE-FINALIZATION-V1](../ir/IR-O4O-KPA-BRANCH-ANNUAL-REPORT-2026-TEMPLATE-FINALIZATION-V1.md) · [IR-…-2026-STEP3-STEP4-CLOSE-V1](../ir/IR-O4O-KPA-BRANCH-ANNUAL-REPORT-2026-STEP3-STEP4-CLOSE-V1.md)

---

## 0. 결과 요약

| WO 검증 항목 | 결과 |
|---|:---:|
| 1. migration 적용 | ✅ |
| 2. 2026 V1 seed 정확히 1건 | ✅ |
| 3. active Template 중복 불가 | ✅ |
| 4. schema 의 4 STEP 존재 | ✅ |
| 5. STEP 03·04 조건부 field/rule 포함 | ✅ |
| 6. `association` 관리 필드 명시적 구분 | ✅ |
| 7. operator 조회 정상 | ⚠️ **부분** — §4-7 |
| 8. 일반 member 의 operator API 차단 | ✅ |
| 9. 다른 branch/service 회귀 없음 | ✅ |
| 10. schema 에 조사용 임시값 잔존 없음 | ✅ |

**9/10 통과 · 1건 부분.** 검증 7 은 `kpa-branch:operator` 보유 계정이 프로덕션에 **0명**이라 200 응답 본문을 실측하지 못했다. role 부여는 DB write 이자 권한 변경이므로 CLAUDE.md 중지 조건에 걸려 **수행하지 않았다.**

---

## 1. ⚠️ 착수 시점에 main 이 깨져 있었다 (전진 복구)

작업 중 **병렬 세션이 본 WO 의 `entities.ts` 변경만 자기 커밋에 흡수**해 먼저 push 했다.

| commit | 내용 | 결과 |
|---|---|---|
| `53208701e` | 네이버 외부판매 WO. **`entities.ts` 의 `AnnualReportTemplate` 등록 2줄이 함께 실림** | **Deploy API Server = failure** |
| `ac476ceee` | 본 WO — entity 파일 + barrel export + migration + controller + route | **success (복구)** |

`53208701e` 실패 로그 원문:

```
src/database/entities.ts(335,3): error TS2305:
  Module '"../routes/kpa-branch/entities/index.js"' has no exported member 'AnnualReportTemplate'.
```

`entities.ts` 는 등록됐는데 barrel export 와 entity 파일이 없어 참조가 끊긴 상태였다.
**되돌리지 않고 전진 복구**했다 — 공유 main 에서 reset 은 타 세션 작업을 훼손한다.

> 부수 효과로 `git status` 상 `entities.ts` 가 본 WO 의 변경 목록에 **나타나지 않는다.** 이미 타 커밋에 실렸기 때문이다.

---

## 2. 신규 자산

| 종류 | 경로 |
|---|---|
| Entity | [annual-report-template.entity.ts](../../apps/api-server/src/routes/kpa-branch/entities/annual-report-template.entity.ts) |
| Migration (table) | [20270307000000-CreateAnnualReportTemplates.ts](../../apps/api-server/src/database/migrations/20270307000000-CreateAnnualReportTemplates.ts) |
| Migration (seed) | [20270308000000-SeedKpaBranchAnnualReportTemplate2026.ts](../../apps/api-server/src/database/migrations/20270308000000-SeedKpaBranchAnnualReportTemplate2026.ts) |
| Controller | [AnnualReportTemplateController.ts](../../apps/api-server/src/controllers/kpa-branch/AnnualReportTemplateController.ts) |
| 배선 | [entities/index.ts](../../apps/api-server/src/routes/kpa-branch/entities/index.ts) · [kpa-branch.routes.ts](../../apps/api-server/src/routes/kpa-branch/kpa-branch.routes.ts) · `database/entities.ts`(타 커밋에 선반영) |

**만들지 않은 것 (WO 경계 준수):** `annual_reports` · 회원 제출 API/UI · 회원정보 sync · 연수교육/회비 원장 연결 · Template 편집 UI · `AnnualReportFormPage.tsx` 복원 · `reporting-yaksa` 복원.

---

## 3. 2026 Template 실측 (프로덕션 DB)

```
sk=kpa-branch  year=2026  v=1  status=active  2026-01-01~2026-02-28
steps=4  fields=51  rules=11
per-step  consent:2 / personal:18 / employment:19 / etc:12
ownership association:7  auto:8  member:36
```

### 3-1. 조건부 규칙 11종

| ID | 조건 | 대상 |
|---|---|---|
| R1 | `activityType = pharmacy_owner` | 약국현황 5 |
| R2 | `activityType = inactive` | 미활동 사유·부가설명 2 |
| R3 | `activityType = hospital` | 의료기관 종별 + **조제/비조제** |
| R4A/B/C | 제조 / 수입 / 도매 | 해당 업종 역할 1개씩 |
| R5 | `activityType = other` | 기타 직접입력 |
| R6A/B | 수취거부 | 사유 2 |
| R8 | `activityType ≠ inactive` | **근무처 5 (미활동 시 숨김)** |
| R9 | 2018~2025 신고 이력 전무 | 서면신고 안내 (공문 근거) |

WO 확정사항 2건 반영 — **조제/비조제는 의료기관 공통(R3)**, **미활동 선택 시 일반 근무처 입력 숨김(R8)**.

### 3-2. ownership

| 값 | 수 | 내용 |
|---|:---:|---|
| `association` | **7** | 연수교육 3 · 회비 2 · 소속 지부/분회 2 — **전량 `readonly=true`** |
| `auto` | 8 | 회원정보 prefill. 전부 `source` 보유 |
| `member` | 36 | 회원 직접 입력 |

`syncToMembership` 5건 — `license_number` · `activity_type` · `pharmacy_name` · `pharmacy_address` (+ `personal.email`/`name` 은 sync 대상 아님). 실제 sync 동작은 **W3 범위**다.

---

## 4. 검증 실측

### 4-1 ~ 4-3. DB (Cloud SQL Auth Proxy 경유 read)

```
[1] typeorm_migrations:
      CreateAnnualReportTemplates20270307000000
      SeedKpaBranchAnnualReportTemplate202620270308000000
[2] rows_total=1
[3] UQ_annual_report_templates_service_year_version  UNIQUE (service_key, year, version)
[3] UQ_annual_report_templates_active                UNIQUE (service_key, year) WHERE status='active'
```

**검증 3 은 제약 존재만이 아니라 실제 차단을 실증**했다. 롤백 트랜잭션이라 데이터 변경 0:

```
BEGIN;
INSERT ... VALUES ('kpa-branch', 2026, 2, 'dup_active_test', 'active');
→ ERROR: duplicate key value violates unique constraint "UQ_annual_report_templates_active"
ROLLBACK;
SELECT count(*) → rows_after_rollback=1     ← 불변
```

### 4-4 ~ 4-6, 4-10. 정적 게이트 **47/47 PASS**

DB 왕복 없이 schema 리터럴을 검사했다. 게이트가 **실제 결함 1건을 잡았다** — `submission.declaredAt` 이 `ownership='auto'` 인데 `source` 부재 → `$system.submittedAt` 으로 출처 명시 후 재통과.

주요 항목: STEP 4개·순서 1~4 / 고아 field 0 / key·order 중복 0 / `visibleWhen → rule` 참조 무결 / `rule.targets → field` 참조 무결 / 활동유형 11종 · 의료기관 종별 7종 · 미활동 사유 9종 / **업종별 중간역할 라벨 3종 상이**(`제조관리자·안전관리책임자` / `수입관리자` / `도매업무관리자`) / `association` 전량 readonly / `auto` 전량 source 보유 / 선택형 전량 options 보유.

**검증 10** — `confidence` · `openIssues` · `lineage` · `oral-unverified` 문자열 0건, `required:null` 0건, `readonly:null` 0건, `options:null` 0건. 조사 단계의 미확정 표기가 운영 template 에 남지 않았다.

### 4-7. operator 조회 — ⚠️ 부분

| 확인된 것 | 근거 |
|---|---|
| 라우트가 실제로 등록됨 | 미등록이면 404. 실제 응답은 401/403 → **가드 체인까지 도달** |
| 가드 2겹이 동작 | 서비스 축에서 `MEMBERSHIP_NOT_FOUND` 로 차단 |
| 응답할 데이터가 정확 | §3 DB 실측 |
| 컨트롤러 타입 정합 | `tsc --noEmit` clean |

| 확인 못 한 것 | 사유 |
|---|---|
| **200 응답 본문 형태** | 프로덕션에 `kpa-branch:operator` 보유 계정 **0명** (`role_assignments` 실측), `branch_memberships` active **0건**, `platform:super_admin` 보유 계정도 없음 (`sohae2100` 은 서비스별 admin 만 보유) |

role 부여는 **DB write + 권한 변경**이라 CLAUDE.md 중지 조건 *"권한 · role · route · API contract 변경 필요"* 에 해당한다. **승인 없이 수행하지 않았다.**

> **해소 방법**: `kpa-branch:operator` role 1건 + 해당 분회 `branch_memberships` active 1건을 승인 하에 부여하면 즉시 200 실측이 가능하다. 어차피 **W2(회원 제출)** 진입 시 필요한 계정이므로 그때 함께 처리하는 것이 자연스럽다.

### 4-8. 권한 차단 — ✅

| 케이스 | 기대 | 실측 |
|---|:---:|---|
| 미인증 | 401 | **401** `{"success":false,"code":"AUTH_REQUIRED"}` |
| 인증 O · kpa-branch 미가입 (`sohae2100`) | 403 | **403** `{"success":false,"code":"MEMBERSHIP_NOT_FOUND"}` |

`sohae2100` 은 `kpa:admin`·`neture:admin` 등 **타 서비스 admin 을 다수 보유**하지만 차단됐다. `KPA_BRANCH_SCOPE_CONFIG.blockedServicePrefixes` 가 `kpa`·`neture`·`glycopharm`·`cosmetics`·`pharmacy-hub` 를 막고 있어 **서비스 간 권한 누수가 없음**이 실증됐다.

### 4-9. 회귀 — ✅

```
200  /health
200  /api/v1/kpa-branch/service-info
200  /api/v1/kpa-branch/branches
200  /api/v1/kpa-branch/branches/namgu
404  /api/v1/kpa-branch/branches/namgu/site      ← 기존 정상 (branch_sites 0행)
200  /api/v1/kpa-branch/branches/namgu/posts
200  /api/v1/kpa-branch/me/access
200  /api/v1/kpa-branch/me/branch
200  /api/v1/auth/status
404  /api/v1/kpa/service-info                     ← 기존 상태 (kpa 라우터에 해당 route 없음)
```

404 2건은 **본 WO 와 무관**함을 각각 확인했다 (전자: `branch_sites` 0행 → 미게시 분회의 정상 응답 / 후자: 코드에 route 부재).

빌드 게이트: `tsc --noEmit` clean · `eslint` clean (신규·수정 5파일).

---

## 5. WO 대비 이탈 1건 — API 경로

WO 예시는 `/api/v1/kpa-branch/operator/annual-report-templates` 였으나 **`/branches/:branchSlug/operator/...` 로 구현**했다.

| 근거 | 내용 |
|---|---|
| WO 요구 | *"기존 branch operator guard 와 tenant boundary 를 재사용한다"* |
| 제약 | 이 모듈에서 tenant boundary 는 `:branchSlug` → `resolveBranch` → `requireBranchScope` 로만 성립한다 |
| 결과 | branchSlug 를 빼면 모듈 내 **유일하게 경계 없는 operator 경로**가 생긴다 |

양식 자체는 `service_key` 축의 서비스 공통 자원이라 분회마다 다르지 않다. branchSlug 는 **"요청자가 그 분회의 운영자인가"를 판정하는 용도**이며 응답 내용은 모든 분회가 동일하다.

> WO 문구 그대로의 경로를 원하면 라우트 1줄 이동으로 전환 가능하다. 단 그 경우 분회 축 가드가 빠진다.

**추가 방어**: 컨트롤러가 `service_key` 를 상수(`SERVICE_KEYS.KPA_BRANCH`)로 고정한다. 클라이언트가 지정할 수 없어 타 서비스 양식 열람이 불가하다 (Boundary Policy Guard Rule 4 — serviceKey 스푸핑 금지).

---

## 6. 부수 발견 (본 WO 에서 고치지 않음)

| # | 내용 | 조치 |
|:---:|---|---|
| F1 | `packages/security-core/dist` 가 **stale** — `src/types.ts` 에는 `'kpa-branch'` 가 있으나 `dist/types.d.ts` 에는 없어 첫 `tsc` 가 오탐 1건 발생 | 패키지 재빌드로 해소. `dist` 는 gitignore 대상이라 커밋 없음. **로컬 환경 상태 문제**이며 코드 결함 아님 |
| F2 | 프로덕션에 `kpa-branch` role 부여 **0건** · `branch_memberships` active **0건** · `branch_sites` **0행** | 분회 서비스가 아직 실사용 전임을 뜻한다. §4-7 의 직접 원인 |

---

## 7. 다음 (W2)

`WO-…-ANNUAL-REPORT-SUBMISSION-V1` — `annual_reports` + 제출/임시저장 API + **schema-driven 렌더러**(렌더러 종류 16종) + `ownership='association'` 서버 강제.

W2 착수 시 반드시 구현·검증할 것:

1. **`ownership='association'` 필드를 제출 payload 에 넣어도 서버가 무시**하는지 실측 (연수교육 평점·회비구분 위조 차단)
2. `annual_reports` 는 Store Ops → **Primary Boundary = `organizationId`**. `(organization_id, year)` 복합 조건 없는 조회 경로 0건
3. `visibleWhen` 으로 숨겨진 필드의 `required` 해제 (`releaseRequiredWhenHidden`) 를 **서버에서도** 동일 적용 — 프런트만 적용하면 제출 불가 상태가 생긴다
4. §4-7 의 operator 계정 확보 (본 CHECK 의 미완 검증 동시 해소)

---

## 8. 문서 정합 (CLAUDE.md §16)

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

선행 IR 2건은 본 CHECK 의 근거 문서로 **유효(ACTIVE)** 하다. IR-2 §0 이 "STEP 03·04 미확정 → W1 착수 보류"로 판정했으나, WO 가 *"화면 미확보를 이유로 더 이상 차단하지 않는다 · 확보 자료로 O4O 2026 V1 운영 기준본을 만든다"* 로 **결정을 갱신**했다. IR 은 그 시점의 조사 기록이므로 소급 수정하지 않는다 (§16-1 — 기록물은 정비 대상 아님).

---

## 9. Git

| 항목 | 값 |
|---|---|
| 코드 commit | `ac476ceee` (6 files, +1364) |
| push | `53208701e..ac476ceee  main -> main` |
| CI Pipeline | `ac476ceee` → **success** |
| CodeQL Security Analysis | `ac476ceee` → **success** |
| 배포 | Deploy API Server (Cloud Run) `ac476ceee` → **success** |
| 본 CHECK + IR 2건 | 후속 커밋 (코드 CI 완주 후 push — 문서 push 가 코드 CI 를 취소하지 않도록) |
