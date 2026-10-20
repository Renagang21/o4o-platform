# 관리자 메뉴 제거·역할 및 대상 정책 정비 개발 검증

> **상태**: COMPLETED
> **작성일**: 2026-10-20 · **최종 갱신**: 2026-10-20 (Asia/Seoul)
> **근거 WO/IR**: [구현 TODO](../work-orders/WO-O4O-ADMIN-PLATFORM-MENU-ROLE-CLEANUP-V1.md)
> **관련 정본**: [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) · [역할 정책](../baseline/ROLE-POLICY-AND-GUARD-V1.md) · [KPA 역할](../baseline/KPA-ROLE-MATRIX-V1.md)

## 판정·범위

기준 main `5b2f6bd9eea66709004dd4640419f6867842fcf9`, branch `wo/admin-platform-menu-role-cleanup`의 개발 검증이다. 운영 적용 완료 판정이 아니다.

서비스 관리·서비스 대상 정책·역할 관리 탭과 홈 카드·페이지·전용 client를 제거했다. 기존 주소 4개는 플랫폼 홈으로 이동하며 기존 관리자 guard를 통과해야 한다. 전체 관리자 로그인·계정/사용자 화면·운영자 지정은 유지한다. 관리자 전용 서비스 catalog GET/PATCH와 directory, 대상 정책 조회/저장 API 등록을 제거했다. 공개 서비스 catalog와 다른 서비스에서 소비하는 공유 역할 API는 유지한다.

현재 O4O 대상에 대한 사용자 결정에 따라 서비스별 약국 대상 체크와 정책 DB 조회를 공급 상품·판매자 모집·매장 상품 등록/활성화·자동 공급 SQL에서 제거했다. 공급사·약국의 의약품 취급은 기존 공급 범위로 처리한다. 상품 실재·등록/게시 분리·공급자 소유권·승인·가격·조직 소속과 기존 서비스 승인·허가번호 검증은 유지한다. 소비자 판매·결제는 추가하지 않는다.

## 역할 정비

| 범위 | 결과 |
| --- | --- |
| 현재 플랫폼 관리 | `platform:super_admin` 유지 |
| 과거 플랫폼 세부 역할 | `platform:admin/operator/manager/vendor/member/contributor`를 현재 조회·발급·인가에서 제외 |
| 과거 KPA 조직 역할 | `kpa:district_admin/branch_admin/branch_operator` 제외. 현행 `kpa-branch:*` 유지 |
| 과거 자격 역할 | `kpa:pharmacist/student` 제외, 자격 프로필은 유지. asset snapshot 허용 잔재 제거 |
| 과거 LMS | `lms:instructor` 제외. 현행 `lecture:*` 유지 |
| 기존 퇴역 서비스 | cosmetics·PharmacyHub의 기존 차단 유지 |

실제 DB에 과거 활성 행이 있어도 중앙 RoleAssignmentService의 발급/권한 판정과 RoleService의 현재 카탈로그/이름 조회에 쓰지 않는다. 전체 사용자 조회의 역할 투영도 같은 퇴역 판정을 따른다. 원본 역할 정의·할당 이력의 물리 삭제, 활성 보유자 수의 운영 실측은 수행하지 않았다.

추가 리뷰에서 확인된 관리자 `/users`와 서비스 회원 콘솔의 목록·상세 역할 투영도 같은 중앙 퇴역 판정으로 필터링했다. 현재 역할·서비스별 조회 경계·계정 상태를 보존하며 과거 원본 행은 변경하지 않는다. 해당 컨트롤러 회귀 2 suites / 42 tests PASS. 추가 lint 오류 0이며 기존 AdminUserController의 미사용 UserStatus 경고 1건은 유지했다.

## 실행 결과

| 검증 | 결과 |
| --- | --- |
| API 집중 Jest | 12 suites / 266 PASS. 실제 의약품 guard, 공급 게시/등록, 타 공급사 소유권·승인·가격·트랜잭션, 역할 퇴역, API 등록 제거, 판매자 모집·서비스 식별 회귀 |
| 역할 최종 보완 후 재검증 | 2 suites / 31 PASS |
| 관리자 Vitest | `src/tests` 전체 26 files / 424 PASS |
| 실제 관리자 앱 Chromium | 4 PASS, desktop 1280×800 / mobile 390×844. 남은 탭·계정/사용자 진입, 제거 주소 4개 직접 진입·새로고침, 제거 API 호출 0, 쓰기 0, page error 0, 서비스 운영자 거부·비로그인 Google 로그인 이동 |
| 타입·빌드 | API와 관리자 type-check·build PASS |
| 변경 파일 ESLint | 오류/경고 0 |

데스크톱·모바일 최종 캡처에서 3개 탭과 카드 배치·가로 넘침 없음을 확인했다. 브라우저 인증과 모든 API는 로컬 fixture이며 실제 Google 로그인·운영 DB 응답을 검증한 것으로 보고하지 않는다. 초기 API 타입 검사는 최신 main의 공유 타입에 비해 설치된 dist가 오래되어 실패했고 기존 `@o4o/types` build 후 통과했다. 이전 정책을 고정한 소스 계약 assertion과 신규 테스트의 줄바꿈 lint를 현행 계약에 맞게 보완했다. 기존 DB 선택 통합 suite 1개는 최초 실행에서 환경 조건으로 skip됐으며 12개 집중 suite의 통과 수에 포함하지 않는다.

## 미실행·적용 경계

운영 DB 접속·역할/계정 삭제·DDL·migration·seed·정책값 변경은 실행하지 않았다. 정책 entity와 과거 migration/스키마는 기존 테이블 대응용으로 보존하며 runtime 설정 기능은 없다. 실제 PostgreSQL에서 자동 공급 SQL을 실행하거나 실제 공급사·약국으로 상품을 등록·게시하는 운영 검증은 하지 않았다. 외부 유료 API 호출도 없다.

main 병합·PR CI·운영 배포는 미실행이다. API·관리자 배포가 필요하며 역할 인가 변경은 현재 Delivery의 위험 판정을 따라야 한다. 개발 검증을 운영 반영 증거로 사용하지 않는다.

문서 정합: 같은 트랙의 WO와 현행 정본 3곳에 사용자 결정을 연결했다. 과거 WO/CHECK 본문과 canonical index는 수정하지 않았다.

## 후속 통합 검사 보완

PR #742에서 Neture·약국 서비스의 옛 역할 편집 진입과 Neture 대상 정책 메뉴 잔재 P2 두 건을 추가 정비했다. 해당 변경 후 관련 계약 3·Neture 메뉴 3·약국 메뉴 렌더 8 tests 및 두 웹 build가 통과했다. 전체 CI의 API shard 2에서는 메뉴 분류 테스트가 제거된 `/operator/roles`를 계속 요구해 1건 실패했다(당시 184 suites / 3,051 tests 통과, 나머지 skip 별도). 기능 복구나 assertion 생략 대신 역할 편집 메뉴가 없어야 한다는 현행 계약으로 바꿨다. 이미 실패한 PR 실행은 완료 로그 확보를 위해 종료하고 수정 HEAD에서 전체 CI를 다시 실행한다. 관련 권한 회귀 3 suites / 99 tests는 별도로 재통과했다.

재리뷰 보완: 서버가 제공하는 Neture 대시보드 `manage-roles`와 약국 운영 대시보드 `qa-roles` 빠른 실행도 제거했다. 프런트 메뉴뿐 아니라 API 응답을 만드는 두 source의 역할 편집 링크 부재를 회귀 검사에 추가했다. 역할 할당을 위한 카탈로그 API와 이력 조회용 데이터는 그대로 유지한다. 추가 보완 2 suites / 29 tests PASS. 추가 파일 lint 오류 0이며 기존 Neture 대시보드의 미사용 userId 경고 1건은 변경 범위 밖으로 유지했다.


### 동결 문서 정합 보완

공통 역할 baseline은 main의 원래 본문을 보존하고 부분 대체 표기만 추가했다. 사용자 결정은 별도 [현재 관리자 역할 정책](../baseline/O4O-CURRENT-ADMIN-ROLE-POLICY-V1.md)에 기록했다. 역할 퇴역·서비스별 경계·이력 보존의 범위는 동일하다.
