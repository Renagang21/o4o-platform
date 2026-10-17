# CHECK-O4O-COMMUNITY-SERVICE-FOLLOWUP-V1

> 상태: ACTIVE · 작성일: 2026-10-17
> 근거: 독립서비스 전환 뒤 운영자·가입 동선 검증, 잔존 서비스 종속 조사 및 후속 정리 지시.
> 기준: main `3a575c074c`, 전용 branch `wo/community-service-followup`.

## 확인된 문제와 수정

| 영역 | 문제 | 조치 |
|---|---|---|
| 운영 메뉴 | 약관·Hero 관리 경로의 community 호스트 소유권 누락으로 대표 호스트 이동 | 두 설정 경로를 community 소유로 지정, query/hash와 원래 세션 유지 |
| 구글 로그인 | AuthProvider가 Neture 멤버십 조회 대상을 고정 전달 | community 호스트의 조회 키만 community로 정렬 |
| 알림 조회 | 헤더·모바일 알림의 serviceKey가 Neture로 고정 | community 호스트의 미읽음·목록 조회 키를 community로 지정 |
| 화면 이름 | 로그인 화면의 Neture 이름 | community 호스트에서 커뮤니티 이름 표시. 공통 계정 약관의 Neture 주체 표시는 유지 |
| 미사용 모델 | 개별 Community/Membership/CreationRequest entity가 registry에 잔류 | 전체 소스 참조가 registry뿐임을 확인하고 3개 클래스·등록 제거 |

구글 로그인 본문의 serviceKey는 응답의 멤버십 조회 대상이다. 서버의 로그인 자격 판정은 Origin으로
별도 처리하며 이번 수정으로 계정·역할을 생성하거나 로그인 권한을 넓히지 않는다.
동일 번들의 main/supplier/funding/CarePharm 소비처는 기존 동작을 유지하고 함께 검증한다.
공통 계정 약관은 계속 기존 공통 원장을 사용한다. 커뮤니티 서비스 이용 약관과 혼동하지 않는다.
알림 전체 읽음은 기존 공통 API의 계정 단위 동작을 유지한다. 서비스별 전체 읽음 정책 변경은 포함하지 않는다.

## 운영 읽기 전용 확인

현재 운영 STAFF 테스트 계정의 이메일 로그인 200, 커뮤니티 access 200을 확인했다.
일반 계정의 `/operator/members/stats?serviceKey=community`는 403 ROLE_REQUIRED였다.
`/public/services/community/enrollment-policies`는 200 / 0건이었다.
`/communities/community/public/posts`는 200 / items 0 / hasNext false였다.
기존 데이터 삭제 이후 새 가입·게시판·글·승인·공개 설정을 운영 DB에 추가하지 않았다.
실제 구글 운영자 로그인 성공 및 운영 UI 승인 처리는 이 결과에 포함하지 않는다.

## 검증

- 웹 관련 회귀: 7 files / 126 tests PASS (전체 결과와 중복).
- Neture 웹 전체: 119 files / 1083 tests PASS.
- 웹 production build PASS.
- API 가입·운영자·반려·재활성화·정지: 6 suites / 93 tests PASS.
  전용 PostgreSQL의 실제 transaction 검사 6건 포함.
- entity registry guard PASS: stale reference 0, 등록 누락 신규 0.
- API 모델 정리 후 전체 TypeScript build PASS. 변경 파일 ESLint PASS.
- unsafe route guard: 1254 files / 위반 0. 문서 민감정보 guard·diff check PASS.

## 실제 운영자 검증 순서

사용자 PC의 기존 Google 로그인으로 다음을 확인한다. 로그인·토큰·개인정보는 공유하지 않는다.

1. community 호스트에서 로그인하고 본인의 community active 회원 상태와 현재 admin/operator 역할을 확인한다.
2. `/operator/service-members/community`에서 자기 서비스 회원만 조회되는지 확인한다.
3. 테스트용 일반 계정으로 서비스 가입 신청 → pending 확인 → 운영자가 승인 → 일반 계정 글쓰기 접근을 확인한다.
4. 반려·재신청·정지·재활성화와 다른 서비스 회원 상태 무변경을 확인한다.
5. 운영 메뉴의 게시판·공개 설정, 약관, Hero 관리에서 community 호스트를 유지하는지 확인한다.
6. 비공개 게시판과 글은 비로그인 접근이 막히고, 명시적으로 공개한 글만 공개 목록/상세에 보이는지 확인한다.

현재 제공된 세 계정에는 community 운영 권한이 없어 이 검사를 대신 수행하지 않는다.
구글 계정 공유 대신 사용자 브라우저에서 실제 동작 결과만 확인하면 된다.

## 초기 운영 구성안

현재 커뮤니티 전용 enrollment policy가 0건이다. 공통 계정 약관은 이와 별개다.
서비스 약관 관리에서 확정된 운영 정책을 게시하고 필수 동의 여부를 정해야 한다.
새 정책 본문을 임의 작성해 운영 게시하거나 과거 Neture 정책을 복제하지 않는다.

초기 게시판 제안은 `공지·운영 안내`, `질문·답변`, `자료·경험 공유`다.
운영자가 게시판을 만들 때 기본 회원 전용을 유지하고 공개할 범위만 명시적으로 지정한다.
운영 안내에는 참여 대상, 가입 승인 기준, 금지 행위, 신고·문의 처리 경로를 명시한다.
운영 콘텐츠 생성·공개는 실제 운영자 검증 뒤 진행한다.

## 남은 구조 정리

옛 communities/community_memberships/community_creation_requests/community_membership_changes 테이블,
역사 migration, 삭제 도구는 이번 코드 정리만으로 제거하지 않는다.
삭제 도구는 해당 테이블이 없으면 실패하도록 설계되어 있으며 운영 정리 실행 기록도 보존한다.
테이블 DROP은 배포 시점의 FK·현재 행·운영 복구 의존성을 다시 조사한 별도 migration 작업으로 분리한다.
과거의 빈 테이블이라는 사실만으로 현재 DB 구조 삭제가 검증된 것은 아니다.

옛 Neture 포럼 삭제·분석 화면은 community 전용 메뉴로 승격하지 않는다.
community 자체 게시판/공개 설정과 공통 Forum 중재 API의 지원 범위를 별도로 정리해야 한다.

자동 리뷰의 공통 계정 약관 주체 표시 지적을 반영해 해당 이름 변경을 철회하고 community 호스트 회귀 검사를 추가했다.
