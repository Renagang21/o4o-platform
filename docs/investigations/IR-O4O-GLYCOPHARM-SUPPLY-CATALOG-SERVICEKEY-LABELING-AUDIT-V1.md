# IR-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-LABELING-AUDIT-V1

> **유형:** Investigation Report (read-only)
> **작성일:** 2026-06-13
> **선행:** [WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1](../work-orders/WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1.md) (Phase 1 완료 후 보류 — commit `677a9e61c`)
> **상태:** ✅ 코드 경로 확정 / ⏳ DB row 분포는 검증 채널 필요(방화벽)
> **변경:** 없음 (코드/DB/migration/UI 무수정 — 본 문서 1건만 생성)

## 1. 배경 — 보류 사유

GP/KCos 에 `product_approvals` 운영자 승인 surface 를 여는 WO 진행 중,
GP `product_approvals.service_key` 가 `'glycopharm'` 이 아니라 **`'kpa-society'`** 로
저장될 수 있다는 정황을 발견. GP operator surface 를 `serviceKey='glycopharm'` 로 열면
**빈 목록**, 필터 없이 열면 **KPA 목록에 GP 승인 누수**. 따라서 surface enable 을 중단하고
라벨링 범위를 read-only 로 확정한다.

## 2. 목표 (6)

1. GP Supply Catalog apply 가 `service_key` 를 누락하는지 코드로 확정
2. `product_approvals` 에 GP-origin 인데 `service_key='kpa-society'` 로 저장된 row 존재 여부
3. `organization_product_listings`(OPL) 에 GP 매장/offer 인데 `service_key='kpa-society'` row 존재 여부
4. `createPublicListing`/`createServiceApproval`/`createPrivateApproval` 기본값 영향 범위
5. KCos 는 `service_key='k-cosmetics'` 로 정상인지 대조
6. 수정이 단순 frontend `service_key` 전송으로 충분한지, 기존 데이터 backfill 필요 여부 결정

---

## 3. 목표 1 — GP apply 의 service_key 누락 (✅ 코드 확정)

[services/web-glycopharm/src/api/pharmacyProducts.ts](../../services/web-glycopharm/src/api/pharmacyProducts.ts):

- `applyBySupplyProductId` (line 80-85): `api.post('/glycopharm/pharmacy/products/apply', { supplyProductId })`
  — body 에 **`service_key` 없음**.
- `getCatalog` (line 58-75): query param 에 `distributionType/recommended/operatorView/limit/offset` 만 —
  **`service_key` 없음**.
- 즉 GP 프론트는 어떤 경로에서도 `service_key` 를 전송하지 않는다.

backend 수신부 [apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts):

```text
39  function resolveServiceKeyFromBody(body) {
40    const requested = body?.service_key;
41    if (!requested) return SERVICE_KEYS.KPA_SOCIETY;   // ← 기본값 'kpa-society'
...
199   const serviceKey = resolveServiceKeyFromBody(req.body);   // GP body엔 service_key 없음
224   createServiceApproval(supplyProductId, organizationId, serviceKey, user.id);  // = 'kpa-society'
```

**확정:** GP apply → `serviceKey='kpa-society'`. (목표 1 = YES)

---

## 4. 목표 4 — 3개 생성 경로 모두 동일 기본값 오염 (✅ 코드 확정)

apply handler 는 distribution_type 에 따라 분기하되 **셋 다 동일한 `serviceKey`('kpa-society')** 를 전달:

| offer.distribution_type | 호출 | 저장 위치 | GP 저장 service_key |
|---|---|---|---|
| SERVICE | `createServiceApproval(..., serviceKey, ...)` | `product_approvals` | **kpa-society** |
| PRIVATE | `createPrivateApproval(..., serviceKey, ...)` | `product_approvals` | **kpa-society** |
| PUBLIC | `createPublicListing(..., serviceKey)` | **OPL 직접** | **kpa-society** |

`createPublicListing` ([product-approval-v2.service.ts:510,550](../../apps/api-server/src/modules/product-policy-v2/product-approval-v2.service.ts)):
`service_key: serviceKey` 로 OPL 직접 생성 → **목표 3 의 OPL 오염 경로가 PUBLIC apply 임을 확인**.

**결론:** GP 오염은 `product_approvals`(SERVICE/PRIVATE) 와 `OPL`(PUBLIC) **양쪽**에 발생 가능.
단순 `ProductApproval(PENDING)` 한정 문제가 아님 — 사용자 의심 적중.

---

## 5. 목표 5 — KCos 대조 (✅ 정상)

[services/web-k-cosmetics/src/api/pharmacyProducts.ts](../../services/web-k-cosmetics/src/api/pharmacyProducts.ts):
- `getCatalog` (line 60): `searchParams.set('service_key', 'k-cosmetics')`
- `applyBySupplyProductId` (line 70-72): body `{ supplyProductId, service_key: 'k-cosmetics' }`

KCos 는 양 경로 모두 `'k-cosmetics'` 명시 전송 → 저장값 정상. **KCos surface 는 격리 가능.**

---

## 6. 핵심 발견 — backend mount-fallback 수정은 불가 (라벨 규약 불일치)

"backend 기본값을 mount serviceKey 로" 식의 source 수정은 **KPA 를 깨뜨린다.**
mount 인자(`StoreOwnerServiceKey`, store-owner 가드용)와 `product_approvals.service_key` 규약이 다르기 때문:

| 서비스 | pharmacy-products mount 인자 | product_approvals/OPL 규약 service_key |
|---|---|---|
| KPA | `'kpa'` ([kpa.routes.ts:374](../../apps/api-server/src/routes/kpa/kpa.routes.ts)) | `'kpa-society'` |
| GlycoPharm | `'glycopharm'` ([glycopharm.routes.ts:379](../../apps/api-server/src/routes/glycopharm/glycopharm.routes.ts)) | `'glycopharm'` |
| K-Cosmetics | `'cosmetics'` ([cosmetics.routes.ts:130](../../apps/api-server/src/routes/cosmetics/cosmetics.routes.ts)) | `'k-cosmetics'` |

→ backend 가 mount 인자를 기본값으로 쓰면 KPA 가 `'kpa'`(잘못), KCos 가 `'cosmetics'`(잘못, body 없을 때)로 저장.
**따라서 수정은 각 frontend 가 자신의 canonical service_key 를 전송하는 방식이 맞다** (KCos 가 이미 하는 패턴).

---

## 7. 목표 2·3 — DB row 분포 (⏳ 검증 채널 필요)

프로덕션 DB 는 방화벽 차단(CLAUDE.md §0) — 본 read-only IR 범위에서 직접 count 불가.
오염 row 식별 **discriminator** = "org 의 소속 서비스 ≠ 저장된 service_key".
GP-origin 인데 `'kpa-society'` 로 저장된 row 는 다음으로 식별 (remediation WO 에서 실행):

```sql
-- (A) product_approvals: GP org 인데 service_key='kpa-society'
SELECT pa.id, pa.organization_id, pa.service_key, pa.offer_id, pa.status, pa.approval_type
FROM product_approvals pa
JOIN service_memberships sm ON sm.organization_id = pa.organization_id
WHERE pa.service_key = 'kpa-society'
  AND sm.service_key = 'glycopharm';

-- (B) OPL: GP org 인데 service_key='kpa-society' (PUBLIC apply 경로)
SELECT opl.id, opl.organization_id, opl.service_key, opl.offer_id, opl.is_active
FROM organization_product_listings opl
JOIN service_memberships sm ON sm.organization_id = opl.organization_id
WHERE opl.service_key = 'kpa-society'
  AND sm.service_key = 'glycopharm';
```

> `service_memberships` 조인 컬럼(`organization_id`/`service_key`)은 remediation WO 에서 실제 스키마로 재확인.
> 검증 채널: read-only 진단 endpoint(SSR/JSON) 추가 후 배포 조회, 또는 `gcloud sql`/migrations-job 일회성 SELECT.

**의미:** count > 0 이면 기존 GP 데이터가 KPA 운영자 목록에 섞여 있고, GP storefront(OPL `service_key='glycopharm'` 필터, 선행 IR)에서는 **누락**된다 — 승인/진열/노출 흐름 어긋남(사용자 의심 적중).

---

## 8. 목표 6 — Remediation 결정

| 대상 | 조치 | 근거 |
|---|---|---|
| **신규 데이터** | GP `pharmacyProducts.ts` 의 `applyBySupplyProductId`(+필요시 getCatalog)가 `service_key:'glycopharm'` 전송 | §6 — frontend 전송이 유일하게 안전한 source 수정. KCos 와 대칭. backend 기본값 변경 금지(KPA 파손). |
| **기존 데이터** | §7 (A)(B) count 결과에 따라 결정. **pre-service disposable** 단계이므로([memory] pre-service-disposable-data) **재시드 우선**, backfill 은 보존 필요 데이터 확인 시에만 분리 WO | 오염 row 가 GP-origin 으로 확정될 때만 보정. KPA-origin `'kpa-society'` 와 혼동 금지(org 소속으로만 구분). |

### 권장 후속 순서
1. **(검증)** §7 discriminator 로 (A)(B) count — 진단 endpoint 또는 sql 채널. (별도 WO 또는 본 IR 의 verify 단계)
2. **(WO-1)** GP frontend `service_key:'glycopharm'` 전송 수정 + KCos 동작 대조 회귀. (신규 데이터 정상화)
3. **(WO-2, 조건부)** count>0 시 GP-origin 오염 row 재시드/backfill 분리 WO.
4. **(재개)** `WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1` Phase 2~ — GP/KCos mount + 공통 콘솔 + 메뉴. GP 는 WO-1(필요시 WO-2) 완료 후.

KCos 는 라벨링 정상이므로 위 1~3 과 독립적으로 surface enable 가능(원하면 KCos 먼저 재개).

---

## 9. 결론

- GP apply 의 `service_key` 누락 → 기본값 `'kpa-society'` 오염 = **코드 확정**(목표 1).
- 오염 범위는 `product_approvals`(SERVICE/PRIVATE) + `OPL`(PUBLIC) **양쪽** = **코드 확정**(목표 3·4) — 단순 PENDING 한정 아님.
- 수정은 **frontend `service_key` 전송**이 정답, backend mount-fallback 은 KPA 파손으로 불가(목표 6, §6).
- KCos 정상(목표 5).
- 기존 DB row 분포(목표 2·3)는 방화벽으로 본 IR 미측정 — §7 discriminator + 검증 채널로 remediation WO 첫 단계에서 확정.
- **GP operator surface enable 중단 판단 유효.** 재개 전 WO-1(GP frontend) (+ 조건부 WO-2 데이터 보정) 선행.

### 현재 WO 상태 기록
```text
WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1
상태: Phase 1 완료 후 보류
commit: 677a9e61c (backend 컨트롤러 serviceKey/scope 일반화, KPA 무영향)
보류 사유: GlycoPharm service_key 라벨링 불일치 (본 IR)
다음 선결: 본 IR §8 후속 1~3
```

---
*End of IR-O4O-GLYCOPHARM-SUPPLY-CATALOG-SERVICEKEY-LABELING-AUDIT-V1*
