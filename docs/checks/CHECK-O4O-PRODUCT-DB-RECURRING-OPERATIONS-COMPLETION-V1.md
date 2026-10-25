# 상품 DB 정기 운영 완성 검증 V1

> **상태**: COMPLETED (로컬 구현·검증) · **검증일**: 2026-10-25
> **범위**: [통합 TODO](../work-orders/WO-O4O-PRODUCT-DB-RECURRING-OPERATIONS-COMPLETION-V1.md)의 구현·검증·push·PR CI/리뷰. main 병합·배포·운영 인프라/상품 변경 제외.
> **운영 안내**: [정기 운영 완성](../guides/products/O4O-PRODUCT-DB-RECURRING-OPERATIONS-COMPLETION-V1.md)

## 결과

- 네 가지 기준 초안을 미저장 입력으로 제공한다. 목적/유형/언어/주기는 보존하고 사용 여부는 꺼진다. 관리자가 편집 후 저장해야 등록된다. 기준 seed·자동 예약·상품 오류 확정·AI 호출은 없다.
- 상품 상세/검토에서 상품별 원문·출처·검토/다음 점검·구조화 근거/변경안·갱신·일반 편집으로 연결했다. READ ONLY + REPEATABLE READ, 15초 timeout, UUID/section/page 검증과 10개 pagination을 적용했다. 본문은 최대 20,000자, 잘림 표시와 원문 연결을 제공한다. HTML을 실행하지 않는다.
- 서버/독립 job의 tick을 PostgreSQL transaction advisory lock으로 조정한다. 기존 페이지 잠금·회차 fence·cursor·재시도·중지 계약을 유지했다. busy 호출은 기록/실패를 추가하지 않는다. 성공/실패·실행 경로·소요 시간·처리 수 heartbeat를 남긴다.
- 별도 one-shot bundle을 기존 API 이미지에 추가했다. 기존 API CMD·migration entry·공식 배포 workflow는 바꾸지 않았다. 명시적 --run·예산·종료 요청·연결 해제를 적용하고 API 연결 검증을 재사용하되 entities/schema sync/migration/cache/extension 설치는 끈다. 공개 작업 HTTP route는 없다.
- 이미 배포된 P1/P2/정기 운영/일반 편집을 미배포로 설명하던 현행 guide를 PR #816·Promote 근거로 바로잡고 이번 미병합 기능과 구분했다. 과거 WO/CHECK 본문과 canonical index는 변경하지 않았다.

## 검증 근거

| 검증 | 결과 |
|---|---|
| 기존 상품 정비·승인/반영·갱신·권한·worker API 회귀 | 11 suites / 190 tests PASS. 새 대량 suite는 이 회차에서 제외해 불필요한 재실행을 피했다. 실제 localhost correction_review 사용 |
| 새 실제 PostgreSQL suite | 4 tests PASS. 상품별 scope/출처/근거/직접 링크/pagination, 다른 프로세스의 DB lock, 중단 후 새 service 복구, 50,000개 점검 |
| 관리자 전체 | 38 files / 494 tests PASS. 초안 선택 후 미저장/사용 중지·목적 보존·명시적 저장, 안전한 원문 렌더, 늦은 이전 상품 응답 차단·페이지 이동·갱신 직접 연결 포함 |
| 최종 화면 변경 확인 | 관련 3 files / 31 tests PASS. 기존 전체 회차와 중복 합산하지 않음 |
| 실제 bundle | API main/migrate/provisioning/새 worker bundle build PASS. worker --help는 DB 없이 성공, 명시적 실행의 DB 환경 미지정은 비밀 없는 오류로 실패 |
| 실제 packaged worker 실행 | production bundle을 전용 TLS PostgreSQL의 합성 1개 queued 작업에 실행. cursor 1/completed, source job, 2 tick/1 page/idle, exit 0, fixture schema finally 정리 |
| 타입·build | 공유 패키지 build, API/관리자 TypeScript, 관리자 production build PASS |
| lint | 신규/관련 모듈 오류·경고 0. ProductMasterDetailPage의 기존 reload effect dependency 경고는 HEAD에도 존재하며 연결 링크 외 해당 hook은 수정하지 않음 |
| Chromium 합성 fixture | 실제 관리자 production CSS, 1440px/390px. 초안/목적/사용 여부, 원문 HTML 비실행, 상품별 페이지·작업 링크·worker 표시·새로고침 PASS. 페이지 오류·실패 자산·가로 넘침 없음 |
| 문서 | 상대 링크·민감정보·diff 검사를 확인한다. 실제 최신 HEAD의 PR CI·Codex 최종 결과는 PR 검사·리뷰 기록에서 확인한다 |

50,000개 합성 상품은 SQL generate_series로 생성했고 2,000페이지를 중복 없이 완료했다. 최종 성공 회차에서 생성·실행·결과 저장까지 **45,582ms**였다. 결과 50,000개/서로 다른 상품 50,000개/cursor 50,000·완료·원본 digest 동일을 확인했다. 원본 UPDATE/DELETE 금지 trigger도 적용했다. 실제 운영 DB의 데이터 크기/네트워크/원문 길이 부하를 대표하는 SLA가 아니다.

초기 새 fixture의 근거 ID가 UUID 계약을 어겨 한 테스트가 실패했고 올바른 합성 UUID로 수정한 뒤 전체 관련 58개를 통과했다. localhost HTTP/DB 접근이 제한된 실행의 오류는 성공 근거로 사용하지 않고, 허용된 로컬 실행으로 재검증했다. 실패 회차의 수치를 최종 성공 수에 합산하지 않는다.

## 범위·운영 인계

원본 자료의 정비·근거·변경안·명시적 반영·갱신 검토의 기존 저장 경계를 유지한다. 조회/후보 점검과 상품 반영을 혼동하지 않는다. 기존 데이터 일괄 보정·실상품/기준/예약 수정·AI 확장·QR 공식 DB 채택은 하지 않았다.

독립 worker가 이미지에 포함되어도 외부 Job/Scheduler가 자동으로 설정되지는 않는다. 이번 범위에서 운영 Cloud Run Job/Scheduler·IAM·secret·주기·배포를 만들거나 변경하지 않았다. 해당 설정과 서버 휴면 상태의 실제 예약 검증은 **향후 승인된 통합·배포 단계의 운영 적용 조건**이다. 원본을 쓰는 worker가 아니라 후보 점검/작업 기록용 runner다. 예산은 tick 사이에서 확인하므로 진행 중 페이지의 timeout 여유를 별도 Job 설정에 포함해야 한다.

최신 main 이동은 작업 전용 branch에서만 확인한다. 실제 main 기술 gate·CI/리뷰는 PR의 최신 HEAD로 판정하며 자동 병합은 설정하지 않는다. 사용자 지시대로 main 통합 전 상태를 보존한다.
