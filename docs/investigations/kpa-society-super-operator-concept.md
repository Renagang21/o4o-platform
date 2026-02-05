# Super Operator 개념 정의 및 확장 시나리오

**작성일**: 2026-02-05
**Work Order**: WO-KPA-SOCIETY-P2-STRUCTURE-REFINE-V1 (P2-T4)
**목적**: 향후 Super Operator 개념 도입을 위한 확장 지점 확보

---

## Super Operator 개념 정의

### 정의
**Super Operator**는 플랫폼 또는 서비스 레벨에서 **운영 목적으로** 관리자 권한을 우회하거나 다수의 서비스에 접근할 수 있는 특수 계정 유형이다.

### 일반 관리자(Admin)와의 차이

| 구분 | Admin | Super Operator |
|------|-------|----------------|
| **범위** | 단일 서비스 | 다수 서비스 또는 플랫폼 전체 |
| **목적** | 서비스 관리 | 플랫폼 운영, 문제 해결, 모니터링 |
| **권한** | 서비스별 고정 | 동적 스코프 기반 |
| **예시** | `kpa:admin` | `platform:super_operator` |

---

## Super Operator 유형

### 1. Platform Operator (플랫폼 운영자)
**정의**: 모든 서비스에 접근 가능한 최상위 운영자
**사용 사례**:
- 시스템 전체 모니터링
- 긴급 문제 해결
- 서비스 간 데이터 마이그레이션
- 보안 감사

**예시 role**:
- `platform:super_operator`
- `platform:admin`

**권한 범위**:
- KPA Society: ✅ 접근 가능
- GlycoPharm: ✅ 접근 가능
- Neture: ✅ 접근 가능
- 모든 서비스: ✅ 접근 가능

---

### 2. Service Operator (서비스 운영자)
**정의**: 특정 서비스에만 접근 가능한 운영자
**사용 사례**:
- 서비스별 문제 해결
- 서비스별 설정 변경
- 서비스 관리자 지원

**예시 role**:
- `kpa:operator`
- `glycopharm:operator`

**권한 범위**:
- 지정된 서비스만 접근
- 해당 서비스의 모든 관리 기능 사용

---

### 3. Branch Operator (분회 운영자)
**정의**: 특정 분회에만 접근 가능한 운영자
**사용 사례**:
- 분회별 문제 해결
- 분회 관리자 지원

**예시 role**:
- `kpa:branch_operator:{branchId}`

**권한 범위**:
- 특정 분회만 접근
- 분회 관리 기능 사용

---

## 확장 시나리오

### 시나리오 1: 플랫폼 운영자 도입

**요구사항**:
> "플랫폼 운영팀이 모든 서비스의 관리자 화면에 접근할 수 있어야 한다."

**구현 방향**:

1. **User 인터페이스 확장** (AuthContext.tsx):
```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  roles?: string[];

  // Super Operator 필드 추가
  isSuperOperator?: boolean;
  operatorLevel?: 'platform' | 'service' | 'branch';
  operatorScopes?: string[];  // ['kpa', 'glycopharm', 'neture']
}
```

2. **AuthGuard 확장** (AdminAuthGuard.tsx):
```typescript
function checkBranchAdminRole(user: User): boolean {
  // 기존 role 체크 로직...

  // Platform Operator 우회
  if (user.isSuperOperator && user.operatorLevel === 'platform') {
    console.log('[SUPER OPERATOR] Platform-level access granted');
    return true;
  }

  // Service Operator 체크
  if (user.isSuperOperator && user.operatorScopes?.includes('kpa')) {
    console.log('[SUPER OPERATOR] KPA service access granted');
    return true;
  }

  return false;
}
```

3. **Backend API 변경**:
```typescript
// User.toPublicData() 확장
toPublicData() {
  return {
    // ... 기존 필드
    isSuperOperator: this.hasRole('platform:super_operator'),
    operatorLevel: this.getOperatorLevel(),
    operatorScopes: this.getOperatorScopes(),
  };
}
```

---

### 시나리오 2: 서비스별 운영자

**요구사항**:
> "KPA 운영팀이 KPA Society와 KPA Pharmacy만 접근할 수 있어야 한다."

**구현 방향**:

1. **operatorScopes 활용**:
```typescript
user = {
  isSuperOperator: true,
  operatorLevel: 'service',
  operatorScopes: ['kpa', 'kpa-pharmacy'],
};
```

2. **AuthGuard 체크**:
```typescript
if (user.isSuperOperator && user.operatorScopes?.includes('kpa')) {
  return true;  // KPA Society 접근 허용
}
```

---

### 시나리오 3: DEV 모드 대체

**요구사항**:
> "개발 환경의 DEV 모드 우회를 Super Operator로 대체한다."

**구현 방향**:

1. **DEV 모드 제거**:
```typescript
// Before (P2-T2)
if (import.meta.env.DEV) {
  return true;  // 모든 사용자 허용 (보안 문제)
}

// After (Super Operator)
if (user.isSuperOperator && user.operatorLevel === 'platform') {
  return true;  // 플랫폼 운영자만 허용 (보안 강화)
}
```

2. **개발 환경 테스트 계정**:
```typescript
// Test account with Super Operator role
const DEV_SUPER_OPERATOR: User = {
  id: 'dev-super-operator',
  email: 'dev@o4o.kr',
  name: 'Dev Super Operator',
  isSuperOperator: true,
  operatorLevel: 'platform',
};
```

---

## 확장 지점 코드 위치

### 1. AuthContext (contexts/AuthContext.tsx)

**위치**: User 인터페이스 (Line 91-107)
**확장 포인트**:
```typescript
// P2-T4: Super Operator 확장 지점
// 향후 Super Operator 개념 도입 시:
// - isSuperOperator?: boolean;
// - operatorScopes?: string[];
// - operatorLevel?: 'platform' | 'service' | 'branch';
```

**역할**: Super Operator 메타데이터 저장

---

### 2. AdminAuthGuard (components/admin/AdminAuthGuard.tsx)

**위치**: checkBranchAdminRole 함수 (Line 86-152)
**확장 포인트**:
```typescript
// P2-T4: Super Operator 확장 지점
// 향후 Super Operator 개념 도입 시:
// if (user.isSuperOperator && user.operatorScopes?.includes('kpa')) {
//   console.log('[SUPER OPERATOR] KPA service access granted');
//   return true;
// }
```

**역할**: 플랫폼/서비스 운영자 우회 로직

---

### 3. BranchAdminAuthGuard (components/branch-admin/BranchAdminAuthGuard.tsx)

**위치**: checkBranchAdminRole 함수 (Line 116-166)
**확장 포인트**:
```typescript
// P2-T4: Super Operator 확장 지점
// 향후 Super Operator 개념 도입 시:
// if (user.isSuperOperator) {
//   if (user.operatorLevel === 'platform') {
//     return true;  // 플랫폼 운영자: 모든 분회 접근
//   }
//   if (user.operatorScopes?.includes(`kpa:branch:${_branchId}`)) {
//     return true;  // 분회별 운영자: 특정 분회만 접근
//   }
// }
```

**역할**: 분회별 운영자 권한 체크

---

## Super Operator Context 분리 가능성

### 옵션 1: User 인터페이스 확장 (권장)
**장점**: 기존 구조 활용, 단순함
**단점**: User 타입 복잡도 증가

### 옵션 2: OperatorContext 분리
**장점**: 관심사 분리, 독립적인 운영자 관리
**단점**: Context 복잡도 증가

**예시 구조**:
```typescript
// contexts/OperatorContext.tsx (신규)
interface OperatorContextType {
  isOperator: boolean;
  operatorLevel: 'platform' | 'service' | 'branch';
  operatorScopes: string[];
  hasOperatorScope: (scope: string) => boolean;
}

// AuthGuard에서 사용
const { isOperator, hasOperatorScope } = useOperator();
if (isOperator && hasOperatorScope('kpa')) {
  return true;
}
```

**현재 권장**: 옵션 1 (User 인터페이스 확장)
**향후 검토**: 운영자 기능이 복잡해지면 옵션 2 고려

---

## 보안 고려사항

### 1. Super Operator 권한 부여
- ⚠️ Super Operator는 **수동 승인** 필수
- ⚠️ 플랫폼 운영자는 **최소 인원**으로 제한
- ⚠️ 모든 Super Operator 활동은 **감사 로그** 기록

### 2. Scope 검증
- ⚠️ `operatorScopes` 배열은 **Backend에서만** 설정 가능
- ⚠️ Frontend는 읽기 전용
- ⚠️ Scope 변경은 **Admin API 통해서만** 가능

### 3. DEV 모드 대체
- ⚠️ DEV 모드 우회는 **보안 위험**
- ✅ Super Operator로 대체 시 **정확한 권한 체크** 가능
- ✅ 개발 환경에서도 **실제 권한 시뮬레이션** 가능

---

## P2-T4 완료 기준 체크

- ✅ Super Operator 개념 문서화 (본 문서)
- ✅ 확장 포인트 코드 주석 표시 (AuthContext, AdminAuthGuard, BranchAdminAuthGuard)
- ✅ 실제 기능 구현 없음 (확장 지점만 준비)

---

## 향후 작업 (P2-T4 범위 외)

1. **Backend 구현**
   - User 엔티티에 Super Operator 필드 추가
   - Role Assignment에 operator scopes 추가
   - API 응답에 operator 메타데이터 포함

2. **Frontend 구현**
   - User 인터페이스 확장
   - AuthGuard에 Super Operator 로직 추가
   - DEV 모드 우회 제거

3. **보안 강화**
   - Super Operator 활동 감사 로그
   - Scope 변경 승인 프로세스
   - 권한 남용 모니터링

---

## 결론

**Super Operator 개념은 향후 도입 가능한 구조를 갖추고 있음**

- **확장 지점**: AuthContext, AdminAuthGuard, BranchAdminAuthGuard
- **권장 구현**: User 인터페이스 확장 (옵션 1)
- **현재 상태**: 확장 지점만 표시 (실제 구현 없음)
- **향후 작업**: 운영 요구사항 발생 시 본 문서 참조

---

*문서 작성: 2026-02-05*
*P2-T4 완료*
