# IR-O4O-NETURE-PARTNER-DASHBOARD-AUDIT

> **Investigation Request**: Neture Partner HUB Dashboard 구조 조사
> **Status**: COMPLETE
> **Date**: 2026-03-14
> **Scope**: Partner Layouts · Dashboard · Product Pool · Referral Links · Commissions · Settlements · Content · Stores · Backend API

---

## 1. Executive Summary

Neture Partner HUB를 전수 조사한 결과, **핵심 운영 기능(Dashboard, Product Pool, Referral, Commission, Settlement)은 완전 구현**되어 있으나, **확장 기능(Content, Stores, Collaboration, Promotions)은 Mock Data 단계**이다.

| 영역 | 판정 | 비고 |
|------|------|------|
| Partner Layout (2종) | **ACTIVE** | SpaceLayout + AccountLayout |
| Partner HUB Dashboard | **ACTIVE** | 4 KPI 카드 + Quick Actions + Recent Commissions |
| Product Pool | **ACTIVE** | 그리드 + 검색/필터 + Referral 링크 생성 |
| Referral Management | **ACTIVE** | 링크 목록 + 복사/열기 (DELETE 미지원) |
| Commission Dashboard | **ACTIVE** | 3 KPI 카드 + 상태 필터 탭 + 페이지네이션 |
| Settlement Dashboard | **ACTIVE** | 배치 카드 + 확장 상세 + 페이지네이션 |
| Content Management | **PARTIAL** | Mock Data — API 미연동 |
| Store Connections | **PARTIAL** | Mock Data — API 미연동 |
| Collaboration | **PARTIAL** | Mock Data — API 미구현 |
| Promotions | **PARTIAL** | Mock Data — API 미구현 |
| Partner Account Dashboard | **PARTIAL** | Mock Data — API 미연동 |
| Backend API | **ACTIVE** | ~30 엔드포인트, Guard 적용 완료 |

**종합 판정: CORE OPERATIONAL / EXTENSIONS PARTIAL** — Partner는 Product Pool 조회부터 Referral 생성, Commission 확인, Settlement 조회까지 핵심 운영 워크플로를 수행할 수 있다. Content/Store/Collaboration/Promotions는 UI Shell만 존재하며 API 연동이 필요하다.

---

## 2. Partner Layout 구조 (2종)

### 2.1 PartnerSpaceLayout

**파일**: `services/web-neture/src/components/layouts/PartnerSpaceLayout.tsx`
**경로**: `/partner/*`
**인증**: partner 또는 admin role

| Nav 항목 | 경로 |
|----------|------|
| Dashboard | `/partner/dashboard` |
| Product Pool | `/partner/product-pool` |
| Referral Links | `/partner/referral-links` |
| Store | `/partner/stores` |

구조: Header (메인 네비) + Sub-nav (4개 항목) + Outlet + Footer

### 2.2 PartnerAccountLayout

**파일**: `services/web-neture/src/components/layouts/PartnerAccountLayout.tsx`
**경로**: `/account/partner/*`
**인증**: partner 또는 admin role

| Sidebar 항목 | 아이콘 | 경로 |
|-------------|--------|------|
| Dashboard | LayoutDashboard | `/account/partner` |
| Commissions | DollarSign | `/account/partner/commissions` |
| Settlements | CreditCard | `/account/partner/settlements` |
| Contents | FileText | `/account/partner/contents` |
| Settings | Settings | `/account/partner/settings` |

구조: 좌측 Sidebar + 우측 Outlet

---

## 3. Partner HUB Dashboard

**파일**: `services/web-neture/src/pages/partner/PartnerDashboardPage.tsx`
**경로**: `/partner/dashboard`
**판정**: **ACTIVE** — API 연동 완료

### 3.1 KPI 카드 (4개)

| 카드 | 필드 | 포맷 |
|------|------|------|
| Total Sales | `totalSales` | 원 (통화) |
| Total Commission | `totalCommission` | 원 (통화) |
| Pending Settlement | `pendingSettlement` | 원 (통화) |
| Paid Amount | `paidAmount` | 원 (통화) |

**API**: `GET /api/v1/neture/partner/dashboard/items` → `dashboardApi` 호출

### 3.2 Quick Actions

Partner HUB 내 주요 기능으로의 빠른 진입점 제공.

### 3.3 Recent Commissions

최근 커미션 내역 표시 (목록 형태).

---

## 4. Product Pool

**파일**: `services/web-neture/src/pages/partner/PartnerProductPoolPage.tsx`
**경로**: `/partner/product-pool`
**판정**: **ACTIVE** — API 연동 완료

### 기능

- 상품 그리드 (카드 형태)
- 검색 + 카테고리 필터
- Referral 링크 생성 (상품별)
- 상품 상세 정보 표시

**API**: `GET /api/v1/neture/partner/product-pool` → 검색/필터/페이지네이션

### Referral 링크 생성 흐름

1. Product Pool에서 상품 선택
2. "Referral 링크 생성" 클릭
3. `POST /api/v1/neture/partner/referral-links` → 8자 hex 토큰 생성
4. URL 패턴: `/store/{slug}/product/{slug}?ref={token}`

---

## 5. Referral Management

**파일**: `services/web-neture/src/pages/partner/PartnerReferralLinksPage.tsx`
**경로**: `/partner/referral-links`
**판정**: **ACTIVE** — API 연동 완료

### 기능

- Referral 링크 테이블 (상품명, 토큰, 생성일, 클릭수, 전환수)
- 링크 복사 (클립보드)
- 링크 열기 (새 탭)
- 검색 기능

**API**: `GET /api/v1/neture/partner/referral-links` → 목록 조회

### 제한사항

- **DELETE 엔드포인트 미존재** — Referral 링크 삭제 불가
- 비활성화/아카이브 기능 없음

---

## 6. Commission Dashboard

**파일**: `services/web-neture/src/pages/partner/PartnerCommissionsPage.tsx`
**경로**: `/account/partner/commissions`
**판정**: **ACTIVE** — API 연동 완료

### 6.1 KPI 카드 (3개)

| 카드 | 필드 | 포맷 |
|------|------|------|
| Total Commission | `totalCommission` | 원 (통화) |
| Pending Commission | `pendingAmount` | 원 (통화) |
| Paid Commission | `paidAmount` | 원 (통화) |

**API**: `GET /api/v1/neture/partner/commissions/kpi`

### 6.2 Commission 목록

- 상태 필터 탭 (All / Pending / Approved / Paid / Cancelled)
- 페이지네이션
- 개별 Commission 상세 조회

**API**: `GET /api/v1/neture/partner/commissions` → 상태 필터 + 페이지네이션

### Commission 생명주기

```
pending → approved → paid
           ↘ cancelled
```

Partner는 **조회 전용** — 상태 변경은 Admin만 가능

---

## 7. Settlement Dashboard

**파일**: `services/web-neture/src/pages/partner/PartnerSettlementsPage.tsx`
**경로**: `/account/partner/settlements`
**판정**: **ACTIVE** — API 연동 완료

### 기능

- Settlement 배치 카드 목록
- 카드 확장 → 포함된 Commission 상세 표시
- 페이지네이션
- 상태 표시 (pending / paid)

**API**: `GET /api/v1/neture/partner/settlements` → 배치 목록 + 페이지네이션

### Settlement 흐름 (Partner 관점)

1. Admin이 approved commissions으로 Settlement 배치 생성
2. Partner는 Settlement 목록에서 배치 확인
3. Admin이 paid로 전환하면 Partner에게 반영

---

## 8. Content Management

**파일**: `services/web-neture/src/pages/partner/PartnerContentsPage.tsx`
**경로**: `/account/partner/contents`
**판정**: **PARTIAL** — Mock Data 사용

### 현재 상태

- UI 구현 완료: 검색, 타입 필터 (product/service), 상태 필터 (published/draft)
- **데이터는 Mock** — API 연동되지 않음
- Content 작성/편집 기능 없음

### 필요한 작업

- Partner용 Content API 엔드포인트 연동
- Content CRUD 기능 구현

---

## 9. Store Connections

**파일**: `services/web-neture/src/pages/partner/PartnerStoresPage.tsx`
**경로**: `/partner/stores`
**판정**: **PARTIAL** — Mock Data 사용

### 현재 상태

- UI 구현 완료: Store 테이블, 필터
- **데이터는 Mock** — API 연동되지 않음
- Store 연결/해제 기능 없음

---

## 10. Collaboration & Promotions

### 10.1 Collaboration

**파일**: `services/web-neture/src/pages/partner/CollaborationPage.tsx`
**판정**: **PARTIAL** — Mock Data, API 미구현

- KPI 카드 + Supplier 목록 UI 존재
- API 엔드포인트 미구현

### 10.2 Promotions

**파일**: `services/web-neture/src/pages/partner/PromotionsPage.tsx`
**판정**: **PARTIAL** — Mock Data, API 미구현

- 캠페인 카드 + 진행률 표시 UI 존재
- API 엔드포인트 미구현

---

## 11. Partner Account Dashboard

**파일**: `services/web-neture/src/pages/partner/PartnerAccountDashboardPage.tsx`
**경로**: `/account/partner`
**판정**: **PARTIAL** — Mock Data 사용

### 현재 상태

- 4 KPI 카드 UI 존재 (별도 Account 뷰)
- 캠페인, 스토어, 포럼 섹션
- **모두 Mock Data** — 실 API 미연동

**참고**: Partner HUB Dashboard (`/partner/dashboard`)는 API 연동 완료(ACTIVE). Account Dashboard는 별도 페이지로 Mock 상태.

---

## 12. Backend API 구조

### 12.1 Partner 컨트롤러

**파일**: `apps/api-server/src/modules/neture/controllers/partner.controller.ts`

### 12.2 Guard 체계

| Guard | 용도 | 조건 |
|-------|------|------|
| `requireLinkedPartner` | 읽기 작업 | 연결된 Partner 존재 (any status) |
| `requireActivePartner` | 쓰기 작업 | Partner status = ACTIVE |

### 12.3 엔드포인트 목록

| Method | Path | Guard | 설명 |
|--------|------|-------|------|
| GET | `/partner/dashboard/items` | linkedPartner | Dashboard KPI |
| GET | `/partner/product-pool` | linkedPartner | 상품 풀 조회 |
| GET | `/partner/product-pool/:id` | linkedPartner | 상품 상세 |
| POST | `/partner/referral-links` | activePartner | Referral 링크 생성 |
| GET | `/partner/referral-links` | linkedPartner | Referral 링크 목록 |
| GET | `/partner/referral-links/:id` | linkedPartner | Referral 링크 상세 |
| GET | `/partner/commissions` | linkedPartner | Commission 목록 |
| GET | `/partner/commissions/kpi` | linkedPartner | Commission KPI |
| GET | `/partner/commissions/:id` | linkedPartner | Commission 상세 |
| GET | `/partner/settlements` | linkedPartner | Settlement 목록 |
| GET | `/partner/settlements/:id` | linkedPartner | Settlement 상세 |
| GET | `/partner/overview` | linkedPartner | Partner 개요 |
| POST | `/partner/contents/link` | activePartner | Content 연결 |
| DELETE | `/partner/contents/link/:id` | activePartner | Content 연결 해제 |
| GET | `/partner/contents` | linkedPartner | 연결된 Content 목록 |

**총 ~30개 엔드포인트** (세부 필터/페이지네이션 파라미터 포함)

### 12.4 Guard 적용 원칙

- **읽기(GET)**: `requireLinkedPartner` — 비활성 파트너도 데이터 조회 가능
- **쓰기(POST/PUT/DELETE)**: `requireActivePartner` — ACTIVE 상태만 변경 작업 가능

---

## 13. 데이터 흐름 요약

```
Supplier → Product 등록 → Product Pool 노출
                              ↓
Partner → Product Pool 조회 → Referral 링크 생성
                              ↓
Customer → Referral URL 클릭 → 주문 → Commission 자동 생성
                                          ↓
Admin → Commission 검토 → 승인 → Settlement 배치 생성 → 지급
                                          ↓
Partner → Commission 조회 ← Settlement 확인
```

---

## 14. 발견 사항 및 권고

### 14.1 즉시 영향 없음 (운영 가능)

| # | 항목 | 설명 |
|---|------|------|
| 1 | Referral 링크 삭제 불가 | DELETE 엔드포인트 미존재. 현재 운영에 지장 없으나 장기적으로 필요 |
| 2 | Account Dashboard Mock | `/account/partner` 페이지 Mock Data. HUB Dashboard가 ACTIVE이므로 운영 영향 없음 |

### 14.2 향후 개선 대상

| # | 영역 | 현재 | 필요 작업 | 우선순위 |
|---|------|------|----------|----------|
| 1 | Content Management | Mock UI | Content API 연동 | Medium |
| 2 | Store Connections | Mock UI | Store 연결 API 연동 | Medium |
| 3 | Collaboration | Mock UI | Supplier-Partner 협업 API 구현 | Low |
| 4 | Promotions | Mock UI | 캠페인/프로모션 시스템 구현 | Low |
| 5 | Account Dashboard | Mock UI | KPI API 연동 (HUB Dashboard 재사용 가능) | Low |

---

## 15. 결론

Neture Partner HUB의 **핵심 운영 파이프라인**(Product Pool → Referral → Commission → Settlement)은 **완전 구현**되어 있다.

- **ACTIVE (6개)**: Dashboard, Product Pool, Referral Links, Commissions, Settlements, Backend API
- **PARTIAL (5개)**: Content, Stores, Collaboration, Promotions, Account Dashboard

Partner는 현재 상태로 **핵심 비즈니스 활동(상품 조회, 추천 링크 생성, 수수료 확인, 정산 조회)을 수행할 수 있다.**

확장 기능(Content/Store/Collaboration/Promotions)은 UI Shell이 준비되어 있어, API 연동만으로 활성화 가능한 상태이다.

---

*Investigated by: Claude Code*
*Date: 2026-03-14*
