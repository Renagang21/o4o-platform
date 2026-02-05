# Phase 1 AuthGuard 분석 요약

**조사 일자**: 2026-02-05
**조사 범위**: services/web-kpa-society 내 모든 AuthGuard 컴포넌트
**목적**: Phase 4 role prefix 마이그레이션과의 충돌 범위 파악

---

## AuthGuard 전수 조사 결과

| AuthGuard | 파일 | Role 체크 여부 | Phase 4 충돌 | 상태 |
|-----------|------|----------------|--------------|------|
| AdminAuthGuard | [admin/AdminAuthGuard.tsx](services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx) | ✅ Legacy roles | ⚠️ **충돌** | 수정 필요 |
| BranchAdminAuthGuard | [branch-admin/BranchAdminAuthGuard.tsx](services/web-kpa-society/src/components/branch-admin/BranchAdminAuthGuard.tsx) | ✅ Legacy roles | ⚠️ **충돌** | 수정 필요 |
| IntranetAuthGuard | [intranet/IntranetAuthGuard.tsx](services/web-kpa-society/src/components/intranet/IntranetAuthGuard.tsx) | ❌ 인증만 체크 | ✅ 충돌 없음 | 수정 불필요 |
| ContextGuard | [common/ContextGuard.tsx](services/web-kpa-society/src/components/common/ContextGuard.tsx) | ❌ Context 체크 | ✅ 충돌 없음 | 수정 불필요 |

---

## 1. AdminAuthGuard (⚠️ 충돌)

**파일**: `services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx`

**사용 위치**: `/demo/admin/*` (지부 관리자)

**권한 검사 함수**:
```tsx
function checkBranchAdminRole(user: User): boolean {
  const role = user.role;

  // ❌ Legacy unprefixed roles만 체크
  if (role === 'super_admin' || role === 'membership_super_admin') return true;
  if (role === 'membership_branch_admin' || role === 'membership_branch_operator') return true;
  if (role === 'membership_district_admin') return true;
  if (role === 'admin') return true;

  // DEV 모드에서는 임시 허용
  if (import.meta.env.DEV) {
    console.warn('[DEV MODE] Branch admin access allowed for testing');
    return true;
  }

  return false;
}
```

**문제점**:
- ❌ Phase 4 prefixed roles (`kpa:admin`, `kpa:operator`) 인식 못함
- ❌ `kpa:admin` role을 가진 사용자도 **false 반환**
- ⚠️ DEV 모드에서는 모든 사용자 허용 → 프로덕션 배포 후에만 문제 발견됨

**예상 영향**:
- Phase 4 배포 후 `/demo/admin/*` 접근 시 403 에러
- 관리자가 관리 화면 접근 불가

---

## 2. BranchAdminAuthGuard (⚠️ 충돌)

**파일**: `services/web-kpa-society/src/components/branch-admin/BranchAdminAuthGuard.tsx`

**사용 위치**: `/demo/branch/:branchId/admin/*` (분회 관리자)

**권한 검사 함수**:
```tsx
function checkBranchAdminRole(user: User, _branchId: string): boolean {
  const role = user.role;

  // ❌ Legacy unprefixed roles만 체크
  if (role === 'super_admin' || role === 'membership_super_admin') return true;
  if (role === 'district_admin' || role === 'membership_district_admin') return true;
  if (role === 'branch_admin' || role === 'membership_branch_admin') return true;
  if (role === 'admin') return true;

  return false;
}
```

**문제점**:
- ❌ Phase 4 prefixed roles (`kpa:branch_admin`, `kpa:branch_operator`) 인식 못함
- ❌ `kpa:branch_admin` role을 가진 사용자도 **false 반환**
- ⚠️ TODO 주석: "해당 분회에 대한 권한이 있는지 확인" - 현재는 모든 분회 접근 허용

**예상 영향**:
- Phase 4 배포 후 `/demo/branch/:branchId/admin/*` 접근 시 403 에러
- 분회 관리자가 분회 관리 화면 접근 불가

---

## 3. IntranetAuthGuard (✅ 충돌 없음)

**파일**: `services/web-kpa-society/src/components/intranet/IntranetAuthGuard.tsx`

**사용 위치**: `/demo/intranet/*` (인트라넷)

**권한 검사 로직**:
```tsx
export function IntranetAuthGuard({ children }: IntranetAuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const isDev = import.meta.env.DEV;

  if (!isAuthenticated && !isDev) {
    return <AccessDeniedUI />;
  }

  return <>{children}</>;
}
```

**특징**:
- ✅ 단순 인증 여부만 체크 (role 무관)
- ✅ Phase 4 prefixed roles와 **충돌 없음**
- ✅ DEV 모드에서는 인증 우회

**결론**: 수정 불필요

---

## 4. ContextGuard (✅ 충돌 없음)

**파일**: `services/web-kpa-society/src/components/common/ContextGuard.tsx`

**용도**: WO-CONTEXT-SWITCH-FOUNDATION-V1 - 컨텍스트 기반 라우트 보호

**권한 검사 로직**:
```tsx
export function ContextGuard({
  requiredType,
  fallbackPath = '/',
  children,
}: ContextGuardProps) {
  const { user } = useAuth();
  const { activeContext, isContextSet } = useOrganization();

  // 미로그인
  if (!user) return <Navigate to="/demo/login" replace />;

  // 컨텍스트 미설정
  if (!isContextSet || !activeContext) return <Navigate to={fallbackPath} replace />;

  // 컨텍스트 유형 확인
  const requiredTypes = Array.isArray(requiredType) ? requiredType : [requiredType];
  if (!requiredTypes.includes(activeContext.contextType)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
}
```

**특징**:
- ✅ Role이 아닌 **Context 유형** 체크
- ✅ Phase 4 prefixed roles와 **충돌 없음**
- ✅ Context 기반 접근 제어 (pharmacy, branch, district 등)

**결론**: 수정 불필요

---

## Phase 4 호환성 문제 요약

### 충돌 파일 (수정 필요)

1. **AdminAuthGuard.tsx** - 지부 관리자 권한 체크
   - 위치: `/demo/admin/*`
   - 문제: Legacy roles 하드코딩
   - 영향: `kpa:admin`, `kpa:operator` 접근 차단

2. **BranchAdminAuthGuard.tsx** - 분회 관리자 권한 체크
   - 위치: `/demo/branch/:branchId/admin/*`
   - 문제: Legacy roles 하드코딩
   - 영향: `kpa:branch_admin`, `kpa:branch_operator` 접근 차단

### 정상 파일 (수정 불필요)

3. **IntranetAuthGuard.tsx** - 인트라넷 인증 체크
   - 위치: `/demo/intranet/*`
   - 이유: Role 무관, 단순 인증 체크

4. **ContextGuard.tsx** - 컨텍스트 기반 라우트 보호
   - 위치: Context 보호 필요 라우트
   - 이유: Role 무관, Context 유형 체크

---

## Phase 2 조사 및 수정 방향

### Phase 2에서 수정할 파일

| 파일 | 수정 내용 | 우선순위 |
|------|----------|---------|
| AdminAuthGuard.tsx | Prefixed roles 추가 (`kpa:admin`, `kpa:operator`, `platform:admin`) | 🔥 긴급 |
| BranchAdminAuthGuard.tsx | Prefixed roles 추가 (`kpa:branch_admin`, `kpa:branch_operator`, `kpa:admin`) | 🔥 긴급 |
| AuthContext.tsx | `user.role` → `user.roles[]` 배열 지원 확인 | ⚠️ 중요 |

### 수정 전략 옵션

**옵션 A: Backward Compatibility (권장)**
```tsx
function checkBranchAdminRole(user: User): boolean {
  const role = user.role;
  const roles = user.roles || [role]; // 배열 지원

  // Phase 4: Prefixed roles (신규)
  if (roles.some(r => ['kpa:admin', 'kpa:operator', 'platform:admin', 'platform:super_admin'].includes(r))) {
    return true;
  }

  // Legacy roles (호환성)
  if (role === 'super_admin' || role === 'membership_super_admin') return true;
  if (role === 'membership_branch_admin' || role === 'membership_branch_operator') return true;
  if (role === 'membership_district_admin') return true;
  if (role === 'admin') return true;

  return false;
}
```

**장점**:
- 기존 사용자 영향 최소화
- 점진적 마이그레이션 가능
- 롤백 안전

**옵션 B: Clean Break (위험)**
```tsx
function checkBranchAdminRole(user: User): boolean {
  const roles = user.roles || [];

  // Phase 4: Prefixed roles만 허용
  return roles.some(r => ['kpa:admin', 'kpa:operator', 'platform:admin'].includes(r));
}
```

**장점**:
- 깔끔한 코드
- Legacy debt 제거

**단점**:
- 기존 사용자 즉시 차단
- 데이터 마이그레이션 필수
- 롤백 어려움

---

## 권장 수정 순서

1. **Phase 2-A: API 응답 확인**
   - 백엔드가 반환하는 role 형식 확인
   - `user.role` vs `user.roles[]` 여부 확인
   - Phase 4 마이그레이션 이후 실제 role 값 확인

2. **Phase 2-B: AdminAuthGuard 수정**
   - Backward compatibility 방식 적용
   - Legacy + Prefixed roles 모두 지원
   - 테스트: 기존 사용자 + 신규 role 사용자 모두 접근 가능

3. **Phase 2-C: BranchAdminAuthGuard 수정**
   - 동일한 방식으로 수정
   - 분회별 권한 검사 로직 추가 (TODO 해결)

4. **Phase 2-D: 통합 테스트**
   - 모든 AuthGuard 시나리오 테스트
   - Legacy role 사용자 접근 테스트
   - Prefixed role 사용자 접근 테스트

---

## 결론

- **충돌 파일**: 2개 (AdminAuthGuard, BranchAdminAuthGuard)
- **정상 파일**: 2개 (IntranetAuthGuard, ContextGuard)
- **수정 방식**: Backward Compatibility 권장
- **긴급도**: 🔥 **Phase 4 배포 전 필수 수정**

Phase 4가 이미 프로덕션에 배포되었다면, **즉시 핫픽스 필요**.

---

**Phase 1 AuthGuard 조사 완료**
**다음 단계**: Phase 2 - API 응답 확인 및 AuthGuard 수정
