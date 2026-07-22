# CHECK-O4O-OTC-NEXT-BATCH-8B-BUNDLE-DA-VERIFY-V1 — NEXT-BATCH-8B 묶음 B(뒤 4그룹) 완결 검증 (에이전트 다)

WO: `WO-O4O-OTC-ACETAMINOPHEN-... / NEXT-BATCH-8B 묶음 B` · 감사: `b82d7e7ed` (WO-O4O-OTC-GROUNDED-UPGRADE-NEXT-BATCH-8B-AUDIT-NA-V1, 에이전트 나)
상태: **완료 확인 — 담당 4그룹 전부 이미 ko+en canonical LIVE. 독립검증 PASS · 재실행 no-op 확인. 본 세션 DB write 0.**

---

## 0. 결론

> **감사 `b82d7e7ed` bundle `에이전트다` 4그룹(T 합계 29)은 선행 세션(`1d5ba9fef` 1H 생산·`3bdd73f9f` 범용 bundle runner)에서 이미 ko 승격 + en 완결 LIVE 상태였다.**
> 본 세션은 감사 대상 재현 → ko/en dry-run → 독립검증으로 **정확성·완결성 확인만** 수행(생산 없음). 4그룹 전부: 감사 T = 실측 target · ko/en canonical = T · easy deprecated = T · **target EN md5 = 대상 밖 sibling EN md5 byte-identical** · canonicalDup 0 · 재실행 ALREADY_UPGRADED / ALREADY_COMPLETE(write 0).

담당 4그룹은 감사 bundle 순서 뒤 4개. 앞 4그룹(아르기닌티디아시케이트·수산화마그네슘·이부프로펜·덱시부프로펜) = 에이전트 가. **교집합 0.**

---

## 1. 담당 4그룹 (감사 확정 = 실측 재현)

| # | groupKey | T | targetFp | candidate(source_ref) | exclude fp(합) | coarse |
|---|---|---:|---|---|---|---:|
| 1 | 사카로마이세스보울라르디균\|282.5밀리그램\|캡슐 | 7 | `ba82fd1299f5d730` | `16f0c2ef…` | 1 fp (4) | 11 |
| 2 | 니푸록사지드\|200밀리그램\|캡슐 | 7 | `0a755506d14ebefe` | `05c733cd…` | 3 fp (12) | 19 |
| 3 | 디오스민\|600밀리그램\|정 | 8 | `bbb731cc8414d08a` | `014af1cd…` | 17 fp (56) | 64 |
| 4 | 아세트아미노펜\|650밀리그램\|정 | 7 | `bdc125f5b4cd5c39` | `05690081…` | 15 fp (71) | 78 |

- 4그룹 모두 감사 `target_reproduced=true` · 동질성(단일 form/oral/strength, cauHash 1) · `nonOralInTarget=[]` · `out_cross_group_leak=0`.
- ko dry-run: 전부 **ALREADY_UPGRADED** (target 7/7·7/7·8/8·7/7 · 이상 0). registry(runner) 값 = 감사 값 일치.

---

## 2. EN 재사용 (byte-identical, 신규 문구 창작 0)

각 그룹 EN = source_ref 공유 대상 밖(out) 이미 검토완료 EN 재구성. **build md5 == live sibling EN md5 byte-identical** 로 새 medical fact 0 증명. (WO 번역 원칙: 확정 마스터 번역 우선 · 재사용 시 동일성 입증.)

| 그룹 | target EN md5 | sibling(out) EN md5 | sibling n | byte-identical | en dry-run |
|---|---|---|---:|:---:|---|
| 사카로마이세스 | `7574cc9aff8b…` | `7574cc9aff8b…` | 5 | ✅ | ALREADY_COMPLETE |
| 니푸록사지드 | `07211b8e7879…` | `07211b8e7879…` | 11 | ✅ | ALREADY_COMPLETE |
| 디오스민 600 | `23caa83e33fd…` | `23caa83e33fd…` | 26 | ✅ | ALREADY_COMPLETE |
| 아세트아미노펜 650 | `abe0e62f59ad…` | `abe0e62f59ad…` | 13 | ✅ | ALREADY_COMPLETE |

- 재사용 경로: `otc-en-translations-{slug}-v1.json`(선행 커밋) → `buildDrugOtcEnConsumerHtml` 계약 재구성 → runner consistencyMatch gate(build==live) = true. **입증 실패 그룹 0 → REVIEW_LATER 0.**

---

## 3. 독립검증 (fresh 연결 · 감사 target_master_ids 기준)

| 그룹 | ko canonical | en canonical | easy deprecated | canonicalDup | byte-identical | 판정 |
|---|---:|---:|---:|---:|:---:|:---:|
| 사카로마이세스 (T7) | 7 | 7 | 7 | 0 | ✅ | PASS |
| 니푸록사지드 (T7) | 7 | 7 | 7 | 0 | ✅ | PASS |
| 디오스민 600 (T8) | 8 | 8 | 8 | 0 | ✅ | PASS |
| 아세트아미노펜 650 (T7) | 7 | 7 | 7 | 0 | ✅ | PASS |

- ko/en canonical 전부 `source_type='mfds_drug_otc'`. target_master_ids = 감사 값 정확 일치. **ALL PASS.**

---

## 4. 게이트/중지 조건 대조

| WO 자동 apply 조건 | 결과 |
|---|---|
| dry-run·postVerify PASS | ✅ (전 그룹 이상 0) |
| 감사 확정 T = 실측 target | ✅ (7/7/8/7) |
| 예상 write = 실측 write | ✅ (이미 반영, 본 세션 write 0) |
| canonicalDup 0 | ✅ |
| 기존 LIVE drift 0 | ✅ (재실행 no-op, 내용 불변) |
| target 밖 sibling byte-identical | ✅ (§2) |
| 모든 링크 정상 | ✅ (ko/en canonical = T, source_ref 연결) |
| rollback 보장 | N/A (write 0) |

| 중지 조건 | 결과 |
|---|---|
| 가 담당 그룹과 교집합 | 없음 (앞 4 = 가, 뒤 4 = 다) |
| 감사 target과 실측 불일치 | 없음 |
| 번역 재사용 동일성 입증 실패(다수 그룹) | 없음 (4/4 byte-identical) |
| master 오연결 / canonical·rollback 실패 / write 불일치 / 독립검증 실패 | 없음 |

---

## 5. 보고 요약

```text
담당 4그룹(감사 bundle 에이전트다, 뒤 4): 사카로마이세스보울라르디균 282.5mg 캡슐(T7) · 니푸록사지드 200mg 캡슐(T7) · 디오스민 600mg 정(T8) · 아세트아미노펜 650mg 정(T7)
그룹별 T: 7 · 7 · 8 · 7 (합 29)
KO / EN / 총 write: 이미 LIVE (선행 세션 1d5ba9fef/3bdd73f9f). 본 세션 신규 write 0.
   (감사 예상 = ko 4T=116 · en 2T=58 · total 6T=174 — 선행 반영 완료)
기존 LIVE EN 재사용: 4/4 그룹 sibling EN byte-identical(7574cc9a/07211b8e/23caa83e/abe0e62f), consistencyMatch true — 신규 문구 창작 0
REVIEW_LATER: 0 (재사용 입증 실패 0)
canonicalDup: 0 (전 그룹)
target 밖 drift: 0 (sibling EN byte-identical, out 5/11/26/13 불변)
재실행 no-op: ALREADY_UPGRADED(ko) · ALREADY_COMPLETE(en) 전 그룹 확인
중지 사유: 없음
```

> 담당 4그룹은 본 WO 도달 시점에 이미 완결 LIVE 상태였다. 본 세션은 감사 확정 대상 재현·독립검증·no-op 확인으로 완결성을 입증했고, 선행 세션이 dry-run 과정에서 갱신된 run.json 산출물은 HEAD 로 원복하여 타 세션 커밋 아티팩트를 보존했다(본 세션 코드/데이터 write 0, 신규 산출물 = 본 CHECK 문서만).
