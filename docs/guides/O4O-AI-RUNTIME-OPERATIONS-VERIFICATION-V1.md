# AI 운영 적용·실사용 검증 인계

> **상태**: ACTIVE · **작성일**: 2026-10-25
> **적용 범위**: [운영 준비 TODO](../work-orders/TODO-O4O-AI-RUNTIME-OPERATIONS-READINESS-V1.md)의 코드·검증 인계. 이 branch는 main 통합 전이며 실제 적용/실사용 완료를 뜻하지 않는다
> **기존 기준**: [가격 표본·draft·quota 검사](O4O-AI-PRICING-READINESS-RUNBOOK-V1.md) · [AI 구조](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md) · [배포 정책](../../README.md#배포)

## 1. 통합 전에 확정할 입력

기존 관리자 모델 선택과 실제 host가 해석하는 모델을 대조한다. `stored/code/runtime` 목록을 실제 요청 모델로 단정하지 않는다. 가격 예제 16개는 후보이며 현재 사용 모델을 자동 발견한 목록이 아니다. 사용 중인 경로·일반/강화·retry/fallback·provider별 음성을 구분하고 사용하지 않는 후보는 근거를 남긴다.

| 입력 | 필요한 내용 |
|---|---|
| 실제 모델 | 서비스/기능·provider/model·지원 capability·관리자 지정/host fallback·출력 상한 |
| 가격 catalog | 기존 version/rates/native 계약. 실제 가격 출처·확인일·통화·단위와 입출력/검색 예약 상한 |
| 한도 | global/service/scope/user의 현재 일/월 한도·경고값·확정 사용량·보류량. 변경 필요성과 대상 범위 |
| 검증 계정 | 현행 로컬 계정 SSOT와 역할/선택 매장·자기 공급자·모임 관계. 운영자 계정으로 대체하지 않음 |
| 복구 정보 | 원래 model selection revision·catalog version/fingerprint·한도·서빙 revision과 승인된 복구 경로 |

가격 출처/검토 기록은 catalog 외부에 둔다. catalog 객체에는 runtime parser가 지원하는 필드만 넣는다. draft wrapper·API key·임의 메모를 전달하지 않는다. 미확정 null은 거부하며 테스트 synthetic 요율을 운영 단가로 복사하지 않는다. 추정 비용·quota는 provider invoice나 upstream 강제 결제 상한이 아니다.

## 2. 준비한 설정의 전달

이 branch의 `deploy-api.yml`은 기존 optional env를 이용해 `AI_PRICING_CATALOG`를 다음처럼 준비한다. 이 문서는 repository/environment variable을 변경하거나 배포를 실행한 기록이 아니다.

| 관측 | 동작 |
|---|---|
| operator 제공 값 있음 | 해당 catalog를 후보로 선택하고 기존 runtime parser/통화 계약으로 검증 |
| 제공 없음·현재 plain 값 있음 | 현재 값 carry 후 검증. 빈 값으로 덮지 않음 |
| 제공 없음·현재 값도 없음 | flag 생략. 기존 텍스트 추정값/native 미설정 선차단 유지 |
| 현재 서비스 조회 실패 | 현재 설정을 보존할 수 없어 배포 중단 |
| 현재 catalog가 secret reference | 값을 추측하거나 plain 값으로 전환하지 않고 중단. 해당 연결 방식의 별도 적용 계획 필요 |
| 잘못된 JSON/요율·null/미지원 통화·다른 flag/관련 없는 필드 | 검증 실패. 배포용 flag를 만들지 않음 |

새 가격 검증은 image push·migration·traffic 변경 전에 있다. migrate-only·freeze·CI·WIF·verified rollout/rollback gate는 유지한다. workflow 변경은 통합 담당의 검토와 현재 위험 판정/통제 배포 절차를 따른다. plain catalog에 자격정보를 넣지 않으며 repository variable을 비우는 것으로 현재 catalog를 삭제하지 않는다.

검증 entry는 기존 `cloud-run-env.mjs`가 만든 NUL flag 파일을 읽는다. input/output은 서로 다른 개인 파일을 사용한다. gcloud의 쉼표/구분자와 여러 줄 값을 처리하며 출력은 새 파일만 권한 0600으로 생성한다. 원본/기존 결과를 덮어쓰지 않는다.

```bash
node --import tsx apps/api-server/src/scripts/ai-pricing-environment.ts --help
node --import tsx apps/api-server/src/scripts/ai-pricing-environment.ts --input /개인/경로/ai-pricing-candidate --out /개인/경로/ai-pricing-validated
```

직접 Node entry의 exit 0은 validated/omitted이고 exit 2는 입력·출력 실패다. 출력은 요율 원문 대신 안전한 version/fingerprint/count와 `applied:false`만 표시한다. 이 명령은 gcloud·provider·DB·credential을 호출하거나 운영 설정을 적용하지 않는다. 파일 형식을 손으로 조립하거나 검증 실패 exit를 무시하지 않는다. Windows의 권한/운영 검증은 이번에 수행하지 않았다.

## 3. 서버 관측과 사전 점검 연결

통합 후 기존 인증된 관리자 `GET /api/ai/admin/management`의 `data.pricing`을 확인한다. 새 route나 일반 사용자 접근을 만들지 않았다. 기존 no-store 응답이며 요율·credential 원문을 반환하지 않는다.

| pricing.state | 의미 |
|---|---|
| `loaded` | 이 process가 명시 catalog를 파싱했다. 모델/credential·provider 성공의 증거가 아님 |
| `legacy-estimates` | 명시 값 없음. 기존 provider-wide 텍스트 추정값을 사용하며 native 준비 완료가 아님 |
| `invalid` | 명시 설정 파싱 실패. 버전/hash/count를 추측하지 않고 null로 표시 |

`modelRateCount`는 wildcard를 포함한 catalog 행 수이며 실제 이용 모델 수가 아니다. `nativeProfileCount`도 등록 profile 수다. `currencies`는 읽은 통화이며 실제 선택 rate의 지원과 준비는 기존 사전 점검에서 확인한다. 기존 저장 모델/정책 조회 실패와 process 가격 관측은 별개다.

응답 전체 또는 `{observedAt, pricing}`만 개인 JSON으로 보관한다. 인증 token·사용자 자료를 파일에 넣지 않는다. 관측 시각은 원래 서버 값을 유지하고 낡은 파일의 시각을 새로 붙이지 않는다. 이전 서버에 pricing metadata가 없으면 미확인 입력으로 거부하며 legacy 성공으로 대체하지 않는다.

```bash
node --import tsx apps/api-server/src/scripts/ai-pricing-readiness.ts --manifest /개인/경로/cases.json --catalog /개인/경로/catalog.json --runtime-snapshot /개인/경로/management.json
```

기존 `--quota-snapshot`도 함께 사용할 수 있다. `runtimePricing.state=match`는 **제공한 관측 시점의 version/fingerprint가 검토 catalog와 같다**는 뜻이다. mismatch/unavailable은 exit 1, 잘못된 입력은 exit 2다. 다른 instance·새 시각의 상태나 실제 모델·credential·사용자 quota·provider/결제·배포 성공을 자동 확인하지 않는다. 기존 `unverified`와 관측 시각을 함께 읽는다. draft와 runtime/quota snapshot은 함께 사용하지 않는다.

## 4. 실제 사용 검증 순서

먼저 격리 검증을 통과하고 통합/현재 gate를 확인한 뒤 허용된 계정과 호출 예산으로 실제 사용을 검증한다. 기존 관리 목록·source preflight PASS만으로 유료 시험 호출을 자동 실행하지 않는다. 실제 계정·예산·권한/데이터 정리 준비가 확인되기 전에는 합성/격리 결과와 실사용 미확인을 구분한다.

| 검증 묶음 | 실제로 확인할 결과 |
|---|---|
| 모델/가격 | 기존 화면에서 요청한 기능의 실제 provider/model·reservation 가격 version·현재 관측 fingerprint가 검토 입력과 맞음. 지정 변경은 다음 요청에서 반영 |
| 매장·공급자·모임 | 자기 대상의 허용 지표만 전달. 타 대상/역할 회수·전환 시 거부 또는 늦은 출력 폐기. AI 실패에도 기존 업무 이용 가능 |
| 상품·콘텐츠 초안 | 출처/버전·원문/초안·미리보기 유지, 사용자의 기존 검토/저장 절차. 공식 상품 자동 수정·자동 게시가 없음 |
| 대표 native 호출 | 이미지/PDF·검색·OCR·음성 중 실제 필요한 경로의 명시 단위/입출력 상한, receipt·사용량·가격이 일치 |
| 한도/오류 | provider 이전 예약과 거부, 인증/가격/DB 장애 시 다른 유료 경로로 임의 전환하지 않음 |
| 후처리 | 생성 성공 후 저장/receipt 실패가 유료 재호출을 만들지 않음. 보류와 최종 비용을 구분 |

부정 사례는 합성/격리 검증을 우선한다. 거부를 재현하려고 운영 전체 한도·가격·credential을 임의로 바꾸거나 실제 장애를 만들지 않는다. scoped 검증이 필요하면 원래 값·대상 사용자/서비스와 복구 방법을 명시한다.

이번 코드의 PostgreSQL 검증은 실제 모델 제어·policy·quota transaction·TypeORM 로그·관리 집계와 기존 host 권한 callback을 연결하며 **유료 transport만 합성**이다. 실제 로그인·사업/매장 관계·화면 사용·provider 인증과 응답 품질의 증거는 아니다.

실제 저장 검증은 테스트용 업무 데이터와 연결 데이터의 완전 삭제 방법이 있는 경우만 수행한다. 방법이 없으면 저장 단계는 격리 환경에서 검증한다. 로그인·접속·보안·감사·AI 메타 이력은 [보존 정책](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md)을 따르며 업무 fixture 정리를 이유로 조기 삭제하지 않는다.

## 5. 보류·증거 정산과 복구

사용량 미반환·provider/통신 실패·receipt rollback은 무료 사용 증거가 아니다. 기존 reservation을 유지하고 요청을 다시 생성하지 않는다. reservation/실제 provider·model·가격·기간과 공급자의 검증 가능한 사용량/무과금 증거를 대조한 뒤 기존 host-only `AiQuotaService.reconcile`을 사용한다. 동일 evidence ID/usage의 재처리는 멱등이며 다른 내용의 재사용은 거부한다. 신규 공개 정산 도구·TTL 자동 해제·원장 재작성은 추가하지 않았다.

비용 증거로 settled 된 native 기록은 비용 미산정에서 제외한다. 입력/출력 token 상세를 알 수 없으면 미계측 표시는 유지한다. 한도가 해제됐다고 token 수·provider 응답·청구 완료를 추측하지 않는다. 비용이 null이거나 settled/evidence가 없는 기록은 계속 미산정이다.

검증 실패 시 기존 승인된 revision/catalog/선택/한도 복구 절차를 사용하고 원장·보류는 보존한다. 임시 무료 요율·quota 비활성화로 우회하지 않는다. 복구 완료·업무 fixture 정리·회계 증거를 각각 확인한다. 공개 CHECK에는 원문·실제 계정/매장·credential·운영 응답을 남기지 않는다.
