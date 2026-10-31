# 드럭스토어형 약국 공통 구조·직원 지원 연결

> 상태: 구현·검증 완료 · push 인계
> 작성일: 2026-10-16
> 범위: 앞선 기능 판정의 연속 단계. 같은 branch에서 전체 구현·검증·push하며 통합은 담당 공간에서 수행한다.

## TODO와 코드·문서 검증

- [x] 사업별 기존 홈/자료/Forum/참여/운영 구조를 재사용한다. drugstore은 사업 key이며 새 사용자·매장·직원 역할을 만들지 않는다.
- [x] 전용 호스트에서는 같은 앱의 기본 사업을 설정으로 선택한다. 기본값 pharmacy를 유지하고 환경 설정으로 drugstore을 지정할 수 있게 한다. DNS/TLS/운영 배포는 통합 담당 범위다.
- [x] 약국 협력사업 관리자 고정 카탈로그에 `store-staff-support`(매장 직원 지원)를 추가한다. 이 특화 기능은 협력사업 설정으로만 제공하며 기존 회원 유료 자격의 두 공통 기능에 자동 추가하지 않는다.
- [x] 내 매장에 직원 지원 메뉴/화면/API를 함께 제공한다. 승인된 소속 매장의 상품 위치 검색, 기존 다국어 상품 자료 연결, 짧은 숙지 자료, 미충족 요구 버튼 기록을 묶는다.
- [x] 위치는 기존 내 매장 상품 단위의 짧은 문자열만 저장한다. 경영자가 수정하고 직원은 읽는다. 별도 담당자·업무 배정 체계는 만들지 않는다.
- [x] 숙지 자료는 기존 협력사업 운영자의 게시 자료에 `staff-quick-guide` tag를 붙여 재사용한다. 가입하지 않은 사업 자료는 보이지 않는다. 긴 직원 입력·학습 이력·시험은 없다.
- [x] 미충족 요구는 상품을 못 찾음/취급 상품 없음/약사 상담 요청의 버튼만 기록한다. 고객·환자·증상·개인 식별·자유서술은 저장하지 않는다. 매장별 월간 집계만 원자적으로 증가시킨다.
- [x] O4O 전체 관리자는 월간 집계를 조회할 수 있다. 다른 협력사업 운영자에게 타 매장 집계를 공유하지 않는다.
- [x] 비전문 직원 화면은 상품 위치·제품 자료 안내 및 약사 연결을 제공한다. 의약품 선택·증상 진단·처방 판단·AI 자동 추천은 구현하지 않는다. 기존 게시된 다국어 자료를 활용하며 새 실시간 번역/의료 AI는 이번에 약속하지 않는다.
- [x] 조직 전환/가입 종료/무료 초대 직원/유료 자격 단독 우회/오류/교차 매장 쓰기를 검증하고 관련 build·화면·API 테스트 후 commit·push한다.

점검 근거: `BusinessWorkspace`, `BusinessToolsPage`, 공통 사업 API와 `SemiFranchiseContentService`, `organizations.metadata`, 기존 공통 feature guard. 전용 앱·새 role·새 schema 대신 기존 사업 화면 및 조직 metadata의 최소 확장을 선택한다. 기존 매장 구독은 재해석하지 않는다.

## 구현 결과

공통 약국 앱의 기본 사업·표시명·운영 화면을 설정화했다. drugstore 호스트는 같은 앱에서 drugstore 사업 홈을 사용하며 별도 앱이나 직원 role을 만들지 않는다. pharmacy의 기존 kpa-society 로그인·기본 사업은 그대로다. 독립 사업 호스트는 Neture 공통 계정을 사용하고 사업 자료/Forum은 기존 사업별 원장으로 제한한다. drugstore의 session domain을 공통 카탈로그에 추가했다. 다른 사업에 pharmacy의 운영 법정정보·legacy 약관을 복사하지 않았다.

관리자 고정 제공 기능에 매장 직원 지원을 추가하고, 월별 익명 요구 집계를 제공한다. 사업 운영자는 기존 콘텐츠 등록에서 `staff-quick-guide` 태그로 짧은 숙지 자료를 게시한다. 내 매장 직원 지원은 검색·진열 위치·게시된 다국어 자료(읽기 전용)·짧은 안내·3개 요구 버튼을 제공한다. 경영자만 위치를 수정하고 자료 관리로 이동할 수 있다. 서버는 모든 직원 지원 요청에서 소속 매장과 협력사업 제공 기능을 재검증한다. 직원 개인 유료 여부와 무관하며 일반 유료회원만으로 특화 기능이 열리지 않는다.

새 DB schema/migration은 추가하지 않았다. 조직 metadata의 위치/월간 집계만 쓰며 다른 metadata는 보존한다. 요청 body의 고객 정보 등 추가 필드는 저장하지 않는다. 이 집계는 실제 판매·POS 실적이나 의료 판단 데이터가 아니다.

## 검증

- 공통 판정/사업 HTTP/SQL/도메인 카탈로그: 4 files / 45 tests PASS. 직원 지원의 기능 선택·경영자 쓰기 제한·잘못된 요구 종류·고객 추가 필드 미저장·운영자 집계 차단을 포함한 최종 HTTP 파일 5건 PASS.
- 실제 PostgreSQL: 위치 검색/다른 매장 쓰기 차단/metadata 보존/현재 가입 사업 자료만 열람/12개 동시 클릭 집계 12건을 확인했다. 실제 회원 원장 유료만으로 직원 지원이 열리지 않는 검증도 추가했다.
- 기존 공통 관리 UI 전체 20 files / 158 tests PASS. 새 월간 집계 실패·재시도·월 변경 검증을 추가한 약국 관리 묶음 5 files / 21 tests PASS.
- 약국 사업 홈·참여·자료·Forum·브랜드·사이트 설정: 7 files / 64 tests PASS. 최초 비기본 사업에 자료 운영 링크를 노출한 오류는 현재 기본 사업과 동일할 때만 노출하도록 바로잡았다.
- 내 매장 hook/직원 UI/업무 그룹: 3 files / 31 tests PASS. 최초 신규 메뉴가 업무 그룹에 누락된 회귀를 고쳐 직원 지원 그룹으로 배치했다.
- Chromium 실제 직원 화면: 1440/390px, staff/owner 각각 검색·위치 열람·경영자 저장·직원 수정 UI 없음·요구 버튼 1건 기록 PASS. pageerror/가로 넘침 없음. 합성 API를 사용했으며 운영 로그인이나 실제 운영 쓰기 검증은 아니다. 390px 직원을 직접 시각 확인했다.

## 운영 인계

1. 통합 공간에서 이 branch의 앞선 관리자/회원 원장/기능 판정 변경까지 함께 반영한다. 앞 단계의 회원 원장 incremental migration은 여전히 필요하다(이번 단계는 새 migration 없음).
2. DNS/TLS와 frontend host 라우팅에서 drugstore.neture.co.kr을 공유 약국 앱으로 연결한다. 다른 사업이면 배포 설정의 `VITE_PHARMACY_BUSINESS_KEY`, `VITE_PHARMACY_BUSINESS_NAME`을 지정한다. 신뢰할 세션 도메인은 중앙 카탈로그에서 별도 관리하며 임의 origin을 허용하지 않는다.
3. 관리자 `약국 협력사업`에서 key=drugstore으로 실제 사업을 등록하고 담당 운영자와 제공 기능(tablet, multilingual-content, store-staff-support)을 선택한다. 실제 운영 조건/책임자/약관·법정정보는 해당 사업의 확정 내용을 사용한다. 임의 운영 seed/가입 승인은 없다.
4. 해당 사업 참여 약국을 승인하고 게시 자료 중 짧은 숙지 자료에 `staff-quick-guide` 태그를 지정한다. 내 매장 경영자가 필요한 상품의 위치를 짧게 입력한다. 별도 데이터 담당자 지정이나 직원 과제 배정은 없다.
5. 운영에서 사업별 미가입 자료 차단과 무료 초대 직원 사용을 확인한다. 이번 개발 종료점은 commit·push이며 통합/배포/운영 DB 쓰기는 실행하지 않는다.

문서 정합: 약국 설계 §15-6에 기본 사업 설정·특화 기능 제공·현장 데이터의 최소 저장 경계를 추가했다. 기존 드럭스토어형 약국의 준비 중 탐색 노출은 운영 적용 전에 임의로 공개 전환하지 않는다.

### 최종 검증 및 개발 기준 동기화

API·내 매장·약국 공유 앱·전체 관리자·Neture build PASS. 신규 소스 ESLint, diff check, 문서 민감정보 검사 PASS. 최종 SQL 6건, 사업/직원 HTTP 5건, 약국 화면 64건, 내 매장 31건 PASS. SQL fixture 잔존 0 확인 후 전용 DB 삭제·PostgreSQL 정지.

push 전 main `13f89df0e`에 공급자 migration `1792110685889`가 추가된 것을 확인했다. 이전 회원 원장 migration `1792137600000`보다 먼저 실행되어야 하므로, 개발 branch에 최신 main을 반영하여 manifest 순서와 최종 fingerprint를 다시 검증한다. main 병합·배포를 수행하는 것이 아니며 통합 담당에게 호환된 개발 branch를 넘기는 과정이다.


최신 main 동기화 결과: manifest는 공급자 분리 → 회원 유료 원장 순서다. 충돌은 두 incremental 등록 파일뿐이며 양쪽 migration을 보존했다. baseline + 29 incrementals의 최종 스키마는 `8bff6266b19ec25febfb59bfdcc36e8d8dcada715f3b8ec5883a8c01f765ec1b`(6664줄)이다. 격리 PostgreSQL에서 회원 migration down 시 최신 main `d5f95281...`(6654줄), up 시 최종 상태를 정확히 재현했다. 새 빈 DB 전체 bootstrap과 재실행 모두 MIGRATION_JOB SUCCESS, migration contract 21/21 PASS. 이전 초기 단계의 fingerprint는 당시 미병합 기준 검증 기록이며 운영에 적용한 값이 아니다.

동기화 후 API 판정/설정/SQL/태블릿 runtime 4 files / 37 tests PASS, 내 매장/직원 지원/최신 안내 편집 회귀 3 files / 50 tests PASS. API·내 매장·약국 앱·Neture build를 다시 실행해 PASS했다. 공통 tablet 두 package는 source export이며 별도 build script가 없어 앱 build가 최신 소스를 함께 검증한다. 전체 관리자 build는 새 관리 패널 반영 후 PASS했다. 기존 번들 크기/Browserslist 경고는 그대로다.

WORKTREE_DISPOSITION: 기존 `wo/pharmacy-service-entitlements` / 연속 단계 / 최신 개발 기준 `13f89df0e` / main 통합·CI·배포 미실행 / 로컬 SQL·HTTP·화면 smoke PASS / other session usage 없음 / KEEP(통합 담당에게 인계할 미병합 branch 보존).
