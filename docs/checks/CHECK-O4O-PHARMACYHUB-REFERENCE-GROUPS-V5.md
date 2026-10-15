# CHECK — PH 참조 검사 테이블 순회·대상 집합 재사용 V5

- 일자: 2026-10-15
- 범위: PharmacyHub 완전 퇴역 WO 후속 성능 수정
- 기준: main `20a04ee2a3337687eae86c4029b01d83b2479a1a`
- 상태: 구현·격리 검증 완료, PR CI·리뷰 대기. 운영 plan 성공·데이터 삭제 완료 아님.

## 실패 근거

V4 개발 plan run38738916090 / job `ph-dev-38738916090-1`은 Cloud Logging에서 13:10:47Z에 전체 작업600초 제한 종료가 확인됐다. 개별 query57014나 IAM 실패로 판정하지 않는다. 성공 census는 없다. 미디어 plan run38740677821 / job `ph-media-38740677821-1`도 Cloud Logging에서 13:23:33Z 전체600초 종료를 확인했다. 두 plan 모두 전체 참조 검사 누적 시간 문제다. 이 수정 전 DB·GCS write, WIF 변경, apply는 실행하지 않았다.

## 수정

V4는 문자열·JSON·배열의 열마다 같은 테이블을 UUID 기본키로 순회하고, 각 구간에서 PH 대상 집합을 다시 찾았다. V5는 catalog로 확인된 leaf UUID PK 테이블의 비UUID 열을 묶어 한 번 순회한다. 같은 트랜잭션 snapshot에서 대상 ID·URL·객체 경로를 한 번 읽고 bind parameter로 재사용한다. 이 값은 job 내부 메모리에만 두고 SQL 문자열·로그에 삽입하지 않는다.

각 열의 원래 PostgreSQL `::text COLLATE C` 값을 독립적으로 검사한다. 열을 이어 붙이지 않으므로 서로 다른 열에 나뉜 문자열이 참조로 오인되지 않는다. 가장 짧은 대상의 byte 수보다 작은 값은 literal 부분문자열을 포함할 수 없으므로 CASE로 정규식 실행을 피한다. NULL·빈 대상·Unicode·메타문자·배열 의미를 유지한다. 참조 발견 시 원래 열 이름을 식별하고 삭제 전에 실패한다.

UUID 열의 동등 검사와 legacy fallback, 상속/partition 부모 및 비키 테이블의 전체 검사, 모든 원래 테이블·열의 검사 범위를 유지한다. timeout15초/600초, 고정 census, ownership, FK, Core fence, GCS generation, 트랜잭션·rollback은 변경하지 않는다. 새 dependency·migration·운영 인덱스는 없다. 기존 standalone worker의 공통 모듈 data URL bundling을 그대로 사용한다.

## 검증

- focused Node52 PASS: 기존49건과 그룹 구성·대상1회 읽기·cached bind·발견 열·잘못된 응답 회귀.
- 실제 생성 worker의 전체 격리 PostgreSQL fixture PASS(26.4초): plan/apply·공유 보존·FK·Core fence·rollback·상속 자손·각5000행×128KiB JSON 포함.
- 생성 worker의200만 행·세 열 그룹 fixture PASS(총281.8초): 개발43169ms/미디어48968ms, 각각1954개 구간·scanned합계200만 행. 동일 테이블 세 열을 한 번 순회하고 PK 범위 인덱스, 마지막 최대 UUID 참조, NULL, 원래 literal/배열 의미를 확인했다.
- 추가100,000행 비PH 대상 원본 +3200행 source fixture PASS(1.1초): 대상 집합1회 조회, 열 사이에 나뉜 token의 오탐 없음, 뒤쪽 열·배열 참조 발견, Unicode·빈 token·NULL 의미. 공통 identifier quoting 추출 후 생성 worker로 재검증했다.
- 변경 파일 ESLint PASS.
- 운영 plan 재검증 전이다. 로컬 속도를 운영 완료 시간으로 보장하지 않는다.

## 후속

PR CI·Sonar·Codex 리뷰와 최신 main CI/Delivery를 확인하고, main 및 운영 작업이 겹치지 않는 상태에서 개발·미디어 plan을 다시 실행한다. 두 성공 census를 확인하기 전에는 WIF 제한·apply를 시작하지 않는다. #610·#615 통합은 PH 운영 작업 뒤에 진행한다.

문서 정합: V4의 로컬 성공과 운영600초 실패를 구분해 후속으로 기록했다. 기존 기록의 성공 여부를 소급 변경하지 않는다.
