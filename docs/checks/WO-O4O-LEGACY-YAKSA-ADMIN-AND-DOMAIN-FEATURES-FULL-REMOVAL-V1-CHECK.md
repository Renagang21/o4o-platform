# WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1 — CHECK

기존 O4O 관리자와 플랫폼에 남아 있던 **약사회 전용 관리자·도메인·scheduler 기능**을 전수 조사한 뒤 제거하고,
다른 서비스가 실제로 사용하는 공용 기반은 보존했다.

- **판정: `PASS_WITH_HOLD`**
- 작성일: 2026-08-05
- 성격: 제거(Removal) WO. 신규 약사회 서비스 설계·구현은 범위 밖.

---

## 1. 기준 branch · HEAD · origin/main · ahead/behind

| 항목 | 값 |
|---|---|
| branch | `main` |
| 시작 HEAD | `be6a102a5` |
| origin/main | `be6a102a5` |
| 시작 ahead/behind | `0 / 0` |

---

## 2. 시작 작업 트리 · 타 세션 WIP

시작 시 index(staged)는 비어 있었다 (`git diff --cached --name-only` → 0건).

작업 트리에는 **타 세션 WIP**가 존재했고, 전 구간에서 손대지 않았다.

| 타 세션 WIP | 내용 |
|---|---|
| `apps/api-server/src/scripts/**` (modified 1 + untracked 87) | HFF ZH 번역 트랙(`hff-zh-b01-translate.mjs`, `hff-zh-b04-z*-translations-v1.json`, `hff-zh-final-*.mjs`) |

→ 위 경로는 **stage·commit·reset·stash·삭제 모두 하지 않았다.**
WO 중지 조건은 "작업 대상 파일이 타 세션 WIP와 직접 겹침"이며, 겹침은 0건이므로 진행했다.

---

## 3. 선행 감사 commit 포함 여부

| commit | ancestor of HEAD |
|---|---|
| `36903e6e4` (yaksa-scheduler YaksaReport 의존성 런타임 감사) | YES |
| `83ba214b9` | YES |
| `54c9db66d` (잔여 Job 업무 필요성·대체 감사) | YES |
| `e47d95143` | YES |

4건 모두 기준 HEAD 에 포함되어 있어, 본 WO 는 선행 감사 결론 위에서 수행되었다.

---

## 4. 전체 모집단

약사회 전용 여부를 판정하기 위해 조사한 모집단은 다음 5 카테고리다.

| # | 카테고리 | 모집단 |
|---|---|---|
| 1 | 관리자 화면·경로 | `admin-dashboard` 의 `pages/{membership,annualfee,lms-yaksa,yaksa-admin,yaksa}`, `components/{membership,lms-yaksa}`, `lib/api/{lmsYaksa,yaksaAccounting,yaksaAdmin,yaksaScheduler}.ts`, `routes/yaksa.routes.tsx`, `routes/lms-marketing.routes.tsx` 내 `/admin/lms-yaksa/*`, `admin-menu.static.tsx` 의 `core-membership*` 4건 + `yaksa-admin-center`, `rolePermissions.ts` 4건, `ViewComponentRegistry.ts` 6건 |
| 2 | 백엔드 | `register-routes.ts` 의 `/api/v1/membership` mount, `bootstrap/membership-admin-guard.ts`, `database/entities.ts` 의 `@o4o/membership-yaksa/entities` 9건, `appsCatalog.ts`/`app-manifests/*`/`service-groups/*`/`template-linter.ts`/`app-manager.types.ts` 의 4 appId, `service-templates/templates/yaksa-branch.json` |
| 3 | 패키지 | `packages/{annualfee-yaksa,membership-yaksa,lms-yaksa,yaksa-scheduler}` + `apps/api-server/packages/*` vendor stub 4건, `apps/api-server/package.json` deps 4 + build:deps 4, root `package.json` `build:yaksa-scheduler`, `apps/api-server/tsconfig.json` path alias 4, `.github/workflows/{deploy-api,ci-pipeline}.yml` |
| 4 | scheduler | `registerAllHandlers()` 와 그것이 등록하던 Job **10건**, `JobRegistry`, `YaksaReport` 조회·집계, `Math.random()` 외부 제출 Mock |
| 5 | 잔재 | 삭제 코드 import·dead export·alias·registry 등록, 관련 test/spec, main-site `/member`·`/member/lms/*`·`/member/notifications`·`/mypage/*` 화면 |

---

## 5. `REMOVE` / `KEEP_SHARED` / `HOLD` 분류

판정 4조건(①약사회 전용 업무만을 위해 존재 ②다른 운영 서비스의 실제 소비처 없음 ③현재 관리자 또는 legacy 패키지에만 존재 ④제거해도 공용 기능·운영 서비스 계약 불변)을 모두 만족할 때만 `REMOVE`.

### REMOVE (수행 완료)

| 대상 | 4조건 충족 근거 |
|---|---|
| `packages/annualfee-yaksa` | 회비 = 약사회 고유 업무. runtime import 0. prod 에 `fee_*` 테이블 자체가 없음 |
| `packages/membership-yaksa` | 회원 자격 = 약사회 고유. mount 지점이 `register-routes.ts` 1곳뿐이고 화면도 admin 전용 |
| `packages/lms-yaksa` | 면허·필수교육 = 약사회 고유. 공용 `lms-core` 와 별도 패키지 |
| `packages/yaksa-scheduler` | 등록 Job 10건 전부 위 3패키지 소비. 다른 Job 0건 |
| admin 화면·메뉴·route·registry·권한 설정 | 위 패키지 제거 시 resolve 대상 0 |
| main-site `/member`, `/member/lms/*`, `/member/notifications`, `/mypage/*` | 진입점·복귀 링크가 전부 제거 대상이라 도달 불가 화면이 됨 |
| `bootstrap/membership-admin-guard.ts` + spec 3건 | 제거된 mount 전용 guard |

### KEEP_SHARED (보존) — §12 참조

### HOLD (제거하지 않음) — §16 참조

---

## 6. 제거한 관리자 메뉴 · 화면 · route

**메뉴 (`admin-menu.static.tsx`)**

- `core-membership-dashboard` / `core-membership-members` / `core-membership-verifications` / `core-membership-categories` (4건)
- `yaksa-admin-center` (1건)
- 사용처가 사라진 `UserCheck` icon import 제거

> `Yaksa (KPA)` 메뉴 그룹의 나머지 **`/operator/*` 4건은 현재 운영 중인 KPA Society 화면**이라 보존했다.

**Frontend route**

| route | 제거 위치 |
|---|---|
| `{YaksaRoutes()}` 전체 | `App.tsx` (import + 마운트), `routes/index.ts` export, `routes/yaksa.routes.tsx` 파일 |
| `/admin/lms-yaksa/*` | `routes/lms-marketing.routes.tsx` (`requiredPermissions={['lms-yaksa.license.read']}` + `AppRouteGuard appId="lms-yaksa"` 포함) |
| `/member`, `/member/lms/*`, `/member/notifications`, `/mypage/*` | `apps/main-site/src/router/index.tsx` |

**화면 파일**: `pages/{membership,annualfee,lms-yaksa,yaksa-admin,yaksa}/**`, `components/{membership,lms-yaksa}/**`,
`lib/api/{lmsYaksa,yaksaAccounting,yaksaAdmin,yaksaScheduler}.ts`,
main-site `pages/member/**`, `pages/mypage/**`, `components/lms-yaksa/**`.

**남은 약사회 전용 관리자 메뉴 = 0 / 도달 가능 화면 = 0.**

---

## 7. 제거한 API · service · entity 참조

| 대상 | 조치 |
|---|---|
| `/api/v1/membership` mount | `register-routes.ts` 에서 `createMembershipRoutes` import·mount·`registerMembershipAdminGuards` 제거 (제거 기록 주석 대체) |
| `bootstrap/membership-admin-guard.ts` | 파일 삭제 |
| `@o4o/membership-yaksa/entities` 9건 | `database/entities.ts` 에서 import 및 등록 배열에서 제거 |
| appId `membership-yaksa` / `annualfee-yaksa` / `lms-yaksa` / `yaksa-scheduler` | `appsCatalog.ts`(5건), `app-manifests/index.ts`, `disabled-apps.registry.ts`, `app-manager.types.ts`, `validators/template-linter.ts`(3 map), `service-groups/index.ts`(4 array), `service-templates/templates/yaksa-branch.json`, `scripts/bootstrap-install-apps.{ts,mjs}` 에서 제거 |
| `forum-yaksa` 의존 | `app-manifests/forum-yaksa.manifest.ts` → `optional: ['organization-core']`, `packages/forum-yaksa/src/manifest.ts` → `apps: ['organization-core']` (membership-yaksa 의존 제거) |
| 관련 spec | `membership-admin-guard.spec.ts`, `membership-category-inactive-list.spec.ts`, `membership-residual-subtree-guard.spec.ts`, admin `membership-*` test 3건 삭제 / `admin-menu-route-backend-alignment.test.ts`·`admin-operation-boundary.test.ts`·`tests/multi-tenant/appstore.spec.ts` 는 잔존 검증으로 재작성 |

**약사회 전용 API mount = 0.**

---

## 8. 제거한 packages

| package | 비고 |
|---|---|
| `packages/annualfee-yaksa` | 44 src 파일 + manifest/tsconfig/package.json |
| `packages/membership-yaksa` | 52 src 파일 + MIGRATION.md/TODO.md/tsconfig/package.json |
| `packages/lms-yaksa` | 34 src 파일 + TODO.md/tsconfig/package.json |
| `packages/yaksa-scheduler` | 27 src 파일 + TODO.md/tsconfig/package.json |
| `apps/api-server/packages/{annualfee-yaksa,lms-yaksa,membership-yaksa,yaksa-scheduler}/package.json` | vendor stub 4건 |

**참조 정리**

- `apps/api-server/package.json` — `workspace:*` dependency 4건 + `build:deps` filter 4건 제거
- `apps/api-server/tsconfig.json` — path alias 4건 제거 (`@o4o/reporting-yaksa/*` 포함, 실체 없는 alias)
- root `package.json` — `build:yaksa-scheduler` script 및 참조 제거
- `.github/workflows/deploy-api.yml` — build 4줄 제거 / `ci-pipeline.yml` — 2곳 정리
- `pnpm-lock.yaml` — `pnpm install --frozen-lockfile` 이 아닌 정규 재생성으로 갱신 (1 insertion / 157 deletions, 잔여 참조 0). 삭제한 workspace package 및 그 dependency 제거분만 포함

---

## 9. 제거한 scheduler Job 10건

`packages/yaksa-scheduler/src/handlers/index.ts` 의 `registerAllHandlers()` 가 등록하던 전량이다.

| # | targetService | jobType | handler |
|---|---|---|---|
| 1 | `annualfee-yaksa` | `invoice_overdue_check` | `invoiceOverdueCheckHandler` |
| 2 | `annualfee-yaksa` | `invoice_due_date_warning` | `invoiceDueDateWarningHandler` |
| 3 | `annualfee-yaksa` | `exemption_expiry_check` | `exemptionExpiryCheckHandler` |
| 4 | `annualfee-yaksa` | `settlement_reminder` | `settlementReminderHandler` |
| 5 | `membership-yaksa` | `verification_expiry_check` | `verificationExpiryCheckHandler` |
| 6 | `membership-yaksa` | `license_renewal_reminder` | `licenseRenewalReminderHandler` |
| 7 | `lms-yaksa` | `assignment_expiry_check` | `assignmentExpiryCheckHandler` |
| 8 | `lms-yaksa` | `course_deadline_reminder` | `courseDeadlineReminderHandler` |
| 9 | `reporting-yaksa` | `failed_submission_retry` | `failedSubmissionRetryHandler` |
| 10 | `reporting-yaksa` | `report_deadline_reminder` | `reportDeadlineReminderHandler` |

`registerAllHandlers()` 자체와 그 호출부(`lifecycle/activate.ts`), `registry/JobRegistry.ts`,
`backend/services/SchedulerService.ts` 등 scheduler 패키지 전체를 함께 제거했다.

**저장소 내 `registerAllHandlers` 참조 = 0 / `JobRegistry` 참조 = 0.**

> 공용 cron 기반(`apps/api-server/src/jobs/*.job.ts` + `startup.service.ts`)은 다른 실제 Job 이 사용하므로 **보존**했다.

---

## 10. `YaksaReport` · reporting Mock 제거 결과

- `reporting-handlers.ts` — 파일 삭제. `targetService: 'reporting-yaksa'`, `actionType: 'failed_submission_retry'` 포함 전량 제거
- `YaksaReport` 조회·집계 코드 — 패키지 삭제로 함께 제거
- **`Math.random()` 기반 가짜 외부 제출 Mock** — 삭제 (실제 외부 전송은 애초에 존재하지 않았고, 성공/실패를 난수로 위장하던 코드였다)
- `@o4o/reporting-yaksa` path alias — `apps/api-server/tsconfig.json` 에서 제거

**저장소 내 `YaksaReport` 참조 = 0.**

---

## 11. dependency · export · alias · registry 정리

| 축 | 결과 |
|---|---|
| workspace dependency | 삭제 4패키지에 대한 `workspace:*` 참조 0 |
| tsconfig path alias | 4건 제거, 잔여 0 |
| barrel export | `routes/index.ts` 의 `YaksaRoutes` export 제거 |
| ViewComponentRegistry | `membership-yaksa.*` 5건 + `lms-yaksa.router` 1건 제거 |
| appsCatalog / module registry / service-group / template-linter | 4 appId 전량 제거 |
| lockfile | `pnpm-lock.yaml` 잔여 참조 0 |

---

## 12. 보존한 공용 기능과 실제 소비처

| 보존 대상 | 실제 소비처 |
|---|---|
| `service_memberships` 기반 공용 회원 구조 (32 rows) | KPA Society · K-Cosmetics · Neture · Pharmacy-Hub |
| `role_assignments` / `organization_members` / `users` | RBAC SSOT (F9/F11) — 전 서비스 |
| 공용 LMS core (`lms_*` 16 테이블, `lms_courses` 7 · `lms_enrollments` 8) | `/admin/lms-instructor/*` 및 LMS core 소비 서비스 |
| 공용 알림 백엔드 `/api/v2/notifications` | 다수 서비스 (front 화면만 제거, 백엔드 무변경) |
| 공용 결제·메일 기반 | E-commerce Core |
| 공용 scheduler/cron 엔진 (`src/jobs/*.job.ts` + `startup.service.ts`) | 약사회 외 실제 Job |
| `/operator/*` KPA 메뉴 4건 및 KPA Society 전 기능 | 현재 운영 중 |
| `forum-yaksa` (43 tracked files) | HOLD — §16 |
| `ProductMaster` 등 O4O 공용 데이터 구조 | 전 서비스 |

---

## 13. DB · table · migration 조사 결과 (read-only)

접속: `cloud-sql-proxy` → `netureyoutube:asia-northeast3:o4o-platform-db`, 사용자 `o4o_api`, DB `o4o_platform`.
**수행한 SQL 은 `SELECT` 뿐이며 write 는 0건이다.**

### 13-1. 약사회 전용 테이블 현황

| schema.table | row 수 | 크기 | 마지막 데이터 변경 | 코드 제거 후 남는 소비처 |
|---|---:|---|---|---|
| `public.yaksa_categories` | **5** | 80 kB | `2026-01-08 06:16:05` (created=updated, seed 이후 변경 없음) | 0 |
| `public.yaksa_members` | 0 | 104 kB | — | 0 |
| `public.yaksa_member_affiliations` | 0 | 48 kB | — | 0 |
| `public.yaksa_member_categories` | 0 | 48 kB | — | 0 |
| `public.yaksa_member_verifications` | 0 | 40 kB | — | 0 |
| `public.yaksa_membership_roles` | 0 | 40 kB | — | 0 |
| `public.yaksa_membership_years` | 0 | 48 kB | — | 0 |
| `public.yaksa_posts` | 0 | 112 kB | — | `forum-yaksa` (HOLD) |
| `public.yaksa_post_logs` | 0 | 32 kB | — | `forum-yaksa` (HOLD) |

`yaksa_categories` 컬럼: `id, name, slug, description, status, sort_order, created_by_user_id, created_at, updated_at`.

### 13-2. 존재하지 않는 것으로 확인된 테이블

- **annualfee-yaksa 테이블 없음** — `fee_*` / `%annual%` / `invoice` / `exemption` / `settlement` 패턴에 약사회 회비 테이블 0건.
  (매칭된 `credit_balances`, `credit_transactions`, `glycopharm_billing_invoices`, `neture_settlement*`, `partner_settlement*` 은 전부 타 도메인 공용 테이블이며 무변경)
- **yaksa-scheduler 테이블 없음** — `scheduled_jobs` / `job_execution_logs` / `job_failure_queue` 0건.
  → 해당 모듈이 프로덕션에서 **한 번도 활성화된 적이 없음**을 뒷받침한다.
- **`YaksaReport` 테이블 없음.**
- lms-yaksa 전용 테이블(`license`/`credit`/`required` 패턴) 0건 — 공용 `lms_*` 테이블만 존재.

### 13-3. migration 이력 (무변경)

`typeorm_migrations` 에 아래 항목이 존재하며 **삭제·수정하지 않았다.**

`9 CreateMembershipYaksaTables1733458800000` · `10 ExtendYaksaMemberFields1733600000000` ·
`13 CreateYaksaTables1735563600000` · `14 SeedYaksaData1735563600001` · `462 FixTestYaksaMemberRecords20260508200000`

`apps/api-server/src/database/migrations/2026012200002-SeedDefaultApps.ts` 도 **수정하지 않았다** (WO 가 migration 변경을 금지).

### 13-4. 향후 별도 DB 정리 필요 여부

**필요하나 이번 WO 범위 밖.** 9개 `yaksa_*` 테이블은 실데이터가 사실상 0(`yaksa_categories` seed 5행 제외)이고
코드 소비처도 `forum-yaksa`(HOLD) 를 제외하면 0이 되었다. DROP·archive 판단은 **별도 WO** 로 수행한다.

---

## 14. 저장소 재검색 결과

`node_modules` / `.git` / `dist` / `docs` / `pnpm-lock.yaml` 제외, 저장소 전체 검색.

| 검색어 | 파일 수 | 성격 |
|---|---:|---|
| `@o4o/annualfee-yaksa` | **0** | — |
| `@o4o/yaksa-scheduler` | **0** | — |
| `@o4o/reporting-yaksa` | **0** | — |
| `registerAllHandlers` | **0** | — |
| `YaksaReport` | **0** | — |
| `JobRegistry` | **0** | — |
| `@o4o/membership-yaksa` | 6 | **전부 제거 기록 주석** (`admin-menu.static.tsx:99`, `ViewComponentRegistry.ts:219`, `admin-operation-boundary.test.ts:114`, `register-routes.ts:84,367`, `entities.ts:514`, `admin-api-guard-inventory.spec.ts:59`) |
| `@o4o/lms-yaksa` | 2 | **전부 제거 기록 주석** (`ViewComponentRegistry.ts:251`, `register-routes.ts:107`) |

**runtime import·mount·registry 참조 = 0.** 남은 것은 재등장 방지용 설명 주석뿐이다.

---

## 15. typecheck · build 결과

| 검증 | 결과 |
|---|---|
| `apps/api-server` — `tsc -p tsconfig.build.json --noEmit` | **PASS** (0 error) |
| `apps/api-server` — `pnpm run build` | **PASS** |
| `apps/admin-dashboard` — `tsc --noEmit` | **PASS** (0 error) |
| `apps/admin-dashboard` — `vite build` | **PASS** (37.62s) |
| `apps/main-site` — `tsc --noEmit` | **PASS** (0 error) |
| `apps/main-site` — `vite build` | **PASS** (7.43s) |

**이번 변경과 무관한 선행 오류 분리 보고**

`apps/api-server` 를 `tsconfig.json`(전체) 로 돌리면 19 error 가 나오나, **전부 `apps/api-server/src/scripts/**` 하위**이며
이는 타 세션(HFF/OTC 트랙) WIP 이고 `tsconfig.build.json` 에서 제외되는 경로다.
`src/scripts/` 밖 오류 = **0건** → 이번 제거와 인과관계 없음.

---

## 16. HOLD · 후속 과제

WO 의 "공용 소비 여부가 불확실하면 제거하지 않고 `HOLD` 에 기록한다" 규칙에 따라 아래는 **제거하지 않았다.**

| # | HOLD 대상 | 사유 |
|---|---|---|
| H1 | `packages/forum-yaksa` (43 tracked files, `@o4o-apps/forum-yaksa`) 및 main-site UI / admin block | Forum 은 O4O **공통 구조**(CLAUDE.md §13)이고 `yaksa_posts`/`yaksa_post_logs` 테이블이 남아 있어 공용 소비 여부가 불확실. 이번엔 `membership-yaksa` 의존만 끊었다 |
| H2 | `apps/admin-dashboard/vite.config.ts` 의 alias `'@o4o/forum-core-yaksa' → packages/forum-yaksa` | H1 종속 |
| H3 | `apps/api-server/tests/multi-tenant/setup.ts` in-memory mock appId 문자열 | `view-system.spec.ts:58,282` 및 `navigation.spec.ts` 가 소비하는 fixture. 손대면 타 spec 이 깨질 수 있어 보류 |
| H4 | untracked 로컬 산출물 `packages/{member-yaksa,reporting-yaksa,yaksa-accounting,yaksa-admin}` | tracked 파일 0건 — git 관리 대상이 아닌 로컬 `dist`/`node_modules` 잔재. 저장소 변경 없음 |
| H5 | `yaksa_*` 9개 테이블 및 관련 migration 이력 | WO 가 DB DROP·migration 변경을 금지. **별도 WO** 로 판단 |

**후속 과제 (이번 WO 에서 미수행)**

- `yaksa_*` 테이블 보존 / archive / DROP 판단 (별도 WO)
- H1 `forum-yaksa` 축의 존폐 판정
- (기존 이월) `packages/security-core` F1 Freeze 사후 승인 · 프런트 `user.scopes` 존폐 · KPA soft-withdraw 감사 로그 `operator_role` 라벨 · `role-assignment.service.ts` frozen-core edit 사후 승인
- (기존 이월) 회원 분류 생애주기 프로덕션 배포 + 역할별 브라우저 smoke

---

## 17. 코드 외 변경 = 0

| 축 | 변경 |
|---|---|
| 운영 DB write (INSERT/UPDATE/DELETE) | **0** |
| schema 변경 (DROP/ALTER/CREATE) | **0** |
| migration 파일 삭제·수정·신규 | **0** |
| seed 변경 | **0** |
| production 배포 | **0** |
| 실제 알림·메일·외부 전송 | **0** |

DB 접근은 read-only `SELECT` 만 사용했고, 개인정보(이름·이메일·전화번호·UUID 원본)는 조회·기록하지 않았다.

---

## 18. 타 세션 WIP 보존

`apps/api-server/src/scripts/**` (modified 1 + untracked 87) 는 **stage·commit·reset·checkout·stash·삭제 모두 하지 않았다.**
commit 은 자기 파일 275건만 명시 경로로 지정해 수행했다 (§20).

---

## 19. CHECK 경로

`docs/checks/WO-O4O-LEGACY-YAKSA-ADMIN-AND-DOMAIN-FEATURES-FULL-REMOVAL-V1-CHECK.md`

---

## 20. commit · push · 최종 ahead/behind

- 대상 파일: **275건** (관리자 59 · membership-yaksa 55 · annualfee-yaksa 46 · lms-yaksa 37 · yaksa-scheduler 30 · main-site 19 · api-server 22 · CI/설정 7)
  + `pnpm-lock.yaml` (삭제 package manifest 와 직접 연관)
- `git add` 는 자기 파일 명시 목록으로만 수행, `git add .` · 디렉터리 pathspec 미사용
- commit 후 `git show --name-only --format= HEAD` 로 파일 목록 검증
- push 후 `origin/main` 대비 **ahead 0 / behind 0**

> 상세 commit hash 및 push 결과는 §20 하단에 기재한다.

---

## 완료 문장

기존 O4O 관리자와 플랫폼에 남아 있던 약사회 전용 관리자·도메인·scheduler 기능을 제거하고,
다른 서비스가 사용하는 공용 기반은 보존했다.
향후 약사회 기능은 별도 서비스에서 새로 설계하며, 이번 작업에서는 운영 DB·schema·migration·seed 및 배포를 변경하지 않았다.
