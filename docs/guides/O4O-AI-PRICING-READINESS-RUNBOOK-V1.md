# 전문 AI 가격·예산 설정 점검 절차

> **상태**: ACTIVE · **작성·갱신**: 2026-10-25 (Asia/Seoul)
> **범위**: [가격 준비 TODO](../work-orders/TODO-O4O-AI-PRICING-READINESS-V1.md)의 오프라인 운영 준비 도구
> **기존 운영 증거**: [통합·배포 CHECK](../checks/CHECK-O4O-AI-ACCOUNTING-INTEGRATION-20261025.md)
> **가격 도구·비용 비교 후속 통합**: [main·배포 CHECK](../checks/CHECK-O4O-AI-PRICING-INTEGRATION-20261025.md). 코드 통합·배포와 실제 요율/운영 설정 적용은 별개다.

## 1. 무엇을 확인하는가

기존 `AI_PRICING_CATALOG`와 실제 실행의 `prepareNativePlan`·quota 판정을 재사용한다. 새 가격 엔진·원장·모델 선택 registry가 아니다. 도구는 파일과 지정된 process의 가격 변수만 읽는다. `.env`·운영 DB·provider·credential·배포에 연결하거나 설정을 저장하지 않는다.

출력의 `passed`는 **제공한 실행 표본과 설정/snapshot**의 계산이 통과했다는 뜻이다. 현재 서버의 모델 선택·credential·실제 호출/요금·현재 사용량/보류·사용자 quota·실제 배포를 확인한 결과가 아니다. 해당 항목은 `unverified`에 남긴다. `connected`인 관리 목록도 가격 준비/실사용 성공을 뜻하지 않는다.

가격은 USD 추정 정책이다. provider invoice나 upstream 강제 결제 상한이 아니다. 실제 부담 주체·유료 계약·외부 계정 연결을 이 도구가 선택하지 않는다.

## 2. 실제 실행 표본 작성

저장소 Node/pnpm·설치는 [SETUP](../../SETUP.md)을 따른다. 예제를 개인 로컬 파일로 복사하고, 실제로 선택한 경로의 provider/model·요청 상한을 확인한다.

아래 파일 복사/권한 명령은 Bash 기준이다. Windows에서는 사용자 임시 경로와 `Copy-Item`을 사용하며 Node entry·옵션은 같다. 실제 Windows 검증을 완료한 기록은 아니다.

```bash
umask 077
cp apps/api-server/src/scripts/data/check-data/ai-pricing-cases.example.json /tmp/o4o-ai-cases.json
```

[예제](../../apps/api-server/src/scripts/data/check-data/ai-pricing-cases.example.json)는 16개 검토 후보이며 현재 운영 모델 목록이 아니다. 모델과 텍스트 bytes의 `null`은 **반드시 확인해야 하는 미확정 값**이다. 그대로 검사하면 exit 2이며 draft도 만들지 않는다. 미사용 후보는 검토 근거를 따로 남기고 제외한다. 실제 사용 경로를 누락해도 CLI가 자동 발견한 것으로 표시하지 않는다.

모델은 기존 관리자 선택과 server resolver가 최종 해석한 값을 대조한다. 관리자 snapshot의 `stored/code/runtime` 표기를 최종 실행 모델로 단정하지 않는다. 일반·강화·provider별 화면 계획, 공개/인증 검색, TTS provider별 선택, Qwen 실패 후 canonical Gemini 대체를 각각 확인한다. 모델을 바꾸면 다시 검사한다.

| 항목 | 확인할 source | 예제 수치의 범위 |
|---|---|---|
| Home inline | `services/ai-tools/multimodal-chat.ts` | 기존 Gemini 이미지/PDF·출력 2,048 |
| 일반/강화 화면 | `services/ai-tools/work-planner.ts` | Gemini/OpenAI·출력 800. 일반/강화 모델은 별도 |
| 이미지 분석 | `routes/ai-proxy.routes.ts` | 기존 출력 1,000 |
| 공개/인증 검색 | `services/ai/web-research.service.ts` | 기존 출력 2,048·request descriptor 1. 실제 과금은 profile에서 request/search-query 선택 |
| OCR | `modules/store-ai/services/product-ocr.service.ts` | TEXT_DETECTION 이미지 1. 빈 문자 응답도 이미지 1 |
| TTS | `modules/automation/services/tts-narration.service.ts` | 최대 text 2,000+style 500+구분 newline 2 = 문자 metadata 상한 2,502. vendor 문자 과금이라고 가정한 값은 아님 |
| Qwen·기존 proxy | `services/ai-proxy.service.ts` | 출력 미지정 시 Qwen 4,096·Gemini 대체 32,000·OpenAI/Claude 8,192. 실제 요청/관리 선택이 지정한 maxTokens가 있으면 그 값을 사용 |

`textBytes`는 원문이 아닌 최종 system/user 텍스트의 UTF-8 byte 수다. 실제 요청/대표 최대 표본을 사용하며 이미지·PDF·음성 bytes를 토큰으로 환산하지 않는다. native 입력 예약은 profile의 `maxInputTokens`를 사용한다. 입력 원문·파일·음성·API key·실제 사용자 식별자는 manifest에 넣지 않는다. scope/service도 host의 실제 비용 귀속과 맞춘다.

예산은 **1회 호출**의 예약이다. Proxy retry·Qwen→Gemini 대체·여러 이미지 OCR·상품 생성 후속 같은 업무의 총비용 상한은 아니다. 실제 실행은 각 시도마다 다시 예약해 누적 quota를 적용한다. 표본 검사로 업무 전체의 외부 결제 상한을 보증하지 않는다.

## 3. 검토용 가격 draft 만들기

```bash
node --import tsx apps/api-server/src/scripts/ai-pricing-readiness.ts --help
node --import tsx apps/api-server/src/scripts/ai-pricing-readiness.ts --manifest /tmp/o4o-ai-cases.json --draft > /tmp/o4o-ai-price-review.json
```

기존 catalog가 있다면 `--catalog /개인/경로/catalog.json`을 함께 전달한다. 파일을 지정하지 않으면 **현재 process의** `AI_PRICING_CATALOG`를 읽고, 미설정이면 기존 Gemini/OpenAI/Claude 텍스트 추정 catalog만 사용한다. 운영 서버 설정을 자동 조회한 값이 아니다.

draft는 `approved:false`이며 `catalog`에 검토용 내용이 들어 있다. 기존 rate/profile은 수정하지 않고 보존한다. 없는 모델에 텍스트 wildcard 추정치를 native 가격으로 복사하지 않는다. 같은 신규 모델/kind를 여러 표본이 사용하면 필요한 최대 출력 예산을 합친다. 이미 지정된 기존 profile 상한은 자동으로 늘리지 않으므로 이후 검사에서 모자란 상한을 확인한다.

미확정 요율·native 입력/음성 출력 예산은 null로 둔다. OCR token 가격/예산 0은 이미지 단위 계약이며 이미지 단가 자체는 null이다. TTS 단위도 null로 남겨 토큰 또는 문자 과금 여부를 먼저 확인하게 한다. 단위 과금을 쓰지 않으면 profile의 unit/perUnit을 제거한다. 문자 과금이어도 입출력 token 예산은 별도로 정한다. 예산을 0으로 설정하면 token quota 예약도 없으므로 실제 token 사용량을 반환하는 모델의 측정/예산 범위를 검토한다. usage가 없는 모델의 양수 token 예산은 증거 정산 전까지 보류될 수 있다. OpenAI binary 응답을 audio token 수로 추측하지 않는다.

운영 검토에는 다음을 별도로 기록한다.

- 실제 선택 모델·계약/지역/가격 출처 URL·확인일, 통화·입력/출력 token 또는 단위 요율
- native 문맥·입출력 예약 상한과 실제 provider가 허용하는 범위. 출력 예산이 실제 최대 token보다 작으면 검사 거부
- 검색의 request/search-query 과금 정책. search-query이면 실제 질의 상한 검토 후 `maxUnits` 설정
- 음성 usage 미반환 시 예약 보류와 증거 기반 정산 방법. 가격만 넣었다고 측정이 생기지 않음
- 기존 텍스트·fallback rate 보존과 정책 version 변경. 테스트용 synthetic 가격을 복사하지 않음

같은 provider/model의 token rate는 여러 kind가 공유할 수 있다. TTS 단위 정책을 위해 token rate를 0으로 바꿀 때 같은 모델의 텍스트 등 다른 사례가 의도치 않게 0원으로 평가되지 않는지도 확인한다. 보고서는 예약 추정 비용이 0이면 `ZERO_ESTIMATED_COST`를 표시하며 실제 upstream 무료 사용의 확인으로 간주하지 않는다.

확정한 **catalog 객체만** 별도 private JSON으로 저장한다. draft의 wrapper 전체나 미확정 null을 `AI_PRICING_CATALOG`로 넣지 않는다. 운영 단가는 이 저장소 예제에 포함하지 않는다.

## 4. 가격·요청 예산 검사

```bash
node --import tsx apps/api-server/src/scripts/ai-pricing-readiness.ts --manifest /tmp/o4o-ai-cases.json --catalog /tmp/o4o-ai-catalog.json > /tmp/o4o-ai-price-check.json
```

JSON은 사례별 provider/model/kind·scope/service·가격 version/match·예약 요청/토큰/비용을 보여 준다. 가격 누락·지원하지 않는 통화·단위/상한 오류를 `blocked`로 분리한다. 오류에는 원문·파일 내용·외부 응답·key를 싣지 않는다. 입력 파일은 덮어쓰지 않는다.

`catalogFingerprint`는 검증한 정규화 catalog 내용의 SHA-256이다. 적용할 catalog와 검증 보고서의 version/fingerprint를 함께 인계한다. 같은 version에 다른 요율을 넣어도 fingerprint가 달라진다. 이는 운영 적용 확인이나 결제 증거가 아니다.

| exit | 의미 |
|---|---|
| 0 | 제공한 검사 통과 또는 draft 출력. 실제 사용 활성화 승인/확인을 뜻하지 않음 |
| 1 | 한 개 이상 가격/예산/quota 사례 차단. provider 호출 없음 |
| 2 | 파일/JSON/manifest/catalog/snapshot 입력 오류. 내용/stack을 노출하지 않음 |

자동 점검에 연결할 때 exit 1/2를 무시하지 않는다. 모델 선택·상한·catalog 변경 후 재실행한다. 사전 검사를 통과했어도 실제 요청은 기존 원자 quota 예약과 업무 권한 확인을 거친다.

## 5. quota snapshot 추가 검사

기존 인증된 관리자 `GET /api/ai/admin/quotas/status`의 `data` 행을 private 파일로 내보낸다. 도구에 인증 token이나 DB 접속정보를 주지 않는다. **실제 조회 시각**의 UTC ISO timestamp와 아래 wrapper를 사용한다. 낡은 파일에 현재 시각을 새로 붙이지 않는다.

```json
{
  "observedAt": "실제-조회-시각-UTC-ISO",
  "rows": []
}
```

```bash
node --import tsx apps/api-server/src/scripts/ai-pricing-readiness.ts --manifest /tmp/o4o-ai-cases.json --catalog /tmp/o4o-ai-catalog.json --quota-snapshot /tmp/o4o-ai-quota.json > /tmp/o4o-ai-budget-check.json
```

행에는 layer/layerKey·limitType·period·currentValue·**reservedValue**·limitValue·warningThreshold·isEnabled가 필요하다. 보류량이 빠졌다고 0으로 가정하지 않는다. currentValue는 확정 사용량, reservedValue는 아직 보류된 용량이다. 기존 원장의 UTC 일/월 기간 값이며 기간 경계를 넘기면 다시 조회한다.

해당 사례의 global/service/scope 규칙과 현재+보류+새 예약을 실제 실행과 같은 함수로 비교한다. 비용 비교는 원장의 소수 8자리 단위로 처리한다. 정상 호출은 정확히 한도와 같은 경우 허용하고, 요청 예산 0인 현황 판정은 한도 도달을 초과 상태로 표시하는 기존 의미를 유지한다.

user 규칙은 식별자를 결과에 복사하지 않고 `ignoredUserRules` 건수와 `USER_QUOTA` 미검증으로 남긴다. 실제 사용자 quota는 원래 host의 검증된 actor와 실시간 예약에서 확인한다. 다른 서비스/scope 규칙으로 잘못 차단하지 않으며, 비용 규칙이 없으면 `NO_MATCHING_COST_LIMIT`를 표시한다. 그 경우 비용 한도가 있다고 판단하지 않는다. snapshot 미제공 시 `QUOTA_CONFIGURATION`도 미검증이다.

동시에 다른 요청이 실행될 수 있으므로 snapshot 통과는 실제 남은 용량 예약이 아니다. 이 도구는 예약을 생성하거나 보류를 해제하지 않는다.

## 6. 실제 운영 적용·장애·복구 인계

운영 설정/한도 변경과 유료 검증은 이번 개발 CLI와 별도다. 현재 배포 정의는 catalog 전달을 확인해야 하므로 검증된 JSON을 만들었다고 바로 활성화 완료로 표시하지 않는다. 인계 자료에는 catalog version/fingerprint·실제 선택 모델/사례·점검 결과·가격 출처·원래 설정/서빙 revision·적용/복구 계획을 포함한다.

적용 담당은 기존 배포 정책과 권한으로 정확한 catalog 전달·실제 process 관측·현재 quota DB 준비를 확인하고, 허용된 계정/업무 범위의 실제 호출에서 receipt/사용량·한도 거부·보류 처리를 검증한다. credential을 공개 파일이나 보고서로 전달하지 않는다. workflow/운영 모델/가격/한도 변경과 외부 계약을 코드 정비와 혼동하지 않는다.

| 상태 | 처리 |
|---|---|
| 키 미연결 | provider를 호출하거나 다른 유료 계정으로 임의 전환하지 않음. 기존 연결 설정 확인 |
| 가격/profile 누락·오류 | provider 이전 차단. 준비한 catalog와 실제 적용 version/fingerprint 대조 |
| quota 초과/DB 장애 | 기존 429/503·원자 예약 거부 유지. preflight 성공이나 cached snapshot으로 우회하지 않음 |
| provider/응답 실패 | 이미 과금됐을 수 있으므로 예약 보류. 기존 허용 retry/fallback도 각각 예약 |
| 생성 성공 후 저장/receipt 장애 | 성공 결과를 유료 재요청하지 않음. 보류/reconciliation 확인 |
| usage 미반환·음성 binary만 반환 | 0원으로 확정하거나 bytes로 token 추측하지 않음. 기존 보류 유지 |

보류 정산은 reservation/실제 provider·model·기간·확인된 사용량/무과금 증거를 대조한 뒤 기존 host-only `AiQuotaService.reconcile` 경로로 처리한다. 증거 ID로 중복 처리를 막는다. CLI가 DB를 수정하거나 원장을 재작성하지 않으며 TTL만으로 해제하지 않는다. 운영 증거/원문·사용자 정보를 public CHECK에 복사하지 않는다.

복구 시에는 승인된 기존 배포/설정 복구 경로로 이전 catalog·revision을 회복하고 원장/보류를 보존한다. 가격 오류를 quota 비활성화·임시 무료 가격·새 원장으로 우회하지 않는다.

## 7. 운영 전달·관측 후속 개발

`wo/ai-runtime-operations-readiness`는 기존 optional env로 현재 catalog를 보존·검증하는 배포 source, 기존 관리자 GET의 안전한 process 가격 관측, 이 CLI의 선택적 `--runtime-snapshot` 비교를 준비했다. [운영 적용·실사용 검증 인계](O4O-AI-RUNTIME-OPERATIONS-VERIFICATION-V1.md)의 순서·한계를 따른다. 개발 단계의 [CHECK](../checks/CHECK-O4O-AI-RUNTIME-OPERATIONS-READINESS-V1.md)는 당시 push 인계 증거이며, 이후 PR #824/main 통합·배포 결과는 [2026-10-26 CHECK](../checks/CHECK-O4O-AI-RUNTIME-OPERATIONS-INTEGRATION-20261026.md)를 따른다. 실제 가격/한도·계정 설정·유료 검증은 별도다. metadata 일치를 현재 모델·provider 사용 성공이나 실시간 예약 증거로 확대하지 않는다.
