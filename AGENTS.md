# O4O Codex Execution Guidelines

## 1. 문서 우선순위와 필수 선행 확인
- 작업 시작 전 루트 CLAUDE.md를 반드시 읽는다.
- 현재 WO/IR/CHECK가 가리키는 범위에 해당하는 baseline 문서를 확인한다.
- AGENTS.md는 Codex 실행 지침이며 CLAUDE.md를 대체하지 않는다.
- 충돌 시 우선순위는 다음 순서로 적용한다.
  1. 사용자의 현재 명시적 지시
  2. CLAUDE.md
  3. 사업 철학·Canonical Flow 등 상위 baseline
  4. AGENTS.md
  5. 작업별 IR/WO/CHECK
- 사용자의 명시적 지시가 DB 파괴·권한 경계·보안 정책 변경을 요구하면, 안전하게 해석하고 필요한 판단을 사용자에게 요청한다.

## 2. 저장소·환경 개요
- 이 저장소는 pnpm workspace 기반의 O4O Platform monorepo다.
- 주요 앱/서비스는 apps/ 아래에 위치한다.
- 코드 변경은 해당 기능 영역에 맞춰서, 필요 시 공통 모듈 영향도도 함께 확인한다.
- Node 22.18.0, pnpm 10.25.0 을 사용한다 (루트 package.json `volta` 기준, CI 동일). 실행환경 정본은 SETUP.md.
- 비밀정보·자격정보는 문서·로그·커밋·스크린샷에 포함하지 않는다.

## 3. Work Order 실행 원칙
- 기본 실행 순서는 다음과 같다.
  1. 조사
  2. 문제 확정
  3. 최소 수정
  4. typecheck/build/test
  5. 가능하면 browser smoke
  6. CHECK/IR 갱신
  7. path-specific stage
  8. commit
  9. push
  10. 한글 완료 보고
- WO가 조사 전용이면 구현하지 않는다.
- WO가 구현을 명시하면 조사 후 안전 범위 안에서 구현·검증까지 중간 승인 없이 계속 진행한다.

## 4. Git 및 다중 작업공간 안전
- GitHub를 동기화 기준으로 사용한다.
- 작업 전 반드시 git status --short, git branch --show-current, git fetch origin, git status -sb를 확인한다.
- 다른 작업공간이나 다른 에이전트가 만든 dirty/untracked 파일은 다른 세션 소유로 간주한다.
- git add .와 git commit -am은 사용하지 않는다.
- path-specific stage만 사용한다.
- git diff --cached --name-only로 스테이징 대상이 범위 안인지 확인한다.
- 범위 밖 파일을 restore/reset/stash하지 않는다.
- push 전에는 게시될 commit 목록을 확인한다.

## 5. 코드·아키텍처 경계
- 의존 방향은 Core → Extension → Feature → Service로 유지한다.
- 동결 Core 또는 shared/core 계약을 변경할 때는 명시적 WO가 필요하다.
- 공통 sidebar/menu/layout/config를 수정하면, 모든 소비처 영향도를 먼저 확인한다.
- 단일 서비스 기준으로 공통 변경을 완료로 판단하지 않는다.
- route 없는 메뉴를 노출하지 않고, 실기능이 있는 메뉴를 은폐하지 않는다.
- UI 정책 문제를 DB backfill나 migration로 우회하지 않는다.

## 6. DB·migration·프로덕션 안전
- 기본 환경은 프로덕션이다. 운영 데이터는 항상 민감정보 마스킹을 우선한다.
- read-only 검증(SELECT, 상태 조회, migration 이력 확인)은 허용 범위에서 직접 가능하다.
- UPDATE/DELETE/DROP/ALTER, 대량 write, migration 적용은 사용자 명시 승인 필요다.
- 실제 DB host/password/account를 문서·로그·커밋에 기록하지 않는다.
- 필요 시 CLAUDE.md의 환경 섹션과 관련 baseline을 참조한다.

## 7. 구현 자율 범위와 중지 조건
- 다음은 WO 범위 안에서 계속 진행해도 된다.
  - 대상 파일 수정
  - 직접 발생한 import/type 오류 수정
  - 관련 typecheck/build/test 수행
  - CHECK/IR 갱신
  - 승인된 browser smoke
  - 승인된 commit/push
- 다음은 중지하고 사용자 판단을 요청해야 한다.
  - WO 범위 밖 파일 수정 필요
  - 기존 dirty 파일 접촉 필요
  - DB schema/migration 필요
  - package.json/lockfile/dependency 변경 필요
  - Docker/CI/build infrastructure 변경 필요
  - Core/Frozen/공통 계약 변경 필요
  - 권한/role/route/API contract 변경 필요
  - 데이터 삭제·대량 update·seed 변경 필요
  - 결제·정산·법률·규제 판단 필요
  - 실제 계정·자격정보·외부 서비스 승인 필요
  - 현재 변경과 무관한 build/test 실패

## 8. 검증 원칙
- 단순 빌드 성공만으로 UI 작업을 종결하지 않는다.
- 실행 환경과 테스트 계정이 있으면 browser smoke를 수행한다.
- route/menu/layout 변경은 desktop과 mobile 모두 확인한다.
- 신규 route는 메뉴 진입과 직접 URL을 모두 확인한다.
- 기존 route 회귀도 확인한다.
- smoke가 불가하면 구체적인 이유를 기록한다.

## 9. 브라우저 smoke 및 테스트 계정
- 브라우저 검증 전에는 CLAUDE.md의 테스트 계정 섹션을 확인한다.
- 실제 운영 계정은 사용하지 않는다.
- 테스트 계정 정보는 문서/로그/커밋/스크린샷에 기록하지 않는다.
- 새 테스트 계정을 임의 생성하지 않는다.
- role/service membership이 현재 검증 대상에 맞는지 확인한다.
- 계정 값 자체는 코드나 문서에 복사하지 않는다.

## 10. 완료 보고·CHECK·commit·push
- 중간 보고와 완료 보고는 한국어로 작성한다.
- 파일명·route·API·component·commit hash 등 기술 식별자는 원문을 유지한다.
- 불필요하게 긴 diff나 전체 파일을 사용자에게 붙이지 않는다.
- 완료 보고는 변경/미변경/검증/CHECK/Git 상태 중심으로 간결하게 작성한다.
- 작업이 끝나면 관련 CHECK/IR 문서를 갱신한다.

## 11. 코딩 스타일과 작업 규칙
- TypeScript + ES modules를 기본으로 한다.
- ESLint/Prettier 규칙을 따른다.
- 컴포넌트/클래스는 PascalCase, 함수/변수는 camelCase, hooks는 use* prefix를 사용한다.
- 테스트 파일은 구현 파일과 같은 위치에 둔다.
- 기존 코드 패턴을 우선 따르되, 명확한 이유가 없으면 과도한 추상화나 리팩터링을 하지 않는다.

## 12. 프로젝트 구조와 주요 명령
- pnpm workspace 기준으로 작업한다.
- 주요 검증 명령은 다음과 같다.
  - pnpm --filter @o4o/web-neture build
  - pnpm test
  - pnpm run type-check
- 필요 시 관련 workspace를 한정해 테스트한다.
