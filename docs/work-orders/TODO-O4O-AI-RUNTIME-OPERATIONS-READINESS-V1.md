# AI 운영 모델·가격·한도 검증 준비 TODO

> **상태**: COMPLETED · **작성일**: 2026-10-25
> **개발 결과**: 로컬 검증 완료·commit/push 인계. 운영 적용/실사용 검증은 아래 O1~O5와 별도
> **사용자 범위**: 운영 준비와 실사용 검증을 한 묶음으로 진행하되 main 통합 전까지. 조사·구현·로컬 검증·commit/push 후 인계
> **기준 main**: `7a75dcf6664b6b538846b117fbf355676d1a0f3a` · **branch**: `wo/ai-runtime-operations-readiness`
> **기존 기반**: [AI 구조](../architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md) · [가격 사전 점검](../guides/O4O-AI-PRICING-READINESS-RUNBOOK-V1.md) · [직전 배포](../checks/CHECK-O4O-AI-PRICING-INTEGRATION-20261025.md)

## 1. 목표와 경계

기존 모델 선택·가격 catalog·quota 예약/정산을 재사용해 실제 운영 준비에 필요한 설정과 검증 증거를 명확히 한다. 이미 배포한 사전 점검 도구를 중복 생성하지 않고, 현재 서버 설정의 관측과 파일 표본 검증 사이의 부족한 연결을 조사해 필요한 범위만 구현한다.

공식 가격·현재 선택 모델·허용 예산을 추측하지 않는다. credential·원문·실제 사용자/매장 정보를 공개 산출물에 넣지 않는다. 기존 업무 권한·자료 공개·초안 저장/확인·예약/보류/증거 정산을 유지한다. 다른 담당자가 완료한 상품 정정/설명 갱신·협력 모임 업무를 재구현하지 않는다.

이번 종료는 push 인계다. PR/main 통합·배포·운영 설정/DB 변경·유료 호출·실계정 상태 변경은 통합 후 적용 범위로 구분한다. 개발/합성/격리 PostgreSQL 증거를 실사용 성공으로 보고하지 않는다.

## 2. 실행 TODO

- [x] P0 최신 main·세션/worktree·사용자 종료 범위·환경 및 계정 파일 존재 확인
- [x] P1 현재 모델/정책 해석·가격 변수 전달·자격정보/사용처 상태·quota/보류·운영 검증 경로와 전 소비처 조사
- [x] P2 조사 결과로 구현 범위·공통 계약 재사용·지원/미검증 구분·남은 설정 입력/통합 수용 기준 확정
- [x] P3 기존 관리/점검 경로의 부족한 연결 구현. 새 기반/원장·가격 기본값·자동 유료 smoke를 추가하지 않음
- [x] P4 실제 모델 선택·가격/profile·quota 예약/보류/정산과 권한/오류 경계의 의미 있는 회귀 검증
- [x] P5 실행 가능한 운영 검증 입력·절차·실행/미실행 증거·복구/정리 조건 마련
- [x] P6 타입/빌드/소비처·문서/민감정보/링크/스코프 확인, 관련 현행 문서와 전체 TODO 연결
- [x] P7 자기 경로만 commit/push, 정확한 SHA·검증·미해결·통합/운영 단계 인계. branch/worktree KEEP

## 3. 조사 초기 관측

환경 관측은 current지만 외부 identity/secret 연결은 없고 테스트 계정 변수의 readiness는 unknown이다. 신규 worktree와 기준 checkout 모두 현행 로컬 계정 SSOT `docs/local/TEST-ACCOUNTS.local.md`가 없다. 값/이전 계정을 추측하거나 기존 Demo 계정으로 대체하지 않는다.

기존 CLI는 catalog와 선택 quota snapshot만 검사하고 현재 모델 해석·credential·live 사용량/보류·user quota를 미검증으로 남긴다. 실제 서버 설정과 사용자 업무 검증을 위한 추가 입력·관측 경로를 코드로 대조한 뒤 이 TODO를 보완한다.

## 4. 코드 대조와 구현 범위

| 조사 대상 | 확인한 부족/재사용 | 이번 구현·검증 |
|---|---|---|
| `deploy-api.yml`·`cloud-run-env.mjs` | 가격 catalog 전달 없음. 기존 optional env의 set/carry/omit와 현재 서비스 조회를 재사용 | operator 제공 값 우선·현재 값 보존·둘 다 없음 생략. 조회 실패/secret reference는 중단. 기존 runtime parser로 가격·통화 검증 후에만 flag 전달 |
| 기존 gcloud env flag·로그 | JSON 쉼표와 고정 구분자 충돌, 여러 줄 masking을 함께 점검해야 함 | 값과 충돌하지 않는 delimiter·NUL 거부·workflow masking escape. 모든 기존 optional env 소비처 회귀 |
| 관리자 관리 snapshot | 모델/credential 등록 관측만 있으며 현재 process의 가격 version/fingerprint 없음 | 기존 authenticate+requireAdmin/no-store GET에 비밀 없는 가격 metadata 추가. 원문 요율/credential·provider 검증 완료 표시는 반환하지 않음 |
| 가격 CLI | 파일 catalog와 서버 process 관측의 불일치를 확인하지 못함 | 기존 `--runtime-snapshot` 비교 추가. 관측 시각/일치 여부를 표시하고 불일치/invalid는 차단. 모델 선택·실제 provider·live quota 미검증 유지 |
| 모델 선택→회계→보류/정산 | 기존 모듈별 회귀는 있으나 이번 운영 준비 묶음의 실제 DB 통합 증거 필요 | 실제 모델 제어·회계/원장·관리 집계와 합성 transport의 격리 PG 통합. 거부/재시도/정산 실패·증거 재처리·권한 callback 확인 |

workflow 변경은 다음 통합 담당의 검토 대상인 **소스 제안**이다. 이번 branch에서 workflow를 dispatch하거나 repository/environment variable을 변경하지 않는다. 정상 배포에서는 가격 검증을 image push·migration/traffic 변경 전에 배치하며, 기존 migrate-only·freeze·CI·WIF·verified rollout gate는 유지한다.

지원 단위/요율 parser·모델 제어·quota·보류/정산·업무 권한은 기존 기반을 사용한다. 새 Core/Extension·원장·모델 registry·route·role·schema/migration·dependency는 만들지 않는다. 기존 관리 API에 추가하는 가격 관측값은 등록/파싱 증거이며 실제 모델·계정·청구/전 서비스 실사용 완료를 뜻하지 않는다.

## 5. 검증·운영 인계

[CHECK](../checks/CHECK-O4O-AI-RUNTIME-OPERATIONS-READINESS-V1.md)에 소비처/역할 경계·373 API/37 PG/24 admin/194 배포 도구 검증과 실제 Node CLI·타입/빌드 결과를 모았다. PG에서 증거 정산 후 미산정 표시 1건을 재현한 뒤 확정 비용/미계측을 분리했고 최종 통과를 확인했다. 운영 DB·실계정·유료 transport는 사용하지 않았다.

아래는 다음 통합/운영 단계의 입력이며 이번 개발 완료 체크와 구분한다.

- [ ] O1 실제 사용 모델/provider·host 최종 선택과 공식 요율/단위·입출력/검색 예산 확정
- [ ] O2 기존 current 모델/가격/한도·서빙 revision/secret 연결 방식을 관측하고 변경·복구 범위 확정
- [ ] O3 통합 담당의 source/workflow 검토·현재 gate 확인·main/배포·실제 catalog 관측 비교
- [ ] O4 허용 계정/예산과 정리 계획으로 실제 역할별 업무·provider·사용량/비용·한도 검증
- [ ] O5 사용량 미반환/후처리 실패·보류/증거 정산·복구를 운영 증거로 확인

실제 절차는 [운영 검증 인계](../guides/O4O-AI-RUNTIME-OPERATIONS-VERIFICATION-V1.md)를 따른다. 원문·credential·실제 사용자/매장·운영 응답을 공개하지 않으며, 로컬 PASS와 코드 push를 실사용 성공으로 바꾸지 않는다.
