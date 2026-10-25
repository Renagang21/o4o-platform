# Lecture 잔여 작업 TODO와 후속 구현

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **근거 WO/IR**: 사용자 잔여 작업 전체 TODO·문서·코드 보완·push 지시

## 범위와 종료점

최신 main에서 잔여 작업을 재점검하고 구현 가능한 항목을 보완한다. 종료점은 검증·commit·push다. PR·병합·배포·운영 데이터 생성은 이번 작업에 포함하지 않는다. 기존 #767·#789의 완료 결과를 다시 미완료로 되돌리지 않는다.

## TODO

| ID | 작업 | 상태 | 완료 조건·차단 조건 |
|---|---|---|---|
| T01 | 클라우드 잔여 worktree·branch 확인 | DONE | 기준 checkout clean, 이전 작업 branch 없음 확인. 이 작업용 worktree는 push 후 보존 |
| T02 | Windows 잔여 worktree 정리 | BLOCKED | 해당 PC 접근 없음. 로컬 작업자가 사용·변경·junction 확인 후 삭제 및 기준 checkout 손상 없음 보고 |
| T03 | 실제 로그인 격리 검증 | BLOCKED | 공유 브라우저·역할별 테스트 계정·독립 PostgreSQL 필요. 자동 인증 대체 테스트를 실계정 PASS로 쓰지 않음 |
| T04 | 전체 수강·자동/수동 발급 회귀 재현 절차 | DONE | 재사용 가능한 로컬 체크리스트와 테스트 실행·정리 절차를 저장소에 기록 |
| T05 | 과거 수료증 연결 조회 SQL | DONE | 로컬 인계 파일 누락 방지를 위해 읽기 전용 SQL 추적. 운영 census는 사용자 보고상 0건이므로 재보정 불필요 |
| T06 | WebVTT 자막 연결 | DONE | 기존 lesson metadata→강사 편집→보호 학습 player. 잘못된 주소 제외·조회 오류 안내·기존 metadata 보존·회귀 검사 |
| T07 | 강사 신청 소개·전문 분야 | BLOCKED | InstructorApplication에 저장 필드 없음. schema/migration/API 확장 범위를 확정한 뒤 구현. 기존 강의 professionalInfo와 구분 |
| T08 | 미리보기 강의 | DONE | 사용자가 비로그인 공개로 확정. 전용 공개 영상 projection·화면과 권한/브라우저 회귀 완료. 기존 보호 학습 API·수료 경계 유지 |
| T09 | 실제 자막·영상 전송 검증 | BLOCKED | 권한·CORS·코덱 확인 가능한 자료 필요. 합성 fixture와 실제 미디어 성공을 구분 |
| T10 | 결과 CHECK·안내 갱신 및 push | DONE | 검증 결과·미실행 한계·소비처 영향 기록, 민감정보 검사·경로별 commit·push |

## 선행 결과

#767·#789 병합/배포, 월말 갱신 수정, 수료증 원격 branch 3개 삭제, SETUP Admin 3001 반영은 이전 작업 완료다. 사용자 제공 2026-10-24 운영 DB census는 강의·수강·수료증·보정 대상 0건이다. 이번 작업에서 운영 DB를 재조회하거나 보정한 것으로 보고하지 않는다.

검증 근거와 미실행 범위는 [CHECK](../checks/CHECK-O4O-LECTURE-REMAINING-WORK-FOLLOWTHROUGH-V1.md), 실행 방법은 [로컬 검증 안내](../guides/LECTURE-LOCAL-VALIDATION.md)를 따른다. T06 DONE은 구현·합성 검증 완료이며 T09 실제 자료 검증 완료를 뜻하지 않는다.

2026-10-25 후속 결정: 사용자가 비로그인 미리보기를 승인했다. 발행된 public Lecture 강의의 발행 video 차시 중 isFree=true만 전용 경로로 공개한다. T08 구현 완료이며 운영 데이터 생성·실운영 미디어 검증은 T09와 별개다.
