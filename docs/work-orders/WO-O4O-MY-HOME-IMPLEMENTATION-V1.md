# My Home 다중 화면 · 서비스 공통 진입 구현

> **상태**: ACTIVE
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **승인 범위**: 사용자 My Home 기획 진행 및 배포 지시. 이전 문서 정비의 연속 Phase로 같은 전용 branch를 유지한다.
> **DEPLOYMENT**: MANUAL/GATED → DEPLOYED · 실제 Delivery HELD_LEVEL_3 후 정상 promote 완료. 후속 배포 상태 문서 Phase는 NOT_APPLICABLE.

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
| 알림 | `/notifications`, `/notifications/unread-count` | 본인 최근 5건·읽지 않은 수. 상세 및 읽음 처리는 해당 서비스 |
| 커뮤니티 활동 | 접근 가능한 `/communities/:key/forum/posts?author=me` | 본인 글·전체 글 목록·기존 운영자 가입 심사. 댓글 상세는 원래 커뮤니티 |
| 경영 현황 | `/kpa/pharmacy/analytics/marketing` + `X-Store-Organization-Id` | 선택한 승인 매장의 QR 방문: 오늘·최근 7일·누적·사용 중 QR·최근 14일 추이. 서버의 기존 매장 소유권 판정 유지 |
| 계정 설정 | 기존 보안·프로필·로그인 수단 컴포넌트 | 공통 계정 기능 유지 |

이동 중 계정 변경 시 이전 인증 응답으로 이동하지 않는다. 조회 실패와 데이터 없음·실제 0을 구분하고 재시도를 제공한다. 계정 변경 시 이전 데이터는 즉시 숨기고 늦은 응답을 무시한다. 선택 매장 변경도 같은 방식으로 처리한다. 이동 버튼은 헤더·하단 메뉴 사이의 중복 요청을 차단하고 bfcache 복원 시 재시도할 수 있다.

매출·POS·사업별 성과·학습 진도·펀딩 이력·댓글을 통합 집계하는 API는 새로 만들지 않았다. 원본 서비스에서 이어갈 수 있다. 존재하지 않는 최근 이용 이력이나 통계 수치는 표시하지 않는다. DB migration·원장 변경·신규 dependency·CI 설정 변경은 없다.

## 검증과 남은 단계

[CHECK](../checks/CHECK-O4O-MY-HOME-IMPLEMENTATION-V1.md)에 공유 소비처·테스트·브라우저 증거를 기록한다. 인증·권한 기술 gate, PR required CI, Codex blocker, main 통합을 확인한 뒤 정확한 main SHA에 대해 현재 Delivery 정책을 따른다. migration 없는 정상 promote는 사용자 배포 지시 범위 안에서 실행한다.

초기 네트워크 차단 후 재시도에서 GitHub PR #449 생성·CI/ruleset 조회·운영 홈페이지와 API ready 조회가 성공했다. PR #449와 required CI를 통과해 main에 통합했으며, `bd5c28d83366f0ba84cddc35d616dd2fb9edc653`의 promote 배포와 최종 서빙 SHA·공개 운영 검증이 완료됐다. 세부 run·기존 테스트 재실행 근거는 CHECK에 기록했다. 인증된 운영 화면 smoke에 필요한 테스트 계정 문서는 작업·기준 checkout 모두에 없으며 사용자에게 경로를 요청했다. 기존 Demo/seed 계정으로 대체하지 않는다.
