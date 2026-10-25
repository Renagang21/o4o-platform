# 전문·멀티모달 AI 실행의 공통 회계 연결

> **상태**: COMPLETED · 2026-10-25
> **개발 결과**: 로컬 검증 완료·commit/push 인계 단위. main/운영 적용·가격 준비는 별도
> **근거**: 사용자 후속 작업 지시 — 작게 분할하지 않고 남은 경로를 함께 정비, push까지
> **branch**: `wo/ai-specialized-runtime-accounting`
> **기준 main**: `4ee5a8ecda200a1bddf08d8f00b869e5f4c76806`
> **선행 변경**: 미병합 텍스트 회계 `d11cb4afa19b258409408a5822e342361594ca77`을 새 main 기반 작업공간에 정상 merge. 이전 branch 이력/작업공간은 보존

## 1. 범위와 순서

기존 Core/Extension·모델 선택·업무 권한·transport를 보존하면서 이미지/PDF·화면 판독·웹 grounding·상품 OCR·TTS·Qwen 편집을 한 묶음으로 조사·구현·검증한다. [선행 TODO](TODO-O4O-AI-RUNTIME-ACCOUNTING-COMPLETION-V1.md)의 전문 호출 잔여를 이어받으며 새 원장·Core·Task/Memory·DB schema/migration·dependency를 만들지 않는다.

- [x] B1 활성 host·자료·actor·provider별 과금/응답/실패/fallback 소비처 대조
- [x] B2 기존 가격 catalog와 accounted executor를 전문 호출용으로 확장: 명시 가격·예산, 호출 전 예약, 사용량 미확정/성공 후 기록 장애 처리
- [x] B3 이미지/PDF·일반/강화 화면 계획·이미지 분석·로그인/공개 research 연결
- [x] B4 OCR·TTS·Qwen 연결, 인증 actor 전달, quota/가격 거부를 fallback으로 우회하지 않음
- [x] B5 관리 목록·비용/사용량/정산 상세·문서의 connected/partial/운영 준비 조건 정합
- [x] B6 가격/단위 검증·선차단·빈 성공/사용량 누락·유료 재호출 방지·인증/권한/기존 transport 회귀
- [x] B7 타입/build/lint·문서/소비처 검증 후 commit/push, 통합 담당 인계

## 2. 구조안과 운영 준비 경계

전문 transport는 Core 텍스트 ExecuteRequest를 억지로 흉내 내지 않는다. 기존 서버 `AiAccountedExecution`이 타입 있는 native invocation callback을 받아 같은 `AiQuotaService`의 예약·원장·정산을 사용한다. 업무 해석·도메인 저장은 transport 결과 반환 후 기존 host/service에서 수행한다. 원문·이미지/audio·검색어·credential은 공통 원장에 저장하지 않는다.

가격은 기존 `AI_PRICING_CATALOG`의 model별 명시 native profile로 전달한다. provider wildcard 텍스트 추정 요율을 이미지/검색/OCR/음성 요율로 간주하지 않는다. OCR 단위는 처리 이미지 수, 생성형 호출은 입력/출력 토큰과 필요 시 명시 단위 비용을 사용한다. 이미지 bytes를 토큰으로 바꾸거나 음성 바이너리 크기를 billable audio token으로 추정하지 않는다. 모델 입력 상한·음성 출력 예산·검색 단위는 운영자가 실제 모델/계약을 확인해 준비하는 정책 입력이며 이 작업에서 실제 요율을 새로 설정하지 않는다.

명시 가격/예산이 없으면 provider에 도달하기 전에 `AI_PRICING_NOT_CONFIGURED`로 거부한다. 이 때문에 배포 전 현재 사용 중인 전문 경로의 가격 준비를 반드시 확인해야 한다. 기존 운영 설정을 이번 개발에서 저장하거나 즉시 배포하지 않는다. 가격 준비 없는 상태를 활성화 완료로 보고하지 않는다. 플랫폼 부담 외 외부 계정/매장·사용자 직접 청구는 별도다.

성공 응답에 사용량이 빠지거나 해석할 수 없으면 알려진 요청 수만 기록하고 미확정 예산을 유지한다. 정산 기록 장애는 성공 응답을 유료 재호출하는 이유가 아니다. Qwen/Google Vision의 실제 provider는 enum의 다른 값으로 위장하지 않고 기존 reservation receipt에 기록하며 schema 변경 없이 조회/정산한다. 모델 성공 후 업무 파싱/저장 실패는 transport 실패와 구분한다.

## 3. 실제 소비처 조사

| 경로 | actor·권한/자료 | 연결과 보존할 동작 |
|---|---|---|
| Home 이미지/PDF, Work Planner 일반/강화 Gemini/OpenAI 화면 | 기존 Home/작업 host 인증 userId·Neture scope/tool 검증. 이미지/표본은 현재 요청만 | 기존 native 요청 형상·모델·timeout 유지, SERVICE_QUERY/neture |
| `/api/ai/vision/analyze` | 기존 인증·이미지 크기·관리 모델 선택 | AI_PROXY, 사용자 귀속, 기존 JSON 응답/해석 유지. 잘못된 이미지 값은 유료 호출 전 거부 |
| `runWebResearch` 로그인/공개 hospital 소비처 | 검색 자료는 public 문맥 유지. 로그인 host만 actor 전달 | 기존 web-research Extension·Gemini grounding·검색 근거·timeout 유지, SERVICE_QUERY/neture |
| 상품 이미지 업로드 후 OCR, 기존 일괄 OCR | 업로드 host의 기존 상품/이미지 권한 판정 후 req.user.id. batch는 actor 추정 없음 | TEXT_DETECTION·ADC·기존 OCR 저장, PRODUCT_CONTENT. 빈 OCR도 처리 요청 1건 |
| 관리자 `/automation/tts` | 기존 플랫폼 관리자 guard·text/style/voice/format 검증 | 기존 OpenAI/Gemini 모델·binary·WAV 변환·무캐시 유지, AI_PROXY |
| Qwen 편집 저위험 surface | 기존 provider/surface guardrail·서버 model/key·인증 userId | 기존 Qwen transport, AI_PROXY. provider 실패 시 기존 accounted Gemini fallback, admission 거부는 fallback 금지 |
| 관리자 블록·URL/매장 활용 변환·강의 구조/본문의 기존 AIProxy transport | 기존 인증·관리 모델·입력/출력 상한 유지 | 조사 중 공통 예약 누락을 확인해 이번 묶음에 포함. provider별 기존 기본 출력 상한·backoff 유지, 실제 시도마다 AI_PROXY 예약. 중복 legacy 로그 제거 |
| 카탈로그 가져오기 후 상품 콘텐츠 | 기존 `requireAuth`·neture:admin 검증을 거친 현재 요청 actor만 route→applyJob→import-common→콘텐츠 실행기로 전달 | 생성자/상품 소유자 추정 없이 인증 actor를 전달. 인증 주체 없는 내부 호출은 global/service/scope 한도. 실제 생성 건수만 메타데이터로 보고 |

## 4. 구현 계약과 운영 준비 항목

`ai-native-metering.ts`는 서버 내부 측정·가격 계획 도구이며 새 Core/실행기/원장이 아니다. `executeAccountedNativeAi`는 기존 `AiAccountedExecution.invokeNative`와 quota의 예약/정산을 소비한다. 호출자가 변경할 수 없는 가격 snapshot·서버 확인 actor·service를 사용하고 native 실패/사용량 누락/정산 기록 장애를 구분한다. provider가 실패하면 예산 전부를 미확정으로 유지하고 성공 후 기록 장애는 결과를 반환한다.

기존 `AI_PRICING_CATALOG`의 `rates[]` 항목에 선택적 `native`를 추가한다. `provider`, `model`, `currency`, `inputPerMillion`, `outputPerMillion`은 그대로다. `native` key는 `multimodal`, `grounding`, `ocr`, `tts`, `text`다. 각 profile은 다음 필드를 사용하며 알 수 없는 필드는 저장하지 않고 거부한다.

| 필드 | 의미·검증 |
|---|---|
| `maxInputTokens` | 모델 문맥/현재 허용 payload를 고려해 준비하는 입력 예약 상한. 이미지/PDF bytes에서 추측하지 않음 |
| `maxOutputTokens` | 출력 예약 예산. 기존 transport의 출력 token 상한보다 작으면 거부. 바이너리 음성처럼 upstream에서 강제할 수 없는 예산은 실제 시험/운영 검증이 필요 |
| `unit`, `perUnit` | OCR=`image`, 검색=`request` 또는 `search-query`, 단위 기반 음성=`character`(Unicode code point), 명시 USD 추정 단가. 토큰 요율과 별개인 단위 비용 |
| `maxUnits` | `search-query` 요청의 보수적인 검색 질의 예약 수. 필수이며 공급자의 실제 검색 상한/요금 방식을 확인. API가 강제하지 않는 정책 예산이며 초과는 실제 관측값으로 기록하고 경고 |

OCR은 token 요율/예산 0, 이미지 단가·처리 이미지 수로 계산한다. 생성형 이미지/검색은 양수 token 예산이 필요하다. 기존 Gemini/OpenAI/Claude **텍스트** transport는 종전 token 추정 catalog와 실제 UTF-8 텍스트 예산을 유지한다. Qwen **텍스트**는 provider wildcard가 아닌 명시 모델 token 요율이 필요하다. 전문/native 호출에는 명시 모델 profile이 필요하다. 테스트의 synthetic 요율은 운영 요율로 배포하지 않는다.

Gemini는 후보 토큰만 보지 않고 thinking·전체/도구 입력 메타데이터를 대조한다. 검색 질의별 요금에서는 provider가 반환한 질의 **수**만 원장에 기록하고 질의 문자열은 남기지 않는다. 질의 수/음성 사용량이 없으면 전체 예산을 보류한다. OpenAI 음성 binary 크기를 audio token으로 환산하지 않는다. 이 한도는 정책의 추정 예산이며 외부 제공업체 invoice나 강제 결제 상한이 아니다.

Core `execute`가 retry를 소유해 Gemini 내부 JSON retry와 중첩되지 않게 했다. direct provider 호출의 기존 기본값은 유지한다. `usageKnown?: false`는 누락된 측정을 0으로 확정하지 않기 위한 선택적 메타데이터다. Extension의 가격 오류도 기존 allowlist 코드 그대로 전달한다. 업무 권한/Task/Memory/실행 확인 계약은 바꾸지 않는다.

관리 사용량은 legacy 로그와 native 예약/receipt를 중복 없이 합친다. enum 밖 Qwen/Google Vision과 crash로 receipt가 없는 native 예약도 같은 조회에서 표시한다. 정상 OCR의 0 token과 사용량 불명의 0을 구분한다. 미확정 비용·서비스 전체 통계·실제 청구를 완료로 표시하지 않는다.

**통합·배포 전 필수:** 현재 사용 중인 모델/전문 경로 목록 → 실제 USD 요율·과금 단위·입력/출력/검색 예산 검토 → 기존 catalog 설정의 적용 계획과 rollback → 가격/한도/사용량 누락 회귀 → 승인된 범위의 실제 호출 검증. profile 없는 native 경로는 503으로 차단되므로 이 준비 없이 병합/배포 가능으로 판단하지 않는다. 이번에는 운영 설정을 변경하지 않았다.

## 5. 검증·인계

실제 실행 결과와 소비처 영향은 [검증 CHECK](../checks/CHECK-O4O-AI-SPECIALIZED-RUNTIME-ACCOUNTING-V1.md)에 기록한다. 실계정/실유료 호출·운영 DB·가격/한도/credential 변경·PR/병합/배포는 수행하지 않는다. `DEPLOYMENT = REQUIRED`이나 가격 준비와 통합 검증 전 배포 가능 판정이 아니다. 폐기된 메뉴/서비스나 사용 여부 미확인 legacy HUB를 복구하지 않는다.

## 6. 후속 main 통합 (2026-10-25)

§5까지는 개발 단계의 push 인계 기록이다. 이후 사용자가 main 병합·배포를 지시해 선행 텍스트 정비와 함께 PR #811/main `67654de1fe`에 통합했다. 최신 운영 적용과 실제 PostgreSQL 리뷰 보완·가용성 제한은 [후속 CHECK](../checks/CHECK-O4O-AI-ACCOUNTING-INTEGRATION-20261025.md)에 기록한다. 코드 배포는 §4의 가격 준비·실제 사용 활성화까지 완료했다는 뜻이 아니며, 가격 미설정 호출 선차단은 그대로 유지한다.
