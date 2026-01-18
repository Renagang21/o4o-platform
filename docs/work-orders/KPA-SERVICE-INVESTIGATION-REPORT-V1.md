# 약사회 서비스 전체 코드 조사 보고서

> **조사일**: 2026-01-18
> **버전**: V1.0
> **목적**: 현재 코드 상태 파악 및 UX 보완 Work Order 판단 기초 자료

---

## 1. 조사 요약 (Executive Summary)

### 전체 상태 한눈 요약

| 영역 | 상태 | 실사용 가능 여부 |
|------|------|-----------------|
| **Frontend 라우팅** | ✅ 정상 | Yes |
| **인트라넷 메인** | ⚠️ 부분 | CMS 연동 확인 필요 |
| **공지/회의/문서/일정** | ✅ 정상 | Yes |
| **권한별 UI 노출** | ✅ 정상 | Yes |
| **Empty State 처리** | ✅ 정상 | Yes |
| **Backend 조직/회원 API** | ✅ 정상 | Yes |
| **Backend RBAC** | ✅ 정상 | Yes |
| **회의/문서/일정 API** | 💤 미구현 | Mock 데이터만 |
| **권한 계층 (Role vs Position)** | ⚠️ 혼동 가능 | 정책 명확화 필요 |

### 실사용 가능 여부 판단

**가능**: 테스트 환경에서 주요 화면/기능 확인 가능
**제한**: 실제 데이터 연동이 필요한 일부 기능은 Mock 데이터로만 동작

---

## 2. ✅ 정상 구현 / 실사용 가능

### 2-1. Frontend 라우팅 구조

```
/                           → 메인 화면
/login                      → 로그인
/intranet/*                 → 인트라넷 (인증 필요)
/admin/*                    → 지부 관리자
/branch/:branchId/*         → 분회 메인
/branch/:branchId/admin/*   → 분회 관리자
/operator/*                 → 서비스 운영자
```

**평가**: 계층적 라우팅 완전히 구현됨

### 2-2. 인트라넷 페이지 (기능별)

| 페이지 | 파일 | 상태 | Empty State |
|--------|------|------|-------------|
| 홈(Dashboard) | `DashboardPage.tsx` | ✅ | N/A |
| 공지 목록/상세/작성 | `NoticeListPage.tsx` 외 2개 | ✅ | ✅ |
| 회의 목록/상세 | `MeetingListPage.tsx` 외 1개 | ✅ | ✅ |
| 문서 | `DocumentListPage.tsx` | ✅ | ✅ |
| 일정 | `SchedulePage.tsx` | ✅ | ✅ |
| 테스트 피드백 | `FeedbackListPage.tsx` 외 2개 | ✅ | ✅ |

### 2-3. 권한별 UI 노출 (정상 작동)

| 역할 | 조직 설정 | 공지 작성 | 회의 생성 | 문서 업로드 | 피드백 작성 |
|------|----------|----------|----------|------------|------------|
| `chair` | ✅ | ✅ | ✅ | ✅ | - |
| `officer` | ✅ | ✅ | - | ✅ | - |
| `admin` | ✅ | ✅ | ✅ | ✅ | - |
| `district_admin` | - | - | - | - | ✅ |
| `branch_admin` | - | - | - | - | ✅ |
| `member` | - | - | - | - | - |

### 2-4. Backend API (완전 구현)

**조직 관리 (Organization)**
- `GET /kpa/organizations` - 목록 조회
- `GET /kpa/organizations/:id` - 상세 조회
- `POST /kpa/organizations` - 생성 (kpa:admin)
- `PATCH /kpa/organizations/:id` - 수정 (kpa:admin)

**회원 관리 (Membership)**
- `GET /kpa/members/me` - 내 정보
- `POST /kpa/members/apply` - 가입 신청
- `GET /kpa/members` - 목록 (kpa:operator)
- `PATCH /kpa/members/:id/status` - 상태 변경 (kpa:operator)
- `PATCH /kpa/members/:id/role` - 역할 변경 (kpa:admin)

**신청 처리 (Application)**
- `POST /kpa/applications` - 신청서 제출
- `GET /kpa/applications/mine` - 내 신청 목록
- `GET /kpa/applications/:id` - 신청 상세
- `DELETE /kpa/applications/:id` - 신청 취소
- `GET /kpa/applications/admin/all` - 전체 목록 (kpa:operator)
- `PATCH /kpa/applications/:id/review` - 검토 (kpa:operator)

**공지/게시판 (Yaksa)**
- `GET /yaksa/posts` - 게시물 목록 (공개)
- `GET /yaksa/posts/:id` - 게시물 상세 (조회수 증가)
- `POST /yaksa/admin/posts` - 게시물 생성 (yaksa:admin)
- `PUT /yaksa/admin/posts/:id` - 게시물 수정 (yaksa:admin)
- 변경 로그 자동 기록

**관리자 대시보드**
- `GET /admin/dashboard/stats` - 통합 통계
- `GET /admin/dashboard/organizations` - 조직 통계
- `GET /admin/dashboard/members` - 회원 통계
- `GET /admin/dashboard/applications` - 신청 통계

### 2-5. RBAC 체계 (정상 작동)

**인증 미들웨어**
- `requireAuth` - 기본 인증 체크
- `optionalAuth` - 선택적 인증
- `requireAdmin` - 관리자 권한 체크
- `requireScope(scope)` - Scope 검증

**Scope 계층**
```
super_admin / admin         → 전체 접근
kpa:admin                   → 조직/회원/신청 관리
kpa:operator                → 신청 검토, 통계 조회
yaksa:admin                 → 공지/게시판 관리
authenticated               → 회원정보, 신청, 수강신청
public                      → 조직/게시물/과정 조회
```

---

## 3. ⚠️ 부분 구현 / UX 보완 필요

### 3-1. CMS 연동 구조

**현황**: `cmsApi.getSlots()`, `cmsApi.getContents()` 호출 구조는 있으나 실제 응답 확인 필요

**영향**: Hero 슬라이드가 비어있으면 빈 배열로 설정됨 (사용자에게 안내 없음)

**위치**: `services/web-kpa-society/src/pages/intranet/DashboardPage.tsx`

### 3-2. 약사공론 기사 섹션

**현황**: 완전히 샘플 데이터 (실제 API 미연동)

**코드 주석**: `// 실제로는 약사공론 API 호출`

**영향**: 기사 내용이 업데이트되지 않음

### 3-3. 협력업체 링크

**현황**: Mock 데이터만 존재, 운영자 편집 기능 UI만 있고 구현 X

### 3-4. 설정 페이지

**현황**: UI/alert() 기반만 구현

**코드**: `alert('조직 정보 저장 (UI 데모)')`

**영향**: 실제 저장 기능 미작동

### 3-5. 분회 관리자 권한 체크

**현황**: TODO 주석 존재
```javascript
// TODO: 실제 API 연동 시 분회 관리자 권한 확인 API 호출
```

**영향**: 현재는 역할만 확인, 분회ID별 매핑 미구현

### 3-6. 페이지네이션

**현황**: UI 있으나 disabled 상태

---

## 4. ⛔ 잔존 위험 요소

### 4-1. 권한 계층 혼동 가능성 (주요 위험)

**문제**: 두 가지 권한 체계가 혼재

| 구분 | 용도 | 예시 |
|------|------|------|
| **Role (시스템 권한)** | API 접근 제어 | `district_admin`, `branch_admin`, `kpa:operator` |
| **Position (직책)** | 표시용 | `chair`, `officer`, `vice_president`, `director` |

**혼동 포인트**:
- `officer`는 조직 내 직책 (위원)
- `district_admin`은 시스템 권한 (지부 운영자)
- 두 개념이 UI에서 혼용됨

**정책 명확화 필요**:
```javascript
// AuthContext.tsx에 명시됨
// Note: 임원은 직책이며 권한이 아님. 권한은 별도로 부여해야 함.
```

### 4-2. 분회별 인트라넷 격리 미확인

**문제**: `/intranet/*` 경로는 분회를 구분하지 않는 구조

**위험**: 분회 A 사용자가 분회 B 데이터 접근 가능성 (API 레벨 검증 필요)

### 4-3. 인증 상태 임시 처리

**문제**: `useAuth()` context에서 `isLoading` 상태 있으나, 서버 응답 시간 동안 loading UI 표시 미확인

### 4-4. Role 매핑 로직

**위치**: `AuthContext.tsx` 118-135줄

**현황**: API 서버 역할 → KPA Society 역할 매핑 테이블 존재
```javascript
const roleMap = {
  'membership_district_admin': 'district_admin',
  'membership_branch_admin': 'branch_admin',
  'membership_super_admin': 'super_admin',
  'admin': 'district_admin',  // 일반 admin도 district_admin으로 매핑
};
```

**위험**: `admin` 역할이 `district_admin`으로 매핑되어 의도치 않은 권한 부여 가능

---

## 5. 💤 의도적 미구현

### 5-1. Backend API (Mock 데이터)

| 라우트 | 상태 | 비고 |
|--------|------|------|
| `/kpa/news` | Mock | 약사공론 API 연동 대기 |
| `/kpa/resources` | Mock | 자료실 API 미구현 |
| `/kpa/groupbuy` | Mock | 공동구매 Entity 없음 |
| `/kpa/mypage` | 부분 | 프로필만 구현 |

### 5-2. Frontend 기능

| 기능 | 상태 | 비고 |
|------|------|------|
| 문서 다운로드 | UI 데모 | `alert('다운로드 (UI 데모)')` |
| 페이지네이션 | Disabled | UI만 존재 |
| 설정 저장 | UI 데모 | API 미연동 |

### 5-3. 위원회/직책 관리

**현황**: 라우트 정의 없음

**대안**: 조직 구조(`KpaOrganization` type='group')로 대체 가능

---

## 6. "건드리지 말아야 할 영역" 명시

### 6-1. 안정화 완료 영역

| 영역 | 이유 |
|------|------|
| **RBAC 미들웨어** | 전체 API 권한 체계의 근간 |
| **조직/회원/신청 API** | 핵심 데이터 처리 로직 |
| **인증 토큰 처리** | Bearer + httpOnly 쿠키 양쪽 지원 |
| **변경 로그 기록** | 감사 추적 기능 |

### 6-2. 변경 시 리스크가 큰 부분

| 영역 | 리스크 |
|------|--------|
| **Role 매핑 로직** | 기존 사용자 권한 영향 |
| **AuthContext** | 전체 인증 흐름 영향 |
| **라우팅 구조** | 북마크/링크 깨짐 |
| **KPA 엔티티 스키마** | 데이터 마이그레이션 필요 |

---

## 7. 위험/보완 포인트 목록 (Work Order 후보)

다음 항목들은 우선순위 없이 나열됨. 사용자 판단 후 Work Order 진행 여부 결정.

### 보완 필요 (UX)

1. **CMS 슬롯/콘텐츠 API 실제 응답 확인** - Hero 슬라이드 비어있을 때 처리
2. **약사공론 뉴스 API 연동** - 샘플 데이터 대체
3. **설정 페이지 API 저장 기능 구현** - 현재 UI 데모만
4. **페이지네이션 활성화** - 현재 disabled

### 보완 필요 (권한)

5. **분회 관리자 권한 체크 API 구현** - BranchAdminAuthGuard TODO 해소
6. **분회별 인트라넷 데이터 격리 확인** - API 레벨 검증
7. **Role vs Position 정책 명확화** - 문서화 또는 UI 개선

### 검토 필요

8. **admin → district_admin 매핑 적절성 검토** - 의도된 동작인지 확인
9. **인증 로딩 상태 UX** - 서버 응답 대기 중 사용자 경험

---

## 8. 결론

### 현재 상태 평가

**Frontend**: 라우팅, 화면 구조, 권한별 UI 노출, Empty State 처리 **정상 구현**

**Backend**: 조직/회원/신청/공지 API **완전 구현**, 회의/문서/일정 API는 **Mock 또는 미구현**

**권한 체계**: RBAC 구현 완료, 다만 Role vs Position **혼동 가능성** 존재

### 실사용 판단

- **테스트 환경**: 주요 화면/기능 확인 **가능**
- **실서비스**: CMS 연동, 약사공론 API 연동, 설정 저장 기능 **추가 필요**

### 다음 단계 권장

1. 본 조사 결과 검토 후 **보완 범위 확정**
2. Work Order는 **조사 결과 합의 이후**에만 진행
3. 우선순위 결정 시 **위험 요소**(섹션 4)부터 검토

---

*Investigation Report V1.0*
*Date: 2026-01-18*
*Status: COMPLETED*
