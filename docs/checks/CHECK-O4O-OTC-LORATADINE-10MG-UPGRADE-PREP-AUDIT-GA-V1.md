# CHECK — WO-O4O-OTC-LORATADINE-10MG-UPGRADE-PREP-AUDIT-GA-V1

**에이전트 가 · read-only 실행 준비 감사 (DB write 0) · 2026-07-20**

로라타딘 10mg 정 38건을 다음 Track A 승격 후보로 apply 전 최종 read-only 점검하고, 범용 runner
([`drug-otc-grounded-upgrade-runner.ts`](../../apps/api-server/src/scripts/drug-otc-grounded-upgrade-runner.ts)) 등재용 `GROUP_REGISTRY` config 초안을 산출한다.
**runner 파일 미수정 · fingerprint/정책 변경 없음 · 실제 등재/apply 없음.**

스크립트: [`drug-otc-loratadine-10mg-upgrade-prep-audit.ts`](../../apps/api-server/src/scripts/drug-otc-loratadine-10mg-upgrade-prep-audit.ts)
산출: [`otc-loratadine-10mg-upgrade-prep-v1.json`](../../apps/api-server/src/scripts/data/otc-loratadine-10mg-upgrade-prep-v1.json)

---

## 1. 점검 결과 — **verdict READY (anomalies 0)**

| 점검 | 결과 | 판정 |
|---|---|:-:|
| target fp `83bcf192525baa16` 재고정 | **38** master (coarse 41) | ✅ |
| 비대상(exclude) fp | **단일 `168c9fc2508b87da` = 3** master (전부 `로타인정(로라타딘)`) | ✅ |
| other(미분류) fp | **0** (coarse 41 = target 38 + exclude 3) | ✅ |
| target ∩ exclude 교집합 | **0** | ✅ |
| e약은요 STORE ko canonical 정확히 1/master | **38/38** | ✅ |
| authored source_ref `0a7dee0b…` draft 완성도 | 필수필드 누락 0 · sd-warn ✓ · `<table>`/주석/이중escape 0 · htmlLen 1661 · hash `db9f24b6…` | ✅ |
| authored canonical 충돌 | **0** | ✅ |
| 기존 authored needs_review | **0** | ✅ |
| 함량·제형·경로·안전지문 동질성 | dose `10밀리그램` 단일 · form `정` 단일 · route `oral` 단일 · **target fp distinct 1** · 비경구 혼입 0 | ✅ |
| rollback master IDs | **38 고정** (JSON `rollback_master_ids`) | ✅ |
| 예상 write | **SPD 114** (needs_review INSERT 38 + demote 38 + flip 38) · **audit 38** (canonical_replaced 1행/교체) · grand 152 | ✅ |

- fp 재현 정확일치(target 38 === 직전 감사 bridge 38) · 동질성 완전 → 안전지문불일치 3건(로타인정)은 별도 fp 로 **carve-out**(편입 금지).
- draft title `로라타딘 10mg 정` · summary `로라타딘 10mg`. audit 수는 파일럿/runner 와 동일하게 엔티티 `canonical_replaced` 1행/교체 기준(정책 §2-A 2행/master 불일치는 기존 플래그 유지, apply WO 에서 정합).

### exclude master IDs (편입 금지 · 3)
`7ad63fdf-f6ce-430c-905b-2524f42a8b0c` · `f1e1bcbd-3a79-4cf9-9eb6-e31110b00d90` · `f22fe18d-ded9-4d65-906d-ddd5ec6080ca` (전부 `로타인정(로라타딘)`, fp `168c9fc2508b87da`).
target 38 master IDs 전량은 산출 JSON `target_master_ids`(=`rollback_master_ids`).

---

## 2. GROUP_REGISTRY 등재용 config 초안

> **초안만** — 실제 runner 등재는 별도 apply WO. `excludeFp` 단일값(비대상 fp 1종) → runner `classifyByFingerprint` 의 `other===0` 게이트 충족.

```ts
'loratadine-10mg-jeong': {
  key: '로라타딘|10밀리그램|정',
  ingredient: '로라타딘',
  dose: '10밀리그램',
  formKeyword: '정',
  candidate: '0a7dee0b-e578-4015-967a-fad092071eef',
  targetFp: '83bcf192525baa16',
  excludeFp: '168c9fc2508b87da',   // 비대상 3 master 단일 fp
  expected: 38,
  excludedExpected: 3,
  authoredSource: 'mfds_drug_otc',
  outBase: 'otc-grounded-upgrade-loratadine-10mg-jeong',
},
```

- coarse 열거·fp 산식을 runner VERBATIM 재현 → 등재 후 runner dry-run 시 target/exclude 분류 byte-identical.
- apply 경로: 등재 → `--group=loratadine-10mg-jeong` dry-run(PASS·anomaly 0 확인) → 이중게이트(`--apply` + `DRUG_OTC_GROUNDED_UPGRADE_CONFIRM=YES`).

---

## 3. 재실행 결정론

정렬 고정(master id asc · fp asc)으로 **2회 연속 산출 JSON byte-identical** (md5 `12dea12f7c7572d4be6cffd0248fd949`). fp 재현 정확일치 → target/exclude 집합 불변.

---

## 4. 금지 항목 준수

| 금지 | 준수 |
|---|---|
| DB write | ✅ read-only SELECT 만 (dbWrite 0) |
| 실제 runner 등재·apply | ✅ runner 파일 미수정 · config 초안만 산출 |
| 제외 3건 편입 | ✅ carve-out, target∩exclude 0 |
| 바실루스·디오스민 작업 개입 | ✅ 로라타딘 groupKey 단독 |
| fingerprint·정책 변경 | ✅ runner/파일럿 산식 VERBATIM |

**결론**: 로라타딘 10mg 정 38건 = **승격 준비 완료(READY)**. GROUP_REGISTRY config 초안 제공. 실제 등재·apply 는 별도 이중게이트 WO 로 진행.
