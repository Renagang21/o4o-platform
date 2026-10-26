# 개인 메일 관리와 사용자 ChatGPT 연결

> **상태**: ACTIVE · **작성일**: 2026-10-26 · **최종 갱신**: 2026-10-26
> **사용자 지시**: TODO 작성 → 문서·코드로 보완 → 개발 → main 병합 전까지. 작은 작업으로 중단하지 않고 개인 메일 서비스와 MCP를 한 묶음으로 완성한다.
> **근거**: HANDOFF-O4O-USER-AI-AND-MAIL-SERVICES-V1의 3·4단계. 기존 상품 콘텐츠는 PR #832 병합·API/Store 배포 완료, 실제 ChatGPT/브라우저 검증은 미완료.
> **개발 기준**: main `7166005df54231e00999673fecdf83e596e1bb3a` · branch `wo/personal-mail-mcp`

## 1. 초기 TODO — 조사 결과로 보완

| ID | 작업 묶음 | 완료 기준 | 상태 |
|---|---|---|---|
| T1 | 문서·코드 조사와 계약 확정 | 기존 로그인·암호화·작업 이력·메일 발송·UI·MCP 재사용 지점과 부족한 부분, 제공자 제약·공개 운영 조건, API/저장·권한 계약 기록 | DONE — 설계 §1~4 |
| T2 | 메일 업무 기반·지속 작업 | 사용자 소유 계정·최소 메타·발신처/규칙, 실행 전 대상·건수 확인, 중단/재개·재시도·중복 방지·실행 이력과 실패 처리 | DONE — 격리 DB 통합 검증 |
| T3 | 제공자 연결과 관리 화면 | Gmail API/OAuth·네이버 IMAP 연결부, 발신처 집계·일괄 선택·허용/차단/보관·중요 분류, 규칙/처리 현황 화면. 제공자 차이 명시 | DONE — HTTP/TLS-IMAP fixture와 desktop/mobile 검증. 실계정·공개 승인 제외 |
| T4 | 기존 MCP의 메일 업무 확장 | 기존 콘텐츠 권한과 별도 메일 권한·동의, 계정/발신처/규칙/작업 도구, 승인된 작업 실행·결과 조회. 추가 LLM 호출 없음 | DONE — 공식 SDK·기존 콘텐츠 회귀 검증 |
| T5 | 통합 검증과 병합 전 인계 | 격리 DB·제공자 fixture·API/UI/MCP·권한·부분 실패·연결 해제·민감정보 검증, commit/push, 같은 PR의 CI·리뷰 확인, main 미병합 | 로컬 검증 DONE — 원격 최종 HEAD의 push·CI·리뷰 결과는 PR과 완료 보고에 기록 |

## 2. 확정 경계

- 기존 O4O 사용자 인증·MCP/OAuth·감사/권한 경로를 우선 재사용한다. 서버 주도 AI, 상품 콘텐츠, 발송용 이메일은 각자의 기존 업무를 유지한다.
- 개인 메일은 사용자 업무이며 매장 권한이나 `o4o:draft:write`로 삭제·이동 권한을 얻지 않는다. 외부 AI가 준 사용자 ID를 신뢰하지 않는다.
- 사용자 규칙 우선. 미분류 발신처는 기본 삭제하지 않는다. 대량 실행 전에 서버가 대상·건수를 고정해 확인하고, 삭제는 휴지통 이동으로 제한한다. 구독 취소와 자동 정리를 구분한다.
- 장기 작업은 연결별 24시간 requestId 기록을 완료 원장으로 전용하지 않는다. 본문 기본 장기 저장 금지, 인증정보 암호화·연결 해제 시 폐기, 외부 AI 본문 접근은 별도 명시 권한.
- 개발용 schema/migration·연결 설정 계약과 격리 시험은 이번 개발에서 검토한다. 운영 DB 적용·실제 메일 이동/삭제·외부 계정/Secret·OAuth 공개 설정/승인·유료 계약은 실행하지 않는다.
- Gmail OAuth 검증/보안 평가와 네이버의 상업용 다중 사용자 이용 조건은 확인 전 UNKNOWN. 코드·fixture 검증과 실계정 연결·공개 운영 완료를 구분한다.
- 결과는 기능·API·화면·검증·미완료 범위로 보고한다. main 병합·auto-merge·배포는 이번 종료점 밖이다.

## 3. 조사 후 보완

[설계·재사용 근거](../design/DESIGN-O4O-PERSONAL-MAIL-MCP-V1.md)에 실제 소스와 정본을 대조했다. My Home 개인 업무 진입, 기존 인증/동의·canonical 암호키·감사 재사용, 별도 메일 scope와 원장·lease, Gmail/네이버 capability와 공개 조건을 확정했다. 콘텐츠 targets 4종은 유지하며 메일만 연결한 사용자는 콘텐츠 target 활성에 의존하지 않는다.

- 신규 migration `CreatePersonalMail1792998000000`: 격리 PostgreSQL 15에서 canonical bootstrap + 기존 43개 incremental의 마지막 fingerprint 일치 후 적용. 새 fingerprint/7,224줄을 등록했다. migration contract guard 21개 PASS. 운영 적용은 미실행.
- My Home navigation 소비처: Neture `MyPageHub`, `MySettingsPage`, `MyProfilePage`, `MyBusinessProfilePage`. 동일 앱의 supplier/community/funding/carepharm host에서는 기존 My Home handoff로 대표 공간에 복귀한다. 새 메일 메뉴는 대표 host에서 제공한다. 공통 auth/account-ui package의 navigation 계약은 변경하지 않는다.
- 기본 OFF에서도 기존 계정의 조회·연결 해제는 허용한다. key/제공자 장애를 이유로 credential 파기 요청을 막지 않는다. 메일 수집·실행·본문 조회는 활성/설정과 현재 권한을 요구한다.
- worker는 기존 API lifecycle의 제한된 wake-up과 별도 `personal-mail-worker` CLI를 제공한다. Cloud Run 요청 외 시간·scale-to-zero에서 신뢰할 실행을 보장하려면 통합 시 기존 배포 운영자가 별도 worker 실행·스케줄을 구성해야 한다. 이번 개발에서 production job/scheduler를 생성하지 않는다.
- 코드 검증 순서: schema → 제공자 HTTP/TLS-IMAP fixture → API·공식 MCP SDK의 불변 대상·권한·승인·지속 작업 → UI·기존 11개 도구 회귀 → 품질/PR.
- Gmail 공개 OAuth 검증/보안 평가, 네이버의 상업용 다중 사용자 서비스 이용 조건은 공식 문서 최신 조회를 이 환경에서 확정하지 못해 UNKNOWN으로 유지한다. 실제 계정 연결·공개 운영은 별도다. 카카오·공개 앱 제출·SIWC는 포함하지 않는다.

## 4. 개발 결과와 인계

[검증 기록](../checks/CHECK-O4O-PERSONAL-MAIL-MCP-V1.md)에 명령·시험 환경·실패 보완·검증 한계를 모았다. 기존 콘텐츠 69개와 메일 32개 통합 시험, API 53개·UI 22개, 별도 desktop/mobile Chromium 2개를 통과했다. 브라우저는 격리 인증 fixture이며 실제 O4O/ChatGPT 로그인이나 Gmail·네이버 승인 완료를 뜻하지 않는다.

PR #837 리뷰 후 자동 작업은 실행 직전 현재 규칙 ID·revision·action을 재검증하고 바뀐 권한으로 대기 작업을 실행하지 않도록 보완했다. 별도 승인된 cleanup snapshot은 유지한다. 수신함이 비어도 기존 규칙에서 발신처를 선택해 다시 검토·변경할 수 있다. 두 회귀 시험을 추가했고 신규 worker CLI의 출력도 기존 stdout 규칙에 맞췄다.

재리뷰에서는 자동 backlog와 사용자 제안 한도를 분리하고 사용자 단위 lock으로 복수 계정 동시 요청을 제한했다. 메일 MCP의 내부 업무 서비스는 현재 transaction manager를 재사용한다. 자동 작업 50건이 있는 경우와 연결 1개인 풀에서 동시 조회·제안·본문 읽기를 추가 검증했다.

전체 CI의 legacy password 재유입 검사와 네이버 앱 비밀번호 입력의 충돌도 로컬 재현했다. SMTP credential과 같은 외부 서비스 연결 입력으로 정확히 한 컴포넌트를 구분하며 O4O 로그인 정책·계정 축을 변경하지 않는다.

push 전 최신 `origin/main`과 경로 충돌·migration 순서를 확인한다. 병합 전 작업 branch/worktree는 KEEP이며 main 병합·배포·운영 migration은 실행하지 않는다. 공개 운영 전에 제공자 승인·개인정보 고지, 전용 설정/키와 worker 스케줄, 실계정 연결·해제 검증을 검토한다.
