# 실제 업무 검증 CMS 사본의 제한된 정리

> 상태: ACTIVE
> 작성일: 2026-10-11 · 최종 갱신: 2026-10-11
> 근거: [실제 계정 CHECK](../checks/CHECK-O4O-STORE-REAL-WORKFLOW-VERIFICATION-V1.md)
> 범위: 이번 검증 사본 1개·연결 편집 자료 1개·숨긴 게시 제어 1개의 CLI 정리

## 문제와 경계

검증에서 새로 복사·편집·게시한 CMS 사본은 hidden으로 남아 있다. Frozen `asset-copy-core`의 `deleteById`는 snapshot만 삭제하며 편집 자료·게시 제어의 종속 정리를 하지 않는다. 기존 사용자 API로 snapshot만 삭제하면 편집 자료가 남을 수 있다. 현재 원본·계정·매장·다른 자료·상품은 정리 대상이 아니다.

`BASELINE-OPERATOR-OS-V1`과 `STORE-LAYER-ARCHITECTURE`의 Frozen Core, `DESIGN-O4O-STORE-LIBRARY-AND-ASSET-CANONICAL-SOURCE-V1`의 snapshot 소유·KPA 확장 경계를 유지한다. 공통 Core 코드·schema/migration·권한·일반 삭제 API 계약은 변경하지 않는다. 새 표준 삭제 기능이나 일반 자료 삭제 도구가 아니라 승인된 테스트 작업의 사본 정리 CLI다.

## 구현

`scripts/deployment/store-verification-copy-cleanup.mjs`는 기본 plan에서 read-only transaction을 사용한다. 입력은 private 생성 기록의 snapshot·소유 조직·검증 표식 SHA256 fingerprint다. 활성 canonical Store Owner, 소유 관계, kpa/cms provenance, 검증 표식·편집 제목·작성 시각, 단일 편집/제어 행, hidden·user_copy·비강제·비잠금 상태를 모두 확인한다.

전체 사용자 schema의 base table에서 UUID·text·JSON·해당 배열 참조를 조사한다. 선택한 3행과 기존 복구 이력 외의 참조가 있으면 plan에 table/count만 출력하고 apply를 차단한다. playlist·실행 자산·AI insight·제품 연결 등 참조를 임의 삭제하지 않는다. opaque binary나 외부 시스템에 저장된 참조를 조사 완료했다고 주장하지 않는다.

apply는 정확한 before-image digest와 SERIALIZABLE transaction을 요구한다. 공유 Demo 수리 advisory lock과 대상 행 lock을 사용하고, 기존 `canonical_demo_repair_snapshots`에 before-image 기록이 저장된 것을 확인한 뒤 제어 → 편집 → snapshot 순서로 각각 1행만 삭제한다. 복구 기록 누락·행 수 불일치·변경된 원본/소유 관계·남은 참조는 전부 rollback한다. 새로운 복구 table이나 DDL을 만들지 않는다. 다른 운영 변경과 겹치지 않는 실행 상태를 확인해야 한다.

공개 출력은 plan/apply 상태·digest·table/count·차단 여부뿐이다. 계정·조직·사본 식별자, 표식 원문, credential, 데이터 원문은 출력하지 않는다. GitHub Actions에서는 동일한 요약을 notice annotation으로 남겨 실행 결과를 API로 읽을 수 있게 한다.

## 승인된 운영 실행 연결

운영 CLI 연결은 기존 `pharmacyhub-qr-cutover.yml`의 WIF·Cloud SQL proxy·owner/main/freeze·standalone gate를 재사용한다. [검토용 workflow patch](proposals/WO-O4O-STORE-VERIFICATION-COPY-CLEANUP-V1.workflow.patch)는 적용 전 검토 기록이다. 사용자가 2026-10-11에 연결 변경과 운영 plan 확인 후 해당 3행 정리를 명시 승인했으며 실제 workflow에 적용했다. `copy_cleanup`과 4개 fingerprint/digest 입력, 독립 CLI step, 기존 작업과의 상호 배타 조건을 추가한다. 새 credential·서비스 계정·GitHub permission·배포 설정 변경은 제안하지 않는다.

AGENTS.md §5의 `Docker / CI / build·deployment infrastructure 변경`은 이번에 새로 확인할 범위다. 이번 workflow 연결 변경은 사용자 명시 승인 후 적용했다. 이미 승인된 이번 검증 자료 정리 범위를 다른 테스트 매장·기존 전체 자료 삭제로 확대하지 않는다. CLI 준비와 실행 대상의 실제 운영 삭제를 구분한다.

## TODO

- [x] 기존 삭제·편집·게시 경로와 Frozen/서비스 확장 경계 조사
- [x] 특정 검증 사본만 허용하는 read-only plan / digest 기반 apply CLI
- [x] 외부 참조·상태·소유·표식·시각 경계와 복구 기록 강제
- [x] 격리된 로컬 PostgreSQL에서 실제 삭제·부분 실패 rollback·보존 검증
- [x] 운영 workflow 연결의 적용 전 검토용 patch 작성
- [ ] CLI·문서 commit/push·필수 CI·review·main 통합
- [x] 새 workflow 연결 변경 승인·적용·로컬 검증
- [ ] 운영 read-only plan의 대상·참조·digest 확인
- [ ] 운영 단일 사본 정리 실행·3행 부재·원본 보존·API 404 확인
- [ ] 실제 계정 CHECK의 완전 정리 TODO 완료 및 종료 정리

## 로컬 검증

격리된 임시 로컬 PostgreSQL database에서 Node test runner **15 tests PASS, skip 0**. 실제 SQL로 read-only plan, 3행 삭제·before-image 저장·원본/계정/소유 보존, UUID·대소문자 text·nested JSON·UUID 배열 참조 차단, 편집 내용·원본 변경 시 digest 불일치, root delete 실패 시 종속 삭제/복구 insert rollback, 복구 insert 억제/복구 table 부재 시 삭제 차단을 확인했다. 테스트 database는 실행 후 삭제했다. 운영 DB에 이 결과를 적용한 것으로 간주하지 않는다.

로컬 PostgreSQL의 JSON/배열-only 참조 table에서 미사용 bind parameter의 SQLSTATE 42P18을 실제 발견했다. 모든 probe의 parameter type을 명시하고 전체 테스트를 다시 통과했다. 라이브 테스트에서 확인한 결과와 mock 검증을 혼동하지 않는다.

## 운영 plan 최초 실행과 제한 조정

PR #452는 필수 CI·CodeQL과 미해결 리뷰 blocker 없음 확인 후 main `1ef602d63`에 통합했다. 운영 read-only plan 38117865729는 SQLSTATE `57014`(statement timeout)로 실패했다. apply는 실행하지 않았고 삭제는 0행이다. 전체 참조 조사를 생략하지 않고 statement 제한을 15초에서 60초로 조정한다. 실패한 table은 SHA256의 앞 16자리로 구분해 데이터 원문이나 schema 식별자를 추가로 노출하지 않는다. 5초 lock 제한·정확한 digest·3행 범위·복구 및 보존 확인은 유지한다. 같은 WO의 보완 Phase로 기존 작업 worktree에서 새 연속 branch를 사용한다.
