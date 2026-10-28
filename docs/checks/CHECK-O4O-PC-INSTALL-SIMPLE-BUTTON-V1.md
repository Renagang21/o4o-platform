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
