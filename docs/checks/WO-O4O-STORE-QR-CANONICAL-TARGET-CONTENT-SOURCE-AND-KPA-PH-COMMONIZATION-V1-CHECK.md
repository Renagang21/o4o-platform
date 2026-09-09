# CHECK — WO-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1

- **상태**: ACTIVE (구현 완료 기록)
- **작성일**: 2026-09-09
- **설계 정본**: [DESIGN-O4O-STORE-QR-CANONICAL-TARGET-PLACEMENT-AND-ANALYTICS-V1](../design/DESIGN-O4O-STORE-QR-CANONICAL-TARGET-PLACEMENT-AND-ANALYTICS-V1.md) (`801d55254`)
- **선행**: Phase A 베이스라인 `a9473519d` · Tablet 축 CLOSED (`7971407f0` … `cb3d23af9`)

---

## 1. 결과 요약

```text
QR CANONICAL TARGET   = PASS
CONTENT SOURCE        = PASS
PUBLIC QR REGRESSION  = PASS
PLACEMENT             = NOT_STARTED   (설계대로 이번 회차 범위 밖)

KPA / PH QR PARITY    = PARTIAL       (운영 화면 PASS · PH 공개 screen_set 뷰어 FAIL — §9)
```

WO 판정:

```text
WO IMPLEMENTATION SCOPE = COMPLETED
QR CANONICALIZATION     = CLOSED
KPA/PH COMMON OPERATION = CLOSED

PH SCREEN_SET PUBLIC QR = OPEN
FINAL KPA/PH QR PARITY  = NOT_YET_CLOSED
```

`PH SCREEN_SET PUBLIC QR` 이 이번 커밋의 **회귀가 아니라는 판정(§9)** 과, **KPA/PH parity 가
닫혔는가** 는 별개 문제다. KPA 에서는 `screen_set` QR 이 실제 내용을 보여주고 PH 에서는 빈
화면을 보여주므로, **사용자 경험 기준 parity 는 아직 닫히지 않았다.** 따라서 최종 parity 는
후속 WO(`WO-O4O-PHARMACYHUB-SCREENSET-QR-PUBLIC-VIEWER-AND-QR-PARITY-FINAL-CLOSURE-V1`)
에서 production E2E 로 CLOSED 한다.

검증용 QR 2건(§14-A 잔여물)도 그 회차에서 canonical UI/API 경로로 정리한다 — 운영 데이터이므로
직접 SQL 로 되돌리지 않는다.

---

## 2. Canonical target mapping (①)

`landing_type` 이 canonical target 축이다. `type` 컬럼은 DEAD residue 다.

| landing_type | targetKind |
|---|---|
| `product` | `PRODUCT` |
| `page` | `CONTENT` |
| `promotion` | `CONTENT` |
| `video` | `CONTENT` |
| `screen_set` | `SCREEN_SET` |
| `link` | `EXTERNAL_LINK` |

정본 2곳이 같은 표를 갖는다 (백엔드/프론트 각각 자기 계층에서 필요):

- `apps/api-server/src/services/store/store-qr-target.contract.ts` → `LANDING_TYPE_TO_TARGET_KIND`
- `packages/store-ui-core/src/components/qr/storeQrOperationModel.ts` → `STORE_QR_LANDING_TYPE_TO_TARGET_KIND`

모르는 landing_type 은 `null` 이다. 임의 기본값으로 오분류하지 않는다.

---

## 3. contentSource 최종 목록 (②)

11종. targetKind 와 **직교**한다 — "무엇을 가리키는가"(target)와 "내용이 어디서 오는가"(source)는 다른 축이다.

`STORE_PRODUCT_LISTING` · `SUPPLIER_PRODUCT_OFFER` · `PRODUCT_MASTER_LANDING` · `EXECUTION_ASSET` ·
`STORE_DIRECT` · `SHARED_CONTENT` · `STORE_VIDEO` · `TABLET_SCREEN_SET` · `STORE_BLOG` ·
`MULTILINGUAL_PRODUCT` · `EXTERNAL_URL`

---

## 4. 프로덕션 재측정 · backfill (③④)

최신 `origin/main` 기준 read-only 재측정 (2026-09-09, cloud-sql-proxy). **IR-V2 수치를 전제하지 않고 다시 셌다.**

- 총 **88 rows / 4 organizations**
- `type IS DISTINCT FROM landing_type` → **0 건** (완전 중복 확인)
- landing_type 분포: `screen_set` 40 · `product` 18 · `page` 16 · `link` 13 · `video` 1

backfill 드라이런 (실제 참조 관계 JOIN 으로만 판정 · 텍스트 추론 0):

| contentSource | 건수 |
|---|---:|
| `TABLET_SCREEN_SET` | 40 |
| `STORE_PRODUCT_LISTING` | 18 |
| `EXTERNAL_URL` | 10 |
| `STORE_DIRECT` | 8 |
| `EXECUTION_ASSET` | 6 |
| `SHARED_CONTENT` | 2 |
| `STORE_BLOG` | 2 |
| `MULTILINGUAL_PRODUCT` | 1 |
| **HOLD (null)** | **1** |
| 합계 | **88** |

**HOLD 1 건** = `video` QR 1 건. 대상이 이미 소실됐고 `is_active = false` 다. 참조로 판정할 수 없으므로
`null` 로 둔다 — 추측으로 채우지 않는다. WO §20 중지 조건 1("모호한 행이 다수")은 발동하지 않는다.

---

## 5. `type` residue 상태 (⑤)

**DROP 하지 않았다.** `NOT NULL DEFAULT 'product'` 컬럼이라 schema housekeeping 은 별도 회차다.

이번 회차에 제거한 것은 **read/write 의존**뿐이다.

- write 제거: `qr.controller.ts` (`type: landingType` 삭제) · `store-screen-set-qr.service.ts` raw INSERT 의 컬럼 목록에서 제거 · KPA `StoreQrCreateModal` / `StoreQRPage` 의 전송 3곳
- read 제거: KPA `api/storeQr.ts` · PH `pharmacyHubStoreQr.ts` · KPA/KCos `api/qrStaff.ts` 의 `type` 필드 삭제
- Entity 는 `@deprecated DEAD residue` JSDoc 만 붙여 남긴다. 데코레이터에 `default: 'product'` 가 있어
  INSERT 시 컬럼을 생략해도 DB 기본값이 들어간다(NOT NULL 위반 없음).

잔여 read/write 검색 결과 **0 건**.

---

## 6. Public resolver (⑥⑦)

`/qr/{slug}` 는 **breaking change 0**. slug · organization_id · landing_target_id · is_active ·
scan history 전부 불변이다.

- 공개 랜딩 소비처(KPA/Neture/PH `QrLandingPage` · `PublicScreenSetViewer` · `PublicVideoViewer`)의
  `.type` 소비 **0 건** → resolver 계약이 바뀌지 않았다.
- source resolver 는 `resolveQrContentSource()` (백엔드 단일 함수)로 단일화했다. 판정 실패는
  try/catch 로 삼켜 `null`(HOLD)을 반환한다 — **분류 실패가 QR 생성을 막지 않는다.**

---

## 7. KPA / PH 공통 QR Operation View (⑦⑧)

2세대 공통 Core (`TabletCornerBoard` 선례대로 **서비스 조건문 0** · fetch/router 무의존):

- `packages/store-ui-core/src/components/qr/storeQrOperationModel.ts` — React 무의존 계약·라벨·판정
- `packages/store-ui-core/src/components/qr/StoreQrOperationBoard.tsx` — 표·출력 메뉴·액션 배치

Tailwind class 대신 **inline style palette 주입**이다. KPA 는 inline + design core colors,
PH 는 Tailwind 라 어느 한쪽 스타일 체계에 Core 를 종속시키지 않기 위해서다.
기본 palette 가 PH 계열(gray/blue-600)이라 PH 는 palette 를 주입하지 않는다.

1세대 `StoreQrConsoleView` 는 제거하지 않고 **K-Cosmetics 전용 · 세대 교체 대기**로 표기만 했다
(KCos canonical adoption 은 WO §19 범위 밖).

**제거한 중복 LOC**: KPA `StoreQRPage.tsx` 2,070 → 약 1,900 (**약 170 LOC**).
로컬 `QrExportMenu` 컴포넌트 전체와 로컬 `isArchivedCornerQr` 를 Core 로 승격했고,
`QR_EXPORT_PRESETS` 는 Core 의 `STORE_QR_EXPORT_PRESETS` 재수출로 대체했다.
PH 는 `<ul>` 카드 목록(약 70 LOC)을 Board 한 블록으로 대체했다.

### 추가로 연 축 — reactivate

WO §17 이 요구하는 `deactivate/reactivate` 시나리오가 **구현 자체가 없었다.** 내린 QR 이 목록에서
사라져 다시 올릴 경로가 없었다(주소는 살아 있는데 화면에서만 소실). additive 로 열었다.

- `store-qr.service.ts` — `ListQrParams.includeInactive` + `reactivateStoreQrCode()`
  - 목록 WHERE 와 total WHERE 를 같은 `activityFilter` 변수로 묶어 페이지네이션 정합을 보존했다.
  - `is_active` 만 되돌린다. **slug · landing_type · landing_target_id 는 건드리지 않는다.**
- KPA `POST /pharmacy/qr/:id/reactivate` · PH `POST /store-owner/qr/:id/reactivate` (상태 변경이라 GET 아님 — CLAUDE.md §8)

---

## 8. ProductMaster QR vs Store QR UX (⑨)

두 축은 합치지 않는다. 구조적으로 이미 분리돼 있고(별도 모달 / 별도 목록), 이번 회차에서
**화면 문구로도 구분**되게 했다.

- `StoreProductQrModal` — "상품 기준 대표 QR 이며 QR 코드 목록에는 나타나지 않는다" 명시
- KPA `StoreQRPage` · PH `QrPage` 부제 — "상품 대표 QR 은 취급제품 화면에서 따로 출력한다" 명시

---

## 9. Screen Set QR parity (⑩)

PH 가 Board 를 채택하면서 자동으로 확보됐다. 백엔드 목록은 원래 공통(`listStoreQrCodes` +
`SCREEN_SET_QR_JOIN`)이라 PH 도 `screenSetStatus` / `landable` 을 받고 있었고, 표시만 없었다.

이제 KPA/PH 모두 동일하게: 보관된 코너 QR 은 목록에 남고(주소 유지), **출력만 막히며**,
`보관` 배지와 해제 안내가 붙는다. 서버가 같은 판정으로 409 를 주므로 UI 가 왕복을 미리 아낀다.

생성 폼의 landing type 선택지는 KPA/PH 모두 product/page/link 3종으로 **이미 동일**했다.
`screen_set` QR 은 어느 서비스에서도 QR 화면에서 만들지 않는다 — 태블릿 코너에서 자동 생성된다.

### 운영 화면 parity 는 PASS — 공개 뷰어는 PH 만 FAIL (선재 결함)

production E2E 중 확정한 결함이다. **매장 경영자 운영 화면**의 screen_set QR parity 는
KPA/PH 동일하지만, **공개 `/qr/{slug}` 뷰어**는 다르다.

```text
KPA  /qr/tablet-corner-5              -> PublicScreenSetViewer 정상 렌더                PASS
PH   /qr/a-2-2 · /qr/c-2 · /qr/f-2    -> "표시할 내용이 아직 준비되지 않았습니다."      FAIL
```

원인 (코드 확인):

- `PharmacyHubStoreQrController.publicLanding` 이 응답에 `screenSet` payload 를 넣지 않는다
  (해당 파일 주석 "video / screen_set 은 … 축이 Pharmacy-Hub 에 생긴 뒤 연다" 는 stale — 데이터는 이미 있다)
- `services/web-pharmacy-hub/src/pages/QrLandingPage.tsx` 에 `screen_set` 분기가 없다
  (`pageContent` / `productDetails` / `link` 만 처리하고 나머지는 placeholder)
- `PublicScreenSetViewer` 는 `services/web-kpa-society/src/pages/qr/` 안의 **KPA 로컬** 컴포넌트다

데이터는 정상이다(read-only SQL: 4건 모두 `status=active` · `deleted_at IS NULL` ·
blocks 5 · corner_contents 1 — KPA `tablet-corner-5` 와 동일 구조).

**이번 회차 회귀가 아니다.** `git show --stat 0ee65c9fd` 로 이번 커밋이 공개 QR 뷰어 파일을
전혀 건드리지 않았음을 확인했다. 수정하려면 PH 백엔드 resolver 확장 + `PublicScreenSetViewer`
공유 패키지 승격이 필요해 새로운 축이므로, CLAUDE.md 실행 원칙(범위 외 수정 금지)에 따라
**고치지 않고 §16 에 별도 WO 로 제안**한다.

---

## 10. Analytics 준비 상태 (⑪)

분석 단위는 설계대로 **QR Instance** 다. `store_qr_codes.content_source` 가 생겨
`(organization_id, content_source)` index 로 "어떤 원천의 QR 이 얼마나 스캔되는가"를 집계할
축이 마련됐다. 집계 화면·API 는 이번 회차 범위 밖이다.

---

## 11. legacy / dead 정리 (⑫)

정리한 것:

- `type` write 3곳 · `type` 타입 필드 4곳 (위 §5)
- KPA 로컬 `QrExportMenu` · 로컬 `isArchivedCornerQr` · 로컬 `QR_EXPORT_PRESETS` 리터럴
- PH `LANDING_LABELS` 로컬 라벨 표 (Core 의 targetKind/contentSource 어휘로 대체)

**정리하지 않고 보고만 하는 것** (범위 밖 · 별도 판단 필요):

- `promotion` landing type — 프로덕션 사용 0 건이나 `VALID_QR_LANDING_TYPES` 에 남아 있다.
  제거는 계약 축소라 별도 회차.
- `video` landing type — 프로덕션 1 건(대상 소실 · 비활성)이 실재한다. 살아 있는 행이 있는 한 제거하지 않는다.
- `library_item_id` — `landing_target_id` 와 역할이 겹치나 현재 write 경로가 살아 있다.
- 1세대 `StoreQrConsoleView` (KCos) — KCos canonical adoption 이 WO §19 범위 밖이라 유지.

---

## 12. KCos 영향 (⑬)

canonical adoption 하지 않았다(§15 보호). 변경은 `api/qrStaff.ts` 의 `type: string` 필드 삭제 1건뿐이며
이 필드를 읽는 코드는 0 건이었다. QR create/delete/download 및 공개 route 경로 무변경.

회귀 확인:

- `services/web-k-cosmetics` 내 QR 관련 `.type` 소비 grep → **0 건**
- `StoreQrPage.tsx` → `StoreQrConsoleView` 소비 유지(1세대 export 를 제거하지 않았다)
- typecheck 0 errors · `vite build` exit 0

KCos `/qr/:slug` 공개 라우트 부재는 이번에도 손대지 않고 **별도 defect 후보로 유지**한다.

---

## 13. Migration (⑭)

`apps/api-server/src/database/migrations/20270327000000-AddStoreQrContentSource.ts`

```text
up()   ADD COLUMN IF NOT EXISTS content_source VARCHAR(40) NULL
       COMMENT ON COLUMN
       CREATE INDEX IF NOT EXISTS "IDX_store_qr_codes_org_content_source" (organization_id, content_source)
       동결 사본 CASE 로 안전 backfill (참조 JOIN 판정 · 불명확하면 NULL)
down() DROP INDEX / DROP COLUMN
```

WO §16 허용 범위 그대로다 — `type` DROP 없음 / 대량 target rewrite 없음 /
`product_landings` 구조 변경 없음 / placement table 없음. 등록은 glob 자동이라 파일 추가로 끝난다.

---

## 14. tests / build (⑧)

`pnpm build:packages` 로 패키지 dist 를 먼저 생성한 뒤 재측정했다.
dist 가 없는 상태의 tsc 는 `Cannot find module '@o4o/ui'` 같은 모듈 해석 잡음만 내뿜
게이트로 쓸 수 없다.

```text
pnpm build:packages                                            → exit 0
npx tsc -p packages/tablet-screen-set-editor/tsconfig.json      → 0 errors
npx tsc -p services/web-kpa-society/tsconfig.json  --noEmit     → 0 errors
npx tsc -p services/web-pharmacy-hub/tsconfig.json --noEmit     → 0 errors
npx tsc -p services/web-k-cosmetics/tsconfig.json  --noEmit     → 0 errors
npx tsc -p apps/api-server/tsconfig.json           --noEmit     → 0 errors
```

`@o4o/store-ui-core` 는 build script 가 없는 **source-only 패키지**(`main`/`types` = `./src/index.ts`)라
standalone tsc 를 게이트로 쓰지 않는다. **소비 서비스의 tsc 가 이 패키지의 검증 게이트다.**

### 타입체크가 잡아낸 잔존 `type` read 1건

`packages/tablet-screen-set-editor` 의 `ScreenSetQrOption.type` 을 `qrTypeLabel(o.type ?? o.landingType)` 로
읽고 있었다. grep 으로는 `q.type` 형태라 앞서 놓쳤다. 계약에서 `type` 을 제거하고
`landingType` 만 읽도록 바꿨다. 이 패키지의 실소비처는 KPA `TabletScreenSetManager` 1곳이다.

### production build

```text
services/web-kpa-society   vite build → built in 33.27s (exit 0)
services/web-pharmacy-hub  vite build → built in 30.28s (exit 0)
services/web-k-cosmetics   vite build → built in 28.82s (exit 0)
```

주의: `npx vite build --config <service>/vite.config.ts` 는 root 가 워크스페이스 루트로 잡혀
`Could not resolve entry module "index.html"` 로 실패한다. 서비스 디렉터리에서 실행해야 한다.

## 14-A. Production E2E (⑰)

2026-09-09 · 프로덕션 실브라우저(Playwright MCP) · 테스트 매장 경영자 계정.

### KPA (`/pharmacy/store/qr`)

```text
목록 렌더            총 52행 (활성 22 · 보관 30) · 공통 Board                     PASS
필터 칩              콘텐츠 연결 12 / AI 설명 2 / 태블릿 코너 33                  PASS
QR 생성              다국어 콘텐츠 기반 -> targetKind "외부 링크" +
                     contentSource "다국어 제품 설명"(MULTILINGUAL_PRODUCT)       PASS
export preset        PNG · PNG 고해상도 · SVG · A4 1장 PDF · A4 4분할 PDF         PASS (5종)
PNG 다운로드         파일 저장 확인                                               PASS
스캔 통계            인라인 패널 · 카운터 실시간 증가(0->1 · 3->4 · 2->3)         PASS
URL 복사 / 이름 수정 저장 반영                                                    PASS
deactivate -> reactivate   "내림" 배지 -> 복구                                    PASS
공개 라우트          /qr/qr-1788937224442 (다국어) · /qr/tablet-corner-5
                     (SCREEN_SET) · /qr/type-3 (CONTENT)                          PASS
console error 0 / white screen 0 / dead link 0
```

`resolveQrContentSource()` 가 `landing_type='link'` 인 행에서도 **실제 참조 관계**로
`MULTILINGUAL_PRODUCT` 를 판정한 것이 핵심 실증이다 — landing_type 은 target 축,
contentSource 는 원천 축으로 분리돼 동작한다.

KPA 조직에는 `PRODUCT` targetKind QR 이 0건이다(프로덕션 `landing_type='product'` 18건은
전부 PharmacyHub 조직 소유). 따라서 PRODUCT 시나리오는 PH 에서 실증했다.

### PharmacyHub (`/store-owner/qr`)

```text
목록 렌더            21행 (PRODUCT 18 + SCREEN_SET 3) · 동일 Board                PASS
액션 6종             KPA 와 동일 (라벨만 '이름 수정')                             PASS
export preset        동일 5종 · PNG 다운로드                                      PASS
스캔 통계            AnalyticsDialog 모달 (전체 2 / 오늘 0 / 최근7일 2 ·
                     기기별 PC 2)                                                 PASS
URL 복사 / 이름 수정 저장 반영                                                    PASS
deactivate -> reactivate                                                          PASS
QR 생성              연결 유형 3종(매장 콘텐츠·자료 / 매장 경영활용 제품 /
                     외부 링크) = KPA parity. 외부 링크 신규 생성 ->
                     /qr/e2e-qr-mttrdan3 · targetKind "외부 링크" +
                     contentSource "외부 주소"(EXTERNAL_URL)                      PASS
공개 PRODUCT 라우트  /qr/f6-mtmea9ml                                              PASS
공개 SCREEN_SET      /qr/a-2-2 · /qr/c-2 · /qr/f-2                                FAIL (§9 · 선재 결함)
console error 0 (로그인 전 401 2건은 미인증 정상 동작)
```

### 교차 확인

```text
KPA/PH 동일 target/source 의미      PASS (같은 계약 모듈 · 같은 라벨 맵)
Tablet ScreenSet QR 동일성          운영 화면 PASS / PH 공개 뷰어 FAIL
STORE canonical fallback            PASS
product-linked content 우선         PASS (KPA 다국어 QR 로 실증)
```

### 검증 잔여물

E2E 도중 브라우저 프로필이 다른 Chrome 인스턴스에 점유되어 컨텍스트가 종료됐고,
마지막 정리 동작 2건을 끝내지 못했다. 프로덕션 데이터 write 는 승인 대상이므로 SQL 로
직접 되돌리지 않았다.

```text
PH  slug=e2e-qr-mttrdan3  "[E2E] 외부 링크 QR 검증"           — 활성 상태로 남음 (내리기 미완)
KPA slug=qr-1788937224442 제목 "뇌선 다국어 안내 (E2E 확인)"  — 원제목 미복원
```

둘 다 검증용으로 만든 QR 이며 기존 운영 QR 에는 영향이 없다. 화면에서 1분 내 정리 가능하다.

---

## 15. Placement

**NOT_STARTED.** 설계(§Placement)대로 이번 회차에서 구현하지 않았다.
`store_qr_placements` · placement UI · placement analytics 전부 미착수다.

---

## 16. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
```

별도 WO 제안:

1. K-Cosmetics `/qr/:slug` 공개 라우트 부재 (defect 후보 · 이번에도 미해결 유지)
2. `store_qr_codes.type` 컬럼 DROP schema housekeeping (read/write 의존은 이번에 전부 제거됨 —
   production 관측 기간을 둔 뒤 별도 회차)
3. **PharmacyHub 공개 `/qr/{slug}` screen_set 뷰어 부재** (§9 · production E2E 로 확정한 선재 결함)
   — `PharmacyHubStoreQrController.publicLanding` 에 screenSet payload 추가 +
   `PublicScreenSetViewer` 공유 패키지 승격 + PH adoption
