# CHECK — GitHub Actions GCP 인증 WIF 전환 (WO-O4O-GITHUB-ACTIONS-GCP-WIF-CUTOVER-V1)

- 일자: 2026-10-02
- 판정: **WIF_CUTOVER_COMPLETE** (GCP 인증 경로 한정 — 다른 repository secret 의 collaborator 노출은 별도 · 아래 §8)
- 코드 commit: `5b5d65bc6` (workflow 14 auth step · smoke workflow · 계약 테스트)
- production deploy 0 · Cloud Run revision 변경 0 · DB write 0 · runtime secret 변경 0 · `DEPLOY_FREEZE=true` 유지

## 1. 시작 상태

- repository Public · `main` ruleset(PR 필수) · `deploy/*` tag ruleset · collaborator = 소유자 1 · Businnect 초대 pending(write)
- `production` environment: deployment ref = `main` branch · `deploy/*` tag · environment secret 0
- `GCP_SA_KEY` = **repository secret** (environment secret 아님) · 대상 SA `github-actions@netureyoutube.iam.gserviceaccount.com` user-managed key 1개(2025-12-25 생성)
- GCP WIF pool 0 · SA IAM policy 비어 있음

## 2. `GCP_SA_KEY` 사용 census (HEAD `9573df5b3`)

| 위치 | auth step | 분류 |
|---|---|---|
| `delivery.yml` classify · report | 2 | ACTIVE (`environment: production`) |
| `deploy-api.yml` build-and-deploy | 1 | ACTIVE (workflow_call · 소유자 dispatch) |
| `deploy-admin.yml` deploy | 1 | ACTIVE |
| `deploy-web-services.yml` deploy-* | 9 | ACTIVE |
| `deploy-auto.yml` decide-and-deploy | 1 | RETIRED (`if: false` · environment 없음) |
| `.github/SECRETS_SETUP.md` · `README.md` · checks/investigations | – | DOCUMENTATION_ONLY |
| composite action · scripts | 0 | – |

전부 `google-github-actions/auth@v3` + `credentials_json`. credential 파일 내용에 의존하는 step(`client_email` 파싱 · `print-identity-token` 등) 0 — `gcloud auth configure-docker` 만.

## 3. WIF 구성

- pool `github-actions` · provider `o4o-platform` (`projects/117791934476/locations/global/workloadIdentityPools/github-actions/providers/o4o-platform`) · issuer `https://token.actions.githubusercontent.com`
- `sts.googleapis.com` 활성화 (WIF 토큰 교환 필수 · 이전 비활성)
- attribute mapping: `google.subject=sub` · `repository_id` · `repository_owner_id` · `ref` · `environment` · `event_name` · `actor_id` · `job_workflow_ref`
- attribute condition (전부 AND):
  - `repository_id == 964347291` · `repository_owner_id == 173977471` · `repository == Renagang21/o4o-platform`
  - `environment == production`
  - `ref == refs/heads/main` 또는 `refs/tags/deploy/*`
  - `event_name ∈ {workflow_run, workflow_dispatch}` · `workflow_dispatch` 는 `actor_id == 173977471`(소유자)
  - `job_workflow_ref` ∈ `{delivery, deploy-api, deploy-admin, deploy-web-services, gcp-wif-auth-smoke}.yml @ refs/heads/main | refs/tags/deploy/*`
- SA binding: `roles/iam.workloadIdentityUser` → `principalSet://…/github-actions/attribute.repository_id/964347291` (SA 리소스 한정). SA 프로젝트 역할 7개 무변경.

## 4. §12 검토 — repository 조건만으로는 부족하다

repository 조건만이면 write collaborator 가 같은 repository branch 에 workflow 를 만들어 SA 를 impersonate 할 수 있다. 추가 경계:

| 경로 | 차단 수단 |
|---|---|
| collaborator branch workflow (environment 없음 · 다른 environment) | provider `environment` · `ref` 조건 (실측 거부) |
| collaborator branch workflow + `environment: production` | GitHub environment deployment ref 제한 (실측 거부) |
| 허용 workflow 파일명을 branch 에서 수정 | `ref` · `job_workflow_ref` 가 branch ref → 거부 (실측) |
| collaborator 가 main 에서 `delivery.yml` / `promote.yml` dispatch (임의 `target_sha` checkout 후 그 commit 의 스크립트를 credential 과 함께 실행 — **기존 `GCP_SA_KEY` 구조에도 있던 경로**) | provider `workflow_dispatch → actor_id == 소유자` (정적) |
| main 직접 변경 | `main` ruleset (PR + 소유자 승인) |
| `deploy/*` tag 생성 | tag ruleset (소유자만) |
| fork PR | repository_id · environment · ref 불일치 + fork 는 OIDC token 미발급 |
| `workflow_run` 위장 (다른 branch · tag 이름 `main`) | Delivery `branches: [main]` + `event == push` · CI push trigger 는 `main` · `develop` branch 만 (tag 미반응) |

## 5. 실측

| 검증 | 결과 |
|---|---|
| smoke `gcp-wif-auth-smoke.yml` dispatch (secret 삭제 전) run 37008152272 | **WIF_AUTH_PASS** — active account = github-actions SA · project · serving revision read |
| Delivery workflow_run classify (실제 canonical 경로) run 37008855183 | WIF 인증 success · `BLOCKED_DEPLOY_FREEZE` · 배포 job 전부 skip |
| negative probe (임시 branch `wif-negative-probe` · 허용 파일명 수정 · push) run 37008280376 | no-environment · staging → `unauthorized_client: rejected by the attribute condition` · production → "Branch not allowed to deploy to production". branch 삭제 완료 |
| smoke (repository secret 삭제 후) run 37009311107 | WIF_AUTH_PASS |
| smoke (SA key 폐기 후) run 37009470498 | WIF_AUTH_PASS · token 패턴 scan 0 |
| reusable deploy job(deploy-api · web · admin) 실제 인증 | **미실측** — 배포가 필요하므로 금지. 정적 근거: workflow_call 의 `job_workflow_ref` = 호출된 파일 @ main, `environment: production`, `event_name` = 호출자(workflow_run · 소유자 dispatch) |

## 6. 폐기

- repository secret `GCP_SA_KEY` 삭제 — repository · production · staging 모두 0
- SA user-managed key `84c1d339…` 삭제 (삭제 직전 목록 = 그 1개뿐) — 잔존 user-managed key **0**

## 7. 계약 · CI

- `scripts/ci/__tests__/deploy-workflow-gates.test.mjs`: GCP_SA_KEY · credentials_json 0 · 모든 auth step 같은 provider/SA · auth job `id-token: write` · auth job `environment: production` · smoke workflow 수동/소유자/read-only. 로컬 68/68 · CI Code Quality Check success.
- CI Pipeline `5b5d65bc6` = failure — `API Server Jest (2/3)` 의 `demo-account-provision.contract.test.ts` 1건(다른 작업 `b16a28372` · "role_assignments 를 만들지 않는다" 단언). `.github` 변경으로 full Jest 가 돌며 드러난 기존 실패 — 이번 변경과 무관, 미수정(별도 WO).

## 8. 남은 것 · STOP finding

- **다른 production secret 은 여전히 repository secret 이다**: `GCP_JWT_SECRET` · `SMTP_USER/PASS` · `GEMINI_API_KEY` · `OPENAI_API_KEY` · `GCP_DB_USERNAME/NAME` · `GCP_DB_PASSWORD`(미참조) · `E2E_*_ADMIN_*`(미참조). write collaborator 는 branch workflow 로 이 값을 받을 수 있다 — 특히 JWT secret 은 운영 토큰 위조로 이어진다. WIF 는 GCP 인증 경로만 닫았다. collaborator 초대 전 environment secret 이전 또는 Secret Manager 이전 + repository 사본 삭제가 필요하다.
- runtime secret Secret Manager 이전 · github-actions SA 최소 권한 재설계 · `staging` environment(보호 없음) 정리 · 문서 내 평문 정리 — 별도 WO.
