# PC 간편 설치 버튼 검증

> 상태: ACTIVE · 작성일: 2026-10-29
> 범위: Main 첫 자동화·내 정보의 PC 설치 안내와 기존 설치기 재사용. main 병합·배포는 이번 개발 완료 판정과 구분한다.

## 변경

- 사용자 안내를 설치하기 → 받은 파일 열기 → 연결하기로 단축하고 버전·문제 해결은 접는다.
- 배포 빌드가 ZIP과 함께 작은 `-setup.cmd` 파일·크기·SHA256을 생성한다. 브라우저가 설치 파일을 검증하고, 설치 파일은 고정 Main HTTPS ZIP 주소·크기·SHA256을 검증한 다음 압축 해제·기존 설치기를 실행한다.
- 신규 데이터 생성 확인은 창의 예/아니요 버튼으로 제공한다. 자동 동의하지 않는다. 설치 후 설치된 프로그램을 실행한다. 웹 연결은 사용자 클릭에 의한 기존 grant·nonce·브라우저 권한 흐름이다.
- 기존 ZIP·터미널 설치, 실행 중 설치 차단, 데이터·credential 보존, backup·schema·release identity 판정은 유지한다. 새 API·권한·DB·의존성·CI 설정은 없다.
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
