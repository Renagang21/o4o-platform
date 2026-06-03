# CHECK-O4O-NETURE-OPERATOR-CONSOLE-IA-V1

> **목적**: Neture 운영자 콘솔(대시보드 + 회원/승인 관리)의 정보구조(IA) 조사.
> **성격**: 조사 전용 (코드/마이그레이션/DB 수정·커밋 없음). 모든 결론은 실제 코드/DB 쿼리 기준.
> **작성일**: 2026-06-03
> **연관 규칙**: CLAUDE.md §11(Operator Dashboard 표준), F7(Neture Partner Contract), F9(RBAC SSOT), F11(User/Operator Freeze), `docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md`

---

## 원인 요약

핵심은 **"공급자 승인"이 2단계(two-step) 흐름인데, 두 단계가 서로 다른 테이블에 살고 있고, 운영자 화면은 그중 2단계를 회원 관리에 전혀 노출하지 않는다**는 점이다.

1. **가입 승인 (1단계)** — `service_memberships.status = 'pending' → 'active'`. `/operator/applications`(가입 신청) + 회원 관리의 `가입 신청` 탭에 **정상적으로 노출됨**.
2. **공급사 승인 (2단계)** — `neture_suppliers.status = 'PENDING' → 'ACTIVE'`. 대시보드 "공급사 승인 대기 N건"의 출처가 **바로 이것**. 이 시점의 대상은 이미 1단계를 통과해 `service_memberships.status = 'active'` 상태이므로, **회원 관리 목록에는 "활성 회원"으로 나타나고, "공급사 승인 대기"라는 사실은 어디에도 표시되지 않음**.

따라서 관측된 증상("회원 관리에 승인 대기 대상이 없다")의 **정확한 원인은 "회원 목록이 pending을 거른다"가 아니라, "공급사 승인은 membership이 아니라 `neture_suppliers` 테이블의 별도 상태이고, 회원 콘솔은 그 테이블을 조회하지 않는다"** 이다. 두 카운터가 다른 테이블·다른 생애주기 단계를 보고 있어 영원히 일치하지 않는다.

부차적으로 운영자 콘솔 IA 자체가 정리되지 않았다 — 같은 데이터(`supplier_product_offers` 등)를 보는 화면이 operator/admin 중복, 사이드바에 라우트 없는 **죽은 링크 다수**, Neture 운영자 화면이 `glycopharm_products`를 직접 수정하는 cross-domain 결합 존재.

---

## 관련 파일 / 컴포넌트 / API 목록

### 대시보드 (5-block, 순수 pass-through)
- 프론트: `services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx` · `operatorConfig.ts` · `src/lib/api/operatorDashboard.ts` → `GET /api/v1/neture/operator/dashboard`
- 백엔드: `apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts` (모든 숫자 = live SQL `COUNT`/`SUM`, 클라이언트 계산·목업 없음)
- Action Queue 페이지: `OperatorActionQueuePage.tsx` → `operator-action-queue.controller.ts`

### 회원 관리
- 프론트: `UsersManagementPage.tsx`(얇은 wrapper) → `packages/operator-core-ui/src/modules/members/OperatorMembersConsolePage.tsx` → `GET /api/v1/operator/members?serviceKey=neture&status=&search=`
- 백엔드: `apps/api-server/src/controllers/operator/MembershipConsoleController.ts` (`users` ⋈ `service_memberships` EXISTS, `role_assignments` 배치 조인)

### 승인 업무 화면
- 공급사: `OperatorSupplierApprovalPage.tsx` → `operator-supplier.controller.ts` → `neture_suppliers`
- 상품(offer): `OperatorProductApprovalPage.tsx` → `operator-product-approval.controller.ts` → `supplier_product_offers`
- 서비스 승인: `ProductServiceApprovalPage.tsx` → `operator-service-approval.controller.ts` → `offer_service_approvals`
- Market Trial: `MarketTrialApprovalsPage.tsx` → `marketTrialOperatorController.ts` → `market_trials`
- 가입 승인: `registrations/RegistrationRequestsPage.tsx` → `operator-registration.service.ts`

---

## 대시보드 숫자 출처

| 카드/큐 항목 | 테이블 | 필터 | 비고 |
|---|---|---|---|
| 활성 참여 조직 | `organizations ⋈ organization_service_enrollments` | `service_code='neture'`, `isActive=true` | |
| 활성 공급사 | `neture_suppliers` | `status='ACTIVE'` | |
| 판매 상품 | `supplier_product_offers` | `is_active=true AND approval_status='APPROVED'` | |
| 월간 주문 / 매출 | `neture.neture_orders` | 최근 30일 | 테이블 없으면 `.catch→0` (0이 "없음"일 수 있음) |
| 게시 콘텐츠 | `cms_contents` | `serviceKey='neture' AND status='published'` | |
| 활성 파트너 | `neture.neture_partners` | `status='active'` | `.catch→0` |
| 정산 대기 | `neture_settlements` | `status='pending'` | |
| **가입 승인 대기** | **`service_memberships`** | **`service_key='neture' AND status='pending'`** | 회원목록과 동일 출처 ✅ |
| **공급사 승인 대기** | **`neture_suppliers`** | **`status='PENDING'`** | 회원목록이 안 보는 테이블 ⚠️ |
| 파트너 요청 | `neture_partnership_requests` | `status='OPEN'` | |
| 미확인 문의 | `neture_contact_messages` | `status != 'resolved'` | |

→ "공급사 승인 대기 N건"은 `neture_suppliers` 테이블에 `status='PENDING'`인 row 수. 공급자 *application* 도, *service_membership pending* 도, *product approval* 도 아님. 백엔드 주석에 과거 조사 `CHECK-O4O-NETURE-SUPPLIERS-PENDING-STALE-DATA-V1 — Case F 확정`이 달려 있어, 활성화도 거절도 안 된 채 남은 **stale PENDING row** 가능성 존재.

---

## 회원 관리 목록 출처

- 엔드포인트: `GET /api/v1/operator/members?serviceKey=neture` (+ `status` 탭 활성 시에만 status 전달)
- 주 테이블 **`users`**, membership 필터는 `service_memberships` 에 대한 `EXISTS` 서브쿼리. `role_assignments` 로 `roles[]` 조인. **`users.role` 미사용** (F9/F11 준수).
- 탭: `전체(all, 기본)` · 공급자/파트너/셀러(role, 클라이언트) · 활성/정지/거절/탈퇴(server status) · **가입 신청(pending)**
- **중요**: 기본 `전체` 탭은 status 필터를 보내지 않으므로 `service_memberships.status='pending'` 회원도 **포함**됨. 즉 **회원 목록은 membership-pending을 구조적으로 배제하지 않는다.**

---

## 불일치 원인 (가장 중요)

대시보드에는 **서로 다른 테이블의 두 "pending"** 이 존재:

| | 테이블 | 상태 | 회원목록에 보이나? |
|---|---|---|---|
| 가입 승인 대기 | `service_memberships` | `pending` | **보임** (전체·가입신청 탭) |
| **공급사 승인 대기** | `neture_suppliers` | `PENDING` | **안 보임** (다른 테이블) |

Neture 공급자 온보딩은 2단계 활성화(`operator-registration.service.ts`):
1. **1단계** 가입 승인 → `service_memberships.status='active'` + `neture:supplier` role_assignment 생성 + **`neture_suppliers` row를 `PENDING`으로 삽입**
2. **2단계** 공급 승인 → `neture_suppliers.status` `PENDING→ACTIVE` (`/operator/suppliers` 화면)

→ 1단계를 마친 대상은 membership 기준 **이미 "활성"** 이라 회원 목록엔 활성으로 뜨고, "공급사 승인 대기" 플래그(`neture_suppliers.status`)는 회원 콘솔이 **조회조차 하지 않아** 어디에도 안 보임. 두 카운트는 설계상 서로 다른 단계를 추적하므로 일치할 수 없음.

---

## 유지할 화면

- **대시보드 5-block** — 숫자 출처는 모두 실제 DB. 구조 건전, **IA(항목 구성)만 재설계**.
- **회원 관리** (`OperatorMembersConsolePage`) — 공통 컴포넌트, RBAC 정합. 유지.
- **가입 승인** (`/operator/applications`), **공급사 승인** (`/operator/suppliers`), **Market Trial 승인** (`/operator/market-trial`), **상품 승인** (`/operator/product-approvals`), **서비스 승인** (`/operator/product-service-approvals`) — 각자 고유 테이블, 기능 유효. 유지하되 **하나의 "승인 큐" 허브로 묶기**.
- **콘텐츠 계열**: HomepageCms, Guide Contents, Forum(관리/분석/삭제요청), Signage HQ 콘솔 — 유지.
- **주문** (`/operator/orders`, 읽기 전용) — 유지.

---

## 새로 만들거나 재구성할 화면

- **통합 "승인 큐(Action Queue)" 허브** — 가입/공급사/상품/서비스/MarketTrial 승인이 5개 화면으로 분산. 대시보드 Action Queue 카드 → 각 승인 화면으로 가는 **단일 진입 큐**로 재구성. 각 카드에 "출처 테이블·상태" 라벨 명시(숫자 출처 불명확 해소).
- **회원 상세에 "공급사 상태" 노출** — 회원이 공급자일 때 `neture_suppliers.status`(PENDING/ACTIVE)를 상세에 표시 → 2단계 불일치가 운영자에게 가시화. (현재 `listRegistrations`가 이미 `ns.status AS supplierStatus`를 LEFT JOIN으로 가져오나 필터에만 쓰고 표시 안 함 — 표시로 승격.)
- **공급자/파트너 상태 보드** — 활성/대기/거절을 한눈에. 파트너는 현재 operator-scope 승인 화면 자체가 없음(F7는 supplier-recruitment + partner 자가신청 구조). 운영자용 파트너 현황 보드 신설 검토.
- **죽은 사이드바 링크 정리** — 아래 삭제 항목 참조.

---

## 삭제 또는 후순위로 보낼 화면

- **죽은 파일**: `AllProductsOverviewPage.tsx` — App.tsx에서 import조차 안 됨, `AllRegisteredProductsPage`로 대체됨. 제거.
- **죽은 사이드바 링크** (`operatorMenuGroups.ts` / UNIFIED_MENU의 `adminOnly` 항목): `/operator/partners`, `/operator/partner-settlements`, `/operator/settlements`, `/operator/commissions`, `/operator/categories`, `/operator/brands`, `/operator/service-approvals`, `/operator/product-cleanup`, `/operator/masters`, `/operator/catalog-import`, `/operator/operators`, `/operator/roles` 등 — `/operator/*` 라우트 없고 `/admin/*` 만 존재 → admin이 operator 사이드바를 볼 때 깨진 링크. `/admin/*`로 정정하거나 메뉴에서 제거.
- **죽은 네비게이션**: `AdminPartnerMonitoringPage`가 `navigate('/operator/partners/:id')` 하지만 해당 라우트 없음.
- **중복 화면(operator/admin twin)**: 공급사·상품·서비스 승인이 operator와 admin에 각각 존재(같은 테이블). 통합 또는 역할 경계 명문화 — 후순위.
- **Cross-domain 결합**: `RecruitingProductsOverviewPage`가 Neture 엔드포인트로 **`glycopharm_products`**(`is_featured`/`is_partner_recruiting`)를 직접 수정 — Boundary Policy(§7) 검토 대상. 후순위지만 기록 필요.

---

## 새 Neture 운영자 대시보드 IA 제안 (정보구조 수준)

```
┌─ 오늘 처리할 일 (Action Queue) ─────────────────────────┐
│  • 가입 승인 대기 N        → /operator/applications      │
│  • 공급사 승인 대기 N      → /operator/suppliers         │  ← 각 카드에 "출처: 테이블·상태" 표기
│  • 상품 승인 대기 N        → /operator/product-approvals  │
│  • 서비스 승인 대기 N      → /operator/product-service-…  │
│  • Market Trial 승인 N     → /operator/market-trial       │
│  • 미확인 문의 N           → /operator/contact-messages   │
│  • 파트너 요청 N           → (파트너 현황)                 │
├─ 공급자 / 파트너 상태 ───────────────────────────────────┤
│  활성 공급사 · 대기 공급사 · 활성 파트너 · 파트너 요청    │
├─ 상품 / 콘텐츠 상태 ─────────────────────────────────────┤
│  판매중 상품 · 승인대기 상품 · 게시 콘텐츠               │
├─ Market Trial 진행 상태 ────────────────────────────────┤
│  모집중 · 개발중 · 이행중 · 종료 (상태머신 단계별 카운트) │
├─ 주문 / 정산 요약 ──────────────────────────────────────┤
│  월간 주문 · 월간 매출 · 정산 대기  (정산 상세는 /admin)  │
├─ 빠른 이동 ─────────────────────────────────────────────┤
│  회원관리 · 공급사 · 상품 · 콘텐츠 · 사이니지 · 분석      │
└─────────────────────────────────────────────────────────┘
```

핵심 원칙 3가지:
1. **회원 관리 = 기존 회원의 상태/역할** 만, **승인 업무 = 별도 Action Queue 허브** 로 분리.
2. 모든 숫자 카드에 **출처 테이블·상태 라벨** 부착(불명확성 제거).
3. Neture는 커뮤니티가 아니라 **공급자–파트너–상품–MarketTrial–주문/정산** 흐름 중심이므로 그 축으로 블록 배열.

---

## 엔티티 구분 요약 (혼동 방지)

| 개념 | 테이블 | 정체 | 핵심 상태 |
|---|---|---|---|
| 회원/user | `users` | 전역 신원 1행 (role 컬럼 없음, F9/F11) | — |
| service_membership | `service_memberships` | 서비스별 가입 상태; Operator는 여기서 파생(F11) | pending/active/suspended/rejected/withdrawn |
| role_assignment | `role_assignments` | **인가 SSOT**(F9). supplier/partner/seller 역할 존재 | isActive |
| 공급자(Neture) | `neture_suppliers` | 공급자 *프로필/조직* + 승인 생애주기 | PENDING/ACTIVE/INACTIVE/REJECTED |
| 파트너 계약(F7) | `neture_seller_partner_contracts` | 승인된 셀러↔파트너 관계(commission snapshot 불변) | active/terminated/expired |
| 파트너 신청 | `neture_partner_applications` | 파트너 가입 *신청* → 승인 시 계약 생성 | pending/approved/rejected |
| 역할 신청 | `role_applications` | 역할 *신청* → 승인 시 role_assignment 생성 | pending/approved/rejected |

→ **신청(application) 테이블과 승인된 레코드는 항상 분리**. "공급사 승인 대기"는 신청 테이블이 아니라 **이미 생성된 `neture_suppliers` 레코드의 PENDING 상태**라는 점이 일반적 직관과 어긋나 혼선을 일으킴.

엔티티/생애주기 체인:
1. **users** = 누구인가 (전역 신원 1행)
2. **service_memberships** = 이 서비스 소속 여부 및 상태 (pending→active…). Operator는 active membership + role에서 파생(F11)
3. **role_assignments** = 무엇을 할 수 있는가 (RBAC SSOT, F9). supplier/partner/seller 역할이 여기 존재
4. **application 테이블은 승인 레코드와 분리**: 역할신청→`role_applications`→승인→`role_assignments`; 파트너 모집신청→`neture_partner_applications`→승인(txn)→`neture_seller_partner_contracts`(commission snapshot)
5. **공급자**는 *역할*(assignment/membership)이자 *프로필 조직*(`neture_suppliers`, `organizations` 브리지). 승인 생애주기는 `neture_suppliers` row에 존재

---

## Current Structure vs O4O Philosophy Conflict Check

`docs/baseline/O4O-BUSINESS-PHILOSOPHY-V1.md` §3·§7 기준:

- ✅ **정합**: 공급자가 in-app 콘텐츠 제작 주체가 아님(§3.1 "원천 자료 전달"). Neture에서 supplier signage/content 진입점이 실제 제거됨(App.tsx 주석). 운영자 화면이 수신·등록·큐레이션·매장지원 역할 담당.
- ✅ **정합**: §7 "내 매장이 없는 서비스(현재: Neture)에 내 매장 기능을 추가하지 않는다" — Neture에 operator-scope 매장 실행/내 매장 surface 없음. store ops는 downstream(GlycoPharm/Cosmetics/KPA).
- ⚠️ **Drift(경미)**: 운영자 사이드바가 라우트 없는 `/operator/*` 정산·카탈로그 링크를 광고 — 거버넌스 drift(철학 위반 아님).
- ⚠️ **Boundary 검토**: Neture 운영자 화면이 `glycopharm_products`를 직접 변경 — §7 Boundary Policy(Cross-domain) 위반 소지. 별도 판단 필요.
- ⚠️ **개념 혼선**: "회원 관리 ↔ 승인 업무"가 UX상 섞여 2단계 공급자 승인의 가시성 저하 — IA 재설계로 해소 권장.

---

## Read-only DB Confirmation

**확인 일시**: 2026-06-03 · **대상**: 프로덕션 `o4o-platform-db` / `o4o_platform` (Cloud SQL, `gcloud sql connect` IP 화이트리스트 경유, `o4o_api` 계정, **SELECT only**)
**검증 방식**: 무수정 read-only. UPDATE/DELETE/INSERT 없음.

### `neture_suppliers` status 분포

| status | count |
|---|---|
| ACTIVE | 1 |
| **PENDING** | **2** |

→ 대시보드 "공급사 승인 대기 2건"은 **실제 DB 상태와 정확히 일치**(`neture_suppliers WHERE status='PENDING'` = 2).

### PENDING supplier rows

| | Row 1 | Row 2 |
|---|---|---|
| supplier_id | `251adaaf-…-7f81ffef36a6` | `91169739-…-b3d4a93d65eb` |
| slug | `supplier-52a4c1e6` | `supplier-6967ebe0` |
| user_id | `52a4c1e6-…-a47637e8ca3a` | `6967ebe0-…-8c7190493cef` |
| contact_email | sohae21@naver.com | renagang21@gmail.com |
| representative_name | 서철환 | 서 Renagang21 |
| organization_id | `69e985ae-…` | `95aad740-…` |
| created_at | 2026-05-24 06:11 | 2026-05-30 02:58 |
| approved_by / approved_at | (empty) | (empty) |
| rejected_reason | (empty) | (empty) |
| 프로필 충실도 | **거의 비어있음** (logo/category/description/pricing/moq/shipping 모두 NULL, contact·대표자명만 존재) | **거의 비어있음** (동일) |
| **membership(neture).status** | **active** | **active** |
| **membership.role** | **supplier** | **supplier** |
| role_assignment `supplier`.is_active | **t** | **t** |
| users.status | active | active |

*(연락처 전화번호 등 PII는 마스킹.)*

### stale 여부 판단

**결론: 처리 가능한(actionable) 실데이터이나, 사실상 개발/테스트 잔재(stale test data).**

근거:
1. **2단계 흐름의 "stage-2 미완" 상태** — 두 row 모두 stage-1(가입 승인)은 완료되어 `service_memberships.status='active'` + `role_assignments.supplier(is_active=t)` 를 보유. 그러나 `neture_suppliers.status='PENDING'` 이고 `approved_by/approved_at/rejected_reason` 가 전부 비어 있어 **stage-2(공급 승인)가 한 번도 처리되지 않음**. 이는 조사 본문의 "2단계 불일치" 가설을 **DB로 실증**한다 — 즉 회원 목록엔 "활성"으로 보이고, 공급사 승인 큐엔 "대기"로 남는 정확히 그 상태.
2. **처리 가능 대상 맞음** — `/operator/suppliers` 화면(`operator-supplier.controller.ts` → `neture_suppliers WHERE status='PENDING'`)이 이 2건을 그대로 나열하며, 운영자가 승인(→ACTIVE)/거절(→REJECTED) 할 수 있다. 고아(orphan)·손상 데이터 아님.
3. **그러나 stale test 잔재로 판단** — 두 계정 모두 개발자/사용자 본인 테스트 계정(`renagang21@gmail.com` = git committer Renagang21, `sohae21@naver.com` = 사용자 본인 계열)이고, 공급자 프로필이 사실상 비어 있으며, 생성 후 수일~수주간 미처리로 방치됨. 한 계정은 store_owner(kpa/cosmetics/glycopharm)·lms:instructor·pharmacy 등 잡다한 역할을 동시에 보유한 전형적 테스트 계정. 프로젝트 정책상 운영 DB 데이터는 현재 disposable(pre-service)이므로, 실제 사업 공급자의 승인 대기가 아니라 **완료되지 않은 테스트 온보딩**으로 보는 것이 타당.

### 후속 작업 권장안

1. **데이터 측면** — 이 2건은 코드 버그가 아니므로 코드 수정 불필요. 대시보드 baseline을 깨끗이 하려면 (a) `/operator/suppliers`에서 거절/승인으로 큐 비우기, 또는 (b) test 잔재로 정리. **단, 어느 쪽이든 DB write 이므로 사용자 승인 후 진행** (이번 작업 범위 외).
2. **UX 측면 (대시보드 v2의 핵심)** — 카운트 자체는 정확하므로 **데이터 repair가 아니라 가시성 재설계**가 본질. 회원 상세에 `neture_suppliers.status` 노출 + 승인 큐 허브화(본문 IA 제안)로 2단계 불일치를 운영자에게 드러내는 것이 우선.
3. **검증 채널 메모** — 프로덕션 read-only 검증은 `gcloud sql connect o4o-platform-db --user=o4o_api`(IP 5분 화이트리스트) 후 동일 IP에서 `psql -h 34.64.96.252 sslmode=require` 직접 접속으로 수행. 운영 DB user는 `postgres` 가 아니라 **`o4o_api`** (Cloud Run env 기준).

