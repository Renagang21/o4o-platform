# IR-NETURE-GUARD-AUDIT-V1

## Neture Service Guard / Ownership 보안 구조 전수 조사

**조사일**: 2026-02-15
**기준선**: KPA Security Baseline v2 (`kpa-security-baseline-v2`)
**상태**: COMPLETE

---

## Executive Summary

Neture 서비스의 보안 구조를 6개 트랙으로 전수 조사한 결과,
**KPA 기준선 대비 심각한 격차**가 확인되었다.

### 핵심 수치

| 항목 | 수치 |
|------|------|
| 총 Write Endpoint | **51개** |
| 🔴 CRITICAL | **5건** |
| 🟠 HIGH | **28건** |
| 🟡 MEDIUM | **16건** |
| 🟢 SAFE | **6건** |
| Unprefixed Legacy Role 사용 | **31+개소** |
| DEV Bypass 조건 | **4개 파일** |
| Scope Guard (`requireNetureScope`) | **미구현** |

### KPA vs Neture 비교

| 항목 | KPA-a | Neture |
|------|-------|--------|
| Scope Guard | ✅ `requireKpaScope()` | ❌ 없음 |
| Legacy Role 차단 | ✅ detect + deny | ❌ 여전히 수용 |
| Cross-service 차단 | ✅ 명시적 거부 | ❌ 무방비 |
| Prefixed Role 강제 | ✅ `kpa:admin` 등 | ❌ unprefixed `admin` 사용 |
| Ownership Guard | ✅ 2단계 (Role+Owner) | ⚠️ 85% 안전, 1건 CRITICAL |
| DEV Bypass | ✅ 0건 | ❌ 4건 |

---

## Track A — Write Endpoint 전수 추출

### 51개 Write Endpoint 분포

| Route File | Endpoints | 🔴 | 🟠 | 🟡 | 🟢 |
|---|---|---|---|---|---|
| `modules/neture/neture.routes.ts` | 19 | - | 14 | 5 | - |
| `cpt/dropshipping.routes.ts` | 11 | 1 | 10 | - | - |
| `dropshipping-admin.routes.ts` | 8 | - | - | 8 | - |
| `admin/seller-authorization.routes.ts` | 3 | - | - | 3 | - |
| `admin/suppliers.routes.ts` | 5 | - | - | - | 5 |
| `signage/seller/seller.routes.ts` | 5 | - | - | - | 5 |
| `neture.routes.ts` (P1) | 0 | - | - | - | - |

### Top Critical Issues

1. **🔴 UNGUARDED**: `POST /cpt/products/calculate-margin` — Guard 없음
2. **🟠 AUTH-ONLY 14건**: `modules/neture/neture.routes.ts` — 인증만, Role 없음
3. **🟠 AUTH-ONLY 10건**: `cpt/dropshipping.routes.ts` — 인증만, Role 없음

---

## Track B — Role Assignment 경로 분석

### 10개 Role Assignment 경로 발견

| # | Endpoint | Guard | 위험 |
|---|---|---|---|
| 1 | `POST /api/v1/users/:userId/roles` | kpa:admin 수용 | 🔴 CRITICAL |
| 2 | `DELETE /api/v1/users/:userId/roles/:roleId` | kpa:admin 수용 | 🔴 CRITICAL |
| 3 | `PATCH /kpa/members/:id/role` | requireScope('kpa:admin') | 🔴 CRITICAL |
| 4 | `PATCH /kpa/members/:id/status` | requireScope('kpa:operator') | 🟠 HIGH |
| 5 | `PATCH /partnership/requests/:id` | requireAuth + inline | 🟠 HIGH |
| 6-7 | `/admin/operators/:id/deactivate\|reactivate` | isServiceAdmin() | 🟡 MEDIUM |
| 8 | `GET /admin/operators` | isServiceAdmin() | 🟢 SAFE |
| 9-10 | `/admin/dropshipping/sellers/:userId/approve\|revoke-role` | requireAdmin (stub 501) | 🟠 HIGH |

### CRITICAL-1: Cross-Service Privilege Escalation
- `POST /api/v1/users/:userId/roles` — kpa:admin이 ANY role을 ANY user에게 부여 가능
- **파일**: `user-role.controller.ts:91-230`
- **영향**: 서비스 격리 완전 우회

---

## Track C — Ownership 검증 분석

### 20개 Write Endpoint 중 17개 안전 (85%)

| 등급 | 수 | 내용 |
|---|---|---|
| 🟢 SAFE | 17 | `findOne({ id, ownerId })` 패턴 적용 |
| 🟡 MEDIUM | 2 | Admin override (의도적, 감사 로그 있음) |
| 🔴 CRITICAL | 1 | Partnership request 소유권 미검증 |

### CRITICAL: Partnership Request Status Update
- `PATCH /partnership/requests/:id` — 어떤 neture:admin이든 모든 seller의 request 수정 가능
- **파일**: `neture.controller.ts:371-452`
- **수정 필요**: `request.sellerId === userId` 검증 추가

### HIGH: Seller ID Override
- `POST /supplier/requests` — `data.sellerId || userId` → 클라이언트가 sellerId 주입 가능
- **수정 필요**: `const sellerId = userId;` (override 금지)

---

## Track D — 구조 생성 API 분석

### CPT Dropshipping — 🔴 9개 CRITICAL

| Endpoint | Guard | 문제 |
|---|---|---|
| POST/PUT/DELETE `/products` | `authenticate` only | 🔴 Role 없음 |
| POST/PUT/DELETE `/partners` | `authenticate` only | 🔴 Role 없음 |
| POST/PUT/DELETE `/suppliers` | `authenticate` only | 🔴 Role 없음 |

**영향**: 인증된 사용자 누구든 상품/파트너/공급자 생성/삭제 가능

### Legacy Role Fallback — 🔴 2개 Route

- `dropshipping-admin.routes.ts:34-36` — `includes('admin')` unprefixed 허용
- `yaksa.routes.ts:26-31` — `includes('admin')` unprefixed 허용

---

## Track E — DEV Bypass / Legacy Role

### DEV Bypass — 4개 파일

| 파일 | 내용 |
|---|---|
| `productSeederController.ts` | production에서만 에러 throw (3곳) |
| `dev-auth.middleware.ts` | NODE_ENV 기반 인증 분기 |
| `main.ts` | CORS/IP 제한 development에서 해제 |
| `production.config.ts` | ENABLE_DOCS=true면 문서 노출 |

### Unprefixed Legacy Role — 31+개소

| 파일 | 패턴 | 수 |
|---|---|---|
| `FieldGroupsController.ts` | `role !== 'admin'` | 6 |
| `TaxonomiesController.ts` | `role !== 'admin'`, `includes('manager')` | 7 |
| `FormsController.ts` | `role !== 'admin'`, `includes('manager')` | 9 |
| `adminOrderController.ts` | `['admin','operator'].includes()` | 3 |
| `checkoutController.ts` | `['admin','operator'].includes()` | 2 |
| `approvalController.ts` | `includes('seller')` | 1 |
| `tenant-isolation.middleware.ts` | `includes('admin')` | 1 |
| `dropshipping-admin.routes.ts` | `includes('admin')` | 3 |

---

## Track F — Scope 충돌 테스트

### 핵심 발견: `requireNetureScope` 미구현

| 질문 | 답 |
|---|---|
| KPA admin이 Neture admin 접근 가능? | ✅ YES — 🔴 CRITICAL |
| GlycoPharm admin이 Neture admin 접근 가능? | ✅ YES — 🔴 CRITICAL |
| `requireNetureScope()` 존재? | ❌ NO — 미구현 |
| Prefixed role (`neture:admin`) 강제? | ❌ NO — DB에만 존재 |
| Seller가 Supplier endpoint 접근? | ❌ NO — role 차이로 차단 |
| Supplier가 Seller endpoint 접근? | ⚠️ YES — requireAuth only |

### Cross-Service Attack Path
```
User: { roles: ['kpa:admin', 'admin'] }
  → GET /api/v1/neture/admin/dashboard/summary
  → requireAdmin checks: hasAnyRole(['admin','super_admin','operator'])
  → 'admin' found → ✅ PASSES
  → 200 OK (Neture admin data exposed)
```

### Neture Prefixed Role 현황
- Migration `20260205060000-NetureRolePrefixMigration.ts` — DB에 `neture:admin`, `neture:operator` 추가됨
- **하지만 미들웨어에서 강제하지 않음** → 보안 효과 0

---

## 종합 위험 분류

### 🔴 CRITICAL (즉시 수정 필요) — 5건

| # | 내용 | 파일 |
|---|---|---|
| C-1 | Unguarded endpoint (`/cpt/calculate-margin`) | `dropshipping.routes.ts:27` |
| C-2 | CPT CRUD 9개 authenticate-only | `dropshipping.routes.ts` |
| C-3 | Cross-service role escalation (user-role API) | `user-role.controller.ts:91-230` |
| C-4 | Partnership request ownership 미검증 | `neture.controller.ts:371-452` |
| C-5 | Scope guard 부재 (cross-service 진입 허용) | 전체 Neture routes |

### 🟠 HIGH (긴급 수정) — 28건

- Neture auth-only write endpoints: 14건
- CPT auth-only write endpoints: 10건
- Role assignment stub (seller approve/revoke): 2건
- Partnership inline guard: 1건
- Member status (operator suspension): 1건

### 🟡 MEDIUM — 16건

- Dropshipping-admin legacy fallback: 8건
- Seller authorization stubs: 3건
- Neture partial guards: 5건

### 🟢 SAFE — 6건

- Admin suppliers routes: 5건
- Signage seller routes: 1건 (5 endpoints)

---

## 수정 우선순위

### Phase 1: Scope Guard 구현 (P0)

1. **`requireNetureScope(scope)` 미들웨어 구현**
   - KPA의 `requireKpaScope()` 패턴 그대로 적용
   - `neture:admin`, `neture:operator` 강제
   - Legacy unprefixed role → detect + deny
   - Cross-service role → 명시적 거부

2. **Neture admin routes에 적용**
   - `/admin/dashboard/*` → `requireNetureScope('neture:admin')`
   - `/admin/requests/*` → `requireNetureScope('neture:admin')`

### Phase 2: CPT Dropshipping Guard 추가 (P0)

3. **`dropshipping.routes.ts` 전체 guard 추가**
   - 9개 CRUD → `requireRole('supplier')` 또는 `requireAdmin`
   - `calculate-margin` → `requireAuth` 최소

4. **Legacy role fallback 제거**
   - `dropshipping-admin.routes.ts:34-36` — unprefixed 제거
   - `yaksa.routes.ts:26-31` — unprefixed 제거

### Phase 3: Ownership 보완 (P1)

5. **Partnership request ownership 검증 추가**
6. **Seller ID override 차단** (`sellerId = userId` 강제)

### Phase 4: Legacy Role 정리 (P2)

7. **31+개소 unprefixed role → prefixed role 전환**
8. **DEV bypass 조건 정리**

### Phase 5: Cross-Service Role Assignment 제한 (P2)

9. **`user-role.controller.ts`에 서비스 경계 검증 추가**

---

## 완료 기준 충족 확인

| 기준 | 상태 |
|------|------|
| Write endpoint 100% 목록화 | ✅ 51개 |
| requireAuth-only write API 수 명확화 | ✅ 25건 |
| RoleAssignment 위험 경로 명확화 | ✅ 3건 CRITICAL |
| Ownership 부재 리소스 식별 | ✅ 1건 CRITICAL |
| Legacy role 사용 여부 확인 | ✅ 31+개소 |
| DEV bypass 확인 | ✅ 4개 파일 |

---

## 다음 단계

이 조사 결과를 기반으로:

> **WO-NETURE-GUARD-REALIGNMENT-V1**

을 수립하여 Neture를 KPA 보안 기준선으로 끌어올린다.

---

*Generated: 2026-02-15*
*Investigation: IR-NETURE-GUARD-AUDIT-V1*
*Baseline Reference: kpa-security-baseline-v2 (c03482524)*
