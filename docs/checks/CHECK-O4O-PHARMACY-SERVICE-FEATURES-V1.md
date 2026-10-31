# 공통 기능 판정·약국 협력사업 최소 관리자 설정

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: 로컬 구현·검증 완료, 개인회원 유료 원장 연결은 후속 확인
> **작성일**: 2026-10-16
> **범위**: 사용자가 승인한 ① 공통 판정과 ② 최소 관리자 설정
> **기준**: main `033f167d7430fe90b109a0cea3f05346841ee2c0`

## 구현

기존 협업체 운영 조직 metadata에 기능 목록을 저장하고 기존 관리자 생성·수정 화면에서 체크한다.
카탈로그는 서버 한곳이며 태블릿과 다국어 상품 콘텐츠만 포함한다. 협업체별 코드 분기·새 DB 원장·schema·migration·dependency 변경은 없다.
현재 협업체 가입과 사업 상태로 기능을 합산하며, 실제 접근 조직은 기존 매장 guard가 정한다.
무료 초대 직원·기존 회원/매장 원장·원본/독립 사본·전문인 권한 계약은 바꾸지 않는다.

정본과 HTTP 계약: [약국 설계 §15-4](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md#15-4-공통-제공-기능-판정최소-관리자-설정-2026-10-16).

## 소비처와 인계

- 서버: `modules/neture-pharmacy/services/service-features.ts`의 `PharmacyServiceFeatureService.resolve/require`. 입력 userId는 인증된 사용자, organizationId는 기존 접근 guard가 확정한 매장이다. 직접 요청 값으로 권한을 부여하지 않는다.
- 관리자: `packages/operator-core-ui/.../AdminSemiFranchisePage`는 전체 관리자 앱과 Neture 호환 wrapper가 소비한다. 카탈로그/설정 조회 실패 시 저장을 막고 재시도, 실패한 쓰기는 선택을 보존한다.
- 내 매장 담당: 판정 응답을 메뉴·실행 API에 연결한다. 기존 역할/자료/기기 guard를 유지하며, 새 설정을 읽었다는 이유로 작업 권한이 생기지 않는다. 기존 기능을 일괄 제한하는 변경은 이번에 하지 않았다.
- 회원 담당: 개인회원 유료 원장 위치를 확정하고 검증된 회원별 기능을 `MemberFeatureResolver(ownerUserId)`로 연결한다. 매장 구독·상품 결제·클라이언트의 subscriptionStatus를 개인회원 이용권으로 쓰지 않는다.
- 협업체 담당: 새 사업 생성/기존 사업 수정의 serviceFeatures를 선택한다. drugstore 호스트·사이트·특화 상담 업무·AI 변경은 이번 범위 밖이다.

개인회원 원장 미연결 상태에서 협업체의 양의 제공은 확정되지만, 제공 없는 기능은 `allowed=null`이다.
전체 유료회원 연동·내 매장 적용·운영 서비스 완료로 보고하지 않는다. 공통 판정이 다른 출처를 덮어쓰거나 일반 회원을 임의 유료화하지 않는다.

## 검증

- Node 22.18.0·pnpm 10.25.0 frozen/integrity 설치와 공통 패키지 빌드 PASS.
- API, 전체 관리자, Neture TypeScript 포함 웹 production build PASS. 관리자 빌드는 기존 version 생성 prebuild를 실행하지 않는 `pnpm --filter @o4o/admin-dashboard exec vite build`로 수행했다.
- 공통 운영 UI 전체: 19 files / 156 tests PASS. 신규 관리자 화면 4건 포함.
- API 단위/무료 직원 기존 guard: 2 files / 14 tests PASS.
- 새 API HTTP: 3 tests PASS. 합성 인증 주체를 사용하며 실제 platform 역할 guard를 실행했다. 미인증 401, 비관리자 설정 403, 선택 조직·유료 상태 위조 무시, 무료 초대 직원 조회, 503 오류 비노출을 확인했다. 매장 guard 자체는 별도 기존 회귀로 검증했다.
- 격리 PostgreSQL 15 canonical baseline와 27 incremental fingerprint PASS. 새 설정 SQL 3건과 기존 약국 commerce 26건 = 29 PASS. 다른 약국 격리·복수 제공·정지/종료·설정 수정 즉시 반영·metadata 보존·해제를 확인했다.
- 기존 supplier/store 왕복 2 tests PASS. 최초 실행은 전용 fixture URL의 DB 이름이 달라 runner가 실행을 거부했다. 요구한 전용 DB를 별도로 bootstrap한 뒤 재실행했다. 검사를 완화하지 않았다.
- HTTP 테스트 최초 module resolver/역할 fixture 누락은 업무와 무관한 의존성 mock 및 실제 guard의 역할 조회 fixture를 바로잡고 재실행했다. 인증·권한 guard 자체를 완화하지 않았다.
- Chromium PC 1440 / mobile 390: 실제 공통 관리 컴포넌트와 합성 API로 생성·수정 실패/재시도·재조회·전체 해제 PASS. pageerror 0, 가로 넘침 없음. 실제 관리자 로그인·운영 쓰기 검증은 아니다.
- 변경 소스 ESLint: 0 errors, 기존 neture-pharmacy.routes.ts의 unused `_next` warning 1개. 기존 Tailwind/Browserslist/번들 크기 경고는 보존했다.
- 최종 신규 판정·HTTP·SQL·무료 직원 회귀 묶음은 4 files / 20 tests PASS. 기존 commerce 26건과 supplier/store 2건을 합한 고유 API 검증은 48건이며 반복 실행을 추가 합산하지 않는다.
- 테스트 fixture 조직 잔존 0, 두 전용 DB 삭제 후 catalog 잔존 0, 전용 PostgreSQL 정지 및 이번 데이터 디렉터리 삭제를 확인했다. 기존 개발 DB/프로세스는 변경하지 않았다.

## 실행 경계

운영 DB·회원·협업체 설정은 변경하지 않았다. 테스트용 PostgreSQL만 사용했다.
운영 계정·유료 호출·실제 결제·PR 생성·병합·배포는 수행하지 않는다. 개발 담당의 검증·commit/push 후 통합 담당에게 인계하는 범위다.

문서 정합: 약국 설계에 새 최소 제공 기능 계약과 개인회원 미연결·후속 소비처 범위를 추가했다.

### 경영자 회원 유료 자격 기준 정정 (2026-10-16)

유료 자격은 매장이 아닌 경영자 회원에게 귀속한다. 공통 판정은 접근 승인된 내 매장의 현재 `organization_members` owner(`left_at IS NULL`)를 조회하여 해당 경영자의 회원 유료 자격을 확인한다. 초대 직원은 무료회원이어도 그 매장의 제공 기능을 이용하며, 직원 개인의 유료 자격은 해당 매장 기능에 영향을 주지 않는다. 타 매장 경영자의 자격도 전파하지 않는다. 경영자 관계가 없거나 복수여서 확정할 수 없으면 503으로 반환한다. 기존 내 매장 접근 승인과 소속 매장 범위 검증은 그대로 필요하다.

실제 경영자 회원 유료 원장 연결은 미완료이며, 매장 단위 이용권으로 대신하지 않는다. `MemberFeatureResolver(ownerUserId)` 연결 시 위 기준으로 조회한다. 미연결은 무료 판정이 아닌 확인 미완료 상태를 유지한다.

정정 후 검증: 판정 단위 14건, HTTP 회귀 3건, 격리 PostgreSQL 4건 PASS. 무료 직원/유료 경영자, 유료 직원/무료 경영자, 다른 매장 경영자 분리, 경영자 없음·복수·이탈을 확인했다. 단위 테스트의 최초 빈 배열 parameterization 오류는 객체 행으로 바로잡고 14건 재실행 PASS. API TypeScript production build와 변경 파일 ESLint PASS, 문서 민감정보 검사 0건, diff check PASS. 격리 fixture 잔존 0 확인 후 전용 DB 삭제·PostgreSQL 정지.
