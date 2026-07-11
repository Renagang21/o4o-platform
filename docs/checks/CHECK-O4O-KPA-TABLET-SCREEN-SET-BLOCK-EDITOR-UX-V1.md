# CHECK-O4O-KPA-TABLET-SCREEN-SET-BLOCK-EDITOR-UX-V1

> WO: `WO-O4O-KPA-TABLET-SCREEN-SET-BLOCK-EDITOR-UX-V1`
> 성격: **관리 UI 구현** — public tablet runtime 미반영 / migration 없음 / legacy 편집 유지.
> 선행: SCHEMA · API-CONTRACT · API-IMPLEMENTATION · IDLE-BLOCK-INTEGRATION
> 대상: `https://kpa-society.co.kr/store/commerce/tablet-displays`

---

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` (신규) | Screen Set/Block 1차 Editor UX 컴포넌트 (목록/생성/수정/archive/적용·해제 + block 편집 + 필수 경고) |
| `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | 우측 컬럼(요약 아래, legacy 위)에 `TabletScreenSetManager` 마운트 + import. current 상태를 tablets state에 반영 |
| `services/web-kpa-society/src/api/tabletDisplays.ts` | Screen Set/Block client fn 8종 + 타입 + `Tablet.currentScreenSetId` |
| `apps/api-server/src/routes/platform/store-tablet.routes.ts` | GET `/tablets` 응답에 `currentScreenSetId` **additive**(에디터 초기 상태). 그 외 무변경 |

> 기존 legacy 편집 4섹션(공통영상/idle/설정/진열 편집기) **전부 유지**. Screen Set 영역은 그 위에 additive.

## 2. Editor UX 구조

```
좌: 코너/위치 사이드바(기존)
우측 상단: 현재 코너 화면 구성 요약(기존)
우측 중단: [화면 세트 (Screen Set)]  ← 신규
   ├─ ⚠️ public 미반영 경고(필수)
   ├─ 현재 적용: {세트명 or 없음(legacy)} + [적용 해제]
   ├─ [새 세트] 생성(이름 입력)
   ├─ 세트 목록: 이름·상태·블록수 + [적용]/[적용중] · [편집] · [보관]
   └─ 편집 패널: 이름/상태(초안·활성·보관) 저장 + 블록 편집기
        블록: 추가/삭제/표시토글/위·아래 + block_type별 config 폼 · [블록 저장]
우측 하단: 기존 legacy 편집(공통영상/idle/설정/진열) — 유지
```

- 세트 목록 = 이 코너 적용 가능 세트(이 태블릿 전용 + 매장 재사용 `tablet_id=null`) — client-side 필터.
- **적용 흐름**: 세트가 `active` 아니면 적용 시 자동 `active` 전환 후 apply(백엔드 SCREEN_SET_NOT_ACTIVE 회피). 적용 후 요약 패널·목록 갱신.
- **보관**: 적용 중이면 409 `SCREEN_SET_IN_USE` → "먼저 적용 해제" toast.

## 3. 사용한 API (선행 구현 8종만)

`GET/POST /store/screen-sets`, `GET/PATCH/DELETE /store/screen-sets/:id`, `PUT /store/screen-sets/:id/blocks`, `POST/DELETE /store/tablets/:tabletId/current-screen-set`.
- `/store/tablets/screen-sets` 경로 미사용(top-level). `notice`/`qr_link` block type 미사용. `isEnabled`↔`is_visible`는 서버 매핑.
- (초기 current 표시용) GET `/tablets`에 `currentScreenSetId` additive 노출 — 신규 엔드포인트 아님.

## 4. 지원 block type + config 폼 (1차)

| block_type | 편집 UI |
|---|---|
| `idle_media` | source 선택(legacy_idle_playlist/operator_common/custom_media) + custom_media 시 미디어(mediaType+url) 추가/삭제 |
| `corner_description` / `health_info` | 제목 + 내용 |
| `staff_inquiry` | 안내 문구 |
| `qr_guide` | 라벨 + URL |
| `product_list` | "기존 진열 사용" 안내(config `{source:'legacy_tablet_displays'}`, 폼 없음) |
| `product_content` | config JSON 편집(fallback) |

- 드래그 빌더 없음(위/아래 이동). WO §5 최소 편집 충족.

## 5. 필수 경고 표시 (WO §6)

Screen Set 영역 상단 + 적용/해제 근처에 amber 경고 박스 상시 노출:
> "화면 세트 적용은 저장되지만, **공개 태블릿 화면 반영은 후속 PUBLIC-RUNTIME-READ 단계에서 활성화**됩니다. 현재 공개 태블릿은 기존 진열/대기화면 경로를 계속 사용합니다."

적용 성공 toast에도 "(공개 반영은 후속 단계)" 명시.

## 6. 금지 범위 준수

| 금지 | 준수 |
|---|:--:|
| public tablet runtime 변경 | ✅ 미접촉 (핸들러 무변경) |
| DB migration / idle_playlist_items 이전 / displays 흡수 | ✅ 없음 |
| operator common video 정책 변경 | ✅ 없음 |
| **기존 legacy 편집 UI 제거** | ✅ 4섹션 전부 유지 |
| screen set 자동 생성 / OPL·service_key 혼합 | ✅ 없음 |

## 7. 검증 결과

| 항목 | 결과 |
|---|:--:|
| web-kpa-society typecheck | ✅ PASS (exit 0) |
| web-kpa-society build | ✅ PASS (exit 0) |
| api-server typecheck (변경 파일) | ✅ PASS |
| 배포 (web + api) | ⏳ (배포 후) |
| browser smoke (생성/블록/적용/해제) | ⏳ (배포 후) |

_(배포 후 채움)_

## 8. 완료 기준

- [x] Screen Set/Block 관리 UI (목록/생성/수정/archive/적용·해제/블록 편집)
- [x] idle_media block 편집
- [x] public 미반영 경고 표시
- [x] public runtime 변경 0 / 기존 legacy 기능 유지
- [x] typecheck/build 성공
- [ ] 배포 + browser smoke
- [x] CHECK 작성 · [ ] commit/push

## 9. 다음 단계

PUBLIC-RUNTIME-READ(`resolveIdleMediaItems` 연결 + current_screen_set 렌더) → LEGACY-COMPATIBILITY.
