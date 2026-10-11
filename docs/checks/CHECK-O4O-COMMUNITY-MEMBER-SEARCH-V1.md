# 커뮤니티 회원 검색·페이지 조회 검증

- 작성일: 2026-10-11
- 작업: [WO](../work-orders/WO-O4O-COMMUNITY-MEMBER-SEARCH-V1.md)
- 기준 main: `498ccbd9ea`, branch `wo/community-member-search`

## 구현 범위

개별 커뮤니티 회원 관리와 서비스 admin의 개별 운영자 지정 후보 목록에 이름 검색·상태 필터·페이지 조회를 적용했다. 두 GET API의 memberships/members 필드를 유지하며 pagination(total/page/pageSize/totalPages)을 추가한다. 새 화면의 페이지 파라미터 요청은 기본 20, 최대 100행으로 제한하고 count와 rows의 커뮤니티·상태·이름 조건을 일치시킨다. 기존 정렬 우선순위를 유지하고 가입 ID를 tie-breaker로 추가한다. 검색어 최대 100자, 페이지 입력 검증 및 SQL 바인딩과 literal 와일드카드 처리를 적용한다.

검색·상태·크기 변경은 첫 페이지로 돌아간다. 처리 중 제어 lock과 늦은 응답 격리를 유지하며 마지막 페이지가 비면 유효 페이지로 보정한다. 지정 후보는 기존 active/suspended 범위만 사용한다. 역할·지정 자격·마지막 admin 보호·이메일 마스킹·공통 계정 상태는 변경하지 않는다. DB schema/migration·의존성 변경은 없다.

## 로컬 검증 결과

| 검증 | 결과 |
| --- | --- |
| frozen install 및 packages build | 통과 |
| API Jest 5개 suite | 156개 통과 (기존 권한/경계 회귀 포함) |
| Neture Vitest 3개 파일 | 38개 통과 |
| API/Neture TypeScript production build | 통과 |
| 변경 source ESLint | 오류·경고 0 |
| production preview Playwright mock GET API | desktop 1440 / mobile 390 × 회원·지정 4개 사례 통과 |
| 브라우저 오류 / 페이지 가로 넘침 | 0 / 0 |
| 문서 민감정보 검사·git diff --check | 통과 |

서버 테스트는 유효하지 않은 query의 HTTP 400, resolved community ID 사용, count/rows 조건 일치, literal 검색, bounded LIMIT/OFFSET, 빈 결과/마지막 페이지 보정, 1,000명 입력에서 20행 제한을 확인한다. 화면 테스트는 검색·필터·크기·페이지 변경, 역순 응답, 마지막 페이지의 승인 후 검색 유지, 지정 커뮤니티 변경 시 초기화를 확인한다. Playwright는 오류 재시도까지 포함하며 운영 API에 요청하거나 쓰지 않는다.

## 운영 검증 및 한계

push·리뷰·CI·병합·배포 검증은 진행 후 아래에 증적을 추가한다. 인증된 Google 세션이 없어 실계정으로 회원 조회/권한을 검증하지 못했다. 사용자는 배포 후 실제 계정으로 담당 커뮤니티만 조회되는지, 이름 검색과 여러 페이지 조회가 맞는지, admin/operator의 기존 처리 권한이 유지되는지 확인한다.

후속 범위: 게시물 신고·숨김·복원, 운영자 승계, 커뮤니티 종료 및 이력 보존 정책.

리뷰 보완: page/pageSize 없는 구형·캐시 클라이언트 요청은 기존 전체 결과를 유지한다. 새 화면은 두 파라미터를 항상 전달하며 제한 조회를 사용한다. 두 목록의 legacy 45행 보존 회귀 테스트를 추가했다.
