# CHECK — Public collaborator production 경계 · main 보호 closure

> WO: `WO-O4O-PUBLIC-COLLABORATOR-PRODUCTION-BOUNDARY-AND-MAIN-PROTECTION-CLOSURE-V1`
> 대상: `WO-O4O-PUBLIC-COLLABORATOR-PRODUCTION-BOUNDARY-AND-MAIN-PROTECTION-V1` 의 결과 `1ce41d5c0` 와 GitHub 설정
> 일시: 2026-10-02
> 방식: read-only 실측. GitHub API · workflow 정적 검토. secret 은 **이름만** 조회했고 값은 조회 · 출력하지 않았다. 설정 변경은 0이다.
> 결과: **PARTIAL — DO NOT ACCEPT YET**. production credential 이 아직 repository secret 이다.

## 1. 실측 결과

| # | 항목 | 실측 | 판정 |
|---|---|---|---|
| 1 | `1ce41d5c0` CI | CI Pipeline **failure**: API Server Jest 2/3 `demo-account-provision.contract.test.ts` "Demo 는 platform 역할이나 role_assignments 를 만들지 않는다". 보안 변경과 무관하다(§2). CodeQL · Delivery success | 보안 변경 PASS · main CI 는 별도 결함 |
| 2 | main PR 필수 | ruleset `main-collaborator-pr-required` (active, `~DEFAULT_BRANCH`): pull_request(approvals 1 · dismiss stale · 미승인 변경 추가 승인) · non_fast_forward · deletion. status check 는 DEFER(원 WO 대로) | PASS |
| 3 | owner bypass 범위 | 두 ruleset 모두 bypass = `RepositoryRole` id 5 (Admin) · always. collaborator 는 Admin 이 아니다. 소유자 push 는 bypass 로 통과됨(실측: `ca48caaf8` push 에서 "Bypassed rule violations … pull request") | PASS |
| 4 | collaborator main 직접 push | Businnect 초대 = `write`, **미수락**(collaborators 목록에 owner 만 있음). write 역할은 bypass 대상이 아니므로 ruleset 이 막는다 | PASS (설정 기준 · 실 계정 시험 불가: 초대 조작 금지) |
| 5 | collaborator 수동 production deploy | deploy-api/admin/web `ci-gate` 가 `workflow_dispatch` 일 때 `triggering_actor == repository_owner` 인 경우만 연다. promote(workflow_call) 경유도 event 가 workflow_dispatch 라 같은 조건이 적용된다. `DEPLOY_FREEZE` 변수 수정은 Admin 전용이다 | PASS (정적 검토) |
| 6 | owner break-glass | 소유자 dispatch 는 ci-gate 를 통과한다. 단 이번 break-glass(run 36976702838)는 `1ce41d5c0` **이전** 정의로 실행됐다. 새 정의로 실행된 소유자 dispatch 는 아직 없다 | PASS (정적) · 실행 실측 0 |
| 7 | deploy 태그 제한 | ruleset `deploy-tags-owner-only` (active, `refs/tags/deploy/*`): creation · update · deletion · non_fast_forward, bypass = Admin. 실측: 소유자 tag push 가 bypass 로 통과("creations being restricted") | PASS |
| 8 | delivery 자동 경로 | classify · report 에 `environment: production`. production environment 의 배포 ref = branch `main` · tag `deploy/*`. workflow_run(main push CI) 경로는 actor 와 상관없이 유지된다. `1ce41d5c0` · `ca48caaf8` Delivery success | PASS |
| 9 | DEPLOY_FREEZE | 모든 배포 job 의 `if:` 첫 조건이 `vars.DEPLOY_FREEZE == 'false'` (fail-closed). 변수 위치는 repository variable. 현재 `true` | PASS |
| 10 | promote ↔ 수동 deploy 경계 | promote 는 `secrets: inherit` 로 deploy workflow 를 호출하고, 실제 배포 여부는 각 ci-gate 의 owner 조건과 freeze 가 정한다. promote 의 판정 거부(UNKNOWN/L3)는 그대로 유지된다. 충돌 없음 | PASS |
| 11 | **production credential 위치** | production environment secret **0개**. `GCP_SA_KEY` · `GCP_DB_PASSWORD` · `GCP_DB_USERNAME` · `GCP_DB_NAME` · `GCP_JWT_SECRET` · `OPENAI_API_KEY` · `GEMINI_API_KEY` · `SMTP_*` · `E2E_*_ADMIN_*` 가 전부 **repository secret** 이다 | **GAP** |
| 12 | 기타 | Actions 기본 `GITHUB_TOKEN` = read · PR 승인 불가 · fork PR 승인 = first_time_contributors. `deploy-auto.yml` 은 environment 없이 `GCP_SA_KEY` 를 참조하지만 job 이 `if: false` 라 실행되지 않는다 | PASS (관찰) |

## 2. CI failure 원인 (범위 밖 · 보고만)

- 실패 테스트는 `apps/api-server/src/scripts/__tests__/demo-account-provision.contract.test.ts` ⑥ "Demo 는 platform 역할이나 role_assignments 를 만들지 않는다" 이다.
- 시작점은 `4a3f1335d` (Demo provision CLI 에 service-scoped role 단계 추가, WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1). 이 커밋의 CI 도 failure 다.
- 그 뒤 docs-only 커밋(`61a3047aa` · `6a46763f2` · `370f8d75a` · `21a413fde` · `ca48caaf8`)은 API Jest 가 path 필터로 skip 되어 green 으로 보였다. `1ce41d5c0` 은 scripts/ci 테스트를 바꿔 Jest 가 실행됐고, 그래서 실패가 드러났다.
- 의미: 다음 API 관련 commit 은 이 테스트가 고쳐질 때까지 CI red → Delivery `BLOCKED_CI` 가 된다. 테스트를 고칠지, Demo role 정책 계약을 갱신할지는 Demo WO 소관이다.

## 3. GAP — repository secret 노출 경로

- repository secret 은 같은 저장소의 **모든 branch** 에서 도는 workflow 가 받는다.
- 따라서 write collaborator 는 main 이 아닌 branch 에 workflow 를 추가해 push 하는 것만으로 `GCP_SA_KEY` · DB password · JWT secret 을 받을 수 있다. 이는 ruleset(main 한정)과 ci-gate owner 조건(배포 workflow 한정)으로 막히지 않는다.
- environment secret 으로 옮기면 해당 secret 은 `main` · `deploy/*` ref 의 `environment: production` job 에서만 나온다. 그래야 원 WO 의 목표 경계가 완성된다.
- 이 이전은 secret **값**을 다시 입력해야 하므로 소유자 조치다. 원 WO 규칙상 값은 출력하지 않고, 복사 즉시 repository 사본을 삭제하지 않는다. Claude 세션은 수행하지 않았다.

권장 순서 (소유자, 초대 수락 전):

1. `gh secret set <NAME> --env production`. GitHub UI 의 environment secret 입력도 된다. 대상은 deploy workflow 가 쓰는 이름 전부다. environment secret 은 같은 이름의 repository secret 보다 우선한다.
2. 검증: 다음 Delivery run 의 classify(`GCP_SA_KEY` 사용)가 success 인지 본다. DB · JWT · SMTP · AI key 는 다음 API 배포의 verified rollout 에서 확인된다. 실패해도 traffic 은 전환되지 않는다.
3. 검증 후 repository 사본을 삭제한다. 워크플로가 쓰지 않는 `E2E_*_ADMIN_*` 는 이전할지 삭제할지 소유자가 판단한다.
4. 1–3 이 끝나면 이 CHECK 의 #11 을 다시 실측하고 SAFE_TO_ACCEPT 를 판정한다.

## 4. 판정

```text
SECURITY_COMMIT_1ce41d5c0           = 변경 내용 PASS · CI failure 는 무관 결함(4a3f1335d 기원)
MAIN_RULESET                        = PASS
OWNER_BYPASS_SCOPE                  = PASS (Admin role 만)
COLLABORATOR_MAIN_PUSH_BLOCKED      = PASS (설정 기준)
COLLABORATOR_MANUAL_DEPLOY_BLOCKED  = PASS (ci-gate owner 조건 · 정적)
OWNER_BREAK_GLASS                   = PASS (정적 · 새 정의 실행 실측 0)
DEPLOY_TAG_RESTRICTION              = PASS
DELIVERY_AUTO_PATH                  = PASS
DEPLOY_FREEZE_EMERGENCY_STOP        = PASS (현재 true)
PROMOTE_MANUAL_BOUNDARY_CONFLICT    = 없음
PRODUCTION_SECRET_ISOLATION         = GAP (environment secret 0 · repository secret 유지)
COLLABORATOR_INVITE                 = PARTIAL — DO NOT ACCEPT YET
DEPLOY_FREEZE                       = true (변경 없음)
```
