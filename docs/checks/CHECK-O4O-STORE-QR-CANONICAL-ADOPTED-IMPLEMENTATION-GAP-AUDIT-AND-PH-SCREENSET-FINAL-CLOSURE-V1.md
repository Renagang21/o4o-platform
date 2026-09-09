# CHECK-O4O-STORE-QR-CANONICAL-ADOPTED-IMPLEMENTATION-GAP-AUDIT-AND-PH-SCREENSET-FINAL-CLOSURE-V1

- **WO**: WO-O4O-STORE-QR-CANONICAL-ADOPTED-IMPLEMENTATION-GAP-AUDIT-AND-PH-SCREENSET-FINAL-CLOSURE-V1
- **작업일**: 2026-09-09
- **branch**: `work/store-qr-gap-audit-and-ph-screenset-closure-v1`
- **시작 HEAD**: `6b9c06a26` → 작업 중 `origin/main` 진행분 fast-forward → `89440e639`
- **환경**: Node `v22.18.0` / pnpm `10.25.0`

---

## 1. 기준선

| 항목 | 값 |
|---|---|
| 정본 | `origin/main` 의 Store QR canonical 구현(23파일) — **PRESERVED** |
| 폐기 비교자료 | `C:\Users\home\Downloads\WO-O4O-STORE-QR-CANONICAL.patch` (19파일) — **읽기 전용 비교에만 사용** |
| `git apply` / `--3way` / 전체 적용 | **실행 0건** |
| `scratchpad/` | 미접촉 |
| `C:\tmp\o4o-cafe24-pilot` worktree | 미접촉 |
| `work/kpa-branch-annual-report-review-v1` | 미삭제·미이동 |

---

## 2. 경쟁 구현 차이 감사 (4항목)

프로덕션 실측(cloud-sql-proxy `5442`, `o4o_api_v2`, read-only)을 근거로 판정했다.
코드 주석이나 과거 CHECK 서술을 근거로 삼지 않았다.

프로덕션 `store_qr_codes` 실측 (총 90행):

```text
landing_type   : link 15 / page 16 / product 18 / screen_set 40 / video 1
type (잔재 컬럼): link 13 / page 16 / product 20 / screen_set 40 / video 1   ← landing_type 과 2행 불일치
content_source : TABLET_SCREEN_SET 40 / STORE_PRODUCT_LISTING 18 / EXTERNAL_URL 11 /
                 STORE_DIRECT 8 / EXECUTION_ASSET 6 / SHARED_CONTENT 2 / STORE_BLOG 2 /
                 MULTILINGUAL_PRODUCT 2 / NULL 1
promotion      : 두 축 모두 0 건
```

`type` 컬럼이 이미 `landing_type` 과 2행 어긋나 있다는 사실은
"`type` = DEAD 잔재 / 읽지도 쓰지도 않는다 / DROP 하지도 않는다" 판정을 실측으로 재확인한 것이다.

### 판정표

| # | 후보 | 판정 | 근거 | 조치 |
|---|---|---|---|---|
| A | canonical contract 회귀 가드 | **ACTIVE_GAP** | 채택 구현에 2축(`landing_type` ↔ `content_source`) 정합·`type` 잔재·writer 경로를 소스 단위로 잠그는 회귀 가드가 없었다. 폐기 patch 는 이 가드를 갖고 있었다. | **수정함** — `apps/api-server/src/__tests__/store-qr-canonical-contract.spec.ts` 신규(7절 31 test) |
| B | `PRODUCT_MASTER_LANDING` writer 거부 | **ALREADY_COVERED** | `createStoreQrCode` 는 클라이언트 `contentSource` 를 **입력으로 받지 않는다**(body 대입 경로 0). 값은 항상 `resolveQrContentSource` 로 서버가 도출하고, `contentSourceClassifySql()` 에는 `PRODUCT_MASTER_LANDING` 을 산출하는 분기 자체가 없다. patch 의 "명시적 거부"보다 구조적으로 더 강하다. | **코드 변경 없음** — A 의 spec §3 으로 잠금 |
| C | 신규 `promotion` 제거 | **ACTIVE_GAP (신규 생성 한정)** | 프로덕션 실측 0 건이고 `resolveQrContentSource` 에 대응 분기가 없다. 새로 만들면 `content_source` 가 영구 NULL(HOLD) 인 행이 생긴다. 다만 **표시 축까지 지우면 과거 행 호환이 깨진다** — 생성과 표시를 분리 판단했다. | **수정함** — 백엔드 `VALID_QR_LANDING_TYPES` 에서 제거 + KCos 콘솔 생성 선택지(`StoreQrLandingType`·`LANDING_TYPE_CONFIG`)에서 제거. `LANDING_TYPE_TO_TARGET_KIND.promotion`(CONTENT)과 각 서비스 공개 랜딩 promotion 분기는 **유지** |
| D | update 의 slug·target 불변 | **INTENTIONAL_DIFFERENCE** | 채택 구현은 `slug`·`landingType`·`landingTargetId`·`libraryItemId` 를 의도적으로 변경 가능하게 두고 409 `SLUG_CONFLICT` 가드 + `contentSource` 재도출로 정합을 지킨다. KPA `QrSettingsModal`(`StoreQRPage.tsx:1214-1226`)이 slug 편집을 사용자에게 이미 노출하고 있다. 이를 막는 것은 빠진 안전장치 복구가 아니라 **사용자 기능 제거**다. | **코드 변경 없음** |

```text
PATCH_ONLY_ACTIVE_GAPS = 0   (A·C 수정 완료 / B·D 는 수정 대상 아님)
```

---

## 3. PharmacyHub Screen Set 공개 랜딩 결함

### 3-1. 실제 원인 (기존 서술 정정)

선행 CHECK 문서 `CHECK-O4O-STORE-QR-CANONICAL-TARGET-CONTENT-SOURCE-AND-KPA-PH-COMMONIZATION-V1-CHECK.md` §9 는
원인을 "publicLanding 이 응답에 screenSet payload 를 넣지 않는다" 로 적었다. **이 서술은 사실이 아니다.**

프로덕션 실측:

```text
GET /api/v1/pharmacy-hub/qr/public/a-2-2  → success:true  landingType:screen_set
                                             targetKind:SCREEN_SET  contentSource:TABLET_SCREEN_SET
                                             screenSet: sections 4 개 (44,075 bytes)
GET /api/v1/pharmacy-hub/qr/public/c-2    → 동일 구조 sections 4 개 (67,485 bytes)
GET /api/v1/pharmacy-hub/qr/public/f-2    → 동일 구조 sections 4 개 (16,666 bytes)
```

`PharmacyHubStoreQrController.publicLanding` 은 공통 `resolvePublicQrLanding` 에 전량 위임하고
`result.data` 를 그대로 반환한다. **백엔드는 이미 정상이었다.**
결함은 PharmacyHub 프론트가 `landingType === 'screen_set'` 분기를 갖지 않아
매장 셸의 "표시할 내용이 아직 준비되지 않았습니다" fallback 으로 떨어진 것 하나뿐이다.

> 위 선행 CHECK 문서는 기록물이므로 수정하지 않았다 (CLAUDE.md §16-1).
> 사실 정정은 본 문서에 남긴다.

### 3-2. 수정

`services/web-pharmacy-hub/src/pages/QrLandingPage.tsx` — 셸 렌더 이전 위임 분기 추가:

```tsx
if (landing.landingType === 'screen_set' && landing.screenSet) {
  return <PublicScreenSetViewer screenSet={landing.screenSet} />;
}
```

`services/web-pharmacy-hub/src/lib/api/pharmacyHubStoreQr.ts` — `PublicQrLanding` 에
백엔드가 이미 보내고 있던 `screenSet?: QrScreenSet | null` 타입을 명시.

빈 화면 fallback 이나 메시지 숨김은 사용하지 않았다. 실제 payload 를 canonical renderer 가 그린다.

---

## 4. Viewer 공통화

`PublicScreenSetViewer` 를 **`@o4o/tablet-kiosk-core` 로 승격**했다 (복사 아님 — `git mv`).

선택 이유:

| 후보 | 판정 |
|---|---|
| **`@o4o/tablet-kiosk-core`** | **채택.** 같은 section 을 태블릿 채널에서 그리는 `TabletKioskPage` 를 이미 보유 / 이 뷰어용으로 `QrImage` 를 이미 export / `@o4o/content-editor` peer 의존 보유 / **KPA·PharmacyHub 양쪽이 이미 의존하고 양쪽 Dockerfile 이 이미 COPY 한다** → package.json 0 변경, Dockerfile 0 변경 |
| `@o4o/screen-content-core` | 계약 전용 패키지(런타임 의존 없음) — 렌더러 부적합 |
| `@o4o/store-ui-core` | 매장 운영 UI 계층 — 공개 랜딩 렌더러의 계층이 아님 |
| 신규 패키지 생성 | 양 서비스 Dockerfile 선별 COPY 2줄 추가 필요 = 인프라 변경(중지 조건) |

이식 시 의존 추가 없이 처리한 항목:

- `lucide-react` 아이콘 1개 사용처 → 인라인 SVG `QrCodeIcon` 으로 대체
  (`@o4o/tablet-kiosk-core` 는 의도적으로 아이콘 의존이 없다. 추가하면 package.json 변경 = 중지 조건)
- KPA `styles/theme` 의 `colors` → 동일 hex 값의 모듈 지역 상수로 내재화
  (KPA Design System Alpha v1 과 hex 동일 → 렌더 결과 불변)

소비처:

```text
services/web-kpa-society/src/pages/qr/QrLandingPage.tsx          → @o4o/tablet-kiosk-core
services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx → @o4o/tablet-kiosk-core
services/web-pharmacy-hub/src/pages/QrLandingPage.tsx            → @o4o/tablet-kiosk-core
services/web-kpa-society/src/api/storeQr.ts                      → 중복 타입 선언 제거 후 재-export
```

Screen Set 편집기 · Tablet 운영 UI · Placement 로 범위를 넓히지 않았다.

---

## 5. 불변 조건 확인

| 항목 | 결과 |
|---|---|
| `type` 컬럼 DROP | 0 (spec §2 가 migration·entity 소스로 잠금) |
| 불명확 contentSource 재분류 | 0 (`contentSourceClassifySql` 미변경) |
| slug 변경 | 0 |
| organization_id 변경 | 0 |
| landing_target_id 변경 | 0 |
| is_active 변경 | 0 |
| scan history 훼손 | 0 |
| ProductMaster `/p/` 와 Store `/qr/` 통합 | 0 (spec §6 이 QR 서비스 내 `'/p/'` 리터럴 부재를 단언) |
| Placement 구현 | 0 (spec §6 이 `store_qr_placements` 부재를 단언) |
| 기존 23파일 canonical 구현 재설계 | 0 |

---

## 6. 로컬 검증

| 항목 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm run build:packages` | exit 0 |
| api-server `tsc --noEmit` | exit 0 |
| api-server 전체 Jest | (아래 6-1) |
| KPA type-check / build | exit 0 / exit 0 |
| PharmacyHub type-check / build | exit 0 / exit 0 |
| K-Cosmetics type-check / build | exit 0 / exit 0 |
| 신규 Store QR 계약 가드 | `store-qr-canonical-contract.spec.ts` 31 passed |
| 기존 계약 가드 회귀 | `kpa-tablet-generation-consolidation-contract.spec.ts` / `store-qr.service.test.ts` PASS |

### 6-1. 신규 계약 가드 구성

DB 없이 raw-source + 순수함수만으로 단언한다 (7절 31 test).

```text
§1 canonical 2축 무결성   VALID_QR_LANDING_TYPES ↔ QrTargetKind 전수 왕복
§2 type 잔재 컬럼         entity 보존 / migration DROP 0 / service read·write 0
§3 writer 경로            contentSourceClassifySql 에 PRODUCT_MASTER_LANDING 0
                          createStoreQrCode 가 body.contentSource 미수용 + resolve 호출
§4 promotion              생성 허용목록 부재 + 표시 축(CONTENT) 보존
§5 migration 불변축       UPDATE 의 SET 대상 = content_source 하나뿐 / DROP·RENAME·DELETE 0
§6 경계                   store_qr_placements 0 / QR 서비스에 '/p/' 0
§7 공용 뷰어              KPA 지역 import 잔재 0 / 양 서비스 screen_set 분기 존재
                          PH 의 screen_set 가드가 준비 메시지 fallback 보다 앞선다
```

---

## 7. 프로덕션 E2E

(본 절은 배포 후 실측으로 채운다)

---

## 8. 최종 판정

```text
ADOPTED_23_FILE_IMPLEMENTATION = PRESERVED
DISCARDED_PATCH_APPLIED        = 0
PATCH_ONLY_ACTIVE_GAPS         = 0
PH_SCREENSET_PAYLOAD           = PASS
PH_SCREENSET_PUBLIC_VIEW       = (E2E)
SHARED_SCREENSET_VIEWER        = PASS
KPA_SCREENSET_REGRESSION       = (E2E)
STORE_QR_OTHER_TYPES           = (E2E)
PRODUCTMASTER_QR_SEPARATION    = PASS
IMMUTABLE_AXIS_MUTATION        = 0
PLACEMENT_IMPLEMENTATION       = 0
CI                             = (배포 후)
PRODUCTION_E2E                 = (배포 후)
HEAD_EQUALS_ORIGIN_MAIN        = (push 후)
```
