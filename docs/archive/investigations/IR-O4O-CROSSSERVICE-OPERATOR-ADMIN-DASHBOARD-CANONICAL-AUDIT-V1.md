# IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1

**작성 일자**: 2026-05-30
**작업 성격**: 조사 전용 (Investigation Only) — 구현·코드 수정·DB·commit·push 일절 없음
**조사 범위**: KPA-Society / GlycoPharm / K-Cosmetics / Neture **operator/admin dashboard**
**Baseline**: Neture (정비 직후 — 다른 3개 서비스가 따라야 할 표준)
**조사 도구**: 정적 코드 read (services/web-* + apps/api-server) — 5개 병렬 Explore agent
**SQL 실행 여부**: 없음 (필요 SQL 후보만 제안)

---

## 0. 핵심 결론 (TL;DR)

> **4개 서비스 operator dashboard 는 baseline (Neture) 대비 3가지 큰 정합성 격차를 갖는다.**
>
> 1. **KPA 만 5-Block unified dashboard API 미사용** — KPA 는 `/operator/summary` 만 응답하고 action queue/quick actions 를 frontend `operatorConfig.ts` 에서 동적 생성. 다른 3개 서비스는 backend `OperatorDashboardConfig` (kpis/aiSummary/actionQueue/activityLog/quickActions) 단일 응답.
> 2. **Dead Link 와 Vocabulary Drift 가 KPA·GlycoPharm·K-Cosmetics 에 산재** — KPA `/operator/signage/content` (config 에는 있으나 route 없음), K-Cosmetics `pharmacy/pharmacist/supplier` 어휘 노출, GlycoPharm 환자/케어 KPI 잔재.
> 3. **AI Summary vague 문구 + operator/admin scope 경계 모호** — Cosmetics inactivity rule "플랫폼 활동을 점검하세요" 같은 actionability 낮은 문구, K-Cosmetics UNIFIED_MENU 에 `adminOnly` 플래그 미적용.
>
> Neture 는 이 모든 부분이 정비되어 있어 baseline 으로 적합. **즉시 수정 가능한 작은 WO 7개 + 정책 결정 IR 3개** 로 쪼개서 처리 권장.

---

## 1. Executive Summary

### 1.1 정합성 격차 수준

| 영역 | KPA | GlycoPharm | K-Cosmetics | Neture (baseline) |
|------|:---:|:----------:|:-----------:|:----------------:|
| 5-Block unified dashboard API | ❌ (summary only) | ⚠️ (분리되나 일부 stub) | ✅ | ✅ |
| `OperatorDashboardLayout` 사용 | △ (커스텀 5-block) | ✅ | ✅ | ✅ |
| Action Queue backend 응답 | ❌ (frontend 생성) | △ (draft-products 1건) | ✅ (3건) | ✅ (4건) |
| `adminOnly` 메뉴 플래그 | △ (Dashboard prop) | ✅ | ❌ | ✅ |
| Dead link 0개 | ❌ (≥1) | ❌ (1 추정) | ✅ | ✅ |
| Vocabulary drift 0개 | △ (supplier 잔재) | ❌ (환자/케어) | ❌ (약국/약사) | △ (약국 placeholder) |
| AI Summary 구체적 문구 | ✅ | ✅ | ❌ (vague) | ✅ |
| AxisNavigationSection 2축 | ✅ | ✅ | ✅ | △ (별도 패턴) |

✅ 정합 / △ 부분 정합 / ❌ 격차 / ⚠️ 일부 stub

### 1.2 핵심 발견 5건

| # | 서비스 | 항목 | 분류 | 우선순위 |
|---|--------|------|------|---------|
| 1 | KPA | `/operator/signage/content` dead link (operatorConfig 다수 라인 + Action Queue + Quick Action) | D (Action Queue dead link) | 높음 |
| 2 | KPA | 5-Block unified dashboard API 미적용 (`/operator/summary` only, actionQueue 미응답) | J (backend gap) | 중간 (구조적) |
| 3 | K-Cosmetics | `pharmacy/pharmacist/supplier` 어휘 노출 (StoresPage/UsersPage) | H (도메인 어휘 혼입) | 높음 |
| 4 | K-Cosmetics | UNIFIED_MENU `adminOnly` 플래그 미적용 (admin 항목이 operator 노출 가능) | G (scope mismatch) | 높음 |
| 5 | Cosmetics insight-rules inactivity | "최근 주문이 없습니다. 플랫폼 활동을 점검하세요." vague 문구 | E (AI Summary false-positive 우려) | 중간 |

---

## 2. 서비스별 dashboard 구조 요약

### 2.1 KPA-Society

| 항목 | 상태 |
|------|------|
| 메인 컴포넌트 | [`KpaOperatorDashboard.tsx`](../../services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx) |
| Config | [`operator/operatorConfig.ts`](../../services/web-kpa-society/src/pages/operator/operatorConfig.ts) |
| Layout | 커스텀 5-Block (KPI / AI Summary / Action Queue / Activity Log / Quick Actions) — `OperatorDashboardLayout` 미사용 (추정) |
| Backend | [`apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts`](../../apps/api-server/src/routes/kpa/controllers/operator-summary.controller.ts) — `/operator/summary` only |
| KPI 구성 | 6 기본 + 2 admin (회원 승인, 포럼 요청, 콘텐츠 발행, 사이니지 검수, 약국 신청, 상품 신청 / Admin: 전체 회원, 서비스 신청) |
| Action Queue | **frontend 동적 생성** (KPI 기반 derivation in `operatorConfig.ts`) |
| AI Summary | **rule-based** (`operatorConfig.ts` line 122-192, severity critical/warning/info) — LLM 미호출 |
| AxisNavigationSection | `buildKpaAxes()` 2축 (커뮤니티 / 매장HUB) |
| 별도 Admin Dashboard | `KpaOperatorDashboardPage.tsx` 분회/조직 중심 KPI |

### 2.2 GlycoPharm

| 항목 | 상태 |
|------|------|
| 메인 컴포넌트 | [`GlycoPharmOperatorDashboard.tsx`](../../services/web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx) |
| Config builder | `buildGlycoPharmOperatorConfig()` (empty-state fallback) |
| Layout | `OperatorDashboardLayout` (packages/operator-ux-core) ✅ |
| Backend | [`apps/api-server/src/routes/glycopharm/controllers/operator.controller.ts`](../../apps/api-server/src/routes/glycopharm/controllers/operator.controller.ts) + `services/operator-dashboard.service.ts` |
| KPI 구성 | active-pharmacies / active-products / total-orders(STUB=0) / total-patients / high-risk-patients / open-care-alerts |
| Action Queue | draft-products 만 backend 응답 |
| AI Summary | backend rule (insight-rules.ts) + OperatorAlerts 별도 layer |
| AxisNavigationSection | GP_AXES 2축 (커뮤니티 / 약국HUB) |
| 별도 Admin Dashboard | `GlycoPharmAdminDashboard.tsx` 존재 |

### 2.3 K-Cosmetics

| 항목 | 상태 |
|------|------|
| 메인 컴포넌트 | [`KCosmeticsOperatorDashboard.tsx`](../../services/web-k-cosmetics/src/pages/operator/KCosmeticsOperatorDashboard.tsx) |
| Config builder | `buildKCosmeticsOperatorConfig()` (Neture pass-through 패턴) |
| Layout | `OperatorDashboardLayout` ✅ |
| Backend | [`apps/api-server/src/routes/cosmetics/controllers/operator-dashboard.controller.ts`](../../apps/api-server/src/routes/cosmetics/controllers/operator-dashboard.controller.ts) |
| KPI 구성 | total-stores / active-orders / monthly-revenue / active-products / cms-published |
| Action Queue | active-orders / pending-products / draft-products |
| AI Summary | rule-based via insight-rules.ts |
| AxisNavigationSection | KCOS_AXES 2축 (매장HUB / 콘텐츠) |
| 별도 Admin Dashboard | `KCosmeticsAdminDashboard` (`/admin` 라우트) |

### 2.4 Neture (Baseline)

| 항목 | 상태 |
|------|------|
| 메인 컴포넌트 | [`NetureOperatorDashboard.tsx`](../../services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx) (73줄, 얇음) |
| Config builder | pass-through (frontend 변환 없음) |
| Layout | `OperatorDashboardLayout` ✅ |
| Backend | [`apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts`](../../apps/api-server/src/modules/neture/controllers/operator-dashboard.controller.ts) (321줄, 가장 포괄적) |
| KPI 구성 | 8개: active-orgs / active-suppliers / active-products / monthly-orders / monthly-revenue / cms-published / active-partners / pending-settlements |
| Action Queue | 4개: pending-regs / pending-suppliers / partner-requests / unread-messages |
| AI Summary | rule-based (`generateRuleBasedInsights('neture')` in insight-rules.ts) |
| Activity Log | 다중 소스 UNION (suppliers/products/contacts, 5개) |
| Menu | `operatorMenuGroups.ts` 11-group + `adminOnly` 플래그 + `filterMenuByRole()` + `getAdminMenu()` ✅ |

---

## 3. KPI Matrix

### 3.1 서비스별 KPI 비교 (backend 기준)

| 서비스 | KPI key | label | source filter | 0 시 의미 | drift 의심 |
|--------|---------|-------|---------------|----------|-----------|
| Neture | active-orgs | 활성 참여 조직 | service_code='neture' AND organization.isActive | 0=참여 없음 | — |
| Neture | active-suppliers | 활성 공급사 | neture_suppliers.status='ACTIVE' | 0=공급사 없음 | — |
| Neture | active-products | 판매 상품 | is_active=true AND approval_status='APPROVED' AND service_key='neture' | 0=상품 없음 | — |
| Neture | monthly-orders | 월간 주문 | last 30 days, neture.neture_orders | 0=주문 없음 → inactivity rule trigger | — |
| Neture | monthly-revenue | 월간 매출 | SUM final_amount, paid/preparing/shipped/delivered | 0=매출 없음 | — |
| Neture | cms-published | 게시 콘텐츠 | cms_contents serviceKey='neture' status='published' | 0=콘텐츠 없음 | — |
| Neture | active-partners | 활성 파트너 | neture_partners.status='active' | 0=파트너 없음 | — |
| Neture | pending-settlements | 정산 대기 | neture_settlements.status='pending' (>0이면 warning) | 0=대기 없음 (정상) | — |
| Cosmetics | total-stores | 승인 매장 | cosmetics_stores (status filter 없음 — 확인 필요) | 0=매장 없음 | C (status filter 누락 가능성) |
| Cosmetics | active-orders | 진행 주문 | ecommerce_orders (filter 미확인) | 0=주문 없음 | C |
| Cosmetics | monthly-revenue | 월간 매출 | ecommerce_orders | — | — |
| Cosmetics | active-products | 판매 상품 | cosmetics_products status='ACTIVE' | 0=상품 없음 | — |
| Cosmetics | cms-published | 게시 콘텐츠 | serviceKey='cosmetics' | — | — |
| GlycoPharm | active-pharmacies | 활성 약국 | service_code='glycopharm' AND is_active=true | 0=약국 없음 | — |
| GlycoPharm | active-products | 판매 상품 | GlycopharmProduct status='active' | — | — |
| GlycoPharm | total-orders | 총 주문 | **STUB = 0 고정** | 의미 없음 | **C — STUB 잔재** |
| GlycoPharm | total-patients / high-risk-patients / open-care-alerts | 환자/케어 | (admin only KPI) | — | **H — Care 잔재, GlycoPharm 약국 전문 도메인과 불일치** |
| KPA | (5-Block 없음) | `/operator/summary` 응답 | 분산된 endpoint | — | **J — backend gap** |
| KPA (frontend) | pendingMembers / forum.pendingRequests / content.pendingDraft / signage / pharmacyRequestCount / productApplicationPending | 6개 기본 + admin 2개 | 다수 endpoint 호출 | — | — |

### 3.2 데이터 소스 정합성

- **serviceKey filter 일관성**: Neture 는 `service_code` (organizations.service_enrollments), 그 외는 `serviceKey` (CMS/signage). 의미는 같지만 column 명 통일 안 됨. → **L (서비스별 유지 가능한 차이)** 로 분류.
- **GlycoPharm Orders STUB**: `total-orders=0` 고정 — "E-commerce Core 미통합" 주석. **C (count 의미 불명확)**.

---

## 4. Action Queue Matrix

| 서비스 | 항목 | count source | link | route 존재 | 판정 |
|--------|------|--------------|------|----------|-----|
| **Neture** | 가입 승인 대기 | service_memberships pending | `/operator/applications` | ✅ | A |
| **Neture** | 공급사 승인 대기 | neture_suppliers PENDING | `/operator/suppliers` | ✅ | A (recently fixed) |
| **Neture** | 파트너 요청 | neture_partnership_requests OPEN | `/operator/applications` | ✅ | A |
| **Neture** | 미확인 문의 | neture_contact_messages unresolved | `/operator/contact-messages` | ✅ | A |
| **KPA** | 회원 승인 검토 | pendingMembers | `/operator/members` | ✅ | A |
| **KPA** | 포럼 요청 검토 | forum.pendingRequests | `/operator/forum-management` | ✅ | A |
| **KPA** | 콘텐츠 발행 대기 | content.pendingDraft | `/operator/content` | ✅ | A |
| **KPA** | **사이니지 검수 대기** | signage.media+playlists | `/operator/signage/content` | **❌** | **B — Dead link** |
| **KPA** | 약국 서비스 신청 검토 | pharmacyRequestCount | `/operator/pharmacy-requests` | ✅ | A |
| **KPA** | 상품 신청 검토 | productApplicationPending | `/operator/product-applications` | ✅ | A |
| **KPA (admin)** | 서비스 신청 검토 | serviceApplicationCount | `/operator/pharmacy-requests` | ✅ but **label↔link mismatch 추정** | F — admin/operator scope 혼재 가능성 (`/admin/organization-requests` 가 정합?) |
| **GlycoPharm** | 임시저장 상품 처리 | draftProducts | `/operator/products?status=draft` | ✅ (추정) | A |
| **GlycoPharm** | (그 외 backend actionQueue 미응답) | — | — | — | **D — count 의미 불명확 / queue 빈약** |
| **K-Cosmetics** | 진행 주문 처리 | adminSummary.activeOrders | `/operator/orders` | ✅ | A |
| **K-Cosmetics** | 상품 승인 대기 | products.pending | `/operator/products?status=PENDING` | ✅ | A |
| **K-Cosmetics** | 임시저장 상품 | products.draft | `/operator/products?status=DRAFT` | ✅ | A |

**판정 코드**: A=정상 / B=dead link / C=route는 있으나 권한 불일치 / D=count 의미 불명확 / E=실제 처리 화면 부재 / F=admin/operator scope 혼재 / G=label만 수정 필요

---

## 5. AI Summary / Insight Matrix

`apps/api-server/src/copilot/insight-rules.ts` 의 rule 분기 기준.

| rule | trigger | service 분기 | message | 평가 |
|------|---------|--------------|---------|------|
| Approval Backlog | pending > 0 | neture / glycopharm / cosmetics / kpa 모두 | "{항목} {count}건이 있습니다." | ✅ 구체적 |
| Growth Trend | orders.growth ≠ 0 | 모두 | "주문이 전주 대비 {%} {증감}했습니다." | ✅ |
| Activity Drop | inactive/total > 0.3 | neture(stores), glycopharm(pharmacies) | "비활성 매장이 {count}곳, 전체의 {%}입니다." | ✅ |
| Order Spike | growth > 50% | 모두 | "주문 급증 {%}. **재고 및 운영 상태를 점검하세요.**" | ⚠️ vague ("운영 상태 점검") |
| Inactivity (Neture) | monthly_orders=0 | neture | "최근 주문 데이터가 아직 충분하지 않습니다. 공급사 활성화·상품 노출 흐름을 먼저 확인하세요." | ✅ 구체적 (WO-...-INACTIVITY-RULE-REFINE-V1 적용 후) |
| Inactivity (Cosmetics) | monthly_orders=0 | cosmetics | "최근 주문이 없습니다. **플랫폼 활동을 점검하세요.**" | ❌ vague — E 분류 |
| Inactivity (KPA) | storeAssets.expiringSoon > 0 | kpa | "강제노출 만료 임박 {count}건이 있습니다." | ✅ |
| Inactivity (GlycoPharm) | (확인 불가) | glycopharm | (확인 불가) | ? |

**핵심 격차**: Neture 는 vague 문구를 이미 정비했으나 (Inactivity Rule Refine), Cosmetics 는 동일 패턴 미적용. → **WO 후보**.

---

## 6. Quick Actions / Route Matrix

### 6.1 KPA dead link / redirect

| label | path | route 상태 |
|-------|------|----------|
| 공지사항 | `/operator/news` | redirect to `/operator/content` (이미 처리) |
| 사이니지 | **`/operator/signage/content`** | **dead** — operatorConfig.ts line 85, 225, 278, 312 모두 동일 path. WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1 에서 route 제거되었으나 config 미업데이트 |
| Admin: Home 편집 | `/operator/community` | ✅ |
| Admin: 역할 관리 | `/operator/roles` | ✅ |
| Admin: 감사 로그 | `/operator/audit-logs` | ✅ |

### 6.2 GlycoPharm 의심

| label | path | 비고 |
|-------|------|------|
| LMS Courses | `/operator/lms/courses` | menu 정의, 실제 route `/operator/lms` — **dead link 후보 (추정)** |

### 6.3 K-Cosmetics

- 모든 path 가 App.tsx 에 정의됨 (dead link 0). ✅
- 단, **`adminOnly` 플래그 미적용** → admin 메뉴 항목 (있다면) operator 에게 노출 가능 — **G 분류**.

### 6.4 Neture

- App.tsx routes verified. `/operator/supply` alias → `/operator/all-registered-products` (정상).
- Quick Actions 7개 모두 backend hardcoded 응답.

---

## 7. Operator/Admin Scope Matrix

| 서비스 | 항목 | operator 표시 | operator 처리 가능 | admin 전용 분리 | gap |
|--------|------|:------------:|:----------------:|:--------------:|-----|
| KPA | 회원 승인 | ✅ | ✅ | — | OK |
| KPA | 사이니지 검수 | ✅ (count) | ❌ (dead link) | — | **B+E (dead link + 처리 화면 부재 가능성)** |
| KPA | 역할 관리 | admin only via isAdmin prop | ✅ | △ (config 자체에는 분리 없음, Dashboard component 에서 처리) | △ |
| GlycoPharm | Event Offers Approval | ✅ | ✅ | ❌ (operator 권한) | **G 의심 — admin이어야 할지 재검토 필요** |
| GlycoPharm | Settlements/Reports/Billing/Invoices | ❌ | — | ✅ (admin 으로 이동, WO-CLEANUP-V1) | OK |
| K-Cosmetics | UNIFIED_MENU 전체 | ✅ | ✅ | ❌ — `adminOnly` 플래그 미설정 | **G — admin 항목 operator 노출 가능** |
| K-Cosmetics | filterMenuByRole 호출 위치 | (확인 불가) | — | — | **K — frontend gap** |
| Neture | UNIFIED_MENU + `adminOnly` | ✅ filterMenuByRole + getAdminMenu | ✅ | ✅ | OK (baseline) |

---

## 8. 서비스별 canonical axis 정합성

| 서비스 | AxisNavigation 정의 | 정합성 | 비고 |
|--------|--------------------|:------:|------|
| KPA | 커뮤니티 운영 + 매장HUB 운영 | ✅ | `buildKpaAxes()` |
| GlycoPharm | 커뮤니티 운영 + 약국HUB 운영 | ✅ | `GP_AXES` |
| K-Cosmetics | 매장HUB 운영 + 콘텐츠 운영 | ✅ | `KCOS_AXES` |
| Neture | (별도 패턴 — 명시적 AxisNavigationSection 없음, 메뉴 그룹으로 표현) | △ | Neture 는 공급자·파트너·상품·정산 4축 메뉴 그룹 |

**관찰**: Neture 만 AxisNavigationSection 미사용 — baseline 인지 의심. **정책 결정 IR 후보** (Neture 도 axis section 도입할지 vs 다른 3개도 메뉴 그룹으로 통합할지).

---

## 9. DB 확인 필요 항목 (SQL 후보만)

이번 IR 에서는 SQL 실행하지 않음. 후속 CHECK 용 후보만 제시.

| 서비스 | 의심 count | 필요한 SQL (의도) | 이유 | 우선순위 |
|--------|-----------|--------------------|------|---------|
| KPA | 사이니지 검수 대기 count | `SELECT COUNT(*) FROM signage_media WHERE status='pending' AND serviceKey='kpa'` | dead link 로 처리 불가 — 실제 row 가 있는지 확인 후 처리 화면 부재인지 판단 | 높음 |
| GlycoPharm | total-orders STUB | `SELECT COUNT(*) FROM ecommerce_orders WHERE serviceKey='glycopharm'` | STUB=0 가 실제 데이터와 일치하는지 / 정합성 회복 필요 여부 | 중간 |
| Cosmetics | active-orders | `SELECT COUNT(*) FROM ecommerce_orders WHERE serviceKey='cosmetics' AND status IN (...)` | status filter 가 controller 에 명시되지 않음 — 실제 query 가 어떤 status 를 포함하는지 확인 | 중간 |
| K-Cosmetics | pharmacy/약사 role 보유자 | `SELECT role, COUNT(*) FROM users WHERE service_key='cosmetics' GROUP BY role` | UsersPage 의 KCOS_ROLE_DISPLAY 에 `pharmacist`/`supplier` 가 있는 이유 — 실제로 그런 role 이 cosmetics service 에 존재하는지 | 높음 |
| Neture | 잔존 '약국' 데이터 | `SELECT * FROM neture_stores WHERE type='pharmacy'` (RecruitingProducts 페이지 placeholder 근거) | placeholder 가 legacy 인지 실제 데이터 반영인지 | 낮음 |

> 후속 CHECK 문서 후보: `CHECK-O4O-CROSSSERVICE-DASHBOARD-PENDING-COUNT-DATA-AUDIT-V1`

---

## 10. Root Cause 분류

| 분류 | 발견 항목 | 영향 서비스 |
|------|----------|-----------|
| **A. 이미 정렬됨** | Neture 8 KPI + 4 action items + 5 activity, K-Cos pass-through pattern, GlycoPharm Settlements admin 이동 | (baseline) |
| **B. KPI label drift** | (없음 — 라벨은 대체로 도메인 정합) | — |
| **C. KPI count/source 오류 가능성** | GlycoPharm total-orders STUB=0, Cosmetics active-orders/total-stores status filter 누락 | GlycoPharm, K-Cosmetics |
| **D. Action Queue dead link** | KPA `/operator/signage/content` | KPA |
| **E. AI Summary false-positive / vague message** | Cosmetics inactivity rule "플랫폼 활동을 점검하세요", 전 서비스 Order Spike rule "운영 상태를 점검하세요" | K-Cosmetics, 전 서비스 |
| **F. Quick Action route mismatch** | KPA admin "서비스 신청 검토" → `/operator/pharmacy-requests` (label 과 link 의미 불일치 의심), GlycoPharm `/operator/lms/courses` | KPA, GlycoPharm |
| **G. operator/admin scope mismatch** | K-Cosmetics UNIFIED_MENU `adminOnly` 플래그 미적용, GlycoPharm Event Offer Approval operator 권한 (재검토 필요) | K-Cosmetics, GlycoPharm |
| **H. 서비스 도메인 어휘 혼입** | K-Cosmetics StoresPage `pharmacy:'약국'`, UsersPage `pharmacist/supplier`; GlycoPharm Admin KPI 환자/케어/당뇨 + capabilities.CARE 잔재; Neture RecruitingProductsOverviewPage '약국' placeholder | K-Cosmetics, GlycoPharm, Neture |
| **I. stale/test data 가능성** | (DB 확인 전 미확정) | — |
| **J. backend endpoint/route gap** | KPA: 5-Block unified `/operator/dashboard` 미구현 (`/operator/summary` 만) — action queue / quick actions 응답 없음 | KPA |
| **K. frontend page/menu gap** | K-Cosmetics filterMenuByRole 호출 위치 미확인 | K-Cosmetics |
| **L. 서비스별 유지 가능한 차이** | serviceKey vs service_code column 명, Neture AxisNavigationSection 미사용 | (정책 결정 필요) |

---

## 11. 즉시 수정 가능한 WO 후보 (작게 쪼개기)

각각 작은 PR 로 처리 가능. **이번 IR 에서 구현하지 않음** — 별도 WO 생성·승인 후 진행.

| # | WO 후보 ID | 범위 | 분류 | 추정 난이도 |
|---|-----------|------|------|------------|
| W1 | `WO-O4O-KPA-OPERATOR-DASHBOARD-SIGNAGE-DEAD-LINK-FIX-V1` | KPA operatorConfig.ts 의 `/operator/signage/content` 4개 라인 → 유효 path 또는 항목 제거 | D | 소 |
| W2 | `WO-O4O-KPA-OPERATOR-ADMIN-QUICK-ACTION-LABEL-LINK-ALIGN-V1` | KPA admin "서비스 신청 검토" label↔link 정합 (`/admin/organization-requests` 후보) | F | 소 |
| W3 | `WO-O4O-KCOSMETICS-OPERATOR-MENU-ADMINONLY-FLAG-APPLY-V1` | K-Cosmetics operatorMenuGroups.ts 의 admin 전용 항목에 `adminOnly:true` 추가 + filterMenuByRole 호출 위치 정렬 | G+K | 중 |
| W4 | `WO-O4O-KCOSMETICS-OPERATOR-VOCABULARY-PHARMACY-CLEANUP-V1` | StoresPage `pharmacy:'약국'`, UsersPage `pharmacist`/`supplier` → cosmetics 도메인 어휘로 교체 (단, role 실제 데이터 확인 후) | H | 중 |
| W5 | `WO-O4O-GLYCOPHARM-OPERATOR-DASHBOARD-CARE-VOCABULARY-CLEANUP-V1` | Admin KPI `total-patients`/`high-risk-patients`/`open-care-alerts` 제거 또는 옵셔널 + capabilities.CARE 선언 정리 | H | 중 |
| W6 | `WO-O4O-NETURE-OPERATOR-PAGES-RESIDUAL-PHARMACY-LABEL-CLEANUP-V1` | RecruitingProductsOverviewPage placeholder "약국명 검색" / "약국/공급자" column header → "조직/공급사" 어휘 | H | 소 |
| W7 | `WO-O4O-CROSSSERVICE-INSIGHT-RULES-VAGUE-MESSAGE-REFINE-V1` | insight-rules.ts 의 Cosmetics inactivity + 전 서비스 Order Spike 문구를 Neture inactivity 패턴으로 구체화 | E | 소~중 |

---

## 12. 정책 결정이 필요한 IR 후보

각각 별도 IR 로 분리. 정책 결정 후 WO 분할.

| # | IR 후보 ID | 결정 사항 |
|---|-----------|----------|
| I1 | `IR-O4O-KPA-OPERATOR-DASHBOARD-API-5BLOCK-UNIFICATION-V1` | KPA 도 backend `/operator/dashboard` 5-block unified 응답을 도입할지 vs 현재 frontend 동적 생성 유지할지. 도입 시 영향 범위 (frontend 변경, action queue / quick actions backend 응답 추가) |
| I2 | `IR-O4O-GLYCOPHARM-EVENT-OFFER-APPROVAL-SCOPE-AUDIT-V1` | GlycoPharm 의 Event Offers Approval 이 operator vs admin 어느 권한이어야 하는지 (Neture event offer approval scope 와 비교) |
| I3 | `IR-O4O-CROSSSERVICE-OPERATOR-AXIS-NAVIGATION-CONVERGENCE-V1` | 4개 서비스 AxisNavigationSection 형태 정합 (Neture 도 axis 도입할지 vs 다른 3개를 메뉴 그룹으로 통합할지). 사업 철학 SSOT §3-§5 와 정렬 |

---

## 13. 우선순위 제안

### Tier 1 (즉시 수정, 작은 PR)
- **W1 KPA dead link fix** — 운영 영향 직접적, 단순 수정
- **W3 K-Cosmetics adminOnly 적용** — 권한 누설 위험
- **W7 Vague AI Summary refine** — 운영자 액션 가능성 향상, 패턴 이식 (Neture → 다른 3개)

### Tier 2 (도메인 어휘 정합)
- **W4 K-Cosmetics pharmacy 어휘 정리** (단, role 실제 데이터 확인 — Section 9 SQL 우선)
- **W5 GlycoPharm Care 어휘 정리**
- **W6 Neture 잔존 약국 placeholder**

### Tier 3 (작은 정합)
- **W2 KPA admin Quick Action label/link 정합**

### Tier 4 (정책 결정 필요)
- **I1 KPA 5-block unified dashboard API 도입** — 구조 변경 / Neture baseline 정합
- **I2 GlycoPharm Event Offer scope 결정**
- **I3 AxisNavigationSection 정합**

### Tier 5 (데이터 검증, 후속 CHECK)
- `CHECK-O4O-CROSSSERVICE-DASHBOARD-PENDING-COUNT-DATA-AUDIT-V1` — Section 9 SQL 후보 실행

---

## 14. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) / [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) / [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) 대비.

| 철학 원칙 | 정합 여부 | 발견 |
|----------|:--------:|------|
| §3.2 Operator = 서비스 운영 사업자 (자료 수신·등록·구성 + AI 활용 + 매장 실행 자산 제작 + 큐레이션 + 매장 지원 + 운영 수익 모델 구축) | △ | A~F 6 Workspace 중 4개 서비스 모두 "검수·승인" 편향 (Action Queue 가 대부분 approval). 자료 등록·AI 작업·큐레이션·매장 지원·운영 수익 진입점이 약함. (단, Neture 는 메뉴 그룹으로 일부 커버) |
| §5 HUB 철학 (매장 HUB 운영, 매장 실행 자산 게시) | ✅ | KPA/GlycoPharm/K-Cosmetics AxisNavigationSection 에서 "매장HUB 운영" 명시. Neture 는 공급자 중심이므로 무관. |
| §6 AI 역할 (능동 활용 + 수신 영역 분리) | △ | AI Summary 는 수신 영역으로 잘 표현됨. 그러나 능동 AI 활용 Workspace (Workspace B) 진입점이 4개 서비스 모두 약함. (각 서비스에 `AiReportPage` 는 있으나 dashboard quick action 으로 통합 안 됨) |
| §7 Drift 방지 (도메인 어휘 격리) | ❌ | H 분류 다수: K-Cosmetics pharmacy/약사, GlycoPharm 환자/케어, Neture 약국 placeholder 등 |
| Boundary Policy §2 Domain Primary Boundary | ✅ | 각 서비스 KPI source 는 도메인 boundary 와 정렬 (serviceKey 또는 service_code 필터) — Cosmetics active-orders status filter 누락은 별개 이슈 |
| OPERATOR-DASHBOARD-STANDARD §5-6~§5-9 6 Workspace 진입 허브 | ❌ | 4개 서비스 모두 6 Workspace 진입 허브 형태가 아님. Dashboard 는 KPI/Action Queue/Quick Actions 중심. 진입 허브 패턴 도입 여부가 별도 정책 결정 필요 |

> **종합**: 도메인 어휘 drift (H) 와 검수·승인 편향 (philosophy §3.2 부분 정합) 이 가장 큰 정렬 부족. 단, 즉시 수정 가능한 어휘 cleanup WO 와 정책 결정 IR (I1~I3) 으로 분리하여 처리하면 한 번에 큰 구조 변경 없이도 정합성 회복 가능.

---

## 완료 보고

- **작성한 IR 파일 경로**: `docs/investigations/IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1.md`
- **각 서비스별 핵심 발견**:
  - KPA: dead link (signage/content) + 5-block unified API 미적용 (구조적 격차)
  - GlycoPharm: 환자/케어 KPI 잔재 + LMS route 의심 + total-orders STUB
  - K-Cosmetics: pharmacy/약사 어휘 노출 + adminOnly 플래그 미적용
  - Neture (baseline): 잔존 '약국' placeholder 외 정합
- **즉시 수정 가능한 항목**: §11 Tier 1 (W1/W3/W7)
- **정책 결정이 필요한 항목**: §12 I1/I2/I3
- **DB 확인이 필요한 항목**: §9 5건 (후속 CHECK 후보)
- **다음 우선순위 제안**: §13 Tier 1 → Tier 2 → Tier 5 (CHECK) → Tier 3/4 순

---

> **상태**: 조사 완료. 코드/DB/파일 수정·commit·push 일절 없음. 다음 단계는 사용자 승인 하에 §11 WO 또는 §12 IR 분할 진행.
