# CHECK-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1

> 매장 화면이 전역 자원 `product_ai_contents` 를 매장 저장소로 사용하던 구조를 제거하고,
> 매장 상품 상세 설명의 canonical 저장 위치를 `store_local_products.detail_html` 로 정렬한다.
>
> 근거 WO: `WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1` §1–21
> 판정: **범위 A PASS / 범위 B STOP** (WO §18 이 명시적으로 허용한 조합)

작성일: 2026-07-29
상태: 구현 완료 · 프로덕션 smoke 기록 (§10)

---

## 1. 소유권 계약 (확정)

| 자원 | 소유·성격 | 매장 사용자 |
|---|---|---|
| `product_ai_contents` | ProductMaster 기준 **전역 AI 초안** | 읽기/쓰기 대상 **아님** |
| `store_local_products.detail_html` | **매장 소유 상품 설명 canonical 저장 위치** | 읽기/쓰기 ✅ |
| `shared_product_descriptions` | O4O 표준 대표 설명 | 읽기 전용 |
| `store_product_profiles` | 표시명 override + 레거시 fallback | 신규 설명 write path 로 **승격 금지** |

---

## 2. §5 — 3서비스 계약 비교 (읽기 전용 조사)

| 항목 | KPA (web-kpa-society) | GlycoPharm | K-Cosmetics |
|---|---|---|---|
| API 모듈 | `src/api/localProducts.ts` | `src/api/localProducts.ts` | `src/services/localProductApi.ts` |
| 목록 API | `GET /api/v1/store/local-products` | 동일 | 동일 |
| 목록 응답 형태 | raw SQL **snake_case** row | 동일 | 동일 |
| 목록 unwrap | `res.data` | `res.data?.data` | `res.data.data` |
| 수정 API | `PUT /api/v1/store/local-products/:id` | 동일 | 동일 |
| 수정 응답 형태 | TypeORM entity **camelCase** | 동일 | 동일 |
| `updateLocalProduct` 반환 | `LocalProduct` 직접 | 동일 | 동일 |
| detailHtml 매핑 | 목록 `detail_html` / PUT `detailHtml` | 동일 | 동일 |
| 설명 화면 | `pages/pharmacy/StoreProductDescriptionsPage.tsx` | `pages/store-management/…` | `pages/store/…` |
| 문구 축 | "내 약국 / 약국" | "내 약국 / 약국" | "내 매장 / 매장" |
| POP 화면 | `pages/pharmacy/ProductPopBuilderPage.tsx` | `pages/store-management/…` | `pages/store/…` |
| POP 저장 계약 | 전역 `product_ai_contents` (부적합) | 동일 | 동일 |

**PUT 은 부분 업데이트(partial)** 임을 코드로 확인했다
([store-local-product.routes.ts:346-361](../../apps/api-server/src/routes/platform/store-local-product.routes.ts#L346-L361)) —
`if (field !== undefined)` 가드로 전송된 필드만 대입한다.
따라서 §18 의 중지 조건 "detail_html PUT 이 전체 교체" 는 **해당하지 않는다.**

단건 조회 API 는 존재하지 않으므로, WO §6 의 조회 우선순위 중
**(3) 목록 API 응답에 기존 컬럼 `detail_html` 추가** 를 택했다.

---

## 3. 변경 내역

### 3.1 백엔드 (읽기 경로 1줄, write path 변경 0)

[apps/api-server/src/routes/platform/store-local-product.routes.ts](../../apps/api-server/src/routes/platform/store-local-product.routes.ts)

- `GET /local-products` 목록 SELECT 에 기존 컬럼 `detail_html` 추가.
- 신규 테이블 0 / 신규 컬럼 0 / 신규 API 0 / migration 0 / 권한 변경 0.
- PUT · 조직 경계(`WHERE organization_id`) · 역할 정책은 **무변경**.

### 3.2 API 클라이언트 3종 (타입만)

`LocalProduct` 에 `detail_html?` + `detailHtml?` (목록 snake / PUT camel 양쪽 수용),
`LocalProductInput` 에 `detailHtml?` 추가.

- [web-kpa-society/src/api/localProducts.ts](../../services/web-kpa-society/src/api/localProducts.ts)
- [web-glycopharm/src/api/localProducts.ts](../../services/web-glycopharm/src/api/localProducts.ts)
- [web-k-cosmetics/src/services/localProductApi.ts](../../services/web-k-cosmetics/src/services/localProductApi.ts)

### 3.3 설명 화면 3종 (범위 A 본체)

- [web-kpa-society/…/StoreProductDescriptionsPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx)
- [web-glycopharm/…/StoreProductDescriptionsPage.tsx](../../services/web-glycopharm/src/pages/store-management/StoreProductDescriptionsPage.tsx)
- [web-k-cosmetics/…/StoreProductDescriptionsPage.tsx](../../services/web-k-cosmetics/src/pages/store/StoreProductDescriptionsPage.tsx)

3서비스 **동일 계약**으로 정렬(문구·import 경로만 서비스별 유지):

| 변경 | 내용 |
|---|---|
| import | `getProductAiContents` / `saveProductAiContent` 제거 → `updateLocalProduct` 사용 |
| 조회 | `readDetailHtml(row) = row.detailHtml ?? row.detail_html ?? ''` (목록 row 재사용, 추가 조회 0) |
| 저장 | `updateLocalProduct(id, { detailHtml })` — `detail_html` 만 전송 |
| 보존 | `description` / `summary` / `usage_info` / `caution_info` 미전송 → 백엔드 부분 업데이트로 보존 |
| 상태 | `contentLoading` / `model` / `updatedAt` 제거, `listError` / `saveError` 추가 |
| 안내 | "O4O 공용 상품 DB 기준" → "매장 자체 상품에 저장 / 표준 상품 대표 설명은 O4O 관리자 관리" |

### 3.4 §6.5 상태 UX

| 상태 | 표시 |
|---|---|
| 목록 로딩 | `불러오는 중...` |
| 목록 실패 | `… 자체 상품을 불러오지 못했습니다.` + `[다시 시도]` — **0건으로 위장하지 않음** |
| 0건 | `등록된 자체 상품이 없습니다.` + 등록 링크 |
| 저장된 설명 없음 | `저장된 상세 설명이 없습니다.` (편집기는 사용 가능) |
| 저장 실패 | `상품 설명을 저장하지 못했습니다. 작성한 내용은 유지됩니다.` (배너 + 내용 보존) |
| 저장 중 | 버튼 disabled (중복 제출 차단) |

### 3.5 §6.6 AI

RichTextEditor 의 기존 보조 AI 는 유지하되 결과는 편집기 state → `detail_html` 로만 흐른다.
`product_ai_contents` write 0 / 신규 AI endpoint 0.

---

## 4. §7.2 계약 게이트 — 범위 B STOP

`ProductPopBuilderPage` 3종은 이번 WO 에서 **수정하지 않는다.**

기존 POP·자료함 저장 계약에 **layout**, **localProductId + `sourceType='local'`**,
**popShort/popLong 분리 재편집** 을 담을 자리가 없다.
`store_execution_assets` 에는 `source_id` 가 없고,
`STORE_ASSET_SOURCE_KINDS` 화이트리스트에 `store_local_product` 이 없으며,
`POST /pharmacy/pop/generate` 에 `localProductIds` 분기가 없다.

구현하려면 백엔드 생성 계약·화이트리스트·필드를 신설해야 하므로 WO 제약
("기존 계약 재사용 / 신규 테이블·임의 JSON 금지") 을 넘어선다 → §18 중지 조건 성립.

> 상세 판정표·후속 선택지(B-1~B-4, 권장 B-3): [IR-O4O-STORE-LOCAL-PRODUCT-POP-ASSET-CONTRACT-AUDIT-V1](../investigations/IR-O4O-STORE-LOCAL-PRODUCT-POP-ASSET-CONTRACT-AUDIT-V1.md)

---

## 5. §12 정적 검증

```
rg "ai-contents|productAiContent|getProductAiContents|saveProductAiContent" \
   services/web-{kpa-society,glycopharm,k-cosmetics}/src
```

→ `StoreProductDescriptionsPage` **3종 모두 0 hit**.
잔여 hit 은 `api/productAiContent.ts` (전역 API 클라이언트, 유지) 와
`ProductPopBuilderPage` (범위 B STOP, 현 상태 유지) 뿐이다.

---

## 6. §13 테스트

신규: [apps/api-server/src/\_\_tests\_\_/store-local-product-description.spec.ts](../../apps/api-server/src/__tests__/store-local-product-description.spec.ts) — **8 passed**

| # | 검증 |
|---|---|
| 1 | 목록 응답에 `detail_html` 포함 (hydrate 소스) |
| 2 | 목록 쿼리에 `WHERE organization_id = $1` 경계 적용 |
| 3 | `PUT { detailHtml }` 저장 + description/summary/usage_info/caution_info **보존** |
| 4 | `detailHtml` 미전송 시 기존 값 유지 |
| 5 | 저장 후 목록 재조회에서 되읽힘 (새로고침 지속성) |
| 6 | 타 조직 상품 수정 404 + 원본 미변경 |
| 7 | 매장 소속 없으면 403 (역할 확대 없음) |
| 8 | `detail_html` 저장 시 `<script>` 제거 |

전역 API 회귀: [product-ai-global-access.spec.ts](../../apps/api-server/src/__tests__/security/product-ai-global-access.spec.ts) — **34 passed** (매장 사용자 ai-contents 403 유지 · active OPL render_read 200 유지).

**태블릿 회귀**: 태블릿 공개 경로
([store-public-tablet.handler.ts](../../apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts))
는 로컬 상품 목록에서 `detail_html` 을 **선택하지 않으며**, 상세 노출은
`kpa_store_content_product_links` → `kpa_store_contents` 선택 콘텐츠 경로를 쓴다.
`product_ai_contents` 도 참조하지 않는다. → 이번 변경으로 **태블릿 동작 변화 없음(회귀 0)**.

> 참고(설계 갭, 이번 범위 밖): 매장이 저장한 `detail_html` 은 현재 태블릿에서 소비되지 않는다.
> 태블릿 노출은 자료함 콘텐츠 연결로 수행한다. 소비 경로 신설은 별도 WO 사안이다.

프론트 테스트 하네스: 3개 web 서비스에 `test` 스크립트가 없어 프론트 단위 테스트는
추가하지 않았고, §6.5 상태 UX 는 정적 검토 + 프로덕션 smoke 로 검증했다.

---

## 7. §14 타입체크

| 대상 | 결과 |
|---|---|
| `@o4o/api-server type-check` | 변경 범위 **0 error** (잔여 error 는 전부 `src/scripts/*` — 타 트랙 생산 스크립트, 선행 존재) |
| web-kpa-society `tsc --noEmit` | 대상 파일 0 error |
| web-glycopharm `tsc --noEmit` | 대상 파일 0 error |
| web-k-cosmetics `tsc --noEmit` | 대상 파일 0 error |

---

## 8. §17 변경 금지 항목 준수

| 금지 항목 | 준수 |
|---|:---:|
| `product_ai_contents` 에 `organization_id` 추가 | ✅ 안 함 |
| `store_product_profiles` 를 설명 canonical 로 승격 | ✅ 안 함 |
| `store_local_products` 에 `master_id` 추가 | ✅ 안 함 |
| 이름·바코드 자동 ProductMaster 연결 | ✅ 안 함 |
| 매장 사용자에게 전역 AI write 허용 | ✅ 안 함 |
| 전역 접근 가드 완화 | ✅ 안 함 |
| `shared_product_descriptions` 수정 | ✅ 안 함 |
| 신규 POP 테이블 / 전역 콘텐츠 저장소 생성 | ✅ 안 함 |
| 3서비스 중 일부만 수정 | ✅ 3서비스 동일 적용 |

---

## 9. §16 데이터 확인 (프로덕션, read-only)

| 테이블 | 작업 전 | 작업 후 |
|---|---:|---:|
| `product_ai_contents` | 0 | 0 |
| `product_ai_tags` | 0 | 0 |

증가 0 → 매장 화면에서 전역 자원에 쓰기가 발생하지 않음을 확인.

---

## 10. §15 프로덕션 smoke

배포: GitHub Actions `Deploy API Server` run 30432565393 **success** ·
`Deploy Web Services` run 30432565400 **success**
(detect-changes → kpa-society / glycopharm / k-cosmetics 3종 모두 deploy success).
커밋 `513cc64f4` 가 `origin/main` 의 조상임 확인.

### 10.1 KPA — `/store/marketing/product-descriptions` (약국 경영자 계정) — **PASS**

| 항목 | 결과 |
|---|---|
| 페이지 로드 | ✅ 매장 자체 상품 8건 렌더 |
| `ai-contents` 요청 | ✅ **0건** (403 도 0건) |
| 목록 API | `200 GET /api/v1/store/local-products?page=1&limit=100&activeOnly=true` |
| 저장 없음 상태 | ✅ `저장된 상세 설명이 없습니다.` |
| 안내 문구 | ✅ "이 화면의 상세설명은 **매장 자체 상품에 저장**되며 …" |
| 저장 | ✅ `200 PUT /api/v1/store/local-products/{id}` |
| 새로고침 지속성 | ✅ 본문 유지 + `저장: 2026. 7. 29. 오후 4:57:58` |
| DB 반영 | ✅ `store_local_products.detail_html = '<p>…스모크 검증 문장</p>'` |
| 타 필드 보존 | ✅ `description` / `summary` 유지 (usage_info·caution_info 는 원래 NULL) |

**원복**: 대상 상품(`cd3a2b29…7923`) 의 원래 값은 `detail_html = NULL` 이었고,
앱의 부분 업데이트 API 로 `detailHtml: ''` 를 전송해 **NULL 로 복구 완료** (직접 DB write 0).
복구 후 `detail_html` 이 비어있지 않은 로컬 상품 **0건** 재확인.

### 10.2 GlycoPharm — `/store/library/product-descriptions` — **PASS**

페이지 로드 ✅ (내 약국 상품 8건) · `ai-contents` 요청 **0건** ·
`200 GET /api/v1/store/local-products` · `저장된 상세 설명이 없습니다.` ·
"약국" 문구 축 유지 확인.

### 10.3 K-Cosmetics — `/store/library/product-descriptions` — **PASS**

페이지 로드 ✅ (내 매장 상품 2건) · `ai-contents` 요청 **0건** ·
`200 GET /api/v1/store/local-products` · "매장" 문구 축 유지 확인.
(K-Cosmetics 는 테스트 계정 SSOT 에 매장 계정이 없어 운영자 계정으로 화면 진입만 검증했다.
`403 GET /api/v1/cosmetics/store-hub/capabilities` 는 계정 역할에서 오는 선행 사항으로 본 WO 범위 밖.)

### 10.4 smoke 중 발견·수정한 결함 — 빈 편집기 저장

KPA 저장 smoke 의 원복 과정에서, RichTextEditor 가 빈 문서를 `<p></p>` 로 내보내
`content.trim()` 가드를 통과해 **빈 markup 이 `detail_html` 에 저장**되는 것을 확인했다.

수정: 3서비스 `handleSave` 에 `normalizeEditorHtml()` 추가 —
`<br>` / `&nbsp;` / 빈 `<p></p>` 를 제거해 실질 내용이 없으면 빈 값으로 취급하고
기존 "내용을 입력하세요" 가드로 흡수한다. 저장 의미·삭제 정책은 변경하지 않는다.
프로덕션에 남은 `<p></p>` 값은 위 §10.1 원복으로 제거되었다.

---

## 관련 문서

- [IR — 로컬 상품 POP 자산 계약 감사 (범위 B STOP 근거)](../investigations/IR-O4O-STORE-LOCAL-PRODUCT-POP-ASSET-CONTRACT-AUDIT-V1.md)
- [DESIGN — product_ai_content 소유권 및 매장 설명 계약](../design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md)
- [CHECK — 전역 계약 및 접근 정정](CHECK-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1.md)
- [CHECK — render_read 다중 관계 fallthrough](CHECK-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1.md)
- [IR — KPA 매장 상품 AI 콘텐츠 403 감사](../investigations/IR-O4O-KPA-STORE-PRODUCT-AI-CONTENTS-403-AUTH-AUDIT-V1.md)
- [O4O Shared Module Change Protocol V1](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)
