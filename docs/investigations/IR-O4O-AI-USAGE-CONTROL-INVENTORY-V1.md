# IR-O4O-AI-USAGE-CONTROL-INVENTORY-V1

> **상태**: ACTIVE — 사용처 조사 완료, 후속 관리 설계·구현은 별도 작업
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20 (Asia/Seoul)
> **근거 WO/IR**: 사용자 요청 「AI 사용처 조사표 작성」

- 조사 기준: `main`의 `b54074d038c87a3c3b490639aa90d06bc3c4daea` (PR #717 병합 시점)
- 요청: admin.neture.co.kr에서 AI 사용처별 API·모델 선택/변경·사용 중지·사용량/비용 관리를 준비하기 위한 조사표
- 변경 범위: 이 조사 문서 1개. 애플리케이션·설정·DB·정본 변경 없음
- 검증 수준: **소스와 route 등록 연결 조사**. 운영 배포본, 활성 키, DB 정책값, 실제 호출량·청구 금액은 미확인
- 배포 판정: **NOT_APPLICABLE** — 문서만 변경

## 1. 조사 결과와 범위

현재 관리자의 Gemini 모델 설정은 전체 AI에 적용되는 공통 설정이 아니다. 일부 기능은 이를 읽지만, 다른 기능은 scope별 DB 정책, 환경변수, 요청값, 코드 기본값을 사용한다. 중지 설정과 비용 집계도 경로마다 다르다.

기존 AI Core·정책·한도·비용 기록 체계를 재사용하되, **어떤 기능이 어떤 설정과 집계 경로를 거치는지 먼저 연결해야 한다.** 관리자 메뉴 추가만으로 전체 API의 모델 변경·중지가 보장되지는 않는다.

조사 TODO:

- [x] 정본과 과거 조사 기록을 구분하고 최신 기준 SHA 고정
- [x] API 서버·공통 패키지·웹 서비스·관리자·개발 스크립트에서 외부 호출 후보 검색
- [x] 등록된 route에서 실제 실행 함수까지 추적
- [x] 모델 결정, 관리자 값 반영, 사용 중지, 사용량·비용 경로 구분
- [x] 규칙 처리·브라우저 음성·미연결 코드·개발용 호출 분리
- [x] 후속 설계 항목과 적용 검증 기준 작성
- [ ] 운영 설정·실제 이용량·공급자 청구와 대조 — 후속 작업, 이번 조사에서는 미실시

아래 31행은 **업무별 논리적 사용처**다. 같은 endpoint나 실행 함수를 나눠 설명한 행이 있으므로 외부 API 수, 운영 중인 화면 수, 유료 요청 수로 합산하면 안 된다. “등록”은 route 등록 코드가 있다는 뜻이며 실제 운영 이용을 입증하지 않는다. UI에서 없어진 기능도 API가 남아 있으면 별도로 표시했다.

## 2. 표 읽는 방법

모델 결정 경로:

| 표기 | 실제 결정 방식 | 관리자 변경·중지에서 주의할 점 |
| --- | --- | --- |
| Q | `AiQueryPolicy.defaultModel`; 편집 resolver는 유효한 Gemini 모델 → 환경 기본값 → 코드 기본값 순 | `aiEnabled`는 공통 질의에서 검사한다. 이 모델값을 읽는 다른 기능까지 중지되는 것은 아니다 |
| P | `ai_llm_policies`의 scope별 provider/model 및 실행 override | 실행기의 `isEnabled` 검사 존재. executor 인스턴스별 최대 60초 캐시; 정책 부재 시 활성 기본값으로 대체 |
| R | 요청 provider → `AI_DEFAULT_PROVIDER` → Gemini; Gemini 모델은 Q, OpenAI는 환경변수 → 코드 기본값 | 일반/strong 모델이 별도. 전역 중지 검사는 이 resolver에 없다 |
| F | `buildConfigResolver`: Gemini와 `GEMINI_CANONICAL_MODEL` 고정 | 키는 DB/환경에서 구하지만 모델 정책 테이블을 읽지 않는다 |
| C | 요청값·환경변수·개별 코드 상수 | 기능별 구현을 확인해야 하며 관리자 공통 선택으로 변경된다고 볼 수 없다 |

사용량·비용 상태:

- **연결**: `AiAccountedExecution` 경유. 기존 한도 예약·정산, usage log, 단가 snapshot 체계를 사용한다. 실제 DB 기록 성공이나 운영 단가 확인까지 의미하지 않는다.
- **부분**: 토큰 등 usage log는 있으나 이 호출 경로에서 비용 추정·scope·예산 예약이 연결되지 않는다.
- **미연결**: 공통 사용량·비용 원장으로의 연결을 확인하지 못했다. 응답의 토큰 수, 업무 로그, 결과 저장은 비용 원장과 다르다.

모든 모델명은 **저장소 코드의 식별자**다. 공식 제공 여부·운영 선택값·실시간 단가는 이번 조사에서 확인하지 않았다. 예: 현재 canonical Gemini 상수는 `gemini-3.8-flash`, R의 OpenAI 기본 상수는 `gpt-6-astra`다.

## 3. AI 사용처 조사표

| ID | 사용처·진입점 | API·모델 결정 | 관리자 모델 변경 반영 | 사용 중지 반영 | 사용량·비용 | 정비 방향·근거 |
| --- | --- | --- | --- | --- | --- | --- |
| A01 | 공통 서비스 질문·요약 `/api/ai/query` | Gemini / Q | Q 반영 | Q의 `aiEnabled` 및 일일 질의 한도 검사 | **연결** `SERVICE_QUERY`, 서비스·사용자 전달 | 현행 관리 경로의 기준 사례. 서비스별 실제 소비 화면은 별도 구분 [질의][query] |
| A02 | Neture 홈 일반 대화 `/api/ai/home-chat`, 통합 `/api/ai/request` | R → Core `execute` | Gemini는 Q, OpenAI는 환경값 | Q 중지·P 중지 미검사; 요청 제한은 별도 | **미연결** | 홈 대화 기능 식별과 비용 경로 연결 [홈 route][proxy-route] [런타임][runtime] |
| A03 | 홈 이미지·PDF 첨부 해석 | Gemini inline 멀티모달; 다른 provider는 텍스트 실행 경로 | target의 Gemini 모델 반영 | 공통 중지 미검사 | **미연결** | 이 경로의 OpenAI inline 미지원과 Work Agent의 OpenAI vision 지원을 구분 [멀티모달][multimodal] |
| A04 | 통합 요청의 웹 조사·근거 검색 | Gemini / Q, grounding 사용 | Q 모델 반영 | Q 중지·P 중지 미검사 | **미연결**; Extension 로그와 비용 기록은 별개 | 검색 도구 사용과 토큰 비용을 함께 식별 [웹 조사][research] |
| A05 | 병원약국 공개 약품 조사 `/api/hospital/ai/request` | A04 실행 함수 공유 | Q 모델 반영 | 공개 surface/IP 요청 제한; 공통 비용 중지 미검사 | **미연결**, 로그인 사용자 없는 경로 | 공개 이용량·예산 기준 필요. A04와 중복 합산 금지 [공개 route][hospital] |
| A06 | 첨부 파일 구조 추론 `/api/ai/file-understanding` | 결정적 파싱 후 필요할 때 Gemini / Q 추론 | 추론 모델 Q 반영 | 공통 중지 미검사 | **미연결** | 파일 처리 1회와 실제 LLM 추론 발생을 구분 [파일 추론][structure] [route][proxy-route] |
| A07 | 병원약국 공개 파일 구조 추론 `/api/hospital/ai/structure` | A06 추론 함수 공유 | Q 모델 반영 | 공개 요청 제한; 공통 비용 중지 미검사 | **미연결** | A06의 공개 사용처로 구분 [공개 route][hospital] |
| A08 | Work Agent 계획·재계획·strong 복구 | R; 일반/strong 모델 → 텍스트 `execute` | Gemini 일반 Q, 나머지는 환경·코드값 | 공통 중지 미검사 | **미연결** | 업무 1회에 여러 호출 가능; 단계·재시도별 기록 필요 [플래너][planner] |
| A09 | Work Agent 화면 이미지 판독 | R; Gemini/OpenAI 직접 vision 호출 | 모델은 target에 따름; modality별 provider 선택도 존재 | 공통 중지 미검사 | **미연결** | 화면 작업은 OpenAI, 조사 작업은 Gemini를 고르는 modality 규칙과 기본 경로 구분 [플래너][planner] [분기][modality] |
| A10 | Personal Assistant 이해·완료 판정 | `createLlmPlanner` 공유, R | A08과 같음 | 공통 중지 미검사 | **미연결** | 같은 transport라도 이해·계획·완료 판정을 사용처별로 식별 [Assistant][assistant] |
| A11 | 편집 콘텐츠 생성 `/api/ai/content` | Q + 편집 provider resolver; Gemini 또는 허용 surface의 Qwen | Q/guardrail 조건부 반영 | Q 중지·P 중지 미검사 | Gemini **부분**, Qwen은 정보 로그만 | POP/QR/blog 등 허용 범위와 실제 provider/fallback 기록 필요 [편집 proxy][proxy] [guardrail][guardrail] |
| A12 | URL→편집 블록 `/api/ai/url-to-blocks` | 편집 wrapper, surface 미전달 → Gemini / Q | Q 모델 반영 | 공통 중지 미검사 | **부분** | URL 파싱과 생성 호출을 구분 [route][proxy-route] [proxy][proxy] |
| A13 | 콘텐츠의 매장 활용 변환 `/api/ai/content-to-store-use` | Q, 출력 surface에 따른 Gemini/Qwen 조건부 선택 | Q/guardrail 조건부 반영 | 공통 중지 미검사 | Gemini **부분**, Qwen 정보 로그 | A11과 공유 구현, 실제 출력 종류로 분리 [route][proxy-route] [proxy][proxy] |
| A14 | 강의 구조 생성 `/api/ai/course-structure` | 편집 wrapper, surface 미전달 → Gemini / Q | Q 모델 반영 | 공통 중지 미검사 | **부분** | LMS 퀴즈·과제의 별도 실행 경로와 구분 [route][proxy-route] |
| A15 | 강의 본문 생성 `/api/ai/lesson-body` | 편집 wrapper, surface 미전달 → Gemini / Q | Q 모델 반영 | 공통 중지 미검사 | **부분** | 공통 LMS 사용처 체계에 연결 검토 [route][proxy-route] |
| A16 | 이미지 분석 `/api/ai/vision/analyze` | Gemini / Q, route에서 직접 API 호출 | Q 모델 반영 | 공통 중지 미검사 | **미연결** | 텍스트 proxy의 usage 기록도 거치지 않음 [route][proxy-route] |
| A17 | 관리자 생성 도구·일반 블록 생성 `/api/ai/generate` | 요청 provider/model → whitelist/default; OpenAI/Gemini/Claude transport | 요청값 우선; Q를 공통 기준으로 쓰지 않음 | 공통 중지 미검사 | **부분**, 성공/실패 usage log | 클라이언트 고정값·base URL 차이도 확인 필요 [proxy][proxy] [관리자 client][admin-generator] |
| A18 | 상품 AI 태그 재생성·제안 `/api/v1/products/:productId/ai-tags/...` | F → `execute` | 모델 변경 미반영 | 공통 중지 미검사 | **미연결**, 상품 태그 결과/모델 저장만 존재 | `PRODUCT_TAGGING` scope 선언만으로 정책 연결이라 판단하면 안 됨 [태그][tagging] |
| A19 | 전역 상품 설명·POP 등 `ai-contents/generate...`; `/api/v1/catalog-import/jobs/:id/apply`의 적용 상품 자동 생성; `/api/v1/products/:productId/ai-tags/regenerate` 완료 후 연쇄 생성 | P `PRODUCT_CONTENT`; `generateAllContents()`는 상품당 5개 유형을 순차 생성(최대 5회, 태그 호출 별도) | scope DB 정책 반영; 일반 Q와 별개 | P `isEnabled` 검사 | **연결**; 호출 시 사용자 ID 미전달 | 일괄 적용 상품 수 × 최대 5회 및 태그 후 연쇄 호출의 actor·한도 추적 필요 [상품 콘텐츠][product-content] [정책 실행기][policy] [일괄 적용][catalog-import] [공통 트리거][import-common] [태그 재생성][tag-controller] |
| A20 | 매장 콘텐츠 번역 `store-content` controller의 `/direct/:id/translate` | P `CONTENT_TRANSLATION` | scope 정책 반영 | P `isEnabled` 검사 | **연결**, 사용자 전달 | A21과 scope 공유로 독립 제어 불가 [번역][translation] [controller][store-content-route] |
| A21 | 약국 다국어 상담 `/api/v1/neture/pharmacy/multilingual-consultation/translate` | P `CONTENT_TRANSLATION` + 상담 Extension | scope 정책 반영 | P `isEnabled` 검사 | **연결**, 사용자 전달 | 상담/콘텐츠 번역별 모델·중지·집계 분리가 필요한지 설계에서 확정 [상담 번역][consultation] |
| A22 | KPA 선택 목록 요약 `/api/v1/kpa/operator/ai/summarize-selection` | F → `execute` | 모델 변경 미반영 | 공통 중지 미검사 | **미연결** | 운영자 보조 기능으로 식별 [KPA route][kpa] |
| A23 | KPA 콘텐츠 요약 `/api/v1/kpa/contents/:id/ai/summarize` | F → `execute` | 모델 변경 미반영 | 공통 중지 미검사 | **미연결** | 규칙 기반 오류 대체 결과와 AI 성공 구분 [KPA route][kpa] |
| A24 | KPA 콘텐츠 추출 `/api/v1/kpa/contents/:id/ai/extract` | F → `execute` | 모델 변경 미반영 | 공통 중지 미검사 | **미연결** | A23과 공통 실행 경로 정비 검토 [KPA route][kpa] |
| A25 | KPA 콘텐츠 태그 `/api/v1/kpa/contents/:id/ai/tag` | F → `execute` | 모델 변경 미반영 | 공통 중지 미검사 | **미연결** | 상품 태그 A18과 별도 사용처 [KPA route][kpa] |
| A26 | LMS 퀴즈 답안 분석·오답 해설 `/api/v1/ai/analyze`의 quiz | 환경 키 유무로 Gemini 우선/OpenAI; canonical Gemini 또는 `gpt-4o-mini` | Q/P 모델 선택 미반영 | P 실행기 미경유, scope 중지 미검사 | **연결** `LMS_ASSISTANCE` | 환경 키 없을 때 규칙 대체; provider/키를 환경변수에서 직접 결정 [LMS][lms] |
| A27 | LMS 제출 과제 피드백 `/api/v1/ai/analyze`의 assignment | A26과 동일 | Q/P 모델 선택 미반영 | scope 중지 미검사 | **연결** `LMS_ASSISTANCE` | A26과 실행 공유; 기능별 결과 식별 필요 [LMS][lms] |
| A28 | Copilot 운영 인사이트 `/api/v1/platform/copilot` 등록 controller | 환경 키 gate 후 R; Extension → 회계 wrapper | Gemini Q, OpenAI 환경값 | Q/P 중지 미검사 | **연결** `OPERATOR_INSIGHT`, 서비스·사용자 전달 | 비용 연결과 정책 제어 연결은 다름 [Copilot][copilot] |
| A29 | Neture 운영 추천 행동 `/api/v1/neture/operator/actions` | 환경 키 유무로 Gemini 우선/OpenAI; 코드 모델 | Q/P 모델 선택 미반영 | scope 중지 미검사 | **연결** `OPERATOR_ACTIONS`, 사용자 전달 | 사용자/컨텍스트 캐시와 AI 호출을 구분 [운영 행동][actions] |
| A30 | Neture 공급자 HUB AI 갱신 `/api/v1/neture/hub/trigger/ai-refresh` | 레거시 `runAIInsight`, 기본 Gemini/`gemini-2.5-flash`; 환경 키 | Q/P 모델 선택 미반영 | 공통 중지 미검사 | **미연결**, 반환 토큰·audit hook은 비용 원장과 별개 | API 등록 확인; HUB 페이지의 실제 진입/이용 여부는 미확인 [HUB][hub] [구 오케스트레이터][orchestrator] |
| A31 | 유료 음성 합성 API `/api/v1/platform/automation/tts` | 요청 provider, OpenAI `gpt-4o-mini-tts` / Gemini `gemini-3.1-flash-tts-preview` | 코드 고정 모델; 일반 관리자 선택 미반영 | 공통 중지 미검사; 플랫폼 관리자 guard 별도 | **미연결** | API 등록은 남음. 전용 호출 UI 미확인; 제거한 동영상 제작 메뉴를 복구하지 않음 [TTS][tts] [등록][mounts] |

## 4. 화면·공통 소비 코드 연결

화면에 AI 버튼이 존재하는지와 route가 존재하는지를 구분한다. 아래는 소비 코드의 연결 증거이며, 모든 배포 도메인에서 해당 화면이 활성이라는 뜻은 아니다.

| 소비 코드 | 연결된 사용처 | 조사 판정 |
| --- | --- | --- |
| Neture `O4OHomePage`와 [통합 요청 client](../../services/web-neture/src/lib/ai/unified-request.ts) | A02~A04, A06, A08~A10 | 홈 입력의 chat/work 등 분기는 서버에서 수행. 한 입력을 항상 한 API 과금 요청으로 볼 수 없음 |
| 병원약국 [aiRequest client](../../services/web-hospital-pharmacy/src/lib/aiRequest.ts) | A05 | 공개 조사 전용 경로 |
| Store [storeAi client](../../services/web-store/src/api/storeAi.ts), 공통 [AiSummaryModal](../../packages/o4o-ai-components/src/components/AiSummaryModal.tsx) | A01 | 공통 질의 API 소비 코드 확인 |
| 공통 편집기 [useAiContentGeneration](../../packages/content-editor/src/components/useAiContentGeneration.ts), [StoreUseModal](../../packages/content-editor/src/components/StoreUseModal.tsx) | A11~A13 | 컴포넌트 존재가 모든 매장에 AI 생성 버튼 노출을 의미하지 않음; 외부 AI 활용 원칙과 삭제된 진입점 유지 |
| 관리자 [SimpleAIGenerator][admin-generator], [BlockCodeGenerator](../../apps/admin-dashboard/src/services/ai/BlockCodeGenerator.ts) | A17 | `SimpleAIGenerator`는 `/api` base 사용; `BlockCodeGenerator`의 다른 client/base 경로는 실제 소비 여부와 함께 후속 확인 |
| 관리자 [pop.api](../../apps/admin-dashboard/src/api/pop.api.ts) | A19 | 전역 상품 콘텐츠 생성 API 호출 확인 |
| Store [StoreMultilingualConsultationPage](../../services/web-store/src/pages/pharmacy/StoreMultilingualConsultationPage.tsx) | A21 | 번역은 서버, 음성 입력·읽기는 브라우저 기능 |
| KPA [OperatorContentDetailPage](../../services/web-kpa-society/src/pages/operator/OperatorContentDetailPage.tsx), [ProductApplicationManagementPage](../../services/web-kpa-society/src/pages/operator/ProductApplicationManagementPage.tsx) | A22~A25 | 선택 목록/본문의 요약·추출·태그 호출 확인 |
| Neture [HubPage](../../services/web-neture/src/pages/hub/HubPage.tsx) | A30 | `ai-refresh` client 구현 존재. 페이지의 현행 route 진입과 운영 이용은 미확인 |

## 5. 외부 호출과 구분해야 하는 코드·계획

| 대상 | 확인 내용 | 관리 대상 판정 |
| --- | --- | --- |
| Store AI 매장/상품 인사이트 | [StoreAiInsightService](../../apps/api-server/src/modules/store-ai/services/store-ai-insight.service.ts), [StoreAiProductInsightService](../../apps/api-server/src/modules/store-ai/services/store-ai-product-insight.service.ts)는 존재하지만 생성·실행 소비처를 확인하지 못함 | **미연결 코드**. 운영 중인 AI나 복구 대상으로 산정하지 않음 |
| Care 등 scope 명칭 | [scope union][scopes]에 Care/Store 관련 명칭이 남아 있어도 실제 실행 소비처와 연결은 별개 | 선언만으로 운영 사용처·관리자 메뉴 생성 금지 |
| 건강기능식품 설명 일괄 적용 스크립트 | [bulk-apply](../../apps/api-server/src/scripts/health-functional-food-store-description-bulk-apply.ts)의 `resolveGenerationCapability()`는 현재 `available: false` 반환 | 독립 실행기의 회계/한도 연결 미구성. 실제 유료 생성 사용처로 산정하지 않음; 실행하지 않음 |
| 이미지 개발 smoke | [astra-image-smoke](../../scripts/ai/astra-image-smoke.mts)는 수동 실행 시 OpenAI 유료 호출 가능 | **개발용 호출**, 공통 비용 기록 미연결. 이번 조사에서는 실행하지 않음 |
| Gemini grounding 개발 smoke | [gemini-grounding-smoke](../../scripts/ai/gemini-grounding-smoke.mts)는 수동 실행 시 실제 Gemini grounding 생성 호출과 출처 메타데이터를 확인 | **개발용 유료 호출 가능**, 공통 비용 원장·업무 quota 연결 밖. 환경변수의 키·모델을 공통 execute에 직접 주입하며 이번 조사·통합에서는 실행하지 않음 |
| 범용 파일 구조 추론 개발 smoke | [generic-file-understanding-smoke](../../scripts/ai/generic-file-understanding-smoke.mts)는 합성 CSV와 기존 inference 서비스에 resolver를 주입해 생성 호출(재시도 포함 최대 2회) | **개발용 유료 호출 가능**, 공통 비용 원장 밖. CLI의 모델 resolver override는 관리 설정 적용·운영 usage 수집과 별개. 이번 조사·통합에서는 실행하지 않음 |
| TTS production smoke 소비처 | [tts_ab_cut1.py](../../scripts/media/minerock600-pilot/ep01/tts_ab_cut1.py)는 기본 production API의 A31 TTS endpoint를 호출. `--only` 미지정 시 OpenAI와 Gemini를 순차 요청(최대 2건) | **운영 호출 가능 smoke**, 운영 UI와 구분. A31의 기존 endpoint·미연결 비용 경계를 그대로 따르며 이번 조사·통합에서는 실행하지 않음 |
| Forum AI 요약·태그 | [ForumAIService](../../apps/api-server/src/services/forum/ForumAIService.ts)의 기본 `RuleBasedProvider`; 실제 외부 provider 주입 소비처 미확인 | 현재 확인 경로는 규칙 처리. 외부 API 사용량으로 산정하지 않음 |
| 상품 AI 검색·추천 | [검색 서비스](../../apps/api-server/src/modules/store-ai/services/product-ai-search.service.ts), [추천 서비스](../../apps/api-server/src/modules/store-ai/services/product-ai-recommendation.service.ts)는 태그·DB 조회 | 검색 1회마다 새 LLM 호출이 발생하는 구조가 아님 |
| 사이니지 AI 생성 | [content.service](../../apps/api-server/src/routes/signage/services/content.service.ts)의 placeholder 생성 | 실 LLM 호출 아님. 제외한 관리자 사이니지 메뉴 복구 근거로 사용하지 않음 |
| 약국 상담 음성 입력/읽기 | [useConsultationSpeech](../../services/web-store/src/pages/pharmacy/useConsultationSpeech.ts)의 브라우저 `SpeechRecognition`/`speechSynthesis` | O4O의 유료 STT/TTS API 호출과 구분. 브라우저 공급자의 서버 처리 여부·비용까지 확인한 것은 아님 |
| 사용자 개인 ChatGPT/Claude/Gemini 활용 | 외부 AI에서 작성 후 복사·가져오는 흐름은 콘텐츠 운영 정본이 구분 | O4O API 사용량·키·청구 관리 대상과 분리 |
| 향후 유료 음성→텍스트 | 조사 범위에서 `audio/transcriptions` 등 유료 STT adapter/등록 route를 찾지 못함 | **도입 예정**. 공급자·음성 보관·과금 단위·모델 호환성은 구현 전 별도 확정 |
| DeepSeek | guardrail/type 정의에는 있으나 조사한 공통 runtime·proxy에서 실제 DeepSeek transport 미확인 | 사용자 언급 사용처는 추가 위치 확인 필요. 저장소 밖/비공개 사용 여부는 판단하지 않음 |

## 6. 공급자별 현재 연결 범위

| 공급자 | 확인된 구현 | 현재 관리 범위의 한계 |
| --- | --- | --- |
| Gemini | 공통 runtime·편집·grounding·vision·정책 실행·TTS 등 | 경로마다 모델/중지/비용 기록이 다름 |
| OpenAI (ChatGPT API) | Core runtime, 일반 proxy, Work Agent vision, LMS/운영 보조, TTS | 일반 Q UI는 OpenAI 전용 선택 UI가 아님. Home 첨부와 Work Agent vision 지원 범위도 다름 |
| Claude | 일반 proxy의 `callClaude` 구현 | 공통 Core/P 실행기가 지원하는 provider와 집합이 다름; 실제 활성 키/이용은 미확인 |
| Qwen | 허용된 저위험 편집 surface의 조건부 transport, 실패 시 Gemini fallback | 실험 범위 제한. 공통 usage provider enum 미지원, DB usage/cost 기록 미연결 |
| DeepSeek | 편집 guardrail 정의; 현재 허용 surface 비어 있음 | 공통 호출 transport·비용 연결을 확인하지 못함. 이름을 선택지에 추가하는 것만으로 사용 불가 |
| 유료 STT | 현재 조사에서 adapter 미확인 | 브라우저 음성과 구분해 신규 연결 설계 필요 |

## 7. 설정·집계 연결에서 확인한 공통 문제

1. **관리자의 설정은 여러 체계로 나뉜다.** [AI 설정 화면][admin-settings]은 `/api/ai/policy`와 Gemini `/api/ai/models`를 사용한다. [관리 API][admin-route]에는 엔진·정책·집계·한도·청구가 있으나 scope별 `ai_llm_policies` 편집과 모든 사용처 연결을 제공하는 것은 아니다. 엔진 활성화는 Q의 기본 모델도 변경한다.
2. **모델을 읽는 것과 중지를 읽는 것은 다르다.** Q의 `aiEnabled`는 A01에 적용된다. P의 `isEnabled`는 P 실행기를 경유할 때 적용된다. `executeAccountedAi`만 사용하는 A26~A29는 비용 관리에 연결되지만 P 중지 검사에 연결되지 않는다. [Core `execute`][execute]나 Extension 사용 자체에는 전역 중지·비용 원장 기능이 없다.
3. **키 비활성화는 provider 중지를 보장하지 않는다.** [키 resolver][keys]는 활성 DB 설정을 찾은 뒤 환경 키로 대체할 수 있다. 키 관리와 호출 중지는 구분해야 한다. 키 조회 경로도 완전히 통일되지 않았다. A01은 `AiSettings.isActive` entity 조회를 사용하지만 공통 resolver는 `ai_settings`의 `isEnabled`를 SQL로 조회하고, LMS/Neture 운영 행동은 환경 키를 직접 사용한다. 실제 DB 스키마 정합성은 후속 확인 대상이다. 이번 조사에서는 키값이나 운영 환경변수를 읽지 않았다.
4. **현재 비용 합계를 전체 비용으로 볼 수 없다.** [회계 실행][accounting] 경유와 [usage entity][usage] 저장만 하는 경로가 섞여 있다. proxy는 토큰을 저장해도 `costEstimated`·scope와 한도 예약이 빠져 있으며 Qwen은 정보 로그만 남긴다. 관리자 집계의 비용 합계나 0이 실제 청구의 전체 합계·무료임을 뜻하지 않는다. 집계 실패를 0/빈 목록으로 반환하는 관리 API 경로도 오류/미집계와 구분할 필요가 있다.
5. **사용처 식별이 부족하다.** usage entity에는 provider/model/scope/user/requestId 등이 있으나 모든 행에 명시적인 서비스·기능 ID가 있는 것은 아니다. Extension metadata의 feature와 회계 원장 차원을 혼동하면 안 된다. 특히 A20/A21은 `CONTENT_TRANSLATION`을 공유한다. A19는 사용자 ID를 전달하지 않는다.
6. **단가·과금 단위를 확장해야 한다.** [가격 체계][pricing]에는 환경 단가 catalog, 버전, token 입력/출력 및 기존 추정 fallback이 있다. 재사용하되 운영 단가와 공급자 청구 대조가 필요하다. 유료 STT의 음성 길이, TTS 과금 단위, grounding/tool 비용을 토큰만으로 표현할 수 있다고 가정하지 않는다. usage의 `durationMs`는 응답 지연 시간으로 음성 과금 길이가 아니다.
7. **변경 적용 확인이 없다.** P는 인스턴스별 60초 캐시, R은 환경/요청값, F는 코드 상수다. 일부는 DB 저장으로 바뀌고 일부는 배포가 필요하다. 현재 구조에서 관리자 저장 성공을 모든 실행 인스턴스 적용 성공으로 표시할 근거는 부족하다. 정책 부재 fallback도 중지 상태와 다르다.

## 8. 다음 정비 작업의 순서와 완료 기준

아래는 조사에 따른 **후속 제안**이며 새 사업 정책·청구 주체·데이터 보관 정책을 확정하거나 구현한 기록이 아니다. 기존 AI Core·Extension·quota·정산 계층을 재사용한다.

| 순서 | 정비 항목 | 완료 기준 |
| --- | --- | --- |
| 1 | 사용처 catalog | 서비스/기능, text·vision·grounding·STT·TTS 능력, 현재 provider/model, 제어/집계 연결 여부를 이름으로 조회. 미연결·미사용·예정 상태를 분리 |
| 2 | 기능별 선택·중지 계약 | 지원되는 공급자/모델만 선택. Q/P/R/F/직접 호출의 우선순위 명시. 개별 기능과 공통 중지 범위, fallback 허용 여부를 설계하고 우회 호출이 없는지 검증 |
| 3 | 실제 호출·비용 연결 | 기존 회계 경로에 직접 호출을 연결. 시도/재시도/fallback별 provider/model·사용처·사용자/비로그인 주체를 식별하고 과금 중복/누락 방지. 집계 불가를 0과 구분 |
| 4 | 설정 적용 확인 | 정책 버전·적용 시각·캐시/인스턴스 반영을 확인. 새 요청의 적용 결과 및 중지 중 fallback/재시도의 동작 검증. 새 adapter 추가와 설정 변경을 구분 |
| 5 | 관리자 초기 화면 | 사용처별 현재 설정·사용 상태·집계 연결 상태와 기간별 호출/실패/단위별 사용량/추정 비용을 표시. 관리자에게 키 문자열을 기억하거나 입력하게 하지 않음 |
| 6 | 운영 대조 | 승인된 비공개 연결로 실제 설정/사용 기록을 확인하고 공급자 청구와 대조. 유료 smoke가 필요하면 범위·비용을 정한 별도 검증으로 수행 |

UI 초기 구조는 **사용처 설정 / API·모델 연결 / 사용량·비용**의 세 영역을 후보로 삼는다. 서비스별 업무 처리·회원 이용 관리로 범위를 확대하지 않는다. 동영상 제작·사이니지·AppStore 등 이미 제외한 관리자 기능을 이 조사 때문에 복구하지 않는다.

## 9. 조사 근거·재현·문서 정합

정본:

- [AI Core + Extension Foundation](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md), 특히 기존 비용·정책 계층과 미연결 경로 구분
- [AI Usage Flow](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md)
- [AI Automation Evolution Principles](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) §25
- [Personal Assistant Architecture](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §18
- [Store Content Production Operating Principles](../baseline/O4O-STORE-CONTENT-PRODUCTION-OPERATING-PRINCIPLES-V1.md)

과거 [모델/provider 선택 조사](IR-O4O-AI-MODEL-PROVIDER-SELECTION-SETTINGS-V1.md)는 당시 기록이다. 편집 모델 resolver·Qwen·다중 provider 등의 후속 변경을 반영한 현재 판정은 이 문서의 기준 SHA에서 확인했다. 과거 문서의 “편집 경로가 관리자 모델을 전혀 읽지 않는다”는 판정을 현행 코드에 그대로 적용하지 않는다.

검색 범위는 `apps/api-server/src`, `apps/admin-dashboard/src`, `packages`, `services`, `tools`, `scripts`의 소스이며, test/dist/node_modules/data 결과는 실제 사용처 판정에서 제외했다. 다음 키워드를 검색하고 import·호출·route 등록·클라이언트 소비 코드를 추적했다.

```text
@o4o/ai-core, executeAccountedAi, createPolicyExecutor, runAiExtension,
runAIInsight, resolveAiTarget, generateRawContent, callProvider,
generativelanguage.googleapis, api.openai.com, api.deepseek.com,
api.anthropic.com, dashscope, audio/transcriptions, SpeechRecognition
```

주석 정합 발견 3건(이번 범위에서는 수정하지 않음):

1. `ai-config-resolver.ts` 헤더는 `ai_model_settings` 조회를 설명하지만 실제 구현은 F의 고정 모델이다.
2. `ai-proxy.service.ts`의 `generateEditingRawContent` 설명은 비-Gemini transport 미연결이라고 하지만 본문에 Qwen 호출이 구현되어 있다.
3. `ai-editing-model-resolver.ts`의 비-Gemini 호출이 후속 작업이라는 설명도 현재 편집 wrapper의 Qwen 분기와 다르다.

조사 검증: 문서 민감정보 검사, diff 공백 검사, 내부 파일 링크 존재 여부 및 사용처 ID 중복 검사. 실제 API 호출·유료 모델 실행·운영 DB 조회/수정·migrate·배포는 수행하지 않았다. 소스 조사는 정상 응답·정산·설정 전파에 대한 운영 smoke를 대체하지 않는다.

[query]: ../../apps/api-server/src/services/ai-query.service.ts
[proxy-route]: ../../apps/api-server/src/routes/ai-proxy.routes.ts
[runtime]: ../../apps/api-server/src/utils/ai-provider-runtime.ts
[multimodal]: ../../apps/api-server/src/services/ai-tools/multimodal-chat.ts
[research]: ../../apps/api-server/src/services/ai/web-research.service.ts
[hospital]: ../../apps/api-server/src/routes/hospital/hospital.routes.ts
[structure]: ../../apps/api-server/src/services/ai-tools/file-understanding/structure-inference.service.ts
[planner]: ../../apps/api-server/src/services/ai-tools/work-planner.ts
[modality]: ../../apps/api-server/src/services/ai-tools/task-modality-router.ts
[assistant]: ../../apps/api-server/src/services/assistant/assistant-understanding.ts
[proxy]: ../../apps/api-server/src/services/ai-proxy.service.ts
[guardrail]: ../../packages/types/src/ai-provider-guardrail.ts
[admin-generator]: ../../apps/admin-dashboard/src/services/ai/SimpleAIGenerator.ts
[tagging]: ../../apps/api-server/src/modules/store-ai/services/product-ai-tagging.service.ts
[catalog-import]: ../../apps/api-server/src/modules/catalog-import/services/catalog-import.service.ts
[import-common]: ../../apps/api-server/src/modules/neture/services/product-import-common.service.ts
[tag-controller]: ../../apps/api-server/src/modules/store-ai/controllers/product-ai-tag.controller.ts
[product-content]: ../../apps/api-server/src/modules/store-ai/services/product-ai-content.service.ts
[policy]: ../../apps/api-server/src/modules/ai-policy/ai-policy-executor.service.ts
[translation]: ../../apps/api-server/src/modules/store-ai/services/content-ai-translation.service.ts
[store-content-route]: ../../apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts
[consultation]: ../../apps/api-server/src/modules/neture-pharmacy/services/consultation-translator.ts
[kpa]: ../../apps/api-server/src/routes/kpa/kpa.routes.ts
[lms]: ../../apps/api-server/src/modules/ai/services/LmsAIService.ts
[copilot]: ../../apps/api-server/src/copilot/copilot-engine.service.ts
[actions]: ../../apps/api-server/src/modules/neture/services/operator-ai-llm.service.ts
[hub]: ../../apps/api-server/src/modules/neture/controllers/hub-trigger.controller.ts
[orchestrator]: ../../packages/ai-core/src/orchestration/orchestrator.ts
[tts]: ../../apps/api-server/src/modules/automation/services/tts-narration.service.ts
[mounts]: ../../apps/api-server/src/bootstrap/register-routes.ts
[scopes]: ../../apps/api-server/src/modules/ai-policy/ai-policy-scope.ts
[admin-settings]: ../../apps/admin-dashboard/src/pages/settings/AiQuerySettings.tsx
[admin-route]: ../../apps/api-server/src/routes/ai-admin.routes.ts
[execute]: ../../packages/ai-core/src/orchestration/execute.ts
[keys]: ../../apps/api-server/src/utils/ai-key.util.ts
[accounting]: ../../apps/api-server/src/modules/ai-policy/ai-accounted-execution.ts
[usage]: ../../apps/api-server/src/entities/AIUsageLog.ts
[pricing]: ../../apps/api-server/src/modules/ai-policy/ai-pricing.ts

## 2026-10-21 통합 검토 보완

사용자 main 병합·배포 지시에 따라 기존 PR #721을 재사용하고 설계 문서를 함께 검토한다. 원래 조사 기준 SHA와 당시 결과는 유지한다. Codex가 지적한 개발용 Gemini grounding·범용 파일 smoke의 유료 호출 가능 경로를 위 별도 분류에 추가했다. 31개 업무 사용처와 개발 스크립트를 합산하지 않으며, 해당 유료 스크립트는 실행하지 않았다. 이후 구현·운영 적용 여부는 현행 [AI 공통 기반](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md)의 완료/후속 구분과 각 구현 기록을 따른다. 문서 통합은 운영 설정·DB write·신규 공급자 호출 승인이 아니다.

추가 리뷰 보완: A31의 production-capable TTS smoke 소비처와 최대 2건 호출을 별도로 연결했다. A19에 상품 일괄 적용 및 태그 재생성 이후의 자동 콘텐츠 생성 진입점과 상품당 최대 5회 호출을 추가했다. 새로운 업무 사용처로 중복 집계하지 않으며, 기존 PRODUCT_CONTENT 공유 정책과 사용자 귀속 미전달을 유지해서 기록한다.
