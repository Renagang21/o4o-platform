# TODO-O4O-PHARMACY-BUSINESS-ENTRY-V1

> **상태**: COMPLETED
> **작성일**: 2026-10-15 (KST)
> **근거**: 약국 협력사업 조사 후 TODO·코드/문서 점검·구현·push·배포 요청

## 기준과 사전 대조

한 약국은 여러 협력사업에 가입하며 같은 내 매장에서 사업별 상품·콘텐츠·업무를 이용한다.
My Home에는 선택 약국의 가입 사업이 보이고 사업 공간으로 진입할 수 있어야 한다.
사업 운영자는 담당 사업의 승인·콘텐츠·가입자 공간을 관리한다. 콘텐츠는 현재 복사 모델이며
원본 동기화·저작권 관리 체계를 새로 만들지 않는다. 구체적인 사업별 특별 서비스는 업무 확정 후 개발한다.

정본: [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md),
[My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md),
[계정·서비스 가입](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md),
[약국 설계](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md).

기준 main `ac0ef5de9c`에서 새 전용 worktree·`wo/pharmacy-business-entry`를 생성했다.
기존 인증 조사 공간과 branch는 보존한다. 사용자가 본 공간에 push·배포까지 요청해
이번 변경의 개발·통합·배포를 담당한다. 다른 작업의 미통합 PR은 임의 병합하지 않는다.

| 대조 대상 | 현재 코드 | 보완 |
|---|---|---|
| MyHomePanels / StoreBusinessRecords | 선택 약국 헤더로 가입 사업 이름·상태만 표시 | 활성 사업별 가입자 공간 진입 추가, 비활성 상태 구분 유지 |
| Store / SemiFranchisesPage | 가입 관리 표와 활성 사업 상품·자료·주문 링크 | 활성 가입 사업을 카드로 먼저 제시, 기존 신청/탈퇴 보존 |
| KPA / 일반 business route | index가 참여 신청으로 이동 | 기존 공지·회원 이야기·자료 기반 홈 재사용, 사업 정체성 표시 |
| BusinessMaterials / BusinessStoreShortcut | 자료 열람 후 /store로만 이동 | 해당 사업의 자료 가져오기 경로로 연결, 복사 API 재사용 |
| PharmacyContentSources | 사업별 자료 필터·복사 존재 | 전달된 자료 ID를 기존 상세 API로 검증해 펼치기 |

사업자별 데이터 격리·URL의 사업 맥락 유지·역할과 담당 사업의 분리는
[Payload multi-tenant](https://github.com/payloadcms/payload/blob/main/docs/plugins/multi-tenant.mdx),
[개발자 URL 선택 논의](https://github.com/payloadcms/payload/discussions/17600),
[Vendure 역할·채널 논의](https://github.com/vendurehq/vendure/issues/3779)를 참고했다.
외부 프레임워크 도입이나 기존 O4O 권한 계약 변경이 아니다.

## 실행 TODO

- [x] 최신 main·작업공간·지침·정본·소비처·현재 배포 절차 확인.
- [x] 기존 코드와 요구사항 대조 및 최소 구현 범위 확정.
- [x] My Home 사업별 활성 진입과 오류/늦은 응답 처리.
- [x] 내 매장 가입 사업 카드 및 기존 가입 관리 유지.
- [x] 일반 사업별 홈과 사업 이름·기존 게시판/자료 연결.
- [x] 사업 자료에서 내 매장 자료 가져오기 연결 및 선택 자료 펼치기.
- [x] 집중 회귀·영향 앱 타입/빌드·lint·PC/모바일 합성 browser 검증.
- [x] 민감정보·diff·staged scope 확인 후 commit·push·PR.
- [x] 실제 ruleset·CI·리뷰 확인 후 순차 병합 및 현재 Delivery 배포.
- [x] 운영 서빙 코드·readiness 확인과 결과 기록.

## 범위와 검증 경계

기존 API·가입/담당 원장·권한 guard·handoff 계약을 사용한다. 운영 권한 변경·계정 병합·
Google 연결 변경·DB write/DDL·migration·의존성·lockfile·CI 변경은 포함하지 않는다.
복수 약국의 원본 업무 이동은 기존 계약대로 목적지에서 매장을 다시 선택한다.
사업 정보는 URL로 유지하되 서버 권한 검증을 대신하지 않는다.
My Home·Store·사업 홈·자료와 PC/모바일 소비처를 함께 검증한다.
실제 Google·카카오 로그인 검증은 사용자 담당이다. 운영 업무 데이터는 생성하지 않는다.

문서 정합: 이번 결과를 이 TODO에 갱신하며 기존 정본의 가입·복사·사업별 업무 경계를 유지한다.
DEPLOYMENT: AUTOMATIC — 이번 diff의 classifier는 LEVEL_2, neture·kpa-society·store 대상. 실제 누적 배포 판정은 Delivery 결과로 확인한다.
WORKTREE_DISPOSITION: KEEP — 동일 WO 배포 결과 기록 PR의 통합·종료 정리 전까지 보존.

## 로컬 검증 — 2026-10-15

- 저장소 pin Node 22.18.0·pnpm 10.25.0을 `/tmp` 도구 경로에서 활성화했다.
  frozen install은 의존성/lockfile 변경 없이 완료했고 저장소 설정과 달리 검증 옵션은 켜서 실행했다.
  최초 native 설치는 기본 캐시 경로가 읽기 전용이라 실패했으며 npm cache·node-gyp·XDG 경로를
  `/tmp`로 지정해 재실행했다. 패키지/공통 API 의존 빌드도 완료했다.
- Neture 전체 103 files / 982 tests, 약국 협력사업 전체 18 files / 141 tests,
  Store 전체 35 files / 439 tests PASS. 0 FAIL / 0 SKIP.
  Store 첫 전체 실행의 1 FAIL은 카드·관리 표의 중복 사업명을 단건 텍스트로 찾던 기존 검사였다.
  새 카드 제목을 찾도록 정합 후 전체 439건을 다시 실행해 통과했다. assertion을 삭제하지 않았다.
- 세 앱 TypeScript 포함 production build PASS. 최종 소스 재빌드와 재검증 결과는 아래에 이어 기록한다.
- Chromium PC 1440px / 모바일 390px에서 각 4개 흐름: My Home 사업 진입,
  내 매장 활성 사업 카드→자료, 사업 홈→자료→선택 자료 이동, Store 자료 복사→자료함 링크.
  최초 8/8 PASS 및 pageerror 0. 브라우저 인증·API·이동 도착은 합성 fixture이며 실제 OAuth가 아니다.
  초기 이동 완료 확인은 합성 도착 문서 heading을 기다리다 timeout이었고, 실제 handoff 목적지 URL과
  요청의 사업·자료 경로를 확인하도록 harness를 고쳐 재실행했다. 앱 코드를 우회하거나 guard를 끄지 않았다.
- 변경 파일 lint 오류 0. App의 기존 hook warning 2개와 BusinessWorkspace의 기존 warning 1개는 유지했다.
  더 넓은 business 폴더 lint에는 미변경 BusinessParticipationPage warning 1개도 포함된다.
- 문서 민감정보 검사·diff check PASS. 운영 업무 데이터 생성·삭제·권한 변경은 없다.

## 남은 범위

이번 단계는 기존 데이터로 가입 사업 표시·공간 진입·복사 흐름을 연결한다.
My Home의 사업별 최신 소식 집계와 사업 홈의 상품 전시 구성, 실제 사업자별 특별 서비스는
각 데이터/API·운영 업무를 대조하는 다음 단계다. 빈 지표나 미구현 메뉴로 표시하지 않는다.
현재 공급 상품은 기존 사업별 내 매장 공급 화면으로 연결한다.

최종 소스에서 세 앱의 TypeScript 포함 production build를 다시 실행해 모두 PASS다.
최종 bundle의 PC/390px 동일 8개 흐름도 다시 PASS, pageerror 0이며 Store·사업 홈의
페이지 가로 넘침이 없음을 확인했다. 모바일 스크린샷에서 사업 카드·홈·탐색 배치를 확인했다.
자료 이동은 첫 페이지 밖 자료의 기존 상세 API 조회와 사업 불일치 거절도 집중 회귀로 검증했다.
정본 My Home에 가입 사업 표시·진입·복사 원칙을 반영했다.
실제 main ruleset은 PR 필수·CI Gate 필수·필수 승인 0이다.
현재 GitHub actor는 소유자이나 DEPLOY_FREEZE 변수 조회 API는 integration 권한 403이므로
동결 해제 여부를 추정하거나 변수를 바꾸지 않고 실제 Delivery 게이트를 확인한다.


### 최신 main 반영과 추가 범위 검증

push 직전 main에 #607 Store 다국어 개선이 통합돼 자기 branch에 merge했다.
이번 가입 사업 경로와 충돌은 없었다. 변경된 Store 전체 485건과 production build를 재검증했다.
최초 병렬 실행에서 기존 cart 수량 검사 1건이 실패했다. 해당 파일·업무 코드에는 이번 diff가 없고,
수량 state를 items 변경 effect로 초기화하는 기존 경로가 있다. 해당 suite 단독 8건과 저장소의
표준 Store test 명령(`--maxWorkers=2`) 전체 485건은 PASS했다. 기존 cart 코드는 수정하지 않았다.
자료 화면도 선택 매장별로 초기화해 이전 매장의 늦은 응답·복사 상태가 남지 않도록 보완하고
조회 실패를 자료 없음으로 함께 표시하지 않도록 했다. 해당 회귀를 추가했다.
PR #622의 CI·리뷰를 확인한 뒤 최신 HEAD로 통합한다.

선택 매장 변경 회귀 추가 후 Store 표준 전체 검증은 37 files / 486 tests PASS다.


### Codex P2 2건 반영

- staff는 매장 공급·자료를 이용하지만 기존 사업 커뮤니티는 owner/admin/manager만 이용한다.
  My Home과 Store 카드·관리 표 모두 선택 매장의 원장 역할에 맞춰 가입자 공간 버튼만 숨긴다.
  직원의 기존 상품·자료 업무나 서버 권한은 바꾸지 않는다.
- My Home/Store→사업 홈 이동에 선택 약국을 URL 힌트로 전달한다. 사업 홈·자료 화면은
  기존 접근 가능 매장 API의 현재 계정 목록과 대조하고 검증된 조직 헤더로만 자료를 조회한다.
  복수 약국의 선택이 없거나 URL의 약국이 목록 밖이면 임의 약국을 조회하지 않고 선택을 요구한다.
  Store로 복사하러 이동한 뒤 Store의 매장 선택·권한 재검증은 기존대로 유지한다.
- My Home 관련 63건(직원·계정/매장 전환 포함), Store 전체 487건,
  약국 협력사업 전체 143건 PASS. 복수 약국 선택 전 조회 없음·선택 헤더·잘못된 URL 힌트 회귀를 포함한다.

### Codex 추가 P2 2건 반영

복사 오류를 목록 조회 오류와 분리해 실패해도 자료 목록과 재시도 버튼을 유지한다.
약국 또는 사업이 바뀌면 자료 목록 컴포넌트를 새로 구성해 새 약국은 1페이지부터 조회한다.
복사 실패→목록 유지→재시도 성공, 2페이지→다른 약국→1페이지 헤더 회귀를 추가했다.
최종 Store 전체 488건·약국 협력사업 전체 144건, 변경 lint 오류/경고 0,
두 앱의 TypeScript 포함 production build PASS다. Neture 최신 전체 983건과 함께 1,615건이다.

### 자료 조회 맥락의 리뷰 보완

검색·페이지 변경에서는 링크로 선택한 자료를 해제하고 서버 검색·페이지 결과만 표시한다.
URL 갱신과 화면 state 갱신 사이에도 선택 자료를 검색 결과/2페이지에 다시 삽입하지 않는다.
새 조회(사업·검색·페이지·새로고침)가 시작되면 이전 복사 오류·성공 안내를 초기화하고,
이전 조회 맥락에서 진행한 복사의 늦은 응답도 화면 상태를 덮어쓰지 않도록 했다.
선택 자료의 검색/페이지 이월 거절 2건과 새 조회 후 복사 오류·늦은 응답 제거 회귀를 추가했다.
Store 전체 491건 PASS이며 기존 Neture 983건·약국 협력사업 144건과 합해 1,618건이다.

### 복사 대상 약국·가입 후보·오래된 링크 보완

- My Home의 매장 상품/자료 진입과 사업 자료의 복사 이동은 기존 Store 매장 선택 화면을
  명시적으로 거친다. 이전 Store 탭에 다른 매장 선택이 저장돼 있어도 사용자가 복사 대상을
  확정하기 전에는 해당 자료 화면으로 진행하지 않는다. 기존 returnTo 보존·소유권 재검증을 사용한다.
- 사업 자료 선택 후보는 접근 가능한 owner/admin/manager 약국 중 현재 사업에 active 가입한
  약국으로 제한한다. 기존 사업 가입 조회를 후보 약국 헤더로 읽으며 신규 가입/권한을 만들지 않는다.
  조회 장애는 오류로 구분하고 URL의 미가입 약국을 다른 약국으로 대체하지 않는다.
- 선택 자료가 보관/삭제/이용 불가라 상세 조회가 실패해도 성공한 목록은 유지하고 별도 경고를 표시한다.
  다른 자료의 복사·재시도는 계속 가능하며 늦은 선택 자료 오류도 새 조회에 섞지 않는다.
- 최종 로컬 전체: Neture 983 / 약국 협력사업 145 / Store 492 = 1,620건 PASS.
  변경 lint 오류/경고 0, 세 앱 TypeScript 포함 build PASS.
- 최종 Chromium PC/390px 각 9흐름 = 18 PASS / pageerror 0.
  Store에 약국 B가 저장된 상태→명시적 선택→약국 A에 복사, 현재 사업 미가입 약국 제외,
  이용 불가한 선택 링크와 정상 목록 동시 유지까지 확인했다. 모든 인증·업무 API는 합성 fixture다.

## main 통합과 배포 검증

[PR #622](https://github.com/Renagang21/o4o-platform/pull/622)의 최종 HEAD
`700319b2031bcedd0da2345c0d933cf3eb75ee33`에서 Codex 리뷰 완료·미해결 0,
CI Gate·웹 build·API Jest 3 shard·CodeQL·SonarCloud 통과를 확인했다.
실제 main ruleset의 PR/CI 경계를 준수해 main `ca9da671831b35298cc757a89413bd2e58d8f5fb`에 병합했다.
병합 결과의 세 앱 소스는 검증한 branch와 동일하다.

PR CI [38701003043](https://github.com/Renagang21/o4o-platform/actions/runs/38701003043)의
첫 Code Quality는 미변경 auth-react의 socialAuth 테스트에서 `resolve is not a function`으로 실패했다.
공식 check annotations로 약관 promise resolver 준비 전 호출하는 테스트 타이밍 문제를 확인했고,
동일 소스 로컬 auth-react 19 files / 229 tests가 통과했다. 해당 job만 재실행해 같은 검사와
CI Gate가 모두 PASS했다. 공통 auth 코드/테스트나 assertions/CI 설정은 변경하지 않았다.
원본 job log redirect의 새 저장소 도메인은 제한돼 있었으나 annotations API로 실패 근거를 확보했다.
로그 주소·인증값·계정 원문은 기록하지 않는다.

main의 post-merge CI와 실제 Delivery·서빙 검증 결과를 아래에 이어 기록한다.

main CI [38703494897](https://github.com/Renagang21/o4o-platform/actions/runs/38703494897)의
첫 Web production build job은 미변경 Store의 `store-purchase-flow.test.tsx`에서
수량 갱신·재조회 중 checkout 잠금 검사 1건이 실패했다. 공식 annotations로 위치를 확인했다.
해당 suite의 로컬 단독 8건, 동일 앱 전체 492건 및 병합 전 같은 소스의 PR 웹 job은 PASS했다.
main API 3 shard·Code Quality 등 나머지 검사가 끝난 뒤 실패한 웹 job만 새 runner에서 재실행했다.
장바구니 코드·테스트·CI 조건은 이번 작업에서 수정하지 않았다.
실패 CI에 연결된 첫 Delivery는 웹 배포를 모두 skip했으므로 배포 성공 근거로 사용하지 않는다.

main CI 동일 SHA의 웹 job 재실행과 CI Gate는 최종 PASS했다. 실패 후 코드를 바꾸거나
검사를 생략하지 않았다. 후속 자동 Delivery는
[38705078597](https://github.com/Renagang21/o4o-platform/actions/runs/38705078597)이다.
이 검증 기록은 동일 WO의 통합·배포 closure를 위해 기존 전용 branch에서 연속 작성한다.

세 웹 deploy job의 `Smoke new revision and switch traffic (verified rollout)`과
`Verify deployment`는 모두 PASS했다. API는 배포 대상이 아니며 기존 revision을 유지했다.
배포 후 공식 도메인의 HTML·entry JavaScript를 직접 읽어 모두 HTTP 200과 신규 기능 코드를 확인했다.
Neture `index-JtBA43Hp.js`, Store `index-DumMjwTq.js`, 약국 협력사업 `index-hBQUkljV.js`이다.
API `/health/ready`도 HTTP 200 / ready를 확인했다. 실제 OAuth·운영 계정 업무 접근 검증과는 구분한다.
운영 업무 데이터 생성·수정·삭제는 없었다. 브라우저 복사 검증은 격리된 합성 API fixture만 사용했다.

Delivery 최종 결과는 SUCCESS이고 main `ca9da671831b35298cc757a89413bd2e58d8f5fb`의
`production` commit status는 `success / DEPLOYED · deploy: neture,kpa-society,store`다.
이번 구현·배포 단계는 완료했다. 위 남은 범위는 별도 후속 구현이며 완료 범위로 간주하지 않는다.
이후 결과 기록만 담은 문서 PR은 `DEPLOYMENT: NOT_APPLICABLE`이며 운영 재배포 대상이 아니다.
