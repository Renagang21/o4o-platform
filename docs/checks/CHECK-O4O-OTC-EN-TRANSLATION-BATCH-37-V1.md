# CHECK-O4O-OTC-EN-TRANSLATION-BATCH-37-V1 — A군 37그룹 영문 번역 배치

WO: `WO-O4O-OTC-EN-TRANSLATION-BATCH-37-V1` · 일자: 2026-07-16 · 상태: 완료 (번역 생성)
선행: [FANOUT-DESIGN](CHECK-O4O-OTC-EN-GROUP-TO-MASTER-FANOUT-DESIGN-V1.md) (TranslationUnit 37) · [EN-PERSIST-PILOT](CHECK-O4O-OTC-EN-TRANSLATION-PERSIST-PILOT-V1.md) (5건 기준)
지침: [번역 GUIDE V0.5](../guides/OTC-EN-TRANSLATION-GUIDE.md) · [GLOSSARY V0.4](../guides/OTC-KO-EN-GLOSSARY.md)

> **번역 생성 전용.** DB write **0** · 영문 추가 저장 **0** · 상태 변경 **0**.

---

## 1. 결론

> **37그룹 번역 완료** (신규 32 + 파일럿 5 재사용). 자동 검수 **전건 통과** · sd-* 렌더 **148/148 PASS**.
> **저장 대상 681 유지 확인**(DB 무변경). **GUIDE·GLOSSARY 수정 불필요 — 3회 연속 무수정 통과.**

---

## 2. 입력 (TranslationUnit 37)

| 항목 | 값 |
|---|---|
| 한국어 canonical 구조화 콘텐츠 | `efficacy`·`usage`·`usageLabel`·`caution`·`summaryTable` |
| route | **`{"oral": 37}`** — 전건 경구(DR-019) → 동사 `take` |
| translatorNote | **13그룹** 보유 (참고 전용) |
| GUIDE·GLOSSARY 버전 | **V0.5 / V0.4** (산출물에 기록) |
| **ProductMaster 목록** | **미포함** ✅ — 번역 입력에 masterIds 없음(검증: `units37.json` 에 `masterId` 문자열 0) |

---

## 3. 산출물

| 산출물 | 위치 |
|---|---|
| **구조화 번역 결과 파일** (apply 가 읽음) | [translations/otc-en-translations-v1.json](../guides/products/drug/pilot-en-design/translations/otc-en-translations-v1.json) — 37건 |
| **그룹별 sd-* HTML 37건** | [translations/html/](../guides/products/drug/pilot-en-design/translations/html/) |
| 영문 HTML 빌더 (신규) | `modules/neture/drug-import/drug-otc-en-consumer-html.ts` — 입력 타입에 `bodyMarkdown`·`translatorNote` **없음**(CR-021 타입 강제) |
| 번역 TEST-LOG | [T-11](../guides/OTC-EN-TRANSLATION-TEST-LOG.md) |
| 오류·용어 후보 | §5-3 |

**결과 파일 계약**

```jsonc
{ "version":"v1", "guideVersion":"…V0.5", "glossaryVersion":"…V0.4",
  "translations":[ { "groupKey", "title", "usageLabel", "efficacy", "usage", "caution", "summaryTable" } ] }
```

- `groupKey` 로 한국어 canonical 과 매칭 → **masterIds 는 저장 단계가 결정**(번역/저장 분리 유지).
- `translatorNote` 는 **파일에 포함하지 않는다** — 참고 전용이라 산출물에 남기지 않음.

---

## 4. 검수 — 전건 통과

| 기준 | 결과 |
|---|---|
| **숫자·단위·연령·횟수·기간 일치** | ✅ **진짜 누락 0** (§5-1) |
| **효능·용법·금기·주의사항 누락 0** | ✅ 37/37 필수 필드 완비 |
| **원문에 없는 의학 정보 추가 0** | ✅ |
| **translatorNote 본문 자동 삽입 0** | ✅ 주석 보유 13그룹 전수 검사 — 주석 고유 어절 **0** |
| **내부 주석 노출 0** | ✅ |
| **한글 잔존** | ✅ **0** |
| **`bodyMarkdown` 사용 금지** | ✅ 빌더 입력 타입에 없음 |
| sd-* 렌더 | ✅ **148/148** (37 × 4폭) — 잘림 0 · 가로 스크롤 0 · `<table>` 0 · 단 구성 기대치 일치 |

### 4-1. 렌더 실측 (37건 × 4폭)

| 뷰포트 | `sd-core` | 결과 |
|---|---|---|
| 375 | 1열 | ✅ 37/37 |
| 768 | 2열 | ✅ 37/37 |
| 1024 | 3열 | ✅ 37/37 |
| 1280 | 3열 | ✅ 37/37 |

---

## 5. 검수에서 나온 것

### 5-1. ⚠️ 수치 검사 오탐 20건 — 추적해 전부 기각

1차 자동 검사가 20그룹을 "숫자 누락"으로 표시했으나 **진짜 누락은 0**이었다.

| 유형 | 예 | 판정 |
|---|---|---|
| 숫자 → 영어 **단어** | `1일 3회` → `three times a day` | 정상(T-07) |
| **분수** | `1/2정(5mg)` → `half a tablet (5 mg)` | 정상 |
| `1회`·`1일` **관용 표현** | `1일 2~3g` → `2–3 g a day` | 정상 |

> **교훈**: 한국어 숫자를 **영문 숫자 토큰으로만** 대조하면 소비자 톤 번역이 전부 오탐이 된다. `one/once/two/twice/three…` 를 함께 봐야 한다. (앞선 WO 들의 `550mg`·`내복 금지` 오탐과 같은 계열 — **자동 검사는 항상 출처 추적 후 판정**.)

### 5-2. 파일럿 5건 대조 — **차이 0**

`덱스판테놀 / 사카로마이세스 / 알벤다졸 / 덱시부프로펜 / 세티리진` 의 `efficacy`·`usage`·`caution` 이 파일럿 저장분과 **완전 동일**.
→ **재번역하지 않았고, 덮어쓸 차이도 없다.** (WO "파일럿 번역과 새 번역이 다르면 기록" 조건 = 해당 없음)

### 5-3. 용어 후보 (GLOSSARY 반영 **안 함** — 1회성)

| 원문 | 사용 | 판단 |
|---|---|---|
| 정장(整腸) | settle the gut / improve the balance of gut bacteria | 1:1 대응어 없음 → 기능 서술. **반복 시 등재 검토** |
| 거담 | help you cough it up | 소비자 톤 |
| 서방정 | slow-release tablet | |
| 우유 알칼리 증후군 | milk-alkali syndrome | 의학 표준어 |

> 반복되지 않았으므로 **GLOSSARY 미반영**. GUIDE §5 승격 규칙대로 TEST-LOG 에만 남겼다.

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 37그룹 영문 번역 완료 | ✅ (신규 32 + 파일럿 5 재사용) |
| 번역 검수 결과 기록 | ✅ §4 · TEST-LOG T-11 |
| **저장 대상 예상치 681건 유지 확인** | ✅ fanout dry-run 재실행 — **37그룹 / 686 master / 기존 en 5 / INSERT 681 / UPDATE 0** 불변 |
| DB 변경 없음 | ✅ **0** |

---

## 7. 다음 (681건 저장 apply)

| 항목 | 값 |
|---|---|
| 입력 | `otc-en-translations-v1.json` (37) + fanout plan(그룹→master) |
| 저장 | **681 rows** · `STORE`/`en`/**`needs_review`** · `source_ref_id` = ko 와 동일 |
| 가드 | 기존 en 제외 · 그룹 간 master 중복 시 중단 · UPDATE 경로 없음 · 이중 게이트 |
| **선결** | **37건 사람 검수** — 본 CHECK 는 **자동 검수**까지다. WO 조건 "37건 전체가 검수된 뒤에만 681 저장" |

**참고**: typecheck 내 파일 0 오류 / build 는 타 세션 `e41c78157` 선행 결함(무관).
