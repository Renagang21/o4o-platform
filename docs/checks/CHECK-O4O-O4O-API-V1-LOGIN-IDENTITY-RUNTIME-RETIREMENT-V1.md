# CHECK-O4O-O4O-API-V1-LOGIN-IDENTITY-RUNTIME-RETIREMENT-V1

- **WO**: WO-O4O-O4O-API-V1-LOGIN-IDENTITY-RUNTIME-RETIREMENT-V1
- **선행**: WO-O4O-LEGACY-DB-IDENTITY-O4O-API-V1-FINAL-RETIREMENT-V1 — Phase A census 에서 STOP (판정 C). `o4o_api` 가 운영 스키마 전체의 owner 이고 `o4o_api_v2` 가 role 설정으로 `o4o_api` 로 동작함을 확인 → 목표를 "role 삭제" 에서 "login/runtime identity 은퇴 + owner role 유지" 로 축소 (사용자 결정 2026-09-30)
- **일자**: 2026-09-30
- **기준 HEAD**: `bbba83383` (== origin/main, clean)
- **최종 판정**: **RUNTIME LOGIN RETIRED / OWNER ROLE RETAINED**

## 결과 요약

| 항목 | 결과 |
|---|---|
| one-off Cloud Run job 7종 | **삭제** (남은 job = `o4o-api-migrations` 1) |
| 저장소 job 실행경로 | **제거** (`e2adfe4f3`) |
| Secret `o4o-api-db-password` | 사용처 0 재확인 후 **삭제** |
| `o4o_api` | **NOLOGIN** · owner role 유지 (DROP 0) |
| `o4o_api_v2` → `o4o_api` role 전환 | 신규 connection 에서 정상 |
| 운영 API smoke | PASS |
| `o4o_api` 직접 login workload | **0** |

## 1. 운영 DB identity 구조 (조사 결과 · 변경 후)

| role | LOGIN | 역할 |
|---|---|---|
| `o4o_api_v2` | O | login / runtime identity. `o4o-core-api` · `o4o-api-migrations` 가 사용 (secret `o4o-db-password`). `ALTER ROLE ... SET role=o4o_api` 설정 · `o4o_api` member |
| `o4o_api` | **X (본 WO)** | 운영 스키마 owner — 테이블 287 · 인덱스 1148 · 시퀀스 10 · 스키마 2 · enum 34 · 함수 10 · `uuid-ossp`. relation ACL 174건. `cloudsqlsuperuser` member · CREATEROLE · CREATEDB (본 WO 에서 변경 안 함) |

PostgreSQL 15.18. 기본 권한 설정 · event trigger · large object 0.

## 2. job 7종 최종 판정

스케줄러 · eventarc 트리거 0. 전부 **COMPLETED_ONE_OFF**.

| Job | 마지막 실행 | 근거 |
|---|---|---|
| `o4o-drug-seed-candidate-import` | 2026-07-03 성공 | 약가마스터 candidate 적재 완료 |
| `o4o-drug-seed-promotion-apply` | 2026-07-03 13:06 UTC 성공 (exec `96wtl`) | 12:27 실패(`5whnt`, 멱등성 결함) 이후 재실행 성공 — [RUNBOOK CHECK §12](CHECK-O4O-DRUG-SEED-CANDIDATE-APPLY-RUNBOOK-V1.md) "잔여 eligible 승격 완료". 9/04 코드 변경은 재실행 대비 reconcile 호출 추가일 뿐 미완료 작업 없음 |
| `o4o-drug-shared-desc-bulk-canonical` | 2026-07-04 | 완료 |
| `o4o-easy-drug-image-copy` | 2026-07-04 | 완료 |
| `o4o-easy-drug-seed-candidate-import` | 2026-07-04 | 완료 |
| `o4o-easy-drug-shared-description-derive` | 2026-07-04 | 완료 |
| `o4o-drug-representative-grouping` | 2026-08-25 성공 | 7/04 본 실행 · 8/25 는 비밀번호 교체 후 검증 실행 |

삭제 직전 실행 중 execution 0 확인.

## 3. 제거한 저장소 경로 (`e2adfe4f3`)

- `deploy-api.yml` — `Refresh one-off Cloud Run job image references` step (ONEOFF_JOBS 7종)
- `apps/api-server/Dockerfile` · `.dockerignore` — `dist/*-job.js(.map)` COPY/허용 14행씩
- `apps/api-server/tsup.config.ts` — entry 9 → 2 (`main` · `migrate`)
- `apps/api-server/src/*-job.ts` 7개 삭제 (import 하는 곳 0). job 이 호출하던 service · `src/scripts/**` 는 유지
- spec 동기화: `deploy-api-migrate-only-path.spec.ts` DEPLOY_STEPS · `detect-affected.test.mjs` step 목록 · `detect-affected.mjs` 주석

역사 기록(WO/CHECK)은 수정하지 않았다.

## 4. Secret `o4o-api-db-password`

job 삭제 후 재조사: Cloud Run services(전 리전) 0 · jobs 0 · Cloud Build trigger 0 · Compute 0 · Cloud Functions(API 비활성) · 저장소(workflow 포함, docs 제외) 0. IAM accessor = compute default SA 1건(삭제된 job 용). → 삭제. 버전 1개(2026-08-25 생성)였다.

## 5. NOLOGIN 전 재확인 · 적용

- `pg_stat_activity`: `o4o_api` session_user 세션 0 (`o4o_api_v2` · `cloudsqladmin` 만)
- `pg_has_role('o4o_api_v2','o4o_api', MEMBER/USAGE)` = t/t · role 설정 `{role=o4o_api}`
- `ALTER ROLE o4o_api NOLOGIN;` → `rolcanlogin=f` · CREATEROLE/CREATEDB 불변

## 6. 적용 후 검증

| 검증 | 결과 |
|---|---|
| 신규 connection (새 backend) `session_user/current_user` | `o4o_api_v2` / `o4o_api` |
| 신규 connection read (`typeorm_migrations` 693 · `users`) | 정상 |
| 권한 (`has_table_privilege` write · public CREATE) | t / t (read-only 함수로 확인, write 0) |
| 명시적 `SET ROLE o4o_api` | 정상 |
| `o4o_api` 소유 테이블 | 287 (불변) |
| `o4o-api-migrations` identity | `DB_USERNAME=o4o_api_v2` · secret `o4o-db-password` · `migrate.ts` 는 env username 사용 → API 와 동일 경로. migration 은 실행하지 않음 |
| API `/health` · `/health/database` · `/health/ready` | 200 · 200(healthy) · 200 |
| API 공개 read (`/api/v1/neture/home/hero` · `/home/news` · `/home/logos` · `/public/services/neture/legal-profile`) | 전부 200 `success:true` |
| NOLOGIN 이후 `o4o-core-api` ERROR 로그 | 0 |
| Cloud SQL 인증/권한 오류 | 1건 — 검증용 `o4o_api` 직접 로그인 시도(의도적) |

한계: 운영 API 인스턴스의 기존 pool 을 강제로 재생성하지는 않았다(배포 · 재시작은 범위 밖). 동일 자격증명 · 동일 role 설정으로 새 backend 를 열어 전환 경로를 검증했고, role 설정은 세션 시작마다 서버가 적용하므로 API 의 신규 connection 도 같은 경로를 탄다.

## 7. Production write (정확한 목록)

1. `gcloud run jobs delete` × 7 (위 §2 목록)
2. `gcloud secrets delete o4o-api-db-password`
3. `ALTER ROLE o4o_api NOLOGIN;`

그 외 DB write · migration · 배포 · IAM 변경 0. `DEPLOY_ENABLED=false` 유지.

## 8. 변경하지 않은 것 · 후속

- 유지: `o4o_api` role · ownership · CREATEROLE · CREATEDB · `cloudsqlsuperuser` membership (필요성 별도 조사 대상)
- 후속 1: **Repository DB Identity / Legacy Operational Scripts 정리** — `apps/api-server/src/scripts/**` 약 341개를 ACTIVE / PAUSED BUT POSSIBLY NEEDED / COMPLETED ONE-OFF / LEGACY / HISTORICAL·TEST 로 분류하고 `DB_USERNAME || 'o4o_api'` 암묵 fallback 제거 (이제 그 fallback 은 NOLOGIN 으로 항상 실패한다)
- 후속 2: `o4o_api` 의 CREATEROLE · CREATEDB · `cloudsqlsuperuser` membership 필요성 조사
- 후속 3 (선택): ownership 을 전용 owner role 로 이전하고 `o4o_api` 명칭 정리 — DB role architecture 작업
