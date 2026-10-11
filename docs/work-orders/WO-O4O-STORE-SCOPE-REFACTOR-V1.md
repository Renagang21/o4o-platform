# 내 매장 선택 범위와 요청 경계 리팩토링

> **상태**: ACTIVE
> **작성일**: 2026-10-11
> **범위**: TODO 작성 → 문서·코드 조사 → TODO 보정 → 구현·검증 → push

## 최초 TODO

- [x] 자료함·사본 복사·콘텐츠 저장·게시 제어의 선택 매장 적용을 조사한다.
- [x] 인증 갱신·재시도 중 매장 전환의 요청 범위를 조사하고 수정한다.
- [x] 옛 매장 경로와 대형 화면 중복의 소비처를 대조한다.
- [x] 조사 결과로 이번 구현 범위와 후속 TODO를 보정한다.
- [x] 회귀 검증·빌드와 문서 정합을 확인하고 commit·push한다.
- [ ] PR의 최신 CI·SonarCloud·CodeQL과 리뷰 blocker를 확인한다(Sonar 중복률 보정 후 재검증).

## 기준과 안전 경계

매장 자산 경계는 organizationId이며 클라이언트 선택값은 권한 근거가 아니다. 서버의 기존 매장 자격·계약·소유권 판정을 재사용한다. 미확정 복수 매장은 KPA 소속 조직으로 임의 대체하지 않는다. 단일 매장과 선택값 없는 기존 KPA 사용 경로의 호환을 함께 검증한다.

근거: [역할별 업무공간 §3](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [매장 접근 정본](../baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md), [Store 계층 동결 규칙](../architecture/STORE-LAYER-ARCHITECTURE.md), [공통 모듈 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md).

운영 DB 변경·테스트 매장 삭제·이벤트 인덱스 전환·실제 PG 연결은 별도 운영 과제다. 이번 push는 main 통합이나 배포 완료를 뜻하지 않는다.

## 조사로 보정한 구현 TODO

- [x] 자료·사본·게시의 KPA 조직 해석을 요청의 선택 매장으로 통일한다.
- [x] 복수 매장 미선택과 허용 후보 밖 선택이 KPA 소속 조직으로 대체되지 않게 한다.
- [x] 선택값 없는 단일 매장과 기존 KPA membership 호환을 보존한다.
- [x] API Client의 인증 갱신 및 GET 404 재시도에서 최초 요청 매장을 고정한다.
- [x] 상품·상품 요청·태블릿·Screen Set 가져오기·미디어의 인증 재시도를 공통 전송 함수로 모은다.
- [x] multipart 본문과 개별 API의 응답·오류 계약을 유지한다.
- [x] 회귀 테스트·빌드 결과를 확정하고 branch를 push한다.
- [ ] PR의 최신 CI·SonarCloud·CodeQL과 리뷰 blocker를 확인한다(Sonar 중복률 보정 후 재검증).

### 확정한 결함과 수정

서버의 `asset-snapshot`, `store-content`, `store-library-feed`, `store-asset-control`은 선택 매장 헤더를 조직 판정에 전달하지 않았다. 복수 매장 미선택 시 기존 KPA 소속 조직으로 대체되는 경로도 있었다. `kpa-content-organization.ts`에서 기존 `isStoreOwner(..., 'kpa', preferred)`를 재사용한다. 명시 선택 불일치·모호한 조직은 차단하고 선택값 없는 legacy fallback만 유지한다. 자료함의 조직 없음 응답은 기존 빈 목록 계약을 유지한다.

Frozen `asset-copy-core`의 callback에는 Request가 없다. Core 서명 변경 대신 매 요청의 선택값을 가진 서비스 어댑터 closure로 연결한다. 동시 A·B 요청을 실제 Core factory로 검증하며 사용자별·모듈 전역 선택값을 추가하지 않는다.

클라이언트는 최초 A 요청의 401 뒤 매장을 B로 바꾸면 갱신 재시도가 B로 전송되는 문제가 있었다. 최초 헤더를 고정하고 갱신된 Authorization만 교체한다. `storeProductFetch` 이름은 호환 re-export로 유지한다. 상품 요청·표준 상품·태블릿·Screen Set Hub·미디어의 기존 중복 전송 코드도 같은 함수로 연결한다.

### 소비처와 후속 구조 정리

- `App.tsx`는 `/store/*`와 `/work/kpa-society/store/*`를 같은 pharmacy child route 집합에 마운트한다. `UnifiedStoreLayout.tsx`의 `ServiceStoreLayout`과 `toServiceScopedStorePath`가 service scope bridge의 실제 소비처다. 옛 mount만 삭제하면 직접 URL과 서비스 문맥 이동에 영향을 준다. 이번에는 호환 경로를 유지한다.
- pharmacy 화면은 web-store 68개 중 KPA 같은 상대 경로 59개, 바이트 동일 30개다(작업 기준 commit의 파일 비교). 동일 파일이라는 이유만으로 미사용 코드로 판정하지 않는다. StoreSignagePage(2,204줄), StoreQRPage(2,045줄), StoreTabletDisplaysPage(2,020줄), StoreChannelsPage(1,523줄)는 큰 화면의 분리 후보다. QR은 이미 공통 OperationBoard·PlacementPanel을 사용한다.
- 소스 literal 소비처 조사에서 `kcos-store-channel-asset-tenant.spec.ts`는 자산 제어의 KPA 판정을 직접 검사한다. 이를 새 어댑터 호출과 어댑터의 KPA service key 검사로 보정하며 검사 목적을 유지한다. 과거 조사 기록은 수정하지 않는다.

후속 TODO:

- [ ] 옛 경로를 만드는 모든 호출자와 외부 직접 URL 호환 방식을 확정한 뒤 bridge를 단계적으로 정리한다.
- [ ] 대형 화면의 상태·요청·폼을 기능 단위로 분리한다. 매 단계 최신 main에서 소비처를 다시 산출하고 Frozen 공통 UI 계약을 유지한다.
- [ ] 실제 계정의 두 매장 복사→수정→게시 및 원본 독립성을 확인한다. 이번 synthetic HTTP 검증을 운영 검증으로 간주하지 않는다.
- [ ] QR·태블릿 실제 기기 표시를 확인한다.
- [ ] 운영 테스트 매장 삭제는 별도 안전 진단에서 확인한 참조 차단을 해결한 후 진행한다.

## 검증 기록

- 공통 패키지 빌드: PASS.
- API build: PASS.
- web-store TypeScript·Vite build: PASS.
- asset-copy-core: 4 suites / 64 tests PASS.
- API: 5 suites / 96 tests PASS(조직 판정·동시 요청·복사·작성·편집·게시·기존 소비처 계약).
- web-store: 4 suites / 40 tests PASS(재시도 매장·본문·multipart·오류 및 화면 회귀).
- 변경 TypeScript 파일 focused ESLint·diff check·문서 민감정보 검사: PASS.
- PR: [#434](https://github.com/Renagang21/o4o-platform/pull/434), push 완료. 생성 시 main과 MERGEABLE.
- 최초 원격 CI Gate·전체 API Jest 3 shards·앱 빌드·품질 검사·CodeQL: PASS. 최초 코드 리뷰 지적 없음.
- 최초 SonarCloud: 새 코드 중복률 7.8%(기준 3%)로 FAIL. 콘텐츠 7개 소유권·조직 오류 분기를 공통 함수로 추출하고 기존 메시지를 보존했다. 사본 고정 config·resolver는 한 번 생성하고 요청별 선택 closure만 새로 연결한다. 인증 사용자·조직 없음·빈 목록·ID 검증·번역 소유 콘텐츠 조회도 같은 응답을 유지하는 공통 함수로 정리했다. 이후 로컬 API 96 tests·API build·focused lint는 다시 PASS. 문자열을 구분하는 controller-only 검사와 SonarCloud는 결과가 달랐다. 이후 재분석도 7.9%로 FAIL하여, 문자열을 무시한 API 전체 비교에서 게시·채널 제어/경영자 확인/번역 소유 조회의 남은 반복을 확정했다. 인증 사용자·게시 조직 핸들러와 번역 소유 조회를 공통화하고, 순수 검증·조회 함수는 파일 scope로 옮겼다(Sonar 주석 2건 반영). 최종 로컬 API 96 tests·API build·focused lint는 PASS, 문자열을 무시한 전체 API 비교에서 변경 줄과 겹치는 clone 0건이다. 이 수치는 SonarCloud를 대체하지 않는다.
- 서버 정리 `ce9c0c13d`의 CI Gate·전체 API Jest 3 shards·품질 검사·앱 빌드·CodeQL: PASS. SonarCloud: PASS, 중복률 0.4%, 새 issue·Security Hotspot 0건.
- 추가 프런트 공통화: JSON 응답 reader와 오류 factory를 재사용하고 ApiClient도 공통 전송에 연결했다. 인증 재시도 실패 시 최초 401 오류, 408 timeout, 쿼리 false/0/undefined 처리를 회귀 검증했다. web-store 40 tests·빌드·type-check·focused lint PASS.
- 프런트 후속 commit의 원격 CI·SonarCloud·CodeQL: push 후 최신 결과를 PR 링크에서 확인한다.
- 운영 DB write·main 통합·배포: 미실행.

WORKTREE_DISPOSITION: `wo/store-scope-refactor` / base `261cddc961f29f3d3ca71db9c23ffd2d226d154f` / KEEP(main 미통합).

## 배포 완료와 실제 검증 후속

PR #434는 `87831b3cf0e41522376a6d478c627295948d12a6`으로 main 통합됐다. 최신 PR CI Gate·SonarCloud·CodeQL과 post-merge CI·CodeQL PASS. Delivery `38095632561` SUCCESS, production `DEPLOYED · api,store`. API 준비 상태와 매장 홈·로그인 HTTP 200 및 앱 진입 HTML을 확인했다. 앞선 미실행·원격 대기 표기는 해당 push 시점의 기록이다.

실제 계정 후속은 [CHECK-O4O-STORE-REAL-WORKFLOW-VERIFICATION-V1](../checks/CHECK-O4O-STORE-REAL-WORKFLOW-VERIFICATION-V1.md)에서 진행한다. 로그인·읽기 범위 검증 중 자체 상품 선택 불일치를 발견했다. 제품·자료 생성/수정/게시·원본 독립성은 아직 PASS가 아니다.
