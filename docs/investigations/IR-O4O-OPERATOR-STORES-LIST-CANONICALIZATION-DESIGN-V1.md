# IR-O4O-OPERATOR-STORES-LIST-CANONICALIZATION-DESIGN-V1

**조사 목적:** KPA / GlycoPharm / K-Cosmetics / Neture의 Operator Stores list 구조를 조사하여 공통 wrapper 가능 여부와 Canonical UI/UX 설계 방식을 결정한다.  
**상태:** 조사 완료  
**날짜:** 2026-05-26

---

## 1. 현재 구조 비교표

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture | 판정 |
|------|-----|------------|-------------|--------|------|
| **페이지 파일** | `OperatorStoresPage.tsx` | `StoresPage.tsx` | `StoresPage.tsx` | `StoreManagementPage.tsx` | - |
| **라인 수** | **82줄** | **193줄** | **372줄** | **340줄** | K-Cos/Neture 과잉 |
| **OperatorStoresList 사용** | ✅ 사용 | ✅ 사용 | ❌ 미사용 | ❌ 미사용 | 2서비스 drift |
| **Table 컴포넌트** | DataTable (shared) | DataTable (shared) | 커스텀 DataTable | Raw HTML `<table>` | Neture 최하위 |
| **Route** | `/operator/stores` | `/operator/stores` | `/operator/stores` + `/admin/stores` | `/operator/stores` + `/admin/stores` | K-Cos/Neture 이중 |
| **API serviceKey** | `kpa-society` | `glycopharm` | `k-cosmetics` | `neture` | 동일 패턴 ✅ |
| **컬러 스킴** | slate | primary | pink | primary | 정상 차이 |
| **slug 컬럼** | ❌ | ✅ (override) | ✅ (custom) | ✅ (raw) | 3서비스 공통 |
| **Row click → 상세** | ✅ | ✅ | ✅ | ❌ | Neture 누락 |
| **정렬** | ✅ | ✅ | 부분 (createdAt만) | ❌ | Neture 미구현 |
| **Row selection** | ✅ | ✅ | ❌ | ❌ | K-Cos/Neture 누락 |
| **Stats cards** | ✅ | ✅ | ✅ | ✅ | 전원 보유 |
| **검색** | ✅ | ✅ | ✅ | ✅ | 전원 보유 |
| **페이지네이션** | ✅ | ✅ | ✅ (커스텀) | ✅ (커스텀) | 전원 보유 |

---

## 2. Store Entity / API Shape 비교

### 2-1. 공통 Entity (`OperatorStoreBase` — 전 서비스 공유)

```typescript
interface OperatorStoreBase {
  id: string;
  name: string;
  code: string;
  type: string;            // pharmacy | store | branch
  isActive: boolean;
  address: string | null;
  phone: string | null;
  businessNumber: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  slug: string | null;
  channelCount: number;
  productCount: number;
  createdAt: string;
}
```

### 2-2. 서비스별 extension

| 서비스 | 추가 필드 | 비고 |
|--------|-----------|------|
| KPA | 없음 | 표준 그대로 |
| GlycoPharm | 없음 | slug column override만 |
| K-Cosmetics | 없음 | 컬럼 스타일만 다름 |
| Neture | `addressDetail { zipCode?, baseAddress, detailAddress?, region? }` | 구조화 주소 extension |

### 2-3. API 엔드포인트

**전 서비스 동일:** `GET /api/v1/operator/stores?serviceKey={key}&page=&limit=&sortBy=&sortOrder=&search=`

**응답 구조도 동일:**
```typescript
{
  success: boolean;
  stores: OperatorStoreBase[];
  stats: { totalStores, activeStores, withChannel, withProducts };
  pagination: { page, limit, total, totalPages };
}
```

**결론: API 계층은 이미 완전히 공통화되어 있다.** 4개 서비스가 동일한 backend 엔드포인트를 `serviceKey` 파라미터만 달리 하여 호출한다. Frontend UI만 diverge한 상태다.

---

## 3. UI/UX 비교

### 3-1. 컬럼 구성

| 컬럼 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|------------|-------------|--------|
| 매장명 (type sub) | ✅ | ✅ | ✅ | ✅ |
| 코드 | ✅ | ✅ | ✅ | ✅ |
| Slug | ❌ | ✅ (추가) | ✅ | ✅ |
| 운영자 (email sub) | ✅ | ✅ | ✅ | ✅ |
| 채널 수 | ✅ | ✅ | ✅ | ✅ |
| 상품 수 | ✅ | ✅ | ✅ | ✅ |
| 상태 | ✅ | ✅ | ✅ | ✅ |
| 생성일 | ✅ | ✅ | ✅ | ✅ |
| 네비 (_nav) | ✅ | ✅ | ✅ | ❌ |

**핵심 관찰:** KPA를 제외한 3개 서비스가 slug 컬럼을 표시한다. GlycoPharm은 `OperatorStoresList` column override 패턴으로 추가했다.

### 3-2. Store 유형 레이블

4개 서비스 모두 동일:
- `pharmacy` → 약국
- `store` → 매장
- `branch` → 지점

### 3-3. Row Actions / Detail Surface

| 서비스 | Row click | 상세 Route | Detail Page 존재 |
|--------|-----------|------------|-----------------|
| KPA | ✅ navigate | `/operator/stores/:storeId` | ✅ |
| GlycoPharm | ✅ navigate | `/operator/stores/:storeId` | ✅ |
| K-Cosmetics | ✅ navigate | `/operator/stores/:storeId` | ✅ |
| Neture | ❌ 없음 | `/operator/stores/:storeId` (route 존재) | 확인 필요 |

---

## 4. Capability Gap 분석

### 4-1. K-Cosmetics Gap

| Capability | 상태 | 원인 |
|-----------|------|------|
| Row selection | ❌ 누락 | OperatorStoresList 미사용 |
| 표준 정렬 | 부분 | createdAt만 지원 (toggle 방식 비표준) |
| 표준 페이지네이션 | 부분 | 커스텀 버튼 구현 |

**판정:** Frontend만 교체하면 해결. Backend 작업 불필요.

### 4-2. Neture Gap

| Capability | 상태 | 원인 |
|-----------|------|------|
| Row click → detail | ❌ 누락 | raw HTML table — onclick 없음 |
| 정렬 | ❌ 없음 | raw HTML table — 정렬 미구현 |
| Row selection | ❌ 없음 | raw HTML table — checkbox 없음 |
| DataTable 표준 | ❌ raw `<table>` | 구현 기술 부채 |

**판정:** Frontend 교체로 모두 해결. Backend 작업 불필요.

### 4-3. Capability Matrix

| Capability | KPA | GlycoPharm | K-Cosmetics | Neture |
|-----------|-----|------------|-------------|--------|
| 매장 목록 조회 | ✅ | ✅ | ✅ | ✅ |
| 매장 상세 | ✅ | ✅ | ✅ | △ |
| 매장 상태 변경 | API 있음 | API 있음 | API 있음 | API 있음 |
| 매장 검색 | ✅ | ✅ | ✅ | ✅ |
| 매장 정렬 | ✅ | ✅ | 부분 | ❌ |
| Row selection | ✅ | ✅ | ❌ | ❌ |
| Bulk action | API 있음 | API 있음 | - | - |

---

## 5. Neture 포함 여부 판정

### 핵심 질문: Neture의 "매장"이 다른 서비스의 "매장"과 같은 개념인가?

**증거:**
1. **동일 API 엔드포인트** — `GET /api/v1/operator/stores?serviceKey=neture` 사용
2. **동일 Entity shape** — `OperatorStoreBase` + `addressDetail` extension
3. **동일 store type** — pharmacy / store / branch
4. **동일 메뉴 레이블** — "매장 관리"
5. **동일 terminology** — 매장

Neture가 B2B/Supplier 축이더라도, **매장 관리 Capability는 O4O Store Platform의 공통 기능**이다. Supplier가 자신의 공급망에 연결된 매장을 관리하는 것은 별도 도메인이 아닌 동일 Store Capability의 사용이다.

**판정: Neture 포함 (Option B)**  
API 동일성과 Entity 동일성을 근거로, Neture는 Store Capability 공통화 대상에 포함한다.  
단, Neture `addressDetail` extension은 `OperatorStoresList`의 column override 또는 `extraColumns` 패턴으로 흡수 가능.

---

## 6. Wrapper 후보 비교

### Option A: `OperatorStoresList` 단일 wrapper (현행 확장)

현재 KPA/GlycoPharm이 이미 사용 중인 `OperatorStoresList`에 K-Cosmetics/Neture를 편입.

```
packages/operator-core-ui/src/modules/stores/OperatorStoresList.tsx
  ↑ 이미 존재 (395줄)
  ↑ StoresConfig, StoresApi, OperatorStoreBase 타입 정의 완료
  ↑ DataTable + useStoresQuery + pagination + stats 내장
```

**K-Cosmetics wrapper 예시 (GlycoPharm 패턴 참조):**
```typescript
// services/web-k-cosmetics/src/pages/operator/StoresPage.tsx (목표: ~100줄)
const KCOSMETICS_CONFIG: StoresConfig = {
  serviceKey: 'k-cosmetics',
  colorScheme: 'pink',
  terminology: { store: '매장', stores: '매장 목록' },
  typeLabels: { pharmacy: '약국', store: '매장', branch: '지점' },
};
// slug 컬럼 override 추가
```

**Neture wrapper 예시:**
```typescript
// services/web-neture/src/pages/operator/StoreManagementPage.tsx (목표: ~120줄)
const NETURE_CONFIG: StoresConfig = {
  serviceKey: 'neture',
  colorScheme: 'primary',
  terminology: { store: '매장', stores: '매장 관리' },
  typeLabels: { pharmacy: '약국', store: '매장', branch: '지점' },
};
// slug + addressDetail 컬럼 override 추가
```

**장점:** 최소 변경, 기존 GlycoPharm 패턴 그대로 복제  
**단점:** `OperatorStoresList`에 slug/addressDetail column override 패턴이 추가될 수 있음 (이미 GlycoPharm이 선례)

### Option B: StoresApi adapter + 서비스별 adapter 분리

별도 adapter 파일로 API 호출 로직을 분리.  
현재는 필요 없음 — 모든 서비스가 동일한 `/api/v1/operator/stores` API를 사용하므로 adapter 패턴이 불필요.

**판정:** 과잉 설계. Option A가 충분.

### Option C: K-Cos / Neture Backend 보강 선행

현재 K-Cosmetics/Neture의 gap은 **모두 Frontend 전용 gap**이다. Backend는 4서비스 모두 동일하고 완전하다.

**판정:** Backend 보강 불필요. Option A 직행 가능.

### Option D: 서비스별 유지

K-Cosmetics 372줄, Neture 340줄 유지. 부채 누적.

**판정:** 기술 부채. 장기적으로 비권장.

---

## 7. Canonical 설계안

**권장: Option A — `OperatorStoresList` 단일 wrapper 4서비스 통일**

### 7-1. 목표 구조

```
packages/operator-core-ui/src/modules/stores/
  OperatorStoresList.tsx    ← 기존 유지 (slug column override 지원 확인)
  types.ts                  ← 기존 유지
  useStoresQuery.ts         ← 기존 유지

services/web-kpa-society/src/pages/operator/
  OperatorStoresPage.tsx    ← 이미 완료 (82줄) — 변경 없음

services/web-glycopharm/src/pages/operator/
  StoresPage.tsx            ← 이미 완료 (193줄, slug override) — 변경 없음

services/web-k-cosmetics/src/pages/operator/
  StoresPage.tsx            ← 372줄 → ~100줄 (KPA/GP 패턴 적용)

services/web-neture/src/pages/operator/
  StoreManagementPage.tsx   ← 340줄 → ~120줄 (slug + addressDetail override)
```

### 7-2. `OperatorStoresList` 기능 현황 점검

| 기능 | 현재 지원 | K-Cos 필요 | Neture 필요 |
|------|----------|-----------|------------|
| slug 컬럼 override | ✅ (GP 선례) | ✅ 동일 | ✅ 동일 |
| addressDetail 컬럼 | ❌ 없음 | ❌ 불필요 | △ 선택적 추가 |
| Row click 커스텀 | ✅ | ✅ | ✅ (현재 없음) |
| color scheme (pink) | ✅ | ✅ | - |
| Row selection | ✅ | ✅ (현재 없음) | ✅ (현재 없음) |

**결론:** `OperatorStoresList` 코어 변경 불필요. 서비스별 wrapper에서 slug 컬럼 override만 추가하면 된다.  
Neture의 `addressDetail`은 wrapper에서 optional 추가 컬럼으로 처리.

### 7-3. Detail Surface 결정

Members의 Hybrid Canonical 적용 가능 여부:
- Row click → Drawer: KPA/GP/K-Cos 이미 구현 (route navigate 방식)
- Neture: row click 없음 → wrapper 전환 시 자동 해결

**Drawer 방식 vs Route navigate 방식:**  
현재 4서비스 모두 `/operator/stores/:storeId` route 방식을 사용. Drawer는 Members에서 채택한 방식이지만, Store 상세는 더 많은 필드(채널, 상품, 담당자 등)를 포함하므로 route 방식이 적합.

**판정:** `/operator/stores/:storeId` route navigate 방식 유지. Drawer 전환 불필요.

---

## 8. 후속 WO 제안

### WO-O4O-OPERATOR-STORES-LIST-CANONICALIZATION-V1

**범위:**

| 작업 | 대상 | 방향 |
|------|------|------|
| K-Cosmetics StoresPage 교체 | `web-k-cosmetics/src/pages/operator/StoresPage.tsx` | 372줄 → `OperatorStoresList` wrapper (~100줄) |
| Neture StoreManagementPage 교체 | `web-neture/src/pages/operator/StoreManagementPage.tsx` | 340줄 → `OperatorStoresList` wrapper (~120줄) |
| slug column override | 두 파일 모두 | GlycoPharm 패턴 동일 적용 |

**금지:**
- `OperatorStoresList` 코어 로직 변경 금지
- Backend API 변경 금지
- KPA/GlycoPharm 수정 금지 (이미 완료)
- Store detail page 수정 금지 (별도 WO)

**예상 효과:**
- K-Cosmetics: 372줄 → ~100줄 (-272줄)
- Neture: 340줄 → ~120줄 (-220줄)
- Row selection, 표준 정렬, 표준 페이지네이션 자동 획득
- 코드 중복 ~500줄 제거

**우선순위:** 중 (Members 공통화 완료 후 자연스러운 다음 단계)

---

## 결론 요약

| 서비스 | 현재 상태 | 판정 | 작업 규모 |
|--------|----------|------|----------|
| KPA | ✅ 완료 | 변경 없음 | - |
| GlycoPharm | ✅ 완료 | 변경 없음 | - |
| K-Cosmetics | ❌ 커스텀 DataTable (372줄) | **포함, WO 필요** | 소 |
| Neture | ❌ raw HTML table (340줄) | **포함, WO 필요** | 소 |

**Neture 포함 확정:** API / Entity / Terminology 모두 동일. B2B/Supplier 축이어도 Store Capability는 공통.

**최종 선택: Option A (4서비스 공통 wrapper)**  
기존 `OperatorStoresList` 코어 변경 없이, K-Cosmetics/Neture wrapper만 교체하면 완성.

---

*조사자: Claude Code*  
*선행 완료: CommonEditUserModal Phase 1, KpaEditUserModal 추출, Operator Members list 공통화*
