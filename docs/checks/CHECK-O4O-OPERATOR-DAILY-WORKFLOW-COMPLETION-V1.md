# 운영자 일상 업무 완결 — 검증·인계

- 상태: ACTIVE
- 작성일: 2026-10-22
- 최종 갱신일: 2026-10-22
- 기준 main: `7dc02646da`
- branch: `wo/operator-workflow-completion-todo`
- 작업: [통합 TODO](../work-orders/TODO-O4O-OPERATOR-DAILY-WORKFLOW-COMPLETION-V1.md)
- 개발 종료점: 로컬 검증·commit·push. PR·원격 CI·운영 적용은 지정 통합 공간에서 수행

## 알림 필요 사건 → 현재 구현 대조

알림을 확인하는 것과 업무를 처리하는 것은 다르다. 현재 업무함의 원장 집계와 처리 화면을 우선 재사용한다. 아래 `업무함`은 영속 개별 알림이 매 사건 발생한다는 뜻이 아니다. 새 SLA·신고·일괄 이메일 정책은 만들지 않는다.

| 사건 | 원장/생산자·소비처 근거 | 이번 처리 |
|---|---|---|
| 서비스 공통 문의 접수·미처리·전달 실패 | contact-delivery.ts, contact-recipients.ts, 서비스별 문의 화면·공통 업무함 | 기존 설정/이메일/자동회신 유지. 앱 알림 복구에서 off 설정·발송 중 claim·기존 성공 채널 증거 보호 |
| 사업·연합회·개별 조합 문의 | operator-inbox.routes.ts, inbox-scope.ts, 각 앱 OperatorInbox 및 기존 알림 화면 | 조직별 조회·답변·답변 이력·미전달 필터·수동 재통지 연결 |
| 담당자 없음·회수 후 미전달 | 기존 공통 지정 필요 알림은 공개 공간 정보·receipt digest만 전달 | 새 담당자가 자기 업무함에서 기존 미전달 건을 찾아 재통지. 공통 운영자에게 비공개 문의 권한을 추가하지 않음 |
| 공급자 입점·보완 재제출 | inbox-tasks.ts의 supplier-review/supplier-resubmitted, supplier-review-request.service.ts | 기존 심사/이력·업무함 유지. 공급자 주문·은행 업무를 운영자로 복제하지 않음 |
| Neture 상품·서비스 공급 승인·후보 | inbox-tasks.ts의 product-review/service-product-review/product-candidates | 기존 Neture 담당 심사 경로 유지 |
| 펀딩 심사·포럼 연계 실패·기한 경과·입금/환급/이행 예외 | inbox-tasks.ts와 FUNDING_EXCEPTION_SQL | 기존 원장 조회·처리 링크 유지. 모금 달성·은행 조회·환급·모집 중지 자동화 없음 |
| 커뮤니티 가입·게시판 심사 | inbox-tasks.ts의 community-members/community-forums, 기존 CommunityWorkspacePage 심사 | 실제 심사 화면 연결 유지. 과거 개체 커뮤니티 원장을 복구하지 않음 |
| 강사·강좌 심사·강의 문의 | inbox-tasks.ts의 lecture 항목, CourseService 알림, Study 알림 목록 | 기존 생산자/소비처 유지. 이번 문의 답변은 업무함에서도 처리 가능 |
| 수료증 폐기 결과·사유 | certificate-operation.service.ts, lecture 전용 operations API | 수행자·사유를 원자 감사로 보관하고 운영 화면에서 조회. 공용 metadata·공개 진위 응답과 분리 |
| 사업 가입·공급 제안·콘텐츠·모집·이벤트 | inbox-tasks.ts의 business 항목, 기존 담당 사업 화면 | 담당 관계·탭 이동 재사용. 일반 활동의 모든 변화를 새 알림으로 만들지 않음 |
| 연합회 소속·조합 가입/탈퇴 | inbox-tasks.ts의 affiliations/cooperative-members/withdrawals, cooperative-management.service.ts | 기존 원장 업무함·현재 담당 경계 유지. 연합회/다른 조합 역할로 로컬 문의 접근 차단 검증 |
| 내 매장 신청 | inbox-tasks.ts의 store-applications, Store 업무함 | 기존 Neture 담당 승인 화면·설정 유지 |
| 분회 신상신고·행사·납부 등 지역 업무 | 기존 web-kpa-branch operator 화면, BranchServiceMembershipController의 서비스 전체 심사는 admin | 지역 업무를 전역 operator에 개방하지 않음. 별도 메인 일상 operator 범위 표현은 정책 후속이며 이번 문의 모듈의 지원 범위에 분회를 임의 추가하지 않음 |

## 구현과 중요한 경계

- ContactReplyService는 기본 null 조직 경계를 보존하고, 신뢰된 서버 scope와 transaction 권한 확인을 받은 경우만 조직 문의를 처리한다. 기존 공통 관리 API의 `organization_id IS NULL` 보호는 그대로다.
- 답변은 request UUID를 claim으로 사용한다. 같은 요청 재시도는 다시 이메일을 보내지 않는다. 다른 답변이 sending이면 새 발송 차단. 전송 예외로 도달 여부가 불명확하면 실패로 단정하지 않고 sending을 유지한다. 운영자가 제공자 결과를 확인하기 전 무조건 재발송하지 않는다.
- 외부 이메일은 DB commit과 하나의 transaction이 될 수 없다. 발송 후 결과 기록 실패도 재시도 시 중복 전송하지 않는다. 성공 응답과 후속 목록/상세 조회 실패를 UI에서 구분한다.
- 담당자 앱 알림 복구는 현재 수신자를 재판정하고 contact row lock 아래 실제 notifications를 확인·추가한다. 읽은 알림도 전달 증거이며 다시 만들지 않는다. 신규 알림·집계 상태·감사는 같은 transaction으로 저장한다. 외부 이메일은 이 기능에서 발송하지 않는다.
- 재통지로 추가한 알림은 기존 서비스별 알림 목록/미읽음 polling으로 소비한다. 별도 SSE·cron·외부 메시징 시스템을 만들지 않는다.
- 조직 문의 최초 알림도 contact lock과 직렬화하여 접수 직후 재통지와 경쟁하지 않게 한다. 알림 오류는 접수 성공을 취소하지 않으며 pending/fail/none 상태가 남는다.
- 수료증은 lecture 현재 운영 권한을 transaction에서 재확인하고 강좌와 수료증을 잠근다. 이미 폐기된 수료증의 반복 요청은 새 사유로 이력을 덮어쓰지 않는다. 기존 선택 입력 계약을 유지하며 과거 미보관 사유를 추정 복원하지 않는다.
- 자료 공통 core에 선택적 atomicAudit 계약을 추가하고 현재 KPA 소비처에 같은 manager의 KpaAuditLog 저장을 주입했다. 다른 기존 hook의 의미를 일괄 바꾸지 않는다. 상태 변경의 이전 값은 잠금 후 읽으며 감사 실패 시 원복한다.
- 문의 메모/답변·수료증 사유 이력은 기존 개인정보·감사 보유기간 정책을 적용하는 원장에만 저장한다. 별도 무기한 테이블이나 개인정보 export를 만들지 않는다.

## 검증 결과

아래는 최종 실행 결과다. 실패·초기 실행과 구분한다.

| 검증 | 확인 결과 |
|---|---|
| 전용 PostgreSQL 15.17 문의·범위·동시성·감사 | 23 PASS. canonical 전체 migration prefix/down/up, 조직 권한·답변 격리·동시 재통지·채널 보존·실제 감사 실패 rollback 포함. fixture DB 잔존0 |
| 기존 공통 문의 PostgreSQL 흐름 | 33 PASS. 별도 소유 DB/schema에서 기존 접수·설정·답변·발송 claim·조직 경계 확인, DB/role 정리 완료 |
| API 집중 회귀 | 4 suites / 184 PASS. 답변·공통 자료 core·KPA adapter·강의 계약 검사 |
| 공통 operator UI | 28 files / 216 PASS |
| Study / Pharmcoop UI | 각각 46 / 68 PASS |
| API 타입·bundle 및 웹 build | API type-check·tsup PASS. Study·Neture·Pharmcoop·Store·KPA society·KPA branch production build PASS |
| ESLint | 전체 ratchet 오류46/기준46 PASS (기존 경고947). 신규 집중 경로 오류/경고0. 수정된 기존 CertificateService의 기존 ts-ignore 오류를 임의 변경하지 않음 |
| 실제 Study 번들 Chromium | 1440/390 각각 문의 복구·답변 실패/같은 요청 재시도·입력 보존·발송 이력·수료증 이력 조회/대상 변경 PASS. pageerror 0·문서 가로 넘침 0. 합성 API로 모든 요청 종결 |

초기 실행: 새 checkout의 공통 패키지 빌드가 끝나기 전 API type-check의 dist 해석 실패, 격리 테스트의 메일 mock 누락, fixture UUID/text 파라미터 중복 타입, Study 응답 envelope 해석 오류를 발견했다. 실제 계약에 맞춰 수정·빌드 후 재실행한다. 단순 no-match filter 출력은 build 성공으로 세지 않고 실제 package 이름으로 재실행했다. 기존 감사 실패 rollback 테스트의 의도된 오류 로그는 기대 동작이다.

## 미실행·별도 후속

- 실제 계정 정본은 이번 worktree와 기준 checkout 모두 없다. 운영 로그인·실제 외부 이메일 수신·서비스/사업/조합 담당 지정/회수·Hero 초안/게시/숨김·회원 홈 공개 반영은 미검증이다. 임의 계정·역할·조합 생성이나 운영 문의 발송 없음.
- 합성 PC/모바일 검증은 운영 인증 성공 증거가 아니다. 문의 화면의 범위는 실제 PostgreSQL로 검증했지만 Google/OAuth·실계정 권한 변경은 별도다.
- 분회 서비스 전체의 일상 심사를 맡는 main operator는 기존 지역 operator와 구분하는 범위 정책이 필요하다. 지역 operator에게 전체 승인 권한을 열지 않았다. 분회 지역 원장·금융/연도 업무 전수 정비 완료로 보고하지 않는다.
- admin의 회원·활동·외부 첨부 완전 삭제, 신규 신고/승계 정책, 은행/PG/송금·자동 환급, 통합 운영 대시보드는 별도 범위다. 기존 모든 best-effort 감사를 필수 감사로 전환한 것은 아니다.
- 새 schema·migration·dependency·lockfile·workflow·IAM 변경 없음. 배포 판정은 API 및 공통 operator UI 소비 웹 반영이 필요하므로 통합 단계에서 REQUIRED/MANUAL-GATED로 판단한다. 이 개발 공간에서 PR·CI·배포는 실행하지 않는다.

문서 정합: 이번 TODO와 CHECK에서 현재 구현·검증·미실행을 연결한다. 기존 완료 WO와 과거 배포 기록을 소급 변경하거나 canonical index에 기록 문서를 승격하지 않는다.


## 개발 종료와 통합 인계

- 변경 API: 기존 `/api/v1/operator-inbox/:kind/:key/manage/contacts/:id` 상세에 답변/수행자/메모 이력 추가, 같은 범위의 `POST .../replies`, `POST .../retry-notification`, 목록 `status=delivery`. `GET /api/v1/lms/certificates/:id/operations`는 기존 lecture operator guard 사용.
- API 및 공통 operator UI 소비 웹 배포 필요. 신규 migration 없음. 실제 이메일 설정·제공자 결과 확인과 실계정 업무 검증은 운영 적용 후 별도 증거로 남긴다.
- 개발 branch `wo/operator-workflow-completion-todo`. PR 생성·원격 CI·리뷰·main 병합·배포는 이 공간에서 실행하지 않음. HEAD는 개발 인계 메시지/원격 branch로 확인한다.
- WORKTREE_DISPOSITION: KEEP — 후속 통합 수정·실계정 검증에 필요. 다른 작업공간 정리 없음.
