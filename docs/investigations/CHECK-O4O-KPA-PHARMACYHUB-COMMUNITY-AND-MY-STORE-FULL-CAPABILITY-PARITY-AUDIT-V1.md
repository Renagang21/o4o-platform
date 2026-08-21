# CHECK — KPA-Society ↔ PharmacyHub 커뮤니티·내 매장 전체 capability parity 감사

- **WO**: WO-O4O-KPA-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-CAPABILITY-PARITY-AUDIT-V1
- **작성일**: 2026-08-21
- **기준 브랜치/커밋**: `main` (감사 시작 `0be45f9e5` → 진행 중 타 세션 진척으로 `d4e48cb5b`)
- **성격**: 감사(Audit) 우선. 대규모 구현 없음 — §17 허용 범위의 소규모 진입점 수정 1건만 반영

> **핵심 원칙 (WO §1 / 마무리)**
> KPA-Society 와 PharmacyHub 는 **커뮤니티**와 **내 매장** capability 가 동일해야 한다.
> 두 서비스의 차이는 **매장허브에서 서비스 운영자가 역할을 하느냐 하지 않느냐**에 있다.
> 따라서 커뮤니티·내 매장에서 "PH 에 구현이 없다"는 사실만으로 `INTENTIONAL_DIFFERENCE` 처리하지 않는다.

---

## 1. 집계 블록 (§22)

```text
전체 capability 모집단: 97
ADOPTED: 49
PARTIAL_ADOPTION: 4
MISSING_ADOPTION: 41
INTENTIONAL_DIFFERENCE: 2
OUT_OF_SCOPE: 1
미조사: 0
```

```text
P0 (정상 핵심 동선 끊김 / 보안·권한): 1
P1 (KPA 핵심 capability 부재): 23
P2 (보조·편의): 21
```

```text
KPA_PH_COMMUNITY_MY_STORE_PARITY = NOT_COMPLETE
```

판정 근거: §19–§20 완료 조건은 `PARTIAL_ADOPTION 0` · `MISSING_ADOPTION 0` · `P0 0` · `P1 0` 이다.
현재 P0 1건 · P1 23건 · MISSING 41건이 남아 있으므로 `NOT_COMPLETE` 이다.
(모집단 census 는 완료되어 `미조사 0` 이다 — 감사 자체는 종료 가능하며, 해소는 §18 후속 묶음 WO 소관이다.)

---

## 2. 판정 체계 적용 원칙 (§3)

| 판정 | 이 감사에서의 적용 |
|---|---|
| `ADOPTED` | route/화면/클라이언트/백엔드/진입점이 모두 살아 있고 KPA 와 동일 업무를 수행할 수 있다. URL·데이터 소스가 달라도 무방 (§9) |
| `PARTIAL_ADOPTION` | 기능은 있으나 진입점이 없거나, 축 일부만 구현되어 KPA 대비 업무가 끊긴다 (§7/§11) |
| `MISSING_ADOPTION` | PH 에 해당 capability 가 없다. 공통 View/백엔드가 이미 있는데 PH 래퍼만 없는 경우도 포함 |
| `INTENTIONAL_DIFFERENCE` | **매장허브 서비스 운영자 개입 차이에만** 사용 — 이번 감사에서 2건뿐 |
| `OUT_OF_SCOPE` | 커뮤니티·내 매장 capability 축이 아닌 KPA 단체(약사회) 고유 자격 도메인 |

---

## 3. 커뮤니티 홈 (축 A)

| # | Capability | KPA 구현 | PH 구현 | KPA shared module | PH shared module | 판정 | gap 근거 | 필요 조치 |
|---|---|---|---|---|---|---|---|---|
| 1 | 커뮤니티 홈 화면 | `/community` CommunityHomePage | `/community` CommunityHomePage | StandardHomeTemplate | StandardHomeTemplate | ADOPTED | 공통 템플릿 동일 채택 | — |
| 2 | 최신 활동 피드(전 축) | forum·content·resources·course 4축 | forum·course 2축 | LatestActivitySection | LatestActivitySection | PARTIAL_ADOPTION | `/pharmacy-hub/home/latest` 가 forum·course 만 반환 (콘텐츠·자료 축 부재) | 콘텐츠·자료 도입 시 축 추가 (P1) |
| 3 | 커뮤니티 진입 바로가기 | 포럼·강의·콘텐츠·자료실·사이니지 5축 | 포럼·교육 2축 | StandardHomeTemplate | StandardHomeTemplate | PARTIAL_ADOPTION | `CommunityHomePage` 주석 "PH 는 Content·Resources 가 미구현이므로 탭·카드·링크를 만들지 않는다" | 콘텐츠·자료 도입과 lockstep (P1) |

---

## 4. 포럼 (축 B)

| # | Capability | KPA | PH | 판정 | 근거 / 조치 |
|---|---|---|---|---|---|
| 4 | 포럼 허브 | `/forum` | `/forum` (ForumHubTemplate) | ADOPTED | 공통 템플릿 |
| 5 | 포럼별 피드 | `/forum/:slug` | `/forum/posts?forum=` | ADOPTED | URL 형태만 다름 (§9) |
| 6 | 전체 글 목록 | `/forum/all` | `/forum/posts` | ADOPTED | — |
| 7 | 글 상세 | `/forum/post/:id` | `/forum/posts/:postId` | ADOPTED | — |
| 8 | 글 작성 | `/forum/write` | `/forum/write` | ADOPTED | — |
| 9 | 글 수정·삭제 | `/forum/edit/:id` | `/forum/edit/:postId` | ADOPTED | — |
| 10 | 댓글 CRUD | ForumCommentList/Form | 동일 공통 컴포넌트 | ADOPTED | ForumDetailPage 확인 |
| 11 | 좋아요 | ForumLikeButton | 동일 | ADOPTED | — |
| 12 | 태그·검색 | 목록 검색·인기 태그 | `/community/search` + 목록 검색 | ADOPTED | — |
| 13 | 내가 쓴 글 | `/forum/my-posts` | `/forum/my-posts` | ADOPTED | MyForumPostsTemplate 공통 |
| 14 | **포럼 개설 신청** | `/forum/request` (KpaRequestCategoryPage) | **없음** | **MISSING_ADOPTION (P0)** | PH 운영자에는 `/operator/forum-requests` 심사 콘솔이 있고 백엔드 `POST /forum/categories` 도 살아 있는데, **회원 신청 입구가 없어 심사 큐에 유입 경로가 0** — 정상 핵심 동선 끊김. GP·KCos·Neture 는 모두 신청 화면 보유 |
| 15 | 내 포럼 대시보드(운영) | `/mypage/my-forums` | 없음 | MISSING_ADOPTION (P1) | 백엔드 `GET /forum/categories/mine`·`PATCH /categories/:id/owner` 존재 |
| 16 | 포럼 회원 관리(승인/거절/추방) | `/mypage/my-forums/:forumId/members` | 없음 | MISSING_ADOPTION (P1) | 백엔드 `join-requests`·`members` 존재 |
| 17 | 비공개 포럼 가입 신청·멤버십 게이트 | 있음 | 없음 | MISSING_ADOPTION (P1) | PH 소스에 `membership-status`·`join-requests` 참조 0건 |
| 18 | 포럼 삭제 요청 | 있음 | 없음(운영자 심사 콘솔만) | MISSING_ADOPTION (P1) | `POST /categories/:id/delete-request` 미사용 |
| 19 | 내 신청 현황 | `/mypage/my-requests` | 없음 | MISSING_ADOPTION (P1) | 신청 후 상태 확인 불가 |

> 백엔드는 **공통 `createServiceForumRouter`** 로 PH 에 이미 마운트되어 있으며 위 14~19 의 엔드포인트가 전부 살아 있다. 즉 gap 은 **프론트 화면·진입점 부재**다.

---

## 5. 커뮤니티 콘텐츠 (축 C)

| # | Capability | KPA | PH | 판정 |
|---|---|---|---|---|
| 20 | 콘텐츠 목록 | `/content` ContentListPage | 없음 | MISSING_ADOPTION (P1) |
| 21 | 콘텐츠 상세 | `/content/:id` | 없음 | MISSING_ADOPTION (P1) |
| 22 | 콘텐츠 작성 | `/content/documents/new` (CommunityContentWriteShell) | 없음 | MISSING_ADOPTION (P1) |
| 23 | 콘텐츠 수정·삭제 | `/content/:id/edit` | 없음 | MISSING_ADOPTION (P1) |
| 24 | 설문(surveys) | `/content/surveys` | 없음 | MISSING_ADOPTION (P2) |

근거: `CommunityContentDetailView` / `CommunityContentWriteShell` 은 KPA·GlycoPharm·K-Cosmetics 가 채택했으나 **PH 채택 0건**. 백엔드도 `/api/v1/pharmacy-hub/contents` 계열 라우터가 없다.
§9 관점 확인: "KPA 사용자가 커뮤니티에서 하는 콘텐츠 업무를 PH 사용자는 어디서 하는가?" → **대체 경로 없음**(매장 콘텐츠 `/store-owner/content` 는 매장 실행 자산 축이라 커뮤니티 공유 콘텐츠를 대체하지 않는다).

---

## 6. 자료실 (축 D)

| # | Capability | KPA | PH | 판정 |
|---|---|---|---|---|
| 25 | 자료실 허브 | `/resources` (ResourcesHubTemplate) | 없음 | MISSING_ADOPTION (P1) |
| 26 | 자료 상세 | `/resources/:id` | 없음 | MISSING_ADOPTION (P1) |
| 27 | 자료 등록·수정 | `/resources/new`, `/:id/edit` | 없음 | MISSING_ADOPTION (P1) |
| 28 | 추천·조회수 | `/contents/:id/recommend`·`/view` | 없음 | MISSING_ADOPTION (P2) |

`ResourcesHubTemplate` 채택 현황: KPA 1 / GlycoPharm 1 / K-Cosmetics 1 / Neture 1 / **PharmacyHub 0** — 5서비스 중 PH 만 미채택.

---

## 7. LMS 단계별 parity (축 E, §8 엄격 적용)

| # | 단계 | KPA | PH | 판정 |
|---|---|---|---|---|
| 29 | 교육 허브 | `/lms` | `/education` (LmsHubTemplate) | ADOPTED |
| 30 | 강의 목록 | `/lms` | `/education` | ADOPTED |
| 31 | 강의 상세 | `/lms/course/:id` (CourseDetailView) | `/education/course/:id` | ADOPTED |
| 32 | 레슨 학습 | `/lms/course/:courseId/lesson/:lessonId` | 동일 구조 | ADOPTED |
| 33 | 수강 신청(enroll) | 있음 | **없음** — `enrollmentEnabled: false`, `enroll: async () => null` | MISSING_ADOPTION (P1) |
| 34 | 내 수강 목록 | `/mypage/enrollments` | 없음 | MISSING_ADOPTION (P1) |
| 35 | 진도 저장 | 있음 | `updateProgress: async () => null` | MISSING_ADOPTION (P1) |
| 36 | 수료 처리 | 있음 | 없음 | MISSING_ADOPTION (P1) |
| 37 | 수료증 발급 | `/lms/certificate` | `certificatesPath: null` | MISSING_ADOPTION (P1) |
| 38 | 내 수료증·학습 결과 | `/mypage/certificates` | 없음 | MISSING_ADOPTION (P1) |
| 39 | 퀴즈 | 있음 | 없음 | MISSING_ADOPTION (P1) |
| 40 | 과제 제출 | 있음 (강사 제출물 관리 포함) | 없음 | MISSING_ADOPTION (P2) |
| 41 | 강사 프로필 | `/instructors/:userId` | 없음 | MISSING_ADOPTION (P2) |
| 42 | 강사 운영 콘솔 | `/instructor/*` (9 route) | 없음 | MISSING_ADOPTION (P2) |
| 43 | 이수 학점 | `/mypage/credits` | 없음 | MISSING_ADOPTION (P2) |

**결정적 근거** — `services/web-pharmacy-hub/src/pages/education/lmsViewAdapter.ts`:

```ts
export const phLmsPort: LmsLearnerPort = {
  getCourse, getLessons, getLesson,
  getEnrollment: async () => null,
  enroll: async () => null,
  updateProgress: async () => null,
};
```

- 백엔드는 **서비스 중립**(`/api/v1/lms/*`)이며 `enrollments/me`, `courses/:courseId/enroll`, `enrollments/:courseId/progress`, `quizzes/:quizId/submit` 이 모두 존재한다.
- 공통 클라이언트 `@o4o/lms-client` 도 해당 메서드를 이미 제공한다.
- 따라서 gap 은 **PH 어댑터·화면 배선 부재**이며, `/education` 이 존재한다는 이유로 parity 완료로 볼 수 없다 (§8).
- 과거 WO 가 "조회·학습 baseline" 으로 범위를 좁힌 것은 사실이나, §3 에 따라 이는 **매장허브 운영자 개입 차이가 아니므로 `INTENTIONAL_DIFFERENCE` 로 처리하지 않는다.**

---

## 8. 멤버십·마이페이지·검색 (축 F/G/H)

| # | Capability | KPA | PH | 판정 |
|---|---|---|---|---|
| 44 | 서비스 가입·상태 확인 | 가입/승인 | `/join`, `/join/status` | ADOPTED |
| 45 | 멤버십 기반 쓰기 게이트 | 인증 기반 | `requireActiveServiceMembership` | ADOPTED (승인 회원 기준 capability 동일) |
| 46 | 프로필 조회·수정 | `/mypage/profile` | `/account` | ADOPTED |
| 47 | 마이페이지 대시보드 | `/mypage` MyDashboardPage | 프로필 단일 화면 | PARTIAL_ADOPTION (P2) |
| 48 | 알림·설정 | `/mypage/settings` | 없음 | MISSING_ADOPTION (P2) |
| 49 | 약사 자격·분회 | `/mypage/qualifications` | 없음 | OUT_OF_SCOPE (약사회 단체 자격 도메인) |
| 50 | 커뮤니티 검색 | 포럼 검색 | `/community/search` | ADOPTED |
| 51 | 내 활동 통합(내 글·내 수강·내 신청) | 3축 | 내 글 1축 | PARTIAL_ADOPTION (P2) |
| 52 | 커뮤니티 사이니지 허브 | `/signage` ContentHubPage | 없음 (매장 사이니지만) | MISSING_ADOPTION (P2) |

---

## 9. 내 매장 전체 parity (§5, 축 I)

| # | Capability | KPA route | PH route | 판정 |
|---|---|---|---|---|
| 53 | 매장 홈 대시보드 | `/store` | `/store-owner` | ADOPTED (StoreDashboardLayout 공통) |
| 54 | 매장 홈 바로가기 | StoreHomeShortcutGrid | 동일 채택 | ADOPTED |
| 55 | 공급 상품 목록·상세 | `/store-hub/b2b` 등 | `/store-owner/products(/:offerId)` | ADOPTED |
| 56 | 장바구니 | `/store-hub/cart` | `/store-owner/cart` | ADOPTED |
| 57 | 주문 생성·결제 | 있음 | `/store-owner/payment/*` (Toss) | ADOPTED |
| 58 | 주문 내역·상세 | `/store/commerce/orders` | `/store-owner/orders(/:orderId)` | ADOPTED |
| 59 | 매장 경영활용 제품 | `/store/handled-products` | `/store-owner/handled-products` | ADOPTED |
| 60 | 매장 자체 상품 | `/store/commerce/local-products` | `/store-owner/local-products` | ADOPTED (StoreLocalProductsManager 공통) |
| 61 | 상품 설명서 | `/store/marketing/product-descriptions` | `/store-owner/manuals(/:listingId)` | ADOPTED |
| 62 | 매장 콘텐츠 | `/store/content` | `/store-owner/content` | ADOPTED |
| 63 | 자료함 — 매장 제작 자료 | `/store/library/production-materials` | `/store-owner/library` | ADOPTED (StoreProductionMaterialsView 공통) |
| 64 | 자료함 — 자료 등록·관리 | `/store/library/resources` + 사이드바 '자료' | route·화면 존재, **사이드바 진입점 없음** | PARTIAL_ADOPTION → **이번 WO 에서 해소** |
| 65 | 블로그 | `/store/content/blog` | `/store-owner/blog(+new,:id/edit)` | ADOPTED |
| 66 | POP + 허브 가져오기 | `/store/marketing/pop` | `/store-owner/pop` (`/pop/hub`,`/pop/import`) | ADOPTED |
| 67 | QR | `/store/marketing/qr` | `/store-owner/qr` (+sources·analytics·export) | ADOPTED |
| 68 | 사이니지 플레이리스트 | `/store/marketing/signage/playlist` | `/store-owner/signage` | ADOPTED |
| 69 | 사이니지 미디어(동영상) 관리 | `/store/marketing/signage/videos` | 없음 | MISSING_ADOPTION (P2) |
| 70 | 사이니지 편성(스케줄) | `/store/marketing/signage/schedules` | 없음 | MISSING_ADOPTION (P2) |
| 71 | 사이니지 플레이어 | `/store/marketing/signage/player` | 없음 | MISSING_ADOPTION (P2) |
| 72 | 태블릿 등록·관리 | `/store/commerce/tablet-displays` | `/store-owner/tablets` | ADOPTED (`createStoreTabletRoutes` 공통) |
| 73 | 태블릿 화면 세트 제작·적용 | 있음 | `screen-sets` 전 계열 | ADOPTED |
| 74 | 태블릿 허브 템플릿 가져오기 | 있음 | `screen-set-hub/templates(/import)` | ADOPTED |
| 75 | 태블릿 관심·상담 알림 | 있음 | `interest/*` | ADOPTED |
| 76 | 다국어 상품 콘텐츠 | `/store/products/multilingual/*` | 없음 | MISSING_ADOPTION (P2) |
| 77 | 매장 마케팅 분석 | `/store/analytics/marketing` | 없음 | MISSING_ADOPTION (P2) |
| 78 | 온라인 판매(설정·상품·주문) | `/store/online-sales/*` | 없음 | MISSING_ADOPTION (P2) |
| 79 | 외국인 여행객 판매 채널 | `/store/sales-channels/foreign-visitor/*` | 없음 | MISSING_ADOPTION (P2) |
| 80 | 판매자 모집·신청 | `/store/commerce/seller-recruitments` 등 | 없음 | MISSING_ADOPTION (P2) |
| 81 | 매장 정보 | `/store/info` | `/store-owner/info` | ADOPTED |
| 82 | 내 계정 | 있음 | `/store-owner/account` | ADOPTED |

> 내 매장은 PH 채택률이 가장 높다(22/30). 백엔드도 `/api/v1/pharmacy-hub/store-owner/*` 전 계열 + 공통 태블릿 라우터가 마운트되어 있고, 전용 테이블 신설 없이 공통 원장을 재사용한다.

---

## 10. 매장허브 — 의도된 차이 (§6, 축 J)

| # | Capability | KPA | PH | 판정 |
|---|---|---|---|---|
| 83 | 매장허브 진열 열람 | `/store-hub` + 11개 진열 페이지 | `/store-hub` 단일 안내 화면 | ADOPTED (형태 차이, §9) |
| 84 | 허브 자료 가져오기 | 진열 페이지에서 가져가기 | 각 매장 화면 안의 "운영자 자료 가져오기"(POP/사이니지/QR/태블릿 sources·import) | ADOPTED |
| 85 | 운영자 HUB 게시·큐레이션 | 운영자 콘솔 다수 | 없음 | **INTENTIONAL_DIFFERENCE** |
| 86 | 운영자 매장 승인·지원·검수 | 운영자 콘솔 다수 | 없음 | **INTENTIONAL_DIFFERENCE** |

이 2건이 이번 감사에서 `INTENTIONAL_DIFFERENCE` 로 인정한 전부다. 매장 사용자가 직접 쓰는 "가져오기" 자체는 PH 에도 살아 있으므로 정상 차이로 처리하지 않았다.

---

## 11. PharmacyHub 운영자 커뮤니티 기능 (§13, 축 K)

| # | Capability | KPA 운영자 | PH 운영자 | 판정 |
|---|---|---|---|---|
| 87 | 포럼 운영(글·신고) | 있음 | `/operator/forum` | ADOPTED |
| 88 | 포럼 개설 요청 심사 | 있음 | `/operator/forum-requests` | ADOPTED (단, 회원 신청 입구 부재 → #14 P0) |
| 89 | 포럼 삭제 요청 심사 | 있음 | `/operator/forum-delete-requests` | ADOPTED (입력 경로 부재 → #18) |
| 90 | 포럼 카테고리·통계 | 있음 | `/operator/forum-categories`, `/forum-analytics` | ADOPTED |
| 91 | 회원·멤버십 콘솔 | 있음 | `/operator/members`, `/memberships` | ADOPTED |
| 92 | 역할 관리 | 있음 | `/operator/roles` | ADOPTED |
| 93 | 커뮤니티 콘텐츠 관리 | 있음 | 없음 | MISSING_ADOPTION (P1) |
| 94 | 자료실 관리 | `/operator/resources` | 없음 | MISSING_ADOPTION (P1) |
| 95 | LMS 운영 관리 | 있음 | 없음 | MISSING_ADOPTION (P2) |
| 96 | Guide 콘텐츠 관리 | 있음 | 없음 | MISSING_ADOPTION (P2) |
| 97 | 설문 관리 | 있음 | 없음 | MISSING_ADOPTION (P2) |

**매장 관리 지원 운영자 기능이 없는 것은 정상 차이지만, 커뮤니티 운영 기능은 KPA 와 동일 capability 원칙**을 적용해 93~97 을 `MISSING_ADOPTION` 으로 판정했다.

---

## 12. 공통 모듈 채택 현황 (§10)

| 공통 View | KPA | GP | KCos | Neture | **PH** |
|---|:--:|:--:|:--:|:--:|:--:|
| StandardHomeTemplate | 1 | 1 | 1 | 1 | 2 |
| ForumHubTemplate | 1 | 1 | 1 | 1 | 2 |
| LmsHubTemplate | 1 | 1 | 1 | 0 | 2 |
| MyForumPostsTemplate | 1 | 1 | 1 | 1 | 1 |
| **ResourcesHubTemplate** | 1 | 1 | 1 | 1 | **0** |
| **CommunityContentDetailView** | 1 | 1 | 1 | 0 | **0** |
| **CommunityContentWriteShell** | 1 | 1 | 1 | 0 | **0** |
| MyStoreShell | 1 | 1 | 1 | 0 | 1 |
| StoreDashboardLayout | 2 | 1 | 0 | 0 | 5 |
| StoreLocalProductsManager | 1 | 1 | 1 | 0 | 2 |
| StoreProductionMaterialsView | 0 | 1 | 1 | 0 | 1 |

→ **PH 만 미채택**인 공통 View 는 자료실·커뮤니티 콘텐츠 3종이다. 신규 설계 없이 기존 View 를 래핑하면 되는 gap 이다.

---

## 13. Navigation parity (§11)

- PH 헤더: 홈 · 커뮤니티(홈/포럼/검색/내 글) · 교육 · 이용 안내 · 매장 허브 · 내 약국 — 콘텐츠·자료실 진입점 없음(기능 자체가 없음 → PARTIAL 이 아니라 MISSING 축에 귀속).
- PH 매장 사이드바: 6그룹 17항목. **`/store-owner/library/resources` 만 화면·route 는 있는데 사이드바 항목이 없어 in-page 링크로만 도달**했다 → §11 `PARTIAL_ADOPTION`.
  - **이번 WO 에서 해소**: `PHARMACY_HUB_STORE_CONFIG` 에 `library-resources`("자료") 항목 추가. route 가 이미 있어 데드링크 0 원칙에 저촉되지 않는다.
- 그 외 PH 메뉴 항목은 전부 실 route 를 가리키며 데드링크 0.

---

## 14. 권한 parity (§12)

| 축 | KPA | PH | 판정 |
|---|---|---|---|
| 일반 회원 커뮤니티 읽기 | optionalAuth | optionalAuth | 동일 |
| 커뮤니티 쓰기 | 인증 | 인증 + `requireActiveServiceMembership('pharmacy-hub')` | PH 가 승인 멤버십을 추가 요구하나, **승인 회원 기준 capability 는 동일**하며 PH 의 가입·승인 모델과 정합. 기능 은폐 아님 |
| 매장 화면 | 매장 소유자 가드 | `StoreOwnerGuard` + `MembershipGate` | 동일 축 |
| 운영자 | service scope guard | `pharmacy-hub:operator/admin` | 동일 축 |

불필요한 권한 게이팅으로 PH 기능이 숨겨진 사례는 발견되지 않았다.

---

## 15. 검증 결과 (§21)

| 항목 | 결과 |
|---|---|
| `@o4o/store-ui-core` typecheck | **PASS** (변경 파일 포함, 에러 0) |
| PharmacyHub frontend `tsc -b` | **FAIL 2건 — 이번 변경과 무관**. `src/App.tsx(110,178) TS6133 RoleEntryPage / ROLES 미사용` 은 **다른 세션의 미커밋 supplier 모듈 제거 WIP** 때문이다 (HEAD 버전에서는 사용 중임을 `git show HEAD:.../App.tsx` 로 확인). 이번 WO 는 PH 소스를 수정하지 않았다 |
| KPA frontend typecheck | 별도 `type-check` 스크립트 없음. clean worktree 에서 `tsc -b` 시도했으나 **워크스페이스 패키지 d.ts 미빌드**(`@o4o/content-editor`, `@o4o/ui`, `@o4o/block-renderer` 모듈 미해결)로 유효 판정 불가 — 이번 변경과 무관한 환경 사유 |
| api-server typecheck | 백엔드 무변경으로 미실행 (다른 세션이 `apps/api-server` 를 광범위 수정 중이라 실행해도 이번 변경 판정에 쓸 수 없음) |
| Forum/LMS/My Store 회귀 테스트 | 백엔드·프론트 로직 무변경(메뉴 config 데이터 1항목 추가)이라 미실행 |
| route 정적 정합성 | 신규 메뉴 항목의 대상 route `/store-owner/library/resources` 가 `App.tsx` 에 실재함을 확인 (데드링크 0) |

---

## 16. 프로덕션 smoke (§14)

- 대상: `kpa-society.co.kr` ↔ `pharmacyhub.co.kr`, 매장 경영자 계정, desktop(1440×900) + mobile(390×844)
- 커뮤니티(홈·포럼·글 목록·내 글·신청·콘텐츠·자료실·LMS·마이페이지) + 내 매장(홈·제품·콘텐츠·자료함·POP·태블릿·사이니지·QR·주문) 총 **82 체크**
- 운영 데이터 write **0건** (조회 전용 내비게이션만 수행)

```text
PASS 80 / 82
FAIL  2 / 82  — 동일 원인 (desktop·mobile 각 1)
```

- FAIL 상세: PH `/store-owner/tablets` 에서 `GET /store-owner/screen-sets`·`/tablets` 가 **409 `STORE_NOT_CONNECTED`**.
  화면은 "연결된 매장이 없습니다 / 약국 가입·승인이 완료되면 등록·관리할 수 있습니다" 안내를 정상 렌더한다.
  → **코드 결함이 아니라 해당 검증 계정에 PH 매장 연결이 없는 데이터 조건**이며, 브라우저 콘솔에 4xx 응답이 기록되어 자동 판정만 FAIL 로 잡힌 것이다.
- 백지 화면 0 / 미처리 JS 예외 0 / 예기치 않은 404·500 0.

---

## 17. 이번 WO 에서 수행한 수정 (§17 소규모 허용 범위)

| 파일 | 변경 | 근거 |
|---|---|---|
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | `PHARMACY_HUB_STORE_CONFIG` 의 '콘텐츠·자료함' 그룹에 `library-resources`("자료", `/library/resources`) 항목 추가 | §11 navigation gap — 화면·route 가 이미 있는데 사이드바 진입점만 없었다. §17 의 "메뉴 entry 누락" 에 해당 |

그 외 대규모 UI/API 구현은 하지 않았다.

---

## 18. 후속 큰 WO 제안 (§18)

| 묶음 | 범위 | 포함 gap |
|---|---|---|
| **A. PH Community Capability Full Adoption** | 포럼 개설·운영 동선 + 커뮤니티 콘텐츠 + 자료실 + 운영자 커뮤니티 콘솔 | #14(P0), #15~#19, #20~#28, #93~#97, #2·#3 |
| **B. PH LMS Learner Full Adoption** | 수강 신청 → 진도 → 수료 → 수료증 → 퀴즈/과제 + 마이페이지 학습 축 | #33~#43, #47·#51 |
| **C. PH My Store Residual Adoption** | 사이니지 3축(미디어·편성·플레이어), 다국어 상품 콘텐츠, 매장 분석, 온라인 판매·판매 채널·모집 | #69~#71, #76~#80, #52 |

권장 순서: **A(P0 포함) → B → C**.

---

## 19. 문서 정합 (CLAUDE.md §16)

- 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — **해당 없음**
