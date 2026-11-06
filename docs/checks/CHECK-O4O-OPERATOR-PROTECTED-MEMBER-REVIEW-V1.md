# Operator 회원 검토·전체 관리자 보호 CHECK V1

- 날짜: 2026-11-06
- branch: `wo/operator-protected-member-review`
- worktree: `/workspace/o4o-wt/operator-protected-member-review`
- base / push 전 origin/main: `44b2460b6dc8ee4ecbb97fe21747208c642525d9`
- TODO: [작업 목록](../work-orders/TODO-O4O-OPERATOR-PROTECTED-MEMBER-REVIEW-V1.md)
- 범위: 개발·로컬 검증·commit·branch push. PR 생성·main 병합·배포 없음.

## 결과

전체 관리자 계정이 관련 회원 조회 범위 안에 있으면 **전체 관리자 — 처리 대상 아님**으로 유지한다. 화면에서 변경 버튼을 제거하고, Operator용 API의 직접·일괄 변경을 차단한다. 활성·유효기간 내 `platform:super_admin`을 DB에서 판정하며 이메일·서비스 가입 유형으로 추정하지 않는다. 만료·비활성·미래 역할과 폐기된 `platform:admin`을 현재 전체 관리자와 혼동하지 않는다.

중앙 자격 화면의 하단 최소 폼을 회원 전체 정보 Drawer로 대체했다. 이름·연락처·가입 정보·현재 자격·허용된 사업자/약국 정보를 확인한 뒤 사유·근거 확인과 현재 자격 버전으로 저장한다. 상세 조회 실패·닫기·검색/페이지/계정/선택 변경 시 이전 응답을 폐기하며 중복 저장을 막는다. 신규 가입은 통합 회원 등록에서 한 번에 승인하고 이 화면은 추가 자격 변경 검토라는 현행 정책을 안내한다.

공통 회원 목록은 실제 batch API가 없어도 checkbox·Set 선택·상단 단일 상세 작업을 제공한다. 일괄 변경은 실제 batch API가 있는 경우에만 노출한다. 보호 대상은 row action·상세 footer·추가 bulk action과 일괄 승인/반려의 대상에서 제외한다. 서버에서는 혼합 일괄 요청에 보호 대상이 있으면 개별 쓰기 전에 거부한다. 약국협업체·약국 사업체 가입·분회 서비스 가입·파트너 회원 목록도 표준 선택과 ActionBar로 연결했다.

별도 Admin 계정 관리 API는 변경하지 않았다. 중앙 회원 정보 정정 API는 Admin 화면과 공유하므로 기존 전체 관리자 권한을 유지하면서 위임받은 Operator의 일반·과거 사업자·약국 정보 정정을 모두 보호한다. 기존 서비스/조직 Admin 보호, 자기 승인·최후 관리자 보호와 조직 경계는 완화하지 않는다. 콘텐츠 게시물 조정이나 사업체 자체의 운영 권한을 계정 보호 규칙으로 새로 확대하지 않는다.

## Consumer Impact Matrix

| 소비처 | 실제 경로·계약 | 영향 및 경계 | 검증 |
|---|---|---|---|
| 중앙 Neture 회원 | CentralMemberWorkspace / MemberWorkPanel / CentralMemberWorkspaceService | 조회 행 유지·수정/가입/해지 버튼 제거, 별도 Admin 모드 유지 | 화면 단위·실제 PG 정정/위임/rollback |
| 중앙 약사 자격 | CentralPharmacistQualifications / review GET·POST | 전체 정보 Drawer, 읽기 전용 자격 검토 grant, 직접 POST 보호 | 단위·HTTP·서비스·PC/mobile Chromium |
| Neture 기존 회원 | UsersManagementPage / 공통 UserDetailPage / memberships 및 registrations API | 목록·상세·단건·batch·역할 변경 경로 보호 | 공통 UI·서버 서비스 경계·등록 역할 계약·빌드 |
| 강의 | lecture-web OperatorMembersPage / ServiceMembersWorkspace | 조회 scope와 lifecycle 계약 유지 | 공통 서비스별 단위·빌드·중앙 강의 PC/mobile Chromium |
| 공급자·펀딩·커뮤니티 서비스 회원 | 중앙 renderer / ServiceMembersWorkspace | 기존 서비스 키·업무 위임 안에서 보호 | 서비스별 보호 단위·API namespace 경계·admin 빌드 |
| 커뮤니티 활동 삭제 | community-management.service | 보호 대상이면 삭제 계획 blocker, 기존 탈퇴/삭제·게시판 소유 판단 유지 | 기존 HTTP 회귀·공통 실제 PG 역할 판정 |
| 파트너 | 중앙/독립 PartnerCommunityOperator / PartnerCommunityService | 개인 회원 정지/복구 보호·버전/본인/업무 grant 유지 | PartnerSite 20건·공통 타입·partner 빌드 |
| 약국협업체 개인 조합원 | web-pharmacy-coop Management / cooperative-management.service | 조합 내부 권한 확인 후 검토·보완·결정 요청·최종 결정 보호 | Management 8건·HTTP·서비스 guard·coop 빌드 |
| 약국 사업체 가입 | PharmacyMembershipReviewPage / PharmacyMembershipService | 대상 신청자의 보호 역할 확인, 기존 Neture/자격·조직 경계 유지 | 공통 타입·API 타입·공통 UI 전체 회귀 |
| 분회 서비스 가입 | ServiceAdminPage / BranchServiceMembershipController | 가입 승인/반려 경로 보호, 분회 소속·연례 신고와 별도 | branch 빌드·공통 membership ID guard |
| 구 KPA/K-Cosmetics·PH 회원 관리 | 현재 앱 및 router 소비처 조사 | 폐기 앱/옛 주석·이력을 새 승인 경로로 복원하지 않음. 공통 API의 현재 KPA/Cosmetics scope 검사는 그대로 보호 | 기존 serviceBoundary·policy namespace 회귀 |
| 매장·공동약국·My Home·콘텐츠 | 계정/회원 심사 컴포넌트 직접 소비 없음 | 근무자·사업 참여·자기 정보 수정 권한 변경 없음 | import/route 소비처 조사 |

공통 패키지는 `operator-core-ui`, `ui`를 재사용한다. 분회/약국협업체 manifest·lockfile에는 표준 UI workspace 연결 3개만 추가했다. 분회 Tailwind content도 실제 추가된 공통 패키지 source를 포함해 버튼·선택 UI 스타일을 생성한다. Node·외부 패키지 버전·기존 peer snapshot은 변경하지 않았다. 경로 기반 literal-consumer 조사와 symbol/endpoint/실제 import 조사를 함께 수행했으며, 경로 스캐너의 “살아있는 소비처 0”을 runtime 소비처 부재로 해석하지 않았다. 공통 선택 규칙이 바뀐 approval-only 테스트는 상세 선택을 확인하도록 보정하고 batch API 없는 변경 금지 단언을 유지했다.

## 검증

- Node 22.23.4 / npm 10.9.9 / pnpm 10.25.0. frozen lockfile + store integrity 설치 PASS.
- `check:runtime` PASS: workflow 20 pins, Docker 17 stages, API 직접 의존성 73 exact versions. Windows 내장 Node 22.18.0 유지.
- API 관련 Jest 10 suites / 145 tests PASS. 이후 직접 사업자·약국 정정 보호를 추가하고 중앙 PG/HTTP 2 suites / 24 tests PASS (신규 보호 1건 포함, 중복 제외 전체 146건).
- 실제 일회용 PostgreSQL 15: 역할의 활성·유효기간·예약·폐기 역할 6건, 중앙 회원 정보·권한·정정·rollback 15건 PASS. 운영 DB·migration·seed 사용 없음.
- 공통 operator-core-ui Vitest 35 files / 238 tests PASS.
- 공통 UserDetailPage 서비스 경계·보호 대상 22건, 중앙 회원·자격 22건, 약국협업체 8건, PartnerSite 20건 PASS.
- 실제 Chromium: 1440px·390px에서 전체 정보 검토/단일 승인/목록 갱신과 강의 회원 보호 조회 4건 PASS. API는 합성 fixture를 사용하며 실제 승인·메일 발송 없음.
- API·admin type-check, admin 및 Neture·강의·파트너·약국협업체·분회 production build PASS.
- 기존 Browserslist/청크 크기 경고 유지. 기준을 낮추거나 외부 패키지를 업데이트해 숨기지 않았다.
- docs 민감정보 검사 PASS. 최종 문서·diff/staged scope 검사는 commit 전 gate로 실행한다.

## 문서 정합

CANONICAL-INDEX·ROLE-WORKSPACE V2·CURRENT-ADMIN-ROLE-POLICY의 현재 규칙에 사용자 결정을 반영했다. 통합 등록 단일 승인·추가 자격 변경 분리·조합 독립 운영 정본을 유지했다. 이전 WO/CHECK는 당시 증거로 보존하며 기존 성공 기록을 이번 실계정 검증으로 재사용하지 않았다.

## 보호·미실행

기준 checkout과 다른 세션의 7개 worktree·branch·로컬 파일을 수정하거나 정리하지 않았다. 새 작업 branch/worktree를 보존한다. 실계정·운영 서버 반영은 하지 않았으므로 배포된 사이트가 변경됐다고 보고하지 않는다. PR CI·Codex 리뷰·병합·배포는 통합 담당의 별도 단계다. 운영 승인은 이번 합성 브라우저·격리 DB 검증으로 대체하지 않는다.

## PR #950 리뷰 보완

자격 전용 검토 상세의 `readDocuments`는 실제 `neture.members` 위임에서 별도로 파생한다. 회원 조회 권한 없이 자격 검토만 위임받은 경우 첨부 존재는 표시하지만 문서 버튼을 비활성화해 403으로 검토가 닫히는 경로를 제거한다. 서류 API의 회원 조회·문서 소유 경계는 확대하지 않았다. false/true grant의 서버 계약과 화면 회귀를 추가했다.

리뷰 보완 로컬 검증: 중앙 회원·자격 UI 24건, 관련 서버 19건, PC/mobile Chromium 6건, API/admin type-check PASS.

두 번째 리뷰 보완: PostgreSQL이 허용하는 하이픈 없는/중괄호 UUID를 요청에서 거부한다. URL·가입 ID·batch 각 항목은 정형 UUID로 검증한 뒤에만 보호 검사와 핸들러로 전달한다. 검증할 수 없는 ID를 건너뛰지 않으며, 혼합 batch와 기존 등록 반려 경로의 우회 요청을 회귀에 추가했다.

UUID 보완 검증: 관련 API 5 suites / 116 tests 및 API type-check PASS.

## Sonar 품질 보완

GitHub check annotations로 Sonar의 12개 지적을 확인했다. 조회 상태 표시를 native output으로 바꾸고, async UI 검토 호출을 명시적으로 처리하며, 중첩 조건/역할별 동작 계산과 예외 분기를 분명히 했다. 제한된 50명 batch의 읽기 전용 보호 조회는 모든 ID를 검증한 뒤 Promise.all로 완료하며 어떤 대상도 쓰기 전에 검사한다. 품질 기준·제외 설정·권한 정책은 완화하지 않는다.

Sonar 보완 로컬 검증: 중앙 화면 24건, 공통 상세 22건, 파트너 20건, 관련 서버 33건, PC/mobile Chromium 6건 및 API/admin 타입·공통 UI 빌드 PASS.
