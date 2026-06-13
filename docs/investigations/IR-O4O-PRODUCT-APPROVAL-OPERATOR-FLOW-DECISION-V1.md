# IR-O4O-PRODUCT-APPROVAL-OPERATOR-FLOW-DECISION-V1

> **유형:** Read-only Decision IR (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** Supply Catalog 신청 승인 운영 흐름의 canonical 정책 결정 — ① GP/KCos operator 승인 surface 부여 여부, ② 승인 시 OPL active 정책, ③ approve 구현 canonical.
> **작성일:** 2026-06-13 · 기준 HEAD `2f2122559`
> **선행:** `IR-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-AUDIT-V1`(승인 surface KPA-only, KPA approve=직접 SQL OPL active=true, V2 internal=active=false)

---

## 0. 핵심 결론 (Decision Summary)

| 결정 | 선택 | 한줄 근거 |
|------|:---:|-----------|
| **D1. GP/KCos operator 승인 surface** | **A — 3서비스 모두 부여** | 신청(PENDING)만 만들고 승인 UI 없으면 운영 흐름 단절. KPA 패턴 재사용 가능(approve SQL 이미 serviceKey-generic). |
| **D2. 승인 시 OPL active 정책** | **A — active=true (단, storefront 진열과 분리)** | active=true=내 매장 O4O **주문 가능 상품 편입 자격**. 소비자 storefront 노출은 OPC+channel APPROVED 별도 gate. |
| **D3. approve 구현 canonical** | **B — `ProductApprovalV2Service` 중심 통일** | KPA 직접 SQL 흡수, V2 서비스에 `activateListing` 옵션 + (필요 시)offer listings 일괄활성 parity 추가. |
| **KPA 승인 화면 메뉴 노출** | **yes** | route/기능 존재(데드링크 아님) → 사이드바 `approvals` 그룹 노출. |

**핵심:** "신청 → **운영자 승인** → 내 매장 O4O 주문 가능 상품 편입" 흐름을 **3서비스 공통**으로 닫는다. 승인=OPL active=true(주문 가능 자격), **소비자 storefront 진열은 별도 채널 gate로 분리**. 구현은 KPA 직접 SQL 을 폐기하고 `ProductApprovalV2Service` 로 통일(active 옵션화).

---

## 1. 목적

선행 IR 이 드러낸 두 갈림길(GP/KCos 승인 surface 부재, KPA direct-SQL active=true vs V2 internal active=false)을 **구현 전에 정책으로 확정**한다. read-only — 결정·재사용성 분석만, 코드 무변경.

## 2. 선행 사실

- **승인 surface:** KPA 만 `/operator/product-applications`(`kpa:operator`). GP/KCos 부재(internal X-Admin-Secret 외 승인 불가).
- **승인 구현 분기:** KPA operator = 직접 SQL(OPL upsert active=true + offer listings 일괄활성). V2 internal = `approveServiceProduct()`(OPL active=false, 일괄활성 없음).
- **store/my-products:** operator listings(GET)는 is_active 무관 반환. **소비자 storefront(GP 4-gate)는 OPL.is_active=true + OPC is_active + channel APPROVED 요구.** (선행 IR 확인)

## 3. 결정 항목

D1 GP/KCos 승인 surface(A 모두/B KPA만/C 제한/D 중앙통합) · D2 OPL active(A true/B false+별도/C dist별/D service별) · D3 구현 canonical(A KPA복제/B V2중심/C 신규공통서비스/D 현상유지) · KPA 메뉴 노출.

---

## 4. Phase 1 — KPA approval surface 재사용성

| 항목 | 현재 KPA 구현 | GP/KCos 재사용성 | 보정 필요 |
|------|---------------|------------------|-----------|
| backend 컨트롤러 factory | `createOperatorProductApplicationsController(ds, requireAuth, requireScope, log)` (controller:33) | **높음** — factory 가 이미 requireScope 주입식 | scope 리터럴 `'kpa:operator'`(controller:43) → `'{service}:operator'` 파라미터화 |
| approve SQL serviceKey | `serviceKey = approval.service_key \|\| 'kpa-society'`, listings 일괄활성 `WHERE service_key=$2` | **높음** — approve 로직이 approval row 의 service_key 로 동작(서비스 비특정) | `\|\| 'kpa-society'` fallback 제거/일반화 |
| route mount | `kpa.routes.ts:246` `/operator/product-applications` (KPA only) | 패턴 복제 | glycopharm.routes/cosmetics.routes 에 동일 mount + 서비스 scope |
| frontend page | `ProductApplicationManagementPage.tsx` (KPA `apiClient`, `/operator/product-applications/*`) | **공통 추출 후보** | operator-core-ui 모듈로 추출(members/forum 콘솔 패턴) + 서비스별 apiClient/serviceKey 주입 |
| list/stats/approve/reject/batch/delete | 전부 구현 | 그대로 재사용 | 라벨/serviceKey 만 |

**판정:** **재사용성 높음.** approve 핵심 SQL 이 이미 serviceKey-generic(approval.service_key 사용)이라, 일반화 부담은 **(a) scope 리터럴 파라미터화 + (b) route mount 복제 + (c) frontend page 공통 추출**에 한정. → **D1=A 실현 가능.**

---

## 5. Phase 2 — approve implementation 통일 방향

| 항목 | KPA direct SQL | `ProductApprovalV2Service.approveServiceProduct()` | 차이 | canonical 후보 |
|------|----------------|---------------------------------------------------|------|----------------|
| approval 상태 전이 | UPDATE→approved (직접) | repo save→APPROVED | 동등 | V2 |
| OPL 생성 | INSERT/UPSERT **active=true** | create **is_active=false** | **active 정책 상반** | V2 + `activateListing` 옵션 |
| 추가 활성화 | **offer 의 kpa-society listings 일괄 active=true**(auto-expansion 분 포함) | 없음(단건만) | **KPA 만 일괄활성** | 옵션화(서비스 정책) |
| reject | (KPA) `ProductApprovalV2Service.rejectServiceApproval()` 이미 사용 | 동일 | 동등 | V2(이미 통일) |
| transaction | manager.transaction + SAVEPOINT(FK 방어) | 트랜잭션 | 유사 | V2 + SAVEPOINT 흡수 |

**판정:** **D3=B (V2 중심 통일).** `approveServiceProduct(..., { activateListing?: boolean })` 옵션 추가(operator approve=true, 기존 internal=false 유지 가능) + KPA 의 **offer listings 일괄활성** 동작은 별도 sub-decision(유지할지/단건만 할지)으로 impl WO 에서 확정. KPA 직접 SQL 은 폐기/흡수. (reject 는 이미 V2.)

> ⚠ sub-decision: KPA 직접 SQL 의 "offer 의 서비스 listings 일괄 active" 는 auto-expansion(다른 org 에 미리 생성된 listing 까지 활성)을 포함 — 이 동작을 V2 통일 시 **유지할지** 정책 결정 필요(매장별 승인 vs offer 단위 일괄). impl WO 에서 확정.

---

## 6. Phase 3 — OPL active policy

| 정책 | 장점 | 위험 | 판정 |
|------|------|------|:---:|
| A active=true | 승인 즉시 "내 매장 주문 가능 상품" 편입 — 운영자 UX 직관적 | storefront 즉시 노출 오해 가능 → **OPL active ⊥ 채널 진열 분리로 해소** | **✅ 채택** |
| B active=false+별도 활성화 | 명시적 2단계 | 승인 후 또 활성화 단계 = 운영 부담, GP/KCos UI 미비 시 단절 | 비채택 |
| C dist별 | 세밀 | 복잡·근거 약함 | 비채택 |
| D service별 | — | 현 drift 고착 | 비채택 |

**의미 분리(필수):**
- `OPL.is_active=true` = **내 매장 O4O 주문 가능 상품 편입 자격**(operator listings·storefront 4-gate 의 OPL 게이트 통과).
- **소비자 storefront 진열** = `OPC.is_active=true` + `channel APPROVED`(B2C) — **별도 gate, 본 결정과 분리.**

**판정:** **D2=A (active=true)**, 단 storefront 진열은 별도 채널 정책으로 둔다(선행 IR `IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1` 후속에서 정리).

---

## 7. Phase 4 — operator menu / surface 정책

| 서비스 | route(권장) | 메뉴명(권장) | 그룹 위치 | 판정 |
|--------|-------------|--------------|-----------|:---:|
| KPA | `/operator/product-applications`(기존) | **공급 상품 신청 승인** | `approvals` 그룹 | 메뉴 노출(B→A) |
| GlycoPharm | `/operator/product-applications`(신규 mount) | 공급 상품 신청 승인 | `approvals` 그룹(매장 승인·이벤트오퍼 옆) | 신규 |
| K-Cosmetics | `/operator/product-applications`(신규 mount) | 공급 상품 신청 승인 | `approvals` 그룹(신청·이벤트오퍼 옆) | 신규 |

- 메뉴명 회피: "판매자 모집"/"B2B 승인"/"상품 판매 승인"(B2C·모집 혼동). 채택: **"공급 상품 신청 승인"**(또는 "공급 승인 요청").
- 기존 `store approvals`(매장 가입)·`event offers approvals`(이벤트)와 **별도 항목**으로 분리(혼동 금지).

---

## 8. Phase 5 — Decision

| 결정 항목 | 선택 | 이유 | 후속 WO |
|-----------|:---:|------|---------|
| GP/KCos operator 승인 surface | **A** | 신청-승인 단절 해소, KPA 패턴 재사용성 높음(§4) | `WO-...-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1` |
| OPL active 정책 | **A (true)** | 승인=주문 가능 자격, storefront 진열 분리(§6) | (활성/진열 정책 IR 후속) |
| approve implementation canonical | **B (V2 중심)** | KPA 직접 SQL 흡수, active 옵션화·일괄활성 sub-decision(§5) | `WO-...-APPROVE-IMPL-UNIFY-V1` |
| KPA menu exposure | **yes** | route/기능 존재(데드링크 아님) | `WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1` |

---

## 9. 후속 WO (권장 순서)

1. **`WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1`** (C/D) — `ProductApprovalV2Service.approveServiceProduct` 에 `activateListing` 옵션 추가(+ offer listings 일괄활성 sub-decision 확정) → KPA 컨트롤러를 V2 호출로 전환, 직접 SQL 폐기. **선행**(surface enable 전에 구현 통일).
2. **`WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1`** (D) — KPA 컨트롤러 scope 파라미터화 + glycopharm/cosmetics route mount + `ProductApplicationManagementPage` 공통 추출(operator-core-ui)·GP/KCos thin wrapper.
3. **`WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1`** (B) — KPA + (2 적용 후)GP/KCos `approvals` 그룹에 "공급 상품 신청 승인" 노출.
4. **`IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1`** (C) — OPL active ⊥ 채널 진열 분리 정책 문서화.
5. **`WO-O4O-SUPPLY-CATALOG-APPROVAL-FLOW-DOCUMENTATION-V1`** — 신청→승인→active→진열→주문가능 운영자 가이드.

> 순서 근거: **구현 통일(1)이 surface enable(2)보다 선행** — 통일 안 된 채 GP/KCos 에 KPA 직접 SQL 을 복제하면 drift 가 3서비스로 확산된다.

---

## 10. 결론

- **D1=A:** GP/KCos 에도 operator 승인 surface 부여. KPA approve SQL 이 이미 serviceKey-generic(approval.service_key 기반)이라 재사용성 높음 — scope 파라미터화 + route mount + frontend 공통 추출로 실현.
- **D2=A:** 승인 시 OPL `is_active=true`(주문 가능 상품 편입 자격). 단 **소비자 storefront 진열은 OPC+channel APPROVED 별도 gate** 로 분리.
- **D3=B:** `ProductApprovalV2Service` 를 canonical 로, `activateListing` 옵션 추가 + KPA 직접 SQL 폐기. offer listings 일괄활성 동작은 impl WO 의 sub-decision.
- **KPA 메뉴 노출=yes**, 메뉴명 "공급 상품 신청 승인".
- **권장 착수 순서: ①구현 통일 → ②GP/KCos surface enable → ③메뉴 노출 → ④활성/진열 정책 문서.** 통일을 먼저 해야 drift 확산을 막는다.

---

## 11. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-PRODUCT-APPROVAL-OPERATOR-FLOW-DECISION-V1.md`)
- [x] 코드/DB/migration/route/UI/API 변경 없음 (read-only), production write 없음
- [x] Phase 1 재사용성(KPA 컨트롤러 factory/approve SQL serviceKey-generic 직접 확인) / Phase 2 통일 방향 / Phase 3 active 정책 / Phase 4 메뉴 / Phase 5 Decision
- [x] D1/D2/D3/메뉴 결정 + 근거 + 후속 WO 순서
- [x] 다른 세션 WIP(forum/contact/lms 등) 미접촉

---

*End of IR-O4O-PRODUCT-APPROVAL-OPERATOR-FLOW-DECISION-V1*
