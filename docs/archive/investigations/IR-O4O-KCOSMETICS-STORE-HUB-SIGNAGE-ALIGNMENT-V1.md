# IR-O4O-KCOSMETICS-STORE-HUB-SIGNAGE-ALIGNMENT-V1

**유형:** 구조 결정 IR  
**작성일:** 2026-06-01  
**상태:** 완료  
**코드 변경:** 없음

---

## 핵심 결론

K-Cosmetics `/store-hub/signage`는 **33줄 placeholder** 수준에 머물러 있으며, 이는 **의도적 설계가 아닌 업그레이드 누락**이다.

- K-Cosmetics Hub 탭 중 Blog · Pop · QR · B2B · Content는 모두 `hubContentApi` + DataTable + ActionBar + 가져가기 패턴으로 구현됨
- Signage만 `WO-O4O-STOREHUB-STRUCTURE-ALIGNMENT-V1` 시점에 placeholder 수준으로 추가된 채 방치
- GlycoPharm이 동일한 상황에서 `WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1`으로 완전 해결한 패턴을 그대로 이식 가능
- **Backend API는 이미 완전 지원** — hubContentApi(`SERVICE_KEY='k-cosmetics'`)와 assetSnapshotApi(`/cosmetics/assets/copy`, `assetType='signage'` 허용) 모두 존재

**권장 옵션: Option C (GlycoPharm HubSignageLibraryPage 패턴 이식)**  
Frontend 1개 파일만 교체. Backend 변경 불필요.

---

## 배경: GlycoPharm drift 해결 흐름 참조

K-Cosmetics 상황은 GlycoPharm이 `IR-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-STRUCTURE-DECISION-V1`에서 기록한 pre-fix 상태와 동일하다.

| 단계 | GlycoPharm | K-Cosmetics |
|------|-----------|-------------|
| 현재 signage hub | ❌ redirect (pre-fix) / ✅ canonical (현재) | ❌ 33줄 placeholder |
| blog/pop/qr hub | ✅ 완료 | ✅ 완료 |
| hubContentApi | ✅ | ✅ (k-cosmetics) |
| assetSnapshotApi.copy | ✅ | ✅ (cosmetics) |
| 후속 조치 | WO 완료 | **이번 IR 대상** |

---

## 1. K-Cosmetics Store HUB 탭별 현황

| 탭 | page | API 패턴 | DataTable | 가져가기 | 판정 |
|----|------|-----------|-----------|---------|------|
| B2B | HubB2BPage | b2b catalog API | ✅ | ✅ | 구현 완료 |
| 콘텐츠 | HubContentPage | hubContentApi | ✅ | ✅ | 구현 완료 |
| 블로그 | HubBlogLibraryPage | `hubContentApi.list(sourceDomain='blog')` | ✅ | ✅ | 구현 완료 |
| POP | HubPopLibraryPage | `hubContentApi.list(sourceDomain='pop')` | ✅ | ✅ | 구현 완료 |
| QR | HubQrLibraryPage | `hubContentApi.list(sourceDomain='qr')` | ✅ | ✅ | 구현 완료 |
| **사이니지** | **HubSignagePage (33줄)** | **없음** | **❌** | **❌** | **❌ 미완성** |
| 이벤트 오퍼 | HubEventOffersPage | eventOffers API | ✅ | ✅ | 구현 완료 |

**결론:** 다른 탭은 모두 canonical 패턴을 갖추고 있으나 **사이니지만 예외**.

---

## 2. 현재 K-Cosmetics HubSignagePage 구조

`services/web-k-cosmetics/src/pages/hub/HubSignagePage.tsx` (33줄)

```tsx
export function HubSignagePage() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-8">
      <Monitor className="w-6 h-6 text-pink-600" />
      <h1 className="text-xl font-bold text-slate-800">디지털 사이니지</h1>
      <p className="text-slate-500 text-sm mb-6">
        매장 디스플레이에 활용할 미디어를 탐색합니다.
      </p>
      <a href="/store/marketing/signage/playlist" ...>
        사이니지 관리 보기 →
      </a>
    </div>
  );
}
```

**문제:**
- DataTable 없음 — HUB 자산 탐색 불가
- hubContentApi 없음 — 운영자 제공 사이니지 목록 미수신
- assetSnapshotApi 없음 — 가져가기(copy) 기능 없음
- ActionBar 없음 — 일괄 선택·추가 불가
- Hub 컨텍스트는 유지(layout 내)하나 실질 기능 없음

---

## 3. 참조 canonical 구현 (GlycoPharm)

`services/web-glycopharm/src/pages/hub/HubSignageLibraryPage.tsx` (581줄)

| 항목 | 내용 |
|------|------|
| page | `HubSignageLibraryPage.tsx` |
| DataTable | ✅ `@o4o/operator-ux-core DataTable` |
| checkbox | ✅ `useBatchAction` 멀티선택 |
| ActionBar | ✅ "내 약국에 추가" 일괄 추가 |
| 가져가기 | ✅ `assetSnapshotApi.copy({ sourceAssetId, assetType: 'signage' })` |
| 데이터 소스 | `hubContentApi.list({ sourceDomain: 'signage-media' / 'signage-playlist' })` |
| view tab | 미디어 / 플레이리스트 2탭 |
| producer filter | 전체 / 운영자 / 커뮤니티 |
| BaseDetailDrawer | ✅ row click 상세 |
| 내 매장 연결 | `/store/marketing/signage` |

WO 참조: `WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1`

---

## 4. K-Cosmetics API 클라이언트 준비 상태

### hubContentApi (`/lib/api/hubContent.ts`)

```typescript
const SERVICE_KEY = 'k-cosmetics';

export const hubContentApi = {
  async list(params) {
    searchParams.set('serviceKey', SERVICE_KEY);  // 이미 설정됨
    ...
    return api.get(`/hub/contents?${searchParams}`);
  }
};
```

✅ `serviceKey='k-cosmetics'` 자동 주입. `sourceDomain='signage-media'` / `'signage-playlist'` 즉시 사용 가능.

### assetSnapshotApi (`/api/assetSnapshot.ts`)

```typescript
export const assetSnapshotApi = {
  copy: async (body: CopyAssetRequest) => {
    return api.post('/cosmetics/assets/copy', body);
  },
};

interface CopyAssetRequest {
  sourceAssetId: string;
  assetType: 'cms' | 'signage';  // signage 포함
}
```

✅ `/cosmetics/assets/copy` 엔드포인트 존재.  
✅ `assetType: 'signage'` 인터페이스 이미 정의됨.

---

## 5. Backend 지원 상태

### hubContent API

`GET /api/v1/hub/contents?serviceKey=k-cosmetics&sourceDomain=signage-media` — **공통 endpoint, 서비스 중립**. 추가 backend 작업 불필요.

### cosmetics assets copy API

```typescript
// apps/api-server/src/routes/cosmetics/cosmetics.routes.ts L133
router.use('/assets', createAssetSnapshotController(dataSource, coreRequireAuth));

// asset-snapshot.controller.ts
allowedAssetTypes: ['cms', 'signage', 'lesson', 'content', 'resource', 'blog', 'pop', 'qr'],
```

✅ `signage`가 이미 `allowedAssetTypes`에 포함됨. **Backend 변경 불필요**.

---

## 6. 이식 가능성 분석

| 항목 | GlycoPharm | K-Cosmetics 이식 시 | 변경 필요 |
|------|-----------|---------------------|---------|
| `hubContentApi` | `SERVICE_KEY='glycopharm'` | `SERVICE_KEY='k-cosmetics'` (이미 설정) | 없음 |
| `assetSnapshotApi.copy()` | `/glycopharm/assets/copy` | `/cosmetics/assets/copy` (이미 설정) | 없음 |
| `assetType: 'signage'` | ✅ | ✅ 이미 정의됨 | 없음 |
| 복사 성공 문구 | "내 약국에 추가" | "내 매장에 추가" | 문구 수정 |
| 내 매장 연결 링크 | `/store/marketing/signage` | `/store/marketing/signage/playlist` | 경로 확인 |
| import 경로 | `@/api/assetSnapshot`, `@/api/hubContent` | `@/api/assetSnapshot`, `@/lib/api/hubContent` | 경로 수정 |
| 서비스별 소개 문구 | 약국 컨텍스트 | 매장 컨텍스트 | 문구 수정 |

**결론: frontend 1개 파일(HubSignagePage.tsx → HubSignageLibraryPage.tsx)만 교체. Backend 변경 없음.**

---

## 7. 영향 범위

| 서비스 | 영향 |
|--------|------|
| KPA | 없음 |
| GlycoPharm | 없음 |
| K-Cosmetics | `HubSignagePage.tsx` → `HubSignageLibraryPage.tsx` 교체 |
| Backend | 없음 (API 지원 완료) |
| `operator-core-ui` 공통 패키지 | 없음 |

---

## 8. Current Structure vs O4O Philosophy Conflict Check

### ① K-Cosmetics Store HUB가 매장 실행 자산 탐색·가져가기 공간으로 유지되는가?

- Blog/Pop/QR/B2B/Content: ✅ 유지
- Signage: ❌ placeholder로 탐색·가져가기 기능 없음

### ② placeholder 구조가 HUB 의미를 약화시키는가?

**예.** Store HUB는 "운영자가 준비한 실행 자산을 매장이 탐색·가져가는 공간"이다. 현재 사이니지 placeholder는 링크만 제공해 매장 운영자를 store management area로 내보낸다. 탐색·가져가기 흐름이 없으므로 HUB 철학에 부합하지 않는다.

### ③ KPA/GlycoPharm canonical과 다를 합리적 이유가 있는가?

없음. K-Cosmetics의 Blog/Pop/QR 패턴이 이미 KPA canonical과 동일하게 정렬되어 있다. Signage만 예외로 남길 근거가 없다.

### ④ Neture를 비교 대상에 잘못 포함하는가?

포함하지 않음. Neture는 store-hub 구조를 별도로 운영하며 이번 IR의 비교 대상이 아니다.

### ⑤ 바로 구현할지, lightweight wrapper로 충분한지?

Backend 지원이 완전하고 GlycoPharm 이식 패턴이 검증되어 있으므로, lightweight wrapper 단계 없이 **직접 canonical 이식(Option C)**이 가능하다.

---

## 9. 후속 WO 범위

### Option C — GlycoPharm HubSignageLibraryPage 패턴 이식 (권장)

```
파일: services/web-k-cosmetics/src/pages/hub/HubSignagePage.tsx
  → HubSignageLibraryPage 내용으로 교체 (파일명 유지 또는 rename)

변경 내용:
  1. hubContentApi.list({ sourceDomain: 'signage-media' / 'signage-playlist' }) 추가
  2. assetSnapshotApi.copy({ assetType: 'signage' }) 추가
  3. DataTable + checkbox + ActionBar + BaseDetailDrawer 구성
  4. "내 매장에 추가" 문구 (GlycoPharm: "내 약국에 추가")
  5. 내 매장 연결 링크 → /store/marketing/signage/playlist
  6. import 경로: @/lib/api/hubContent (K-Cosmetics 경로)

App.tsx:
  - 기존 HubSignagePage route 유지 (동일 파일 교체)
  - route 변경 없음

Backend:
  - 변경 없음

선결 조건:
  - 없음
```

**WO 이름**: `WO-O4O-KCOSMETICS-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1`

---

## 읽은 파일 (코드 변경 없음)

- `services/web-k-cosmetics/src/pages/hub/HubSignagePage.tsx`
- `services/web-k-cosmetics/src/pages/hub/HubBlogLibraryPage.tsx`
- `services/web-k-cosmetics/src/pages/hub/HubPopLibraryPage.tsx`
- `services/web-k-cosmetics/src/lib/api/hubContent.ts`
- `services/web-k-cosmetics/src/api/assetSnapshot.ts`
- `services/web-k-cosmetics/src/App.tsx`
- `services/web-glycopharm/src/pages/hub/HubSignageLibraryPage.tsx`
- `services/web-glycopharm/src/api/assetSnapshot.ts`
- `services/web-glycopharm/src/api/hubContent.ts`
- `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts`
- `apps/api-server/src/routes/o4o-store/controllers/asset-snapshot.controller.ts`
