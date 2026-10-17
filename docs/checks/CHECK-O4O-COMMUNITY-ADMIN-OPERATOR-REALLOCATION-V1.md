# CHECK-O4O-COMMUNITY-ADMIN-OPERATOR-REALLOCATION-V1

> 상태: ACTIVE · 작성일: 2026-10-17
> 근거: 사용자 확정 — 일상 운영은 Operator, 영구 데이터 삭제·서비스 전체 설정은 Admin. 적용 대상은 커뮤니티만.
> 기준: main `aee4957413`, 작업 branch `wo/service-admin-operator-reallocation`.

## 적용 범위

`community.neture.co.kr`의 독립 커뮤니티 서비스만 변경한다. Supplier/Funding/Neture/KPA/Lecture의
메뉴·권한 정책과 사업 회원 공간은 변경하지 않는다. 공통 회원 컴포넌트의 새 옵션 기본값은 기존과 동일하다.

| 업무 | 담당 | 화면 |
|---|---|---|
| 회원 승인·반려·이용 정지·재활성화 | Operator, Admin도 가능 | `/operator/service-members/community` |
| 게시판 개설·신청 심사·공개 범위·콘텐츠 중재 | Operator, Admin도 가능 | `/operator/communities` 및 기존 회원 게시판 |
| 게시판 운영 중지·재개 | Operator, Admin도 가능 | `/operator/communities/boards` |
| Hero·광고 운영 | Operator, Admin도 가능 | `/operator/home-presentation/community` |
| 회원 활동·서비스 관계 완전 삭제 | Admin | `/admin/communities/members` |
| 게시판·종속 데이터 완전 삭제 | Admin | `/admin/communities/boards` |
| 서비스 전체 약관·정책 설정 | Admin | `/operator/legal/community` (기존 URL 유지) |

Admin 진입 `/admin/communities`는 일상 운영으로 보내던 redirect를 없애고 회원 데이터 관리로 연결한다.
Admin 메뉴는 완전 삭제·약관과 일상 운영으로 이동하는 링크만 둔다. Operator 메뉴에는 약관·완전 삭제를 노출하지 않는다.
데스크톱·모바일은 같은 메뉴와 접근 판정을 사용한다. Admin도 Operator 일상 업무를 수행할 수 있다.

## 서버 경계와 데이터 처리

- 전용 API는 `/communities/community/management/*`다. 서비스 키·저장 코드는 서버에서 `community`로 고정한다.
- 매 요청 현재 DB의 정상 공통 계정·활성 커뮤니티 가입·유효한 `community:admin/operator`를 확인한다.
  다른 서비스 admin이나 단독 platform 역할로 커뮤니티 권한을 합성하지 않는다.
- 운영 중지한 게시판은 목록뿐 아니라 직접 글·댓글·쓰기 target에서도 차단한다. 재개 시 기존 데이터로 다시 이용한다.
- 상태 변경은 Operator 이상, 삭제 계획 조회와 실행은 Admin만 가능하다.
- 삭제 계획은 대상·선택된 행의 내용·차단 사유를 fingerprint로 묶는다. 실행 트랜잭션에서 재검사하고
  변경되었으면 409로 거부한다. 화면에서는 영향 건수와 되돌릴 수 없음을 표시하고 확인 문구를 입력받는다.
- 게시판은 운영 중지 상태만 삭제한다. 게시글·댓글/답글·두 좋아요 원장·북마크·연결 알림·게시판 참여/가입 신청을 함께 정리한다.
- 회원은 정지·탈퇴·반려 상태만 삭제한다. 해당 서비스의 작성 글·댓글/연결 답글·반응·참여·신청·일반 역할·서비스 가입을 삭제한다.
  소유 중인 운영/중지 게시판은 자동 삭제하지 않고 먼저 정리·이전을 요구한다. 활성 운영 역할이 남은 계정, 자기 자신과 Demo 계정은 보호한다. 회수된 운영 역할의 중앙 관리 이력은 삭제하지 않는다.
- 공통 `users`, 인증 수단, 다른 서비스 가입/역할/게시글, 법정·정책 동의/감사 원장은 삭제하지 않는다.
  삭제 대상 글의 다른 회원 댓글/반응도 종속 데이터임을 사전 화면에서 알린다.
- 첨부 자료의 소유 검토나 조직 전용 데이터, 예상 범위 밖 FK 연결이 있으면 자동 삭제를 차단한다.
  공유 미디어 객체의 URL을 따라 삭제하지 않는다. 이 경우 화면의 완전 삭제는 차단 상태이며 완료를 주장하지 않는다.
- 실행은 SERIALIZABLE 트랜잭션과 감사 기록을 사용한다. 실패하면 전체 rollback하고 살아남은 글·댓글의 댓글/답글/좋아요 수를 갱신한다.
- 기존 공통 회원 DELETE의 community 호출은 409로 전용 경로를 안내한다. 가입 관계만 지워 활동을 남기던 우회 경로를 닫는다.
  다른 서비스 DELETE는 기존 동작을 유지한다.
- 신규 migration·운영 DB 변경·실제 운영 데이터 삭제는 수행하지 않는다.

## 공유 소비처 확인

`ServiceMembersWorkspace`는 Neture의 supplier/funding/community wrapper 및 Lecture가 소비한다.
`allowDestructiveActions` 기본값 true를 유지하고 community wrapper만 false를 넘긴다.
일상 운영에서 Admin의 삭제 버튼도 숨기며 전용 Admin 화면으로 역할을 분리한다.
공통 Subdomain layout은 community의 `area`만 메뉴 분리에 사용하고 supplier/funding 메뉴는 보존한다.
공통 Forum Controller의 community context에서만 플랫폼 역할의 중재 예외를 제거하고 자체 운영 권한을 요구한다. 다른 서비스의 기존 중재 판정은 유지한다.
공통 회원 정책은 community DELETE만 전용 관리 경로를 요구하고 다른 서비스의 조치를 유지한다.

## 검증·통합 상태

- 격리 PostgreSQL 기능 검증: 22 tests PASS (권한, 중지/재개, 범위 밖 보존, 삭제 계획 변경, 첨부/외부 FK 차단, rollback).
- API focused: 6 suites / 117 tests PASS (위 PostgreSQL 22개 포함, HTTP·회원 정책·콘텐츠 중재 경계).
- 웹 focused: 4 files / 106 tests PASS.
- 공유 회원 UI 전체: 21 files / 166 tests PASS (직접 소비처뿐 아니라 공통 모듈 회귀 포함).
- Neture 웹 전체: 122 files / 1100 tests PASS.
- 데스크톱 1440px / 모바일 390px × admin/operator: 메뉴·직접 URL·이전 포럼 URL·이용 상태 API 응답, 가로 넘침 0·런타임 오류 0 PASS (로컬 fixture).
- API/Neture production build, ESLint, 문서 민감정보 검사·TypeORM entity guard·diff check PASS.
- CI/통합·배포 결과는 확정 뒤 갱신한다.
- 로컬 전용 `docs/local/TEST-ACCOUNTS.local.md`는 현재·기준 checkout 모두 없다.
  따라서 과거 운영 계정을 재사용하지 않고 로컬 fixture 세션으로 화면을 검증한다. 실제 Google 운영자 세션 검증은 포함하지 않는다.

## 리뷰 후 보정

PR #685의 P1/P2 지적을 재현하고 수정했다. 조직 전용 글의 작성자만 확인하던 차단 조건을
댓글·두 좋아요 원장·북마크·알림 수신/행위자 및 조직 소유 게시판의 참여·신청·소유까지 확장했다.
이 데이터는 일반 커뮤니티 삭제에 포함하지 않고 검토가 끝날 때까지 회원 삭제 자체를 차단한다.
살아남은 글의 최근 댓글 시각·작성자도 최신 공개 댓글로 재계산하며 공개 댓글이 없으면 둘 다 NULL로 지운다.
PostgreSQL에서 관련 11개 사례를 추가해 총22개, API 관련 전체117개가 통과했다.

## 문서 정합

역할 정본의 커뮤니티 절에 현재 사용자 조치 기준을 추가했다. 과거 개별 커뮤니티 모델의 이력은 다시 쓰지 않는다.
