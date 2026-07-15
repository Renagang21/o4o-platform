# OTC-EN-TRANSLATION-TEST-LOG — 테스트 번역 및 오류 기록

상태: **Active (기록 문서)** · V0.3 (2026-07-15) · 대상: **일반의약품(OTC) 전용**
지침: [OTC-EN-TRANSLATION-GUIDE](OTC-EN-TRANSLATION-GUIDE.md) · 권장 표현: [OTC-KO-EN-GLOSSARY](OTC-KO-EN-GLOSSARY.md)

> 테스트 번역 **1건마다 §2 양식을 복사해 1개 블록**을 추가한다.
> 용어 불일치 자체는 **오류가 아니다** (GLOSSARY는 고정 사전이 아님). 문맥상 어느 표현이 나았는지를 기록한다.
>
> ⚠️ **이 문서는 실행 결과(CHECK 역할)다 — 규칙이 여기 살면 안 된다.**
> 1회성 이슈는 여기 남기고, 반복될 것은 승격한다: 표현 = GLOSSARY / 기준 = GUIDE / 의약품 공통 = DR / 제품군 공통 = CR.
> 판단 기준은 **[GUIDE §5](OTC-EN-TRANSLATION-GUIDE.md)** 에 있다(여기서 반복하지 않는다).

---

## 1. 기록 현황

| # | 대상 설명서 | 작업일 | GUIDE | GLOSSARY | 반영 |
|---|---|---|---|---|---|
| T-1 | P1 트리메부틴말레산염 200mg 정 | 2026-07-15 | V0.5 | V0.2 | GLOSSARY V0.3 |
| T-2 | P2 니자티딘 75mg 정 | 2026-07-15 | V0.5 | V0.2 | GLOSSARY V0.3 |
| T-3 | P3 나프록센나트륨 275mg 정 | 2026-07-15 | V0.5 | V0.2 | CR-021 |
| T-4 | P4 클로트리마졸 100mg 질정 | 2026-07-15 | V0.5 | V0.2 | **DR-019** |
| T-5 | P5 데소게스트렐 0.075mg 정 | 2026-07-15 | V0.5 | V0.2 | GLOSSARY V0.3 |

> 시안: [TRANSLATION-DRAFTS-V1](products/drug/pilot-en-design/TRANSLATION-DRAFTS-V1.md) · 판정: [CHECK-...-PILOT-VALIDATION-V1](../checks/CHECK-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1.md)
> ⚠️ 5건 모두 **DB 저장 없음**. 한국어 초안이 `needs_review` 라 영문은 시안 지위다.

---

## 2. 기록 양식 (복사해서 사용)

```markdown
### T-{번호} — {대상 설명서}

- 대상 설명서:
- 작업일:
- 사용 지침서 버전: GUIDE V0.x / GLOSSARY V0.x
- 언어: en

**정보 검증 (엄격 — GUIDE §2.1)**

| 확인 | 결과 | 비고 |
|---|---|---|
| 효능·효과 / 용법·용량 / 금기 / 주의사항 누락 없음 | OK / 문제 | |
| 숫자·단위·연령·횟수·기간·농도 원문 일치 | OK / 문제 | |
| 원문에 없는 의학적 정보 추가 없음 | OK / 문제 | |
| 소비자 톤 전환으로 의미·조건·범위 변화 없음 | OK / 문제 | |
| 안전 표현(GLOSSARY §5 G-01~G-04) 준수 | OK / 문제 | |

**표현 검증 (소비자 톤 — GUIDE §2.2)**

| 확인 | 결과 | 비고 |
|---|---|---|
| 소비자가 읽기에 자연스러운 문장 | OK / 문제 | |
| 직역투 표현 잔존 없음 | OK / 문제 | |
| 판매 표현이 원문보다 강해지지 않음 | OK / 문제 | |

**어려웠던 표현**
| 원문 | 사용한 표현 | 무엇이 어려웠나 |
|---|---|---|
| | | |

**직역투로 남았던 표현**
| 원문 | 직역투 초안 | 소비자 톤 수정 |
|---|---|---|
| | | |

**숫자·단위 오류**
| 위치 | 원문 | 번역 | 조치 |
|---|---|---|---|
| | | | |

**누락 / 추가 내용**
| 위치 | 유형(누락·추가) | 내용 | 조치 |
|---|---|---|---|
| | | | |

**GLOSSARY 대비 다르게 쓴 표현** (오류 아님 — 문맥 판단 기록)
| 원문 | GLOSSARY 권장 | 실제 사용 | 왜 바꿨나 |
|---|---|---|---|
| | | | |

**수정 결과**
-

**반영 판정** (기준 = [GUIDE §5](OTC-EN-TRANSLATION-GUIDE.md) · 버전·이력 갱신 = OR-005)

- [ ] 이 1건만 → **본 TEST-LOG에만** (승격 없음)
- [ ] 반복되는 표현 → **GLOSSARY**
- [ ] 반복되는 기준 → **GUIDE**
- [ ] 의약품 전반 규칙 → **DR-NNN** (ID: )
- [ ] 제품군 공통 규칙 → **CR-NNN** (ID: )

> **기존 규칙으로 설명되면 신설하지 않고 보완한다.** 신설했다면 사유를 적는다.

| 대상 | 반영 여부 | 내용 |
|---|---|---|
| GUIDE | 미반영 / 반영(V0.x) | |
| GLOSSARY | 미반영 / 반영(V0.x) | |
| DR / CR | 미반영 / 반영(ID) | |
| 신설 사유 (신설 시에만) | | |
```

---

## 3. 기록

### T-1~T-5 — 파일럿 5건 (2026-07-15, GUIDE V0.5 / GLOSSARY V0.2)

번역 기준 데이터 = `efficacy`·`usage`·`caution`·`summaryTable`. `bodyMarkdown` 은 번역 대상 제외(재구성본 + 내부 주석 포함).

**정보 검증 (§2.1)**

| 확인 | 결과 | 비고 |
|---|---|---|
| 효능·용법·금기·주의사항 누락 없음 | **OK** (5/5) | 4필드 전량 이관 |
| 숫자·단위·연령·횟수·기간 원문 일치 | **OK** (5/5) | 아래 대조표 |
| 원문에 없는 의학적 정보 추가 없음 | **OK** | |
| 의미·조건·범위 변화 없음 | **OK** | |
| 안전 표현(G-01~G-04) 준수 | **OK** | P4 `insert`, `take/swallow/oral` 미사용 |

**수치 대조 (전건)**

| # | 원문 | 영문 | 결과 |
|---|---|---|---|
| P1 | 100~200mg / 1일 3회 | 100–200 mg / three times a day | OK |
| P2 | 15~79세 / 75mg / 8시간 / 150mg 상한 / 15세 미만 / 80세 이상 | aged 15–79 / 75 mg / after 8 hours / max 150 mg / under 15 / **80 or older** | OK |
| P3 | 2정(550mg) / 6~8시간 / 275mg / 1,350mg / 2세 이하 | two tablets (550 mg) / every 6–8 hours / 275 mg / 1,350 mg / **2 years old or under** | OK |
| P4 | 1정 / 1일 1회 / 연속 6일 | one tablet / once a day / **for 6 days in a row** | OK |
| P5 | 0.075mg / 매일 1정 | 0.075 mg / one tablet every day | OK |

**어려웠던 표현**

| # | 원문 | 사용한 표현 | 무엇이 어려웠나 |
|---|---|---|---|
| P2 | 80세 이상 | `80 or older` | `over 80` 은 80세를 **제외**해 금기 범위가 좁아짐 = T-09 위반. 경계 포함 여부가 영문에서 갈림 |
| P2 | 15세 미만 | `under 15` | 15세 **미포함** 유지 |
| P3 | 2세 이하 | `2 years old or under` | `under 2` 는 2세를 제외 → 금기 축소. `or under` 필수 |
| P3 | 처음 2정(550mg) | `two tablets (550 mg) to start` | **275mg 2정 합계**이지 550mg 제품이 아님. `550 mg tablet` 으로 옮기면 **전문의약품(RX) 지칭** = 중대 오역 |
| P5 | 주요 증상 = 피임 | `Main use = Preventing pregnancy` | 필드명이 "증상"인데 값은 **용도**. 원문 구조 문제 → T-05 적용(고치지 않고 기록) |

**직역투로 남았던 표현**

| 원문 | 직역투 초안 | 소비자 톤 수정 |
|---|---|---|
| 복용 전 약사와 상담하세요 | Consult a pharmacist before administration | **Talk to a pharmacist before taking it** |
| 과민증이 있는 경우 | In case of hypersensitivity | **If you have ever reacted to** |
| 위장 불편감이 있을 수 있어 | Gastrointestinal discomfort may occur | **This medicine can upset your stomach** |
| 질 내 깊숙이 삽입하며 | Insert deeply into the vaginal cavity | **Insert one tablet high into the vagina** |

**GLOSSARY 대비 다르게 쓴 표현** (오류 아님 — 문맥 판단)

| 원문 | GLOSSARY 권장 | 실제 사용 | 왜 바꿨나 |
|---|---|---|---|
| 사용상 주의사항 | Before you use this | **Before you take this** (P1·P2·P3·P5) | 경구는 take, P4(질정)만 use. `usageLabel` 축과 일치시킴 |
| 경구 | by mouth | by mouth (유지) | — |
| 1일 3회 | three times a day | 유지 | — |

**GLOSSARY 신규·수정 후보 → V0.3 반영**

| 항목 | 조치 |
|---|---|
| `사용상의 주의사항` → **`사용상 주의사항`** | 표기 정정(원문 실측 라벨) |
| `분류 = 일반의약품` → **Over-the-counter** | 신규 등재 |
| `~세 이상` → **`N or older`** / `~세 미만` → **`under N`** / `~세 이하` → **`N or under`** | **신규(경계 포함 규칙)** — 오역 최다 지점 |
| 질정 `insert` | `확인 필요` 해제 → 확정 |
| 경구 `by mouth`, 외용 `on the skin` | `확인 필요` 해제(경구만 실증) |

**반영 판정** (기준 = [GUIDE §5](OTC-EN-TRANSLATION-GUIDE.md))

- [x] 반복되는 표현 → **GLOSSARY V0.2 → V0.3**
- [x] 의약품 전반 규칙 → **DR-019** (투여경로는 제형명으로 판단 금지 — P4 실증)
- [x] 제품군 공통 규칙 → **CR-021** (내부 편집 주석 제외 — P1·P3·P4·P5 실증)
- [ ] GUIDE 본문 수정 → 불필요 (T-01~T-10 으로 전건 판정 가능했음)

| 대상 | 반영 여부 | 내용 |
|---|---|---|
| GUIDE | **미반영** | 기존 원칙으로 충분 — 수정 없음이 곧 지침 검증 통과 |
| GLOSSARY | 반영(V0.3) | 표기 정정 + 연령 경계 규칙 + OTC 용어 |
| DR / CR | 반영 | DR-019 · CR-021 |
| 신설 사유 | | DR-019: 기존 DR-002/003/009 는 "경로가 다르면"을 다루나 **경로 판단 근거**는 없음. CR-021: HFF-R07 이 제품군 한정 → 2개 제품군 공통이라 CR 승격 |

---

## 4. 이력

| 버전 | 일자 | 내용 |
|---|---|---|
| V0.1 | 2026-07-15 | 초안 작성 (`WO-O4O-OTC-EN-TRANSLATION-GUIDE-DOCS-V1`). |
| V0.2 | 2026-07-15 | 소비자 톤 기준 반영 — 정보/표현 2층 검증 표, 직역투·GLOSSARY 이탈 기록란 추가 (`WO-O4O-OTC-EN-TRANSLATION-GUIDE-CONSUMER-TONE-REVISION-V1`). |
| V0.3 | 2026-07-15 | 반영 판정란 추가(TEST-LOG / GLOSSARY / GUIDE / DR / CR + 신설 사유). 판단 기준은 GUIDE §5 참조로 연결(중복 기재 안 함). |
