# IR-O4O-OPERATOR-UX-CROSSSERVICE-RECHECK-V1

> **유형:** Read-only Investigation Report (조사 전용)
> **상태:** 조사 완료 — 코드/UI/route/menu/API/DB 무수정
> **작성:** 2026-06-07
> **목적:** O4O 3개 서비스(KPA-Society / K-Cosmetics / Neture) 운영자 영역 전체 UI-UX 공통화 상태 재점검

---

## 1. 조사 개요

본 IR은 개별 완료 작업과 별도로 운영자 영역 전체 UX를 다음 9개 차원에서 재점검한다: 대시보드 / 좌측 메뉴(Domain IA) / 리스트 화면 / Row action·상세 / 체크박스·Bulk 흐름 / 승인·검토·보완·거절 정책 / 공통 컴포넌트 사용 현황 / route·menu 정합 / 서비스별 예외 분류.

**핵심 결론(요약):**
- 운영자 영역의 **구조적 공통화는 이미 높은 수준으로 달성**되어 있다. 4개 서비스 전부 동일한 `OperatorAreaShell` + `DomainIASidebar` + `OperatorDashboardLayout`(5-Block) + `DataTable` 위에 서 있다.
- 사용자가 관측한 "대시보드 차이"는 **레이아웃 차이가 아니라 5-Block 위/아래에 끼워 넣은 서비스별 부가 섹션(가이드 카드 / Axis 내비 / Alert / 경고 블록)의 유무·구성 차이**다. → 분류 **B(구현 편차, 즉시 WO 가능)**.
- 더 운영 효율에 직접적인 차이는 대시보드가 아니라 **리스트 화면의 상세·Bulk 패턴 혼재**(Drawer vs Modal vs Page, 일부 custom raw `<table>`, 일부 mock 데이터)에 있다. → 분류 **B/C/E 혼합**.
- Neture는 supplier/partner 영역을 운영자 메뉴에 섞지 않았고(경계 정책 준수), 4-domain IA를 사용하는 등 **정당한 도메인 차이(D)**가 가장 많은 서비스다.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `1361b0586cfe2e8411e03590a183b1f4f357382b` |
| `git status --short` | (clean — 변경 없음) |
| origin/main ahead/behind | `0 / 0` (완전 동기화) |
| 다른 세션 WIP | 없음 (working tree clean) |
| 조사 기준 commit | **`1361b0586`** |

> 본 조사 전 기간 동안 어떤 파일도 수정/생성/삭제하지 않았다. 본 IR 문서 1개만 신규 생성한다. git add/commit/push는 수행하지 않는다.

---

## 3. 조사 대상 서비스 / 파일

### 서비스 프론트엔드 루트
- `services/web-kpa-society/`
- `services/web-k-cosmetics/`
- `services/web-neture/`

### 핵심 공통 패키지
- `packages/operator-ux-core/` — `OperatorAreaShell`, `DomainIASidebar`, `OperatorDashboardLayout`(5-Block), `DataTable`, `useBatchAction`, `defineActionPolicy`/`buildRowActions`, dashboard 5종 block, `operatorDomainIA`(default IA)
- `packages/operator-core-ui/` — `OperatorMembersConsolePage`, `ForumRequestsConsole`, `ForumDeleteRequestsConsole`, `OperatorStoresList`, `CmsContentManager`, edit modal류
- `packages/ui/` — `BaseTable`, `ActionBar`, `RowActionMenu`, `BaseDetailDrawer`, `BulkResultModal`, `ConfirmActionDialog`, operator-shell 잔존물
- `packages/admin-ux-core/` — `AdminDashboardLayout`(4-Block)
- `packages/shared-space-ui/` — `GuideBlock`

### 서비스별 핵심 파일 (조사 시 확인)
| 서비스 | LayoutWrapper | Dashboard | Menu config |
|--------|---------------|-----------|-------------|
| KPA | `components/kpa-operator/KpaOperatorLayoutWrapper.tsx` | `pages/operator/KpaOperatorDashboard.tsx` | `config/operatorMenuGroups.ts` |
| K-Cosmetics | `components/layouts/OperatorLayoutWrapper.tsx` | `pages/operator/KCosmeticsOperatorDashboard.tsx` | `config/operatorMenuGroups.ts` |
| Neture | `components/layouts/OperatorLayoutWrapper.tsx` | `pages/operator/NetureOperatorDashboard.tsx` | `config/operatorMenuGroups.ts` |

---

## 4. 운영자 대시보드 비교

**4개 서비스 전부 `OperatorDashboardLayout`(@o4o/operator-ux-core, 5-Block: KPI → AI Summary → Action Queue → Activity Log → Quick Actions)을 사용**하며, config는 백엔드 `/operator/dashboard` 응답을 pass-through builder(`buildXxxOperatorConfig()`)로 주입한다. **레이아웃 컴포넌트와 5-Block 구조는 완전히 동일**하다.

차이는 전적으로 **5-Block 위/아래에 서비스가 추가한 부가 섹션**에서 발생한다:

| 요소 | KPA | K-Cosmetics | Neture |
| ------ | :---: | :---: | :---: |
| 5-Block (`OperatorDashboardLayout`) | ✅ | ✅ | ✅ |
| 상단 운영자 철학 가이드 카드 | ✅ `OperatorRoleGuideCard` | ❌ | ❌ |
| 상단 Alert 블록 | ❌ | ❌ | ❌ |
| Axis Navigation 섹션 (대시보드 본문) | ✅ 2-axis (커뮤니티 / 매장 HUB) | ✅ 2-axis (매장 HUB / 콘텐츠) | ❌ (대시보드엔 없음) |
| 상태 경고 블록 | ❌ | ✅ `orderMetricsReady` fallback | ❌ |
| Refresh | error retry | (config 재요청) | (config 재요청) |
| KPI 개수 | 5~9 | API 의존 | 6 |

**판정:**
- 이는 **레이아웃/공통화 실패가 아니라, 부가 섹션을 공통 표준으로 흡수하지 않은 구현 편차**다.
- **공통화 후보:** (1) 운영자 철학 가이드 카드 → 4개 공통 `GuideBlock` 1줄 배너로 통일 여부 결정, (2) Axis Navigation 섹션을 `OperatorDashboardLayout`의 선택적 슬롯으로 흡수하여 4개 서비스가 동일 위치·동일 컴포넌트로 도메인 축을 노출(축 정의만 config), (3) Alert/경고 블록을 AI Summary 블록으로 일원화할지 결정.

> ⚠️ Drift 주의: CLAUDE.md §11 — 대시보드는 A~F 6 Workspace 진입 허브여야 하며 검수·승인 편향은 Drift. 현재 대시보드들은 KPI·Action Queue 중심이라 "검수 대기" 카운트 위주로 기울어 있는지 별도 점검 권장(본 IR 범위 밖, 후속 IR 후보).

---

## 5. 운영자 메뉴 / Domain IA 비교

### 5.1 구조 — 이미 공통화 완료 (중요 정정)

**4개 서비스 전부 `OperatorAreaShell`(@o4o/operator-ux-core)을 LayoutWrapper에서 사용하며, `OperatorAreaShell`은 내부적으로 항상 `DomainIASidebar`를 렌더한다.** 즉 좌측 메뉴 셸·반응형 동작(데스크톱 도메인 그룹 접힘/펼침, 모바일 햄버거 드로어)·sticky offset은 4개 서비스가 동일 코드다.

> 📌 **정정:** 각 wrapper의 주석(`OperatorShell 우회 — KPA-only KpaOperatorSidebar + 자체 layout`)은 **공통화 이전 설계를 서술한 stale comment**다. 실제 코드는 전부 공통 `OperatorAreaShell`을 사용하며 service-local custom sidebar는 존재하지 않는다. → 주석 정리 후보(분류 B, 문서/주석 정합).

메뉴 항목은 각 서비스 `config/operatorMenuGroups.ts`의 `UNIFIED_MENU` + `filterMenuByRole(UNIFIED_MENU, isAdmin)`로 주입한다. 그룹 키(`dashboard/users/approvals/products/stores/orders/content/resources/lms/signage/forum/analytics/system`)는 공통 enum.

### 5.2 Domain IA config — 유일한 실질 차이

| 서비스 | `domainIAConfig` 주입 | Domain 축 |
|--------|:---:|------|
| KPA | ❌ (default 사용) | default 3축: 커뮤니티 운영 / 매장 HUB 운영 / 운영 공통 |
| K-Cosmetics | ❌ (default 사용) | default 3축 (동일) |
| **Neture** | ✅ `NETURE_OPERATOR_DOMAIN_IA` | **4축: 공급·유통 운영 / 커머스·정산 운영 / 커뮤니티·콘텐츠 운영 / 운영 공통** |

Neture만 공급사·유통·정산 도메인을 가진 특성상 4축 custom IA를 주입한다. **이는 정당한 도메인 차이(D)** 로 보이나, "default 3축 vs Neture 4축"이 의도된 분기인지(D) 아니면 나머지 3서비스도 4축으로 정렬해야 하는지는 결정 필요(잠재 C).

### 5.3 메뉴 항목 차이 (도메인 vs 편차)

- **KPA**: `system` 그룹에 `adminOnly` 3항목(법률/감사/역할). Store 관련 일부 메뉴는 WO로 의도적 숨김(route/API 보존).
- forum mock 메뉴("포럼 관리")는 제거 완료 확인.
- **K-Cosmetics**: `store-cockpit`(내 매장) 메뉴가 `stores` 그룹에 포함. `adminOnly` 필터 미사용(전 그룹 operator 레벨).
- **Neture**: `approvals`에 `market-trial`(유통참여형 펀딩)·`suppliers`(공급자 활성화), `products`에 `product-candidates`(상품 후보 검토) 등 Neture 고유 항목. **supplier/partner 전용 공간(`/supplier/*`, `/partner/*`)은 별도 레이아웃이며 operator 메뉴에 섞이지 않음 — 경계 정책 준수 확인.**

**판정:** 메뉴 셸·도메인 그룹 메커니즘은 공통(A). 항목 구성 차이는 대부분 도메인 차이(D). 단 (1) wrapper stale 주석 정리(B), (2) default 3축 vs Neture 4축 정렬 결정(C/D), (3) K-Cos `adminOnly` 미사용이 의도인지(B 점검)가 후속 대상.

---

## 6. 운영자 리스트 화면 비교

리스트 화면은 **공통 콘솔 컴포넌트 기반(A)**, **공통 `DataTable` 기반 service-local(B/A)**, **완전 custom(B/E)** 세 부류로 나뉜다.

### 6.1 공통 콘솔 컴포넌트 (4개 서비스 정렬 완료 — A)
아래는 `@o4o/operator-core-ui` 모듈을 thin wrapper(client adapter)로 감싸 4개 서비스가 동일 UX를 공유한다:

| 화면 | 공통 컴포넌트 | KPA | K-Cos | Neture |
|------|--------------|:---:|:---:|:---:|:---:|
| 회원 관리 | `OperatorMembersConsolePage` | ✅ | ✅ | ✅ | ✅ |
| 포럼 신청 | `ForumRequestsConsole` | ✅ | ✅ | ✅ | ✅ |
| 포럼 삭제요청 | `ForumDeleteRequestsConsole` | ✅ | ✅ | ✅ | ✅ |
| 매장 관리 | `OperatorStoresList` | ✅ | ✅ | ✅ | ✅ |
| 콘텐츠(CMS) | `CmsContentManager` | ✅ | ✅(가이드라인 wrapper) | ✅ | ✅(homepage-cms) |

### 6.2 공통 `DataTable` 기반 service-local 리스트 (A/B)
검색·상태탭·페이지네이션·empty/loading/error를 각 화면이 직접 구성하되 공통 `DataTable`(@o4o/operator-ux-core)을 사용. 대부분 정상이며 컬럼·필터만 도메인 차이.

- KPA: 상품 신청, 약국 신청, LMS 강의, 콘텐츠 허브, 협업 문의, Signage(HQ 미디어/플레이리스트/템플릿), Blog/POP/QR 등 (총 ~30 operator 페이지)
- K-Cosmetics: LMS 강의, 상품, 신청(Applications), 이벤트 오퍼 승인
- Neture: 상품 승인(`OperatorProductApprovalPage`), 전체 등록 상품(`AllRegisteredProductsPage`), 가입 승인(`RegistrationRequestsPage`)

### 6.3 완전 custom / 표준 이탈 리스트 (B/E — 정비 후보)

| 서비스 | 화면 | 문제 | 분류 |
|--------|------|------|------|
| Neture | `OperatorSupplierApprovalPage`(공급자 활성화) | **raw `<table>` HTML 사용, `DataTable` 미사용**. custom confirm modal | B (DataTable 이행) |
| Neture | `OrdersManagementPage`(주문) | custom 구현, 공통 `DataTable` 미사용, row action 없음(조회 전용) | B |
| Neture | `MarketTrialApprovalsPage`(유통참여형 펀딩) | card grid(TrialCard), 리스트 표준 아님 — 단 도메인상 카드형이 적절할 수 있음 | D/B 경계 |
| K-Cosmetics | `OrdersPage`(주문) | **완전 mock 데이터, API 미연동** | E (mock live surface) |
| K-Cosmetics | `ProductsPage` | `selectable` 활성이나 ActionBar/bulk action 미렌더(선택만 가능, 동작 없음) | B (불완전) |

**판정:** 리스트 차원의 공통화는 회원/포럼/매장/CMS에서 완료(A). 그러나 **주문·정산 계열에서 서비스별로 mock/TODO live surface가 잔존(E)** — 운영자가 실제로 클릭하면 동작하지 않거나 가짜 데이터를 보게 되는 위험. 우선 정리 대상.

---

## 7. Row action / 상세 보기 패턴 비교

### 7.1 Row action — 대체로 공통화(A/B)
대부분 화면이 `RowActionMenu`(@o4o/ui) + `defineActionPolicy`/`buildRowActions`(@o4o/operator-ux-core) 패턴을 사용한다(visible 조건부 노출, inline N개 + kebab overflow, variant danger, confirm). 다만 일부 잔존 패턴:

- Neture `OperatorSupplierApprovalPage`: row에 직접 버튼 나열 + custom modal — B.

### 7.2 상세 보기 — **혼재(C 핵심 후보)**
상세 진입 방식이 한 서비스 안에서도 화면마다 다르고, 서비스 간에도 다르다:

| 방식 | 사용처(예) |
|------|-----------|
| `BaseDetailDrawer`(@o4o/ui) | KPA(회원 drawer sections, 다수), K-Cos(Applications/EventOffer/LMS), Neture(AllProducts/ProductApproval drawer) |
| 별도 상세 Page | K-Cos(상품/매장 상세), KPA(매장/콘텐츠 상세), Neture(MarketTrial 상세) |
| Center Modal | Neture(RegistrationRequests/Supplier confirm modal), 각 서비스 edit modal |

> 즉 **모든 서비스가 Drawer/Page/Modal을 혼용**하며, "리스트 → 상세" 진입 UX가 화면 단위로 제각각이다.

**판정:** Row action 메뉴는 공통화 양호(A/B). 그러나 **"상세를 Drawer로 볼지 Page로 갈지"가 명문 표준 없이 화면별로 갈린다(C)** — 운영자 입장에서 "어떤 리스트는 옆에서 열리고 어떤 리스트는 페이지가 바뀐다"는 비일관성. 공통 정책(예: 검수/승인=Drawer, 복합 편집=Page) 정의 후 정렬 권장.

---

## 8. 체크박스 선택 후 작업 흐름 비교 (운영 효율 핵심)

선택 후 흐름의 표준 부품은 갖춰져 있다: `selectable` `DataTable` → 선택 시 `ActionBar`(@o4o/ui) → `useBatchAction`(@o4o/operator-ux-core) → `BulkResultModal`(@o4o/ui, 성공/실패/재시도).

| 서비스 | selectable | ActionBar | useBatchAction | BulkResultModal | bulk 동작 |
|--------|:---:|:---:|:---:|:---:|------|
| KPA | ✅ | ✅ | ✅ | ✅ | 회원 정지/복구/탈퇴, 포럼 승인/거절, 상품신청 삭제, LMS archive/delete, signage/blog/pop/qr 삭제 |
| K-Cosmetics | ✅ | ✅(LMS) | ✅ | ✅(LMS) | 회원 정지/복구/탈퇴, LMS unpublish/archive/hard-delete. ProductsPage는 선택만 가능·동작 없음 |
| Neture | ✅ | ✅ | ✅ | ✅(ProductApproval) | 회원 정지/복구/탈퇴, 가입 승인/거절, 상품 승인/거절/삭제 |

**일관된 정책(양호):**
- bulk 실행은 대부분 `Promise.allSettled` fan-out으로 부분 실패 격리(일부 화면은 native batch API: KPA 포럼 삭제, Neture 포럼 batchReview).
- 회원 bulk(정지/복구/탈퇴)는 의견 입력 불필요(confirm만), 거절/반려 등 **의견 필수 action은 bulk에서 제외**하고 단건 drawer/modal로 처리하는 정책이 대체로 지켜짐(특히 포럼 신청의 revision_requested는 bulk 제외).

**편차(B 후보):**
- KPA/K-Cos/Neture와 비일관.
- → E.
- K-Cos `ProductsPage`는 selectable만 켜고 ActionBar 미연결(죽은 선택). → B.

**판정:** 부품·정책 골격은 4서비스 공통(A). 운영 효율 관점에서 **본 차원이 대시보드보다 우선 정비 가치가 높다**(사용자 추정과 일치).

---

## 9. 승인 / 검토 / 보완 / 거절 정책 비교

공통 정책 부품: `ConfirmActionDialog`(@o4o/ui, variant default/danger/warning, `requireReason`/`showReason` 옵션), `defineActionPolicy`의 per-rule `confirm`(정적/함수형).

| 정책 | KPA | K-Cosmetics | Neture |
| ------ | :---: | :---: | :---: |
| approve(승인) confirm | ✅ | ✅ | ✅ |
| reject(거절) 사유 입력 | ✅ 필수~선택 | ✅ 필수(reject modal) | ✅ 필수(reject), supplier만 선택 |
| revision(보완 요청) | ✅ forum(`revision_requested`, 사유 필수) | ✅ forum(console 상속) | ✅ forum(console 상속) |
| 위험 action(hard delete 등) danger confirm + 결과 문구 | ✅ (LMS/signage "되돌릴 수 없습니다") | ✅ (LMS archive/hard-delete) | ✅ (delete=trash, soft) |
| hard delete operator 차단(admin-only) | ✅ | — | ✅(soft only, hard=admin) |
| 검수 체크리스트 | — | — | — |

**판정:** 승인/거절/보완 정책은 **상태머신·confirm·사유 입력 측면에서 잘 정렬(A)**. revision은 forum 콘솔이 4서비스 공통으로 처리. 위험 action confirm·hard delete 차단도 일관. 서비스별 차이는 **정당한 도메인 차이(D)**. 단 Neture supplier reject 사유가 "선택"인 점이 다른 reject(필수)와 미세 비일관 — B 점검.

---

## 10. 공통 컴포넌트 사용 현황

| 컴포넌트 | 패키지 | 공통 사용 상태 |
|----------|--------|----------------|
| `OperatorAreaShell` / `DomainIASidebar` | operator-ux-core | **4/4 사용 (A)** |
| `OperatorDashboardLayout`(5-Block) | operator-ux-core | **4/4 사용 (A)** |
| `DataTable` / `BaseTable` | operator-ux-core / ui | 4/4 광범위 사용. 단 Neture supplier·orders settlements는 raw table (B/E) |
| `ActionBar` | ui | 4/4 (단 K-Cos Products 미연결) |
| `useBatchAction` | operator-ux-core | 4/4 |
| `RowActionMenu` + `defineActionPolicy`/`buildRowActions` | ui / operator-ux-core | 대부분. |
| `BaseDetailDrawer` | ui | 4/4 사용하나 화면별 혼재(상세 page/modal과 공존) (C) |
| `BulkResultModal` | ui | KPA/K-Cos/Neture 사용. |
| `ConfirmActionDialog` | ui | 4/4 |
| `OperatorMembersConsolePage` | operator-core-ui | 4/4 (A) |
| `ForumRequestsConsole` / `ForumDeleteRequestsConsole` | operator-core-ui | 4/4 (A) |
| `OperatorStoresList` / `CmsContentManager` | operator-core-ui | 4/4 (A) |
| `GuideBlock` | shared-space-ui | 부분(콘솔 가이드). 대시보드 가이드 카드는 KPA만 (B) |
| `AdminDashboardLayout`(4-Block) | admin-ux-core | admin 영역 — operator와 분리 (정상) |
| `OperatorConfirmModal` / operator-shell 잔존물 | ui | **legacy** — `ConfirmActionDialog`가 후속 표준. 잔존 사용처 정리 후보 (B) |

**부족해서 생긴 편차:**
- 대시보드 **Axis Navigation 섹션이 공통 컴포넌트로 추출되지 않아** 서비스마다 직접 구성(축 2개, Neture는 누락). → 공통 슬롯/컴포넌트화 후보(C).
- "상세 진입 방식" 표준 컴포넌트 정책 부재 → Drawer/Page 혼재(C).

---

## 11. route / menu 정합

- **메뉴 항목 ↔ route 매핑:** 4개 서비스 모두 `UNIFIED_MENU` 항목이 실제 lazy route와 매핑되어 있고, 조사 범위에서 **dead link(route 없는 메뉴)는 발견되지 않음**.
- **메뉴 없는 route(의도적):** KPA `system` 그룹 일부는 `adminOnly` 필터로 비admin에게 숨김(route/API 보존). KPA 약국 서비스 신청 메뉴는 WO로 표시만 숨김(route 보존). → CLAUDE.md "route 없는 메뉴 노출 금지 / route 있는 실기능 메뉴 숨김 금지" 원칙상, 후자(실기능 메뉴 숨김)는 의도 확인 필요(별도 WO 이력 존재).
- **admin/operator 혼입:** Neture는 `AdminLayoutWrapper`(별도) + `getAdminMenu`로 admin 메뉴를 operator와 분리. KPA/K-Cos는 `filterMenuByRole(isAdmin)`로 동일 메뉴 트리에서 adminOnly 항목만 분기. **두 가지 분리 방식이 공존**(Neture=별도 wrapper, 나머지=플래그 필터) → 정합 점검 후보(B/C).
- **store owner / supplier / partner route:** Neture supplier/partner는 `/supplier/*`·`/partner/*` 별도 공간·레이아웃. operator 메뉴 혼입 없음(경계 정책 준수). K-Cos `store-cockpit`(내 매장)이 operator `stores` 그룹에 포함된 점은 store-owner 성격 surface가 operator 메뉴에 들어온 사례 — 의도/도메인 확인 필요(D/B 경계, §16 참조).

**판정:** dead route 0, 명백한 데드링크 없음(양호). 정합 이슈는 (1) admin 분리 방식 이원화(Neture 별도 wrapper vs 플래그), (2) KPA 실기능 메뉴 숨김의 정책 적합성, (3) K-Cos 내 매장 surface 위치.

---

## 12. 서비스별 예외 분류

분류 키: **A** 공통화 완료 / **B** 단순 구현 편차(즉시 WO) / **C** 공통 컴포넌트 옵션 확장 후 WO / **D** 도메인 차이(유지) / **E** mock/TODO/live surface 위험 / **F** backend·API contract 차이 / **G** 별도 채팅방(Store Hub / My Store / Supplier).

| # | 항목 | 서비스 | 분류 |
|---|------|--------|------|
| 1 | `OperatorAreaShell`+`DomainIASidebar`+5-Block+`DataTable` 구조 | 4/4 | **A** |
| 2 | 회원/포럼신청/포럼삭제/매장/CMS 콘솔 공통 | 4/4 | **A** |
| 3 | 승인/거절/보완 상태머신·confirm·사유 정책 | 4/4 | **A** |
| 4 | wrapper stale 주석("자체 layout") | 4/4 | **B** |
| 5 | 대시보드 상단 가이드 카드 KPA만 존재 | KPA↔3 | **B** |
| 6 | — | K-Cos | **B→C** |
| 7 | — | **B** |
| 8 | K-Cos `ProductsPage` 죽은 selectable | K-Cos | **B** |
| 9 orders/settlements, Neture supplier `MoreVertical`/raw table custom | Neture | **B** |
| 10 | Neture supplier reject 사유 "선택"(타 서비스 필수) | Neture | **B** |
| 11 | 대시보드 Axis Navigation 공통 슬롯화(Neture 누락 포함) | 4/4 | **C** |
| 12 | 상세 진입 Drawer vs Page 표준 부재 | 4/4 | **C** |
| 13 | admin 분리 방식 이원화(Neture 별도 wrapper vs 플래그) | Neture↔3 | **C** |
| 14 | default 3축 IA vs Neture 4축 IA | Neture | **D**(잠재 C) |
| 15 | — | **D** |
| 16 | Neture 공급자 활성화·상품후보·유통참여형 펀딩 메뉴 | Neture | **D** |
| 17 | KPA `system` adminOnly(법률/감사/역할) | KPA | **D** |
| 18 | — | **E** |
| 19 | — | **E** |
| 20 | K-Cosmetics `OrdersPage` 완전 mock | K-Cos | **E** |
| 21 | 주문/정산 backend contract 정합(operator 주문 API 존재 여부) | K-Cos/Neture | **F** |
| 22 | K-Cos `store-cockpit`(내 매장) operator 메뉴 포함 | K-Cos | **G/D** |
| 23 | Neture supplier/partner 공간 | Neture | **G** |

---

## 13. 즉시 정비 가능한 항목 (B)

1. **wrapper stale 주석 정리** — 4개 `OperatorLayoutWrapper`의 "OperatorShell 우회 / 자체 layout / KpaOperatorSidebar" 주석을 실제(공통 `OperatorAreaShell`)에 맞게 수정. (저위험, 코드 무변)
3. **K-Cos `ProductsPage` 죽은 selectable 처리** — bulk action 연결 또는 selectable 제거(현재 선택해도 동작 없음).
5. **Neture supplier reject 사유 필수화** — 타 서비스 reject 정책과 정합.
6. **대시보드 상단 가이드 카드 정책 통일** — KPA `OperatorRoleGuideCard`를 공통 `GuideBlock` 1줄 배너로 4서비스 노출할지, 아니면 KPA에서도 제거할지 결정 후 일괄 적용.

---

## 14. 공통 컴포넌트 확장 필요 항목 (C)

1. **Axis Navigation 공통 슬롯** — `OperatorDashboardLayout`에 선택적 `axisNavigation` 슬롯(또는 별도 공통 `OperatorAxisNavSection`)을 추가하고 축 정의는 config로 주입. → 4서비스가 동일 위치·동일 컴포넌트로 도메인 축 노출, Neture 대시보드 누락 해소.
2. **상세 진입 표준 정책** — "검수/승인 단건 = `BaseDetailDrawer`, 복합 편집·다중 섹션 = 상세 Page" 식 명문 표준을 정한 뒤 화면 정렬. 공통 `BaseDetailDrawer` footer action 패턴 표준화.
4. **admin 분리 방식 단일화** — Neture `AdminLayoutWrapper` 별도 패턴 vs 나머지 `filterMenuByRole` 플래그 중 하나로 수렴(거버넌스 결정 필요).

---

## 15. 도메인 차이로 유지할 항목 (D)

1. **Neture 4축 IA**(공급·유통·정산 도메인) — 공급사/유통/정산을 가진 Neture 특성상 정당. (단 §14-4와 별개로, 나머지 3서비스를 4축으로 끌어올릴지는 별도 판단)
3. **Neture 공급자 활성화 / 상품 후보 검토 / 유통참여형 펀딩** 메뉴·화면 — Neture 유통 모델 고유.
4. **KPA `system` adminOnly**(법률/감사/역할) — 약사회 SaaS 거버넌스 고유.

---

## 16. Store Hub / My Store / Supplier 등 별도 채팅방으로 넘길 항목 (G)

1. **Neture supplier 공간(`/supplier/*`) · partner 공간(`/partner/*`)** — operator 영역과 분리된 별도 레이아웃·메뉴. 본 운영자 공통화 IR 범위에 포함하지 말 것. Supplier/Partner UX는 별도 세션에서 다룬다.
2. **K-Cosmetics `store-cockpit`(내 매장)** 및 각 서비스 매장 HUB(Blog/POP/QR) surface — store-owner 성격이 operator 메뉴에 노출되어 있는 사례. "내 매장 / 매장 HUB" UX는 Store Menu Canonical Tree(CLAUDE.md §5) 기준 별도 축으로 다루는 것이 적절. 운영자 공통화에 억지로 포함하지 말 것.
3. **주문/정산 도메인 전반** — operator가 보는 주문·정산 화면은 E-commerce Core / Retail Stable 계약과 얽혀 있어, UI 공통화 이전에 backend contract(operator 주문 API 존재·범위)부터 정리해야 한다(§17 F). 별도 도메인 세션 권장.

---

## 17. 우선순위 제안

운영 효율·위험도 기준 우선순위:

| 우선 | 작업 | 분류 | 근거 |
|:---:|------|------|------|
| **P0** | — | E | 운영자가 가짜 데이터/죽은 버튼을 실서비스에서 본다 — 신뢰·안전 직결 |
| **P1** | — | B | 대시보드보다 운영 효율 영향 큼(사용자 추정과 일치) |
| **P2** | 대시보드 부가 섹션 통일 (Axis Nav 공통 슬롯 + 가이드 카드 정책 + Alert 일원화) | B/C | 사용자가 처음 관측한 차이 해소, 공통 슬롯화로 재발 방지 |
| **P3** | 상세 진입 표준(Drawer vs Page) 정의 후 정렬 | C | 리스트→상세 UX 비일관 해소, 표준 부재가 근본 원인 |
| **P4** | 정합·정리 (wrapper stale 주석, admin 분리 방식 단일화, Neture supplier reject 필수화, custom row action 정렬) | B/C | 저위험 hygiene |

> **결정 필요:** P0(주문/정산)는 backend contract(F) 의존이라 UI WO 전에 별도 IR(주문/정산 operator API 실재 여부)이 선행되어야 할 수 있음. P1·P2는 프론트 단독으로 즉시 WO 가능.

---

## 18. 후속 WO 후보

- **WO 후보 1 (P0):** `IR-O4O-OPERATOR-ORDER-SETTLEMENT-SURFACE-AUDIT-V1` — K-Cos/Neture operator 주문·정산 화면의 backend contract 실재 여부 조사(F). mock/TODO 제거 또는 "준비중" 명시.
- **WO 후보 2 (P1):** `WO-O4O-OPERATOR-BULK-FLOW-CONSISTENCY-V1` — `BulkResultModal` 4서비스 정렬 + K-Cos Products 죽은 selectable 처리 + 부분실패 가시화 표준.
- **WO 후보 3 (P2):** `WO-O4O-OPERATOR-DASHBOARD-AUX-SECTION-COMMONIZATION-V1` — Axis Navigation 공통 슬롯화 + 가이드 카드 정책 + Alert 일원화.
- **WO 후보 4 (P3):** `WO-O4O-OPERATOR-DETAIL-ENTRY-STANDARD-V1` — Drawer vs Page 명문 표준 정의 후 화면 정렬.
- **WO 후보 5 (P4):** `WO-O4O-OPERATOR-WRAPPER-COMMENT-AND-ADMIN-SPLIT-CLEANUP-V1` — stale 주석 정리 + admin 분리 방식 단일화 + reject 사유 정합.
- **별도 세션 (G):** Neture supplier/partner UX, Store Hub/내 매장 UX는 본 운영자 공통화와 분리해 다룬다.

---

## 19. Current Structure vs O4O Philosophy Conflict Check

| 점검 항목 | 결과 |
|-----------|------|
| 운영자 UI가 O4O 운영 경험 공통화 원칙과 맞는가 | **대체로 YES.** 구조(셸·사이드바·대시보드·테이블·콘솔)는 4서비스 공통. 부가 섹션·일부 리스트만 편차. |
| 서비스별 차이가 도메인 차이인지 구현 편차인지 구분되었는가 | **YES** — §12에서 A~G로 분류. 도메인 차이(D: Neture 4축·공급자/펀딩 승인 체크리스트, KPA 거버넌스)와 편차(B/C/E)를 명시 구분. |
| 대시보드가 같은 운영 판단 구조를 제공하는가 | **부분.** 5-Block은 동일하나 Axis/Alert/가이드 부가 섹션이 불일치. 또한 CLAUDE.md §11 "A~F 6 Workspace 진입 허브 / 검수편향=Drift" 관점에서 현재 대시보드가 검수 카운트 편향인지 별도 점검 권장. |
| 리스트 → 선택 → 상세 → 후속 작업 흐름이 통일되었는가 | **부분.** 선택→Bulk 부품은 공통이나 K-Cos 편차. 상세 진입(Drawer/Page)은 표준 부재로 비일관(C). |
| 위험 작업과 bulk action 정책이 안전하게 분리되었는가 | **YES.** 의견 필수 action(거절/보완)은 bulk 제외·단건 처리, hard delete operator 차단, danger confirm 일관. |
| Store Hub / My Store / Supplier를 운영자 공통화에 억지로 포함했는가 | **대체로 NO.** Neture supplier/partner는 완전 분리(경계 정책 준수). 단 K-Cos `store-cockpit`(내 매장)이 operator 메뉴에 포함된 사례는 §16에서 별도 축 분리 권장. |
| 공통화가 1인 개발 유지보수성을 높이는 방향인가 | **YES.** 공통 콘솔·테이블·정책 부품 재사용으로 service-local custom이 최소화됨(원칙: clean and simple). 잔존 custom(raw table, mock, TODO, stale 주석)을 제거하면 유지보수성 추가 상승. |

**결론:** 운영자 영역은 **구조적 공통화 성숙 단계**에 있으며, 남은 작업은 새 골격 구축이 아니라 **잔존 편차 수렴 + mock/TODO 정리 + 부가 섹션/상세 진입 표준화**다. 사용자가 관측한 대시보드 차이는 레이아웃 실패가 아닌 부가 섹션 편차이고, 운영 효율 관점에서는 **주문/정산 live surface 정리(P0)와 Bulk 흐름 일관화(P1)가 대시보드 정비(P2)보다 선행 가치가 높다.**

---

## 최종 보고 요약

- **수정 파일:** 없음 (read-only 준수). 본 IR 1개 문서만 신규 생성.
- **생성 IR 경로:** `docs/investigations/IR-O4O-OPERATOR-UX-CROSSSERVICE-RECHECK-V1.md`
- **조사 기준 commit:** `1361b0586`
- **git status:** clean (조사 전후 working tree 변경 없음, IR 문서는 미커밋)
- **대시보드 차이 요약:** 5-Block 레이아웃은 4/4 동일. 차이는 상단 가이드 카드(KPA만)·Axis 섹션 축 구성·Alert/경고 블록 유무·Neture Axis 누락 — 모두 부가 섹션 구현 편차(B/C).
- **리스트/체크 후 작업 공통화 상태:** 부품(`DataTable`/`ActionBar`/`useBatchAction`/`BulkResultModal`/`RowActionMenu`/`BaseDetailDrawer`) 공통. 회원·포럼·매장·CMS 콘솔 완전 정렬(A).
- **즉시 WO 가능:** §13 (stale 주석 BulkResultModal, K-Cos selectable, reject 사유, custom row action).
- **추가 IR 필요:** 주문/정산 operator backend contract(F, P0 선행), 대시보드 검수편향 점검.
- **별도 채팅방:** Neture supplier/partner, Store Hub/내 매장, 주문/정산 도메인.
- **우선순위:** P0 mock/TODO 정리 → P1 Bulk 흐름 → P2 대시보드 부가섹션 → P3 상세 진입 표준 → P4 hygiene.
