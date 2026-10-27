# 약국 프로그램 자료·주문 초안의 Local SQLite 계약

> 상태: ACTIVE · 작성일: 2026-10-27
> 범위: 해당 WO의 구현 설계. 플랫폼 canonical·공통 schema 정책을 변경하는 문서가 아니다.
> 기준: [Personal Assistant V2](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §9·§15·§16 / [commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) / [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)

## 1. 물리 구조 결정

현재 v8 `local_datasets`, `local_dataset_rows`, `local_mappings`, schema history·backup을 재사용한다. 신규 테이블 0·migration 0·schema version 변경 0. 모든 SQL은 `local-db.mjs` 한 접근점에 둔다. 새 `*_orders` 원장·공통 거래처 마스터·서버 판매/결제/재고 원장은 만들지 않는다. `pharmacy_products` 같은 기존 일반 dataset 이름은 그대로 사용할 수 있다.

소유자별 dataset 이름은 `pharmacy_` + `SHA256(owner).slice(0,48)`. 소유자 입력은 `user:<id>` 또는 `organization:<id>`다. **이는 로컬 신뢰 CLI의 명시적 선택이며 인증 수단이 아니다.** 공유 PC에서 파일·OS 계정 접근을 분리해야 한다. 사용자/조직의 실제 권한을 검증하는 새 cloud API는 없다. generic cloud dataset query와 일반 CSV import는 이 정확한 scoped 이름 형식만 거부해 우회 읽기·replace를 막는다. 로컬 사용자 자신의 명시적 backup/restore/export 기능은 유지한다.

각 workspace는 기존 dataset의 `row_key='workspace'` 한 행이다:

```text
revision: integer
imported: PharmacyEntry[]   # 약국 프로그램에서 수집한 최근 원본 사본
user: PharmacyEntry[]       # 사용자 초안·관찰·교정 (원본과 별도)
```

물리 행 하나에 논리 영역을 함께 넣는 이유는 초기 연결 수가 제한적이고, 상품/포장/거래처의 참조 정합성과 일괄 import를 **하나의 트랜잭션**으로 보존하기 위해서다. SQLite FK가 JSON 내부 참조를 보장하지 않으므로 저장 전에 전체 유효 view와 원본 view의 참조·타입·중복을 모두 검사한다. `BEGIN IMMEDIATE`와 기대 revision으로 오래된 탭/프로세스의 덮어쓰기를 거절한다. 쓰기 실패는 rollback하며 데이터 복구를 위해 초기화하지 않는다.

8MB·10,000 logical record·시트 100행은 현재 구현의 보호 한도이며 업계 고정 상한이 아니다. 대규모 이력·페이지별 조회가 필요해지면 실제 크기·성능을 측정하고, 공통 schema 변경 판단 후 기존 정식 migration으로 인덱스/정규화를 추가한다. AI가 schema를 임의 분기하지 않는다.

## 2. 논리 데이터·정합성

| kind | 식별·핵심 정보 | 구분·금지선 |
|---|---|---|
| product | id, 공식명, program, program_code, 선택 barcode, dispensing/retail/unknown | 이름으로 자동 병합하지 않음. program+program_code 중복 불허. ProductMaster 직접 확정 없음 |
| pack | id, product_id, label, base_unit, units_per_pack, preferred | 500정×2포장=1,000정. 환산 기준은 소수 6자리까지이며 0.1×3 같은 계산은 정수 기반으로 환산한다. 포장 개수와 환산 수량 분리; 환산 기준 없으면 추측 금지 |
| supplier | 약국 로컬 id/code, 선택 common_company_id, 이용 여부, 우선도, 사이트, 결제 시점/필요 여부/방법/확인 시점 | 공통 회사의 연결 힌트와 이 약국의 거래 조건 분리. 공급자 승인/로그인 세션 아님 |
| purchase | 원본 행 id, document_type=purchase/order/return, product/pack/supplier, pack_count, 원본 시점 | 프로그램 주문은 입고 구매량에서 제외. 반품은 음의 환산 수량으로 별도 해석. 원본은 양의 포장 개수 유지 |
| usage/sale | product, period_from/to, quantity, unit | 조제 사용량·비처방 판매량 구분. 환자/처방 원본 없음; 판매량은 선택 수집 |
| stock | product, quantity/unit, confirmed/program/estimated/unknown, observed_at | 미확인=null, 0 아님. 실제 확인·프로그램·추정을 섞어 최신 재고라 단정하지 않음 |
| availability | product/pack/supplier, available/out_of_stock/unconfirmed, source, observed_at | 검색 없음=unconfirmed. 시점 관찰이지 실시간 재고 정본 아님. 실제 Adapter 수집은 아직 미연결 |
| balance | supplier, purchases, unpaid, observed_at | 프로그램 거래장의 판단 사본. 결제/회계 원장·자동 송금 없음 |
| sheet | title, lines, status, 선택 receipt evidence | Task·외부 원장과 다른 업무 초안. 거래처별 receipts에 접수번호·시점 보관, 전체 거래처 확인 후 receipt_recorded |

모든 연결은 식별자로만 한다. pack이 다른 product에 속하거나 존재하지 않는 supplier를 참조하면 전체 저장을 거절한다. 같은 이름의 다른 포장·다른 거래처를 섞지 않는다. 기존 pack id의 상품·기준 단위·환산 수량은 변경하지 않는다. 규격 변경은 새 pack id로 구분해 과거 구매량이 재수집/교정으로 바뀌지 않게 한다. 초안에는 미정 거래처/수량이 가능하지만 준비 확인은 거래처·포장·양의 정수 수량이 필요하다. 자동 주문량 추천은 하지 않는다.

## 3. 수집·재수집·사용자 교정

전표 OCR이 아니라 **약국 프로그램의 export → 명시 Mapping → 로컬 import**다. 현재 구현은 UTF-8 CSV와 계약 JSON을 받는다. XLS/XLSX binary·프로그램 자체 DB 직접 읽기·무인 추출은 이번 범위가 아니다. 실제 파일에 없는 키·포장 환산 기준·가격·수량은 만들어내지 않는다.

프로그램 entry는 `origin={program,source_key,collected_at}`을 가진다. 구매/사용량/판매/거래장에는 필수다. CSV id는 `kind + SHA256([program,source_key])`로 안정화하고 선행 0을 보존한다. 참조 열은 같은 프로그램의 상품/포장/거래처 원본 키로 변환한다. 프로그램 간 연결은 명시 ID Mapping이며 이름 heuristic을 쓰지 않는다.

원본 source_key는 구매/주문 전표+행, 사용량은 수집 기간+품목+업무 구분 등 고유 범위가 필요하다. 단순 상품코드 하나를 모든 기간의 사용량 키로 쓰지 않는다. 현재 map-csv는 **미리 확인한 고유 키 열**을 요구하며, 실제 파일의 키 구성은 파일 조사 후 확정한다. 금액/수량의 구분자·현지 날짜·반품 표시는 프로그램별 사전 Mapping에서 명시한다. 모호한 숫자·날짜는 조용히 변환하지 않고 거부한다.

동일 kind/id는 merge(upsert)이며 같은 source_key의 id 변경·중복·이전 collected_at은 거절한다. imported lane을 다시 수집해도 user lane의 거래 조건·초안·관찰은 남는다. user view는 같은 kind/id의 전체 사용자 record가 우선한다. 따라서 source 갱신과 충돌하는 교정은 사용자가 원본과 비교해 재검토해야 하며 자동 충돌 해결로 위장하지 않는다. 구매·사용·판매·거래장 내역을 사용자 lane에 손으로 만들어 넣는 것을 거절한다.

CLI import는 기존 backup을 만든 뒤 revision 검사·원자 저장한다. export 파일은 명시적 경로에만, 기존 파일을 덮어쓰지 않고 기록한다. 콘솔에는 원문 대신 개수·상태만 출력한다. Mapping은 `local_mappings`에 소유자+program+kind+profile로 구분해 재사용한다.

## 4. 실행·학습·기기 경계

Main은 JSON 사본을 transient state로 읽는다. 계정/업무공간 변경은 component key로 초기화하고 비동기 file 결과도 폐기한다. SQLite 연결을 가장한 브라우저 DB를 만들지 않는다. ‘PC 반영용 수정’ 파일을 PC에서 같은 owner의 최신 revision으로 import해 반영한다. 새 서버 write action·자동 cloud sync·임의 파일 접근은 없다.

거래처별 1~10행만 기존 요청창에 준비한다. 매뉴얼 선택·기존 인증·scope·quota·planner·COMMIT gate는 그대로다. 신규 모델/API 비용 경로는 없지만 사용자가 기존 요청을 실행하면 기존 요금·quota가 적용된다. 사이트 주소 저장은 browser allowlist를 확대하지 않는다. 사용자 직접 로그인→실제 작업 관찰→질문·교정→Experience 후보→검증이라는 기존 경로를 따른다. 성공 증거 없이 공통 Workflow/Skill로 승격하지 않는다.

외부 도매 사이트가 주문의 원장이다. 사이트 로그인·주문 최종 제출·결제는 사용자 직접 수행이다. 실행 요청의 성공·인계와 주문 접수를 같은 상태로 합치지 않는다. 부분 접수는 해당 거래처의 중복 요청만 막고 미접수 거래처를 계속 진행한다. 확인된 증거·행은 보존하며 모든 거래처를 확인해야 전체 접수 상태가 된다. 실제 접수·결제·Windows UIA 조작을 이번 자동 테스트에서 수행하지 않는다.


## 5. 배포 단위·회귀

PC agent와 Main Docker는 독립 배포 단위지만 순수 데이터 계약은 agent의 `pharmacy-order-contract.mjs` 한 곳에 둔다. Main은 얇은 re-export로 같은 모듈을 소비한다. Main Docker에는 이 순수 계약과 타입 선언 2개만 COPY하며 agent I/O 코드·credential·실행 설정은 포함하지 않는다. Node/브라우저가 동일 export를 참조하고 Docker 입력에 두 파일이 포함되는 회귀를 추가했다. 기존 CI blocking 명령에 suite만 추가했으며 새 CI job·permission·secret·배포 제어 변경은 없다.

회귀에서 기존 generic Dataset의 무키 import가 같은 밀리초의 batch id를 재사용해 행을 덮어쓰는 문제가 재현됐다. 기존 명시 key와 저장 행은 유지하고 새 무키 batch만 UUID를 사용한다. 고정 시각의 두 import가 각각 보존되는 결정적 회귀를 추가했다. 약국 계약은 이 일반 무키 경로에 의존하지 않고 별도의 명시 원본 행 키를 필수로 한다.
