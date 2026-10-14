# CHECK-O4O-STORE-HOME-PUBLISHING-WORKFLOW-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15 (한국시간)
> **근거 요청**: 내 매장 홈·업무 바로가기·게시/활용 상태를 한 묶음으로 정비. 개발 담당은 검증·commit·push·PR까지 진행.

## 기준과 fresh census

기준 main: `b696c5de0d017d885ea33343c62d1f349547d6ca`. 전용 branch: `wo/store-home-publishing-workflow`. PR #589·#591은 착수 시 OPEN이며 해당 변경을 가져오지 않았다. 이번 구현은 그 PR들의 authoring/library 모듈에 의존하지 않는다.

| 대상 | 현행 소비처 | 조사에서 확인한 문제 |
|---|---|---|
| `StoreHomePage` | App의 공통 `/store`와 서비스 지정 `/work/kpa-society/store` index | 공개 slug 부재를 매장 미연결로 판정. 오류를 숨기거나 이전 성공 데이터를 유지. 요청·매장 전환 소유권 없음 |
| `StoreAssetsPage` | 두 매장 트리의 `content`, workspace 활용 카드·자료함 보조 진입 | 기본 View는 success=false 응답도 반영할 수 있고 같은 화면의 조회·쓰기 경합을 구분하지 않음 |
| `StoreWorkspacePage` | commerce/studio/use 기존 세 landing | 저장·게시와 실제 적용·재생의 구분을 후속 작업 문구에 연결할 필요 |
| `StoreContentNextSteps` | snapshot/direct 편집·상세 화면 | 이전 direct ID나 매장에서 열었던 QR 대상이 새 화면까지 이어질 수 있음 |

공통 `StoreAssetsView`, `StoreAssetsPanel`, policy gate, Home 파트의 소비처와 export 계약도 확인했다. 공통 package를 수정하지 않고 기존 Home 파트·정책·Panel을 그대로 소비하며 web-store의 요청 controller만 별도로 소유한다. 다른 서비스의 View 동작은 변경하지 않는다.

## 구현과 기존 계약

### 홈 현황과 업무 진입

- `useStoreOperationScope`는 매장·서비스·mount 수명을 확인한다. 홈·게시 세션은 해당 key가 바뀌면 새로 시작한다. 실제 활성 매장은 요청 직전·완료 시에도 확인한다.
- `homeOverview`는 홍보 성과·활동·등록/제작 자료 수·진열 상품 수·업무 신호를 독립적으로 읽는다. 공개 주소를 매장 연결 판정으로 쓰지 않고 현재 StoreContext의 선택을 따른다.
- 확인된 0과 조회 실패를 구분한다. 실패한 source는 null 및 해당 source 이름으로 안내하고 재조회할 수 있다. 최근 활동·홍보 성과의 실패를 정상 빈 기록으로 표시하지 않으며, 재조회 실패 시 과거 성공 값을 남기지 않는다.
- 업무 신호는 기존 endpoint의 success/data envelope를 직접 확인한다. null data를 빈 신호로 치환하는 shared convenience wrapper는 이 화면에서 사용하지 않으며 공통 API 계약은 수정하지 않는다.
- 기존 실행 자료 API의 total을 파일 수로 오해하지 않도록 “직접 등록·제작 자료”로 표시하고 참고 자료 목록으로 연결한다. 가져온 snapshot 전체를 포함한 자료함 총수라고 주장하지 않는다.
- 자료 준비·게시 상태·활용 진입을 연결하고 매장 내 링크에 현재 URL의 서비스 지정 base를 유지한다. 기존 사업별 공급·주문·판매 설정 경로는 유지한다. 실행 흐름의 QR·태블릿·사이니지 적용은 기존 workspace=use를 사용한다.
- 미정의 primary 기본 색상 대신 정의된 primary-600을 사용해 1단계 번호와 아이콘을 표시한다.

### 게시 설정과 후속 활용

- 기존 shared Panel·policy gate를 유지하고 `useStorePublishing`에서 조회·쓰기·재시도를 관리한다. 기존 `draft → published → hidden → draft`와 user_copy/campaign_push 조건, 강제노출 전이 금지·템플릿 제한을 유지한다. 서버 권한을 대체하지 않는다.
- success/data, snapshot ID와 요청한 publishStatus를 확인한 결과만 반영한다. 단건·일괄 쓰기를 같은 동기 잠금으로 막고 쓰는 동안 조회로 이전 상태를 덮지 않는다. 화면의 fieldset은 진행 중 조작을 잠시 비활성화한다.
- 일괄 변경은 중복 ID를 제거하고 현재 확인된 row에 기존 정책을 적용한다. 부분 실패 시 성공한 행만 갱신하고 실패한 ID·목표 상태로 재시도한다. 알 수 없는 ID나 정책 제한 자료에 쓰지 않는다.
- 조회는 기존 200개 범위를 유지한다. 전체 total이 더 크면 “조회한 자료 기준”임을 표시하고 전체 현황인 것처럼 보고하지 않는다. 원장·페이지 API·공통 Panel의 필터 의미는 바꾸지 않는다.
- 게시 설정은 snapshot 사본 대상이며 직접 작성·제작 자료는 자료함에서 관리함을 안내한다. 게시 설정 변경 성공을 기기 연결·적용·재생 성공으로 표현하지 않는다.
- 자료 선택/편집·실제 적용/출력·홈으로 돌아가는 기존 경로를 연결한다. 게시 패널의 모바일 KPI·헤더·탭·작업막대는 소비처의 scoped class로 배치한다.
- 저장 direct 콘텐츠의 다음 작업은 content ID 또는 매장/서비스가 바뀌면 QR 대상 세션을 닫는다. snapshot을 direct QR 대상으로 승격하지 않고 기존 QR 생성 계약은 변경하지 않는다.

route 등록·API 계약·권한·DB·schema·의존성·lockfile·공통 Core·AI 연결 변경 없음. 원본 콘텐츠·channelMap·실제 기기 상태를 수정하는 새 작업을 만들지 않았다.

## 정책 근거

- [역할별 업무공간 §9](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)
- [My Home과 내 매장 구분](../baseline/O4O-MY-HOME-CANONICAL-V1.md)
- [매장 Web 업무 흐름](../platform/store/DESIGN-O4O-STORE-WORKSPACE-WEB-V1.md)
- [자료·자산 원본 경계](../design/DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1.md)
- [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [공급자→매장 B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)

## 검증

Node `22.18.0` · pnpm `10.25.0` 활성화. frozen lockfile·store integrity 검증을 유지해 설치하고 store-web 의존 패키지를 concurrency=2로 빌드했다. 저장소 설정·lockfile은 변경하지 않았다.

| 검사 | 결과 |
|---|---|
| `pnpm --filter store-web test` | 19 files / 188 tests PASS. 신규 요청·정책 회귀 21개와 실제 페이지·다음 작업 회귀 10개 포함 |
| `pnpm --filter store-web build` | TypeScript + production build PASS |
| 변경 파일 ESLint | 0 errors / 0 warnings |
| `node scripts/lint-ratchet.mjs` | PASS. 전체 46 errors / 994 warnings, error baseline 46 유지 |
| Chromium 합성 API 검증 | 1280 / 375 / 320px에서 87 assertions PASS |
| `git diff --check`, docs 민감정보 검사 | PASS |

브라우저는 실제 Home·StoreAssetsPage와 shared Panel·workspace studio/use·StoreContentNextSteps를 실행했다. API·매장 컨텍스트·관리용 가이드만 fixture로 대체하고 QR 생성 및 범위 밖 편집기는 경계 fixture로 분리했다. 저장소 밖 임시 harness에서 외부 요청을 차단했다.

실행 항목: 홈 부분 실패와 정상 빈 데이터 구분·재시도, 공개 slug 없는 선택 매장, 업무 신호·사업 경로, 서비스 지정 링크와 활용 mode, 게시 조회 실패·재시도, 조회 상한 안내, 강제/템플릿 제외, 단건 실패와 재시도, 일괄 부분 성공과 실패 ID 재시도, 진행 중 매장 전환, 새 홈에서 이전 활동 제거, 저장 콘텐츠 ID·매장 변경 시 QR 대상 닫기, 활용 상태에서 게시 화면 복귀, 모바일 overflow·번호 배경 표시·브라우저 예외 없음.

초기 harness의 상대 경로 alias·매장 컨텍스트 fixture 누락은 실제 module 연결을 보완해 해결했다. 페이지 테스트의 상태 라벨도 실제 shared mapping에 맞춰 수정 후 재실행했다. 이미지 점검에서 발견한 1단계 번호 배경은 정의된 토큰으로 보완하고 production build·동일 브라우저 흐름을 재검증했다.

기존 전체 lint 오류 46개와 build의 큰 bundle·Browserslist 안내는 이 작업에서 해결한 항목이 아니다.

## 인계와 제한

실계정 로그인·역할 검증·운영 데이터 변경·QR 생성·기기 연결/재생은 실행하지 않았다. 합성 상태 변경은 fixture 메모리에만 적용했다. 현황 API가 실제 운영 권한·실데이터를 반환하는지와 실제 장치 결과는 기존 사용자 결정대로 후속 실계정/실기기 단계에서 확인한다. Google OAuth 검증은 로컬 담당 대상이다.

개발 종료점은 commit · push · PR이며 통합 담당이 required CI·review blocker를 확인하고 순차 main 병합·배포·post-merge 검증을 수행한다. PR 미병합 동안 이번 branch/worktree는 KEEP한다. 다른 작업의 공간·branch는 변경·정리하지 않는다.

문서 정합: 기존 사업·게시·자료 소유 경계를 유지한 구현 정비. 정본·색인 판정 변경 없음.
