# 약국 주문 준비·프로그램 자료 활용 테스트

> 상태: ACTIVE · 작성일: 2026-10-27
> 개발 branch용 절차. 이 WO는 아직 main 병합·운영 배포되지 않았다.

## 1. 프로그램 자료를 받기 전

개발 Main에 로그인 → **약국 주문 준비** → 거래처 추가 → 상품명·포장규격·포장 개수 입력 → 행 추가. 재고·구매 이력 없이도 시작한다. 거래처가 없거나 수량이 미확인이면 초안으로 남긴다. ‘상품·규격·수량 준비 확인’은 빈 시트·미정 행을 거절한다.

‘품절 확인 요청 준비’ 또는 ‘주문 요청 준비’는 기존 입력창에 요청문만 반영한다. 내용을 확인하고 기존 요청 실행을 누른다. 선택한 업무 매뉴얼도 기존 검색 경로로 참조할 수 있다. 진행 중 QUESTION에 답하는 동안 새 주문 요청을 끼워 넣지 않는다. 자동 실행·로그인·주문 제출·결제는 하지 않는다.

사이트 URL 입력은 실행 허가가 아니다. 지오영을 포함해 현재 미등록 도매 사이트는 사용자가 직접 로그인해 업무를 수행하고 기존 질문·교정 흐름으로 보완한다. 사이트 절차를 검증하지 않은 상태에서 ‘자동 주문 지원’이라 표시하지 않는다. 로그인 ReturnUrl·인증정보를 주소 칸에 저장하지 않는다.

인계 후 실제 접수를 확인했다면 사용자가 접수번호를 직접 입력해 확인 상태를 기록한다. 자동화 응답·인계만으로 주문 완료가 되지 않는다. ‘접수 확인 거래처’를 선택해 각각 접수번호를 기록한다. 확인한 거래처의 중복 요청은 차단하고 나머지 거래처는 계속 진행한다. 일부 접수 후 행 편집은 잠그며, 모든 거래처 확인 후 시트가 완료된다. 추가 주문·상품 변경은 ‘새 주문 시트’로 시작한다. 이 테스트에서 실제 주문 제출 시험은 별도 승인 전 수행하지 않는다.

## 2. PC SQLite 준비

기존 PC 연결 프로그램 설치·페어링 절차를 사용한다. Node 22.18.0 이상에서 내장 SQLite가 생성되므로 SQLite 별도 설치가 없다. 기존 DB를 삭제·초기화하지 않는다. 자동 업데이트는 없으며 새 코드로 바꾼 뒤 재시작하는 기존 방식이다.

아래 명령의 작업 위치는 `tools/o4o-local-agent`다. 모든 예시의 `organization:fixture-a`는 합성 식별자다. 실제 사용 시 **자신이 사용할 소유자**를 명시한다. 이 인자는 로그인 토큰이 아니며 타인의 자료를 사용할 권한을 부여하지 않는다.

```bash
node src/index.mjs data pharmacy status --owner organization:fixture-a
```

준비 상태·영역별 개수·revision만 출력하며 원문을 콘솔에 출력하지 않는다. 기존 `data status`, `data backups`, `data restore <backup-id>` 절차도 유지된다.

## 3. 약국 프로그램 export 수집

원본은 구매/주문 내역·상품정보·포장·거래처·사용량 등 약국 프로그램이 제공한 export다. **전표 OCR은 사용하지 않는다.** 현재는 UTF-8 CSV를 명시 Mapping한 뒤 계약 JSON을 로컬로 import한다. 실제 Excel binary를 이 명령에 그대로 넣지 않는다. 프로그램별 파일의 열·기준일·기간·단위·반품·원본 고유 키를 먼저 조사한다.

공식 상품코드와 선행 0을 보존한다. 상품명으로 합치지 않는다. 파일에 없는 포장 환산 기준은 직접 확인할 때까지 비워 두며, pack record로 수용하기 전 확인한다. 구매 전표/행 키와 기간별 사용량 키는 고유해야 한다. 모호한 날짜·천 단위 콤마·음수 반품을 자동 추정하지 않는다. 필요한 열만 Mapping하고 환자·처방·인증 관련 열은 선택하지 않는다.

합성 상품 CSV 예시(`kind` 열 값은 계약의 dispensing/retail/unknown으로 명시 정리):

```csv
코드,상품명,구분
0001,합성 상품,dispensing
```

```bash
node src/index.mjs data pharmacy map-csv --owner organization:fixture-a --file fixture-products.csv --kind product --program fixture-program --key 코드 --map "코드=program_code,상품명=name,구분=kind" --profile products-v1 --out products.private.json
node src/index.mjs data pharmacy status --owner organization:fixture-a
node src/index.mjs data pharmacy import --owner organization:fixture-a --file products.private.json --revision 0
```

`map-csv`는 Mapping 결과 파일만 만든다(원장 미반영). 같은 소유자·프로그램·kind에서 다음부터 `--map` 대신 저장한 `--profile products-v1`을 재사용할 수 있다. `--key`는 매번 원본 고유 키 열을 지정한다. Mapping 결과는 원본 키·수집 시점·선택 필드만 포함한다.

`--revision`에는 바로 확인한 status의 실제 값을 넣는다. 다른 프로세스가 갱신했으면 충돌로 중단하므로 자료를 다시 확인한다. import 전에 기존 backup을 만들고, 실패 시 기존 자료를 그대로 둔다. 재import는 merge이며 누락 행을 삭제하지 않는다. source_key가 같은데 id가 달라지거나 이전 수집 시점이면 거부한다.

상품 → 포장·거래처 → 구매/주문·사용량 등 연결 순서로 가져온다. 하나의 JSON bundle에 묶어 일괄 반영할 수도 있다. 참조 열에는 같은 program의 원본 상품·포장·거래처 키가 필요하며 해당 자료가 없으면 거절한다. 실제 프로그램의 명명·열 매핑은 실제 파일 조사 후 확정한다.

## 4. PC 자료를 Main에서 사용하고 수정 반영

```bash
node src/index.mjs data pharmacy export --owner organization:fixture-a --out pharmacy-work.private.json
```

개발 Main → 약국 주문 준비 → PC 자료함 JSON 가져오기. 이미 작성 중인 자료가 있으면 덮어쓰지 않으므로 먼저 내보내고 새 화면에서 가져온다. 가져온 상품·포장을 선택하면 500정×2포장=1,000정처럼 명시된 환산을 표시한다. 확인 재고는 필요한 상품만 실물을 확인해 기록한다. 프로그램 재고·추정 재고와 별개이며 미확인은 0으로 표시하지 않는다.

실제 화면을 직접 확인했을 때 상품·포장·거래처가 연결된 행에서 주문 가능/품절/확인 불가를 기록할 수 있다. 검색 결과 없음은 확인 불가다. 결과에는 시점이 붙고 실시간 재고·검증된 Adapter 결과로 승격하지 않는다.

화면은 자동 저장하지 않는다. ‘전체 자료 내보내기’는 다른 기기의 화면에서 사용할 사본, **‘PC 반영용 수정 내보내기’는 해당 PC의 기존 workspace에 병합할 수정**이다. 프로그램 구매·사용·판매·거래장 원본은 이 수정 파일에 넣지 않는다.

```bash
node src/index.mjs data pharmacy status --owner organization:fixture-a
node src/index.mjs data pharmacy import --owner organization:fixture-a --file o4o-pharmacy-user-edits.private.json --mode user --revision 1
```

revision 예시는 실제 status 값으로 바꾼다. 부분 수정의 연결 대상은 동일 owner의 SQLite에 이미 있어야 한다. 재수집해도 user lane 수정은 유지되며, 같은 record의 사용자 전체 사본이 우선하므로 원본과 다르면 사용자가 재검토한다. 다른 기기 자동 동기화·ChatGPT/Kakao 직접 SQLite 접근은 지원 완료가 아니다.

## 5. 검증 한계

자료 export·Mapping·주문 초안·요청문 준비와 실제 외부 사이트 실행·접수는 구분한다. 실제 약국 export, 지오영 로그인 후 화면, 유료 모델 응답 품질/비용, Windows 조작은 아직 별도 실사용 검증이 필요하다. 거래장 잔액을 자동 결제하거나 환자정보를 수집하지 않는다. 제품 DB/공급자 상품 등록 AI는 이 테스트 범위 밖이다.
