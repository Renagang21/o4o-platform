# CHECK-O4O-PRODUCTION-SECRET-ENVIRONMENT-MIGRATION-AND-COLLABORATOR-SAFETY-CLOSURE-V1

> **WO**: WO-O4O-PRODUCTION-SECRET-ENVIRONMENT-MIGRATION-AND-COLLABORATOR-SAFETY-CLOSURE-V1
> **일자**: 2026-10-02
> **선행**: [CHECK-O4O-PUBLIC-COLLABORATOR-PRODUCTION-BOUNDARY-AND-MAIN-PROTECTION-CLOSURE-V1](CHECK-O4O-PUBLIC-COLLABORATOR-PRODUCTION-BOUNDARY-AND-MAIN-PROTECTION-CLOSURE-V1.md) ·
> [CHECK-O4O-GITHUB-ACTIONS-GCP-WIF-CUTOVER-V1](CHECK-O4O-GITHUB-ACTIONS-GCP-WIF-CUTOVER-V1.md)
> **값 기록 0** — 이 문서 · 터미널 · 로그 어디에도 secret 값 · hash · fingerprint 를 적지 않았다(이름 · scope · 판정만).

---

## 0. 최종 판정

```text
PRODUCTION_SECRET_ENVIRONMENT     = PASS
ENVIRONMENT_SECRET_COUNT          = 7
REPOSITORY_PRODUCTION_SECRET      = 0
LEGACY_DB_PASSWORD_REPO_SECRET    = 0
LEGACY_E2E_REPO_SECRET            = 0
REPOSITORY_SECRET_TOTAL           = 0   (dependabot 0 · staging environment 0)
DEPLOY_AUTO_SECRET_REFERENCE      = 0   (WIF 전환으로 이미 0 · deploy-auto 는 WIF 허용 workflow 목록 밖)
README_SECRET_STATE               = MATCH
GCP_DB_PASSWORD_USAGE             = UNUSED (repository) — runtime source = Secret Manager o4o-db-password
E2E_SECRET_USAGE                  = UNUSED (Google-only 재정의로 소비 제거 · 재도입 차단 grep 존재)
COLLABORATOR_SECRET_ESCAPE_PATH   = CLOSED
DEPLOY_FREEZE_FINAL               = TRUE
PRODUCTION_DEPLOY                 = 0
SAFE_TO_ACCEPT                    = YES
```

---

## 1. 시작 시점 재조사 (WO 발행 이후 변화)

- 다른 세션의 WIF 전환(`5b5d65bc6` · `c8b9ff4bf`)으로 `GCP_SA_KEY` repository secret 은 **이미 삭제**, GCP 인증은 OIDC → WIF. 이전 대상은 WO 의 8개 → **7개**.
- `deploy-auto.yml` 의 secret 참조도 이미 0(WIF auth step 만 있고, provider 조건의 허용 workflow 목록 밖이라 인증 불가).
- main CI: `5245da862` 에서 API Jest 3 shard 포함 GREEN (Demo role 계약 정합 후).

## 2. Production credential 사용 범위

| secret | Cloud Run env (`o4o-core-api`) | 참조 job | 경계 |
|---|---|---|---|
| `GCP_DB_NAME` · `GCP_DB_USERNAME` | `DB_NAME` · `DB_USERNAME` (+ migration Job) | `deploy-api.yml` `build-and-deploy` | `environment: production` |
| `GCP_JWT_SECRET` | `JWT_SECRET` · `JWT_REFRESH_SECRET` | 同 | 同 |
| `SMTP_USER` · `SMTP_PASS` | 同名 | 同 | 同 |
| `GEMINI_API_KEY` · `OPENAI_API_KEY` | 同名 | 同 | 同 |
| (`TOSS_PAYMENTS_*` 2) | optional env — 미등록 · 변화 없음 | 同 | 同 |

- `production` Environment 배포 정책: `branch main` · `tag deploy/*` 만 (그 외 ref 에서 environment job 불가).
- WIF provider 조건: repository_id · owner_id · `environment == production` · ref(main · deploy/*) · event(workflow_run · workflow_dispatch[소유자 actor 만]) · 허용 workflow(delivery · deploy-api · deploy-admin · deploy-web-services · gcp-wif-auth-smoke).

## 3. 복구 source 조사 (값 출력 0)

7개 모두 **SOURCE_FOUND** — Cloud Run `o4o-core-api` serving revision `o4o-core-api-03795-don`(traffic 100% · `o4o-commit-sha=5245da862` · 2026-10-02 13:34Z)의 plain env.
그 revision 은 deploy-api workflow 가 배포 때마다 GitHub secret 에서 주입했고, 7개 repository secret 의 최종 수정(2025-12-25 ~ 2026-09-09)이 그 배포보다 앞선다.
`DB_NAME` · `DB_USERNAME` 은 migration Job `o4o-api-migrations` 에도 있다. Secret Manager 에는 7개 중 0(존재: `o4o-db-password` · `o4o-encryption-key` · `cafe24-client-*`).
로컬 `apps/api-server/.env`(미추적) 는 일부 키가 있으나 운영 값 일치를 확인할 수 없어 source 로 쓰지 않는다.

## 4. 검증 수단 — `production-secret-resolution-check.yml` (`cb19c56b9`)

- 수동 · 두 job 모두 소유자만 · 배포 · GCP · DB 접근 0 · `permissions: contents: read`.
- `repository-scope` job: environment 없음 = collaborator branch workflow 와 같은 시야.
- `environment-scope` job: `environment: production`. GitHub 는 environment secret 이 없으면 repository 값으로 fallback 하므로 판정은 이름 census 와 함께 읽는다.
- 값 일치는 각 job 안의 sha256 앞 6자 fingerprint 비교(오타 검출용). 원문은 마스킹되며, 공개 저장소라 6자 요약이 step 헤더에 보인다 — 사용자에게 고지함.
- 계약 시험: `deploy-workflow-gates.test.mjs` "Production secret resolution check — 값 노출 0" (3건).

## 5. 실행 기록

| 단계 | run | 결과 |
|---|---|---|
| 기준선 (environment 비어 있음) | `37016480522` | success · repository PRESENT 7 · production job 7 resolve(fallback) · MATCH 7 |
| 사용자 environment 등록 7 → 이름 census | — | production: 7 (`GCP_DB_NAME` · `GCP_DB_USERNAME` · `GCP_JWT_SECRET` · `SMTP_USER` · `SMTP_PASS` · `GEMINI_API_KEY` · `OPENAI_API_KEY`) |
| 등록 직후 검증 | `37019673091` | success · PRESENT 7/7 · **MATCH 7/7** (`GCP_JWT_SECRET` 포함) · DIFF 0 |
| 사용자 승인 → repository 사본 7 삭제 | — | 이름 census: 7 ABSENT |
| 삭제 후 검증 | `37019897500` | success · environment 밖 ABSENT 7/7 · production job PRESENT 7/7 |
| 사용자 승인 → `GCP_DB_PASSWORD` · `E2E_*` 6 삭제 | — | repository secret **0** · production 7 · staging 0 · dependabot 0 |
| 최종 검증 | `37021315286` | success · environment 밖 ABSENT 7/7 · production job PRESENT 7/7 |

삭제한 것은 **GitHub repository secret 사본 14개뿐**이다. 변경하지 않은 것: Secret Manager(`o4o-db-password` 포함) · Cloud Run 설정 · 실제 E2E/관리자 계정 · 사용자 비밀번호 · `production` Environment 7개 · `DEPLOY_FREEZE`.

## 6. Collaborator 경로 재판정

write collaborator 가 feature branch 에 workflow 를 추가했을 때:

| 경로 | 결과 |
|---|---|
| repository secret 읽기 | **0개** — 읽을 것이 없다 (최종 검증 environment 밖 ABSENT 7/7) |
| `environment: production` job 실행 | branch 정책(main · deploy/*)으로 거부 |
| GCP 인증(OIDC → WIF) | provider 조건(environment · ref · 허용 workflow · 소유자 dispatch)으로 거부 |
| main 에 workflow 반영 | main ruleset(직접 push 차단) — 선행 CHECK |
| `deploy/*` tag 생성 | owner/admin 전용 — 선행 CHECK |

→ `COLLABORATOR_SECRET_ESCAPE_PATH = CLOSED`. 이 경계는 **repository secret 을 다시 만들지 않는 한** 유지된다(SECRETS_SETUP 에 규칙 명시).

## 7. 문서 정합

| 파일 | 변경 |
|---|---|
| `.github/SECRETS_SETUP.md` | 이행 상태 = 완료(environment 7 · repository 0) · 신규 credential 은 environment 에만 · `GCP_DB_PASSWORD` · `E2E_*` → 은퇴 항목(삭제 · runtime source) · 보안 주의 2 갱신 · TOSS optional 서술 정정 |
| `.github/workflows/README.md` | environment secret 서술을 실제 상태로 · resolution check 안내 |
| `e2e/auth-runtime/playwright.config.ts` | 은퇴한 email/password 환경변수 안내 주석 제거 — 이 주석이 `e2e-auth-runtime.yml` 의 재도입 차단 grep 에 걸려 **수동 E2E workflow 가 실행 즉시 실패하는 상태**였다(매치 3 → 0) |
| `.github/workflows/e2e-auth-runtime.yml` | "남은 secret 은 삭제하지 않는다" 주석 → 삭제 완료 사실로 (주석만) |

## 8. 다음 (순서 분리 — 같은 단계에서 하지 않는다)

```text
1. Businnect 초대 수락
2. 실제 collaborator 계정 권한 smoke
   - main direct push 차단 · deploy/* tag 생성 차단 · manual production deploy 차단 · production Environment 접근 차단
3. PASS 후 DEPLOY_FREEZE=false 검토
```

`문서 정합: 발견 3건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건`
