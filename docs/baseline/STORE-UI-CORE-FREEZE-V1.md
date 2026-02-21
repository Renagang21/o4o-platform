# STORE-UI-CORE-FREEZE-V1 — Store UI 구조 기준선

> **Tag**: `store-ui-core-freeze-v1`
> **Date**: 2026-02-21
> **Status**: FROZEN

---

## 1. 현재 구조 (확정)

```
packages/store-ui-core/          ← 공유 Shell (Layout + Menu + Config)
  ├─ layout/StoreDashboardLayout.tsx
  ├─ config/storeMenuConfig.ts
  └─ components/StorePlaceholderPage.tsx

packages/store-core/             ← 공유 Data Engine (Types + KPI + Insights)
  ├─ types.ts
  ├─ store-data.adapter.ts
  ├─ summary.engine.ts
  └─ insights.engine.ts

services/web-glycopharm/         ← 서비스별 페이지 (서비스 내부 유지)
  └─ pages/store/*, pharmacy/*

services/web-kpa-society/
  └─ pages/pharmacy/*

services/web-k-cosmetics/
  └─ pages/store/*, operator/*
```

---

## 2. store-ui-core 패키지 범위 (고정)

### 포함

| Export | 용도 |
|--------|------|
| `StoreDashboardLayout` | 사이드바 + 헤더 Shell (Outlet 기반) |
| `storeMenuConfig` | 8개 고정 메뉴 키 + 서비스별 활성화 설정 |
| `StorePlaceholderPage` | 미구현 메뉴용 플레이스홀더 |
| `COSMETICS_STORE_CONFIG` | K-Cosmetics 메뉴 설정 |
| `GLYCOPHARM_STORE_CONFIG` | GlycoPharm 메뉴 설정 |
| `GLUCOSEVIEW_STORE_CONFIG` | GlucoseView 메뉴 설정 |
| `KPA_SOCIETY_STORE_CONFIG` | KPA Society 메뉴 설정 |

### 제외 (영구)

| 항목 | 사유 |
|------|------|
| 서비스별 페이지 컴포넌트 | 서비스마다 API/비즈니스 로직이 근본적으로 다름 |
| 라우트 설정 | 각 서비스가 다른 페이지를 참조 |
| API 클라이언트 | 서비스별 엔드포인트 다름 |
| 서비스별 타입 | 도메인 데이터 모델 다름 |

---

## 3. Store Core 메뉴 키 (8개 고정)

```typescript
type StoreMenuKey =
  | 'dashboard'   // 대시보드
  | 'products'    // 상품 관리
  | 'channels'    // 채널 관리
  | 'orders'      // 주문 관리
  | 'content'     // 콘텐츠 관리
  | 'signage'     // 사이니지
  | 'billing'     // 정산/인보이스
  | 'settings';   // 설정
```

---

## 4. 서비스별 활성화 매트릭스

| 메뉴 | K-Cosmetics | GlycoPharm | GlucoseView | KPA Society |
|------|:-----------:|:----------:|:-----------:|:-----------:|
| dashboard | O | O | O | O |
| products | O | O | - | O |
| channels | - | - | - | O |
| orders | O | O | - | - |
| content | O | O | - | O |
| signage | - | O | - | - |
| billing | O | - | - | - |
| settings | O | O | O | O |

---

## 5. 금지 사항

- Store 페이지 공통화/추출 시도 금지
- adapter/plugin 패턴 도입 금지
- 서비스별 조건 분기 확장 금지
- 도메인 추상화 과도 확장 금지
- Route 중앙화 시도 금지

---

## 6. 허용 사항

- `StoreDashboardLayout` 버그 수정
- 새 서비스 config 추가 (메뉴 키 범위 내)
- 접근성/성능 개선
- 모바일 반응형 개선

---

## 7. 근거

CLAUDE.md APP 표준화 규칙:
> "서비스별 UI 예외를 허용하지 않는다. UI 차이가 필요하면 APP를 분리한다."

각 서비스의 Store 페이지는 이미 올바르게 분리되어 있다.
공유 Shell(Layout + Config)만 패키지로 추출하는 것이 정확한 구조.

---

*Updated: 2026-02-21*
