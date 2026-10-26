# 인증·개인정보 준비 보완 운영 인계

> **상태**: ACTIVE · **작성일**: 2026-10-26
> **근거**: [WO](../work-orders/WO-O4O-AUTH-PRIVACY-READINESS-COMPLETION-V1.md)
> **기간 정본**: [보유기간 정책](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md)

## 적용 순서·범위

main 병합 전의 개발 인계다. 신규 forward migration `HardenAuthPrivacyReadiness1792990000000`은 기존 prefix를 유지하며 인증 counter table과 AI 외 3테이블의 writer fence를 등록한다. 운영 DDL·배포·파기 활성화는 실행하지 않았다. 운영 반영 시 기존 migration job → API readiness → 정상 트래픽 전환 절차를 유지한다. 구 API도 새 schema와 호환되며 새 API를 migration 없이 먼저 기동하면 인증 경로가 503으로 닫힌다. SQL 실패 시 메모리 저장소로 우회하지 않는다.

공유 제한은 이메일/카카오 로그인, Google 로그인/가입, 이메일 가입, 인증 메일, token 소비, 아이디 찾기 IP/입력값에 적용한다. 목적별 scope·기존 횟수/창·성공 응답 제외·429/Retry-After는 유지한다. 일반/AI/업로드 rate limit은 이 변경의 대상이 아니다. 원문 IP·이메일·이름·전화는 저장하지 않고 scope별 SHA-256 digest만 기록한다. 만료 counter는 인증 처리 시 분당 최대 한 번, 200행 단위로 정리한다. 서버 비활동 중 정각 파기나 별도 스케줄러를 보장하지 않는다.

계정 제거 capability와 final scan은 enabled writer trigger와 실제 함수 identity를 같은 조건으로 확인한다. 미분류·다른 도메인의 writer gap이 남으면 disabled가 정상이다. AI 테이블은 이번 migration으로 바꾸지 않으므로 이 보완만으로 플랫폼 전체 파기 준비 완료를 선언하지 않는다. 비활성화를 삭제 완료로 응답하지 않으며 운영 파기 flags를 자동 설정하지 않는다.

## 개인 파일과 미분류 첨부

avatar는 기존 개인 bucket·owner/purpose proof와 durable content generation 범위만 유지한다. 삭제 시 다시 읽은 owner/purpose와 content generation을 확인하며, GCS delete는 content/metadata generation의 두 precondition을 사용한다. 소유 또는 metadata가 바뀌면 삭제하지 않고 검토/재시도로 남는다. 일반 KYC·사업 증빙·공유 자료·Partner 파일은 이 개인 avatar handler로 넘기지 않는다.

실제 GCS의 owner/purpose metadata, version/soft-delete·cache·IAM·producer 업로드 보상/고아 객체와 기존 사업 자료 분류는 운영 inventory가 필요하다. 테스트 adapter/SDK mock 통과는 실제 외부 객체의 파기 증거가 아니다.

## 백업 복원 전 읽기 전용 검사

7일 UUID 복원 fence를 30일 수동 export의 전체 복원 보호로 해석하지 않는다. 보존기간을 늘리거나 새 개인정보 원장을 만들지 않고, **현재 최소 파기 증빙**과 복원 후보 snapshot의 UUID digest를 비교한다. 두 입력은 권한 있는 운영자가 해당 원장에서 READ ONLY로 준비하고 공개 저장소에 커밋하지 않는다. 실제 ID·프로필·파일 본문 대신 UUID의 소문자 문자열 SHA-256만 사용한다.

- snapshot: `{version:1,kind:"automatic_backup"|"manual_export",createdAt:<UTC ISO>,subjectHashes:[<sha256>]}`
- ledger: `{version:1,complete:true,capturedAt:<UTC ISO>,coverageFrom:<UTC ISO>,completed:[{subjectHash:<sha256>,completedAt:<UTC ISO>,expiresAt:<UTC ISO>}]}`

ledger는 복원 후보 내부의 오래된 원장이 아니라 **현재 운영의 최소 삭제 증빙**에서 추출한다. `account_erasure_audit_events`의 완료 action·subject_hash·occurred_at·expires_at를 사용하고, snapshot 이전부터 capture 시점까지의 누락 없는 범위를 증명해야 한다. 단순 비활성화나 검토 중 operation을 completed 증빙으로 만들지 않는다. 복원 snapshot은 users.id를 해시하여 후보를 추출한다. 승인된 readonly 접속을 사용하고 export 파일은 제한된 사적 경로에 보관·정리한다.

```sh
node scripts/privacy/check-erasure-restore.mjs /private/snapshot.json /private/current-erasure-ledger.json
```

검사는 UTC 시간·자동 백업 7일/수동 export 30일·5분 이내의 현재 ledger·범위·최소 증빙 만료를 검증한다. 출력에는 식별자/digest를 넣지 않고 합계만 제공한다. 입력당 16MiB/10만 subject로 제한한다. 더 큰 자료는 별도 검토하며 제한을 생략해 실행하지 않는다.

종료 코드 0은 **현재 증빙과 계정 UUID 충돌 없음**만 뜻하며 `restoreApproved:false`다. 충돌은 1, 불완전/오래된/잘못된 입력은 2다. 이 도구는 DB/GCS 복원·삭제·repair·승인을 수행하지 않는다. 실제 파일/사업 자료·법정 기록·복원 후 재삭제 및 세션 차단 검증은 별도 운영 절차를 유지한다.

## 재현 가능한 격리 PostgreSQL 검증

개발용 PostgreSQL 15의 **전용 빈 DB** `o4o_erasure_fixture`, 사용자 `agent`, loopback port `55469`를 준비한다. 기존 사용자/개발 DB나 운영 프록시 포트를 사용하지 않는다. 저장소 root에서 다음 명령을 사용한다. 도구는 `.env`를 읽지 않고 연결 대상을 고정하며, prepare는 비어 있지 않은 DB를 거부한다. verify는 전용 DB 소유 표식·정확한 canonical 지문·사용자 행0을 확인한 뒤에만 합성 자료를 생성/정리하는 suite를 실행한다.

```sh
node --import tsx scripts/privacy/verify-auth-privacy-fixture.mjs --prepare
node --import tsx scripts/privacy/verify-auth-privacy-fixture.mjs --verify
node --test scripts/privacy/check-erasure-restore.test.mjs
```

기존 Core 회귀를 위해 다른 도메인의 fenced 전제는 전용 DB에만 임시 준비하고 finally에서 제거·canonical 지문 복구를 확인한다. AI 구현/운영 schema를 수리한 증거가 아니다. 실패 중단 시 전용 container/DB만 확인·정리한다. 실제 계정/기존 자료가 있는 DB에 이 fixture 도구를 적용하지 않는다. PostgreSQL을 준비하는 container와 test 데이터는 이 작업 전용으로 만들고 검증 후 제거한다.
