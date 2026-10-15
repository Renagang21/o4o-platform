# PH purge 참조 검사 V4 — UUID 기본키 구간 검사

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거 WO/IR**: [PH 퇴역 TODO](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md), [V3 검증](CHECK-O4O-PHARMACYHUB-PURGE-UUID-REFERENCE-SCAN-V3.md)

## V3 운영 plan 결과

#627은 main b2b9eaf99에 병합했고 해당 CI38728890271은 통과했다. 이후 문서 PR #630이 병합된 최신 main e6202355a의 CI38729762439도 통과했고 Delivery는 NO_DEPLOY였다. 실제 데이터·WIF는 변경하지 않았다.

- 개발 plan38730535162: PostgreSQL57014, 해시258048132b0bc3743a034c7b84ab89af832f622f8ff6b760d952eb09dee49bff. SQL 재구성·SHA256 대조로 public.product_landings.metadata의 기존 JSON 검사와 일치.
- 미디어 plan38730893771: PostgreSQL57014, 해시d69849326571a56da9279a0532339eadb52e5c8323abb7b5277dcda920f91ca4. public.product_identifiers.source_label의 기존 문자열 검사와 일치.
- 사용자 제공 Cloud Run 로그로 확인했다. Actions의 PH_JOB_COMMAND_UNCONFIRMED permissions=run.jobs.execute만으로 IAM 실패를 판정하지 않았다. 성공 census는 아직 없다.

UUID 열 변경만으로 전체 참조 검사를 끝내지 못했다. V3의 UUID 동등 검사와 부분 인덱스 대응은 유지하고, 대량 문자열·JSON의 한 쿼리 전체 검사를 추가로 개선한다.

## 변경과 검사 범위

catalog에서 유효한 단일 UUID 기본키를 확인하고, 자손 relation이 없는 테이블만 기본키 순서로 최대1024행씩 검사한다. NULL cursor는 첫 행부터 시작하고, 이후에는 직전 구간의 마지막 UUID보다 큰 행을 검사한다. 구간 행 수·참조 수·마지막 UUID와 엄격한 전진을 확인하며, 모든 구간을 확인한 뒤에만 참조0을 반환한다. 중간 DB 오류·불완전 응답·정지 cursor는 즉시 실패한다. 참조가 있으면 기존처럼 삭제 전에 거절한다.

- 행 데이터는 PostgreSQL 안에서 원래 ::text COLLATE C와 동일 literal 정규식으로 검사한다. job 내부에는 구간 수량·다음 cursor만 반환하고 payload나 UUID를 로그에 출력하지 않는다.
- 소유권 판정은 원래 행 alias에서 계산하고 동일한 NOT COALESCE 조건을 유지한다. 대상 ID·URL·객체 경로 집합도 동일하다.
- 상속·partition 부모는 자손 전체를 포함하는 기존 검사를 유지한다. 자손의 키는 부모 PK로 유일성이 보장되지 않고 foreign descendant는 개별 relation 목록에서 빠질 수 있으므로 부모를 ONLY/keyset으로 대체하지 않는다.
- UUID 열은 V3 동등 검사 그대로다. 확인된 UUID PK가 없는 테이블도 기존 전체 검사를 유지하며 timeout은 실패로 처리한다. 어떤 테이블·열도 검사에서 제외하지 않는다.
- statement_timeout15초·lock_timeout5초·job timeout600초·트랜잭션·고정 census·FK·공유 데이터·Core fence·GCS generation 보호는 변경하지 않는다. 새 dependency·migration·운영 인덱스 생성은 없다.

## 검증

- focused Node47 PASS: 구간 경계, 마지막 구간의 참조, cursor 정지/비정상 응답, 중간 오류, 기존 UUID/비키 테이블 경로 포함.
- 실제 PostgreSQL 기존 전체 fixture PASS: plan/apply·공유 보존·Core fence·FK·rollback, 상속 자손 참조 거절, 각5000행×128KiB JSON 대용량 검사. 기존 fixture의 실행 계획 수는 한 번의 전체 검사에서 여러 구간으로 바뀐 것에 맞춰 갱신했다.
- 진단 실험: 격리200만 행에서 기존 cross join 정규식은 문자열·JSON 모두15초 timeout. scalar subquery 변경은 문자열8924ms였으나 JSON은 여전히15초 timeout이어서 해결책으로 채택하지 않았다.
- 실제 분할 검사200만 행 fixture PASS(총204.5초): 개발45153ms/미디어23646ms, 각각1954개 구간에서 scanned합계200만 행과 PK 범위 인덱스를 확인했다. 마지막 최대 UUID의 참조·NULL·literal 메타문자·배열 참조를 검증했다. 이후 작은 fixture에서 이름이 id가 아닌 UUID 기본키와 all-zero UUID 첫 행도 검증했다. 운영 속도 보장·운영 plan 성공을 주장하지 않는다.
- 새 Node 회귀를 기존 CI quality job에 blocking 단계로 연결했다. PostgreSQL fixture는 격리 DB opt-in이며 실제로 실행해 검증했다.

## 다음 단계

CI·Codex 리뷰를 통과한 뒤 main에 통합하고 정확한 최신 main에서 두 plan을 다시 실행한다. 성공 census 확인 전 WIF 제한·apply를 시작하지 않는다. main이 움직이면 기존 SHA의 WIF 조건을 재사용하지 않는다. #610·#615 통합은 PH 운영 창 뒤로 유지한다.

문서 정합: V3 실패·V4 후속을 구분하고 과거 성공으로 덮어쓰지 않았다.
