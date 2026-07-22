# CHECK-O4O-SUPPLIER-MULTILINGUAL-STORE-DESCRIPTION-PRODUCTION-SMOKE-RESUME-V1

> WO: `WO-O4O-SUPPLIER-MULTILINGUAL-STORE-DESCRIPTION-PRODUCTION-SMOKE-RESUME-V1`
> 선행: `CHECK-O4O-SUPPLIER-MULTILINGUAL-STORE-DESCRIPTION-PRODUCTION-SMOKE-V1`(90bd8e27d, 원복불가로 STOP) → 철회(withdraw) 배선(`WO-...-WITHDRAW-V1`, ceb2ce645) 후 재개.
> 성격: 공급자 언어별 STORE 설명서 저장·재조회·검수 프로덕션 smoke. 코드·배포·migration 0. DB write = 사용자 승인 하 잔여물 정리 1건.
> Date: 2026-07-22 · 검증 PASS.

---

## 0. 결론 — ✅ PASS

공급자(renagang21) 언어별 STORE 설명서 ko/en 독립 저장·재조회, 언어 독립성, zh/ja 미작성, 운영자 검수 큐 상품×언어 구분을 **프로덕션 공식 API 로 검증 PASS**. 생성 설명서는 철회(withdraw)로 원복, 테스트 오퍼는 공식 bulk-delete 로 정리. **신규 offer 0 · 신규 live SPD 0 · 대상 master 무변경**. 스모크 중 bash 버그로 발생한 barcodeless master 1건은 **사용자 승인 하 guarded 단일 트랜잭션으로 정리**(true net-0).

## 1. 사용한 공급자·상품·오퍼 유형 (실행 1~4)

- 공급자: renagang21@gmail.com = neture_supplier `91169739…` **ACTIVE** · 등록 offer **0**.
- 기존 등록 상품 0 → **테스트 오퍼 공식 생성·삭제 경로 + 완전 원복 가능성 조사**(gating).
- **완전 원복 가능 target 확정**: 기존 barcode(`8809178390621`) master `23f51f76…`(GENERAL, 약품 아님) 에 offer 생성 → master **무변경**.
  - 근거: `createSupplierOffer` → `resolveOrCreateMaster(existingBarcode)` = **기존 master 그대로 반환(write 0)**. 이어 `updateProductMaster` 는 extFields(name/category/brand/spec/tags) 가 있을 때만 호출 → **barcode 만 전달(name/category 미전달) → extFields 공집합 → updateProductMaster 미호출 → master 완전 무변경**.
  - offer = `isActive=false·PENDING`(승인 전이라도 master_id 보유 → STORE 설명서 저장 게이트 통과). 삭제 = `bulkDeleteOffers`=`offerRepo.remove`(offer만 hard delete, master 무접촉).
- **master 무변경 실측**: 생성 전/후 `updated_at`+핵심필드 md5 **동일**(`2026-07-13 01:30:29.796408|a3750ad7…`).

## 2. 테스트 오퍼 생성 여부·공식 원복 경로 (실행 13)

- 생성: `POST /neture/supplier/products {barcode, distributionType:PRIVATE}` → offer PENDING(201).
- 원복: 설명서 `DELETE /neture/supplier/store-descriptions/:id`(철회) → offer `DELETE /neture/supplier/products/bulk`(200, deleted 1). **직접 DB write 없이 공식 경로로 원복**.

## 3. ko/en 저장·재조회 결과 (실행 5~7) — 행 id 추적(충돌 방지)

| 검증(T) | 결과 |
|------|------|
| ko 임시저장 → id 재조회 | ko `draft` `<p>KO v1</p>` ✅ |
| en 저장(검수요청) → id 재조회 | en `needs_review` `<p>EN v1</p>` ✅ |

## 4. 언어 간 독립성 검증표 (실행 8·9) — ✅ 전항 PASS

| 필수 항목 | 결과 |
|------|:---:|
| ko 저장 후 ko 재조회 | ✅ KO v1/draft |
| **en 최초 진입 시 ko 자동복사 없음** | ✅ ko 저장 직후 en 행 **0** (auto-copy 없음) |
| en 저장 후 en 재조회 | ✅ EN v1/needs_review |
| ko 재진입 시 ko 유지 | ✅ |
| **en 저장 후 ko 불변** | ✅ ko=KO v1/draft 유지 |
| **ko 수정(v2) 후 en 불변** | ✅ ko=`KO v2 edited`, en=`EN v1`/needs_review 유지 |
| **zh/ja 미작성 상태** | ✅ 저장·조회 전 구간 zh/ja 행 미생성 |
| 다른 기존 설명서 불변 | ✅ (pre-existing hidden orphan·다른 master 무접촉) |

## 5. zh/ja 미작성 상태 (실행 10)

- 전 구간에서 zh/ja 작업행 미생성. 편집기 언어 탭 빈 상태 로직은 선행 `…-LANGUAGE-EDITOR-V1`(tsc·code-review) + 데이터 계층(listMine 에 zh/ja 부재)으로 확인.

## 6. 운영자 검수 큐 상품×언어 구분 (실행 11) — ✅

`GET /admin/o4o-product-db/supplier-store-descriptions?status=all` (sohae2100 admin) 에서 내 2행 노출, **언어·상품·공급자 구분**:
| id | lang | status | master | supplier |
|----|------|--------|--------|----------|
| 091001b8 | **en** | needs_review | 23f51f76 | (주)네뚜레 공급자 테스트 |
| fd364aa9 | **ko** | draft | 23f51f76 | (주)네뚜레 공급자 테스트 |

## 7. 설명서 철회 결과 (실행 12) — ✅

- ko·en 철회(`DELETE …/store-descriptions/:id`) → **200**. 철회 후:
  - **공급자 목록(listMine) 비노출** ✅ (ko/en 부재)
  - **운영자 검수 큐 비노출** ✅ (status=all 에서도 부재)

## 8. 오퍼 정리·테스트 데이터 순증 (실행 13·14) — ✅ net-0

- 테스트 offer `bulkDeleteOffers` → 200(deleted 1). renagang21 offers = **0**.
- master 23f51f76 **무변경**(md5 동일). 다른 master·SPD 변경 0.
- renagang21 STORE SPD 최종: **LIVE hidden 10(기존 orphan 불변)** + soft-deleted draft 2·needs_review 2(스모크 생성분 = **공식 철회로 원복된 soft-delete 행**). **신규 LIVE draft/needs_review = 0**.
- **순증 판정: 신규 master 0 · 신규 offer 0 · 신규 LIVE/active SPD 0.** 4 soft-deleted 행은 WO 가 규정한 철회(원복) 메커니즘의 결과(전 표면 비노출).

## 9. 발견된 결함·후속 (실행 9) — 없음(기능 결함 0)

- 언어 독립성·자동복사 없음·검수 큐 언어 구분·철회 비노출 **전항 PASS**. **코드 수정 필요 결함 0.**
- ⚠️ **스모크 운영 주의(결함 아님)**: `createSupplierOffer` 는 `barcode` 빈 문자열 전달 시 `createMasterWithoutBarcode` 로 **신규 barcodeless master 를 생성**한다(설계). 스모크 중 bash `read` 실패로 빈 barcode 가 전달돼 barcodeless master `c3436a8d` 1건이 우발 생성됨(offer/설명서는 공식 원복). 공급자·운영자 API 에 **barcodeless orphan master 삭제 공식 경로 없음** → 아래 §10 사용자 승인 하 정리.

## 10. DB write·코드·배포 (실행 15)

- **코드 0 · 배포 0 · migration 0.**
- **DB write = 사용자 승인 하 guarded 정리 1건**: 우발 barcodeless master `c3436a8d` + 그 2 soft-deleted SPD(0265b8a8·af78a6de). **단일 트랜잭션 + 사전 assert(master=1·barcode NULL·offers=0·identifiers=0·spd=2 전량 soft-deleted·canonical 0·audit 0), 불일치 시 RAISE→ROLLBACK**. 대상 id 만 삭제. 사후: master 0·SPD 0·offer/identifier 0. **다른 master·SPD 무변경.** (스모크 원복은 전부 공식 API — 이 DB 정리는 오직 우발물 1건.)
- 검증 채널: 프로덕션 API(공식) + Cloud SQL Auth Proxy read-only + 승인된 guarded 트랜잭션.

## 11. CHECK·commit·push

- 본 CHECK 문서만 commit·push(코드 0).

## 12. 후속 태블렛 언어 선택 WO 착수 가능 여부

- ✅ **가능.** 공급자 STORE 설명서 언어별 저장·검수·**철회 원복 왕복이 프로덕션에서 실증**됨. 태블렛/Screen Set/QR 소비자 언어 선택 등 후속 다국어 활용 WO 는 이 계약(언어별 독립 STORE SPD)을 신뢰하고 착수 가능. (편집기 드로어 진입은 공급자 등록 offer 필요 — 실사용 공급자는 자기 상품 보유하므로 제약 아님.)

---

*공급자 언어별 STORE 설명서 ko/en 독립·자동복사 없음·검수 큐 언어 구분·철회 원복 프로덕션 PASS. 대상 master 무변경. net-0(신규 master/offer/LIVE-SPD 0; 우발 barcodeless master 승인 하 guarded 정리). 코드·배포 0. 태블렛 언어 WO 착수 가능.*
