# WO-O4O-KPA-TABLET-CORNER-IDLE-YOUTUBE-VIMEO-AUTO-RETURN-V1

> 작업 요청서 · 작성일 2026-07-03
> 주제: KPA 태블릿 코너별 대기화면 영상(YouTube/Vimeo) + 무조작 자동 복귀

## 1. 제목
**O4O KPA 태블릿 코너별 대기화면 영상: YouTube/Vimeo 재생 + 설명 후 자동 복귀**

## 2. 배경/목표
공용 태블릿의 핵심 UX = 대기 영상 재생 → 터치 → 코너/상품 설명 → 무조작 → 대기 영상 자동 복귀. 기존 idle 구조(idle mode, idleTimeoutMs=60s, IdleOverlay, idle_playlist_items, IdlePlaylistEditor)를 유지·확장한다.

## 3. 핵심
1. YouTube/Vimeo URL을 대기 영상으로 사용(무음 자동재생+반복).
2. 코너별 태블릿 식별 = `/tablet/:slug?tabletId=<store_tablets.id>`(크롬 북마크용). 유효하지 않으면 first active fallback, 기존 URL 무손상.
3. idle/products가 같은 태블릿 기준을 쓴다.
4. 설명 화면 무조작 60초 → 대기 영상 복귀, 이전 고객 컨텍스트 폐기.

## 4. 범위
포함: IdlePlaylistItem에 youtube/vimeo(additive), 편집기 입력/판별/미리보기, IdleOverlay iframe 재생(무음/loop/playsinline), idle·products optional tabletId, TabletStorePage query 전달, 편성 화면 코너별 공개 URL 복사, 자동 복귀 검증, 저장 API 검증.
제외: QR Core, 소비자/CRM/상담/주문/결제, 앱/글래스/네이티브 kiosk, 완전한 device pairing/비밀키, O4O 자체 인코딩/스트리밍, YouTube/Vimeo API 연동, 사이니지 runtime 통합, GP/KCos 확장, 신규 마이그레이션.

## 5. 구현 요지
- kiosk-core `idleMedia.ts`: `detectIdleMediaType`(image/video/youtube/vimeo), `toIdleEmbedUrl`(autoplay/mute/loop/playsinline/controls=0). videoEmbed(services)를 역참조하지 않도록 패키지 내부에 둠.
- IdleOverlay: youtube/vimeo는 iframe + **투명 tap-catcher**(iframe이 pointer 삼킴 → 터치 복귀 보장). durationMs 지정 시 순차 전환, 미지정이면 단일 loop.
- IdlePlaylistEditor: 타입 자동판별 + 수동선택(이미지/직접영상/YouTube/Vimeo), youtube/vimeo embed 미리보기, 저장 전 id 추출 검증.
- 백엔드: `validateIdlePlaylistItems`에 youtube/vimeo + provider 도메인 검증. `resolveTabletDisplaySource(org, requestedTabletId?)` → 유효 tabletId면 그 태블릿, 아니면 first active(source 반환). idle/products handler가 tabletId query 사용. idle 응답 additive `tabletId`/`tabletSource`.
- KPA wrapper: `?tabletId` 읽어 products/idle에 전달. 편성 화면: 선택 태블릿 공개 URL + 복사 + 미리보기(tabletId 포함).

## 6. 자동재생/반복 파라미터
YouTube: autoplay=1&mute=1&loop=1&playlist=ID&controls=0&playsinline=1&rel=0. Vimeo: autoplay=1&muted=1&loop=1&background=1&playsinline=1.

## 7. 운영자 공통 영상(§10)
조사 결과 재사용 가능한 백엔드 forced-content/operator-video 구조 없음(사이니지 UI 페이지만 존재) → 신규 DB/권한/UI 필요 → **이번 V1 미구현, 후속 WO로 분리**.

## 8. 완료 조건 (요약)
YouTube URL이 youtube 타입으로 저장/재생(무음·반복) / Vimeo 경로 준비 / 코너별 tabletId로 idle·products 구분 / 무조작 자동 복귀·이전 상세 미잔존 / first active fallback 무손상 / 정합·다국어·selected content 무회귀 / CHECK.
