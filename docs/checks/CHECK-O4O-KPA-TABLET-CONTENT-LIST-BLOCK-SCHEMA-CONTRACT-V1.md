# CHECK-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1

> WO: `WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1`
> 성격: 서버/계약 구현(UI 없음, viewer 렌더 없음). 구현 + additive migration + 배포 + prod read-only smoke.
> 선행: `CHECK-O4O-KPA-TABLET-CONTENT-SOURCE-SELECTION-DESIGN-V1`
> Date: 2026-07-13

---

## 0. 결론

`content_list` block_type 을 **실제 데이터 계약**으로 열었다. viewer 렌더/picker UI 는 후속 Phase.

- content_list 저장 허용(화이트리스트 + DB CHECK additive migration).
- config 검증(`parseContentListConfig`) — sourceType 2종, 키/override/visible/sortOrder.
- `/tablet/screen` 이 content_list item 을 **서버에서 viewer-ready 카드**로 resolve(참조 ID만 통과하던 product_content 실패 반복 안 함).
- 기존 product_list/product_content/샘플/ viewer **불변**. 운영 샘플 write 0.
- typecheck 0(변경 파일) · unit test 11/11 · resolve SQL 양 sourceType prod read-only 검증 · 배포 success · migration 반영 · 기존 샘플 non-regression 200.

---

## 1. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-tablet-content-list-block.ts` | **신규** — `parseContentListConfig`(순수 검증) + 타입 |
| `apps/api-server/src/routes/platform/store-public/store-public-tablet-content-resolve.ts` | **신규** — `resolveContentListItems`(DB DI, item→카드) |
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | `SET_BLOCK_TYPES` 에 `content_list` 추가 + PUT blocks 검증에 `parseContentListConfig` 분기 |
| `apps/api-server/src/routes/platform/store-public/store-public-tablet.handler.ts` | `/tablet/screen` 에 `content_list` → `resolveContentListItems` 분기 |
| `apps/api-server/src/database/migrations/20270206000000-AddContentListToTabletBlockTypeCheck.ts` | **신규** — block_type CHECK 에 content_list additive |
| `apps/api-server/src/routes/platform/__tests__/store-tablet-content-list-block.test.ts` | **신규** — config 검증 단위 테스트 11건 |

커밋: `32363cc6e`.

---

## 2. block_type whitelist 변경

- 서버 저장 화이트리스트 `SET_BLOCK_TYPES`(store-tablet.routes.ts): 7종 → **8종**(`content_list` 추가). 기존 타입 삭제/변경 없음.
- PUT `/store/screen-sets/:id/blocks` 저장 시 `content_list` 허용 + config 검증.

## 3. DB CHECK migration 필요 여부 → **필요(additive)**

- `store_tablet_screen_blocks.block_type` 에 `CHK_store_tablet_screen_blocks_type` CHECK 제약 존재 → additive migration 으로 `content_list` 추가.
- migration `20270206000000-AddContentListToTabletBlockTypeCheck`: DROP + 재생성(8종). down = content_list row 정리 후 7종 복귀.
- **prod 반영 확인**: 배포 후 `pg_get_constraintdef` = `...'qr_guide', 'content_list'...` (8종 포함).

## 4. content_list config shape (Phase 1 = JSONB)

```json
{ "items": [
  { "sourceType": "o4o_product_description", "masterId": "<uuid>", "language": "ko",
    "displayTitle": null, "displaySummary": null, "visible": true, "sortOrder": 10 },
  { "sourceType": "store_content", "contentId": "<kpa_store_contents.id>",
    "displayTitle": null, "displaySummary": null, "visible": true, "sortOrder": 20 } ] }
```

## 5. validation 규칙 (`parseContentListConfig`)

- config = object, `items` = 배열(빈 배열 허용), item ≤ 100.
- `sourceType` ∈ {`o4o_product_description`, `store_content`}.
- o4o → `masterId` 필수(non-empty), `language` optional(기본 `ko`).
- store_content → `contentId` 필수(non-empty).
- `displayTitle`/`displaySummary` optional override(string→trim / null). 잘못된 타입 거부.
- `visible` optional boolean(기본 true). `sortOrder` optional 유한수(기본 index).
- 위반 → 저장 시 **400 `INVALID_BLOCK_CONFIG`**.

## 6. sourceType별 resolve 방식 (`resolveContentListItems`)

- 공통: parse 실패 config → `[]`. `visible=false`/resolve 실패 item → skip. `sortOrder` 오름차순. resolve 상한 50.
- **o4o_product_description** (키 = masterId + language):
  - `product_masters` 존재 확인 + `shared_product_descriptions`(description_type='STORE', status='canonical', deleted_at IS NULL) 를 `(language=요청) DESC, (language='ko') DESC, updated_at DESC LIMIT 1` LATERAL 조회.
  - ProductMaster 없음 / STORE canonical 없음 → **skip**. (SPD row id 미저장 → canonical 추종.)
- **store_content** (키 = kpa_store_contents.id):
  - `organization_id == 매장 org` + `workspace_status <> 'archived'`.
  - 없음/타 org(조회 안 됨) → **skip**.
- 카드 shape:
```
{ itemId, sourceType, sourceBadge('O4O 표준'|'매장 제작'), title(override→원본),
  summary(override→원본), thumbnailUrl(null P1), hasDetail, relatedProductName, detail:{ html } }
```

## 7. 권한 / 상태 게이트

- store_content: org 일치(save 는 세트 org 소유 + render 는 organization_id 검증) — 타 매장 참조 차단. archived 제외. (kpa_store_contents 에 deleted_at 없음 → 삭제 = row 부재.)
- o4o_product_description: STORE canonical 만(candidate/needs_review/hidden/deprecated 제외). masterId 무효 → skip.
- item resolve 실패는 `/screen` 전체 실패로 만들지 않음(개별 skip). **section 은 items=[] 로도 반환**(§5 권장 방식 채택).

## 8. HTML 안전 (§6)

- **B안 채택 + 계약 명시**: 서버는 `detail.html` 에 원문 HTML 을 문자열로 전달(서버가 dangerously 렌더하지 않음). **viewer 는 ContentRenderer(@o4o/content-editor `sanitize.ts` DOMPurify)로만 렌더**한다는 계약. viewer 렌더 구현은 후속 RUNTIME WO.

## 9. /tablet/screen 응답 shape (content_list section)

```json
{ "blockType": "content_list", "sortOrder": 35,
  "data": { "items": [ { "itemId":"o4o:<master>:ko", "sourceType":"o4o_product_description",
    "sourceBadge":"O4O 표준", "title":"…", "summary":"…", "thumbnailUrl":null,
    "hasDetail":true, "relatedProductName":"…", "detail":{ "html":"<p>…</p>" } } ] } }
```

## 10. 기존 샘플 불변 확인 (prod read-only smoke)

배포(API deploy run 29219735180 **success**) 후:

| 코너 | /tablet/screen | sections |
|------|:---:|---|
| 구강관리(c86863d8) | **200** | idle_media · corner_description · product_list · qr_guide (불변) |
| 피부관리(f8b78a16) | **200** | idle_media · corner_description · product_list · qr_guide (불변) |

- 샘플에 content_list block 미추가 → 기존 응답/섹션/viewer 동작 **무변경**.
- content_list block 을 **운영 샘플에 만들지 않음**(§10 준수). resolve 는 아래 §11 로 검증.

## 11. typecheck / build / test

- api-server `tsc --noEmit`: **변경 파일 에러 0**(잔존 에러는 무관한 drug-otc 스크립트).
- unit test `store-tablet-content-list-block.test.ts`: **11/11 PASS**(빈 배열/o4o·store 정상/기본값/무효 sourceType·키·타입 거부 등).
- web-kpa-society: **프론트 무변경**(백엔드 계약만) → viewer 화면 변화 없음.
- **resolve SQL prod read-only 검증**:
  - o4o: master `293eb90b`(니코틴엘TTS30) → STORE canonical content 존재(카드 생성) ✓
  - store: `1365753d`(해양 심층수 효능, org=네뚜레, workspace_status=draft) → html 존재(카드 생성) ✓
  - 둘 다 에러 없이 실행(배포 전 500 방지 확인).

## 12. production smoke 결과
```
API deploy: success (run 29219735180)
migration 20270206000000: 반영(CHECK 8종 포함 확인)
기존 샘플 /tablet/screen: 200, 섹션 불변
DB write(운영 샘플/block): 0
```

## 13. 완료 기준 대비

| 기준 | 상태 |
|------|------|
| content_list block_type 허용 | ✅ (whitelist + CHECK migration) |
| content_list config validation 동작 | ✅ (parseContentListConfig + 400) |
| /tablet/screen content_list → card data resolve | ✅ (resolveContentListItems) |
| o4o_product_description resolve | ✅ (SPD STORE canonical, ko fallback) |
| store_content resolve | ✅ (org+archived 게이트) |
| org scope / archived / deleted 게이트 | ✅ |
| 기존 product_list/product_content/viewer 불변 | ✅ |
| 운영 샘플 write 0 | ✅ |
| typecheck/build/test 통과 | ✅ |
| 배포 후 기존 샘플 read-only smoke | ✅ |
| CHECK commit/push | ✅ 본 문서 |

---

## 14. 후속 WO
```
WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-RUNTIME-V1     ← viewer 카드 섹션 렌더(ContentRenderer)
WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1         ← 관리 편집기 picker
WO-O4O-KPA-TABLET-V1-USABLE-CORNER-CONTENT-SEED-V1  ← content_list viewer 렌더 후 재개
```
`USABLE-CORNER-CONTENT-SEED` 는 content_list 가 viewer 에 실제 렌더되고 선택/주입 경로가 생긴 뒤 재개.

---

*content_list 블록 서버/계약 개통 · block_type whitelist+CHECK additive migration · parseContentListConfig(sourceType 2종, 400 검증) · /tablet/screen 서버 resolve 카드(o4o=SPD STORE canonical masterId+language, store=kpa_store_contents org+archived 게이트, 실패 skip, items=[] 허용) · HTML=viewer ContentRenderer sanitize 계약 · product_list/product_content/샘플/viewer 불변 · typecheck0/test11 PASS/resolve SQL prod검증 · 배포 success·migration 반영·기존 샘플 200 · 운영 write0.*
