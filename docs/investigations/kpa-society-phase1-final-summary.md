# kpa-society.co.kr Phase 1 조사 최종 요약

**조사 일자**: 2026-02-05
**조사 범위**: services/web-kpa-society 서비스 구조 및 Phase 4 호환성
**Work Order**: 사전 조사 (Phase 0)

---

## Executive Summary

kpa-society.co.kr 프론트엔드 서비스를 조사한 결과, **사용자가 예상한 3개 서비스가 아닌 2개 서비스**가 존재하며, **Phase 4 role prefix 마이그레이션과 충돌하는 2개의 AuthGuard**를 발견했습니다.

---

## 1. 서비스 구조 (가설 vs 실제)

### 사용자 가설
- 서비스 A: 메인 커뮤니티 (분회 단독)
- 서비스 B: 지부/분회 연동 데모
- 서비스 C: 분회 단독 데모

### 실제 조사 결과
- ✅ **서비스 A**: 메인 커뮤니티 - `/` 경로
  - CommunityHomePage (커뮤니티 홈)
  - Pharmacy (약국 경영지원 - 실 서비스)
  - Work (근무약사 업무)
  - Layout 사용

- ✅ **서비스 B**: 지부/분회 데모 - `/demo` 경로
  - 실질적인 약사회 SaaS 플랫폼
  - Forum, News, LMS, Groupbuy, Docs 등 모든 커뮤니티 기능
  - 지부 관리자 (`/demo/admin/*`)
  - 서비스 운영자 (`/demo/operator/*`)
  - 인트라넷 (`/demo/intranet/*`)
  - 분회 서비스 (`/demo/branch/:branchId/*`)
  - 분회 관리자 (`/demo/branch/:branchId/admin/*`)
  - DemoLayout 사용

- ❌ **서비스 C**: **존재하지 않음**
  - `/demo/branch/:branchId/*`는 서비스 B의 하위 경로
  - 동적 라우팅으로 분회별 화면 렌더링
  - 독립적인 서비스가 아님

---

## 2. 주요 발견사항

### 발견 1: 서비스 A는 "진입점"
- 실제 커뮤니티 기능(Forum, News, LMS)은 **없음**
- 서비스 소개(`/services/*`)와 가입(`/join/*`) 페이지만 존재
- 약국/근무약사 기능만 실 서비스

### 발견 2: 서비스 B가 실질적인 플랫폼
- 모든 커뮤니티 기능이 `/demo` 하위에 존재
- 조직 관리, 관리자 기능 포함
- Legacy redirect: 원래는 루트 경로였으나 WO-KPA-DEMO-ROUTE-ISOLATION-V1에서 `/demo`로 이동

### 발견 3: 인증/조직 Context는 공유
- AuthProvider, OrganizationProvider, LoginModal 모두 전역
- 서비스 A와 서비스 B가 동일한 인증 시스템 사용
- 사용자 로그인 상태 공유

### 발견 4: 🔥 **CRITICAL - Phase 4 호환성 문제**

**문제 상황**:
- 백엔드 Phase 4: `kpa:admin`, `kpa:operator`, `kpa:branch_admin` 등 prefixed roles 사용
- 프론트엔드: `admin`, `membership_branch_admin`, `super_admin` 등 legacy roles 기대

**충돌 파일**:
1. **AdminAuthGuard.tsx** - `/demo/admin/*` (지부 관리자)
   - Legacy roles 하드코딩
   - `kpa:admin` role 인식 못함 → 403 에러 예상

2. **BranchAdminAuthGuard.tsx** - `/demo/branch/:branchId/admin/*` (분회 관리자)
   - Legacy roles 하드코딩
   - `kpa:branch_admin` role 인식 못함 → 403 에러 예상

**정상 파일**:
3. IntranetAuthGuard.tsx - 단순 인증 체크, role 무관
4. ContextGuard.tsx - Context 기반 보호, role 무관

**예상 영향**:
- Phase 4 배포 후 관리자 화면 접근 불가
- 프로덕션 환경에서만 문제 발생 (DEV 모드는 우회)

---

## 3. 파일 조사 결과

### App.tsx (라우팅 구조)
- 위치: `services/web-kpa-society/src/App.tsx`
- 서비스 A: 160-209줄
- 서비스 B: 211-283줄
- Legacy Redirect: 265-281줄

### AuthContext.tsx (인증 시스템)
- 위치: `services/web-kpa-society/src/contexts/AuthContext.tsx`
- Platform User 인증
- Service User 인증 (Phase 2-b)
- WO-P0-KPA-OPERATOR-CONTEXT-FIX-V1: Role 매핑 제거

### AdminAuthGuard.tsx (⚠️ 수정 필요)
- 위치: `services/web-kpa-society/src/components/admin/AdminAuthGuard.tsx`
- 함수: `checkBranchAdminRole()` (86-116줄)
- 문제: Legacy roles만 체크

### BranchAdminAuthGuard.tsx (⚠️ 수정 필요)
- 위치: `services/web-kpa-society/src/components/branch-admin/BranchAdminAuthGuard.tsx`
- 함수: `checkBranchAdminRole()` (116-143줄)
- 문제: Legacy roles만 체크

### Layout.tsx vs DemoLayout.tsx
- Layout: `Header` + Content + Footer
- DemoLayout: `DemoHeader` + Content + Footer
- WO-KPA-DEMO-HEADER-SEPARATION-V1: 시각적 분리

### BranchRoutes.tsx (동적 라우팅)
- 위치: `services/web-kpa-society/src/routes/BranchRoutes.tsx`
- `:branchId` 파라미터 기반 동적 라우팅
- BranchProvider, BranchLayout 사용

---

## 4. Phase 2 조사 방향

### 긴급 우선순위 (Phase 4 호환성)

1. **API 응답 role 형식 확인**
   - 백엔드가 현재 반환하는 role 형식 확인
   - `user.role` (단일) vs `user.roles[]` (배열) 여부 확인
   - Phase 4 이후 실제 role 값 확인

2. **AdminAuthGuard 수정**
   - Backward compatibility 방식 권장
   - Prefixed roles 추가: `kpa:admin`, `kpa:operator`, `platform:admin`
   - Legacy roles 유지 (점진적 마이그레이션)

3. **BranchAdminAuthGuard 수정**
   - Prefixed roles 추가: `kpa:branch_admin`, `kpa:branch_operator`, `kpa:admin`
   - 분회별 권한 검사 로직 추가 (TODO 해결)

### 일반 우선순위

4. **OrganizationProvider 분석**
   - 조직 context 구조 확인
   - 서비스 간 상태 공유 메커니즘

5. **BranchAdminRoutes 내부 구조**
   - 분회 관리자 화면 상세 분석
   - 분회별 데이터 격리 메커니즘

6. **API 호출 패턴 분석**
   - 서비스 A vs B의 API 호출 차이
   - 백엔드 엔드포인트 구분 여부

---

## 5. 권장 수정 전략 (Phase 4 호환성)

### 옵션 A: Backward Compatibility (권장)

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
- 기존 사용자 영향 없음
- 점진적 마이그레이션 가능
- 롤백 안전

---

## 6. 결론

### 서비스 구조
- ✅ 2개 서비스 확인 (서비스 A: `/`, 서비스 B: `/demo`)
- ❌ 서비스 C는 존재하지 않음 (서비스 B 내부의 분회 화면)
- ✅ 인증/조직 Context 공유
- ✅ Layout 분리 (Layout vs DemoLayout)

### Phase 4 호환성 문제
- ⚠️ **AdminAuthGuard, BranchAdminAuthGuard에서 충돌 발견**
- ⚠️ Prefixed roles 인식 못함 → 관리자 화면 접근 불가 예상
- ⚠️ 프로덕션 환경에서만 문제 발생 (DEV 모드는 우회)
- 🔥 **Phase 4 배포 전 필수 수정** 또는 **즉시 핫픽스 필요**

### 다음 단계
- Phase 2-A: API 응답 role 형식 확인
- Phase 2-B: AdminAuthGuard 수정 (Backward compatibility)
- Phase 2-C: BranchAdminAuthGuard 수정
- Phase 2-D: 통합 테스트

---

## 7. 생성된 문서

1. **[kpa-society-phase1-investigation-results.md](./kpa-society-phase1-investigation-results.md)** - 상세 조사 결과 (라우팅, Layout, 인증, Context)
2. **[kpa-society-phase1-authguard-summary.md](./kpa-society-phase1-authguard-summary.md)** - AuthGuard 전수 조사 및 Phase 4 충돌 분석
3. **[kpa-society-phase1-final-summary.md](./kpa-society-phase1-final-summary.md)** - 본 문서 (최종 요약)

---

**Phase 1 조사 완료**

**Status**: ✅ 완료
**Critical Issue**: 🔥 Phase 4 호환성 문제 발견 (2개 AuthGuard)
**Next Step**: Phase 2 - API 확인 및 AuthGuard 수정

---

*조사 완료 시각: 2026-02-05*
*조사 도구: Claude Code*
