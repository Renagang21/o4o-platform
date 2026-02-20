# Admin/Operator Role Policy & Guard Baseline v1.0

> **Status: Active Policy + Frozen Baseline**
> **Version: 1.0 | Created: 2026-02-17**

---

## 1. 권한 계층 구조

```
Platform Layer       → platform:admin, platform:super_admin
  └── Service Layer  → {service}:admin, {service}:operator
        └── Org Layer → {service}:branch_admin, {service}:branch_operator
```

### 핵심 원칙

| 원칙 | 설명 |
|------|------|
| 상위 ≠ 하위 포함 | Platform Admin ≠ 자동 Service Admin |
| 서비스 격리 | 서비스 A 역할은 서비스 B 접근 불가 |
| Platform Bypass 선택적 | 각 서비스가 `platformBypass` 결정 |
| 조직 스코프 2단계 | Role 확인 + 소유권 검증 |

---

## 2. Admin vs Operator 철학

| 구분 | Admin | Operator |
|------|-------|----------|
| 핵심 | **구조를 만드는 역할** | **상태를 관리하는 역할** |
| 행위 | 구조 생성/삭제, 역할 부여, 정책 변경 | 콘텐츠 CRUD, 상태 변경, 운영 조회 |
| UX | 4-Block (구조 관리) | 5-Block (상태 운영) |
| 진입 빈도 | 낮음 | 높음 |

---

## 3. Platform Bypass 정책

| 서비스 | `platform:admin` 접근 | 이유 |
|--------|----------------------|------|
| KPA Society | **차단** | 약사회 자치 |
| Neture | 허용 | 플랫폼 운영 |
| GlycoPharm | 허용 | 플랫폼 운영 |
| K-Cosmetics | 허용 | 플랫폼 운영 |
| GlucoseView | 미설정 | — |

---

## 4. 서비스 격리 매트릭스

|  | KPA | Neture | GlycoPharm | K-Cosmetics | GlucoseView | Platform |
|--|-----|--------|------------|-------------|-------------|----------|
| **kpa:*** | **허용** | 차단 | 차단 | 차단 | 차단 | 차단 |
| **neture:*** | 차단 | **허용** | 차단 | 차단 | 차단 | 차단 |
| **glycopharm:*** | 차단 | 차단 | **허용** | 차단 | 차단 | 차단 |
| **platform:*** | 차단 | 허용 | 허용 | 허용 | 미설정 | **허용** |

---

## 5. 조직 스코프 (KPA Society)

| 역할 | Stage 1 (Role) | Stage 2 (소유권) |
|------|----------------|-----------------|
| `kpa:admin` | Pass | 면제 (전체) |
| `kpa:district_admin` | Pass | 면제 (전체) |
| `kpa:branch_admin` | Pass | **필수** (branchId 일치) |
| `kpa:branch_operator` | Pass | **필수** (branchId 일치) |

---

## 6. Guard 패턴 표준

```typescript
// 구조 변경 (Admin 전용)
requireScope('{service}:admin')

// 운영 실행 (Operator 이상)
requireScope('{service}:operator')

// 조직 스코프 (Branch 검증)
requireScope('{service}:branch_admin') + validateBranchOwnership()

// Frontend
<RoleGuard allowedRoles={['kpa:admin', 'kpa:operator']}>{children}</RoleGuard>
```

### Guard 선택 기준

| 상황 | Guard |
|------|-------|
| Admin/Operator 분리 | `RoleGuard` + `allowedRoles` |
| 조직 스코프 | `BranchAdminAuthGuard` / `BranchOperatorAuthGuard` |
| 인증만 | `ProtectedRoute` |
| 특정 승인 상태 | `PendingRoute` |

### 금지 패턴

```typescript
// ❌ user.role === 'admin'
// ❌ user.currentRole
// ✅ user.roles.some(r => allowedRoles.includes(r))
```

---

## 7. 서비스별 보호 영역 요약

| 서비스 | 보호 영역 수 | 조직 스코프 |
|--------|------------|-----------|
| Neture | 5 | 없음 |
| GlycoPharm | 4 | 없음 |
| K-Cosmetics | 4 | 없음 |
| GlucoseView | 4 | 없음 |
| KPA-a | 5 | 없음 |
| KPA-b | 3 | branchId 검증 |

총 보호 영역: 25개

---

## 8. 전체 역할 인벤토리

### Backend (security-core)

| 서비스 | 역할 |
|--------|------|
| platform | `platform:admin`, `platform:super_admin` |
| kpa | `kpa:admin`, `kpa:operator`, `kpa:district_admin`, `kpa:branch_admin`, `kpa:branch_operator` |
| neture | `neture:admin`, `neture:operator`, `neture:supplier`, `neture:partner` |
| glycopharm | `glycopharm:admin`, `glycopharm:operator` |

### Frontend 역할 매핑

| 서비스 | 매핑 |
|--------|------|
| KPA | string 동적 (`kpa:admin` 등) |
| Neture | admin/super_admin → `admin` |
| GlycoPharm | admin/super_admin → `operator` |
| K-Cosmetics | admin/super_admin → `admin` |
| GlucoseView | admin/super_admin → `admin` |

---

## 9. Freeze 선언

| 고정 항목 | 상태 |
|----------|------|
| 보호 영역 목록 | **Frozen** |
| 접근 매트릭스 | **Frozen** |
| Guard 선택 기준 | **Frozen** |
| 인라인 역할 비교 금지 | **Frozen** |

변경 시: Work Order 필수 → 접근 매트릭스 업데이트 → 테스트 시나리오 추가

---

## 10. 필수 테스트 시나리오 (요약)

| 카테고리 | 핵심 시나리오 |
|----------|-------------|
| 인증 (A) | 미로그인→리다이렉트, JWT 만료 처리, 복귀 경로 |
| 역할 (R) | Admin/Operator 경계, 다중 역할, switchRole() |
| 조직 (S) | 자기 분회 허용, 타 분회 차단, 상위 우회 허용 |
| 격리 (I) | 서비스 간 차단, platformBypass 정책, 레거시 역할 거부 |

---

*Merged from: ADMIN_OPERATOR_ROLE_POLICY_V1.md + ROLE_GUARD_TEST_BASELINE_V1.md*
