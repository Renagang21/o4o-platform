# CHECK-O4O-MEDICAL-DEVICE-FULL-SCALE-RAW-FETCH-AND-GATE-A-IMPORT-DRYRUN-V1

> 작업 성격: 전량 raw fetch(실행) + Gate A baseline 보호 가드(구현) + Gate A dry-run(시도). DB write 0, apply 0, ProductMaster/Identifier/Candidate 생성 0.
> 작성일: 2026-07-05
> 기준 저장소: `C:\Users\sohae\o4o-platform` (집 PC).
> 선행: `O4O-MEDICAL-DEVICE-FULL-SCALE-SEED-EXPANSION-RUNBOOK-V1`(77d470e13), `CHECK-O4O-MEDICAL-DEVICE-GATE-B-PROMOTION-APPLY-RESULT-V1`(d83aa5785)

---

## 1. 결론

| 단계 | 판정 | 근거 |
|---|---|---|
| Gate A baseline 보호 가드 | **GO** | 구현·유닛 14/14·커밋 `33f40f1ab` |
| 전량 raw fetch | **GO** | 2,657,803 lines, failed 0, checksum 확보 |
| Gate A import dry-run | **HOLD** | 전량 ~2.5GB raw 를 현 importer 가 처리 불가(readFileSync 단일 문자열 한계 + RAM 7.9GB OOM). streaming importer 필요 |

**종합 판정: HOLD.** baseline 가드는 완료(GO), 전량 raw 도 확보(GO). Gate A dry-run/apply 는 **streaming importer 리팩터(후속 WO)** 전까지 HOLD. DB write 0 유지.

---

## 2. 범위와 비범위

| 구분 | 내용 |
|---|---|
| 범위(이번) | 전량 raw fetch, baseline 가드 구현+테스트, dry-run 시도, HOLD 판정, CHECK |
| 비범위 | Gate A apply / Gate B dry-run·apply / ProductMaster·Identifier·Candidate write / Offer·Listing·StoreLocal / 설명·이미지 / 노출 정책 |

---

## 3. 기준 문서

전부 존재(preflight 실측). WO 원본이 참조한 `docs/work-orders/` 경로는 실제 `docs/checks/`·`docs/investigations/`. HEAD 은 작업 시작 시 `e1a276abb`(선행 커밋 77d470e13/d83aa5785 조상), 가드 커밋 후 `33f40f1ab`.

---

## 4. Preflight

- 브랜치 main, uncommitted = `?? bin/`(proxy 바이너리, 미추적) 뿐. 사용자 변경 보존.
- CLI/service/parser/mapper 6파일 존재. UDI_DI type 반영됨. Cloud SQL Auth Proxy 채널 확립.
- **RAM 7.9 GB** (전량 in-memory 처리 제약의 핵심).
- serviceKey = env `PUBLIC_DATA_SERVICE_KEY`(G:\...\.env.public-data), 원문 미출력.

---

## 5. baseline 보호 가드 구현

문제: 현 importer UPDATE 경로가 rowSignature 매칭 시 `match_status`/`raw_payload`/`source_label` 덮어씀 → 전량 재import 시 이미 승격된 표본 19,602 candidate 훼손 위험.

구현(commit `33f40f1ab`):
- `fetchExistingSignatures` → **`fetchExistingSignatureStatus`**: `Map<rowSignature, candidate_status>` 조회.
- `predictWithDb`/`applyRows`: 기존행 status 가 `approved_new_master`/`merged` 면 **UPDATE 안 함**, `report.protectedBaselineSkipped` 로 집계. pending 등은 update, 신규는 insert.
- `PROTECTED_BASELINE_STATUSES = {approved_new_master, merged}`. report 에 `protectedBaselineSkipped` 카운터 + CLI 출력.

불변식 보장: approved/merged candidate 를 pending 으로 원복하지 않음 / `matched_product_master_id` null 로 덮지 않음(현 importer 는 candidate_status·matched_product_master_id 를 애초에 건드리지 않으며, 위 가드로 match_status·raw_payload 도 보호).

---

## 6. 테스트 결과

```text
유닛테스트: medical-device-standard-code-candidate-import.test.ts → 14 passed / 14 (PASS)
  기존 12 + baseline 가드 2:
    - approved_new_master 기존행 → protected skip, pending → update, 신규 → insert (dry-run)
    - merged → protected skip
    - dry-run 은 SELECT 만 (INSERT/UPDATE 미호출 → DB write 0 보장, fake DS 로 검증)
타입체크: tsc 이번 변경 관련 에러 0 (전체 1건 = marketTrialController, 기존/무관)
```

---

## 7. 전량 raw fetch 결과

| 항목 | 값 |
|---|---|
| runId | `md-full-20260705-142323` |
| endpoint | `MdeqStdCdPrdtInfoService03/getMdeqStdCdPrdtInfoInq03` |
| numOfRows / concurrency / retry | 500 / 3 / 3 |
| requestedPages / succeededPages / **failedPages** | 5,316 / 5,316 / **0** |
| totalCountStart / totalCountEnd | 2,657,803 / 2,657,803 (fetch 중 불변) |
| **rawLineCount** | **2,657,803** (totalCount 정확 일치) |
| 소요 | 05:23–07:10 UTC (~107분) |
| checksum(sha256) | `2befbfaf456225dcdaf2f19c529adaa5eee34ab1f7226c33ded68fec33f3a59c` |

> **구조 확인:** 이 endpoint 는 `body.items` = item 객체 **직접 배열**(권한/의약외품 endpoint 의 `body.items[].item` 래핑과 다름). fetch 스크립트가 각 원소를 `{sourceDataset,fetchedAt,pageNo,rowIndex,item:element}` 로 감싸 표본 raw 와 동일 포맷 유지.

---

## 8. manifest / checksum / failed-pages / 저장 위치

```text
G:\내 드라이브\자료실\public-data-api-samples\full-fetch\medical-device\md-full-20260705-142323\
  raw.jsonl (2,657,803 lines, ~2.5GB)
  manifest.json  failed-pages.jsonl(0줄)  checksums.txt  sample-head.jsonl  sample-tail.jsonl
```
repo 밖(G: 드라이브). **raw git commit 0, serviceKey 기록 0.** fetch 스크립트는 세션 scratchpad(`md-full-fetch.mjs`) — 재사용 시 committable CLI 화는 후속.

---

## 9. Gate A dry-run 결과 (HOLD)

전량 offline dry-run 시도 → **즉시 실패(read 단계)**:
```text
[medical-device-candidate-import] FAILED: Cannot create a string longer than 0x1fffffe8 characters
```
원인:
1. **readFileSync 단일 문자열 한계**: CLI 가 raw 전체(~2.5GB)를 `fs.readFileSync(file,'utf-8')` 로 단일 string 에 로드 → V8 max string length(~536,870,888 chars ≈ 512M)를 초과 → RangeError. 읽기 자체 불가.
2. **in-memory 매핑 OOM**: 설사 읽어도 service.run 이 2,657,803 candidate 를 `mapped[]` 배열에 전량 보관(각 rawPayload 에 원본 item 포함) → 추정 5–8GB+ → RAM 7.9GB 에서 OOM.

→ **현 importer 는 전량 dry-run 불가.** DB 미접속(offline, read 단계 실패) → **DB write 0.**

**Unblocker(후속 WO):** streaming importer — `readline`/`createReadStream` 으로 line 단위 파싱 + 증분 집계(cross-row 는 `Map<udi,Set<sig>>`/`Map<permit,Set<udi>>` 문자열 맵만 유지, 전체 mapped 배열·전체 string 미보관). 이렇게 하면 7.9GB 내 전량 처리 가능(문자열 맵 ~500MB–1GB 추정).

---

## 10. DB write 0 검증

| 항목 | 결과 |
|---|---|
| dry-run DB 접속 | **없음** (offline, readFileSync 단계에서 실패) |
| INSERT/UPDATE/DELETE | 0 |
| baseline (Gate B 직후) 불변 | product_masters 250,445 / product_identifiers 742,687 / candidate approved_new_master 19,602 + pending 394 (이번 WO 무변경) |
| serviceKey/secret 기록 | 0 |
| raw 커밋 | 0 |

이번 WO 코드 변경 = baseline 가드 3파일(commit 33f40f1ab) + 본 CHECK. raw/fetch 스크립트 미커밋.

---

## 11. 리스크와 보류 항목

| 항목 | 상태 |
|---|---|
| Gate A 전량 dry-run/apply | **HOLD** — streaming importer 전까지 |
| streaming importer 리팩터 | 후속 WO 필요(readline 증분 집계) |
| totalCount 변동 | 2,656,054→2,657,803(+1,749, 정상 갱신). manifest 기록, Gate A dry-run 시 재검증 |
| raw 대용량(2.5GB) | G: 저장(30GB 여유), checksum 확보. 처리 시 streaming 필수 |
| Auth Proxy 토큰 1h | 전량 apply(향후) 시 batch 경계 재기동 |
| API 예산 | dev key 10k/day 중 5,316 사용(1회 완주). resume 대비 manifest 확보 |

---

## 12. 다음 WO

```text
1. WO-O4O-MEDICAL-DEVICE-STREAMING-IMPORTER-DRYRUN-V1
   - Gate A importer 를 streaming(readline) 로 리팩터 → 전량 dry-run 가능화
   - createdExpected/updatedExpected/protectedBaselineSkipped/reviewFlags/dupConflict 등 전량 산출
   - DB write 0
2. (dry-run GO 후) WO-...-FULL-SCALE-GATE-A-IMPORT-APPLY-V1 — streaming apply(batch commit) + baseline 가드 + 승인 게이트
3. permit status map build(전량) → Gate B dry-run(batch-commit executor) → 승인 → Gate B apply → 결과 CHECK
```

**최종: 전량 raw 2,657,803건 fetch 완주(failed 0, checksum 확보) + Gate A baseline 보호 가드 구현·검증(14/14). Gate A dry-run 은 현 importer 의 단일 문자열/메모리 한계(2.5GB, RAM 7.9GB)로 실측 HOLD — streaming importer 리팩터가 unblocker. DB write 0, raw·serviceKey 미커밋. WO §12 허용 HOLD(가드 완료 + dry-run HOLD + write 0) 충족.**
