# 커뮤니티 현행 구현·레거시 판정 안내 V1

- 상태: ACTIVE
- 작성일: 2026-10-28
- 기준 정책: [운영 책임·일반 가입 V2](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V2.md), [V1의 유효한 서비스 identity·게시판 경계](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
- 구현·검증 작업: [TODO](../work-orders/TODO-O4O-COMMUNITY-FORUM-LIST-AND-LEGACY-CLEANUP-V1.md)

## 현재 서비스

`community.neture.co.kr`는 community 저장 범위를 사용하는 하나의 독립서비스다.
최신 main `188da14235`의 V2 정책에서는 일반 참여에 공통 계정을 사용하며 별도 서비스 가입 승인을 일괄 요구하지 않는다.
명시적 서비스 정지·탈퇴와 전문 자격·사업 참여·조직 경계는 유지한다. 구 화면의 별도 서비스 가입 신청 폼·enrollment-policy 조회·승인 대기 안내는 제거했다.
과거 pending/rejected 이력을 이유로
정상 공통 계정의 일반 참여를 차단하거나 과거 원장을 일괄 active로 바꾸지 않는다.
공개 방문자는 명시적으로 공개된 항목만 열람하고, 글·댓글·쓰기는 기존 서버의 현재 이용 자격 판정을 따른다.

O4O 직영 콘텐츠·커뮤니티 운영 책임은 중앙 Admin과 위임받은 담당자에게 있다.
중앙 운영 화면은 admin.neture.co.kr에 통합하며 Google 인증·현재 직영 위임과 업무별 API 권한을 각각 확인한다.
단순 community 역할 보유를 중앙 진입권으로 취급하지 않는다. 운영 API의 역할·유효 membership 조건,
Admin 민감 조치와 일반 Operator 업무, 독립 사업자·협업체의 자체 운영 경계는 그대로 유지한다.
직영 담당자 지정은 중앙 Admin 책임이며 독립 사업의 서비스 Admin 위임 계약과 혼합하지 않는다.
업종별 커뮤니티 카탈로그·개별 community 개설/가입/admin/operator 모델을 새 작업으로 복구하지 않는다.

첫 화면은 Hero → 공지·뉴스 → 포럼 → 콘텐츠 → 자료실이며 광고는 주요 섹션 아래에 둔다.
뉴스 AI 및 유료 외부 호출은 이번 보완 범위가 아니다.

## 포럼 목록

유형·검색·게시판·태그·정렬 조건은 현재 scoped API의 기존 필터로 전달한다.
서버가 필터링한 결과에 페이지를 적용하고 응답의 전체 건수로 페이지 수를 표시한다.
프런트가 현재 페이지의 20건만 유형별로 다시 걸러 전체 검색 결과로 취급하지 않는다.
기본 첫 페이지는 같은 응답 중 고정 글 최대 5개를 별도 표시하고, 나머지 글은 일반 표에 표시한다.
고정 글만 있는 페이지는 전체 빈 목록으로 안내하지 않는다.
별도 표시한 ID만 일반 표에서 제외하며, 초과 고정 글·다음 페이지 고정 글·유형에 일치하는 고정 글은 숨기지 않는다.
공통 UI template는 재사용하고 서비스/사업/펀딩 저장 범위와 서버의 접근 가드는 유지한다.

## 삭제·보존 판정

| 대상 | 판정·근거 |
|---|---|
| Neture 구 `pages/CommunityPage.tsx` | 삭제. 유일 UI route는 /community이며 HostBoundary가 먼저 현행 forum으로 전달하므로 구 홈은 실행되지 않음. 다른 import·문자열 소비처 조사 후 제거 |
| /community 주소 | 보존. 기존 HostBoundary의 canonical 호스트 전달·query/hash·세션 handoff 유지, route fallback도 현행 forum으로 연결 |
| CommunityWorkspace의 옛 가입 폼·/communities/join client 호출·약관 조회 | 삭제. 최신 resolver의 canJoin은 모든 현행 공간에서 false이며 일반 참여는 공통 계정. 서버의 기존 응답/호환 API 계약은 변경하지 않음 |
| fetchPinnedPosts 별도 helper | 삭제. 같은 목록을 중복 조회·페이지 뒤 필터링하던 경로를 단일 scoped 조회와 표시 분리로 대체. 다른 호출자 없음 |
| communityAdmin의 public 광고/스폰서 API export | 삭제. public export는 호출자 0. 실제 사용되는 관리 client·타입·공통 콘솔은 보존 |
| 구 Neture 광고/스폰서 관리 wrapper | 재사용. 살아 있는 route·공통 콘솔 및 정적 소비 계약이 있으므로 이름만으로 삭제하지 않음. 독립 커뮤니티 Hero 운영과 혼동하지 않음 |
| My Home communityOperator adapter | 재사용. 현행 community/access를 조회하는 서비스 운영 호환 adapter이며 폐기된 개체 가입 원장을 사용하지 않음 |
| CommunityWorkspace·공통 Forum·소유 게시판/내 글·사업/펀딩 공간 | 재사용. 실제 소비처와 별도 권한 범위 유지 |
| community-catalog의 retired 저장 코드·예약 키 | 보존. 옛 원장의 일반 공개 API 노출 및 키 재점유를 막는 보안 경계 |
| 과거 migration·운영 삭제 도구·FK/법정 보존 자료 | 보존. 코드 미사용과 DB 삭제 승인은 별개이며 이번 작업에서 DB·데이터를 삭제하지 않음 |
| 개별 커뮤니티 모델의 과거 WO/CHECK/설계 | 본문 이력 보존, SUPERSEDED 안내로 이 문서와 현행 정책 연결 |

## 후속 검수 경계

2026-10-28 공개 읽기 조사에서 공개 섹션·공개 글·가입 약관의 게시 건수는 각각 0이었다.
이는 회원 전용 원장까지 비어 있다는 뜻이 아니다. 초기 게시판·콘텐츠·약관 게시와 실제 공통 계정 참여·서비스 제재·글쓰기·중재는
해당 운영 권한과 데이터 변경 범위의 별도 검수이며 이번 개발에서 운영 데이터를 만들지 않는다.
자동/모의 데이터 회귀 결과와 실제 운영 계정의 업무 상태 변경 검증을 구분한다.

## 참여·운영 화면의 실패 처리

[참여·운영 보완 TODO](../work-orders/TODO-O4O-COMMUNITY-PARTICIPATION-OPERATIONS-V1.md)와 [CHECK](../checks/CHECK-O4O-COMMUNITY-PARTICIPATION-OPERATIONS-V1.md)는 #868 이후의 별도 개발 기록이다. main 반영·운영 배포는 해당 PR의 실제 결과를 따른다.

댓글 조회 실패는 본문을 지우거나 정상 0건으로 안내하지 않고 조회 재시도를 제공한다. 댓글 재조회와 작성을 직렬화해 조회 응답이 방금 작성한 댓글을 덮어쓰지 않게 한다. 댓글 수정 실패 시 입력을 유지하고 오류를 표시하며, 글·계정 전환 전의 지연 응답은 새 화면에 반영하지 않는다. 잠금/댓글 비허용 글에는 작성 제한을 안내한다.
편집 대상 조회에 성공하기 전에는 제출 폼을 열지 않고 재조회를 제공한다. 명시한 게시판을 찾을 수 없으면 다른 게시판으로 대신 게시하지 않는다. 공개 설정에서 선택을 바꾸면 이전 저장 완료 안내를 지우며 다시 저장해야 적용된다.
서버의 작성자 수정·운영자 삭제 중재·정지/탈퇴·사업/조직/펀딩 및 공개 열람 경계는 유지한다. 실제 운영 계정의 업무 변경 검수는 별도이며 합성 데이터 테스트와 구분한다.
