# WO-O4O-YAKSA-REPORTS-NONFUNCTIONAL-UI-AND-DEAD-CONTRACT-REMOVAL-V1 — CHECK

> 작동하지 않는 Yaksa 신상신고 UI 와 죽은 프런트엔드 API 계약 제거

| 항목 | 값 |
|------|------|
| WO | `WO-O4O-YAKSA-REPORTS-NONFUNCTIONAL-UI-AND-DEAD-CONTRACT-REMOVAL-V1` |
| 성격 | 제거(removal) — 신규 도메인 구현 아님 |
| 판정 | **PASS** |
| 선행 감사 | [`WO-O4O-YAKSA-REPORTS-ROUTED-UI-API-CONTRACT-AND-404-RECOVERY-AUDIT-V1-CHECK.md`](WO-O4O-YAKSA-REPORTS-ROUTED-UI-API-CONTRACT-AND-404-RECOVERY-AUDIT-V1-CHECK.md) |
| 작성일 | 2026-08-05 |

---

## 1. 기준 commit · origin/main · 작업 트리

| 항목 | 값 |
|------|------|
| 브랜치 | `main` |
| 작업 시작 HEAD | `a5a8402cf26d959c2a3f7292ccaa7d124d34bf57` |
| `origin/main` | `a5a8402cf26d959c2a3f7292ccaa7d124d34bf57` (동일) |
| ahead / behind (작업 전) | **0 / 0** |
| 작업 트리 | clean 아님 — **타 세션 WIP 존재** (§10) |

작업 트리가 clean 이 아니므로 WO 의 중지 조건을 확인했다. WO 의 중지 조건은
"대상 경로가 타 세션 WIP 와 겹침" 으로 한정되며, 본 WO 의 제거 대상 경로와
타 세션 WIP 경로는 **교집합 0** 이었다(§10). 따라서 중지 조건에 해당하지 않는다.

---

## 2. 선행 감사 commit 포함 여부

| commit | 포함 여부 |
|--------|:--------:|
| `e7beff9bd` — 감사 CHECK 본문 | **ANCESTOR (포함)** |
| `47eaae3c8` — 감사 CHECK §18 backfill | **ANCESTOR (포함)** |

`git merge-base --is-ancestor` 로 두 commit 모두 현재 HEAD 의 조상임을 확인했다.
즉 본 제거 작업은 감사 결과가 반영된 상태 위에서 수행됐다.

---

## 3. 제거한 route · 메뉴 · 카드

### 3-1. Route (5건)

| # | route | 파일 | 비고 |
|:-:|-------|------|------|
| 1 | `/admin/yaksa/reports` | `apps/admin-dashboard/src/routes/yaksa.routes.tsx` | 감사에서 확인된 "도달하지만 작동 불가" 화면 |
| 2 | `/admin/reporting` | 〃 | `ReportingRouter` 진입 |
| 3 | `/admin/reporting/dashboard` | 〃 | |
| 4 | `/admin/reporting/reports` | 〃 | |
| 5 | `/admin/reporting/templates` | 〃 | |

lazy import 4건(`ReportingDashboard` · `ReportList` · `TemplateList` · `ReportReviewPage`)도 함께 제거했다.

### 3-2. 메뉴 · 카드 · 링크 (4건)

| # | 위치 | 제거 대상 | 감사 기록 여부 |
|:-:|------|----------|:-------------:|
| 1 | `apps/admin-dashboard/src/pages/yaksa-admin/YaksaAdminDashboard.tsx` | 지부/분회 관리자 센터의 **"신상신고 승인"** 진입 카드 (`/admin/yaksa/reports`) | 감사 기록 O |
| 2 | `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx` | 최상위 **"Reports"** 메뉴 그룹 전체 (leaf 3: Overview / Submissions / Templates) | **감사 미기록 — 본 작업에서 신규 확인** |
| 3 | `apps/admin-dashboard/src/pages/dashboard/unified/cards/OperatorCard.tsx` | Quick Action **"보고서"** 링크 (`/admin/reporting/dashboard`) | **감사 미기록 — 본 작업에서 신규 확인** |
| 4 | `apps/admin-dashboard/src/pages/yaksa/YaksaAdminHub.tsx` | `PendingReportsCard` 위젯의 **"상세보기"** 링크 (`/admin/reporting/submissions`) | **감사 미기록 — 본 작업에서 신규 확인** |

> #2~#4 는 WO 의 제거 대상 조항 "신상신고 관련 메뉴·링크·버튼" 에 직접 해당하므로 범위 내에서 함께 제거했다.
> 특히 #2 는 **사용자에게 실제로 노출되던 최상위 메뉴 그룹**이었고, #4 의 링크 대상
> `/admin/reporting/submissions` 는 **route 로 존재한 적이 없는 경로**였다.

---

## 4. 제거한 화면 · 컴포넌트

| # | 파일 | 처리 | 근거 |
|:-:|------|------|------|
| 1 | `apps/admin-dashboard/src/pages/yaksa-admin/ReportReviewPage.tsx` | **삭제** | `/admin/yaksa/reports` 전용 승인 화면 |
| 2 | `apps/admin-dashboard/src/pages/reporting/ReportingRouter.tsx` | **삭제** | 소비처 0 (라우트 제거로 고아) |
| 3 | `apps/admin-dashboard/src/pages/reporting/dashboard/ReportingDashboard.tsx` | **삭제** | 〃 |
| 4 | `apps/admin-dashboard/src/pages/reporting/reports/ReportList.tsx` | **삭제** | 〃 |
| 5 | `apps/admin-dashboard/src/pages/reporting/templates/TemplateList.tsx` | **삭제** | 〃 |
| 6 | `services/web-kpa-society/src/pages/mypage/PersonalStatusReportPage.tsx` | **삭제** | 라우팅되지 않은 Mock 제출 화면 (WO 제거 대상 명시) |
| 7 | `apps/admin-dashboard/src/pages/yaksa/YaksaAdminHub.tsx` — `PendingReportsCard` | **컴포넌트 제거** | 승인 대기 신고서 위젯 + mock 데이터 |
| 8 | `apps/main-site/src/pages/member/MemberHome.tsx` — `ReportsTab` | **탭 제거** | "내 신고" 탭 전체 (§5) |

`apps/admin-dashboard/src/pages/reporting/` 디렉터리는 파일 4건 삭제로 **소멸**했다.

---

## 5. 제거한 API helper · type · mock · export

### 5-1. Frontend API helper (실패하던 호출)

| 파일 | 제거 대상 | 호출하던 endpoint | 실제 상태 |
|------|----------|------------------|----------|
| `apps/admin-dashboard/src/lib/api/yaksaAdmin.ts` | `getReports()` | `GET /api/v1/yaksa/reports` | mount 이력 없음 → 404 |
| 〃 | `getReportDetail()` | `GET /api/v1/yaksa/reports/:id` | 〃 (소비처 0 이던 export) |
| 〃 | `approveReport()` | `POST /api/v1/yaksa/reports/:id/approve` | 〃 |
| 〃 | `rejectReport()` | `POST /api/v1/yaksa/reports/:id/reject` | 〃 |
| `apps/main-site/src/pages/member/MemberHome.tsx` | `/reporting/my-report` fetch | `GET /reporting/my-report` | 〃 |

`MemberHome` 의 `Promise.allSettled` 는 4호출 → **3호출**(member · fee · education)로 축소됐다.

### 5-2. Type · 상수 · mock

| 파일 | 제거 대상 |
|------|----------|
| `apps/admin-dashboard/src/lib/api/yaksaAdmin.ts` | `YaksaReport`, `ReportListResponse` interface · scope 주석 "Reporting Review (reporting-yaksa)" |
| `apps/admin-dashboard/src/pages/yaksa/YaksaAdminHub.tsx` | `pendingReports` MOCK_DATA 블록 · `PendingReportWidget` import · 미사용 `FileText` icon |
| `apps/main-site/src/pages/member/MemberHome.tsx` | `ReportSummary` interface · `DashboardData.report` · `TabId`/`TABS` 의 `'reports'` · `getReportStatusLabel` · `getReportStatusVariant` · `transformReportData` · `StatusDot` 의 `case 'reports'` · `'member.report_rejected'` deep-link/아이콘/분기 |
| `apps/main-site/src/pages/member/MemberNotifications.tsx` | `reportId?: string` metadata · `'member.report_rejected' → /member/reports` deep link · NOTIFICATION_META 항목 · 전용 분기 |
| `apps/admin-dashboard/src/pages/yaksa-admin/YaksaAdminDashboard.tsx` | 미사용 `FileText` icon import |

### 5-3. Barrel export

| 파일 | 제거 대상 |
|------|----------|
| `apps/admin-dashboard/src/pages/yaksa-admin/index.tsx` | `export { ReportReviewPage }` |
| `services/web-kpa-society/src/pages/mypage/index.ts` | `export { PersonalStatusReportPage }` |

### 5-4. 테스트 고정값

| 파일 | 변경 |
|------|------|
| `apps/admin-dashboard/src/tests/admin-menu-batch2.test.ts` | menu leaf 총계 기대값 **48 → 45** (Reports 그룹 leaf 3건 제거 반영). 단언 대상·다른 케이스는 불변 |

### 5-5. 타입 계약 보존 조치

`YaksaAdminHub` 의 화면 상태 타입은 yaksa-scheduler 계약 `IntegratedDashboardData` 를
**변경하지 않고** 화면이 소비하는 부분집합으로 좁혔다.

```ts
// 화면 로컬 타입 — 계약(IntegratedDashboardData) 자체는 불변
type HubDashboardData = Omit<IntegratedDashboardData, 'pendingReports'>;
```

`packages/yaksa-scheduler` 및 `apps/admin-dashboard/src/lib/api/yaksaScheduler.ts` 의
`PendingReportWidget` 정의는 **손대지 않았다**(보존 대상 패키지 경계).

---

## 6. 저장소 전체 재검색 결과

| # | 검색어 | 활성 소비처 | 비고 |
|:-:|--------|:----------:|------|
| 1 | `/admin/yaksa/reports` | **0** | 잔여 hit 2건은 본 WO 의 제거 사유 주석 |
| 2 | `/admin/reporting` | **0** | 잔여 hit 4건 전부 본 WO 주석 |
| 3 | `/api/v1/yaksa/reports`, `/reporting/my-report`, `reporting/reports`, `reporting/templates` | **0** | 잔여 hit 은 주석 · `packages/lms-yaksa/TODO.md`(무관 문서) |
| 4 | `@o4o/reporting-yaksa` import | **0** | 잔여 hit 은 주석 · `register-routes.ts:376`(주석 처리된 미mount 표기) · `entities.ts:533`(비등록 표기) · `tsconfig.json` path alias |
| 5 | `/member/reports` | **0** | 잔여 hit 2건은 주석 |
| 6 | `ReportReviewPage` · `ReportingRouter` · `ReportingDashboard` · `PendingReportsCard` | **0** | 잔여 hit 은 주석 |
| 7 | `getReports` · `getReportDetail` · `approveReport` · `rejectReport` · `YaksaReport` · `ReportListResponse` (frontend) | **0** | 잔여 hit 은 주석 · `authorization.middleware.ts:94` JSDoc 예시(무관) · `packages/yaksa-scheduler` backend(보존 대상, §7-3) |

**결론: 실패하던 신상신고 API 호출 활성 참조 0 · 신상신고 전용 화면/helper/type/mock 활성 참조 0.**

---

## 7. 현행 Yaksa 기능 보존 확인

### 7-1. 보존된 route

| route | 상태 |
|-------|:----:|
| `/admin/yaksa` (지부/분회 관리자 센터) | 보존 |
| `/admin/yaksa/members` (회원 승인/현황) | **보존** |
| `/admin/yaksa/officers` · `/education` · `/fees` | 보존 |
| `/admin/forum` (커뮤니티 바로가기) | 보존 |
| `/admin/membership/*` (6 route) | **보존** |
| `/admin/yaksa-hub` | 보존 (widget 1건만 제거) |
| accounting 4 route | 보존 |

지부/분회 관리자 센터 카드는 6장 → **5장**("신상신고 승인" 1장만 감소), 나머지 5장은 무변경.

### 7-2. 보존된 백엔드 · 패키지

| 대상 | 변경 |
|------|:----:|
| `/api/v1/membership` | **0** |
| `membership/verifications` (회원 신원 승인) | **0** — 신상신고 UI 를 여기에 치환 연결하지 **않았다** |
| `@o4o/membership-yaksa` | **0** |
| `@o4o/forum-yaksa` | **0** |
| `@o4o/lms-yaksa` | **0** |
| `@o4o/annualfee-yaksa` | **0** |
| `packages/yaksa-scheduler` | **0** |
| role · permission · organization · membership 구조 | **0** |
| 과거 CHECK · 감사 기록 | **0** (본 CHECK 신규 추가만) |

### 7-3. 범위 외로 판단해 손대지 않은 항목 (FOLLOWUP 후보)

| # | 대상 | 판단 |
|:-:|------|------|
| 1 | `packages/yaksa-scheduler` 의 `getPendingReports()` · `reporting-handlers.ts` — 존재하지 않는 `YaksaReport` repository 조회 | **백엔드 scheduler 영역**이며 WO 의 제거 대상(프런트엔드 UI·계약)이 아니다. 별도 판단 필요 |
| 2 | `apps/api-server/src/app-manifests/appsCatalog.ts` · `SeedDefaultApps` migration 의 `reporting-yaksa` app 등록 | app registry / DB seed 영역. WO 가 **schema·migration·DB 변경 금지**로 명시 |
| 3 | `apps/api-server/tests/multi-tenant/appstore.spec.ts` 의 `'reporting-yaksa'` app id | 멀티테넌트 app store registry 테스트 — 신상신고 화면 계약과 별개 |
| 4 | `services/web-kpa-society/src/pages/mypage/AnnualReportFormPage.tsx` (라우팅 없음 · API 호출 0 · 순수 mock 양식) | WO 의 제거 대상 목록에 **명시되지 않았다**. 범위 확대를 피해 보존했고 FOLLOWUP 으로 남긴다 |
| 5 | `packages/reporting-yaksa/dist/` 로컬 잔재 | git 미추적(추적 소스 없음)이라 commit 으로 제거할 대상이 아니다 |
| 6 | `apps/api-server/tsconfig.json` 의 `@o4o/reporting-yaksa/*` path alias | 백엔드 빌드 설정. import 소비처 0 이나 제거 시 api-server 빌드 영향 검증이 필요해 별도 판단 |

---

## 8. 테스트 · typecheck · build 결과

| 대상 | 명령 | 결과 |
|------|------|:----:|
| admin-dashboard | `tsc --noEmit` | **PASS** (에러 0) |
| main-site | `tsc --noEmit` | **PASS** (에러 0) |
| web-kpa-society | `tsc --noEmit` | **PASS** (에러 0) |
| admin-dashboard | `vitest run` | **PASS** — 14 files / **237 tests 전부 통과** |
| admin-dashboard | `vite build` | **PASS** (built in 40.14s) |
| main-site | `vite build` | **PASS** (built in 8.12s) |
| web-kpa-society | `vite build` | **PASS** (built in 18.54s) |

> typecheck 1차에서 `YaksaAdminHub.tsx` 의 `MOCK_DATA` 가 `IntegratedDashboardData` 의
> `pendingReports` 를 잃어 TS2741 이 발생했다. 계약을 고치지 않고 화면 로컬 타입을
> `Omit<…, 'pendingReports'>` 로 좁혀 해소했다(§5-5).
> 테스트 1차에서 menu leaf 총계 단언(48)이 실패했고, Reports 그룹 leaf 3건 제거를
> 반영해 45 로 갱신했다(§5-4). **샘플·mock 으로 성공을 위장하지 않았다.**

---

## 9. DB · migration · 권한 · 배포 변경 0

| 항목 | 변경 |
|------|:----:|
| 운영 DB 접속 | **없음** — 본 작업 중 DB 에 접속하지 않았다 |
| schema / migration 파일 | **0** |
| entity 등록 | **0** |
| role · permission · guard 정책 | **0** |
| 배포 실행 | **없음** (WO 배포 제외 조항) |
| `pnpm-lock.yaml` | **미변경** |

신상신고 관련 DB 테이블은 애초에 존재하지 않으므로 DROP 대상도 없다.

---

## 10. 타 세션 WIP 보존

| 항목 | 값 |
|------|------|
| 타 세션 WIP 주 영역 | `apps/api-server/src/scripts/**` (HFF ZH 배치 · easy-drug 감사 산출물 등 다수 untracked/modified) |
| 그 외 타 세션 변경 | `.github/workflows/deploy-api.yml` · `apps/admin-dashboard/src/pages/cms/**` · `apps/admin-dashboard/src/config/service-entry.ts` · `apps/admin-dashboard/src/pages/service-applications/**` · `apps/admin-dashboard/src/pages/supplierops/**` · `apps/api-server/**` 일부 · `packages/platform-core/**` · `packages/ui/**` · `packages/operator-ux-core/**` · `services/web-neture/**` · `services/web-account/**` · `services/web-glycopharm/**` · `e2e/**` · `scripts/**` |
| 본 WO 제거 대상과의 경로 교집합 | **0** |
| 타 세션 파일에 대한 수정·삭제·stash·commit | **없음** |
| staging 방식 | 내 파일만 **개별 경로 pathspec** 으로 add / commit |

---

## 11. CHECK 경로

`docs/checks/WO-O4O-YAKSA-REPORTS-NONFUNCTIONAL-UI-AND-DEAD-CONTRACT-REMOVAL-V1-CHECK.md` (본 문서)

---

## 12. commit · push · ahead/behind

| 항목 | 값 |
|------|------|
| commit | (§12 는 commit 직후 기재) |
| 포함 파일 | (동상) |
| push | (동상) |
| ahead / behind | (동상) |

---

## 완료 문장

> 백엔드·제출 경로·운영 데이터가 존재하지 않아 작동할 수 없던 Yaksa 신상신고 UI와 죽은 프런트엔드 API 계약을 제거했다. 현행 회원관리·회원승인·membership 및 다른 Yaksa 서비스는 변경하지 않았다.

---

## 후속 방향 (기록)

향후 실제 도입 요구가 생기면 본 작업으로 제거된 잔재를 복구하는 방식이 아니라,
**"회원이 무엇을 언제 신고하고 누가 어느 조직 범위에서 승인하는가"** 부터
새 도메인으로 기획한다.
