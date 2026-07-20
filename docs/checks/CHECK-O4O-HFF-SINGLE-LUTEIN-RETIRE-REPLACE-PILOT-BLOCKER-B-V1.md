# CHECK — single-lutein RETIRE+REPLACE 파일럿 착수 조사 · 중지 보고 (Agent B) V1

- 상위 설계: `CHECK-O4O-HFF-SINGLE-LINE-ABSORPTION-CORRECTION-DESIGN-A-V1` (commit `fa082f7f8`, Agent A) — 확정 기준 문서.
- 성격: **read-only 조사 · DB write 0 · apply 미실행 · canonical 변경 0**.
- 결론: **파일럿 중지**. 중지 조건 `verifiedFullSet 불일치` · `그룹별 10/15/6 불일치` 해당.

---

## 1. 대상 고정 (지시대로 31건)

큐 `hff-single-line-absorption-correction-queue.json` 에서 `singleLine=루테인 · registryReady=true · action=RETIRE_REPLACE` = **34**.
지시대로 3그룹 **31** 고정, 고N 다원료 **3** 은 **고N 복합형 별도 배치**로 분리(파일럿 계약 검증 범위 밖).

| 파일럿 | 큐 그룹 | 건수 |
|---|---|:-:|
| 포함 | 루테인+비타민A | 10 |
| 포함 | 루테인+비타민E | 15 |
| 포함 | 루테인+비타민A+비타민E | 6 |
| **합계** | | **31** |
| 제외 | N7 `나이아신+루테인+B1+B12+B2+셀레늄+아연` (200400150831010) | 1 |
| 제외 | N4 `루테인+비타민A+B1+B6` (200700170351810) | 1 |
| 제외 | N7 `구리+루테인+B2+B6+비타민E+셀레늄+아연` (2024002023362) | 1 |

## 2. ① 기존 단일 canonical 링크 확인 — **PASS (31/31)**

`hff-lut-correction-probe.ts` (read-only):

- master(`mfds_permit_number=stmt`) **정확히 1건/제품**, 전건 tag `batch:single-nutrient-lutein` (31)
- STORE canonical **ko 1 + en 1** (active: `status='canonical' AND deleted_at IS NULL`) — 누락 0
- candidate 1건, `candidate_status='approved_new_master'`, `matched_product_master_id == master.id`
- `SPD.source_ref_id == candidate.id` 전건 일치 · `source_type='o4o_hff_generated'`
- **문제 0건.** RETIRE+REPLACE 가 물릴 기존 링크는 건전하다.

### 계약 제약 확인 (스키마)
```sql
uniq_shared_product_descriptions_canonical_per_master_type_lang
  ON (master_id, description_type, COALESCE(language,'ko'))
  WHERE status='canonical' AND deleted_at IS NULL     -- 20261228000000
```
→ 은퇴는 `deleted_at=now()` 로 부분 인덱스 술어에서 이탈시키면 충분. **단일 트랜잭션 내 순서 = 은퇴(UPDATE) → 신규(INSERT)** (역순이면 unique 위반).

## 3. ② verifiedFullSet 재검증 — **FAIL (31 중 16 불일치)**

`hff-lut-fullset-audit.ts` — 큐의 `verifiedFullSet` 과 **원문 실측**(BASE_STANDARD 표시량 spec ∩ MAIN_FNCTN 등재 기능성) 대조:

| 구분 | 집계 |
|---|---|
| 큐 그룹 | `루테인+비타민A` 10 · `루테인+비타민E` 15 · `루테인+비타민A+비타민E` 6 |
| **실측 그룹** | **`루테인+비타민A+비타민E` 16** · `루테인+비타민A` 5 · `루테인+비타민E` 4 · `루테인` 1 · 판정보류 5 |
| **MISMATCH** | **16 / 31** |

### 3-1. 원문 verbatim 증거 (2원료로 큐잉됐으나 실제 3원료)

`200400170061613` — 큐 `루테인+비타민A`:
```text
BASE: 2) 비타민A: 표시량(210 μgRE/600 mg)의 80~150%
      3) 비타민E: 표시량(3.3 mga-TE/600 mg)의 80~150%     ← 표시량 spec 존재
      4) 루테인 : 표시량(20 mg/600 mg)의 80~120%
MAIN: [마리골드꽃추출물]… [비타민A]①②③ [비타민E] 항산화 작용을 하여 …필요   ← E 기능성 등재
```
`20190004553406` · `20220020002114` — 큐 `루테인+비타민E`: BASE·MAIN 모두 **비타민A 포함**(A 기능성 3개 명시).
`200400200023677` — 큐 `루테인+비타민E`: BASE 에 `비타민A 210ug RAE` + `비타민E 11mg α-TE` 둘 다 존재.

→ 큐 그룹대로 2원료 설명서를 게시하면 **누락된 원료의 공식 기능성이 다시 빠진다** = 이번 교정이 없애려는 흡수 결함을 **재생산**한다.

### 3-2. 원인 — 단위 수식어·포맷 변이가 파서를 무력화

| 변이 | 실례 | 영향 |
|---|---|---|
| α 문자 깨짐 | `3.3 mga-TE` (mg α-TE) | 생산 SPEC 정규식 `(?:RE\|α-?TE\|NE\|DFE)?` 불일치 → E spec 미포착 |
| ASCII u | `210 ugRE` · `700ug RE` · `210ug RAE` | 단위군 `(mg\|g\|㎍\|μg\|mcg\|IU)` 에 `ug` 부재 → A spec 미포착 |
| 라벨 공백 | `비타민 E :` | 라벨 캡처 경계 흔들림 |
| MAIN_FNCTN 포맷 | `[원료]` 브래킷 vs `1) 원료 : …` 번호목록 | 귀속 파서가 한쪽만 처리 |

- **생산 파이프라인(`hff-combo-select`)** 도 동일 이유로 31 중 **13건만** 조합 grounding 성공(G1 5/10 · G2 2/15 · G3 6/6). 나머지 18 은 spec 미포착 또는 미귀속 기능성으로 HOLD.
- ⚠️ **본 감사 파서도 동일 계열 한계 보유** — 브래킷 전용 기능성 파싱 + `ug` 미지원 → 실측 "판정보류 5"·"루테인 1" 은 **감사 한계이지 제품 결함 단정 아님**(예: `200400200022869`·`200400170061351` 은 수기 확인 시 큐의 `루테인+비타민A` 가 맞다).
- 따라서 **큐 그룹도, 본 감사 실측도 단독으로는 게시 근거가 될 수 없다.**

## 4. 중지 판정

| 중지 조건 | 해당 | 근거 |
|---|:-:|---|
| 31건 중 기존 ko/en canonical 누락 | ✗ | §2 PASS (31/31) |
| **그룹별 10/15/6 불일치** | **✓** | 실측 16/31 불일치 (§3) |
| **verifiedFullSet 불일치** | **✓** | 큐 2원료 → 실제 3원료 다수, verbatim 확인 (§3-1) |
| 제외 3건 혼입 | ✗ | 31 고정, 혼입 0 |
| master/candidate/source_ref_id 변경 | ✗ | 미실행 |
| canonicalDup | ✗ | 미실행 |
| write 예상·실측 불일치 | — | 미실행 |

→ **③ 계약 구현 / ④ dry-run 이후 단계 미착수.** DB write 0 · canonical 변경 0 · 부분 apply 0.

## 5. 선행조건 (해소 후 재개)

1. **spec 파서 하드닝** — 단위 수식어 정규화(`mga-TE`/`α-TE`/`ug`/`ugRE`/`ug RAE`/`㎍`/공백 변이) + 라벨 공백 허용. 생산 `hff-combo-select` 와 감사 파서 **양쪽**.
2. **MAIN_FNCTN 귀속 파서** — 브래킷 `[원료]` + 번호목록 `1) 원료 :` 양식 모두 처리.
3. **비타민E 항산화 정책 확정** — E 항산화 기능성을 *기능성 원료*로 볼지 *benign 부원료*로 볼지에 따라 G1↔G3, G2↔G3 소속이 바뀐다. 큐가 제품별로 엇갈리게 처리돼 있어 **명시 규칙 필요**(설계 §2 B_BENIGN 정의와 정합 필요).
4. 위 1~3 반영 후 **31건 full-set 재도출 → 그룹 재확정** → 그때 파일럿 재개(계약 §2·스키마 제약은 이미 검증 완료라 재사용 가능).

## 6. 보고 요약

```text
대상 고정:        31 (10/15/6) · 고N 3건 별도 배치 분리
① 링크 확인:      PASS 31/31 (master 1 · ko/en canonical 1/1 · candidate matched · source_ref 일치)
② full-set 재검증: FAIL — 16/31 불일치 (큐 2원료 → 실측 3원료 다수, verbatim 증거)
원인:             단위 수식어(mga-TE·ug RAE)·라벨 공백·MAIN_FNCTN 포맷 변이 → 생산/감사 파서 양쪽 과소추출
생산 파이프라인:   combo-select 로 grounding 성공 13/31 뿐
판정:             파일럿 중지(verifiedFullSet·그룹 불일치). 구현·dry-run·apply 미착수
DB write:         0 · canonical 변경 0 · 부분 apply 0
선행조건:         파서 하드닝(spec·기능성귀속) + 비타민E 항산화 정책 확정 → full-set 재도출 → 재개
재사용 가능:      RETIRE+REPLACE 계약(은퇴 deleted_at → 신규 INSERT 순서) · 스키마 제약 검증 완료
```

---

*read-only 조사 · DB write 0 · canonical 변경 0 · 부분 apply 0. 교정 실행은 §5 선행조건 해소 + 승인 후.*
