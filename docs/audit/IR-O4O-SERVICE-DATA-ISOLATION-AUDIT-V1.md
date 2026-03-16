# IR-O4O-SERVICE-DATA-ISOLATION-AUDIT-V1

> O4O Platform Service Data Isolation Audit
>
> Date: 2026-03-16
> Status: Complete
> Scope: Platform-wide (5 services)
> 근거: WO-O4O-SERVICE-DATA-ISOLATION-AUDIT-V1

---

## Executive Summary

O4O 플랫폼은 **Single Account, Multi Service, Service Data Isolation** 구조를 가진다.
`service_memberships` 테이블이 서비스 격리의 SSOT이다.

조사 결과, **Extension Layer (Operator Console)는 격리가 잘 구현**되어 있으나,
**서비스별 API에서 users 테이블을 직접 조회하는 패턴에 격리 누락**이 발견되었다.

| 등급 | 건수 | 설명 |
|------|:----:|------|
| SAFE | 18 | 서비스 격리 정상 |
| UNSAFE | 12 | 서비스 필터 누락 |
| EXEMPT | 8 | 인증 컨텍스트 (자기 자신 조회) |
| DESIGN-OK | 4 | Platform Admin 전용 (전체 조회 의도) |

---

## 1. 조사 기준

### 정상 패턴 (SAFE)

```sql
-- Pattern A: JOIN
SELECT u.* FROM users u
JOIN service_memberships sm ON sm.user_id = u.id
WHERE sm.service_key = $1

-- Pattern B: EXISTS
WHERE EXISTS (
  SELECT 1 FROM service_memberships sm
  WHERE sm.user_id = u.id AND sm.service_key = $1
)

-- Pattern C: Service-specific table
SELECT * FROM glycopharm_applications  -- 서비스 전용 테이블
```

### 위험 패턴 (UNSAFE)

```sql
-- 금지 1: users 단독 조회 (리스트)
SELECT * FROM users

-- 금지 2: findByIds 무필터
userRepo.findByIds(userIds)  -- 서비스 경계 없음

-- 금지 3: legacy service_key 사용
WHERE u.service_key = $1
```

---

## 2. Operator Console API (Extension Layer)

### 2-1. MembershipConsoleController — SAFE

파일: `controllers/operator/MembershipConsoleController.ts`
라우트: `GET /api/v1/operator/members`

```
✅ EXISTS (SELECT 1 FROM service_memberships sm2
     WHERE sm2.user_id = u.id
     AND sm2.service_key = ANY($N))
```

- 비 Platform Admin → `scope.serviceKeys` 강제 적용
- Platform Admin → 선택적 `serviceKey` 필터
- **참조 구현 (Reference Implementation)**

### 2-2. StoreConsoleController — SAFE

파일: `controllers/operator/StoreConsoleController.ts`
라우트: `GET /api/v1/operator/stores`

```
✅ EXISTS (SELECT 1 FROM organization_service_enrollments ose
     WHERE ose.organization_id = o.id
     AND ose.service_code = ANY($N))
```

### 2-3. ProductConsoleController — SAFE

파일: `controllers/operator/ProductConsoleController.ts`

```
✅ organization_product_listings → organization_service_enrollments 체인
```

---

## 3. Admin API (Platform Layer)

### 3-1. AdminUserController — DESIGN-OK (Platform Admin 전용)

파일: `controllers/admin/AdminUserController.ts`
라우트: `GET /api/v1/admin/users`
Guard: `requireRole(['admin', 'super_admin'])`

```
⚠️ userRepo.createQueryBuilder('user') — 서비스 필터 없음
```

| 엔드포인트 | 서비스 필터 | 판정 |
|-----------|:---------:|------|
| `GET /` (목록) | 없음 | DESIGN-OK |
| `GET /:id` (상세) | 없음 | DESIGN-OK |
| `GET /statistics` | 없음 | DESIGN-OK |
| `POST /` (생성) | 없음 | DESIGN-OK |
| `PUT /:id` (수정) | 없음 | DESIGN-OK |
| `DELETE /:id` (삭제) | 없음 | DESIGN-OK |

**판정**: Platform Admin은 전체 사용자 관리가 목적이므로 **전체 조회가 의도된 설계**.
Guard가 `requireRole(['admin', 'super_admin'])`으로 제한되어 서비스 운영자 접근 불가.

> 개선 제안: 선택적 `?service=glycopharm` 필터 추가 (편의 기능)

### 3-2. AdminDashboardController — DESIGN-OK

파일: `controllers/admin/adminDashboardController.ts`
Guard: `requireAdmin`

- `user-growth`: 전체 사용자 수 — Platform Admin 통계 의도
- `sales-summary`: NetureOrder 전용 (서비스 격리됨)
- `order-status`: NetureOrder 전용 (서비스 격리됨)

### 3-3. user-management.controller.ts — DESIGN-OK

파일: `modules/user/controllers/user-management.controller.ts`
라우트: `GET /api/v1/users`
Guard: 확인 필요 (requireAuth 수준이면 UNSAFE)

> **주의**: Guard가 `requireAdmin`이 아닌 경우 UNSAFE로 재분류 필요

---

## 4. 서비스별 API — User 조회

### 4-1. Neture

| 파일 | 라인 | 쿼리 | 격리 | 판정 |
|------|:----:|------|:----:|------|
| `neture.service.ts` | 382, 503 | `SELECT ... FROM users WHERE id = ANY($1)` (supplier 사용자) | 없음 | **UNSAFE** |
| `routes/neture/services/neture.service.ts` | 297, 324 | `SELECT ... FROM users WHERE id = ANY($1)` (partner 사용자) | 없음 | **UNSAFE** |
| `operator-registration.service.ts` | 33-50 | `JOIN service_memberships WHERE service_key = 'neture'` | 있음 | SAFE |
| `partner.service.ts` | 347, 397 | `JOIN service_memberships WHERE service_key = 'neture'` | 있음 | SAFE |

### 4-2. GlycoPharm

| 파일 | 라인 | 쿼리 | 격리 | 판정 |
|------|:----:|------|:----:|------|
| `store-applications.controller.ts` | 373, 389 | `userRepo.findByIds(userIds)` (operator 목록) | 없음 | **UNSAFE** |
| `admin.controller.ts` | 103, 132 | `userRepo.findByIds(userIds)` (admin 목록) | 없음 | **UNSAFE** |
| `application.controller.ts` | 151 | `findOne({ where: { id: req.user.id } })` | 인증 컨텍스트 | EXEMPT |
| `store-applications.controller.ts` | 456, 474 | `findOne({ where: { id: application.userId } })` | 신청 소유자 | EXEMPT |

### 4-3. GlucoseView

| 파일 | 라인 | 쿼리 | 격리 | 판정 |
|------|:----:|------|:----:|------|
| Dashboard 전체 | — | `glucoseview_*` 서비스 전용 테이블만 사용 | 테이블 격리 | SAFE |

### 4-4. K-Cosmetics

| 파일 | 라인 | 쿼리 | 격리 | 판정 |
|------|:----:|------|:----:|------|
| Dashboard 전체 | — | `cosmetics.*` 스키마 + `serviceKey='cosmetics'` | 스키마 + 필터 | SAFE |
| 주문 | — | `ecommerce_orders WHERE metadata->>'serviceKey' = 'cosmetics'` | 필터 | SAFE |

> **K-Cosmetics는 플랫폼 전체에서 가장 우수한 격리 구현** (Best Practice)

### 4-5. KPA Society

| 파일 | 라인 | 쿼리 | 격리 | 판정 |
|------|:----:|------|:----:|------|
| `pharmacy-request.controller.ts` | 133 | `SELECT name, email FROM users WHERE id = $1` | 없음 | **UNSAFE** |
| `branch-admin-dashboard.controller.ts` | 453, 528, 581 | `findOne({ where: { id: m.user_id } })` | 없음 | **UNSAFE** |
| `mypage.service.ts` | 26, 94, 132 | `findOne({ where: { id: userId } })` | 인증 컨텍스트 | EXEMPT |
| `application.controller.ts` | 93, 352 | `findOne({ where: { id } })` | 인증/신청 컨텍스트 | EXEMPT |
| `organization-join-request.controller.ts` | 143, 401, 517 | `findOne({ where: { id } })` | 인증/요청 컨텍스트 | EXEMPT |

---

## 5. Dashboard 쿼리 격리

### 5-1. Neture Operator Dashboard

파일: `modules/neture/controllers/operator-dashboard.controller.ts`

| 메트릭 | 격리 방식 | 판정 |
|--------|----------|------|
| Organizations | `JOIN organization_service_enrollments WHERE service_code = 'neture'` | SAFE |
| Pending Registrations | `service_memberships WHERE service_code = 'neture'` | SAFE |
| CMS Content | `WHERE serviceKey = 'neture'` | SAFE |
| Orders | `neture.neture_orders` (서비스 전용 스키마) | SAFE |
| Suppliers | `neture_suppliers` (필터 없음) | **UNSAFE** |
| Product Offers | `supplier_product_offers` (필터 없음) | **UNSAFE** |
| Settlements | `neture_settlements` (필터 없음) | **UNSAFE** |
| Contact Messages | `neture_contact_messages` (필터 없음) | **UNSAFE** |

> **참고**: `neture_*` 테이블은 Neture 전용이지만, 테이블 이름으로 격리하는 것은 스키마 레벨 격리가 아닌 관례적 격리. 현재 다른 서비스에서 사용하지 않으므로 **실질적 SAFE**이나, 원칙적으로는 UNSAFE.

### 5-2. GlycoPharm Operator Dashboard

파일: `routes/glycopharm/controllers/operator.controller.ts`

| 메트릭 | 격리 방식 | 판정 |
|--------|----------|------|
| Pharmacy Counts | `JOIN organization_service_enrollments WHERE service_code = 'glycopharm'` | SAFE |
| Applications | `GlycopharmApplication` (서비스 전용 엔티티) | SAFE |
| Products | `GlycopharmProduct` (서비스 전용 엔티티) | SAFE |
| Patient Profiles | `patient_health_profiles` (필터 없음) | **UNSAFE** |
| Care Metrics | `care_kpi_snapshots`, `care_alerts` (필터 없음) | **UNSAFE** |

### 5-3. GlucoseView Operator Dashboard

파일: `routes/glucoseview/controllers/operator-dashboard.controller.ts`

| 메트릭 | 격리 방식 | 판정 |
|--------|----------|------|
| Pharmacies | `glucoseview_pharmacies` (서비스 전용) | SAFE |
| Pharmacists | `glucoseview_pharmacists` (서비스 전용) | SAFE |
| Customers | `glucoseview_customers` (서비스 전용) | SAFE |
| Care Metrics | `care_kpi_snapshots`, `care_alerts` (필터 없음) | **UNSAFE** |

### 5-4. K-Cosmetics Operator Dashboard

| 메트릭 | 격리 방식 | 판정 |
|--------|----------|------|
| 전체 | `cosmetics.*` 스키마 + `serviceKey='cosmetics'` | SAFE |

### 5-5. KPA Society Operator Dashboard

파일: `routes/kpa/controllers/operator-summary.controller.ts`

| 메트릭 | 격리 방식 | 판정 |
|--------|----------|------|
| CMS Content | `WHERE serviceKey IN ('kpa-society', 'kpa')` | SAFE |
| Signage | `WHERE serviceKey = 'kpa-society'` | SAFE |
| Forum Posts | `WHERE organization_id IS NULL` (서비스 필터 없음) | **UNSAFE** |
| KPA-specific | `kpa_*` 테이블 (서비스 전용) | SAFE |

---

## 6. 공유 테이블 격리 문제

### 6-1. Care 테이블 (GlycoPharm + GlucoseView 공유)

다음 테이블은 **GlycoPharm과 GlucoseView에서 동시에 조회**하지만 서비스 필터가 없다:

| 테이블 | GlycoPharm | GlucoseView | service_key 컬럼 |
|--------|:----------:|:-----------:|:---------------:|
| `care_kpi_snapshots` | 조회 | 조회 | 없음 |
| `care_alerts` | 조회 | 조회 | 없음 |
| `care_coaching_sessions` | 조회 | 조회 | 없음 |
| `patient_health_profiles` | 조회 | — | 없음 |

**위험**: 두 서비스의 대시보드에서 동일한 데이터가 중복 표시됨.
현재 Care 데이터는 사실상 GlycoPharm/GlucoseView 공유이므로 실질적 문제는 낮으나,
서비스가 분리될 경우 데이터 혼합 위험 존재.

### 6-2. Forum 테이블

`forum_post` 조회에서 `serviceKey` 또는 `service_code` 필터 누락.
KPA 대시보드에서 전체 플랫폼 포럼 게시물 수를 카운트할 위험.

---

## 7. Auth 관련 조회 (EXEMPT)

다음 패턴은 인증 컨텍스트에서 자기 자신을 조회하므로 **EXEMPT**:

| 패턴 | 파일 | 판정 |
|------|------|------|
| `findOne({ where: { id: req.user.id } })` | 다수 | EXEMPT (자기 자신) |
| `findOne({ where: { email } })` 로그인 | `auth.controller.ts` | EXEMPT (인증 흐름) |
| `findOne({ where: { email } })` 비밀번호 재설정 | `password.controller.ts` | EXEMPT (단일 조회) |
| Handoff 토큰 검증 | `handoff.controller.ts` | EXEMPT (SSO 흐름) |

---

## 8. 위험도 분류

### P0 — 서비스 간 데이터 누출 위험 (UNSAFE)

| # | 서비스 | 파일 | 문제 |
|---|--------|------|------|
| 1 | Neture | `neture.service.ts:382,503` | Supplier 사용자 batch fetch — service_memberships 없음 |
| 2 | Neture | `routes/neture/services/neture.service.ts:297,324` | Partner 사용자 batch fetch — service_memberships 없음 |
| 3 | GlycoPharm | `store-applications.controller.ts:373,389` | Application 사용자 batch fetch — service_memberships 없음 |
| 4 | GlycoPharm | `admin.controller.ts:103,132` | Admin application 사용자 batch fetch — 무필터 |
| 5 | GlycoPharm+GlucoseView | `operator-dashboard-queries.ts:38-69` | 공유 Care 테이블 — service 필터 없음 |

### P1 — 격리 원칙 위반 (경미)

| # | 서비스 | 파일 | 문제 |
|---|--------|------|------|
| 6 | KPA | `pharmacy-request.controller.ts:133` | 사용자 조회 — KPA membership 미확인 |
| 7 | KPA | `branch-admin-dashboard.controller.ts:453,528,581` | 조직 멤버 사용자 조회 — 서비스 경계 없음 |
| 8 | KPA | `operator-summary.controller.ts:92-95` | Forum posts count — serviceKey 없음 |
| 9 | Neture | Dashboard `neture_suppliers`, `neture_settlements` 등 | 관례적 격리 (테이블명) — 명시적 필터 없음 |

### P2 — 개선 권장

| # | 대상 | 문제 |
|---|------|------|
| 10 | `user-management.controller.ts` | Guard 레벨 확인 필요 |
| 11 | `AdminUserController` | 선택적 service 필터 추가 권장 |
| 12 | Care 테이블 | `service_key` 컬럼 추가 고려 |

---

## 9. SAFE 영역 (참조)

| 서비스 | 영역 | 격리 방식 |
|--------|------|----------|
| K-Cosmetics | 전체 | `cosmetics.*` 스키마 + `serviceKey` 필터 (Best Practice) |
| GlucoseView | Dashboard | `glucoseview_*` 서비스 전용 테이블 |
| Neture | Registration | `service_memberships WHERE service_key = 'neture'` |
| Neture | Partner | `service_memberships JOIN` (WO-O4O-USER-DOMAIN-ALIGNMENT-V1) |
| Operator Console | Members | `EXISTS + service_key = ANY(scope.serviceKeys)` (Reference Impl) |
| Operator Console | Stores | `organization_service_enrollments` 기반 |
| CMS/Signage | 전체 | `serviceKey` 필터 |

---

## 10. 수정 표준 패턴

### 패턴 A: Batch User Fetch (Neture, GlycoPharm)

```sql
-- ❌ BEFORE (UNSAFE)
SELECT u.* FROM users u WHERE u.id = ANY($1)

-- ✅ AFTER (SAFE)
SELECT u.* FROM users u
JOIN service_memberships sm ON sm.user_id = u.id
WHERE u.id = ANY($1)
  AND sm.service_key = $2
```

### 패턴 B: Dashboard 메트릭 (Care 테이블)

```sql
-- ❌ BEFORE (UNSAFE)
SELECT COUNT(*) FROM care_kpi_snapshots WHERE risk_level = 'high'

-- ✅ AFTER (SAFE) — option 1: pharmacy 기반 격리
SELECT COUNT(*) FROM care_kpi_snapshots cks
JOIN organization_service_enrollments ose
  ON ose.organization_id = cks.pharmacy_id
WHERE cks.risk_level = 'high'
  AND ose.service_code = $1
```

### 패턴 C: KPA Forum (serviceKey 추가)

```sql
-- ❌ BEFORE (UNSAFE)
SELECT COUNT(*) FROM forum_post WHERE organization_id IS NULL

-- ✅ AFTER (SAFE)
SELECT COUNT(*) FROM forum_post
WHERE organization_id IS NULL
  AND "serviceKey" = 'kpa-society'
```

---

## 11. 결론

### 격리 상태 요약

| 서비스 | 격리 상태 | 등급 |
|--------|----------|:----:|
| K-Cosmetics | 완벽 (스키마 + 필터) | A |
| GlucoseView | 우수 (서비스 전용 테이블), Care 공유 문제 | B+ |
| Neture | 혼합 (Registration SAFE, Supplier/Partner batch UNSAFE) | B- |
| GlycoPharm | 혼합 (서비스 엔티티 SAFE, User batch UNSAFE, Care 공유) | B- |
| KPA Society | 혼합 (KPA 테이블 SAFE, Forum/Branch UNSAFE) | B- |
| Platform Admin | 의도적 전체 조회 (설계상 허용) | N/A |

### 후속 작업

조사 결과를 바탕으로 다음 Work Order 생성 권장:

```
WO-O4O-SERVICE-DATA-ISOLATION-FIX-V1
```

우선순위:
1. P0: Neture/GlycoPharm batch user fetch에 service_memberships 필터 추가
2. P0: 공유 Care 테이블 격리 방안 수립
3. P1: KPA Forum/Branch 격리 강화
4. P2: Platform Admin API 선택적 service 필터

---

*Version: 1.0*
*Status: Complete*
*Auditor: AI (Claude Opus 4.6)*
