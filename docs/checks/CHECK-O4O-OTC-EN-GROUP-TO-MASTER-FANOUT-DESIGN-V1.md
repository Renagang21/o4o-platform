# CHECK-O4O-OTC-EN-GROUP-TO-MASTER-FANOUT-DESIGN-V1 — 영문 그룹→master 전개 설계

WO: `WO-O4O-OTC-EN-GROUP-TO-MASTER-FANOUT-DESIGN-V1` · 일자: 2026-07-16 · 상태: 완료 (설계 + dry-run)
선행: [CANONICAL-APPLY-AUTO-ONLY](CHECK-O4O-OTC-CANONICAL-APPLY-AUTO-ONLY-V1.md) (ko 686) · [EN-PERSIST-PILOT](CHECK-O4O-OTC-EN-TRANSLATION-PERSIST-PILOT-V1.md) (저장 구조 검증)

> **설계·dry-run 전용.** DB write **0** · 영문 추가 저장 **0** · 상태 변경 **0** · 실제 번역 생성 **0** · canonical 전환 **0** · B군 미접촉.

---

## 1. 결론

> **전개 경로 확정.** dry-run: **37그룹 → 686 master · 그룹 간 중복 0 · 기존 en 5 제외 → 예상 INSERT 681 / UPDATE 0.**
> 반복 실행 **동일 결과**. 테스트 **60/60**.
>
> 핵심: **멤버십을 다시 계산하지 않는다.** 이미 저장된 **한국어 canonical 행이 곧 전개 대상**이라 ko/en 축이 어긋날 수 없다.

---

## 2. 구조 — 번역 입력 / 저장 입력 분리

```text
TranslationUnit (그룹당 1)          ← 번역자가 보는 단위. master 를 알 필요가 없다.
  { candidateId, groupKey, title, masterCount }
  + buildDrugOtcTranslationInput → { consumerSource, translatorNote, meta.route }
        │
        │  번역 결과 1개 (그룹당 1회)
        ▼
PersistUnit (그룹당 1 → N master)   ← 같은 HTML 을 그룹의 모든 대상 master 에 전개
  { candidateId, groupKey, targetMasterIds[], totalMasters, skippedExistingEn }
```

| 원칙 | 구현 |
|---|---|
| **번역은 그룹당 1회** | `translationUnits.length === groups` (37) |
| **저장은 연결 master 전체** | `persistUnits[].targetMasterIds` 로 전개 |
| 번역자는 master 를 모른다 | `TranslationUnit` 에 masterIds 없음(`masterCount` 만 참고) |

### 2-1. 멤버십 SSOT = 한국어 canonical 행

```sql
FROM shared_product_descriptions ko
WHERE ko.source_type='mfds_drug_otc' AND ko.status='canonical'
  AND ko.language='ko' AND ko.description_type='STORE' AND ko.deleted_at IS NULL
```

- 성분·함량·제형 전개를 **다시 하지 않는다** → ko 가 들어간 master 집합 = en 대상. **축 불일치 구조적 불가.**
- `source_ref_id`(draft candidate_id)를 그대로 물려받아 **ko ↔ en 연결 유지**.
- `ORDER BY group_key, master_id` 고정 → 반복 실행 동일 결과.

---

## 3. 구현 (read-only)

| 파일 | 내용 |
|---|---|
| `modules/neture/drug-import/drug-otc-en-fanout.ts` (**신규**) | `loadEnFanoutRows(ds)` — ko canonical 기준 (그룹,master) + `hasEn` 조회 · `buildEnFanoutPlan(rows)` — 번역/저장 단위 산출 |
| `scripts/drug-otc-en-fanout-dryrun.ts` (**신규**) | dry-run 리포트. **INSERT/UPDATE/DELETE SQL 문 0개**(grep 확인 — 매칭된 것은 주석·로그 문자열뿐) |
| `__tests__/drug-otc-en-fanout.test.ts` (**신규**) | 안전 조건 10건 |

**안전 조건**

| 조건 | 구현 |
|---|---|
| 기존 `STORE/en` master **제외** | `hasEn=true` → `targetMasterIds` 에서 빠짐(`skippedExistingEn` 계측) |
| 같은 master 가 여러 그룹 → **전체 중단** | `crossGroupDuplicateMasters` 로 반환(호출부가 중단) |
| `needs_review` 로만 저장 | 저장 스크립트 계약(파일럿에서 검증) — 본 WO 는 write 없음 |
| `source_ref_id` 연결 유지 | ko 행의 값을 그대로 사용 |
| 그룹 내 master 중복 제거 | `Set` |
| UPDATE 0 | `expectedUpdate` 는 **타입상 `0` 리터럴** — 다른 값이 될 수 없다 |

---

## 4. dry-run 검증 — 요구 항목 전건

| 항목 | 기대 | 실측 | 결과 |
|---|---:|---:|:---:|
| **그룹 37개** | 37 | **37** | ✅ |
| **대상 master 686개** | 686 | **686** | ✅ |
| **그룹 간 master 중복 0** | 0 | **0** | ✅ |
| **기존 영문 충돌 수** | — | **5** (파일럿 저장분) | ✅ 제외 처리 |
| **예상 INSERT 수** | — | **681** | ✅ |
| **예상 UPDATE 0** | 0 | **0** | ✅ |
| **재실행 시 중복 생성 없음** | — | ✅ `hasEn` 필터로 자동 제외 → 반복 실행 시 대상이 줄기만 함 | ✅ |
| 산술 정합 | — | **686 = 681 + 5** | ✅ |
| 재현성 | — | 2회 실행 JSON `diff` **무차이** | ✅ |

### 4-1. 기존 en 보유 5그룹 (파일럿 저장분)

| 그룹 | 전체 master | 기존 en | 저장 대상 |
|---|---:|---:|---:|
| 세티리진염산염\|10밀리그램\|정 | 72 | 1 | **71** |
| 알벤다졸\|400밀리그램\|정 | 33 | 1 | **32** |
| 덱시부프로펜\|300밀리그램\|정 | 15 | 1 | **14** |
| 사카로마이세스보울라르디균\|282.5밀리그램\|캡슐 | 5 | 1 | **4** |
| 덱스판테놀\|100밀리그램\|정 | 4 | 1 | **3** |

> 파일럿이 그룹당 대표 master 1개만 저장했으므로, 전체 적용 시 **나머지 681개**가 채워진다. **파일럿 5건은 덮어쓰지 않는다.**

### 4-2. 번역 입력 산출 확인

| 항목 | 값 |
|---|---|
| route 분포 | **`{"oral": 37}`** — A군 전부 경구(DR-019). 비경구 0 → G-01 위험 표면 없음 |
| `translatorNote` 보유 | **13그룹** — 번역자에게 전달될 안전 근거(CR-021) |

---

## 5. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 37그룹 → 686 master 전개 경로 확정 | ✅ §2-1 (ko canonical = SSOT) |
| 번역 입력과 저장 입력 분리 | ✅ §2 (`TranslationUnit` / `PersistUnit`) |
| dry-run 수량 확정 | ✅ **681 INSERT / 0 UPDATE** |
| DB write · 저장 · 상태 변경 · 번역 생성 · canonical 전환 · B군 | ✅ **전부 0** |

---

## 6. 다음 WO 에 넘길 것

| 항목 | 값 |
|---|---|
| **저장 대상** | **681 rows** (37그룹, 기존 en 5 제외) |
| status | `needs_review` (파일럿과 동일) |
| 전제 | **번역 결과 37개**가 있어야 한다 — 본 WO 는 **입력 구조만** 만들었고 **번역은 생성하지 않았다** |
| 가드 | `crossGroupDuplicateMasters.length > 0` → 전체 중단 · `hasEn` → 제외 · UPDATE 경로 없음 |

**분리된 후속**

| # | 항목 |
|---|---|
| 1 | **번역 37건 생성** (파일럿은 5건을 스크립트 상수로 하드코딩 — 37건은 `buildDrugOtcTranslationInput` 기반 배치 필요) |
| 2 | **저장 apply** (681 rows, 승인 필요) |
| 3 | **검수·`needs_review` → `canonical` 전이 정책** (WO 에서 분리 지시됨) |

---

## 7. 참고

| 항목 | 상태 |
|---|---|
| typecheck | ✅ 내 파일 **0 오류** / 저장소 전체 3 (내 변경 무관) |
| 테스트 | ✅ **60/60** (신규 10 + 기존 50) |
| build | ⚠️ 타 세션 `e41c78157`(content-guard) 선행 결함 — 본 WO 무관 |
