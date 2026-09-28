# CHECK — WO-O4O-SUPPLIER-CANONICAL-RUNTIME-AND-PRODUCTION-FINAL-CLOSURE-V1

> 기준: [`O4O-SUPPLIER-DOMAIN-BOUNDARY-V1`](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md) (FROZEN)
> 코드 커밋: `69e1c5aa8` · 작성일: 2026-09-28

## 0. 시작 기록

| 항목 | 내용 |
|---|---|
| INITIAL_PURPOSE | Supplier runtime · 운영 데이터 · 실제 Google Supplier 사용자가 같은 canonical 관계(User → organization_members(owner) → organizations(type='supplier') → neture_suppliers.organization_id)로 동작하는지 확인하고, 발견한 runtime drift 를 이 WO 안에서 고친다 |
| CONFIRMED_DECISIONS | 5축(Business/Products/Orders/Content/Programs)+Home/Settings · ProductMaster read-only SSOT(공급자 write=Offer) · Supplier 내부 LLM 0 · checkout_orders PAYMENT-FIRST · Event Offer=특가 · 사업자 본인(organization_members) ≠ supplier:admin/operator · `neture_suppliers.user_id`=legacy compatibility pointer |
| OUT_OF_SCOPE | 재설계 · 신규 기능/모델/엔진 · multi-Supplier switcher · WebMCP · Business Profile 물리 migration · supplier_csv_import_* 청소 · 배송 API · 새 AI 기능 · 취향 리팩토링 |
| DONE_CRITERIA | runtime drift 0(계약 테스트로 고정) · 운영 관계 census 완료 · 공급자별 A/B/C 사용자 결정 · 승인된 것만 write · smoke/배포 상태를 사실대로 기록 |

## 1. Phase A — `neture_suppliers.user_id` runtime census

| 분류 | 위치 | 조치 |
|---|---|---|
| SERVICE_STATE | `neture-service-state.service.ts` | **수정** — API guard 와 같은 `resolveSupplierForUser` 사용 (home == guard). N 후보면 상태 merge(active>pending>suspended>rejected) |
| AUTHORIZATION | `utils/supplier.utils.ts`(Copilot SQL KPI, LIVE) · KPA `supplier-offers.controller` · `supplier-signage-media.controller` · `supplier-screen-set.controller` · `supplier-event-offer-proposals.controller` · `store-ai/utils/product-access.utils` · `supplier.service` `getSupplierIdByUserId`/`getSupplierByUserId`(Content Library · 상품 이미지 · hub-trigger guard) | **수정** — `resolveSupplierIdForUser` (N 개 · 스푸핑이면 null, 임의 선택 0). 응답 계약 불변 |
| OWNERSHIP | `event-offer.service` · `seller-recruitment.service`(3곳) · `supplier.service` slug `isOwner` | **수정** — `listOwnedSupplierIds` (소속 판정이므로 N 개 전부) |
| NOTIFICATION_RECIPIENT | `neture-settlement.service` 정산 알림 · `offer-service-approval.service` 승인 알림 | **수정** — `listSupplierOwnerUserIds` (owner 집합, owner 0 일 때만 legacy + 경고) |
| OPERATOR_FILTER | `market-trial-operator.routes` supplierUserId 필터 | **수정** — owner membership 기준, owner 없는 org 에만 legacy fallback |
| ONBOARDING_BRIDGE | `operator-registration.service`(승인 멱등성 · 신청 목록) · `supplier.service` registerSupplier/approve/reject · KYC·규제품목 문서 귀속(`supplier.userId`) · `MembershipApprovalService` 재활성화 STEP5 | **유지** — 같은 가입자 lifecycle. 인가 판정 아님 |
| LEGACY_FALLBACK | `supplier-context.resolver.ts` | 유지 — 유일한 공식 fallback, `LEGACY_SUPPLIER_USER_ID_FALLBACK` 경고 |
| DEAD_RUNTIME | 없음 | — |
| MIGRATION | migrations · `canonical-schema-baseline` | 대상 아님 |

## 2. Phase B — neture-service-state 정렬
PASS. `WHERE user_id … LIMIT 1` 제거. 테스트: `neture-service-state.test.ts` "home/entry == API guard" 5건.

## 3. Phase C — legacy ownership 제거
PASS. 위 OWNERSHIP · AUTHORIZATION 행 전부 canonical adapter 경유.

## 4. Phase D — Copilot / product-access
Copilot 은 LIVE(SQL KPI · web-neture SupplierDashboardPage 소비) → 제거하지 않고 정렬. product-access 는 공급자 lookup 만 교체(write deny · manage/render read · fall-through 불변). 테스트: `product-ai-global-access.spec.ts` 에 canonical-only 공급자 케이스 추가, stub 이 공급자 canonical 쿼리와 매장 소속 쿼리를 구분.

## 5. Phase E — Event Offer 두 경로 판정
두 계열 모두 **KEEP**(실사용): web-neture 가 `/kpa/supplier/event-offers/stats` · `/kpa/supplier/my-offers` · `/neture/supplier/event-offer-proposals`, web-kpa-society `SupplierEventOfferPage` 가 `/kpa/supplier/my-offers` · event-offers 사용. 둘 다 canonical resolver 로 정렬.

## 6. Phase F — onboarding 결과가 owner membership 을 만드는가
**DRIFT 확정 → 수정.** `approveRegistration` 은 neture_suppliers(ACTIVE)만 만들고 organization_members owner 를 만들지 않았고, bizName 이 없으면 organization 도 만들지 않았다. 수정: organization 항상 생성(이름 fallback=slug) + `organizationOpsService.setOwner(org, 본인 userId, queryRunner)` (같은 트랜잭션). 기존 PENDING→ACTIVE 전이도 이번 승인으로 ACTIVE 가 된 경우에만 org+owner 보장. owner=가입 신청 본인, `approvedBy`(승인 운영자)는 owner 아님. (`supplier.service` approve 경로는 이미 `syncSupplierOrganization` → `setOwner`.)

## 7. Phase G — 알림 수신자
PASS. 정산 · offer 승인 알림은 owner 집합(다중 owner 전원). onboarding · 규제품목 문서의 `supplier.userId` 는 알림이 아니라 문서 귀속 → ONBOARDING_BRIDGE.

## 8. Phase H — 계약 테스트
`supplier-domain-boundary.spec.ts` §8-b 추가 — api-server runtime 전수(.ts, 테스트·migration·bootstrap 제외) 스캔:
- `FROM neture_suppliers WHERE user_id … LIMIT 1` 0건
- legacy user_id lookup 은 allowlist 4파일(LEGACY_FALLBACK · ONBOARDING_BRIDGE ×2 · OPERATOR_FILTER, 이유 필수 · 죽은 예외 금지)
- home == guard · 알림=owner 집합 · 승인=`setOwner`(approvedBy 금지)

## 9. 검증

| 항목 | 결과 |
|---|---|
| 관련 jest 6 suite (boundary · identity-profile · resolver · product-ai-global-access · service-state · roleContract) | **PASS 6/6, 156 tests** |
| `tsc --noEmit` (api-server) | 변경 파일 오류 0. 전체는 exit 2 — `services/ai-tools/file-understanding/*` 19건, 신규 `@o4o/file-understanding-core`(2f4777aca) 로컬 dist 미빌드. **이번 변경과 무관** |
| 전체 jest · CI | 로컬 미실행(13~21분). main CI Pipeline run 36389841303 (69e1c5aa8) **success** · CodeQL success |

## 10. Phase I — 운영 read-only relationship census (2026-09-28, 민감정보 제외)

| 항목 | 값 |
|---|---|
| users | 3 (관리자 1 · 운영자 2, 전원 Google linked, 공급자 관계 0) |
| neture_suppliers | 3 |
| organizations(type='supplier') | 7 (공급자 연결 3 · 미연결 4) |
| supplier owner membership | **0** |

| supplier | status | org | owner | legacy user_id | offer(active) | 주문 | OPL | 기타 참조 |
|---|---|---|---|---|---|---|---|---|
| 91169739 | ACTIVE | ✔ | 0 | NULL | 20(19) | 16 | 23 | screen set 9 · 규제품목 6 |
| 251adaaf | ACTIVE | ✔ | 0 | NULL | 2(1) | 6 | 1 | — |
| 5de3098e | PENDING | ✔ | 0 | NULL | 0 | 0 | 0 | 규제품목 1 |

해석: 3 공급자 모두 사업자 본인 계정이 Identity 정리(users 58→1 이후)로 사라져 **canonical · legacy 둘 다 없는 unowned 상태**다. 어느 사용자로도 resolve 되지 않으므로 runtime 에서 공급자 화면 접근은 403 NO_SUPPLIER(정상 fail-closed).
공급자 미연결 organizations(type='supplier') 4건(b05ce321 · ccc149f0 · 8aa61501 · 12f9d06f, members 0)은 보고만 한다(범위 밖).

## 11. Phase J — 공급자별 결정 (사용자 결정 2026-09-28)

| supplier | 결정 |
|---|---|
| 91169739 | **B 보존** |
| 251adaaf | **B 보존** |
| 5de3098e | **B 보존** |

owner 자동 추정 0 — 회사명 · 이메일 · 과거 문서 · approved_by 기반 연결 없음.

## 12. Phase K — 승인된 owner membership 복구
**해당 없음** (A 결정 0건). 운영 DB write 0건.

## 13. Phase L — 실제 Google Supplier 로그인 smoke
**BLOCKED_BY_SUPPLIER_ACCOUNT** — 운영에 공급자 관계를 가진 Google 사용자가 0명(§10). Google user 를 DB 에 직접 만드는 것은 금지. 재개 조건: 실제 사업자가 supplier.neture.co.kr 에서 Google 가입 → 운영자 승인(Phase F 수정본 배포 후) → owner membership 자동 생성 확인 → 로그인 smoke.

## 14. Phase M — Distribution 운영 정합성 (read-only)

| 항목 | 값 |
|---|---|
| `distribution_type` 저장값 vs 파생 규칙(is_public/service_keys) 불일치 | **0** (PRIVATE 2 · SERVICE 20) |
| allowed_seller_ids 사용 offer | 0 |
| approval_status × is_active | APPROVED/active 19 · PENDING/inactive 2 · **PENDING/active 1** |
| active OPL → inactive offer / orphan | 0 / 0 |
| active OPL → 미승인(PENDING) offer | **1** (보고만 — 데이터 write 는 범위 밖, 별도 판단) |
| 비ACTIVE 공급자의 active offer | 0 |

## 15. Phase N — Content handoff 멱등성 write smoke
**SKIPPED** — write smoke 는 명시 승인 대상이며, 실행 주체인 공급자 계정이 없다(§13). 멱등성 계약은 boundary spec §6 로 고정되어 있다.

## 16. Phase O — supplier:admin/operator 분리 · 배포

| 항목 | 상태 |
|---|---|
| `DEPLOY_ENABLED` | `false` (배포 2 대기, 사용자 결정으로 유지) |
| Deploy API Server run (69e1c5aa8) | success = **게이트 skip**, 배포 아님 |
| o4o-core-api 운영 revision | `o4o-core-api-03756-txs` 100% (05:09Z 생성, 69e1c5aa8 이전) |
| 판정 | **DEPLOY_PENDING** — 배포 2 에서 새 revision + traffic 100% 확인 필요 |
| supplier:admin/operator 분리 | 코드 경계 유지(사업자 본인=organization_members, 운영 역할=role_assignments). 운영 검증은 DEPLOY_PENDING |

## 17. 최종 판정표

| Phase | 판정 |
|---|---|
| A census | COMPLETE |
| B service-state | FIXED |
| C ownership | FIXED |
| D Copilot/product-access | FIXED (KEEP+정렬) |
| E Event Offer | KEEP 양 경로 · FIXED |
| F onboarding owner | DRIFT → FIXED |
| G 알림 | FIXED |
| H 계약 테스트 | ADDED |
| I 운영 census | COMPLETE (owner 0 · legacy 0) |
| J 결정 | B×3 |
| K 복구 | N/A (write 0) |
| L Google smoke | BLOCKED_BY_SUPPLIER_ACCOUNT |
| M Distribution | PASS (보고 1: PENDING offer 의 active OPL 1) |
| N handoff write smoke | SKIPPED (승인·계정 없음) |
| O 분리/배포 | DEPLOY_PENDING |

**SUPPLIER_CANONICAL_RUNTIME = CODE_CLOSED · PRODUCTION = DEPLOY_PENDING + OWNER_ONBOARDING_PENDING**
