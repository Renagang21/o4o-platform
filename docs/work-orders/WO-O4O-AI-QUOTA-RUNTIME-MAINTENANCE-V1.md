# O4O AI 비용·quota와 실행 루프 후속 정비

> 상태: COMPLETED · 작성일: 2026-10-13 · 근거: 사용자 후속 정비·push까지 지시

## 기준과 범위

최신 main `9400a625e4`에서 전용 `wo/ai-quota-runtime-maintenance` worktree를 생성하고 앞 미병합 branch `104df67713`을 연결했다. 기존 AI Core+Extension·정책·사용량 집계·Assistant/Task·Execution Node를 재사용한다.
[앞 TODO](WO-O4O-AI-CODE-MAINTENANCE-V1.md), [공통 구조](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md), [공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [자동화 원칙](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md), [Assistant V2 §18](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md), [migration 정본](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md)을 기준으로 조사한다.
운영 DB write·migration 적용·유료 호출·계약/결제·운영 credential/설정·main 병합·배포는 하지 않는다. 새 migration은 검토용 코드이며 운영 적용 승인과 구분한다.

## 조사와 TODO

- [x] 기존 quota/aggregate/usage/billing와 정책 실행기, 실행 루프·직접 import·raw-source 검증 소비처 조사.
- [x] 업체별 고정 단가 중복을 모델·통화·가격 버전 계약으로 정비. 기존 추정 단가와 설정 provenance를 구분하고 서로 다른 통화를 기존 집계에 합산하지 않음.
- [x] 기존 집계와 분리된 durable quota 예약으로 동시 admission→정산/해제를 원자화. DB 장애는 무제한 허용 대신 호출 전 거부.
- [x] provider 성공 뒤 기록 실패를 관측·재조정 가능한 상태로 남기고 이미 성공한 호출을 fallback으로 중복 실행하지 않음.
- [x] user quota의 검증된 actor 전달과 fallback 비용·사용량·UTC 기간 귀속을 확인.
- [x] 실행 루프를 계획/제안 처리·읽기/행동·재생 단계로 분리. 기존 예산·안전·복구·재개·owner·Task 경계를 유지.
- [x] 동시 요청·다중 기간/레이어·재시도/실패·가격 교체·이력 장애·실행/재개 회귀와 build/type/lint/migration/docs 검증.
- [x] 검증 결과·운영 적용 전제·한계 기록, 이번 경로만 commit·branch push.

## 설계

기존 `ai_usage_aggregate`는 완료 사용량 정본으로 유지하고 예약량을 섞지 않는다. 예약 상태에는 원문·key가 아닌 scope/actor/서비스·기간·예산·가격 snapshot·구조화 결과만 저장한다. 짧은 DB transaction의 공통 lock으로 레이어를 함께 판정한다. provider 대기 중 transaction을 유지하지 않는다.
예약 원장 미준비/DB 장애는 호출 전 중지한다. process crash·성공 후 기록 실패의 미해결 예약을 시간만으로 자동 해제하지 않는다. 비용 집계는 추정이며 invoice/결제와 동일시하지 않는다.
실행 루프 분리는 성능·polling·vision·프로토콜 변경이 아닌 기존 단계 책임 분리다. Assistant V2 A→I 순서를 변경하지 않는다.

## 구현과 소비처

| 책임 | 구현/연결 | 유지하는 계약 |
| --- | --- | --- |
| 공통 provider admission/accounting adapter | `ai-accounted-execution.ts` | Core execute/retry 재사용. 결과 생성과 기록을 분리하고 기록 실패로 유료 fallback을 실행하지 않음 |
| 가격 정책 | `ai-pricing.ts`, AIUsageLog.estimateCost | 모델 exact→명시 provider estimate, 같은 요청의 가격 version 고정. 단가 중복 제거 |
| 예약/정산 | AiQuotaService, `ai_usage_reservations` | 기존 aggregate 완료 사용량 유지. global/service/scope/user × daily/monthly를 한 transaction에서 판정 |
| 전체 8개 서비스 질의/요약/초안 | SERVICE_QUERY + 실제 catalogue serviceId + 인증 actor | 새 신원/서비스 카탈로그 없음. 제출 자료만, 원래 권한 guard 유지 |
| 전체 8개 운영 요약 | OPERATOR_INSIGHT + 실제 serviceId + actor | 기존 provider/model 선택·rule-based 장애 대체 유지 |
| LMS / Neture 운영 추천 | LMS_ASSISTANCE / OPERATOR_ACTIONS | 기존 업무 Extension과 응답 정규화·캐시·권한·무과금 rule fallback 유지 |
| 번역/상품 콘텐츠 정책 | 기존 CONTENT_TRANSLATION / PRODUCT_CONTENT | 정책 캐시/override, 검증된 번역 actor, 시스템 작업의 userId 부재 유지 |
| 비용 집계·관측 | service billing breakdown, quota status | 다른 서비스 scope 혼입 제거. completed/reserved/projected를 분리. 기존 requireAdmin 유지 |
| 실행 루프 | planNextProposal→acceptProposal→dispatchWorkProposal / createWorkReplay | 기존 budget·COMMIT/credential·retry·observe·resume·owner 경계와 명령 순서 유지 |

실행 루프 본체는 기존 약 300줄에서 18줄의 단계 조율로 정비했다. 초기화/노드 선택/소유 주체·기억·관찰/단발 실행 상태는 원래 세션에서 관리하며 모듈에는 좁은 typed callback과 live getter/setter로 전달한다. 전체 세션을 하나의 거대한 공유 mutable 객체로 옮기지 않았다. raw-source privacy/boundary 검사는 새 실행 모듈까지 범위를 늘리고 assertion을 유지했다.

### 가격과 quota 정책 변경 계약

`AI_PRICING_CATALOG`는 `{version,rates:[{provider,model,currency,inputPerMillion,outputPerMillion}]}` 구조다. exact 모델 가격이 `model="*"` provider 추정치보다 우선한다. 미설정이면 옛 provider 단가를 `legacy-provider-estimate-v1`로 명시적으로 유지하며 최신 공식 가격으로 주장하지 않는다. 잘못된 config/가격 미연결은 유료 호출 전 거부한다.
가격 계약의 currency는 확장 가능하지만 기존 quota/aggregate/billing 단위는 USD다. 다른 currency는 변환 정책 없이 합산하지 않고 거부한다. 운영 가격/모델 설정은 변경하지 않았다.
quota는 기존 admin API의 layer/limit/period 정책을 읽는다. requests는 logical 호출 수, tokens/cost는 입력·최대 출력·재시도·명시 fallback 예약량이다. 여러 업체를 예약해도 부담 주체는 자동 변경하지 않는다. 실제 성공 비용과 불확실한 실패 시도 용량은 분리한다.

## 검증 결과·남은 한계

### 실제 결과

- 실행/재개/작업 단위/시각 fallback/Discovery/복구/Experience/Assistance/Workflow/Windows 안전/종료 기록: 12 suites, 139 tests PASS.
- 번역·선택 조직·전체 서비스 Extension·업체/모델 선택·AI 보안·실제 공통 HTTP·Local Agent·bootstrap/incremental 분리: 9 suites, 277 tests PASS.
- 가격 7, 비용 adapter 11, Core 재시도 metadata 1, 서비스 질의 HTTP 17, LMS/Neture 업무 6, 서비스 운영 요약 10, billing 격리 2, Core 업무 경계 15 tests PASS.
- 실제 PostgreSQL 15 quota 예약/정산/해제/관측 14 tests, canonical bootstrap→TypeORM incremental 전체 26개 적용→재실행→상태 분류/fingerprint 1 test PASS. 테스트 연결은 별도 loopback fixture뿐이며 application DB 설정을 읽지 않았다.
- 합계 500 tests PASS(중복 재실행 제외). 실패 이력: Core의 오류 정규화가 새 DB 장애 코드를 일반 provider 실패로 바꿨던 부분을 수정 후 HTTP 503 재검증. 관리자 상태 fixture의 빠진 id column 보완. 전체 schema 검사의 기본 5초 제한을 30초로 변경하고 같은 assertion으로 통과. 검사 assertion을 삭제·완화하지 않았다.
- `build:packages`, ai-core build, API build/type-check PASS. 수정 코드 ESLint 오류 0(기존 ai-admin unused catch warning 2건). migration contract 21 gates PASS. docs 민감정보 3882 files PASS, 문서 상대 링크 PASS, git diff --check PASS.
- UI/메뉴 변경 없음. provider는 mock이며 실제 유료 호출·실 PC smoke·운영 DB/설정 변경을 하지 않았다.

### 운영 적용 전제와 한계

1. 운영 적용 전 승인된 incremental migration job에서 `CreateAiUsageReservations1791870434349` 적용이 필요하다. 원장 미준비/DB 장애는 호출 전 `AI_QUOTA_UNAVAILABLE`(공통 질의 HTTP 503), 한도 초과는 HTTP 429다. 실제 운영 적용 승인·실행은 이번 push와 별개다.
2. 예약·usage log의 비용 정밀도는 numeric(20,8)로 확장한다. 기존 데이터 값은 유지하며 새 billing/결제 원장을 생성하지 않는다. ALTER의 운영 잠금·적용 일정은 배포 단계에서 검토해야 한다. financial receipt 보존 때문에 down은 forward repair를 요구한다.
3. 실패/timeout/파싱 실패·응답의 usage 누락·성공 뒤 이력 실패는 과금 여부를 단정할 수 없다. 예약을 TTL만으로 지우지 않는다. 호스트 내부 `reconcile`는 외부 업체의 확인된 사용량/무과금 증거와 고유 evidenceId로 남은 용량을 정산한다. 동일 증거의 재실행은 멱등이며 다른 사용량을 같은 증거로 재사용하면 거부한다. 사용자/AI HTTP 도구로 노출하지 않았다.
4. UTF-8 byte + max output + retry/fallback의 예산은 보수적 텍스트 추정이다. 실제 업체 invoice, grounding/tool/이미지 요금의 완전한 상한을 보장하지 않는다. 모델 통계가 없거나 실제 모델이 설정 범위를 벗어나면 완료 응답을 재호출하지 않고 예약을 재조정 대상으로 유지한다.
5. 부담 주체는 기존 platform 유지다. userId는 quota/감사의 사용자 축이며 사용자에게 요금을 청구한다는 뜻이 아니다. store/user/external-account 결제·외부 인증 연결은 별도 host binding이다.
6. 이번 연결은 아래 표의 공통 업무 실행 경로다. legacy ai-proxy/multimodal/Planner의 직접 transport와 public web research는 자기 기존 경로를 유지한다. 이를 공통 예약으로 모두 전환한 상태라고 주장하지 않는다. transport 이관은 별도 회귀와 알려진 token/tool usage 계약이 필요하다.
7. `ai_usage_aggregate`와 billing은 완료 사용량만 집계한다. 미해결 예약은 관리자 quota 상태의 reservedValue로 확인한다. 미해결 사용량이 있는 billing snapshot은 완결 invoice 증거가 아니다.

### 문서 정합

앞 공통 구조 §6 P2의 예약·정산/가격·관측을 이번 범위에서 구현했으며 적용 범위와 남은 직접 호출 경로를 명시한다. 기존 Core/Extension·도메인 권한·자료 audience·Assistant V2 A→I·Task 완료 판단·Node ownership을 변경하지 않았다. 앞 WO의 완료 기록은 당시 증적으로 보존한다.


종료 직전 `origin/main`이 `f66ed5f5f8`로 이동했으나 변경은 PharmacyHub 운영 SDK/문서 3개 경로뿐이며 이번 코드·migration과 겹치지 않는다. 통합 단계가 아닌 push까지 범위이므로 이번 branch의 검증된 base를 유지한다.
WORKTREE_DISPOSITION: `wo/ai-quota-runtime-maintenance` / base `9400a625e4` + 앞 AI branch / main integration 없음 / CI 원격 미실행 / deployment 미실행 / 로컬 PG·mock 검증 PASS / KEEP(미병합 검토용).
