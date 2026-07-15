# CHECK-O4O-KPA-TABLET-CORNER-CONTENT-LINK-UI-V1

> WO: `WO-O4O-KPA-TABLET-CORNER-CONTENT-LINK-UI-V1`
> 선행: `WO-O4O-KPA-TABLET-CORNER-CONTENT-ASSIGNMENT-MODEL-V1`(스키마+API) · `WO-O4O-KPA-TABLET-CONTENT-LIBRARY-TAB-SPLIT-V1`(탭 분리)
> 성격: 프론트 — 코너별 운영 탭을 **연결(store_tablet_corner_contents) 모델**에 배선.
> Date: 2026-07-15

---

## 0. 결론

배정 모델(`1760ec9ee`)은 **백엔드만** 구현돼 있었고 이를 소비하는 UI가 없었다. 코너 탭은 여전히 구(舊) 모델(매장 전체 후보 나열 + 적용)이었다. 이번에 코너 탭을 연결 모델에 배선했다.

- 신규 `TabletCornerContentsPanel` = **링크 전용** UI(연결 목록 · 현재 사용 중 · 빠른 교체 · 순서 · 연결 추가/해제 · 적용 해제).
- `TabletScreenSetManager` = **콘텐츠 원본 라이브러리 전용**으로 정리(corner 모드 제거).
- **DB/API 무변경**(기존 엔드포인트만 소비). tsc 0 / vite build 0.

---

## 1. 배경 — 발견된 3가지 갭

| # | 갭 | 처리 |
|---|-----|------|
| ① | 연결 API(`/tablets/:id/screen-sets` GET/POST/DELETE + `order` PATCH) **프론트 클라이언트 부재** → 코너가 "연결된 콘텐츠"가 아닌 **매장 전체 후보**를 나열 | **이번 해결** |
| ② | 프론트가 **폐기된 제약을 계속 강제** — `all.filter(s => s.tabletId === tabletId \|\| s.tabletId === null)`. 백엔드는 다중 코너 재사용을 위해 `SCREEN_SET_NOT_APPLICABLE` 을 제거했는데 프론트만 남아 pre-split 세트(tabletId=특정 코너)가 타 코너에서 안 보임 | **이번 해결**(필터 삭제) |
| ③ | 보관 가드 비대칭 — `PATCH {status:'archived'}` 는 current+연결 가드(`ARCHIVE_BLOCKED_*`), 그러나 보관 버튼이 쓰는 `DELETE /screen-sets/:id` 는 **current만** 가드 | **후속**(사유는 §5) |

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/api/tabletDisplays.ts` | 연결 API 클라이언트 추가: `CornerContent` 타입 + `fetchCornerContents` / `addCornerContent` / `removeCornerContent` / `reorderCornerContents` |
| `services/web-kpa-society/src/pages/pharmacy/TabletCornerContentsPanel.tsx` | **신규** — 코너 링크 전용 패널 + 연결 추가 피커 |
| `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | 코너 탭: `TabletScreenSetManager mode="corner"` → `TabletCornerContentsPanel` 교체. 콘텐츠 탭 호출부에서 사장된 props 제거 |
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | corner 분기 제거 → 라이브러리 전용화(`mode`/`tabletId`/`currentScreenSetId`/`onCurrentChange` props, `handleApply`/`handleClear`, ② 필터, 사장 import 삭제) |

## 3. 코너 패널 동작 (링크만)

| 기능 | API | 비고 |
|------|-----|------|
| 연결 목록 + 현재 표시 | `GET /tablets/:id/screen-sets` | 서버가 `deleted_at IS NULL` JOIN → 보관/삭제 세트 자동 제외 |
| 빠른 교체(현재 전환) | `POST /tablets/:id/current-screen-set` | 연결 보장 + current 원자적. **초안은 서버가 409 `SCREEN_SET_NOT_ACTIVE`** → 확인 후 `status='active'` 활성화하고 적용 |
| 적용 해제 | `DELETE /tablets/:id/current-screen-set` | 연결은 유지, 기본 화면 복귀 |
| 연결 추가 | `POST /tablets/:id/screen-sets/:screenSetId` | 피커 = 매장 전체 비보관 세트 중 미연결(**②: tabletId 필터 없음**). 409 `SCREEN_SET_ARCHIVED` 처리. 연속 연결 위해 피커 유지 |
| 연결 해제 | `DELETE /tablets/:id/screen-sets/:screenSetId` | 409 `CURRENT_CONTENT_CANNOT_BE_REMOVED` → 한글 안내. 원본/타 코너/QR 무변경 |
| 순서 | `PATCH /tablets/:id/screen-sets/order` | 낙관적 반영 + 실패 시 서버 기준 복구 |

**미제공(사유 명시)**
- **표시숨김(`is_visible`)**: 서버에 토글 엔드포인트가 **없음**(INSERT 시 TRUE 고정, `SET is_visible` 0건). 더욱이 공개 런타임이 연결 테이블을 소비하지 않아 현재 **고객 화면 영향도 없음** → UI 미노출. 필요 시 백엔드 WO 선행.
- 연결 `sort_order` 도 같은 이유로 **관리용 정렬**임을 UI 문구에 명시.

## 4. 경계 준수

- 코너 패널은 **링크만** 다룬다. 콘텐츠 원본 생성·수정·보관은 콘텐츠 탭(`TabletScreenSetManager` → 단계형 제작 셸 + 표준 리스트).
- 예외 1건: **초안 적용 시 `status='active'` 전환**. 서버가 active 를 요구(409)하므로 불가피 → `window.confirm` 으로 명시 동의를 받고 수행(무언의 원본 변경 아님).
- 공개 런타임 / kiosk-core / QR slug / 보호 샘플 **무변경**.

## 5. ③(보관 가드 비대칭)을 이번에 하지 않은 이유 — 순서 의존성

`DELETE /screen-sets/:id` 에 연결 가드를 넣으면 **연결된 세트는 보관 불가**가 된다. 연결 해제 UI가 없는 상태에서 먼저 적용하면 **탈출구 없이 보관이 막힌다**. 본 WO가 연결 해제 UI를 제공했으므로 이제 안전하게 적용 가능하다.

후속 판단 필요: `DELETE` 에 링크 가드 추가(§6 의도와 정합) **또는** 보관을 `PATCH {status:'archived'}` 로 일원화.
현재 영향도: 연결된 세트를 보관하면 링크 행이 남지만 `GET /tablets/:id/screen-sets` 가 `deleted_at IS NULL` 로 JOIN 해 **표시 버그는 없음**(심각도 중~하).

## 6. 검증

| 항목 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.json` | ✅ **EXIT=0** |
| `vite build` | ✅ **EXIT=0** (19.7s) |
| 사장 코드 제거 확인 | ✅ tsc TS6133 로 잔여 import 2건 검출 → 제거 후 0 |
| DB/API 변경 | **없음**(기존 엔드포인트만 소비) |

> **브라우저 스모크 = 미실시(DEFERRED)** — 매장 owner 인증 필요. 배포 후 약국 계정(SSOT=`docs/local/TEST-ACCOUNTS.local.md`)으로 실측 권장:
> 1. 코너에 여러 콘텐츠 연결 · 동일 콘텐츠 다중 코너 연결 · 중복 차단
> 2. 빠른 교체(초안 확인 경로 포함) · 적용 해제
> 3. 현재 콘텐츠 연결 해제 → 409 안내 · 비현재 해제 성공
> 4. 순서 변경 지속 · 원본/QR 불변
> (성공·실패 toast + API success/error 동시 확인 — 콘솔 0만으로 PASS 금지)

## 7. 후속

```
③ 보관 가드 일원화 (DELETE 에 링크 가드 추가 or PATCH 일원화)  ← 이제 안전
표시숨김(is_visible) 토글: 백엔드 엔드포인트 + 공개 런타임 연결 소비 여부 판단
SCREEN-SET-DUPLICATE-V1 (복제) — 미착수
```

---

*코너=연결(store_tablet_corner_contents) 링크 전용 UI, 콘텐츠 탭=원본 라이브러리. 폐기된 tabletId 필터 제거(다중 코너 재사용). is_visible=API 부재+런타임 미소비로 미제공. 초안 적용만 confirm 후 활성화. DB/API 무변경. tsc0·build0. 브라우저 스모크 DEFERRED.*
