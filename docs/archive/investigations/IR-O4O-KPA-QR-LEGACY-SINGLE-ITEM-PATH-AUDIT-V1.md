# IR-O4O-KPA-QR-LEGACY-SINGLE-ITEM-PATH-AUDIT-V1

**조사 일자**: 2026-05-09
**조사 기준**: main (`dc0c046d0` 시점, sync 완료)
**조사 범위**: KPA QR 기능의 `selectedLibraryItem` 단건 state 경로 — 실제 사용 여부, canonical 구조와의 관계, 정리 가능성
**조사자**: Claude Opus 4.7 (코드 수정 없음, 정적 분석)

---

## 0. 핵심 결론 (TL;DR)

> **`selectedLibraryItem`은 "레거시 단건 경로"가 아니라, "상품 마케팅 그래프 → 단건 자동 prefill" 이라는 별도 진입 패턴의 active 인터페이스다.**
>
> canonical "내 자료함 → 제작 시작 → `production.source.items[]`" 와 의도가 다른 **두 번째 표준 진입 흐름**이므로 단순 제거는 불가. 다만 state 시그니처는 canonical로 흡수 가능 (옵션).

판정: **B(특수 단건 UX 유지) + C(canonical 흡수 가능)** — 단순 dead legacy(A)는 아님.

---

## 1. `selectedLibraryItem` 사용처 전수 조사

전체 grep (모노레포 / docs 제외):

| 파일 | 라인 | 역할 | 상태 |
|------|------|------|------|
| [ProductMarketingPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductMarketingPage.tsx) | 48 | `handleCreatePop` — POP Builder로 단건 prefill state navigate | **active producer** |
| [ProductMarketingPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductMarketingPage.tsx) | 80 (주석), 86 | `handleCreateQr` — StoreQRPage로 단건 prefill state navigate | **active producer** |
| [ProductPopBuilderPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx) | 36 | `BuilderLocationState` 인터페이스 (옵셔널 필드) | **active consumer** |
| [ProductPopBuilderPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx) | 76 | `assetDesc` fallback (pop_short/pop_long prefill) | **active consumer** |
| [StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) | 137 (주석), 143, 150 | location.state로 받은 단건을 `handleLibrarySelect()`로 변환 | **active consumer** |
| [StorePopPage.tsx](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx) | 11 (주석) | "dead path 제거: state.selectedLibraryItem" — 이미 정리됨 | dead-removed |

**결론**: dead/dead-import/dead-state 없음. **활성 producer 1곳 (ProductMarketingPage), 활성 consumer 2곳 (ProductPopBuilderPage, StoreQRPage)**.

---

## 2. ProductMarketingPage.tsx 역할 분석

### 2.1 페이지 정체
- **라우트**: `/store/commerce/products/:productId/marketing` ([App.tsx:853](services/web-kpa-society/src/App.tsx#L853))
- **WO 출처**: `WO-O4O-PRODUCT-MARKETING-GRAPH-V1`
- **목적**: 한 상품에 연결된 마케팅 자산(QR + 자료실 항목)을 그래프 형태로 보여주고, 신규 자산 제작을 시작할 수 있는 진입 페이지
- **사이드바 메뉴 미노출** — `storeMenuConfig.ts`에 등록 없음 → **상품 컨텍스트 진입 전용**

### 2.2 실제 진입점
- **StoreLocalProductsPage.tsx:343** — 매장 상품 목록 페이지의 각 상품 행에 "마케팅" 버튼 → `/store/commerce/products/${product.id}/marketing` 이동
- 즉 사용자 흐름:
  ```
  매장 상품 관리(StoreLocalProductsPage) → 상품 카드의 "마케팅" 버튼
   → ProductMarketingPage (그 상품의 QR/자료 그래프)
   → "QR 만들기" or "POP 만들기"
   → 첫 활성 자료실 항목 single-asset prefill 후 navigate
  ```

### 2.3 단건 구조의 이유
ProductMarketingPage는 다음을 자동으로 결정:
```typescript
const targetAsset = data?.libraryAssets.find((a) => a.isActive);
```
즉 "이 상품에 연결된 첫 활성 자료" 1개를 자동으로 picking. **사용자에게 다건 선택 UI를 보여주지 않음** — 상품 1개에 대한 컨텍스트 단건 prefill이 의도된 UX.

이는 canonical("자료함에서 사용자가 능동적으로 N개 선택")과 의미가 다름:
- **canonical**: "내가 만들고 싶은 자료를 골라 → 무엇으로 만들지 선택"
- **product-context**: "이 상품 페이지의 자료를 → 빠르게 마케팅 자산화"

---

## 3. canonical 구조와의 비교

### 3.1 두 진입 패턴의 본질적 차이

| 축 | canonical (자료함) | product-context (상품 그래프) |
|----|--------------------|------------------------------|
| 시작점 | 내 자료함 페이지 | 상품 마케팅 그래프 페이지 |
| 컨텍스트 | 자료(library) | 상품(product) |
| 선택 주체 | 사용자(체크박스) | 시스템(자동 첫 활성) |
| Cardinality | 1~N | 1 (단건 고정) |
| 추가 메타 | `fromLibrary` ('contents'/'resources'), `target`, `template` | `productId` (URL path), `productName` |
| State 시그니처 | `state.production = { source: {fromLibrary, items[]}, target, template, aiPrefillRequested }` | `state = { selectedLibraryItem, productName? }` |
| AI prefill | items[].description 활용 | selectedLibraryItem.description 활용 |
| 산출물 라우트 | `/store/marketing/{pop\|qr\|blog\|product-descriptions}` | `/store/commerce/products/:productId/{pop\|marketing}` (POP은 별도 Builder) |

### 3.2 정보 차이
- canonical에는 있고 product-context에는 없는 정보: `fromLibrary`, `target`, `template`, `aiPrefillRequested`, 다건 items
- product-context에는 있고 canonical에는 없는 정보: `productId`, `productName` (URL path/state)
- 공통: 자료 1개 (id, title, description, assetType, fileUrl, url, htmlContent, category)

### 3.3 구조 중복?
**부분적 중복 — 단건 prefill의 본질은 동일**.
- canonical state의 items[]에 length=1로 같은 정보를 표현 가능
- 다만 product-context의 productId/productName 메타는 별도 필드로 유지 필요
- 즉 "items 시그니처를 통일하고 product-context 메타는 옆에 둔다"는 형태로 흡수 가능

---

## 4. QR 생성 흐름 영향도 조사

### 4.1 `selectedLibraryItem` 제거 시 영향
| 페이지 | 영향 | 후속 조치 필요 |
|--------|------|---------------|
| ProductMarketingPage.tsx | "QR 만들기"/"POP 만들기" 버튼 자동 prefill 동작 손실 | producer 측 코드 변경 |
| StoreQRPage.tsx | 단건 state 수신 분기 제거 가능, canonical 분기 유지 | consumer 측 코드 변경 |
| ProductPopBuilderPage.tsx | description fallback (asset 단계) 손실 — pop_short/pop_long fallback 우선순위가 한 단계 줄어듦 | consumer 측 코드 변경 |
| StorePopPage.tsx | 영향 없음 (이미 dead path 제거됨, 주석만 잔존) | 없음 |
| 다른 서비스 | 영향 없음 (web-kpa-society 내부 한정) | 없음 |
| Backend API | 영향 없음 (router state는 client-side) | 없음 |
| Public route `/qr/{slug}` | 영향 없음 | 없음 |
| QR 생성/출력 동작 | 영향 없음 (POST `/pharmacy/qr` 계약 무관) | 없음 |

### 4.2 Backward compatibility
- `location.state`는 client-side 메모리. 새 deploy 시점부터 기존 navigate 호출이 새 시그니처를 사용 → backward compat 불필요.
- 단 ProductMarketingPage producer와 StoreQRPage/ProductPopBuilderPage consumer 변경은 **같은 PR에서 atomically** 이뤄져야 함 (deploy 사이 mismatch 위험은 없음 — single front-end bundle).

---

## 5. 구조 정리 가능성 판정

### 옵션별 분석

| 옵션 | 설명 | 변경 규모 | 가독성 영향 |
|------|------|----------|------------|
| **A. 완전 dead → 제거** | producer/consumer 모두 미사용으로 입증되면 제거 | — | — |
| **B. 특수 단건 UX → 유지** | producer/consumer 그대로, "레거시" 명명만 정정 | 매우 작음 (주석) | 단건/다건 두 인터페이스 공존 명시 |
| **C. canonical 흡수 → state 시그니처 통일** | producer가 `state.production.source.items[0]` + `productId/productName` 형태로 navigate, consumer는 production만 처리 | 중간 (3 파일) | ✓ 단일 인터페이스 |
| **D. 다른 서비스 의존 → 공통 구조 조정** | — | — | — |

### 판정: **B + C (혼합)**

- **A 아님**: 호출 경로 모두 active 검증됨 (라우트 등록·진입점·실제 사용자 흐름 추적 가능).
- **D 아님**: web-kpa-society 단일 서비스 내부에 닫혀있음. neture/glycopharm/k-cosmetics 영향 0.
- **B**: 두 진입 흐름은 의미가 다르므로 **유지가 default 안전**.
- **C 가능**: state 시그니처만 canonical로 흡수해도 의미 손상 없음. 오히려 "legacy/canonical 두 시그니처"라는 인지 비용을 제거.

---

## 6. 정리 방향 제안

### 추천: **옵션 C (canonical 흡수, productId/productName 보조 필드 추가)**

#### 변경 형태 (예시)

**Producer (ProductMarketingPage)**
```typescript
// before
navigate('/store/marketing/qr', {
  state: { selectedLibraryItem: { id, title, category, fileUrl, assetType, url, htmlContent } },
});

// after
navigate('/store/marketing/qr', {
  state: {
    production: {
      source: {
        fromLibrary: 'resources',
        items: [{ id, title, description, origin: 'library' }],
      },
      target: 'qr',
      template: 'default',
    },
    productContext: { productId, productName },  // 보조 메타
  },
});
```

**Consumer (StoreQRPage)**
- `selectedLibraryItem` 단건 분기 제거
- 기존 `production.source.items` 분기는 그대로 — 변경 최소
- 자료 fetch 후 `handleLibrarySelect` 호출은 동일

**Consumer (ProductPopBuilderPage)**
- `BuilderLocationState`를 production 시그니처로 변경
- `assetDesc = production?.source?.items?.[0]?.description ?? ''` 로 변경
- `productName` 은 옆 필드 `productContext.productName`로 받음

#### 장점
- KPA store 매장 UX 전체에서 **단 하나의 state 시그니처**: `production.source.items[]`
- "legacy" 표현/주석 제거 → 미래 작업 시 인지 부담 감소
- AI prefill 통합 흐름 (이미 `aiPrefillRequested` 옵션 보유)
- ProductPopBuilderPage가 production state를 받게 되면, 향후 자료함→POP Builder 직접 진입(canonical) 추가도 자연스러움

#### 단점/주의
- 3개 파일 변경 (producer 1, consumer 2)
- `productId`/`productName` 필드를 production state에 끼울지, 별도 `productContext` 필드로 둘지 약간의 설계 결정 필요 — **별도 필드 권장** (production은 자료 컨텍스트, productContext는 상품 컨텍스트로 의미 분리)

### 대안: **옵션 B (유지) + 명명·주석 정비**

만약 변경 비용을 최소화하려면:
- StoreQRPage:137 주석 `"// 1) 레거시: state.selectedLibraryItem"` → `"// 1) Product-context 진입: state.selectedLibraryItem (ProductMarketingPage)"`
- StoreQRPage:142 주석 `"// 2) WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1: ..."` → 그대로 유지
- ProductMarketingPage:80 주석 명확화
- StorePopPage:11 주석에서 dead path 표현 정리

이 옵션은 **코드 동작 변경 0**, 의도 표현만 정정.

### 비추천: **옵션 A (제거)**
- 활성 진입 흐름이므로 제거 시 ProductMarketingPage의 자동 prefill UX 손실 → 매장 사용자에게 명시적 회귀.

---

## 7. 영향 범위 / 신규 추가 필요 여부

| 항목 | C(추천) | B(대안) |
|------|---------|---------|
| 변경 파일 수 | 3 (Producer 1 + Consumer 2) | 3 (주석만) |
| TypeScript 시그니처 | `BuilderLocationState` 변경, StoreQRPage location.state 타입 일부 변경 | 변경 없음 |
| 신규 entity / migration | **불필요** | 불필요 |
| 신규 adapter / helper | 선택사항 (`productContextFromState`, `firstItemFromProduction` 등 헬퍼 검토) | 불필요 |
| API 변경 | 없음 (state는 client-side) | 없음 |
| 백엔드 영향 | 없음 | 없음 |
| 다른 서비스 영향 | 없음 | 없음 |
| 빌드 영향 | tsc clean 가능 (작은 시그니처 정정) | 0 |
| 테스트 smoke | 매장상품→마케팅→QR/POP 만들기 1회 | 0 |

---

## 8. 다음 WO 초안 제안

### (추천) WO-O4O-KPA-STORE-QR-PRODUCT-CONTEXT-CANONICAL-MERGE-V1

**목적**: `selectedLibraryItem` 단건 state를 canonical `production.source.items[]` 시그니처로 흡수해 KPA store 매장 흐름의 진입 state를 단일화한다.

**범위**:
1. `ProductMarketingPage.handleCreateQr` / `handleCreatePop` — navigate state를 production 시그니처로 변경, productId/productName은 `productContext` 보조 필드로 분리
2. `StoreQRPage` — 레거시 단건 분기 제거, production canonical 분기로 통일
3. `ProductPopBuilderPage` — `BuilderLocationState`를 production + productContext 시그니처로 재정의, asset description fallback은 `production.source.items[0].description`으로 변경
4. 관련 주석에서 "레거시" 표현 제거

**비포함**:
- 신규 entity / migration / API
- ProductMarketingPage UI 변화 (버튼/그래프 그대로)
- StorePopPage (이미 정리됨)
- 다른 서비스

**검증**:
- 매장 상품 관리 → 상품 "마케팅" 버튼 → QR 만들기 → 자동 prefill 정상
- 매장 상품 관리 → 상품 "마케팅" 버튼 → POP 만들기 → AI prefill에 asset description fallback 정상
- 자료함 → 제작 시작 → QR/POP canonical 흐름 무회귀
- TypeScript build clean

**예상 diff 규모**: ~120 lines (3 파일 시그니처 정정 + 주석 정리).

### (대안) WO-O4O-KPA-STORE-LEGACY-SINGLE-ITEM-COMMENT-CLARIFY-V1
- 동작 무변경, 주석/명명만 정정
- 예상 diff < 30 lines

---

## Appendix: 핵심 파일 인덱스

| 영역 | 파일 |
|------|------|
| Producer (state 송신) | [services/web-kpa-society/src/pages/pharmacy/ProductMarketingPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductMarketingPage.tsx) |
| Consumer — POP Builder | [services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductPopBuilderPage.tsx) |
| Consumer — QR | [services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) |
| 진입점(상품 그래프 navigate) | [services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx) (line 343) |
| Routes | [services/web-kpa-society/src/App.tsx](services/web-kpa-society/src/App.tsx) (line 853, 855) |
| Backend API (참고) | [services/web-kpa-society/src/api/productMarketing.ts](services/web-kpa-society/src/api/productMarketing.ts) |
| 관련 IR (선행) | [docs/investigations/IR-O4O-KPA-QR-PRODUCTION-FLOW-STATE-AUDIT-V1.md](docs/investigations/IR-O4O-KPA-QR-PRODUCTION-FLOW-STATE-AUDIT-V1.md) |
| 관련 IR (POP) | [docs/investigations/IR-O4O-KPA-POP-PRODUCTION-FLOW-STATE-AUDIT-V1.md](docs/investigations/IR-O4O-KPA-POP-PRODUCTION-FLOW-STATE-AUDIT-V1.md) |
| Canonical 정렬 커밋 | `745f555ba` (자료함/제작 시작), `965d7030a` (POP 흐름), `dc0c046d0` (QR UX polish) |

---

*조사 마감: 2026-05-09*
*상태: 조사 완료, 정리 방향 결정 대기*
