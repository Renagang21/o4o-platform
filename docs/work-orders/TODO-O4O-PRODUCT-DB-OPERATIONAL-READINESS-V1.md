# TODO — 상품 DB 관리자 운영 최종 준비 V1

상태: IMPLEMENTED — 로컬 검증 완료, commit·push 인계 · 2026-10-26 · 기준 main 5f778c3a18

사용자 지시: TODO를 만들고 진행, main 병합 전까지. 전용 branch `wo/product-db-operational-readiness`에서 구현·검증·push한다. PR 생성·병합·배포·운영 Job/Scheduler/IAM 생성·실계정 변경·운영 상품 쓰기는 수행하지 않는다. 외부 AI 연결은 별도 담당이다.

- [x] T1. 기존 P1/P2·정기 운영·배포 기록과 관리자 코드 대조
- [x] T2. 관리자 실행 관측 없음·오래됨·실패·예약 지연 표시 보완
- [x] T3. digest·최소 권한·실행 예산을 확인하는 비실행 Job/Scheduler 계획 생성기
- [x] T4. 관리자 흐름 회귀·PC/모바일·독립 worker/운영 계획 검증
- [x] T5. 현행 안내의 배포 상태 정합·최초 가동 및 장애 복구 절차 정리
- [x] T6. 변경 범위 검사·commit·push·통합 인계

운영 연결을 실행한 것으로 표시하지 않는다. 최근 job 성공 관측도 Scheduler 활성화나 휴면 실행 검증의 증거로 확대하지 않는다. 최초 운영 기준·상품군·주기는 관리자가 결정하며 seed/예약을 자동 생성하지 않는다. 이전 WO/CHECK는 과거 기록으로 보존한다.

검증: [CHECK](../checks/CHECK-O4O-PRODUCT-DB-OPERATIONAL-READINESS-V1.md). 실제 운영 연결·실계정 확인은 main 통합 후 운영 단계로 남기며 개발 완료와 구분한다.
