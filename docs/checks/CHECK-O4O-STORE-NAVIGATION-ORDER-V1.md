# 내 매장 상단 메뉴 순서·명칭 조정

작성일: 2026-10-20 · 기준 main: `c53bd3c24baa` · branch: `wo/store-navigation-order`

## 요청과 변경

- [x] 최신 AGENTS·canonical index·역할별 공간·공통 모듈 변경 절차 및 소비처 확인.
- [x] 새 전용 branch/worktree에서 매장 운영을 대시보드 다음으로 이동.
- [x] 범위 검사와 PC/모바일 표시·이동 검증.
- [x] 사용자 후속 결정에 따라 메뉴 명칭을 ‘매장 컨텐츠’로 통일.

상단 메뉴는 `대시보드 → 매장 운영 → 상품·거래 → 매장 컨텐츠` 순서다. `STORE_WORKSPACE_AREAS` 항목 순서와 studio의 사용자용 명칭을 바꿨다. 대시보드 바로가기·해당 화면 제목·제작/활용 전환 메뉴와 AI 업무 이름도 같은 표기를 사용한다. URL·key·권한·기능은 유지한다. Core/API/DB/의존성 선언 변경은 없다.

직접 소비처는 같은 서비스의 `StoreWorkspaceShell`(상단 메뉴·현재 영역), `StoreAiAssistant`(영역 key로 label 조회), `currentWorkspaceArea`(subPath 조회)다. 위치 인덱스에 의존하는 소비처는 없으며 공통 `/store`와 사업 지정 `/work/kpa-society/store`에서 같은 순서를 사용한다. 다른 앱·Core에서 이 배열을 import하는 소비처는 없다.

## 명칭 검토

기존 화면은 신규 작성뿐 아니라 저장한 콘텐츠 조회·수정, 자료 가져오기, 파일·참고 자료 보관과 개별 편집기 진입을 포함한다. 후보 비교 후 사용자가 **‘매장 컨텐츠’**로 확정했다. 요청한 표기를 그대로 반영한다. 사이니지의 ‘새 안내 만들기’ 같은 개별 실행 버튼과 일반적인 콘텐츠 용어는 메뉴 명칭 변경 범위와 구분해 유지한다.

순서 수정 `319b31aaa54d` 이후 명칭 결정에 따른 같은 WO의 연속 단계로 전용 branch를 유지한다. 재확인 origin/main은 `71340f3b7fa7`이며 이 사이 Store 소스 변경은 없다. 자동 통합하지 않았다.

## 검증

Node 22.18.0 / pnpm 10.25.0, 전용 worktree frozen lockfile·무결성 검증 유지 설치.

| 검사 | 결과 |
|---|---|
| Store 의존 패키지 build | PASS |
| 명칭 확정 후 Store 전체 회귀 | 61 files / 724 tests PASS |
| Store TypeScript·Vite build | PASS |
| 변경 TS/TSX 8개 ESLint, warnings 0 | PASS |
| PC 1440px / 모바일 390px, 두 mount × 네 목적지 | 16 cases PASS |
| diff·문서 민감정보·staged scope | PASS |

브라우저는 실제 Shell/config와 합성 인증/매장 문맥을 사용했다. 확정 명칭·DOM 순서, PC 가로 배치·모바일 행 순서, 기존 URL 이동·활성 메뉴, 가로 넘침·page error 0을 확인했다. 실계정·운영 화면의 반영 검증은 아니다. 실제 업무 페이지 내부를 다시 검증한 것으로 주장하지 않는다. 단위 회귀에서는 AI context의 업무 이름과 대시보드 이동 label도 새 표기로 확인한다.

환경 증적: `/workspace/.o4o-navigation-order-20261020/`의 install/dependency-build 및 `naming-tests/build/lint.log`, `/workspace/.o4o-store-navigation-order-browser/`의 fixture·results.json·PC/모바일 스크린샷.

## 사용자 승인 후 통합 단계

2026-10-20 사용자가 이 공간에 ‘main으로 머지 → 배포’를 지시했다. 같은 WO의 통합 단계로 기존 전용 branch를 유지한다. 최신 main `dbb4f35e611a`를 merge했으며 Store 소스·의존성 선언의 충돌은 없다. 해당 main의 공통 UI 변경을 포함한 상태에서 Store 의존 build·전체 회귀·build·집중 lint와 PC/모바일 메뉴 이동을 재검증한다.

통합 후 의존 build·Store build·집중 lint 및 브라우저 16건은 PASS다. 빌드와 병렬 실행한 첫 전체 회귀는 723/724 PASS이며 기존 lazy 화면 전환 테스트 1건이 대기 시간 초과로 실패했다. 해당 파일 단독 재실행은 37/37 PASS다. 첫 브라우저 실행도 초기 로딩 시간 초과 뒤 동일 코드 재실행 16/16 PASS를 확인했다. 구현이나 테스트 제한 시간을 바꾸지 않았으며 빌드 종료 후 전체 회귀를 다시 실행한다. 전체 재실행과 PR 실제 HEAD CI의 최종 결과는 PR에 기록한다.

현행 main ruleset은 PR·`CI Gate` 필수, human approval 0이다. PR 실제 HEAD의 CI·Codex finding/미해결 스레드 및 최신 main 포함을 확인한 뒤 일반 PR merge를 사용한다. `DEPLOYMENT = AUTOMATIC` 예상이며 실제 Delivery 판정과 verified rollout·serving SHA 결과를 확인한다. DB·인증·배포 설정 변경이나 migration을 추가하지 않는다.

병합·운영 배포의 실제 결과와 링크는 이 변경의 PR 본문에 최종 기록한다. 배포 전에는 운영 반영 완료로 판정하지 않는다. 기존 사용자 승인 범위에서 운영 읽기 전용 메뉴 확인만 수행하며 계정 연결·로그인 확인 상태는 ignored `docs/local/TEST-ACCOUNTS.local.md`에만 보관한다. 기기 연결·재생·QR 출력/스캔·실제 업무 상태 변경·유료 AI 호출 검증은 이번 명칭 변경의 완료 조건에 포함하지 않는다.

`WORKTREE_DISPOSITION = KEEP`(통합 검증 재현 자료와 비공개 계정 연결 기록 보존).

문서 정합: 이번 변경과 사용자 명칭 확정·재검증 결과를 이 CHECK에 기록했다. 기존 운영 배포 기록은 변경하지 않았다.
