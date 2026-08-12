# IR-O4O-PHARMACIST-BRANCH-SERVICE-RECOVERY-AND-REUSE-AUDIT-V1

약사회 **분회 단독 서비스** 신규 개발 전, 현재 `o4o-platform` 에 남아 있는 KPA/Yaksa 관련
코드·문서·DB 모델을 전수 감사한 결과다.

- **판정: `PASS` (조사 전용)**
- 작성일: 2026-08-12
- 기준 HEAD: `6ad94a498` · `origin/main` 동일
- 성격: **READ-ONLY 감사.** 코드 수정 0 · DB write 0 · migration 0 · commit 0
- DB 접근: `cloud-sql-proxy` (127.0.0.1:5442) → `o4o_platform`, 사용자 `o4o_api`, **`SELECT` 만 수행**

---

## 0. 한 줄 결론

**"과거 구현을 복원한다"는 전제는 성립하지 않는다.** 약사회 도메인 4개 패키지
(`membership-yaksa` · `annualfee-yaksa` · `lms-yaksa` · `reporting-yaksa`)는 소스가 전량 삭제됐고,
**프로덕션에 대응 테이블이 한 번도 만들어진 적이 없다.** 조직도·행사·단식부기는 애초에 **API 없는
frontend mock** 이었다.

반대로 **예상보다 훨씬 강한 자산 2개**가 살아 있다.

1. **`kpa_organizations` 228행** — 본회 1 / 지부 18 / 분회 **209** 가 이미 seed 되어 있다. 분회 마스터를
   새로 만들 필요가 없다. (단 런타임 소비처 0 — 데이터만 있고 코드가 없다)
2. **`kpa_members.fee_category`** — 직역별 회비 분류 A1/A2/B1/B2/C1/C2/D 가 **살아 있는 API 로 저장·조회된다.**

따라서 판정의 큰 그림은 `REUSE(인증·조직·포럼) + REFERENCE(과거 설계) + NEW(업무 원장 5종)` 이다.

---

## 1. 사실 확인 — 사전 예상과 달랐던 3가지

요청서의 사전 예상 중 **3건이 실측과 달랐다.** 이후 판정은 실측 기준이다.

| # | 사전 예상 | 실측 | 근거 |
|---|---|---|---|
| 1 | `AnnualReportFormPage` 가 살아 있어 "직접 감사 가치가 높다" | **파일은 있으나 dead** — route 0 · API 0 · `handleSubmit` 은 toast 만 | [AnnualReportFormPage.tsx](services/web-kpa-society/src/pages/mypage/AnnualReportFormPage.tsx), 외부 참조 0건 |
| 2 | `organization-lms` 가 "README/manifest/backend/lifecycle 까지 살아 있어 재사용 여지" | **빈 스캐폴드** — entities 0 · controllers 0 · `ownsTables: []` · backend 는 `export {}` · route 는 `/health` 뿐 | [organization-lms/src/backend/index.ts](packages/organization-lms/src/backend/index.ts), [manifest.ts](packages/organization-lms/src/manifest.ts) |
| 3 | `membership-yaksa` 등은 "제거 기록·임시 SQL·감사 문서 쪽 흔적" | 흔적이 아니라 **git 미추적 `dist/` 빌드 잔재가 디스크에 실재** (`member-yaksa`·`reporting-yaksa`·`yaksa-accounting`·`yaksa-admin`·`forum-yaksa` 5개) | `git ls-files` 0건 / 파일시스템엔 존재 |

> **함정 기록:** `packages/` 를 `ls` 하면 위 5개가 정상 패키지처럼 보인다. **git 추적 파일은 0건**이며
> 선행 WO 가 `H4` 로 기록한 로컬 잔재다 ([선행 CHECK](docs/checks/WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1-CHECK.md)).
> **패키지 존재 여부를 `ls` 로 판단하면 안 된다.**

---

## 2. 삭제 이력 전수 (요청서 "반드시 확인할 삭제 이력")

| 대상 | 삭제 commit | 성격 |
|---|---|---|
| `membership-yaksa` · `annualfee-yaksa` · `lms-yaksa` · `yaksa-scheduler` | `ab5570573` (2026-08-05, 276 files / −56,948) | 레거시 약사회 전용 전면 제거 |
| `reporting-yaksa` | `2d5be046b` (−7,190) | dead 패키지 17개 일괄 제거 |
| `forum-yaksa` | `1b7177036` | dead 패키지 + route 제거 |
| `member-yaksa` · `yaksa-accounting` | `3c50db232` | dead code cleanup Phase1 |
| `yaksa-admin` | `19622ca7c` | dead code cleanup Phase1 Step2 |
| `PersonalStatusReportPage` | `bfa0a3d7f` | "작동 불가 신상신고 UI·죽은 프런트엔드 API 계약 제거" |
| `OfficerScheduleSection` · `EventManagementSection` · `RoleBasedAccountingSection` · `OrganizationChartSection` | `4d53c6c2c` (생성은 `b3241d4a0`) | KPA-society dead code 22건 |
| admin `committee-requests` · `stewards` · `annual-report` · `fee` · `officers` route | `WO-O4O-KPA-ADMIN-ORG-MANAGEMENT-DEADCODE-REMOVE-V1` | [AdminRoutes.tsx](services/web-kpa-society/src/routes/AdminRoutes.tsx) 상단 주석에 기록 |

**핵심:** 조직도/임원일정/행사/회계 4개 컴포넌트는 `b3241d4a0` 한 커밋에서 태어나 `4d53c6c2c` 에서 제거됐다.
**4개 모두 `fetch`/`apiClient`/`useQuery` 호출 0건** — 백엔드·entity·API 가 존재한 적 없는 **화면 mock** 이다.
"과거에 구현됐다"는 인식은 **UI 시안 수준**으로 조정해야 한다.

---

## 3. 프로덕션 DB 실측 (read-only)

### 3-1. 재사용 후보 — 실재하고 데이터가 있다

| 테이블 | 행수 | 의미 |
|---|---:|---|
| `kpa_organizations` | **228** | 본회 1 / **지부 18** / **분회 209** — `20260212100000-SeedKpaOrganizationsFullHierarchy` seed |
| `users` | 45 | Identity |
| `role_assignments` | 43 | RBAC SSOT (F9) |
| `service_memberships` | 21 | 서비스 가입·승인 SSOT |
| `organizations` | 22 | association 1 / division 1 / pharmacy 11 / store 2 / supplier 7 (전부 level 0, parentId NULL) |
| `organization_members` | 16 | **role 전량 `owner`** (14 active) — 매장 소유권용, 회원 소속용이 아님 |
| `kpa_members` | 6 | 약사회 회원 도메인 |
| `kpa_pharmacist_profiles` | 6 | 면허 자격 |
| `lms_courses` / `lms_enrollments` | 7 / 8 | 공용 LMS |
| `forum_post` | 4 | 공용 포럼 |
| `kpa_approval_requests` | 1 | 승인형 신청 인박스 |

### 3-2. 존재하지 않는 것 — 신규 개발이 불가피한 영역

| 없는 테이블 | 의미 |
|---|---|
| `yaksa_annual_reports` · `yaksa_report_field_templates` · `yaksa_report_assignments` · `yaksa_report_logs` | **신상신고 도메인 전체 부재** |
| `yaksa_fee_policies` · `yaksa_fee_invoices` · `yaksa_fee_payments` · `yaksa_fee_exemptions` · `yaksa_fee_settlements` | **회비 원장 전체 부재** |
| `lms_yaksa_credit_records` | **연수교육 평점 원장 부재** |
| `scheduled_jobs` · `job_execution_logs` | scheduler 미활성화 |
| 회의·일정·자료·행사·단식부기 관련 | 전무 |

### 3-3. 껍데기만 남은 것

| 테이블 | 행수 | 상태 |
|---|---:|---|
| `yaksa_members` · `yaksa_member_affiliations` · `yaksa_membership_years` 등 7종 | **0** | 코드 소비처 0 — 선행 WO `H5` 로 DROP 판단 보류 |
| `yaksa_categories` | 5 | seed 후 무변경 |
| `kpa_stewards` | **0** | `scope_type`/`scope_id` 보유한 담당자 모델 스텁, 런타임 소비처 0 |
| `lms_certificates` · `lms_attendance` · `lms_events` | **0** | 스키마만 존재, 미사용 |

### 3-4. 결정적 제약 2건

1. **`kpa_organizations` 런타임 소비처 = 0.** 228행 전부 **migration 에서만** 참조된다.
   TypeORM entity 조차 없다. → **데이터는 자산, 코드는 신규.**
2. **`lms_courses.credits` 는 전부 `0`, `organizationId` 는 전부 `NULL`.** 평점 컬럼은 있으나
   **한 번도 사용된 적이 없다.**

---

## 4. 기능별 판정표

| 기능 | 현재 코드 위치 | 사용 여부 | DB/entity/API/UI | 과거 구현 | 판정 | 이유 |
|---|---|---|---|---|:---:|---|
| **인증 / Identity** | `users`, [auth-core](packages/auth-core/) | 운영 중 | 전부 O | — | **REUSE** | F10 Core Freeze. 손대지 않는다 |
| **서비스 가입·승인** | [ServiceMembership.ts](apps/api-server/src/modules/auth/entities/ServiceMembership.ts) | 운영 중 (21행) | 전부 O | — | **REUSE** | `pending/active/suspended/rejected/withdrawn` 5상태가 분회 가입 승인에 그대로 맞는다 |
| **RBAC** | `role_assignments` (43행) | 운영 중 | 전부 O | — | **REUSE** | F9 SSOT. 역할 신설은 catalog 등록으로 처리 |
| **분회 tenant** | `kpa_organizations` (228행) | **데이터만** | DB O / entity ✗ / API ✗ / UI ✗ | — | **ADAPT** | 분회 209 seed 재사용. entity·API 는 신규. **계층 미사용, `type='group'` 평면 조회** |
| **조직 Core** | [organization-core](packages/organization-core/) | 운영 중 (api-server 소비) | 전부 O | — | **ADAPT** | `Organization.type` 이 `'division'\|'branch'` 로 **계층 전제** — 새 서비스 원칙과 충돌 (§7-3) |
| **회원 기본정보** | [kpa-member.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts) | 운영 중 (6행) | 전부 O | `membership-yaksa/Member` (삭제) | **ADAPT** | `organization_id`·`activity_type`·`fee_category`·`membership_type` 이 이미 분회 업무 축과 일치 |
| **면허 자격** | `kpa_pharmacist_profiles` | 운영 중 (6행) | 전부 O | `LicenseVerificationRequest` (삭제) | **REUSE** | `license_verified`/`verified_by`/`verified_at` 로 충분 |
| **회원 소속 이력 (전입·전출)** | `organization_members` | **부적합** | DB O | `Affiliation`·`AffiliationChangeLog` (삭제) | **NEW** | `UQ_org_member_org_user` **unique(org,user)** 때문에 전출→재전입 이력 누적 불가. `left_at` 1칸뿐 (§7-2) |
| **신상신고 양식(필드)** | [AnnualReportFormPage.tsx](services/web-kpa-society/src/pages/mypage/AnnualReportFormPage.tsx) | **dead** | UI 만 O | — | **REFERENCE** | 대한약사회 공식 양식 7개 절 전량 보유. **최고가치 참고자료** |
| **신상신고 저장 구조** | 없음 | — | 전무 | `AnnualReport`+`ReportFieldTemplate`+`ReportAssignment`+`ReportLog` (삭제) | **NEW (설계는 REFERENCE)** | 과거 설계가 요청서 가설과 **거의 동일** (§5-1) |
| **회비 분류(직역)** | `kpa_members.fee_category` + [member.controller.ts](apps/api-server/src/routes/kpa/controllers/member.controller.ts) | **운영 중** | 전부 O | — | **REUSE** | A1/A2/B1/B2/C1/C2/D 검증·저장·조회 모두 살아 있음 |
| **회비 부과·납부 원장** | 없음 | — | 전무 | `annualfee-yaksa` 6 entity (삭제) | **NEW 소형** | 과거는 본회비/지부비/분회비 3계층 배분 + 상납정산 + PG — **과잉** (§7-1) |
| **연수교육 평점 원장** | 없음 | — | 전무 | `lms-yaksa/CreditRecord` (삭제) | **NEW (설계는 REFERENCE)** | 과거 `CreditRecord` 가 요청서 요구와 거의 일치 (§5-2) |
| **자체 연수교육** | `lms_courses`/`lms_enrollments`/`lms_certificates`/`lms_attendance` | 부분 운영 | 전부 O (certificates·attendance 0행) | `YaksaCourseAssignment` (삭제) | **ADAPT** | 신청·수강·이수 흐름 재사용. `credits`·`organizationId` 는 **미사용 상태로 존재** |
| **조직-LMS 연동** | [organization-lms](packages/organization-lms/) | **미사용** | 전무 | — | **DROP** | 빈 스캐폴드. README 의 "구현 완료 ✅" 는 문서 drift (§9) |
| **공지 게시판** | [ForumPost.ts](packages/forum-core/src/backend/entities/ForumPost.ts) | 운영 중 (4행) | 전부 O | `forum-yaksa` (삭제) | **REUSE** | `PostType.ANNOUNCEMENT` + `organizationId` + `isOrganizationExclusive` + `isPinned` 로 분회 공지 성립 |
| **회원지원 게시판** | 동상 + `forum_category_requests` | 운영 중 | 전부 O | — | **REUSE** | `PostStatus.PENDING/REJECTED` 로 운영자 답변·승인 흐름 성립 |
| **신청 인박스** | `kpa_approval_requests` + `MyRequestsInbox`(`@o4o/account-ui`) | 운영 중 | 전부 O | — | **REUSE** | 가입·강좌·포럼 승인 요청 통합 인박스가 이미 공통 컴포넌트 |
| **첨부 자료** | — | — | `forum_post` 에 첨부 컬럼 **없음** | — | **NEW (소형)** | 본문이 `content jsonb Block[]` — 파일 첨부 경로 별도 확인 필요 |
| **행사** | 없음 | — | 전무 | `EventManagementSection` (mock, 삭제) + `OrganizationEvent` 타입 생존 | **NEW 소형** | 과거는 API 0. `lms_events`/`store_events` 는 타 도메인 |
| **임원/위원회** | [types/organization.ts](services/web-kpa-society/src/types/organization.ts) | **타입만 생존** | 타입 O / 나머지 ✗ | `OrganizationChartSection` (mock, 삭제) | **REFERENCE + NEW** | 450줄 설계 스펙이 현재 트리에 남아 있다 (§5-3) |
| **담당자(간사)** | `kpa_stewards` (0행) | 미사용 | DB O / 코드 ✗ | — | **REFERENCE** | `scope_type`/`scope_id` 범위 위임 모델은 Workspace 권한 설계에 참고 |
| **회의·일정·자료** | 없음 | — | 전무 | `ScheduleItem` 타입만 | **NEW** | 그룹웨어 대체 아님 — 최소 레코드만 |
| **단식부기** | 없음 | — | 전무 | `RoleBasedAccountingSection` (mock, 삭제) + `AccountingCategory`/`AccountingAccess` 타입 생존 | **NEW 소형** | 직위별 회계 접근 매트릭스는 참고가치 있음 |
| **KPA Society 커뮤니티** | [web-kpa-society](services/web-kpa-society/) | 운영 중 | 전부 O | — | **DROP (새 서비스에 미포함)** | 요청서 원칙대로 새 서비스에 커뮤니티를 만들지 않는다 |
| **scheduler** | 공용 `src/jobs/*.job.ts` | 운영 중 | O | `yaksa-scheduler` (삭제) | **REUSE (공용만)** | 약사회 전용 Job 10건은 전량 제거됨. 재도입 금지 |

---

## 5. 과거 설계 중 실제로 값어치 있는 3건

과거 **코드**는 복원 대상이 아니지만, 아래 3건은 **설계 명세로서 신규 개발을 크게 단축한다.**

### 5-1. 신상신고 — `reporting-yaksa` (`2d5be046b^` 에서 확인)

요청서가 제안한 `고정 Member + 연도별 ReportTemplate + 회원별 AnnualReport` 는 **과거 설계와 사실상 동일**하다.

```
ReportFieldTemplate   @Index(['year'], unique)   fields: jsonb ReportFieldDefinition[]
                      deadline, active
  └ ReportFieldDefinition:
      key, label, type(text|number|date|select|multiselect|address|license|
                       organization|textarea|phone|email),
      required, readonly, source, options, validation,
      syncToMembership, syncTarget, hint, group, order

AnnualReport          @Index(['memberId','year'], unique)
                      templateId, status, fields: jsonb,
                      submittedAt/approvedAt/rejectedAt/rejectedReason/revisionReason,
                      syncedToMembership, syncedChanges: jsonb {from,to}

ReportAssignment      다단계 검토 배정 (role, order, transferredTo)   ← 분회 단독엔 과잉
ReportLog             감사 로그
```

**신규 서비스 권고:** `ReportFieldTemplate` + `AnnualReport` **2개만** 채택.
`syncToMembership`/`syncedChanges` 는 "신고서 제출 → 회원 기본정보 자동 갱신 + 변경분 추적" 이라는
분회 업무의 핵심을 정확히 해결하므로 **반드시 유지**한다.
`ReportAssignment`(다단계 배정)는 분회 단독 서비스엔 불필요 — `AnnualReport.status` 만으로 충분하다.

그리고 [AnnualReportFormPage.tsx](services/web-kpa-society/src/pages/mypage/AnnualReportFormPage.tsx) 가
**첫 `ReportFieldTemplate` seed 의 원본**이 된다 — 인적사항 / 취업현황 / 약국현황 / 미활동사유 /
연수교육현황 / 개인정보동의 / 우편물수신처 7개 절과 `ActivityType` 11종 · `InactiveReason` 9종이
그대로 들어 있다.

### 5-2. 연수교육 평점 — `lms-yaksa/CreditRecord` (`ab5570573^` 에서 확인)

요청서가 정의한 평점 원장(`회원/연도/출처/교육명/교육일/인정평점/확인상태/연간합계`)과 **거의 1:1 대응**한다.

```
CreditRecord  userId, courseId?, creditType(course_completion|attendance|
                                            external|manual_adjustment),
              creditsEarned decimal(8,2), earnedAt date, creditYear int,
              certificateId?, enrollmentId?, courseTitle?,
              isVerified, verifiedBy?, note?, metadata
```

`creditType='external'` 과 `'manual_adjustment'` 가 **외부 교육 이력 수동 등록**을 이미 커버한다.
**부족한 것은 `organizationId`(분회 스코프) 단 하나**다.

판정대로 **평점 원장(Core) / 자체교육(Extension)** 분리가 성립한다.

- 평점 원장 = `CreditRecord` 기반 신규 테이블 + `organizationId` 추가 → **분회 서비스 Core**
- 자체교육 = 공용 `lms_courses`(`credits`·`organizationId` 컬럼 이미 있음) → `lms_enrollments` →
  이수 시 평점 원장에 `creditType='course_completion'` 적재 → **Extension**

### 5-3. 임원·위원회·회계·행사 — `types/organization.ts` (현재 트리 생존)

[services/web-kpa-society/src/types/organization.ts](services/web-kpa-society/src/types/organization.ts) 450줄이
G/F/I 3개 영역의 설계를 통째로 보존하고 있다. **소비처는 `OrganizationContext` 와 `sampleOrganizations`(샘플 데이터) 뿐**이다.

| 타입 | 대응 요청서 절 |
|---|---|
| `OfficerRole`, `Officer`, `ExtendedCommittee`, `OrganizationChart` | G 임원/위원회 |
| `AccountingAccess`, `DEFAULT_ACCOUNTING_ACCESS`(직위별 접근 매트릭스), `AccountingCategory`, `AccountingEntryWithCommittee` | I 단식부기 |
| `OrganizationEvent` | F 행사 |
| `ScheduleItem` | H 회의·일정 |
| `CommitteeChangeRequest`(create/update/delete + pending/approved/rejected) | G 위원회 변경 승인 |

**권고:** 코드는 재사용하지 않되(서비스 로컬 타입 · API 미결선), 신규 도메인 설계 시 **이 파일을 요구사항 원본으로 읽는다.**

---

## 6. 새 서비스에서 재사용할 Core (근거 포함)

| Core | 근거 | 주의 |
|---|---|---|
| **auth** (`auth-core`/`auth-client`/`auth-react`) | F10 Core Freeze, 전 서비스 운영 중 | 로그인 API 는 **`serviceKey` 필수** — 누락 시 정상 계정도 401 |
| **identity** (`users` 45행) | RBAC SSOT 기반 | `users.role` 사용 금지 (F11) |
| **service membership** (`service_memberships` 21행) | 5상태가 분회 가입 승인과 정합 | 새 `serviceKey` 1개 신설 필요 |
| **RBAC** (`role_assignments` 43행) | F9 SSOT | `unique_active_role_per_user` 는 3컬럼 UNIQUE — upsert 시 23505 주의 |
| **organization** (`organization-core`) | api-server 가 실제 소비 (`organization.routes.ts`, `forumPermissions.ts`) | `type: 'division'\|'branch'` 계층 전제 (§7-3) |
| **forum** (`forum-core`) | `forum_post` 운영 중, `ANNOUNCEMENT` + `organizationId` + `isOrganizationExclusive` | `PostType`/`PostStatus` 는 **Core 확장 금지** — 값 추가는 Phase 승인 필요 |
| **lms 일부** (`lms_courses`/`lms_enrollments`) | 7/8행 운영 중 | `credits` 는 전부 0 — 실사용 이력 없음 |
| **notification** (`/api/v2/notifications`) | 선행 WO 가 백엔드 무변경으로 보존 | frontend 화면만 제거된 상태 |
| **approval inbox** (`kpa_approval_requests` + `MyRequestsInbox`) | 4서비스 공유 공통 컴포넌트 | — |
| **파일/첨부** | 별도 확인 필요 | `forum_post` 에 첨부 컬럼 **없음** |
| **공용 cron** (`src/jobs/*.job.ts`) | 선행 WO 가 보존 판정 | 약사회 전용 Job 재도입 금지 |

---

## 7. 가져오면 안 되는 과거 복잡성

### 7-1. 회비 — 3계층 배분·상납 정산 (`annualfee-yaksa`)

과거 모델은 `baseAmount`(본회비) + `divisionFeeAmount`(지부비) + `branchFeeAmount`(분회비) 를 계산해
`FeeSettlement` 로 `branchShare`/`divisionShare`/`nationalShare`/`remittanceAmount` 를 산출하고,
`FeeExemption` 감면 신청 워크플로와 PG 결제(`pgProvider`/`transactionId`/`approvalNumber`/`receiptNumber`)까지 포함했다.

**분회 단독 서비스에는 전부 불필요.** 요청서의 목표(`연도·직역·부과액·납부액·납부일·상태`)만 구현한다.

### 7-2. 소속 이력을 `organization_members` 로 해결하려는 시도

`UQ_org_member_org_user` 가 `(organization_id, user_id)` **UNIQUE** 이고 `left_at` 이 1칸뿐이라
**전출 후 재전입 이력이 누적되지 않는다.** 또한 실데이터 16행이 전부 `role='owner'`(매장 소유권)이므로
의미 축도 다르다. **회원 소속 이력을 여기에 얹으면 안 된다.**

### 7-3. 지부 → 분회 hierarchy

`Organization.type = 'division' | 'branch'` + `parentId`/`level`/`path` 로 계층이 **organization-core 에 내장**돼 있고,
`kpa_organizations` 실데이터도 협회 → 지부 18 → 분회 209 3단 트리다.

요청서 원칙("지부→분회 계층을 만들지 않는다")을 지키려면 **분회를 동급 tenant 로만 다루고,
`parent_id` 는 조회·표시용 참고값으로만 쓴다.** 계층 권한 상속(`organization-lms` README 가 말하는
"지부 관리자 → 분회 교육 관리")은 **도입하지 않는다.**

### 7-4. 그 외

- **중복 LMS** — `lms-yaksa` 처럼 공용 `lms-core` 와 별개 LMS 를 만들지 않는다 (CLAUDE.md §13)
- **중복 커뮤니티** — KPA Society 활용. 새 서비스에 forum 커뮤니티를 신설하지 않는다
- **복식부기** — `RoleBasedAccountingSection` 수준의 단식부기만
- **전용 scheduler** — `yaksa-scheduler` 재도입 금지. 공용 cron 사용
- **다단계 검토 배정** — `ReportAssignment` 의 `role`/`order`/`transferredTo` 는 분회 단독엔 과잉
- **난수 기반 외부 제출 Mock** — 과거 `reporting-yaksa` 가 성공/실패를 난수로 위장했다. 재현 금지

---

## 8. 새로 만들어야 할 최소 도메인

기존 모델로 대체 가능한 것은 제안하지 않았다.

| 신규 | 필요 이유 (기존으로 안 되는 근거) | 규모 |
|---|---|---|
| `branch_memberships` (회원 ↔ 분회 소속 + 이력) | `organization_members` 는 unique(org,user) 로 이력 불가 (§7-2) | 소 |
| `annual_report_templates` (연도별 양식) | 프로덕션에 테이블 없음. 대한약사회 양식이 매년 변경 | 소 |
| `annual_reports` (회원별 연도 신고) | 동상. `syncedChanges` 로 회원정보 반영 추적 | 중 |
| `branch_fee_policies` (연도 × 직역 부과액) | `fee_category` 는 있으나 **부과액 정의처가 없음** | 소 |
| `branch_fee_ledger` (회원별 부과·납부) | 프로덕션에 `fee_*` 0 | 중 |
| `education_credit_ledger` (평점 원장) | `lms_courses.credits` 는 과정 속성일 뿐 회원별 원장이 아님 | 중 |
| `branch_events` (행사) | `lms_events`·`store_events` 는 타 도메인 | 소 |
| `branch_workspaces` + `workspace_memberships` (임원회/위원회/TF + capability) | `kpa_stewards`(0행, 소비 0)는 범위 위임만, Workspace 개념 없음 | 중 |
| `workspace_meetings` (회의·안건·결과·외부링크) | 전무 | 소 |
| `branch_ledger_entries` (단식부기) | 전무 | 소 |

**제안하지 않은 것 (기존 재사용으로 충분):**
`BranchTenant` → `kpa_organizations`(분회 209) 재사용 · 공지/자료 게시판 → `forum_post` 재사용 ·
회원 기본정보 → `kpa_members` 재사용 · 면허 → `kpa_pharmacist_profiles` 재사용 ·
신청 인박스 → `kpa_approval_requests` 재사용.

---

## 9. 문서 정합 (CLAUDE.md §16)

**발견 3건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건**

§16-2 기본 동작(보고)에 따라 **인라인 수정은 하지 않았다.** 3건 모두 §16-4 의 "내용·판정 변경" 에 해당한다.

| # | 문서 | Drift | 조치 |
|---|---|---|---|
| D1 | [packages/organization-lms/README.md](packages/organization-lms/README.md) | "LMS Phase 1-3 구현 완료 ✅" 로 적혀 있으나 실제는 entities 0 · controllers 0 · `ownsTables: []` · backend `export {}` | 보고만. §16-1 대상(`docs/**`) 밖이나 오독 위험이 커 기록 |
| D2 | [docs/architecture/O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1.md](docs/architecture/O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1.md) | `organization_members` 구조를 `status`·`approved_at` 포함으로 기술하나, 실제 컬럼은 `is_primary`·`metadata`·`left_at` 이며 **`status`·`approved_at` 은 없다** | 별도 WO 제안. 내용 판정 변경이라 인라인 금지 |
| D3 | 동 문서 | `organizations` 설명에 `status` 를 포함하나 실제 entity·DB 에 없음 (`isActive` 만 존재) | D2 와 동일 WO 로 처리 |

> D2/D3 는 **분회 서비스 설계에 직접 영향**을 준다(§7-2). 설계 착수 전 정정 권고.

---

## 10. 개발 순서 제안

### 1차 MVP — 작은 분회가 실제로 쓸 수 있는 범위

| # | WO | 선행 | 비고 |
|---:|---|---|---|
| 1 | 분회 tenant 확정 — `kpa_organizations` entity·API 신설 + `/{branch}` 라우팅 + 새 `serviceKey` 1개 | — | **DB seed 재사용, 신규 테이블 0.** `parent_id` 는 표시용 |
| 2 | 회원 — `kpa_members` ADAPT + `branch_memberships`(소속·전입/전출 이력) | 1 | D2 정정 선행 권고 |
| 3 | 신상신고 — `annual_report_templates` + `annual_reports` + 회원정보 sync | 2 | 첫 template seed = `AnnualReportFormPage` 필드 |
| 4 | 회비 — `branch_fee_policies` + `branch_fee_ledger` (`fee_category` REUSE) | 2 | 3계층 배분·상납·PG 제외 |
| 5 | 연수교육 평점 — `education_credit_ledger` (external/manual 등록 포함) | 2 | 자체교육 없이 원장만으로 성립 |
| 6 | 공지 — `forum_post` REUSE (`ANNOUNCEMENT` + `organizationId`) | 1 | Core 확장 금지 |
| 7 | 행사 — `branch_events` 소형 | 1 | 참석 여부·자료·링크·체크리스트 |

> 6번은 1번만 끝나면 2~5번과 **병렬 가능**하다.

### 2차 확장

| # | WO | 비고 |
|---:|---|---|
| 8 | 조직공간 — `branch_workspaces` + capability 선택 | `types/organization.ts` 를 요구사항 원본으로 |
| 9 | 위원회 — Workspace 템플릿(추천값) + 변경 승인 | `CommitteeChangeRequest` 참고 |
| 10 | 회의·일정·자료 — `workspace_meetings` | 그룹웨어 대체 아님. Zoom/Meet/KakaoTalk 링크 보관만 |
| 11 | 자체 연수교육 — `lms_courses`/`lms_enrollments` ADAPT → 5번 원장 적재 | Extension |
| 12 | 선택형 단식부기 — `branch_ledger_entries` | `AccountingCategory`/`AccountingAccess` 참고 |
| 13 | KPA Society / AI 연계 | 커뮤니티는 KPA Society 활용 |

### 착수 전 별도 판단이 필요한 2건

| 항목 | 내용 |
|---|---|
| 첨부 자료 | `forum_post` 에 첨부 컬럼이 없다. 공용 미디어/첨부 Core 소비 경로 확인이 선행돼야 E·H 절이 완결된다 |
| `yaksa_*` 7개 빈 테이블 | 선행 WO `H5` 로 DROP 보류 중. 새 서비스가 유사 이름을 쓰기 전 처분 확정 권고 |

---

## 11. 제한 준수

| 축 | 결과 |
|---|---|
| 코드 수정 | **0** |
| DB write (INSERT/UPDATE/DELETE/DDL) | **0** — `SELECT` 만 수행 |
| migration 생성·수정 | **0** |
| commit / push | **0** |
| 기존 WIP 접촉 | **0** (`packages/ui/src/layout/*` 타 세션 변경 무접촉) |
| 개인정보 | 이름·이메일·전화·면허번호 원본 미조회. 집계·컬럼명만 기록 |

---

## 부록 Z. 후속 WO 실측에 따른 정정 (2026-08-12)

`WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1` 구현 중
프로덕션 DB 를 다시 실측한 결과, 본문 두 곳을 정정한다. **본문은 조사 시점 기록으로 보존**하고
여기에 정정 내용만 덧붙인다.

| # | 본문 위치 | 본문 기술 | 실측 결과 (정정) |
|---|---|---|---|
| Z-1 | §D 표 「회원 기본정보」 행 | `kpa_members.organization_id` 가 "이미 분회 업무 축과 일치" | **불일치.** 해당 FK 는 `kpa_organizations` 가 아니라 `organizations(type='pharmacy')` 를 가리킨다 — 의미는 **근무 약국**이지 소속 분회가 아니다. 두 축은 충돌하지 않으므로 분회 소속은 `branch_memberships` 로 분리했다. |
| Z-2 | §H 「제안하지 않은 것」 | 공지/자료 게시판 → `forum_post` 재사용 | **채택하지 않음.** forum 은 Community 도메인이고 Primary Boundary 가 `organizations`(약국·사업자 축)라 분회(`kpa_organizations`) 축과 경계 키가 다르다. 스레드·댓글도 불필요하므로 고정 템플릿 홈페이지용 `branch_posts` 를 별도로 두었다. 분회 **커뮤니티 게시판**이 요구되면 그때 forum 공통 구조로 별도 WO 에서 연결한다 (CLAUDE.md §13 검토 완료). |

추가 실측 사실 — 분회 tenant 의 실제 판별식은 `kpa_organizations.type = 'group'` 이다.
(`association` 1 = 대한약사회 / `branch` 18 = 지부 / `group` 209 = 분회, 전 행 `is_active = true`.)
