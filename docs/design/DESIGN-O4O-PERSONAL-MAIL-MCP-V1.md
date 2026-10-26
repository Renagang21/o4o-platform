# 개인 메일 업무와 외부 AI 연결 계약

> **상태**: ACTIVE · **작성일**: 2026-10-26 · **최종 갱신**: 2026-10-26
> **범위**: [개발 WO](../work-orders/WO-O4O-PERSONAL-MAIL-MCP-V1.md)의 사용자 개인 메일 서비스. 공개 운영·운영 migration 승인을 뜻하지 않는다.

## 1. 조사와 재사용

- `packages/mail-core`와 API `email.service.ts`는 발송 업무다. 개인 수신함 원장·Gmail API·IMAP 수신 연결은 없다. 발송 계정·로그를 전용하지 않는다.
- `requireAuth`는 현재 사용자 상태를 확인한다. 개인 메일은 `users.id` 소유이며 Store·Supplier·Community membership을 새로 만들지 않는다. My Home 정본의 사람 기준 업무에 `/mypage/mail`로 연결한다.
- `utils/crypto.ts`의 canonical key 설정과 fail-closed 검증을 재사용한다. 메일 자격정보는 그 키에서 목적별 키를 파생한 AES-GCM으로 암호화하고 계정·사용자에 결합한다. 로그인 Google credential과 메일 제공자 동의는 별개다.
- `external-ai`의 공식 MCP SDK·OAuth 연결·현재 사용자 판정·브라우저 Origin guard와 `recordOperation/action_logs`를 재사용한다. 메일 도구는 같은 MCP에 추가한다. 콘텐츠의 저장 원장·24시간 멱등성·quota는 메일 완료 원장으로 전용하지 않는다.
- 기존 action queue는 운영자 제안·표시이며 외부 메일 이동의 완료 보장이 아니다. 메일 업무 원장에 불변 대상 snapshot·항목별 상태·lease·재시도를 저장한다. 외부 제공자의 결과를 재확인하는 절대 상태 연산으로 재시작한다.
- IMAP/MIME 수신 라이브러리가 없어 Node 22 호환 `imapflow`·`mailparser`를 API에 추가한다. 프로토콜·MIME parser를 직접 새로 만들지 않는다. 통상 개발 의존성 변경이며 외부 유료 계약·운영 설정 변경은 없다.

## 2. 데이터와 실행

사용자 소유 계정, 최소 메시지 메타(제공자 ID·발신 주소·시각·상태), 발신처 규칙, OAuth 일회 흐름, 작업·대상 항목을 저장한다. 메일 제목·본문·첨부는 원장에 보관하지 않는다. 본문은 명시적인 요청에 한해 제한된 길이의 텍스트로 반환한다. 로그·감사는 본문·주소·자격정보 없이 식별자·수·상태만 기록한다. 연결 종료 시 credential·수집 메타·규칙·작업 대상을 제거한다. 기존 감사 기록에는 기존 보존 정책을 적용한다.

메일은 제공자에 남는다. `archive`, `trash`, `important`만 실행하며 영구 삭제·발송·구독 취소는 도구에 없다. `keep`은 향후 O4O 자동 정리 중지다. 차단은 제공자 수신 자체를 거절하는 약속이 아니라 O4O가 새 메일을 규칙에 따라 정리한다는 의미로 화면에 설명한다. 중요 메일은 기본 정리 대상에서 보호하고 별도 포함 확인을 받는다.

기존 메일 정리는 서버가 현재 수집된 ID·대상 수·행위를 고정한 preview를 만든다. 사용자 브라우저에서 대상·수·행위를 확인해 승인한다. MCP는 preview와 O4O 확인 주소를 반환하고 승인 토큰을 받지 않는다. 승인된 대상만 실행하며 새 메일을 작업 도중 추가하지 않는다. 제공자 상태는 실행 직전에 재검사한다. 타인 계정·계정 재연결·철회된 위임·실행 사유 변경으로 기존 승인을 재사용하지 않는다.

worker는 DB lease와 항목 transaction으로 중복 실행을 막고, 실패 항목·중단·재개·진행률을 저장한다. 연결 해제·사용자 차단은 실행과 같은 계정 lock으로 직렬화한다. 외부 호출 후 DB commit 전에 중단된 경우 재시도에서 제공자의 현재 상태를 확인한다. IMAP UIDVALIDITY 변경·알 수 없는 목적 폴더·불명확한 응답은 보류하고 임의 폴더 생성·영구 삭제를 하지 않는다.

제공자 호출과 O4O DB는 하나의 transaction이 아니므로 외부 호출의 exactly-once를 보장하지 않는다. Gmail은 현재 label을 다시 확인하고, IMAP MOVE 후 원본 UID가 없으면 건너뜀으로 기록하며 재이동하지 않는다. 이 경우 다른 주체의 이동과 O4O 실행 성공을 구분해 확정할 수 없다. requestId는 사용자·계정·요청 의미에 묶인 메일 원장에 남아 재시작·연결 변경·24시간 경과에도 중복 제안을 막으며, 계정 연결 해제로 원장이 파기되면 그 보장도 종료한다.

규칙은 승인 이후 수신된 메일에만 자동 적용한다. 과거 메일은 별도 대상 확인을 거친다. 제공자 API/IMAP만으로 중요도·보관·휴지통 기능이 동일하다고 가정하지 않으며 capability와 실패 코드를 반환한다. 문서 본문에 있는 지시문은 권한이나 사용자 확인이 아니다.

자동 작업은 실제 실행 직전에 현재 계정의 규칙 ID·revision·action을 재검증한다. keep 전환·규칙 수정·규칙 소실 후 대기 중이던 옛 자동 작업은 취소하며, 별도로 건수 확인·승인한 cleanup snapshot은 유지한다. 수신함에 메일이 없어도 기존 규칙 목록에서 다시 선택해 새 승인을 거쳐 변경할 수 있다.

미완료 사용자 제안 50개 한도는 cleanup/rule에 적용하며 자동 실행 backlog는 제외한다. 사용자 단위 advisory lock으로 서로 다른 계정의 동시 제안도 직렬화한다. 메일 MCP 내부의 계정·작업 서비스는 현재 transaction manager를 사용해 권한 lock을 유지하면서 추가 pool 연결을 기다리지 않는다.

작업 목록은 미완료 사용자 작업, 미완료 자동 작업, 완료 이력 순으로 표시한다. 브라우저 `GET /api/personal-mail/accounts/:accountId/jobs`와 MCP `list_mail_jobs`의 `page`는 기본 1, 최대 10,000이며 페이지마다 50개를 반환한다. 같은 시각의 이력은 ID로 순서를 고정한다. 이력 화면은 페이지를 옮겨도 선택한 작업의 실행 확인·중단·재개를 유지한다.

## 3. API·MCP·화면

- 기존 브라우저 인증의 `/api/personal-mail`: 설정 준비 상태, Gmail 연결 시작/완료, 네이버 앱 비밀번호 연결, 계정 조회/해제, 수집·발신처/규칙·작업·본문 조회, preview·승인·중단/재개.
- Gmail은 전용 client 설정·state·PKCE·최소 메일 권한 검증을 사용한다. 브라우저 callback에서 코드를 바로 자격정보로 저장하지 않고 현재 O4O 사용자 세션으로 완료한다.
- 네이버는 고정 `imap.naver.com:993`, TLS 인증서 검증·시간/크기 제한, 사용자 제공 앱 비밀번호로 연결한다. 임의 host/port 입력을 받지 않는다.
- 네이버 앱 비밀번호는 [Identity 정본](../architecture/O4O-IDENTITY-ARCHITECTURE-V3.md)의 O4O 로그인 수단이 아니다. 기존 SMTP·API secret 입력과 같이 연결 전용 컴포넌트 한 곳을 legacy password 재유입 검사에서 구분하며, 공통 로그인 비밀번호 컴포넌트·계정 저장 경로와 섞지 않는다. 브라우저 영속 저장을 하지 않고 성공·실패 모두 입력을 비운다.
- MCP 범위: 기존 `o4o:read`에 더해 `o4o:mail:read`, `o4o:mail:manage`, `o4o:mail:body`. manage/body는 mail:read를 요구한다. `o4o:draft:write`로 메일 실행은 불가하다.
- 메일 계정 동의는 `mail:<accountId>`로 명시 선택한다. 기존 4종 콘텐츠 workspace·관리자 targets 계약을 확장하지 않는다. 기존 콘텐츠 도구는 콘텐츠 workspace에서만 작동한다.
- 메일 도구는 계정/발신처/작업/선택 본문 조회, 규칙/일괄 작업 제안, 승인된 작업 재개·중단을 제공한다. 브라우저 확인 없이 정리나 향후 자동 규칙을 활성화하지 않는다.
- 같은 account ID 재연결도 새로운 계정 문맥으로 처리해 capability·메타를 다시 읽고 기존 선택·본문·확인 상태와 불확실한 이전 requestId를 비운다. 현황 새로고침은 선택한 작업을 보존하며 capability도 재조회한다.
- `/mypage/mail`에서 일반 회원과 매장 사용자 모두 자신의 계정 연결·발신처 선택·규칙·대상 확인·진행/오류·해제를 처리한다. 기존 My Home navigation의 모든 소비처와 외부 AI 동의 화면을 함께 회귀 검증한다.

## 4. 운영과 검증 경계

`PERSONAL_MAIL_ENABLED`는 명시 활성 전 OFF다. 신규 migration·fingerprint는 격리 PostgreSQL 15에서 검증한다. 운영 migration·Secret·Google OAuth client/승인·네이버 계정·실제 메일 변경은 이번 지시에서 실행하지 않는다. worker는 기존 API lifecycle에 연결하되 기능이 꺼졌으면 DB·외부 호출을 시작하지 않는다.

기능 OFF에서는 기존 콘텐츠 11개 도구·기존 OAuth 범위만 광고한다. 기능 ON에서 메일 10개와 별도 메일 scope를 추가하며, 활성 기능 안의 쓰기 도구는 연결별 권한과 무관하게 목록에 있고 호출 시 권한을 판정한다. 기능 OFF·암호키 장애 때도 본인 연결 조회·해제는 가능하다. 메일의 신규 개인정보 처리 고지와 제공자 동의·공개 운영 조건을 통합 전에 확인하며 이번 WO에서 처리방침을 게시하거나 법적 판단을 확정하지 않는다.

Gmail 공식 OAuth/scopes와 네이버 도움말의 현재 공개 운영 조건은 이 클라우드의 조회로 확정하지 못했다. Gmail 검증·제한 scope 평가·네이버의 상업용 다중 사용자 이용 가능성은 UNKNOWN이며 공개 운영 전 확인해야 한다. fixture의 provider 호환은 사업자 공개 승인 증거가 아니다. 실제 ChatGPT·desktop/mobile browser 검증도 실행 여부를 별도 기록한다.

검증은 격리 PG의 migration up/down·소유·동의·멱등·lease·오류·원자 감사, Gmail HTTP/IMAP 프로토콜 fixture의 페이지·상태 연산·부분 실패·재접속, API/UI/MCP의 권한·승인·결과와 기존 11개 콘텐츠 도구 회귀를 포함한다. 운영 메일을 시험 자료로 쓰지 않는다.

## 5. 통합 시 확인할 설정과 실행

- 기본 OFF인 `PERSONAL_MAIL_ENABLED`, 선택적 canonical `PERSONAL_MAIL_WEB_ORIGIN`, Gmail 전용 `PERSONAL_MAIL_GOOGLE_CLIENT_ID`·`PERSONAL_MAIL_GOOGLE_CLIENT_SECRET`, 기존 canonical 암호키 설정을 확인한다. 설정값·계정 비밀번호는 저장소에 기록하지 않는다. 잘못된 선택 설정으로 기존 콘텐츠 consent나 본인 credential 파기를 막지 않는다.
- 신규 migration은 운영 DB에 별도 적용 검토가 필요하다. worker는 기능 OFF에서 메일 테이블 조회를 시작하지 않으며 계정 목록은 테이블 미적용 시 빈 목록이다.
- API의 15초 wake-up은 best effort다. scale-to-zero 환경의 지속 실행은 별도 `node dist/personal-mail-worker.js --run [--max-ticks 100]` 실행·스케줄이 필요하다. CLI는 기본 100 tick, 최대 1,000 tick, tick 사이 240초 예산으로 제한한다. 이번 변경에는 production worker job/scheduler 생성이 없다.
- 격리 desktop/mobile 화면·공식 MCP SDK 검증과 실제 사용자 ChatGPT·제공자 OAuth/앱 비밀번호 연결 검증은 구분한다. 현재 개발 증적은 [CHECK](../checks/CHECK-O4O-PERSONAL-MAIL-MCP-V1.md), 원격 최종 HEAD의 CI·리뷰 상태는 해당 PR을 따른다.


운영 이미지 계약: API runtime manifest는 메일 연결 library를 개발 manifest와 같은 버전으로 포함한다. bounded worker는 tsup entry·Docker COPY·Docker ignore allowlist에 함께 등록한다. 이미지 빌드는 worker syntax와 IMAP/MIME export 존재를 검사하고, release 전 실제 비루트 컨테이너의 `--help`로 DB·외부 연결 없이 로딩을 확인한다.
