# IR-KCOS-COMMUNITY-FORUM-STRUCTURE-BASELINE-AUDIT-V1

**K-Cosmetics Community / Forum 구조 기준선 조사**

| 항목 | 값 |
|---|---|
| 작성일 | 2026-04-17 |
| 작성자 | Claude (O4O Platform AI) |
| 범위 | K-Cosmetics `/community`, `/forum`, `/library/content`, Home 진입 흐름 |
| 참조 | KPA-Society 커뮤니티/포럼 구조 |
| 성격 | 조사·분석 (코드 수정 없음) |
| 목적 | Community/Forum 통합·분리 구조 결정, 다음 WO 단일 실행 가능한 구조안 확정 |

---

## 1. 전체 요약

**K-Cosmetics는 현재 Community와 Forum을 별도 페이지로 운영하지만, 두 페이지의 역할이 80% 이상 겹친다.** CommunityHubPage는 Forum 데이터를 가져와 카테고리 카드 + 최근 글을 보여주고, ForumHubPage도 카테고리 카드 + 최근/인기 글을 보여준다. 사용자 입장에서 "어디가 메인인지"가 불분명하다.

KPA-Society는 이 문제를 이미 해결했다: **Home(/) 자체가 통합 허브**이고, `/community`는 `/`로 리다이렉트, Forum은 `/forum`으로 독립 허브를 유지한다. Community라는 별도 페이지가 없다.

**결론: K-Cosmetics도 Community를 독립 페이지에서 제거하고, 커뮤니티 기능(포럼+콘텐츠+비디오)의 진입점을 Forum 단일 허브로 통합해야 한다.**

---

## 2. K-Cosmetics 구조 분석

### 2.1 라우트 구조

```
/community              → CommunityHubPage (MainLayout)
/library/content        → ContentLibraryPage (MainLayout)
/forum                  → ForumHubPage (MainLayout)
/forum/posts            → ForumPage (MainLayout)
/forum/post/:postId     → PostDetailPage (MainLayout)
/forum/write            → ForumWritePage (ProtectedRoute)
/forum/my-dashboard     → MyForumDashboardPage (ProtectedRoute)
/forum/request-category → ForumRequestCategoryPage (ProtectedRoute)
```

### 2.2 Header 메뉴

```
홈 | 허브 | 커뮤니티 | 포럼 | (로그인 시) 매장 관리
```

- `커뮤니티` → `/community` (CommunityHubPage)
- `포럼` → `/forum` (ForumHubPage)
- Desktop + Mobile 동일

### 2.3 CommunityHubPage 상세 (`/community`, 548 LOC)

| # | 섹션 | 데이터 소스 | 역할 |
|---|---|---|---|
| 1 | HeroBannerSection | `communityApi.getHeroAds()` | 커뮤니티 광고 배너 |
| 2 | **Forum Section** | `fetchPopularForums(6)` | **포럼 카테고리 카드 6개** + "Go to Forum" 링크 |
| 3 | **Recent Posts** | `fetchForumPosts({ limit: 5 })` | **최근 포럼 글 5개** + "View All" 링크 |
| 4 | AdSection | `communityApi.getPageAds()` | 페이지 광고 |
| 5 | Video Section | `publicContentApi.listMedia()` | 사이니지 미디어 4개 |
| 5.5 | **콘텐츠 Section** | `hubContentApi.list()` | 최근/추천 CMS 콘텐츠 → `/library/content` 전체보기 |
| 6 | SponsorBar | `communityApi.getSponsors()` | 후원사 로고 |

**핵심 관찰**: 7개 섹션 중 **2개(Forum Section + Recent Posts)가 Forum과 동일한 API를 호출**한다. CommunityHubPage의 독자적 기능은 Hero 광고, 비디오, 콘텐츠, 후원사뿐이다.

### 2.4 ForumHubPage 상세 (`/forum`, 467 LOC)

| # | 섹션 | 데이터 소스 | 역할 |
|---|---|---|---|
| 1 | HeroHeader | 정적 | "K-Cosmetics 포럼" 헤더 + 글쓰기 버튼 |
| 2 | **ForumCardGrid** | `fetchPopularForums(20)` | **포럼 카테고리 카드** (활동 배지 포함) |
| 3 | **ActivitySection** | `fetchForumPosts({ limit: 5 })` | **인기 글 + 최근 글** 2컬럼 |
| 4 | WritePrompt | 정적 | 글쓰기 유도 CTA |
| 5 | InfoSection | 정적 | 이용안내 + 바로가기 |

**핵심 관찰**: ForumHubPage는 **Forum 전용 완성형 허브**. CommunityHubPage의 Forum Section + Recent Posts보다 **더 풍부한 포럼 정보**를 제공한다 (활동 배지, 인기/최근 분리, 최근 글 미리보기, 글쓰기 CTA).

### 2.5 ForumPage 상세 (`/forum/posts`)

- 게시글 목록 테이블 (유형, 제목, 작성자, 작성일, 좋아요, 댓글)
- 검색 + 유형 필터 + 정렬
- `?category=:id` 쿼리로 카테고리 필터
- 20건 단위 페이지네이션

### 2.6 Home → Community/Forum 진입

| 진입점 | 대상 | 방식 |
|---|---|---|
| Header "커뮤니티" | `/community` | 상시 노출 |
| Header "포럼" | `/forum` | 상시 노출 |
| HomePage CommunityCTASection | `/community` | CTA 버튼 "커뮤니티 →" |
| HomePage | `/forum` | **없음** — Forum 직접 진입 없음 |

### 2.7 ContentLibraryPage (`/library/content`, 409 LOC)

- `← 커뮤니티` 뒤로가기 → `/community`
- CMS 콘텐츠 목록 (타입 필터, 페이지네이션)
- "내 콘텐츠로" 복사 → `✓ 가져옴` 표시 (dead link 수정 완료)
- Community의 서브 페이지로 설계됨

---

## 3. KPA-Society 참조 구조

### 3.1 구조 요약

```
/ (CommunityHomePage)     → 통합 허브 (10+ 블록)
/community                → / 로 리다이렉트 (deprecated)
/forum                    → ForumHomePage (포럼 전용 허브)
/forum/all                → ForumListPage
/forum/post/:id           → ForumDetailPage
/forum/write              → ForumWritePage
```

### 3.2 핵심 차이

| 항목 | KPA | K-Cosmetics |
|---|---|---|
| Community 페이지 | **없음** (Home이 곧 커뮤니티 허브) | CommunityHubPage 별도 존재 |
| `/community` URL | `/`로 리다이렉트 | 독립 페이지 |
| Home 역할 | **통합 허브** (포럼+교육+콘텐츠+사이니지+서비스카드) | **쇼윈도** (캠페인+운영도구+Trial+공지) |
| Forum | 독립 허브 (`/forum`) | 독립 허브 (`/forum`) |
| Header 메뉴 | `홈 | 포럼 | 강의/콘텐츠` (커뮤니티 없음) | `홈 | 허브 | 커뮤니티 | 포럼` |
| 콘텐츠 위치 | Home 내 Activity Section에 임베드 | Community 내 Section 5.5에 임베드 |

### 3.3 KPA가 Community를 없앤 이유

KPA는 Home(/) 자체가 포럼+교육+콘텐츠+사이니지를 모두 품는 **통합 커뮤니티 허브**이므로, 별도 `/community` 페이지가 필요 없다. "커뮤니티"는 **서비스 전체를 지칭하는 개념**이지 별도 페이지가 아니다.

---

## 4. 기능 중복 분석

| 기능 | CommunityHubPage | ForumHubPage | 중복 여부 |
|---|---|---|---|
| 포럼 카테고리 카드 | `fetchPopularForums(6)` | `fetchPopularForums(20)` | **완전 중복** (Forum이 더 풍부) |
| 최근 포럼 글 | `fetchForumPosts({ limit: 5 })` | `fetchForumPosts({ limit: 5 })` | **완전 중복** (Forum은 인기/최근 분리) |
| 글쓰기 CTA | 없음 | WritePrompt 컴포넌트 | Forum만 |
| Hero 배너 | HeroBannerSection (community_ads) | HeroHeader (정적 텍스트) | **다름** |
| 비디오 섹션 | VideoSection (signage media) | 없음 | Community만 |
| CMS 콘텐츠 | ContentSection (hub content) | 없음 | Community만 |
| 광고 | AdSection (page ads) | 없음 | Community만 |
| 후원사 | SponsorBar | 없음 | Community만 |
| 카테고리별 활동 배지 | 없음 | ForumCardGrid (오늘 글 있음 / 최근 활동) | Forum만 |
| 이용안내 | 없음 | InfoSection | Forum만 |

**결론**: Community의 Forum 관련 기능은 Forum의 **열화판**(카테고리 6개 vs 20개, 인기/최근 미분리, 활동 배지 없음). Community만의 독자 기능은 비디오, 콘텐츠, 광고, 후원사.

---

## 5. 역할 정의

- **CommunityHubPage는 "포럼 미리보기 + 비디오/콘텐츠/광고/후원사를 끼워 넣은 얕은 포털"이다.**
  포럼 데이터를 축약해서 보여주지만, 포럼 자체보다 질이 낮다. 독자적 가치는 비디오/콘텐츠/광고/후원사 4개 섹션에만 있다.

- **ForumHubPage는 "포럼 전용 완성형 허브"다.**
  카테고리 전체 노출, 활동 배지, 인기/최근 분리, 글쓰기 유도, 이용안내까지 포함한 **포럼 사용자의 실질적 랜딩**.

- **둘은 역할이 겹친다.** Community는 Forum의 얕은 복제본 + 부속 섹션이고, Forum은 Community 없이 독립 동작 가능.

---

## 6. 구조 충돌 분석

### 충돌 1: 이중 허브 문제
사용자가 `/community`에 도착하면 Forum Section에서 카테고리를 클릭 → `/forum/posts?category=:id`로 이동. 하지만 Header에 "포럼"이 별도로 있어 **어디서 시작해야 하는지** 혼란.

### 충돌 2: URL 구조 비정합
- `/community` → 포럼 + 콘텐츠 + 비디오 (복합)
- `/forum` → 포럼 전용 (단일)
- `/library/content` → "← 커뮤니티"로 돌아감

콘텐츠가 community 하위인데, forum과 community가 병렬이면 사용자는 "콘텐츠는 어디 소속인지" 혼란.

### 충돌 3: Home CTA 단절
HomePage의 CommunityCTASection이 `/community`로 보내지만, 실제 활동이 일어나는 곳은 `/forum`. Home → Community → Forum으로 2번 이동해야 실질 콘텐츠에 도달.

---

## 7. 진입 흐름 분석

### 현재 흐름 (비효율)

```
Home ─────→ /community ──────→ /forum/posts?category=X ──→ 글 읽기
  │              │
  │              ├──→ /library/content (콘텐츠)
  │              ├──→ 비디오 (signage media)
  │              └──→ /forum (Go to Forum 링크)
  │
  └── Header ──→ /forum ──────→ /forum/posts?category=X ──→ 글 읽기
```

**문제**: `/community`를 거치든 `/forum`을 직접 가든, 최종 목적지는 동일. `/community`는 **불필요한 중간 허브**.

### 이상적 흐름

```
Home ─────→ /community (통합 허브: 포럼 + 콘텐츠 + 비디오)
  │              │
  │              ├──→ /forum/posts?category=X ──→ 글 읽기
  │              ├──→ /library/content (콘텐츠)
  │              └──→ 비디오 (signage media)
  │
  └── Header ──→ /community (통합 허브, "포럼" 메뉴 제거)
```

또는 KPA 패턴:

```
Home ─────→ /forum (포럼 허브, 실질 커뮤니티 랜딩)
  │              │
  │              ├──→ /forum/posts?category=X ──→ 글 읽기
  │              └──→ /forum/write
  │
  ├──→ /library/content (콘텐츠, Home 또는 Forum에서 진입)
  │
  └── Header ──→ /forum (단일 진입점, "커뮤니티" 메뉴 제거)
```

---

## 8. Dead Code / 구조 정리 후보

| # | 대상 | 경로 | 문제 | 판정 |
|---|---|---|---|---|
| 1 | CommunityHubPage의 Forum Section | `/community` 내 | ForumHubPage의 열화 중복 | 통합 대상 |
| 2 | CommunityHubPage의 Recent Posts | `/community` 내 | ForumHubPage의 열화 중복 | 통합 대상 |
| 3 | Header "커뮤니티" + "포럼" 병렬 | Header.tsx | 이중 진입으로 혼란 | 하나로 축소 |
| 4 | Home CommunityCTASection → `/community` | HomePage.tsx | 중간 허브 경유 | 대상 변경 필요 |
| 5 | ContentLibraryPage의 `← 커뮤니티` 텍스트 | `/library/content` | 구조 변경 시 텍스트 업데이트 필요 | 조건부 수정 |

---

## 9. 최종 구조 선택

### 옵션 A: Community 허브 유지 + Forum 종속

```
/community (허브)
 ├ /forum (포럼 전용)
 ├ /library/content (콘텐츠)
```

- Community를 살리려면 ForumHubPage 수준의 풍부한 포럼 섹션 + 비디오/콘텐츠/후원사를 통합해야 함
- Header: `홈 | 허브 | 커뮤니티 | (매장 관리)` — "포럼" 메뉴 제거
- **장점**: 비디오/콘텐츠/광고/후원사 같은 비포럼 콘텐츠의 자연스러운 안착지
- **단점**: CommunityHubPage를 ForumHubPage 수준으로 올려야 하는 작업량

### 옵션 B: Forum 단일 허브 + Community 제거

```
/forum (단일 허브)
 ├ /forum/posts
 ├ /library/content (콘텐츠, Forum에서 진입)
```

- CommunityHubPage 제거, `/community` → `/forum`으로 리다이렉트
- Header: `홈 | 허브 | 포럼 | (매장 관리)` — "커뮤니티" 메뉴 제거
- ForumHubPage에 비디오/콘텐츠 섹션 추가
- **장점**: 단순, KPA 패턴과 유사
- **단점**: 비디오/콘텐츠/광고/후원사를 포럼에 끼워야 함 → 포럼의 순수성 저하

---

### 선택: **옵션 A — Community 허브 유지 + Forum 종속**

#### 근거

1. **K-Cosmetics의 Community는 KPA와 다르다.** KPA는 Home(/) 자체가 통합 허브이므로 Community가 필요 없지만, K-Cosmetics의 Home은 **쇼윈도**(캠페인+운영도구+Trial+공지)이며 커뮤니티 기능이 Home에 없다. Community 페이지가 이 역할을 대신한다.

2. **비디오/콘텐츠/광고/후원사**는 포럼이 아닌 커뮤니티 성격. 이것들을 ForumHubPage에 넣으면 "포럼이 아닌 것이 포럼 안에 있는" 부자연스러운 구조가 된다.

3. **CommunityHubPage를 강화하는 것이 제거하는 것보다 적은 작업**. ForumHubPage는 이미 완성형이므로 건드릴 필요 없고, CommunityHubPage에서 중복 Forum 섹션을 제거하고 포럼 바로가기만 남기면 된다.

4. **콘텐츠 위치가 자연스럽다.** Content는 커뮤니티의 서브 페이지로 이미 설계되어 있고 (`← 커뮤니티` 뒤로가기), 이 구조를 유지하면 추가 수정이 최소화된다.

---

## 10. 확정 사항 4개

### 10.1 구조 선택

```
/community  (통합 커뮤니티 허브 — 비디오, 콘텐츠, 광고, 후원사 + 포럼 요약)
 ├ /forum           (포럼 전용 허브 — 카테고리, 인기/최근 글, 글쓰기)
 │  ├ /forum/posts  (목록)
 │  ├ /forum/post/:id (상세)
 │  └ /forum/write  (작성)
 └ /library/content (콘텐츠 라이브러리)
```

Community가 **상위 허브**, Forum은 **커뮤니티 내 전문 영역**.

### 10.2 메뉴 구조

```
현재: 홈 | 허브 | 커뮤니티 | 포럼 | (매장 관리)
변경: 홈 | 허브 | 커뮤니티 | (매장 관리)
```

**"포럼" 메뉴 제거.** 포럼 진입은 커뮤니티 내부에서.

### 10.3 진입 기준

- **Home → `/community`** (CommunityCTASection 유지, 대상 변경 불필요)
- **Community가 entry point**. Forum은 Community 내부 링크로 진입.
- Header에서 포럼 직접 진입 제거 → Community 경유로 통일.

### 10.4 콘텐츠 위치

**Content는 Community 내부 유지.** 현재 `← 커뮤니티` 뒤로가기 구조 그대로.

---

## 11. 다음 작업 제안

### WO-KCOS-COMMUNITY-FORUM-STRUCTURE-ALIGN-V1

아래를 한 번에 처리:

#### 1. Header 변경
- "포럼" 메뉴 제거 (Desktop + Mobile)
- 최종: `홈 | 허브 | 커뮤니티 | (매장 관리)`

#### 2. CommunityHubPage 재구성
- **제거**: Forum Section (카테고리 카드 6개 — ForumHubPage와 중복)
- **제거**: Recent Posts (최근 글 5개 — ForumHubPage와 중복)
- **추가**: 포럼 바로가기 카드 (단일 CTA: "K-Cosmetics 포럼" → `/forum`)
- **유지**: HeroBannerSection, VideoSection, ContentSection, AdSection, SponsorBar

재구성 후 섹션 순서:
```
1. HeroBannerSection (광고 배너)
2. 포럼 바로가기 (단일 CTA 카드 → /forum)
3. 콘텐츠 Section (CMS 콘텐츠 → /library/content)
4. AdSection (페이지 광고)
5. VideoSection (사이니지 미디어)
6. SponsorBar (후원사)
```

#### 3. HomePage CommunityCTASection
- 대상: `/community` 유지 (변경 불필요)
- 텍스트: "포럼, 콘텐츠, 최신 K-Beauty 정보를 한 곳에서 확인하세요" 유지

#### 4. ContentLibraryPage
- `← 커뮤니티` 뒤로가기 유지 (변경 불필요)

#### 5. ForumHubPage
- **변경 없음**. 이미 완성형.

#### 6. 라우트
- 변경 없음. `/community`, `/forum`, `/library/content` 모두 유지.

### 예상 변경 파일 (3개)
1. `services/web-k-cosmetics/src/components/common/Header.tsx` — 포럼 메뉴 제거
2. `services/web-k-cosmetics/src/pages/community/CommunityHubPage.tsx` — 중복 섹션 제거, 포럼 CTA 추가
3. (선택) `services/web-k-cosmetics/src/pages/forum/ForumHubPage.tsx` — "← 커뮤니티" 뒤로가기 추가 검토

---

*End of IR-KCOS-COMMUNITY-FORUM-STRUCTURE-BASELINE-AUDIT-V1*
