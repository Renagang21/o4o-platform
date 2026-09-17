# WO-O4O-HOSPITAL-DRUG-LOCAL-AUTOMATION-PILOT-V1

> **성격**: O4O 공통 자동화 Core 를 이용한 **첫 업무 전용 진입 화면 Pilot**. 별도 서비스 엔진을 만들지 않는다 — 기존 Unified Composer · Local Agent · Local SQLite · Browser Automation · Workflow · Attachment · Safety 구조를 **재사용**한다.
> **핸드오프 전용** — 명시 지시 전에는 실행하지 않는다.
> **선행**: [`WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1`](WO-O4O-WEB-AUTOMATION-USER-GUIDED-RESUME-AND-WORKFLOW-CANDIDATE-REPLAY-V1.md) 가 "다음 WO" 로 미뤄둔 **PHASE 3~5**(범용 Local Data Source · 약학정보원 실 Workflow · 병원 Local Data 결합)를 실제 병동 파일럿으로 구현한다. PHASE 1(same-run resume)은 코드·CI·배포 완료, 실 web smoke 는 그 WO 의 게이트로 별도 진행.
> **상위 정본**: [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md) — 사용자 행동은 학습 자료 · 완전 자동화가 아닌 시간 절감 · **사이트별 업무 사전 정의 금지** · deterministic first.

---

## 1. 목적

요양병원 **병동 PC** 에서 누구나 별도 회원가입·로그인 없이, **원내 약품 자료 + 약학정보원**을 이용해 약품 관련 업무를 빠르게 확인하게 한다.

- 사용자 화면명: **`원내 약품 안내`**
- Canonical URL: **`https://neture.co.kr/hospital-drug`**

이 화면은 별도 O4O 서비스가 아니라 **O4O 자동화 Core 의 업무 전용 Profile/Entry** 다. `hospital-drug` 전용 automation engine 을 만들지 않는다.

## 2. 확정된 운영 방식

**약국** — 병동에 최신 원내 약품 Excel 파일만 전달한다. 병동 사용자 계정·권한·tenant 를 관리하지 않는다.

**병동** — 병동 PC 에서:
1. Excel 파일을 지정 위치에 저장
2. 최초 1회 O4O 에서 해당 파일 선택/연결
3. Local SQLite 에 필요한 데이터 import
4. 바탕화면 `원내 약품 안내` 아이콘 사용

이후 자료 변경 시: 약국이 새 Excel 전달 → 병동이 **기존 파일에 덮어쓰기** → O4O 가 변경 감지 → 재검증 → Local SQLite 갱신.

**일반 병동 사용자** = O4O 회원가입 없음 · 로그인 없음 · 개인 사용자 식별 없음 · 병동 PC 를 쓸 수 있으면 사용 가능.

## 3. 제품 구조

```text
O4O Automation Core
├─ Unified Composer / Attachment
├─ Browser Automation (Work Agent · DOM)
├─ Local Agent
├─ Local SQLite
├─ Workflow Replay
└─ Safety
        ↓
   hospital-drug Profile   ← 이번 WO 가 추가하는 유일한 상위 조립층
        ↓
     원내 약품 안내
```

전용 엔진 신설 금지. 이미 있는 기능은 재사용한다.

## 4. PHASE 0 — 구현 전 필수 조사 (유일한 큰 기술 점검)

코드 변경 전 최신 origin/main 에서 다음을 확인한다.

**핵심 질문**: 현재 Local Agent/device 구조는 **로그인한 O4O 사용자**에 묶여 있다(`local_agent_devices` 는 user 별 durable 앵커). 그러나 hospital-drug 사용자는 **무로그인**이다.

> 무로그인 `neture.co.kr/hospital-drug` 가 그 PC 에 설치된 Local Agent 및 Local SQLite 를 사용할 수 있는 **가장 단순하고 안전한 방법**은 무엇인가?

비교 대상(예):
- **A**. 기존 Local Agent 가 그 PC 에 최초 1회 설치/등록된 뒤, 브라우저 page 가 loopback/local bridge 로 직접 사용.
- **B**. PC 단위 anonymous/local session(사람 인증 대신 **PC-local context**).
- **C**. device pairing 을 **설치 시점에만** 수행하고, 이후 사용 시 사람 로그인은 요구하지 않음.
- **D**. 현재 코드 구조를 가장 적게 바꾸는 방법.

**제약(우회 금지)**:
- 병동 사용자별 회원가입을 새로 만들지 않는다.
- 병동별 cloud tenant 를 만들지 않는다.
- Excel 을 cloud DB 로 올려 우회하지 않는다.
- 사람 인증 문제를 풀기 위해 제품 구조를 복잡하게 만들지 않는다.

작은 변경으로 불가능하면 **구현 전 STOP** 하고 원인 + 최소 대안을 보고한다. 가능하면 **별도 승인 대기 없이** 나머지 단계까지 진행한다.

> **권장 지향점**(조사가 허용하면): `병동 PC → Local Agent 설치/초기 연결 1회` 이후 `누구든 /hospital-drug 사용 → 현재 PC 의 Local Agent/SQLite 사용`. 즉 사람 인증 대신 **PC-local context**.

**Local File Binding 확인**(같은 PHASE 0 에서 함께 조사 — 실제 구현에서 가장 먼저 부딪힐 지점):

`/hospital-drug` 에서 사용자가 `[원내 약품 파일 연결]` 을 눌렀을 때, 단순 browser upload 로 끝내지 않고 **Local Agent 가 해당 Windows 파일을 지속적으로 식별·재접근할 수 있는 canonical 연결 방식**을 조사한다. 목표: `파일 선택 → Local Agent 가 local source 로 등록 → 이후 동일 경로 파일의 수정시각/크기 확인 → 변경 시 재import`.

일반 웹페이지의 `<input type=file>` 은 보안상 **실제 Windows 경로를 제공하지 않을 수 있다** — 그러면 "한 번 업로드" 는 되어도 "이후 같은 파일 덮어쓰기 → 변경 감지" 가 불가능하다. 따라서 브라우저가 실제 local path 를 주지 않는 경우, **Local Agent 측 native file picker 또는 기존 local bridge** 로 파일을 선택·바인딩하는 방식을 우선 검토한다. **파일 내용을 Cloud 를 경유시켜 해결하지 않는다.** 이 바인딩이 성립하지 않으면 §7 변경 감지 전체가 불가하므로 PHASE 0 STOP 판단 대상이다.

## 5. 화면 (`/hospital-drug`)

일반 Neture 홈을 그대로 보여주지 않는다. 매우 단순한 업무 화면으로 만든다.

```text
원내 약품 안내
원내에서 사용할 약품을 확인하세요.

┌────────────────────────────────────┐
│ 약품명이나 확인할 내용을 입력하세요 │ ↑
└────────────────────────────────────┘
예: 우루사정 200mg 원내에 있어? / 같은 성분 약 찾아줘 / 이 성분의 원내약이 있나?
```

최소 상태만 표시: `원내 약품 자료 ● 연결됨 · 2,418개 품목` 또는 `원내 약품 자료가 없습니다. [파일 연결]`. 일반 O4O 관리자 메뉴·복잡한 navigation 은 노출하지 않는다.

## 6. Excel Local Data Source

최초 사용 시(§4 Local File Binding 결과에 따른 canonical 흐름 — 일반 HTML `<input type=file>` 업로드로 만들지 않는다):

```text
[원내 약품 파일 연결]
→ Local Agent 가 로컬 파일 선택
→ local source 등록
→ 파일 식별정보/경로는 Local 에만 보관(Cloud 저장 X)
→ Excel 내용을 Local SQLite 로 import
```

**파일명 자체를 데이터 식별 기준으로 쓰지 않는다** — 논리적 소스 `hospital_drug_list` 로 등록. 지원: XLSX · XLS · (필요 시) CSV.

**컬럼**: 병원마다 Excel 구조가 다르므로 파일명/고정 column index 에 의존하지 않는다. 실제 파일의 가능한 컬럼을 확인해 매핑한다(예: 원내 코드 · 상품명 · 성분 · 함량 · 제형 · 제조사 · 과거 사용/주문 여부). **실제 Excel 에 없는 정보는 만들어내지 않는다.** 필요하면 최초 1회 column mapping UX 사용.

## 7. Excel 변경 감지

Excel = 원본, Local SQLite = 실행용 검색 데이터. 최소 메타 저장: `file path · modified time · file size · last imported time`.

업무/Local Agent 시작 시: **변경 없음 → 기존 SQLite 사용** / **변경 있음 → Excel 재읽기 → validation → staging → 정상일 때만 SQLite 교체**. import 실패 시 **기존 정상 SQLite 유지 + 갱신 실패 안내**. 초기에는 row-level incremental diff 를 만들지 않고 **전체 재import 로 충분한지 실측**한다.

## 8. 첫 자동화 Workflow — 약학정보원

사용자 실제 경로는 확인됨: `상품명 검색 → 결과에서 제품 선택 → 의약품 정보 → 동일성분 의약품`. 처음부터 사이트 전체를 AI 가 탐색하게 하지 않는다 — **DOM/accessibility 기반 deterministic path 우선**, 사이트 변경/불일치 시에만 Work Agent/AI self-healing 사용(상위 WO 의 replay 기준 계승).

> **주의(구현자 오해 방지)**: 이 deterministic path 는 상위 원칙의 **"사이트별 업무 사전 정의 금지" 와 충돌하지 않는다.** 운영자가 임의로 사이트 Workflow 를 미리 만든 것이 아니라, **실제 사용자가 이미 수행하는 업무 경로가 확인된 사례를 첫 검증 Workflow 로 구현**하는 것이기 때문이다(사용자 행동에서 학습한 Candidate 를 재검증형으로 재생 — 상위 WO PHASE 2 기준과 동일).

## 9. 첫 업무 범위 (V1)

```text
사용자 질문 → 상품 식별 → 약학정보원에서 성분/동일성분 확인
→ Local SQLite 에서 원내 약 검색 → 결과 결합 → 사용자에게 표시
```

예시 출력: `우루사정 200mg / 성분 Ursodeoxycholic Acid 200mg / 원내 동일성분 약 ○○정 200mg / 원내 코드 A1234 / 상태 원내 사용 중`. 실제 Excel 에 없는 정보는 **존재하는 정보만** 표시.

## 10. V1 Out of Scope

환자정보 · 처방정보 저장 · 병동 사용자 계정 · 병원 tenant · 병원별 cloud DB · 약국장 관리자 서비스 · 병동별 권한체계 · 공용 접근코드 · 중앙 Excel 업로드 · 처방 변경 확정 · 자동 주문 · 보험관리과 자동 전송 · **다른 성분의 임상적 대체 결정 자동화** · PC 프로그램 자동화. (다른 성분의 치료적 대체 후보는 후속 기능.)

## 11. 바탕화면 진입

`원내 약품 안내` 아이콘 클릭 → `https://neture.co.kr/hospital-drug` 열림. 브라우저 종속 강제 설치를 만들지 않는다 — Chrome/Edge 및 주요 Windows 브라우저에서 가장 간단한 shortcut/PWA 설치 방식을 조사해 화면에서 간단히 안내한다. 어떤 브라우저든 URL 직접 사용은 가능해야 한다. manifest/표시명 = `원내 약품 안내`.

## 12. 공통 O4O 와의 관계

다음은 가능한 한 **공통 기능**으로 구현한다(요양병원 코드 내부에 generic 복제 금지): Local file connection · Excel → Local SQLite · file change detection · local data lookup · simplified automation profile · desktop-entry pattern. 향후 재고 Excel · 가격표 · 상품 목록 · POS export · 공급처 자료 등에 재사용 가능해야 한다.

## 13. Safety / Privacy

- V1 은 **환자 개인정보를 다루지 않는다.**
- Excel · Local SQLite 원내 약품 자료는 **사용자 PC local-first** 유지. Cloud 에 Excel 원본 · Local SQLite raw rows · local file path · 환자정보를 **저장하지 않는다**(상위 WO 옵션 B 저장 경계 계승).
- 이미지/화면 답변은 §4-1 계승 — 파일/DB/장기 로그 저장 X.
- **never-escalate 영역**(조제보고 · 마약류 전송 · 심평원/공단/정부 제출 · 청구 · 결제 · 승인 확정 · 전자서명 · 외부 전송)은 자동 수행하지 않는다 — 항상 사용자 직접(TAKEOVER). 기존 O4O Safety/Risk 규칙 유지.

## 14. 검증 (최소 실제 검증)

1. `/hospital-drug` desktop 2. 무로그인 접근 3. Local Agent 연결 4. Excel 최초 선택 5. Excel import 6. Local SQLite 조회 7. 동일 파일 변경 없음 8. 새 Excel 로 덮어쓰기 9. 자동 변경 감지 10. 정상 reimport 11. 잘못된 Excel → 기존 SQLite 유지 12. 약학정보원 검색 13. 동일성분 조회 14. Local Data 결합 15. 병동용 AI 입력창 실 질의 16. 바탕화면/shortcut 진입.

실제 하지 못한 항목은 **PENDING**. 대상앱 조작은 **Agent 가** 수행한다(사람이 대신 조작하면 검증 무효).

## 15. Git / 실행 규칙

- 최신 origin/main 시작 · 다른 세션 WIP 불가침 · dedicated worktree 권장 · path-specific staging · `git add .` 금지 · `--force` push 금지 · `git stash` 금지.
- 기존 Unified Composer / Local Agent 를 불필요하게 재작성하지 않는다. 동일 기능이 이미 있으면 재사용.
- DB schema/migration 이 필요하면 중지 조건 — Local SQLite 신규 테이블·Cloud 최소 조정행 범위는 상위 WO 승인 경계를 따르고, 그 밖은 명시 승인 전 코드 0.
- PHASE 0 에서 구조적 차단이 없으면 중요하지 않은 중간 승인 없이 **구현 → 검증 → CHECK → commit → push** 까지 진행.

## 16. 완료 보고

A. PHASE 0 무로그인 Local Agent 조사 / B. `/hospital-drug` 구조 / C. Excel Local Data Source / D. Excel change·reimport / E. 약학정보원 Workflow / F. Local Data 결합 / G. AI 화면 / H. Desktop shortcut·PWA / I. Safety·Privacy / J. 실 smoke / K. PENDING / L. commit·CHECK. 보고는 한국어 존댓말, 미검증 PASS 금지, `문서 정합` 한 줄 포함.

```text
HOSPITAL_DRUG_ENTRY =
ANONYMOUS_WARD_USE =
LOCAL_AGENT_ACCESS =
EXCEL_LOCAL_SOURCE =
LOCAL_SQLITE_UPDATE =
PHARMACY_INFO_WORKFLOW =
DESKTOP_ENTRY =
PRODUCTION_SMOKE =
```
