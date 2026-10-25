# O4O AI 업무 Core + Extension 연결 검증

> **상태**: ACTIVE — 개발 검증·main 통합·이번 배포 완료. 실계정 업무·유료 AI 검증과 후속 범위는 남음
> **작성일**: 2026-10-24 · **최종 갱신**: 2026-10-25 (Asia/Seoul)
> **근거 WO/IR**: [전체 정비 TODO](../work-orders/TODO-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md) · [조사 §7](../investigations/IR-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md#7-후속-코드-대조구현-판정-2026-10-24)
> **현행 계약**: [기반 문서 §14](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md#14-업무-공통-연결과-첫-적용--개발-branch-2026-10-24) · [공급자 경계](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md)

**기록 구분:** §1~§5는 2026-10-24 개발/push-only 회차의 증거다. 현재 main·배포 확정 결과는 §6-1을 따른다.

## 1. 검증 범위와 기준

같은 WO의 준비 branch `wo/ai-work-extension-preparation`에서 S1~S4를 연속 구현했다. 기준은 준비 HEAD `524c329875`와 포함된 main `355d77e861`이다. push 전 확인한 main `197b41d0b5`의 후속 변경은 상품 배포 기록과 CMS/퇴역 slug·서비스 종료 경계이며 이번 수정 소스와 직접 중첩되지 않는다. main의 후속 변경을 이 branch의 실행 결과로 합산하지 않는다.

검증 대상은 공통 runtime 조립, 매장·공급자·협력 모임의 요청 기반 현황 설명, 상품 정정 검토안, 태그와 Assistant 판정의 비용 연결, 모델 관리 목록/선택/삭제 참조다. 기존 Core/업무 권한·자료 소유·초안 저장·업무 처리 API를 재사용했다. 실제 공급자 호출·운영 DB/설정 변경·PR/원격 CI·병합·배포는 실행하지 않았다. DEPLOYMENT = REQUIRED이며 실행은 통합 담당에게 인계한다.

## 2. 회귀 결과

Node 22.18.0 / pnpm 10.25.0을 사용했다. 명령은 작업 worktree 루트에서 실행했으며 반복 결과를 합산하지 않는다.

| 검증 | 명령·실제 결과 |
|---|---|
| workspace 설치 | `CI=true pnpm install --frozen-lockfile --prefer-offline --ignore-scripts --store-dir /workspace/.o4o-tools/pnpm-store` PASS. 새 외부 패키지 없이 store/coop에 기존 AI UI workspace link만 추가 |
| 공통 패키지 | `pnpm run build:packages` PASS. AI UI 패키지는 src export이며 자체 build script 없음 |
| API | `pnpm --filter @o4o/api-server run build` PASS. 전체 Jest와 실패 해소·focused 7 suites / 134 tests PASS는 아래 회귀 기록 참조 |
| 매장 웹 | `pnpm --filter store-web run type-check`, `pnpm --filter store-web run build` PASS. 전체 Vitest 72 files / 823 tests PASS |
| 공급자 웹 | `pnpm --filter @o4o/web-neture run build`의 tsc + Vite PASS. 루트의 `pnpm exec vitest run --config services/web-neture/vitest.config.mjs --maxWorkers=2`: 149 files / 1,294 tests PASS. 별도 type-check script는 없음 |
| 협력 모임 웹 | `pnpm --filter @o4o/web-pharmacy-coop run type-check`, `pnpm --filter @o4o/web-pharmacy-coop run build` PASS |
| 관리자 웹 | type-check·build PASS. 전체 Vitest 31 files / 462 tests PASS 후 AI 검토안 2개 사례 추가. 변경 파일 재검증 `pnpm --filter @o4o/admin-dashboard exec vitest run src/pages/o4o-product-db/ProductCorrectionWorkspace.test.tsx --maxWorkers=2`: 1 file / 14 tests PASS |
| 공통 패널 | 기존 매장 도우미 회귀와 신규 패널의 Vitest 2 files / 14 tests PASS. 자동 호출 없음·0/null 구분·동시 클릭 잠금·범위 변경 중 늦은 응답 폐기·실패 후 수동 업무 유지 |
| lint | 변경 TS/TSX/CJS 파일에 `pnpm exec eslint <변경 경로...>` 실행. 오류 0·경고 0 PASS |

API 최초 전체 실행은 567 suites / 9,199 tests가 통과했으나 4 suites가 실패했다. 고정된 목록 개수 31을 사용하던 HTTP 테스트와 회계 경로의 기존 HTTP fixture를 수정했다. `--ignore-scripts` 설치로 빠진 SQLite native binding은 이 worktree의 Node 헤더로 로컬 빌드했으며 테스트/정책을 우회하지 않았다. 새 UI workspace 의존성의 매장 Docker manifest/source COPY 누락도 고쳤고 store/lecture/coop 의존 closure를 회귀했다. 수정 후 실패 4 suites를 각각 재검증해 통과했으며 전체 API도 재실행했다. 재실행은 571 suites / 9,225 tests PASS, 51 suites / 760 tests skipped, 1 suite / 1 test FAIL이었다. 남은 실패는 새로 검사에 포함한 coop Dockerfile의 기존 `RUN --mount` 다중행을 테스트 파서가 인식하지 못한 건이었다. 파서를 보완하고 closure 1 suite / 3 tests를 재검증해 PASS했다. 마지막 매장 canonical service 귀속 수정 후 해당 HTTP/현황 2 suites / 17 tests도 PASS했다. 단일 전체 실행의 모든 항목이 PASS했다고 표시하지 않으며 현재 확인된 미해결 실패는 없다. 기존 Jest의 강제 종료/남은 타이머 경고와 skip은 숨기지 않고 운영 검증으로 합산하지 않는다. DB 장애 시 0건 성공으로 바꾸거나 인증·quota guard를 낮추지 않았다.

최종 카탈로그에서 Assistant 판정과 상품 태그의 실제 회계 scope를 표시한 뒤 관리 서비스·사용량 SQL·관리 HTTP 3 suites / 38 tests를 재검증해 PASS했다. 이 상태의 API build도 PASS했다. 전체 실행·focused·HTTP·카탈로그 결과는 서로 중복되므로 합산하지 않는다.

## 3. 권한·비용·결과 경계

- `ai-overview-http.spec.ts`: 3개 host에서 무인증·임의 body/지표·타 매장·공급자 정지·모임 권한 부재를 provider 이전에 거부한다. 매장 host의 `kpa`를 기존 canonical `kpa-society` 문맥/회계 귀속으로 확인한다. 인증·도메인 조회 응답은 fixture이고 실제 HTTP handler → Extension → runtime은 실행한다. 운영 계정의 실권한 검증으로 확대하지 않는다.
- `ai-dashboard-overview.spec.ts`: 확인된 0과 자료 조회 실패를 구분하고 전체 미확인일 때 호출하지 않는다. provider 실행 중 권한 회수 시 결과를 전달하지 않는다. 매장 쿼리의 조직 바인딩을 확인한다.
- `product-correction-ai-draft.spec.ts`와 관리자 UI 테스트: 읽기 전에 권한 확인, 기준 revision 충돌·실행 중 버전 변경 거부, 원문 fingerprint 유지, 파싱 실패 후 유료 재시도 없음, 공식 상품/작업 기록 자동 저장 없음. AI 제안은 편집 중 입력과 별도이며 명시 선택으로 삽입한다.
- `ai-work-extension-runtime.spec.ts`: 거부 전에 모델/회계 실행 없음, 검증된 actor 귀속, 다른 actor/부담 주체 거부, scheduler에 가짜 사용자 없음, 공통 이력에 prompt/credential 없음. 모델 성공 후 출력 파싱 실패를 재호출하지 않는다.
- `ai-usage-model-authority.spec.ts`와 기존 모델·quota 회귀: 현황 3종의 관리자 모델 우선권·지정 시 예전 fallback 억제, scope 불일치 거부·기존 비활성 gate 유지, 뉴스 공통 모델 참조 삭제 보호. Assistant 이해/완료 검증의 SERVICE_QUERY·인증 actor 전달도 기존 판정 테스트에서 확인한다.

## 4. 브라우저 검증과 제한

전용 임시 Vite harness에서 실제 `AiOverviewPanel`과 `ProductCorrectionWorkspace`를 실행했다. API·write access만 합성 fixture로 대체했으며 운영 계정·DB·외부 LLM에 연결하지 않았다. Chromium/Playwright의 새 임시 context를 사용했고 공유 사용자 browser profile을 사용하지 않았다.

1280×900과 390×900 각각 PASS. 최초 AI 호출 0회, 사용자 요청 후 현황 설명·AI 검토안 각각 1회, 범위 변경 시 이전 설명 제거, 0건/미확인 분리, 입력 중 초안 보존, 사용자 삽입 후 자동 저장 0회, document 가로 overflow·page error 0건을 확인했다. 모바일 화면도 직접 확인했다. screenshot은 `/tmp/o4o-ai-work-smoke-1280.png`, `/tmp/o4o-ai-work-smoke-390.png`의 합성 자료이며 저장소에 포함하지 않는다.

이 검증은 공통 패널·상품 작업 UI 동작 검증이다. 매장/공급자/모임 전체 shell의 실제 로그인·서비스 전환, 운영 모델 인증/응답 품질·요금/한도 설정, 실계정 자료 접근은 미확인이다. 테스트 계정 정본 `docs/local/TEST-ACCOUNTS.local.md`는 작업·기준 checkout 양쪽에서 누락됨을 확인했고 과거 계정으로 대체하지 않았다. 새 API의 route·권한 host는 HTTP fixture와 소스 소비처 검증으로 확인했다. 실제 주문·게시·업무 데이터를 생성하지 않아 정리할 운영 업무 데이터도 없다.

## 5. 인계·잔여 범위

전문 OCR·Home/계획/vision/research·멀티모달 직접 transport·Qwen 편집·음성의 전체 비용/admission 이관, 태그 서버 작업의 사용자별 귀속, 새 상태 변경 도구의 대상/version 확인·멱등 실행, 역할별 실계정 검증은 TODO의 미체크 항목으로 남긴다. 기존 편집·외부 AI 연결·운영자 처리·Assistant Task/Memory는 KEEP이며 모두 새로 구현했다고 표시하지 않는다.

공급자 정책은 사용자가 허용한 자체 집계 설명 범위로 콘텐츠 운영 원칙·Supplier 경계·Assistant의 정책 참조에 반영했다. 과거 WO/CHECK·canonical index·Auth/RBAC Core는 변경하지 않았다. 문서 정합 검사: 변경 7개 문서의 민감정보 패턴 0건, 상대 파일 링크 165개·이번 변경의 anchor 7개 유효, `git diff --check` PASS.

WORKTREE_DISPOSITION: worktree `/workspace/o4o-wt/ai-work-extension-preparation` · branch `wo/ai-work-extension-preparation` · base `355d77e861` 포함 · main integration/원격 CI/배포/운영 smoke 미실행 · local fixture smoke PASS · verdict KEEP. 최종 SHA와 미커밋/원격 일치는 push 후 인계 보고를 따른다.

## 6. main 통합·배포 실행 (2026-10-25)

사용자가 main 병합·배포를 명시 지시하여 이 공간에서 통합을 이어간다. 위 개발/push-only 기록은 이전 회차의 증거다. 구현 HEAD `fd4caf2cbf7d958718fd688db391eecf2860c12b`에 최신 main `b88031578952e727702c83c027cc848053408f89`를 정상 merge했다(`97a4be4efd`, 충돌 없음). 통합한 상태에서 API build와 핵심 Jest 7 suites / 58 tests PASS를 확인했다. 기존 전체/화면 검증과 합산하지 않는다.

현재 main ruleset은 PR 필수·`CI Gate` 필수·필수 human approval 0·삭제/force push 금지다. 기존 동일 head PR은 없었으며 새 PR에서 정확한 HEAD의 required CI·리뷰·미해결 사항을 확인한 뒤 병합한다. 운영 배포 workflow는 기존 경로를 사용하고 freeze·CI·WIF/계정 gate를 변경하지 않는다. Actions 변수 직접 조회는 앱 권한 403이므로 freeze가 해제됐다고 추정하지 않고 workflow의 실제 판정을 따른다.

변경에는 새 migration·DDL·운영 설정·인증 정보가 없다. 기존 API 배포의 migration Job과 verified rollout은 표준 경로로 유지한다. 일반 Delivery가 서비스별 serving SHA와 누적 diff를 판정하고 필요하면 소유자 `promote.yml` 경로로 승인된 target만 배포한다. 협력 모임 웹은 별도 `deploy-cooperative.yml`의 `frontend_only=true` 경로를 사용하여 조합·회원·운영자 데이터 등록/변경 없이 웹만 배포한다. API 반영과 동일 SHA/호환성 확인 후 진행한다.

실행 전 조회한 최근 CI·Delivery·Promote는 모두 완료 상태였고 진행 중인 운영 배포는 없었다. PR/병합 SHA·CI·최종 배포/서빙 결과와 공개 smoke의 확정 결과는 확인 후 이 절에 기록한다. 실제 유료 AI 호출·업무 데이터 생성·신규 외부 계약/인증 설정은 이번 배포 검증에 포함하지 않는다.

[PR #805](https://github.com/Renagang21/o4o-platform/pull/805)의 자동 리뷰에서 정산 상세·정책 표시 P2 2건을 확인해 같은 branch에서 보완했다. STORE_INSIGHT를 기존 동적 서비스 scope 집계에 포함하여 실제 reservation의 service/month에 따라 상세를 계산하고 전역 scope 총액을 다른 서비스에 더하지 않는다. 기존 service 미지정 호출의 `store` 기본값과 정산 총액·확정/결제 경로는 유지한다. 관리 목록의 scope 정책 조회 대상도 카탈로그의 실제 `selection=scope` 정의에서 모아 매장·공급자·협력 모임의 저장 모델·활성/중지 설정을 표시한다. 재현 회귀를 포함한 정산/관리/HTTP 4 suites / 51 tests와 API build·변경 파일 lint PASS를 확인했다. 새 DDL·원장 보정·운영 정산 상태 변경은 없다.

### 6-1. 통합·배포 확정 결과

PR #805의 최종 HEAD `ba1338e0596863e9623b4dc5cf43482b06b2ccb2`에서 [PR CI 40147773182](https://github.com/Renagang21/o4o-platform/actions/runs/40147773182)의 필수 CI Gate·API 3개 shard·품질 검사·관리자/영향 웹 빌드가 PASS했다. CodeQL·SonarCloud PR 분석도 PASS했다. 앞 HEAD의 CI는 수정 push로 대체돼 취소됐으며 검증 근거로 합산하지 않는다. 자동 리뷰 P2 2건은 재현·수정·회귀 후 해결 처리했고 미해결 thread는 0건이었다. 필수 human approval 0인 실제 ruleset을 따랐고 bypass/force push를 사용하지 않았다.

main `b880315789`를 포함한 상태에서 병합 직전 HEAD·CI·thread·main을 재대조했다. PR #805는 main `8de024e92cb071790408ca403e110abb4cc29d61`에 병합됐다. 이 main의 [CI 40148604543](https://github.com/Renagang21/o4o-platform/actions/runs/40148604543)와 [CodeQL 40148604539](https://github.com/Renagang21/o4o-platform/actions/runs/40148604539)도 PASS했다.

| 대상 | 확정 결과 | 실행 근거 |
|---|---|---|
| API | `8de024e92c` DEPLOYED · revision `o4o-core-api-04192-zil` | [Delivery 40149352759](https://github.com/Renagang21/o4o-platform/actions/runs/40149352759)의 verified rollout·최종 serving label 확인 |
| 관리자 | `8de024e92c` DEPLOYED · revision `o4o-admin-dashboard-01592-kes` | 같은 Delivery의 API 성공 후 배포·최종 label 확인 |
| Neture | `8de024e92c` DEPLOYED · revision `neture-web-02055-qin` | 같은 Delivery의 API 성공 후 배포·최종 label 확인 |
| 약국 사업 웹 | `8de024e92c` DEPLOYED · revision `kpa-society-web-02275-lac` | 같은 Delivery의 API 성공 후 배포·최종 label 확인 |
| 매장 웹 | 같은 `8de024e92c` DEPLOYED | [Promote 40150140161](https://github.com/Renagang21/o4o-platform/actions/runs/40150140161), `services=store`로 한정한 verified 배포·최종 production status success |
| 협력 모임 웹 | 같은 `8de024e92c`의 기존 비공개 서비스 배포 성공 | [Cooperative 40150536479](https://github.com/Renagang21/o4o-platform/actions/runs/40150536479), `frontend_only=true`, `apply=false`. API 호환성·Ready·비공개 HTTP·100% 트래픽 확인 PASS, fixture provision SKIPPED |

매장 웹은 `LEVEL_3 (deploy-infra services/web-store/Dockerfile)`로 자동 배포가 보류됐다. 자동 Delivery가 끝난 뒤 진행 중인 다른 배포가 없고 main HEAD·CI가 일치함을 확인해 기존 소유자 promote 경로를 실행했다. 당시 commit status는 `HELD_LEVEL_3/pending`에서 `DEPLOYED/success`로 바뀌었다. API·다른 웹을 중복 승격하지 않았다. 협력 모임 웹도 앞 배포 완료 후 순차 실행했으며 공개 IAM·DNS·인증 설정을 변경하지 않았다.

기존 API 배포의 표준 migration Job은 성공했다. 이번 변경에는 새 migration/DDL이 없고, 조합·회원 fixture 생성·정산 확정/결제·업무 데이터 보정은 수행하지 않았다. GitHub의 decision ZIP artifact는 이 클라우드의 storage egress 403으로 직접 내려받지 못했으며 우회하지 않았다. 대신 완료된 workflow의 Report 로그·job/step 결과·commit production status를 대조했다. 이 기록은 해당 실행 시점의 증거이며 이후 live 상태를 대신하지 않는다.

**배포 후 공개 smoke:** API `/health/ready` 200, 새 매장·공급자·협력 모임·상품 정정 AI POST 경로 4곳의 무인증 요청 모두 401(`AUTH_REQUIRED`) PASS. Neture·매장·관리자·약국 사업의 공개 웹 4곳은 HTTP 200/HTML PASS다. 이 9개 관측은 API 반영 후와 웹 반영 후에 나눠 확인했다. 협력 모임은 workflow의 기존 비공개 URL `/`, `/test`, `/login` HTTP 검증과 100% 트래픽 확인을 별도로 통과했다.

실제 계정으로 각 업무를 수행하거나 유료 AI 응답·모델 인증/품질·청구액·실제 한도 초과를 검증한 것은 아니다. smoke는 AI 호출을 요청하지 않았고 주문·게시 등 업무 데이터를 만들지 않았다. 직원/소비자 자료 구분·공식 DB 반영·실행 도구 확대 등의 남은 범위는 기존 TODO 그대로다. 이 확정 결과를 구조 문서와 TODO에 반영하는 후속 변경은 문서-only이며 runtime 재배포 대상이 아니다.

문서 정합: 공급자 정책 변경·현재 코드 연결·main/운영 증거를 구분했다. 이전 조사·준비·push-only 결과는 역사로 유지하고 현재 상태 진입점에서 이 절을 연결한다. 같은 WO의 종료 기록까지 main 반영·post-merge 확인 후 자기 worktree만 정리하며 다른 worktree와 기준 checkout은 변경하지 않는다.
