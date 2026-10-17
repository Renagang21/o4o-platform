# 강의 수료증 처리 이력·약국 협력사업 운영 검증

> 상태: ACTIVE — 개발 검증 완료, 통합·배포는 별도
> 작성일: 2026-10-17
> [TODO](../work-orders/WO-LECTURE-CERTIFICATE-BUSINESS-OPERATIONS-TODO-V1.md)
> 기준 main: 3a575c074cebfef138d53e0000b4105668ed7def

## 조사·구현

기존 `CertificateController.revokeCertificate`는 body.reason을 전달하지 않았으며 service는 isValid만 변경했다. 발급/갱신/폐기 감사 기록도 없었다.

- 기존 action_logs에 `lecture.certificate_operation`을 저장한다. 운영자 발급/갱신/폐기/기존 정보 수정의 대상 ID·처리자·DB 처리 시각·변경 전후 폐기 flag/만료일·선택 사유만 기록한다. 소유자 개인정보·전체 certificate·verification code는 감사 메타에 복제하지 않는다.
- 폐기 사유는 기존 선택 정책을 유지하고 trim·최대 2,000자·문자열/NUL 검증을 적용한다. 자유 입력은 TypeORM 오류의 파라미터 직렬화에서 가린다.
- 변경과 감사 저장은 같은 transaction manager다. 발급은 수료증·수강 원장 연결·감사를 묶고 수강 원장 update 0건이면 거절한다. 갱신/폐기/정보 수정은 수료증 행을 잠그고 lecture 강의를 다시 확인한 후 저장한다. 기존 update allowlist와 소유권 불변을 유지한다.
- 자동 수료증 발급은 기존 흐름을 유지하고 운영자 이력으로 만들지 않는다. 기존 처리 이력을 소급 생성하지 않는다. 새 schema/migration/Core entity/의존성 변경은 없다.
- `GET /api/v1/lms/certificates/:id/operations?page=1`: 기존 requireAuth·현재 lecture 운영자 guard·대상의 lecture scope를 거쳐 최소 이력만 20건 단위로 반환한다. 본인 certificate 조회와 공개 진위 확인 응답은 그대로다.
- 이력은 기존 [개인정보 보존 정책 §6](../baseline/O4O-PRIVACY-DATA-RETENTION-POLICY-V1.md)의 action_logs 보존·파기 대상이다. 영구 보관이나 별도 보존 기간을 도입하지 않는다.
- 운영 UI는 대상·처리자·시각·사유·폐기 여부·만료일을 표시한다. 만료 여부와 폐기 flag를 혼동하지 않도록 ‘폐기 상태’로 표시한다. 대상 입력만으로 조회하지 않고 수동 조회/성공한 처리 후 갱신한다. 이전 대상/요청 응답 격리와 페이지별 읽기 재시도를 적용한다.
- 작업 성공 후 이력 조회 실패는 작업 실패로 바꾸지 않는다. 이유를 다시 전송하거나 작업을 반복하지 않고 이력만 재조회한다.

## 약국 협력사업 대조

기존 OperatorSemiFranchisePage/useAssignedBusinessWorkspace의 5개 업무와 Neture 전체 담당 사업·약국 사업자 businessKey=pharmacy 소비처를 확인했다. 최근 공급자 콘텐츠 목적지/등재 심사(PR #677~#679)는 현재 기본 구현이다. 별도 협동조합 adapter의 제한된 탭/편집 주소도 현행 회귀를 유지했다.

가입 승인 원장과 공급자 참여 승인은 별개다. 담당 운영자는 가입·공급 제안·행사·모집 조건·사업 콘텐츠를 검토하고, 공급자가 실제 모집 참여를 승인한다. 게시 콘텐츠는 활성 사업 가입 약국에 노출되고 내 매장 사본은 독립이다. 공급자 참여 심사 화면을 운영자 업무로 가져오지 않았다. 사업 폐쇄/가입/참여/제안·행사·모집 조건의 이용 판정은 기존 API 규칙을 유지한다.

기본 처리 수명·사업 범위·실패 입력 보존에 추가로 수정해야 할 결함은 이번 대조에서 확인되지 않았다. UI·API를 중복 구현하지 않고 최신 콘텐츠 반려의 두 소비처 실패→사유 보존→저장 성공/후속 조회 실패→읽기만 재시도를 추가 회귀로 고정했다. 공급자 콘텐츠 원본/목적지 정책과 다른 에이전트의 코드를 변경하지 않았다.

## 검증

환경: 기존 클라우드 checkout, Node 22.18.0/pnpm 10.25.0 활성화. manifest/lockfile·환경 설정 변경 없음.

- 강의 API 4 suites / 192 tests PASS: 신규 감사/검증/transaction 호출, lecture scope·기존 private ownership·발급 체인, 인증 actor 전달·legacy history 차단·최소 응답·route guard 연결.
- 약국 협력사업 API 2 suites / 25 tests PASS: 기존 business-access/neture-pharmacy-rules.
- 강의 웹 전체 11 files / 47 tests PASS: 조회 실패와 빈 이력 구분·페이지별 재조회·대상 전환·저장 성공과 이력 실패 분리·중복 명령 잠금.
- 협력사업 화면 2 files / 18 tests PASS: 기존 업무·콘텐츠 편집·담당 사업 전환·최근 콘텐츠 심사와 두 소비처 실패 복구.
- API TypeScript·tsup production bundle, lecture type-check/production build PASS. 기존 chunk 크기·Browserslist 안내는 유지한다.
- 수정 파일 ESLint error 0. lms.routes.ts의 기존 unused userRoles 경고 3개는 이번 변경과 무관하며 유지한다. 신규 파일 경고는 없다.
- Chromium 실제 강의 production bundle 1440px/390px PASS: 폐기 실패 사유 보존→성공→이력 조회 실패→GET만 재조회→갱신 후 이력 반영. fixture write는 각 3회(폐기 실패/재시도·갱신), 실제 운영 요청 0, 수평 넘침 0, pageerror 0.

감사 실패/원장 연결 실패를 transaction callback 밖으로 전파하는 단위 회귀다. 실제 PostgreSQL rollback·동시 요청 통합 검증을 실행했다고 주장하지 않는다. UI/browser API는 합성 fixture로 차단했으며 운영 DB/실계정 업무 write·새 테스트 데이터 생성·권한 부여는 없다.

## 인계·미실행

개발 branch: `wo/lecture-certificate-business-operations`. 개발 종료점은 commit·push 후 인계다. PR/CI·main 병합·운영 배포·실계정 처리 검증은 이번 개발 검증에 포함하지 않는다. API와 lecture 웹의 배포가 필요하며 신규 migration은 없다. 기존 완료 WO/CHECK는 당시 증거로 보존한다.

WORKTREE_DISPOSITION: 기존 클라우드 checkout 유지 예외에 따라 KEEP. 미병합 개발 branch와 재사용 가능한 설치/검증 산출물을 보존한다. 이 작업의 fixture 서버는 검증 후 종료한다.
