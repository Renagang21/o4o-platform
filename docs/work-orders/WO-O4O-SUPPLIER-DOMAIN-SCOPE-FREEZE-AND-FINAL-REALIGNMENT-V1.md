# WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1

> **상태:** IN EXECUTION · 조사 + 판정 + 구현 + 검증을 이 WO 안에서 끝낸다
> **기준 코드:** 착수 시점 `origin/main` `14587a9ad`. 항상 최신 `origin/main` 에서 시작하며 과거 commit 으로 reset/rebase 하지 않는다
> **성격:** Supplier 기능을 **확장하는 작업이 아니다.** 지금까지의 Supplier 리팩토링 전체를 초기 역할 정의에 다시 맞추고, 남은 구조적 drift 만 한 번에 정리해 **Supplier Domain 을 동결**하는 최종 마감 작업이다
> **한 줄:** 처음 의도했던 Supplier 역할을 기준으로 삼아, 커진 구현 중 필요한 것은 유지하고 과도·중복된 것은 축소·동결한 뒤 Supplier Domain 전체를 하나의 정본으로 마감한다

---

# 0. 작업 고정 4항목

> O4O 기본 실행 규칙(2026-09-26 확정): **큰 목표 1개 = 큰 WO 1개.** 조사 중 새 문제를 발견했다는 것 자체는 새 WO 를 만들 이유가 아니다. 분리는 독립적인 위험 · 별도 승인 · 데이터 마이그레이션 · 배포 순서가 있을 때만.

```text
INITIAL_PURPOSE
  Supplier 역할을 초기 기획(Business·Products·Orders·Content·Programs 5축)으로
  단순화하는 것. 제품축 정리 뒤 주문·결제·Identity 로 번지면서 각각이 별도 트랙처럼
  다뤄졌고, 그 과정에서 "역할 단순화" 라는 큰 흐름이 흐려졌다. 이 WO 는 그 수렴이다.

CONFIRMED_DECISIONS  (다시 판단하지 않는다 — §2)
  ProductMaster = 플랫폼 SSOT · Supplier read-only / SupplierProductOffer = write 영역
  checkout_orders = 주문+결제 SSOT · PAYMENT-FIRST · paid → fulfillment
  neture_orders = 처리 record · neture_shipments = 직접 배송 상태 기록 · O4O ≠ 물류 실행자
  Event Offer = 특가 판매 (참여·예약·구매의향·펀딩 의미 재생성 금지)
  Supplier 내부 LLM = 0 · legacy CSV runtime = 0 · Offer-First 관리
  Identity canonical = User → organization_members → Organization → NetureSupplier
  Identity DATA repair = DEFERRED_PENDING_GOOGLE_IDENTITY (이 WO 가 gate 를 열지 않는다)
  Consumer→Store commerce 410 경계 유지

OUT_OF_SCOPE  (확대 금지 — §1.1 · §12 · §21)
  새 Supplier 기능 발굴 · 새 AI 기능 · WebMCP · 배송업체 연동
  새 commerce/payment/product model · Community·Store·Operator Workspace 재설계
  Multi-Supplier UI · ProductImage 신규 ownership schema · recovery framework 확대
  supplier_csv_import_* 물리 DROP · 새 Framework 일체(§16.1)
  Business Profile 물리 migration (§10 — 완료 조건 아님)

DONE_CRITERIA  (§22)
  ① Initial Intent vs Current State 표 + KEEP/REALIGN/RETIRE/DEFER 판정 완료
  ② 실제 drift 최소 구현 완료 (Distribution 의미 확정 · Content handoff 멱등성)
  ③ docs/baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md 생성
  ④ Supplier 전체 boundary 소스 계약 테스트 통과
  ⑤ 10축 판정: WORKSPACE·PRODUCTS·DISTRIBUTION·ORDERS·CONTENT·PROGRAMS·
     IDENTITY_CODE·IDENTITY_DATA·BUSINESS_PROFILE·DOMAIN_ARCHITECTURE
  ⑥ HEAD == origin/main · 이번 범위 미커밋 0
  DEFERRED 가 있다는 이유로 전체 architecture 를 다시 열지 않는다.
```

---

```text
FRESH CENSUS
→ ORIGINAL INTENT 대비 CURRENT STATE 확인
→ KEEP / REALIGN / RETIRE / DEFER 판정
→ 필요한 최소 구현
→ canonical baseline 작성
→ 테스트 / 배포 / smoke
→ FINAL CHECK
```

**작은 WO 로 나누지 않는다.** 별도 IR 을 새로 만들지 않는다. 외부 선행조건 때문에 실제로 실행할 수 없는 항목만 `DEFERRED` 로 남긴다.

---

# 0. 다른 세션 보호

다중 세션의 dirty · staged · untracked · worktree 는 **불가침**. path-specific stage/commit 만 사용한다.

---

# 1. 출발점 — 초기 Supplier 기획

Supplier Workspace 의 최종 핵심 책임은 다음 **5축**으로 단순화한다.

```text
Supplier
├─ Business   계정 · 조직 · 사업자관계 · 서비스 프로필
├─ Products   공급 상품 · 가격 · 공급조건 · 서비스 유통
├─ Orders     결제 완료 주문 처리 · 직접 배송 상태 · 정산
├─ Content    Supplier Library → Store Hub / Service Operator
└─ Programs   Event Offer(특가) · Seller Recruitment(모집) · Market Trial(시장시험)
```

Workspace utility 로 `Home` · `Settings` 만 별도 허용. Supplier 가 이 5축 밖의 플랫폼 책임을 가져서는 안 된다.

## 1.1 Supplier 책임이 아닌 것

```text
ProductMaster canonical 관리 · 플랫폼 Identity 자체 · Service Operator 업무
Store 운영 업무 · 택배/물류 실행 · PG 엔진 개발 · Community 운영
범용 CMS 개발 · WebMCP 플랫폼 재설계
```

모든 기능에 대해 먼저 **"이 기능은 Supplier 의 실제 책임인가?"** 를 묻는다. 아니라면 Supplier 영역에서 확대하지 않는다.

---

# 2. 이미 CLOSED — 다시 리팩토링하지 않는다

회귀 여부만 확인하고 새 구조를 만들지 않는다.

```text
[Products]
ProductMaster = 플랫폼 SSOT · Supplier = read-only
SupplierProductOffer = Supplier write 영역
신규 제품: ProductCandidate → Promotion → ProductMaster
기존 제품: ProductMaster → SupplierProductOffer
Supplier HTTP → ProductMaster direct create = 0 · Supplier internal LLM = 0
legacy CSV runtime = 0 · Offer-First management · B2B 설명 Drawer 통합
Supply Offers 별도 허브 은퇴

[Orders / Payment]
checkout_orders = 주문+결제 SSOT · PAYMENT-FIRST · paid → Supplier fulfillment

[Fulfillment / Shipping]
neture_orders    = Supplier 처리 record
neture_shipments = Supplier 가 직접 수행한 배송의 상태 기록
O4O ≠ 배송업체 · ≠ 3PL · ≠ 물류 실행자

[Event Offer]
Event Offer = 특가 판매. 참여·예약·구매의향·펀딩 의미를 다시 만들지 않는다

[External LLM]
Supplier 내부 LLM 호출 = 0 · ChatGPT/Astra = 사용자 외부 작업
O4O = prompt/context/apply/save
```

---

# 3. Phase 0 — Initial Intent vs Current State

코드 변경 **전에** Supplier 전체 기능을 한 표로 만든다. 판정은 `KEEP` · `REALIGN` · `RETIRE` · `DEFER` **4개만** 사용한다. `NEW_FEATURE` 분류는 사용하지 않는다 — 이번 작업의 목표는 새 기능 발견이 아니다.

| Domain | 초기 의도 | 현재 구현 | 판정 | 이유 |
|---|---|---|---|---|
| Business · Products · Distribution · Orders · Content · Event Offer · Recruitment · Market Trial · Dashboard | (착수 시 census) | | | |

---

# 4. A — Workspace / IA 최종 Freeze

최종 목표는 `Home · Products · Orders · Content · Programs · Settings`, 또는 현재 UI 가 Programs 를 Products 내부에 두는 것이 자연스러우면 `Home · Products · Orders · Content · Settings` 유지도 허용한다.

**메뉴 숫자를 늘리기 위해 Programs 상위메뉴를 새로 만들지 않는다.** 판단 기준은 "업무의 의미가 분리되어야 하는가" 이지 코드 모듈 위치가 아니다.

확인: dead menu · redirect-only menu · 동일 업무 중복 메뉴 · "준비중" stub · 과거 Partner/Seller 명칭 · 이미 은퇴한 Community 진입. **필요한 최소 정리만** 한다.

---

# 5. B — Product 영역은 회귀 검사만

Product 구조를 다시 설계하지 않는다. 다음만 확인한다.

```text
Supplier → ProductMaster write = 0
Supplier HTTP → ProductMaster create = 0
Supplier internal LLM = 0
Offer-First = 유지
```

ProductImage 도 재설계하지 않는다. 현재 `supplier_upload` · `created_by` · canonical primary 보호 계약을 유지하고, **별도 Offer image table 신규 제안 금지.** 현재 구조를 **temporary compatibility boundary** 로 baseline 에 기록만 한다.

---

# 6. C — Distribution 모델 정리

Supplier Product 쪽에 실제로 남은 구조적 drift. 다음을 **함께** 추적한다.

```text
is_public · distribution_type · service_keys
offer_service_approvals · offer_service_prices · allowedSellerIds
```

목표는 컬럼 삭제가 아니라 **각각의 의미 확정**이다. 완료 시 **유통 판정 SSOT 를 한 문장으로 설명할 수 있어야 한다.** 예상 형태: `Supplier 선택 + 필요한 서비스 승인 = 해당 서비스에서 공급 가능`. 실제 코드가 다르면 census 결과를 따른다.

원칙: runtime 소비처 0 필드는 runtime 에서 은퇴 가능 · **물리 컬럼 DROP 은 완료 조건이 아니다** · 의미가 다른 필드를 억지로 합치지 않는다 · **새 Distribution Engine 을 만들지 않는다.**

---

# 7. D — Content 최종 경계

정본은 `neture_supplier_library_items`. 공식 경로 `Supplier → Store Hub` · `Supplier → Service Operator` 를 유지한다.

금지: `Supplier → 특정 Store 직접 온라인 전송` · `Supplier → Community 직접 발행` · 새 Supplier CMS.

## 7.1 반드시 해결할 항목 — handoff 멱등성

동일 Supplier Library item 을 동일 `serviceKey` 로 여러 번 handoff 했을 때 중복 `cms_contents` · 중복 approval request 가 생성될 수 있는지 fresh census 한다. 실제로 중복 가능하면 **idempotent handoff** 로 정렬한다.

```text
same supplierLibraryItem + same target service → active handoff 1개
```

단 새 workflow engine · 새 lineage framework · 새 generic CMS 금지. 현재 schema 로 concurrency-safe 하게 보장할 수 없고 migration 이 반드시 필요하면 STOP 하지 말고 **같은 WO 안에서 최소 migration 필요성을 보고하고 실행 전 사용자 승인**을 요청한다.

---

# 8. E — Business Programs 의미 Freeze

세 프로그램을 하나로 합치지 않는다.

| Program | Supplier 행동 | 상대 actor | 결과 | 주문 연결 |
|---|---|---|---|---|
| Event Offer | 특가 설정 | Store | 구매 | 일반 payment-first |
| Seller Recruitment | 모집 | Store/판매자 | 관계/참여 | 필요 시 이후 주문 |
| Market Trial | 시험 프로그램 | 참여 Store | trial 결과 | 전환 후 일반 주문 |

UI 문구와 route 가 이 의미를 어기면 정정한다.

하지 않는 것: 공통 Program Framework · 공통 상태머신 · 공통 table · **모듈 이동만을 위한 대규모 refactor.** 코드가 서로 다른 위치에 있다는 이유만으로 옮기지 않는다.

---

# 9. F — Identity 는 현재 방향을 Freeze

이미 구현된 canonical direction `User → organization_members → Organization → NetureSupplier` 를 유지한다. `neture_suppliers.user_id` = compatibility pointer 도 현재 단계에서 유지한다.

**과도한 확장 금지** — `1 User : N Supplier` 를 지원하는 데이터/인가 구조는 유지하되, 새 multi-Supplier dashboard · 새 organization switcher UX · 새 복수 공급사 관리 기능은 실제 요구가 확인되기 전까지 만들지 않는다. 필요한 것은 **관계 구조가 N 을 허용하는 것**이지 UX 확장이 아니다.

## 9.1 Google Identity gate — 그대로 유지

```text
J = DEFERRED_PENDING_GOOGLE_IDENTITY
K = AUTHENTICATED_SUPPLIER_SMOKE = PENDING
```

Google Identity 선행 작업 완료 전 금지: owner 이메일 요구 · `users` 생성 · `organization_members` INSERT · `neture_suppliers.user_id` UPDATE · Supplier 삭제. **이 WO 때문에 Identity gate 를 억지로 열지 않는다.**

---

# 10. G — Business Profile SSOT 논리적 Freeze

```text
Organization       = 공통 Business Identity
NetureSupplier     = Neture 서비스 프로필 / 상거래 정책
users.businessInfo = 가입 입력 snapshot
```

물리 migration 을 서두르지 않는다. migration 없이 read SSOT · write SSOT · runtime dependency 가 정리됐다면 유지한다.

다음 물리 이관은 **현재 Supplier 기능이 실제로 요구할 때 한 번의 후속 migration bundle** 로 수행하도록 DEFER 할 수 있다: `representativeName` · `businessType` · `businessItem` · `businessEntityType` · `businessStartDate` · `user_id` 제거. **이 migration 을 Supplier 리팩토링 완료 조건으로 삼지 않는다.**

---

# 11. H — Dashboard 단순화

Supplier Dashboard 가 `Products · Orders · Content · Programs` 로 가는 업무 진입점 + 처리 필요 상태 + **사실 기반 KPI** 역할만 하는지 확인한다.

금지: 새 AI insight · 새 추천 엔진 · 새 action workflow engine · 새 reporting framework. SQL 집계 기반 KPI 는 유지 가능. **실사용 데이터 0 인 기능을 과도하게 대시보드에 강조하지 않는다.**

---

# 12. I — 과도하게 확장된 구조는 여기서 멈춘다

더 발전시키지 않는다.

```text
Multi-Supplier UI · ProductImage 신규 ownership schema
Fulfillment recovery framework 확대 · 배송업체 integration
supplier_csv_import_* physical DROP · WebMCP
Supplier-specific AI engine · 새 payment engine · 새 settlement engine
```

이미 필요한 최소 기능이 있으면 KEEP. **더 좋은 구조가 가능하다는 이유만으로 다시 리팩토링하지 않는다.**

---

# 13. J — Dead runtime / physical legacy 구분

Supplier 관련 잔재를 `DEAD_RUNTIME` · `PHYSICAL_SCHEMA_ONLY` · `HISTORICAL_DOC_ONLY` · `ACTIVE_RUNTIME` 로 분리한다.

- **DEAD_RUNTIME** — 소비처 0 이고 계약도 끝난 코드는 같은 WO 에서 제거 가능
- **PHYSICAL_SCHEMA_ONLY** — 예: `supplier_csv_import_batches` · `supplier_csv_import_rows`. runtime 이 이미 없고 물리 table 만 남은 것은 **Supplier Domain 완료 blocker 아님** 으로 기록. 단순 schema 청소 때문에 새 WO 를 만들지 않는다

---

# 14. K — canonical baseline 작성

작은 WO 여러 개 대신 **Supplier 전체 정본 문서 하나**를 만든다: `docs/baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md`

최소 포함: ① Supplier 정의 ② 5개 업무축 ③ Resource ownership ④ Actor boundary ⑤ 금지선 ⑥ DEFERRED(기능 미완성과 architecture 미완성을 **구분**)

---

# 15. L — Original Intent Delta Table

CHECK 에 다음 표를 작성한다.

| 영역 | 처음 의도 | 최종 구현 | 차이 | 최종 판정 |
|---|---|---|---|---|

최소 대상: Workspace · Products · AI · Distribution · Orders · Payment · Fulfillment · Shipping · Content · Programs · Identity · Business Profile.

**초기 범위를 넘어 확장된 작업**(Payment/Fulfillment · Identity relationship · Business Profile SSOT · Multi-Supplier capability)은 명시하고, 각 확장에 `KEEP` · `FREEZE` · `ROLLBACK` 중 하나를 최종 판정한다.

---

# 16. 구현 원칙

코드 변경은 **최종 Scope Freeze 에 필요한 것만** 한다.

```text
우선순위: ① 잘못된 ownership ② 중복 SSOT ③ dead-end ④ 중복 write ⑤ runtime dead code
후순위:   파일 위치 · 파일 크기 · 이름 취향 · 미래 확장성 · 추상화 · 코드 미관
```

## 16.1 새로운 Framework 금지

`SupplierDomainFramework` · `ProgramEngine` · `DistributionEngine` · `ContentWorkflowEngine` · `SupplierContextFramework` · 새 generic repository layer · 새 state machine framework 를 만들지 않는다.

---

# 17. DB · 프로덕션 데이터

기본 `DB migration = 0` 으로 시작한다. Content idempotency 등 **schema 없이 데이터 무결성을 안전하게 보장할 수 없는 경우**에만 `MINIMAL_MIGRATION_REQUIRED` 로 보고하고 같은 WO 안에서 사용자 승인 후 진행한다. 새로운 대형 schema 설계 금지.

운영 데이터를 기능 검증용으로 생성하지 않는다. **read-only census 만 허용.** Identity owner repair 는 §9.1 gate 를 그대로 따른다.

---

# 18. 테스트

Supplier 전체 boundary 를 소스 계약으로 한 번에 고정한다. 기존 CLOSED 축의 테스트를 새로 복제하지 말고 **기존 regression suite 를 재사용**한다.

```text
Supplier Workspace IA
ProductMaster write=0 · Supplier direct Master create=0 · internal LLM=0
Distribution canonical decision
Content handoff idempotency
Event Offer = special price · Event Offer participation/reservation runtime=0
PAYMENT-FIRST · UNPAID fulfillment=0
external carrier integration=0
organization membership auth canonical · legacy user_id = fallback only
users.businessInfo Supplier profile write=0
Consumer→Store retired payment routes 유지
```

---

# 19. 배포

실제 runtime 변경이 있을 때만 배포한다. 문서/테스트만 변경되면 불필요한 서비스 배포를 만들지 않는다. **전역 `DEPLOY_ENABLED` 를 이 WO 단독 이유로 무리하게 열지 않는다** — 다른 자연스러운 배포 창과 합치는 것이 안전하면 기다릴 수 있다.

---

# 20. STOP 조건

```text
A. Product/Order 등 CLOSED 계약을 깨지 않고는 해결 불가
B. Supplier scope 를 넘어 Platform-wide Identity/Core 변경 필요
C. Content idempotency 해결에 예상보다 큰 schema/workflow engine 필요
D. Distribution 정리에 실제 사업정책 결정이 추가로 필요
E. 현재 production 에서 사용 중인 기능을 RETIRE 해야 함
F. Google Identity 선행 완료 없이는 진행할 수 없는 단계에 도달
G. package/lockfile 구조 변경 필요
H. 타 세션 동일 파일 충돌
```

**사소한 dead code 나 copy 문제 때문에 새 WO 를 만들지 않는다.**

---

# 21. 하지 않는 것

```text
새 Supplier 기능 발굴 · 새 AI 기능 · WebMCP · 배송업체 연동
새 commerce model · 새 payment model · 새 product model
Community 재설계 · Store Workspace 재설계 · Operator Workspace 재설계
```

이 WO 는 **마감 작업**이다.

---

# 22. 최종 완료 판정

```text
SUPPLIER_WORKSPACE           = CLOSED
SUPPLIER_PRODUCTS            = CLOSED
SUPPLIER_DISTRIBUTION        = CLOSED / FROZEN
SUPPLIER_ORDERS              = CLOSED
SUPPLIER_CONTENT             = CLOSED
SUPPLIER_PROGRAMS            = CLOSED / FROZEN
SUPPLIER_IDENTITY_CODE       = CLOSED
SUPPLIER_IDENTITY_DATA       = DEFERRED_PENDING_GOOGLE_IDENTITY
SUPPLIER_BUSINESS_PROFILE    = CLOSED / MIGRATION_DEFERRED
SUPPLIER_DOMAIN_ARCHITECTURE = FROZEN
```

`DEFERRED` 가 있다는 이유로 전체 architecture 를 다시 열지 않는다.

---

# 23. 완료 보고 항목

한 번의 CHECK 에 모두 넣는다.

```text
 1. 최신 origin/main
 2. Initial Intent vs Current State 표
 3. KEEP / REALIGN / RETIRE / DEFER 결과
 4. 최종 Supplier 5축
 5. 최종 Ownership Matrix
 6. Distribution 최종 계약
 7. Content handoff 최종 계약
 8. Programs 3종 경계
 9. Identity / Business 현재 상태
10. 과도하게 확장됐던 기능의 최종 판정 (multi-Supplier · recovery · ProductImage · physical legacy)
11. 제거한 runtime residue
12. 의도적으로 남긴 physical/schema residue
13. tests
14. deploy/smoke
15. STOP/DEFER
16. O4O-SUPPLIER-DOMAIN-BOUNDARY-V1 생성 결과
17. 문서 정합
18. commits / HEAD == origin/main
```

---

*작성: 2026-09-26 · 기준 `origin/main` `14587a9ad`*
