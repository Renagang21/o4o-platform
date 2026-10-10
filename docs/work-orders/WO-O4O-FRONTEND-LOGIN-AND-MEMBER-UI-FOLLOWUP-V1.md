# 프론트엔드 로그인·약국 내부 UI 후속 작업

> **상태**: CLOSED
> **작성일**: 2026-10-10 · **최종 갱신**: 2026-10-10
> **범위**: 기존 인증 PR 검증, 약국 회원 내부 UI 정비, 이용 흐름 검증·push·사용자 승인 후 main 통합/운영 배포

## 보완한 TODO

사용자가 지정한 순서(초안 TODO → 코드·문서 조사 → 보완 TODO → 구현·검증·push)를 따른다. 초안은 작업공간의 별도 인계 기록에 먼저 작성했다. 기준 main은 `0ee82d8d7`이며 별도 개발 branch를 사용한다.

- [x] 최신 main·작업 지침·정본·현재 구현을 조사한다.
- [x] 공급자·펀딩의 `/login ↔ /` 반복 원인을 조사하고 기존 수정 PR #423과 변경 범위 중복을 확인한다. 새 인증 변경을 중복 push하지 않고 해당 PR을 연계 검증한다.
- [x] 인증 복구·취소·목적지 복귀·가입/콜백 흐름 및 대표 홈·커뮤니티 인증 진입의 회귀를 확인한다.
- [x] 약국 게시글 목록·상세·작성·사업 자료를 회원 초기화면의 카드·간격·버튼·상태 안내에 맞춘다. 공통 UI 패키지와 API 계약을 변경하지 않는다.
- [x] PC·모바일에서 첫 화면→게시판·자료·내 매장과 운영 관리 진입을 확인한다. 합성 API/공개 체험/실제 소유자 계정의 검증 범위를 구분한다.
- [x] 테스트·빌드·문서 검사 후 구현 commit·push와 PR #425 제출을 완료한다.
- [x] 구현 PR의 required CI와 리뷰 blocker를 확인한다. 최종 보완 HEAD도 push 후 같은 gate를 확인한다.

## 조사 결과와 경계

[대표 홈 탐색 정본](../baseline/O4O-HOME-SERVICE-DISCOVERY-V1.md)은 공급자·펀딩에 로그인 진입을 요구하며 커뮤니티·강의에는 공개 진입을 허용한다. [역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)의 개인 업무/서비스 운영 분리를 유지한다.

로그인 모달의 닫기 버튼에는 접근성 이름이 없어 검증 도구와 화면 읽기에서 구분하기 어려웠다. `type="button"`과 `aria-label="로그인 창 닫기"`를 추가한다.

Neture 앱은 대표 홈·공급자·펀딩·커뮤니티 4 host가 공유한다. `LoginRedirect`는 비로그인 사용자의 모달을 열고 `/`로 이동하지만 공급자·펀딩의 `/`는 다시 `/login`으로 보낸다. 이 두 host에서만 안정적인 로그인 화면을 유지하고, 대표 홈·커뮤니티의 기존 공개 첫 화면 위 모달을 유지한다. 체험 계정 목적지 이동과 명시적 복귀를 함께 검증한다. 이메일 입력·동의·Kakao callback fragment 처리는 기존 모달이 담당한다.

약국 내부 화면에는 이미 게시판 필터·페이지 이동·댓글·작성/수정/삭제와 자료 페이지 이동이 있다. 새 기능으로 중복 구현하지 않고 표현을 정비한다. 회원 초기화면과 실제 매장 업무 분리, 운영자의 소유자 자료 API 호출 금지, 사업별 자료/게시판 범위를 유지한다.

## 별도 후속 검토

- 초기화면 공지는 최근 20개 게시글에서 상단 고정/공지 글을 추출하는 현재 계약이다. 오래된 고정 공지를 항상 노출하려면 운영 방식·조회 계약을 별도 결정한다.
- 약관·개인정보처리방침의 새 본문/버전 발행은 정책 검토 후 진행한다. UI 수정으로 발행을 대신하지 않는다.
- 다른 서비스 내부 표·폼·모바일 UI 전수 정비와 `GLOBAL-HEADER-STANDARD-V1`의 은퇴 서비스 목록 정합은 별도 범위로 남긴다.
- 대표 홈 PR #402와 약국 회원 초기화면 PR #414의 구현·배포는 완료됐으며 과거 WO의 미완료 체크박스를 현재 잔여 구현으로 해석하지 않는다.

조사 중 [인증 PR #423](https://github.com/Renagang21/o4o-platform/pull/423)의 동일 로그인 수정과 CI 통과를 확인했다. 독립적으로 만든 인증 초안은 push 범위에서 제외하고, 해당 PR의 정확한 source HEAD `b45e3429259c7986f5d7c878bf22614b0e231f5c`를 현재 개발 작업공간에 임시 적용해 빌드·검증한 뒤 source를 원복했다. 다른 작업공간/branch는 수정하지 않았다. 이번 PR은 약국 내부 UI, 검증 중 확인한 로그인 닫기 버튼의 접근성 이름과 이 실행 기록을 포함한다. 로그인 route 수정은 PR #423에 유지하며 인증 흐름은 변경하지 않는다.

main 통합은 검증된 PR 결과를 보고한 뒤 사용자 통합 승인에 따른다. 이번 단계의 배포는 미진행이다.


## 검증 결과

| 검증 | 결과 | 범위 |
| --- | --- | --- |
| 약국 서비스 전체 Vitest | 16 files / 125 tests PASS | 기존 초기화면·목적지·사업 승인·매장 경계와 추가 자료 검증 |
| 약국 게시판·자료 최종 focused | 2 files / 9 tests PASS | 공통 폼 mock 정비 이후 재확인 |
| 공통 auth-react | 16 files / 186 tests PASS | 변경 없음; 로그인 검증에 사용하는 공통 인증 회귀 |
| 로그인 닫기 이름 보완 후 기존 모달 focused | 2 files / 13 tests PASS | 이메일 5·체험 8; Neture 최종 타입·빌드·ESLint도 PASS |
| PR #423 정확한 source focused | 2 files / 19 tests PASS | 로그인 진입 11·체험 모달 8 |
| 타입·빌드 | 약국 및 PR #423 Neture PASS | frozen install 및 소비 패키지 사전 빌드; 기존 Browserslist/큰 chunk 경고 |
| 변경 파일 ESLint·diff·문서 민감정보 검사 | PASS | 신규 오류 없음 |
| 약국 PC1440/mobile390 브라우저 | 10/10 PASS | 승인 회원·미승인·운영자·비로그인·조회 실패. 게시글 링크·작성 취소·자료 자동 펼침·내 매장 handoff·이전 URL 복귀·가로 넘침 확인 |
| 기존 관리 진입 PC/mobile | 2/2 PASS | 현재 로컬 Neture bundle + 환경에 보존된 Store bundle, 합성 API; 공급자 상태 관리·내 매장 신청 심사 도착 |
| PR #423 보호 홈·가입·callback PC/mobile | 4/4 PASS | 해당 PR의 production bundle을 두 origin에 제공. 입력 유지·닫기/재열기·이메일 가입 동의·Demo 목적지·Kakao 합성 callback 일회 소비·확인 메일 안내 |
| PR #423 공개 체험 계정 + 운영 API | 4/4 PASS | 두 host × PC/mobile. 실제 로그인 200·인증 콘텐츠 조회 200·해당 테스트 세션 로그아웃 200·로그인 진입 복원 |

공개 체험 검증은 PR #423의 로컬 production bundle을 서비스 origin에 제공하고 API는 정상 TLS 검증을 유지하는 curl로 실제 운영 endpoint에 요청했다. 운영 frontend 배포 검증이나 실제 Google/Kakao 인증·가입·메일 수신 검증이 아니다. 인증 정보와 응답 원문·실제 사용자 화면은 기록하지 않았다. 나머지 브라우저 검증은 합성 API이며 운영 데이터를 작성하지 않았다.

최초 브라우저 실행에서 닫기 버튼 selector, Kakao fixture의 credential CORS 응답, Store 앱 연결 누락으로 실패했다. 실 체험 첫 실행은 로그인 이후 콘텐츠 응답을 너무 일찍 확인해 중단했다. 도구의 selector·응답/앱 연결·대기를 보완한 위 독립 전체 재실행이 통과했다. 실패 결과를 운영 장애나 통과로 치환하지 않는다.

실제 약국 소유자·운영자 계정 SSOT가 현재 작업공간에 없어 그 계정의 운영 세션 검증은 미진행이다. 공개 체험 검증과 합성 승인 시나리오로 대체 완료했다고 판단하지 않는다. 실제 소유자의 외부 인증·메일 확인은 인증 WO의 OPEN 항목으로 유지한다.

## 문서 정합

대표 홈·회원 초기화면은 구현·운영 반영 상태를 유지한다. 로그인 오류는 아직 main/운영에 반영되지 않은 PR #423과 연결하며 이번 약국 내부 UI 또한 push와 운영 배포를 구분한다. 공지 조회 범위·정책 발행·글로벌 헤더 은퇴 목록은 별도 후속 과제로 남겼다.


## push·통합 준비 기록

[PR #425](https://github.com/Renagang21/o4o-platform/pull/425) 초기 구현 HEAD `6b2e636a6d60896a0ff103999e330aab75992bf3`의 [CI Pipeline](https://github.com/Renagang21/o4o-platform/actions/runs/38058655610), CI Gate·CodeQL·SonarCloud가 통과했으며 확인 시 리뷰 스레드는 0건이다. 최신 main `538c221f3`의 차이는 별도 배포 도구 3개 파일뿐이며 약국·Neture·소비 패키지 source는 같아 normal merge 후 push했다.

로그인 닫기 이름과 실행 기록을 후속 commit으로 보완한다. 최종 HEAD의 required checks·리뷰·mergeability는 PR #425의 최신 상태를 기준으로 확인한다. PR #423의 로그인 route 변경과 이 PR은 겹치는 source 파일이 없어 통합 시 두 변경을 함께 유지할 수 있다. 이번 단계의 main 병합·운영 배포는 미진행이며 별도 사용자 통합 승인에 따른다.

WORKTREE_DISPOSITION: `wo/frontend-login-and-member-ui`는 PR·통합·운영 검증 때문에 KEEP한다. 기존 작업공간/branch는 보존한다.

## 사용자 승인 후 통합·운영 배포 Phase

2026-10-10 사용자가 main 병합·운영 배포를 명시적으로 승인했다. 같은 WO의 연속 Phase로 기존 전용 branch를 사용한다.

- [x] 최신 main·ruleset·PR head·required CI·리뷰를 확인한다. 두 PR은 CI Gate 및 보안 검사 통과, 미해결 스레드 0건이다.
- [x] 로그인 PR #423을 main에 병합한다: `913b642ceb525a75631b2ee37613d92e3b859053`.
- [x] 해당 main을 #425 branch에 normal merge한다. source 충돌은 없으며 다른 작업공간을 변경하지 않았다.
- [x] 결합 source focused 검증·빌드 후 push하고 새 HEAD required CI를 확인한다.
- [x] PR #425 main 병합 및 post-merge CI를 확인한다.
- [x] Delivery 판정·공유 배포 실행 상태 확인 후 Neture 및 약국 웹을 운영에 배포한다.
- [x] 실제 운영 bundle의 PC/mobile 로그인·회원 게시판·자료·내 매장 연결을 검증하고 종료 기록을 남긴다.

조사 보완: 배포 대상은 `neture,kpa-society`이며 API·DB·인증 정책 발행은 포함하지 않는다. 배포 설정 변수의 직접 조회는 integration 권한으로 HTTP 403이므로 Delivery/Promote의 현재 fail-closed gate와 실행 결과로 확인한다. 설정을 변경하거나 gate를 우회하지 않는다. 최종 배포·검증 결과는 GitHub PR·Actions 및 작업공간 인계 기록에서 추적한다.

## 운영 배포·종료 결과 — 2026-10-10

앞선 절의 미병합·미배포 표기는 당시 구현 단계 기록이다. 사용자 승인 후 두 PR의 main 병합과 이번 UI의 운영 반영을 완료했다. 기존 기록을 현재 미완료 상태로 해석하지 않는다.

- 로그인 [PR #423](https://github.com/Renagang21/o4o-platform/pull/423): main `913b642ceb525a75631b2ee37613d92e3b859053`. 다른 세션의 [Neture Promote](https://github.com/Renagang21/o4o-platform/actions/runs/38062388825)는 해당 source를 포함한 `7fd08d308`의 `DEPLOYED`를 확인했다.
- 내부 UI [PR #425](https://github.com/Renagang21/o4o-platform/pull/425): 최종 HEAD `78b0bb6ef7846a6f511d9deb640735d9f1dc2c55`의 [PR CI](https://github.com/Renagang21/o4o-platform/actions/runs/38062143097), CI Gate·CodeQL·SonarCloud PASS 및 미해결 리뷰 0건 확인 후 main `e0e7e6b413b42f43bc21d052cbc0245001560221`에 병합했다.
- [병합 후 main CI](https://github.com/Renagang21/o4o-platform/actions/runs/38062849400): SUCCESS. 추가 main 문서 변경은 normal merge했고 결합 source의 로그인 19·약국 9 focused tests, 두 앱 타입/빌드와 PC/mobile 회귀가 통과했다.
- [운영 Delivery](https://github.com/Renagang21/o4o-platform/actions/runs/38063471945): SUCCESS. `ci_green=true`, `frozen=false`, `head_is_target=true`를 확인하고 `neture,kpa-society`만 LEVEL_2 자동 배포했다. 최종 serving SHA report와 commit status가 `DEPLOYED · deploy: neture,kpa-society` SUCCESS다. 두 서비스의 단일 리비전 100% serving SHA가 승인된 target과 일치해야 report가 성공하는 기존 gate를 통과했다. API·DB·다른 웹·정책 발행은 배포하지 않았다.

### 실제 운영 화면 검증

운영 HTML/JS/CSS를 정상 TLS 검증을 유지하는 curl로 읽어 해당 origin의 브라우저에 제공했다. API 검증은 실제 운영 endpoint를 사용하며, 합성 권한/응답 검증은 별도로 구분했다. 인증 정보·응답 원문·실제 이용자 화면을 저장하지 않았고 사업 데이터를 작성하지 않았다.

| 운영 source PC1440/mobile390 검증 | 결과 | API 범위 |
| --- | --- | --- |
| 대표 홈·커뮤니티·공급자·펀딩 로그인 | 8/8 PASS | 실제 공개 API; 진입 안정·입력 유지·이름 있는 닫기·가로 넘침 |
| 공급자·펀딩 공개 체험 | 4/4 PASS | 실제 로그인·인증 콘텐츠·생성한 세션 로그아웃 각각 200 |
| 약국 공개 매장 체험 | 2/2 PASS | 실제 로그인·게시판/자료 조회·내 매장 handoff 및 exchange·접근 가능 매장 조회 200. Store `/store` 도착과 두 origin의 생성 세션 로그아웃 200 |
| 약국 회원·미승인·운영자·비로그인·조회 실패 | 10/10 PASS | 합성 API; 새 목록/상세/작성 취소·자료·이전 URL 복귀·권한 경계·화면 상태 |
| 공급자 관리·내 매장 신청 심사 진입 | 2/2 PASS | 합성 운영자 권한/응답; 실제 운영 Neture·Supplier·Store bundle의 기존 관리 화면 도착 |
| 공급자·펀딩 가입·Kakao callback | 4/4 PASS | 합성 API; 동의·callback 일회 소비·확인 메일 안내. 실제 OAuth/가입/메일 수신 아님 |

30개 PC/mobile 시나리오가 통과했고 브라우저 화면 오류·가로 넘침은 없었다. 공개 체험은 정본이 의도적으로 노출한 기능 자체의 검증이며, 없는 일반 운영자·소유자 테스트 계정을 대체하지 않는다. 현재 작업공간과 기준 checkout 모두 `docs/local/TEST-ACCOUNTS.local.md`가 없다. 실제 계정/OAuth/메일 수신, 공지 조회 계약 확장, 정책 발행과 타 서비스 전수 정비는 앞선 별도 후속 과제로 유지한다.

운영 배포 중 main에 추가된 PR #424는 별도 커뮤니티 심사 UI 작업이다. 이 closure에서는 해당 변경을 보존하며 이번 로그인·약국 UI의 최초 운영 target/검증 결과를 기록한다. 후속 Delivery의 누적 변경 처리와 이번 배포 결과를 혼동하지 않는다.

### 문서 정합·작업공간

이 WO의 상태와 통합/배포 TODO를 실제 완료 결과로 갱신했다. 정본의 사업 정책·권한 계약·다른 WO의 실행 기록은 수정하지 않는다. 클라우드는 게시 source configuration이 있고 spec/observed spec `25`가 일치하며 observations current·failure null이다. 이번 Phase에서 클라우드 설정 저장·추가 게시를 수행하지 않았으며 Git push와 운영 배포와 구분한다.

WORKTREE_DISPOSITION: `wo/frontend-login-and-member-ui`는 동일 WO의 종료 문서 Phase에 계속 사용한다. 운영 재검증 helper가 이 worktree의 Playwright 의존성을 참조하므로 KEEP한다. 기존 다른 작업공간/branch는 정리 대상이 아니다. 종료 문서 PR 통합 후 clean·main 포함·CI 상태를 인계 기록에서 최종 확인한다.
