# WO-O4O-YAKSA-REPORTS-ROUTED-UI-API-CONTRACT-AND-404-RECOVERY-AUDIT-V1 — CHECK

**판정:** **PASS_WITH_FOLLOWUP**
**화면 전체 처분:** **HOLD** (기술 계약은 전수 확정 — 업무 소유자 결정만 남음)
**성격:** READ-ONLY 감사. 코드·DB·권한·배포 변경 **0**
**작성일:** 2026-08-05
**선행 근거:** `1cd0eda2a` (legacy Yaksa API 감사) · `69d853f0b` (legacy API·죽은 UI 제거) · `77f920303` (제거 CHECK 보완)

---

## 0. 한 줄 결론

`/admin/yaksa/reports` 는 메뉴에서 **정상 도달 가능한 현행 화면**이지만, 이 화면이 쓰는 신상신고 API 를 제공해야 할 **`@o4o/reporting-yaksa` 패키지 소스가 저장소에 존재하지 않는다**(git 추적 파일 0). 라우터는 mount 된 적이 없고(`register-routes.ts:376` "Still disabled (Phase R2)"), 대응 DB 테이블도 운영 DB 에 **없다**. 즉 404 는 URL 오타나 guard 은폐가 아니라 **도메인 전체 부재**다.

---

## 1. 기준 commit · origin/main · 작업 트리

| 항목 | 값 |
|---|---|
| branch | `main` |
| HEAD | `77f920303133270cb475d95eba77b8083960c473` |
| origin/main | `77f920303` — **동일 (ahead/behind 0/0)** |
| 작업 트리 | not clean — **69건**, 전부 `apps/api-server/src/scripts/**` (타 세션 HFF-ZH WIP) |
| CHECK 경로 중첩 | 없음 (`docs/checks/**`) |

타 세션 WIP 는 수정·삭제·restore·stash·stage 하지 않았다.

## 2. 선행 커밋 포함 여부

| commit | 조상 여부 |
|---|:---:|
| `1cd0eda2a` | ✅ |
| `69d853f0b` | ✅ |
| `77f920303` | ✅ (= HEAD) |

---

## 3. 화면 도달성

| 항목 | 경로·위치 | 상태 | 근거 |
|---|---|---|---|
| Route 등록 | `apps/admin-dashboard/src/routes/yaksa.routes.tsx:170` | **등록됨** (lazy) | `<Route path="/admin/yaksa/reports">` |
| 컴포넌트 | `apps/admin-dashboard/src/pages/yaksa-admin/ReportReviewPage.tsx` | 존재 | `lazy(() => import('@/pages/yaksa-admin/ReportReviewPage'))` (`yaksa.routes.tsx:31`) |
| Router 결선 | `apps/admin-dashboard/src/App.tsx` → `YaksaRoutes()` | **연결됨** | 이전 WO 에서 제거한 미라우팅 `pages/yaksa-forum/**` 과 **다르다** |
| 사이드바 메뉴 | `admin/menu/admin-menu.static.tsx:357` `Yaksa (KPA) → 지부/분회 관리자 센터 → /admin/yaksa` | **노출됨** | `admin-menu-batch2.test.ts:51` 로 고정 |
| 화면 내 진입점 | `pages/yaksa-admin/YaksaAdminDashboard.tsx:46` 카드 "신상신고 승인" | **노출됨** | 허브의 6카드 중 2번째 |
| Guard | `AdminProtectedRoute requiredPermissions={['yaksa-admin.reports.review']}` | 선언만 존재 | `requiredRoles` **없음** |
| 실효 접근 역할 | `admin` · `administrator` · `super_admin` · `operator` · `platform:super_admin` **및 모든 서비스 접두 `*:admin` / `*:operator`** | **넓음** | `packages/auth-context/src/adminRouteAccess.ts` — 백엔드가 `user.permissions` 를 공급하지 않아 permission 검사는 관리자급 역할 게이트로 fallback |
| AppRouteGuard | 없음 | — | 형제 `/admin/yaksa-hub` 와 달리 앱 비활성 차단이 없다 |

**도달성 결론:** 메뉴 → 허브 → 카드 클릭의 3단계로 **정상 도달**한다. 화면은 렌더되고, 첫 `useEffect` 에서 곧바로 목록 API 를 호출해 실패한다.

> **경계 관찰(참고):** 형제 `/admin/yaksa/members` 는 `requiredRoles={PLATFORM_ADMIN_ROLES}` 로 좁혀져 있으나, 본 화면은 좁혀지지 않았다. 다만 백엔드 endpoint 자체가 없어 **현재 데이터 노출은 발생하지 않는다.** 복구를 선택할 경우 이 경계를 먼저 정해야 한다(§9).

---

## 4~5. 4개 API 호출 전수 · 기대 계약

호출 helper: `apps/admin-dashboard/src/lib/api/yaksaAdmin.ts` — `apiClient` (`lib/api-client.ts`, `baseURL = VITE_API_URL || https://api.neture.co.kr`, `withCredentials`, Bearer 자동 첨부).

| # | Method | 최종 요청 URL | 호출 위치 | 요청 | 기대 응답 | 표시 영역 | 현재 결과 |
|---|---|---|---|---|---|---|---|
| 1 | GET | `https://api.neture.co.kr/api/v1/yaksa/reports?status={tab}` | `yaksaAdmin.ts:217` ← `ReportReviewPage.tsx:58` (`loadReports`, mount 시 + 탭 변경 시 + 새로고침 버튼) | query `status` (DRAFT\|REVIEWED\|APPROVED\|REJECTED) · 선택 `reportType`·`page`·`limit` | `ReportListResponse` = `{success, data: YaksaReport[], total, page, limit}` | `BaseTable` (신고유형·회원·상태·제출일·승인/반려 버튼) | **404** |
| 2 | GET | `.../api/v1/yaksa/reports/{reportId}` | `yaksaAdmin.ts:225` (`getReportDetail`) | path `reportId` | `{success, data: YaksaReport}` | — | **404** — 단, **저장소 전체에 소비처 0** (미사용 export) |
| 3 | POST | `.../api/v1/yaksa/reports/{reportId}/approve` | `yaksaAdmin.ts:233` ← `ReportReviewPage.tsx:73` (승인 버튼) | body 없음 | `{success: boolean}` | 성공 시 목록 재조회 / 실패 시 "승인 처리 중 오류" 배너 | **404** (구조상 — §6) |
| 4 | POST | `.../api/v1/yaksa/reports/{reportId}/reject` | `yaksaAdmin.ts:241` ← `ReportReviewPage.tsx:90` (반려 모달) | body `{reason: string}` (필수·프런트 검증) | `{success: boolean}` | 성공 시 모달 닫고 재조회 / 실패 시 "반려 처리 중 오류" 배너 | **404** (구조상 — §6) |

**loading·empty·error 처리:** `isLoading` 스켈레톤 · `emptyMessage` · `error` 배너 모두 구현되어 있다. 즉 **화면은 실패해도 크래시하지 않고 "데이터를 불러올 수 없습니다" 배너만 표시**한다 — 사용자에게는 "빈 화면"으로 보인다.

**기대 type 원본:** `YaksaReport { id, memberId, memberName?, status: DRAFT|REVIEWED|APPROVED|REJECTED, reportType: PROFILE_UPDATE|LICENSE_CHANGE|WORKPLACE_CHANGE|AFFILIATION_CHANGE, confidence?, createdAt, updatedAt }` (`yaksaAdmin.ts:61-72`)

---

## 6. 호출별 404 원인

### 6-1. 원인 확정 — **backend route 자체가 없음** (4건 전부 동일)

| 근거 | 실측 |
|---|---|
| 의도된 backend | `@o4o/reporting-yaksa` 의 `createYaksaReportRoutes()` — `/stats`, `/`, `/:id`, `/from-post/:postId`, `/:id`(PUT), `/:id/approve`, `/:id/reject`, `/:id/submit`, `/:id/retry`, `/:id/submission` 11 endpoint. **프런트 4호출과 계약이 정확히 일치**한다 |
| 그런데 그 소스가 | `git ls-files \| grep reporting-yaksa` → **0건.** `packages/reporting-yaksa/` 에는 `dist/` 와 `node_modules/` 뿐이고 `src/`·`package.json` 이 없다 (로컬에 남은 **과거 빌드 산출물**) |
| 워크스페이스 의존 선언 | `@o4o/reporting-yaksa` 를 dependency 로 선언한 `package.json` **0건** |
| mount | `register-routes.ts:376` — `// 15. Reporting routes (/api/reporting) - @o4o/reporting-yaksa` 가 **"Still disabled (Phase R2)"** 주석 블록 안에 있다. `app.use` 없음 |
| entity 등록 | `database/entities.ts:537 / 1022` — "DOMAIN ENTITIES REMOVED (Phase R1)" 로 `AnnualReport·ReportFieldTemplate·ReportLog·ReportAssignment` 명시적 제외 |
| migration | 저장소 전체에 신고서 테이블 migration **0건** |
| 운영 DB 테이블 | **없음** (§7-2) |

### 6-2. 404 vs 401·403 은폐 구분 (프로덕션 실측, unauthenticated GET)

| 요청 | 응답 | 해석 |
|---|:---:|---|
| `GET /api/v1/yaksa/reports` | **404** | route 부재 |
| `GET /api/v1/yaksa/reports/stats` | **404** | route 부재 |
| `GET /api/v1/yaksa/reports/{id}` | **404** | route 부재 |
| `GET /api/reporting/reports` | **404** | reporting router 미mount |
| `GET /api/reporting/yaksa/reports` | **404** | 〃 |
| `GET /api/v1/membership/members` (대조군) | **401** | **mount 된 guard 라우트는 401 을 준다** → 404 는 은폐가 아님 |
| `GET /health` (대조군) | **200** | 서버 정상 |

**대조군 401 이 나온다는 사실이 "guard 가 404 로 은폐"를 배제한다.**

POST 2건(`/approve`·`/reject`)은 **프로덕션에 전송하지 않았다.** 쓰기 side effect 가 있을 수 있는 요청을 감사에서 보내지 않는다는 원칙이며, 애초에 해당 prefix 를 처리하는 router 가 mount 되지 않았으므로 method 불일치 가능성은 구조적으로 배제된다(Express 는 미매칭 prefix 를 method 무관하게 404 처리).

### 6-3. 제외된 원인

| 후보 원인 | 배제 근거 |
|---|---|
| prefix·mount 불일치 | 어떤 prefix 로도 mount 되지 않음. `/api/reporting/*` 도 404 |
| method 불일치 | 위와 동일 |
| frontend 의 오래된 URL | 프런트 URL 은 `createYaksaReportRoutes` 의 JSDoc 표기(`/api/v1/yaksa/reports/*`)와 **정확히 일치**. 프런트가 틀린 게 아니라 backend 가 없다 |
| guard 의 404 은폐 | §6-2 대조군 401 |
| 환경·service scope 차이 | mount 코드가 환경 분기 없이 주석 처리 |
| **제거된 legacy `/api/v1/yaksa/*` 에 대한 잔존 호출** | **아니다.** `69d853f0b` 로 제거한 12 endpoint 는 `posts`·`categories`·`admin/*` 뿐이며 `reports` 는 포함된 적이 없다. 제거 **이전에도** 이 4호출은 404 였다 |

---

## 7. 데이터 원천과 집계 기준

### 7-1. 업무 의미

"신상신고" = 약사 회원이 매년 제출하는 **인적사항·면허·근무지·소속 변경 신고서**. 화면의 역할은 **집계 리포트가 아니라 결재(검토→승인/반려)** 다. 통계·기간집계·다운로드 기능은 없다.

의도된 데이터 원천(`@o4o/reporting-yaksa` dist 기준):

| entity | 역할 |
|---|---|
| `YaksaReport` / `YaksaReportHistory` | forum-yaksa RPA 기반 신고서 본문·이력 (`status`, `reportType`, `confidence`, `organizationId`, `submissionStatus`, `submissionRetryCount`) |
| `AnnualReport` | 연도별 신상신고서 (회원용 `my-report` 계열) |
| `ReportFieldTemplate` / `ReportAssignment` / `ReportLog` | 서식·배정·감사로그 |
| 연계 | `MembershipSyncService` (승인 시 membership 반영) · `yaksa-scheduler/reporting-handlers.ts` (승인 후 외부 제출 재시도·마감 알림) |

### 7-2. 운영 DB 실측 (read-only SELECT 1회)

`information_schema.tables` 에서 `%report%` 또는 `yaksa%` 매칭 — 결과 **9개, 전부 회원·게시판 계열이며 신고서 테이블은 0개**:

```
yaksa_categories, yaksa_member_affiliations, yaksa_member_categories,
yaksa_member_verifications, yaksa_members, yaksa_membership_roles,
yaksa_membership_years, yaksa_post_logs, yaksa_posts
```

`yaksa_reports` · `annual_reports` · `report_*` **전무.**
→ **운영 데이터 0. 복구해야 할 사용자 데이터가 존재하지 않는다.**

접속: `cloud-sql-proxy` → `netureyoutube:asia-northeast3:o4o-platform-db`, **이 세션 전용 포트 5451**(병렬 세션 미간섭). 자격증명은 Cloud Run 리비전 env 에서 런타임에만 읽었고 사용 후 즉시 삭제했으며 문서·커밋에 남기지 않았다. **SELECT 1회 외 어떤 쿼리도 실행하지 않았고 write 는 0이다.**

### 7-3. 입력측(제출) 경로도 부재

| 위치 | 상태 |
|---|---|
| `services/web-kpa-society/src/pages/mypage/PersonalStatusReportPage.tsx` | 회원용 신상신고 제출 화면이 존재하나 **전부 Mock** (`mockPreviousReports` 하드코딩, `handleSubmit` 은 `setTimeout(1500)` 후 성공 토스트만). **라우팅도 되어 있지 않다** (외부 참조 0) |
| `apps/main-site/src/pages/member/MemberHome.tsx:179` | `authClient.api.get('/reporting/my-report')` — 동일하게 404 |

**즉 승인 대상 신고서를 만들어 낼 경로가 플랫폼 어디에도 없다.** 백엔드를 붙여도 목록은 영구히 비어 있다.

---

## 8. 기존 API 후보 비교

| 실패 API | 현행 후보 | 기능 | 응답 | 권한 | 집계·Side effect | 판단 |
|---|---|---|---|---|---|---|
| `GET /yaksa/reports` | `GET /api/v1/membership/members` | **회원 명부** 조회 | `PendingMember[]` (name·licenseNumber·organizationId·verificationStatus) | `MEMBERSHIP_ADMIN_ROLES=['platform:super_admin']` | 없음 | ❌ **연결 불가** — 대상 엔티티가 다름(회원 ≠ 신고서). `reportType`·`confidence`·신고 payload 없음 |
| `GET /yaksa/reports` | `GET /api/v1/membership/verifications` (Verifications 화면) | **회원 신원 확인** 승인 | `MemberVerification[]` | 동일 | 승인 시 회원 검증 상태 변경 | ❌ **연결 불가** — 선행 IR 이 이미 "승인 대상 도메인 상이(회원신원 vs 신상신고)" 로 판정(`IR-O4O-ADMIN-MENU-AND-ROUTE-NEXT-BATCH-SELECTION-V1 §7-1`) |
| `GET /yaksa/reports` | `GET /api/v1/kpa/operator/approvals` | 콘텐츠·사이니지 승인 큐 | 콘텐츠 자산 | KPA operator | 승인 시 콘텐츠 게시 | ❌ **연결 불가** — 동일 IR 이 "대상 도메인 상이" 로 판정 |
| `GET /yaksa/reports` | `GET /api/reporting/reports` (`@o4o/reporting-yaksa` `AnnualReportController.list`) | **정확히 같은 도메인** | `AnnualReport[]` (연도 기반, `YaksaReport` 와 스키마 상이) | 미정의 | — | ❌ **연결 불가** — **같은 미존재 패키지**. 프로덕션 404 실측 |
| `POST /yaksa/reports/:id/approve` · `/reject` | `PATCH /api/v1/membership/verifications/:id/approve` · `/reject` | 회원 신원 승인·반려 | `{success}` | `platform:super_admin` | **membership 검증 상태를 직접 변경** | ❌ **연결 금지** — 이름은 유사하나 **승인하는 대상이 다르다.** 잘못 연결하면 신고서 승인 클릭이 **회원 자격을 승인**해 버린다 |
| 전체 | `@o4o/lms-yaksa` · `@o4o/annualfee-yaksa` · 현행 forum API | 교육·회비·게시판 | — | — | — | ❌ 도메인 무관 |

**결론: 계약이 일치하는 현행 API 후보는 0건.** 이름 유사성으로 `membership/verifications` 에 연결하는 것은 **업무 의미가 다르고 side effect 가 위험**하므로 명시적으로 금지한다.

---

## 9. 현재 역할 · membership · organization 권한 경계

| 축 | 현재 상태 | 복구 시 결정 필요 사항 |
|---|---|---|
| 프런트 route | `requiredPermissions=['yaksa-admin.reports.review']` 만 선언. permission 미공급 → **관리자급 + 모든 서비스 접두 `*:admin`/`*:operator`** 통과 | 형제 `/admin/yaksa/members` 처럼 `requiredRoles` 로 좁힐지 결정 |
| 백엔드 guard | **없음** (route 자체가 없음) | 새로 설계해야 함 |
| 조직 경계 | `YaksaReport` dist 에 `organizationId` 컬럼이 있고 scheduler 핸들러가 `report.organizationId = :orgId OR :orgId IS NULL` 로 필터 | **핵심 미결**: 지부/분회 관리자가 **자기 조직 신고서만** 보는가, 플랫폼 관리자가 **전체**를 보는가. 화면 이름은 "지부/분회 관리자 센터" 인데 프런트 필터에 조직 파라미터가 **없다**(`getReports` 는 status·reportType·page·limit 만 전달) |
| membership 경계 | `MembershipSyncService` 로 승인이 회원 정보에 반영되는 설계 | 승인 권한과 회원정보 변경 권한의 결합 정책 필요 |
| F6 Boundary Policy | 신고서는 Community(`organizationId`) 축에 가깝다 | Domain Primary Boundary 확정 필요 |

## 10. 개인정보 · 전체 조직 통계 노출 위험

| 위험 | 현재 | 복구 시 |
|---|:---:|---|
| 화면 표시 항목 | `memberName` · `memberId` · 신고유형 · 상태 · 제출일 | 이름은 **개인정보**. 목록 단계부터 노출된다 |
| 신고서 payload | 화면에 표시 안 함 (상세 화면 없음 — `getReportDetail` 미사용) | 근무지·면허번호 등 **민감도 높은 필드**를 포함하므로 상세를 만들 경우 별도 정책 필요 |
| 전체 조직 노출 | 현재 요청에 조직 필터가 없어, 백엔드가 조직 필터를 강제하지 않으면 **모든 지부의 회원 신고서가 한 화면에 노출**된다 | **반드시 서버측 조직 강제 필터**가 선행돼야 함 |
| 현재 실제 노출 | **0** — endpoint 부재 + 테이블 부재 | — |
| export | 없음 | — |

**현재 시점의 실제 개인정보 노출 위험은 0** 이다. 위험은 전부 "복구를 선택할 경우" 의 선행 조건이다.

---

## 11. 호출별 판정

| 대상 | 판정 | 핵심 근거 | 필요한 변경 |
|---|:---:|---|---|
| `GET /api/v1/yaksa/reports` | **IMPLEMENT_MISSING** (조건부) | 계약 일치 현행 API 0건. 패키지 소스·테이블 전무 | 패키지 재작성 + entity + migration + 조직 경계 guard |
| `GET /api/v1/yaksa/reports/:id` | **REMOVE_UI** (helper) | **소비처 0** — 화면이 상세를 쓰지 않는 미사용 export | `yaksaAdmin.ts:224` `getReportDetail` 제거 (화면 무관, 무해) |
| `POST /api/v1/yaksa/reports/:id/approve` | **IMPLEMENT_MISSING** (조건부) | 위와 동일 + 승인은 membership 동기화 side effect 설계 필요 | 〃 |
| `POST /api/v1/yaksa/reports/:id/reject` | **IMPLEMENT_MISSING** (조건부) | 위와 동일 | 〃 |

## 12. 화면 전체 판정 — **HOLD**

**HOLD 로 두는 이유 (WO 의 HOLD 기준에 정확히 해당):**

1. **업무 소유자 미확정** — 신상신고가 KPA 의 **현재 유효한 업무**인지 코드·현행 문서로 확정할 수 없다. 대한약사회 정관상 연례 의무라는 서술은 있으나(`PersonalStatusReportPage`), 플랫폼이 이 업무를 수행하기로 한 결정인지 폐기한 결정인지는 기록되어 있지 않다.
2. **조직 경계 미확정** — 지부/분회별 조회인지 플랫폼 전역인지 결정할 수 없다(§9).
3. **판단 규모 불균형** — `CONNECT_EXISTING` 은 배제되었고, `IMPLEMENT_MISSING` 은 **패키지 재작성 + 스키마 신설 + 회원 제출 경로 신설 + 권한/개인정보 정책 수립**으로 사실상 신규 도메인 구축이다. 이는 404 복구가 아니라 **신규 기능 개발 착수 결정**이므로 감사가 단독 판정할 사안이 아니다.

**감사의 권고(참고용, 결정 아님):** 신상신고를 당분간 플랫폼 업무로 채택하지 않는다면 **REMOVE_UI** 가 옳다. 현재 상태는 관리자가 메뉴에서 정상 도달했는데 항상 "데이터를 불러올 수 없습니다" 만 보는 화면이고, 승인·반려 버튼은 누를 때마다 실패하기 때문이다. 제거 대상은 이 화면 하나가 아니라 **신상신고 도메인 UI 군 전체**로 함께 판단해야 한다(§13).

---

## 13. 후속 구현 · 연결 · 제거 범위

### 13-A. REMOVE 를 택할 경우 — 함께 다뤄야 할 동일 도메인 잔존물 (이번 작업에서 변경 0)

| # | 대상 | 상태 |
|---|---|---|
| 1 | `/admin/yaksa/reports` route + `pages/yaksa-admin/ReportReviewPage.tsx` | 라우팅·메뉴 도달 가능, API 404 |
| 2 | `YaksaAdminDashboard.tsx:41-48` "신상신고 승인" 카드 | 위 화면으로만 연결 |
| 3 | `yaksaAdmin.ts:211-243` reports 4 helper + `YaksaReport`·`ReportListResponse` type | 그중 `getReportDetail` 은 이미 소비처 0 |
| 4 | `/admin/reporting` · `/admin/reporting/dashboard` · `/admin/reporting/reports` · `/admin/reporting/templates` (4 route) + `pages/reporting/**` 3화면 | `authClient.api.get('/reporting/*')` → **동일하게 404**. 단, 메뉴 링크 없음 |
| 5 | `apps/main-site/src/pages/member/MemberHome.tsx:179` `/reporting/my-report` | 404 호출 |
| 6 | `services/web-kpa-society/.../PersonalStatusReportPage.tsx` | 전부 Mock + 미라우팅 |
| 7 | `packages/yaksa-scheduler/src/handlers/reporting-handlers.ts` | `YaksaReport` repository 를 문자열로 조회 — entity 미등록 상태에서 실행되면 실패. 스케줄러 job 등록 여부 별도 확인 필요 |
| 8 | `register-routes.ts:376` · `entities.ts:537/1022` 주석 | 부재 사실을 기록한 주석 — 정리 시 lockstep |
| 9 | `packages/reporting-yaksa/` · `apps/api-server/packages/reporting-yaksa/` 로컬 `dist` | **git 미추적**. 삭제 대상 아님(로컬 산출물) |

### 13-B. IMPLEMENT 를 택할 경우 — 선행 결정 사항

1. 조직 경계(지부/분회 vs 플랫폼 전역) 확정 → 서버측 강제 필터 설계
2. 승인 주체 역할 확정 + 프런트 `requiredRoles` 정렬
3. 개인정보 표시 범위·상세 화면 정책
4. **회원 제출 경로 신설** (없으면 승인 큐가 영구히 빔)
5. entity·migration 신설 (F12/F6 기준 준수)
6. `MembershipSyncService` 상당의 승인→회원정보 반영 side effect 계약

### 13-C. 즉시 무해하게 처리 가능한 1건

`getReportDetail` (`yaksaAdmin.ts:224`) — 소비처 0 의 미사용 export. 어느 방향으로 결정되든 제거 가능. **이번 감사에서는 변경하지 않았다.**

---

## 14. 현행 Yaksa 기능 무영향 확인

| 대상 | 확인 |
|---|:---:|
| `/api/v1/membership` | mount 유지 · 프로덕션 401(정상 guard) |
| `/api/v1/lms-yaksa` (`@o4o/lms-yaksa` manifest routePrefix) | 미접촉 |
| 현행 forum API `/api/v1/forum` | 미접촉 |
| `@o4o/membership-yaksa` · `@o4o/forum-yaksa` · `@o4o/lms-yaksa` · `@o4o/annualfee-yaksa` | 미접촉 |
| `/admin/yaksa/*` 실서비스 라우트 | 미접촉 |
| 죽은 JWT scope | **복구하지 않았다** |
| 제거된 `/api/v1/yaksa/*` 12 endpoint | **복구 대상으로 선택하지 않았다** (§6-3) |

## 15. 코드 · DB · migration · 권한 · 배포 변경 0

| 항목 | 결과 |
|---|:---:|
| 소스 코드 변경 | **0** |
| frontend URL 변경 | **0** |
| backend route·controller 구현 | **0** |
| 메뉴·route·화면 제거 | **0** |
| 권한·guard 변경 | **0** |
| schema·migration·seed | **0** |
| 운영 DB write | **0** (read-only SELECT 1회만) |
| 계정·역할·membership 변경 | **0** |
| 배포 | **0** |
| `pnpm-lock.yaml` | 미변경 |
| 프로덕션 POST/PUT/DELETE 요청 | **0** (GET 7건만) |

## 16. 타 세션 WIP 보존

`apps/api-server/src/scripts/**` 69건 미접촉. Cloud SQL Proxy 는 **이 세션이 시작한 PID 만** 종료했고 프로세스명 일괄 종료를 사용하지 않았다. 임시 자격증명 파일은 삭제했다.

## 17. CHECK 경로

`docs/checks/WO-O4O-YAKSA-REPORTS-ROUTED-UI-API-CONTRACT-AND-404-RECOVERY-AUDIT-V1-CHECK.md` (본 문서)

## 18. commit · push · ahead/behind

> commit 직후 값으로 채운다.

---

## 핵심 완료 문장

`/admin/yaksa/reports` 의 실제 도달성과 4개 실패 API 계약을 조사하여 404 원인을 확정하고, 기존 API 연결·신규 구현·화면 제거·보류 중 적절한 처분을 결정했다. 이번 감사에서는 production 코드와 운영 데이터에 어떠한 변경도 하지 않았다.
