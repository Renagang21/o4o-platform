# CHECK — WO-O4O-OTC-TRACK-A-1H-PRODUCTION-GA-V1

**에이전트 가 · 1시간 생산 세션 · 3그룹 ko/en 연속 완결 (APPLIED · production LIVE) · 2026-07-21**

WO 지정 우선 후보 3개(아세트아미노펜 650mg 정 · 이부프로펜 200mg 연질캡슐 · 브로멜라인 45mg 정)를 순서대로 ko 승격 → en 번역·디자인 → canonical 완결.

- 시작 HEAD `09d5e50c3` (== origin/main, working tree = 타 세션 파일만)
- 3후보 runner 미등재(타 에이전트 미착수) 확인 후 착수.

---

## 1. 후보 재검증 (bridge full-content fingerprint)

| 그룹 | fp | T | coarse | exclude(fp종) | other | easy1 | ko/en 충돌 | source_ref | EN sibling |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|---|---|
| 아세트아미노펜\|650mg\|정 | `bdc125f5` | **7** | 78 | 71(15) | 0 | 7 | 0/0 | `05690081` | 13 uniform |
| 이부프로펜\|200mg\|연질캡슐 | `f8d2054a` | **7** | 46 | 39(12) | 0 | 7 | 0/0 | `0203e1b4` | 7 uniform |
| 브로멜라인\|45mg\|정 | `6c44c0a0` | **6** | 14 | 8(2) | 0 | 6 | 0/0 | `11b41481` | 9 uniform |

전 그룹 fp 재현 정확 · 교집합 0 · route/함량/제형/안전지문 동질.

---

## 2. 실행 결과 — 실제 write

| 그룹 | T | ko (4T) | en (2T) | 합(6T) |
|---|:-:|:-:|:-:|:-:|
| 아세트아미노펜 650mg 정 | 7 | **28** | **14** | 42 |
| 이부프로펜 200mg 연질캡슐 | 7 | **28** | **14** | 42 |
| 브로멜라인 45mg 정 | 6 | **24** | **12** | 36 |
| **합계** | **20** | **80** | **40** | **120** |

각 그룹: ko dry-run 2회 byte-identical PASS → apply → `ALREADY_UPGRADED`
→ EN 스코프 = ko runner target IDs → en dry-run 2회 byte-identical PASS → apply → `ALREADY_COMPLETE`.

### EN 전략 (byte-identical)
| 그룹 | out | 전략 | build md5 |
|---|:-:|---|---|
| 아세트아미노펜 | 13 | 검증본 verbatim 재사용 | `abe0e62f` == live out en |
| 이부프로펜 | 7 | **표준 파일 부재 → live out en HTML 역구성(diff 0)** | `b35a8780` == live out en |
| 브로멜라인 | 9 | 검증본 verbatim 재사용 | `3f4b48f6` == live out en |

전 그룹 **ko 에 없는 medical fact 0**. 배치 전용 번역 파일에 GUIDE V0.5·GLOSSARY V0.2·TEST-LOG(수치·연령·횟수·기간·금기·주의 강도 보존).

---

## 3. 독립 검증 (runner 밖 별도 쿼리)

| 그룹 | ko canon1/authored/dep/audit | en (md5×건수) | exactly1 | ko/en 1:1 | 제외 미접촉(authored/en/audit) | out en 불변 |
|---|:-:|---|:-:|:-:|:-:|---|
| 아세트아미노펜 | 7/7/7/7 | `abe0e62f`×7 | 7 | **7** | 71 → 0/0/0 | ×13 |
| 이부프로펜 | 7/7/7/7 | `b35a8780`×7 | 7 | **7** | 39 → 0/0/0 | ×7 |
| 브로멜라인 | 6/6/6/6 | `3f4b48f6`×6 | 6 | **6** | 8 → 0/0/0 | ×9 |

**대상 밖 write 0** (제외 118 master 전량 authored/en/audit 0, out 29 en 불변) · EN canonical 중복 0 · ko 불변 · 한글/`<table>`/주석/이중escape 0.

## 4. 재실행 no-op
전 그룹 ko `ALREADY_UPGRADED`, en `ALREADY_COMPLETE` — write 0.

## 5. 중지 / 장애 / HOLD
- 중지 조건 해당 없음(3그룹 전 게이트 PASS). 장애·재시도 0. HOLD 0.
- 실제 작업시간: 약 25분(1시간 예산 내 3그룹 전부 완결).

**결론**: 아세트아미노펜 650mg 정 · 이부프로펜 200mg 연질캡슐 · 브로멜라인 45mg 정 **각 ko/en canonical LIVE** (총 20 master ko/en 완결, write 120). 누적 Track A 완료 groupKey 33종.
