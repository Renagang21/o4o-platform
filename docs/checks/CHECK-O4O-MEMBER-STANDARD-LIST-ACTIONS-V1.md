# 회원 표준 리스트·기본 업무 복구 검증

- 상태: ACTIVE · 개발 검증 기록
- 작성일: 2026-11-01
- 기준 main: `8e17ba0b8b`
- 작업: [TODO](../work-orders/TODO-O4O-MEMBER-STANDARD-LIST-ACTIONS-V1.md)
- 종료 범위: 로컬 검증·commit·push. PR 생성·main 병합·배포 없음.

## 문제와 구현

DataTable을 사용했으나 selectable/selectedKeys/ActionBar가 없어 체크 후 업무가 사라져 있었다.
AGENTS.md §3-1에 모든 리스트의 O4O 표준 원칙·선택 작업·회귀 점검을 명시했다.

- 현재 페이지 전체 선택·행 체크·선택 해제·상단 작업을 복구했다. 상세·회원 수정·가입 거부·삭제·약국/사업자 정보가 상단에 표시된다.
- 복수 선택은 선택 회원 순차 상세 검토, 수정·거부·삭제는 단일 선택에서 확인한다. 탭/검색/페이지/새로고침·권한 실패에 오래된 선택/상세를 재사용하지 않는다. 상세 조회 중 401/403이면 기존 행·선택·권한 표시도 즉시 제거한다.
- 회원 기본정보 정정은 유효 중앙 members 업무를 가진 담당자의 이름·닉네임·휴대전화로 제한한다. 전체 관리자 정보는 전체 관리자만 정정한다. 이메일·역할·면허를 일반 수정에 섞지 않는다.
- 약국명·사업자등록번호·대표자·업태/종목·주소·연락·세금계산서 정보는 members와 pharmacies 업무를 함께 확인한다. 근거 확인·사유·원장/조직 결합 버전과 신청자 귀속을 검증한다.
- 약국 신청 원장과 조직/사업 프로필을 같은 transaction으로 정정한다. 중복 사업자번호·공유 조직 이상·변경 충돌을 거절한다. 기존 등록증 파일과 면허·승인 상태·관련 없는 metadata는 유지한다.
- 과거 Neture 사업자 정보는 applications 업무와 대상 Neture 가입 원장을 함께 검사한다. 알려진 필드와 기존 대표자 alias만 정정하고 다른 서비스 정보·기타 필드는 보존한다.
- 가입 거부는 pending 공통 계정에 대한 전체 관리자 업무다. 활성 계정과 서비스 가입 거부/이용 중지를 혼동하지 않는다. 본인·운영 권한 계정은 거부하지 않는다.
- 회원 삭제는 기존 AccountErasureControls/API를 재사용한다. 전체 관리자 경계·사용중지 선행·보존 검토·요청/실제 완료 구분을 유지한다. 일반 담당자에게는 제한 사유를 표시한다.

## 실행 검증

- Node 22.18.0 / pnpm 10.25.0, frozen-lockfile 설치 및 공통 패키지 빌드 완료.
- Admin·API 타입 검사, Admin production build, 변경 소스 ESLint, diff 공백 검사 통과.
- API/HTTP/메뉴/기존 약사 심사 4 suites **40 tests PASS**, PostgreSQL 조건부 SKIP 없이 실제 실행.
- 최종 metadata 보존/대표자 alias 보완 후 PostgreSQL suite **12 tests 재검증 PASS**.
- 실제 PostgreSQL: 권한/귀속/버전/중복 사업자번호, 기본정보/사업자 정정, 대기 가입 거부, 관련 없는 값 보존, 감사 기록 실패 시 원장과 조직 전체 rollback 확인.
- Admin 회원/삭제 상태/중앙 운영 회귀 **3 files 28 tests PASS**.
- 실제 운영 번들 Chromium **1440/390**: 전체 선택→복수 수정 차단→단일 체크→상단 회원 수정→약국 사업자 정정→대기 가입 거부→삭제 검토 대기→서버 완료 후 목록 제거.
- 각 viewport 합성 쓰기 4회(회원 PATCH·약국 PATCH·거부 POST·삭제 DELETE), 예상 밖 API 0, JS 오류 0, 문서 가로 넘침 0, 완료 후 남은 행 1. 검토 대기를 삭제 성공으로 표시하지 않음을 확인했다.

## 최초 실패와 수정

공통 패키지 빌드가 끝나기 전 병렬 타입 검사에서 의존성 선언을 찾지 못해 실패했다. 빌드 완료 후 타입 검사를 다시 실행해 통과했다.
위임 회수 테스트가 공유 fixture를 비활성화한 뒤 새 수정 테스트를 시작해 403이 났다. 해당 새 테스트에서 재위임을 명시하고 권한 회수 검증은 유지했다.
초기 결과를 성공으로 덮지 않고 수정 후 SQL/HTTP·브라우저 결과를 기록한다.

## Shared Module Change Verification

### Changed shared module

공통 DataTable/ActionBar/AccountErasureControls 자체는 변경하지 않고 Admin 회원 소비처가 정식 API를 다시 사용한다.
AGENTS.md는 후속 모든 리스트 작업의 점검 원칙이며 다른 리스트를 전환했다고 주장하지 않는다.

### Consumer impact matrix

| 소비처 | 영향 | 증거 |
|---|---|---|
| Admin 중앙 회원 | 체크·상단 작업·상세/수정·거부·삭제·약국 정정 | 타입·빌드·UI·실제 번들 PC/mobile |
| 중앙 위임/메뉴 | 기존 members·qualifications·pharmacies·applications 분리 유지 | 실제 SQL·HTTP 권한/메뉴 회귀 |
| 회원 기본정보 | 제한된 필드·버전·사유·관리자 계정 보호 | 실제 SQL·HTTP allowlist |
| 약국·내 매장 | 신청/조직 프로필 동기화, 승인/면허/증빙 불변 | 실제 SQL·감사 실패 전체 rollback |
| 기존 Neture 사업자 | 기존 입력만 정정, 다른 서비스/unknown metadata 보존 | 실제 SQL |
| 공통 삭제 UI | 구현 재사용, 권한 확장 없음 | 기존 삭제 6 tests 및 합성 상태/완료 흐름 |
| 기타 서비스 리스트·Core/erasure | 코드 변경 없음 | 기존 경계 재사용, 직접 소비처 밖 수정 없음 |

### Route / role / capability check

중앙 members 기존 API 하위에 business correction / pending rejection 명령만 추가했다. Google 세션·실시간 위임·각 업무 권한·사유·버전을 서버에서 확인한다.
새 역할·테이블·migration·일괄 삭제를 만들지 않았다. 기존 실제 삭제 write-path와 보존 정책을 우회하지 않는다.
새로운 개인정보를 목록에 추가하지 않으며 약국/면허는 상세에서 별도 위임을 확인한다.

### Smoke result and limits

운영 DB·회원·약국·증빙 파일·메일·배포를 사용/변경하지 않았다. PostgreSQL은 이번 작업 전용 일회성 컨테이너다.
브라우저 계정/API/삭제 결과는 모두 합성이며 실제 운영 계정 삭제 완료의 증거가 아니다.
현재 worktree와 기준 checkout에 비공개 테스트 계정 기준 파일이 없어 운영 로그인 검증은 미실행이다.
그 한계를 합성 검증으로 대체 완료했다고 보고하지 않는다.

## 문서 정합·작업공간

회원관리 정본의 이전 Admin 전용 기본정보 수정 문구를 이번 사용자 지시의 위임 업무로 정정했다. 계정 거부/삭제의 관리자 경계는 유지했다.
전용 worktree `/workspace/o4o-wt/member-standard-list-actions`, branch `wo/member-standard-list-actions`는 push 후 후속 개발/통합을 위해 KEEP한다.
기존 문의 작업 branch와 기준 checkout은 변경하지 않는다. 검증 로그·합성 화면은 `/tmp/member-standard-*`에 보관하고 공개 커밋에 넣지 않는다.
실제 commit·push SHA와 로컬 상태는 최종 보고로 전달한다.

## main 통합 전 Codex 검토 보완 (2026-11-01)

사용자의 후속 main 병합·배포 지시로 PR #919를 생성했다. 최신 main #918은 정상 merge로 반영했다.
Codex P1 검토에서 users.businessInfo의 실제 타입(json)과 테스트 fixture(jsonb)의 차이를 발견했다.
기존 buildBusinessInfoUpdate 헬퍼로 json→jsonb 부분 병합→json 저장을 재사용하고, fixture를 실제 json 타입으로 변경했다.
기존 사업자 정정 검사에서 실제 컬럼 타입까지 확인하며 관련 PostgreSQL·HTTP 17 tests를 재검증해 통과했다.
기존 jsonb fixture에서의 통과를 실제 json 컬럼의 저장 성공 근거로 쓰지 않는다. 운영 DB schema 변경은 없다.
이후 동일 HEAD의 원격 CI·Codex 재검토와 병합/배포 증거는 PR과 최종 통합 보고에서 확인한다.

### 삭제 응답 잠금·기존 정적 가드 후속 보완

Codex P2 지적으로 삭제 요청 시작부터 응답 처리까지 부모 회원 작업 잠금을 공유한다.
검토/완료 응답 전 선택·탭·상단 명령이 바뀌지 않고, 잠금을 해제한 뒤 완료 콜백이 목록을 갱신하도록 순서를 고정했다.
AccountErasureControls의 선택적 onBusyChange 콜백은 중앙 회원 화면에서만 사용한다. 다른 소비처 PlatformUsersPage는 기존 동작을 유지하며 기존 삭제 UI 6 tests도 통과했다.
대기 계정의 세부 운영자 역할(CarePharm·Drugstore·연합회 등)도 가입 거부 보호에 포함했다.

기존 CI의 business-info-json-column-guard가 수동 UPDATE+표현식 생성 조합을 인식하지 못해 실패했다.
가드를 완화하지 않고 buildBusinessInfoUpdateStatement의 표준 SQL 전체 쓰기 경로를 사용했다.
실제 json 컬럼·세부 역할 보호·기존 정적 가드·HTTP 21 tests와 Admin/삭제 UI 29 tests 통과.
1440/390 실제 번들에서 삭제 응답을 지연시켜 명령/탭 잠금, 응답 후 검토 상태 보존, 실제 완료 이후 목록 갱신을 확인했다.
이 보완도 운영 데이터 변경 없이 같은 PR에서 검증한다.
