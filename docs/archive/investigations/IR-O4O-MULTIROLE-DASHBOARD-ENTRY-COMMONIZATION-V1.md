# IR-O4O-MULTIROLE-DASHBOARD-ENTRY-COMMONIZATION-V1

> **조사 목적**: 4개 서비스(KPA, GlycoPharm, K-Cosmetics, Neture)의 multi-role dashboard redirect / workspace entry 구조 현황을 파악하고, 공통화 가능 영역과 서비스 고유 영역을 분류한다.
>
> **상태**: COMPLETE
> **날짜**: 2026-05-15
> **조사 범위**: Read-only (코드 변경 없음)

---

## 1. 조사 범위

| 항목 | 내용 |
|------|------|
| 서비스 | KPA-Society, GlycoPharm, K-Cosmetics, Neture |
| 조사 파일 | `config/dashboard.ts`, `App.tsx` (PostLoginRedirect), `GlobalHeader.tsx`, `LoginPage.tsx` / `LoginModal.tsx` |
| 공통 유틸 | `@o4o/auth-utils`: `getPrimaryDashboardRoute`, `rolePriority`, `roleDashboardMap` |

---

## 2. 서비스별 현재 구조 비교표

### 2-A. PRIORITY + MAP 패턴

| 서비스 | 파일 | 구조 | 상태 |
|--------|------|------|------|
| KPA | `src/config/dashboard.ts` | `KPA_ROLE_PRIORITY[]` + `KPA_DASHBOARD_MAP{}` + `getKpaPostLoginRoute()` | ✅ canonical |
| GlycoPharm | `src/config/dashboard.ts` | `GLYCOPHARM_ROLE_PRIORITY[]` + `GLYCOPHARM_DASHBOARD_MAP{}` + `getGlycopharmDashboardRoute()` | ✅ canonical |
| K-Cosmetics | `src/config/dashboard.ts` | `KCOSMETICS_ROLE_PRIORITY[]` + `KCOSMETICS_DASHBOARD_MAP{}` + `getKCosmeticsDashboardRoute()` | ✅ canonical |
| Neture | `src/config/dashboard.ts` | `NETURE_ROLE_PRIORITY[]` + `NETURE_DASHBOARD_MAP{}` + `getNeturePostLoginRoute()` + `getNetureRoleLabel()` | ✅ best-in-class |

**결론**: 모든 서비스가 PRIORITY+MAP 패턴을 사용한다. 공통 유틸 `getPrimaryDashboardRoute()`는 `@o4o/auth-utils`에서 공유됨.

---

### 2-B. Post-login redirect 진입점

| 서비스 | 진입점 | 패턴 |
|--------|--------|------|
| KPA | `App.tsx` `<PostLoginRedirect />` + `LoginModal` 1차 | ✅ App.tsx 중앙화 |
| GlycoPharm | `LoginPage.tsx` 내 navigate() | ❌ 페이지 로컬 처리 |
| K-Cosmetics | `LoginPage.tsx` 내 navigate() | ❌ 페이지 로컬 처리 |
| Neture | `LoginModal.tsx` 내 처리 | ✅ Modal 중앙화 (KPA 유사) |

**Gap**: GlycoPharm, K-Cosmetics는 LoginPage 내부에서 redirect를 처리한다. App.tsx 수준 PostLoginRedirect가 없으므로 로그인 후 URL 직접 접근 시 redirect 로직이 발동하지 않을 수 있다.

---

### 2-C. "내 매장 / 워크스페이스" 헤더 드롭다운 노출

| 서비스 | 드롭다운 항목 | role 체크 방식 | context fallback |
|--------|------------|--------------|-----------------|
| KPA | ✅ "내 매장" (`/store`) | `user.roles.includes('kpa:store_owner')` | ✅ `user.isStoreOwner` |
| GlycoPharm | ❌ 없음 | — | — |
| K-Cosmetics | ❌ 없음 | — | — |
| Neture | ❌ 없음 (대시보드 링크는 있음) | `isSupplier / isPartner` (roles only) | ❌ |

**Gap**: GlycoPharm, K-Cosmetics, Neture는 로그인 후 헤더 드롭다운에 스토어/워크스페이스 직접 링크가 없다. 대시보드 redirect가 성공해도 헤더에서 재진입이 불편하다.

---

### 2-D. Dual-source role 감지 (JWT roles OR context field)

| 서비스 | Dual-source | 이유 |
|--------|------------|------|
| KPA | ✅ `roles.includes('kpa:store_owner') \|\| user.isStoreOwner` | pharmacy approval 타이밍 gap 대응 |
| GlycoPharm | ❌ roles only | stale JWT 시 누락 위험 |
| K-Cosmetics | ❌ roles only | stale JWT 시 누락 위험 |
| Neture | ❌ roles only | — |

**KPA canonical**: 역할 부여(role_assignments) 시점과 JWT 갱신 시점 사이에 gap이 있으므로 context field 보조 체크가 필요하다. 다른 서비스도 동일한 gap이 존재하지만 현재 미대응 상태.

---

### 2-E. Role label helper

| 서비스 | helper | 용도 |
|--------|--------|------|
| KPA | ❌ 없음 | — |
| GlycoPharm | ❌ 없음 | — |
| K-Cosmetics | ❌ 없음 | — |
| Neture | ✅ `getNetureRoleLabel(roles)` | 헤더 역할 표시 배지 |

**Neture best practice**: 사용자에게 현재 primary role을 표시 텍스트로 보여주는 패턴. KPA 등 다른 서비스로 확산 가능.

---

## 3. 버그 목록 (코드 수준)

### BUG-1: K-Cosmetics LoginPage — 단일 role 배열 전달 오류

**파일**: `services/web-k-cosmetics/src/pages/auth/LoginPage.tsx`

```typescript
// ❌ 현재: result.role (단일 string)을 배열로 래핑
getKCosmeticsDashboardRoute([result.role])

// ✅ 올바른 형태: roles 배열 전달
getKCosmeticsDashboardRoute(result.roles)
```

**영향**: multi-role 사용자의 경우 단 하나의 role만 전달되어 PRIORITY 기반 우선순위 판정이 무력화됨.

---

### BUG-2: GlycoPharm — `glycopharm:store_owner` 역할 Dashboard Map 부재

**파일**: `services/web-glycopharm/src/config/dashboard.ts`

```typescript
// 현재 GLYCOPHARM_DASHBOARD_MAP:
{
  'glycopharm:admin': '/admin',
  'glycopharm:operator': '/operator',
  'glycopharm:pharmacist': '/store/hub',  // pharmacist가 store 역할을 겸함
  // 'glycopharm:store_owner': 없음
}
```

**영향**: `glycopharm:store_owner` 역할이 존재하더라도 대시보드 redirect 대상이 없어 fallback(/) 또는 mypage로 이동.

---

### BUG-3: GlycoPharm 헤더 — `isPharmacy` context fallback 없음

**파일**: `services/web-glycopharm/src/components/GlycoGlobalHeader.tsx`

```typescript
// ❌ 현재: roles only
const isPharmacy = user?.roles?.includes('glycopharm:pharmacist') ?? false;

// ✅ KPA 패턴: context field 보조 필요 (stale JWT 대응)
const isPharmacy = (user?.roles?.includes('glycopharm:pharmacist') ?? false)
  || (user as any)?.isPharmacist === true;
```

---

## 4. Canonical 구조 정의

모든 서비스가 준수해야 하는 표준 구조:

```
config/dashboard.ts
├── {SERVICE}_ROLE_PRIORITY: string[]     — 우선순위 배열 (높은 권한 먼저)
├── {SERVICE}_DASHBOARD_MAP: Record<string, string>  — role → route
└── get{Service}PostLoginRoute(user): string | null
    ├── PRIORITY+MAP으로 primary route 계산
    ├── context field fallback (stale JWT 대응)
    └── null = 현재 위치 유지 (커뮤니티 철학)

App.tsx (또는 Modal)
└── <PostLoginRedirect /> — 단일 진입점
    ├── workspace 경로 이미 있으면 skip
    ├── get{Service}PostLoginRoute(user) 호출
    └── null 이면 navigate 생략

GlobalHeader.tsx
└── userMenuItems
    ├── admin/operator 대시보드 링크
    ├── [워크스페이스 링크] — 역할 보유자만 (dual-source 체크)
    └── 마이페이지 / 설정
```

---

## 5. Legacy 구조 (제거 대상)

| 파일 | Legacy 패턴 | 대체 |
|------|------------|------|
| `packages/auth-utils/src/rolePriority.ts` | 비접두사 역할 배열 `['admin','operator',...]` | 서비스별 `{SERVICE}_ROLE_PRIORITY` |
| `packages/auth-utils/src/roleDashboardMap.ts` | 비접두사 map `{admin:'/admin',...}` | 서비스별 `{SERVICE}_DASHBOARD_MAP` |
| GlycoPharm LoginPage redirect | 페이지 내부 navigate() | App.tsx PostLoginRedirect |
| K-Cosmetics LoginPage redirect | 페이지 내부 navigate() | App.tsx PostLoginRedirect |

> **주의**: `rolePriority.ts` / `roleDashboardMap.ts` 직접 제거는 importers 확인 후 별도 WO 필요.

---

## 6. 공통화 가능 영역

### 6-1. `isStoreOwnerDual()` 유틸 → `@o4o/auth-utils`

```typescript
// packages/auth-utils/src/isStoreOwnerDual.ts
export function isStoreOwnerDual(
  roles: string[],
  storeOwnerRole: string,           // e.g. 'kpa:store_owner'
  contextFlag?: boolean,            // e.g. user.isStoreOwner
): boolean {
  return roles.includes(storeOwnerRole) || contextFlag === true;
}
```

**사용처**: 각 서비스 GlobalHeader의 스토어 링크 노출 조건.

---

### 6-2. `getRoleLabel()` 유틸 → `@o4o/auth-utils`

Neture의 `getNetureRoleLabel()` 패턴을 일반화:

```typescript
// packages/auth-utils/src/getRoleLabel.ts
export function getRoleLabel(
  roles: string[],
  priority: readonly string[],
  labels: Record<string, string>,
  fallback = '회원',
): string {
  for (const role of priority) {
    if (roles.includes(role) && labels[role]) return labels[role];
  }
  return fallback;
}
```

---

### 6-3. PostLoginRedirect 공통 패턴 (문서화)

App.tsx PostLoginRedirect는 각 서비스마다 별도 구현하되 **동일한 구조**를 따른다:
- workspace 경로 early exit 체크
- `get{Service}PostLoginRoute(user)` 호출
- null이면 navigate 생략
- `didRedirectRef`로 1회만 실행

공통 hook 추출은 과잉 추상화 — 서비스별 workspace 경로 목록이 다르므로 문서화로 충분.

---

## 7. 공통화 금지 영역

| 영역 | 이유 |
|------|------|
| `{SERVICE}_ROLE_PRIORITY` 배열 | 서비스마다 역할 체계가 다름 (kpa:pharmacist vs glycopharm:pharmacist vs neture:supplier) |
| `{SERVICE}_DASHBOARD_MAP` | 서비스마다 워크스페이스 경로가 다름 |
| `get{Service}PostLoginRoute()` 함수 | context field 이름이 서비스마다 다름 (isStoreOwner vs isPharmacy 등) |
| MembershipGate 내부 서비스 키 | `service_memberships.service_key` 값이 서비스별 고정값 |

---

## 8. Drift 발생 영역 요약

| Drift 유형 | 서비스 | 심각도 |
|-----------|--------|--------|
| LoginPage 내부 redirect (PostLoginRedirect 미적용) | GlycoPharm, K-Cosmetics | Medium |
| 헤더 드롭다운 워크스페이스 링크 없음 | GlycoPharm, K-Cosmetics, Neture | Low |
| Dual-source 역할 감지 없음 | GlycoPharm, K-Cosmetics, Neture | Low (현재 증상 없음) |
| `getKCosmeticsDashboardRoute([result.role])` 버그 | K-Cosmetics | High (multi-role 판정 오류) |
| `glycopharm:store_owner` Dashboard Map 누락 | GlycoPharm | Medium |
| Role label helper 없음 | KPA, GlycoPharm, K-Cosmetics | Low |

---

## 9. 후속 WO 우선순위

| 우선순위 | WO ID | 내용 | 서비스 |
|---------|-------|------|--------|
| P1 | WO-O4O-KCOSMETICS-LOGINPAGE-ROLES-FIX-V1 | `result.roles` 배열 전달 버그 수정 | K-Cosmetics |
| P1 | WO-O4O-INSTRUCTOR-ROUTE-GUARD-V1 | `/instructor` 라우트 RoleGuard 추가 | KPA |
| P2 | WO-O4O-GLYCOPHARM-STORE-OWNER-DASHBOARD-V1 | `glycopharm:store_owner` PRIORITY+MAP 추가 | GlycoPharm |
| P2 | WO-O4O-GLYCOPHARM-POSTLOGIN-REDIRECT-UNIFICATION-V1 | App.tsx PostLoginRedirect 이관 | GlycoPharm |
| P2 | WO-O4O-KCOSMETICS-POSTLOGIN-REDIRECT-UNIFICATION-V1 | App.tsx PostLoginRedirect 이관 | K-Cosmetics |
| P3 | WO-O4O-AUTH-UTILS-STORE-OWNER-DUAL-V1 | `isStoreOwnerDual()` → @o4o/auth-utils | 공통 |
| P3 | WO-O4O-AUTH-UTILS-ROLE-LABEL-V1 | `getRoleLabel()` → @o4o/auth-utils (Neture 패턴 일반화) | 공통 |
| P3 | WO-O4O-RBAC-CATALOG-STORE-OWNER-SYNC-V1 | `kpa:store_owner` RBAC catalog 문서 추가 | 문서 |

---

## 10. 결론

- **PRIORITY+MAP 패턴**: 4개 서비스 모두 적용 완료 — 구조 통일 달성
- **KPA = Reference Implementation**: PostLoginRedirect + dual-source + MembershipGate 모두 적용된 유일한 서비스
- **즉시 조치 필요**: K-Cosmetics LoginPage 단일 role 버그 (P1)
- **중기 정렬**: GlycoPharm / K-Cosmetics를 KPA 수준으로 끌어올리는 PostLoginRedirect 이관 (P2)
- **장기 공통화**: `isStoreOwnerDual()` + `getRoleLabel()` 유틸화 (P3)

---

*Author: Claude Code (IR 조사)*
*Date: 2026-05-15*
*Status: COMPLETE — 후속 WO는 우선순위에 따라 별도 실행*
