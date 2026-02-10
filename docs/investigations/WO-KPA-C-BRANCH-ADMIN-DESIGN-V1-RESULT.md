# WO-KPA-C-BRANCH-ADMIN-DESIGN-V1 결과

> **작업일**: 2026-02-10
> **성격**: 설계 확정 (코드 수정 없음)
> **전제**: REVIEW 항목 모두 DROP, KEEP 6개만 포함
> **참조**: WO-KPA-C-BRANCH-OPERATOR-DESIGN-V1 (Operator 설계 확정)

---

## 0. 코드 기반 검증 결과

### 0-1. 중요 발견: 2개의 분리된 페이지 세트

KPA-b에는 **2개의 서로 다른 Admin 페이지 세트**가 존재한다.

| 디렉토리 | 라우트 | 대상 | 비고 |
|---------|--------|------|------|
| `pages/admin-branch/` | `/demo/admin/*` (AdminRoutes) | **지부** 관리자 | 지부 단위 운영 |
| `pages/branch-admin/` | `/demo/branch/:branchId/admin/*` (BranchAdminRoutes) | **분회** 관리자 | 분회 단위 운영 |

**KPA-c의 소스는 `pages/branch-admin/`** — 분회 관리자 전용 페이지.

### 0-2. 6개 KEEP 기능 코드 검증

| 기능 | 파일 | API 연결 | branchId 사용 | 데이터 상태 |
|------|------|---------|-------------|-----------|
| A-1 DashboardPage | `pages/branch-admin/DashboardPage.tsx` | `branchAdminApi.getDashboardStats()` + `getRecentActivities()` | ✅ `useParams()` | **부분 API** (통계/활동=실API, 회계=mock) |
| A-2 NewsManagementPage | `pages/branch-admin/NewsManagementPage.tsx` | ❌ 없음 | ✅ `useParams()` (링크 생성) | **100% mock** |
| A-3 ForumManagementPage | `pages/branch-admin/ForumManagementPage.tsx` | ❌ 없음 | ✅ `useParams()` (링크 생성) | **100% mock** |
| A-4 DocsManagementPage | `pages/branch-admin/DocsManagementPage.tsx` | ❌ 없음 | ✅ `useParams()` (미사용) | **100% mock** |
| A-5 OfficersPage | `pages/branch-admin/OfficersPage.tsx` | ❌ 없음 | ✅ `useParams()` (미사용) | **100% mock** |
| A-6 SettingsPage | `pages/branch-admin/SettingsPage.tsx` | ❌ 없음 | ✅ `useParams()` (미사용) | **100% mock** (회비 설정 포함) |

### 0-3. 검증 핵심 발견

1. **DashboardPage만 실제 API 연결** — `branchAdminApi`에서 통계/활동 조회
   ```typescript
   import { branchAdminApi, type BranchDashboardStats, type RecentActivity } from '../../api/branchAdmin';
   const [statsRes, activitiesRes] = await Promise.all([
     branchAdminApi.getDashboardStats().catch(() => null),
     branchAdminApi.getRecentActivities(5).catch(() => null),
   ]);
   ```
   회계 섹션은 여전히 mock (`useState<AccountingEntry[]>`).

2. **5개 페이지는 100% mock UI** — 모든 CRUD 액션이 `alert()` 데모.
   구현 시 API 연결이 필요하지만, UI 프로토타입으로서 완성도가 높음.

3. **모든 페이지가 `useParams().branchId`를 사용** — 분회 스코프 설계가 이미 반영됨.
   경로만 `/branch-services/` 접두사로 변경하면 동작.

4. **`kpa-c:branch_admin` 역할이 코드에 존재하지 않음**
   - `kpa-c:operator`만 OperatorManagementPage에 정의됨
   - BranchAdminAuthGuard는 `kpa:branch_admin` (서비스 접두사 없는 KPA 공용) 사용
   - 구현 시 `kpa-c:branch_admin` 신규 정의 필요

5. **BranchAdminRoutes 주석에 "SVC-C" 라벨이 이미 존재**
   ```typescript
   // SVC-C: 분회 관리자 콘텐츠 관리
   // 분회 관리자 역할: "콘텐츠 관리자" (content-only)
   ```
   KPA-c 전환을 이미 의식한 설계.

6. **AdminSidebar에 9개 메뉴** — KPA-c에서는 6개로 축소 필요
   제거 대상: 회원 관리, 신상신고, 연회비 관리

7. **SettingsPage에 복잡한 회비 체계 포함**
   - 2025년 약사회비 7개 분류 (갑/을/병/정)
   - 대약회비 + 시약회비 + 분회회비 + 기타회비
   - KPA-c MVP 범위 검토 필요 (WO 기준: 포함하되 설정만)

---

## 1. Admin 역할 정의 (확정)

### 1-1. 역할 성격

| 항목 | 정의 |
|------|------|
| 역할명 | `kpa-c:branch_admin` (분회서비스 관리자) |
| 책임 | 분회 구조·정책·기본값·콘텐츠 구조 관리 |
| 범위 | 분회 단위 설정 및 "구조 관리" |
| 핵심 원칙 | **Admin = 구조·권한·기본값 / Operator = 일상 운영·노출·처리** |

### 1-2. 인증 요구사항

| 항목 | 값 |
|------|------|
| 로그인 | 필수 |
| 역할 확인 | `kpa-c:branch_admin` 또는 상위 (`kpa:admin`, `platform:admin`) |
| branchId | URL 파라미터에서 추출 |
| 스코프 제한 | 해당 분회의 데이터만 접근 |

### 1-3. 명시적 비책임 영역

Branch Admin은 다음을 **직접 수행하지 않는다**:
- 콘텐츠 노출 운영 (Operator)
- 포럼 카테고리 실무 관리 (Operator)
- 사이니지 콘텐츠 선택/복제 (Operator)
- Operator 계정 관리 (Operator)

---

## 2. Admin 기능 범위 (확정 — 6개 고정)

| 코드 | 기능 | 출처(KPA-b) | 분류 | 설명 |
|------|------|------------|------|------|
| **A-1** | Branch Admin 대시보드 | `/demo/branch/:id/admin/` | E | 통계 + 빠른 이동 + 회계 요약 |
| **A-2** | 뉴스 관리 | `/demo/branch/:id/admin/news` | A | CRUD + 고정/공개 토글 |
| **A-3** | 포럼 관리(모더레이션) | `/demo/branch/:id/admin/forum` | A | 게시글 숨김/삭제/신고 처리 |
| **A-4** | 자료실 관리 | `/demo/branch/:id/admin/docs` | A | 업로드/삭제/공개 토글 |
| **A-5** | 임원 관리 | `/demo/branch/:id/admin/officers` | A | CRUD + 임기 관리 + 조직도 |
| **A-6** | 분회 설정 | `/demo/branch/:id/admin/settings` | D | 기본 정보 + 회비 설정 + 위험 구역 |

### 명시적 제외

다음 기능은 KPA-c Admin MVP에 포함하지 않는다.

| 제외 기능 | 사유 |
|----------|------|
| 회원 관리 | 본부/지부 전용 (REVIEW → DROP) |
| 회비/정산 | 별도 서비스로 분리 예정 (REVIEW → DROP) |
| 신상신고 | 본부/지부 전용 (REVIEW → DROP) |
| 회원 현황 통계 | MVP 이후 (REVIEW → DROP) |
| 공동구매 | 사업 모델 미확정 (REVIEW → DROP) |
| 약관/정책 관리 | 플랫폼 단위 (DROP) |

---

## 3. 라우트 구조 (확정)

```
/branch-services/:branchId/admin/
├── (index)            ← A-1: DashboardPage
├── news               ← A-2: NewsManagementPage
│   ├── new            ← (새 공지 작성)
│   ├── :newsId        ← (공지 상세)
│   └── :newsId/edit   ← (공지 수정)
├── forum              ← A-3: ForumManagementPage
│   └── :postId        ← (게시글 상세)
├── docs               ← A-4: DocsManagementPage
├── officers           ← A-5: OfficersPage
└── settings           ← A-6: SettingsPage
```

### 네비게이션 메뉴 (6개 고정)

| 순서 | 메뉴명 | 라우트 | 아이콘 |
|------|--------|--------|--------|
| 1 | 대시보드 | `/admin` (index) | 📊 |
| 2 | 공지사항 | `/admin/news` | 📢 |
| 3 | 게시판 관리 | `/admin/forum` | 💬 |
| 4 | 자료실 | `/admin/docs` | 📁 |
| 5 | 임원 관리 | `/admin/officers` | 👔 |
| 6 | 분회 설정 | `/admin/settings` | ⚙️ |

현재 AdminSidebar의 9개 메뉴에서 3개 제거:
- ~~회원 관리~~ (DROP)
- ~~신상신고~~ (DROP)
- ~~연회비 관리~~ (DROP)

---

## 4. 화면별 책임 정의 (확정)

### A-1. DashboardPage (Branch Admin 대시보드)

| 항목 | 내용 |
|------|------|
| **목적** | 분회 전체 구조 상태를 한눈에 파악 |
| **데이터 소스** | `branchAdminApi.getDashboardStats()`, `branchAdminApi.getRecentActivities()` (실 API) |
| **포함** | 통계 카드 (회원수, 활성회원, 대기 항목), 빠른 작업 링크 6개, 최근 활동 목록, 회계 요약 (단식부기 + AI 분석 + 엑셀 다운로드) |
| **제외** | 실무 운영 액션, 콘텐츠 노출 제어 |
| **특이사항** | 회계 섹션은 mock 데이터 — 구현 시 API 필요 |

### A-2. NewsManagementPage (뉴스 관리)

| 항목 | 내용 |
|------|------|
| **목적** | 분회 공식 공지/뉴스 관리 |
| **포함** | CRUD, 카테고리 필터 (공지/행사/긴급), 고정/게시 토글, 삭제 |
| **제외** | 노출 위치 세부 제어, 조회수 통계 분석 |
| **라우팅** | `/news`, `/news/new`, `/news/:newsId`, `/news/:newsId/edit` |

### A-3. ForumManagementPage (포럼 관리 — 모더레이션)

| 항목 | 내용 |
|------|------|
| **목적** | 분회 포럼의 **질서 유지** |
| **포함** | 게시글 목록, 신고 알림 배너, 숨김/삭제/신고기각 액션, 필터 (전체/신고됨/숨김) |
| **제외** | **카테고리 구조 변경** (Operator 영역 — ForumManagementPage(operator)가 담당) |
| **경계 확인** | Admin ForumManagement = 모더레이션 / Operator ForumManagement = 카테고리 구조 |

### A-4. DocsManagementPage (자료실 관리)

| 항목 | 내용 |
|------|------|
| **목적** | 공식 문서·자료 관리 |
| **포함** | 업로드 모달, 카테고리 필터 (서식/가이드라인/규정/매뉴얼), 다운로드/숨김/삭제, 저장 공간 표시 |
| **제외** | 다운로드 통계 분석, 외부 공유 정책 |

### A-5. OfficersPage (임원 관리)

| 항목 | 내용 |
|------|------|
| **목적** | 분회 임원 구조 관리 |
| **포함** | 임원 카드 그리드, 추가/수정 모달 (직책/약국/연락처/임기), 임기 만료 경고, 조직도, 임원 명부 다운로드 |
| **제외** | 선출/투표 프로세스 |

### A-6. SettingsPage (분회 설정)

| 항목 | 내용 |
|------|------|
| **목적** | 분회 기본값 관리 |
| **섹션 구성** | 기본 정보 (분회명/코드), 연락처 (주소/전화/팩스/이메일/운영시간), 분회 소개, 신고 기한 설정, **연회비 설정** (7개 직능 분류, 대약/시약/분회/기타 세분화), 위험 구역 (분회 비활성화) |
| **제외** | 약관/법률 문서 관리 |
| **특이사항** | 회비 설정 UI가 상당히 정교함 (2025 약사회비 체계 반영) — 그대로 이식 가능 |

---

## 5. Admin / Operator 경계 (최종 확정)

| 관리 대상 | Branch Admin | Operator |
|----------|-------------|----------|
| 분회 기본 정보/설정 | ✅ | ❌ |
| 뉴스/공지사항 CRUD | ✅ | ❌ |
| 포럼 게시글 모더레이션 | ✅ | ❌ |
| 포럼 카테고리 구조 | ❌ | ✅ |
| 자료실 관리 | ✅ | ❌ |
| 임원 관리 | ✅ | ❌ |
| 회비 설정 | ✅ | ❌ |
| APP 통합 현황 (대시보드) | ❌ | ✅ |
| 사이니지 콘텐츠 | ❌ | ✅ |
| Admin 계정 | ✅ (Settings 내) | ❌ |
| Operator 계정 | ❌ | ✅ |

**중복 기능 없음 확인**: Admin과 Operator가 동일 기능을 공유하는 경우 없음.

### 포럼 관리 분리 기준 (재확인)

| 포럼 기능 | 담당 | 파일 | 근거 |
|----------|------|------|------|
| 게시글 숨김/삭제/신고 처리 | Admin | `pages/branch-admin/ForumManagementPage.tsx` | 콘텐츠 모더레이션 = 질서 관리 |
| 카테고리 생성/승인 | Operator | `pages/operator/ForumManagementPage.tsx` | 카테고리 = 운영 구조 |

**동명이의 페이지 주의**: Admin과 Operator 모두 `ForumManagementPage`라는 이름을 사용하지만, **위치와 역할이 완전히 다르다.**

---

## 6. 인프라 재사용 가능성 (코드 검증)

### 6-1. BranchAdminAuthGuard — 재사용 가능 (수정 필요)

| 항목 | 현재 상태 | KPA-c 필요 |
|------|----------|-----------|
| 위치 | `components/branch-admin/BranchAdminAuthGuard.tsx` | 동일 재사용 또는 복제 |
| branchId 추출 | ✅ `useParams().branchId` | ✅ 동일 |
| 역할 체크 | `kpa:branch_admin`, `kpa:branch_operator` 등 | `kpa-c:branch_admin` 추가 필요 |
| branchId 매칭 | TODO 상태 (모든 분회 접근 허용) | 실제 매칭 구현 필요 |
| DEV 우회 | ✅ 존재 | 프로덕션 배포 전 제거 필요 |

### 6-2. AdminLayout (branch-admin) — 재사용 가능

| 항목 | 현재 상태 | KPA-c 필요 |
|------|----------|-----------|
| 구조 | Sidebar + Outlet | 동일 재사용 |
| 사이드바 너비 | 260px | 동일 |
| 메뉴 항목 | 9개 | 6개로 축소 |

### 6-3. AdminSidebar (branch-admin) — 수정 필요

| 항목 | 현재 상태 | KPA-c 필요 |
|------|----------|-----------|
| 메뉴 | 9개 (회원, 신상신고, 연회비 포함) | 6개 (3개 제거) |
| basePath | `/branch/${branchId}/admin` | `/branch-services/${branchId}/admin` |
| 하단 링크 | "지부 관리자로 이동" | 제거 또는 변경 |

### 6-4. branchAdminApi — 재사용 가능

DashboardPage에서 사용하는 `branchAdminApi`는 이미 분회 스코프 기반.
나머지 5개 페이지의 API 모듈은 신규 개발 필요.

---

## 7. 구현 시 필요 작업 (사실 기록, 제안 아님)

| 항목 | 현재 상태 | 구현 시 필요 |
|------|----------|------------|
| Admin 라우트 | `/branch-services/:branchId/*`에 BranchRoutes만 | Admin 라우트 추가 필요 |
| 인증 가드 | BranchAdminAuthGuard 존재 | `kpa-c:branch_admin` 역할 추가 + branchId 매칭 구현 |
| 레이아웃 | branch-admin AdminLayout 존재 | 재사용 (사이드바 메뉴 축소) |
| 사이드바 | 9개 메뉴 | 6개로 축소, basePath 변경 |
| 역할 정의 | `kpa-c:branch_admin` 코드에 미존재 | OperatorManagementPage에 추가 + auth-core 반영 |
| API 연결 | DashboardPage만 실 API | News/Forum/Docs/Officers/Settings API 신규 필요 |
| 경로 접두사 | `/branch/${branchId}/admin` | `/branch-services/${branchId}/admin` 변경 |

---

## 8. 종료 조건 체크

| 조건 | 충족 |
|------|------|
| Admin 기능이 6개로 명확히 고정되었는가 | ✅ A-1 ~ A-6 |
| Admin과의 책임 경계가 문서로 정의되었는가 | ✅ 섹션 5 |
| 메뉴/라우트 구조가 확정되었는가 | ✅ 섹션 3 |
| 코드 기반 검증이 완료되었는가 | ✅ 섹션 0 |
| Operator 설계와 충돌이 없는가 | ✅ (포럼 분리 기준 교차 확인) |

---

## 9. 다음 단계

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1 | Operator 4개 화면 이식 + API 연결 |
| 2 | WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1 | Admin 6개 화면 이식 + mock→API |

---

*설계 확정: 2026-02-10*
*검증 기준: 실제 코드 (pages/branch-admin/ 6개 파일, components/branch-admin/ 4개 파일)*
*참조: WO-KPA-C-BRANCH-OPERATOR-DESIGN-V1-RESULT.md*
