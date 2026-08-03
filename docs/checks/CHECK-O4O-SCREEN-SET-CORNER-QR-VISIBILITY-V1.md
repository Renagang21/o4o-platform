# CHECK-O4O-SCREEN-SET-CORNER-QR-VISIBILITY-V1

> WO: `WO-O4O-SCREEN-SET-CORNER-QR-VISIBILITY-V1`
> 목표: Screen Set 의 자동 생성 QR 을 태블릿에서 소비자가 **즉시 스캔**할 수 있도록 대기 화면·메인 화면에 상시 표시한다.
> 신규 테이블·migration·신규 엔드포인트 **없음**.

---

## 1. 사용한 기존 구조

| 구조 | 위치 | 이번 작업에서의 역할 |
|------|------|----------------------|
| `ensureScreenSetQr()` | `apps/api-server/src/routes/platform/store-screen-set-qr.service.ts` | slug 생명주기 SSOT. 멱등 — 기존 row 재사용 + `public_qr_slug` 동기화. 게이트 `origin='store' AND deleted_at IS NULL AND status <> 'archived'` 그대로. |
| `buildScreenSetQrUrl()` | 동일 파일 | `/qr/{slug}` 공개 URL 도출(서비스 카탈로그 도메인). |
| `withQrLink()` | `store-tablet.routes.ts:73-88` | 저장 응답에 `publicQrSlug/publicQrUrl`, 실패 시 `qrLink:'failed'` 를 additive 병합(이미 존재. 이번에 **소비**만 추가). |
| Screen Set resolver | `store-public/store-public-screen-set-resolve.ts` | 공개 태블릿 런타임과 QR 랜딩이 **공유**하는 resolve 경로. `public_qr_slug` 를 이미 SELECT 중. |
| QR export 엔드포인트 | `GET /api/v1/kpa/pharmacy/qr/:id/export` | 관리 화면 QR 미리보기 이미지·파일 다운로드에 그대로 재사용. |
| `QR_EXPORT_PRESETS` / `fetchQrExportBlob` / `downloadQrExport` | `services/web-kpa-society/src/api/storeQr.ts` | PNG/SVG/PDF 출력 UI 재사용. |
| `QrImage`(QRCodeSVG) | `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | 태블릿 화면 QR 렌더(기존 QR 모달이 쓰던 컴포넌트 그대로). |

---

## 2. 변경 내용

### 2-1. 백엔드 — QR 자동 보장 + 상태 노출

`store-public-screen-set-resolve.ts`
- `ResolvedScreenSet.set` 에 `publicQrSlug` / `publicQrUrl` / `qrStatus('ready'|'unavailable')` 추가.
- `public_qr_slug` 가 비어 있으면 resolve 시점에 `ensureScreenSetQr()` 로 **자동 보장**(멱등). 실패는 로그 후 `qrStatus='unavailable'` — 화면 resolve 자체는 실패시키지 않는다.
- 기존 `qr_guide` 블록은 같은 URL(`qrUrl`)을 사용하도록 통일.

`store-public-tablet.handler.ts`
- `/tablet/screen` 응답에 `publicQrSlug` / `qrUrl` / `qrStatus` top-level additive 추가.

> resolver 는 공개 런타임과 QR 랜딩이 함께 쓰므로 두 경로가 동일한 보장을 받는다. resolver 게이트와 `ensureScreenSetQr` 게이트가 동일(`origin='store'`)하여 신규 DB 구조가 필요 없다 → §중지 조건 미해당.

### 2-2. 태블릿 화면 — 대기·메인 상시 표시

`packages/tablet-kiosk-core/src/types.ts` — `TabletScreenResponse` 에 위 3필드(optional) 추가.

`packages/tablet-kiosk-core/src/TabletKioskPage.tsx`
- `cornerQrUrl = screen.qrUrl ?? qr_guide.url` — **템플릿 무관** 단일 소스.
- **대기 화면**: `IdleOverlay` 에 `qrUrl/qrLabel/qrUnavailable` 전달 → 우상단 QR 카드 상시 표시(터치 전에도 스캔 가능). `IdleTouchHero`(대기 영상형)에도 동일 전달.
- **메인 화면**: 기존 "작은 QR 버튼"을 **QR 이미지 카드**로 교체 — 모달을 열지 않아도 바로 스캔 가능. 카드를 누르면 기존 QR 확대 모달(재사용) 오픈.
- `displaySettings.showQr === false` 이면 기존대로 전부 비표시.
- QR 이 없는 소비처(운영자·공급자 원본 미리보기, legacy 서비스: `screen=null`)는 `cornerQrUrl=null` → **안전 비노출**.

### 2-3. 저장 시 QR 실패를 숨기지 않음 (§범위⑤)

`packages/tablet-screen-set-editor/src/index.tsx`
- `ScreenSet` DTO 에 optional `publicQrSlug/publicQrUrl/qrLink` 추가(계약 additive).
- `handleSave` 가 `create`/`update` 결과의 `qrLink === 'failed'` 를 확인 → 성공 토스트 대신 **경고 문구**:
  "저장은 되었지만 QR 생성에 실패했습니다. 잠시 후 다시 저장하거나 매장 QR 관리에서 확인해 주세요."
- `qr === null`(운영자·공급자처럼 QR 대상이 아님)은 `qrLink` 가 붙지 않으므로 **오탐 경고 없음**.

### 2-4. QR 관리 화면 문구 (§범위⑥)

`StoreQRPage.tsx` — 표시 전용 `LANDING_TYPE_LABELS` 신설(`screen_set → '태블릿 코너'`, `video → '동영상'`).
생성 폼 `<select>` 는 `LANDING_TYPE_OPTIONS` 를 그대로 사용 → **screen_set 수동 생성 경로는 만들지 않는다**(자동 생성 전용 유지).

### 2-5. Screen Set 관리 화면 QR 진입 (§범위⑦)

`TabletContentLibraryList.tsx`
- 행 kebab 에 `QR 보기·출력` 추가. `publicQrSlug` 없거나 보관 상태면 미노출.
- 모달: QR 이미지(기존 export PNG) + 공개 URL(`/qr/{slug}`) + `QR_EXPORT_PRESETS` 5종 다운로드.
- QR 레코드 id 는 기존 `GET /pharmacy/qr` 목록에서 `landingType='screen_set' AND landingTargetId=setId` 로 매칭(신규 API 없음).

---

## 3. DB · API 변경 여부

- **DB**: 변경 없음(테이블/컬럼/migration 0). `store_qr_codes` row 는 기존 `ensureScreenSetQr` 규칙대로만 생성.
- **API**: 신규 엔드포인트 0. `/tablet/screen` 응답에 optional 필드 3개 additive(기존 소비처 무영향).
- slug 생명주기 불변: 이름 변경 시 slug 유지, archive → 비활성(공개 410 `SCREEN_SET_INACTIVE`), restore → 동일 slug 재활성.

---

## 4. 검증

| 항목 | 결과 |
|------|------|
| `services/web-kpa-society` `npx tsc --noEmit` | ✅ 0 error |
| `services/web-neture` `npx tsc --noEmit` | ✅ 0 error |
| `apps/api-server` `npx tsc --noEmit` | ✅ `src/scripts/*`(타 세션 작업, build tsconfig 제외) 외 0 error |
| 공유 패키지(`tablet-kiosk-core`, `tablet-screen-set-editor`) | ✅ source-only — 소비 앱 typecheck 로 검증(자체 typecheck 스크립트 없음) |
| 브라우저 스모크 | ⏸ 미실시(배포 전). 아래 §5 목록으로 실 스모크 필요 |

---

## 5. 후속 · 실 스모크 필요 항목

1. 신규 Screen Set 저장 직후 목록 `QR 보기·출력` → 이미지·URL 확인.
2. 태블릿 공개 화면 대기 상태에서 **터치 없이** QR 스캔 → 동일 Screen Set 모바일 화면.
3. 메인 화면 QR 카드 스캔 → 동일 결과. 카드 탭 시 확대 모달.
4. 이름 변경 후 slug 동일 유지 / archive 후 410 / restore 후 동일 QR 재활성.
5. (이전 WO 잔여) 제작기 미리보기에서 선택 상품 미표시 · TABLET 노출 게이트 제외 상품 안내 문구.
