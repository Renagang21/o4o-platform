# TODO-O4O-PHARMACY-OPERATIONS-COMPLETION-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-16 · **최종 갱신**: 2026-10-16 (KST)
> **근거**: 약국 협력사업 잔여 전체를 단일 TODO로 묶어 조사·보완·구현·검증·push·통합·배포까지 진행 요청

## 확정 기준

- pharmacy.neture.co.kr은 현재 사업별 특별 서비스가 없다. 이번 완료의 미구현 항목이나 신규 개발 대상으로 두지 않는다.
- 표준 구조는 운영자/가입자의 사업 공간과 약국별 내 매장이다. 한 약국은 여러 사업에 가입하며 운영자는 지정된 사업만 관리한다.
- 공급자의 제품 승인·운영자 자체 콘텐츠 제작/게시·가입 약국의 열람/복사·내 매장 업무 연결을 끝까지 대조한다.
- 콘텐츠는 독립 사본을 만드는 복사 모델이다. 저작권·동기화·회수 기능을 추가하지 않는다.
- 실제 Google·카카오 로그인과 계정 선택은 사용자 확인 항목이다. 조회 결과·합성 검증과 구분하며 임의 계정 병합/연결 변경을 하지 않는다.
- 분회 운영자 지정은 신규 분회 구축 후까지 보류한다. 기존 가입·권한 정리나 재구축도 이번 범위가 아니다.

## 작업 기준과 정본

최신 main `a4063be499`에서 새 전용 worktree·`wo/pharmacy-operations-completion`을 만들었다.
기준 checkout과 기존 인증 조사 worktree를 보존한다. 이전 사용자 지시에 따라 이 공간에서 개발·통합·배포를 순차 담당한다.
[정본 지도](../CANONICAL-INDEX.md), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md),
[역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[가입·인증](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md),
[약국 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)를 기준으로 삼는다.
PR #603의 미통합 기록과 분회 보류 결정을 확인했으며 다른 작업 PR을 임의 통합하지 않는다.

## 전체 TODO

- [x] 최신 main·전용 작업공간·지침·기존 완료/미통합 기록 확인.
- [x] 전체 관리자 지정 원장 → 담당 사업 목록 → 각 조회·처리 guard 대조.
- [x] 공급 제안 승인/반려/중단 → 해당 사업/약국 공급 표시 검증.
- [x] 콘텐츠 초안 작성/수정 → 게시/보관 → 사업 가입자 표시 검증.
- [x] 활성/대기/정지/탈퇴 약국·다른 사업·다른 운영자의 접근 경계 검증.
- [x] 가입자 자료 → 대상 약국 명시 선택 → 독립 복사본 이용 검증.
- [x] 사업 홈 공지·소식·공급·자료·Hero/광고의 실제 소비처·전시 구성 점검 및 필요한 연결 보완.
- [x] 표준 업무만 있는 현재 pharmacy 범위와 운영자 안내·문서 정합.
- [x] 이전 화면 표시 계정 census의 기존 결과 확보·집계 판정, OAuth 확인 경계 기록.
- [x] 발견 결함을 코드·문서에서 보완하고 회귀로 검증.
- [x] 영향 소비처 테스트·타입·빌드·lint·PC/모바일 browser 검증.
- [ ] 민감정보·diff·staged scope 점검 후 commit·push.
- [ ] 실제 ruleset·CI·Codex·최신 main 대조 후 PR 정상 통합.
- [ ] Delivery 실제 판정·verified rollout·운영 코드/readiness 확인.
- [ ] 전체 TODO 최종 판정·실제 로그인 사용자 확인 항목과 완료 근거 기록·종료 정리.

## 기존 구현 대조표

| 항목 | 최신 main의 출처 | 이번 조사/보완 |
|---|---|---|
| 가입 사업·My Home·자료 복사·공급 미리보기 | 이전 PR #622·#626 및 각 완료 TODO | 현재 소비처와 회귀 확인, 재구현하지 않음 |
| 운영자 심사·콘텐츠 편집 | operator-core-ui pharmacy-management, Neture/KPA 두 소비처 | 지정 사업 scope·전환·쓰기 성공/조회 실패·게시 결과 연결 확인 |
| Hero·광고 전시 | 최신 HomePresentationEditor·사업별 편집 route | 기존 게시 계약·조회 가드·담당 사업/가입자 소비 대조 |
| Google 표시 계정 차이 | 기존 census #38665862802 | 기존 로그만 읽어 집계 확인, 신규 운영 조회·권한/계정 변경 없음 |

## 실행 경계

운영 데이터·권한·Google 연결·DB/schema·migration·dependency·CI 인프라는 변경하지 않는다.
실제 운영 업무 데이터는 만들지 않으며 상태 변경 검증은 격리 fixture에서 수행한다.
새 전시 원장/순위 정책을 임의로 추가하지 않고 기존 전시 계약을 먼저 사용한다.
실제 OAuth는 USER_VERIFICATION_PENDING으로 분리하며 이를 대신했다고 보고하지 않는다.

DEPLOYMENT: AUTOMATIC — 실제 최종 diff·누적 serving 비교와 Delivery 판정으로 확정.
WORKTREE_DISPOSITION: KEEP — 조사·구현·통합·배포 진행 중.

## 조사 결과와 구현 범위 확정

- 지정/조회/처리: 서버의 Neture operator guard와 `requireOperatorOf`는 활성 지정 원장을
  사용자·사업 ID로 대조하며 각 처리도 대상의 같은 사업 ID로 제한한다. 전체 관리자를 서비스 운영자로 재해석하지 않는다.
- 실제 소비처는 Neture wrapper와 약국 App의 공통 pharmacy-management module 두 곳이다.
  기존 공유 모듈/메뉴 규칙을 확인했고 이 운영/편집 페이지의 다른 서비스·분회 소비는 없다. 전체 관리자 페이지는 별도 AdminSemiFranchisePage 소비다.
- 최신 main에 기존 Hero/광고 운영 편집과 게시 계약이 있어 이를 재사용한다. 심사 화면에서
  해당 사업의 홈·전시 편집으로 이동하는 연결만 보완한다. 별도 상품 전시 순위 원장은 만들지 않는다.
- 두 소비처의 기존 목록/편집 wrapper가 계정 ID로 수명을 구분하지 않아 같은 route의 계정 변경 시
  이전 요청/입력이 남을 수 있다. wrapper에서 계정별 재구성으로 해결하고 기존 모듈의 요청 세대 방어를 유지한다.
- 기존 화면 표시 계정 census 로그를 확보했다. readOnly=true / TARGET_NOT_FOUND / 계정·활성·
  Google 연결·전체 관리자 지정 집계 각각 0이다. 실제 Google sub/로그인 세션 일치 조회가 아니므로
  연결 오류나 계정 병합 필요성을 판정하지 않는다. 신규 운영 조회·계정/권한 변경은 없다.
- 실제 OAuth는 사용자 확인 항목이다. 현재 범위의 특별 서비스는 NOT_APPLICABLE이다.

공급 제안/콘텐츠/가입 약국/사본 SQL 검증은 전용 loopback PostgreSQL 15 컨테이너의 일회성 DB에서
기존 canonical baseline·incremental fingerprint와 기존 테스트를 실행한다. DB ownership marker를
확인한 finally 삭제를 사용하며, 종료 후 이번 컨테이너·데이터도 정리한다. 운영 DB를 사용하지 않는다.

## 현재 검증 근거

- Node 22.18.0·pnpm 10.25.0 frozen/integrity install과 공통 빌드 PASS, manifest/lockfile 변경 없음.
- PostgreSQL 15 전용 loopback DB에서 canonical baseline·incremental 매 prefix fingerprint를
  확인한 뒤 기존 약국 commerce 24건과 supplier/store 4건 = 28 PASS / 0 SKIP.
  공급 제안 승인·복수 사업·비담당 거절·콘텐츠 게시/보관·가입 약국 원본·독립 사본·정지 차단을 포함한다.
  wrapper의 ownership marker 확인 후 DB count 0, 이번 전용 컨테이너/볼륨 삭제와 잔존 0을 확인했다.
- 신규 계정 전환 회귀는 Neture 2건·약국 웹 2건 PASS다.
- 약국 웹 전체 23 files / 166 tests, 공통 운영 UI 전체 18 files / 152 tests PASS다.
  KPA App의 기존 hook warning 2개는 그대로 유지했다.

브라우저 점검에서 공개 Neture의 `/operator/semi-franchises/*`는 최신 hostProfile 계약에 따라
약국 웹으로 handoff되는 호환 경로임을 확인했다. 공개 Neture에서 직접 운영 화면을 열어 보려던
첫 harness는 정상 handoff 뒤 목록을 기다려 timeout했다. 도메인/guard를 우회하지 않고
Neture 호환 handoff와 실제 약국 웹 운영 흐름으로 관측을 정정했다. 사용되지 않는 Neture 전용
홈/전시 버튼은 제거했고 Neture legacy wrapper의 계정 수명 분리만 유지한다.

## 최종 로컬 검증

- 최종 Neture 전체 110 files / 1,068 tests, 약국 웹 23 files / 166 tests,
  공통 운영 UI 18 files / 152 tests = 1,386 PASS. SQL 28건은 별도이며 중복 합산하지 않는다.
- 최종 두 앱 TypeScript 포함 production build PASS. 변경 파일 lint 0 errors / 0 warnings,
  KPA App의 기존 hook warning 2개만 유지한다. 민감정보·diff check PASS.
- Chromium PC1440/mobile390 각 7흐름 = 14 PASS, pageerror 0·가로 넘침 없음.
  공개 Neture의 canonical operator handoff → 약국 담당 사업 목록 → 기존 Hero/광고 편집 →
  공급 제안 확인/승인 → 콘텐츠 초안 저장/게시 → 가입자 공급/자료 표시 → 명시적 Store 선택
  handoff를 검증했다. 전부 합성 인증/API이며 운영 역할·콘텐츠·주문 데이터는 생성하지 않았다.
  첫 harness의 호환 도메인/모호한 선택자 문제를 바로잡았고 앱 guard·도메인 정책은 유지했다.
- 실제 계정의 현재 사업 담당/로그인·세션·업무 접근은 USER_VERIFICATION_PENDING이다.
  코드와 fixture 검증 및 과거 census 집계를 실제 OAuth·운영 계정 업무 확인으로 바꾸지 않는다.
  현재 표준 운영 범위의 특별 서비스는 NOT_APPLICABLE이다.

최종 재실행: Neture는 사용되지 않는 전용 이동 컴포넌트를 제거한 뒤 전체 110 files / 1,068 PASS,
공통 운영 UI 152·약국 웹 166과 합해 1,386 PASS다. 두 앱 최종 build도 PASS다.
실제 공개 운영 소비처는 약국 웹이며 Neture legacy wrapper는 호환/개발 소비처로 유지한다.

## PR 검사 보완

PR #654의 첫 SonarCloud는 신규 중복률 62.2%와 운영 화면 함수 복잡도 18(허용 15)을 지적했다.
계정 전환 시나리오를 복제한 소비처별 테스트는 두 실제 wrapper를 실행하는 매개변수 테스트로
통합해 동일한 4개 소비처/시나리오 검증을 보존했다. 운영 navigation을 별도 표시 함수로 분리했다.
Sonar 제외/threshold·assertion·CI 설정은 변경하지 않았다.
최신 main #648의 테스트 계정 SSOT·운영 스크립트 정비를 merge했으며 웹 기능 충돌은 없다.
현재 테스트 계정 문서는 `docs/local/TEST-ACCOUNTS.local.md`다. 이 작업은 실제 자격증명을 사용하지 않는다.

Sonar 보완 후 재검증: 매개변수 테스트의 두 소비처 4건, 공통 운영 UI 전체 152건,
Neture 전체 1,070건·약국 웹 전체 164건 = 동일한 총 1,386건 PASS다.
두 앱 TypeScript 포함 build·변경 lint·PC/mobile Chromium 14흐름도 다시 PASS했다.
검사 제외나 기준 완화 없이 중복 테스트 코드를 제거하고 navigation 표시 책임만 분리했다.
