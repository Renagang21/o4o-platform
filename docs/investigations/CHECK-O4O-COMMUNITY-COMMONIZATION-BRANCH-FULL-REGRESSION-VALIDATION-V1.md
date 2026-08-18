# CHECK-O4O-COMMUNITY-COMMONIZATION-BRANCH-FULL-REGRESSION-VALIDATION-V1

> **WO**: `WO-O4O-COMMUNITY-COMMONIZATION-BRANCH-FULL-REGRESSION-VALIDATION-V1`
> **작성일**: 2026-08-18
> **검증 대상**: `work/commonization-community` 브랜치 전체 (누적 커밋 20건)
> **최종 판정**: **CONDITIONAL**

---

## 1. 검증 기준점

| 항목 | 값 |
|---|---|
| 기준 commit | `origin/work/commonization-community@1ee3f9adf` |
| 검증 시작 시 worktree | `C:/tmp/o4o-common-community@3adc6d729` (기준보다 **6커밋 뒤처진 조상**) |
| worktree 처리 | clean · 비점유 · stash 0 · 5일 무변경 확인 → **fast-forward only** (`3adc6d729..1ee3f9adf`, 10 files / +2418 −1294) |
| 검증 종료 시 HEAD | `1ee3f9adf` (= 원격과 동일, 검증 중 원격 변화 없음) |
| merge-base(origin/main) | `2a05bf980` |
| 브랜치 누적 규모 | merge-base 대비 **78 files / +11056 −9716**, 20 commits |

`reset` / `rebase` / `stash` / 다른 세션 파일 접촉은 수행하지 않았다.

### 1-1. 이번 검증의 핵심 대상 6커밋 (`3adc6d729..1ee3f9adf`)

| commit | 내용 |
|---|---|
| `e20292818` | 커뮤니티 콘텐츠·자료실 backend canonicalization 감사 (IR) |
| `3acf0b76a` | 콘텐츠·자료실 backend Core 추출 + table isolation 테스트 |
| `a99a6a1fc` | GP / K-Cosmetics resources controller 를 공통 Core 로 수렴 |
| `0a7d337b3` | backend Core 공통화 부분 완료 기록 (CHECK) |
| `5a03bcd96` | KPA 콘텐츠·자료실 6 handler 공통 Core 채택 |
| `1ee3f9adf` | KPA Core adoption 마감 기록 (CHECK) |

---

## 2. 환경 점검

| 항목 | 결과 |
|---|---|
| worktree 위치 | `C:/tmp/o4o-common-community` (main 작업트리와 분리) |
| node_modules | 기존 설치 재사용 |
| `package.json` 변경 | 브랜치 전체에서 **`packages/lms-ui/package.json` 1건뿐**, diff 는 `description` 문자열만 |
| dependency / lockfile | **변경 0건** → `pnpm install --frozen-lockfile` 안전, 재설치 불필요 |

---

## 3. 검증 결과

### 3-1. Shared package 검증 — PASS

| 대상 | typecheck | 비고 |
|---|:---:|---|
| `@o4o/lms-ui` | EXIT=0 | `views/CourseDetailView` · `LessonPlayerView` · `contracts` · `primitives` |
| `@o4o/shared-space-ui` | EXIT=0 | `ForumPost*` · `ForumComment*` · `forum-owner/*` · `community/LatestActivitySection` |
| `@o4o/security-core` | EXIT=0 | — |

### 3-2. api-server 전체 검증 — PASS

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` | **EXIT=0** |
| jest 전체 | **120 suites / 1985 tests / 0 FAIL** (239.6s) |
| 브랜치 신규 4 spec 재실행 | **4 suites / 120 tests PASS** (content-resource Core · table isolation 포함) |

### 3-3. 5개 서비스 전체 검증 — PASS

`web-kpa-society` · `web-glycopharm` · `web-k-cosmetics` · `web-neture` · `web-neture-operator`
→ **typecheck EXIT=0 / production build EXIT=0 (5/5)**

### 3-4. 기능 회귀 검증 (코드 레벨 등가성)

브랜치 backend 가 프로덕션에 미배포이므로 런타임 대신 **route surface 등가성 비교**를 수행했다.

| 대상 | 방법 | 결과 |
|---|---|---|
| KPA 콘텐츠·자료실 route surface | merge-base vs HEAD `diff` | **IDENTICAL (11 routes)** |
| GP `resources.controller.ts` | 557L → 101L, config 주입만 남김 | router wiring 6개 (`GET /`, `POST /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `POST /:id/view`) **완전 보존** |
| K-Cosmetics resources | 동일 factory 사용 | `/contents` · `/operator/resources` mount 유지 |
| `neture` frontend `/api/v1` 소비 | 경로 literal 전수 비교 | **57 paths 동일** |
| GlycoPharm `/api/v1/lms/certificates/` literal 소멸 | 추적 | **기능 손실 없음** — 하드코딩 `window.open()` 이 `CourseCertificateCard.tsx` 의 typed API client blob download 로 대체되어 공통 `CourseDetailView` 의 `renderSidebarExtra` slot 으로 주입. `api/lms.ts` 는 3개 엔드포인트 모두 보유 |
| Express route ordering | `glycopharm.routes.ts:205-232` | `/categories/popular` 가 `/categories/:id` **앞에 등록** 확인 → param shadowing 없음 |

### 3-5. Browser smoke — 부분 수행

로그인: KPA-society operator 계정 (`docs/local/TEST-ACCOUNTS.local.md` 런타임 참조, 하드코딩 0).
뷰포트: desktop 1440×900 + mobile 390×844.

| 항목 | 결과 |
|---|---|
| home / forum 목록·상세·댓글 / LMS / forum-owner 화면 | 실데이터 렌더 |
| white screen | **0** |
| JS exception | **0** |
| dead link | **0** |
| mobile 가로 스크롤 | **hscroll=0 (전 화면)** |
| LMS course detail → lesson player | K-Cosmetics · GlycoPharm 에서 실제 이동 확인 |

> 프로덕션 API 는 허용되지 않은 `Origin` 에 **HTTP 500** 을 반환한다(무 Origin=200 / `http://127.0.0.1:4203`=500 / `https://glycopharm.co.kr`=200). Playwright route interception 으로 프로덕션 Origin 을 사용해 우회한 뒤에야 실데이터 검증이 가능했다. 이는 브랜치와 무관한 **환경 제약**이다.

---

## 4. 결함 분류

### BRANCH_REGRESSION — **0건**

이번 브랜치가 유발한 회귀는 발견되지 않았다.

### PRE_EXISTING — **0건 (확정 결함 기준)**

- `GET /api/v1/lms/enrollments/me/course/{id}` 404 — 미수강 상태의 정상 시맨틱이며 UI 가 graceful 처리. 결함 아님.

### ENVIRONMENT — 5건

| # | 내용 |
|---|---|
| E1 | 프로덕션 API 가 비허용 `Origin` 에 500 응답 → localhost browser smoke 직접 불가 |
| E2 | 브랜치 backend 미배포 → 신규 content-resource Core **런타임 smoke 불가** (unit test 120건으로만 커버) |
| E3 | `/glycopharm/forum/categories/popular` 프로덕션 404 — main 에 해당 route 부재(미배포)이며 브랜치 결함 아님 |
| E4 | forum-owner 회원관리 화면 미실행 — 테스트 계정이 소유 forum 없음 |
| E5 | KPA LMS course detail / lesson player 미실행 — 강의 0건 |

### OUT_OF_SCOPE — 1건

- GlycoPharm `/community` 404: `path="community"` 는 admin layout 의 `CommunityManagementPage`, 공개 커뮤니티 메인은 index route `/` 의 `CommunityMainPage`. 검증자의 probe 경로 오류이며 결함 아님.

---

## 5. 수정 사항

**코드 수정 0건.** BRANCH_REGRESSION 이 0이므로 최소 수정 및 재검증 단계는 발생하지 않았다.

---

## 6. 최종 판정

### **CONDITIONAL**

- 실행 가능한 모든 검증(typecheck · jest 1985 · 5서비스 build · 코드 등가성 · browser smoke)은 **전부 PASS**, 브랜치 회귀 **0건**.
- 다만 **E2 / E4 / E5** 는 환경·데이터 제약으로 수행하지 못했다. 특히 **E2(신규 backend Core 런타임 미검증)** 는 이번 브랜치의 핵심 변경 영역이므로 `PASS` 로 표현하지 않는다.

### main 통합 가능 여부

**통합 가능**. 단 아래를 통합 후 조건으로 둔다.

1. 배포 직후 GP / K-Cosmetics / KPA 의 콘텐츠·자료실 엔드포인트(`/contents`, `/operator/resources`, KPA 6 handler) 런타임 응답 확인 — **E2 해소**
2. `/glycopharm/forum/categories/popular` 200 응답 확인 — **E3 해소**
3. forum 소유 계정 · KPA 강의 데이터 확보 후 E4 / E5 화면 smoke 보완

---

## 7. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
