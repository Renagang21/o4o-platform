# 커뮤니티 회원 검색 및 페이지 조회 정비

> **상태**: COMPLETED
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **근거**: 사용자의 회원 검색·상태 필터·페이지 조회 진행 및 배포까지 자율 실행 지시
> **기준**: main `498ccbd9ea` · branch `wo/community-member-search`

## 초기 TODO

- [x] 초기 TODO 작성 및 독립 작업 branch 준비
- [x] 역할·가입 원장·공유 소비처 정본 확인
- [x] 운영자 회원 목록 화면 → API → 권한 → 조회 구조 조사
- [x] 검색·필터·정렬·페이지 계약과 호환 필요성을 확인하고 TODO 수정
- [x] 수정 TODO에 따라 구현
- [x] 권한·커뮤니티 격리·검색·페이지·늦은 응답 회귀 검증
- [x] build·desktop/mobile 검증·문서 정합
- [x] push·리뷰 보완·필수 CI·main 병합·배포·서빙 SHA 확인

## 범위

개별 커뮤니티 운영자가 기존 권한 안에서 회원을 검색하고 상태별로 페이지 조회하도록 정비한다. 역할·제재 정책·공통 계정 상태는 바꾸지 않는다. 신고·게시물 숨김·운영자 승계·커뮤니티 종료는 이번 범위에 포함하지 않는다. DB schema/migration·새 의존성 변경 없이 가능한 구현을 우선한다.

## 조사 후 수정 TODO

- [x] 회원 관리·개별 운영자 지정의 두 소비처를 정비 대상으로 확정
- [x] 이름 부분 검색(최대 100자), 회원 상태 필터와 서버 페이지 조회(기본 20, 최대 100건) 구현
- [x] 기존 rows 필드를 유지하며 pagination metadata를 추가하고 SQL 조건·count·정렬을 일치시킴
- [x] 검색/상태/커뮤니티 변경 시 첫 페이지로 이동, 늦은 응답 차단, 처리 중 필터 잠금 유지
- [x] 회원 처리 후 현재 조건을 재조회하고 마지막 페이지가 비면 유효 페이지로 보정
- [x] 파라미터 검증·SQL 바인딩·와일드카드 literal 검색·페이지 경계·기존 권한 회귀 검증
- [x] desktop/mobile mock 브라우저·빌드·리뷰·CI·병합·API/Neture 배포 검증

조사 결과: `/communities/:slug/memberships`는 상태별 전체 조회, `/communities/admin/communities/:id/members`는 active/suspended 전체 조회다. 실제 화면 소비처는 각각 MyCommunityOperatorPage와 CommunityServiceAdminPage 하나다. 이름 검색만 제공하며 마스킹 이메일 검색을 새로 허용하지 않는다. 정렬은 기존 우선순위를 유지하고 membership ID를 tie-breaker로 추가한다. API의 rows 필드를 보존해 기존 화면 응답 해석은 유지하되 페이지 파라미터가 있는 새 화면 요청은 기본 20건으로 제한한다. 구형/캐시 화면의 페이지 없는 호출은 기존 전체 결과를 유지한다. 회원 관리 상태 5종과 지정 목록 active/suspended 범위는 유지한다. [역할 정본](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §5 및 [공유 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)를 검토했다.

## 검증 기록

[CHECK](../checks/CHECK-O4O-COMMUNITY-MEMBER-SEARCH-V1.md)에 검증 결과와 실제 계정 확인의 한계를 기록한다. API·Neture 배포 및 서빙 SHA 검증을 완료했다. 실계정 직접 확인은 CHECK에 남긴다.

## 운영 반영 완료

[PR #443](https://github.com/Renagang21/o4o-platform/pull/443)을 main `e0cb5b42209206cefeb28098efffcc7bbc083702`에 병합했다. 필수 PR CI·리뷰 보완·최신 main CI가 통과했으며 [Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38101638876)는 기능 병합을 포함하는 `4fb178119ebbda96c3a187245073075fdd927635`를 API·Neture에 배포했다. production `DEPLOYED`와 실제 서빙 SHA 검증을 확인했다. 실제 배포 번들 desktop/mobile 4개 mock API 검증도 통과했다. 실계정 운영 데이터의 긍정 조회·처리 검증은 남아 있다.

동일 WO의 문서 마감 Phase는 `wo/community-member-search-closure`로 분리한다. runtime 변경이 없어 이 문서 기록만으로 추가 서비스 배포를 요구하지 않는다.
