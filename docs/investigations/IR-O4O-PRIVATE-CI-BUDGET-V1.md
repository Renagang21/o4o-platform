# O4O 비공개 전환 월 예산 조사 및 1차 절감 준비

> **상태**: DRAFT
> **작성일**: 2026-10-30 · **최종 갱신**: 2026-11-07
> **범위**: 향후 비공개 운영의 비용 절감. 월 100,000원은 희망 수준이며 필수 상한이 아니다. 비공개 전환은 별도 후속 작업이다. 현재 공개 여부·요금제·계정 예산은 변경하지 않는다.

## 1. 실제 조회 및 추정의 구분

2026-09-30~2026-10-29 UTC 생성 Actions run을 날짜별 pagination으로 조회했다. 총 9,414건이다.
종류별 기간 분산 표본 208건의 job 시작·종료 시각을 합산하고 job별 분 단위 올림으로 환산했다.
공개 저장소 timing API의 billable=0은 비공개 예상 실행시간 0으로 해석하지 않았다.

| 종류 | 전체 run | 월 실행시간 추정(분) |
|---|---:|---:|
| CI Pipeline | 2,633 | 69,774.5 |
| CodeQL | 2,626 | 9,628.7 |
| PR Size Labeler | 1,960 | 1,960 |
| Guard Policy | 1,015 | 1,015 |
| Delivery | 629 | 2,778.1 |
| Promote | 207 | 2,070 |
| 기타 | 344 | 1,547.3 |
| 합계 | 9,414 | 88,773.6 |

표준 private Linux $0.006/분·Windows $0.010/분 기준, Linux 88,510.3분·Windows 263.3분을 적용하면
차감 전 약 $533.69다. Pro $4 + 기본 제공 $18 차감 가정이면 약 $519.69다.
계정의 실제 구독/청구 내역은 조회하지 않았다. 저장 공간·외부 Sonar·Code Security 구독·Copilot 등은 제외다.
표본 기반이므로 오차 범위를 통계적으로 검증한 확정 견적이 아니다.
또한 공개 Linux 표준 runner는 4 vCPU/16GB, 비공개는 2 vCPU/8GB이다. 위 계산은 공개 실행시간이
그대로라는 가정이며, 비공개에서의 실행시간 증가·메모리 한계는 미실측이다. 전환 전 반드시 별도 확인한다.

공식 요금 확인 출처(2026-10-30):

- https://docs.github.com/en/billing/reference/actions-runner-pricing
- https://docs.github.com/en/billing/reference/product-usage-included
- https://github.com/pricing
- https://github.com/security/advanced-security
- https://docs.github.com/en/actions/reference/runners/github-hosted-runners

## 2. 비용 판단 기준 — 사용자 정정 반영

월 10만원은 넘지 않으면 좋은 희망 수준이다. 반드시 지켜야 할 상한으로 보지 않는다.
검증 품질·개발 속도·운영 편의를 함께 비교해 불필요한 실행과 반복 빌드를 줄이는 것이 목적이다.
이번 작업에서 비공개 전환·요금제 변경·Billing 예산/지출 차단 설정은 진행하지 않는다.
특정 금액을 맞추기 위한 검사 생략이나 배포 차단을 추가하지 않는다.

CodeQL 자동 실행을 전부 제거한다고 가정해도 gross 약 $475.92, Pro 차감 후 약 $461.92가 남는다.
따라서 보안 상품 제거만으로 큰 폭의 절감을 기대할 수 없다. CI가 주된 절감 대상이다.

## 3. 이번 branch의 안전한 1차 준비

1. `CI_COST_PROFILE=budget` opt-in: Draft PR의 무거운 검사 보류, docs 민감정보 검사 유지.
2. 보류된 Draft는 CI Gate 실패. Ready for review 전환에서 전체 검사, 이후 추가 commit에도 재검사.
3. main/develop push·배포 gate·매일 full Jest는 유지. profile 미설정이면 기존 동작.
4. budget에서 CodeQL 자동 실행 중지. private은 별도 명시적 enablement 없이는 수동도 실행하지 않음.
5. Sonar 공개 API 진단을 budget/private에서 생략. 외부 App 설정·구독은 미변경.
6. `actions-cost.mjs`: 읽기 전용 재계산. workflow·event·결과별 표본, job별 올림, 재실행 포함,
   날짜별 조회 및 밀집일 시간별 분할, pagination 누락·미지원 runner·조회 실패 시 추정 중단.
   인증은 기존 `GITHUB_TOKEN`/`GH_TOKEN`으로 HTTPS API만 호출한다. PATH를 통해 외부 실행 파일을 찾는 방식은 제거했다.

**월 10만원 이하 달성 여부를 이번 작업의 완료 조건으로 삼지 않는다.** 과거 run의 당시 Draft 상태는 이번 조사에서 확보하지 못했으므로
Draft 전환에 따른 절감률을 임의로 부여하지 않는다. 공개 여부/variables/budget/Sonar 연결은 미변경이다.

## 4. 전환 전 남은 작업

- 실제 최종 검증 횟수·job별 install/build/test 시간을 더 세분화한다. main과 PR의 중복 검증 재사용은
  target SHA/merge tree와 검사 설정의 일치를 검증해야 하며, 과거 green을 임의 재사용하지 않는다.
- API affected selector는 현재 shadow다. frontend를 읽는 API raw-source contract가 있으므로
  `api_affected=false`만으로 전체 API Jest를 생략하면 안 된다. full 결과 대비 누락 여부를 확인한 뒤 승격한다.
- 품질 검사·세 shard의 반복 install/dependency build를 캐시/공유할 수 있는지 측정한다.
  cache hit/miss 모두 같은 검사 결과를 내야 하며 lockfile·Node·플랫폼·소스 변경으로 무효화해야 한다.
- Sonar App의 private 지원·분석 코드량·기존 요금제는 계정에서 확인한다. 유료 구독 자동 시작 금지.
- 새 구성의 실행시간·저장 공간·구독 비용을 비교해 절감 효과를 보고한다. 비공개 전환은 이번 범위에서 진행하지 않는다.
- AI 리뷰는 이미 사용하는 개발환경에서 수행하며, 타인의 구독/사용자 계정으로 서버 background 자동 실행을 만들지 않는다.

## 5. 검증 및 인계

검증 결과·PR·HEAD는 개발 완료 보고에서 기록한다. 이번 변경은 저장소 검사 설정이며 production 배포 대상은 아니다.
main 병합 전까지 개발 담당이 검증·CI 지적 보완을 수행하며, main 병합과 계정 설정 변경은 통합 담당 영역이다.

## 6. 공통 API 의존성 빌드 재사용 — 후속 구현

기존 CI `41064168119` 기준 API Jest shard 1의 의존성 빌드는 62초, PostgreSQL 통합은 61초였다.
세 Jest shard와 통합 작업이 같은 패키지 빌드를 각각 수행한다. 품질 검사 내부의 별도 공통 빌드는 106초였으며 이번 캐시 범위에 넣지 않았다.

- `.github/actions/api-dependency-build`를 Jest 3 shard·PostgreSQL 통합·매일 full Jest에 연결한다.
- 최초/미일치 시 기존 `@o4o/api-server^...` 토폴로지 전체 빌드를 그대로 실행한다. 테스트 결과는 캐시하지 않는다.
- 동일 입력의 빌드 산출물만 복원한다. 실제 Node·ABI·pnpm·OS image·CI 환경·작업경로 및 추적 파일 내용을 fingerprint에 포함한다.
- API 구현/테스트(`apps/api-server/src/**`)와 `docs/**`는 패키지 컴파일의 소비자이므로 입력에서 제외한다. API manifest·모든 패키지·설정·다른 추적 파일은 포함한다.
- custom build command·API 구현 역참조·symlink 입력·추적된 dist/tsbuildinfo·누락된 metadata는 캐시를 사용하지 않는 방향으로 처리한다.
- 복원된 파일의 목록과 SHA-256을 receipt와 대조한다. 누락·추가·변조·symlink·key 불일치는 재빌드한다.
- 재빌드 전 해당 패키지 dist와 증분 상태만 정리한다. 소스는 변경하지 않는다.
- cache restore/save 서비스 실패는 검사를 생략하는 근거로 쓰지 않는다. `CI_BUILD_CACHE_DISABLED=true`로 재사용만 중단할 수 있다.
- 정기 검사의 Node도 저장소 기준 22.18.0으로 고정해 동일 환경에서 재사용한다.
- GitHub cache의 branch/PR 접근 제한은 그대로 유지하며 별도 write 권한이나 cache 용량 증액을 설정하지 않는다.

첫 cold 실행에서 동시에 시작한 job은 각자 빌드할 수 있다. 같은 입력의 cache가 존재하는 후속 실행부터 절감된다.
기대 절감은 cache hit당 기존 약 1분에서 fingerprint·복원·검증 시간을 뺀 값이며, 실제 cold/hot 실행으로 확인한다.
품질 검사·main 배포 gate·매일 full Jest·PR 최종 전체 검사는 유지한다. 전체 검사 결과의 PR→main 재사용은 이번에 도입하지 않는다.

공식 근거:

- https://github.com/actions/cache
- https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching

## 7. 절감 후보 — 문서 · 에이전트 설정 전용 변경의 full CI (2026-11-07 조사 · 미구현)

> 조사만 했다. 판정 규칙(`scripts/ci/detect-affected.mjs`)은 바꾸지 않았다. 검사 범위를 바꾸는 변경이라 별도 WO 로 구현한다.

### 7-1. 현재 판정 (코드 기준)

문서 빠른 경로(`docs_fast_eligible`)는 **변경 전체가 `docs/**` 의 Markdown 추가 · 수정**일 때만 참이다. 아래 경로가 하나라도 섞이면 full CI 를 탄다.

| 경로 | CI 축 판정 | 배포 축 판정 | 이 파일을 읽는 CI 검사 |
|---|---|---|---|
| `docs/**.md` (추가 · 수정) | 중립 → 빠른 경로 | 중립 | `docs-fast-validate` 가 그 문서를 읽는 test 만 선별 |
| `docs/**` 삭제 · 이동 · 비 Markdown | global → full | — | 기록물 존재를 단언하는 정적 spec (의도된 동작 · 유지) |
| 루트 `*.md` (`AGENTS.md` · `CLAUDE.md` · `README.md` · `SETUP.md` · `HANDOFF.md`) | `workspace 매핑 불가` → global → full | NON_RUNTIME → 배포 무영향 | 없음 — test 안의 등장은 판정기 시험의 입력 문자열 · 주석뿐 |
| `.claude/**` (settings · hooks · skills) | `workspace 매핑 불가` → global → full | NON_RUNTIME → 배포 무영향 | 없음 — ESLint 는 `ts/tsx` 만 검사하고(`eslint.config.js`), 훅 테스트 · `settings.json` 검증은 CI 에 등록돼 있지 않다 |
| `.agents/**` | `workspace 매핑 불가` → global → full | 매핑 없음 | 없음 |
| `.github/pull_request_template.md` | `.github/` 접두어 → global → full | `.github/` 중립 | 없음 — `.github/` 를 global 로 두는 이유(정적 spec 이 workflow 원문을 읽음)가 이 파일에는 해당하지 않는다 |

실측 사례:
- `4ed77ee634`(#966): `.claude/` · `AGENTS.md` · `CLAUDE.md` · `SETUP.md` · PR 템플릿 · 문서를 바꿨다. 판정기 재실행 결과 `global_or_unknown=true` → full CI 였고, Delivery 는 전 서비스 `NO_DEPLOY` 였다.
- 열린 PR #971: `.agents/` · `.claude/` · PR 템플릿 · 루트 md 4개 · `docs/` 를 바꾼다. 같은 이유로 full CI 대상이다.

### 7-2. 빈도와 규모 (표본 · 추정)

- 2026-10-08 이후 main first-parent 커밋 554건을 분류했다.
  - 이미 빠른 경로: 136건
  - **위 후보 경로로만 이뤄졌는데 full CI 를 탄 커밋: 17건**
  - 그 밖: 401건
- 같은 변경의 PR push 실행은 세지 않았다(미측정).
- job 시간(job 별 분 단위 올림 합계, 표본 각 2건):
  - full CI: `4ed77ee634` 11 job · 47분, `f96b70338a` 11 job · 49분
  - 빠른 경로: `435d0d10be` · `743b01ed28` 각 4 job · 5분
- main 만 보면 회당 약 42~44 job-분 차이다. 30일 17건이면 약 700 job-분 규모다.
  - 표본 2건 기준의 추정이며 청구액이 아니다.
  - PR 실행분은 별도로 더 생긴다.

### 7-3. 후보안 (안전 조건 포함)

1. **루트 `*.md` · `.agents/**` · `.github/pull_request_template.md` 를 빠른 경로 대상에 포함**
   - 추가 · 수정에 한한다. 삭제 · 이동은 지금처럼 global 로 둔다.
   - `docs-fast-validate` 의 소비 test 선별(`--mode=docs-specs`)이 이 경로도 보도록 넓힌다. 지금은 읽는 test 가 0이지만, 생기면 자동으로 선별되게 하기 위해서다.
2. **`.claude/**` 는 빠른 경로 + 전용 경량 검사**
   - 지금 full CI 는 이 경로를 실제로 검증하지 않는다. 그래서 빠른 경로로 옮겨도 잃는 검증은 없다.
   - 대신 `settings.json` JSON 파싱과 훅 `.mjs` 구문 검사(`node --check`)를 빠른 경로에 더하는 것을 함께 검토한다. 훅 테스트가 저장소에 들어오면 그것도 등록한다.
3. **Delivery Classify 는 유지(후보에서 제외)**
   - main CI 가 끝날 때마다 GCP 인증과 서빙 SHA 조회를 1회 한다. 2026-11-07 기준 최근 40회 중 39 success · 1 cancelled 였다.
   - 문서 전용이어도 commit status 기록과 서빙 상태 대조를 맡으므로, 절감폭(회당 약 1분)에 비해 변경 위험이 크다.

구현 시 지킬 것:
- `CI Gate` 이름 · needs · 실패 전파는 바꾸지 않는다. 빠른 경로 job 도 지금처럼 CI Gate 에 묶는다.
- main push 의 검증 취소나 테스트 삭제는 하지 않는다. 판정을 할 수 없는 경우는 지금처럼 full CI 로 떨어진다.
- `scripts/ci/__tests__/detect-affected.test.mjs` 에 경로별 회귀 사례를 추가한다. 루트 md · `.claude/` · `.agents/` · PR 템플릿의 추가 · 수정 · 삭제 · 이동과 코드 혼합을 다룬다.
- `.github/` 의 다른 파일(workflow · action · 그 밖의 템플릿)은 계속 global 로 둔다. 예외는 정확한 파일명 1개만 둔다.

> 후보안 1 · 2 는 2026-11-07 채택돼 #973 으로 구현 중이다.

## 8. 실행량 감축 우선 — Draft 1순위 · 트리거별 분해 · 짧은 job 통합 · 집 PC 재계산 (2026-11-07 조사 · 미구현)

> 조사와 제안만 한다. workflow · 스크립트 · 저장소 변수는 바꾸지 않았다. 구현은 아래 8-7 순서로 별도 PR 에서 한다.

### 8-0. 이번 절의 전제 (2026-11-07 사용자 결정)

1. 요금제는 **GitHub Pro** 로 간다. 포함 compute 는 $18/월이며 표준 Linux 기준 3,000분이다.
2. 집 PC 이전보다 **실행량 감축을 먼저** 한다.
3. 앞으로 클라우드 세션의 PR 은 **모두 드래프트로 자동 생성**된다. 그래서 Draft 비용 절약 모드(`CI_COST_PROFILE=budget`)를 감축 1순위로 올린다.
4. 드래프트 push 에서는 가벼운 검사만 한다. **Ready 전환과 main 대상 최종 커밋에서는 full CI 가 반드시 돈다.**

### 8-1. 방법 · 수치의 성격

- 대상 기간은 §1 과 같은 2026-09-30~10-29 UTC 이다. 생성된 run **9,414건 전체**를 날짜별로 조회했고, 하루 1,000건 이상이면 시간별로 나눠 조회했다.
- 표본은 workflow · 트리거 · branch 종류 · 결과의 **71개 층**에서 층마다 최대 10건, 기간에 고르게 뽑았다(총 **429 run**).
  - job 별 시작 · 종료 시각으로 실제 시간을 구했다.
  - 청구 기준 시간은 job 별 분 단위 올림으로 환산했다.
  - 재실행 attempt 는 포함했고 job id 중복은 제거했다.
- **월 청구 기준 추정 92,470분**(실제 실행시간 73,277분)이다.
  - §1 의 88,774분과 약 4% 차이다. 층 구분에 branch 종류를 더한 데 따른 표본 차이다.
  - 이 절의 수치는 서로 비교할 수 있도록 모두 이 92,470분 기준이다.
- 모두 public 실행시간 기준의 **표본 추정이며 청구액이 아니다.**
  - private 표준 실행기(2 vCPU / 8GB)는 public(4 vCPU / 16GB)보다 느릴 수 있다(미실측).
  - 금액은 표준 Linux $0.006/분으로 환산했다.
- 재현용 조회 스크립트는 저장소에 넣지 않았다(조사 전용). 같은 방법은 `scripts/ci/actions-cost.mjs` 의 층화 표본과 같다.

### 8-2. 실행량이 어디서 나오는가 — 트리거 × branch 종류

| 트리거 | branch | run | 월 분(청구 추정) | 비중 | 주요 workflow |
|---|---|---:|---:|---:|---|
| `pull_request` | `wo/*` | 6,846 | 58,119 | **62.9%** | CI Pipeline 1,942 · CodeQL 1,942 · Size Labeler 1,946 · Guard Policy 1,013 |
| `push` | `main` | 1,344 | 23,822 | **25.8%** | CI Pipeline 664 · CodeQL 664 |
| `workflow_dispatch` | `main` | 437 | 5,128 | 5.5% | Promote 207 · PharmacyHub QR cutover 111 · WIF smoke 35 · 배포 수동 실행 |
| `workflow_run` | `main` | 665 | 3,811 | 4.1% | Delivery 624 · deploy-auto(은퇴) 35 |
| `schedule` | `main` | 34 | 560 | 0.6% | 정기 full Jest 30 · CodeQL 주간 4 |
| `pull_request` | 그 밖(`feat/` · `docs/` · `work/` 등) | 44 | 493 | 0.5% | CI · CodeQL · Labeler |
| `workflow_dispatch` | `wo/*` · 그 밖 | 38 | 533 | 0.6% | 수동 CI · `deploy/*` 태그 배포 |
| `push` | `wo/*` · 그 밖 | 6 | 10 미만 | 0% | 진단용 workflow |
| **합계** | | **9,414** | **92,470** | | |

- 이 기간에 `claude/*` branch run 은 0건이다. 클라우드 세션 PR 의 자동 드래프트는 이후 정책이라 이 표에 반영되지 않았다.
- **PR 이 실행량의 63%** 를 만든다. PR 523개 · head SHA 1,960개로, PR 하나당 평균 3.75번 push 했다.
  - push 횟수 분포(PR 수): 1회 177 · 2회 112 · 3회 72 · 4회 40 · 5회 29 · 6~9회 58 · 10회 이상 35.
- PR 의 CI Pipeline 은 한 SHA 에 1번 돈다(1,954 SHA 중 2번 돈 것은 1건). PR 의 cancelled run 은 738건(CI 578 · CodeQL 149 · Guard 11)이다. 새 push 가 앞 실행을 취소한 것이고, 취소 전까지의 시간은 청구된다.

workflow 별 비중(청구 추정): CI Pipeline 71,501 · CodeQL 8,375 · Promote 4,412 · Delivery 3,743 · Size Labeler 1,963 · Guard Policy 1,015 · 정기 Jest 529 · 그 밖 932.

### 8-3. 1순위 — Draft 비용 절약 모드 효과 추정과 구현안

**효과 추정.** PR 마다 마지막 head SHA 를 "최종 커밋"으로 두고, 그 전 SHA 의 실행을 드래프트 단계 후보로 셌다.

| PR workflow | 최종 SHA 실행 | 그 전 SHA 실행 |
|---|---|---|
| CI Pipeline | 11,779분 (521 run) | **39,274분** (1,435 run) |
| CodeQL | 1,208분 | 3,368분 |
| Size Labeler | 525분 | 1,438분 |
| Guard Policy | 216분 | 799분 |
| **PR 합계** | **13,729분** | **44,883분 (77%)** |

- private 에서는 CodeQL 이 원래 자동 생략된다(§3 · `CODEQL_PRIVATE_ENABLED` 미설정). 그래서 Draft 효과는 CodeQL 을 뺀 41,515분에서 계산한다.
- 드래프트 push 마다 가벼운 검사(아래 L1)로 약 4분이 든다고 보면(1,435 run × 4 = 5,740분):

| 시나리오 | 가정 | 월 절감(추정) |
|---|---|---:|
| A 상한 | 최종 커밋 전까지 계속 드래프트 | **약 35,800** |
| **B 기준** | push 가 2번 이상인 PR(346개)마다 Ready 뒤 보완 push 1번이 full | **약 27,200** |
| C 보수 | push 가 3번 이상인 PR(234개)은 Ready 뒤 full push 1번 더 | **약 21,300** |

- 과거 PR 의 드래프트 상태 이력은 쓰지 않았다(지금까지는 대부분 바로 Ready 였다). 실제 효과는 세션이 언제 Ready 로 바꾸는지에 달렸다. 활성화 후 2주간 `actions-cost.mjs` 로 실측해 시나리오를 확정한다.

**구현안 (별도 PR · 저장소 변수 `CI_COST_PROFILE=budget` 설정은 통합 담당 결정).** 지금 코드에서 이미 동작하는 것과 더해야 할 것을 나눈다.

| 항목 | 지금 코드 | 필요한 변경 |
|---|---|---|
| 드래프트 PR 의 무거운 검사 유예 | `defer_full` = budget · `pull_request` · draft 일 때만 참 → 무거운 job 11개 skip | 없음 |
| 드래프트에서 도는 가벼운 검사 | Detect · Docs sensitive guard 만 | **L1 가벼운 검사 job** 추가(또는 8-4 의 통합 job 으로 겸함): 문서 민감정보 · RoleGuard 정적 검사 · `.claude/` 검사 · `check-forbidden-tables` · `check-unsafe-routes` · console.log 검사. 설치 없이 1분 안팎. 선택안 L2: 영향 workspace type-check(설치 포함 약 3~4분) |
| 드래프트의 CI Gate | 실패로 표시(`Draft PR requires final validation`) — green 으로 병합 준비된 것처럼 보이지 않음 | 없음. L1 이 실패하면 메시지를 L1 실패로 구분해 보여 준다 |
| Ready 전환 시 full | CI Pipeline `types` 에 `ready_for_review` 포함 → 같은 head SHA 로 full 실행 | 없음 |
| Ready 후 push | `synchronize` 이고 draft=false → full | 없음 |
| main 대상 최종 커밋 | main `push` 는 `defer_full` 대상이 아님 → 항상 full. 배포 gate 도 main CI green 을 요구 | 없음 |
| 다시 드래프트로 | `converted_to_draft` → 유예 · CI Gate 실패 → Ready 전까지 병합 불가 | 없음 |
| Size Labeler | `opened` · `synchronize` 마다 실행 | `if: !github.event.pull_request.draft` + `types` 에 `ready_for_review` 추가 |
| Guard Policy | 드래프트도 실행 · `ready_for_review` 미포함 | 드래프트는 L1 에서 실행하거나 skip. **`ready_for_review` 를 `types` 에 추가**해 Ready 시 반드시 실행 |
| CodeQL | budget 이면 자동 실행 중지 · private 이면 기본 생략 | 없음 |
| Codex 리뷰 | 드래프트 → Ready 전환 때 실행 | 없음(드래프트 push 마다 돌지 않음) |
| 회귀 시험 | `actions-cost.test.mjs` 가 budget · draft 계약을 고정 | Labeler · Guard 의 draft skip · `ready_for_review` 포함 시험 추가 |

- 드래프트 PR 은 GitHub 에서 병합할 수 없다. 병합하려면 Ready 가 필요하고, Ready 는 full CI 를 다시 돌리며, required check `CI Gate` 가 그 결과를 요구한다. "full 없이 병합"되는 경로는 없다.
- budget 모드는 public 기간에 켜도 동작은 같다. public 은 무료라 비용 효과는 private 전환 뒤에 생긴다.

### 8-4. 1분 미만 job 통합 — 올림 손실

- 실행시간 60초 미만 job 은 월 약 **17,100개**이고, 분 단위 올림으로 생기는 손실은 약 **12,000분**이다.
- 전체 올림 손실은 19,200분(청구 추정 92,470 − 실제 73,277)이다.

| job | 월 청구(추정) | 실제 | 처리안 |
|---|---:|---:|---|
| Docs sensitive info guard (CI) | 2,594 | 656 | **Detect job 의 step 으로 이동**. 같은 checkout 을 쓰고 약 15초가 늘어도 Detect 는 1분 미만 그대로다 |
| Detect affected scope (CI) | 2,668 | 1,190 | 유지 — 다른 job 의 입력이다. 위 guard 들을 흡수한다 |
| CI Gate | 2,536 | 146 | **유지** — required check 집계 job 이다(`if: always()` · 실패 전파). 합치면 gate 계약이 깨진다 |
| CodeQL Detect | 2,614 | 1,200 | private 에서는 job 자체가 생략된다 → 0 |
| Apply Size Labels | 1,963 | 170 | 드래프트 skip + Ready · opened 만(8-3) → 약 525. 라벨을 쓰지 않으면 폐지도 선택지다(사용자 결정) |
| Guard Static Analysis (RoleGuard) | 1,015 | 457 | **CI Pipeline 의 Detect(또는 L1)로 흡수**. `services/web-*/src/**` 변경일 때만 실행하던 path 조건은 step 조건으로 옮긴다 |
| Delivery Classify | 1,106 | 691 | 유지(§7-3 · 서빙 상태 기록) |

- Labeler 를 CI Pipeline job 에 합치는 안은 채택하지 않는다. CI job 에 `pull-requests: write` 권한을 줘야 하기 때문이다(PR 코드를 실행하는 job 의 권한 확대).
- 효과: Draft 적용 뒤 기준으로 Docs guard 이동 약 2,600 + Guard 흡수 약 200(최종 SHA 분, 드래프트 분은 8-3 에 포함)으로 **약 2,800분**이다.
  - Draft 를 적용하지 않으면 Guard 흡수가 약 1,000 이 된다.
  - Labeler 절감은 8-3 에 포함했다.

### 8-5. 감축 후 남는 양과 집 PC 실행기 (2~3개 병렬 · vars 전환)

**감축 순서별 잔여 (월 분, 청구 추정):**

| 단계 | 잔여 | 감소 |
|---|---:|---:|
| 현행 (public 실행시간 기준) | 92,470 | |
| private 에서 CodeQL 자동 생략 (이미 코드에 있음) | 84,095 | −8,375 |
| Draft 비용 절약 모드 (시나리오 B · A~C 범위 −35,800~−21,300) | 56,935 | −27,160 |
| 1분 미만 job 통합 (8-4) | 54,125 | −2,810 |
| 문서 · 에이전트 설정 빠른 경로 (#973 · main 분만 실측) | 약 53,400 | 약 −700 |
| **감축 후 합계** | **약 53,400** (A~C 범위 약 45,000~60,000) | |

**감축 후 GitHub 실행기에 반드시 남는 것: 약 9,200분/월.**
- Delivery 3,743 · Promote 4,412 · 배포 수동 실행 · 테스트 약 520 · Windows 설치 테스트 약 70 · 정기 Jest 판정 job 약 30 · 그 밖 일회성 약 400.
- Promote 207회는 이 기간의 cutover 작업으로 많아진 값일 수 있다.
- **이 잔여만으로 Pro 포함 3,000분을 넘는다.** 배포 계열을 집 PC 로 옮기는 것은 OIDC · production 경계 정책이라 이번 범위 밖이다.

**집 PC 로 옮길 양:** 약 44,200분/월(청구 기준). 실제 실행시간은 약 37,000분이다.

**2~3개 병렬 기준:**
- 시간당 처리 능력은 실행기 2개면 120 job-분, 3개면 180 job-분이다.
- 옮길 workflow 의 시간대별 수요(감축 전 실제 job-분/시간)는 최대 779 · p95 409 · p90 275 · 중앙값 109 였다. 한국 시간 9~16시와 20~23시가 많다.
- 감축 후 수요를 0.6배로 잡으면, 처리 능력을 넘는 시간은 월 **2개일 때 95시간(초과 7,300 job-분이 대기열로 밀림) · 3개일 때 38시간(초과 3,700 job-분)** 이다.
- **3개를 권장한다.** RAM 64GB 기준으로 Jest 최대 RSS 약 4.5GiB × 3 에 PostgreSQL service container 를 더해도 여유가 있다. WSL `memory` 는 32GB → 48GB 상향을 검토한다. CPU 12스레드면 job 하나에 약 4스레드다.

**병렬 전 필요한 변경 (별도 PR):**
- `Central operator PostgreSQL integration` 이 host port `55432` 를 고정으로 쓴다. 같은 PC 에서 동시에 돌면 충돌한다. job `concurrency` 로 직렬화하거나 포트를 동적으로 바꾼다.
- 실행기는 각자 설치 폴더(작업 폴더)를 따로 쓴다. 기본 동작이다.

**vars 전환 (PC 꺼짐 대비):**
- PC 가 꺼지면 `CI_RUNNER_LINUX` 를 삭제해 GitHub 실행기로 돌린다. 자체 실행기 label 로 이미 대기 중인 job 은 옮겨가지 않으므로 취소 후 re-run 한다(§9 runbook).
- 그동안 비용: 옮길 양 기준 하루 약 1,470분, 약 $8.8 이다. Pro 포함분은 배포 잔여가 이미 소진하므로 전부 유료다.
- 변수 자동 전환(PC 상태 감지)은 `variables: write` 토큰이 필요하다. 권한 위험이 있어 이번에는 제안하지 않는다(수동 전환 + 알림 유지).

### 8-6. 요약 — 비용 비교 (Pro · 표준 Linux $0.006/분 · 청구 추정)

| 구성 | GitHub 실행기 월 분 | Pro 3,000 대비 초과 | 월 비용(Pro $4 제외) |
|---|---:|---:|---:|
| 현행 그대로 private | 92,470 | 89,470 | 약 $537 |
| CodeQL 생략만 | 84,095 | 81,095 | 약 $487 |
| **감축 완료(8-3 · 8-4 · #973)** | **약 53,400** (45,000~60,000) | 약 50,400 | **약 $302** ($252~$342) |
| **감축 + 집 PC 3대** | **약 9,200** | 약 6,200 | **약 $37** |
| 참고: Free 2,000 기준 감축 + 집 PC | 약 9,200 | 약 7,200 | 약 $43 (ruleset · Environment 제약 있음 — §6) |

(전기료 · Artifacts · cache 저장 · 별도 유료 서비스 제외)

### 8-7. 구현 순서 (각각 별도 PR)

1. **Draft L1 가벼운 검사 + Labeler · Guard 드래프트 처리 + `ready_for_review` 보장**(8-3). 회귀 시험을 포함한다. 병합 후 통합 담당이 `CI_COST_PROFILE=budget` 을 설정한다.
2. **짧은 job 통합**(8-4): Docs guard · RoleGuard 를 Detect 로 옮긴다. CI Gate 의 이름 · needs · 실패 전파는 유지한다.
3. #973(문서 · 에이전트 설정 빠른 경로) 병합.
4. 2주 실측(`actions-cost.mjs`)으로 8-3 시나리오와 8-5 잔여를 확정한다.
5. private 전환 → 집 PC 실행기 3대 등록 → port 55432 직렬화 → `CI_RUNNER_LINUX=self-hosted`.

