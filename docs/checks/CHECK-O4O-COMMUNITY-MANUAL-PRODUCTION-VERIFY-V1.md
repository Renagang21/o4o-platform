# 커뮤니티 운영자·회원 관리 사용자 직접 검증

> 상태: 사용자 검증 대기 · 작성일: 2026-10-10
> 근거: 사용자 직접 테스트 예정, 미실행 항목 보존 및 push 지시
> 관련 TODO: [운영 검증 TODO](../work-orders/WO-O4O-COMMUNITY-PRODUCTION-ROLE-VERIFY-V1.md)

## 현재 확인된 범위

구현 PR #412는 main 병합·운영 배포 완료다. 배포 커밋 `b29c0d46cb`의 migration/API/Neture와 production 상태 `DEPLOYED`를 확인했다. 구현 단계의 로컬 회귀·독립 PostgreSQL·mock 브라우저 검증은 [구현 CHECK](CHECK-O4O-INDIVIDUAL-COMMUNITY-MEMBER-ADMIN-V1.md)를 따른다.

운영 API health·커뮤니티·중앙 관리자 HTTP 200, 비로그인 지정 목록·회원 목록·변경 이력 API HTTP 401을 확인했다. 실제 Playwright에서 desktop 1440/mobile 390 로그인 화면은 HTTP 200, 이메일 입력 렌더, pageerror 0이었다. Google 스크립트는 클라우드 proxy에서 403 차단되어 로그인은 완료하지 못했다. 네트워크 설정 초안 저장도 `draft_not_editable`로 실패했다. 이는 이 클라우드 실행 조건이며 사용자 브라우저의 서비스 결함으로 판정하지 않는다.

아래 표는 모두 **실제 계정으로 미실행**이다. 자동 테스트 통과를 운영 검증 통과로 대신하지 않는다. 사용자에게 검증을 인계하며 역할·회원 상태를 임의 변경하지 않았다.

## 준비

1. 비공개 `docs/local/TEST-ACCOUNTS.local.md`의 공통 운영자 Google 계정으로 로그인한다. 계정 정보를 결과 문서에 복사하지 않는다.
2. `admin.neture.co.kr`에서 중앙 서비스 역할을 확인한다. 서비스 역할 `community:admin/operator`와 개별 커뮤니티 역할 `admin/operator/member`는 별개다.
3. 테스트 커뮤니티 A/B와 테스트 회원을 사용한다. 승인·반려에는 각각 별도의 pending 가입이 필요하고, 탈퇴에는 일회용 가입이 필요하다. 기존 회원과 운영 커뮤니티 최후 admin을 대상으로 검증하지 않는다.
4. 별도 브라우저 프로필 또는 시크릿 창으로 중앙 서비스 admin, 개별 admin, 개별 operator, 일반 회원을 구분한다. 공통 계정에 `community:admin`이 있으면 개별 operator로 낮춰도 중앙 권한이 남으므로 operator 제한을 검증할 수 없다. 중앙 권한 없는 별도 테스트 계정을 사용한다.
5. 시작 전 역할·가입 상태·타 서비스 상태를 비공개로 기록한다. 아직 Google 로그인이 되지 않으면 실패 단계만 기록하고 역할 변경을 진행하지 않는다.

## 직접 테스트 체크리스트

| 완료 | 상황 / 실행 | 기대 결과 |
|---|---|---|
| [ ] | 중앙 관리자에서 community 서비스 admin/operator를 각각 지정·변경·회수 | 역할이 구분되어 저장된다. 플랫폼 계정 관리와 서비스 운영자 지정은 구분된다. |
| [ ] | community 서비스 admin으로 `community.neture.co.kr/admin/communities`에서 테스트 커뮤니티 선택, 활성 회원의 개별 역할 변경 및 사유 입력 | admin/operator/member 선택이 가능하고 결과가 다시 조회된다. |
| [ ] | community 서비스 operator 또는 개별 admin으로 개별 역할 지정 시도 | 지정·회수가 차단된다. 화면 숨김뿐 아니라 API도 차단된다. |
| [ ] | 중앙 역할 없는 개별 operator로 `community.neture.co.kr/mypage/communities` 접속 | 지정된 A의 회원 조회 가능. 별도 pending 회원의 승인·반려 가능. |
| [ ] | 위 operator로 제재·해제·탈퇴·이력 접근 확인 | admin 전용 기능이 노출되지 않으며 직접 API 접근도 거부된다. |
| [ ] | 개별 admin으로 활성 테스트 회원 정지, 사유 입력 | A 가입만 suspended. 목록 필터에서 확인되고 이력에 사유·변경 전후 상태가 표시된다. |
| [ ] | 위 회원의 정지 해제 | A 가입만 active로 복구. 공통 계정 또는 타 서비스 정지를 복구하지 않는다. 메인/서비스 자격이 유효하지 않으면 해제가 거부된다. |
| [ ] | 개별 admin으로 일회용 테스트 가입 탈퇴 | A 가입 withdrawn, 역할 member. 공통 계정·다른 가입은 유지된다. 해제를 탈퇴 복구 기능으로 취급하지 않는다. |
| [ ] | A만 지정된 개별 운영자로 B의 회원 목록·이력·변경 API 접근 | B 운영 접근 차단. A URL에 B의 가입 ID를 넣어도 조회·변경되지 않는다. |
| [ ] | 중앙 admin이 개별 admin을 operator로 변경; 대상 브라우저는 로그아웃하지 않고 다음 요청 | 조회·심사는 유지되고 제재가 차단된다. UI는 새로고침해 비교한다. |
| [ ] | 중앙 admin이 개별 operator를 member로 회수; 대상은 기존 로그인 유지 | 다음 운영 API 요청부터 차단된다. 이전에 화면에 표시된 데이터 자체의 즉시 삭제와 혼동하지 않는다. |
| [ ] | 전용 테스트 커뮤니티에 유효 admin 1명만 남기고 역할 회수·정지·탈퇴 시도 | `LAST_ADMIN_PROTECTED`로 거부된다. 다른 operator만 있어도 보호가 해제되지 않는다. 중앙 서비스 admin의 복구 접근은 유지된다. |
| [ ] | 마이그레이션 전 개별 operator였던 테스트 회원 확인 | 개별 admin 전환 및 기존 가입 상태 보존 확인. 비교할 이전 기록이 없으면 미확인으로 남긴다. |
| [ ] | desktop/mobile에서 역할 지정·목록 필터·심사·제재·이력 확인 | 버튼·입력·목록이 사용 가능하고 결과/오류가 표시된다. |

## 화면 숨김과 API 차단을 구분하기

브라우저 개발자 도구 Network에서 해당 요청의 HTTP 상태와 응답 code를 확인한다. 중앙 서비스 admin의 성공 요청 형태를 기준으로 테스트 계정 브라우저에서만 재현한다. 사유 필드를 비워 발생한 입력 오류를 권한 차단으로 판정하지 않는다. 직접 변경 API는 반드시 테스트 가입 ID로 호출한다. 요청 헤더의 토큰·쿠키 또는 응답의 개인정보를 공개 기록에 붙이지 않는다.

| 기능 | API (`api.neture.co.kr` 기준) |
|---|---|
| 개별 역할 지정 | `POST /api/v1/communities/admin/communities/:communityId/members/:membershipId/role` — `role`, `reason` |
| 회원 목록 | `GET /api/v1/communities/:communitySlug/memberships` |
| 승인·반려 | `POST /api/v1/communities/:communitySlug/memberships/:membershipId/approve` 또는 `/reject` |
| 제재·해제·탈퇴 | 같은 가입 경로의 `POST /suspend`, `/restore`, `/withdraw` — `reason` |
| 변경 이력 | 같은 가입 경로의 `GET /history` |

## 종료·결과 기록

역할 변경과 정지 테스트는 기록한 시작 상태로 복구하고 다시 조회한다. 승인·반려·탈퇴 테스트는 원상 복구를 전제로 하지 않으며, 테스트 전용 가입임을 확인한다. 계정 삭제·직접 SQL·운영 migration 재실행으로 정리하지 않는다.

각 항목에 PASS / FAIL / 미실행을 기록하고, FAIL에는 사용 역할·화면 경로·HTTP 상태·응답 code·기대/실제 결과를 남긴다. 실명·이메일·토큰을 마스킹한다. 실제 제재 후 공통 계정과 타 서비스 상태를 확인하지 못했다면 격리 검증은 미확인이다. 모든 항목이 확인되거나 미확인 사유가 명시되기 전에는 운영 검증 전체 완료로 보고하지 않는다.
