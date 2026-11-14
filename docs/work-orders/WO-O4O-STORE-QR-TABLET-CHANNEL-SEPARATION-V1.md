# WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 — 매장 콘텐츠의 QR · 태블릿 분리 · 콘텐츠 QR · 제품 영상 연결

> **상태**: ACTIVE
> **작성일**: 2026-11-13
> **실행 위치**: CLOUD (T4 migration 운영 적용은 병합 후 자동 Delivery · Promote 판정을 따른다)
> **인계**: T1 → T2 → T3 는 문서 · 화면 작업. T4 는 **DB 구조 변경 승인 완료(2026-11-13 통합 담당)**. #1049 는 상담 태블릿만 바꾸므로 태블릿 코너(T5)와 겹치지 않는다 — #1049 를 기다리는 것은 메뉴(`App.tsx` · `store-workspace.test.tsx`)를 바꾸는 T2 뿐이다(§7)
> **근거**: 2026-11-13 사용자 지시(매장 콘텐츠 활용 채널 정리 · 콘텐츠 QR · 제품 영상 연결) · [`O4O-CONSUMER-MULTILINGUAL-POLICY-V1`](../baseline/O4O-CONSUMER-MULTILINGUAL-POLICY-V1.md)(같은 날 확정 · 병합 대기)

## 1. 문제

`/store/marketing/qr?workspace=studio` 에서 QR 과 태블릿이 섞여 보인다.

- QR 목록 58건 가운데 38건이 「태블릿 코너」 QR 이다(사용자 화면 2026-11-13). 코너 QR 은 태블릿 화면 세트를 저장할 때 자동으로 생긴다(`landingType='screen_set'`). 그래서 매장이 직접 만든 QR(콘텐츠 연결 13 · AI 설명 2)이 묻힌다.
- 「매장 콘텐츠」 안에서 QR · 태블릿 적용 · POP 는 같은 수준의 업무인데, 화면에서는 「다른 업무 열기」 안에 숨어 있다(`StoreWorkspaceShell` · `config/storeWorkspace.ts` `studioKeys`).
- 「콘텐츠 연결」 QR 은 콘텐츠마다 사람이 QR 을 따로 만들어야 하는 흐름이다.
- 제품과 동영상을 잇는 곳이 없다 — `signage_media` 에는 태그만 있고 제품 설명서에도 영상 칸이 없다.

## 2. 결정 (2026-11-13 사용자 · 세션 판단 구분)

| # | 결정 | 근거 |
|---|---|---|
| D1 | 매장에서 콘텐츠를 쓰는 채널은 **QR(출력물) · 태블릿(손님이 누르는 화면) · 사이니지(재생 목록)** 세 가지다. 「매장 콘텐츠」에서 QR · 태블릿은 **각자 탭**으로 보인다(숨김 메뉴 아님) | 사용자 |
| D2 | **사이니지는 화면 크기와 무관하다** — 재생 목록을 TV · 모니터 · 태블릿 어디서든 튼다. 태블릿에서 동영상 목록을 트는 것도 사이니지에서 그 기기를 재생 화면으로 고르는 것이다. 태블릿 탭은 누르는 화면(코너 안내 · 제품 안내)만 맡는다 | 사용자 |
| D3 | **QR 탭 = 출력물 QR 을 만들고 모아 출력하는 한 곳.** 목록 기본값은 매장이 직접 만든 QR 이다. 태블릿 코너 QR 은 「태블릿 코너 포함」 필터를 켤 때만 보인다(데이터 · 출력 기능은 그대로) | 세션 판단 — 코너 QR 이 목록을 덮는 문제 해소 |
| D4 | 태블릿 코너 QR 은 **태블릿 탭의 그 코너 화면에서** 출력한다(만든 곳에서 인쇄) | 세션 판단 |
| D5 | **콘텐츠를 만들면 QR 이 함께 준비된다.** 콘텐츠마다 상품 대표 QR 처럼 고정 QR 주소가 있고, 콘텐츠 화면의 「QR 출력」 · 「QR 목록에 담기」로 쓴다. QR 목록에는 출력하거나 담은 것만 올라온다(생성마다 쌓이지 않게). 「콘텐츠 연결」 QR 만들기 흐름은 없앤다. 외부 링크 QR 은 QR 탭의 「링크 QR」 하나로 남긴다 | 사용자(콘텐츠를 만들 때 QR 도 생기면 충분) · 목록 정책은 세션 판단 |
| D6 | **제품 ↔ 동영상 연결은 영상 쪽에 「이 영상의 제품」 한 칸을 둔다**(`signage_media` 에 표준 제품 마스터를 가리키는 nullable 열). 설명서 본문(HTML)에는 영상을 넣지 않는다 | 세션 판단 — 설명서 서식 계약 · AI 번역 · OTC 허가 정보와 부딪히지 않고, 공급자 · 운영자 영상을 모든 매장이 같이 쓴다. 사용자 질문(「코드를 복잡하게 하지 않을까」)에 대한 답 |
| D7 | 태블릿 코너의 제품은 상품명 + QR 또는 버튼(누르면 상품 내용 — 상품 대표 QR 과 같은 내용)으로 보이고, 그 제품에 연결된 영상이 있으면 [영상 보기] 를 켤 수 있다. 근무자가 코너마다 제품과 영상을 짝짓지 않는다 | 사용자(근무자가 불편하지 않게 · 유연하게) |

## 3. TODO

- [ ] T1 [CLOUD] 기준 문서 반영 — [`O4O-STORE-MENU-CANONICAL-TREE-V1`](../baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md) 에 D1 · D2 · D5 를 반영한다. 문서 전용 PR(AGENTS.md §4-3 R6)
- [ ] T2 [CLOUD] 「매장 콘텐츠」 탭 — QR · 태블릿을 각자 탭으로 노출한다(D1). 공유 shell · workspace config 변경이라 모든 소비처(KPA 등 `storeWorkspaceEnabled` 서비스)를 먼저 확인한다(CLAUDE.md §1 · shared module protocol). **#1049 병합 후**
- [ ] T3 [CLOUD] QR 탭 정리 — 목록 기본값에서 코너 QR 제외 · 「태블릿 코너 포함」 필터(D3), 「콘텐츠 연결」 만들기 제거와 「링크 QR」 정리, 콘텐츠 화면 「QR 출력 · QR 목록에 담기」(D5). 기존 콘텐츠 연결 QR(13건 등)은 그대로 열리고 목록에 남는다
- [x] T4 [CLOUD] 제품 ↔ 영상 연결(D6 · §7 조사 반영) — ① O4O 보관 영상(`media_assets`)은 기존 `media_entity_links`(`entity_type='product'`)를 쓴다(DB 변경 없음) ② 매장 · 공급자 사이니지 영상(`signage_media`)은 제품 열을 추가한다 — 추가형 migration(nullable · index). **DB 구조 변경 승인 완료(2026-11-13 통합 담당 · 이 열 하나에 한한다)** · migration lane 직렬(§4-3 R4). 영상 올리기 · 고르기에 「제품 선택(선택 사항)」. 조회는 Boundary 규칙(매장 영상 = `organizationId`, 공급자 · 운영자 영상 = 공유 source)을 지킨다
  - 2026-11-13 구현(branch `claude/intelligent-cray-o2p4u3-product-video`): migration `1794550173646-AddSignageMediaProductMaster`(추가형 판정) · 연결 API(매장 `PUT /media/:id/product` · `GET /media/product-links`, 운영자 `PUT /hq/media/:id/product`, 공급자 `PATCH /supplier/signage/media/:id` 의 `productMasterId`) · 매장 동영상 목록의 「연결 제품」 열 · 「선택 영상 제품 연결」.
  - 2026-11-13 남은 것 해소(같은 branch):
    - 운영자: 서비스 공용(HQ) 사이니지 영상 화면은 현재 어디에서도 쓰이지 않는다(`operator-core-ui` `HqMediaDetailPage` 미사용). 운영자 영상은 O4O 보관 영상(관리자 미디어 카탈로그)으로 나간다 → 카탈로그의 제품 연결에 **제품 이름 검색**(`ProductMasterPicker`)을 넣고 용도를 `product-video` 로 채운다. HQ 연결 API 는 남겨 둔다.
    - 공급자: 기존 「연결 상품」 선택이 표준 제품 마스터를 `productMasterId` 로도 저장한다(생성 · 수정 · 공급 제품만). 칸이 생기기 전 저장된 공급자 영상은 `metadata.linkedProduct.masterId` 를 읽어 따른다(데이터 변경 없음).
    - O4O 보관 영상 · 사본: 매장 화면에 별도 연결 UI 를 두지 않는다. 보관 영상에서 등록한 영상은 그 보관 영상의 연결(`media_entity_links` · `product-video`)을, 가져온 사본(`o4o_asset_snapshots`)은 원본 영상의 연결을 「(원본)」으로 보인다.
    - 한 식(`effectiveProductSql`)으로 모았다 — T5 태블릿 코너가 같은 식을 쓴다.
- [ ] T5 [CLOUD] 태블릿 코너 — 제품 QR 기본값을 상품 대표 QR 로(§7), [영상 보기](D7), 코너 화면의 코너 QR 출력(D4). **T4 병합 후**(#1049 와 무관)

## 4. 검증 (각 단계)

- T2 · T3 · T5: web-store vitest · `tsc`. 배포 후 Demo 「매장 경영자」로 PC · mobile 에서 탭 진입 · 직접 URL(`/store/marketing/qr` · `/store/commerce/tablet-displays`) · 기존 QR 출력 회귀 확인.
- T3: 기존 콘텐츠 연결 · 코너 QR 링크가 계속 열린다.
- T4: 격리 PostgreSQL 에서 migration · 매장 격리(다른 매장 영상이 보이지 않음) 시험.

## 5. 하지 않는 것

- 기존 QR · 코너 QR 데이터 삭제 · 일괄 변경.
- 사이니지 재생 목록 구조 변경.
- 설명서(`shared_product_descriptions`) 본문 · 서식 변경.

## 7. 현 상태 조사 (2026-11-13 · `origin/main` `36264ef604`)

**태블릿 코너(화면 세트)가 이미 하는 것**

| 항목 | 현재 | 근거 |
|---|---|---|
| 블록 7종 | `idle_media`(대기 영상) · `product_list`(제품 목록) · `corner_description`(코너 안내) · `health_info` · `staff_inquiry` · `qr_guide`(코너 QR 안내) · `content_list`(콘텐츠 목록) | `store_tablet_screen_blocks` CHECK |
| 템플릿 4종 | 기본 코너 안내형 · 상품 집중형 · 코너 소개형(+QR) · 제품 진열형(+QR) | `operator-screen-set.controller.ts` |
| 코너 안내 | 내용만 / 내용 + QR(`qr_guide`) 둘 다 된다 — 사용자 요구 그대로 | 템플릿 · 블록 |
| 제품 → 내용 | 제품을 누르면 상세가 열린다. 내용은 O4O 공용 대표 설명(`shared_product_descriptions` STORE canonical)이 우선이다 — 상품 대표 QR 과 같은 원본 | `store-public-utils.ts` `COALESCE(spd.content, …)` · `PublicScreenSetViewer` |
| 제품 → QR | 매장이 제품마다 **기존 QR 하나를 직접 고르면** 보인다(`qrCodeId`). 고르지 않으면 QR 이 없다. 상품 대표 QR(제품 Landing `/p/{key}`)은 자동으로 쓰지 않는다 | `resolveSelectedQrUrls` |
| 코너 QR | 화면 세트 저장 시 자동 발급(`ensureScreenSetQr`) — QR 목록 38건의 원인 | §1 |
| 동영상 | `idle_media` 는 대기 화면 영상(O4O 보관 영상 `media_assets` 또는 직접 지정)일 뿐 제품과 연결되지 않는다 | `store-tablet-idle-block.ts` · `stored-video.ts` |
| 다국어 | 태블릿 제품 설명은 게시된 번역을 붙여 보인다 | `INLINE-MULTILINGUAL-DESCRIPTION-BRIDGE` |

**영상 저장소는 두 곳이다**

| 저장소 | 쓰는 곳 | 제품 연결 |
|---|---|---|
| `media_assets`(O4O 보관 영상 · 미디어 정본) | 태블릿 대기 영상 · 관리자 미디어 카탈로그 | **이미 있다** — `media_entity_links(entity_type='product')` · 관리자 카탈로그 API(`saveLink`). 매장 화면에는 연결 기능이 없다 |
| `signage_media` | 매장 사이니지 동영상 · 공급자 사이니지 영상(`supplier-signage-media.controller`) | 없다 — 태그만 |

**#1049 와의 관계:** #1049 는 상담 태블릿(약사 · 근무자 상담 화면)이다. 화면 세트 · `tablet-kiosk-core` · `store_tablet_*` 를 바꾸지 않는다. 겹치는 파일은 `services/web-store/src/App.tsx` · `store-workspace.test.tsx` · `HANDOFF.md` 뿐이다.

**판단**
- 사용자가 원한 코너 형태(코너 안내 · 내용 + QR · 제품 상품명 + QR 또는 버튼 · 같은 내용)는 대부분 이미 있다. 빠진 것은 두 가지다.
  - 제품 QR 이 수동 선택이라 대부분 비어 있다 → 기본값을 상품 대표 QR 로 한다(T5).
  - 제품 영상이 없다 → T4 + T5.
- 제품 영상 연결은 저장소가 둘이라, 이미 있는 연결(`media_entity_links`)을 쓰고 `signage_media` 에만 제품 열을 더한다. 새 연결 표를 만들지 않는다.

## 6. 문서 정합

발견 1건 — `O4O-STORE-MENU-CANONICAL-TREE-V1` 에 D1 · D2 · D5 미반영. T1 로 처리한다.
