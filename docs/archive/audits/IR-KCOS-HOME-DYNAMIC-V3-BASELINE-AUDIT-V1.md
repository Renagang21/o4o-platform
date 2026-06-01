# IR-KCOS-HOME-DYNAMIC-V3-BASELINE-AUDIT-V1

> **작업 분류:** Audit / 기준선 조사
> **작업 원칙:** 코드 수정 없음 — 실제 코드 및 엔드포인트 기준 조사
> **선행 WO:** WO-KCOS-HOME-DYNAMIC-IMPL-V2 (nowRunningItems + partners 동적화 완료)
> **감사일:** 2026-04-17

---

## 1. 전체 요약

**조사 목적:**
WO-KCOS-HOME-DYNAMIC-IMPL-V2 이후 K-Cosmetics 홈에 남아 있는 정적 항목인
`heroSlides`와 `quickActionCards status`의 동적 전환 가능성 조사 및 구현 단위 분리 여부 확정.

**핵심 결론:**
- `heroSlides` → **V3 단독 처리 가능.** CMS API 존재, fallback 처리 포함하면 즉시 구현 가능.
- `quickActionCards status` → **V4 이상으로 분리.** requireAuth + 비로그인 UX 정책 결정이 선행 조건.

---

## 2. 항목별 현 상태 표

| 항목 | API 존재 | 실제 운영 데이터 | 인증 필요 | fallback 필요 | 프론트만으로 가능 | 비고 |
|------|--------|--------------|---------|------------|---------------|------|
| heroSlides | ✅ `GET /cms/slots/hero` | ❓ DB 조회 필요 | optionalAuth (불필요) | ✅ | ✅ | metadata.bgGradient 확인 필요 |
| quickActionCards (카드 구조) | — | — | — | — | ✅ 정적 유지 | 변경 불필요 |
| quickActionCards (status.value) | ✅ `GET /cosmetics/store-hub/kpi-summary` | ❓ DB 조회 필요 | requireAuth **필요** | ✅ | ⚠️ 조건부 | 비로그인 홈 불가, 로그인 분기 필수 |

---

## 3. heroSlides 조사 결과

### 3.1 CMS 응답 구조

엔드포인트: `GET /api/v1/cms/slots/hero?serviceKey=cosmetics&activeOnly=true`
인증: `optionalAuth` (비로그인 호출 가능)

**CmsSlotContent 필드:**
```typescript
interface CmsSlotContent {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  metadata: Record<string, any>;  // bgGradient 등 확장 가능
}
```

**CmsSlot 필드:**
```typescript
interface CmsSlot {
  id: string;
  slotKey: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  content: CmsSlotContent | null;
}
```

### 3.2 HeroSlide ↔ CmsSlot 매핑 가능성

| HeroSlide 필드 | CmsSlot 매핑 경로 | 매핑 가능 | 비고 |
|-------------|----------------|---------|------|
| id | slot.id | ✅ | UUID 직접 사용 |
| title | content.title | ✅ | 직접 매핑 |
| subtitle | content.summary | ✅ | summary → subtitle 대체 |
| bgGradient | metadata.bgGradient | ⚠️ 조건부 | metadata 필드에 bgGradient 키 필요. 없으면 fallback 색상 사용 |
| cta.label | content.linkText | ✅ | 버튼 텍스트 |
| cta.link | content.linkUrl | ✅ | CTA URL |

**현재 정적 슬라이드의 bgGradient 값 (fallback 기본값 후보):**
- main: `#1e293b`
- trial: `#334155`
- tourist: `#475569`
- trust: `#0f172a`

### 3.3 백엔드 slot 필터링 로직

```typescript
// cms-content-slot.handler.ts
const filteredSlots = activeOnly === 'true'
  ? slots.filter(slot => {
      const startsOk = !slot.startsAt || slot.startsAt <= now;
      const endsOk = !slot.endsAt || slot.endsAt >= now;
      const contentPublished = slot.content?.status === 'published';
      return startsOk && endsOk && contentPublished;
    })
  : slots;
```

**중요:** `content.status === 'published'` 조건 → CMS에서 콘텐츠가 published 상태여야 노출됨.

### 3.4 실제 운영 데이터 존재 여부

- **코드로 확인 불가** — DB 직접 조회 필요
- `cms_content_slots` 테이블에 `slotKey='hero'`, `serviceKey='cosmetics'` 레코드가 있어야 함
- **현재 상태 플래그:** "DB 조회 필요"

### 3.5 fallback 전략

CMS 데이터가 없을 경우 (`data.length === 0`):
- 옵션 A: 기존 정적 슬라이드 유지 (권장)
- 옵션 B: HeroSection 미표시 (사용자 경험 단절 위험)

→ **옵션 A 권장:** 데이터 없으면 `homeStaticData.ts`의 `heroSlides[]` fallback 유지.

---

## 4. quickActionCards 조사 결과

### 4.1 StoreHub KPI 응답 구조

엔드포인트: `GET /cosmetics/store-hub/kpi-summary`
인증: `requireAuth` (로그인 필수)

```typescript
interface StoreKpiSummary {
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
  monthRevenue: number;
  avgOrderValue: number;
  lastMonthRevenue: number;
}
```

### 4.2 현재 카드별 status 값과 KPI 매핑 분석

| 카드 | status.label | status.value | KPI 매핑 가능성 | 비고 |
|------|------------|------------|--------------|------|
| products (상품 관리) | 노출 중 | `-` | ❌ (noExposedProducts 없음) | KPI에 상품 노출 수 없음 |
| supply (B2B 공급) | 공급 | `'사용 중'` | ❌ | 텍스트 상태 — KPI 무관 |
| trial (Market Trial) | 진행 중 | `-` | ❌ | Trial 수는 별도 API 필요 |
| tourist-hub (관광객) | 연결 중 | `'매장'` | ❌ | 관광객 연결 지표 없음 |

**결론:** StoreHub KPI 응답 필드(`todayOrders`, `weekOrders` 등)와 현재 카드 status가 **직접 매핑되지 않음.**
의미 있는 연동을 하려면 각 카드 도메인별 별도 API 필요 (상품 노출 수, Trial 진행 수, 관광객 연결 수 등).

### 4.3 홈 비로그인/로그인 현재 처리 구조

```typescript
// QuickActionSection: isAuthenticated 기반 "대시보드" 링크 조건부 표시
const { isAuthenticated } = useAuth();
{isAuthenticated && <Link to="/platform/stores">대시보드 →</Link>}

// CTASection: 비로그인 사용자에게만 CTA 표시
if (isAuthenticated) return null;
```

**현재 status.value:** 로그인/비로그인 구분 없이 동일한 정적 값 표시.

### 4.4 비로그인 UX 옵션

| 옵션 | 설명 | 권장 여부 |
|------|------|---------|
| `-` placeholder 유지 | 현재 상태 그대로 | ✅ 단기 적합 |
| 숨김 (미표시) | 카드 자체 미노출 | ❌ 운영 도구 진입점 사라짐 |
| 로그인 유도 문구 | "로그인 후 확인" | ⚠️ 디자인 변경 필요 |
| 실제 KPI (로그인 시만) | 조건부 렌더링 | 후속 단계로 미룰 것 |

---

## 5. UX 정책 표

| 항목 | 비로그인 사용자 | 로그인 사용자 | 권장 처리 |
|------|------------|-----------|---------|
| heroSlides | CMS 데이터 또는 정적 fallback | CMS 데이터 또는 정적 fallback | CMS 데이터 없으면 정적 유지 |
| quickActionCards (카드 구조) | 전체 카드 표시 | 전체 카드 표시 | 변경 불필요 |
| quickActionCards (status.value) | `-` placeholder | `-` 유지 or 실제 수치 (V4) | V4에서 처리 |

---

## 6. 구현 단위 분리 판단

### V3 범위: heroSlides CMS 연동 (단독)

**근거:**
1. API 이미 존재, 프론트 호출 코드만 추가
2. fallback 정적 슬라이드로 무중단 전환 가능
3. 인증 불필요 → 비로그인 홈 영향 없음
4. 단일 메서드 추가(`getHeroSlides()`) + HeroSection 수정으로 완결

**선행 조건:**
- CMS에 cosmetics hero slot 데이터 등록 여부 확인 (DB 조회 또는 운영자 확인)
- metadata.bgGradient 필드명 확정 (또는 fallback 기본값 설정)

---

### V4 이상: quickActionCards status 동적화 (분리)

**분리 근거:**
1. requireAuth → 비로그인 홈과 충돌
2. KPI 필드와 카드 의미가 직접 매핑되지 않아 별도 설계 필요
3. 카드별 도메인 API (상품 노출 수, Trial 진행 수 등) 조사 필요
4. 로그인/비로그인 분기 UX 정책 결정이 선행 조건

---

## 7. Dead Code / 임시 코드 잔존 목록

### V3 완료 후 제거 가능

| 항목 | 위치 | 제거 조건 |
|------|------|---------|
| `heroSlides[]` 배열 | `homeStaticData.ts` | CMS 연동 완료 + fallback 구조 전환 후 |
| `HeroSlide` 인터페이스 | `homeStaticData.ts` | `home.ts`로 타입 이동 후 |

### V4 이상에서 처리

| 항목 | 위치 | 처리 방향 |
|------|------|---------|
| `quickActionCards[].status.value` 하드코딩 | `homeStaticData.ts` | 로그인 분기 처리 후 정리 |
| `TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V3)` 주석 | `homeStaticData.ts` | V3 완료 시 제거 |

### 유지 항목

| 항목 | 이유 |
|------|------|
| `quickActionCards[]` 카드 구조 | 정적 유지 적절, V4 이상에서도 구조 변경 최소화 예상 |
| HeroSection 슬라이더 컴포넌트 | CMS 연동 후에도 재사용 |
| 정적 heroSlides → fallback 역할 | CMS 데이터 없을 때 fallback |

---

## 8. 다음 작업 대상 제안

**WO-KCOS-HOME-DYNAMIC-IMPL-V3 — heroSlides CMS 연동 (프론트 단독)**

**구현 범위:**
1. `api/home.ts`: `getHeroSlides()` 메서드 추가 (`cmsApi.getSlots('hero')` 호출)
2. `pages/HomePage.tsx`: HeroSection에서 CMS 데이터 또는 fallback 정적 슬라이드 렌더링
3. `homeStaticData.ts`: `heroSlides[]` → fallback 전용으로 유지 (export 유지, TODO 정리)

**선행 확인 사항:**
- CMS에 cosmetics hero slot 데이터가 등록되어 있는지 운영자 확인 필요
- 없다면 V3 구현은 fallback 기준으로 진행 (CMS 데이터 등록 후 자동 전환)

---

*조사 기준: 실제 코드 (추측 없음)*
*DB 데이터 존재 여부: 별도 확인 필요 (코드로 판별 불가)*
*다음 WO: WO-KCOS-HOME-DYNAMIC-IMPL-V3 (heroSlides CMS 연동)*
*이후 WO: WO-KCOS-HOME-DYNAMIC-IMPL-V4 (quickActionCards 인증 분기 동적화)*
