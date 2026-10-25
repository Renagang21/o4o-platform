# O4O AI Core + Extension 공통 기반

> 상태: ACTIVE · 작성일: 2026-10-13 · 최종 갱신: 2026-10-25 · 범위: 공통 업무 실행 계약·현재 구현/운영 적용·전환 계획
> 근거: 사용자 요청 · [구현 WO](../work-orders/WO-O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md)
> 이번 정합 WO: [신규 개발자 AI 개발 안내 정합](../work-orders/WO-O4O-AI-DEVELOPER-HANDOFF-UPDATE-V1.md)
> 전체 업무 재정비 준비: [단일 TODO](../work-orders/TODO-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md) · [업무·코드 연결 조사](../investigations/IR-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md)
> 조사 기준: `3c95dc170103f739a3e3a33b20f85350ae0ecef5`. 코드 존재는 현행 사업 기능이라는 증거가 아니다.

**현재 범위:** 기존 Core/업무 Extension·가격/quota·Runtime/editor 정비는 main에 통합됐으며 승인된 quota migration·7개 서비스 배포가 완료됐다.
현재 코드 위치와 완료/후속 구분은 §11을 먼저 읽는다. 관리자 조회 단계·모델 관리·사용처별 선택과 삭제 보호의 반영 상태는 §12/§12-1/§12-2에서 구분한다. §1은 최초 조사, §8/§9의 테스트·push-only 종료 기록은 당시 증거다.
업무 재정비의 추가 연결과 2026-10-25 main·운영 반영 증거는 §14-1에서 구분한다.
공통 기반 적용은 모든 전문 route의 비용 이관·모든 화면 AI UI·실계정 업무 검증 완료를 뜻하지 않는다.

## 1. 최초 조사 당시 구조·문제 (2026-10-13)

| 영역 | 현재 구현 | 재사용·정비 방향 |
|---|---|---|
| 공통 실행 | ai-core/orchestration execute·executeStream·runAIInsight·Gemini/OpenAI | 기존 실행기·retry·stream 유지. README의 기능 없음/모델 다중화 비책임은 코드와 불일치 |
| 정책·비용 | modules/ai-policy scope·fallback·quota(global/service/scope/user)·usage aggregate·billing summary | 새 원장 중복 금지. provider별 고정 단가·사용자 ID 누락·사전 조회/사후 증가 경쟁·DB 오류 시 quota 허용·fire-and-forget 이력은 정비 대상 |
| 대표 홈·Assistant | routes/ai-query.routes.ts·ai-query.service.ts·ai-tools·ai-provider-runtime.ts | 인증·질문 이력·Task/run/Memory/노드 자산 승계. 새 Assistant/Memory 저장소 금지 |
| 관리자·편집기 | ai-proxy.service.ts·content-editor·ai-prompts/admin | Gemini/OpenAI/Claude/Qwen 직접 HTTP 존재. execute와 지원 범위 동일하지 않음. 구조화 편집/multimodal 회귀 먼저 고정 |
| Neture 운영/HUB | operator-ai-llm.service.ts·hub-trigger.controller.ts | env 선택·별도 문맥·execute/runAIInsight. 실행은 기존 Trigger 담당 |
| 매장 콘텐츠 | ContentTranslationService·store-content.controller.ts·ai-prompts/store | 첫 Extension. 기존 CONTENT_TRANSLATION 정책·prompt·소유권·draft 저장 유지 |
| 상품 자료 | store-ai product tagging/content/insight | 플랫폼 전역 초안과 매장 설명 소유권 구분. 오래된 코드의 부활 금지 |
| Forum/LMS | ForumAIService·LmsAIService | 특화 분석/생성·별도 fallback. 등록/사용 여부 확인 후 단계적 이관 |
| Care | CARE_* 정책과 care LLM 호출부 | 환자 자료·의료 표현 제약은 업무/기존 권한 담당 |
| UI | o4o-ai-components·content-editor·서비스별 AI 화면 | 사용자 문맥/선택/결과 표시 담당, 서버 권한을 대체하지 않음 |

같은 호출 위에 key/config resolver와 직접 HTTP가 중복된다. 텍스트/구조화 편집/grounding/multimodal 차이는 보존해야 한다.
구 계약은 service/user 위주이며 조직·자료·audience·업무·부담·확인이 통합되지 않는다.
질문 이력·Task/run·provider usage는 서로 다른 이력이며 연결 ID가 필요하다.
CONTENT_TRANSLATION의 store 매핑은 이번에 유지하고 서비스별 정책 분리는 후속으로 둔다.

## 2. 책임·의존 방향

| 계층 | 책임 | 경계 |
|---|---|---|
| AI Core | 업무 실행 계약·문맥·자료 참조·권한 callback 연결·단계 이력·비용/선택 계약 | DB/업무 prompt/key/업무 권한 자체 판정 없음 |
| 업무 Extension | 입력·출력 검증·prompt·자료·도구 규칙 | provider/model 고정·다른 Extension 직접 호출 금지 |
| 외부 연결부 | key/계정·모델 정책·호출/timeout/retry/오류/usage | 미연결 시 다른 부담 주체로 자동 유료 전환 금지 |
| 서비스·메뉴/서버 조립 | 검증 사용자/조직/자료 문맥·Extension 선택·저장·실행 확인 | 클라이언트 user/store/role/audience로 권한 확장 금지 |

Extension → Core. 서버가 runtime/Extension을 조립하고 새 업무 실행 흐름은 구체 Extension/provider를 import하지 않는다. 기존 orchestration provider registry는 유지한다. 기존 provider stack을 중복 생성하지 않는다.

## 3. 공통 계약

- context: requestId·serviceId·featureId·actorId·organizationId/storeId·taskId/conversationId·audience.
- materials: ID/종류/허용 audience. 표시는 권한 증명이 아니며 서버의 기존 소유권·자료 접근 판정이 최종이다. 원문은 판정 뒤 입력으로 넘긴다.
- operation: 이번 실행기는 read/draft만. 게시·주문·삭제를 LLM 결과로 실행하지 않는다.
- funding: platform/store/user/external-account + 불투명 account reference. 서버 정책으로 선택. 첫 adapter는 기존 platform 부담만 지원하고 나머지는 명시적 거부.
- runtime: 업체 중립 prompt/context를 받아 실제 provider/model/token 결과를 반환. 업무에 업체명이 없다.
- history: started/provider-completed/completed/failed에 같은 requestId. 원문/key/외부 오류 원문 기록 금지. provider 사용 성공과 출력 파싱 성공은 별개.
- save: Core가 DB를 저장하지 않는다. 번역은 기존 translations[locale] draft와 execution 연결 ID 저장, 편집 후 ready. 모델 호출 후 저장 전 권한을 재검증하고 원문 변경은 409 CONTENT_CHANGED로 재번역 요청. draft를 자동 공개하지 않는다.
- 실행 도구(후속): 기존 domain service 직전 재권한 확인, 대상/version/인자 hash에 묶인 사용자 확인, 멱등키, 부분 성공/실패 기록. LLM 제안은 확인 증거가 아니다.

## 4. 비용·업체·장애 정책

O4O는 필요한 유료 호출 비용을 부담할 수 있다. 플랫폼 부담 금지 정책을 만들지 않는다.
service+feature+Extension+audience별 provider/model/credential binding과 부담 주체를 별도로 선택한다.
가격은 모델·통화·버전별, 한도는 요청/토큰/비용과 조직/사용자별로 관리해야 한다. 추정 cost ≠ invoice/결제. payment-core 재사용.
기존 정책 실행 및 연결된 업무 Extension의 quota는 원자 예약/정산/해제를 사용하며 usage/이력 실패를 관측한다. 직접 transport/멀티모달 등 남은 경로의 범위는 §11을 따른다.
미연결/한도/장애는 NOT_CONFIGURED/QUOTA_EXCEEDED/PROVIDER_FAILED. fallback은 자료 전송·부담·한도 정책이 허용한 명시 후보만.
외부 계정 OAuth·신규 결제 계약·운영 credential 변경은 별도다.

## 5. 내 매장 담당 전달 계약

별도 담당 세션과 실시간 합의한 상태는 아니다. 아래는 통합 검토용 계약이며 메뉴 재배치는 범위 밖이다.

| 사례 | 전달 | 권한·결과·확인 |
|---|---|---|
| 홈 | 선택 매장·허용 KPI·할 일 참조 | 기존 접근 판정, 설명/제안→기존 업무 화면 |
| 상품·거래 | 허용 상품·공급 조건·거래 참조 | 유통/거래 권한. 주문은 기존 검증·확인·멱등 실행 |
| 콘텐츠 작업실 | 소유 자료·편집본/version·locale | 소유/직원 판정→draft→미리보기/수정→별도 저장·게시 |
| 매장에서 활용 | 승인된 공개 콘텐츠·적용 대상 | 사이니지/QR/태블릿 기존 적용 API, 미리보기 ≠ 공개 확정 |
| 직원 상담 | staff 자료 allowlist | 직원 업무 범위, 소비자 이력과 분리 |
| 소비자 상담 | published consumer 자료 allowlist | staff-only 제외·의료 표현 제한·내부 업무 도구 금지 |

원문 외부 전송 전 audience별 허용 자료를 서버가 구성한다. 직원/소비자 세션은 자료·대화/Task 범위를 분리한다. 거래 지원은 공급자→매장 B2B에 한정하며 소비자 cart/checkout/PG는 복구하지 않는다.

## 6. TODO·전환 순서

| 단계 | 완료 기준 | 처리 |
|---|---|---|
| P0 | 자산/소비처/정본 조사·공통 계약·연결안 | 완료, 최초 조사 기록은 §1 |
| P1 | additive 실행·번역 연결·actor/자료/부담·거부/실패/교체 테스트 | 완료, 서비스 카탈로그 연결은 §9 |
| P2 | 모델별 가격/정책 버전·서비스 기능 선택·원자 quota 예약·신뢰 가능한 usage/이력 연결 | 연결 범위의 코드·quota migration 적용 완료. 실계정 비용/한도·운영 가격 정책 검증은 후속(§10/§11) |
| P3 | 편집/요약/상품 비교 확대·기존 HTTP/stream/multimodal 회귀 후 이관 | 기존 편집기/Runtime 정비 완료. 신규 업무 확대·남은 직접 호출 이관은 후속 |
| P4 | 게시/주문 도구 proposal/confirmation/idempotency를 기존 업무 실행에 연결 | 별도 실행 범위 |
| P5 | 개인/매장 외부 계정·외부 비서 ingress·scope/consent·직원/소비자 상담 | 별도 인증/자료 전송 검토 |

Assistant V2 A→I 순서와 Memory/Experience/Node 구조를 대체하지 않는다. AI Core는 공통 업무 경계다.

## 7. 정합·소비처

[Core freeze](O4O-CORE-FREEZE-V1.md)·[Extension guide](../platform/extensions/EXTENSION-GENERAL-GUIDE.md)·[공통 변경](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)·[자동화 §25](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)·[Assistant V2 §18](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md)·[콘텐츠 운영](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)·[상품 AI 소유권](../design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md) 기준.

번역의 직접 소비처는 공통 store-content controller(KPA/Neture store)이다. 기존 ai-core export/provider 호출 형태는 유지해 Care/Forum/LMS/관리자/Home/도구/stream 소비처를 보존한다.
import·symbol·endpoint·파일 경로·raw-source assertion census를 수행한다. 퇴역 K-Cosmetics/SiteGuide/PharmacyHub 기능을 재생성하지 않는다.

## 8. 초기 기반 검증 결과 (당시 기록)

- `pnpm run build:packages`: PASS.
- `pnpm --filter @o4o/ai-core run build` 및 `typecheck`: PASS.
- `pnpm --filter @o4o/api-server run build` 및 `type-check`: PASS.
- Jest `ai-business-extension.spec.ts`, `content-translation-extension.spec.ts`, `store-content-selected-organization.spec.ts`: 3 suite / 38 test PASS.
- 기존 `security/ai-orchestration.spec.ts`: PASS. 초기 두 신규 suite는 Jest의 import-only ESM prompt subpath 해결 실패로 미실행, 실제 prompt 소스를 테스트 mapper로 연결 후 재실행 PASS. assertion을 완화하지 않았다.
- 변경 업무/Core 파일 ESLint: 오류 0. execute.ts의 기존 unused AIProviderResponse warning 1건은 별도 기존 항목.
- docs 민감정보 검사: PASS(3878 files), git diff --check: PASS.
- 권한 거부/다른 매장 자료/consumer→staff 자료 거부, runtime 업체 교체, 부담 선택 전달, 미연결/한도/응답 오류, 원문 비기록, 이력 실패, draft 저장/연결 ID, 호출 중 권한 회수/원문 변경을 검증했다.
- provider 호출은 mock이며 실제 유료 호출·운영 인증·실계정·UI 재배치는 미실행. 담당 간 실시간 협의와 운영 적용은 아직 하지 않았다.


### 초기 기반 당시 한계

첫 adapter는 platform 부담·기존 정책만 동작한다. store/user/external-account는 공통 계약과 mock runtime 검증 수준이며 실제 계정/청구 구현이 아니다.
provider-completed 이력은 파싱 실패에도 usage를 남기지만 host observer는 구조화 logger다. durable 실행 원장은 P2이며 기존 usage/aggregate의 fire-and-forget과 quota 경쟁은 남는다.
저장 직전 재검증/원문 비교와 최종 DB write 사이의 원자 CAS는 후속 persistence 작업이다. 정책별 가격·한도 변경·credential 전환을 운영에 적용하지 않았다.


## 9. 전체 서비스 공통 기반 연결 (2026-10-13 계속 작업)

서비스 identity는 기존 `config/service-catalog.ts`에서 가져온다. 별도 서비스 목록이나 인증 체계를 만들지 않는다.
`services/ai-extensions/service-query.extension.ts`는 현재 카탈로그의 퇴역 외 8개 서비스마다 question/summary/draft Extension을 구성한다.
질의/요약/초안은 실제 `/api/ai/query` 경로에서 실행되며 서비스별 사업 규칙을 prompt에 전달한다.
관리자 운영 요약도 같은 카탈로그와 `operator-insight.extension`으로 각 서비스를 지원한다.

| 서비스/화면 | 연결 | 경계 |
|---|---|---|
| neture | 질의·요약·초안 + 운영 요약 + 기존 운영자 추천 Extension | 사업자/거래 권한은 기존 도메인 API. AI는 추천만 반환 |
| kpa-society | 질의·요약·초안·운영 요약 | 조직 업무/의료 표현 제약. 매장 콘텐츠 번역 별도 ownership guard 유지 |
| kpa-branch | 질의·요약·초안·운영 요약 | 분회 자료 권한을 서비스 선택으로 부여하지 않음 |
| lecture | 질의·요약·초안·운영 요약 + 기존 LMS 피드백 Extension | 제출된 답안만 분석, 성적·수강 자격 변경 없음 |
| community | 질의·요약·초안·운영 요약 | 비공개 글·대화를 서버에서 조회하지 않음 |
| supplier | 질의·요약·초안·운영 요약 | 제품/인증을 추측하지 않음. 기존 사업자 ownership 유지 |
| funding | 질의·요약·초안·운영 요약 | content-only, 주문/결제/정산 확정 없음 |
| cafe24-b2b | O4O 인증 사용자가 제출한 자료의 질의·요약·초안·운영 요약 | Cafe24 사용자 신원을 O4O 계정으로 바꾸거나 외부 자료 조회를 열지 않음 |
| 내 매장 | 앞 Phase 콘텐츠 번역·선택 조직·권한 재검증 | 메뉴/실행 업무 재배치 없음. 독립 서비스 identity 추가 없음 |
| 계정센터 | 공유 O4O 질의 계약을 사용할 수 있음 | 계정센터를 새 서비스 키로 등록하지 않음. 현재 화면 신규 AI UI는 추가하지 않음 |
| 병원약국 | 기존 웹 리서치 호출을 web.research Extension + Core에 연결 | 기존 무로그인/리미터/로컬 파일 정책 유지, 서버 원내 DB·staff 자료·실행 없음 |

### HTTP 계약

- GET `/api/ai/extensions`: 기존 authenticate 필요. 서비스/작업/제약 metadata만 반환, provider/key 없음.
- POST `/api/ai/query`: 기존 question/contextType/contextData에 선택 `serviceId`, `task=question|summary|draft` 추가.
- 두 필드가 없으면 기존 대표 서비스 질의로 처리. `kpa` 별칭은 기존 canonical resolver 사용.
- 미지원/퇴역 서비스·delete 같은 작업은 400, 무인증 401, 기존 일 사용량 초과 429. 응답 answer/remainingQueries/contextPanel/cards 유지.
- serviceId/storeId/contextData는 신원·권한 증명이 아니다. 이 공통 경로는 domain record를 읽지 않고 사용자가 제출한 자료만 처리한다.
- private 자료를 실제로 가져오는 업무는 기존 도메인 guard를 통과한 서버 조립부가 별도 Extension 입력을 만들어야 한다.

### Core/Extension/외부 연결 정비 범위

LMS의 prompt·입력 구성·출력 정규화는 `lms-assistance.extension`으로, Neture 추천의 prompt·유효 유형·confidence·action mapping은 `operator-actions.extension`으로 분리했다.
provider/model/key/timeout은 호스트 runtime의 기존 resolver/execute가 맡는다. 추천 캐시는 actor+지표별 hash로 격리한다.
공용 웹 리서치는 명시적 public principal로 read만 허용하며 실제 actor를 만들지 않는다. Core는 public+staff/자료 참조/draft/위조 actor 조합을 거부한다.

기존 ai-proxy의 구조화 편집·multimodal transport, Assistant/Task/노드 실행, Forum의 rule-based adapter, 상품 AI와 legacy runAIInsight 계약은 호환성을 유지한다.
그 경로를 새 private-data 권한 없이 공통 질의로 우회하지 않았다. **모든 기존 specialty route의 이관 완료나 각 화면 신규 AI UI 배포를 주장하지 않는다.**
텍스트 질의/서비스 운영 요약 기반을 전체 카탈로그에 제공하고 기존 업무 사례를 Core+Extension으로 연결했다.
이후 가격 snapshot·원자 quota·사용 이력은 §10의 연결 범위에 적용됐다. 외부 계정·전체 직접 호출 비용 이관·실계정 검증은 §11의 후속 범위다.

### 서비스 확대 검증

서비스별 Core task·LMS/추천 검증 56개, 실제 질의 HTTP 경로 15개, 기존 AI/번역/리서치/병원약국/모델 선택 회귀 127개 PASS.
운영자 요약 10개 PASS. 합계 208개 테스트(11 suite) PASS. Core build·API build/type-check PASS. 변경 파일 ESLint 오류 0(기존 ai-query route unused catch warning 4건), docs 민감정보 검사 3881개 파일 PASS, git diff --check PASS. 외부 provider는 mock, 실제 유료 호출/운영 인증/서비스 UI 변경은 미실행.

당시 종료 범위는 작업 branch push였다. 당시 WORKTREE_DISPOSITION: `wo/ai-core-extension-foundation` / base `b3f792578a` / main integration 없음 / CI 원격 미실행 / deployment 미실행 / KEEP(검토·후속 작업용). 이후 main 통합/운영 적용은 §11의 별도 완료 증거를 따른다.


## 10. 비용·quota/Runtime 후속 정비 (2026-10-13)

[후속 WO](../work-orders/WO-O4O-AI-QUOTA-RUNTIME-MAINTENANCE-V1.md)는 위 P2의 가격 snapshot·원자 예약·정산·관측을 기존 정책 실행과 전체 catalogue 공통 질의/운영 요약·LMS/Neture 추천에 연결한다. 기존 aggregate/billing 정본을 유지하고 예약 상태만 별도 원장으로 둔다. 플랫폼 부담 유지, 모델별 가격 version, UTC 기간 귀속, 검증된 actor quota, DB 장애 거부, 성공 뒤 기록 실패의 중복 유료 호출 방지를 구현했다. 새 원문/Memory/결제/인증 기반을 만들지 않는다.

`ExecuteResult.attempts`는 additive metadata다. Core의 업무 계약·권한 callback과 서비스별 Extension prompt는 그대로다. quota 정상 up의 운영 migration은 2026-10-14 완료됐다(§11). 직접 transport/멀티모달/public research의 전체 비용 이관, store/user/external-account billing, 신규 운영 가격 설정은 후속 범위다. 앞 절의 과거 검증과 초기 한계는 당시 단계 기록이다.

## 11. 현재 구현·main 통합·운영 적용 (2026-10-14)

### 기존 기반과 코드 위치

| 책임 | 현재 코드 | 정비 결과/경계 |
| --- | --- | --- |
| AI Core 실행·업무 계약 | [ai-core](../../packages/ai-core/src/), [Extension 계약](../../packages/ai-core/src/contracts/ai-extension.contract.ts), [run-extension](../../packages/ai-core/src/orchestration/run-extension.ts) | 기존 execute/stream/provider stack을 재사용. 업무 prepare/parse와 외부 업체 호출 분리, 기존 권한 callback 연결 |
| 서버 정책·비용·quota | [ai-policy](../../apps/api-server/src/modules/ai-policy/) | AiAccountedExecution·가격 snapshot·quota 예약/정산/미해결 사용 관측. 기존 aggregate/billing/usage log 유지, 새 결제 원장 없음 |
| 서비스별 업무 | [ai-extensions](../../apps/api-server/src/services/ai-extensions/) 및 기존 콘텐츠 번역·LMS/Neture Extension | 카탈로그별 question/summary/draft·운영 요약과 업무 입력/출력 규칙. serviceId는 자료 접근 권한이 아님 |
| Work 실행 | [ai-tools](../../apps/api-server/src/services/ai-tools/)의 work-observation/planning/action/task-session | 요청별 state를 한 번 구성해 공유, 계획 입력 snapshot·recovery helper 재사용. 기존 Task/Node/확인/권한 경계 유지 |
| 공통 편집기 | [AiContentModal](../../packages/content-editor/src/components/AiContentModal.tsx)와 기존 generation/write/format helper | 문맥·view 변경의 늦은 응답 격리, single-flight 저장, 원래 caller callback 한 번. 이미 보낸 POST 자동 취소/재전송 없음 |
| 코드 안전/성능 | [URL 수집](../../apps/api-server/src/routes/ai-proxy/url-content.ts), Work Planner, [complexity audit](../../scripts/quality/audit-code-complexity.mjs) | 미종결 JSON/HTML/metadata 반복 탐색 제거, 제목 대소문자·깊은 HTML 예외 회귀 보완, 고정 Git 경로·명시적 map/sort/reduce, type-only reexport bundle 오류 수정 |

Core는 업무 데이터의 최종 권한·저장 owner가 아니다. 자료는 기존 업무 guard 통과 후 전달하고, 게시·주문·삭제는 기존 도메인 검증/실행 확인을 유지한다. 소비자 자료와 직원 자료를 분리한다. 특정 모델·부담 주체로 업무 Extension을 고정하지 않으며 O4O의 필요한 유료 호출 부담을 금지하지 않는다.

### 적용과 검증 증거

누적 Core/Extension·quota·Work/editor는 [PR #549](https://github.com/Renagang21/o4o-platform/pull/549), 성능 후속은 [#552](https://github.com/Renagang21/o4o-platform/pull/552), 실제 bundle·추가 성능/보안·review 회귀는 [#557](https://github.com/Renagang21/o4o-platform/pull/557)로 main에 통합됐다.
검증/운영 target은 `ce876b0ab03aeb8c61e15a2a378f89d55af3580b`이며 [Promote 38497933074](https://github.com/Renagang21/o4o-platform/actions/runs/38497933074)가 성공했다. 이는 해당 시점의 rollout 증거이며 이후 live serving 상태를 대신하지 않는다.

- 사용자 승인 범위의 `CreateAiUsageReservations1791870434349` 정상 up: 예약/정산 테이블·pending index, aggregate/log 비용 `numeric(20,8)` 적용. 실제 migration job 성공 뒤 API readiness/traffic 전환 및 admin·neture·kpa-society·lecture·store·kpa-branch verified 배포 성공. rollback/archive repair 미실행.
- source/main CI·CodeQL PASS, required CI Gate PASS 및 미해결 review thread 0. API 실제 tsc→database backup→tsup→restore 경로를 검증했다.
- 배포 후 HTTP 16/16 PASS: API health/ready, 6개 웹 HTML/동일 host JS, 관리 quota API 미인증 401. 익명 상태 점검이며 실계정 권한별 AI 업무/과금 검증은 아니다.
- 실제 PostgreSQL 격리 fixture에서 quota/schema 18 tests PASS. 최신 URL/업무 Extension 3 suites/82 tests 및 fake Git PATH 공격 회귀를 포함한 Node 6 tests PASS. 초기/통합 테스트와 중복 합산하지 않는다.

상세 실패·수정·재검증·배포 증거는 [통합 WO](../work-orders/WO-O4O-AI-MAIN-INTEGRATION-DEPLOYMENT-V1.md)와 [최종 CHECK](../checks/CHECK-O4O-AI-MAIN-INTEGRATION-DEPLOYMENT-V1.md)에 있다. 이력은 정책을 변경하지 않는다.

### 남은 범위와 신규 개발자의 다음 작업

1. 실제 계정의 서비스/역할·자료 접근, 사용량·비용 누적·한도 초과·실패 예약 처리·중복 호출을 검증한다. 당시 checkout의 테스트 계정 부재로 미실시였으며 새 환경의 계정 주입/로그인도 확인해야 한다.
2. 수정한 PATH 보안·Reliability 경고와 성능 finding은 최신 Sonar 재분석으로 확인한다. 당시 외부 API 403 때문에 최신 등급/issue closed 상태는 미확인이다. Windows 고정 Git 실행도 미검증이다.
3. 기존 공통 기반과 업무 Extension을 활용해 담당 서비스의 자료·문맥·도구·권한·draft 저장·미리보기·실행 확인을 연결한다. 내 매장 메뉴 재배치는 별도 범위이며 모든 화면 신규 AI UI가 완료된 상태가 아니다.
4. legacy 직접 transport/멀티모달/public research의 전체 비용 이관, store/user/external-account 실제 청구·외부 인증, 신규 모델 가격/요금 운영 정책은 별도 작업이다. 보수적 추정 예산은 업체 invoice·tool/image 비용의 완전한 상한을 보장하지 않는다. 미해결 예약은 TTL만으로 삭제하지 않고 확인된 증거로 reconcile한다.

비용 장애 검증은 단계를 구분한다. 예약/admission의 DB 장애는 provider 호출 전 거부(공통 질의 503)다. provider 성공 후 정산/receipt 저장 장애는 생성 결과를 반환하고 경고·미해결 예약을 유지하므로 자동 유료 재호출이나 시간 경과만으로 해제하지 않는다.

[시작 안내](../development/COLLABORATOR-START-HERE.md)와 [SETUP](../../SETUP.md)을 따라 최신 main의 전용 작업공간에서 착수한다. 개별 서비스의 중복을 성급하게 전역 공통화하지 않으며 전체 정비에서 소비처·업무 차이를 함께 판단한다. 새 Core/Memory/정산 기반·퇴역 서비스 기능을 중복 생성하지 않는다. 외부 유료 계약·운영 credential/DB 변경은 개발 착수와 구분한다.

## 12. 관리자 AI 운영 조회 기반 — main·운영 반영 (2026-10-20)

[구현 TODO](../work-orders/WO-O4O-ADMIN-AI-USAGE-MANAGEMENT-V1.md)의 첫 단계로 관리자 설정의 기존 Gemini 전용 개요를 전체 사용처 조회로 교체했다. [PR #724](https://github.com/Renagang21/o4o-platform/pull/724)로 main에 통합했고 `653178d0b884d545f60d472311436ea7a8f3e727`의 API·관리자 배포를 확인했다. 당시 서빙 리비전·공개 URL 검증과 실계정 미검증 범위는 [배포 CHECK](../checks/CHECK-O4O-ADMIN-AI-USAGE-MANAGEMENT-DEPLOYMENT-V1.md)에 있다. 이 기록이 이후의 live serving 상태를 대신하지 않는다.

- `/api/ai/admin/management`와 `/api/ai/admin/management/usage`는 기존 `authenticate` + `requireAdmin` 뒤의 읽기 전용 API다. 후자는 최근 7/30/90일의 Asia/Seoul 기간을 사용한다. 새 인증 체계나 공급자 호출을 만들지 않는다.
- `services/ai-management/catalog.ts`는 31개 논리적 사용처의 소스 연결·능력·선택 경로·중지/회계 연결을 기록한다. 실행 registry·서비스 identity·권한 정책이 아니며, 등록/운영 활성/실제 사용을 동치로 다루지 않는다. 서비스명은 기존 카탈로그에서 읽고 공통 업무 영역은 별도로 구분한다.
- 현재 저장 모델/정책 조회와 실행 적용 확인은 다르다. 누락 정책을 GET으로 생성하지 않으며 정책 조회 실패를 활성 기본 모델로 대체해 표시하지 않는다. 범위 정책의 캐시·실행 적용은 미확인으로 표시한다.
- 공급자 연결은 DB SQL의 키 존재 여부 집계와 서버 환경 연결 유무만 확인한다. 키·prompt·응답·개인 기록을 반환하지 않는다. 모델은 코드 목록이며 공급자 실시간 제공/인증 성공을 검증한 것이 아니다.
- 사용량은 기존 `ai_usage_logs`의 공급자/모델/scope 기록을 한 번만 집계한다. 서비스·기능별 전체 통계, 실제 유료 시도 수, 공급자 청구로 표시하지 않는다. 비용 누락·토큰 누락(기존 0/0 기록 포함)·기능 미분류·조회 실패를 구분하고 금액을 현재 단가로 다시 계산하지 않는다.
- 관리자 UI는 사용처·현재 설정 / API·모델 연결 / 사용량·비용을 제공한다. 기존 공통 질의 설정 경로와 수정 기능은 유지하면서 그 활성화가 전체 AI 중지를 뜻하지 않음을 표시한다.

첫 조회 단계에서 후속으로 남긴 모델 쓰기·revision CAS는 §12-1, 사용처별 모델 우선 적용과 번역 모델 선택 분리는 §12-2에서 반영했다. 통합 중지 admission, 번역별 독립 활성·한도 정책, 모든 직접 transport/멀티모달의 비용 이관과 전체 운영 적용 증거는 **후속 TODO**다. 조회·모델 선택 구현만으로 §11의 남은 실행/운영 검증을 완료한 것으로 보지 않는다. 이 조회 단계는 DB schema·migration·한도·키·부담 주체·운영 설정을 바꾸지 않았다.

### 12-1. 모델 관리·사용처 선택 — main·운영 반영 (2026-10-21)

[모델 관리 TODO](../work-orders/TODO-O4O-AI-MODEL-MANAGEMENT-V1.md)의 후속 개발로 기존 관리자 `/settings`에 공급자별 모델 신규/수정/삭제와 사용처별 모델 선택을 추가했다. [PR #754](https://github.com/Renagang21/o4o-platform/pull/754)로 main에 병합했으며 `1adf577e38a7e580f1bbc0499a871c943cecc289`의 API·관리자 100% serving을 확인했다. §12의 증거는 첫 조회 단계의 기록이다. [검증 CHECK](../checks/CHECK-O4O-AI-MODEL-MANAGEMENT-V1.md)에 현재 revision·CI·회귀·quota rollback 테스트 해소와 실계정 미검증 범위를 구분했다. 이 배포 기록이 이후의 live 상태를 대신하지 않는다.

기존 `settings`의 `ai:model-controls:v1`에 모델·삭제 표식·사용처 지정과 revision을 함께 저장한다. 기존 인증 뒤의 관리 API가 CAS로 저장하며 GET은 초기화하지 않는다. 모델 참조 확인·변경과 기존 공통 질의 정책 저장/엔진 활성화는 같은 transaction 잠금으로 직렬화하고 삭제된 모델 참조를 재검사한다. 사용 중/기본 모델은 삭제나 ID·지원 기능 변경을 막고 표시 이름 수정은 허용한다. 저장/조회 실패를 성공으로 표시하지 않으며 credential·base URL·prompt·응답은 새 설정에 저장/노출하지 않는다.

선택값은 다음 새 호출에서 기존 adapter·인가·가격/quota·retry/fallback 앞에 적용한다. 기존 요청·결과 캐시·이력은 수정하지 않는다. 당시 카탈로그의 31개 논리적 사용처 중 이전 공급자 HUB 한 곳은 현행 이용 미확인으로 제외하고 30개에 연결했다. 이 수치는 이후 추가된 뉴스 등 모든 AI 호출의 완전한 목록이 아니다. 매장 번역/약국 상담 번역은 기존 공유 과금 scope를 유지하며 모델 선택 분리는 §12-2를 따른다. 음성 합성은 기존 provider·voice·format에 맞는 모델만 지정한다. 공급자 등록은 지원·인증·가격의 실시간 검증이 아니다. Qwen·DeepSeek 목록 CRUD가 새 실행 adapter 지원을 뜻하지 않는다.

통합 중지 admission, 번역별 독립 활성·한도 정책, 직접 transport/멀티모달의 전체 비용 이관과 운영 인증·유료 호출 검증은 여전히 후속 범위다. 번역 모델 선택의 독립 지정과 이 후속 정책을 혼동하지 않는다. 기존 Core/Frozen·schema/migration·부담 주체를 바꾸지 않았다.

관리자 블록의 기존 OpenAI 요청은 Core의 세대별 파라미터 판정을 재사용하며 공급자 전환 시 토큰 예산은 선택 공급자의 기존 상한 이하로 낮춘다. DB 키만 있는 인사이트와 로그인 병원 조사 target, 등록 모델의 text 능력 우선 검증도 연결했다. 실제 Google 로그인·운영 설정 변경·유료 모델/가격 성공은 공개 응답과 합성 회귀만으로 완료했다고 표시하지 않는다. 추가 전문 OCR 등 조사 대상은 [조사/설계 통합 PR #721](https://github.com/Renagang21/o4o-platform/pull/721)과 구현 기록을 구분하며 현재 모델 선택 연결에 포함했다고 추정하지 않는다.


### 12-2. 사용처별 모델 우선 적용·삭제 정비 — main·운영 반영 (2026-10-24)

[삭제 정비 TODO](../work-orders/TODO-O4O-AI-MODEL-DELETE-USABILITY-V1.md)는 사용자 결정에 따라 사용처별 관리자 모델 지정을 우선한다. 기존 코드/요청/캐시된 정책에 다른 모델이 있어도 지정된 사용처의 다음 새 호출은 관리자 모델을 사용한다. 새 전체 공통 모델 설정은 도입하지 않는다. 진행 중 호출·기존 결과·한도/회계 계약은 유지한다.

§12-1의 번역 공유는 기존 저장/과금 정책의 이력이다. 매장 콘텐츠와 약국 상담의 모델 지정만 분리하며 기존 공유 지정은 양쪽에 보존한다. 관리자 지정이 있는 상품/번역 호출은 이전 scope fallback으로 돌아가지 않는다. 기존 정책 row·과거 이력을 자동으로 다시 쓰지 않는다.

모델 삭제 보호는 실제로 남아 있는 기본/선택/정책 소비처를 표시하고 다른 모델로 변경한 뒤 해제한다. 공통 기본 실행 경로·서버 환경·미연결 정책 참조는 유지한다. 삭제한 모델로 돌아가는 지정 해제도 거부한다. 실제 검증·Git 상태·미확인 범위는 TODO와 아래 실행 근거를 따른다.

공통 질의 정책을 직접 사용하는 커뮤니티 수동·예약 뉴스 생성은 개별 사용처 모델 지정에 연결되지 않았다. 따라서 관리 가능한 사용처를 모두 다른 모델로 지정해도 공통 질의 정책의 모델 참조는 유지한다. 기존 공통 정책에서 모델을 명시적으로 바꾼 뒤에만 이전 참조를 해제한다. 모델 삭제가 정책을 자동 수정하거나 뉴스의 provider·과금·권한 계약을 바꾸지 않는다(2026-10-24 PR #792 통합 리뷰 보완).

[PR #792](https://github.com/Renagang21/o4o-platform/pull/792)는 main `c99123518fe74099b9f471f06cdd90bf7c5709de`에 병합됐다. 이후 문서만 추가한 `abb602b9569217abf2e20de155e2f60210da5d50`을 대상으로 [Delivery 40074053472](https://github.com/Renagang21/o4o-platform/actions/runs/40074053472)가 API·관리자 verified rollout과 최종 serving SHA 검증을 성공했고 `production=success / DEPLOYED`로 확정했다. 이 시점의 배포 증거를 이후 live 상태나 실제 운영 모델 저장·유료 공급자 시험 호출의 증거로 확대하지 않는다. 새로운 schema·migration 파일이나 dependency 변경은 없고, 기존 표준 배포의 migration Job은 성공했다.

## 13. 전체 AI 업무 Core + Extension 재정비 준비 (2026-10-24)

[정비 TODO](../work-orders/TODO-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md)와 [업무 연결 조사](../investigations/IR-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md)는 main `7f3d783cc2`에서 시작해 최종 점검 중 `355d77e861`까지 재대조한 구현 전 준비다. 사용자 업무 1~11 및 추가 업무를 코드·문서에 연결했다. 이번 변경은 문서만이며 새로운 runtime 계약·권한·모델/가격 정책·메뉴·운영 설정을 적용하지 않는다. §11/§12의 완료/운영 기록은 당시 증거로 유지한다.

기존 `AiBusinessExtension`·`runAiExtension`·host authorize/record·모델 관리·회계/quota·편집기·외부 AI adapter를 재사용한다. 상품 지식/등록, 콘텐츠 제작/재사용, 현황/운영, 자료 기반 지원, 교육/커뮤니티, 개인 자동화는 정비할 업무 묶음이며 새 기반/패키지 개수를 뜻하지 않는다.

- Core는 공통 실행·문맥·권한 callback·이력과 runtime 계약을 유지하고, 업무 Extension은 자료·출력·업무 규칙을 담당한다. 서버가 기존 도메인 권한으로 자료를 구성하고 저장·게시·주문 확인은 기존 업무 API가 수행한다.
- 첫 후속 적용은 기존 현황 설명 Extension에 매장/공급자의 허용 지표를 연결하는 것으로 계획한다. 매장 도우미의 화면 문맥·입력과 실제 지표 조회를 구분하며 관리자 Copilot API의 guard를 일반 사용자에게 낮추지 않는다.
- 자료 버전·출처·집계 시각은 우선 업무 입력/host에서 검증한다. Core 필드·상태 변경 도구·공통 저장소를 선제적으로 추가하지 않는다. 현재 실행기는 read/draft이며 새 실행 도구는 별도 수용 기준이 필요하다.
- 사용처별 모델 지정과 비용/한도·중지 연결은 별도 검증한다. 최근 뉴스·상담·전문 호출과 사용처 목록의 대응, 약국 사업/분회/협력 모임의 업무 문맥 정합은 TODO에 남겼다. 전체 호출의 이관 완료로 해석하지 않는다.
- 상품 DB는 기존 [상품 정정 작업공간](../guides/products/O4O-ADMIN-PRODUCT-CORRECTION-WORKSPACE-V1.md)을 재사용하고 AI 보완 초안과 공식 반영을 분리한다. [전문 정보 원칙](../guides/products/O4O-PRODUCT-DESCRIPTION-PROFESSIONAL-USE-POLICY-V1.md)의 목적별 구성·상품 사실/전문 참고정보·근거 구분을 유지한다. 전문 주제를 일괄 제외하거나 기존 QR 자료를 공식 DB로 자동 채택하지 않는다.

후속 순서는 공통 정합/첫 적용 → 상품·콘텐츠 → 운영·협력 모임 → 상담·교육·자동화 정합이다. 각 단계는 전체 소비처·권한·원본/초안 소유·비용·오류 회귀를 확인한 뒤 전환한다. 실제 구현·main 통합·실계정 및 운영 검증은 후속 실행 결과로만 완료 표시한다.

## 14. 업무 공통 연결과 첫 적용 — 개발 branch (2026-10-24)

사용자 후속 지시로 같은 [TODO](../work-orders/TODO-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md)의 S1~S4를 연속 작업했다. 아래는 `wo/ai-work-extension-preparation`의 구현 상태다. §11/§12의 main·운영 완료 기록과 구분하며 이번 변경은 push까지만 인계한다. 검증·잔여 범위는 [CHECK](../checks/CHECK-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md)를 따른다.

공통 실행은 기존 `AiBusinessExtension`/`runAiExtension`을 유지한다. 서버의 [policy runtime](../../apps/api-server/src/services/ai-extensions/policy-runtime.ts)은 기존 `AiPolicyExecutorService`에, [accounted runtime](../../apps/api-server/src/services/ai-extensions/accounted-runtime.ts)은 기존 모델 선택과 `executeAccountedAi`에 연결하는 조립 함수다. 공급자 adapter·quota·원장·Task·Memory를 새로 만들지 않는다. 번역 2종·상담 게시 문단 선택·LMS·운영자 설명·Copilot·뉴스가 같은 조립 경로를 재사용한다. 각 host의 허용 자료·기존 시간 제한/재시도·대체 응답·저장은 유지한다.

| 실제 업무 | 자료·권한·결과 | 정책·모델 |
|---|---|---|
| 매장 홈 현황 설명 | 기존 매장 guard와 현재 owner/허용 직원 관계로 선택 매장 집계만 조회. `null`과 확인된 0건을 구분. 응답 전 권한 재확인 | STORE_INSIGHT, `store.overview` 모델 지정. 서버 host의 기존 serviceKey를 canonical 서비스로 확인해 비용 귀속 |
| 공급자 홈 현황 설명 | ACTIVE인 자기 공급자 식별을 재확인하고 기존 KPI의 수치만 조회. 사용자가 요청할 때만 실행 | OPERATOR_INSIGHT, `supplier.overview` 모델 지정 |
| 약국 경영 협력 모임 현황 설명 | 해당 모임의 현행 admin/operator 역할로 회원 상태 집계만 조회. 개인 원문과 다른 모임 자료 제외 | OPERATOR_INSIGHT, `cooperative.overview` 모델 지정 |
| 상품 정정 검토 초안 | 기존 super_admin·작업 묶음 revision·task·원문 fingerprint 검증. 별도 제안 미리보기 → 사용자 선택으로 편집 폼에 삽입 → 기존 저장. 공식 상품 자동 변경 없음 | 기존 PRODUCT_CONTENT 모델·한도 공유. `product.correction-draft`는 같은 정책의 사용처 alias |

세 현황 host는 기존 `operator-insight` Extension과 공통 화면 패널을 사용한다. 자료 조회 전·Core 실행 직전·응답 전달 전 권한을 검사한다. UI는 자동 요청/재시도하지 않고 범위 변경 시 늦은 응답을 폐기한다. AI 설명·제안은 기존 처리 API의 실행 성공 증거가 아니다. 공급자 자체 집계의 내부 AI 요약은 [콘텐츠 운영 원칙 §3](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md#3-표준-반복-standard-loop)·[Supplier 경계](../baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md)에 사용자 승인을 반영했다. 공급자 창작·외부 계정 책임과 자동 업무 처리 경계는 유지한다.

상품 태그 호출에는 PRODUCT_TAGGING 예약·정산을, Assistant의 이해/완료 검증 호출에는 인증된 사용자 기준 SERVICE_QUERY 예약·정산을 연결했다. 전자는 기존 서버 작업의 actor를 추정하지 않아 전역/scope 한도만 적용하며 사용자별 귀속은 후속이다. 뉴스는 공통 질의 모델·활성 설정과 기존 삭제 참조 보호를 유지한다. 관리 목록의 뉴스·상담 문단 선택·OCR 및 새 업무 연결은 실행/운영/청구 완료 표시와 다르다. OCR은 전문 Google Vision API로 표시하며 생성형 모델 선택과 공통 비용 연결은 미지원이다.

이번 지원 부담 주체는 기존 platform이다. 다른 payer는 명시적으로 거부하며 store/user/external-account 청구 구현 완료를 뜻하지 않는다. Home·계획·화면 판독·멀티모달 직접 transport, Qwen 편집·TTS·전문 OCR의 전체 비용/중지 이관과 상태 변경 도구 확대는 TODO에 남긴다. schema/migration·운영 모델·가격·인증 설정은 변경하지 않았다.

### 14-1. main 통합·운영 반영 (2026-10-25)

[PR #805](https://github.com/Renagang21/o4o-platform/pull/805)는 main `8de024e92cb071790408ca403e110abb4cc29d61`에 병합됐다. PR/main CI와 CodeQL, PR SonarCloud 분석을 확인했고 자동 리뷰의 정산 상세·정책 표시 P2 2건을 같은 branch에서 수정·회귀한 뒤 병합했다. STORE_INSIGHT 상세는 실제 reservation의 service/month에 귀속하며 기존 기본 service·정산 총액/확정·결제는 유지한다. 관리 목록은 카탈로그에서 scope 정책 조회 대상을 모아 새 현황 3종의 저장 모델·활성/중지 설정을 표시한다.

같은 SHA의 API·관리자·Neture·약국 사업 웹은 기존 Delivery로, 매장 웹은 Dockerfile 변경에 따른 기존 통제 promote로 verified 배포됐다. 협력 모임 웹은 기존 비공개 서비스의 frontend-only 경로로 배포해 Ready·비공개 HTTP·100% 트래픽을 확인했고 조합/회원 fixture 등록은 건너뛰었다. API 표준 migration Job은 성공했으며 이번 변경에는 새 migration/DDL·운영 모델/가격·credential·IAM/DNS 변경이 없다.

확정 workflow·serving label·공개 준비 상태/웹 응답·무인증 AI 경로 차단 결과는 [CHECK §6-1](../checks/CHECK-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md#6-1-통합배포-확정-결과)에 있다. 공개 smoke는 유료 AI를 요청하거나 업무 데이터를 만들지 않았다. 실제 계정의 AI 품질·요금/한도·업무 완료 검증은 남았으며 §14의 DEFER 범위를 완료로 바꾸지 않는다. 이 기록은 해당 배포 시점의 증거이며 이후 live 상태를 대신하지 않는다.

### 14-2. 내 매장 전문 판단 지원 — 개발·통합 이력 (2026-10-25)

`pharmacy.consultation.support`는 약국 도메인의 현재 역할/기능·약사 사용 확인·활성 상품/게시 자료 검증을 통과한 질문과 출처 확인 자료로 읽기/초안 지원을 제공한다. 기존 `runAiExtension`·policy runtime·PRODUCT_CONTENT 모델/플랫폼 부담·quota/회계를 재사용하며 Core runtime·공통 이력·schema를 변경하지 않는다. 상품 사실/전문 참고·판단/확인 질문 하나/고객 설명을 구분하고 담당자 확인 후 기존 전달 입력에 넣는다. 자동 공유/게시·전문 자료의 공식 원장 승인은 없다.

사용자는 상담 원문 장기 이력 없이 확인한 상품·컨텐츠와 업무 결과의 재사용을 선택했다. 전문 입력은 현재 세션에 두고 승인한 자산은 기존 편집/적용 원장을 사용한다. 개발 당시 현재 상태 정리는 도메인 job의 기본 dry-run이며 운영 활성화는 별도였다. 상세 [범위](../design/DESIGN-O4O-STORE-CONSULTATION-DATA-SCOPE-V1.md) · [개발 CHECK](../checks/CHECK-O4O-STORE-CONSULTATION-CONTENT-CHANNEL-COMPLETION-V1.md).

후속 사용자 지시로 PR #813을 main `fda3f672d1`에 통합했다. 기존 verified Promote `40183174373`에서 API·Store가 DEPLOYED이며 명시 apply/기존 중지 값 보존 처리와 공개 smoke 13건이 통과했다. 실제 enabled 값·정리 count/본문 파기와 약사/현장 품질은 미관측이며, 실제 provider/업무 검증 완료로 해석하지 않는다. 운영 반영 범위와 한계는 [통합·배포 CHECK](../checks/CHECK-O4O-STORE-CONSULTATION-INTEGRATION-DEPLOYMENT-V1.md)를 따른다.

## 15. 텍스트 회계 연결 보완 — 개발 branch (2026-10-25)

[후속 TODO](../work-orders/TODO-O4O-AI-RUNTIME-ACCOUNTING-COMPLETION-V1.md)에서 남은 실행 경로를 재조사했다. `wo/ai-runtime-accounting-completion`은 새 Core/원장을 만들지 않고 기존 `AiAccountedExecution`을 홈·첨부 텍스트 대체, 일반/강화 텍스트 계획, 인증/공개 파일 구조 추론 host에서 소비한다. 파일 추론·첨부 helper에는 텍스트 invocation을 명시적으로 주입해 업무 해석과 서버 비용 경계를 분리한다. standalone 파일 smoke는 자기 환경 계정의 transport를 명시적으로 전달하며 서버 원장 검증을 대신하지 않는다.

host는 기존 인증·업무 권한으로 확보한 actor만 전달한다. Home/계획/파일은 `SERVICE_QUERY/neture`, 상품 태그는 `PRODUCT_TAGGING`, 상품 콘텐츠는 기존 `PRODUCT_CONTENT` 정책을 사용한다. 공개 파일 추론은 사용자 신원을 만들지 않는다. 상품 태그 실패 시 후속 콘텐츠 생성은 중단하지만 기존 fire-and-forget 응답·업무 저장/권한 계약은 유지한다. 대화/파일/생성 원문은 공통 비용 로그에 기록하지 않는다. 한도 초과·한도 DB/가격 장애를 provider rate limit과 구분하며 성공 후 정산 장애가 유료 재호출을 만들지 않게 한다.

§15의 텍스트 단계에서는 native 이미지·PDF·화면 판독, 검색 도구 비용, Qwen·OCR·TTS 지원 완료를 주장하지 않았고 홈 첨부·작업 계획은 partial이었다. 전문 호출 후속 개발 상태는 §16을 따른다. 플랫폼 부담 외 실제 사용자/매장 청구·외부 계정 연결과 운영 가격·한도 검증도 후속이다. [검증 CHECK](../checks/CHECK-O4O-AI-RUNTIME-ACCOUNTING-COMPLETION-V1.md)에 소비처·회귀·미실행을 기록하며 main 병합/배포는 이번 개발 종료 범위에 포함하지 않는다.

## 16. 전문 호출·기존 직접 호출의 회계 연결 — 개발 branch (2026-10-25)

[전문 실행 TODO](../work-orders/TODO-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md)에서 §15의 후속을 한 묶음으로 정비했다. `wo/ai-specialized-runtime-accounting`은 작업 시작 시 main `4ee5a8ecda`에서 시작하고 미병합 선행 `d11cb4afa1`을 정상 merge했다. 이미지/PDF·Gemini/OpenAI 화면 계획·이미지 분석·검색·OCR·음성·Qwen과 기존 편집/URL/강의 직접 호출을 같은 예약/정산에 연결한다. 이전 main·운영 기록은 이번 branch의 배포 증거가 아니다.

서버 내부 `AiNativeInvocation`은 기존 transport의 결과와 타입 있는 사용량만 기존 `AiAccountedExecution.invokeNative`에 전달한다. provider wildcard 텍스트 요율을 전문 단가로 쓰지 않는다. 모델별 `native` profile은 기존 가격 catalog 안에서 입력/출력 예산·이미지/검색 요청/검색 질의/문자 단위를 표현한다. 사용량이 누락되면 기존 보류/reconcile을 사용하고, 성공 후 기록 장애는 유료 재호출하지 않는다. Core 실행기는 Gemini 내부 JSON retry와 중첩되지 않게 실제 시도 수를 통제하며 선택적 `usageKnown`으로 부분 누락을 구분한다. Extension의 안전한 가격 오류 코드는 보존한다.

기존 AIProxy의 provider별 출력 상한·backoff를 유지하며 실제 시도마다 먼저 예약한다. Qwen provider 실패 후 canonical Gemini fallback도 같은 회계를 거치고, quota/가격 거부는 fallback하지 않는다. OCR 업로드와 카탈로그 가져오기 후 콘텐츠에는 host가 검증한 현재 actor를 전달하며 사용자 신원이 없는 내부 작업은 그대로 미지정이다. 업무 권한/자료 공개·저장·실행 확인·Task/Memory를 바꾸지 않는다.

관리 조회는 native 예약/receipt와 기존 로그를 중복 없이 합치며 enum 밖 Qwen/Google Vision·미확정 audio/crash 기록을 포함한다. 원문·이미지/audio·검색어는 공통 원장에 남기지 않는다. 비용은 추정 정책이며 실제 invoice나 외부 제공업체의 강제 결제 상한이 아니다.

**운영 준비:** 명시 모델 요율/profile이 없으면 native 호출은 503으로 차단한다. 운영 설정을 변경하거나 유료 시험 호출·PR/병합/배포를 실행하지 않았다. [CHECK](../checks/CHECK-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md)의 로컬 검증과 [TODO §4](../work-orders/TODO-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md#4-구현-계약과-운영-준비-항목)의 실제 모델/요율·단위·예산·미확정 처리 수용 조건을 확인한 뒤 통합/배포를 판단한다. 전체 AI 화면·직원/소비자 상담·외부 계정/사용자 직접 청구 완료를 뜻하지 않는다.

## 17. 회계 후속 main 통합·운영 적용 (2026-10-25)

사용자의 후속 main 병합·배포 지시로 §15/§16의 개발 변경을 [PR #811](https://github.com/Renagang21/o4o-platform/pull/811)/main `67654de1fe`에 함께 반영했다. 관리 집계의 UUID 비교에서 불필요한 text cast를 제거했고 실제 PostgreSQL의 UUID·enum·JSONB로 회귀를 추가했다. 새 운영 schema/migration·권한·가격·credential·workflow 변경은 없다.

§15/§16의 미병합 기록은 당시 개발 단계의 증거다. 현재 통합·배포·검증 결과는 [후속 CHECK](../checks/CHECK-O4O-AI-ACCOUNTING-INTEGRATION-20261025.md)를 따른다. 코드 배포에서도 가격 미설정 native 호출의 선차단은 유지한다. 실제 사용 활성화에는 모델별 명시 요율/profile·예산과 사용량 미반환 정산 검증이 필요하며, 유료 호출·외부 계정/매장·사용자 청구 완료로 확장하지 않는다.

## 18. 가격·예산 준비 도구 — 후속 개발 (2026-10-25)

[가격 준비 TODO](../work-orders/TODO-O4O-AI-PRICING-READINESS-V1.md)의 `wo/ai-pricing-readiness`는 기존 가격/native 계획기에 명시 catalog를 전달하고 기존 quota 판정을 순수 함수로 재사용하는 오프라인 CLI를 제공한다. 미확정 모델/요율·native 예산과 보류 포함 quota를 제공 표본에서 검사한다. 가격·원장·모델 선택 기반을 중복 생성하거나 provider·DB를 호출하지 않는다. user quota·현재 모델 해석·실사용/배포는 미검증으로 남긴다.

같은 작업에서 비용 한도 경계의 부동소수점 오판을 원장과 같은 소수 8자리 정수 비교로 보완했다. 원자 예약·locking·scope/service/user·기간·보류/정산·업무 권한은 유지한다. source 실행·검증과 실제 요율/설정 적용은 [운영 준비 guide](../guides/O4O-AI-PRICING-READINESS-RUNBOOK-V1.md)·[CHECK](../checks/CHECK-O4O-AI-PRICING-READINESS-V1.md)를 따른다. 이 개발 기록은 §17 이후의 운영 배포나 실제 전문 기능 활성화 증거가 아니다.
