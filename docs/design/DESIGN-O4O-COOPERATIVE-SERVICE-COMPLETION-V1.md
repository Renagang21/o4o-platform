# DESIGN-O4O-COOPERATIVE-SERVICE-COMPLETION-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-20
> **범위**: 조합 가입 기준·개인 참여 모아보기·회원 게시판 연결

상위 기준은 [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)과 기존 [협동조합 권한 설계](DESIGN-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1.md)다. 공급·콘텐츠는 [약국 매장 설계](DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)와 [진열 설계](DESIGN-O4O-BUSINESS-HOME-SHOWCASE-V1.md)를 재사용한다. 개발 범위는 [TODO](../work-orders/TODO-O4O-COOPERATIVE-SERVICE-COMPLETION-V1.md)다.

## 개인 참여

로그인 성공 후 `/cooperatives/mine`으로 이동한다. 특정 테스트 조합을 기본 목적지로 가정하지 않는다. 연합회 메뉴에 내 협동조합·내 처리 소식을 제공한다.

- `GET /api/v1/neture/cooperative-management/my-cooperatives`: 인증된 본인의 개인 가입 및 미해제 조합 관리 역할을 조회한다. 가입 상태와 역할은 별도 필드다. 정지·종료 조합도 상태를 알려주되 서비스 접근은 별도 서버 인가를 따른다. 개인 이메일·다른 사람의 가입은 반환하지 않는다.
- `GET /api/v1/neture/cooperative-management/my-updates`: 본인 대상 가입 접수·보완 요청·심사 결과·자격 및 역할 변경과 본인이 신청한 조합의 연합회 처리 결과를 최근 100건 제공한다. 일반 회원은 다른 사람의 검토 메모·운영 이력을 조회하지 않는다.
- 모두 활성·이메일 인증 계정을 요구하며 private,no-store다. 요청의 userId를 사용하지 않는다. 본인 소식은 기존 감사 이력의 조회이며 별도 알림 원장·읽음 상태·이메일/문자 발송은 생성하지 않는다. 승인 여부는 이 목록이 아닌 실제 권한 원장으로 판단한다.
- UI는 계정·조합 전환 시 이전 응답을 폐기한다. 오류를 빈 목록으로 표시하지 않고 재조회한다. 비로그인·개발 예시 화면은 개인 API를 요청하지 않는다.

## 가입 기준

`POST /api/v1/neture/cooperative-management/:coop/eligibility`는 `{eligibilityDescription,reason}`을 받는다. 각각 공백 제외 1~2000자다. 조합별 admin만 수정할 수 있고 연합회 역할·다른 조합 역할·operator는 대행하지 못한다.

조합 행 잠금 후 현재 권한을 확인하고 가입 기준을 수정하며 `eligibility_update` 처리자·시각·사유를 같은 transaction에 남긴다. 상태 변경용 varchar 필드에 긴 자격 문구를 저장하지 않는다. 이력은 변경 이유를 기록하며 이전 문구의 버전 저장 기능은 아니다. 동일 문구 중복 저장은 새 이벤트를 만들지 않는다.

약사·약국 경영자·일반 개인 등 대상과 제출 안내를 정관에 맞춰 자유롭게 기재한다. 면허 자동 검증·구조화된 자격별 필수 필드는 새로 도입하지 않는다. 기존 조합원의 상태·관리 역할·매장 권한은 수정하지 않는다. 저장 후 공용 디렉토리를 다시 조회하여 신청 화면에도 최신 기준을 반영한다.

## 운영 현황

연합회는 허용된 조합 목록의 상태별 개수를, 개별 조합 운영자는 해당 조합 회원 목록의 상태별 개수를 확인한다. 연합회에 개인 회원 정보·개별 조합 업무 통계를 새로 제공하지 않는다. 공급/콘텐츠 검토 대기는 기존 공통 운영 탭에서 처리한다. 추가 집계 테이블·배치 작업은 없다.

## 회원 게시판

사업 메타데이터 `GET /neture/pharmacy/businesses/:key`가 제공하는 communityKey로 기존 `/communities/:communityKey/forum`을 이용한다. 조합 slug에서 사업 코드나 게시판 코드를 추정하지 않는다.

- 기존 조합별 개인 회원·local role 판정을 통과한 계정만 목록·본문·글쓰기 화면을 이용한다. 서버는 매 요청마다 현재 사업 회원 자격을 재확인한다.
- 목록은 20개 단위 페이지 이동, `?post=<id>` 직접 본문 진입을 제공한다. 본문은 기존 `ForumPostContent`의 정화된 렌더링을 사용한다.
- 글쓰기는 선택한 게시판 ID와 제목·본문을 기존 API에 전송한다. 게시판 개설은 해당 조합 운영자만 기존 `POST /communities/:communityKey/boards`를 호출한다. 실제 인가는 서버가 담당한다.
- 별도 독립 커뮤니티 가입·새 포럼 원장·회원 권한 발급을 만들지 않는다. 접근 거절은 공개 포럼으로 우회하지 않는다. 저장 실패 시 입력 보존·재시도를 제공한다.
- 댓글·수정/삭제 등 포럼 추가 기능은 기존 API에 남아 있으나 이번 최소 연결 화면에는 포함하지 않는다.

## 공급·자료·내 매장

조합별 공급 조건 승인과 공급자 콘텐츠 승인, 조합 자체 콘텐츠 작성은 공통 운영 화면을 유지한다. 조합 자료 본문은 진열 화면에서 조회한다. 매장 사본 생성은 기존 `/neture/pharmacy/store/contents/:id/copy`와 매장 권한을 사용한다. 개인 조합원 가입으로 내 매장 접근이나 복사·주문 권한을 만들지 않는다.

운영 적용은 별도 통합 단계다. 신규 migration·의존성 변경은 없다. 공개 IAM·HTTPS·실제 조합 등록·권한 지정은 이번 개발에서 실행하지 않는다.
