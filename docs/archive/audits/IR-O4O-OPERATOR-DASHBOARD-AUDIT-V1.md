# IR-O4O-OPERATOR-DASHBOARD-AUDIT-V1

> **O4O Platform Admin / Operator Dashboard 구현 상태 조사 보고서**
> Date: 2026-03-15
> Status: Investigation Complete

---

## 1. 역할 구조 (Role Structure)

### 1.1 역할 우선순위 (ROLE_PRIORITY)

```
admin > operator > supplier > partner > seller > pharmacy > consumer > user
```

### 1.2 서비스별 역할 체계

| Service | Admin Role | Operator Role | 기타 Role |
|---------|-----------|--------------|----------|
| **Neture** | `neture:admin` | `neture:operator` | `neture:supplier`, `neture:partner` |
| **GlycoPharm** | `glycopharm:admin` | `glycopharm:operator` | — |
| **KPA Society** | `kpa:admin` | `kpa:operator` | `kpa:branch_admin`, `kpa:branch_operator` |
| **K-Cosmetics** | `cosmetics:admin` | `cosmetics:operator` | — |
| **Platform** | `platform:admin` | `platform:operator` | `platform:super_admin` |

### 1.3 RBAC 구조

- **role_assignments** 테이블: SSOT (Single Source of Truth)
  - `(user_id, role, is_active)` unique constraint
  - `scope_type`: `global` | `organization`
  - `valid_from` / `valid_until`: 시간 기반 역할 유효성
- **service_memberships** 테이블: 서비스 접근 제어
  - `(user_id, service_key)` unique constraint
  - `status`: `pending` | `active` | `suspended` | `rejected`
  - 서비스별 key: `neture`, `glycopharm`, `kpa-society`, `k-cosmetics`, `glucoseview`

### 1.4 인증 미들웨어 체인

```
Layer 1: requireAuth            → JWT 검증 + user 조회
Layer 2: requireServiceScope()  → 서비스별 역할 검증 (neture:operator 등)
Layer 3: requireOrgRole()       → 조직 수준 역할 (KPA branch만)
```

### 1.5 Scope Guard 설정

| Service | platformBypass | blockedPrefixes |
|---------|:-------------:|-----------------|
| Neture | YES | kpa, glycopharm, cosmetics, glucoseview |
| GlycoPharm | YES | kpa, neture, cosmetics |
| KPA | NO | platform, neture, glycopharm, cosmetics, glucoseview |
| K-Cosmetics | YES | kpa, neture, glycopharm |

**결론**: 역할 분리 구조는 정상. 서비스 간 교차 접근 차단 동작.

---

## 2. 로그인 후 대시보드 라우팅

### 2.1 기본 라우팅 맵 (ROLE_DASHBOARD_MAP)

```typescript
admin      → /admin
operator   → /operator
supplier   → /supplier
partner    → /partner
seller     → /seller
pharmacy   → /care
consumer   → /
user       → /
```

### 2.2 서비스별 라우팅 오버라이드

| Service | Admin Route | Operator Route | 분리 여부 | 특이 사항 |
|---------|-----------|---------------|:--------:|----------|
| **Neture** | `/workspace/admin` | `/workspace/operator` | **YES** | ROUTE_OVERRIDES 사용 |
| **GlycoPharm** | `/admin` | `/admin` | **NO** | `{ operator: '/admin' }` — 동일 경로, 내부 역할 분기 |
| **KPA Society** | `/operator` | `/operator` | **부분** | `getDefaultRouteByRole()` 커스텀 로직, branch별 분리 |
| **K-Cosmetics** | `/admin` | `/operator` | **YES** | 표준 매핑 사용 |

### 2.3 문제점

| # | 문제 | 서비스 | 상세 |
|---|------|--------|------|
| R1 | Admin/Operator 동일 경로 | GlycoPharm | 둘 다 `/admin`으로 이동, AdminIndexRedirect에서 내부 분기 |
| R2 | Admin이 `/operator`로 이동 | KPA | platform role admin도 `/operator`로 이동 (getDefaultRouteByRole) |

---

## 3. Admin Dashboard 기능 조사

### 3.1 Neture Admin (`/workspace/admin`)

**Frontend 메뉴: 27개 라우트, 8개 그룹**

| 그룹 | 메뉴 항목 | Backend API 존재 | 상태 |
|------|----------|:---------------:|:----:|
| 대시보드 | 대시보드 | YES (`GET /admin/dashboard/summary`) | OK |
| 사용자 관리 | 운영자 | YES (공유 admin API) | OK |
| | 문의 메시지 | YES (contact controller) | OK |
| 공급자 관리 | 공급자 승인 | YES (`/admin/suppliers/pending`) | OK |
| | 공급자 목록 | YES (`/admin/suppliers`) | OK |
| 상품 관리 | 상품 승인 | YES (`/admin/products/pending`) | OK |
| | Product Masters | YES (`/admin/masters`) | OK |
| | 카탈로그 Import | YES (catalog controller) | OK |
| 파트너 관리 | 파트너 목록 | YES (`/admin/partners`) | OK |
| | 파트너 정산 | YES (`/admin/partner-settlements`) | OK |
| 주문·정산 | 정산 관리 | YES (settlement controller) | OK |
| | 수수료 관리 | YES (commission controller) | OK |
| 커뮤니티 | 광고·스폰서 | YES (community hub controller) | OK |
| AI 관리 | AI 대시보드 | YES (AI controller) | OK |
| | AI 카드 규칙 | YES (AI card rules) | OK |
| | AI 비즈니스 팩 | YES (AI business pack) | OK |
| 시스템 설정 | 이메일 설정 | YES (settings) | OK |

**평가**: 메뉴-기능 일치 양호. Backend API 모두 존재.

### 3.2 GlycoPharm Admin (`/admin`)

**Frontend 메뉴: 4개 항목**

| 메뉴 항목 | Backend API | 상태 |
|----------|:-----------:|:----:|
| 대시보드 | YES (GlycoPharmAdminDashboard) | OK |
| 약국 네트워크 | YES (pharmacy controller) | OK |
| 회원 관리 | YES (applications/admin) | OK |
| 설정 | 미확인 | WARN |

**평가**: Admin 메뉴 **매우 단순** (4개). Operator 메뉴(23개)에 비해 관리 기능 부족.

### 3.3 KPA Admin (`/admin`)

**Frontend 메뉴: 9개 항목**

| 메뉴 항목 | Backend API | 상태 |
|----------|:-----------:|:----:|
| 대시보드 | YES (`/admin/dashboard/stats`) | OK |
| 플랫폼 운영 | YES (platform dashboard) | OK |
| 분회 관리 | YES (organization API) | OK |
| 회원 관리 | YES (membership API) | OK |
| 위원회 관리 | YES (committee requests) | OK |
| 신상신고 | YES (annual report) | OK |
| 연회비 | YES (fee management) | OK |
| 임원 관리 | YES (officers API) | OK |
| 설정 | YES (settings) | OK |

**평가**: Admin 기능 적절.

### 3.4 K-Cosmetics Admin (`/admin`)

**Frontend 메뉴: 4개 항목**

| 메뉴 항목 | Backend API | 상태 |
|----------|:-----------:|:----:|
| 대시보드 | YES | OK |
| 매장 네트워크 | YES (store controller) | OK |
| 회원 관리 | YES (user management) | OK |
| 설정 | 미확인 | WARN |

**평가**: Admin 메뉴 **매우 단순** (4개). GlycoPharm과 동일 패턴.

---

## 4. Operator Dashboard 기능 조사

### 4.1 Neture Operator (`/workspace/operator`)

**Frontend 메뉴: 10개 라우트, 6개 그룹**

| 그룹 | 메뉴 항목 | Backend API | 상태 |
|------|----------|:-----------:|:----:|
| 대시보드 | 대시보드 | YES | OK |
| 가입 관리 | 가입 승인 | YES (`/operator/registrations`) | OK |
| 공급 운영 | 공급 현황 | YES | OK |
| 콘텐츠 관리 | 사이니지 | YES (signage API) | OK |
| | 홈페이지 CMS | YES (CMS API) | OK |
| | 포럼 관리 | YES (forum API) | OK |
| AI 운영 | AI 리포트 | YES | OK |
| | AI 카드 리포트 | YES | OK |
| | AI 운영 | YES | OK |
| | Asset Quality | YES | OK |
| 설정 | 알림 설정 | YES | OK |

**평가**: Operator 기능 적절. Backend 모두 구현.

### 4.2 GlycoPharm Operator (`/admin` — Admin과 동일 경로)

**Frontend 메뉴: 23개 항목**

| 메뉴 항목 | Backend API | 상태 |
|----------|:-----------:|:----:|
| 대시보드 | YES (`/operator/dashboard`) | OK |
| 신청 관리 | YES (applications) | OK |
| 상품 관리 | YES (products) | OK |
| 주문 관리 | PARTIAL (legacy deprecated) | WARN |
| 재고/공급 | PARTIAL | WARN |
| 정산 관리 | YES | OK |
| 분석/리포트 | YES | OK |
| 청구 리포트 | YES | OK |
| 청구 미리보기 | YES | OK |
| 인보이스 | YES | OK |
| 마케팅 | YES | OK |
| 포럼 신청 | YES | OK |
| 포럼 관리 | YES (forum API) | OK |
| Trial 관리 | YES | OK |
| 콘텐츠 허브 | YES (signage) | OK |
| 콘텐츠 라이브러리 | YES (signage) | OK |
| 내 사이니지 | YES (signage) | OK |
| HQ 미디어 | YES (signage) | OK |
| HQ 플레이리스트 | YES (signage) | OK |
| 템플릿 | YES (signage) | OK |
| 고객지원 | 미확인 | WARN |
| AI 리포트 | YES | OK |
| 회원 관리 | YES | OK |

**평가**: Operator 메뉴 풍부(23개)하나, Admin(4개)보다 기능이 더 많은 **역전 현상** 발생.

### 4.3 KPA Operator

**4.3.1 Platform Operator** (`/operator`) — 5-Block Dashboard

| Block | 기능 | Backend API | 상태 |
|-------|------|:-----------:|:----:|
| Block 1 | KPI Summary | YES (`/operator/summary`) | OK |
| Block 2 | 콘텐츠 관리 | YES (CMS API) | OK |
| Block 3 | 사이니지 | YES (signage API) | OK |
| Block 4 | 포럼 관리 | YES (forum API) | OK |
| Block 5 | LMS/교육 | YES (LMS API) | OK |

**4.3.2 Branch Operator** (`/branch-services/:id/operator`)

| 메뉴 항목 | Backend API | 상태 |
|----------|:-----------:|:----:|
| 대시보드 | YES | OK |
| 공지사항 | YES | OK |
| 게시판 | YES | OK |
| 자료실 | YES | OK |
| 포럼 관리 | YES | OK |
| 콘텐츠 허브 | YES | OK |
| 운영자 관리 | YES | OK |

**평가**: Platform/Branch 분리 구조 적절.

### 4.4 K-Cosmetics Operator (`/operator`)

**Frontend 메뉴: 16개 항목**

| 메뉴 항목 | Backend API | 상태 |
|----------|:-----------:|:----:|
| 대시보드 | YES | OK |
| 내 매장 | YES (store-cockpit) | OK |
| 신청 관리 | YES | OK |
| 상품 관리 | YES | OK |
| 주문 관리 | YES | OK |
| 재고/공급 | YES | OK |
| 정산 관리 | YES | OK |
| 분석/리포트 | YES | OK |
| 마케팅 | YES | OK |
| 사이니지 콘텐츠 | YES (signage) | OK |
| HQ 미디어 | YES (signage) | OK |
| HQ 플레이리스트 | YES (signage) | OK |
| 템플릿 | YES (signage) | OK |
| 고객지원 | 미확인 | WARN |
| AI 리포트 | YES | OK |
| 회원 관리 | YES | OK |

**평가**: Admin(4개) 대비 Operator(16개) 기능 역전. GlycoPharm과 동일 패턴.

---

## 5. 서비스별 대시보드 차이

### 5.1 구조 패턴 분류

| 패턴 | 서비스 | 설명 |
|------|--------|------|
| **A. 완전 분리** | Neture | Admin/Operator 별도 Layout + 별도 Route |
| **B. 통합 (역할 분기)** | GlycoPharm | 동일 Route(`/admin`), 내부 역할 분기 |
| **C. 분리 (계층적)** | KPA | Platform/Branch × Admin/Operator 4단 분리 |
| **D. 분리 (표준)** | K-Cosmetics | 별도 Route(`/admin` vs `/operator`), 동일 Layout |

### 5.2 기능 커버리지 비교

| 기능 영역 | Neture | GlycoPharm | KPA | K-Cosmetics |
|----------|:------:|:----------:|:---:|:-----------:|
| 사용자 관리 | Admin | Operator | Admin | Operator |
| 상품 관리 | Admin | Operator | — | Operator |
| 주문 관리 | Admin | Operator | — | Operator |
| 정산 관리 | Admin | Operator | — | Operator |
| 콘텐츠/CMS | Operator | Operator | Operator | Operator |
| 사이니지 | Operator | Operator | Operator | Operator |
| 포럼 관리 | Operator | Operator | Operator | — |
| AI 관리 | Admin+Oper | Operator | — | Operator |
| 가입 승인 | Operator | Admin | Admin | — |
| 공급자 관리 | Admin | — | — | — |
| 파트너 관리 | Admin | — | — | — |

---

## 6. 메뉴-기능 불일치 (Mismatch)

### 6.1 메뉴 있음 → 기능 없음 (또는 미확인)

| # | 서비스 | 메뉴 항목 | 문제 |
|---|--------|----------|------|
| M1 | GlycoPharm Operator | 주문 관리 | Backend deprecated ("Phase 4-A: Legacy deprecated, returns empty") |
| M2 | GlycoPharm Operator | 재고/공급 | Backend 부분 구현 |
| M3 | GlycoPharm Operator | 고객지원 | Backend 미확인 |
| M4 | GlycoPharm Admin | 설정 | Backend 미확인 |
| M5 | K-Cosmetics Operator | 고객지원 | Backend 미확인 |
| M6 | K-Cosmetics Admin | 설정 | Backend 미확인 |

### 6.2 기능 있음 → 메뉴 없음

| # | 서비스 | Backend API | Frontend 메뉴 |
|---|--------|-----------|--------------|
| M7 | GlycoPharm | `POST /admin/products/activate-all` | 없음 (일회성 마이그레이션) |
| M8 | Neture | `GET /admin/dashboard/partner-kpi` | Admin 대시보드에 포함 |

---

## 7. Admin vs Operator 권한 차이

### 7.1 정상 분리

| 서비스 | Admin 전용 | Operator 전용 | 공통 |
|--------|-----------|-------------|------|
| **Neture** | 공급자 승인/관리, 상품 승인, 파트너 관리, 주문/정산, 수수료, 커뮤니티 광고 | 가입 승인, 사이니지, CMS, 포럼, 공급 현황 | AI 관리, 대시보드 |

### 7.2 권한 역전 (Operator > Admin)

| # | 서비스 | Admin 메뉴 | Operator 메뉴 | 문제 |
|---|--------|-----------|-------------|------|
| P1 | **GlycoPharm** | 4개 | 23개 | Operator가 Admin보다 19개 더 많음 |
| P2 | **K-Cosmetics** | 4개 | 16개 | Operator가 Admin보다 12개 더 많음 |

**원인 분석**: GlycoPharm/K-Cosmetics에서 Admin은 "플랫폼 전체 관리자" 개념이고, Operator가 "실질적 서비스 운영자"로 설계됨. Admin 메뉴가 사실상 placeholder 수준.

### 7.3 권한 중복

| # | 서비스 | 기능 | Admin | Operator | 문제 |
|---|--------|------|:-----:|:--------:|------|
| P3 | GlycoPharm | 회원 관리 | YES | YES | 양쪽 모두 존재 |
| P4 | K-Cosmetics | 회원 관리 | YES | YES | 양쪽 모두 존재 |

---

## 8. 종합 발견 사항 및 정비 필요 항목

### 8.1 Critical (즉시 정비)

| # | 항목 | 서비스 | 설명 |
|---|------|--------|------|
| C1 | Admin/Operator 기능 역전 | GlycoPharm, K-Cosmetics | Admin(4개) < Operator(23/16개). Admin이 사실상 빈 껍데기 |
| C2 | 동일 경로 공유 | GlycoPharm | Admin/Operator 모두 `/admin`으로 라우팅 — 역할 혼동 가능 |

### 8.2 Important (차기 정비)

| # | 항목 | 서비스 | 설명 |
|---|------|--------|------|
| I1 | Deprecated 메뉴 | GlycoPharm | "주문 관리" 메뉴 존재하나 Backend deprecated |
| I2 | 미확인 Backend | GlycoPharm, K-Cosmetics | "고객지원", "설정" 메뉴의 Backend 연결 불확실 |
| I3 | KPA Admin 라우팅 | KPA | Platform admin도 `/operator`로 이동 |

### 8.3 Nice to Have (개선)

| # | 항목 | 서비스 | 설명 |
|---|------|--------|------|
| N1 | Layout 패턴 통일 | 전체 | 4가지 다른 패턴 사용 중 (완전분리/통합/계층/표준) |
| N2 | Icon 체계 통일 | 전체 | lucide-react(Neture), inline SVG(K-Cosmetics), emoji(KPA) 혼재 |
| N3 | Sidebar 구조 통일 | 전체 | 260px 고정은 동일하나 내부 구조 서비스마다 다름 |

---

## 9. 다음 단계 권장

### WO-O4O-ADMIN-DASHBOARD-REFINE

GlycoPharm/K-Cosmetics Admin 대시보드 기능 보강:
- Admin에 "플랫폼 관리" 고유 기능 추가 (또는)
- Admin → Operator 역할 통합 검토

### WO-O4O-OPERATOR-DASHBOARD-REFINE

각 서비스 Operator 대시보드 정비:
- Deprecated 메뉴 제거 (GlycoPharm 주문 관리)
- 미구현 기능 메뉴 제거 또는 구현
- Backend 미연결 메뉴 연결 확인

### WO-O4O-DASHBOARD-ROUTING-NORMALIZE

- GlycoPharm: Admin/Operator 라우트 분리 (`/admin` vs `/operator`)
- KPA: Platform Admin 라우팅 정상화

---

*End of IR-O4O-OPERATOR-DASHBOARD-AUDIT-V1*
