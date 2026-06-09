# IR-O4O-NETURE-O4O-LEGACY-PAGE-DEPRECATION-AUDIT-V1

> **조사 전용 (Investigation Only).** 코드/라우트/링크 변경 없음. 문서만 산출.
> 후속 정리는 별도 WO에서 원자적으로 수행한다.

- **작업명**: IR-O4O-NETURE-O4O-LEGACY-PAGE-DEPRECATION-AUDIT-V1
- **작성일**: 2026-06-09
- **대상 서비스**: Neture (`services/web-neture`) + `@o4o/shared-space-ui` guide copy
- **트리거**: `/guide/o4o-overview` Hero 의 "O4O 플랫폼 자세히 보기 → `/o4o`" 링크가 초기 사업 설명 페이지를 가리킴. Guide 체계 정리 후 `/o4o` 계열 페이지의 중복·미사용 여부 점검 필요.

---

## ⚠️ 0. 가장 중요한 결론 (먼저 읽을 것)

### 0-1. 현재 작업 트리에 미커밋 `/o4o deprecate` WIP 가 이미 부분 적용되어 있다

조사 시점 working tree 의 `App.tsx` · `seoRegistry.ts` 에는 다른 세션의 `/o4o deprecate` 편집이 **이미 적용**되어 있다 (미커밋). 이 WIP 는 아래 라우트를 제거한다:

- `/o4o` (→ `O4OMainPage` 제거)
- `/o4o/apply` (→ `O4OApplyPage` 제거)
- `/o4o/intro`, `/o4o/other-targets`, `/o4o/business-inquiry`, `/o4o/consultation`
- `/o4o/concepts`, `/o4o/channel-map`, `/o4o/principles`, `/o4o/structure`, `/o4o/services`
- `/platform/principles`
- `seoRegistry.ts` 의 `'/o4o'` 엔트리

본 IR 의 라우트 전수 목록은 **HEAD(커밋 상태)** 기준으로 작성한다. working tree WIP 는 별도 표기한다.

### 0-2. 핵심 발견 — 현재 WIP 는 과잉(over-reach)이며 그대로 커밋하면 안 된다

이번 조사로 두 가지가 확인되었다:

1. **`/o4o/apply` 는 실제로 동작하는 사업 문의 접수 기능이다.**
   `ApplyForm.tsx:197` 가 production-live endpoint `POST /api/v1/platform/inquiries` 에 제출한다. Guide copy 의 `primaryAction` **12개** 와 `LoginModal.tsx:113` 의 로그인 후 navigate 가 모두 `/o4o/apply` 를 가리킨다. → **삭제 시 사업 문의 퍼널 전체가 데드링크.**

2. **`/o4o` 는 공개 SEO 랜딩 + 퍼널 허브다.**
   `O4OMainPage` (실 컴포넌트, 미리다이렉트 아님). 내부 링크 **15곳 이상** + Hero `primaryAction(neture.ts:1423)` 가 `/o4o` 를 가리킨다.

따라서 현재 WIP 처럼 `/o4o` 와 `/o4o/apply` 까지 한꺼번에 제거하면 **수십 개의 데드링크**가 발생한다. **권장: 현재 WIP 를 그대로 커밋하지 말고 revert/축소.** 진짜 deprecate 대상은 redirect-stub 레거시 경로로 훨씬 좁다(§9~§10).

---

## 1. 조사 목적

`/o4o` 계열 페이지·라우트·링크를 전수 조사하여 각 항목을 KEEP / REPLACE_LINK / REDIRECT / DELETE / MERGE_THEN_DELETE 로 판정하고, 안전한 후속 WO 범위를 확정한다.

## 2. 조사 범위

- `services/web-neture/src/App.tsx` (라우트)
- `services/web-neture/src/config/seoRegistry.ts`
- `packages/shared-space-ui/src/guide/copy/neture.ts` (`primaryAction`)
- `services/web-neture/src/pages/o4o/**`, `pages/guide/**`, 기타 `/o4o` 문자열 등장 파일
- `/guide/o4o-overview` Hero 링크 정의처

조사 방식: **읽기 전용**. `git grep`, `git show HEAD:`, 파일 read 만 사용.

---

## 3. `/o4o` 계열 라우트 목록 (HEAD 기준)

`App.tsx` HEAD 기준 22개 라우트.

### 3-A. 실 컴포넌트 라우트 (redirect 아님)

| # | 경로 | 컴포넌트 | 비고 |
|---|------|----------|------|
| 1 | `/o4o` | `O4OMainPage` | 공개 랜딩 페이지 |
| 2 | `/o4o/apply` | `O4OApplyPage` (+`ApplyForm`) | **실동작 문의 폼** |
| 3 | `/o4o/site-operator` | `SiteOperatorPage` | 사이트 운영자 진입 |
| 4 | `/o4o/targets/pharmacy` | `PharmacyTargetPage` | 업종별 |
| 5 | `/o4o/targets/clinic` | `ClinicTargetPage` | 업종별 |
| 6 | `/o4o/targets/salon` | `SalonTargetPage` | 업종별 |
| 7 | `/o4o/targets/optical` | `OpticalTargetPage` | 업종별 |
| 8 | `/o4o/targets/dental` | `DentalTargetPage` | 업종별 |

### 3-B. Redirect-only 라우트 (Navigate stub)

| # | 경로 | → 대상 | 도입 WO |
|---|------|--------|---------|
| 9 | `/o4o/intro` | `/o4o` | CONCEPT-PAGES-DEPRECATE |
| 10 | `/o4o/other-targets` | `/o4o` | OTHER-TARGETS-ABSORB |
| 11 | `/o4o/business-inquiry` | `/o4o/apply` | APPLY-PAGE-CONSOLIDATION |
| 12 | `/o4o/consultation` | `/o4o/apply` | APPLY-PAGE-CONSOLIDATION |
| 13 | `/o4o/concepts` | `/o4o` | CONCEPT-PAGES-DEPRECATE |
| 14 | `/o4o/channel-map` | `/o4o` | CONCEPT-PAGES-DEPRECATE |
| 15 | `/o4o/principles` | `/o4o` | CONCEPT-PAGES-DEPRECATE |
| 16 | `/o4o/structure` | `/o4o` | CONCEPT-PAGES-DEPRECATE |
| 17 | `/o4o/services` | `/o4o` | CONCEPT-PAGES-DEPRECATE |
| 18 | `/o4o/channels/pharmacy` | `/o4o/targets/pharmacy` | CHANNEL-PAGES-ABSORB |
| 19 | `/o4o/channels/optical` | `/o4o/targets/optical` | CHANNEL-PAGES-ABSORB |
| 20 | `/o4o/channels/medical` | `/o4o/targets/clinic` | CHANNEL-PAGES-ABSORB |
| 21 | `/o4o/channels/dental` | `/o4o/targets/dental` | CHANNEL-PAGES-ABSORB |
| 22 | `/platform/principles` | `/o4o/principles` | (레거시 체인 → `/o4o`) |

> 9~22 는 이미 이전 WO 들로 "메인 흡수 후 redirect" 처리된 **레거시 stub**. 페이지 파일은 보존, 라우트만 redirect.

---

## 4. `/o4o` 계열 컴포넌트 파일 목록

`services/web-neture/src/pages/o4o/`:

| 파일 | 라우트 연결 | 상태 |
|------|------------|------|
| `O4OMainPage.tsx` | `/o4o` | 실사용 (랜딩) |
| `O4OApplyPage.tsx` | `/o4o/apply` | 실사용 (폼 래퍼) |
| `ApplyForm.tsx` | (내포) | **실동작 — API 제출** |
| `SiteOperatorPage.tsx` | `/o4o/site-operator` | 실사용 |
| `targets/PharmacyTargetPage.tsx` 외 4개 | `/o4o/targets/*` | 실사용 |
| `targets/index.ts` | (배럴) | 실사용 |

레거시 stub 이 가리키던 원본 개념 페이지 컴포넌트(별도 위치, 라우트는 redirect 로 대체됨):

| 파일 | 현재 라우트 | 비고 |
|------|------------|------|
| `pages/manual/concepts/ConceptsPage.tsx` | `/manual/concepts` (별도 생존) | "채널" 개념 문서 |
| `pages/PlatformPrinciplesPage.tsx` | (직접 라우트 없음) | 약사법 특화 원칙 |
| `pages/channel/ChannelSalesStructurePage.tsx` | `/channel/structure` (별도 생존) | 매장 실행 가이드 |
| `pages/guide/GuideIntroConceptPage.tsx`, `GuideIntroStructurePage.tsx` | `/guide/intro/*` | 신 Guide 체계 |

> 즉 `/o4o/concepts`·`/o4o/structure`·`/o4o/principles` 의 "내용"은 별도 경로(`/manual/concepts`, `/channel/structure`, `/guide/intro/*`)로 이미 분산·생존. `/o4o/*` stub 은 구 URL 가드일 뿐.

---

## 5. 내부 링크 사용 현황

### 5-A. `→ /o4o` 참조처 (삭제 시 데드링크)

| 파일:line | 맥락 |
|-----------|------|
| `components/layouts/SupplierOpsLayout.tsx:217` | 레이아웃 링크 |
| `pages/AboutPage.tsx:36` | "O4O 플랫폼 소개" 카드 |
| `pages/channel/ChannelSalesStructurePage.tsx:272` | CTA |
| `pages/guide/GuideHomePage.tsx:56` | Guide Home 항목 "O4O 플랫폼 소개" |
| `pages/manual/concepts/ConceptsPage.tsx:101` | 관련 링크 |
| `pages/o4o/ApplyForm.tsx:522` | 폼 하단 복귀 링크 |
| `pages/o4o/SiteOperatorPage.tsx:146` | 복귀 링크 |
| `pages/o4o/targets/{Clinic,Dental,Optical,Pharmacy,Salon}TargetPage.tsx` (각 ~276) | 각 target 페이지 복귀 링크 |
| `pages/PartnerInfoPage.tsx:72` | 배너 링크 |
| `pages/PartnerOverviewInfoPage.tsx:207` | CTA |
| `pages/PlatformPrinciplesPage.tsx:215` | 관련 링크 |
| `pages/seller/MedicalOverviewPage.tsx:381` | CTA |
| `pages/seller/SellerOverviewByIndustry.tsx:268` | CTA |
| `pages/SellerOverviewPage.tsx:210` | CTA |
| `packages/shared-space-ui/src/guide/copy/neture.ts:1423` | **`/guide/o4o-overview` Hero `primaryAction`** |

### 5-B. `→ /o4o/apply` 참조처 (삭제 시 사업 퍼널 붕괴)

| 파일:line | 맥락 |
|-----------|------|
| `components/LoginModal.tsx:113` | 로그인 후 `navigate('/o4o/apply')` |
| `pages/o4o/O4OMainPage.tsx:74, 375` | Hero/하단 CTA |
| `pages/o4o/O4OMainPage.tsx:325` | `/o4o/apply?industry=other` |
| `pages/o4o/targets/*TargetPage.tsx` (각 ~180) | `/o4o/apply?industry={업종}` ×5 |
| `packages/shared-space-ui/src/guide/copy/neture.ts` — **12개** `primaryAction` | line 1570, 2020, 2350, 2564, 2758, 2956, 3149, 3343, 3538, 3749, 3924 등 "운영 참여 검토 신청 →" |

### 5-C. 레거시 stub 경로 참조처 (stub 제거 시 영향)

| 파일:line | 참조 |
|-----------|------|
| `pages/AboutPage.tsx:37` | `/o4o/intro` |
| `pages/AboutPage.tsx:41` | `/o4o/concepts` |
| `pages/AboutPage.tsx:42` | `/o4o/principles` |
| `pages/AboutPage.tsx:46` | `/o4o/structure` |
| `pages/AboutPage.tsx:47` | `/o4o/channel-map` |
| `pages/AboutPage.tsx:56` | `/o4o/other-targets` |
| `packages/shared-space-ui/src/guide/copy/neture.ts:638` | `/o4o/business-inquiry` (본문 텍스트) |

> `AboutPage` 가 stub 경로의 최대 소비처. stub 을 진짜 삭제하려면 AboutPage 링크를 먼저 교체해야 한다.

---

## 6. `/guide/o4o-overview` Hero 링크 현황

| 항목 | 값 |
|------|-----|
| 정의 파일 | `packages/shared-space-ui/src/guide/copy/neture.ts:1423` |
| 소속 export | `netureGuideO4OOverviewProps` (line 38~) |
| 페이지 컴포넌트 | `pages/guide/GuideO4OOverviewPage.tsx` (`PAGE_KEY='guide/o4o-overview'`) |
| 라우트 | `App.tsx:684` `/guide/o4o-overview` |
| 현재 링크 | `primaryAction: { label: 'O4O 플랫폼 자세히 보기 →', to: '/o4o' }` |

**판정**: `/o4o` (O4OMainPage) 는 KEEP 이 권장되므로 **Hero 링크는 그대로 유효**. 변경 불필요.
선택지: 회원 동선을 Guide 내부로 더 묶고 싶으면 `to: '/guide/intro'` 로 REPLACE_LINK 가능하나, `/o4o` 는 더 풍부한 공개 설명 페이지라 현 상태 유지가 자연스럽다. (우선순위 낮음)

---

## 7. Guide 체계와의 중복 분석

| 페이지 | 중복도 vs Guide | 성격 |
|--------|----------------|------|
| `O4OMainPage` (`/o4o`) | ~40% | 공개 SEO 랜딩. `GuideO4OOverviewPage` 는 로그인 회원용 구조화 가이드 → **청중·용도 분리** |
| `O4OApplyPage`/`ApplyForm` | 0% | Guide 에 신청 폼 없음. **고유 기능** |
| `AboutPage` (`/about`) | ~30% | 공개 링크 허브(SEO). Guide 는 콘텐츠 |
| `PlatformPrinciplesPage` | ~20% | 약사법(제20조·제45조) 특화 — 고유 |
| `ConceptsPage` (`/manual/concepts`) | 0% | "채널" 개념 문서 — 고유 |
| `ChannelSalesStructurePage` (`/channel/structure`) | ~5% | 매장 실행 가이드(PDF 인쇄 포함) — 고유 |
| `GuideO4OOverviewPage` | (기준) | 로그인 회원 O4O 개요 |

---

## 8. 현재 Guide 에 흡수할 문안 (선택)

대부분은 청중/용도가 달라 **물리적 흡수 불요**. 다만 정합성 차원의 선택지:

- `O4OMainPage` "운영 원칙 4가지"(매장 실행 중심 / 역할 분리 / 콘텐츠-실행 연결 / AI 보조) ↔ `netureGuideO4OOverviewProps` 의 핵심 개념 섹션 — **상호 링크**로 연결 권장(흡수 아님).
- `neture.ts:638` 본문의 `/o4o/business-inquiry` 표기 → `/o4o/apply` 로 **문구 갱신**(stub 정리 시).

> 흡수가 "필수"인 고유 문안은 없음. 모두 별도 페이지로 생존시키는 편이 정보 구조상 합리적.

---

## 9. 페이지별 최종 판정

| # | 대상 | 경로 | 판정 | 근거 |
|---|------|------|------|------|
| 1 | `O4OMainPage` | `/o4o` | **KEEP** | 공개 랜딩·퍼널 허브, 15+ 링크 + Hero |
| 2 | `O4OApplyPage`/`ApplyForm` | `/o4o/apply` | **KEEP (절대)** | 실동작 API 문의 퍼널, 12 CTA + LoginModal |
| 3 | `SiteOperatorPage` | `/o4o/site-operator` | **KEEP** | 실사용 |
| 4 | target 5종 | `/o4o/targets/*` | **KEEP** | 실사용, AboutPage·O4OMainPage 링크 |
| 5 | `/o4o/intro` | redirect→`/o4o` | **REDIRECT 유지** | 구 URL 가드, AboutPage:37 참조 |
| 6 | `/o4o/concepts` | redirect→`/o4o` | **REDIRECT 유지** 또는 MERGE_THEN_DELETE | AboutPage:41 참조. 삭제 시 링크 교체 필요 |
| 7 | `/o4o/principles` | redirect→`/o4o` | **REDIRECT 유지** | AboutPage:42 참조 |
| 8 | `/o4o/structure` | redirect→`/o4o` | **REDIRECT 유지** | AboutPage:46 참조 |
| 9 | `/o4o/channel-map` | redirect→`/o4o` | **REDIRECT 유지** | AboutPage:47 참조 |
| 10 | `/o4o/services` | redirect→`/o4o` | **REDIRECT 유지** | 외부 링크 없음 — DELETE 후보(저위험) |
| 11 | `/o4o/other-targets` | redirect→`/o4o` | **REDIRECT 유지** | AboutPage:56 참조 |
| 12 | `/o4o/business-inquiry` | redirect→`/o4o/apply` | **REDIRECT 유지** | neture.ts:638 본문 참조 |
| 13 | `/o4o/consultation` | redirect→`/o4o/apply` | **REDIRECT 유지** | 구 URL 가드 |
| 14 | `/o4o/channels/*` 4종 | redirect→targets | **REDIRECT 유지** | 구 URL 가드 |
| 15 | `/platform/principles` | redirect→`/o4o/principles` | **REDIRECT 유지** | 구 URL 가드 |

> **DELETE 후보는 사실상 `/o4o/services` 정도**(내부 참조 0). 나머지 stub 은 cheap Navigate 이고 SEO/구 URL 보호 가치가 있어 유지가 안전하다.

---

## 10. Redirect / 링크 교체 / 삭제 대상 정리

- **REDIRECT 유지(현 상태가 정답)**: §3-B 의 stub 대부분. 비용 낮고 구 URL·SEO 보호.
- **링크 교체(REPLACE_LINK) 후보(선택)**:
  - `neture.ts:638` 본문 `/o4o/business-inquiry` → `/o4o/apply`.
  - (선택) Hero `neture.ts:1423` `/o4o` → 유지 권장(변경 불요).
- **DELETE 후보**: `/o4o/services` stub (참조 0). 단, 굳이 지울 실익 작음.
- **삭제 금지(KEEP)**: `/o4o`, `/o4o/apply`, `/o4o/site-operator`, `/o4o/targets/*`.

---

## 11. 삭제하면 안 되는 항목 (재강조)

1. `/o4o` — 공개 SEO 랜딩, seoRegistry `'/o4o'` 엔트리, 15+ 내부 링크, Guide Hero.
2. `/o4o/apply` + `ApplyForm` — **production-live 문의 접수**(`POST /api/v1/platform/inquiries`), 12 Guide CTA + LoginModal 퍼널.
3. `/o4o/targets/*`, `/o4o/site-operator` — 실사용 업종/운영자 진입.

---

## 12. 예상 수정 파일 (후속 WO 시)

- `services/web-neture/src/App.tsx` — (stub 정리 시) 일부 Navigate 제거
- `services/web-neture/src/config/seoRegistry.ts` — `'/o4o'` 엔트리는 **유지**
- `services/web-neture/src/pages/AboutPage.tsx` — stub 링크 교체(삭제 택할 경우 선행 필수)
- `packages/shared-space-ui/src/guide/copy/neture.ts` — line 638 본문 문구만(선택)

---

## 13. 후속 WO 제안

### WO 후보 1 — `WO-O4O-NETURE-O4O-WIP-DEPRECATE-REVERT-OR-NARROW-V1` (우선)
현재 미커밋 WIP(`/o4o`·`/o4o/apply` 제거)를 **revert 또는 축소**. `/o4o`·`/o4o/apply` 라우트와 seoRegistry `'/o4o'` 복원. 데드링크 0 확인.

### WO 후보 2 — `WO-O4O-NETURE-O4O-STUB-LINK-CLEANUP-V1` (선택, 저우선)
stub 경로를 실제로 줄이려면: AboutPage 링크를 생존 경로(`/manual/concepts`, `/channel/structure`, `/guide/intro/*`)로 교체 → 그 후 `/o4o/services` 등 참조 0 stub DELETE. neture.ts:638 문구 갱신.

### WO 후보 3 — `WO-O4O-NETURE-O4O-GUIDE-CROSSLINK-V1` (선택, 저우선)
`O4OMainPage` 운영 원칙 ↔ `GuideO4OOverviewPage` 상호 링크 정합화.

---

## 14. 금지 사항 (본 IR 준수)

- `/o4o` 라우트/컴포넌트 삭제 ❌
- `App.tsx`, `seoRegistry.ts`, `neture.ts` primaryAction, Guide Hero 변경 ❌
- redirect 구현/코드 변경 ❌
- 동시 세션 WIP 커밋 ❌ (본 IR 커밋은 **문서 1개만** path-specific)

---

## 15. 최종 판정 (요약)

1. `/o4o`, `/o4o/apply` 는 **실사용·실동작 핵심 페이지** — 삭제 금지.
2. 현재 working tree 의 `/o4o deprecate` WIP 는 **과잉이며 그대로 커밋 금지** → revert/축소(WO 후보 1).
3. 진짜 deprecate 여지는 redirect-stub 일부(`/o4o/services` 등)로 좁고, 대부분은 **REDIRECT 유지가 정답**.
4. `/guide/o4o-overview` Hero `→ /o4o` 는 **유효, 변경 불요**.
5. Guide 로 "흡수 필수"인 고유 문안은 없음 — 상호 링크 정합화만 선택적.

---

*조사자: Claude Code · 2026-06-09 · 읽기 전용(git grep / git show HEAD / file read)으로 수행*
