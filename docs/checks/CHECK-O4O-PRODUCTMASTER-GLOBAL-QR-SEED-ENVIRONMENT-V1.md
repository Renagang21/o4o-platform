# CHECK-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1

Status: DONE (조사) — 문서 + read-only dry-run. **DB write 0 · 실제 QR 생성 0 · migration 0 · deploy 0** (2026-07-09). **아키텍처 결론 미확정** — 최종 방향은 Product Landing 설계 WO.
WO: `WO-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1`
사업 방향(확정): **`Product → Content → QR → Product Landing`** (QR→확장 가능한 Product Landing). F12 는 현행 baseline이며 이 방향에 따라 **개정 가능**.

Scope: 모든 ProductMaster 에 O4O 고유 QR 을 부여하기 위한 **사전 환경**(정책·현황·dry-run·runbook·rollback 기준). 실제 전체 QR 일괄 생성은 하지 않음 — 별도 채팅방/별도 apply WO.

---

## 1. 조사한 QR 구조 (요약)

- QR 테이블 = **`store_qr_codes`** (엔티티 `routes/platform/entities/store-qr-code.entity.ts`). **매장 스코프**(organization_id NOT NULL, FK CASCADE) · 계층 2 Display Domain. slug UNIQUE(유일 공개식별자, publicKey/code 없음). soft delete=is_active(deleted_at 없음). created_by/source/batch/metadata 없음.
- landingType(app union) = `product | promotion | page | link | video`. **master/resource/product_description 타깃 타입 없음.**
- 공개 라우트 = `GET /{service}/qr/public/:slug`(무인증, slug 조회). 도메인 = 매장별 캐노니컬 도메인(**neture.co.kr 아님**). **`/r/{id}` Resource permalink 라우트 미구현.**
- slug 생성 = 클라이언트 제출 필수(랜덤 생성기 없음, 충돌 409). 유니크 index.
- 생성 = `POST /pharmacy/qr` 인라인(매장 스코프) + **copy-on-import 불변식**(매장 QR=매장 사본 참조).
- **ProductMaster→QR 경로 전무.** QR 은 offer/listing/content 만 타깃.
- ProductMaster: status/active·deleted_at 컬럼 없음. ProductIdentifier: identifier_type 확장 union(QR_CODE 삽입 가능하나 F12 충돌).

## 2. 조사한 테이블/API/라우트

`store_qr_codes`·`store_qr_scan_events`·`product_masters`·`product_identifiers`·`shared_product_descriptions` / `GET /{service}/qr/public/:slug`·`POST /pharmacy/qr` / F12 baseline 문서 (§상세는 IR §2).

## 3. ProductMaster QR 정책 (사업자 확정 — Product Landing 중심)

축 = **`Product → Content → QR → Product Landing`**.
- **ProductMaster 1개 = O4O 대표 QR 1개** (언어별 다중 QR 아님, 랜딩 언어탭). — 유지.
- **QR → Product Landing** 으로 연결(단일 Resource/설명 아님).
- **Product Landing = 확장 가능한 화면**: 제품 설명 / 제품 콘텐츠 / 공급자 콘텐츠 / 운영자·매장 콘텐츠 / 관련 콘텐츠 / 관련 제품. 설명서는 그중 하나.
- **모든 ProductMaster 가 QR/Landing 대상** — 설명 없어도 다른 콘텐츠로 Landing 구성 가능.
- 저장/URL 방식은 **Product Landing 설계 WO 로 이관**(제품 단위 대표 QR·Landing 저장 유력 → 채택 시 F12 개정 병행).

**폐기된 결론(채택 안 함)**: "QR=Resource" / "설명서 없으면 QR 없음" / "`/r/{resourceId}` 가 최종 구조".

## 4. QR URL/slug/publicKey 후보 → 결정

- 후보: `neture.co.kr/qr/{slug}` / `/qr/public/{slug}` / `/p/{publicKey}` / **`/r/{resourceId}`**.
- **결정 권고 = `/r/{resourceId}`** (F12 정합, 계층 1). 내부 UUID 비노출은 F12 §3 opaque alias 발급으로 처리.
- **계층 조화**: `/qr/{slug}` 는 **계층 2 매장 QR**(구현·org 스코프), `/r/{id}` 는 **계층 1 Resource**(F12·미구현·전역). 전역 ProductMaster QR = 계층 1 → `/r/{id}`. 양 트랙 공통 = **QR 비저장**. 기존 4축 트랙(`/qr/{slug}`, B-1 1QR+언어탭)과 모순 아님(계층 상이). org 다국어 저장소 `store_multilingual_product_content_groups`(public_key)는 매장 소유라 전역 대상 불가. (IR §5.1)

## 5. QR 보유/미보유 현황 (prod read-only 2026-07-09, dry-run 실측)

| 항목 | 값 |
| --- | --- |
| 전체 ProductMaster (= **QR/Landing 대상 전부**) | **198,389** (rx 119,548 / otc 57,572 / 의약외품 17,148 / 의료기기 3,826 / 기타 295) |
| 설명서(canonical SPD) 보유 = Landing 에 실을 설명 有 | **17,877 (9.01%)** |
| 임의 설명 보유 | 21,092 |
| 설명 부재(= Landing 설명 콘텐츠 아직 없음, QR 대상은 유지) | **177,297 (≈89%)** |
| store_qr_codes | 27 (page16/link10/video1, active 10), null org **0**, master 타깃 **0**, slug 중복 **0** |
| QR identifier(QR_CODE/O4O_QR) | **0** |

## 6. dry-run 결과

- 스크립트: `apps/api-server/src/scripts/productmaster-global-qr-dryrun.ts` (**write 0**, SELECT only, `--out` JSON).
- 실행 검증 완료(cloud-sql-proxy + `npx tsx`). writeCount=0. QR/Landing 대상 = 전체 198,389. 설명 보유 17,877 / 설명 부재 177,297(대상은 유지·콘텐츠 채움 문제). 중복 slug 0 · master당 QR 중복 0 · master 직접 타깃 QR 0 · QR identifier 0.

## 7. 권장 방향 (Product Landing 중심)

- QR → **Product Landing**(확장 가능 화면). 제품 대표 QR 1개 유지.
- 저장/URL 은 **Product Landing 설계 WO 로 이관** — 제품 단위 대표 QR·Landing 저장(§4 B 계열)이 유력하며 채택 시 **F12 개정 병행**.
- store_qr_codes 재사용(A) 기각(매장 스코프). "QR=Resource(`/r/{id}`)" 는 **채택 안 함**(Landing 이 담을 콘텐츠 중 설명 하나에만 대응).

## 8. 실제 QR 생성 없음 / 변경 없음

| 항목 | 값 |
| --- | --- |
| 실제 QR 생성 | **0** |
| DB write | **0** (dry-run SELECT only) |
| migration | **0** |
| deploy | **0** |
| ProductMaster/ProductIdentifier/SPD 변경 | **0** |
| 신규 QR 테이블/컬럼 | **0** (미생성) |

## 9. 산출물

- IR: `docs/investigations/IR-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1.md`
- Runbook: `docs/work-orders/WO-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-RUNBOOK-V1.md`
- dry-run: `apps/api-server/src/scripts/productmaster-global-qr-dryrun.ts`
- CHECK: 본 문서
- 신규 제품 QR 동시 등록 메모 / QR 없는 제품 보정 메모: IR §10·§11

## 10. 후속 WO (Product Landing 중심)

**`WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1`**(핵심 선행 — Landing 데이터·URL·구성 콘텐츠·F12 개정 판단) → `WO-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-V1` → `-QR-ON-CREATE-V1` → `WO-O4O-PRODUCT-LANDING-CONTENT-COMPOSITION-V1` → `-QR-PUBLIC-LANDING-V1` → `WO-O4O-PRODUCT-MFDS-ADMIN-DISPOSITION-CHECK-PIPELINE-V1`.

---

## 11. 핵심 결론 (사업자 확정 반영)

- 축 = **`Product → Content → QR → Product Landing`**. QR 은 제품 대표 QR 1개 → **Product Landing**.
- Product Landing 은 설명서에 한정되지 않는 **확장 가능한 화면**(설명/공급자/운영자/매장/관련 콘텐츠·관련 제품). 설명서는 그중 하나.
- **모든 ProductMaster 가 QR/Landing 대상** — "설명 없으면 QR 없음"은 폐기. 설명 부재 89% 는 **Landing 콘텐츠 채움 문제**.
- 저장/URL·F12 개정 여부는 **Product Landing 설계 WO** 에서 결정. F12 는 절대 기준이 아니며 사업 방향에 맞춰 개정 가능.
- 본 IR 의 기술 조사(구조·현황·dry-run·중복 검증)는 유효. 아키텍처 결론은 확정하지 않음.
