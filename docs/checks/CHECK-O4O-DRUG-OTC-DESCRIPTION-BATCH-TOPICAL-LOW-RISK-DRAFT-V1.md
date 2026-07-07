# CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1

## 1. 작업 일시

2026-07-07

WO: `WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1`

이번 CHECK는 **운영 DB read-only 원문 grounding 기반 외용 저위험군 설명서 초안 dry-run** 결과다. DB write·canonical 승격·registry 상태 변경은 하지 않았다.

> DB 도구가 없던 다른 실행 환경의 preflight("도구 없음")는 이 방과 무관하다. 이 세션은 STAGE1·STAGE2·본 batch를 실제 실행한 DB 접근 가능 환경이다(gcloud + cloud-sql-proxy + psql, netureyoutube). 실제와 어긋나는 BLOCKED CHECK는 만들지 않는다.

## 2. 사용한 기준 문서

```text
docs/work-orders/WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-NONORAL-STAGE1-INVENTORY-AND-PRIORITY-V1.md
docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-EYE-DRAFT-STAGE2-V1.md
```

누락(중단 사유 아님): `docs/registries/O4O-DRUG-OTC-DESCRIPTION-GROUP-REGISTRY-V1.md`, `docs/guides/O4O-DRUG-STORE-DESCRIPTION-WRITING-GUIDE-V1.md`.

## 3. DB read-only 확인

- 접속: `cloud-sql-proxy netureyoutube:asia-northeast3:o4o-platform-db` (127.0.0.1:16433) + `psql` user `o4o_api`.
- 실행: **SELECT 전용**. 한글 정규식 UTF-8 `.sql` + `psql -f`.
- 원문: `shared_product_descriptions.content`, `source_type='mfds_easy_drug'` (e약은요).

## 4. 외용제 후보 재확인

| 구분 | 수 |
|---|---:|
| 외용 topical 후보(name-route) | 2,710 |
| 원문(SPD content) 보유 | 1,562 (58%) |

### 4.1 위험/저위험 하위버킷 (원문 보유 기준)

| 버킷 | 총 | 원문 보유 | 처리 |
|---|---:|---:|---|
| **LOW 항진균(D01 등)** | 622 | 381 | 작성 대상 |
| **LOW 보습·피부보호(D02: 요소·덱스판테놀 등)** | 170 | 93 | 작성 대상 |
| **LOW 소독(D08: 포비돈요오드·클로르헥시딘 등)** | 104 | 85 | 작성 대상 |
| HOLD 스테로이드(D07) | 558 | 336 | hold_for_pharmacist |
| HOLD 항생제(D06) | 506 | 281 | hold_for_pharmacist |
| HOLD 국소마취(N01BB) | 234 | 116 | hold_for_pharmacist |
| MID 상처치료(D03)/진양(D04)/외용NSAID(M02) | 257 | 138 | 이번 batch 제외(후속) |
| 미백(하이드로퀴논 등) | — | — | hold_for_pharmacist(효능표현 주의) |

## 5. 저위험 외용군 선별 기준

- 원문(SPD content) 보유 + 성분·제형 명확 + 스테로이드/항생제/국소마취/미백 제외.
- **spec 첫 토큰은 튜브·용기 용량(g/mL)이지 농도가 아님**(STAGE2 확정 재확인) → group_key 농도는 명칭 % 만, 없으면 `unspecified`, 창작 금지.
- **제형별 분리 필수** — 같은 성분이라도 크림/외용액/연고는 적응증·용법이 다를 수 있음(아래 테르비나핀 사례).

### 5.1 핵심 발견 — 같은 성분, 폼별 적응증 상이 (테르비나핀)

| group | 대표 원문 | 적응증 | 용법 |
|---|---|---|---|
| 테르비나핀 **크림** | 라미실크림1% | 피부백선(무좀·완선·체부백선), 어루러기, 피부칸디다증 | 1일 1~2회, 1~2주 |
| 테르비나핀 **외용액(네일)** | 무조날맥스외용액 | 조갑진균증(손·발톱 무좀) | 처음 4주 1일 1회 → 이후 주 1회, 6~12개월, **18세 미만 금지** |

→ 점안(폼별 성분군 분리)과 동일 원리. 폼을 group_key에 포함해 분리한다.

## 6. 원문 grounding 방식

각 성분군 대표 제품의 `content`(효능·효과 / 용법·용량 / 사용상 주의사항 / 이상반응)를 직접 조회해 근거로 사용. 원문에 없는 농도·기간·주의는 창작하지 않음.

## 7. 작성한 설명서 초안 목록

| # | group_key | status | 농도 grounding |
|---:|---|---|---|
| 1 | `drug_otc::single::topical::terbinafine_hcl::1pct::cream` | drafted | 명칭 1% |
| 2 | `drug_otc::single::topical::terbinafine_hcl::unspecified::solution` | drafted(주의) | 네일, 18세미만 금지 |
| 3 | `drug_otc::single::topical::clotrimazole::1pct::cream` | drafted | 명칭 1% |
| 4 | `drug_otc::single::topical::ketoconazole::unspecified::topical` | drafted | 비듬·지루·어루러기 |
| 5 | `drug_otc::single::topical::urea::unspecified::cream` | drafted | 농도 미표기(10~40%) |
| 6 | `drug_otc::single::topical::dexpanthenol::unspecified::ointment` | drafted | 농도 미표기(대개 5%) |
| 7 | `drug_otc::single::topical::povidone_iodine::unspecified::topical` | drafted | 소독, 갑상선/신생아 금기 |

> 클로르헥시딘(외용액/크림 각 6건)은 `draft_ready`로 두고 이번 batch 본문은 생략(소규모, 후속 편입).

---

### 초안 1 — 테르비나핀염산염 1% 크림

```text
group_key: drug_otc::single::topical::terbinafine_hcl::1pct::cream
status: drafted   grounding: mfds_easy_drug (라미실크림1% 등)
```

| 항목 | 내용 |
|---|---|
| 성분 | 테르비나핀염산염 1% |
| 분류 | 일반의약품 |
| route | 외용(피부) |
| 작용 | 피부사상균(곰팡이)을 억제하는 항진균 성분 |
| 주요 증상 | 발/사타구니/몸의 백선(무좀·완선), 어루러기, 피부칸디다증 |
| 선택 포인트 | 피부(손발톱 아님)의 곰팡이 감염에 성분·농도(1%)·제형 기준으로 선택 |
| 주의 대상 | 임부·수유부, 소아, 이 약 과민증 |

**효능·효과**
피부사상균에 의한 피부진균감염증(발백선(무좀), 사타구니백선(완선), 체부백선), 어루러기, 피부칸디다증에 사용합니다.

**사용 안내**
사용 전 환부를 깨끗이 씻고 완전히 건조한 뒤, 제품의 허가된 용법에 따라 1일 1~2회 얇게 펴 바릅니다(질환에 따라 대개 1~2주). 외용으로만 사용하고, 손톱·두피·입 주위·질 부위, 갈라지거나 짓무른 부위에는 사용하지 않습니다. 눈에 닿지 않게 하고, 의사 지시 없이 밀봉붕대법을 쓰지 않습니다.

**주의 대상**
임부·임신 가능성이 있는 여성·수유부·소아는 사용하지 않습니다. 과민반응, 피부 벗겨짐 등이 나타나면 사용을 중단하고 약사 또는 의사에게 확인하세요. 정해진 기간 사용 후에도 증상이 낫지 않으면 상의하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 2 — 테르비나핀염산염 외용액(손발톱 무좀)

```text
group_key: drug_otc::single::topical::terbinafine_hcl::unspecified::solution
status: drafted (주의)   grounding: mfds_easy_drug (무조날맥스외용액 등). 크림과 적응증·용법 상이
```

| 항목 | 내용 |
|---|---|
| 성분 | 테르비나핀염산염(외용액) |
| 분류 | 일반의약품 |
| route | 외용(손발톱) |
| 작용 | 손발톱의 진균(곰팡이)을 억제하는 항진균 성분 |
| 주요 증상 | 조갑진균증(손·발톱 무좀) |
| 선택 포인트 | 피부 무좀 크림과 달리 손발톱 전용. 장기 사용이 필요 |
| 주의 대상 | 18세 미만, 임부·수유부, 당뇨·면역질환·혈액순환장애 |

**효능·효과**
조갑진균증(손·발톱 무좀)에 사용합니다.

**사용 안내**
제품의 허가된 용법에 따라 사용합니다(대개 처음 4주간 1일 1회, 이후 주 1회). 건강한 손발톱이 자랄 때까지 지속하며 일반적으로 손톱 약 6개월, 발톱 9~12개월이 걸립니다. 손발톱과 인접 피부의 매니큐어·화장품을 제거하고, 바르는 부위를 씻어 완전히 건조한 뒤 얇게 바릅니다. 사용 후 최소 6시간은 씻거나 젖지 않도록 합니다.

**주의 대상**
18세 미만, 임부·임신 가능성이 있는 여성·수유부는 사용하지 않습니다. 당뇨병·면역질환·말초혈관질환, 3개 이상 손발톱 침범 또는 손발톱 기질 침범 등 심한 경우는 사용 전 의사와 상의하고, 반응이 부적절하면 경구 치료가 필요할 수 있습니다.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 3 — 클로트리마졸 1% 크림

```text
group_key: drug_otc::single::topical::clotrimazole::1pct::cream
status: drafted   grounding: mfds_easy_drug (카마졸크림 등)
```

| 항목 | 내용 |
|---|---|
| 성분 | 클로트리마졸 1% |
| 분류 | 일반의약품 |
| route | 외용(피부) |
| 작용 | 진균(곰팡이)을 억제하는 이미다졸계 항진균 성분 |
| 주요 증상 | 백선(무좀), 어루러기, 피부칸디다증, 홍색음선 |
| 선택 포인트 | 광범위한 피부 곰팡이 감염에 성분·농도(1%) 기준으로 선택 |
| 주의 대상 | 만 2세 이하 소아, 임부·수유부, 아미다졸 과민증 |

**효능·효과**
피부사상균·효모·곰팡이에 의한 피부진균증(백선, 어루러기, 피부칸디다증, 칸디다성 외음염·귀두염), 홍색음선에 사용합니다.

**사용 안내**
사용 전 환부를 씻어 물기를 없앤 뒤(특히 발가락 사이 완전 건조), 제품의 허가된 용법에 따라 1일 2~3회 얇게 바르고 문지릅니다. 치료기간은 질환·부위에 따라 다릅니다(대개 1~4주). 외용으로만 사용하고 삼키지 않으며, 각막·결막·심하게 짓무른 부위에는 사용하지 않습니다. 환부에 닿는 수건·양말·옷은 매일 갈아줍니다.

**주의 대상**
만 2세 이하 소아, 이 약·아미다졸 유도체 과민증은 사용하지 않습니다. 임부·수유부는 사용 전 상의하세요. 생식기에 바를 때 콘돔 등 라텍스 제품의 안전성이 감소할 수 있습니다. 혈관부종·과민반응이 나타나면 즉시 중단하고 약사 또는 의사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 4 — 케토코나졸 외용(비듬·지루피부염·어루러기)

```text
group_key: drug_otc::single::topical::ketoconazole::unspecified::topical
status: drafted   grounding: mfds_easy_drug (댄스탑외용액 등). 크림/외용액 제형별 용법 상이 → 제품 안내 우선
```

| 항목 | 내용 |
|---|---|
| 성분 | 케토코나졸 |
| 분류 | 일반의약품 |
| route | 외용(피부·두피) |
| 작용 | 효모균을 억제하는 항진균 성분 |
| 주요 증상 | 비듬, 지루피부염, 어루러기 |
| 선택 포인트 | 두피 비듬·지루성 피부염에 성분 기준으로 선택. 제형(외용액/크림)별 사용법 확인 |
| 주의 대상 | 상처·염증·짓무른 두피, 임부·수유부, 소아 |

**효능·효과**
효모균에 의한 피부질환(비듬, 지루피부염, 어루러기)에 사용합니다.

**사용 안내**
제품의 허가된 용법에 따라 감염 부위에 사용합니다(외용액은 감염 부위에 바른 뒤 3~5분 두었다가 헹굼). 비듬·지루피부염은 대개 주 2회 2~4주, 어루러기는 1일 1회 최대 5일 등 제품별 기간을 따릅니다. 외용으로만 사용하고 눈에 닿지 않게 하며, 들어갔을 경우 충분한 물로 씻어냅니다.

**주의 대상**
과민증, 상처·염증·심하게 짓무른 두피에는 사용하지 않습니다. 임부·수유부·소아는 사용 전 상의하세요. 적용 부위 화끈거림·자극·발진 등이 나타나면 사용을 중단하고 약사 또는 의사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 5 — 요소(우레아) 크림

```text
group_key: drug_otc::single::topical::urea::unspecified::cream
status: drafted   grounding: mfds_easy_drug (보드란크림 등). 농도(10~40%) 명칭 미표기 → 성분군 레벨
```

| 항목 | 내용 |
|---|---|
| 성분 | 요소(우레아) |
| 분류 | 일반의약품 |
| route | 외용(피부) |
| 작용 | 피부 각질을 부드럽게 하고 수분을 유지시키는 보습·각질연화 성분 |
| 주요 증상 | 손발바닥 각피증, 건피증(피부건조), 어린선, 모공성 태선, 아토피 피부 건조 |
| 선택 포인트 | 건조·각질형 피부에. 농도(10~40%)가 제품마다 다르므로 성분·농도 확인 |
| 주의 대상 | 급성 습진·염증성 피부질환, 상처·짓무른 부위, 신부전 광범위 적용 |

**효능·효과**
진행성 지장각피증(주부습진 건조형), 손·발바닥 각피증, 어린선, 노인성 건피증, 모공성 태선, 아토피 피부에 사용합니다.

**사용 안내**
제품의 허가된 용법에 따라 1일 1회 이상 환부를 씻은 다음 바르고 충분히 문지릅니다. 외용으로만 사용하고, 궤양·짓무름·상처 부위에는 직접 바르지 않습니다. 눈·코·입 등 점막에 닿지 않게 합니다.

**주의 대상**
급성 습진·염증성 피부질환, 안점막 등 점막에는 사용하지 않습니다. 신부전 환자에 광범위 적용은 피합니다. 통증·열감·홍조·가려움 등 자극이 나타나면 사용을 중단하고 약사 또는 의사에게 확인하세요. 코르티코이드 등 다른 성분의 피부 흡수를 높일 수 있으므로 병용 시 상의하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 6 — 덱스판테놀 연고

```text
group_key: drug_otc::single::topical::dexpanthenol::unspecified::ointment
status: drafted   grounding: mfds_easy_drug (덱스판연고 등). 농도(대개 5%) 명칭 미표기 → 성분군 레벨
```

| 항목 | 내용 |
|---|---|
| 성분 | 덱스판테놀(D-판테놀) |
| 분류 | 일반의약품 |
| route | 외용(피부) |
| 작용 | 피부·점막의 재생을 돕는 피부보호·보조치료 성분 |
| 주요 증상 | 경미한 상처·화상, 피부염·습진, 기저귀 발진, 유두 균열, 햇볕에 탄 데 |
| 선택 포인트 | 경미한 피부 손상·건조의 보조치료에 성분 기준으로 선택 |
| 주의 대상 | 이 약 과민증, 감염성·삼출성 피부병 |

**효능·효과**
상처, 화상, 찢긴 상처(수유기 유두 균열 등), 욕창, 급·만성 피부염, 습진, 피부궤양, 기저귀 발진, 햇볕에 탄 데(일광피부염)의 보조치료에 사용합니다.

**사용 안내**
상처를 청결히 한 뒤 제품의 허가된 용법에 따라 1일 1~2회 환부에 바릅니다. 수유기 유두 균열에는 매 수유 직후 바릅니다. 눈과의 접촉을 피합니다.

**주의 대상**
이 약·부형제 과민증, 감염성 또는 삼출성 피부병에는 사용하지 않습니다. 자극·발진 등이 나타나면 사용을 중단하고 약사 또는 의사에게 확인하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

---

### 초안 7 — 포비돈요오드 외용(소독)

```text
group_key: drug_otc::single::topical::povidone_iodine::unspecified::topical
status: drafted   grounding: mfds_easy_drug (포리비돈연고 등). 연고/외용액 공통 소독
```

| 항목 | 내용 |
|---|---|
| 성분 | 포비돈요오드 |
| 분류 | 일반의약품 |
| route | 외용(피부·상처) |
| 작용 | 넓은 범위의 균을 소독하는 살균소독 성분 |
| 주요 증상 | 상처·화상·욕창·궤양·고름집 등 감염 피부면의 살균소독 |
| 선택 포인트 | 상처 소독에. 갑상선 질환·신생아 등 금기 확인 |
| 주의 대상 | 신생아·6개월 미만 영아, 갑상선기능 이상, 신부전, 임부·수유부 |

**효능·효과**
찢긴 상처, 화상, 상처, 욕창, 궤양, 고름집, 감염 피부면, 주사·카테터 부위의 살균소독에 사용합니다.

**사용 안내**
환부를 깨끗이 씻은 뒤 제품의 허가된 용법에 따라 1일 여러 차례 적당량 바르고, 필요 시 드레싱·붕대로 덮습니다. 안과용·내복용으로 사용하지 않으며, 눈에 들어가면 즉시 물로 씻습니다. 비누는 살균작용을 약화시키므로 충분히 씻어 제거한 뒤 사용합니다.

**주의 대상**
이 약 과민증, 신생아·만 6개월 미만 영아, 방사성요오드 치료 전후, 갑상선기능 이상(결절성/지방병성 갑상선종·하시모토갑상선염 등), 신부전, 포진상 피부염 환자는 사용하지 않습니다. 임부·수유부, 심한 화상·갑상선/신부전 경험자는 사용 전 상의하세요.

**성분 기준 선택**
의약품은 원료·제조·품질관리 전 과정이 GMP 기준으로 관리됩니다.
같은 성분·함량·제형의 제품은 동일한 기준으로 품질과 효능·효과가 관리됩니다.
제품명보다 성분·함량을 기준으로 약사에게 확인하세요.

## 8. 보류한 그룹과 사유

| 대상 | 총 | 원문 | 작업상 분류 | 사유 |
|---|---:|---:|---|---|
| 스테로이드 외용(D07) | 558 | 336 | hold_for_pharmacist | 장기·넓은부위·얼굴·소아 주의 |
| 항생제 외용(D06) | 506 | 281 | hold_for_pharmacist | 내성·감작·상처 상태 |
| 국소마취(N01BB) | 234 | 116 | hold_for_pharmacist | 용량·점막 흡수·부위 제한 |
| 미백(하이드로퀴논 등) | — | — | hold_for_pharmacist | 효능 표현·사용 기간 |
| 상처(D03)/진양(D04)/외용NSAID(M02) | 257 | 138 | draft_ready(후속) | 이번 batch 범위 외(광과민/중복 검토) |
| other cream(복합·기타 azole 등) | 214 | 149 | hold_for_source | 성분 원문 확정 후 편입 |
| 클로르헥시딘 | 12 | 12 | draft_ready | 소규모, 후속 편입 |

## 9. 스테로이드/항생제/국소마취제 분리 결과

- 저위험 3군(항진균/보습/소독)만 작성, **스테로이드 558·항생제 506·국소마취 234는 자동 작성하지 않음**(hold_for_pharmacist).
- 스테로이드+항생제 복합, 항생제 복합은 별도 combo 큐레이션 대상.

## 10. registry 반영 제안

| group_key | batch | status |
|---|---|---|
| `...terbinafine_hcl::1pct::cream` | BATCH-TOPICAL-LOW-RISK | drafted |
| `...terbinafine_hcl::unspecified::solution` | BATCH-TOPICAL-LOW-RISK | drafted(주의) |
| `...clotrimazole::1pct::cream` | BATCH-TOPICAL-LOW-RISK | drafted |
| `...ketoconazole::unspecified::topical` | BATCH-TOPICAL-LOW-RISK | drafted |
| `...urea::unspecified::cream` | BATCH-TOPICAL-LOW-RISK | drafted |
| `...dexpanthenol::unspecified::ointment` | BATCH-TOPICAL-LOW-RISK | drafted |
| `...povidone_iodine::unspecified::topical` | BATCH-TOPICAL-LOW-RISK | drafted |
| 스테로이드/항생제/국소마취/미백 | BATCH-TOPICAL-HIGH-RISK | hold_for_pharmacist |

## 11. 금지사항 준수 확인

| 항목 | 결과 |
|---|---|
| DB write | 0 (SELECT 전용) |
| `product_candidate_description_drafts` 변경 | 0 |
| `shared_product_descriptions` 변경 | 0 (read-only) |
| `ProductDrugExtension` 변경 | 0 |
| `ProductMaster`/`ProductCandidate` 상태 변경 | 0 |
| canonical 승격 | 0 |
| registry 상태 직접 변경 | 0 |
| 매장 콘텐츠/QR/POP/태블릿 연결 | 0 |

## 12. 완료 보고

```text
완료 보고 — WO-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1

수행:
- 외용제 후보 read-only 재확인
- 원문 보유 저위험군 분리 (항진균/보습/소독)
- e약은요/SPD content 원문 grounding
- 설명서 초안 7건 작성
- 스테로이드/항생제/국소마취/미백 분리(hold)

결과:
- 외용제 후보: 2,710 (원문 1,562)
- 저위험 후보: 항진균 622(원문381) / 보습 170(93) / 소독 104(85)
- 작성 그룹: 7 (테르비나핀 크림/네일 · 클로트리마졸 · 케토코나졸 · 요소 · 덱스판테놀 · 포비돈요오드)
- hold_for_pharmacist: 스테로이드558 / 항생제506 / 국소마취234 / 미백
- hold_for_source: other cream 214
- 핵심: spec=용기용량(농도 아님), 같은 성분도 폼별 적응증 상이(테르비나핀 크림 vs 네일)

금지사항: DB write 0 / drafts 0 / SPD 0 / ext 0 / canonical 0 / registry 0

산출물:
- docs/checks/CHECK-O4O-DRUG-OTC-DESCRIPTION-BATCH-TOPICAL-LOW-RISK-DRAFT-V1.md

다음 제안:
- BATCH-PATCH-DRAFT
- 또는 BATCH-EYE-ANTIALLERGY-CURATION
- 또는 STAGE2b(점안 other 603 성분 추출)
```
