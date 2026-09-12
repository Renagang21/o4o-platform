# CHECK-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1

> **WO**: `WO-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1`
> **상태**: DEPLOYED + PRODUCTION BROWSER SMOKE PASS (12/12) — §10. smoke 중 발견한 상세 페이지 404 처리 결함 1건은 후속 커밋으로 수정·재배포(§10-A). 최종 CLOSED 판정은 사용자 몫.
> **작성일**: 2026-09-12
> **성격**: 얇은 `automation_jobs` 1 테이블 + 기존 Media Library V2(`media_entity_links`) 연결. 영상 생성·편집·렌더링·외부 API 연동 없음.

---

## 1. 구현 요약

O4O 자동화 안에 관리자 전용 "동영상 제작" 임시 작업공간을 만들었다. O4O 가 하는 일은 **VIDEO 작업 생성 · 여러 작업의
독립 상태 유지 · 지시/메모 저장 · Media asset 연결(INPUT / INTERMEDIATE / OUTPUT) · 완료 · 완료 후 정리 선택**뿐이다.
실제 영상 작업은 Codex / Computer Use / 외부 AI 가 하고, 결과는 기존 Media Library 자산으로 연결한다.

금지 항목 준수: video framework · video asset table · workflow engine · scheduler · retry · timeline · renderer · Veo/Codex API ·
Local Agent protocol 변경 · 일반 사용자 공개 · 비공개 workspace 권한 모델 — **전부 없음**. `executionRef` · `isCompleted` 없음.

## 2. `automation_jobs` schema

`apps/api-server/src/database/migrations/20270410000000-CreateAutomationJobs.ts` (entity `modules/automation/entities/AutomationJob.entity.ts`)

| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | uuid PK | |
| type | varchar(20) | CHECK `IN ('VIDEO')` |
| title | varchar(200) | |
| created_by | uuid | |
| status | varchar(20) DEFAULT 'DRAFT' | CHECK `DRAFT · IN_PROGRESS · WAITING · COMPLETED · CANCELLED` |
| instructions | text NULL | 작업 지시 / 메모 |
| status_note | varchar(500) NULL | 세부 단계("내레이션 검수" 등)는 enum 이 아니라 여기 |
| cleanup_decision | varchar(20) NULL | CHECK `KEEP_ALL · KEEP_OUTPUTS · KEEP_SELECTED · DECIDE_LATER` |
| created_at / updated_at | timestamptz | |
| completed_at | timestamptz NULL | CHECK `(status='COMPLETED') = (completed_at IS NOT NULL)` |

인덱스 `automation_jobs_type_status_idx(type, status, updated_at DESC)`. `down()` 은 `DROP TABLE` — media schema 무변경이라 rollback 가능
(media_entity_links 의 job 행은 opaque entity_id 로 FK 없음).

## 3. API — `/api/v1/platform/automation-jobs` (platform admin 전용)

`modules/automation/controllers/automation-job.controller.ts`. guard 는 Media V2 관리 API 와 **같은** `requireMediaPlatformAdmin`
(`platform:admin` | `platform:super_admin`) 을 export 해서 재사용 — Job 접근 권한과 Media asset 관리 권한이 같은 관리자 집합이고,
entityId 를 안다고 연결 권한이 생기지 않는다(서비스 권한 모델 신설 없음).

| Method | Path | 동작 |
|---|---|---|
| GET | `/automation-jobs?status=&type=` | 목록 + purpose 별 asset 건수 (updated_at DESC, 200건) |
| POST | `/automation-jobs` | 생성 `{title, instructions?}` → DRAFT |
| GET | `/automation-jobs/:id` | 상세 + `assets[{linkId,purpose,asset}]` |
| PATCH | `/automation-jobs/:id` | title / instructions / statusNote / status(COMPLETED 제외 → `USE_COMPLETE_ENDPOINT`). COMPLETED 후 `JOB_CLOSED` 409. CANCELLED 는 재개 가능 |
| POST | `/automation-jobs/:id/complete` | `{cleanupDecision}` 필수 → COMPLETED + completed_at |
| POST | `/automation-jobs/:id/assets` | `{mediaAssetId, purpose}` 연결. Job lock + media row lock. 같은 asset 은 Job 당 purpose 1개(재연결 = 용도 변경). 닫힌 Job 은 `JOB_CLOSED` |
| DELETE | `/automation-jobs/:id/assets/:linkId` | 해제 — linkId 가 이 Job 범위가 아니면 404 |
| GET | `/automation-jobs/:id/cleanup-preview?decision=&keepLinkIds=` | 정리 계획 (상태 변경 없음, COMPLETED 만) |
| POST | `/automation-jobs/:id/cleanup` | 정리 실행 `{decision, keepLinkIds?}` — 항목별 결과 반환 |

오류 형식은 기존 `{success:false, error, code}`. `TypeORM pg query()` 가 DELETE/UPDATE 에 `[records, affected]` 를 돌려주는 점을 반영했다.

## 4. UI (Admin, `admin.neture.co.kr`)

- 메뉴: 최상위 그룹 **자동화 › 동영상 제작** (`/automation/video-jobs`). `admin-menu.static.tsx` + `rolePermissions.ts`(deny-by-default 명시) + 메뉴 count 락 테스트 갱신(클릭 23→24, 노드 28→30).
- 목록 `pages/automation/VideoJobsPage.tsx`: 새 작업(제목 + 지시) / 진행 중(DRAFT·IN_PROGRESS·WAITING) / 완료(COMPLETED·CANCELLED) 탭, 자료 건수(입력/작업/결과).
- 상세 `pages/automation/VideoJobDetailPage.tsx`: 기본 정보 · 현재 상태(+메모) · 작업 지시/메모 · 입력 자료 · 작업 자료 · 최종 결과 · 자료 연결(기존 `/platform/media-library` 검색) · 완료(정리 방침 선택) · 자료 정리(미리보기 → 실행, 결과 표).
- 기존 Media Assets 페이지의 tailwind 테이블/폼 패턴 재사용. 영상 편집 UI 없음. route 는 `platform.routes.tsx`, guard `platform:super_admin`(사이트 floor 와 동일).

## 5. Media 연결 방식

`media_entity_links(entity_type='video-production-job', entity_id=automation_jobs.id, purpose ∈ INPUT|INTERMEDIATE|OUTPUT)`.
새 테이블 없음, media schema 무변경. 상세 조회는 `media_entity_links JOIN media_assets` 로 요약 필드만 반환.

## 6. Cleanup 처리

- 후보는 **INTERMEDIATE 만**. INPUT(원본)·OUTPUT 은 항상 KEEP. `KEEP_ALL` / `DECIDE_LATER` 는 아무것도 지우지 않고 결정만 저장.
- `KEEP_OUTPUTS` = INTERMEDIATE 전부 후보, `KEEP_SELECTED` = 선택하지 않은 INTERMEDIATE 만 후보.
- 후보별 보호 판정 → **관계만 해제(UNLINK_ONLY)**: 다른 entity(다른 Job·상품·콘텐츠)에 연결(`LINKED_ELSEWHERE`) / 다른 자산의 parent·root(`LINEAGE_PROTECTED`, OUTPUT 의 lineage 포함) / Screen Set 사용(`SCREEN_SET_IN_USE`). 그 외 → DELETE.
- 실행은 항목마다 **link 해제 + `deleteAssetIn(manager)`** 를 한 트랜잭션으로 묶는다. 기존 delete guard 가 막거나 storage 삭제가 실패하면 rollback 되어 link 도 남는다.
- 결과 구분: `KEPT` · `UNLINKED` · `DELETED` · `BLOCKED(code)` · `STORAGE_DELETE_FAILED`. 자동 삭제 scheduler 없음.

### §11 Media 삭제 처리 (기존 동작 확인 · 최소 수정)

확인 결과 기존 `deleteAsset` 은 GCS 삭제 실패를 `warn` 후 **DB 삭제를 계속**해 "삭제 완료"로 보고되면서 GCS object 가 고아로 남았다.
최소 수정: 404(이미 없음)만 삭제된 것으로 보고, 그 외 storage 오류는 `MEDIA_STORAGE_DELETE_FAILED` 로 throw → 트랜잭션 rollback(DB row 보존).
기존 `DELETE /media-library/:id` 는 이 경우 **502 + code** 로 응답한다(과거 200). `screenSetUsageCount` 를 public 으로만 바꿨다. 전체 삭제 리팩터링 없음.

## 7. Multi-Job 동작

Job 간 상호 제약이 없다. 테스트 B: 한 Job 이 WAITING(statusNote='내레이션 검수')인 동안 다른 Job 의 연결·상태 변경·완료가 모두 성공하고 목록에서 각자 상태·건수를 유지.

## 8. 테스트 결과 (로컬)

- API typecheck PASS · Admin typecheck PASS · Admin `vite build` PASS · 변경 파일 ESLint 0건 · `git diff --check` PASS.
- Jest `automation-job.spec.ts` (실 PostgreSQL 17, localhost:55439 일회성) 6 tests + `automation-job-http.spec.ts` 7 tests = **13/13 PASS**:
  - migration down/up rollback, A Job CRUD/상태/취소/완료, B Multi-Job, C INPUT/INTERMEDIATE/OUTPUT 연결·용도 변경·해제·타 Job linkId 거부·존재하지 않는 asset/job 거부·연결된 asset 삭제 guard,
    D cleanup KEEP_ALL/KEEP_OUTPUTS/KEEP_SELECTED/DECIDE_LATER + 다른 entity 연결·lineage·Screen Set 보호 + storage 실패 구분·재시도 삭제,
    E 기존 delete 의 storage 404/그 외 오류 구분. HTTP: 401/403(비플랫폼 역할 5종)/입력 검증(INVALID_BODY·UUID·DECISION·PURPOSE).
- 회귀: `media-library-v2.spec.ts` · `media-library-v2-http.spec.ts` · `signage-media-library-route-order.spec.ts` 35/35 PASS. Admin vitest 16 files / 386 PASS.
- 재현: `MEDIA_V2_TEST_PORT=55439 npx jest --config apps/api-server/jest.config.cjs --runInBand --runTestsByPath apps/api-server/src/__tests__/automation-job.spec.ts apps/api-server/src/__tests__/automation-job-http.spec.ts`
- `scripts/check-forbidden-tables.mjs`: `automation_jobs` 무관. 기존 위반 2건(`o4o_payments` · `neture_settlement_orders`)은 이번 변경과 무관한 사전 상태.

## 9. Migration 결과

- 로컬: 기존 media 4 migration → `CreateAutomationJobs` up → down → up 실제 적용 검증(테스트 첫 항목).
- production: 구현 커밋 `12cbf4996` → [Deploy API](https://github.com/Renagang21/o4o-platform/actions/runs/34679720227) SUCCESS. `o4o-api-migrations` 실행 `o4o-api-migrations-6xrp7` 로그에 `[X] 675 CreateAutomationJobs20270410000000` 기록 확인(수동 적용 없음). [Deploy Admin](https://github.com/Renagang21/o4o-platform/actions/runs/34679720223) SUCCESS. 같은 push 의 CI Pipeline / CodeQL 은 직후 다른 세션 push 로 concurrency **cancelled** — 로컬 typecheck·lint·jest·vitest 로 대체 확인.
- 비로그인 HTTP: `/health` 200 · `GET /api/v1/platform/automation-jobs` 401 · `admin.neture.co.kr/automation/video-jobs` 200.

## 10. Production smoke (2026-09-12, Playwright MCP, `renariver21` platform:super_admin — 비밀번호는 사용자가 직접 입력)

| # | 항목 | 결과 |
|---|---|---|
| 1 | 사이드바 `자동화 › 동영상 제작` → 목록 진입 | PASS (빈 목록, 탭 진행 중(0)/완료(0)) |
| 2 | 새 VIDEO 작업 생성 | PASS — `[SMOKE] 미네락600 제품 설명영상`(지시 포함) |
| 3 | 작업 3개 생성 후 독립 상태 | PASS — 인바디=WAITING(내레이션 검수), 외국인=DRAFT, 미네락=COMPLETED 로 각각 유지·목록 카운트 정확 |
| 4 | 실제 Media asset 검색 | PASS — 빈 검색 20건, `q=SMOKE-DISPOSABLE` 1건 정확 |
| 5 | INPUT 연결 | PASS — E2E-SEL-V2 png |
| 6 | INTERMEDIATE 연결 | PASS — KPA snapshot png + 신규 등록한 disposable 외부(YouTube) asset. 이미 연결된 항목은 "용도 변경" 표시 |
| 7 | OUTPUT 연결 | PASS — E2E-CONTENT png |
| 8 | 완료 처리 (KEEP_OUTPUTS) | PASS — 상태 완료·편집 잠금·completedAt 표시·정리 방침 선택 상태 유지 |
| 9 | 정리 미리보기 → 실행 | PASS — INPUT 보관 / OUTPUT 보관 / 다른 Job(외국인 INPUT)에 연결된 KPA png = **관계만 해제(LINKED_ELSEWHERE)** / disposable = **삭제 완료**. 실행 후 작업 자료 0건, 결과 표 구분 표시 |
| 10 | 삭제 차단 / 보존 | PASS — 연결된 INPUT asset `DELETE /media-library/:id` → 409 `MEDIA_IN_USE_LINK`, asset 200 유지. KPA png 는 정리 후에도 존재(200)하고 외국인 Job 링크 유지. disposable 은 검색 0건 |
| 11 | console error | PASS — 앱 자체 오류 0. 기록된 2건은 smoke 가 의도적으로 보낸 404(잘못된 id probe)·409(삭제 차단 검증) fetch |
| 12 | navigation dead link | PASS — 사이드바 → 목록 → 상세 → breadcrumb → Media Assets 링크 전부 렌더. UI "연결 해제" 도 PASS |

**원복**: 인바디·외국인 Job → CANCELLED(statusNote "smoke 종료 — 원복"), 외국인 Job 링크 해제, disposable asset 은 정리로 삭제됨. 잔여: `[SMOKE]` Job 3행(삭제 endpoint 는 설계상 없음)과 미네락 Job 의 INPUT/OUTPUT 링크 2건(E2E 픽스처 asset 2개 — 해당 asset 삭제 시 409 로 보호됨). 제거하려면 DB write 승인 필요.

### 10-A. smoke 중 발견·수정

- 존재하지 않는 job id 로 상세 진입 시 "Loading…" 에 머묾. 원인: axios 가 4xx 에서 throw 하므로 `{code:'JOB_NOT_FOUND'}` 가 페이지에 닿지 않음. 수정: `automation-job.api.ts` 의 `call()` 이 응답 본문 code 를 `Error.message` 로 정규화, 상세 페이지에 `loadError` 상태 추가(404 → "작업을 찾을 수 없습니다", 그 외 → 오류 + 목록 링크). typecheck·lint PASS. 재배포 후 재확인 결과는 아래.
- 범위 밖 관찰(수정 안 함): 기존 Media Assets 목록이 external(youtube) 자산의 파일 크기를 "NaN undefined" 로 표시.

## 11. 미확인 / 미완료 · 범위 밖 발견

- production browser smoke 전까지 CLOSED 아님.
- **범위 밖 발견(수정하지 않음)**: `MediaCatalogService.saveLink(update)` / `removeLink` 가 TypeORM pg `[records, affected]` 반환 형상을 `rows.length` 로 판정해 UPDATE 는 배열을 반환하고 DELETE 는 존재하지 않는 linkId 에도 404 를 내지 않는다. 별도 WO 제안.
- 다른 세션 dirty 파일(`ai-proxy.routes.ts` · `ai-tool-contract.ts` · `work-agent-*.ts`)은 접촉·커밋하지 않았다.

## 12. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(§11 media-catalog link 반환 형상).
