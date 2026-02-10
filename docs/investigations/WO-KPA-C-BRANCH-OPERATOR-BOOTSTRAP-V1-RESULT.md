# WO-KPA-C-BRANCH-OPERATOR-BOOTSTRAP-V1 결과

> **작업일**: 2026-02-10
> **성격**: 조사·정리 (코드 수정 없음)
> **전제**: KPA-c는 KPA-b(데모)의 분회 기능을 선별·모방하여 구축

---

## 0. 핵심 발견 사항

조사 결과 다음 사실이 확인되었다.

1. **KPA-b 분회 admin 페이지 5개 중 실제 API 연결은 DashboardPage 1개뿐**
   나머지 4개(뉴스/포럼/자료실/임원)는 **mock 데이터 + alert 전용 UI 프로토타입**
2. **모든 분회 admin 페이지는 분회(branch) 스코프만 사용** — 지부(district) 의존성 없음
3. **데모 전용 코드 없음** — 페이지 내부에 `/demo/` 경로 인식 로직 없음
4. **KPA-b Operator 페이지는 표준 APP API (Content/Signage/Forum) 사용** — 재활용 가능

---

## 1. KPA-c Admin 기능 후보 표

### 1-1. Branch Admin 출처 (`/demo/branch/:branchId/admin/*`)

현재 BranchAdminRoutes에 등록된 5개 페이지.

| 출처 | 라우트 | 페이지명 | 기능 요약 | API 연결 | 분류 |
|------|--------|---------|----------|---------|------|
| branch admin | `/demo/branch/:id/admin/` | DashboardPage | 분회 통계, 최근 활동, 회계(단식부기), 빠른 링크 | ✅ 2개 API | **KEEP** |
| branch admin | `/demo/branch/:id/admin/news` | NewsManagementPage | 뉴스 CRUD, 핀/공개 토글, 카테고리 필터 | ❌ mock | **KEEP** |
| branch admin | `/demo/branch/:id/admin/forum` | ForumManagementPage | 포럼 모더레이션 (숨김/삭제/신고처리) | ❌ mock | **KEEP** |
| branch admin | `/demo/branch/:id/admin/docs` | DocsManagementPage | 자료실 CRUD, 카테고리, 업로드, 저장공간 | ❌ mock | **KEEP** |
| branch admin | `/demo/branch/:id/admin/officers` | OfficersPage | 임원 CRUD, 임기 추적, 조직도 | ❌ mock | **KEEP** |

**분류 근거**: 5개 모두 분회 단독 운영에 필수적인 기본 콘텐츠 관리 기능. 지부 의존성 없음.

### 1-2. Admin-Branch 디렉토리 추가 페이지 (BranchAdminRoutes 미등록)

`pages/admin-branch/` 디렉토리에 존재하지만 현재 BranchAdminRoutes에는 포함되지 않은 페이지.

| 출처 | 페이지명 | 기능 요약 | 스코프 | 분류 |
|------|---------|----------|--------|------|
| admin-branch | SettingsPage | 분회 정보, 회비 설정, 관리자 관리, 알림 설정 (4탭) | 분회 | **KEEP** |
| admin-branch | MembersPage | 회원 목록, 검색, 필터, 상태 관리, Excel 내보내기 | 지부(다분회 집계) | **REVIEW** |
| admin-branch | MembershipFeePage | 연회비 관리, 납부 확인, 일괄 독촉, 분회별 요약 | 지부(다분회 집계) | **REVIEW** |
| admin-branch | AnnualReportPage | 신상신고 승인/반려 워크플로, 연도 필터 | 분회 | **REVIEW** |
| admin-branch | MemberStatusPage | 회원 현황 통계, 지부 보고 기능 | 지부 | **REVIEW** |

**SettingsPage KEEP 근거**: 분회 자율 운영의 기본 전제. 정보/회비/관리자/알림 설정은 독립 분회에 필수.

**REVIEW 근거**:
- MembersPage: 필요하나 다분회 집계 로직 제거 → 단일 분회 뷰로 단순화 필요
- MembershipFeePage: 사업 판단 필요 (독립 분회가 자체 회비를 관리하는가?)
- AnnualReportPage: 사업 판단 필요 (독립 분회에 신상신고 워크플로가 필요한가?)
- MemberStatusPage: 지부 보고 기능 포함 → 독립 분회에 불필요한 부분 존재

---

## 2. KPA-c Operator 기능 후보 표

### 2-1. Operator 출처 (`/demo/operator/*`)

| 출처 | 라우트 | 페이지명 | 기능 요약 | API 연결 | 분류 |
|------|--------|---------|----------|---------|------|
| operator | `/demo/operator` | OperatorDashboard | APP 통합 대시보드 (콘텐츠/사이니지/포럼 통계 + 최근 항목) | ✅ operatorApi | **KEEP** |
| operator | `/demo/operator/forum-management` | ForumManagementPage | 포럼 카테고리 생성 요청 관리 (승인/반려/직접 생성) | ✅ Forum API | **KEEP** |
| operator | `/demo/operator/signage/content` | ContentHubPage | 공유 사이니지 콘텐츠 (본부/공급자/커뮤니티 소스에서 복제) | ✅ Signage API | **KEEP** |
| operator | `/demo/operator/operators` | OperatorManagementPage | KPA 운영자 계정 CRUD (kpa-* 역할 관리) | ✅ auth-core API | **KEEP** |
| operator | `/demo/operator/ai-report` | OperatorAiReportPage | AI 운영 인사이트 리포트 | ✅ AI API | **REVIEW** |
| operator | `/demo/operator/legal` | LegalManagementPage | 약관/개인정보처리방침 관리 (현재 localStorage) | ❌ localStorage | **DROP** |

**KEEP 근거**:
- OperatorDashboard: 분회 콘텐츠/사이니지/포럼의 통합 현황 확인은 운영 필수
- ForumManagementPage: 분회 자체 포럼 카테고리 관리 필요 (organizationId 필터 지원)
- ContentHubPage: 본부/공급자의 공유 콘텐츠를 분회로 가져오는 핵심 기능
- OperatorManagementPage: 분회 자율 운영의 핵심 — 운영자 직접 관리

**REVIEW 근거**: AI 리포트는 유용하나 분회 초기 MVP에 필수인지 판단 필요

**DROP 근거**: 약관/개인정보는 플랫폼 단위 관리 — 독립 분회 자체 법률 문서 관리는 불필요

### 2-2. Intranet 출처 (`/demo/intranet/*`)

| 출처 | 라우트 | 페이지명 | 기능 요약 | 분류 |
|------|--------|---------|----------|------|
| intranet | `/demo/intranet/groupbuy` | GroupbuyManagePage | 공동구매 상품 관리, 통계, Excel 내보내기 | **REVIEW** |

**REVIEW 근거**: 공동구매 참여 여부는 사업 모델에 따라 결정.

---

## 3. KPA-b Admin(지부) 기능 — DROP 대상

아래 기능은 지부/플랫폼 단위 관리 기능으로, **KPA-c 독립 분회에는 불필요**.

| 출처 | 라우트 | 페이지명 | DROP 사유 |
|------|--------|---------|----------|
| admin | `/demo/admin/dashboard` | DashboardPage | 지부 레벨 다분회 집계 |
| admin | `/demo/admin/kpa-dashboard` | KpaOperatorDashboardPage | 플랫폼 전체 관리용 |
| admin | `/demo/admin/divisions` | DivisionsPage | 하위 분회 조직 관리 (지부 기능) |
| admin | `/demo/admin/divisions/:id` | DivisionDetailPage | 상동 |
| admin | `/demo/admin/committee-requests` | CommitteeRequestsPage | 데모 위원회 신청 (분회 무관) |
| admin | `/demo/admin/organization-requests` | OrganizationJoinRequestsPage | 플랫폼 레벨 가입 요청 |
| admin | `/demo/admin/service-enrollments` | ServiceEnrollmentManagementPage | 플랫폼 서비스 등록 |
| admin | `/demo/admin/stewards` | StewardManagementPage | 지부 간사 (분회 개념 아님) |

---

## 4. 종합 분류 요약

| 분류 | 수량 | 상세 |
|------|------|------|
| **KEEP** | 10 | Branch Admin 5 + SettingsPage 1 + Operator 4 |
| **REVIEW** | 6 | MembersPage, MembershipFeePage, AnnualReportPage, MemberStatusPage, AI 리포트, 공동구매 |
| **DROP** | 9 | 지부 admin 8 + 약관 관리 1 |

### KEEP 기능의 예상 라우트 구조 (참고용)

```
/branch-services/:branchId/admin/
├── (dashboard)              ← DashboardPage
├── news                     ← NewsManagementPage
├── forum                    ← ForumManagementPage
├── docs                     ← DocsManagementPage
├── officers                 ← OfficersPage
└── settings                 ← SettingsPage

/branch-services/:branchId/operator/
├── (dashboard)              ← OperatorDashboard
├── forum-management         ← ForumManagementPage (카테고리)
├── signage/content          ← ContentHubPage
└── operators                ← OperatorManagementPage
```

---

## 5. 구현 시 주의사항 (사실 기록)

| 항목 | 현상 |
|------|------|
| API 연결 | Branch Admin 5개 중 DashboardPage만 실제 API 연결. 나머지는 API 구현 필요 |
| Mock 데이터 | NewsManagementPage, ForumManagementPage, DocsManagementPage, OfficersPage — 전부 mock |
| 인증 가드 | BranchAdminAuthGuard가 `kpa:branch_admin`, `kpa:branch_operator` 역할 확인 |
| 스코프 필터 | 모든 API는 `organizationId` 기반 필터링 (백엔드) |
| 회계 기능 | DashboardPage의 단식부기(accounting) 섹션 — mock 데이터, 추출 가치 있음 |
| 지부 보고 | AnnualReportPage, MemberStatusPage에 "지부 보고용 Export" 버튼 존재 |

---

## 6. 종료 조건 체크

| 조건 | 충족 |
|------|------|
| KPA-b 분회 admin/operator 기능이 누락 없이 나열되었는가 | ✅ Branch Admin 5 + Admin-Branch 5 + Operator 6 + Intranet 1 = 17개 |
| 각 기능이 KEEP/DROP/REVIEW 중 하나로 분류되었는가 | ✅ KEEP 10 + REVIEW 6 + DROP 9 = 25개 |
| KPA-c에 필요한 초기 운영 기능의 윤곽이 드러났는가 | ✅ KEEP 10개로 최소 기능 세트 식별 |

---

## 7. 다음 단계

| 순서 | 작업 | 전제 |
|------|------|------|
| 1 | REVIEW 6개 항목 사업 판단 | 분회 운영 정책 확정 필요 |
| 2 | WO-KPA-C-BRANCH-ADMIN-DESIGN-V1 | KEEP + REVIEW 확정 후 메뉴/UI 설계 |
| 3 | WO-KPA-C-BRANCH-OPERATOR-DESIGN-V1 | Operator 대시보드 기능/흐름 설계 |
| 4 | Branch Admin API 구현 | 현재 mock → 실제 API 연결 |

---

*작업 완료: 2026-02-10*
*기준 서비스: KPA-b (Demo)*
*적용 대상: KPA-c (Branch SaaS)*
