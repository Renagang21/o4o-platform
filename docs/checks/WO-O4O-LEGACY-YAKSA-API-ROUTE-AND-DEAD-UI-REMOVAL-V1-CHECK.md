# WO-O4O-LEGACY-YAKSA-API-ROUTE-AND-DEAD-UI-REMOVAL-V1 — CHECK

**판정:** **PASS_WITH_FOLLOWUP**
**작성일:** 2026-08-05
**선행 근거:** 감사 CHECK `1cd0eda2a` · JWT scope 제거 구현 `2e06c94f1` · JWT scope 제거 CHECK `47e7db8d1`

---

## 1. 기준 commit · origin/main · 작업 트리

| 항목 | 값 |
|------|-----|
| branch | `main` |
| 작업 시작 HEAD = origin/main | `e58866c7633bc3ceb97a93c4b8b7c779794bf5d7` |
| `merge-base --is-ancestor 1cd0eda2a HEAD` | **OK** (감사 CHECK 포함) |
| 작업 트리 | not clean — 타 세션 WIP **65건**, 전부 `apps/api-server/src/scripts/**` (HFF-ZH 번역 산출물) |
| 대상 경로 중첩 | **없음** — 본 WO 대상은 `routes/yaksa/**` · `bootstrap/` · `database/entities.ts` · `config/` · `controllers/forum/` · `admin-dashboard/src/**` 로, 타 세션 WIP 경로와 교집합 0 |

타 세션 WIP 는 수정·삭제·restore·stash·stage 하지 않았다.

---

## 2. 제거한 12개 endpoint 와 mount

`apps/api-server/src/bootstrap/register-routes.ts` 의 `app.use('/api/v1/yaksa', …)` 단일 mount 를 제거했다.
그 결과 아래 12개 endpoint 가 모두 사라진다 (배포 후 404).

| # | Method | Route | 이전 Guard |
|---|--------|-------|------------|
| 1 | GET | `/api/v1/yaksa/posts` | 없음 (public) |
| 2 | GET | `/api/v1/yaksa/posts/:id` | 없음 (public, `view_count` write) |
| 3 | GET | `/api/v1/yaksa/categories` | 없음 (public) |
| 4 | GET | `/api/v1/yaksa/admin/posts` | requireAuth + requireYaksaScope |
| 5 | POST | `/api/v1/yaksa/admin/posts` | 〃 |
| 6 | PUT | `/api/v1/yaksa/admin/posts/:id` | 〃 |
| 7 | PATCH | `/api/v1/yaksa/admin/posts/:id/status` | 〃 |
| 8 | GET | `/api/v1/yaksa/admin/categories` | 〃 |
| 9 | POST | `/api/v1/yaksa/admin/categories` | 〃 |
| 10 | PUT | `/api/v1/yaksa/admin/categories/:id` | 〃 |
| 11 | PATCH | `/api/v1/yaksa/admin/categories/:id/status` | 〃 |
| 12 | GET | `/api/v1/yaksa/admin/logs/posts` | 〃 |

mount 자리에는 제거 사유와 "DB 테이블은 보존" 을 명시한 주석을 남겼다 (`register-routes.ts` 26번 블록).
import 문(`createYaksaRoutes`)도 같은 주석으로 대체했다.

---

## 3. 제거한 파일 · entity 등록 · export

### 3-1. 삭제 파일 (18개)

| 경로 | 개수 |
|------|---:|
| `apps/api-server/src/routes/yaksa/**` (routes · controllers · services · repositories · entities · dto · index) | 13 |
| `apps/admin-dashboard/src/pages/yaksa-forum/**` | 5 |

`routes/yaksa` 하위 13파일 전체:
`yaksa.routes.ts` · `index.ts` · `controllers/{index,yaksa.controller}.ts` ·
`services/{index,yaksa.service}.ts` · `repositories/{index,yaksa.repository}.ts` ·
`entities/{index,yaksa-category.entity,yaksa-post.entity,yaksa-post-log.entity}.ts` · `dto/index.ts`

### 3-2. entity 등록 해제

`apps/api-server/src/database/entities.ts` 의 두 지점에서 `YaksaCategory` / `YaksaPost` / `YaksaPostLog` 를 제거했다.

- import 블록 (`from '../routes/yaksa/entities/index.js'`)
- `entities` 배열 등록

**테이블은 보존한다.** `apps/api-server/src/database/connection.ts:77` 이 `synchronize: false` (무조건, 환경 분기 없음)임을 확인했으므로 entity 등록 해제가 스키마에 영향을 주지 않는다. `migration-config.ts:74` 도 동일하다.

### 3-3. 경로 계약 정리

| 파일 | 변경 |
|------|------|
| `apps/admin-dashboard/src/config/service-entry.ts:84` | `forum.routePatterns` 에서 `'/admin/yaksa-forum'` 제거 (라우팅된 적 없는 경로) |
| `apps/api-server/src/config/service-scopes.ts:280` | `detectServiceEntryFromPath` 의 `'/yaksa-forum'` 분기 제거 |
| `apps/api-server/src/controllers/forum/ForumRecommendationController.ts:84` | stale JSDoc `/api/v1/yaksa/forum/recommendations` → 실경로 `/api/v1/forum/recommendations/yaksa` 로 정정 |

---

## 4. 제거한 미라우팅 관리자 화면

| 파일 | 내용 |
|------|------|
| `YaksaForumRouter.tsx` | 3화면 lazy 라우터. **App.tsx·라우트 파일·메뉴 어디에서도 import 되지 않았다** |
| `PostListPage.tsx` | `/yaksa/admin/categories`, `/yaksa/admin/posts` 호출 |
| `PostDetailPage.tsx` | `/yaksa/admin/posts/:id` 호출 |
| `CategoryListPage.tsx` | `/yaksa/admin/categories` 호출 |
| `index.ts` | `YaksaForumRouter` 재export (유일 참조처) |

**동적 등록 여부 재확인:** `App.tsx` 의 `routes/yaksa` 문자열 hit 은 `import { YaksaRoutes } from '@/routes/yaksa.routes'` 로, 현행 `/admin/yaksa/*` 실서비스 라우트다. `pages/yaksa-forum` 을 import 하거나 동적 등록하는 코드는 저장소 전체에 존재하지 않음을 재확인했다 (중지 조건 4 미해당).

---

## 5. 별개 404 부채 5건 처리 결과

| # | 항목 | 처리 | 사유 |
|---|------|:---:|------|
| A | `apps/main-site/src/lib/yaksa/forum-data.ts` → `/api/v1/yaksa/forum/*` · `/organizations` · `/user/profile` (7호출) | **미수행 · 후속 보고** | 제거한 router 가 서비스한 적 없는 경로다(이전에도 404). 소비 화면(`apps/main-site/src/pages/yaksa/forum/**` 6페이지 + `components/yaksa/forum/**`)은 외부 importer 가 없어 현재 라우팅되지 않지만, **main-site 포럼 기능의 존폐 판단**이 필요하다. WO 원칙상 "현행 기능으로 전환하거나 새 API 에 연결해야 한다면 이번 작업에서 구현하지 않는다" 에 해당 |
| B | `apps/admin-dashboard/src/lib/api/yaksaAdmin.ts:217-241` → `/api/v1/yaksa/reports*` (4호출) | **미수행 · 후속 보고** | **현재 라우팅된 화면이 소비 중**이다 — `/admin/yaksa/reports` (`ReportReviewPage.tsx`). 즉 살아있는 화면이 404 API 를 호출하는 상태이며, 제거가 아니라 **API 연결 복구/대체 판단**이 필요하다 |
| C | `packages/forum-yaksa/src/backend/routes/yaksa.search.routes.ts` (mount 0) | **미수행 · 후속 보고** | 제거 대상 router 와 직접 연결이 없다. 패키지 차원의 존폐 판단 필요 |
| D | `ForumRecommendationController.ts:84` stale JSDoc | **정리 완료** | "현재 계약을 잘못 설명하는 stale JSDoc" 으로 본 WO 범위 |
| E | 공개 `/yaksa/posts` 의 `status=draft\|hidden\|deleted` 노출 결함 · 공개 GET 의 `view_count` write | **소멸** | route 자체가 제거되어 결함 경로가 사라졌다 |

A·B·C 는 **PASS_WITH_FOLLOWUP** 판정 사유다.

---

## 6. 전체 재검색 결과

```
grep -rn "routes/yaksa/|YaksaPostLog|YaksaForumRouter|createYaksaRoutes|createYaksaController|/admin/yaksa-forum|'/yaksa/admin"
  --include=*.ts --include=*.tsx  apps/*/src packages/*/src services/*/src
```

→ hit 3건, **전부 본 WO 가 남긴 제거 사유 주석**이다.

| 파일 | 내용 |
|------|------|
| `apps/admin-dashboard/src/config/service-entry.ts:84` | 제거 주석 |
| `apps/api-server/src/bootstrap/register-routes.ts:106` | 제거 주석 |
| `apps/api-server/src/database/entities.ts:139` | 제거 주석 |

**활성 참조 0.** (별도로 `apps/api-server/dist/**` · `apps/admin-dashboard/dist/**` 의 이전 빌드 산출물에 옛 코드가 남아 있으나, 이는 gitignore 대상 로컬 산출물이며 재빌드 시 사라진다.)

---

## 7. 현행 Yaksa 실서비스 보존 확인

| 대상 | 상태 |
|------|:---:|
| `app.use('/api/v1/membership', …)` (`register-routes.ts:372`) | 보존 |
| `app.use('/api/v1/forum', forumRoutes)` (`register-routes.ts:161`) | 보존 |
| `@o4o/lms-yaksa` (`routePrefix: '/api/v1/lms-yaksa'`, `createYaksaLmsRoutes`) | 보존 (미변경) |
| `@o4o/membership-yaksa` · `@o4o/forum-yaksa` · `@o4o/annualfee-yaksa` | 보존 (미변경) |
| `apps/admin-dashboard/src/routes/yaksa.routes.tsx` (`/admin/yaksa-hub`, `/admin/yaksa`, `/admin/yaksa/{members,reports,officers,education,fees,accounting/*}`, `/admin/membership/*`, `/admin/reporting/*` — Route 22개) | 보존 (미변경) |
| `apps/admin-dashboard/src/pages/yaksa-admin/**` | 보존 (미변경) |
| KPA role · membership · organization · ownership 구조 | 미변경 |
| `packages/forum-yaksa` `YaksaCommunity*` 도메인 | 미변경 |

이름 유사성만으로 제거한 대상은 없다.

---

## 8. 테스트 · typecheck · build 결과

| 검증 | 명령 | 결과 |
|------|------|:---:|
| api-server 전체 typecheck | `npx tsc --noEmit` | `src/scripts/**` 외 **에러 0** (scripts 에러는 타 세션 WIP 포함 기존 부채이며 build tsconfig 제외 대상) |
| api-server build typecheck | `npx tsc -p tsconfig.build.json --noEmit` | **PASS (에러 0)** |
| api-server 전체 테스트 | `npx jest --no-coverage` | **73 suites / 1306 tests 전부 통과** |
| api-server 보안 테스트 | `npx jest --testPathPattern=__tests__/security/` | **10 suites / 231 tests 통과** |
| 라우트 mount 인벤토리 회귀 | `admin-api-guard-inventory` · `service-admin-guard` · `membership-residual-subtree-guard` | **3 suites / 124 tests 통과** (mount 1건 감소가 인벤토리 계약을 깨지 않음) |
| admin-dashboard typecheck | `npx tsc --noEmit` | **PASS (출력 없음)** |
| admin-dashboard 테스트 | `npx vitest run` | **14 files / 237 tests 통과** |

---

## 9. DB · migration · 권한 · 배포 변경 0

| 항목 | 결과 |
|------|:---:|
| DB 테이블 DROP | **0** — `yaksa_posts` / `yaksa_categories` / `yaksa_post_logs` 보존 |
| migration 생성·수정·삭제 | **0** |
| schema · seed 변경 | **0** (`apps/api-server/scripts/delete-seed-data.sql` 의 `yaksa_*` 구문도 미변경 — 테이블 DROP 시점에 lockstep 정리) |
| 운영 DB 조회 · write | **0** — 본 작업에서 운영 DB 에 접속하지 않았다 |
| 계정 · 역할 · membership 변경 | **0** |
| 인증 미들웨어 · guard 정책 변경 | **0** (제거된 `requireYaksaScope` 는 삭제 대상 router 내부 로컬 함수였다) |
| 배포 | **0** |
| 브라우저 smoke | **0** (WO 제외 범위) |
| `pnpm-lock.yaml` | 미변경 |

---

## 10. 타 세션 WIP 보존

`apps/api-server/src/scripts/**` HFF-ZH 산출물 65건은 조회·수정·삭제·stash·stage 하지 않았다.
commit 은 본 WO 대상 파일만 정확한 경로 목록으로 지정했다.

---

## 11. CHECK 경로

`docs/checks/WO-O4O-LEGACY-YAKSA-API-ROUTE-AND-DEAD-UI-REMOVAL-V1-CHECK.md` (본 문서)

---

## 12. commit · push · ahead/behind

> 본 절은 commit 직후 값으로 채운다.

- commit: `(아래 커밋 로그 참조)`
- push: `origin/main`
- ahead/behind: `0 / 0`

---

## 후속 (FOLLOWUP)

| # | 항목 | 성격 |
|---|------|------|
| F-1 | `/admin/yaksa/reports` 화면이 호출하는 `/api/v1/yaksa/reports*` 4 endpoint 가 404 — 살아있는 화면의 API 연결 복구 또는 화면 존폐 판단 | **기능 결함** |
| F-2 | `apps/main-site` yaksa 포럼 페이지·`forum-data.ts` 7호출(404) 존폐 판단 | 기능 판단 |
| F-3 | `packages/forum-yaksa/src/backend/routes/yaksa.search.routes.ts` 미mount 존폐 판단 | 기능 판단 |
| F-4 | `yaksa_posts` / `yaksa_categories` / `yaksa_post_logs` 3테이블의 보존·아카이브·DROP 판단 감사 (row: 0 / 5 seed / 0) | DB 판단 |
| F-5 | 배포 후 `/api/v1/yaksa/posts` 가 404 로 전환되는지 확인 | 배포 후 확인 |

---

## 핵심 완료 문장

production 소비와 운영 데이터가 없는 legacy `/api/v1/yaksa/*` API 및 실행 불가능한 관리자 UI를 제거했다. 현행 Yaksa membership·LMS·포럼·관리자 기능과 데이터베이스 테이블은 변경하지 않았다.
