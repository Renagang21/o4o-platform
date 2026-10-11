# My Home 다중 화면 · 서비스 공통 진입 구현

> **상태**: ACTIVE
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **승인 범위**: 사용자 My Home 기획 진행 및 배포 지시. 이전 문서 정비의 연속 Phase로 같은 전용 branch를 유지한다.
> **DEPLOYMENT**: MANUAL/GATED → DEPLOYED · 실제 Delivery HELD_LEVEL_3 후 정상 promote 완료. 후속 배포 상태 문서 Phase는 NOT_APPLICABLE.

## 연속 문서 Phase: 사용자 제공 테스트 계정 파일 (2026-10-11)

사용자가 첨부한 `TEST-ACCOUNT.txt`를 `docs/local/TEST-ACCOUNT.txt`에 원문 그대로 배치한다.
사용자의 문서 전체 변경 지시를 근거로 AGENTS·CLAUDE·SETUP·정본 색인과 과거 기록의 계정 파일 참조 이름도 통일한다.
과거 기록의 실행 결과·날짜는 유지하고 파일 참조 이름만 정규화한다. 삭제된 과거 계정 관리 파일은 복원하지 않는다.
이전 빈 입력 양식은 제거하고 새 파일의 Git 추적 제외 및 첨부 동일성을 확인한다.
파일 확보로 이전 누락 사유는 해소됐으며 실제 인증 검증 결과는 별도로 기록한다.
같은 미완료 My Home WO의 연속 문서 Phase로 전용 branch를 유지한다. **DEPLOYMENT = NOT_APPLICABLE**이다.

## 구현

- 대표 개인 공간은 `neture.co.kr/mypage`다. 기존 `/mypage/profile`, `/mypage/settings`, 사업자 정보·커뮤니티 운영자 경로를 유지한다.
- 모아보기, 참여 서비스(`/mypage/services`), 커뮤니티 활동(`/mypage/activity`), 경영 현황(`/mypage/management`), 계정 설정으로 나눈다. 일반 회원에게 매장 역할을 요구하지 않는다.
- 대표 메인의 O4O AI 아래에 My Home 요약을 둔다. 실제 참여 서비스·매장 수, 신청 상태, 읽지 않은 알림, 사용 가능한 업무 진입과 전체보기 링크를 제공한다. 공개 전체 서비스 탐색은 이어서 제공한다.
- Neture(공급자·Funding·Community 호스트 포함), Store, Study, Pharmacy/KPA, 분회, Admin의 인증 헤더에 My Home을 직접 노출한다. 기존 Neture·KPA 모바일 하단 탐색에는 고정 항목을 추가한다.
- 다른 호스트에서는 기존 한 번 사용 가능한 handoff로 로그인 상태를 전달한다. 대표 진입 목적지는 `/`, `/mypage`, 열거된 `from` 맥락만 허용한다. 임의 경로·외부 URL·추가 query는 거부한다. 가입·역할·권한은 생성하지 않는다.
- 이용하던 서비스의 고정 origin으로 돌아갈 수 있다. 맥락은 같은 탭의 계정별 보조 정보이며 권한 근거가 아니다. 전체 원본 URL·토큰을 저장하지 않는다.

## 실제 데이터와 경계

| 화면 | 출처 | 제공 범위 |
|---|---|---|
| 참여 서비스 | 기존 `/auth/services`, `/neture/home/entry`, `/work-scope/operator-services`, `/communities` | 본인 이용 상태·업무 진입. 실제 상세 작업은 원래 서비스 |
| 학습 참여 | `/lms/enrollments/me` | lecture 활성 회원의 본인 수강 상태·제공된 진도. 학습은 Study 원본 강의 |
| 펀딩 참여 | `/api/market-trial/my-participations` | 인증 사용자의 본인 참여·펀딩 처리 상태. 금액 집계·처리 변경 없음 |
| 알림 | `/notifications`, `/notifications/unread-count` | 본인 최근 5건·읽지 않은 수. 상세 및 읽음 처리는 해당 서비스 |
| 커뮤니티 활동 | 접근 가능한 `/communities/:key/forum/posts?author=me` | 본인 글·전체 글 목록·기존 운영자 가입 심사. 댓글 상세는 원래 커뮤니티 |
| 경영 현황 | `/kpa/pharmacy/analytics/marketing` + `X-Store-Organization-Id` | 선택한 승인 매장의 QR 방문: 오늘·최근 7일·누적·사용 중 QR·최근 14일 추이. 서버의 기존 매장 소유권 판정 유지 |
| 계정 설정 | 기존 보안·프로필·로그인 수단 컴포넌트 | 공통 계정 기능 유지 |

이동 중 계정 변경 시 이전 인증 응답으로 이동하지 않는다. 조회 실패와 데이터 없음·실제 0을 구분하고 재시도를 제공한다. 계정 변경 시 이전 데이터는 즉시 숨기고 늦은 응답을 무시한다. 선택 매장 변경도 같은 방식으로 처리한다. 이동 버튼은 헤더·하단 메뉴 사이의 중복 요청을 차단하고 bfcache 복원 시 재시도할 수 있다.

매출·POS·사업별 성과·댓글을 통합 집계하는 API는 새로 만들지 않았다. 학습·펀딩은 아래 연속 Phase에서 기존 본인 조회 API를 소비하며 원장을 복제하지 않는다. 존재하지 않는 최근 이용 이력이나 통계 수치는 표시하지 않는다. DB migration·원장 변경·신규 dependency·CI 설정 변경은 없다.

## 연속 Phase: 서비스 참여·활동 통합 (2026-10-11)

사용자 `다음작업,작업을 작게 나누지 마` 지시에 따라, 같은 미완료 My Home WO의 전용 worktree·branch에서 화면·데이터·원본 업무 연결·검증·main 통합·배포를 한 범위로 진행한다. 최신 main `b565fb00965aa12c84df4f31ed3bff9395fac73e`의 Funding 독립 개설·포럼 변경과 기존 본인 참여 endpoint를 재확인했다. 다른 세션의 작업 폴더는 변경하지 않는다.

- 모아보기에서 Study 최근 수강 3건과 진도, Funding 최근 참여 3건과 진행·펀딩 처리 상태를 표시한다. 참여 서비스에서는 Study 서버 페이지·Funding 클라이언트 페이지로 10건씩 확인한다. Funding 원본 API는 전체 본인 이력을 반환하므로 클라이언트 페이지가 서버 조회량을 줄이지는 않는다.
- 모아보기에서 접근 가능한 최대 3개 커뮤니티의 최근 본인 글 2건씩과 선택한 승인 매장의 QR 방문 요약을 함께 확인한다. 커뮤니티 활동·경영 현황에서 기존 상세 조회를 유지한다. 전체 커뮤니티의 활동을 합산한 수치나 최근 이용 순위를 만들지 않는다.
- Study는 `/lms/enrollments/me`를 사용한다. 서버의 lecture 고정 scope·현재 사용자·활성 membership guard를 유지하고, 클라이언트가 `userId`·`serviceKey`를 전달하지 않는다. 카탈로그 미확인·비활성 회원·서버 403을 성공한 빈 이력과 구분한다. 진도 미제공과 실제 0%도 구분한다.
- Funding은 `/api/market-trial/my-participations`의 인증 사용자 기준 기록을 사용한다. 서비스 membership을 새 조회 조건으로 요구하지 않는다. 화면 상태에는 제목·식별자·진행 상태·펀딩 처리 상태만 남기며 참여자 개인정보·금액·오프라인 처리 원장은 집계하지 않는다. 잘못된 응답·조회 실패를 빈 이력으로 처리하지 않는다.
- Study의 내 수강 목록과 개별 강의로 이동할 때 기존 one-use handoff를 사용한다. 고정 Study origin·`/handoff`·요청했던 `returnTo`를 확인하고, 중복 클릭·계정 변경·unmount·bfcache 이후 늦은 응답을 차단한다. Funding은 기존 Funding 호스트의 참여 목록·상세 링크를 사용한다. Funding에서 로그인 확인이 필요할 수 있다는 현재 동작을 안내하며 서비스 자격을 우회하지 않는다.
- 기존 `/mypage` 화면 구조·공통 헤더·모바일 진입을 유지한다. API·권한·공유 패키지·schema·dependency·배포 설정 변경은 없다. 실제 테스트 계정 문서가 없는 운영 인증 smoke는 별도 미확인 범위다.

이번 Phase의 실제 검증·통합·배포 결과는 [CHECK](../checks/CHECK-O4O-MY-HOME-IMPLEMENTATION-V1.md)의 연속 Phase 절에서 확인한다. 이전 PR #449의 결과를 이번 변경의 검증으로 대체하지 않는다.

연속 Phase는 PR #461로 main에 병합했다. PR의 최종 HEAD와 merge SHA `43fbe5bf7d2ad66b817317de2d3c90585694bfe5`의 main CI, 보안·품질 검사가 통과했다. main에 문서 변경만 추가되어 기존 Delivery는 `SUPERSEDED`가 되었고, 소스 차이 0·최신 CI PASS·migration 변경 0을 확인한 뒤 `65d55ca7ba12672f6f4e3e1f47e965a848c607c9`로 정상 Promote를 실행했다. API·Admin·Neture·Pharmacy/KPA·Study·Store의 배포와 최종 서빙 Report가 성공했으며 production status는 `DEPLOYED`다.

Neture 전체 517개, production build, 로컬 Chromium fixture 18개가 통과했다. 배포 후 실제 HTTPS HTML/JS의 새 기능 포함·공개 페이지 6개/API ready 200·개인 API 비로그인 401을 확인했고, 운영 번들로 1440/375/320px fixture 18개도 통과했다. Chromium의 직접 운영 HTTPS 접속은 클라우드 인증서 신뢰 오류가 남아, TLS 검증을 유지한 curl로 운영 자원을 받아 로컬 origin에서 브라우저 검증을 수행했다. 실제 계정·업무 데이터는 사용하지 않았다. 지정 계정 문서 미확보로 인증 운영 smoke는 계속 남아 있으며 WO/worktree를 보존한다.

## 검증과 남은 단계

### 연속 Phase: 기록 조회·경영 추이 (2026-10-11)

사용자의 다음 작업 지시를 이어 같은 미완료 WO의 전용 worktree·branch를 유지한다. 시작 시 최신 main `c4db284f2d05d9591e0079d88885e517e222cb19`를 확인해 반영했다. 알림 전체 조회·상태 필터, 커뮤니티 내 글 페이지, 일별 QR 방문 그래프와 선택 매장 유지, 검증·main 병합·운영 배포를 한 범위로 수행한다.

- 알림은 기존 인증 사용자 기준 `GET /notifications`의 page·limit·isRead와 `/notifications/unread-count`만 사용한다. 최근 5건/전체 10건, 상태 전환 시 첫 페이지, 계정 변경 시 필터·페이지 초기화와 늦은 응답 차단을 적용한다. 새 route·읽음 변경 호출은 추가하지 않는다.
- 커뮤니티는 기존 접근 가능한 목록 안에서 `author=me`를 유지해 10건씩 조회한다. 커뮤니티마다 페이지가 독립적이며 모아보기의 최대 3개 × 최근 2건 요약은 유지한다. 공개·임시 저장·승인 대기·반려 등 기존 상태와 원본 글 이동을 제공한다.
- QR 통계는 기존 승인 매장 헤더와 소유권 판정을 유지한다. 일별 날짜·0 이상 정수 검증 후 반환된 날짜만 정렬해 표시하고, 빈 일별 기록·실제 0·오류를 구분한다. 표 접근도 유지한다. 같은 탭의 선택 정보에는 계정·organizationId만 보관하고 현재 매장 목록과 다시 대조한다.
- API·권한·DB·원장·dependency·공유 패키지·배포 설정 변경은 없다. 운영 실제 계정 smoke는 지정 계정 문서 미확보로 계속 미실행이다. 검증·통합·배포 근거는 CHECK에 기록한다.

구현은 PR #469로 main `1604014f98771a0b74861e6770382d1436510099`에 병합했다. 최종 PR HEAD `7a738a4545838685ea29111936b385e331c6902f`의 required CI Gate, API 세 묶음·품질·웹/Admin build, CodeQL·SonarCloud가 통과했다. 정본 추가 설명을 분리하라는 자동 리뷰 지적은 구현 PR에서 제외해 해결했다. 이후 문서-only Phase에서 정본의 실제 구현 상태와 배포 결과를 정합한다. 승인 근거는 사용자의 관련 문서 일괄 수정 및 My Home 진행·배포 지시이며, 새 사업 정책·권한 계약을 추가하는 작업은 아니다. 같은 미완료 WO branch를 유지한다.

**이 Phase의 DEPLOYMENT = AUTOMATIC → DEPLOYED**다. 구현 SHA의 main CI가 통과한 뒤 [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38129107503)가 Neture만 배포했고 최종 실제 서빙 SHA Report와 production status가 `DEPLOYED`로 완료됐다. API·다른 서비스는 이번 배포 대상이 아니며 API 소스·migration 차이 0이다. 새 migration·수동 DB write/DDL·Promote 실행은 없었다. Neture 전체 533개, 타입 포함 build, 로컬 fixture 27개와 운영 HTML/JS의 새 기능 포함·공개 화면/API ready 200·개인 API 비로그인 401·운영 번들 fixture 27개가 통과했다. 운영 번들 검증은 TLS 검증을 유지한 curl로 받은 자원을 로컬 origin에서 렌더링하고 모든 사용자 데이터·handoff를 fixture로 응답한 방식이다. 실제 로그인 검증은 계속 미실행이다. 이번 후속 정합은 문서-only이므로 `DEPLOYMENT = NOT_APPLICABLE`이며 runtime SHA와 문서 commit을 구분한다.

[CHECK](../checks/CHECK-O4O-MY-HOME-IMPLEMENTATION-V1.md)에 공유 소비처·테스트·브라우저 증거를 기록한다. 인증·권한 기술 gate, PR required CI, Codex blocker, main 통합을 확인한 뒤 정확한 main SHA에 대해 현재 Delivery 정책을 따른다. migration 없는 정상 promote는 사용자 배포 지시 범위 안에서 실행한다.

초기 네트워크 차단 후 재시도에서 GitHub PR #449 생성·CI/ruleset 조회·운영 홈페이지와 API ready 조회가 성공했다. PR #449와 required CI를 통과해 main에 통합했으며, `bd5c28d83366f0ba84cddc35d616dd2fb9edc653`의 promote 배포와 최종 서빙 SHA·공개 운영 검증이 완료됐다. 세부 run·기존 테스트 재실행 근거는 CHECK에 기록했다. 인증된 운영 화면 smoke에 필요한 테스트 계정 문서는 작업·기준 checkout 모두에 없으며 사용자에게 경로를 요청했다. 기존 Demo/seed 계정으로 대체하지 않는다.
