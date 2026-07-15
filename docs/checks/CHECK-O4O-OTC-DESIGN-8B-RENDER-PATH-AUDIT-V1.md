# CHECK-O4O-OTC-DESIGN-8B-RENDER-PATH-AUDIT-V1 — §8-B 렌더 경로 조사

WO: `WO-O4O-OTC-DESIGN-8B-RENDER-PATH-AUDIT-V1` · 일자: 2026-07-16 · 상태: 완료 (조사)
대상: [OTC 디자인 GUIDE §3·§8-B](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md) · 계약: [CR-020 V1.2](../guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md)

> **read-only 조사.** 코드 변경 **0** · DB write **0** (SELECT 만).

---

## 1. 결론

> **§8-B 두 항목의 성격이 서로 다르다 — 하나로 묶으면 안 된다.**
>
> - **C 태블릿 = 실재하는 결함, 단 현재 노출 0 (잠재)** — SPD 를 읽는 경로가 **2개** 있고 둘 다 variant 미지정이다. 지금 터지지 않는 유일한 이유는 **OTC master 가 아직 어느 매장 listing 에도 없기 때문**이다.
> - **D 다국어 랜딩 = 오분류** — 이 화면은 `shared_product_descriptions` 를 **한 줄도 읽지 않는다**. OTC 설명서가 D 에 도달할 경로가 **코드상 존재하지 않는다**. §8-B 에 OTC 디자인 결함으로 적힌 것 자체가 잘못이다.
>
> **현재 `sd-*` 콘텐츠가 실제로 보이는 화면은 A 하나뿐이고, A 는 이미 정상**이다. 즉 **1,372건은 지금 전부 올바르게 렌더되고 있다.**

---

## 2. 화면별 렌더 경로 — 확정

| # | 화면 | 라우트 | 렌더 | variant | 데이터 소스 | 판정 |
|---|---|---|---|---|---|:---:|
| **A** | Neture QR 랜딩 | `/p/:publicKey`<br>`web-neture/src/App.tsx:672` | `ContentRenderer`<br>`ProductLandingPage.tsx:275` | **`store-description`** | `product_landings` → **SPD** STORE canonical<br>`product-landing.service.ts:251` | **정상** |
| **B** | KPA 약사용 모달 | 라우트 없음(모달) | `ContentRenderer`<br>`StoreDescriptionViewModal.tsx:169` | **`store-description`** | `/store-contents/b2c-descriptions?listingId=` → **SPD** STORE canonical | **정상** |
| **C** | KPA 태블릿 키오스크 | `/tablet/*` | `ContentRenderer` ×5<br>`TabletKioskPage.tsx` | **미지정** | **SPD** STORE canonical (경로 2개 — §3) | **부분 적용** |
| **D** | KPA 다국어 랜딩 | `/multilingual-products/:publicKey`<br>`web-kpa-society/src/App.tsx:1093` | **`dangerouslySetInnerHTML` + `prose prose-slate`**<br>`MultilingualProductPublicLandingPage.tsx:27-43` | — | `store_multilingual_product_content_groups/_pages`<br>**SPD 아님** | **미적용**<br>(**단 OTC 무관**) |
| **E** | 운영자 설명서 검수 (admin) | `/admin/o4o-product-db/supplier-store-descriptions` | `ContentRenderer`<br>`SupplierStoreDescriptionReviewPage.tsx:477` | **`store-description`** | SPD `SUPPLIER_STORE` | **정상** |

> **E 는 GUIDE §3 표에 없다** — 표가 A~D 4행뿐이라 불완전하다. `variant="store-description"` 사용처는 **저장소 전체에서 정확히 3곳**(A·B·E)이다.

---

## 3. C 태블릿 — 결함 상세

### 3-1. variant 미지정 5곳 (전부 인라인 style 로 대체)

| 행 | 렌더 대상 | variant | 인라인 style |
|---|---|:---:|---|
| `:699` | `activeTranslation.html` | **없음** | `fontSize:15px, color:#475569, lineHeight:1.6` |
| `:711` | `selectedProduct.selectedContentHtml` | **없음** | 〃 |
| **`:719`** | **`selectedProduct.description`** | **없음** | 〃 |
| `:725` | `selectedProduct.summary` | **없음** | `fontSize:14px, color:#64748b` |
| **`:976`** | **`openContentCard.detail.html`** (content_list 카드 상세 모달) | **없음** | `fontSize:15px, color:#334155, lineHeight:1.65` |

`ContentRenderer.tsx:297-303` — variant 미지정이면 `store-desc-content` 래퍼 class 자체가 안 붙는다. `sd-*` CSS 는 전부 `.store-desc-content` 로 스코프돼 있으므로 **한 줄도 적용되지 않는다**.

> **class 는 살아남는다** — `sanitizeRichHtml`(`sanitize.ts:50-61`)은 `ALLOWED_ATTR` 을 덮어쓰지 않아 DOMPurify 기본 allowlist 의 `class` 가 통과한다. 즉 **DOM 에 `sd-hero`·`sd-warn` 이 남되 스타일이 0** — GUIDE 의 "무스타일" 표현이 정확하다.
>
> 게다가 인라인 `fontSize`/`color` 가 **`sd-*` 디자인과 정면 충돌**한다(설명서 h1 은 32~44px 인데 15px 문맥에 놓인다).

### 3-2. SPD → 태블릿 도달 경로 **2개** (둘 다 `source_type` 필터 없음)

**경로 ①** — 상품 상세 패널 (`:719`)

`store-public-utils.ts:480` (`channel_type='TABLET'` 쿼리):
```sql
COALESCE(spd.content, sp.description, spo.consumer_detail_description, '') AS description
...
LEFT JOIN LATERAL (
  SELECT d.content, d.summary FROM shared_product_descriptions d
   WHERE d.master_id = pm.id AND d.status='canonical' AND d.description_type='STORE'
     AND d.deleted_at IS NULL
   ORDER BY (d.language='ko') DESC, d.updated_at DESC LIMIT 1) spd ON true
```

**경로 ②** — content_list 카드 상세 모달 (`:976`)

`store-public-tablet-content-resolve.ts:80-96` (`sourceType='o4o_product_description'`):
```sql
SELECT d.content, d.summary FROM shared_product_descriptions d
 WHERE d.master_id = pm.id AND d.description_type='STORE' AND d.status='canonical'
   AND d.deleted_at IS NULL
 ORDER BY (d.language=$2) DESC, (d.language='ko') DESC, d.updated_at DESC LIMIT 1
```

> **두 쿼리 모두 `source_type` 을 안 건다** → `mfds_drug_otc` 가 걸리지 않을 이유가 없다. **설계상 OTC 는 태블릿에 도달한다.**
> 경로 ② 는 운영자가 태블릿 화면에 **masterId 를 직접 지정**하는 구조라, OTC master 하나만 넣으면 즉시 무스타일로 노출된다.

---

## 4. 실제 영향 범위 — DB 실측 (프로덕션, SELECT)

### 4-1. `sd-*` 를 쓰는 콘텐츠는 전체 SPD 의 6% 뿐

| source_type | STORE canonical rows | `sd-*` 사용 |
|---|---:|---:|
| `mfds_easy_drug` | 19,177 | **0** |
| `mfds_drug_otc_nutrition_combo` | 1,915 | **0** |
| **`mfds_drug_otc`** | **1,372** | **1,372 (전량)** |
| `manual` | 88 | **30** |

→ variant 가 필요한 콘텐츠 = **1,402 rows / 701 master** (OTC 686 + manual 15).

### 4-2. 그 701 master 의 화면별 도달 — **A 외 전부 0**

| 화면 | 도달 master | 근거 |
|---|---:|---|
| **A** Neture 랜딩 | **686** | `product_landings` 686건, 전부 `status='active'` · `exposure_state='ok'` → 공개 게이트(`product-landing.service.ts:221`) 통과 |
| **B** 약사 모달 | **0** | listing 0건 |
| **C** 태블릿 | **0** | `channel_type='TABLET'` 조인 결과 0건 |
| **D** 다국어 랜딩 | **0** | 경로 자체 없음 (§5) |

> **결정적 사실: OTC 686 master 는 `organization_product_listings` 에 단 한 건도 없다.**
> 공공데이터 seed 로 만들어진 master 라 **공급자 offer 가 없고 → listing 이 없고 → 태블릿·모달 채널에 오를 수 없다**. 이것이 C 결함이 아직 안 터진 유일한 이유다.

### 4-3. 태블릿에 실제로 걸려 있는 o4o item 2건 — sd-* 아님

운영 중 태블릿 `content_list` block **1개**에 `o4o_product_description` item **2건**이 있다:

| master | source_type | `sd-*` |
|---|---|:---:|
| 성광알파헥시딘가글액 | `mfds_easy_drug` | **없음** |
| 그린헥시딘가글액 | `mfds_easy_drug` | **없음** |

→ **현재 태블릿에서 무스타일로 깨지는 콘텐츠는 0건.** e약은요 콘텐츠는 `sd-*` 를 안 쓰므로 variant 없이도 손해가 없다.

---

## 5. D 는 OTC 와 무관 — §8-B 오분류

| 축 | A (정상) | D |
|---|---|---|
| 테이블 | `product_landings` → **`shared_product_descriptions`** | **`store_multilingual_product_content_groups/_pages`** |
| API | `modules/neture/.../product-landing` | `/api/v1/kpa/public/multilingual-product-contents/:publicKey` |
| 렌더 | `ContentRenderer variant="store-description"` | `dangerouslySetInnerHTML` + `prose prose-slate` |
| 콘텐츠 생산 | SPD 파이프라인 (`mfds_drug_otc` 등) | 운영자 `RichTextEditor` → HUB → 매장 복사 / 매장 직접 저작 |

**SPD 미참조 근거**:
- `multilingual-product-content.controller.ts:189-262` 가 읽는 테이블은 `store_multilingual_product_content_groups` / `_pages` 뿐. import 목록(`:11-16`)에 SPD 엔티티·서비스 없음.
- **source_type enum 이 SPD 를 구조적으로 배제**한다 — `store-multilingual-product-content-group.entity.ts:22-25`:
  ```ts
  export type StoreMultilingualProductContentSourceType =
    | 'store_created' | 'operator_hub' | 'supplier_offline_imported';
  ```
  `mfds_drug_otc` 가 들어갈 자리가 없다.
- `_pages` 에 INSERT 하는 곳은 2곳뿐이고 소스는 **operator 테이블 또는 매장 직접 입력**이다(`:687-703`, `:855-862`).
- 두 파이프라인은 `publicKey` 라는 **이름만 공유**할 뿐 키 공간도 테이블도 다르다.

**규모**: D 파이프라인 실측 = group **6** / page **12**. OTC 1,372 과 무관한 별개 자산.

> **판정**: D 의 "ContentRenderer 미사용"은 **사실이지만 OTC 디자인 결함이 아니다.** 운영자가 `RichTextEditor` 로 쓴 자체 콘텐츠를 `prose` 로 렌더하는 것은 그 파이프라인 나름의 일관된 선택이다. `RichTextEditor` 출력은 `sd-*` 클래스를 만들지 않으므로 D 에 variant 를 붙여도 **바뀌는 게 없다**.

---

## 6. 최소 수정 방안 (제안 — 이번 WO 범위 밖)

### 6-1. C — variant 지정 (권장, 소규모)

`TabletKioskPage.tsx` 의 **SPD 를 렌더하는 2곳**에 variant 를 준다:

| 행 | 조치 |
|---|---|
| **`:719`** `selectedProduct.description` | `variant="store-description"` + **인라인 `fontSize`/`color` 제거** |
| **`:976`** `openContentCard.detail.html` | 〃 |

- `:725` `summary` 는 짧은 평문이라 대상 아님. `:699`/`:711` 은 `kpa_store_contents` 계열(매장 제작 콘텐츠)이라 **별도 판단 필요** — 이번 조사에서 소스를 끝까지 확정하지 못했다(§8).
- **부작용 주의**: variant 를 주면 `sd-*` 없는 e약은요 19,177건도 `store-desc-content` 래퍼를 타게 된다. 래퍼 CSS(`padding:14px`, `max-width:860px` 등)가 **기존 태블릿 카드 레이아웃을 바꿀 수 있다** → 이 2건이 실제로 회귀 없는지 **e약은요 콘텐츠로 먼저 렌더 검증**해야 한다. 이것이 이 수정의 유일한 실질 리스크다.
- 검증은 **노출 0인 지금이 오히려 적기** — 라이브 콘텐츠를 깨뜨릴 위험 없이 고칠 수 있다.

### 6-2. D — §8-B 에서 제외 (문서 정정)

코드 수정 **불필요**. GUIDE §3 표와 §8-B 에서 D 를 **OTC 렌더 경로가 아님**으로 정정한다. 다국어 랜딩의 렌더 방식 통일이 필요하다면 그것은 **OTC 디자인과 무관한 별도 주제**다.

### 6-3. GUIDE §3 표 보완

- **E(운영자 검수 화면) 행 추가** — 표가 4행뿐이라 실제 소비 표면을 다 담지 못한다.
- C 행의 "❌ 무스타일" 옆에 **"현재 노출 0 — 잠재 결함"** 을 병기한다. 지금 깨져 보인다는 오해를 막는다.

### 6-4. 우선순위 판단

> **긴급하지 않다.** 1,372건은 A 에서 전부 정상 렌더 중이고 C 는 노출 0이다.
> 다만 **OTC master 가 listing 되거나 운영자가 content_list 에 OTC master 를 추가하는 순간 즉시 무스타일**이 되므로, **B군 608건 약사 검토보다 먼저 C 를 닫아두는 편**이 안전하다(수정 규모가 2줄 수준으로 작다).

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 화면별 렌더 경로 확정 | ✅ §2 (A~E 5개 — 표 1개 누락 발견) |
| 실제 결함과 영향 범위 확정 | ✅ §3·§4 — **C 실재하나 노출 0 / D 오분류** |
| 최소 수정 방안 제안 | ✅ §6 (C 2줄 + 회귀 리스크 명시 / D 문서 정정) |
| 코드·DB 변경 0 | ✅ SELECT 만 |
| commit·push | ✅ |

---

## 8. 확인 못 한 것

| 항목 | 비고 |
|---|---|
| `:699`/`:711` 의 데이터 소스 | `activeTranslation.html` · `selectedContentHtml` 이 `kpa_store_contents` 계열로 보이나 **끝까지 추적 못 함**. §6-1 수정 시 먼저 확정할 것 |
| KPA 스토어프론트(B2C 채널) 소비 표면 | `store-public-utils.ts:192` 가 SPD `content` 를 `description` 으로 내보내나 이를 렌더하는 UI 를 찾지 못함. listing 0건이라 OTC 영향은 없음 |
| 전역 CSS 의 `sd-*` 주입 여부 | 전 서비스 전역 스타일시트 전수 조사 안 함. "`ContentRenderer` 외에 `sd-*` CSS 를 주입하는 곳이 없다"는 전제로 판단 |

---

## 9. 다음

| 항목 | 비고 |
|---|---|
| **§8-C 언어 전환 UI 중복** | 실측: `LOCALE_LABELS` 가 `MultilingualProductPublicLandingPage.tsx:23-25` 에 로컬 정의돼 있고, **같은 값이 `multilingualProductContentStore.ts:31-39` 에 이미 export 돼 있다**(같은 파일에서 타입은 import 하면서 라벨만 재정의) · D 모바일 pill 은 `px-3 py-1.5` 로 **44px 미달**(태블릿 모드만 `min-h-[44px]`) |
| B군 608 약사 검토 | 생약 2그룹(은행엽 203 · 포도엽 96 = 299) 우선 |
| 전개 불가 10건 | ATC 형식 groupKey |
