# CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FINAL-CLOSURE-AUDIT-V1

- **WO**: [`WO-O4O-CROSSSERVICE-HEADER-FOOTER-FINAL-CLOSURE-AUDIT-V1`](../work-orders/WO-O4O-CROSSSERVICE-HEADER-FOOTER-FINAL-CLOSURE-AUDIT-V1.md)
- **실행일**: 2026-08-21
- **성격**: Header / Footer / Mobile Bottom Nav / Shell 공통화 트랙 **최종 종료 감사** (W5 Public Footer config 정렬 흡수)
- **최종 판정**: **CLOSE** — `HEADER_FOOTER_COMMONIZATION = CLOSED` · `PRODUCTION_ADOPTION = PASS` · `MUST_FIX_BEFORE_CLOSE = 0`
- **production adoption 재검증**: 2026-08-21 2차 (18-6절) — `WO-O4O-CROSSSERVICE-HEADER-FOOTER-PRODUCTION-ADOPTION-FINAL-VERIFICATION-V1`

> WO 본문 뒤 「부기 A~K」는 실행 시점 측정값이며 지시가 아니다. 본 CHECK 의 모든 수치·판정은 §2 대로
> **현재 main 코드와 프로덕션에서 다시 산출**했다. 부기와 다른 항목은 그때마다 명시했다.

---

## 1. 현재 main 기준점 (§28-1)

| 항목 | 값 |
|---|---|
| 작업 기준 커밋 | `c3e99f85c` (감사 수행 시점 `origin/main`) |
| 감사 종료 시점 `origin/main` | `647868d5e` (감사 중 9 커밋 진행) |
| 두 커밋 사이 Header/Footer/Layout/Shell/Nav 파일 변경 | **2건** — `web-pharmacy-hub/src/config/navigation.ts` · `web-pharmacy-hub/src/pages/account/navItems.ts` (`WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1`). 해당 변경분을 반영해 5·9절을 재확인했고 **판정은 변하지 않는다** |

상류 변경 재확인:

- `PH_PUBLIC_NAV` 의 '교육' 항목에 `children` 3개(`/education`·`/account/enrollments`·`/account/certificates`) 추가 → `children` 보유 항목 2 → **3**.
- `PH_FOOTER_SECTIONS` '서비스' 섹션에 `/account/enrollments`·`/account/certificates` 추가 → 4 섹션 / 11 → **13 링크**.
- 세 route 모두 `App.tsx:237-239` 에 등재돼 있다 → **dead link 신설 0**.
| 작업 트리 | 감사 시작 시 clean (부기 A 의 "다른 세션 WIP 33건"은 현재 재현되지 않음 — §2 대로 과거 스냅샷을 신뢰하지 않았다) |

부기 A 는 `HEAD == origin/main == eb7d814f0` 을 적었으나 실제 기준은 위와 같다. **코드가 정답**이라는 원칙대로 처리했다.

---

## 2. 최종 모집단 (§5 · §28-2)

`services/web-{kpa-society,k-cosmetics,glycopharm,pharmacy-hub,neture}` + 이들이 소비하는 `packages/**` 의
Header · Footer · Layout · Shell · Nav 자산 전수.

| 영역 | 모집단 |
|---|---:|
| 공통 패키지 | 23 |
| KPA-Society | 18 |
| K-Cosmetics | 8 |
| GlycoPharm | 12 |
| Pharmacy-Hub | 8 |
| Neture | 13 |
| **합계** | **82** |

모든 항목에 `ACTIVE` / `DEAD` / `DELETED_SINCE_CENSUS` / `NEW_SINCE_CENSUS` 라벨을 부여했다 (아래 3절).
ACTIVE = 77 · DEAD(코드 소비 0) = 5 · DELETED_SINCE_CENSUS = 2(모집단에서 제외) · NEW_SINCE_CENSUS = 2(모집단에 포함).

---

## 3. 과거 census 대비 삭제 / 신규 항목 (§28-3)

기준: [`CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1`](CHECK-O4O-CROSSSERVICE-HEADER-FOOTER-FULL-CENSUS-AND-COMMONIZATION-PLAN-V1.md) (82 항목).

### DELETED_SINCE_CENSUS (2) — 모집단에서 빠짐

| census # | 파일 | 확인 |
|---|---|---|
| H7 | `web-pharmacy-hub/src/layouts/SupplierShell.tsx` | 파일 없음 |
| H9 | `web-pharmacy-hub/src/components/supplier/SupplierHeader.tsx` | `components/supplier/` 디렉터리 자체가 없음 |

(`WO-O4O-PHARMACYHUB-SERVICE-MODEL-REALIGNMENT-AND-SUPPLIER-ROLE-REMOVAL-V1` 에서 제거. PharmacyHub 는 supplier 역할이 없다.)

### NEW_SINCE_CENSUS (2) — 모집단에 추가

| # | 파일 | 사유 |
|---|---|---|
| P23 | `packages/account-ui/src/mobile-nav/**` (6 파일: `MobileBottomNav` / `MobileBottomNavShell` / `MobileBottomNavTab` / `MobileBottomNavProfileSheet` / `useMobileBottomNavSheet` / `mobileBottomNavStyles`) | W3(`4e883b970`) 로 신설된 Mobile Bottom Nav Core. census 표에 없다 |
| N13 | `web-neture/src/components/layouts/OperatorLayoutWrapper.tsx` | `App.tsx:1178` 에 mount 된 ACTIVE 셸인데 census A-6 에서 **누락**됐다 (최종 변경 `adcd988a5`, 2026-08-11 — census 이전 파일이므로 실제로는 census 누락 보정) |

### DEAD (5) — 모집단에 남기고 `DEAD_OR_UNUSED` 로 분류

`K17 StoreUserDropdown`(파일 존재, 코드 소비 0) · `P3 AGHeader` · `P4 AGAppLayout` · `P21 AccountPageLayout` · `P22 operator-core/OperatorLayout`.

---

## 4. 6종 최종 분류 (§6 · §28-4)

판정에 사용한 기준(오탐 방지 근거를 함께 남긴다):

- **CORE_ONLY** — 공통 Core/계약을 실제로 소비하고 서비스 고유값(메뉴·색·route·역할)만 주입하는 얇은 bridge.
- **VIEW_DUPLICATED** — 채택 가능한 공통 구현이 있는데도 **같은 UI 를 복제**해 유지하는 것.
- **SERVICE_SPECIFIC** — 주체·용도가 달라 공통 구현으로 대체하면 의미가 훼손되는 것.

### 4-1. census VD 15건의 현재 판정

| census # | 대상 | 현재 판정 | 근거 |
|---|---|---|---|
| K14 · C7 · G11 · N11 | 4서비스 MobileBottomNav | **VD → CORE_ONLY** | 4파일 모두 `@o4o/account-ui` mobile-nav Core 를 import. 남은 코드는 탭 배열·색·active 판정 |
| K6 | `platform/PlatformFooter.tsx` | **VD → CORE_ONLY** | W1(`d783843f2`) 로 `PublicLegalFooterInfo serviceKey="kpa-society"` 채택 + 실 route 링크 + 동적 연도 |
| K5 | `platform/PlatformHeader.tsx` | **VD → SERVICE_SPECIFIC** | `GlobalHeader` 와 **같은 UI 가 아니다** — anchor 기반 소개용 헤더로 UserArea·알림·contextual nav 자체가 없다. 잔여 부채(GlobalHeader 미채택·raw `<a>` 전체 리로드)는 20절 FOLLOW_UP |
| K7 | `platform/InfoPageLayout.tsx` | **VD → SERVICE_SPECIFIC** | K5+K6 조합 셸. 본문은 이미 `@o4o/ui` primitive(`PageContainer`/`HeroSection`/`ContentCard`) 소비 |
| K15 · G3 | KPA·Glyco `common/PageHeader.tsx` | **VD → OUT_OF_SCOPE** | 전역 Header 축이 아니라 **본문 페이지 타이틀 요소**다(census 가 `P10 ForumPostHeader` 를 OOS 로 둔 것과 같은 축). 두 파일은 props·렌더가 서로 달라(KPA=breadcrumb / Glyco=icon·actions) "같은 UI 복제"도 아니다 |
| K17 | `store/StoreUserDropdown.tsx` | **VD(dead) → DEAD_OR_UNUSED** | 코드 소비 0 |
| N3~N7 | Neture 5 셸 inline footer | **VD → CORE_ONLY** | W2 로 5 셸 전부 `PublicLegalFooterInfo` + `loadFooterLegal` 채택. 남은 것은 셸별 chrome 과 **대상별로 다른 링크셋**(공개=포럼/약관, 공급자·파트너=문의, ops=워크스페이스) |

> **판단을 숨기지 않는다**: N3(`MainLayout`)·N4(`NetureLayout`) 의 footer **골격 약 20줄은 여전히 서로 유사**하다.
> 다만 (a) 두 셸의 링크셋이 다르고 (b) 법정정보 계약은 이미 공통이며 (c) 이를 한 컴포넌트로 합치려면
> 링크 주입 prop 설계가 필요해 §20 이 금지한 "Footer framework" 로 번진다. 따라서 CORE_ONLY 로 분류하고
> **잔존 중복은 20절 FOLLOW_UP** 으로 명시 분리한다. §7 blocker 기준("같은 UI 가 **서비스별** 복제")에는 해당하지 않는다.

### 4-2. census NI 5건의 현재 판정

| census # | 대상 | 현재 판정 | 근거 |
|---|---|---|---|
| H4 | `StoreOwnerShell` (footer 없음) | **NI → FULLY_COMMON** (+ footer 는 NOT_APPLICABLE) | 공통 `MyStoreShell` 소비. `StoreFacingFooter` 는 `links.contact` 가 **필수**인데 PharmacyHub 에는 `/contact` route 가 없다 → 채택 시 데드링크 신설(§15 금지) |
| H7 · H9 | Supplier 셸/헤더 | **삭제됨** | 3절 |
| H8 | `operator/OperatorHeader.tsx` | **NI → SERVICE_SPECIFIC** | W4 재확인 결과 MISSING_REQUIRED 0. 운영자 셸 상단바로 기능 단절 없음. GlobalHeader 채택은 FOLLOW_UP |
| H10 | MobileBottomNav 부재 | **NI → NOT_APPLICABLE** | 12절 |

### 4-3. 서비스별 표 (§21)

| 서비스 | FULLY_COMMON | CORE_ONLY | VIEW_DUPLICATED | SERVICE_SPECIFIC | NOT_IMPLEMENTED | OUT_OF_SCOPE | 기타 | 계 |
| --- | -----------: | --------: | --------------: | ---------------: | --------------: | -----------: | ---: | --: |
| 공통 패키지 | 13 | 0 | 0 | 0 | 0 | 6 | 4 (DEAD) | 23 |
| KPA-Society | 6 | 6 | 0 | 3 | 0 | 2 | 1 (DEAD) | 18 |
| K-Cosmetics | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 8 |
| GlycoPharm | 4 | 4 | 0 | 1 | 0 | 3 | 0 | 12 |
| Pharmacy-Hub | 4 | 2 | 0 | 1 | 0 | 0 | 1 (N/A) | 8 |
| Neture | 3 | 8 | 0 | 1 | 0 | 1 | 0 | 13 |

### 4-4. 전체 합계

```text
FULLY_COMMON      34
CORE_ONLY         24
VIEW_DUPLICATED    0
SERVICE_SPECIFIC   6
NOT_IMPLEMENTED    0
OUT_OF_SCOPE      12
NOT_APPLICABLE     1
DEAD_OR_UNUSED     5
UNCLASSIFIED       0
합계              82
```

---

## 5. Public Footer config alignment 재판정 (§9 / W5 · §28-5)

**판정 A — 정렬 불필요. 코드 변경 0건.**

- `FOOTER_SECTIONS` 형태의 footer config 상수를 가진 곳은 **PharmacyHub 하나뿐**이다
  (`services/web-pharmacy-hub/src/config/navigation.ts` — `PH_FOOTER_SECTIONS` 4 섹션 / **13 링크**. 부기 F 는 12 링크로 적었으나 감사 시점 실측 11 → 상류 LMS learner WO 반영 후 13).
- 나머지 4 서비스는 footer 링크를 JSX 에 직접 쓴다. 즉 **정렬 대상 공통 config 자체가 존재하지 않는다.**
- 4 서비스를 PharmacyHub 모양으로 옮기는 것은 "최소 정렬"이 아니라 **새 Footer framework 신설**이며 §20 금지 대상이다.
- 실제로 공통화되어야 할 축(법정정보 계약 · 링크 유효성 · 저작권 표기)은 이미 `PublicLegalFooterInfo` /
  `createFooterLegalLoader` / `StoreFacingFooter` 로 공통이고, 5서비스 모두 계약을 지키고 있다(6절).
- 따라서 **W5 는 "정렬 불필요"로 종결**한다.

---

## 6. 5서비스 legal contract (§14 · §28-6)

`GET https://api.neture.co.kr/api/v1/public/services/{serviceKey}/footer-legal` 실측(프로덕션):

| serviceKey | HTTP | body |
|---|---|---|
| kpa-society | 200 | `{"success":true,"data":null}` |
| glycopharm | 200 | `{"success":true,"data":null}` |
| k-cosmetics | 200 | `{"success":true,"data":null}` |
| neture | 200 | `{"success":true,"data":null}` |
| pharmacy-hub | 200 | `{"success":true,"data":null}` |

- 백엔드 `apps/api-server/src/modules/service-legal/service-legal-scope.ts` 의 `SUPPORTED_LEGAL_SERVICE_KEYS` 는
  **5 서비스 전부**를 포함한다 → serviceKey 불일치·404 없음.
- `PublicLegalFooterInfo` 는 profile 부재/비활성/오류 시 `null` 을 렌더한다 — **침묵이 계약**이다.
  따라서 현재 footer 에 법정정보 블록이 비어 보이는 것은 **계약 준수**이며 실패가 아니다(§14).
- 프로필 값 미등록 자체는 §8 "API에 실제 법정정보 값이 아직 없음" 에 해당 → **FOLLOW_UP**, closure 비차단.

---

## 7. KPA / Neture legal 회귀 확인 (§28-7)

| 대상 | 현재 코드 | 결과 |
|---|---|---|
| KPA `components/Footer.tsx` | `PublicLegalFooterInfo serviceKey="kpa-society"` + `/policy`·`/privacy`·`/contact`·`/about`·`/guide/intro`·`/service-guide` | 링크 전부 App.tsx 에 route 존재 — 회귀 없음 |
| KPA `platform/PlatformFooter.tsx` | `PublicLegalFooterInfo` + `/policy`·`/privacy`·`/contact`·`/guide/features/*` + `© {currentYear}` | W1 결과 유지 — 회귀 없음 |
| Neture `MainLayout`·`NetureLayout`·`SupplierSpaceLayout`·`SupplierOpsLayout`·`PartnerSpaceLayout` | 5 셸 모두 `PublicLegalFooterInfo serviceKey="neture"` + `loadFooterLegal` | W2 결과 유지 — 회귀 없음 |

법정 route 실측(§10 오탐 방지):

| 서비스 | 이용약관 | 개인정보 | 문의 |
|---|---|---|---|
| KPA | `/policy` (App.tsx:925) | `/privacy` (926) | `/contact` (920) |
| GlycoPharm | `terms` (App.tsx:674, **중첩**) | `privacy` (675) | `contact` (672) |
| K-Cosmetics | `terms` (App.tsx:447, **중첩**) | `privacy` (448) | `contact` (445) |
| Neture | `/terms` (755) | `/privacy` (756) | `/contact` (750) |
| PharmacyHub | `/terms` | `/privacy` | **없음(의도)** |

- GlycoPharm(App.tsx:609) · K-Cosmetics(App.tsx:437) 는 pathless `<Route element={<MainLayout />}>` 아래의
  **상대 경로 중첩 route** 다. `path="/terms"` 로 grep 하면 0건이 나오지만 실제로는 `/terms` 로 해석된다 → **dead link 오탐 아님**.
- PharmacyHub footer 는 `/contact` 를 의도적으로 넣지 않았다. 대칭 목적의 추가는 데드링크 신설이므로 하지 않았다(§15).

**활성 route 의 법정 dead link = 0.**

---

## 8. GlycoPharm `/privacy` 404 재판정 (§11 · §28-8)

**판정 B — 정책 문서 콘텐츠 미게시. `FOLLOW_UP`.**

근거:

- `GET /api/v1/public/services/{key}/policies/{terms|privacy}` 를 5서비스 × 2문서 = **10건 전부** 프로덕션에서 호출한 결과 **전부 404**다.
  GlycoPharm 만의 문제가 아니다.
- A(잘못된 route) 아님: `/privacy` route 는 존재한다(7절 표).
- C(API 불일치) 아님: `service-legal-scope.ts` 가 5 serviceKey 와 `terms`/`privacy` 문서 타입을 모두 지원한다.
- 프론트 `PolicyDocumentPage.loadPolicy` 는 404 → `null` → `PolicyDocumentViewer` 의 중립 빈 상태로 처리한다.
  즉 사용자 Footer 계약이 깨지지 않는다 → §11 의 "실제 사용자 Footer 계약이 깨지면 MUST_FIX" 에 해당하지 않는다.

---

## 9. PharmacyHub GlobalHeader `children` 재판정 (§12 · §28-9)

**판정: `FOLLOW_UP`. 구현하지 않았다(§12 명시 금지).**

- `packages/ui/src/layout/GlobalHeader.tsx:24` 가 `children?: { label: string; href: string }[]` 를 타입으로 선언한다.
- 그러나 파일 내 `children` 참조는 24·451·456·466 뿐이며 451/456/466 은 **무관한 `GlobalHeaderMenuItem({ to, icon, children })` 헬퍼**다
  → **nav 렌더링에서 `item.children` 을 읽는 코드 0건** (선언만 존재).
- `children:` 을 채우는 유일한 소비처는 PharmacyHub `config/navigation.ts`(`PH_PUBLIC_NAV` 의 '커뮤니티' · '이용 안내' · '교육' 3항목 — '교육' 은 상류 `WO-O4O-PHARMACYHUB-LMS-LEARNER-FULL-ADOPTION-V1` 에서 추가됐다).
- 해당 하위 route 는 **페이지 내 링크로 전부 도달 가능**하다:
  `/community/search`·`/forum/my-posts` ← `CommunityHomePage.tsx:134-135` · `/forum/request`·`/forum/my-dashboard` ← `ForumHubPage.tsx:21-22` ·
  `/service-guide`·`/guide/intro`·`/guide/features` ← `PH_FOOTER_SECTIONS` ·
  `/account/enrollments`·`/account/certificates` ← `PH_FOOTER_SECTIONS` '서비스' 섹션 + `PHARMACY_HUB_ACCOUNT_NAV_ITEMS`.
- **dead-end 0 · 업무 단절 0** → closure 비차단.

---

## 10. Neture AdminVault Footer 정책 판정 (§13 · §28-10)

**판정: `NOT_APPLICABLE` + `FOLLOW_UP`. 비차단.**

- `web-neture/src/components/layouts/AdminVaultLayout.tsx:112-121` 의 inline footer 는 법정 요소가 없다
  ("o4o Admin Vault — 설계 보호 구역" + `Authorized: {user?.email}`).
- 해당 셸은 `App.tsx:1019~1022` 에서 `ProtectedRoute allowedRoles={ADMIN_ROLES}` 뒤에만 mount 되는 **관리자 전용 비공개 영역**이며
  상업적·대외 표기가 전무하다. 제외 근거는 [`CHECK-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1 §13-A`](CHECK-O4O-NETURE-SHELL-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md) 에 이미 기록돼 있다.
- 공개 사용자에게 노출되는 Footer 가 아니므로 법정정보 계약 대상이 아니다(§17: 업무 셸에 Footer 가 없다는 것 자체는 결함이 아니다).

---

## 11. MobileBottomNav 최종 상태 (§28-11)

| 서비스 | 파일 | Core 채택 | LOC |
|---|---|---|---:|
| KPA | `components/MobileBottomNav.tsx` | `@o4o/account-ui` | 180 (census 303) |
| GlycoPharm | `components/MobileBottomNav.tsx` | 동일 | 155 (census 256) |
| K-Cosmetics | `components/MobileBottomNav.tsx` | 동일 | 154 (census 254) |
| Neture | `components/NetureBottomNav.tsx` | 동일 | 140 (census 217) |

- 4파일 합계 1,030 → **629 LOC**. 남은 코드는 탭 배열·route·active 판정·브랜드 색 뿐이다 → **CORE_ONLY**.
- Core(`MobileBottomNavShell`)는 `env(safe-area-inset-bottom)` 을 inline style 로 적용한다.
- KPA 이중 bottom nav 없음: `App.tsx:532` 는 `/store/*` 의 `MyStoreShell` `below` 슬롯,
  `Layout.tsx:35` 는 공개 트리로 **route 트리가 겹치지 않는다**.
- 브라우저 실측(17절): 모바일 390×844 에서 KPA·GlycoPharm·K-Cosmetics 공개 홈에 `position:fixed; bottom:0` nav 1개 확인.

---

## 12. PharmacyHub bottom nav NOT_APPLICABLE 재확인 (§28-12)

- PharmacyHub 에는 MobileBottomNav 파일이 없다(실측 0건).
- [`CHECK-O4O-PHARMACYHUB-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1`](CHECK-O4O-PHARMACYHUB-HEADER-FOOTER-CAPABILITY-GAP-CLOSURE-V1.md) 의 **MISSING_REQUIRED 0** 판정을 현재 코드에서 재확인했다.
- §8 "업무상 필요하지 않은 MobileBottomNav" 에 해당 → **NOT_APPLICABLE**, closure 비차단.
- §15 대로 **대칭 목적의 bottom nav 추가는 하지 않았다.**

---

## 13. stale copyright (§18 · §28-13)

실측 및 조치:

| 위치 | 수정 전 | 수정 후 |
|---|---|---|
| `web-glycopharm/src/components/common/Footer.tsx:121` | `© 2025 GlycoPharm` | `© {currentYear}` (`new Date().getFullYear()`) |
| `web-glycopharm/src/components/layouts/StoreLayout.tsx:288` | `© 2025 GlycoPharm` | `© {currentYear}` |
| `web-k-cosmetics/src/components/common/Footer.tsx:88` | `© 2025 K-Cosmetics` | `© {currentYear}` |

- stale 은 정확히 **3건**이었다(부기 G 와 일치). KPA `Footer.tsx` `© 2026` · KPA `PlatformFooter` 동적 · Neture 5셸 `© 2026` ·
  PharmacyHub `© 2026` 은 stale 아님.
- §7 blocker 로 승격시키지 않았다. §20 "허용된 최소 수정"으로만 처리했다.

---

## 14. 문서 drift (§19 · §28-14 · CLAUDE.md §16)

- `docs/architecture/ui/GLOBAL-HEADER-STANDARD-V1.md` — 마지막 실질 변경이 `bdbd60177`(2026-05-07, 파일명 정규화)뿐이라
  stale 의심이 있으나 **대체 문서 경로를 특정할 수 없다** → §16-3 상 SUPERSEDED 표기 대상이 아니다. **보고만** 한다.
- 과거 CHECK 는 실행 기록이므로 내용을 고쳐 쓰지 않았다(§19). 다만 본 CHECK 에 **정정 사실**을 남긴다:
  [`CHECK-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1:150`](CHECK-O4O-KPA-PLATFORM-FOOTER-LEGAL-CONTRACT-ADOPTION-V1.md) 은
  `PlatformHeader` 의 `#services` / `#about` 을 "anchor 로서 유효"라고 적었으나, `#about` 만 유효하고
  **`#services` 는 대상 `id` 가 KPA 전 소스에 없는 dead anchor** 였다(15절에서 시정). 과거 문서는 그대로 보존한다.
- census 표의 Neture `OperatorLayoutWrapper` 누락(3절 N13)도 정정 기록으로만 남긴다.

---

## 15. 수행한 코드 수정 (§20 · §28-15)

총 **4 파일**. 전부 §20 허용 범위(dead href 수정 · stale copyright 최소 수정)이며 구조 변경은 없다.

| # | 파일 | 변경 | 분류 |
|---|---|---|---|
| 1 | `services/web-kpa-society/src/components/platform/PlatformHeader.tsx` | `{ label: 'Services', href: '#services' }` 제거 (`Home` · `About` 유지) | **MUST_FIX_BEFORE_CLOSE 해소** |
| 2 | `services/web-glycopharm/src/components/common/Footer.tsx` | `© 2025` → `© {currentYear}` | 최소 수정 |
| 3 | `services/web-glycopharm/src/components/layouts/StoreLayout.tsx` | 동일 | 최소 수정 |
| 4 | `services/web-k-cosmetics/src/components/common/Footer.tsx` | 동일 | 최소 수정 |

**1번 근거(§7 "활성 route 의 dead link")**

- `PlatformHeader` 는 `InfoPageLayout` 을 통해 `/services/pharmacy` · `/services/forum` · `/services/lms` · `/join/pharmacy`
  **4개 활성 route** 에 렌더된다.
- `id="services"` 는 KPA `src` 전체에 **0건**이다(`id="about"` 은 `platform/PlatformFooter.tsx:20` 에 존재).
- 프로덕션 실측으로도 재현했다: `https://kpa-society.co.kr/services/pharmacy` 의 dead anchor = `["#services"]` (desktop·mobile 모두).
- 부수 효과로 **모바일 가로 overflow 도 해소**됐다: 수정 전 390px 뷰포트에서 `NAV` 우측 끝 396px(6px 초과) → 수정 후 `scrollWidth == innerWidth == 390`.

하지 않은 것(의도):

- `PlatformHeader` 의 `GlobalHeader` 채택 · raw `<a href>` → `<Link>` 전환 (Header 재설계 범위 → FOLLOW_UP)
- Footer framework 신설 · PharmacyHub bottom nav 추가 · `GlobalHeader.children` 렌더링 구현

---

## 16. typecheck / build (§24 · §28-16)

worktree 에서 `pnpm install --frozen-lockfile` → `pnpm run build:packages` 를 먼저 수행해 workspace `dist` 부재로 인한 가짜 TS2307 을 배제했다.

| 명령 | 결과 |
|---|---|
| `pnpm install --frozen-lockfile` | Done (5m 13s) |
| `pnpm run build:packages` | **exit 0** · error 0건 |
| `pnpm --filter @o4o/web-kpa-society build` | **exit 0** · `✓ built in 1m 5s` |
| `pnpm --filter glycopharm-web build` | **exit 0** · `✓ built in 35.38s` |
| `pnpm --filter @o4o/web-k-cosmetics build` | **exit 0** · `✓ built in 21.13s` |

- 세 명령 모두 `No projects matched` 출력 **0건**을 확인했다(§24 함정 — exit 0 만으로 PASS 로 인정하지 않았다).
- 실제 package name 확인: `@o4o/web-kpa-society` · `glycopharm-web` · `@o4o/web-k-cosmetics` · `@o4o/web-neture` · `pharmacy-hub-web`.
- 산출물 검증: `services/web-glycopharm/dist` · `services/web-k-cosmetics/dist` 에 `2025 GlycoPharm` / `2025 K-Cosmetics` 문자열 **0건**.
- 수정하지 않은 Neture · PharmacyHub 는 build 를 돌리지 않았다(§24: 코드 수정 없는 서비스는 전체 build 반복 불필요).

---

## 17. desktop / mobile browser smoke (§25 · §28-17)

Playwright(Chromium) 실브라우저. Desktop 1440×900 · Mobile 390×844.
(MCP 브라우저는 프로필 잠금으로 기동 실패 → 로컬 Playwright 로 수행했다.)

### 17-1. 프로덕션 6 화면 × 2 뷰포트 = 12 측정 (수정 **전** 배포본)

| 화면 | HTTP | header | footer | header 높이 | `href="#"` | dead anchor | bottom nav(모바일) | 가로 overflow |
|---|---|---|---|---|---|---|---|---|
| `kpa-society.co.kr/` | 200 | 1 | 1 | 65px | 0 | 0 | 1 | 없음 |
| `kpa-society.co.kr/services/pharmacy` | 200 | 1 | 1 | 65px | 0 | **`#services`** | 0 | **모바일 396>390** |
| `glycopharm.co.kr/` | 200 | 1 | 1 | 65px | 0 | 0 | 1 | 없음 |
| `k-cosmetics.site/` | 200 | 1 | 1 | 65px | 0 | 0 | 1 | 없음 |
| `pharmacyhub.co.kr/` | 200 | 1 | 1 | 65px | 0 | 0 | 0 (의도) | 없음 |
| `neture.co.kr/` | 200 | 1 | 1 | 65px | 0 | 0 | 0 (비인증 시 미렌더) | 없음 |

- **이중 header / 이중 footer = 0** (모든 화면 header 1 · footer 1).
- 공통 `GlobalHeader` 는 `sticky top-0 z-50` + `h-16` — `fixed` 가 아니므로 본문 가림(구조적 회귀) 없음. 실측 높이 65px 일치.
- 유일한 결함이 KPA `#services` 였고, 15절에서 수정했다.

### 17-2. 수정본 preview 재검증 (KPA 빌드 산출물 로컬 서빙)

`http://localhost:4713/services/pharmacy`

| 뷰포트 | 메뉴 | dead anchor | `href="#"` | header/footer | scrollWidth vs innerWidth |
|---|---|---|---|---|---|
| 1440×900 | `Home→/`, `About→#about`, `Login→/login` | **0** | 0 | 1 / 1 | 1440 / 1440 |
| 390×844 | 동일 | **0** | 0 | 1 / 1 | **390 / 390** |

> 검증 함정 기록: 처음 사용한 포트 4599 에는 **다른 세션의 서버가 이미 점유**하고 있어 구 빌드가 응답했다
> (curl 은 내 서버, 브라우저는 다른 서버로 붙어 `#services` 가 남아 보이는 오탐 발생). 포트를 4713 으로 바꿔 재측정했다.

### 17-3. `href="#"` 전수

5서비스 + `packages/{ui,shared-space-ui,account-ui}` 전체에서 `href="#"` 는 4건이며
(`KpaLoginModal.tsx:336`, `RegisterModal.tsx:490·816`, `web-neture/pages/admin/ai/ContextAssetFormPage.tsx:580`)
**모두 Header/Footer/nav 밖의 모달·관리자 폼**이고 **전부 동작하는 `onClick` 을 가진다** → 본 모집단 기준 `href="#"` = **0**, 해당 4건은 OUT_OF_SCOPE.

---

## 18. production 검증 (§26 · §28-18) — **수정 후 실측 PASS** (2026-08-21 갱신)

> 본 절은 마감 연장 작업(2026-08-21)에서 **수정본 배포 후 production 실측 결과**로 갱신했다.
> 최초 작성 시점에는 15절 수정이 미배포 상태여서 "수정 후 production = 미확인" 으로 기록돼 있었다.
> 다른 절(17-1 등)의 **수정 전 배포본 기록은 사실 기록이므로 그대로 보존**한다 (CLAUDE.md §16-1 · WO §19).

### 18-1. 배포 반영 근거

| 항목 | 값 |
|---|---|
| 수정 커밋 | `3635838ed` (4 파일) |
| CI 워크플로 | `Deploy Web Services (Cloud Run)` run **`32454324338`** (headSha `3635838ed5b0690b622ce06ee49a99605c4c0122`, `conclusion=success`, 2026-08-21T06:25:22Z → 06:28:51Z) |
| job 결과 | `deploy-kpa-society` / `deploy-glycopharm` / `deploy-k-cosmetics` = **success** · `deploy-pharmacy-hub` / `deploy-neture` / `deploy-kpa-branch` = **skipped** (해당 서비스 변경 없음 — 정상) |
| Cloud Run 활성 리비전 (asia-northeast3) | `kpa-society-web-01880-7zw` (06:28:29Z) · `glycopharm-web-01309-vxs` (06:28:12Z) · `k-cosmetics-web-01052-6tp` (06:28:05Z) — 각 서비스 트래픽 100% |
| 미변경 서비스 리비전 | `neture-web-01505-cnh` · `pharmacy-hub-web-00133-k9v` (배포 skip 과 일치) |
| 측정 시각 | 2026-08-21 06:32~06:38 UTC (Playwright/Chromium, 쿼리스트링 캐시 버스트 적용) |

### 18-2. 수정 대상 3건 production 실측

| # | 대상 | 기대 | production 실측 | 판정 |
|---|---|---|---|---|
| 1 | KPA `PlatformHeader` dead anchor | `#services` 없음 · `#about` 은 유지되고 대상 `id` 실재 | `kpa-society.co.kr/services/pharmacy` header/footer anchor = `["#about"]` **단 1건**, `#services` **0건**, `document.getElementById('about')` 존재 → **dead anchor 0** | PASS |
| 2 | GlycoPharm 공개 Footer 연도 | 현재 연도(2026) | `© 2026 GlycoPharm. All rights reserved.` | PASS |
| 3 | K-Cosmetics 공개 Footer 연도 | 현재 연도(2026) | `© 2026 K-Cosmetics. All rights reserved.` | PASS |
| 3-b | GlycoPharm `StoreLayout` footer 연도 (로그인 필요 영역) | 현재 연도(2026) | 배포 번들 `glycopharm.co.kr/assets/index--i8qzWqY.js` 전수 스캔 결과 `All rights reserved` 문자열 **2 occurrence 모두 동적 변수** (`["© ", t, " GlycoPharm. All rights reserved."]`) — 하드코딩 `2025` **0건**. 공개 Footer 가 같은 번들에서 2026 을 렌더하는 것으로 동일 변수의 정상 동작 확인 | PASS (번들 근거) |

> `2025` 하드코딩 잔존 여부는 배포 번들 문자열 전수 스캔으로 확인했다 — GlycoPharm / K-Cosmetics 양쪽 모두 **0건**.
> 3-b 는 인증 필요 화면이라 브라우저 직접 렌더 대신 **배포 산출물 근거**로 판정했다(측정 한계 명시).

### 18-3. 5서비스 대표 화면 × 2 뷰포트 재측정 (Desktop 1440×900 / Mobile 390×844)

6 화면 × 2 뷰포트 = **12 측정, 전부 HTTP 200**.

| 화면 | 뷰포트 | header | footer | header 높이 | `href="#"` | dead anchor | 저작권 | scrollWidth/innerWidth | console error | 렌더 |
|---|---|---|---|---|---|---|---|---|---|---|
| `kpa-society.co.kr/` | D / M | 1 / 1 | 1 / 1 | 65 / 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 0 | 정상 |
| `kpa-society.co.kr/services/pharmacy` | D / M | 1 / 1 | 1 / 1 | 65 / 65 | 0 | **0** | 2026 | 1440/1440 · **390/390** | 0 | 정상 |
| `glycopharm.co.kr/` | D / M | 1 / 1 | 1 / 1 | 65 / 65 | 0 | 0 | **2026** | 1440/1440 · 390/390 | 0 | 정상 |
| `k-cosmetics.site/` | D / M | 1 / 1 | 1 / 1 | 65 / 65 | 0 | 0 | **2026** | 1440/1440 · 390/390 | 0 | 정상 |
| `pharmacyhub.co.kr/` | D / M | 1 / 1 | 1 / 1 | 65 / 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 0 | 정상 |
| `neture.co.kr/` | D / M | 1 / 1 | 1 / 1 | 65 / 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 0 | 정상 |

- **이중 header / 이중 footer = 0** (전 화면 header 1 · footer 1).
- **white screen / JS exception = 0** — 전 화면 `body.innerText` 555~1273자 렌더, console error 0, pageerror 0.
- 17-1 에서 관측됐던 `kpa-society.co.kr/services/pharmacy` **모바일 가로 overflow(396>390) 도 해소**됐다 (390/390).
- 모바일 bottom nav: KPA / GlycoPharm / K-Cosmetics = 1, PharmacyHub = 0(의도), Neture = 0(비인증 시 미렌더) — 11·12절 판정과 동일.
- 검증 함정 주의 기록: K-Cosmetics 는 반드시 **`k-cosmetics.site`** 로 측정했다 (`k-cosmetics.co.kr` 은 외부 쇼핑몰).

### 18-4. header/footer dead link 전수 (production 실접속)

5서비스 header/footer 의 내부 링크 **42 경로 전수 접속** — 전부 HTTP 200 · 404/Not Found 표시 0 · pageerror 0.

| 서비스 | 검증 경로 | 결과 |
|---|---|---|
| KPA | `/` `/service-guide` `/about` `/contact` `/guide/intro` `/policy` `/privacy` `/login` `/guide/features/{signage,forum,content}` (11) | dead 0 |
| GlycoPharm | `/` `/service-guide` `/contact` `/forum` `/lms` `/business` `/terms` `/privacy` (8) | dead 0 |
| K-Cosmetics | `/` `/service-guide` `/contact` `/register` `/terms` `/privacy` (6) | dead 0 |
| PharmacyHub | `/` `/community` `/education` `/service-guide` `/forum` `/account/{enrollments,certificates}` `/guide/{intro,features}` `/join` `/join/status` `/terms` `/privacy` (13) | dead 0 |
| Neture | `/` `/guide` `/contact` `/terms` `/privacy` (5) | dead 0 |

- GlycoPharm / K-Cosmetics 의 `terms` · `privacy` 는 중첩 상대 route 라 소스 grep 으로 보이지 않지만 **실접속 200 · 정상 렌더**로 확인했다.
- 5서비스 `terms` / `privacy` 는 route 는 살아 있고 본문이 "현재 공개된 문서가 없습니다" 다 — **dead link 가 아니라 20절 FOLLOW_UP #2(정책 문서 미게시)** 이며 closure 를 막지 않는다.
- PharmacyHub 에 `/contact` route 가 없는 것은 **의도된 계약**이므로 결함으로 세지 않는다(6·7절 판정 유지).
- `mailto:` 링크 2건(GlycoPharm `support@glycopharm.co.kr` · K-Cosmetics `support@k-cosmetics.site`)은 route dead link 대상 밖이다.

### 18-5. 판정

```text
production adoption = PASS
```

- 20절 FOLLOW_UP **#10 "15절 수정본의 production 재확인" 은 본 절로 해소**됐다 (기록 보존을 위해 20절 표는 원문 유지).
- 코드 수정 **0건** — 본 갱신은 문서(CHECK) 갱신뿐이다.

### 18-6. production adoption 전수 재검증 (2026-08-21 2차 · `WO-O4O-CROSSSERVICE-HEADER-FOOTER-PRODUCTION-ADOPTION-FINAL-VERIFICATION-V1`)

> 18-1~18-5 는 `3635838ed` 배포 직후(리비전 `kpa-society-web-01880-7zw` 세대) 측정이다.
> 이후 `Deploy Web Services (Cloud Run)` run **`32455238689`** (headSha `7387109bf`) 가 **6 web 서비스 전부 재배포**해
> 리비전 세대가 바뀌었으므로, **현행 리비전 기준으로 다시 전수 측정**했다. 18-1~18-5 기록은 사실 기록이므로 보존한다.

#### 18-6-1. 현행 배포 기준점

| 항목 | 값 |
|---|---|
| 검증 시점 `origin/main` | `82e54ff21` |
| 최신 web 배포 run | `32455238689` (headSha `7387109bf`, `conclusion=success`) — `deploy-kpa-society` / `deploy-glycopharm` / `deploy-k-cosmetics` / `deploy-neture` / `deploy-pharmacy-hub` / `deploy-kpa-branch` **전부 success** |
| Cloud Run 활성 리비전 (asia-northeast3, 트래픽 100%) | `kpa-society-web-01881-69c` · `glycopharm-web-01310-6vt` · `k-cosmetics-web-01053-k5c` · `neture-web-01506-wcx` · `pharmacy-hub-web-00134-qrh` |
| `3635838ed..82e54ff21` 의 web 변경 | `packages/ui/src/operator-user-detail/UserDetailPage.tsx` · `services/web-k-cosmetics` 3파일 (운영자 회원 상세 WO) — **Header/Footer/Nav/Shell 모집단 무관** |
| 측정 도구 | Playwright / Chromium headless, 쿼리스트링 캐시 버스트(`?cb=`) 적용 |

#### 18-6-2. production asset 기준 재확인 (배포 번들 문자열 전수 스캔)

| 서비스 | 스캔 대상 | `#services` | 하드코딩 `2025` 저작권 | 판정 |
|---|---|---|---|---|
| KPA | `index-C3iEdDNX.js` + vendor 3종 (1,310,903 B) | **0건** | 0건 | PASS |
| GlycoPharm | `index-BkR0Zar1.js` (1,254,386 B) | 0건 | **0건** — `All rights reserved` 3 occurrence 전부 동적 변수 (`["© ", t, " GlycoPharm. …"]` 2건 = 공개 Footer·`StoreLayout`, `["© ", l, " ", e, …]` 1건 = 공통 Footer) | PASS |
| K-Cosmetics | `index-DKEko4y8.js` (1,227,587 B) | 0건 | **0건** — 2 occurrence 전부 동적 변수 | PASS |

#### 18-6-3. 5서비스 × (대표 화면 + deep link 2) × 2 뷰포트 = **30 측정**

각 화면은 **URL 직접 진입 후 하드 새로고침**까지 수행해 SPA rewrite 를 확인했다 (진입/새로고침 모두 HTTP 200, header/footer 개수 동일).

| 서비스 | 화면 | 진입/새로고침 | header/footer | header 높이 | `href="#"` | dead anchor | 저작권 | scrollWidth/innerWidth (D · M) | 본문 길이 (D · M) | 404 표시 | console error / pageerror |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KPA | `/` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 1273 · 1177 | 없음 | 0 / 0 |
| KPA | `/services/pharmacy` | 200/200 | 1/1 | 65 | 0 | **0** | 2026 | 1440/1440 · 390/390 | 613 · 613 | 없음 | 0 / 0 |
| KPA | `/guide/intro` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 1383 · 1358 | 없음 | 0 / 0 |
| GlycoPharm | `/` | 200/200 | 1/1 | 65 | 0 | 0 | **2026** | 1440/1440 · 390/390 | 1133 · 1087 | 없음 | 0 / 0 |
| GlycoPharm | `/service-guide` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 1580 · 1561 | 없음 | 0 / 0 |
| GlycoPharm | `/forum` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 424 · 405 | 없음 | 0 / 0 |
| K-Cosmetics | `/` | 200/200 | 1/1 | 65 | 0 | 0 | **2026** | 1440/1440 · 390/390 | 1133 · 1087 | 없음 | 0 / 0 |
| K-Cosmetics | `/service-guide` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 1589 · 1570 | 없음 | 0 / 0 |
| K-Cosmetics | `/terms` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 288 · 269 | 없음 | **1 / 0** (아래 주) |
| PharmacyHub | `/` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 580 · 555 | 없음 | 0 / 0 |
| PharmacyHub | `/community` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 312 · 287 | 없음 | 0 / 0 |
| PharmacyHub | `/education` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 312 · 287 | 없음 | 0 / 0 |
| Neture | `/` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 1105 · 1073 | 없음 | 0 / 0 |
| Neture | `/guide` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 3279 · 3248 | 없음 | 0 / 0 |
| Neture | `/contact` | 200/200 | 1/1 | 65 | 0 | 0 | 2026 | 1440/1440 · 390/390 | 503 · 472 | 없음 | 0 / 0 |

- **이중 header / 이중 footer = 0** (30 측정 전부 header 1 · footer 1).
- **가로 overflow = 0** — 전 측정에서 `scrollWidth == innerWidth`. 본문 가림 회귀 없음 (header `sticky`, 높이 65 고정).
- **white screen = 0 · JS exception(pageerror) = 0 · 예상치 못한 404/500 = 0.**
- K-Cosmetics `/terms` 의 console error 1건은 `GET https://api.neture.co.kr/api/v1/public/services/k-cosmetics/policies/terms` **404** 이며, 화면은 "현재 공개된 문서가 없습니다" 를 정상 렌더한다. **JS exception 아님** — 20절 FOLLOW_UP #2(정책 문서 미게시)의 네트워크 표현이므로 결함으로 계상하지 않는다.

#### 18-6-4. 수정 대상 3건의 화면 직접 확인

| # | 대상 | production 실측 (DOM) | 판정 |
|---|---|---|---|
| 1 | KPA `#services` dead anchor 제거 | `kpa-society.co.kr/services/pharmacy` — `a[href="#services"]` **0개**, 페이지 HTML 전체에 `#services` 문자열 **부재**. 남은 hash anchor 는 `#about` 1건이며 `document.getElementById('about')` **존재** → dead anchor 0. `/` 는 hash anchor 자체가 0건 | PASS |
| 2 | GlycoPharm 동적 연도 | footer 텍스트 `© 2026 GlycoPharm. All rights reserved.` | PASS |
| 3 | K-Cosmetics 동적 연도 | footer 텍스트 `© 2026 K-Cosmetics. All rights reserved.` | PASS |
| 참고 | 나머지 3서비스 저작권 | KPA `Copyright © 2026 약사회. All Rights Reserved.` · PharmacyHub `© 2026 Pharmacy-Hub. All rights reserved.` · Neture `© 2026 Neture. 공급자 · 파트너 협업 플랫폼` | 전부 2026 |

> GlycoPharm `StoreLayout` footer(로그인 필요 영역)는 18-2 의 3-b 와 동일하게 **배포 번들 근거**로 판정했다.
> 이번 재검증은 **비인증 공개 화면 범위**이며, 인증 필요 화면은 브라우저로 직접 렌더하지 않았다 — **측정 한계로 명시**한다.

#### 18-6-5. Mobile navigation 기능 검증 (390×844, touch context)

| 서비스 | 메뉴 버튼 | 클릭 후 노출 링크 | 메뉴 링크 실이동 | fixed bottom nav | pageerror |
|---|---|---|---|---|---|
| KPA | `메뉴 열기` 존재 | 29 → **33** | `/service-guide` → 200 (`KPA Society — 약사 커뮤니티·강의·매장 지원`) | 1 | 0 |
| GlycoPharm | `메뉴 열기` 존재 | 29 → **32** | `/service-guide` → 200 (`GlycoPharm - 혈당관리 전문 플랫폼`) | 1 | 0 |
| K-Cosmetics | `메뉴 열기` 존재 | 28 → **31** | `/service-guide` → 200 (`K-Cosmetics - O4O Platform`) | 1 | 0 |
| PharmacyHub | `메뉴 열기` 존재 | 20 → **24** | `/community` → 200 (`Pharmacy-Hub 파머시 허브`) | 0 (11·12절 판정대로 **의도**) | 0 |
| Neture | `메뉴 열기` 존재 | 27 → **30** | `/guide` → 200 (`이용 안내 — Neture`) | 0 (비인증 시 미렌더 — 11절 판정) | 0 |

**모바일 핵심 navigation 불가 = 0** (5서비스 전부 메뉴 열림 + 실제 이동 성공).

#### 18-6-6. header/footer/nav 링크 전수 실접속

수집된 내부 링크 **43 경로 전수 브라우저 접속** — **HTTP 200 = 43/43 · 404 렌더 0 · pageerror 0**.

| 서비스 | 경로 수 | 결과 |
|---|---|---|
| KPA | 11 (`/` `/service-guide` `/about` `/contact` `/guide/intro` `/policy` `/privacy` `/login` `/guide/features/{signage,forum,content}`) | dead 0 |
| GlycoPharm | 8 (`/` `/service-guide` `/contact` `/forum` `/lms` `/business` `/terms` `/privacy`) | dead 0 |
| K-Cosmetics | 6 (`/` `/service-guide` `/contact` `/register` `/terms` `/privacy`) | dead 0 |
| PharmacyHub | 13 (`/` `/community` `/education` `/service-guide` `/forum` `/account/{enrollments,certificates}` `/guide/{intro,features}` `/join` `/join/status` `/terms` `/privacy`) | dead 0 |
| Neture | 5 (`/` `/guide` `/contact` `/terms` `/privacy`) | dead 0 |

- Neture header 의 **cross-service 외부 링크 3건**도 추가 확인: `kpa-society.co.kr/` · `www.glycopharm.co.kr` · `www.k-cosmetics.site/` = 전부 **200**.
- 18-4 의 오탐 방지 판정을 그대로 재확인했다 — PharmacyHub `/contact` 부재는 **의도된 계약**, GlycoPharm·K-Cosmetics `terms`/`privacy` 는 중첩 상대 route 라 **실접속으로 200 확인**, `terms`/`privacy` 본문의 "현재 공개된 문서가 없습니다" 는 dead link 가 아니라 **FOLLOW_UP #2**, 법정정보 블록 미표시는 `PublicLegalFooterInfo` 계약(profile 없으면 `null`)이다.
- K-Cosmetics 는 반드시 **`k-cosmetics.site`** 로 측정했다 (`k-cosmetics.co.kr` 은 무관한 외부 쇼핑몰).

#### 18-6-7. 재검증 판정

```text
PRODUCTION_ADOPTION = PASS
```

- 발견된 신규 결함 **0건** → 이번 재검증에서 수행한 **코드 수정 0건**.
- 20절 FOLLOW_UP 은 재분류·구현하지 않았다. 미확인 항목은 **인증 필요 화면(GlycoPharm `StoreLayout` 등)** 이며 18-6-4 에 측정 한계로 명시했다.

---

## 19. MUST_FIX_BEFORE_CLOSE 목록 (§28-19)

| # | 항목 | 상태 |
|---|---|---|
| 1 | KPA `PlatformHeader` `#services` dead anchor (활성 4 route) | **해소** (15절, preview 재검증 완료) |

**잔여 `MUST_FIX_BEFORE_CLOSE` = 0.**

§7 전 항목 전수 판정:

| §7 기준 | 결과 |
|---|---|
| 활성 route 의 dead link | 0 (1건 발견 → 수정) |
| `href="#"` | 0 (모집단 기준) |
| 존재하지 않는 terms/privacy/contact route | 0 (7절) |
| Header/Footer 로 인한 핵심 route 접근 불가 | 0 |
| logout/profile 등 기본 동작 단절 | 0 |
| 서비스별 복제로 남은 VIEW_DUPLICATED | 0 (4절) |
| 필요한 Header/Footer capability NOT_IMPLEMENTED | 0 (4-2절 · 12절) |
| 법정정보 canonical 계약 우회 | 0 (6·7절) |
| 모바일 핵심 navigation 불가 | 0 (11·17절) |
| fixed header/nav 로 인한 본문 가림 회귀 | 0 (17절, `sticky`) |

---

## 20. FOLLOW_UP 목록 (§28-20)

closure 를 막지 않는다(§8). 필요 시 별도 WO 로 다룬다.

| # | 항목 | 근거 | 제안 후속 WO |
|---|---|---|---|
| 1 | 5서비스 법정정보 profile 값 미등록(`data: null`) | §8 "API에 실제 법정정보 값이 아직 없음" | `WO-O4O-SERVICE-LEGAL-PROFILE-CONTENT-SEED-V1` |
| 2 | 정책 문서 10건(5서비스 × terms/privacy) 미게시 404 | §8 "정책 문서 콘텐츠 미게시" (8절) | `WO-O4O-PUBLIC-POLICY-DOCUMENT-PUBLICATION-V1` |
| 3 | `GlobalHeader.children` 선언만 있고 렌더 코드 0건 | 9절 (§12 자동 구현 금지) | `WO-O4O-GLOBAL-HEADER-SUBMENU-CONTRACT-DECISION-V1` |
| 4 | KPA `PlatformHeader` GlobalHeader 미채택 · raw `<a>` 전체 리로드 | 4-1절 (Header 재설계 = §20 금지) | `WO-O4O-KPA-PLATFORM-INFO-SHELL-HEADER-ADOPTION-V1` |
| 5 | Neture `MainLayout`/`NetureLayout` footer 골격 잔존 유사(약 20줄) | 4-1절 주석 | `WO-O4O-NETURE-PUBLIC-SHELL-FOOTER-CONSOLIDATION-V1` |
| 6 | Neture `AdminVaultLayout` footer 법정 요소 없음 | 10절 (비공개 관리자 영역) | 없음 — 정책상 유지 |
| 7 | PharmacyHub `OperatorHeader` GlobalHeader 미채택 | 4-2절 (기능 단절 0) | `WO-O4O-PHARMACYHUB-OPERATOR-HEADER-ADOPTION-V1` |
| 8 | dead component 5건 정리 | 3절 | `WO-O4O-UI-DEAD-LAYOUT-COMPONENT-RETIREMENT-V1` |
| 9 | `GLOBAL-HEADER-STANDARD-V1.md` stale 의심 | 14절 (§16-3 상 표기 대상 아님) | 판단 보류 |
| 10 | 15절 수정본의 production 재확인 | 18절 | 배포 후 smoke |

---

## 21. 최종 census 표 (§21 · §28-21)

4-3 / 4-4 절 참조. **`UNCLASSIFIED = 0`** · 모집단 합계 **82**.

---

## 22. Closure gate 및 최종 판정 (§22 · §23 · §28-22)

| gate 항목 | 결과 |
|---|---|
| 전체 active 모집단 조사 완료 | PASS (82) |
| UNCLASSIFIED 0 | PASS |
| VIEW_DUPLICATED 0 | PASS (4절 판정 근거 명시) |
| 필요한 NOT_IMPLEMENTED 0 | PASS |
| MUST_FIX_BEFORE_CLOSE 0 | PASS (19절) |
| 법정 dead link 0 | PASS (7절) |
| `href="#"` 0 | PASS (17-3절) |
| 대표 mobile/desktop 사용자 흐름 정상 | PASS (17절) |
| 공통 Core 채택 회귀 없음 | PASS (7·11절) |
| 서비스별 차이 설명 가능 | PASS (CORE_ONLY 24 / SERVICE_SPECIFIC 6 / NOT_APPLICABLE 1) |

```text
HEADER_FOOTER_COMMONIZATION = CLOSED
PRODUCTION_ADOPTION = PASS
MUST_FIX_BEFORE_CLOSE = 0
```

**최종 판정: CLOSE** · **PRODUCTION_ADOPTION = PASS**
(18절 — 2026-08-21 수정본 배포 후 1차 실측 + **18-6절 현행 리비전 기준 전수 재검증**, `WO-O4O-CROSSSERVICE-HEADER-FOOTER-PRODUCTION-ADOPTION-FINAL-VERIFICATION-V1`)
