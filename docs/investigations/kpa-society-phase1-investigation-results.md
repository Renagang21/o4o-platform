# Phase 1: kpa-society.co.kr 내부 서비스 구획 실태 조사 결과

**조사 일자**: 2026-02-05
**조사 대상**: services/web-kpa-society
**조사자**: AI Assistant
**Work Order**: 사전 조사 (Phase 0)

---

## 조사 개요

kpa-society.co.kr 도메인 내부에 3개의 서비스가 혼재되어 있는지 확인하고, 각 서비스의 범위를 명확히 파악합니다.

**가설 (사용자 제공)**:
- 서비스 A: 메인 커뮤니티 (분회 단독)
- 서비스 B: 지부/분회 연동 데모
- 서비스 C: 분회 단독 데모

**실제 조사 결과**:
- ✅ 서비스 A: 메인 커뮤니티 (분회 단독) - `/` 경로
- ✅ 서비스 B: 지부/분회 데모 (District/Branch Admin Demo) - `/demo` 경로
- ❓ 서비스 C: **명확히 구분되지 않음** - `/demo` 하위에 통합된 것으로 보임

---

## 1. Routing/URL 조사

### 서비스 A: 메인 커뮤니티 (분회 단독)

**Base URL**: `/` (루트)

**주요 라우트**:
| 경로 | 페이지 | 역할 | 소스 위치 |
|------|--------|------|-----------|
| `/` | CommunityHomePage | 커뮤니티 홈 | [App.tsx:160](services/web-kpa-society/src/App.tsx#L160) |
| `/test-center` | TestCenterPage | 테스트 센터 | [App.tsx:163](services/web-kpa-society/src/App.tsx#L163) |
| `/services/branch` | BranchServicePage | 분회 서비스 소개 | [App.tsx:166](services/web-kpa-society/src/App.tsx#L166) |
| `/services/division` | DivisionServicePage | 지부 서비스 소개 | [App.tsx:167](services/web-kpa-society/src/App.tsx#L167) |
| `/services/pharmacy` | PharmacyServicePage | 약국 서비스 소개 | [App.tsx:168](services/web-kpa-society/src/App.tsx#L168) |
| `/services/forum` | ForumServicePage | 포럼 서비스 소개 | [App.tsx:169](services/web-kpa-society/src/App.tsx#L169) |
| `/services/lms` | LmsServicePage | LMS 서비스 소개 | [App.tsx:170](services/web-kpa-society/src/App.tsx#L170) |
| `/join/branch` | BranchJoinPage | 분회 가입 | [App.tsx:173](services/web-kpa-society/src/App.tsx#L173) |
| `/join/division` | DivisionJoinPage | 지부 가입 | [App.tsx:174](services/web-kpa-society/src/App.tsx#L174) |
| `/join/pharmacy` | PharmacyJoinPage | 약국 가입 | [App.tsx:175](services/web-kpa-society/src/App.tsx#L175) |
| `/pharmacy` | PharmacyPage | 약국 경영지원 (실 서비스) | [App.tsx:182](services/web-kpa-society/src/App.tsx#L182) |
| `/pharmacy/dashboard` | PharmacyDashboardPage | 약국 대시보드 | [App.tsx:184](services/web-kpa-society/src/App.tsx#L184) |
| `/pharmacy/b2b` | PharmacyB2BPage | 약국 B2B | [App.tsx:185](services/web-kpa-society/src/App.tsx#L185) |
| `/pharmacy/store` | PharmacyStorePage | 약국 스토어 | [App.tsx:188](services/web-kpa-society/src/App.tsx#L188) |
| `/pharmacy/services` | PharmacyServicesPage | 약국 서비스 | [App.tsx:189](services/web-kpa-society/src/App.tsx#L189) |
| `/pharmacy/approval` | PharmacyApprovalGatePage | 약국 승인 게이트 | [App.tsx:197](services/web-kpa-society/src/App.tsx#L197) |
| `/work` | WorkPage | 근무약사 업무 | [App.tsx:205](services/web-kpa-society/src/App.tsx#L205) |
| `/work/tasks` | WorkTasksPage | 근무약사 업무 - 과제 | [App.tsx:206](services/web-kpa-society/src/App.tsx#L206) |
| `/work/learning` | WorkLearningPage | 근무약사 업무 - 학습 | [App.tsx:207](services/web-kpa-society/src/App.tsx#L207) |
| `/work/display` | WorkDisplayPage | 근무약사 업무 - 디스플레이 | [App.tsx:208](services/web-kpa-society/src/App.tsx#L208) |
| `/work/community` | WorkCommunityPage | 근무약사 업무 - 커뮤니티 | [App.tsx:209](services/web-kpa-society/src/App.tsx#L209) |

**특징**:
- ✅ 커뮤니티 중심 서비스 (단일 조직)
- ✅ 약국 경영지원 실 서비스 포함
- ✅ 근무약사 업무 화면 제공
- ✅ `Layout` 컴포넌트 사용

---

### 서비스 B: 지부/분회 데모 (District/Branch Admin Demo)

**Base URL**: `/demo`

**주요 라우트**:
| 경로 | 페이지/라우팅 | 역할 | 소스 위치 |
|------|---------------|------|-----------|
| `/demo` | DashboardPage | 조직 대시보드 | [App.tsx:307](services/web-kpa-society/src/App.tsx#L307) |
| `/demo/admin/*` | AdminRoutes | 지부 관리자 | [App.tsx:242](services/web-kpa-society/src/App.tsx#L242) |
| `/demo/operator/*` | OperatorRoutes | 서비스 운영자 | [App.tsx:245](services/web-kpa-society/src/App.tsx#L245) |
| `/demo/intranet/*` | IntranetRoutes | 인트라넷 | [App.tsx:248](services/web-kpa-society/src/App.tsx#L248) |
| `/demo/branch/:branchId/*` | BranchRoutes | 분회 서비스 | [App.tsx:252](services/web-kpa-society/src/App.tsx#L252) |
| `/demo/branch/:branchId/admin/*` | BranchAdminRoutes | 분회 관리자 | [App.tsx:251](services/web-kpa-society/src/App.tsx#L251) |
| `/demo/test-guide` | TestGuidePage | 테스트 가이드 | [App.tsx:235](services/web-kpa-society/src/App.tsx#L235) |
| `/demo/select-function` | FunctionGatePage | 기능 선택 게이트 | [App.tsx:232](services/web-kpa-society/src/App.tsx#L232) |
| `/demo/news` | NewsListPage | 공지/소식 | [App.tsx:310](services/web-kpa-society/src/App.tsx#L310) |
| `/demo/forum` | ForumHomePage | 포럼 | [App.tsx:319](services/web-kpa-society/src/App.tsx#L319) |
| `/demo/lms` | EducationPage | LMS 교육 | [App.tsx:327](services/web-kpa-society/src/App.tsx#L327) |
| `/demo/participation` | ParticipationListPage | 참여 (설문/퀴즈) | [App.tsx:334](services/web-kpa-society/src/App.tsx#L334) |
| `/demo/groupbuy` | GroupbuyListPage | 공동구매 | [App.tsx:340](services/web-kpa-society/src/App.tsx#L340) |
| `/demo/docs` | ResourcesHomePage | 자료실 | [App.tsx:349](services/web-kpa-society/src/App.tsx#L349) |
| `/demo/organization` | OrganizationAboutPage | 조직소개 | [App.tsx:356](services/web-kpa-society/src/App.tsx#L356) |
| `/demo/mypage` | MyDashboardPage | 마이페이지 | [App.tsx:363](services/web-kpa-society/src/App.tsx#L363) |
| `/demo/events` | EventsHomePage | 이벤트 | [App.tsx:371](services/web-kpa-society/src/App.tsx#L371) |

**특징**:
- ✅ 조직 관리 중심 서비스 (지부/분회 계층 구조)
- ✅ 지부 관리자, 분회 관리자, 서비스 운영자 별도 라우팅
- ✅ `DemoLayout` 컴포넌트 사용
- ✅ 인트라넷 기능 포함
- ⚠️ `/demo` 하위에 커뮤니티 기능(forum, lms, news 등)이 **중복**으로 존재

---

### 서비스 C: 분회 단독 데모

**결과**: ❌ **명확히 분리된 서비스 C가 존재하지 않음**

**분석**:
- `/demo/branch/:branchId/*` 경로가 존재하나, 이는 **서비스 B의 하위 경로**임
- 별도의 독립적인 "분회 단독 데모" 서비스가 아니라, 지부/분회 데모 내부에서 분회별로 동적 라우팅되는 구조
- `BranchRoutes`는 `:branchId` 파라미터를 받아 분회별 화면을 렌더링하는 역할

---

## 2. Layout 조사

### 서비스 A: 메인 커뮤니티

**사용 Layout**: `Layout` 컴포넌트

**코드**:
```tsx
// 서비스 A 라우트 예시
<Route path="/" element={<Layout serviceName={SERVICE_NAME}><CommunityHomePage /></Layout>} />
<Route path="/pharmacy" element={<Layout serviceName={SERVICE_NAME}><PharmacyPage /></Layout>} />
```

**특징**:
- `serviceName` prop: "KPA-Society"
- 커뮤니티 중심 레이아웃

---

### 서비스 B: 지부/분회 데모

**사용 Layout**: `DemoLayout` 컴포넌트

**코드**:
```tsx
// DemoLayoutRoutes 내부
<DemoLayout serviceName={SERVICE_NAME}>
  <Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/news" element={<NewsListPage />} />
    {/* ... */}
  </Routes>
</DemoLayout>
```

**특징**:
- `serviceName` prop: "KPA-Society"
- 조직 관리 중심 레이아웃
- 주석에 따르면 "시각적으로 분리" (WO-KPA-DEMO-HEADER-SEPARATION-V1)

**별도 Layout 사용 라우트**:
| 경로 | Layout | 역할 |
|------|--------|------|
| `/demo/admin/*` | AdminRoutes (자체 레이아웃) | 지부 관리자 |
| `/demo/operator/*` | OperatorRoutes (자체 레이아웃) | 서비스 운영자 |
| `/demo/intranet/*` | IntranetRoutes (자체 레이아웃) | 인트라넷 |
| `/demo/branch/:branchId/admin/*` | BranchAdminRoutes (자체 레이아웃) | 분회 관리자 |
| `/demo/branch/:branchId/*` | BranchRoutes (자체 레이아웃) | 분회 서비스 |

---

## 3. Member Flow 조사

### 서비스 A: 메인 커뮤니티

**인증 모달**:
- ✅ `LoginModal` (전역)
- ✅ `RegisterModal` (전역)
- 위치: [App.tsx:145-146](services/web-kpa-society/src/App.tsx#L145-L146)

**레거시 경로 리다이렉트**:
```tsx
// /login, /register 접근 시 홈으로 리다이렉트 + 모달 오픈
<Route path="/login" element={<LoginRedirect />} />
<Route path="/register" element={<RegisterRedirect />} />
```

**특징**:
- WO-O4O-AUTH-LEGACY-LOGIN-REGISTER-PAGE-REMOVAL-V1: 로그인/회원가입 페이지 제거, 모달로 대체
- 전역 인증 모달 사용 (서비스 A, B 공통)

---

### 서비스 B: 지부/분회 데모

**인증 모달**:
- ✅ 동일한 전역 `LoginModal`, `RegisterModal` 사용
- `/demo/login`, `/demo/register` 경로도 리다이렉트 + 모달 오픈

**대기 페이지**:
```tsx
<Route path="/demo/register/pending" element={<RegisterPendingPage />} />
```

**특징**:
- 서비스 A와 동일한 인증 모달 공유
- 회원 승인 대기 화면 제공

---

## 4. Role/Approval 조사

### Context Providers

**전역 Providers** (서비스 A, B 공통):
```tsx
<AuthProvider>
  <LoginModalProvider>
    <OrganizationProvider>
      {/* ... */}
    </OrganizationProvider>
  </LoginModalProvider>
</AuthProvider>
```

**특징**:
- `AuthProvider`: 인증 상태 관리 - [AuthContext.tsx:220](services/web-kpa-society/src/contexts/AuthContext.tsx#L220)
- `OrganizationProvider`: 조직 정보 관리
- `LoginModalProvider`: 로그인 모달 상태 관리

---

### AuthContext 상세 분석

**Platform User 인증**:
```tsx
interface User {
  id: string;
  email: string;
  name: string;
  role?: string;  // Legacy unprefixed roles
  pharmacistFunction?: PharmacistFunction;
  pharmacistRole?: PharmacistRole;
}
```

**Service User 인증** (Phase 2-b):
- WO-AUTH-SERVICE-IDENTITY-PHASE2B-KPA-PHARMACY
- Platform User와 Service User 완전 분리
- Service User는 약국 서비스 전용 인증
- 별도 토큰 저장 (`kpa_pharmacy_service_access_token`)

**AuthClient**:
- API Base URL: `import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr'`
- Strategy: `localStorage` (cross-domain authentication)

**중요 발견**:
```tsx
// WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1
// Role 자동 매핑 제거됨
// KPA는 더 이상 API role을 해석하지 않음
// 운영자 여부는 서버 응답(KpaMember 기반)으로만 판단

function createUserFromApiResponse(apiUser: ApiUser): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: apiUser.fullName || apiUser.name || apiUser.email,
    role: apiUser.role || 'pharmacist', // 매핑 없이 그대로 사용
  };
}
```

**역사적 맥락**:
- 원래는 KPA 프론트엔드가 API role을 해석하고 매핑했음
- WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1에서 이 기능 제거
- 현재는 **백엔드 응답의 role을 그대로 사용**

---

### AdminAuthGuard 권한 검사

**위치**: [AdminAuthGuard.tsx:86](services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx#L86)

**권한 검사 로직** (`checkBranchAdminRole`):
```tsx
function checkBranchAdminRole(user: User): boolean {
  const role = user.role;

  // 슈퍼 관리자
  if (role === 'super_admin' || role === 'membership_super_admin') {
    return true;
  }

  // 지부 관리자
  if (role === 'membership_branch_admin' || role === 'membership_branch_operator') {
    return true;
  }

  // 지역 관리자
  if (role === 'membership_district_admin') {
    return true;
  }

  // admin 역할
  if (role === 'admin') {
    return true;
  }

  // 개발 환경에서는 임시 허용
  if (import.meta.env.DEV) {
    console.warn('[DEV MODE] Branch admin access allowed for testing');
    return true;
  }

  return false;
}
```

**⚠️ 중요 발견사항**:
1. **Legacy unprefixed roles 사용**: `super_admin`, `admin`, `membership_*` 등
2. **Phase 4 role prefix와 충돌**: 백엔드는 이미 `kpa:admin`, `kpa:operator` 등을 사용하지만, 프론트엔드는 아직 legacy roles 기대
3. **DEV 모드 허용**: 개발 환경에서는 모든 사용자에게 admin 권한 부여 (보안 위험)

**예상되는 문제**:
- Phase 4 백엔드 배포 후, 프론트엔드 AdminAuthGuard가 prefixed roles를 인식하지 못함
- `kpa:admin` role을 가진 사용자가 `/demo/admin/*` 접근 시 **차단될 가능성 높음**

---

### 역할 기반 라우팅 상세

**서비스 B 전용 라우트**:
| 라우트 | 역할 | AuthGuard | 예상 접근 권한 (legacy) | 실제 필요 권한 (Phase 4) |
|--------|------|-----------|------------------------|------------------------|
| `/demo/admin/*` | 지부 관리자 | AdminAuthGuard | `admin`, `membership_branch_admin` | `kpa:admin`, `kpa:operator` |
| `/demo/operator/*` | 서비스 운영자 | (미확인) | `operator` | `kpa:operator` |
| `/demo/intranet/*` | 인트라넷 | (미확인) | 조직 회원 | `kpa:pharmacist` |
| `/demo/branch/:branchId/admin/*` | 분회 관리자 | BranchAdminAuthGuard | `membership_branch_admin` | `kpa:branch_admin`, `kpa:branch_operator` |
| `/demo/branch/:branchId/*` | 분회 회원 | BranchProvider | 분회 소속 회원 | `kpa:pharmacist` (분회 소속) |

**BranchRoutes 동적 라우팅**:
```tsx
export function BranchRoutes() {
  const { branchId } = useParams<{ branchId: string }>();
  const [branchName, setBranchName] = useState<string>('');

  // branchId 기반으로 분회 정보 로드
  // BranchProvider로 분회 context 제공
  // BranchLayout으로 분회별 UI 렌더링
}
```

**특징**:
- 동적 파라미터 `:branchId` 사용
- 분회별 독립적인 context (`BranchProvider`)
- 분회별 독립적인 레이아웃 (`BranchLayout`)
- 하드코딩된 분회 목록: 강남, 강북, 강동, 강서, 관악, 동작, 마포, 서대문, 성북, 영등포, 용산, 은평, 종로, 중구

---

## 5. Forum/Content 조사

### 서비스 A: 메인 커뮤니티

**Forum 경로**: ❌ **메인 커뮤니티(/)에는 Forum 라우트 없음**

**특징**:
- 서비스 A는 커뮤니티 **홈**만 제공
- Forum, LMS, News 등의 실제 콘텐츠는 `/demo` 하위에만 존재

---

### 서비스 B: 지부/분회 데모

**Forum 경로**:
```tsx
<Route path="/demo/forum" element={<ForumHomePage />} />
<Route path="/demo/forum/all" element={<ForumListPage />} />
<Route path="/demo/forum/category/:id" element={<ForumListPage />} />
<Route path="/demo/forum/post/:id" element={<ForumDetailPage />} />
<Route path="/demo/forum/write" element={<ForumWritePage />} />
<Route path="/demo/forum/edit/:id" element={<ForumWritePage />} />
```

**News 경로**:
```tsx
<Route path="/demo/news" element={<NewsListPage />} />
<Route path="/demo/news/notice" element={<NewsListPage />} />
<Route path="/demo/news/branch-news" element={<NewsListPage />} />
<Route path="/demo/news/kpa-news" element={<NewsListPage />} />
<Route path="/demo/news/gallery" element={<GalleryPage />} />
<Route path="/demo/news/press" element={<NewsListPage />} />
<Route path="/demo/news/:id" element={<NewsDetailPage />} />
```

**LMS 경로**:
```tsx
<Route path="/demo/lms" element={<EducationPage />} />
<Route path="/demo/lms/courses" element={<LmsCoursesPage />} />
<Route path="/demo/lms/course/:id" element={<LmsCourseDetailPage />} />
<Route path="/demo/lms/course/:courseId/lesson/:lessonId" element={<LmsLessonPage />} />
<Route path="/demo/lms/certificate" element={<LmsCertificatesPage />} />
```

**특징**:
- ✅ Forum, News, LMS 모두 `/demo` 하위에 존재
- ✅ 지부/분회 데모에서만 콘텐츠 기능 제공

---

## 6. Legacy Redirect 조사

**레거시 경로 리다이렉트**:
```tsx
// 기존 북마크 호환용
<Route path="/admin/*" element={<Navigate to="/demo/admin" replace />} />
<Route path="/operator/*" element={<Navigate to="/demo/operator" replace />} />
<Route path="/intranet/*" element={<Navigate to="/demo/intranet" replace />} />
<Route path="/branch/*" element={<Navigate to="/demo/branch" replace />} />
<Route path="/test-guide/*" element={<Navigate to="/demo/test-guide" replace />} />
<Route path="/news/*" element={<Navigate to="/demo/news" replace />} />
<Route path="/forum/*" element={<Navigate to="/demo/forum" replace />} />
<Route path="/lms/*" element={<Navigate to="/demo/lms" replace />} />
<Route path="/groupbuy/*" element={<Navigate to="/demo/groupbuy" replace />} />
<Route path="/docs/*" element={<Navigate to="/demo/docs" replace />} />
<Route path="/organization/*" element={<Navigate to="/demo/organization" replace />} />
<Route path="/mypage/*" element={<Navigate to="/demo/mypage" replace />} />
<Route path="/participation/*" element={<Navigate to="/demo/participation" replace />} />
```

**분석**:
- ✅ 기존 경로들이 모두 `/demo`로 리다이렉트
- ✅ WO-KPA-DEMO-ROUTE-ISOLATION-V1: 기존 약사회 서비스 전체를 /demo 하위로 이동
- ⚠️ 이는 "서비스 A가 나중에 추가되었고, 기존 서비스는 /demo로 이동"했음을 의미

---

## 7. 주요 발견사항 (Key Findings)

### 발견 1: 서비스 C는 존재하지 않음

**결론**: 사용자가 언급한 "서비스 C (분회 단독 데모)"는 **별도 서비스가 아님**

**근거**:
- `/demo/branch/:branchId/*`는 서비스 B의 하위 경로
- 동적 라우팅을 통해 분회별로 화면을 렌더링하는 구조
- 독립적인 서비스가 아니라 **서비스 B 내부의 분회 화면**

---

### 발견 2: 서비스 A는 "껍데기"에 가까움

**특징**:
- `/` (홈) - CommunityHomePage만 존재
- `/services/*` - 서비스 **소개** 페이지만 존재
- `/join/*` - 가입 페이지만 존재
- 실제 Forum, News, LMS 기능은 **없음**

**실 서비스**:
- `/pharmacy/*` - 약국 경영지원 (유일한 실 기능)
- `/work/*` - 근무약사 업무

**결론**: 서비스 A는 "커뮤니티 홈 + 약국/근무약사 기능"만 제공하는 **단순한 진입점**

---

### 발견 3: 실제 커뮤니티 기능은 모두 서비스 B에 존재

**증거**:
- Forum: `/demo/forum`
- News: `/demo/news`
- LMS: `/demo/lms`
- Participation: `/demo/participation`
- Groupbuy: `/demo/groupbuy`
- Docs: `/demo/docs`

**결론**: 서비스 B가 **실질적인 약사회 SaaS 플랫폼**

---

### 발견 4: Legacy Redirect가 의미하는 것

**해석**:
1. 원래는 `/forum`, `/news`, `/lms` 등이 **루트 경로**였음
2. WO-KPA-DEMO-ROUTE-ISOLATION-V1에서 모든 기능을 `/demo`로 이동
3. 서비스 A (커뮤니티 홈)는 **이후에 추가**된 것으로 보임

**주석 증거**:
```tsx
// WO-KPA-DEMO-ROUTE-ISOLATION-V1
// - 기존 약사회 서비스 전체를 /demo 하위로 이동
// - / 경로는 플랫폼 홈용으로 비워둠
```

---

### 발견 5: 인증/조직 Context는 공유됨

**공유되는 것**:
- `AuthProvider`
- `OrganizationProvider`
- `LoginModal`, `RegisterModal`

**의미**:
- 서비스 A와 서비스 B는 **동일한 인증 시스템** 사용
- 사용자 로그인 상태가 **양쪽 서비스에서 공유**됨
- 조직 정보도 공유됨

---

### 발견 6: ⚠️ **CRITICAL** - Phase 4와 프론트엔드 충돌 예상

**문제 상황**:
1. **백엔드 Phase 4 완료**: `kpa:admin`, `kpa:operator`, `kpa:branch_admin` 등 prefixed roles 사용
2. **프론트엔드는 legacy roles 기대**: `admin`, `membership_branch_admin`, `super_admin` 등

**충돌 지점**:
- [AdminAuthGuard.tsx:86-116](services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx#L86-L116)
```tsx
function checkBranchAdminRole(user: User): boolean {
  // ❌ Legacy roles만 체크
  if (role === 'super_admin' || role === 'membership_super_admin') return true;
  if (role === 'membership_branch_admin' || role === 'membership_branch_operator') return true;
  if (role === 'membership_district_admin') return true;
  if (role === 'admin') return true;

  // ⚠️ Prefixed roles는 인식 못함
  // 'kpa:admin', 'kpa:operator' 등은 false 반환됨
  return false;
}
```

**예상 영향**:
- Phase 4 배포 후, `/demo/admin/*` 접근 시 **403 에러 발생**
- `kpa:admin` role을 가진 사용자도 **관리자 화면 접근 불가**
- DEV 모드에서는 모든 사용자 허용 → 프로덕션 배포 후에만 문제 발생

**관련 파일**:
- AdminAuthGuard.tsx (확인됨)
- BranchAdminAuthGuard.tsx (미확인, 조사 필요)
- OperatorAuthGuard.tsx (미확인, 조사 필요)
- IntranetAuthGuard.tsx (미확인, 조사 필요)

**Phase 2 조사 필요**:
- 모든 AuthGuard 컴포넌트 권한 검사 로직 확인
- Phase 4 prefixed roles와의 호환성 분석
- 수정 필요 파일 목록 작성

---

### 발견 7: WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1의 영향

**주석에서 발견한 내용**:
```tsx
// WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1
// Role 자동 매핑 제거됨
// KPA는 더 이상 API role을 해석하지 않음
// 운영자 여부는 서버 응답(KpaMember 기반)으로만 판단
```

**의미**:
- 이전에는 KPA 프론트엔드가 role을 해석하고 매핑했음
- Phase 0에서 이 기능을 제거함
- 백엔드 응답의 role을 그대로 사용하도록 변경됨

**결과**:
- ✅ 백엔드 role 변경 시 프론트엔드 수정 불필요 (원칙적으로)
- ❌ 그러나 AdminAuthGuard 등이 **하드코딩된 legacy roles** 체크 → Phase 4와 충돌

**아이러니**:
- Phase 0에서 "role 해석 제거"를 통해 유연성 확보하려 했으나
- AdminAuthGuard가 여전히 하드코딩된 role 체크를 수행 중
- Phase 4 배포 시 오히려 **더 큰 문제** 발생

---

## 8. 조사 완료 체크리스트

- [x] 서비스 A 라우팅 구조 파악
- [x] 서비스 B 라우팅 구조 파악
- [x] 서비스 C 존재 여부 확인 → **존재하지 않음**
- [x] Layout 사용 패턴 파악
- [x] 인증 모달 흐름 파악
- [x] Context Provider 구조 파악
- [x] 역할 기반 라우팅 파악
- [x] Forum/Content 위치 파악
- [x] Legacy Redirect 목적 파악

---

## 9. Phase 1 결론

### 결론 요약

1. **서비스 구성**:
   - ✅ 서비스 A (메인 커뮤니티): `/` - 커뮤니티 홈 + 약국/근무약사 기능
   - ✅ 서비스 B (지부/분회 데모): `/demo` - 실질적인 약사회 SaaS 플랫폼
   - ❌ 서비스 C: **존재하지 않음** (서비스 B 내부의 분회 화면)

2. **기능 분포**:
   - 서비스 A: 홈 + 약국 + 근무약사 (실 기능)
   - 서비스 B: Forum + News + LMS + 조직관리 + 관리자 기능 (모든 커뮤니티 기능)

3. **공유 요소**:
   - 인증 시스템 (AuthProvider, LoginModal)
   - 조직 정보 (OrganizationProvider)
   - 사용자 상태 (전역 Context)

4. **역사적 맥락**:
   - 원래는 모든 기능이 루트 경로에 있었음
   - WO-KPA-DEMO-ROUTE-ISOLATION-V1에서 `/demo`로 이동
   - 서비스 A는 이후에 추가된 것으로 보임

5. **🔥 CRITICAL - Phase 4 호환성 문제**:
   - ⚠️ **프론트엔드가 legacy roles 하드코딩**: `admin`, `membership_branch_admin` 등
   - ⚠️ **백엔드는 prefixed roles 사용**: `kpa:admin`, `kpa:branch_admin` 등
   - ⚠️ **AdminAuthGuard가 prefixed roles 인식 못함** → `/demo/admin/*` 접근 차단 예상
   - ⚠️ **Phase 4 배포 후 관리자 화면 접근 불가 문제 발생 가능성 높음**

---

## 10. Phase 2 조사 방향 제안

Phase 1 조사 결과를 바탕으로, Phase 2에서는 다음을 조사할 필요가 있습니다:

### 🔥 **긴급 우선순위: Phase 4 호환성 문제**

1. **모든 AuthGuard 컴포넌트 조사** (최우선):
   - ✅ AdminAuthGuard 확인 완료 → Legacy roles 사용 중
   - ⚠️ BranchAdminAuthGuard 조사 필요
   - ⚠️ OperatorAuthGuard 조사 필요 (존재 여부 확인)
   - ⚠️ IntranetAuthGuard 조사 필요 (존재 여부 확인)
   - **목표**: Phase 4 prefixed roles와의 충돌 전수 조사

2. **API 응답 role 형식 확인**:
   - 백엔드가 현재 반환하는 role 형식 확인
   - Phase 4 이후 role 형식 확인
   - `user.role` vs `user.roles[]` 배열 여부 확인

3. **권한 검사 수정 전략 수립**:
   - Legacy roles → Prefixed roles 마이그레이션 전략
   - Backward compatibility 필요 여부 판단
   - 롤백 시나리오 고려

### 일반 우선순위

4. **Context 및 인증 흐름 상세 분석**:
   - ✅ AuthProvider 내부 구현 확인 완료
   - OrganizationProvider 내부 구현
   - 서비스 간 상태 공유 메커니즘

5. **분회 라우팅 메커니즘 분석**:
   - ✅ BranchRoutes 구조 확인 완료 - 동적 라우팅, BranchProvider/BranchLayout 사용
   - BranchAdminRoutes 내부 구조 확인
   - 분회별 데이터 격리 메커니즘

6. **API 호출 패턴 분석**:
   - 서비스 A와 서비스 B의 API 호출 차이
   - `authClient` 사용 패턴 (✅ 확인 완료 - localStorage strategy)
   - 백엔드 엔드포인트 구분 여부

7. **Layout 컴포넌트 차이 분석**:
   - ✅ `Layout` 확인 완료 - Header + Content + Footer
   - ✅ `DemoLayout` 확인 완료 - DemoHeader + Content + Footer
   - DemoHeader vs Header 차이 분석
   - 사이드바 메뉴 구성 차이

---

## 11. 금지사항 준수 확인

- [x] ✅ **해결책 제시 금지** - 조사 결과만 기록, 해결책 없음
- [x] ✅ **판단 유보** - "서비스 C 존재하지 않음" = 사실 기록, 평가 아님
- [x] ✅ **코드 수정 금지** - 읽기만 수행
- [x] ✅ **관측 결과만 기록** - App.tsx 분석 결과만 문서화

---

**Phase 1 조사 완료**
**다음 단계**: Phase 2 조사 시작 (사용자 승인 대기)
