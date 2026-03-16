# IR-O4O-ADMIN-OPERATOR-ROLE-ARCHITECTURE-AUDIT-V1

> **O4O 플랫폼 Admin / Operator 역할 구조 전수 조사**
>
> Date: 2026-03-16
> Status: Complete
> Scope: 5개 서비스 전체 Admin/Operator 역할, Guard, Dashboard, 메뉴, Router 구조
> 목적: 플랫폼 표준 확인 → 서비스별 정비 기준 도출

---

## 1. 플랫폼 Role 표준

### 1-1. 역할 저장소 (SSOT)

| 항목 | 값 |
|------|------|
| 테이블 | `role_assignments` |
| 키 컬럼 | user_id, role, is_active, scope_type, scope_id |
| Freeze | F9 (2026-02-27), F10 (2026-03-11) |

### 1-2. 역할 명명 규칙

| 패턴 | 예시 | 용도 |
|------|------|------|
| 비접두사 (Legacy) | `admin`, `super_admin`, `operator` | 플랫폼 레벨 역할 |
| 서비스 접두사 | `neture:admin`, `kpa:operator` | 서비스 범위 역할 |
| 플랫폼 접두사 | `platform:super_admin`, `platform:admin` | 명시적 플랫폼 역할 |

### 1-3. 서비스별 정의된 역할

| 서비스 | 역할 |
|--------|------|
| **platform** | `super_admin`, `admin`, `operator`, `manager`, `vendor`, `member`, `contributor` |
| **neture** | `admin`, `operator`, `seller`, `supplier`, `partner` |
| **glycopharm** | `admin`, `operator` |
| **glucoseview** | `admin`, `operator` |
| **cosmetics** | `admin`, `operator` |
| **kpa** | `admin`, `operator`, `district_admin`, `branch_admin`, `branch_operator`, `pharmacist` |

---

## 2. Guard 표준

### 2-1. 플랫폼 레벨 Guard

파일: `apps/api-server/src/common/middleware/auth.middleware.ts`

| Guard | 역할 | 동작 |
|-------|------|------|
| `requireAuth` | JWT 인증 | payload.roles → user.roles 직접 할당 (DB 쿼리 없음) |
| `requireAdmin` | 플랫폼 관리자 | admin, super_admin, operator, platform:admin, platform:super_admin 중 하나 |
| `requireRole(roles)` | 특정 역할 | roleAssignmentService.hasAnyRole() (DB 쿼리) |
| `requirePermission(perm)` | 특정 권한 | roleAssignmentService.hasPermission() (DB 쿼리) |

### 2-2. 서비스 Scope Guard

팩토리: `createMembershipScopeGuard(CONFIG)` → `require{Service}Scope(scope)`

| 서비스 | Guard | 플랫폼 Bypass | Role Mapping |
|--------|-------|:---:|------|
| **Neture** | `requireNetureScope` | ✅ | 계층적: operator ⊃ admin, supplier ⊃ admin, partner ⊃ admin |
| **GlycoPharm** | `requireGlycopharmScope` | ✅ | 플랫 |
| **GlucoseView** | `requireGlucoseViewScope` | ✅ | 계층적: operator ⊃ admin |
| **K-Cosmetics** | `requireCosmeticsScope` | ✅ | 계층적: operator ⊃ admin |
| **KPA** | `requireKpaScope` | ❌ | 플랫 |

### 2-3. Guard 흐름

```
Request
  → requireAuth (JWT 검증, user.roles = payload.roles)
  → require{Service}Scope('{service}:{role}')
    → platform:super_admin bypass? (서비스별 설정)
    → 서비스 접두사 교차 차단 (kpa:admin → neture 접근 불가)
    → membership 검증 (JWT memberships에서 serviceKey 확인)
    → scope role mapping 적용
  → Controller
```

---

## 3. 서비스별 Admin/Operator 분리 구조

### 3-1. 분리 패턴 비교

| 서비스 | Admin Layout | Operator Layout | 분리 방식 |
|--------|:---:|:---:|------|
| **Neture** | ✅ 독립 | ✅ 독립 | **완전 분리** — 별도 Layout, Route, Sidebar |
| **K-Cosmetics** | ✅ 공유 | ✅ 공유 | **공유 Layout** — DashboardLayout(role="admin"/"operator") |
| **GlycoPharm** | ✅ 독립 | ✅ 독립 | **분리** — 별도 Route, 공유 Layout |
| **GlucoseView** | ❌ 없음 | ✅ 독립 | **Operator만** — Admin 별도 UI 없음 |
| **KPA** | ✅ 독립 | ✅ 독립 | **다중 분리** — Admin + Operator + Branch Admin + Branch Operator |

### 3-2. Route 접두사 비교

| 서비스 | Operator 경로 | Admin 경로 |
|--------|-------------|-----------|
| **Neture** | `/workspace/operator/*` | `/workspace/admin/*` |
| **K-Cosmetics** | `/operator/*` | `/admin/*` |
| **GlycoPharm** | `/operator/*` | `/admin/*` |
| **GlucoseView** | `/operator/*` | — |
| **KPA** | `/operator/*` | `/demo/admin/*` + `/branch-services/:id/admin/*` |

### 3-3. Frontend Role Guard 비교

| 서비스 | Operator Guard | Admin Guard |
|--------|---------------|-------------|
| **Neture** | `ProtectedRoute allowedRoles={['admin','operator']}` | `ProtectedRoute allowedRoles={['admin']}` |
| **K-Cosmetics** | `ProtectedRoute allowedRoles={['admin','operator']}` | `ProtectedRoute allowedRoles={['admin']}` |
| **GlycoPharm** | `ProtectedRoute allowedRoles={['admin','operator']}` | `ProtectedRoute allowedRoles={['admin']}` |
| **GlucoseView** | `RoleGuard roles={['admin','operator']}` | — |
| **KPA** | `RoleGuard allowedRoles={['kpa:admin','kpa:operator']}` | `RoleGuard allowedRoles={['kpa:admin']}` |

---

## 4. Operator 메뉴 구조 비교

### 4-1. Neture Operator Sidebar (8그룹)

| 그룹 | 메뉴 항목 |
|------|----------|
| **Dashboard** | 대시보드 |
| **Approvals** | 등록 승인 |
| **Products** | 공급 현황 |
| **Content** | 홈페이지 CMS |
| **Signage** | HQ 미디어, HQ 플레이리스트, 템플릿 |
| **Forum** | 포럼 관리 |
| **Analytics** | AI 리포트, AI 카드 리포트, AI 운영, Asset 품질 |
| **System** | 알림 설정 |

### 4-2. GlycoPharm Operator Sidebar (11그룹)

| 그룹 | 메뉴 항목 |
|------|----------|
| **Dashboard** | 대시보드 |
| **Users** | 회원 관리 |
| **Approvals** | 신청 관리, 매장 승인 |
| **Products** | 상품 관리 |
| **Stores** | 매장 관리, 매장 템플릿 |
| **Orders** | 주문 관리 |
| **Finance** | 정산 관리, 청구 리포트, 청구 미리보기, 인보이스 |
| **Signage** | HQ 미디어, HQ 플레이리스트, 템플릿, 콘텐츠 허브, 콘텐츠 라이브러리, 내 사이니지 |
| **Forum** | 포럼 관리, 포럼 신청, 커뮤니티 관리 |
| **Analytics** | AI 리포트 |
| (없음) | 약국 관리 (메뉴 누락), 설정 (메뉴 누락) |

### 4-3. K-Cosmetics Operator Sidebar

| 그룹 | 메뉴 항목 |
|------|----------|
| **Dashboard** | 대시보드 |
| **Approvals** | 신청 관리 |
| **Products** | 상품 관리 |
| **Stores** | 매장 관리, Store Cockpit |
| **Orders** | 주문 관리 |
| **Signage** | 콘텐츠 허브, HQ 미디어, HQ 플레이리스트, 템플릿 |
| **Users** | 회원 관리 |
| **Community** | 커뮤니티 관리 |
| **Analytics** | AI 리포트 |

### 4-4. GlucoseView Operator Nav (6항목, 수평)

| # | 메뉴 |
|:-:|------|
| 1 | 대시보드 |
| 2 | 회원 관리 |
| 3 | 신청 관리 |
| 4 | 상품 관리 |
| 5 | 매장 관리 |
| 6 | AI 리포트 |

### 4-5. KPA Operator Sidebar (9그룹)

| 그룹 | 메뉴 항목 |
|------|----------|
| **Dashboard** | 대시보드 |
| **Users** | 회원 관리, 조직 가입 요청, 약국 서비스 신청 |
| **Approvals** | 상품 신청 관리 |
| **Stores** | 매장 관리, 채널 관리 |
| **Content** | 공지사항, 자료실, 콘텐츠 관리 |
| **Signage** | 콘텐츠 허브, HQ 미디어, HQ 플레이리스트, 템플릿 |
| **Forum** | 커뮤니티 관리, 포럼 관리, 포럼 분석, 게시판 |
| **Analytics** | AI 리포트 |
| **System** | 법률 관리, 감사 로그, 운영자 관리 |

---

## 5. Admin 메뉴 구조 비교

### 5-1. Neture Admin Sidebar (8그룹)

| 그룹 | 메뉴 항목 |
|------|----------|
| **Overview** | 대시보드 |
| **Users** | 운영자, 연락 메시지 |
| **Approvals** | 공급자 승인, 공급자 목록 |
| **Products** | 상품 승인, Product Master, 카탈로그 Import |
| **Finance** | 파트너 목록, 파트너 정산, 정산 관리, 커미션 관리 |
| **Content** | 광고 & 스폰서 |
| **Analytics** | AI 대시보드, AI 카드 규칙, AI 비즈니스 팩 |
| **System** | 시스템 설정 |

### 5-2. K-Cosmetics Admin Sidebar

| 메뉴 | 경로 |
|------|------|
| 대시보드 | /admin |
| 매장 관리 | /admin/stores |
| 회원 관리 | /admin/users |
| 설정 | /admin/settings |

### 5-3. GlycoPharm Admin Dashboard (별도)

| 블록 | 내용 |
|------|------|
| Structure Snapshot | 등록 약국, 활성 스토어, 비활성 스토어, 등록 상품 |
| Policy Overview | 약국 승인, 채널 설정, 콘텐츠 템플릿 |
| Governance Alerts | 대기 승인, 보완 요청, 비활성 스토어 |
| Structure Actions | 약국 네트워크, 회원 관리, 설정 |

### 5-4. KPA Admin Sidebar (5그룹)

| 그룹 | 메뉴 항목 |
|------|----------|
| **Overview** | 대시보드, 플랫폼 운영 |
| **Users** | 회원 관리, 위원회 관리, Steward 관리 |
| **Approvals** | 분회 관리, 신상신고 |
| **Finance** | 연회비 |
| **System** | 임원 관리, 설정 |

---

## 6. Admin vs Operator 기능 분리 표준

### 6-1. 도출된 패턴

5개 서비스 분석 결과 다음 패턴이 확인됨:

| 역할 | 기능 범위 | 핵심 기능 |
|------|----------|----------|
| **Admin** | 구조/정책/거버넌스 | 승인 관리, 사용자 관리, 정산/금융, 시스템 설정 |
| **Operator** | 운영/콘텐츠/모니터링 | Dashboard, 콘텐츠 CRUD, 포럼 관리, 사이니지, AI 리포트 |

### 6-2. 기능별 역할 매핑 (플랫폼 기준)

| 기능 영역 | Admin | Operator | 비고 |
|----------|:-----:|:--------:|------|
| Dashboard (5-Block) | ✅ | ✅ | 별도 데이터 |
| 승인/거부 (Applications) | ✅ | ✅ | 서비스별 다름 |
| 사용자 관리 | ✅ | ✅ (조회) | Admin=CRUD, Operator=조회 |
| 상품 관리 | ✅ (승인) | ✅ (운영) | Admin=승인, Operator=목록/관리 |
| 매장 관리 | ✅ | ✅ | 동일 범위 |
| 정산/금융 | ✅ | ❌ | Admin 전용 |
| 시스템 설정 | ✅ | ❌ | Admin 전용 |
| 콘텐츠 CRUD | ❌ | ✅ | Operator 전용 |
| 사이니지 | ❌ | ✅ | Operator 전용 |
| 포럼 관리 | ❌ | ✅ | Operator 전용 |
| AI 리포트 | ✅ (설정) | ✅ (조회) | Admin=AI 설정, Operator=AI 리포트 |

### 6-3. Operator Sidebar 표준 Capability Group

5개 서비스를 종합한 결과 **Operator Sidebar 표준**:

```
1. Dashboard      — 대시보드
2. Users          — 회원 관리
3. Approvals      — 신청/승인 관리
4. Products       — 상품 관리
5. Stores         — 매장 관리
6. Orders         — 주문 관리 (해당 시)
7. Content        — 콘텐츠 관리
8. Signage        — 사이니지
9. Forum          — 포럼/커뮤니티
10. Analytics     — AI 리포트
11. System        — 설정/감사 로그
```

---

## 7. 서비스별 차이 요약

### 7-1. 구조 성숙도

| 서비스 | Admin | Operator | Scope Guard | Dashboard | 성숙도 |
|--------|:-----:|:--------:|:-----------:|:---------:|:------:|
| **Neture** | 8그룹 23+ routes | 8그룹 16 routes | ✅ 계층적 | 5-Block | ★★★★★ |
| **KPA** | 5그룹 10+ routes | 9그룹 20+ routes | ✅ 플랫 | 5-Block | ★★★★☆ |
| **GlycoPharm** | 4-Block 3 routes | 11그룹 32 routes | ✅ 플랫 | 5-Block | ★★★☆☆ |
| **K-Cosmetics** | 4항목 5 routes | 9그룹 20 routes | ✅ 계층적 | 5-Block | ★★★☆☆ |
| **GlucoseView** | ❌ 없음 | 6항목 10 routes | ✅ 계층적 | 5-Block | ★★☆☆☆ |

### 7-2. 주요 차이점

| 항목 | Neture | GlycoPharm | GlucoseView | K-Cosmetics | KPA |
|------|--------|-----------|-------------|-------------|-----|
| Layout 분리 | 완전 분리 | 분리 | Operator만 | 공유 (role 파라미터) | 완전 분리 (4개) |
| 메뉴 그룹 방식 | Capability Group | Capability Group | 플랫 | Capability Group | Capability Group |
| 메뉴 위치 | 좌측 사이드바 | 좌측 사이드바 | 상단 수평 바 | 좌측 사이드바 | 좌측 사이드바 |
| Scope Guard | 계층적 | 플랫 | 계층적 | 계층적 | 플랫 |
| Platform Bypass | ✅ | ✅ | ✅ | ✅ | ❌ |
| Finance 메뉴 | Admin | Operator | ❌ | ❌ | Admin |
| Care 시스템 | ❌ | ✅ (약국 레벨) | ✅ (환자 레벨) | ❌ | ❌ |

---

## 8. Dashboard 데이터 소스 비교

### 8-1. Operator Dashboard KPI 비교

| KPI | Neture | GlycoPharm | GlucoseView | K-Cosmetics | KPA |
|-----|--------|-----------|-------------|-------------|-----|
| 활성 조직/약국 | ✅ | ✅ | ✅ | ✅ stores | ✅ |
| 공급자/파트너 | ✅ suppliers | ❌ | ❌ | ❌ | ❌ |
| 상품 수 | ✅ offers | ✅ products | ❌ | ✅ products | ❌ |
| 주문 통계 | ✅ orders | ❌ STUB | ❌ | ✅ orders | ❌ |
| 매출 | ✅ revenue | ❌ | ❌ | ✅ revenue | ❌ |
| 대기 신청 | ✅ | ✅ | ✅ | ❌ | ✅ |
| CMS 콘텐츠 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 약사/환자 | ❌ | ❌ | ✅ | ❌ | ❌ |
| 벤더 | ❌ | ❌ | ✅ | ❌ | ❌ |
| 포럼 | ❌ | ❌ | ❌ | ❌ | ✅ |
| AI Summary | ✅ CopilotEngine | ✅ CopilotEngine | ✅ CopilotEngine | ✅ CopilotEngine | ✅ Client-side |

### 8-2. Dashboard API 패턴

모든 서비스가 동일한 5-Block 패턴 사용:

```typescript
GET /api/v1/{service}/operator/dashboard
→ { kpis, aiSummary, actionQueue, activityLog, quickActions }
```

프론트엔드: `OperatorDashboardLayout` 컴포넌트 (`@o4o/operator-ux-core`)

---

## 9. 구조 문제 정리

### 9-1. 불일치 항목

| # | 문제 | 서비스 | 설명 |
|:-:|------|--------|------|
| 1 | **Admin UI 없음** | GlucoseView | Admin 전용 레이아웃/메뉴 미존재 |
| 2 | **메뉴 형태 불일치** | GlucoseView | 상단 수평 바 (다른 서비스: 좌측 사이드바) |
| 3 | **메뉴 누락** | GlycoPharm | 약국 관리, 설정 메뉴 없음 (페이지 존재) |
| 4 | **Admin Dashboard 비표준** | GlycoPharm | 4-Block (표준: 5-Block) |
| 5 | **Scope Guard 불일치** | GlycoPharm | 플랫 (다른 서비스: 계층적) |
| 6 | **Finance 위치 불일치** | GlycoPharm | Operator 메뉴에 배치 (표준: Admin) |
| 7 | **Guard 패턴 혼재** | GlycoPharm + GlucoseView | isOperatorOrAdmin 인라인 + Scope Guard 혼용 |
| 8 | **Route 접두사 불일치** | Neture | `/workspace/operator` (다른 서비스: `/operator`) |
| 9 | **KPA aiSummary 생성** | KPA | Client-side push() (다른 서비스: CopilotEngine) |

### 9-2. 심각도 분류

| 심각도 | 항목 |
|:------:|------|
| **HIGH** | #1 GlucoseView Admin UI 없음, #7 Guard 혼재 |
| **MEDIUM** | #2 메뉴 형태 불일치, #3 메뉴 누락, #4 Admin 4-Block, #6 Finance 위치 |
| **LOW** | #5 Scope Guard 플랫, #8 Route 접두사, #9 KPA aiSummary |

---

## 10. 플랫폼 표준 도출

### 10-1. Admin / Operator 역할 표준

```
Admin = 구조 + 정책 + 거버넌스 + 금융
  → 승인 관리, 사용자 CRUD, 정산/커미션, 시스템 설정

Operator = 운영 + 콘텐츠 + 모니터링
  → Dashboard, 콘텐츠 CRUD, 사이니지, 포럼, AI 리포트
  → Admin 기능에도 접근 가능 (Admin ⊂ Operator scope mapping)
```

### 10-2. Guard 표준

```
Backend:
  requireAuth → require{Service}Scope('{service}:{role}')

Frontend:
  ProtectedRoute allowedRoles={['{service}:{role}']}
  또는 RoleGuard allowedRoles={['{service}:{role}']}
```

### 10-3. Sidebar 표준

```
방식: 좌측 사이드바 + Capability Group (접이식)
그룹: 11-Capability 표준 (서비스에 따라 일부 생략)
```

### 10-4. Dashboard 표준

```
형식: 5-Block (KPI + AI Summary + Action Queue + Activity Log + Quick Actions)
API: GET /api/v1/{service}/operator/dashboard
컴포넌트: OperatorDashboardLayout (@o4o/operator-ux-core)
AI: CopilotEngineService.generateInsights() (Backend)
```

---

## 11. 정비 권고

| 우선순위 | 대상 | 작업 |
|:--------:|------|------|
| **P0** | GlucoseView | 수평 바 → 좌측 사이드바 + Capability Group 전환 |
| **P1** | GlycoPharm | 약국 관리, 설정 메뉴 추가 |
| **P1** | GlycoPharm | Admin Dashboard 4-Block → 5-Block |
| **P1** | GlycoPharm + GlucoseView | Guard 패턴 통일 (Scope Guard 단일) |
| **P2** | GlycoPharm | Finance 메뉴 Admin으로 이동 검토 |
| **P2** | GlycoPharm | Scope Guard 계층적으로 전환 |
| **P3** | KPA | aiSummary Client-side → CopilotEngine Backend 통합 |

---

*Generated: 2026-03-16*
*Investigation: READ-ONLY (코드 수정 없음)*
