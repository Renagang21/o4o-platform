# CHECK-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1

> **WO**: `WO-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1`
> **성격**: read-only 조사 전용 — schema·constraint·코드·운영 데이터 **변경 0건**
> **선행**: `WO-O4O-API-SERVER-ORPHANED-MIGRATIONS-RISK-CLASSIFICATION-V1` (P1 후보 ⑤)
> **일자**: 2026-08-01

---

## 1. 시작 상태

```
branch : main
HEAD   : 17908d2bb9c3e1d477a39cea8a9afbcb1be28f43
HEAD...origin/main : 0  0
git status : MM pnpm-lock.yaml + 병렬 세션 OTC/HFF 산출물 + 타 세션 CHECK 문서
```

작업 트리가 clean 은 아니었으나 조사 대상과 완전히 분리되어 있어 read-only 로 진행했다.
기존 변경은 수정·삭제·stash·revert·stage 하지 않았다.

---

## 2. 현재 entity 의 Offer 업무 계약

`apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts`

entity 최상단 docblock 이 계약을 명시한다.

> **하나의 ProductMaster 에 대해 공급자별 1개의 Offer 만 가능**

핵심은 **PUBLIC / SERVICE / PRIVATE 가 별도 행이 아니라 단일 행의 속성**이라는 점이다.

| 필드 | 타입 | 역할 |
|---|---|---|
| `is_public` | boolean | 전체 공개 여부 (독립 축) |
| `service_keys` | **text[]** | 공급 대상 서비스 **배열** (독립 축) |
| `distribution_type` | enum | **파생 필드** — `isPublic + serviceKeys` 조합으로 자동 결정. 주석에 "하위호환용으로 유지 (기존 쿼리/필터 호환)" |

entity 주석(L62-66):
`isPublic=true → PUBLIC`, `serviceKeys.length > 0 → SERVICE`, `else → PRIVATE`.
생성 코드도 `deriveDistributionType(resolvedIsPublic, filteredServiceKeys)` 로 파생시킨다
(`offer.service.ts:991`).

→ **여러 서비스에 공급하더라도 행은 하나**이고, 서비스 목록은 같은 행의 배열 컬럼에 담긴다.
entity 에는 `@Unique` 선언이 없고 `slug` 만 `unique: true` 다.

### 2-1. 서비스별 차이는 junction 테이블이 담당

| 테이블 | 키 | 생성 migration |
|---|---|---|
| `offer_service_prices` | **UNIQUE (offer_id, service_key)** | `20261117000000-CreateOfferServicePrices` |
| `offer_service_approvals` | (offer_id, service_key) 동일 패턴 | 〃 (주석에 명시) |

migration 주석: *"서비스별 공급가 SSOT — offer_id + service_key 단위 별도 가격.
(offer_service_approvals 와 동일한 (offer_id, service_key) junction 패턴.)"*

→ **서비스별 가격·승인은 자식 테이블로 분리**되어 있다. 복수 Offer 행이 필요한 구조가 아니다.

---

## 3. constraint 생성·잔존 이력

| 시점 | migration | 위치 | 내용 | 적용 |
|---|---|---|---|:---:|
| ≈2026-02-16 | `1771200000017-OfferDistributionTypeV1` | **orphan** `src/migrations/` | `DROP CONSTRAINT uq_supplier_product_offers_master_supplier` — "동일 ProductMaster 에 대해 같은 Supplier 가 여러 Offer 생성 가능하도록" | ❌ 미적용 |
| 2026-03-01 | `20260301100000-ProductMasterCoreReset` | `database/migrations/` | 테이블 생성 시 `CONSTRAINT uq_supplier_product_offers_master_supplier UNIQUE (master_id, supplier_id)` | ✅ 적용 |
| 2026-11-17 | `20261117000000-CreateOfferServicePrices` | `database/migrations/` | 서비스별 가격을 junction 으로 분리 | ✅ 적용 |

`typeorm_migrations` 실측:

```
ProductMasterCoreReset20260301100000      ← 적용
CreateOfferServicePrices20261117000000    ← 적용
OfferDistributionTypeV1...                ← 기록 없음
```

**결정적 사실**: 제약을 없애려던 orphan(2026-02-16)보다 **뒤에**, canonical Product Master Core Reset(2026-03-01)이 이 제약을 **새로 만들었다**. 그리고 그보다 8개월 뒤(2026-11-17)에 서비스별 가격을 junction 으로 분리하며 "Offer 1행 + 서비스 junction" 구조를 굳혔다.

→ orphan 은 **현재 모델보다 앞선, 폐기된 설계 방향**이다. 지금 적용하면 이미 대체된 방향으로 되돌리는 것이 된다.
(orphan 은 이동·수정·삭제하지 않았다.)

---

## 4. 프로덕션 실제 constraint 정의

```
uq_supplier_product_offers_master_supplier | u | UNIQUE (master_id, supplier_id)
supplier_product_offers_pkey               | p | PRIMARY KEY (id)
supplier_product_offers_master_id_fkey     | f | FK master_id   → product_masters(id)   ON DELETE RESTRICT
supplier_product_offers_supplier_id_fkey   | f | FK supplier_id → neture_suppliers(id)  ON DELETE CASCADE
```

unique index: `uq_supplier_product_offers_master_supplier` (btree master_id, supplier_id) — **partial 아님**
그 외 `idx_spo_slug` (UNIQUE slug), `idx_spo_is_featured` (partial), master/supplier/approval 일반 index.

entity metadata 와의 차이: entity 는 이 복합 unique 를 `@Unique` 로 선언하지 않는다(DB 에만 존재). 동작상 문제는 없으나 **계약이 DB 에만 표현되어 있다**.

---

## 5. 운영 데이터 census (read-only)

```
total_rows 2 · live 2 · soft_deleted 0 · distinct(supplier,master) 2
중복 (supplier,master) 조합            : 0
재등록을 막고 있는 soft-deleted 행     : 0
distribution_type : SERVICE 1 (service_keys 1개, is_public=false) / PRIVATE 1 (service_keys 0개)
service_keys 개수별 : 0개=1행, 1개=1행
동일 master 를 복수 supplier 가 제공  : 0
동일 supplier 가 복수 master 를 제공  : 1
offer_service_prices 1행 / offer_service_approvals 0행
organization_product_listings 20행 / product_approvals 0행
```

> ⚠️ 데이터가 2행뿐이므로 **"중복이 0이다"는 판정 근거로 쓰지 않았다.** 판정은 전적으로
> entity 계약 · junction 구조 · migration 연대기에 근거한다.

`distribution_type` 값이 `is_public`/`service_keys` 조합과 정확히 일치한다(파생 필드 정상 동작).

---

## 6. 쓰기 경로별 중복 판정과 충돌 가능성

| 경로 | 위치 | 중복 판정 키 | 동작 |
|---|---|---|---|
| 공급자 상품 등록 | `offer.service.ts:988-1011` | **없음** | `offerRepo.create()` → `save()` 직행 |
| 서비스 on/off | `offer.service.ts:1346-1403` | `serviceKey ∈ currentKeys` | **기존 행의 `service_keys` 배열을 갱신** (신규 행 생성 아님) |
| 승인/상태 변경 | `offer.service.ts:1164 / 1444 / 1823` | offer id | 기존 행 UPDATE |
| soft delete | `operator-product-cleanup.controller.ts:336` | offer id | `deleted_at = NOW(), is_active = false` |
| restore | 〃 `:414` | offer id | 휴지통에서 복원 |
| hard delete | 〃 `:447` | offer id | 물리 삭제 |

**서비스 추가는 새 Offer 를 만들지 않고 배열을 수정한다** — 복수 행을 만들려는 활성 경로는 없다.
`upsert` / `find-or-create` 패턴도 발견되지 않았다.

### 6-1. 발견된 실제 갭 — 중복 사전 검사 부재

등록 경로는 `(masterId, supplierId)` 사전 조회 없이 바로 `save()` 한다. 따라서
같은 공급자가 같은 ProductMaster 를 다시 등록하면 **DB unique violation(23505)** 이 그대로 터진다.
`offer.service.ts` 에 23505 처리가 없다(플랫폼 내 23505 처리는 auth/settlement/partner-commerce 등 타 모듈에만 존재).

→ 제약은 올바르게 동작하지만 **오류가 사용자에게 일반 500 으로 노출**된다.

### 6-2. 휴지통 점유 — 설계 의도로 판단

unique 가 partial 이 아니므로 soft-deleted 행도 `(master, supplier)` 슬롯을 계속 점유한다.
휴지통에 있는 상품을 **새로** 등록하려 하면 6-1 과 같은 경로로 실패한다.

다만 `/recycle-bin` · `/restore/:offerId` · `/hard-delete/:offerId` 가 모두 존재하므로,
"삭제된 Offer 는 휴지통에 남아 복원 가능" 이 설계 의도이고 **슬롯 예약은 그 의도와 정합**하다.
올바른 UX 는 "복원" 또는 "완전 삭제 후 재등록" 이다.
현재 soft-deleted 0행이라 실제 발생 이력은 없다.

---

## 7. 읽기·승인·listing 소비처의 단건/복수 가정

- Offer 조회는 `master_id` / `supplier_id` / `approval_status` index 기반이며, 목록 API 는 배열을 반환한다(여러 supplier 의 Offer 를 나열하는 의미).
- **동일 (master, supplier) 에 대해 복수 행을 전제하는 소비처는 발견되지 않았다.**
- 서비스별 분기는 `offer_service_prices` / `offer_service_approvals` junction 을 통해 `offer_id` 로 접근한다 → **Offer 단건 전제**.
- `organization_product_listings`(20행)는 승인된 Offer 를 매장 진열로 연결하는 하위 개념이다.

→ 제약을 완화하면 **junction 테이블들이 "어느 Offer 인지" 를 다시 구분해야 하는 문제**가 생긴다.
현재 `offer_service_prices` 의 `UNIQUE(offer_id, service_key)` 는 Offer 가 하나임을 전제로 서비스별 가격의 유일성을 보장하고 있다.

---

## 8. 재현 가능한 실패 조건

프로덕션 DML 없이 코드 경로로 확정한 내용:

1. 공급자가 이미 등록한 ProductMaster 를 다시 등록 → `INSERT INTO supplier_product_offers (master_id, supplier_id, ...)`
   → `uq_supplier_product_offers_master_supplier` 위반(23505)
2. 애플리케이션 사전 검사에서 걸러지지 않음(6-1) → DB 에서 violation 발생
3. `offer.service.ts` 에 23505 분기 없음 → 상위 오류 처리로 전파되어 **일반 500**
4. 트랜잭션은 해당 저장 단위에서 rollback

**정상 업무 흐름(서비스 추가·가격 변경·승인)에서는 이 제약이 쓰기를 막지 않는다** — 모두 UPDATE 경로다.

---

## 9. 판정

### **A. 제약 유지**

`uq_supplier_product_offers_master_supplier` 는 **현재 업무 계약과 일치하는 유효한 무결성 장치**다. 제거 대상이 아니다.

선행 감사에서 P1 후보로 올렸던 "orphan 이 DROP 하려던 제약이 잔존" 은 **결함이 아니라 정상 상태**로 정정한다.

---

## 10. 판정 근거

1. entity docblock 이 "공급자별 1개 Offer" 를 명시한다.
2. PUBLIC/SERVICE/PRIVATE 는 별도 행이 아니라 `is_public` + `service_keys` **단일 행 속성**이고 `distribution_type` 은 파생·하위호환 필드다.
3. 서비스별 가격·승인은 `offer_service_prices` / `offer_service_approvals` **junction** 이 담당하며, 그 unique 키가 `(offer_id, service_key)` 라 Offer 단건을 전제한다.
4. **연대기**: 제약을 없애려던 orphan(2026-02-16) → 제약을 만든 canonical reset(2026-03-01) → junction 분리(2026-11-17). orphan 은 뒤에 나온 설계로 **대체·폐기**됐다.
5. 서비스 추가 경로가 새 행이 아니라 **배열 갱신**으로 구현되어 있다.
6. 복수 행을 전제하는 쓰기·읽기 소비처가 **0건**이다.

---

## 11. 유지 시 영향 범위

제약을 그대로 두면 **정상 업무 흐름에 아무 영향이 없다**. 영향은 6-1 의 오류 표현에 국한된다.

만약(향후 정책이 바뀌어) 제거한다면 최소한 다음이 함께 재설계되어야 한다.

- `offer_service_prices` / `offer_service_approvals` 의 `(offer_id, service_key)` 유일성 의미
- `distribution_type` 파생 규칙 (여러 행이면 무엇을 기준으로 파생하는가)
- Offer 단건을 전제한 승인 → listing 연결
- `slug` 생성 규칙 (현재 `{barcode}-{supplier8}-{Date.now()}`)

---

## 12. 권장 후속 방향 — constraint 변경 아님 (코드 계약 교정)

| # | 항목 | 성격 | 제안 |
|---|---|---|---|
| ① | 등록 경로 중복 사전 검사 부재 | **C. 코드 계약 교정** | `save()` 전 `(masterId, supplierId)` 조회. 이미 있으면 도메인 오류(예: `DUPLICATE_OFFER`)로 409 반환 |
| ② | 23505 미처리 | **C. 코드 계약 교정** | ①의 경합 대비 fallback 으로 23505 → 409 매핑 |
| ③ | 휴지통 점유 안내 | UX | 기존 행이 `deleted_at IS NOT NULL` 이면 "휴지통에 있음 — 복원하거나 완전 삭제 후 재등록" 로 구분 안내 |

**partial unique index(`WHERE deleted_at IS NULL`) 로 바꾸는 안은 권장하지 않는다.**
휴지통·복원 흐름이 존재하므로 슬롯 예약이 설계 의도와 정합하고, partial 로 바꾸면 복원 시 중복이 생길 수 있다.

①~③ 은 이번 WO 범위 밖이며 별도 소규모 WO 로 분리 가능하다. **현재 운영 장애는 아니다**
(soft-deleted 0행, 중복 시도 이력 없음).

---

## 13. 프로덕션 DDL·DML 0 확인

- 실행 쿼리: `SELECT` / `information_schema` / `pg_constraint` / `pg_indexes` 조회만
- DDL 0건 · DML 0건 · constraint 변경 0건 · 운영 데이터 변경 0건
- Cloud SQL Auth Proxy 사용, 조사 종료 후 종료

## 14. 변경 파일

- `docs/checks/CHECK-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1.md` (본 문서, 신규)
- 그 외 코드·migration·schema 변경 **0건**

## 15. 미확정 정책 및 후속 WO 필요 여부

- **미확정 없음** — 단일 Offer 계약이 entity·junction·연대기에서 일관되게 확인된다.
- 후속 WO 는 §12 ①~③ 의 **오류 계약 교정**만 선택 사항이며, 제약 변경 WO 는 불필요하다.
- 선행 감사의 잔여 항목 중 P2(forum_post 성능 인덱스)와 HOLD(RBAC UPDATE 2건)는 그대로 남는다.

## 16. 제외 범위 변경 0

DB schema·constraint / entity·Offer 서비스 코드 / 기존 migration / 운영 데이터 /
Platform Store / Glycopharm / Cosmetics / Neture 비관련 기능 / Forum / service-groups /
RBAC / OTC·HFF / pnpm-lock.yaml / 병렬 세션 산출물 — **전부 변경 0건**
