# CHECK · HFF 유산균 300건 LIVE 적재 독립 검증 (WO-O4O-HFF-PROBIOTICS-300-LIVE-APPLY-VERIFY-V1)

- 담당: Agent A (건강기능식품 유산균 전담). 이 세션에서 실행(사용자 승인 — 프록시 기동 승인).
- 일자: 2026-07-19
- status: **LIVE_VERIFIED** — 300건 전량 프로덕션 적재 확인. **이 세션 DB write 0**(read-only 검증만).
- 접속: 이 세션에서 Cloud SQL Auth Proxy v1.37.10 을 **5452**(5442는 동시 세션 점유)에 기동, `netureyoutube:asia-northeast3:o4o-platform-db`, gcloud 토큰. 검증 후 프록시 종료.

---

## 1. 핵심 발견 — 적재는 이미 완료돼 있었다

read-only preload 결과 **대상 300건 전량이 이미 프로덕션에 적재된 상태**였다(모든 candidate `alreadyPromoted`, 모든 master `masterExists`). LIVE 적재는 **인증된 릴레이 세션(5442 점유 세션)이 선행 완료**한 것으로 판단된다.

- 따라서 apply 강행은 하지 않았다 — 멱등 가드(`ALREADY_PROMOTED`·`MASTER_EXISTS`)가 전량 차단(write 0)하므로 무의미하고, WO 중지조건(상태 불일치)에 해당. **read-only 독립 검증으로 전환**했다.
- 서버 식별: `current_database=o4o_platform` · `current_user=o4o_api` · PostgreSQL 15.17 → **프로덕션 확정**, 자격증명 정상.
- 전체 HFF 베이스라인(참고): HFF candidate 41,261 · 기존 `o4o_hff_generated` STORE canonical 8,474.

## 2. 독립 검증 결과 (커밋 밖 read-only)

### 2.1 그룹별

| 큐 | 대상 | master(barcodeNull·건기식) | SPD ko | SPD en | candidatesLinked | canonicalDup |
|---|---|---|---|---|---|---|
| G1 Batch003 | 226 | 226 (226·226) | 226 | 226 | 226 | 0 |
| G2 P1-잔여 | 1 | 1 (1·1) | 1 | 1 | 1 | 0 |
| G3 KW-파일럿 | 19 | 19 (19·19) | 19 | 19 | 19 | 0 |
| G4 KW-확대 | 46 | 46 (46·46) | 46 | 46 | 46 | 0 |
| G5 INFANT | 2 | 2 (2·2) | 2 | 2 | 2 | 0 |
| 액상 유산균 | 6 | 6 (6·6) | 6 | 6 | 6 | 0 |
| **계** | **300** | **300** | **300** | **300** | **300** | **0** |

- 총 SPD canonical = **600**(ko 300 + en 300). implied writes = master 300 + candidate 300 + SPD 600 = **1,200** (예상과 일치).
- 전 master `barcode IS NULL` · `regulatory_type='건강기능식품'`. canonicalDup **0**.
- 배치 태그 분포: `batch:probiotics-prod-003` 227(G1 226+G2 1) · `batch:probiotics-kids-womens` 65(G3 19+G4 46) · `batch:probiotics-kids-womens-infant` 2 · `batch:probiotics-liquid-pilot` 6 = 300.

### 2.2 액상 6 콘텐츠 정합 (내 EN 한글잔존 수정 반영 여부)

LIVE SPD 콘텐츠를 현재 소스 draft(sanitize 후) md5 와 대조:

| slug | ko md5 | en md5 | LIVE en 한글잔존 |
|---|---|---|---|
| childlife / dr-drop-b / kids-garden / lactive / synteract / yakult (6종) | **MATCH** | **MATCH** | **0자** |

→ 액상 6건 모두 ko/en 콘텐츠가 내 현재 산출물과 **완전 동일**, LIVE en 표시기준 **한글 잔존 0**. **EN 성상·유통기한·보관 영어 번역이 프로덕션에 반영**됨(선결 EN 수정 LIVE 확인).

## 3. 완료 보고 (WO 필드)

```text
큐별 대상 수      : G1 226 · G2 1 · G3 19 · G4 46 · G5 2 · 액상 6 = 300
dry-run          : 미실행 (이미 적재됨 — read-only preload 로 확인)
이 세션 실제 write : 0 (검증만; 적재는 선행 릴레이 세션)
ProductMaster     : 300 (barcodeNull 300 · 건기식 300)
candidate 승격    : 300 (approved_new_master)
ko/en SPD         : ko 300 + en 300 = 600 canonical
canonicalDup      : 0
독립 검증         : PASS (커밋 밖 새 연결, master/candidate/SPD/dup 전 항목 일치)
액상 콘텐츠 정합   : ko/en md5 6/6 MATCH · LIVE en 한글잔존 0
rollback manifest : 이 세션 미생성(적재 미수행) — 적재 수행 세션 소관
최종 LIVE 누적     : 유산균 300 (고형 294 + 액상 6) 프로덕션 canonical
```

## 4. 경계·안전 준수

- 고형 294 ↔ 액상 6 **미합침**, 5그룹 경계 유지.
- HOLD·대상 외 제품 미포함(대상 300 statementNo 만 조회).
- **이 세션 DB write 0** — apply 강행 없음(이미 적재 확인 후 검증 전환).
- 공통 코드·매니페스트 target 정의 미수정. `apps/api-server/.env` 미접촉. `git clean` 미실행. 타 세션 파일 미접촉.
- 프록시는 5442(타 세션) 미접촉, 별도 5452 기동·검증 후 종료.
