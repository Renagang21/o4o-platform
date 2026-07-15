# CHECK-O4O-OTC-EN-TRANSLATION-PERSIST-PILOT-V1 — 영문 번역 저장 파일럿 5건 (APPLY 완료)

WO: `WO-O4O-OTC-EN-TRANSLATION-PERSIST-PILOT-V1` · 일자: 2026-07-16 · 상태: **완료 (DB 적용됨)**
선행: [CANONICAL-APPLY-AUTO-ONLY](CHECK-O4O-OTC-CANONICAL-APPLY-AUTO-ONLY-V1.md) (A군 686 ko canonical) · 지침: [번역 GUIDE V0.5](../guides/OTC-EN-TRANSLATION-GUIDE.md) · [GLOSSARY V0.4](../guides/OTC-KO-EN-GLOSSARY.md) · [디자인 GUIDE V0.5](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md)

> ⚠️ **프로덕션 DB write 포함** — 영문 **5 rows INSERT**(`en` · `STORE` · **`needs_review`**).
> 한국어 수정 **0** · UPDATE **0** · canonical 승격 **0** · 686건 전체 번역 **미실행**.

---

## 1. 결론

> **영문 저장 구조가 성립한다.** 5건 저장 완료(`dbWrite=5`), 사후검증 **전건 통과**.
> **번역 지침도 재검증 통과** — GUIDE V0.5 / GLOSSARY V0.4 로 **수정 없이** 5건 판정.
> **686건 전체 번역 = 가능** (§8). 단 **그룹→master 팬아웃**과 **검토→canonical 전이**를 먼저 정해야 한다.

---

## 2. 대상 선정 (A군 686 중 구조가 다른 5그룹)

| 축 | 그룹 | ko rows | 지표 |
|---|---|---:|---|
| **짧은 설명서** | 덱스판테놀 100mg 정 | 4 | 총 159자 (A군 최소) |
| **연령 분기** | 사카로마이세스보울라르디균 282.5mg 캡슐 | 5 | 연령 4회 (A군 최다) |
| **용법 장문** | 알벤다졸 400mg 정 | 33 | 용법 137자 (A군 최장) |
| **주의사항 장문** | 덱시부프로펜 300mg 정 | 15 | 주의 203자 (A군 최장) |
| **~~summaryTable 항목 多~~ → master 최다** | 세티리진염산염 10mg 정 | **72** | A군 최대 커버리지 |

> ⚠️ **WO 의 5번째 축(`summaryTable` 항목 많은 설명서)은 성립하지 않았다** — A군 **37그룹 전부 `summaryTable` = 6항목**으로 변별력이 **0**이다(작성 템플릿이 6키 고정).
> 그 축 대신 **master 수 최다**(세티리진 72)로 대체했다. 실전 영향이 가장 큰 그룹이라 검증 가치가 있다.

5건 전부 **한국어 `STORE`/`ko`/`canonical` 존재** 확인 후 진행.

---

## 3. 저장 구조

| 항목 | 값 |
|---|---|
| `description_type` | **`STORE`** |
| `language` | **`en`** |
| `status` | **`needs_review`** (검토 상태 — canonical 아님) |
| `source_type` | `mfds_drug_otc` (ko 와 동일) |
| **ko ↔ en 연결** | **같은 `master_id`** + **같은 `source_ref_id`**(draft candidate_id) |
| 대상 | 그룹당 **대표 master 1개**(`master_id` 최소 = 결정론적) → **5 rows** |

### 3-1. `needs_review` 가 안전한 이유 (실측 확인)

canonical 유일 인덱스는 **`status='canonical'` 에만** 걸린다:

```sql
uniq_shared_product_descriptions_canonical_per_master_type_lang
  ON (master_id, description_type, COALESCE(language,'ko'))
  WHERE status='canonical' AND deleted_at IS NULL
```

→ `needs_review` en 행은 ko canonical 과 **충돌하지 않는다**. 또한 `needs_review` 는 **소비 화면에 노출되지 않는다** → 검토 전 노출 위험 0.

---

## 4. 번역 (GUIDE V0.5 / GLOSSARY V0.4)

번역 대상 = 구조화 4필드. `bodyMarkdown` **미사용**(CR-021).

**연령 경계(GLOSSARY §4-1) 적용 — 5/5 정확**

| 원문 | 영문 |
|---|---|
| 19세 미만 | `under 19` |
| **12세 이상** / **3~12세** / 3개월 미만 | **`12 or older`** / **`aged 3 to under 12`** / `under 3 months` |
| **24개월 이상** / 2세 미만 | **`24 months or older`** / `under 2` |
| 임신 6개월 이상 | `6 months or more into pregnancy` |
| 6세 이상 | `6 or older` |

**수치**: 1,200mg 상한 · 5일 이내 · 1/2정(5mg) · 7일 뒤 재복용 — **전건 유지**.
**경로**: 5건 전부 `route=oral`(DR-019) → 동사 **`take`**. G-01 위반 0.

상세 = [번역 TEST-LOG T-6~T-10](../guides/OTC-EN-TRANSLATION-TEST-LOG.md).

---

## 5. 검증 — **전건 통과**

| # | 항목 | 결과 |
|---|---|---|
| ① | **영문 5건만 저장** | ✅ `dbWrite=5` · `en`/`STORE`/`needs_review`/`mfds_drug_otc` **5 rows** |
| ② | **한국어 canonical 변경 0** | ✅ e약은요 19,177 · combo 1,915 · **`mfds_drug_otc` ko canonical 686 불변** |
| ③ | **숫자·단위·연령·용법 누락 0** | ✅ §4 |
| ④ | **내부 주석 노출 0** | ✅ `&gt;` 0 · 주석 문구 0 |
| ⑤ | **`bodyMarkdown` 사용 0** | ✅ 구조화 4필드만 |
| ⑥ | **sd-* 반응형 HTML** | ✅ `sd-card` **5/5** · `<table>` **0** |
| ⑦ | **모바일·태블릿·PC 렌더** | ✅ **20/20 PASS** (375/768/1024/1280 × 5건) — 잘림 0 · 가로 스크롤 0 |
| ⑧ | **재실행 시 중복 생성 없음** | ✅ 재실행 → **"기존 영문 존재 — 덮어쓰지 않고 중단"** 으로 정지, 행 수 **5 유지** |
| ⑨ | 한글 잔존 | ✅ **0** (영문 본문에 `[가-힣]` 0) |
| ⑩ | canonical 유일성 계약 | ✅ 중복 **0** |
| ⑪ | ko ↔ en 연결 | ✅ 5/5 **같은 master + 같은 source_ref_id** |

### 5-1. 렌더 실측

| 뷰포트 | 컨테이너 | `sd-core` | 결과 |
|---|---:|---|---|
| 375 | 347 | 1열 | ✅ |
| 768 | 740 | 2열 | ✅ |
| 1024 | 996 | 3열 | ✅ |
| 1280 | 1252 | 3열 | ✅ |

증거: [EN-PERSIST-dexibuprofen-375px.png](../guides/products/drug/pilot-en-design/evidence/EN-PERSIST-dexibuprofen-375px.png)

> **§8-D 수정 효과 확인**: `Saccharomyces boulardii`·`Dexibuprofen` 등 긴 영문 성분명이 **잘림 없이 줄바꿈**.
> `summaryTable` 6항목 → `sd-core` 6 item → **3열 2행 정확히 채움**(빈 칸 0).

---

## 6. 문서 반영

| 문서 | 반영 |
|---|---|
| [번역 TEST-LOG](../guides/OTC-EN-TRANSLATION-TEST-LOG.md) V0.3 → **V0.4** | T-6~T-10 기록 |
| [디자인 TEST-LOG](../guides/OTC-DESCRIPTION-DESIGN-TEST-LOG.md) V0.3 → **V0.4** | D-7 기록 |
| GUIDE · GLOSSARY | **미반영 — 수정 불필요** |

> **반복되는 문제가 없었다.** GUIDE V0.5 / GLOSSARY V0.4 로 전건 판정 → **지침 재검증 통과**가 이번 결과다.
> 유일한 특이점(`정장`→기능 서술, `(내수용은 냉소 보관.)` 원문 괄호 유지)은 **1회성**이라 TEST-LOG 에만 남겼다.

---

## 7. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 영문 5건 저장 및 화면 검증 | ✅ §5 |
| 저장 구조와 상태 전이 확인 | ✅ §3 — `needs_review` 저장, canonical 인덱스 비충돌 확인 |
| 686건 전체 번역 가능 여부 판정 | ✅ §8 |
| commit·push | ✅ |

---

## 8. 686건 전체 번역 가능 여부 — **가능. 단 선결 2건**

| 판정 | 근거 |
|---|---|
| **번역 파이프라인** | ✅ 구조화 4필드만으로 완결. GUIDE·GLOSSARY 수정 0 |
| **디자인** | ✅ 영문 `sd-*` 20/20 PASS. 긴 성분명 잘림 해소됨 |
| **저장 구조** | ✅ `needs_review` en 이 ko canonical 과 공존. 재실행 안전 |

**선결**

| # | 항목 | 내용 |
|---|---|---|
| **1** | **그룹 → master 팬아웃 결정** | 본 파일럿은 **그룹당 1 master**(5 rows)만 저장했다. 전체 적용 시 **37그룹 → 686 rows** 로 팬아웃해야 한다. ko 는 이미 686 전량이므로 en 도 같은 축이 맞다 |
| **2** | **`needs_review` → `canonical` 전이 정책** | 누가·언제 승격하나. **민감 약효군·검토 강화 대상은 A군에 없으나**(전부 `INSERT_auto`·oral) 영문 검수 주체는 미정 |
| — | (참고) 번역 생성 방식 | 본 파일럿은 5건을 **스크립트 상수로 하드코딩**했다. 686건은 그 방식이 불가 → **번역 입력(`buildDrugOtcTranslationInput`) 기반 배치 설계 필요** |

---

## 9. 남은 것

| 항목 | 비고 |
|---|---|
| B군 608 약사 검토 | 생약 2그룹(299) 우선 |
| 전개 불가 10건 | ATC groupKey |
| build 선행 결함 | 타 세션 `e41c78157` — 본 WO 무관 |
