# CHECK — OTC apply Model A(기존 authored 재사용) 후보 감사

**맥락:** WO-O4O-OTC-CANONICAL-APPLY-PILOT-B01AC06-V1 → **중단·재검토** 후속
**성격:** read-only · DB write 0
**스크립트:** `apps/api-server/src/scripts/drug-otc-apply-modelA-candidate-audit.ts`
**산출:** `apps/api-server/src/scripts/data/otc-apply-modelA-candidate-audit-v1.json`

---

## 0. 질문

첫 canonical write 파일럿의 목적 = **기존 authored 대표 설명서를 정확히 재사용(Model A)** 할 수 있는 그룹을 찾는 것. B01AC06 아스피린이 Model A=0 이었으므로, **338 안전일치 후보 / 25 atc-key 전수**에서 진짜 Model A 후보가 있는지 집계했다.

**Model A 판정 (4조건 AND):**
1. authored 대표(source_ref_id → master)가 **e약은요 원문 보유**
2. authored 대표 원문 텍스트 서명(효능·용법·주의 = contentSig)이 대상과 **완전 일치**
3. 안전지문 일치 (모집단이 이미 충족)
4. 대상 기존 ko/en canonical **없음**

> ※ fingerprint 는 성분 서명(`ingredient|strength`)을 포함하므로, 무성분명 대상(ingredient='')과 명명 authored 대표는 원문이 같아도 fingerprint 가 절대 일치하지 않는다. 그래서 '원문 완전 일치'는 fingerprint 가 아니라 **contentSig(성분 무관, 효능·용법·주의 텍스트)** 로 판정했다.

---

## 1. 결과 — Model A 는 전 구간 구조적으로 0

| 지표 | 값 |
|---|---:|
| 안전일치 대상 | 338 |
| atc-key 수 | 25 |
| **authored 대표가 e약은요 보유한 atc-key 수** | **0** |
| **Model A viable atc-key 수** | **0** |
| Model A 후보 fingerprint 그룹 | **0** |
| 제안 가능한 새 첫 파일럿 (Model A) | **없음** |

**독립 검증 (직접 count):**

```text
authored canonical masters 총 : 1,234
  그중 e약은요 canonical 도 보유 : 0
```

---

## 2. 원인 — 구조적, 버그 아님

authored 코퍼스(`mfds_drug_otc` / `nutrition_combo` canonical)는 **e약은요를 못 가진 master 를 위해 작성**된 문서다(A_no_spd_only — e약은요 미보유 대상 승격용). 따라서:

- authored 대표 master 는 **정의상 e약은요 원문이 없다** → 재사용의 원문 대조 상대가 존재하지 않는다.
- 무성분명 안전일치 대상(338)은 **자기 e약은요 원문을 이미 보유**한다.
- 두 집합은 **e약은요 보유 여부에서 완전히 disjoint** (겹침 0/1,234).

→ "기존 authored 대표를 원문 완전 일치로 재사용" 이라는 Model A 는 **338 후보뿐 아니라 통합 검토후확장 2,732 전체에서 성립하지 않는다.** 재계산의 "ATC후보+안전지문일치 = 재사용 후보" 는 **atc-key 에 authored doc 이 존재한다**는 의미였을 뿐, 원문 대조 가능한 재사용을 보장하지 않았다.

---

## 3. 남은 선택지 (write 아님 — 방향 결정 필요)

| 경로 | 정의 | 규모 | 리스크 |
|---|---|---:|---|
| **Model A** (원문 완전 일치 재사용) | authored 대표 원문 == 대상 원문 | **0** | — (불가) |
| Model B (grounded 원문 신규 authoring) | 각 대상을 **자기 e약은요 원문**으로 authoring, 안전=임상 일관성 확인 | 338 (안전일치) / 무성분명 7,301 전체 | 재사용 아님 — 신규 생성 파일럿으로 성격 변경 |
| atc+safety only 재사용 | 원문 미검증, atc+안전만으로 authored content 차용 | 338 | ⚠️ 적응증 오적용 위험 — 비권장 |

**결론:** 현재 authored 코퍼스 정의 하에서 **"기존 authored 재사용" 첫 파일럿 후보는 존재하지 않는다.** 첫 production write 를 하려면 목적을 **Model B(grounded 원문 신규 authoring)** 로 재정의하거나, 재사용 전략 자체(authored 코퍼스와 e약은요의 관계)를 재검토해야 한다.

- 아스피린 52+8 은 **grounded 원문 신규 authoring 후보로 별도 보류** (이 파일럿 WO 미포함, 지시대로).
- DB write 0. 다음 방향은 사용자 결정 후 별도 승인.

---

*read-only 감사. Model A 구조적 부재 확인 → 첫 파일럿 목적 재정의가 선행 조건.*
