# AI 실행 경로의 비용·quota 연결 후속 정비

> **상태**: COMPLETED
> **개발 결과**: push 인계 (main/운영 미반영)
> **작성일**: 2026-10-25 (Asia/Seoul)
> **근거**: 사용자 AI 후속 작업 진행 지시 · [전체 정비 TODO](TODO-O4O-AI-WORK-EXTENSION-REALIGNMENT-V1.md)의 S2-2/S4-4
> **기준**: main `b7d2cfd86edf4d26d19d1e954fa754f74faf8f7d` · `wo/ai-runtime-accounting-completion`
> **관련 정본**: [AI 공통 기반](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md) · [Assistant V2](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md)

## 1. 목적과 범위

기존 AI 기능의 공통 비용·quota 연결에서 남은 호출을 실제 소비처 기준으로 조사하고, 현재 실행·가격 계약으로 지원할 수 있는 경로를 기존 예약/정산에 연결한다. 업무별 실행기·가격/사용량 원장·Task/Memory를 복제하지 않는다. provider/model 선택과 업무 Extension, 인증·자료 접근·실행 확인은 기존 책임을 유지한다.

이번 개발의 종료점은 코드·문서·검증·commit/push다. 운영 DB/설정·요금/credential·유료 호출·PR/병합/배포는 별도 실행이다. 새 schema·migration·외부 유료 계약을 추가하지 않는다. 입력/출력 단위나 안전한 예산을 기존 계약으로 설명하지 못하는 전문·멀티모달 경로는 지원 완료로 표시하지 않고 남은 조건을 명시한다.

## 2. 실행 TODO

- [x] A1 최신 사용처·Core/직접 transport·가격/예약·인증 actor 전달을 재산출하고 연결표 보완
- [x] A2 기존 모델 선택·retry/fallback·실패 동작을 보존하며 지원 가능한 실제 호출을 공통 회계에 연결
- [x] A3 상품 태그 등 현재 인증 주체를 확보하는 소비처의 사용자 귀속을 연결하고 서버 작업에는 actor를 추정하지 않음
- [x] A4 관리 목록·scope·정산 상세와 실제 호출의 일치, 미지원/부분 연결 표시 정비
- [x] A5 quota 초과/DB·가격 장애 전 provider 차단, 사용량 누락·성공 후 정산 실패·중복 유료 재시도·도메인 권한 회귀
- [x] A6 구조 문서·전체 TODO와 실제 범위/검증/잔여 항목 정합 후 commit/push

## 3. 조사·설계 보완

| 실제 호출·소비처 | 문맥·권한·actor | 실행·저장·비용 판정 |
|---|---|---|
| `/api/ai/home-chat`, 통합 `/api/ai/request`의 chat 텍스트·텍스트 첨부·다른 provider의 이미지 대체 텍스트 | 기존 인증·Neture 가입·scope/자료/tool 판정 유지. 인증 actor만 서버가 전달 | CONNECT: 기존 모델/프롬프트/출력/재시도 → `executeAccountedAi`, SERVICE_QUERY/neture. 대화 원문 저장 없음 |
| Work Planner 일반/강화 텍스트, per-task provider factory 4종 | 기존 요청 host가 인증 userId를 factory closure에 전달. 인자/observation/이미지를 권한으로 쓰지 않음 | CONNECT(텍스트만): 동일 모델과 JSON 계약, 호출별 예약·정산. 런타임 상태/Memory/Task·복구 판단 변경 없음. native 이미지 계획은 DEFER |
| `/api/ai/file-understanding` | 기존 로그인·파일 크기·스키마 검사 후 서버 actor 사용. profile 표본만 모델에 전달 | CONNECT: 기존 구조 추론 helper에 accounted invocation 주입. 정규화·confidence·반환 구조 KEEP. SERVICE_QUERY/neture |
| 공개 `/api/hospital/ai/structure` | 기존 무로그인·IP/표면 요청 제한·표본/스키마 검증 유지. body의 userId/serviceKey로 귀속하지 않음 | CONNECT: 현재 Neture 공개 기능으로 SERVICE_QUERY/neture; 사용자 한도는 신원 없음. 별도 hospital 청구 identity·원장 신설 없음 |
| 전역 상품 태그 생성/제안·단일/일괄 콘텐츠·태그 후속 콘텐츠 | 기존 `resolveGlobalProductResourceAccess` write 판정 후 인증 actor 전달. 공급자/매장/운영자의 기존 자원 권한을 확장하지 않음 | CONNECT(actor): 태그 PRODUCT_TAGGING, 콘텐츠 PRODUCT_CONTENT 기존 정책. 태그 실패/불량 응답이면 false → 후속 유료 생성 중단. 기존 비동기 시작 응답 유지 |
| `catalog-import` → `ProductImportCommonService.triggerAiContentGeneration` | 입력은 상품 자료 배열이며 검증된 actor 인자가 없음 | KEEP: 기존 PRODUCT_CONTENT의 플랫폼·서비스/scope 한도 유지. 배치 생성자·상품 소유자를 사용자로 추정하지 않음 |
| standalone `generic-file-understanding-smoke.mts` | 개발자가 자기 환경 계정으로 명시 실행, HTTP 경로 아님 | KEEP: helper의 명시 invocation 인자에 Core execute 주입. 서버 원장/운영 quota smoke가 아니며 이번에 유료 호출하지 않음 |
| StoreAiInsightService/StoreAiProductInsightService | 소스 전수 검색에서 현재 생성/호출 소비처 미확인. entity 등록만 존재 | DEFER: 코드 존재만으로 현행 기능으로 복구하거나 신규 UI/회계 완료를 주장하지 않음 |

경계는 기존 Core 실행 계약 → 서버 회계 adapter → 업무 helper/Extension → 인증 host다. 공개 파일 추론과 로그인 파일 추론은 같은 순수 해석 서비스를 사용하며 invocation은 host가 명시적으로 소유한다. provider/model 결정은 기존 관리 설정과 resolver에 남기고 별도 모델 선택기나 Core를 만들지 않는다.

가격은 기존 catalog snapshot과 텍스트 예산을 사용하며 운영 가격을 새로 지정하지 않는다. 한도 예약은 호출 전에 수행하고 성공 후 기록 장애를 재호출의 이유로 삼지 않는다. 사용량 누락은 기존 미확정 예약 유지로 처리한다. 로컬 `QUOTA_EXCEEDED`는 429/재시도 불가, quota DB/가격·정책 유효성 장애는 503/재시도 불가로 정규화한다. provider 429 rate limit·크레딧 소진과 구별한다. 이번에 정비한 AI 오류 로그에는 본문·응답·자격정보 대신 정규화된 코드·계수만 남긴다.

관리 목록은 home.chat/file.structure/hospital.structure를 connected, home.attachments/work.planning을 partial로 표시한다. partial의 scope 표시는 연결된 텍스트 호출의 귀속이며 이미지/전체 작업까지 한도가 적용된다는 뜻이 아니다. 기존 query/scope 정책의 중지 설정을 새 host에 임의 적용했다고 표시하지 않는다. 실제 가격·모델 능력·계정 연결과 소스의 선택 가능 상태를 혼동하지 않는다. 플랫폼 부담은 기존 선택지로 유지하며 이번 정비로 매장/사용자/외부 계정의 실제 청구를 도입하지 않는다.

### 3-1. 다음 구현 묶음과 수용 조건

| 잔여 묶음 | 먼저 확인할 계약·검증 |
|---|---|
| Gemini 이미지/PDF·Gemini/OpenAI 화면 계획 | 실제 이미지/PDF 입력 단위와 모델별 안전한 사전 예산, native 응답의 usage/미확정 처리, 재시도 횟수, provider 교체 능력. 현재 텍스트 bytes를 이미지 토큰으로 간주하지 않음 |
| 웹 grounding 검색, Google Vision OCR, TTS, Qwen 편집 | 검색 도구 호출 수·이미지/문자/음성 등 실제 과금 단위/가격/공급자 계약과 오류 처리를 먼저 대조. 기존 quota/정산을 확장할 필요를 확인한 후 연결하며 근거 없는 요율을 만들지 않음 |
| 운영 검증·외부 계정/사용자 부담 | 승인된 시험 계정·실제 가격/한도·작업 결과를 별도 검증. 실제 청구/결제·운영 credential 변경은 이번 코드 정비 완료와 분리 |

위 묶음은 전체 TODO S2-2/S4-4의 잔여이며 이번 A1~A6의 종료를 전체 AI 회계 완료로 읽지 않는다.

## 4. 검증·인계

실행한 명령·결과·소비처 영향과 미실행은 [CHECK](../checks/CHECK-O4O-AI-RUNTIME-ACCOUNTING-COMPLETION-V1.md)를 따른다. 새 작업공간은 기준 main checkout 밖에 분리했으며 다른 worktree를 수정하지 않는다. 배포가 필요한 코드 변경은 `DEPLOYMENT = REQUIRED`로 인계하되 개발 완료를 운영 반영 완료로 표시하지 않는다.

최종 로컬 검증: API Jest 627 suites 중 576 PASS / 51 SKIP, 9,304 tests PASS / 760 SKIP, 실패 0. 공통 package·API build, API·Neture·hospital·admin 타입 검사, 변경 18개 TS/MTS lint, 웹 소비 테스트 30건과 문서 5개 민감정보/상대 링크 검사를 통과했다. 제외된 테스트를 실행 성공으로 합산하지 않는다. 새 API/provider를 운영에서 호출하거나 모델·가격·한도·인증 설정을 저장하지 않았다. 최종 commit SHA·원격 일치는 인계 보고를 따른다.


후속 전문 호출 개발: [TODO](TODO-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md)·[CHECK](../checks/CHECK-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md). 새 branch `wo/ai-specialized-runtime-accounting`은 이 텍스트 commit도 포함한다. Native·직접 호출 공통 회계와 가져오기 host의 현재 인증 actor 전달을 추가했으며 §3의 DEFER/actor 부재 설명은 텍스트 회차 당시 상태다. 운영 요율/profile 준비·실제 검증과 main/배포는 별도다.
