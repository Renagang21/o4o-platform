# 정산 알림 실패 확인·재처리 검증

> 상태: COMPLETED (개발 범위) · 작성일: 2026-10-27 (KST)
> [TODO](../work-orders/TODO-O4O-SETTLEMENT-NOTIFICATION-RECOVERY-V1.md) · [이용/운영 인계](../guides/O4O-SETTLEMENT-NOTIFICATION-RECOVERY-V1.md)
> 기준 main: e96c4a7934 · branch: wo/settlement-notification-recovery

## 변경과 경계

기존 approved→paid와 pending 기록을 같은 statement로 만들었다. 새 domain 작업 원장은 정산 UUID와 처리 상태/고정 오류/시각·건수만 보관하며 수신자·계좌·본문·관리자 ID를 복제하지 않는다. 재처리는 paid·추적 가능한 pending/failed에서만 수행하며, delivered는 멱등이다. 구 paid/원장 없음은 legacy_unknown으로 구분해 자동 재발송하지 않는다.

기존 Notification Core의 필드·settlement.paid/in_app·내용/targetUrl 계약을 유지한다. 공통 NotificationService·EventHub·기존 사용자 삭제/읽기 계약을 바꾸지 않고, 도메인 producer가 알림 INSERT와 완료 상태를 같은 transaction으로 저장한 뒤 기존 plain-payload EventHub를 호출한다. 부분 실패는 savepoint로 전부 취소하고 실패를 남긴다. SSE 실패는 저장 실패로 재분류하지 않는다. canonical owner/fallback resolver의 query-only 타입을 좁혀 EntityManager도 사용할 수 있게 했으며 실제 역할/관계 SQL은 변경하지 않았다.

기존 neture:admin guard 아래 목록/개별 상태/재처리 API와 관리자 정산 화면을 연결했다. 재처리는 계산·승인·지급·송금을 호출하지 않는다. 지급 직후/빈 정산 목록·빈 주문 상세·대상 전환·응답 유실/조회 실패를 구분한다. 관련 지급 SQL 오류 로그는 raw error/메모를 복제하지 않는다.

## migration·schema

47번째 forward migration `CreateSettlementNotificationJobs1793087685658`만 추가했다. 과거 baseline·migration·기존46개 prefix 지문을 보존했다. 기존 마지막 `69ceb8e5089ee579f9b0f9bc905c10c1795ef59de69d03566ab33043c1b1957e`(7,319 lines), 신규 `4bd5d4e71e2656241a20e63fc226cbc571228dd4634294f0d3772bb3bff115e1`(7,338 lines)이다.

별도 loopback PostgreSQL15에서 모든 prefix·empty down/up를 확인했다. 작업 행이 존재하면 down 거부를 실제 DB에서 검증했다. canonical fixture는 테스트 후에도 schema 지문을 다시 대조하고 소유 표식이 있는 전용 DB만 정리해 잔존0을 확인한다. 운영 migration은 적용하지 않았다.

## 실제 검증 결과

| 검사 | 결과와 한계 |
|---|---|
| 정산 기존 단위·catalog/façade | 3 suites / 121 PASS. 기존 전이·금액/필터·bind marker·실패 정책과 새 원자적 queue/후속 전달 경계. 수신자/개인정보·부분 실패는 아래 실제 DB 검증으로 이동 |
| 새 HTTP 계약 | 16 PASS. 실제 Express/Supertest, auth/scope는 fixture stub. 익명401·공급자/일반 운영자403·입력400·기존/미지급409·미존재404·저장오류503·재지급 미호출 |
| 실제 canonical DB | 2 suites / 22 PASS: 기존 공급자→약국→결제/배송/정산 왕복10 + 알림 복구12. canonical baseline+47 prefixes 검증, fixture schema 사후 복구 확인, DB 잔존0 |
| DB 핵심 사례 | paid+pending 후 초기 worker 중단 / 동시 요청6개→전체 수신자 알림1회 / 2번째 수신자 INSERT 실패→알림0·failed / 실패 후 재처리 / 기존 지급 행 모든 값 불변 / 알림 삭제 후 재생성0 / 현재 owner만 수신 / 수신자 없음 / SSE 실패에도 delivered / legacy_unknown·not_applicable 차단 / 이력 있는 down 거부 / 표가 없으면 approved 보존 |
| 전체 Neture 웹 | 161 files / 1,392 PASS. 신규 UI9·전송7은 이 결과에 포함하며 중복 합산하지 않음 |
| PC1440/mobile390 | 실제 관리자 정산 페이지·CSS production fixture, API만 모의. 목록 실패→재조회, 재처리 응답 유실→상태 조회로 완료 확인, 재처리1회·지급 호출0, 빈 주문/정산 목록에서도 복구 동선 유지. page errors0·가로 넘침0 |
| 타입·빌드 | API type-check/production build, Neture type-check/production build PASS. 최신 main의 pdfjs-dist 누락은 frozen install로 해결. 기존 큰 chunk 안내 유지 |
| migration contract | 21 PASS / 0 FAIL. 신규 ledger의 writer fence·FK cascade·이력 존재 시 down 거부 포함 |
| lint·문서 | 변경 파일 lint 오류/경고0, 새 문서 3건 민감정보0·상대 링크 존재·diff 공백 오류0 |

초기 실제 DB 검증에서 varchar 파라미터 추론과 TypeORM UPDATE 반환 `[rows,count]` 형식 차이를 발견했다. 명시적 cast 및 WITH changed SELECT 정규화 후 22건을 전부 재실행해 통과했다. 원인을 schema/환경 변수 누락으로 추정하거나 테스트를 약화하지 않았다. 초기 API/웹 테스트는 일회성 합성 자료이며 실제 PG/은행·운영 계정·외부 발송 증거가 아니다.

## 인계·문서 정합

새 표가 새 API보다 먼저 적용되어야 한다. schema 미적용 시 지급은 원자적으로 실패하고, 전달 transaction이 불명확하면 관리자에게 상태 재조회를 안내한다. 운영 schema·송금·실계정 업무 쓰기·재처리·AI 기능 변경·main merge/배포는 실행하지 않았다. source/증적은 작업 branch와 `/tmp/o4o-notification-*.log`, `/tmp/o4o-notification-browser/`에 있다. 최종 commit/push 원격 일치·작업트리 상태는 종료 보고를 따른다.

문서 정합: TODO의 조사 계약·실행 결과와 이 CHECK·이용 안내를 맞췄다. 과거 완료 기록·canonical index·보존기간·금융 정책은 변경하지 않았다. 새 작업은 기존 클라우드 격리 checkout을 재사용하고 전용 branch에서 수행했다. WORKTREE_DISPOSITION=KEEP(사용자 지정 개발 인계·클라우드 단일 checkout 보존).

종료 fetch에서 origin/main=60bec2ef4f(PR #851)를 확인했다. 기준 이후 funding/cooperation 변경이며 수정 경로·migration registry 중복은 없다. 이 branch의 검증 기준은 e96c4a7934이며 최신 main 통합 및 통합 후 검증은 미실행이다.

## 후속 main 통합 검사 (2026-10-27)

사용자의 main 병합·배포 지시로 통합을 재개했다. 최신 main 82e38f070e를 전용 branch에 병합했다. 통합 HEAD 85867d5ffc에서 Neture 163 files / 1,405 PASS, 정산 관련 API 3 suites / 116 PASS, API 타입·API/Neture production build·migration contract21 PASS를 확인했다.

PR #854의 전체 CI에서 supplier-domain-boundary의 수신자 source 검사 실패를 로컬에서도 재현했다(40 PASS / 1 FAIL). 실제 producer를 기존 command에서 새 notification service로 옮긴 변경에 맞춰 command의 위임과 새 producer의 canonical owner resolver 사용을 함께 검사하도록 보완했다. 수신자 판정·실제 DB 테스트·기존 권한 정책은 변경하지 않았다. 수정 후 공급자 경계41건과 lint·문서 민감정보 검사가 통과했다. 전체 CI 재검증 및 병합·배포 결과는 PR과 종료 보고를 따른다.

## 운영 배포 완료 후속 (2026-10-27)

사용자가 공급자 검수 진행을 지시해, 앞서 안내한 migration 포함 API·Neture 배포를 이어 실행했다. PR #854 main 병합 SHA는 bdfd9b5ff5415b30486e5ff2b2e8343de0b67653이다. 이 SHA의 CI40490191604·CodeQL40490191566이 SUCCESS이며 main/실행 계정/다른 활성 배포 없음과 검증된 범위 불변을 확인했다.

[Promote 40493809035](https://github.com/Renagang21/o4o-platform/actions/runs/40493809035), services=api,neture, dry_run=false: SUCCESS. 운영 migration Job 단계, API readiness·traffic switch, Neture verified smoke·traffic switch, 최종 serving SHA 확인 단계가 모두 성공했다. 운영 DB 직접 접속·별도 GCP 토큰·freeze 변경·수동 알림 재처리·실제 지급은 수행하지 않았다. 이 증거는 정식 workflow의 성공이며 별도 GCP revision 수기 조회나 migration 실행 건수 원문 추출을 주장하지 않는다.

배포 후 공개 API readiness·웹 URL·정적 JS/CSS·비로그인 API401을 GET으로 확인해 11/11 PASS다. 전역 production status의 NOT_SELECTED/pending은 api,neture 이외 미선택 서비스 보류이며 이번 대상 배포 실패가 아니다. 실계정 검수는 기준 계정 파일 부재로 미실행이다. [후속 공급자 검수 CHECK](CHECK-O4O-SUPPLIER-INTEGRATED-FLOW-VERIFICATION-V1.md)에 상세 범위를 기록했다. 새 페이지 이동 보완은 별도 개발 branch이며 이 배포에 포함하지 않았다.
