# IR-O4O-NETURE-ADMIN-PARTNER-DASHBOARD-AUDIT

> **Investigation Request**: Admin Dashboard → Partner 관리 연결 상태 감사
> **Status**: COMPLETE
> **Date**: 2026-03-14
> **Scope**: Admin Navigation · Admin Dashboard KPI · Partner Monitoring · Commission Management · Settlement Management

---

## 1. Executive Summary

Admin Dashboard의 Partner 관리 영역을 전수 조사한 결과, **운영 기능은 완전히 구현**되어 있으나 **Dashboard KPI에 Partner 실적 지표가 부족**한 것으로 확인되었다.

| 영역 | 판정 | 비고 |
|------|------|------|
| Admin Sidebar Navigation | **PASS** | 파트너 관리 그룹 (2 항목) + 주문·정산 그룹 (수수료 관리) |
| Partner Monitoring Page | **PASS** | KPI 4장 + 검색 + 페이지네이션 + 상세 링크 |
| Partner Detail Page | **PASS** | 파트너 요약 + 최근 커미션 20건 + 정산 링크 |
| Commission Management Page | **PASS** | 기간별 계산 + 승인/지급/취소 + 상태 필터 + 확장 상세 |
| Partner Settlement Page | **PASS** | 정산 배치 생성 + 지급 + 상태 필터 + 확장 상세 |
| Dashboard KPI (Partner 지표) | **PARTIAL** | 파트너십 요청 수만 표시. 커미션/정산 금액 미표시 |

---

## 2. Admin Sidebar Navigation

**File**: `services/web-neture/src/components/layouts/AdminLayout.tsx`
**Work Order**: WO-O4O-NETURE-ADMIN-NAV-V1

### 2.1 파트너 관련 메뉴 항목

| Sidebar 그룹 | 메뉴 항목 | 경로 | 연결 페이지 |
|--------------|----------|------|------------|
| **파트너 관리** (Handshake) | 파트너 목록 | `/workspace/admin/partners` | AdminPartnerMonitoringPage |
| **파트너 관리** (Handshake) | 파트너 정산 | `/workspace/admin/partner-settlements` | AdminPartnerSettlementsPage |
| **주문·정산** (ShoppingCart) | 수수료 관리 | `/workspace/admin/commissions` | AdminCommissionsPage |

### 2.2 판정: **PASS**

- 3개 Partner 관련 페이지 모두 Sidebar에서 접근 가능
- Collapsible 그룹 구조로 논리적 분류 완료
- 활성 라우트 자동 펼침 동작 정상

---

## 3. Admin Dashboard KPI

**File**: `services/web-neture/src/pages/admin/AdminDashboardPage.tsx`
**Work Order**: WO-O4O-ADMIN-UX-NETURE-PILOT-V1

### 3.1 4-Block 구조

| Block | 이름 | Partner 관련 콘텐츠 |
|-------|------|---------------------|
| **A** Structure Snapshot | 4개 KPI 카드 | `파트너십 요청` 수 (totalPartnershipRequests) |
| **B** Policy Overview | 3개 정책 상태 | Partner 정책 없음 |
| **C** Governance Alerts | 동적 경고 | `미처리 파트너십 요청 N건` (openPartnershipRequests > 0) |
| **D** Structure Actions | 6개 바로가기 | `파트너 관리` → `/admin/partners` |

### 3.2 현재 표시되는 Partner 지표

```
Block A: 파트너십 요청 — totalPartnershipRequests (수만 표시)
Block C: 미처리 파트너십 요청 경고 — openPartnershipRequests > 0일 때 info 레벨
Block D: 파트너 관리 바로가기 — /admin/partners
```

### 3.3 누락된 Partner 지표

| 지표 | 현재 | 필요성 |
|------|------|--------|
| 활성 파트너 수 | ❌ 미표시 | 높음 — 파트너 네트워크 규모 파악 |
| 커미션 대기 금액 | ❌ 미표시 | 높음 — 미처리 금액 모니터링 |
| 커미션 지급 완료 금액 | ❌ 미표시 | 중간 — 월간 지급 현황 |
| 정산 대기 건수 | ❌ 미표시 | 중간 — 정산 처리 필요 알림 |
| 파트너 매출 기여도 | ❌ 미표시 | 낮음 — 중장기 분석 |

### 3.4 판정: **PARTIAL**

Dashboard는 Partner "요청 수"만 표시하고, 운영에 핵심적인 **커미션/정산 금액**은 전용 페이지에서만 확인 가능하다. Dashboard에서 Partner 실적을 한눈에 파악할 수 없는 상태.

---

## 4. Partner Monitoring Page

**File**: `services/web-neture/src/pages/admin/AdminPartnerMonitoringPage.tsx`
**Route**: `/workspace/admin/partners`
**Work Order**: WO-O4O-ADMIN-PARTNER-MONITORING-V1

### 4.1 KPI 카드 (4장)

| 카드 | 아이콘 | 색상 | 데이터 소스 |
|------|--------|------|------------|
| Total Partners | Users | blue | `kpi.total_partners` |
| Total Commission | TrendingUp | green | `kpi.total_commission` |
| Pending Payment | Clock | orange | `kpi.total_payable` |
| Paid | CheckCircle | purple | `kpi.total_paid` |

### 4.2 파트너 목록 테이블

| 컬럼 | 설명 |
|------|------|
| 파트너명 | partner name |
| 이메일 | email |
| 주문수 | orders count |
| 총 커미션 | 총 커미션 금액 |
| 지급 대기 | 지급 대기 금액 (orange) |
| 지급 완료 | 지급 완료 금액 (green) |
| 상세 | Eye 아이콘 → `/workspace/admin/partners/:id` |

### 4.3 기능

- ✅ 이름/이메일 검색
- ✅ 페이지네이션 (20건/페이지)
- ✅ KPI 실시간 집계
- ✅ 상세 페이지 링크

### 4.4 API

```
GET /api/v1/neture/admin/partners?page=X&limit=20&search=TERM
→ { data: PartnerMonitoringItem[], meta: PaginationMeta, kpi: PartnerMonitoringKpi }
```

### 4.5 판정: **PASS**

---

## 5. Partner Detail Page

**File**: `services/web-neture/src/pages/admin/AdminPartnerDetailPage.tsx`
**Route**: `/workspace/admin/partners/:id`
**Work Order**: WO-O4O-ADMIN-PARTNER-MONITORING-V1

### 5.1 구성

| 섹션 | 내용 |
|------|------|
| 헤더 | 뒤로가기 + 아바타 + 파트너명 + 이메일 |
| KPI 카드 (4장) | 주문수 · 총 커미션 · 지급 대기 · 지급 완료 |
| 최근 커미션 | 최대 20건, 테이블 (주문번호/상품명/매장명/커미션금액/상태/일자) |
| 정산 링크 | "정산 관리 →" 버튼 → `/workspace/admin/partner-settlements` |

### 5.2 커미션 상태 뱃지

| Status | Label | 색상 |
|--------|-------|------|
| pending | 대기 | amber (#d97706) |
| approved | 승인 | blue (#2563eb) |
| paid | 지급완료 | green (#059669) |
| rejected | 반려 | red (#dc2626) |

### 5.3 API

```
GET /api/v1/neture/admin/partners/:id
→ { partner_id, name, email, orders, commission, payable, paid, commissions[] }
```

### 5.4 참고: 커미션 액션 없음

Detail 페이지에서는 커미션 **조회만** 가능. 승인/지급/취소 액션은 수수료 관리 페이지(`/workspace/admin/commissions`)에서 수행.
→ "정산 관리 →" 링크로 연결

### 5.5 판정: **PASS**

---

## 6. Commission Management Page

**File**: `services/web-neture/src/pages/admin/AdminCommissionsPage.tsx`
**Route**: `/workspace/admin/commissions`
**Work Order**: WO-O4O-PARTNER-COMMISSION-ENGINE-V1

### 6.1 KPI 카드 (3장)

| 카드 | 색상 | 금액 | 건수 |
|------|------|------|------|
| 대기 | amber | `pending_amount` | `pending_count` |
| 승인완료 | indigo | `approved_amount` | `approved_count` |
| 지급완료 | green | `paid_amount` | `paid_count` |

### 6.2 커미션 계산

```
[기간 시작 date] ~ [기간 종료 date] → [커미션 계산] 버튼
POST /api/v1/neture/admin/commissions/calculate
→ { success: true, data: { created: N } }
```

### 6.3 상태 필터 탭

| 탭 | 값 |
|----|-----|
| 전체 | undefined |
| 대기 | pending |
| 승인완료 | approved |
| 지급완료 | paid |
| 취소 | cancelled |

### 6.4 커미션 목록 테이블

| 컬럼 | 설명 |
|------|------|
| 파트너 | partner_name |
| 주문번호 | order_number |
| 커미션율 | commission_rate % |
| 주문금액 | order_amount |
| 커미션금액 | commission_amount (bold) |
| 상태 | 뱃지 (pending/approved/paid/cancelled) |
| 액션 | 승인·취소 (pending) / 지급·취소 (approved) |
| 확장 | ChevronDown/Up → 주문 항목 상세 |

### 6.5 액션 버튼

| 현재 상태 | 가능한 액션 | API |
|-----------|------------|-----|
| pending | ✅ 승인 (Check) / ✅ 취소 (XCircle) | PATCH `/commissions/:id/approve` · `/commissions/:id/status` |
| approved | ✅ 지급 (CreditCard) / ✅ 취소 (XCircle) | PATCH `/commissions/:id/pay` · `/commissions/:id/status` |
| paid | 없음 | — |
| cancelled | 없음 | — |

### 6.6 확장 상세

클릭 시 주문 항목 테이블 표시:
- 상품명 · 수량 · 단가 · 금액

### 6.7 API 전체 목록

| Method | Endpoint | 용도 |
|--------|----------|------|
| POST | `/commissions/calculate` | 기간별 커미션 일괄 계산 |
| GET | `/commissions?page=X&status=S` | 커미션 목록 조회 |
| GET | `/commissions/kpi` | KPI 집계 |
| GET | `/commissions/:id` | 커미션 상세 (주문 항목 포함) |
| PATCH | `/commissions/:id/approve` | 승인 (pending → approved) |
| PATCH | `/commissions/:id/pay` | 지급 (approved → paid) |
| PATCH | `/commissions/:id/status` | 취소 |

### 6.8 판정: **PASS**

---

## 7. Partner Settlement Page

**File**: `services/web-neture/src/pages/admin/AdminPartnerSettlementsPage.tsx`
**Route**: `/workspace/admin/partner-settlements`
**Work Order**: WO-O4O-PARTNER-COMMISSION-SETTLEMENT-V1

### 7.1 정산 생성

```
[Partner ID (UUID) 입력] → [정산 생성] 버튼
POST /api/v1/neture/admin/partner-settlements { partner_id }
→ approved 상태 커미션을 묶어 정산 배치 생성
```

### 7.2 상태 필터

| 탭 | 값 |
|----|-----|
| 전체 | undefined |
| 대기 | pending |
| 지급완료 | paid |

### 7.3 정산 목록 테이블

| 컬럼 | 설명 |
|------|------|
| 확장 | ChevronRight/Down |
| 파트너 | name + email (2줄) |
| 커미션 건수 | commission_count |
| 금액 | total_commission (bold) |
| 상태 | 뱃지 (pending/processing/paid) |
| 생성일 | created_at |
| 지급일 | paid_at 또는 "-" |
| 액션 | 지급 버튼 (pending) / "완료" 텍스트 (paid) |

### 7.4 확장 상세

정산에 포함된 커미션 항목:
- 주문번호 · 공급자명 · 주문금액 · 커미션금액

### 7.5 API 전체 목록

| Method | Endpoint | 용도 |
|--------|----------|------|
| POST | `/partner-settlements` | 정산 배치 생성 |
| GET | `/partner-settlements?page=X&status=S` | 정산 목록 |
| GET | `/partner-settlements/:id` | 정산 상세 (포함 커미션) |
| POST | `/partner-settlements/:id/pay` | 정산 지급 완료 |

### 7.6 판정: **PASS**

---

## 8. Page Interconnection Map

```
┌─────────────────────────────────────────────────────────┐
│                   Admin Dashboard                       │
│  Block A: 파트너십 요청 수                                │
│  Block C: 미처리 파트너십 요청 경고 → /admin/partners     │
│  Block D: 파트너 관리 바로가기 → /admin/partners          │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│  Partner     │ │  Commission  │ │  Partner     │
│  Monitoring  │ │  Management  │ │  Settlement  │
│  /partners   │ │  /commissions│ │  /partner-   │
│              │ │              │ │  settlements │
│  KPI 4장     │ │  KPI 3장     │ │              │
│  검색+목록   │ │  계산+목록   │ │  생성+목록   │
│  상세 링크 ──┤ │  승인/지급   │ │  지급        │
└──────┬───────┘ └──────────────┘ └──────────────┘
       │                                ▲
       ▼                                │
┌──────────────┐                        │
│  Partner     │  "정산 관리 →" ────────┘
│  Detail      │
│  /partners/  │
│  :id         │
│              │
│  KPI 4장     │
│  커미션 목록 │
└──────────────┘
```

---

## 9. Gap Analysis

### 9.1 구현 완료 (PASS)

| # | 항목 | 상태 |
|---|------|------|
| 1 | Sidebar 파트너 관리 그룹 (2 메뉴) | ✅ |
| 2 | Sidebar 수수료 관리 메뉴 | ✅ |
| 3 | Partner Monitoring KPI + 목록 + 검색 | ✅ |
| 4 | Partner Detail 요약 + 커미션 조회 | ✅ |
| 5 | Commission 기간별 계산 | ✅ |
| 6 | Commission 승인/지급/취소 액션 | ✅ |
| 7 | Commission 상태 필터 (5종) | ✅ |
| 8 | Settlement 배치 생성 | ✅ |
| 9 | Settlement 지급 완료 | ✅ |
| 10 | Settlement 확장 상세 | ✅ |
| 11 | Dashboard → 파트너 관리 바로가기 | ✅ |
| 12 | Dashboard → 미처리 파트너십 경고 | ✅ |

### 9.2 개선 가능 항목

| # | 항목 | 현재 | 개선 방향 | 우선순위 |
|---|------|------|----------|---------|
| G1 | Dashboard KPI에 커미션 대기 금액 표시 | 파트너십 요청 수만 | Block A에 `커미션 대기 금액` 추가 | **높음** |
| G2 | Dashboard KPI에 활성 파트너 수 표시 | 미표시 | Block A에 `활성 파트너 수` 추가 | **높음** |
| G3 | Dashboard Governance Alert에 정산 대기 경고 | 미표시 | Block C에 `정산 대기 N건` 경고 추가 | 중간 |
| G4 | Partner Detail에서 커미션 직접 승인/지급 | 조회만 가능 | 인라인 액션 버튼 추가 | 낮음 |
| G5 | Settlement 생성 시 UUID 직접 입력 | UUID 수동 입력 | 파트너 검색/선택 드롭다운 | 중간 |

---

## 10. 결론

### 운영 기능: **FULLY IMPLEMENTED**

커미션 계산 → 승인 → 지급 → 정산 배치 → 정산 지급의 **전체 운영 워크플로가 완성**되어 있다.

- 3개 전용 페이지 (Monitoring · Commission · Settlement) 모두 API 연결 완료
- 상태 전이 (pending → approved → paid) 정상 동작
- KPI 집계, 필터, 페이지네이션, 확장 상세 모두 구현

### Dashboard 연결: **PARTIAL**

Admin Dashboard (4-Block 구조)에서 Partner 실적을 **한눈에 파악할 수 없다**.

- Block A에 "파트너십 요청" 수만 표시 (커미션/정산 금액 없음)
- Block B에 Partner 관련 정책 항목 없음
- Block C에 정산 대기 경고 없음
- Block D에 바로가기 존재 (유일한 연결점)

### 권장 후속 WO

Dashboard KPI 강화가 필요한 경우:

```
WO-O4O-NETURE-ADMIN-DASHBOARD-PARTNER-KPI-V1
- Block A: 활성 파트너 수, 커미션 대기 금액 추가
- Block C: 정산 대기 N건 Governance Alert 추가
- Backend: getAdminDashboardSummary()에 partner/commission 집계 추가
```

---

*Generated: 2026-03-14*
*Auditor: Claude Code*
*Scope: Frontend pages + API integration + Dashboard KPI*
