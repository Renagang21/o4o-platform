# IR-O4O-ROLE-MANAGEMENT-POLICY-AUDIT-V1

> Operator 제한 Role 관리 정책의 현재 구현 상태 전수 조사

**작성일:** 2026-03-18
**정책 기준:**

```
Admin → 모든 Role 관리 가능
Operator → 자기 서비스 내에서 member / operator만 관리 가능
```

---

## 1. 조사 결과 요약

### 판정: 정책 위반 — Backend + Frontend 모두 미적용

| 계층 | admin role 제한 | 서비스 경계 체크 | 자기 승급 방지 | 판정 |
|------|:---:|:---:|:---:|:---:|
| **Backend** (MembershipConsoleController) | ❌ 없음 | ✅ 있음 | ❌ 없음 | **위반** |
| **Frontend** (4개 서비스) | ❌ 없음 | N/A (하드코딩) | ❌ 없음 | **위반** |
| **Frontend** (KPA Society) | ✅ 안전 | N/A | N/A | 부분 안전 |

---

## 2. Backend 상세

### 2.1 파일: `MembershipConsoleController.ts`

#### Role 추가: `POST /operator/members/:userId/roles`

```typescript
// Lines 614-625
if (!scope.isPlatformAdmin) {
  const allowedPrefixes = scope.serviceKeys.map((k: string) => `${k}:`);
  if (!allowedPrefixes.some((prefix: string) => role.startsWith(prefix))) {
    res.status(403).json({ success: false, error: 'Cannot assign roles outside your service scope' });
    return;
  }
}
```

**현재 체크:** 서비스 prefix만 검증 (`neture:` → `neture:admin` 통과)
**누락:** role suffix 제한 없음 → **Operator가 admin role 추가 가능**

#### Role 삭제: `DELETE /operator/members/:userId/roles/:role`

동일 패턴 — prefix 체크만, suffix 무제한
→ **Operator가 admin role 삭제 가능**

### 2.2 파일: `role-assignment.service.ts`

순수 CRUD 레이어. 어떤 role 문자열이든 수용. 인가 로직 없음 (설계 의도대로).

### 2.3 미들웨어 체인: `membership.routes.ts`

```
authenticate → requireRole([14개 role]) → injectServiceScope
```

- `requireRole`: 14개 role 중 하나 보유 확인 (게이트 체크만)
- `injectServiceScope`: JWT roles → `{ isPlatformAdmin, serviceKeys }` 추출
- **Admin vs Operator 구분 없음** — 둘 다 동일 권한으로 통과

### 2.4 `isPlatformAdmin()` 판단

```typescript
// role.utils.ts:135-137
export function isPlatformAdmin(userRoles: string[]): boolean {
  return hasAnyServiceRole(userRoles, ['platform:admin', 'platform:super_admin']);
}
```

- `platform:admin`, `platform:super_admin`만 인정
- 레거시 `admin`, `super_admin` → isPlatformAdmin: false (안전하게 실패하지만 dead state)

---

## 3. Frontend 상세

### 3.1 서비스별 ASSIGNABLE_ROLES

| 서비스 | ASSIGNABLE_ROLES | `:admin` 포함 | 위반 |
|--------|-----------------|:---:|:---:|
| **glycopharm** | `glycopharm:admin`, `glycopharm:operator`, `glycopharm:member` | ✅ | **❌ 위반** |
| **glucoseview** | `glucoseview:admin`, `glucoseview:operator`, `glucoseview:member` | ✅ | **❌ 위반** |
| **neture** | `neture:admin`, `neture:operator`, `neture:member` | ✅ | **❌ 위반** |
| **k-cosmetics** | `k-cosmetics:admin`, `k-cosmetics:operator`, `k-cosmetics:member` | ✅ | **❌ 위반** |
| **kpa-society** | `kpa:operator` (OperatorManagementPage) | ❌ | ✅ 안전 |

### 3.2 RoleModal 필터링

모든 서비스 동일 패턴:
```typescript
const availableRoles = ASSIGNABLE_ROLES.filter(r => !existingRoles.includes(r.value));
```

- 이미 할당된 role 제외 필터링만 존재
- **현재 사용자의 role(admin/operator) 확인 없음**
- Operator에게 admin role이 그대로 노출

### 3.3 Role 삭제 버튼

모든 서비스: active role에 대해 무조건 삭제 버튼 표시
- **admin role 삭제 제한 없음**
- disabled 처리 없음

### 3.4 현재 사용자 role 체크

**5개 서비스 모두: 없음**
- auth 컨텍스트에서 현재 사용자 role을 가져오지 않음
- admin vs operator 조건 분기 없음

---

## 4. KPA Society 특이사항

KPA는 완전히 다른 아키텍처:

| 항목 | 값 |
|------|------|
| MemberManagementPage | 멤버 status 변경만 (role 관리 없음) |
| OperatorManagementPage | `kpa:operator`만 노출 (안전) |
| API 경로 | `/admin/users` (admin endpoint 직접 호출) |
| MembershipConsole 사용 | ❌ 미사용 |

**판정:** `:admin` 노출 없어 부분 안전하나, admin endpoint 직접 호출은 별도 검토 필요

---

## 5. 실제 공격 시나리오

### Case 1: Operator → Admin 자기 승급

```
1. neture:operator 로그인
2. /auth/status로 자기 userId 확인
3. POST /api/v1/operator/members/{자기ID}/roles  { "role": "neture:admin" }
4. → 200 OK (prefix 체크 통과)
5. neture:admin 획득 완료
```

**결과: 성공 (현재 차단 없음)**

### Case 2: Operator → 다른 사용자의 Admin 추가

```
1. glycopharm:operator 로그인
2. 회원 상세 페이지 → 역할 추가 모달
3. "GlycoPharm Admin" 선택 → 추가
4. → 200 OK
```

**결과: 성공 (UI에서도 차단 없음)**

### Case 3: Operator → Admin Role 제거

```
1. k-cosmetics:operator 로그인
2. 기존 admin 사용자 상세 페이지
3. "k-cosmetics:admin" 역할 삭제 클릭
4. → 200 OK
```

**결과: 성공 (Admin이 Admin 권한 빼앗김)**

---

## 6. 문제 분류

### P0 — 즉시 수정 (보안)

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| **S1** | Operator가 `:admin` role 추가 가능 | Backend Controller | 권한 승급 |
| **S2** | Operator가 `:admin` role 삭제 가능 | Backend Controller | Admin 무력화 |
| **S3** | 자기 자신에게 admin 부여 가능 | Backend Controller | 자기 승급 |

### P1 — Frontend 보조 수정

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| **F1** | ASSIGNABLE_ROLES에 `:admin` 포함 | 4개 서비스 UserDetailPage | UI 노출 |
| **F2** | RoleModal에 사용자 role 필터 없음 | 4개 서비스 RoleModal | 의도치 않은 조작 |
| **F3** | Admin role 삭제 버튼 무제한 | 4개 서비스 UserDetailPage | 오작동 |

### P2 — 개선

| # | 문제 | 위치 |
|---|------|------|
| **D1** | Role 이름 allowlist 부재 (임의 문자열 허용) | Backend Service |
| **D2** | 레거시 unprefixed role dead state | Backend 미들웨어 |

---

## 7. 수정 방향 (WO-O4O-ROLE-MANAGEMENT-POLICY-ENFORCEMENT-V1 입력)

### Backend (P0 — 우선)

**위치:** `MembershipConsoleController.ts` — `assignMemberRole` / `removeMemberRole`

```typescript
// 추가할 로직
const ADMIN_SUFFIXES = ['admin', 'super_admin'];

if (!scope.isPlatformAdmin) {
  // 1. 서비스 prefix 체크 (기존)
  // 2. admin suffix 체크 (신규)
  const roleSuffix = role.split(':')[1];
  if (ADMIN_SUFFIXES.includes(roleSuffix)) {
    // 서비스 admin인지 확인
    const isServiceAdmin = scope.serviceKeys.some(
      (k: string) => userRoles.includes(`${k}:admin`)
    );
    if (!isServiceAdmin) {
      res.status(403).json({
        success: false,
        error: 'Only admins can manage admin-level roles'
      });
      return;
    }
  }
}
```

### Frontend (P1 — 보조)

1. auth 컨텍스트에서 현재 사용자 roles 가져오기
2. Operator인 경우 `ASSIGNABLE_ROLES`에서 `:admin` 필터링
3. Operator인 경우 admin role 삭제 버튼 hidden/disabled

### 적용 순서

```
1. Backend MembershipConsoleController (1개 파일, 즉시 전체 적용)
2. Frontend GlycoPharm (기준)
3. Frontend GlucoseView
4. Frontend Neture
5. Frontend K-Cosmetics
6. KPA Society (별도 검토)
```

---

## 8. 결론

```
현재 상태: Operator = Admin (role 관리 권한 동일)
정책 위반: Backend + Frontend 모두 P0 위반
즉시 수정 필요: Backend Controller에 admin suffix 체크 추가
```

Backend 1개 파일 수정으로 전체 서비스 즉시 보호 가능.
Frontend는 UX 보호 목적으로 후속 적용.

---

*IR-O4O-ROLE-MANAGEMENT-POLICY-AUDIT-V1*
*2026-03-18*
