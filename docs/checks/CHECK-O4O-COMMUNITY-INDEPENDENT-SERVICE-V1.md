# CHECK-O4O-COMMUNITY-INDEPENDENT-SERVICE-V1

> 상태: ACTIVE · 작성일: 2026-10-17
> WO: [독립서비스 전환](../work-orders/WO-O4O-COMMUNITY-INDEPENDENT-SERVICE-V1.md)
> 환경: 전용 worktree `wo/community-independent-service`. 운영 반영 전.

## 결과

- 업종별 카탈로그·개설/개별 가입·운영자 지정 UI/API와 전용 mutation 서비스를 제거했다.
- 자체 서비스 회원 신청·정책 동의 기록·운영자 승인 콘솔·서비스 회원/공통 계정 기반 접근을 연결했다.
- 신규 게시판의 저장 범위는 `community`다. 옛 원장은 generic 조회 제외 대상으로 유지한다.
- 서비스 정지·역할 회수 후 과거 role 문자열로 중재 권한을 복구하지 않는다.
- My Home·옛 포럼 진입을 새 서비스 공간으로 연결한다. 과거 게시글을 새 원장으로 옮기지 않는다.

## 운영 경계

운영 SQL·migration·데이터 이전·삭제·배포는 실행하지 않았다. 예전 서비스 코드와 개별 community entity/가입/이력 행은 보존한다.
기존 게시판을 이전하거나 폐기하려면 소유자·작성자·가입·첨부·댓글·공개 지정·법정 보유 관계를 읽기 전용으로 조사하고 대상별 계획을 마련해야 한다.
신규 서비스 코드를 사용하므로 이전 글은 새 홈에 자동 표시되지 않는다. 운영자는 신규 게시판을 만들고 공개 범위를 명시적으로 지정한다.
공통 계정의 가입과 커뮤니티 서비스의 이용 신청은 별도다. 현재 승인형 서비스 가입을 유지한다.

## 검증

- API community/접근/Forum/운영 경계 Jest: 17 suites / 239 tests PASS. 전용 PostgreSQL fixture의 6건 포함.
- 가입·공통 승인/반려/재활성화·서비스 간 격리·Demo 보호: 별도 6 suites / 107 tests PASS (위 결과와 일부 중복, 합산하지 않음).
- web-neture 전체 Vitest: 112 files / 1047 tests PASS.
- 공통 패키지 빌드, API 타입 검사, 웹 production build PASS. 웹의 기존 큰 chunk·Browserslist 경고는 비차단이다.
- 변경 TypeScript/TSX 전체 ESLint PASS. unsafe route·TypeORM registry·문서 민감정보 guard PASS.
- Chromium desktop 1440/mobile 390: 실제 로컬 Vite 리소스와 모의 API로 독립 홈·공개 글 빈 상태·옛 목록 미노출·가로 넘침 없음·pageerror 0 확인. 운영 실계정 검증을 뜻하지 않는다.
- PostgreSQL은 전용 로컬 포트/fixture schema만 사용하며 schema는 테스트 후 제거했다. 동시에 두 신청 요청을 보내 pending 회원·정책 audit 각 1건, audit 실패 시 전체 rollback, 정지/탈퇴 보존, 반려된 운영자 재신청의 member 강등, 타 서비스 무변경을 실제 SQL로 확인했다.

운영 실계정·main 통합·배포 확인은 이 로컬 결과에 포함하지 않는다. API 최종 build도 PASS다.

## 인계

개발 담당은 commit/push 후 인계한다(AGENTS.md §4-2). PR 생성·CI 운영·병합·배포는 통합 담당 범위다. 이 worktree는 병합 전 후속 수정을 위해 KEEP한다.
