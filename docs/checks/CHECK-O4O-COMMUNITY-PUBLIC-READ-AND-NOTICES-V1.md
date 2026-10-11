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
