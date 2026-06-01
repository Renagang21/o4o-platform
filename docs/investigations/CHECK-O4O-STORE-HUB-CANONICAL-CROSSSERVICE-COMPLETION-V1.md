# CHECK-O4O-STORE-HUB-CANONICAL-CROSSSERVICE-COMPLETION-V1

**날짜:** 2026-06-01  
**유형:** read-only 검증  
**목적:** KPA-Society / GlycoPharm / K-Cosmetics Store Hub 하위 영역 KPA canonical 정렬 최종 점검  
**코드 수정:** 없음

---

## 전체 판정: PARTIAL

**핵심 근거:** 7개 영역 중 6개가 3서비스 모두 FULL/FUNCTIONAL. 단 **K-Cosmetics Content 1개만 WRAPPER** 상태로 남아 있음. Signage 포함 모든 영역에 layout 이탈 없음.

---

## 1. 서비스별 Store Hub Route 요약

### KPA-Society
```
/store-hub → Layout > HubGuard > PharmacyHubLayout
  ├─ index    → StoreHubPage
  ├─ b2b      → HubB2BCatalogPage (793줄)
  ├─ signage  → HubSignageLibraryPage (canonical)
  ├─ content  → HubContentLibraryPage
  ├─ blog     → HubBlogLibraryPage
  ├─ pop      → HubPopLibraryPage
  ├─ qr       → HubQrLibraryPage
  └─ event-offers → PharmacyOwnerOnlyGuard > KpaEventOfferPage
```

### GlycoPharm
```
/store-hub → GlycoHubGuard > GlycoPharmHubLayout
  ├─ index    → GlycoStoreHubPage
  ├─ b2b      → HubB2BCatalogPage (368줄)
  ├─ content  → HubContentListPage (ContentHubTemplate 기반, 실데이터)
  ├─ signage  → HubSignageLibraryPage (580줄, canonical)
  ├─ blog     → HubBlogLibraryPage (322줄)
  ├─ pop      → HubPopLibraryPage (324줄)
  ├─ qr       → HubQrLibraryPage (324줄)
  └─ event-offers → HubEventOffersPage (169줄, glycopharmEventOfferApi)
```

### K-Cosmetics
```
/store-hub → KCosmeticsHubGuard > KCosmeticsHubLayout
  ├─ index    → KCosmeticsHubPage
  ├─ b2b      → HubB2BPage (369줄)
  ├─ content  → HubContentPage (32줄 — ⚠️ WRAPPER → /library/content)
  ├─ signage  → HubSignagePage (579줄, canonical)
  ├─ blog     → HubBlogLibraryPage (320줄)
  ├─ pop      → HubPopLibraryPage (320줄)
  ├─ qr       → HubQrLibraryPage (320줄)
  └─ event-offers → HubEventOffersPage (172줄, cosmeticsEventOfferApi)
```

---

## 2. 영역별 Cross-Service Matrix

| 영역 | KPA | GlycoPharm | K-Cosmetics | 전체 판정 |
|------|-----|-----------|------------|---------|
| **Blog** | FULL | FULL | FULL | ✅ ALIGNED |
| **POP** | FULL | FULL | FULL | ✅ ALIGNED |
| **QR** | FULL | FULL | FULL | ✅ ALIGNED |
| **B2B** | FULL | FULL | FULL | ✅ ALIGNED |
| **Content** | FULL | FULL | ⚠️ WRAPPER | ⚠️ PARTIAL |
| **Event Offers** | FULL | FUNCTIONAL | FUNCTIONAL | ✅ ALIGNED |
| **Signage** | FULL | FULL | FULL | ✅ ALIGNED |

---

## 3. 영역별 상태 상세

### Blog — ALIGNED ✅
- KPA: `HubBlogLibraryPage` DataTable + hubContentApi(blog) + importOperatorBlog
- GlycoPharm: `HubBlogLibraryPage` (322줄) DataTable + hubContentApi(blog) + importOperatorBlog
- K-Cosmetics: `HubBlogLibraryPage` (320줄) DataTable + hubContentApi(blog) + importOperatorBlog

### POP — ALIGNED ✅
- KPA: `HubPopLibraryPage` DataTable + hubContentApi(pop) + importOperatorPop
- GlycoPharm: `HubPopLibraryPage` (324줄) DataTable + hubContentApi(pop) + importOperatorPop
- K-Cosmetics: `HubPopLibraryPage` (320줄) DataTable + hubContentApi(pop) + importOperatorPop

### QR — ALIGNED ✅
- KPA: `HubQrLibraryPage` DataTable + hubContentApi(qr) + importOperatorQr
- GlycoPharm: `HubQrLibraryPage` (324줄) DataTable + hubContentApi(qr) + importOperatorQr
- K-Cosmetics: `HubQrLibraryPage` (320줄) DataTable + hubContentApi(qr) + importOperatorQr

### B2B — ALIGNED ✅
- KPA: `HubB2BCatalogPage` (793줄) — 상품 카탈로그 전용, 취급 신청 flow
- GlycoPharm: `HubB2BCatalogPage` (368줄) — B2B 카탈로그 기능
- K-Cosmetics: `HubB2BPage` (369줄) — B2B 카탈로그 기능

### Content — PARTIAL ⚠️
- KPA: `HubContentLibraryPage` — FULL, CMS content + assetSnapshotApi.copy(cms)
- GlycoPharm: `HubContentListPage` (ContentHubTemplate 기반) — FULL, hubContentApi + dashboardCopyApi
- **K-Cosmetics: `HubContentPage` (32줄) — ⚠️ WRAPPER**
  ```tsx
  <a href="/library/content">콘텐츠 라이브러리 보기</a>
  ```
  `/library/content` 경로로 이동 → `ContentLibraryPage` (store 영역). Hub context를 이탈하고 copy/take flow 없음.

### Event Offers — ALIGNED ✅
- KPA: `KpaEventOfferPage` — FULL, PharmacyOwnerOnlyGuard, event offer 신청 flow
- GlycoPharm: `HubEventOffersPage` (169줄) — FUNCTIONAL, `glycopharmEventOfferApi` 기반 실데이터
- K-Cosmetics: `HubEventOffersPage` (172줄) — FUNCTIONAL, `cosmeticsEventOfferApi` 기반 실데이터

### Signage — ALIGNED ✅ (최근 완료)
- KPA: `HubSignageLibraryPage` — FULL, DataTable + ActionBar + assetSnapshotApi.copy(signage)
- GlycoPharm: `HubSignageLibraryPage` (580줄) — FULL, hubContentApi(signage-media/playlist) + assetSnapshotApi.copy
- K-Cosmetics: `HubSignagePage` (579줄) — FULL, hubContentApi(signage-media/playlist) + assetSnapshotApi.copy

---

## 4. serviceKey / sourceDomain / assetType 정합성

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|------------|
| hubContentApi serviceKey | `kpa-society` | `glycopharm` | `k-cosmetics` |
| assetSnapshotApi endpoint | `/kpa/assets/copy` | `/glycopharm/assets/copy` | `/cosmetics/assets/copy` |
| signage sourceDomain | `signage-media`, `signage-playlist` | `signage-media`, `signage-playlist` | `signage-media`, `signage-playlist` |
| blog sourceDomain | `blog` | `blog` | `blog` |
| pop sourceDomain | `pop` | `pop` | `pop` |
| qr sourceDomain | `qr` | `qr` | `qr` |
| signage assetType | `signage` | `signage` | `signage` |
| KPA sourceService hardcoding | `sourceService:'kpa'` (KPA only) | ❌ 없음 | ❌ 없음 |

**판정: ✅** GlycoPharm/K-Cosmetics에 `sourceService:'kpa'` hardcoding 없음.

---

## 5. copy/take flow 정합성

| 영역 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|------------|
| Blog | `importOperatorBlog` | `importOperatorBlog` | `importOperatorBlog` |
| POP | `importOperatorPop` | `importOperatorPop` | `importOperatorPop` |
| QR | `importOperatorQr` | `importOperatorQr` | `importOperatorQr` |
| Signage | `assetSnapshotApi.copy({assetType:'signage'})` | `assetSnapshotApi.copy({assetType:'signage'})` | `assetSnapshotApi.copy({assetType:'signage'})` |
| Content | `assetSnapshotApi.copy({assetType:'cms'})` | `dashboardCopyApi` | ⚠️ 없음 (wrapper) |
| B2B | 취급 신청 전용 | 취급 신청 전용 | 취급 신청 전용 |
| Event Offers | 신청 flow | `glycopharmEventOfferApi` | `cosmeticsEventOfferApi` |

---

## 6. Signage 재확인

| 항목 | GlycoPharm | K-Cosmetics |
|------|-----------|------------|
| route | `/store-hub/signage` → `HubSignageLibraryPage` | `/store-hub/signage` → `HubSignagePage` |
| redirect 제거 | ✅ (이전 `/store/marketing/signage/library` 이탈 제거) | ✅ (이전 static card wrapper 교체) |
| 미디어/플레이리스트 탭 | ✅ | ✅ |
| DataTable + checkbox | ✅ | ✅ |
| ActionBar 일괄 추가 | ✅ | ✅ |
| `assetSnapshotApi.copy` | ✅ `{ sourceAssetId, assetType:'signage' }` | ✅ `{ sourceAssetId, assetType:'signage' }` |
| `sourceService` hardcoding | ✅ 없음 | ✅ 없음 |
| hub layout 유지 | ✅ | ✅ |
| empty state | ✅ "현재 제공되는 사이니지 미디어가 없습니다." | ✅ |
| live API | ✅ HTTP 200 (data:[]) | ✅ HTTP 200 (data:[]) |
| 브라우저 smoke | ✅ PASS (GlycoPharm 약국) | ✅ PASS (K-Cos admin) |

---

## 7. 회귀 여부

최근 GlycoPharm / K-Cosmetics Signage 정렬 작업 후 다른 영역 회귀 확인:

| 영역 | GlycoPharm | K-Cosmetics | 상태 |
|------|-----------|------------|------|
| Blog | route 존재, 322줄 | route 존재, 320줄 | ✅ |
| POP | route 존재, 324줄 | route 존재, 320줄 | ✅ |
| QR | route 존재, 324줄 | route 존재, 320줄 | ✅ |
| B2B | route 존재, 368줄 | route 존재, 369줄 | ✅ |
| Content | route 존재 | route 존재 (wrapper) | ✅ 기존 상태 유지 |
| Event Offers | route 존재, 169줄 | route 존재, 172줄 | ✅ |
| Signage | route 존재, 580줄 | route 존재, 579줄 | ✅ 정렬 완료 |

**판정: 회귀 없음.**

---

## 8. TypeScript 결과

| 서비스 | 결과 |
|--------|------|
| web-kpa-society | 미실행 (변경 파일 없음) |
| web-glycopharm | 기존 오류 없음 확인 (이전 세션) |
| web-k-cosmetics | 기존 오류: `RegisterPage`, `StoreInfoPage`의 `@o4o/account-ui` 문제 — 이번 작업과 무관 |

---

## 9. 브라우저 Smoke

| 서비스 | 영역 | 결과 |
|--------|------|------|
| GlycoPharm | `/store-hub/signage` | ✅ PASS (약국 계정, GlycoPharmHubLayout 유지, DataTable 렌더링) |
| K-Cosmetics | `/store-hub/signage` | ✅ PASS (admin 계정, hub layout 유지, DataTable 렌더링) |
| GlycoPharm | `/store-hub/blog`, `/pop`, `/qr` | ✅ 회귀 없음 |
| K-Cosmetics | `/store-hub/blog`, `/pop`, `/qr`, `/content`, `/b2b`, `/event-offers` | ✅ 회귀 없음 |

---

## 10. 남은 drift

| 항목 | 서비스 | 파일 | 현재 상태 | 영향 |
|------|--------|------|---------|------|
| Content | K-Cosmetics | `HubContentPage.tsx` (32줄) | WRAPPER → `/library/content` | hub context 이탈, copy flow 없음 |

이것이 이번 CHECK에서 확인된 **유일한 남은 drift**.

---

## 11. 후속 WO 후보

**WO-O4O-KCOSMETICS-STORE-HUB-CONTENT-CANONICAL-ALIGNMENT-V1**

- 대상: `services/web-k-cosmetics/src/pages/hub/HubContentPage.tsx`
- 현재: `/library/content`로 이동하는 32줄 wrapper
- 목표: KPA `HubContentLibraryPage` 패턴 이식 (CMS content + copy flow)
- 선결: K-Cosmetics `hubContentApi.list({ sourceDomain:'cms' })` 지원 여부 확인
- 우선순위: 낮음 (6개 영역이 이미 정렬됨, 실사용 영향 제한적)

*검증 수행: Claude Code (2026-06-01)*
