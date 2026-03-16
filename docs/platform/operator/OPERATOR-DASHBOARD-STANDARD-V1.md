# O4O Operator Dashboard Standard V1

> **운영자 대시보드 개발 시 반드시 따라야 하는 플랫폼 표준**
>
> Date: 2026-03-16
> Status: Active Standard
> Version: 1.1
> 근거: IR-O4O-ADMIN-OPERATOR-ROLE-ARCHITECTURE-AUDIT-V1

---

## 1. Admin / Operator 역할 정의

### 1-1. 역할 구분

| 역할 | 범위 | 핵심 기능 |
|------|------|----------|
| **Admin** | 구조 + 정책 + 거버넌스 + 금융 | 승인 관리, 사용자 CRUD, 정산/커미션, 시스템 설정, AI 정책 |
| **Operator** | 운영 + 콘텐츠 + 모니터링 | Dashboard 조회, 콘텐츠 CRUD, 사이니지, 포럼, AI 리포트 |

Admin은 "무엇을 허용할지" 결정하고, Operator는 "허용된 것을 운영"한다.

### 1-2. 기능별 역할 매핑

| 기능 영역 | Admin | Operator |
|----------|:-----:|:--------:|
| Dashboard (5-Block) | ✅ | ✅ |
| 신청 승인/거부 | ✅ | ✅ |
| 사용자 관리 (CRUD) | ✅ | 조회만 |
| 상품 승인 | ✅ | ❌ |
| 상품 운영 (목록/관리) | ❌ | ✅ |
| 매장 관리 | ✅ | ✅ |
| 정산/금융 | ✅ | ❌ |
| 시스템 설정 | ✅ | ❌ |
| 콘텐츠 CRUD | ❌ | ✅ |
| 사이니지 관리 | ❌ | ✅ |
| 포럼/커뮤니티 관리 | ❌ | ✅ |
| AI 정책/엔진 설정 | ✅ | ❌ |
| AI 리포트 조회 | ❌ | ✅ |

### 1-3. 역할 상속

Operator scope는 Admin scope를 포함한다:

```
require{Service}Scope('{service}:operator')
  → {service}:operator 허용
  → {service}:admin 도 허용 (scope role mapping)
```

따라서 Admin 사용자는 Operator UI에도 접근 가능하다.

---

## 2. Role 명명 규칙

### 2-1. 서비스 접두사 패턴

```
{serviceKey}:{roleName}
```

| 서비스 | Admin Role | Operator Role |
|--------|-----------|--------------|
| Neture | `neture:admin` | `neture:operator` |
| GlycoPharm | `glycopharm:admin` | `glycopharm:operator` |
| GlucoseView | `glucoseview:admin` | `glucoseview:operator` |
| K-Cosmetics | `cosmetics:admin` | `cosmetics:operator` |
| KPA Society | `kpa:admin` | `kpa:operator` |

### 2-2. 플랫폼 Bypass

`platform:super_admin`은 모든 서비스에 대한 bypass를 가진다 (KPA 제외).

---

## 3. Guard 표준

### 3-1. Backend Guard 패턴

모든 서비스는 동일한 Guard 체인을 사용한다:

```typescript
// ✅ 표준 패턴
router.get('/operator/dashboard',
  requireAuth,
  require{Service}Scope('{service}:operator'),
  controller.getDashboard
);

router.post('/admin/approve',
  requireAuth,
  require{Service}Scope('{service}:admin'),
  controller.approve
);
```

**금지 패턴:**

```typescript
// ❌ 인라인 역할 체크
const isOperatorOrAdmin = (req) => { ... };

// ❌ 레거시 Guard
requireAdmin  // → 플랫폼 레벨 Guard, 서비스 레벨에서 사용 금지

// ❌ 직접 role 비교
if (user.roles.includes('admin')) { ... }
```

### 3-2. Scope Guard 설정

서비스별 Scope Guard는 `@o4o/security-core`의 `createMembershipScopeGuard`로 생성:

```typescript
// packages/security-core/src/service-configs.ts
{
  serviceKey: '{service}',
  allowedRoles: ['{service}:admin', '{service}:operator'],
  platformBypass: true,  // platform:super_admin bypass 허용
  scopeRoleMapping: {
    '{service}:admin': ['{service}:admin'],
    '{service}:operator': ['{service}:operator', '{service}:admin'],
  }
}
```

### 3-3. Frontend Guard 패턴

```tsx
// ✅ Operator 영역
<ProtectedRoute allowedRoles={['admin', 'operator']}>
  <OperatorLayout />
</ProtectedRoute>

// ✅ Admin 영역
<ProtectedRoute allowedRoles={['admin']}>
  <AdminLayout />
</ProtectedRoute>
```

---

## 4. UI 레이아웃 표준

### 4-1. 레이아웃 분리

| 항목 | 표준 |
|------|------|
| Admin Layout | 독립 레이아웃 파일 |
| Operator Layout | 독립 레이아웃 파일 |
| 메뉴 위치 | **좌측 사이드바** (Capability Group 접이식) |
| Route 접두사 | `/operator/*`, `/admin/*` |

**금지:**
- 상단 수평 바를 operator 메뉴로 사용
- Admin/Operator를 같은 Layout에서 role 파라미터로 분기

### 4-2. Operator Sidebar — 11-Capability Group

모든 서비스의 Operator Sidebar는 아래 11개 Capability Group을 기준으로 구성한다.
서비스에 해당 기능이 없으면 해당 그룹을 생략한다.

```
 1. Dashboard      — 대시보드 (필수)
 2. Users          — 회원 관리
 3. Approvals      — 신청/승인 관리
 4. Products       — 상품 관리
 5. Stores         — 매장 관리
 6. Orders         — 주문 관리
 7. Content        — 콘텐츠 관리
 8. Signage        — 사이니지
 9. Forum          — 포럼/커뮤니티
10. Analytics      — AI 리포트
11. System         — 설정/감사 로그
```

**그룹 순서는 위 번호를 따른다.** 서비스별 추가 그룹이 필요하면 10-11 사이에 삽입한다.

### 4-3. Admin Sidebar

Admin Sidebar는 서비스별로 다를 수 있으나, 다음 그룹을 우선 사용한다:

```
 1. Overview       — 대시보드
 2. Users          — 사용자/운영자 관리
 3. Approvals      — 승인 관리 (공급자, 상품, 서비스)
 4. Products       — 상품 마스터/카탈로그
 5. Finance        — 정산/커미션/파트너
 6. Content        — 광고/스폰서
 7. Analytics      — AI 정책/엔진
 8. System         — 시스템 설정
```

---

## 5. Dashboard 표준

### 5-1. 5-Block Architecture

모든 Operator Dashboard는 5-Block 구조를 사용한다:

```
Block 1: KPI Grid       — 핵심 지표 카드 (동적)
Block 2: AI Summary     — CopilotEngine 기반 인사이트
Block 3: Action Queue   — 즉시 처리 항목
Block 4: Activity Log   — 최근 활동 스트림
Block 5: Quick Actions  — 바로가기 링크
```

**Dashboard 설계 원칙:** 운영자가 즉시 상태를 파악하고 행동을 결정할 수 있어야 한다.

```
KPI (지표) → AI Summary (인사이트) → Action Queue (행동)
```

### 5-2. API 패턴

```
GET /api/v1/{service}/operator/dashboard
→ { kpis, aiSummary, actionQueue, activityLog, quickActions }
```

### 5-3. 프론트엔드 컴포넌트

```tsx
import { OperatorDashboardLayout } from '@o4o/operator-ux-core';

<OperatorDashboardLayout config={dashboardConfig} />
```

### 5-4. AI Summary 생성

```typescript
// ✅ 표준: Backend CopilotEngineService
const insights = await copilotEngine.generateInsights(serviceKey, kpiData);

// ❌ 금지: Frontend에서 client-side push() 기반 생성
```

### 5-5. Admin Dashboard

Admin Dashboard도 5-Block 형식을 사용한다. 4-Block 레거시는 마이그레이션 대상이다.

---

## 6. KPI 설계 표준

### 6-1. KPI 설계 원칙

| 원칙 | 설명 |
|------|------|
| **실시간성** | 운영 상태를 즉시 반영 |
| **행동 연결** | KPI → Action Queue로 연결 가능해야 함 |
| **서비스 격리** | 반드시 `serviceKey` 기준 필터 |
| **Backend 계산** | 모든 집계는 Backend에서 수행, Frontend 계산 금지 |

### 6-2. KPI 카드 구조

각 KPI 카드는 다음 필드를 포함한다:

```typescript
interface KpiItem {
  id: string;          // 고유 식별자 (e.g., 'active_pharmacies')
  label: string;       // 표시 이름
  value: number;       // 현재 값
  trend?: string;      // 변화 추세 (e.g., '+3', '-2%')
  link?: string;       // 관련 페이지 이동 경로
}
```

### 6-3. KPI 수량 제한

Dashboard KPI는 **최소 4개, 최대 8개**만 표시한다.

과도한 KPI는 인지 부하를 발생시킨다. 추가 지표가 필요하면 해당 기능 페이지에서 제공한다.

### 6-4. KPI Capability 분류

KPI는 Capability Layer 기준으로 분류한다. 서비스는 필요한 Capability만 사용한다.

| Capability | 설명 | 대표 KPI |
|-----------|------|---------|
| **Network** | 조직, 약국, 사용자 | 활성 조직, 대기 신청, 등록 사용자 |
| **Commerce** | 상품, 주문 | 활성 상품, 총 주문, 매출 |
| **Care** | 환자, 건강 데이터 | 전체 환자, 고위험 환자, 코칭 세션, 활성 알림 |
| **Content** | 콘텐츠 | 게시 콘텐츠, 초안 콘텐츠 |
| **Signage** | 디지털 사이니지 | 활성 플레이리스트, 미디어 자산 |
| **Community** | 포럼, 커뮤니티 | 게시글, 포럼 신청 |
| **Analytics** | AI 운영 | AI 응답 수, Context Asset |

### 6-5. 서비스별 KPI 적용

| 서비스 | Network | Commerce | Care | Content | Signage | Community | Analytics |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Neture** | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **GlycoPharm** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GlucoseView** | ✅ | — | ✅ | ✅ | — | — | ✅ |
| **K-Cosmetics** | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **KPA** | ✅ | — | — | ✅ | ✅ | ✅ | ✅ |

### 6-6. KPI → Action Queue 연결

KPI는 Action Queue와 연결되어야 한다. 문제가 있는 KPI가 즉시 행동으로 이어진다.

| KPI 예시 | Action Queue 항목 |
|---------|-----------------|
| 대기 신청 > 0 | "N건의 신청 검토 필요" |
| 고위험 환자 > 0 | "고위험 환자 N명 코칭 필요" |
| 초안 상품 > 0 | "상품 N개 검토 대기" |

### 6-7. KPI 금지 패턴

| 금지 | 이유 |
|------|------|
| 단순 로그 카운트 (e.g., 총 로그인 수) | 운영 행동으로 연결되지 않음 |
| Frontend 집계 | Backend에서 계산해야 함 |
| 서비스 혼합 데이터 | 서비스 격리 위반 |
| 9개 이상 KPI 카드 | 인지 부하 초과 |

---

## 7. Route 구조 표준

### 7-1. Backend Route

```
/api/v1/{service}/operator/*    — Operator API
/api/v1/{service}/admin/*       — Admin API
/api/v1/operator/*              — Extension Layer (공통 기능)
```

### 7-2. Frontend Route

```
/operator/*                     — Operator UI
/admin/*                        — Admin UI
```

Neture의 `/workspace/operator` 접두사는 레거시이며 신규 서비스에서 사용하지 않는다.

---

## 8. 서비스별 현재 상태 및 정비 대상

| 서비스 | Operator Sidebar | Admin UI | Dashboard | Guard | 정비 |
|--------|:---:|:---:|:---:|:---:|------|
| **Neture** | ✅ 8그룹 | ✅ 8그룹 | ✅ 5-Block | ✅ Scope Guard | 기준 서비스 |
| **KPA** | ✅ 9그룹 | ✅ 5그룹 | ✅ 5-Block | ✅ Scope Guard | aiSummary Backend 전환 필요 |
| **GlycoPharm** | ⚠️ 11그룹 (누락 있음) | ⚠️ 4-Block | ✅ 5-Block | ⚠️ 혼합 | 메뉴 누락 추가, Guard 통일 |
| **K-Cosmetics** | ✅ 9그룹 | ⚠️ 최소 | ✅ 5-Block | ✅ Scope Guard | Admin 확장 필요 |
| **GlucoseView** | ❌ 수평 6항목 | ❌ 없음 | ✅ 5-Block | ⚠️ 혼합 | 사이드바 전환, Guard 통일 |

---

## 9. 신규 서비스 Operator 구축 체크리스트

새로운 서비스에 Operator Dashboard를 추가할 때:

**Backend:**
- [ ] `packages/security-core/src/service-configs.ts`에 서비스 Scope Config 추가
- [ ] `apps/api-server/src/middleware/{service}-scope.middleware.ts` 생성
- [ ] `GET /api/v1/{service}/operator/dashboard` 엔드포인트 (5-Block 형식)
- [ ] `require{Service}Scope('{service}:operator')` Guard 적용
- [ ] KPI: Capability 선정 → 4~8개 KPI 선택 → Backend 집계 쿼리 구현
- [ ] KPI: 모든 쿼리에 serviceKey 필터 적용 (서비스 격리)
- [ ] Action Queue: KPI와 연결된 즉시 처리 항목 구현
- [ ] CopilotEngine: 서비스별 insight rules 등록

**Frontend:**
- [ ] `OperatorLayout.tsx` 생성 (좌측 사이드바 + Capability Group)
- [ ] 11-Capability Group 기준 메뉴 구성 (해당 없는 그룹 생략)
- [ ] `OperatorDashboardLayout` 컴포넌트 사용
- [ ] `ProtectedRoute allowedRoles={['admin', 'operator']}` 적용
- [ ] KPI 카드에 trend, actionLink 포함

**Admin (필요 시):**
- [ ] 별도 `AdminLayout.tsx` 생성
- [ ] `ProtectedRoute allowedRoles={['admin']}` 적용
- [ ] Admin Dashboard도 5-Block 형식

---

> 📄 근거: `docs/audit/IR-O4O-ADMIN-OPERATOR-ROLE-ARCHITECTURE-AUDIT-V1.md`
> 📄 참조: `docs/baseline/BASELINE-OPERATOR-OS-V1.md`

*Version: 1.1*
*Status: Active Standard*
