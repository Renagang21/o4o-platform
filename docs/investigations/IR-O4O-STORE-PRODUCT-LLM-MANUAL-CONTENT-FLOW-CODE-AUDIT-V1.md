# IR-O4O-STORE-PRODUCT-LLM-MANUAL-CONTENT-FLOW-CODE-AUDIT-V1

> 외부 LLM으로 만든 상품 데이터(JSON)와 소비자용 HTML 설명문을 O4O에 **수동 등록**하여 약국 내 콘텐츠(QR/POP/블로그/상품설명)로 활용하는 임시 제작 흐름을, **현재 코드 어디에 붙이는 것이 가장 좋은지** 판단하는 코드 audit IR.
> 작성일: 2026-06-30 · 성격: **read-only 코드 audit IR** (코드/DB/migration/API/UI 변경 없음 · git add/commit/push 없음 · 산출물 = 본 문서 1개)
> 선행/인접: `IR-O4O-STANDARD-PRODUCT-REPRESENTATIVE-GROUPING-AND-STORE-CONTENT-DIRECTION-V1`, `IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1`(의약품 candidate 적재 — **운영자/공급자 축**, 본 IR과 별개)

---

## 1. 목적 및 만들고 싶은 흐름

O4O 내부에서는 자동 조사/OCR/생성형 AI를 돌리지 않는다. 사람이 외부 LLM에서 조사·작성한 결과를 **복사해 붙여넣는** 임시 흐름을 만든다.

```text
외부 LLM에서 조사/작성 (상품명 또는 이미지 → 기본데이터/바코드후보/썸네일후보/소비자설명문/QR HTML/POP문구/약사검토필요항목)
→ 사람이 JSON/HTML 복사
→ O4O에 수동 붙여넣기
→ 매장 활용 참고 콘텐츠 / 상품 콘텐츠 초안으로 저장
→ QR / POP / 블로그 / 상품설명 콘텐츠에 재사용
```

본 IR은 **붙일 위치 확정**까지만 수행한다. 구현은 후속 WO(§11)로 위임한다.

### 1.1 반드시 지킬 원칙 (작업 제약)

```text
- ProductMaster Core에 직접 저장하지 않는다.
- 공급자 공식 B2C 설명으로 저장하지 않는다.
- 매장 활용 참고 콘텐츠 또는 상품 콘텐츠 초안으로 저장한다.
- 의약품 정보는 "검토 필요" 상태를 가질 수 있어야 한다.
- HTML 설명문은 QR/블로그/콘텐츠에서 재사용 가능해야 한다.
- 가져오기=복사 원칙을 깨지 않는다.
- StoreLocalProduct는 매장 경영활용 제품 / Display Domain 임을 유지한다.
```

---

## 2. 조사 결과 — 후보 도메인 4종 실측

### 2.1 StoreLocalProduct (`store_local_products`) — 매장 경영활용 제품

`apps/api-server/src/routes/platform/entities/store-local-product.entity.ts:23-98`

| 영역 | 실측 |
|---|---|
| 도메인 성격 | **Display Domain 전용** — Commerce Object 아님. Checkout/EcommerceOrder/listing/channel 연결 **구조적 금지**(`20260224300000-HardenStoreLocalProductDomain.ts` 테이블 COMMENT). |
| 경계 | `organization_id` NOT NULL 격리(FK+Index). `resolveStoreAccess()` 소유권 검증. |
| 제품 카드 필드 | `name`(varchar200) / `description`(text, **plain**) / `summary`(text) / `category` / `priceDisplay`(numeric) / `badgeType`(none·new·recommend·event) / `highlightFlag` / `isActive` / `sortOrder` |
| barcode | `varchar(64)` nullable, **앞자리 0 보존**(varchar, 정규화=trim→빈값 null). 중복검사 없음. (WO-...-REGISTRATION-ENHANCEMENT-V1) |
| HTML 본문 | **`detailHtml`(text) 컬럼 존재 — HTML 저장 가능하나 프론트 미노출·미사용.** `usageInfo`/`cautionInfo`도 정의만 되고 미사용. backend route에 `sanitizeHtml()`(script·inline event 제거) 존재. |
| 이미지 | `thumbnailUrl`(varchar500, **URL 문자열**) + `galleryImages`/`images`(jsonb URL[]). media id 아님. 프론트 폼은 `type="url"` 입력(외부 URL 직접 입력 가능) — `StoreLocalProductsManager.tsx:584`. |
| metadata/jsonb 자유컬럼 | **없음.** LLM raw payload·약사검토 상태를 넣을 범용 jsonb 슬롯 부재. |
| 콘텐츠/QR 연결 | entity 자체엔 없음. 외부 조인테이블 `kpa_store_content_product_links`(`product_source_type='local'`, `product_source_id`=local product id, 약참조)로 연결. |
| 등록 화면 | `packages/store-ui-core/.../StoreLocalProductsManager.tsx` — **RichTextEditor 미사용**(plain textarea). KPA는 별도 BaseTable 경로. |

### 2.2 kpa_store_contents — 매장 직접 콘텐츠 (자료함/QR page 대상)

`apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts:36-143`

| 영역 | 실측 |
|---|---|
| HTML 저장 | **`content_json`(jsonb) 의 `html` 키가 표준 HTML 본문 슬롯.** RichTextEditor 직렬화 HTML 저장. |
| content_json 구조 | `{ html, json?(TipTap), tags?, summary?, aiDescription?{mode,items[]}, usage?{displayMode·cta·qr·print}, sourceMetadata?, copiedFrom?, masterId?, copiedAt? }` |
| 기타 컬럼 | `source_type`('direct'·'snapshot_edit') / `tags`(jsonb) / `author_role`('operator'·'store') / `visibility_scope`('organization' 고정) / `source_metadata`(jsonb — supplierName·brandName·receivedChannel·**copiedFrom**) / `workspace_status`('draft'·'pending_ai'·'ai_processed'·'ready_curation'·'archived') |
| QR page 연결 | QR `landing_type='page'` + `landing_target_id`=`kpa_store_contents.id`(**source_type='direct'만**). content_hub 원본 직접참조 금지. — `store-qr-landing.controller.ts:239` |
| **가져오기=복사 경로 (핵심)** | `POST /store-contents/import-b2c-description` — `shared_product_descriptions`(canonical) → **direct 콘텐츠 신규 INSERT(사본 독립)** + `source_metadata.copiedFrom='o4o_b2c_product_description'` 출처보존 + `kpa_store_content_product_links(link_type='product_description')` 동시생성. transaction 1회. — `store-content.controller.ts:503-617` |
| 외부 HTML 붙여넣기 | **가능.** RichTextEditor 'HTML' 탭(`textarea`, "외부 HTML을 붙여넣으세요")이 모든 편집 화면(StoreContentEditPage 등)에 존재. |
| 제작 화면 | `/store/content/:id/edit`(StoreContentEditPage) 등 — RichTextEditor 표준. |

### 2.3 ProductCandidate (`product_candidates`) — 운영자/공급자 검토 큐

`apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts:100-225`

| 영역 | 실측 |
|---|---|
| 성격 | **공급 데이터 후보 검토 큐**(supplier/pharmacy/store/csv/operator/external 유입 → ProductMaster 확정·매칭). SSOT 아님, 중간 상태. |
| rawPayload | `jsonb` nullable — "원본 수집 payload". **외부 LLM 조사 데이터 임시 저장에 형식상 매우 적합.** |
| sourceType | `varchar(32)` + application-level union(DB enum 아님). `'llm_investigation'` 추가 시 **migration 불필요**. |
| status | `candidateStatus`(pending·reviewing·matched·linked·approved_new_master·rejected·merged·archived) + `matchStatus`. 검토상태 표현 풍부. |
| 후보 필드 | candidateName/Brand/Manufacturer/Category/Spec/Unit/ImageUrl/Price + identifierType/Value(매칭입력) + matchedProductMasterId(FK). |
| 경계 | `serviceKey`/`organizationId` nullable 스코핑(매장 스코프 가능). 단 매장 linking은 `linkCandidateToOrganizationListing()` 명시적 액션. |
| **매장 흐름과 충돌(4종)** | ① 도메인 용도 불일치(미확정 후보 vs 매장이 이미 결정한 제품) ② 상태 겹침(candidateStatus.linked vs listing.status) ③ FK 단방향(역추적 불가) ④ **Rx listing 차단 정책**(`product-candidate.service.ts:458` `RX_LISTING_BLOCKED`). |

### 2.4 미디어 / RichTextEditor / sanitize

| 영역 | 실측 |
|---|---|
| 업로드 | `MediaLibraryService.upload()` → 버킷 **`o4o-media-library`**(GCS). 외부 URL **직접 fetch/저장 경로 없음** — 파일 버퍼 업로드만(SSRF fetch 미구현). `MediaPickerModal` 업로드=즉시 영구. |
| 썸네일 저장형 | URL 문자열(`thumbnailUrl`). 단 store_local_products는 **외부 URL 문자열을 그대로 받는 입력 필드**가 이미 존재(업로드 강제 아님). |
| RichTextEditor | `packages/content-editor/src/components/RichTextEditor.tsx`. HTML 탭 raw 보존(WYSIWYG 미편집 시 `htmlSource` authoritative) — WO-...-HTML-TAB-SAVE-RAW-PRESERVE-V1. |
| **sanitize (핵심 리스크)** | `packages/content-editor/src/sanitize.ts` = **DOMPurify**. 기본정책상 **`style` attribute / `<style>` / `<script>` 제거.** 그러나 인라인 디자인 보존 WO(`ir-common-editor-inline-style-loss` / `wo-common-editor-html-tab-raw-preserve`)는 배경/박스 인라인 style 손실을 교정한 이력 → **저장·렌더 단계에서 인라인 style이 실제로 살아남는지 정책이 표면별로 갈림.** §6 게이트로 검증 필요. |
| QR 랜딩 렌더 | CSR + `dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}` (2차 방어). SSR 아님. |

---

## 3. 조사 질문 답변

| # | 질문 | 답변 |
|---|---|---|
| 1 | 1차 등록 위치 = LocalProduct / StoreContent / ProductCandidate? | **제품 카드=StoreLocalProduct + 소비자 HTML=kpa_store_contents(direct) 조합.** ProductCandidate는 매장 흐름 부적합(§2.3 충돌 4종). |
| 2 | 제품 JSON + HTML을 한 화면에 같이 붙여넣는 기존 화면이 있는가? | **단일 화면은 없음.** 제품 등록(StoreLocalProductsManager)과 콘텐츠 편집(StoreContentEditPage)이 분리. 단 둘을 잇는 **링크 배선과 복사 경로는 이미 존재**(import-b2c-description + kpa_store_content_product_links). |
| 3 | 새 화면이면 어느 메뉴 아래? | **약국 상품·거래**(매장 경영활용 제품, 메모상 IA 확정)의 등록 모달 확장, 콘텐츠는 **약국 자료함/콘텐츠**의 direct 작성 경로. |
| 4 | /store/handled-products 에 "LLM 붙여넣기" 추가가 최소 구현인가? | handled-products는 **read-only 통합 조회 뷰**(listings+local UNION). 입력은 그 원본인 **local-products 등록 모달**에 붙이는 것이 정합. |
| 5 | HTML 설명문 = LocalProduct.description vs 별도 StoreContent? | **별도 kpa_store_contents(direct) 권장.** description은 plain text·detailHtml은 미사용/프론트 미배선. QR/POP/블로그 재사용은 kpa_store_contents 가 이미 보유. |
| 6 | QR 상세페이지 연결에 가장 적합한 도메인? | **kpa_store_contents(source_type='direct')** — QR `page` 랜딩이 정확히 이 테이블을 대상으로 함(이미 구현). |
| 7 | 썸네일 외부 URL 저장 가능? 업로드 필수? | **외부 URL 문자열 저장 가능**(thumbnailUrl 입력 존재). 단 외부 URL은 깨짐/핫링크 위험 → **MediaPickerModal 업로드(o4o-media-library) 권장**. V1은 URL 허용 + 업로드 옵션. |
| 8 | 약사 검토 상태 저장할 기존 필드? | LocalProduct엔 **없음**. kpa_store_contents엔 `workspace_status`(draft 등)·`source_metadata` 존재. |
| 9 | 없으면 metadata/jsonb에 넣을 수 있나? | **kpa_store_contents.content_json / source_metadata 에 넣을 수 있음.** LocalProduct는 범용 jsonb 부재(넣으려면 additive 컬럼 1개). |
| 10 | V1에서 DB 변경 없이 가능? | **거의 가능.** 두 테이블·링크테이블·복사 경로가 모두 존재. 신규 컬럼/테이블 0으로 1차 가능(§5). |
| 11 | DB 변경 필요 시 최소 컬럼? | (선택) `store_local_products.metadata jsonb nullable` 1개 — LLM raw/바코드후보/약사검토를 제품 카드에 직접 보존하려는 경우에 한함. 그 외 가능. |

---

## 4. 후보 설계안 비교

### A안 — StoreLocalProduct 확장

```text
/store/.../local-products 등록 모달에서 매장 경영활용 제품으로 등록.
LLM 제품 JSON → name/barcode/category/priceDisplay/summary 매핑.
LLM HTML → detailHtml(미사용 컬럼 활성화) 또는 신규 metadata jsonb.
썸네일 → thumbnailUrl(외부 URL) 또는 업로드.
```

| 장점 | 단점 / 필요 변경 |
|---|---|
| 제품 카드 필드 대부분 이미 존재(barcode 앞자리0·priceDisplay 정규화·badge) | HTML 설명문이 QR/POP/블로그로 **재사용 안 됨**(LocalProduct는 QR page 대상 아님 — kpa_store_contents 만 대상) |
| Display Domain·org 격리 그대로 | `detailHtml` 프론트 배선 신규 필요 + RichTextEditor 미탑재 |
| 신규 테이블 0 | 약사검토/LLM raw 저장할 jsonb 없음 → additive 컬럼 1개 필요 |

### B안 — kpa_store_contents(direct)로 저장

```text
LLM HTML → kpa_store_contents.content_json.html (RichTextEditor 'HTML' 탭 붙여넣기).
제품 메타(LLM JSON) → content_json / source_metadata 에 보존.
QR/POP/블로그 → 기존 direct 콘텐츠 재사용 경로 그대로.
```

| 장점 | 단점 / 필요 변경 |
|---|---|
| **QR page/POP/블로그 재사용이 이미 동작**(direct 콘텐츠 대상) | "제품 카드"(barcode·가격·진열)로서의 구조화 약함 — 콘텐츠일 뿐 |
| 가져오기=복사·출처보존·workspace_status·tags 모두 보유 | 제품 단위 조회(취급제품 목록)에 안 잡힘 |
| RichTextEditor·HTML탭·sanitize 라인 그대로 | 제품-콘텐츠 분리가 약해 "제품 1 : 콘텐츠 N" 관리 모호 |

### C안 — ProductCandidate + StoreContent 분리

```text
제품 후보 데이터 → ProductCandidate(rawPayload, source='llm_investigation').
소비자 HTML → kpa_store_contents(direct).
metadata로 느슨히 연결.
```

| 장점 | 단점 / 필요 변경 |
|---|---|
| rawPayload·sourceType 확장성 우수 | **§2.3 충돌 4종** — 운영자/공급자 검토 큐를 매장 실행 흐름에 전용하면 상태/경계 오염 |
| 후보 검토 워크플로 재사용 | Rx listing 차단 정책과 충돌, 역추적 불가 |
| | 매장 단위 활용과 이중 상태관리 → 가장 무거움 |

---

## 5. V1 권장안 — 제품 등록과 콘텐츠 제작의 **책임 분리** (A+B 조합)

> **결정 1: 제품 등록(StoreLocalProduct)과 제품 콘텐츠 제작(기존 콘텐츠 도메인)을 분리한다.**
> 제품은 "이 제품이 무엇인가"(StoreLocalProduct), 콘텐츠는 "이 제품을 소비자에게 어떻게 설명할 것인가"(kpa_store_contents direct / 운영자 콘텐츠). 둘을 한 테이블에 섞지 않는다. HTML 설명문은 `StoreLocalProduct.description`에 억지로 넣지 않고 **기존 콘텐츠 리스트에 별도 콘텐츠로 저장**한다.

> **결정 2: V1은 제품 등록 화면에 콘텐츠 생성을 붙이지 않는다.** 제품 상세/리스트에서 **"제품 콘텐츠 만들기" 진입점**만 제공하고, 클릭 시 **기존 콘텐츠 편집기**로 이동한다(제목/요약/본문 초안은 제품 정보에서 prefill 가능하면 적용). 저장은 **기존 콘텐츠 리스트 저장 흐름을 그대로** 사용한다.

> **결정 3: V1 연결은 FK가 아니라 제목 + metadata 느슨한 연결.** 정식 연결 컬럼/링크테이블 FK는 만들지 않는다(필요 입증 시 후속). `kpa_store_content_product_links`(약참조)가 이미 존재하므로 후속에서 그대로 승격 가능.

```text
[1] 제품 등록      : store_local_products (일반 등록 흐름)
      name / barcode(varchar64, 앞자리0) / category / priceDisplay / summary / thumbnailUrl(or 업로드) / badgeType
      LLM 조사 결과/주요 문구/주의사항/썸네일 = 제품 기본 정보로 저장
[2] 콘텐츠 제작    : 제품 상세/리스트 → "제품 콘텐츠 만들기" 진입점 → 기존 콘텐츠 편집기로 이동
      회원 + Claude Code(또는 외부 LLM 결과 편집)로 HTML/설명문 작성
      RichTextEditor 'HTML' 탭에 붙여넣기/편집 → sanitize → 저장 (사본 독립)
      제목   = "[제품명] 소비자 안내 콘텐츠"
      metadata(content_json/source_metadata):
        sourceProductName / storeLocalProductId / contentPurpose='product_explanation'
        reviewStatus='pharmacist_review_required'|'ready' (또는 workspace_status='draft'→'ready_curation')
        copiedFrom='llm_manual' (출처표시)
[3] 저장 위치      : 매장 제작 = 내 매장 콘텐츠 리스트 (kpa_store_contents direct, author_role='store')
                     운영자 제작 = 운영자 콘텐츠 리스트 (author_role='operator')
                     매장은 운영자 콘텐츠를 가져오기=복사로 활용
[4] 재사용         : QR page(landing_target_id=content id) / POP / 블로그 = 기존 direct 콘텐츠 경로 그대로
```

### 5.1 왜 이 구조인가

- **책임 분리**: 제품 등록("무엇인가")과 콘텐츠 제작("어떻게 설명하나")을 한 테이블에 섞지 않음 → 제품 1 : 콘텐츠 N 관리가 자연스러움.
- **기존 O4O 흐름과 정합**: 매장 콘텐츠는 내 매장 콘텐츠 리스트, 운영자 콘텐츠는 운영자 콘텐츠 리스트, 매장은 **가져오기=복사**로 운영자 콘텐츠 활용 — 기존 원칙 그대로.
- **재사용성**(원칙 "QR/블로그 재사용"): QR `page`·POP·블로그가 모두 kpa_store_contents(direct)를 이미 대상으로 함. LocalProduct 단독(A안)은 재사용 불가.
- **임시 수작업에 적합**: 처음에는 회원 + Claude Code가 제품별 콘텐츠를 직접 제작 → 패턴 정리 후 LLM 프롬프트/템플릿/자동화로 확장.
- **복사 경로 재사용 여지**: `import-b2c-description`이 이미 "외부 canonical → direct 사본 + 출처보존 + 링크"를 transaction으로 구현. 운영자→매장 가져오기=복사에 동형으로 재사용 가능(입력 소스만 다름).
- **Core 무오염**: ProductMaster / ProductCandidate / representative_products / 공급자 B2C 설명 전부 미접촉. Display Domain 유지.

### 5.2 DB 변경 범위

- **V1(권장, 신규 DB 0)**: 제품(store_local_products)·콘텐츠(kpa_store_contents direct)·저장 흐름·복사 경로 모두 존재. 제품↔콘텐츠 연결은 **제목 + content_json/source_metadata 느슨한 연결**(sourceProductName·storeLocalProductId·contentPurpose·reviewStatus). 신규 컬럼/테이블/FK 없이 가능.
- **V1.5(조건부, 별도 WO)**: 제품 단위 콘텐츠 조회·집계 성능이 필요하면 기존 `kpa_store_content_product_links`(약참조, 이미 존재)로 정식 연결 승격. 신규 테이블 없음.
- **(조건부 additive)**: 제품 카드 자체에 LLM raw·약사검토 상태를 구조적으로 보존해야 하면 `store_local_products.metadata jsonb nullable` 1컬럼(additive, Display Domain 불변). 입증 전 보류.

### 5.3 반드시 검증할 게이트 (구현 전)

> **게이트 G1 (인라인 style sanitize) — ✅ 실측 완료·PASS**: `CHECK-O4O-CONTENT-EDITOR-INLINE-STYLE-PRESERVE-G1-V1`(2026-06-30)에서 **레포 실설치 DOMPurify 3.3.0** 을 직접 실행해 검증한 결과, **기본 정책상 `style` attribute가 보존**되며(사전 추적의 "기본값이 style 제거" 가설은 거짓으로 정정) 입력(HTML 탭 raw 경로)→저장→QR/블로그 렌더 전 구간에서 인라인 style이 살아남는다. **sanitize 변경 불필요, 디자인 HTML 그대로 활용 가능.** 단 (A) WYSIWYG('edit' 탭) 재편집 시 TipTap 직렬화로 소실되므로 "HTML 탭 붙여넣기 후 그대로 저장"을 작성 가이드로 안내, (B) CSS 위험 토큰(`url(javascript:)`·`expression()`) 미제거는 낮은 우선순위 hardening 후보(별도 보안 WO, blocker 아님).

> **게이트 G2 (썸네일 외부 URL)**: thumbnailUrl은 외부 URL을 받지만 핫링크 깨짐 위험. V1은 URL 허용하되 MediaPickerModal 업로드(`o4o-media-library`)를 1순위로 안내.

> **게이트 G3 (의약품/약사 검토)**: 의약품 정보는 `workspace_status='draft'` + 검토 플래그로 "검토 필요" 상태를 반드시 표현. 검토 전 콘텐츠가 공개 QR로 노출되지 않도록 게이트.

---

## 6. 위험 요소 / 유보 사항

1. **인라인 style sanitize 표면별 차이**(G1) — 가장 큰 불확실성. LLM HTML 활용 가치 자체를 좌우.
2. **2-step UX는 의도된 분리** — 제품 등록과 콘텐츠 제작이 분리(§결정 1·2)되어 UX상 2-step이나, 이는 책임 분리상 의도된 것. V1은 "제품 콘텐츠 만들기" 진입점 + prefill로 연결성을 보완하고, 한 화면 통합은 패턴 정리 후 후속 검토.
3. **외부 이미지 핫링크/저작권**(G2) — 업로드 권장.
4. **의약품 표시 책임**(G3) — 약사 검토 전 공개 노출 차단. 의약품 공공데이터/표준코드 매칭은 **본 IR 범위 밖**(운영자/공급자 축 = 인접 IR). 본 흐름은 매장 임시 제작 흐름.
5. **ProductCandidate 오용 금지** — 매장 흐름에 candidate를 쓰면 §2.3 4종 충돌. C안 비채택 근거.
6. **detailHtml 컬럼 처리** — 미사용 컬럼을 활성화할지(A안 잔재) 여부는 V1 비채택. kpa_store_contents 로 일원화.

---

## 7. 최종 결론

> 외부 LLM으로 만든 상품 데이터와 HTML 설명문을 약국 콘텐츠로 활용하는 임시 흐름은 **제품 등록과 콘텐츠 제작의 책임을 분리**하는 것이 O4O 전체 구조와 가장 잘 맞는다: 제품 기본 정보는 **StoreLocalProduct**(매장 경영활용 제품, Display Domain)에 일반 등록하고, 소비자 HTML 설명문은 **기존 콘텐츠 도메인**(`kpa_store_contents` source_type='direct' = 내 매장 콘텐츠 / author_role='operator' = 운영자 콘텐츠)에 별도 콘텐츠로 저장한다. `StoreLocalProduct.description`에 HTML을 억지로 넣지 않는다.
>
> V1은 제품 등록 화면에 콘텐츠 생성을 붙이지 않고, 제품 상세/리스트의 **"제품 콘텐츠 만들기" 진입점 → 기존 콘텐츠 편집기(제품정보 prefill)** 로 이동해 기존 저장 흐름을 그대로 쓴다. 제품↔콘텐츠 연결은 **제목 + metadata(sourceProductName·storeLocalProductId·contentPurpose·reviewStatus) 느슨한 연결**로 시작하고, FK/정식 링크는 후속으로 미룬다. 운영자 콘텐츠는 운영자 리스트에 저장하고 매장은 **가져오기=복사**로 활용한다. 따라서 V1은 신규 테이블/컬럼/FK 0으로 가능하다. ProductCandidate / ProductMaster / representative_products 는 이번 흐름에서 건드리지 않는다. 단 **인라인 style sanitize 보존 여부(G1)** 를 구현 전 반드시 실측해야 한다.

### 7.1 최종 보고 요약표

| # | 항목 | 결론 |
|---|---|---|
| 1 | 가장 적합한 붙임 위치 | **제품 등록(StoreLocalProduct) ↔ 콘텐츠 제작(기존 콘텐츠 도메인) 책임 분리.** 연결=제목+metadata 느슨한 연결(FK 후속). |
| 2 | StoreLocalProduct 적합성 | 제품 기본 정보로 적합(barcode/가격/배지 보유). HTML 설명·재사용엔 부적합(QR page 대상 아님) → description에 HTML 안 넣음. |
| 3 | StoreContent(kpa_store_contents) 적합성 | HTML 설명·QR/POP/블로그 재사용·복사·태그·검토상태 모두 보유 → 설명문 SSOT로 적합. |
| 4 | ProductCandidate 적합성 | **부적합** — 운영자/공급자 검토 큐, 4종 충돌(용도/상태/단방향/Rx). |
| 5 | 이미지/썸네일 | thumbnailUrl=URL 문자열(외부 URL 허용). 업로드=o4o-media-library 권장. media id 아님. |
| 6 | HTML 저장/렌더 | content_json.html 저장 + RichTextEditor 'HTML'탭 붙여넣기. 렌더=dangerouslySetInnerHTML+sanitize. **인라인 style 보존은 G1 검증.** |
| 7 | DB 변경 없이 가능 범위 | **V1 전체 가능**(제품·콘텐츠·저장흐름·복사 경로 존재, 신규 테이블/컬럼/FK 0. 연결=metadata). |
| 8 | DB 변경 필요 시 최소안 | (후속) 기존 `kpa_store_content_product_links` 약참조로 정식 연결 승격 / (조건부) `store_local_products.metadata jsonb` 1컬럼. 입증 전 보류. |
| 9 | V1 추천안 | **제품/콘텐츠 책임 분리 + "제품 콘텐츠 만들기" 진입점 + metadata 느슨한 연결** — §5. |
| 10 | 다음 실행 WO | **WO-O4O-STORE-PRODUCT-LLM-MANUAL-CONTENT-FLOW-V1** (§8). |

---

## 8. 후속 WO 후보 초안

### WO-O4O-STORE-PRODUCT-LLM-MANUAL-CONTENT-FLOW-V1 (핵심)
- **방향**: 제품 등록과 콘텐츠 제작을 **분리**. 제품 등록 화면에 콘텐츠 생성을 붙이지 않는다.
- **선행 게이트 G1 = ✅ PASS** (`CHECK-O4O-CONTENT-EDITOR-INLINE-STYLE-PRESERVE-G1-V1`): 인라인 style 보존 확인 → **디자인 HTML 그대로 활용**, sanitize 변경 없이 착수 가능. 작성 UX는 "HTML 탭 붙여넣기 후 그대로 저장"(WYSIWYG 재편집 시 style 소실) 안내.
- **제품 등록**: 기존 store local-products 등록 흐름 그대로 사용(LLM 조사 결과/주요 문구/주의사항/썸네일을 제품 기본 정보로 저장). 신규 입력기 불필요.
- **진입점**: 제품 상세/리스트에 **"제품 콘텐츠 만들기"** 버튼 추가 → 클릭 시 **기존 콘텐츠 편집기로 이동**. 제목/요약/본문 초안은 제품 정보에서 prefill(가능 범위 내).
- **콘텐츠 작성/저장**: 기존 콘텐츠 편집기(RichTextEditor 'HTML'탭에 외부 LLM HTML 붙여넣기/편집) → **기존 저장 흐름** 사용. 매장=내 매장 콘텐츠 리스트(direct, author_role='store'), 운영자=운영자 콘텐츠 리스트(author_role='operator'). 매장은 운영자 콘텐츠를 **가져오기=복사**로 활용(기존 `import-b2c-description` 동형 경로 재사용 가능).
- **연결(느슨)**: content_json/source_metadata 에 `sourceProductName`·`storeLocalProductId`·`contentPurpose='product_explanation'`·`reviewStatus`(또는 workspace_status)·`copiedFrom='llm_manual'`. **FK/링크테이블 신규 0.**
- **약사 검토**: reviewStatus='pharmacist_review_required' → 'ready'(또는 workspace_status draft→ready_curation). 미검토 의약품 콘텐츠 공개 QR 노출 차단.

### ~~(선행) WO-O4O-CONTENT-EDITOR-INLINE-STYLE-PRESERVE-AUDIT-V1~~ → ✅ `CHECK-O4O-CONTENT-EDITOR-INLINE-STYLE-PRESERVE-G1-V1`로 충족·종료
- G1 실측 완료(인라인 style 보존 PASS). 별도 선행 audit WO 불필요.

### (선택, 낮은 우선순위) WO-O4O-CONTENT-EDITOR-CSS-VALUE-HARDENING-V1
- G1 CHECK 유보 B 전용. 인라인 style 보존은 유지하되 CSS 값에서 `javascript:`/`expression(`/위험 `url()` 토큰 필터. dangerouslySetInnerHTML 결합 방어용. 실질 위험 낮음 → blocker 아님, 별도 보안 트랙.

### (조건부) WO-O4O-STORE-PRODUCT-CONTENT-LINK-PROMOTION-V1
- 제품 단위 콘텐츠 조회·집계(제품당 콘텐츠 N) 성능이 필요하면, metadata 느슨한 연결 → 기존 `kpa_store_content_product_links`(약참조, `product_source_type='local'`, `link_type='product_description'`) 정식 연결로 승격. 신규 테이블 없음. 입증 전 보류.

### (조건부) WO-O4O-STORE-LOCAL-PRODUCT-METADATA-ADDITIVE-V1
- 제품 카드에 LLM raw/바코드 후보/약사검토 상태를 구조적으로 보존·조회할 필요가 입증되면 `store_local_products.metadata jsonb nullable` 1컬럼 additive. 입증 전 보류.

### (확장) 외부 LLM 결과를 자동 매칭/공공데이터 연계
- V2 이후. 본 IR의 수동 흐름 위에 의약품 표준코드/ProductMaster 매칭(인접 IR `IR-O4O-DRUG-STANDARD-CODE-CANDIDATE-IMPORT-DESIGN-V1` 의 운영자/공급자 축)과 연계 검토. 매장 임시 흐름과는 별 트랙.

---

**작성:** O4O Platform 코드 audit IR · 2026-06-30
**성격:** read-only — 코드/DB/migration/API/UI 변경 없음, git 작업 없음. 실 엔티티·라우트·sanitize 라인 직접 대조(StoreLocalProduct / kpa_store_contents / ProductCandidate / MediaLibraryService / RichTextEditor). 구현은 §8 후속 WO로 위임.
