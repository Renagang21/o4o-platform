# CHECK-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1

> 작업 완료 보고서 · 2026-07-03
> WO: `docs/work-orders/WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1.md`

## 1. 사전 조사 / 재사용 범위
기존 idle 구조를 **확장**(신규 구조 아님): idle mode·`idleTimeoutMs`(60s 고정)·IdleOverlay·`store_tablets.idle_playlist_items`·IdlePlaylistEditor·GET/PUT idle-playlist·GET `/:slug/tablet/idle`·`resolveTabletDisplaySource`(직전 WO). `videoEmbed.ts`는 services에 있어 공유 패키지에서 역참조 불가 → kiosk-core에 별도 `idleMedia.ts` 신설.

## 2. 변경 파일
| 파일 | 변경 |
|---|---|
| `packages/tablet-kiosk-core/src/idleMedia.ts` (신규) | `detectIdleMediaType`(image/video/youtube/vimeo), `toIdleEmbedUrl`(autoplay/mute/loop/playsinline/controls=0/rel=0) |
| `packages/tablet-kiosk-core/src/types.ts` | `IdlePlaylistItem.type`에 youtube/vimeo(additive) |
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | IdleOverlay: youtube/vimeo iframe + **투명 tap-catcher**(iframe pointer 삼킴 대응) + durationMs 순차/loop, embed 스타일 |
| `packages/tablet-kiosk-core/src/IdlePlaylistEditor.tsx` | 타입 자동판별/수동선택(이미지/직접영상/YouTube/Vimeo), youtube/vimeo embed 미리보기, 저장 전 id 검증, 배지 |
| `apps/api-server/.../store-tablet.routes.ts` | `validateIdlePlaylistItems`에 youtube/vimeo + provider 도메인 검증 |
| `apps/api-server/.../store-public/store-public-utils.ts` | `resolveTabletDisplaySource(org, requestedTabletId?)` — 유효 tabletId면 그 태블릿, 아니면 first active(source 반환) |
| `apps/api-server/.../store-public/store-public-tablet.handler.ts` | products·idle handler가 `tabletId` query 사용(동일 기준). idle 응답 additive `tabletId`/`tabletSource` |
| `services/web-kpa-society/src/api/tablet.ts` | fetchTabletProducts/fetchTabletIdle에 tabletId |
| `services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx` | `?tabletId` 읽어 products/idle 전달 |
| `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | 선택 태블릿 공개 URL(`?tabletId=`) + 복사 + 미리보기(tabletId 포함) |
| 문서 | WO + 본 CHECK |

## 3. YouTube/Vimeo URL 판별/저장/렌더
- 저장값 = 원본 URL. runtime에서 embed 변환(수정/표시 용이).
- 판별: youtube.com/youtu.be→youtube, vimeo.com→vimeo, .mp4/.webm/.ogg/.mov/.m4v→video, 그 외→image.
- 렌더: youtube/vimeo는 무음 자동재생+loop iframe. 단일 항목은 loop 반복, durationMs 지정+다항목이면 순차 전환.
- iframe이 터치를 삼키므로 투명 tap-catcher로 터치→idle 종료(상품 안내 복귀) 보장.

## 4. tabletId 기준 (코너별)
`resolveTabletDisplaySource(org, requestedTabletId)`: requestedTabletId가 이 매장의 active tablet이면 사용(source='query'), 아니면 first active(source='first_active'), 없으면 none. products/idle이 이 함수를 공유 → **동일 태블릿 기준**. 잘못된 tabletId는 안전 fallback.

## 5. 자동 복귀 UX
기존 `idleTimeoutMs=60_000` 유지(browse/detail 무조작 60s→idle, idle 터치→browse, IDLE_EXIT이 selectedProduct 클리어 → 이전 상세 미잔존). `idleTimeoutSeconds` 설정화는 저장 구조 변경이 커 이번 V1 보류(후속). `idleSlideSeconds`(항목 전환)와는 별개 필드임을 명확화.

## 6. 검증 결과

### 6.1 typecheck
| 대상 | 결과 |
|---|---|
| api-server | ✅ PASS |
| web-kpa-society | ✅ PASS |
| web-k-cosmetics (공유 패키지 소비처) | ✅ PASS |
| web-glycopharm (공유 패키지 소비처) | ✅ PASS |

### 6.2 API/브라우저 E2E

> 배포 후 기록.

- [ ] 태블릿 A/B에 서로 다른 YouTube idle 저장 → `GET /idle?tabletId=A/B` 각각 반환
- [ ] tabletId 없음 → first active, 잘못된 tabletId → fallback(tabletSource 확인)
- [ ] youtube 저장 검증(정상 저장 / 잘못된 URL 400)
- [ ] products?tabletId 동일 기준
- [ ] Chrome: `/tablet/:slug?tabletId=A` 대기화면 YouTube iframe(autoplay/mute/loop) + 터치 복귀 + 60초 자동 복귀
- [ ] 테스트 데이터 정리

## 7. 운영자 공통 영상 (§10)
재사용 가능한 forced-content/operator-video 백엔드 구조 없음(사이니지 UI 페이지만 존재). 신규 DB/권한/운영 UI 필요 → **이번 V1 미구현, 후속 WO로 분리**.

## 8. 미착수(범위 밖)
device pairing/비밀키·per-tablet 고유 URL(raw tabletId query만), QR Core, 소비자 관리, 상담/주문/결제, 앱/글래스, O4O 자체 인코딩/스트리밍, YouTube/Vimeo API, 사이니지 통합, GP/KCos 확장, 신규 마이그레이션, `idleTimeoutSeconds` 설정화, 다중 YouTube 순차(단일 loop 우선).
