# PH purge 참조 검사 성능 보완 V2

> **상태**: ACTIVE · **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **연결 작업**: [퇴역 TODO](../work-orders/WO-O4O-PHARMACYHUB-RETIREMENT-TODO-V1.md)

## 실제 실패와 쿼리 특정

최신 main의 development standalone plan38673377851이 실패했다. 관리자가 읽은 worker 로그는 `stage=purge code=57014`이며 query SHA256은 `c96b86053a6b4da089cd003dcde54876e2981ce9d835a78fbcf955682fa66169`다. 격리 PostgreSQL에서 실제 worker SQL을 캡처해 `product_identifiers.metadata`의 참조 검사와 정확히 일치함을 확인했다.

앞선 media run38500950060의 worker 진단도57014이며 query SHA256 `ece14ffae7834bc8f3de57a0fb8e13c8a7543af496c57f85fb5254fb50b96164`다. 같은 당시 source와 생성 SQL/Entity column을 대조해 `product_candidates.raw_payload` 참조 검사로 정확히 특정했다. 진단에 운영 행·ID·URL·자격증명은 사용/기록하지 않았다.

V1의 대상 ID CTE materialization은 유지하되 development LIKE ANY는 큰 JSON을 ID 수만큼 반복 탐색한다. media는 상관 EXISTS에서 대상/URL/path 검색과 source 직렬화를 반복한다. 원래 worker의 동일15초 statement timeout과5,000행×128KiB 합성 JSON으로 development57014, 기존 media57014를 각각 실제 재현했다.

## 수정과 보호 경계

대상 ID와 media full URL/object path를 한 번 materialize하고 literal alternation 정규식으로 source 문자열을 검색한다. 정규식 구두점은 모두 escape하며 대소문자/부분 문자열 매칭을 유지한다. NULL/빈 media token은 기존대로 제외한다. source 문자열을 대상마다 다시 읽거나 탐색하지 않는다.

timeout15초,5초 lock timeout, 모든 관계 lock·FK·전체 text/JSON/array/UUID 참조 검사·고정 census·Core fence fingerprint는 유지한다. 일치한 다른 서비스 참조는 기존 오류로 중단한다. 공급 제안19행 보존과 PH 관계 정리,41행 삭제 범위, media4/link1/개별GCS4·generation/404 resume·rollback 계약은 변경하지 않는다. inline worker source는 상대 import나 새 의존성을 추가하지 않는다.

## 실제 검증

- 기존 development 부하 재현: timeout57014로 실패. 실행 전체17.85초.
- 기존 media 부하 재현: timeout57014로 실패. development 수정본과 기존 media를 조합한 실행 전체31.85초.
- 양쪽 수정본의 동일 부하: 실제 격리 PostgreSQL15의 전체 plan/apply/rollback/소유권/FK/참조/미디어 generation fixture PASS, 실행 전체24.95초. 각 쿼리는 기존15초 제한을 그대로 적용했다. 위 전체 실행 시간은 개별 쿼리 시간이나 동일 작업의 단순 배속 비교가 아니다.
- development/media/Cloud Run job focused Node unit34건 PASS. 작은 실제 PostgreSQL fixture도 PASS.
- EXPLAIN ANALYZE에서 두 대형 테이블의 id/payload 검사 모두 target_patterns CTE producer1개/Actual Loops1을 검증한다.
- ID에 정규식 기호·퍼센트·밑줄·backslash를 넣어 정확한 참조는 차단하고 비슷한 문자열은 허용한다. media URL/path의 점을 다른 문자로 바꾼 문자열은 참조로 오인하지 않는다. 기존 실제 URL/ID/고아 OUTPUT·다른 서비스 링크 보호도 통과한다.

실제 부하 fixture 재실행은 기존 loopback 전용 `ph_dev_purge_fixture`의 `PH_DEV_FIXTURE_URL`과 `PH_PURGE_STRESS_FIXTURE=1`을 명시한다. 운영/공유 DB를 연결하지 않는다. 기본 테스트 실행은 큰 padding을 생성하지 않는다.

## 운영 상태

production apply는 실행하지 않았다. 최신 CI/review/main 반영 후 development/media standalone plan을 각각 성공시키고, exact main에 임시 WIF 제한을 적용한 controlled window에서만 apply한다. GCP 관리자 인증은 로컬 담당 경로를 사용하며, 실행 후 WIF 복구와 잔여 검증이 필요하다.

작업 중 GitHub API401와 git 인증 실패가 발생했다. 로컬 검증과 commit을 보존하되 push/PR/최신 배포 결과는 인증 복구 전 완료로 보고하지 않는다.

문서 정합: 이전 성능 개선과 현재 재현을 구분하고 runtime 정본·보존 정책·삭제 범위는 변경하지 않았다.
