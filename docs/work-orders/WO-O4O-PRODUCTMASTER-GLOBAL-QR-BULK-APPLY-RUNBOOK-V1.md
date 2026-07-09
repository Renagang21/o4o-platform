# WO-O4O-PRODUCTMASTER-GLOBAL-QR-BULK-APPLY-RUNBOOK-V1

Status: Runbook (문서 전용) — 이 문서는 실행 지시가 아니다. 실제 일괄 QR 등록은 **별도 채팅방/별도 apply WO + 사용자 명시 승인** 후에만 수행한다.
관련: `IR-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1`, `WO-O4O-PRODUCTMASTER-GLOBAL-QR-SEED-ENVIRONMENT-V1`
상위 baseline: **F12 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1` (Frozen)**

---

## 0. ⚠️ 선행 게이트 (반드시 먼저 읽기)

**사업 방향(확정)**: `Product → Content → QR → Product Landing`. QR 은 제품 대표 QR 1개 → **Product Landing**(확장 가능 화면: 설명/공급자/운영자/매장/관련 콘텐츠·관련 제품). 설명서는 그중 하나이며 **설명이 없어도 QR/Landing 은 성립**한다.

**따라서 이 apply 는 Product Landing 아키텍처가 확정된 뒤에만 착수한다.**

| 선행 조건 | 상태 |
| --- | --- |
| `WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1` (Landing 데이터·공개 URL/키·구성 콘텐츠·**F12 개정 판단**) 완료 | **미완 — 이 apply 의 진짜 선행** |
| 제품 대표 QR/Landing 저장 방식 확정(제품 단위 대표키) | Landing 아키텍처에서 결정 |

- 제품 단위 대표 QR/Landing 저장은 현행 F12 #4/#6 과 관점이 다르므로, 채택 시 **F12 개정을 병행**한다(F12 는 절대 기준이 아님).
- **본 runbook 은 apply 의 검증·승인·rollback 골격만 제공**한다. 구체 대상/URL/저장 스키마는 Product Landing 아키텍처 확정값을 따른다.
- 참고(폐기): "QR=Resource(`/r/{id}`) 동적·저장0" 만을 유일 정답으로 보던 초안 결론은 **채택하지 않는다**(Landing 이 담을 콘텐츠 중 설명 하나에만 대응하므로 부족).

---

## 1. apply 목적

모든 O4O 표준 상품(ProductMaster)이 O4O 고유 공개 진입점(대표 QR 1개) → **Product Landing** 을 갖게 한다(언어별 다중 QR 아님).

## 2. apply 대상

- **모든 active ProductMaster** (설명 유무 무관 — 설명 없어도 Landing 성립). 2026-07-09 기준 총 **198,389**.
- 구체 대상·제외·저장 스키마는 **Product Landing 아키텍처 확정값**을 따른다.

## 3. 제외 대상

```
StoreLocalProduct
OrganizationProductListing
SupplierProductOffer
매장별 복사 상품(store_execution_assets / kpa_store_contents)
```
설명서/다국어 콘텐츠/StoreLocalProduct/Listing 생성 **금지**. (설명 부재 master 는 제외가 아니라 Landing 콘텐츠를 이후 채우는 대상)

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

- QR → **Product Landing**(확장 가능). 제품 대표 QR 1개. 대상 = 모든 ProductMaster.
- **진짜 선행 = `WO-O4O-PRODUCT-LANDING-ARCHITECTURE-V1`**(Landing 데이터·URL·구성 콘텐츠·F12 개정 판단). 그 확정 전 apply 금지.
- 어떤 경우든 **사용자 명시 승인 + dry-run 선행 + batchId rollback** 강제.
