# CHECK — 비타민 D 417 STORE canonical 프리로드 + 적재 dry-run

- 일자: 2026-07-17
- 선행: `WO-O4O-HFF-DESCRIPTION-VITAMIN-D-PRODUCTION-LINE-V1` (작성·검증 완료, commit 83d8091e2)
- 성격: **read-only 프리로드 9종 + 적재 dry-run(실제 INSERT/UPDATE 실행 → 트랜잭션 ROLLBACK).** **DB write 0.**
- 대상: `hff-vitamin-d-new-30.json`(30) + `hff-vitamin-d-production.json`(387) = **417**. 매니페스트 `hff-vitamin-d-preload-417.json` 고정.
- 판정: **PASS — apply 승인 대기.** 프리로드 9/9 통과, 실행 후 사후검증 전항 일치, 롤백으로 DB 무변경.

---

## 1. 접속 · 계약

- 프로덕션 DB: `netureyoutube:asia-northeast3:o4o-platform-db` (`o4o_platform`). Cloud SQL Auth Proxy `127.0.0.1:5433`, OAuth 토큰.
- 계약 = 유산균 192(`hff-store-description-canonical-apply.ts`) · 비타민 C 100 동일. grounding=declaredAmount(함량)+serving (CFU 아님).
- 스크립트: `apps/api-server/src/scripts/hff-vd-store-canonical-apply.ts` (dry-run 기본 · `--apply`+`HFF_VD_APPLY_CONFIRM=YES` 이중게이트).

## 2. 프리로드 9종 (전항 PASS)

| # | 검사 | 결과 |
|---|---|---|
| 1 | 매니페스트 417 고정 | 417 |
| 2 | candidate 매칭 417 · 1:1 | 417 (missing 0 · ambiguous 0) |
| 3 | candidate 사전승격 0 | 0 |
| 4 | 신고번호 기존 ProductMaster 중복 0 | 0 |
| 5 | 기존 STORE canonical SPD 중복 0 | 0 |
| 6 | ko/en 모두 존재 각 417 | ko 417 · en 417 |
| 7 | Guard BLOCKED 0 | 0 |
| 8 | sanitize 전후 무손실 | empty 0 · **텍스트변경 0 · 길이델타 0**(전수 417). 표본 "88루틴 비타민D3 5000IU" ko 1567→1567 · en 2203→2203 |
| 9 | source_ref·품목보고번호·candidate 연결 완전성 | 417/417 |

## 3. 적재 dry-run (exec + rollback)

실제 INSERT/UPDATE 실행 후 트랜잭션 내 사후검증 → **ROLLBACK**.

```text
예상 write
  INSERT product_masters              417
  UPDATE product_candidates            417  (matched_product_master_id + candidate_status='approved_new_master')
  INSERT shared_product_descriptions   834  (ko 417 + en 417)
  ────────────────────────────────────────
  총                                 1,668

사후검증(트랜잭션 내, 롤백 전)
  masters           417  ✅
  spdKo             417  ✅
  spdEn             417  ✅
  canonicalDup        0  ✅  (master_id, STORE, coalesce(lang,'ko')) partial-unique 무충돌
  candidatesLinked  417  ✅
  spdRefLinked      834  ✅  (SPD.source_ref_id = candidate.id)
  postVerifyPass   true

result: DRY-RUN OK → ROLLBACK (DB write 0)
```

## 4. 고정값

```text
regulatory_type    = 건강기능식품
mfds_permit_number = STTEMNT_NO
description_type    = STORE
status              = canonical
source_type         = o4o_hff_generated
barcode             = NULL (무바코드)
tags                = [import:mfds-hff, batch:vitamin-d-production, wo:hff-vd-store-canonical]
```

## 5. apply 시 사후검증 항목 (승인 후 동일 경로, COMMIT)

masters=417 · spdKo=417 · spdEn=417 · canonicalDup=0 · candidatesLinked=417 · spdRefLinked=834 전항 일치 시에만 COMMIT, 불일치 시 자동 ROLLBACK + exit 2. COMMIT 시 롤백 매니페스트(createdMasters/createdSpd/candIds/snapshot) → scratchpad 저장.

## 6. DB write · 다음 단계

- **DB write 0** (dry-run 롤백 확인). ProductMaster/candidate/SPD/canonical/QR 무변경.
- 다음 = **"비타민 D 417 적재 apply 실행" 별도 승인** → `HFF_VD_APPLY_CONFIRM=YES PROXY_PORT=5433 npx tsx src/scripts/hff-vd-store-canonical-apply.ts --apply`.
