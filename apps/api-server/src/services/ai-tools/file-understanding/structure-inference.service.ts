/**
 * 계약 C — File Structure Inference Service (Gemini 구조 해석 호출)
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1 (WO §15-C)
 *
 * web-research.service.ts 골격을 복제하되:
 *   - grounding **생략** (grounding 과 JSON 은 상호 배타 — grounding 은 text 를 강제)
 *   - responseMode:'json' (Gemini responseMimeType application/json)
 *   - 계약은 JSON.parse + validateInference(런타임 검증)로 강제
 *
 * 경계(엄수):
 * - **범용이다.** 특정 약품·병원·서비스 어휘를 프롬프트에 넣지 않는다. 의미는 TargetSchema 가 주입한다.
 * - AI 는 **구조만** 해석한다(구역·헤더·dataStartRow·열→targetField). 전체 행은 보내지도 처리하지도 않는다.
 * - 모델은 `resolveEditingModel()` 값만, 키는 `resolveAiApiKey`(ai_settings→env) — 코드·로그에 기록하지 않는다.
 * - HTTP route 없음. 내부 service 함수만.
 */

import { execute } from '@o4o/ai-core';

import {
  parseInferenceJson,
  validateInference,
  type FileStructureInference,
  type StructureProfile,
  type TargetSchema,
} from './contract.js';

export interface InferFileStructureRequest {
  profile: StructureProfile;
  targetSchema: TargetSchema;
  timeoutMs?: number;
  /**
   * 선택적 resolver 주입. **프로덕션은 생략한다** — 생략 시 기본값이 실 resolver
   * (admin SSOT → resolveEditingModel · ai_settings→env → resolveAiApiKey)를 그대로 호출한다.
   * DB 를 초기화하지 않는 standalone 컨텍스트(예: tsx 스모크 — esbuild 는 TypeORM 엔티티
   * decorator metadata 를 방출하지 못해 connection.js 로드가 불가)에서만, 엔티티 그래프를
   * 끌어오지 않도록 model/key 해석을 주입한다. 반환 계약·정규화는 동일하다.
   */
  resolveModel?: () => Promise<string> | string;
  resolveApiKey?: () => Promise<string> | string;
}

export interface InferFileStructureResult {
  inference: FileStructureInference;
  model: string;
  requestId: string;
}

/**
 * 기본 model resolver — admin SSOT(AiQueryPolicy.defaultModel) → env → gemini canonical.
 * 동적 import 로 connection.js(엔티티 그래프·import 시 DB 초기화)를 **호출 시점**까지 지연한다.
 * 프로덕션 동작은 정적 import 시절과 동일(모듈은 앱 부팅 때 이미 초기화됨).
 */
async function defaultResolveModel(): Promise<string> {
  const { resolveEditingModel } = await import('../../../utils/ai-editing-model-resolver.js');
  return resolveEditingModel();
}

/** 기본 key resolver — ai_settings(DB 초기화 시) → env(GEMINI_API_KEY 등). */
async function defaultResolveApiKey(): Promise<string> {
  const [{ AppDataSource }, { resolveAiApiKey }] = await Promise.all([
    import('../../../database/connection.js'),
    import('../../../utils/ai-key.util.js'),
  ]);
  return resolveAiApiKey(AppDataSource, 'gemini');
}

const SYSTEM_PROMPT = [
  '너는 스프레드시트의 구조만 해석하는 분석기다. 데이터 값 자체를 가공하거나 요약하지 않는다.',
  '주어진 상단 표본과 열 통계로 각 시트의 데이터 구역·헤더 행·데이터 시작 행을 판정하고,',
  '각 열을 주어진 target schema 의 field key 중 하나에 매핑한다.',
  '반드시 지시된 JSON 스키마 그대로만 응답한다(설명 문장·코드펜스 없이 JSON 만).',
].join(' ');

function describeTargetSchema(schema: TargetSchema): string {
  const lines = schema.fields.map((f) => {
    const req = f.required ? 'required' : 'optional';
    const ex = f.examples && f.examples.length > 0 ? ` | examples: ${f.examples.join(', ')}` : '';
    return `- key="${f.key}" (${req}): ${f.description}${ex}`;
  });
  return `Target schema id="${schema.id}", fields:\n${lines.join('\n')}`;
}

function describeProfile(profile: StructureProfile): string {
  const sheets = profile.sheets.map((sheet) => {
    const stats = sheet.columnStats
      .map(
        (s) =>
          `    col ${s.index}: nonEmpty=${s.nonEmptyRatio.toFixed(2)} numeric=${s.numericRatio.toFixed(2)} samples=[${s.samples.join(' | ')}]`,
      )
      .join('\n');
    const rows = sheet.sampleRows
      .map((row, i) => `    row ${i}: [${row.map((c) => c.replace(/\s+/g, ' ').trim()).join(' | ')}]`)
      .join('\n');
    return [
      `sheet "${sheet.sheetName}" (totalRows=${sheet.totalRows}, columnCount=${sheet.columnCount})`,
      '  sampleRows (0-base row index):',
      rows,
      '  columnStats:',
      stats,
    ].join('\n');
  });
  return `sourceFormat=${profile.sourceFormat}\n${sheets.join('\n\n')}`;
}

/** AI 출력 JSON 스키마를 프롬프트로 명시(Gemini 엄격 responseSchema 미지원 대비). */
const OUTPUT_CONTRACT = `
응답 JSON 스키마 (정확히 이 형태):
{
  "sheets": [
    {
      "sheetName": string,
      "regions": [
        {
          "startRow": number,        // 구역 시작 행(구역 제목 포함 가능, 0-base)
          "endRow": number | null,   // 구역 끝 행(inclusive) 또는 생략
          "headerRow": number | null,// 헤더 행(없으면 생략)
          "dataStartRow": number,    // 실제 데이터가 시작하는 행(0-base, 필수)
          "sectionLabel": string | null, // 구역 제목(분류값이며 헤더가 아님). 없으면 생략
          "columns": [
            { "sourceColumn": number, "sourceLabel": string, "targetField": string, "confidence": number }
          ],
          "confidence": number       // 이 구역 신뢰도 0..1
        }
      ],
      "unmappedColumns": [
        { "sourceColumn": number, "sourceLabel": string, "reason": string }
      ]
    }
  ],
  "confidence": number,  // 전체 신뢰도 0..1
  "warnings": [string]
}
규칙:
- targetField 는 반드시 위 target schema 에 선언된 key 중 하나여야 한다. 새 key 를 만들지 마라.
- schema 에 없는 의미의 열은 columns 가 아니라 unmappedColumns 에 넣어라.
- 구역 제목(예: 분류 헤더 한 줄)은 headerRow 가 아니라 sectionLabel 로 표기하고, dataStartRow 는 실제 데이터 첫 행으로 둔다.
- 확신이 낮은 매핑에는 낮은 confidence 를 부여하라(추측 강요 금지).
`;

function buildUserPrompt(profile: StructureProfile, schema: TargetSchema): string {
  return [
    describeTargetSchema(schema),
    '',
    '아래는 파일 구조 프로파일(전체 파일이 아니라 상단 표본 + 열 통계)이다:',
    describeProfile(profile),
    '',
    OUTPUT_CONTRACT,
  ].join('\n');
}

/**
 * 계약 C — 구조 프로파일 + target schema 를 Gemini 로 해석해 FileStructureInference 를 반환한다.
 * AI 출력은 항상 validateInference 로 정규화 → schema 밖 targetField 는 unmappedColumns 로 강등된다.
 *
 * @throws execute()/JSON.parse 실패를 전파 — 호출측이 재시도·QUESTION 전략을 결정.
 */
export async function inferFileStructure(request: InferFileStructureRequest): Promise<InferFileStructureResult> {
  const model = await (request.resolveModel ? request.resolveModel() : defaultResolveModel());
  const apiKey = await (request.resolveApiKey ? request.resolveApiKey() : defaultResolveApiKey());

  const result = await execute({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: buildUserPrompt(request.profile, request.targetSchema),
    provider: 'gemini',
    responseMode: 'json',
    config: { apiKey, model },
    timeoutMs: request.timeoutMs,
    meta: { service: 'file-structure-inference', callerName: 'inferFileStructure' },
  });

  const raw = parseInferenceJson(result.content);
  const inference = validateInference(raw, request.targetSchema);

  return { inference, model: result.model, requestId: result.requestId };
}
