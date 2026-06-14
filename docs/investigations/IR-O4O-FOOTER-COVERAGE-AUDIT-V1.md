# IR-O4O-FOOTER-COVERAGE-AUDIT-V1

> **유형:** Read-only 조사 (코드/frontend/backend/API/DB/route 변경 없음, 문서 1개만 생성)
> **목적:** 4서비스에서 Footer가 **기본 포함되어야 하는 사용자-facing 화면**과 **명시적으로 제외하는 내부 업무 화면**을 분리하고, 실제 coverage 누락 구간을 찾는다. "모든 페이지에 무조건 Footer"가 아니라 **포함 대상군 / 예외군 정의 + 누락 route 식별**이 목적이다.
> **작성일:** 2026-06-14
> **선행:** [IR-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION](IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md) · [WO-LINK-GUARD](../work-orders/WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1.md) · [WO-LEGAL-GUARD](../work-orders/WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1.md) · [WO-LEGAL-LOADER-CONSOLIDATION](../work-orders/WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1.md) · [CHECK-STANDARDIZATION-MILESTONE](../checks/CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1.md)

---

## 0. 핵심 결론 (Executive Summary)

| 질문 | 답 |
|------|-----|
| 법정정보/링크/loader 위험은? | **이미 닫힘.** 공통 `PublicLegalFooterInfo` + `service_legal_profiles` + 공통 loader factory. 본 IR 범위 아님. |
| 그럼 남은 문제는? | **Footer coverage** — Footer가 필요한 사용자-facing 화면 일부가 layout 구조 때문에 footer 없는 상태. |
| 가장 큰 누락은? | **store-facing 화면.** ① store-hub: GP·KCos는 top-level hub layout이라 footer 없음(KPA는 공개 Layout 중첩이라 있음 — 서비스별 불일치). ② 내 매장/내 약국 owner dashboard: 3서비스 공통 `StoreDashboardLayout`(@o4o/store-ui-core)에 footer 없음(공통 1곳). ③ KPA 공개 storefront `/store/:slug` bare(footer 없음), GP 공개 storefront는 custom inline footer(공통 legal block 미사용). |
| Neture는? | **store-facing 대상 아님**(내 매장 기능 없음). 공개 route 전부 coverage OK. supplier/partner account dashboard만 미세 누락. |
| 어떻게 고쳐야 하나? | **layout 단위 coverage 보장.** page별 `<Footer/>` 패치 금지. 공통 `StoreDashboardLayout`은 F3 Freeze 대상이라 WO 필요. store-facing은 **compact footer**(법정/약관/개인정보/문의/copyright)가 적합. |
| 결론 방향 | **store-facing = Footer 포함 기본(compact 가능), admin/operator/supplier workspace = 명시적 제외.** 적용은 layout 단위. |

**핵심:** Footer 정비의 마지막 남은 조각은 "어디에 붙일까"가 아니라 **"사용자-facing인데 footer 없는 layout이 어디인가"** 이며, 그 답은 ①per-service store-hub layout(GP/KCos) ②공통 store owner dashboard layout ③KPA 공개 storefront 세 군데로 수렴한다.

---

## 1. 이미 닫힌 영역 (본 IR 범위 밖)

[CHECK-STANDARDIZATION-MILESTONE](../checks/CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1.md) 기준선:
- Footer legal block = 공통 `PublicLegalFooterInfo` (값 없으면 렌더 0)
- 법정정보 실값 = `service_legal_profiles` 단독
- 공개 화면 사업자 법정정보 = Footer 단독
- dead link 정리 완료 · loader factory(`createFooterLegalLoader`) 공통화 완료
- 전면 FooterCore 비권장, GP/KCos 한정 FooterCore 선택 과제

> 본 IR은 위 "footer 컴포넌트 품질"이 아니라 **"footer가 화면에 붙어 있는가(coverage)"** 만 본다.

## 2. 판단 기준 (Coverage Policy)

### 2.1 Footer 기본 포함 대상 (사용자-facing)
| 화면군 | Footer | 비고 |
|--------|:---:|------|
| 공개 Home / Guide·서비스안내 / Contact / Terms·Privacy·Policy | 필요 (Full) | 공개 신뢰·법정·문의 |
| 공개 블로그 / 공개 매장(storefront) 페이지 | 필요 (Full) | 외부 방문 가능 |
| 404 public | 필요 권장 | 이탈 방지 |
| 매장 HUB (store-hub) | 필요 (Compact 가능) | 매장 경영자 사용자 화면 |
| 내 매장 / 내 약국 (owner dashboard) | 필요 (Compact 가능) | admin 아닌 서비스 사용자 화면 |
| 매장 상품/주문/자료실/이벤트오퍼 | 필요 (Compact 가능) | 서비스 사용자 신뢰/문의 접근 |

### 2.2 Footer 제외 가능 대상 (내부 업무 / 몰입형)
| 화면군 | 제외 | 비고 |
|--------|:---:|------|
| Admin dashboard | 제외 가능 | 내부 관리 shell |
| Operator dashboard | 제외 가능 | 내부 운영 shell |
| Supplier / Partner workspace | 제외 가능 | 업무 앱 성격 |
| Login / Register / Auth recovery | 선택 | standalone auth |
| Fullscreen editor / signage player / tablet kiosk | 제외 가능 | 몰입형 UI |
| Checkout / payment processing | 선택 | 집중 화면 |

### 2.3 핵심 원칙
```txt
사용자-facing public/store-facing 화면은 Footer 포함이 기본이다.
Admin/Operator/Supplier/Auth/Fullscreen 화면은 명시적 예외로 둔다.
Footer는 page마다 직접 붙이지 않고 layout 단위에서 보장한다.
```

---

## 3. 서비스별 조사 결과 (route → layout → footer)

> 조사 근거: 각 서비스 `App.tsx` route 정의 + `*Layout*.tsx` footer 렌더 확인 (read-only).

### 3.1 GlycoPharm
| 화면군 | route | layout | footer | 판단 |
|--------|------|--------|:---:|------|
| 공개 | `/`,`/forum/*`,`/lms/*`,`/contact`,`/terms`,`/privacy`,`/service-guide`,`/business/*`,`/guide/*` | `MainLayout`(`<Footer/>` @ L22) | ✅ | OK |
| MyPage | `/mypage/*` | `MainLayout` | ✅ | OK |
| **매장 HUB** | `/store-hub`,`/store-hub/*`(9) | **`GlycoPharmHubLayout`** | ❌ | **Type A 누락** |
| **내 약국 dashboard** | `/store`,`/store/*` | **`StoreLayoutWrapper`→`StoreDashboardLayout`** | ❌ | **Type A 누락(공통)** |
| 공개 storefront | `/store/:pharmacyId`,`/products`,`/cart` | `StoreLayout` | ⚠️ custom inline(L262-292) | **Type B — `PublicLegalFooterInfo` 미사용** |
| 공개 storefront blog | `/store/:slug/blog*` | (bare) | ❌ | **Type C 누락** |
| Kiosk/Tablet | `/store/:id/kiosk/*`,`/tablet/*` | `KioskLayout`/`TabletLayout` | custom mini | Type D(몰입형, 의도) |
| admin/operator/service | `/admin/*`,`/operator/*`,`/service/*` | `DashboardLayout`/`OperatorAreaShell` | ❌ | Type D(의도 예외) |
| auth | `/login`,`/forgot-password`,`/reset-password`,`/auth/verify-email` | bare | ❌ | 선택(예외) |
| 404 | `/*` | bare | ❌ | Type C(권장) |

### 3.2 K-Cosmetics
| 화면군 | route | layout | footer | 판단 |
|--------|------|--------|:---:|------|
| 공개 | `/`,`/service-guide`,`/contact`,`/terms`,`/privacy`,`/forum/*`,`/lms/*`,`/guide/*`,`/library/content*` | `MainLayout`(`<Footer/>` @ L20) | ✅ | OK |
| MyPage | `/mypage/*` | `MainLayout` | ✅ | OK |
| 공개 storefront blog | `/store/:slug/blog*` | `MainLayout` | ✅ | OK |
| **매장 HUB** | `/store-hub`,`/store-hub/*`(9) | **`KCosmeticsHubLayout`** | ❌ | **Type A 누락** |
| **내 매장 dashboard** | `/store/*`(30+) | **`StoreDashboardLayout`** | ❌ | **Type A 누락(공통)** |
| operator/admin | `/operator/*`,`/admin/*` | `OperatorAreaShell`/`DashboardLayout` | ❌ | Type D(의도 예외) |
| signage play / tablet | `/store/.../signage/play/:id`,`/tablet/:slug` | bare | ❌ | Type D(몰입형) |
| auth | `/login`,`/forgot-password`,`/reset-password`,`/auth/verify-email` | `MainLayout`(login은 footer 有)/bare | 부분 | 선택 |
| 404 | `/*` | bare | ❌ | Type C(권장) |

### 3.3 KPA Society
| 화면군 | route | layout | footer | 판단 |
|--------|------|--------|:---:|------|
| 공개 커뮤니티 | `/`,`/forum/*`,`/guide/*`,`/lms/*`,`/resources/*`,`/content/*`,`/events`,`/surveys/*` | `Layout`(`<Footer/>` @ L34) | ✅ | OK |
| 서비스안내/정책 | `/services/*`,`/about`,`/contact`,`/service-guide` / `/policy`,`/privacy` | `InfoPageLayout`(PlatformFooter)/`Layout` | ✅ | OK (※ `/policy`는 의도된 약관 route — §5) |
| MyPage / Instructor | `/mypage/*`,`/instructor/*` | `Layout`/`InstructorLayout`(`<Footer/>`) | ✅ | OK |
| **매장 HUB** | `/store-hub`,`/store-hub/*`(9) | `PharmacyHubLayout` **(공개 `Layout` 중첩)** | ✅ 상속 | **OK — 단 GP/KCos와 구조 불일치(§6)** |
| **내 약국 dashboard** | `/store`,`/store/*` | **`KpaStoreLayoutWrapper`→`StoreDashboardLayout`** | ❌ | **Type A 누락(공통)** |
| **공개 storefront** | `/store/:slug`,`/products/:id`,`/checkout`,`/payment/*` | **bare(layout 없음)** | ❌ | **Type C 누락** |
| 공개 storefront blog | `/store/:slug/blog*` | `Layout` | ✅ | OK |
| operator/admin | `/operator/*`,`/admin/*` | `OperatorAreaShell`/`AdminLayout` | ❌ | Type D(의도 예외) |
| signage fullscreen / tablet | `/signage/play/*`,`/tablet/:slug` | bare | ❌ | Type D(몰입형) |
| 공개 임베드 | `/view/:id`,`/qr/:slug`,`/certificate/verify/*`,`/public/signage` | bare | ❌ | 예외(임베드/유틸) |
| auth recovery | `/handoff`,`/forgot-password`,`/reset-password`,`/auth/verify-email` | bare | ❌ | 선택 |
| 404 | `/*` | bare | ❌ | Type C(권장) |

### 3.4 Neture
| 화면군 | route | layout | footer | 판단 |
|--------|------|--------|:---:|------|
| 공개 | `/`,`/guide/*`,`/forum*`,`/notices*`,`/content*`,`/market-trial*`,`/contact`,`/terms`,`/privacy`,`/mypage/*` | `NetureLayout`(임베드 footer @ L27-45) | ✅ | OK |
| 공개 store/seller | `/store/*`,`/seller/*`,`/partner/overview-info` | `MainLayout`(임베드 footer) | ✅ | OK |
| supplier/partner public entry | `/supplier`,`/partner` | `NetureLayout` | ✅ | OK |
| supplier/partner workspace | `/supplier/*`,`/partner/*`,`/workspace/*` | `SupplierSpaceLayout`/`PartnerSpaceLayout`/`SupplierOpsLayout`(임베드 footer) | ✅ | OK(업무 앱이나 footer 有) |
| **supplier/partner account** | `/account/supplier/*`(6),`/account/partner/*`(4) | **`SupplierAccountLayout`/`PartnerAccountLayout`** | ❌ | **Type A 미세 누락(§7)** |
| admin/operator | `/admin/*`,`/operator/*` | `AdminLayoutWrapper`/`OperatorLayoutWrapper`(OperatorAreaShell) | ❌ | Type D(의도 예외, WO 명문화됨) |
| admin-vault | `/admin-vault/*` | `AdminVaultLayout`(임베드 footer) | ✅ | OK |
| auth/utility | `/login`,`/register`,`/forgot-password`,`/reset-password`,`/auth/verify-email`,`/handoff`,`/qr/:slug` | modal/bare | ❌ | 선택(예외) |

> **확인:** Neture standalone `components/Footer.tsx` 삭제 완료(import 0, 파일 없음) — loader-consolidation 결과 유지.
> **Neture는 내 매장 기능 없음** → store-facing footer coverage 대상 아님.

---

## 4. Coverage Matrix (사용자-facing 핵심)

| 서비스 | 화면군 | user-facing | 현재 footer | 판단 | 조치 |
|--------|--------|:---:|:---:|------|------|
| GlycoPharm | public home/guide/contact/legal | Y | ✅ | 포함 | — |
| GlycoPharm | **store hub** | Y | ❌ | 포함 필요 | **A** |
| GlycoPharm | **내 약국 dashboard** | Y | ❌ | 포함 필요 | **A(공통)** |
| GlycoPharm | 공개 storefront | Y | ⚠️ custom | legal block 정렬 | **B** |
| K-Cosmetics | public home/guide/contact/legal | Y | ✅ | 포함 | — |
| K-Cosmetics | **store hub** | Y | ❌ | 포함 필요 | **A** |
| K-Cosmetics | **내 매장 dashboard** | Y | ❌ | 포함 필요 | **A(공통)** |
| KPA Society | public/community | Y | ✅ | 포함 | — |
| KPA Society | store hub | Y | ✅(상속) | 포함(구조 불일치) | 정렬 |
| KPA Society | **내 약국 dashboard** | Y | ❌ | 포함 필요 | **A(공통)** |
| KPA Society | **공개 storefront** | Y | ❌ | 포함 필요 | **C** |
| Neture | public guide/contact/legal | Y | ✅ | 포함 | — |
| Neture | supplier/partner account | 업무/계정 | ❌ | 결정 필요 | A(미세) |
| Neture | supplier workspace | N(업무) | ✅ | 제외 가능했음 | — |
| 4서비스 | admin/operator | N(내부) | ❌ | 제외 | D |
| 4서비스 | auth recovery | 선택 | ❌ | 예외 | D/선택 |
| 4서비스 | signage/tablet fullscreen | N(몰입) | ❌ | 제외 | D |

---

## 5. 누락 유형 분류 (Type A~E)

### Type A — Layout 자체에 Footer 없음 (핵심)
| 대상 | 서비스 | layout | 비고 |
|------|--------|--------|------|
| store-hub | GP, KCos | `GlycoPharmHubLayout`, `KCosmeticsHubLayout` | per-service. KPA는 공개 Layout 중첩이라 해당 없음 |
| **내 매장/약국 dashboard** | GP, KCos, KPA | **공통 `StoreDashboardLayout`(@o4o/store-ui-core)** | **1곳 수정으로 3서비스 동시 해결. 단 F3 Store Layer Freeze → WO 필요** |
| account dashboard | Neture | `SupplierAccountLayout`,`PartnerAccountLayout` | 미세, 업무 계정 — 포함/제외 결정 |
> 권장: **layout에 (compact) Footer 추가.** page 수정 최소.

### Type B — 같은 화면군 layout 혼재 / legal block 미정렬
| 대상 | 내용 |
|------|------|
| GP 공개 storefront | `StoreLayout` custom inline footer가 공통 `PublicLegalFooterInfo` 미사용 → 공개 매장 페이지 법정정보 표기가 footer 표준과 분리됨 |
| store-hub 구조 불일치 | KPA는 공개 Layout 중첩(footer 상속), GP/KCos는 top-level hub layout(footer 없음) → **같은 store-hub인데 서비스별 결과 다름** |
> 권장: route wrapper/layout 정렬. 공개 storefront footer는 공통 legal block으로 수렴.

### Type C — page 단위(layout 없음) Footer 누락
| 대상 | 내용 |
|------|------|
| KPA 공개 storefront | `/store/:slug`,`/products/:id`,`/checkout`,`/payment/*` bare 렌더 |
| GP storefront blog | `/store/:slug/blog*` bare |
| 404 (4서비스) | catch-all footer 없음(권장 수준) |
> 권장: 가능하면 layout으로 이동. 임시 page-level patch 최소화.

### Type D — 의도된 no-footer 예외 (수정 안 함, 문서 고정)
admin dashboard / operator dashboard / supplier·partner workspace(Neture는 footer 有이나 제외 가능) / signage fullscreen player / tablet kiosk / fullscreen editor.

### Type E — sticky / height 문제 (본 IR 미검증)
짧은 페이지에서 footer가 화면 하단에 안정 배치되는지(`min-h-screen flex-col` + `main flex-1`)는 **정적 코드 조사로 확정 불가** → 후속에서 시각 확인 필요(브라우저 점유 해제 시). 현 시점 미확인 항목으로 기록.

---

## 6. store-hub 구조 불일치 (서비스 정렬 포인트)

| 서비스 | store-hub layout | 공개 Layout 중첩? | footer |
|--------|------------------|:---:|:---:|
| GlycoPharm | `GlycoPharmHubLayout` | ❌ top-level | ❌ |
| K-Cosmetics | `KCosmeticsHubLayout` | ❌ top-level | ❌ |
| KPA Society | `PharmacyHubLayout` | ✅ (공개 `Layout` 안) | ✅ 상속 |

> KPA 패턴(공개 layout 중첩으로 footer 상속)이 "layout 단위 보장" 원칙에 부합. GP/KCos hub layout에 (compact) footer를 직접 추가하거나, 동일하게 공개 layout 중첩 구조로 정렬하는 두 방향 중 택일. **page-level 추가는 비권장.**

## 7. Neture account dashboard 결정 포인트
`SupplierAccountLayout`/`PartnerAccountLayout`(10 route)는 footer 없음. supplier/partner **workspace**는 footer가 있으므로(동일 사업자 영역) account dashboard만 빠진 것은 **일관성 누락**에 가깝다. 단 Neture는 store-facing 대상이 아니고 계정 화면은 업무 성격 → **포함(workspace와 일관) / 제외(내부 계정) 중 사업 판단 필요.** 본 IR은 "결정 항목"으로만 남기고 강제하지 않는다.

---

## 8. Compact Footer 검토 (구현 아님)

| Full Footer 적합 | Compact Footer 적합 |
|------------------|---------------------|
| public home / guide / contact / terms·privacy·policy / 공개 blog·storefront | store hub / 내 매장·내 약국 / product·order·library·event-offer / community user page |

Compact footer도 아래는 유지: **법정정보 접근 · 약관 링크 · 개인정보처리방침 링크 · Contact 링크 · copyright.**
> store-facing 화면에 전체 공개 footer(brand 장문·다컬럼)는 과할 수 있어, store 영역은 compact 변형이 적합. 구현은 후속 WO.

---

## 9. 후속 WO 권고 (우선순위)

| 우선 | WO 후보 | 대상 | 범위 | 비고 |
|:---:|--------|------|------|------|
| **1** | `WO-O4O-STORE-FACING-FOOTER-COVERAGE-V1` | GP·KCos·KPA | **내 매장/약국 dashboard(공통 `StoreDashboardLayout`) + GP/KCos store-hub layout**에 footer coverage 보장. layout 단위. admin/operator 제외. Neture 제외 | **F3 Store Layer Freeze → 명시적 WO 필수.** 공통 layout 1곳이 3서비스 동시 영향 → Shared Module Change Protocol 적용(전 소비처 확인) |
| **2** | `WO-O4O-STORE-FACING-COMPACT-FOOTER-V1` | store-facing | Full 대신 compact footer 변형 도입(법정/약관/개인정보/문의/copyright 유지) | #1과 묶어 진행 가능 |
| 3 | `WO-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1` | 4서비스 공개 | KPA 공개 storefront `/store/:slug*` + GP storefront blog + GP `StoreLayout` custom footer→공통 legal block 정렬 + 404 | 공개 매장/법정 표기 일관성 |
| 4 | `WO-O4O-FOOTER-LAYOUT-STICKY-BASELINE-V1` | sticky 의심 layout | `min-h-screen flex-col` + `main flex-1` + footer bottom 배치 | **조건부** — §5 Type E 시각 확인 후 착수 |

> 착수 순서: 1(store dashboard+hub) → 2(compact, 1과 결합) → 3(공개 storefront/404) → (조건부) 4(sticky). **Neture는 #3에서 public만 확인, store-facing 대상 아님.**

## 10. 적용 원칙 (후속 WO 공통 제약)
1. **layout 단위 coverage 보장** — page마다 `<Footer/>` 직접 추가 금지(불가피 시 최소·임시 명시).
2. **공통 `StoreDashboardLayout` 수정은 Shared Module Change Protocol** — KPA/GP/KCos(+ 잠재 소비처) 전부 영향 확인. 단일 서비스 기준 완료 판단 금지. F3 Freeze WO 필요.
3. **공개 매장/storefront 법정정보는 공통 `PublicLegalFooterInfo`로 수렴**(custom inline footer 신규 금지).
4. **admin/operator/supplier workspace/auth/fullscreen은 제외 고정** — 본 IR §5 Type D를 기준선으로.
5. **KPA `/policy`는 의도된 약관 route 차이** — drift 아님, 변경 대상 아님.
6. **Neture 내 매장 없음** — store-facing WO 대상에서 제외.

## 11. 회귀 위험
- 공통 `StoreDashboardLayout` footer 추가 시 **3서비스 store dashboard 동시 변경** → 레이아웃 높이/스크롤 영향 전수 확인 필요.
- store-hub를 KPA식 공개 layout 중첩으로 정렬할 경우 GP/KCos route wrapper 재배치 → guard/sidebar 누락 주의.
- 공개 storefront에 공통 legal block 도입 시 `service_legal_profiles` 미설정이면 렌더 0(정상) — placeholder 재등장 금지 원칙 유지.
- sticky 정리(#4)는 기존 화면 높이 가정 변경 가능 → 시각 확인 후 진행.

## 12. 검증 (이 IR 자체)
- [x] 문서 1개만 생성 (코드/frontend/backend/API/DB/route 변경 0, read-only)
- [x] 4서비스 route/layout/Footer 사용처 조사 (§3)
- [x] Footer 포함 대상 / 제외 대상 명확 (§2)
- [x] store-facing 화면 별도 분류 (§3·§4·§6)
- [x] Admin/Operator/Supplier/Auth/fullscreen 예외 명시 (§2.2·§5 Type D)
- [x] 누락 route 서비스별 정리 (§3·§4)
- [x] 누락 유형 Type A~E 분류 (§5)
- [x] 후속 WO 우선순위 (§9)
- [x] layout 단위 수정 원칙 / page patch 제한 (§10)
- [x] compact footer 필요 여부 (§8)
- [x] Neture 내 매장 없음 반영 (§3.4·§10)
- [x] KPA `/policy` 의도된 차이 유지 (§3.3·§10)
- [x] 회귀 위험 (§11)

---

*End of IR-O4O-FOOTER-COVERAGE-AUDIT-V1*
