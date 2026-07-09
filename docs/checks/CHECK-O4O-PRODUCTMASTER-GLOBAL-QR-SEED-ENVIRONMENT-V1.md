# CHECK-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1

Status: DONE — 조사·환경 구축(문서 + read-only dry-run). **DB write 0 · 실제 QR 생성 0 · migration 0 · deploy 0** (2026-07-09)
WO: `WO-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1`
상위 baseline: **F12 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1` (Frozen)**

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

## 3. ProductMaster QR 정책 (권장)

- **ProductMaster 1개 = O4O 대표 QR 1개** (언어별 다중 QR 아님, 랜딩 언어탭).
- **QR URL = `neture.co.kr/r/{resourceId}`** (F12 #3). `/qr/{slug}` 신설 금지(이중 아이덴티티).
- **QR 비저장·동적생성**(F12 #4) — Resource permalink 을 QR 로 런타임 인코딩. 저장 QR row 0.
- ProductMaster 무FK(F12 #6) — 방향은 Resource→ProductMaster.

## 4. QR URL/slug/publicKey 후보 → 결정

- 후보: `neture.co.kr/qr/{slug}` / `/qr/public/{slug}` / `/p/{publicKey}` / **`/r/{resourceId}`**.
- **결정 권고 = `/r/{resourceId}`** (F12 정합). 내부 UUID 비노출은 F12 §3 opaque alias 발급으로 처리.

## 5. QR 보유/미보유 현황 (prod read-only 2026-07-09, dry-run 실측)

| 항목 | 값 |
| --- | --- |
| 전체 ProductMaster | **198,389** (rx 119,548 / otc 57,572 / 의약외품 17,148 / 의료기기 3,826 / 기타 295) |
| canonical Resource 보유(모델 D 대상) | **17,877 (9.01%)** |
| 임의 Resource 보유 | 21,092 |
| **Resource 부재(QR 대상 없음 gap)** | **177,297 (≈89%)** |
| store_qr_codes | 27 (page16/link10/video1, active 10), null org **0**, master 타깃 **0**, slug 중복 **0** |
| QR identifier(QR_CODE/O4O_QR) | **0** |

## 6. dry-run 결과

- 스크립트: `apps/api-server/src/scripts/productmaster-global-qr-dryrun.ts` (**write 0**, SELECT only, `--out` JSON).
- 실행 검증 완료(cloud-sql-proxy + `npx tsx`). writeCount=0. modelD.eligibleNow=17,877 / blockedNoResource=177,297 / estimatedStoredQrRows=0. modelC.candidateToCreate=198,389(보류).
- 중복 slug 0 · master당 QR 중복 0 · master 직접 타깃 QR 0 · QR identifier 0.

## 7. 권장 저장 방식

- **모델 D (`/r/{id}` 동적 QR)** 채택 — 신규 QR 저장 테이블/컬럼/identifier **미생성**.
- store_qr_codes 재사용(A) 기각 / 신설 테이블(B)·QR_CODE identifier(C)는 **F12 개정 WO 선행 시에만**.
- 진짜 선행 = F12 step4 `/r/{id}` 공개 라우트 + Resource 공개 alias(미구현).

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

## 10. 후속 apply WO

`WO-O4O-PRODUCT-RESOURCE-PUBLIC-ALIAS-V1`(=F12 step4, 진짜 선행) → `WO-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-V1` → `-MISSING-QR-BACKFILL-V1` → `-QR-ON-CREATE-V1` → `-QR-PUBLIC-LANDING-V1` → `WO-O4O-PRODUCT-MFDS-ADMIN-DISPOSITION-CHECK-PIPELINE-V1`.

---

## 11. 핵심 결론 (사업자 판단용)

- 이번 WO 의 문자적 전제(제품별 QR row 저장 + `/qr/{slug}`)는 **Frozen F12 와 충돌**. 저장형은 baseline 개정 없이는 불가.
- **QR 은 상품의 canonical Resource(`/r/{id}`)를 가리키는 동적 QR** 로 정의하는 것이 F12 정합. 저장 0.
- 실질 병목은 QR 이 아니라 **Resource(설명) 부재 89%** — 설명서 확보 트랙과 직결.
- 저장형 QR 이 사업상 꼭 필요하면: **F12 개정 WO** 를 먼저 올린다(별도 결정).
