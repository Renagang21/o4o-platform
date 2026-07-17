# CHECK-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-DRYRUN-V1 — 유실 설명서 복구안 (dry-run)

WO: `WO-O4O-OTC-EASYDRUG-NB-DOC-RECOVERY-DRYRUN-V1` · 일자: 2026-07-17 · 상태: **완료 (dry-run)**
근거: [NB-DOC-BULK-FETCH](./CHECK-O4O-OTC-NB-DOC-BULK-FETCH-V1.md) · [SOURCE-RECOVERY IR](../investigations/IR-O4O-OTC-OFFICIAL-SOURCE-RECOVERY-AUDIT-V1.md) · [SAFETY-OMISSION-AUDIT §4](./CHECK-O4O-OTC-AUTO-CANONICAL-SAFETY-OMISSION-AUDIT-V1.md)

> **dry-run 전용.** DB write **0** · canonical UPDATE **0** · NB_DOC 전체 대체 **0** · 영문 자동수정 **0** · 근거 없는 문구 보완 **0**.

---

## 0. 결론

> **136 유실 item_seq 전수 판정. NB_DOC 전체 교체가 아니라 유실 구간(크레아티닌 청소율 수치 등)만 최소 복원한다. 즉시 자동 적용 가능 = 20 item_seq / 108 master(ko), 영문 UPDATE = 0.**
>
> | 판정 | item_seq | ko master | en master |
> |---|---:|---:|---:|
> | **자동 복구 가능** | **20** | **108** | 0 |
> | 수동 검토 후 복구 | 93 | 375 | 0 |
> | NB_DOC 근거 부족 | 1 | 3 | 0 |
> | 복구 불필요 | 22 | 99 | 0 |
> | **합** | **136** | **585** | **0** |
>
> **영문(en) = 0**: 유실 SPD(`mfds_easy_drug`)는 **ko 전용**, en canonical 부재(실측). 영문 수정 대상 없음.

---

## 1. 대상 (NB-DOC-BULK-FETCH 연계)

- 유실 의심 item_seq **136**(creatinine 27 + paren_suspect 109), 각 대표 저장본 1건 대조. 총 ko 585 master.
- NB_DOC 확보 197 중 대상 연결분 사용. **no_item(원문없음)은 복구 대상에서 제외**(→ NB근거부족).
- 근거: `docs/investigations/samples/nb-doc-bulk-v1/stored-setA.json`(저장본) ↔ `responses/<item_seq>.json`(NB_DOC).

---

## 2. 유실 구조 (저장본 vs NB_DOC 실측)

| 유형 | 저장본(유실) | NB_DOC(원문) | 복원 가능? |
|---|---|---|:---:|
| **크레아티닌 청소율 수치** | `신부전 환자(크레아티닌 청소율 ` + [유실] | `신부전 환자 (크레아티닌 청소율 &lt; 10mL/min)` | ✅ 수치 확보 |
| pH 값 | `부드러운 음식(pH` + [유실] | (품목별 상이) | ⚠️ 소수·수동 |
| **미닫힘 괄호 오탐** | `약물(예: 에스트로겐…지질감소약물…복용하지 마십시오.` | — | ❌ **정보손실 없음**(닫힘괄호만 유실) |

> **핵심**: `<` 를 태그로 오인해 `<…>` 를 삭제한 유실. 크레아티닌은 `< 10 mL/min)` 구간이 사라짐. NB_DOC 는 이를 `&lt; 10mL/min` 로 온전 보존. **paren_suspect 109 중 다수는 오탐**(긴 괄호절의 닫힘 `)` 만 유실 — 내용 온전).

---

## 3. 복구 모델 (최소·근거기반)

1. **전체 대체 금지** — NB_DOC 본문으로 교체하지 않는다. 유실된 **수치·조건만** 삽입.
2. **근거 한정** — 삽입 문구는 NB_DOC 에 실재하는 값(`&lt; 10 mL/min` 등)만. 종결부("…복용하지 마십시오")처럼 NB 에 verbatim 없는 문구는 **만들지 않는다**.
3. **escape** — 삽입 값은 NB 의 엔티티(`&lt;`)를 그대로 사용. raw `<` 유입 시 `escapeHtmlPreservingEntities`([derive.service](../../apps/api-server/src/modules/neture/drug-import/easy-drug-shared-description-derive.service.ts)) 적용 → 이중 escape 없음.
4. **find/replace** — 저장본에서 고유한 앵커(`크레아티닌 청소율 `)를 찾아 값+`)` 삽입. 앵커 비고유·경계 이어붙음은 자동 제외.

**자동 예시** (199700265):
```
전: …신부전 환자(크레아티닌 청소율 \n\n이 약을 복용하기 전에…
후: …신부전 환자(크레아티닌 청소율 &lt; 10 mL/min)\n\n이 약을 복용하기 전에…
```

---

## 4. 판정 상세

### 4-1. 자동 복구 가능 — 20 seq / 108 master (화이트리스트)
크레아티닌 수치 유실 + 앵커 `크레아티닌 청소율 ` **고유**(전건 100%) + 유실점 직후 **문단/문장 경계**(`\n`·`</p>`·문장부호) → 값 삽입 후 문장 정합. 산출물 `recovery-whitelist.json`.

### 4-2. 수동 검토 후 복구 — 93 seq / 375 master

| 소분류 | seq | master | 사유 |
|---|---:|---:|---|
| 크레아티닌값·경계검토 | 86 | 354 | 값 복원 가능하나 유실이 **문단 경계까지 삭제** → 다음 절이 바로 이어붙음(`…mL/min)이 약을…`). **문단 구분(\n\n) 삽입=서식 판단** 필요 |
| pH 값 유실 | 3 | 7 | NB 품목별 상이, 수동 대조 |
| 크레아티닌 앵커 비고유 | 4 | 14 | `크레아티닌 청소율 ` 2회 이상 → 삽입 위치 수동 확정 |

### 4-3. NB_DOC 근거 부족 — 1 seq / 3 master
201906326(엘드로캡슐): 크레아티닌 유실이나 해당 NB_DOC 에 청소율 수치 없음 → 복원 불가.

### 4-4. 복구 불필요 — 22 seq / 99 master
`(예: …), (심한 두통, 구역…)` 처럼 **괄호 내용은 온전**하고 닫힘 `)` 만 유실 → **정보 손실 0**. 조건·문장 유실 아님 → 조치 없음(서식상 `)` 보정은 별건·선택).

---

## 5. 예상 UPDATE 수량

| 단계 | 대상 | ko UPDATE(master) | en |
|---|---|---:|---:|
| **즉시(Tier 1)** | 자동 복구 20 seq | **108** | 0 |
| Tier 2(설계 승인 후) | 크레아티닌 경계검토 86 seq | 최대 354 | 0 |
| 수동 | pH 3 + 앵커비고유 4 seq | 최대 21 | 0 |
| 없음 | NB부족 1 + 복구불필요 22 | 0 | 0 |

> UPDATE 단위 = **master**(item_seq 당 ko_masters 개 SPD row 가 동일 content 공유 → 동일 find/replace 적용). en 전 구간 0.

---

## 6. 대상 외 콘텐츠 불변 검증 방식 (apply WO 설계)

1. **find 고유성** — 각 대상 저장본에서 `find` 출현 1회 검증(실측 20/20 통과). 비고유는 자동 제외.
2. **델타 최소성** — apply 후 `content = before.replace(find, replace)`; `before`↔`after` diff 가 **삽입된 `&lt; N mL/min)` 뿐**임을 역치환(`after.replace(replace,find)===before`)으로 증명.
3. **스코프 제한** — UPDATE 는 대상 item_seq 의 master_id 집합에 한정(WHERE), 그 외 SPD row 지문 불변.
4. **비대상 불변** — 자동 20 외 그룹 canonical count·해시 사전/사후 동일.
5. **멱등** — 이미 `&lt; N mL/min)` 포함 시 find 불일치 → no-op.

---

## 7. 실제 복구 apply WO 범위 (제안)

| WO | 범위 | write |
|---|---|---|
| **RECOVERY-APPLY Tier1** | 화이트리스트 20 seq / 108 master ko canonical UPDATE(값+`)` 삽입) — 이중게이트·역치환·비대상 불변 | canonical UPDATE |
| RECOVERY-APPLY Tier2(설계) | 크레아티닌 경계검토 86 seq — 값+`)`+문단구분 삽입 모델 승인 후 | canonical UPDATE |
| 수동 | pH 3 + 앵커비고유 4 — 건별 확정 | canonical UPDATE |

---

## 8. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 136건 전수 판정 | ✅ 자동 20 / 수동 93 / NB부족 1 / 불필요 22 |
| 최소 복구 가능 대상 확정 | ✅ 화이트리스트 20 seq / 108 master(`recovery-whitelist.json`) |
| ko/en 적용 예상 수량 확정 | ✅ 즉시 ko 108 / en 0. 단계별 §5 |
| 실제 복구 apply WO 범위 제시 | ✅ §7 (Tier1/Tier2/수동) |
| DB·콘텐츠 변경 0 | ✅ read-only 대조 |
| commit·push | ✅ |

---

## 9. 산출물

- `docs/investigations/samples/nb-doc-bulk-v1/recovery-whitelist.json` — 자동 복구 20 (find/replace/NB근거)
- `docs/investigations/samples/nb-doc-bulk-v1/recovery-classification.json` — 136 전수 판정(수동 검토 목록 포함)
- `docs/investigations/samples/nb-doc-bulk-v1/stored-setA.json` — 저장본 근거

> **금지 준수**: DB write·canonical UPDATE·NB 전체 대체·영문 자동수정·근거 없는 문구 보완 **전부 0**. 다음: 화이트리스트 20 을 apply WO(Tier1)로 공개 설명서에 반영.
