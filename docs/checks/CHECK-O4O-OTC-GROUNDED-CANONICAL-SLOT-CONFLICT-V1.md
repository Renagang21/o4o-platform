# CHECK — grounded 무성분명은 이미 STORE canonical 슬롯 점유 (apply 파일럿 구조적 blocker)

**맥락:** 아스피린 52 draft 0052dc6c ko 승격 dry-run 설계 직전 발견
**성격:** read-only · DB write 0
**결론:** ⛔ **아스피린 52(및 grounded 무성분명 전체)는 이미 e약은요 STORE canonical 을 보유 → authored canonical INSERT 불가(unique 제약 위반).** 파일럿을 INSERT 로 진행할 수 없다.

---

## 1. DB unique 제약 (구조적 사실)

```sql
CREATE UNIQUE INDEX uniq_shared_product_descriptions_canonical_per_master_type_lang
  ON shared_product_descriptions (master_id, description_type, COALESCE(language,'ko'))
  WHERE status='canonical' AND deleted_at IS NULL;
```

→ master 당 (description_type, language) 조합에 **canonical 1건만** 허용. source_type 무관.

---

## 2. 아스피린 52 현황

| 확인 | 값 |
|---|---:|
| 52 중 e약은요(mfds_easy_drug) STORE ko canonical 보유 | **52 / 52** |
| 52 중 ANY source STORE ko canonical 보유(슬롯 점유) | **52 / 52** |
| 전체 DB 에서 STORE ko canonical 2건+ 공존 master | **0** |
| authored(mfds_drug_otc) ∩ e약은요 canonical | **0** (상호배타) |

→ 52 는 **이미 e약은요로 STORE ko canonical 슬롯을 채웠다.** `mfds_drug_otc` canonical 을 INSERT 하면 **unique 제약 위반으로 실패**한다. WO gate 4("기존 ko STORE canonical 0")는 실제 **52** — 성립 불가.

---

## 3. 올바른 모델 (전 코퍼스 규범)

- master 의 STORE ko canonical = **e약은요 OR authored, 둘 중 하나** (unique 제약이 강제).
- **authored(mfds_drug_otc, 1,234)는 e약은요-미보유 master 전용**으로 작성됨(authored∩e약은요=0). [[project_otc_authored_corpus_no_easy_overlap]]
- 알파칼시돌 선례: 그룹 50 = e약은요 grounded 29(승격 제외) + promotable 21(STORE canonical 無 → 승격). **e약은요 보유 master 는 애초에 승격 대상이 아니었다.**

---

## 4. 파급 — apply 라인 전체 재프레이밍

- 재계산의 "무성분명 7,301 = 주성분코드필요(신규 authoring 대상)"는 **오해**였다. 이 7,301 은 grounded(전량 e약은요 canonical 보유) → **이미 STORE canonical 이 있다. 신규 INSERT 대상이 아니다.**
- "재사용/apply" 는 grounded 무성분명에는 **NO-OP**. 슬롯이 e약은요로 차 있다.
- 실질 apply 여지는 두 가지뿐:
  1. **e약은요-미보유 master** 에 authored 신규 canonical (= authored 코퍼스가 이미 해온 일).
  2. **e약은요 → 정제 authored 로 교체(업그레이드)** — e약은요 canonical deprecate 필요(status 변경 = UPDATE). WO 가 금지한 "기존 canonical UPDATE" 에 해당. **정책 결정 필요.**

---

## 5. 판정 · 다음

- **아스피린 52 파일럿을 INSERT 로 진행 불가.** dry-run 스크립트 작성은 무의미(unique 제약 확정 실패).
- 첫 apply 대상은 **STORE canonical 이 없는 master**여야 한다(알파칼시돌형). grounded 무성분명은 해당 없음.
- 사용자 결정 필요:
  - (A) grounded 무성분명은 이미 e약은요 canonical 보유 → **apply 불필요**(현행 유지).
  - (B) e약은요 → authored **업그레이드**를 원하면, deprecate+INSERT 교체 정책을 별도 설계(현 WO 금지사항 재검토).
  - (C) 첫 파일럿 대상을 **e약은요-미보유 그룹**으로 전환.
- DB write **0** 유지.

---

*read-only 구조 확인. unique 제약 + e약은요 슬롯 점유 = grounded 무성분명 authored INSERT 불가. apply 목표 재정의 선행.*
