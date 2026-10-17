# CHECK-O4O-MY-HOME-UX-REORGANIZATION-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-16 (KST) · **최종 갱신**: 2026-10-16
> **근거 WO/IR**: [구현 WO](../work-orders/WO-O4O-MY-HOME-UX-REORGANIZATION-V1.md)
> **계획·대조**: [TODO](../work-orders/TODO-O4O-MY-HOME-UX-REORGANIZATION-V1.md)

## 구현과 검증 기준

base main `04ff6b829`에서 전용 branch `wo/my-home-ux-reorganization`으로 구현했다.
My Home에 현재 업무·참여 공간 검색, 브라우저·계정별 즐겨찾기 6개와 최근 이동 4개를 추가했다.
내부 목적지 중복과 My Home 자기 링크를 제외하고, 저장 식별자는 현재 허용된 진입 모델과 대조한다.
최근 이동 기록은 페이지 전환 전에 저장하며 URL·token·사용자 원문 정보를 저장하지 않는다.
직원 관리 상세는 접힌 상태에서 조회하지 않고 받은 초대는 바로 확인한다.
공통 account-ui·HomeEntryPanel·가입/권한·API·DB·manifest/lockfile·CI는 변경하지 않았다.

## 자동 검증

Node 22.18.0·pnpm 10.25.0으로 실행했다.

| 검사 | 결과 |
|---|---|
| frozen install + store integrity, 공통 packages build | PASS |
| 초기 집중 MyPageHub/Workspaces/StoreMembers | 3 files / 33 tests PASS |
| 최종 Neture 전체 Vitest | 109 files / 1,064 tests PASS (skip 없음) |
| Neture production build (tsc 포함) | PASS |
| 변경 소스·테스트 7개 root flat ESLint | 오류 0 · 경고 0 |
| 문서 민감정보·상대 링크·diff·stage scope | PASS (상대 링크 26개 존재, 12파일 scope) |

전체 테스트 실행은 저장소 루트에서 다음을 사용했다.

```bash
pnpm exec vitest run --config services/web-neture/vitest.config.mjs --maxWorkers=2
pnpm --filter @o4o/web-neture run build
```

빌드의 Browserslist 데이터 경과·큰 chunk 경고는 비차단이며 lockfile을 임의 갱신하지 않았다.
초기 타입 검사는 handoff action의 narrowing 누락으로 실패했고 이를 수정한 최종 빌드는 PASS했다.
처음 lint에는 레거시 eslintrc를 잘못 지정했다. 저장소 SSOT인 root flat config로 재검증했다.

## 브라우저 검증

새 작업 공간의 실제 Vite 앱을 Chromium으로 실행했다. API·인증·권한·handoff 응답은
격리된 합성 fixture이며 실제 계정 로그인·운영 서버 변경·업무 데이터 생성은 하지 않았다.
모든 외부 요청은 차단하거나 fixture로 응답했으며 운영 자격정보를 사용하지 않았다.

최종 19개 관측 PASS, pageerror 0이다.

- PC 1440px, 모바일 390/375/320px에서 가로 넘침 없음. PC·320px 화면을 이미지로 직접 확인했다.
- 접힌 직원 관리에서 구성원 상세 API 요청 없음.
- 키보드 Space로 즐겨찾기 고정, 별표 상태 표시, 새로고침 후 복원.
- 공간 검색의 결과 없음과 검색 지우기.
- 경영자가 펼칠 때 최종 승인 UI 노출.
- handoff 실패 안내 → 재시도 → 합성 목적지 도착, 뒤로가기 후 최근 이동과 삭제.
- 권한 있는 현재 모델에서 매장 제거 시 저장된 즐겨찾기에서도 미노출.
- 매장이 없는 초대 직원도 초대 수락 진입 가능.
- 일반 직원에게 경영자 폼·구성원 상세 조회 미제공.

최초 browser harness는 합성 목적지 HTML의 charset 누락으로 도착 heading 비교에 실패했다.
fixture의 UTF-8 선언을 보완해 같은 앱·동작으로 재검증했다. 앱의 guard·handoff 검증은 완화하지 않았다.
실행 harness와 화면은 이 인스턴스의 `/tmp/my-home-ux-browser.mjs`,
`/tmp/my-home-ux-browser-verified.log`, `/tmp/my-home-ux-{1440,390,375,320}.png`에 있다.
합성 응답 검증이며 실계정의 업무 진행·사용성 평가나 운영 번들 검증을 대신하지 않는다.

## 문서 정합과 인계

My Home 정본에 첫 화면의 현재 구성·저장 범위·직원 관리 펼침을 반영했다.
개인/매장 분리와 명시적 Store 재선택, 별도 My Home AI 계약을 유지한다.
병합·운영 배포·실계정 검증은 미실행이며 PR CI/리뷰·통합 담당 인계는 후속 기록으로 구분한다.

DEPLOYMENT = AUTOMATIC (병합 이후 기존 Neture Delivery 대상).
WORKTREE_DISPOSITION = KEEP (구현 PR 검토·후속 수정용).

## PR 인계

구현 commit `56801ea96`, [PR #649](https://github.com/Renagang21/o4o-platform/pull/649).
최초 PR 조회의 scope·static analysis·문서 guard는 진행 중이고 리뷰는 미등록이다.
최종 HEAD의 CI 결과는 PR에서 확인하며 CI PASS·병합·운영 배포를 선행 보고하지 않는다.
마지막 직원 관리 파일의 포맷 차이를 줄인 뒤 해당 8 tests와 ESLint도 다시 PASS했다.

## 2026-10-16 통합 검증과 리뷰 보완

통합 담당은 인계된 기존 PR #649를 재사용한다. main `daad0563c`와 결합한 전용 검증 worktree에서 충돌 없이 검사했으며 별도 중복 PR을 만들지 않는다.

- 결합본 Neture 전체 109 files / 1,064 tests PASS, TypeScript 포함 production build PASS, 변경 7개 TS/TSX ESLint 오류·경고 0.
- 최신 리뷰의 `ServiceEntryError` 메시지 유실을 보완했다. 로그인 필요·미승인/정지 안내는 resolver의 기존 메시지를 유지하고 예상하지 못한 오류만 일반 안내로 처리한다. 실패 시 최근 이동 미기록·재시도 가능 상태는 유지한다.
- 보완 후 Neture 전체 109 files / 1,066 tests PASS. 해당 component 17 tests PASS(도메인 오류 2건 추가), 변경 2파일 ESLint PASS, TypeScript 포함 production build PASS.
- 실제 component와 production CSS를 사용하는 Chromium 합성 harness에서 1440/390/320px, 키보드 즐겨찾기·재로딩, 검색 없음·해제, 일반 오류·로그인 안내, 재시도·이동·뒤로가기·최근 기록 삭제의 10개 관측 PASS. pageerror 0, 네트워크 쓰기 0. 운영 인증·실계정·서버 권한 검증은 실행하지 않았다.
- 최초 테스트 명령의 config 확장자/실행 위치를 바로잡아 실제 테스트가 실행된 결과만 위에 기록했다. Chromium은 샌드박스 소켓 제한을 확인한 뒤 합성 검증 범위에서 다시 실행했다.

이 절은 로컬 통합 검증 기록이다. 최신 PR CI·리뷰·병합·운영 배포 결과를 선행하여 PASS로 주장하지 않는다.

## 2026-10-16 실제 계정·운영 My Home 검증

사용자가 실제 계정 점검을 먼저 수행하고 이후 직접 사용성을 확인하는 순서를 승인했다.
main `a4063be49`의 별도 문서 작업 공간에서 운영 `neture.co.kr`과 실제 API·Store·Supplier에 접속했다.
환경에 준비된 경영자·직원·공급자 테스트 계정을 각각 사용했으며 계정 원문 파일은 현재 작업/기준
checkout에 없었다. 환경 변수의 이름·준비 상태·주입 여부를 확인한 뒤 로그인 동작으로 사용 가능성을 검증했다.
계정값·토큰·매장명·실제 응답 원문·인증 screenshot/storageState를 문서·커밋으로 복사하지 않았다.

### 접속과 실행 경계

Chromium 직접 HTTPS 연결은 프록시 CA 신뢰 오류였다. 인증서 검증을 끄지 않고,
플랫폼 CA를 사용하는 Playwright APIRequest의 `route.fetch`로 운영 HTTPS 응답을 검증·중계했다.
응답을 합성하거나 로컬 앱/fixture로 바꾸지 않았다. 기본 TLS 검증은 활성 상태다.
초기 공개 접속으로 경로를 확인한 후 실제 앱의 이메일 로그인 폼을 사용했다.

계정별 독립 임시 browser context를 사용하고 종료했다. 네트워크 쓰기는 로그인·인증 갱신·
세션 handoff/교환으로 제한했다. 주문·결제·초대 발송/수락·최종 승인·접근 해제·회원/업무 데이터
수정은 실행하지 않았다. 즐겨찾기와 최근 이동은 해당 임시 브라우저의 계정별 설정으로만
변경·확인했고 점검 후 해제/삭제했다. 서버 로그인·접속·보안 기록은 보존 정책에 따라 유지한다.

### 역할별 결과

| 계정 | 로그인/모아보기 | 업무 공간 | 직원 관리 | 실제 업무 이동 | 최종 관측 |
|---|---|---|---|---|---|
| 경영자 | 실제 로그인 200·현재 모델 정상 | 5개, 실제 매장명 검색 정상 | 서버 owner 판정에 따라 관리 폼 표시 | Store `/store` 도착 | 18/18 PASS |
| 직원 | 실제 로그인 200·현재 모델 정상 | 4개 | 경영자용 입력·승인 폼 미표시 | Store `/store` 도착 | 13/13 PASS |
| 공급자 | 실제 로그인 200·현재 모델 정상, supplier active | 5개 | 해당 약국 membership level none에 따라 경영자 폼 미표시 | Store와 Supplier `/supplier/dashboard` 도착·공급자 홈 렌더 | 15/15 PASS |

위 46관측은 계정별 최종 판정에 사용한 실행만 합산했다. 공통 흐름의 반복 실행을 추가 합산하지 않는다.
모든 최종 실행에서 API 오류 0·pageerror 0·차단된 업무 쓰기 0·HTTPS 중계 실패 0이다.

- 업무 바로가기가 알림보다 앞에 있고 현재 실제 공간을 표시한다.
- 실제 매장명 검색, 결과 없음, 터치로 검색 초기화가 정상이다.
- 즐겨찾기를 터치/키보드로 고정하고 재로딩 후 복원했다. 별표 터치 영역은 44px 이상이다.
- My Home은 PC 1440px, 모바일 폭 390/375/320px에서 확인했으며 가로 넘침이 없고 검색이 보였다.
- 경영자 관리 폼 펼침과 직원/공급자의 미노출이 실제 현재 자격과 일치했다.
- 실제 Store handoff와 My Home의 최근 이동 표시·기록 지우기가 정상이다.
- 실제 공급자 홈 진입과 390px 공급자 화면의 가로 넘침 없음도 확인했다.

초기 harness는 공급자 계정의 일반 조직 owner 값을 약국 직원관리 자격과 동일시해 한 관측을 실패로
기록했다. 실제 membership 응답 level은 none이었다. 서버의 별도 자격 판정과 현재 코드를 대조한
집중 재검증에서 폼 미노출이 올바름을 확인했다. 앱 권한을 바꾸거나 검사를 약화해 통과시킨 것이 아니다.

### 미검증과 사용자 확인 순서

세 테스트 계정 모두 접근 가능한 매장이 각 1개였다. 복수 매장 전환·두 번째 매장 표시의 실계정 검증은
미실행이다. 검증을 위해 조직·회원·매장을 생성하거나 기존 권한을 변경하지 않았다.
받은 초대의 실제 수락/거절·최종 승인·접근 해제는 업무 상태 변경이므로 이번 읽기 중심 점검에서 제외했다.
실제 휴대전화의 터치감·읽기 편의·업무 우선순위에 대한 사용자 평가도 자동 관측과 구분한다.

실행한 범위에서 기능 blocker는 발견하지 못했고 코드·화면 정책은 추가 변경하지 않았다.
사용자는 본인 계정에서 자주 쓰는 공간 고정 → 실제 업무 이동 → 모바일의 정보량·문구·탐색 편의를
확인한다. 본인 계정에 복수 매장이 있으면 대상 매장 선택과 도착 후 매장명이 맞는지도 확인한다.
기기 간 동기화와 My Home AI는 이번 검증/개선 범위에 포함하지 않는다.

이 절은 이전 합성 검증·실계정 미실행 기록의 후속이다. 새 배포를 실행한 것이 아니라 이미 배포된
운영 화면을 점검했다. 문서 변경은 개발 담당의 commit·push 후 통합 담당에게 인계한다.
