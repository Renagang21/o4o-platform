# O4O 전체 서비스 프론트엔드 정비 및 운영 안정화

> **상태**: ACTIVE
> **작성일**: 2026-10-11 · **최종 갱신**: 2026-10-11
> **근거**: 사용자 통합 작업 지시 및 사용자 테스트를 마지막에 수행하라는 순서 확정
> **범위**: 활성 서비스 내부 UI·서비스 이동·정책 정합 조사·기존 은퇴 작업 연계·검증·push·main 통합·운영 배포. 사용자 실계정/OAuth 테스트는 마지막 단계다.

## 1. 실행 순서

외부 인계 기록에 통합 TODO 초안을 먼저 작성했다. 최신 main `cba664e1e`의 지침·정본문서·구현을 조사한 뒤 아래 체크리스트로 보완한다. 개발과 환경 설정은 별개이며 게시된 클라우드는 running·current·failure 없음이다. 정상 push·PR merge·배포는 최신 AGENTS의 기술 gate를 따르고, 미확정 정책과 새로운 위험 범위는 별도로 확인한다.

| 순서 | 항목 | 조사 결과·완료 기준 |
| --- | --- | --- |
| T01 | 최신 기준 조사 | 기존 #402·#405·#414·#423·#425, #404·#424·#431, My Home #449의 완료 구현은 재구현하지 않는다. 현재 main과 이후 변경을 매 통합 전 재확인한다. |
| T02 | 내 매장 UI | 제품·자료·채널·분석·설정의 현재 화면을 점검한다. 넓은 표는 표 안에서 스크롤하고 문서는 넘치지 않도록 한다. 실제 기능·권한·데이터·API는 보존한다. |
| T03 | 공급자·펀딩 UI | 제품 목록의 긴 작업 버튼 묶음·목록/상세/폼/상태의 모바일 가독성을 점검한다. content-only/B2B 경계와 기존 사업·승인 계약을 유지한다. |
| T04 | 커뮤니티·강의·분회 UI | 현재 완성된 심사/탈퇴/회원 검색은 보존한다. 강의와 분회의 내부 목록·폼·표·조회 실패 상태를 점검한다. |
| T05 | 서비스 이동 | 대표 홈·My Home·독립 서비스·내 매장의 기존 목적지/로그인 유지/재시도/직접 URL을 PC·mobile fixture와 공개 운영 화면으로 확인한다. 실계정은 T13이다. |
| T06 | 약국 공지 | 사용자 확정 기준은 고정 공지 최대 3개와 비고정 최근 공지 5개. 회원용 목록의 검증된 선택 필터로 각각 조회해 최근 글 20개 밖의 고정 공지도 유지하고 최근 공지가 고정 과다로 밀리지 않게 한다. |
| T07 | 커뮤니티 공개 열람 | 목록 공개와 회원 콘텐츠 공개는 다르다. 공개 지정의 저장·읽기 정책을 먼저 확정한다. 기존 회원 자료를 자동 공개하지 않는다. |
| T08 | 이력 보존 | 자기 탈퇴는 이미 배포됐다. 보존 기간·자동 삭제 결정은 별도이며 조사·검토안을 먼저 준비한다. 기간 확정 전 운영 이력을 삭제하지 않는다. |
| T09 | 약관·개인정보 | 현행 본문·서비스 범위·인증 흐름 정합을 조사해 필요한 개정안과 발행 조건을 정리한다. 미확정 본문/버전을 운영에 발행하지 않는다. |
| T10 | PharmacyHub 폐기 연계 | 기존 폐기 WO의 최신 runtime/권한/귀속/FK/보존 판정과 실행 주체를 확인한다. 다른 세션의 폐기 작업을 중복 실행하지 않는다. 실제 blocker와 남은 실행 순서를 이 통합 TODO에서 추적한다. |
| T11 | 검증·push·통합·배포 | 변경 소비처의 tests/build/browser/diff/문서 검사 → path-specific commit/push → PR required CI·review → main PR merge·post-merge CI·현재 Delivery 정책·운영 smoke. |
| T12 | 문서·보존 점검 | 통합 TODO에 완료/미실행/사용자 결정/외부 blocker를 구분한다. 이전 공간의 정체·미푸시/로컬 파일·복원 가능성을 확인하며 최종 테스트용 공간은 유지한다. |
| T13 | 마지막 사용자 테스트 | 운영자 실계정의 공급자 관리·내 매장 신청 심사, 실제 Google/Kakao 로그인, My Home 본인 참여/활동/선택 매장 데이터·인증 이동 확인. 결과에 따른 수정·회귀·배포 뒤 최종 종료와 안전한 공간 정리를 판정한다. |

## 2. 보완 체크리스트

- [x] TODO 초안 작성, 최신 main·지침·완료 구현 대조.
- [x] T02 내 매장 대상 UI 조사·수정·PC/mobile 확인.
- [x] T03 공급자·펀딩 대상 UI 조사·수정·PC/mobile 확인.
- [x] T04 커뮤니티·강의·분회 현행/대상 UI 조사·수정·PC/mobile 확인.
- [x] T05 My Home 직접 URL·대표 홈 연결·매장 통계 범위·조회 복구 fixture 회귀 검증. 실계정은 T13.
- [x] T06 사용자 확정 기준으로 고정 3개·최근 공지 5개 구현 및 pinned 과다·오래된 공지 회귀 PASS.
- [x] T07 명시적 공개 저장·guest 목록/상세·운영 UI 구현 및 보안/API/UI 검증. 운영 반영은 T11.
- [x] T08 보존 목적·기간·예외·삭제/비식별화·FK 검토 순서 준비. 사용자 결정에 따라 확정/삭제 적용은 후속이며 이번 삭제 0.
- [x] T09 정책 정합 조사·기존 개정안/담당 작업·발행 조건 정리. 본문 게시 미실행.
- [x] T10 폐기 WO 연계·최신 외부 blocker·담당 주체 확인. 실제 폐기는 관련 WO에서 계속 추적.
- [x] T11 tests/build/browser·문서 검사·push·CI/review·main·배포/smoke. 최종 결과는 §9.
- [x] T12 문서 정합·현재 작업공간 보존 판정 KEEP 및 사용자 테스트 인계.
- [ ] T12 이전 클라우드 공간 식별·미푸시/로컬 파일·복원 가능성 확인. 식별 정보 미확정이며 삭제하지 않음.
- [ ] T13 최종 사용자 테스트·발견 문제 반영·종료 판정.

## 3. 안전 경계와 검증 구분

UI 표현 변경으로 권한 계약을 확장하지 않는다. 별도 사용자 확정 정책에 따라 공개 읽기 API와 선택 필터를 추가하며 승인된 운영자의 명시적 공개 외에 회원 권한을 완화하지 않는다. DB schema/migration·dependency·CI/배포 인프라는 변경하지 않는다. 현재 공통 소비처와 원장 경계를 정본문서로 확인한다. 넓은 표를 숨기거나 기능을 없애는 방식으로 모바일 표시를 해결하지 않는다. 합성 fixture PASS와 실제 운영 API/계정 검증은 구분한다. 사용자 테스트는 선행 코드 검증을 대체하지 않는다.

정본: [대표 홈](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md), [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md), [커뮤니티 후속](WO-O4O-COMMUNITY-REMAINING-TODO-V1.md), [PH 폐기 TODO](WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md).

## 4. 실행 기록

### 4.1 구현·영향 범위

- 공급자 제품 화면의 세 작업 버튼을 줄바꿈하고 주문 화면의 필터·통계 배치를 좁은 화면에 맞췄다.
- 펀딩의 참여 조회 실패를 참여 없음으로 표시하던 문제와 재조회 후 이전 참여 표시가 남는 문제를 수정했다. 모집 조회와 참여 조회 실패를 구분하고 다시 시도할 수 있다. 진행 건수는 조회 중/실패 때 0으로 표시하지 않는다.
- 강의·수료증 조회 실패 후 다시 시도할 수 있으며, 긴 제목·식별자·검색/입력 요소를 작은 화면에서 읽을 수 있게 했다.
- 매장 설정의 긴 옵션은 줄바꿈한다. 매장 제휴처·제휴 QR 및 분회 이력·행사 회원 표는 포커스 가능한 영역 내부에서 가로 스크롤한다. 온라인 채널의 자체몰 종료 안내·외부 채널 중심 현행 정책을 확인했다. 은퇴한 자체몰의 역사 데이터 표는 이번 변경에서 제외한다.
- 320px 펀딩에서 실제로 발견한 헤더 넘침을 공통 GlobalHeader의 줄바꿈으로 수정했다. 서비스명·My Home·대표 홈 버튼·계정/기능 메뉴를 보존한다.

공통 변경 조사: `packages/ui/src/layout/GlobalHeader.tsx`의 실제 서비스 소비처는 NetureGlobalHeader와 KpaGlobalHeader 두 곳이다. Neture 소비는 대표 사이트의 내부 화면·공급자·펀딩·커뮤니티이고 KPA 소비는 약국 서비스다. 둘 다 `@o4o/ui`의 dist export를 사용하므로 패키지 재빌드 후 소비 앱을 재빌드한다. 강의·분회·매장의 독자 헤더는 이 component를 사용하지 않는다. 공통 props·인증·권한·목적지 계약은 바꾸지 않는다.

### 4.2 정책 조사·사용자 확정 결과

| 항목 | 코드/정본 조사 | 후속 실행안·선행 조건 |
| --- | --- | --- |
| 공지 | `communities.routes.ts` → `createServiceForumRouter` → `ForumPostController.getPosts`: latest는 `isPinned DESC, createdAt DESC` 후 pagination. 사용자 결정 후 선택 필터 isPinned/type을 추가 | pinned=true limit=3, pinned=false type=announcement limit=5로 분리. 기존 회원 스코프/폐쇄 게시판 guard 유지 및 최근 공지 회귀 PASS |
| 공개 열람 | 커뮤니티 목록은 공개지만 회원 forum mount는 workspace.allowed를 검사. 전체 계정 인증 제거는 기존 회원 자료 공개로 이어질 수 있음 | 사용자 명시적 공개 기준 확정. 활성 독립 커뮤니티 운영자가 열린 게시판 전체/선택한 글 지정·철회. 별도 guest 목록/상세는 같은 SQL 조건·콘텐츠 응답 whitelist 사용. 비공개/직접 URL/권한/댓글·쓰기 차단 회귀 PASS. 기존 글 자동 공개 0 |
| 이력 보존 | `community_membership_changes`는 role/status/action/actor/reason의 변경 증빙을 저장. 현행 privacy retention의 6개 대상 테이블에는 포함되지 않음 | 변경 이력과 개인정보 접속기록을 동일 기간으로 추정하지 않음. 목적·종결 기준 시각·보유기간·분쟁/법정 보존 예외·삭제/비식별화 방식 확정 → FK와 재가입/운영자 보호 대조 → 건수만 dry-run → 검증된 집행. 이번에는 삭제·job 추가 없음 |
| 약관/개인정보 | [관련 개정안 PR #457](https://github.com/Renagang21/o4o-platform/pull/457)에 Neture 공통 계정 본문·서비스별 신청 조건·전역 동의 gate 차이·공고/시행 문제의 구체적 초안이 이미 있음 | 그 작업을 재사용하고 중복 초안을 발행하지 않음. 공개 v1 권리·위탁/국외처리 조항 대조, 실제 수신정보와 문서 version/hash 증빙, 공통/서비스 gate 분리 검증, 공고 기간·시행일 확정 후 새 draft 등록/게시. Git merge·웹 배포는 정책 DB 게시와 별개 |

### 4.3 다른 실행 주체와 연계

- [펀딩 PR #451](https://github.com/Renagang21/o4o-platform/pull/451)은 main `b565fb009`에 병합된 개설·심사·전용 포럼·개설자 운영의 별도 작업이며 Hub와 SupplierProducts 파일도 변경한다. 이번 조회 실패/배치 수정은 기존 모집·참여 계약만 다루고, main 통합에서 두 변경을 보존해 충돌을 해결했고 Neture 514 tests·관련 PC/mobile 15개 fixture를 재검증했다.
- PharmacyHub의 네 Cloud read 권한은 해소됐다. census [38118536052](https://github.com/Renagang21/o4o-platform/actions/runs/38118536052)은 SUCCESS이나 전환 완료가 아니라 실패 후 복구 확인이다. 호스트는 기존 응답 상태이며 자원/DB 삭제는 미완료다. [PR #456](https://github.com/Renagang21/o4o-platform/pull/456)은 엄격 HTTP 검증의 대기 시간을 보완한다. 담당 실행을 중복 dispatch하지 않으며 호스트/path/query/실제 QR·tablet 검증 성공 → 전용 자원 참조 0 → 데이터 귀속/FK·법정 보존 판정 순서로 추적한다.
- 이전 클라우드 작업공간의 식별 정보는 이 저장소의 worktree 이름만으로 확정할 수 없다. 기준 checkout과 과거 worktree를 유지하고 미푸시·복원 자료 확인 및 T13 결과 전 삭제하지 않는다.

### 4.4 검증·통합 상태

최종 소스 기준 결과와 PR/CI/배포를 아래에 기록한다. 합성 브라우저는 실제 현재 번들 및 모의 API를 사용하며 실제 개인 계정/외부 OAuth나 운영 DB 쓰기를 하지 않는다. 테스트 도구의 경로·cwd 설정 실패 및 빌드 중 산출물 읽기 실패는 수정 후 순차 재검증하며 운영 결함으로 집계하지 않는다.

- Neture 전체 496, Store 전체 40, Lecture 전체 6, Branch 전체 35, 공통 UI 19, Pharmacy 회원 홈 15 tests PASS. 펀딩 실패/복구/빈 참여/잘못된 응답 및 강의·수료증 실패→loading→성공 회귀를 추가했다.
- 공통 packages build와 Neture·Pharmacy·Store·Lecture·Branch 앱 build PASS. 마지막 표현 변경 후 해당 앱을 다시 빌드한다.
- 현재 번들의 PC 1440·mobile 390/320 브라우저 21개 및 추가 QR/약국 회원 홈/공급자 운영 허브 9개 PASS. 표 내부 스크롤, 오류 재시도, 긴 제목, 작업 버튼, 문서 overflow를 확인했다. My Home 1440/375/320의 9개 fixture E2E PASS.
- 변경 TS/TSX ESLint error 0. SupplierProducts의 기존 useMemo dependency warning 1개는 이번 표현 수정과 무관하며 따로 고치지 않았다. 문서 민감정보 검사·diff whitespace PASS.
- 최신 main의 공급자 SQL 수정 #454는 충돌 없이 기준으로 통합했다. 사용자 확정 후 별도 공개 읽기 API와 공지 필터를 같은 통합 작업에 포함했다.
- UI 및 소비처 CHECK를 push한 PR #458의 CI Gate/CodeQL/SonarCloud가 통과했고 소비처 표에 관한 P1 thread는 해결했다. 이후 #451의 main 병합으로 충돌이 확인되어 사용자 확정 공지·공개 열람을 함께 반영하고 최신 main 동기화·최종 CI/review를 다시 수행한다. main/운영 배포는 아직 진행 전이다.

상태는 최종 사용자 테스트와 미확정 선행 조건이 남은 동안 ACTIVE를 유지한다.

WORKTREE_DISPOSITION: `wo/frontend-integrated-stabilization` / `/workspace/o4o-wt/frontend-integrated-stabilization`, base `cba664e1e`, KEEP — 구현·통합·배포·최종 사용자 테스트가 남아 있다. 이전 작업공간은 삭제하지 않는다.

## 5. 사용자 결정 반영 · 같은 WO의 후속 phase

2026-10-11 사용자 답변: 공지는 고정 최대 3개와 최근 공지 목록을 분리한다(최근 5개로 시작). 공개 읽기는 운영자가 명시적으로 지정한 게시판/글만 허용한다. 보존·법률 정책은 조사·개정안 후 확정한다.

UI PR #458에 이 WO의 공지·공개 정책 후속 phase를 함께 반영하고 같은 branch/worktree에서 최종 검증·통합한다. 새 독립 작업이나 과거 완료 worktree 재사용이 아니다.

- [x] T06 고정 3개·비고정 최근 공지 5개 조회를 분리하고 pinned 과다/오래된 공지/실패·재시도 회귀.
- [x] T07 저장 계약: 기존 게시판 metadata에 운영자의 명시적 공개 설정만 저장. 기본 private, 게시판 전체 공개 또는 선택한 게시글 공개; 폐쇄 게시판·미승인/폐기 커뮤니티·draft/삭제/조직 전용 글 제외.
- [x] T07 공개 조회: 회원용 endpoint·승인 gate를 유지하고 별도 읽기 전용 endpoint 사용. 작성자 개인정보·원본 metadata·회원 댓글/활동/쓰기 API를 공개 조회에 포함하지 않음. UUID/slug 직접 URL에도 같은 조건 적용.
- [x] T07 운영 UI: 해당 커뮤니티 운영자만 공개 범위 지정/철회. 기존 회원 게시판과 공개 열람 화면을 연결하고 공개 글이 없거나 회수됐을 때 안내/복구 상태 표시.
- [x] 보안·API·UI·모바일 회귀 → PR #458·#467 CI/review → main/운영 배포 → 공개 운영 smoke. 실제 결과는 §9이며 실계정 사용자 테스트는 T13.

### 5.1 확정 정책 구현 검증

공개 읽기/기존 member mount·scope isolation API 56 tests, 공개 읽기/공지 필터 24 tests PASS. main 동기화 후 Neture 전체 514 tests와 Pharmacy 회원 홈 16 tests PASS. API·Neture·Pharmacy 최종 build PASS. 실제 번들 및 모의 API의 공개 목록/상세·철회 후 404·운영 설정/폐쇄 게시판 제한·약국 공지 PC 1440/mobile 390/320 9개 PASS. 고정 공지가 20개 이상이어도 최근 공지 5개를 별도 조회한다. 실제 운영 공개 지정이나 회원 DB 변경은 수행하지 않았다.

### 5.2 최종 리뷰 보완

HEAD `71c1604ba`의 자동 리뷰 P1은 raw SQL 날짜 컬럼의 Entity 매핑 불일치다. `p.created_at AS "createdAt"` 선택과 물리 컬럼 정렬로 목록/상세/운영자 chooser를 수정하며 실제 Entity metadata와 SQL reference 대조 회귀를 추가했다. 공통 소비처 CHECK에 main #451의 funding forum mount도 추가했다. 격리 PostgreSQL 검증은 운영 DB와 다른 Unix socket 전용 임시 cluster에서 수행하며 transaction rollback 후 자기 cluster를 종료한다. 새 HEAD의 required CI와 자동 리뷰까지 완료한 뒤 main 병합한다.

리뷰 수정 후 공개/공지 필터·generic isolation·회원 mount·main #451 funding forum API 98 tests PASS. raw SQL 전체 list/detail/chooser SELECT/ORDER와 createdAt 응답 alias, 명시적 공개/선택/철회/비공개/다른 scope를 격리 PostgreSQL 15에서 실행해 PASS했다. Entity decorator의 실제 물리 컬럼을 대조하는 API 회귀도 통과했다.

PH 연계 최신 관측: [QR Cutover 38119869917](https://github.com/Renagang21/o4o-platform/actions/runs/38119869917)은 SUCCESS이고 artifact after.json은 두 옛 호스트 matcher의 backend 연결 없이 pharmacy.neture.co.kr FOUND redirect 및 stripQuery=false를 확인했다. 이는 과거 rollback census 이후의 URL map 적용 증거다. 담당 자원 제거 PR #459는 별도 작업이며 전용 Cloud Run/backend/NEG·DB 귀속/FK/법정 보존 판단과 삭제 완료로 해석하지 않는다. 현재 클라우드는 spec/observed 37, current·running·failure 없음을 재확인했고 설정 재저장/게시 변경은 필요하지 않다.

공개 설정 chooser의 커뮤니티 전체 LIMIT 1000이 다른 게시판의 글을 밀어낼 수 있다는 P2도 반영한다. 열린 게시판별 LATERAL 조회로 최근 100개를 각각 선택하며 폐쇄 게시판을 선택 목록에서 제외한다. 고정/최근 공지 정책과 별개로 공개 선택은 최대100개다. 기존 선택 ID는 화면 목록 밖에 있어도 유지하고 서버는 저장 시 게시 상태·같은 게시판·조직 경계를 다시 검증한다.

후속 P1 보완: 최근100개 목록 밖의 기존 선택은 삭제 없이 유지하되, 개별 글 보기·선택 해제 컨트롤을 추가해 해당 글만 철회할 수 있게 한다. 선택 해제 후 저장하면 해당 ID를 제외하고 다른 선택을 보존한다. 삭제/draft 전환 등으로 보기 불가한 기존 ID도 개별 해제할 수 있다. 해당 회귀를 추가하고 운영 DB 변경 없이 검증한다.

공개 설정 UI 5 tests 및 최종 Neture build PASS. 목록 밖 선택의 보기/개별 해제/저장 payload를 실제 번들 PC1440·mobile390/320 3개 fixture에서도 확인했다. 원래 선택의 보존과 의도적인 개별 철회를 구분한다.

## 6. 최신 통합 소스 검증 (2026-10-11)

main #460 공급자 책임 분리·#455 점검 스크립트·#461 My Home 참여/활동 통합을 자기 branch에 merge 방식으로 반영했다. 다른 세션의 작업을 재구현하거나 작업공간을 변경하지 않는다. 최신 Neture 전체 526 tests·production build PASS, My Home 최신 PC1440/mobile375/320의 18 E2E PASS. 공개 UI 5 tests·목록 밖 선택 보기/개별 철회 PC1440/mobile390/320 3 fixture PASS. API 공개/공지·회원 mount·generic isolation·funding forum 98 tests PASS. API build PASS와 격리 PostgreSQL의 전체 list/detail/chooser SQL/물리 컬럼/JSON/공개 조건/게시판별 상한 검증 PASS를 확인했다.

PR #458의 이전 HEAD 전체 CI는 통과했으나 리뷰에서 발견한 목록 밖 개별 철회를 보완했으므로 최종 HEAD의 required CI·자동 리뷰를 다시 수행한다. 이 절 시점의 push/main/배포는 완료로 표기하지 않으며 실제 결과를 후속 기록한다. 대표 홈 정본의 과거 화면 미적용 표기는 이미 main에서 #402 구현·배포 완료 상태로 정비되어 있어 중복 수정하지 않는다.

실계정 사용자 테스트는 T13에서 운영자 공급자/내 매장 관리, Google/Kakao, My Home 실제 Study/Funding/커뮤니티/선택 매장 데이터와 서비스 이동, 약국 회원 홈, 공개 설정/철회를 확인한다. 이전 공간은 식별·보존 확인과 사용자 최종 테스트 전에 삭제하지 않는다. 현재 worktree는 같은 미완료 WO의 연속 phase이며 KEEP이다.

## 7. 최종 공개 지정 출처·철회 보완 (PR #458 후속 P1)

과거 신청자가 넣을 수 있었던 공개 예약 metadata를 신뢰하지 않도록 기존 서버 키의 HMAC 출처 검증을 추가했다. 운영자 저장 경로만 대상 커뮤니티/게시판/공개 범위를 서명하며 unsigned legacy·복사·변조 값은 private다. 새 secret/schema/migration/backfill 없이 기존 배포의 `JWT_SECRET`을 사용한다. 키 변경 시 재지정 원칙을 역할별 업무공간 정본에 반영했다.

게시판 설명/삭제 요청·운영자 심사가 공개 철회 직전에 읽은 Entity의 오래된 유효 서명을 되살리지 않도록 허용 필드 partial update 및 현재 JSON의 lifecycle patch 원자 병합으로 변경했다. 공개 예약 키는 일반 병합에서 제외한다. 공통 controller/operator의 직접·간접 소비처를 CHECK에 보완했다.

focused API 6 suites 109 tests PASS 및 격리 PostgreSQL 실제 소스 실행에서 출처 검증·타 scope/closed/draft/org 거부·공지 날짜 alias·게시판별 chooser·철회/stale proof replay 거부·기타 metadata 보존 PASS. 운영 DB 설정 저장·이력 삭제·법률 게시·새 migration은 실행하지 않았다. 최종 push·CI·review·main/배포는 후속 실제 결과로 기록하며 사용자 검증은 T13에 유지한다.

후속 API build·변경 파일 ESLint PASS. 추가로 공통 controller의 raw-source 소비 계약을 포함하는 community catalog/access 31 tests PASS. 문서 민감정보 검사 3852 files 0건 및 diff whitespace 검사 PASS.

### 통합 대기 중 외부 작업 최신화

main #459 PH 자원 제거 도구 및 #465 plan 결과 문서를 통합했다. 읽기 전용 plan은 성공했으나 실제 삭제는 누락 IAM 권한 3개 보완 전 대기다. 이 세션은 해당 apply/권한 변경을 실행하지 않는다. main #463 점검 SQL collation 수정과 #466 기존 승인된 매장 검증 복사본 정리 phase 종료 문서를 통합했다. 이는 활성 서비스 UI나 공개 정책을 바꾸지 않는 담당 작업의 결과이며, 사용자 실계정 테스트를 대체하지 않는다. 이 세션의 추가 검증은 자원 안전 테스트 18 PASS, 복사본 점검 테스트 4 PASS·격리 DB 의존 1 SKIP이다. 최신 main 통합마다 최종 HEAD의 required CI를 다시 확인한다.

후속 P1: 기존 선택 B가 삭제/archived/draft로 바뀌어도 공개된 A의 선택 해제가 거절되지 않도록, locked board의 현재 서명이 유효한 기존 selected ID와 새 추가 ID를 구분한다. 새 추가 ID는 기존과 같은 게시판/published/non-org 조건을 검증하며, 기존 선택은 자동 삭제하지 않는다. 현재 읽기 predicate는 유효하지 않은 기존 글을 계속 제외하고 A를 해제해 저장하면 UUID/slug 직접 열람도 철회된다. unsigned legacy ID는 기존 선택으로 신뢰하지 않는다. focused API 112 tests PASS; 격리 PostgreSQL에서 draft/archived/deleted 세 경우의 A 철회·B 비노출·유효하지 않은 신규 ID 거부 PASS.

## 8. main 병합·Sonar 후속 수정 (같은 미완료 WO)

PR #458은 HEAD `62f2eb25d2`의 required CI Pipeline 38126170214/CI Gate·CodeQL·Codex 통과, 미해결 리뷰 0으로 main `b19dc0a3d`에 병합됐다. 다만 별도 SonarCloud check의 실패 확인을 놓쳤으므로 전체 품질 검사 완료로 보지 않고 운영 배포 전에 후속 PR로 정정한다. 실패 annotation은 공개 서명 postIds의 암묵적 sort 비교와 약국 회원 홈 함수 complexity다. 지역 설정과 무관한 명시적 UUID 문자열 비교를 적용하여 기존 서명 정렬 계약을 보존하고, 비고정 최근 공지 predicate를 분리해 표시/조회 동작을 유지한다. 경고의 표 스크롤 키보드 focus는 접근성을 위해 유지한다. 기존 source 검증·이력은 삭제하지 않고 후속 실제 검사 결과를 기록한다.

품질 정정 검증: API focused 112·약국 홈16 tests PASS, API/약국 production build·변경 파일 ESLint·문서 민감정보/whitespace PASS. 약국 새 번들 PC1440/mobile390/320 3 fixture PASS. 격리 PostgreSQL의 서명·공개 조건·철회·stale 선택 검증도 다시 PASS했다. 최종 Sonar check를 CI Gate와 별도로 확인한 뒤 후속 main 통합·배포한다.

## 9. 최종 main 통합·운영 배포·사용자 테스트 인계

위 §4~§8의 통합 대기·당시 테스트 수·Sonar 실패는 각 단계의 기록이다. 현재 완료 상태는 이 절을 기준으로 확인한다. 같은 ACTIVE WO의 완료 기록 phase로 기존 전용 branch/worktree를 유지하며 새 독립 작업으로 재사용하지 않는다.

### 9.1 main 및 품질 검사

- [PR #458](https://github.com/Renagang21/o4o-platform/pull/458): main `b19dc0a3ddaa32073407687b8dc84870a398fc76` 병합. 병합 후 [CI 38126817025](https://github.com/Renagang21/o4o-platform/actions/runs/38126817025) SUCCESS. 별도 Sonar 실패는 §8과 후속 PR에서 정정했다.
- [PR #467](https://github.com/Renagang21/o4o-platform/pull/467): main `e1cd3b187861f22edd15c0ff2e05f4a43af1091f` 병합. 최종 HEAD의 CI Gate·CodeQL·별도 SonarCloud Code Analysis SUCCESS, Codex 주요 문제 없음·미해결 thread 0 확인 후 정상 PR 경로로 병합했다. 병합 후 [CI 38127790472](https://github.com/Renagang21/o4o-platform/actions/runs/38127790472) SUCCESS.
- 이후 다른 담당자의 My Home [PR #469](https://github.com/Renagang21/o4o-platform/pull/469)를 main `1604014f98771a0b74861e6770382d1436510099` 기준으로 반영하고 새 알림·본인 글·방문 추이까지 회귀 검증했다. 병합 후 [CI 38128523232](https://github.com/Renagang21/o4o-platform/actions/runs/38128523232) SUCCESS. #470의 검증 도구·기록은 런타임 소스 변경 0으로 후속 기준에 반영한다.
- 신규 schema/migration·dependency·배포 인프라 변경 0. 규칙 우회·main 직접 push·force push를 하지 않았다.

### 9.2 실제 배포 결과

[Delivery 38127405880](https://github.com/Renagang21/o4o-platform/actions/runs/38127405880)는 `b19dc0a3d`의 API·admin·Neture·Pharmacy·Store·Lecture·Branch 배포/점검을 완료했다. Sonar 정정 후 [Delivery 38128379067](https://github.com/Renagang21/o4o-platform/actions/runs/38128379067)는 `e1cd3b187`의 API와 Pharmacy 배포·트래픽 전환·serving Report를 완료했다. 최신 My Home [Delivery 38129107503](https://github.com/Renagang21/o4o-platform/actions/runs/38129107503)는 `1604014f9`의 Neture 배포·smoke·트래픽 전환·Report를 완료했다. 세 run 모두 SUCCESS이며 현재 정책의 자동 배포로 완료해 중복 Promote는 실행하지 않았다.

| 대상 | 최종 검증 배포 SHA | 현재 코드와의 관계 |
| --- | --- | --- |
| API | `e1cd3b187` | 공개 지정 출처·철회 및 공지 조회 포함 |
| Pharmacy (`kpa-society`) | `e1cd3b187` | 고정 최대3·비고정 최근5 및 품질 정정 포함 |
| Neture / 공급자 / 펀딩 / 커뮤니티 | `1604014f9` | 통합 UI·공개 관리 및 최신 My Home 포함 |
| admin / Store / Lecture / Branch | `b19dc0a3d` | 이후 대상별 runtime 변경 없음. 재배포 skip은 `BEHIND_NO_RUNTIME_CHANGE`이며 미배포 변경이 아님 |
| Hospital 도구 | 기존 revision 유지 | 이번 runtime 변경 없음 |

배포 완료와 법률 본문 DB 발행·PH 자원/데이터 삭제·실계정 검증은 별개다. 이 세션은 운영 설정 저장·회원 상태/권한 변경·이력 삭제를 실행하지 않았다.

### 9.3 마지막 회귀 및 공개 운영 확인

- API focused 6 suites 112 tests, community catalog/access 31, Pharmacy 16 PASS. API/Pharmacy build·변경 파일 ESLint PASS. 격리 PostgreSQL의 실제 소스 실행은 출처·철회·stale 선택·현재 JSON 보존을 확인하고 rollback/자기 cluster 종료까지 완료했다.
- 최신 Neture 전체 63 files 533 tests·production build PASS. 빌드와 테스트 동시 실행에서 기존 회원 조회 테스트 한 건이 timeout했으나 해당 파일 9 tests 및 전체 순차 실행 533 tests가 통과했다. assertion·제품 코드·timeout을 바꿔 통과시키지 않았다.
- 최신 My Home unit 13 tests, Chromium PC1440/mobile375/320 27 E2E PASS. 클라우드 Chromium 실행 경로를 명시해 재실행했으며 최초 브라우저 설치 경로 실패는 실제 테스트 실패와 구분했다. Pharmacy 새 번들 PC1440/mobile390/320 3 fixture PASS.
- 마지막 배포 후 공개 운영 HTTP 28개 PASS: 8개 서비스 HTML/entry asset, readiness, 공개 API의 빈 목록/직접 private ID/오류 범위 및 운영자·회원 API의 인증 경계를 확인했다. private 상세 404, 관리 API 401, 회원 API 403이다. 공개 목록에 지정 글이 없다는 결과를 실제 공개 저장 검증으로 해석하지 않는다.
- TLS 검증된 운영 번들/API를 사용한 비로그인 browser 9개 PASS(PC1440/mobile390/320). 공개 목록·비공개 직접 URL의 본문 보호·약국 guest 로그인 guard를 확인했다. 실제 운영자 계정·외부 OAuth·운영 설정 변경은 사용하지 않았다.
- 문서 민감정보 및 diff whitespace 검사를 완료 기록에도 적용한다. 문서-only 후속 PR은 runtime 배포 `NOT_APPLICABLE`이다.

### 9.4 마지막 사용자 테스트와 미실행 항목

다음 실계정 테스트는 사용자가 마지막으로 수행한다. 비밀번호·토큰은 전달하지 않고 오류가 있으면 주소·수행 순서·기대/실제 결과만 기록한다.

| 순서 | 사용자 테스트 | 기대 결과 |
| --- | --- | --- |
| 1 | 운영자 대표 홈에서 공급자·내 매장 | 기존 공급자 관리·내 매장 신청 심사 화면으로 연결 |
| 2 | Google/Kakao 각각 로그인·서비스 이동 | 정상 로그인, 원래 화면 복귀, 연결 계정 및 세션 유지 |
| 3 | My Home 참여·활동·알림·본인 글·선택 매장·방문 추이 | 본인 데이터 및 선택 매장 범위 일치. 다른 사용자/매장 정보 혼합 없음 |
| 4 | 약국 로그인 후 루트와 서비스 이동 | 회원 초기화면 바로 표시, hero·고정 최대3·최근5·커뮤니티/자료/내 매장 이동 정상 |
| 5 | 운영자 공개 지정/저장 → 비로그인 목록·상세 → 철회 | 명시적 공개만 표시, 회원 자료/댓글/쓰기 보호. 후보 밖 오래된 글도 개별 철회 가능하며 다른 기존 선택이 draft/archived/삭제여도 철회 저장 가능 |

T08 보존 기간·예외/삭제 방식과 T09 약관·개인정보 최종 본문/시행일은 조사·개정안 후 사용자 확정이 남았다. 자동 삭제 job·실제 이력 삭제·새 정책 DB 발행은 미실행이다. T10 PH 전용 자원 제거는 별도 담당의 성공한 read-only plan 이후 누락 IAM 3개 보완 대기이며 이 세션은 apply/권한 변경을 중복 실행하지 않는다. 실제 매장·기기 검증의 별도 담당 기록도 사용자 실계정 T13을 대체하지 않는다.

이전 클라우드 환경 ID·미푸시/로컬 파일·복원 가능성은 아직 확정하지 못했다. 해당 공간을 삭제하지 않으며 T13 및 보존 확인 후 정리한다. 현재 게시 버전의 관측은 spec/observed 37·current=true·running·connected·failure 없음으로 재확인했다. 기존 게시된 설정을 재저장/재게시하지 않았다.

WORKTREE_DISPOSITION: `/workspace/o4o-wt/frontend-integrated-stabilization` / `wo/frontend-integrated-stabilization`, source main integration #458·#467 완료 / runtime deploy·공개 smoke PASS / verdict KEEP — T13·정책 확정·이전 공간 보존 확인이 남은 같은 ACTIVE WO. 완료 기록 PR의 main 포함·clean 확인은 마지막 Git 검증에서 수행한다. 다른 세션의 worktree/branch는 삭제하지 않는다.

## 10. 남은 항목 연속 phase — 2026-10-12

사용자의 진행 지시에 따라 외부 후속 TODO 초안을 먼저 작성하고 main `20ed384b1`의 코드·정본·담당 실행을 조사해 보완했다. 같은 ACTIVE WO의 연속 phase로 전용 branch/worktree를 유지한다. §9의 배포 결과는 당시 결과이며 이후 공급자/펀딩/운영 UI의 다른 담당 변경을 재구현하거나 그 브라우저 테스트를 이번 세션 결과로 복제하지 않는다.

| 항목 | 최신 조사 결과 | 현재 실행/남은 단계 |
| --- | --- | --- |
| T08 변경 이력 | 기존 retention 대상6개에 community_membership_changes 없음. 운영자 처리 기록은 정본 §6의 최소1년·해당 시달력2년 기준 적용. 부모 삭제 시 cascade, actor 삭제 시 SET NULL | [조사·개정안](../investigations/IR-O4O-COMMUNITY-MEMBERSHIP-HISTORY-RETENTION-PROPOSAL-V1.md) 준비. 생성 후달력1년 이상 유지·2년 요건/본인 탈퇴/자동 생성 행 분류, 예외·FK 보호·처리방침 문구 포함. 최초6개월안 철회. 집행 확정 전 job/삭제 미실행 |
| T09 약관·개인정보 | 조사 중 담당 PR #457이 main `210529860`에 병합됨. 공통/서비스별 본문·동의 증빙·공고 구현 포함. PH 인증 제한 복구 완료로 종전 WIF blocker 해소 | 해당 담당 초안 재사용. 병합 후 CI·배포·실제 공고/정책 게시 증거는 담당 기록으로 확인. 예정일을 실제 공고일로 표시하지 않으며 이번 이력달력1년 제안은 자동 포함하지 않음 |
| T10 PH 폐기 | apply38187016286·재검증38187187895 SUCCESS: 전용 Cloud Run/backend/NEG 부재·12개 리다이렉트 PASS. WIF read-only smoke38187804879 SUCCESS | 종전 누락 IAM/Cloud 자원/원래 인증 복구 대기는 해소. PH-only DB 및 공용 코드 잔여만 담당 WO에서 계속 추적. 실제 기기/데이터 검증은 이번 active inventory0과 구분 |
| T12 이전 공간 | 현재 클라우드만 식별 가능. 이전 환경 ID/미푸시/로컬 파일 보존 증거 미확정 | 이름/ID 확인 요청. 이전 공간·다른 세션 worktree 삭제0. 현재 공간 KEEP |
| T13 사용자 테스트 | 이 세션에서 실계정/OAuth 검증을 수행하지 않음 | 사용자 결과 수집 → 발견 문제 수정/회귀/배포 → 종료 판정. 마지막 순서 유지 |

- [x] 후속 TODO 초안 → 최신 코드/문서/담당 결과 조사 → 위 표로 보완.
- [x] T08 구체적인 기간·기산점·예외·FK/계정 삭제 영향·개정 문구 검토안 준비.
- [x] T09·T10 최신 담당 결과를 읽기 전용으로 확인, 이전 blocker와 실제 잔여 범위 구분.
- [x] 이번 검토안·TODO 문서 민감정보 검사·상대 링크·diff whitespace PASS.
- 최종 commit/push·CI/review·main 통합 결과는 이 연속 phase의 PR에서 확인한다. 이번 변경은 문서-only DEPLOYMENT=NOT_APPLICABLE이며 담당 인증 PR의 실제 배포는 별개다.
- [ ] 기간/예외·본문 최종 확정과 필요한 후속 구현/발행. 현재 검토안은 DRAFT이며 정본 정책을 대체하지 않음.
- [ ] **즉시 선행 보호**: 현행 admin 계정 hard-delete의 membership/history cascade가 일반 최소 보존도 깨뜨릴 수 있음. [검토안 §2.1](../investigations/IR-O4O-COMMUNITY-MEMBERSHIP-HISTORY-RETENTION-PROPOSAL-V1.md#21-현재-활성-계정-삭제의-선행-보호--미구현)의 대상 가입·수행자 참조 계정 모두를 보호하는 전체관리자 삭제 차단 API 변경 범위 확정 → 구현/격리 동시성 검증/main/배포. 자동 삭제 job과 무관한 현재 위험이며 아직 보호 코드 미구현. 실제 계정 삭제 테스트 금지.
- [ ] 이전 공간 식별·보존 확인 및 마지막 사용자 테스트. 현재 작업공간 KEEP.

문서 정합: 종전 T10의 IAM3개 미해소 표기는 과거 조사 결과다. 최신 실제 자원 제거·인증 복구 완료와 DB/공용 코드 미완료를 이 절에 반영했다. 현행 보유기간 정본·게시된 법률 본문은 변경하지 않았다. 현재 클라우드 관측은 spec/observed41·current=true·running·connected·failure 없음이며 설정 재게시 없이 진행한다.
