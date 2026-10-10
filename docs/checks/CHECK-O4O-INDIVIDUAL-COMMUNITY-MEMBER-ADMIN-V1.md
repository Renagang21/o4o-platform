# 개별 커뮤니티 역할·회원 제재 검증

> **상태**: LOCAL_VERIFIED · 운영 적용 대기
> **작성일**: 2026-10-10 · **최종 갱신**: 2026-10-10
> **근거 WO/IR**: [후속 TODO](../work-orders/WO-O4O-COMMUNITY-OPERATOR-MEMBER-FOLLOWUP-V1.md) · [확정 설계](../design/DESIGN-O4O-INDIVIDUAL-COMMUNITY-MEMBER-ADMIN-V1.md)

## 환경과 결과

격리된 PostgreSQL 15 컨테이너의 합성 fixture만 사용했다. 운영 DB·실계정 변경은 없다.
canonical bootstrap과 기존 incremental 전체를 재현한 이전 지문은 6199행 / `fbfbdec4d389108b2324d679c154bf9ed5766dac6c4f2d74cfa57186343348f3`였다.
새 migration 후 지문은 6218행 / `30be348978adb3aa0b5b0c378517b232ee36038c6bdbbdac70780d3c8f86f4bb`로 manifest 기대 상태와 일치했다.

실제 PostgreSQL 검증: 13개 통합 check PASS.

- operator 제재 거부, 다른 커뮤니티 가입 행 변경 거부.
- admin의 정지·해제·탈퇴 및 해당 변경 이력 저장.
- 다른 커뮤니티·서비스 가입·공통 계정 상태 불변.
- 두 admin의 동시 해제는 한 건만 성공하고 마지막 유효 admin 변경은 거부.
- 메인 자격을 잃은 기존 admin 대신 중앙 서비스 admin이 적격 후임 지정.
- 이력 INSERT 실패 시 가입 상태 UPDATE도 rollback.
- 승인 사용자 잠금 대기 중 먼저 커밋된 메인 정지를 확인하고 pending·서비스 미가입 보존.
- 새 역할·이력 사용 후 migration down 거부.

별도 fresh DB에서 기존 active/withdrawn operator가 admin으로 전환되면서 가입 상태와 서비스 상태를 유지하고,
시스템 전환 이력 두 건이 생기는 것과 rollback 보호를 확인했다.

## UI와 검증 한계

Chromium desktop 1440×1000 / mobile 390×844에서 모의 API를 사용했다.
회원 상태 필터, admin 정지 요청·응답 표시·정지 해제 버튼, operator 제재 버튼 차단 및 중앙 개별 Admin 선택·사유·지정 요청을 확인했다.
UI 호출 검증과 실제 PostgreSQL 서비스 검증은 별도 실행이며, 실제 로그인부터 DB까지 연결된 E2E로 보고하지 않는다.
운영 DB 전환과 배포 승인·실계정 smoke는 미수행이다.
최종 Jest/Vitest/build/CI 결과는 PR 최신 HEAD와 TODO 검증 절을 기준으로 한다.

## 최종 로컬 검증

- 최신 main `2a8b80cf24` 통합 후 API Jest 7 suites / 168 tests PASS.
- 플랫폼 bypass 차단 보완 후 관련 2 suites / 49 tests PASS (위 집합과 중복, 플랫폼 역할 회귀 1개 추가).
- Neture Vitest 2 files / 20 tests PASS.
- API 타입 검사·auth-client 재빌드·Neture production build PASS.
- PostgreSQL 실제 동시성·원장 경계 13 checks 및 별도 migration 전환 검증 PASS.
- Browser desktop/mobile에서 admin·operator·중앙 역할 지정 6개 시나리오 PASS (mock API).
- migration contract 21 checks / 실패 0, historical source 544개 불변, 문서 민감정보·unsafe route·diff/staged scope 검사 PASS.

작업 branch는 `wo/community-operator-next`, PR은 [#412](https://github.com/Renagang21/o4o-platform/pull/412)다.
CI·Sonar·review의 최종 상태는 PR 최신 HEAD 기준으로 확인한다.
