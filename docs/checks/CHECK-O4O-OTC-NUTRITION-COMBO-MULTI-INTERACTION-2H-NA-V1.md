# CHECK-O4O-OTC-NUTRITION-COMBO-MULTI-INTERACTION-2H-NA-V1 — 마그신·레날비타 상호작용 EN 완결 (에이전트 나)

WO: `WO-O4O-OTC-NUTRITION-COMBO-MULTI-INTERACTION-2H-NA-V1` · 일자: 2026-07-22 · 상태: **완료 — 2그룹(마그신·레날비타) 76 master EN 완결 LIVE. 상호작용 문구 ko 그대로 보존 검증 성공.**
runner: `otc-nutrition-combo-en-only-runner-na.ts`(자기 전용, 공용 registry 미수정) · config: `otc-nutrition-combo-interaction-en-na.config.json` · claim: `otc-production-claim.na.json` · 채널: Cloud SQL Auth Proxy(127.0.0.1:5442) → production.

---

## 0. 결론

> **마그신(마그네슘·비타민B6, 16)·레날비타(비타민B1·B2·B6·C, 60) 두 그룹 = 76 master 의 영문 STORE 설명서를 fresh 번역 → en canonical 완결(LIVE)**. en write 152(persist 76 + flip 76). **다약물 병용·상호작용 문구를 ko 열거 그대로 병렬 번역**(마그신: 인산염·칼슘염·테트라사이클린계·제산제·레보도파 5항목 / 레날비타: 레보도파) — **문장 통합·기전 설명·위험도 재판단 없음**, 금기·상담 강도 보존. ko canonical 전량 불변(count·지문). 전 그룹 dry-run 2회 byte-identical · 독립검증 PASS · 재실행 ALREADY_COMPLETE(write 0). **원문에 없는 상호작용 해석 불필요 → 두 그룹 모두 READY**.

---

## 1. 배정 상한·실제 시간·시작

- 상한 2시간. 실제 감사·번역·2그룹 생산(<2h). main==origin/main(0/0)·미완료 자기 작업 0·타 에이전트 claim 0(nutrition_combo). 소유 대상 = 마그신·레날비타 2그룹 한정(그 외 미작업).

---

## 2. 대상 확정·성분·fingerprint (WO §2)

| 그룹 | source_ref | master(고정) | ko md5 kinds | 성분 | 사용 목적 | en(사전) |
|---|---|---:|---:|---|---|---:|
| 마그신 | `91d2a67d` | 16 | 1(균일) | 마그네슘 + 비타민 B6 (470mg급) | 마그네슘 결핍성 근육경련 + B6 보급 | 0 |
| 레날비타 | `db7c085e` | 60 | 1(균일) | 비타민 B1·B2·B6 + C | 피로·구내염 | 0 |

- target master_id = (source_ref, source_type, ko canonical) 전체 고정. ko fingerprint 그룹 내부 균일(불일치 0). 제품별 병용주의 내용 불일치 0(ko 균일).

---

## 3. 상호작용 보존 계약 (WO §3-5, 확정)

- **상호작용 문장 = ko 열거 그대로 병렬 번역**. 문장 통합·기전 설명·위험도 재판단 **0**.
- 금기/상담/병용금지 **3분할 구조**(ko 주의 문단 구조)를 EN sd-warn 3 `<li>` 로 동일 유지.
- 수치·단위·복용 횟수·연령 경계 보존.

### 상호작용 TEST-LOG (ko → en, 그대로 대조)

| 그룹 | ko 병용금지 | en (WARN3) | 보존 |
|---|---|---|:-:|
| 마그신 | 인산염·칼슘염·테트라사이클린계·제산제·레보도파 | Do not take it together with **phosphates, calcium salts, tetracycline antibiotics, antacids or levodopa** | ✅ 5/5·순서 |
| 레날비타 | 레보도파 | Do not take it together with **levodopa** | ✅ 1/1 |

| 그룹 | ko 금기(WARN1) | ko 상담(WARN2) | 강도 보존 |
|---|---|---|:-:|
| 마그신 | 과민·심한신부전·12개월미만 | 심장·순환기·신장장애·저단백혈증·임신·황색4·5호 과민 | ✅ |
| 레날비타 | 과민·3개월미만 | 통풍·신장결석·폴산부족·황색5호 과민 | ✅ |

- 효능: 마그신(B6 보급 + 마그네슘 결핍 근육경련) · 레날비타(육체피로 시 B1·B2·B6·C 보급·신경통/근육통/관절통·구각염/구순염/구내염/설염·각기/눈피로·색소침착 완화·잇몸/코 출혈 예방) → **ko 문장 그대로**(성분별 분해·합성·인과 생성 0). fact-0.

---

## 4. 완료 그룹·EN write·ko 불변 (WO §8-10)

| 그룹 | master(T) | writePlan(2T) | writeActual | en canonical | ko 불변 | no-op |
|---|---:|---:|---:|---:|:-:|:-:|
| 마그신 | 16 | 32 | 32 | 16 | ✅ | ALREADY_COMPLETE |
| 레날비타 | 60 | 120 | 120 | 60 | ✅ | ALREADY_COMPLETE |
| **합계** | **76** | **152** | **152** | **76** | ✅ | — |

- TX 사후검증 PASS: en canonical=T·nr 0·dup 0·**koUnchanged true**(지문·count 전후 동일). writeActual==2T·target 밖 write 0.
- 독립검증(별도 psql): 마그신 en16/ko16·레날비타 en60/ko60(각 균일 md5·ko 불변)·전역 canonical duplicate 0.
- dry-run 2회 byte-identical(양 그룹). 재실행 ALREADY_COMPLETE·write 0.

---

## 5. 그룹별 READY/HOLD

| 그룹 | 판정 | 근거 |
|---|---|---|
| 마그신 `91d2a67d` | **READY**(완결) | 상호작용이 ko 열거(5항목)로 명확 → 해석 없이 병렬 그대로 번역 가능 |
| 레날비타 `db7c085e` | **READY**(완결) | 상호작용 단일(레보도파)·효능 ko 문장 그대로 → 해석 불필요 |

> **중지 조건 발동 없음**: 원문에 없는 상호작용 해석 불필요(둘 다) · 제품별 병용주의 불일치 0(ko 균일) · fingerprint 불일치 0 · target 밖 write 0 · ko 변경 0 · writeActual>2T 0 · 공통 장애 0.

---

## 6. 준수 / claim

- source_type=`mfds_drug_otc_nutrition_combo` · ko canonical 변경 0 · EN 없는 그룹만 · master_id source_ref 고정 · 공용 runner registry(.ts) 수정 0(자기 전용) · writeActual>2T/대상밖/dup 0 · git add . 미사용.
- 각 그룹 **별도 claim**(WO §1) → commit→push→fetch→교집합 0. 완료 status=DONE.

---

## 7. 완료 보고 요약

- **배정 2h / 실제 <2h**. 그룹별 판정: **마그신 READY·레날비타 READY**(둘 다 완결)
- **완료 2그룹 / 76 master EN LIVE**(마그신 16 + 레날비타 60) · en write 152(plan==actual)
- **상호작용 보존**: ko 열거 그대로 병렬 번역(마그신 5항목·레날비타 1항목) — 통합·기전·재판단 0
- **ko 불변** 전 그룹 · 독립검증 PASS · ALREADY_COMPLETE no-op(write 0) · 전역 dup 0
- **잔여 작업**: nutrition_combo EN-only 잔여 = 대형 종합비타민 7그룹(~1,900 master, 다효능·다성분) — 콘텐츠 정책(다성분 효능 표현) 확정 후 별도 WO. 마그신·레날비타 완결로 상호작용형 복합제는 **ko 열거 보존 계약으로 생산 가능** 입증
- **commit SHA**: ↓ · origin/main 동기 · 미푸시 자기 산출물 0

> 다약물 상호작용 복합제도 ko 열거를 그대로 병렬 보존하면 EN 완결 가능함을 검증(마그신·레날비타 76 master). 다효능 종합비타민은 정책 선결.
