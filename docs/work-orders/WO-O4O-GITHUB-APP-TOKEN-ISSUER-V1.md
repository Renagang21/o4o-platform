# GitHub App 설치 토큰 발급 도구

> **상태**: ACTIVE · **작성일**: 2026-10-27
> **근거**: 사용자의 토큰 발급 기능 구현 요청
> **DEPLOYMENT**: NOT_APPLICABLE — 운영 서버·workflow 변경 없는 CLI 도구

## 목적과 범위

환경의 GitHub 토큰이 반복적으로 인증 실패했고, CLI refresh는 환경 토큰을 갱신하지 못했다.
소유자가 관리하는 GitHub App을 명시적으로 선택해 단기 설치 토큰을 발급하는 도구를 추가한다.
권한 없는 자체 토큰 생성이나 Codex 내부 credential broker 변경을 구현한 것으로 보고하지 않는다.

새 독립 작업은 최신 `origin/main` `64a7cd474e`의 전용 worktree·branch에서 시작했다.
기존 약국 작업과 다른 공간의 의도된 삭제 100건은 포함하지 않는다.

## TODO

- [x] 기존 발급 기능·인증 도구 조사, 별도 작업공간 구성.
- [x] 추가 npm 의존성 없이 RS256 JWT·공식 API 설치 토큰 발급 구현.
- [x] 단일 저장소, 기본 read profile, 명시적 author profile 및 실제 권한 검증.
- [x] 매 명령 새 발급·종료 시 폐기, 부모 credential 및 Git config 보존.
- [x] 비밀키 Git 저장소 밖·파일 권한 검사, 토큰/JWT의 로그·argv·파일 저장 방지.
- [x] 명시적 App 선택과 gh/git 자식 명령 연결, 배포 owner gate 유지.
- [x] 격리 테스트와 설치/활성화 안내 작성.
- [x] 로컬 검증 및 변경 범위 확인. Git 결과는 최종 보고의 branch·HEAD로 확인한다.
- [ ] App 설치·비밀키 Secret 파일 연결 후 실제 발급 검증.

## 검증 및 미해결

실제 App ID·Installation ID·비밀키 파일 연결은 제공되지 않았다. 기존 관리 환경의 secrets와
outbound identities도 해당 준비 상태를 증명하지 않았다. 실제 토큰 발급·폐기·인증 성공은
미검증으로 유지한다. 민감정보는 수집하지 않는다. 설정 절차는
[사용 안내](../guides/GITHUB-APP-TOKEN-ISSUER.md)를 따른다.

소유자의 최초 App 등록·권한 선택·설치·키 연결은 실제 활성화에 필요한 작업이다.
App bot은 owner-only 배포 주체가 아니므로 기존 약국 삭제의 인증 해결과 구분한다.
운영 DB·GCP·현재 GitHub App 설치·기존 토큰·배포 workflow는 변경하지 않았다.
CI에는 비밀키·네트워크를 사용하지 않는 발급 도구 테스트 단계를 추가한다.

로컬 검증: 발급기 격리 테스트 11/11 및 기존 CI 계약 포함 358/358 PASS(Node 24.19.0), 문서 민감정보 0건·diff 공백 오류 0건.
Node 22.18.0 실행은 저장소 CI의 새 단계에서 확인한다. 실제 App 발급은 설정 부재로 미실행이다.

## 통합 리뷰 보완

PR #842의 SSH remote가 기존 SSH 신원을 선택할 수 있다는 지적을 반영했다.
자식 Git transport를 HTTPS로 제한하고 기존 제한이 HTTPS를 금지하면 실패한다.
scp형/ssh://형 모두 SSH 프로그램 실행 전에 차단하는 실제 Git 회귀를 추가했다.
기존 설치 토큰·부모 credential·원격 URL을 자동으로 수정하지 않는다.
