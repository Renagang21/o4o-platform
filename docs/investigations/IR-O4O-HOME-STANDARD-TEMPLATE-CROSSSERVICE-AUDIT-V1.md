# IR-O4O-HOME-STANDARD-TEMPLATE-CROSSSERVICE-AUDIT-V1

> **조사 전용 (read-only).** 코드/CSS/문구 수정 없음. O4O 4서비스 Home 화면과 `StandardHomeTemplate` 사용 현황을 조사하고, 후속 Home 공통화 작업의 안전한 범위·우선순위를 제시한다.

- **작성일**: 2026-06-04
- **작업 유형**: Investigation (IR)
- **조사 범위**: `services/web-{kpa-society,glycopharm,k-cosmetics,neture}`, `packages/shared-space-ui/src/*`
- **조사 방식**: read-only 병렬 코드 조사(Explore agents) + 핵심 라인 직접 확인

---

## 1. 전체 판정

**Home 공통화는 이미 `StandardHomeTemplate` 레벨에서 대부분 완료되어 있다.** 4서비스 모두 동일 템플릿을 소비하며, 차이는 **의도된 슬롯 콘텐츠**(hero / notices-right / appEntry / cta / help / valueGuide)뿐이다. 따라서 "큰 공통화 WO"는 불필요하고, 남은 것은 **소규모 정합성 2건**이다.

| 핵심 발견 | 판정 |
|-----------|------|
| StandardHomeTemplate 4서비스 공통 소비 | ✅ 공통화 거의 완료 (큰 WO 불필요) |
| **Home Market Trial CTA emoji 잔존** (KPA·KCos `🧪`) | 🔧 정합성 1 — Neture만 FlaskConical, KPA/KCos는 emoji |
| **valueGuidePlacement 불일치** (KPA=after-help / Neture=before-app-entry) | 🔧 정합성 2 — "역할 카드 ↔ 가이드" 흐름 서비스별 상이 |
| 도메인 가드 | ✅ 4서비스 모두 clean (cross-domain 누수 없음) |
| **외부 세션 Home 작업 진행 중** (`1f68218a5`, template `valueGuidePlacement` 추가) | ⚠️ Home WIP 활성 — 작업 시 staging 충돌 주의 |

---

## 2. 서비스별 Home route / component 매핑

| 서비스 | `/` 컴포넌트 | 파일 | Hero |
|--------|------------|------|------|
| KPA-Society | `CommunityHomePage` | `services/web-kpa-society/src/pages/CommunityHomePage.tsx` (App.tsx:559) | `HeroBannerSection`(carousel) |
| GlycoPharm | `CommunityMainPage` | `services/web-glycopharm/src/pages/community/CommunityMainPage.tsx` (App.tsx:539) | **`StatusHeroBlock`**(custom data hero) |
| K-Cosmetics | `HomePage` | `services/web-k-cosmetics/src/pages/HomePage.tsx` (App.tsx index) | `HeroBannerSection`(carousel) |
| Neture | `CommunityPage` | `services/web-neture/src/pages/CommunityPage.tsx` (App.tsx:52) | **`NetureHero`**(custom gradient + 3 CTA) |

- legacy(HomePage/CommunityPage 중복)는 각 서비스에서 정리됨 (KCos RoleBasedHome 제거, Neture NetureHomePage→Community 승격 등).

---

## 3. StandardHomeTemplate 사용 현황

**4서비스 전부 `@o4o/shared-space-ui` 의 `StandardHomeTemplate` 사용.** 템플릿이 고정 8-블록 레이아웃을 제공하고, 서비스는 슬롯만 주입한다.

**템플릿 슬롯 (`StandardHomeTemplate.tsx`):** `heroSlot`(필수) · `notices`/`noticesRightSlot`(필수) · `latestSlot?` · `valueGuideSlot?` + `valueGuidePlacement?('before-app-entry'|'after-help')` · `appEntryCards`(필수) · `cta`(필수) · `help`(필수).

**고정 렌더 순서:** Hero → 공지/뉴스(2-col) → latest → valueGuide(before) → AppEntry → CTA → Help → valueGuide(after).

| 서비스 | heroSlot | latestSlot | valueGuideSlot | placement | appEntry | cta |
|--------|----------|:----------:|:--------------:|-----------|:--------:|-----|
| KPA | HeroBannerSection | ✅ | ✅ "내 역할로 시작하기"(3 역할) | **after-help** | 5 | Market Trial(`🧪`) |
| GlycoPharm | StatusHeroBlock | ✅ | ❌ | — | 5 | 사이니지 CTA(emoji 0) |
| K-Cosmetics | HeroBannerSection | ✅ | ❌ | — | 5 | Market Trial(`🧪`) |
| Neture | NetureHero | ❌ | ✅ "내 역할로 시작하기"(공급자/MT/파트너) | **before-app-entry**(기본) | 4 | Market Trial(`FlaskConical`) |

---

## 4. 섹션 구조 비교

공통 골격(템플릿)은 동일. 서비스별 실질 차이:

```text
KPA:   Hero → 공지/약사공론 → 최신글 → AppEntry(5) → Market Trial CTA → 이용가이드 → [내 역할로 시작하기]   (역할카드 맨 아래)
Glyco: Hero(status) → 공지/약업신문 → 최신글 → AppEntry(5) → 사이니지 CTA → 이용가이드                    (역할카드 없음)
KCos:  Hero → 공지/K-뷰티트렌드 → 최신글 → AppEntry(5) → Market Trial CTA → 이용가이드                     (역할카드 없음)
Neture: Hero(3CTA) → 공지/포럼최신글 → [내 역할로 시작하기] → AppEntry(4) → Market Trial CTA → 이용가이드   (역할카드 위쪽)
```

- **공통화 가능/완료**: 8-블록 골격, 2-col 공지, AppEntry, CTA, Help — 이미 템플릿이 담당.
- **서비스 정체성상 유지**: Glyco StatusHeroBlock(데이터형 hero), Neture NetureHero(3 CTA), valueGuide 유무(KPA/Neture만 역할 온보딩), notices-right(약사공론/약업신문/K-뷰티/포럼) — **의도된 차이, 유지**.
- **불일치(아래 §5)**: valueGuide 배치, Home Market Trial CTA 아이콘.

---

## 5. 역할 카드 ↔ 이용 가이드 흐름 평가

**서비스 간 흐름이 갈렸다 (정합성 이슈):**

- **KPA**: `valueGuidePlacement="after-help"` → "내 역할로 시작하기"가 **이용 가이드 아래**. (최근 `1f68218a5` WO-O4O-KPA-HOME-VALUE-CARDS-AFTER-GUIDE-V1 로 이동됨 — 역할카드를 "역할별 이용 안내" 성격으로 가이드 뒤에 배치.)
- **Neture**: `valueGuidePlacement` 미지정 → 기본 `before-app-entry` → 역할 카드가 **공지 직후, 가이드 위**. (설계 의도: Hero → 역할 카드 → AppEntry.)
- **Glyco/KCos**: 역할 카드 없음(서비스 성격상 역할 온보딩 미사용).

→ **KPA(아래) vs Neture(위)가 정반대.** 이전에 사용자가 제기했던 "역할 카드 ↔ 가이드 분리 인지" 흐름이 두 서비스에서 다른 결론으로 구현됨. **cross-service 표준 결정 필요**(또는 의도적 차이로 명문화).

---

## 6. 서비스별 도메인 가드 준수 — 전부 PASS

| 서비스 | 결과 |
|--------|------|
| KPA | ✅ 약사회/약국/커뮤니티/LMS/포럼 유지. Neture Market Trial은 **의도된 cross-service 진입**(외부 링크, WO-MARKET-TRIAL-CROSS-SERVICE-ENTRY-ONLY) — 누수 아님 |
| GlycoPharm | ✅ 내 약국/약국 경영자/혈당관리 유지. 외부 누수 0. "당뇨인" 회원유형 재도입 없음 |
| K-Cosmetics | ✅ 내 매장/화장품/상품 탐색 유지. 약국 표현 0. `/supplier`는 RoleNotAvailable로 차단 |
| Neture | ✅ 공급자/파트너/Market Trial 유지. 내 매장/Store Blog/매장 실행 문맥 **추가 없음** |

---

## 7. 아이콘 정비 결과와 Home 정합성

- **잔존 emoji (Home CTA)**: KPA `CommunityHomePage.tsx` CTA `icon: <span>🧪</span>`, K-Cosmetics `HomePage.tsx:241` `icon: <span>🧪</span>`. **Neture 만 `FlaskConical`(Phase 4)로 정렬됨.**
  → Home Market Trial CTA 아이콘이 **3서비스 불일치**(KPA·KCos emoji / Neture lucide / Glyco는 Market Trial CTA 없음). **Neture Phase 4 가 Home CTA 를 Neture 만 다뤘기 때문**(KPA Phase1/KCos Phase3 는 Store Hub·Channels 범위였고 Home CTA 미포함).
- **HomeAppIcons custom SVG**(ForumIcon/EducationIcon/ContentIcon/SignageIcon/ResourcesIcon): AppEntry 카드에 중앙화 사용 — 적절한 lucide 예외(유지).
- 역할/공급자/파트너 아이콘 의미: Neture lucide(Layers/TrendingUp/Users) 정상.
- **Home 템플릿 파일군은 emoji-clean**(StandardHomeTemplate/AppEntrySection/NewsNoticesSection/CtaGuidanceSection/O4OHelpSection/HeroBannerSection 모두 0). 단 **비-Home 허브 템플릿**에 fallback emoji 잔존(§ 참고).

> 참고(비-Home, Phase 7 대상): `AppreciationPanel.tsx:192`(`🎁`), `StoreHubTemplate.tsx:178`(`?? '🏪'`), `ForumHubTemplate.tsx:177`(`📂`), `ResourcesHubTemplate.tsx:593`(`👁`). Home 범위 아님 — shared-space-ui emoji fallback 제거(Phase 7)에서 다룸.

---

## 8. 모바일 Home layout 관찰

- 4서비스가 동일 `StandardHomeTemplate` + 동일 반응형 섹션(2-col 공지는 `flex-col md:flex-row`, AppEntry grid 1→2→3열)을 공유 → **모바일 리듬 공통**.
- Hero 만 서비스별(carousel vs StatusHeroBlock vs NetureHero gradient) — 각자 반응형 보유. (실제 픽셀 검증은 본 IR 범위 밖, 정적 구조 기준 균일.)
- horizontal overflow/겹침 위험은 정적 조사 기준 없음(Hero·AppEntry 모두 반응형). 정밀 모바일 smoke 는 후속 WO 시 권장.

---

## 9. 외부 세션 WIP / 충돌 가능성

- **현재 작업 트리 clean** (조사 시점). 단 **main 이 다른 세션으로 최근 크게 진행됨** (HEAD `4bfd07166`):
  - `1f68218a5` **WO-O4O-KPA-HOME-VALUE-CARDS-AFTER-GUIDE-V1** — KPA Home 역할카드 이동(§5). `CommunityHomePage.tsx` + `StandardHomeTemplate.tsx`(valueGuidePlacement prop) 변경.
  - `da14028de`(Phase B), `dc8ded6db`/`4bfd07166`(Phase C) — 대시보드 아이콘 후속 **이미 완료**(별도 세션).
  - pop pdf 커밋들(`9d967d45a` 등).
- → **Home 영역(특히 `CommunityHomePage.tsx`, `StandardHomeTemplate.tsx`)이 활성 작업 대상.** 후속 Home WO 착수 시 **반드시 sync + path-specific staging**, 그리고 `HeroBannerSection.tsx`(do-not-touch) 미접촉 유지.

---

## 10. 공통화 가능 영역

```text
이미 공통(완료): 8-블록 골격 · 2-col 공지 · AppEntrySection · CtaGuidanceSection · O4OHelpSection · HomeAppIcons SVG
추가 공통화 여지(작음):
  - Home Market Trial CTA 아이콘 표준(FlaskConical) — KPA/KCos 정렬 (소규모)
  - valueGuidePlacement cross-service 표준 — 결정 필요(코드 아닌 정책)
```

---

## 11. 서비스별 유지해야 할 차이 (공통화 금지)

```text
- Glyco StatusHeroBlock (데이터/관리형 hero) — 혈당관리 정체성
- Neture NetureHero (3 CTA gradient) + valueGuideSlot(공급자/파트너/MT)
- valueGuide 유무: KPA/Neture 만 역할 온보딩 (Glyco/KCos 미사용 — 강제 도입 금지)
- notices-right: 약사공론/약업신문/K-뷰티트렌드/포럼최신글 (서비스별)
- appEntry 카드 구성/개수 (서비스 정체성)
- Neture 도메인 가드: 내 매장/Store Blog/매장 실행 추가 금지
```

---

## 12. 후속 WO 제안

| 우선 | WO 후보 | 성격 | 비고 |
|:---:|---------|------|------|
| **1** | **Home Market Trial CTA 아이콘 정렬** (KPA `CommunityHomePage` + KCos `HomePage` `🧪` → `FlaskConical`) | 저위험, 소규모 | Neture Phase 4 와 동일 기준. Home WIP 세션과 staging 주의. (§7) |
| 2 | **valueGuidePlacement cross-service 표준 결정** (KPA after-help vs Neture before-app-entry) | 정책 결정 후 소규모 | 사용자 제기 흐름 이슈. 표준 1개로 통일 or 의도적 차이 명문화 (§5) |
| 보류 | StandardHomeTemplate wrapper/rhythm 정렬 / section order 대규모 정비 | — | **불필요** — 공통화 이미 완료(§1). 과한 작업 회피 |
| 별도 | shared-space-ui 비-Home emoji fallback 제거 | — | Phase 7(아이콘) 트랙. Home 아님(§7 참고) |

**권장 진행:** 1번(Home CTA 아이콘 정렬, 소규모)부터. 단 §9 외부 세션이 Home 을 활발히 건드리는 중이므로, **착수 전 sync + path-specific** 필수. 2번은 정책 결정(역할카드 배치 표준)을 먼저 받은 뒤 소규모 적용.

---

### 부록. 핵심 파일 인덱스
- 공통 템플릿: `packages/shared-space-ui/src/StandardHomeTemplate.tsx`(슬롯/순서), `AppEntrySection.tsx`, `HomeAppIcons.tsx`, `NewsNoticesSection.tsx`, `CtaGuidanceSection.tsx`, `O4OHelpSection.tsx`, `HeroBannerSection.tsx`(do-not-touch)
- Home 컴포넌트: `web-kpa-society/.../CommunityHomePage.tsx`, `web-glycopharm/.../community/CommunityMainPage.tsx`, `web-k-cosmetics/.../HomePage.tsx`(:241 `🧪`), `web-neture/.../CommunityPage.tsx`(:210 FlaskConical)
- 관련 최근 커밋: `1f68218a5`(KPA value cards after-help)

*코드/문구/라우트/CSS 변경 없음. 본 IR 은 조사 기록으로 commit 한다.*
