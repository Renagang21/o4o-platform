# CHECK-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1

> WO: `WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-PUBLIC-RUNTIME-READ-V1`
> 성격: 공개 태블릿 런타임이 `current_screen_set_id` 를 읽어 block 기반 구성 + **template-compatible renderer 구조**. migration/template 테이블·컬럼·UI 없음.
> 선행: SCHEMA · API-CONTRACT · API-IMPLEMENTATION · IDLE-BLOCK-INTEGRATION · EDITOR-UX

---

## 0. 결론

- **핵심 분기**: `current_screen_set_id IS NULL` → 기존 legacy 경로 **완전 불변** / `NOT NULL` → screen_set + visible blocks 를 **template renderer** 로 구성.
- **idle_media 실연결**: 준비해둔 `resolveIdleMediaItems`(dual-read)를 공개 `/idle` 와 `/screen` 에 연결. legacy_idle_playlist / operator_common / custom_media 해석. **기존 idle_playlist_items·operator selection 저장소는 읽기만**(변경 0).
- **template 호환 구조**: `resolveTemplateKey(screenSet)` = 현재 항상 기본 `corner_information_basic_v1`. template_key 컬럼 도입 시 자동 반영(테이블/컬럼/UI 미생성 — 구조만).
- **product visibility gate 보존**: `product_list` block 은 기존 `queryTabletVisibleProducts`(공유 gate 함수) 재사용 + local 은 기존 `/products` 로 서빙 → gate 훼손 0.
- **screen set 미적용 태블릿 동작 변경 0.** migration 0 / 데이터 이전 0 / public 상품·idle 저장소 변경 0.

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `.../store-public/store-public-tablet-idle-resolve.ts` (신규) | 공개 idle resolve 통합: legacy(playlist+operator prepend) + screen-set idle_media override(`resolveIdleMediaItems`). 저장소 읽기만 |
| `.../store-public/store-public-tablet-screen.ts` (신규) | template renderer: `resolveTemplateKey`(기본 corner_information_basic_v1) + `shapeStaticBlock`(텍스트 block 안전 추출) |
| `.../store-public/__tests__/store-public-tablet-screen.test.ts` (신규) | 단위 테스트 6 |
| `.../store-public/store-public-tablet.handler.ts` | `/idle` 를 통합 helper로 재작성(legacy 동작 보존 + idle_media override) · **신규 `GET /:slug/tablet/screen`** 엔드포인트 · import |

> ⚠️ 공개 뷰어(`packages/tablet-kiosk-core`)는 이번에 변경하지 않음. `/idle` 은 기존 뷰어가 이미 소비(→ screen-set 태블릿 대기화면 실반영). `/screen` composed payload 의 뷰어 연결(전체 template 레이아웃 렌더)은 후속.

## 2. current_screen_set_id 분기 (핵심)

```
GET /:slug/tablet/screen?tabletId=
  resolveTabletDisplaySource → tabletId
  tablet.current_screen_set_id IS NULL  → { mode:'legacy' }               (기존 /products·/idle 사용)
  NOT NULL:
    set 유효성(org 일치 + deleted_at NULL + status<>'archived')
      무효 → { mode:'legacy', note:'... fallback' }                        (안전 fallback)
    visible blocks(sort_order) → template renderer → sections
    → { mode:'screen_set', templateKey, screenSet, sections }
```

`GET /:slug/tablet/idle`:
```
tablet 의 current_screen_set 에 visible idle_media block 있으면 그 config 로 override(resolveIdleMediaItems),
없으면 legacy(idle_playlist_items + operator common prepend) — 기존과 동일 출력.
```

## 3. block type별 렌더링 범위 (배포 schema 7종)

| block_type | /screen section data |
|---|---|
| `idle_media` | `{ items, operatorCommonSource }` — `resolveTabletIdleItems`(dual-read: legacy_idle_playlist/operator_common/custom_media) |
| `product_list` | `{ products(공유 gate 함수), localProductsEndpoint }` — **visibility gate 보존** |
| `product_content` | `{ productRef, contentId }` — Phase 1 참조 pass-through(안전) |
| `corner_description` / `health_info` | `{ title, body }` |
| `staff_inquiry` | `{ message }` |
| `qr_guide` | `{ label, url }` |
| (config 불량/빈값) | 해당 섹션 **생략**(안전 fallback) |

## 4. template-compatible renderer 구조

```
Screen Set → resolveTemplateKey(set) → template(Phase1: corner_information_basic_v1) → blocks → sections → Render
```
- `resolveTemplateKey`: `screenSet.templateKey ?? DEFAULT_TABLET_TEMPLATE_KEY`. **현재 template_key 컬럼 없음 → 항상 기본.** 후속 `template_key` 컬럼이 생기면 코드 변경 없이 분기(product_focus / idle_video_first / comparison …).
- template **테이블/컬럼/선택 UI 생성 금지** 준수 — 구조만.

## 5. product visibility 원칙 (§6)

- `product_list` = 기존 supplier 4-gate 공유 함수 `queryTabletVisibleProducts` 그대로 호출(권한 없는 상품 노출 불가). local products 는 기존 `/tablet/products`(gate 보존)로 서빙. **store_tablet_displays / OPL visibility 정책 미접촉.**

## 6. 금지 범위 준수

DB migration / template 테이블·컬럼·선택 UI / editor UX 변경 / store_tablet_displays·idle_playlist_items 삭제·흡수 / operator common video 정책 변경 / **screen set 미적용 태블릿 동작 변경** / OPL·service_key 혼합 — **전부 없음.** 테스트 데이터는 smoke 최소.

## 7. 검증 결과

| 항목 | 결과 |
|---|:--:|
| api-server typecheck (변경 파일) | ✅ PASS |
| 단위 테스트 (`store-public-tablet-screen.test.ts`) | ✅ 6/6 PASS |
| 배포 (Deploy API, migration 없음) | ⏳ (배포 후) |
| smoke — legacy 경로 불변 + screen_set 경로 | ⏳ (배포 후) |

_(배포 후 채움)_

## 8. 완료 기준

- [x] current_screen_set_id NULL → 기존 public runtime 그대로
- [x] NOT NULL → screen_set/block 기반 공개 표시(`/screen`) + idle_media 연결(`/idle`)
- [x] idle_media block public runtime 연결(`resolveIdleMediaItems`)
- [x] 기본 template renderer 구조(향후 template_key 확장 가능)
- [x] template 정식 기능 미구현
- [x] typecheck/build + 단위 테스트
- [ ] 배포 + 프로덕션 smoke
- [x] CHECK 작성 · [ ] commit/push

## 9. 다음 단계

LEGACY-COMPATIBILITY → TEMPLATE-CONTRACT-DESIGN → TEMPLATE-SELECTION-EDITOR → SCREEN-SET-TEMPLATE-APPLY.
