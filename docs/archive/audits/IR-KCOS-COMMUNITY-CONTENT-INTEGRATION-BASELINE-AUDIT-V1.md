# IR-KCOS-COMMUNITY-CONTENT-INTEGRATION-BASELINE-AUDIT-V1

> **작업 분류:** Integration Report / Baseline Audit
> **작업 범위:** K-Cosmetics 커뮤니티 + 콘텐츠 통합 구조 기준선 조사
> **관련 WO:** WO-KCOS-COMMUNITY-CONTENT-INTEGRATION-V1 (예정)
> **작성일:** 2026-04-17

---

## 1. 전체 요약

**한 줄 결론:**
K-Cosmetics의 커뮤니티(`/community`)는 이미 포럼과 콘텐츠를 내부에 포함하는 허브 구조이며, `/library/content`는 커뮤니티의 서브 페이지로 설계되어 있다. 현재 헤더에 `콘텐츠`를 별도 메뉴로 노출하는 것은 구조와 충돌한다.

**최종 판정:** FINDINGS CONFIRMED — WO 진행 근거 확보

---

## 2. K-Cosmetics 현재 구조 분석

### 2.1 라우트 목록 (전체)

| 경로 | 페이지 | 구현 상태 |
|------|--------|----------|
| `/community` | CommunityHubPage | ✅ 완전 구현 (8섹션) |
| `/forum` | ForumHubPage | ✅ 완전 구현 (Daum 스타일) |
| `/forum/posts` | ForumPage | ✅ 완전 구현 (테이블 + 검색) |
| `/forum/post/:id` | PostDetailPage | ✅ 완전 구현 |
| `/forum/write` | ForumWritePage | ✅ 완전 구현 (ProtectedRoute) |
| `/forum/my-dashboard` | MyForumDashboardPage | ✅ 완전 구현 |
| `/forum/request-category` | RequestCategoryPage | ✅ 완전 구현 |
| `/library/content` | ContentLibraryPage | ✅ 완전 구현 |

---

### 2.2 CommunityHubPage (`/community`) — 핵심 발견

**8개 섹션 구성:**

| # | 섹션 | API 연동 | 상태 |
|---|------|---------|------|
| 1 | HeroBannerSection | `communityApi.getHeroAds()` | ✅ |
| 2 | ForumSection | `fetchPopularForums(6)` | ✅ |
| 3 | LatestPostsSection | `fetchForumPosts({ limit: 5 })` | ✅ |
| 4 | AdSection | `communityApi.getPageAds()` | ✅ |
| 5 | VideoSection | `publicContentApi.listMedia(...)` | ✅ |
| 5.5 | **ContentSection** | `hubContentApi.list({ sourceDomain: 'cms' })` | ✅ |
| 6 | ResourceSection | — | ❌ placeholder ("coming soon") |
| 7 | SponsorBar | `communityApi.getSponsors()` | ✅ |

**핵심 코드:**
```tsx
// CommunityHubPage.tsx:179
<Section title="콘텐츠" linkTo="/library/content" linkLabel="전체보기 →">
```

→ CommunityHubPage는 이미 `/library/content`로의 "전체보기" 링크를 내장하고 있다.

**API 호출 방식:**
```typescript
Promise.allSettled([
  communityApi.getHeroAds(),
  communityApi.getPageAds(),
  communityApi.getSponsors(),
  fetchPopularForums(6),
  fetchForumPosts({ limit: 5 }),
  publicContentApi.listMedia(undefined, 'k-cosmetics', { limit: 4 }),
  hubContentApi.list({ sourceDomain: 'cms', limit: 50 }),
])
```

총 7개 API 병렬 호출. Promise.allSettled 기반 부분 실패 처리.

---

### 2.3 ContentLibraryPage (`/library/content`) — 핵심 발견

**뒤로가기 목적지:**
```tsx
// ContentLibraryPage.tsx:122
<Link to="/community" style={styles.backLink}>← 커뮤니티</Link>
```

→ ContentLibraryPage는 `/community`를 부모로 간주하고 설계되었다.
→ **ContentLibraryPage는 독립 페이지가 아니라 커뮤니티의 서브 페이지**다.

**기능:**
- `hubContentApi.list({ sourceDomain: 'cms', page, limit: 12 })` — CMS 콘텐츠 목록
- 타입 필터: 전체 | 공지 | 가이드 | 지식 | 프로모션 | 뉴스 (클라이언트 필터링)
- "내 콘텐츠로 복사" 기능 (`dashboardCopyApi`) — 로그인 사용자 전용
- `/my-content` 이동 → **해당 라우트 미존재** (dead link)

---

### 2.4 ForumHubPage (`/forum`) — 구조 확인

**구성:**
- Daum 카페 스타일 포럼 카테고리 카드 (그리드)
- 활동 신호 배지 ("오늘 글 있음", "최근 활동")
- 인기 글 + 최근 글 (ActivitySection)
- `fetchPopularForums(20)` + `fetchForumPosts({ limit: 30 })`

**CommunityHubPage와의 관계:**
- Community의 ForumSection: `fetchPopularForums(6)` → `/forum/posts?category=` 링크
- Community의 LatestPostsSection: `fetchForumPosts({ limit: 5 })` → `/forum/post/:id` 링크
- 즉 Community는 Forum의 **미리보기 허브**이며, Forum은 **전체 참여 공간**

역할이 다르므로 분리 유지가 적합.

---

### 2.5 HomePage → 커뮤니티/콘텐츠 연결

**코드 확인 결과:**

```
HomePage.tsx에서 /community, /forum, /library/content로의 링크: 0개
```

→ HomePage는 커뮤니티/콘텐츠로의 **직접 진입 경로가 없다.**
→ 사용자는 헤더 메뉴를 통해서만 커뮤니티와 콘텐츠에 접근 가능.
→ NowRunning, Partners, Notice 섹션 모두 외부 링크 또는 홈 내부 섹션 전용.

---

## 3. KPA-Society 참조 구조 분석

### 3.1 커뮤니티 구조 (CommunityHomePage)

**홈 = 커뮤니티 허브** 통합 방식:
- KPA-Society의 `/`(홈)은 CommunityHomePage다.
- 10개 섹션: HeroBanner + Notice + MarketTrial + **ActivitySection** + **EducationSection** + Signage + Services + Ad + SponsorBar + Footer

**핵심 참조 패턴:**
```typescript
// KPA CommunityHomePage — homeApi.prefetchAll() 단일 호출
// 백엔드 통합 API → K-Cosmetics는 7개 분산 호출
```

---

### 3.2 ActivitySection (KPA)

KPA의 ActivitySection = 포럼 최근 글 + 추천 콘텐츠를 하나의 섹션으로 묶음.
→ K-Cosmetics CommunityHubPage는 이를 ForumSection + LatestPostsSection + ContentSection으로 분리 구현.
→ 역할은 동일하나 K-Cosmetics가 더 세분화되어 있음.

---

### 3.3 EducationSection (KPA)

- KPA: `/lms` 라우트 + EducationPage + LmsCoursesPage + LmsCourseDetailPage
- K-Cosmetics: LMS 없음, 강의 없음

**판단:** K-Cosmetics에는 LMS/강의 기능 이식 불필요. ContentLibraryPage(가이드/지식/프로모션)로 충분.

---

### 3.4 콘텐츠 역할 차이

| 항목 | K-Cosmetics | KPA-Society |
|------|------------|------------|
| 콘텐츠 진입 | `/library/content` | `/content` (뉴스/공지) |
| 강의/교육 | 없음 | `/lms` (LMS 풀 구현) |
| 복사 기능 | 있음 (dashboardCopyApi) | 없음 |
| 콘텐츠 위상 | 커뮤니티 서브 페이지 | 독립 상위 메뉴 |

→ K-Cosmetics의 `/library/content`는 KPA의 `/content`와 위상이 다름.
→ KPA는 `/content`가 독립 메뉴지만 K-Cosmetics는 커뮤니티 하위 개념.

---

## 4. 기능 중복 및 충돌 분석

| 항목 | 현상 | 판정 |
|------|------|------|
| Community ForumSection + ForumHubPage | 동일 카테고리 데이터 사용 (6개 vs 20개) | **역할 구분 존재** (미리보기 vs 전체) |
| Community ContentSection + ContentLibraryPage | 동일 API(`hubContentApi.list`) | **중복** — Community는 미리보기, Library는 전체 목록 |
| 헤더 `콘텐츠` + Community ContentSection | 두 경로 모두 `/library/content`로 연결 | **구조 충돌** |
| 헤더 `커뮤니티` + 헤더 `포럼` | Community가 Forum을 내포 | **부분 중복** — 역할 차이로 허용 가능 |
| ContentLibraryPage back link → /community | 서브 페이지 설계 의도 | 헤더 독립 메뉴와 **불일치** |

---

## 5. 역할 정의

### 커뮤니티 (`/community`)
> K-Cosmetics 공개 포털 허브.
> 포럼 미리보기 + 콘텐츠 미리보기 + 광고/스폰서 + 비디오를 통합 표시.
> 사용자가 "무엇이 있는지" 발견하는 공간.

### 포럼 (`/forum`, `/forum/*`)
> 글 작성, 토론, 카테고리 탐색, 활동 참여 공간.
> Community의 ForumSection에서 미리보기 후 진입하는 목적지.
> 독립 UX(Daum 스타일) 보유.

### 콘텐츠 (`/library/content`)
> CMS 자료 전체 목록 (공지/가이드/지식/프로모션/뉴스).
> Community의 ContentSection에서 미리보기 후 "전체보기" 진입.
> 커뮤니티의 **서브 페이지**. 독립 상위 메뉴로 부적합.

### 허브 (`/hub`)
> Market Layer 허브. B2B, CMS 슬롯, 파트너 진입.
> 커뮤니티/콘텐츠와 별개의 영역. 분리 유지.

---

## 6. 메뉴/진입 구조 문제

### 현재 헤더 (WO-KCOS-MENU-STRUCTURE-ALIGN-V1 적용 후)

```
홈 | 허브 | 콘텐츠 | 커뮤니티 | 포럼
```

### 문제점

**문제 1: 콘텐츠 메뉴의 위상 불일치**
- ContentLibraryPage는 back 버튼이 `/community`를 가리킴
- CommunityHubPage에는 이미 ContentSection + "전체보기 →" 링크 존재
- 헤더에 독립 `콘텐츠` 메뉴를 두는 것은 구조 설계와 충돌

**문제 2: 커뮤니티-콘텐츠 이중 경로**
- 사용자는 `헤더 → 콘텐츠` OR `헤더 → 커뮤니티 → ContentSection → 전체보기`로 동일한 곳에 도달
- 이중 경로는 커뮤니티의 허브 역할을 희석

**문제 3: HomePage 진입 단절**
- Home에서 커뮤니티/콘텐츠로의 링크 없음
- 헤더 메뉴에만 의존 → 모바일에서 진입 어려움

**문제 4: Community vs Forum 위상**
- 현재 헤더에 `커뮤니티`와 `포럼`이 병렬
- Community가 Forum을 내포하는 구조이므로 사용자 혼란 가능
- 그러나 역할 구분(발견 vs 참여)은 명확하므로 분리 유지 가능

---

## 7. 이식 및 제거 대상

### 이식 불필요 (현재 상태 유지)

| 항목 | 이유 |
|------|------|
| CommunityHubPage 8섹션 구조 | 완전 구현, API 연동 완료 |
| ForumHubPage + ForumPage | 완전 구현, 독립 UX 보유 |
| ContentLibraryPage | 완전 구현, 역할 유지 |
| LMS/강의 | K-Cosmetics 불필요 |

### 구조 조정 필요

| 항목 | 조정 방향 |
|------|---------|
| 헤더 `콘텐츠` 메뉴 | 제거 → 커뮤니티 하위 진입으로 정리 |
| ContentLibraryPage 위상 | 서브 페이지 명시 (현재 back link은 이미 맞음) |
| Home → 커뮤니티 진입 | 홈에 커뮤니티 유입 경로 추가 (옵션) |

### 제거 대상 (Dead Code)

| 항목 | 이유 |
|------|------|
| CommunityHubPage ResourceSection | placeholder "coming soon", 미연결 |
| ContentLibraryPage `/my-content` navigate | 라우트 미존재 → dead link |

---

## 8. Dead Code 후보

| 파일 | 위치 | 내용 |
|------|------|------|
| `CommunityHubPage.tsx` | ResourceSection | `"coming soon"` placeholder |
| `ContentLibraryPage.tsx` | line 58 | `navigate('/my-content')` — `/my-content` 라우트 없음 |

---

## 9. 최종 구조 제안

### 9.1 결론

> **커뮤니티와 콘텐츠는 통합이 아니라 포함 관계다.**
> ContentLibraryPage를 커뮤니티의 서브 페이지로 명확히 하고, 헤더에서 제거한다.
> 커뮤니티와 포럼은 분리 유지 (역할 구분 명확).

---

### 9.2 최종 헤더 구조

```
홈 | 허브 | 커뮤니티 | 포럼
```

- `콘텐츠` 제거 → CommunityHubPage ContentSection → "전체보기" 경로로만 진입
- `허브` 유지 (Market Layer, B2B — 별개 영역)
- `커뮤니티` 유지 (포털 허브)
- `포럼` 유지 (참여 공간, 역할 구분)

---

### 9.3 페이지 간 연결 구조

```
홈
  └── (헤더) 커뮤니티 (/community)
                ├── ForumSection → 포럼 (/forum)
                │     └── /forum/posts → /forum/post/:id
                │           └── /forum/write
                └── ContentSection → 콘텐츠 (/library/content)
                      └── 뒤로가기 → /community ✅

홈
  └── (헤더) 포럼 (/forum)
                └── 직접 진입 (글 작성, 활동 중심)

홈
  └── (헤더) 허브 (/hub)
                └── Market Layer, B2B, CMS 슬롯
```

---

### 9.4 Home → 커뮤니티 유입 (옵션)

현재 Home에는 커뮤니티로의 링크가 없다.
다음 중 한 가지를 추가할 수 있다.

| 옵션 | 방식 | 우선순위 |
|------|------|---------|
| Notice 클릭 → `/community` | NoticeSection에 "커뮤니티 더보기" | 높음 |
| Partners 섹션 하단 | "커뮤니티에서 브랜드를 만나세요" 링크 | 중간 |
| CTASection 버튼 추가 | "커뮤니티 가입하기" | 낮음 |

이 옵션은 WO 범위에 포함 여부를 결정 후 진행.

---

## 10. WO-KCOS-COMMUNITY-CONTENT-INTEGRATION-V1 권장 범위

### 필수 (구조 정합성)

1. **헤더 `콘텐츠` 메뉴 제거** — `/library/content` 독립 nav 제거
   - Desktop + Mobile 동시 적용
   - ContentLibraryPage back link `/community` 이미 정합

2. **CommunityHubPage ResourceSection 제거** — dead placeholder 정리

3. **ContentLibraryPage `/my-content` navigate 수정** — dead link 처리
   - 라우트 추가 OR navigate 제거 OR `/mypage`로 대체

### 옵션 (Home 유입 개선)

4. **HomePage → 커뮤니티 진입 경로 1개 추가** — NoticeSection 또는 별도 섹션

### 제외 (범위 초과)

- 커뮤니티/포럼 통합 여부 재검토 (현재 구조가 더 명확)
- LMS 이식 (불필요)
- ContentLibraryPage 기능 확장

---

## 11. 최종 판정

**IR-KCOS-COMMUNITY-CONTENT-INTEGRATION-BASELINE-AUDIT-V1 — FINDINGS CONFIRMED**

핵심 판단:
- 커뮤니티/포럼 분리 **유지**
- 콘텐츠 = 커뮤니티 서브 페이지 **확정**
- 헤더 `콘텐츠` **제거**
- WO 진행 근거 확보 완료
