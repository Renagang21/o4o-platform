# 커뮤니티 섹션 초기화면

> 상태: IN_PROGRESS · 작성일: 2026-10-19 · 사용자 승인: 구현·push·merge·deploy

## 확정 화면 및 TODO

- [x] 최신 main·정본·기존 코드 조사: 독립 community 서비스, 기본 회원 전용, Operator 일상 운영·Admin 민감 조치 유지.
- [x] 문제 확정: 홈은 회원 Workspace를 내장하고, 기존 콘텐츠·자료실·공지는 Neture API/원장에 의존한다.
- [x] 공지와 약사공론 뉴스를 같은 행에 배치(모바일 순차).
- [x] 포럼 → 콘텐츠 → 자료실 순서로 실제 항목 미리보기·바로가기 제공.
- [x] 각 섹션: 상시 노출 최대 2개 + 최근 10개, 중복 제외. 상시 노출이 없으면 최근 항목만 표시.
- [x] 커뮤니티 전용 CMS 귀속·목록·상세·Operator 편집/게시·비공개·상시 노출 및 순서 관리.
- [x] 포럼은 기존 게시글/공개 지정 경계를 재사용. 게시판 내부 고정과 첫 화면 지정을 분리하고, 예약 CMS forum-pin 행은 현재 Operator만 변경.
- [x] 뉴스는 약사공론 HTTPS 원문 링크만 등록. 자동 수집/본문 복제 없음.
- [x] Hero·광고는 주요 섹션 아래 보조 영역에 유지. 뉴스 본문 입력·저장을 차단.
- [x] 운영 목록 페이지 이동으로 200개 초과 항목 조회·편집·게시 중지 가능.
- [x] 로딩·실패·빈 목록 및 비로그인·승인 회원·운영자 경계 테스트.
- [x] PC/모바일 브라우저·빌드·focused 테스트·문서 검증.
- [ ] push·PR CI/리뷰·main 병합·API/웹 배포·공개 smoke 및 종료 기록.

## 구현 경계

- `cms_contents`의 기존 serviceKey/metadata/isPinned/sortOrder 필드 사용. DDL·migration·기존 데이터 이전·seed 없음.
- community 전용 편집 항목은 metadata.section=`community-editorial`; 공통 CMS에서 제외하여 전용 API의 공개/회원 정책을 우회하지 못하게 한다.
- CMS 유형: notice(공지), featured(콘텐츠), knowledge(자료), news(외부 뉴스). 데이터는 serviceKey=community, organizationId=null에 고정.
- 기본 열람은 회원 전용. Operator가 명시적으로 공개 지정한 게시된 항목만 비로그인에게 공개. 미리보기와 상세에 동일 조건 적용.
- 포럼 첫 화면 지정은 예약 CMS `kind=forum-pin` 행으로 저장한다. 회원/게시판 소유자가 기존 `isPinned`를 바꾸어도 첫 화면 지정에 영향이 없다. 중지·삭제된 글의 지정도 해제할 수 있다.
- 포럼 원장과 CMS 편집 항목은 별개다. 기존 forum 공개 지정·회원 경계·중지 게시판 제외를 재사용한다.
- 완전 삭제는 추가하지 않는다. Operator는 초안/게시/보관과 노출을 운영한다.
- 공통 CMS/HUB/Frozen DTO·entity·다른 서비스 화면 계약은 변경하지 않는다. 예약 metadata 제외만 전용 원장 보호에 확장한다.

## 근거

- [역할 정본 §5](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md#5-community-workspace)
- [진입 정책 §5](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md#5-서비스-진입로그인문의-정책)
- [콘텐츠 안정화 경계](../baseline/CONTENT-STABLE-DECLARATION-V1.md)
- 기존 `CommunityHostHomePage`, `CommunityWorkspacePage`, `ForumHubPage`, `CommunityPublicPostsPage` 및 `ContentQueryService`, `cms-reserved-presentation` 조사.

## 코드·문서 검증 결과

- 커뮤니티 API 4 suites / 56 tests PASS(격리 PostgreSQL 9 tests 포함). CMS·공개 노출·slot·변경 scope·presentation 회귀 5 suites / 108 tests PASS.
- web-neture 전체 131 files / 1155 tests PASS(뉴스 본문 입력 제외 테스트 포함).
- API type-check 및 API tsup build PASS, web-neture TypeScript + Vite production build PASS(기존 chunk 크기 경고).
- PC 1440px / 모바일 390px: 공지·뉴스 같은 행/모바일 순차, 포럼→콘텐츠→자료실, 가로 넘침 없음. Operator 진입·목록 페이지 왕복·폼 작성·상시 노출·공개 선택·저장 요청·성공 표시 PASS. 브라우저 응답은 격리 fixture이며 실제 운영 계정 검증과 구분한다.
- 로컬 ESLint 및 SonarJS recommended/cognitive complexity 15 검사 PASS. 억제 주석·기준 완화 없음.
- docs 민감정보 검사 PASS. 기존 가입/제재 테스트는 제거하지 않고 실제 참여 Workspace를 계속 검증하도록 이동했다.
- 공통 소비처: CMS query/mutation/slot/engagement, ContentQueryService, HUB의 예약 metadata 제외를 확인했다. 기존 home-presentation 예약은 유지하고 community-editorial만 추가 제외한다. 다른 서비스 원장은 이전하지 않는다.
- 환경: onboarding 스킬에 따라 기존 체크아웃·도구 재사용, 완료된 이전 worktree 대신 독립 clone에서 최신 origin/main 기반 작업. package.json·lockfile·CI·DDL 변경 없음.
- 실제 계정 SSOT 파일은 작업·기준 체크아웃 모두 없음. 운영자 구글 로그인 실사용 검증은 미실행. 운영 DB 테스트 데이터 생성·삭제 없음.

## 배포

- DEPLOYMENT=REQUIRED(API·web-neture). CI 및 검토 후 main PR 병합, 현재 Delivery 정책으로 실행·서빙 결과 확인 예정.

## PR 검토 보완

[PR #711](https://github.com/Renagang21/o4o-platform/pull/711) 초기 자동 검토 3건을 반영했다: 게시판/작성자가 조작할 수 있는 isPinned와 첫 화면 상시 지정을 분리, 뉴스 본문 입력·저장 거부, 기존 Hero·광고의 주요 섹션 아래 공개 소비 유지. PostgreSQL에는 원장 격리·일반 고정 우회 차단·대문자 ID 정규화·비공개 보호·중지 후 해제 회귀를 포함했다. 최종 HEAD의 CI·재검토·배포 결과는 PR 기록에서 확인한다.

추가 검토의 운영 목록 200개 절단 문제는 20개 단위 페이지·hasNext·이전/다음 조작으로 해결했다. 205개 fixture의 마지막 페이지 조회·편집·게시 중지와 PC/모바일 목록 왕복·저장을 검증했다.

공통 CMS 예약 조건식은 기존 `c.`/`cms.` 접두사 소비자와 호환되도록 단일 컬럼 참조 및 `IN (...) IS NOT TRUE`를 사용한다. section 누락/JSON null·일반 항목 포함, 두 예약 종류 제외, metadata 컬럼이 함께 있는 JOIN의 별칭 조회를 PostgreSQL에서 검증한다.

별칭 호환 보완 후 커뮤니티·CMS 통합 9 suites / 164 tests PASS(격리 PostgreSQL 9 tests 포함). API type-check·tsup build·ESLint·SonarJS·docs 검사 PASS.
