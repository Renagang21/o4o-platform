# CHECK-O4O-KPA-TABLET-FRESH-CORNER-SCREEN-SET-SEED-V1

> WO: `WO-O4O-KPA-TABLET-FRESH-CORNER-SCREEN-SET-SEED-V1`
> 성격: 초기화 이후 **최초 운영 샘플** 1건 생성(관리 API 흐름) + 검증. 이 데이터는 **운영 샘플이므로 유지**(정리 안 함). schema/코드 변경 0.
> 선행: DATA-RESET-APPLY(태블릿 빈 상태). 실행일: 2026-07-11.

---

## 0. 결론

빈 태블릿 상태에서 새 Screen Set/Block 모델 기준으로 **코너 태블릿 1 + 화면 세트 1 + 블록 4**를 관리 API로 생성·적용. 공개 `/screen` 이 `mode:'screen_set'` + templateKey + 4 sections 반환, `/idle` 이 idle_media(custom_media) 이미지 반영, `/products` 무크래시. 관리 UI 정상. **단, kiosk-core 뷰어는 `/screen` 미소비 → 전체 레이아웃(코너설명/QR)은 아직 화면 미반영, idle 만 `/idle` 경로로 반영됨.**

## 1. 생성 결과 (관리 API — 실제 운영 흐름)

| 대상 | id | 결과 |
|---|---|---|
| store_tablets | `c86863d8-c792-476c-b4b1-3aa1169a4395` "구강관리 코너" (org 네뚜레-약국) | POST /store/tablets 201 |
| store_tablet_screen_sets | `7280872e-00d1-4537-b4ef-ac2cef9cd7c1` "구강관리 기본 화면 세트" | POST /store/screen-sets 201 |
| store_tablet_screen_blocks | 4건 (idle_media/corner_description/product_list/qr_guide) | PUT …/blocks 200 |
| current_screen_set_id | tablet → set 적용 | PATCH active + POST current-screen-set 200 |

> 사용 API: `POST /store/tablets` · `POST /store/screen-sets` · `PUT /store/screen-sets/:id/blocks` · `PATCH /store/screen-sets/:id` · `POST /store/tablets/:id/current-screen-set` (선행 구현 관리 API만).

## 2. 블록 구성

| # | block_type | config | 비고 |
|---|---|---|---|
| 1 | idle_media | `{ source:'custom_media', items:[{ mediaType:'image', url:'https://placehold.co/1920x1080/png', durationMs:30000 }] }` | 외부 의존 최소 placeholder(약국이 교체). legacy_idle_playlist 대신 custom_media(빈 idle 회피) |
| 2 | corner_description | `{ title:'구강관리 코너', body:'입마름, 구취, 잇몸 관리 …' }` | |
| 3 | product_list | `{ items:[] }` | 런타임은 config 무시하고 기존 gate(`queryTabletVisibleProducts`) 실행 |
| 4 | qr_guide | `{ label:'모바일로 더 보기', url:'https://kpa-society.co.kr' }` | **배포 계약 준수**: qr_guide=`{label,url}` (WO 초안의 `{title,body}`는 `shapeStaticBlock`에서 섹션 생략됨 → label/url 로 생성) |

## 3. 검증 결과 (production)

### 관리 UI (`/store/commerce/tablet-displays`, 약국 계정)
- ✅ "구강관리 코너" 사이드바 표시 · 화면 세트 관리 영역 · **적용중** badge · console error 0

### 공개 `/tablet/screen?tabletId=` — ✅ screen_set
| 항목 | 값 |
|---|---|
| mode | **screen_set** |
| templateKey | **corner_information_basic_v1** |
| sections | **[idle_media, corner_description, product_list, qr_guide]** (4) |
| idle_media items | 1 (custom_media image, resolveIdleMediaItems) |
| corner_description body | "입마름, 구취, 잇몸 관리 …" |
| product_list | present, products 0 (게이트 통과 상품 없음 — 빈 목록 안전) |
| qr_guide | present |

### 공개 `/tablet/idle` — ✅
- items 1, firstType `image` → **idle_media(custom_media) 이미지가 idle 경로에 반영**(뷰어가 소비하는 경로).

### 공개 `/tablet/products` — ✅
- 200, 크래시 없음(게이트 통과 상품 0 → legacy_fallback 빈/기본).

## 4. viewer 반영 여부 (WO §8 구분 보고)

| 레벨 | 상태 |
|---|:--:|
| API level screen_set 적용 | ✅ 성공 |
| public runtime `/screen` 응답 | ✅ 성공(screen_set + sections) |
| **실제 kiosk-core viewer 화면 반영** | **부분** |

- **idle**: 뷰어가 `/idle` 을 소비 → idle_media(custom_media) 이미지 **반영됨**.
- **product**: 뷰어가 `/products` 를 소비 → 여전히 기존 gate 기준(현재 0건).
- **corner_description / qr_guide 등 전체 screen_set 레이아웃**: 뷰어가 아직 `/screen` 을 주 표시 소스로 **미소비** → 화면 미반영. (EDITOR-UX 경고 문구와 일치.)

→ **전체 레이아웃을 화면에 반영하려면 뷰어가 `/screen` 을 소비해야 함.** 후속 WO 필요.

## 5. 금지 범위 준수

대량 seed / 다중 코너 / template 테이블·컬럼·선택 UI / legacy display·idle 구조 복구 / store_tablet_displays 재생성 / operator common video 생성 / OPL·service_key 혼합 — **전부 없음.** 코너 1·세트 1·블록 4만.

## 6. 완료 기준 대비

- [x] 빈 상태에서 코너 태블릿 1 생성 · 화면 세트 1 · 블록 4 · 적용
- [x] public `/screen` screen_set mode + templateKey corner_information_basic_v1
- [x] 관리 UI 확인 · console 0
- [x] CHECK commit/push

## 7. 후속 WO (필요)

**추천: `WO-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1`** — kiosk-core 뷰어가 `/screen`(screen_set)을 주 표시 소스로 소비(current_screen_set 있으면 sections 렌더, 없으면 기존 `/products`+`/idle` legacy). 이후 TEMPLATE-CONTRACT-DESIGN → TEMPLATE-SELECTION-EDITOR.

> 운영 샘플(구강관리 코너, set 7280872e…)은 **유지**. 뷰어 소비 WO 검증에 재사용 가능.
