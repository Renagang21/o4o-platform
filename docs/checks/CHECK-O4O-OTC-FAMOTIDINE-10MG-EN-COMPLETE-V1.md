# CHECK — 파모티딘 10mg 정 en STORE canonical 완결

**WO:** WO-O4O-OTC-FAMOTIDINE-10MG-EN-COMPLETE-V1
**성격:** en 번역 authoring + persist→flip apply (승인 봉투 내 연속 실행)
**스크립트:** `apps/api-server/src/scripts/drug-otc-modelB-apply-pilot-famotidine-en.ts`
**번역:** `apps/api-server/src/scripts/data/otc-en-translations-famotidine-10mg-v1.json`
**apply 로그:** `apps/api-server/src/scripts/data/otc-modelB-apply-pilot-famotidine-en-dryrun-v1.json`

---

## 1. 대상·번역

- ko canonical 24(source_ref `0057f50c`, mfds_drug_otc) 를 번역 기준본으로 사용.
- en 번역 1건 작성(그룹당 1) → 24 master 전개. `DrugOtcEnTranslation` 구조화 번역, `buildDrugOtcEnConsumerHtml`.
- **수치·연령·기간·금기 원문 보존:** 16세 이상→aged 16 and over · 1정(10mg)→one tablet (10 mg) · 1일 2정(20mg)→up to two tablets (20 mg) a day · 14일 이상 금지→not for more than 14 days · 3개월 이상 속쓰림→more than 3 months · 알코올 병용 금지 · 삼킴곤란·토혈/혈변·체중감소·신간질환·고령자·임부수유부 약사 상담 · 증상 미개선 시 중단.

---

## 2. 게이트 (dry-run PASS)

| 게이트 | 결과 |
|---|---|
| ko canonical == 24 | ✅ 24 |
| 기존 en canonical·needs_review 충돌 | 0 |
| 한글 혼입 | 0 |
| `<table>`·주석·이중 escape | 0 |
| sd-warn 유지 | ✅ |
| 필수필드 누락 / 빈 html | 0 |
| anomalies | **0** |
| DB write (dry-run) | 0 |

htmlLen 2457 · contentHash `10f92d6b…`

---

## 3. apply 결과 (승인 봉투 내)

`--apply` + `DRUG_OTC_PILOT_FAMO_EN_CONFIRM=YES`, 2-STEP 단일 TX (needs_review INSERT → canonical flip).

| 항목 | 값 |
|---|---:|
| en needs_review INSERT | 24 |
| en canonical flip (본 프로세스) | 2 |
| enCanonicalAfter (in-TX) | 24 (PASS) |
| koEnLinkAfter (in-TX) | 24 (PASS) |

**동시 세션 레이스(ko 파일럿과 동일):** INSERT 24 / 본 flip 2 → 병렬 세션이 22 flip. `WHERE NOT EXISTS` 가드로 이중 INSERT 차단, 사후검증(count 24·dup 0·ko↔en 24) 통과 → 최종 정확. (§0-A Write Ownership 규칙 추가)

### 독립 검증 (별도 재쿼리)

| 검증 | 결과 |
|---|---|
| source_ref 0057f50c | canonical en **24** + ko 24 (needs_review 잔량 0) |
| 24 대상 en canonical | exactly1 **24** · dup **0** · missing **0** |
| **ko↔en 짝** | **24** paired |
| en source_type | mfds_drug_otc · 24 |
| 대상 외 en write | **0** |
| en content 해시 | 단일 `10f92d6b…` × 24 (전건 동일본, dry-run 해시 일치) |
| 재실행 no-op | ✅ en 충돌 24 → 사후검증 전 ABORT, **DB write 0**, 상태 불변 |
| 기존 ko canonical UPDATE | 0 |

---

## 4. 완료 보고

- **en INSERT / flip:** needs_review INSERT 24 → canonical 24
- **ko/en 짝:** **24** (source_ref 0057f50c 공유)
- **duplicate:** 0
- **content hash 검증:** 단일 해시 24건 = dry-run contentHash 일치
- **재실행 no-op:** ✅ (DB write 0)
- **원칙 준수:** 한글 0 · table/주석/escape 0 · sd-warn 유지 · 기존 ko canonical UPDATE 0 · source_ref 공유

**최종:** 파모티딘 10mg 정 **24 master ko + en STORE canonical LIVE** (ko/en 짝 24, dup 0). 파모티딘 파일럿 ko·en 완결.

### rollback (필요 시)

```sql
UPDATE shared_product_descriptions SET status='deprecated', updated_at=now()
WHERE source_ref_id='0057f50c-e693-4385-b5d8-4f57178db590'::uuid
  AND source_type='mfds_drug_otc' AND description_type='STORE' AND language='en' AND status='canonical' AND deleted_at IS NULL;
```

---

*ko canonical 기준본 → en 번역 authoring → dry-run PASS → 승인 봉투 내 persist·flip·독립검증·no-op 완결.*
