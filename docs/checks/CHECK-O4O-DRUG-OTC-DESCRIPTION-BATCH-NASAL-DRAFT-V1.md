# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-NASAL-DRAFT-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-NASAL-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 원문 grounding 기반 점비/비강제 분류 + 대표 초안 dry-run** 결과다. DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> 비경구 2단계 batch 순서: EYE → TOPICAL → PATCH → **NASAL(본 batch)**. 이 세션은 STAGE1·PATCH 등을 실제 실행한 DB 접근 가능 환경이다(gcloud + cloud-sql-proxy + psql). 실제와 어긋나는 BLOCKED CHECK는 만들지 않는다.

## 2. 사용한 기준 문서

```text
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-PATCH-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1.md
docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md  (§3.10 비경구 route 필수문구 — 점비/비강: 사용 횟수·연속 사용 제한(반동성 비충혈)·심혈관/소아·임부 주의)
```

누락 확인 시 기록(중단 사유 아님): `docs/checks/CHECK-O4O-DRUG-STORE-DESCRIPTION-PIPELINE-READONLY-AUDIT-V1.md` 는 checkout에 부재. `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md` 는 존재하나 본 batch에서 상태 변경하지 않음(반영 제안만 §10).

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy-v2` (netureyoutube:asia-northeast3:o4o-platform-db, 127.0.0.1:16544, OAuth 액세스 토큰) + `psql` user `o4o_api`, db `o4o_platform`.
- 인증: 프록시는 `gcloud auth print-access-token`. DB 비밀번호는 Cloud Run `o4o-core-api` env(`DB_PASSWORD`)에서 세션 환경변수로만 읽고 디스크 미저장.
- 실행: **SELECT 전용**. `INSERT/UPDATE/DELETE/DDL` 없음. 한글 정규식은 UTF-8 `.sql` 파일 + `psql -f`(인라인 한글 `-c` 는 CP949로 깨짐 — 재확인됨).
- 원문: `shared_product_descriptions.content`, `source_type='mfds_easy_drug'`, join key `master_id = product_masters.id`.
- 데이터 제약(STAGE1 재확인): `product_drug_extensions` 의 임상/제형 필드(`ingredient_summary`·`dosage_form`·`strength`·`efficacy_text`·`caution_text` 등)는 **OTC 전량 NULL**. 성분·route는 `product_masters.name` + `atc_code` + `shared_product_descriptions.content` 로 파생.

## 4. 점비/비강 후보 재확인

STAGE1 은 name-route 기준 nasal=177(원문 122)로 집계했다. 본 batch는 **route 신호로 ATC `R01A*`(국소 비강, 정의상 topical)** 를 1차로 채택하고 name 키워드로 보강했다. ATC 기반이 name-route보다 국소 비강 route를 더 정확히 포착한다(name에 '비/코' 키워드가 없는 점비액·나잘액 다수 포함).

| 구분 | 수 |
|---|---:|
| 점비/비강 topical 후보 (R01A* ∪ 엄격 name-route, R01B* 경구 제외) | **235** |
| 원문(SPD content) 보유 | **165 (70%)** |
| R01A* 소계 | 233 |
| name-only(무 ATC) 추가 | 2 (`클린톡톡비나잘스프레이`) |

### 4.1 경구(R01B*) 분리 — nasal route 아님

ATC `R01B`(전신성 비충혈제, 경구)는 이번 batch 대상이 아니다. OTC 내 `R01B*` = **683건**(R01B 365 / R01BA52 213 / R01BA53 102 / R01BA02 3)으로, 슈도에페드린 등 **경구 감기·비염 정제**다. 전량 제외(WO §4 경구 감기약/비염약 제외).

### 4.2 name 오탐 제거 (브랜드명 부분일치)

느슨한 name 키워드(`비액`, `코에` 등)는 **경구 제품의 브랜드명 부분일치**를 다수 오탐했다. 실제 확인·제거:

- `코에` → `징코에이스`(은행엽·경구, N06DX02), `니코에이패취`(니코틴 패치, N07BA01), `뮤코에이시럽`(거담 시럽, R05CB10)
- `비액` → `간비액`(경구, A05), `테라비액티브정`·`마그비액티브정`·`메가비액티브정`(비타민 경구, A11)

→ 엄격 키워드(`점비|비강|나잘|나살|콧속|비내|코스프레이|비강분무|비강세척`) + `R01A*` 로 확정. name 오탐은 route 판정에서 배제.

## 5. 성분·제형별 group 후보 (bucket 분류)

route는 전량 점비/비강. `nasal_steroid_or_hold` 는 **OTC에 R01AD(비강 스테로이드)가 0건**이다 — 비강 스테로이드는 전량 전문의약품이라 OTC 후보에 없음(중요 확정).

| bucket | 성분/ATC | masters | 원문(SPD) | action | 비고 |
|---|---|---:|---:|---|---|
| nasal_decongestant | 자일로메타졸린 (R01AA07) | 61 | 40 | draft_written | 0.1%(성인) / 0.05%(소아) 농도·연령 분리 |
| nasal_decongestant | 옥시메타졸린 (R01AA05) | 36 | 29 | draft_written | 7일 연속 사용 금지 |
| nasal_decongestant | 페닐레프린 (R01AA04) | 15 | 8 | draft_written | 만7세~15세 소아 용량 별도, 7일 제한 |
| nasal_saline_or_moisturizing | 염화나트륨 (R01AX10) | 50 | 36 | draft_written | 세척·비점막 건조 완화, 전연령 age-graded, 저위험 |
| nasal_saline_or_moisturizing | 덱스판테놀 (R01AX) | 5 | 5 | needs_review | 보습성, 성분·용법 원문 개별 확인 |
| nasal_combo | 자일로메타졸린 복합 (R01AB06) | 13 | 11 | needs_review | 복합 조성 품목별 상이 |
| nasal_combo | 옥시메타졸린 복합 (R01AB07) | 20 | 14 | needs_review | 복합 조성 품목별 상이 |
| nasal_combo | 나파졸린 복합 (R01AB02, 나리스타에스 등) | 16 | 8 | needs_review | 나파졸린+항히스타민 등 복합 |
| nasal_combo | 기타 복합 (R01AX30) | 10 | 10 | needs_review | 조성 품목별 확인 |
| nasal_antiallergic | 케토티펜 (R01AC) | 1 | 0 | hold_source | 원문 없음 |
| nasal_antiallergic | 레보카바스틴 (R01AC02) | 3 | 0 | hold_source | 원문 없음, 약사 검토 |
| nasal_saline_or_moisturizing | 무 ATC (`클린톡톡비나잘스프레이`) | 2 | — | defer | 성분 원문 확인 필요 |
| exclude | 에페린플러스정 (R01AB, **정제**) | 3 | — | exclude | 경구 제제 오탐(정), nasal route 아님 |
| **합계** | | **235** | **165** | | |

주의(WO §8·가이드 §3.10):

- **spec 첫 토큰은 병 용량**(예: `10mL`·`15mL`)이지 성분 농도가 아니다 → strength_key로 쓰지 않음. 농도(`0.1%`·`0.05%`·`0.5%`)는 **제품명·원문**에 있는 값만 사용, 없으면 `unspecified`.
- **농도·연령이 다르면 분리**: 자일로메타졸린 0.1%(만12세 이상)와 0.05%(만2~12세 미만)는 효능은 같으나 대상 연령·용량이 달라 **별도 group**(원문 실측 근거 §6).
- 나파졸린은 이 OTC 집합에서 **단일 점비액이 없고 복합제(R01AB02)로만** 존재 → `nasal_combo` needs_review로 편입(WO §10 우선순위 3의 단일 나파졸린은 부재).

### 5.1 자일로메타졸린 농도 분포 (name 기준)

| 농도 | masters |
|---|---:|
| 0.1% (성인) | 25 |
| 0.05% (소아) | 18 |
| 미표기(unspec) | 18 |

## 6. 원문 grounding (핵심 확정)

각 대표 성분의 `content`(효능·효과 / 용법·용량 / 사용상 주의사항 / 이상반응)를 직접 조회. 원문에 없는 농도·사용 기간·연령은 창작하지 않음.

- **자일로메타졸린 0.1%**(오트리빈멘톨0.1%분무제 등): 코감기(급성비염)·알레르기성 비염·부비동염의 코막힘·콧물·재채기·머리무거움. **만 12세 이상** 1일 3회 범위, 1회 1번, **적용 간격 8시간 이상**. 금기: 과민, 만 12세 미만, MAO억제제 복용/중단 2주 이내, 뇌하수체절제술 등 경험자, 폐쇄각 녹내장, 건성·위축 비염, 크롬친화세포종, 전립선비대증. **"과도하게 사용하면 오히려 코막힘을 일으킬 수 있으므로 과도하게 사용하지 마십시오"(반동성 비충혈 원문 근거)**. **3일 사용해도 개선 없으면 중지·상담**. 사용 중 음주 금지.
- **자일로메타졸린 0.05%**(메타리빈액0.05% 등): **만 2세 이상~만 12세 미만** 1회 1번, 1일 3회 범위, 간격 8시간 이상. 금기: 만 2세 미만 영아. 프로필렌글리콜 과민 상담. 3일 미개선 시 중지.
- **옥시메타졸린**(오트리빈에스비강분무액 등): 만 12세 이상 1회 1~2번, 1일 1~2회(**1일 2회 초과 금지**), 최소 간격 8시간. 금기 만 7세 미만, 만 7~11세 상담. **7일 이상 계속 사용 금지**. 3일 미개선 시 중지.
- **페닐레프린 0.5%**(시네프린나잘액0.5% 등): 성인 1회 2번, 만 7세 이상~만 15세 미만 1회 1번, **투여 간격 3시간 이상·1일 6회 이하**, **7일 이상 계속 사용 금지**, 오염 방지 위해 공동 사용 금지. 이상반응 "**장기간 사용 시 비강 내 자극·종창(부기), 비강 점막 부종**"(반동성 근거).
- **염화나트륨**(노즈스위퍼스프레이 등): 코점막 분비물·화농으로 인한 코막힘의 **코 안 세척 및 비점막 건조증상 완화**. 필요 시 2~3시간마다, **연령별 횟수**(영아 1회 ~ 성인 1~8회). 벤잘코늄염화물 함유 → 기관지 경련 가능. 한 제품은 한 사람만 사용. 혈관수축·반동성 없음(저위험).

## 7. 작성한 대표 설명서 초안 목록

| # | group_key | bucket | status |
|---:|---|---|---|
| 1 | `drug_otc::single::nasal::xylometazoline_hcl::0.1pct::nasal_spray` | nasal_decongestant | draft_written |
| 2 | `drug_otc::single::nasal::xylometazoline_hcl::0.05pct::nasal_spray` | nasal_decongestant | draft_written |
| 3 | `drug_otc::single::nasal::oxymetazoline_hcl::unspecified::nasal_spray` | nasal_decongestant | draft_written |
| 4 | `drug_otc::single::nasal::phenylephrine_hcl::0.5pct::nasal_drop` | nasal_decongestant | draft_written |
| 5 | `drug_otc::single::nasal::sodium_chloride::unspecified::nasal_wash` | nasal_saline_or_moisturizing | draft_written |

공통 점비/비강 주의문구(전 초안 반영): 코 안에만 사용 · 제품별 사용 횟수·기간 준수 · 혈관수축성 점비제는 연속 사용 시 반동성 비충혈 주의 · 고혈압·심장·갑상선·당뇨·녹내장·전립선비대 시 상담 · 코피·심한 자극·심계항진·증상 악화 시 중단 · 분무기 공동 사용 금지.

---

### 초안 1 — 자일로메타졸린 0.1% 비강분무제(성인)

```text
group_key: drug_otc::single::nasal::xylometazoline_hcl::0.1pct::nasal_spray
status: draft_written   grounding: mfds_easy_drug (오트리빈멘톨0.1%분무제 등). 농도 0.1%(명칭)
```

| 항목 | 내용 |
|---|---|
| 성분 | 자일로메타졸린염산염 0.1% |
| 분류 | 일반의약품 |
| route | 점비/비강 |
| 작용 | 코 점막 혈관을 수축시켜 코막힘을 완화하는 비충혈 제거 성분 |
| 주요 증상 | 코감기(급성비염), 알레르기성 비염, 부비동염에 의한 코막힘·콧물·재채기·머리무거움 |
| 선택 포인트 | 만 12세 이상 코막힘 완화용. **연속 사용 기간 제한이 중요** |
| 주의 대상 | 만 12세 미만, 고혈압·심장·갑상선·당뇨·녹내장·전립선비대, MAO억제제 복용자, 임부·수유부 |

**효능·효과**
코감기(급성비염), 알레르기성 비염, 부비동염에 의한 코막힘, 콧물, 재채기, 머리무거움 증상의 완화에 사용합니다.

**사용 안내**
만 12세 이상 청소년 및 성인은 1일 3회 범위 내에서 1회 1번 각 비강(코안)에 분무하며, 적용 간격은 8시간 이상으로 합니다. 코 안에만 사용하고 눈과 귀에는 사용하지 않습니다. **이 약은 과도하게 또는 오래 사용하면 오히려 코막힘이 더 심해지는 반동성 비충혈이 생길 수 있으므로 정해진 용법·용량을 지키고, 3일간 사용해도 증상이 좋아지지 않으면 사용을 중지하고 약사 또는 의사와 상의합니다.** 오염 방지를 위해 여러 사람이 함께 쓰지 않습니다. 사용 중에는 음주하지 않습니다.

**주의 대상**
이 약 과민증, 만 12세 미만 어린이, MAO억제제(항우울제·항정신병제 등)를 복용 중이거나 중단 후 2주 이내인 사람, 폐쇄각 녹내장, 건성·위축 비염, 크롬친화세포종, 전립선비대증 환자는 사용하지 않습니다. 고혈압, 심장질환, 당뇨병, 갑상선질환, 녹내장이 있거나 관련 약을 복용 중인 사람, 임부·임신 가능성이 있는 여성·수유부는 사용 전 약사 또는 의사와 상의하세요. 코피, 심한 자극감, 두근거림, 어지러움이 나타나면 사용을 중단하고 상담하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 2 — 자일로메타졸린 0.05% 비강분무제(소아)

```text
group_key: drug_otc::single::nasal::xylometazoline_hcl::0.05pct::nasal_spray
status: draft_written   grounding: mfds_easy_drug (메타리빈액0.05% 등). 농도 0.05%(명칭). 성인용 0.1%와 연령·용량이 달라 별도 group
```

| 항목 | 내용 |
|---|---|
| 성분 | 자일로메타졸린염산염 0.05% |
| 분류 | 일반의약품 |
| route | 점비/비강 |
| 작용 | 코 점막 혈관을 수축시켜 코막힘을 완화하는 비충혈 제거 성분 |
| 주요 증상 | 코감기, 알레르기성 비염, 부비동염에 의한 코막힘·콧물·재채기·머리무거움 |
| 선택 포인트 | **만 2세 이상~만 12세 미만 소아용 저농도**. 성인용 0.1%와 구분 |
| 주의 대상 | 만 2세 미만 영아, 프로필렌글리콜 과민, 심혈관·갑상선 질환 |

**효능·효과**
코감기, 알레르기성 비염, 부비동염에 의한 코막힘, 콧물, 재채기, 머리무거움 증상의 완화에 사용합니다.

**사용 안내**
만 2세 이상~만 12세 미만 어린이는 1일 3회 범위 내에서 1회 1번 각 비강에 분무하며, 적용 간격은 8시간 이상으로 합니다. 어린이에게 사용할 때는 보호자의 지도·감독 하에 사용합니다. 코 안에만 사용하고 눈과 귀에는 사용하지 않습니다. **오래 또는 과도하게 사용하면 오히려 코막힘이 심해질 수 있으므로 정해진 용법·용량을 지키고, 3일간 사용해도 증상이 좋아지지 않으면 사용을 중지하고 약사 또는 의사와 상의합니다.** 오염 방지를 위해 여러 사람이 함께 쓰지 않습니다.

**주의 대상**
만 2세 미만 영아, 이 약 과민증, 뇌하수체절제술 등 경험자, 폐쇄각 녹내장, 건성·위축 비염, 크롬친화세포종, 전립선비대증 환자는 사용하지 않습니다. 임부·임신 가능성이 있는 여성·수유부, 프로필렌글리콜 과민 경험자, 고혈압·심장질환·당뇨병·갑상선질환·녹내장이 있는 사람은 사용 전 약사 또는 의사와 상의하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 3 — 옥시메타졸린 비강분무액

```text
group_key: drug_otc::single::nasal::oxymetazoline_hcl::unspecified::nasal_spray
status: draft_written   grounding: mfds_easy_drug (오트리빈에스비강분무액 등). 원문에 농도 미표기 → unspecified
```

| 항목 | 내용 |
|---|---|
| 성분 | 옥시메타졸린염산염 |
| 분류 | 일반의약품 |
| route | 점비/비강 |
| 작용 | 코 점막 혈관을 수축시켜 코막힘을 완화하는 비충혈 제거 성분 |
| 주요 증상 | 코감기(급성비염), 알레르기성 비염, 부비동염에 의한 코막힘·콧물·재채기·머리무거움 |
| 선택 포인트 | 지속시간이 긴 비충혈 제거제. **1일 2회 이하·7일 이내 사용** |
| 주의 대상 | 만 7세 미만, 심혈관·갑상선·당뇨 질환, MAO억제제 복용자, 임부·수유부 |

**효능·효과**
코감기(급성 비염), 알레르기성 비염, 부비동염에 의한 코막힘, 콧물, 재채기, 머리무거움 증상의 완화에 사용합니다.

**사용 안내**
만 12세 이상 청소년 및 성인은 1회 1~2번씩 1일 1~2회 각 비강에 분무하며, **1일 2회를 초과하지 않고 최소 사용 간격은 8시간**입니다. 코를 청결히 한 뒤 사용하고, 사용 후 노즐을 깨끗이 하여 건조합니다. 코 안에만 사용하고 눈과 귀에는 사용하지 않습니다. **7일 이상 계속하여 사용하지 않으며**, 오래·과도하게 사용하면 반동성 비충혈이 생길 수 있습니다. 3일간 사용해도 개선이 없으면 사용을 즉각 중지하고 약사 또는 의사와 상의합니다.

**주의 대상**
이 약 과민증, 만 7세 미만 어린이, MAO억제제 복용 중이거나 중단 후 2주 이내인 사람, 폐쇄각 녹내장, 건성·위축 비염 환자는 사용하지 않습니다. 만 7~11세 어린이, 임부·수유부, 고혈압·심혈관계 질환·갑상선기능항진·당뇨병·크롬친화세포종·전립선비대증이 있거나 관련 약을 복용 중인 사람은 사용 전 약사 또는 의사와 상의하세요. 코피, 심한 자극감, 두근거림, 불규칙한 심박, 두통이 나타나면 사용을 중단하고 상담하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 4 — 페닐레프린 0.5% 점비액

```text
group_key: drug_otc::single::nasal::phenylephrine_hcl::0.5pct::nasal_drop
status: draft_written   grounding: mfds_easy_drug (시네프린나잘액0.5% 등). 농도 0.5%(명칭)
```

| 항목 | 내용 |
|---|---|
| 성분 | 페닐레프린염산염 0.5% |
| 분류 | 일반의약품 |
| route | 점비/비강 |
| 작용 | 코 점막 혈관을 수축시켜 코막힘을 완화하는 비충혈 제거 성분 |
| 주요 증상 | 코감기(급성비염), 알레르기성 비염, 부비동염에 의한 코막힘·콧물·재채기·머리무거움 |
| 선택 포인트 | 만 7세 이상 소아 용량이 별도로 있는 비충혈 제거 점비액. **7일 이내 사용** |
| 주의 대상 | 만 7세 미만, 고혈압·심장·갑상선·당뇨·녹내장, MAO억제제 복용자, 임부 |

**효능·효과**
코감기(급성비염), 알레르기성 비염, 부비동염에 의한 코막힘, 콧물, 재채기, 머리무거움 증상의 완화에 사용합니다.

**사용 안내**
성인은 1회 2번씩, 만 7세 이상~만 15세 미만 소아는 1회 1번씩 비강 내에 분무합니다. **투여 간격은 3시간 이상으로 하고 1일 6회를 넘지 않습니다.** 코 안에만 사용하고 눈과 귀에는 사용하지 않습니다. **과도하게 사용하면 오히려 코막힘을 일으킬 수 있고, 7일 이상 계속 사용하지 않습니다.** 오염 방지를 위해 여러 사람이 함께 쓰지 않습니다. 3일간 사용해도 개선이 없으면 사용을 즉각 중지하고 약사 또는 의사와 상의합니다.

**주의 대상**
이 약 과민증, 만 7세 미만 유아, MAO억제제 복용 중이거나 중단 후 2주 이내인 사람은 사용하지 않습니다. 고혈압, 심장질환, 당뇨병, 갑상선질환, 녹내장이 있거나 관련 약을 복용 중인 사람, 임부·임신 가능성이 있는 여성은 사용 전 약사 또는 의사와 상의하세요. 장기간 사용 시 비강 내 자극·부기·점막 부종이 생길 수 있으며, 코피·심한 자극감·두근거림이 나타나면 사용을 중단하고 상담하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 5 — 염화나트륨 비강 세척·분무액

```text
group_key: drug_otc::single::nasal::sodium_chloride::unspecified::nasal_wash
status: draft_written   grounding: mfds_easy_drug (노즈스위퍼스프레이 등). 혈관수축 아님·저위험. 농도 원문 미표기 → unspecified
```

| 항목 | 내용 |
|---|---|
| 성분 | 염화나트륨(생리식염 성분) |
| 분류 | 일반의약품 |
| route | 점비/비강 |
| 작용 | 코 안을 세척하고 비점막의 건조·분비물을 완화 |
| 주요 증상 | 코점막 분비물·화농으로 인한 코막힘, 코 안 세척, 비점막 건조 |
| 선택 포인트 | 혈관수축 성분이 아니라 반동성 비충혈 위험이 낮은 세척·보습 목적. 연령별 사용 |
| 주의 대상 | 염화나트륨·벤잘코늄염화물 과민, 최근 코 수술·병변 |

**효능·효과**
코점막 분비물 또는 화농(곪음)으로 인한 코막힘에 코 안 세척 및 비점막 건조증상의 완화에 사용합니다.

**사용 안내**
필요 시 2~3시간마다 각 코 안에 분무합니다. 사용 횟수는 연령에 따라 다르므로(영아 1회, 성인 1~8회 등) 제품별 허가된 연령·횟수를 확인합니다. 코 안에 노즐을 넣고 액이 목 뒤로 넘어가지 않도록 고개를 옆으로 기울여 사용합니다. 코 안에만 사용하고, 한 제품은 한 사람만 사용합니다. 이 약은 혈관을 수축시키는 비충혈 제거제와 달리 반동성 비충혈 위험이 낮지만, 증상이 오래 지속되면 약사 또는 의사와 상의합니다.

**주의 대상**
이 약 또는 벤잘코늄염화물에 과민증이 있는 사람은 사용하지 않습니다. 점비약 알레르기 경험자, 최근에 코 수술을 했거나 코 안에 병변이 있는 사람은 사용 전 약사 또는 의사와 상의하세요. 이 약은 벤잘코늄염화물을 함유하여 드물게 기관지 경련을 일으킬 수 있습니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 8. 초안별 source 근거

| 초안 | 대표 원문 제품(예시) | source_type |
|---|---|---|
| 자일로메타졸린 0.1% | 오트리빈멘톨0.1%분무제(자일로메타졸린염산염) | mfds_easy_drug |
| 자일로메타졸린 0.05% | 메타리빈액0.05%(자일로메타졸린염산염) | mfds_easy_drug |
| 옥시메타졸린 | 오트리빈에스비강분무액(옥시메타졸린염산염) | mfds_easy_drug |
| 페닐레프린 0.5% | 시네프린나잘액0.5%(페닐레프린염산염) | mfds_easy_drug |
| 염화나트륨 | 노즈스위퍼스프레이(염화나트륨) | mfds_easy_drug |

## 9. 보류/제외 그룹과 사유

| bucket | 대상 | masters | 원문 | 작업상 분류 | 사유 |
|---|---|---:|---:|---|---|
| nasal_combo | 자일로/옥시/나파졸린 복합 + 기타(R01AB02/06/07, R01AX30) | 59 | 43 | needs_review | 복합 조성(혈관수축제+항히스타민 등)이 품목별로 달라 성분 조합을 원문에서 개별 확인해야 초안 가능 |
| nasal_antiallergic | 케토티펜(R01AC), 레보카바스틴(R01AC02) | 4 | 0 | hold_source | e약은요 원문 없음 → 효능·용법·주의 근거 부족, 항히스타민 비강제라 약사 검토 대상 |
| nasal_saline_or_moisturizing | 덱스판테놀(R01AX) | 5 | 5 | needs_review | 보습성 비강제, 성분·용법 원문 개별 확인 후 저위험 초안 가능 |
| nasal_saline_or_moisturizing | 무 ATC 나잘스프레이(클린톡톡) | 2 | — | defer | 성분·원문 확인 필요 |
| exclude | 에페린플러스정(R01AB, 정제) | 3 | — | exclude | ATC는 R01(비강)이나 실제 **경구 정제** → nasal route 아님(STAGE1 ATC 경구 오탐 유형) |
| nasal_steroid_or_hold | (해당 없음) | 0 | — | — | **OTC에 R01AD 비강 스테로이드 0건 — 전량 전문의약품** |

## 10. registry 반영 제안

DB·registry 상태는 변경하지 않았다. 아래는 제안만.

| group_key | bucket | batch | status |
|---|---|---|---|
| `...xylometazoline_hcl::0.1pct::nasal_spray` | nasal_decongestant | BATCH-NASAL | draft_written |
| `...xylometazoline_hcl::0.05pct::nasal_spray` | nasal_decongestant | BATCH-NASAL | draft_written |
| `...oxymetazoline_hcl::unspecified::nasal_spray` | nasal_decongestant | BATCH-NASAL | draft_written |
| `...phenylephrine_hcl::0.5pct::nasal_drop` | nasal_decongestant | BATCH-NASAL | draft_written |
| `...sodium_chloride::unspecified::nasal_wash` | nasal_saline_or_moisturizing | BATCH-NASAL | draft_written |
| 혈관수축 복합제(R01AB*/R01AX30) | nasal_combo | BATCH-NASAL | needs_review |
| 항히스타민 비강제(케토티펜/레보카바스틴) | nasal_antiallergic | BATCH-NASAL | hold_source |
| 덱스판테놀 보습 비강제 | nasal_saline_or_moisturizing | BATCH-NASAL | needs_review |

## 11. 필수 표 (WO §14)

| group_key | bucket | ingredient | concentration | dosage_form | master_count | grounding | action | reason |
|---|---|---|---|---|---:|---|---|---|
| drug_otc::single::nasal::xylometazoline_hcl::0.1pct::nasal_spray | nasal_decongestant | 자일로메타졸린염산염 | 0.1% | nasal_spray | 25 | e약은요 | draft_written | 성인·원문 충분 |
| drug_otc::single::nasal::xylometazoline_hcl::0.05pct::nasal_spray | nasal_decongestant | 자일로메타졸린염산염 | 0.05% | nasal_spray | 18 | e약은요 | draft_written | 소아·연령 분리 |
| drug_otc::single::nasal::xylometazoline_hcl::unspecified::nasal_spray | nasal_decongestant | 자일로메타졸린염산염 | unspecified | nasal_spray | 18 | e약은요 부분 | needs_review | 명칭 농도 미표기, 원문에서 농도 확정 후 위 두 그룹에 편입 |
| drug_otc::single::nasal::oxymetazoline_hcl::unspecified::nasal_spray | nasal_decongestant | 옥시메타졸린염산염 | unspecified | nasal_spray | 36 | e약은요 | draft_written | 7일 제한 |
| drug_otc::single::nasal::phenylephrine_hcl::0.5pct::nasal_drop | nasal_decongestant | 페닐레프린염산염 | 0.5% | nasal_drop | 15 | e약은요 | draft_written | 소아 용량 별도 |
| drug_otc::single::nasal::sodium_chloride::unspecified::nasal_wash | nasal_saline_or_moisturizing | 염화나트륨 | unspecified | nasal_wash | 50 | e약은요 | draft_written | 저위험 세척·보습 |
| drug_otc::combo::nasal::xylometazoline_combo::unspecified::nasal_spray | nasal_combo | 자일로메타졸린 복합 | unspecified | nasal_spray | 13 | e약은요 | needs_review | 조성 품목별 확인 |
| drug_otc::combo::nasal::oxymetazoline_combo::unspecified::nasal_spray | nasal_combo | 옥시메타졸린 복합 | unspecified | nasal_spray | 20 | e약은요 | needs_review | 조성 품목별 확인 |
| drug_otc::combo::nasal::naphazoline_combo::unspecified::nasal_drop | nasal_combo | 나파졸린 복합 | unspecified | nasal_drop | 16 | e약은요 부분 | needs_review | 나파졸린+항히스타민 등 |
| drug_otc::combo::nasal::decongestant_combo_other::unspecified::nasal_spray | nasal_combo | 기타 복합(R01AX30) | unspecified | nasal_spray | 10 | e약은요 | needs_review | 조성 확인 |
| drug_otc::single::nasal::dexpanthenol::unspecified::nasal_spray | nasal_saline_or_moisturizing | 덱스판테놀 | unspecified | nasal_spray | 5 | e약은요 | needs_review | 보습성, 원문 개별 확인 |
| drug_otc::single::nasal::ketotifen::unspecified::nasal_drop | nasal_antiallergic | 케토티펜푸마르산염 | unspecified | nasal_drop | 1 | 없음 | hold_source | 원문 부재 |
| drug_otc::single::nasal::levocabastine::unspecified::nasal_drop | nasal_antiallergic | 레보카바스틴염산염 | unspecified | nasal_drop | 3 | 없음 | hold_source | 원문 부재 |
| (무 ATC) 클린톡톡비나잘스프레이 | nasal_saline_or_moisturizing | 미확정 | unspecified | nasal_spray | 2 | 미확인 | defer | 성분·원문 확인 필요 |
| 에페린플러스정(R01AB) | exclude | 에페드린 복합(경구) | — | tablet | 3 | — | exclude | 경구 정제, nasal route 아님 |

> `unspecified` 농도 자일로메타졸린 18건은 명칭에 농도가 없어 원문에서 0.1%/0.05% 확정 후 초안 1·2에 편입한다(창작 금지).

## 12. 중복/충돌 여부

- 초안 1·2(자일로메타졸린 0.1% vs 0.05%)는 **의도적 분리**다. 효능은 같으나 대상 연령·용량이 달라(§3.5·§3.10) 같은 설명서로 복사하면 안 된다.
- 나파졸린은 단일 점비액이 없고 복합제(R01AB02)로만 존재 → 단일 초안 미작성, `nasal_combo` needs_review로 일원화(중복 회피).
- EYE batch의 충혈완화제(나파졸린 등 점안)와 본 batch 점비제는 route가 다르므로 별도 group(가이드 §3.10). 충돌 없음.

## 13. 금지사항 준수 확인

| 항목 | 결과 |
|---|---|
| DB write (INSERT/UPDATE/DELETE/DDL) | 0 (SELECT 전용) |
| `product_candidate_description_drafts` 변경 | 0 |
| `shared_product_descriptions` 변경 | 0 (read-only) |
| `product_drug_extensions` 변경 | 0 |
| `ProductMaster`/`ProductCandidate` 상태 변경 | 0 |
| canonical 승격 | 0 |
| registry 상태 직접 변경 | 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | 0 |
| 처방의약품 설명 작성 | 0 |
| 농도/함량 창작 | 0 (원문·명칭 값만, 없으면 unspecified) |

## 14. 후속 작업 제안

WO §17 기준 판정: 대표 초안 5건이 원문 grounding으로 작성됨(A안). 다만 combo 59·antiallergic 4·source-gap 존재.

1. **A. `WO-...-BATCH-NASAL-DRAFT-DB-APPLY-DESIGN-V1`** — 본 5개 초안을 `product_candidate_description_drafts` 적재 가능성 + admin review 노출 기준 설계(실제 write는 별도 apply WO).
2. **B. `WO-...-NASAL-STEROID-AND-ANTIALLERGIC-REVIEW-V1`** — 비강 스테로이드는 OTC 0건(전량 RX)으로 확인됨. 항히스타민 비강제(케토티펜·레보카바스틴 4건)는 원문 없음 → OTC/RX 여부·안전문구·원천 확보 검토.
3. **C. `WO-...-NASAL-SOURCE-GAP-AUDIT-V1`** — 원문 없는 70건(235−165) 중 항히스타민·combo 우선 e약은요/허가 원천 확보 조사.
4. 병렬 트랙(STAGE1 §12): STAGE2b(점안 other 성분 추출) / BATCH-ORAL-LOCAL-DRAFT(트로키·가글 219) / BATCH-RECTAL-VAGINAL-MANUAL-DRAFT.

---

### 부록 A — 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-NASAL-DRAFT-V1

수행:
- 점비/비강 후보 read-only 재확인 (ATC R01A* 1차 + 엄격 name-route, R01B* 경구 제외)
- 원문(SPD content) 보유 확인
- 성분·제형·농도·사용기간 기준 group 후보 분리 (bucket 8종)
- 경구 비염약(R01B* 683) 제외, name 브랜드명 오탐 제거
- e약은요/SPD 원문 grounding 기반 대표 설명서 초안 5건 작성
- 보류(needs_review/hold_source/defer)·제외 그룹 사유 기록

결과:
- 점비/비강 후보: 235 (원문 165 / 70%)
- group 후보(bucket): decongestant 112 / combo 59 / saline·moisturizing 57 / antiallergic 4 / exclude 3 / steroid 0
- 작성 그룹: 5 (자일로메타졸린 0.1%·0.05%, 옥시메타졸린, 페닐레프린 0.5%, 염화나트륨)
- 작성 초안 수: 5 (draft_written)
- needs_review: combo 59 + 덱스판테놀 5 (원문 있으나 조성/성분 개별 확인)
- hold_source: 항히스타민 비강제 4 (케토티펜·레보카바스틴, 원문 없음)
- defer: 무 ATC 2
- exclude: 에페린플러스정 3 (경구 정제 오탐), 경구 R01B* 683 (nasal route 아님)
- 핵심: spec=병 용량(농도 아님), 비강 스테로이드 OTC 0건(전량 RX), 혈관수축제 반동성 비충혈·7일/3일 사용제한 원문 반영

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0 / 농도 창작 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-NASAL-DRAFT-V1.md

다음 제안:
- BATCH-NASAL-DRAFT-DB-APPLY-DESIGN (초안 5건 적재 설계)
- 또는 NASAL-STEROID-AND-ANTIALLERGIC-REVIEW (항히스타민 4건 원천 확보)
- 또는 NASAL-SOURCE-GAP-AUDIT (원문 없는 70건)
```
