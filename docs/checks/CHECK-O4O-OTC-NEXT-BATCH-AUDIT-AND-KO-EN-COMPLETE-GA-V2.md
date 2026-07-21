# CHECK — WO-O4O-OTC-NEXT-BATCH-AUDIT-AND-KO-EN-COMPLETE-GA-V1 (2차 배치)

**에이전트 가 · 감사 + 상위 3 그룹 ko/en 연속 완결 (APPLIED · production LIVE) · 2026-07-21**

동일 WO 템플릿의 **2차 실행**(1차 = 커밋 `e8cb43f46`, 덱시부프로펜·디오스민600·수산화마그네슘 완결).
기완료 groupKey 를 runner registry 에서 **동적 파생**하도록 감사 스크립트를 개선해 stale 위험을 제거하고, 다음 후보 6개를 감사 → 상위 3개 ko/en 연속 완결.

- 시작 HEAD `37a62eb43` (== origin/main, working tree clean)
- 감사 스크립트: [`drug-otc-next-batch-audit-v2.ts`](../../apps/api-server/src/scripts/drug-otc-next-batch-audit-v2.ts) (DONE 목록 = ko/en runner `key:` 동적 파생) · 산출 [`otc-next-batch-audit-v2.json`](../../apps/api-server/src/scripts/data/otc-next-batch-audit-v2.json)

---

## 1. 감사 후보 6개 (전부 READY)

| # | groupKey | fp | T | coarse | exclude(fp종) | easy1 | ko충돌 | en선존재 | source_ref | EN sibling |
|:-:|---|---|:-:|:-:|:-:|:-:|:-:|:-:|---|---|
| 1 | 니푸록사지드\|200mg\|캡슐 | `0a755506` | **7** | 19 | 12(3) | 7 | 0 | 0 | `05c733cd` | 11 uniform |
| 2 | 사카로마이세스보울라르디균\|282.5mg\|캡슐 | `ba82fd12` | **7** | 11 | 4(1) | 7 | 0 | 0 | `16f0c2ef` | 5 uniform |
| 3 | 아르기닌티디아시케이트\|200mg\|연질캡슐 | `509aaaf4` | **7** | 7 | 0(0) | 7 | 0 | 0 | `20d395df` | 10 uniform |
| 4 | 아세트아미노펜\|650mg\|정 | `bdc125f5` | 7 | 78 | 71(15) | 7 | 0 | 0 | `05690081` | 13 uniform |
| 5 | 이부프로펜\|200mg\|연질캡슐 | `f8d2054a` | 7 | 46 | 39(12) | 7 | 0 | 0 | `0203e1b4` | 7 uniform |
| 6 | 브로멜라인\|45mg\|정 | `6c44c0a0` | 6 | 14 | 8(2) | 6 | 0 | 0 | `11b41481` | 9 uniform |

제외 필터: 기완료 groupKey(runner registry 동적) · 비경구 · 민감 약효군 · ingredient 빈 복합제.
전 후보 other 0 · 교집합 0 · fp 재현 정확 · route/함량/제형/안전지문 동질 · ko/en 충돌 0. **4~6은 다음 배치 보류.**

---

## 2. 실행 3그룹 — target/exclude/other · 실제 write

| 그룹 | target | exclude | other | ko (4T) | en (2T) | 합(6T) |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 니푸록사지드 200mg 캡슐 | 7 | 12 | 0 | **28** (nr7+demote7+flip7+audit7) | **14** (nr7+flip7) | 42 |
| 사카로마이세스보울라르디균 282.5mg 캡슐 | 7 | 4 | 0 | **28** | **14** | 42 |
| 아르기닌티디아시케이트 200mg 연질캡슐 | 7 | 0 | 0 | **28** | **14** | 42 |
| **합계** | **21** | 16 | 0 | **84** | **42** | **126** |

각 그룹: ko dry-run 2회 byte-identical PASS → apply → 독립검증 → `ALREADY_UPGRADED` write 0
→ source_ref 공유 범위 조사 → EN 스코프 = ko runner target IDs → en dry-run 2회 byte-identical PASS → apply → `ALREADY_COMPLETE` write 0.

### EN 전략 (byte-identical)
| 그룹 | out(대상 밖) | 전략 | build md5 |
|---|:-:|---|---|
| 니푸록사지드 | 11 | reviewed EN sibling 재사용(`otc-en-translations-v1.json` verbatim) | `07211b8e` == live out en |
| 사카로마이세스 | 5 | 재사용(verbatim) | `7574cc9a` == live out en |
| 아르기닌티디아시케이트 | 10 | **표준 번역파일 entry 부재 → live out en HTML 역구성** | `063d7188` == live out en (**diff 0**) |

번역은 배치 전용 파일로 분리(공유 파일 미수정), GUIDE V0.5·GLOSSARY V0.2·TEST-LOG(수치·연령·횟수·기간·금기·주의 강도 보존) 기재. **ko 에 없는 medical fact 0**.

---

## 3. 독립 검증 (runner 밖 별도 쿼리)

| 그룹 | ko canon1/authored/dep/audit | en (md5×건수) | exactly1 | ko/en 1:1 | 제외 미접촉(authored/en/audit) | out en 불변 |
|---|:-:|---|:-:|:-:|:-:|---|
| 니푸록사지드 | 7/7/7/7 | `07211b8e`×7 | 7 | **7** | 12 → 0/0/0 | ×11 |
| 사카로마이세스 | 7/7/7/7 | `7574cc9a`×7 | 7 | **7** | 4 → 0/0/0 | ×5 |
| 아르기닌티디아시케이트 | 7/7/7/7 | `063d7188`×7 | 7 | **7** | 0 → 0/0/0 | ×10 |

- **대상 밖 write 0**: 제외 16 master 전량 authored/en/audit 0, out(source_ref 공유) 26 en 전량 불변.
- EN canonical 중복 0 · ko canonical 불변 · 한글/`<table>`/주석/이중escape 0.
- 재실행: ko `ALREADY_UPGRADED`, en `ALREADY_COMPLETE` — 전 그룹 write 0.

---

## 4. 중지 조건

해당 없음 — 3그룹 전 게이트 PASS, 중단 0.

**결론**: 니푸록사지드 200mg 캡슐 · 사카로마이세스보울라르디균 282.5mg 캡슐 · 아르기닌티디아시케이트 200mg 연질캡슐 **각 ko 7 + en 7 canonical LIVE** (총 21 master ko/en 완결, write 126). 누적 Track A 완료 groupKey 30종.
