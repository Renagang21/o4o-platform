# PLAN-ROLE-GUARD-REFACTOR-V1

> **Work Order**: WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 2 → Phase 4 실행 기반
> **기준일**: 2026-02-27
> **상태**: PLAN (코드 변경 없음)
> **의존**: ROLE-PHILOSOPHY-V1.md (§5 Role Guard 표준화 원칙)

---

## 0. 요약

| 항목 | 값 |
|------|-----|
| 변경 대상 파일 수 | **26개** |
| 예상 커밋 수 | **5개** (서비스 단위 분리) |
| 예상 리스크 | **중간** (Guard 로직 변경, 권한 체계 영향) |
| 롤백 방법 | git revert (커밋 단위) |

---

## 1. 문제 유형 분류

### Type A: `legacyRoles` 로컬 배열 체크 (제거 대상)

```typescript
// 현재 패턴 — 도메인 컨트롤러에 반복
const legacyRoles = ['admin', 'operator', 'administrator', 'super_admin'];
if (!user.roles?.some(r => legacyRoles.includes(r))) {
  return res.status(403).json({ error: 'Operator or administrator role required' });
}

// 교체 후 패턴 — requireAdmin 미들웨어 사용
// (미들웨어가 RA 직접 쿼리로 ['admin','super_admin','operator'] 체크)
// → 라우트 레벨에서 requireAdmin 적용
```

### Type B: `administrator` 별칭 체크 (제거 대상)

```typescript
// 현재 패턴
if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('administrator')) {
  return res.status(403).json({ error: 'Admin access required' });
}

// 교체 후 패턴 — requireAdmin 사용
// administrator는 role_assignments에 없으므로 체크 불필요
```

### Type C: `superadmin` 오타 체크 (수정 대상)

```typescript
// 현재 패턴
return ['admin', 'superadmin', 'super_admin', 'manager'].includes(roleName);

// 교체 후 패턴
return ['admin', 'super_admin', 'manager'].includes(roleName);
// 'superadmin' 제거 (underscore 없는 오타, DB에 없음)
```

### Type D: `user.roles?.some(r => [...].includes(r))` 인라인 체크 (표준화 대상)

```typescript
// 현재 패턴 (일부)
return user && user.roles?.some((r: string) => ['admin', 'operator'].includes(r));

// 유지 또는 교체: 컨텍스트에 따라 결정
// 라우트 미들웨어로 분리 가능한 경우 → requireAdmin / requireRole
// 비즈니스 로직 내부 체크(if문)는 현행 유지 허용
```

---

## 2. 서비스별 변경 대상 파일 목록

### Service 1: GlycoPharm (커밋 1) — 위험도 HIGH

**영향도**: GlycoPharm 서비스 전체 관리자 접근 차단/허용

| 파일 | Type | 위치 | 변경 내용 |
|------|------|------|---------|
| `routes/glycopharm/controllers/admin.controller.ts` | A | lines 56, 124, 233, 470, 574, 639, 693 | legacyRoles → requireAdmin |
| `routes/glycopharm/controllers/billing-preview.controller.ts` | A | lines 29, 73 | legacyRoles → requireAdmin |
| `routes/glycopharm/controllers/invoice.controller.ts` | A | lines 32, 54 | legacyRoles → requireAdmin |
| `routes/glycopharm/controllers/invoice-dispatch.controller.ts` | A | lines 31, 53 | legacyRoles → requireAdmin |
| `routes/glycopharm/controllers/operator.controller.ts` | A | lines 104, 152, 306, 341 | legacyRoles → requireAdmin |
| `routes/glycopharm/controllers/report.controller.ts` | A | lines 31, 75, 142 | legacyRoles → requireAdmin |

**현재 패턴** (공통):
```typescript
const legacyRoles = ['admin', 'operator', 'administrator', 'super_admin'];
if (!user.roles?.some(r => legacyRoles.includes(r))) {
  return res.status(403).json({
    success: false,
    error: 'Operator or administrator role required',
    code: 'FORBIDDEN'
  });
}
```

**교체 패턴**: 라우트 파일에서 미들웨어 적용, 컨트롤러 내 체크 제거
```typescript
// glycopharm.routes.ts에 requireAdmin 추가
router.use('/admin', requireAdmin, adminController.someMethod);
// OR 개별 라우트에 적용
router.get('/reports', requireAdmin, reportController.getReports);
```

> ⚠️ GlycoPharm 라우트 구조 확인 필요: 현재 컨트롤러에서 체크하는지 vs 라우트에서 체크하는지

### Service 2: GlucoseView (커밋 2) — 위험도 HIGH

| 파일 | Type | 위치 | 변경 내용 |
|------|------|------|---------|
| `routes/glucoseview/glucoseview.routes.ts` | A | lines 55, 120 | legacyRoles → requireAdmin |
| `routes/glucoseview/controllers/application.controller.ts` | A | lines 55, 406, 504, 728 | legacyRoles → requireAdmin |

**특이사항**: `glucoseview.routes.ts:120`에 추가 체크 존재
```typescript
// line 120 — legacyRoles 체크 + 별도 super_admin 체크
if (user?.roles?.includes('super_admin') || user?.role === 'super_admin') { ... }
// → requireAdmin으로 통합 (super_admin은 requireAdmin에 포함)
```

### Service 3: Cosmetics (커밋 3) — 위험도 MEDIUM

| 파일 | Type | 위치 | 변경 내용 |
|------|------|------|---------|
| `routes/cosmetics/cosmetics.routes.ts` | A | line 56 | legacyRoles → requireAdmin |

**주의**: cosmetics.routes.ts는 cosmetics-store 서비스와 분리됨.
`CosmeticsStoreMemberRole` 체크(owner/manager/staff)는 별도 비즈니스 로직이므로 변경 없음.

### Service 4: Admin Controllers (커밋 4) — 위험도 HIGH

`administrator` 별칭 체크를 `requireAdmin` 미들웨어로 대체.

| 파일 | Type | 위치 (Lines) | 인스턴스 수 |
|------|------|-------------|-----------|
| `controllers/admin/adminDashboardController.ts` | B | 36, 118, 195, 280, 350, 396, 458 | **7개** |
| `controllers/admin/adminStatsController.ts` | B | 13, 102, 149, 217 | **4개** |
| `controllers/admin/adminApprovalController.ts` | B | 16, 103, 162, 222, 290 | **5개** |
| `controllers/approvalController.ts` | B | 266 | 1개 |

**현재 패턴**:
```typescript
if (!req.user?.roles?.includes('admin') && !req.user?.roles?.includes('administrator')) {
  return res.status(401).json({ error: 'Admin access required' });
}
```

**교체 방향**: 각 컨트롤러 메서드에서 인라인 체크 제거 → 라우트에서 `requireAdmin` 미들웨어로 처리.
라우트 파일 확인 필요: `routes/admin/*.routes.ts`가 이미 `requireAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN])`을 적용 중이므로, 컨트롤러 내 중복 체크 제거만 하면 됨.

> ✅ `routes/admin/users.routes.ts`는 이미 `requireAnyRole` 미들웨어 적용 중
> → 컨트롤러의 인라인 체크는 **중복**이므로 제거 안전

### Service 5: 기타 파일 (커밋 5) — 위험도 LOW

| 파일 | Type | 위치 | 변경 내용 |
|------|------|------|---------|
| `modules/sites/sites.routes.ts` | C | line 36 | `'superadmin'` 오타 제거 |
| `routes/users.routes.ts:87` | D | line 87 | `['admin','moderator','manager'...]` 검토 |

**sites.routes.ts:36**:
```typescript
// 현재
return ['admin', 'superadmin', 'super_admin', 'manager'].includes(roleName);

// 변경 후
return ['admin', 'super_admin', 'manager'].includes(roleName);
```

---

## 3. 변경하지 않는 항목

| 파일/패턴 | 이유 |
|----------|------|
| `controllers/checkout/checkoutController.ts:274,389` | 비즈니스 로직 내부 체크 (주문 가격 수정 권한 등), 현행 유지 |
| `controllers/admin/adminOrderController.ts:22` | 헬퍼 함수, 현행 유지 |
| `controllers/cpt/TaxonomiesController.ts` | manager 역할 포함 복합 체크, 별도 검토 |
| `controllers/forum/ForumController.ts` | manager 역할 포함, forum 도메인 WO에서 처리 |
| `controllers/entity/SupplierEntityController.ts` | supplier 도메인 로직, 별도 WO |
| KPA 관련 파일들 | KPA 도메인 WO에서 처리 |
| Cosmetics store 내부 (CosmeticsStoreMemberRole) | Business Role SSOT, 변경 없음 |

---

## 4. 커밋 분리 전략

```
커밋 1: feat(glycopharm): replace legacyRoles check with requireAdmin middleware
  - 6개 파일, glycopharm 서비스 완결
  - 검증: GlycoPharm 관리자 기능 정상 동작

커밋 2: feat(glucoseview): replace legacyRoles check with requireAdmin middleware
  - 2개 파일, glucoseview 서비스 완결
  - 검증: GlucoseView 관리자 기능 정상 동작

커밋 3: feat(cosmetics): replace legacyRoles check with requireAdmin middleware
  - 1개 파일 (cosmetics.routes.ts)
  - 검증: K-Cosmetics 관리자 기능 정상 동작

커밋 4: refactor(admin-controllers): remove redundant administrator alias check
  - 4개 파일 (adminDashboardController, adminStatsController, adminApprovalController, approvalController)
  - 검증: 관리자 대시보드 API 정상 동작

커밋 5: fix(misc): remove superadmin typo, cleanup role checks
  - 2개 파일 (sites.routes.ts, 기타)
  - 검증: 사이트 관리 기능 정상 동작
```

---

## 5. 테스트 시나리오

### 시나리오 1: admin 역할 사용자
- GlycoPharm 관리자 API → 200 OK (변경 전과 동일)
- GlucoseView 관리자 API → 200 OK
- K-Cosmetics 관리자 API → 200 OK

### 시나리오 2: operator 역할 사용자
- GlycoPharm 관리자 API → 200 OK (requireAdmin에 operator 포함)
- GlucoseView 관리자 API → 200 OK
- 일반 사용자 API → 200 OK

### 시나리오 3: 일반 user 역할
- GlycoPharm 관리자 API → 403 FORBIDDEN
- GlucoseView 관리자 API → 403 FORBIDDEN

### 시나리오 4: administrator (DB에 없는 역할)
- 기존: 일부 컨트롤러에서 허용
- 변경 후: requireAdmin (RA 체크) → 403 FORBIDDEN (DB에 없으므로 정상)

---

## 6. 위험도 분석

| 위험 | 발생 가능성 | 대응 |
|------|------------|------|
| GlycoPharm 관리자 접근 불가 | 낮음 (role_assignments에 operator 있으면 정상) | 배포 전 operator 역할 보유 사용자 DB 확인 |
| `administrator` 역할 보유 사용자가 실제로 존재 | 낮음 (Backfill 대상 아님) | `SELECT COUNT(*) FROM role_assignments WHERE role='administrator'` 배포 전 확인 |
| 이중 체크 제거로 인한 보안 약화 | 없음 (requireAdmin이 RA 직접 쿼리로 더 강력) | 해당 없음 |

---

## 7. 롤백 전략

```bash
# 커밋 5개가 독립적이므로 개별 롤백 가능
git revert <커밋해시>  # 해당 서비스 롤백

# 전체 롤백 시
git revert HEAD~4..HEAD  # 5개 커밋 일괄 롤백
```

---

*Phase 2 산출물 — 코드 변경 없음*
*실행: Phase 4 WO-ROLE-PHILOSOPHY-PHASE4-GUARD-EXECUTION-V1*
