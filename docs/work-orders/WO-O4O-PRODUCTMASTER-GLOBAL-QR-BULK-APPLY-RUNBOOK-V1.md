# WO-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-RUNBOOK-V1

Status: Runbook (문서 전용) — 이 문서는 실행 지시가 아니다. 실제 일괄 QR 등록은 **별도 채팅방/별도 apply WO + 사용자 명시 승인** 후에만 수행한다.
관련: `IR-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1`, `WO-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1`
상위 baseline: **F12 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1` (Frozen)**

---

## 0. ⚠️ 선행 게이트 (반드시 먼저 읽기)

IR 결론상 **저장형 per-ProductMaster QR(모델 A/C, 신규 테이블/identifier)은 F12 Freeze #4("QR 비저장·동적생성")와 충돌**한다. 따라서 apply 경로는 둘 중 하나로 갈린다.

| 경로 | 조건 | apply 성격 |
| --- | --- | --- |
| **경로 D (권장·F12 정합)** | `/r/{id}` 공개 라우트 + Resource 공개 alias 발급(F12 step4)이 선행 구현됨 | Resource permalink 을 QR 로 **동적 생성**. **저장 QR row 0** — "일괄 등록"은 Resource alias 발급(있다면)이지 QR row 삽입이 아님 |
| **경로 S (저장형·보류)** | **F12 baseline 개정 WO 통과**로 저장형 QR 이 명문 허용된 경우에만 | per-master QR 토큰 저장(모델 C: ProductIdentifier QR_CODE) |

**경로 S 는 baseline 개정 전까지 금지.** 본 runbook 은 두 경로의 절차를 모두 문서화하되, 기본 실행 경로는 **D** 로 한다.

---

## 1. apply 목적

모든 O4O 표준 상품(ProductMaster)이 O4O 고유 공개 진입점(QR)을 갖게 한다. 단, QR 은 상품의 **canonical Resource** 를 가리키는 대표 QR 1개다(언어별 다중 QR 아님).

## 2. apply 대상

- 경로 D: canonical Resource(현 `shared_product_descriptions` status=canonical) 를 보유한 ProductMaster (2026-07-09 기준 **17,877**).
- 경로 S(보류): active ProductMaster 전체 중 QR 토큰 미보유분.

## 3. 제외 대상

```
StoreLocalProduct
OrganizationProductListing
SupplierProductOffer
매장별 복사 상품(store_execution_assets / kpa_store_contents)
Resource(설명) 미보유 ProductMaster (경로 D 에서 QR 지향 대상 없음 — 설명/Resource 확보 후 대상)
```
설명서/다국어 콘텐츠/StoreLocalProduct/Listing 생성 **금지**.

## 4. 사전 백업

- 경로 D: 저장 write 가 없으므로 DB 백업 불필요. 단 **Resource alias 발급이 있는 경우** 발급 테이블 스냅샷(발급 batchId 기록).
- 경로 S(보류): apply 직전 `product_identifiers` 백업 스냅샷(승인 시 백업 테이블명·시각 기록). 프로덕션 백업은 Cloud SQL 자동 백업 + 필요 시 export.

## 5. dry-run 실행 (필수 선행)

```bash
# cloud-sql-proxy(127.0.0.1:15432) 기동 후
cd apps/api-server
DB_HOST=127.0.0.1 DB_PORT=15432 DB_USERNAME=o4o_api DB_PASSWORD=*** DB_NAME=o4o_platform \
  npx tsx src/scripts/productmaster-global-qr-dryrun.ts --out /tmp/qr-dryrun.json
```
- dry-run 은 **write 0**. `inventory` / `existingQr` / `candidateSummary` 를 확인한다.
- apply 전 반드시 dry-run 수치를 CHECK 에 첨부한다.

## 6. 사용자 승인 문구 (apply 착수 전 필수)

```
ProductMaster 전역 QR bulk apply 승인.
대상은 <경로 D: canonical Resource 보유 active ProductMaster / 경로 S: 명시 대상>로 한정.
ProductMaster별 O4O 대표 QR 1개(언어탭 랜딩) 성립 허용.
설명서/다국어 콘텐츠/StoreLocalProduct/OrganizationProductListing 생성 금지.
경로 S(저장형)인 경우: F12 baseline 개정 WO 통과를 확인함.
```
승인 없이는 apply 금지. (WO 는 핸드오프 문서이지 착수 지시가 아니다.)

## 7. apply 명령 예시

### 경로 D (권장)
- 저장 QR 삽입 없음. 필요한 것은 F12 step4 산출물(`/r/{id}` 라우트 + Resource 공개 alias). 그 apply WO(`WO-O4O-PRODUCT-RESOURCE-PUBLIC-ALIAS-V1`)의 alias 발급 스크립트를 batchId 와 함께 실행. QR 은 발급된 URL 의 동적 인코딩으로 런타임 생성.

### 경로 S (보류 — baseline 개정 후에만)
```
# 예시(미구현·개정 전 실행 금지): 단일 트랜잭션 + 이중 게이트 + batchId
#   INSERT INTO product_identifiers (product_master_id, identifier_type, identifier_value, normalized_value, source_type, source_label, metadata)
#   SELECT pm.id, 'QR_CODE', <opaque_token>, <normalized>, 'system', 'productmaster_global_qr_seed',
#          jsonb_build_object('batchId', :batchId)
#   FROM product_masters pm
#   WHERE <대상 조건> AND NOT EXISTS (기존 QR_CODE identifier)
```

## 8. in-transaction 검증

- 단일 트랜잭션 내에서 삽입 건수 = 기대 생성 수(dry-run estimatedCreateCount) 인지 확인. 불일치 시 ROLLBACK.
- 유니크 위반(중복 target/slug/token) 발생 시 즉시 ROLLBACK.
- ProductMaster / SPD(설명) / Listing / StoreLocalProduct row 수 **불변** 확인(생성 0).

## 9. post-apply 검증 (§15 항목)

```
A. ProductMaster 전체 수 = 198,389 (불변)
B. active ProductMaster 수 (status 컬럼 부재 → 규제/삭제 기준으로 정의)
C. QR 성립(경로 D: /r{id} 대상 / 경로 S: QR_CODE identifier) 대상 수
D. 이미 QR 보유 수
E. QR 미보유 수
F. ProductMaster당 QR 2개 이상 중복 = 0
G. QR slug/token 중복 = 0
H. QR URL null = 0
I. landingType/URL 정책 위반 = 0
J. Resource/삭제/비활성 제외 반영 여부
K. 생성 후 total QR 증가 수 = expectedCreateCount (경로 D 는 저장 0 → 증가 0)
L. ProductMaster/ProductIdentifier(비-QR)/Description/Content 증가 = 0
```

검증 SQL 예:
```sql
-- F: master 당 QR 중복 (경로 S)
SELECT product_master_id, count(*) FROM product_identifiers
WHERE deleted_at IS NULL AND identifier_type='QR_CODE' GROUP BY 1 HAVING count(*) > 1;  -- 0 이어야 함
-- G: token 전역 중복
SELECT normalized_value, count(*) FROM product_identifiers
WHERE deleted_at IS NULL AND identifier_type='QR_CODE' GROUP BY 1 HAVING count(*) > 1;  -- 0
-- K: 증가 수
SELECT count(*) FROM product_identifiers WHERE identifier_type='QR_CODE' AND metadata->>'batchId' = :batchId;
```

## 10. rollback 기준

원칙: **bulk apply 가 생성한 것만 rollback. 기존 QR/identifier/ProductMaster 는 절대 삭제·수정하지 않는다.**

- 식별 기준: `metadata->>'batchId' = :batchId` AND `source_label='productmaster_global_qr_seed'`.
- 절차:
  1. batchId 기준 생성 건수 확인.
  2. 해당 batch 만 soft delete(`deleted_at` set) — hard delete 는 승인 시에만.
  3. ProductMaster 는 수정하지 않음.
  4. 설명서/콘텐츠/Listing/StoreLocalProduct 는 생성하지 않았으므로 rollback 대상 없음.
- 경로 D: 저장 write 가 없으므로 rollback 대상은 (있다면) Resource alias 발급 batch 뿐 — 해당 alias WO 의 rollback 기준을 따른다.

## 11. CHECK 작성 기준

apply 후 `docs/checks/CHECK-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-V1.md` 에:
- 경로(D/S), 승인 문구, dry-run 수치, 대상/제외, 생성 수, §9 A–L 검증 결과, batchId, rollback 절차, DB write 내역(경로 D=0), ProductMaster 불변 확인.

## 12. 행정처분/회수 노트

- QR 생성/노출 전, 식약처 인허가 대상 제품의 행정처분·회수 상태 노출 게이트가 필요(§IR 6-7). 자동 확인 파이프라인 미존재를 "문제 없음"으로 단정하지 않는다. 랜딩 노출 제어는 `WO-O4O-PRODUCTMASTER-QR-PUBLIC-LANDING-V1` / `WO-O4O-PRODUCT-MFDS-ADMIN-DISPOSITION-CHECK-PIPELINE-V1` 에서.

---

## 13. 요약

- 기본 실행 경로 = **D(F12 정합·저장 0)**. 선행 = `/r/{id}` 공개 라우트/alias.
- 저장형(S)은 **baseline 개정 후에만**.
- 어떤 경로든 **사용자 명시 승인 + dry-run 선행 + batchId rollback** 이 강제.
