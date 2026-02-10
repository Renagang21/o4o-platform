# WO-KPA-C-BRANCH-OPERATOR-DESIGN-V1 결과

> **작업일**: 2026-02-10
> **성격**: 설계 확정 (코드 수정 없음)
> **전제**: REVIEW 항목 모두 DROP, KEEP 4개만 포함

---

## 0. 코드 기반 검증 결과

설계 전, KEEP 4개 기능의 실제 코드를 검증했다.

| 기능 | 파일 | API 연결 | 분회 호환성 | 비고 |
|------|------|---------|-----------|------|
| O-1 OperatorDashboard | `pages/operator/OperatorDashboard.tsx` | `operatorApi.getSummary()` | ✅ | Content/Signage/Forum 통합 조회 |
| O-2 ForumManagementPage | `pages/operator/ForumManagementPage.tsx` | Forum API (REST) | ✅ | `organizationId` 기반 분회 스코프 필터 명시 |
| O-3 ContentHubPage | `pages/signage/ContentHubPage.tsx` | Signage v2 API | ✅ | `publicContentApi` + `globalContentApi` |
| O-4 OperatorManagementPage | `pages/operator/OperatorManagementPage.tsx` | `authClient` (auth-core) | ✅ | **`kpa-c:operator` 역할 이미 정의됨** |

### 검증 핵심 발견

1. **OperatorManagementPage에 `kpa-c:operator` 역할이 이미 코드에 존재**
   ```typescript
   { value: 'kpa-c:operator', label: '분회서비스 운영자', description: '분회 서비스 운영자 (/branch-services)' }
   ```
   KPA-c 구축 시 역할 추가 작업 불필요.

2. **ForumManagementPage가 organizationId 기반 분회 스코프를 명시적으로 지원**
   ```
   분회 운영자: 자기 분회 소속 요청만
   지부 운영자: 소속 지부 산하 모든 분회 요청
   ```
   백엔드 필터링이 이미 구현되어 있어 분회 단독 사용 가능.

3. **ContentHubPage는 serviceCode 기반** (`kpa-society`) — 분회 경로와 무관하게 동작.

4. **4개 모두 `/demo/` 경로 인식 없음** — 경로 변경 시 코드 수정 불필요.

---

## 1. Operator 역할 정의 (확정)

### 1-1. 역할 성격

| 항목 | 정의 |
|------|------|
| 역할명 | `kpa-c:operator` (분회서비스 운영자) |
| 책임 | 분회 콘텐츠·노출·운영 상태 관리 |
| 범위 | 일상 운영 (정책·조직·회원 구조 관여 안 함) |
| 핵심 원칙 | **Admin = 구조·권한·기본값, Operator = 일상 운영·노출·처리** |

### 1-2. 인증 요구사항

| 항목 | 값 |
|------|------|
| 로그인 | 필수 |
| 역할 확인 | `kpa-c:operator` 또는 상위 (`kpa:branch_admin`, `kpa:admin`, `platform:admin`) |
| branchId | URL 파라미터에서 추출 |
| 스코프 제한 | 해당 분회의 데이터만 접근 |

---

## 2. Operator 기능 범위 (확정 — 4개 고정)

| 코드 | 기능 | 출처(KPA-b) | 분류 | 설명 |
|------|------|------------|------|------|
| **O-1** | Operator 대시보드 | `/demo/operator` | B | 콘텐츠/사이니지/포럼 통합 현황 |
| **O-2** | 포럼 카테고리 관리 | `/demo/operator/forum-management` | A | 카테고리 생성/승인/거절 |
| **O-3** | 사이니지 콘텐츠 허브 | `/demo/operator/signage/content` | A | 공유 콘텐츠 조회/복제 |
| **O-4** | 운영자 계정 관리 | `/demo/operator/operators` | A | Operator 계정 CRUD |

### 명시적 제외

다음 기능은 KPA-c Operator MVP에 포함하지 않는다.

| 제외 기능 | 사유 |
|----------|------|
| 회원 관리 | Admin 영역 |
| 회비/정산 | Admin 영역 (REVIEW → DROP) |
| 신상신고 | Admin 영역 (REVIEW → DROP) |
| AI 리포트 | MVP 이후 확장 (REVIEW → DROP) |
| 공동구매 | 사업 모델 미확정 (REVIEW → DROP) |
| 약관/정책 관리 | 플랫폼 단위 (DROP) |

---

## 3. 라우트 구조 (확정)

```
/branch-services/:branchId/operator/
├── (index)                ← O-1: OperatorDashboard
├── forum-management       ← O-2: ForumManagementPage
├── signage/content        ← O-3: ContentHubPage
└── operators              ← O-4: OperatorManagementPage
```

### 네비게이션 메뉴 (4개 고정)

| 순서 | 메뉴명 | 라우트 | 아이콘 |
|------|--------|--------|--------|
| 1 | 대시보드 | `/operator` | LayoutDashboard |
| 2 | 포럼 관리 | `/operator/forum-management` | MessageSquare |
| 3 | 콘텐츠 허브 | `/operator/signage/content` | Monitor |
| 4 | 운영자 관리 | `/operator/operators` | Users |

---

## 4. 화면별 책임 정의 (확정)

### O-1. OperatorDashboard

| 항목 | 내용 |
|------|------|
| **목적** | 분회 운영 상태를 한 눈에 파악 |
| **데이터 소스** | `operatorApi.getSummary()` (Content + Signage + Forum) |
| **포함** | 콘텐츠 수/최근 항목, 사이니지 미디어/플레이리스트 수, 포럼 글 수/최근 글 |
| **제외** | 설정 변경, 승인/반려, 상세 분석 |
| **액션** | 새로고침, AI 요약 버튼, 각 섹션 더보기 링크 |

### O-2. ForumManagementPage

| 항목 | 내용 |
|------|------|
| **목적** | 분회 포럼 카테고리 구조 관리 |
| **데이터 소스** | Forum API (카테고리 요청 목록) |
| **스코프** | `organizationId` 기반 — 분회 소속 요청만 표시 |
| **포함** | 카테고리 생성 요청 목록, 승인/거절, 직접 생성 |
| **제외** | 게시글 통계, 모더레이션(게시글 숨김/삭제는 Admin ForumPage 담당) |

### O-3. ContentHubPage (사이니지 콘텐츠 허브)

| 항목 | 내용 |
|------|------|
| **목적** | 공유 콘텐츠를 분회로 가져오기 |
| **데이터 소스** | `publicContentApi` (조회), `globalContentApi` (복제) |
| **소스 탭** | HQ(본부), Supplier(공급자), Community(커뮤니티) |
| **포함** | 플레이리스트/미디어 조회, 미리보기, 내 대시보드로 복제 |
| **제외** | 콘텐츠 생성, 재생 정책, 디바이스 관리 |

### O-4. OperatorManagementPage

| 항목 | 내용 |
|------|------|
| **목적** | 분회 Operator 계정 관리 |
| **데이터 소스** | `authClient` (auth-core API) |
| **포함** | Operator 추가/삭제, 활성/비활성 토글, 역할 할당 |
| **역할 범위** | `kpa-c:operator` 고정 (역할 세분화 없음) |
| **제외** | Admin 권한 부여, 역할 커스터마이징 |

---

## 5. Admin / Operator 경계 (확정)

| 관리 대상 | Branch Admin | Operator |
|----------|-------------|----------|
| 분회 기본 정보 | ✅ | ❌ |
| 뉴스/공지사항 CRUD | ✅ | ❌ |
| 포럼 게시글 모더레이션 | ✅ | ❌ |
| 포럼 카테고리 구조 | ❌ | ✅ |
| 자료실 관리 | ✅ | ❌ |
| 임원 관리 | ✅ | ❌ |
| 분회 설정 | ✅ | ❌ |
| APP 통합 현황 | ❌ | ✅ |
| 사이니지 콘텐츠 | ❌ | ✅ |
| Admin 계정 | ✅ (Settings 탭) | ❌ |
| Operator 계정 | ❌ | ✅ |

**중복 기능 없음 확인**: Admin과 Operator가 동일 기능을 공유하는 경우 없음.

### 포럼 관리 분리 기준

| 포럼 기능 | 담당 | 근거 |
|----------|------|------|
| 게시글 숨김/삭제/신고 처리 | Admin (ForumPage) | 콘텐츠 모더레이션 = 구조 관리 |
| 카테고리 생성/승인 | Operator (ForumManagementPage) | 카테고리 = 운영 구조 |

---

## 6. 구현 시 필요 작업 (사실 기록, 제안 아님)

| 항목 | 현재 상태 | 구현 시 필요 |
|------|----------|------------|
| 라우트 등록 | `/branch-services/:branchId/*` 에 BranchRoutes만 등록 | Operator 라우트 추가 필요 |
| 인증 가드 | BranchAdminAuthGuard 존재 | BranchOperatorAuthGuard 신규 필요 |
| 레이아웃 | OperatorLayout (KPA-b용) 존재 | 분회용 OperatorLayout 필요 (또는 재사용) |
| API 스코프 | operatorApi에 branchId 필터 없음 | branchId 기반 필터링 추가 필요 |
| 역할 | `kpa-c:operator` 코드에 정의됨 | DB role_assignments에 등록 필요 |

---

## 7. 종료 조건 체크

| 조건 | 충족 |
|------|------|
| Operator 기능이 4개로 명확히 고정되었는가 | ✅ O-1 ~ O-4 |
| Admin과의 책임 경계가 문서로 정의되었는가 | ✅ 섹션 5 |
| 메뉴/라우트 구조가 확정되었는가 | ✅ 섹션 3 |
| 코드 기반 검증이 완료되었는가 | ✅ 섹션 0 |

---

## 8. 다음 단계

| 순서 | 작업 | 설명 |
|------|------|------|
| 1 | WO-KPA-C-BRANCH-ADMIN-DESIGN-V1 | Admin 메뉴/권한/흐름 설계 |
| 2 | WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1 | Operator 4개 화면 이식 + API 연결 |

---

*설계 확정: 2026-02-10*
*검증 기준: 실제 코드 (OperatorDashboard.tsx, ForumManagementPage.tsx, ContentHubPage.tsx, OperatorManagementPage.tsx)*
