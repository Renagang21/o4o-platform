# 약국 프로그램 자료·주문 초안의 Local SQLite 계약

> 상태: ACTIVE · 작성일: 2026-10-27
> 범위: 해당 WO의 구현 설계. 플랫폼 canonical·공통 schema 정책을 변경하는 문서가 아니다.
> 기준: [Personal Assistant V2](../baseline/O4O-PERSONAL-ASSISTANT-ARCHITECTURE-V2.md) §9·§15·§16 / [commerce 경계](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) / [B2B 계약](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md)

## 1. 물리 구조와 보관 선택 (2026-10-29 개발 계약)

[Main 리팩터링 TODO](../work-orders/TODO-O4O-MAIN-AUTOMATION-EVOLUTION-V1.md)의 개발 branch에서 SQLite v9로 이행한다. 배포 사실은 해당 CHECK/배포 기록으로 별도 확인한다. 기존 migration·backup과 `local-db.mjs` 단일 SQL 접근점을 유지한다.

- `local_pharmacy_workspaces`: 소유 범위별 revision.
- `local_pharmacy_sync_conflicts`: 다른 로컬 ID가 같은 상품코드/원본 키를 가리키거나 포장 환산 기준이 충돌·미확인이면 서버 충돌 행을 별도 보존한다. 참조가 늦게 도착하는 행은 DEPENDENCY 대기로 구분하며 수신 cursor는 계속 전진한다. 참조가 완성되면 제한된 재검사로 자동 반영한다. 준비 시트의 거래처 비활성처럼 기존 참조를 무효화하는 변경도 보호하며, 실제 상품 ID/환산 기준 충돌은 Mapping 확인을 기다린다. 자동 ID 병합은 하지 않는다.
- `local_pharmacy_records`: dataset·원본/교정 lane·kind·id별 행, payload와 증분 동기화 version/mutation/dirty. 전체 workspace JSON 재저장을 대체한다.
- `local_pharmacy_sync`: 허가 epoch·cursor·최근 동기화·오류. 네트워크 전송은 별도 worker이며 DB 접근 모듈에 자격정보를 넣지 않는다.

v8의 `row_key='workspace'` 원본은 정식 migration으로 이전하고 복구 근거로 보존한다. 신규 쓰기는 정규화 행에만 한다. `BEGIN IMMEDIATE`·기대 revision·원본/교정 분리와 참조 검증을 유지하며 실패 시 rollback한다. 구버전 agent는 높은 schema를 초기화하지 않고 업데이트를 요구한다.

소유 dataset 이름은 `pharmacy_` + `SHA256(owner).slice(0,48)`이며 owner는 `user:<id>` 또는 `organization:<id>`다. CLI 문자열은 인증이 아니다. Main API와 PC session API는 실제 계정·조직 소속을 다시 확인한다. generic dataset 통로는 이 scoped 이름을 계속 거부한다.

기존 단일 JSON의 8MB·10,000개는 전송 배치 한도이며 전체 누적 보관량이 아니다. Main 화면/PC CLI의 자료 내보내기는 큰 자료를 참조가 완결된 작은 part들로 구성한 JSON 파일 하나로 묶는다(archive 최대 64MB, part 최대 1,000개/850KiB). 기존 단일 JSON도 읽으며, 같은 PC/owner에 revision을 이어 part별 원자 복원한다. Main은 현재 화면에 불러온 자료를 보관한다. PC CLI export는 해당 소유 범위의 전체 업무 자료를 같은 묶음 계약으로 보관한다. 조회는 페이지로 나누고 주문 작업은 필요한 catalog/시트만 불러온다. 환자·처방 원본을 축적하거나 전체 이력을 AI에 무제한 보내지 않는다.

서버에는 명시 동의를 받은 업무 사본만 저장한다. 허가 epoch·행 version·멱등 mutation으로 재전송과 동시 수정을 구분하고 철회 시 서버 사본을 삭제한다. PC 원본은 유지한다. 원본 키/상품코드/역참조 충돌은 명시적인 409로 돌려 기존 사용자 도움·내려받기 격리 경로에 연결한다. PC session을 이용한 증분 업로드와 서버 수정의 PC 반영은 기존 인증을 재사용한다. 기본 미동의 상태의 Main↔PC 명령도 기존 서버 명령 큐를 일시 경유하므로 “서버를 전혀 거치지 않는다”고 안내하지 않는다. 일시 전달과 지속 업무 사본 보관은 구분한다. Task·Memory·실제 외부 주문 원장을 대체하지 않는다.

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

모든 연결은 식별자로만 한다. pack이 다른 product에 속하거나 존재하지 않는 supplier를 참조하면 전체 저장을 거절한다. 같은 이름의 다른 포장·다른 거래처를 섞지 않는다. 기존 pack id의 상품·기준 단위·환산 수량은 변경하지 않는다. 규격 변경은 새 pack id로 구분해 과거 구매량이 재수집/교정으로 바뀌지 않게 한다. 초안에는 미정 거래처/수량이 가능하지만 준비 확인은 거래처·포장·양의 정수 수량이 필요하다. 추정·추천을 확정 재고나 실제 주문으로 기록하지 않는다.

## 3. 수집·재수집·사용자 교정

전표 OCR이 아니라 **약국 프로그램의 export → 명시 Mapping → 로컬 import**다. 현재 구현은 UTF-8 CSV와 계약 JSON을 받는다. XLS/XLSX binary·프로그램 자체 DB 직접 읽기·무인 추출은 이번 범위가 아니다. 실제 파일에 없는 키·포장 환산 기준·가격·수량은 만들어내지 않는다.

프로그램 entry는 `origin={program,source_key,collected_at}`을 가진다. 구매/사용량/판매/거래장에는 필수다. CSV id는 `kind + SHA256([program,source_key])`로 안정화하고 선행 0을 보존한다. 참조 열은 같은 프로그램의 상품/포장/거래처 원본 키로 변환한다. 프로그램 간 연결은 명시 ID Mapping이며 이름 heuristic을 쓰지 않는다.

원본 source_key는 구매/주문 전표+행, 사용량은 수집 기간+품목+업무 구분 등 고유 범위가 필요하다. 단순 상품코드 하나를 모든 기간의 사용량 키로 쓰지 않는다. 현재 map-csv는 **미리 확인한 고유 키 열**을 요구하며, 실제 파일의 키 구성은 파일 조사 후 확정한다. 금액/수량의 구분자·현지 날짜·반품 표시는 프로그램별 사전 Mapping에서 명시한다. 모호한 숫자·날짜는 조용히 변환하지 않고 거부한다.

동일 kind/id는 merge(upsert)이며 같은 source_key의 id 변경·중복·이전 collected_at은 거절한다. imported lane을 다시 수집해도 user lane의 거래 조건·초안·관찰은 남는다. user view는 같은 kind/id의 전체 사용자 record가 우선한다. 따라서 source 갱신과 충돌하는 교정은 사용자가 원본과 비교해 재검토해야 하며 자동 충돌 해결로 위장하지 않는다. 구매·사용·판매·거래장 내역을 사용자 lane에 손으로 만들어 넣는 것을 거절한다.

CLI import는 기존 backup을 만든 뒤 revision 검사·원자 저장한다. PC 조회의 행·revision·summary는 같은 SQLite 읽기 snapshot을 사용한다. export 파일은 명시적 경로에만, 기존 파일을 덮어쓰지 않고 기록한다. 콘솔에는 원문 대신 개수·상태만 출력한다. Mapping은 `local_mappings`에 소유자+program+kind+profile로 구분해 재사용한다.

## 4. 실행·학습·기기 경계

Main은 기존 인증 명령으로 PC 자료를 읽고 수정하며, 서버 보관을 허용한 범위는 서버 사본을 읽고 수정한다. 연결한 자료는 수정 후 자동 저장하며 실패 시 화면 입력을 유지하고 반복 재시도를 멈춘다. 계정/업무공간 변경은 component key로 초기화하고 이전 비동기 결과를 폐기한다. JSON 내보내기/가져오기는 호환·복구 선택지로 유지하며 별도 브라우저 업무 DB를 만들지 않는다. 프로그램 파일 수집은 PC에 먼저 반영하고 허가된 worker가 서버 사본과 동기화한다. 임의 파일 경로·SQL을 받지 않는다.

거래처별 1~10행만 기존 요청창에 준비한다. 매뉴얼 선택·기존 인증·scope·quota·planner·COMMIT gate는 그대로다. 모델 호출은 기존 Core/provider와 요금·quota 예약/정산을 사용한다. 내부 콘텐츠 조회·초안은 기존 도메인 adapter/권한을 재사용하여 서버에서 수행한다. 사이트 주소 저장은 browser allowlist를 확대하지 않는다. 사용자 직접 로그인→실제 작업 관찰→질문·교정→Experience 후보→검증이라는 기존 경로를 따른다. 성공 증거 없이 공통 Workflow/Skill로 승격하지 않는다.

외부 도매 사이트가 주문의 원장이다. 사이트 로그인·주문 최종 제출·결제는 사용자 직접 수행이다. 실행 요청의 성공·인계와 주문 접수를 같은 상태로 합치지 않는다. 부분 접수는 해당 거래처의 중복 요청만 막고 미접수 거래처를 계속 진행한다. 확인된 증거·행은 보존하며 모든 거래처를 확인해야 전체 접수 상태가 된다. 실제 접수·결제·Windows UIA 조작을 이번 자동 테스트에서 수행하지 않는다.


## 5. 배포 단위·회귀

PC agent와 Main Docker는 독립 배포 단위지만 순수 데이터 계약은 agent의 `pharmacy-order-contract.mjs` 한 곳에 둔다. Main은 얇은 re-export로 같은 모듈을 소비한다. Main Docker에는 이 순수 계약과 타입 선언 2개만 COPY하며 agent I/O 코드·credential·실행 설정은 포함하지 않는다. Node/브라우저가 동일 export를 참조하고 Docker 입력에 두 파일이 포함되는 회귀를 추가했다. 기존 CI blocking 명령에 suite만 추가했으며 새 CI job·permission·secret·배포 제어 변경은 없다.

회귀에서 기존 generic Dataset의 무키 import가 같은 밀리초의 batch id를 재사용해 행을 덮어쓰는 문제가 재현됐다. 기존 명시 key와 저장 행은 유지하고 새 무키 batch만 UUID를 사용한다. 고정 시각의 두 import가 각각 보존되는 결정적 회귀를 추가했다. 약국 계약은 이 일반 무키 경로에 의존하지 않고 별도의 명시 원본 행 키를 필수로 한다.

## 6. 최소 도움·경험과 남은 검증

매뉴얼·현재 화면·사용자 교정은 계획의 참고이며 실행 권한이 아니다. 매뉴얼 없는 프로그램에 사전 등록을 강제하지 않고, 현재 자료로 가능한 일을 진행한 뒤 막힌 지점의 도움만 받는다. 아직 등록되지 않은 외부 사이트의 무제한 실행을 허용한 것은 아니다. 실제 주문 URL의 무해한 상대 ReturnUrl 등은 허용하되 자격정보·세션 query·외부 redirect는 보관하지 않는다.

검증된 개인 Preferred/Avoid는 기존 Memory에 남긴다. 공통 추천은 별도의 선택 동의를 받은 사용자들의 검증된 공개 사이트 방법에서 동작 enum 순서만 집계한다. label·요청·화면 글·거래 값·사용자 식별자를 다른 사용자에게 전달하지 않는다. 다른 사용자 추천은 결정적 재생이나 실행 권한을 주지 않는다. 사설 프로그램 절차의 Cloud 공유는 확대하지 않는다.

기존 Task/coordination에서 대기 업무를 찾아 기기 전환 후 재개하며 원래 실행 PC의 연결·세션은 별도 필요하다. 요청 요약은 SQLite에 장기 저장하지 않는다. 같은 프로세스의 짧은 재생 재개에만 메모리로 보관하고 재시작 후에는 구조적 문맥으로 탐색에 복귀한다. 이전 백업은 기존 복구·보존 규칙을 따른다.

실제 약국 export의 Mapping·모델 품질·실제 주문 사이트·Windows 사용자 PC·모든 접점 완결성은 synthetic 테스트와 구분한다. 외부 사이트 최초 연결과 실제 계정 검증을 완료로 표시하지 않는다. 검증 결과와 미완료 항목은 TODO/CHECK에 기록한다.
