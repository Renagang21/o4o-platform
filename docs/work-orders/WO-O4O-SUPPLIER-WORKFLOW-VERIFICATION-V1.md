# WO-O4O-SUPPLIER-WORKFLOW-VERIFICATION-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-19 · **최종 갱신**: 2026-10-19
> **근거 WO/IR**: [WO-O4O-SUPPLIER-BUSINESS-TERMS-V1](WO-O4O-SUPPLIER-BUSINESS-TERMS-V1.md) · 사용자 공급자 잔여 정비 진행 지시

기준 main: `491be1bb82`

## 범위와 TODO

- [x] 최신 main·기존 공급조건/콘텐츠 작업·사용자 확정 정책 조사
- [ ] 운영 계정의 공급자 화면/API 읽기 검증 — 표준 로그인 401 INVALID_CREDENTIALS로 BLOCKED, 값 노출 없이 결과 기록
- [x] 격리 PostgreSQL의 표준 schema에서 기존 20 PASS/6 FAIL 재현
- [x] 현재 기본 공급 opt-in·커뮤니티 정책과 fixture/기대값 대조·정비, 26/26 PASS
- [x] 새 DB 표준 재생 후 협업체별 조건·콘텐츠 요청 포함 API 133개 및 공유 UI 47개 PASS
- [x] 기존 작업의 PR/배포 증거와 [별도 CHECK](../checks/CHECK-O4O-SUPPLIER-WORKFLOW-VERIFICATION-V1.md) 연결, 검증·미실행 범위 구분
- [x] 문서/코드 검증·범위 확인 후 commit·push로 개발 인계 (HEAD·원격 확인은 완료 보고 참조)

사용자 제외 항목인 제안 대상 약국의 active 가입 추가 검사와 결제 직전 제안/가입 재검증은 구현하지 않는다. pharmacy 특별가격은 동일 승인 절차를 유지한다. 운영자 실제 승인·운영 주문/결제·업무 데이터 쓰기는 수행하지 않는다. 초안 영구 저장은 이번 범위 밖이다. 공급자 종료 사유 입력은 2026-10-19 사용자 결정으로 불필요하며 후속 TODO로 남기지 않는다. 새 migration/정책 변경은 이번 범위 밖이다.

운영 읽기 검증이 인증·권한으로 막혀도 격리 테스트·문서 정리는 계속 진행하며, 미검증을 성공으로 표기하지 않는다. 기존 완료 WO는 당시 기록으로 보존하고 이번 종료 기록을 별도로 작성한다.

## 최종 개발 검증·인계

- 관련 API 7 suites/133 tests PASS (실제 PostgreSQL 57, 경계/단위 76), 공유 운영자 UI 47, 공급자 UI 8 PASS.
- 기존 commerce 실패는 수정 전 20 PASS/6 FAIL → 수정 후 26 PASS/0 FAIL. 독립 새 DB의 표준 migration·지문 후 관련 suite 전체를 재실행했다.
- 변경은 commerce 테스트 fixture/현행 기대값, 이 WO와 CHECK뿐이다. runtime 동작·권한·결제·schema·의존성·lockfile·CI 설정은 변경하지 않는다. UI 변경도 없어 새로운 desktop/mobile 브라우저 회귀를 실행한 것으로 보고하지 않는다.
- 문서 정합: 과거 완료 기록을 고치지 않고 새 CHECK에서 #653/#678/#679/#693의 병합과 과거 배포 증거를 연결한다.
- 공급자 실계정 로그인은 401 INVALID_CREDENTIALS로 BLOCKED. 운영자 승인·운영 주문/결제는 NOT_RUN. 인증된 운영 읽기 검증이 남으므로 전체 업무 검증 완료로 마감하지 않는다.
- 문서 민감정보/상대 링크·whitespace 검사와 작업 범위 확인 후 commit/push로 개발 인계한다. 새 PR 생성·병합·배포는 이번 회차에 수행하지 않는다.

WORKTREE_DISPOSITION
worktree: supplier-workflow-closure / branch: wo/supplier-workflow-closure / base: 491be1bb82
main integration: NOT_RUN / PR CI: NOT_RUN / deployment: NOT_RUN (runtime 변경 없음)
smoke: public HTTP PASS, authenticated supplier BLOCKED / other session usage: 없음
verdict: KEEP — 통합 전 후속 수정 및 인증 복구 후 확인 필요

최종 정리: 임시 schema 0, 이번 격리 DB 두 개 삭제 후 잔존 0, PostgreSQL 종료. 다른 작업공간은 보존했다. 문서 민감정보 0·상대 링크·whitespace 검증 통과. 약국 테스트 계정 비밀번호 연결도 없어 인증된 운영 검증은 별도 회차로 남긴다.

## 통합 후속 — 2026-10-19

사용자의 진행 지시에 따라 이 push 작업의 PR·최종 CI/리뷰·main 통합 및 배포 필요 여부 확인을 이어간다. 공급자 종료 사유 입력은 추가하지 않는다. 인증 연결이 바뀌었다는 근거가 없으면 같은 자격증명으로 로그인을 반복하지 않으며 기존 실계정 BLOCKED를 유지한다.

최신 main 통합: `40c8f9d6e0`의 협동조합 역할 관리 변경까지 충돌 없이 반영했다. 새 격리 DB에서 표준 bootstrap/incremental 35개·지문 검증 및 관련 133개 테스트를 재실행해 통과했다. 이번 PR 자체 변경은 테스트와 문서뿐이며, 다른 작업의 운영 migration을 실행하지 않는다.
