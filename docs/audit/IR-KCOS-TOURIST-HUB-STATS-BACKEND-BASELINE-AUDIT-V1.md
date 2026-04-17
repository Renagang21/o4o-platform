# IR-KCOS-TOURIST-HUB-STATS-BACKEND-BASELINE-AUDIT-V1

> **작업 분류:** Audit / 기준선 조사
> **작업 원칙:** 코드 수정 없음 — 실제 코드 및 백엔드 기준 조사
> **선행 WO:** WO-KCOS-HOME-QUICK-ACTION-STATUS-TUNE-V1 (tourist-hub 정적 유지 — 중단 조건 발동)
> **감사일:** 2026-04-17

---

## 1. 전체 요약

**조사 목적:**
K-Cosmetics HomePage `quickActionCards.tourist-hub.status.value`에 사용할 실수치를 위해
`GET /cosmetics/tourist-hub/stats` 및 관련 API의 백엔드 구현 여부와 최소 구현 범위를 확정한다.

**핵심 결론:**

| 항목 | 결론 |
|------|------|
| `/cosmetics/tourist-hub/stores` 구현 | **X — 전무** |
| `/cosmetics/tourist-hub/stats` 구현 | **X — 전무** |
| tourist/tourism 전용 엔티티/테이블 | **X — 없음** |
| TOURIST_HUB 채널 타입 | **X — 존재하지 않음** (B2C/KIOSK/TABLET/SIGNAGE만) |
| 기존 API 대체 가능성 | **제한적** — 연결된 Tourist Hub 매장 수 계산 불가 |
| 구현 전략 | **WO-KCOS-TOURIST-HUB-STATS-BACKEND-IMPL-V1** — 최소 stats 엔드포인트 신설 권장 |

**현재 TouristHubPage는 두 API 모두 404 응답을 받고 있다.**
`Promise.allSettled` 패턴으로 빈 배열/null을 그대로 렌더링하고 있어 화면은 깨지지 않지만, 실질적으로 미완성 상태다.

---

## 2. 프론트 호출 구조

**소스:** `services/web-k-cosmetics/src/pages/services/TouristHubPage.tsx` (라인 56–62)

```typescript
const [storesRes, statsRes] = await Promise.allSettled([
  api.get('/cosmetics/tourist-hub/stores'),
  api.get('/cosmetics/tourist-hub/stats'),
]);

setStores(storesRes.status === 'fulfilled' ? (storesRes.value.data?.data || []) : []);
setStats(statsRes.status === 'fulfilled' ? (statsRes.value.data?.data || null) : null);
```

**기대 응답 인터페이스:**

```typescript
// /cosmetics/tourist-hub/stores 기대값
interface ConnectedStore {
  id: string;
  name: string;
  location: string;
  rating: number;
  visitorCount: number;
  contentCount: number;
  isActive: boolean;
}

// /cosmetics/tourist-hub/stats 기대값
interface TouristStats {
  totalVisitors: number;
  todayVisitors: number;
  weeklyGrowth: number;
  topCountries: { country: string; percentage: number }[];
}
```

**홈 quickActionCard에서 필요한 최소값:**
```typescript
// homeStaticData.ts 현재 상태
status: { label: '연결 중', value: '매장' }  // → 실수치로 대체 대상

// 필요한 값 (예시)
status: { label: '연결 중', value: 12 }      // 연결된 활성 매장 수
```

---

## 3. 백엔드 구현 여부

### 3.1 호출/구현 정합성 표

| 항목 | 프론트 호출 | 백엔드 파일 | 라우트 등록 | 마운트 | 상태 |
|------|-----------|-----------|-----------|-------|------|
| `GET /cosmetics/tourist-hub/stores` | ✅ | ❌ | ❌ | ❌ | **미구현** |
| `GET /cosmetics/tourist-hub/stats` | ✅ | ❌ | ❌ | ❌ | **미구현** |

### 3.2 cosmetics.routes.ts 마운트 현황

**소스:** `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts`

현재 마운트된 주요 라우트 그룹:

| 경로 접두사 | 컨트롤러 | tourist-hub |
|-----------|---------|------------|
| `/` (products, brands) | cosmeticsController | ❌ |
| `/operator` | operatorDashboardController | ❌ |
| `/orders` | cosmeticsOrderController | ❌ |
| `/payments` | cosmeticsPaymentController | ❌ |
| `/stores` | cosmeticsStoreController | ❌ |
| `/store-hub` | storeHubController | ❌ |
| `/community` | cosmeticsCommunityHubController | ❌ |
| **`/tourist-hub`** | **없음** | **❌ 미마운트** |

### 3.3 엔티티/테이블 존재 여부

| 대상 | 존재 여부 | 비고 |
|------|---------|------|
| tourist/tourism 전용 entity 파일 | ❌ | apps/api-server/src/ 전체 grep 결과 없음 |
| tourist_hub DB 테이블 | ❌ | 엔티티 없으므로 테이블도 없음 |
| 관광객 방문 기록 테이블 | ❌ | 없음 |
| `service-templates/tourist-service*.json` | ✅ | 서비스 설정 템플릿만 존재 (엔티티 아님) |

### 3.4 채널 타입 현황

**소스:** `apps/api-server/src/modules/store-core/entities/organization-channel.entity.ts`

```typescript
// 현재 정의된 채널 타입 — 전부
export type OrganizationChannelType = 'B2C' | 'KIOSK' | 'TABLET' | 'SIGNAGE';
```

- `TOURIST_HUB`, `TOURISM`, `TOURIST` 타입 **없음**
- 현재 채널 시스템은 매장 운영 채널만 커버 (온라인/키오스크/태블릿/사이니지)
- 관광객 연결 특화 채널은 설계 및 데이터 모델 자체가 없음

---

## 4. 대체 가능성 및 최소 API 제안

### 4.1 기존 API로 대체 가능한가

| 대안 | API | 설명 | 홈 카드 적합성 |
|------|-----|------|-------------|
| 전체 approved 매장 수 | `GET /cosmetics/stores/admin/all` (requireAuth) | 승인된 cosmetics 매장 전체 수 | ⚠️ "연결된 tourist-hub 매장"과 의미 다름 |
| 채널 수 집계 | `GET /store-hub/channels` | 채널 목록 (TOURIST 없음) | ❌ 관련 없음 |
| store-hub kpi-summary | `GET /store-hub/kpi-summary` | 주문/매출 지표 | ❌ 관련 없음 |

**결론: 기존 API로는 "tourist-hub에 연결된 매장 수"를 직접 표현할 수 없다.**

### 4.2 최소 stats 엔드포인트 제안

홈 카드에서 필요한 것은 **`activeStores` 수치 1개**뿐이다.
TouristHubPage가 원하는 `totalVisitors`, `weeklyGrowth` 등 복잡한 통계는 이 단계에서 불필요하다.

**제안 엔드포인트:**

```
GET /api/v1/cosmetics/tourist-hub/stats
인증: optionalAuth (비로그인 호출 가능)
```

**최소 응답 구조:**
```typescript
interface TouristHubStats {
  activeStores: number;    // 홈 카드 status.value 대상
  // 향후 확장: totalVisitors, weeklyGrowth 등
}

// 응답
{ success: true, data: { activeStores: 12 } }
```

**데이터 소스 후보:**

| 방식 | 데이터 소스 | 마이그레이션 필요 | 의미 정확성 |
|------|-----------|----------------|-----------|
| A. 승인된 cosmetics 매장 수 | `cosmetics_store_applications.status = 'approved'` | ❌ 불필요 | ⚠️ "tourist-hub 전용" 의미 아님 |
| B. 새 `TOURIST_HUB` 채널 타입 추가 | organization_channels enum 확장 | ✅ 마이그레이션 필요 | ✅ 정확 |
| C. 기존 cosmetics stores 중 active 수 | cosmetics_store_applications 조회 | ❌ 불필요 | ⚠️ 근사값 |

**홈 카드 단기 목적: 방식 A 또는 C 권장**

Tourist Hub의 의미(관광객 연결 매장)를 완벽하게 반영하는 데이터 모델은 아직 없으므로,
이번 단계는 **"활성 매장 수"로 근사 표현**하고, 향후 TOURIST_HUB 채널 도입 시 교체하는 전략이 적합하다.

---

## 5. Dead Code / 혼선 요소

| 항목 | 위치 | 내용 |
|------|------|------|
| `api.get('/cosmetics/tourist-hub/stores')` | `TouristHubPage.tsx:57` | 백엔드 미구현 — 항상 rejected |
| `api.get('/cosmetics/tourist-hub/stats')` | `TouristHubPage.tsx:58` | 백엔드 미구현 — 항상 rejected |
| `ConnectedStore` 인터페이스 | `TouristHubPage.tsx:29–37` | 대응 API 없음 — 사문화된 타입 |
| `TouristStats` 인터페이스 | `TouristHubPage.tsx:39–44` | 대응 API 없음 — 사문화된 타입 |
| `status: { value: '매장' }` | `homeStaticData.ts:111` | 정적 텍스트 — 실수치 아님 |

**TouristHubPage 현재 실제 동작:**
- 두 API 모두 404 → `Promise.allSettled` rejected → stores=[], stats=null
- 빈 배열/null 상태에서 CTA 섹션("매장을 등록하세요")만 표시
- 사용자는 empty state를 보게 되며, 관광객 연결 허브로서 기능하지 못함

---

## 6. 구현 범위 제안

### 구현 전략 비교

| 전략 | 범위 | 마이그레이션 | 홈 카드 해결 | 권장 |
|------|------|-----------|-----------|------|
| **A. 최소 stats 엔드포인트** (기존 매장 수) | 백엔드 컨트롤러 1개 + 라우트 마운트 | ❌ 불필요 | ✅ | **권장** |
| **B. TOURIST_HUB 채널 타입 추가** | enum 확장 + migration + UI | ✅ 필요 | ✅ | 중장기 |
| **C. 정적 유지** | 변경 없음 | ❌ | ❌ | 임시 |

### WO-KCOS-TOURIST-HUB-STATS-BACKEND-IMPL-V1 권장 범위

**백엔드:**
1. 파일 신설: `apps/api-server/src/routes/cosmetics/controllers/cosmetics-tourist-hub.controller.ts`
   - `createTouristHubController(dataSource)` 팩토리 함수 (communityHubController 패턴 참조)
   - `GET /tourist-hub/stats` — optionalAuth, 활성 cosmetics 매장 수 반환

2. `cosmetics.routes.ts` 마운트 추가:
   ```typescript
   router.use('/tourist-hub', createTouristHubController(dataSource));
   ```

3. 응답 구조 (최소):
   ```json
   { "success": true, "data": { "activeStores": 12 } }
   ```

**프론트 (별도 WO 또는 같은 WO에서):**
4. `homeApi.getTouristHubStats()` 메서드 추가 → `activeStores` 반환
5. `HomePage.tsx`: `isAuthenticated` 분기 없이 (`optionalAuth`) 홈 로드 시 호출
6. tourist-hub 카드 `status.value` → API 응답 또는 fallback `'매장'`

**참조할 기존 패턴:**
- 컨트롤러 구조: `cosmetics-community-hub.controller.ts`
- DB 쿼리: `cosmetics.routes.ts` 내 storeApplications 집계 쿼리
- 응답 형식: `{ success: true, data: T }`

---

## 7. 다음 작업 대상 제안

**WO-KCOS-TOURIST-HUB-STATS-BACKEND-IMPL-V1 — 최소 stats API 신설 (백엔드 단독)**

**구현 범위:**
1. `cosmetics-tourist-hub.controller.ts` 신설 — `GET /tourist-hub/stats` 1개
2. 응답: `{ activeStores: number }` — 활성 cosmetics 매장 수 집계
3. 인증: `optionalAuth` (비로그인 홈에서 호출 가능)
4. `cosmetics.routes.ts` 마운트 추가
5. 마이그레이션 없음 (기존 테이블 집계)

**이후 후속 WO (별도):**
- `WO-KCOS-HOME-QUICK-ACTION-STATUS-TUNE-V2` — 프론트 tourist-hub 카드 stats 연동
  - `homeApi.getTouristHubStats()` 추가
  - tourist-hub 카드 status.value → `activeStores` 수치

---

*조사 기준: 실제 코드 (추측 없음)*
*참조 파일: TouristHubPage.tsx, cosmetics.routes.ts, organization-channel.entity.ts, store-hub.controller.ts, cosmetics-community-hub.controller.ts*
*다음 WO: WO-KCOS-TOURIST-HUB-STATS-BACKEND-IMPL-V1 (백엔드) → WO-KCOS-HOME-QUICK-ACTION-STATUS-TUNE-V2 (프론트)*
