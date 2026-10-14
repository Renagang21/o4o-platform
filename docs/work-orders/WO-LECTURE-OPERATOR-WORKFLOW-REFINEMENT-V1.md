# 강의 운영 심사·문의·수료증 흐름 정비

> 상태: ACTIVE · 작성일: 2026-10-14 · 최종 갱신: 2026-10-14
> 종료: 구현·검증·push·PR 인계. main 병합·배포는 통합 담당.

## 조사 → TODO 보완

기준 main `d9dce2e5a4`. 대상은 `services/web-lecture`의 운영자 강사/강좌 목록·강좌 검토·문의·수료증 화면이다.
[역할별 업무공간](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md), [LMS baseline](../architecture/APP-LMS-BASELINE.md), [scope guard](../architecture/LMS-SCOPE-GUARD.md), [client 규약](../architecture/LMS-CLIENT-CONVENTION-V1.md)을 먼저 확인했다. 공개 열람 정책과 운영 권한은 별도이며 이번에 변경하지 않는다.

| 항목 | 발견 | 보완한 TODO·보존 조건 |
|---|---|---|
| 강사·강좌 심사 R1/S1/A1 | prompt 사유가 저장 실패 시 사라짐. queue의 오래된 scope callback/완료가 새 상태를 건드릴 가능성 | 강의 내부 사유 dialog와 대상/입력 보존, scope별 요청/잠금·저장/후속 조회 구분. 강사 사유 선택, 강좌 목록 사유 trim 필수 계약 보존 |
| 강좌 검토 A1 | 조회·쓰기의 대상 변경/언마운트/중복 실행 방어 부족 | ID별 workspace와 검토 hook. 읽기 전용 curriculum·자료·서버 scope/승인 API 유지 |
| 문의 F1/R1/A1 | 공통 문의 화면을 사용, 강의 어댑터는 인라인. 기존 교육 문의 상태 저장 후 목록 실패 안내 부족 | 어댑터를 강의 API로 분리·요청/envelope 테스트. 기존 문의 hook 분리와 조회 전용 복구. 공통 모듈 구조 변경은 전체 정비로 유보 |
| 수료증 F1/R1/A1 | 발급 응답을 page callback에서 반영, 늦은 응답/실패 사유 보존 방어 부족 | 발급·갱신·폐기 요청 snapshot/결과를 전용 hook 소유. 폐기 dialog 사유 보존. 월수/발급→대상·진위 확인 연결 유지 |

문의에는 외부 답변 발송 API가 없다. 내부 메모/처리 상태만 다루며 답변 전송 기능을 새로 만들지 않는다. 수료증 전체 조회 권한을 새로 열지 않고 기존 수동 발급/ID 작업을 유지한다. 폐기 API의 reason 전달과 서버 보관 여부는 구분한다.

## TODO

- [x] 코드·정본·소비처 조사와 보존 조건 보완.
- [x] 심사 목록·상세의 요청/입력/결과 흐름 정비.
- [x] 문의 어댑터 계약과 기존 문의 저장/조회 실패 복구 정비.
- [x] 수료증 입력·실행·결과 책임 분리와 사유 보존.
- [x] 실패/부분 성공/동시 실행/대상 변경 회귀, 강의 전체 테스트·타입·빌드·합성 UI 검증.
- [ ] 활성 전체 TODO·CHECK 정합, commit/push/PR 인계.

서비스 간 공통화·공유 패키지·API/DB/role/운영 정책 변경·약사회 분회 제외. 실계정 검증은 사용자 담당이며 운영 DB 쓰기 없음.

## 구현·검증 결과

[CHECK](../checks/CHECK-LECTURE-OPERATOR-WORKFLOW-REFINEMENT-V1.md): 강의 10 files/40 tests, 기존 DB-free API/원문 계약 2 suites/140 tests, 타입 포함 빌드, PC/모바일 합성 UI PASS.

수료증 폐기 reason은 기존 서버가 보관하지 않는다. UI 입력/재시도 보존까지 완료했으며 서버 영속·감사 이력은 별도 API/DB·정책 범위로 유보한다. 공통 문의 화면 구조 정비도 전체 정비 단계에서 판단한다.
