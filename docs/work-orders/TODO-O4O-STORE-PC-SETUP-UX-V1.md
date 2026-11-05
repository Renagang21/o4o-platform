# TODO-O4O-STORE-PC-SETUP-UX-V1

> 상태: ACTIVE · 작성일: 2026-11-05 (Asia/Seoul)
> 근거: 사용자 요청 — 내 매장 제품 버튼 정리, 전체 서비스 안내 문체 통일, 설치 GUI/진행 표시, 연결 확인 복구, 코드 기반 데모 약국 경영자 연결. TODO·코드·문서 점검 후 개발, PR까지 수행.

## 실행 경계

- 최신 main의 독립 worktree에서 진행한다. 기존 작업공간·변경은 보존한다.
- 개발·로컬 검증·push·PR 생성까지 수행하며 main 병합·배포는 하지 않는다.
- 운영 DB 변경·migration·seed·실계정 권한 부여·실 PC pairing/credential 변경은 하지 않는다. 데모는 기존 canonical 코드 계약에서 해결하며 일반 회원 권한을 완화하지 않는다.
- 사용자 작성 글·외부 콘텐츠·퇴역 기능은 문체 일괄 변환 대상이 아니다. 공통 UI 전 소비처와 활성 서비스의 시스템 안내를 조사하고 의미를 보존한다.
- Windows 설치 실제 실행은 Linux 검증과 구분하며 미검증 범위를 명시한다. 내장 Node 22.18.0 계약 유지.

## TODO

- [x] 정책·공통 모듈·commerce·데모·설치 관련 정본과 실제 코드의 차이 확인
- [x] 버튼·문체·설치/연결·데모별 원인과 보완 설계 확정
- [x] 제품 등록 진입과 보조/탐색 작업을 분리해 버튼 정리
- [x] 활성 서비스·공통 UI의 설명/오류/안내를 합니다체로 정비, 짧은 버튼명 유지
- [x] Windows 설치/실행 UI와 진행 상태·완료/실패 표시 개선
- [x] PC 프로그램/서버/현재 계정 연결 단계를 분리하고 확인 결과 유지
- [x] 코드 기반 Demo 약국 경영자·약사 자격 연결과 일반 계정 격리 검증
- [x] 관련 회귀·빌드·타입·desktop/mobile 브라우저 검증 및 한계 기록
- [x] 문서 정합·민감정보·diff 점검 → commit/push → 기존 PR 확인 후 PR 생성

## 조사·설계·검증 기록

점검 결과와 실제 실행 증거를 후속 절에 기록한다. 위 체크는 실제 완료 시에만 갱신한다.


## 점검 후 확정한 보완 설계

1. 등록 작업 세 가지는 `제품 등록` 메뉴로 묶고 `제품 진열 설정`·`새로고침`을 보조 작업으로 둔다. 기존 주문/취급상품/판매처 탐색·선택/상세/작업 흐름은 제거하지 않는다. 등록과 더보기 메뉴는 native details 그룹으로 배타적으로 연다.
2. 활성 사용자 서비스 9개와 관리자·공통 UI 및 API의 공개 오류 문구를 소스 AST에서 점검한다. 합니다체와 짧은 동작명을 적용한다. 사용자 글·외부 자료·AI 지침과 퇴역 forum-cosmetics 등 제외 대상을 보존하며 런타임 DOM 일괄 치환을 사용하지 않는다. 작성 기준은 [UI 문체 guide](../guides/O4O-SYSTEM-UI-COPY-V1.md)를 따른다.
3. 기존 오프라인 CMD 패키지·크기·SHA256 검증을 유지하고 별도 WPF 설치 창을 제공한다. 파일 검증·설치·응답 확인·완료/실패 단계를 표시하며 설치/실행 대기는 불확정 막대다. 일반 실행도 상태 창으로 표시하고 원시 로그는 데이터 홈의 logs/pc-program.log에 기록한다. 종료 확인 후 자기 콘솔에 Ctrl+C로 정상 종료를 요청하며 강제 종료하지 않는다. CMD bootstrap의 순간 표시 및 실제 GUI 동작은 Windows 검증 대상이다.
4. `/health.connected`는 현재 로그인 계정의 소유 증명이 아니다. 초기 조회는 프로그램 응답만 표시한다. 명시적인 연결 확인에서 기존 승인권·nonce·계정 검사로 연결하고 타 계정은 거절한다. 계정 확인은 15초로 제한한다. 네트워크 오류만으로 프로그램 미실행을 단정하지 않는다. 원본 스크린샷의 실제 PC는 이 환경에서 접근/수정하지 않는다.
5. Demo의 실제 면허 승인 기록을 만들어 우회하지 않는다. 기존 승인 약사는 그대로 처리하며, 활성 STORE_OWNER registry·정상 계정·활성 neture 가입·현재 조직의 실제 owner/승인 원장이 일치하는 경우에만 매장용 합성 자격을 코드로 판정한다. pending/rejected/revoked 자격을 덮어쓰지 않는다. 약국 외 전역 약사/중앙 권한은 얻지 못한다. [Demo 정본](../baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md)의 사용자 확정 절과 맞췄다.

## 검증 기록 (PR 생성 시점)

- Node 22.23.4 / npm 10.9.9 / pnpm 10.25.0, frozen lockfile·store integrity 유지. Windows 내장 Node 22.18.0 유지, dependency/lockfile 변경 없음.
- Store: **92 files / 935 tests PASS**. Neture: **178 files / 1519 tests PASS**. 관리자: **65 files / 664 tests PASS**.
- 공통 패키지 Vitest: auth-utils 43, auth-react 291, ui 41, shared-space-ui 222, operator-core-ui 233, store-ui-core 156 tests PASS.
- Store·Neture·Partner production build/typecheck PASS. 전체 frontend 검사에서 Admin 의존 산출물 누락 1건을 확인했다. Admin 의존 closure를 먼저 빌드한 후 해당 Admin typecheck PASS; 다른 frontend targets는 최초 검사에서 PASS. 기준 완화나 source 오류 은폐 없음.
- API typecheck PASS. 새 Demo helper 단위 및 제품 접근 회귀 **11 tests PASS**. 실제 일회성 PostgreSQL 15의 TEMP tables로 격리된 Demo 판정 **16 tests PASS** (정지·직원·타 조직·계정/가입 비활성·자격 반려/취소 차단). 운영 DB/계정 데이터에는 쓰지 않는다. 로컬 컨테이너는 종료 시 제거한다.
- PC release installer: **13 PASS / Windows 전용 2 SKIP** on Linux. 전체 API Jest는 실행 중이며 결과는 후속 기록한다. 실제 Windows GUI/한글 경로/정상 종료는 이 수치로 검증 완료를 주장하지 않는다.
- Chromium actual browser: Store 제품 등록 메뉴 390/1440px, PC 연결 component 390/1440px PASS. 가로 넘침·pageerror 없음. Store는 쓰기 0, PC 연결은 허구 응답 fixture만 사용하며 실제 grant/pair/credential 변경 없음. 기존 CDN font 요청은 로컬 빈 CSS fixture로 대체하고 외부 연결을 허용하지 않는다. 초기 component browser fixture의 React CJS import/refresh preamble 문제는 fixture를 바로잡아 재실행했다.
- 오래된 browser metadata·chunk 크기 advisory는 유지한다. Windows signed-installer 배포/실계정/실 PC 검증·main 통합·운영 배포는 이번 단계에서 미실행이다.

## 문서 정합과 인계

기존 WO/CHECK의 과거 실행 결과는 다시 쓰지 않는다. 현행 PC guide·Demo 정본을 이번 사용자 요청 범위에서 보완하고 UI 문체 guide를 추가했다. main의 중앙 운영 책임과 일반 약사 수동 심사·조직/정책 동의 계약을 유지한다. WORKTREE_DISPOSITION: KEEP — PR 검토/추가 수정과 Windows 검증에 필요. 최종 SHA·PR·남은 체크는 완료 보고로 인계한다.


## PR #943 및 후속 검증

- PR: https://github.com/Renagang21/o4o-platform/pull/943 (초안으로 생성, main 병합/배포 미실행).
- 개발 중 main의 회원 등록 PR #941이 반영돼 `b6301cdf20`을 작업 branch에 정상 merge했다. 충돌한 6개 파일은 incoming 회원 등록 로직을 보존하고 시스템 문구만 다시 적용했다. 다른 세션 branch와 main 자체는 변경하지 않았다.
- 통합 후 회원 등록·인증 및 이전 실패 회귀 **7 suites / 182 tests PASS**. API typecheck PASS. 새 account-ui export의 dist 누락은 해당 package rebuild 후 Admin/Neture typecheck PASS로 확인했다.
- API 전체 실행은 **646 suites PASS / 78 SKIP, 9993 tests PASS / 1202 SKIP / 5 FAIL**이었다. 실패한 4 suites는 문구 소스 계약·자연어 단어 사전·기존 mock·src 밖 content-editor 기대값이었다. 단어 사전/AI 지침/예제 속성은 원문 보존 대상으로 복원하고 변환기에서도 제외했다. 실제 입력 동작을 약화하지 않고 실패 suites를 수정 후 **46 tests PASS**, 통합 후 포함 회귀는 위 182 tests PASS로 재확인했다. 전체 실행 자체를 all-green으로 보고하지 않는다.
- 실제 배포 포맷으로 Windows Node 22.18.0 archive의 공식 checksum을 검증하고 release ZIP/embedded installer를 로컬 생성했다. ZIP 33,531,740 bytes, installer 33,539,072 bytes로 32MiB 제한 아래다. publish/upload는 하지 않았다.
- 첫 Windows CI는 packaged runtime health 단계까지 통과한 뒤, 이미 종료된 CMD PID를 taskkill하려는 기존 테스트 정리에서 실패했다. 새 시작 방식에 맞춰 테스트 전용 패키지의 --worker를 정확한 exe 경로로 식별하고 Ctrl+C 정상 종료를 검증하도록 보완했다. 강제 종료로 숨기지 않으며, CI 결과는 PR 최신 HEAD에서 확인한다. Linux 전용 결과와 실제 Windows CI를 구분한다.
- Windows 최초 설치 consent, GUI의 사용자 시각 검수, 실제 사용자 PC의 LNA/운영 계정 연결은 미검증이다. 실제 사용자 PC/credential/pairing/운영 원장은 수정하지 않았다.
