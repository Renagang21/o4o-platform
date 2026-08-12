# IR-O4O-KPA-BRANCH-ANNUAL-REPORT-2026-TEMPLATE-FINALIZATION-V1

> **유형**: 조사 전용 (구현·DB write·migration 없음)
> **작성일**: 2026-08-12
> **선행**: [IR-O4O-PHARMACIST-BRANCH-SERVICE-RECOVERY-AND-REUSE-AUDIT-V1](IR-O4O-PHARMACIST-BRANCH-SERVICE-RECOVERY-AND-REUSE-AUDIT-V1.md) §5-1 · §8 · §10(3번 WO)
> **목적**: 대한약사회 2026 온라인 회원신고서 기준으로 O4O 분회 서비스 `AnnualReportTemplate 2026 V1` 필드를 확정한다.

---

## 0. 결론 요약

> **갱신 이력** — 1차 2026-08-12 (전 범위 조사) · **2차 2026-08-12 (STEP 01·02 확정 반영)**

| 항목 | 결과 |
|---|---|
| 필드맵 확정 여부 | **STEP 01·02 확정 / STEP 03·04 미확정** |
| **STEP 01** | ✅ **확정** — 동의 **2건**(수집·이용 + **제3자 제공**). 예약 슬롯 2건(고유식별정보·마케팅) **폐기** |
| **STEP 02** | ✅ **확정** — 신규 2(`report.year` **신고년도** · `personal.highestDegree` **최종학위**) · 주소 3단 확정 · 성명 열거 누락 1 |
| **STEP 03 / 04** | ❌ **미확정** — 화면 미확보(§2 B1·B2). **취득은 사람만 가능** |
| 총 필드 | **53개** (1차 51 + 신규 2) |
| 잔여 판단 사항 | **7건** — C1·C2·C3·C4·C7 + 신규 **C8**(필수/선택 구분) **C9**(성명 필드 성격) |
| 기존 O4O 대비 결함 | **9건** — 그중 **D7 해소**(상세주소 양식 근거 확보) |
| 스키마 방식 | 연도별 `schema: jsonb` 단일 컬럼. **필드를 코드에 고정하지 않는다** — §8 |
| **W1 착수 가능?** | ❌ **아직.** B1·B2 미해소 상태 seed 는 잘못된 양식을 `status='active'` 로 고정시킨다 |

---

## 1. 확보한 기준 자료 (실측)

| # | 자료 | 경로 | 판독 |
|---|---|---|---|
| S1 | **2026년도 약사 정기 회원신고 협조 요청 공문** (대약 제2025-1252호, 2025-12-22) | `~/Downloads/약사정기회원신고.pdf` | 전문 판독 |
| S2 | **2021년도 약사 회원 신고서(공통)** 종이 양식 | `~/Downloads/2021년도 약사회원 신고서_(공통).jpg` | **전 필드 판독** |
| S3 | 기존 O4O dead UI | [AnnualReportFormPage.tsx](services/web-kpa-society/src/pages/mypage/AnnualReportFormPage.tsx) (1,071줄) | 전문 판독 |
| S4 | 기존 O4O 타입 계약 | [pharmacist.ts](services/web-kpa-society/src/types/pharmacist.ts) §1–§400 | 전문 판독 |
| S5 | 회원 저장 구조 | [kpa-member.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-member.entity.ts) · [kpa-pharmacist-profile.entity.ts](apps/api-server/src/routes/kpa/entities/kpa-pharmacist-profile.entity.ts) · [branch-membership.entity.ts](apps/api-server/src/routes/kpa-branch/entities/branch-membership.entity.ts) | 컬럼 전량 |
| S6 | 과거 `reporting-yaksa` 설계 명세 | 선행 IR §5-1 | 전문 |

### S1 에서 확정된 운영 파라미터

| 항목 | 값 | Template 반영 |
|---|---|---|
| 신고 대상 | 기관 소속 **모든 약사** | — |
| 신고 기간 | **2026-01-01 ~ 2026-02-28** (2개월) | `period_start` / `period_end` |
| 온라인 창구 | `member.kpanet.or.kr` | 외부 (참조만) |
| 온라인 신고 **제외** 조건 | **2018~2025년도 미신고자는 온라인 불가 → 서면** | `requiresPaperFiling` 플래그 필요 — §7 R9 |
| 연회비 납부처 | **분회 또는 지부** | 회비 도메인(별도 WO) |
| 면허신고 연계 | `license.kpanet.or.kr` | Template 밖 |

> S1 첨부 3건(`2026년 약사회원정기신고 안내문` · **`회원신고서 양식 1부`** · `시도지부 및 분회 연락처`)은 **PDF 본문 2쪽에 포함되어 있지 않다.** 2026 양식 원본은 미확보다.

---

## 2. 차단 사항 — 이 IR 이 닫지 못한 것

> **2026-08-12 2차 갱신** — B3·B4 해소(구술 확정), B5 재확인. B1·B2 는 존치.

| # | 요구 작업 | 상태 | 근거 / 사유 |
|---|---|:---:|---|
| B1 | **2026 온라인 STEP 03 취업현황 화면** | ❌ **미확보** | 세션에 미도달. 취득 불가 사유 아래 |
| B2 | **2026 온라인 STEP 04 기타사항 화면** | ❌ **미확보** | 동상 |
| B3 | **2026 온라인 STEP 01 약관동의 항목** | ✅ **해소** | 사용자 구술 확정 (2026-08-12): **개인정보 수집·이용 동의 + 제3자 제공 동의 2건** → §5 STEP 01 반영 |
| B4 | **2026 온라인 STEP 02 인적사항 필드** | ✅ **해소** | 사용자 구술 확정: 신고년도 · 성별 · 생년월일 · 면허번호/취득년도 · 전화 · **주소 3단** · 이메일 · 지부/분회 · 한약조제자격 · 학력 · **최종학위** → §5 STEP 02 반영 |
| B5 | **`singoform2025.hwp`** | ❌ **미도달** | 파일 첨부가 세션에 들어오지 않았고, 디스크에도 없다. 2차 검색: `C:\Users\sohae` **depth 6** + `G:\` depth 4 전수 `*.hwp` — `singo`/`신고`/`2025`/`회원` 매칭 20건 모두 무관(협동조합·통신판매업·요양병원 등). `Downloads` 최신 파일은 2026-06-29 자로 신규 유입 없음 |
| B6 | 2026 양식 원본 (S1 첨부 2번) | ❌ 미확보 | S1 PDF 본문 2쪽에 미포함 |

**B1·B2 직접 취득 불가 사유:** `member.kpanet.or.kr` 은 대한약사회 회원 로그인이 필요한 외부 서비스다. CLAUDE.md 중지 조건 *"실제 계정·자격정보·외부 서비스 승인 필요"* 에 해당하여 접속을 시도하지 않았다. **화면 확보는 사람만 수행할 수 있다.**

**B3·B4 확정도 주의:** 구술 열거를 근거로 확정했으므로 **필드 존부·순서·라벨은 신뢰**하되, 아래 3가지는 화면 없이 판정 불가이며 §5 에 `구술-미상` 으로 표기했다.
- 각 항목의 **필수/선택** 여부
- **옵션 라벨 원문** (예: 최종학위 선택지 구성)
- 동의 항목의 **필수/선택 구분**과 고지문 본문

**남은 요청:** B1·B2 스크린샷 2장. 그것만 오면 §5 STEP 03·04 표와 §8 JSON `steps[2]`·`steps[3]` 이 확정되고 W1 이 착수 가능해진다.

**본 IR 의 기준선:** S2(2021 종이양식) 를 **필드 baseline** 으로 삼는다. 2021-04-08 면허신고제 시행 **이후** 판이며, 선행 IR 이 S3 를 "대한약사회 공식 양식 7개 절 전량 보유"로 판정한 바로 그 세대다. 2025 HWP 와의 차분은 통상 문구·회비구분 라벨 수준이나, **미검증 가정임을 명시한다.**

---

## 3. 2026 4-STEP 구조 매핑

사용자가 확인한 4단계에 S2 절을 배치한 결과다. STEP 03·04 내부 항목은 B1·B2 확정 전까지 **잠정**이다.

| STEP | 명칭 | 포함 절 (S2 기준) | 확정도 |
|:---:|---|---|:---:|
| 01 | 약관동의 | 개인정보 수집·이용 동의 / (제3자 제공 동의) / (고유식별정보 처리) | **B3 대기** |
| 02 | 인적사항 | 성명·성별·생년월일·면허·연락처·거주지·Email·학력·소속지부/분회·한약조제자격 | 높음 |
| 03 | 취업현황 | 활동/미활동 · 근무처 구분 · 근무처 정보 · **약국 현황(개설약사)** | **B1 대기** |
| 04 | 기타사항 | 연수교육 · 회비구분 · 우편물 수신처 · 서명·제출 | **B2 대기** |

> **주의 — 종이 양식과 온라인의 구조 차이:** S2 는 "취업현황" 안에 `○활동` / `○미활동` 을 **한 블록**으로 묶는다. 온라인 4-STEP 은 통상 활동 여부를 STEP 03 진입 시 분기시킨다. `약국 현황` 이 STEP 03 에 붙는지 STEP 04 로 가는지는 **B1 로만 확정된다.** §8 스키마는 `field.step` 을 필드 단위 속성으로 두어 이 배치 변경을 **스키마 변경 없이** 흡수한다.

---

## 4. 판정 축 정의

각 필드에 아래 3축을 독립적으로 부여한다. IR 요구 4번의 6개 판정을 **직교 2축(존속 × 소유권) + 1축(가시성)** 으로 정규화한 것이다.

**축 A — 존속 (`lineage`)**

| 값 | 의미 |
|---|---|
| `2026-keep` | 2026 유지 (S2 존재 + 2026 유지 예상) |
| `2025-only` | 2025/2021 에만 존재 — 2026 확정 시 재판정 |
| `o4o-only` | 기존 O4O 에만 존재 (양식 근거 없음) |
| `new` | 온라인화로 신설 필요 |

**축 B — 소유권 (`ownership`)** ← IR 원칙 *"회원정보에 이미 있는 값은 자동입력 우선"* / *"약사회 관리값은 회원 입력값으로 만들지 않는다"* 의 강제 지점

| 값 | 의미 | 쓰기 주체 |
|---|---|---|
| `auto` | 회원정보에서 **prefill**, 회원이 수정 가능 | 회원(수정 시) + sync |
| `member` | 회원 직접 입력 | 회원 |
| `association` | **약사회 관리값 — 회원 입력 금지 (readonly)** | 분회 운영자/시스템 |

**축 C — 가시성 (`visibleWhen`)** — 조건부 표시. §7 규칙 ID 로 참조.

---

## 5. 2026 전체 필드표

`auto` 필드의 `source` 는 S5 실측 컬럼이다. **`—` 는 현재 저장 구조에 컬럼이 없어 자동입력 불가**를 뜻한다.

### STEP 01 — 약관동의

**B3 해소 — 확정 2건.** 구술 확정 결과 STEP 01 은 아래 2개 동의로 구성된다.

| # | key | 라벨 | type | lineage | ownership | 필수 | source | 비고 |
|---:|---|---|---|:---:|:---:|:---:|---|---|
| 1 | `consent.privacy` | 개인정보의 수집·이용 동의 | consent | 2026-keep | member | **구술-미상** | — | S2 는 `예/아니오` 라디오. 온라인은 체크박스로 추정 |
| 2 | `consent.thirdParty` | 개인정보 **제3자 제공** 동의 | consent | **new** | member | **구술-미상** | — | **S2 종이양식에 없다 → 온라인 신설 확정** |

**폐기된 예약 슬롯 2건.** 1차 IR 이 예약했던 `consent.uniqueId`(고유식별정보) · `consent.marketing`(마케팅) 은 **구술 열거에 없어 제거**한다. 화면 확인 시 존재가 드러나면 재추가한다.

> **판정 근거 (1차 추정의 검증 결과):** S2 하단 주석은 *"개인정보의 수집·이용 등의 내용은 **후면**을 참고"* 라 적는다. 2021 종이양식에서 제3자 제공 고지는 **후면 고지문**으로 처리되고 앞면 체크는 `수집·이용` 1건뿐이었다. 1차 IR 은 온라인 전환 시 이 후면 고지가 개별 체크로 분리될 것으로 추정했고, **제3자 제공 1건에 대해 적중**했다. 다만 고유식별정보·마케팅까지 분리될 것이라는 추정은 **빗나갔다** — 실제는 2건이다.
>
> **미판정:** 두 동의의 **필수/선택 구분**과 고지문 본문은 화면 없이 알 수 없다. 신고 성립 요건이므로 W1 seed 전 확인이 필요하다. 제3자 제공은 통상 **선택** 동의이나, 회원신고 맥락(지부·분회 이관, 약사공론 배송)에서는 **필수**일 수 있어 추정하지 않는다.

### STEP 02 — 인적사항

**B4 해소.** 구술 확정된 11개 항목을 1차 IR 표에 대조한 결과 — **신규 2 · 확정 8 · 열거 누락 1**. 신규·변경 행은 **굵게** 표시했다.

| # | key | 라벨 | type | lineage | ownership | 필수 | source (S5 실측) |
|---:|---|---|---|:---:|:---:|:---:|---|
| **4a** | **`report.year`** | **신고년도** | **readonly_display** | **new** | **auto** | ✅ | **`annual_report_templates.year` (2026)** |
| 5 | `personal.name` | 성명 | text | 2026-keep | **auto** | ✅ | `users.name` |
| 6 | `personal.gender` | 성별 (남/여) | radio | 2026-keep | member | ✅ | **—** 컬럼 없음 |
| 7 | `personal.birthDate` | 생년월일 | date | 2026-keep | member | ✅ | **—** 컬럼 없음 |
| 8 | `personal.licenseNumber` | 면허번호 | license | 2026-keep | **auto** | ✅ | `kpa_members.license_number` ↔ `kpa_pharmacist_profiles.license_number` |
| 9 | `personal.licenseYear` | 면허 취득년도 | number | 2026-keep | member | ✅ | **—** 컬럼 없음 |
| 10 | `personal.phone` | 연락처 — 일반전화 | tel | 2026-keep | member | ❌ | **—** |
| 11 | `personal.mobile` | 연락처 — 휴대전화 | tel | 2026-keep | member | ✅ | **—** S2 필수 표기 |
| **12** | `personal.postalCode` | 거주지 **우편번호** | text | **new → 확정** | member | ✅ | **—** 주소검색 API 전제 |
| **13** | `personal.roadAddress` | 거주지 **도로명 주소** | address | 2026-keep | member | ✅ | **—** |
| **14** | `personal.detailAddress` | 거주지 **상세주소** | text | **o4o-only → 2026-keep** | member | ✅ | **—** 구술 "주소 3단" 으로 양식 근거 확보 (§6 D7 해소) |
| 15 | `personal.email` | Email | email | 2026-keep | **auto** | ✅ | `users.email` |
| 16 | `personal.university` | 학력 — 학부(대학교) | text | 2026-keep | **auto** | ❌ | `kpa_members.university_name` (약대생용 재사용 — §9 C2) |
| 17 | `personal.graduationYear` | 학력 — 졸업년도 | number | 2026-keep | member | ❌ | **—** |
| 18 | `personal.branch` | 소속 **지부** | readonly_display | 2026-keep | **association** | ✅ | `branch_memberships`(active) → `kpa_organizations.parent_id` |
| 19 | `personal.division` | 소속 **분회** | readonly_display | 2026-keep | **association** | ✅ | `branch_memberships`(active) → `kpa_organizations` |
| 20 | `personal.hasKoreanMedicineLicense` | 한약조제자격 (유/무) | radio | 2026-keep | member | ✅ | **—** |
| **20a** | **`personal.highestDegree`** | **최종학위** | **select** | **new** | member | **구술-미상** | **—** 옵션 라벨 미상 (학사/석사/박사 추정, 확정 아님) |

> **최종학위 — C6 확정.** S2 는 `학부 (___)대학교 (졸업년도 ___)` **1행만** 두며 석·박사 칸이 없다. 1차 IR 은 `personal.highestDegree` 를 **기본 비활성 슬롯**으로 예약해 뒀는데, 구술 확정으로 **2026 온라인에 실재함이 확인**되어 활성 필드로 승격한다. **옵션 구성(학사/석사/박사 여부, 수료·재학 상태 포함 여부)은 화면 없이 확정 불가**다.
>
> **열거 누락 1건 — `personal.name`(성명).** 구술 목록에 성명이 없다. 온라인 신고는 로그인 상태에서 진행되므로 **성명이 입력 필드가 아니라 상단 고정 표시**일 가능성이 높다. 그렇다면 `ownership='auto'` 는 유지하되 `readonly=true` 로 바뀐다. **추정이며 화면으로 확인해야 한다.**
>
> **`report.year`(신고년도) 신규 발견.** 1차 IR §5 표에 없던 필드다. `annual_reports.year` 와 `annual_report_templates.year` 에 이미 대응 컬럼이 있어 **스키마 영향은 없고**, Template `fields[]` 에 `readonly_display` 로 1행 추가하면 된다. 회원이 연도를 고르는 것이 아니라 **활성 Template 이 연도를 정한다** — `ownership='auto'`.

### STEP 03 — 취업현황

**3-1. 활동 구분** (단일 선택 — S2 는 근무처 구분 전체가 상호배타)

| # | key | 라벨 | type | lineage | ownership | 필수 | source |
|---:|---|---|---|:---:|:---:|:---:|---|
| 21 | `employment.activityStatus` | 활동 / 미활동 | radio | 2026-keep | member | ✅ | — |
| 22 | `employment.activityType` | 근무처 구분 (11종) | select | 2026-keep | **auto** | ✅ | `kpa_members.activity_type` |

`employment.activityType` 옵션 — **S2 원문 기준 11종**:

| value | 라벨 (S2 원문) | 세부 필드 |
|---|---|---|
| `pharmacy_owner` | 약국 — 개설약사 | → R1 약국현황 |
| `pharmacy_employee` | 약국 — 근무약사 | — |
| `hospital` | 의료기관 | → R3 |
| `manufacturer` | 의약품·의약외품 제조회사 **(위탁제조판매업 포함)** | → R4 |
| `importer` | 의약품 수입회사 | → R4 |
| `wholesaler` | 의약품 도매회사 | → R4 |
| `other_industry` | 의약품산업 외 기업체 | — |
| `government` | (준)정부·공공기관 | — |
| `school` | 학교 | — |
| `other` | 기타 ( ) | → R5 자유입력 |
| `inactive` | 미활동 | → R2 |

**3-2. 업종별 세부역할** — IR 확인 요청 항목. **기존 O4O 의 최대 결손 지점이다.**

| # | key | 라벨 | 옵션 (S2 원문) | lineage | ownership | 가시성 |
|---:|---|---|---|:---:|:---:|:---:|
| 23 | `employment.hospitalType` | 의료기관 종별 | 종합병원 / 병원 / 의원 / 요양병원 / 한방의료기관 / **치과의료기관** / **보건소 등 지역보건의료기관** — **7종** | 2026-keep | member | R3 |
| 24 | `employment.hospitalTask` | 업무 구분 | 조제업무 / 비조제업무 | 2026-keep | member | R3 |
| 25 | `employment.manufacturerRole` | 제조회사 역할 | 경영자 / **제조관리자·안전관리책임자** / 그 외 | 2026-keep | member | R4-a |
| 26 | `employment.importerRole` | 수입회사 역할 | 경영자 / **수입관리자** / 그 외 | 2026-keep | member | R4-b |
| 27 | `employment.wholesalerRole` | 도매회사 역할 | 경영자 / **도매업무관리자** / 그 외 | 2026-keep | member | R4-c |
| 28 | `employment.otherDescription` | 기타 — 직접입력 | (자유) | 2026-keep | member | R5 |

> **설계 판정 — `CompanyRole` 단일 enum 을 쓰지 않는다.** S4 는 `CompanyRole = owner|manager|staff` **1개**로 3개 업종을 접었다. 그러나 S2 의 중간 항목 라벨은 업종마다 **법적으로 다른 직책**이다(제조관리자·안전관리책임자 ≠ 수입관리자 ≠ 도매업무관리자 — 약사법상 별개 선임직). 단일 enum 으로 접으면 **신고 원문이 소실**된다. 필드를 업종별로 3개 분리한다.
> `employment.hospitalTask` 의 S2 위치는 `치과의료기관 / 보건소 등` 행 끝의 `(□조제업무, □비조제업무)` 다. 즉 **보건소 등 지역보건의료기관에 붙는 하위 선택**으로 읽히나, 종합병원~한방까지 포괄하는 의료기관 공통 축으로도 읽힌다. **B1 로 확정 필요** — 잠정으로 의료기관 공통(R3)에 둔다.

**3-3. 근무처 정보**

| # | key | 라벨 | type | lineage | ownership | 필수 | source |
|---:|---|---|---|:---:|:---:|:---:|---|
| 29 | `employment.workplaceName` | 근무처 명칭 | text | 2026-keep | **auto** | ✅(R8) | `kpa_members.pharmacy_name` (개설/근무약사 한정) |
| 30 | `employment.workplacePostalCode` | 근무처 우편번호 | text | new | member | ❌ | — |
| 31 | `employment.workplaceRoadAddress` | 근무처 주소 (도로명) | address | 2026-keep | **auto** | ✅(R8) | `kpa_members.pharmacy_address` |
| 32 | `employment.workplaceDetailAddress` | 근무처 상세주소 | text | o4o-only | member | ❌ | — |
| 33 | `employment.workplacePhone` | 근무처 전화번호 | tel | 2026-keep | member | ❌ | — |

**3-4. 약국 현황 (개설약사에 한함)** — 가시성 R1

| # | key | 라벨 | type | lineage | ownership | 필수 |
|---:|---|---|---|:---:|:---:|:---:|
| 34 | `pharmacy.businessNumber` | 사업자번호 | text(digits 10) | 2026-keep | member | ✅ |
| 35 | `pharmacy.medicalInstitutionCode` | 요양기관기호 | text | 2026-keep | member | ✅ |
| 36 | `pharmacy.handlesKoreanMedicine` | 한약(첩약) 취급 / 취급안함 | radio | 2026-keep | member | ✅ |
| 37 | `pharmacy.handlesAnimalMedicine` | 동물약품 취급 / 취급안함 | radio | 2026-keep | member | ✅ |
| 38 | `pharmacy.separationArea` | 의약분업 지역구분 (분업지역 / 분업예외지역) | radio | 2026-keep | member | ✅ |

**3-5. 미활동 사유** — 가시성 R2. **복수 선택** (S2 체크박스)

| # | key | 라벨 | lineage | ownership |
|---:|---|---|:---:|:---:|
| 39 | `inactive.reasons` | 미활동 사유 (multiselect) | 2026-keep | member |

옵션 — S2 는 **2개 층위**로 구분한다. 이 층위를 보존한다:

| 층위 | value | 라벨 |
|---|---|---|
| **6개월 이상 조제업무 미종사** | `closed_business` | 휴·폐업 |
| ″ | `job_seeking` | 취업준비 |
| ″ | `overseas` | 해외체류 |
| ″ | `leave` | 휴직 |
| ″ | `parenting` | 출산·육아 |
| (독립) | `retired` | 65세 이상 미취업 |
| (독립) | `military` | 군 복무 |
| (독립) | `overseas_resident` | 해외거주자 |
| (독립) | `graduate_student` | 대학원 재학생 |

### STEP 04 — 기타사항

| # | key | 라벨 | type | lineage | ownership | 필수 | 비고 |
|---:|---|---|---|:---:|:---:|:---:|---|
| 40 | `training.completedCredits` | 연수교육 이수 평점 | readonly_display | 2026-keep | **association** | — | S2 **"(약사회에서 작성)"** 명시 |
| 41 | `training.requiredCredits` | 이수의무 평점 | readonly_display | 2026-keep | **association** | — | ″ |
| 42 | `training.creditYear` | 이수 연도 | readonly_display | 2026-keep | **association** | — | ″ |
| 43 | `training.exemptionCertificate` | 연수교육 면제·유예 확인서 | file | 2026-keep | member | ❌ | R7. S2: *"확인서가 있는 경우 제출"* |
| 44 | `fee.category` | 회비구분 (갑/을/병/정) | readonly_display | 2026-keep | **association** | — | S2 **"(약사회에서 작성)"** 명시 |
| 45 | `fee.exemptionType` | 정 — 미취업자 / 회비면제자 | readonly_display | 2026-keep | **association** | — | ″ |
| 46 | `mailing.newsletter` | 약사공론 수신처 (근무지/거주지/수취거부) | radio | 2026-keep | member | ✅ | |
| 47 | `mailing.newsletterRefuseReason` | 약사공론 수취거부 사유 | text | 2026-keep | member | ✅(R6) | |
| 48 | `mailing.otherMail` | 기타 우편물 수신처 | radio | 2026-keep | member | ✅ | S2: *"면허신고서 안내문·선거 등 중요 우편물"* |
| 49 | `mailing.otherMailRefuseReason` | 기타 우편물 수취거부 사유 | text | 2026-keep | member | ✅(R6) | |
| 50 | `submission.signature` | 약사 서명 (인/서명) | signature | 2026-keep | member | ✅ | **§6 D8 — 기존 O4O 는 표시만 하고 데이터 없음** |
| 51 | `submission.declaredAt` | 제출 년·월·일 | date | 2026-keep | **auto** | ✅ | 서버 시각 |

> **회비구분 판정:** S2 는 `1.갑 2.을 3.병 4.정` **4분류**다. S4 는 `PharmacistFeeCategory` **7분류**(A1/A2/B1/B2/C1/C2/D)를 2025 연회비 체계 기준으로 갖고 있고 `FEE_CATEGORY_GROUPS` 로 4분류에 매핑한다. **신고서 Template 은 4분류 표시만** 담고, 7분류·금액은 회비 도메인(`branch_fee_policies`, 별도 WO)에 둔다. 신고서에 금액을 넣지 않는다.

---

## 6. 기존 O4O 와의 차이 — 결함 9건

`AnnualReportFormPage.tsx` 는 **라우팅되지 않은 dead UI** 다 (`mypage/index.ts:8` 에서 export 만, `App.tsx`·`AdminRoutes.tsx` 어디에도 `<Route>` 없음). 선행 IR 판정("REFERENCE — 최고가치 참고자료")은 유지하되, **그대로 복원하면 안 되는 근거**가 아래다.

| # | 결함 | 위치 | 영향 |
|:---:|---|---|---|
| **D1** | **의료기관 종별 5종만** — `치과의료기관`·`보건소 등 지역보건의료기관` **누락** | [pharmacist.ts:151-156](services/web-kpa-society/src/types/pharmacist.ts#L151-L156) | 신고 불가 직역 발생 |
| **D2** | **`hospitalType` UI 전무** — 타입에만 존재, 화면에 라디오 없음 | [AnnualReportFormPage.tsx:397-407](services/web-kpa-society/src/pages/mypage/AnnualReportFormPage.tsx#L397-L407) | 의료기관 선택 시 종별 입력 불가 |
| **D3** | **`hospitalTask`(조제/비조제) UI 전무** | 동상 | 동상 |
| **D4** | **`companyRole` UI 전무 + 업종별 라벨 소실** (§5 3-2) | [pharmacist.ts:168-171](services/web-kpa-society/src/types/pharmacist.ts#L168-L171) | 제조·수입·도매 세부역할 신고 불가 |
| **D5** | **미활동 체크박스가 상태에 미연결** — `<input type="checkbox" />` 에 `checked`/`onChange` 없음. `formData.inactive` 로 **아무것도 기록되지 않는다** | [AnnualReportFormPage.tsx:622-632](services/web-kpa-society/src/pages/mypage/AnnualReportFormPage.tsx#L622-L632) | 미활동 사유 전량 유실 |
| **D6** | **`기타( )` 자유입력 부재** — `activityType='other'` 선택 시 내용 기재 불가 | 라인 460-467 | 신고 내용 소실 |
| **D7** | **`detailAddress` UI 전무** — 타입만 존재 | [pharmacist.ts:213](services/web-kpa-society/src/types/pharmacist.ts#L213) | 주소 단절 |
| **D8** | **서명·제출일이 데이터가 아님** — 화면에 텍스트로만 렌더 | 라인 776-784 | 법적 제출 요건(`약사법` 제7조·제11조) 미충족 |
| **D9** | **하드코딩 3건** — 연수교육 평점 `8`/`6` 리터럴, 회비구분 정적 텍스트, 지부·분회 `'청명지부'`/`'강남분회'` `readOnly` | 라인 123-124, 644-647, 683 | 전 회원 동일값 표시. **§4 축 B 의 `association` 필드가 전부 가짜다** |

**기존 O4O 에만 있고 양식 근거가 없는 것 (채택하지 않음):**

| 항목 | 위치 | 판정 |
|---|---|---|
| `InactiveInfo.startDate` / `expectedEndDate` | [pharmacist.ts:252-253](services/web-kpa-society/src/types/pharmacist.ts#L252-L253) | **DROP** — S2 에 없음. 대한약사회 양식 재설계 금지 원칙 |
| `AnnualFeeBreakdown` 11항목 | [pharmacist.ts:75-88](services/web-kpa-society/src/types/pharmacist.ts#L75-L88) | **회비 도메인으로 이관** — 신고서 Template 아님 |
| `AnnualReportStatus` / `submittedAt` / `approvedAt` | [pharmacist.ts:309-325](services/web-kpa-society/src/types/pharmacist.ts#L309-L325) | **유지하되 `annual_reports` 레코드 컬럼** — Template 필드 아님 |
| `PharmacistFunction`(4종, `@deprecated`) | [pharmacist.ts:17-21](services/web-kpa-society/src/types/pharmacist.ts#L17-L21) | **DROP** |

---

## 7. 조건부 표시 규칙

| ID | 조건 | 결과 |
|---|---|---|
| **R1** | `employment.activityType == 'pharmacy_owner'` | `pharmacy.*` 5필드 표시 + 필수 |
| **R2** | `employment.activityType == 'inactive'` | `inactive.reasons` 표시·필수 / **`employment.workplace*` 숨김·필수해제** |
| **R3** | `employment.activityType == 'hospital'` | `hospitalType`(7) + `hospitalTask`(2) 표시·필수 |
| **R4-a/b/c** | `activityType ∈ {manufacturer / importer / wholesaler}` | 해당 업종의 `*Role` **1개만** 표시·필수 |
| **R5** | `employment.activityType == 'other'` | `employment.otherDescription` 표시·필수 |
| **R6** | `mailing.newsletter == 'refuse'` 또는 `mailing.otherMail == 'refuse'` | 대응 `*RefuseReason` 표시·필수 |
| **R7** | `training.exemptionCertificate` 업로드 시 | `training.*` readonly 값 옆에 면제 배지 표시 |
| **R8** | `employment.activityType != 'inactive'` | `workplaceName` · `workplaceRoadAddress` 필수 |
| **R9** | 최근 신고 이력이 **2018~2025 전무** | **온라인 신고 불가 안내 + 서면 경로 표시** (S1 근거) |

> **R2 의 함정:** S2 는 미활동과 근무처 구분을 상호배타로 두지만, `65세 이상 미취업`·`대학원 재학생` 은 **근무처를 갖는 경우가 실제로 존재**한다. S2 종이양식은 이 모순을 해결하지 않는다. **B1 확정 전까지 상호배타로 두고, 온라인 화면이 병존을 허용하면 R2 를 완화**한다.

---

## 8. `AnnualReportTemplate 2026 V1` 스키마

### 8-1. 설계 원칙

IR 원칙 *"연도별 변경을 위해 필드를 코드에 고정하지 않는다"* 를 다음으로 강제한다.

1. **필드 정의는 전량 `annual_report_templates.schema` (jsonb) 안에만 존재**한다. TypeScript enum·union 으로 필드 key/옵션을 선언하지 않는다 (S4 의 `ActivityType`·`InactiveReason` 같은 하드 union 을 **재도입하지 않는다**).
2. 코드가 아는 것은 **필드 `type` 렌더러 목록**뿐이다. 필드가 늘어도 코드는 불변이다.
3. 선행 IR §5-1 의 `ReportFieldDefinition` 을 계승하되 **3개 속성을 추가**한다 — `step`(§3 4-STEP), `ownership`(§4 축 B), `lineage`(§4 축 A, 감사용).
4. `ReportAssignment`(다단계 배정)는 채택하지 않는다 (선행 IR §5-1 권고).

### 8-2. 테이블 (제안 — 구현은 후속 WO)

```
annual_report_templates
  id            uuid pk
  service_key   varchar(50)      -- 'kpa-branch'
  year          int
  version       int              -- 연내 개정
  title         varchar(200)     -- '2026년도 약사 회원 신고서'
  status        varchar(20)      -- draft | active | archived
  period_start  date             -- 2026-01-01   (S1)
  period_end    date             -- 2026-02-28   (S1)
  schema        jsonb            -- 8-3
  created_at / updated_at
  UNIQUE (service_key, year, version)
  -- status='active' 는 (service_key, year) 당 1개 (부분 UNIQUE)

annual_reports
  id             uuid pk
  template_id    uuid fk
  user_id        uuid             -- Identity 축
  organization_id uuid            -- 분회 (branch_memberships active 기준)
  year           int
  status         varchar(20)      -- draft|submitted|revision_requested|approved|rejected
  values         jsonb            -- { "<field.key>": <value> } — flat key 맵
  submitted_at / approved_at / rejected_at / rejected_reason / revision_reason
  synced_to_membership  bool
  synced_changes jsonb            -- { "<syncTarget>": {from, to} }
  created_at / updated_at
  UNIQUE (user_id, year)
```

> **Boundary Policy(§7) 준수:** `annual_reports` 는 Store Ops 성격이므로 **Primary Boundary = `organizationId`**. 조회는 `(organization_id, year)` 복합 조건 필수, UUID 단독 조회 금지.

### 8-3. `schema` JSON 구조

```jsonc
{
  "templateVersion": "2026.1",
  "steps": [
    { "key": "consent",    "order": 1, "title": "약관동의" },
    { "key": "personal",   "order": 2, "title": "인적사항" },
    { "key": "employment", "order": 3, "title": "취업현황" },
    { "key": "etc",        "order": 4, "title": "기타사항" }
  ],
  "fields": [ /* FieldDef[] — §5 표 51개 */ ],
  "rules": [ /* VisibilityRule[] — §7 R1~R9 */ ]
}
```

**`FieldDef`**

```jsonc
{
  "key": "employment.hospitalType",       // flat dot-key. annual_reports.values 의 키
  "label": "의료기관 종별",
  "type": "radio",                         // text|textarea|number|date|tel|email|
                                           // radio|checkbox|multiselect|select|
                                           // address|license|file|signature|
                                           // consent|readonly_display
  "step": "employment",                    // §3 — STEP 재배치를 스키마 변경 없이 흡수
  "group": "업종별 세부역할",
  "order": 23,

  "ownership": "member",                   // auto | member | association   ← §4 축 B
  "lineage":   "2026-keep",                // 2026-keep | 2025-only | o4o-only | new
  "required":  true,
  "readonly":  false,                      // ownership='association' 이면 항상 true

  "source": null,                          // ownership='auto' 일 때만:
                                           // { "entity": "kpa_members", "column": "activity_type" }

  "options": [
    { "value": "general",           "label": "종합병원" },
    { "value": "hospital",          "label": "병원" },
    { "value": "clinic",            "label": "의원" },
    { "value": "nursing_hospital",  "label": "요양병원" },
    { "value": "korean_medicine",   "label": "한방의료기관" },
    { "value": "dental",            "label": "치과의료기관" },
    { "value": "public_health",     "label": "보건소 등 지역보건의료기관" }
  ],

  "validation": { "pattern": null, "maxLength": null, "message": null },
  "visibleWhen": { "rule": "R3" },         // §7. null 이면 항상 표시

  "syncToMembership": false,               // 제출 시 회원정보 갱신 여부
  "syncTarget": null,                      // "kpa_members.activity_type"
  "hint": null
}
```

**`ownership` 이 강제하는 불변식 — 구현 WO 의 검증 대상**

| ownership | 서버 write 규칙 |
|---|---|
| `association` | **제출 payload 에 이 key 가 오면 무시**한다. 값은 서버가 원장에서 주입 (연수교육 → `education_credit_ledger`, 회비 → `branch_fee_policies`). 회원이 조작할 수 없다 |
| `auto` | prefill 만. 회원이 수정하면 `syncToMembership=true` 인 경우 `synced_changes` 에 `{from,to}` 기록 후 회원정보 반영 |
| `member` | 회원 입력 그대로 저장 |

**`syncToMembership=true` 대상 (S5 컬럼 실재 확인 완료)**

| field.key | syncTarget |
|---|---|
| `personal.licenseNumber` | `kpa_members.license_number` |
| `employment.activityType` | `kpa_members.activity_type` |
| `employment.workplaceName` | `kpa_members.pharmacy_name` |
| `employment.workplaceRoadAddress` | `kpa_members.pharmacy_address` |
| `personal.university` | `kpa_members.university_name` |

> 나머지 `member` 필드(성별·생년월일·취득년도·연락처·거주지·졸업년도·한약조제자격)는 **`kpa_members` 에 대응 컬럼이 없다.** 신고서 `values` jsonb 안에만 존재한다. 컬럼 신설은 F10/F11(Core Freeze — `users`·`service_memberships`·`role_assignments` 3테이블 고정) 및 `kpa_members` 변경 판단이 걸리므로 **본 IR 에서 제안하지 않는다.** 후속 WO 에서 "jsonb 유지" vs "분회 전용 프로필 테이블 신설"을 별도 판정한다.

---

## 9. 미해결 판단 사항 (구현 착수 전 결정 필요)

| # | 쟁점 | 선택지 | 권고 |
|:---:|---|---|---|
| C1 | `member` 필드 중 회원정보 컬럼이 없는 7개의 영속 위치 | ① `values` jsonb 만 ② 분회 전용 프로필 테이블 신설 | **①로 시작.** 신고서는 연도 스냅샷이 본질. 조회 요구가 생기면 ②로 승격 |
| C2 | `kpa_members.university_name` 은 **약대생 재학 대학명** 주석 | ① 재사용 ② 신고서 전용 분리 | **②.** 의미 충돌. `auto` 에서 내리고 `member` 로 전환 검토 |
| C3 | `hospitalTask` 의 소속 축 (의료기관 공통 vs 보건소 전용) | — | ⏳ **B1 로만 확정 가능** |
| C4 | R2 상호배타 완화 여부 (65세 이상 미취업 + 근무처 병존) | — | ⏳ **B1 로만 확정 가능** |
| ~~C5~~ | ~~제3자 제공 동의 존부~~ | — | ✅ **확정 — 존재한다** (B3 해소, §5 STEP 01) |
| ~~C6~~ | ~~최종학위 필드 신설 여부~~ | — | ✅ **확정 — 신설한다** (B4 해소, §5 #20a) |
| C7 | 파일 업로드(면제확인서) 저장소 | — | 기존 미디어 파이프라인 재사용 판단 필요 |
| **C8** | **동의 2건·최종학위·기타 STEP 02 항목의 필수/선택 구분** | — | ⏳ **화면으로만 확정 가능.** 신고 성립 요건이라 추정 금지 |
| **C9** | **`personal.name` 이 입력 필드인가 고정 표시인가** | ① 입력 ② readonly 표시 | ⏳ **②로 추정.** B1·B2 확보 시 STEP 02 도 함께 재확인 권고 |

---

## 10. 구현 WO 제안

선행 IR §10 의 3번(`annual_report_templates` + `annual_reports` + 회원정보 sync)을 **3분할**한다. 원안은 template·report·sync 를 한 WO 에 묶었으나, sync 는 `kpa_members` write-path 를 건드려 위험도가 다르다.

| # | WO(안) | 범위 | 선행 | 규모 |
|:---:|---|---|---|:---:|
| **W1** | `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1` | `annual_report_templates` 테이블 + entity + **2026 seed (본 IR §5·§8)** + 운영자 조회 API. **회원 화면 없음** | **B1·B2 해소** (B3·B4 완료) | 소 |
| **W2** | `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-SUBMISSION-V1` | `annual_reports` + 제출/저장 API + **schema-driven 렌더러**(type 15종) + `ownership` 서버 강제(§8-3 불변식) + 회원 제출 화면 | W1 | 중 |
| **W3** | `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-MEMBERSHIP-SYNC-V1` | `syncToMembership` 5필드 → `kpa_members` 반영 + `synced_changes` 원장 | W2 | 소 |
| **W4** | `WO-O4O-KPA-BRANCH-ANNUAL-REPORT-REVIEW-V1` | 분회 운영자 검수·승인·반려 (`status` 전이). `ReportAssignment` 미채택 | W2 | 소 |
| **W0** | (정리) `AnnualReportFormPage.tsx` **제거** | dead UI. W2 가 schema-driven 으로 대체하므로 잔존 시 이중 진실 | W2 | 최소 |

**W1 착수 전제:** §2 의 **B1·B2 해소** (B3·B4 는 2차 갱신으로 완료). 미해소 상태로 seed 하면 **잘못된 양식이 `status='active'` 로 고정**되어 회원 신고 데이터가 오염된다.

> **부분 seed 는 하지 않는다.** STEP 01·02 만으로 Template 을 먼저 만들고 03·04 를 나중에 붙이는 방식은, `status='active'` 인 불완전 양식으로 회원이 제출할 수 있는 창을 열기 때문에 채택하지 않는다. W1 은 4개 STEP 이 모두 확정된 뒤 **한 번에** seed 한다.

**W2 검증 필수 항목 (CLAUDE.md §8):**
- `ownership='association'` 필드를 payload 에 넣어 제출 → **서버가 무시**하는지 실측 (권한 하드코딩 금지 원칙)
- Boundary: `(organization_id, year)` 복합 조건 없는 조회 경로 0건
- 브라우저 smoke — toast + API success/error 캡처 (콘솔 0 만으로 PASS 금지)

---

## 11. 문서 정합 (CLAUDE.md §16)

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

본 IR 이 참조한 기준 문서(선행 IR · CLAUDE.md §7 · §14 F10/F11)에서 drift 를 발견하지 않았다. 선행 IR §9 가 기록한 D1~D3(`organization-lms/README.md`, `O4O-ORGANIZATION-MEMBERSHIP-ARCHITECTURE-V1.md`)는 **이미 해당 IR 에 기록**되어 있어 중복 제기하지 않는다.

---

## 12. 산출물 경계

| 항목 | 상태 |
|---|---|
| 코드 수정 | **0건** |
| DB write / migration | **0건** |
| commit / push | **미수행** |
| 생성 파일 | 본 문서 1개 (`docs/ir/`) |
