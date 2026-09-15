# CHECK-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1

> **WO**: WO-O4O-STORE-TABLET-LOCATION-CONTENT-RUNTIME-MANAGEMENT-V1
> **작성일**: 2026-09-15 · **상태**: CLOSED
> **판정**: `STORE TABLET LOCATION/CONTENT RUNTIME MANAGEMENT: PASS` · `KPA REAL TABLET OPERABILITY: PASS`
> `TABLET_BROWSER_E2E = PASS` (Playwright 태블릿 뷰포트 · 프로덕션 · 19/19) · `PHYSICAL_DEVICE_SMOKE = PENDING_USER_VERIFICATION`

---

## 1. 결정 사항 (사용자 승인 B안)

| 축 | 정본 | 비고 |
|---|---|---|
| 위치 (Location) | `store_tablets` (기존 · rename 없음) | UI 표기 "위치". `location` 컬럼 = 매장이 정한 자유 형식 코드(`A-01`, `1층 카운터` …). 업종 의미 · 고정 분류 없음 |
| 위치 ↔ 콘텐츠 N:M | `store_tablet_corner_contents` (기존) | 위치에 연결된 콘텐츠 집합. `store_tablets.current_screen_set_id` = 그 위치의 "지금 나오는 화면" |
| 실제 태블릿 (Device) | **`store_tablet_devices` (신규)** | UI 표기 "실제 태블릿". `current_location_id` FK → `store_tablets` ON DELETE SET NULL. 이동 = 이 컬럼만 변경 |
| 콘텐츠 (Screen Set) | `store_tablet_screen_sets` + **`description TEXT NULL` (신규 컬럼)** | 전체 재설계 없음. `product_list` 계약 그대로 |

- **미도입**: `store_tablets.sort_order` · 새 Display 모델 · Channel 구조 · POS/WMS/재고 · 새 PIN/직원 계정/태블릿 전용 identity · WebSocket/SSE.
- **직원 인증** = 기존 로그인 세션 + 조직 멤버십 + **기기 토큰(`X-Tablet-Device-Token`)** 3중 조건. `withStoreAuth`(경영자 전용) 는 넓히지 않고, 별도 `withTabletRuntimeAuth` 로 좁은 runtime API 만 연다.

## 2. 커밋

| 커밋 | 내용 |
|---|---|
| `efc06b178` | API(device/pairing/runtime/duplicate/product-list) · kiosk-core `screenRefreshKey` · editor `cardFooterSlot` · KPA 화면(위치별 운영 · 콘텐츠 · `/tablet/setup` · 직원 메뉴 · 빠른 상품 수정) · jest 28 |
| `c1aeca061` | migration `1789435443554-CreateStoreTabletDevicesAndScreenSetDescription.ts` + incremental manifest 등록 (PRODUCTION-MIGRATION-STANDARD v2.0 · epoch13) |
| `c12f8c746` | CORS `allowedHeaders` 에 `X-Tablet-Device-Token` 추가 (프로덕션 브라우저 E2E 에서 preflight 차단 발견 → 수정) |
| (본 CHECK 커밋) | 본 문서 + `scripts/e2e/store-tablet-location-content-runtime.e2e.mjs` |

## 3. 변경 파일

**api-server**
- `src/routes/platform/store-tablet-device.routes.ts` (신규) — 경영자: `GET /tablet-devices` · `POST /tablets/:id/pairing-codes` · `PATCH /tablet-devices/:id` (이름 · `currentLocationId`) · `DELETE /tablet-devices/:id` (연결 해제 = `is_active=false` + 토큰 hash 폐기) · `GET|PUT /screen-sets/:id/product-list`. 직원 runtime(`withTabletRuntimeAuth`): `GET /tablet-runtime/device` · `GET /tablet-runtime/locations` · `GET /tablet-runtime/locations/:id/contents` · `POST /tablet-runtime/devices/:id/location` · `POST /tablet-runtime/devices/:id/content` · `GET|PUT /tablet-runtime/screen-sets/:id/product-list`. 공개(기기): `POST /stores/tablet-pairing/lookup` · `POST /stores/tablet-pairing/claim` · `POST /stores/:slug/tablet/device/heartbeat` (rate limit).
- `src/routes/platform/store-tablet-screen-set-ops.ts` (신규) — `duplicateScreenSet` · `normalizeProductList` · `applyScreenSetProductList` (pure + DB 헬퍼).
- `src/routes/platform/store-tablet.routes.ts` — `POST /screen-sets/:id/duplicate` · `PUT /screen-sets/:id` 에 `description` 허용 · 목록/상세에 `description` 노출 · device routes mount.
- `src/routes/platform/unified-store-public.routes.ts` — 공개 pairing/heartbeat mount.
- `src/bootstrap/setup-middlewares.ts` — CORS allowedHeaders.
- `src/database/migrations/1789435443554-CreateStoreTabletDevicesAndScreenSetDescription.ts` · `src/database/incremental/manifest.ts`.
- `src/__tests__/store-tablet-location-content-runtime.spec.ts` (신규 · 11 tests).

**packages (additive · 소비처 검증)**
- `tablet-kiosk-core/src/TabletKioskPage.tsx` — `screenRefreshKey` prop (heartbeat 버전 변경 시 화면 재조회). 기본값 없음 → 기존 소비처 무변경.
- `tablet-screen-set-editor/src/TabletCornerBoard.tsx` — `cardFooterSlot?: (t) => ReactNode` (카드 하단 슬롯). 기존 소비처(web-pharmacy-hub · store-ui-core) tsc 무영향 확인.

**web-kpa-society**
- `src/App.tsx` — `/tablet/setup` 라우트.
- `src/api/tablet.ts` · `src/api/tabletDisplays.ts` — pairing/heartbeat/device/runtime/duplicate/product-list 클라이언트 · 기기 토큰 브라우저 저장(`localStorage o4o.tablet.device`).
- `src/pages/tablet/TabletSetupPage.tsx` (신규) — 6자리 코드 → 매장 확인 → 기기 이름 → 연결.
- `src/pages/tablet/TabletStorePage.tsx` — 소비자 모드 기본 · heartbeat 10~30초 폴링(위치/현재 콘텐츠 version 변경 시 자동 갱신) · 우하단 "직원 메뉴" → 로그인(`returnTo`) → 직원 패널(위치 변경 · 콘텐츠 변경 · 상품 수정 · 이 브라우저 연결 해제) · 401 `DEVICE_NOT_CONNECTED` 시 기기 정보 삭제.
- `src/pages/tablet/TabletProductListQuickEditor.tsx` (신규) — 현재 표시 상품 추가/제거/순서 (PC · 직원 공용).
- `src/pages/pharmacy/StoreTabletDisplaysPage.tsx` — 탭 "위치별 운영" · 위치 카드에 연결 태블릿/접속 시각/[태블릿 연결] · 연결 기기 목록(위치 이동 select · 연결 해제) · 운영 안내 문구.
- `src/pages/pharmacy/TabletContentLibraryList.tsx` — 행 메뉴 "상품 빠른 수정" · "이름 · 설명 변경" · "복제" · 코너→위치 표기.

## 4. 검증

### 4-1. 정적 · 단위
| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | PASS (exit 0) |
| jest `store-tablet-location-content-runtime.spec.ts` + `pharmacy-hub-tablet-canonical-adoption.spec.ts` | 2 suites / 28 tests PASS |
| web-kpa-society `vite build` | PASS (26.7s) · tsc 필터 clean |
| web-pharmacy-hub · store-ui-core (TabletCornerBoard 소비처) tsc | PASS |
| `node scripts/db/check-migration-contract.mjs` | 16 pass / 0 fail |

jest 가 고정하는 계약: lookup 무효 404 `PAIRING_CODE_INVALID` · claim 후 서버는 sha256 hash 만 보관 · heartbeat 토큰 불일치 401 · runtime 게이트(미로그인 401 · 토큰 없음 400 · 무관 사용자 403 · manager 200) · **manager 는 `withStoreAuth` 경영자 API 403** · 위치 이동은 `current_location_id` 만 변경 · 다른 기기 토큰으로 403 · draft 콘텐츠 전환 409 `SCREEN_SET_NOT_ACTIVE` · active 전환 시 연결 보장 + current 원자 변경 · 빠른 상품 수정은 매장 밖 상품 400 · 복제는 새 draft + blocks 복사, 연결/current 미복사.

### 4-2. 프로덕션 배포
- `c1aeca061` Deploy API Server 성공 — migration job `o4o-api-migrations-qrvn7` "Migrations completed successfully". `c12f8c746` Deploy API Server 성공. Deploy Web Services 성공.
- 프로덕션 확인: `POST /api/v1/stores/tablet-pairing/lookup {"code":"000000"}` → 404 `PAIRING_CODE_INVALID` · OPTIONS preflight `access-control-allow-headers` 에 `X-Tablet-Device-Token` 포함(204).
- CI Pipeline 은 뒤이은 다른 세션 push(`e393c2f52`) 의 concurrency 로 취소됨(본 변경의 실패 아님). `c12f8c746` CI Pipeline · CodeQL 은 통과.

### 4-3. 실 태블릿 시나리오 (§23) — Playwright 태블릿 뷰포트 · 프로덕션
스크립트: [`scripts/e2e/store-tablet-location-content-runtime.e2e.mjs`](../../scripts/e2e/store-tablet-location-content-runtime.e2e.mjs) (`KPA_EMAIL` / `KPA_PASS` / `OUT_DIR` 환경변수 · 자격증명 미포함). PC 컨텍스트 1440×900 + 태블릿 컨텍스트 1280×800(hasTouch · 별도 브라우저 프로필) · `https://kpa-society.co.kr` · 테스트 약국(`docs/local/TEST-ACCOUNTS.local.md` 약국 경영자).

| # | 단계 | 결과 |
|---|---|---|
| 1 | PC 경영자 로그인 → 태블릿 관리(위치별 운영) | PASS |
| 2 | 위치 2개 확보 `E2E-A-01` · `E2E-A-02` (자유 형식 코드) | PASS |
| 3 | 위치 카드 [태블릿 연결] → 6자리 코드 발급 · `/tablet/setup` 안내 | PASS |
| 4 | 태블릿 `/tablet/setup` → 코드 → 매장 확인 → 이름 → 연결 → `/tablet/:slug` | PASS |
| 5 | 소비자 화면 · 기기 토큰 브라우저 저장 · heartbeat 200 | PASS |
| 6 | 사용된 코드 재사용 → 404 | PASS |
| 7 | PC 위치 카드에 "연결된 태블릿 1대 · E2E 태블릿 · 방금 접속" + 연결 기기 목록 | PASS |
| 8 | 콘텐츠 행 메뉴에 복제 / 상품 빠른 수정 / 이름 · 설명 변경 노출 | PASS |
| 9 | 복제 → "(복사)" 새 항목 | PASS |
| 10 | 이름 · 설명 변경 저장 → 목록 반영 | PASS |
| 11 | PC 상품 빠른 수정(풀에서 1개 추가) 저장 | PASS |
| 11b | PC 에서 `E2E-A-02` 에 콘텐츠 2개 적용(연결) | PASS |
| 12 | 태블릿 직원 메뉴 → 기존 로그인 → 직원 화면(기기 · 현재 위치 `E2E-A-01`) | PASS |
| 13 | 직원 위치 변경 → `E2E-A-02` (`POST /tablet-runtime/devices/:id/location` 200) | PASS |
| 14 | 직원 콘텐츠 변경(연결된 후보 2 중 선택 · 200) | PASS |
| 15 | 직원 상품 수정 모달 열림 | PASS |
| 16 | 소비자 화면 복귀 · heartbeat 계속 | PASS |
| 17 | PC 기기 목록에 직원 이동 결과 반영 → PC 에서 `E2E-A-01` 로 이동 → 태블릿 heartbeat 계속 200 | PASS |
| 18 | PC 연결 해제 → 태블릿 heartbeat 401 → 기기 정보 삭제 · 직원 메뉴 버튼 사라짐 | PASS |

**RESULT: 19/19 PASS.** 스크린샷(`e2e-03/05/07/09/12/14-*.png`)은 로컬 세션 산출물(저장소 미포함).

E2E 가 잡아낸 결함 1건: 기기 토큰 헤더가 CORS `allowedHeaders` 에 없어 브라우저에서 heartbeat · 직원 runtime API 가 preflight 에서 차단됨(jest/supertest 는 CORS 를 지나지 않아 미검출) → `c12f8c746` 수정 후 재검증.

### 4-4. 미검증 · 보류
- **실제 물리 태블릿(안드로이드/아이패드 Chrome) smoke** — 수행하지 않음. `PHYSICAL_DEVICE_SMOKE = PENDING_USER_VERIFICATION`. 사용자 확인 절차: 매장 PC 위치 카드 [태블릿 연결] → 태블릿 Chrome 에서 `https://kpa-society.co.kr/tablet/setup` → 코드 입력 → 화면 표시 → PC 에서 화면 바꾸기 → 30초 안에 태블릿 반영 확인.
- 직원(manager) 역할 실계정 브라우저 smoke 없음(테스트 약국에 manager 계정 없음). manager 200 / 경영자 API 403 은 jest 로 고정.
- 다국어 태블릿 UI · 오프라인 동작은 범위 외.

## 5. 잔여 · 유의
- 테스트 약국에 E2E 산출 데이터가 남음: 위치 `E2E-A-01` · `E2E-A-02`, 콘텐츠 "(복사)" · "E2E 복제 콘텐츠" 여러 건, `E2E-A-02` 의 연결 콘텐츠. 운영 매장이 아니므로 유지(정리 시 PC 화면에서 보관/삭제).
- 승인 범위 대비 편차: `store_tablet_devices` 에 `pairing_code VARCHAR(6)` · `pairing_expires_at` 2컬럼 추가(Cloud Run 다중 인스턴스에서 코드 발급/사용 인스턴스가 달라 메모리 보관 불가 → DB 보관). additive · 연결 완료 시 NULL.
- migration 은 작업 중 개정된 PRODUCTION-MIGRATION-STANDARD v2.0(epoch13 파일명 · incremental manifest) 에 맞춰 이름 변경 후 등록.
- 직원 패널은 heartbeat 마다 `GET /tablet-runtime/device` 를 재조회한다(10~30초 · 패널 열려 있는 동안만). 부하 무시 가능 수준이나 후속 정리 후보.
- `apps/api-server/src/server.ts` 의 별도 CORS 설정은 `main.ts` 가 사용하지 않는 레거시 진입점이라 미수정.

## 6. 금지 사항 준수 (§25)
위치=업종 하드코딩 없음 · 고정 분류 없음 · 영구 1:1 없음(위치↔Set N:M 유지 · 태블릿↔위치 이동 가능 · 태블릿↔Set 직접 연결 없음) · 새 Display 모델 없음 · Screen Set 재설계 없음 · Channel 재도입 없음 · POS/WMS/재고 확장 없음.

---
*문서 정합: 해당 없음*
