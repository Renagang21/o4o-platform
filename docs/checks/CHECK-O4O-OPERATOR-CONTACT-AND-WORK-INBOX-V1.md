# 서비스별 문의·운영자 업무함 검증

- 상태: ACTIVE
- 작성일: 2026-10-21
- 최종 갱신일: 2026-10-21
- 작업: [TODO](../work-orders/TODO-O4O-OPERATOR-CONTACT-AND-WORK-INBOX-V1.md)
- 기준 main: `e09db6eb4b`
- 개발 종료점: 로컬 검증·commit·push, PR·CI·병합·운영 migration·배포는 통합 담당

## 구현 범위

서비스(Neture·공급자·펀딩·커뮤니티·강의·내 매장), 약국 협력사업(Pharmacy·CarePharm·MegaPharm),
Pharmcoop 연합회와 개별 조합에 문의함/미처리 업무 표시를 연결한다.
기존 Neture/KPA/강의 문의 원장은 그대로 두고 기존 화면에서 계속 처리한다.
새 공급자·펀딩·커뮤니티·사업·조합·내 매장 문의는 기존 contact_inquiries를 사용한다.

- 서버가 service/사업/조합을 해석하고 조직 ID를 확정한다. body의 serviceKey·organizationId·sourcePath는 권한/귀속 판정에 쓰지 않는다.
- 기존 guard/사업 담당/연합회/조합 역할을 사용한다. 조합 operator에게 Neture 역할이나 별도 사업 가입을 강제하지 않는다.
- Neture 메인 이용 자격은 이메일 확인·활성 계정과 명시적 정지/탈퇴 여부다. 수동 승인 행을 추가로 요구하지 않는다.
- 커뮤니티는 현재 서비스 operator 검사(자체 역할+활성 가입)를 재사용하며 platform 역할만으로 열지 않는다.
- 문의 상태와 메모를 하나의 비교·저장으로 처리하고 현재 권한을 트랜잭션에서 재확인한다. 처리 이력은 기존 action_logs에 저장한다. 삭제 API는 없다.
- 문의 생성 성공은 알림 실패와 분리한다. 기존 문의 생산자의 개별 실패를 sent로 덮어쓰던 문제를 수정하고 none/partial/fail을 구분한다.
- 영속 알림과 별개로 실제 미처리 원장에서 업무를 계산한다. 조회 실패는 0건으로 표시하지 않는다. 읽음/조회로 업무를 자동 완료하지 않는다.
- PC/mobile 공통 표시와 60초 갱신을 제공한다. 임의 SLA나 자동 환급·통장 조회·외부 발송 queue는 만들지 않는다.
- 강의 심사 요청은 담당 operator에게도 알린다. 강사 알림에 serviceKey/목적지를 넣고 알림 실패로 이미 저장된 상태를 재시도하도록 만들지 않는다.

## Migration

`AddContactInquiryOrganization1792540800000`:

- contact_inquiries.organization_id nullable uuid 추가, service/조직/상태/접수일 index 추가.
- 기존 행 update·이관·삭제 없음. source_path 또는 service_key에 조직 ID를 숨기지 않는다.
- 조직 귀속 문의가 있으면 down을 거부한다(서비스 전체 문의로 노출되는 rollback 방지).
- 전용 PostgreSQL 15에서 baseline·모든 incremental prefix와 최종 fingerprint를 실제 계산했다.
- 최종 fingerprint: `8ed889abb7221d1f8fda81b8dd89b9b2bd473806011d0ee8e484eed3c91f9956`, 6776 lines.
- **운영 적용 미실행.** 배포 전에 통합 담당이 현재 main 및 운영 migration 승인 범위를 확인해야 한다.

## 실행 검증

| 검증 | 결과 |
|---|---|
| 전용 PostgreSQL schema prefix·신규 empty down/up | PASS |
| PostgreSQL + 실제 HTTP·권한·범위·알림 실패·변경 충돌·처리 이력·업무 SQL·안전한 down | 15개 PASS |
| 공통 operator UI 전체 | 209개 PASS |
| 공통 space UI 최종 전체(신규 문의 포함) | 144개 PASS |
| 신규 공개 문의 입력 보존·중복 방어·범위 변경 | 위 144개 중 2개 PASS |
| 강의/권한/펀딩 기존 API 회귀 | 176개 PASS, 별도 전용 DB 변수가 필요한 기존 통합 9개 skip(본 작업 PG 15개와 구분) |
| Pharmcoop 기존 화면/권한/Hero 회귀 | 62개 PASS |
| 강의 화면 전체 | 41개 PASS |
| 약국 사업/협업 문의/헤더 선택 회귀 | 18개 PASS |
| Neture 선택 회귀 | 94개 PASS, 알림 목적지 allowlist 1개 추가 PASS(호스트 48개 재실행은 중복 합산 안 함) |
| API 타입·tsup | PASS. 강의 operator 알림 대상/실패 보존 테스트 3개 추가 PASS |
| 영향 5개 앱 타입·운영 빌드 | Neture/KPA/Pharmcoop/Study/Store PASS. 분회 공유 소비처 tsc -b도 PASS(분회 업무 변경 없음) |
| migration contract | 21개 PASS |
| ESLint ratchet | 기존 오류 46개 / 기준 46 PASS. root lint 자체는 기존 오류 때문에 실패 |
| PC/mobile 브라우저 | 운영 업무함 22개 + 비로그인 공개 접수 20개 + 고정 origin 알림 진입 2개 = 44개 PASS |

최초 PostgreSQL 검증에서 TypeORM UPDATE RETURNING 결과를 행으로 오인해 stale write를 성공으로 처리하는 문제를 잡았고 rowsOf로 교정 후 재검증했다.
최초 메뉴 회귀에서 새 경로가 기존 가시성 판정 목록에 없음을 잡아 역할/가입 필터를 보완했다.
기존 Hero 접근 테스트는 모든 `/manage` 호출을 묶어 보던 것을 Hero API에 한정했다. 자기 연합회 업무함 조회와 다른 조합 Hero 접근 금지를 구분하며 후자의 차단 검증은 유지한다.
브라우저 최초 검증에서는 상태 select의 접근 가능한 이름을 보완했다. 대기 시간·assertion을 완화하지 않았다.

## 미실행·경계

- 실제 운영 operator 로그인·운영 문의 접수/처리·외부 이메일 수신 검증 미실행.
- 운영 계정 정본이 준비되지 않은 상태를 과거 계정/Demo/새 역할 부여로 대체하지 않는다.
- 신규 범위는 앱 알림/업무함이다. 기존 이메일 설정·자동 회신은 보존하며 새 범위의 이메일 자동 설정/재발송은 하지 않는다.
- 모든 업무 사건에 영속 알림을 새로 발행하지 않는다. 가입/심사/예외의 원장 기반 표시가 알림 실패·담당자 변경 시 누락을 막는다.
- 기존 문의의 서비스/사업 귀속은 추정 이관하지 않는다. 기존 Neture 문의함·KPA 협업 문의함·Study 이전 교육 문의는 유지한다.
- 기존 dead target metadata·다른 앱 전체 관리자·약사회 분회·새 신고 정책·통합 운영 대시보드는 변경하지 않는다.
- main 반영/원격 CI/운영 배포가 끝난 상태로 보고하지 않는다.

## 최종 확인

- 브라우저는 1440/390에서 운영 공간 11개, 공개 접수 공간 10개와 다른 호스트 알림 진입을 검사했다. API/인증은 합성 fixture이며 외부 쓰기 0이다. 저장 실패 입력 보존·성공 후 조회 실패·읽기 재시도 시 중복 쓰기 없음·문서 가로 넘침 0·pageerror 0을 확인했다.
- 브라우저에서 select와 textarea의 상태 변화 후 라벨 연결 문제를 발견해 aria-label을 보완하고 전체 22개 업무함 시나리오를 재실행했다.
- 클라우드 환경 상태 전환 중 공통 space 테스트가 기본 5초 timeout으로 중단됐다. 테스트/assertion/timeout을 바꾸지 않고 단일 worker로 재실행해 최종 144개 PASS를 확인했다.
- 신규 모듈 집중 ESLint 오류/경고 0, 전체 수정 경로 ESLint 오류 0·기존 경고 5. root ratchet은 오류 46 / 기준 46 PASS다. 기존 오류와 큰 번들 경고를 임의 수정하거나 기준을 완화하지 않았다.
- 신규 문의 알림은 내부 진입 페이지 → 현재 권한 확인 → 고정 서비스 origin 링크로 연결한다. Pharmcoop/Store 경로를 대표 호스트에서 그대로 열어 404가 되는 문제를 방지했다. 강의는 기존 service-entry/handoff를 재사용한다. 새 인증 우회/외부 URL 허용 규칙은 없다.
- 기존 상품·서비스 승인/상품 후보, 사업 이벤트, 펀딩 포럼 실패·모집 기한 경과도 실제 원장에서 조회한다. 자동 결과 판정·송금은 없다.
- 전용 DB 잔존 0·다른 연결 0을 재확인하고 자기 PostgreSQL 및 preview 서버를 종료했다.
- 실제 운영자 계정 정본은 작업/기준 checkout 모두 누락됐다. 실계정 검증은 미실행이며 합성 인증으로 대신 완료했다고 보고하지 않는다.
- 통합 인계 branch: `wo/operator-contact-and-work-inbox`. 시작 main은 `e09db6eb4b`, 기록 작성 중 fetch main은 `c9d9760aba`(#746 전체 관리자 약국 설정 정비)였다. 개발 중 main을 자동 merge/rebase하지 않았다. 통합 담당이 최신 main·필수 CI/리뷰를 확인한다.
- DEPLOYMENT = MANUAL/GATED. 신규 migration 포함 운영 반영 승인은 별도로 확인해야 한다. 운영 적용·배포·PR은 실행하지 않았다.

WORKTREE_DISPOSITION: `/workspace/o4o-wt/operator-contact-and-work-inbox` / `wo/operator-contact-and-work-inbox` / KEEP — 개발 push 후 PR·원격 CI·운영 migration·배포·실계정 검증 인계가 남는다.

문서 정합: TODO 초안·코드/문서 재대조·추가 발견·검증 결과를 기록하고 SETUP에 격리 fixture 재현 절차를 추가했다. 과거 기록·canonical index/역할 정책은 변경하지 않았다.

- push 직전 main은 `5c6150a6b0`(#747)로 이동했다. 겹치는 경로는 operatorMenuGroups.ts 1개이며 `git merge-tree --write-tree` 가상 병합은 충돌 0이었다. 실제 main 병합/branch 동기화는 하지 않았으며 통합 후 CI는 별도로 실행해야 한다.


## main 통합 진행 — 2026-10-21

- 사용자 `메인 통합 배포` 지시로 이 공간에서 PR·병합·운영 migration 포함 배포를 이어간다.
- 최신 main `dcd84fa4e2`의 #750 공통 Contact Us·답변·발송 claim·설정, #752 관리자 정비, #754 AI 관리, #756 매장 협업 흐름을 보존하며 기존 push branch에 병합했다.
- 공통 서비스 접수는 기존 canonical public controller로 POST/body를 보존하는 308 연결을 사용한다. 기존 답변·재발송·설정·서비스 문의 메뉴를 대체하지 않는다. 조직 귀속 문의만 새 범위 전용 접수·처리 경로를 사용한다.
- 조직 문의를 서비스 공통 관리 경로에서 조회·집계·상태/메모 변경·답변·재발송하지 못하도록 `organization_id IS NULL` 경계를 추가했다. 실제 PostgreSQL 기존 문의 흐름 33개(신규 조직 경계 회귀 포함), 운영 업무함 15개·전체 migration prefix/down/up, Neture 경로/메뉴 75개, Study 42개, 답변 단위 4개 PASS.
- 운영 실계정 정본 누락 제한은 유지한다. 운영 계정/역할/테스트 문의를 새로 만들지 않는다. PR·CI·배포 결과는 후속 기록한다.

- main 통합 후 shared-space-ui 168개, Pharmcoop 62개, KPA 헤더 권한 11개 PASS. Neture·KPA society·Study·Pharmcoop·Store production build와 API bundle PASS. 커뮤니티 전용 IA에도 dashboard 그룹을 배치하여 업무함 메뉴가 실제 shell에 표시되도록 보완했다.
- 전체 `pnpm run lint`는 기존 오류 46개 때문에 실패한다. CI 정본의 lint ratchet(기준 46개)을 별도로 실행하며 전체 lint 무오류로 보고하지 않는다. 잘못된 최초 테스트 config/파일·패키지 filter는 실제 경로로 교정 후 재실행했고 무매칭 결과를 PASS로 세지 않았다.
- 격리 검증용 DB 2개의 잔존을 제거하고 자기 PostgreSQL 서버를 종료했다. 운영 업무 데이터 생성·삭제 없음.

- PR #758 Codex P1: CarePharm `/contact`가 service-wide 접수로 남아 사업별 신규 문의함과 연결되지 않았다. 공개 route를 ScopedContactPage에 연결하고 CarePharm만 business 범위로 접수한다. 다른 Neture 호스트는 기존 ContactPage의 설정·답변·발송 흐름을 유지한다. 기존 서비스 문의 원장/메뉴를 삭제하거나 조직을 추정해 이관하지 않는다. 신규 component 회귀 5개를 추가한다.
- 통합 후 Neture 전체 140 files / 1,244 tests PASS. lint ratchet 46 / 기준 46 PASS.

- Codex 재검토 P2 2건: service 범위 ScopedContactForm은 설정을 조회하는 PublicServiceContact에 위임하여 Pharmcoop/Store의 비활성 유형·개인정보/완료 안내를 반영한다. business/cooperative 범위는 조직 전용 endpoint와 권한 경계를 유지하며 응답의 접수번호를 표시한다. 설정·접수번호 집중 회귀 10개 PASS.
- CarePharm 수정 후 실제 production bundle의 공개 `/contact`를 1440/390에서 합성 응답으로 검증: 정확한 business endpoint POST 각각 1회·동의 true·pageerror 0·문서 가로 넘침 0 PASS. 운영 문의 데이터 생성 0, 자기 preview 종료.

- Codex 추가 P2: Pharmacy/MegaPharm 조직 문의 알림이 Neture 범위·Neture 전용 bridge로 저장되어 해당 앱 알림 목록에서 보이지 않았다. 문의 원장의 조직 경계는 유지하면서 business 알림 serviceKey를 실제 호스트(Pharmacy=`kpa-society`, MegaPharm=`megapharm`, CarePharm=`carepharm`)와 자체 문의함 route에 맞췄다. 실제 PostgreSQL 조직별 접수·수신자·알림 payload 포함 16개 PASS, KPA 알림 조회 범위·클릭 소비처 14개 PASS. 초기 fixture의 baseline 약국 사업 key 중복은 격리 DB 준비만 보완해 재검증했다. 운영 원장은 수정하지 않았다.
- 최종 설정·접수번호 보완 후 공통 UI 전체 169개와 영향 4개 앱 타입 검사 PASS. API 타입 검사도 재확인한다.

- Codex P2 추가: CarePharm의 기존 central operator/admin + live business assignment가 신규 헤더의 역할 후보에서 누락됐다. 사업 문의함 링크는 해당 후보와 사업 전용 역할을 대상으로 실제 `/manage` 응답으로 노출을 확정한다. 401/403/404는 숨기고, 권한 확인 후 원장 조회 장애는 확인 필요 상태로 유지한다. KPA business 헤더도 같은 서버 판정을 적용해 배정 없는 central 운영자에게 링크가 남지 않게 했다. 링크 부여·철회 7개, Neture 헤더 10개, KPA 헤더 11개 PASS; 집중 ESLint 오류/경고 0.

- Codex P1 추가: 배정 철회 등으로 사업/조합 담당자가 0명이면 문의 저장·미수신 기록만으로는 누구도 새 문의를 알 수 없다. 현행 공통 문의 정책에 맞춰 Neture 공통 운영자에게 담당자 지정 필요 사실만 알린다. 공개 공간 이름·slug와 역조회 API가 없는 receipt digest만 사용하고, 원시 문의 UUID·제목·본문·연락처·문의 열람 링크를 제공하지 않는다. 범위 권한은 확장하지 않는다.
- 담당자 미지정/공통 알림 실패·데이터 비노출·권한 차단을 포함한 실제 PostgreSQL 테스트 17개 PASS, fixture DB 잔존 0. 공통 알림 성공/실패는 `assignment` 결과로 구분하며 원래 문의는 미전달 상태로 유지해 새 담당자가 확인할 수 있다. API 타입 검사 재확인.

- Codex P2 커뮤니티 경로 건은 코드 오인으로 확인했다. App의 `/operator/communities`는 `pages/community/CommunityWorkspacePage`를 렌더하고, 해당 화면은 canManage일 때 기존 CommunityBoardReview를 이미 표시한다. `listManagedCommunityBoards`는 별도 게시판 운영 API다. 실제 operator 경로에서 pending 요청 조회→승인→목록 제거 회귀 1개와 기존 심사 11개, 합계 12개 PASS로 근거를 남겼다. 심사 API·권한·화면은 새로 만들지 않았다.
- Codex P2 조합 알림 수신: 개별 조합 알림을 `pharmcoop` 범위와 실제 `/:slug/operator/inbox` 경로로 저장하고, 기존 연합회 알림도 같은 서비스 범위에서 수신하는 알림 목록·미읽음 링크를 Pharmcoop에 추가했다. 원래 연합회 문의 관리 링크는 고정 Neture 관리 화면으로 연결해 답변 기능을 보존한다. 알림 읽음은 선택한 notifications ID만 변경하고 문의는 변경하지 않는다. 의존성/lockfile 변경 없음.
- Pharmcoop 전체 67개·production build PASS. 1440/390 실제 번들의 합성 알림→담당 조합 문의함 이동 PASS: 알림 읽음 POST 각각 1회, 문의 PATCH 0회, pageerror/문서 가로 넘침 0. 새 notifications slug 충돌은 운영 공개 목록 read-only 조회 200·충돌 없음으로 확인하고 front/backend에 예약했다. PG17개 재검증과 API 타입 PASS, fixture DB 잔존 0.
- 원격 CI 39670173030: API shard 1의 신규 lecture notification 단위 테스트가 LMS ESM dist 해석 실패로 중단됐다. mock을 virtual로 명시해 테스트 경계를 분리했고 no-cache 집중 3개 PASS. 전역 Jest/CI 설정·assertion은 완화하지 않았다. 동일 shard 전체 로컬 재실행 및 새 HEAD 원격 CI를 확인한다.

- CI 실패 재검증: API shard 1 전체 로컬 실행 179 suites / 3,197 tests PASS, 기존 조건부 252 tests SKIP. cb719556c3의 원격 CI 39674936681도 API 3개 shard·빌드·품질·CI Gate 전체 PASS, Codex 재검토 추가/미해결 지적 0.
- 별도 SonarCloud는 Reliability C로 실패했다. 알림·사업 문의 wrapper의 같은 줄 guard/후속 문장을 명시적 block과 표준 포맷으로 구분하고, SQL placeholder의 `$1` 리터럴 치환을 반환 함수로 명확히 했다. 동작/권한/SQL 결과는 동일하며 PG17·Pharmcoop 전체68 재검증 PASS, 집중 ESLint 0. 인지 복잡도·스타일 등 비필수 유지보수 제안까지 무관한 리팩터링으로 확대하지 않았다. 새 HEAD의 Sonar·CI를 확인한다.

- Sonar 보완 HEAD d3cd7185a5의 CI 39676651323·SonarCloud 전체 PASS. 재검토 지연으로 20분 후 동일 HEAD를 재요청했고 추가 P2(Study 알림 수신 화면 없음)가 확인됐다.
- Study 수신 보완: Pharmcoop의 새 알림 UI를 공통 OperatorNotificationLink/OperatorNotifications로 추출해 두 소비처에서 재사용한다. 각 앱이 서비스 키·라우트 해석을 제공한다. Study는 lecture 알림을 수신하고 기존 service-entry/lecture 링크도 실제 로컬 강의 심사/강사 경로로 해석한다. 원래 글로벌 알림 이동 계약을 보존하기 위해 서버 발송 target은 유지했다. backend 심사/등록·권한은 변경하지 않았다. dependency/lockfile 변경 없음.
- 추출 후 공통 operator UI 전체216, Study 전체45, Pharmcoop 전체68 PASS. 두 앱 production build·집중 ESLint PASS. 실제 번들 1440/390에서 Study 알림→강의 심사 및 Pharmcoop 알림→조합 문의함을 모두 재검증: 각 알림 읽음 POST1, 강의/문의 쓰기0, JS 오류/문서 가로 넘침0 PASS. 계정/응답은 모두 합성으로 운영 쓰기0이다.
