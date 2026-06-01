# CHECK-O4O-NETURE-CONTEXTUAL-NAV-SUPPLIER-PARTNER-SMOKE-V1

**날짜**: 2026-06-01
**목적**: Neture supplier/partner contextual nav 변경 정적 검증 및 고정
**범위**: read-only 검증 (코드·DB·migration·source 수정 없음)

---

## 1. CHECK 개요

`WO-O4O-NETURE-CONTEXTUAL-NAV-SUPPLIER-PARTNER-INTEGRATION-V1`(commit `b167d3398`)에서 반영된 Neture supplier/partner contextual nav가 역할별 노출 조건·기존 route·header 소비 구조에 맞게 정상 연결되었는지 정적 코드 기준으로 검증한다.

**판정: PASS** ✅

navigation config에 추가된 supplier/partner 진입 항목이 기존 route·filterContextualNav 정책·header 소비 구조와 정합하며, 기존 nav/guard/route를 해치지 않는다. 신규 TypeScript 오류 없음.

---

## 2. 사전 git 상태

```
 M docs/investigations/CHECK-O4O-CURRENT-WORKSTREAM-NEXT-SCOPE-AUDIT-V1.md  ← 다른 세션 WIP (미접촉)
 M services/web-glycopharm/src/pages/operator/ForumRequestsPage.tsx        ← 다른 세션 WIP (미접촉)
 M services/web-k-cosmetics/src/pages/operator/ForumRequestsPage.tsx       ← 다른 세션 WIP (미접촉)
?? *.png (사용자 스크린샷)
```

staged 없음. 본 CHECK 문서 생성 외 소스 수정 없음. 다른 세션 WIP 미접촉.

---

## 3. 검증 대상 commit / 작업

| 작업 | commit |
|------|--------|
| Neture supplier/partner contextual nav 통합 | `b167d3398` |

---

## 4. Neture navigation config 확인

**파일**: `services/web-neture/src/config/navigation.ts`

| 항목 | 상태 |
|------|:----:|
| `NETURE_PUBLIC_NAV` = Home / 이용 안내 / Contact Us | ✅ 유지 (변경 없음) |
| `NETURE_CONTEXTUAL_NAV` supplier/partner 항목 추가 | ✅ |
| `NetureContextualNavItem` 타입 (visibleWhen) | ✅ 기존 유지 |
| `filterContextualNav` 헬퍼 | ✅ 기존 유지 |

---

## 5. supplier/partner contextual nav 항목 확인

| 라벨 | href | visibleWhen | route 존재 |
|------|------|:-----------:|:---------:|
| 공급자 대시보드 | `/supplier/dashboard` | `supplier` | ✅ `App.tsx:716` → `SupplierDashboardPage` |
| 파트너 대시보드 | `/partner/dashboard` | `partner` | ✅ `App.tsx:785` → `PartnerHubDashboardPage` |

**route 정합 확인**:
- `/supplier/dashboard` (716): `<SupplierRoute><SupplierSpaceLayout/></SupplierRoute>` 가드 내부에서 `SupplierDashboardPage` 렌더 — supplier 사용자 대상 정상.
- `/partner/dashboard` (785): partner 워크스페이스 내부 `PartnerHubDashboardPage` 렌더 — 정상.
- **참고**: `App.tsx:1060`에 legacy `/supplier/dashboard → /supplier` redirect가 fallback으로 공존하나, 문서 순서상 가드 렌더 route(716)가 먼저 매치됨. 이는 이번 WO가 변경하지 않은 **기존 route 구조**.

---

## 6. 역할별 노출 조건 확인

`filterContextualNav` (navigation.ts) + `NetureGlobalHeader` role 판정 기준:

| 역할 | 노출 메뉴 | 근거 |
|------|---------|------|
| supplier | 공급자 대시보드 | `visibleWhen==='supplier'` && `isSupplier` |
| partner | 파트너 대시보드 | `visibleWhen==='partner'` && `isPartner` |
| operator/admin | 공급자 대시보드 + 파트너 대시보드 (전체) | `isAdminOrOperator` → 모든 항목 노출 (기존 `WO-O4O-COMMON-MENU-VISIBILITY-POLICY-IMPL-V1` 정책) |
| 비로그인/일반 | (contextual nav 없음) | `isAuthenticated` false → isSupplier/isPartner false → 필터링 0건 |

- operator/admin이 두 항목을 모두 보는 것은 **기존 filterContextualNav 정책** (이번 변경이 새로 만든 동작 아님).
- 클릭 시 접근 권한은 route 측 `SupplierRoute`/partner 가드가 관장 — nav는 진입 링크만 제공.

---

## 7. Header 소비 구조 확인

**파일**: `services/web-neture/src/components/NetureGlobalHeader.tsx`

| 항목 | 상태 |
|------|:----:|
| `NETURE_CONTEXTUAL_NAV` import | ✅ (L31) |
| `filterContextualNav` import | ✅ (L32) |
| role 판정 (isAdmin/isOperator/isSupplier/isPartner) | ✅ (L74-77, 역할 상수 배열 사용) |
| `filterContextualNav(NETURE_CONTEXTUAL_NAV, {...})` 호출 | ✅ (L80) |
| `<GlobalHeader contextualNav={contextualNav} publicNav={NETURE_PUBLIC_NAV} />` | ✅ (L103-104) |

**확인**: navigation config 배열을 채우는 것만으로 header에 자동 반영되는 구조. 별도 header 코드 수정 불필요 (이번 WO가 navigation.ts 단일 파일만 변경한 이유).

역할 상수: `ADMIN_ROLES` / `OPERATOR_OR_ABOVE_ROLES` / `SUPPLIER_ONLY_ROLES` / `PARTNER_ONLY_ROLES` 모두 import 확인.

---

## 8. 기존 route/guard/신청 흐름 보존 확인

| 항목 | 상태 |
|------|:----:|
| operator/admin route | ✅ 무변경 |
| supplier/partner dashboard route | ✅ 무변경 (기존 716/785 그대로 사용) |
| supplier/partner 신청·승인 흐름 | ✅ 무변경 |
| Market Trial / guide / mypage nav | ✅ 무변경 |
| public nav (Home/이용 안내/Contact Us) | ✅ 무변경 |
| 로그인/권한/guard 구조 | ✅ 무변경 |

navigation.ts 단일 파일, 배열 콘텐츠만 추가. route/guard/component 미변경.

---

## 9. Neture 조직 중심 구조 보존 확인

| 항목 | 상태 |
|------|:----:|
| store owner 구조 추가 | ✅ 없음 |
| 매장 허브(Store Hub) 구조 추가 | ✅ 없음 |
| 내 매장(My Store) 구조 추가 | ✅ 없음 |
| supplier/partner 조직 중심 워크스페이스 유지 | ✅ |
| 다른 서비스(KPA/GP/KCOS) 파일 수정 | ✅ 없음 |

Neture는 공급자·파트너 조직 중심 구조 유지. KPA/GP/KCOS의 store owner IA를 Neture에 강제하지 않음.

---

## 10. TypeScript 검증 결과

| 서비스 | 검사 방법 | 결과 |
|--------|---------|:----:|
| web-neture | `tsc --noEmit` | **0 errors** ✅ |

navigation config 타입(`NetureContextualNavItem`, `visibleWhen` 리터럴 유니온) 정합. 신규 오류 없음.

---

## 11. 최종 판정

**PASS** ✅

| 기준 | 결과 |
|------|:----:|
| NETURE_PUBLIC_NAV 유지 | ✅ |
| supplier/partner contextual nav 항목 추가 | ✅ |
| href ↔ 실제 route 정합 (716/785) | ✅ |
| 역할별 노출 조건 (filterContextualNav 정책) | ✅ |
| Header 소비 구조 (config→header 자동 반영) | ✅ |
| 기존 route/guard/신청 흐름 보존 | ✅ |
| Neture 조직 중심 구조 보존 (store owner 미적용) | ✅ |
| 다른 서비스 영향 없음 | ✅ |
| 신규 TypeScript 오류 없음 | ✅ |

브라우저 확인 미실행 (로컬 dev 서버 미구동) — 정적 코드 기준 config→filter→header 소비 체인이 완결되어 있어 배열 콘텐츠 추가만으로 동작하는 구조 확인. **CONDITIONAL 요소(브라우저 미실행)는 있으나 정적 연결이 완전하여 PASS**.

---

## 12. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| **Neture를 store owner 구조로 강제하지 않음** | store owner / 매장 허브 / 내 매장 구조 미추가. supplier/partner 대시보드 진입만 보강. | ✅ |
| **supplier/partner 조직 중심 워크스페이스 유지** | 기존 `/supplier/dashboard`, `/partner/dashboard` 워크스페이스 route 그대로 활용. 새 구조 도입 없음. | ✅ |
| **operator/admin 책임 경계 유지** | operator/admin은 filterContextualNav 정책상 전체 진입 가능(기존 정책). admin/operator route·guard 무변경. | ✅ |
| **contextual nav 추가 = 진입성 향상** | supplier/partner 사용자가 상단 nav에서 워크스페이스로 직접 진입 — 기존엔 guide 허브 경유만 가능했던 진입 경로 보강. | ✅ |
| **운영 경험 공통화 vs Neture 도메인 특수성** | 공통 `GlobalHeader` + `filterContextualNav` 인프라(타 서비스와 동일 패턴)를 사용하되, 메뉴 내용은 Neture 도메인(공급자/파트너)에 맞춤. 인프라 공통·콘텐츠 도메인별 — 충돌 없음. | ✅ |

**결론**: Neture supplier/partner contextual nav 보강은 "Neture를 다른 서비스처럼 만들기"가 아니라 Neture 내부에서 supplier/partner 사용자의 워크스페이스 진입 경로를 명확히 한 작업이다. 조직 중심 구조·operator/admin 경계·기존 route/guard 모두 보존. 공통 nav 인프라를 도메인 콘텐츠로 채운 것이므로 운영 경험 공통화 원칙과 Neture 특수성이 충돌하지 않는다.

---

## 부록 — 확인한 주요 파일

| 경로 | 내용 |
|------|------|
| `services/web-neture/src/config/navigation.ts` | NETURE_CONTEXTUAL_NAV supplier/partner 항목 |
| `services/web-neture/src/components/NetureGlobalHeader.tsx` | filterContextualNav 소비 + role 판정 |
| `services/web-neture/src/App.tsx` (716, 785, 1060) | supplier/partner dashboard route + legacy redirect |

---

*검증 수행: Claude Code (2026-06-01)*
*read-only — 코드/DB/source/migration 수정 없음. 다른 세션 WIP 미접촉.*
