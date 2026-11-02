# CHECK-O4O-ADMIN-OPERATOR-INVITE-FIRST-V1

- 작성일: 2026-11-02 (Asia/Seoul)
- 범위: [WO](../work-orders/WO-O4O-ADMIN-OPERATOR-INVITE-FIRST-V1.md)
- 상태: 구현·로컬 검증 완료, PR CI/리뷰 준비. main 병합·운영 DB 적용·배포 미실행.

## 사용자 흐름과 권한 보존

초대는 대상 선택/이메일만 받는다. 일상업무 전체를 서버에서 기본 설정하고 본인 수락 후 이용한다. 전체 관리자·서비스 Admin·독립 조직 내부 권한은 추가하지 않는다. 담당 업무는 기존 변경 화면에서 사유·동시 수정 버전과 함께 저장하며 재초대를 요구하지 않는다. 진행·오류·메일 발송 확인·재발송 복구와 중복 클릭 방어는 유지한다. 이전 화면에서 업무 선택 payload를 보내면 새로고침을 안내하고 자동으로 범위를 확대하지 않는다.

기존 global/조직/서비스 Admin 역할·범위·기간·비활성 상태를 보존한다. 기존 메뉴 설정 테이블의 명시적 위임 표시와 유효한 부모 역할·membership을 함께 검사하며, 과거 서비스 역할/설정만으로 중앙 업무 권한을 만들지 않는다. 중앙 업무 해제는 명시적 설정을 삭제하고 중앙 전용 역할만 회수한다. 해제된 중앙 전용 역할은 기간 제한이 없을 때 새 본인 수락으로만 복원한다. 기존 서비스 접근은 해당 서비스·조직 guard가 계속 담당한다.

과거 미수락 초대는 당시 선택한 업무 범위를 그대로 보여 주고 수락한다. 초대 처리·메일 개인정보·감사 최소화·보존 경계는 유지한다. 실제 수신자에게 메일을 보내거나 운영 계정·DB를 수정하지 않았다. SMTP 전달과 실제 받은편지함 도착은 이번 로컬 검증으로 입증하지 않는다.

## 검증 증거

- Admin 전체 Vitest: 62 suites / 629 tests PASS. 마지막 화면 정리 후 대상 11 tests 재통과.
- Chromium: PC 1280px·mobile 390px의 진행/실패 복구/확정 성공 4 tests PASS. API는 합성 fixture, 실제 메일/DB 쓰기 없음.
- Neture 수락 화면: 14 tests PASS, TypeScript 포함 production build PASS.
- Admin production Vite build PASS, API build TypeScript noEmit PASS.
- 실제 PostgreSQL: 초대·기존 권한 보존·업무 변경/회수·이전 초대 호환·무위임 차단·기간/비활성/정지·재수락 및 route/mail focused 33 tests PASS.
- 공통 중앙 접근 PostgreSQL 및 서비스별 분류·메일 개인정보·보존·일반 초대 회귀: 6 suites / 65 tests PASS.
- 중앙 route·업무 allowlist·bootstrap/classifier 관련 회귀: 5 suites / 88 tests PASS. 별도 환경이 필요한 일반 초대 integration 및 legacy 이력 harness의 58 tests는 SKIP이며 통과로 계산하지 않는다.
- 격리 PostgreSQL 15 canonical bootstrap와 기존 53 incremental prefix 지문 일치. 새 54번째 migration 후 7411 lines / `4adee8f4fc7f40b3dd9ae6ff84d5bafad7128378e4c58b4042a4234528542a17`. 빈 상태 down/up에서 이전/신규 지문 복원 PASS.
- migration contract: 21 PASS / 0 FAIL. 운영 DB 지문을 가져오거나 자동 채택하지 않았다.

## 공유 소비처와 문서 정합

`centralOperationRoles`/메뉴 설정 소비처를 검색해 중앙 접근 route, 회원 directory, 약사 자격 검토/알림, Community 개선, Partner Community, Neture action queue, 메뉴 middleware와 서비스별 분류를 대조했다. 기존 중앙 scope는 유지하고 새 명시적 위임은 일상업무 Operator allowlist에만 적용한다. 독립 서비스의 menu restriction 판정과 조직·membership·약사 자격 guard는 유지한다. 공통 Core entity/writer·새 전역 역할·새 권한 원장은 변경/생성하지 않는다.

현재 관리자 역할 정책과 역할별 업무공간 V2의 초대 시 선택·기존 권한 충돌 검토 문구를 이번 사용자 결정에 맞췄다. 과거 WO/CHECK는 재작성하지 않았다.

## 통합 전 남은 일

PR CI·Codex 리뷰 확인 및 지적 보완. 운영 DDL은 AGENTS.md §5에 따라 구체적 migration 적용 승인을 받은 뒤 통합 담당이 실행해야 한다. main 병합은 자동으로 migration을 실행할 수 있는 배포와 연결되므로 승인 전 병합/배포하지 않는다. 실제 초대 수락·Google 계정 연결·메일 도착 검증은 운영 적용 후 사용자 흐름에서 별도 확인한다.
