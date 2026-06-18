# CHECK-O4O-SERVICE-OFFER-HUB-EXPOSURE-APPROVAL-GATE-FIX-V1

> **유형:** Implementation Check Report (P0)
> **작성일:** 2026-06-18
> **WO:** `WO-O4O-SERVICE-OFFER-HUB-EXPOSURE-APPROVAL-GATE-FIX-V1`
> **선행 IR:** `IR-O4O-SERVICE-OFFER-APPROVAL-EXPOSURE-GATE-AUDIT-V1`
> **결과:** ✅ 코드 수정 완료. PUBLIC 승인 예외 유지 + SERVICE/PRIVATE per-service 승인 게이트 추가. DB/migration 없음. api-server typecheck PASS. catalog smoke = 배포 후 수행.

---

## 1. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts` | `GET /catalog` 메인/카운트 쿼리에 per-service 승인 게이트 추가 + 매핑 상수(`STORE_SERVICE_KEY_TO_APPROVAL_KEY`) |

**DB migration / schema / enum 변경 없음.** Frontend 무변경. (KPA/Glyco/KCos 공유 컨트롤러 단일 수정 → 3서비스 동시 적용)

---

## 2. 기존 결함 요약

`GET /catalog`(약국 HUB 상품 발견)는 `spo.is_active = true`(전역 플래그)만 게이트하고, 요청 서비스의 `offer_service_approvals.approval_status='approved'` per-service 필터가 부재했다. `is_active`는 ANY 서비스 1건 승인 시 전역 true가 되므로, 한 서비스에서 승인된 SERVICE/PRIVATE 상품이 **미승인 다른 서비스 HUB catalog에 노출**됐다(교차 서비스 누출). (상세: IR §2)

---

## 3. PUBLIC 승인 예외 유지 (확인)

게이트는 `distribution_type='PUBLIC'` 을 OR 단락으로 통과시킨다 → **PUBLIC 은 서비스 운영자 승인 없이 기존대로 노출 가능**(정책 §3 부합). PUBLIC 에는 어떤 추가 승인 조건도 적용하지 않았다.

---

## 4. SERVICE / PRIVATE serviceKey별 승인 게이트 적용 방식

추가된 WHERE 절(main + count 동일):

```sql
AND (
  spo.distribution_type = 'PUBLIC'
  OR EXISTS (
    SELECT 1 FROM offer_service_approvals osa
    WHERE osa.offer_id = spo.id
      AND osa.service_key = $N          -- 현재 서비스(approvalServiceKey)
      AND osa.approval_status = 'approved'
  )
)
```

- PUBLIC → 무조건 통과(예외).
- SERVICE / PRIVATE → 현재 서비스 `offer_service_approvals` 가 `approved` 인 offer만 통과.
- 타 서비스 approved row 는 `osa.service_key = $N` 격리로 현재 서비스 catalog 에 영향 없음 → **교차 서비스 누출 차단**.

### serviceKey 매핑 (확정)

catalog 팩토리 serviceKey(role-prefix) → `offer_service_approvals.service_key`(platform-level):

| 팩토리 serviceKey | osa.service_key |
|------|------|
| `kpa` | `kpa-society` |
| `glycopharm` | `glycopharm` |
| `cosmetics` | `k-cosmetics` |

근거: `APPROVAL_ELIGIBLE_SERVICE_KEYS = ['glycopharm','kpa-society','k-cosmetics']`(approval-service-keys.ts) 와 정확히 일치. `store-owner.utils.ts STORE_OWNER_SCOPE_TO_MEMBERSHIP_KEY` 와 동일 매핑(정책 SSOT 정합).

마운트(모두 serviceKey 전달): `kpa.routes.ts:382('kpa')`, `glycopharm.routes.ts:383('glycopharm')`, `cosmetics.routes.ts:135('cosmetics')`.

> back-compat: 팩토리 `serviceKey` 미지정 마운트는 게이트 미적용(기존 동작 보존). 현재 3개 마운트 모두 serviceKey 전달하므로 실제 누락 경로 없음.

---

## 5. PRIVATE 기존 조건 유지 여부

**catalog 쿼리에는 기존 PRIVATE 전용 노출 조건(allowedSellerIds/계약/모집 등)이 존재하지 않았다.** 현 쿼리는 PRIVATE 도 다른 타입과 동일하게 `is_active=true`만으로 노출하고 있었다. 따라서 이번 게이트는 PRIVATE 에 **승인 조건을 가산(tightening)** 할 뿐, 제거/완화한 기존 조건이 없다. (allowedSellerIds 등 별도 가시성 로직은 `/apply`·listings 등 타 경로 소관 — 본 WO 미접촉)

---

## 6. DB / migration 무변경 확인

- ✅ migration 없음, schema/enum 변경 없음. 기존 `offer_service_approvals` 테이블을 조회만.
- ✅ `organization_product_listings` 생성 정책·`auto-listing.utils.ts` 미변경.
- ✅ 운영자 product-applications 화면·KPA scope 이슈 미접촉(WO 범위 외).

---

## 7. 검증 결과

### 7.1 Typecheck — PASS
`npx tsc --noEmit -p tsconfig.build.json` → 변경 파일 error 0. 유일 에러 `marketTrialController.ts(105,9)` 는 본 WO 무관 pre-existing.

### 7.2 Param 인덱싱 정합 (정적 검토)
- main: params `[org,limit,offset]`(고정 $1-$3) 뒤 category/dist/approval 순서대로 push, `$${params.length}` 사용. `LIMIT $2 OFFSET $3` 충돌 없음.
- count: countParams(operatorView ? [org] : []) 뒤 category/dist/approval push, `$${countParams.length}` 사용. main/count 게이트 동기화.

### 7.3 Catalog smoke — 부분 PASS (2026-06-18, 배포 후)

**배포 확인:** o4o-core-api revision `o4o-core-api-02245-kbj` (commit `46cf5b516` Deploy API Server success).

| 검증 | 결과 |
|------|------|
| **[PUBLIC 회귀]** KPA 약국 catalog (renagang21) | ✅ 미네락 600(PUBLIC) 여전히 노출, total 1, HTTP success → **PUBLIC 승인 예외 유지, 회귀 없음** |
| **[게이트 활성]** distributionType=SERVICE 필터 | SERVICE 0건(현 환경 SERVICE offer 부재) — 쿼리 정상(에러 없음) |
| **[SERVICE/PRIVATE 교차 누출 차단]** | ◻︎ 코드 보장(게이트 EXISTS `service_key=$N AND approved`). 현 환경에 SERVICE/PRIVATE offer 부재로 실데이터 실증 미수행 |

> 핵심 사용자 요구(PUBLIC 예외 유지)는 라이브로 확인됨. SERVICE/PRIVATE 누출 차단은 SQL 게이트로 보장되나, 환경에 SERVICE/PRIVATE offer가 없어(유일 offer = PUBLIC) 실데이터 시나리오는 전용 테스트 offer 생성 시 검증 가능(요청 시).

---

## 8. 회귀 영향

| 항목 | 결과 |
|------|------|
| PUBLIC 상품 노출 | 무변경(OR 예외) |
| KPA/Glyco/KCos catalog 조회 | 정상(게이트만 추가) |
| operatorView / distributionType / recommended 분기 | 무변경(게이트는 추가 AND) |
| 운영자 승인 목록 / Neture 공급자 목록 | 무접촉 |
| 제품 승인 submit/reject/resubmit | 무접촉 |
| DB/migration | 없음 |

---

## 9. 중단 기준 점검 (모두 비해당)

| 조건 | 해당? |
|------|:----:|
| current serviceKey 안전 확인 불가 | No — 팩토리 serviceKey(3마운트 전달) |
| osa service_key 표기 서비스별 불일치 | No — APPROVAL_ELIGIBLE_SERVICE_KEYS 와 매핑 일치 |
| spo.id ↔ osa.offer_id 연결 불명확 | No — offer_service_approvals.offer_id = supplier_product_offers.id |
| PRIVATE 기존 조건 결합 불명확 | No — catalog 에 기존 private 조건 부재(순수 가산) |
| PUBLIC/SERVICE 분기가 pagination/count 깨뜨림 | No — main/count 동일 게이트 |
| OrganizationProductListing 정책까지 확대 | No |
| 다른 세션 WIP 충돌 | No |

---

## 10. 완료 기준 대비

| 기준 | 상태 |
|------|:----:|
| PUBLIC 승인 없이 노출 가능 | ✅ |
| SERVICE 현재 serviceKey approved 시만 노출 | ✅ (게이트) |
| PRIVATE 현재 serviceKey approved 시만 노출 | ✅ (게이트, 기존 조건 무변경) |
| 교차 서비스 누출 차단 | ✅ (service_key 격리) |
| KPA/Glyco/KCos catalog 정상 | ✅ KPA catalog PUBLIC 회귀 PASS(§7.3) |
| 운영자 승인 목록 / 공급자 목록 무영향 | ✅ (무접촉) |
| DB/migration 없음 | ✅ |
| backend typecheck 통과 | ✅ |
| CHECK 문서 작성 | ✅ |
| path-specific commit/push | ✅ commit `46cf5b516` |
| catalog smoke | ◻︎ 부분 PASS — PUBLIC 회귀 확인, SERVICE/PRIVATE 실증은 테스트 offer 필요(§7.3) |

---

*P0 fix. 전역 is_active 의존 → distributionType별 승인 정책 정합. PUBLIC 예외 유지, SERVICE/PRIVATE per-service 게이트.*
