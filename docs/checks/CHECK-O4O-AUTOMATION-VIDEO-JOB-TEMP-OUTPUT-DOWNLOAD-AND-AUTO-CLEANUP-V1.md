# CHECK-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1

> **WO**: `WO-O4O-AUTOMATION-VIDEO-JOB-TEMP-OUTPUT-DOWNLOAD-AND-AUTO-CLEANUP-V1`
> **상태**: DEPLOYED + PRODUCTION SMOKE PASS (§13) — **CLOSED 아님**: 실제 48h TTL 만료·자동 삭제는 관찰 중(§14, 만료 2026-09-14T15:32:23Z = KST 09-15 00:32). 관찰 결과가 확인되면 CLOSED 판정 가능.
> **작성일**: 2026-09-12
> **성격**: P0(`CHECK-O4O-AUTOMATION-VIDEO-JOB-P0-ADMIN-WORKSPACE-V1`) 후속 정비. Job 구조·Media INPUT/INTERMEDIATE 연결·권한은 유지하고
> **완성 영상의 저장 위치와 생명주기만** 바꿨다 — Media Library 장기 자산 → 비공개 임시 저장 + 다운로드 + TTL 자동 삭제.

---

## 1. 기존 저장 구조 조사

| 항목 | 실측 |
|---|---|
| Media Library storage | `@google-cloud/storage`, bucket `o4o-media-library`(`GCS_MEDIA_LIBRARY_BUCKET` 기본값), `media/YYYY/MM/uuid.ext`, public URL, `cacheControl: public` |
| `o4o-media-library` IAM | **bucket 전체에 `allUsers: roles/storage.objectViewer`** — 이 bucket 의 object 는 key 만 알면 누구나 다운로드. lifecycle rule 0개, soft-delete 7일 |
| 비공개 bucket | 코드가 참조하는 `o4o-private-documents`(`GCS_PRIVATE_DOCUMENT_BUCKET` 기본값)는 **프로젝트 `netureyoutube` 에 존재하지 않음(404)** — KYC 문서 업로드 경로가 런타임 실패 상태. 범위 밖, 보고만 |
| 임시 파일 패턴 | 없음. multer `memoryStorage` → GCS 직행. 로컬 파일 저장 없음 |
| signed URL | 코드베이스에 사용처 없음 |
| download endpoint 패턴 | KYC 문서: 권한 검사 후 `bucket.file(path).createReadStream().pipe(res)` (`neture/controllers/admin.controller.ts`) — 재사용 |
| TTL / lifecycle | 어느 bucket 에도 lifecycle 없음 |
| scheduled cleanup | `jobs/spd-revision-expiry.job.ts` (in-app `setInterval`, `startup.service.ts` start/stop, env kill-switch) — 재사용 |
| Cloud Run env | `GCS_*` env 없음. deploy 가 `--set-env-vars` 전량 교체라 새 env 추가 = CI 변경 → 코드 기본값 관례(`process.env.X \|\| '기본값'`)로 CI 무변경 |
| 업로드 한도 | `uploadSingleMiddleware` video 100 MB (기존 플랫폼 제약 그대로) |

## 2. Temporary Storage 방식

- **새 비공개 bucket `gs://o4o-video-temp-output`** (asia-northeast3, uniform bucket-level access, `public_access_prevention: enforced`, `allUsers` 바인딩 0). 공개 bucket 안 prefix 로는 분리 불가(bucket 단위 allUsers)라 물리 분리.
- object key `video-jobs/<jobId>/<uuid>.<ext>`, `cacheControl: private, no-store`, `resumable: false`.
- 다운로드 = **권한 검사한 API 가 GCS 스트림을 pipe**(`Content-Disposition: attachment`). signed URL · public URL 없음 → object key 를 알아도 bucket 밖에서 받을 수 없다. 런타임 SA 의 signBlob 권한 불필요.
- 등록(업로드)은 기존 `uploadSingleMiddleware('file')` 재사용, 서비스에서 `video/*` 5종만 허용.
- `media_assets` · `media_entity_links` 에 아무것도 쓰지 않는다(§7).

## 3. TTL / 자동 삭제

- 설정 단일 지점 `modules/automation/config/video-temp-output.config.ts`: bucket · prefix `video-jobs/` · **TTL 48h**(`VIDEO_TEMP_OUTPUT_TTL_HOURS`) · expiry 간격 60분 · kill-switch `VIDEO_TEMP_OUTPUT_EXPIRY_ENABLED`.
- **A. Cloud Storage lifecycle** (백스톱): `age: 3, matchesPrefix: ["video-jobs/"] → Delete` 를 새 bucket 에만 적용. `o4o-media-library` lifecycle 무변경(재조회로 확인). lifecycle 은 적용까지 최대 24h 지연이 있어 48h 계약의 대체물이 아니다.
- **B. 기존 scheduled cleanup 재사용**: `jobs/video-temp-output-expiry.job.ts` — 부팅 1회 + 60분 간격으로 `VideoTempOutputService.expireDue()`. `expires_at <= now` 인 `AVAILABLE`/`DELETE_FAILED` 를 Job 별 독립 트랜잭션으로 object 삭제(404=이미 없음도 성공) → `EXPIRED`, 실패 → `DELETE_FAILED`(다음 실행 재시도).
- 만료 시각이 지나면 job 이 돌기 전이라도 `view()` 가 `EXPIRED` 로 계산하고 다운로드는 410 — TTL 계약은 앱이 담당.
- 다운로드 후 즉시 삭제하지 않는다. 만료 전 재다운로드 가능(테스트 A).
- 새 scheduler framework 없음.

## 4. `automation_jobs` schema 변경

`20270411000000-AddAutomationJobTempOutput.ts` — 컬럼 추가만, 기존 행·`media_entity_links` 무변경.

| 컬럼 | 비고 |
|---|---|
| temp_output_object_key varchar(500) | object key 만(URL·로컬 경로 저장 금지) |
| temp_output_file_name varchar(255) / mime_type varchar(100) / size bigint / uploaded_at timestamptz | 표시·다운로드 헤더용 |
| temp_output_expires_at timestamptz | 등록 + TTL |
| temp_output_cleanup_status varchar(20) | CHECK `AVAILABLE · EXPIRED · DELETE_FAILED`, NULL=없음 |

CHECK `(key IS NULL)=(status IS NULL)=(expires_at IS NULL)`, partial index `automation_jobs_temp_output_due_idx(expires_at) WHERE status IN ('AVAILABLE','DELETE_FAILED')`. `down()` 은 index·constraint·컬럼만 제거(테스트로 down/up 왕복 확인).
`downloaded_at` 은 실제 요구가 없어 추가하지 않았다. `cleanup_decision` 은 유지 — 의미를 **Media Library 제작 자료(INTERMEDIATE) 정리 방침**으로만 정렬(entity 주석·UI 라벨). 완성본 보관 정책이 아니다.

## 5. API (`/api/v1/platform/automation-jobs`, 기존 guard `authenticate + requireMediaPlatformAdmin`)

| Method | Path | 기능 | 오류 |
|---|---|---|---|
| POST | `/:id/temp-output` (multipart `file`) | 등록·교체(이전 object 삭제) | `TEMP_OUTPUT_FILE_REQUIRED` · `TEMP_OUTPUT_VIDEO_ONLY` · `JOB_CANCELLED` 409 · `JOB_NOT_FOUND` 404 |
| GET | `/:id/temp-output` | `{state: NONE\|AVAILABLE\|EXPIRED, downloadable, fileName, mimeType, size, uploadedAt, expiresAt, cleanupPending, ttlHours}` | |
| GET | `/:id/temp-output/download` | 스트림 다운로드 | `TEMP_OUTPUT_NOT_FOUND` 404 · `TEMP_OUTPUT_EXPIRED` 410 |
| DELETE | `/:id/temp-output` | 만료 전 직접 제거 | `TEMP_OUTPUT_STORAGE_DELETE_FAILED` 502(상태 보존) |

- `GET /`, `GET /:id`, `POST`, `PATCH`, `POST /:id/complete` 응답에 `tempOutput` view 포함. **`toPublicJob` 이 `temp_output_*` storage 컬럼을 응답에서 제거** — object key·bucket 미노출(테스트 A 가 JSON 에 `video-jobs/` 부재 검증).
- `POST /:id/assets` 의 `purpose=OUTPUT` → `PURPOSE_NOT_ALLOWED` 400. `INPUT`/`INTERMEDIATE` 는 그대로.
- Signage / YouTube / Vimeo / 자료실 API 없음.

## 6. UI (`apps/admin-dashboard/src/pages/automation/*`)

- 상세: 섹션 순서 기본 정보 · 현재 상태 · 작업 지시 · **입력 자료 · 작업 자료 · 완성 영상** · (legacy OUTPUT 이 있을 때만 "이전 방식 최종 자료 (legacy)") · 제작 자료 연결 · 완료 · 제작 자료 정리.
- "완성 영상": `영상 제작 완료 / 파일명 / [다운로드] / 파일 만료: … / 이 파일은 임시 저장되며 만료 후 자동 삭제됩니다. 필요한 경우 만료 전에 다운로드해 보관하십시오.` 만료 후 `임시 파일이 만료되어 삭제되었습니다.` 파일 input(video/* accept) 으로 등록·교체, "지금 삭제". CANCELLED 에는 등록 불가, COMPLETED 에는 가능.
- 다운로드는 인증 헤더가 필요해 `<a href>` 가 아니라 blob 으로 받아 저장(`downloadTempOutput`). 업로드는 기존 FormData `transformRequest` 패턴.
- Media selector 는 `LINKABLE_PURPOSES`(INPUT/INTERMEDIATE)만. "최종 자료" selector 제거. cleanup 라벨: `제작 자료 전체 보관 / 작업 자료 정리 (입력 자료 보관) / 선택한 작업 자료만 보관 / 나중에 결정`.
- 목록: `제작 자료 (입력 / 작업)` + `완성 영상`(다운로드 가능·만료 / 만료됨 / -) 열. Signage 연결 UI 없음.

## 7. Media Library 경계

- Temporary Output 은 `media_assets` 에 넣지 않는다 → catalog · 검색 · lineage · rights · QA · delete guard 대상 아님(테스트 A: 등록 후 `media_assets` 0건, `media_entity_links` 0건).
- Media Library 전체의 OUTPUT purpose 개념은 제거하지 않았다(`JOB_ASSET_PURPOSES` 는 읽기용으로 유지, `JOB_LINKABLE_PURPOSES` 만 축소). 다른 entity 의 purpose 체계 무변경.
- cleanup(`plan`)은 INTERMEDIATE 만 후보, legacy OUTPUT 은 항상 KEEP, temp output 은 대상 아님(테스트 E).

## 8. 기존 OUTPUT relation 처리

production 실측(2026-09-12, `GET /platform/automation-jobs` + `/media-library/:id/relations`, `platform:super_admin` 검증 계정):

| Job | 상태 | INPUT | OUTPUT |
|---|---|---|---|
| `[SMOKE] 미네락600 제품 설명영상` `e9b943d3…` | COMPLETED / KEEP_OUTPUTS | 1 (image fixture) | **1 — `c3079cf2…` image/webp `[E2E-CONTENT] 재편집됨.png`**, 다른 entity 연결 0 |
| `[SMOKE] 인바디 …` `d9e718c3…` / `[SMOKE] 외국인 …` `b4b28f32…` | CANCELLED | 0 | 0 |

- VIDEO Job OUTPUT 연결 실사용처: 없음. smoke fixture 1건뿐(영상도 아님). 다른 코드 소비처 없음(`JOB_ENTITY_TYPE` 검색).
- 결정: **유지 + 읽기 전용**. 삭제·migration·backfill 없음. 상세 화면에 "이전 방식 최종 자료 (legacy)" 로 표시되고 연결 해제만 가능. smoke Job 3건·link 2건은 그대로 둔다(§20 — 운영 영향 없음).

## 9. Multi-Job 회귀

- `automation-job.spec` B(WAITING Job 이 다른 Job 을 막지 않음) 유지 PASS.
- `automation-video-temp-output.spec` D: Job a(만료·삭제 성공) · b(만료·storage 실패 → DELETE_FAILED) · c(만료 전) · d(output 없음) 동시 처리 — c 는 계속 다운로드 가능, d 무영향, 목록 `tempOutput.state` 각자. 재실행 시 b 만 재시도, a 는 재삭제 안 함.

## 10. 보안 / 권한

- 4개 route 모두 기존 `[authenticate, requireMediaPlatformAdmin]`. HTTP spec: 익명 401, `neture:operator · supplier · kpa:admin · admin · super_admin` 403(등록·상태·다운로드·제거).
- object key 는 어떤 route 의 입력도 아니다(`/automation-jobs/temp-output/video-jobs/...` 404). 다운로드는 Job id 로만, Job 권한 = platform admin.
- bucket: public access prevention enforced + UBLA + allUsers 없음 → key 유출 시에도 직접 접근 불가. 응답에 key/bucket/credential 없음.
- 다른 Job 의 output: Job id 가 다르면 그 Job 의 key 만 읽는다(row 단위). "다른 Job output 접근 차단" 은 Job id 기준 권한 동일 집합(platform admin)이므로 별도 소유권 계층 없음 — P0 권한 모델 그대로.

## 11. 테스트 (로컬, 실 PostgreSQL 17 일회성 `localhost:55439`, Storage mock)

- API typecheck PASS · Admin typecheck PASS · Admin `vite build` PASS · 변경 파일 ESLint 0 error/0 warning · `git diff --check` PASS.
- `automation-job.spec.ts` 6 + `automation-video-temp-output.spec.ts` 5 + `automation-job-http.spec.ts` 8 = **19/19 PASS**:
  - A 등록→상태→다운로드→재다운로드, `expiresAt = uploadedAt + 48h`, 비공개 bucket·prefix·private no-store, media_assets 0, 응답에 key 없음
  - B video only · file required · unknown/invalid id · CANCELLED 409 · COMPLETED 허용(Media 연결은 JOB_CLOSED 유지)
  - C 교체 시 이전 object 삭제(실패해도 교체 진행) · 제거 실패 502 보존 · 404 는 성공 · 제거 후 NULL
  - D 만료 후 job 전 410 · expireDue EXPIRED/DELETE_FAILED · 재시도 · 다른 Job 무영향 · 만료 뒤 재등록 새 TTL
  - E cleanup KEEP_OUTPUTS/KEEP_SELECTED 가 temp output 을 건드리지 않음
  - 기존: migration down/up(temp 컬럼 7개 포함), CRUD, Multi-Job, INPUT/INTERMEDIATE 연결·purpose 변경·해제·delete guard, legacy OUTPUT 읽기·KEEP, `PURPOSE_NOT_ALLOWED`
  - HTTP: 401/403 ×5 역할 ×4 route, INVALID_UUID, key 경로 404, `TEMP_OUTPUT_FILE_REQUIRED`, `TEMP_OUTPUT_VIDEO_ONLY`
- 회귀: `media-library-v2.spec` · `media-library-v2-http.spec` · `signage-media-library-route-order.spec` **35/35 PASS**.
- `scripts/check-forbidden-tables.mjs`: 사전 위반(`o4o_payments`)만, 이번 변경 무관.
- 재현: `MEDIA_V2_TEST_PORT=55439 npx jest --config apps/api-server/jest.config.cjs --runInBand --runTestsByPath apps/api-server/src/__tests__/automation-job.spec.ts apps/api-server/src/__tests__/automation-video-temp-output.spec.ts apps/api-server/src/__tests__/automation-job-http.spec.ts`

## 12. Migration / Storage lifecycle

- migration 은 기존 절차(deploy migration job → deploy). 수동 적용 없음. **적용 확인**: Deploy API run `34700406301` → Cloud Run job `o4o-api-migrations` 실행 `o4o-api-migrations-5xp7p` 로그 `Migration AddAutomationJobTempOutput20270411000000 has been executed successfully` (1 new / 642 found), 이후 deploy. 수동 적용 없음.
- bucket 생성·lifecycle 은 사용자 승인 후 실행하고 재조회로 검증: `o4o-video-temp-output` — `public_access_prevention: enforced`, `uniform_bucket_level_access: true`, IAM `allUsers` 0, `lifecycle_config.rule = [{Delete, age 3, matchesPrefix ["video-jobs/"]}]`. `o4o-media-library` — lifecycle 여전히 없음(영구 asset 무영향). temporary/permanent 경계 = bucket 물리 분리.

## 13. Production browser smoke

배포: `4a569fff8` → CI Pipeline · CodeQL · Deploy API · Deploy Admin **4/4 success**. API `/health` alive, 익명 `GET …/temp-output/download` 401.
방법: Playwright chromium headless (`renariver21` platform:super_admin, 비밀번호는 로컬 SSOT 에서 런타임 주입·미기록), 로그인 → 사이드바 → 목록 → 상세 클릭 이동. 업로드 파일 = 1,196B 최소 MP4 컨테이너.

| # | 항목 | 결과 |
|---|---|---|
| 1 | 동영상 제작 목록 — 열 `제작 자료 (입력 / 작업)` + `완성 영상`, "결과" 열 없음 | PASS |
| 2 | 기존 Job 상세(`[SMOKE] 미네락600`, COMPLETED) — 섹션 `기본 정보 · 현재 상태 · 작업 지시 · 입력 자료 (1) · 작업 자료 (0) · 완성 영상 · 이전 방식 최종 자료 (legacy) (1) · 제작 자료 정리` | PASS |
| 3 | temporary output 등록 (완료된 Job 에 mp4) → 201 `state=AVAILABLE`, 응답에 object key/bucket 없음, `expiresAt − uploadedAt = 48h` | PASS |
| 4 | UI 표시 — `영상 제작 완료 / 파일명 / [다운로드] / 파일 만료: 2026년 9월 15일 / 임시 저장·만료 후 자동 삭제 안내` | PASS |
| 5 | 다운로드(blob) — 받은 바이트 = 업로드 바이트(1,196B), 파일명 `smoke-temp-output.mp4`; API 재다운로드 200 `attachment; filename*=UTF-8''…`; status `downloadable=true` | PASS |
| 6 | INPUT / INTERMEDIATE Media 연결 유지 — 입력 자료 1건 그대로, `media-library?q=smoke-temp-output` 0건(완성본이 Media 자산으로 생기지 않음) | PASS |
| 7 | Media OUTPUT selector 제거 — "최종 결과" 문자열 0, 완료 Job 은 selector 숨김, legacy OUTPUT 은 "새로 연결할 수 없습니다" 경고와 함께 읽기 전용 표시; API `purpose=OUTPUT` → 400 `PURPOSE_NOT_ALLOWED` | PASS |
| 8 | Signage 직접 연결 UI 없음(YouTube/Vimeo/사이니지 언급은 "직접 등록하십시오" 안내문뿐) | PASS |
| 9 | console error 0 (두 번의 실행 모두), 예상 밖 API 4xx/5xx 0 | PASS |
| 10 | dead link 없음 — 사이드바 → 목록 → 상세 → breadcrumb `자동화 › 동영상 제작` → 목록 | PASS |
| 11 | 삭제 경로(실 GCS) — 새 Job `[SMOKE-TEMP] 완성 영상 삭제 경로`(`9980b5ad…`) 등록 201 → "지금 삭제" → 200 `state=NONE` → UI "등록된 완성 영상이 없습니다" → 다운로드 404 → `gcloud storage ls` 해당 prefix 0 objects | PASS |
| 12 | 경계 — CANCELLED Job 등록 409 `JOB_CANCELLED` · png 400 `TEMP_OUTPUT_VIDEO_ONLY` | PASS |
| 13 | 권한 — 비플랫폼 계정(`renagang21`, roles supplier/store_owner…) GET status · GET download · POST 등록 **모두 403**; 익명 401; sohae2100 은 `platform:super_admin` 보유라 200 이 정상 | PASS |
| 14 | object key 직접 접근 — `https://storage.googleapis.com/o4o-video-temp-output/video-jobs/<jobId>/<uuid>.mp4` → **403** (public access prevention) | PASS |
| 15 | expiry job production 기동 — 로그 `[video-temp-output-expiry] starting scheduled job (every 60m, ttl 48h)` → `✅ Video Temp Output Expiry Job started` → `apply done` (부팅 1회 실행), 이전 리비전 종료 시 `stopping scheduled job` | PASS |

첫 실행에서 FAIL 로 찍힌 4개 텍스트 단언(상세 섹션 3건 · 삭제 후 UI 1건)은 SPA 전환 직후 이전 화면의 innerText 를 읽은 **테스트 타이밍 문제**로, 적절한 대기 후 재실행에서 모두 PASS(위 표 2·7·11). 앱 결함 아님.

**원복·잔여**: `[SMOKE-TEMP]` Job 은 CANCELLED(statusNote "smoke 종료 — 원복"), output 없음. `[SMOKE] 미네락600` Job 에는 **TTL 관찰용 완성본 1건을 의도적으로 남김**(§14). P0 의 smoke Job 3건·link 2건은 §20 대로 유지.

## 14. 미확인 / 미완료

- **실제 TTL 만료·자동 삭제(§17-C)**: production 기본 TTL(48h)을 테스트 때문에 줄이지 않았고, 운영 DB 의 `temp_output_expires_at` 수동 UPDATE 도 하지 않았다. 대신 `[SMOKE] 미네락600`(`e9b943d3…`) 에 등록한 완성본을 그대로 두고 만료를 기다린다 — `expiresAt = 2026-09-14T15:32:23Z`. 확인 절차: (1) `GET /platform/automation-jobs/e9b943d3…/temp-output` → `state=EXPIRED, downloadable=false, cleanupPending=false`, download → 410; (2) `gcloud storage ls gs://o4o-video-temp-output/video-jobs/e9b943d3-f914-495e-8bb5-c1d54c432226/` → 0 objects(앱 expiry job 이 지움; lifecycle 은 그보다 늦은 3일 백스톱); (3) Cloud Run 로그 `[video-temp-output-expiry] apply done … expired: 1`. 로직 자체는 jest D(만료 → 410, expireDue → object 삭제 + EXPIRED, 실패 재시도) 로 검증됨.
- Cloud Run idle 로 인스턴스가 내려가 있으면 expiry job 이 그 시간엔 돌지 않는다. 다운로드 차단은 `expires_at` 으로 즉시이고, object 삭제는 다음 기동 또는 lifecycle(3일) 에 이루어진다 — 위 관찰에서 실측.
- 100 MB 업로드 한도(기존 `uploadSingleMiddleware`)·Cloud Run 요청 크기 제약은 기존 Media Library 업로드와 동일한 플랫폼 제약. 대용량 완성본 경로는 이번 WO 범위 밖.
- 범위 밖 발견(수정 안 함): `o4o-private-documents` bucket 부재(§1).
- Media Library OUTPUT purpose 는 다른 기능 가능성 때문에 전역 제거하지 않았다(WO §3).

## 15. Git

- 구현 커밋 `4a569fff8` (docs 2건 뒤로 rebase). 문서 커밋은 이 파일을 담은 커밋(HEAD).
- `HEAD == origin/main` — 문서 push 직후 확인. 최종 `git status`: WO 범위 미커밋 0건.
- 세션 중 사건: 외부 디스크 정리가 `packages/` 8개 디렉터리(추적 175 파일 + node_modules) 를 비움 → 사용자 승인 후 `git restore --source=HEAD` 로 복구, `pnpm install --frozen-lockfile --offline` + `build:packages` 재실행. 추적 변경 없음. **원인(왜 `o4o-platform\packages\` 가 정리 대상이었는지) 은 별도 확인 필요.**

## 16. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 — `GCS_PRIVATE_DOCUMENT_BUCKET` 기본값 `o4o-private-documents` bucket 부재(코드 참조 vs 실 인프라 불일치, §1). 기준 문서 drift 는 없음.
