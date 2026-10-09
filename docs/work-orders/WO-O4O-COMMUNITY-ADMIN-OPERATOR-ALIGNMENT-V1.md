# 커뮤니티 서비스 admin·operator 정비 TODO

> **상태**: IMPLEMENTED (최종 CI·통합 상태는 PR 최신 HEAD 참조)
> **작성일**: 2026-10-09 · **최종 갱신**: 2026-10-09
> **근거**: 사용자 지시 — 회원관리 후속 작업 전에 커뮤니티 운영자 구조부터 정비

## 목표·경계

`admin.neture.co.kr`에서 커뮤니티 서비스의 `community:admin`과 `community:operator`를
지정·변경·해제할 수 있게 한다. 서비스 전체 역할과 개별 커뮤니티의
`community_memberships.role`은 별도 축으로 유지한다.
다른 서비스와 같은 admin/운영 역할 계층을 사용하되, 실제 현재 기능을 조사해
구조 관리와 운영 조회의 경계를 정한다. 회원관리·콘텐츠 기능 전체를 새로 확장하지 않는다.
운영 DB 변경·migration 적용·main 병합·배포는 별도 승인 대상이다.

## TODO

- [x] 최신 main 기준 전용 worktree·branch 및 지침 확인
- [x] 작업 범위·조사 기준·TODO 작성
- [x] 중앙 지정 화면·서버 카탈로그·역할 저장·membership 생성 조사
- [x] community 서비스 접근·개체 운영자 지정·메뉴·API 역할 판정 조사
- [x] admin·operator의 역할별 기능표 및 최소 수정 계획 확정
- [x] 중앙 지정·변경·해제 양쪽 카탈로그 정비
- [x] 서비스 운영 접근·구조 변경 제한·개체 범위 유지 정비
- [x] 지정·강등·해제·다른 서비스 차단·개체 권한 회귀 테스트
- [x] 관련 UI/API 테스트·타입 검사·빌드·화면 동작 확인
- [x] 문서 정합·커밋·push·PR 준비 및 필수 CI 확인 경로 정리

## 조사 기준

화면 → API → 서버 역할 판정 → role_assignments 및 membership 저장을 연결한다.
서비스 admin/operator만으로 개별 커뮤니티 운영권이 자동 발생하는지,
개체 운영자만으로 서비스 전체 권한이 생기는지 양방향으로 확인한다.
정상 기능은 유지하고, 역할 선택지만 추가한 채 API가 거부하는 상태를 만들지 않는다.

## 선행 작업 관계

회원관리 경계 수정 PR #371은 구현·CI 완료 상태이나 아직 main 미병합이다.
이 작업은 최신 main에서 독립 수행한다. 자동 리뷰 후 역할 회수 즉시성·공통 회원 API 운영 scope의 필수 보완을
이 브랜치에도 포함하여 PR #371의 선행 병합 없이 두 권한 경계가 동작하도록 했다.

## 조사 결과·역할 표

중앙 UI/서버 allowlist와 커뮤니티 서비스 가드가 admin만 제공했고,
서비스 운영 페이지에 조회·구조 변경이 함께 들어 있었다.
서비스 role_assignment 저장은 namespaced 문자열이며 별도 schema/seed 없이 기존 지정 경로로 저장 가능하다.
`service_memberships('community')`의 기존 status는 지정 시 덮어쓰지 않는다.
서비스의 일반 회원 자격과 `community_memberships` 개체 운영 역할은 서로 대체하지 않는다.

| 실제 현재 기능 | service admin | service operator | 개체 operator |
|---|---|---|---|
| 서비스 커뮤니티·active 회원·개설 신청 현황 조회 | 허용 | 허용 | 서비스 역할 없으면 불가 |
| 개설 승인·거절 | 허용 | 차단 | 불가 |
| 개별 커뮤니티 운영자 지정·해제 | 허용 | 차단 | 서비스 역할 없으면 불가 |
| 개별 가입 승인·내부 운영 | 별도 개체 지정 필요 | 별도 개체 지정 필요 | 해당 개체만 |
| 공통 서비스 회원관리 API | 기존 허용 | 다른 서비스와 동일한 운영 scope로 허용 | 서비스 역할 없으면 불가 |

공통 회원관리 역할 등급의 세부 업무 차이는 선행 회원관리 작업의 미정 정책을 유지한다.
전체 admin/operator 계층은 같은 scopeRoleMapping으로 명시하고, POST 구조 변경 가드는 admin을 유지한다.
신규 route·콘텐츠 관리 기능·개체 권한 우회는 추가하지 않는다.

## 로컬 검증 기록

- 커뮤니티 가드·라우트·lifecycle·중앙 지정·기존 개체 운영 경계 Jest: 8 suites / 134 tests PASS.
- 추가 강등·해제·개체 역할 비승격 및 기존 서비스 workspace 회귀: 3 suites / 58 tests PASS (앞 집합과 일부 중복).
- Neture 서비스 화면·가드·메뉴·대표 홈 진입 Vitest: 4 files / 71 tests PASS.
- Admin 실제 지정 모달·서버/UI 카탈로그 일치 Vitest: 2 files / 10 tests PASS.
- API·Admin 타입 검사, 공통 패키지 전체·Neture·Admin production 빌드 PASS.
- Chromium 모의 API browser smoke: admin/operator × desktop(1440)·mobile(390) 4개 경우 PASS.
  커뮤니티 선택·회원 조회·개설 신청 조회와 역할별 버튼 노출을 확인했고 pageerror 0건.
- unsafe route·문서 민감정보·`git diff --check` PASS.

브라우저 smoke는 로컬 빌드와 모의 응답을 사용했다. 실제 운영 인증·운영 데이터 쓰기는 미실행이다.
중앙 계정의 권한 해제 즉시성은 아래 리뷰 수정으로 이 브랜치에서도 보장한다.
회원관리 세부 정책 미정 항목은 새 정책으로 확정하지 않았다.
문서 정합: RBAC 카탈로그·역할별 업무공간 정본에 서비스 admin/operator와 개체 권한 분리를 반영했다.
과거 WO/IR 기록은 재작성하지 않았다.

## Git·완료 경계

작업 브랜치: `wo/community-admin-operator-alignment`.
main 병합·배포는 수행하지 않으며 PR 미병합 동안 worktree는 KEEP한다.
최신 main 동기화 후 영향 테스트를 재검증하고 commit/push한다.
필수 CI 및 최종 PR 상태는 최신 HEAD 기준으로 별도 확인한다.

## 전달 기록

최신 main `3d5f4349ad`로 동기화한 코드 커밋 `dc6ff177d5`를 작업 브랜치에 push했다.
동기화 후 Neture 전체 Vitest 46 files / 377 tests PASS.
최종 PR 생성 후 최신 HEAD의 필수 `CI Gate`·자동 리뷰 blocker·작업트리 상태를 확인한다.
CI 결과는 저장소 PR 최신 HEAD 기준으로 보고하며 main 통합은 별도 승인 전 수행하지 않는다.

## 자동 리뷰 P1 두 건 수정

첫 리뷰는 미병합 PR #371에 대한 의존성을 확인했다. 별도 PR의 선행 병합만을
가정하면 커뮤니티 역할 강등·서비스 격리가 안전하지 않으므로 이미 검증한 필수 보완을
이 브랜치에도 포함했다. PR #371의 나머지 회원 목록·상세 조회 및 화면 경계 정비는 별도 유지한다.

- `requireAuth`·`requirePlatformUser`·`optionalAuth`는 DB의 최신 활성·유효 역할을 사용한다.
  역할 조회 실패 시 JWT 이전 권한으로 fallback하지 않는다.
- 공통 회원관리 라우터는 `injectOperatorServiceScope`로 서비스 admin/operator가 지정된 서비스만 허용한다.
  다른 서비스의 store_owner·일반 membership으로 회원관리 scope가 넓어지지 않는다.
- 같은 community admin token으로 DB 역할을 operator로 변경한 뒤 admin 경로 거부,
  operator 경로 허용, KPA store_owner 역할 혼재 시 community scope만 유지,
  community 역할 해제 후 접근 및 운영 scope 제거를 회귀 테스트했다.
- 리뷰 수정 보안 Jest 7 suites / 135 tests, API 타입 검사 PASS.

이 인증 보완은 일반 인증 경로 공통 적용이며 요청당 역할 DB 조회가 한 번 필요하다.
운영 DB의 응답 지연·부하 관측은 배포 후 과제다. 사용자별 로그인 재발급을 기다려
권한이 회수되는 동작은 허용하지 않는다.

## 회원 변경 대상 서비스 경계 보완

공통 회원 API의 운영 scope 제한에 더해 실제 변경 대상 서비스도 검증했다.
- 회원 유형 변경은 대상 서비스 권한과 해당 회원의 서비스 소속을 프로필 쓰기 전에 확인한다.
- 서로 다른 serviceKey/membershipServiceKey 요청은 거부한다.
- 상태 변경·일괄 변경·재활성화·탈퇴는 지정된 한 서비스에만 적용한다.
  서비스가 여러 개이면 명시 선택이 필요하며 플랫폼 관리자도 변경 대상을 명시한다.
- community 쓰기 경계 및 기존 역할 회수 안전성 Jest 2 suites / 34 tests PASS, API 타입 검사 PASS.

전달 PR: https://github.com/Renagang21/o4o-platform/pull/374
