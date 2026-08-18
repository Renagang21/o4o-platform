# CHECK-O4O-COMMUNITY-COMMONIZATION-MAIN-INTEGRATION-AND-PRODUCTION-SMOKE-CLOSURE-V1

> **WO**: `WO-O4O-COMMUNITY-COMMONIZATION-MAIN-INTEGRATION-AND-PRODUCTION-SMOKE-CLOSURE-V1`
> **작성일**: 2026-08-18
> **선행 CHECK**: [CHECK-O4O-COMMUNITY-COMMONIZATION-BRANCH-FULL-REGRESSION-VALIDATION-V1](CHECK-O4O-COMMUNITY-COMMONIZATION-BRANCH-FULL-REGRESSION-VALIDATION-V1.md) (판정 `CONDITIONAL`)
> **최종 판정**: **CONDITIONAL**

---

## 1. Git 통합 기록

| 항목 | 값 |
|---|---|
| source branch | `work/commonization-community` |
| source commit | `e379b3857` |
| merge 전 main | `fa3c533c7` |
| merge commit | **`4f7d095d9`** |
| merge 방식 | `git merge --no-ff` (저장소 현행 관행) |
| conflict | **0건** (양쪽이 함께 건드린 3파일 `glycopharm.routes.ts` · `kpa.routes.ts` · `web-neture/tailwind.config.js` 모두 자동 병합) |
| conflict marker 잔존 | **0** (tracked 전수 `git grep`) |
| source 누락 커밋 | **0** (`git rev-list --count HEAD..origin/work/commonization-community` = 0) |
| cherry-pick 사용 | 없음 (누적 21커밋 전량 통합) |

### 병합 전 gate

| 확인 | 결과 |
|---|---|
| 변경 파일 (merge-base 대비) | 79 files |
| migration / `.sql` | **0건** |
| lockfile 변경 | **0건** |
| `package.json` | `packages/lms-ui/package.json` 1건, diff 는 `description` 문자열만 |
| 선행 regression CHECK | 존재 |

병합으로 코드가 변경되지 않았으므로(자동 병합·conflict 0) 선행 검증의 typecheck/test/build 를 반복하지 않았다.

> main 작업트리에는 **다른 세션의 활성 WIP** 가 있었다. 무접촉 원칙에 따라 stage/stash/reset 하지 않았고, 본 CHECK 문서 커밋은 분리된 detached worktree 에서 수행했다.

---

## 2. Production 배포

canonical 경로 = **main push → GitHub Actions 자동 배포** (`deploy-api.yml` · `deploy-web-services.yml`). 신규 배포 경로를 만들지 않았다.

| 대상 | workflow / job | 결과 |
|---|---|---|
| api-server (`o4o-core-api`) | Deploy API Server (Cloud Run) | **DEPLOYED** (revision `o4o-core-api-03337-kgp`) |
| KPA-Society | deploy-kpa-society | **DEPLOYED** |
| K-Cosmetics | deploy-k-cosmetics | **DEPLOYED** |
| GlycoPharm | deploy-glycopharm | **DEPLOYED** |
| Neture | deploy-neture | **DEPLOYED** |
| PharmacyHub | deploy-pharmacy-hub | **DEPLOYED** |
| KPA-Branch | deploy-kpa-branch | **DEPLOYED** |
| Admin Dashboard | Deploy Admin Dashboard | **DEPLOYED** |

배포 run: `32086970378` / `32086970194` / `32086970346` — 전부 `success`, 트리거 sha 는 merge commit 을 포함한다.

---

## 3. Production API smoke

### 3-1. Content / Resource Core (선행 ENV_BLOCKED 핵심)

| 엔드포인트 | 결과 |
|---|---|
| `GET /api/v1/glycopharm/contents` (limit/page/search/sub_type) | **200 x 4**, shape `{success,data:{items,total,page,limit,totalPages}}` 정상. 데이터 0건 |
| `GET /api/v1/cosmetics/contents` (limit/usage_type) | **200 x 2**, shape 정상. 데이터 0건 |
| `GET /api/v1/kpa/contents` | **200**, 실데이터 total=5 |
| `GET /api/v1/kpa/contents?status=all` | **200**, total=5 (기본과 동일 — `status=all` 이 필터 값이 아닌 모드 지시자로 동작함을 실증) |
| `GET /api/v1/kpa/contents?status=ready` | **200**, total=0 (실제 status 필터로 동작) |
| `GET /api/v1/kpa/contents?search=해양` | **200**, total=4 |
| `GET /api/v1/kpa/contents/:id` | **200** (상세 정상) |
| `GET /api/v1/kpa/contents/<없는 uuid>` | **404** `{"code":"NOT_FOUND"}` — 계약대로 |
| `GET /api/v1/{kpa,glycopharm,cosmetics}/operator/resources` (미인증) | **401 x 3** `AUTH_REQUIRED` — 가드 정상 |
| `GET /api/v1/{kpa,glycopharm,cosmetics}/operator/resources` (운영자 인증) | **200 x 3**, KPA 실데이터 반환 |

**mutation 은 일절 수행하지 않았다** (create/update/status/delete/view 증가 전부 미실행). 운영 데이터 안전 원칙 준수.

#### 관측: `operator/resources?status=all` → 0건

운영자 자료실 목록은 `status` 를 항상 실제 필터로 적용하므로 `status=all` 은 `c.status='all'` 이 되어 0건이 된다.
**merge-base(`2a05bf980`) 원본 handler 와 동일 동작**이며, 프론트는 이 엔드포인트에 `status=all` 을 보내지 않는다(전수 grep). → **회귀 아님 / 수정 대상 아님.**

### 3-2. GlycoPharm forum

| 엔드포인트 | 결과 |
|---|---|
| `GET /api/v1/glycopharm/forum/categories/popular` | **200** `{"success":true,"data":[]}` — 선행 404 해소 |
| `GET /api/v1/glycopharm/forum/categories` | **200** |

GP 프론트는 generic `/api/v1/forum/*` 이 아니라 service route `/api/v1/glycopharm/forum/*` 를 소비함을 브라우저 네트워크 관측으로 확인했다.

### 3-3. Cross-service 확인

KPA 세션으로 GP operator resources 조회 → 200 이나 반환 데이터는 `glycopharm_contents` 기준 0건. **KPA 데이터가 GP 응답에 섞이지 않았다** (동일 계정이 `glycopharm:operator` 역할을 함께 보유하므로 200 자체는 정상).

---

## 4. Production browser smoke

실계정 로그인(운영자) · desktop 1440x900 + mobile 390x844.

| 서비스 | 동선 | 결과 |
|---|---|---|
| KPA-Society | `/` 홈 최신활동 → `/forum` → **포럼 상세**(`/forum/post/ee5414c6…`) → `/lms` → **강의 상세**(`/lms/course/0405b089…`) → **lesson player**(`/lesson/6bbee793…`) → `/contents` · `/content/resources` | 전부 200 렌더 |
| K-Cosmetics | `/` → `/forum` → `/forum/posts` → `/lms` → **강의 상세 → lesson player** → `/content/documents` | 전부 200 렌더 |
| GlycoPharm | `/` → `/forum` → `/forum/posts` → `/forum/write` → `/lms` → `/content` | 전부 200 렌더 |
| Neture | `/forum` → `/forum/posts` | 200 렌더 |
| PharmacyHub | `/forum` → `/forum/posts` → `/forum/write` | 200 렌더 (운영자 계정 기준 작성 진입 허용) |

| 지표 | 값 |
|---|---|
| white screen | **0** |
| JS exception (`pageerror`) | **0** (5개 서비스 전부) |
| 예기치 않은 404/500 | 아래 §5 PRE_EXISTING 1건 외 **0** |
| dead link (header/nav 전수 이동) | **0** (GP 3 / KCos 3 / KPA 7 링크) |
| mobile 가로 스크롤 | **0** (전 측정 경로) |
| 서비스 데이터 혼입 (콘텐츠/자료실·포럼) | **0** |

---

## 5. 선행 ENVIRONMENT 5건 closure

| # | 항목 | 판정 | 근거 |
|---|---|:---:|---|
| E1 | 프로덕션 API 의 비허용 `Origin` 500 | **NOT_APPLICABLE** | production 도메인에서 검증하므로 무관. 다만 비허용 Origin 에 403 이 아닌 **500** 을 반환하는 동작은 여전함(no-origin 200 / `127.0.0.1` 500 / `kpa-society.co.kr` 200) — 별도 WO 대상 |
| E2 | content-resource Core 런타임 미검증 | **PASS** | GP/KCos/KPA 목록·필터·검색·pagination·상세·404·운영자 목록·가드 전부 production 실응답 확인 |
| E3 | `/glycopharm/forum/categories/popular` 404 | **PASS** | 배포 후 **200** |
| E4 | forum owner 화면 smoke | **STILL_BLOCKED** | 4개 서비스 `forum/my-dashboard` 전부 빈 상태, `forum/categories/mine` = `[]`. 테스트 계정이 소유 forum 없음 |
| E5 | KPA LMS 실데이터 smoke | **PASS** | 강의 목록 → 상세 → **lesson player** 까지 실제 이동·렌더 |

---

## 6. 발견 결함과 분류

| 분류 | 건수 | 내용 |
|---|:--:|---|
| **BRANCH_REGRESSION** | **0** | — |
| **DEPLOYMENT** | **0** | 8개 배포 job 전부 success |
| **PRE_EXISTING** | **2** | (1) **LMS 공개 강의 목록의 service 경계 누락** (아래) (2) KPA `/legal/documents/published/{terms,privacy}` 404 (약관 미시딩, legal 축) |
| **DATA_FIXTURE** | **2** | GP/KCos `contents` 0건 · 소유 forum 없는 테스트 계정(E4) |
| **ENVIRONMENT** | **1** | 비허용 Origin 에 500 응답 (E1) |
| **OUT_OF_SCOPE** | **2** | 검증자 probe 경로 오류 — GP `/community`(admin layout 전용) · GP `/lms/courses`(공개 route 아님, legacy `lms/:id` redirect 로 흡수) |

### PRE_EXISTING (1) — LMS 공개 강의 목록 service 경계 누락

`GET /api/v1/lms/courses` 는 요청 서비스와 무관하게 **`serviceKey='kpa-society'` 강의를 그대로 반환**한다.
그 결과 k-cosmetics.site · glycopharm.co.kr 의 `/lms` 에 KPA 강의가 노출되고 상세/lesson 까지 열린다.

- 원인: `apps/api-server/src/modules/lms/routes/lms.routes.ts:68` `router.get('/courses', optionalAuth, listCourses)` 에 serviceKey 필터가 없다. `WO-O4O-LMS-COURSE-SERVICEKEY-V1` 의 scope 검사는 **운영자 write 액션에만** 적용돼 있다.
- **이번 브랜치·병합과 무관**: 브랜치는 LMS 백엔드 파일을 **0건** 변경했고, 병합 전 main(`fa3c533c7`)의 해당 라인이 동일하다. 도입 시점은 2026-05-01 (`481c3d324`).
- 성격: 노출 대상은 **이미 공개된 강의 목록**이며 자격증명·개인정보 노출이 아니다. 즉시 접근 차단이 필요한 상태는 아니라고 판단해 중지하지 않았다.
- 이번 WO 에서 **수정하지 않았다** — 공개 목록 계약에 service 축을 추가하는 것은 4개 서비스가 공유하는 **APP-LMS 공통 계약 변경**(CLAUDE.md 중지 조건: 공통 계약 · API contract 변경)이며, `serviceKey` 가 null 인 legacy 강의 처리 정책 결정이 선행돼야 한다.
- **후속 WO 필요**: `WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1` (가칭).

---

## 7. 수정 / 재배포

**코드 수정 0건 · 재배포 0건.** BRANCH_REGRESSION·DEPLOYMENT 결함이 없었고, PRE_EXISTING (1) 은 공통 계약 변경이라 별도 WO 로 분리했다.

---

## 8. 미실측 / 잔존 위험

- forum owner 대시보드·회원관리 실화면 (E4, 소유 forum 데이터 없음)
- GP/KCos 콘텐츠·자료실의 **데이터 있는 상태** 목록/상세 (현재 0건이라 shape 만 검증)
- content/resource **write 경로**(등록·수정·상태변경·삭제) — 운영 데이터 보호를 위해 의도적으로 미실행
- PRE_EXISTING (1) 로 인한 서비스 간 강의 노출 (후속 WO 전까지 잔존)

---

## 9. 최종 판정

### **CONDITIONAL**

- main 통합 성공 · production 배포 성공 · 핵심 API runtime PASS · 주요 browser smoke PASS · **unresolved BRANCH_REGRESSION 0**.
- 다만 **service isolation 문제 0** 조건을 충족하지 못했다 — LMS 공개 강의 목록의 cross-service 노출(PRE_EXISTING (1))이 production 에 존재한다. 이번 병합이 만든 것은 아니나 실재하므로 `PASS` 로 표기하지 않는다.
- 추가로 **E4 는 STILL_BLOCKED** 다.

### 선행 branch regression CHECK 의 production closure 판단

선행 CHECK 의 `CONDITIONAL` 사유 3건 중 **E2 · E3 · E5 는 production 에서 해소(PASS)** 되었고, **E4 만 STILL_BLOCKED** 로 남는다.
즉 선행 CHECK 의 핵심 ENV_BLOCKED(신규 backend Core 런타임 미검증)는 **닫혔다**.

### 의미 한정

본 WO 의 판정은 **"누적 커뮤니티 공통화 브랜치의 main 통합 및 production 검증"** 범위에 한정된다.
**커뮤니티 전체 기능 공통화 완료 선언은 하지 않는다** — 이후 전체 census 재감사에서만 판단한다.

---

## 10. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 **2건** (LMS 공개 목록 service scope · 비허용 Origin 500→403)
