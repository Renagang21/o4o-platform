# CHECK — WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1

> 완료 보고서 · 2026-07-03
> WO: `docs/work-orders/WO-O4O-KPA-TABLET-OPERATOR-COMMON-IDLE-VIDEO-SELECTION-V1.md`

## 1. 사전 조사
- `signage_forced_content`(20260418100000 + 캠페인필드 20260430000001): service_key/title/video_url/source_type(youtube|vimeo)/embed_id/thumbnail_url/start_at/end_at/is_active/note/deleted_at. → youtube/vimeo + 기간 + service_key 완비, 태블릿 idle에 재사용 가능.
- forced content CRUD = `apps/api-server/.../signage/controllers/forced-content.controller.ts`(requireSignageOperator). KPA serviceKey = `kpa-society`(운영자 화면 상수).
- 매장 사이니지 playlist는 forced content를 merge(참고만, 태블릿엔 playlist 미이식).
- 태블릿 idle = `packages/tablet-kiosk-core`(kiosk-core 아님) + tabletId 정합/YouTube-Vimeo/자동복귀(직전 WO).

## 2. DB Migration
`20261203000000-AddTabletIdleToForcedContentAndSelections`:
- `signage_forced_content` ADD `target_surface VARCHAR(20) NOT NULL DEFAULT 'signage'`, `tablet_duration_seconds INT`. **기본 'signage' → 기존 forced content 태블릿 미노출(회귀 방지)**.
- 신설 `store_tablet_operator_idle_selections`(org/tablet/forced_content/selected_by/selected_at/cleared_at). **partial unique(tablet_id) WHERE cleared_at IS NULL → 태블릿당 active 1개**. 만료여도 row 보존(cleared_at으로만 해제).

## 3. targetSurface 정책
노출 대상 = signage | tablet_idle | both. 운영자만 지정. 태블릿 후보/공개 idle은 `target_surface IN ('tablet_idle','both')`만. 기존 데이터 기본 signage.

## 4. 태블릿당 1개 선택 / 만료 동작
- POST selection: 기존 active 해제(cleared_at) 후 삽입 → 항상 최신 1개(partial unique 충돌 방지).
- 공개 재생: 선택이 방영 기간 내면 그것, 아니면 deterministic fallback(seed=`tabletId:YYYY-MM-DD`, hash mod N), 유효 후보 0개면 store idle만.
- 편성 화면: selection 상태(active/upcoming/expired/unavailable) 표시, 만료 시 다른 영상 선택 안내.

## 5. fallback 무작위 정책
완전 랜덤 대신 deterministic: seed=tabletId+오늘 날짜 → 하루 단위 분산(새로고침마다 안 바뀜, 운영자 확인 용이).

## 6. 변경 파일
| 파일 | 변경 |
|---|---|
| `apps/api-server/.../migrations/20261203000000-*.ts` (신규) | additive 컬럼 + selection 테이블 |
| `apps/api-server/.../signage/controllers/forced-content.controller.ts` | list/create/update에 targetSurface/tabletDurationSeconds(+검증) |
| `apps/api-server/.../store-tablet.routes.ts` | candidates GET, selection GET/POST/DELETE(store owner, KPA serviceKey) |
| `apps/api-server/.../store-public/store-public-tablet.handler.ts` | idle에 운영자 공통(선택→fallback) prepend + operatorCommonSource |
| `services/web-kpa-society/.../operator/signage/ForcedContentPage.tsx` | 노출 대상 select + 태블릿 재생시간 |
| `services/web-kpa-society/.../api/tabletDisplays.ts` | candidates/selection 클라이언트 |
| `services/web-kpa-society/.../pharmacy/StoreTabletDisplaysPage.tsx` | 서비스 공통 대기 영상 섹션 + 선택 모달 |
| 문서 | WO + 본 CHECK |

## 7. 검증
### 7.1 typecheck
| 대상 | 결과 |
|---|---|
| api-server | ✅ PASS |
| web-kpa-society | ✅ PASS |
| (kiosk-core 미변경 → KCos/GP 무영향; ForcedContentPage는 서비스별 별도 파일) | — |

### 7.2 API/브라우저 E2E (2026-07-03, 배포+마이그레이션 CI/CD success)

운영자 계정(sohae2100/kpa:admin) + 매장 경영자(renagang21/store owner) 2계정, 인증 fetch.

| 항목 | 결과 |
|---|---|
| 운영자 tablet_idle forced content 생성 | ✅ 201, **targetSurface='tablet_idle', tabletDurationSeconds=30**(마이그레이션 컬럼 동작) |
| 운영자 기본 생성(미지정) | ✅ **targetSurface='signage'**(기본) |
| 매장 candidates | ✅ tablet_idle 포함, **signage 제외** |
| 매장 선택(POST) | ✅ 201 |
| signage forced content 선택 시도 | ✅ **400 INVALID_CANDIDATE**(태블릿 후보 아님 거부) |
| 선택 GET | ✅ fcId 일치, status='active' |
| 공개 idle?tabletId=A (선택 있음) | ✅ `operatorCommonSource='selected'`, **첫 항목 youtube isOperatorCommon durationMs=30000** |
| 공개 idle (선택 해제 후) | ✅ `operatorCommonSource='fallback'`, deterministic 후보 노출 |
| 태블릿당 1개 제약 | ✅ 재선택 시 기존 해제 후 교체(partial unique) |
| 테스트 데이터 정리 | ✅ 매장 selection 해제, forced content 2건 삭제(200), leftover 0 |

> **버그 수정(E2E 중 발견)**: 공개 idle이 `resolved.serviceKey`(='kpa')로 forced content(service_key='kpa-society')를 조회해 매칭 실패 → operator_common 미노출. `resolveServiceKeys('kpa')=['kpa','kpa-society']`로 `service_key=ANY(...)` 조회로 수정, 재배포 후 selected/fallback 모두 PASS.

> Vimeo/편성 화면 UI(모달·만료 안내)는 코드+API E2E로 커버(youtube로 대표 검증). 만료 상태는 status 계산 로직으로 커버.

### 7.3 Regression
기존 사이니지 forced content CRUD, 매장 사이니지 playlist, 태블릿 코너 idle/YouTube/자동복귀, 개인정보/상담/주문 미노출.

## 8. 미착수
per-tablet 고유 URL/비밀키, 다중 공통 영상 playlist(태블릿당 1개 고정), operator 영상 인코딩/스트리밍, GP/KCos 확장(KPA 스코프 serviceKey='kpa-society').
