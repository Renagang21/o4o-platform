# CHECK-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1

> WO: `WO-O4O-KPA-TABLET-TEMPLATE-PREVIEW-LAYOUT-FIX-V1`
> 성격: 프론트 — 태블릿 콘텐츠 제작 화면 1단계(템플릿 선택) + 상시 결과 미리보기.
> Date: 2026-07-15

---

## 0. 결론

제작 셸을 **2단 레이아웃**으로 바꾸고, 템플릿을 **카드**로 고르며, 오른쪽에 **실제 태블릿 결과 화면을 항상** 표시한다.

- 템플릿 드롭다운(`TemplateSelectField`) **완전 제거** → 5종 카드(이름·짧은 설명·축소 미리보기, 클릭 즉시 선택).
- 오른쪽 고정 미리보기: 기존 `previewScreenSet` + `TabletKioskPage embedded` **재사용**(kiosk-core 무변경). 모든 단계에서 유지.
- **API·DB·kiosk-core 무변경.** tsc 0 / vite build 0.

## 1. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx` | `TabletContentStepBuilder` 2단 레이아웃 + 상시 미리보기 + step 0 카드화. `TemplateSelectField`(드롭다운) → `TemplateThumb`(와이어프레임) 대체. 사장된 `LayoutTemplate` import 제거 |

단일 파일 변경. 제작 셸(`TabletContentStepBuilder`)은 이 파일에 내장돼 있다.

## 2. 레이아웃

```
lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]   → 왼쪽 ≈57.4% / 오른쪽 ≈42.6%
```
- 헤더 + 스텝 인디케이터: 그리드 **밖**(전체 폭 유지).
- 왼쪽: 단계 본문 + 이전/다음.
- 오른쪽: `<aside lg:sticky lg:top-4>` — 스크롤해도 따라옴.
- **lg 미만**: `mt-4` 로 미리보기가 아래로 내려감(WO 허용 — PC 웹 기준 구현).

## 3. 템플릿 카드 (step 0)

5종 = `corner_information_basic_v1` / `product_focus` / `idle_touch_video` / `corner_overview_qr` / `product_grid_qr` (`TEMPLATE_OPTIONS` 기준, 신규 정의 없음).

- 카드 = 축소 미리보기 + 이름 + `선택됨` 배지 + 짧은 설명(`t.description` 재사용).
- 클릭 → `setTemplateKey` **즉시 선택**(확인 단계 없음) → 오른쪽 미리보기 반영.
- `aria-pressed` 로 선택 상태 노출.

**축소 미리보기 = 경량 와이어프레임(`TemplateThumb`)** — 카드 5장에 kiosk 인스턴스를 띄우면 preview POST 5회 + 렌더 비용이 커진다. 카드는 **배치 스케치**만 담당하고, **실제 결과 화면은 오른쪽 고정 미리보기**가 담당한다(WO의 "오른쪽에 실제 태블릿 결과 화면" 요구와 역할 분리).

## 4. 오른쪽 고정 미리보기

| 항목 | 구현 |
|------|------|
| 데이터 | 기존 `previewScreenSet({ templateKey, blocks })` (저장 전 draft resolve, read-only) |
| 렌더 | 기존 `TabletKioskPage ... previewScreen embedded showQrBadge={false}` — **kiosk-core 무변경**(`embedded` 기존 prop) |
| 전환 | `[태블릿 화면] [QR 모바일 화면]` — 태블릿 16:10 / 모바일 9:19 프레임 |
| 즉시 반영 | `liveKey = templateKey + normalizeBlocks(blocks)` 변경 시 재조회 |
| 성능 | **400ms 디바운스** — 텍스트 입력마다 POST 하지 않음 |
| 깜빡임 | 재조회 중 이전 화면 유지 + 우상단 `갱신 중` 배지 |
| 단계 유지 | `aside` 가 단계 본문 **밖**에 있어 step 조건 없이 상시 렌더 |
| 불가 시 | `canPreview`(previewApi && storeSlug) 거짓이면 안내 문구, 실패 시 에러 문구 |

저장 단계의 기존 모달 버튼은 상시 미리보기와 중복되므로 **`태블릿 크게 보기` / `QR 모바일 크게 보기`** 로 라벨을 구분(전체화면 확대 용도로 존속).

## 5. 실패 기준 대비

| 실패 기준 | 상태 |
|-----------|------|
| 템플릿 선택이 드롭다운으로 남아 있음 | ✅ 해소 — `TemplateSelectField` 제거(grep 잔존 0, 주석 언급만) |
| 오른쪽 미리보기가 없음 | ✅ 해소 — `aside` 고정 패널 |
| 미리보기가 마지막 단계 모달에서만 보임 | ✅ 해소 — 단계 본문 밖 상시 렌더(step 조건 없음) |
| 템플릿을 바꿔도 오른쪽 화면이 바뀌지 않음 | ✅ 해소 — `liveKey` 에 `templateKey` 포함 → 재조회 |

## 6. 범위 준수 (하지 않은 것)

블록 추가 UI 제거 ❌ / 대기 화면 UX 변경 ❌ / 코너 설명 편집 방식 변경 ❌ / 추가 정보 선택 구조 변경 ❌ / 코너 관리 UI 변경 ❌ / API·DB·kiosk-core 변경 ❌ — **모두 미변경**.
기존 저장 경로(`createScreenSet`/`updateScreenSet` + `saveScreenSetBlocks`)와 dirty guard(`baseline`/`isDirty`/`guardedCancel`/`beforeunload`) **그대로 유지**.

## 7. 검증

| 항목 | 결과 |
|------|------|
| `tsc --noEmit -p tsconfig.json` | ✅ **EXIT=0** |
| `vite build` | ✅ **EXIT=0** (22.3s) |
| 사장 코드 제거 | ✅ tsc TS6133 이 `LayoutTemplate` 검출 → 제거 후 0 |
| 구조(헤더/스텝=그리드 밖, aside=상시) | ✅ 마커 확인 |
| API·DB·kiosk-core 변경 | **없음** |

> **브라우저 실측 + 스크린샷**: 아래 §8 참조.

## 8. 스크린샷 / 브라우저 실측

WO 산출물로 **실제 제작 화면 스크린샷**이 요구된다. 배포 후 약국 계정(SSOT=`docs/local/TEST-ACCOUNTS.local.md`)으로 실측한다.

실측 항목:
```
신규 제작 진입 → 템플릿 카드 5종 표시
카드 클릭 → 선택 상태 변경
오른쪽 태블릿 미리보기 즉시 변경
QR 모바일 미리보기 전환
다음 단계에서도 오른쪽 미리보기 유지
기존 저장·dirty guard 유지
```
(콘솔 0만으로 PASS 금지 — 성공·실패 toast + API success/error 동시 확인)

## 9. 후속

```
③ 보관 가드 일원화 (DELETE 링크 가드) — 연결 해제 UI 확보로 안전해짐
표시숨김(is_visible) 토글: 백엔드 엔드포인트 선행 필요
SCREEN-SET-DUPLICATE-V1 (복제) — 미착수
```

---

*제작 셸 2단(왼쪽 ≈58% 단계 / 오른쪽 ≈42% 실결과). 템플릿=카드 5종(와이어프레임 썸네일, 클릭 즉시 선택), 드롭다운 제거. 오른쪽=previewScreenSet+TabletKioskPage embedded 재사용, 400ms 디바운스, 태블릿/QR모바일 전환, 전 단계 유지. API·DB·kiosk-core 무변경. tsc0·build0.*
