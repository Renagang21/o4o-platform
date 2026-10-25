# AI 가격·예산 준비 도구 검증

> **상태**: COMPLETED · **작성·갱신**: 2026-10-25 (Asia/Seoul)
> **개발 결과**: 로컬 검증 완료·commit/push 인계. 운영 적용은 별도
> **작업**: [TODO](../work-orders/TODO-O4O-AI-PRICING-READINESS-V1.md) · `wo/ai-pricing-readiness`
> **기준 main**: `42dddc91b5ee18605c62b9c3e55091137dcd2b7f`

## 1. 변경과 판정 범위

기존 가격/native 계획기와 quota 판정으로 비밀 없는 실행 사례·catalog·선택적 quota snapshot을 검사하는 오프라인 CLI를 만들었다. 검토용 draft는 null 가격/예산을 남기며 새 native 요율을 임의로 설정하지 않는다. 모델·provider 선택 registry·Core/Extension·원장·route·권한·API shape·schema/migration·dependency·workflow는 추가하지 않았다.

현재 코드에서 비용 `0.1 + 0.2`가 한도 `0.3`을 넘었다고 판정하는 오류를 확인했다. 소수 8자리 원장 단위의 정수 비교로 수정했고 기존 한도 도달/요청 0 판정·요청/토큰 의미는 유지한다. 관리자 status의 비용 합계와 판정도 같은 함수를 사용한다. 이는 추정 비용 계산의 비교 정확도 보완이며 외부 결제 정책 변경이 아니다.

CLI의 성공은 제공된 표본/설정/snapshot만의 결과다. 현재 서버 모델 선택·credential·실제 provider·live 사용량/보류·user quota·배포는 미검증으로 출력한다. 실제 원자 예약·권한 확인을 우회하지 않으며 운영 가격 적용/유료 사용 활성화 완료로 보고하지 않는다. 사용 절차와 한계는 [운영 준비 guide](../guides/O4O-AI-PRICING-READINESS-RUNBOOK-V1.md)를 따른다.

## Shared Module Change Verification

### Changed shared module

- Module: 기존 `ai-native-metering.ts`의 선택적 명시 catalog 입력, `ai-quota.service.ts`의 공통 순수 판정/정확한 비용 비교·관리 status. 새 `ai-pricing-readiness.ts`·CLI는 이를 소비하는 파일 도구다.
- Package: `@o4o/api-server` 내부. `@o4o/ai-core`·공개 패키지 계약 변경 없음.
- Direct consumers: `AiAccountedExecution`의 text/native 예약, `AiQuotaService.checkQuota/reserve/getStatus`, 관리자 quota/status, 새 CLI. OCR 기존 source 연결 설명만 현행화했다.
- Indirect consumers: Neture Home/계획/파일, 병원약국 공개 도구, 편집/강의/Qwen, 상품/공급자, TTS, 공통 질의·업무 Extension·LMS·KPA. runtime SQL의 scope/service/actor/기간/보류 조회·locking은 유지한다.
- 조사: apps/packages/services/scripts의 import·호출·실제 provider 요청 상한·모델 해석을 대조했다. manifest는 검토 표본이며 사용 여부 미확인 legacy HUB·폐기 서비스의 복구 근거가 아니다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|
| 모든 text/native 회계 host | 직접/간접 | 같은 계획/예약. 비용 한도 경계의 부동소수점 오판 제거 | 가격·accounted/native·proxy·text·다중 provider·실제 PG quota | PASS (local fixture) |
| Neture/병원약국 Home·파일·계획·공개 요청 | 간접 | quota 수치 비교만. 인증/익명 문맥·자료/도구 권한 유지 | 실제 host/router 회귀 | PASS (local fixture) |
| 공급자/상품/직원·운영/협력·LMS Extension | 간접 | 동일 actor/scope/service/한도와 기존 저장/확인 | actor·copilot·질의·Extension 회귀 | PASS (local fixture) |
| 관리자 usage·quota/status | 직접 | 비용 합계 표시·판정 일치, OCR 설명 정합. 새 API/UI 없음 | status 단위·관리 HTTP·admin 타입 | PASS (local fixture) |
| 오프라인 운영 CLI | 직접 | 입력 파일/env의 명시 catalog·draft·snapshot 점검. DB/provider 호출 없음 | 실제 Node 명령·16개 synthetic 사례·0/1/2 exit 검증 | PASS |
| 폐기 runtime/미확인 HUB | 미사용 | 복구/노출/기능 추가 없음 | source/canonical 대조 | N/A |

### Route / role / capability check

- Route existence: 신규 route/menu 없음. CLI entry만 추가했다.
- Role guard: 기존 관리자 조회·업무 host의 인증/권한 유지. CLI는 server authority·사용자 역할을 생성하지 않는다.
- Capability map: 업무 도구·자료 공개·게시/주문/삭제·모델 선택·실행 확인 변경 없음.
- Visibility/filter·empty group/block removal: UI/layout/메뉴 변경 없음, 해당 없음.
- quota: SQL/transaction lock·layer/service/scope/user·UTC 기간·보류/reconcile을 유지한다. 오프라인 snapshot은 예약을 만들거나 해제하지 않는다.

### Smoke result

실제 Node CLI를 직접 실행해 16개 후보를 synthetic metadata로 채운 private fixture의 draft·검사·한도 차단·미확정 예제를 확인했다. 운영 단가는 source/예제에 넣지 않았다. HTTP/browser·운영 DB·실계정/유료 호출·Windows 검증은 이번에 수행하지 않았다. CLI 모듈은 AppDataSource/provider/key resolver를 import하지 않는다. 기존 업무 route 검증은 fixture 회귀이며 live 사용 성공의 증거가 아니다.

## 2. 검증 기록

| 검사 | 관찰 결과 |
|---|---|
| 환경/설치 | 저장소 Node 22.18.0·pnpm 10.25.0, frozen/ignore-scripts 설치와 package build 성공 |
| 비용 오류 재현 | 원래 quota source로 격리 PostgreSQL 실제 예약의 0.1+0.2/0.2+0.1 경계 **2건 실패 재현**, 고친 source hash 복원 확인 |
| 실제 PostgreSQL | 수정 후 quota schema/예약·모델 제어·관리 집계 **4 suite/30 tests PASS**. tmpfs 전용 DB 잔존 0·전용 컨테이너 제거 |
| 관련 AI 회귀 | 최신 실제 Node 실행 명령/exit 보완까지 포함해 **20 suite/319 tests PASS**. CLI·순수 quota 별도 **2 suite/34 tests PASS**와 서로 중복 합산하지 않음 |
| 실제 운영 도구 실행 | 16개 synthetic 사례 통과 exit 0, quota 차단 exit 1, null 모델/bytes 예제 exit 2, draft approved=false. 유료/provider/DB 호출 없음 |
| 타입/빌드 | API 타입·tsc→database backup→tsup→restore·main/migrate syntax PASS. database 산출물 **2,404개** hash 일치·수정 runtime source map 3개 일치. admin 타입 PASS |
| lint/문서/스코프 | 변경 TypeScript 9개 lint 오류·경고 0. 문서/예제 8개 민감정보 패턴 0·새 로컬 링크/절 18개 존재 확인·공백 검사 PASS. 허용 경로 17개로 path-specific stage/commit 인계 |

초기 package build 전 타입 검사에는 workspace 산출물 누락과 CLI env 타입 오류가 있었다. package build·타입 보완 뒤 실제 API 타입/빌드는 통과했다. pnpm filter exec가 child exit 2를 1로 감싸는 것도 실제 명령에서 확인해 guide/help를 `node --import tsx` 직접 실행으로 정렬했다. 문서의 0/1/2는 Node entry의 실제 종료 코드다. 실패 실행을 성공으로 합산하지 않는다.

## 3. 인계·남은 운영 작업

이번 종료는 개발 검증·commit/push다. PR/main 병합·CI 운영·배포·운영 가격/한도/credential·유료 검증은 실행하지 않았다. 실제 사용 모델/현재 선택·가격 출처/요율·native 예산·정확한 설정 전달과 운영 계정/남은 quota 검증이 필요하다. 코드/표본 검증을 운영 활성화 완료로 확대하지 않는다.

관리 `connected`와 가격 준비를 구분하고, 작업 변경을 전체 TODO·구조·신규 개발자/설치 guide에 연결한다. 기존 COMPLETED 개발/배포 기록과 canonical index는 수정하지 않는다. Sonar 전체 중복률 정비와 운영 billing 계약은 별도다.

push 전 fetch의 main은 시작과 같은 `42dddc91b5`다. 자동 merge/rebase 없이 새 작업 branch를 인계한다. 기준 checkout의 `work` branch·`1b158cf4c1`은 유지한다. 검증 로그/CLI synthetic fixture는 private `/tmp`에만 있고 운영 설정 파일로 배포하지 않았다.

WORKTREE_DISPOSITION: `/workspace/o4o-wt/ai-pricing-readiness` · `wo/ai-pricing-readiness` · base `42dddc91b5` · PR CI/main/deployment 미실행 · `KEEP` (미병합 push 인계).
