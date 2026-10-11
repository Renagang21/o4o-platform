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
| T06 | 약국 공지 | 회원 홈은 조회 20개 중 공지 3개를 표시한다. 실제 community mount의 공통 controller는 이미 고정 글 우선·작성일 내림차순으로 정렬한다. 오래된 고정 글을 신규 API로 다시 구현할 필요는 없다. 고정 글이 20개를 넘거나 비고정 announcement를 모두 노출하는 별도 정책은 미확정이다. |
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
- [x] T06 공지 실제 서버 계약 확인. 현행 고정 우선 유지·새 표시 정책은 별도 결정.
- [ ] T07 공개 열람 기준·저장/읽기 계약 확정 및 적용.
- [ ] T08 이력 보존 조사·검토안·확정 결과 적용.
- [x] T09 정책 정합 조사·기존 개정안/담당 작업·발행 조건 정리. 본문 게시 미실행.
- [x] T10 폐기 WO 연계·최신 외부 blocker·담당 주체 확인. 실제 폐기는 관련 WO에서 계속 추적.
- [ ] T11 tests/build/browser·문서 검사·push·CI/review·main·배포/smoke.
- [ ] T12 문서 정합·이전 공간 식별·보존 검토.
- [ ] T13 최종 사용자 테스트·발견 문제 반영·종료 판정.

## 3. 안전 경계와 검증 구분

공통 메뉴·Auth/Core·API·role·DB·migration·dependency·CI/배포 인프라 계약을 UI 표현 변경으로 확장하지 않는다. 현재 공통 소비처와 원장 경계를 정본문서로 확인한다. 넓은 표를 숨기거나 기능을 없애는 방식으로 모바일 표시를 해결하지 않는다. 합성 fixture PASS와 실제 운영 API/계정 검증은 구분한다. 사용자 테스트는 선행 코드 검증을 대체하지 않는다.

정본: [대표 홈](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md), [My Home](../baseline/O4O-MY-HOME-CANONICAL-V1.md), [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [공통 변경 절차](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md), [소비자 commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md), [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md), [커뮤니티 후속](WO-O4O-COMMUNITY-REMAINING-TODO-V1.md), [PH 폐기 TODO](WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md).

## 4. 실행 기록

### 4.1 구현·영향 범위

- 공급자 제품 화면의 세 작업 버튼을 줄바꿈하고 주문 화면의 필터·통계 배치를 좁은 화면에 맞췄다.
- 펀딩의 참여 조회 실패를 참여 없음으로 표시하던 문제와 재조회 후 이전 참여 표시가 남는 문제를 수정했다. 모집 조회와 참여 조회 실패를 구분하고 다시 시도할 수 있다. 진행 건수는 조회 중/실패 때 0으로 표시하지 않는다.
- 강의·수료증 조회 실패 후 다시 시도할 수 있으며, 긴 제목·식별자·검색/입력 요소를 작은 화면에서 읽을 수 있게 했다.
- 매장 설정의 긴 옵션은 줄바꿈한다. 매장 제휴처·제휴 QR 및 분회 이력·행사 회원 표는 포커스 가능한 영역 내부에서 가로 스크롤한다. 온라인 채널의 자체몰 종료 안내·외부 채널 중심 현행 정책을 확인했다. 은퇴한 자체몰의 역사 데이터 표는 이번 변경에서 제외한다.
- 320px 펀딩에서 실제로 발견한 헤더 넘침을 공통 GlobalHeader의 줄바꿈으로 수정했다. 서비스명·My Home·대표 홈 버튼·계정/기능 메뉴를 보존한다.

공통 변경 조사: `packages/ui/src/layout/GlobalHeader.tsx`의 실제 서비스 소비처는 NetureGlobalHeader와 KpaGlobalHeader 두 곳이다. Neture 소비는 대표 사이트의 내부 화면·공급자·펀딩·커뮤니티이고 KPA 소비는 약국 서비스다. 둘 다 `@o4o/ui`의 dist export를 사용하므로 패키지 재빌드 후 소비 앱을 재빌드한다. 강의·분회·매장의 독자 헤더는 이 component를 사용하지 않는다. 공통 props·인증·권한·목적지 계약은 바꾸지 않는다.

### 4.2 미확정 정책의 구체적인 후속 순서

| 항목 | 코드/정본 조사 | 후속 실행안·선행 조건 |
| --- | --- | --- |
| 공지 | `communities.routes.ts` → `createServiceForumRouter` → `ForumPostController.getPosts`: latest는 `isPinned DESC, createdAt DESC` 후 pagination. 회원 홈은 이 결과에서 pinned/announcement를 3개 선택 | 현행 고정 우선 기준은 유지. 비고정 공지 전용 조회나 고정 글 20개 초과 정책을 요구하면 별도 읽기 계약과 권한 회귀부터 준비 |
| 공개 열람 | 커뮤니티 목록은 공개지만 회원 forum mount는 workspace.allowed를 검사. 전체 계정 인증 제거는 기존 회원 자료 공개로 이어질 수 있음 | 공개 지정 단위(게시판/글)·운영자 지정 권한·폐쇄 게시판 상속·목록/상세/첨부/검색/댓글 읽기 경계를 먼저 확정. 명시적 공개 대상만 guest 읽기 지원 후 비공개 접근/ID 추측/글쓰기 회귀. 기존 글을 일괄 공개하지 않음 |
| 이력 보존 | `community_membership_changes`는 role/status/action/actor/reason의 변경 증빙을 저장. 현행 privacy retention의 6개 대상 테이블에는 포함되지 않음 | 변경 이력과 개인정보 접속기록을 동일 기간으로 추정하지 않음. 목적·종결 기준 시각·보유기간·분쟁/법정 보존 예외·삭제/비식별화 방식 확정 → FK와 재가입/운영자 보호 대조 → 건수만 dry-run → 검증된 집행. 이번에는 삭제·job 추가 없음 |
| 약관/개인정보 | [관련 개정안 PR #457](https://github.com/Renagang21/o4o-platform/pull/457)에 Neture 공통 계정 본문·서비스별 신청 조건·전역 동의 gate 차이·공고/시행 문제의 구체적 초안이 이미 있음 | 그 작업을 재사용하고 중복 초안을 발행하지 않음. 공개 v1 권리·위탁/국외처리 조항 대조, 실제 수신정보와 문서 version/hash 증빙, 공통/서비스 gate 분리 검증, 공고 기간·시행일 확정 후 새 draft 등록/게시. Git merge·웹 배포는 정책 DB 게시와 별개 |

### 4.3 다른 실행 주체와 연계

- [펀딩 PR #451](https://github.com/Renagang21/o4o-platform/pull/451)은 개설·심사·전용 포럼·개설자 운영의 별도 작업이며 Hub와 SupplierProducts 파일도 변경한다. 이번 조회 실패/배치 수정은 기존 모집·참여 계약만 다루고, 통합 직전 해당 PR의 main 반영 여부와 중복 파일을 다시 확인한다.
- PharmacyHub의 네 Cloud read 권한은 해소됐다. census [38118536052](https://github.com/Renagang21/o4o-platform/actions/runs/38118536052)은 SUCCESS이나 전환 완료가 아니라 실패 후 복구 확인이다. 호스트는 기존 응답 상태이며 자원/DB 삭제는 미완료다. [PR #456](https://github.com/Renagang21/o4o-platform/pull/456)은 엄격 HTTP 검증의 대기 시간을 보완한다. 담당 실행을 중복 dispatch하지 않으며 호스트/path/query/실제 QR·tablet 검증 성공 → 전용 자원 참조 0 → 데이터 귀속/FK·법정 보존 판정 순서로 추적한다.
- 이전 클라우드 작업공간의 식별 정보는 이 저장소의 worktree 이름만으로 확정할 수 없다. 기준 checkout과 과거 worktree를 유지하고 미푸시·복원 자료 확인 및 T13 결과 전 삭제하지 않는다.

### 4.4 검증·통합 상태

최종 소스 기준 결과와 PR/CI/배포를 아래에 기록한다. 합성 브라우저는 실제 현재 번들 및 모의 API를 사용하며 실제 개인 계정/외부 OAuth나 운영 DB 쓰기를 하지 않는다. 테스트 도구의 경로·cwd 설정 실패 및 빌드 중 산출물 읽기 실패는 수정 후 순차 재검증하며 운영 결함으로 집계하지 않는다.

- Neture 전체 496, Store 전체 40, Lecture 전체 6, Branch 전체 35, 공통 UI 19, Pharmacy 회원 홈 15 tests PASS. 펀딩 실패/복구/빈 참여/잘못된 응답 및 강의·수료증 실패→loading→성공 회귀를 추가했다.
- 공통 packages build와 Neture·Pharmacy·Store·Lecture·Branch 앱 build PASS. 마지막 표현 변경 후 해당 앱을 다시 빌드한다.
- 현재 번들의 PC 1440·mobile 390/320 브라우저 21개 및 추가 QR/약국 회원 홈/공급자 운영 허브 9개 PASS. 표 내부 스크롤, 오류 재시도, 긴 제목, 작업 버튼, 문서 overflow를 확인했다. My Home 1440/375/320의 9개 fixture E2E PASS.
- 변경 TS/TSX ESLint error 0. SupplierProducts의 기존 useMemo dependency warning 1개는 이번 표현 수정과 무관하며 따로 고치지 않았다. 문서 민감정보 검사·diff whitespace PASS.
- 최신 main의 공급자 SQL 수정 #454는 충돌 없이 기준으로 통합했다. 별도 API 구현은 이번 frontend 변경에 포함하지 않는다.
- push·PR·required CI/review·main·배포는 아직 진행 전이며 완료 결과로 갱신한다.

상태는 최종 사용자 테스트와 미확정 선행 조건이 남은 동안 ACTIVE를 유지한다.

WORKTREE_DISPOSITION: `wo/frontend-integrated-stabilization` / `/workspace/o4o-wt/frontend-integrated-stabilization`, base `cba664e1e`, KEEP — 구현·통합·배포·최종 사용자 테스트가 남아 있다. 이전 작업공간은 삭제하지 않는다.
