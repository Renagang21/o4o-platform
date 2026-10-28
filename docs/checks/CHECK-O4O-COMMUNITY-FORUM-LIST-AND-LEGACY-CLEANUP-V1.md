# CHECK — 커뮤니티 포럼 목록·레거시 정리 V1

- 상태: ACTIVE
- 작성일: 2026-10-28
- 최초 기준 main: `7322f3897d` · 후속 통합 기준: `188da14235` (#867)
- 작업: [TODO](../work-orders/TODO-O4O-COMMUNITY-FORUM-LIST-AND-LEGACY-CLEANUP-V1.md)
- 현행 안내·삭제 판정: [가이드](../guides/O4O-COMMUNITY-CURRENT-IMPLEMENTATION-V1.md)
- 종료 범위: main 병합 전. 배포·운영 데이터 변경 미실행.

## 재현·변경

기존 화면은 첫 20건을 받은 뒤 유형을 골라 검색 결과·전체 페이지로 취급했다.
합성 40건 중 뒤 20건이 질문인 경우 검색+질문 필터가 0건으로 표시되고 다음 페이지가 사라졌다.
유형만 고르면 별도 고정 표는 숨기면서 일반 표에서도 고정 글을 제거해 일치하는 글이 누락됐다.
기본 목록도 고정 5건을 넘는 글이나 다음 페이지의 고정 글을 제거했다.
고정 글만 있는 페이지에서 글이 보이면서도 전체 빈 목록 안내가 나오는 경계 문제도 재현해 보완했다.

새 회귀 8건(API 3범위·화면 5흐름)이 수정 전 실패하고 수정 후 통과했다.
서버의 기존 type/isPinned query를 전달하고, 서버의 필터·건수·페이지 응답을 그대로 사용한다.
고정 표는 같은 응답에서 표시만 분리하여 중복 조회·후처리 누락을 없앴다.
고정 표 최대 5개를 제외한 글은 일반 표에서 유지하며, 유형 필터·다음 페이지의 고정 글도 보인다.

## 최신 모집단·참조 재검사

import·route·export·문자열(테스트/스크립트 포함)과 문서 코드 경로를 조사했다.
삭제 전 CommunityPage의 유일 import/mount는 App의 /community였고,
그 주소는 decideHost에서 모든 host profile의 canonical community forum으로 먼저 전달된다.
공개 광고/스폰서 communityApi export는 호출자 0이며 관리 export는 공통 콘솔이 사용한다.
fetchPinnedPosts의 유일 호출자는 ForumPage였고 단일 목록 조회로 대체 후 helper를 삭제했다.
삭제 후 위 실행 symbol·파일 import의 잔존 참조는 0이다. 과거 문서의 코드 경로는 당시 증거로 유지한다.

실제 route·공통 콘솔·정적 채택 계약이 있는 관리 wrapper, 현재 access를 쓰는 My Home adapter,
공통 Forum과 사업/펀딩 공간, retired 원장 차단/예약 키는 보존했다.
API 변경 파일 3개는 폐기된 개체 모델을 설명하던 주석만 현행화했으며 실행 코드는 바꾸지 않았다. TypeScript의 주석 제거 후 emit 결과도 기준 main과 동일함을 확인했다.
DB 테이블·migration·운영 삭제 도구·법정/감사 자료는 삭제하지 않았다.

과거 개별 모델 문서 10개에는 현행 가이드와 정책으로 연결하는 SUPERSEDED 안내를 추가했다.
기존 본문·당시 상태·검증·배포 결과는 덮어쓰지 않았다.

## 로컬 검증

- Neture 전체 168개 파일 / 1,436 tests PASS(새 화면 5개·API 3개·주소 전달 5개 포함).
- 최종 집중 검사 3개 파일 / 73 tests PASS.
- 보존한 운영 콘솔 채택 계약 6 tests PASS.
- 서버의 기존 type/isPinned·역할 카탈로그·서비스 의미 계약: API Jest 3 suites / 29 tests PASS.
- Neture TypeScript 및 production build PASS. Vite의 기존 큰 chunk/Browserslist 경고는 범위 밖.
- 변경 코드 ESLint 및 diff 공백 검사 PASS.
- 실제 수정 목록·공통 UI·production CSS + 모의 API의 Playwright: 1440px·390px 각각 검색+유형,
  유형에 일치하는 고정 글, 고정 25개 포함 40건의 다음 페이지 이동 및 고정 글만 있는 안내 등 8개 시나리오 PASS.
  화면 넘침 0, page error 0, 업무 데이터 write 0. 운영 회원·관리자 상태 변경 검증이 아니다.
- 유형 pill 전환 테스트에서 기존 border/borderColor 스타일 경고가 관측되며 검증은 통과했다.
- 현재 PR의 CI·Codex 결과는 최신 HEAD의 PR 체크와 설명을 기준으로 확인한다.

## 미실행·보존

운영 가입·승인·글쓰기·중재·초기 콘텐츠 게시 및 AI 호출은 수행하지 않았다.
주문 상세·출고·공급자 격리의 앞선 보류 검수는 이 작업으로 다시 열지 않는다.
main 미병합 상태에서는 후속 통합을 위해 전용 branch/worktree를 보존한다.

## 최신 main 반영

개발 중 #867의 통합 회원·중앙 운영 정책이 main에 반영되어 충돌 없이 정상 merge했다.
운영 책임과 일반 가입 안내를 V2에 맞춰 보완했다. 일반 커뮤니티 참여에는 별도 가입 승인 일괄 조건을 붙이지 않고,
명시적 서비스 제재·사업/조직·전문 자격·운영 API membership은 기존 서버 계약을 유지한다.
중앙 Google·직영 위임과 단순 서비스 역할은 구분한다. #867의 migration/lockfile은 이미 main에 속한 변경으로
이번 PR의 추가 변경이 아니며, 운영 실행은 수행하지 않았다. 최신 main 반영 후 Neture 전체 169개 파일 / 1,439 tests, TypeScript·production build,
API 계약 3 suites / 29 tests, 콘솔 채택 6 tests가 다시 통과했다.
브라우저 검증한 ForumPage·forumApi·shared-space-ui·ui 소스는 통합 전후 차이 0이다.
최종 PR CI·리뷰 결과는 최신 HEAD의 PR 설명에 기록한다.

### V2 일반 참여 UI 잔재

최신 resolver의 현행 모든 공간이 canJoin=false인데도 Workspace의 예전 서비스 가입 폼·정책 조회·가입 POST와
공개 화면의 가입 승인 안내가 남아 있었다. 해당 client 경로를 제거하고 공통 로그인/현재 자격 확인으로 안내한다.
서비스 정지·탈퇴, 계정 부적격, 사업 자격과 중앙 운영 경계는 그대로 유지한다. 서버의 응답·호환 API는 바꾸지 않았다.
예전 별도 가입 신청/대기/재시도 테스트는 공통 계정, 과거 pending/rejected, 비로그인, 부적격,
정지/탈퇴, 운영자 표시의 현재 계약으로 대체했다. 최종 검증 결과는 PR의 최신 HEAD를 따른다.

V2 잔재 정리 후 Neture 전체 169 files / 1,441 tests와 TypeScript·production build가 통과했다.
공통 참여 서버 계약 23 tests 및 client Workspace 관련 15 tests가 통과했다.
실제 Workspace에 모의 인증·접근 응답과 하위 화면 경계를 주입한 로컬 Playwright는
1440px·390px에서 common/pending/rejected/guest/suspended/withdrawn/inactive 14개 시나리오가 통과했다.
가입 폼 재노출 없음, 업무 write 0, page error·화면 넘침 0이며 실제 OAuth·운영 계정 검증과 구분한다.
