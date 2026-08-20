# CHECK-O4O-GUIDE-ENTRY-AND-LANDING-COMMONIZATION-V1

> **WO**: `WO-O4O-GUIDE-ENTRY-AND-LANDING-COMMONIZATION-V1`
> **성격**: 진입점 재측정 + landing 공통화 (frontend only · backend/DB 무변경)
> **작성일**: 2026-08-20
> **시작 commit**: `176ce49f9`
> **선행 문서**: [`CHECK-O4O-GUIDE-CROSS-SERVICE-CENSUS-V1`](CHECK-O4O-GUIDE-CROSS-SERVICE-CENSUS-V1.md) · [`CHECK-O4O-GUIDE-STALE-ROUTE-AND-COPY-CONTRACT-CLEANUP-V1`](CHECK-O4O-GUIDE-STALE-ROUTE-AND-COPY-CONTRACT-CLEANUP-V1.md)
> **대상 서비스**: KPA-Society / K-Cosmetics / GlycoPharm / Neture / PharmacyHub

---

## 1. 전체 집계 (WO §21 필수 블록)

```
조사 Guide entry: 42
공통 landing adoption 서비스: 4
VIEW_DUPLICATED_FIXED: 2
DEAD_ENTRY_FIXED: 3
SERVICE_GUIDE_LINKED: 3
미조사: 0
```

- **조사 Guide entry 42** = KPA 11 + K-Cosmetics 4 + GlycoPharm 4 + Neture 22 + PharmacyHub 1(부재 확인).
- **공통 landing adoption 4** = 신규 공통 View `GuideServiceIntroPage` 채택 3(KPA · K-Cosmetics · GlycoPharm) + 기존 shared guide shell 유지 1(Neture `/guide` = `GuideFeaturesPage`).
- **VIEW_DUPLICATED_FIXED 2** = census 의 `VIEW_DUPLICATED` 2 cell (K-Cosmetics ↔ GlycoPharm `ServiceGuidePage`). 실제 수렴 파일은 KPA 포함 3개.
- **DEAD_ENTRY_FIXED 3** = KPA · K-Cosmetics · GlycoPharm 의 `/guide` (route 없음 → not-found) 를 canonical 진입점으로 연결.
- **SERVICE_GUIDE_LINKED 3** = 위 3 서비스에서 `/service-guide` ↔ `/guide/*` 양방향 연결.

---

## 2. `/service-guide` vs `/guide` 역할 판정 (WO §3)

**판정: A — 역할이 다름. 양쪽 유지 + 상호 연결.**

| 축 | `/service-guide` | `/guide/*` |
|---|---|---|
| 질문 | "이 서비스는 무엇인가" | "이 기능을 어떻게 쓰는가" |
| 대상 | 비로그인 방문자 · 가입 검토자 · 제휴 문의자 | 이미 서비스를 쓰는 사용자 |
| 내용 | 서비스 소개 · 이용 대상 · 주요 기능 개요 · 이용 흐름 · 문의 | O4O 개요 · 활용 방법 · 기능별 이용 방법(11~15 페이지) |
| 진입 | 상단 헤더 "서비스 안내" · 푸터 | 푸터 "이용 가이드" · 기능 화면 `GuideBackLink` · 헤더 "이용 안내"(Neture) |
| 편집 | 정적 copy | `GuideEditableSection` / guide-contents 로 운영자 편집 가능(서비스별) |

**근거**

1. 두 축의 **inbound link 출처가 다르다.** `/service-guide` 는 공개 헤더·푸터에서만 들어오고, `/guide/*` 는 로그인 후 기능 화면(POP · QR · 사이니지 · 블로그)의 `GuideBackLink` 에서 들어온다.
2. `/guide/features/*` 는 실제 route·권한·조작 절차를 설명하는 **매뉴얼**이고, `/service-guide` 는 route 를 나열하지 않는 **공개 소개**다. KPA `/service-guide` 는 주석에서 명시적으로 "경영지원 세부 기능을 공개 안내에 나열하지 않는다"고 정하고 있어 두 문서의 상세도 기준이 다르다.
3. Neture 는 `/guide` 만, KPA/K-Cosmetics/GlycoPharm 은 `/service-guide` 만 헤더에 노출한다. 한쪽으로 redirect 통합하면 **한쪽 서비스의 헤더 진입 의미가 사라진다.**

→ 따라서 **redirect 로 합치지 않고**, 두 화면을 서로 링크해 고립 상태만 해소했다 (WO §9).

---

## 3. 5서비스 진입 matrix (WO §2 — 미조사 0)

`판정` 열: `KEEP` = 변경 없음 / `LINKED` = 이번 WO 에서 상호 연결 추가 / `FIXED` = dead entry 해소 / `NOT_EXPOSED` = 의도적 미노출.

### 3-1. KPA-Society (11)

| # | entry source | label | target route | landing page | deep-link | shared View | 판정 |
|:-:|---|---|---|---|:-:|:-:|:-:|
| 1 | 헤더 nav (`config/navigation.ts:23`) | 서비스 안내 | `/service-guide` | ServiceGuidePage | N | **YES (신규)** | LINKED |
| 2 | `components/Footer.tsx:29` | 서비스 안내 | `/service-guide` | ServiceGuidePage | N | YES (신규) | LINKED |
| 3 | `components/Footer.tsx:27` | 이용 가이드 | `/guide/intro` | GuideIntroPage | Y | YES (기존) | LINKED |
| 4 | `App.tsx:1156` (not-found 안내) | 이용 가이드 | `/guide/intro` | GuideIntroPage | Y | YES (기존) | KEEP |
| 5 | `pages/about/AboutPage.tsx:133` | 이용 가이드 | `/guide/intro` | GuideIntroPage | Y | YES (기존) | KEEP |
| 6 | `pages/contact/ContactPage.tsx:98` | 이용 가이드 → | `/guide/intro` | GuideIntroPage | Y | YES (기존) | KEEP |
| 7 | `PharmacyBlogPage.tsx:532` | 블로그 작성 방법 | `/guide/features/blog` | GuideFeatureManualPage | Y | YES (기존) | KEEP |
| 8 | `StorePopPage.tsx:423` | POP 제작 방법 | `/guide/features/pop` | GuideFeatureManualPage | Y | YES (기존) | KEEP |
| 9 | `StoreQRPage.tsx:642` | QR 활용 방법 | `/guide/features/qr` | GuideFeatureManualPage | Y | YES (기존) | KEEP |
| 10 | `StoreSignagePage.tsx:783` | 디지털사이니지 운영 방법 | `/guide/features/signage` | GuideFeatureManualPage | Y | YES (기존) | KEEP |
| 11 | 직접 URL 입력 | — | `/guide` | (route 없음 → not-found) | Y | — | **FIXED** |

operator guide entry: KPA `/operator/guide-contents` 는 **Guide 콘텐츠 편집 콘솔**이며 사용자 진입점이 아니다 (본 WO 범위 밖 · 변경 없음).

### 3-2. K-Cosmetics (4)

| # | entry source | label | target route | landing page | deep-link | shared View | 판정 |
|:-:|---|---|---|---|:-:|:-:|:-:|
| 1 | 헤더 nav (`config/navigation.ts:20`) | 서비스 안내 | `/service-guide` | ServiceGuidePage | N | **YES (신규)** | LINKED |
| 2 | `components/common/Footer.tsx:42` | 서비스 안내 | `/service-guide` | ServiceGuidePage | N | YES (신규) | LINKED |
| 3 | `pages/store/StoreSignagePage.tsx:184` | 디지털사이니지 운영 방법 | `/guide/features/signage` | GuideFeatureManualPage | Y | YES (기존) | KEEP |
| 4 | 직접 URL 입력 | — | `/guide` | (route 없음 → not-found) | Y | — | **FIXED** |

**discoverability 문제 확인** — `/guide/intro` · `/guide/usage` · `/guide/features` 로 가는 **inbound link 가 앱 전체에 0건**이었다. 사이니지 화면 1곳만 deep-link 를 갖고 있어, 가이드 11 페이지가 사실상 URL 을 알아야만 도달 가능했다. → `/service-guide` 하단 "기능 사용 가이드" 블록으로 3개 진입을 노출해 해소.

### 3-3. GlycoPharm (4)

| # | entry source | label | target route | landing page | deep-link | shared View | 판정 |
|:-:|---|---|---|---|:-:|:-:|:-:|
| 1 | 헤더 nav (`config/navigation.ts:21`) | 서비스 안내 | `/service-guide` | ServiceGuidePage | N | **YES (신규)** | LINKED |
| 2 | `components/common/Footer.tsx:59` | 서비스 안내 | `/service-guide` | ServiceGuidePage | N | YES (신규) | LINKED |
| 3 | `StoreSignageMainPage.tsx:636` | 디지털사이니지 운영 방법 | `/guide/features/signage` | GuideFeatureManualPage | Y | YES (기존) | KEEP |
| 4 | 직접 URL 입력 | — | `/guide` | (route 없음 → not-found) | Y | — | **FIXED** |

K-Cosmetics 와 동일한 discoverability 문제. 동일 방식으로 해소.

### 3-4. Neture (22)

| # | entry source | label | target route | landing page | deep-link | shared View | 판정 |
|:-:|---|---|---|---|:-:|:-:|:-:|
| 1 | 헤더 nav (`config/navigation.ts:21`) | 이용 안내 | `/guide` | GuideHomePage(=shared `GuideFeaturesPage`) | N | YES (기존) | KEEP |
| 2 | `pages/CommunityPage.tsx:264` | 이용 안내 | `/guide` | GuideHomePage | N | YES (기존) | KEEP |
| 3 | `pages/supplier/SupplierOrdersPage.tsx:134` | 이용 안내 | `/guide` | GuideHomePage | N | YES (기존) | KEEP |
| 4~22 | 기능·소개 화면 `GuideBackLink` 19건 | 기능별 안내 문구 | `/guide/features/*` · `/guide/business/*` · `/guide/services/*` · `/guide/for-seller#*` · `/guide/o4o-overview` | 각 Guide 페이지 | Y | YES (기존) | KEEP |

Neture 는 `/service-guide` route 가 **없다.** `/guide` 자체가 이미 서비스 소개 + 기능 안내를 겸하는 landing 이며, 이미 shared `GuideFeaturesPage` 를 config 로만 소비하는 wrapper(189 lines)다. → **구조 변경 없음.** (`/guide` 를 redirect 로 덮지 않는다는 사실을 테스트로 고정)

### 3-5. PharmacyHub (1)

| # | entry source | label | target route | landing page | deep-link | shared View | 판정 |
|:-:|---|---|---|---|:-:|:-:|:-:|
| 1 | (없음) | — | — | — | — | — | **NOT_EXPOSED** |

`config/navigation.ts` 주석에 "`/contact` · `/service-guide` 는 여전히 route 가 없어 넣지 않는다" 가 이미 명시돼 있다. Guide 콘텐츠 0건 상태에서 빈 메뉴를 프로덕션에 노출하지 않는다 (WO §11).

---

## 4. 공통 landing 구조 (WO §5 · §6 · §13)

### 4-1. 기존 shared 우선 재사용

`packages/shared-space-ui/src/guide/` 를 그대로 canonical 기반으로 사용했다. **새 Guide design system 을 만들지 않았다.**

- 기존 8 page template · `styles.ts` · `types.ts` · `copy/{kpa,k-cosmetics,glycopharm,neture}.ts` 유지.
- 서비스별 문구는 **기존 copy 파일을 확장**했다 (신규 copy 파일 0).
- `lucide-react` 는 이미 `@o4o/shared-space-ui` 의 dependency 이고, 4 서비스 tailwind `content` 에 `packages/shared-space-ui/src/**` glob 이 이미 있어 **package.json · lockfile · tailwind config 변경 0**.

### 4-2. 신규 공통 View

`packages/shared-space-ui/src/guide/GuideServiceIntroPage.tsx` (187 lines)

렌더 블록: `Hero(badge · headline · lead · heroActions)` → `intro` → `audiences` → `features(+note)` → `steps` → `relatedGuide(선택)` → `contact`.

계약 준수:

- fetch / axios 직접 호출 **없음**
- react-router 직접 서비스 분기 **없음** (`Link` 만 사용, `to` 는 props)
- `if (service === ...)` 형태 분기 **없음**
- 서비스별 route 하드코딩 **없음** — 모든 경로가 props
- Tailwind class 는 기존 3개 페이지와 **동일 문자열 유지** (WO §14 디자인 개편 금지)

### 4-3. 데이터/copy 분리

`types.ts` 에 추가한 계약(71 lines):
`GuideIconComponent` · `GuideServiceIntroCard` · `GuideServiceIntroAction` · `GuideServiceIntroCardSection` · `GuideServiceIntroStep` · `GuideServiceIntroPageProps`.

서비스별 config(각 109 lines, 기존 copy 파일에 추가):
`kpaServiceIntroProps` · `kCosmeticsServiceIntroProps` · `glycopharmServiceIntroProps`.

`GuideIntroPageProps.bottomNav` 에 **선택 필드** `serviceGuide?: GuideNavLink` 를 추가(additive · 기존 호출부 무영향)해 `/guide/intro` 하단에서 `/service-guide` 로 돌아갈 수 있게 했다.

---

## 5. landing before / after

| 서비스 | before | after |
|---|---|---|
| KPA | `pages/service-guide/ServiceGuidePage.tsx` 219 lines (자체 JSX + 자체 데이터) | 13 lines wrapper → shared `GuideServiceIntroPage` + `kpaServiceIntroProps` |
| K-Cosmetics | `pages/ServiceGuidePage.tsx` 222 lines | 13 lines wrapper + `kCosmeticsServiceIntroProps` |
| GlycoPharm | `pages/ServiceGuidePage.tsx` 221 lines | 13 lines wrapper + `glycopharmServiceIntroProps` |
| Neture | `pages/guide/GuideHomePage.tsx` 189 lines (이미 shared `GuideFeaturesPage` config wrapper) | **변경 없음** |
| PharmacyHub | 없음 | 없음 (구조만 채택 가능 — §7) |

**문구는 공통화 전과 동일하다.** 카드/스텝/문단 텍스트를 그대로 옮겼고, 새로 추가한 사용자 문구는 `relatedGuide` 블록(제목 "기능 사용 가이드" + 링크 3개)뿐이다.

---

## 6. 중복 감소 수치 (WO §18 필수)

```
공통화 전 ServiceGuide/Landing page 수 : 3 (KPA 219 / K-Cosmetics 222 / GlycoPharm 221)
공통화 전 총 lines                      : 662
공통화 후 wrapper lines                 : 39 (13 × 3)
신규·재사용 shared lines                : 278  (View 187 + types 71 + barrel 14 + GuideIntroPage 6)
  └ 서비스별 copy config (문구 이관)     : 327 (109 × 3 — View 아님, 데이터)
제거 duplicated lines                   : 644 (215 + 216 + 213 삭제)
VIEW_DUPLICATED 잔존                    : 0
```

레이아웃 JSX 기준으로는 **3벌 → 1벌**로 수렴했다. copy config 327 lines 는 중복이 아니라 서비스별 문구 데이터이며, 기존 페이지 안에 섞여 있던 것을 그대로 옮긴 것이다.

---

## 7. PharmacyHub 처리 (WO §11)

- Guide copy 작성 **0건** · 기능별 Guide 생성 **0건** (WO §19 제외 범위 준수)
- navigation entry 추가 **없음** — 콘텐츠 0 상태에서 빈 Guide 메뉴를 프로덕션에 노출하지 않는다
- **adoption 가능 구조 확인**:
  - `GuideServiceIntroPageProps` 는 service-neutral (서비스 이름·경로가 전부 props)
  - `services/web-pharmacy-hub/tailwind.config.js` 에 `../../packages/shared-space-ui/src/**/*.{ts,tsx}` glob 이 **이미 존재** → 별도 조치 불필요
  - 후속 B-1 에서 필요한 것은 `copy/pharmacy-hub.ts` 의 `pharmacyHubServiceIntroProps` 1개 + route 1줄 + nav 1줄

---

## 8. deep-link 계약 회귀 (WO §8)

| URL | before | after |
|---|---|---|
| `/guide/intro` (+하위 4) | 200 | 200 (하단에 "서비스 소개" 링크만 추가) |
| `/guide/usage` | 200 | 200 |
| `/guide/features` (+하위 7~11) | 200 | 200 |
| `/service-guide` | 200 | 200 (하단 "기능 사용 가이드" 블록 추가) |
| `/guide` (KPA · KCos · GP) | not-found | **302 성격의 `<Navigate replace>` → `/guide/intro`** |
| `/guide` (Neture) | 200 | 200 (변경 없음) |

redirect loop 없음: `/guide` → `/guide/intro` 는 단방향이며 `/guide/intro` 는 자체 route 가 있다.

---

## 9. 테스트 (WO §15)

`packages/shared-space-ui/src/guide/__tests__/guideServiceIntro.test.tsx` (150 lines, 신규)

| 그룹 | 항목 | 결과 |
|---|---|---|
| 렌더 계약 | headline · lead · 모든 카드 · step 렌더 (3 서비스) | PASS |
| 렌더 계약 | hero action · 문의 CTA 가 실제 `<a href>` (3 서비스) | PASS |
| 렌더 계약 | `relatedGuide` 링크로 `/guide` 체계 연결 (3 서비스) | PASS |
| 렌더 계약 | 선택 데이터 없이도 렌더 (최소 props) | PASS |
| 렌더 계약 | mobile-friendly — 카드 그리드 1열 기본 + `sm:` 다열 | PASS |
| 렌더 계약 | `renderText` 주입 시 lead · intro 문단 대체 | PASS |
| Adoption | 3 wrapper 가 공통 View + copy config 만 사용 (자체 JSX·lucide 금지, 30줄 미만) | PASS |
| Route contract | `/service-guide` · `/guide/intro` · `/guide/usage` · `/guide/features` 유지 (3 서비스) | PASS |
| Route contract | `/guide` → `/guide/intro` `<Navigate replace>` (3 서비스) | PASS |
| Route contract | Neture `/guide` 는 자체 landing 유지 (redirect 로 덮지 않음) | PASS |
| Route contract | 3 서비스 guide intro 하단 `/service-guide` 상호 연결 | PASS |

실행:

```
npx vitest run --config packages/shared-space-ui/vitest.config.mjs packages/shared-space-ui/src/guide/__tests__/
→ Test Files 2 passed (2) / Tests 31 passed (31)
```

(기존 `guideRouteContract.test.ts` 8 tests 포함 — 회귀 없음)

---

## 10. 정적 검증 (WO §16)

| 항목 | 결과 |
|---|---|
| `@o4o/shared-space-ui` typecheck (`tsc -b`) | PASS |
| `@o4o/web-kpa-society` build | PASS |
| `@o4o/web-k-cosmetics` build | PASS |
| `glycopharm-web` build | PASS |
| `@o4o/web-neture` build | PASS |
| `@o4o/web-pharmacy-hub` build | PASS |
| backend (api-server) | 변경 0 → 검증 불필요 |
| DB migration | **0건** |

---

## 11. Production browser smoke (WO §17)

배포 commit `b6f272df3` · deploy run `32342076307` (6 web service job 전부 success) 후
desktop(1440×900) · mobile(390×844) 2 viewport 로 실제 브라우저 접속 검증.

점검 항목: HTTP status · 최종 URL(redirect 결과) · h1 · anchor 수 · body 텍스트 길이 ·
`scrollWidth - clientWidth`(mobile overflow) · `pageerror` / `console.error`.

---

## 12. Smoke 결과

### 12-1. 전체 결과

**총 40 case (20 URL × 2 viewport) — 전부 PASS.**

| 공통 기준 | 결과 |
|---|---|
| dead navigation | **0** (전 case 200) |
| white screen | **0** (전 case h1 존재 · body text ≥ 1,249자) |
| JS exception / console error | **0** |
| 신규 404 · 500 | **0** |
| mobile overflow | **0** (`scrollWidth - clientWidth = 0` 전 case) |
| `/service-guide` ↔ `/guide` 고립 | **해소** (§12-3) |

### 12-2. URL 별 (desktop / mobile 동일 결과)

| 서비스 | URL | status | 최종 URL | h1 | 판정 |
|---|---|:-:|---|---|:-:|
| KPA | `/service-guide` | 200 | `/service-guide` | 약사와 약대생을 위한 커뮤니티 서비스 안내 | PASS |
| KPA | `/guide` | 200 | **`/guide/intro`** | O4O 개요 | PASS (신규 alias) |
| KPA | `/guide/intro` | 200 | `/guide/intro` | O4O 개요 | PASS |
| KPA | `/guide/usage` | 200 | `/guide/usage` | 서비스 활용 방법 | PASS |
| KPA | `/guide/features` | 200 | `/guide/features` | 기능별 이용 방법 | PASS |
| KPA | `/guide/features/signage` | 200 | 동일 | 디지털 사이니지 이용 방법 | PASS |
| K-Cosmetics | `/service-guide` | 200 | `/service-guide` | 화장품 매장 운영을 위한 O4O 서비스 안내 | PASS |
| K-Cosmetics | `/guide` | 200 | **`/guide/intro`** | O4O 개요 | PASS (신규 alias) |
| K-Cosmetics | `/guide/intro` | 200 | `/guide/intro` | O4O 개요 | PASS |
| K-Cosmetics | `/guide/usage` | 200 | `/guide/usage` | 서비스 활용 방법 | PASS |
| K-Cosmetics | `/guide/features` | 200 | `/guide/features` | 기능별 이용 방법 | PASS |
| K-Cosmetics | `/guide/features/signage` | 200 | 동일 | 디지털 사이니지 이용 방법 | PASS |
| GlycoPharm | `/service-guide` | 200 | `/service-guide` | 약국 운영을 위한 O4O 서비스 안내 | PASS |
| GlycoPharm | `/guide` | 200 | **`/guide/intro`** | O4O 개요 | PASS (신규 alias) |
| GlycoPharm | `/guide/intro` | 200 | `/guide/intro` | O4O 개요 | PASS |
| GlycoPharm | `/guide/usage` | 200 | `/guide/usage` | 서비스 활용 방법 | PASS |
| GlycoPharm | `/guide/features` | 200 | `/guide/features` | 기능별 이용 방법 | PASS |
| GlycoPharm | `/guide/features/signage` | 200 | 동일 | 디지털 사이니지 이용 방법 | PASS |
| Neture | `/guide` | 200 | **`/guide`** (redirect 없음) | O4O 플랫폼 이용 안내 | PASS (회귀 없음) |
| Neture | `/guide/o4o-overview` | 200 | 동일 | O4O 개요 | PASS |

### 12-3. 고립 해소 확인 (실제 렌더된 `<a href>` 검사)

| 서비스 | `/service-guide` → `/guide/intro` | → `/guide/usage` | → `/guide/features` | `/guide/intro` → `/service-guide` |
|---|:-:|:-:|:-:|:-:|
| KPA | OK | OK | OK | OK |
| K-Cosmetics | OK | OK | OK | OK |
| GlycoPharm | OK | OK | OK | OK |

공통화 전 이 6개 링크는 **전부 0건**이었다 (§3-2 · §3-3 discoverability 문제).

---

## 13. 잔존 Guide coverage gap (본 WO 범위 밖)

- PharmacyHub Guide 콘텐츠 15건 — 후속 **B-1**
- 4 서비스 Guide coverage gap 13건 — census `NOT_IMPLEMENTED` 잔여분
- Guide screenshot 신규 제작 · Guide copy 전면 rewrite — 미착수 (WO §19 제외)

---

## 14. 문서 정합 (CLAUDE.md §16)

기준 문서(`docs/baseline/` · `docs/architecture/` · `docs/rules/` · `docs/platform/` · `docs/guides/`) 에서 이번 조사 중 발견된 drift **없음**.
