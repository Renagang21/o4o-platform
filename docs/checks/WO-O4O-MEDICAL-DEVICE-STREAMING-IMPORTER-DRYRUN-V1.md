# WO-O4O-MEDICAL-DEVICE-STREAMING-IMPORTER-DRYRUN-V1 — 실행/검증 결과

> 상태: **완료 (dry-run 전용)** · 실행일 2026-07-05 · 환경: 집 PC Windows 로컬(`C:\Users\sohae\o4o-platform`)
> DB write 0 · apply 0 · migration 0 · raw 미커밋 · serviceKey 미기록

---

## 1. 작업 목적

의료기기 공공 seed 전량 raw(2,657,803 lines / 2.56GB)는 확보됐으나, 기존
`MedicalDeviceStandardCodeCandidateImportService.run()` 은 raw 전체를 **단일 문자열(text)** 로 받아
`parseMedicalDeviceJsonl(text)` 로 전량 배열화한다. 2.56GB raw 는 Node/V8 문자열 한계(~512MB)와
in-memory 매핑 배열(추정 5–8GB) 때문에 전량 Gate A dry-run 이 **HOLD** 상태였다
(`CHECK-O4O-MEDICAL-DEVICE-FULL-SCALE-RAW-FETCH-AND-GATE-A-IMPORT-DRYRUN-V1` §HOLD 사유).

본 WO 의 목적은 **readline 기반 streaming Gate A dry-run 경로**를 구현하여, 전량 2.66M raw 에 대한
Gate A dry-run 집계를 수행 가능하게 만드는 것이다. **dry-run 전용**이며 DB write / apply /
ProductCandidate·Master·Identifier 생성 / migration / 상세설명서 생성은 하지 않는다.

---

## 2. 변경 파일

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/modules/neture/drug-import/medical-device-standard-code-streaming-dryrun.service.ts` | readline streaming Gate A dry-run 서비스 (신규) |
| `apps/api-server/src/scripts/medical-device-standard-code-streaming-dryrun.ts` | CLI (`--file` 필수, `--apply` 차단, 진행/메모리 로그 stderr) (신규) |
| `apps/api-server/src/modules/neture/drug-import/__tests__/medical-device-standard-code-streaming-dryrun.test.ts` | streaming ↔ 비streaming 지표 일치 회귀 테스트 (신규) |
| `docs/checks/WO-O4O-MEDICAL-DEVICE-STREAMING-IMPORTER-DRYRUN-V1.md` | 본 문서 (신규) |

**재사용(정책 불변):** 파서 `parseMedicalDeviceLine`, 매퍼 `mapMedicalDeviceItem`
(identifierType / GTIN check-digit / reviewFlags / rowSignature) 를 그대로 사용한다.
파싱·매핑·dedup·교차행 판정 정책은 비streaming 경로와 동일하다.

---

## 3. streaming 구조 설명

```
fs.createReadStream(filePath, utf-8)
  → readline.createInterface({ crlfDelay: Infinity })   // \r\n 을 한 줄로
    → for await (const line of rl)                       // 한 줄씩 (전체 문자열/배열 미생성)
        parseMedicalDeviceLine(line)  →  mapMedicalDeviceItem(item)
        · 단건 지표 즉시 누적 (identifierType / formatCounts / 결측 / reviewFlags)
        · rowSignature dedup:  seenSig: Set<string>       // createdExpected / skipped
        · 교차행 대표값만 보관:
            udiAgg:    Map<normUDIDI, { firstSig, conflict, rows }>   // UDI_DI_DUP_CONFLICT
            permitAgg: Map<PERMIT,    { firstUdi, multi,   rows }>    // MULTI_UDI_PER_PERMIT
  → 전량 통과 후 udiAgg/permitAgg 순회로 dup/multi 확정
```

**메모리 정책:**
- raw 전체를 문자열/배열로 올리지 않는다 (`readFileSync`/`split` 금지).
- 원본 row/매핑결과 전체를 배열에 보관하지 않는다.
- dedup/conflict 판정에 필요한 **최소 signature/대표값(Set/Map)** 만 보관한다.
  - `seenSig`: rowSignature 문자열 집합
  - `udiAgg`: 정규화 UDIDI 별 `firstSig`(대표 signature) + conflict 플래그 + 행수
  - `permitAgg`: PERMIT 별 `firstUdi`(대표 UDIDI) + multi 플래그 + 행수
- **rowSignature dedup 유지 / UDIDI 단독 dedup 금지** (같은 코드 다른 제품=충돌행 보존).
- `--apply` 는 미지원 — CLI 에서 `--apply` 지정 시 즉시 `APPLY_UNSUPPORTED` 로 종료.
  streaming 경로는 DataSource 를 만들지 않으므로 **구조적으로 DB write 불가**.

---

## 4. 20k 회귀 dry-run 결과 (streaming ↔ 비streaming 일치)

동일 20k raw(`mfds-medical-device-standard-code-raw.jsonl`, 20,000 lines)에 대해
streaming 경로와 기존 비streaming importer 경로를 **같은 세션에서 직접 실행**하여 지표를 비교.

| 지표 | 비streaming | streaming | 일치 |
|------|:---:|:---:|:---:|
| totalRows | 20,000 | 20,000 | ✅ |
| processedRows | 20,000 | 20,000 | ✅ |
| invalidJsonLines | 0 | 0 | ✅ |
| identifierTypeCounts (GTIN/UDI_DI/null) | 19,845 / 155 / 0 | 19,845 / 155 / 0 | ✅ |
| formatCounts (gtin14/gtin13/checkFail/hibcc/missing) | 19,055 / 790 / 0 / 155 / 0 | 동일 | ✅ |
| createdExpected | 19,996 | 19,996 | ✅ |
| skipped | 4 | 4 | ✅ |
| errored | 0 | 0 | ✅ |
| manufacturerMissing | 6 | 6 | ✅ |
| dupConflict (keys / rows) | 122 / 244 | 122 / 244 | ✅ |
| multiUdiPermitCount | 450 | 450 | ✅ |
| reviewFlagCounts (전체 13종) | — | 완전 동일 | ✅ |
| **blankLines** | **1** | **0** | ⚠️ (아래) |

**WO §7 20k 기대값 대조:** totalRows 20,000 · createdExpected 19,996 · skipped 4 · errored 0 ·
GTIN 19,845 · UDI_DI 155 · dupConflict 122 keys / 244 rows · manufacturerMissing 6 — **전부 정확 일치.**

**⚠️ blankLines ±1 (benign, 데이터 무관):** 비streaming 파서는 `text.split(/\r?\n/)` 이라
파일 말미 trailing newline 을 빈 요소 1개로 세어 `blankLines=1`. streaming(readline)은 trailing
newline 뒤 빈 줄을 방출하지 않으므로 `blankLines=0`. **어떤 후보 산출값에도 영향 없음**
(totalRows/createdExpected/reviewFlags 등 데이터 지표 전부 일치). WO §5 필수 지표 목록에도
blankLines 는 없다. streaming 쪽이 오히려 "진짜 빈 줄"만 세는 정확한 정의다.

단위 테스트(`__tests__/medical-device-standard-code-streaming-dryrun.test.ts`) — 3/3 PASS
(교차행/중복/결측 표본 기준 streaming=비streaming 절대 수치 일치 + lazy async 소비 확인).

---

## 5. 전량 2.66M dry-run 결과

전량 raw: `G:\내 드라이브\자료실\public-data-api-samples\full-fetch\medical-device\md-full-20260705-142323\raw.jsonl`
(2,657,803 lines / 2,561,589,662 bytes ≈ 2.56GB, repo 밖 G: 드라이브).

실행: `NODE_OPTIONS=--max-old-space-size=6144 npx tsx src/scripts/medical-device-standard-code-streaming-dryrun.ts --file <raw> --service-key neture --progress-every 250000`

| 지표 | 값 |
|------|---|
| totalRows | **2,657,803** (== rawLineCount, 전량 파싱) |
| processedRows | 2,657,803 |
| blankLines | 1 |
| invalidJsonLines | **0** (무음 손실 0) |
| identifierTypeCounts | GTIN 2,574,214 / UDI_DI 83,588 / null 1 |
| formatCounts | gtin14CheckPass 2,396,280 / gtin13 177,934 / checkDigitFail 4 / hibccNonGtin 83,584 / missing 1 |
| createdExpected | 2,656,075 |
| skipped (rowSignature 정확중복) | 1,728 |
| errored | **0** |
| candidateNameMissing | 0 |
| manufacturerMissing | 36,777 |
| distinctPermitCount | 77,146 |
| **dupConflict** (UDI_DI_DUP_CONFLICT) | **49,715 keys / 105,597 rows** |
| multiUdiPermitCount | 46,856 |
| reviewFlag MULTI_UDI_PER_PERMIT (행) | 2,627,324 |
| reviewFlag STATUS_UNCHECKED (전건) | 2,657,803 |
| elapsedMs | **40,363 (≈40.4초)** |

**해석:**
- `totalRows == rawLineCount(2,657,803)` + `invalidJsonLines 0` + `errored 0` → 전량 무손실 파싱·매핑.
- identifier 분포: GTIN 96.85% / UDI_DI(HIBCC·비GTIN·checkFail) 3.15% / 결측 1건.
- `createdExpected 2,656,075` 는 파일 내 rowSignature dedup 상한값 (기존 DB 후보 update 예측 제외 — DB 미연결).
- checkDigitFail 4건: 숫자 13/14 이나 GTIN check-digit 실패 → 정책대로 UDI_DI 로 보존.
- STATUS_UNCHECKED 전건: 허가 상태(active/inactive) 미조인 — Gate B 승격 시 별도 status map 필요.

---

## 6. 메모리 / readFileSync 문제 해소 여부

진행 로그(stderr, `--progress-every 250000`):

```
processed=250000   heapUsed=101MB  rss=177MB
processed=500000   heapUsed=157MB  rss=247MB
processed=750000   heapUsed=266MB  rss=350MB
processed=1000000  heapUsed=330MB  rss=410MB
processed=1250000  heapUsed=433MB  rss=524MB
processed=1500000  heapUsed=497MB  rss=583MB
processed=1750000  heapUsed=556MB  rss=633MB
processed=2000000  heapUsed=611MB  rss=693MB
processed=2250000  heapUsed=867MB  rss=878MB
processed=2500000  heapUsed=921MB  rss=937MB
```

- **Node 문자열 한계(~512MB) 미도달** — raw 를 문자열로 올리지 않으므로 애초에 해당 없음.
- 피크 메모리 **heapUsed 921MB / rss 937MB** (2.5M 시점) — 2.56GB raw 를 처리하면서도 1GB 미만.
  기존 경로의 추정 5–8GB in-memory 매핑 대비 근본 해소.
- 메모리는 dedup/conflict 보관 구조(seenSig/udiAgg/permitAgg)에 비례해 선형 증가하며,
  원본 row 배열 미보관으로 폭증하지 않는다. 40초 내 완주.

→ **HOLD 해제**: 전량 Gate A dry-run 실측 가능. streaming importer 리팩터가 unblocker 였음을 확인.

---

## 7. DB write / apply / migration 0 확인

- streaming 서비스/CLI 는 `typeorm` / DataSource 를 **import 하지 않는다** → 구조적으로 DB 접근 불가.
- CLI 는 `--apply` 지정 시 `APPLY_UNSUPPORTED` 로 즉시 종료 (집계 전용).
- ProductCandidate / ProductMaster / ProductIdentifier INSERT/UPDATE **0**.
- 신규 migration **0** (이 WO 범위 밖). 상세설명서/상세페이지/매장 설명문 생성 **0**.
- `USE_PURPS_CONT`·보관조건·유통조건 등은 매퍼 rawPayload 에 **원본 메타데이터로만 보존** (설명 생성 아님).

---

## 8. raw 미커밋 확인

- 전량 raw / 20k raw / full-fetch 산출물은 전부 **G: 드라이브(repo 밖)** — repo 로 복사·커밋하지 않음.
- 커밋 대상: streaming service / CLI / test + 본 CHECK 문서만.
- serviceKey / secret literal 미기록 (CLI 는 `--service-key` 인자만 받고 값을 출력하지 않음).

---

## 9. 다음 단계 제안 (실행하지 않음)

이번 WO 는 **Gate A streaming dry-run 까지**. 아래는 후속 후보이며 본 WO 에서 실행하지 않는다.

1. **전량 Gate A apply runbook 작성** — streaming apply 경로(배치 INSERT + rowSignature dedup +
   baseline 보호 `approved_new_master`/`merged` skip) 설계. 단, streaming 경로는 현재 apply 미지원이므로
   apply 는 별도 streaming-apply 구현 또는 기존 비streaming apply 의 배치 스트리밍화가 선행되어야 함.
2. **전량 Gate A apply 승인/실행** — 사용자 "의료기기 apply 승인" + env gate 후 CI/CD 또는 승인 채널로 실행.
   예상 신규 후보 ≈ 2,656,075 (기존 20k baseline 후보와 rowSignature 중복분 제외 후 재산정 필요).
3. **전량 Gate B dry-run** — 허가 상태 map join + GTIN/UDI 매칭축으로 ProductMaster 승격 판정.
   (status map 미연결이 현재 STATUS_UNCHECKED 전건의 원인.)

> 본 WO 에서는 **1번(apply runbook 제안)까지만** 두고 실행하지 않는다.

---

## 부록 A. 검증 커맨드 재현

```powershell
# 단위 테스트 (회귀)
cd apps/api-server; npx jest medical-device-standard-code-streaming-dryrun

# 20k streaming
npx tsx src/scripts/medical-device-standard-code-streaming-dryrun.ts `
  --file "G:\내 드라이브\자료실\public-data-api-samples\mfds-medical-device-standard-code-raw.jsonl" `
  --service-key neture

# 20k 비streaming (parity 대조)
npx tsx src/scripts/medical-device-standard-code-candidate-import.ts `
  --file "G:\내 드라이브\자료실\public-data-api-samples\mfds-medical-device-standard-code-raw.jsonl" `
  --service-key neture --dry-run

# 전량 2.66M streaming
$env:NODE_OPTIONS="--max-old-space-size=6144"
npx tsx src/scripts/medical-device-standard-code-streaming-dryrun.ts `
  --file "G:\내 드라이브\자료실\public-data-api-samples\full-fetch\medical-device\md-full-20260705-142323\raw.jsonl" `
  --service-key neture --progress-every 250000
```
