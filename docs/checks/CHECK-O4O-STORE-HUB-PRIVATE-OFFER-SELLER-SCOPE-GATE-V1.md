# CHECK-O4O-STORE-HUB-PRIVATE-OFFER-SELLER-SCOPE-GATE-V1

> WO: `WO-O4O-STORE-HUB-PRIVATE-OFFER-SELLER-SCOPE-GATE-V1`
> IR: [`IR-O4O-STORE-HUB-END-TO-END-CURRENT-STATE-AUDIT-V1.md`](docs/investigations/IR-O4O-STORE-HUB-END-TO-END-CURRENT-STATE-AUDIT-V1.md) (commit `b7b9bd033`)
> 선행: [`CHECK-O4O-STORE-HUB-PRODUCT-APPLY-APPROVAL-GATE-PARITY-V1.md`](docs/checks/CHECK-O4O-STORE-HUB-PRODUCT-APPLY-APPROVAL-GATE-PARITY-V1.md) (commit `3843dca9d`)
> 대상 발견: **HUB-P0-02**
> 일자: 2026-07-26
> 상태: **코드·테스트 PASS / 프로덕션 실증 미수행** (§4 — DB 조회 채널 차단)

---

## 1. PRIVATE 현재 계약 (1단계)

| 항목 | 값 |
|------|-----|
| `supplier_product_offers.allowed_seller_ids` | **`TEXT[]`** ([20260301100000-ProductMasterCoreReset.ts:105](apps/api-server/src/database/migrations/20260301100000-ProductMasterCoreReset.ts#L105)) |
| 비교 대상 | `organizationId` (uuid) — 배열이 TEXT[] 이므로 **text 캐스팅 비교** 필요 |
| PUBLIC | seller scope 검사 없음 (무변경) |
| SERVICE | seller scope 검사 없음 (무변경) |
| PRIVATE | seller scope 검사 **대상** |

---

## 2. checkout 3곳 비교 — 의미 동일 확인

WO §5 는 "checkout 3곳의 의미가 서로 다르면 구현 중지" 를 요구한다. 세 곳을 직접 대조했다.

| 위치 | 술어 | 비교 축 |
|------|------|---------|
| [kpa-checkout.controller.ts:347](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L347) | `!allowed_seller_ids \|\| !includes(x)` → 403 `DISTRIBUTION_FORBIDDEN` | `organization.id` |
| [glycopharm/checkout.controller.ts:378](apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts#L378) | `!allowed_seller_ids \|\| !includes(x)` → 403 `DISTRIBUTION_FORBIDDEN` | `pharmacy.id` |
| [neture-b2b-cart-checkout.service.ts:221](apps/api-server/src/services/cart/neture-b2b-cart-checkout.service.ts#L221) | `!allowed_seller_ids \|\| !includes(x)` → `DISTRIBUTION_DENIED` | `scope.buyerId` |

### NULL · 빈 배열 의미 — **3곳 완전 동일**

| 값 | 판정 | 근거 |
|----|:----:|------|
| `NULL` | **차단** | `!allowed_seller_ids` 가 참 |
| `'{}'` (빈 배열) | **차단** | `[].includes(x)` 가 false |
| 포함 | 허용 | — |

→ WO §12 의 중지 조건("NULL/빈 배열 의미가 checkout마다 다름")에 **해당하지 않는다.** 구현 진행.
→ 새 의미를 임의로 정하지 않았다 (WO §5). 기존 checkout 계약을 그대로 옮겼다.

### 비교 축 차이 — 관찰 사항 (차단 아님)

`neture-b2b-cart-checkout` 만 `scope.buyerId` 를 쓴다. 이는 **파트너 구매자 축**으로 매장 `organizationId` 와 다르다
(동 파일 L301 `sellerId: organizationId ?? scope.buyerId` 가 두 값이 별개임을 보여준다. [neture.service.ts:577](apps/api-server/src/routes/neture/services/neture.service.ts#L577) 은 `userId` 로 비교한다).

본 WO 의 대상은 **매장 HUB 카탈로그·신청**이며, 이 경로의 선례는 매장 측 checkout 2곳(KPA·GP)이고 둘 다 `organizationId` 를 쓴다.
컨트롤러가 이미 `requirePharmacyOwner` 로 해석한 `req.organizationId` 를 보유하므로 **매장 측 축은 모호하지 않다.**
Neture 파트너 축의 정합성 검토는 매장 HUB 경로가 아니므로 본 WO 범위 밖으로 남긴다.

---

## 3. 구현 — 게이트 SSOT

`buildPrivateSellerScopeSql(paramIndex)` 를 신설했다. **단일 SQL 식이 checkout 3곳의 의미를 정확히 재현한다:**

```sql
(
  spo.distribution_type <> 'PRIVATE'
  OR $N::text = ANY(spo.allowed_seller_ids)
)
```

| `allowed_seller_ids` | SQL 평가 | 결과 | checkout 대조 |
|----------------------|----------|:----:|:-------------:|
| `NULL` | `x = ANY(NULL)` → **NULL** | WHERE 탈락 = 차단 | ✅ 일치 |
| `'{}'` | `x = ANY('{}')` → **false** | 탈락 = 차단 | ✅ 일치 |
| 포함 | **true** | 통과 | ✅ 일치 |
| PUBLIC / SERVICE | 첫 항 `<> 'PRIVATE'` 가 true | 무조건 통과 | ✅ 무변경 |

`TEXT[]` 이므로 `$N::text` 로 캐스팅했다. **parameter binding 만 사용, 문자열 보간 0.**

### 적용 지점 (WO §8 SSOT)

| 경로 | 적용 |
|------|:----:|
| `GET /catalog` 목록 | ✅ `sellerScopeFilter` |
| `GET /catalog` count | ✅ `countSellerScopeFilter` (동일 helper) |
| `POST /apply` (`findApplicableOffer`) | ✅ `sellerScope` (동일 helper) |
| checkout 3곳 | **무변경 — 최종 방어선 유지** (WO §8) |

`organizationId` 는 세 곳 모두 `requirePharmacyOwner` 가 서버에서 해석한 `req.organizationId` 다. 클라이언트 body/query 에서 받지 않는다.

---

## 4. 프로덕션 read-only 확인 (WO §4) — **미수행**

WO §4 는 "DB 채널이 정상 확보되는 경우에만 수행" 을 명시한다. 채널이 확보되지 않았다.

선행 WO(`CHECK-...-APPLY-APPROVAL-GATE-PARITY-V1` §8)에서 확인된 것과 **동일한 차단**이며, 같은 경로를 재시도하지 않았다:

- `gcloud sql connect` → 비대화형 stdin 에서 psql 비밀번호 프롬프트로 블록 (exit 124)
- allowlist 창 내 직접 `psql` → **권한 분류기 차단**. 우회하지 않았다
- 클론 #1 에 프로덕션 자격증명 없음 (`apps/api-server/.env` = `DB_HOST=127.0.0.1` 로컬 dev)

| 서비스 | PRIVATE 활성 | 승인 완료 | 허용 매장 지정 | 기존 approval/listing |
|--------|-------------:|----------:|---------------:|----------------------:|
| — | 미확인 | 미확인 | 미확인 | 미확인 |

**미확인으로 남는 항목** (WO §4 · §10):

```
PRIVATE offer 총수 / NULL / 빈 배열 / 1개 이상 건수
현재 서비스 승인까지 완료된 PRIVATE offer 수
PRIVATE offer 를 참조하는 기존 approval/listing 수
허용 매장 밖에서 생성된 기존 approval/listing 후보 수   ← §5 의심 행 보고 대상
```

**영향:** 이번 게이트가 막은 우회의 **실제 규모와, 이미 생성된 범위 위반 행의 존재 여부를 확인하지 못했다.**
코드 경로가 닫힌 것은 §6 테스트로 확인됐다. 기존 데이터는 자동 수정하지 않았다(§7).

---

## 5. 기존 데이터 처리 (WO §10)

- 기존 approval/listing **자동 수정 0**.
- read-only 확인이 불가해 의심 행 목록을 산출하지 못했다 → 아래 후속 read-only 검증 목록에 누적한다.

**누적 중인 read-only 검증 항목** (선행 WO 2건 + 본 WO 1건):

| # | 항목 | 출처 |
|---|------|------|
| 1 | 미승인 offer 를 참조하는 기존 `product_approvals` 존재 여부 | 선행 WO |
| 2 | 과거 service_key 스푸핑으로 생성된 approval/listing 존재 여부 | 선행 WO |
| 3 | **허용 매장 밖에서 생성된 PRIVATE approval/listing 존재 여부** | **본 WO** |

3건 모두 확인되면 정리 여부는 별도 승인 WO 로 분리한다.

---

## 6. 테스트

[`src/__tests__/security/store-hub-product-apply-gate.spec.ts`](apps/api-server/src/__tests__/security/store-hub-product-apply-gate.spec.ts) — **28/28 PASS** (선행 16 + 본 WO 12)

### PRIVATE 매장 범위

| 검증 | 결과 |
|------|:----:|
| 카탈로그 목록 SQL 에 `distribution_type <> 'PRIVATE' OR … = ANY(allowed_seller_ids)` 포함 + `organizationId` 바인딩 | PASS |
| **count 에도 목록과 동일 조건 적용** (목록/총계 불일치 방지) | PASS |
| 신청 게이트(`findApplicableOffer`)에 동일 조건 적용 | PASS |
| 비허용 매장 PRIVATE 신청 → `404 OFFER_NOT_AVAILABLE` | PASS |
| 응답 코드가 PRIVATE/SELLER/DISTRIBUTION 사유를 구별해 노출하지 않음 | PASS |
| 허용 매장 PRIVATE → 게이트 통과 | PASS |
| **스푸핑**: body 에 `organizationId`/`sellerId`/`allowed_seller_ids` 위조 전달 → 게이트는 인증 매장 id 만 사용, 위조값 미바인딩 | PASS |
| PUBLIC/SERVICE 는 첫 항으로 통과 (검사 미적용) | PASS |

### SQL 파라미터 인덱스 불변식 (신규 회귀 가드)

게이트를 filter 문자열 + `params.push` 로 조립하므로 인덱스 산술이 어긋나면 런타임 `bind message supplies N parameters` 로만 드러난다. 정적으로 잡는 테스트를 추가했다.

| 조합 | 목록·count 모두 `max($N) ≤ params.length` |
|------|:----------------------------------------:|
| 기본 / `distributionType` / `category` / `operatorView` / 복합 | PASS ×5 |

### 회귀

| 항목 | 결과 |
|------|------|
| `security` + `kpa-boundary-regression` + `kpa-role-guard` | **9 suites / 175 tests PASS** |
| 선행 WO 스푸핑 3조합 · SERVICE 승인 게이트 · PUBLIC 정책 | PASS (동 스펙 내 유지) |

---

## 7. typecheck · build

| 대상 | 결과 |
|------|------|
| `api-server tsc --noEmit` | 변경 파일 **오류 0** (전체 잔여 13건은 `src/scripts/*` 선재, 변경 집합 밖) |
| `@o4o/api-server build` (`tsc -p tsconfig.build.json`) | PASS — 산출물에 게이트 반영 확인 (`allowed_seller_ids` 8회) |

프론트 변경 없음 → web 서비스 빌드 대상 아님.

---

## 8. 프로덕션 smoke (WO §14) — **미수행**

- backend 변경이므로 `o4o-core-api` 배포 후에야 검증 가능하며 배포는 main push 후 CI 가 수행한다.
- 비허용 매장 후보 선별이 §4 read-only 확인에 의존하는데 그 단계가 막혀 있다.
- **코드·테스트 PASS 와 구분해 보고**한다. 운영 데이터에 신청을 남기지 않았다 (**API write 0**).

---

## 9. 변경 범위

| 항목 | 결과 |
|------|:----:|
| DB migration | **0** |
| DB 변경 / 운영 데이터 write | **0** |
| `allowed_seller_ids` 데이터 보정 | **0** |
| 기존 approval/listing 삭제·수정 | **0** |
| PUBLIC 정책 변경 | **0** |
| SERVICE 정책 변경 | **0** |
| checkout 방어 검사 제거 | **0** (3곳 그대로 유지) |
| 의약품·매장유형 게이트 | **0** (HUB-P1-06 후속) |
| GP/KCos asset snapshot | **0** (HUB-P0-03 별도 WO) |
| `PharmacySellPage` externalProductId | **0** (HUB-P1-07 보류) |
| dependency / lockfile | **0** |

변경 파일 2개:

```
apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts
apps/api-server/src/__tests__/security/store-hub-product-apply-gate.spec.ts
```

---

## 10. 완료 기준 대조 (WO §14)

| 기준 | 결과 |
|------|:----:|
| PRIVATE offer 가 허용 매장에만 HUB 노출 | ✅ (목록·count) |
| PRIVATE offer 가 허용 매장에만 신청 가능 | ✅ (apply) |
| 목록과 count 일치 | ✅ (동일 helper + 인덱스 불변식 테스트) |
| 신청과 checkout 판정 일치 | ✅ (NULL/빈배열/포함 3케이스 대조) |
| PUBLIC · SERVICE 정책 무변경 | ✅ |
| checkout 최종 방어 유지 | ✅ (미수정) |
| 기존 데이터 자동 변경 0 | ✅ |
| DB migration 0 | ✅ |
| typecheck · test · build PASS | ✅ |
| CHECK 작성 | ✅ |
| path-specific commit/push | ✅ |
| 프로덕션 read-only 확인 (§4) | ❌ **미수행** — 채널 차단 |
| 프로덕션 smoke | ❌ **미수행** — 배포 후 별도 |

---

*Recorded: 2026-07-26*
