# IR-O4O-NETURE-SUPPLIER-FULL-WORKFLOW-AND-DASHBOARD-CLOSEOUT-AUDIT-V1

> **성격:** Neture 공급자(Supplier) 트랙 전체 업무동선·대시보드·메뉴·도달성·권한의 **최종 closeout 조사**. read-only 감사.
> **작성일:** 2026-07-27
> **대상:** `services/web-neture/` 공급자 표면 전체 (약 50개 페이지·레이아웃·가드·API 라이브러리)
> **범위 제약:** 코드 변경 0 · DB write 0 · 운영 mutation 0 · 배포 0. 프로덕션 실데이터 쿼리는 수행하지 않고 "후속 데이터 게이트 후보"로만 기록.
> **최종 판정:** **`SUPPLIER_WORKFLOW_CLOSED_WITH_MINOR_DRIFT`** — 공급자는 가입~정산 전 동선을 end-to-end 완수 가능. P0 기능 차단 0. 잔여는 IA/중복 drift · 1개 퍼널 dead-end · load-error 계약 편차 · 크로스링크 갭.

---

## 1. 조사 방법

`services/web-neture/src/` 공급자 표면을 5개 축으로 병렬 read-only 정독:

1. **라우팅·메뉴·가드·레이아웃·대시보드 스켈레톤** (App.tsx 전 supplier route + 3 레이아웃 + 3 대시보드 + SupplierRoute/ActivationGate)
2. **상품 등록·임포트·오퍼** (register-entry / create / import-assistant / bulk / csv-import / products / offers / event-offers / library)
3. **콘텐츠·매장설명서·태블릿·사이니지·HUB·자료함** (store-descriptions / screen-sets / signage / b2b-content / library)
4. **주문·재고·배송·정산·커미션** (orders / order-detail / inventory / settlements / partner-commissions)
5. **모집·트라이얼·파트너·승인·프로필·온보딩·알림** (recruitments / market-trial / profile / landing / admin·operator approval / activation gate / notifications)

각 축은 route·guard·backend API·load-error 처리·중복/고아 여부를 `file:line` 근거로 수집. 코드 수정·DB 접근·배포 없음.

---

## 2. 한 줄 결론

공급자 실기능은 **대부분 ACTIVE·정상 동작**하며 P0 결함은 0이다. 실제 문제는 **IA/구조 정합성 층**이다 — 3개 route 트리(`/supplier/*` canonical, `/account/supplier/*` 고립 섬, `/workspace/*` 레거시 셸)와 3개 대시보드(1 canonical + 1 중복 섬 + 1 목업 죽은 코드)가 공존하고, 상품 목록·승인 콘솔이 이중화되어 있으며, 등록→오퍼 퍼널의 마지막 "공급 오퍼" 페이지가 dead-end다. 이는 KPA "내 매장" 감사( [[ir-kpa-my-store-full-structure-audit]] )와 **동일한 성격**의 정합성 이슈다: 기능은 살아있고, 진입점·중복·고아 층이 어긋나 있다.

---

## 3. 공급자 표면 인벤토리 (라우트 트리 3종)

| 트리 | 레이아웃 | 가드 | 성격 |
|------|---------|------|------|
| **`/supplier/*`** (SupplierSpace) | `SupplierSpaceLayout` (사이드바 7그룹·19타깃) | `SupplierRoute` | **Canonical** 공급자 작업 공간 |
| **`/account/supplier/*`** (SupplierAccount) | `SupplierAccountLayout` (사이드바 3항목) | `SupplierRoute` | 고립 섬 — 외부 진입 없음(§9 DUP-1) |
| **`/workspace/*`** (SupplierOps) | `SupplierOpsLayout` | 별도 | 레거시 operator/workspace 셸. `/workspace/supplier/*`는 `/supplier/*`로 redirect (`App.tsx:1160-1167`) |

canonical 랜딩은 `config/dashboard.ts:45` 가 공급자를 항상 `/supplier/dashboard` 로 보낸다. `/account/supplier` 로 보내는 외부 네비게이션은 없다.

---

## 4. 가드·권한 도달성

3중 방어이나 role-set 불일치가 존재한다.

- **A. Route guard `SupplierRoute`** (`components/auth/RoleGuard.tsx:188-198`) — `/supplier/*` · `/account/supplier/*` 양쪽을 래핑. `allowedRoles = SUPPLIER_ROLES = ['neture:supplier','supplier','partner','seller']` (`role-constants.ts:70-75`, B2B-wide·레거시 partner/seller 포함) + `requireMembership='neture'`. 흐름: 비인증→`/login`(fail-closed·state.from) → role 실패→`/` → `MembershipGate serviceKey="neture"`(none/pending/rejected/suspended 안내). **auth/role/membership 전부 fail-closed.**
- **B. 레이아웃 재검증** — `SupplierSpaceLayout.tsx:269-284` · `SupplierAccountLayout.tsx:41-56` 가 독립적으로 `SUPPLIER_ACCESS_ROLES = ['neture:supplier','supplier','neture:admin','platform:super_admin']` (`role-constants.ts:84-89`) 재확인 후 미충족 시 인라인 403.
- **C. `SupplierActivationGate`** (콘텐츠 레벨, route guard 아님) — `getProfile()` 의 `status` 기준. `mode='gate'`(상품 등록 진입)=비승인(PENDING/REJECTED/INACTIVE)만 차단·**프로필 API 실패 시 fail-OPEN**(`:117-118`); `mode='banner'`(대시보드)=항상 children 렌더 + 상태 배너. 실제 강제는 서버 `requireActiveSupplier` 에 위임.

**⚠️ 가드 불일치 (P3):** `SUPPLIER_ROLES`(route)는 레거시 `partner`/`seller`를 허용하나 `SUPPLIER_ACCESS_ROLES`(레이아웃)는 제외 → 순수 `partner`/`seller`는 route guard를 통과하고 레이아웃 403에 막힌다. 도달성은 결과적으로 닫히나, 두 상수의 진리원이 갈린다.

**정정 노트 (WO 전제 대비):** 본 WO 전제는 "getProfile throw → ActivationGate fail-closed"였으나, 현재 코드는 **의도적 fail-OPEN**이다(`SupplierActivationGate.tsx:15-16,79-89,117-118` 주석 명시). `getProfile()`는 실패 시 `SUPPLIER_PROFILE_LOAD_FAILED` throw하나(`supplier.ts:1348-1353`), 게이트가 이를 `fetchFailed`로 흡수해 통과시키고 서버 게이트에 위임한다. 이는 [[project-neture-load-error-contract-series]] 묶음4에서 관측된 설계와 일치한다.

---

## 5. 공급자 14단계 업무동선 end-to-end 검증

가입~정산 전 동선을 단계별로 추적. 판정: **W**=완전 wired · **⚠**=drift/부분 · **✕**=차단.

| # | 단계 | 진입/화면 | 판정 | 근거·비고 |
|---|------|----------|:---:|----------|
| 1 | 랜딩·가입 | `SupplierLandingPage` (`/supplier`) → `/register` | W | 정적 랜딩·CTA 2개(`:108,242`). step2="운영자 승인"(`:82`) |
| 2 | 승인 | Operator/Admin 승인 콘솔 → PENDING→ACTIVE | W | canonical=Operator(`/operator/suppliers`). §11·§9 DUP-3 |
| 3 | 활성화 게이트 | `SupplierActivationGate` (banner/gate) | W | fail-open·서버 위임(§4) |
| 4 | 대시보드 진입 | `/supplier/dashboard` (canonical #1) | W | 실API·`Promise.allSettled` 영역별 격리(§6) |
| 5 | 프로필·온보딩 | `SupplierProfilePage` (`/mypage/business-profile`) | W | 기본정보·서류·정산·통신판매·규제카테고리·B2B조건·배송. per-section throw+retry |
| 6 | 상품 등록 진입 | `SupplierProductRegisterEntryPage` (`/supplier/products/register`) | W | 의약품/비의약품 2-branch → single/bulk. 순수 네비 |
| 7 | 상품 생성/임포트 | Create(`/new`) · Import-assistant · Library · Bulk | W | register→create/bulk·import saveDraft→create·library select→create 전부 wired |
| 8 | 상품 목록 관리 | `SupplierProductsPage` (`/supplier/products`) canonical | W | 21컬럼 wide·탭·bulk·offer-action 컬럼·load-error 계약 |
| 9 | 공급 오퍼 | `SupplierSupplyOffersPage` (`/supplier/supply-offers`) | **✕→⚠** | **dead-end**: 생성 UI 없음·"판매자 모집" 준비중 stub(`:60-69`). 실제 publish=상품 행 `updateDistribution`. 능력은 존재·퍼널 착지점이 빈 페이지(§7·P1) |
| 10 | 이벤트 오퍼 | `SupplierEventOfferPage` (`/supplier/event-offers`) | ⚠ | propose는 wired(`:362`)·상태 load는 silent swallow(`getEnrichedOffers→[]`) |
| 11 | 매장용 설명서 | `SupplierStoreDescriptionsPage` + Editor Drawer | W | SPD STORE·draft→needs_review→(operator)→canonical·**ko/en/zh/ja 다국어**·초기 load만 silent(§8) |
| 12 | 태블릿·사이니지·HUB | ScreenSets · Signage → HUB publish | W | screen-set publish=hub_target_store_type+medication guard·signage=guard 없음. 매장 독립 사본(§8) |
| 13 | 모집·트라이얼·주문·배송·재고 | Recruitments · Market-Trial · Orders · Inventory | W | 모집(seller)≠트라이얼(store funding) 별개 축(§10). 주문→배송 fulfillment 완전(§12) |
| 14 | 정산·커미션 | `SupplierSettlementsPage` · `SupplierPartnerCommissionsPage` | W→⚠ | 정산 read-only·커미션 CRUD. 배송↔정산 UI 크로스링크 부재(§12·P3)·커미션 CRUD freeze 범위 확인 필요(§16) |

**동선 종합:** 14단계 전부 **기능적으로 완수 가능**. 단 9단계(공급 오퍼)는 퍼널 착지점이 빈 페이지라 사용자가 "여기서 오퍼를 만든다"고 오해할 수 있는 유일한 실질 dead-end이며, 실제 능력은 상품 행에 존재한다.

---

## 6. 대시보드 감사 (3종 — 1 canonical + 1 중복 섬 + 1 죽은 코드)

| # | 파일 | 라우트 | 데이터 | 판정 |
|---|------|--------|--------|------|
| 1 | `pages/supplier/SupplierDashboardPage.tsx` | **`/supplier/dashboard`** | 실API·`Promise.allSettled` 영역별 실패 격리(copilot KPI/AI/성과/유통/트렌딩 + order/inventory/settlement KPI + approval counts + profile + recruitment + store-desc + trials + event stats) | **CANONICAL** — 가장 최신·풍부 |
| 2 | `pages/account/SupplierAccountDashboardPage.tsx` | `/account/supplier` | 실API(`dashboardApi.getSupplierDashboardSummary` 등) | **DUPLICATE 섬** — #1과 기능 중첩·외부 진입 0(§9 DUP-1) |
| 3 | `pages/dashboard/SupplierDashboardPage.tsx` | **없음** | **하드코딩 목업**(156·₩8.2M·가짜 #ORD 행) | **ORPHAN 죽은 코드** — import 0·App.tsx 미등록. safe-delete 후보 |

canonical #1은 ActivationGate 배너·처리필요·핵심 KPI·업무 바로가기·상품/콘텐츠·유통활동·계정상태·collapsible AI 분석을 모두 갖춘 5-Block 성격의 완성 대시보드다.

---

## 7. 상품·오퍼 퍼널 정합

- **canonical 세트:** `SupplierProductsPage`(목록) · `SupplierProductCreatePage`(단건) · `SupplierBulkRegisterPage`(대량) · `SupplierProductImportPage`(자사 관리자 단건 임포트) · `SupplierProductLibraryPage`(마스터 검색) · `SupplierEventOfferPage`(이벤트).
- **퍼널 wiring:** register-entry→create/bulk ✅ · import saveDraft→create ✅ · library select→create ✅ · create-success→list/register/supply/event/trial ✅ · 목록 offer-action(`buildOfferActionUrl`)→event 모달 자동 오픈 ✅.
- **유일 dead-end:** `SupplierSupplyOffersPage`(`/supplier/supply-offers`) — 정보 허브일 뿐 생성 UI 없음·"판매자 모집" 준비중 stub(`:60-69`). 실제 유통 publish는 상품 행 `supplierApi.updateDistribution`. **퍼널이 가리키는 착지점만 빔** (P1).
- **Import 삼중 경로 = 실중복 1개:** bulk(canonical) ↔ csv-import(자기선언 legacy·앰버 배너로 bulk 유도 `:446`)가 진짜 중복. import-assistant는 이름만 유사·자사 Firstmall HTML 단건 스크레이프로 **성격 다름·유지**.

---

## 8. 콘텐츠·매장설명서·HUB 전달 감사

- **매장용 설명서(SPD):** 공급자→product 선택→Editor Drawer→`POST /neture/supplier/store-descriptions`(submit:false=draft / true=needs_review). canonical=`shared_product_descriptions` (`description_type=STORE`, `source_type=supplier`). **draft→needs_review→(operator)→canonical** + revision_requested(자동삭제)·hidden/deprecated. 공급자는 canonical 직접 write 불가. **다국어 ko/en/zh/ja 탭 지원**(언어별 독립 SPD 행·자동번역 없음) — [[ir-store-description-multilingual-registration-audit]] 의 "공급자 프론트 ko고정" 관측이 이 화면에서는 **해소**되어 있음(정정 근거).
- **HUB publish 2축(둘 다 매장 독립 사본):** ① Screen-sets→`POST /kpa/supplier/screen-sets/:id/publish {hubTargetStoreType}` (pharmacy/non_pharmacy/all) + **medication guard**(`MEDICATION_PHARMACY_ONLY` 서버 게이트). `service_key='kpa'`로 매장 HUB `/store/screen-set-hub/supplier-templates` 노출. builder=`TabletContentStepBuilder` `contentSources=['spd']`(위 SPD가 콘텐츠 소스로 유입). ② Signage→`POST /kpa/supplier/signage/media/:id/publish` — **타깃 셀렉터·medication guard 없음**.
- **base-path 분기(의도적):** store-descriptions=`/neture/*`(operator 검수 파이프)·screen-sets/signage=`/kpa/*`(소비처가 KPA 매장 태블릿/사이니지 HUB).
- **B2B vs SPD (중복 아님·혼동 위험):** `SupplierB2BContentPage`는 offer 행의 `businessShort/DetailDescription` 직접 편집(B2B 도매 뷰), store-descriptions는 SPD 검수 큐. 다른 컬럼·다른 소비처이나 같은 네비 근처("제품 콘텐츠" vs "매장용 설명서")라 사용자 혼동 가능(§9 참조).

---

## 9. 중복 / 고아 / UNREACHABLE 판정

| ID | 유형 | 대상 | 근거 | 처리 방향 |
|----|------|------|------|----------|
| **DUP-1** | 중복 섬 | `/account/supplier/*` 트리 전체(대시보드#2·products·orders·inventory·settlements) | 외부 진입 0·`config/dashboard.ts:45`는 항상 `/supplier/dashboard` | canonical=`/supplier/*`로 통합·`/account/*`은 redirect화 |
| **DUP-2** | 중복 목록 | `SupplierProductsListPage`(`/account/supplier/products`) | `SupplierProductsPage` canonical의 구형 단순판(비페이지네이션) | 통합/은퇴 |
| **DUP-3** | 중복 콘솔 | `AdminSupplierApprovalPage`(`/admin/admin-suppliers`) | canonical=Operator(`OperatorSupplierApprovalPage.tsx:14-17`). Admin은 legacy·**deactivate만 고유**·헬퍼 verbatim copy-paste | deactivate를 operator로 흡수 후 admin 은퇴, 또는 super-admin superset 명문화 |
| **DUP-4** | 이중 마운트 | `SupplierQualityPage`(operator+admin 동일 컴포넌트 2 route) | `App.tsx:1136,1020` | admin 마운트 정리 |
| **DUP-5** | 이중 마운트 | OrderDetail/Inventory/Settlements 각 `/supplier/*`+`/account/supplier/*` | `App.tsx:813-815`+`862-864`·pathname 분기 self-adapt | canonical 트리 1개로 |
| **DEAD-1** | 죽은 코드 | `pages/dashboard/SupplierDashboardPage.tsx`(목업) | import 0·미등록 | 삭제 |
| **DEAD-END-1** | 빈 착지 | `SupplierSupplyOffersPage` | 생성 UI 0·준비중 stub | 실 생성 UI 연결 또는 퍼널 재라우팅 |
| **UNREACH-1** | 도달불가 | `/supplier/library`(+`/new`,`/:id/edit`) | 사이드바 없음·self-ref만 | 진입점 부여 또는 은퇴 |
| **UNREACH-2** | 도달불가 | `/supplier/csv-import` | 메뉴 의도적 제거(`SupplierSpaceLayout.tsx:60-63`)·legacy | bulk 이관 후 은퇴 |
| **DEAD-LINK-1** | 자기참조 | `SupplierOrdersPage` "주문 처리 workspace 열기" CTA→`/supplier/orders`(자기 자신) | `SupplierOrdersPage.tsx:179`. 실 처리 목록은 `/account/supplier/orders` | 링크 타깃 정정 |

**참고(고아 아님):** `SupplierProductLibraryPage`·`SupplierSupplyOffersPage`는 인바운드 존재. 과거 진입점(`/supplier/signage/content`·`/manage`)은 고아가 아니라 삭제됨(WO 주석).

---

## 10. 모집 vs 트라이얼 · 파트너

**별개 기능·어휘만 유사:**
- **Supplier Recruitment**(`/neture/partner/recruitments/*`) = 공급자가 **판매자/파트너** 모집(PRIVATE 상품 유통). 승인=공급자 측 + service-exposure 승인=서비스 운영자.
- **Market Trial "유통참여형 펀딩"**(`/api/market-trial/*`) = 공급자가 **매장/참여자** 모집(크라우드펀딩형 store-landing). 승인=Neture operator. commerce/settlement mutation은 클라이언트 하드 비활성(content-only, [[project_market_trial_content_only_phases]]).
- **Trial CRUD:** Create/Read(list+detail)/Update(draft-only) wired·**Delete 없음(설계)**. Edit=CreatePage `mode="edit"` 재사용.

---

## 11. 주문·재고·배송·정산 체인

- **주문→배송: 완전 wired.** 목록(`/account/supplier/orders`)→상세→`created/paid→preparing`(status)→`preparing→shipped`(송장 `POST /shipment`)→`delivered`(`PATCH /shipments/:id`). Shipment Engine이 전이 소유·배송 상태 UI 실재(stub 아님).
- **배송→정산: 백엔드 계산만·UI 크로스링크 부재.** OrderDetail↔Settlements 상호 링크 없음(정산 확장행의 주문번호=plain text `SupplierSettlementsPage.tsx:257`). 서버측 결합은 존재("배송 완료된 주문의 정산 현황" `:283`)하나 공급자가 클릭 이동 불가 (P3).
- **정산:** read-only payout(미정산/지급완료 KPI·기간별 매출/수수료/순액/상태). 승인·지급은 admin.
- **재고:** offer 단위 stock(total/reserved/available·low-stock·tracking). 상품 목록과 직접 링크 없음(대시보드 QuickAction 경유).
- **커미션:** `SupplierPartnerCommissionsPage` = 공급자→파트너 per-unit(`commission_per_unit`) **정책 CRUD**(create/update/hard-delete). §16 freeze 검토 대상.

---

## 12. 알림(notifications) 도달

- 공급자 페이지 자체는 알림 미소비. 유일 표면=글로벌 크롬 `NetureGlobalHeader`(`NotificationBell`+`useNotifications` from `@o4o/account-ui`) + 모바일 `NetureBottomNav`.
- **metadata 기반 라우팅:** `lib/notificationRouting.ts` `resolveNetureNotificationTarget(n)`이 `n.metadata.targetUrl`을 읽어 이동, 없으면 null.
- **갭(P3):** 공급자별 이벤트 핸들러·per-event 라우팅 맵·`targetUrl` 부재 시 fallback 없음 → 백엔드가 `metadata.targetUrl` 미주입 시 클릭 no-op. 주문접수/승인/트라이얼신청 알림은 전적으로 백엔드 payload에 의존.

---

## 13. load-error 계약 정합 (3 패턴 공존)

[[project-neture-load-error-contract-series]] 4묶음이 대부분 표면을 throw+재시도로 정비했으나 3 패턴이 잔존한다.

- **A. throw+4상태+재시도 (best):** Products · ProductsList · Orders(전체) · Inventory · Settlements · Recruitments · RecruitmentDetail · Profile · OperatorApproval · ScreenSets · Signage · B2B-Content · Library · SupplierConditionModal.
- **B. error string·재시도 없음 (중):** Market-Trial 3화면(List/Detail/Edit).
- **C. silent swallow (약):** StoreDescriptions(초기 load `:61,75,89`+Drawer `:106`) · EventOffer(`getEnrichedOffers→[]`,`listMyProposals→[]`) · CsvImport(`getBatches :100`) · ProductLibrary(`doSearch :65`) · ProductCreate(`getCategories :189`) · AdminSupplierApproval(`:79-84`) · SupplierQuality(`:91-95`) · RegulatedCategoriesModal(`load :52-58`).

패턴 C의 사용자 직면 목록(EventOffer·StoreDescriptions·AdminApproval)은 "실패=0건"으로 오인되는 안티패턴을 여전히 노출한다.

---

## 14. HUB·매장 전달 계약 요약

- 공급자 산출물이 매장에 닿는 3 경로: ① SPD STORE 설명서(검수 큐→canonical→매장 import=copy) ② Screen-set HUB publish(hub_target_store_type+medication guard→매장 독립 사본) ③ Signage HUB publish(가드 없음→매장 Full Copy). 모두 **매장 소유 독립 사본** 계약(공급자 원본 수정이 기존 매장 사본에 소급 안 됨).
- `store_asset_derivations`/`hub_target_store_type` 중 `hub_target_store_type`은 프론트에서 확인. derivation 테이블 semantics는 백엔드 스코프(프론트 범위 밖·본 IR 미검증).

---

## 15. P0–P3 잔여 분류

| 등급 | 항목 | 위치 |
|:---:|------|------|
| **P0** | *(없음 — 기능 차단 0)* | — |
| **P1** | 공급 오퍼 페이지 dead-end (퍼널 착지 빈 화면) | DEAD-END-1 (§7·§9) |
| **P1** | SupplierOrdersPage 자기참조 CTA(실 처리 목록 미도달) | DEAD-LINK-1 (§9·§11) |
| **P2** | 목업 대시보드 죽은 코드 | DEAD-1 (§6) |
| **P2** | `/account/supplier/*` 중복 섬 + 중복 상품 목록 | DUP-1·DUP-2 (§9) |
| **P2** | csv-import legacy(UNREACHABLE) | UNREACH-2 (§7·§9) |
| **P2** | 사용자 직면 load-error silent swallow(EventOffer·StoreDescriptions·AdminApproval 등) | §13-C |
| **P2** | `/supplier/library` UNREACHABLE 섬 | UNREACH-1 (§9) |
| **P3** | 이중 마운트(OrderDetail/Inventory/Settlements·Quality) | DUP-4·DUP-5 (§9) |
| **P3** | 승인 콘솔 이중화 + 헬퍼 copy-paste 부채 | DUP-3 (§9·§11) |
| **P3** | 가드 role-set 불일치(SUPPLIER_ROLES vs SUPPLIER_ACCESS_ROLES) | §4 |
| **P3** | 알림 fallback 라우팅 부재 | §12 |
| **P3** | 주문↔정산 UI 크로스링크 부재 | §11 |
| **P3** | Market-Trial 3화면 재시도 버튼 부재(B 패턴) | §13-B |
| **P3** | 파트너 커미션 CRUD의 F7 freeze 범위 확인 | §16 |

---

## 16. Freeze·계약 준수 확인

- **F7 Neture Partner Contract (FROZEN):** 계약 테이블·ENUM·트랜잭션·Commission 불변. `SupplierPartnerCommissionsPage`는 per-unit 커미션 **정책** CRUD(commission_per_unit·start/end)로, 이는 정산된 커미션 값의 변경이 아니라 **공급자의 정책 설정**으로 보인다. 코드에 F7/freeze 가드는 없다. **판정 보류 — freeze 범위(정책 설정 허용 여부)를 F7 문서 기준으로 확인 필요.** 위반 단정 아님(§15 P3).
- **F8 Distribution Engine:** 유통 publish는 상품 행 `updateDistribution` 경유(§7)로 관측·본 IR은 상태머신 무변경 read-only.
- **KPA Signage freeze:** 공급자 signage HUB publish는 `/kpa/*` 소비·매장 독립 사본 계약 준수(§8·§14).
- **RBAC(F9~F11):** 승인 canonical=operator·membership 기반 게이트(§4·§11)로 정합.

---

## 17. 후속 데이터 게이트 후보 (프로덕션 실데이터 — 본 IR 미조회)

§21 제약에 따라 아래는 **조회하지 않고 후보로만 기록**. 정비 WO 착수 전 read-only SELECT로 확정할 것.

1. `/account/supplier/*` 섬 실사용 트래픽/북마크 존재 여부 (DUP-1 은퇴 안전성).
2. `store_execution_assets`/SPD 대비 `neture_library` 실행 수(UNREACH-1 library 은퇴 판단).
3. `csv_import_batches` 잔여 이력(UNREACH-2 csv-import 이관 필요량).
4. `AdminSupplierApprovalPage.deactivate` 실호출 이력(DUP-3 deactivate 흡수 필요성).
5. 알림 `metadata.targetUrl` 미주입 비율(§12 fallback 우선순위).
6. partner-commission 행 존재·F7 계약 데이터(§16 freeze 확정).

---

## 18. 최종 판정 (SUPPLIER_WORKFLOW_*)

### `SUPPLIER_WORKFLOW_CLOSED_WITH_MINOR_DRIFT`

**근거:**
- 공급자는 랜딩→승인→활성화→프로필→상품 등록/임포트→목록 관리→오퍼→콘텐츠/설명서/HUB→모집/트라이얼→주문/배송/재고→정산 전 동선을 **end-to-end 완수 가능**.
- 가드 3중 방어 정상(fail-closed route + fail-open 콘텐츠 게이트·서버 위임)·핵심 표면 load-error 계약 대부분 정비 완료·HUB 독립 사본 계약 준수.
- **P0 기능 차단 0.**
- 잔여는 전부 **구조/IA drift**(중복 트리·중복 대시보드·중복 목록·중복 콘솔·이중 마운트)와 **국소 결함**(공급 오퍼 dead-end·자기참조 CTA·load-error 편차·크로스링크 갭)로, 기능 은폐나 데이터 손상이 아니다.
- 따라서 **CLOSED가 아니라 CLOSED_WITH_MINOR_DRIFT** — closeout 가능하되 아래 8버킷 정비를 후속 권고.

---

## 19. 잔여 정비 8버킷 (A–H)

| 버킷 | 주제 | 포함 항목 | 등급 | 성격 |
|:---:|------|----------|:---:|------|
| **A** | 대시보드 정리 | 목업 죽은 코드 삭제(DEAD-1) · account 대시보드 섬 통합(DUP-1 일부) | P2 | 삭제/통합 |
| **B** | 라우트 트리 정합 | `/account/supplier/*` → `/supplier/*` 통합·redirect화(DUP-1) · 이중 마운트 canonical 단일화(DUP-5·DUP-4) | P2·P3 | 라우팅 |
| **C** | 상품·오퍼 퍼널 | 공급 오퍼 dead-end 실 생성 UI 연결/재라우팅(DEAD-END-1) · 중복 상품 목록 은퇴(DUP-2) | **P1**·P2 | 기능/통합 |
| **D** | Import 경로 정리 | csv-import legacy 은퇴(batch 이력 이관 후)·bulk 단일화(UNREACH-2) | P2 | 은퇴 |
| **E** | load-error 계약 표준화 | 잔여 silent swallow(§13-C) throw+재시도化 · Market-Trial 재시도 버튼(§13-B) | P2·P3 | 계약 |
| **F** | 승인·품질 콘솔 정합 | Admin↔Operator 승인 이중화 해소·deactivate 흡수·헬퍼 공통화(DUP-3) · Quality admin 마운트 정리(DUP-4) | P3 | 통합/부채 |
| **G** | 가드·권한 정합 | SUPPLIER_ROLES vs SUPPLIER_ACCESS_ROLES 진리원 단일화(§4) · library UNREACHABLE 진입점/은퇴 결정(UNREACH-1) | P3·P2 | 권한/IA |
| **H** | 알림·크로스링크 | 알림 fallback 라우팅·per-event 맵(§12) · 주문↔정산 UI 크로스링크(§11) · Orders 자기참조 CTA 정정(DEAD-LINK-1) | P3·**P1** | 네비 |

> 각 버킷은 §17 데이터 게이트 후보 확정 후 개별 WO로 착수 권고. 공통 모듈(role-constants·store-ui-core·notification routing) 접촉 항목(B·G·H)은 [[docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1]] 전 소비처 확인 선행.

---

## 20. 변경 없음 선언

```
코드 변경 0 · DB write 0 · DB read(프로덕션 실데이터) 0 · 운영 mutation 0 · 배포 0
신규 화면/메뉴/API/테이블 0 · 마이그레이션 0
본 IR 문서 1건만 생성·커밋 (path-specific)
```

코드 무변경이므로 main 대비 컴파일 상태 불변(별도 tsc 불요). 본 조사는 정적 정독 기반 read-only 감사다.

---

*결과: `SUPPLIER_WORKFLOW_CLOSED_WITH_MINOR_DRIFT` · 14단계 동선 완수 가능 · P0=0 · 잔여 8버킷(A–H) 후속 권고 · 코드/DB/배포 무변경*
