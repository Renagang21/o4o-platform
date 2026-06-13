# IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1

> **유형:** Read-only 조사 (코드/DB/route/UI/API 변경 없음, 문서 1개만 생성)
> **목적:** KPA-Society 에서 정비된 강의/LMS 기준선을 바탕으로 GlycoPharm / K-Cosmetics 공통화 가능 영역과 보류 영역을 분리한다. 리워드 지갑/충전/배정/예산 흐름은 본 범위에서 **제외**(별도 작업선).
> **작성일:** 2026-06-13 · 기준 HEAD `49625b5a0`
> **선행:** `IR-O4O-KPA-LMS-COURSE-CURRENT-STATE-AUDIT-V1` · `WO-O4O-KPA-LMS-COURSE-BASELINE-CLEANUP-V1` · `WO-O4O-LMS-COMPLETION-REWARD-POLICY-SEPARATION-V1` · `WO-O4O-LMS-REWARD-POLICY-CONTRACT-STABILIZE-V1`

---

## 1. 목적

KPA-Society LMS 기준선(공개/회원제 구분, 결제 없음, LIVE/YouTube 제거, canonical progress, rewardPolicy 게이팅·계약 안정화, reward 실패 non-rollback, Neture 제외)을 기준으로, GlycoPharm/K-Cosmetics 에 공통화할 수 있는 영역과 보류 영역을 분리한다. 본 IR 은 조사 문서이며 코드/DB/UI/route/API 동작을 변경하지 않는다.

## 2. 결론 요약 (Executive Summary)

| 질문 | 답 |
|------|-----|
| GP/KCos 에 강의 기능이 있는가? | **둘 다 이미 풀 LMS 구현 보유** (목록·상세·수강·레슨플레이어·퀴즈·과제·수료·인증서·강사/운영자 화면). "빈 서비스에 KPA 를 이식"이 아니라 **3개 병렬 구현을 공통 UI 로 수렴**하는 작업이다 |
| backend 는 공통인가? | **YES — 이미 service-neutral / serviceKey 기반.** 3서비스 모두 동일 `/api/v1/lms/*` 호출, `@o4o/lms-client` 팩토리 공유. serviceKey 는 강사의 service membership 에서 파생 |
| GP/KCos 공통화에 backend 변경이 필요한가? | **기본 적용은 frontend-only.** 단 ① 운영자 라우트 role 목록(`requireLmsOperator`) canonical 매핑 검증, ② GP/KCos 의 reward·YouTube **drift** 정합이 선행 권장 |
| 공통 UI 패키지가 있는가? | **없음** (`lms-ui`/`education-ui` 부재). `lms-core`(타입)·`lms-client`(클라이언트)만 존재. 신규 `@o4o/lms-ui`(presentational) 후보 |
| Neture 는? | **LMS 전무 — route/menu/package 소비처 0.** backend 에는 Neture 차단 가드가 **없음**(LMS 는 모든 serviceKey 개방). 차단은 **frontend 비소비 + 문서 가드**로, 하드코딩 block 은 비권장 |
| reward budget/wallet 은? | service-level `ServicePointBudget`(Phase1)만 존재, **강사-level 지갑/ledger·grant 시 차감 미구현**. → 본 공통화에서 **D 등급 보류**, 별도 작업선 |
| 가장 중요한 발견 | **GP/KCos 가 정책 drift 상태**: ① 둘 다 `MyCreditsPage` 에 **고정 리워드 스케줄(+10/+20/+50)** 노출 — rewardPolicy 게이팅 정책과 상충. ② **GlycoPharm 레슨플레이어에 YouTube 임베드 잔존** — KPA 가 제거한 흔적. 공통화 전 정합 필요 |

**핵심:** 공통화의 실익은 "없는 기능을 만드는 것"이 아니라 **3개로 분기된 강의 화면을 단일 presentational 패키지로 수렴**하고, 그 과정에서 **GP/KCos 에 남은 정책 drift(고정 리워드 문구·YouTube)를 KPA 기준선으로 정렬**하는 데 있다.

## 3. 선행 KPA 기준선 요약

services/web-kpa-society 기준선 (조사 §5 상세):

- **공개/회원제:** `course.visibility = 'public' | 'members'`. 비로그인은 public 만 조회(backend `MEMBERS_ONLY` 401).
- **결제 없음:** `isPaid`/`price` 는 메타데이터 표시용. 상세에 *"O4O에서는 강의 결제를 제공하지 않습니다 · 납부·확인은 강사/운영자가 별도 안내"* 안내. checkout/payment 경로 없음.
- **LIVE/YouTube 제거:** lesson type = `video|article|quiz|assignment`. live/youtube/stream grep 0건. 동영상은 자체 `<video>` (사전녹화)만.
- **canonical progress:** lesson type 무관 `lms_progress` 기준(video/article 도 Progress 기록). `completedLessonIds` 는 backward-compat mirror.
- **reward 게이팅·계약:** rewardPolicy 미설정 시 미지급(오류 아님). `RewardPolicyService` 계약 안정화(rich entry + legacy, normalizeRewardEntry). **프론트에 reward 설정 UI 없음** — 고정 적립 문구 제거됨, 지급된 크레딧만 동적 표시(`(+N 크레딧)` 토스트는 backend 실지급액일 때만).
- **API 클라이언트:** `@o4o/lms-client` 팩토리(`createLmsLearnerClient`/`createLmsInstructorClient`) + KPA 어댑터. serviceKey 파라미터를 LMS 호출에 명시 전달하지 않음(backend 가 membership·course.serviceKey 로 처리).

## 4. reward / budget 보류 기준

본 IR 은 reward UI·budget·지갑·정산을 공통화 대상에 **포함하지 않는다.** backend rewardPolicy 계약은 정리됐으나 다음은 별도 설계 필요:

- **제외(D 등급):** rewardPolicy UI, rewardPolicyProposal UI, 강사 리워드 지갑/잔액/충전/배정, 수강자 reward 처리중·재처리, 강사 잔액부족 알림, 서비스 운영자 reward 예산, admin.neture.co.kr 예산 신청/승인, reward ledger, 오프라인 정산/입금/메모, 사용자 예상 지급 안내 고도화.
- **backend 현황(조사 §7-7):** service-level `ServicePointBudget`/`ServicePointBudgetService`(Phase1: allocate/check) 존재. 그러나 **강사-level 지갑·ledger 미구현**, reward grant 시 `deductBudget` **미연결**(예산 추적은 되나 강제는 안 됨). → reward budget 흐름은 미완 → 공통화와 분리 타당.
- **향후 방향성(문서 보존, 본 IR 미구현):** 서비스 운영자 → 강사 리워드 충전/배정 → 강사는 보유 잔액 내에서 rewardPolicy 설정 → 수강자 조건 충족 시 강사 잔액 확인 → 충분하면 즉시 지급, 부족하면 수강자 "처리중" + 강사 부족 알림 → 운영자는 강의별 정책 매건 승인 대신 강사 충전/배정만 관리. → 별도 후속 `IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`.

## 5. KPA-Society LMS 현황

| 영역 | 상태 | 위치 |
|------|:---:|------|
| 공개 강의 목록 / 회원제 | ✅ visibility badge(공개/회원제) | `pages/lms/LmsCoursesPage.tsx` |
| 강의 상세 | ✅ 사이드바·진도·감사패널·레슨목록 | `pages/lms/LmsCourseDetailPage.tsx` |
| 수강 신청 | ✅ `POST /lms/courses/:id/enroll`, archived/pending/rejected 가드 | 동 상세 페이지 |
| 레슨 플레이어 | ✅ video(self)/article/quiz/assignment | `pages/lms/LmsLessonPage.tsx` |
| 퀴즈 | ✅ single/multi/text, 합격/재시도 | 동 |
| 진도 표시 | ✅ ProgressBar + "n/m 레슨 완료" | 상세·플레이어 |
| 수료 + 인증서 | ✅ 자동 수료 모달 + `/lms/certificate` + 공개 검증 페이지 | `LmsCertificatesPage` / `CertificateVerifyPage` |
| 강사 강의 관리 | ✅ 목록/생성/편집/운영/참가자/채점 | `pages/instructor/**` |
| 운영자 강의 관리 | ✅ 승인/반려/비공개/종료/hard delete + bulk | `pages/operator/OperatorLmsCoursesPage.tsx` |
| rewardPolicy UI | ❌ 없음(의도) · 고정 적립문구 제거됨 · 동적 표시만 | `LmsLessonPage.tsx:872-874` |
| 결제 없음 안내 | ✅ "O4O에서는 강의 결제를 제공하지 않습니다" | `LmsCourseDetailPage.tsx:281-288` |
| LIVE/YouTube 흔적 | ✅ 없음(self `<video>`만) | grep 0 |
| serviceKey 전달 | LMS 호출에 미전달(backend 처리) | `api/lms.ts`, `api/lms-instructor.ts` |

라우트: `/lms`, `/lms/course/:id`, `/lms/course/:courseId/lesson/:lessonId`, `/lms/certificate`, `/certificate/verify/:id`, `/instructor/**`, `/operator/lms/courses`.

## 6. GlycoPharm LMS 현황

**EXISTS — 풀 구현.** (services/web-glycopharm)

| 영역 | 상태 | 비고 |
|------|:---:|------|
| LMS 기능 | ✅ 목록(EducationPage)·상세·레슨·강사·운영자 | `api/lms.ts`(502L) |
| 공개/회원제 | ✅ `'public'|'members'` 라디오 | `InstructorCourseEditPage.tsx:540` |
| 레슨/퀴즈/과제 | ✅ + **AI 과제 채점**(KPA 대비 추가 기능) | `LmsLessonPage.tsx` |
| backend API | ✅ **동일** `/api/v1/lms/*`, `@o4o/lms-client` 팩토리 | `api/lms.ts:1-11` |
| 공유 여부 | 팩토리 공유 + 페이지는 서비스별 자체 구현 | — |
| reward/credit UI | ⚠️ **`MyCreditsPage` 고정 스케줄 +10/+20/+50 노출** | `pages/mypage/MyCreditsPage.tsx:14-20` |
| **YouTube 흔적** | ⚠️ **레슨플레이어 YouTube iframe 임베드 잔존**(`youtube`/`youtu.be` 감지→embed 변환) | `CourseDetailPage.tsx:35-50` |
| paid/checkout | ✅ 없음(감사 패널=강사 팁, 강의료 아님) | — |
| serviceKey/config | `'glycopharm'`, primary `#16a34a`(green), `glycopharmConfig.template` | `EducationPage.tsx:29` |
| 메뉴 | 강사 "강의 대시보드", 운영자 "강의 관리"(`/operator/lms`). 공개 헤더엔 강의 메뉴 없음(모바일 bottom nav 커뮤니티 그룹) | `GlycoGlobalHeader.tsx`, `operatorMenuGroups.ts` |

**drift 2건:** ① 고정 리워드 스케줄 노출(rewardPolicy 게이팅과 상충), ② YouTube 임베드(KPA 가 제거한 흔적; 사전녹화 임베드지만 LIVE/YouTube 재도입 위험 라인).

## 7. K-Cosmetics LMS 현황

**EXISTS — 풀 구현, KPA 와 canonical 정렬.** (services/web-k-cosmetics)

| 영역 | 상태 | 비고 |
|------|:---:|------|
| LMS 기능 | ✅ 목록/상세/레슨/강사/운영자 | `api/lms.ts`(277L) |
| 공개/회원제 | ⚠️ status 기반 필터(published)만, 명시적 membersOnly 플래그 부재 — KPA 대비 visibility 노출 약함 | `EducationPage.tsx:44` |
| 레슨/퀴즈/과제 | ✅ article/video/quiz/assignment | `LmsLessonPage.tsx` |
| backend API | ✅ **동일** `/api/v1/lms/*`, `@o4o/lms-client` 팩토리, 주석 "KPA-Society lmsApi 구조 기준" | `api/lms.ts:1-19` |
| 공유 여부 | 팩토리 공유 + `normalizeEnrollment()` 로 스키마 차이 흡수 + 공통 `LmsHubTemplate` | `api/lms.ts:81-93` |
| reward/credit UI | ⚠️ **`MyCreditsPage` 고정 스케줄 +10/+20/+50 노출** | `pages/mypage/MyCreditsPage.tsx:82-91` |
| YouTube/LIVE | ✅ 없음(signage 무관 매치만) | — |
| paid/checkout | ✅ 없음(`isFree?`만, price 필드 없음) | — |
| serviceKey/config | `'k-cosmetics'`, primary `#db2777`(pink), `kcosmeticsConfig` | `EducationPage.tsx:37` |
| 메뉴 | 홈 featured "강의" 카드, 모바일 bottom nav, 운영자 "강의 관리"(`/operator/lms`), 강사 드롭다운. 공개 헤더 contextual nav 없음 | `HomePage.tsx:231`, `operatorMenuGroups.ts` |

**drift 1건:** 고정 리워드 스케줄 노출. **차이:** 공개/회원제 visibility 노출이 KPA 보다 약함(status 필터 의존).

## 8. Neture 제외 확인

**LMS 전무 — 공통화 소비처 아님.** (services/web-neture)

- 강의/수강 route **0건**(App.tsx 322 route 중 course/lms/lesson/quiz/강의 매치 없음).
- 강의 메뉴 **없음** — operator 메뉴 주석 *"Neture 미사용 group(resources/lms)… 메뉴 항목 없음"* (`operatorMenuGroups.ts:252,265`).
- LMS 패키지 import **0건**(`@o4o/lms*`, `lms-core`, `lms-ui`, `education-ui` grep 0; package.json 미포함).
- 강의 연동 reward/credit UI **없음**. reward/budget 매치는 전부 commission/settlement/market-trial(유통참여형 펀딩) — **LMS 무관**.
- `types/participation.ts` 에 COURSE/QUIZ 타입 존재하나 **완전 미참조**(future-proof 정의, 활성 기능 아님).
- Neture = 공급자/파트너/운영 기반(소비자 학습 공간 없음, "B2B only").

> **주의:** Neture admin 에 향후 들어올 수 있는 reward budget 관리는 **O4O 전체 예산 관리**이지 LMS 수강 기능이 아니다 → 본 공통화 범위 밖(별도 작업선).

## 9. 공통화 후보 분류 A~E

> **분류 전제 변경:** GP/KCos 에 이미 구현이 있으므로 "A=즉시 공통화"는 **"3개 자체 구현을 공통 presentational 로 수렴 + KPA 기준선 정렬"** 을 의미한다(신규 도입 아님).

### A. 즉시 공통화 가능 (presentational, backend 계약 공통)
- CourseCard / CourseList / CourseStatusBadge / 공개·회원제 label
- LessonList / ProgressBar / EnrollmentButton(콜백 주입) / EmptyState
- LessonPlayer **기본 레이아웃 shell** (article/quiz/assignment 렌더 슬롯)
- No-payment 안내 문구 / AccessGuard copy
- 근거: 3서비스가 동일 데이터 형태·동일 backend, 차이는 theme/serviceKey/copy 수준.

### B. 공통화 가능 + 서비스별 config 주입
- 강의 카테고리 / 대상 회원 역할 / 강사·수강·운영자 승인 문구
- serviceKey / theme·accent(`#16a34a` GP / `#db2777` KCos / KPA blue) / route / 접근 권한
- 메뉴 위치(GP/KCos 공개헤더 미노출 vs KPA `/lms`) — config 로 흡수

### C. KPA 기준선 보존 후 후속 공통화 (추가 확인 필요)
- 강사 강의 관리 / 운영자 승인 / 퀴즈 관리 / 수료·인증서 / progress detail / 검색·필터
- **레슨 플레이어 동영상 처리**: KPA(self `<video>`) vs GP(YouTube 임베드) 정합 필요 → §10 위험
- **GP의 AI 과제 채점**: KPA 미보유 추가 기능 — 공통 player 추출 시 옵션 슬롯 처리 결정 필요
- KCos visibility 노출 약함 → KPA 기준으로 보강 여부

### D. 보류 (reward budget·예산·정산 선행 필요)
- rewardPolicy UI / rewardPolicyProposal UI
- 강사 reward 잔액·충전·배정 / 수강자 reward 처리중 / 강사 부족 알림
- 서비스 reward budget / ledger / admin 예산 신청·승인 / 오프라인 정산 메모
- 사용자 예상 지급 안내 고도화
- **+ 즉시 정합 권장(보류와 별개):** GP/KCos `MyCreditsPage` 고정 스케줄(+10/+20/+50) 문구는 rewardPolicy 게이팅 정책과 상충 → 공통화 전 KPA 기준(동적 표시)으로 정렬 검토

### E. 제외
- Neture LMS 수강 기능(route/menu/package 연결 금지)
- LIVE/YouTube 실시간 강의 — **GP YouTube 임베드 흔적 정리 포함**
- 플랫폼 내 결제/checkout / paid course 결제

## 10. 공통 UI package 후보

- **현황:** `lms-ui`/`education-ui`/`course-ui` **부재**. 존재: `@o4o/lms-core`(엔티티 타입 재export), `@o4o/lms-client`(경량 클라이언트). UI 패키지 규약: `*-ui`(`account-ui`, `shared-space-ui`, `store-ui-core`) / `*-core-ui`(`operator-core-ui`).
- **권장 위치:** 신규 `@o4o/lms-ui` (presentational). naming 은 기존 `*-ui` 규약 부합.
- **주입 패턴(검증된 2가지):**
  - operator-core-ui 식: 컴포넌트가 `apiBase`/`serviceKey`/`getToken`/주입 컴포넌트(RichTextEditor 등)를 props 로 받음.
  - shared-space-ui 식: service-agnostic 클라이언트(`@o4o/lms-client`)를 서비스 wrapper 에서 호출, presentational 은 데이터·콜백만 수신.
- **원칙:**
  - 첫 공통화는 **pure presentational** 중심(CourseCard/List/Detail shell/LessonPlayer/ProgressBar).
  - **API client 는 패키지가 직접 import 금지** — 서비스 wrapper 가 `@o4o/lms-client`+adapter 로 주입(account-ui 가 순수 presentational 인 선례).
  - serviceKey/labels/theme/routes/permissions 는 **config 주입**.
  - **Neture export/route/menu 연결 금지** — 패키지를 Neture package.json 에 추가하지 않음(현재 미소비 유지).

## 11. backend 공통화 경계

- **이미 serviceKey 기반(service-neutral).** `Course.serviceKey`(nullable) 는 강사의 active service membership 에서 파생(`CourseController.ts:46-53`). Lesson/Enrollment 는 course.serviceKey 상속.
- **3서비스 동일 endpoint 사용 가능** — serviceKey **whitelist/validation 없음**. 운영자 격리는 `isCourseAccessibleByOperator()`(role prefix → `resolveCanonicalServiceKey` → course.serviceKey 비교, platform admin 우회, null=legacy 허용)로 처리.
- **visibility ⊥ serviceKey:** visibility=학습자 접근(public/members), serviceKey=운영자 접근. 교차검증 없음(독립).
- **rewardPolicy 계약 service-neutral** — KPA 하드코딩 없음. 단 event log fallback `?? 'kpa-society'` 는 **null serviceKey(legacy)일 때만**.
- **권한 가드:** 학습자 route 는 service-scope 없음(누구나 enroll). 강사 `requireInstructor`(`lms:instructor`). 운영자 글로벌 route `requireLmsOperator` = `[admin, super_admin, platform:*, cosmetics:admin/operator, glycopharm:admin/operator]`. 인증서 발급은 KPA-only 가드.

**결론:**
- **(a) GP/KCos 공통화 = 기본 frontend-only**(backend 계약 이미 공통). 신규 `@o4o/lms-ui` 추출 + 서비스 wrapper 교체.
- **(b) backend serviceKey 가드 — 신규 불요, 단 1건 검증:** `requireLmsOperator` 목록의 `cosmetics:*` 가 K-Cosmetics 의 role prefix 인지(=`resolveCanonicalServiceKey('cosmetics')==='k-cosmetics'`) 확인. 맞으면 GP/KCos 모두 커버(추가 불요). KCos 가 별도 `k-cosmetics:*` prefix 를 쓴다면 목록 보강 필요 — **adoption WO 에서 확정**.
- **(c) Neture serviceKey 차단 — 추가 금지.** LMS 는 의도적으로 모든 serviceKey 개방. 하드코딩 block 은 service-agnostic 패턴 파괴 + 나쁜 선례. Neture 제외는 **frontend 비소비(패키지 미import·메뉴/route 없음) + 본 IR/CHECK 문서 가드**로 enforce.

## 12. 위험 요소

| # | 위험 | 영향 |
|---|------|------|
| R1 | **reward budget 흐름 미정 상태에서 reward UI 공통화** | 정책 drift — D 등급 보류로 차단 |
| R2 | **GP/KCos `MyCreditsPage` 고정 리워드 스케줄(+10/+20/+50)** | rewardPolicy 게이팅(설정 시에만 지급) 정책과 사용자에게 상충 메시지. 공통화 전 정합 필요 |
| R3 | **GlycoPharm 레슨플레이어 YouTube 임베드 잔존** | KPA 가 제거한 흔적 — 공통 player 추출 시 YouTube 재도입 위험(E 등급) |
| R4 | **Neture 가 공통 LMS 패키지를 잘못 소비** | 패키지 미import·메뉴/route 미연결 + 문서 가드로 차단(하드코딩 block 아님) |
| R5 | **paid/isPaid/price 필드를 결제 기능으로 오해** | 공통 UI 에 "결제 없음" 안내 문구 표준 포함, checkout 슬롯 미생성 |
| R6 | **강사/운영자 권한 서비스별 상이 구현** | backend 는 이미 service-scope 통일 — 프론트 가드도 config 주입으로 통일 |
| R7 | **GP의 AI 과제 채점 등 서비스별 추가 기능** | 공통 player 가 과도/부족해질 위험 — 옵션 슬롯/feature flag 로 흡수 |
| R8 | **공통 package 가 API client 직접 import → 서비스 경계 흐림** | presentational/container 분리, client 는 wrapper 주입(원칙 §10) |
| R9 | **rewardPolicyProposal(운영자 승인형)과 강사 지갑형 구조 혼재** | reward 작업선 분리로 차단(본 IR 미구현) |
| R10 | **KCos visibility 노출 약함(status 의존)** | 공통화 시 KPA visibility 기준으로 보강 결정 필요 |

## 13. 권장 공통화 순서

1. **정합 선행(권장):** GP/KCos `MyCreditsPage` 고정 리워드 문구 → KPA 동적 기준 정렬(R2), GlycoPharm YouTube 임베드 처리 결정(R3). *(공통 추출 전 drift 제거 — 작은 비용, 큰 정책 정합)*
2. **A 등급 pure UI 추출:** `@o4o/lms-ui` 신설 — CourseCard/List/CourseDetail shell/LessonPlayer/ProgressBar/EnrollmentButton(콜백·config 주입, client 미import).
3. **KPA 부터 wrapper 교체** → GlycoPharm → K-Cosmetics (reference impl 우선).
4. **B 등급 config 주입** 정리(theme/serviceKey/copy/route/permission).
5. **C 등급** 강사/운영자/퀴즈/인증서/플레이어 동영상 정합 후 후속 공통화.
6. **backend (b) 검증** — `requireLmsOperator` canonical 매핑 확인(필요 시 role 보강).
7. **D/E 보류·제외 유지** — reward budget 은 별도 작업선, Neture/YouTube/checkout 차단.

## 14. 후속 WO 제안

1. **`WO-O4O-LMS-COMMON-UI-EXTRACTION-V1`** — KPA 기준 CourseCard/List/Detail/LessonPlayer/Progress 등 pure UI 를 `@o4o/lms-ui` 로 추출(client 주입, Neture export 금지).
2. **`WO-O4O-LMS-GLYCOPHARM-ADOPTION-V1`** — GlycoPharm 에 공통 UI 적용 + **YouTube 임베드 정합 + MyCredits 고정문구 정렬**.
3. **`WO-O4O-LMS-KCOSMETICS-ADOPTION-V1`** — K-Cosmetics 에 공통 UI 적용 + visibility 노출 보강 + MyCredits 정렬.
4. **`CHECK-O4O-LMS-NETURE-EXCLUSION-GUARD-V1`** — Neture LMS route/menu/package 소비처 부재 재확인.
5. **`IR-O4O-REWARD-BUDGET-FLOW-PLATFORM-SERVICE-INSTRUCTOR-V1`** — 별도 작업선. O4O 관리자 → 서비스 운영자 → 강사 reward budget/지갑/ledger/처리중 상태 흐름 조사(본 IR §4 방향성 기반).
6. *(선택)* **`WO-O4O-LMS-GPKCOS-REWARD-CREDITS-UI-ALIGNMENT-V1`** — 1번 선행 정합(R2/R3)을 공통 추출 전 단독 처리하고 싶을 때.

## 15. 검증 (이 IR 자체)

- [x] 문서 1개만 생성 (`docs/investigations/IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1.md`)
- [x] 코드/DB/migration/route/frontend/API 변경 없음 (read-only)
- [x] KPA LMS 기준선 조사 (§3·§5)
- [x] GlycoPharm LMS 현황 조사 (§6) — 풀 구현 + drift 2건(reward 문구·YouTube)
- [x] K-Cosmetics LMS 현황 조사 (§7) — 풀 구현 + drift 1건(reward 문구), visibility 약함
- [x] Neture 제외 확인 (§8) — LMS 전무, 패키지 미소비
- [x] backend 공통화 경계 (§11) — service-neutral, frontend-only, Neture block 비권장
- [x] 공통화 후보 A~E (§9) + 공통 UI package 후보 (§10)
- [x] 위험 요소 (§12) + 권장 순서 (§13) + 후속 WO (§14)
- [x] reward budget 흐름은 범위 제외·별도 작업선 명시 (§4)

---

*End of IR-O4O-LMS-SERVICE-COMMONIZATION-BOUNDARY-V1*
