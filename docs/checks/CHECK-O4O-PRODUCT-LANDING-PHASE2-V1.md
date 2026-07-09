# CHECK-O4O-PRODUCT-LANDING-PHASE2-V1

Status: DONE — Phase 2 백엔드(테이블 + 공개 API + 단건 발급) 구현·배포·프로덕션 smoke PASS (2026-07-09)
WO: `WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1` / Phase 2
Baseline: `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT` (F12 최소 개정)

Scope: 제품 대표 QR → **Product Landing** 의 데이터/공개 API 기반 구축. `product_landings` 테이블 + `neture.co.kr/p/{public_key}` 공개 read + admin 단건 idempotent 발급. **전 제품 대량 발급 아님**(후속 apply WO). 프론트 `/p/{key}` 페이지는 다음 증분.

---

## 1. F12 개정 (V2 amendment)

`docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT.md`:
- **#3 확장**: Resource permalink `/r/{id}` + **제품 Landing permalink `/p/{key}`**.
- **#4 유지·명확화**: QR 이미지 비저장·동적생성. 저장은 Landing 신원(public_key)이지 QR 이미지 아님.
- **#6 유지**: ProductMaster 무FK(Landing→Master 단방향).
- **#7 신규**: master 당 Landing 1개·대표 QR 1개(UNIQUE).
- 파생: **모든 ProductMaster 가 대상**(설명 없으면 "준비 중" 렌더). "설명 없으면 QR 없음" 폐기.

## 2. 구현

| 파일 | 내용 |
| --- | --- |
| `migrations/20261225000000-CreateProductLandings.ts` | `product_landings`(id, product_master_id, public_key, status, exposure_state, content_config, metadata, timestamps, deleted_at) + partial unique(master 활성 1개)·unique(public_key)·status index. **빈 테이블만** |
| `services/product-landing.service.ts` | `mintForMaster`(단건 idempotent, crypto opaque key 12자, 충돌 재시도) · `getPublicLanding`(제품정보+canonical 설명, 없으면 placeholder, 노출 게이트) · `getByMaster` |
| `controllers/product-landing.controller.ts` | public `GET /api/v1/public/product-landings/:publicKey`(무인증) + admin `POST /admin/o4o-product-db/product-landings`{masterId}·`GET .../by-master/:masterId`(ADMIN 롤셋) |
| `bootstrap/register-routes.ts` | public/admin 라우터 등록 |

- **QR 이미지 비저장**: QR = `neture.co.kr/p/{public_key}` 동적 인코딩(저장 안 함).
- **ProductMaster 무변경**: Landing→Master 단방향. barcode/identifier/SPD 무변경.
- **대량 발급 없음**: mint 는 단건 idempotent. 전 제품 발급은 Phase 3(dry-run·승인·batchId).

## 3. 검증

| 항목 | 결과 |
| --- | --- |
| api-server build typecheck | **에러 0** |
| 배포 (Cloud Run + migration) | **success** (commit 690dd2963) |
| product_landings 테이블 | 생성 확인(10컬럼 + 4인덱스) |

### 프로덕션 smoke PASS (api.neture.co.kr, 2026-07-09)

| 케이스 | 결과 |
| --- | --- |
| admin mint (젤-씨과립, DRUG otc) | created=true, publicKey=`8zip5i6y4caj` ✅ |
| 재발급(idempotent) | created=**false**, 동일 publicKey, **DB row 1개**(중복 없음) ✅ |
| mint 없는 master | **404** MASTER_NOT_FOUND ✅ |
| admin by-master | landing 반환(status active) ✅ |
| **공개 read (설명 無)** | 200 JSON · 제품정보(젤-씨과립/제조/바코드/규제/규격) · hasCanonical=false · **placeholder "상세 설명을 준비 중입니다."** · languages ["ko"] ✅ |
| **공개 read (설명 有, 본프로탑정)** | hasCanonical=true · descriptionType=STORE · content 781자 · placeholder=null ✅ |
| 공개 read 없는 key | **404** LANDING_NOT_FOUND ✅ |
| 노출 게이트 | status/exposure_state 기본 active/ok → blocked=false. (restricted 시 콘텐츠 미포함) |

smoke 발급 landing 2건(젤-씨과립·본프로탑정)은 실제 유효 데이터(정상 end-state). 대량 write 아님.

## 4. 안전

- DB write = **migration(빈 테이블) + smoke mint 2건**(단건 idempotent 기능 동작). 대량 발급·실제 QR 이미지 저장·ProductMaster 변경 **없음**.
- 의약품 의료 내용 자동 생성 **없음**(Landing 은 컨테이너, placeholder 는 중립 문구).
- 노출 게이트(exposure_state) 존재 — 행정처분/회수 연동은 Phase 6.

## 5. Phase 2b — 프론트 `/p/{key}` 공개 페이지 (DONE, smoke PASS)

- `services/web-neture/src/pages/ProductLandingPage.tsx` + route `/p/:publicKey`. 공개 API 호출, 제품 기본정보 + 설명(canonical HTML) / 없으면 "상세 설명을 준비 중입니다." placeholder + 노출 게이트(blocked) 안내. 무인증.
- 배포: web-services `52d017274` success.
- **프로덕션 smoke PASS** (neture.co.kr):
  - `/p/43hjycpdhkb7`(본프로탑정, 설명 有) → 제품정보(의약품·규격·바코드) + canonical 설명 전체(효능·복용·주의·성분기준) 렌더 ✅
  - `/p/8zip5i6y4caj`(젤-씨과립, 설명 無) → 제품정보 + "상세 설명을 준비 중입니다." placeholder ✅
  - (앱 전역 `/auth/me` 401 은 페이지와 무관)

## 6. Phase 3 — 전 제품 일괄 발급 (DONE, 사용자 승인 후 실행 · 2026-07-09)

- 스크립트: `apps/api-server/src/scripts/productmaster-landing-bulk-apply.ts` (build 제외). dry-run 기본·`--apply --batch-id` 게이트·batch INSERT·재개 가능·public_key 충돌 재시도·metadata.batchId.
- 실행: canary `--limit 1000` 검증(무결성 PASS) → 전량 `--apply --batch-id landing-seed-20260709 --batch-size 1000`.
- **결과**: createdThisRun 197,387(+canary 1,000) · **totalLandingsNow 198,389 = totalMasters 198,389 → 100% 커버리지**.

### 최종 무결성 (prod read-only)

| 항목 | 값 |
| --- | --- |
| 전체 Landing (active) | **198,389** |
| distinct public_key / distinct master | 198,389 / 198,389 (완전 1:1) |
| master 당 Landing 중복 | **0** |
| public_key 중복 | **0** |
| **Landing 없는 master** | **0** (전 제품 커버) |
| batchId=landing-seed-20260709 | 198,387 (+ smoke 수동 2 = 198,389) |
| 공개 read 검증 | 7mqxhjkz944f(슬리세틴캡슐) → 200, placeholder ✅ |

- **rollback**: `UPDATE product_landings SET deleted_at=now() WHERE metadata->>'batchId'='landing-seed-20260709' AND deleted_at IS NULL` (기존 데이터·ProductMaster 무영향).
- QR 이미지 저장 0 · ProductMaster 변경 0 · 설명 자동생성 0. 모든 제품 = `neture.co.kr/p/{public_key}` 대표 QR/Landing 성립.

## 7. 다음

- **Phase 4** on-create(신규 master 생성 시 Landing 자동 발급) · **Phase 5** Landing 콘텐츠 구성(공급자·매장·관련 블록·content_config) · **Phase 6** 노출 게이트(행정처분/회수 → exposure_state).
- **QR 이미지/인쇄**: `/p/{key}` URL 을 QR 로 동적 생성(기존 qr-print 계열 재사용) — 운영 화면 연결은 후속.
- 설명 채움 = 기존 설명 Dashboard/Queue 트랙(별개, 89% placeholder 를 실제 설명으로).
