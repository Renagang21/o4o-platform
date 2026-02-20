# ROLE_GUARD_TEST_BASELINE_V1

> **O4O Platform — Role/Guard 테스트 기준 및 권한 Freeze**
>
> WO-O4O-ROLE-GUARD-TEST-BASELINE-V1
>
> Status: **Active Baseline**
> Version: 1.0
> Created: 2026-02-17

---

## 0. 이 문서의 지위

이 문서는 O4O 플랫폼 전 서비스의 **Role/Guard 테스트 기준**을 정의하고,
권한 구조를 **Freeze** 상태로 고정한다.

- 이 문서 승인 이후, 새로운 보호 라우트 추가 시 반드시 이 기준을 따른다.
- 코드 수정이 아닌 **테스트 기준 정의만** 포함한다.

### 관련 문서

| 문서 | 경로 | 관계 |
|------|------|------|
| 권한 정책 | `docs/platform-core/ADMIN_OPERATOR_ROLE_POLICY_V1.md` | 상위 정책 |
| KPA Role Matrix | `docs/_platform/KPA-ROLE-MATRIX-V1.md` | KPA 구체 매트릭스 |
| Security Core | `packages/security-core/` | 런타임 Guard 구현 |

---

## 1. 서비스별 보호 영역 목록

### 1.1 Neture

| 보호 영역 | 경로 | Guard | 허용 역할 |
|----------|------|-------|----------|
| Admin Vault | `/admin-vault/*` | RoleGuard | `['admin']` |
| Admin Dashboard | `/workspace/admin/*` | RoleGuard | `['admin']` |
| Operator Dashboard | `/workspace/operator/*` | RoleGuard | `['admin', 'operator']` |
| Supplier Dashboard | `/workspace/supplier/*` | SupplierDashboardLayout | `['supplier']` (암시적) |
| Partner Dashboard | `/workspace/partner/*` | SupplierOpsLayout | `['partner']` (암시적) |

**공개 영역:** `/`, `/login`, `/register`, `/o4o/*`, `/channel/*`, `/forum/*`, `/test-guide/*`, `/workspace/hub`, `/workspace/content/*`

---

### 1.2 GlycoPharm

| 보호 영역 | 경로 | Guard | 허용 역할 |
|----------|------|-------|----------|
| Operator Dashboard | `/operator/*` | RoleGuard | `['operator']` |
| Partner Dashboard | `/partner/*` | RoleGuard | `['partner']` |
| Store Management | `/store/*` | RoleGuard | `['pharmacy']` |
| Service User Area | `/service/*` | ServiceUserProtectedRoute | Service User 인증 |
| My Page | `/mypage` | RoleGuard | 인증 사용자 전체 |

**공개 영역:** `/`, `/login`, `/register`, `/forum/*`, `/forum-ext/*`, `/test-guide/*`, `/store/:pharmacyId/*` (소비자 스토어)

---

### 1.3 K-Cosmetics

| 보호 영역 | 경로 | Guard | 허용 역할 |
|----------|------|-------|----------|
| Operator Dashboard | `/operator/*` | RoleGuard | `['operator']` |
| Store Dashboard | `/store/*` | RoleGuard | `['operator']` |
| Partner Dashboard | `/partner/*` | RoleGuard | `['partner']` |
| My Page | `/mypage` | RoleGuard | 인증 사용자 전체 |

**비활성 영역 (RoleNotAvailable):** `/supplier/*`, `/admin/*`, `/seller/*`

**공개 영역:** `/`, `/login`, `/register`, `/forum/*`, `/test-guide/*`, `/platform/stores/*`, `/b2b/*`

---

### 1.4 GlucoseView

| 보호 영역 | 경로 | Guard | 허용 역할 |
|----------|------|-------|----------|
| Admin Dashboard | `/admin` | RoleGuard | `['admin']` |
| Operator Dashboard | `/operator/glucoseview/*` | RoleGuard | `['admin', 'operator']` |
| Partner Dashboard | `/partner/*` | RoleGuard | `['partner']` |
| Store Dashboard | `/store/*` | ProtectedRoute | 인증 사용자 전체 |
| Patient Dashboard | `/dashboard` | ProtectedRoute | 인증 사용자 전체 |
| Patients | `/patients` | ProtectedRoute | 인증 사용자 전체 |
| Pending | `/pending` | PendingRoute | 승인 대기/거부 사용자 |

**공개 영역:** `/`, `/register`, `/apply/*`, `/test-guide/*`, `/about`

---

### 1.5 KPA Society

#### KPA-a (커뮤니티 서비스)

| 보호 영역 | 경로 | Guard | 허용 역할 |
|----------|------|-------|----------|
| Platform Hub | `/hub` | RoleGuard | `['kpa:admin', 'kpa:operator']` |
| Operator Routes | `/operator/*` | RoleGuard | `['kpa:admin', 'kpa:operator']` |
| Operator Management | `/operator/operators` | RoleGuard (중첩) | `['kpa:admin']` only |
| Admin Dashboard | `/demo/admin/*` | AdminAuthGuard | `['kpa:admin', 'kpa:branch_admin', 'kpa:branch_operator', 'kpa:district_admin']` |
| Intranet | `/demo/intranet/*` | IntranetAuthGuard | `['kpa:admin', 'kpa:operator', 'kpa:district_admin', 'kpa:branch_admin', 'kpa:branch_operator']` |

**공개 영역:** `/`, `/dashboard`, `/forum/*`, `/pharmacy/*`, `/work/*`, `/courses/*`, `/lms/*`, `/signage/*`, `/organization/*`, `/mypage/*`

#### KPA-b (분회 서비스)

| 보호 영역 | 경로 | Guard | 허용 역할 | 조직 스코프 |
|----------|------|-------|----------|-----------|
| Branch Admin | `/branch-services/:branchId/admin/*` | BranchAdminAuthGuard | `['kpa:admin', 'kpa:district_admin', 'kpa:branch_admin', 'kpa-c:branch_admin']` | **branchId 검증** |
| Branch Operator | `/branch-services/:branchId/operator/*` | BranchOperatorAuthGuard | `['kpa-c:operator', 'kpa-c:branch_admin', 'kpa:admin', 'kpa:district_admin', 'kpa:branch_admin', 'kpa:branch_operator']` | **branchId 검증** |
| Demo Branch Admin | `/demo/branch/:branchId/admin/*` | BranchAdminAuthGuard | (동일) | **branchId 검증** |

**공개 영역:** `/branch-services/:branchId` (분회 메인), `/branch-services/:branchId/forum/*`

---

## 2. 접근 매트릭스

### 2.1 Neture 접근 매트릭스

| 역할 | `/workspace/admin` | `/workspace/operator` | `/workspace/supplier` | `/workspace/partner` | `/admin-vault` |
|------|-------------------|----------------------|----------------------|---------------------|---------------|
| `admin` | **허용** | **허용** | 차단 | 차단 | **허용** |
| `operator` | 차단 | **허용** | 차단 | 차단 | 차단 |
| `supplier` | 차단 | 차단 | **허용** | 차단 | 차단 |
| `partner` | 차단 | 차단 | 차단 | **허용** | 차단 |
| `user` | 차단 | 차단 | 차단 | 차단 | 차단 |
| 미인증 | 리다이렉트 | 리다이렉트 | 리다이렉트 | 리다이렉트 | 리다이렉트 |

### 2.2 GlycoPharm 접근 매트릭스

| 역할 | `/operator` | `/store` | `/partner` | `/mypage` |
|------|-----------|---------|-----------|----------|
| `operator` | **허용** | 차단 | 차단 | **허용** |
| `pharmacy` | 차단 | **허용** | 차단 | **허용** |
| `partner` | 차단 | 차단 | **허용** | **허용** |
| `supplier` | 차단 | 차단 | 차단 | **허용** |
| `consumer` | 차단 | 차단 | 차단 | **허용** |
| 미인증 | 리다이렉트 | 리다이렉트 | 리다이렉트 | 리다이렉트 |

### 2.3 K-Cosmetics 접근 매트릭스

| 역할 | `/operator` | `/store` | `/partner` | `/mypage` |
|------|-----------|---------|-----------|----------|
| `operator` | **허용** | **허용** | 차단 | **허용** |
| `partner` | 차단 | 차단 | **허용** | **허용** |
| `admin` | 차단 | 차단 | 차단 | **허용** |
| `supplier` | 차단 | 차단 | 차단 | **허용** |
| `seller` | 차단 | 차단 | 차단 | **허용** |
| 미인증 | 리다이렉트 | 리다이렉트 | 리다이렉트 | 리다이렉트 |

### 2.4 GlucoseView 접근 매트릭스

| 역할 | `/admin` | `/operator/glucoseview` | `/partner` | `/store` | `/dashboard` |
|------|---------|------------------------|-----------|---------|-------------|
| `admin` | **허용** | **허용** | 차단 | **허용** | **허용** |
| `pharmacist` | 차단 | 차단 | 차단 | **허용** | **허용** |
| `partner` | 차단 | 차단 | **허용** | **허용** | **허용** |
| 미인증 | 리다이렉트 | 리다이렉트 | 리다이렉트 | 리다이렉트 | 리다이렉트 |

### 2.5 KPA Society 접근 매트릭스

#### KPA-a (플랫폼 레벨)

| 역할 | `/hub` | `/operator` | `/operator/operators` | `/demo/admin` | `/demo/intranet` |
|------|--------|-----------|----------------------|--------------|-----------------|
| `kpa:admin` | **허용** | **허용** | **허용** | **허용** | **허용** |
| `kpa:operator` | **허용** | **허용** | 차단 | 차단 | **허용** |
| `kpa:district_admin` | 차단 | 차단 | 차단 | **허용** | **허용** |
| `kpa:branch_admin` | 차단 | 차단 | 차단 | **허용** | **허용** |
| `kpa:branch_operator` | 차단 | 차단 | 차단 | **허용** | **허용** |
| `pharmacist` | 차단 | 차단 | 차단 | 차단 | 차단 |
| 미인증 | 리다이렉트 | 리다이렉트 | 리다이렉트 | 리다이렉트 | 리다이렉트 |

#### KPA-b (분회 레벨)

| 역할 | `.../admin/*` (자기 분회) | `.../admin/*` (타 분회) | `.../operator/*` (자기 분회) | `.../operator/*` (타 분회) |
|------|------------------------|----------------------|---------------------------|-------------------------|
| `kpa:admin` | **허용** (우회) | **허용** (우회) | **허용** (우회) | **허용** (우회) |
| `kpa:district_admin` | **허용** (우회) | **허용** (우회) | **허용** (우회) | **허용** (우회) |
| `kpa:branch_admin` | **허용** (소유권) | **차단** (불일치) | **허용** (소유권) | **차단** (불일치) |
| `kpa:branch_operator` | 차단 | 차단 | **허용** (소유권) | **차단** (불일치) |
| `pharmacist` | 차단 | 차단 | 차단 | 차단 |

---

## 3. 필수 테스트 시나리오

### 3.1 인증 테스트 (Authentication)

모든 서비스 공통:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| A-1 | 미로그인 사용자 → 보호 라우트 접근 | 로그인 페이지 리다이렉트 |
| A-2 | 미로그인 사용자 → 공개 라우트 접근 | 정상 접근 |
| A-3 | JWT 만료 후 보호 라우트 접근 | 세션 만료 처리 + 로그인 리다이렉트 |
| A-4 | 로그인 후 원래 요청 경로로 복귀 | `state.from`으로 리다이렉트 |

### 3.2 역할 테스트 (Authorization)

각 서비스에 대해:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| R-1 | Admin → Admin 영역 접근 | **허용** |
| R-2 | Operator → Admin 영역 접근 | **차단** (홈 리다이렉트) |
| R-3 | Operator → Operator 영역 접근 | **허용** |
| R-4 | 일반 사용자 → Admin 영역 접근 | **차단** |
| R-5 | 일반 사용자 → Operator 영역 접근 | **차단** |
| R-6 | 다중 역할 사용자 → 활성 역할 기준 접근 | `roles[0]` 기준 |
| R-7 | `switchRole()` 후 역할 변경 반영 | 배열 재정렬 확인 |

### 3.3 조직 스코프 테스트 (Organization Scope)

KPA Society 전용:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| S-1 | Branch Admin → 자기 분회 `/admin/*` | **허용** (소유권 확인) |
| S-2 | Branch Admin → 타 분회 `/admin/*` | **차단** (branchId 불일치) |
| S-3 | Branch Operator → 자기 분회 `/operator/*` | **허용** (소유권 확인) |
| S-4 | Branch Operator → 타 분회 `/operator/*` | **차단** (branchId 불일치) |
| S-5 | District Admin → 임의 분회 접근 | **허용** (우회 권한) |
| S-6 | KPA Admin → 임의 분회 접근 | **허용** (우회 권한) |
| S-7 | Pharmacist → 분회 Admin/Operator 접근 | **차단** (역할 부족) |
| S-8 | Branch Admin → 분회 Operator 영역 접근 | **허용** (상위 역할 포함) |
| S-9 | Branch Operator → 분회 Admin 영역 접근 | **차단** (권한 부족) |

### 3.4 서비스 격리 테스트 (Service Isolation)

Backend (security-core) 레벨:

| # | 시나리오 | 기대 결과 |
|---|---------|----------|
| I-1 | `kpa:admin` → Neture API 호출 | **차단** (서비스 격리) |
| I-2 | `neture:admin` → KPA API 호출 | **차단** (서비스 격리) |
| I-3 | `platform:admin` → KPA API 호출 | **차단** (platformBypass: false) |
| I-4 | `platform:admin` → Neture API 호출 | **허용** (platformBypass: true) |
| I-5 | 프리픽스 없는 `admin` → 모든 서비스 | **차단** + 경고 로그 |
| I-6 | `glycopharm:operator` → K-Cosmetics API | **차단** (서비스 격리) |

---

## 4. Guard 적용 체크리스트

### 4.1 신규 라우트 추가 시 필수 확인

| # | 체크 항목 | 기준 |
|---|----------|------|
| G-1 | `/admin` 포함 경로에 RoleGuard 적용 여부 | **필수** |
| G-2 | `/operator` 포함 경로에 RoleGuard 적용 여부 | **필수** |
| G-3 | `/branch-services/:branchId/admin` 경로에 BranchAdminAuthGuard 적용 여부 | **필수** |
| G-4 | `/branch-services/:branchId/operator` 경로에 BranchOperatorAuthGuard 적용 여부 | **필수** |
| G-5 | `allowedRoles` 파라미터에 올바른 역할 지정 여부 | **필수** |
| G-6 | 인라인 `user.role === '...'` 비교 대신 `user.roles.some()` 사용 여부 | **필수** |
| G-7 | 접근 매트릭스 (섹션 2) 업데이트 여부 | **필수** |

### 4.2 인라인 역할 비교 금지 패턴

```typescript
// ❌ 금지
if (user.role === 'admin') { ... }
if (user.currentRole === 'operator') { ... }

// ✅ 허용
if (user.roles.includes('admin')) { ... }
if (user.roles.some(r => allowedRoles.includes(r))) { ... }
if (user.roles[0] === 'admin') { ... }  // 활성 역할 표시용만
```

### 4.3 Guard 선택 기준

| 상황 | 사용할 Guard |
|------|-------------|
| 단순 역할 체크 (Admin/Operator 분리) | `RoleGuard` + `allowedRoles` |
| 조직 스코프 필요 (branchId 검증) | `BranchAdminAuthGuard` / `BranchOperatorAuthGuard` |
| KPA 인트라넷 접근 | `IntranetAuthGuard` |
| 인증만 필요 (역할 무관) | `ProtectedRoute` (RoleGuard without allowedRoles) |
| 특정 승인 상태 필요 | `PendingRoute` (GlucoseView) |

---

## 5. Guard 누락 탐지 기준

### 5.1 정적 분석 규칙

| 규칙 ID | 검사 대상 | 조건 | 심각도 |
|--------|----------|------|--------|
| GUARD-001 | `/admin` 경로 | RoleGuard 미적용 | **Critical** |
| GUARD-002 | `/operator` 경로 | RoleGuard 미적용 | **Critical** |
| GUARD-003 | `/branch-services/:id/admin` | BranchAdminAuthGuard 미적용 | **Critical** |
| GUARD-004 | `/branch-services/:id/operator` | BranchOperatorAuthGuard 미적용 | **Critical** |
| GUARD-005 | `user.role ===` 패턴 | 인라인 비교 사용 | **High** |
| GUARD-006 | `user.currentRole` 참조 | deprecated 필드 사용 | **High** |
| GUARD-007 | `allowedRoles` 미지정 보호 라우트 | 역할 체크 누락 | **Medium** |

### 5.2 CI 적용 가이드 (향후)

```bash
# GUARD-005: user.role 직접 비교 탐지
grep -rn "user\.role\s*===" services/web-*/src/ --include="*.tsx" --include="*.ts"

# GUARD-006: currentRole 참조 탐지
grep -rn "currentRole" services/web-*/src/ --include="*.tsx" --include="*.ts"

# GUARD-001/002: admin/operator 경로에 Guard 없는 라우트 탐지
# (정규식으로 Route path에 admin/operator 포함하면서 Guard 미적용 검사)
```

### 5.3 수동 검증 주기

| 주기 | 검증 항목 |
|------|----------|
| 매 PR | 변경된 라우트 파일에 Guard 적용 확인 |
| 월 1회 | 전 서비스 접근 매트릭스 vs 실제 Guard 정합성 확인 |
| 분기 1회 | security-core Scope Config vs 정책 문서 정합성 확인 |

---

## 6. 권한 Freeze 선언

### 6.1 Freeze 범위

이 문서 승인 이후, 다음 항목은 **Freeze** 상태로 고정된다:

| 고정 항목 | 상태 |
|----------|------|
| 섹션 1의 보호 영역 목록 | **Frozen** |
| 섹션 2의 접근 매트릭스 | **Frozen** |
| Guard 선택 기준 (섹션 4.3) | **Frozen** |
| 인라인 역할 비교 금지 (섹션 4.2) | **Frozen** |

### 6.2 변경 절차

Freeze된 항목을 변경하려면:

1. **Work Order 작성** — 변경 사유, 영향 범위 명시
2. **접근 매트릭스 업데이트** — 변경 전/후 비교
3. **테스트 시나리오 추가** — 섹션 3에 시나리오 추가
4. **이 문서 갱신** — 변경 이력 기록

### 6.3 허용되는 변경 (WO 불필요)

| 변경 | 조건 |
|------|------|
| 기존 Guard에 역할 추가 | 접근 매트릭스 상 "허용"인 경우 |
| 테스트 시나리오 추가 | 기존 기준 강화 방향만 |
| CI 규칙 추가 | 기존 정적 분석 규칙 구현 |

### 6.4 금지되는 변경 (WO 필수)

| 변경 | 이유 |
|------|------|
| 보호 영역을 공개로 변경 | 보안 수준 하락 |
| Guard 제거 | 보안 수준 하락 |
| 새로운 Admin/Operator 경로 추가 | 접근 매트릭스 갱신 필요 |
| 조직 스코프 우회 역할 추가 | 권한 확대 |
| `platformBypass` 정책 변경 | 서비스 격리 영향 |

---

## 7. 현행 보안 상태 요약

| 서비스 | 보호 영역 수 | Guard 적용 | 조직 스코프 | 상태 |
|--------|------------|-----------|-----------|------|
| **Neture** | 5 | RoleGuard + Layout Guard | 없음 | **Baseline** |
| **GlycoPharm** | 4 | RoleGuard + ServiceUserRoute | 없음 | **Baseline** |
| **K-Cosmetics** | 4 | RoleGuard | 없음 | **Baseline** |
| **GlucoseView** | 4 | RoleGuard + ProtectedRoute + PendingRoute | 없음 | **Baseline** |
| **KPA-a** | 5 | RoleGuard + AdminAuthGuard + IntranetAuthGuard | 없음 | **Baseline** |
| **KPA-b** | 3 | BranchAdminAuthGuard + BranchOperatorAuthGuard | **branchId 검증** | **Baseline** |

**총 보호 영역: 25개**
**조직 스코프 적용: KPA-b (3개 영역)**

---

*Updated: 2026-02-17*
*WO: WO-O4O-ROLE-GUARD-TEST-BASELINE-V1*
