# WO-O4O-HOSPITAL-DRUG-BROWSER-ONLY-LOCAL-DATA-AND-DESKTOP-ENTRY-V1

> **상태**: DRAFT · 실행 착수(조사 완료 · §7 소스 = 공공 OpenAPI 확정 · 라이브 probe 위해 Secret 등록 대기)
> **표기일**: 2026-09-17
> **선행/대체 관계**: `WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1` (Local Agent 기반 파일럿) 과
> `WO-O4O-HOSPITAL-DRUG-COMPOSITE-QUERY-ORCHESTRATION-V1` (§9 결합) 의 **운영 구조 재정의**.
> 파일럿의 Local Agent/pairing/로그인 의존을 병동 profile 에서 제거하고 브라우저 단독 구조로 바꾼다.
> 일반 O4O Local Agent · Unified Composer · 자동화 계층은 변경하지 않는다.

## 목적

기존 `/hospital-drug` 파일럿을 Local Agent/pairing 의존 구조에서 **브라우저 단독** 사용 구조로 단순화한다.
병동 사용자는 회원가입 없음 · 로그인 없음 · Local Agent 설치 없음 · Chrome Extension 없음 · 별도 설치 프로그램 없음
상태에서 사용할 수 있어야 한다.

## 1. 목표 사용자 흐름

**최초 사용**: ① `https://neture.co.kr/hospital-drug` 접속 → ② `[원내 약품 파일 연결]` → ③ Excel 선택 →
④ 브라우저에서 Excel 파싱/검증 → ⑤ 검색용 데이터를 browser local storage 에 저장 → ⑥ `[바탕화면에 추가]` → ⑦ 이후 아이콘으로 사용.

**평상시**: ① 바탕화면 `원내 약품 안내` 실행 → ② 질문 입력 → ③ 원내 약품 데이터 조회 → ④ 필요 시 약학정보원 정보와 결합 → ⑤ 답변 표시.

**새 약품 파일 배포 시**: ① 약국에서 새 Excel 전달 → ② `[약품파일 변경]` → ③ 새 Excel 선택 → ④ validation → ⑤ 성공 시 기존 local data 교체 → ⑥ 실패 시 기존 정상 데이터 유지.

## 2. 기존 구조에서 제거할 의존성

`/hospital-drug` 경로에서 제거: Local Agent pairing 요구 · 로그인/session 요구 · `local_agent_devices` 의존 ·
Local SQLite 의존 · 401 → 재연결 안내 · 설치자 재로그인 흐름. 일반 O4O Local Agent 구조는 변경하지 않는다 —
병동 profile 에만 browser-only data mode 를 적용한다.

## 3. Browser Local Data

원내 약품 Excel 을 브라우저에서 직접 읽는다. 우선 지원: XLSX · XLS · CSV. **새 dependency 를 넣기 전에 현재
web-neture/vendor dependency 에 parser 가 있는지 조사하고 재사용한다.** 검색용 데이터는 IndexedDB 를 우선 검토한다.
저장 항목 예: logical source id=`hospital_drug_list` · file name · importedAt · rowCount · normalized rows · column mapping metadata.
Excel 원본 binary 전체를 cloud 에 저장하지 않는다.

## 4. File System Access API

Chrome/Edge 를 공식 권장 브라우저로 둔다. V1 에서 file handle 지속성은 필수 요구가 아니다. 운영: 최초 파일 연결 →
새 파일 배포 시 `[약품파일 변경]` → 사용자가 새 파일 선택. 따라서 같은 이름 덮어쓰기 감지 · background file watching ·
persistent file handle 은 V1 필수 범위가 아니다(단순 구현 가능하면 보조 기능으로만 검토).

## 5. 파일 변경 UX

채팅 intent 로 처리하지 않는다. 채팅창 아래 별도 버튼 `[약품파일 변경]` 을 둔다. 역할 분리: Composer=약품 질문 ·
Drug File Control=데이터 등록/교체. 자료 없으면 `[원내 약품 파일 연결]`, 연결 후 `[약품파일 변경]` 으로 표시.

## 6. 안전한 교체

새 파일 선택 시: ① 형식 확인 → ② Excel 파싱 → ③ 필수/매핑 가능 컬럼 확인 → ④ staging data 생성 →
⑤ validation 성공 → ⑥ IndexedDB active dataset 교체. 실패 시 기존 정상 데이터 유지 + 실패 이유 표시.
중간 실패로 기존 자료를 삭제하지 않는다.

## 7. 약학정보원 경로 재점검

기존 health.kr 흐름은 Local Agent/Browser DOM 자동화에 기대고 있을 수 있다. 최신 main 기준으로 현재 health.kr 조회
구현 · 서버측 직접 조회 가능 여부 · 기존 adapter 재사용 가능 여부 · browser-only profile 최소 구조를 조사한다.
목표는 병동 PC 에 Local Agent/Extension 을 요구하지 않는 것. 가능하면 `병동 browser → O4O API → health.kr 조회 →
결과 반환 → browser local drug data 와 결합` 을 우선 검토한다. **구조적으로 불가능하거나 이용정책 문제가 있으면
구현 전에 STOP 하고 최소 대안을 보고한다.**

## 8. `/hospital-drug` 화면

매우 단순하게 유지. 헤더(원내 약품 안내) · 자료 상태(연결됨·품목수·파일명) · 질문 입력 · `[약품파일 변경]` ·
`[바탕화면에 추가]`. 일반 Neture navigation 은 최소화.

## 9. 바탕화면 진입

표시명 `원내 약품 안내` · Canonical URL `https://neture.co.kr/hospital-drug`. Chrome/Edge PWA 설치 가능 시 설치 flow 제공.
불가 시 바로가기 만들기 안내 + URL 직접 사용 fallback. 사용자는 PWA/shortcut 차이를 알 필요 없다.

## 10. 인증

`/hospital-drug` V1: 회원가입 없음 · 로그인 없음 · 사용자 식별 없음. 조회/질의용 공개 업무 화면. 환자정보 미취급.

## 11. 기존 O4O 영향

변경하지 않음: 일반 Unified Composer · 일반 Local Agent · user/device pairing · Local SQLite 기반 PC 자동화 ·
Work Agent · Safety/Risk · 다른 서비스 auth. 이번 변경은 hospital-drug profile 의 data/runtime path 만 단순화.

## 12. 검증 (실제 검증하지 않은 항목은 PENDING)

① 무로그인 `/hospital-drug` ② Local Agent 미설치 상태 정상 화면 ③ XLSX 최초 연결 ④ 브라우저 local data 저장
⑤ local-only 질문 ⑥ 새 Excel `[약품파일 변경]` ⑦ 정상 교체 ⑧ 잘못된 Excel → 기존 데이터 유지 ⑨ 새로고침 후 유지
⑩ Chrome ⑪ Edge ⑫ 바탕화면/PWA 진입 ⑬ health.kr 결합 경로 ⑭ 로그인/재연결 메시지가 더 이상 안 나옴.

## 13. Out of scope

Local Agent 제거 자체 · 일반 O4O auth 변경 · 사용자 계정 · tenant · 환자정보 · background Excel watcher ·
병동 중앙 공유 DB · 처방 자동 변경 · 주문/외부 제출.

## 14. 완료 보고

A. 기존 Local Agent 의존점 · B. browser-only 구조 · C. Excel parser · D. IndexedDB/local storage · E. 파일 변경 UX ·
F. 안전한 dataset 교체 · G. health.kr 재연결 방식 · H. desktop entry/PWA · I. auth 제거 결과 · J. Chrome/Edge smoke ·
K. PENDING · L. commit/CHECK.

상태 키:

```
HOSPITAL_DRUG_BROWSER_ONLY =
LOGIN_REQUIRED =
LOCAL_AGENT_REQUIRED =
EXCEL_BROWSER_IMPORT =
LOCAL_DATA_PERSISTENCE =
DRUG_FILE_CHANGE =
HEALTHKR_PATH =
DESKTOP_ENTRY =
PRODUCTION_SMOKE =
```

---

## 실행 세션 조사 결과 (2026-09-17)

착수 세션이 §3·§7 의 조사 지시를 먼저 수행했다. 결과:

- **§3 Excel parser** — `xlsx`(SheetJS)·`papaparse`·`exceljs` 가 이미 저장소 `node_modules` 와
  `apps/admin-dashboard`·`apps/api-server` package.json 에 존재한다. 다만 `services/web-neture` package.json 에는 없어,
  브라우저 파싱을 붙이려면 web-neture 에 dependency 를 추가(package.json + lockfile 변경)해야 한다. 신규 외부 패키지 도입은
  아니지만 lockfile 변경은 다중 PC 공유 main 환경에서 민감하므로 승인 확인 대상.
- **§7 health.kr = 구조적 STOP** — 현재 health.kr 조회는 `pharmacy-web-executor.ts` 가 **Local Agent + Chrome 확장의
  browser DOM 자동화**로 사용자의 브라우저를 구동해 수행한다. 서버가 health.kr 를 직접 긁지 않는 것이 **설계 의도**다
  (동일성분 페이지 `result_sunb` 는 robots Disallow → 서버 fetch 대신 사용자 브라우저에서 성분명 재검색으로 우회 ·
  `isRobotsDisallowedPath`·§43·§45). 또한 `local.data.query`·health.kr 둘 다 `resolveTargetDevice(ctx.userId)` 로
  **인증 사용자 + 페어링 기기**를 요구한다. 순수 브라우저 페이지(neture.co.kr)는 same-origin 정책상 health.kr 의 DOM 을
  교차출처로 구동할 수 없다 — 그래서 확장이 존재한다. 따라서 "확장·에이전트 없는 브라우저 단독"에서 health.kr 결합은
  ① 서버측 직접 조회(= §7 이 경고한 이용정책/robots STOP · AI-AUTOMATION-EVOLUTION 베이스라인의 "O4O 는 서버 스크래퍼가
  아님" 원칙 위배) 또는 ② 확장 유지(§2 금지) 없이는 불가능하다. **구현 전 STOP · 사용자 결정 필요.**
- **로컬 약품 데이터**(Excel→IndexedDB→브라우저 내 질의)는 교차출처가 아니라 병동 자신의 파일이므로 브라우저 단독으로
  **실현 가능**하다. §7 결정과 무관하게 이 축은 진행할 수 있다.

## 실행 세션 조사 결과 — 약학정보 소스 전환 (2026-09-17, 이어서)

§7 STOP 보고 후 사용자 결정: health.kr 서버 스크래핑 대신 **공공데이터포털(data.go.kr) 공공 의약품 OpenAPI 도입**.
사용자가 인증키(serviceKey) 발급을 이미 완료했다. 개발 착수 전 문서 기준 조사 결과:

- **최소 API 조합 (문서 기준 · 라이브 필드 검증은 Secret 등록 후로 분리):**
  1. **식약처 의약품 제품 허가정보** (data.go.kr `15095677`) — `상품명(제품명) → 품목기준코드(ITEM_SEQ)` 식별,
     제형·전문/일반·업체·주성분·허가번호.
  2. ~~**식약처 묶음의약품정보서비스** (data.go.kr `15063908`) — 체인의 마지막 고리를 단일 API로 제공~~
     **[정정 2026-09-17 · 아래 "라이브 probe 실측 결과" 참조]** — 이 API 는 **동일성분 제품군이 아니라 수탁/위탁(제조위수탁)
     관계 API** 임이 라이브 필드로 확인됨. 동일성분 정본으로 쓰지 않는다. 동일성분 체인은 **HIRA 두 API** 로 재설계.
  - 보조(선택): e약은요 `15075057`(환자용 효능·용법·주의 텍스트) · 심평원 의약품성분약효정보조회 `15021027`(주성분코드 교차검증) ·
    식약처 낱알식별정보 `15057639`(알약 식별 = health.kr 낱알식별 대체 후보).
- **health.kr 의존 제거 가능성(예비 판정):** health.kr 4개 intent(약품검색·동일성분·낱알식별·상세)가 모두 공공 API로 대응된다.
  동일성분(`result_sunb`)은 **HIRA 주성분코드 축**으로 대체(아래 정정 참조 · 묶음의약품 API 아님).
  → **병동 V1 에서 health.kr 제거 가능(공공 API 커버리지가 라이브 검증에서 확인될 경우). health.kr 는 보조 경로로 격하.**
- **인증키 취급 (사용자 명시 · 절대 준수):** 공공데이터 API 인증키는 코드·문서·테스트 fixture·로그에 직접 기록하지 않는다.
  서버 환경변수/Secret Manager 로만 주입한다. 제안 변수명 **`PUBLIC_DRUG_API_SERVICE_KEY`**(단일 발급키 재사용 가정),
  등록 위치: Cloud Run 서비스 `o4o-core-api` 환경변수(Secret Manager 참조). 실제 키 값은 사용자가 직접 Secret 에 등록한다.
- **다음 단계:** ① 사용자가 Secret 등록 → ② 라이브 1회 probe 로 실제 응답 필드명(camelCase/UPPER, serviceKey 인코딩) 확정 →
  ③ O4O 서버에 공공 API client + 정규화 계층 구현 → ④ /hospital-drug 에서 공공 API(성분/동일성분) + 병동 로컬 Excel 결합.
  필드명을 추측으로 고정하지 않기 위해 **probe 를 구현보다 먼저** 둔다.

### 라이브 probe 실측 결과 (2026-09-17)

probe 도구: `scripts/dev/probe-public-drug-api.mjs`(dev 전용·인증키는 env `PUBLIC_DRUG_API_SERVICE_KEY` 에서만·XML 1급 파싱).

- **API #1 = 식약처 의약품 제품 허가정보 — 라이브 검증 성공.**
  - endpoint: `DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnInq07` (버전 07 이 현행)
  - 요청 파라미터: **소문자 `item_name`**(제품명 검색) · 응답 형식: **XML**(`resultCode=00` 정상)
  - 응답 item 필드: `ITEM_SEQ` · `ITEM_NAME` · `ENTP_NAME`(업체) · `PRDLST_STDR_CODE`(품목기준코드) · `SPCLTY_PBLC`(전문/일반) ·
    `PRDUCT_TYPE`(제형/분류) · `ITEM_INGR_NAME`(주성분명) · `ITEM_INGR_CNT`(성분 수) · `EDI_CODE`(심평원 제품/EDI 코드) · `CANCEL_NAME`(취소·취하)
  - 실측 샘플: `타이레놀정500밀리그람` → totalCount=1 · `PRDLST_STDR_CODE=202106092` · `ITEM_INGR_NAME=Acetaminophen`
  - 확정: 체인 1~2단계(`상품명 → 품목기준코드 + 주성분명 + 제형 + 심평원코드(EDI)`)가 이 API 단독으로 실측됨.
- **API #2 = 묶음의약품정보서비스 (15063908) — 동일성분 정본에서 제외(정정).**
  포털 상세기능 실필드 확인 결과 이 API 는 **제조 수탁/위탁 관계 조회** API 다:
  대표(수탁) 필드 `trustIndutyCode · trustItemName · trustMainingr · trustHiraMainingrCode · trustQntList · trustEntpName` +
  위탁 필드 `cnsgnItemSeq · cnsgnItemName · cnsgnEntpName`. "같은 성분의 모든 제품"이 아니라 위수탁으로 묶인 품목이다.
  (`202106092` 단독 조회가 `totalCount=0` 였던 것은 미리보기 샘플의 `trust*` 값들이 함께 전송돼 조건 충돌한 것으로 보임.)
  → **동일성분 제품군 정본으로 사용하지 않는다. 필요 시 제조/위탁 관계 보조정보로만.**

- **동일성분 체인 재설계 (HIRA 주성분코드 축):** 주성분코드(9자리)는 성분+함량+투여경로+제형을 반영하는 코드라
  문자열 성분명 매칭보다 동일성분 비교 기준으로 안정적이다. 목표 체인:
  ```
  상품명 → 식약처 제품허가정보(품목기준코드·성분명·EDI_CODE)
        → HIRA 약가기준정보조회서비스(주성분코드/일반명코드 확보)
        → HIRA 의약품성분약효정보조회서비스(15021027: 성분·함량·제형·투여경로)
        → 같은 주성분코드 기준 제품군 조회 → 병동 로컬 Excel 매칭
  ```
- **다음 조사(HIRA 라이브 probe):** HIRA `약가기준정보조회서비스` · `의약품성분약효정보조회서비스(15021027)` 의 실제 요청주소·요청변수·
  응답 필드를 라이브 probe(포털 미리보기 또는 `scripts/dev/probe-public-drug-api.mjs`)로 확정 →
  `상품명 → 제품코드/EDI → 주성분코드 → 동일성분 제품군` 체인 실측 확정. 이 결과로 health.kr 제거를 예비→확정 승격.

### HIRA API 조사 (2026-09-17, 문서/부분 실측)

- **의약품성분약효정보조회서비스 (15021027) — 필드 확인(포털 명세).** 오퍼레이션 `주성분명칭코드목록조회`.
  요청변수: `gnlNmCd`(일반명코드) · `gnlNm`(일반명) · `meftDivNo`(약효분류번호) · `divNm`(분류명) · numOfRows · pageNo.
  응답: `gnlNmCd · gnlNm · meftDivNo · divNm · fomnTpNm`(제형구분명) · `injcPthNm`(투여경로명) · `iqtyTxt`(함량내용) · `unit`.
  → **성분(일반명)·함량·제형·투여경로·약효분류를 준다. 단, 제품 목록은 반환하지 않는다(성분/일반명 단위 설명).**
  → 조회 키가 `gnlNmCd`(일반명코드) 이므로, 먼저 제품 → 일반명코드 매핑이 필요하다.
- **약가기준정보조회서비스 (15054445) — 라이브 probe 필요(포털이 명세 미노출).** 건강보험 의약품 마스터.
  확인 목표: 제품코드/EDI/제품명으로 조회 가능한지, 응답에 `일반명코드(gnlNmCd)`·주성분코드·급여상한금액·제품 목록이 있는지.
  이 API 가 제품↔일반명코드 매핑 + 동일 일반명코드 제품군을 준다면 체인의 중심이 된다.
- **동일성분 제품군 열거 = 아직 미확정.** 15021027 은 열거하지 않는다. 열거는 ① 15054445 가 일반명코드로 제품목록을 주는지(probe),
  또는 ② HIRA 약가마스터 파일(15067461 의약품주성분 · 15067462 의약품표준코드)로 제품↔주성분코드 전체표를 O4O DB 에 적재해 로컬 조회.
- **선행 검토(중요):** O4O 는 이미 `product_drug_extensions`(주성분·`insurance_code`·`mfds_code`·`atc_code`·`active_ingredients`) +
  약가마스터/표준상품 seed 자산을 보유한다. **동일성분 제품군 조회를 외부 API 체인 대신 O4O 자체 DB 로 완결할 수 있는지 먼저 확인**하면
  라이브 API 의존(쿼리당 외부호출·rate limit)을 줄일 수 있다. 공공 API 는 갱신/보강용으로 두는 구조가 후보. — 사용자 판단 대기.
