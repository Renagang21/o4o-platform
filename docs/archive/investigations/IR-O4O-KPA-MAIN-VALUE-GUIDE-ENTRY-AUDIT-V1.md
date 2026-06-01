# IR-O4O-KPA-MAIN-VALUE-GUIDE-ENTRY-AUDIT-V1

> **조사 보고서 (Investigation Report) — 조사 전용 / 코드·DB·UI·migration 변경 없음.**
>
> O4O / KPA-Society 의 역할별 활용 Guide (`/guide/for/{store-owner, operator, member}`) 와 플랫폼 가치 메시지를 **언제 / 어디서 / 어떤 방식**으로 사용자에게 전달할지에 대한 placement 결정용 조사. **기능 추가 조사가 아니라 "사용자가 O4O 를 평범한 커뮤니티로 오해하기 전에 언제 철학을 만나게 할 것인가" 의 timing 조사.**

- **작성일:** 2026-05-24
- **분류:** Investigation (read-only, 3 병렬 Explore agent 통합)
- **선행 산출물:**
  - [IR-O4O-KPA-VALUE-GUIDE-ROLE-UTILIZATION-AUDIT-V1](IR-O4O-KPA-VALUE-GUIDE-ROLE-UTILIZATION-AUDIT-V1.md) — 가치 명제 6 의 전달도 + 역할별 활용 매트릭스
  - WO-O4O-KPA-GUIDE-FOR-ROLE-V1 (commit `500ddac0a`) — `/guide/for/{store-owner, operator, member}` 3 page 신설 + `/guide/intro` 진입 섹션 추가
- **참조 SSOT:**
  - [O4O-BUSINESS-PHILOSOPHY-V1](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md)
  - [O4O-3-ROLE-FLOW-BASELINE-V1](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md)
- **검증 환경:** local repo, origin/main 와 0 commits 차이
- **사전 동기화:** `git pull origin main` (Already up to date).
- **수정 행위:** **없음** (조사 전용)

---

## 0. 최종 권장 — 한 줄 요약 + Tier 매트릭스

### 0.1 한 줄 결론

> **"역할별 가이드를 어디 둘 것인가" 가 아니라 "사용자가 O4O 를 커뮤니티로 오해하기 전에 언제 철학을 만나게 할 것인가" 의 답: (Tier 1) Header 메뉴 + CommunityHomePage Hero 와 AppEntry 사이 + Operator Dashboard QuickAction 3 곳 동시 — 한 곳만 추가하면 모바일 / 비로그인 / 운영자 중 어딘가에서 가치 메시지가 새는 구조.**

### 0.2 Tier 매트릭스 — 한 페이지 요약

| Tier | 위치 | 효과 | 구현 비용 | 모바일 적합 | 위험 |
|:---:|---|:---:|:---:|:---:|---|
| **1A** | CommunityHomePage: 최신글 ↔ AppEntry 사이 | ★★★ | 中 (`StandardHomeTemplate` slot 추가) | ✅ (1열 stack) | 첫 화면 정보 밀도 증가 |
| **1B** | KPA GlobalHeader 메인 메뉴 + Footer 상단 nav | ★★★ | 低 (navigation.ts 1 항목 + Footer 링크) | ✅ (모바일 drawer 자동) | 최소 — Neture 선례 |
| **1C** | Operator Dashboard QuickAction (5-Block 의 Quick Actions block) | ★★★ | 低 (1 카드 추가) | N/A (데스크탑 화면) | 최소 |
| **2A** | 사용자 dropdown 항목 추가 ("이용 가이드") | ★★ | 低 | ✅ (drawer 자동 노출) | 항목 7→8 증가 |
| **2B** | Hero 동적 광고 슬롯 운영 (운영자 측 CMS 활용) | ★ — 변동 | 0 (코드 변경 없음) | ✅ | 운영자 입력 누락 시 fallback |
| **2C** | MobileBottomNav 가이드 탭 추가 (4탭 → 5탭) | ★★ | 中 (Tab 컴포넌트 수정) | ✅ | 4탭 → 5탭 UX 부담 |
| 3 | About 페이지 재편 (역할별 카드 3개 추가) | ★ | 中 | ✅ | About 진입 자체가 후순위 |
| X | Hero Fallback 텍스트 강화 (가치명 명시) | ★★ | 0 (copy 만) | ✅ | 동적 광고에 가려질 위험 |

### 0.3 핵심 시사 (4 service 비교)

| Service | 메뉴에 "가이드" / "O4O 소개" | 메뉴 가치명 (Supplier/Partner 등) | Hero 가치 카피 |
|---|:---:|:---:|:---:|
| **KPA** | ❌ | ❌ | "약사 커뮤니티" 만 (가치명 0) |
| **Neture** | ✅ "이용 가이드" + "O4O 플랫폼 소개" | ✅ "Supplier" / "Partner" / "유통 참여형 펀딩" | 마켓 트라이얼 섹션 명시 |
| GP | ❌ | ❌ | 미확인 |
| K-Cos | ❌ | ❌ | 미확인 |

→ **KPA 만 4 service 중 메뉴 차원 가치 메시지 0%.** Neture 의 메뉴 패턴이 본 IR 의 KPA 후속 권고의 참고점.

### 0.4 결정 필요 영역

| # | 결정 | 분류 |
|---|---|:---:|
| 1 | Tier 1A/B/C 중 어느 조합을 즉시 진행할지 | **즉시** |
| 2 | CommunityHomePage 의 Hero ↔ AppEntry 사이 새 슬롯 추가 시 `StandardHomeTemplate` 수정 범위 | **별건 WO** |
| 3 | Header 메뉴에 "이용 가이드" 추가 — KPA_BASE_NAV vs KPA_ABOUT_NAV_ITEM 직전 위치 | **즉시** |
| 4 | Operator Dashboard 의 가이드 진입은 QuickAction vs AxisNavigationSection 중 어디 | **별건 디자인 결정** |
| 5 | 사용자가 "역할별 가이드 카드 3개" vs "단일 가이드 진입" 중 어느 UX 선호 | **별건 사용자 테스트** |

---

## 1. 조사 환경

| 항목 | 값 |
|---|---|
| 조사일 | 2026-05-24 |
| Repo 시점 | origin/main 와 일치 (0 commits 차이) |
| 조사 방법 | 3 병렬 Explore agent — (1) CommunityHomePage layout / (2) GlobalHeader·Footer·Dropdown·Mobile / (3) PostLogin 흐름·4 service 비교·모바일 위험 |
| 조사 범위 | `services/web-kpa-society/src/{pages,components,config}/**` + `packages/{shared-space-ui,ui,account-ui}/**` + 4 service 의 메뉴/Hero 비교 |

---

## 2. 산출물 1 — 현재 메인 UX 의 가치 진입 부재 (코드 인용)

### 2.1 GlobalHeader 메뉴 ([navigation.ts:18-43](../../services/web-kpa-society/src/config/navigation.ts#L18-L43))

```ts
KPA_BASE_NAV = [
  { label: '커뮤니티', href: '/' },   // 항상 노출
];

KPA_CONTEXTUAL_NAV = [
  { label: '내 약국',       href: '/store',     visibleWhen: 'storeOwner' },
  { label: '약국 운영 허브', href: '/store-hub', visibleWhen: 'storeOwner' },
];

KPA_ABOUT_NAV_ITEM = { label: 'About', href: '/about' };
```

→ **"이용 가이드" 메뉴 0.** About 만 노출. 일반 사용자는 "커뮤니티" 단일 메뉴 인지.

### 2.2 KPA Footer ([Footer.tsx:19-28](../../services/web-kpa-society/src/components/Footer.tsx#L19-L28))

```
약사회 소개 · 협업 문의 · 이용약관 · 개인정보처리방침 · 사이트맵
```

→ "이용 가이드" / "O4O 소개" 항목 0. 가치 메시지 진입 0.

### 2.3 사용자 Dropdown ([KpaGlobalHeader.tsx:169-204](../../services/web-kpa-society/src/components/KpaGlobalHeader.tsx#L169-L204))

```
강의 대시보드 (lms:instructor) · 관리자 대시보드 · 운영 대시보드 ·
내 매장 (store_owner) · 마이페이지 · 설정 · 로그아웃
```

→ 6 항목 모두 **대시보드 / 개인 정보 진입** 전용. "가이드" / "About" 0.

### 2.4 CommunityHomePage Hero ([CommunityHomePage.tsx:207-216](../../services/web-kpa-society/src/pages/CommunityHomePage.tsx#L207-L216))

```ts
fallback={{
  badge: '약사/약국 서비스',
  title: '약사 커뮤니티와 약국 경영 서비스',
  subtitle: '약사 커뮤니티와 약국 경영 서비스를 한 곳에서',
}}
```

→ 가치명 0. "Online for Offline" / "실행 경쟁력" / "정보 → 실행" / "공급자 → 운영자 → 매장" 등 핵심 메시지 부재. 동적 광고가 있어도 운영자 미입력 시 이 fallback 만 표시.

### 2.5 CommunityHomePage Help 섹션 (있지만 노출 위치 문제)

`StandardHomeTemplate.help` slot 의 `O4OHelpSection` 이 최하단 (last) 에 위치:

```
Help 섹션 위치: PageSection last → mb-0
```

→ 모바일 viewport 700-800px / Hero (~300px) + 공지 (~150px) + AppEntry 5장 (~550px) + CTA + Help. **Help 도달까지 1500px+ 스크롤 필요** → 모바일에서 Help 도달율 낮음.

### 2.6 Operator Dashboard ([KpaOperatorDashboard.tsx](../../services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx))

5-Block 구조 (KPI / AI Summary / Action Queue / Activity Log / Quick Actions) + `AxisNavigationSection` (커뮤니티 운영 / 매장 HUB 운영 2축).

```
Quick Actions 항목 (line 226): 매장 관리 · 이벤트 오퍼 · 사이니지 · ... (운영 영역 전용)
```

→ 운영자가 가이드를 발견할 수 있는 진입 0. 운영자 본인이 `/guide/for/operator` 같은 자기 역할 가이드를 가장 필요로 하는데 dashboard 에 없음.

### 2.7 종합 — 가치 진입 부재 매트릭스

| 위치 | 현재 가치 메시지 진입 | Philosophy 정합 |
|---|:---:|:---:|
| GlobalHeader 메인 메뉴 | ❌ 0 | ❌ |
| Footer 상단 nav | ❌ 0 | ❌ |
| 사용자 dropdown | ❌ 0 | ❌ |
| CommunityHomePage Hero | ❌ 가치명 0 | ❌ |
| CommunityHomePage 본문 (공지/AppEntry/CTA) | ❌ 0 (Market Trial CTA 만 Neture-cross) | ❌ |
| CommunityHomePage Help (last) | ✅ /guide/intro 링크 | △ (도달율 낮음) |
| Operator Dashboard | ❌ 0 | ❌ |
| MobileBottomNav | ❌ 0 | ❌ |
| About 페이지 | ✅ "/guide/intro 전체 보기" CTA 존재 | △ (About 자체 진입 후순위) |
| `/guide/intro` (선행 WO 작업) | ✅ "역할별 활용 가이드" 5번째 섹션 추가됨 | ✅ |

→ **유효한 가치 메시지 진입 = `/guide/intro` 내부 + About 페이지 하단 2 곳만.** 사용자가 두 곳에 진입해야 가치를 만남. 메인 UX 의 다른 모든 위치에서 가치 메시지 0%.

---

## 3. 산출물 2 — 역할별 로그인 직후 첫 화면 reconstruction

### 3.1 PostLoginRedirect 정책 ([dashboard.ts:35-51](../../services/web-kpa-society/src/config/dashboard.ts#L35-L51))

```ts
KPA_DASHBOARD_MAP = {
  'platform:super_admin': '/admin',
  'kpa:admin':            '/admin',
  'kpa:operator':         '/operator',
  // 다른 역할 0 → 자동 이동 없음, CommunityHomePage 유지
};
```

### 3.2 역할별 첫 화면

| 역할 | 첫 화면 | 가치 메시지 노출 |
|---|---|:---:|
| platform:super_admin / kpa:admin | `/admin` | ❌ 0 |
| **kpa:operator** | `/operator` (KpaOperatorDashboard 5-Block + AxisNavigation) | ❌ 0 (Quick Actions / AxisNav 모두 운영 진입 전용) |
| kpa:store_owner | CommunityHomePage (자동 이동 X) | ❌ Hero/AppEntry 에 가치명 0 |
| lms:instructor | CommunityHomePage | ❌ 동일 |
| forum_member / consumer | CommunityHomePage | ❌ 동일 |

→ **모든 역할이 로그인 직후 첫 화면에서 O4O 가치 메시지를 만나지 못함.** 운영자조차 자기 역할의 가이드 (`/guide/for/operator`) 가 어디 있는지 모름.

### 3.3 모바일 사용자의 첫 화면

`MobileBottomNav` ([MobileBottomNav.tsx:19-31](../../services/web-kpa-society/src/components/MobileBottomNav.tsx#L19-L31)):

- 비로그인 (2탭): 커뮤니티 / 로그인
- 로그인 (4탭): 커뮤니티 / 약국 경영 / 알림 / 내정보

→ 가이드 탭 0. 모바일 사용자는 메인 (`/`) 진입 → Hero/AppEntry 카드 만남 → 카드 클릭 시 (비로그인 → 로그인 modal / 로그인 → 서비스 진입). **가치 메시지 만날 기회 = Hero fallback 만**.

### 3.4 핵심 격차

| 격차 | 영향 |
|---|---|
| 운영자가 자기 역할 가이드 (`/guide/for/operator`) 못 찾음 | Workspace A·B·D·E 미구현을 어떻게 활용해야 하는지 안내 안 됨 |
| 매장 경영자가 자기 역할 가이드 (`/guide/for/store-owner`) 못 찾음 | "직원 부족해도 매장 경쟁력" 메시지 미전달 |
| 일반 약사가 "이게 단순 커뮤니티가 아님" 인지 못 함 | "평범한 커뮤니티" 오해 지속 |
| 모바일 사용자가 가치 메시지 0% 노출 | 모바일 사용 비중이 높을수록 영향 |

---

## 4. 산출물 3 — 가능 진입 위치 매트릭스 (8 곳)

### 4.1 CommunityHomePage 내부

**`StandardHomeTemplate` 의 6 slot 흐름** ([StandardHomeTemplate.tsx:83-143](../../packages/shared-space-ui/src/StandardHomeTemplate.tsx#L83-L143)):

```
heroSlot (mb-16, 64px)
  ↓
공지/약사공론 (PageSection, mb-8 md:mb-12)
  ↓
latestSlot (선택적, mb-8 md:mb-12)
  ↓
AppEntrySection (5 카드)
  ↓
CtaGuidanceSection (Market Trial)
  ↓
helpSlot (last, mb-0)
```

→ **2 placement 후보:**

#### (A) Hero ↔ 공지 사이 (= `afterHeroSlot` 신규)

| 차원 | 평가 |
|---|---|
| 효과 | ★★★ (첫 화면 즉시 노출) |
| 모바일 | ✅ (PageSection responsive) |
| 위험 | 공지 직전 → 시각적 부담 가능. 신규 slot 추가 필요 (`StandardHomeTemplate` 수정) |
| UI 패턴 | CtaGuidanceSection (1 배너) 또는 mini AppEntrySection (3 카드) |

#### (B) latestSlot ↔ AppEntry 사이 (= `appEntryAboveSlot` 신규) **[권장 1A]**

| 차원 | 평가 |
|---|---|
| 효과 | ★★★ (자연스러운 흐름: Hero → 공지 → 활동 → **"여기는 뭐하는 곳인가"** → 서비스 진입) |
| 모바일 | ✅ (자동 1열 stack) |
| 위험 | 신규 slot 추가 필요 |
| UI 패턴 | AppEntrySection 패턴 (3 역할 카드) — `/guide/for/store-owner`, `/guide/for/operator`, `/guide/for/member` |

→ **agent 1 권고: (B) 가 가장 자연스러운 사용자 심리 흐름 일치.**

### 4.2 GlobalHeader 메뉴 (`KPA_BASE_NAV` / `KPA_ABOUT_NAV_ITEM` 인근) **[권장 1B]**

| 차원 | 평가 |
|---|---|
| 효과 | ★★★ (모든 화면에서 항상 노출 — 발견성 최대) |
| 모바일 | ✅ (mobile drawer 자동 노출, [GlobalHeader.tsx:325-403](../../packages/ui/src/layout/GlobalHeader.tsx#L325-L403)) |
| 위험 | 메뉴 항목 4 → 5 증가 (UX 부담 미미) |
| 구현 | `navigation.ts` 에 `{label: '이용 가이드', href: '/guide/intro'}` 1 항목 추가 |
| 선례 | **Neture 가 이미 `'이용 가이드'` + `'O4O 플랫폼 소개'` 메인 메뉴 노출 중** ([web-neture/navigation.ts:18-26](../../services/web-neture/src/config/navigation.ts#L18-L26)) |

→ **Neture 패턴 그대로 적용 — 가장 낮은 구현 비용 + 가장 큰 발견성.**

### 4.3 Operator Dashboard `Quick Actions` block **[권장 1C]**

| 차원 | 평가 |
|---|---|
| 효과 | ★★★ (운영자의 첫 화면 — 자기 역할 가이드 즉시 노출) |
| 모바일 | N/A (Operator Dashboard 는 데스크탑 화면) |
| 위험 | 최소 — Quick Actions block 에 1 카드 추가만 |
| 구현 | `KpaOperatorDashboard.tsx` 의 QuickAction 배열에 `'운영 가이드'` → `/guide/for/operator` 추가 |

→ 운영자가 가장 자기 역할 가이드를 필요로 하는데 현재 진입 0. **즉시 가치 높음.**

### 4.4 사용자 dropdown **[권장 2A]**

| 차원 | 평가 |
|---|---|
| 효과 | ★★ (로그인 사용자만, 의도 있는 사용자) |
| 모바일 | ✅ (drawer 자동) |
| 위험 | 6 항목 → 7 항목 (여유 있음, 8-9 까지 가능 — agent 2 평가) |
| 구현 | `KpaGlobalHeader.tsx` userMenuItems 에 `<GlobalHeaderMenuItem to="/guide/intro">이용 가이드</GlobalHeaderMenuItem>` 1 추가 (마이페이지 직전) |

→ 헤더 메뉴 1B 와 중복 노출. Header 메뉴를 안 본 사용자의 fallback 진입.

### 4.5 Footer 상단 nav **[권장 1B 짝]**

| 차원 | 평가 |
|---|---|
| 효과 | ★★ (스크롤 끝까지 도달한 사용자만) |
| 모바일 | ✅ (Footer 자동) |
| 위험 | 최소 |
| 구현 | `Footer.tsx` 의 약사회 소개 다음에 `{label:'이용 가이드', href:'/guide/intro'}` 추가 |
| 패턴 | "약사회 소개 · **이용 가이드** · 협업 문의 · 이용약관 · 개인정보처리방침" |

→ Header 1B 와 짝으로 같이 진행하는 것이 일관성 측면 자연스러움.

### 4.6 MobileBottomNav 가이드 탭 추가 **[권장 2C]**

| 차원 | 평가 |
|---|---|
| 효과 | ★★ (모바일 사용자의 항상 보이는 위치) |
| 모바일 | ✅ (현재 정확히 모바일 전용) |
| 위험 | 4탭 → 5탭 UX 부담 (Tab 좁아짐) |
| 구현 | `MobileBottomNav.tsx` 에 가이드 탭 추가 + active 판정 로직 추가 |

→ 모바일 사용 비중이 높다면 효과적. 단 4탭이 이미 정해진 것을 5탭으로 늘리는 것이 디자인 결정 필요. **Tier 2 (선택)**.

### 4.7 Hero 동적 광고 슬롯 운영 **[권장 2B]**

| 차원 | 평가 |
|---|---|
| 효과 | ★ — 변동 (운영자 입력에 의존) |
| 모바일 | ✅ |
| 위험 | 운영자 미입력 시 fallback (가치명 0) 만 노출 |
| 구현 | 코드 변경 0. 운영자가 CMS 에 "역할별 가이드 시작하기" 배너 + `/guide/intro` 링크 등록 |

→ **운영자가 잊으면 사라지는 자리** — 가치 메시지를 영구 노출하기 부적합. 보조 진입으로만 활용.

### 4.8 About 페이지 재편 **[권장 3]**

| 차원 | 평가 |
|---|---|
| 효과 | ★ (이미 About 까지 온 의도 있는 사용자 한정) |
| 모바일 | ✅ |
| 위험 | About 자체 진입이 후순위 |
| 구현 | `AboutPage.tsx` 의 "서비스 시작하기" CTA 위에 "역할별 가이드 3 카드" 섹션 추가 |
| 현재 | About 하단에 `'KPA-Society 이용 가이드 전체 보기 →'` 링크 (`/guide/intro`) 이미 있음 — 역할별 분기는 없음 |

→ Tier 1 완료 후 보조.

### 4.9 Hero Fallback 텍스트 강화 **[권장 X]**

| 차원 | 평가 |
|---|---|
| 효과 | ★★ (Hero 광고 미설정 시 항상 노출) |
| 모바일 | ✅ |
| 위험 | 동적 광고가 fallback 을 덮으면 효과 없음 |
| 구현 | `CommunityHomePage.tsx:210-214` 의 fallback title/subtitle/description 만 수정 (코드 1줄) |
| 현재 | "약사 커뮤니티와 약국 경영 서비스를 한 곳에서" → 가치명 0 |
| 제안 | "약사 커뮤니티와 약국 경영 서비스 — 운영자가 만든 자료를 매장이 받아 활용하는 O4O 플랫폼" 같은 가치 명제 포함 카피 |

→ **코드 변경 1줄** 이지만 동적 광고에 가려질 위험. Tier 1 의 부속 작업.

---

## 5. 산출물 4 — 4 service 비교

본 IR 의 가장 결정적 신호: **Neture 만 메뉴에서 가치 메시지를 노출**, KPA / GP / K-Cos 는 모두 미노출.

### 5.1 메뉴 가치 메시지 매트릭스

| 항목 | KPA | Neture | GP | K-Cos |
|---|:---:|:---:|:---:|:---:|
| 메뉴: "이용 가이드" | ❌ | ✅ `/guide` | ❌ | ❌ |
| 메뉴: "O4O 플랫폼 소개" | ❌ | ✅ `/o4o` | ❌ | ❌ |
| 메뉴: 역할명 (Supplier/Partner 등) | ❌ | ✅ "Supplier" / "Partner" | ❌ | ❌ |
| 메뉴: 가치명 (예: "유통 참여형 펀딩") | ❌ | ✅ "유통 참여형 펀딩" | ❌ | ❌ |
| Hero 가치 카피 | "약사 커뮤니티" 만 (가치명 0) | "플랫폼 소개" + 마켓 트라이얼 섹션 | 미확인 | 미확인 |
| Footer 가치 진입 | ❌ | ❌ (메뉴에서 처리) | ❌ | ❌ |
| 역할별 진입 명시 | △ (`/guide/for/*` 신설, 메인 노출 X) | ✅ Supplier/Partner 메뉴 | ❌ | ❌ |

### 5.2 Neture 의 메뉴 ([web-neture/navigation.ts](../../services/web-neture/src/config/navigation.ts))

```ts
NETURE_PUBLIC_NAV = [
  { label: 'Home',            href: '/' },
  { label: '유통 참여형 펀딩', href: '/market-trial' },
  { label: 'Supplier',        href: '/supplier' },
  { label: 'Partner',         href: '/partner' },
  { label: 'Contact Us',      href: '/contact' },
  { label: 'O4O 플랫폼 소개',  href: '/o4o' },
  { label: '이용 가이드',      href: '/guide' },
];
```

→ **7 항목.** 그중 "유통 참여형 펀딩" / "Supplier" / "Partner" / "O4O 플랫폼 소개" / "이용 가이드" 5 항목이 가치명·역할명·가이드. KPA 의 1 항목 ("커뮤니티" — 기능명) 과 격차 큼.

### 5.3 본 IR 의 KPA 권고는 Neture 패턴의 점진 적용

KPA 가 Neture 의 7 항목을 그대로 따라갈 필요는 없으나, 적어도 **"이용 가이드" + "About" 2 항목** 은 메인 메뉴에 노출되어야 정합.

```
[제안] KPA_BASE_NAV = [
  { label: '커뮤니티',   href: '/' },
  { label: '이용 가이드', href: '/guide/intro' },   // ← 신규
];

// About 은 BASE_NAV 로 이전 (현재 KPA_ABOUT_NAV_ITEM 으로 분리됨)
```

또는 minimal:

```
[제안] KPA_BASE_NAV = [
  { label: '커뮤니티',   href: '/' },
  { label: '이용 가이드', href: '/guide/intro' },  // ← 신규
];
KPA_ABOUT_NAV_ITEM 유지 (현재 그대로)
```

---

## 6. 산출물 5 — 모바일 위험 평가

### 6.1 모바일 viewport vs 콘텐츠 높이

| 구간 | 높이 |
|---|---|
| Hero (PageHero + HeroBannerSection) | ~250-350px |
| 공지/약사공론 (모바일 1열 stack) | ~150-200px |
| 최신글 (latestSlot) | ~200-300px |
| AppEntrySection (5장 1열) | 5 × 110px = ~550px |
| CTA (Market Trial) | ~120px |
| Help (last) | ~200px |
| **합계 (스크롤 필요 위치까지)** | **~1700-2000px** |

모바일 viewport (보통 600-800px) → **첫 보기에서 Hero + 공지 일부만 노출**. AppEntry 까지 도달하려면 1 스크롤, Help (가이드 진입) 까지 도달하려면 2-3 스크롤.

### 6.2 모바일 사용자의 실제 가치 메시지 노출

| 사용자 행동 | 가치 메시지 노출 여부 |
|---|:---:|
| 로그인 → 메인 진입 후 Hero 만 보고 이탈 | ❌ Hero fallback 가치명 0 |
| 로그인 → AppEntry 카드 즉시 클릭 | ❌ |
| 로그인 → 스크롤 → CTA 까지 도달 | ❌ (Market Trial 만, KPA 가치 X) |
| 로그인 → 끝까지 스크롤 → Help 도달 | ✅ `/guide/intro` 링크 1 개 발견 |
| MobileBottomNav → 약국경영 / 알림 / 내정보 | ❌ |

→ **모바일 사용자가 가치 메시지를 만나는 유일한 경로 = Hero 동적 광고 (운영자 입력) 또는 1500-2000px 스크롤 후 Help.** 둘 다 발견율 매우 낮음.

### 6.3 모바일 적합 진입 위치 우선순위

| 위치 | 모바일 적합도 |
|---|:---:|
| Header 메뉴 (drawer) | ★★★ — 항상 노출 |
| Hero 직후 / AppEntry 위 신규 slot | ★★★ — 첫 스크롤에서 만남 |
| Footer | ★ — 끝까지 스크롤 후 |
| MobileBottomNav 가이드 탭 | ★★★ — 항상 노출 |
| Operator Dashboard | N/A (데스크탑) |

→ Tier 1B (Header) + 1A (Hero↔AppEntry) 가 모바일 발견율을 가장 크게 끌어올림.

---

## 7. 산출물 6 — 추천 진입 구조

### 7.1 Tier 1 — 즉시 효과 (3 곳 동시 권고)

| # | 위치 | 코드 변경 | 우선순위 |
|---|---|---|:---:|
| **1A** | CommunityHomePage: latestSlot ↔ AppEntry 사이 (`appEntryAboveSlot` 신규 slot) | `StandardHomeTemplate.tsx` slot 추가 + `CommunityHomePage.tsx` slot 채우기 | 高 |
| **1B** | KPA GlobalHeader 메뉴 + Footer 상단 nav | `navigation.ts` 1 항목 추가 + `Footer.tsx` 1 항목 추가 | **즉시 (가장 작은 변경)** |
| **1C** | Operator Dashboard Quick Actions | `KpaOperatorDashboard.tsx` Quick Action 배열에 1 항목 추가 | 高 |

### 7.2 Tier 2 — 보조 진입

| # | 위치 | 코드 변경 | 우선순위 |
|---|---|---|:---:|
| **2A** | 사용자 dropdown 항목 | `KpaGlobalHeader.tsx` userMenuItems 1 추가 | 中 |
| **2B** | Hero 동적 광고 슬롯 (운영자 CMS) | 0 (운영자 작업) | 中 — Tier 1 완료 후 |
| **2C** | MobileBottomNav 가이드 탭 추가 | `MobileBottomNav.tsx` Tab + isGuideActive | 中 — 디자인 결정 필요 |

### 7.3 Tier 3 — 부속

| # | 위치 | 코드 변경 |
|---|---|---|
| 3A | Hero Fallback 텍스트 강화 (가치명 명시) | `CommunityHomePage.tsx:210-214` copy 만 |
| 3B | About 페이지 "역할별 가이드 3 카드" 섹션 추가 | `AboutPage.tsx` 1 섹션 추가 |

### 7.4 권장 진행 순서

1. **즉시 진행 (1B + Tier 3A)**: 메뉴 1 항목 + Footer 1 항목 + Hero fallback copy 변경. PR 사이즈 매우 작음 (3 파일).
2. **다음 sprint (1A + 1C)**: `StandardHomeTemplate` slot 추가 + Operator Dashboard Quick Action. PR 사이즈 中.
3. **선택 (2A + 2C + 3B)**: 사용자 dropdown + MobileBottomNav + About. 사용자 피드백 받은 뒤 결정.

---

## 8. 산출물 7 — 과도한 노출 위험

본 IR 의 권고를 채택 시 발생 가능한 risk 와 mitigation:

### 8.1 첫 화면 정보 밀도 증가

| 위험 | Mitigation |
|---|---|
| Hero + 공지 + 최신글 + **가치 카드** + AppEntry → 첫 스크롤이 길어짐 | 1A 의 카드 height 를 compact (~100px) 로 제한. AppEntrySection 패턴 (3 카드 1줄) 사용 |
| 모바일에서 추가 콘텐츠 stack 으로 스크롤 길이 증가 | 모바일에선 카드 1개 (간소화) 또는 horizontal scroll 검토 |
| 가치 카드가 AppEntry 와 시각적으로 충돌 | 다른 background tone 또는 borderLeft accent 사용 (Market Trial CTA 패턴 참고) |

### 8.2 메뉴 항목 증가

| 위험 | Mitigation |
|---|---|
| Header 메뉴 1 → 2 항목 증가 (모바일 drawer 도 동일) | 최소 (Neture 가 7 항목 운영 중) |
| 사용자 dropdown 6 → 7-8 항목 | 8-9 까지 여유 있음 — agent 2 평가 |

### 8.3 메시지 중복 노출

| 위험 | Mitigation |
|---|---|
| Header + Footer + Hero 직후 카드 + Dropdown 모두 가이드 진입 → "스팸" 인상 | Tier 1 (Header + Hero 직후 + Operator) 3 곳만 우선. Tier 2 는 사용자 피드백 후 |
| 동적 광고 + 정적 카드가 같은 영역 노출 | 운영자 CMS 정책 — 동적 광고가 "역할별 가이드" 와 충돌하는 카피일 때 운영자 가이드라인 필요 |

### 8.4 디자인 일관성

| 위험 | Mitigation |
|---|---|
| 1A 의 카드가 AppEntrySection 과 시각적으로 같으면 사용자가 "또 5 카드?" 로 인식 | 다른 패턴 사용 (예: CtaGuidanceSection 1 배너 + 3 inline card) |
| Operator Dashboard 의 가이드 진입이 Quick Action 다른 항목과 비등하면 묻힘 | Quick Action 의 first 위치 또는 별도 시각적 강조 |

---

## 9. 산출물 8 — 후속 WO / IR 제안

### Tier 1 즉시 WO (3 건 — 작은 PR 부터)

| WO 후보 | 영향 파일 | 비고 |
|---|---|---|
| `WO-O4O-KPA-MAIN-NAV-GUIDE-ENTRY-V1` | `navigation.ts` + `Footer.tsx` (+ 선택 fallback copy) | 메뉴 1 항목 + Footer 1 항목. 가장 작은 변경, 즉시 가치 |
| `WO-O4O-KPA-HOME-VALUE-CARDS-V1` | `StandardHomeTemplate.tsx` + `CommunityHomePage.tsx` | `appEntryAboveSlot` 신규 slot + 3 역할 카드. 패키지 + service |
| `WO-O4O-KPA-OPERATOR-DASHBOARD-GUIDE-CARD-V1` | `KpaOperatorDashboard.tsx` | Quick Action 1 카드 추가 |

### Tier 2 보조 WO (선택 진행)

| WO 후보 | 비고 |
|---|---|
| `WO-O4O-KPA-USER-DROPDOWN-GUIDE-ENTRY-V1` | dropdown 1 항목 추가 |
| `WO-O4O-KPA-MOBILE-BOTTOM-NAV-GUIDE-TAB-V1` | 4탭 → 5탭 — 디자인 결정 필요 |
| `WO-O4O-KPA-ABOUT-ROLE-CARDS-V1` | About 페이지 역할별 카드 섹션 추가 |
| `WO-O4O-KPA-HERO-FALLBACK-VALUE-COPY-V1` | Hero fallback copy 가치명 강화 |

### Tier 3 별건 IR (큰 결정)

| IR 후보 | 비고 |
|---|---|
| `IR-O4O-4SERVICE-HERO-MESSAGE-CONSISTENCY-V1` | KPA / GP / K-Cos 의 Hero 메시지 통일 (Neture 와 격차 해소) |
| `IR-O4O-MOBILE-BOTTOM-NAV-EXPANSION-DECISION-V1` | 4 service 모두 MobileBottomNav 탭 수 / 가이드 탭 정책 결정 |
| `IR-O4O-HERO-DYNAMIC-AD-VS-STATIC-VALUE-POLICY-V1` | Hero 가 광고 vs 가치 명제 중 어디 우선해야 하는지 정책 |

---

## 10. 산출물 9 — 현재 구조 vs O4O 철학 충돌 체크

| 차원 | 평가 | 충돌 |
|---|---|:---:|
| "사용자가 첫 화면에서 가치 메시지를 만나야 함" | ❌ Hero / 메뉴 / Dashboard 모두 미반영 | **강함** |
| 메뉴에서 역할 / 가치 명시 (Neture 패턴) | ❌ KPA 만 4 service 중 0% | **강함** |
| 모바일 사용자가 가치 메시지 발견 가능 | ❌ 스크롤 1500-2000px 필요 | **강함** |
| 운영자가 자기 역할 가이드 발견 가능 | ❌ Operator Dashboard 에 가이드 진입 0 | **강함** |
| `/guide/for/*` 페이지 자체는 존재 | ✅ 선행 WO 로 신설됨 | 없음 |
| `/guide/intro` 진입 카드 (선행 WO) | ✅ 5번째 섹션 존재 | 없음 |
| About 페이지의 O4O 섹션 | ✅ 정합 (그러나 진입이 후순위) | 약 |
| Hero 동적 광고 / 정적 메시지 정책 부재 | ⚪ 정책 부재 | 약 |

→ **충돌 강함 4 항목** — 모두 본 IR 의 Tier 1 / Tier 2 권고로 해소 가능.

---

## 11. 본 IR 이 결정하지 않는 것

- 실제 코드 / UI / 카피 변경 — 본 IR 은 조사 전용
- Tier 1A 의 가치 카드 정확한 UI 패턴 (AppEntrySection 패턴 vs CtaGuidanceSection 패턴 vs 신규 패턴)
- Tier 1B 메뉴 항목의 정확한 라벨 ("이용 가이드" vs "역할별 가이드" vs "O4O 소개")
- Tier 2C MobileBottomNav 5탭 결정 — 4 service 공통 디자인 결정 필요
- Hero fallback 카피의 정확한 문구 (별건 디자인/카피 작업)
- Hero 동적 광고 vs 정적 가치 메시지 우선순위 정책 — 별건 IR
- 본 IR 의 Tier 1 / Tier 2 진행 시점 — 사용자 결정 사안
- `StandardHomeTemplate` 의 신규 slot 명명 (`appEntryAboveSlot` / `valueGuideSlot` 등) — 구현 시 결정
- 4 service (Neture / GP / K-Cos) 의 동등 패턴 적용 시기 — 별건 IR

---

## 12. Drift 방지 원칙 (요약)

```
원칙:
1. 메인 UX (Hero / 메뉴 / 첫 화면 카드) 에 가치 메시지가 최소 1 곳 이상 노출되어야 한다.
   "정보 → 실행" / "운영자 지원" / "3 자 협력" / "소규모 사업자 경쟁력" 중 1-2 가지.

2. 새 메뉴 / 카피 작성 시 Philosophy SSOT 직접 참조. "정보 제공" 인상보다
   "실행 전환" 인상이 우세하도록.

3. Hero 의 동적 광고 / 정적 fallback 의 둘 다 가치명을 최소 1 회 명시.
   동적 광고 운영자 미입력 시에도 fallback 으로 메시지 보존.

4. 메뉴는 4 service 의 톤 유지 가능. 단 메뉴 항목에 "가치명·역할명" 0 인 상태는 회피.
   KPA / GP / K-Cos 가 Neture 의 메뉴 패턴 (가치명·역할명 5+ 항목) 을 점진 반영.

5. 모바일 사용자가 첫 화면 스크롤 1 회 이내에 가치 메시지를 만날 수 있어야 한다.
   모바일에서 Hero 직후 또는 BottomNav 의 1 탭으로 가이드 진입 가능.

6. 운영자의 첫 화면 (Operator Dashboard) 에 운영자 자기 역할 가이드 진입이
   QuickAction 또는 AxisNavigation 1 카드 이상 노출.

7. 새 진입점 추가 시 "이 위치가 모바일에서도 효과적인가" 점검.
   데스크탑 only 진입은 모바일 fallback 진입과 짝지어 설계.
```

---

## 13. 본 IR 의 의의

| 차원 | 결과 |
|---|---|
| 즉시 코드 변경 | 0 |
| Tier 1 즉시 WO 후보 | 3 (Main Nav Guide Entry / Home Value Cards / Operator Dashboard Guide Card) |
| Tier 2 보조 WO 후보 | 4 |
| Tier 3 별건 IR 후보 | 3 |
| 식별된 가치 진입 부재 위치 | 8 (메뉴/Footer/Dropdown/Hero/AppEntry 인근/Dashboard/MobileBottomNav/About) |
| 식별된 유효 가치 진입 위치 (현재) | 2 (`/guide/intro` 내부 + About 하단) |
| Neture vs KPA 격차 명문화 | ✅ 4 service 비교 매트릭스 + Neture 메뉴 패턴 인용 |
| 모바일 위험 정량화 | ✅ viewport vs 콘텐츠 높이 1700-2000px 명문화 |
| 사이클 정리 | 본 IR 로 "가치 메시지 진입 timing/placement" 결정. 후속 Tier 1 WO 3 건은 작은 PR 단위로 점진 진행 |

---

## 부록 — 조사 방법 (재현 가능)

```bash
# 1. KPA 메뉴 / Footer / Dropdown 현재 상태
cat services/web-kpa-society/src/config/navigation.ts
cat services/web-kpa-society/src/components/Footer.tsx | head -30
grep -nE "GlobalHeaderMenuItem|userMenuItems" services/web-kpa-society/src/components/KpaGlobalHeader.tsx

# 2. CommunityHomePage layout
grep -nE "StandardHomeTemplate|heroSlot|appEntryCards|latestSlot|cta|help" \
  services/web-kpa-society/src/pages/CommunityHomePage.tsx | head -20

# 3. StandardHomeTemplate slot catalog
grep -nE "Slot|interface.*Props" packages/shared-space-ui/src/StandardHomeTemplate.tsx | head -15

# 4. PostLoginRedirect + KPA_DASHBOARD_MAP
grep -nE "PostLoginRedirect|getKpaPostLoginRoute|KPA_DASHBOARD_MAP" \
  services/web-kpa-society/src/{App.tsx,config/dashboard.ts}

# 5. KpaOperatorDashboard 5-Block
grep -nE "Quick Actions|AxisNavigation|5-Block|KpiGrid" \
  services/web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx | head -10

# 6. MobileBottomNav 탭 catalog
cat services/web-kpa-society/src/components/MobileBottomNav.tsx | head -50

# 7. 4 service 메뉴 비교
for SVC in kpa-society neture glycopharm k-cosmetics; do
  echo "=== $SVC ==="
  grep -nE "PUBLIC_NAV|BASE_NAV|label:" \
    services/web-$SVC/src/config/navigation.ts 2>/dev/null | head -10
done

# 8. Hero fallback / 동적 광고
grep -nE "HeroBannerSection|fallback|heroAds" \
  services/web-kpa-society/src/pages/CommunityHomePage.tsx
```

---

*Created: 2026-05-24*
*Type: Investigation Report (read-only, 3 parallel Explore agent synthesis)*
*Status: 조사 완료 — Tier 1 즉시 WO 3 건 + Tier 2 보조 WO 4 건 + Tier 3 별건 IR 3 건 식별. 8 가능 진입 위치 매트릭스 + 모바일 위험 정량화 + Neture 격차 명문화.*
*Decision Required: Tier 1 의 3 WO (Main Nav + Home Value Cards + Operator Dashboard Card) 진행 순서 + Hero fallback 카피 변경 여부.*
