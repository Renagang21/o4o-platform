# IR-KCOS-HOME-DYNAMIC-V2-BASELINE-AUDIT-V1

> **작업 분류:** Audit / 기준선 조사
> **작업 원칙:** 코드 수정 없음 — 실제 코드 및 엔드포인트 기준 조사
> **선행 WO:** WO-KCOS-HOME-DYNAMIC-IMPL-V1 (notices CMS 연동 완료)
> **감사일:** 2026-04-17

---

## 1. 전체 요약

**조사 목적:**
WO-KCOS-HOME-DYNAMIC-IMPL-V1 이후 `homeStaticData.ts`에 남아 있는 4개 정적 블록(heroSlides / quickActionCards / nowRunningItems / partners)의 API 연결 가능성 확인.

**핵심 발견:**
- `nowRunningItems` → Market Trial API 즉시 연동 가능 (백엔드 수정 없음)
- `partners` → Community Sponsors API 즉시 연동 가능 (백엔드 수정 없음)
- `heroSlides` → CMS hero slot API 이미 존재, 프론트 호출 코드만 추가하면 됨
- `quickActionCards` status 값 → StoreHub KPI API 존재하나 인증 필요 (비로그인 홈 적용 불가)

---

## 2. 항목별 현 상태 표

| 항목 | 현재 데이터 원천 | 실제 API 존재 여부 | 인증 필요 | 프론트만으로 가능 | 분류 |
|------|---------------|-----------------|---------|----------------|------|
| heroSlides | homeStaticData.ts 하드코딩 | `GET /api/v1/cms/slots/hero` ✅ | optionalAuth (불필요) | **가능** | A |
| quickActionCards (카드 구조) | homeStaticData.ts 하드코딩 | 없음 (구조 자체는 정적 유지) | — | 정적 유지 | B |
| quickActionCards (status 값) | homeStaticData.ts 하드코딩 | `GET /cosmetics/store-hub/kpi-summary` ✅ | requireAuth **필요** | 비로그인 홈 불가 | B |
| nowRunningItems | homeStaticData.ts 하드코딩 | `GET /api/market-trial?serviceKey=cosmetics` ✅ | optionalAuth (불필요) | **가능** | A |
| partners | homeStaticData.ts 하드코딩 | `GET /cosmetics/community/sponsors` ✅ | public (불필요) | **가능** | A |

---

## 3. 각 항목 상세 조사

### 3.1 heroSlides

**현재 상태:** `homeStaticData.ts` 내 4개 슬라이드 하드코딩 (bgGradient, title, subtitle, CTA)

**실제 API:**
- 엔드포인트: `GET /api/v1/cms/slots/hero?serviceKey=cosmetics&activeOnly=true`
- 구현 위치: `cms-content-slot.handler.ts` (기존 핸들러)
- K-Cosmetics `cms.ts`에 이미 `cmsApi.getSlots('hero')` 메서드 존재

**제한사항:**
- 현재 CMS에 cosmetics hero slot 데이터가 실제로 등록되어 있는지 별도 확인 필요
- 데이터가 없으면 빈 배열 반환 → fallback으로 정적 슬라이드 유지 필요

**분류: A — 기존 API로 전환 가능. fallback 처리 포함.**

---

### 3.2 quickActionCards

**현재 상태:** 4개 카드의 `status.value`가 하드코딩 (`24`, `'사용 중'`, `3`, `'매장'`)

**실제 API:**
- 엔드포인트: `GET /cosmetics/store-hub/kpi-summary`
- 구현 위치: `storeHub.ts` `fetchStoreKpiSummary()` 함수 이미 존재
- 반환 필드: `todayOrders`, `weekOrders`, `monthOrders`, `monthRevenue`, `avgOrderValue`, `lastMonthRevenue`

**제한사항:**
- `requireAuth` 적용 — 비로그인 홈에서는 호출 불가
- 로그인 사용자에게만 실제 수치 표시 가능
- 비로그인 사용자에게는 카드 구조만 표시하거나 `-` placeholder 표시

**분류: B — 프론트 조합으로 임시 전환 가능. 로그인/비로그인 분기 처리 필요.**

---

### 3.3 nowRunningItems

**현재 상태:** 3개 항목 하드코딩 (Trial / 신상품 / 캠페인)

**실제 API:**
- 엔드포인트: `GET /api/market-trial?serviceKey=cosmetics&status=open`
- 구현 위치: `marketTrialController.ts` `getTrials()` 메서드
- serviceKey 필터 코드:
  ```typescript
  if (serviceKey && typeof serviceKey === 'string') {
    qb.andWhere(`trial."visibleServiceKeys" @> :serviceKeys::jsonb`,
      { serviceKeys: JSON.stringify([serviceKey]) });
  }
  ```
- 인증: `optionalAuth` (비로그인 호출 가능)

**제한사항:**
- `visibleServiceKeys`에 `cosmetics`가 포함된 trial 데이터가 실제로 있어야 표시됨
- 데이터가 없으면 빈 배열 → "진행 중인 프로그램이 없습니다" 표시

**분류: A — 즉시 연동 가능. `api/home.ts`에 메서드 1개 추가.**

---

### 3.4 partners

**현재 상태:** 5개 브랜드 하드코딩 (COSRX, Innisfree 등)

**실제 API:**
- 엔드포인트: `GET /cosmetics/community/sponsors`
- 구현 위치: `cosmetics-community-hub.controller.ts`
- 인증: public (인증 없음)
- 반환: `{ success: true, data: { sponsors: CommunitySponsor[] } }`

**제한사항:**
- Community Hub에 sponsors 데이터가 등록되어 있어야 함
- 없으면 빈 배열 → PartnerTrustSection 미표시

**분류: A — 즉시 연동 가능. `api/home.ts`에 메서드 1개 추가.**

---

## 4. KPA 참조 구조 비교 표

| K-Cosmetics 항목 | KPA 참조 블록 | 참조 가능 수준 | 수정 필요 사항 |
|----------------|-------------|------------|-------------|
| heroSlides | 없음 (KPA는 hero ad 기반) | 낮음 | cmsApi.getSlots('hero') 직접 호출 |
| quickActionCards | 없음 (KPA 홈에는 Quick Action 없음) | 없음 | 독자 구현 (storeHub KPI) |
| nowRunningItems | 없음 (KPA는 EducationSection) | 낮음 | market-trial API 직접 호출 |
| partners | `SponsorBar.tsx` + `communityApi.getSponsors()` | **높음** | `/cosmetics/community/sponsors` 바로 사용 가능 |

**KPA의 `prefetchAll()` 패턴 (참조용):**
```typescript
// kpa/api/home.ts
Promise.allSettled([
  apiClient.get('/home/notices'),      // ← V1에서 완료
  communityApi.getHeroAds(),           // ← V2: /cosmetics/community/ads 유사
  communityApi.getSponsors(),          // ← V2: /cosmetics/community/sponsors ✅
  // market-trial은 KPA 홈에 없음     // ← V2: /market-trial?serviceKey=cosmetics
])
```

---

## 5. 인증 요구사항 확인

| 엔드포인트 | 인증 미들웨어 | 토큰 필요 | 비로그인 홈 적용 |
|----------|-----------|---------|-------------|
| `GET /cms/slots/hero` | optionalAuth | 불필요 | ✅ 가능 |
| `GET /cosmetics/community/sponsors` | public | 불필요 | ✅ 가능 |
| `GET /market-trial?serviceKey=cosmetics` | optionalAuth | 불필요 | ✅ 가능 |
| `GET /cosmetics/store-hub/kpi-summary` | requireAuth | **필요** | ❌ 불가 |

---

## 6. Dead Code / 임시 코드 잔존 목록

### V2 완료 후 제거 대상

| 항목 | 위치 | 제거 조건 |
|------|------|---------|
| `heroSlides[]` 배열 | `homeStaticData.ts` | CMS hero slot 연동 완료 후 |
| `nowRunningItems[]` 배열 | `homeStaticData.ts` | market-trial API 연동 완료 후 |
| `partners[]` 배열 | `homeStaticData.ts` | community sponsors API 연동 완료 후 |
| `quickActionCards[].status.value` 하드코딩 | `homeStaticData.ts` | KPI API 로그인/비로그인 분기 처리 완료 후 |

### V2 이후에도 유지 가능한 항목

| 항목 | 이유 |
|------|------|
| `quickActionCards[]` 카드 구조 자체 | 운영자 관리 콘텐츠로 대체 계획 없음, 정적 유지 적절 |
| HeroSection 슬라이더 컴포넌트 구조 | CMS slot 연동 후에도 재사용 |

### TODO 주석 현황

`homeStaticData.ts` 내 TODO 주석:
- `// TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V2): heroSlides → CMS slots('hero') 연동` ← **실제 API 존재, V2에서 처리 가능**
- `// TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V2): nowRunningItems → market-trial / product API 연동` ← **실제 API 존재, V2에서 처리 가능**
- `// TODO(WO-KCOS-HOME-DYNAMIC-IMPL-V2): partners → CMS slot 또는 파트너 API 연동` ← **Community Sponsors API 존재, V2에서 처리 가능**

---

## 7. API 가능성 최종 분류

### A. 기존 API로 즉시 전환 가능 (백엔드 수정 없음)

1. **nowRunningItems** → `GET /market-trial?serviceKey=cosmetics&status=open`
   - `api/home.ts`에 `getRunningTrials()` 메서드 추가
   - 예상 코드:
     ```typescript
     async getRunningTrials(limit = 3): Promise<NowRunningItem[]> {
       const res = await api.get('/market-trial', {
         params: { serviceKey: 'cosmetics', limit }
       });
       return (res.data?.data || []).map((t: any) => ({
         id: t.id,
         type: 'trial' as const,
         title: t.title,
         supplier: t.supplierName,
         deadline: t.recruitEndDate ? new Date(t.recruitEndDate).toLocaleDateString('ko-KR') : undefined,
         participants: t.currentParticipants,
         link: `https://neture.co.kr/market-trial/${t.id}`,
       }));
     }
     ```

2. **partners** → `GET /cosmetics/community/sponsors`
   - `api/home.ts`에 `getPartners()` 메서드 추가

3. **heroSlides** → `GET /cms/slots/hero?serviceKey=cosmetics`
   - `api/home.ts`에 `getHeroSlides()` 메서드 추가
   - fallback: CMS 데이터 없으면 정적 슬라이드 유지

### B. 프론트 조합으로 임시 전환 가능

4. **quickActionCards status 값** → `GET /cosmetics/store-hub/kpi-summary`
   - 로그인한 사용자에게만 실제 KPI 수치 표시
   - 비로그인 사용자는 `-` 또는 카드 구조만 표시

### C. 백엔드/API 보강 없이는 불가 (이번 범위 없음)

- 없음. 남은 모든 항목은 A 또는 B로 처리 가능.

---

## 8. 구현 우선순위 표

| 항목 | 우선순위 | 이유 |
|------|--------|------|
| nowRunningItems | **HIGH** | 즉시 연동 가능, UX 효과 가장 큼 (진행 중인 프로그램 실시간 반영) |
| partners | **HIGH** | 즉시 연동 가능, 운영자 CMS 관리 가능해짐 |
| heroSlides | **MEDIUM** | CMS slot 데이터가 없으면 fallback 필요, 콘텐츠 등록 선행 필요 |
| quickActionCards | **LOW** | 인증 필요 + 비로그인 홈 적용 복잡, 효과 대비 비용 높음 |

---

## 9. 다음 작업 대상 제안

**WO-KCOS-HOME-DYNAMIC-IMPL-V2 — nowRunningItems + partners 동적화 (프론트 단독)**

**이유:**
1. 백엔드 수정 없이 즉시 연동 가능한 항목 2개 (nowRunningItems + partners)
2. `api/home.ts`에 메서드 2개 추가 + `homeStaticData.ts` 해당 배열 제거로 완결
3. heroSlides는 CMS 데이터 등록이 선행되어야 하므로 별도 진행 권장
4. quickActionCards는 인증 분기 복잡도로 후순위

**구현 범위:**
- `api/home.ts`: `getRunningTrials()`, `getPartners()` 추가
- `homeStaticData.ts`: `nowRunningItems[]`, `partners[]` 제거
- `pages/HomePage.tsx`: 해당 섹션 컴포넌트 API 연동

---

*조사 기준: 실제 코드 및 백엔드 엔드포인트 (추측 없음)*
*다음 WO: WO-KCOS-HOME-DYNAMIC-IMPL-V2*
