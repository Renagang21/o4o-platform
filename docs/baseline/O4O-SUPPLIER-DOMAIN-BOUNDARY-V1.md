# O4O-SUPPLIER-DOMAIN-BOUNDARY-V1

> **상태**: Active · **FROZEN ARCHITECTURE** — 구조 변경은 명시적 WO 필수 (버그 수정 · 성능 · 문서 · 테스트는 허용)
> **근거 WO**: [`WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1`](../work-orders/WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1.md)
> **소스 계약**: `apps/api-server/src/__tests__/supplier-domain-boundary.spec.ts`
> **상위 정본**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) — 역할 경계가 충돌하면 그 문서가 우선
> **작성**: 2026-09-26

이 문서는 Supplier 영역을 **더 확장하기 위한 설계서가 아니다.** 여러 WO 를 거쳐 커진 구현을 초기 역할 정의로 수렴시킨 뒤 **경계를 동결한 기록**이다. 새 Supplier 기능 제안은 이 문서의 5축 안에 들어오는지를 먼저 통과해야 한다.

---

## 1. Supplier 정의

```text
Supplier
= 상품/콘텐츠를 제공하고
  결제 완료 주문을 처리하며
  직접 배송하는 사업자 Organization 의
  Neture service profile
```

**Organization 이 사업자 주체이고, `neture_suppliers` 는 그 Organization 의 Neture 서비스 프로필이다.** 이 구분이 Identity(§6) 와 Business Profile(§7) 전체의 근거다.

---

## 2. 5개 업무축

이 다섯 개 + utility(`Home` · `Settings`) 가 전부다. **Supplier 가 이 밖의 플랫폼 책임을 갖지 않는다.**

| 축 | 책임 | 정본 리소스 |
|---|---|---|
| **Business** | 계정 · 조직 · 사업자관계 · 서비스 프로필 | `organizations` · `organization_members` · `neture_suppliers` |
| **Products** | 공급 상품 · 가격 · 공급조건 · 서비스 유통 | `product_masters`(read) · `supplier_product_offers`(write) |
| **Orders** | 결제 완료 주문 처리 · 직접 배송 상태 · 정산 | `checkout_orders`(read) · `neture_orders` · `neture_shipments` |
| **Content** | Supplier Library → Store Hub / Service Operator | `neture_supplier_library_items` |
| **Programs** | Event Offer · Seller Recruitment · Market Trial | 각 프로그램 원장 (공통화하지 않는다) |

### 2.1 Workspace IA

현행 사이드바는 Programs 를 **`상품` 안에** 둔다. 이는 의도된 형태다 — 메뉴 수를 늘리기 위해 `프로그램` 상위 그룹을 신설하지 않는다. 판단 기준은 "업무의 의미가 분리되어야 하는가" 이지 코드 모듈 위치가 아니다.

```text
공급자 홈 → 대시보드
상품     → 상품 목록 · 상품 등록 · 대량 등록 · 소스 자동 입력
            서비스 제공 설정 · 판매자 모집 · 유통참여형 펀딩 · 이벤트 오퍼
주문     → 주문 현황 · 재고 관리 · 정산 내역
콘텐츠   → 콘텐츠 라이브러리 · 매장용 상품 설명서 · 태블릿 화면 자료
            디지털 사이니지 · 검수·게시 현황
설정     → 공급자 정보
```

`/supplier/forum*` · `/supplier/my-forum` 라우트는 **legacy deep-link 보존용**이며 사이드바 진입점은 은퇴했다(Community 참여는 O4O Home 경로). route rename · redirect chain 금지.

공급자에게 backend 가 차단한 기능(코너 QR · Screen Set 적용)은 **메뉴로 만들지 않는다** — 403/빈 화면 dead-end 가 된다.

---

## 3. Resource ownership

| 리소스 | 소유자 | Supplier 권한 |
|---|---|---|
| `product_masters` | **플랫폼** | read-only. HTTP 직접 create = 0 |
| `product_candidates` | Supplier | create (intake) |
| `supplier_product_offers` | **Supplier** | write |
| `offer_service_approvals` | **Service Operator** | read |
| `checkout_orders` | 주문+결제 SSOT | read |
| `neture_orders` | Supplier 처리 record | write(상태) |
| `neture_shipments` | Supplier 가 직접 수행한 배송의 **상태 기록** | write(상태) |
| `neture_supplier_library_items` | **Supplier** | write |
| `cms_contents` | 수신 서비스 | 제공(handoff) 후 책임 종료 |
| `organizations` | 공통 Business Identity | 자기 조직 write |

신규 제품 경로: `ProductCandidate → Promotion → ProductMaster`.
기존 제품 경로: `ProductMaster → SupplierProductOffer`.

---

## 4. Distribution 판정 SSOT

> **Supplier 가 고른 노출 범위(`is_public` · `service_keys` · `allowed_seller_ids`)에 필요한 서비스 운영자의 승인(`offer_service_approvals`)이 더해져 공급 가능이 결정된다.**

| 필드 | 성격 | 의미 |
|---|---|---|
| `is_public` | **입력** | Supplier 가 고른 전체 공개 여부 |
| `service_keys` | **입력** | Supplier 가 고른 제공 대상 서비스 |
| `allowed_seller_ids` | **입력** | PRIVATE 일 때의 지정 매장 범위 — **살아 있는 축이다**(대시보드 조회가 소비) |
| `offer_service_approvals` | **SSOT** | 서비스 운영자의 공급 승인 |
| `offer_service_prices` | **입력** | 서비스별 공급가 (Pharmacy-Hub 카트·목록이 소비) |
| `distribution_type` | **파생** | 위 범위의 표기. `deriveDistributionType(isPublic, serviceKeys)` |
| `supplier_product_offers.approval_status` | **파생** | `offer_service_approvals` 의 요약 |

**파생 필드를 독립 입력으로 저장하지 않는다.** 저장되는 `distribution_type` 은 항상 `deriveDistributionType` 을 거친다. import 경로도 요청값을 입력축(`is_public`)으로 환원한 뒤 같은 규칙으로 파생시킨다 — 그렇지 않으면 `distribution_type='PUBLIC'` + `is_public=false` 처럼 **같은 행을 소비처마다 다르게 판정하는 모순 상태**가 생긴다.

물리 컬럼 DROP 은 이 경계의 완료 조건이 아니다.

---

## 5. Content handoff 계약

```text
Supplier Library item → 대상 서비스 선택 → 제공 → Supplier 책임 종료
이후 검토 · 수정 · 복사 · 발행은 해당 서비스 운영자의 업무
```

- 대상은 canonical catalog(`supplier-content-handoff-targets`) 만 허용한다.
- 수신은 기존 계약 재사용: `cms_contents` (`authorRole='supplier'` · `status='pending'`), KPA 만 `kpa_approval_requests` 추가. **새 원장 · 상태 기계 · 전송 엔진 · lineage 없음.**
- **멱등성**: 같은 자료 + 같은 대상 서비스의 **살아 있는 수신은 1개를 넘지 않는다.** 출처는 `cms_contents.metadata.sourceRef` 에 태그하고(새 컬럼 0 · migration 0), 동시 요청은 `pg_advisory_xact_lock` 으로 직렬화한다. 재제공 시 HTTP 200 + `reused: true` 로 응답하며 새 행을 만들지 않는다.
- `archived` 수신은 멱등 판정에서 제외한다 — 운영자가 내린 자료는 공급자가 다시 제공할 수 있어야 한다.

**금지**: `Supplier → 특정 Store 직접 온라인 전송` · `Supplier → Community 직접 발행` · 새 Supplier CMS.

---

## 6. Programs — 3종은 합치지 않는다

| Program | Supplier 행동 | 상대 actor | 결과 | 주문 연결 |
|---|---|---|---|---|
| **Event Offer** | 특가 설정 | Store | 구매 | 일반 payment-first |
| **Seller Recruitment** | 모집 | Store/판매자 | 관계/참여 | 필요 시 이후 주문 |
| **Market Trial** | 시험 프로그램 | 참여 Store | trial 결과 | 전환 후 일반 주문 |

- **Event Offer = 특가 판매.** 참여 · 예약 · 구매의향 · 펀딩 의미를 만들지 않는다.
- **Market Trial 의 사용자 노출 명칭은 `유통참여형 펀딩`** 이다(navigation · operator menu · SEO · Community 전체에서 쓰는 플랫폼 공통 제품명). 의미는 **참여 조건 기반 유통 검증**이며 **O4O 정산 기능을 제공하지 않는다**(`marketTrialCommerceDisabled`). 이름만으로 자금 모집 기능을 추론하지 않는다.
- 공통 Program Framework · 공통 상태머신 · 공통 table 을 만들지 않는다. 코드가 서로 다른 위치에 있다는 이유만으로 옮기지 않는다.

---

## 7. Identity

```text
User → organization_members(role=owner, left_at IS NULL)
     → organizations(type='supplier')
     → neture_suppliers.organization_id
```

- 위 관계가 **canonical authorization** 이다.
- `neture_suppliers.user_id` = **legacy compatibility pointer.** canonical 실패 시에만 쓰고 `LEGACY_SUPPLIER_USER_ID_FALLBACK` 경고를 남긴다(silent fallback 금지).
- **`LIMIT 1` 임의 선택 금지.** 후보 0 → `NO_SUPPLIER` / 1 → 자동 / N → `409 SUPPLIER_CONTEXT_REQUIRED` + candidates. context 는 `x-organization-id` 헤더 · `?organizationId=` 로 전달하고, 내 membership 밖 org 지정은 `403 SUPPLIER_CONTEXT_FORBIDDEN`.
- `1 User : N Supplier` 는 **데이터·인가 구조만** 지원한다. 전용 switcher UX · multi-Supplier dashboard 는 실제 요구가 확인되기 전까지 만들지 않는다.

---

## 8. Business Profile

```text
Organization        = 공통 Business Identity (상호 · 사업자번호 · 대표자 · 주소 · 업태/종목)
NetureSupplier      = Neture 서비스 프로필 / 상거래 정책 (status · 담당자 · 공개 연락처 · 배송·주문조건)
users.businessInfo  = 가입 입력 snapshot — Supplier profile 의 read/write SSOT 가 아니다
```

- Supplier profile read/write 는 `users.businessInfo` 를 **보지 않는다.** 컬럼과 타 서비스 key 는 물리 유지하고 `utils/business-info-write.ts` 도 삭제하지 않는다(다른 소비처 존재).
- 전용 컬럼이 없는 사업자등록증 기재사항(`businessEntityType` · `businessStartDate`)은 `organizations.metadata.businessProfile` 에 둔다(migration 0). metadata 는 조직 공통 컬럼이므로 **읽어서 merge** 한다.
- `taxInvoiceEmail` 쓰기 소유는 **onboarding 단독**이다. 입력 UI 는 그것을 저장하는 섹션과 같은 자리에 둔다.
- 한 요청이 `organizations` 와 `neture_suppliers` 를 함께 바꿔야 하면 **단일 트랜잭션**으로 묶는다.

### 8.1 DEFERRED — 물리 이관

`representativeName` · `businessType` · `businessItem` 의 Organization 이관과 `neture_suppliers.user_id` 물리 제거는 **한 번의 후속 migration bundle** 로 수행한다. **이 migration 은 Supplier Domain 완료 조건이 아니다.** 현재 위치에서 읽되 Organization 이 최종 SSOT 라는 사실을 코드 주석이 명시한다.

---

## 9. 금지선

```text
Supplier → ProductMaster write 금지 (HTTP 직접 create = 0)
Supplier → 특정 Store 직접 콘텐츠 전송 금지
Supplier 내부 LLM 호출 금지 (외부 LLM 은 사용자 작업 · O4O 는 prompt/context/apply/save)
UNPAID fulfillment 금지 (후불·외상·invoice 기반 무결제 처리 없음)
O4O 물류 실행 금지 (택배사 API · 3PL · 자동 송장 · 집하 요청 · 배송대행)
Consumer→Store commerce 복구 금지 (410 경계 유지 — B2B 는 별도 namespace)
Supplier 영역에 플랫폼 Identity · Operator 업무 · Store 운영 · Community 운영 · 범용 CMS 신설 금지
```

## 9.1 새 Framework 금지

`SupplierDomainFramework` · `ProgramEngine` · `DistributionEngine` · `ContentWorkflowEngine` · `SupplierContextFramework` · 새 generic repository layer · 새 state machine framework 를 만들지 않는다.

---

## 10. DEFERRED — 기능 미완성과 architecture 미완성의 구분

**architecture 는 FROZEN 이다.** 아래는 architecture 의 빈칸이 아니라 **외부 선행조건을 기다리는 실행 항목**이다. 이것이 남아 있다는 이유로 경계를 다시 열지 않는다.

| 항목 | 상태 | 막고 있는 것 |
|---|---|---|
| 운영 Supplier 3건 owner 관계 복구 | `DEFERRED_PENDING_GOOGLE_IDENTITY` | Google Identity 선행 트랙. 실제 사용자가 직접 Google 로그인해 `users` 행이 생긴 뒤에만 진행 |
| Authenticated Supplier smoke | `PENDING` | 위 owner 연결 |
| Business Profile 물리 이관 | `MIGRATION_DEFERRED` | 실제 기능 요구 (§8.1) |
| `supplier_csv_import_batches` · `_rows` | `PHYSICAL_SCHEMA_ONLY` | 없음 — runtime 소비 0. **완료 blocker 아님**, 청소 목적의 새 WO 를 만들지 않는다 |

Identity gate 가 열리기 전 금지: owner 이메일 요구 · `users` 생성 · `organization_members` INSERT · `neture_suppliers.user_id` UPDATE · Supplier 삭제.

---

## 11. 잔재 분류

| 분류 | 뜻 | 처리 |
|---|---|---|
| `ACTIVE_RUNTIME` | 살아 있는 소비처 존재 | 유지 |
| `DEAD_RUNTIME` | 소비처 0 · 계약 종료 | 제거 가능 |
| `PHYSICAL_SCHEMA_ONLY` | runtime 없음 · 물리 table 만 | 기록만. 완료 blocker 아님 |
| `HISTORICAL_DOC_ONLY` | 과거 실행 기록 | 현재 정책을 이기지 않는다 |

**ProductImage** 는 현재 `supplier_upload` · `created_by` · canonical primary 보호 계약을 유지하며, **temporary compatibility boundary** 로 기록한다. 별도 Offer image table 을 신설하지 않는다.

---

*Version 1.0 · Status: Active (FROZEN) · Updated 2026-09-26*
