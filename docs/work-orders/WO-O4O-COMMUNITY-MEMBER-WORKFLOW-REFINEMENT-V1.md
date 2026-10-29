# 개별 커뮤니티 회원 운영 흐름 정비

> **상태**: SUPERSEDED · **대체 문서**: [커뮤니티 현행 구현 안내](../guides/O4O-COMMUNITY-CURRENT-IMPLEMENTATION-V1.md) · **표기일**: 2026-10-28
> 업종별 카탈로그·개별 커뮤니티 가입/운영 모델은 현행 요구사항이 아니다. 아래 상태·본문·실행 결과는 당시 이력으로 보존하며, 재사용되는 공통 기능은 대체 문서의 판정을 따른다.

> **상태**: ACTIVE
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: 사용자 운영자 정비 후속 요청 · [전체 TODO](WO-O4O-OPERATOR-CODE-REFINEMENT-TODO-V1.md)

## 범위와 유지 계약

최신 `origin/main` `09e08d97d` 기준에서 독립 커뮤니티의 회원 조회·가입 승인/반려·정지/복구/관리 탈퇴·변경 이력 흐름을 정비한다.
[역할 정본 §5](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)의 개별 admin/operator와 중앙 community 역할, 현재 API·상태 전이·마지막 유효 admin 보호를 유지한다.
개별 operator는 조회·심사만, admin은 기존 제재·이력 범위까지 처리한다. 공통 계정·서비스 가입·다른 커뮤니티의 원장은 변경하지 않는다.
약사회 분회, 신고·소유자 승계·이력 자동 삭제·서비스 간 공통화와 새 정책·DB 변경은 제외한다.
강의 PR #587과 수료증 폐기 사유 서버 보관은 별도 트랙이며 이번 diff에서 수정하지 않는다.

## 조사와 보완 TODO

실제 소비처는 Neture의 `/mypage/communities` (`MyCommunityOperatorPage`)이며 현재 HostBoundary의 공식 관리 호스트는 community.neture.co.kr이다. 대표 호스트의 진입은 해당 호스트로 전달된다.
기존 개별 커뮤니티 API 및 서버 member-management/lifecycle/scope 테스트를 재사용한다. 게시판 소유자의 회원 관리와 사업 회원 포럼은 별개다.
현재 화면의 prompt는 실패 사유를 보존하지 못하며, 이력 대상·로딩 표시가 없고 이력 조회 실패의 재시도가 회원 목록을 조회한다.
조회 이후 페이지 보정으로 notice를 초기화하는 문제, 성공 후 목록/운영 목록 갱신 실패와 처리 실패의 혼동도 점검한다.

- [x] 회원 조회·필터·페이지와 처리·이력 책임을 내부 모듈로 분리.
- [x] 대상·행동·사유를 표시하고 실패/취소/재시도 구분. 반려 사유 선택·제재 사유 필수 유지.
- [x] 동기 중복 실행 잠금·조회 수명·커뮤니티/사용자 전환·늦은 응답 방어.
- [x] 처리 성공 후 재조회 실패를 분리하며 저장 성공 안내 유지. 현재 검색과 페이지 보정 유지.
- [x] 이력 대상·행동·전후 상태 표시, 독립 재시도·닫기·늦은 응답 방어.
- [x] 기존 API·권한·마지막 admin 보호 회귀, 화면 tests·타입·build·ESLint·PC/모바일 격리 fixture 검증.
- [x] 전체 TODO·CHECK 정합, commit/push 완료.
- [x] PR #605 생성·CI 실행 상태 확인·통합 담당 인계. 필수 CI 최종 PASS와 병합/배포는 통합 담당이 확인한다.

## 실행 경계

전용 worktree `/workspace/o4o-wt/community-member-workflow-refinement`, branch `wo/community-member-workflow-refinement`에서 진행한다.
운영 DB·실계정·역할을 변경하지 않으며 사용자 테스트 계정 파일이 없으므로 브라우저 검증은 격리 fixture를 사용한다.
개발 담당 종료점은 push·PR이며 main 병합·운영 배포는 이번 공간에 부여되지 않았다.
GitHub API 도메인 차단은 환경 설정 초안으로 추가하되 실제 접근 재검증 전 PR 생성 가능으로 보고하지 않는다.

## 개발 검증 결과

회원 운영 화면 46건 포함 관련 프런트 72건, 기존 API·권한/계약 183건 PASS.
공통 packages와 Neture TypeScript/production build, 변경 파일 ESLint·문서 민감정보·diff 검사 PASS.
production build/격리 API 응답으로 PC 1440·모바일 390에서 각각 8개 운영 흐름 PASS, pageerror·화면 가로 넘침 0.
실계정·운영 API/DB 검증은 하지 않았다. 세부 증거·잔여 인계는 [CHECK](../checks/CHECK-O4O-COMMUNITY-MEMBER-WORKFLOW-REFINEMENT-V1.md)에서 구분한다.

최종 기준 `761fb49e3`의 강의·펀딩 기록을 보존하며 전용 branch를 동기화했고 프런트 72건·Neture 타입/빌드·PC/모바일 검증을 재확인했다.
구현 `518feb511` push 완료, PR 생성은 실제 시도했으나 GitHub API 정책 403으로 실패했다. 코드 구현 완료와 PR/CI·main·운영 미완료를 구분한다.
환경 설정의 api.github.com 허용 초안을 저장·Publish한 뒤 PR 생성을 재개한다. [CHECK의 최종 인계](../checks/CHECK-O4O-COMMUNITY-MEMBER-WORKFLOW-REFINEMENT-V1.md#최종-개발-검증인계-2026-10-15)를 따른다.

## GitHub 접근 복구·PR 인계 (2026-10-15)

사용자 재시도 요청 후 현재 runtime에서 api.github.com 허용과 실제 GitHub API 접근을 확인했다.
[PR #605](https://github.com/Renagang21/o4o-platform/pull/605)를 생성했으며 최초 확인은 OPEN·MERGEABLE, CI Pipeline/CodeQL/Guard 실행 중이다.
이전 403 차단은 해소됐다. 필수 CI의 최종 통과·리뷰 결과 확인과 main 병합·Neture 배포는 통합 담당에게 인계한다.
이번 공간에서는 merge/auto-merge/배포를 실행하지 않았다. 앞선 차단 기록은 당시 상태다.
