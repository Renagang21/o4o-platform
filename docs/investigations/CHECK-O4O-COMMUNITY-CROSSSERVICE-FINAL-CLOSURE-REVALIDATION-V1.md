# CHECK-O4O-COMMUNITY-CROSSSERVICE-FINAL-CLOSURE-REVALIDATION-V1

- **WO**: WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-CLOSURE-REVALIDATION-V1
- **작성일**: 2026-08-20
- **성격**: 재검증 전용 (신규 기능 구현 없음 · 코드 변경 0)
- **시작 commit**: `8318a5cfb` → **최종 확인 commit**: `3526c5e6b` (origin/main 동기)
- **직전 census**: [CHECK-O4O-COMMUNITY-CROSSSERVICE-FINAL-CENSUS-AND-COMMONIZATION-CLOSURE-AUDIT-V1](CHECK-O4O-COMMUNITY-CROSSSERVICE-FINAL-CENSUS-AND-COMMONIZATION-CLOSURE-AUDIT-V1.md) (census commit `7d6ee08e2`)
- **선행 CHECK**: [CHECK-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1](CHECK-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1.md) · [CHECK-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1](CHECK-O4O-COMMUNITY-FORUM-WRITE-SHELL-TEMPLATE-V1.md)

---

## 1. 전체 집계 (현재 main 기준 재분류)

```
전체 모집단: 330
FULLY_COMMON: 171
CORE_ONLY: 26
VIEW_DUPLICATED: 0
SERVICE_SPECIFIC: 4
NOT_IMPLEMENTED: 114
OUT_OF_SCOPE: 15
미조사: 0
```

검산: 171 + 26 + 0 + 4 + 114 + 15 = 330 ✅

### 1-1. 모집단 유지 근거 (330 불변)

`git diff --name-status 7d6ee08e2..HEAD -- services packages apps` 결과, census 이후 커뮤니티 영역
변경은 **아래 3개 공통화 family 뿐**이며 커뮤니티 route·backend 파일의 **추가·삭제가 0건**이다.

- 신규: `packages/operator-core-ui/src/modules/community-home/**` · `.../operator-content-hub/**` · `packages/shared-space-ui/src/ForumWritePageShell.tsx` (+ 각 테스트/vitest.config)
- 수정: 커뮤니티 wrapper 7개 (GP·KCos ForumWritePage / KPA·GP·Neture CommunityManagementPage / KPA·GP OperatorContentHubPage)
- 그 밖의 diff(account-ui 알림 · GlobalHeader · MobileBottomNav · notificationRouting · contact-inquiry 등)는 **OUTSIDE_COMMUNITY**

따라서 모집단 정의를 바꾸지 않았고, 330 cell 을 그대로 유지한 채 **판정만 재확정**했다.

---

## 2. 서비스별 집계

| 서비스 | FC | CO | VD | SS | NI | OOS | 합 |
|---|---:|---:|---:|---:|---:|---:|---:|
| KPA-Society | 41 | 13 | 0 | 0 | 9 | 3 | 66 |
| K-Cosmetics | 42 | 2 | 0 | 0 | 19 | 3 | 66 |
| GlycoPharm | 43 | 4 | 0 | 2 | 14 | 3 | 66 |
| PharmacyHub | 19 | 2 | 0 | 0 | 42 | 3 | 66 |
| Neture | 26 | 5 | 0 | 2 | 30 | 3 | 66 |
| **합계** | **171** | **26** | **0** | **4** | **114** | **15** | **330** |

(직전 census 대비 변화: KPA FC +2 / CO −1 / VD −1 · KCos FC +1 / VD −1 · GP FC +3 / VD −3 · Neture FC +1 / VD −1)

---

## 3. 기능축별 집계

| 축 | 영역 | FC | CO | VD | SS | NI | OOS | 합 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| A | 커뮤니티 홈/피드 | 14 | 1 | 0 | 0 | 5 | 0 | 20 |
| B | 포럼 | 81 | 8 | 0 | 2 | 29 | 5 | 125 |
| C | 콘텐츠 | 22 | 5 | 0 | 0 | 18 | 0 | 45 |
| D | 자료실 | 9 | 0 | 0 | 0 | 6 | 5 | 20 |
| E | LMS/교육 | 30 | 7 | 0 | 0 | 28 | 0 | 65 |
| F | 멤버십/폐쇄형 | 14 | 5 | 0 | 0 | 1 | 0 | 20 |
| G | 검색/활동/신청 | 1 | 0 | 0 | 0 | 19 | 0 | 20 |
| H | 서비스 고유 확장 | 0 | 0 | 0 | 2 | 8 | 5 | 15 |
| | **합계** | **171** | **26** | **0** | **4** | **114** | **15** | **330** |

---

## 4. 직전 blocker 해소 재검증 (§5)

### 4-1. B21 · 운영자 커뮤니티 관리 콘솔

공통 자산: `packages/operator-core-ui/src/modules/community-home/CommunityHomeConsole.tsx` (629L)

| 서비스 | wrapper | 라인 | wrapper 성격 | 이전 → 현재 |
|---|---|---:|---|---|
| KPA | `services/web-kpa-society/src/pages/operator/CommunityManagementPage.tsx` | 67 | client 주입 + `renderImageField`(KpaMediaImageField) | CORE_ONLY → **FULLY_COMMON** |
| GlycoPharm | `services/web-glycopharm/src/pages/operator/CommunityManagementPage.tsx` | 47 | client 주입 + config | VIEW_DUPLICATED → **FULLY_COMMON** |
| Neture | `services/web-neture/src/pages/admin/CommunityManagementPage.tsx` | 28 | client 주입만 | VIEW_DUPLICATED → **FULLY_COMMON** |

- wrapper 는 모두 adapter/config 수준이며 자체 목록·폼·탭 UI 를 보유하지 않는다.
- duplicate shell 잔존 **0건** (유사도 재스캔에서 세 파일 간 임계 이상 pair 없음).
- 프로덕션 확인: KPA `/operator/community`, GP `/operator/community`, Neture `/admin/community-admin` 모두 공통 콘솔 렌더 (§12).

### 4-2. C7 · 운영자 콘텐츠 허브 콘솔

공통 자산: `packages/operator-core-ui/src/modules/operator-content-hub/OperatorContentHubConsole.tsx` (663L)

| 서비스 | wrapper | 라인 | 이전 → 현재 |
|---|---|---:|---|
| KPA | `services/web-kpa-society/src/pages/operator/OperatorContentHubPage.tsx` | 147 | VIEW_DUPLICATED → **FULLY_COMMON** |
| GlycoPharm | `services/web-glycopharm/src/pages/operator/OperatorContentHubPage.tsx` | 92 | VIEW_DUPLICATED → **FULLY_COMMON** |

프로덕션 route 는 두 서비스 모두 `/operator/docs` 이며(`/operator/content-hub` 아님), 공통 콘솔이 렌더된다.

### 4-3. B8 · 포럼 글쓰기/수정 셸

공통 자산: `packages/shared-space-ui/src/ForumWritePageShell.tsx` (233L)

| 서비스 | 파일 | 라인 | create | edit | 이전 → 현재 |
|---|---|---:|:--:|:--:|---|
| K-Cosmetics | `services/web-k-cosmetics/src/pages/forum/ForumWritePage.tsx` | 170 | ✅ | ✅ | VIEW_DUPLICATED → **FULLY_COMMON** |
| GlycoPharm | `services/web-glycopharm/src/pages/forum/ForumWritePage.tsx` | 166 | ✅ | ✅ | VIEW_DUPLICATED → **FULLY_COMMON** |
| KPA | `services/web-kpa-society/src/pages/forum/ForumWritePage.tsx` | 291 | — | — | CORE_ONLY 유지 → **ACCEPTED_CORE_ONLY** |
| Neture | `services/web-neture/src/pages/forum/ForumWritePage.tsx` | 569 | — | — | CORE_ONLY 유지 → **ACCEPTED_CORE_ONLY** |

KCos·GP wrapper 는 `POST_TYPES` · `SHELL_LABELS` · fetch/submit 핸들러만 보유하고 셸/폼은 공통 컴포넌트
(`ForumWritePageShell` + `ForumWriteForm`)에 위임한다. edit 모드 경로도 동일 셸을 사용한다.

---

## 5. VIEW_DUPLICATED 전수 확인 (§6)

- 재실행한 라인단위 유사도 스캔(`difflib.SequenceMatcher`, ≥60L · 길이비 ≥0.5 · 임계 0.80) 결과
  **커뮤니티 축에서 임계 이상 pair 0건**.
- 직전 census 의 VD 6 cell(B8×2 · B21×2 · C7×2)이 모두 공통 자산 소비로 전환되어 해소되었다.
- **VIEW_DUPLICATED = 0** → §6 종료 조건 충족.

---

## 6. CORE_ONLY 26건 재확인 (§7)

전 건 **ACCEPTED_CORE_ONLY**, `MUST_FIX_BEFORE_CLOSE = 0`.

| 축 | 건수 | 대표 사례 | 수용 근거 |
|---|---:|---|---|
| A 커뮤니티 홈 | 1 | 서비스별 홈 조합 | config/slot 통합 시 오히려 복잡 · View 복제 없음 |
| B 포럼 | 8 | KPA `ForumWritePage`(291L, slug-scoped `/forum/:slug/write`) · Neture `ForumWritePage`(569L, 공급자/서비스 업데이트 표면) | 업무 자체가 다름 (KPA=포럼 slug 진입 · Neture=공급자 전용 게시 유형) · 양쪽 모두 공통 `ForumWriteForm` 이미 소비 · 실제 View 복제 없음 |
| C 콘텐츠 | 5 | 서비스별 콘텐츠 목록 필터 | 권한/정책 차이 (KPA 회원 전용 vs Neture 공개) |
| E LMS | 7 | `lmsViewAdapter.ts` 계열 | 공통 `@o4o/lms-ui` 의 **adapter 계층** — 어휘·accent·수료증 제공 여부 등 정책 차이 흡수 |
| F 멤버십 | 5 | 서비스별 가입/승인 정책 | 권한/정책 차이 · 문서화된 architecture exception (서비스별 membership 규칙) |

공통 판단 기준: **복제된 View 가 존재하지 않고, 남은 차이가 업무·권한·정책 차이에서 비롯된 경우 CORE_ONLY 를 수용**한다.

---

## 7. NOT_IMPLEMENTED 114건 분류 (§8)

| 분류 | 건수 | 설명 |
|---|---:|---|
| A · 향후 공통 채택 가능 | 38 | PharmacyHub 의 자료실·검색/활동 축, KCos 의 LMS 심화(퀴즈/과제/수료증) 등. 공통 자산은 이미 존재하며 서비스가 아직 route 를 열지 않았다. |
| B · 서비스 성격상 선택적 미채택 | 76 | Neture LMS 전 축(E1~E13, 공급자·파트너 협업 플랫폼에 교육 과정 없음) · KCos/GP 의 폐쇄형 커뮤니티 축 · G축 활동/신청 대다수. |
| C · 실제 누락·결함 의심 | **0** | 없음. |

§8 원칙대로 **없는 기능을 이번 WO 에서 신규 구현하지 않았다.**

---

## 8. PharmacyHub 최종 확인 (§9)

PharmacyHub 를 모집단에서 제외하지 않고 66 cell 전수 재분류했다. 코드 확인 결과 **PH 는 LMS 를 보유**한다
(WO §9 의 "LMS 부재" 전제는 현재 코드 기준으로 정정).

- 커뮤니티 표면: `pages/community/{CommunityHomePage,CommunitySearchPage}` · `pages/forum/{ForumHubPage,ForumListPage,ForumDetailPage,ForumWritePage,MyPostsPage}` · `pages/education/{EducationPage,LmsCourseDetailPage,LmsLessonPage,lmsViewAdapter}` · `pages/operator/{MembershipsPage,MembershipDetailPage}` · `pages/store-owner/{ContentPage,LibraryPage,LibraryResourcesPage}`
- route: `/community` · `/community/search` · `/forum` · `/forum/posts(/:postId)` · `/forum/write` · `/forum/edit/:postId` · `/forum/my-posts` · `/education` · `/education/course/:id` · `/education/course/:courseId/lesson/:lessonId`
- E1~E5 FULLY_COMMON (`@o4o/lms-ui` + adapter), E6~E13 NOT_IMPLEMENTED(B).
- PH 는 폐쇄형 커뮤니티라 미로그인 시 게이트 화면이 정상 동작한다 (§12 브라우저 확인).

---

## 9. Security / service-boundary 최종 감사 (§10)

| 영역 | 가드 | 위치 | 결과 |
|---|---|---|---|
| Forum | `resolveForumPostInServiceScope` · `resolveForumCommentInServiceScope` · `assertForumWriteAccess` | `apps/api-server/src/controllers/forum/{ForumPostController,ForumCommentController,ForumControllerBase}.ts` | PASS |
| Forum(generic write) | `requireGenericForumWriteAdmin` | `apps/api-server/src/routes/forum/forum.routes.ts:32` | PASS |
| LMS | `resolveLmsServiceScope` · `isCourseInServiceScope` · `guardLoadedCourseScope` | `apps/api-server/src/modules/lms/utils/{lms-service-scope.ts,lms-scope-guard.ts}` | PASS |
| Content/Resources | serviceKey 경계 (CLAUDE.md §7 Boundary Policy Broadcast 축) | 컨트롤러 전수 | PASS |
| Membership | 서비스별 membership guard | 서비스별 라우터 | PASS |
| Generic API | `/api/v1/appreciation/*` | `apps/api-server/src/modules/appreciation/routes/appreciation.routes.ts` | ACCEPTED_RESIDUAL (§9-1) |

- 회귀 테스트로 실증: `glycopharm-forum-service-boundary.spec.ts` · `lms-crossservice-read-write-boundary.spec.ts` · `community-forum-orphan-write-guard.spec.ts` · `community-crossservice-my-posts-contract.spec.ts` 전부 PASS.
- 프로덕션 교차 확인: KPA `/operator/docs` = 6건 vs GP `/operator/docs` = 0건, KPA `/lms` = 5건 vs GP·KCos `/lms` = 0건 → **cross-service mixing 0**.
- **중대한 service-boundary/security 결함 = 0**.

### 9-1. Appreciation 잔여 (§12)

`POST /send`(requireAuth) · `GET /my-sent`(requireAuth) · `GET /my-received`(requireAuth) ·
`GET /:targetType/:targetId/summary`(optionalAuth) · `GET /:targetType/:targetId/recent`(optionalAuth).

targetType/targetId 기반 **service-neutral 계약**이며, 응답에 private/service-owned 본문이 포함되지 않는다
(카운트·발신자 요약만). 실제 데이터 누출 없음 → **ACCEPTED_RESIDUAL**.

---

## 10. Dead / stale residue (§11)

| 대상 | 분류 | 판정 |
|---|---|---|
| `packages/forum-core/src/admin-ui/**` (5서비스 소비 0, `packages/forum-cosmetics/src/index.ts` 만 re-export) | DEAD_FRONTEND | ACCEPTED_RESIDUAL |
| `forum-core` `ForumPostDetail.tsx:107,118` 의 `toggle-pin` / `toggle-lock` POST (다른 참조 0) | STALE_CONTRACT | ACCEPTED_RESIDUAL |
| `packages/shared-space-ui/src/ForumDetailStates.tsx` (export 되지만 소비 0) | DEAD_FRONTEND | ACCEPTED_RESIDUAL |
| `/api/v1/forum/notifications/*` (SSE 포함) · `/api/v1/forum/recommendations/*` · `/api/v1/forum/ai/*` | INTENTIONAL_LEGACY | ACCEPTED_RESIDUAL — 5서비스 소비 0 이나 `apps/main-site` 가 실소비 (`hooks/useRealtimeNotifications.ts` · `useNotifications.ts` · `useForumRecommendations.ts` · `useForumAI.ts`) → **OUTSIDE_COMMUNITY 소비처 존재**, dead 아님 |

§11 원칙대로 **대규모 dead-code cleanup 은 수행하지 않았다.** 전부 non-blocking.

---

## 11. 검증 (§15) — 코드 변경 0이지만 전수 수행

| 항목 | 결과 |
|---|---|
| 공통 패키지 typecheck (`@o4o/shared-space-ui` · `@o4o/operator-core-ui` · `@o4o/account-ui` · `@o4o/lms-ui` · `@o4o/forum-core` · `@o4o/auth-utils`) | ✅ error 0 |
| 5서비스 frontend typecheck (`@o4o/web-kpa-society` · `@o4o/web-k-cosmetics` · `glycopharm-web` · `pharmacy-hub-web` · `@o4o/web-neture`) | ✅ error 0 |
| `apps/api-server` typecheck | ✅ error 0 |
| jest (Forum/LMS/Content 회귀) | ✅ **25 suites / 547 tests PASS** |
| vitest `packages/shared-space-ui` | ✅ **3 files / 27 tests PASS** |
| vitest `packages/operator-core-ui` | ✅ **3 files / 33 tests PASS** |

주의: 패키지 `vitest.config.mjs` 의 `include` 는 repo-root 상대 경로라 **반드시 repo 루트에서**
`npx vitest run --config packages/<pkg>/vitest.config.mjs` 로 실행해야 한다.

---

## 12. Browser final smoke (§16) — 프로덕션

기준: HTTP 정상 · white screen 0 · JS exception 0 · pageerror 0 · 치명적 신규 404/500 0 · cross-service mixing 0 · mobile overflow 0

### 12-1. Desktop (1440)

| 서비스 | route | 결과 |
|---|---|---|
| KPA | `/forum` · `/forum/write` · `/community`(→ `/`) · `/lms` · `/content` · `/resources` | ✅ |
| KPA | `/operator/community`(로그인) · `/operator/docs`(로그인) | ✅ 공통 콘솔 렌더 (Hero/광고/페이지 광고/스폰서/하단 링크 · 전체 콘텐츠 6건) |
| GlycoPharm | `/forum` · `/forum/write`(공통 셸 로그인 게이트) · `/lms` | ✅ |
| GlycoPharm | `/operator/community`(로그인) · `/operator/docs`(로그인, 0건) | ✅ 공통 콘솔 렌더 |
| K-Cosmetics | `/forum` · `/forum/write`(로그인 후 공통 셸 "Write a Post" 렌더) · `/lms` | ✅ |
| PharmacyHub | `/forum`(미로그인 폐쇄 게이트 → 로그인 후 정상) · `/community` · `/education` | ✅ |
| Neture | `/forum` · `/content`(3건, Neture 전용) · `/admin/community-admin`(로그인) | ✅ 공통 콘솔 렌더 |

- GP `/education` 404 는 **정상** (GP LMS route 는 `/lms`).
- KCos `/forum/write` 미로그인 → `/login` redirect 는 기존 route guard 동작.
- 콘솔 error 는 미로그인 상태의 `401 /auth/me` · `/auth/refresh` 뿐이며 pageerror(JS exception) 0.

### 12-2. Mobile (390×844)

| route | overflow | 결과 |
|---|---:|---|
| `kpa-society.co.kr/forum` | 0 | ✅ |
| `kpa-society.co.kr/lms` | 0 | ✅ |
| `www.glycopharm.co.kr/forum` | 0 | ✅ |
| `k-cosmetics.site/forum` | 0 | ✅ |
| `pharmacyhub.co.kr/community` | 0 | ✅ |
| `neture.co.kr/forum` | 0 | ✅ |
| `neture.co.kr/admin/community-admin` | 0 | ✅ |

콘솔 error 0 · pageerror 0.

---

## 13. 최종 residual matrix (§13)

```
MUST_FIX_BEFORE_CLOSE: 0
ACCEPTED_RESIDUAL: 4
OUTSIDE_COMMUNITY: 1
```

- ACCEPTED_RESIDUAL 4: `forum-core/admin-ui` dead · `toggle-pin`/`toggle-lock` stale contract · `ForumDetailStates` dead · appreciation generic 계약
- OUTSIDE_COMMUNITY 1: forum notifications/recommendations/ai 백엔드 (`apps/main-site` 소비)

---

## 14. Transition 확인 (§14)

| 항목 | 직전 census | 현재 | 변화 |
|---|---:|---:|---|
| 전체 모집단 | 330 | 330 | 유지 (§1-1 근거) |
| FULLY_COMMON | 164 | 171 | +7 |
| CORE_ONLY | 27 | 26 | −1 (B21 KPA) |
| VIEW_DUPLICATED | 6 | **0** | −6 (B8×2 · B21×2 · C7×2) |
| SERVICE_SPECIFIC | 4 | 4 | 유지 |
| NOT_IMPLEMENTED | 114 | 114 | 유지 |
| OUT_OF_SCOPE | 15 | 15 | 유지 |
| 미조사 | 0 | 0 | 유지 |

- B21: KPA `CORE_ONLY → FULLY_COMMON`, GP·Neture `VIEW_DUPLICATED → FULLY_COMMON`
- C7: KPA·GP `VIEW_DUPLICATED → FULLY_COMMON`
- B8: KCos·GP `VIEW_DUPLICATED → FULLY_COMMON`

---

## 15. 최종 판정 (§17)

```
미조사: 0
VIEW_DUPLICATED: 0
MUST_FIX_BEFORE_CLOSE: 0
중대한 service-boundary/security 결함: 0
5서비스 핵심 route: 정상
주요 shared adoption: 코드 + 프로덕션에서 실제 확인

최종 판정: COMMUNITY_COMMONIZATION = COMPLETE
```

**현재 main 기준 커뮤니티 전체 기능 모집단을 코드에서 재확인하고 5서비스 전 cell 을 재분류했으며,
미조사 0, VIEW_DUPLICATED 0, MUST_FIX_BEFORE_CLOSE 0, 중대한 service-boundary/security 결함 0 을 확인했다.
따라서 커뮤니티 공통화 트랙을 COMPLETE 로 판정한다.**

`CORE_ONLY > 0` 및 `NOT_IMPLEMENTED > 0` 자체는 §17 에 따라 blocker 가 아니다.

---

## 16. Closure 이후 backlog (§19) — 커뮤니티 공통화 트랙 밖으로 분리

| 항목 | 건수 | 성격 |
|---|---:|---|
| ACCEPTED_CORE_ONLY | 26 | 업무·권한·정책 차이. 필요 시 개별 축 단위 후속 검토 |
| NOT_IMPLEMENTED (A · 향후 공통 채택 가능) | 38 | 서비스 로드맵 결정 사항 |
| NOT_IMPLEMENTED (B · 선택적 미채택) | 76 | 채택 계획 없음 |
| SERVICE_SPECIFIC | 4 | 서비스 고유 확장 (GP 2 · Neture 2) |
| OUT_OF_SCOPE | 15 | 커뮤니티 축 밖 |
| dead/stale non-blocking residue | 4 (+1 외부) | 별도 cleanup WO 로 분리 (closure blocker 와 혼합 금지) |

---

## 17. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
