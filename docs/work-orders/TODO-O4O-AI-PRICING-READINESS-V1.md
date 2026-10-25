# AI 전문 가격·예산 운영 준비 점검

> **상태**: COMPLETED · 2026-10-25 (Asia/Seoul)
> **개발 결과**: 로컬 검증 완료·commit/push 인계. 운영 가격/한도·실사용·main/배포는 별도
> **근거**: 사용자 후속 작업 진행 지시
> **기준 main**: `42dddc91b5ee18605c62b9c3e55091137dcd2b7f`
> **branch**: `wo/ai-pricing-readiness`

## 1. 조사와 작업 순서

선행 [통합·배포 CHECK](../checks/CHECK-O4O-AI-ACCOUNTING-INTEGRATION-20261025.md)의 가격 준비 후속이다. 이미 연결된 공통 예약/정산을 다시 만들지 않고, 운영자가 현재 모델별 가격·입출력 예산·quota를 검토할 수 있는 입력과 실행 가능한 점검 도구를 한 묶음으로 준비한다.

- [x] P1 실제 native/legacy host의 provider·모델 해석·입출력 상한·단위·scope와 관리 조회/배포 경로 대조
- [x] P2 기존 native 계획기에 명시 catalog 입력을 연결하고 quota 판정을 순수 함수로 재사용. 환경 변수 교체·예약 생성 없이 같은 계산/한도 규칙 검사
- [x] P3 비밀 없는 실행 사례 manifest·가격 catalog·선택적 quota snapshot을 받는 오프라인 CLI. 누락/오류·요청 예산·보류 포함 quota·추정 단가 표시
- [x] P4 기존 요율을 보존하는 검토용 draft 생성과 설정/반환 사용량/보류 정산/장애/복구 운영 절차 작성. 실제 단가를 임의로 채우지 않음
- [x] P5 가격·단위·상한·누락/과대 예산·경계 quota·불완전 snapshot·오류 원문 비노출·CLI 실행/무호출 회귀
- [x] P6 타입·빌드·소비처·문서 검증 후 commit/push. 운영 가격/한도/credential·workflow·운영 DB 변경·유료 호출은 별도

## 2. 조사에서 확인한 경계

- 공통 계산은 기존 `ai-pricing.ts`·`prepareNativePlan`이며 실제 원장은 `AiQuotaService`다. 다른 계산식/기본 요율/원장을 추가하지 않는다.
- native 계획기는 현재 process env의 catalog만 읽는다. 점검을 위해 전역 env를 바꾸지 않도록 명시 catalog를 선택적으로 받게 한다. 기존 호출 기본 동작은 유지한다.
- quota의 현재 DB 판정은 사용량과 보류 예약을 합친 뒤 요청 예산을 더한다. 비용 경계의 JS 부동소수점 오판을 실제 PG에서 재현해 원장과 같은 8자리 정수 비교로 보완한다. 순수 판정을 재사용하며 오프라인 도구가 DB를 초기화·예약·정산하지 않는다.
- 관리자 `connected`는 소스 연결이며 가격/credential/실제 호출 성공을 의미하지 않는다. 기존 관리 조회의 stored/code/runtime 모델도 실제 실행 대상 전체를 확정한 snapshot이 아니므로 이를 자동 운영 준비 완료로 승격하지 않는다.
- 운영 `AI_PRICING_CATALOG` 전달/실제 요율·예산과 실계정은 아직 확인되지 않았다. 현 클라우드의 GCP identity/개발 계정 준비도도 확인되지 않았다. 실제 요율이나 운영 적용 완료를 추측하지 않는다.
- 새 route·권한·API 응답 shape·관리 UI·Core/Extension·schema/migration·dependency·배포 workflow는 변경하지 않는다. source 조사 중 OCR 설명의 비용 미연결 표기는 현 코드와 맞추는 범위만 수정한다.

## 3. 소비처 및 운영 입력

| 실행 사례 | 현재 transport·예산/단위 | 운영자가 확정할 입력 |
|---|---|---|
| Home inline | Gemini 이미지/PDF·출력 2,048·SERVICE_QUERY/neture | 현재 해석된 모델·multimodal 입력 예산·모델별 요율 |
| 일반/강화 화면 계획 | Gemini/OpenAI·출력 800·SERVICE_QUERY/neture | 일반/강화 각각 현재 모델·이미지 포함 입력 예산 |
| 이미지 분석 | Gemini·출력 1,000·AI_PROXY | 현재 모델·입력 예산·요율 |
| 공개/인증 검색 | Gemini grounding·출력 2,048·SERVICE_QUERY/neture | 현재 모델·요율·검색 요청/질의 단위·질의 상한 |
| 상품 OCR | google-vision/TEXT_DETECTION·이미지 1·PRODUCT_CONTENT | 이미지 단가. 빈 문자 응답도 처리 1건 |
| 관리자 TTS | OpenAI/Gemini·AI_PROXY·문자 수 metadata | 실제 모델·토큰/문자 과금 정책·음성 출력 예산. binary bytes로 토큰 환산 금지 |
| Qwen 편집 | Qwen 텍스트·기존 요청 출력 예산·AI_PROXY | 현재 모델의 명시 요율. provider 실패 시 Gemini 대체도 별도 사례로 검사 |
| 기존 AIProxy | Gemini/OpenAI/Claude 텍스트·기존 호출별 상한·AI_PROXY | 운영 catalog 교체 시 기존 텍스트 fallback/추정 요율 행 보존 |

사례 manifest는 검토자가 확정한 실행 입력 표본이며 새로운 모델 선택 registry가 아니다. provider/model·native 요청 수치만 담고 prompt·이미지·음성·원문·API key·실제 사용자 식별자는 담지 않는다. 표본 검사 성공은 모든 host나 live 운영 설정·실계정 quota의 검증 완료가 아니다. 모델 선택/요율/상한 변경 뒤 다시 검사한다.

quota snapshot은 조회 시각과 현재 사용량·보류량이 있는 선택 입력이다. global/service/scope의 해당 사례에 적용될 행만 검사하며 user 규칙은 식별자 없이 미검증으로 표시한다. snapshot/credential/DB·provider 연결을 확인하지 않은 부분은 점검 결과에 명시한다. 실제 실행의 원자 예약 판정을 대신하지 않는다.

## 4. 인계 범위

가격 draft의 미확정 요율/예산은 null 등 유효하지 않은 상태로 남겨 승인된 catalog로 오인하지 않게 한다. synthetic 테스트 가격을 운영 기본값으로 배포하지 않는다. 현재 native 거부·보류/reconcile·실행 권한은 유지한다. 외부 신규 계약/결제·운영 설정·유료 시험과 통합/배포는 이 개발 단위와 분리한다.

검증 결과와 공통 소비처 영향은 [CHECK](../checks/CHECK-O4O-AI-PRICING-READINESS-V1.md)에 기록한다. 실행 명령·입력·적용/복구 조건은 [운영 준비 guide](../guides/O4O-AI-PRICING-READINESS-RUNBOOK-V1.md)를 따른다. 원래 운영 배포 기록은 변경하지 않는다. Sonar 중복률 전체 정비는 이번 가격/예산 도구의 범위에 추가하지 않는다.
