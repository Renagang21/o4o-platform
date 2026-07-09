# WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1

Status: 설계(Design WO) — 구현 착수 전 아키텍처 확정. **DB write 0 · migration 0 · deploy 0** (설계 문서).
Date: 2026-07-09
축(사업자 확정): **`Product → Content → QR → Product Landing`**
선행 조사: `IR-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1`
관련 baseline: F12 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1` (본 WO 에서 **최소 개정 제안**)

> 목적: 모든 ProductMaster 에 **O4O 고유 대표 QR 1개 → 제품 Landing** 을 성립시키는 정식 구조를 확정한다. 설명서가 없어도 Landing 은 성립하며("상세 설명 준비 중"), 설명·공급자·매장·관련 콘텐츠를 담는 **확장 가능한 화면**으로 설계한다. 본 WO 는 **설계만** — 실제 데이터/QR 생성은 후속 apply WO(승인·dry-run·batchId rollback)에서.

---

## 0. 판단 요약 (why this design)

- **제품 단위 안정 공개키를 처음부터 도입** → QR 재발급/링크 깨짐 영구 방지("제대로"의 핵심).
- **F12 최소 개정**: Resource permalink `/r/{id}`(설명 단위) 옆에 **제품 Landing permalink `/p/{key}`**(제품 단위) 추가. **QR 이미지는 계속 비저장·동적생성(F12 #4 유지)** — 저장하는 것은 QR 이미지가 아니라 제품 Landing 신원(public_key) 뿐. F12 #6(ProductMaster 무FK)도 유지(ProductLanding→Master 단방향).
- **stub 설명서 대량 생성 불필요**: Landing 이 콘텐츠 없을 때 "준비 중"을 자체 렌더. "설명 없음" 추적은 기존 설명 상태(final_status='none')·설명 Queue 가 담당 → 177k stub 행 미생성(옵션으로 남김).
- **의약품 안전**: Landing 자체는 콘텐츠 컨테이너. 의료 내용(효능·용법)은 **기존 grounding 규칙**대로 채운다. 자동 생성 금지 유지. Landing 노출 게이트(행정처분/회수) 필수.

---

## 1. 데이터 모델 (신규 — 후속 구현 WO 에서 migration)

### 1.1 `product_landings` (제품 단위 Landing, master 1:1)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid PK | 내부 |
| `product_master_id` | uuid NOT NULL, **UNIQUE** | FK → product_masters. **Landing→Master 단방향**(F12 #6 유지, master 무변경) |
| `public_key` | varchar UNIQUE NOT NULL | opaque(nanoid 등). **공개 URL 식별자**. 내부 id·barcode 비노출 |
| `status` | varchar(20) NOT NULL DEFAULT `'active'` | active / hidden(노출게이트) / archived |
| `exposure_state` | varchar(24) NOT NULL DEFAULT `'ok'` | ok / restricted(행정처분·회수) / pending_review |
| `content_config` | jsonb NULL | Landing 블록 구성/순서(초기 null=기본 구성) |
| `metadata` | jsonb NULL | batchId·source 등 |
| `created_at`/`updated_at`/`deleted_at` | timestamptz | soft delete |

- **불변식**: master 당 Landing 1개(UNIQUE product_master_id). QR 도 제품당 1개(Landing 과 1:1).
- ProductMaster 는 Landing 을 **모른다**(FK 신설 안 함). 방향 = Landing → Master.

### 1.2 QR

- **QR 이미지 비저장**(F12 #4). QR = `neture.co.kr/p/{public_key}` 의 동적 인코딩(런타임 생성, `qr-print.service.ts` 계열 재사용).
- 저장하는 것은 `product_landings.public_key`(제품 Landing 신원) 뿐.

### 1.3 (옵션) stub 설명서 — 기본은 미채택

- 기본 설계는 stub SPD 미생성(Landing 이 "준비 중" 자체 렌더). 
- 만약 "모든 제품이 설명 트래킹에 stub 로 뜨는" 것을 원하면: SPD 에 `status='placeholder'`(신규 app 값·migration 불필요)·`source_type='stub'`·**의료 내용 0**(제품명/제조사/바코드 + "준비 중") 행 1개. 그러나 **권장은 미채택**(중복·오염 회피, 기존 final_status='none' 로 추적).

---

## 2. 공개 URL / 라우트

- **제품 Landing**: `GET neture.co.kr/p/{public_key}` (공개·무인증). 기존 매장 QR `/qr/{slug}`(계층2)·Resource `/r/{id}`(설명 단위)와 **다른 제품 단위 경로**.
- 조회: `public_key` 로 Landing 조회 → `exposure_state` 확인 → 콘텐츠 블록 resolve → 렌더. `hidden`/`restricted` 는 노출 차단 화면.
- 백엔드 라우트/랜딩 렌더는 후속 구현 WO. (도메인 = neture.co.kr — 제품 전역 자산이므로 매장 도메인 아님.)

## 3. Landing 콘텐츠 구성 (확장 가능)

Landing 은 렌더 시 아래 블록을 **동적 resolve**(초기), 이후 `content_config` 로 순서/노출 제어:

| 블록 | 출처(기존 저장소 재사용) |
|---|---|
| 제품 기본정보 | product_masters (이름·제조·규격·바코드·이미지) |
| 제품 설명 | shared_product_descriptions (canonical) — 없으면 "상세 설명 준비 중" |
| 공급자 콘텐츠 | supplier_product_offers / 공급자 제공 콘텐츠 |
| 매장 콘텐츠 | (매장 경유 진입 시) store 다국어/실행 자산 |
| 관련 콘텐츠 | 영상·POP·블로그·이벤트 등(Resource Type 확장) |
| 관련 제품 | 동일 성분/그룹 등 |
| 다국어 | 언어탭(B-1: 대표 QR 1개 + 랜딩 언어탭) |

- **설명서 = 여러 블록 중 하나**. 설명 없어도 Landing 성립.
- 초기 구현은 "기본정보 + (있으면)설명 + 준비중 placeholder + 언어탭" 최소 구성부터.

## 4. F12 개정 제안 (최소)

F12 는 절대 기준이 아니며 사업 방향에 맞춰 개정 가능(§거버넌스). 본 WO 가 제안하는 **최소 개정**:

1. **Freeze #3 확장**: permalink 에 **제품 단위 `/p/{key}`** 추가(설명 단위 `/r/{id}` 는 유지). 제품 Landing 은 제품 단위 안정 공개키를 갖는다.
2. **Freeze #4 유지·명확화**: "QR 이미지 비저장·동적생성"은 그대로. 저장은 Landing 신원(public_key)이지 QR 이미지가 아님.
3. **Freeze #6 유지**: ProductMaster 무FK. ProductLanding → Master 단방향.
- 개정은 별도 `WO-O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2`(baseline 개정) 로 확정 후 구현 착수.

## 5. 롤아웃 단계 (후속 WO)

| Phase | WO | 성격 |
|---|---|---|
| 1 | **본 WO (설계)** + F12 개정 WO | 구조·URL·콘텐츠·F12 개정 확정. write 0 |
| 2 | `WO-O4O-PRODUCT-LANDING-SCHEMA-APPLY-V1` | product_landings 테이블 migration + 렌더 라우트(`/p/{key}`) 최소 구현 |
| 3 | `WO-O4O-PRODUCTMASTER-LANDING-QR-BULK-APPLY-V1` | 전 ProductMaster 에 Landing(public_key) 발급 → 대표 QR 동적 성립. dry-run→승인→batchId |
| 4 | `WO-O4O-PRODUCTMASTER-LANDING-ON-CREATE-V1` | 신규 master 생성 시 Landing/QR 자동 |
| 5 | `WO-O4O-PRODUCT-LANDING-CONTENT-COMPOSITION-V1` | 블록 구성/노출(content_config)·공급자·매장·관련 |
| 6 | `WO-O4O-PRODUCT-MFDS-ADMIN-DISPOSITION-CHECK-PIPELINE-V1` | 행정처분/회수 → exposure_state 게이트 |
| — | (설명 채움) | 기존 설명 Dashboard/Queue 트랙이 담당(별개) |

## 6. 안전 / 불변식

- 실제 Landing/QR/설명 생성은 **후속 apply WO + 승인 + dry-run + batchId rollback**.
- **의약품 의료 내용 자동 생성 금지** 유지. stub/placeholder 는 의료 내용 0(중립).
- Landing 노출은 `exposure_state` 게이트 통과 시에만(행정처분/회수 확인 불가를 "문제 없음"으로 단정 금지).
- ProductMaster 무변경(Landing→Master 단방향). barcode/identifier/SPD 무변경.
- master 당 Landing 1 / QR 1 (UNIQUE).

## 7. 완료 기준 (본 설계 WO)

- 제품 단위 Landing 데이터 모델·공개 URL(`/p/{key}`)·콘텐츠 블록 구성·F12 최소 개정안·롤아웃 단계 확정.
- 실제 구현/생성 없음. DB write 0 · migration 0 · deploy 0.
- 다음 착수 = F12 개정 WO → Phase 2 스키마 apply.

## 8. 현황 참고 (dry-run 실측 2026-07-09)

- ProductMaster 198,389 = **전부 QR/Landing 대상**. 설명 보유 17,877(9%)·부재 177,297(콘텐츠 채움 대상, QR 대상 배제 아님). store_qr_codes 27 전부 매장 스코프(전역 저장소 아님). dry-run=`apps/api-server/src/scripts/productmaster-global-qr-dryrun.ts`(read-only).
