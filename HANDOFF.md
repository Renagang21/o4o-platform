# HANDOFF

## 2026-11-12 · 공통 상품 자료 준비·정기 검토·재사용

- **branch / PR 묶음:** `wo/shared-product-material-preparation` — 최신 main `31be41b49` + 3차 `5702b2de6`(원본 `1b2ab0813`/`f56c1b3ed`) + 4차 `95049f85b`(원본 `ec4704ede`) + 5차. 3~5차를 포함한다. 원래 `wo/product-consultation-resource-separation`·`wo/consultation-structured-product-search`는 이 묶음 **병합 후 삭제 가능**이며 원래 branch를 수정·삭제하지 않았다. 중복 통합에 주의한다.
- **한 일:** 공통 상품 등록/없는 제품 등록 요청을 주 진입점으로, 기존 직접 상품의 공통 상품 대조를 추가. 관리자 공통 자료 준비 목록(상품당 한 행, 상담/QR 분리), 현재 상태를 재확인해 준비된 자료를 제외하는 읽기 전용 조사 요청문, 기존 정기 검토의 CONSULTATION 유형·handledOnly 선택 범위·사용 꺼짐 초안 및 화면 왕복 동선.
- **결정 사항:** 신규 저장소·DB schema·자동 생성·추가 AI 호출·운영 일정 활성화 없음. 기존 접수·승인·정기 worker·취급 등록 API를 재사용. handledOnly 미지정이면 기존 전체 상품 범위 유지. 조회는 최대 250개를 확인하고 sparse continuation 제공. 요청문은 최대 25개 공통 상품 식별 정보만 추려 매장/가격/고객 데이터 제외. 실제 생성/검수는 사용자의 외부 AI 및 관리자 기존 승인 절차.
- **직접 등록 보존:** 태블릿/공개 진열·매장 상담/기여·다국어·POP·QR에 local ID 소비처가 남아 있어 일괄 이관/삭제/비활성화하지 않음. 공통 상품 대조는 이름 초깃값을 넣고 사용자가 상품·규격을 선택하는 절차이며 기존 자료 참조를 자동 바꾸지 않음. 운영 이관 완료로 보고하지 않는다.
- **검증:** API 관련 161 pass / 11 skip(전용 PostgreSQL 통합 연결 미설정), 변경 후 준비·권한 12건 재검증. 관리자 30건·매장 57건 통과. API·관리자·매장 typecheck 통과. 변경 19개 TS 파일 ESLint 오류 0(기존 접수 화면 hook 경고 2건). 격리 PGlite에서 실제 SQL·중복 제거·stale/빈 QR·준비 자료 제외·미취급/삭제·두 매장의 동일 상담자료 ID 재사용·정기 범위 검증. [상세 기록](docs/investigations/IR-O4O-SHARED-PRODUCT-MATERIAL-PREPARATION-V1.md).
- **확인하지 못한 것 / 배포 후:** 운영 자료·부하·일정/worker 활성화·실제 자료 이관·실제 관리자/매장 화면·절감액. 관리자 준비 조회→선택→요청문→접수/대조/승인, 두 매장 공통 자료 참조, 기존 QR 보존, 점검 기준 검토·사용 설정·저장 후 일정 설정을 확인한다. 운영 DB 및 배포는 실행하지 않음.
- **겹치는 PR:** 조회 시 #1042·#1039와 HANDOFF.md만 겹침. #1037의 shared types는 다른 파일. PR 생성·병합·배포는 통합 세션 담당. 원래 3·4차 커밋을 따로 중복 적용하지 않는다.
- **문서 정합:** 기존 비용·전문 자료·Display 경계 유지. 앞서 기록한 B2B 전용 안내 2건은 별도 정비 묶음으로 인계. 자동 데이터 이관과 직접 등록 도메인 폐기는 별도 범위.

## 2026-11-12 · 구조화 상담자료의 상품 후보 검색 반영

- **branch / PR 묶음:** `wo/consultation-structured-product-search` — 3차 선행 커밋 `f56c1b3ed`를 최신 main `31be41b49`에 cherry-pick한 `1b2ab0813` + 4차 검색 변경. 원래 `wo/product-consultation-resource-separation`는 이 묶음 **병합 후 삭제 가능**. 원래 branch는 수정·삭제하지 않음. 이미 3차를 따로 통합할 경우 같은 diff를 중복 반영하지 않도록 확인한다.
- **한 일:** 현재 매장의 활성 취급 상품에서 구조화 상담자료 제목·내용으로 후보 검색. 자료 선택 SQL·Zod 검증을 최종 상담자료 읽기와 공유. 일반 B2B HTML 의존 제거. 50건씩 검증 후 상위 12개 정렬, 1,000개 초과는 422 조건 구체화 안내. 늦은 유효 후보/높은 점수를 버리지 않고 원문·내부 점수는 응답에 넣지 않음.
- **결정 사항:** 기존 맥락 계획 1회 유지, 추가 AI 호출 없음. DB schema·운영 데이터·권한·화면·SIWC 변경 없음. 직접 등록 상품의 이름 검색은 유지하고 중앙 자료를 임의 연결하지 않음. 공통 상품 연결·관리자 준비·자료 재사용은 5차. broad 검색은 조용한 부분 결과/빈 결과 대신 명시적 실패.
- **검증:** API 관련 178 pass / 11 skip(전용 PostgreSQL 통합 연결 미설정). 실제 승인→검색→stale 무효화 시나리오를 기존 DB suite에 보강했으나 이 suite는 미실행. 별도 PGlite 격리 PostgreSQL에서 실제 검색 SQL·유형/언어 partial unique index·구조화 전용 용어·scope/status/언어/출처/JSON/stale·중복 listing·pagination·정렬·접근 철회 검증. API typecheck, 변경 6개 TS 파일 ESLint 오류 0. 세부 [조사 기록](docs/investigations/IR-O4O-STRUCTURED-CONSULTATION-PRODUCT-SEARCH-V1.md).
- **확인하지 못한 것 / 배포 후:** 운영 데이터 부하·실제 비용·실제 약사 화면. 성분·용도·주의사항으로 후보→상품 선택→근거 확인→판단 지원, 타 매장/자격 거부, 검색 중 권한 철회, 원천 변경 후 재준비를 확인한다. 실제 운영 DB·공급자 호출·배포는 실행하지 않음. 롤백 시 상담자료를 삭제하거나 B2B로 덮어쓰지 않는다.
- **겹치는 PR:** 조회 시 #1042·#1039와 HANDOFF.md만 겹침. 3차 branch와 새 묶음의 중복 통합에 유의. PR 생성·병합·배포는 통합 세션 담당.
- **문서 정합:** 누적 발견 2건 / 별도 문서 정비 1묶음 — 매장 Excel·AI 자료 흐름 및 상담 맥락 운영 안내의 B2B 전용 설명. 정본 수정은 별도 인계.

## 2026-11-12 · 상품 상담자료 논리 분리

- **branch / PR 묶음:** `wo/product-consultation-resource-separation` — CONSULTATION 유형·공통 조회·관리자 접수·매장 표시·회귀 검증의 한 기능 묶음. 공통 snapshot union은 값 하나만 추가. 기존 소비처 호환을 유지하기 위해 API와 최소 화면 변경을 함께 검증한다. PR 생성·병합·배포는 통합 세션에 인계한다.
- **한 일:** 상품 상담자료 CONSULTATION 추가, QR은 STORE 유지. 새 유형 정본을 우선하고 이전 B2B는 원천·언어·본문·aiSections 근거가 유효한 구조화 자료만 호환 읽기. 일반 B2B 본문 대체 제거. 조회·자료 현황·Excel 공통 리더 사용. 외부 ChatGPT 일반 조회에 새 전문 자료 자동 노출 방지.
- **결정 사항:** 기존 B2B·QR 행은 이동/수정/삭제하지 않음. DB schema·migration 없음. API의 기존 purpose=B2B는 구형 클라이언트용 deprecated 전송 필드로만 보존하고 resourcePurpose=CONSULTATION 추가. 조회/준비 상태의 실제 선택은 새 공통 리더에서 수행. 약사/직원 권한·SIWC·생성 비용 정책 변경 없음.
- **검증:** API 관련 154 pass / 11 skip(전용 PostgreSQL 통합 연결 미설정), 이후 변경한 리더·현황 16건 재통과. 관리자 10건·매장 10건. API·관리자·매장 typecheck, 공통 types 빌드. 격리 PGlite에서 실제 SQL 및 canonical partial unique index 실행 검증. 전체 어댑터/접수의 실제 PostgreSQL 통합·운영 smoke·실제 절감액 검증은 미실행. 세부는 [조사 기록](docs/investigations/IR-O4O-PRODUCT-CONSULTATION-RESOURCE-SEPARATION-V1.md).
- **후속:** 4차는 상담자료 성분·용도·주의사항의 후보 검색 반영. 현재 자연어 검색의 B2B 본문 참조는 남음. 5차는 공통 상품 연결/정기 관리자 준비/재사용. 배포 전 구형 API가 CONSULTATION을 처리하지 못하는 점을 확인하고, 배포 후 관리자·매장·약사 화면·기존 QR을 검증한다. 롤백 시 새 자료를 B2B로 덮어쓰거나 삭제하지 않음.
- **겹치는 PR:** #1042(2차)·#1039와 HANDOFF.md만 겹침. 공통 types 소비처 관련 #1037은 다른 파일. 새 인계 절을 보존해 순차 통합한다. 이 branch는 최신 origin/main에서 시작했으며 미병합 2차 branch를 합치지 않았다.
- **문서 정합:** 발견 1건 / 별도 정비 1건 — 기존 매장 Excel·AI 자료 흐름의 B2B 전용·자유 본문 표시 안내. 정본 변경은 별도 문서 작업으로 인계.

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `claude/epic-rubin-5g04vm`(맨 위 절) · 이전 절 branch: `claude/clever-bohr-g532hw` · 코드 기준: `main` `c5da5631`(merge 반영) · 작성: 2026-11-11 (클라우드 작업 세션)
> 다음 실행자: **통합 담당(이 branch 의 PR 생성 · CI · 병합) → Businnect(체크리스트 실행 · 첫 과제)**
> 이전 인계 전문: `git show 0c812623:HANDOFF.md`

## 2026-11-12 · 상시 통합 세션 환경 정비 (branch `claude/epic-rubin-5g04vm`)

> 이 절만 이 branch 의 인계다. 아래 절들은 다른 세션의 인계로 그대로 둔다.
> 다음 실행자: **통합 담당(로컬)** — 이 PR 은 `.claude/hooks/` · `.claude/settings.json` · 등록 파일을 바꾸므로 상시 통합 세션이 병합할 수 없다(새 훅이 거부). 로컬에서 검토 · 병합하면 이 세션의 클라우드 병합이 열린다.

- **결정 사항**
  - 통합 담당이 이 클라우드 세션을 **상시 통합 세션**으로 지정(2026-11-12). 등록은 main 의 `.claude/integration-sessions.json`(세션 `cse_013JvDHnRfTd2t74jmcLH726`) — 등록 파일을 main 에서 읽어야 위조가 안 되므로, 병합 전에는 클라우드 병합이 계속 거부된다(의도).
  - 상시 통합 세션의 범위: 묶음 PR 생성 · CI · 리뷰 확인 · squash 병합 · 자동 Delivery 결과 확인 · 배포 후 Demo 확인. 배포 · promote · CI/배포 인프라 · 에이전트 안전 설정 PR 의 병합은 로컬(통합 담당).
  - 통합 담당이 병합 대상 · 순서 · 시점 판단을 상시 통합 세션에 위임(2026-11-12 통합 담당 지시 — `AGENTS.md` 기록도 통합 담당 지시). 사람 승인이 필요한 병합 · 배포 · promote 는 위임 밖.
  - 병합 방식은 훅에서 squash 로 고정 · `expectedHeadSha` 필수. 다른 방식이 필요하면 로컬.
  - `CLAUDE.md` 의 「setup script 에 의존성 설치 금지」를 실제 환경에 맞춰 「setup script 는 미리 데우기 · 정확한 설치는 SessionStart 훅」으로 고쳤다(환경을 바꾸는 대신 문서를 맞춤 — SessionStart 훅이 매번 `--frozen-lockfile` 을 돌려 lockfile 누락 위험이 없다). 환경 이름 `o4o-dev` → 실제 `o4o-platform`.
- **바꾼 것**
  - 새 `.claude/hooks/guard-mcp-github.mjs`(matcher `mcp__github__.*`) + 테스트 14개. 조사에서 확인한 빈틈: MCP 도구는 Bash 훅을 거치지 않고, 클라우드 MCP 토큰이 소유자 계정이라 `actions_run_trigger` 로 deploy · promote 를 실행하면 workflow 소유자 게이트도 통과했다. 판정:
    - auto-merge 거부 · main 에 직접 쓰는 파일 도구(`push_files` 등) 거부(모든 세션)
    - 클라우드: 검사 전용 workflow(CI Pipeline · CodeQL · AppStore Guard · PR 라벨 · 겹침 알림) 밖의 실행 · 재실행 · 취소 거부. 숫자 ID 조회 실패도 거부. 로컬은 승인 창/대화상자
    - 병합: squash + `expectedHeadSha` 필수. 클라우드는 main 등록 확인 + PR 이 보호 경로(`.github/` · `.claude/hooks/` · `.claude/settings.json` · 등록 파일 · `scripts/ci/` · workflow 가 운영에 실행하는 `scripts/deployment/` · `scripts/privacy/account-erasure-*` · `scripts/db/` · `scripts/ci-build-app.sh` · `infra/` · `deploy/` · `Dockerfile*` · `cloudbuild*`)를 바꾸거나 거기서 옮기지 않을 것(rename 이전 경로 포함 — Codex #1039 P1 2건 반영). 조회 실패는 거부
  - `.claude/settings.json` 에 훅 등록 · 새 `.claude/integration-sessions.json`(`.gitignore` 의 `.claude/*` 에 걸려 예외 한 줄 추가)
  - `AGENTS.md` §4 역할(상시 통합 세션) · 작업 위치 분담(PR 생성 · 병합은 상시 통합 세션, 배포 · 로컬 작업은 VS Code, 병합은 한 시점에 한 곳) · §9(MCP 훅)
  - `CLAUDE.md` 훅 목록 · 세션 표(상시 통합 세션 행) · 환경 이름 · setup script 문구 · branch/PR 문구(작업 세션은 PR 을 만들지 않는다 — §4-1(e) 와 어긋나 있던 것) · 클라우드 GitHub 도구 제약
  - `/integrate` 스킬: 클라우드 명령 대응표(GraphQL 대신 REST · MCP) · 병합 후 Delivery 확인 절차 · HOLD/FAILED/FREEZE 시 로컬 인계
- **검증**
  - `node scripts/ci/check-agent-config.mjs` PASS(훅 테스트 3파일 37개 통과)
  - 변이 검사: 보호 경로 · 등록 확인 · CI 목록 · main 쓰기 · squash 조건을 하나씩 빼면 매번 테스트 실패
  - 실제 GitHub 대상: PR #1036 병합 판정 → 등록 파일이 main 에 없어 거부(fail closed). 이 세션에서 MCP `enable_pr_auto_merge` 호출 → 훅이 거부(훅 작동 확인)
  - 스킬의 REST 명령(`pulls?head=…`) 실제 실행 확인
- **확인하지 못한 것**
  - 병합 후 이 세션에서 실제 MCP 병합이 통과하는지(등록이 main 에 들어간 뒤 첫 병합 때 확인)
  - Windows 로컬에서 새 훅의 승인 대화상자(로컬 `mcp__github__merge_pull_request` 는 approvalFor 경로) — 가짜 gh 테스트는 Windows 에서 skip 된다
  - Bash 훅 `block-cloud-deploy.mjs` 는 `deploy|delivery|promote` 이름만 보므로 `account-erasure-activation.yml` · `pharmacyhub-qr-cutover.yml` 같은 운영 workflow 의 클라우드 `gh workflow run` 은 막지 않는다(새 MCP 훅은 허용 목록 방식이라 막는다). 별도 정비 후보
- **PR 로 묶을 단위:** 한 PR(에이전트 안전 설정 · 문서). DEPLOYMENT = NOT_APPLICABLE(`.claude/` · 문서만)
- **겹칠 수 있는 열린 PR:** 없음 — 열린 PR #1028 · #1031 · #1034 · #1035 · #1036 · #1037 · #1038 은 `AGENTS.md` · `CLAUDE.md` · `HANDOFF.md` · `.claude/` 를 바꾸지 않는다(2026-11-12 `gh pr diff --name-only` 대조)

## 2026-11-12 · migration 전 백업 보관 정리 (branch `wo/premigration-backup-retention`)

> 다음 실행자: **CLOUD** — PR #1028 병합 후 [`WO-O4O-PREMIGRATION-BACKUP-RETENTION-V1`](docs/work-orders/WO-O4O-PREMIGRATION-BACKUP-RETENTION-V1.md) T1 ~ T4.

- **결정 사항(통합 담당 2026-11-12):** 보관 30일 + 최근 5개 유지. 정리는 `deploy-api.yml` 의 migration 성공 뒤에 하고, 실패해도 배포는 막지 않는다. `pre-migration-` on-demand 백업만 대상이다.
- **완료(LOCAL):** 커스텀 역할 `o4oCloudSqlPreMigrationBackup` 에 `cloudsql.backupRuns.delete` 추가.
- **겹칠 수 있는 PR:** #1028(`deploy-api.yml` · `ci-pipeline.yml` 테스트 목록) — 병합 뒤에 시작한다.

## 2026-11-11 · Promote · Delivery 짧은 job 통합 (비용 절감 · branch `claude/peaceful-lamport-sjwtri-promote-cost`)

> 이 절만 이 branch 의 인계다. 아래 절들은 다른 세션의 인계로 그대로 둔다.
> 다음 실행자: **LOCAL** — [`WO-O4O-PROMOTE-SHORT-JOB-CONSOLIDATION-V1`](docs/work-orders/WO-O4O-PROMOTE-SHORT-JOB-CONSOLIDATION-V1.md) §5-A actionlint(병합 전 조건) → **통합 담당** PR 검토 · 병합(배포 workflow 변경 · AGENTS.md §5) → 같은 WO §5-B 병합 후 첫 실행 확인.

- **바꾼 것:** `deploy-api.yml` · `deploy-admin.yml` · `deploy-web-services.yml` 의 `ci-gate` job 을 detect job 의 step(`ci_gate`)으로 옮겼다. 배포 job 은 `needs.<detect>.outputs.ci_gate == 'passed'` 를 요구한다(게이트 조건식 · `ci-gate.mjs --enforce` · 30분 대기 · 권한 그대로). Web `summary` 는 직접 dispatch 에서만 돈다(`github.workflow_ref` 로 판별 — Delivery · Promote 호출 시 skip).
- **절감(실측 2026-10-27~11-10, Promote 62 · Delivery 183 run):** 1분 청구 job 약 665개/15일 제거 → 월 약 1,300분(약 $7.7, private Linux 요금) · 배포 workflow 사용량의 약 22%.
- **위험 판정:** `deploy-risk.mjs --base origin/main --head <이 branch>` = LEVEL_1 · deploy_required=false(세 파일 모두 control 변경). 병합만으로 서비스 재배포 없음.
- **테스트:** 새 `scripts/ci/__tests__/promote-short-job-consolidation.test.mjs`(실제 조건식을 평가해 freeze · dry_run · 소유자 · 대상 · migrate_only · force_deploy · CI 결과 전 조합에서 배포 여부가 종전과 같음 · 결함 6종 주입 시 모두 실패 확인) · `deploy-workflow-gates.test.mjs` 를 새 구조로 갱신 · CI node:test 목록 추가. `scripts/ci/__tests__/*.test.mjs` 520 pass.
- **병합 후 확인(미검증 — 실제 실행 필요):** ① 다음 Delivery 배포 run 에서 각 deploy 호출이 `Detect …`(CI gate step 포함) → 배포 순서로 돌고 `ci-gate` job 이 없음 ② CI gate step 로그에 `ci-gate.mjs` 통과 ③ web 호출에 `summary` 가 skip ④ detect job 시간이 60초 안(넘으면 2분 청구 — 절감 축소). 문제가 있으면 이 PR 을 되돌리는 revert PR 하나로 원상 복구된다(데이터 · 설정 변경 없음).
- **하지 않은 것:** Promote 실행 · 운영 배포 · GitHub 설정 변경. `Same-SHA guard` · `Classify` · `Report` 는 GCP 인증 · 승격 판정 경계라 합치지 않았다.

## 한 일 3 — WO-O4O-REMOTE-COLLABORATOR-ONBOARDING-V1 (2026-11-11 사용자 지시)

신규 원격 공동개발자 `Businnect` 합류 준비를 조사하고 문서를 보완했다. 저장소 공개 상태 · 권한 · ruleset · CI · Runner · secret · 배포는 바꾸지 않았다.

- `1e200899` + 이 commit
  - 새 [`docs/investigations/IR-O4O-REMOTE-COLLABORATOR-READINESS-V1.md`](docs/investigations/IR-O4O-REMOTE-COLLABORATOR-READINESS-V1.md) — 준비도 보고서. 다룬 것:
    - GitHub 접근
    - Private 전환 영향
    - 개발환경 실측
    - 테스트 계정 공백
    - CI · 자체 실행기 경계
    - 준비 항목 총괄(READY / NEEDS_PREPARATION / VERIFY_WITH_BUSINNECT)
    - 첫 시험 과제 후보 3개 · 추천 1개 · 성공 기준
  - 새 [`docs/development/COLLABORATOR-ONBOARDING-CHECKLIST.md`](docs/development/COLLABORATOR-ONBOARDING-CHECKLIST.md) — Businnect 가 순서대로 실행할 시작 체크리스트(정본 링크만, 규칙 복제 없음).
  - `SETUP.md` §3-1 5단계 · §4: 로컬 DB bootstrap 명령 정정. 기존 `pnpm --filter @o4o/api-server migration:run` 은 `migrate.ts` 가 `.env` 를 읽지 않아 `DB_HOST: MISSING` 으로 실패한다(실측). `npx tsx --env-file=.env src/migrate.ts` 로 바꿨다.
  - `docs/development/COLLABORATOR-START-HERE.md`: 체크리스트 링크 한 줄.

### 핵심 발견

1. **운영 정보 없이 개발은 된다**(새 clone 상태 실측). 설치 · `build:packages`(1분) · 빈 DB bootstrap(baseline + 60 · fingerprint PASS) · API `/health` 200 이 모두 통과했다.
2. **로컬 로그인 계정 공백.**
   - Demo 「테스트 로그인」은 운영 DB 에만 있다.
   - 로컬 이메일 가입은 출처 제한(`SIGNUP_ORIGIN_NOT_ALLOWED`)과 메일 인증에 막힌다.
   - 합성 계정은 격리 심사 환경의 매장 경영자 1개뿐이다.
   - → 로컬 합성 계정 CLI 를 별도 WO 로 제안한다(IR §5-3).
3. **GitHub 경계는 준비돼 있다.**
   - `main` 은 PR + `CI Gate` 필수이고 bypass 가 없다.
   - `deploy/*` 태그는 소유자만 만든다.
   - 배포 job 은 `triggering_actor == owner` 일 때만 열린다.
   - production secret 은 Environment 에만 있다.
4. **Private + 자체 실행기 결정 필요.**
   - Write 협업자의 PR 과 자기 branch 의 새 workflow 가 fork 가 아니어서 집 PC 실행기에서 돈다.
   - 자기 branch 의 새 workflow 는 push 만으로도 돈다.
   - 선택지 ①~③ 은 IR §6-2 에 있다.
5. **Private 전환 시 확인할 것:**
   - 개인 Free 플랜에서 ruleset · Environment 보호가 유지되는지(유지되지 않으면 write 협업자가 main 에 직접 push 할 수 있다)
   - secret scanning · push protection 이 꺼지는지

## PR 로 묶을 단위 (이 branch 전체)

- **묶음 ① 문서**
  - `d388157e`(Core IR) · `7c55c4ff`(Core registry · 문서 정합) · `1e200899` 와 이 commit(합류 준비 IR · 체크리스트 · SETUP 정정) · HANDOFF.md
- **묶음 ② CI · 설정**(§5 · `.github/` · 병합은 통합 담당 판단)
  - `cd6aebf1`(core-paths · `core-change` 라벨 · CODEOWNERS · workflow 3개)
- 순서: ① → ②, 또는 한 PR. ②의 테스트가 ①의 registry 문서 존재를 확인한다.
- 같은 branch 에 두 묶음이 있는 이유: 세션 지정 branch 외 push 금지. 분리 여부는 통합 세션이 정한다.

## 결정 사항 (§9) — 한 일 3

- 시작 체크리스트는 새 문서 1개로 만들었다. 규칙은 복제하지 않고 정본 링크와 「확인」 기준만 둔다. 이름은 계정과 무관하게 다음 합류자에게도 재사용할 수 있도록 `COLLABORATOR-ONBOARDING-CHECKLIST` 로 했다.
- SETUP 명령 정정은 온보딩 문서 보완 범위로 보고 이번에 했다(동작 · 판정 변경 없음, 실측 근거).
  - `migrate.ts` 가 `.env` 를 읽게 고치는 코드 변경은 하지 않았다. migration 도구는 Core(schema) 영역이라 별도 판단으로 넘긴다.
- 첫 과제 추천: 후보 1(Neture 카탈로그 일괄등록 카드 2개 404). 근거가 명확하고 판단할 거리가 없으며, 파일 1개와 테스트 1개다.
  - 관리자 화면이라 로컬 로그인 확인은 테스트로 대신하고, 배포 후 통합 담당이 확인한다.
- 로컬 실측에 PostgreSQL 16(이 컨테이너 설치본)을 썼다. 기준 15 재현은 Businnect 몫으로 남겼다.

## 검증 결과 — 한 일 3

- 실측(이 클라우드 컨테이너 · 운영 정보 0):
  - `pnpm install --frozen-lockfile` 통과
  - `build:packages` exit 0(1분 1초)
  - 빈 DB `npx tsx --env-file=.env src/migrate.ts` → `Migration Job - SUCCESS`
  - 기존 SETUP 명령 실패 재현
  - api `build` 29초
  - `node dist/main.js` → `/health` 200
- 정리: 실측 뒤 API 종료 · 임시 DB 중지 · 로컬 `.env` 삭제. 임시 DB 데이터 폴더(저장소 밖)는 권한상 재귀 삭제가 막혀 컨테이너 회수에 맡겼다.
- `node scripts/check-doc-sensitive.mjs` — 0건.
- GitHub 조회(read-only): 저장소 설정 · ruleset 2개 · 협업자 · CODEOWNERS 오류.

## 확인하지 못한 것 — 한 일 3

- `production` Environment 의 ref 제한 · reviewer, Actions `GITHUB_TOKEN` 기본 권한(이 세션 proxy 가 해당 API 를 막음) → 통합 담당이 설정 화면에서 확인.
- 신규 개발자 PC 의 clone · 설치 · 빌드 · 로컬 API · 서비스 dev server · PostgreSQL 15 · Windows → Businnect 가 체크리스트 §1~§5 로 확인하고 결과를 HANDOFF 로 보고.
- web-neture dev server 기동(이 세션에서는 하지 않음).
- `require_extra_approval_for_unattributed_changes=true` ruleset 항목의 정확한 동작.

## 확정 사항 (2026-11-11 사용자 결정 — 결과 수용) — 한 일 3

1. Businnect 는 신규 원격 공동개발자이며 기존 Write 권한을 유지한다.
2. 초기에는 Businnect 의 PR · branch 코드를 집 PC 자체 실행기에서 실행하지 않는다(IR §6-2 ①).
3. 저장소 Private 전환을 추진한다. 실행 전에 다음을 확인한다.
   - ruleset
   - `production` Environment
   - secret 검사(secret scanning · push protection)
   - Actions 비용
4. 로컬 합성 계정 CLI 는 별도 WO 로 준비한다(IR §5-3). 운영 DB · 실제 개인정보는 쓰지 않는다.
5. Businnect 첫 시험 과제는 IR §7-2 후보 1(Neture 카탈로그 일괄등록 카드 404 수정)로 확정한다. 성공 기준은 IR §7-3 이다.
6. `delivery.yml` 비소유자 수동 실행 시 GCP 인증 진입 문제는 별도 CI 보완 작업으로 분리한다.

**이 결정만으로 실행하지 않는 것:** Private 전환 · 자체 실행기 활성화(`CI_RUNNER_LINUX` 설정 포함) · GitHub 권한 변경 · 운영 배포. 각각 별도 지시와 사전 확인 후에 한다.

### 후속 작업 (각각 별도 WO · 별도 branch)

| # | 작업 | 실행 위치 · 주체 | 비고 |
|---|---|---|---|
| F1 | Private 전환 사전 확인 — 플랜 · ruleset · `production` Environment(ref 제한 · reviewer) · secret scanning · push protection · Actions 비용/예산 차단 · `GITHUB_TOKEN` 기본 권한 | 통합 담당(설정 화면 · read-only) | IR §2 · §1 표의 VERIFY 항목. 전환 실행은 그 뒤 별도 결정 |
| F2 | 자체 실행기 기준 문서에 「Write 협업자 코드는 초기 미실행」 반영 · 선택식 보완 검토 | CI 정비 트랙 | `O4O-SELF-HOSTED-CI-RUNNER-V1`(DRAFT) §6 · §9. 이번에 문서 · workflow 는 바꾸지 않았다 |
| F3 | 로컬 합성 계정 provision CLI | 클라우드 작업 세션 | IR §5-3. loopback · 표식 DB 전용, 기본 dry-run, 3역할 |
| F4 | `delivery.yml` classify 소유자 조건 | CI 정비 트랙(§5 위험 변경 · 통합 담당 병합 판단) | IR §1-1 |
| F5 | Businnect 첫 과제 | Businnect 작업 branch → 통합 세션 PR | IR §7-3 성공 기준. 배포 후 관리자 화면 클릭 확인은 통합 담당 |

## 겹칠 수 있는 열린 PR — 한 일 3

이 commit 직전 조회에서 겹치는 열린 PR 은 없다. `SETUP.md` 는 여러 작업이 자주 바꾸는 파일이다.

## 문서 정합 — 한 일 3

`발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건`

- 발견 1: AGENTS.md §4-1(e) ruleset 기록값 「admin bypass 가능」 ↔ 현재 bypass_actors 없음. 보고만 한다.
- 발견 2: SETUP migration 명령 오류. 정정했다.
- WO 제안: 로컬 합성 계정 CLI, 자체 실행기 × 협업자 결정.

---

## 한 일 2 — WO-O4O-CORE-OWNERSHIP-AND-CHANGE-BOUNDARY-V1 (2026-11-11 사용자 지시)

IR(아래 「한 일 1」)을 바탕으로 Core 소유권 · 변경 경계를 정비했다. 실행 코드 · DB · 배포 · ruleset 변경은 없다.

1. `7c55c4ff` docs(core) — 문서
   - 새 정본 [`docs/baseline/O4O-CORE-REGISTRY-V1.md`](docs/baseline/O4O-CORE-REGISTRY-V1.md):
     - Core 의 현행 정의 · 실제 위치
     - A/B/C 등급(파일 · 모듈 단위)
     - `core-change` 라벨 · CODEOWNERS 표시 방법
     - 과거 Freeze 결정은 보존
   - 상충 정비:
     - `CLAUDE.md` §3 · `docs/baseline/core-boundary.md` 의 패키지 4개 「동결 Core」 목록을 registry 로 대체했다. `auth-core` 는 소비처 0 이다. 네 패키지는 B 등급이고 WO 규칙도 유지한다.
     - `O4O-CORE-FREEZE-V1` 상단에 현행 위치 안내 한 줄을 넣었다(본문 보존).
     - `CANONICAL-INDEX` §2 에 행을 추가했다.
     - `AGENTS.md` §5 · §7 에 registry 링크를 넣었다.
   - `docs/development/COLLABORATOR-START-HERE.md`:
     - §5-1 「일반 개발과 Core 계약 변경」을 추가했다.
     - 작업 흐름을 AGENTS.md §4-1(e)(push · 인계까지, PR 은 통합 세션)에 맞췄다.
2. `cd6aebf1` ci(core) — 자동화 · CODEOWNERS
   - `scripts/ci/core-paths.mjs`: B 경로 단일 목록(64개, 모두 실제 존재) + 판정 함수.
   - 기존 `automation-pr-overlap.yml` · `scripts/ci/pr-overlap.mjs` 를 재사용했다.
     - Ready PR 의 파일을 B 목록과 대조해 `core-change` 라벨을 달고 뗀다.
     - 표시만 하고 `CI Gate` needs 에 없다. 라벨 API 실패는 로그만 남긴다.
     - workflow 변경은 sparse-checkout 1줄 · 주석뿐이고 권한은 그대로다.
   - `.github/CODEOWNERS`:
     - 존재하지 않는 조직 팀(`@o4o-platform/*-team`)을 지정하던 내용을 걷어 냈다(GitHub 판정 Unknown owner 15건).
     - 확인된 계정(통합 담당 `@Renagang21`)만 B 경로 · `/.github/workflows/` · CODEOWNERS 자체에 지정했다.
     - 전체(`*`) 기본 소유자는 두지 않는다.
   - 회귀 테스트:
     - `scripts/ci/__tests__/core-paths.test.mjs`(신규): 형식 · 경로 존재 · CODEOWNERS 일치 · 판정.
     - `pr-overlap.test.mjs`: 라벨 추가 · 유지 · 제거 · API 실패 시 계속.
     - CI node:test 목록에 추가했다(`ci-pipeline.yml` 1줄).
   - `automation-repo-setup.yml` 라벨 목록에 `core-change` 를 추가했다(색 · 설명. 수동 실행용).

## PR 로 묶을 단위 (한 일 2 시점 — 위 「이 branch 전체」 표가 최신)

AGENTS.md §4-1(e) 「묶음 단위」는 CI · workflow 변경을 별도 PR 로 분리한다. 이 branch 하나에 두 묶음이 있으므로, 통합 세션이 분리 여부를 정한다. 별도 branch 를 만들지 않은 이유: 세션 지정 branch 외 push 금지.

- **묶음 ① 문서**
  - `d388157e`(IR) + `7c55c4ff`(registry · 문서 정합) + 이 HANDOFF.md
- **묶음 ② CI · 설정** — §5 위험 변경 · `.github/` 라 병합은 통합 담당이 판단
  - `cd6aebf1`(core-paths · pr-overlap 라벨 · CODEOWNERS · workflow 3개)
  - ②의 테스트(`core-paths.test.mjs`)는 ①의 registry 문서 존재를 확인한다. 따라서 ①을 먼저 병합하거나 둘을 한 PR 로 낸다.

## 결정 사항 (§9)

- **CODEOWNERS 소유자:** GitHub 협업자는 `Renagang21`(admin) · `Businnect`(write) 두 계정이다. 역할 정의가 확인된 계정은 통합 담당뿐이라 `@Renagang21` 만 지정했다. `Businnect` 는 지정하지 않았다(WO: 확인되지 않은 계정 임의 등록 금지 — 소유 범위는 사용자 결정).
- **라벨 위치:** 새 workflow 를 만들지 않고 기존 PR 겹침 자동화에 붙였다.
  - 그 자동화가 이미 PR 파일 목록 · `issues: write` 권한을 가지고 있다.
  - 실행 정책(Ready 만 · fork 제외 · gate 아님)도 같다.
  - `.github/labeler.yml` 은 이를 읽는 workflow 가 없는 죽은 설정이라 쓰지 않았다(정리는 범위 밖).
- **목록 일치 강제:** `core-paths.mjs` · CODEOWNERS · registry 표가 어긋나지 않도록 테스트가 경로 존재와 CODEOWNERS 일치를 확인한다. 파일을 옮기면 테스트가 실패해 목록 갱신을 강제한다.
- **C 등급:** 분리하지 않고 B 로 관리한다(registry §3-4).

## 검증 결과

- CI 와 같은 node:test 목록 25개 파일 — 492 pass / 0 fail(신규 `core-paths.test.mjs` 5 · `pr-overlap.test.mjs` 10 포함).
- `node scripts/check-doc-sensitive.mjs` — 0건.
- `node scripts/ci/check-agent-config.mjs` — PASS.
- 바꾼 workflow 3개 YAML 파싱 — 통과.
- **GitHub CODEOWNERS 판정**(`repos/Renagang21/o4o-platform/codeowners/errors`, read-only): main **15건** → 이 branch **0건**.

## 확인하지 못한 것

- **실제 PR 에서 `core-change` 라벨이 붙는지(라이브):** 작업 세션은 PR 을 만들지 않아 확인하지 못했다.
  - 이 묶음의 PR 이 Ready 가 되면 그 PR 의 `PR Overlap Notice` 로그에 `core-change: absent` 가 나와야 한다. 이 PR 은 B 경로를 바꾸지 않는다.
  - 이후 B 경로를 바꾸는 첫 PR 에서 라벨이 붙는지 통합 세션이 확인한다.
- **라벨 자동 생성:** 저장소에 `core-change` 라벨이 아직 없다(조회 확인). 첫 부착 때 GitHub 가 만든다는 동작에 기대고 있다. 실패하면 로그에 `core-change: error` 가 남고 겹침 알림은 계속된다. 그때는 `automation-repo-setup.yml` 을 수동 실행해 라벨을 먼저 만든다(라벨 생성은 GitHub 설정 변경이라 실행하지 않았다).
- **CODEOWNERS 리뷰 요청:** PR 작성자 본인에게는 요청이 가지 않는다. 통합 세션이 통합 담당 계정으로 PR 을 만들면 리뷰 요청은 사실상 생기지 않고 라벨이 주 표시가 된다.
- **ruleset code owner review 필수화:** 변경하지 않았다(WO 제외 범위). 개인 소유 Private 저장소에서의 플랜 조건도 미확인이다.

## 결정 필요 (통합 담당 · 사용자)

1. ~~`Businnect` 계정을 CODEOWNERS 의 어느 경로 소유자로 둘지~~ — 2026-11-11 WO-O4O-REMOTE-COLLABORATOR-ONBOARDING-V1 에서 「지정하지 않음 · 필수 리뷰 강제 없음」으로 확정
2. B 변경에 ruleset code owner review 를 필수로 켤지
3. IR §11 의 나머지 항목: 공동개발자 전체 읽기 허용 · `organizations` 이중 매핑 · 원장 정리 · Skill 설계 위치

## 겹칠 수 있는 열린 PR

- 조회 시점에 확인한 결과 겹치는 PR 은 없다. 통합 세션이 PR 을 만들 때 다시 확인한다.
- `scripts/ci/pr-overlap.mjs` 와 `ci-pipeline.yml` 은 CI 작업이 자주 바꾸는 파일이다.

## 문서 정합

`발견 12건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건`
- 발견은 IR §5 와 같다.
- 이번 WO 에서 그중 「동결 Core」 정의 상충(CLAUDE.md §3 · core-boundary ↔ CORE-FREEZE)을 정비했다. 대체가 아니라 현행 안내를 추가했으므로 SUPERSEDED 표기는 하지 않았다.
- 나머지 11건(RBAC-FREEZE · USER-OPERATOR · NETURE-DISTRIBUTION · CHECKOUT-V2 · STORE-LAYER · APP-LMS · CONTENT-STABLE 등 경로 · 서술 drift, `.github/labeler.yml` 죽은 설정 포함)은 범위 밖이라 보고만 한다. 별도 문서 정합 WO 를 제안한다.

---

## 한 일 1 — O4O Core 중앙화 · 원격 공동개발 접근 경계 조사 (2026-11-11 사용자 지시)

이 branch 의 이전 PR Renagang21/o4o-platform#1002(배포 차단 훅 로컬 ask)는 병합됐다. 그래서 같은 branch 이름을 최신 `origin/main` 에서 다시 시작했다. 이 branch 의 PR 은 **미생성**이다(PR 은 통합 세션이 만든다 — AGENTS.md §4-1(e)).

- 새 문서 [`docs/investigations/IR-O4O-CORE-CONSOLIDATION-V1.md`](docs/investigations/IR-O4O-CORE-CONSOLIDATION-V1.md) 하나를 추가했다.
- 조사 전용이다. 코드 · DB · CI · 배포 · GitHub 설정과 기준 문서는 바꾸지 않았다.
- 핵심 결론:
  - 실제 Core 는 api-server 안에 있다. `packages/*-core` 는 이름과 실제가 다르고, 소비처 0 패키지가 9개다.
  - 최상위 `core/` 이동은 비권장이다.
  - Core registry 문서 + CODEOWNERS · `core-change` 라벨로 경계를 표시하는 것을 권한다. 그다음 잔재 제거와 중복 일원화를 하고, api-server `src/core/` 이동은 선택으로 둔다.
  - C(소스 분리)는 지금 하지 않고, 필요하면 프롬프트 · 정책 값의 외부화를 먼저 검토한다.

