# AI 모델 삭제 제한 정비 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-22 (Asia/Seoul)
> **근거**: 사용자 보고 — AI 모델 목록의 삭제 버튼 비활성화

## 목표·경계

삭제 제한이 실제 설정과 일치하도록 정비한다. 사용 중인 모델을 강제 삭제하거나 기능을 중지하지 않는다. 기존 인증·revision CAS·transaction lock·삭제 표식·과거 사용량 보존을 유지한다. 운영 설정·DB·유료 API 호출은 실행하지 않는다.

- [x] T01 최신 main 전용 worktree에서 UI/API/실행 소비처와 관련 문서 조사
- [x] T02 고정 기본 목록과 실제 기본/선택/정책 참조를 구분하고 제한 해제 조건 확정
- [x] T03 사용처 변경 이후 삭제 가능하도록 참조 판정과 사용자 안내 구현
- [x] T04 정책/fallback 보호·삭제 후 설정 해제 방지·재조회·desktop/mobile 검증
- [x] T05 문서 보완·경로별 commit·push 및 미검증 범위 보고

## 조사

기준 main `3917a9522d`. `ModelControlService.references`는 관리자 선택이나 실제 정책과 별개로 9개 코드 모델 및 환경 모델을 항상 보호한다. UI는 보호된 모델의 삭제 버튼을 비활성화하고 hover title만 제공한다. 따라서 사용처를 새 모델로 지정해도 이전 기본 모델을 삭제할 수 없고 무엇을 바꿔야 하는지도 알 수 없다.

실행 소비처는 공통 질의, 편집/파일/검색, 업무 계획·강화/이미지, 상품·번역, KPA, LMS, Copilot/운영 행동, 관리자 블록, TTS로 대조한다. 이전 HUB는 현행 관리 대상으로 복구하지 않는다. 별도 정책·fallback·환경 설정의 참조는 자동 삭제/변경하지 않는다.

## 추가 사용자 결정·실행 기준

사용처별로 모델을 지정하고 해당 사용처 전체에 적용한다. 전체 서비스에 한 모델을 강제하지 않는다. 관리자 지정이 있으면 기존 코드·클라이언트 요청·캐시된 정책의 모델보다 우선하며 다음 새 호출부터 반영한다. 이미 진행 중인 호출과 생성 결과는 바꾸지 않는다.

- 기존 모델 삭제 버튼은 사용처/정책 확인 대화상자를 연다. 해당 사용처를 다른 모델로 저장한 뒤 참조가 모두 해제되면 같은 대화상자에서 삭제한다.
- 실제 기본 소비처가 없는 이전 목록 항목은 보호에서 제외한다. 기본 소비처가 있으면 관리자 지정이 없는 해당 사용처만 참조로 표시한다. 공통 기본 실행 경로·서버 환경·미연결 범위/연결 설정은 계속 보호한다.
- 공통 질의 정책을 쓰는 사용처와 상품/번역 scope는 모두 관리자 지정으로 대체된 뒤에만 이전 정책 모델 참조를 해제한다. 정책 row나 이력은 자동 수정하지 않는다.
- 관리자가 상품/번역 모델을 지정하면 이전 scope 정책의 fallback을 더 이상 실행하지 않는다. 같은 모델의 retry·기존 활성/한도·가격/정산 검사는 유지한다. 별도 fallback을 새로 지정하는 UI는 이번 범위가 아니다.
- 매장 콘텐츠 번역과 약국 상담 번역의 모델 지정은 분리한다. 기존 `policy.CONTENT_TRANSLATION` 지정은 읽기 시 양쪽으로 같은 값을 이어받고, 다음 정상 저장에서 기존 JSON에 반영한다. GET·schema/migration·과거 사용량은 변경하지 않는다. 두 사용처는 기존 과금 scope를 계속 공유한다.
- 삭제한 기본/정책 모델이 다시 필요한 지정 해제는 거부한다. 새 모델 지정은 다른 사용처에 영향을 주지 않는다.

## 검증·종료 기록

검증은 Node 22.18.0·pnpm 10.25.0, 합성 공급자 응답·계정 fixture와 시스템 Chromium을 사용했다. 실제 Google 로그인, 운영 모델 설정 변경, 유료 공급자 호출·청구 검증은 수행하지 않는다. 임시 PostgreSQL은 운영 접속 설정을 읽지 않는 loopback/tmpfs fixture이며 종료 후 삭제·잔존 확인한다.

이 문서는 개발·검증·push 트랙이다. PR·main·운영 배포 상태는 실제 실행 전 완료로 표시하지 않는다. 작업용 branch/worktree는 병합 전까지 보존한다.

| 검증 | 실제 결과 |
| --- | --- |
| API 핵심·HTTP 인가·registry·정책·번역·기존 과금 회귀 | 8 suites, 75 PASS |
| 최신 소비처 목록·PostgreSQL 참조·상담 진입 추가 검증 | 4 suites, 39 PASS. 위 검사와 중복되므로 합산하지 않음; PostgreSQL 5건 포함 |
| 관리자 전체 단위 테스트 | 30 files, 443 PASS |
| desktop1280×800 / mobile390×844 | 모델 CRUD·충돌·선택·재조회·삭제 안내/같은 대화상자 내 사용처 변경→삭제·보호 사유·설정 회귀·인가 16 PASS. 합성 Google auth 상태이며 실제 Google 로그인이 아님 |
| 타입·빌드 | API와 관리자 type-check/정식 build PASS |
| lint·문서 | 변경 TS/TSX eslint error/warning 0, 민감정보·링크·공백 확인 |

처음 HTTP 검사 1회는 sandbox의 listen EPERM으로 중단됐고, 허용된 로컬 포트 환경에서 재실행해 통과했다. 최초 browser 2건은 합성 응답이 동일 모델의 runtime 참조를 usage 참조로 덮어써 실패했다. fixture가 양쪽 참조를 함께 보존하도록 고친 뒤 4건, 최종 설정 회귀 포함 16건 PASS다. 이 실패를 운영 또는 실제 Google 인증 결과로 표시하지 않는다.

격리 PostgreSQL 검증 후 `o4o_aimodel_*` DB count 0을 확인했고 이번 `o4o-ai-delete-pg` tmpfs 컨테이너도 삭제했다. task label로 재조회한 컨테이너 잔존 0. 운영 DB/업무 데이터는 만들거나 변경하지 않았다.

## 현재 제한·후속 통합

실행 공급자/모델의 실제 제공·인증·가격은 확인하지 않았다. Qwen/DeepSeek 신규 adapter, STT, 전문 Vision OCR의 모델 제어·전체 비용/중지 통합, 퇴역 HUB 복구는 포함하지 않는다. 기존 공통 기본·환경·미연결 정책이 계속 참조하는 모델은 삭제를 차단하고 사유를 표시한다. 관리자 모델이 미지정인 사용처는 기존 운영 설정을 유지한다.

새 전체 공통 설정을 도입하지 않았다. 번역 두 사용처는 모델 선택만 독립적이며 한도/정산 scope와 활성 설정은 기존 계약을 공유한다. 지정 모델이 실패할 때의 별도 fallback 선택 기능은 후속이다.

현재 `DEPLOYMENT=REQUIRED`, main 병합·운영 배포 미실행. 기능 commit `c79a2edf63`의 원격 push를 확인했다. 이 종료 문서 보완은 별도 문서 commit으로 남기며 최종 SHA·원격 동일 여부·clean은 Git 인계에서 확인한다. PR 생성/PR CI는 아직 수행하지 않았다. worktree `/workspace/o4o-wt/ai-model-delete-usability`, branch `wo/ai-model-delete-usability`는 통합 전 `KEEP`이다.


## WORKTREE_DISPOSITION

- base: `3917a9522d50936e405db28d59a4ae9febff628f`
- main integration / deployment: 미실행 / REQUIRED
- local verification: 위 실제 실행 기록 통과, 운영 Google/유료 요청 미검증
- task fixture: DB·컨테이너 잔존 0, 기준 checkout 변경 없음
- verdict: KEEP — push 완료 branch를 후속 통합·검토용으로 보존
- 문서 정합: 삭제 제한의 실제 참조·정책 우선순위·번역 모델 분리를 TODO와 정본 후속 개발 절에 반영. 기존 실행 이력과 canonical index 상태는 수정하지 않음.

## 최신 main 기준 재검증 — 2026-10-24

원본 `wo/ai-model-delete-usability`의 `c79a2edf63`·`ab441c5950`은 보존하고, main `2234598f36dba17de9ea07700bde14835bae42d3`에서 전용 `wo/ai-model-delete-revalidation-20261024`를 만들었다. 두 커밋을 충돌 없이 적용했다. 원래 기준 이후 main 변경과 이번 13개 변경 경로의 교집합은 0건이다. 이는 코드 충돌 조사 결과이며 실행 검증을 대신하지 않는다.

### Shared Module Change Verification

#### Changed shared module

- `ModelControlService`: 모델 참조·삭제 보호·사용처별 선택 및 기존 번역 선택의 읽기 호환.
- `AiPolicyExecutorService`: 상품·번역의 관리자 모델 선택을 provider/key 해결보다 먼저 적용. 기존 활성 설정·요청 제한·quota·정산 경계 유지.

#### Consumer impact matrix

| 소비처 | 영향·확인 범위 | 검증 |
| --- | --- | --- |
| 관리자 API·모델 관리 화면 | 실제 참조 안내, 사용처 변경 후 삭제, revision 충돌, 접근 권한 | API HTTP·모델 제어, 관리자 단위/브라우저 검사 |
| `ai-query.service`·`ai-admin.service`·`ai-model-registry.service` | 기존 정책 작성과 모델 삭제의 공통 lock·삭제 표식 유지 | 모델 제어·정책 retirement·관리자 모델 검사 |
| `ai-proxy.routes`·`ai-proxy.service`·`ai-provider-runtime` | 기존 adapter 앞의 선택·provider·키·기능 검사 유지 | 모델 제어·관리자 transport 검사 |
| `runtime-models`·`kpa.routes`·`product-ai-tagging.service`·`operator-ai-llm.service`·`LmsAIService`·`structure-inference.service` | 공통 resolver와 사용처 ID 소비. 이번 소비처 구현 변경 없음 | 참조·선택 계약 검사 및 API 타입/build |
| `work-planner`·`web-research.service`·`tts-narration.controller` | 업무·검색·음성 모델 선택 소비 | 해당 기존 회귀 suite 및 모델 제어 검사 |
| `product-ai-content.service`·`content-ai-translation.service`·`consultation-translator` | 상품과 두 번역 사용처의 선택 우선순위, 미지정 시 기존 fallback, 기존 과금 scope 유지 | 사용처 authority·상담 번역·accounted execution 검사 |
| `health-functional-food-store-description-bulk-apply` | 정책 실행기 직접 소비. 실제 적용 CLI 실행 안 함 | 호출부 조사 및 API 타입/build |

심볼·import 및 기존 공유 번역 target 문자열을 검색했다. 변경 파일 경로의 literal-consumer 검사에서는 실행 중인 raw-source 계약이 나오지 않았으며, 별도 심볼 검색으로 위 runtime·테스트 소비처를 확인했다. 경로 검사 결과 0을 runtime 소비처 0으로 해석하지 않는다. 기존 route·role guard·API 인증·schema·migration·dependency는 추가 변경하지 않았다.

### 이번 실행 결과

- 고정 Node 22.18.0·pnpm 10.25.0, frozen lockfile 및 store 무결성 검사로 설치 완료.
- API 관련 8 suite / 81건 통과. PostgreSQL 15 모델 제어 fixture 포함, skip 없음.
- 비용·quota 회귀 1 suite / 15건 통과.
- 검색·업무 계획·음성 합성 소비처 회귀 3 suite / 27건 통과. 이번 API 검증 합계는 중복 없는 12 suite / 123건이다.
- 관리자 전체 단위 테스트 31 files / 448건 통과.
- 관리자 `build:with-typecheck` 통과(TypeScript 및 production Vite build).
- 공통 `build:packages`, API `type-check` 및 `build` 통과.
- `ai-model-controls.spec.ts` Chromium 4건 통과: PC 1280×800·모바일 390×844의 모델 등록/수정/revision 충돌/사용처 선택/재조회/해제/삭제와 익명·서비스 운영자 접근 경계. API·로그인 상태는 합성 fixture다.
- 변경 TS/TSX ESLint 오류·경고 0, 문서 민감정보 검사 및 diff 검사 통과.
- PostgreSQL fixture 종료 후 `o4o_aimodel_*` DB 잔존 0 확인. 이번 task label의 일회성 컨테이너도 제거하고 잔존 0 확인.

위 결과는 이번 전용 checkout의 실행 증거다. 원본의 과거 검증 수치와 합산하지 않는다. 운영 모델 설정·운영 DB·실제 Google 로그인·유료 공급자 호출은 실행하지 않았다. main 병합·원격 PR CI·배포는 이번 개발 검증의 완료 범위가 아니다.

첫 Chromium 실행은 2 worker·기본 30초 제한에서 PC/모바일의 `page.goto('/settings')`가 시간 초과했고 접근 경계 2건만 통과했다. 동시 타입/build 작업과 초기 Vite 변환이 있었고, Tailwind의 기존 `../../packages/ui/**/*.ts` node_modules 포함 경고도 출력됐다. 생성된 캐시를 재사용하고 `--workers=1 --timeout=90000`으로 전체 4건을 다시 실행해 통과했다. assertion·제품 소스·공통 테스트 설정은 완화하거나 변경하지 않았다. 최초 실패를 생략하거나 별도 성공 건수로 합산하지 않는다.

### 재검증 인계

검토 범위에서 추가 제품 결함은 발견하지 못해 원본 기능에 추가 코드 수정을 하지 않았다. 기존 기능 2개 커밋을 최신 main 위에 적용한 뒤 이 재검증 기록만 추가했다. 마지막 fetch의 main은 계속 `2234598f36`이며 기준 checkout의 파일 변경은 없다.

통합 담당은 `wo/ai-model-delete-revalidation-20261024`를 검토 대상으로 사용한다. 원본 branch를 다시 함께 병합하지 않는다. 이번 개발 담당 공간에서는 PR 생성·병합·배포를 실행하지 않았으므로 원격 PR CI와 최신 HEAD Codex 검토는 미실행이다. 운영 적용에는 별도의 실제 배포 검증이 필요하다(`DEPLOYMENT=REQUIRED`).

- worktree: `/workspace/o4o-wt/ai-model-delete-revalidation-20261024`
- branch: `wo/ai-model-delete-revalidation-20261024`
- base: `2234598f36dba17de9ea07700bde14835bae42d3`
- main integration / deployment: 미실행 / REQUIRED
- fixture: DB·컨테이너 잔존 0, Playwright가 시작한 개발 서버 종료
- verdict: KEEP — 통합 담당 검토와 후속 수정용
- 문서 정합: 원본 종료 이력은 보존하고 최신 main 기준 소비처 영향·실제 실행 결과·최초 실패 및 인계 범위를 이 절에 추가했다.
