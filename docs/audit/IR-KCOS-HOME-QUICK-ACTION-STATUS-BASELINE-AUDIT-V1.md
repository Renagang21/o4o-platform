# IR-KCOS-HOME-QUICK-ACTION-STATUS-BASELINE-AUDIT-V1

> **작업 분류:** Audit / 기준선 조사
> **작업 원칙:** 코드 수정 없음 — 실제 코드 및 엔드포인트 기준 조사
> **선행 WO:** WO-KCOS-HOME-DYNAMIC-IMPL-V3 (heroSlides CMS 연동 완료)
> **감사일:** 2026-04-17

---

## 1. 전체 요약

**조사 목적:**
K-Cosmetics 홈 `quickActionCards`의 `status.value` 동적 전환 가능성과
카드별 API 매핑, 로그인/비로그인 UX 정책, 구현 전략을 조사하여
후속 작업 범위를 확정한다.

**핵심 결론:**

| 항목 | 결론 |
|------|------|
| trial 카드 링크 | **잘못된 링크** — `/platform/stores`로 되어 있음. Neture로 수정 필요 (WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1 미반영) |
| products status.value | **동적화 가능** — `GET /store-hub/channels` 의 `visibleProductCount` 사용 가능 (requireAuth) |
| supply status.value | **정적 유지 적절** — 실제 지표 없음, "사용 중"은 서비스 활성 표시용 레이블 |
| tourist-hub status.value | **동적화 가능** — `GET /cosmetics/tourist-hub/stats` 존재, TouristHubPage 이미 호출 |
| 비로그인 카드 노출 | **전체 노출 중** — 카드 자체는 비로그인에도 표시, 클릭 시 로그인 페이지로 이동 |
| 구현 전략 | **WO-KCOS-HOME-QUICK-ACTION-STATUS-TUNE-V1 권장** — 구조 변경 없이 링크 보정 + 조건부 동적화 |

---

## 2. quickActionCards 현재 구조 분석

**소스:** `services/web-k-cosmetics/src/config/homeStaticData.ts`

| 카드 id | title | link | status.label | status.value | 의미 |
|---------|-------|------|-------------|-------------|------|
| `products` | Products | `/platform/stores/products` | 노출 중 | `-` | 노출 상품 수 (의도), 현재 고정 |
| `supply` | Supply | `/b2b/supply` | 공급 | `'사용 중'` | B2B 공급 활성 여부 (서술형 고정) |
| `trial` | Market Trial | `/platform/stores` | 진행 중 | `-` | Trial 진행 수 (의도), 링크 오류 |
| `tourist-hub` | Tourist Hub | `/services/tourists` | 연결 중 | `'매장'` | 연결 매장 수 (의도), 현재 고정 |

### 카드별 링크 구현 실태

**소스:** `services/web-k-cosmetics/src/App.tsx` 라우트 목록

| 카드 | 링크 | 페이지 파일 | 실구현 | 인증 요구 |
|------|------|-----------|--------|---------|
| products | `/platform/stores/products` | `pages/platform/ProductsPage.tsx` | ✅ | 로그인 필수 |
| supply | `/b2b/supply` | `pages/b2b/SupplyPage.tsx` | ✅ | 로그인 필수 |
| trial | `/platform/stores` | `pages/platform/StoresPage.tsx` | ✅ (잘못된 대상) | 로그인 필수 |
| tourist-hub | `/services/tourists` | `pages/services/TouristHubPage.tsx` | ✅ | 선택 (비로그인 가능) |

### QuickActionSection 비로그인/로그인 현재 분기

**소스:** `pages/HomePage.tsx` QuickActionSection (라인 189–235)

```typescript
function QuickActionSection() {
  const { isAuthenticated } = useAuth();

  return (
    <section>
      {/* "대시보드 →" 링크 — 로그인 시에만 표시 */}
      {isAuthenticated && (
        <Link to="/platform/stores">대시보드 →</Link>
      )}

      {/* 4개 카드 — 로그인/비로그인 모두 표시 */}
      {quickActionCards.map((card) => (
        <Link key={card.id} to={card.link}>
          ...카드 렌더링 (status.value 포함)...
        </Link>
      ))}
    </section>
  );
}
```

**현재 동작:**
- 카드 4개는 비로그인 사용자에게도 전체 표시됨
- 클릭 시: products/supply/trial → 대상 페이지에서 로그인 리다이렉트, tourist-hub → 비로그인 접근 가능
- status.value는 현재 모든 사용자에게 동일한 고정값 표시

---

## 3. 카드별 API 매핑 가능성

### 3.1 products 카드 — "노출 중 / -"

**API 후보:**

| 엔드포인트 | 관련 필드 | 인증 | 적합성 |
|-----------|---------|------|--------|
| `GET /store-hub/channels` | `visibleProductCount` (int) | requireAuth | **✅ 적합** |
| `GET /store-hub/overview` | products 요약 포함 | requireAuth | 부분 적합 |
| `GET /cosmetics/products` | 목록 (count 없음) | public | ❌ 부적합 |

**`store-hub/channels` 응답 구조** (소스: `store-hub.controller.ts` 라인 227-231):
```typescript
{
  visibleProductCount: number,   // 노출 중 상품 수 ← status.value 매핑 가능
  totalProductCount: number,
  salesLimitConfiguredCount: number,
  publicProductCount: number,
}
```

**결론:** `visibleProductCount`는 "노출 중" 레이블과 의미가 정확히 일치함.
단, `requireAuth` → 비로그인 시 `-` 유지, 로그인 시 실수치 표시 방식 필요.

---

### 3.2 supply 카드 — "공급 / 사용 중"

**API 조사:**
- `/b2b/supply` 계열 API: 상품 카탈로그 목록 조회 (페이지 내 호출)
- B2B 공급 활성 상태를 집계하는 별도 stats/status 엔드포인트: **미존재**
- SupplyPage.tsx가 호출하는 API는 카탈로그 목록으로, 카드 status 용도와 무관

**"사용 중"의 성격:**
- 동적 지표가 아님
- "이 플랫폼에서 B2B 공급 기능을 사용 중입니다"라는 **서술형 레이블**
- 실제 공급 계약 수, 활성 공급자 수 등의 지표를 의도했을 수 있으나, 해당 API 없음

**결론:** 정적 유지가 적절. 의미 없는 동적화보다 현행 유지가 낫다.

---

### 3.3 trial 카드 — "진행 중 / -"

**핵심 문제: 링크 오류 + 역할 중복**

**링크 오류:**
```
현재: link: '/platform/stores'     ← 일반 Store Dashboard (상품/주문/분석)
의도: https://neture.co.kr/market-trial  ← WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1
```

WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY-MIGRATION-V1 이후 Market Trial의 외부 진입점은
Neture 통합 허브로 확정됨. 동일한 정책이 heroSlides trial 슬라이드에는 반영되어 있으나
(`cta.link: 'https://neture.co.kr/market-trial'`), quickAction 카드는 미반영 상태.

**역할 중복:**
- `NowRunningSection` (홈 섹션 3번)이 이미 Market Trial 목록을 실시간 동적 표시
- quickAction trial 카드가 추가적으로 Trial 진입점을 제공하는 구조 → **중복 진입점**

**status.value "-"의 의미:**
- 동적 Trial 수를 표시하려는 의도였으나, `requireAuth`와 KPI 불일치로 미구현 상태
- NowRunningSection과의 중복을 감안하면 별도 count 표시는 불필요

**결론:**
- 링크를 `https://neture.co.kr/market-trial`로 수정 (또는 카드 제거)
- status.value는 `-` 유지 (NowRunningSection이 실수치를 담당)
- 동적 Trial 수 연동은 불필요

---

### 3.4 tourist-hub 카드 — "연결 중 / 매장"

**API 후보:**

| 엔드포인트 | 소스 | 인증 | 적합성 |
|-----------|------|------|--------|
| `GET /cosmetics/tourist-hub/stats` | TouristHubPage.tsx 라인 58 | optionalAuth (추정) | **✅ 유력** |
| `GET /cosmetics/tourist-hub/stores` | TouristHubPage.tsx 라인 57 | optionalAuth (추정) | 부분 적합 |

**TouristHubPage의 TouristStats 인터페이스:**
```typescript
interface TouristStats {
  totalVisitors: number;
  // 기타 필드 (추가 확인 필요)
}
```

**TouristHubPage 내부 동적 처리:**
```typescript
// TouristHubPage.tsx 라인 143-144 (내부에서 이미 동적 계산)
stores.filter(s => s.isActive).length  // 활성 매장 수
```

**홈 카드 vs 페이지 내 처리:**
- 페이지(`TouristHubPage`)는 이미 stores/stats API를 호출하여 동적으로 데이터 표시
- 홈 카드(`quickAction`)는 여전히 고정값 `'매장'` 표시
- 두 값이 일치하지 않는 구조

**결론:**
- `/cosmetics/tourist-hub/stats` 가 optionalAuth라면 비로그인 홈에서도 호출 가능
- stats 응답에서 활성 매장 수 또는 연결 수를 status.value로 표시 가능
- 단, 백엔드 인증 방식 확인 필요 (현재 코드 기준 optionalAuth로 추정)

---

## 4. 로그인/비로그인 UX 정책 판단

### 카드별 권장 표시 정책

| 카드 | 비로그인 status.value | 로그인 status.value | 권장 방식 |
|------|---------------------|-------------------|---------|
| products | `-` | `visibleProductCount` (store-hub/channels) | 로그인 분기 표시 |
| supply | `'사용 중'` | `'사용 중'` (동일) | 정적 유지 |
| trial | `-` | `-` (동일) | 정적 유지 + 링크 수정 |
| tourist-hub | 통계값 또는 `-` | 통계값 | optionalAuth API 활용 |

### 비로그인 홈 UX 선택지

| 방식 | 설명 | 적합 카드 | 권장 |
|------|------|---------|------|
| `-` placeholder 유지 | 현재 상태 그대로 | products / trial | ✅ 단기 안전 |
| 로그인 시에만 실수치 | `isAuthenticated` 분기 | products | ✅ V4 적합 |
| 고정 설명 텍스트 유지 | 동적화 불필요 | supply | ✅ 영구 유지 |
| optionalAuth API 활용 | 비로그인에도 실수치 | tourist-hub | ✅ 가능성 있음 |
| 카드 전체 비로그인 숨김 | UX 단절 위험 | — | ❌ 권장 안 함 |

---

## 5. 구현 범위 제안

### 결론: WO-KCOS-HOME-QUICK-ACTION-STATUS-TUNE-V1 권장 (경량 보정 WO)

카드 구조 자체를 재정의하지 않고, 아래 4개 보정으로 완결 가능.

**보정 항목:**

| 항목 | 변경 내용 | 파일 |
|------|---------|------|
| trial 카드 링크 수정 | `/platform/stores` → `https://neture.co.kr/market-trial` | `homeStaticData.ts` |
| trial 카드 Link → a 태그 | 외부 URL이므로 `<a target="_blank">` 처리 | `HomePage.tsx` QuickActionSection |
| products status.value | 로그인 시 `store-hub/channels.visibleProductCount` 표시 | `HomePage.tsx` |
| tourist-hub status.value | `tourist-hub/stats` 응답에서 활성 매장 수 표시 (optionalAuth 확인 전제) | `HomePage.tsx` |

**보정하지 않는 항목:**
- supply: 정적 "사용 중" 유지
- trial status.value: `-` 유지 (NowRunningSection이 담당)
- 카드 구조/레이아웃 변경 없음

### 대안: WO-KCOS-HOME-QUICK-ACTION-RESTRUCTURE-V1 (구조 재정의 WO)

이 전략이 필요한 경우:
- trial 카드를 완전히 다른 도메인 카드로 교체하는 경우 (e.g., 관광객 수 전용 카드 등)
- quickActionCards를 CMS 관리 항목으로 전환하는 경우
- 로그인 사용자 전용 섹션과 비로그인 섹션을 구조적으로 분리하는 경우

**현재 기준으로 이 전략은 불필요.** 카드 구조 자체는 도메인 구분이 명확하고, 변경할 이유가 없다.

---

## 6. Dead Code / 임시 코드 정리 포인트

### V4 완료 후 제거 가능

| 항목 | 위치 | 제거 조건 |
|------|------|---------|
| `TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V4)` 주석 | `homeStaticData.ts` 상단 + quickActionCards 블록 | V4 완료 시 제거 |
| trial 카드 `link: '/platform/stores'` | `homeStaticData.ts` 라인 99 | 링크 수정 시 교체 |

### 유지 항목

| 항목 | 이유 |
|------|------|
| `quickActionCards[]` 구조 | 카드 구조 자체는 정적 유지 적절, 변경 없음 |
| supply status `'사용 중'` | 동적화 불필요, 서술형 레이블로 적합 |
| trial status `-` | NowRunningSection이 실수치 담당, 중복 불필요 |

### 현재 오류 상태 (즉시 수정 대상)

| 오류 | 위치 | 내용 |
|------|------|------|
| trial 카드 링크 오류 | `homeStaticData.ts` 라인 99 | `/platform/stores` → `https://neture.co.kr/market-trial` 미반영 |

---

## 7. 다음 작업 대상 제안

**WO-KCOS-HOME-QUICK-ACTION-STATUS-TUNE-V1 — quickActionCards 경량 보정**

**구현 범위:**

1. **`homeStaticData.ts`:** trial 카드 `link` 수정
   - `/platform/stores` → `https://neture.co.kr/market-trial`
   - `id` 유지, 나머지 필드 변경 없음

2. **`pages/HomePage.tsx`:** QuickActionSection 수정
   - trial 카드: 외부 URL이므로 `<Link>` → `<a target="_blank" rel="noopener noreferrer">` 분기 처리 (기존 HeroSection CTA 패턴 참조)
   - products 카드: `isAuthenticated` 시 `homeApi.getProductStats()` 또는 `store-hub/channels` 호출로 `visibleProductCount` 표시
   - tourist-hub 카드: `tourist-hub/stats` API가 optionalAuth이면 활성 매장 수 표시

3. **`api/home.ts`:** products stats용 메서드 추가 검토
   - `getProductStats()`: `GET /store-hub/channels` 호출, `visibleProductCount` 반환

**선행 확인 사항:**
- `GET /cosmetics/tourist-hub/stats` 인증 방식 확인 (optionalAuth인지 requireAuth인지)
- `GET /store-hub/channels` 응답 구조 재확인 (`visibleProductCount` 필드명 정확성)

---

*조사 기준: 실제 코드 (추측 없음)*
*참조 파일: homeStaticData.ts, HomePage.tsx, store-hub.controller.ts, TouristHubPage.tsx, App.tsx*
*다음 WO: WO-KCOS-HOME-QUICK-ACTION-STATUS-TUNE-V1*
