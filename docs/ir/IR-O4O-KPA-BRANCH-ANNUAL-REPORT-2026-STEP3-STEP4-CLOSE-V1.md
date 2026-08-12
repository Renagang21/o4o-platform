# IR-O4O-KPA-BRANCH-ANNUAL-REPORT-2026-STEP3-STEP4-CLOSE-V1

> **유형**: 조사 전용 (코드 수정·DB write·migration·commit 없음)
> **작성일**: 2026-08-12
> **선행**: [IR-O4O-KPA-BRANCH-ANNUAL-REPORT-2026-TEMPLATE-FINALIZATION-V1](IR-O4O-KPA-BRANCH-ANNUAL-REPORT-2026-TEMPLATE-FINALIZATION-V1.md) (이하 **IR-1**)
> **목표**: 2026 온라인 신고 STEP 03·04 를 확정하여 `AnnualReportTemplate 2026 V1` 을 닫는다.

---

## 0. 결론 — 닫히지 않았다

요구 결과 4번(**미해결 항목 0 여부**)에 대한 답을 먼저 적는다.

> ### ❌ **미해결 4건. Template 은 닫히지 않았다.**

| 요구 결과 | 상태 | 비고 |
|---|:---:|---|
| 1. 2026 STEP 03 필드표 | ❌ **확정 불가** | 화면 미도달. §3-1 에 **DRAFT(검증용)** 제공 |
| 2. 2026 STEP 04 필드표 | ❌ **확정 불가** | 동상 |
| 3. 조건부 표시 규칙 | ⚠️ **잠정** | R1~R9 유지. R2·R3 는 STEP 03 확인 필요 |
| 4. **미해결 항목 0 여부** | ❌ **아니오 — 4건** | B1 · B2 · C3 · C4 (+ 해상도 한계 C10·C11) |
| 5. 최종 Template JSON | ⚠️ **부분** | STEP 01·02 **확정 JSON** 제공(§6). STEP 03·04 는 빈 배열 |
| 6. 다음 W1 구현 범위 | ✅ **확정** | §7 seed 계약 + 게이트 완성 |

**따라서 W1 은 아직 착수하지 않는다.** 사유는 §7-2.

이 IR 이 실제로 만든 것은 **"화면 1회 캡처로 전부 닫히는 상태"** 다. §8 체크리스트의 18개 항목만 확인하면 §6 JSON 의 `steps[2]`·`steps[3]` 이 채워지고 W1 이 열린다.

---

## 1. 기준 자료 도달 상태 (실측)

WO 가 지정한 기준 자료와 **실제로 세션에 도달한 것**의 대조다.

| WO 지정 자료 | 도달 | 실측 |
|---|:---:|---|
| 2026 STEP 01 화면 | ❌ 이미지 미도달 / ✅ **구술 도달** | 대화 본문 텍스트 열거로 항목 확정 (IR-1 2차 갱신 반영 완료) |
| 2026 STEP 02 화면 | ❌ 이미지 미도달 / ✅ **구술 도달** | 동상 |
| **2026 STEP 03 화면** | ❌ **미도달** | — |
| **2026 STEP 04 화면** | ❌ **미도달** | — |
| **`singoform2025.hwp`** | ❌ **미도달** | 3차 검색: `find /c/Users/sohae -maxdepth 6 -iname "singoform*"` → **0건**. `Downloads`·`Desktop` 2026-08-01 이후 신규 파일 **0건**. `C:` depth 6 + `G:` depth 4 `*.hwp` 전수 중 관련 파일 없음 |
| IR-1 | ✅ | 본 저장소 |
| `AnnualReportFormPage.tsx` | ✅ | 참고만. 복원하지 않음 (WO 원칙) |

**대체 baseline:** `singoform2025.hwp` 부재로, IR-1 과 동일하게 **`~/Downloads/2021년도 약사회원 신고서_(공통).jpg`** (이하 **S2**) 를 종이 양식 기준으로 사용한다. 2021-04-08 면허신고제 시행 **이후** 판이다.

> **2025 HWP 가 필요한 진짜 이유는 하나뿐이다.** S2(2021) → 2026 사이 **4년간의 항목 증감**을 알 수 없다. STEP 03·04 화면이 오면 2026 이 직접 확정되므로 **HWP 는 사실상 불필요**해진다. HWP 를 못 구해도 화면만 있으면 이 IR 은 닫힌다.

---

## 2. 확정 구간 — STEP 01 · 02

IR-1 2차 갱신에서 확정된 내용이다. 본 IR 에서 변경 없다. 상세는 [IR-1 §5](IR-O4O-KPA-BRANCH-ANNUAL-REPORT-2026-TEMPLATE-FINALIZATION-V1.md).

| STEP | 필드 수 | 확정 근거 |
|:---:|:---:|---|
| 01 약관동의 | **2** | `consent.privacy` + `consent.thirdParty`. 예약 슬롯 2건(고유식별정보·마케팅) 폐기 |
| 02 인적사항 | **18** | 신규 2 (`report.year` · `personal.highestDegree`) · 주소 3단 확정 · 성명 열거 누락 1 |

### 2-1. 구술 확정의 해상도 한계 — 신규 미해결 2건

구술은 **필드 존부**를 확정하지만 **분해능(cardinality)** 은 확정하지 못한다. STEP 03·04 캡처 시 함께 확인해야 한다.

| # | 쟁점 | 구술 | S2(2021) | 판정 |
|:---:|---|---|---|---|
| **C10** | **전화 필드 개수** | "전화" **1개** | **일반전화 + 휴대전화 2개** | ⏳ 온라인이 1개로 통합됐는지, 구술이 축약한 것인지 **미상** |
| **C11** | **학력 필드 분해** | "학력" 1항 + "최종학위" 1항 | **대학교 + 졸업년도 2칸** | ⏳ `university`·`graduationYear` 존치 여부 **미상** |

> C10·C11 은 §6 JSON 에서 **S2 기준(분리)** 으로 두되 `"confidence": "oral-unverified"` 를 표기했다. 통합형이면 필드를 줄이는 방향이므로 **seed 전 확인이 필수**다.

---

## 3. 미확정 구간 — STEP 03 · 04

### 3-1. DRAFT 필드표 (S2 기반 · **검증 전용 · active 금지**)

> ⚠️ **이 표는 확정 필드표가 아니다.** WO 원칙 *"불확실한 항목은 추정해서 active template 에 넣지 않는다"* 에 따라 §6 JSON 의 `steps[2]`·`steps[3]` 에는 **넣지 않았다.**
> 용도는 단 하나 — **화면과 1:1 대조해 차분만 표시**하기 위한 것이다. 백지에서 옮겨 적는 것보다 빠르다.

**STEP 03 취업현황 (DRAFT)** — S2 원문 기준. 각 행은 `유지 / 변경 / 삭제 / 신규` 로 판정만 하면 된다.

| key | 라벨 (S2 원문) | type | 선택지 | ownership |
|---|---|---|---|:---:|
| `employment.activityStatus` | 활동 / 미활동 | radio | 활동, 미활동 | member |
| `employment.activityType` | 근무처 구분 | select | 11종 (아래) | auto |
| `employment.hospitalType` | 의료기관 종별 | radio | 종합병원 · 병원 · 의원 · 요양병원 · 한방의료기관 · **치과의료기관** · **보건소 등 지역보건의료기관** (**7종**) | member |
| `employment.hospitalTask` | 업무 구분 | radio | 조제업무 · 비조제업무 | member |
| `employment.manufacturerRole` | 제조회사 역할 | radio | 경영자 · **제조관리자·안전관리책임자** · 그 외 | member |
| `employment.importerRole` | 수입회사 역할 | radio | 경영자 · **수입관리자** · 그 외 | member |
| `employment.wholesalerRole` | 도매회사 역할 | radio | 경영자 · **도매업무관리자** · 그 외 | member |
| `employment.otherDescription` | 기타 ( ) | text | 자유입력 | member |
| `employment.workplaceName` | 근무처 명칭 | text | — | auto |
| `employment.workplacePostalCode` | 근무처 우편번호 | text | — | member |
| `employment.workplaceRoadAddress` | 근무처 주소 (도로명) | address | — | auto |
| `employment.workplaceDetailAddress` | 근무처 상세주소 | text | — | member |
| `employment.workplacePhone` | 근무처 전화번호 | tel | — | member |
| `pharmacy.businessNumber` | 사업자번호 | text | 숫자 10 | member |
| `pharmacy.medicalInstitutionCode` | 요양기관기호 | text | — | member |
| `pharmacy.handlesKoreanMedicine` | 한약(첩약) 취급 | radio | 취급 · 취급안함 | member |
| `pharmacy.handlesAnimalMedicine` | 동물약품 취급 | radio | 취급 · 취급안함 | member |
| `pharmacy.separationArea` | 의약분업 지역구분 | radio | 분업지역 · 분업예외지역 | member |
| `inactive.reasons` | 미활동 사유 | multiselect | 9종 (아래) | member |

`activityType` 11종: `pharmacy_owner`(약국-개설약사) · `pharmacy_employee`(약국-근무약사) · `hospital`(의료기관) · `manufacturer`(의약품·의약외품 제조회사 **위탁제조판매업 포함**) · `importer`(의약품 수입회사) · `wholesaler`(의약품 도매회사) · `other_industry`(의약품산업 외 기업체) · `government`((준)정부·공공기관) · `school`(학교) · `other`(기타) · `inactive`(미활동)

`inactive.reasons` 9종 — S2 의 **2개 층위 보존**:
- *6개월 이상 조제업무 미종사*: `closed_business`(휴·폐업) · `job_seeking`(취업준비) · `overseas`(해외체류) · `leave`(휴직) · `parenting`(출산·육아)
- *독립*: `retired`(65세 이상 미취업) · `military`(군 복무) · `overseas_resident`(해외거주자) · `graduate_student`(대학원 재학생)

**STEP 04 기타사항 (DRAFT)**

| key | 라벨 (S2 원문) | type | ownership | 비고 |
|---|---|---|:---:|---|
| `training.completedCredits` | 연수교육 이수 평점 | readonly_display | **association** | S2 **"(약사회에서 작성)"** |
| `training.requiredCredits` | 이수의무 평점 | readonly_display | **association** | ″ |
| `training.creditYear` | 이수 연도 | readonly_display | **association** | ″ |
| `training.exemptionCertificate` | 면제·유예 확인서 | file | member | *"확인서가 있는 경우 제출"* |
| `fee.category` | 회비구분 (갑/을/병/정) | readonly_display | **association** | S2 **"(약사회에서 작성)"** |
| `fee.exemptionType` | 정 — 미취업자 / 회비면제자 | readonly_display | **association** | ″ |
| `mailing.newsletter` | 약사공론 수신처 | radio | member | 근무지 · 거주지 · 수취거부 |
| `mailing.newsletterRefuseReason` | 수취거부 사유 | text | member | R6 |
| `mailing.otherMail` | 기타 우편물 수신처 | radio | member | 근무지 · 거주지 · 수취거부 |
| `mailing.otherMailRefuseReason` | 수취거부 사유 | text | member | R6 |
| `submission.signature` | 약사 서명 (인/서명) | signature | member | 약사법 제7·11조 |
| `submission.declaredAt` | 제출 년·월·일 | date | auto | 서버 시각 |

### 3-2. 조건부 표시 규칙 (잠정 — IR-1 §7 유지)

R1~R9 를 변경 없이 승계한다. 그중 **2건이 STEP 03 화면에 의존**한다.

| ID | 조건 | 상태 |
|---|---|:---:|
| R1 | `activityType == 'pharmacy_owner'` → 약국현황 5필드 | 안정 |
| **R2** | `activityType == 'inactive'` → 미활동 표시 / 근무처 숨김 | ⏳ **C4** |
| **R3** | `activityType == 'hospital'` → `hospitalType` + `hospitalTask` | ⏳ **C3** |
| R4-a/b/c | 제조·수입·도매 → 해당 `*Role` 1개만 | 안정 |
| R5 | `activityType == 'other'` → `otherDescription` 필수 | 안정 |
| R6 | `mailing.* == 'refuse'` → 사유 필수 | 안정 |
| R7 | 면제확인서 업로드 → 면제 배지 | 안정 |
| R8 | `activityType != 'inactive'` → 근무처명·주소 필수 | 안정 |
| R9 | 2018~2025 신고 이력 전무 → 서면 안내 | 안정 (S1 공문 근거) |

---

## 4. B / C 항목 최종 상태

### 4-1. 차단 항목 B (WO 작업 3)

| # | 항목 | IR-1 1차 | IR-1 2차 | **본 IR** |
|:---:|---|:---:|:---:|:---:|
| B1 | STEP 03 화면 | ❌ | ❌ | ❌ **미해소** |
| B2 | STEP 04 화면 | ❌ | ❌ | ❌ **미해소** |
| B3 | STEP 01 동의 항목 | ❌ | ✅ | ✅ 해소 (구술) |
| B4 | STEP 02 인적사항 | ❌ | ✅ | ✅ 해소 (구술) |
| B5 | `singoform2025.hwp` | ❌ | ❌ | ❌ **미도달 — 3차 검색 0건.** 단 §1 주석대로 **화면 확보 시 불요** |
| B6 | 2026 양식 원본 (공문 첨부) | ❌ | ❌ | ❌ 미확보 |

### 4-2. 판단 항목 C (WO 작업 3)

| # | 쟁점 | 상태 | 판정 / 근거 |
|:---:|---|:---:|---|
| C1 | 컬럼 없는 `member` 7필드 영속 위치 | ✅ **판정** | **`values` jsonb 유지.** 신고서는 연도 스냅샷이 본질. 조회 요구 발생 시 테이블 승격 |
| C2 | `kpa_members.university_name` 재사용 | ✅ **판정** | **재사용 철회.** 주석이 *"약대생 재학 대학명"* 이라 의미 충돌 → `auto` 에서 `member` 로 전환 |
| **C3** | `hospitalTask` 소속 축 | ⏳ **미해결** | S2 배치가 `보건소 등` 행 끝의 `(□조제업무,□비조제업무)` 라 **의료기관 공통** vs **보건소 전용** 양쪽으로 읽힘. **화면으로만 판정** |
| **C4** | R2 상호배타 완화 | ⏳ **미해결** | `65세 이상 미취업`·`대학원 재학생` 은 근무처 병존이 실재. S2 는 이 모순을 해결하지 않음. **화면으로만 판정** |
| C5 | 제3자 제공 동의 존부 | ✅ **확정** | **존재** |
| C6 | 최종학위 신설 여부 | ✅ **확정** | **신설** |
| C7 | 면제확인서 저장소 | ✅ **판정** | 기존 미디어 파이프라인 재사용. W2 범위 (W1 무관) |
| C8 | 동의·최종학위 필수/선택 | ⏳ **미해결** | 신고 성립 요건. **추정 금지** |
| C9 | `personal.name` 필드 성격 | ⏳ **미해결** | `readonly` 추정. 캡처 시 동시 확인 |
| **C10** | 전화 필드 개수 (1 vs 2) | ⏳ **신규** | §2-1 |
| **C11** | 학력 필드 분해 | ⏳ **신규** | §2-1 |

> **W1 차단은 B1·B2·C3·C4 4건.** C8~C11 은 STEP 02 재확인으로 함께 닫히며, 캡처 1회에 전부 포함된다.

---

## 5. 3자 차이 최종 정리 (WO 작업 4)

`2025 HWP` 축은 파일 미도달로 **`2021 종이양식(S2)`** 으로 대체한다.

| 구분 | 건수 | 내용 |
|---|:---:|---|
| **S2 에 있고 기존 O4O 에 없음** | **6** | ① `치과의료기관` ② `보건소 등 지역보건의료기관` ③ 업종별 역할 라벨 3종 분리 ④ `위탁제조판매업 포함` 문구 ⑤ `기타( )` 자유입력 ⑥ 서명·제출일 데이터 |
| **2026 온라인 신규 (S2 에 없음)** | **4** | ① `consent.thirdParty` 제3자 제공 동의 ② `report.year` 신고년도 ③ `personal.highestDegree` 최종학위 ④ 주소 3단(우편번호 분리) |
| **기존 O4O 에만 있음 → 채택 안 함** | **4** | ① `InactiveInfo.startDate/expectedEndDate` (양식 근거 없음) ② `AnnualFeeBreakdown` 11항목 (회비 도메인) ③ `AnnualReportStatus` 등 (레코드 컬럼이지 Template 필드 아님) ④ `PharmacistFunction` (`@deprecated`) |
| **기존 O4O 결함** | **9 → 8** | IR-1 §6 D1~D9. **D7(상세주소) 해소** — 주소 3단 확정으로 양식 근거 확보 |

**핵심 결론 하나:** 기존 `AnnualReportFormPage.tsx` 는 **의료기관 종별 2종 누락 + 업종별 역할 UI 전무 + 미활동 사유 상태 미연결(D5)** 이라 그대로 쓰면 신고 데이터가 유실된다. WO 원칙대로 **복원하지 않고 schema-driven 으로 대체**한다.

---

## 6. `AnnualReportTemplate 2026 V1` — 현재 확정분

> **`status` 는 `draft` 다.** `steps[2]`·`steps[3]` 이 비어 있는 한 `active` 로 승격하지 않는다 (§7-2 게이트 G1).

```jsonc
{
  "templateVersion": "2026.1-draft",
  "status": "draft",
  "serviceKey": "kpa-branch",
  "year": 2026,
  "title": "2026년도 약사 회원 신고서",
  "periodStart": "2026-01-01",          // S1 공문
  "periodEnd":   "2026-02-28",          // S1 공문

  "steps": [
    { "key": "consent",    "order": 1, "title": "약관동의",  "complete": true  },
    { "key": "personal",   "order": 2, "title": "인적사항",  "complete": true  },
    { "key": "employment", "order": 3, "title": "취업현황",  "complete": false },  // ← B1
    { "key": "etc",        "order": 4, "title": "기타사항",  "complete": false }   // ← B2
  ],

  "fields": [
    // ───── STEP 01 약관동의 (확정 2) ─────
    { "key": "consent.privacy", "label": "개인정보의 수집·이용 동의", "type": "consent",
      "step": "consent", "order": 1,
      "ownership": "member", "lineage": "2026-keep",
      "required": null, "confidence": "oral-unverified",          // ← C8
      "source": null, "syncToMembership": false },

    { "key": "consent.thirdParty", "label": "개인정보 제3자 제공 동의", "type": "consent",
      "step": "consent", "order": 2,
      "ownership": "member", "lineage": "new",
      "required": null, "confidence": "oral-unverified",          // ← C8
      "source": null, "syncToMembership": false },

    // ───── STEP 02 인적사항 (확정 18) ─────
    { "key": "report.year", "label": "신고년도", "type": "readonly_display",
      "step": "personal", "order": 1,
      "ownership": "auto", "lineage": "new", "required": true, "readonly": true,
      "source": { "entity": "annual_report_templates", "column": "year" } },

    { "key": "personal.name", "label": "성명", "type": "text",
      "step": "personal", "order": 2,
      "ownership": "auto", "lineage": "2026-keep", "required": true,
      "readonly": null, "confidence": "oral-unverified",          // ← C9
      "source": { "entity": "users", "column": "name" } },

    { "key": "personal.gender", "label": "성별", "type": "radio",
      "step": "personal", "order": 3,
      "ownership": "member", "lineage": "2026-keep", "required": true,
      "options": [ { "value": "male", "label": "남" }, { "value": "female", "label": "여" } ],
      "source": null },

    { "key": "personal.birthDate", "label": "생년월일", "type": "date",
      "step": "personal", "order": 4,
      "ownership": "member", "lineage": "2026-keep", "required": true, "source": null },

    { "key": "personal.licenseNumber", "label": "면허번호", "type": "license",
      "step": "personal", "order": 5,
      "ownership": "auto", "lineage": "2026-keep", "required": true,
      "source": { "entity": "kpa_members", "column": "license_number" },
      "syncToMembership": true, "syncTarget": "kpa_members.license_number" },

    { "key": "personal.licenseYear", "label": "면허 취득년도", "type": "number",
      "step": "personal", "order": 6,
      "ownership": "member", "lineage": "2026-keep", "required": true, "source": null },

    // C10 — S2 기준 2필드 유지. 온라인이 1필드면 mobile 만 남기고 phone 제거
    { "key": "personal.phone", "label": "일반전화", "type": "tel",
      "step": "personal", "order": 7,
      "ownership": "member", "lineage": "2026-keep", "required": false,
      "confidence": "oral-unverified", "source": null },

    { "key": "personal.mobile", "label": "휴대전화", "type": "tel",
      "step": "personal", "order": 8,
      "ownership": "member", "lineage": "2026-keep", "required": true,
      "confidence": "oral-unverified", "source": null },

    { "key": "personal.postalCode", "label": "거주지 우편번호", "type": "text",
      "step": "personal", "order": 9,
      "ownership": "member", "lineage": "new", "required": true, "source": null },

    { "key": "personal.roadAddress", "label": "거주지 도로명 주소", "type": "address",
      "step": "personal", "order": 10,
      "ownership": "member", "lineage": "2026-keep", "required": true, "source": null },

    { "key": "personal.detailAddress", "label": "거주지 상세주소", "type": "text",
      "step": "personal", "order": 11,
      "ownership": "member", "lineage": "2026-keep", "required": true, "source": null },

    { "key": "personal.email", "label": "이메일", "type": "email",
      "step": "personal", "order": 12,
      "ownership": "auto", "lineage": "2026-keep", "required": true,
      "source": { "entity": "users", "column": "email" } },

    { "key": "personal.branch", "label": "소속 지부", "type": "readonly_display",
      "step": "personal", "order": 13,
      "ownership": "association", "lineage": "2026-keep", "required": true, "readonly": true,
      "source": { "entity": "branch_memberships", "column": "organization_id",
                  "resolve": "kpa_organizations.parent_id" } },

    { "key": "personal.division", "label": "소속 분회", "type": "readonly_display",
      "step": "personal", "order": 14,
      "ownership": "association", "lineage": "2026-keep", "required": true, "readonly": true,
      "source": { "entity": "branch_memberships", "column": "organization_id" } },

    { "key": "personal.hasKoreanMedicineLicense", "label": "한약조제자격", "type": "radio",
      "step": "personal", "order": 15,
      "ownership": "member", "lineage": "2026-keep", "required": true,
      "options": [ { "value": true, "label": "유" }, { "value": false, "label": "무" } ],
      "source": null },

    // C2 — university_name 재사용 철회 → ownership='member'
    { "key": "personal.university", "label": "학력 — 학부(대학교)", "type": "text",
      "step": "personal", "order": 16,
      "ownership": "member", "lineage": "2026-keep", "required": false,
      "confidence": "oral-unverified", "source": null },       // ← C11

    { "key": "personal.graduationYear", "label": "학력 — 졸업년도", "type": "number",
      "step": "personal", "order": 17,
      "ownership": "member", "lineage": "2026-keep", "required": false,
      "confidence": "oral-unverified", "source": null },       // ← C11

    { "key": "personal.highestDegree", "label": "최종학위", "type": "select",
      "step": "personal", "order": 18,
      "ownership": "member", "lineage": "new",
      "required": null, "options": null, "confidence": "oral-unverified",  // ← C6 존재확정 / 옵션 미상
      "source": null }

    // ───── STEP 03 취업현황 ───── B1 미해소 → 의도적 공란 (§3-1 DRAFT 참조)
    // ───── STEP 04 기타사항 ───── B2 미해소 → 의도적 공란 (§3-1 DRAFT 참조)
  ],

  "rules": [ /* R1~R9 — IR-1 §7 / 본 IR §3-2. R2·R3 는 C3·C4 확정 후 고정 */ ],

  "openIssues": ["B1", "B2", "C3", "C4", "C8", "C9", "C10", "C11"]
}
```

**`confidence` 필드의 의미** — WO 원칙 *"불확실한 항목은 추정해서 active template 에 넣지 않는다"* 를 데이터로 강제한다.

| 값 | 의미 | seed 허용 |
|---|---|:---:|
| (없음) | S2 원문 + 구술 양쪽 일치 | ✅ |
| `oral-unverified` | 구술로만 확인. 분해능·필수여부 미검증 | ❌ **G2 가 차단** |

`required: null` · `readonly: null` · `options: null` 은 **"미상"** 이며 `false`/`[]` 와 다르다. 이 구분이 §7-2 게이트의 판정축이다.

---

## 7. W1 구현 범위 (WO 작업 6)

### 7-1. 범위

`WO-O4O-KPA-BRANCH-ANNUAL-REPORT-TEMPLATE-SCHEMA-V1`

| 항목 | 내용 |
|---|---|
| 테이블 | `annual_report_templates` 1개 — IR-1 §8-2 |
| Entity | `AnnualReportTemplate` — **ESM 규칙(§2) 준수**: 관계는 `@ManyToOne('X','y')` 문자열 참조, `import type` |
| Seed | 2026 V1 — **§6 JSON**. `steps[2]`·`steps[3]` 채워진 최종본 |
| API | 운영자 조회 전용 — `GET /api/v1/kpa-branch/operator/annual-report-templates` · `/:year` |
| Guard | `requireAuth` → `requireKpaBranchScope('kpa-branch:operator')` (§11 규칙 1) |
| Boundary | Store Ops → **Primary = `organizationId`**. UUID 단독 조회 금지 (§7 Guard Rule 1) |
| **범위 밖** | 회원 화면 · 제출 API · `annual_reports` 테이블 · 회원정보 sync — **W2·W3** |

### 7-2. Seed 게이트 (통과 전 착수 금지)

| ID | 게이트 | 판정 |
|:---:|---|---|
| **G1** | `steps[*].complete` 가 **전부 `true`** | 현재 `employment`·`etc` **false** → ❌ |
| **G2** | `fields[]` 에 `confidence: "oral-unverified"` **0건** | 현재 **8건** → ❌ |
| **G3** | `required`/`readonly`/`options` 에 `null` **0건** | 현재 **6건** → ❌ |
| **G4** | `openIssues` **빈 배열** | 현재 **8건** → ❌ |
| **G5** | `ownership: "association"` 필드의 서버 무시 로직 존재 | W1 구현 대상 |

> **G1~G4 가 전부 ❌ 인 현재, W1 을 착수하면 안 된다.** 불완전 양식이 `status='active'` 로 고정되면 회원이 그 위에서 제출하고, 이후 정정은 **이미 제출된 신고서의 마이그레이션** 문제가 된다. 부분 seed 를 채택하지 않는 이유다.

### 7-3. W1 이후

W2(제출·schema-driven 렌더러) → W3(회원정보 sync) → W4(운영자 검수) → W0(`AnnualReportFormPage.tsx` 제거). IR-1 §10 유지.

---

## 8. 화면 확보 체크리스트 (사람 수행 — 캡처 1회로 전부 닫힘)

`member.kpanet.or.kr` 은 대한약사회 회원 로그인이 필요한 외부 서비스다. CLAUDE.md 중지 조건 *"실제 계정·자격정보·외부 서비스 승인 필요"* 에 해당하여 **AI 가 접속할 수 없다.**

캡처 시 아래 18개만 확인하면 §6 JSON 이 완성된다.

**STEP 03 — 11항목**

1. 활동/미활동이 **별도 라디오**인가, 근무처 구분 안에 `미활동` 항목으로 있는가
2. 근무처 구분 **11종 그대로**인가 (증감 확인)
3. `의약품·의약외품 제조회사` 에 **`위탁제조판매업 포함`** 문구가 있는가
4. 의료기관 종별에 **`치과의료기관`·`보건소 등 지역보건의료기관`** 이 있는가 (**7종** 확인)
5. **[C3]** `조제업무/비조제업무` 가 **의료기관 전체**에 붙는가, **보건소 등에만** 붙는가
6. 제조/수입/도매 **역할 라벨 3종이 각각 다른가** (`제조관리자·안전관리책임자` / `수입관리자` / `도매업무관리자`)
7. `기타` 선택 시 **자유입력 칸**이 열리는가
8. 근무처 주소가 **3단(우편번호·도로명·상세)** 인가
9. 약국 현황 5항목이 **개설약사 선택 시에만** 나타나는가 → R1
10. **[C4]** 미활동 사유 선택 시 **근무처 입력이 막히는가** (65세 이상 미취업 등 병존 허용 여부)
11. 미활동 사유 **9종 + 2개 층위** 구조가 유지되는가

**STEP 04 — 5항목**

12. 연수교육 평점이 **읽기 전용**인가 (회원이 입력 가능하면 `association` 판정이 뒤집힌다)
13. 회비구분이 **읽기 전용**인가 · **갑/을/병/정 4분류**인가
14. 우편물 수신처가 **약사공론 / 기타 우편물 2행**인가
15. **서명 방식** — 전자서명 · 체크 · 성명 입력 중 무엇인가
16. STEP 04 에 **위 항목 외 신규 항목**이 있는가

**STEP 02 재확인 — 2항목** (C8~C11 동시 해소)

17. **[C10·C11]** 전화가 **1칸인지 2칸**인지 · 학력이 **대학교/졸업년도 2칸인지**
18. **[C8·C9]** 각 항목의 **`*` 필수 표시** · 성명이 **입력칸인지 고정 표시**인지

> 캡처가 어려우면 **각 STEP 의 항목명·선택지를 텍스트로 열거**해 주셔도 된다. STEP 01·02 는 그 방식으로 닫혔다. 다만 **필수 표시(`*`)와 읽기 전용 여부**는 텍스트로 전달되지 않으므로 별도로 적어 주셔야 한다.

---

## 9. 문서 정합 (CLAUDE.md §16)

```
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
```

IR-1 은 본 IR 의 선행 문서로 **유효(ACTIVE)** 하다. 본 IR 이 IR-1 을 대체하지 않는다 — IR-1 은 전 범위 조사, 본 IR 은 STEP 03·04 종결 시도다. §16-1 대상 기준 문서에서 drift 를 발견하지 않았다.

---

## 10. 산출물 경계

| 항목 | 상태 |
|---|---|
| 코드 수정 | **0건** |
| DB write / migration / seed 실행 | **0건** |
| commit / push | **미수행** |
| 생성 파일 | 본 문서 1개 (`docs/ir/`) |
| **W1 착수** | **보류** — §7-2 게이트 G1~G4 미통과 |
