# CHECK — WO-O4O-HFF-EN-BATCH-02-REMAINING-915-DIRECT-TRANSLATION-AND-CLOSURE-V1

- 대상: 건강기능식품(HFF) 매장 설명서 EN canonical, Batch 02
- 기준 커밋: `313d2f5d1`
- 환경: 프로덕션 Cloud SQL (`o4o-platform-db` / `o4o_platform`), Cloud SQL Auth Proxy v2 (이번 세션이 기동한 포트만 사용·종료)
- 선행 조건: 편집기 선택 공유 없음(`ide_selection` 미첨부 상태에서 착수)

---

## 1. 결과 요약

| 항목 | 값 |
|---|---|
| 915 모집단 | 915 |
| 직접 번역 완료 | **907** |
| 잔여 HOLD | **8** (`HOLD_NUMBER_STRUCTURE_AMBIGUOUS`) |
| `HOLD_PENDING_DIRECT_TRANSLATION` | **0** ✅ |
| Batch 02 모집단 | 5,000 |
| Batch 02 완료 | **4,878** |
| Batch 02 HOLD | **122** (`HOLD_KO_SOURCE_DAMAGED` 110 / `HOLD_NUMBER_STRUCTURE_AMBIGUOUS` 12) |
| 상태 합계 검증 | 4,878 + 122 = **5,000** ✅ |
| 금지 HOLD 사유 존재 | **없음** ✅ |
| 독립 검증 | **PASS** (실패 0/5 항목) |

금지 사유(`TRANSLATION_ASSET_MISSING` / `NO_ENTRY` / `TEMPLATE_UNSUPPORTED` / `HOLD_LOW_EFFICIENCY` / `HOLD_PENDING_DIRECT_TRANSLATION`)는 최종 HOLD 원장에 **한 건도 남지 않았다**.

---

## 2. 수행 방식

KO canonical HTML을 템플릿으로 두고 **텍스트 슬롯만 치환**하는 기존 방식을 그대로 유지했다.
렌더러 계열(WAE / DRIVER / FN), 절 수, 원료 귀속, 수치·단위·괄호 용량은 구조상 자동 승계된다.

라운드는 t1~t10 으로 나누어 진행했고, 각 라운드는 동일한 3단 게이트를 통과했다.

```
classify (read-only) → render audit (JSDOM + .store-desc-content + computed style) → apply (--apply + CONFIRM)
```

| 라운드 | 적용 |
|---|---|
| t1 | +81 |
| t2 | +70 |
| t3 | +95 |
| t4 | +123 |
| t5 | +162 |
| t6 | +111 |
| t7 | +79 |
| t8 | +80 |
| t9 | +98 |
| t10 | +8 |
| **합계** | **907** |

전 라운드 렌더 감사 `totalIssues 0 / verdict PASS`, 적용 시 `koUnchanged: true`, `pmUnchanged: true`.

---

## 3. 도중 확정한 결함 2건 (문구 부족이 아니라 조회 결함)

### 3-1. PUA 글리프가 사전 조회를 막고 있었다

KO 원문 일부 절 앞에 **U+F081 (사설 사용 영역, 레거시 심볼 폰트의 불릿 잔재)** 이 붙어 있었다.
`key()` 는 `norm()` 을 거치지만 `norm()` 이 PUA·제로폭 문자를 제거하지 않아, 눈으로는 동일한 문구가 서로 다른 키가 되어 `NO_ENTRY` 로 남았다.

- 조치: `norm()` 에서 `U+E000–U+F8FF`, `U+200B–U+200F`, `U+FEFF` 를 **조회 키에서만** 제거.
- 원문 HTML 은 그대로 보존된다(치환 대상은 슬롯 텍스트이며 원문은 수정하지 않는다).

### 3-2. `&lt;…&gt;` 마커는 태그가 아니라 원료 귀속 표기다

`&lt;정제2&gt;` · `&lt;액상&gt;` · `&lt;루테인&gt;` 등은 DRIVER 계열에서 **어느 구성품의 기능인지**를 가리키는 표기다.
`norm()` 이 엔티티를 디코드한 뒤에는 `<정제2>` 가 되어 조회 키가 마커를 잃고, 그대로 두면 EN 에서 귀속 정보가 사라진다.

- 조치: 사전 키를 **엔티티 형태 그대로**(`&lt;정제2&gt;`) 등록하고, EN 값은 대괄호(`[Tablet 2]`)로 표기해 귀속을 보존.
- 꺾쇠를 EN 본문에 그대로 쓰면 렌더 감사에서 `rawHtml` 로 걸리므로 대괄호를 쓴다(기존 판정 유지).

---

## 4. 잔여 HOLD 판단

### 4-1. 915 잔여 8건 — `HOLD_NUMBER_STRUCTURE_AMBIGUOUS`

번역문은 존재하나 슬롯 단위 수치 대조에서 KO 쪽 수치가 EN 에 나타나지 않는 사례다.
대부분 `1일 2회, 1회 1포(6.5g)를 250ml ~ 300ml` 처럼 **하나의 슬롯에 복수 용량 축이 겹친** 문장이거나,
`체지방 감소에 도움을 줄 수 있음(생리활성기능 2등급) [May help reduce body fat mass.(Other function claime 2 grade.)]` 처럼
**KO 원문 안에 영문 병기가 중복 포함된** 문장이다.

게이트를 완화해 통과시키는 것은 수치 보존 계약을 깨는 일이므로 하지 않았다. 실제 문제로 남긴다.

### 4-2. Batch 02 전체 122건

| 사유 | 건수 | 성격 |
|---|---:|---|
| `HOLD_KO_SOURCE_DAMAGED` | 110 | KO canonical 자체가 손상 조각(깨진 문자/빈 절)을 포함 — EN 생산 이전에 KO 교정이 선행되어야 함 |
| `HOLD_NUMBER_STRUCTURE_AMBIGUOUS` | 12 | 위 4-1 과 동일 성격 |

---

## 5. Batch 01 HOLD 스윕

- 대상: `hff-en-batch01-final-hold-102-v1.jsonl` 101건
- 현재 사전(= Batch 02 번역 자산 반영본)으로 재판정
- **자연 해소 0건 / 잔여 101건** → DB write 없음

잔여의 대부분은 `1일 1회` 같은 badge·label 슬롯에서 EN 이 `Once a day` 로 수치를 문자로 표현해
슬롯 단위 수치 대조에 걸리는 형태(`HOLD_NUMBER_STRUCTURE_AMBIGUOUS`)다. Batch 01 종료 시 이미 실제 문제로 인정한 범주이며,
이번 WO 는 "Batch 02 번역이 같은 승인 문구를 자연히 공급한 경우"만 스윕 대상으로 한정하므로 별도 저작을 하지 않았다.
스윕은 Batch 02 진행을 지연시키지 않았다(종료 집계와 동일 스크립트에서 1회 수행).

---

## 6. 산출물

| 파일 | 내용 |
|---|---|
| `data/hff-en-batch02-remaining915-population-v1.json` | 915 모집단 (게이트 통과) |
| `data/hff-en-b02-r915-t1..t10-translations-v1.json` | 라운드별 직접 번역 자산 |
| `data/hff-en-batch02-remaining915-classification-v1.json` | 최종 분류 (PENDING 0) |
| `data/hff-en-batch02-remaining915-render-audit-v1.json` | 렌더 감사 PASS |
| `data/hff-en-batch02-remaining915-apply-results-v1.json` / `-rollback-v1.json` | 적용 결과 / 롤백 계약 |
| `data/hff-en-batch02-remaining915-independent-verification-v1.json` | 독립 검증 PASS |
| `data/hff-en-batch02-closure-v1.json` | Batch 02 종료 선언 |
| `data/hff-en-batch02-completed-v1.json` | 완료 4,878 원장 |
| `data/hff-en-batch02-final-hold-v1.jsonl` / `-summary-v1.json` | 최종 HOLD 122 원장 |
| `data/hff-en-batch01-hold72-sweep-results-v1.json` | Batch 01 스윕 결과 (해소 0) |
| `data/hff-en-production-completed-through-batch02-v2.json` | Batch 01+02 누적 |
| `data/hff-en-production-remaining-after-batch02-v2.json` | Batch 03 이후 잔여 |

스크립트: `hff-en-b02-r915-{population,blockers,classify,render,apply,verify}.mjs`, `hff-en-batch02-closure.mjs`,
번역 엔진 `hff-en-batch-01-translate.mjs` (§3 조치 반영).

---

## 7. 안전 계약 준수

| 항목 | 상태 |
|---|---|
| 자격증명 코드/JSON/CHECK/로그/명령 인자 노출 | 없음 (env 주입) |
| 분석·dry-run·독립검증 read-only (`SET default_transaction_read_only = on`) | 적용 |
| KO canonical / ProductMaster / candidate 수정 | 없음 (`koUnchanged: true`, `pmUnchanged: true`) |
| 기존 EN 삭제 | 없음 (낙관적 락 UPDATE / 신규 INSERT 만) |
| Batch 02 밖 EN write · Batch 03 데이터 · 타 언어 생성 | 없음 |
| 프록시 | 이번 세션이 기동한 포트만 종료 |
| 임시·디버그 파일 | 종료 전 삭제 |
| Git | 경로 지정 commit, `git add .` 미사용, 타 세션 WIP 미접촉 |
