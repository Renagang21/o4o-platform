# WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1 — 최소 설계(계약 확정)

> 상태: DESIGN (구현 착수 전 계약 확정 단계 · WO §20 "census → 최소 설계 → 구현" 의 두 번째 단계)
> 근거: 사용자 지시 Message 5 — "바로 구현보다 먼저, **AI가 Excel 구조를 어떻게 읽고 어떤 JSON schema 를 반환할지**부터 설계"
> 선행: census 완료(AI Core · 파일/첨부 파이프라인 · surface/Target Schema 패턴 3축)

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
  /** 데이터 구역들. "구역 제목 + 데이터 행" 구조(예: 경구약품/주사제 섹션)를 표현. */
  regions: DataRegion[];
}

export interface DataRegion {
  /** 데이터 행 시작/끝(헤더 제외, 0-base, inclusive) */
  startRow: number;
  endRow: number;
  /** 이 구역의 헤더 행 인덱스(0-base). 헤더 없으면 -1. */
  headerRow: number;
  /** 구역 제목(예: '경구약품'). 섹션형이 아니면 null. **분류값이지 헤더가 아니다.** */
  sectionLabel: string | null;
  /** 열 매핑 */
  columns: ColumnMapping[];
  confidence: number;
}

export interface ColumnMapping {
  /** 원본 열 인덱스(0-base) */
  sourceColumn: number;
  /** 원본 헤더 텍스트(있으면). 예: '제품명(약품명)' */
  sourceLabel: string | null;
  /**
   * **surface 가 준 Target Schema 의 semanticRole 중 하나**, 또는 매핑 없음이면 null.
   * 공통 Core 는 이 문자열 집합을 소유하지 않는다 — 프롬프트에 주입된 허용 role 목록에서만 고른다.
   */
  semanticRole: string | null;
  confidence: number;
}
```

핵심: `sectionLabel` 이 있으면 그 값은 **각 데이터 행의 분류 필드**로 결정론적으로 채워진다(헤더 alias 로 오해하지 않는다).
이것이 지난 파서 STOP 의 직접 원인(`경 구 약 품` 을 헤더로 오독)에 대한 구조적 해법이다.

## 4. 계약 C — Target Schema 주입 (surface 소유)

공통 Core 는 필드명을 모른다. surface(hospital-drug 등)가 주입한다.

```ts
export interface TargetSchema {
  /** 이 자료의 canonical 필드(=semanticRole 집합). AI 는 이 중에서만 열을 매핑한다. */
  fields: TargetField[];
  /** 반드시 하나 이상 매핑돼야 연결을 허용하는 필드(예: 제품명). 없으면 거부. */
  requiredRoles: string[];
}

export interface TargetField {
  /** semanticRole 키(예: 'product_name'). Core 는 값의 의미를 모른다. */
  role: string;
  /** AI 프롬프트에 주는 자연어 설명(예: '약품/제품 이름 열'). surface 소유. */
  description: string;
  /** 사람이 준 예시 헤더 별칭(선택) — 프롬프트 힌트로만. 결정론적 매핑은 AI 결과가 기준. */
  aliasHints?: string[];
}
```

- hospital-drug 는 이 capability 의 **소비자**로서 `LocalDrugRow` 를 `TargetSchema` 로 표현해 주입한다. **이번 WO 에서 hospital-drug 코드는 만들지 않는다(§18)** — 제너릭 fixture 로만 검증.
- 현재 도메인 필드가 client/server 3곳 중복(census 발견)인 문제는, 이후 hospital-drug 적용 WO 에서 이 Target Schema 로 통합한다(이번 범위 아님).

## 5. 계약 D — Mapping 재사용 (structure fingerprint)

같은 형식을 다시 열면 AI 를 재호출하지 않는다.

```ts
export interface MappingCacheEntry {
  fingerprint: string;         // 구조 지문
  targetSchemaId: string;      // 어떤 Target Schema 로 매핑했는지
  inference: FileStructureInference;
  createdAt: string;
}

/** 지문 재료(값이 아니라 구조): 시트명 정렬 + 각 시트 헤더 라벨 정렬 + 열 개수 + 섹션 라벨 집합. 데이터 값은 미포함. */
export function computeStructureFingerprint(profile: StructureProfile): string;
```

- 지문은 **구조**만으로 만든다(데이터 행 값 미포함) → 같은 양식의 다른 달 파일도 재사용 가능.
- 저장: 브라우저 localStorage(작은 캐시). 실제 데이터셋 자체는 별도 키(기존 localDataset 패턴 재사용).

## 6. Confidence gate

- `inference.confidence` 또는 매핑된 `requiredRoles` 미충족 → **결정론적 정규화로 넘어가지 않고 사용자에게 QUESTION**.
- QUESTION 은 감지한 헤더 후보·구역을 보여주고 확인/수정 요청(지난 파서의 `detectedHeaders` UX 를 일반화).
- 임계값은 상수로 두되(예: 0.6) surface 가 override 가능.

## 7. 코드 배치 · 재사용 (census 정합)

| 조각 | 위치 | census 재사용 |
|---|---|---|
| decode(magic-byte 판별) + `sheet_to_json` 매트릭스화 | **client** `services/web-neture/src/lib/file-understanding/` | localDataset.ts `readArrayBuffer`+L243~257 판별 로직 추출(도메인 무관) |
| StructureProfile 빌더 | **client** 同 | 신규(제너릭) |
| 계약 타입 A~D (pure) | **shared** — 우선 `apps/api-server/src/services/ai-tools/file-understanding/contract.ts` + client 미러 | unified-request-contract.ts 의 pure 계약 패턴 |
| Gemini inference service | **server** `apps/api-server/src/services/ai/file-structure-inference.service.ts` | **web-research.service.ts 골격 복제**(grounding 제거, responseMode:'json'), `resolveEditingModel`+`resolveAiApiKey` |
| 결정론적 전체 행 정규화 | **client** 同 | 신규(제너릭) — Target Schema 로 매핑 |
| fingerprint / mapping 캐시 | **client** 同 | 신규 |
| HTTP 배선 | **server** ai-proxy.routes.ts `body.surface`(또는 전용 action) 얇은 분기 1개 | 기존 surface 확장 규범 |

**원칙**: 공통 Core 는 `apps/api-server/src/services/ai-tools/` 의 기존 공통 capability(Router=Capability C)와 나란히 둔다. packages 승격은 이번에 하지 않는다(중지 조건 — 대규모 공통 계약 변경). 클라 조각은 web-neture 안에 두되 hospital-drug 폴더 밖(`lib/file-understanding/`)에 둔다.

## 8. 구현 계획 A~H (WO §15 매핑)

- **A** Workbook structure profiler → client `profileWorkbook(file): StructureProfile`
- **B** Target Schema 계약 → `TargetSchema`(§4)
- **C** Gemini structure inference service → server `inferFileStructure(profile, targetSchema): FileStructureInference`
- **D** Mapping 계약 → `FileStructureInference`(§3)
- **E** Confidence handling → gate + QUESTION(§6)
- **F** 결정론적 행 정규화 엔진 → client `normalizeRows(matrix, inference, targetSchema): Row[]`
- **G** fingerprint/cache 기반 → `computeStructureFingerprint` + `MappingCacheEntry`(§5)
- **H** 제너릭 테스트 fixture → §9

## 9. 검증 (제너릭 fixture · 실제 병원 파일 미사용)

WO §16 의 제너릭 fixture A~F(도메인 중립: 예를 들어 재고표·연락처표 등 가상의 표)로 단위 테스트.
- profiler: 헤더행/구역/열통계 추출 정확도
- 결정론적 정규화: 같은 inference 로 항상 같은 결과
- fingerprint: 같은 구조 → 같은 지문, 다른 구조 → 다른 지문
- confidence gate: 임계 미달 → QUESTION 경로
- **AI 호출 자체(inferFileStructure 실측)는 사용자 키로만** — Claude 는 키 미수령. 서비스는 결정론적 mock inference 로 단위 검증하고, 실 Gemini smoke 는 사용자 직접 실행(보안 상수 준수).

## 10. 경계 · 중지 조건 재확인 (WO §18·§19)

- 금지: hospital-drug UI/파서 수정, 병원 Excel alias 추가, 병원 운영 smoke, POS/판매/콘텐츠 파일 처리, 신규 Workflow Engine, public API, WebMCP, Astra 변경.
- 중지: 전체 파일 서버 업로드가 필수가 되면 / Gemini 가 JSON 계약을 안정적으로 못 지키면 / 공통 attachment 계약 대규모 변경이 필요하면 / privacy 경계 불명확하면 / Composer·AI Core 대규모 재설계 필요하면 → 확장하지 말고 보고.
- 기존 커밋 `917f92371`·`9815ccb9b` 되돌리지 않음. 이 capability 는 hospital-drug 특화 코드를 추가하지 않음.

## 11. 완료 보고 예정 값 (WO §21)

- `GENERIC_FILE_UNDERSTANDING = DONE`
- `HOSPITAL_DRUG_SPECIFIC_CODE_ADDED = NO`
