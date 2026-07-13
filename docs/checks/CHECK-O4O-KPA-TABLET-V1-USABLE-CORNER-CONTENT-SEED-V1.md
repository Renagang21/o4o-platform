# CHECK-O4O-KPA-TABLET-V1-USABLE-CORNER-CONTENT-SEED-V1

> WO: `WO-O4O-KPA-TABLET-V1-USABLE-CORNER-CONTENT-SEED-V1`
> 성격: 운영 샘플 content seed(제한적 운영 write 승인). 실 데이터 + viewer smoke.
> 선행: content_list 계약 + viewer 렌더 + picker UI 완료.
> Date: 2026-07-13

---

## 0. 결론

구강·피부 운영 샘플 2개에 실제 `content_list`를 구성하고 corner_description을 매장 안내용으로 보정했다. 두 코너 모두 **상품 record 없이도 실사용 가능한 화면**이 되었다.

- 구강: content_list **5카드**(O4O 표준 가글 2 + 매장 제작 3). 피부: **4카드**(매장 제작).
- 두 코너 corner_description 매장 안내용 보정. 최종 블록 = idle_media/corner_description/**content_list**/product_list/qr_guide.
- viewer 실 데이터 smoke PASS(카드 + 상세 모달 ContentRenderer). product 0건에도 화면 안 비어 보임.
- 승인된 write만 수행(store_content 7 + content_list 2 + corner_description 2). 샘플/태블릿 삭제·current 해제 없음.

---

## 1. before 상태
| set | 블록(before) | content_list |
|-----|--------------|--------------|
| 구강 7280872e | idle_media@10, corner_description@20, product_list@30, qr_guide@40 | 없음 |
| 피부 8c6eb9fe | 동일 | 없음 |
- product_list `{items:[]}` 0건 → 이전 viewer 는 "표시할 상품이 없습니다" empty state(콘텐츠 부족).
- 백업: `scratchpad/seed-blocks-backup.txt`(변경 전 4블록 config).

## 2. 생성/선택한 콘텐츠

### 2.1 매장 제작 콘텐츠(kpa_store_contents, 신규 7건 — org 네뚜레, source_type=direct, author_role=store, workspace_status=ready_curation)
| corner | contentId | 제목 |
|--------|-----------|------|
| oral | 02438358-… | 잇몸 관리 안내 |
| oral | 92e8784e-… | 치간칫솔·치실 사용 안내 |
| oral | 41140e79-… | 구강청결제 선택 안내 |
| skin | 466a61fb-… | 건조 피부 보습 관리 안내 |
| skin | 9478edf0-… | 민감 피부 진정 관리 안내 |
| skin | 41edf68a-… | 자외선 차단 제품 선택 안내 |
| skin | d4bc77e4-… | 입술·손 피부 보호 안내 |
- content_json = {subType,summary,html}. source_metadata.seededBy 로 추적. §8 원칙 준수(치료/예방 보장·질환치료·과장 표현 없음, 존댓말, 공통 상담 안내 문구 포함).

### 2.2 O4O 표준 설명서(직접 참조, 복사 없음)
| corner | masterId | 상품(STORE canonical ko) |
|--------|----------|--------------------------|
| oral | 4c5cd989-… | 성광알파헥시딘가글액(글루콘산클로르헥시딘액) |
| oral | 5679aaf4-… | 그린헥시딘가글액(클로르헥시딘글루콘산염액) |
- 피부: 적절한 skin-care STORE canonical 부족(로션류=외용 의약품/진정=세티리진 알약 노이즈) → **store_content 중심**(WO §5 허용).

## 3. 각 코너 content_list item 구성
- **구강(7280872e)**: [o4o 4c5cd989 ko, o4o 5679aaf4 ko, store 02438358, store 92e8784e, store 41140e79] (visible=true, sortOrder 10~50).
- **피부(8c6eb9fe)**: [store 466a61fb, store 9478edf0, store 41edf68a, store d4bc77e4].
- 모든 item displayTitle/displaySummary=null(원본 노출). o4o 카드는 실 상품명 그대로(오표기 회피).

## 4. 최종 블록 구성 (두 코너 공통)
```
idle_media@10 · corner_description@20 · content_list@25 · product_list@30 · qr_guide@40
```
- content_list 를 product_list 앞(sort 25)에 배치(§9 권장). 기존 블록 보존, sort_order 충돌 없음.

## 5. corner_description 최종 문구
- 구강: "매일 사용하는 구강관리 제품도 치아 상태, 잇몸 상태, 사용 습관에 따라 선택이 달라질 수 있습니다. … 교정·임플란트 관리가 필요한 경우에는 제품 선택 전 약사 등 전문인과 상담해 주세요." (WO §6.1)
- 피부: "피부는 건조함, 민감함, 자외선 노출, 계절 변화에 따라 필요한 관리가 달라질 수 있습니다. … 사용 중인 외용제·화장품이 있는 경우에는 제품을 함께 사용해도 되는지 확인해 주세요." (WO §7.1)

## 6. /screen /idle /products 결과 (프로덕션)
| 코너 | /screen | sections | content_list 카드 |
|------|:---:|---|---|
| 구강 | 200 | idle_media·corner_description·**content_list**·product_list·qr_guide | **5** (O4O 표준 2·매장 제작 3, 전부 hasDetail) |
| 피부 | 200 | 동일 | **4** (매장 제작, 전부 hasDetail) |
- /idle 200 · /products 200 · /settings 200(변경 없음).

## 7. viewer smoke 결과 (실 데이터)
- 구강: "코너 콘텐츠" 5카드 렌더(O4O 표준 배지 2 + 매장 제작 3), 카드 제목/요약/자세히보기 · **product 0건 empty state 미표시**(콘텐츠가 화면 채움). 카드 클릭 → 상세 모달(ContentRenderer): "잇몸 관리 안내" 3문단 + 상담 안내 렌더.
- 피부: "코너 콘텐츠" 4카드 렌더(매장 제작), 요약 표시.
- network: /screen·/idle·/products·/settings 전부 **200**, error 0(auth noise도 없음).
- 스크린샷: `scratchpad/tablet-content-seed/`(seed-oral-viewer / seed-oral-detail / seed-skin-viewer).

## 8. sourceBadge / detail 렌더 확인
- sourceBadge: "O4O 표준"(파랑) / "매장 제작"(초록) 카드에 표기 ✓.
- detail: hasDetail=true 카드만 "자세히 보기 ›" + 클릭 시 ContentRenderer(DOMPurify) 렌더 ✓.

## 9. 운영 샘플 보존
- 두 태블릿/두 screen set **삭제 없음**, current_screen_set_id **해제 없음**(적용 상태 유지).
- 기존 idle_media/product_list/qr_guide 블록 보존. corner_description 은 문구만 보정(블록 유지).
- 재실행 안전: store_content ON CONFLICT DO NOTHING, content_list 는 삭제 후 재삽입(트랜잭션).

## 10. product_focus smoke — Deferred
- WO §11 은 선택 사항이며 "인증/운영 write 부담을 키우면 Deferred". product_focus 전환은 추가 template write + 원복이 필요하고 핵심(content_list seed)과 무관 → **Deferred**. 두 코너 최종 templateKey = `corner_information_basic_v1`(의도한 기본 유지).

## 11. write 여부 / 범위
```
DB write: kpa_store_contents INSERT 7 + store_tablet_screen_blocks(content_list INSERT 2, corner_description UPDATE 2) + store_tablet_screen_sets updated_at 2. 단일 트랜잭션.
migration 0 · API/코드/배포 0(선행 배포된 resolve/viewer 그대로) · 상품 seed 0 · 가짜 상품 0.
승인 근거: WO §2 제한적 운영 write 승인(corner_description 보정 / content_list 추가 / store_content 소량 생성).
```

## 12. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| 구강 content_list 3~5개 | ✅ 5 |
| 피부 content_list 3~5개 | ✅ 4 |
| 두 코너 corner_description 매장 안내 보정 | ✅ |
| viewer 실사용 화면 | ✅ (양 코너 카드+상세) |
| 상품 0건에도 안 비어 보임 | ✅ |
| 운영 샘플 보존 | ✅ (삭제/해제 없음) |
| 불필요한 상품 seed 없음 | ✅ |
| CHECK commit/push | ✅ |

## 13. 후속 후보
```
WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-LIVE-EDITOR-SMOKE-V1  (인증 세션 picker 클릭 검증)
WO-O4O-KPA-TABLET-CORNER-SWITCH-GUARD-V1
WO-O4O-KPA-TABLET-SCREEN-SET-PREVIEW-PANEL-V1
WO-O4O-KPA-TABLET-TEMPLATE-IDLE-VIDEO-FIRST-V1
```
- 태블릿 V1 = 두 코너가 실제 매장 안내 화면으로 사용 가능한 상태 도달.

---

*운영 샘플 content_list seed · 구강 5카드(O4O 가글 2+매장 3)/피부 4카드(매장) · corner_description 매장 안내 보정 · 최종 idle/corner/content_list/product_list/qr · /screen 200 카드 resolve · viewer 실데이터 PASS(카드+상세 ContentRenderer, product0 empty 미표시) · 승인 write(store_content7+block2+update2 트랜잭션)·샘플 보존·current 유지 · product_focus Deferred · migration/코드/배포 0.*
