# CHECK-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1

> WO: `WO-O4O-KPA-TABLET-KIOSK-CORE-SCREEN-CONSUMER-V1`
> 성격: 공개 뷰어(kiosk-core)가 `/tablet/screen` 을 **주 표시 소스로 소비** — 연결 작업(새 템플릿 시스템 아님).
> **additive/opt-in** — legacy 태블릿·미주입 서비스(K-Cosmetics) 무영향. schema/관리API/migration 변경 0.
> 선행: PUBLIC-RUNTIME-READ · FRESH-CORNER-SCREEN-SET-SEED(운영 샘플 "구강관리 코너" 유지).

---

## 0. 결론

kiosk-core 뷰어에 `api.fetchScreen` **opt-in** 을 추가, 응답 `mode='screen_set'` 이면 sections(corner_description/qr_guide/idle_media)를 실제 화면에 반영. `mode='legacy'` 또는 미주입이면 기존 `/products`+`/idle` 동작 **그대로**. K-Cosmetics(미주입) 무영향.

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/tablet-kiosk-core/src/types.ts` | `TabletScreenResponse`/`TabletScreenSection` + `TabletKioskApi.fetchScreen?`(opt-in) |
| `packages/tablet-kiosk-core/src/index.ts` | 신규 타입 export |
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | fetchScreen 호출(opt-in) → screen state · corner_description=헤더 제목/설명 · qr_guide=안내 배너 · idle_media items=IdleOverlay 소스 |
| `services/web-kpa-society/src/api/tablet.ts` | `fetchTabletScreen(slug, tabletId)` (실패 시 null→legacy) |
| `services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx` | 공개 wrapper 에 `fetchScreen` 주입(코너별 tabletId) |
| `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | 미리보기 previewApi 에 `fetchScreen`(미리보기도 반영) |

> **K-Cosmetics wrapper 미변경** → `fetchScreen` 미주입 → screen=null → legacy(무영향). Shared Module 규칙 준수(consumer 확인: KPA 연결 / KCos 무영향).

## 2. 핵심 분기 (§3)

```
kiosk-core mount:
  api.fetchScreen 있으면 GET /:slug/tablet/screen?tabletId= 호출
    응답 mode='screen_set' → screen state 세팅 → sections 렌더
    응답 mode='legacy' / null / api.fetchScreen 미주입 → screen=null → 기존 /products+/idle 유지
```

## 3. section별 렌더링 범위 (기본 템플릿 corner_information_basic_v1)

| section | 렌더 |
|---|---|
| `idle_media` | IdleOverlay items = `screenIdleItems ?? idlePlaylist`(screen 우선) → 대기화면/auto-return 흐름에 연결 |
| `corner_description` | 브라우즈 헤더 제목=`title`, 부제=`body` (없으면 기존 "매장 상품 안내") |
| `qr_guide` | 헤더 아래 안내 배너(label + url). 없으면 미표시 |
| `product_list` | 상품 그리드는 기존 `fetchProducts`(gate 정확) 유지 — product visibility 정책 무변경 |

- 템플릿 선택 기능 없음(기본 1개). idle **auto-return 유지**(IdleOverlay onUserInteraction → IDLE_EXIT, 기존 로직 불변).

## 4. legacy 유지 (§4.3)

screen set 없는 태블릿/매장 → `/screen` mode=legacy → screen=null → 기존 `/products`·`/idle`·idle auto-return·product detail 전부 그대로. (viewer 기본 헤더 "매장 상품 안내".)

## 5. 검증 결과

| 항목 | 결과 |
|---|:--:|
| web-kpa-society typecheck | ✅ PASS (exit 0) |
| web-k-cosmetics typecheck (shared consumer) | ✅ PASS (tablet/kiosk error 0) |
| web-kpa-society build | ✅ PASS (exit 0) |
| 배포 (web) | ⏳ (배포 후) |
| browser smoke (screen_set + legacy 두 경로) | ⏳ (배포 후) |

_(배포 후 채움)_

## 6. 금지 범위 준수

DB migration / screen set·block schema / 관리 API / template 테이블·컬럼·선택 UI / legacy 데이터 삭제 / store_tablet_displays·idle_playlist_items 흡수 / OPL·service_key 혼합 — **전부 없음.** 관리 UI 대규모 변경 없음(미리보기 api에 fetchScreen 1줄 추가만).

## 7. 완료 기준

- [x] kiosk-core 가 `/screen` 을 주 표시 소스로 소비(opt-in)
- [x] screen_set 태블릿에서 sections(코너설명/QR/idle) 실제 표시
- [x] legacy 태블릿 동작 불변 / idle auto-return 유지
- [x] typecheck/build
- [ ] 배포 + browser smoke
- [x] CHECK 작성 · [ ] commit/push

## 8. 다음 단계

TEMPLATE-CONTRACT-DESIGN → TEMPLATE-SELECTION-EDITOR → SCREEN-SET-TEMPLATE-APPLY.
