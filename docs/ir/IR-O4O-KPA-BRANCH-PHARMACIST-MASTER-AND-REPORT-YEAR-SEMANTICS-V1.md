# IR-O4O-KPA-BRANCH-PHARMACIST-MASTER-AND-REPORT-YEAR-SEMANTICS-V1

> **종류**: 조사 전용 IR (코드 · DB schema 변경 0건)
> **대상**: KPA 분회 서비스 (`kpa-branch`) — 분회 직접가입 회원의 약사 프로필 정본 / 신고연도 ↔ 원장연도 의미 / 2027 테스트 양식의 production 영향
> **선행**: `PILOT-O4O-KPA-BRANCH-FICTIONAL-BRANCH-FULL-USE-V1` (MISSING_WORKFLOW 2 · 3, UX 1 · 2)
> **작성일**: 2026-09-10
> **결론 요약**: **A = CANONICAL_EXISTS (`kpa_pharmacist_profiles` 재사용 + 분회 축 보강, `kpa_members` 재사용 아님)** / **B = 신고연도(Y) · 회비 참조연도(Y) · 연수교육 참조연도(Y−1) 분리 필요, template 명시 계약 제안** / **C = 실사용 고객 영향 0 · 즉시 조치(draft 전환) 완료 · 2027 row 잔존 위험 1건**

---

## 0. 조사 범위와 방법

| 항목 | 내용 |
|---|---|
| 코드 | `apps/api-server/src/{modules/auth,services/approval,services/kpa-branch,controllers/kpa-branch,routes/kpa,routes/kpa-branch}`, `services/web-kpa-branch/src` |
| 문서 | `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1 §4-1`, `O4O-KPA-OPERATOR-CANONICAL-STATE-V1`, `RBAC-CANONICAL-STATE-V1`, `SeedKpaBranchAnnualReportTemplate2026` 주석, 선행 IR 2건 |
| DB | production read-only (Cloud SQL Auth Proxy · `o4o_api`) — count / 교차 보유율 / 연도 분포만. 개인정보는 집계 또는 마스킹 |
| 변경 | **코드 0 · schema 0**. 데이터 변경은 사용자 지시 "즉시 처리" 1건뿐 — `[테스트] 2027 양식` `active → draft` 를 canonical admin API 로 수행 (§3-3) |

---

## 1. 조사 1 — 분회 직접가입 회원의 약사 프로필 정본

### 1-1. `kpa_members` 의 정체

| 관찰 | 근거 |
|---|---|
| 테이블 주석 "약사회 회원 (auth-core 사용자와 연계)" | `routes/kpa/entities/kpa-member.entity.ts` |
| `user_id` **UNIQUE** → 사용자당 1행 (서비스·분회별 행이 아니다) | `UQ_kpa_members_user_id` (DB 실측) |
| `organization_id` 는 **store-core `organizations`(매장)** 를 가리킨다. `kpa_organizations`(분회) 와 조인되는 행 **0/5** | 엔티티 `@ManyToOne('OrganizationStore')` + DB 실측 (`km.org → organizations 5`, `→ kpa_organizations 0`) |
| `role`(member/operator/admin) · `status`(pending/active/…) = **kpa-society 조직 내 역할·가입 상태** 축 | `O4O-KPA-OPERATOR-CANONICAL-STATE-V1 §"organization role = kpa_members.role"` |
| 생성 경로는 **kpa-society 전용** — 회원가입 시 `data.service ∈ {kpa-society, kpa}` 일 때만 INSERT, 승인 시 `membership.service_key === 'kpa-society'` 일 때만 skeleton upsert | `auth-register.controller.ts createKpaRecords()` (isKpaSociety 가드), `MembershipApprovalService.ts` STEP4 |
| `activity_type` 은 **mirror** 다 — SSOT 는 `kpa_pharmacist_profiles.activity_type` | `auth-account.controller.ts updateProfile()` 주석 "1. SSOT: kpa_pharmacist_profiles / 2. Mirror: kpa_members.activity_type", `O4O-KPA-OPERATOR-CANONICAL-STATE-V1 §profile metadata` |
| production 규모: **7행** (kpa-society 가입자). `kpa-branch` 가입자 2명 중 1명만 보유 (그 1명은 kpa-society 가입 이력이 있는 운영자 계정) | DB 실측 §1-4 |

**판정**: `kpa_members` 는 **kpa-society(커뮤니티) 서비스의 가입 도메인 프로필**이다. "약사 마스터" 도 "분회 회원 원장" 도 아니다. 분회 서비스가 이것을 정본으로 삼으면 (a) 분회 직접가입 회원은 행이 없고, (b) 행을 만들려면 kpa-society 의 `role/status` 의미를 오염시키며, (c) `organization_id` 축(매장)과 분회 축이 충돌한다.

### 1-2. 이미 존재하는 canonical — `kpa_pharmacist_profiles`

| 관찰 | 근거 |
|---|---|
| "qualification(license, activity_type) 을 auth(users) 와 membership(kpa_members) 에서 **분리**" 목적으로 신설. `user_id` UNIQUE, **`service_key` 컬럼 없음 (person 단위)** | `20260227000001-CreateKpaPharmacistProfiles.ts` 헤더 |
| **baseline 이 이미 판정해 두었다**: "자격(Qualification) = `kpa_pharmacist_profiles` … Pharmacy-Hub 는 이 축을 **재사용**하며 전용 자격 테이블·전용 자격 role 을 신설하지 않는다" | `O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1 §4-1` |
| 생성 규칙: **실제 자격 데이터(activityType 또는 licenseNumber)가 있을 때만** write. 빈 skeleton 금지 | 동 §4-1, `auth-register.controller.ts:823` |
| 컬럼: `license_number` · `license_verified` · `activity_type` · `verified_at` · `verified_by` — **면허 검증 상태**까지 가진다 (kpa_members 에는 없음) | 엔티티 |
| **근무처(pharmacy_name/address) · 회비구분(fee_category) 은 없다** — 이 둘은 `kpa_members` 에만 있다 | 엔티티 비교 |
| production 규모: **6행** (kpa_members 와 6행 겹침, license 일치 5/6, activity_type 일치 6/6) | DB 실측 |

### 1-3. `users.businessInfo.licenseNumber` 의 위치

| 관찰 | 근거 |
|---|---|
| **신규 사용자** 회원가입 시 서비스 무관하게 `businessInfo.licenseNumber` 에 저장 | `auth-register.controller.ts:410-415` |
| **기존 사용자**가 다른 서비스에 추가 가입할 때는 `licenseNumber` 를 businessInfo 에 merge **하지 않는다** (businessName 등 사업자 필드만) | 동 파일 :244-280 (licenseNumber 출현 0) |
| kpa-branch 의 어떤 코드도 이 값을 **읽지 않는다** | `grep businessInfo` in `services/kpa-branch`, `controllers/kpa-branch` → 0건 |
| 파일럿 회원(`renagang@gmail.co`)의 면허번호는 **여기에만** 있다 (`kpa_members` 0 · `kpa_pharmacist_profiles` 0 · `businessInfo.licenseNumber` 있음) | DB 실측 (마스킹) |

즉 `POST /kpa-branch/join` → `AuthRegisterController.register(service='kpa-branch')` 는 면허번호를 **레거시 JSON 컬럼에만** 남기고, 플랫폼이 정본으로 선언한 자격 축(`kpa_pharmacist_profiles`)에는 쓰지 않는다. 이것이 파일럿 MISSING_WORKFLOW 2 의 **단일 근원**이다.

### 1-4. production 실측 (read-only · 집계)

```text
service_memberships(kpa-branch, active) = 2  → kpa_members 1 · kpa_pharmacist_profiles 1 · businessInfo.licenseNumber 1
service_memberships(kpa-society, active) = 6 → kpa_members 5 · kpa_pharmacist_profiles 4 · businessInfo.licenseNumber 3
branch_memberships(active) = 2               → kpa_members 1 · profiles 1 · businessInfo 1 · (kpa_members.org == 분회) 0
kpa_members 7 · kpa_pharmacist_profiles 6 · businessInfo.licenseNumber 보유 users 6
```

### 1-5. W3 · W7 · W9 · W13 가 `kpa_members` 를 쓰는 지점과 충돌

| WO | 지점 | 현재 동작 | 충돌 |
|---|---|---|---|
| W3 (`AnnualReportMembershipSyncService`) | `loadMemberLedger()` — `kpa_members` 1행 SELECT; `applySync()` — allowlist 4컬럼 UPDATE (`license_number/activity_type/pharmacy_name/pharmacy_address`), **행이 없으면 만들지 않음** (의도된 정책) | 직접가입 회원 → "sync 불가" | ① 정본 부재 ② `activity_type` 을 mirror 에만 쓰고 SSOT(`kpa_pharmacist_profiles`)는 갱신하지 않는다 → **kpa-society 경로(`updateProfile`)와 반대 방향 drift** |
| W3 prefill (`AnnualReportService.buildPrefill`) | `users LEFT JOIN kpa_members` 4컬럼 | 직접가입 회원 → prefill 공란 → 매년 재타이핑 | 정본 부재 |
| W4 검수 (`diffAgainstLedger`) | `loadMemberLedger()` null → `diffUnavailable` | "비교 불가" 표시 · **반영 버튼은 활성** (UX 2) | 정본 부재 + UX |
| W7 (`BranchMemberConsoleService`) | `LEFT JOIN kpa_members km` → `licenseNumber/activityType/memberFeeCategory`, 검색 `km.license_number ILIKE` | 면허번호 공란, 면허번호 검색 불가 | 정본 부재 |
| W5/W9 (`BranchFeeService`) | `resolveMemberFeeCategory` — 그 해 원장 → `kpa_members.fee_category` fallback; `assessYear` 는 **오직** `kpa_members.fee_category` 에서 읽음 | 직접가입 회원은 일괄 부과 대상에서 회비구분 null → 부과 누락/개별 부과 강제 | **회비구분의 분회 측 정본이 없다** |
| W13 개별 부과 | `createLedger` 에 fee_category 를 운영자가 직접 지정 | 동작함 (파일럿에서 사용) | 없음 — 단 원장 1행에만 남고 회원 속성으로 남지 않음 |

### 1-6. 판정 — A: CANONICAL_EXISTS (+ 분회 축 보강 필요)

세 후보 비교:

| 후보 | 장점 | 결정적 문제 |
|---|---|---|
| ① `kpa_members` 재사용 (분회 승인 시 skeleton 생성) | 코드 변경 최소 (`MembershipApprovalService` 조건 1줄) | kpa-society 의 `role/status/organization_id(매장)` 의미 오염. baseline 이 "자격은 profile 축" 이라 판정한 것과 역행. mirror 를 정본 취급 |
| ② 분회 전용 `branch_member_profiles` 신설 (면허·직역·근무처·회비구분 전부) | 분회 축이 자기 데이터를 소유 | **면허번호가 person 단위 정본과 이중화** — PharmacyHub baseline §4-1 "전용 자격 테이블 신설 금지" 위반. 동일인이 kpa-society 와 분회에 다른 면허번호를 갖게 됨 |
| ③ **`kpa_pharmacist_profiles` = 면허·직역 정본 (person) + 분회 축에 근무처·회비구분** | baseline 과 일치. PharmacyHub 와 같은 재사용 패턴. 검증 상태(`license_verified`) 도 얻는다 | 분회 축 컬럼(근무처·회비구분)은 어디에 둘지 결정 필요 (아래) |

**권고 = ③.** 층위는 다음과 같다.

```text
Identity        users                                   (변경 없음)
서비스 가입     service_memberships(kpa-branch)         (변경 없음)
자격 (person)   kpa_pharmacist_profiles                 ← 면허번호 · 직역(activity_type) · 검증상태  [canonical, 재사용]
분회 소속 (org) branch_memberships                      ← 상태 · 가입/전출일 (기존)
분회 회원속성   [결정 필요] 근무처(pharmacy_name/address) · 회비구분(fee_category)
kpa-society 축  kpa_members                             ← 분회는 읽기 fallback 만. 쓰지 않는다
```

**분회 회원속성의 위치 — 2안 (사용자 결정 사항)**:

- **③-a `branch_memberships` 에 컬럼 추가** (`pharmacy_name`, `pharmacy_address`, `fee_category`) — 분회 소속 1행 = 회원속성 1행. 테이블 신설 없음. 전출 후 재가입 시 새 행에 다시 채움 (이력 자연 분리). **권장.**
- **③-b `branch_member_profiles` 1:1 신설** — 소속과 속성 분리. 필드가 더 늘어날 때 유리하나 지금은 3컬럼뿐.

**읽기 우선순위 (모든 WO 공통, 한 함수로 고정)**:

```text
면허번호  : kpa_pharmacist_profiles.license_number → kpa_members.license_number → users.businessInfo.licenseNumber (읽기 전용 legacy)
직역      : kpa_pharmacist_profiles.activity_type  → kpa_members.activity_type
근무처    : branch 회원속성 → kpa_members.pharmacy_name/address
회비구분  : 그 해 branch_fee_ledgers → branch 회원속성 fee_category → kpa_members.fee_category
```

**쓰기 경계 (W3 sync 재정의)**:

```text
license_number / activity_type → kpa_pharmacist_profiles  (UPSERT — 실제 값이 있을 때만. baseline 규칙 유지)
pharmacy_name / pharmacy_address → branch 회원속성
fee_category                     → branch 회원속성 (운영자 지정) — 신고서는 회비구분을 만들지 않는다 (W5 원칙 유지)
kpa_members                      → 분회 서비스는 쓰지 않는다 (현 W3 의 mirror write 제거)
```

**가입 경로 보강**: `POST /kpa-branch/join` 이 `licenseNumber/activityType` 을 받으면 `kpa_pharmacist_profiles` 를 생성해야 한다. 현재 생성 코드는 `createKpaRecords()`(kpa-society 전용) 안에 있어 **auth-core(`modules/auth`) 수정**이 필요하다 → F10 O4O Core Freeze 대상. **중지 조건**: 구현 WO 는 Core 변경 승인을 명시해야 한다. 대안(Core 무변경): 분회 승인 시(`BranchServiceMembershipController.approve`, Extension 층) `users.businessInfo.licenseNumber` 를 읽어 `kpa_pharmacist_profiles` 로 승격 — Core 를 건드리지 않지만 PharmacyHub 와 경로가 갈린다. IR 은 **Core 수정(단일 경로)** 을 권고하되 결정은 사용자에게 둔다.

**웹 가입 화면 부재**: `services/web-kpa-branch` 에 `/join` 라우트·페이지가 **없다** (`App.tsx` 에 `/login`, `/me` 만). 현재 분회 회원 가입은 API 전용이다. 프로필 정본을 정해도 **입력 화면이 없으면 면허번호는 계속 비게 된다** — 후속 WO 범위에 포함해야 한다.

---

## 2. 조사 2 — 신고연도 vs 회비 · 연수교육 참조연도

### 2-1. 현재 연도가 쓰이는 곳 전수

| # | 위치 | 연도 값 | 의미 |
|---|---|---|---|
| Y1 | `annual_report_templates.year` | 2026 / 2027 | **신고년도** (공문 "2026년도 회원신고") |
| Y2 | `annual_reports.year` | = template.year | 신고서의 연도 (UNIQUE user_id+year) |
| Y3 | `MemberAnnualReportController` → `resolveAssociationValues(t, {year: template.year})` (3곳) | = Y1 | 회비 · 면제 · 연수교육 3필드를 **모두 신고년도로** 원장 조회 |
| Y4 | `training.creditYear` 필드 (`readonly_display`, label "연수교육 이수 연도") | `education.year` = Y3 | 화면 표시 연도 — 조회에 쓴 연도를 그대로 되돌려줌 |
| Y5 | `BranchFeeController.defaultYear()` · `BranchEducationCreditController` · `BranchMemberController` (콘솔) | `new Date().getFullYear()` | 운영자 화면 기본 연도 = **달력 연도** |
| Y6 | 프론트 `MembersConsolePage/FeeLedgerPage/EducationCreditsPage/OfficersPage` `thisYear` | `new Date().getFullYear()` | 동상 |
| Y7 | W7 콘솔 조인 `ar.year = $2 AND fl.year = $2 AND el.year = $2` | 단일 연도 | **신고서 · 회비 · 교육을 같은 연도로 조인** |
| Y8 | `POST /admin/annual-report-templates {sourceYear}` | 임의 | **schema 복제 원본 연도** — 원장 참조연도가 아니다 (이름 충돌 주의) |

세 가지 서로 다른 연도 개념이 **단일 정수**로 뭉쳐 있다:

```text
신고연도(report year)      — 양식·신고서의 정체성
참조연도(reference year)   — 회비/연수교육 원장을 읽을 연도 (도메인별로 다를 수 있음)
업무연도(business year)    — 운영자 콘솔·원장 화면의 기본 연도 (달력)
```

### 2-2. 도메인 규칙 (판단 근거)

- 신고 접수기간은 **연초** (2026: 01-01 ~ 02-28, 대약 제2025-1252호). 2026년 1~2월에는 **2026년 연수교육 이수 실적이 존재할 수 없다.** 따라서 "연수교육 이수 평점" 은 논리적으로 **전년도(Y−1) 실적**이다. 2026 seed 라벨 "연수교육 이수 연도" 가 별도 필드로 존재하는 것 자체가 신고년도와 다를 수 있음을 전제한다.
- 회비구분(갑/을/병/정) 은 **그 해 회비 부과의 기준**이다 → 참조연도 = 신고연도(Y). 단, 신고 시점(연초) 에는 Y년 원장이 아직 부과 전일 수 있으므로 fallback 이 필요하다 (§1-6 우선순위: Y 원장 → 회원속성 fee_category). Y−1 원장을 자동 참조하는 것은 **직역 변경을 숨기므로 권장하지 않는다.**
- 면제 구분(W9) 은 회비 원장에 붙은 값이므로 회비와 같은 연도.

> 이 규칙은 코드·문서 어디에도 확정돼 있지 않다 (선행 IR 2건 · W5/W6 CHECK 에 연도 매핑 언급 0건 — 전부 "같은 연도" 를 암묵 가정). **대한약사회 실무 확인 전까지는 가정**이며, 그래서 아래 계약은 규칙을 코드에 박지 않고 **template 데이터에 명시**하는 형태를 택한다.

### 2-3. 파일럿 실측으로 본 결과

| 상황 | 현재 코드 | 규칙 적용 시 |
|---|---|---|
| 2027 신고서 · 회원은 2026 회비 완납 · 2026 교육 8/8 | 2027 회비 원장 없음 → `-`, 2027 교육 원장 없음 → `-` (3필드 not_linked) | 회비: 2027 원장 없음 → 회원속성 fee_category → 갑/을/병/정 표시 가능. 교육: **2026 원장 8/8 표시** |
| 콘솔 기본연도 2026 vs 활성 양식 2027 | 콘솔 신고서 열 공란 (`ar.year = 2026` 조인) | 콘솔은 업무연도 2026 의 회비·교육을 보이고, 신고서 열은 "참조연도가 2026 인 양식(=2027 신고)" 을 조인 |

### 2-4. 최소 계약 제안 — `referenceYears` (template 명시값)

`sourceYear` 는 이미 "복제 원본" 을 뜻하므로 **재사용하지 않는다.** offset 만 저장하면 실제 값이 파생값이 되어 감사가 어렵고, 규칙만 저장하면 예외(공문 지연 등)를 못 담는다 → **명시 정수 + 생성 시 기본 규칙** 의 2단.

```jsonc
// annual_report_templates 에 컬럼 1개 추가 (jsonb) — schema 본문과 분리 (HTTP 편집 대상)
"reference_years": { "fee": 2026, "training": 2025 }
```

| 요소 | 규칙 |
|---|---|
| 저장 | `annual_report_templates.reference_years jsonb NOT NULL DEFAULT '{}'` — 키 없음 = 신고연도와 동일 (하위 호환: 2026 seed 는 `{}` 로 두어도 현재와 동일 동작, 다만 **backfill 로 `{fee:2026, training:2025}` 를 넣는 것을 권고**) |
| 생성 기본 규칙 | `POST /admin/annual-report-templates` 가 `referenceYears` 미지정 시 `{ fee: year, training: year - 1 }` 을 채운다. 명시값이 오면 그대로 (검증: `year-2 ≤ v ≤ year`) |
| 수정 | `PATCH` 에 `referenceYears` 허용 — **단 `status='active'` 이고 제출된 신고서가 1건이라도 있으면 거부** (제출본의 association 값과 원장 연도가 어긋나는 것을 막는다) |
| 소비 | `resolveAssociationValues(t, ctx)` 의 `fee.*` 는 `t.reference_years.fee ?? t.year`, `training.*` 는 `t.reference_years.training ?? t.year`. `report.year` 는 계속 `t.year` |
| 표시 | `training.creditYear` 는 이미 `education.year` 를 되돌려주므로 자동으로 Y−1 이 표시된다. 회원 화면 회비 섹션에 "○○○○년도 회비 기준" 문구 1줄 추가 권고 |
| 콘솔 | `year` 파라미터 의미를 **업무연도(원장 연도)** 로 고정하고, 신고서 열은 `annual_report_templates.reference_years->>'fee' = $2` 인 template 의 신고서를 조인 (없으면 `ar.year = $2` fallback). 응답에 `reportYear` 를 분리해 내려준다 |
| 응답 계약 | 회원 `GET /me/annual-report` 응답 `template` 에 `referenceYears` 추가 (additive) |

**대안 (거부 사유 포함)**: `sourceYearOffset:int` 단일 컬럼 — 회비와 교육이 같은 offset 을 갖지 않으므로 부족. `sourceYearRule:'same'|'previous'` — 도메인별 2개 필요 + 예외 불가. 코드 상수 `TRAINING_YEAR_OFFSET=-1` — 공문 변경 시 배포 필요, 감사 불가.

**변경 범위 (구현 WO 견적)**: migration 1 (컬럼 + 2026 backfill), `AnnualReportTemplateController` 생성/수정 2곳, `AnnualReportService.resolveAssociationValues` 3 case, `BranchMemberConsoleService` 조인 1곳 + 응답 필드, 프론트 표시 문구 2곳. **기존 8필드 계약 · 제출 payload 계약 불변.**

---

## 3. 조사 3 — `[테스트] 2027 양식` 의 production 영향

### 3-1. 노출 범위 (코드)

- `AnnualReportService.getCurrentTemplate()` 은 `service_key='kpa-branch' AND status='active'` 만 보고 **organization 조건이 없다.** 기간 `open` 인 것을 우선, 없으면 최신 연도. → 활성 상태였던 2026-09-09 ~ 2026-09-10 12:55Z 사이 **모든 분회(210)의 kpa-branch 회원**에게 2027 테스트 양식이 "현재 신고" 로 보였다.
- 운영자 검수 목록은 `organization_id` 로 격리되므로 타 분회 운영자에게 파일럿 신고서는 보이지 않았다.

### 3-2. 실제 피해 (DB 실측)

```text
annual_reports 전체        = 1행 (o4o-pilot / 2027 / approved)   ← 파일럿 자신뿐
2027 양식에 묶인 신고서    = 1 (동일)
kpa-branch service_memberships = 2 (운영자 · 파일럿 회원)          ← 실사용 고객 0
```

**실사용 고객 영향 = 0.** 노출은 있었으나 볼 수 있는 실제 회원이 없었다.

### 3-3. 즉시 조치 (수행 완료 · canonical API)

```text
PATCH /api/v1/kpa-branch/admin/annual-report-templates/21a8b6e5-a204-4c40-9b23-51bae05d0bbe  {"status":"draft"}
→ 200. 이후 목록: 2027 draft / 2026 active(기간 종료)
```

- `archived` 가 아니라 **`draft`** 로 둔 이유: `UNIQUE(service_key, year, version)` 때문에 2027 row 를 재사용해야 한다 (§3-4). draft 는 `getCurrentTemplate()` 대상이 아니므로 노출 효과는 동일하다.
- 파일럿 승인본은 `template_id` 로 양식을 읽으므로 (`getTemplateById`) 상태 전환 후에도 열람 가능하다. 삭제하지 않았다.
- 실행 수단: SQL 이 아니라 admin API (super_admin 세션). 사용자 지시 "즉시 처리" 에 따른 데이터 변경 1건이며 schema 변경은 없다.

### 3-4. 잔존 위험 — 2027 row 점유

| 위험 | 내용 | 대응안 |
|---|---|---|
| R1 | `(kpa-branch, 2027, 1)` 을 테스트 row 가 점유. 2027 실제 양식을 만들 때 `POST {year:2027}` 이 UNIQUE 충돌 (컨트롤러가 version 을 올려주는지 미확인 — 코드상 `version` 입력 없음) | 실제 2027 양식 개설 전에 (a) 테스트 row 의 `title/period` 를 실제 값으로 **덮어 재사용** (PATCH 가능) 하거나 (b) WO 로 row 삭제(승인 필요 · 파일럿 신고서 FK 정리 동반). **(a) 권장** — 파일럿 신고서는 2027 신고서로 남는다 |
| R2 | 재테스트 시 다시 `active` 로 올리면 같은 서비스 전역 노출이 재발 | 구현 WO 에 **분회 한정 테스트 수단** 포함 — 예: template 에 `pilot_organization_ids uuid[]` (있으면 그 분회에만 current 로 노출). 또는 파일럿 전용 `service_key` 분리는 과하다 |
| R3 | 2026 양식 `updated_at = 2026-09-10 04:25Z` — 오늘 변경 흔적. 2027 양식 생성(POST)은 원본 row 를 건드리지 않으므로(`AnnualReportTemplateController` create 는 `source.schema` 복제만) 원인은 별도 PATCH 다. **원인 미확인** (본 세션 파일럿 기록은 압축되어 확인 불가) | 상태·기간은 seed 값 그대로(active · 01-01~02-28)라 영향 없음. 기록만 한다 |

---

## 4. 파일럿 UX 2건의 구조 연결 (구현 WO 에 함께 넣을 것)

| UX | 원인 | 구조 수정과의 관계 |
|---|---|---|
| 검수 상세에 raw code (`male`, `pharmacy_owner`, `separated`, `work`) | `AnnualReportsReviewPage` 가 제출 snapshot 값을 그대로 렌더 — template `options[].label` 매핑 미적용 | 정본 diff(§1-6) 를 다시 그리는 김에 **template 기준 label 변환기** 를 한 곳에 두고 목록·상세·diff 가 공유 |
| 반영 버튼이 `diffUnavailable` 에서도 활성 | 프론트 disable 조건 없음 (백엔드는 "sync 불가" 로 거부하므로 안전) | 정본이 생기면 `diffUnavailable` 자체가 줄어들지만, "행 없음" 이 아니라 "값 없음" 인 경우는 남는다 → 버튼은 `changes.length === 0 || diffUnavailable` 이면 disable + 사유 툴팁 |

---

## 5. 최종 보고 (요청 7항목)

| # | 항목 | 결과 |
|---|---|---|
| 1 | `kpa_members` 의 의미 | kpa-society(커뮤니티) 가입 도메인 프로필. user_id UNIQUE, org 축은 **매장**(store-core). kpa-society 경로에서만 생성. `activity_type` 은 mirror |
| 2 | 분회 직접가입 회원의 정본 판정 | **CANONICAL_EXISTS** — 면허·직역 = `kpa_pharmacist_profiles` (baseline §4-1 재사용 규칙), 근무처·회비구분 = 분회 축(`branch_memberships` 컬럼 추가 권장). `kpa_members` 는 읽기 fallback 만, **쓰기 금지**. `businessInfo.licenseNumber` 는 legacy 읽기 fallback |
| 3 | W3/W7/W9 충돌 | W3 sync 가 SSOT 아닌 mirror 에 쓰고 있음(drift) · W7 콘솔/검색 면허번호 공란 · W5 일괄부과가 `kpa_members.fee_category` 단독 의존. 전부 §1-6 우선순위 함수 1개로 수렴 가능 |
| 4 | 연도 의미 | 신고연도(Y) / 회비 참조연도(Y) / 연수교육 참조연도(**Y−1**, 접수기간이 연초라 당해 실적 불가) / 업무연도(콘솔 달력연도) 4개가 정수 1개에 뭉쳐 있음. 규칙은 어디에도 미확정 → 도메인 가정으로 명시 |
| 5 | 최소 계약 | `annual_report_templates.reference_years jsonb {fee, training}` + 생성 기본 규칙 `{fee:Y, training:Y−1}` + 제출본 존재 시 변경 금지 + `resolveAssociationValues` 3 case 분기 + 콘솔 `year`=업무연도 고정. `sourceYear` 는 복제원본 의미라 **재사용 불가** |
| 6 | 2027 테스트 양식 영향 | 서비스 전역 노출 있었음(코드상 org 무관), **실사용 고객 영향 0** (annual_reports 1행=파일럿, kpa-branch 회원 2). `draft` 전환 완료(API). 잔존: 2027 row 점유(R1) · 재테스트 전역 노출(R2) |
| 7 | 후속 WO 제안 | 아래 §6 |

## 6. 후속 WO (우선순위 = 사용자 지시)

1. **`WO-O4O-KPA-BRANCH-PHARMACIST-PROFILE-CANONICAL-ADOPTION-V1`** (1순위) — §1-6 ③-a. 읽기 우선순위 함수 · W3 sync 쓰기 경계 재정의(profiles UPSERT, kpa_members write 제거) · W7 콘솔/검색 · W5 assessYear fallback · 검수 label 변환기(UX1) · 반영 disable(UX2) · **분회 가입 화면(`/join`) 신설** · `POST /kpa-branch/join` 의 profiles 생성. **중지 조건 명시 필요**: auth-core(`createKpaRecords` 밖으로 profile 생성 이동) = F10 Core 변경, `branch_memberships` 컬럼 추가 = migration. 사용자 결정 2건: ③-a vs ③-b · Core 수정 vs Extension 승격.
2. **`WO-O4O-KPA-BRANCH-REPORT-REFERENCE-YEARS-V1`** (2순위) — §2-4. migration 1 + 2026 backfill `{fee:2026, training:2025}` + 컨트롤러/서비스/콘솔 + 분회 한정 파일럿 노출(R2) + 2027 row 재사용 절차(R1). 사용자 확인 1건: 연수교육 Y−1 규칙(대한약사회 실무).
3. **`WO-O4O-KPA-ADMIN-BRANCH-CREATE-API-V1`** (3순위) — `POST /api/v1/admin/kpa-branches` (super_admin). 별도 IR 불필요 (파일럿 SQL 1건이 계약 그대로).
4. UX 개선 배치 (나머지 4건) — 별도.

## 7. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 —
`docs/checks/CHECK-O4O-KPA-BRANCH-TENANT-ONBOARDING-AND-MVP-PRODUCTION-E2E-V1.md` 가 존재하지 않는 경로 `POST /kpa-branch/admin/branches/{slug}/members` 를 온보딩 레시피로 적고 있다 (실제 = super_admin bypass 로 `operator/members`). 기록물(`docs/checks/`)이라 인라인 수정 대상이 아니며, 3순위 WO(분회 생성 API) CHECK 에서 정정 레시피를 다시 쓰는 것을 제안한다.

---

*조사 전용 — 코드 · schema 변경 없음. 데이터 변경 1건(2027 양식 draft 전환, 사용자 지시, canonical API).*
