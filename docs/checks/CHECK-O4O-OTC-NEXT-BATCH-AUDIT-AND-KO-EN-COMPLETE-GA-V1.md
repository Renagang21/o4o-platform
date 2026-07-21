# CHECK — WO-O4O-OTC-NEXT-BATCH-AUDIT-AND-KO-EN-COMPLETE-GA-V1

**에이전트 가 · 감사 + 상위 3 그룹 ko/en 연속 완결 (APPLIED · production LIVE) · 2026-07-21**

기완료 24 groupKey 를 제외하고 bridge full-content fingerprint 정본으로 다음 Track A 단일성분 후보 6개를 감사,
상위 3개 READY 를 같은 세션에서 ko 승격 → en 번역·디자인 → canonical 완결까지 연속 처리.

- 시작 HEAD `6a2769045` (== origin/main, working tree clean)
- 감사 스크립트: [`drug-otc-next-batch-audit-v2.ts`](../../apps/api-server/src/scripts/drug-otc-next-batch-audit-v2.ts) · 산출 [`otc-next-batch-audit-v2.json`](../../apps/api-server/src/scripts/data/otc-next-batch-audit-v2.json)

---

## 1. 감사 후보 6개 (전부 READY)

| # | groupKey | fp | T | coarse | exclude(fp종) | easy1 | ko충돌 | en선존재 | source_ref | EN sibling |
|:-:|---|---|:-:|:-:|:-:|:-:|:-:|:-:|---|---|
| 1 | 덱시부프로펜\|300mg\|정 | `605e6474` | **8** | 97 | 89(18) | 8 | 0 | 0 | `002c309a` | 15건 uniform |
| 2 | 디오스민\|600mg\|정 | `bbb731cc` | **8** | 64 | 56(17) | 8 | 0 | 0 | `014af1cd` | 26건 uniform |
| 3 | 수산화마그네슘\|500mg\|정 | `2d3b7629` | **8** | 15 | 7(1) | 8 | 0 | 0 | `048b8e71` | 11건 uniform |
| 4 | 니푸록사지드\|200mg\|캡슐 | `0a755506` | 7 | 19 | 12(3) | 7 | 0 | 0 | `05c733cd` | 11건 uniform |
| 5 | 사카로마이세스보울라르디균\|282.5mg\|캡슐 | `ba82fd12` | 7 | 11 | 4(1) | 7 | 0 | 0 | `16f0c2ef` | 5건 uniform |
| 6 | 아르기닌티디아시케이트\|200mg\|연질캡슐 | `509aaaf4` | 7 | 7 | 0(0) | 7 | 0 | 0 | `20d395df` | 10건 uniform |

- 제외 필터: 기완료 24 groupKey · 비경구 · 민감 약효군(`SENSITIVE_RE`) · ingredient 빈 복합제(`atc:` 키).
- 전 후보 **other 0 · 교집합 0 · fp 재현 정확일치 · route/함량/제형/안전지문(fp) 동질** · authored ko/en 충돌 0.
- **실행 대상 = 상위 3개**(4~6은 다음 배치 후보로 보류).

---

## 2. 실행 3개 그룹 결과

| 그룹 | target | exclude | other | ko write (4T) | en write (2T) | 합(6T) |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 덱시부프로펜 300mg 정 | 8 | 89 | 0 | **32** (nr8+demote8+flip8+audit8) | **16** (nr8+flip8) | 48 |
| 디오스민 600mg 정 | 8 | 56 | 0 | **32** | **16** | 48 |
| 수산화마그네슘 500mg 정 | 8 | 7 | 0 | **32** | **16** | 48 |
| **합계** | **24** | 152 | 0 | **96** | **48** | **144** |

각 그룹: ko dry-run 2회 byte-identical PASS → apply → 독립검증 → `ALREADY_UPGRADED` write 0
→ source_ref 공유 범위 조사 → EN 스코프 = ko runner target IDs → en dry-run 2회 byte-identical PASS → apply → `ALREADY_COMPLETE` write 0.

### source_ref 공유 범위 · EN 전략
| 그룹 | ko 공유 | out(대상 밖) | EN 전략 |
|---|:-:|:-:|---|
| 덱시부프로펜 | 23 | 15 | reviewed EN sibling 재사용 — build md5 `3419f518` == live out en **byte-identical** |
| 디오스민 600 | 34 | 26 | 재사용 — `23caa83e` byte-identical |
| 수산화마그네슘 | 19 | 11 | 재사용 — `b68a955b` byte-identical |

번역은 `otc-en-translations-v1.json` 검증본을 배치 전용 파일로 verbatim 채용(공유 파일 미수정). `buildDrugOtcEnConsumerHtml` 산출이 live out en 과 byte-identical → **ko 에 없는 medical fact 0**. 각 파일에 GUIDE V0.5·GLOSSARY V0.2·TEST-LOG(수치·연령·횟수·기간·금기·주의 강도 보존) 기재.

---

## 3. 독립 검증 (runner 밖 별도 쿼리)

| 그룹 | ko canon1/authored/dep/audit | en (md5·건수) | exactly1 | ko/en 1:1 | 제외 미접촉 (authored/en/audit) | out en 불변 |
|---|:-:|---|:-:|:-:|:-:|---|
| 덱시부프로펜 | 8/8/8/8 | `3419f518` × 8 | 8 | **8** | 89 → 0/0/0 | `3419f518` × 15 |
| 디오스민 600 | 8/8/8/8 | `23caa83e` × 8 | 8 | **8** | 56 → 0/0/0 | `23caa83e` × 26 |
| 수산화마그네슘 | 8/8/8/8 | `b68a955b` × 8 | 8 | **8** | 7 → 0/0/0 | `b68a955b` × 11 |

- **대상 밖 write 0**: 제외 152 master 전량 authored/en/audit row 0 (미접촉), out(source_ref 공유) en 전량 불변.
- EN canonical 중복 0 · ko canonical 불변(koCanonical = T) · 한글/`<table>`/주석/이중escape 0(build 게이트).
- 재실행: ko `ALREADY_UPGRADED`, en `ALREADY_COMPLETE` — 전 그룹 write 0.

---

## 4. 중지 조건

해당 없음 — 3개 그룹 모두 전 게이트 PASS, 중단 0.

**결론**: 덱시부프로펜 300mg 정 · 디오스민 600mg 정 · 수산화마그네슘 500mg 정 **각 ko 8 + en 8 canonical LIVE** (총 24 master ko/en 완결, write 144). 제외 152·out 52·ko 전량 불변, 멱등 확인.
