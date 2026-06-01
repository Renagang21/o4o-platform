# CHECK-O4O-GLYCOPHARM-HUBCONTENTAPI-SIGNAGE-SUPPORT-V1

**날짜:** 2026-06-01  
**유형:** read-only 검증  
**목적:** GlycoPharm Store Hub signage KPA canonical 이식 가능성 확인  
**선행:** WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-WRAPPER-V1 (wrapper page 추가 완료)  
**코드 수정:** 없음

---

## 전체 판정: PASS — Option A

**KPA canonical HubSignageLibraryPage 이식이 frontend-only 범위에서 가능하다.**  
Backend / DB / migration 변경 불필요.

---

## 1. hubContentApi — GlycoPharm serviceKey 지원 여부

### Frontend (GlycoPharm)

`services/web-glycopharm/src/api/hubContent.ts`:

```ts
const SERVICE_KEY = 'glycopharm';   // ← 이미 GlycoPharm으로 설정됨

export const hubContentApi = {
  async list(params) {
    searchParams.set('serviceKey', SERVICE_KEY);  // serviceKey=glycopharm 자동 주입
    // ...
    return api.get(`/hub/contents?${searchParams}`);
  }
};
```

**판정: ✅ KPA hardcoding 없음.** GlycoPharm 전용 `SERVICE_KEY = 'glycopharm'` 이미 설정됨.

### Backend

`apps/api-server/src/modules/hub-content/hub-content.service.ts`:

```ts
// VALID_DOMAINS (hub-content.controller.ts)
const VALID_DOMAINS = ['cms', 'signage-media', 'signage-playlist', 'blog', 'pop', 'qr'];

// querySignageMedia: serviceKey 파라미터 기반 쿼리
WHERE m."serviceKey" = $1  // $1 = serviceKey (glycopharm, kpa, 등 범용)
  AND m.source IN ($2, $3, $4)
  AND m.status = 'active'
  AND m.scope = 'global'

// querySignagePlaylists: 동일 패턴
WHERE p."serviceKey" = $1
  AND p.source IN ($2, $3, $4)
  AND p.status = 'active'
  AND p.scope = 'global'
```

**판정: ✅ serviceKey 파라미터 기반, KPA hardcoding 없음.** `serviceKey='glycopharm'`을 넘기면 GlycoPharm 데이터만 반환.

### Live API 확인

```
GET /api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=signage-media&limit=5
→ HTTP 200: {"success":true,"data":[],"pagination":{"page":1,"limit":5,"total":0,"totalPages":0}}

GET /api/v1/hub/contents?serviceKey=glycopharm&sourceDomain=signage-playlist&limit=5
→ HTTP 200: {"success":true,"data":[],"pagination":{"page":1,"limit":5,"total":0,"totalPages":0}}
```

**판정: ✅ 500/404 없음.** `data: []`는 GlycoPharm Hub에 `scope='global'` signage 미등록 상태 반영. 운영자가 signage를 Hub에 게시하면 즉시 표시됨.

---

## 2. assetSnapshotApi.copy() — GlycoPharm signage copy 가능 여부

### GlycoPharm `assetSnapshotApi`

`services/web-glycopharm/src/api/assetSnapshot.ts`:

```ts
interface CopyAssetRequest {
  sourceAssetId: string;
  assetType: 'cms' | 'signage';   // ← 'signage' 지원됨
}

copy: async (body: CopyAssetRequest) => {
  return api.post('/glycopharm/assets/copy', body);
}
```

**판정: ✅ `assetType: 'signage'` 지원.** `/glycopharm/assets/copy` 엔드포인트 존재.

### KPA와의 차이

| 항목 | KPA | GlycoPharm |
|------|-----|-----------|
| copy 엔드포인트 | `/kpa/assets/copy` | `/glycopharm/assets/copy` |
| `sourceService` 파라미터 | ✅ 있음 (`'kpa'` hardcoded) | ❌ 없음 (서비스 전용 endpoint라 불필요) |
| `assetType: 'signage'` | ✅ | ✅ |

**이식 시 수정 필요 사항:** KPA의 `assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId, assetType: 'signage' })` → GlycoPharm의 `assetSnapshotApi.copy({ sourceAssetId, assetType: 'signage' })` — `sourceService` 파라미터 제거만 필요. 단순 변환.

---

## 3. KPA hardcoding 여부

| 위치 | KPA 전용 요소 | GlycoPharm 이식 시 대응 |
|------|-------------|----------------------|
| `HubSignageLibraryPage.tsx` import | `assetSnapshotApi` (KPA) | GlycoPharm 동일 파일 존재 |
| `HubSignageLibraryPage.tsx` import | `hubContentApi` (KPA) | GlycoPharm 동일 파일, `SERVICE_KEY='glycopharm'` |
| `assetSnapshotApi.copy()` 호출 | `sourceService: 'kpa'` 제거 필요 | GlycoPharm API 파라미터 없음 |
| `HUB_PRODUCER_LABELS` | `@o4o/types/hub-content` (공통) | 동일 |
| `SIGNAGE_MEDIA_TYPE_LABELS` | `@o4o/types/signage` (공통) | 동일 |
| DataTable, useBatchAction | `@o4o/operator-ux-core` (공통) | 동일 |
| ActionBar, BaseDetailDrawer | `@o4o/ui` (공통) | 동일 |

**판정: ✅ KPA 전용 hardcoding은 `sourceService: 'kpa'` 한 줄 제거가 전부.**

---

## 4. 현재 wrapper 유지 필요성

현재 `HubSignageLibraryPage` (wrapper, 70줄):
- Store Hub 컨텍스트 유지 ✅
- 기존 signage 기능 진입 ✅ (ContentLibraryPage → /store/marketing/signage/library 링크)
- 실제 hub browsing + 가져가기 없음 (wrapper 수준)

**판정: 단기 유지 가능.** canonical 이식 전까지 UX 컨텍스트를 보존하는 역할로 충분.  
단, **바로 canonical page로 대체 가능** — wrapper 단계를 건너뛰고 WO를 바로 진행해도 됨.

---

## 5. KPA canonical 이식 가능성 판단

**Option A ✅** — backend와 frontend API 모두 `serviceKey` 기반이며 GlycoPharm 이미 설정 완료.

| 조건 | 상태 |
|------|------|
| `hubContentApi` GlycoPharm serviceKey 설정 | ✅ `SERVICE_KEY = 'glycopharm'` |
| backend `querySignageMedia` serviceKey 지원 | ✅ 파라미터 기반 |
| backend `querySignagePlaylists` serviceKey 지원 | ✅ 파라미터 기반 |
| `assetSnapshotApi.copy({ assetType: 'signage' })` | ✅ GlycoPharm 지원 |
| Live API 응답 (signage-media) | ✅ HTTP 200, data:[] (미등록 상태) |
| Live API 응답 (signage-playlist) | ✅ HTTP 200, data:[] (미등록 상태) |
| KPA 전용 hardcoding | ✅ `sourceService:'kpa'` 한 줄 제거만 필요 |
| 공통 패키지 (DataTable, ActionBar 등) | ✅ 이미 GlycoPharm 사용 중 |

**후속 WO:** `WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1`

이식 범위:
- `services/web-glycopharm/src/pages/hub/HubSignageLibraryPage.tsx` 교체 (wrapper → KPA 패턴 이식)
- `assetSnapshotApi.copy()` 호출에서 `sourceService` 파라미터 제거
- 그 외 backend/DB/migration 변경 불필요

---

## 6. 요약

| 항목 | 결과 |
|------|------|
| hubContentApi GlycoPharm serviceKey 지원 | ✅ 이미 설정됨 |
| assetSnapshotApi.copy() signage 지원 | ✅ `assetType:'signage'` 가능 |
| backend endpoint 지원 | ✅ serviceKey 파라미터 기반, KPA hardcoding 없음 |
| Live API 응답 | ✅ HTTP 200 (data:[] — 미등록 상태) |
| KPA hardcoding | ✅ `sourceService:'kpa'` 한 줄 외 없음 |
| wrapper 유지 필요 | 단기 유지 가능, 바로 canonical 교체도 가능 |
| KPA canonical 이식 옵션 | **Option A** — frontend-only, 즉시 WO 가능 |
| 코드 수정 | 없음 |
| commit/push | 본 CHECK 문서만 |

---

## 후속 WO 후보

**WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1**

- 현재 wrapper(`HubSignageLibraryPage` 70줄)를 KPA `HubSignageLibraryPage` 패턴으로 교체
- frontend-only (backend/DB/migration 변경 불필요)
- 변경점: `sourceService: 'kpa'` 제거, GlycoPharm imports 사용
- 전제: GlycoPharm 운영자가 Hub에 signage를 게시해야 실제 데이터 표시 가능

*검증 수행: Claude Code (2026-06-01)*
