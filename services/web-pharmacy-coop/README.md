# 약국 협동조합 서비스 기본 구조

연합회 아래 개별 협동조합이 서브디렉토리로 소속되는 독립 프런트엔드의 시작점이다.
`pharmacy.neture.co.kr`의 회원 홈·게시판·자료·사업 참여/운영 구성을 **개별 조합**의 모델로 사용한다.
연합회 업무는 개별 조합 서비스와 구분한다. 목표 도메인은 `pharmcoop.neture.co.kr`, 최초 테스트 조합은 `/test`다.

## 실행

저장소 기준 Node 22.18.0 / pnpm 10.25.0을 사용한다. 저장소 루트에서:

```sh
pnpm install --frozen-lockfile
pnpm --filter @o4o/web-pharmacy-coop dev
pnpm --filter @o4o/web-pharmacy-coop build
pnpm exec vitest run --config services/web-pharmacy-coop/vitest.config.mjs
```

개발 서버 포트는 4210이다. 개발 모드에서 `/?preview=1`로 열면 예시 조합 두 곳을 표시한다.
이 값은 `import.meta.env.DEV`에서만 적용되므로 프로덕션에서는 예시가 표시되지 않는다.
preview에서는 예시만 표시하며 저장하지 않는다. 실제 가입·승인·역할은 인증된 서버 API에서 처리하며 localStorage 기반 가짜 인증은 사용하지 않는다.

## 화면 구조

| 경로                                           | 범위                                    |
| ---------------------------------------------- | --------------------------------------- |
| `/`                                            | 연합회 홈                               |
| `/cooperatives/mine`                           | 내 가입·관리 조합 목록과 상태·전환         |
| `/cooperatives/updates`                        | 본인 가입·심사·역할 변경 처리 소식         |
| `/cooperatives`                                | 소속 조합 목록                          |
| `/about`                                       | 연합회 소개·조합 가입 신청·내 신청 상태                   |
| `/operator`                                    | 연합회 산하 조합 심사·admin 지정    |
| `/:cooperativeSlug`                            | 개별 조합 홈·공지·회원 이야기·자료 진입 |
| `/:cooperativeSlug/membership`                 | 개인 가입·보완·탈퇴 요청·내 처리 이력         |
| `/:cooperativeSlug/community`                  | 회원 게시글 목록·본문·글쓰기·게시판 개설         |
| `/:cooperativeSlug/materials`                  | 해당 조합 자료 연결 위치                |
| `/:cooperativeSlug/services`                   | 조합 서비스·기존 내 매장 연결           |
| `/:cooperativeSlug/operator`                   | 조합원·operator 관리, 공급조건·콘텐츠 운영  |
| `/:cooperativeSlug/operator/contents/new`      | 조합 자체 콘텐츠 작성                   |
| `/:cooperativeSlug/operator/contents/:id/edit` | 게시 자료 편집                          |

프로덕션 조합 목록은 `/api/v1/neture/cooperatives`에서 조회한다. 등록되지 않은 조합을 표시하지 않는다.
알 수 없는 조합 주소는 다른 조합으로 대신 연결하지 않고 찾을 수 없음 화면으로 처리한다.
루트 메뉴와 충돌하는 조합 slug는 허용하지 않는다.

## 확정된 기본 모델

- 조합원은 개인이며 약사 자격이 가입의 공통 필수 조건은 아니다. 각 조합이 가입 자격을 정한다.
- 동일 개인은 여러 조합에 가입할 수 있다. 식별은 `(userId, cooperativeId)`이며 상태는 조합별로 독립한다.
- 가입 상태 모델은 pending/active/rejected/suspended/withdrawn이다. 가입·심사·상태 변경은 조합별 권한 검사와 이력 API로 처리한다.
- 연합회 운영 담당과 개별 조합 운영 담당은 별도 모델이다. 범위 간 관리 권한을 자동 상속하지 않는다.
- 개인 조합원 자격은 약국 소유·내 매장 이용 자격을 만들지 않는다.
- 약사이면서 약국 경영자인 사람의 매장 업무는 기존 `store.neture.co.kr`에 연결한다. 직원 위임 정책은 미확정이며 새 권한을 발급하지 않는다.

## 후속 연결 범위

인증·개인 가입·연합회/조합별 관리 API와 화면을 연결했다. 신규 migration 적용과 운영 배포·실계정 검증은 별도다.
프로덕션 앱은 공통 `AuthClient`·`useServiceAuth`의 이메일 로그인·세션 복구·로그아웃을 사용한다.
`SessionSnapshot`은 `/api/v1/neture/cooperatives/me`에서 본인 개인 가입과 담당 사업을 조회한다.
UI의 접근 판정은 서버 인가를 대신하지 않는다. 연합회 운영 권한은 자동 발급하지 않는다.

개인 조합원은 별도 `cooperative_memberships`에 저장한다. 가입 신청·심사 화면은 해당 조합의 개인 원장을 사용한다.
기존 `semi_franchise_memberships`는 약국 조직 기준이므로 개인 조합원 원장으로 재사용하지 않는다.
개인 가입/심사와 회원 게시판 목록·본문·글쓰기, 승인 자료 진열을 연결했다. 공급·콘텐츠 공통 운영 API 연결은 아래 갱신을 따른다.
연합회 가입 심사 기준·세부 업무, 회비/출자/의결, 직원 위임, 도메인·배포는 추가 업무 분석 대상이다.
개인 조합원 가입을 약국 조직 가입으로 대신하지 않는다. 기존 서비스 카탈로그·기존 서비스의 가입 판정은 변경하지 않는다.

## 2026-10-17 공급 조건·콘텐츠 운영 연결

`Cooperative.businessKey`에 실제 `semi_franchises.key`를 명시하고 `App.businessClient`에 기존 인증된
`PharmacyManagementClient`를 전달하면 해당 조합 운영 공간에서 공통 운영 UI를 사용한다.
사업 코드는 조합 주소에서 추정하지 않는다. 본 조합의 운영 자격·businessKey·인증된 전송 계층이
모두 있어야 연결하며, 실제 API는 산하 조합의 `cooperative_roles` 활성 배정을
다시 검사한다. 현재 프로덕션 진입은 서버 디렉토리·세션과 인증된 전송 계층을 연결한다.

- 공급 조건: 기존 공급자 공급 제안 등록 → 해당 사업 운영자 승인 API/화면 재사용.
- 자체 콘텐츠: 기존 조합 운영자의 작성·초안 저장·수정·게시·보관 흐름 재사용.
- 공급자 콘텐츠: main의 공통 서비스 등재 요청 → 콘텐츠 탭의 검토 대기 → 담당 운영자의 승인·게시 또는 사유가 있는 반려.
- 승인하면 접수된 검토 사본을 `semi_franchise_contents`에서 게시하므로 기존 사업 자료 조회·매장 사본 API를 그대로 쓴다.
- 조합의 개인 조합원 관리와 약국 조직 가입은 구분한다. 조합 운영 UI에는 개인 회원관리와 공급 제안·콘텐츠 두 탭을 연결하며 약국 조직 가입 탭은 노출하지 않는다.
- 교육은 기존 강의 서비스에서 회원 대상 강의를 운영한다. 협업체 코드에 강의 기능을 추가하지 않는다.
- 제휴 경영지원은 당분간 미구현, 공동 상품 기획은 오프라인 업무다.

공급자 콘텐츠는 main의 `AddSupplierBusinessContentRequests1792215000000`과 기존 콘텐츠 원장을 재사용한다.
협동조합 연결에서 별도 접수 테이블이나 중복 승인 API를 생성하지 않는다. Neture와 기존 약국 앱의 공통 운영 화면을 사용한다.

## 검증

타입 검사·프로덕션 빌드와 기존 루트 Vitest 인프라를 이용한 도메인/화면 테스트를 실행한다.
테스트는 복수 조합 가입·상태 격리·다른 사용자/조합 접근 차단·운영 범위 분리·알 수 없는 조합 경로를 확인한다.
브라우저에서는 개발 미리보기의 조합 전환·메뉴 직접 진입과 모바일 가로 넘침을 확인한다.

2026-10-16 로컬 검증: 최신 main 기준 frozen/offline 설치, 타입 검사·프로덕션 빌드,
ESLint, 도메인/화면 테스트 29개 통과. Chromium에서 두 조합 전환, 조합 메뉴 6개,
직접 URL·알 수 없는 조합 주소, 모바일 4개 화면의 가로 넘침 없음과 pageerror 0건을 확인했다.
프로덕션에서도 `?preview=1`이 예시 조합과 경로를 노출하지 않는 것을 확인했다.
기존 CI의 서비스별 테스트 목록·배포 대상에는 아직 등록하지 않았다. 이 검증은 로컬 기본 골격의
검증이며 서버 인증·가입 저장·운영 데이터·배포 검증을 대신하지 않는다.

## 테스트 조합 운영 연결 절차

**2026-10-27 운영 확인:** `테스트 협동조합` 등록과 지정 관리자·개인 회원 연결을 완료했다.
연합회 목록에서 `/test`로 진입하며 해당 조합 관리 주소는 `/test/operator`다.
등록·배포·권한 경계 및 검증 범위는 [운영 CHECK](../../docs/checks/CHECK-O4O-COOPERATION-OPERATIONAL-READINESS-V1.md)의 「테스트 조합 등록 완료·권한 검증」을 따른다.
아래 절차는 이후 재점검/운영 연결을 위한 것이며 현재 조합이 미등록이라는 뜻이 아니다.


`CreateCooperativeMemberships1792216000000`은 조합 디렉토리와 개인 조합원 원장을 추가한다.
스키마 migration은 기존 API 배포의 전용 migration Job에서만 실행한다. 데이터 등록은 별도이며
migration 자체가 계정·권한·예시 조합을 생성하지 않는다.

1. PR 필수 검사·리뷰·main 통합 후 기존 Delivery/Promote 경로로 API를 배포한다.
2. `Deploy cooperative test service` workflow에 해당 main HEAD SHA와 `apply=false`로 사전 검사한다.
3. 같은 SHA의 `apply=true`는 `test` → `coop-test` → 테스트 협동조합을 등록하고 사용자 지정 운영자·개인 조합원을 연결한다.
4. 최초 신규 Cloud Run 서비스의 공개 invoker IAM과 DNS·HTTPS 인증서·LB의 `pharmcoop.neture.co.kr` 호스트 연결은 인프라 소유자가 설정한다.
   - 조합 등록과 무관하게 앱만 먼저 열 때는 `frontend_only=true` 로 실행한다. 조합·조합원·운영자 데이터는 읽지도 쓰지도 않고 앱만 배포한다.
   - 서비스가 처음 생성되는 실행은 비공개로 만들고 revision Ready 조건만 확인한다. 이후 소유자가 공개 invoker 를 부여한다. 이미 있는 서비스는 기존처럼 0% 배포 → tag URL HTTP 검사 → 전환한다.
5. 공개 도메인에서 운영자·개인 조합원 로그인과 다른 조합 접근 거절을 확인해야 실사용 완료다.

이 수동 workflow는 저장소 소유자·배포 동결 해제·정확한 main HEAD·동일 SHA의 green CI·동일 SHA를 서빙하는 API를 요구한다.
실제 API 이미지 digest로 별도 등록 Job을 실행한다. 기존 계정의 활성·이메일 인증 상태가 필요하다. 지정 계정에는 테스트 조합의 최초 local admin만 연결하며 Neture 전역 운영 역할은 요구하지 않는다.
계정·비밀번호·전역 역할을 생성하거나 바꾸지 않는다. 이미 존재하는 다른 연결 또는 정지 상태는 자동 덮어쓰지 않는다.
개인 조합원 등록은 약국 조직 가입·내 매장 권한을 만들지 않는다. 신규 프런트엔드는 `/login`에서 공통 이메일 로그인 폼을 사용한다.
`coop`는 세션 로그아웃·폐기를 위한 독립 범위이며 일반 서비스 가입 원장으로 개인 조합원 자격을 대신하지 않는다.

현재 개발 검증은 운영 배포 완료를 의미하지 않는다. 위 단계의 실행 결과를 별도로 확인한다.

## 연합회·조합별 admin/operator

[권한 설계](../../docs/design/DESIGN-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1.md)와 [개발 TODO](../../docs/work-orders/TODO-O4O-COOPERATIVE-ROLE-AND-MEMBER-MANAGEMENT-V1.md)를 따른다.
연합회 admin은 산하 조합과 조합 admin을 관리하며, 연합회 operator는 심사·보완을 맡는다.
조합 admin은 해당 조합원의 최종 자격과 조합 operator를 관리한다. 조합 operator는 검토·보완·처리 요청만 하며 회원 자격을 직접 바꾸지 않는다.
연합회 역할은 개별 조합 관리 권한으로 전파되지 않는다. 기존 전역/사업 담당 관계도 조합별 역할을 대신하지 않는다.
`CreateCooperativeManagement1792300000000` 적용 후 새 API를 사용한다. 개발 push와 운영 migration·배포는 별개다.

## 2026-10-20 개인 참여·가입 기준·게시판 연결

[설계](../../docs/design/DESIGN-O4O-COOPERATIVE-SERVICE-COMPLETION-V1.md)와 [TODO](../../docs/work-orders/TODO-O4O-COOPERATIVE-SERVICE-COMPLETION-V1.md)를 따른다.
로그인 후 특정 `/test` 대신 `/cooperatives/mine`으로 이동한다. 내 가입 상태·관리 역할은 별도 표시하며 중단 조합도 상태만 확인할 수 있다.
`/cooperatives/updates`는 본인의 가입·보완·자격/역할 처리 결과 최근 100건이다. 공통 알림 원장을 복제하지 않으며 이메일·문자 발송이나 읽음 상태 저장은 포함하지 않는다.
조합 admin은 운영 화면에서 가입 자격·제출 안내를 변경하고 사유를 남긴다. operator나 연합회 역할은 이를 대행하지 못한다. 기존 회원 상태·약사/내 매장 권한은 바꾸지 않는다.
연합회 조합/개별 조합 회원 상태 집계를 제공한다. 회원 게시판은 실제 businessKey의 communityKey로 기존 API를 이용하며 목록·직접 본문·페이지 이동·글쓰기와 운영자 게시판 개설을 연결한다.
공급/콘텐츠 승인은 기존 운영 탭을, 매장 자료 복사는 기존 내 매장을 사용한다. 신규 migration과 운영 데이터 등록은 없다.

## 2026-10-21 포럼 분리·화면 배치

[화면 트리·설계](../../docs/design/DESIGN-O4O-COOPERATIVE-FORUM-LAYOUT-V1.md)와 [개발 TODO](../../docs/work-orders/TODO-O4O-COOPERATIVE-FORUM-LAYOUT-V1.md)를 따른다.
`/community`는 조합원 이야기(회원 작성), `/materials`는 조합 소식·자료(운영자 작성 및 공급자 자료 승인·게시)다.
공식 소식·자료는 기존 showcase가 허용하는 게시·노출 content만 표시하고 제품 항목은 제외한다. 직접 상세는 `?item=`으로 연다.
홈은 진열 순서의 주요 소식·자료 최대 3건, 최근 조합원 이야기 최대 5건과 참여 상태를 표시한다. 별도 공지 분류·고정 기능은 추가하지 않았다.
서비스 화면에는 기존 제품·콘텐츠 진열과 강의·내 매장 링크를 유지한다. 개인 조합원 자격을 구매·매장 권한으로 바꾸지 않는다.

조합 운영은 개요와 `?work=members|contents|boards|proposals|settings` 업무로 나누고 선택한 업무만 연결한다.
`settings`는 조합 admin 전용이며 가입 기준과 조합 operator 관리를 제공한다. 일반 포럼 게시판 개설은 `boards`로 옮겼다.
`/operator?tab=contents|proposals`와 기존 콘텐츠 작성·편집 URL은 계속 동작한다. 홈 Hero 편집도 기존 경로를 유지한다.
연합회는 산하 조합 심사와 `?work=operators`의 연합회 operator 관리(admin 전용)를 분리한다.
개발·검증·push와 실제 운영 배포는 구분한다. 새 migration·운영 데이터 등록·공통 모듈 변경은 없다.
