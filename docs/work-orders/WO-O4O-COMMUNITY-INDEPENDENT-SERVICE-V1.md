# WO-O4O-COMMUNITY-INDEPENDENT-SERVICE-V1

> 상태: ACTIVE · 작성일: 2026-10-17
> 근거: 사용자가 업종별 3개 카탈로그·개설 신청 구조 폐기, 커뮤니티 자체 회원·운영·콘텐츠 귀속 전환을 지시했다.
> 범위: 코드·회귀 검증·PR. 운영 DB 변경·게시물 자동 이전·배포는 포함하지 않는다.

## 구현 계약

- `community.neture.co.kr`는 하나의 독립서비스다. 공통 계정 인증은 재사용한다.
- 직접 서비스 가입 신청은 `service_memberships(community, pending)`만 생성한다. 서비스 운영자가 기존 회원 관리 콘솔에서 승인한다.
- 다른 서비스의 상태를 커뮤니티 자격에 합성하지 않는다. 공통 계정 상태와 자기 서비스 회원·현재 운영 역할로 판정한다.
- 과거 `pharmacy/cosmetics/o4o-general` 카탈로그와 개설·개별 가입·역할 지정 API/UI를 폐기한다. 기존 변경 URL은 410, 폐기 공간 조회는 404다.
- 신규 게시판은 `service_code=community`. 과거 원장은 일반 API 제외 목록에 남겨 자동 공개를 막는다.
- 사업 회원 공간은 소유 사업의 현재 권한과 불변 저장 코드를 유지한다.
- 개별 가입 entity와 과거 이력 테이블은 개인정보·FK·기존 콘텐츠 귀속 조사 전 보존한다. 런타임 개설·가입 서비스와 승격 CLI는 제거한다.

## 소비처와 검증

공통 ForumControllerBase·service-forum router, KPA/Neture 옛 포럼 mount, generic 조회·추천 경로, Neture 앱의 community/CarePharm surface, My Home, 서비스 가입 facade가 소비처다.
기존 공간은 접근을 열지 않으며 신규 service workspace와 사업 공간을 따로 검사한다. 회원 상태·타 서비스 역할·공개/비공개·직접 UUID 조회·정책 동의·거절/정지 보존·폐기 URL·화면 회귀를 검증한다.

최종 결과와 미반영 운영 범위는 [CHECK](../checks/CHECK-O4O-COMMUNITY-INDEPENDENT-SERVICE-V1.md)에 기록한다.
