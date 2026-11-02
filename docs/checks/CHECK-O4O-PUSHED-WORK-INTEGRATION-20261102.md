# CHECK-O4O-PUSHED-WORK-INTEGRATION-20261102

> **상태**: ACTIVE · **작성일**: 2026-11-02 · **성격**: 이번 통합·배포 회차의 증거 기록이며 정본 정책이 아니다.

## 범위와 경계

사용자는 push된 변경과 남은 PR의 main 병합·배포를 명시적으로 지시했다. 이 공간은 통합 담당으로 진행한다. #925의 기존 중앙 업무 grant 테이블 boolean 추가 migration을 포함하는 운영 반영 승인도 포함한다. 원래 개발 작업공간과 미커밋 파일은 수정하지 않았다. main 직접 push·강제 push·CI 우회·권한 확대·외부 실제 메일 발송은 하지 않았다.

원격 head와 PR 이력을 조사해 열린 PR #905·#920·#921·#922·#925, 유효한 push 전용 작업 네 건을 통합 대상으로 확인했다. 이미 닫힌 PR·폐기된 서비스·현재 main에 대체된 옛 구현은 되살리지 않았다. `wo/store-daily-workflow-upgrade`의 런타임은 현재 main에 이미 있으므로 충돌 다섯 파일에서 main을 유지하고 누락 CHECK/TODO만 회수했다. 원격 branch나 다른 세션 작업트리를 정리하지 않았다.

## 순차 병합

| PR | 내용 | merge SHA |
|---|---|---|
| #925 | 초대는 이메일만 입력, 수락 후 일반 업무 전체 기본 위임, 기존 별도 권한·기한 보존 | `5ad672a61a38d1cf445aa74ca0c675111fc61af9` |
| #920 | upload-artifact 갱신 | `e35d803016c8c1f40776d1a8d456524555129918` |
| #921 | setup-node 갱신 | `ae65473a109963cf9d5ffff59a8721cac9cd494e` |
| #922 | download-artifact 갱신 | `807db30f69ad6f4e3ba7e7ddbbf314ceb6a59847` |
| #926 | 개발 push·통합 PR 역할 경계 문서 | `8b1ce218206d4cc1a4ed2a691a77eea4ba028083` |
| #927 | 약국 시작 화면 상단 메뉴 제거 | `142f93d4a8fdf5d467d9169ee471fa19370dfacd` |
| #928 | 협력 모임 사용자 흐름·문의 준비 | `2e612f6295b3d4195acdbfb5a6740c8be371da53` |

#905·#929의 최종 의존 커밋을 모두 포함한 #929의 merge commit으로 함께 통합할 계획이다. 두 PR 각각의 최신 CI·CodeQL·Codex·Sonar를 확인하고, 병합 후 #905 HEAD 조상 관계와 자동 병합 상태도 확인한다. 문서 회수 #930은 최종 운영 검증 뒤 확정한다. 위 main `2e612f6295`의 CI `41391624134`는 SUCCESS다. 이는 배포 완료 증거와 구분한다.

#905 최종 `36ba89ffa9`와 #929 최종 `b6761072de`는 각각 CI Gate·CodeQL·Sonar PASS, Codex 최종 HEAD 리뷰 completed/no findings, 미해결 스레드 0건을 확인했다. #929를 merge commit `8ebda4f1910449333a9f2ecabf3687273ba47c1e`로 병합했으며 #905도 같은 merge commit으로 GitHub에서 MERGED가 됐다. 두 HEAD가 `origin/main`의 조상인 것을 확인했다. main 직접 push나 admin bypass는 없었다.

## 보완과 실행 검증

- #925: global 기존 역할에 명시적 중앙 위임이 있는 경우에도 자격 검토의 정확한 메뉴 권한을 검사하도록 P1 수정. 41개 회귀 검사 통과, 리뷰 해결.
- #905: 실제 canonical bootstrap + incremental이 적용된 일회성 PostgreSQL에서 공급자-매장·공급 제안·협력 업무·약국 commerce 4 suites/107 tests 통과. 잘못된 fixture DB guard 우회 없이 올바른 전용 DB로 실행하고, 과거 일반 커뮤니티/자동 약국 가입 기대값만 현행 정책에 정렬했다. HTTP·Offer 계약 별도 107 tests, 공급자 UI 46 tests, API 타입 검사 통과. allowlist와 담당 서비스 입력 타입 재사용으로 중복을 보완했다. Sonar 신규 중복률은 중간 HEAD에서 3.7%→3.4%→3.3%였으며 3% 조건 미충족이었다. 클라우드 환경의 상세 API는 CloudFront 403이었으나 CI의 public 진단 스크립트로 실제 중복을 수집했다. 원인은 supply-response HTTP 테스트와 service-feature 테스트의 provider mock 13행이었다. 관련 없는 provider mock을 공통 fixture로 분리한 뒤 HTTP·권한·Offer 4 suites/115 tests가 통과했다. 최종 #905 HEAD `36ba89ffa9`의 Sonar Quality Gate는 PASS이며 신규 중복률 0.0%, security hotspot 0이다. 테스트 fixture 중복을 제거한 결과이며 제외·기준을 바꾸지 않았다. 게이트·환경·권한을 변경하지 않았다.
- #929: 재알림도 최초 접수와 동일한 중앙 수신자·메뉴 검사. 실제 PostgreSQL 3 suites/46 tests, 재알림·global·독립 조직 회귀 2 suites/9 tests(중복 포함), 관리자 문의/탐색 24 tests, 관리자 전체 직렬 636 tests, API·Admin 타입 검사 통과. 문의 메뉴의 옛 문구를 기대하던 테스트를 현재 표시명으로 맞췄다. 최초 병렬 전체 실행의 범위 밖 비동기 테스트 불안정은 코드 수정 없이 CI와 동일한 직렬 실행에서 통과했다.
- #928: 협력 모임 100 tests, production build, 390px·1440px 브라우저 smoke 통과. 합성 API·loopback 구성으로 외부 업무 쓰기·실제 메일 0건.
- 격리 DB는 loopback에만 공개한 일회성 PostgreSQL이며 실제 업무 데이터·계정은 사용하지 않았다. 검증 종료 후 전용 preview를 종료하고 PostgreSQL container를 stop하여 자동 제거했다. 이름 일치 container 0건과 포트 55441·55432·3019 listener 0건을 확인했다. 일회성 DB의 테스트 데이터는 container와 함께 제거되었다.

## 필수 검사와 Sonar 한계

실제 main ruleset `24351641`은 PR + `CI Gate`를 필수로 요구하며 human approval은 0, strict latest-base는 false다. 관리자 bypass 없이 정확한 HEAD와 필수 검사·CodeQL·Codex 및 미해결 리뷰를 확인해 순차 병합한다.

Sonar는 별도 품질 검사다. 이번 작업 이전 main `edb26f21ea`도 신규 중복 6.2%, E reliability/security, 47 security hotspots로 실패했다. 이번 중간 main `5ad672a61a`·`807db30f69`도 같은 실패이며 `2e612f6295` 분석은 cancelled다. 이를 이번 작업의 신규 발생이나 해결 완료로 보고하지 않는다. #905 중간 HEAD의 3.3% 미충족과 #929 중간 HEAD의 1.8% 통과를 구분하며 최종 #905 `36ba89ffa9`는 Quality Gate PASS·중복 0.0%로 보완 완료했다. #929 최종 `b6761072de`도 Quality Gate PASS·중복 0.0%다. 이 기록은 보안 지적을 수용/무시 처리하거나 gate를 완화하는 조치가 아니다. 과거 main 누적 품질·hotspot 상세 검토는 이번 전체 병합/배포와 별도 범위다.

## 실제 계정·운영 검증의 한계

환경에서 제공된 테스트 계정으로 읽기 전용 검증을 시도했다. 공급자 로그인은 401, 매장 로그인은 200이나 공급 선택·장바구니 조회는 403이었다. 자격정보·사용자 원문은 기록하지 않는다. 권한 변경·인증 우회·주문 생성·실제 초대/메일 발송은 하지 않았다. 따라서 실제 권한 계정의 거래 완료와 실제 초대 메일 수신은 이 검증으로 완료했다고 보고하지 않는다.

## 최종 CI·배포·서빙

기능 main은 `8ebda4f1910449333a9f2ecabf3687273ba47c1e`다. 병합 후 CI `41398136932` SUCCESS, CodeQL SUCCESS. 자동 Delivery `41399208444`는 정확한 main·CI·freeze·serving 범위를 확인하고 LEVEL 3 HOLD로 완료했다. 동시 배포가 없고 owner 실행임을 확인해 Promote `41399413985`를 한 번 dispatch했다. 첫 Promote `41399413985`는 API의 production TypeScript 빌드에서 공통 `.ts` 테스트 fixture의 Jest 전역 미정의로 실패했다. 일반 CI의 tsconfig와 production tsconfig의 `__tests__` 제외 범위 차이였다. migration·revision·traffic 단계 전 실패했으며 이후 readiness HTTP 200을 확인했다. 단계 진입을 배포 성공으로 해석한 중간 안내는 사용자에게 정정했다.

복구 PR #931 (`bdaabfa039`)은 동일 fixture를 `.cjs`로 옮기고 두 테스트 import만 맞춘다. 추가 운영 코드·DB·권한·build 설정 변경은 없다. 실제 dependency closure, 115개 HTTP/권한/Offer 검사, production tsc, tsup, API/migrate entry 및 migration JS 598개 보존·fixture emit 없음이 로컬에서 통과했다. 운영 DB 연결 없이 검증했다. 관리자 production build 및 1280px·390px 합성 브라우저(성공/실패 각 2회)도 PASS다. 체크박스 0·이메일만 POST·결과 안내가 viewport 내 표시·메일 실패 시 목록 이동·성공 시 완료 동작을 확인했다. 스모크의 임시 처리중 role=status와 최종 성공 role=status 경합은 최종 성공 문구를 기다리도록 검증 도구만 수정했다. 실제 메일/운영 DB 쓰기 0건이며 전용 preview를 종료했다. 복구 PR #931은 CI Gate·CodeQL·Sonar PASS, Codex completed/no findings, 미해결 리뷰 0건을 확인하고 merge commit `f055d8fa7ef4492ef8e29265eec85621954f0a69`로 병합했다. 새 배포 대상은 이 SHA이며 main CI `41402300370` 진행 중이다. 새 Promote와 migration·서빙·운영 브라우저 증거를 확인 후 보완한다.

## 문서 정합

과거 Store CHECK/TODO는 당시 기록을 유지하고 회수 시점의 main 반영 관계를 상단에 명시했다. 기준 문서나 index 판정을 임의로 바꾸지 않았다. #905·#929의 통합 보완은 해당 CHECK에 기록했다. 완료 시점의 증거는 이 문서에서 연결한다.
