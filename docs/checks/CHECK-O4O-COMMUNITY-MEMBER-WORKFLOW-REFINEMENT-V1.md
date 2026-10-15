# 개별 커뮤니티 회원 운영 흐름 정비 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: [회원 운영 정비 WO](../work-orders/WO-O4O-COMMUNITY-MEMBER-WORKFLOW-REFINEMENT-V1.md)

## 변경과 영향 소비처

조사 기준은 `origin/main` `09e08d97d`이며 전용 `wo/community-member-workflow-refinement`에서 개발한다.
`MyCommunityOperatorPage`의 패널을 내부 `community-members` 모듈로 분리했다.
화면 경로는 `/mypage/communities`, 공식 관리 호스트는 community.neture.co.kr이다. 기존 HostBoundary의 대표 호스트 전달 동작은 바꾸지 않았다.

| 책임 | 소유 모듈 | 유지 계약 |
|---|---|---|
| 운영 커뮤니티·사용자별 표시 | MyCommunityOperatorPage | `/communities/operating`, 사용자 변경 시 패널 재생성 |
| 회원 목록·검색·상태·페이지 | useCommunityMemberList | 같은 필터/페이지 요청, 이전 응답 무시, 서버의 유효 페이지 보정 |
| 입력·심사·제재·성공/실패 | useCommunityMemberActions / memberWorkflow | 기존 승인·반려·정지·해제·탈퇴 경로와 사유 계약 |
| 변경 이력 조회·재시도 | useCommunityMemberHistory | 같은 대상의 기존 history API, 권한·조회 범위 유지 |
| 입력·결과·이력 표시 | CommunityMembersPanel | 대상/행동 명시, 선택/필수 사유 구분, 실패 입력 보존 |
| 행별 행동 표시 | CommunityMemberTable | 서버 canRestrictMembers 기반, 기존 승인 자격 안내 |

루트 화면은 279줄에서 107줄로 줄었으며 길이 자체가 완료 기준은 아니다. 단일 패널의 조회·prompt·mutation·이력 코드가 각 책임 모듈에 분리됐다.
다른 서비스 공통 hook·공통 UI·API client의 exports·서버 route·권한·상태 전이·DB/schema는 수정하지 않았다.
개별 operator는 조회/심사, admin은 기존 제재/이력 범위까지 사용한다. 작성 중 제재 권한이 회수되면 해당 입력을 닫으며 서버 판정을 대체하지 않는다.

## 실패·동시성 판정

- 반려/제재 실패 후 대상·사유가 유지되고 입력을 고치거나 동일 입력으로 재시도할 수 있다. 반려 사유는 선택, 제재 사유는 1~1000자다.
- 처리 중뿐 아니라 처리 후 목록/운영 목록 갱신이 끝날 때까지 중복 mutation을 동기 ref로 차단한다.
- 성공 후 회원/운영 목록 갱신 실패는 별도 안내이며 성공 notice를 유지한다. 재조회 버튼은 mutation을 재전송하지 않는다.
- 마지막 페이지 보정 이후에도 처리 대상과 결과 안내가 사라지지 않는다. 기존 검색은 유지한다.
- 커뮤니티·사용자·목록 필터 전환과 unmount 이후의 늦은 응답을 적용하지 않는다.
- 이력 대상·로딩·행동·전후 상태를 표시한다. 이력 실패는 이력만 다시 조회하며 닫기/다른 대상/권한 갱신 이후 응답은 버린다.
- 마지막 유효 admin 보호, 다른 커뮤니티 경계, 서비스 operator의 제재 차단은 기존 서버 테스트로 회귀 검증한다.

## 검증 명령과 증거

전용 worktree에서 Node 22.18.0/pnpm 10.25.0으로 frozen-lockfile 설치와 `build:packages`를 수행했다. lockfile 변경은 없다.

- 프런트: `pnpm exec vitest run --config services/web-neture/vitest.config.mjs`에 MyCommunityOperatorPage, CommunityServiceAdminPage/roles, CommunitySelfWithdrawal, CommunityWorkspacePage.withdrawal 5파일을 지정한다. **5 files / 72 tests PASS (회원 운영 화면 46건 포함)**.
- API: `apps/api-server`에서 `pnpm exec jest --config jest.config.cjs --runInBand --runTestsByPath`로 community-member-management, community-lifecycle, community-role-validity, community-operator-designation, community-scope.boundary, communities.routes 6파일을 실행했다. **6 suites / 183 tests PASS**. runner의 기존 forceExit 설정을 유지했다.
- `pnpm --filter @o4o/web-neture build`: TypeScript 검사와 production build PASS. 기존 bundle 크기·Browserslist 경고가 있으며 이번 범위에서 dependency/lockfile을 변경하지 않는다.
- 변경 TypeScript/TSX의 ESLint PASS. 문서 민감정보 검사 3파일·`git diff --check` PASS.

## 브라우저 검증과 한계

production build를 로컬 Vite preview로 제공하며 Chromium의 route interception으로 공식 관리 호스트의 HTML/assets를 로컬 파일에서 응답했다.
API·인증은 모든 요청을 브라우저에서 격리 fixture로 처리했다. 실제 운영 API·실계정·DB·OAuth를 호출하거나 변경하지 않았다.
검증 사용자/회원 이름과 토큰은 fixture이며 실제 테스트 계정의 대체 로그인 증거가 아니다.

PC 1440×900와 모바일 390×900에서 각각 다음 8개 흐름 PASS:
반려 실패/사유 보존/재시도, 저장 성공 후 목록 실패/재조회, 마지막 admin 거부 메시지와 사유 보존,
정지, 정지 해제, 관리 탈퇴 범위 안내, 이력 실패/대상별 재시도/전후 상태, operator의 제재·이력 버튼 숨김.
각 화면 pageerror 0, 문서 전체 가로 넘침 0. 표 내부의 가로 스크롤은 유지한다.
마지막 admin의 실제 보호 판정은 앞선 서버 테스트로 검증했고 브라우저 fixture는 거부 응답의 UX만 확인한다.
권한 회수 입력 정리 보완 이후 최종 소스의 production 재빌드와 같은 브라우저 검증도 PASS.

## 인계와 제외 범위

main 병합·운영 배포는 통합 담당에게 인계한다. Neture 프런트 변경이며 API 배포나 새 migration은 요구하지 않는다.
실제 deployment 대상·등급·skip 여부는 현재 Delivery의 affected 판정과 required CI로 통합 담당이 확인한다.
신고/소유자 승계/이력 자동 삭제/새 정책/서비스 간 공통화, 약사회 분회, 강의 PR #587 및 수료증 폐기 사유 보관은 제외한다.
GitHub API는 환경의 api.github.com 정책 차단으로 조회/PR 생성이 미확인이다. 허용 도메인 초안만 저장됐으며 runtime 적용·게시를 뜻하지 않는다.

## 최종 개발 검증·인계 (2026-10-15)

검증 중 `origin/main`이 `761fb49e3`(#595)으로 이동했다. 새 main에는 앞선 강의 #587과 펀딩 정비가 포함됐다.
자기 변경을 commit한 뒤 아직 push하지 않은 자기 branch를 해당 main 위로 rebase했다.
충돌은 공통 TODO 1파일뿐이며 새 main의 강의/펀딩 완료 기록 전부와 이번 커뮤니티 항목을 함께 보존했다.
다른 branch/worktree나 main 이력은 수정하지 않았다. 코드의 충돌·신규 dependency/lockfile 변경은 없다.

최신 기준에서 프런트 5파일 72건(회원 운영 46건), Neture TypeScript/production build와 Chromium PC/모바일의 각 8개 흐름이 다시 PASS했다.
pageerror·문서 가로 넘침 0, mutation 재전송 없이 목록 재조회 복구를 확인했다. API의 관련 소스·6개 테스트는 main 이동에서 변하지 않아 기존 183건 PASS를 유지한다.
문서 민감정보 3파일과 diff 검사, 변경 TypeScript/TSX ESLint PASS다.

구현 commit `518feb511`을 `origin/wo/community-member-workflow-refinement`에 정상 push했다.
`gh pr create --base main --head wo/community-member-workflow-refinement --body-file ...`는 api.github.com GraphQL 요청의 403 Forbidden으로 실패했다.
PR 생성과 필수 CI 상태는 확인하지 못했다. PR title/body는 준비했으며 아래 링크에서 생성할 수 있다.

[PR 생성 화면](https://github.com/Renagang21/o4o-platform/pull/new/wo/community-member-workflow-refinement)

환경 설정의 api.github.com 허용 초안은 저장됐으나 현재 runtime의 적용은 확인되지 않았다.
설정 변경을 저장·Publish한 후 API 접근을 다시 확인하고 PR 생성·필수 CI 조회를 재개한다. Git read/push 인증은 현재 HTTPS proxy로 정상 동작한다.
추가 토큰은 요청하지 않았으며 domain 차단 해소가 GitHub API 인증/권한까지 보장하지는 않는다.

`WORKTREE_DISPOSITION`: 전용 worktree/branch KEEP. 이번 작업 변경·untracked 0을 확인한 뒤 인계하며 다른 작업공간은 정리하지 않는다.
main 통합·운영 배포·실계정 검증은 미실행이다. 개발 코드와 원격 branch는 보존됐고 외부 차단으로 PR 인계만 남는다.

## GitHub API 복구와 PR 생성 (2026-10-15)

사용자 재시도 요청에 따라 runtime 정책과 실제 GitHub API를 재확인했다. api.github.com 허용이 반영됐고 같은 branch의 기존 PR이 없음을 확인한 후 [PR #605](https://github.com/Renagang21/o4o-platform/pull/605)를 생성했다.
이전 403 차단은 해소됐으며 추가 토큰 없이 기존 인증으로 동작했다.
최초 조회 HEAD는 `3be2f3ba6578de015617ee6b72c05689f5d3656d`, OPEN·MERGEABLE이다.
[CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38667990768), CodeQL, Guard는 시작됐으며 최종 PASS로 보고하지 않는다.

인계: 최신 PR HEAD의 필수 CI·리뷰·미해결 thread·main 대비 위치를 확인한 뒤 통합 담당이 정상 병합·Delivery 판정·필요한 Neture 배포를 진행한다.
이 공간에서는 merge·auto-merge·배포를 실행하지 않았다. 기존 로컬 개발 검증 결과는 유지하며 이번 후속 변경은 문서뿐이다.
worktree/branch는 후속 review 대응을 위해 KEEP이다. 위의 PR 미생성·domain 차단 기록은 당시 상태다.
