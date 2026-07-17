# CHECK-O4O-OTC-ADDITIVE-WARNING-WHITELIST-V1 — 첨가제 경고 문구 확정 (dry-run)

WO: `WO-O4O-OTC-ADDITIVE-WARNING-WHITELIST-V1` · 일자: 2026-07-17 · 상태: **완료 (dry-run)**
근거: [READINESS-AUDIT](./CHECK-O4O-OTC-ADDITIVE-SUBGROUP-READINESS-AUDIT-V1.md) · NB_DOC 원문

> **dry-run 전용.** DB write **0** · canonical 수정 **0**. 공식 원문 기반 ko/en 문구 확정만.

---

## 0. 결론

> **첨가제 경고가 필요한 distinct 130 master 의 ko·en 문구를 공식 NB_DOC 원문 기준으로 확정. 강도 보존(유당·아스파탐=금기 / 색소=신중투여). 예상 적용 = ko 130 + en 130 (260 canonical).**
>
> | | 인스턴스 | master |
> |---|---:|---:|
> | 유당 (금기) | 98 | — |
> | 색소 (신중투여) | 57 | — |
> | 아스파탐 (금기) | 1 | — |
> | **distinct master**(다중함유 26 병합) | — | **130** |
> | en 동일 집합 | — | **130** |

---

## 1. 공식 원문 → 확정 문구 (강도 보존)

### 1-1. 유당 — **금기** (NB_DOC: "…투여하면 안 된다 / 투여하지 마십시오")
> 원문: `이 약은 유당을 함유하고 있으므로, 갈락토오스 불내성(galactose intolerance), Lapp 유당분해효소 결핍증(Lapp lactase deficiency) 또는 포도당-갈락토오스 흡수장애(glucose-galactose malabsorption) 등의 유전적인 문제가 있는 환자에게는 투여하면 안 된다.`

- **ko**: 이 약은 유당을 함유하고 있어 갈락토오스 불내성, Lapp 유당분해효소 결핍증, 포도당-갈락토오스 흡수장애 등 유전적 문제가 있는 분은 **복용하지 마십시오.**
- **en**: This product contains lactose. Patients with hereditary problems such as galactose intolerance, Lapp lactase deficiency, or glucose-galactose malabsorption **must not take it.**

### 1-2. 아스파탐 — **금기** (NB_DOC: "…페닐케톤뇨증 환자에는 투여하지 말 것")
> 원문: `이 약에 함유되어 있는 인공감미제 아스파탐은 체내에서 분해되어 페닐알라닌으로 대사되므로, … 페닐케톤뇨증 환자에는 투여하지 말 것.`

- **ko**: 이 약은 아스파탐을 함유하고 있어 페닐케톤뇨증 환자는 **복용하지 마십시오.**
- **en**: This product contains aspartame (a source of phenylalanine). Patients with phenylketonuria (PKU) **must not take it.**

### 1-3. 색소 — **신중투여** (NB_DOC: "…신중히 투여한다") · 종류·표현 제품별 확인
> 황색5호: `이 약은 황색5호(선셋옐로우 FCF, Sunset Yellow FCF)를 함유하고 있으므로 이 성분에 과민하거나 알레르기 병력이 있는 환자에는 신중히 투여한다.`
> 황색4호: `이 약은 황색4호(타르트라진)을 함유하고 있으므로 … 신중히 투여한다.`

- **ko**: 이 약은 **{색소종류}**를 함유하고 있어 이 성분에 과민하거나 알레르기 병력이 있는 분은 **신중히 복용하십시오.**
- **en**: This product contains **{color}**. Patients hypersensitive to this ingredient or with a history of allergy **should take it with caution.**
- {색소종류}: 황색5호(선셋옐로우 FCF) / 황색4호(타르트라진) — 제품 NB_DOC 실측 종류만.

> **강도 원칙 준수**: 유당·아스파탐은 **금기(복용하지 마십시오)** — 상담으로 약화 안 함. 색소는 원문이 **신중투여**라 "신중히 복용하십시오"(원 강도 유지, 과장 금기화도 안 함).

---

## 2. master 분류·수량

| 조합 | master | 비고 |
|---|---:|---|
| 유당 단독 | 72 | 금기 |
| 색소 단독 | 32 | 신중 |
| 색소+유당 | 25 | 다중(두 문구 병기) |
| 아스파탐+유당 | 1 | 다중(금기 2개) |
| **distinct 합** | **130** | 다중함유 **26** |

**색소 종류 분포**(57 master): 황색5호 **49** · 황색4호 **6** · 황색5호+황색4호 **2**.

**다중 함유 병합 예**(아스파탐+유당, 암브록솔):
> 이 약은 유당을 함유하고 있어 … 복용하지 마십시오. 이 약은 아스파탐을 함유하고 있어 페닐케톤뇨증 환자는 복용하지 마십시오.

---

## 3. 원칙 준수

| 원칙 | 결과 |
|---|---|
| 공식 원문에 있는 경고만 반영 | ✅ NB_DOC 실측 문장 근거 |
| 첨가제 이름만으로 문구 생성 안 함 | ✅ 함유 경고 실재 제품만 |
| 색소 종류·원문 표현 확인 | ✅ 황색5호/4호 제품별 실측 |
| 금기를 상담으로 약화 안 함 | ✅ 유당·아스파탐 금기 유지 |
| 원문없음 115 제외 | ✅ 미포함 |
| ko/en 동일 master 집합 | ✅ 130 = 130 |
| 기존 canonical 미수정 | ✅ dry-run |

---

## 4. 예상 적용 · apply 범위

| 항목 | 수 |
|---|---:|
| ko 경고 적용 master | **130** |
| en 경고 적용 master | **130** |
| **총 canonical** | **260** |

> **모델**: master 는 `(master_id, canonical)` partial-unique → 함유 master 의 **기존 canonical 에 경고 문구를 추가**(append) 하는 UPDATE. 다중 함유는 한 설명서에 병기. **삽입 위치**(예: 사용상 주의사항 말미)는 apply WO 에서 확정.
> **apply WO(제안) `…-ADDITIVE-WARNING-APPLY-V1`**: 화이트리스트 130 master ko/en 을 이중 게이트·단일 TX·역치환·비대상 불변·멱등(경고 이미 포함 시 no-op)으로 적용.

---

## 5. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| distinct 130 master 전수 문구 확정 | ✅ |
| ko/en 의미·강도 일치 | ✅ (금기/신중 보존) |
| 다중 함유 26 병합 방식 확정 | ✅ 한 설명서 병기 |
| 실제 apply 수량 확정 | ✅ ko 130 / en 130 |
| DB write 0 | ✅ |
| commit·push | ✅ |

---

## 6. 산출물

- `docs/investigations/samples/nb-doc-bulk-v1/additive-warning-whitelist.json` — master별 ko/en 문구 + 첨가제·색소종류·근거

> **다음(apply, 별도 WO)**: 화이트리스트 130 master ko/en(260) 경고 문구 append. 원문없음 115 는 원천 재수집 후 재판정.
