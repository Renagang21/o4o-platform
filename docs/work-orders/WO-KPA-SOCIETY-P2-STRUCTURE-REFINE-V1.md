# WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1

**Work Order Type**: Structure Refactoring (구조 정비)
**Priority**: High (Phase 4 호환성 긴급)
**Status**: Ready for Implementation
**Created**: 2026-02-05
**Owner**: Development Team

---

## 1. 목적 (Purpose)

kpa-society.co.kr 프론트엔드의
**서비스 구획·권한 소비 구조·미래 확장성**을 정비한다.

본 작업은 **기능 추가가 아닌 구조 정비**를 목적으로 한다.

---

## 2. 배경 (Background)

### 현재 상황

* kpa-society에는 논리적으로 3개 서비스가 존재함
  * 메인 커뮤니티 (서비스 A)
  * 지부/분회 연동 서비스 (서비스 B - 데모)
  * 분회 독립 서비스 (서비스 C - 실서비스)

* 현재 프론트엔드는:
  * 2개 서비스 구조로 구현됨 (A, B)
  * 분회 독립 서비스(C)가 `/demo` 내부에 흡수됨

### Phase 4 충돌 문제

* Phase 4 Role Prefix 도입 이후:
  * Backend는 Dual-format을 제공 (`role` + `roles[]`)
  * Frontend는 이를 구조적으로 소비하지 못함

**Phase 2 조사 결과**:
- API 응답: `user.roles = ["admin", "kpa:admin"]` (Phase 4 정보 포함)
- AuthContext: `user.role = "admin"`만 저장 (`roles` 배열 무시)
- AuthGuard: `user.role`만 체크, Prefixed roles 인식 불가능

**결과**: Phase 4 prefixed roles를 가진 사용자가 관리자 화면 접근 불가

---

## 3. 범위 (Scope)

### 포함

* ✅ AuthContext 구조 재정비 (role 소비 방식)
* ✅ AuthGuard 권한 소비 구조 정비
* ✅ 서비스 A/B/C 경계 재정의 (코드 기준)
* ✅ 분회 독립 서비스 확장을 위한 구조 정리

### 제외

* ❌ UI 리디자인
* ❌ 신규 기능 추가
* ❌ 운영자 대시보드 실제 구현
* ❌ 데이터 마이그레이션

---

## 4. 작업 항목 (Tasks)

### P2-T1. AuthContext 역할 구조 정비

**목적**: Phase 4 prefixed roles 정보를 프론트엔드에서 보존·활용 가능하도록 함

**작업 내용**:
1. User 인터페이스에 `roles?: string[]` 필드 추가
2. `createUserFromApiResponse()` 함수 수정
   - `apiUser.roles` 배열 보존
   - `apiUser.role` fallback 유지
3. 기존 코드 호환성 유지
   - `user.role` 접근 코드 그대로 작동
   - `user.roles` 배열 추가로 새로운 확장 가능

**완료 기준**:
- `user.roles` 배열이 AuthContext에 저장됨
- 기존 `user.role` 사용 코드 정상 작동
- Login / Refresh 모두 `roles` 배열 보존

**Backward Compatibility**:
- `user.role` 필드 유지 (제거 안 함)
- 기존 코드 수정 불필요
- Additive change (확장만, 파괴 없음)

---

### P2-T2. AuthGuard 권한 소비 방식 정비

**목적**: Legacy + Prefixed roles를 모두 인식하여 Phase 4 호환성 확보

**작업 내용**:
1. AdminAuthGuard 수정
   - `user.roles` 배열 체크 로직 추가
   - Legacy roles (`admin`, `membership_*`) 유지
   - Prefixed roles (`kpa:admin`, `platform:admin`) 추가
2. BranchAdminAuthGuard 수정
   - 동일한 패턴 적용
   - `kpa:branch_admin`, `kpa:branch_operator` 지원
3. DEV 모드 우회 로직 재검토
   - 보안 위험 평가
   - 제거 또는 명시적 경고 추가

**완료 기준**:
- `user.role = "admin"` → ✅ 접근 허용 (기존 사용자)
- `user.role = "kpa:admin"` → ✅ 접근 허용 (Phase 4 사용자)
- `user.roles = ["admin", "kpa:admin"]` → ✅ 접근 허용 (Dual-format)
- 기존 사용자 영향 없음

**Backward Compatibility**:
- Legacy roles 체크 로직 유지
- 기존 사용자 접근 권한 변경 없음
- Additive change (확장만)

---

### P2-T3. 서비스 구획 기준 명시

**목적**: 향후 분회 독립 서비스(C) 분리를 위한 구조적 여지 확보

**작업 내용**:
1. 서비스 경계 코드 주석으로 명확히 표시
   - `/` = 서비스 A (메인 커뮤니티)
   - `/demo` = 서비스 B (지부/분회 데모)
   - `/demo/branch/:branchId/*` = 서비스 C 흡수 상태 (향후 분리 대상)
2. BranchRoutes, BranchProvider, BranchLayout 구조 정리
   - 독립 가능성 평가
   - 의존성 최소화 방향 제시
3. 분회 독립 서비스를 위한 Context 분리 포인트 식별
   - 현재 BranchContext 분석
   - 향후 독립 시 필요한 Context 구조 설계 (문서화만)

**완료 기준**:
- 서비스 경계가 코드 주석으로 명확히 표시됨
- 분회 독립 서비스 분리 시나리오 문서화
- 실제 분리 작업 없음 (구조만 준비)

**비고**:
- **즉시 분리 ❌**
- **구조적 가능성 확보 ✅**

---

### P2-T4. "미래 운영자" 확장 지점 확보

**목적**: Super Operator 개념을 고려한 구조적 확장 포인트 준비

**작업 내용**:
1. AuthContext 확장 포인트 식별
   - `isSuperOperator` 플래그 가능 위치
   - 운영자 전용 Context 분리 가능성
2. AuthGuard 확장 포인트 식별
   - 운영자 우회 로직 위치
   - 서비스별 운영자 권한 체크 위치
3. 문서화
   - Super Operator 개념 정의
   - 확장 시나리오 작성
   - 코드 주석으로 확장 포인트 표시

**완료 기준**:
- Super Operator 개념 문서화
- 확장 포인트 코드 주석 표시
- 실제 기능 구현 없음

**비고**:
- **실제 구현 ❌**
- **확장 지점 확보 ✅**

---

## 5. 완료 기준 (Done Criteria)

### 기술적 완료 기준

- [x] Phase 4 prefixed role을 프론트엔드가 **구조적으로 수용**
- [x] 기존 사용자/권한 흐름 **깨지지 않음**
- [x] 분회 독립 서비스가 **추후 분리 가능한 상태**
- [x] 문서보다 **코드 구조가 기준**이 됨

### 검증 기준

**P2-T1 검증**:
```typescript
// AuthContext.tsx
interface User {
  role?: string;  // 기존 (호환성)
  roles?: string[];  // 신규 (Phase 4)
}

// Login 후 확인
console.log(user.role);  // "admin" (Legacy)
console.log(user.roles);  // ["admin", "kpa:admin"] (Phase 4)
```

**P2-T2 검증**:
```typescript
// AdminAuthGuard.tsx
// Legacy role 사용자
user.role = "admin" → ✅ 접근 허용

// Phase 4 prefixed role 사용자
user.role = "kpa:admin" → ✅ 접근 허용

// Dual-format 사용자
user.roles = ["admin", "kpa:admin"] → ✅ 접근 허용
```

**Regression Test**:
- 기존 사용자 (Legacy roles만 보유) 로그인 → 관리자 화면 접근 ✅
- Phase 4 사용자 (Prefixed roles만 보유) 로그인 → 관리자 화면 접근 ✅
- DEV 모드 동작 확인 (변경 시)

---

## 6. 비고 (Notes)

### 원칙

* 본 작업은 **정비 작업**이며 기능 개발이 아님
* 중간에 구조적 판단이 필요한 경우 즉시 중단 후 검토
* 한 번에 끝내려 하지 않고 **안전한 단계적 정비**를 원칙으로 함

### 참조 문서

**Phase 1 조사**:
- [kpa-society-phase1-investigation-results.md](../investigations/kpa-society-phase1-investigation-results.md) - 서비스 구조 조사
- [kpa-society-phase1-authguard-summary.md](../investigations/kpa-society-phase1-authguard-summary.md) - AuthGuard 분석
- [kpa-society-phase1-final-summary.md](../investigations/kpa-society-phase1-final-summary.md) - Phase 1 최종 요약

**Phase 2 조사**:
- [kpa-society-phase2a-api-response.md](../investigations/kpa-society-phase2a-api-response.md) - API 응답 구조
- [kpa-society-phase2b-authcontext-storage.md](../investigations/kpa-society-phase2b-authcontext-storage.md) - AuthContext 저장 구조
- [kpa-society-phase2c-authguard-consumption.md](../investigations/kpa-society-phase2c-authguard-consumption.md) - AuthGuard 소비 구조

**Phase 4 Backend**:
- [phase-4-consolidated-completion-report.md](../investigations/phase-4-consolidated-completion-report.md) - Phase 4 백엔드 구현 완료

### 위험 관리

**Low Risk (안전)**:
- P2-T1: AuthContext 구조 확장 (Additive)
- P2-T2: AuthGuard Legacy roles 유지 (Backward compatible)

**Medium Risk (주의)**:
- P2-T2: DEV 모드 우회 로직 변경 시
- P2-T3: 서비스 경계 재정의 시 혼란 가능성

**High Risk (없음)**:
- 기능 추가 없음
- 데이터 마이그레이션 없음
- UI 변경 없음

---

## 7. 실행 순서

### Phase 1: AuthContext 구조 정비 (P2-T1)
1. User 인터페이스 수정
2. createUserFromApiResponse 수정
3. 테스트 및 검증

### Phase 2: AuthGuard 정비 (P2-T2)
1. AdminAuthGuard 수정
2. BranchAdminAuthGuard 수정
3. DEV 모드 검토
4. 테스트 및 검증

### Phase 3: 서비스 구획 정리 (P2-T3)
1. 서비스 경계 주석 추가
2. BranchRoutes 구조 정리
3. 분리 시나리오 문서화

### Phase 4: 확장 지점 확보 (P2-T4)
1. Super Operator 개념 문서화
2. 확장 포인트 코드 주석
3. 시나리오 문서 작성

---

**Work Order Status**: ✅ Ready for Implementation

**Next Step**: P2-T1 세부 실행 계획 수립

---

*Work Order Created: 2026-02-05*
*Last Updated: 2026-02-05*
