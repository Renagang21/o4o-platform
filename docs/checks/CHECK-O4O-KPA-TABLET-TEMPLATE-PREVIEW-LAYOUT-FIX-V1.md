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
| `vite build` | ✅ **EXIT=0** |
| 사장 코드 제거 | ✅ tsc TS6133 이 `LayoutTemplate` 검출 → 제거 후 0 |
| 구조(헤더/스텝=그리드 밖, aside=상시) | ✅ 마커 확인 |
| API·DB·kiosk-core 변경 | **없음** |
| 배포 | ✅ Deploy Web Services success (run 29414246780 · 29414946125) |

## 8. 브라우저 실측 (배포본 · PASS)

`https://kpa-society.co.kr` · 약국 경영자 계정(SSOT=`docs/local/TEST-ACCOUNTS.local.md`, env 주입) · Playwright 1.57 · viewport 1600×1000.

| 검증 항목 | 결과 |
|-----------|------|
| 신규 제작 진입 | ✅ 태블릿 콘텐츠 탭 → `태블릿 화면 만들기` |
| 템플릿 카드 5종 표시 | ✅ `button[aria-pressed]` **count=5**, 각 카드 와이어프레임 상이 |
| 카드 클릭 → 선택 상태 변경 | ✅ `선택됨` 배지 이동 확인 |
| **오른쪽 태블릿 미리보기 즉시 변경** | ✅ 템플릿별 레이아웃 실제 상이 — 대기 영상형=「화면을 터치하세요 / Touch to start」 전면 영상 / 제품 진열형=「매장 상품 안내」+제품 그리드+가격 / 기본 코너 안내형=헤더+상품 카드 (kiosk-core 가 `screen.templateKey` 로 분기) |
| QR 모바일 미리보기 전환 | ✅ 9:19 프레임 전환 |
| 다음 단계에서도 미리보기 유지 | ✅ step 2(기본 정보)에서도 우측 패널 유지 |
| 콘솔/pageerror / API 4xx·5xx | ✅ **0건** |

### 8-1. 실측으로 발견·수정한 결함 (sticky 무력화)

최초 구현의 `lg:sticky lg:top-4` 가 **전혀 동작하지 않음**을 실측으로 확인했다(정적 검증만으로는 잡히지 않는 결함).

```
수정 전: 스크롤 700px → asideTop = -115  (패널이 화면 밖으로 밀려남)
수정 후: 스크롤 700px → asideTop =   73  (headerBottom=65 바로 아래 고정)
```

원인 2가지 → 수정(commit `4622349f4`):
1. **매니저 루트 카드의 `overflow-hidden`** 이 조상 스크롤포트가 되어 sticky 를 무력화
   → 제작 셸(takeover)을 **카드 래퍼 밖**에서 렌더. 카드 헤더(`태블릿 콘텐츠`)와 셸 헤더(`태블릿 화면 만들기`) **중복도 함께 해소**.
2. sticky 오프셋 `top-4`(16px) < **전역 헤더 높이 65px**(실측: `header` `position:sticky; top:0; z-50`)
   → `lg:top-[73px]` 로 조정(헤더 하단 +8px).

> 저장 실행(row write)은 하지 않았다 — 검증 목적의 테스트 콘텐츠를 프로덕션에 남기지 않기 위함. 저장 경로·dirty guard 는 **미변경**(코드 기준)이며, 실제 저장 smoke 는 운영 데이터 생성이 필요할 때 별도 수행.

## 9. 후속

```
③ 보관 가드 일원화 (DELETE 링크 가드) — 연결 해제 UI 확보로 안전해짐
표시숨김(is_visible) 토글: 백엔드 엔드포인트 선행 필요
SCREEN-SET-DUPLICATE-V1 (복제) — 미착수
```

---

*제작 셸 2단(왼쪽 ≈58% 단계 / 오른쪽 ≈42% 실결과). 템플릿=카드 5종(와이어프레임 썸네일, 클릭 즉시 선택), 드롭다운 제거. 오른쪽=previewScreenSet+TabletKioskPage embedded 재사용, 400ms 디바운스, 태블릿/QR모바일 전환, 전 단계 유지. API·DB·kiosk-core 무변경. tsc0·build0.*
