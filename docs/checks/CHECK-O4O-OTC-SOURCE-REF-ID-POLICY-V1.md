# CHECK — source_ref_id 정책 재검토 (OTC canonical 승격)

**맥락:** Model B 아스피린 52 파일럿 → curated draft `0052dc6c` 를 52 master 에 승격 시, **동일 source_ref_id 공유가 F12 설명서 자산 정책상 허용되는가**
**성격:** read-only · DB write 0
**판정:** ✅ **공유 허용** (draft 0052dc6c 기반 ko 승격 dry-run 설계로 진행 가능)

---

## 0. 질문

파일럿 성격이 "각 제품 e약은요 원문 신규 authoring"(Model B) 에서 "완성 curated draft `0052dc6c` 를 52 master 에 승격·복제"로 바뀌었다. 동일 `source_ref_id` 를 52 에 공유해도 되는지 = 정책·선례 확인 필요.

---

## 1. source_ref_id 의미 (엔티티 정의)

`SharedProductDescription.entity.ts`:
- `source_ref_id` = **"출처 레코드 ID (offer_id / ai_content_id / user 등)"** — provenance 포인터.
- `source_type='o4o_hff_generated'` 주석: *"본문 제작주체=O4O, **source_ref_id=candidate**"* — O4O 작성 설명서의 source_ref_id 는 **authoring candidate(draft)** 를 가리킨다.
- **canonical 유일성 = `(master_id, description_type, COALESCE(language,'ko'))` 당 1건** (F12). **source_ref_id 는 유일성 키가 아니다.**

→ source_ref_id 는 **① 원천 e약은요 문서(X) ② 설명서 provenance = authoring draft(O) ③ per-master 식별자(X)**. **authored draft 자산 식별자**다.

---

## 2. 기존 데이터 선례 (mfds_drug_otc canonical)

| 지표 | 값 |
|---|---:|
| ko canonical source_ref_id 수 | 72 |
| 커버 master | 3,149 |
| **2+ master 공유하는 ref** | **72 / 72 (전부)** |
| 단일 ref 최대 커버 master | **585** |
| per-master(1:1) source_ref_id | **0** |

→ **하나의 source_ref_id 를 다수 master 에 공유하는 것이 예외가 아니라 보편 규범.** 최대 585 master 가 한 draft 에서 나옴. per-master source_ref_id 는 기존 OTC canonical 코퍼스에 **존재하지 않음**.

---

## 3. ko/en source_ref_id 규칙

| 지표 | 값 |
|---|---:|
| ko canonical | 1,234 |
| en canonical | 1,234 (완전 짝) |
| ko·en 둘 다 같은 source_ref_id 쓰는 ref | 56 |

→ **ko 와 en 은 동일 source_ref_id 를 공유**한다(draft 1개 → ko + en). 알파칼시돌 선례 동일.

---

## 4. per-master 원천 e약은요 추적

- 각 master 의 **원천 e약은요는 별도 row**(`source_type='mfds_easy_drug'` canonical, master 당 1건)로 이미 존재한다.
- 따라서 mfds_drug_otc canonical 의 source_ref_id 를 draft(0052dc6c)로 공유해도, **각 master 의 원천 e약은요 provenance 는 자기 mfds_easy_drug row 로 보존**된다. per-master 원천 추적 손실 없음.
- per-master source_ref_id 가 굳이 필요하지 않다. 필요해지면 draft 구조 변경 없이 원천 e약은요 row 로 역참조 가능.

---

## 5. 판정 — 공유 허용

`source_ref_id = 0052dc6c` 를 52 master 에 공유하는 것은:

1. ✅ 엔티티 설계(provenance = authoring candidate)에 부합
2. ✅ 기존 보편 규범(72/72 공유, 최대 585)과 일치
3. ✅ 알파칼시돌 선례(승인·LIVE)와 동일 메커니즘
4. ✅ F12 canonical 유일성 키(master_id+type+language)와 무충돌 — source_ref_id 는 키 아님
5. ✅ per-master 원천 e약은요 provenance 는 각 master 의 mfds_easy_drug row 로 보존

**WO 의 "source_ref_id 각 master 원문과 1:1 일치" 는 source_ref_id 의미(원천 e약은요가 아니라 authoring draft provenance)에 대한 오해였다.** canonical 은 master 별 1건(master_id 1:1) 생성되되, source_ref_id 는 draft 0052dc6c 공유가 정본.

---

## 6. 다음

- **공유 허용** 확정 → 다음 = draft 0052dc6c 기반 **ko 승격 dry-run 설계**(52 master, source_ref_id=0052dc6c 공유, 알파칼시돌 패턴). en 은 번역 후속.
- DB write **0** 유지. 실제 write 는 dry-run 보고 후 재승인.

---

*read-only 정책 판정. 공유 허용 근거 확정 — ko dry-run 설계 진행 가능.*
