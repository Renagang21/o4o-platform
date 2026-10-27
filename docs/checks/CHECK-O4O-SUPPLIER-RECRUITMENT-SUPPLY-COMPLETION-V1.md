# 공급자 일반 모집 공급가·약국 주문 연결 검증

> 상태: COMPLETED (개발 범위) · 작성일: 2026-10-27 (KST)
> TODO: [공급가 보완](../work-orders/TODO-O4O-SUPPLIER-RECRUITMENT-SUPPLY-COMPLETION-V1.md)
> 기준 main: `2b8fc3b23d` · branch: `wo/supplier-recruitment-supply-completion`

## 결과와 범위

일반 판매자 모집의 명시적 공급가를 기존 `seller_recruitments.supply_unit_price`에 저장하고, 공급자가 기존 미확정 모집을 최초 확정할 수 있게 했다. 현재 UI의 대상은 Neture 일반 모집이다. 이전 서비스·협업체 모집과 기존 읽기/참여 계약을 보존하며 신규 협업체 모집 410을 유지한다. 확정가 수정 기능·새 원장·schema/migration·결제/수취/보존 정책·AI 개발은 추가하지 않았다.

기존 마감/재개·노출 검토의 entity 전체 save를 해당 필드 update로 바꾸어 확정가를 덮어쓰지 않게 했다. canonical DB에서 기존 상세 조회의 UUID/varchar 비교 오류를 재현하고 users/organization_members JOIN을 안전한 text 비교로 수정했다. 신청자 문자열에 UUID cast를 강제하지 않는다.

## Consumer Impact Matrix

| 소비처 | 최종 동작 |
|---|---|
| 공급자 모집 생성 | 새 화면은 정수 공급가를 요구한다. 서버의 기존 가격 생략 요청은 nullable 상태를 유지하고 기존 복수 서비스 요청은 가격 없는 경우 보존한다. 가격 포함 요청은 Neture 이외 대상이 섞이면 전체 400 |
| 공급자 목록·상세 | 자기 모집의 가격/미확정 상태 조회. 최초 확정은 인증·active supplier·본인 소유·모집중·Neture 일반 모집으로 제한 |
| PATCH supply-price | 행 잠금으로 동시 최초 확정 하나만 성공. 같은 가격 재확인 200, 다른 확정가/미지원 대상/마감 409, 타인·없는 모집 404. actor/supplier body를 권한으로 쓰지 않음 |
| 공급자 폼 | 전송 중 중복/닫기 차단, 오류 시 입력 보존, 응답 유실 후 동일 금액 재확인, 충돌 시 명시적 최신 정보 조회. 다른 모집/제품·이탈 후 늦은 완료 무시 |
| 익명 공개 모집 | 공급가를 응답에 추가 노출하지 않음. 기존 API shape 유지 |
| 약국 상품 주문 | 기존 공급 SQL·선택 조직·참여 승인·상품/공급 자격 재사용. 확정가로 기존 cart/checkout 주문 생성, 다른 약국 접근 차단, 기존 주문 snapshot 보존 |
| 기타 | 기존 협업체 제안·승인, 소비자 commerce 은퇴, payment-first·재고·배송·정산 경계 유지 |

## 실제 검증

| 검사 | 결과와 한계 |
|---|---|
| frozen install·공통 content-editor build | pinned Node22/pnpm10, 무결성/TLS 유지 PASS. 최신 main 공통 패키지 export에 맞춰 빌드 산출물만 갱신 |
| 관련 기존 API 회귀 | 3 suites / 74 PASS: 공급자 구조 경계·모집 row membership·종료된 모집 API. 새 HTTP suite와 함께 재실행한 membership 29건은 중복 합산하지 않음 |
| 새 HTTP 계약 | 9 PASS (membership와 합쳐 실행한 run은 2 suites/38 PASS). 실제 Express/Supertest이며 인증/active supplier 판정은 fixture stub, 실제 로그인 PASS를 뜻하지 않음 |
| 실제 PostgreSQL 공급·동시성 | 1 suite / 21 PASS. 동시 다른 금액 하나만 반영·같은 금액 멱등·타 공급자·미승인 약국·다른 매장·이전 서비스 분류·마감·금액 범위·기존 cart 계약 |
| canonical DB 왕복 | 1 suite / 10 PASS. baseline+전체 incremental prefix 지문 검증 후 실제 등록/승인·명시적 가격 모집·약국 신청/승인·실제 checkout 저장·상태 변경 후 가격 유지·이전 클라이언트의 미확정 가격 보존·공개 가격 비노출·기존 결제/배송/정산 회귀. 결제 회귀는 기존 합성 test mode이며 실 PG/송금 아님 |
| 신규/최종 웹 관련 | 3 files / 28 PASS: 공급가 폼9·API 충돌/응답 계약8·기존 제품 화면11. 이전 공급자 범위 run의 관련 14 files/171 PASS와 중복 합산하지 않음 |
| 공급자 범위 웹 회귀의 별도 실패 | 아래 main 기존 AI mock 누락으로 1 file/7 FAIL·6 unhandled errors. 전체 웹 PASS라고 보고하지 않음 |
| API production build·Neture production build | PASS. API의 최종 공개 DTO 보존 수정 뒤 API build 재검증. Neture 기존 큰 chunk 안내 유지 |
| PC1440/mobile390 브라우저 | 실제 컴포넌트+실제 CSS의 production fixture, API만 모의. 확정/생성 각각 실패→입력 유지→동일 내용 재시도 PASS. page errors0·가로 넘침0. 외부 요청 차단, 실계정/실서비스 쓰기 없음 |
| lint·문서 | 변경 파일 lint, diff·문서 민감정보·신규 상대 링크 점검. 최종 결과는 종료 보고 참조 |

## 기존 main 테스트 실패의 구분

`SupplierLibraryAuthoring.workflow.test.tsx`는 `@o4o/content-editor` 전체 mock에서 `buildContentAuthoringGuide` export를 제공하지 않아 7건 실패했다. 해당 테스트와 `SupplierLibraryFormPage.tsx`는 기준 main과 diff 0이다. 신규 가격 코드의 실패로 분류하지 않고, 제외된 AI 기능·test mock을 임의 수정하거나 assertion/설정을 약화하지 않았다. 초기 실제 DB 왕복의 UUID JOIN 실패는 이번 흐름의 실제 결함이므로 수정 후 위 10건 전체를 재실행했다. Docker 초기 readiness 전 createdb 실패는 준비 완료 후 재실행해 해소했다.

## 증적·운영 한계

격리 실행 로그는 `/tmp/o4o-recruitment-*.log`, 브라우저 결과·PC/mobile 화면은 `/tmp/o4o-recruitment-browser/`에 보관한다. 민감한 운영 응답·계정·자격정보는 저장/공개하지 않았다. canonical fixture는 실행 소유 표식을 확인한 DB만 제거하고 잔존 DB0을 확인했다. 별도 schema fixture·task 컨테이너도 종료 시 정리한다.

미확정 수취 주체·실 PG 설정과 실제 결제/송금/운영자 승인·업무 데이터·실기기 검수는 수행하지 않았다. 가격 확정만으로 금융 준비가 완료됐다고 주장하지 않는다. 정산 알림 재처리 기능을 별도 도입하지 않았다. main 병합·배포·운영 migration은 실행하지 않으며 종료점은 commit/push 및 원격 HEAD 확인이다. 기존 작업 branch·클라우드 관리 checkout을 임의 삭제하지 않는다.

문서 정합: TODO에 조사 후 계약과 실행 결과를 추가하고 현행 공급자 안내·약국 설계의 공급가 공백을 개발 후속으로 정정했다. 과거 CHECK·canonical index·FROZEN 구조/가격 정책은 변경하지 않았다.
