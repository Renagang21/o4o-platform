# PC 연결 프로그램 설치·업데이트 경로 검증

> 상태: ACTIVE · 작성일: 2026-10-27
> [WO](../work-orders/WO-O4O-PC-CONNECTION-INSTALL-UPDATE-V1.md) / [사용 절차](../guides/O4O-PC-CONNECTION-INSTALL-UPDATE-V1.md)
> 개발·CI·배포·실제 사용자 PC 적용을 구분한다. 최종 PR/배포 증거는 진행에 따라 추가한다.

## 1. 구현 경계

기존에는 소스 교체·Node 실행 안내만 있었고 Main에는 다운로드·적용 확인이 없었다. 이번 변경은 공식 Node 22.18.0 win-x64와 LICENSE를 포함한 검증 ZIP, per-user versioned installer, 시작 메뉴 launcher, Main의 검증 다운로드·실제 버전 확인 경로다. SQLite v8·backup/bootstrap·credential 위치·기존 pairing과 Origin/nonce는 재사용한다. 새 schema/DB·권한·Core·Task·MCP·loopback 업데이트 endpoint는 없다.

Main 배포 시 같은 source SHA에서 패키지와 public manifest를 함께 만든다. Node archive는 공식 HTTPS SHASUMS256와 대조하고 고정 node.exe/LICENSE만 추출한다. source는 target SHA의 tracked agent 파일이다. code content 기반 releaseId는 무관한 문서/main SHA 이동으로 바뀌지 않으며, 파일 URL은 source SHA도 포함해 캐시된 다른 ZIP과 섞이지 않는다. ZIP/file SHA256·경로·build identity를 검사하고, 바이너리는 Git에 commit하지 않는다.

설치는 기존 데이터 영역과 코드 영역을 분리하고 실행 중/상태 불명/중복 설치/변조/경로 충돌 시 중단한다. 기존 코드 슬롯을 삭제하지 않으며 preflight 실패 시 기존 pointer/launcher가 유지된다. 활성화 파일 교체 오류는 이전 pointer/launcher로 복귀한다. 기존 데이터 버전은 기존 forward-only migration/backup 규칙을 따르며 임의 DB 초기화/자동 데이터 복원은 하지 않는다. 신규 PC 여부를 확인하지 않은 빈 데이터 위치는 자동 새 계정 공간으로 간주하지 않는다.

UI의 ‘최신’은 실제 health의 releaseId·프로그램 버전·SQLite ready/schema와 공개 배포본이 모두 맞아야 표시된다. 파일을 받았다는 이유, 설치기 종료, pairing 여부만으로 적용 완료라 하지 않는다. 직접 실행 중지·설치·재실행은 사용자 PC에서 수행한다. 브라우저에 code 교체/shell endpoint를 열지 않는다.

## 2. 로컬 확인

- installer/ZIP 테스트 10개 PASS. Windows runtime E2E 1개는 Linux에서 명시 skip하며 Windows CI에서 실행한다.
- 기존 SQLite v8에 합성 dataset을 넣고 backup/bootstrap을 거친 뒤 원본 행·선행 0·credential 바이트 보존 확인 PASS. 실제 계정·사용자 DB는 쓰지 않았다.
- 손상 파일·허용 밖 credential 경로·symlink/junction·설치 충돌·데이터 위치 변경·실행 중/불명 PC 거절, 기존 버전 및 pointer 보존 확인 PASS.
- 설치/배포 무관 source SHA만 달라질 때 releaseId 동일·다운로드 filename/hash 구분 확인 PASS.
- UI/다운로드/기존 LNA/약국 준비 회귀 27개 PASS. 오래된 연결 PC·버전번호만 일치·DB 미준비를 완료로 표시하지 않는지, size/SHA256 실패 시 파일 제공 중단, manifest 재확인을 검증했다.
- Chromium desktop 1280px/mobile 390px에서 실제 약 34MB ZIP 다운로드·SHA256 검증·파일명·가로 overflow 없음·page error 없음 확인 PASS. 합성 공개 manifest를 사용한 로컬 화면 확인이며 운영 로그인/실제 PC 연결 증거는 아니다.
- frontend typecheck·production names-profile build PASS. CI gate/affected scope 관련 local suite PASS. 의존성/lockfile 변경 없음.

새 worktree의 패키지 dist 누락으로 최초 UI suite 하나가 resolve 실패했고, source가 동일한 기존 패키지 build 산출물을 준비한 뒤 전체 관련 suite를 다시 실행해 통과했다. 실패를 실행 성공으로 계산하지 않았다.

## 3. 실제 실행·배포 확인

Windows CI는 실제 bundled node.exe 패키지를 만들고 기존 SQLite preflight·Install.cmd(시스템 PATH에 별도 Node 없이)·시작 메뉴 파일·agent 실행·health의 release/data readiness를 확인한다. CI Gate가 이 job을 기다리도록 연결했다. Windows VM은 실제 사용자 PC 적용 증거가 아니다.

운영 배포 후 Main의 release.json·ZIP SHA256·내부 release/files·upstream Node/LICENSE를 확인한다. 실제 사용자 PC가 이 클라우드에 연결된 상태는 아니므로 사용자 설치 실행과 health 재확인 전에는 실제 PC 적용 완료라고 보고하지 않는다. Chrome Extension/native host 기존 등록·실제 약국 프로그램·지오영 로그인·실 주문/결제는 이번 설치 확인 범위 밖이다.

Windows PR CI(40500335521)의 `PC installer Windows` job PASS: 별도 Node PATH 없이 Install.cmd, 신규 설치 동의, 한글 경로 Start.cmd, 실제 health releaseId/version/SQLite ready/schema를 확인했다. 사용자 PC 적용 증거와는 구분한다. 리뷰에서 발견한 agent-only 변경 배포 누락을 Neture artifact input 판정과 deploy-risk 회귀로 보완했다. 최종 HEAD의 CI·리뷰 및 운영 배포는 별도로 확인한다.

손상/삭제된 기존 코드로 정상 재설치를 막지 않도록 pointer·데이터 경로 검증과 기존 코드 무결성 검증을 분리했다. 동일 버전 손상 slot은 별도 `.damaged-*`로 보존 후 검증된 새 코드로 교체하며, preflight 실패 시 기존 slot/pointer로 복귀한다. 손상·누락·다른 버전 갱신·데이터 보존 회귀를 추가했다.
