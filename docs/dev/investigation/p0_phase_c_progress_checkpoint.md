# Phase C 진행 상황 체크포인트

> 생성일: 2025-11-09
> 브랜치: `feat/user-refactor-p0-zerodata`
> 체크포인트: C-1 완료 (auth-client 타입 및 API 메서드 추가)

---

## 📋 Phase C 전체 진행 상황

### ✅ 완료된 작업

#### 0️⃣ 사전 동기화
- [x] 브랜치 동기화 (`feat/user-refactor-p0-zerodata`)
- [x] 의존성 설치 (`pnpm install`)
- [x] Phase B 배포 완료 확인 (API 서버)

#### 1️⃣ C-1: 타입 및 API 클라이언트 업데이트

**파일**: `packages/auth-client/src/types.ts`

추가된 타입:
```typescript
// P0 RBAC: Role Assignment Type
export interface RoleAssignment {
  role: 'supplier' | 'seller' | 'partner' | 'admin';
  active: boolean;
  activated_at: string | null;
  deactivated_at: string | null;
  valid_from: string;
  valid_until: string | null;
  assigned_by: string | null;
  assigned_at: string;
}

// P0 RBAC: /me Response Type
export interface MeResponse {
  success: boolean;
  user: User;
  assignments: RoleAssignment[];
}

// P0 RBAC: Enrollment Types
export type EnrollmentRole = 'supplier' | 'seller' | 'partner';
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected' | 'on_hold';

export interface Enrollment {
  id: string;
  userId: string;
  role: EnrollmentRole;
  status: EnrollmentStatus;
  metadata?: Record<string, any>;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reason?: string;
}

export interface EnrollmentCreateData {
  role: EnrollmentRole;
  metadata?: Record<string, any>;
}

export interface EnrollmentListResponse {
  success: boolean;
  enrollments: Enrollment[];
  total?: number;
}
```

**파일**: `packages/auth-client/src/cookie-client.ts`

추가된 메서드:
```typescript
// 사용자 API
async getCurrentUser(): Promise<MeResponse | null>
async createEnrollment(data: EnrollmentCreateData): Promise<Enrollment>
async getMyEnrollments(): Promise<Enrollment[]>

// 관리자 API
async getAdminEnrollments(params): Promise<EnrollmentListResponse>
async approveEnrollment(id: string, notes?: string): Promise<void>
async rejectEnrollment(id: string, reason: string): Promise<void>
async holdEnrollment(id: string, reason: string, requiredFields?: string[]): Promise<void>
```

**빌드 상태**: ✅ 성공
- `cd packages/auth-client && npx tsc --build`
- 타입 정의 파일 생성 완료: `dist/types.d.ts`, `dist/cookie-client.d.ts`

---

### 🔄 진행 중인 작업

없음 (다음 세션 대기)

---

### ⏳ 남은 작업

#### 2️⃣ C-2: AuthContext 리팩토링 (/me 기반)

**파일**: `apps/main-site/src/contexts/AuthContext.tsx`

변경 사항:
- [ ] `cookieAuthClient` import 및 사용
- [ ] `getCurrentUser()` → MeResponse 처리
- [ ] `hasRole(role)` 헬퍼 함수 추가
- [ ] `assignments[]` 상태 관리
- [ ] 레거시 `role/roles/activeRole` 참조 제거
- [ ] 로그인/로그아웃 후 `/me` 자동 호출

**파일**: `apps/main-site/src/types/user.ts`

변경 사항:
- [ ] `RoleAssignment` 타입 추가 (auth-client에서 re-export)
- [ ] `AuthContextType`에 `hasRole()` 추가

**예상 소요 시간**: 30분

---

#### 3️⃣ C-3: 라우팅 구조 추가

**파일**: `apps/main-site/src/App.tsx`

추가할 라우트:
- [ ] `/apply/supplier` → `ApplySupplier` 컴포넌트
- [ ] `/apply/seller` → `ApplySeller` 컴포넌트
- [ ] `/apply/partner` → `ApplyPartner` 컴포넌트
- [ ] `/apply/:role/status` → `ApplyStatus` 컴포넌트
- [ ] `/dashboard/supplier` → `DashboardSupplier` (RoleGuard)
- [ ] `/dashboard/seller` → `DashboardSeller` (RoleGuard)
- [ ] `/dashboard/partner` → `DashboardPartner` (RoleGuard)

**새로운 파일**:
- [ ] `src/components/auth/RoleGuard.tsx`

**예상 소요 시간**: 20분

---

#### 4️⃣ C-4: RoleGuard / Redirect 정책

**파일**: `apps/main-site/src/components/auth/RoleGuard.tsx`

기능:
- [ ] `hasRole(role)` 확인
- [ ] 미승인 시 `/apply/{role}/status`로 리디렉션
- [ ] 로딩 상태 처리

**예상 소요 시간**: 15분

---

#### 5️⃣ C-5: 신청 폼 3종

**파일**: `apps/main-site/src/pages/apply/ApplySupplier.tsx`
**파일**: `apps/main-site/src/pages/apply/ApplySeller.tsx`
**파일**: `apps/main-site/src/pages/apply/ApplyPartner.tsx`

기능:
- [ ] 신청 폼 UI (기본 필드 + 약관 동의)
- [ ] `cookieAuthClient.createEnrollment()` 호출
- [ ] 409 에러 처리 (중복 신청 → 상태 페이지로)
- [ ] 422/429 에러 처리 (토스트 메시지)
- [ ] 성공 시 `/apply/{role}/status` 이동

**예상 소요 시간**: 1시간

---

#### 6️⃣ C-6: 상태 페이지

**파일**: `apps/main-site/src/pages/apply/ApplyStatus.tsx`

기능:
- [ ] `cookieAuthClient.getMyEnrollments()` 호출
- [ ] 역할별 최신 신청 건 표시
- [ ] 상태별 배지 + 안내 메시지
  - pending: "심사 중입니다"
  - on_hold: "보완 요청 중"
  - rejected: "승인 거부"
  - approved: "승인 완료 – 대시보드로 이동"
- [ ] 신청 내역 없을 때: "신청하기" 버튼

**예상 소요 시간**: 40분

---

#### 7️⃣ C-7: 관리자 화면

**파일**: `apps/admin-dashboard/src/pages/enrollments/EnrollmentManagement.tsx` (신규)

기능:
- [ ] `cookieAuthClient.getAdminEnrollments()` 호출
- [ ] 필터: 역할/상태/검색
- [ ] 목록 테이블
- [ ] 액션 버튼: Approve / Reject / Hold
- [ ] 전이 성공 시 목록 갱신
- [ ] 에러 처리 (403/429)

**파일**: `apps/admin-dashboard/src/App.tsx`

라우트 추가:
- [ ] `/admin/enrollments` 또는 `/enrollments`

**예상 소요 시간**: 1시간

---

#### 8️⃣ C-8: 전역 UI 동기화

**파일**: `apps/main-site/src/components/layout/Header.tsx` (또는 네비게이션)

변경사항:
- [ ] `hasRole()` 기반 메뉴 표시 제어
- [ ] 승인 전: "신청하기" 버튼
- [ ] 승인 후: "대시보드" 링크

**예상 소요 시간**: 20분

---

#### 9️⃣ 테스트 및 DoD 검증

체크리스트:
- [ ] 로그인 후 `/me` 호출 → `assignments[]` 정상 표시
- [ ] 공급자 신청 → 201 Created, 상태 페이지 이동
- [ ] 중복 신청 → 409 Conflict 처리
- [ ] 승인 전 대시보드 접근 → 상태 안내 리디렉션
- [ ] 승인 후 대시보드 접근 → 정상 진입
- [ ] 관리자 리스트 조회 / 전이 → 정상 처리
- [ ] 401/403/422/429 에러 → 메시지 표준 노출
- [ ] 레거시 role 필드 → FE 참조 없음

**예상 소요 시간**: 1시간

---

#### 🔟 구현 보고서 작성

**파일**: `docs/dev/investigations/user-refactor_2025-11/zerodata/p0_phase_c_implementation_report.md`

내용:
- [ ] 변경 요약
- [ ] DoD 체크 결과
- [ ] 스크린샷 (선택)
- [ ] 알려진 이슈

**예상 소요 시간**: 30분

---

## 📊 전체 진행률

- **완료**: C-0, C-1 (20%)
- **남은 작업**: C-2 ~ C-10 (80%)
- **예상 남은 시간**: 약 5~6시간

---

## 🚀 다음 세션 시작 가이드

### 1. 환경 확인

```bash
cd /home/sohae21/o4o-platform
git checkout feat/user-refactor-p0-zerodata
git pull origin feat/user-refactor-p0-zerodata
pnpm install
```

### 2. auth-client 빌드 확인

```bash
cd packages/auth-client
npx tsc --build
# dist/ 폴더에 types.d.ts, cookie-client.d.ts 확인
```

### 3. C-2부터 시작

**첫 번째 파일**: `apps/main-site/src/contexts/AuthContext.tsx`

**작업 내용**:
1. auth-client import 추가
   ```typescript
   import { cookieAuthClient, MeResponse, RoleAssignment } from '@o4o/auth-client';
   ```

2. `checkAuthStatus()` 수정
   ```typescript
   const response = await cookieAuthClient.getCurrentUser();
   if (response) {
     setUser({
       ...response.user,
       assignments: response.assignments
     });
   }
   ```

3. `hasRole(role)` 헬퍼 추가
   ```typescript
   const hasRole = (role: string): boolean => {
     return user?.assignments?.some(a => a.role === role && a.active) ?? false;
   };
   ```

4. Context value에 `hasRole` 추가

---

## 🔗 관련 문서

- [Phase B 완료 보고서](./p0_phase_b_completion.md)
- [Phase B 검증 체크리스트](./p0_phase_b_verification_checklist.md)
- [Phase C 실행 계획](./p0_phase_c_detailed_plan.md)
- [Phase C 실행 순서 v2](./p0_phase_c_execution_order_v2.md)

---

## 📝 참고 사항

### API 엔드포인트 (Phase B 배포 완료)

- `GET /api/v1/auth/cookie/me` - 사용자 정보 + assignments
- `POST /api/v1/enrollments` - 역할 신청
- `GET /api/v1/enrollments/my` - 내 신청 내역
- `GET /api/v1/admin/enrollments` - 관리자 목록 (필터 가능)
- `PATCH /api/v1/admin/enrollments/:id/approve` - 승인
- `PATCH /api/v1/admin/enrollments/:id/reject` - 반려
- `PATCH /api/v1/admin/enrollments/:id/hold` - 보류

### 환경 변수

**main-site** (`.env`):
```
VITE_API_URL=https://api.neture.co.kr/api/v1
```

**admin-dashboard** (`.env`):
```
VITE_API_URL=https://api.neture.co.kr/api/v1
```

### CORS 설정

- `withCredentials: true` (axios/fetch 전역 설정)
- 쿠키 도메인: `.neture.co.kr` (크로스 도메인 SSO)

---

*최종 업데이트: 2025-11-09*
*다음 작업: C-2 (AuthContext 리팩토링)*
