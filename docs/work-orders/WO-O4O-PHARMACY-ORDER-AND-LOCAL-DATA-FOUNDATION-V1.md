# 약국 주문·로컬 데이터 기반 보완

> 상태: ACTIVE · 작성일: 2026-10-27
> 사용자 제공 지시서: `WO-O4O-PHARMACY-ORDER-AND-LOCAL-DATA-FOUNDATION-V1` / `INCREMENTAL_DEVELOPMENT_APPROVED`
> 이번 개발 종료점: 로컬 검증·commit·작업 branch push. PR·main 병합·운영 배포는 하지 않는다.

## 1. 확인한 요구·경계

구매·주문·사용량은 **약국 프로그램에서 내보낸 자료**를 가져온다. 전표 OCR·촬영·재입력은 개발하지 않는다. 빈 주문 시트에서도 시작한다. 재고가 정확하다는 가정·자동 주문량 추천·자동 결제·운영 주문 제출 시험은 없다.

지오영 사이트는 사용자가 지정했다. 사용자가 직접 로그인하고 실제 업무 중 질문·교정으로 절차를 보완하는 대상이다. 로그인 credential·세션 수집·실 사이트 Adapter의 검증 완료·등록은 이번 변경에 없다. 로그인 URL의 ReturnUrl 쿼리를 저장하지 않는다. 미지원 대상이면 기존 runtime이 질문·인계한다. 사용자 입력 URL을 실행 allowlist로 승격하지 않는다.

상품 DB 관리·공급자 상품 등록 AI는 다른 트랙이므로 수정하지 않는다. `common_company_id`는 외부 연결 힌트이지 O4O 공급자 승인·상품 판매 자격이 아니다. 기존 B2B cart·checkout·정산 원장은 무변경이다.

## 2. 최신 main 조사 (base `3b3f0335f9`)

| 분류 | 현재 자산 | 이번 연결·보완 |
|---|---|---|
| KEEP | `local-db.mjs` v8 · bootstrap · migration · backup/restore · Dataset · Mapping | 테이블·schema version 추가 없이 재사용 |
| KEEP | Task · Work Planner · QUESTION/resume · owner-scoped Experience/Workflow Candidate · DOM/UIA/Computer Use 위험 gate | 실행 엔진·Memory·인증·정산 원장 중복 생성 없음 |
| KEEP | `neture_suppliers` 및 공급자 판매 자격 원장 | 외부 거래처를 공급자로 자동 등록하지 않음 |
| KEEP | Browser site registry / supplier Adapter | 등재는 Neture·약학정보원, 공급처 조회 Adapter는 샘플. 실제 도매 주문 사이트 없음 |
| CONNECT | Main composer·데이터 정비·업무 매뉴얼 | 주문 시트에서 명시적으로 기존 입력창만 준비; 요청 실행은 기존 흐름 |
| EXTEND | Dataset repository·CSV projection·Mapping profiles·로컬 CLI | 소유자 선택·원본 행 식별·업무 정합성·revision 충돌·원본/수정 분리 |
| NEW | 순수 약국 업무 데이터 계약·주문 준비 화면 | 별도 범용 엔진·서버 주문 테이블 없음 |

Local Agent 일반 사용자 설치는 현재 Node 기반 설치·페어링이며 자동 업데이트가 없다. SQLite 별도 설치는 필요 없다. 이번에 installer·자동 업데이트·새 MCP 연결을 만들지 않는다. 외부 MCP가 로그인된 도매 사이트와 소유자별 자료를 직접 호출하는 경로는 확인되지 않았고 이번 기능의 지원 범위에 포함하지 않는다. O4O 서버가 사용자의 ChatGPT를 대신해 모델을 호출하는 새 경로도 없다.

## 3. 데이터 계약·실행 범위

[SQLite 설계](../design/DESIGN-O4O-PHARMACY-LOCAL-DATA-CONTRACT-V1.md), [사용 절차](../guides/O4O-PHARMACY-ORDER-LOCAL-DATA-USER-TEST-V1.md)를 따른다.

- 프로그램 코드·수집 시점·원본 행 키를 보존한다. 전표/행 또는 기간/품목 단위 고유 키가 없으면 합성 추정하지 않는다.
- 상품·포장·약국별 거래처·구매/주문/반품·사용량·선택 판매량·재고·품절 확인·거래장·주문 초안의 논리 영역을 기존 Dataset에 담는다.
- 원본 재수집은 merge이며 삭제·초기화·replace하지 않는다. 사용자 수정은 별도 lane으로 보존한다.
- 수량·날짜·상태·프로그램별 Mapping은 명시적으로 정리한다. 환자·처방 등 선택하지 않은 열은 투영에서 제외한다.
- 주문 시트는 작성→준비 확인→인계→사용자가 직접 외부 접수 확인. 요청 준비만으로 접수·주문 완료가 되지 않는다.
- PC SQLite↔Main 연결은 명시적인 로컬 JSON 파일 교환이다. 직접 cloud write·자동 동기화·자동 파일 접근은 추가하지 않는다.

## 4. 후속 연결 조건

- 실제 약국 프로그램 내보내기 파일을 받으면 열·단위·행 키·날짜·주문/구매/반품 구분을 확인해 Mapping profile을 확정한다. 현재 특정 프로그램의 실제 Excel import 검증은 미실행이다.
- 지오영 절차는 사용자가 로그인해 실제 화면을 확인할 때 기존 QUESTION·교정·Experience 경로로 증거를 모은다. 새 사이트 실행 권한·검증된 Adapter/Workflow 승격은 별도 검증 단계다.
- 요청 기반 품절 조회→검증된 결과 수집→시트 연결은 실제 사이트 검증 후 연결한다. 현재 관찰 결과는 사용자가 직접 표시하고 시점을 기록한다.
- 로컬 파일 교환의 자동 bridge·일반 사용자 installer·ChatGPT ingress는 후속이다. 입력 UI만으로 지원 완료라 하지 않는다.
- 환경 개선은 기존 Experience/Workflow Candidate를 재사용한다. 매뉴얼·사용자 입력을 자동 Skill로 승격하거나 SQLite schema를 AI가 수정하지 않는다.

## 5. 검증·인계

검증 결과·Git 상태·미확인 범위는 [CHECK](../checks/CHECK-O4O-PHARMACY-ORDER-LOCAL-DATA-FOUNDATION-V1.md)에 기록한다. 원본 사용자 자료·매뉴얼 전문·credential·실 주문 데이터는 공개 Git에 넣지 않는다.


## 6. 후속 사용자 지시의 통합·배포 완료

사용자가 동일 공간에 main 병합·배포를 명시적으로 지시해 통합 담당으로 진행했다. PR #853은 `82e38f070e`로 병합됐고 main CI·CodeQL이 통과했다. Main의 순수 계약 Docker 입력 변경은 LEVEL 3으로 판정돼 표준 Promote의 `services=neture`만 실행했다. Main 배포·트래픽 전환·최종 서빙 SHA 검증·운영 HTTP/JS 확인이 완료됐다. 기존 hospital-pharmacy는 선택에서 제외한 대기를 유지했다. PC 소스 ZIP은 정확한 병합 main에서 생성·격리 bootstrap 검증했으며 실제 PC 자동 업데이트는 하지 않았다. 동일 WO의 연속 종료 단계로 같은 branch에서 안내·검증 문서만 정합화한다. 상세 실행 증거는 CHECK의 마지막 절을 따른다.
