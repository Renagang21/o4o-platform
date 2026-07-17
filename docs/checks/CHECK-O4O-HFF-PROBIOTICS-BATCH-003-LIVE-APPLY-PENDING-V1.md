# CHECK — 유산균 Batch 003 226건 LIVE 적재 (준비완료·적재 보류)

- 일자: 2026-07-17
- 대상: 유산균 Batch 003 **226건** (`prod-c-cp01~12`, 작성·검증·커밋 완료 `7a296d058`)
- WO: WO-O4O-HFF-PROBIOTICS-CONTINUOUS-END-TO-END-PRODUCTION-V1 PART A

```text
status:  PAUSED_EXTERNAL_DEPENDENCY_DB_WRITE_PERMISSION
dbWrite: 0
dryRun:  PASS
apply:   NOT_EXECUTED
```

---

## 상태 요약

Batch 003은 **실패가 아니라 준비완료·적재 대기**다. 생성·ko/en·STORE 디자인·최신 Guard·프리로드·dry-run 전부 PASS했고, **실제 apply만 현재 세션의 프로덕션 DB 쓰기 권한 분류기에 의해 차단**됐다. 우회·재시도하지 않는다.

## dry-run 결과 (§6·§7 — PASS)

경량 apply(`hff-b3-apply-lean.ts`, guard/jsdom 미로드 — 저메모리 V8 Zone OOM 회피)로 실행:

| §7 조건 | 결과 |
|---|---|
| 고정 대상 매니페스트 | **226** 일치 |
| candidate 1:1 매칭 | **226** (candMatch 226) |
| 사전승격 | **0** |
| 기존 master 중복(permit) | **0** (masterDup 0) |
| ko/en 각 | **226 / 226** |
| Guard BLOCKED | **0** (독립검증, REVIEW 5=코팅 성상 중립인용=실제위반 0) |
| 파편·근거없는 물·음용수 누락 | **0 / 0 / 0** (독립검증) |
| sanitize 무손실 | **452/452 byte-동일** (→ content = raw 초안) |
| 예상 write | **904** = master 226 + candidate 226 + SPD(ko 226 + en 226) |

## 적재 계약 (고정)

```text
regulatory_type    = 건강기능식품
barcode            = NULL
description_type   = STORE
status             = canonical
source_type        = o4o_hff_generated
mfds_permit_number = STTEMNT_NO
tags               = [import:mfds-hff, batch:probiotics-prod-003, wo:hff-continuous-e2e]
단일 트랜잭션 · 사후검증 PASS 시 COMMIT / 불일치 시 ROLLBACK
```

- 고정 매니페스트: `docs/guides/products/health-functional-food/batch-probiotics-prod-003/BATCH-003-PRELOAD-MANIFEST.json` (226)
- apply 스크립트: `apps/api-server/src/scripts/hff-b3-apply-lean.ts` (dry-run 통과, 저메모리용) · `hff-b3-store-canonical-apply.ts` (guard+sanitize 완전판, 저메모리 환경 OOM)

## apply 명령 (권한 가능한 세션에서)

```bash
# 프록시 기동(임의 포트)
./bin/cloud-sql-proxy-v2.exe --token "$(gcloud auth print-access-token)" --port 5470 netureyoutube:asia-northeast3:o4o-platform-db
# apply
cd apps/api-server && HFF_B3_CANONICAL_APPLY_CONFIRM=YES PROXY_PORT=5470 npx tsx src/scripts/hff-b3-apply-lean.ts --apply
```

## 독립 사후검증 항목 (커밋 밖 새 연결)

```text
신규 master(tags wo:hff-continuous-e2e) 226
STORE canonical ko 226 · en 226 · source_type=o4o_hff_generated 452
candidate approved_new_master + master 연결 226
canonical 중복 0 · 신고번호 유일 226 · barcode NULL 226 · regulatory_type 건강기능식품 226
실제 write 904 · HOLD 8 생성 0 · Batch 001·002 무변경
롤백 매니페스트: scratchpad/hff-b3-rollback-manifest.json
```

## 재개 절차

```text
1. origin/main + 고정 매니페스트 226 지문 확인
2. candidate 사전승격 0 · masterDup 0 · canonicalDup 0 재확인
3. (필요 시) 짧은 dry-run
4. --apply
5. 새 연결 독립 사후검증
6. 본 CHECK status → LIVE 완료로 갱신
```

## 롤백

전량 신규 삽입 + 가역 업데이트. 롤백 = SPD 삭제 → candidate matched_product_master_id=NULL·pending 복원 → master 삭제(롤백 매니페스트 ID 기준).
