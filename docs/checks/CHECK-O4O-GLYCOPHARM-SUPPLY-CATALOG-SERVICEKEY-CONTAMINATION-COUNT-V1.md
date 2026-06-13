# CHECK-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-CONTAMINATION-COUNT-V1

> **유형:** CHECK (production / read-only SQL count)
> **작성일:** 2026-06-13
> **선행 IR:** [IR-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-LABELING-AUDIT-V1](../investigations/IR-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-LABELING-AUDIT-V1.md)
> **연관 WO:** [WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1](../work-orders/WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1.md) (Phase 1 완료 후 보류, `677a9e61c`)
> **상태:** ✅ **완료 — 오염 count = 0 (판정 A)**
> **변경:** 없음 (SELECT count only. 코드/DB write/migration/UI/route/menu 무수정)

## 1. 목적

선행 IR 이 코드로 확정한 GlycoPharm `service_key` 라벨링 누락이 **기존 production 데이터를 실제 오염시켰는지** read-only count 로 확인하고, frontend fix 만으로 충분한지(판정 A) / 데이터 보정 WO 가 필요한지(판정 B·C) 결정한다.

## 2. 선행 IR 기준

- GP frontend apply 가 `service_key` 미전송 → backend 기본값 `'kpa-society'` 저장 가능.
- 오염 경로: `product_approvals`(SERVICE/PRIVATE, `createServiceApproval`/`createPrivateApproval`) + `organization_product_listings`(PUBLIC, `createPublicListing`) **양쪽**.
- KCos 는 `'k-cosmetics'` 명시 전송 → 정상.
- 수정은 frontend 전송이 정답(backend mount-fallback 은 KPA/KCos 규약 불일치로 불가).

## 3. SQL / discriminator

**채널:** `gcloud sql connect o4o-platform-db`(IP allowlist 5분, 자동 만료) → 동일 window 내 direct `psql -f` (CLAUDE.md §0 sanctioned). 접속 user = prod app user `o4o_api`(Cloud Run env), DB `o4o_platform`. **password 는 본 문서에 기재하지 않음(마스킹).** read-only SELECT only.

**discriminator 보정 (IR §7 무효 항목 수정):**
- IR §7 은 `service_memberships(organization_id, service_key)` 조인을 가정했으나, 실제 `service_memberships` 는 **`user_id`** 키 (org 컬럼 없음, migration `1771200000010`). → 무효.
- 실제 org↔service 식별 = **store_owner role_assignment** (`store-owner.utils.ts`): GP store owner = `role_assignments.role = 'glycopharm:store_owner' AND is_active=true`.
- **product_approvals**: `requested_by` 유저가 `glycopharm:store_owner` 보유 → GP-origin.
- **OPL**: `organization_id` 의 `organization_members`(left_at IS NULL) 중 `glycopharm:store_owner` 보유 멤버 존재 → GP-origin.
- `kpa:store_owner` / `cosmetics:store_owner` 로 KPA/KCos 정상 라벨 대조.

산출 SQL: `C:\tmp\gp-servicekey-count.sql` (Q0~Q4). 핵심 오염 식별:
```sql
-- product_approvals 오염(GP-origin인데 service_key='kpa-society')
SELECT pa.approval_status, count(*) FROM product_approvals pa
WHERE pa.service_key='kpa-society'
  AND EXISTS (SELECT 1 FROM role_assignments ra
    WHERE ra.user_id=pa.requested_by AND ra.role='glycopharm:store_owner' AND ra.is_active=true)
GROUP BY pa.approval_status;
-- OPL 오염
SELECT opl.is_active, count(*) FROM organization_product_listings opl
WHERE opl.service_key='kpa-society'
  AND EXISTS (SELECT 1 FROM organization_members om JOIN role_assignments ra ON ra.user_id=om.user_id
    WHERE om.organization_id=opl.organization_id AND om.left_at IS NULL
      AND ra.role='glycopharm:store_owner' AND ra.is_active=true)
GROUP BY opl.is_active;
```

## 4. product_approvals count

| discriminator | status | count | 판단 |
|---|---|---:|---|
| **전체** (모든 service_key) | — | **0** | 테이블 전체 0행 |
| service_key='kpa-society' (role profile is_gp/is_kpa) | — | **0** | 0행 |
| service_key='kpa-society' AND applicant=glycopharm:store_owner (GP-suspect) | 전 status | **0** | **오염 0** |
| service_key='kpa' (legacy) GP-suspect | — | **0** | 오염 0 |

> `product_approvals` 는 production 에서 **행 0개** (모든 service_key 합산 0). 오류 없이 실행 → 테이블·컬럼 정상, 데이터만 비어 있음.

## 5. organization_product_listings count

| discriminator | is_active | count | 판단 |
|---|---|---:|---|
| **전체** (모든 service_key) | — | **0** | 테이블 전체 0행 |
| service_key='kpa-society' 총계 | — | **0** | 0행 |
| service_key='kpa-society' AND org has glycopharm:store_owner (GP-suspect) | true/false | **0** | **오염 0** |

> `organization_product_listings` 도 production 에서 **행 0개**.

## 6. 정상 service_key 대조 (glycopharm)

| table | service_key | count |
|---|---|---:|
| product_approvals | glycopharm | **0** |
| organization_product_listings | glycopharm | **0** |

## 7. K-Cosmetics 대조

| table | service_key | count |
|---|---|---:|
| product_approvals | k-cosmetics | **0** |
| organization_product_listings | k-cosmetics | **0** |

> 두 테이블 모두 비어 있으므로 KCos 정상 라벨 데이터도 현재 0건. KCos 정상성은 IR §5 코드 근거(frontend 가 `'k-cosmetics'` 양 경로 전송)로 유지.

## 8. 판정

**판정 A — 오염 count = 0 (기존 데이터 보정 불필요).**

- `product_approvals`·`organization_product_listings` 양 테이블 모두 production 행 **0개**.
- 따라서 GP-origin `'kpa-society'` 오염 row, OPL 오염 row 모두 **0**. backfill/재시드 대상 없음.
- 이전 [CHECK-...-APPROVE-IMPL-UNIFY §14](./CHECK-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1.md)(목록 pending 0건) 및 pre-service disposable 단계와 정합.
- 라벨링 결함은 **신규 데이터에만** 영향 → frontend `service_key` 전송 수정으로 충분.

## 9. 후속 작업

판정 A 경로:
1. **WO-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-FRONTEND-FIX-V1**
   — GP `services/web-glycopharm/src/api/pharmacyProducts.ts` 의 `applyBySupplyProductId`(+필요시 `getCatalog`)가 `service_key: 'glycopharm'` 명시 전송. KCos 동작 회귀 대조.
2. → **WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1 재개** (Phase 2~: GP/KCos route mount + 공통 콘솔 + 메뉴).
   - KCos 는 라벨링 정상 + 데이터 0건이므로 frontend fix 와 독립적으로 enable 가능.
   - **remediation WO 불필요** (count=0).

## 10. 검증

- ✅ git status clean / origin/main sync 확인 후 시작.
- ✅ read-only: SELECT count only. UPDATE/DELETE/INSERT/DDL/migration **0건**. 코드/UI/route/menu 무수정.
- ✅ 쿼리 전부 오류 없이 실행 (tables + discriminator 컬럼 유효, 데이터 0행 확정).
- ✅ IP allowlist 5분 자동 만료 — 잔존 네트워크 노출 없음.
- ✅ password 등 민감값 비기재(마스킹).
- ✅ 문서 1건만 생성, path-specific commit/push.

---
*End of CHECK-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-CONTAMINATION-COUNT-V1*
