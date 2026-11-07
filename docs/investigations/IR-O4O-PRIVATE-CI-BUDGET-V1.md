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

