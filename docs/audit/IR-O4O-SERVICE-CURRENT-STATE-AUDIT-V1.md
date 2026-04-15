# IR-O4O-SERVICE-CURRENT-STATE-AUDIT-V1

> **Investigation Report — O4O 플랫폼 서비스 현황 전수 조사**
> 작성일: 2026-04-15
> 상태: READ-ONLY 조사 완료
> 목적: 각 서비스의 역할, 사용자 흐름, 서비스 간 이동 구조, Market Trial 크로스 서비스 흐름 분석

---

## 1. 서비스 역할 요약

### 1.1 플랫폼 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     O4O Core API                            │
│  apps/api-server (146 entities, 21 route directories)       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Neture   │  │ KPA      │  │ Glyco    │  │ K-Cosme   │  │
│  │ (공급)    │  │ (약사회)  │  │ (약국)    │  │ (화장품)   │  │
│  │ 276 rts  │  │ 229 rts  │  │ 126 rts  │  │ 76 rts    │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                                            ┌───────────┐   │
│                                            │GlucoseView│   │
│                                            │ (당뇨관리)  │   │
│                                            │ dist-only  │   │
│                                            └───────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 서비스별 역할 정의

| 서비스 | Cloud Run | 핵심 역할 | 사용자 유형 | Route 수 |
|--------|-----------|----------|------------|---------|
| **Neture** | `neture-web` | 공급자 온보딩, 상품 등록, Market Trial 생성, 파트너/제휴 관리 | Supplier, Partner, Operator, Admin | 276 |
| **KPA Society** | `kpa-society-web` | 약사회 커뮤니티, 분회 서비스, 약국 스토어, 공동구매, Market Trial 참여 | Public, Pharmacist, Pharmacy Owner, KPA Operator/Admin, Intranet User | 229 |
| **GlycoPharm** | `glycopharm-web` | 약국 Care 대시보드, AI 환자 관리, Store Hub 운영 | Pharmacy, Operator, Admin | 126 |
| **K-Cosmetics** | `k-cosmetics-web` | 화장품 전문 스토어, 코스메틱 카탈로그 운영 | Operator, Admin, Store Manager | 76 |
| **GlucoseView** | `glucoseview-web` | 당뇨 환자 데이터 관리 (최소 기능) | Operator | dist-only |

### 1.3 서비스 간 소유 영역

| 도메인 | 소유 서비스 | 비고 |
|--------|-----------|------|
| Supplier 온보딩 & 상품 카탈로그 | Neture | `neture_suppliers`, `supplier_product_offers` |
| Market Trial 생성 & 운영 | Neture (Operator) | `market_trials`, `market_trial_participants` |
| Market Trial 참여 & 소비 | KPA Society | 약국 회원만 참여 가능 |
| 공동구매 (Event Offer) | KPA Society | `organization_product_listings` (service_key=kpa-groupbuy) |
| 약국 Store 운영 | GlycoPharm (Primary), KPA/K-Cosmetics | `@o4o/store-ui-core` 공통 Shell |
| Care (환자 관리) | GlycoPharm | `care_coaching_sessions`, `care_messages` |
| 커뮤니티 (Forum) | KPA Society | `forum_category`, `forum_post` |
| 콘텐츠 (CMS/Signage) | 각 서비스 공통 | `@o4o/cms-core`, `@o4o/signage-core` |
| HUB (Operator 통합 관제) | 각 서비스 공통 | `@o4o/hub-core` (FROZEN F1) |

---

## 2. 사용자 흐름

### 2.1 공급자 (Supplier) 흐름

**진입 서비스: Neture**

```
[Supplier 가입]
   │
   ▼
 Neture 회원가입 → 공급자 신청 (neture_supplier_requests)
   │
   ▼
 Neture Operator 승인 (SUBMITTED → APPROVED)
   │
   ▼
 공급자 대시보드 (/account/supplier)
   ├── 상품 등록 (supplier_product_offers)
   ├── Market Trial 생성 (POST /api/market-trial)
   ├── 판매 현황 모니터링
   └── 정산 내역 확인
   │
   ▼
 [Market Trial 생성 시]
   ├── Trial 상태: DRAFT → SUBMITTED → (Operator 승인) → RECRUITING → ACTIVE → FULFILLED/CLOSED
   ├── 결과 확인: /api/market-trial/:id/results
   └── 상품 전환 알림 수신
```

**공급자가 거치는 Guard**: `requireAuth` → `requireNetureScope('neture:supplier')`

### 2.2 매장/약국 (Pharmacy) 흐름

**진입 서비스: KPA Society (가입) → GlycoPharm (운영)**

```
[약사 가입]
   │
   ▼
 KPA Society 회원가입 → 약사 인증
   │
   ├── 커뮤니티 이용 (포럼, 학술, LMS)
   │
   ├── 약국 개설 (PharmacyGuard → isStoreOwner 확인)
   │     │
   │     ▼
   │   약국 스토어 대시보드 (/store)
   │     ├── 상품 입점 (organization_product_listings)
   │     ├── 채널 관리 (channels)
   │     ├── 사이니지 관리
   │     └── KPI 모니터링
   │
   ├── Market Trial 참여
   │     ├── KPA Society /market-trial (Hub 페이지)
   │     ├── Trial 상세 → 참여 (POST /api/market-trial/:id/join)
   │     ├── 보상 유형 선택 (product_reward / cash_reward)
   │     └── 포럼 토론 참여 (forumPostId 연결)
   │
   └── 공동구매 참여 (Event Offer)
         └── groupbuy → checkoutService.createOrder()

[약국 운영]
   │
   ▼
 GlycoPharm 접속 (SSO Handoff 또는 직접 로그인)
   ├── Care 대시보드 (/care)
   │     ├── 환자 목록 & AI 우선순위 엔진
   │     ├── 코칭 세션 관리
   │     └── 메시지 발송
   │
   ├── Store Hub (/store/hub)
   │     ├── 상품 관리 (입점/해제)
   │     ├── 채널 관리
   │     └── KPI 확인
   │
   └── Market Trial Gateway (/store/market-trial)
         ├── 접근 자격 확인 (Gateway 패턴)
         └── KPA Society Hub로 리다이렉트
```

**약국이 거치는 Guard 체인**:
- KPA Society: `requireAuth` → `PharmacyGuard` (isStoreOwner) → `HubGuard`
- GlycoPharm: `requireAuth` → `RoleGuard` (allowedRoles)

### 2.3 운영자 (Operator) 흐름

**서비스별 Operator 범위 차이**

| 서비스 | Scope Guard | 핵심 관할 |
|--------|------------|----------|
| **Neture Operator** | `requireNetureScope('neture:operator')` | 공급자 승인, 상품 승인, Market Trial 승인/관리, 정산 |
| **KPA Operator** | `requireKpaScope('kpa:operator')` | 회원 관리, 포럼 관리, 공동구매 운영, 콘텐츠, 사이니지 |
| **GlycoPharm Operator** | `RoleGuard` (membership 기반) | 매장 모니터링, 콘텐츠 관리, AI 리포트 |
| **K-Cosmetics Operator** | `requireAuth` (role 기반) | 화장품 카탈로그 관리, 주문 관리 |

**공통 Operator 대시보드 구조** (5-Block Pattern):

```
┌───────────────────────────────────────┐
│           KPI Cards (4~8개)            │
├───────────────┬───────────────────────┤
│  AI Summary   │    Action Queue       │
├───────────────┼───────────────────────┤
│ Activity Log  │    Quick Actions      │
└───────────────┴───────────────────────┘
```

**Neture Operator 특수 흐름: Market Trial 관리**

```
 Trial 접수 (SUBMITTED)
   │
   ▼
 승인 (PATCH /approve → RECRUITING)
   │
   ▼
 모집 모니터링 (/funnel - 전환 퍼널)
   │
   ▼
 Trial 완료 후 상품 전환
   ├── convertToProduct() → supplier_product_offers 연결
   ├── 참여자 전환 상태 추적 (none → interested → adopted → first_order)
   └── createListingFromParticipant() → 입점 자동 연결 (source_type='market_trial')
```

---

## 3. 서비스 간 이동 구조

### 3.1 현재 이동 메커니즘

| 메커니즘 | 구현 상태 | 설명 |
|----------|----------|------|
| **SSO Handoff** | ✅ 구현됨 | Token 기반 `/handoff?token=X` → 교환 → localStorage 저장 |
| **Service Switch UI** | ❌ 미구현 | 각 서비스는 독립 도메인, 전환 메뉴 없음 |
| **Cross-Service 링크** | ⚠️ 부분 | GlycoPharm → KPA Society (Market Trial 리다이렉트만) |
| **공통 인증** | ✅ | 동일 users 테이블, JWT 공유 |

### 3.2 SSO Handoff 흐름

```
[서비스 A] ──(handoff token 생성)──▶ /handoff?token=abc123 ──▶ [서비스 B]
                                         │
                                         ▼
                                   POST /api/v1/auth/handoff/exchange
                                         │
                                         ▼
                                   accessToken + refreshToken
                                         │
                                         ▼
                                   localStorage 저장 → 홈 리다이렉트
```

**구현 위치**: `services/web-kpa-society/src/pages/HandoffPage.tsx`, `services/web-glycopharm/src/pages/HandoffPage.tsx` (동일 구현)

### 3.3 서비스 간 사용자 여정 (실제 경로)

**시나리오 1: 공급자가 상품을 약국에 유통하는 전체 경로**

```
Neture                           API Server                    KPA Society
──────                           ──────────                    ───────────
공급자 가입/승인           →
상품 등록                  →  supplier_product_offers
Market Trial 생성          →  market_trials (SUBMITTED)
                                    │
                           Operator 승인 (RECRUITING)
                                    │
                                    ├────────────────────────▶  Market Trial Hub 노출
                                                                약국 참여 (join)
                                                                포럼 토론
                                    │
                           Trial 완료 (FULFILLED)
                           상품 전환 (convertToProduct)
                                    │
                                    ├────────────────────────▶  약국 스토어 입점
                                                               (organization_product_listings)
```

**시나리오 2: 약국 주인의 일상 운영**

```
KPA Society                      GlycoPharm
───────────                      ──────────
로그인
커뮤니티 확인 (포럼)
Market Trial 참여
공동구매 주문
         │
         └──(SSO Handoff)────▶   Care 대시보드
                                 환자 관리
                                 Store Hub 운영
                                 Market Trial Gateway
                                    └──(리다이렉트)──▶ KPA Society
```

### 3.4 Gateway 패턴 (GlycoPharm → KPA Society)

GlycoPharm의 Market Trial 페이지는 **Gateway** 역할만 수행:

```typescript
// services/web-glycopharm/src/pages/store-management/market-trial/MarketTrialListPage.tsx
const KPA_URL = import.meta.env.VITE_KPA_URL || 'https://kpa-society-web-...';

// 자격 확인 → 상태별 메시지 표시
// not_logged_in | no_kpa_membership | not_pharmacy_member | pending_approval | no_trials

// Trial CTA → KPA Society로 deep link
<a href={`${KPA_URL}/market-trial/${trial.id}`}>상세 보기</a>
```

---

## 4. Market Trial 구조 분석

### 4.1 아키텍처 개요

```
┌────────────┐     ┌──────────────┐     ┌────────────────┐
│   Neture    │     │   API Server │     │  KPA Society   │
│  (생성측)   │     │   (엔진)      │     │   (소비측)      │
├────────────┤     ├──────────────┤     ├────────────────┤
│ Supplier:  │────▶│market_trials │────▶│ MarketTrialHub │
│ 신청 생성   │     │market_trial_ │     │ 참여 & 토론     │
│            │     │ participants │     │                │
│ Operator:  │────▶│              │     │ GlycoPharm:    │
│ 승인/관리   │     │ supplier_    │     │ Gateway만      │
│ 전환/퍼널   │     │ product_     │◀────│ (리다이렉트)    │
│            │     │ offers       │     │                │
└────────────┘     └──────────────┘     └────────────────┘
```

### 4.2 상태 머신

```
DRAFT → SUBMITTED → RECRUITING → ACTIVE → FULFILLED ─┐
                        │                              │
                        └──────── CLOSED ◀─────────────┘
                                    │
                                    ▼
                            (상품 전환 가능)
```

| 상태 | 트리거 | 관할 |
|------|--------|------|
| DRAFT | 공급자 임시저장 | Supplier |
| SUBMITTED | 공급자 제출 | Supplier |
| RECRUITING | Operator 승인 | Neture Operator |
| ACTIVE | 모집 완료 / 자동 전환 | System |
| FULFILLED | 참여자 전원 완료 | System / Operator |
| CLOSED | 수동 종료 | Operator |

### 4.3 참여자 전환 퍼널

```
참여 (join)
  │
  ▼
participantCount ← 전체 참여자
  │
  ├── productRewardCount (상품 보상 선택)
  ├── cashRewardCount (현금 보상 선택)
  │
  ▼
customerConversionStatus 추적:
  none → interested → considering → adopted → first_order
                                       │
                                       ▼
                              createListingFromParticipant()
                              → organization_product_listings
                              (source_type='market_trial')
```

### 4.4 크로스 서비스 데이터 흐름

| 단계 | 테이블 | 소유 | 접근 서비스 |
|------|--------|------|-----------|
| Trial 생성 | `market_trials` | API Server | Neture (write), KPA (read) |
| 참여 | `market_trial_participants` | API Server | KPA (write), Neture Operator (read) |
| 상품 원본 | `supplier_product_offers` | API Server | Neture (write), 전체 (read) |
| 입점 | `organization_product_listings` | API Server | GlycoPharm/KPA (write) |
| 포럼 연결 | `forum_post` (forumPostId) | API Server | KPA (read/write) |

### 4.5 핵심 판단

**Market Trial은 Neture에서 생성하고, KPA Society에서 소비하며, API Server가 중간 엔진 역할을 하는 크로스 서비스 기능이다.**

- **생산**: Neture (Supplier 생성 + Operator 승인/관리)
- **소비**: KPA Society (약국 참여 + 포럼 토론)
- **중계**: GlycoPharm (Gateway 패턴 — 자격 확인 후 KPA로 리다이렉트)
- **결과**: 상품 전환 → 약국 스토어 자동 입점 (source tracking)

---

## 5. 문제점

### 5.1 구조적 문제

| # | 문제 | 심각도 | 영향 |
|---|------|--------|------|
| P1 | **서비스 간 이동 UI 부재** | HIGH | 약사가 KPA↔GlycoPharm 전환 시 별도 URL 입력 필요. Handoff는 존재하나 UI 진입점 없음 |
| P2 | **HandoffPage 코드 중복** | MEDIUM | KPA Society, GlycoPharm에 동일 HandoffPage.tsx 존재 → Core 패키지 부재 |
| P3 | **Market Trial Gateway 하드코딩** | MEDIUM | GlycoPharm에 KPA_URL 환경변수로 하드코딩된 리다이렉트. 서비스 디스커버리 메커니즘 없음 |
| P4 | **GlucoseView 사실상 미운영** | LOW | dist-only (소스 없음), 최소 기능. 독립 서비스 유지 비용 대비 가치 불명확 |
| P5 | **약사의 서비스 분산** | HIGH | 약국 주인은 KPA(커뮤니티+공동구매), GlycoPharm(Care+Store Hub)을 별도로 사용해야 함 |

### 5.2 코드 중복

| 대상 | 중복 서비스 | 줄 수 | 해결 방향 |
|------|-----------|-------|----------|
| AuthContext.tsx | 5개 서비스 | 191~477 | `@o4o/auth-core` 존재하나 미통합 |
| RoleGuard.tsx | 5개 서비스 | ~40 | IDENTICAL (99%) |
| HandoffPage.tsx | 2개 서비스 | ~90 | Core 패키지 후보 |
| LoginModal.tsx | 4개 서비스 | 80~120 | PATTERN (85%+) |
| AI 컴포넌트 (Preview/Summary) | 5개 서비스 | ~280 | IDENTICAL (98%+) |

> 상세: `IR-O4O-CROSS-SERVICE-DUPLICATION-AUDIT-V1` 참조

### 5.3 Market Trial 특수 문제

| # | 문제 | 설명 |
|---|------|------|
| MT1 | **Forum 연결이 단방향** | Trial → Forum Post 링크는 있으나, Forum에서 Trial 참여 CTA 없음 |
| MT2 | **전환 퍼널이 수동** | Operator가 각 참여자의 conversion status를 수동 업데이트. 자동화 없음 |
| MT3 | **Listing 생성이 1:1** | 참여자별 개별 listing 생성. 대량 처리 API 없음 |
| MT4 | **결과 알림이 fire-and-forget** | `notificationSentAt`으로 중복 방지하나, 실패 시 재시도 메커니즘 없음 |

---

## 6. 구조 단순화 기회

### 6.1 단기 (Quick Win)

| # | 기회 | 예상 효과 | 난이도 |
|---|------|----------|--------|
| S1 | **Service Switch 헤더 추가** | 약사가 KPA↔GlycoPharm 한 클릭 전환 | LOW |
| S2 | **HandoffPage Core 패키지화** | 2개 서비스 중복 제거, 향후 서비스 추가 시 재사용 | LOW |
| S3 | **Market Trial Gateway → iframe/embed** | GlycoPharm에서 KPA 리다이렉트 없이 Trial Hub 직접 표시 | MEDIUM |

### 6.2 중기 (구조 개선)

| # | 기회 | 예상 효과 | 난이도 |
|---|------|----------|--------|
| S4 | **Auth Context 통합** | 5개 서비스 AuthContext → `@o4o/auth-ui-core` 단일 패키지 | MEDIUM |
| S5 | **Market Trial 전환 자동화** | 주문 이벤트 → conversion status 자동 업데이트 | MEDIUM |
| S6 | **Market Trial 대량 처리 API** | 다수 참여자 listing 일괄 생성 | LOW |

### 6.3 장기 (아키텍처)

| # | 기회 | 예상 효과 | 난이도 |
|---|------|----------|--------|
| S7 | **약국 통합 대시보드** | KPA Store + GlycoPharm Care를 단일 약국 콘솔로 통합 | HIGH |
| S8 | **서비스 디스커버리** | 하드코딩된 서비스 URL → 중앙 레지스트리 | HIGH |
| S9 | **GlucoseView 흡수** | GlycoPharm의 서브 모듈로 통합 또는 독립 서비스 폐지 | MEDIUM |

---

## 7. 최종 결론

**O4O 플랫폼은 "하나의 API 서버 + 5개 프론트엔드 서비스"로 구성된 모노레포 멀티 서비스 구조이며, 공급자(Neture)→운영자(Neture Operator)→약국(KPA Society/GlycoPharm)으로 이어지는 가치 체인은 Market Trial이라는 크로스 서비스 메커니즘으로 연결되어 있으나, 서비스 간 이동 UI 부재와 코드 중복(~5,000줄)이 사용자 경험과 유지보수 비용의 주요 병목이다.**

### 수치 요약

| 지표 | 값 |
|------|-----|
| 프론트엔드 서비스 | 5개 (Neture, KPA, GlycoPharm, K-Cosmetics, GlucoseView) |
| 전체 Route 수 | ~707 (276+229+126+76+dist-only) |
| DB Entity 수 | 146 |
| API Route 디렉토리 | 21 |
| 크로스 서비스 중복 LOC | ~5,000줄 |
| Market Trial 상태 | 6단계 (DRAFT→SUBMITTED→RECRUITING→ACTIVE→FULFILLED/CLOSED) |
| 참여자 전환 단계 | 5단계 (none→interested→considering→adopted→first_order) |
| 서비스 간 이동 방식 | SSO Handoff (구현됨), UI 전환 (미구현) |

---

*End of IR-O4O-SERVICE-CURRENT-STATE-AUDIT-V1*
