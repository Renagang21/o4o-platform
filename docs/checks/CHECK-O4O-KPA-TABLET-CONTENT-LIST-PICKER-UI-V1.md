# CHECK-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1

> WO: `WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1`
> 성격: 관리 편집기 picker UI + read-only 검색 API. 구현 + 배포 + smoke.
> 선행: content_list schema/contract(계약) + runtime(viewer 렌더) 완료.
> Date: 2026-07-13

---

## 0. 결론

태블릿 Screen Set 편집기에서 운영자가 **raw JSON 없이** `content_list` 블록을 구성할 수 있다. O4O 표준 설명서·매장 제작 콘텐츠를 검색·선택해 카드 목록을 만든다.

- 신규 블록 "코너 콘텐츠 목록"(content_list) + picker 편집 UI(선택 목록 정렬/표시/제거 + 제목/요약 override + 콘텐츠 추가 모달).
- picker 검색 = **read-only 엔드포인트 2종**(store-contents / o4o-descriptions). 저장은 기존 `PUT /screen-sets/:id/blocks` 계약 그대로.
- migration/서버 resolve 계약/복사 API/seed **무변경**. typecheck 0. 배포 success. 엔드포인트 wiring + 공개 non-regression 확인.
- **관리 UI 클릭 검증은 Deferred**(관리 화면 /login·자동 로그인 금지 정책).

---

## 1. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | picker 검색 2 엔드포인트(read-only) |
| `services/web-kpa-society/src/api/tabletDisplays.ts` | `ScreenBlockType` += content_list, picker 검색 함수/타입 |
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | content_list 블록 + `ContentListEditor` + `ContentPickerModal` |

커밋: `396160b97`.

---

## 2. 추가한 picker UI (§4·§7)

- 블록 추가 목록에 **"코너 콘텐츠 목록"**(content_list). `product_content` 는 **"(구)"** 라벨로 표기(deprecated).
- **ContentListEditor**(raw JSON 폐기): 선택 item 행 = 출처 배지(O4O 표준/매장 제작) + 참조 요약 + **표시 토글** + **위/아래 정렬** + **제거** + **제목 override** + **요약 override**.
- **ContentPickerModal**: 출처 탭(`O4O 표준 설명서` / `매장 제작 콘텐츠`) + 검색 + 다중 선택 + 추가. 중복(masterId+language / contentId) dedup.

## 3. 지원 sourceType (§5)
| sourceType | 선택 결과 config | 검색 |
|------------|------------------|------|
| `o4o_product_description` | `{masterId, language:'ko', displayTitle:null, displaySummary:null, visible:true, sortOrder}` | 상품명/바코드 → STORE canonical 있는 상품 |
| `store_content` | `{contentId, displayTitle:null, displaySummary:null, visible:true, sortOrder}` | 콘텐츠 제목(org 스코프) |

- **SPD row id 미저장** — masterId+language(기본 ko) 저장(canonical 추종).

## 4. 사용/추가한 API (§6)
| 엔드포인트 | 방식 | 비고 |
|-----------|------|------|
| `GET /store/tablet-content-sources/store-contents?q=` | **신규 read-only** | org 스코프 kpa_store_contents(archived 제외) 검색. `{contentId,title,sourceType,workspaceStatus,summary,hasProductLink}` |
| `GET /store/tablet-content-sources/o4o-descriptions?q=` | **신규 read-only** | STORE canonical 있는 product_masters 검색(name/barcode). `{masterId,name,barcode,summary,languages}`. STORE canonical=공용 표준(org 게이트 없음), auth=store owner |
| `PUT /store/screen-sets/:id/blocks` | **재사용** | content_list config 저장(선행 계약) |

- 표준 복사 API 재활성화·콘텐츠 생성/스키마 변경·runtime 계약 변경 **없음**(§6 금지 준수).

## 5. content_list config 생성 방식 (§8)
```json
{ "items": [
  { "sourceType": "o4o_product_description", "masterId": "<uuid>", "language": "ko",
    "displayTitle": null, "displaySummary": null, "visible": true, "sortOrder": 10 },
  { "sourceType": "store_content", "contentId": "<uuid>",
    "displayTitle": null, "displaySummary": null, "visible": true, "sortOrder": 20 } ] }
```
- 추가/정렬 시 sortOrder = index*10 재부여. 계약(parseContentListConfig)과 동일 shape.

## 6. dirty guard 연동 (§8)
- 저장은 기존 `saveScreenSetBlocks` → blocks state 변경이 `blocksDirty`(normalizeBlocks 비교)에 자동 반영.
- content_list item 추가/제거/정렬/override/visible 토글 → config 변경 → **blocksDirty=true**(변경됨 배지 + '블록 저장 필요'). '블록 저장' 성공 → baseline 갱신 → dirty=false. (기존 dirty guard 로직 재사용, 추가 배선 불필요.)

## 7. 저장 payload 예시
`PUT /store/screen-sets/:id/blocks`:
```json
{ "blocks": [ { "blockType": "content_list", "sortOrder": 3, "isEnabled": true,
  "config": { "items": [ {"sourceType":"o4o_product_description","masterId":"…","language":"ko","displayTitle":null,"displaySummary":null,"visible":true,"sortOrder":10} ] } } ] }
```
- 잘못된 item(누락 masterId/contentId 등) → 서버 `parseContentListConfig` **400 INVALID_BLOCK_CONFIG**(선행 계약).

## 8. typecheck / build
- api-server `tsc --noEmit`: **변경 파일(store-tablet.routes) 에러 0**.
- web-kpa-society `tsc --noEmit`: **TabletScreenSetManager / tabletDisplays 에러 0**.
- picker 검색 SQL **prod read-only 검증**: o4o(`q=니코틴` → 세비타비겔/니코에이껌/니코에이패취 등 STORE canonical 매칭, barcode/languages 반환) · store(org 네뚜레 → 종합비타민 골드·환절기 면역 등 최근순).

## 9. production smoke
- 배포: API deploy 29222486737 **success** + Web deploy 29222486740 **success**.
- **picker 엔드포인트 wiring**: 미인증 호출 → `store-contents` 401 · `o4o-descriptions` 401 (**404 아님** = 라우트 존재, auth 요구 정상).
- **공개 viewer non-regression**: 피부관리 `/tablet/screen` 200, sections = idle_media·corner_description·product_list·qr_guide (불변). 관리 변경이 public runtime 무영향.
- **운영 샘플 write 0**(§10·§12 준수).

## 10. browser smoke — Deferred 사유
- 관리 화면 `/store/commerce/tablet-displays` → **`/login` 리다이렉트(미인증)**. WO §12: **자동 로그인/체험계정 클릭 금지 → 로그인 화면이면 Deferred**.
- 따라서 §11.1~11.4(블록 추가 표시·매장 콘텐츠 선택·O4O 검색·저장 payload)의 **화면 클릭 검증은 Deferred**.
- 대체 확보 근거: 엔드포인트 wiring(401)·검색 SQL prod 검증·typecheck 0·배포 success·config 계약(선행 CHECK 서버 검증). 인증 세션(경영자 로그인)에서 후속 UI 클릭 검증 권장.

## 11. 운영 샘플 write 여부
```
DB write 0 · migration 0 · 운영 샘플/block 무변경 · 콘텐츠/상품 seed 0
picker 검색 = read-only SELECT
```

## 12. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| content_list 블록 편집 UI 추가 가능 | ✅ (블록 목록 + ContentListEditor) |
| O4O 표준 설명서 선택 | ✅ (picker o4o 탭 + 검색 API) |
| 매장 제작 콘텐츠 선택 | ✅ (picker store 탭 + 검색 API) |
| 정렬/숨김/제거 | ✅ |
| displayTitle/displaySummary override | ✅ |
| 계약 shape 저장 | ✅ (기존 blocks 저장 재사용) |
| dirty guard 연동 | ✅ (blocksDirty 자동) |
| 기존 viewer/runtime 불변 | ✅ (public non-regression) |
| 운영 샘플 무단 write 0 | ✅ |
| typecheck/build 통과 | ✅ |
| CHECK commit/push | ✅ |
| 화면 클릭 검증 | ⏸ Deferred(관리 /login·자동 로그인 금지) |

## 13. 후속 — USABLE-CORNER-CONTENT-SEED 재개 가능 여부
- **재개 가능.** content_list 는 이제 서버 계약 + viewer 렌더 + picker(운영자 선택) 3요소가 모두 열림.
- 다음 `WO-O4O-KPA-TABLET-V1-USABLE-CORNER-CONTENT-SEED-V1`: 구강/피부 코너에 실제 content_list(O4O 표준 or 매장 제작) 구성. **운영 샘플 write** 이므로 사용자 명시 승인 하에 진행.
- (참고) picker UI 화면 클릭 검증은 인증 세션에서 seed WO 와 함께 확인 가능.

---

*content_list picker UI · "코너 콘텐츠 목록" 블록 + ContentListEditor(정렬/표시/override) + ContentPickerModal(O4O 표준/매장 제작 탭·검색·다중선택) · picker 검색 read-only 2엔드포인트(store-contents org / o4o-descriptions STORE canonical) · 저장=기존 blocks 계약, dirty guard 자동 · migration/복사API/seed 무변경 · typecheck 0 · 배포 success·엔드포인트 401 wiring·공개 non-regression · 운영 write 0 · 화면 클릭 Deferred(/login) · seed 재개 가능.*
