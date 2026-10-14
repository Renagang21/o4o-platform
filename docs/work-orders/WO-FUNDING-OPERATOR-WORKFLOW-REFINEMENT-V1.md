# 펀딩 운영 심사·참여 처리 흐름 2차 정비

> 상태: ACTIVE · 작성일: 2026-10-14 · 최종 갱신: 2026-10-14
> 종료점: 검증 → commit/push → PR → 통합 담당 인계. main 병합·배포 제외.

## 조사와 TODO 보완

기준 main: `0b3a63756e57a6019f86baf3fdebaabf6ff60c57`.
실행 경로는 web-neture의 funding 서비스 운영자 `/operator/market-trial/:id`다.
정본은 [content-only 경계](../architecture/O4O-MARKET-TRIAL-CONTENT-ONLY-DOMAIN-BOUNDARY-V1.md), [오프라인 기록 정책](../architecture/O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1.md), [초기 운영 모델](../baseline/O4O-DISTRIBUTION-FUNDING-INITIAL-OPERATION-MODEL-V1.md).

| 조사 | 발견 | 보완한 작업·보존 조건 |
|---|---|---|
| R1/S1 | 상세 화면이 8개 요청 채널과 모든 쓰기/읽기 상태를 함께 소유 | 펀딩 내부 전용 workflow hook으로 요청·결과 책임 분리. 표시·심사 입력은 화면 소유 |
| A1 | 쓰기 채널별 잠금이라 단계 변경 중 입금/이행 요청 가능 | 화면 전체 쓰기는 동기 잠금 하나로 직렬화. 기존 API/상태 전이/권한 유지 |
| A1 | 저장 후 조회 실패가 저장 실패와 구별되지 않음 | 저장 성공 후 읽기 실패 안내와 조회 전용 재시도. 저장 API 재호출 금지, 확인 전 추가 쓰기 방지 |
| A1 | KPI 실패 시 조용히 사라짐 | 명시적 조회 오류·재시도, 기존 KPI를 최신값으로 오인하지 않도록 제거 |
| S1 | route 전환 시 일부 필터/오류/입력 상태 유지 가능 | 펀딩 ID별 workspace 수명. 늦은 이전 응답이 새 펀딩에 영향 주지 않도록 기존 요청 방어 유지 |
| F1/R1 | 개설자와 운영자의 업무가 비슷해 보임 | 개설자는 supplier API·포럼 회원 관리, 운영자는 operator API·입금 확인. 동일 hook으로 합치지 않음 |

실제 소비처: App.tsx lazy route와 operator barrel. 원문 소비처 검사: 활성 원문/테스트 계약 0건.
서비스 간 공통화·공급자 화면 재작성·기존 입금/상세 재구현·API/DB/권한 변경·약사회 분회 수정 제외.
오프라인 환불 기록은 실제 송금 실행이 아니며 포럼 가입/제품 주문과 연결하지 않는다.

## TODO

- [x] 기존 코드·정본·소비처 조사.
- [x] 실패/동시 실행/대상 변경 조건으로 TODO 보완.
- [x] 심사·단계·포럼 복구·입금·이행·CSV·KPI workflow 구현.
- [x] 저장 실패 입력 보존, 저장 성공/조회 실패 재시도, 쓰기 직렬화, 이전 응답 회귀 검증.
- [x] Neture 테스트·타입·빌드·실제 UI 합성 fixture 검증.
- [ ] 검증 CHECK·전체 TODO 정합, commit/push/PR 인계.

실계정·실제 입금 확인은 사용자 담당. 운영 DB 쓰기 없음.

검증 결과: [CHECK](../checks/CHECK-FUNDING-OPERATOR-WORKFLOW-REFINEMENT-V1.md). Neture 99 files/893 tests, 타입 포함 빌드, PC/모바일 합성 UI PASS.
