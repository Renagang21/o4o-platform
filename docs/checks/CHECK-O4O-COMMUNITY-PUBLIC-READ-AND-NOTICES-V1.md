# 명시적 커뮤니티 공개 읽기·약국 공지 CHECK

> 상태: ACTIVE · 2026-10-11 · [통합 WO](../work-orders/WO-O4O-FRONTEND-INTEGRATED-STABILIZATION-V1.md)

사용자 결정: 운영자 명시적 공개 지정만 guest에 허용. 고정 공지 최대 3개·비고정 최근 공지 5개. 기존 자료 기본 회원 전용과 회원 forum guard를 보존한다. 새 schema/migration/backfill·권한 원장·법률 DB 게시·이력 삭제는 없다.

## 공통 소비처 영향표

| 공통 소스/소비처 | 영향·route/role/capability | 검증 |
| --- | --- | --- |
| ForumPostController → generic `/api/v1/forum` | 선택 isPinned/type query를 유효 값으로 제한. 미전달 기존 목록·author=me·scoped/closed guard 유지 | 공지 필터 6 tests, generic scope isolation 포함 API 56 tests |
| ForumController composition → KPA `/api/v1/kpa/forum` | 같은 controller 사용. KPA 기존 getPosts 소비는 새 query를 보내지 않으며 기존 계약 유지 | controller 기존 무필터 회귀·API build |
| createServiceForumRouter → Neture forum | service 범위/회원·쓰기 gate 유지. Neture forumApi의 pinned 처리는 현재 클라이언트 필터이며 새 query 추가 없음 | Neture 전체 500 tests |
| createServiceForumRouter → `/communities/:key/forum` | 회원 workspace gate 그대로. 사업 홈만 isPinned=true limit3 및 isPinned=false type=announcement limit5 전송 | 기존 member mount API 회귀, Pharmacy 회원 홈 16 tests, PC/390/320 fixture |
| createServiceForumRouter → funding forum (main #451 통합) | 해당 펀딩의 현재 개설자/운영자/승인 참여자만 기존 scoped forum 이용. 새 optional query가 이용 자격/종료 쓰기 guard를 바꾸지 않음 | funding forum 기존 route 회귀 및 CI 전체 API shards |
| ForumRequestService → generic forum request/operator 심사·communities 게시판 신청 | 신청/create 및 pending/revision update는 공개 지정 예약 metadata 키 제거. 승인된 게시판 owner update는 원래 metadata 수정 없음. 같은 serviceCode/소유자/상태 guard 유지 | metadata 예약 키 제거 및 원본 불변 회귀, API build·기존 mount 회귀 |
| ForumDirectoryController → generic/KPA/Neture/community/funding owner 관리 | 설명/아이콘은 허용 필드만 partial update. 삭제 요청은 현재 JSON에 lifecycle 키만 병합해 운영자의 최신 공개 철회·상태를 보존 | owner stale entity 2 회귀, 실제 PostgreSQL stale proof replay 거부 |
| 공통 operator-forum.routes → 서비스별 운영 router | 정보 수정은 name/description/tags만 partial update. 단건/일괄 삭제 심사·직접 비활성/재활성은 lifecycle 키를 원자 병합하며 공개 예약 키는 제외 | API build·literal 소비처 조사·현재 JSON 병합 및 서비스 격리 SQL 회귀 |
| KPA local ForumRequestService | 별도 원장/서비스이며 공통 파일 변경의 직접 소비처 아님 | import 검색으로 확인, 변경 0 |
| communities guest router | active independent/open completed board/published non-org posts만 운영자 designation으로 공개. 사업 회원 공간 excluded. 목록/UUID/slug 상세 같은 SQL predicate·response whitelist | 공개 API 18 tests: private/closed/draft/교차 게시판/일반 회원/guest 쓰기·댓글/비활성/페이지 범위 |
| communities 관리 router/UI | fresh user와 현재 workspace canManage 필요. transaction 안 scope·게시판 row lock·선택 글 validation 후 예약 JSON 키만 변경 | 운영 저장/실패 재시도/폐쇄 선택 제한 및 guest·member denied 회귀 |
| community host/list/workspace/public frontend | 가입 자격 링크와 공개 페이지 구분. 기존 회원 UI 유지. 오류·빈 목록·철회 후 404에서 이전 본문 숨김 | 공개 UI 4 tests·Neture 전체500·PC1440/390/320 공개/관리 6 fixture |
| 공통 ForumPostContent renderer | 기존 sanitized renderer를 그대로 소비. Core renderer source 변경 0 | web build·public detail fixture |

`rg` import/symbol와 `check-literal-consumers --source`로 공통 controller/request service의 직접·간접 mount 및 raw-source 계약을 조사한다. generic/forum KPA composition, Neture/community service mounts와 관련 테스트를 포함한다. 새 query는 optional이며 미전달 소비처의 API 계약을 변경하지 않는다. 소스 문자열 계약도 의미 있는 기존 tests로 검증하며 assertions를 제거하지 않는다.

## 결과 및 한계

API 공개/기존 member mount/generic isolation 56 tests, 공개/공지 필터 24 tests PASS. API·Neture·Pharmacy build PASS. Neture 전체500·Pharmacy16 PASS. 새 번들 fixture는 공개/관리/공지 PC1440·mobile390/320 총9 PASS, pageerror/문서 overflow 없음. fixture는 합성 API/계정이며 운영 공개 설정·개인 계정 데이터를 변경하지 않는다.

main/CI/review·운영 배포·공개 read-only smoke는 통합 WO에 최종 기록한다. 실제 운영자 설정 저장과 실계정/OAuth는 마지막 사용자 테스트다. 이력 보존/정책 발행은 조사·개정안 후 확정 단계로 남는다.

자동 리뷰 보완: raw SQL의 날짜 컬럼을 Entity의 실제 `created_at`으로 정정하고 응답 이름은 `createdAt` alias로 유지한다. 목록/상세·운영자 chooser에 실제 ForumPost decorator metadata의 물리 컬럼과 query reference를 대조하는 회귀를 추가한다. 격리 PostgreSQL 15에서 공개 조건·직접 ID·철회·JSON 갱신을 실행했으며 운영 DB 조회/변경과 구분한다. 최종 전체 SELECT/ORDER 실행 검증과 재검증 결과는 통합 WO에 기록한다.

공개 설정 선택 목록은 승인된 열린 게시판별 최근100개 LATERAL 조회다. 커뮤니티 전체 상한이나 폐쇄 게시판의 대량 글이 다른 게시판 후보를 가리지 않도록 한다. 실제 PostgreSQL에서 게시판별 상한·다른 열린 게시판의 오래된 글·폐쇄 글 대량 제외를 검증한다.

최근 후보에서 밀린 기존 선택은 목록 밖 개별 보기/선택 해제 UI로 관리한다. 한 글만 제외한 저장 payload와 다른 선택 보존을 회귀로 검증하며, 삭제/draft 등 현재 조회 불가한 ID도 해제할 수 있다. 저장 전 실제 공개 철회가 완료된 것처럼 표시하지 않는다.

## 운영자 지정의 출처 검증 (후속 P1)

과거 신청 metadata의 예약 키는 운영자의 공개 지정 증거로 신뢰하지 않는다. 운영자 전용 저장 경로가 기존 서버 `JWT_SECRET`으로 communityKey·boardId·mode·postIds·지정자·지정시각을 함께 HMAC 서명한 설정만 공개 조건에 포함한다. 서명 누락/변조/다른 게시판·커뮤니티에서 복사한 설정은 private로 처리하며 별도 backfill은 하지 않는다. 기존 서버 키 누락은 공개 저장 503·열람 private이며 철회 저장은 계속 가능하다. 서버 키가 교체되면 기존 지정도 private가 되어 운영자의 재지정이 필요하다. 응답에서 서명·작성자 개인정보·원장 metadata는 공개하지 않는다.

설명 수정/삭제 요청/운영 심사가 오래된 전체 Entity·JSON을 save하면 이미 철회한 유효 서명이 복원될 수 있어, 허용 필드 partial update와 현재 JSON의 제한된 원자 병합으로 바꾼다. 공개 예약 키는 이 병합 patch에서 제거되며 상태 변경은 명시적 활성/비활성 전이에만 포함한다. owner 및 operator 권한·서비스 scope·audit contract는 유지한다.

최종 focused API 6 suites 109 tests PASS. 격리 PostgreSQL 15에서 실제 service/HMAC/원자 병합 helper를 실행해 unsigned legacy·복사/변조 서명·타 scope 거부, list/detail/date alias, 게시판별 chooser, 철회 후 stale proof 재주입 거부·기타 metadata 보존을 확인했다. 합성 임시 테이블 transaction rollback 후 해당 격리 DB만 종료했으며 운영 DB 쓰기는 없었다.

후속 API build·변경 파일 ESLint PASS. 추가로 공통 controller의 raw-source 소비 계약을 포함하는 community catalog/access 31 tests PASS. 문서 민감정보 검사 3852 files 0건 및 diff whitespace 검사 PASS.

후속 P1: 기존 선택 B가 삭제/archived/draft로 바뀌어도 공개된 A의 선택 해제가 거절되지 않도록, locked board의 현재 서명이 유효한 기존 selected ID와 새 추가 ID를 구분한다. 새 추가 ID는 기존과 같은 게시판/published/non-org 조건을 검증하며, 기존 선택은 자동 삭제하지 않는다. 현재 읽기 predicate는 유효하지 않은 기존 글을 계속 제외하고 A를 해제해 저장하면 UUID/slug 직접 열람도 철회된다. unsigned legacy ID는 기존 선택으로 신뢰하지 않는다. focused API 112 tests PASS; 격리 PostgreSQL에서 draft/archived/deleted 세 경우의 A 철회·B 비노출·유효하지 않은 신규 ID 거부 PASS.

## 최종 통합·운영 확인 (2026-10-11)

구현 PR #458과 Sonar 정정 PR #467은 main에 병합됐다. 최종 #467의 CI Gate·CodeQL·별도 SonarCloud·Codex 검사와 병합 후 CI가 통과했고, API/Pharmacy는 `e1cd3b187`, Neture는 후속 My Home 통합 `1604014f9` 배포가 완료됐다. 배포 run·대상별 SHA와 사용자 마지막 테스트는 [통합 WO §9](../work-orders/WO-O4O-FRONTEND-INTEGRATED-STABILIZATION-V1.md#9-최종-main-통합운영-배포사용자-테스트-인계)에 기록한다.

최종 API focused 112·community catalog/access 31·Pharmacy 16 및 최신 Neture 전체533 tests PASS. 마지막 공개 운영 HTTP28·비로그인 PC1440/mobile390/320 browser9 PASS. 공개 목록은 현재 지정 글 0으로 정상 응답했고 직접 private ID는404, 운영 관리 API는401, 회원 API는403이었다. 실제 운영자의 공개 지정/철회 저장·실계정 회원 홈·외부 OAuth는 T13 사용자 테스트이며 이번 공개 읽기 검증으로 완료 처리하지 않는다. 운영 DB 쓰기·legacy 자동 공개·이력 삭제·법률 본문 발행은 실행하지 않았다.
