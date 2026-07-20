# CHECK-O4O-OTC-BACILLUS-LICHENIFORMIS-250MG-KO-UPGRADE-DA-V1 — 바실루스리케니포르미스균 250mg 캡슐 ko 승격 (에이전트 다)

WO: `WO-O4O-OTC-BACILLUS-LICHENIFORMIS-250MG-KO-UPGRADE-DA-V1` · 일자: 2026-07-20 · 상태: **완료 — ko 56건 authored canonical 승격 LIVE (독립검증·ALREADY_UPGRADED PASS)**
runner: `apps/api-server/src/scripts/drug-otc-grounded-upgrade-runner.ts` · 감사 기준: 커밋 `c15c6bbb4`(에이전트 가) · 채널: Cloud SQL Auth Proxy(:5442) → production o4o_platform.

---

## 0. 결론

> **Track A 3번째 그룹. 바실루스리케니포르미스균 250mg 캡슐(단일 target fp 56 · 비대상 7 fp 32)을 GROUP_REGISTRY 등재 → dry-run 2회 PASS·byte-identical(md5 `9ba9a641ec74f52cf8e71058a6862f51`) → 기존 승인 봉투 계약으로 ko apply → COMMIT. coarse 88 = target 56 + exclude 32 + other 0 · 교집합 0 · easy1 56 · 충돌 0 · nr 0. write = SPD 168(STEP A 56 + demote 56 + flip 56) · audit 56 · 총 224. TX 사후검증 PASS · 독립검증 PASS · ALREADY_UPGRADED 재실행 no-op. runner 계약 변경 없음(excludeFp 배열 기구현). EN HOLD(에이전트 나 정책 확인 전).**

---

## 1. 대상 (감사 커밋 c15c6bbb4 고정)

| 항목 | 값 |
|---|---|
| groupKey | `바실루스리케니포르미스균\|250밀리그램\|캡슐` |
| target fingerprint | `13208b062a9c8c79` (단일) |
| authored source_ref_id (write-owner) | `022f4af0-1219-428b-bd69-fa39a5e7fe7f` |
| authored source | `mfds_drug_otc` |
| 승격 대상 | **56 master** · coarse 제외(비대상) **32**(7 fp) · coarse total 88 |

비대상 7 fp: `085e66182ccb8459`(6)·`14860d74206f81f7`(6)·`7ed92e6bd2891a28`(5)·`a024d7fa8eaabc06`(5)·`b97a4eb486a66e60`(4)·`273d81582c3dcd4e`(3)·`8f001c52affcd167`(3) = 32.

---

## 2. dry-run 게이트 (PASS · 2회 결정론)

| 게이트 | 값 | 기대 | 판정 |
|---|---:|---:|:---:|
| coarse total | 88 | 88 | ✅ |
| target (fp 13208b06) | **56** | 56 | ✅ |
| excluded (비대상 7 fp) | **32** | 32 | ✅ |
| other (미분류) | **0** | 0 | ✅ |
| target ∩ exclude | **0** | 0 | ✅ |
| easy STORE ko canonical 정확히 1 | **56** | 56 | ✅ |
| authored canonical 충돌 | **0** | 0 | ✅ |
| 기존 authored needs_review | **0** | 0 | ✅ |
| upgradeState (authored/easy/none) | 0 / 56 / 0 | — | ✅ 전량 easy |
| anomalies | **0** | 0 | ✅ |

재실행 결정론: dry-run 2회 산출 JSON md5 동일 `9ba9a641ec74f52cf8e71058a6862f51`.

---

## 3. APPLY 결과 (ko 56건 승격 LIVE)

기존 승인 봉투 계약(dry-run PASS → 중간 승인 없이 ko apply)으로 이중게이트(`--apply` + `DRUG_OTC_GROUNDED_UPGRADE_CONFIRM=YES`) 실행 → COMMIT.

| 단계 | 연산 | 수 | 기대 | 판정 |
|---|---|---:|---:|:---:|
| STEP A | authored needs_review INSERT | **56** | 56 | ✅ |
| STEP B | easy canonical → deprecated | **56** | 56 | ✅ |
| STEP B | authored needs_review → canonical flip | **56** | 56 | ✅ |
| — | **SPD 소계** | **168** | 168 | ✅ |
| audit | canonical_replaced INSERT | **56** | 56 | ✅ |
| — | **총 write** | **224** | 224 | ✅ |

- **TX 내부 사후검증**: canonical1 56 · authored 56 · deprecatedEasy 56 · dup 0 → PASS → COMMIT.
- **독립 검증(별도 pg 연결)**: canonical source `mfds_drug_otc` 56 · canonical 정확히1 56 · deprecated easy 56 · audit `canonical_replaced` 56 · metadata(previousSource=mfds_easy_drug·newSource=mfds_drug_otc·groupKey) 56/56 ✅.
- **ALREADY_UPGRADED 재실행**: `status=ALREADY_UPGRADED`, write 0, 정상 종료 ✅.
- 중단 조건 해당 없음(target 56·exclude 32 불변 · 대상 외 혼입 0 · 안전지문·수치 불일치 0 · 충돌 0 · write 224=예상 일치 · 사후검증 PASS).

---

## 4. EN 트랙 — HOLD

WO 지시대로 EN 승격은 **에이전트 나의 정책 확인 전까지 실행하지 않음**. (약품 콘텐츠는 grounded 원문 없이 외부 LLM 자동번역 금지 — CLAUDE.md 콘텐츠 작성 불변 원칙.)

---

## 5. 완료 보고 요약

- **dry-run**: PASS (2회 byte-identical, md5 `9ba9a641ec74f52cf8e71058a6862f51`)
- **apply**: ko 56건 승격 LIVE (SPD 168 · audit 56 · 총 224) · TX 사후검증 PASS
- **target / exclude / other**: 56 / 32 / 0 (교집합 0)
- **기존 needs_review**: 0
- **독립 검증**: PASS (canonical `mfds_drug_otc` 56 · deprecated easy 56 · audit 56/metadata 56)
- **ALREADY_UPGRADED 재실행**: PASS (write 0)
- **rollback IDs**: 56 (`src/scripts/data/otc-grounded-upgrade-bacillus-liche-250mg-capsule.run.json`)
- **EN**: HOLD (에이전트 나 정책 확인 전)
- **commit SHA**: 본 커밋

> **rollback** = master 56 + audit `canonical_replaced` 56(previous=deprecated easy, new=authored). 남은 clean 후보: 디오스민 300mg 캡슐(38) — 별도 WO 대기.
