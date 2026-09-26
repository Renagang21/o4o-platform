# CHECK-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1

> **WO**: [`WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1`](../work-orders/WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1.md)
> **정본 산출물**: [`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md)
> **작성**: 2026-09-26

## 1. 기준 커밋

```text
착수 origin/main   14587a9ad
구현 commit        303221b8b
문서 commit        (이 CHECK · CANONICAL-INDEX 등재)
```

## 2. Initial Intent vs Current State

| Domain | 초기 의도 | 현재 구현 | 판정 | 이유 |
|---|---|---|---|---|
| **Business** | 계정 · 조직 · 사업자관계 · 서비스 프로필 | `organizations`/`organization_members` canonical · `neture_suppliers` = Neture 프로필 | **KEEP** | 초기 의도와 일치. Identity 방향 확정됨 |
| **Products** | 공급 상품 · 가격 · 공급조건 | ProductMaster read-only + Offer write · Candidate→Promotion | **KEEP** | 선행 WO 로 CLOSED. 회귀만 확인 |
| **Distribution** | 어디에 공급할지 | 입력 3축 + 승인 + **파생** `distribution_type` — import 경로가 파생을 독립 입력으로 쓰고 있었다 | **REALIGN** | 모순 행 생성 가능 → 정정 (§4) |
| **Orders** | 결제 완료 주문 처리 | `checkout_orders` SSOT · payment-first · `neture_orders` 투영 | **KEEP** | 선행 WO 로 CLOSED |
| **Content** | Library → Store Hub / Operator | 경로는 정확 · **중복 방지 0** | **REALIGN** | 멱등성 부재 → 정정 (§5) |
| **Event Offer** | 특가 판매 | 특가 · 참여/예약/펀딩 런타임 0 | **KEEP** | 의미 유지됨 |
| **Recruitment** | 판매자/매장 모집 | `seller-recruitment` + 노출 proxy | **KEEP** | 의미 유지됨 |
| **Market Trial** | 시장시험 · 유통 실험 | 참여조건 기반 검증 · **O4O 정산 차단** | **KEEP** | 라벨은 플랫폼 공통 제품명 (§6) |
| **Dashboard** | 업무 진입점 + 사실 기반 KPI | SQL 집계 KPI · AI insight/추천 엔진 0 | **KEEP** | 초기 의도 범위 안 |

## 3. KEEP / REALIGN / RETIRE / DEFER 결과

```text
KEEP     Business · Products · Orders · Event Offer · Recruitment · Market Trial · Dashboard · Workspace IA
REALIGN  Distribution (파생 필드 독립 write 정정) · Content (handoff 멱등성)
RETIRE   없음 — 제거 대상 DEAD_RUNTIME 을 찾지 못했다 (은퇴는 선행 WO 들에서 이미 수행됨)
DEFER    Identity DATA repair · Business Profile 물리 이관 · supplier_csv_import_* 물리 DROP
```

## 4. Distribution 최종 계약

> **Supplier 가 고른 노출 범위(`is_public` · `service_keys` · `allowed_seller_ids`)에 필요한 서비스 운영자의 승인(`offer_service_approvals`)이 더해져 공급 가능이 결정된다. `distribution_type` · `approval_status` 는 파생 표기이며 독립 입력이 아니다.**

| 필드 | 성격 | runtime 상태 |
|---|---|---|
| `is_public` | 입력 | ACTIVE |
| `service_keys` | 입력 | ACTIVE |
| `allowed_seller_ids` | 입력 (PRIVATE 매장범위) | **ACTIVE** — `neture-dashboard.service` 351/361/370 이 소비. 은퇴 대상 아님 |
| `offer_service_approvals` | SSOT | ACTIVE |
| `offer_service_prices` | 입력 (서비스별 공급가) | ACTIVE — Pharmacy-Hub 카트·목록 소비 |
| `distribution_type` | **파생** | ACTIVE (표기) |
| `supplier_product_offers.approval_status` | **파생** | ACTIVE (요약) |

**정정 내용** — `product-import-common.service.ts` 의 `upsertSupplierOffer` 가 요청 `distribution_type` 을 enum 에 그대로 대입하고 `is_public` 을 건드리지 않았다. 그 결과 `distribution_type='PUBLIC'` + `is_public=false` 같은 행이 가능했고, `distribution_type` 을 읽는 소비처(Pharmacy-Hub 노출 · 대시보드 집계)와 `is_public` 을 읽는 소비처(공급자 화면)가 **같은 행을 다르게 판정**했다. 요청값을 입력축으로 환원한 뒤 같은 규칙으로 파생시킨다.

`service_keys` 를 정하지 않는 import 에서 `SERVICE` 요청은 `PRIVATE` 이 된다 — 서비스 0개인 죽은 SERVICE 행이 남지 않고, 노출 방향으로는 닫히는 쪽이라 안전하다.

**물리 컬럼 DROP 은 하지 않았다** (WO §6 — 완료 조건 아님).

## 5. Content handoff 최종 계약

```text
same supplierLibraryItem + same target service → 살아 있는 수신 1개
```

| 항목 | 내용 |
|---|---|
| 출처 태그 | `cms_contents.metadata.sourceRef = { kind:'supplier_library_item', id, supplierId }` |
| 동시성 | `pg_advisory_xact_lock(hashtextextended('<kind>:<id>:<serviceKey>', 0))` — lock → SELECT → INSERT 가 한 트랜잭션 |
| 재제공 응답 | HTTP **200** + `reused: true` (새 행 0). 최초는 201 |
| 재제공 허용 상태 | `archived` — 운영자가 내린 자료는 다시 보낼 수 있어야 한다 |
| 무회귀 | `sourceRef` 없는 기존 KPA 직접 제출 경로는 가드를 타지 않는다 |
| migration | **0** — 새 컬럼 · 새 원장 · unique index 0 |
| 프런트 | "이미 제공됨" 과 "새로 제공됨" 문구 분리 |

`check-then-insert` 만으로는 동시 요청에 안전하지 않다(막을 행이 아직 없어 잠글 대상도 없다). unique index 를 만들면 DDL 이 필요하므로 advisory lock 으로 직렬화해 **`MINIMAL_MIGRATION_REQUIRED` 없이** 닫았다.

## 6. Programs 3종 경계

| Program | Supplier 행동 | 상대 actor | 결과 | 주문 연결 |
|---|---|---|---|---|
| Event Offer | 특가 설정 | Store | 구매 | 일반 payment-first |
| Seller Recruitment | 모집 | Store/판매자 | 관계/참여 | 필요 시 이후 주문 |
| Market Trial | 시험 프로그램 | 참여 Store | trial 결과 | 전환 후 일반 주문 |

**「유통참여형 펀딩」 라벨은 정정하지 않았다.** supplier 사이드바만의 라벨이 아니라 `navigation.ts` · `operatorMenuGroups.ts` · `seoRegistry.ts` · `CommunityPage` · `/guide` 까지 쓰는 **플랫폼 공통 제품명**이고, `trial.ts` 가 `marketTrialCommerceDisabled` 로 O4O 정산을 명시적으로 차단한다(자금 모집 기능 아님). 라벨 변경은 플랫폼 전역 어휘 변경이라 이 WO 범위 밖이며 WO §16 이 이름 취향을 후순위로 둔다. baseline 에 "이름만으로 자금 모집 기능을 추론하지 않는다" 를 명시했다.

공통 Program Framework · 상태머신 · table 을 만들지 않았다.

## 7. Identity / Business Profile 현재 상태

```text
SUPPLIER_IDENTITY_CODE    = CLOSED   (organization_members canonical · legacy user_id = 관측 가능한 fallback · LIMIT 1 임의선택 0)
SUPPLIER_IDENTITY_DATA    = DEFERRED_PENDING_GOOGLE_IDENTITY
SUPPLIER_BUSINESS_PROFILE = CLOSED / MIGRATION_DEFERRED
```

이 WO 는 **Identity gate 를 열지 않았다.** 운영 Supplier 3건(`91169739` · `251adaaf` · `5de3098e`)은 KEEP AS-IS 이며 owner 이메일 요구 · `users` 생성 · `organization_members` INSERT · `user_id` UPDATE · Supplier 삭제를 하지 않았다.

## 8. 과도하게 확장됐던 기능의 최종 판정

| 확장 항목 | 판정 | 근거 |
|---|---|---|
| Payment / Fulfillment (B2B payment namespace · bridge · recovery) | **KEEP** | 첫 실결제 전 필요한 안전장치. 확대는 중단 |
| Identity relationship (organization_members 전환 · 1:N 인가) | **KEEP** | canonical 방향이며 운영 3건의 교착을 해소하는 유일한 경로 |
| Business Profile SSOT (Organization 정렬) | **FREEZE** | 논리 정렬 완료 · 물리 이관은 DEFER |
| Multi-Supplier capability | **FREEZE** | 데이터·인가만 유지. 전용 switcher UX · dashboard 신설 금지 |
| Fulfillment recovery framework | **FREEZE** | 현재 최소 기능 유지 · 확대 금지 |
| ProductImage ownership | **FREEZE** | temporary compatibility boundary 로 기록만 |

## 9. 제거한 runtime residue

**없음.** 이번 census 에서 소비처 0 + 계약 종료인 `DEAD_RUNTIME` 을 찾지 못했다. 기존 은퇴(legacy CSV · Supply Offers 허브 · b2b-content · Community 진입 · Legacy Partner)는 모두 선행 WO 에서 redirect 또는 물리 정리까지 끝나 있었다.

`catalog-import` 는 살아 있으나 `requireNetureScope('neture:admin')` 가드의 **Admin 경로**다 — Supplier CSV runtime 이 아니므로 "legacy CSV runtime = 0" 계약과 충돌하지 않는다. 재설계하지 않았다.

## 10. 의도적으로 남긴 physical/schema residue

| 대상 | 분류 | 판정 |
|---|---|---|
| `supplier_csv_import_batches` · `supplier_csv_import_rows` | `PHYSICAL_SCHEMA_ONLY` | runtime 소비 0. **완료 blocker 아님.** 청소 목적의 새 WO 를 만들지 않는다 |
| `neture_suppliers.user_id` | compatibility pointer | 유지 · 물리 제거는 §8.1 bundle |
| `users.businessInfo` 컬럼 및 타 서비스 key | 타 서비스 ACTIVE | 물리 삭제 금지 |
| `utils/business-info-write.ts` | 타 소비처 존재 | 삭제 금지 |
| `distribution_type` · `approval_status` 컬럼 | 파생 표기 | DROP 하지 않는다 |

## 11. 테스트

```text
신설  apps/api-server/src/__tests__/supplier-domain-boundary.spec.ts   34 PASS
      §1 IA · §2 Products · §3 Distribution · §4 Orders · §5 Shipping
      §6 Content · §7 Programs · §8 Identity · §9 Business Profile · §10 은퇴경계

회귀  supplier / neture / content / offer 91 suites · 1,656 tests PASS
      기존 handoff 수신 계약(supplier-workspace-realignment 외) 50 PASS — 불변
      lint ratchet 46 / baseline 46 (내 변경 파일 eslint 0)
      api-server tsc clean · web-neture tsc clean
```

기존 CLOSED 축의 동작 테스트를 복제하지 않고 **경계 회귀만** 고정했다.

## 12. 배포 / smoke

runtime 변경이 있으므로 배포 대상이다. 다만 WO §19 에 따라 **전역 `DEPLOY_ENABLED` 를 이 WO 단독 이유로 열지 않았다** — 다음 자연스러운 배포 창에 합친다.

```text
DEPLOY        = PENDING (다음 배포 창)
BROWSER_SMOKE = PENDING (배포 후)
```

배포 후 확인할 것: 같은 Library 자료를 같은 서비스로 두 번 제공 → 두 번째가 **200 + "이미 제공된 자료"** 문구이고 수신함 행이 늘지 않는지.

## 13. STOP / DEFER

**STOP 발동 없음.** WO §20 의 A~H 중 어느 것도 발생하지 않았다. 특히 §20-C(Content idempotency 에 큰 schema/engine 필요)는 advisory lock 으로 **migration 0 을 유지하며** 회피했다.

```text
DEFERRED
  SUPPLIER_IDENTITY_DATA        Google Identity 선행 트랙 (외부 선행조건)
  Business Profile 물리 이관     실제 기능 요구 시 1회 bundle
  supplier_csv_import_* DROP     완료 blocker 아님
```

## 14. 최종 판정

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

`DEFERRED` 가 남았다는 이유로 architecture 를 다시 열지 않는다. **Supplier 영역 전수 리팩토링은 여기서 종료한다.**

## 15. 문서 정합

```text
발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
신설: docs/baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md (CANONICAL-INDEX §1 등재)
```

---

*작성 2026-09-26*
