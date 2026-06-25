# IR-O4O-KPA-STORE-QR-TARGET-SCOPE-AUDIT-V1

> 조사 대상: `https://kpa-society.co.kr/store/marketing/qr` — 매장 경영자 QR 생성 대상 범위 불일치
> 조사일: 2026-06-25 / 범위: KPA 우선 (GP/KCos 공통화는 후속 분리)

---

## 1. 결론

- **원인:**
  매장 측 QR 생성 화면(`StoreQRPage`)이 QR 연결 대상을 **`store_execution_assets` 단일 소스로만** 고르도록 묶여 있고, 그나마도 `StoreAssetSelectorModal` 호출에 `usageType="qr"` 가 박혀 있어 **`usage_type='qr'` 로 태깅된 자산만** 노출된다. 게다가 빈 상태 CTA는 모달을 직접 열지 않고 `/store/library/resources`(내 자료함)로 **이동**시킨다. 그 결과 사용자에게는 "내 자료에서 만들기" 동선만 보인다.

- **핵심 불일치(백엔드는 더 넓다):**
  백엔드 QR 랜딩(`/qr/public/:slug`)은 이미 **`landingType` 4종(product / page / video / link)** 을 해석한다.
  - `page` → `kpa_contents`(콘텐츠 허브) inline 렌더 지원 (`pageContent`)
  - `video` → `store_videos`(매장 동영상 사본) 지원
  - `product` → `supplier_product_offers` / listing
  - `link` → 외부 URL
  즉 **콘텐츠 / 내 매장 제작자료(동영상)는 이미 QR 대상이 될 수 있는데**, 매장 측 생성 UI가 이 경로들을 한 화면에 노출하지 않는다. (콘텐츠 허브 picker는 운영자 측 `ContentHubPickerModal` 에만 존재하고, 동영상은 `PharmacyVideoPage` → prefill 별도 진입으로만 가능.)

- **수정 필요 범위:**
  주로 **프론트(매장 QR 생성 진입·선택 UX)**. 백엔드는 대부분 이미 지원하므로 신규 API는 최소. 단 "콘텐츠 허브 항목을 매장이 직접 QR 대상으로 고르는" 동선은 매장 측에 picker가 없어 **프론트 신규(또는 운영자 picker 재사용) + 권한 확인**이 필요.

---

## 2. 현재 데이터 흐름

### 2-1. 생성 흐름 (매장 측)

```
/store/marketing/qr  (StoreQRPage.tsx)
│
├─ [빈 상태 CTA 3개]  (StoreQRPage.tsx:781-799)
│   ├─ "매장 HUB에서 QR 가져오기"  → <Link to="/store-hub/qr">      (운영자 QR 템플릿 복사 동선)
│   ├─ "내 자료에서 QR 만들기"     → <Link to="/store/library/resources">  ← 페이지 이탈
│   └─ "외부 URL QR 만들기 (준비 중)" → disabled
│
├─ [헤더 상시] "매장 HUB에서 가져오기" → <Link to="/store-hub/qr>   (StoreQRPage.tsx:471)
│
├─ StoreAssetSelectorModal  (StoreQRPage.tsx:1007, usageType="qr" 고정)
│   └─ setShowSelector(true) 호출처: 생성폼 "자료 변경" 버튼 1곳뿐 (StoreQRPage.tsx:618)
│       → 즉 신규 생성을 모달에서 직접 시작하는 1차 버튼이 없음
│
└─ 자동 prefill 2종 (router state)
    ├─ 내 자료함 → "제작 시작" → QR (production.source.items[origin='library'])  (StoreQRPage.tsx:162-194)
    └─ 동영상 페이지 → "QR 생성" (prefillVideo, landingType='video')           (StoreQRPage.tsx:198-213)
```

### 2-2. 선택 모달이 조회하는 소스

```
StoreAssetSelectorModal (usageType="qr")
→ getStoreExecutionAssets({ usageType:'qr' })          (storeExecutionAssets.ts:90)
→ GET /api/v1/kpa/store/assets?usage_type=qr
→ store-execution-assets.controller.ts:51
    qb.where(organizationId).andWhere(isActive)
      .andWhere(item.usageType = 'qr')   ← 여기서 범위 축소
→ store_execution_assets 테이블만
```

### 2-3. 저장 / 랜딩 흐름

```
handleCreate (StoreQRPage.tsx:277)
→ createStoreQrCode({ libraryItemId, landingType, landingTargetId, slug })
→ POST /api/v1/kpa/pharmacy/qr
→ store-qr-landing.controller.ts:667 → store_qr_codes insert
   (libraryItemId 있으면 recordDerivations: source=store_execution_asset → derived=qr_code)

스캔 시:
GET /qr/public/:slug → store-qr-landing.controller.ts:69
  landingType='product' → supplier_product_offers / listing
  landingType='page'    → kpa_contents inline (ready/published 만, pageContent)
  landingType='video'   → store_videos (동일 org 사본)
  landingType='link'    → 외부 URL redirect
```

### 2-4. autoLandingType 매핑 (StoreQRPage.tsx:70)

```ts
external-link → 'link'
file / content → 'page'
```
→ 저장 자체는 `file / content / external-link` 모두 처리 가능. **병목은 "무엇을 고를 수 있게 보여주는가"** 에 있음.

---

## 3. 빠지는 대상

| 대상 | 현재 노출 여부 | 원인 |
|---|:---:|---|
| **콘텐츠** (콘텐츠 허브 `kpa_contents`) | ❌ (간접·제한) | 매장 측 생성 UI에 콘텐츠 허브 picker 없음. 콘텐츠 허브 항목이 `store_execution_assets(assetType='content')` 로 복사되어 있고 `usage_type='qr'` 로 태깅된 경우에만 모달에 보임. 콘텐츠 허브 직접 선택 동선 없음 (운영자 `ContentHubPickerModal` 만 존재). 백엔드 랜딩은 `landingType='page'` + `landingTargetId=kpa_contents.id` 를 이미 지원 |
| **자료** (`store_execution_assets` file/external-link) | △ 부분 노출 | 모달은 store_execution_assets를 보여주지만 `usageType="qr"` 필터로 **`usage_type='qr'` 태그가 없는 자료는 누락**. 빈 상태에서는 모달을 직접 열지 않고 `/store/library/resources` 로 이탈 |
| **내 매장 제작자료** (동영상 `store_videos`, 생성물 `sourceType='generated'` 등) | △ 분절 | 동영상은 `PharmacyVideoPage` → prefill 별도 경로로만 가능(QR 페이지 선택 모달엔 없음). 생성형 제작물(POP PDF 등 `store_execution_assets(sourceType='generated')`)은 `usage_type='qr'` 태깅된 경우에만 보임. `kpa_store_contents`(매장 직접 편집 콘텐츠)는 QR 랜딩 미해석 → 대상 불가 |

> 요약: "자료"는 **필터 때문에 부분 누락**, "콘텐츠"는 **picker 부재로 직접 선택 불가**, "내 매장 제작자료"는 **경로가 분절**되어 한 화면에 모이지 않음.

---

## 4. 최소 수정안

> 단계적. A → (B) → C 순. KPA 우선.

### A안 — 프론트 최소 수정 (즉시, 1차)
1. **빈 상태 + 헤더에 "QR 만들기" 1차 버튼 추가** → `setShowSelector(true)` 로 **모달을 직접 오픈** (현재 `/store/library/resources` 이탈 동선을 보완. 기존 가져오기/이탈 링크는 보조로 유지 가능).
2. **`StoreAssetSelectorModal` 의 `usageType="qr"` 제거 또는 완화** (StoreQRPage.tsx:1011).
   - QR은 file/content/external-link 모두 연결 가능하므로 `usageType` 미지정(전체)이 의미상 타당.
   - 단, 전체 노출 시 "QR로 연결 불가한 자산"이 섞이지 않는지 확인 필요 → 현재 store_execution_assets는 전부 file/content/external-link 중 하나라 `autoLandingType` 로 안전 변환 가능. **risk 낮음.**
3. 효과: "자료 부분 누락" + "내 자료로만 보이는 UX" 해소. **단 콘텐츠 허브/동영상 직접 선택은 아직 미해결.**

### B안 — 선택 모달 source 탭 확장 (2차, UX 정합)
`StoreAssetSelectorModal` 에 source 탭 추가 (현재는 assetType 칩만 존재):

| 탭 | 데이터 출처 | landingType 매핑 |
|---|---|---|
| 자료 | `store_execution_assets` (file/external-link) | file→page, external-link→link |
| 콘텐츠 | `kpa_contents` (status='ready') via 콘텐츠 허브 조회 | page (landingTargetId=content.id) |
| 내 매장 제작자료 | `store_videos` 사본 + `store_execution_assets(sourceType='generated')` | video / page |
| 링크 | external-link 자료 또는 직접 URL(준비 시) | link |

→ 콘텐츠 탭은 **운영자 `ContentHubPickerModal` 패턴 재사용** (이미 `contentHub.ts` 클라이언트 존재, `listContentHubItems({status:'ready'})`). 매장 권한에서 `/api/v1/kpa/contents` 접근 가능 여부 확인 필요(§5).

### C안 — "가져오기=복사" 원칙 정합 판단 (설계 결정 필요)
콘텐츠 허브 항목을 QR 대상으로 삼을 때 두 가지 방식이 가능:
- **(C-1) 참조형** — `landingType='page'`, `landingTargetId=kpa_contents.id` 로 바로 저장. 백엔드 이미 지원. **복사 없음** → "가져오기=복사" 원칙과 별개로 QR은 "연결 대상 저장"이므로 충돌하지 않음. **권장 (최소 변경).**
- **(C-2) 복사형** — 콘텐츠를 `store_execution_assets(assetType='content')` 로 복사 후 그 id를 libraryItemId로. 매장 사본 생성이 필요한 경우에만. derivation 기록 패턴(`recordDerivations`) 존재.

> QR 본질은 "연결 대상 저장"(StoreQRPage.tsx:446 GuideBlock 명시)이므로 **C-1(참조형) 권장**. 운영자 원본 vs 매장 사본 혼동을 피하려면, 콘텐츠 탭은 "운영자 원본을 직접 가리키는 참조"임을 UX에 명시.

---

## 5. 백엔드 수정 필요 여부

| 항목 | 필요 여부 | 비고 |
|---|:---:|---|
| QR 저장 (`POST /pharmacy/qr`) | ❌ 불필요 | landingType/landingTargetId 임의 저장 가능 |
| QR 랜딩 page(콘텐츠) 렌더 | ❌ 불필요 | `kpa_contents` inline 이미 구현 (ready/published) |
| QR 랜딩 video 렌더 | ❌ 불필요 | `store_videos` 사본 이미 구현 |
| `store/assets` usage_type 필터 | ❌ 불필요 | 프론트에서 usageType 미전달하면 전체 반환 |
| **매장 권한의 콘텐츠 허브 목록 조회** | ⚠️ 확인 필요 | `/api/v1/kpa/contents` 가 현재 **운영자 권한** 가정일 가능성. 매장 경영자(`requirePharmacyOwner`)가 ready 콘텐츠 목록을 picker로 조회 가능한지 권한 확인. 불가 시 매장용 read-only 목록 엔드포인트(예: `/store/contents?status=ready`) 신규 |
| `kpa_store_contents` QR 대상화 | 판단 보류 | 매장 직접 편집 콘텐츠는 현재 QR 랜딩 미해석. 필요 시 별도 WO |

→ **백엔드 핵심 작업은 "콘텐츠 허브 목록의 매장 측 조회 권한" 1건**으로 수렴. 나머지는 프론트.

---

## 6. 권장 작업 순서

1. **(A안)** StoreQRPage 빈 상태/헤더에 "QR 만들기" 버튼 → 선택 모달 직접 오픈 + `usageType="qr"` 제거. → "자료 누락 + 좁은 UX" 즉시 해소.
2. **(§5 확인)** `/api/v1/kpa/contents` 매장 권한 조회 가능 여부 검증 (JSON 디버그/직접 호출).
3. **(B안)** 선택 모달에 source 탭(자료/콘텐츠/내 매장 제작자료/링크) 추가, 콘텐츠 탭은 contentHub.ts 재사용.
4. **(C-1)** 콘텐츠 선택 시 `landingType='page'`, `landingTargetId=content.id` 저장 경로 연결.
5. **(동영상 통합)** `PharmacyVideoPage` prefill 경로를 모달 "내 매장 제작자료" 탭으로 흡수(선택). 분절 동선 정리.
6. **(검증)** 각 대상 타입별 QR 생성 → `/qr/:slug` 렌더 smoke (실제 브라우저).
7. GP/KCos 공통화는 KPA 안정화 후 별도 IR/WO.

---

## 7. 검증 항목

- [ ] `/store/marketing/qr` 빈 상태에서 "콘텐츠·자료·내 매장 제작자료에서 QR 만들기" 1차 버튼이 모달을 직접 오픈한다 (이탈 없음).
- [ ] 선택 모달이 `usage_type='qr'` 미태깅 자료도 노출한다 (자료 누락 해소).
- [ ] 콘텐츠 허브(`kpa_contents`, status='ready') 항목을 매장에서 선택 → QR 생성 → `/qr/:slug` 에서 본문 inline 렌더(`pageContent.available=true`).
- [ ] 내 매장 동영상 사본(`store_videos`) 선택 → QR 생성 → `/qr/:slug` 동영상 렌더.
- [ ] 자료(file) 선택 → `landingType='page'`, external-link → `landingType='link'` 로 올바르게 저장.
- [ ] 미발행(ready 아님) 콘텐츠는 picker에 안 보이거나, 랜딩에서 `available:false` 처리.
- [ ] `usageType="qr"` 제거 후에도 QR 연결 불가 자산이 섞이지 않는다(전부 file/content/external-link 변환 가능 확인).
- [ ] 운영자 원본 vs 매장 사본 혼동 없음 — 콘텐츠 탭이 "연결 대상(참조)"임을 UX로 명시.
- [ ] derivation 기록(`store_asset_derivations`)이 libraryItemId 기반 경로에서만 남고, 콘텐츠 참조형(C-1)에선 의도대로 동작.

---

## 부록 — 핵심 코드 참조

| 위치 | 파일:라인 |
|---|---|
| 빈 상태 3-CTA (이탈 링크) | `services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx:781-799` |
| 선택 모달 호출 (usageType="qr" 고정) | `StoreQRPage.tsx:1007-1012` |
| setShowSelector 유일 호출처(자료 변경) | `StoreQRPage.tsx:618` |
| autoLandingType 매핑 | `StoreQRPage.tsx:70-73` |
| 모달 → assets 조회 | `components/store/StoreAssetSelectorModal.tsx:109-127` |
| usage_type 쿼리 전달 | `api/storeExecutionAssets.ts:90-105` |
| 콘텐츠 허브 클라이언트(재사용 후보) | `api/contentHub.ts:52-75` |
| 운영자 콘텐츠 picker(재사용 패턴) | `pages/operator/qr/ContentHubPickerModal.tsx` |
| QR 생성 백엔드 | `apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts:667` |
| QR 랜딩 resolve (page/video/product/link) | `store-qr-landing.controller.ts:69-234` |
| assets usage_type 필터 백엔드 | `apps/api-server/src/routes/o4o-store/controllers/store-execution-assets.controller.ts:51` |
| derivation 기록 | `apps/api-server/src/routes/o4o-store/services/store-asset-derivation.service.ts` |
