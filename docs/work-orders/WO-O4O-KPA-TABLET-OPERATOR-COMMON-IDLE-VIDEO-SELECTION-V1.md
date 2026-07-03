# WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1

> 작업 요청서 · 작성일 2026-07-03
> 주제: KPA 태블릿 대기화면에 서비스 운영자 공통 영상 선택 연결

## 요약
서비스 운영자가 등록한 공통 영상을 태블릿 대기화면 후보로 재사용하되, 태블릿에는 디지털 사이니지 기능 전체를 이식하지 않는다. 기존 `signage_forced_content` 자산을 재사용해 "태블릿별 1개 선택형 공통 대기 영상"으로만 연결한다.

## 제품 방향
- 디지털 사이니지 = 별도 메뉴의 영상 playlist/방송.
- 태블릿 대기화면 = 코너 안내 태블릿 idle media.
- 이번 WO = 운영자 공통 영상 후보를 매장 경영자가 태블릿별 1개 선택 → 대기화면 앞에 재생.

## Non-Goals
태블릿에 사이니지 playlist 편성/메뉴 복제 금지, 매장에 운영자 영상 등록·수정·삭제 권한 금지, 주문/결제/상담/개인정보/QR Core 변경 금지, 기존 사이니지 forced content 동작 파괴 금지.

## 데이터 모델
- `signage_forced_content` 재사용 + additive: `target_surface`(signage|tablet_idle|both, **DEFAULT 'signage'** → 기존 row 태블릿 미노출), `tablet_duration_seconds`.
- 신설 `store_tablet_operator_idle_selections`(태블릿별 선택, active 1개=cleared_at IS NULL partial unique, 만료여도 row 보존).

## 공개 재생 규칙 (GET /stores/:slug/tablet/idle?tabletId=)
1. tabletId 기준 코너 idle media 조회.
2. 매장이 선택한 공통 영상이 방영 기간 내면 그 1개를 대기화면 앞에 삽입.
3. 없거나 만료면 유효한 태블릿 대상 후보 중 **deterministic(seed=tabletId+오늘)** 1개 fallback.
4. 유효 후보 0개면 기존 store idle만.
- 재생 순서: 공통 영상 1개 → 매장/코너 media → loop. 공통 영상은 태블릿당 1개만.
- 응답 additive: `operatorCommonSource`(selected|fallback|null), item에 source/forcedContentId/isOperatorCommon.

## 권한/UX
- 운영자: forced content CRUD + targetSurface/tabletDurationSeconds. 기본 signage.
- 매장 경영자: 태블릿별 후보 목록 보기·1개 선택·해제·만료 확인만. 등록/수정/삭제/기간/URL 변경 불가.

## API
- 운영자: `PATCH/POST /api/signage/kpa-society/hq/forced-content`(targetSurface/tabletDurationSeconds).
- 매장: `GET /api/v1/store/tablet-operator-common-idle-candidates`, `GET/POST/DELETE /api/v1/store/tablets/:id/operator-common-idle-selection`(store owner).

## Acceptance (요약)
운영자만 등록/수정/삭제 · targetSurface 지정 · 기존 forced content 기본 signage 유지 · 매장 태블릿별 1개 선택 · 기간 내 재생 · 만료 시 fallback/store idle · 편성 화면 만료 안내 · 사이니지 playlist 미이식 · 기존 태블릿 UX(QR/상품/다국어/자동복귀) 무회귀.
