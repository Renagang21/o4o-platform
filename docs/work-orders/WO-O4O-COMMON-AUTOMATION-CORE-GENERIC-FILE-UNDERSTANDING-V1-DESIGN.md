# WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1 — 설계(계약 확정 · as-built)

> 상태: IMPLEMENTED (계약 A~H 구현 완료 · WO §20 "census → 최소 설계 → 구현" 의 세 번째 단계)
> 근거: 사용자 지시 Message 5 — "바로 구현보다 먼저, **AI가 Excel 구조를 어떻게 읽고 어떤 JSON schema 를 반환할지**부터 설계" → 계약 B/C 승인 + 4개 정제(dataStartRow·targetField·per-field required·TargetSchema/LocalDrugRow 분리)
> 선행: census 완료(AI Core · 파일/첨부 파이프라인 · surface/Target Schema 패턴 3축)
> 구현 위치: `apps/api-server/src/services/ai-tools/file-understanding/`(순수 엔진 + Gemini 추론 서비스) · 테스트 `apps/api-server/src/__tests__/file-understanding.spec.ts`(12 케이스 PASS)
> 이 문서는 **정제된 as-built 계약**을 반영한다(초안의 semanticRole/requiredRoles/aliasHints 는 targetField/per-field required/examples 로 대체됨).

---

## 0. 목적 · 한 줄 정의

임의 형식의 스프레드시트/표 파일을 **AI 가 "구조"만 해석**하고, **브라우저가 전체 행을 결정론적으로 정규화**하는
**도메인 무관 공통 capability**. hospital-drug 는 이 capability 의 **첫 적용 사례일 뿐 개발 대상이 아니다.**

- AI 는 구조·의미를 이해한다(헤더 위치, 구역, 열→역할 매핑). **행 대량 처리는 AI 가 하지 않는다.**
- 같은 형식을 다시 열면 fingerprint 로 **AI 재호출 없이** 결정론적으로 재사용한다.
- 공통 Core 는 **도메인 필드명을 소유하지 않는다**(product_name·ingredient 등은 surface 가 Target Schema 로 주입).

## 1. 파이프라인 (역할 경계)

```
[브라우저 / web-neture]                          [서버 / api-server]              [AI]
파일 선택
  → decode (SheetJS, magic-byte 판별)      ────────────────
  → StructureProfile 생성 (최소 샘플)  ──POST /api/ai/request──▶ inferFileStructure()  ──▶ Gemini
       (헤더 후보 ~20행 + 열 통계만)                              (execute json, grounding X)   (구조 해석)
  ◀───────── FileStructureInference (JSON) ◀──────────────────────────────────────────────────┘
  → confidence gate (임계 미달 → 사용자 QUESTION)
  → 결정론적 전체 행 정규화 (Target Schema 로 매핑)   ← 여기서 전체 행 처리 (AI 아님)
  → localStorage / IndexedDB 저장
  → structure fingerprint 저장 (다음 동일 형식은 AI 생략)
```

**전송 경계**: 서버·AI 에는 **StructureProfile(최소 샘플)만** 간다. 전체 파일·전체 행은 브라우저를 떠나지 않는다.
(privacy-first · 기존 §7 "Attachment ≠ Persistent Knowledge" 와 정합 — 서버는 요청 메모리 안에서만 처리, DB/로그/파일 저장 경로 없음.)

---

## 2. 계약 A — StructureProfile (AI 입력 = 최소 샘플)

AI 에 보내는 것은 파일 전체가 아니라 **구조를 판정하기에 충분한 최소 표본**이다.

```ts
/** 공통 Core — 도메인 어휘 0. 브라우저가 SheetJS 매트릭스에서 생성. */
export interface StructureProfile {
  /** 시트별 프로파일. 기본은 첫 시트지만 다중 시트도 담을 수 있다. */
  sheets: SheetProfile[];
  /** 파일 형식(디코딩 결과) — 'xlsx' | 'xls' | 'csv' */
  sourceFormat: 'xlsx' | 'xls' | 'csv';
}

export interface SheetProfile {
  sheetName: string;
  /** 전체 행 수(표본이 아닌 실제 총량 — 규모 판단용) */
  totalRows: number;
  /** 열 개수(가장 넓은 행 기준) */
  columnCount: number;
  /**
   * 앞쪽 표본 행. 헤더/구역 제목 판정을 위해 상단 N행(기본 20)만.
   * 각 셀은 문자열로 정규화(raw:false). 빈 셀은 ''.
   */
  sampleRows: string[][];
  /**
   * 열별 통계(전체 행 스캔 기반, 값 자체는 최소화):
   * 빈 값 비율·숫자 비율·대표 샘플 3개 — AI 가 열의 성격을 추론하도록.
   */
  columnStats: ColumnStat[];
}

export interface ColumnStat {
  /** 0-base 열 인덱스 */
  index: number;
  nonEmptyRatio: number;   // 0..1
  numericRatio: number;    // 0..1
  /** 대표 값 표본(최대 3개, 각 ≤ 40자) — 민감정보 유입 최소화 */
  samples: string[];
}
```

- `sampleRows` 는 상단 20행으로 제한 → 토큰·프라이버시 상한.
- `columnStats.samples` 는 열당 3개·40자 상한 → 전체 데이터가 아니라 "형태"만 전달.

## 3. 계약 B — FileStructureInference (AI 출력 JSON schema)

Gemini 가 **반드시 이 형태의 JSON 만** 반환한다(`responseMode:'json'` → `responseMimeType:'application/json'`).
엄격 responseSchema 는 provider 미지원이므로 **파싱 검증 + 1회 재시도 + Zod 유사 런타임 검증**으로 계약을 강제한다.

```ts
export interface FileStructureInference {
  sheets: SheetInference[];
  /** 전체 추론 신뢰도 0..1 — confidence gate 의 1차 기준 */
  confidence: number;
  /** 사람이 읽는 경고(불확실 구역·복수 헤더 후보 등). 비어 있을 수 있다. */
  warnings: string[];
}

export interface SheetInference {
  sheetName: string;
  /** 데이터 구역들. "구역 제목 + 헤더 + 데이터 행" 구조를 표현. */
  regions: DataRegion[];
  /** TargetSchema 에 없는 열(AI 가 임의 필드를 만들지 못하게 하고 여기 보고만). */
  unmappedColumns: UnmappedColumn[];
}

export interface DataRegion {
  /** 구역 시작 행(구역 제목 포함 가능, 0-base) */
  startRow: number;
  /** 구역 끝 행(0-base, inclusive). 미지정이면 시트 끝까지. */
  endRow?: number;
  /** 헤더 행 인덱스(0-base). 헤더 없는 파일이면 미지정. */
  headerRow?: number;
  /**
   * **실제 데이터가 시작하는 행(0-base) — 필수.** normalizer 가 이 값을 직접 쓴다(재추측 없음).
   * 정제 반영: 구역 제목(startRow) / 헤더(headerRow) / 데이터 시작(dataStartRow)이 서로 다른 행일 수 있다.
   */
  dataStartRow: number;
  /** 구역 제목(예: '경구약품'). 섹션형이 아니면 미지정. **분류값이지 헤더가 아니다.** */
  sectionLabel?: string;
  /** 열 매핑 */
  columns: ColumnMapping[];
  confidence: number;
}

export interface ColumnMapping {
  /** 원본 열 인덱스(0-base) */
  sourceColumn: number;
  /** 원본 헤더 텍스트(있으면). 예: '제품명(약품명)' */
  sourceLabel?: string;
  /**
   * **surface 가 준 TargetSchema 에 선언된 field key 중 하나만.**
   * 공통 Core 는 이 문자열 집합을 소유하지 않는다 — 프롬프트에 주입된 허용 key 목록에서만 고른다.
   * AI 가 임의 필드(drug_code·vendor_code 등)를 만들면 validateInference 가 제거해 unmappedColumns 로 강등.
   */
  targetField: string;
  confidence: number;
}

export interface UnmappedColumn {
  sourceColumn: number;
  sourceLabel?: string;
  reason?: string;   // 예: 'unknown_target_field'
}
```

핵심 1: `sectionLabel` 이 있으면 그 값은 **각 데이터 행의 generic metadata**(NormalizedRecord.sectionLabel)로 결정론적으로 채워진다(헤더 alias 로 오해하지 않는다). 이것이 지난 파서 STOP 의 직접 원인(`경 구 약 품` 을 헤더로 오독)에 대한 구조적 해법이다. **단 sectionLabel 은 도메인 필드가 아니라 metadata** — 어떤 도메인 필드에 넣을지는 surface adapter 가 결정한다.

핵심 2: `targetField` 는 **TargetSchema 에 선언된 key 만 허용**. `validateInference(raw, targetSchema)` 가 런타임에서 강제하며(§4), 위반 열은 `unmappedColumns` 로 강등해 보고만 한다 — Core 가 AI 임의 필드로 오염되지 않는다.

## 4. 계약 C — Target Schema 주입 (surface 소유)

공통 Core 는 필드명을 모른다. surface(hospital-drug 등)가 **의미 설명이 담긴 generic descriptor** 로 주입한다.

```ts
export interface TargetSchema {
  /** 스키마 식별자(캐시 키의 일부). */
  id: string;
  /** 이 자료의 canonical 필드. AI 는 이 field.key 중에서만 열을 매핑한다. */
  fields: TargetField[];
}

export interface TargetField {
  /** semantic 필드 키(예: 'product_name'). Core 는 값의 의미를 모른다. */
  key: string;
  /** AI 프롬프트에 주는 자연어 설명(예: '약품/제품 이름 열'). surface 소유. */
  description: string;
  /** 하나 이상 매핑돼야 연결을 허용하는 필드(per-field). required 전부 빈 값인 행은 정규화에서 버린다. */
  required: boolean;
  /** AI 의미 판단 보조용 예시(선택). **결정론적 alias 표가 아니라 힌트일 뿐** — 남발하면 기존 alias 방식으로 회귀. */
  examples?: string[];
}
```

**정제 반영(계약 C 경계 · 사용자 지시):**
- `required` 를 스키마 최상위 `requiredRoles` 배열이 아니라 **각 field 의 per-field boolean** 으로 둔다.
- `TargetSchema` 는 **domain result type 과 분리**한다. 경계:
  `Generic Core → generic NormalizedRecord → surface adapter → LocalDrugRow(도메인 타입)`.
  **Generic Core 가 `LocalDrugRow` 를 import 하거나 알면 안 된다.** 반대로 하면 Core 가 다시 병원약국 중심으로 오염된다.
- hospital-drug 는 이 capability 의 **소비자**로서, 훗날 자기 `LocalDrugRow` 를 위 generic descriptor 로 **기술**해 주입한다. **이번 WO 에서 hospital-drug 코드·특화 어휘는 만들지 않는다(§18)** — 도메인 중립 fixture 로만 검증.
- 현재 도메인 필드가 client/server 3곳 중복(census 발견)인 문제는, 이후 hospital-drug 적용 WO 에서 이 Target Schema 로 통합한다(이번 범위 아님).

런타임 강제(`contract.ts`):
```ts
/** 코드펜스도 관대하게 파싱. */
export function parseInferenceJson(content: string): unknown;
/** AI 원본 → 계약 정규화. schema 밖 targetField 제거→unmappedColumns, confidence clamp, dataStartRow 보정. */
export function validateInference(raw: unknown, targetSchema: TargetSchema): FileStructureInference;
```

## 5. 계약 D — Mapping 재사용 (structure fingerprint)

같은 형식을 다시 열면 AI 를 재호출하지 않는다.

```ts
export interface MappingCacheEntry {
  fingerprint: string;         // 구조 지문
  targetSchemaId: string;      // 어떤 Target Schema 로 매핑했는지
  inference: FileStructureInference;
  createdAt: string;
}

/** StructureProfile → 'fp1_'+FNV-1a(8hex). */
export function computeStructureFingerprint(profile: StructureProfile): string;
```

- 지문 재료(값이 아니라 **구조**): `sourceFormat` + 각 시트(이름순 정렬)의 이름·열수 + 상단 표본 행의 **셀 shape 시그니처**(텍스트`t`/숫자`#`/빈칸`_`) + 열 numericRatio 버킷(0..10). **데이터 값 자체는 미포함**(개인정보 유입 차단) → 같은 양식의 다른 달 파일도 같은 지문 → 재사용.
- 인퍼런스 전에는 헤더 라벨을 확정할 수 없으므로 라벨 텍스트가 아니라 **shape 시그니처**로 안정적 지문을 만든다(as-built 정정).
- crypto 의존 없이 FNV-1a 32bit → node·브라우저 동일 결과(환경 중립).
- 저장: 브라우저 localStorage(작은 캐시). 실제 데이터셋 자체는 별도 키(기존 localDataset 패턴 재사용).

## 6. Confidence gate (계약 E · 2계층)

`evaluateConfidence(inference, targetSchema, threshold=0.6): ConfidenceVerdict` — **전체·구역·열 3층**을 평가하되, **낮은 항목만** 사용자에게 확인한다(전부 다시 묻지 않는다).

```ts
export interface ConfidenceVerdict {
  ok: boolean;                              // 전체·구역·열 모두 임계 이상 & required 충족
  threshold: number;
  missingRequired: string[];               // 어디에도 매핑 안 된 required key
  lowConfidenceColumns: LowConfidenceColumn[]; // 임계 미만 열(이것만 QUESTION)
  lowConfidenceRegions: LowConfidenceRegion[]; // 임계 미만 구역
}
```

- region confidence 와 column confidence **둘 다 보존** → 애매한 부분만 국소적으로 확인.
- `missingRequired` 가 있으면 `ok=false` → 결정론적 정규화 전에 QUESTION.
- 임계값은 상수(`DEFAULT_CONFIDENCE_THRESHOLD=0.6`), surface 가 override 가능.

## 7. 코드 배치 · 재사용 (census 정합)

as-built 배치(정정): **순수 엔진 전부 + Gemini 추론 서비스를 서버측 한 폴더**에 두었다. SheetJS 는 node·브라우저 공통 동작이므로 decode/profile/fingerprint/normalize 는 환경 중립 순수 함수 — jest 로 서버측 검증하고, 훗날 브라우저(web-neture)는 같은 순수 모듈을 재사용/미러한다.

| 조각 | 파일 (`apps/api-server/src/services/ai-tools/file-understanding/`) | census 재사용 |
|---|---|---|
| 계약 타입 A~D + 런타임 검증 (pure) | `contract.ts` | unified-request-contract.ts 의 pure 계약 패턴 |
| decode(magic-byte 판별) + `sheet_to_json` 매트릭스화 | `decode.ts` | localDataset.ts `readArrayBuffer`+판별 로직을 도메인 무관 조각으로 추출 |
| StructureProfile 빌더 (A) | `profile.ts` | 신규(제너릭) |
| fingerprint (G) | `fingerprint.ts` | 신규(제너릭, FNV-1a) |
| 결정론적 전체 행 정규화 (F) + confidence gate (E) | `normalize.ts` | 신규(제너릭) — TargetSchema key 로 매핑 |
| Gemini inference service (C) | `structure-inference.service.ts` | **web-research.service.ts 골격 복제**(grounding 제거, responseMode:'json'), `resolveEditingModel`+`resolveAiApiKey` |
| barrel | `index.ts` | — |
| 제너릭 테스트 (H) | `apps/api-server/src/__tests__/file-understanding.spec.ts` | task-modality-router.spec 스타일 |

**원칙**: 공통 Core 는 `apps/api-server/src/services/ai-tools/` 의 기존 공통 capability(Router=Capability C)와 나란히 둔다. packages 승격·신규 저장소는 이번에 하지 않는다(중지 조건 — 대규모 공통 계약 변경). hospital-drug 폴더는 건드리지 않는다. HTTP 배선·브라우저 UI 는 이번 범위 아님(향후 적용 WO).

## 8. 구현 계획 A~H (WO §15 매핑 · as-built)

- **A** Workbook structure profiler → `profileWorkbook(decoded): StructureProfile` (`profile.ts`)
- **B** Target Schema 계약 → `TargetSchema{id, fields:[{key, description, required, examples?}]}` (§4, `contract.ts`)
- **C** Gemini structure inference service → `inferFileStructure({profile, targetSchema}): FileStructureInference` (`structure-inference.service.ts`)
- **D** Mapping 계약 → `FileStructureInference` + `validateInference` + `MappingCacheEntry` (§3·§5, `contract.ts`)
- **E** Confidence handling → `evaluateConfidence(): ConfidenceVerdict` 2계층 (§6, `normalize.ts`)
- **F** 결정론적 행 정규화 엔진 → `normalizeRows(decoded, inference, targetSchema): NormalizeResult` (`normalize.ts`)
- **G** fingerprint/cache 기반 → `computeStructureFingerprint` + `MappingCacheEntry` (§5, `fingerprint.ts`+`contract.ts`)
- **H** 제너릭 테스트 fixture → §9

## 9. 검증 (제너릭 fixture · 실제 병원 파일 미사용) — as-built

`apps/api-server/src/__tests__/file-understanding.spec.ts` — 도메인 중립 fixture(가상의 코드/이름/수량 2-구역 표), **12 케이스 PASS**:
- decode: BOM 없는 UTF-8 CSV 한글 무손실 · xlsx(PK) magic-byte 판정
- profiler(A): 열통계(numericRatio)·상단 표본만 산출
- fingerprint(G): 같은 구조·다른 값 → 같은 지문 / 열수 다름 → 다른 지문
- normalize(F): dataStartRow 존중·sectionLabel 부착·required 빈 행 skip
- confidence(E): ok=true / 낮은 열만 골라냄 / missingRequired 보고
- validateInference(B/C): schema 밖 targetField → unmappedColumns 강등 · dataStartRow 보정 · confidence clamp
- parseInferenceJson: 코드펜스 파싱
- **AI 실호출(inferFileStructure)은 사용자 키로만** — Claude 는 키 미수령(보안 상수). 계약 강제는 `validateInference` 를 mock inference 로 단위 검증했고, 실 Gemini smoke 는 사용자 직접 실행.

검증 명령: `cd apps/api-server && npx jest file-understanding` (12 PASS) · `npx tsc --noEmit`(신규 모듈 0 에러).

## 10. 경계 · 중지 조건 재확인 (WO §18·§19)

- 금지: hospital-drug UI/파서 수정, 병원 Excel alias 추가, 병원 운영 smoke, POS/판매/콘텐츠 파일 처리, 신규 Workflow Engine, public API, WebMCP, Astra 변경.
- 중지: 전체 파일 서버 업로드가 필수가 되면 / Gemini 가 JSON 계약을 안정적으로 못 지키면 / 공통 attachment 계약 대규모 변경이 필요하면 / privacy 경계 불명확하면 / Composer·AI Core 대규모 재설계 필요하면 → 확장하지 말고 보고.
- 기존 커밋 `917f92371`·`9815ccb9b` 되돌리지 않음. 이 capability 는 hospital-drug 특화 코드를 추가하지 않음.

## 11. 완료 보고 예정 값 (WO §21)

- `GENERIC_FILE_UNDERSTANDING = DONE`
- `HOSPITAL_DRUG_SPECIFIC_CODE_ADDED = NO`
