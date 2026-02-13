# IR-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1

> O4O 전 서비스 Store Dashboard 구조 현황 분석 및 통합 설계

| 항목 | 값 |
|------|------|
| 문서 ID | IR-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1 |
| 상태 | 조사 완료 |
| 선행 | WO-O4O-BUSINESS-NUMBER-NORMALIZATION-V1, WO-O4O-STORE-IDENTITY-FIELD-ALIGNMENT-V1 |
| 후행 | WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1 (구현) |

---

## 1. 현황 조사 결과

### 1.1 서비스별 Operator 메뉴 비교

| 공통 메뉴 개념 | GlycoPharm | K-Cosmetics | GlucoseView |
|---------------|-----------|-------------|-------------|
| **대시보드** | ✅ Signal 기반 | ✅ Signal 기반 | ❌ 없음 (admin 페이지만) |
| **매장 정보 (Identity)** | ❌ 분리 페이지 없음 | ✅ Store Cockpit | ✅ /dashboard (기본 정보만) |
| **매장 네트워크** | ✅ 약국 네트워크 (23개 메뉴) | 🚧 Placeholder | ❌ 없음 |
| **신청 관리** | ✅ 3종 (신청/매장/스토어) | ✅ Functional | ✅ Functional |
| **상품 관리** | 🚧 Placeholder | 🚧 Placeholder | ❌ 없음 |
| **주문 관리** | 🚧 Placeholder | 🚧 Placeholder | ❌ 없음 |
| **재고/공급** | 🚧 Placeholder | 🚧 Placeholder | ❌ 없음 |
| **정산 관리** | ✅ Functional (샘플) | 🚧 Placeholder | ❌ 없음 |
| **분석/리포트** | ✅ Functional | 🚧 Placeholder | ❌ 없음 |
| **포럼** | ✅ 2종 (신청/관리) | ❌ 없음 | ❌ 없음 |
| **콘텐츠/사이니지** | ✅ 3종 (Hub/Library/My) | ✅ Partial | ❌ 없음 |
| **스토어 템플릿** | ✅ Functional | ❌ 없음 | ❌ 없음 |
| **마케팅** | 🚧 Placeholder | 🚧 Placeholder | ❌ 없음 |
| **회원 관리** | ✅ Functional | ✅ Functional | ❌ 없음 |
| **고객지원** | 🚧 Placeholder | 🚧 Placeholder | ❌ 없음 |
| **설정** | ✅ Functional | 🚧 Placeholder | ✅ Basic |
| **AI 리포트** | ✅ Functional | ✅ Functional | ✅ Functional |
| **환자 관리 (CGM)** | ❌ 해당 없음 | ❌ 해당 없음 | ✅ Core 기능 |
| **파트너** | ❌ 없음 | ❌ 없음 | ✅ 5메뉴 (대부분 Placeholder) |

### 1.2 메뉴 수 비교

| 서비스 | Operator 메뉴 수 | Functional | Placeholder |
|--------|-----------------|-----------|-------------|
| GlycoPharm | **23개** | 15 | 8 |
| K-Cosmetics | **14개** | 5 | 9 |
| GlucoseView | **3개** (operator) + 별도 | 3 | 0 |

### 1.3 핵심 차이점

1. **GlycoPharm**: 가장 성숙. 반프랜차이즈 네트워크 관리 중심. 메뉴 23개.
2. **K-Cosmetics**: Store Cockpit이 가장 진보적 (5-Block 구조). 나머지 대부분 Placeholder.
3. **GlucoseView**: 독립 대시보드 없음. 환자/CGM 데이터 관리가 Core. 매장 개념 약함.

---

## 2. 공통 Store Dashboard 구조 설계

### 2.1 설계 원칙

1. **Store Owner 시점**: 매장 개설자가 접속했을 때 보는 화면
2. **서비스 불문**: 어떤 서비스에서든 동일한 메뉴 구조
3. **표시/숨김으로 제어**: 없는 기능은 메뉴를 숨김 (조건 분기 금지)
4. **K-Cosmetics Store Cockpit 모델 기반**: 가장 잘 설계된 5-Block 구조 재활용

### 2.2 공통 메뉴 구조

```
🏪 Store Dashboard
├── 1. 대시보드 (Overview)          ← Signal 기반 요약
├── 2. 매장 정보 (Identity)          ← 이름, slug, 사업자번호, logo, heroImage
├── 3. 사이버 매장 (Storefront)      ← 온라인 매장 설정/미리보기
├── 4. 상품 관리 (Products)          ← 서비스별 상품/카탈로그
├── 5. 주문 관리 (Orders)            ← E-commerce Core 연동
├── 6. 정산 (Settlement)             ← 수수료/정산
├── 7. 콘텐츠/사이니지 (Content)      ← 디지털 사이니지
├── 8. 서비스 관리 (Services)         ← 활성화된 O4O 서비스 목록
└── 9. 설정 (Settings)               ← 매장 설정
```

### 2.3 서비스별 메뉴 활성화 매트릭스

| 공통 메뉴 | GlycoPharm | K-Cosmetics | GlucoseView | 비고 |
|----------|-----------|-------------|-------------|------|
| 대시보드 | ✅ 표시 | ✅ 표시 | ✅ 표시 (신규) | Signal 3-dot |
| 매장 정보 | ✅ 표시 | ✅ 표시 (Cockpit Block 1) | ✅ 표시 | slug + identity |
| 사이버 매장 | ✅ 표시 | 🔜 Phase 2 | ❌ 숨김 | 스토어 템플릿 |
| 상품 관리 | ✅ 표시 | ✅ 표시 | ❌ 숨김 | 서비스별 상품 |
| 주문 관리 | ✅ 표시 | ✅ 표시 | ❌ 숨김 | E-commerce Core |
| 정산 | ✅ 표시 | ✅ 표시 | ❌ 숨김 | 서비스별 정산 |
| 콘텐츠/사이니지 | ✅ 표시 | ✅ 표시 | ❌ 숨김 | Signage Core |
| 서비스 관리 | ✅ 표시 | ✅ 표시 | ✅ 표시 | enabled_services |
| 설정 | ✅ 표시 | ✅ 표시 | ✅ 표시 | 기본 설정 |

### 2.4 5-Block Dashboard 모델 (K-Cosmetics Cockpit 기반)

```
┌──────────────────────────────────────────────────────┐
│ Block 1: 매장 상태 헤더                                │
│ [매장명] [상태 뱃지] [매장코드] [slug]                  │
│ Quick Actions: [상품 관리] [주문 관리] [매장 정보 수정]   │
├──────────┬──────────┬──────────┬─────────────────────┤
│ Block 2  │ Block 2  │ Block 2  │ Block 2             │
│ 오늘 주문 │ 이번달   │ 채널비율  │ 등록상품             │
│ 3건      │ ₩520만   │ Local 60%│ 12개                │
├──────────┴──────────┴──────────┴─────────────────────┤
│ Block 3: 상품 운영 현황                                │
│ 인기 상품 Top 5 / 최근 등록 상품                        │
├──────────────────────────────────────────────────────┤
│ Block 4: 콘텐츠/사이니지                               │
│ 재생목록 수: 3 | 활성: 2 | [사이니지 관리 →]            │
├──────────────────────────────────────────────────────┤
│ Block 5: AI 인사이트                                   │
│ "이번 주 매출이 15% 증가했습니다" [자세히 보기]          │
└──────────────────────────────────────────────────────┘
```

서비스별 Block 표시:

| Block | GlycoPharm | K-Cosmetics | GlucoseView |
|-------|-----------|-------------|-------------|
| 1. 매장 헤더 | ✅ | ✅ | ✅ (약국 정보) |
| 2. KPI 카드 | ✅ (주문/매출/약국수/상품수) | ✅ (주문/매출/채널/상품) | ✅ (환자수/방문수/CGM데이터/서비스) |
| 3. 상품/운영 | ✅ (인기 상품) | ✅ (인기 상품) | ✅ (최근 환자 목록) |
| 4. 콘텐츠 | ✅ (사이니지) | ✅ (사이니지) | ❌ 숨김 |
| 5. AI 인사이트 | ✅ | ✅ | ✅ |

---

## 3. 기술 구현 방향

### 3.1 공통 Layout Component

```
packages/operator-core/src/layout/
├── StoreDashboardLayout.tsx     ← 공통 사이드바 + 콘텐츠 영역
├── StoreDashboardSidebar.tsx    ← 메뉴 구조 (config 기반 렌더링)
└── StoreDashboardConfig.ts      ← 메뉴 정의 인터페이스
```

### 3.2 메뉴 설정 인터페이스

```typescript
interface StoreDashboardMenuConfig {
  sections: StoreDashboardSection[];
}

interface StoreDashboardSection {
  key: string;           // 'overview' | 'identity' | 'products' | ...
  label: string;         // '대시보드' | '매장 정보' | ...
  icon: string;          // lucide icon name
  path: string;          // relative route
  visible: boolean;      // 서비스별 표시/숨김
  badge?: number;        // 알림 뱃지
}
```

### 3.3 서비스별 적용 방식

각 서비스는 config만 다르게 전달:

```typescript
// services/web-glycopharm
<StoreDashboardLayout config={glycopharmDashboardConfig}>
  <Routes>...</Routes>
</StoreDashboardLayout>

// services/web-k-cosmetics
<StoreDashboardLayout config={cosmeticsDashboardConfig}>
  <Routes>...</Routes>
</StoreDashboardLayout>
```

### 3.4 구현 순서 (제안)

| Phase | 작업 | 예상 |
|-------|------|------|
| **Phase 1** | StoreDashboardLayout + Sidebar 공통 컴포넌트 | operator-core 패키지 확장 |
| **Phase 2** | K-Cosmetics에 먼저 적용 (가장 깔끔) | Store Cockpit 연동 |
| **Phase 3** | GlycoPharm 적용 (메뉴 다수 → 매핑 필요) | 기존 23메뉴 재구성 |
| **Phase 4** | GlucoseView 적용 (최소 메뉴) | 신규 대시보드 생성 |
| **Phase 5** | KPA-a 포털 연동 | Store 존재 시 메뉴 노출 |

---

## 4. Operator vs Store Owner 구분

### 현재 혼재 상태

GlycoPharm은 **Operator** (플랫폼 운영자) 관점이고,
K-Cosmetics Store Cockpit은 **Store Owner** (매장 주인) 관점이다.

이 구분이 중요:

| 역할 | 보는 화면 | 예시 |
|------|----------|------|
| **Operator** | 전체 네트워크 관리 | "약국 50개 전체 매출 ₩2.3억" |
| **Store Owner** | 내 매장 1개 관리 | "우리 약국 이번달 매출 ₩520만" |

### 통합 설계 방향

```
/operator         → Operator Dashboard (네트워크 관리)
/store            → Store Owner Dashboard (내 매장 관리)  ← 이것이 공통화 대상
```

K-Cosmetics의 Store Cockpit (`/operator/store-cockpit`)이
실질적으로 **Store Owner Dashboard** 역할을 하고 있음.

이를 `/store` 경로로 분리하여 모든 서비스에 통일 적용하는 것이 목표.

---

## 5. 결론

### 현재 상태
- GlycoPharm: 가장 많은 메뉴 (23개), Operator 중심
- K-Cosmetics: Store Cockpit이 가장 잘 설계됨, 대부분 Placeholder
- GlucoseView: 매장 대시보드 개념 부재, 환자 관리 중심

### 통합 전략
1. **K-Cosmetics Store Cockpit의 5-Block 모델**을 공통 기준으로 채택
2. **operator-core 패키지에 StoreDashboardLayout** 추가
3. **서비스별 config 주입**으로 메뉴 표시/숨김 제어
4. **Phase 순서**: K-Cosmetics → GlycoPharm → GlucoseView → KPA-a

### 다음 WO
`WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1` — Phase 1 구현

---

*작성일: 2026-02-14*
*기준 코드: commit 852f873fd*
