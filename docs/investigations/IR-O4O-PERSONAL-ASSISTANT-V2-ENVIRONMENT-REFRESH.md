# IR-O4O-PERSONAL-ASSISTANT-V2-ENVIRONMENT-REFRESH

> **상태**: COMPLETED (조사 전용) — 환경 Census 완료 · **Canonicalization 실행 STOP (입력 부재)**. 정본 · 코드 · 배포 설정 변경 0건
> **작성일**: 2026-10-03
> **근거**: `WO-O4O-PERSONAL-ASSISTANT-V2-ENVIRONMENT-REFRESH-AND-CANONICALIZATION-UPDATE` (사용자 지시 2026-10-03, WO 문서 없음 — 이 IR 이 기록)
> **기준 커밋**: `origin/main` d44087c2a (= 작업 시작 시 HEAD · working tree clean)
> **선행 IR**: [`IR-…-V2-GAP-CENSUS`](IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-GAP-CENSUS.md) (기준 03b9c8bc4) · [`IR-…-V2-CANONICAL-CONSISTENCY-REVIEW`](IR-O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2-CANONICAL-CONSISTENCY-REVIEW.md) (기준 61ae47bc9 · 커밋 9573df5b3)

---

## 0. 결론

1. **CASE 1 — 환경 변화만 있다.** Consistency Review(9573df5b3) 이후 11 커밋은 전부 CI/CD · 보안 · 문서 정리다. 자동화 runtime 코드 변경 0, 자동화 · 사업 · 법무 정본 변경 0. 따라서 Consistency Review 의 조항 · 행 번호 판단은 **그대로 유효**하다(§H · §I).
2. **기존 WO 의 배포 전제는 대부분 STALE 이다.** `DEPLOY_FREEZE` 는 정상 운영값 `false` 인 저장소 변수로 바뀌었고, 배포는 `main push → CI Pipeline → Delivery` 의 위험 등급(L1/L2/L3) 자동 판정이다. `87ebdb074`(Strong Discovery) 는 더 이상 `BLOCKED_FREEZE` 가 아니다 — 현재 serving API(`609ee6425`)에 **포함돼 배포됐다**(§D · §J).
3. **문서-only Canonicalization 은 `DEPLOYMENT = NOT_APPLICABLE`.** 자동화 정본을 읽는 테스트가 없어 CI 는 docs-fast(선별 0건), Delivery 는 LEVEL 1 → NO_DEPLOY 로 끝난다(§C).
4. **Git**: 소유자 · AI 세션은 `main` 직접 커밋이 현행 정본이다. ruleset `main-collaborator-pr-required` 의 PR+승인 1 은 공동개발자용이며 소유자(Admin)는 설계상 bypass 다(§B).
5. **Legal/Data Processing 격차 = STILL_OPEN.** work-agent planner 는 여전히 `openai` provider 경로를 갖고, 개인정보처리방침에는 OpenAI 국외 이전 고지가 없다(§K).
6. **Canonicalization 실행은 STOP.** 아키텍처 충돌 때문이 아니라 **입력 부재** 때문이다. ① `O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2` 초안 §1~§24 본문 ② 기존 `WO-…-V2-CANONICALIZATION` 원문(Consistency Review §8 의 사용자 결정 21건 확정값 포함) 둘 다 저장소 · 로컬 세션 기록 어디에도 없다. 이 둘 없이 V2 정본을 쓰면 V2 를 새로 설계하는 것이 되므로 WO §6 · §9("추측하지 않는다")에 따라 멈춘다(§L).

---

## A. 기준

| 항목 | 값 |
|---|---|
| repository | 클론 #1 (canonical 작업지) |
| branch | `main` |
| HEAD == origin/main | `d44087c2a` |
| working tree | clean (foreign dirty · untracked 0) |
| HANDOFF.md | 없음 |
| 진입 문서 | `CLAUDE.md` v9.1 · `AGENTS.md` · `SETUP.md` · `docs/CANONICAL-INDEX.md` |

## B. Git governance

| 항목 | 실측 (GitHub API 2026-10-03) |
|---|---|
| branch protection (classic) | 없음 (404) |
| ruleset `main-collaborator-pr-required` | active · `~DEFAULT_BRANCH` · deletion 금지 · non-fast-forward 금지 · PR 필수 · 승인 1 · stale review dismiss |
| bypass | RepositoryRole Admin(id 5) = `always` — 소유자 |
| ruleset `deploy-tags-owner-only` | `refs/tags/deploy/*` 생성 · 변경 · 삭제 · non-ff 금지, 소유자만 bypass |
| 공동개발자 경로 | 본인 branch → PR → 소유자 승인 → `main` ([`COLLABORATOR-START-HERE`](../development/COLLABORATOR-START-HERE.md) §6 · README §기여) |
| 소유자 · AI 세션 경로 | **`main` 직접 커밋 유지** — [`O4O-GIT-PARALLEL-WORK-SAFETY-V1`](../baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) `:5,12` · CLAUDE.md §1 · README "소유자 · AI 세션은 CLAUDE.md §1" |
| Claude Code 권한 | `git push` 전부 ASK (609ee6425) — push 마다 사용자 승인 창 |
| 최근 실례 | `d44087c2a` · `ae94763d1` 등 소유자 직접 커밋, `#267` · `#268` 은 PR 경유 |

판정: "main 직접 push" 는 **STILL_VALID**(소유자 세션 한정). bypass 는 우회가 아니라 정본이 정한 소유자 경로다. 단 push 는 ASK 승인 대상이다.

## C. CI

- canonical workflow: `CI Pipeline` (`.github/workflows/ci-pipeline.yml`) — `main` push · PR(main) · dispatch. path filter 없음, 대신 `detect` job(`scripts/ci/detect-affected.mjs`)이 `docs_only` · `docs_fast_eligible` · `api_affected` · `web_build_dirs` 등을 판정.
- 문서-only: `docs-fast-validate` 가 변경 문서를 읽는 api-server Jest spec 만 선별 실행. **자동화 정본(EVOLUTION · ARCH · EXP · CANONICAL-INDEX · AI-USAGE-FLOW · PRIVACY)을 읽는 spec 은 0건**(코드 주석 참조만 있음) → 선별 0건 = 정상.
- 성공 판정: target commit 의 `CI Pipeline` conclusion=success. Delivery 의 CI gate 가 이 값을 본다.
- 최신: `d44087c2a` CI Pipeline · CodeQL · Delivery 모두 success.
- 과거 run 번호 · workflow 이름은 이 IR 에서 정본 사실로 쓰지 않는다.

## D. CD / production deployment

```text
main push → CI Pipeline(success) → workflow_run → Delivery(delivery.yml)
  서비스별 "serving SHA → target" 판정
  LEVEL 1  runtime 무영향(문서 · CI · 테스트)                 → NO_DEPLOY
  LEVEL 2  일반 runtime 변경                                 → 자동 verified 배포(0% → smoke → 100%)
  LEVEL 3  migration · 인증 · 권한 · 결제 · 배포설정 · 판정불가 → 차단 → 소유자 promote.yml 1회
게이트   저장소 변수 DEPLOY_FREEZE — 정확히 'false' 일 때만 배포(fail-closed)
```

| 항목 | 현재 |
|---|---|
| `DEPLOY_FREEZE` | `false` (2026-10-03T01:03:20Z) — **정상 운영값**. `true` 는 비상 · 정비용 |
| `DEPLOY_ENABLED` | 은퇴 (f505e661d) |
| `deploy-auto.yml` | 은퇴 (ecee107da P3 cutover) |
| GitHub Environment | `production` (branch_policy: `main` · `deploy/*` 만 · required reviewer 없음 = 승인 게이트 아님) · `staging` |
| production secret | environment secret · repository secret 0 (`gh secret list` 빈 결과) |
| GCP 인증 | WIF (장기 SA key 없음) |
| 수동 배포 · promote · `deploy/*` tag | 소유자만 |
| 최종 상태 | `O4O_CICD_PRODUCTION_DEPLOY_REFACTORING = FINAL CLOSED` · `DEPLOY_OPERATIONAL_STATE = NORMAL` ([CHECK](../checks/CHECK-O4O-CICD-API-L3-CLEARANCE-FREEZE-RELEASE-AND-AUTO-DELIVERY-FINAL-CLOSURE-V1.md)) |
| `d44087c2a` 재판정 | Delivery success — 대기 중 L2 누적분 없음 |

**ownership**: 일상 L2 는 사람 개입 없이 자동. L3 · freeze 해제 · migration · 수동 dispatch 는 소유자 승인. 문서-only commit 은 Delivery 를 깨우지만 LEVEL 1 → NO_DEPLOY. 주의할 점은 **문서 commit 도 그 시점까지 쌓인 다른 L2 변경을 배포시키는 trigger 가 된다**는 것(CHECK §6 실례). 이는 정상 동작이며 이번 WO 가 배포를 일으키는 것이 아니다.

## E. Development environment

| 항목 | 정본(SETUP.md §1 · `package.json` volta) | 이 PC 실측 |
|---|---|---|
| Node | 22.18.0 (CI `NODE_VERSION` 동일) | v24.18.0 |
| pnpm | 10.25.0 | 10.27.0 |
| install | `pnpm install --frozen-lockfile` | — |

로컬 버전 차이는 이번 문서 작업과 무관하므로 보고만 한다(설정 변경 0). worktree 는 GIT-PARALLEL-WORK-SAFETY 상 기본 아님.

## F. Authentication / production smoke

- Identity V3: 2026-09-29 부터 **Google + 이메일·비밀번호 병행**, Admin · `platform:*` 경로는 Google 전용(`authMethod:'password'` 서버 거부). 정본 최종 변경 2026-10-01(Review 이전) — 변화 없음.
- 이후 변경은 데모 계정 role 계약(`O4O-CANONICAL-DEMO-ACCOUNTS-V1` · 테스트)과 e2e auth-runtime 설정(secret environment 이전 반영)뿐이다. Personal Assistant 관련 인증(work-agent · Local Agent device-token) 변경 없음.
- Phase A 전제: 외부 ingress · 위임 토큰은 여전히 정의 없음(Review §5) — Core auth 변경 WO 대상. 계정 생성 · 로그인 우회 · credential 변경 0.

## G. Local Agent / Execution environment

| 항목 | 현재 |
|---|---|
| 자동화 코드 최종 커밋 | `87ebdb074` (2026-10-02) — 이후 `tools/o4o-local-agent` · `tools/o4o-chrome-extension` · `services/ai-tools` · `services/local-agent` 변경 0 |
| server 측 Strong Discovery routing | **배포됨** — `87ebdb074` ⊂ API serving `609ee6425` |
| PC 측(local-agent · content-script) | 로컬 도구라 Cloud Run 배포 대상 아님. 실 PC 반영(extension reload · agent 재기동) 여부는 이 IR 범위 밖 · 미확인 |
| 이 PC 의 agent | 프로세스 없음(정지 상태). native host 등록 파일만 존재 |
| `local.db` · 다중 PC · node 선택 | Gap Census 판단 그대로(`resolveTargetDevice` 2대 이상 → ambiguous) |
| "canonical validation PC" | 이 용어를 쓰는 정본 · CHECK 없음 — 기존 WO 에서만 쓰인 개념으로 보임 |
| 미실행 유지 | Phase 1 실 PC smoke PENDING · 폴링 2단 재측정 PENDING · Strong Discovery 실 PC smoke 미실행 |

Agent start/restart · extension reload · waiting run resume · smoke 0건.

## H. V2 조사 이후 relevant code delta

`9573df5b3..d44087c2a` 변경 54 파일 중 자동화 관련 runtime **0건**. 키워드(work-agent · planner · experience · candidate · local-agent · extension · computer use · discovery · command · polling · node · auth · ingress) 매칭은 `.github/workflows/e2e-auth-runtime.yml` · `gcp-wif-auth-smoke.yml` · `e2e/auth-runtime/playwright.config.ts` · CHECK 문서뿐 — 전부 CI 인증 경로다.

판정: **V2 architecture 판단에 영향 없음.** Gap Census 재검증 불필요.

## I. Canonical docs delta

| 문서 | 최종 변경 | Review 이후 변경 |
|---|---|---|
| EVOLUTION-PRINCIPLES · AGENT-ARCHITECTURE · EXPERIENCE-MODEL | 486fec89c (10-01) | 없음 |
| CANONICAL-INDEX | cc8c3a3d1 (10-01) | 없음 |
| AI-USAGE-FLOW | 09-15 | 없음 |
| COMMERCE-BOUNDARY · ROLE-WORKSPACE · PHILOSOPHY | 09-17 | 없음 |
| F12 Product Resource | 07-08 | 없음 |
| Identity V3 | 3cbab5012 (10-01) | 없음 |
| 처리방침 · 보유기간 · 통합약관 · 매장 경영자 이용계약 | 09-17 ~ 09-22 | 없음 |
| `CLAUDE.md` · `AGENTS.md` | — | **변경** — "이 저장소는 Public" 기록 원칙 1문장 추가(6d3c89d20) |

판정: Review 의 행 번호 인용은 그대로 유효. 새 Public 원칙은 Canonicalization 산출물(V2 정본 · CHECK)의 작성 규칙에만 영향 — 실제 이메일 · 실명 · 약국명 · production 응답 원문 금지.

## J. 기존 WO stale assumption matrix

기존 WO 원문은 확보하지 못했다. 아래는 이번 WO §5 가 나열한 전제와 선행 IR 기록을 기준으로 판정한다.

| 기존 전제 | 판정 | 현재 사실 / 대체 문구 |
|---|---|---|
| `DEPLOY_FREEZE` 변경 금지 | **REPLACE** | "`DEPLOY_FREEZE` 는 정상 운영값 `false`. 이 WO 는 값을 바꾸지 않는다(해제 · 설정 모두 0)" |
| 현재 `BLOCKED_FREEZE` (`87ebdb074`) | **STALE** | 역사적 상태. 현재 server 측은 serving API 에 포함 · 배포됨 |
| `DEPLOY_PENDING` | **STALE** | 대기 중 배포 없음(`d44087c2a` Delivery success). 현행 어휘는 Delivery 판정값(`UP_TO_DATE` · `BEHIND_NO_RUNTIME_CHANGE` · `LEVEL_n` · `NO_DEPLOY`) |
| main 직접 작업 | **STILL_VALID** | 소유자 · AI 세션 한정. 공동개발자는 PR |
| push 방식 | **REPLACE** | path-specific stage → `check-staged-scope` → pathspec commit → `git push` (ASK 승인) · force 금지 |
| CI 검증 방식 | **REPLACE** | `CI Pipeline` success + docs-fast(선별 0 정상) + Delivery 가 LEVEL 1/NO_DEPLOY 로 끝났는지 확인 |
| production deploy 금지 | **REPLACE** | "`DEPLOYMENT = NOT_APPLICABLE` (runtime artifact 변경 0). 배포 설정 · 게이트 · promote 조작 0" |
| Local Agent 현재 상태 | **REPLACE** | §G 값으로 갱신 — server 측 Strong Discovery 배포됨, PC 측 반영 미확인, 실 PC smoke PENDING |
| Chrome Extension 현재 상태 | **REPLACE** | 코드 = `87ebdb074` 이후 불변. 실 PC reload 여부 미확인 |
| canonical validation PC | **NOT_RELEVANT** | 문서 작업에 불필요. 정본에 정의된 용어 아님 |

V2 §24 에 넣을 V1 진행 상태(Review C3)도 갱신된다: "Strong Discovery 미배포 BLOCKED_FREEZE" → **"server 측 배포됨 · 실 PC smoke 미실행"**. 이것은 사실 갱신이지 C-1(마감/동결) 결정의 대체가 아니다.

## K. Legal / Data Processing status

**STILL_OPEN** — 법률 판단 아님, 공시 대조만.

- `work-agent-runtime.ts:376,399-414` planner provider 타입 = `'gemini' | 'openai'` (strong planner 포함).
- `O4O-PRIVACY-POLICY-V1.0.md` 에 `openai` 언급 0건(국외 이전 고지 Gemini · Gmail 만) · 최종 변경 09-17.
- 통합 약관의 "provider 전환 = privacy-policy revision trigger" 원칙도 그대로.

Canonicalization 시 V2 §13 에 "처리방침 · 국외 이전 고지 개정 전에는 Phase C(Cloud 기억) · 새 provider 화면 전송(Phase F)을 열지 않는다" 를 Legal/Data Processing Gate 로 적는다는 Review 권고(C5)는 유효하다.

## L. Canonicalization WO 수정 필요사항 · STOP 사유

### L-1. 실행본에 넣을 ENVIRONMENT_BASELINE (그대로 붙여 쓸 수 있음)

```text
ENVIRONMENT_BASELINE (조사 2026-10-03 · 기준 origin/main d44087c2a)
- Git     소유자/AI 세션 = main 직접 커밋 (GIT-PARALLEL-WORK-SAFETY). path-specific stage +
          check-staged-scope + pathspec commit. git push = ASK 승인. force push 금지.
          공동개발자 = PR + 승인 1 (ruleset main-collaborator-pr-required, 소유자 bypass).
- CI      CI Pipeline success 필수. 문서-only = docs-fast, 자동화 정본 consumer spec 0건(선별 0 정상).
- CD      main → CI → Delivery 자동 판정. 문서-only = LEVEL 1 → NO_DEPLOY.
          DEPLOY_FREEZE=false(정상 운영값) — 이 WO 는 변경하지 않는다.
- DEPLOY  DEPLOYMENT = NOT_APPLICABLE. 사후 확인: Delivery run 이 success 이고 신규 배포 0.
- Runtime 87ebdb074 server 측 배포됨(API 609ee6425 포함). PC 측 반영 · 실 PC smoke 미확인.
          Local Agent 재기동 · extension reload · run resume · smoke 0.
- Docs    자동화 · 사업 · 법무 정본 = Review(61ae47bc9) 이후 변경 0 → Review 행 번호 유효.
          CLAUDE/AGENTS Public 기록 원칙 적용(실명 · 이메일 · 약국명 · prod 원문 금지).
- Legal   OpenAI 국외 이전 공시 격차 STILL_OPEN → V2 §13 Gate 로 기록.
```

### L-2. 이어서 실행하지 못한 이유 (CASE 1 이지만 STOP)

WO §13 의 4조건(핵심 결정 변화 없음 · 새 정책 결정 불필요 · boundary 새 충돌 없음 · 환경 사실 반영 한정)은 **환경 측면에서는 모두 충족**한다. 그러나 실행에 필요한 입력 두 가지가 없다.

| 필요 입력 | 위치 확인 결과 |
|---|---|
| V2 초안 §1~§24 본문 | Review 머리말 "사용자 대화로 제시 · 저장소 미등재". 저장소 · 로컬 세션 기록 검색 0건 |
| 기존 Canonicalization WO 원문 | 저장소 0건 · 로컬 세션 기록 0건(이번 WO 에서 이름만 언급) |
| Review §8 사용자 결정 21건의 확정값 | 이번 WO §6 에 일부만 보인다(아래). 나머지는 미확인 |

이번 WO §6 에서 확인되는 확정값과 Review §8 대응:

| WO §6 확정 | Review §8 |
|---|---|
| Ownership-first · organization / user / run / node ownership | A1 (부분) · C-3 (부분) |
| 실제 발주 확정 = 사용자 승인 | A3 → V2 §21 수정(ARCH §9-3 승계) |
| Cloud Browser authenticated session 은 별도 승인 전 불허 | B5 → ⓒ 공개 사이트 전용 |
| Strong Discovery = 하위 Discovery capability · V1 자산 재배치 | C-1 (부분 — 마감/동결 여부는 불명) |
| Request Device ≠ Execution Device · PC = Execution Node | C-4 (방향만 — EVOLUTION §5 개정 문구 불명) |

**확정값이 보이지 않는 항목**: A2 외부 도매 발주 정의 위치 · A4 POS · A5 PHILOSOPHY §6 · A6 Supplier LLM · A7 외부 가격 정본 위치 · A8 의약품 발주 법률검토 · B1 Local-first 폐기 · 3단 기억 계층의 명시 채택 · B2~B4 · B6~B9 · C-2 ingress 인증.

이 상태에서 EVOLUTION 부분 개정 · EXP D1/D2 개정 · V2 ACTIVE 문서를 쓰면 V2 본문과 결정값을 추측해 채우게 된다. 이는 WO §6 "Architecture 결정 임의 변경 금지" 와 §9 "추측하지 않는다" 에 어긋나므로 실행하지 않았다.

### L-3. 재개 조건

아래 중 하나가 주어지면 L-1 ENVIRONMENT_BASELINE 을 붙여 바로 Canonicalization 을 실행할 수 있다(추가 환경 조사 불필요 — 그 사이 정본 · 자동화 코드가 바뀌지 않았다면).

1. V2 초안 본문 + 기존 Canonicalization WO 원문을 대화에 다시 붙여넣는다. 또는
2. V2 초안 본문 + Review §8 의 미확인 결정 항목에 대한 확정값(또는 "V2 §24 의 선행 게이트로 남긴다" 지시)을 준다.

---

## 부록. 하지 않은 것

application runtime · DB · migration · 배포 설정 · `DEPLOY_FREEZE` · credential · OAuth 설정 · Local Agent · Chrome Extension · run resume · smoke · 구현 — 전부 0건. 정본 문서 수정 0건. 발견한 범위 밖 drift 는 보고만 한다:

- `README.md` §배포 "이행 상태: credential 의 environment secret 이전 · 저장소 사본 삭제는 **진행 전**" — 77fe15801 closure(environment 7 · repository 0) 및 실측(repository secret 0)과 어긋난다. README 는 CLAUDE.md §16-1 기준 문서 목록 밖이라 인라인 수정하지 않았다.
- `SETUP.md` 의 pnpm 10.25.0 과 이 PC 의 10.27.0 차이 — 정본 문제는 아님(로컬 편차).
