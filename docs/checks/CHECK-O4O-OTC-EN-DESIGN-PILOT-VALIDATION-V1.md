# CHECK-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1 — 번역·디자인 지침 파일럿 검증

WO: `WO-O4O-OTC-EN-DESIGN-PILOT-VALIDATION-V1` · 일자: 2026-07-15 · 상태: 완료
대상: [CHECK-...-PILOT-SELECTION-V1](CHECK-O4O-OTC-EN-DESIGN-PILOT-SELECTION-V1.md) **P1~P5**
지침: [번역 GUIDE V0.5](../guides/OTC-EN-TRANSLATION-GUIDE.md) · [GLOSSARY V0.2→V0.3](../guides/OTC-KO-EN-GLOSSARY.md) · [디자인 GUIDE V0.3→V0.4](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md)

> **검증 전용.** DB 저장 **0** · canonical 승격 **0** · published **0** · 코드 변경 **0** · 한국어 초안 수정 **0**.
> 한국어 초안은 `needs_review` 라 영문·HTML은 **시안 지위**다. 한국어가 바뀌면 폐기·재작성한다.

---

## 1. 결론

> **번역 GUIDE·디자인 GUIDE 는 5건 전부에 적용 가능했고, 지침 본문 수정 없이 판정이 끝났다 — 지침 검증 통과.**
> 디자인은 **20/20 측정 전건 기대치 일치**. 번역은 **T-01~T-10 으로 전건 판정**.
> 보완은 **GUIDE 원칙이 아니라 어휘·경계 규칙**(GLOSSARY V0.3)과 **누락 규칙 2건**(CR-021·DR-019)에서 나왔다.
> 다만 **코드 결함 2건이 실증**됐다(§5): 긴 영문 단어 **잘림**, 주의사항 강조 수단 **부재**.

---

## 2. 산출물

| 산출물 | 위치 |
|---|---|
| 영문 번역 시안 5건 | [pilot-en-design/TRANSLATION-DRAFTS-V1.md](../guides/products/drug/pilot-en-design/TRANSLATION-DRAFTS-V1.md) |
| `sd-*` HTML 시안 5건 | [pilot-en-design/drafts/](../guides/products/drug/pilot-en-design/drafts/) |
| 측정 원본 (20건) | [evidence/measurements-v1.json](../guides/products/drug/pilot-en-design/evidence/measurements-v1.json) |
| 잘림 증거 스크린샷 | [evidence/P-3-...png](../guides/products/drug/pilot-en-design/evidence/P-3-long-english-word-clipped-375px.png) |
| 번역 TEST-LOG | [OTC-EN-TRANSLATION-TEST-LOG §3](../guides/OTC-EN-TRANSLATION-TEST-LOG.md) T-1~T-5 |
| 디자인 TEST-LOG | [OTC-DESCRIPTION-DESIGN-TEST-LOG §2·§4](../guides/OTC-DESCRIPTION-DESIGN-TEST-LOG.md) D-1~D-5 |

---

## 3. 검증 방법

- 한국어 초안: `product_candidate_description_drafts` **read-only SELECT** (Cloud SQL Auth Proxy).
- 디자인: 렌더러 소스에서 `storeDescriptionCss` 를 **추출**해 Playwright 로 실제 렌더 → 계산값 측정. **CSS 하드코딩·재작성 없음** → 측정값이 곧 프로덕션 동작.
- 측정: 시안 5건 × 4폭(375·768·1024·1280) = **20건** + 가설 7 케이스.

---

## 4. 판정 — 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 5건 모두 번역·디자인 검증 | ✅ |
| 모바일·태블릿 세로·태블릿 가로·PC 확인 | ✅ **20/20 PASS**, 가로 스크롤 0 |
| TEST-LOG 반영 | ✅ 번역 T-1~T-5 · 디자인 D-1~D-5 + 가설 P-1~P-6 전건 판정 |
| 반복 규칙 GUIDE/공통 SSOT 반영 | ✅ GLOSSARY V0.3 · 디자인 GUIDE V0.4 · **CR-021** · **DR-019** |
| DB 저장 · canonical · published | ✅ **0** |
| 코드 변경 | ✅ **0** |

### 4-1. 디자인 실측 (전건 일치)

| 뷰포트 | 컨테이너 | 카드 | `sd-core` | h1 | 결과 |
|---|---:|---:|---|---|---|
| 375 | 347 | 347 | 1열 | 32px | OK |
| 768 | 740 | 740 | 2열 | 44px | OK |
| 1024 | 996 | **860 상한** | 3열 | 44px | OK |
| 1280 | 1252 | **860 상한** | 3열 | 44px | OK |

**디자인 GUIDE §4.3 계산값이 실측과 100% 일치** → 추정 표기를 확정으로 승격(V0.4).

### 4-2. 가설 판정

| # | 결과 |
|---|---|
| P-1 B 모달 1열 | ✅ 확인 — 슬롯 604 → 컨테이너 576 → **1열**(PC인데 폰 레이아웃, 의도된 동작) |
| P-2 A 랜딩 경계 근접 | ✅ 확인 — 644 → 2열. **경계 실측 639=1열 / 641=2열** → 여유 **4px** |
| P-3 긴 영문 잘림 | ✅ **결함 확인** — §5-D |
| P-4 키오스크 무스타일 | ✅ 확인 (`TabletKioskPage.tsx:699,711` variant 없음) |
| P-5 다국어 랜딩 상이 | ✅ 확인 (`ContentRenderer` 사용 0회) |
| P-6 200% 확대 | ✅ PASS — 1280@200% → 612 → 1열, 오버플로 0 |

---

## 5. CHECK 판정 (WO 요구 항목)

### 5-A. 번역 지침 보완 필요 사항 → **없음**

T-01~T-10 으로 5건 전부 판정 가능했다. **GUIDE 본문 수정 0** — 이것이 지침 검증의 통과 신호다.
정보(§2.1 엄격)/표현(§2.2 유연) 2층 구조가 실제로 작동했다: 연령 경계·함량은 T-02 로 잠기고, 직역투 제거는 T-06/T-07 로 풀렸다.

### 5-B. GLOSSARY 추가·수정 후보 → **반영 완료 (V0.3)**

| 항목 | 조치 | 근거 |
|---|---|---|
| **연령 경계 규칙 신설(§4-1)** | `N세 이상`=`N or older`(**`over N` 금지**) · `N세 이하`=`N or under`(**`under N` 금지**) · `N세 미만`=`under N` | **오역 위험 최대 지점**. `over 80` 은 80세를 제외해 **금기 범위가 줄어든다**(T-09 위반). P2·P3 금기 실증 |
| `사용상의 주의사항` → **`사용상 주의사항`** | 표기 정정 | 원문 실측 라벨 |
| **Over-the-counter** 등재 | 신규 | 5건 공통 |
| 항목명이 **경로 따라 갈림** | `How to take it`(경구) ↔ `How to use it`(비경구) | P4 |
| `insert`·`by mouth`·`before meals` | `확인 필요` 해제 → 확정 | 실사용 |

### 5-C. 디자인 GUIDE 보완 사항 → **반영 완료 (V0.4)**

- §4.3 **계산값 → 실측 확정**(20/20).
- **슬롯별 분기표 신설** — 뷰포트가 아니라 슬롯이 분기를 정한다는 §4.1 원칙의 실증(B 모달 576=1열).
- §7 줄바꿈 결함 **실측 수치·스크린샷 확정**.

### 5-D. 반응형 문제 → **1건 (코드 결함)**

정상 문구에서는 **문제 없음**(20/20 PASS, 가로 스크롤 0, 표 0). 단 스트레스 시:

```text
.store-desc-content 계산값 = overflow-wrap:normal / word-break:normal / hyphens:manual
sd-hero h1 (375px): scrollWidth 594 vs clientWidth 301
sd-card { overflow:hidden } → 가로 스크롤 0 → 글자가 잘려 사라짐
문서 오버플로도 0 → 사용자는 잘린 사실조차 모른다
```

> **§8-D 확정.** 문서로는 못 고친다 → **렌더러 WO**. 그때까지 저자 대응 = 제목·태그에 긴 단일 단어 금지.

**표(§8-E)는 발생하지 않았다** — `summaryTable` JSON → `sd-core > sd-item` 매핑으로 `<table>` 0개. **우회 경로가 실제로 작동함을 확인**.

### 5-E. 내부 주석 제거 기준 → **CR-021 신설**

식별 규칙: `bodyMarkdown` **최상단 연속 인용 블록(`>`)** = 내부 주석. 5건 중 4건이 이 패턴이고 **본문 중간에는 `>` 없음**.

| # | 제외한 주석 |
|---|---|
| P1 | `> 100/150mg과 함량이 다른 별개 그룹.` |
| P3 | `> 같은 성분 550mg 정은 전문의약품이다(§6)…` |
| P4 | `> 이름은 '정'이지만 질 내 삽입 질정이다(내복 금지)…` |
| P5 | `> ⚠️ 경구 피임약… 수동 큐레이션…` |

> ⚠️ **핵심: 삭제가 아니라 분리다.** P3(550mg=RX)·P4(질정=내복 금지)는 **오역을 막는 결정적 근거가 주석에만 있다.**
> 주석을 파이프라인에서 단순 제거하면 **안전 정보가 사라진다.** → **소비자 노출 제외 ≠ 번역자 열람 제외** (CR-021 본문에 명문화).

### 5-F. 투여경로 판단에 필요한 데이터 → **DR-019 신설**

| 신호 | P1 | P2 | P3 | P4 | P5 | 판별력 |
|---|---|---|---|---|---|---|
| `doseForm` | 정 | 정 | 정 | **정** | 정 | ❌ **전건 동일 — 무력** |
| `groupKey` route 축 | 없음 | 없음 | 없음 | 없음 | 없음 | ❌ 부재 |
| **`usageLabel`** | 복용 안내 | 복용 안내 | 복용 안내 | **사용 안내** | 복용 안내 | ✅ **유일한 1차 신호** |
| `summaryTable.성분` | — | — | — | **(질정)** | — | ✅ 보조 |
| `usage` 본문 | 복용 | 복용 | 복용 | **질 내 삽입** | 복용 | ✅ 보조 |

**`doseForm='정'` 만 보고 번역하면 질정을 경구로 오역한다.** 실사용 신호는 `usageLabel`.

> **필요 데이터(제안, 이번 범위 밖)**: `groupKey` 또는 `content_json` 에 **route 축을 명시**하면 `usageLabel` 파생 추론이 불필요해진다. DR-010 group_key 규격에는 route 가 있으나 **초안 데이터에는 반영돼 있지 않다** → 후속 WO 후보.

### 5-G. 한국어 canonical 승격 후 실제 저장 작업 가능 여부 → **가능. 단 선결 3건**

| 판정 | 근거 |
|---|---|
| **번역 파이프라인** | ✅ 가능 — 4필드(`efficacy`/`usage`/`caution`/`summaryTable`)만으로 완결. GUIDE 수정 불필요 |
| **디자인 파이프라인** | ✅ 가능 — 구조화 JSON → `sd-*` 매핑이 **변환**으로 성립(설명서 수정 아님). 20/20 반응형 PASS |
| **저장 대상 구조** | ✅ 가능 — `shared_product_descriptions` (master, type, language) 당 canonical 1개 → `language='en'` 공존 |

**선결 조건**

1. **한국어 canonical 승격 선행** — 95건 전부 `needs_review`. 영문은 한국어 정본에 종속되므로 **승격 전 저장 금지**.
2. **CR-021 파이프라인 반영** — 내부 주석 제거를 **자동화하되 번역자에게는 노출**해야 함. 단순 strip 은 안전 정보 손실.
3. **DR-019 데이터 보강** — route 축이 없으면 대량 번역 시 **질정류가 경구로 오역**된다. 자동 배치 전 필수.

> **추가 권고**: P5 등 **민감 약효군(DR-008)** 은 번역도 **약사 검토 강화** 대상 — 영문 자동 채택 금지.

---

## 6. 이번 파일럿이 못 한 것

| 항목 | 사유 |
|---|---|
| **한국어 ↔ 영문 디자인 비교** | 한국어 `sd-*` 시안이 없음(DRUG 설명서 전부 비-`sd-*`) → 영문 단독 검증 |
| **언어 전환 UI 검증** | 시안은 콘텐츠 단위. 언어 탭은 화면(A~D) 소관 → §8-C WO |
| **점안·외용 검증** | 초안 95건에 **0건** (§SELECTION §5-E) → 해당 그룹 작성 후 이월 |
| **실기기 검증** | Playwright(Chromium) 계산값 측정. 실제 태블릿·iOS Safari 미확인 |
