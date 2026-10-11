# 통합 프론트엔드 · 공통 헤더 소비처 점검

> **상태**: ACTIVE · **작성/갱신일**: 2026-10-11
> **작업**: [통합 안정화 WO](../work-orders/WO-O4O-FRONTEND-INTEGRATED-STABILIZATION-V1.md), PR #458
> 검증 대상은 `dece75229`의 헤더 구현이다. 후속 공지·공개 열람 구현은 별도 검증한다.

## Shared Module Change Verification

- Module/package: `packages/ui/src/layout/GlobalHeader.tsx`, `@o4o/ui` dist export.
- Direct consumers: `NetureGlobalHeader`, `KpaGlobalHeader`.
- Indirect Neture: MainLayout·NetureLayout·SupplierSpaceLayout·SupplierOpsLayout·AdminLayoutWrapper·OperatorLayoutWrapper·SubdomainOperatorLayoutWrapper.
- Indirect KPA: Layout·admin/AdminLayout·kpa-operator/KpaOperatorLayoutWrapper 및 App의 KpaStoreLayoutWrapper/KpaStoreWorkspaceWrapper header slot.
- 변경: 좁은 화면에서 service brand와 우측 이동/계정 영역이 다음 줄을 사용할 수 있도록 flex wrap/gap/max-width 적용. props·정보·경로·역할 판정은 동일하다.

## Consumer Impact Matrix

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | PC/mobile 검증 방식 | 결과 |
| --- | --- | --- | --- | --- | --- |
| NetureGlobalHeader | 직접 사용 | 긴 서비스명과 이동 버튼이 좁은 화면에서 줄바꿈 | public/contextual nav·supplier 역할 판정·홈/My Home 목적지 보존 | 패키지/앱 build, brand/slot tests, 아래 소비 화면 | PASS |
| KpaGlobalHeader | 직접 사용 | 로고·이동/계정 영역 줄바꿈 | buildCommunityPrimaryNav·KPA role·service context 그대로 | 앱 build, 회원 홈 15 tests, 아래 소비 화면 | PASS |
| Neture admin | AdminLayoutWrapper | header slot 배치 | admin guard 및 supplier 활성 membership 기반 링크 변경 없음 | `/admin/settings/notifications` 헤더 fixture 1440/390/320, mobile drawer 열기, overflow/pageerror 검사 | PASS |
| Neture operator | OperatorLayoutWrapper | header slot 배치 | operator/admin guard 및 funding membership 필터 변경 없음 | `/operator/ai-report` 헤더 fixture 1440/390/320, mobile drawer | PASS |
| Neture subdomain operator | SubdomainOperatorLayoutWrapper | 동일 wrapper의 header slot | service scope/관리 경로 소유 host 결정 유지 | source·전체 Neture tests 496·production build; 공통 Neture operator 헤더 fixture | PASS, 개별 운영 기능 실계정은 T13 |
| 공급자 업무/운영 | SupplierSpaceLayout·SupplierOpsLayout | 공통 헤더와 긴 action row | supplier guard/신청 gate·제품/주문 API·승인 계약 변경 없음 | products/orders fixture 1440/390/320 및 Neture tests/build | PASS |
| 펀딩 | MainLayout | 320px 넘침 수정 | 기존 login/return URL·모집/참여 권한 유지 | 오류/재시도 fixture 1440/390/320, unit tests/build | PASS |
| Community forum | NetureLayout | 공통 헤더 줄바꿈 | 개별 workspace 승인/폐쇄 게시판·회원 읽기 gate 유지 | `/communities/fixture/forum` 헤더 fixture 1440/390/320, mobile drawer·전체 tests/build | PASS |
| Neture My Home | NetureLayout | 개인 화면 헤더 배치 | 사용자 본인/선택 매장 scope·My Home 이동 계약 유지 | 실제 번들+모의 API E2E 1440/375/320, 9 cases·tests/build | PASS |
| Pharmacy 회원 홈/forum shell | KPA Layout | 공통 헤더 줄바꿈 | 사업/승인/member layout·URL 정책 유지 | 회원 홈 fixture 1440/390/320·15 tests·앱 build | PASS |
| Pharmacy admin | admin/AdminLayout | 공통 헤더 배치 | 기존 admin guard·sidebar 유지 | admin shell fixture 1440/390/320, mobile drawer·앱 build | PASS |
| Pharmacy operator | KpaOperatorLayoutWrapper·사업 Layout | 공통 헤더 배치 | role guard/담당 사업 scope 유지 | `/operator/semi-franchises` fixture 1440/390/320, mobile drawer·앱 build | PASS |
| Pharmacy My Home | Layout | 공통 헤더 배치 | 기존 MyPageGuard 및 대표 My Home 연결 유지 | `/mypage/settings` fixture 1440/390/320, mobile drawer·앱 build | PASS |
| Pharmacy legacy store/store-hub | App header slots | 남은 wrapper를 사용할 때 배치 영향 | 현재 `/store`·`/store-hub`는 unified Store handoff 우선. 구 자체 업무 진입 복구 없음 | route/guard/handoff source 대조·KPA build; canonical Store fixture는 아래 행 | PASS, 옛 Store 기능 실사용 smoke 대상 아님 |
| Unified Store | 독자 header, 이 component 미사용 | GlobalHeader 변경 직접 영향 없음 | work-scope/organization·capability·handoff 그대로 | 설정/제휴처/QR fixture 1440/390/320·40 tests·앱 build | PASS |
| 강의/분회 | 독자 header, 미사용 | 직접 영향 없음 | LMS·분회 role/개체 scope 그대로 | 독자 내부 화면 fixture·6/35 tests·앱 build | PASS |
| K-Cosmetics | GlobalHeader import 소비 0 | 직접 영향 없음 | 서비스 자체 header/route/role 변화 없음 | symbol/import/path 검색 | PASS, 영향 없음 |
| 전체관리자 앱 | GlobalHeader import 소비 0, UI package 의존은 있음 | export/API 불변, component 소비 없음 | 중앙 계정/관리 guard 변경 없음 | symbol/import 검색·GitHub affected admin build SUCCESS | PASS |
| 공통 UI/core/extension | UI export 소비, Core/extension 구현 변경 없음 | 표현 component만 변경 | capability map·permission·core schema·API 계약 변경 없음 | 공통 UI 19 tests·packages build·import 검색 | PASS |

## Route / role / capability check

Route 제거/rename·href 변경·메뉴 숨김·필터 변경·빈 그룹 제거 없음. 인증/승인 권한은 기존 guard의 업무다. 데스크톱 nav와 계정 버튼, 모바일 drawer 및 My Home/O4O 복귀 버튼을 유지한다. PC/mobile fixture는 헤더·레이아웃을 검증하며 관리자 업무의 실제 데이터/실계정 확인을 대신하지 않는다.

## Literal / raw-source consumers

`GlobalHeader`, 두 wrapper, 각 indirect layout의 import/사용처 및 파일 경로를 조사했다. `check-literal-consumers --source packages/ui/src/layout/GlobalHeader.tsx`는 역사 문서 34개, 살아 있는 raw-source 계약 0개를 반환했다. 경로/문서 소비 0이 symbol test 소비 0을 뜻하지 않으므로 Neture brand/slot tests와 공통 UI tests를 별도로 수행했다. 테스트 계약 문자열·export는 변경하지 않았다.

## Smoke result and limits

공통 header 소비 화면 추가 fixture는 1440/390/320의 18개 PASS이며 mobile drawer 열기/닫기 버튼·문서 overflow·pageerror를 확인했다. 기존 대상 UI 30개, My Home 9개 E2E와 함께 검증했다. 모든 API 응답은 합성이며 운영 DB·OAuth·실계정 작업을 수행하지 않았다. 운영 bundle/배포 결과는 WO의 통합 결과에 기록하며 최종 사용자 테스트는 T13이다.

WORKTREE_DISPOSITION: 같은 통합 WO의 `wo/frontend-integrated-stabilization`, KEEP — 통합·배포·후속 phase·사용자 테스트 대기.

## 최종 배포 및 최신 회귀 (2026-10-11)

위 소비처 표·테스트 수는 최초 구현 단계의 기록이다. 현재 PR #458·#467은 main에 병합됐고, 공통 UI의 영향을 받는 앱과 독립 Store/Lecture/Branch의 해당 UI 배포도 완료했다. 대상별 실제 배포 SHA 및 Delivery SUCCESS는 [통합 WO §9](../work-orders/WO-O4O-FRONTEND-INTEGRATED-STABILIZATION-V1.md#9-최종-main-통합운영-배포사용자-테스트-인계)를 기준으로 확인한다. latest Neture 전체533 tests·production build, My Home unit13·PC1440/mobile375/320 E2E27 PASS. 추가 Pharmacy build·회원 홈16 및 PC1440/mobile390/320 fixture3도 PASS다.

마지막 공개 운영 HTTP28·비로그인 browser9 PASS는 공개 진입/자산/인증 경계 확인이다. 운영자 헤더의 실제 업무 데이터나 real OAuth 검증을 대체하지 않는다. 운영자 공급자·내 매장 진입과 실제 서비스 세션 이동은 마지막 T13 사용자 테스트로 유지한다. WORKTREE_DISPOSITION은 KEEP이며 통합·배포 대기가 아닌 사용자 테스트·정책 결정·이전 공간 보존 확인 대기다.
