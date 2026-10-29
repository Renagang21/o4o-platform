# PC 간편 설치 버튼 검증

> 상태: COMPLETED · 작성일: 2026-10-29
> 범위: Main 첫 자동화·내 정보의 PC 설치 안내와 기존 설치기 재사용. main 병합·배포는 이번 개발 완료 판정과 구분한다.

## 변경

- 사용자 안내를 설치하기 → 받은 파일 열기 → 연결하기로 단축하고 버전·문제 해결은 접는다.
- 배포 빌드가 ZIP과 함께 작은 `-setup.cmd` 파일·크기·SHA256을 생성한다. 브라우저가 설치 파일을 검증하고, 설치 파일은 고정 Main HTTPS ZIP 주소·크기·SHA256을 검증한 다음 압축 해제·기존 설치기를 실행한다.
- 신규 데이터 생성 확인은 창의 예/아니요 버튼으로 제공한다. 자동 동의하지 않는다. 설치 후 설치된 프로그램을 실행한다. 웹 연결은 사용자 클릭에 의한 기존 grant·nonce·브라우저 권한 흐름이다.
- 기존 ZIP·터미널 설치, 실행 중 설치 차단, 데이터·credential 보존, backup·schema·release identity 판정은 유지한다. 새 API·권한·DB·의존성은 없다. 기존 Windows job의 테스트 출력 형식만 spec으로 바꾸며 테스트·권한·gate·배포 경로는 바꾸지 않는다.
- 기준: [설치 가이드](../guides/O4O-PC-CONNECTION-INSTALL-UPDATE-V1.md), [Assistant V2 §11](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md). 요청 기기와 실행 PC는 다르며 일반 대화·가능한 원격 실행에 로컬 설치를 강제하지 않는다.

## 검증

- Linux Node 22.18.0, pnpm 10.25.0 frozen install·관련 workspace 의존 패키지 build 성공.
- UI·다운로드·LNA·Main 첫 자동화 focused Vitest: 28 PASS.
- 설치기 Node suite: Linux 13 PASS, Windows 전용 2 SKIP. Windows 실행 결과는 후속 절에 기록한다.
- production `NETURE_OBFUSCATION=names` build·TypeScript·변경 UI ESLint 성공. 마지막 변경 후 재검증 결과로 판정한다.
- Chromium desktop 1440 / mobile 390: 실제 컴포넌트·합성 manifest/설치 파일·health/grant/pair 응답을 사용한 fixture smoke PASS. desktop 다운로드 파일명·다이제스트 검증 후 다운로드, 설치만으로 연결·요청 재실행 없음, 명시적 연결 클릭에서 grant/pair 각 1회. mobile localhost·grant 0회. console pageerror·가로 넘침 0. 스크린샷 육안 확인.
- 실제 로그인·사용자 Windows PC에서 보안창/최초 설치 동의·약국 프로그램·거래처 로그인 검증은 NOT_RUN. fixture와 Windows CI는 실제 사용자 환경의 실행 정책을 대신하지 않는다. 브라우저 자동 파일 실행·PowerShell 정책 우회·관리자 권한 우회는 제공하지 않는다.

## 중간 실패와 교정

- 초기 UI 수정 중 JSX 교체 범위 오류로 transform 실패 → 올바른 render 범위로 교정.
- 새 worktree의 workspace dist 부재로 Main 테스트 import 실패 → frozen 의존성 설치 후 해당 workspace 의존 패키지를 빌드하고 재실행.
- 원인 교정 뒤 focused suite 전체를 재실행했다. 앞 실패를 PASS로 취급하지 않는다.

## Windows 실행 확인

- 최초 branch CI `40774144411`의 Windows job FAIL. GitHub 로그 보관 호스트 접근 제한으로 전체 로그를 받지 못해, 합성 데이터만 쓰는 설치기 테스트에 제한 길이 실패 annotation을 추가했다. 이후 실행에서 원인을 확인하고 교정한다. 최초 실패는 완료 근거가 아니다.

- `40774560743` Windows job도 FAIL. TAP가 stdout annotation을 주석으로 감싸 원인 출력이 check annotation에 나타나지 않아 기존 Windows 테스트 명령에 `--test-reporter=spec`을 지정했다. 테스트 자체나 판정·권한·배포 설정은 그대로다.

- `40775244464`에서 간편 launcher 시험만 실패함을 확인했다. `40775591656`에서 정확한 원인 확인: 제한된 PATH/상속된 PowerShell 모듈 경로에서 `Get-FileHash`를 찾지 못했다. 별도 모듈 autoload 없이 .NET SHA256·ZipFile·디렉터리 API·명시적 assembly load를 쓰도록 교정했다. 기존 패키지 설치·보존·window mode 자동 실행 시험은 통과했다. 오류 확인을 마친 이전 branch CI는 새 HEAD 검증으로 대체하면서 취소했으며 PASS로 계산하지 않는다.

## 최종 검증 결과

- 소스 `0344e72b3599421b8bf856364db1fbb43dbc14ad`, branch CI `40776132106`: **PC installer Windows PASS**. 이 소스의 Windows 전용 skip 조건은 모두 해제되며 총 15개 시험을 실행한다. 실제 cmd → PowerShell → 검증·압축 해제 → packaged Node 실행 경로를 한글 경로에서 확인했다. 네트워크 전송만 합성 ZIP 복사로 대체하며, 손상·잘린 ZIP은 실행 전 거절한다. 실제 사용자 PC의 보안 경고·GUI 동의 클릭은 별도 NOT_RUN이다.
- 공식 Node checksum 검증 후 실제 배포 패키지를 생성했다. ZIP **33,518,838 bytes**(<32 MiB), 간편 설치 파일 **4,061 bytes**, 내부 46개 파일 hash·ZIP CRC·source SHA·release identity와 두 배포 파일의 크기·SHA256 검증 PASS. releaseId `4554be24d8ef2f90ab2c4852f032970349f04ed563f14ce10f9e393217a1b0e4`.
- 마지막 UI 변경 이후 focused 28 PASS·TypeScript noEmit·ESLint·production names build·desktop/mobile fixture browser smoke 재확인. 로그와 스크린샷·후보 패키지는 저장소 밖 비공개 작업 자료에 보관한다.
- 후보 설치 파일은 고정된 Main ZIP URL을 사용하므로 해당 소스의 운영 배포 전에는 사용자 설치용으로 제공하지 않는다. 이번 개발에서 main 병합·운영 배포는 하지 않는다.

- 최종 branch CI [40776132106](https://github.com/Renagang21/o4o-platform/actions/runs/40776132106) **SUCCESS / CI Gate PASS**: Windows 설치, API Jest 3개 shard, 코드 품질, web production build, admin build 모두 통과했다. 이 실행은 위 코드 SHA 기준이며, 그 뒤에는 이 CHECK의 결과 기록만 추가한다. PR CI·Codex review·main 병합·배포는 이번 완료 범위가 아니며 실행하지 않았다.

## 인계 / 작업공간

- branch: `wo/pc-install-simple-button`
- base: `2f4da2e188` · 검증 코드: `0344e72b3599421b8bf856364db1fbb43dbc14ad`
- main integration: NOT_RUN · deployment: NOT_RUN · actual user PC smoke: NOT_RUN
- WORKTREE_DISPOSITION: **KEEP** — main 병합 전 수정·통합에 필요한 본 작업 전용 공간과 push한 branch를 보존한다. 다른 작업공간·branch는 변경하지 않았다.

## 사용자 피드백에 따른 설치·연결 추가 보완 — 2026-10-29

동일 미병합 작업의 후속 보완이므로 `wo/pc-install-simple-button` branch와 전용 작업공간을 유지했다. 최신 main `9fe9fa7e41`을 published branch에 merge해 준비했다. 사용자가 첨부한 운영 화면의 배포 manifest는 `2f4da2e188`이며 setup 항목이 없는 기존 ZIP 방식이었다. 이전 개발 완료가 운영 반영 완료를 뜻하지 않는다.

- 버튼을 파란 **설치 파일 받기**와 테두리 **이미 설치했어요 · 연결 확인**으로 구분한다. 다운로드 파일명은 **O4O-PC-Setup.cmd**이다. 받은 뒤에는 재다운로드를 작은 보조 동작으로 내리고 파일 열기를 주 안내로 보여 준다. 연결 확인은 다운로드하지 않는다.
- 사용자에게 미리 알린 설치 파일 받기 동작 후에만 최대 10분의 로컬 상태 관측을 시작한다. 실제 실행 release identity·버전·데이터 준비가 배포본과 맞아야 기존 연결을 한 번 요청한다. 옛 프로그램·손상 데이터로 자동 연결하지 않는다. 일반 카드 진입만으로 자동 연결하지 않는다.
- 자동 연결 중지·unmount·계정 전환은 진행 중 승인권 요청·PC 전달을 중단한다. 늦은 health/승인권 응답이 다른 문맥에서 연결을 시작하지 않는다. 내 정보 카드는 user key로 분리한다. UI 내부 helper에 선택적 AbortSignal만 추가했으며 서버 API·nonce·권한·Core·DB·인증 계약을 바꾸지 않는다.
- 재확인 중 표시와 재확인 실패 안내를 노출한다. 설치 후 자동 연결에 맞게 설치기의 마지막 안내를 정정했다. 업무 요청은 자동 실행하지 않는다.
- focused Vitest **33 PASS**: 설치 후 자동 연결 1회·옛 release 거절·관측 중지·unmount 후 늦은 응답 무시·취소 후 승인권 전달 0회·기존 LNA·Main 첫 요청 보존·검증 다운로드 회귀.
- Chromium desktop 1440/mobile 390 fixture smoke PASS. 실제 컴포넌트에 합성 manifest/설치 파일·health/grant/pair를 주입했다. 버튼 배경 구분·연결 확인 시 다운로드 0회·친숙한 파일명·다운로드 뒤 파일 열기 안내·실행 감지 뒤 추가 클릭 없이 grant/pair 각 1회·업무 요청 자동 실행 0회·mobile localhost 관측 0회·pageerror/가로 넘침 0. 전후 스크린샷 육안 확인.
- Linux 설치기 **13 PASS / Windows 전용 2 SKIP**. TypeScript·production names build·변경 UI/API ESLint로 검증한다. Windows 최종 실행과 PR CI·Codex 결과는 해당 branch PR의 Checks·최종 인계 설명을 기준으로 확인한다. 로컬 결과를 PR CI로 대신하지 않는다.
- 현재·기준 checkout에 테스트 계정 SSOT가 없어 실제 로그인 및 사용자 PC 파일 열기·보안창 검증은 NOT_RUN. 운영 main 병합·배포는 이 보완에서 실행하지 않는다.

- PR 첫 HEAD `1689768`의 API shard 3 FAIL을 로컬 `local-agent-oneclick-pairing.spec.ts`에서 재현했다(24 PASS / 1 FAIL). 쿠키 생략 소스 검사(`/credentials: 'omit'/`)가 새 helper의 큰따옴표 표기를 세지 못한 원인이며 실제 `credentials: omit` 동작은 같았다. 기존 작은따옴표 표기를 복원한다. 보안 assertion과 검사 강도는 그대로 유지한다.

- 후속 Codex P2는 다운로드한 bootstrap이 다음 웹 배포에서 사라지는 SHA별 ZIP URL을 참조하는 문제였다. 영구 저장소·권한·새 build dependency를 추가하지 않고 ZIP을 간편 설치 파일에 바이너리로 직접 포함하는 방식으로 해소한다. 헤더만 읽어 실행하고 포함 ZIP의 footer·길이·SHA256을 검증한 뒤 기존 설치기를 실행한다. Base64 확장 없이 두 산출물 모두 32 MiB 미만을 강제한다. 실행 시 네트워크 다운로드가 없다.
- Windows 시험은 전송 stub을 제거하고 생성한 설치 파일 그대로만 실행하도록 보강했다. 외부 ZIP 파일 없이 실행되고, 포함 ZIP 손상·footer 잘림은 실행 전에 차단해야 한다. Linux 13 PASS/Windows 전용 2 SKIP 및 focused 33 PASS, native footer/포함 ZIP roundtrip·무결성·전체 설치 파일 HTTP 크기 제한을 확인했다. 변경 후 Windows PR CI는 별도로 확인한다.
- 쿠키 검사 교정 후 로컬 API shard 3 전체: **203 suite PASS / 23 SKIP, 2,988 test PASS / 411 SKIP**. 기존 검사 assertion은 변경하지 않았다.
