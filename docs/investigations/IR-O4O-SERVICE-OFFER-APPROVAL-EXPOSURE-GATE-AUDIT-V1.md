# IR-O4O-SERVICE-OFFER-APPROVAL-EXPOSURE-GATE-AUDIT-V1

> **유형:** Read-only Investigation Report
> **작성일:** 2026-06-18
> **검증:** 정적 코드 분석 + 프로덕션 read-only API 호출(운영자/약국 토큰, GET 위주) + 정상 플로우 상태 확인. raw SQL UPDATE 미사용.
> **결론(요약):**
> - **결함 1 (P0, 진성 구조 결함):** 약국 HUB **catalog 조회**(`pharmacy-products.controller.ts GET /catalog`, KPA/Glyco/KCos 공유)는 `spo.is_active = true` **전역 플래그만** 게이트하고, **요청 서비스의 `offer_service_approvals.approval_status='approved'` per-service 필터가 전혀 없다.** → 한 서비스에서 승인되어 `is_active=true`가 된 SERVICE/PUBLIC 상품이 **승인하지 않은 다른 서비스의 HUB catalog에도 노출**된다(교차 서비스 누출).
> - **결함 2 (재분류: 토큰/세션 이슈, 코드 결함 아님):** `/operator/product-applications` 의 "승인 탭만 scope 오류"는 **정상 KPA operator 토큰(sohae2100, serviceKey=kpa-society)으로 전 탭 HTTP 200 — 재현되지 않음.** 모든 탭은 동일 endpoint(`?status=`)·동일 guard를 사용한다. 오류는 **요청 토큰에 `kpa:operator`가 없고 차단 prefix(neture/platform/glycopharm/cosmetics) role이 있을 때만** 발생 → 브라우저 세션/토큰 scope 문제.

---

## 1. 조사 범위

| 영역 | 대상 |
|------|------|
| HUB 노출 | `apps/api-server/src/routes/o4o-store/controllers/pharmacy-products.controller.ts` `GET /catalog` (KPA/Glyco/KCos 공유) |
| 승인→리스팅 | `apps/api-server/src/utils/auto-listing.utils.ts`, `offer-service-approval.service.ts syncOfferFromServiceApprovals` |
| KPA 승인 화면 | FE `services/web-kpa-society/.../ProductApplicationManagementPage.tsx` + `@o4o/operator-core-ui ProductApplicationManagementConsole` / BE `routes/kpa/controllers/operator-product-applications.controller.ts` |
| scope guard | `packages/security-core/src/service-scope-guard.ts`, `service-configs.ts`, `membership-guard.middleware.ts` |

---

## 2. 결함 1 — 승인 전(또는 타 서비스 승인) 상품의 HUB catalog 노출 (P0)

### 2.1 노출 경로 (확정)

약국이 상품을 발견/신청하는 HUB catalog API:

`pharmacy-products.controller.ts:70 GET /catalog` → 핵심 쿼리(`:132-145`):

```sql
FROM supplier_product_offers spo
JOIN product_masters pm ON pm.id = spo.master_id
JOIN neture_suppliers s ON s.id = spo.supplier_id
WHERE spo.distribution_type IN ('PUBLIC', 'SERVICE', 'PRIVATE')
  AND spo.is_active = true          -- ← 유일한 승인성 게이트(전역 플래그)
  AND s.status = 'ACTIVE'
  ${categoryFilter} ${distributionFilter} ${operatorFilter}
```

**문제: `offer_service_approvals` 와의 JOIN/필터가 전혀 없다.** 요청 service_key(kpa-society/glycopharm/cosmetics)에 대한 `approval_status='approved'` 조건이 부재하다. 이 컨트롤러는 KPA(`kpa.routes.ts`)·GlycoPharm·K-Cosmetics(`cosmetics.routes.ts`) 라우트에 **공유 등록**되어 동일 쿼리가 세 서비스 모두에서 돈다 → **catalog는 service-agnostic**.

### 2.2 `is_active` 의 의미 (확정)

`SupplierProductOffer.entity.ts:85` → `is_active` **default false**. 승인 시에만 true 전환:
- `syncOfferFromServiceApprovals` APPROVED 분기(`offer-service-approval.service.ts:372-373`): `UPDATE supplier_product_offers SET ... is_active = true` — **ANY 서비스 1건이라도 approved 면 offer 전역 is_active=true**.

### 2.3 결과 (누출 시나리오)

| 상황 | is_active | catalog 노출 | 정책 부합? |
|------|:---------:|:-----------:|:---------:|
| 어느 서비스에도 미승인(신규/전부 pending) | false | ❌ 미노출 | ✅ (is_active로 차단됨) |
| glycopharm 승인 / kpa-society 미승인(SERVICE) | **true** | **KPA catalog에 노출됨** | ❌ **누출** |
| PUBLIC 승인(auto-expand 전체) | true | 전 서비스 노출 | △ PUBLIC은 의도일 수 있으나 게이트 부재는 동일 |

즉 **"한 번도 승인 안 된 상품"은 `is_active`로 막히지만, "타 서비스에서 승인된 상품"은 미승인 서비스 HUB에 그대로 노출**된다. 서비스 운영자 승인이 그 서비스 HUB 노출의 게이트가 되어야 하는데, catalog는 이를 강제하지 않는다.

### 2.4 대조군 — 리스팅 생성 계층은 올바름

`auto-listing.utils.ts:80-99` (autoExpandServiceProduct)는 `offer_service_approvals osa ... AND osa.service_key=$2 AND osa.approval_status='approved'` 로 **per-service 승인을 정확히 검증**한다. 즉 `organization_product_listings` 생성은 올바르게 게이트되지만, **catalog 브라우즈는 listings를 거치지 않고 `supplier_product_offers`를 직접 조회**하여 이 게이트를 우회한다.

### 2.5 실증 (프로덕션 read-only)

- 약국(renagang21, serviceKey=kpa-society) `GET /kpa/pharmacy/products/catalog` → offer `3adc23b1`("미네락 600", PUBLIC) 노출 확인. (조회 시점 기준 해당 offer는 glycopharm·kpa-society **양쪽 approved**라 현 시점 노출 자체는 정당 — 라이브 누출 인스턴스는 아님.)
- **코드 레벨로 게이트 부재는 확정**: catalog WHERE에 per-service 승인 조건이 0건. SERVICE 타입이 단일 서비스 승인일 때 타 서비스 catalog 노출은 구조적으로 발생.

### 2.6 영향 범위 (Shared Module)

`/catalog` 컨트롤러는 KPA·GlycoPharm·K-Cosmetics **공통**. 세 서비스 모두 동일 결함. (CLAUDE.md Shared Module Change Rule 대상 — 수정 시 3서비스 동시 검증 필수.)

---

## 3. 결함 2 — KPA 운영자 승인 화면 scope 오류 (재분류: 토큰/세션)

### 3.1 증상 vs 실측

증상: `kpa-society.co.kr/operator/product-applications` 의 "승인" 탭에서
`Required scope: kpa:operator. kpa service requires kpa:* roles.`

**실측 (프로덕션, sohae2100 serviceKey=kpa-society 토큰):**

| 호출 | 결과 |
|------|------|
| `GET /kpa/operator/product-applications?status=pending` | **HTTP 200** (data: []) |
| `GET ...?status=approved` | **HTTP 200** (data 1건: offer 3adc23b1, product_approvals approved) |
| `GET ...?status=rejected` | **HTTP 200** (data: []) |
| `GET .../stats` | **HTTP 200** (`{pending:0, approved:1, rejected:0}`) |

→ **"승인 탭만 실패" 재현 안 됨.** 정상 KPA operator 토큰으로 전 탭/통계 정상.

### 3.2 코드상 탭 구조 (확정 — 탭별 차이 없음)

- FE 공유 콘솔 `ProductApplicationManagementConsole.tsx:73,115-118`: `statusFilter` 변경 시 **모든 탭이 동일 `api.list({status})`** 호출. approved 전용 별도 호출/엔드포인트 **없음**.
- BE `operator-product-applications.controller.ts:62`: `router.use(requireAuth, requireScope(scope))` — **모든 라우트 동일 guard**. `status=approved/pending`은 `:88` WHERE 절(`pa.approval_status=$N`)만 다름. status별 guard 차이 없음.

→ 코드상 "승인 탭만 다른 scope를 요구"하는 경로는 존재하지 않는다.

### 3.3 오류 발생 조건 (확정)

`service-scope-guard.ts:82-102`: `hasScope || hasServiceRole`(= `kpa:operator`/`kpa:admin` 보유) 이면 통과. 아니면서 **차단 prefix(`platform`/`neture`/`glycopharm`/`cosmetics`) role 보유 시** `:101` 메시지로 403.

즉 이 오류는 **요청 토큰이 `kpa:operator`/`kpa:admin`을 갖지 못한 채 neture/platform 등 타 서비스 role을 가질 때** 발생한다. (sohae2100은 neture:operator/admin + platform:super_admin 보유 — 만약 kpa-society 컨텍스트 토큰에 kpa:operator가 실리지 않으면 정확히 이 메시지가 난다.)

### 3.4 판정

**코드 결함이 아니라 브라우저 세션/토큰 scope 문제.** 직전 세션에서 "다른 아이디로 조회"한 계정 혼동(공급자 목록 0건 오인)과 동일 계열 — KPA operator 페이지를 **kpa:operator scope가 없는 토큰**(neture/platform 세션 잔존, 또는 KPA 멤버십/role 미할당)으로 호출했을 가능성이 높다. 탭 특정성은 부수적(캐시된 초기 로드 vs 재요청 시 토큰 컨텍스트 차이)으로 보인다.

### 3.5 부수 리스크 (별개 — 본 오류 원인 아님)

일부 백엔드 파일이 role 리터럴을 `kpa:operator`(role prefix)가 아닌 **`kpa-society:operator`(canonical serviceKey)** 로 사용(예: `modules/neture/controllers/product-candidate.controller.ts`, `routes/operator/*.routes.ts` 다수). `service-configs.ts`의 `ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY = { kpa: 'kpa-society', cosmetics: 'k-cosmetics' }` 매핑과 어긋나 잠재 혼선 → 별도 일관화 점검 권장(이번 화면 오류의 직접 원인은 아님).

---

## 4. 결론 분류

| 항목 | 판정 |
|------|------|
| 결함 1 (HUB catalog per-service 승인 게이트 부재) | ✅ **진성 P0 구조 결함** (코드 확정 + 영향 3서비스) |
| 결함 2 (KPA 승인 화면 scope 오류) | ◻︎ **코드 결함 아님** — 토큰/세션 scope 이슈(정상 토큰 전 탭 200) |

---

## 5. 후속 WO 후보

### P0-1 (권고) — HUB catalog 승인 게이트
```text
WO-O4O-SERVICE-OFFER-HUB-EXPOSURE-APPROVAL-GATE-FIX-V1
```
수정 방향:
```text
pharmacy-products.controller.ts GET /catalog 쿼리에 요청 service_key 기준
offer_service_approvals.approval_status='approved' 게이트 추가.
- SERVICE/PRIVATE: 해당 service_key approved 필수
- PUBLIC: 전체 노출이 정책상 의도인지 먼저 확정(전체 공개 = 모든 서비스). 의도면 PUBLIC만 예외, 아니면 PUBLIC도 per-service 승인 요구.
KPA/Glyco/KCos 공유 컨트롤러 → 3서비스 동시 검증(Shared Module Rule).
count 쿼리(:167-178)도 동일 조건 동기화.
operatorView/distributionType 분기 회귀 없게.
```

### 확인 (코드 수정 불요) — KPA scope 오류
```text
없음(WO 불필요). 운영 점검 항목:
1. 오류 발생 브라우저의 실제 토큰 roles 확인(JWT decode / role_assignments).
2. 해당 계정이 kpa-society 에 kpa:operator/admin 보유하는지 확인.
3. kpa-society.co.kr 진입 시 발급 토큰에 kpa scope 가 실리는지(세션/serviceKey) 확인.
```

### 별도 후보 (선택)
```text
WO-O4O-OPERATOR-ROLE-LITERAL-KPA-PREFIX-CONSISTENCY-V1
- 백엔드 'kpa-society:operator' 리터럴 → 'kpa:operator' 정합화(§3.5).
```

---

## 6. 검증 항목 (후속 WO 시)

### HUB catalog (P0-1)
```text
1. SERVICE offer를 glycopharm만 승인 → KPA 약국 catalog에 미노출이어야 함
2. kpa-society 승인 후 → KPA catalog 노출 가능
3. rejected/pending(kpa-society) → KPA catalog 미노출
4. PUBLIC 정책 확정대로 동작
5. GlycoPharm / K-Cosmetics catalog 동일 검증
6. 기존 정상 승인 상품 회귀 없음
```

### KPA 화면 (점검)
```text
정상 kpa:operator 토큰으로 전체/승인대기/승인/거절 전 탭 200 (이미 확인)
오류 재현 계정의 토큰 roles 확인
```

---

## 7. 하지 않은 것 / 데이터 영향

- 코드/DB/enum/API/UI 변경 없음. raw SQL UPDATE 없음.
- 검증은 운영자/약국 토큰 read-only GET 위주. (offer `3adc23b1` 상태 전이는 본 IR 이전 단계에서 발생한 것으로, 본 IR은 read-only 관측만 수행.)
- 본 IR 문서 1개만 산출.

---

*Generated as read-only investigation. Implementation requires separate WO approval per CLAUDE.md.*
