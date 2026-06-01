# IR-O4O-KCOSMETICS-OPERATOR-MENU-ADMIN-ENTRY-MIX-V1

**작성 일자**: 2026-05-31
**작업 성격**: 정책 결정 IR (Policy Decision Investigation) — 코드 / DB / migration / route / API / frontend / menu / dashboard / component 수정 일절 없음
**상위 IR**: [IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1](IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1.md) §12 Iα
**W3 finding 정정**: [CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1](CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1.md) W3 no-op closure
**선행 종결**: I1 / I2 / I3 모두 종결
**조사 도구**: 4 병렬 Explore agent — K-Cosmetics / KPA / GlycoPharm / Neture 의 operator/admin 메뉴 분리 구조

---

## 0. 핵심 결론 (TL;DR)

> ✅ **권장: Option A — 현재 구조 유지 (W3 no-op closure 정합 + 4 서비스 자연스러운 차이 인정)**
>
> 1. **K-Cosmetics 의 operator menu 에 admin 성격 entry 혼입 0** — UNIFIED_MENU 25 항목 모두 operator 성격. adminOnly 필드 타입 정의되어 있으나 **실제 사용 0** (향후 확장 대비 인프라만).
> 2. **/operator/* 와 /admin/* layout / route guard 분리 정합** — K-Cos 는 `OperatorRoute` + MembershipGate 로 operator route 보호, `ProtectedRoute allowedRoles=['cosmetics:admin', 'platform:super_admin']` + `DashboardLayout role="admin"` 으로 admin route 분리. 4 서비스 모두 layout/route 분리 됨.
> 3. **filterMenuByRole 호출되나 현재 no-op** — `OperatorLayoutWrapper.tsx` line 29 에서 호출. adminOnly 항목 0개라 결과 동일. 인프라는 살아 있고 향후 admin 메뉴 추가 시 즉시 사용 가능.
> 4. **4 서비스 adminOnly 사용 빈도 차이** — Neture 22 > KPA 3 > GlycoPharm 2 > **K-Cos 0**. K-Cos 는 admin pages 자체가 2개만 (KCosmeticsAdminDashboard + KCosmeticsAdminMembersPage) 라 adminOnly inline 메뉴 필요성 낮음.
> 5. **drift 아님** — K-Cos 의 0 사용은 사업 정체성 (admin 영역 협소 — 회원 hard-delete 만) + admin pages 적음 의 자연스러운 귀결. 4 서비스 모두 같은 인프라 (`UnifiedMenuItem.adminOnly?` + `filterMenuByRole`) 사용 — 정합.
> 6. **현 시점 즉시 진행 필요 없음** — 본 IR 의 역할은 W3 no-op closure 정책 confirm + cross-service 비교 문서화. 후속 WO 후보 모두 우선순위 낮음.

권고 단계: ① 본 IR 로 Option A 정책 확정 (W3 finding 정정 공식화) → ② 후속 (선택) operator menu filtering standard 문서화 IR → ③ K-Cos admin pages 확장 시점에 adminOnly inline 도입 검토 (현재는 0개 항목이라 불필요)

---

## 1. Executive Summary

| 측면 | K-Cosmetics | KPA Society | GlycoPharm | Neture |
|------|:-----------:|:-----------:|:----------:|:------:|
| UNIFIED_MENU 항목 수 | 25 | 29 | ~50 | 54 |
| adminOnly 필드 타입 정의 | ✅ | ✅ | ✅ | ✅ |
| **adminOnly 실제 사용 항목** | **0** | 3 (법률/감사/역할) | 2 (서비스 설정 / 회원 Admin) | **22** |
| filterMenuByRole 호출 | ✅ (OperatorLayoutWrapper) | ✅ (KpaOperatorLayoutWrapper) | ✅ | ✅ + getAdminMenu() 추가 |
| operator menu 에 admin entry inline | ❌ (0) | ✅ (3) | ✅ (2) | ✅ (22) |
| /operator/* route guard | OperatorRoute + MembershipGate | RoleGuard PLATFORM_ROLES + 내부 RoleGuard 3개 | OperatorRoute + MembershipGate | OperatorRoute + MembershipGate |
| /admin/* route guard | ProtectedRoute allowedRoles=['cosmetics:admin','platform:super_admin'] | AdminAuthGuard | ProtectedRoute allowedRoles=GLYCOPHARM_ROLES | AdminRoute allowedRoles=[neture:admin, platform:super_admin] |
| 별도 admin layout | DashboardLayout role="admin" | AdminLayout + AdminSidebar | DashboardLayout(role=ADMIN) | AdminLayoutWrapper |
| admin pages 개수 | **2** | ~3 | ~7 | 다수 |
| Admin 메뉴 분리 패턴 | 별도 layout (메뉴 inline 없음) | 별도 layout + inline (adminOnly 3개) | 별도 layout + inline (adminOnly 2개) | 별도 layout + getAdminMenu() |

### 권장: ✅ **Option A — 현재 구조 유지**

---

## 2. W3 finding 정정 이력

### 2.1 초기 finding

`IR-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-CANONICAL-AUDIT-V1` 의 Tier 1 W3 항목:

> "K-Cosmetics operatorMenuGroups.ts 의 UNIFIED_MENU 에 adminOnly 플래그가 없어서 admin 항목이 operator 에게 노출될 가능성"

### 2.2 W3 조사 결과

- **UNIFIED_MENU 에 admin 대상 항목 자체가 0건** — 25 항목 모두 operator 성격
- `filterMenuByRole` 는 `OperatorLayoutWrapper.tsx` 에서 이미 import + 호출 중
- `/admin/*` 라우트는 `App.tsx` 에서 `ProtectedRoute allowedRoles={['cosmetics:admin', 'platform:super_admin']}` + `DashboardLayout role="admin"` 으로 분리

### 2.3 W3 종결

[CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1](CHECK-O4O-CROSSSERVICE-OPERATOR-ADMIN-DASHBOARD-TIER2-COMPLETION-V1.md) 에서 **W3 no-op closure** 로 종결.

### 2.4 본 IR 의 역할

W3 finding 정정 과정에서 "K-Cos 의 operator/admin 메뉴 분리가 다른 서비스와 정합되는가? K-Cos 만의 특수성인가? 추후 공통화 필요한가?" 의 정책적 confirm 미수행. 본 IR 이 그 confirm 을 수행.

---

## 3. K-Cosmetics operatorMenuGroups 구조

### 3.1 UNIFIED_MENU 25 항목 (모두 operator 성격)

[`services/web-k-cosmetics/src/config/operatorMenuGroups.ts`](../../services/web-k-cosmetics/src/config/operatorMenuGroups.ts)

| 그룹 | 항목 (label / path) | adminOnly | 성격 |
|------|---------------------|:---------:|:----:|
| dashboard | 대시보드 (/operator) | — | operator |
| users | 회원 관리 (/operator/members) | — | operator |
| approvals | 신청 관리 (/operator/applications) | — | operator |
| approvals | 이벤트 오퍼 승인 (/operator/event-offers) | — | operator |
| products | 상품 관리 (/operator/products) | — | operator |
| stores | 내 매장 (/operator/store-cockpit) | — | operator |
| stores | 매장 관리 (/operator/stores) | — | operator |
| stores | 채널 관리 (/operator/store-channels) | — | operator |
| stores | 매장 HUB 블로그 (/operator/blog) | — | operator |
| stores | 매장 HUB POP (/operator/pop) | — | operator |
| stores | 매장 HUB QR (/operator/qr) | — | operator |
| orders | 주문 관리 (/operator/orders) | — | operator |
| content | 공지/뉴스 관리 (/operator/content-management) | — | operator |
| content | 설문조사 관리 (/operator/surveys) | — | operator |
| resources | 자료실 관리 (/operator/resources) | — | operator |
| lms | 강의 관리 (/operator/lms) | — | operator |
| lms | 안내 문구 관리 (/operator/guide-contents) | — | operator |
| signage | 사이니지 콘텐츠 (/operator/signage/content) | — | operator |
| signage | HQ 미디어 (/operator/signage/hq-media) | — | operator |
| signage | HQ 플레이리스트 (/operator/signage/hq-playlists) | — | operator |
| signage | 템플릿 (/operator/signage/templates) | — | operator |
| forum | 포럼 신청 (/operator/forum-requests) | — | operator |
| forum | 삭제 요청 (/operator/forum-delete-requests) | — | operator |
| forum | 포럼 분석 (/operator/forum-analytics) | — | operator |
| analytics | AI 리포트 (/operator/ai-report) | — | operator |

→ **admin 성격 entry 혼입 0**

### 3.2 adminOnly 필드 정의

- 타입 정의: `interface UnifiedMenuItem extends OperatorMenuItem { adminOnly?: boolean; }` (line 19-21)
- **실제 사용**: 0건
- 인프라 준비됨 — 향후 admin 메뉴 항목 추가 시 즉시 사용 가능

### 3.3 filterMenuByRole 적용

- import: `OperatorLayoutWrapper.tsx` line 19
- 호출: line 29 (`filterMenuByRole(UNIFIED_MENU, isAdmin)`)
- isAdmin 계산: `isAdminOrAbove(user.roles, 'cosmetics')` (line 26)
- **현 시점 효과**: adminOnly 사용 항목 0 → 결과 동일 (no-op)

---

## 4. K-Cosmetics admin layout / operator layout 구조

### 4.1 Operator route

[`services/web-k-cosmetics/src/App.tsx`](../../services/web-k-cosmetics/src/App.tsx) line 568-637

| 항목 | 값 |
|------|------|
| guard | `<OperatorRoute>` (custom wrapper) |
| 허용 role | `isAdminOrAbove(user.roles, 'k-cosmetics')` 또는 `k-cosmetics:operator` / `cosmetics:operator` (RoleGuard line 96-97) |
| Membership | MembershipGate (`service_memberships.cosmetics.status='active'`) |
| layout | OperatorLayoutWrapper → OperatorAreaShell (공통 @o4o/operator-core-ui) |

### 4.2 Admin route

App.tsx line 544-565

| 항목 | 값 |
|------|------|
| guard | `<ProtectedRoute allowedRoles={['cosmetics:admin', 'platform:super_admin']}>` |
| layout | DashboardLayout `role="admin"` (K-Cosmetics 자체 구현) |
| admin pages | KCosmeticsAdminDashboard + KCosmeticsAdminMembersPage (2개만) |

### 4.3 분리 정합

- ✅ `/operator/*` 와 `/admin/*` 완전 분리 (다른 layout / 다른 guard)
- ✅ admin pages 가 적어 inline adminOnly 도입 부담 없음
- ✅ Membership 강제 적용 — Operator 도 `service_memberships.cosmetics.status='active'` 통과 필수

---

## 5. Route guard / allowedRoles 분석

### 5.1 권한 매트릭스 (K-Cos)

| Route 영역 | Layout | Guard 컴포넌트 | allowedRoles | 비고 |
|-----------|--------|---------------|--------------|------|
| `/operator/*` | OperatorLayoutWrapper (OperatorAreaShell) | OperatorRoute | k-cosmetics:operator OR cosmetics:operator OR cosmetics:admin OR platform:super_admin | + MembershipGate |
| `/admin/*` | DashboardLayout role="admin" | ProtectedRoute | cosmetics:admin OR platform:super_admin | inline admin layout |

### 5.2 정합 확인

| 검증 | 결과 |
|------|:----:|
| /operator/* 와 /admin/* 의 role 분리 정합 | ✅ — admin 은 양쪽 접근, operator 는 admin 접근 불가 |
| platform:super_admin bypass 정합 | ✅ — 양쪽 허용 |
| MembershipGate (cosmetics) 적용 | ✅ — operator route 전체 |
| dead link / hidden route | ❌ 없음 — UNIFIED_MENU path 와 App.tsx route 일치 |
| 메뉴 노출 불일치 | ❌ 없음 — operator menu = operator path 만 |

---

## 6. filterMenuByRole 적용 여부

### 6.1 K-Cos 현재 동작

| 항목 | 값 |
|------|------|
| 함수 위치 | `services/web-k-cosmetics/src/config/operatorMenuGroups.ts` |
| 호출 위치 | `OperatorLayoutWrapper.tsx` line 29 |
| 입력 메뉴 | UNIFIED_MENU (25 항목 전체) |
| isAdmin 입력 | `isAdminOrAbove(user.roles, 'cosmetics')` |
| adminOnly 미사용 시 동작 | 모든 25 항목이 그대로 반환 (no-op) |
| 결과 | operator/admin 모두 동일 25 항목 노출 |

### 6.2 판정

✅ **함수는 호출되고 정상 동작**. adminOnly 항목 0 이므로 현재 no-op 이지만, 향후 admin entry 추가 시 즉시 효과 발휘. 인프라 준비 완료.

---

## 7. Admin entry mix 가능성 검증

### 7.1 정적 검증 (K-Cos UNIFIED_MENU)

- 25 항목 모두 `/operator/*` path
- 각 항목의 성격이 operator 책임 영역 (회원 관리 = operator 가 회원 신청 처리 / 매장 관리 / 콘텐츠 등)
- admin 성격 항목 (시스템 설정 / 정책 / 감사 / 회원 hard-delete) 메뉴 0개

### 7.2 admin pages 분석

| Page | 위치 | admin 전용 기능 |
|------|------|----------------|
| KCosmeticsAdminDashboard | `/admin` | admin 전용 대시보드 |
| KCosmeticsAdminMembersPage | `/admin/members` | 회원 hard-delete (operator 는 soft-delete 만) |

→ admin 영역이 **2 page 로 협소** — K-Cos 는 회원 hard-delete 외 admin 전용 정책 영역이 거의 없음. 따라서 operator menu 에 inline admin entry 추가 필요성 낮음.

### 7.3 GlycoPharm 비교

GlycoPharm 의 admin 영역: settlements, reports, billing-preview, invoices, roles 등 7+ pages. inline adminOnly 메뉴 항목 2개 (서비스 설정 / 회원 관리 Admin) 가 자연스러움.

### 7.4 결론

✅ **K-Cos 의 admin entry 혼입 0 은 사업 정체성 (협소한 admin 영역) 의 자연스러운 귀결**. 향후 admin pages 가 늘어나면 inline adminOnly 도입이 자연스러워질 수 있음. 현 시점에는 불필요.

---

## 8. 4개 서비스 비교

### 8.1 매트릭스

| 서비스 | layout 분리 | menu 분리 | adminOnly 사용 | route guard | admin pages | 판정 |
|--------|:----------:|:---------:|:--------------:|:-----------:|:-----------:|:----:|
| K-Cos | DashboardLayout(role=admin) | UNIFIED_MENU (operator 전용) | 0 | ProtectedRoute(cosmetics:admin) | 2 | ✅ |
| KPA | AdminLayout + AdminSidebar | UNIFIED_MENU + adminOnly 3 + AdminSidebar 별도 | 3 (법률/감사/역할) | AdminAuthGuard | ~3 | ✅ |
| GlycoPharm | DashboardLayout(role=ADMIN) | UNIFIED_MENU + adminOnly 2 | 2 (서비스 설정 / 회원 Admin) | ProtectedRoute(GLYCOPHARM_ROLES) | ~7 | ✅ |
| Neture | AdminLayoutWrapper | UNIFIED_MENU + getAdminMenu() | 22 | AdminRoute(neture:admin) | 다수 | ✅ |

### 8.2 4 서비스 공통점

- 모두 UNIFIED_MENU + adminOnly 필드 + filterMenuByRole 인프라
- 모두 /operator/* + /admin/* layout/route 분리
- 모두 platform:super_admin bypass 정합
- 모두 MembershipGate (service membership 강제)

### 8.3 차이점

- adminOnly 사용 빈도: **K-Cos (0) < GlycoPharm (2) < KPA (3) < Neture (22)**
- 차이의 사유: **admin 영역 크기에 비례** — Neture 의 admin 영역이 가장 광범위 (operator 관리 / 정산 / 커미션 / 카테고리 정리 / 마스터 등), K-Cos 가 가장 협소 (hard-delete 만)
- 별도 admin 메뉴 노출 방식:
  - KPA: AdminSidebar 별도 (2 항목 — 관리자 홈 + 회원 관리)
  - Neture: getAdminMenu() 함수로 admin sidebar 별도 생성
  - GlycoPharm: inline adminOnly 메뉴 (UNIFIED_MENU 의 admin 항목이 operator menu 에 표시되지 않으나 sidebar 의 menu 데이터에 포함)
  - K-Cos: admin 메뉴 없음 — admin 은 /operator/* 사용 + /admin/* 별도 page 직접 접근

### 8.4 K-Cos drift 여부

❌ **drift 아님**. K-Cos 의 0 사용은:
1. **사업 정체성**: admin 영역이 2 page 뿐 — inline 메뉴 부담 낮음
2. **인프라 정합**: 같은 `UnifiedMenuItem.adminOnly?` 타입 + `filterMenuByRole` 사용 — 향후 확장 시 즉시 활용 가능
3. **route guard 정합**: 다른 3 서비스와 동일 분리 패턴

---

## 9. 정책 옵션 A/B/C/D 비교

### Option A — 현재 구조 유지 (W3 no-op closure 정합) ✅

| 측면 | 평가 |
|------|------|
| 장점 | (1) 이미 정합 — admin entry 혼입 0, layout/route 분리 ✅. 변경 0. (2) 4 서비스 동일 인프라 (`UnifiedMenuItem.adminOnly?` + `filterMenuByRole`) 정합. (3) K-Cos 사업 정체성 (협소한 admin) 반영 — 메뉴 단순. (4) 1인 개발 부담 0. (5) 향후 admin pages 확장 시 inline adminOnly 도입 인프라 준비됨. |
| 단점 | 없음. |
| 리스크 | 매우 낮음 |
| 권장 | ✅ **권장** |

### Option B — operatorMenuGroups 에 adminOnly 명시 도입 (미래 혼입 방지용)

| 측면 | 평가 |
|------|------|
| 장점 | adminOnly 사용 패턴 명시화. 향후 inline admin 메뉴 추가 시 정책 일관성. |
| 단점 | (1) 현재 admin entry 0 — 추가할 항목 없음. (2) 인프라는 이미 준비됨 (`adminOnly?` 타입 정의). (3) 개념상 불필요한 필드 추가. (4) "혼입 방지" 의 실효성 낮음 — 이미 0 이므로. |
| 리스크 | 낮음 (변경 작으나 의미 없음) |
| 권장 | △ — 향후 admin pages 확장 시점 검토. 현재 불필요. |

### Option C — K-Cos 도 Neture / KPA / GlycoPharm 와 동일한 menu filtering 표준으로 강제 정렬

| 측면 | 평가 |
|------|------|
| 장점 | 4 서비스 menu filtering 패턴 통일. cross-service learnability. |
| 단점 | (1) 이미 같은 인프라 사용 중 — "강제 정렬" 의 의미 약함. (2) Neture 는 22 adminOnly + getAdminMenu() 별도, K-Cos 는 0 — 추상 정합은 같으나 표면 사용량 차이 자연스러움. (3) 사업 정체성 무시. |
| 리스크 | 중간 |
| 권장 | ❌ |

### Option D — admin/operator 메뉴 구조 재설계

| 측면 | 평가 |
|------|------|
| 장점 | (불명확) |
| 단점 | (1) 범위 큼 — 4 서비스 + 공통 packages. (2) 현 구조 동작 중. (3) 1인 개발 속도 부담. |
| 리스크 | 매우 높음 |
| 권장 | ❌ |

---

## 10. 권장안

### 최종 권장: ✅ **Option A — 현재 구조 유지**

**근거**:

1. **W3 no-op closure 정합** — admin entry 혼입 0 확인. `filterMenuByRole` 호출 + layout/route 분리 정합.
2. **4 서비스 인프라 정합** — 같은 `UnifiedMenuItem.adminOnly?` 타입 + 같은 `filterMenuByRole` 함수. adminOnly 사용 빈도 차이는 admin 영역 크기 (K-Cos 2 vs Neture 다수) 의 자연스러운 귀결.
3. **K-Cos 사업 정체성 반영** — admin 영역 협소 (회원 hard-delete 만). inline adminOnly 도입 필요성 낮음.
4. **인프라 준비됨** — 향후 admin pages 확장 시 즉시 inline adminOnly 도입 가능.
5. **1인 개발 속도** — 즉시 코드 작업 0. 정책 confirm 만으로 종결.

### 단, 추가 사항 (선택)

- **K-Cos admin pages 확장 시점에 inline adminOnly 검토**: 현재 2 page → 향후 4-5 page 이상 추가 시 KPA / GlycoPharm 패턴 따라 inline adminOnly 도입. 본 IR scope 외.
- **OPERATOR-DASHBOARD-STANDARD-V1 update**: "UNIFIED_MENU + adminOnly + filterMenuByRole 인프라 4 서비스 공통" + "adminOnly 사용 빈도는 admin 영역 크기에 따라 자연스러운 차이 허용" 명시. 본 IR 권고 사항. 별도 작업.
- **Cross-service operator menu filtering standard 문서화**: 4 서비스 패턴 비교 + 표준 명문화. 별도 IR (`IR-O4O-CROSSSERVICE-OPERATOR-MENU-FILTERING-STANDARD-V1`).

### 즉시 진행 권장 없음

- W3 no-op closure 이미 완료
- 4 서비스 인프라 정합
- 본 IR 은 정책 confirm — 즉시 코드 작업 없음

---

## 11. 예상 후속 WO

본 IR 종결 후 즉시 진행 필요 없음. 다음은 선택적 후속 WO 후보 (우선순위 모두 낮음):

| ID (가칭) | 범위 | 우선 |
|-----------|------|:----:|
| **WO-O4O-KCOSMETICS-OPERATOR-MENU-ADMINONLY-NOOP-DOCUMENTATION-V1** | operatorMenuGroups.ts 의 adminOnly 필드에 "현재 0 사용, 향후 admin pages 확장 시 활용" 주석 추가. 본 IR 결론 코드 측 명시 (1줄 주석 변경). | 낮음 |
| **WO-O4O-KCOSMETICS-OPERATOR-MENU-ADMINONLY-GUARD-PROP-V1** | filterMenuByRole 호출 시 adminOnly 0 사용 정합 유지 + UnifiedMenuItem type 정의 유지 (방어적). 실질 변경 없음. | 낮음 (의미 약함) |
| **IR-O4O-CROSSSERVICE-OPERATOR-MENU-FILTERING-STANDARD-V1** | 4 서비스 menu filtering 패턴 표준 명문화 (UNIFIED_MENU + adminOnly + filterMenuByRole 의 공통 인프라 + 사용 빈도 차이 허용 정책) | 중간 |
| **CHECK-O4O-KCOSMETICS-OPERATOR-ADMIN-MENU-SCOPE-SMOKE-V1** | 브라우저 smoke — operator 계정 / admin 계정 로그인 시 메뉴 노출 + route 접근 정합 | 낮음 |

---

## 12. 리스크와 회귀 가능성

### 12.1 본 IR 자체의 리스크

| 항목 | 리스크 |
|------|:------:|
| 정책 결정 (Option A 확정) | **매우 낮음** — W3 no-op closure 정합 confirm |
| 다른 세션 WIP (Neture sidebar 이행 트랙) 와 충돌 | 매우 낮음 — 영역 분리 |

### 12.2 후속 WO 진행 시 리스크 (선택)

| WO | 리스크 |
|----|:------:|
| K-Cos adminOnly no-op documentation (주석 1줄) | 매우 낮음 |
| operatorMenuGroups type 정의 유지 | 낮음 |
| Cross-service operator menu filtering standard 문서 | 낮음 |
| Browser smoke | 낮음 |

### 12.3 회귀 가능성

본 IR 진행으로 인한 회귀 0 (코드 변경 0).

---

## 13. Current Structure vs O4O Philosophy Conflict Check

[`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) + [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) + [`OPERATOR-DASHBOARD-STANDARD-V1`](../platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md) + [`ROLE-POLICY-AND-GUARD-V1`](../baseline/ROLE-POLICY-AND-GUARD-V1.md) 정합 점검.

| 원칙 | **Option A (권장)** | Option B (adminOnly 강제) | Option C (강제 정렬) | Option D (재설계) |
|------|:-------------:|:-------------:|:-------------:|:-------------:|
| §3 참여 주체 (Operator / Admin 분리) | ✅ K-Cos route/layout 분리 정합 | ✅ | ✅ | ✅ |
| §3.2 operator 정의 (일상 운영) | ✅ K-Cos operator menu = 일상 운영 정합 | ✅ | ✅ | △ |
| Operator vs Admin 권한 분리 (`OPERATOR-DASHBOARD-STANDARD §11`) | ✅ K-Cos `ProtectedRoute allowedRoles=['cosmetics:admin', 'platform:super_admin']` 정합 | ✅ | ✅ | ✅ |
| 메뉴에 admin 항목 섞이면 책임 경계 흐림 | ✅ K-Cos 혼입 0 | ✅ | ✅ | △ |
| route guard 명확 → 메뉴 adminOnly 불필요 | ✅ K-Cos 의 경우 그대로 | ⚠️ adminOnly 강제 도입 시 추가 가치 없음 | △ | △ |
| §7 Drift 방지 (도메인 어휘 격리) | ✅ K-Cos 의 0 사용은 사업 정체성 정합 | ⚠️ 강제 시 다른 서비스 패턴 강제 적용 | ❌ | ❌ |
| 공통화 + 운영 흐름 정합 §2 | ✅ "공통 인프라 + 서비스별 사용량 자유도" 패턴 | △ 사용량 강제는 over-fitting | ❌ | ❌ |
| 1인 개발 속도 | ✅ 변경 0 | △ adminOnly 도입 부담 (실효 없음) | ❌ | ❌ |
| OPERATOR-DASHBOARD-STANDARD 5-Block | ✅ 동일 | ✅ | ✅ | △ |
| RBAC SSOT (`RBAC-FREEZE-DECLARATION-V1`) | ✅ role 분리 + scope guard 정합 | ✅ | ✅ | △ |
| 4 서비스 cross-service learnability | ✅ 같은 인프라 (UnifiedMenuItem + filterMenuByRole) | △ 사용량 강제 시 over-fitting | ❌ | ❌ |

> **종합**: **Option A** 가 모든 원칙과 정합. K-Cos 의 adminOnly 0 사용은 사업 정체성 (협소한 admin 영역) 의 자연스러운 귀결이며, 4 서비스 인프라 정합 + route/layout 분리 정합 모두 통과. Option B 는 실효성 없음, Option C / D 는 over-fitting.

### 13.1 핵심 통찰

> **공통화 = "메뉴 구현 같게 강제" 가 아니라 "권한/책임 경계를 일관되게 보장"**

- 4 서비스 모두 `UnifiedMenuItem.adminOnly?` + `filterMenuByRole` + ProtectedRoute / OperatorRoute / MembershipGate 인프라 정합
- 사용 빈도 차이 (Neture 22 vs K-Cos 0) 는 admin 영역 크기 차이의 자연스러운 귀결
- **권한/책임 경계 (operator vs admin)** 는 4 서비스 모두 명확 — route guard + layout 분리

### 13.2 1인 개발 속도

- 본 IR 자체로 정책 confirm ✅ (즉시 코드 작업 없음)
- 후속 WO 모두 우선순위 낮음 — Tier 4 사이클 완료 후 별도 trigger 시
- W3 no-op closure 의 공식 문서화 — 미래 개발자 cognitive load 감소

---

## 14. 완료 보고 (commit 미실행)

| 항목 | 값 |
|------|------|
| 작성 문서 | `docs/investigations/IR-O4O-KCOSMETICS-OPERATOR-MENU-ADMIN-ENTRY-MIX-V1.md` |
| K-Cosmetics operator/admin menu 구조 요약 | UNIFIED_MENU 25 항목 모두 operator 성격 (adminOnly 사용 0). `/operator/*` = OperatorRoute + MembershipGate, `/admin/*` = ProtectedRoute(`cosmetics:admin`/`platform:super_admin`) + DashboardLayout role="admin". admin pages 2개 (KCosmeticsAdminDashboard + KCosmeticsAdminMembersPage). |
| admin entry mix 여부 | ❌ **없음** — UNIFIED_MENU 25 항목 모두 operator. `/admin/*` 별도 layout/route. |
| filterMenuByRole 적용 여부 | ✅ 호출 중 (`OperatorLayoutWrapper.tsx` line 29). adminOnly 0 사용으로 현재 no-op 이지만 인프라 준비됨. |
| 4개 서비스 비교 결과 | 모두 동일 인프라 (UnifiedMenuItem + filterMenuByRole + ProtectedRoute / OperatorRoute / MembershipGate). adminOnly 사용 빈도 차이: Neture 22 > KPA 3 > GlycoPharm 2 > **K-Cos 0** — admin 영역 크기 (K-Cos 2 pages vs Neture 다수) 의 자연스러운 차이. K-Cos drift 아님. |
| 권장 옵션 | **Option A** — 현재 구조 유지. W3 no-op closure 정합 confirm |
| 즉시 WO 필요 여부 | ❌ 즉시 진행 필요 없음. 본 IR 은 W3 no-op closure 공식화 + cross-service 비교 문서화. 후속 WO 후보 모두 우선순위 낮음. |
| 보류 항목 | (1) K-Cos adminOnly no-op documentation (주석 1줄), (2) operatorMenuGroups type 정의 유지, (3) Cross-service operator menu filtering standard 문서화 (별도 IR), (4) K-Cos admin pages 확장 시점에 inline adminOnly 도입 검토 — 모두 별도 작업 |
| 코드 / DB / migration / route / API / frontend / menu / dashboard / component 수정 | **없음** ✅ |
| 다른 세션 WIP 미포함 | ✅ Pre-check working tree 의 외부 세션 modified 1 파일 (`services/web-neture/src/components/layouts/OperatorLayoutWrapper.tsx`) 격리 보존 예정. 본 IR 은 문서 1개만 commit |
| Commit 여부 | **사용자 승인 대기** — 본 IR 문서 1개만 path-restricted commit 예정 |

---

> **상태**: 정책 결정 IR 완료. 권장 옵션 A (현재 구조 유지 + W3 no-op closure 정합 confirm). 즉시 코드 작업 없음. 4 서비스 menu filtering 인프라 정합 + adminOnly 사용 빈도 차이는 admin 영역 크기의 자연스러운 귀결. 본 IR commit 은 사용자 승인 후 path-restricted single commit 으로 진행 예정.
