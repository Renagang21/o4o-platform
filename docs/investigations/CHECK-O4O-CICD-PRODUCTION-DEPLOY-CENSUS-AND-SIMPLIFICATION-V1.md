# CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1

> **WO**: WO-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1 (조사 · 설계 전용)
> **기준**: `origin/main` = `cd8c7ab3e` (2026-09-30) · GitHub 설정 · Actions run 이력 · Cloud Run 상태는 같은 날 read-only 조회
> **상태**: 조사 완료 · 구현 0
> **Production 변경**: workflow 수정 0 · deploy 0 · `DEPLOY_ENABLED` 변경 0 · Environment 변경 0 · traffic 변경 0 · DB write 0 · migration 0 · PR merge 0

---

## 0. 결론 요약

1. **현재 production 배포는 전부 수동이다.** 2026-09-23 이후 `main` push 로 실제 배포된 것은 **0건**이다.
   관측된 run 30개(workflow 당) 기준 모든 실제 배포는 `workflow_dispatch`(대부분 `deploy/*` 태그 ref)로만 발생했다.
   push 는 매번 `deploy-hold-notice` 로 끝나며 run 은 "success" 로 표시된다.
2. **실제로 동작하는 통제 장치는 3개다.** ① `DEPLOY_ENABLED`(저장소 변수, 평상시 `false`) ② Cloud Run **트래픽 pin**(12개 서비스 중 6개) ③ 사람의 `workflow_dispatch`.
   GitHub Environment `production` 은 **승인 게이트가 아니다**(protection rule 0). 무료 플랜의 개인 private 저장소라 **branch protection · ruleset · required reviewer 를 켤 수 없다**(API 403).
3. **CI 와 배포가 연결돼 있지 않다.** 배포 workflow 3종은 CI Pipeline 결과를 기다리지 않는다(`workflow_run` · `needs` 없음). `main` 직접 커밋이 기본인 이 저장소에서는 게이트가 열린 순간 **CI 가 실패한 커밋도 배포될 수 있다**.
4. **`main` 이 곧 release train 이다.** 배포 단위는 "SHA 전체"이므로, 고위험 변경(migration · auth)이 `main` 에 한 번 들어가면 그 뒤 모든 배포가 그것을 함께 싣는다. 지금은 이를 "게이트를 항상 닫아 둔다"로 막고 있고, 그 대가로 **일반 변경도 전부 사람 판단**이 필요하다. → 이것이 복잡성의 근원이다.
5. **CI-only 변경(#259 같은)은 이미 배포를 일으키지 않는다.** `ci-security.yml` 만 바뀐 push 는 배포 workflow 3종의 `on.paths` 에 걸리지 않아 **trigger 자체가 없다**. LEVEL 1 은 사실상 이미 성립한다.
6. **권장 방향**: `DEPLOY_ENABLED` 의 기본값을 뒤집고(평상시 open · 사고 시 freeze), 자동 배포를 **CI 성공에 연결**하며, detector 에 **high-risk 판정**을 추가해 LEVEL 3 만 수동 창으로 보낸다. 판정 기준은 push batch 가 아니라 **"마지막 배포 SHA → 이번 SHA"** 여야 한다(§16).

---

## A. Current State

### A-1. GitHub Actions 전체 census

| 파일 | name | push | PR | dispatch | schedule | paths 필터 | environment | deploy | Cloud Run | migration | secret 범주 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `ci-pipeline.yml` | CI Pipeline | main · develop | → main | ✅ (base/head/full_jest) | – | 없음 (detector 가 내부 분기) | – | – | – | 정적 계약 검사만 | 없음 |
| `ci-security.yml` | CodeQL Security Analysis | main · develop | → main | ✅ | 월 05:30 | 없음 (docs-only 는 Analyze skip) | – | – | – | – | 없음 |
| `ci-guard-policy.yml` | Guard Policy Check | – | → main · develop | – | – | `services/web-*/src/**` | – | – | – | – | 없음 |
| `ci-appstore-guard.yml` | AppStore Guard | main · develop | → main · develop | ✅ | – | manifest · lifecycle · appsCatalog | – | – | – | – | 없음 |
| `deploy-api.yml` | Deploy API Server | **main** | – | ✅ (force_deploy · base/head · **migrate_only**) | – | `apps/api-server/**` · `packages/**` · root manifest · 자기 자신 | `production` (표기만) | ✅ | `o4o-core-api` + Job `o4o-api-migrations` | ✅ **배포 job 안에서 실행** | `GCP_SA_KEY` · DB · JWT · SMTP · AI key · (TOSS) |
| `deploy-web-services.yml` | Deploy Web Services | **main** | – | ✅ (service · base/head) | – | 9개 서비스 · `packages/**` · root build 입력 · detector · 자기 자신 | `production` (표기만) | ✅ | 9개 web 서비스 | – | `GCP_SA_KEY` |
| `deploy-admin.yml` | Deploy Admin Dashboard | **main** | – | ✅ (force_deploy · base/head) | – | admin · `packages/**` · root manifest · setup-build-env · 자기 자신 | `production` (표기만) | ✅ | `o4o-admin-dashboard` | – | `GCP_SA_KEY` |
| `e2e-auth-runtime.yml` | Auth Runtime E2E | – | – | ✅ 만 | – | – | – | – | – | – | 없음 (Google-only, password 소비 0 을 스스로 검사) |
| `scheduled-api-full-jest.yml` | Scheduled API Full Jest | – | – | ✅ | 매일 18:00 UTC | – | – | – | – | – | 없음 |
| `automation-pr-labeler.yml` | PR Size Labeler | – | opened · sync | – | – | – | – | – | – | – | `GITHUB_TOKEN` |
| `automation-repo-setup.yml` | Setup Repository Labels | main | – | ✅ | – | `.github/labeler.yml` | – | – | – | – | `GITHUB_TOKEN` |

- 다른 workflow 호출(`workflow_call` · `workflow_run`) **0건**. 공용 composite action 은 `.github/actions/setup-build-env` · `setup-node-safe`.
- tag · release trigger **0건**. 단 `deploy/*` 태그는 **dispatch 의 ref** 로 쓰인다(push trigger 아님).
- `staging` Environment 는 존재하지만 어떤 workflow 도 쓰지 않는다.

### A-2. 무엇이 production 배포를 유발하는가

| 이벤트 | 결과 (현재 `DEPLOY_ENABLED=false`) | 게이트가 열려 있다면 |
|---|---|---|
| PR 생성 · 갱신 | CI · CodeQL · Guard · Labeler 만. 배포 0 | 동일 |
| PR merge → main push | CI + (paths 일치 시) 배포 workflow 시작 → detect → **hold** | detect 결과가 true 인 서비스 **자동 배포** (CI 결과와 무관) |
| main 직접 push | 위와 동일 | 위와 동일 |
| `workflow_dispatch` (main 또는 `deploy/*` 태그) | hold (단 `migrate_only=true` 는 게이트 무관하게 migration 실행) | 배포 — Web 은 **사람이 고른 service** 기준(detector 미사용, base/head 입력 시만 detector) |
| tag push · release | 없음 | 없음 |

실측 (각 workflow 최근 30 run, job 단위):

| workflow | push 로 실제 배포 | dispatch 로 실제 배포 | 실패 |
|---|---|---|---|
| deploy-api | **0** | 5 | 1 (`46e5d14b8`, 09-28 · dispatch) |
| deploy-web-services | **0** | 7 | 0 |
| deploy-admin | **0** | 9 | 1 (`b2925e765`, 09-24 · dispatch — 태그 ref 빈 image_name 사고) |

### A-3. 서비스별 배포 흐름

| Cloud Run 서비스 | workflow / job | 변경 판정 | 트래픽 (2026-09-30 실측) | 배포 후 검증 |
|---|---|---|---|---|
| `o4o-core-api` | deploy-api / build-and-deploy | `api_deploy_affected` | **pin** (`03758-wdt` 100%) | LB `/health/ready` 5회 — **blocking** |
| `o4o-admin-dashboard` | deploy-admin / deploy | `admin_affected` | **pin** | run.app `/` 3회 — **non-blocking** (실패해도 성공) |
| `neture-web` | deploy-web / deploy-neture | `neture` | latest 추종 | run.app curl — non-blocking |
| `k-cosmetics-web` | deploy-k-cosmetics | `k-cosmetics` | **pin** | URL 출력만 |
| `kpa-society-web` | deploy-kpa-society | `kpa-society` | **pin** | URL 출력만 |
| `pharmacy-hub-web` | deploy-pharmacy-hub | `pharmacy-hub` | **pin** | URL 출력만 |
| `lecture-web` | deploy-lecture | `lecture` | **pin** | URL 출력만 |
| `store-web` | deploy-store | `store` | latest 추종 | URL 출력만 |
| `kpa-branch-web` | deploy-kpa-branch | `kpa-branch` | latest 추종 | URL 출력만 |
| `signage-player-web` | deploy-signage-player | `signage-player` | latest 추종 | `/health` curl — non-blocking |
| `hospital-pharmacy-web` | deploy-hospital-pharmacy | `hospital-pharmacy` | latest 추종 | URL 출력만 |
| `glucoseview-web` | **없음** | – | latest 추종 | – (어떤 workflow 도 배포하지 않는 서비스 — 별도 판정 필요) |
| Job `o4o-api-migrations` | deploy-api / build-and-deploy (또는 migrate_only) | API 배포와 동일 | – | Job exit code |

- 현재 pin 된 revision 은 모두 latest ready revision 과 같다(= 지금 드리프트는 없음). 그러나 **다음 배포부터 pin 서비스는 새 revision 이 0% 로 쌓이고**, `gcloud run services update-traffic` 을 사람이 실행해야 서빙된다.
- 서비스 목록 정본은 `scripts/ci/detect-affected.mjs` `WEB_SERVICES` + 각 deploy workflow 다. (WO 예시의 Supplier · Funding · Community · Retail 은 **별도 Cloud Run 서비스가 아니다** — 기존 web 서비스 안의 영역이다.)

### A-4. `DEPLOY_ENABLED`

| 항목 | 사실 |
|---|---|
| 정의 | **저장소 Actions variable** (secret 아님 · environment variable 아님). 현재 `false`, `updated_at 2026-09-30T07:36:12Z` |
| 도입 | `3c7083be5` (2026-09-23) — WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 §19 INCIDENT 대응 kill switch |
| 참조 | deploy-api `build-and-deploy` · deploy-web 9개 job · deploy-admin `deploy` · 세 workflow 의 `deploy-hold-notice` |
| false 일 때 | 위 배포 job 전체 skip = Docker build · migration · Cloud Run deploy 0. **예외**: `migrate_only` dispatch 는 게이트 무관 |
| true 일 때 | detect 결과(또는 dispatch 입력)에 따라 배포. **그 시점의 모든 main push 가 같은 게이트를 통과**한다 |
| 범위 | 전 서비스 공통 단일 스위치. 서비스별 차등 없음 |
| 정본 문서 | **baseline/rules 에 없다.** README "배포" 절과 workflow 주석, CHECK 기록 20여 건에만 있다 |
| 운영 방식 (실측) | 사용자 승인 → 변수 `true` → dispatch → 변수 `false`. 예: 09-30 07:24 dispatch 는 API 가 hold 된 반면 같은 시각 Web 은 배포됐고, 07:35 재dispatch 후 07:36 변수 `false` — **변수를 읽는 시점에 따라 결과가 갈린다** |
| 알려진 사건 | 09-23 13:02 변수가 외부에서 `true` 로 바뀌어 게이트 커밋 push 가 배포 3종을 실행(주체 미특정 — 개인 저장소는 audit log 404). 영향 0 은 **traffic pin 과 적용할 migration 부재라는 우연** 덕분이었다 |
| hold 요약 문구 | 여전히 "Lecture Phase 2 runtime 이 data cutover 전에 서빙되는 것을 막는다" — 해당 사유는 §23(09-24 통제 창)에서 해소됨. **stale** |

### A-5. GitHub Environment `production`

- 사용: 배포 job 11개(api 1 · web 9 · admin 1).
- protection rules **0** · deployment branch policy 없음 · environment secret/variable 0 (API 조회).
- `f2fdead81` (09-23) 에서 "승인 게이트" 로 추가됐으나 reviewer 규칙이 없어 **대기 없이 실행**된다. `559740cde` (09-30) 에서 주석 · README 를 "승인 게이트가 아니다" 로 정정 완료.
- 개인 계정 **private + 무료 플랜**: required reviewer · wait timer · branch protection · ruleset 모두 **플랜 제약으로 불가**(branch protection · ruleset API 403 실측). 즉 현재 구조에서 GitHub 가 강제하는 사람 승인은 **존재할 수 없다**. README "Production 변경 원칙" 이 합의 규칙으로 대신한다.

### A-6. DB migration

- 소유자: Cloud Run Job `o4o-api-migrations` 단일 (startup migration 제거됨).
- 순서: 이미지 push → **Job 실행 · 성공 확인** → API revision deploy. Job 실패 = workflow 중단 = 기존 revision 유지.
- 경로 2개: ① 일반 API 배포 안(게이트 · detect 필요) ② `migrate_only` dispatch(태그 ref + `expected_sha` 일치 · 이미지 digest 고정 · 게이트 무관 · API 불변).
- rollback: **자동 rollback 없음.** POST assertion 실패 시 `MANUAL_INVESTIGATION_REQUIRED=YES`, 적용된 migration 은 남는다 (PRODUCTION-MIGRATION-STANDARD).
- 판정: migration 파일이 바뀌었다는 사실을 **어떤 detector 도 별도 위험으로 구분하지 않는다** — `api_deploy_affected=true` 의 한 사유일 뿐이다.

### A-7. Production smoke

| 구분 | 현재 | 자동/사람 |
|---|---|---|
| API readiness | 배포 job 안 LB `/health/ready` (READY + DB `SELECT 1`) — blocking | 자동 |
| Web · Admin | 대부분 URL 출력만, 일부 curl 결과 무시 — **사실상 없음** | 자동(무효) |
| Auth Runtime E2E | `e2e-auth-runtime.yml` dispatch 전용 · 운영 도메인 대상 · 미인증 · 은퇴 endpoint 검사 | 사람이 실행 |
| 실브라우저 로그인 · 역할 · 저장 | CHECK 마다 사람/AI 세션이 수행 | 사람 |
| DB 확인 | Cloud SQL Proxy read-only SELECT | 사람 |

**pin 서비스에서는 배포 후 검증이 이전 revision 을 본다.** API 의 LB `/health/ready` 도, Admin 의 `status.url` 도 트래픽을 받는 revision(= pin 된 옛 revision)으로 간다. 새 revision 은 0% 이므로 "Verify deployment PASS" 가 **새 revision 의 건강을 증명하지 않는다**.

### A-8. Rollback

| 대상 | 현재 가능 여부 |
|---|---|
| Cloud Run 새 revision 기동 실패 | 자동 — ready 가 안 되면 트래픽 이동 없음 (latest 추종 서비스 포함) |
| 기동은 됐지만 기능 결함 | 수동 `update-traffic --to-revisions <prev>=100` (09-23 에 6축 실행 이력) |
| API | 위와 동일. readiness 실패 시 workflow 실패하지만 **트래픽 자동 복귀는 없다** (latest 추종이었다면 이미 이동) |
| Frontend | 위와 동일 · 검증 자체가 약해 결함 감지 불가 |
| DB migration | 자동 불가. down 은 수동 · 판단 필요 |

### A-9. 인증 / OAuth 와 배포

- 배포 workflow 가 OAuth 에 넣는 것은 `GOOGLE_WEB_CLIENT_ID`(저장소 변수) 뿐이다. **승인된 JavaScript origin 등록은 Google Cloud Console 의 외부 설정**이며 배포 파이프라인과 무관하다.
- origin 미등록의 영향 = 해당 호스트에서 Google 로그인 버튼 실패. 이미지 빌드 · revision 기동 · 다른 서비스 · API 는 영향 없음.
- 판정: **OAuth origin 미등록은 일반 service deploy 를 막을 사유가 아니다.** 그 호스트의 로그인 smoke(사람 필요)만 PENDING 으로 둔다. 예외: 새 호스트로 **로그인 진입을 강제 전환**하는 변경(예: `VITE_UNIFIED_STORE_HANDOFF='true'`)은 origin 등록이 선행돼야 하므로 LEVEL 3 로 분류한다.

---

## B. Current Architecture Diagram

```text
Developer / AI session
   │  (대부분 main 직접 commit · 일부 PR)
   ▼
push to main ─────────────────────────────┬──────────────────────────────────────┐
   │                                      │                                      │
   ▼                                      ▼                                      ▼
CI Pipeline · CodeQL                deploy-api / deploy-web / deploy-admin   (paths 불일치 → 배포 workflow 미기동)
(detect → full / admin-fast /        │   ※ CI 결과를 기다리지 않음 (병렬 · 독립)
 docs-fast)                          ▼
   │                               detect  (scripts/ci/detect-affected.mjs · base = event.before)
   │                                 │
   ▼                                 ▼
 결과는 배포에                   DEPLOY_ENABLED == 'true' ?
 연결되지 않음                      │ no (평상시)                  │ yes (사람이 연 창)
                                    ▼                              ▼
                             deploy-hold-notice            environment: production  (승인 없음 · 즉시 통과)
                             run = "success"                       │
                                                                   ▼
                                                  [API] build → push → migration Job (--wait) ─fail→ 중단
                                                                   │ ok
                                                                   ▼
                                                  gcloud run deploy (새 revision)
                                                                   │
                                          ┌────────────────────────┴───────────────────────┐
                                          ▼                                                ▼
                                 pin 서비스 (API·Admin·KPA·KCos·PH·Lecture)        latest 추종 (Neture·Store·Branch·Signage·Hospital)
                                 새 revision 0%                                     ready 되면 100% 자동 이동
                                          │                                                │
                                          ▼                                                ▼
                                 사람: update-traffic --to-revisions              검증: API 외엔 사실상 없음
                                          │
                                          ▼
                                 사람: 브라우저 smoke · DB SELECT · CHECK 기록

별도 경로:  workflow_dispatch(migrate_only, deploy/* 태그, expected_sha) ──→ migration Job 만 (게이트 무관)
```

---

## C. Problems

### C-A. 필수 안전장치 (유지)

| # | 장치 | 보호하는 위험 |
|---|---|---|
| A1 | migration Job 선행 + 실패 시 중단 (`--wait`, `continue-on-error` 없음) | 스키마 불일치 revision 서빙 |
| A2 | API fail-fast startup + LB `/health/ready` | DB 미연결 revision 승격 |
| A3 | detector 의 fail-safe 방향 (판정 불가 = 배포/전체 CI) | 배포 누락 |
| A4 | `migrate_only` 의 태그 ref + SHA 고정 + digest 고정 | 다른 코드가 migration 에 섞임 |
| A5 | 이미지 태그 = commit SHA | 어떤 SHA 가 서빙 중인지 추적 |
| A6 | CI 의 정적 계약 검사 (migration contract · entity registry · unsafe route) | 구조 사고 재발 |
| A7 | PRODUCTION-MIGRATION-STANDARD 의 assertion (PRE/POST) | 부분 적용 DB |

### C-B. 중복 안전장치

| # | 중복 | 판단 |
|---|---|---|
| B1 | `DEPLOY_ENABLED` 와 **traffic pin** 이 같은 위험(원치 않는 코드 서빙)을 두 번 막는다. 게다가 pin 은 6개 서비스에만 있어 보호 범위가 불균일하다 | 둘 중 하나로 수렴해야 한다 |
| B2 | `environment: production` 표기 vs `DEPLOY_ENABLED` | 전자는 통제력 0. 중복이라기보다 **오해 유발** (정정은 559740cde 에서 완료) |
| B3 | README "Production 변경 원칙"(사람 합의) + Claude Code 세션 승인 + 별도 WO 승인 + 변수 토글 | 한 번의 배포에 사람 판단이 3~4회 들어간다 |
| B4 | detector 의 서비스 판정 vs Web dispatch 의 `service` 수동 선택 | 수동 창에서는 detector 를 버리고 사람이 고른다 |

### C-C. 불필요한 수동 작업

| # | 작업 | 자동화 가능성 |
|---|---|---|
| C1 | 일반 변경마다 변수 open → dispatch → close | 높음 — 자동 배포 + 사고 시 freeze 로 대체 |
| C2 | pin 서비스의 `update-traffic` 수동 전환 | 높음 — 새 revision 검증 후 자동 전환 |
| C3 | 배포 후 revision · traffic 확인 (배포 판정 3신호) | 높음 — job summary 로 기계 출력 |
| C4 | HTTP 수준 smoke (public route 200, `/health`) | 높음 — 서비스별 LB 호스트 curl blocking |
| C5 | "이 커밋은 배포 대상인가" 판단 | 높음 — detector 가 이미 계산한다 |

### C-D. 위험한 자동화 (Gate 부족)

| # | 위험 | 현재 가려진 이유 |
|---|---|---|
| D1 | 배포가 CI 성공과 무관하게 돈다 | 게이트가 평상시 닫혀 있어서 드러나지 않을 뿐 |
| D2 | 게이트가 열린 동안 **모든** main push 가 배포된다 (09-23 사건) | 창을 짧게 유지하는 운영 습관 |
| D3 | migration 은 API 배포에 자동 포함되고, 고위험 여부를 구분하지 않는다 | 게이트 |
| D4 | 판정 base 가 `event.before` 라 **이미 main 에 있지만 아직 배포 안 된 변경**을 모른다 (release train) | 게이트 |
| D5 | pin 서비스의 배포 후 검증이 옛 revision 을 본다 (거짓 PASS) | 사람이 전환 후 다시 확인 |
| D6 | `gcloud run deploy --set-env-vars` 가 매 배포 전체 env 를 덮는다. `vars.AI_DEFAULT_PROVIDER` · `vars.AI_DEFAULT_MODEL_OPENAI` 는 저장소 변수 목록에 **없고**, `TOSS_PAYMENTS_*` secret 도 **없다** → 매 배포마다 빈 값으로 설정된다 | 코드 기본값 동작에 기대고 있음 (의도 여부 미확인 — 보고만) |
| D7 | 장기 SA key(`GCP_SA_KEY`)를 저장소 secret 으로 사용. `id-token: write` 는 선언만 있고 WIF 미사용 | 저장소 쓰기 권한자 = production 접근자 |

### C-E. 구조적 복잡성

- E1. 배포 단위가 SHA(= main 전체)라서 고위험 1건이 모든 일반 배포를 인질로 잡는다. 현재 해법이 "항상 닫기"라서 LEVEL 2 자동화가 원천적으로 불가능하다.
- E2. 세 deploy workflow 가 같은 게이트 · 같은 hold 문구 · 같은 GCP 인증을 11번 복제한다. Web 9개 job 도 거의 동일한 복사본이다(verify 단계만 제각각).
- E3. `DEPLOY_ENABLED` 의 의미 · 운영 절차가 정본 문서 없이 CHECK 20여 건에 흩어져 있다.
- E4. Web summary job 이 "Services deployed: true" 를 detect 결과로 출력한다 — 게이트로 skip 돼도 배포된 것처럼 보인다.
- E5. `glucoseview-web` 처럼 workflow 밖 Cloud Run 서비스가 존재한다.

---

## D. Proposed Architecture — O4O 표준 CI/CD 모델 V1

### D-1. 원칙

```text
main merge ≠ production approval           → 승인은 "위험 등급"이 결정한다
CI PASS   ≠ high-risk approval             → CI 는 LEVEL 2 자동 배포의 전제조건일 뿐
일반 deploy ≠ DB/auth 파괴적 작업           → LEVEL 3 는 파이프라인이 자동 진행을 거부한다
판정 base = 마지막으로 배포된 SHA           → "main 에 쌓였지만 미배포인 고위험"을 놓치지 않는다
```

### D-2. 목표 흐름

```text
push to main
   ▼
CI Pipeline (기존 그대로)
   ▼  workflow_run: completed · conclusion == success · branch == main
Deploy Orchestrator (단일 진입점)
   ├─ freeze?  DEPLOY_FREEZE == 'true'  → hold (사고 대응용 · 평상시 false)
   ├─ base = 서비스별 "현재 서빙 중인 revision 의 이미지 태그 SHA"   (Cloud Run 조회)
   ├─ detect-affected.mjs  base..HEAD  → 서비스별 affected + risk_level
   │
   ├─ risk_level == 3 (해당 서비스 범위 안에 LEVEL 3 변경 존재)
   │     → 자동 배포 거부 · summary 에 사유와 수동 절차 출력 · 종료
   │
   └─ risk_level == 2
         → affected 서비스만 build → deploy --no-traffic --tag sha-<short>
         → 새 revision 태그 URL 에 smoke (blocking)
         → PASS: update-traffic --to-revisions <new>=100
         → FAIL: 트래픽 불변 (옛 revision 유지) · workflow 실패

LEVEL 3:  사용자 승인 → deploy/* 태그 → workflow_dispatch (high_risk_ack=<SHA>)
          → [migration 있으면] migrate_only 먼저 → 검증
          → 배포 --no-traffic → smoke → 사람 확인 → 트래픽 전환 → 사람 smoke → CHECK closure
```

핵심 변경점 5개:

1. **CI 연결** — `workflow_run` 으로 CI 성공 뒤에만 배포 (D1 해소).
2. **게이트 반전** — `DEPLOY_ENABLED`(평상시 false) → `DEPLOY_FREEZE`(평상시 false = 배포 허용). 사고 시에만 사람이 켠다. 매 배포 토글 제거 (C1 · D2 해소).
3. **base = 서빙 중 SHA** — push batch 가 아니라 실제 운영 상태와 비교한다 (D4 · E1 해소). 이미지 태그가 이미 commit SHA 라서(A5) 추가 저장소가 필요 없다.
4. **`--no-traffic` + 태그 URL smoke + 자동 전환** — pin 과 수동 `update-traffic` 을 대체하고, 새 revision 을 실제로 검증한다 (B1 · C2 · D5 해소). 실패 시 옛 revision 이 그대로 서빙된다 = 자동 rollback.
5. **high-risk 판정** — detector 에 `risk_level` 축 추가 (D3 해소).

### D-3. GitHub 플랜과의 관계

- 무료 플랜에서는 required reviewer 가 불가하므로 **LEVEL 3 의 게이트는 "파이프라인이 자동 진행을 거부" + "사람이 태그 dispatch"** 로 구현한다. 이는 현재 운영 습관(deploy/* 태그 dispatch)과 같아 추가 학습이 없다.
- 선택지: GitHub Pro(개인 유료) 로 전환하면 `production-high-risk` Environment 에 required reviewer 를 걸 수 있다. **결제 판단은 사용자 몫**이며 이 모델은 그것 없이도 성립한다.

---

## E. Risk Classification

| LEVEL | 판정 기준 (detector 입력 = base..HEAD 변경 파일) | 흐름 | 사람 개입 |
|---|---|---|---|
| **1 NON-RUNTIME** | 변경이 전부 배포 무영향: `docs/**` · 루트 `*.md` · `.github/workflows/ci-*.yml` · `automation-*.yml` · `scripts/**`(deploy 가 쓰지 않는 것) · `tools/**` · `e2e/**` · `__tests__/**` · `*.spec/test.*` · `jest/vitest config` | PR → CI → merge → **끝** | 없음 |
| **2 NORMAL RUNTIME** | affected 서비스가 있고 LEVEL 3 조건이 없음: 일반 frontend · backend 소스, closure 안 package, lockfile importer 변경 | PR → CI → merge → **affected 자동 deploy → 자동 smoke → 자동 전환** | 없음 (실패 알림 확인만) |
| **3 HIGH RISK** | 아래 중 하나라도 base..HEAD 에 존재 | PR → CI → merge → **자동 배포 거부** → 사용자 승인 → 태그 dispatch → migration → deploy → smoke → closure | 승인 1회 + 사람 smoke |

LEVEL 3 경로 규칙 (초안 — 정비 WO 에서 확정):

```text
apps/api-server/src/database/migrations/**          DB schema
apps/api-server/src/database/incremental/**          migration manifest · expected state
apps/api-server/src/**/seed*  · src/scripts/**       (배포 이미지 밖이지만 운영 data 작업 경로 — CLI 실행은 원래 승인 대상)
apps/api-server/src/modules/auth/** · src/services/auth/** · src/common/middleware/auth/**
apps/api-server/src/**/rbac/** · role/permission 정의 · scope guard
packages/auth-*/**  (auth-client · auth-react · auth-utils · auth-context)
.github/workflows/deploy-*.yml · .github/actions/**  (배포 자체)
deploy-api.yml 의 env/secret 목록 변경 · Dockerfile · infra/**
VITE_UNIFIED_STORE_HANDOFF 등 로그인 진입 전환 플래그
서비스 삭제 (WEB_SERVICES 항목 제거)
```

`risk_level` 은 **서비스 단위**로 계산한다. 예: `packages/auth-react` 변경은 그 package 를 closure 에 가진 서비스만 LEVEL 3 가 되고, 무관한 서비스의 LEVEL 2 배포는 막지 않는다. API 의 migration 은 API 만 LEVEL 3 다.

### E-1. 사용자 개입 범위 (최종)

유지: Google/GitHub/Cloud Console 계정 보안 · 2FA · 결제 · OAuth client 외부 설정 · LEVEL 3 승인 · production DB destructive write · 대량 data apply · 서비스 삭제 · secret/credential 변경 · `DEPLOY_FREEZE` 설정 · 실 로그인이 필요한 smoke.

제거: 일반 배포 승인 · 변수 토글 · `update-traffic` · revision 확인 · HTTP smoke.

---

## F. Migration Plan (정비 WO 1개 — 순서가 곧 안전)

> 이 절은 제안이다. 구현 · workflow 수정 · 변수 변경은 전부 별도 정비 WO 와 사용자 승인 후.

| 단계 | 내용 | production 영향 | 되돌리기 |
|---|---|---|---|
| **P0 문서** | `DEPLOY_ENABLED`/LEVEL 모델 정본 문서 신설(baseline/operations) · README 링크 · hold 문구의 stale 사유 정정 | 0 | 문서 |
| **P1 detector** | `risk_level` 축 + `--base-from-serving` (Cloud Run 이미지 태그 SHA 조회) 추가 · node:test 회귀 · **shadow 출력만** (배포 판정에 미사용) | 0 | 코드 revert |
| **P2 CI 연결 + 검증 강화** | 배포 workflow trigger 를 `workflow_run(CI success)` 로 · web/admin verify 를 LB 호스트 blocking 으로 · summary 를 실제 job 결과 기준으로 · `DEPLOY_ENABLED` 는 **그대로 false** | 0 (게이트 닫힘) | workflow revert |
| **P3 no-traffic 배포** | `--no-traffic --tag` + 태그 URL smoke + 자동 전환 · 실패 시 전환 없음. 먼저 **dispatch 로 1개 서비스**에서 실측 | 통제된 1회 | 옛 revision 으로 update-traffic |
| **P4 게이트 반전** | 사용자 승인 후 `DEPLOY_FREEZE` 도입 · `DEPLOY_ENABLED` 제거 · LEVEL 3 거부 로직 활성 · pin 해제는 P3 의 자동 전환이 대신하므로 의미 소멸 | LEVEL 2 자동 배포 시작 | `DEPLOY_FREEZE=true` 1회 |
| **P5 (선택)** | WIF 전환(`GCP_SA_KEY` 은퇴) · Web 9 job matrix 화 · `glucoseview-web` 처리 · D6 env 누락 판정 | 개별 | 개별 |

P1 shadow 를 최소 1주 돌려 "LEVEL 3 오탐 0 / 미탐 0" 을 실측한 뒤 P4 로 간다 (게이트 오탐 우선 의심 원칙).

---

## G. Immediate Recommendation — PR #259 · #257

### PR #259 `ci(security): skip CodeQL SARIF upload and preserve SARIF as artifact`

- 변경: `.github/workflows/ci-security.yml` 1개 파일. CI 전 항목 PASS (Analyze 포함).
- 배포 영향: 배포 workflow 3종의 `on.paths` 에 해당 없음 → **trigger 자체 0**. detector 상으로도 `api_deploy_affected=false` · web 전 서비스 false.
- 분류: **LEVEL 1**.
- 판단: **현재 방식 그대로 merge 해도 된다.** `DEPLOY_ENABLED` · 배포 · 창 불필요. README 원칙 2(workflow 변경은 사용자 승인)는 사용자가 merge 하는 행위로 충족된다. merge 후 main 의 CI Pipeline(`.github/` = global → full CI)과 CodeQL 이 green 인지만 확인한다.

### PR #257 `feat(auth): 이메일·비밀번호 가입·로그인 도입`

- 변경 63개 파일: migration 2건(`1790683000000-CreateEmailPasswordAuthTables` · `1790684000000-AddHandoffTokenSourceAuthMethod`) · incremental manifest · auth middleware/controller/service · `packages/auth-*` · `pnpm-lock.yaml` · web-neture 로그인 UI · `.github/workflows/ci-security.yml`(#259 와 같은 파일).
- 현재 CI: `Analyze (typescript)` FAILURE — #259 가 고치는 SARIF 문제와 같은 축으로 보인다. 나머지 PASS. `mergeStateStatus=UNSTABLE`.
- 분류: **LEVEL 3** (DB migration + 인증 구조 + 공용 auth package).
- release train 위험: merge 하는 순간 `main` 에 미배포 migration 이 생기고, **그 뒤의 어떤 배포 창도 이 migration 과 auth 변경을 함께 싣는다**. 현재 모델에서는 이를 막는 장치가 "창을 열지 않는다" 뿐이다.

**권장 순서**

```text
1. #259 merge (LEVEL 1 · 배포 없음) → main CI · CodeQL green 확인
2. #257 브랜치에 최신 main 반영 → ci-security.yml 충돌은 main(#259) 쪽을 채택 → CI 재실행 · Analyze PASS 확인
3. #257 은 "merge 직후 바로 통제 배포할 수 있을 때" merge 한다 (merge 와 배포 창을 붙인다)
     - 그 전에 대기 중인 LEVEL 2 변경이 있으면 먼저 배포해 main 을 비워 둔다
     - 창: deploy/* 태그 → migrate_only(expected_sha) → migration 로그 확인 → API · 해당 web 배포 → 트래픽 전환 → 사람 smoke(이메일 가입 · 로그인 · Google 병행 · Admin Google 전용)
4. #257 의 사업 판단 확인 — Google-only 계약(2026-09-25 CLOSED 트랙)에 이메일 로그인을 **병행 재도입**하는 변경이다. 이것이 확정된 방향인지는 사용자 결정 사항이다 (이 조사의 판단 범위 밖)
```

정비 WO(§F)를 #257 보다 먼저 할 필요는 없다. 다만 P1(detector shadow)이 먼저 들어가 있으면 #257 merge 시 `risk_level=3` 판정을 실측할 수 있어 좋은 검증 사례가 된다.

---

## H. 검증 기록

| 항목 | 방법 | 결과 |
|---|---|---|
| workflow census | `origin/main` 11개 파일 전문 읽기 | 완료 |
| detector 판정 로직 | `scripts/ci/detect-affected.mjs` classify · classifyApiDeploy · classifyWebDeploy 읽기 | 완료 |
| Environment | `gh api repos/.../environments` | production · staging 둘 다 protection 0 |
| 변수 · secret | `gh variable list` · `gh secret list` (이름만) | `DEPLOY_ENABLED=false` · `GOOGLE_WEB_CLIENT_ID` 2개 · secret 15개 |
| branch protection · ruleset | `gh api .../branches/main/protection` · `.../rulesets` | **403 (플랜 제약)** |
| 배포 실측 | 3 workflow × 최근 30 run job 결과 | push 배포 0 · dispatch 배포 성공 21 · 실패 2 |
| Cloud Run | `gcloud run services list` (read-only) | 12 서비스 · pin 6 · latest 6 · Job 1 |
| PR | `gh pr view 257/259` | 위 §G |
| 미확인 | GCP audit log(변수 변경 주체) · 각 서비스 LB 호스트 헬스 · `glucoseview-web` 소유 | 이번 범위 밖 |

## I. 문서 정합

- 발견 3건: ① `DEPLOY_ENABLED` 운영 절차의 정본 문서 부재(CHECK 에만 분산) ② hold summary 문구의 stale 사유(Lecture Phase 2 — 해소됨, workflow 파일이라 기준 문서 아님) ③ WO 가 가정한 "production Environment 수동 승인"은 현재 존재하지 않음(README 는 이미 정정됨).
- SUPERSEDED 표기 0 · 링크 수정 0 · 별도 WO 제안 1 (§F 정비 WO — ①② 포함).
