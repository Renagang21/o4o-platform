# PC 연결 프로그램 설치·업데이트 적용 경로

> 상태: ACTIVE · 작성일: 2026-10-27
> 사용자 지시: ‘PC 연결 프로그램은 별도 업데이트가 필요’에서 멈추지 말고 적용 경로를 해결한다.
> 기존 main 병합·배포 요청의 연속 보완. 코드·배포·다운로드 검증과 실제 사용자 PC 적용을 구분한다.

## 문제와 결정

기존 프로그램은 Node 소스를 수동 교체·실행해야 했고 Main은 연결 여부만 확인했다. 별도 소스 ZIP 전달로 사용자 업데이트를 완료했다고 볼 수 없다. 기존 pairing·Local SQLite v8·backup·loopback Origin/nonce 경계는 유지한다. 새 Core·인증·Task·원격 업데이트 API·SQLite migration은 만들지 않는다.

- Main에서 Windows용 검증 패키지를 내려받고 압축 해제 후 Install.cmd를 실행한다. 공식 Node 22.18.0 win-x64 runtime과 upstream LICENSE를 포함해 Node/SQLite 별도 설치를 없앤다.
- Node 공식 HTTPS 배포의 archive SHA256을 확인한 뒤 node.exe/LICENSE만 메모리에서 추출한다. 패키지는 Git target SHA의 tracked source만 포함하고 각 파일 해시와 코드 기반 releaseId를 기록한다. manifest/ZIP은 같은 Main 배포 이미지에 포함한다. checksum·TLS·Sonar gate를 낮추지 않는다.
- 설치는 사용자 LocalAppData의 별도 코드 영역 versions/releaseId에 staging·검증 후 pointer/launcher를 전환한다. 기존 데이터 영역은 분리하고 기존 SQLite backup/bootstrap 경로만 사용한다. credential은 복사·출력·교체하지 않는다.
- 실행 중/상태 불명·중복 설치·잘못된 경로·변조·backup/preflight 실패는 중단한다. PC 프로세스를 강제 종료하지 않는다. 기존 버전은 삭제하지 않으며 활성화 실패는 이전 pointer/launcher를 유지한다.
- 기존 데이터 경로가 없으면 처음 설치 여부를 사용자에게 확인한다. 기존 사용자라고 답하면 새 DB를 만들지 않는다. managed 설치의 custom 데이터 경로는 보존한다.
- 시작 메뉴의 O4O PC 연결을 실행한 뒤 Main이 실제 health의 releaseId/버전/localData ready/schema를 확인해야 최신 상태로 표시한다. pairing 성공·다운로드 완료만으로 업데이트 완료라 하지 않는다.
- 브라우저의 상태 변경 endpoint는 기존 /pair뿐이다. 업데이트 shell·파일 경로·원격 code 실행을 loopback에 열지 않는다.

## 소비처·배포

소비처는 agent runtime/배포 패키지, Main의 기존 LocalAgentCard, 기존 약국 주문 panel의 MyPage 연결 링크다. 다른 서비스의 sidebar/권한/route·서버 API 계약은 바꾸지 않는다. 약국 panel 링크는 새 탭으로 열어 작업 중 초안을 보존한다.

Neture delivery에서 고정 Node build 환경으로 package를 만들고 public/downloads/pc-connection에 생성한다. package binary는 Git에 commit하지 않는다. Neture Docker의 기존 서비스 COPY로 manifest와 ZIP을 함께 배포한다. Windows CI의 실제 패키지 runtime/health 검증을 기존 CI Gate upstream으로 추가한다.

실제 Windows 사용자 PC는 이 환경에 연결되지 않았다. Windows VM 검증과 실제 사용자 PC 적용을 구분하며, 실제 적용은 사용자 설치 실행 후 health로 확인한다. 무인 강제 업데이트·Chrome Extension 자동 교체/registry 변경·새 서비스/새 설치 플랫폼은 범위 밖이다.

## 검증

설치 파일 해시/경로, 이전 버전 보존, 데이터·credential 보존, installer lock, 실행 중 차단, 실패 중단, 실제 SQLite backup/bootstrap, Windows runtime health와 Main LNA/버전·다운로드 검증을 수행한다. 결과는 CHECK와 사용자 guide에 연결한다.
