# CHECK — KPA · PharmacyHub 커뮤니티 Home/Nav canonical 수렴

- **WO**: `WO-O4O-KPA-PHARMACYHUB-COMMUNITY-HOME-AND-NAV-CANONICAL-CONVERGENCE-V1`
- **작업일**: 2026-08-24
- **커밋**: `690a108f4`
- **판정**: **KPA_PH_COMMUNITY_HOME_NAV_CONVERGENCE = COMPLETE**

---

## 1. 목표

KPA-Society 의 현재 Home/Menu 를 기준으로 ①지부·분회·데모 잔재를 제거·이관하고
②정제된 구조를 **공통 Home/Nav 부품으로 추출**한 뒤 ③PharmacyHub 가 **자기 config·data 로**
같은 부품을 소비하게 한다. KPA JSX 를 PH 로 복제하지 않는다.

```
Shared Community Home / Navigation / Footer
├─ KPA config + KPA data
└─ PharmacyHub config + PH data
```

---

## 2. §3 KPA 지부·분회·데모 residual 처분

| 대상 | 판정 |
|---|---|
| `contexts/OrganizationContext.tsx` · `data/sampleOrganizations.ts` · `types/organization.ts` · `types/pharmacist.ts` | 제거 (소비처 0 · 분회 신고서 기반 타입) |
| `components/ServiceBanner.tsx` · `components/platform/ServiceCard.tsx` | 제거 (지부 `demo` / 분회 `independent` 변형 카드) |
| `components/platform/PlatformHeader.tsx` · `PlatformFooter.tsx` | 제거 (안내 페이지 자체 chrome — canonical `Layout` 로 통일) |
| `pages/mypage/AnnualReportFormPage.tsx` | 제거 (분회 신상신고 폼 · route 미등록) |
| `InfoPageLayout` 의 `badgeType`('도입 검토용 데모' / '독립 운영 가능') | 제거 |
| `api/forum.ts` 의 `/demo/*` 스코프 분기 | 제거 — KPA 본체는 커뮤니티 스코프 고정 |
| 지부·분회 문구 (ContactPage · MyDashboardPage · AdminAuthGuard · AdminLayout · AdminSidebar · RoleGuard · PharmacistOnlyGuard · admin barrel) | 조직 중립 문구로 교정 |
| KPA Admin 대시보드 `등록 분회` KPI | **MOVE_TO_BRANCH_SERVICE** — 분회 통계는 `services/web-kpa-branch` 소관 |

`services/web-kpa-branch` 의 코드는 건드리지 않았다 (§15 — 경계 분리만).

## 3. §8·§9·§14 공통 부품 (service-neutral)

| 부품 | 위치 | 소유 책임 |
|---|---|---|
| `CommunityServiceHome` | `@o4o/shared-space-ui` | 공지·최신활동 **조회 상태기계**(loading / loadError+재시도 / empty / list) + StandardHomeTemplate 조립 |
| `CommunitySiteFooter` | `@o4o/shared-space-ui` | 브랜드 블록 + 섹션 그리드 + 하단 법정정보 바 |
| `buildCommunityPrimaryNav` | `@o4o/ui` | PrimaryNav 조립 순서 (base → contextual → trailing → guestTrailing) |

세 부품 모두 `serviceKey` 분기·API client 의존·하드코딩 링크가 없다 (정적 테스트로 고정).

## 4. 두 서비스 채택

| | KPA-Society | Pharmacy-Hub |
|---|---|---|
| 커뮤니티 홈 | `/` (기존 canonical 유지) | `/` (신규 canonical · 공개) |
| 중복 홈 | 없음 | 소개형 `HomePage` 폐기 · `/community` → `/` redirect |
| 데이터 | `homeApi.getNotices/getLatest` + `communityApi.getHeroAds` | `homeApi.getNotices/getLatest` (`optionalAuth`) |
| nav config | `KPA_BASE_NAV` / `KPA_CONTEXTUAL_NAV` / trailing | `PH_BASE_NAV` / `PH_CONTEXTUAL_NAV` / `PH_TRAILING_NAV` |
| footer config | `KPA_FOOTER_SECTIONS` (4 섹션) | `PH_FOOTER_SECTIONS` (4 섹션) |

PH 진입점 손실 0 — 가입 상태 밴드는 `latestHeaderSlot`, 역할별 진입 카드는 `valueGuideSlot` 로 이관했다.

**실패 삼킴 제거**: KPA `home.ts` 의 `prefetchAll()`(`Promise.allSettled` + `catch(() => {})`)를 제거하고
어댑터가 실패를 **throw** 하도록 바꿨다 — 조회 실패가 "0건"으로 위장되지 않는다.

## 5. Home/Menu 항목 census

| # | 항목 | 판정 |
|---|---|---|
| 1 | 공지 조회·표시 | FULLY_COMMON |
| 2 | 최신 활동 조회·탭 전환 | FULLY_COMMON |
| 3 | 조회 4상태 계약(loading/loadError+재시도/empty/list) | FULLY_COMMON |
| 4 | Home 레이아웃(StandardHomeTemplate 슬롯 순서) | FULLY_COMMON |
| 5 | O4O 도움말 섹션 + `valueGuidePlacement="after-help"` | FULLY_COMMON |
| 6 | Hero 밴드 내용 | CONFIG_DIFFERENCE |
| 7 | 공지 우측 슬롯 | CONFIG_DIFFERENCE (KPA 약사공론 뉴스 / PH 이용 안내) |
| 8 | latest 탭 구성·accent 색 | CONFIG_DIFFERENCE |
| 9 | latestHeaderSlot | CONFIG_DIFFERENCE (PH 가입 상태 밴드) |
| 10 | App 진입 카드 | CONFIG_DIFFERENCE |
| 11 | 역할별 진입 카드(valueGuideSlot) | CONFIG_DIFFERENCE |
| 12 | 하단 CTA | CONFIG_DIFFERENCE |
| 13 | 도움말 usageItems 링크 | CONFIG_DIFFERENCE |
| 14 | PrimaryNav 조립 순서 | FULLY_COMMON |
| 15 | GlobalHeader chrome(로그인·유저 메뉴·모바일 드로어) | FULLY_COMMON |
| 16 | PrimaryNav 1-level 계약(`children` 미부활) | FULLY_COMMON |
| 17 | base nav 항목 | CONFIG_DIFFERENCE |
| 18 | contextual nav 항목·노출 조건 | CONFIG_DIFFERENCE |
| 19 | trailing / guestTrailing 항목 | CONFIG_DIFFERENCE |
| 20 | Footer View 구조 | FULLY_COMMON |
| 21 | Footer 법정정보(PublicLegalFooterInfo) | FULLY_COMMON |
| 22 | Footer 섹션·링크 목록 | CONFIG_DIFFERENCE |
| 23 | Footer 브랜드·copyright | CONFIG_DIFFERENCE |
| 24 | 서비스 루트 `/` = 커뮤니티 홈 | FULLY_COMMON |
| 25 | 중복 홈 0 (`/community` redirect) | FULLY_COMMON |
| 26 | 서비스 소개 축 (`/about` · `/contact`) | **PH_ADOPTION_GAP** |

- FULLY_COMMON 12 / CONFIG_DIFFERENCE 13 / PH_ADOPTION_GAP 1 / 미조사 0

**PH_ADOPTION_GAP #26**: PharmacyHub 에는 `/about`·`/contact` 에 해당하는 화면이 없다.
route 없는 메뉴를 넣는 것은 데드링크이므로(§11) 이번 WO 에서는 **넣지 않고 gap 으로 기록**한다.
서비스 소개 콘텐츠가 필요한 별도 WO 대상이다.

## 6. 검증

| 항목 | 결과 |
|---|---|
| `packages/shared-space-ui` 테스트 | 7 files / **109 passed** (신규 정적 고정 29 포함) |
| `packages/ui` 테스트 | 1 file / **9 passed** |
| `web-kpa-society` typecheck | PASS (`tsc --noEmit`) |
| `web-pharmacy-hub` typecheck | PASS (`tsc --noEmit`) |
| `web-kpa-society` production build | PASS |
| `web-pharmacy-hub` production build | PASS |
| nav·footer 데드링크 스캔 | KPA 15 / PH 16 href **전부 실제 route 매칭 — 데드링크 0** |
| KPA 지부·분회·데모 재스캔 | user-facing 문자열 **0** (주석 내 이력 설명만 잔존) |
| 프로덕션 smoke — desktop 1440x900 | KPA `/` · PH `/` · PH `/community` → `/` redirect **PASS** |
| 프로덕션 smoke — mobile 390x844 | KPA `/` · PH `/` **PASS** — 드로어 nav 동작, 가로 overflow 0 (scrollWidth 375 ≤ 390), JS 예외 0, 백지 0 |

> 주의: `packages/shared-space-ui` 테스트는 반드시
> `npx vitest run --config packages/shared-space-ui/vitest.config.mjs` 로 실행한다.
> `--dir` 로 실행하면 jsdom 환경이 적용되지 않아 렌더 테스트가 거짓 실패한다.

**smoke 상세** (비로그인 방문자 기준)

- KPA `/` — nav 커뮤니티 / 서비스 안내 / About / Contact, 공지 1건, 최신글 6건,
  서비스 카드 5, `/guide/usage` CTA, 역할 카드 3, 공통 4단 푸터. 모바일에서는
  헤더가 드로어로 접히고 하단 탭(커뮤니티 / 로그인)이 함께 렌더된다.
- PH `/` — nav 커뮤니티 / 교육 / 이용 안내, 공지·최신글은 **정상 0건**
  (`/home/latest`·forum posts 모두 HTTP 200 + 빈 배열 — 조회 실패 위장 아님),
  앱 카드 5, `/join` CTA, 역할별 진입점 2, 공통 4단 푸터.
- 콘솔 오류: 비로그인 상태의 `auth/me`·`auth/refresh` 401 외 JS 예외 0.

## 7. Git

- 시작 `4571c3269` → 코드 커밋 `690a108f4` (push 완료) → 본 CHECK 문서 커밋
- path-specific stage 48 경로. 같은 작업트리의 다른 세션 WIP
  (`WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-...`) 은 커밋하지 않았다.
  `services/web-pharmacy-hub/src/App.tsx` 는 두 WO 가 함께 만진 유일한 파일이라
  **본 WO hunk 만** 커밋하고 상대 세션 hunk 는 작업트리에 그대로 남겼다.
