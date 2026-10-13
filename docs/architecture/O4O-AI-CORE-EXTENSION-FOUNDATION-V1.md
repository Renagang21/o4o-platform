# O4O AI Core + Extension 공통 기반

> 상태: ACTIVE · 작성일: 2026-10-13 · 범위: 이번에 추가하는 업무 실행 계약과 전환 계획
> 근거: 사용자 요청 · [구현 WO](../work-orders/WO-O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md)
> 조사 기준: `3c95dc170103f739a3e3a33b20f85350ae0ecef5`. 코드 존재는 현행 사업 기능이라는 증거가 아니다.

## 1. 기존 구조·문제

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
quota는 원자 예약/정산/해제로 보강하고 usage/이력 실패를 관측해야 한다. 첫 연결은 기존 정책을 유지한다.
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
| P0 | 자산/소비처/정본 조사·공통 계약·연결안 | 이번 문서 |
| P1 | additive 실행·번역 연결·actor/자료/부담·거부/실패/교체 테스트 | 이번 구현 |
| P2 | 모델별 가격/정책 버전·서비스 기능 선택·원자 quota 예약·신뢰 가능한 usage/이력 연결 | 후속 DB/정책 작업 |
| P3 | 편집/요약/상품 비교 확대·기존 HTTP/stream/multimodal 회귀 후 이관 | 후속 |
| P4 | 게시/주문 도구 proposal/confirmation/idempotency를 기존 업무 실행에 연결 | 별도 실행 범위 |
| P5 | 개인/매장 외부 계정·외부 비서 ingress·scope/consent·직원/소비자 상담 | 별도 인증/자료 전송 검토 |

Assistant V2 A→I 순서와 Memory/Experience/Node 구조를 대체하지 않는다. AI Core는 공통 업무 경계다.

## 7. 정합·소비처

[Core freeze](O4O-CORE-FREEZE-V1.md)·[Extension guide](../platform/extensions/EXTENSION-GENERAL-GUIDE.md)·[공통 변경](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)·[자동화 §25](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)·[Assistant V2 §18](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md)·[콘텐츠 운영](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)·[상품 AI 소유권](../design/DESIGN-O4O-PRODUCT-AI-CONTENT-OWNERSHIP-AND-STORE-DESCRIPTION-CONTRACT-V1.md) 기준.

번역의 직접 소비처는 공통 store-content controller(KPA/Neture store)이다. 기존 ai-core export/provider 호출 형태는 유지해 Care/Forum/LMS/관리자/Home/도구/stream 소비처를 보존한다.
import·symbol·endpoint·파일 경로·raw-source assertion census를 수행한다. 퇴역 K-Cosmetics/SiteGuide/PharmacyHub 기능을 재생성하지 않는다.

## 8. 검증 결과

- `pnpm run build:packages`: PASS.
- `pnpm --filter @o4o/ai-core run build` 및 `typecheck`: PASS.
- `pnpm --filter @o4o/api-server run build` 및 `type-check`: PASS.
- Jest `ai-business-extension.spec.ts`, `content-translation-extension.spec.ts`, `store-content-selected-organization.spec.ts`: 3 suite / 38 test PASS.
- 기존 `security/ai-orchestration.spec.ts`: PASS. 초기 두 신규 suite는 Jest의 import-only ESM prompt subpath 해결 실패로 미실행, 실제 prompt 소스를 테스트 mapper로 연결 후 재실행 PASS. assertion을 완화하지 않았다.
- 변경 업무/Core 파일 ESLint: 오류 0. execute.ts의 기존 unused AIProviderResponse warning 1건은 별도 기존 항목.
- docs 민감정보 검사: PASS(3878 files), git diff --check: PASS.
- 권한 거부/다른 매장 자료/consumer→staff 자료 거부, runtime 업체 교체, 부담 선택 전달, 미연결/한도/응답 오류, 원문 비기록, 이력 실패, draft 저장/연결 ID, 호출 중 권한 회수/원문 변경을 검증했다.
- provider 호출은 mock이며 실제 유료 호출·운영 인증·실계정·UI 재배치는 미실행. 담당 간 실시간 협의와 운영 적용은 아직 하지 않았다.


### 현재 한계

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
텍스트 질의/서비스 운영 요약 기반을 전체 카탈로그에 제공하고 기존 업무 사례를 Core+Extension으로 연결한 코드 단계다.
모델별 정책/가격·원자 quota·durable 이력·외부 계정은 §6 P2/P5로 남는다.

### 서비스 확대 검증

서비스별 Core task·LMS/추천 검증 56개, 실제 질의 HTTP 경로 15개, 기존 AI/번역/리서치/병원약국/모델 선택 회귀 127개 PASS.
운영자 요약 10개 PASS. 합계 208개 테스트(11 suite) PASS. Core build·API build/type-check PASS. 변경 파일 ESLint 오류 0(기존 ai-query route unused catch warning 4건), docs 민감정보 검사 3881개 파일 PASS, git diff --check PASS. 외부 provider는 mock, 실제 유료 호출/운영 인증/서비스 UI 변경은 미실행.

종료 범위는 작업 branch push이며 main 통합/PR 병합/배포는 실행하지 않는다. WORKTREE_DISPOSITION: `wo/ai-core-extension-foundation` / base `b3f792578a` / main integration 없음 / CI 원격 미실행 / deployment 미실행 / KEEP(검토·후속 작업용).
