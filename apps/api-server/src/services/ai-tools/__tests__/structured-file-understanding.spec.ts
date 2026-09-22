/**
 * runStructuredFileUnderstanding — 공통 GFU 소비 러너 결정론 테스트
 *
 * WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §3 (원내 Excel = GFU 전면 전환 · D1)
 *
 * 검증 대상: decode(전체) → profile(표본) → infer(주입) → normalize(전체·결정론) → confidence → question.
 *   - infer 를 주입 가짜로 고정해 AI 없이 파이프라인 전체를 결정론적으로 검증한다.
 *   - 러너는 **도메인 어휘를 모른다**: targetSchema 는 호출자가 넘긴 임의 스키마로 동작한다.
 *   - 전체 행 정규화는 Core 가 결정론적으로 수행하고, required 전부 빈 행은 버린다.
 *   - low-confidence 열은 verdict.ok=false + 사용자 QUESTION 을 만든다(전부 다시 묻지 않음).
 */

import { runStructuredFileUnderstanding, type InferStructureFn } from '../structured-file-understanding';
import type { FileStructureInference, StructureProfile, TargetSchema } from '../file-understanding/contract';

// 호출자(surface)가 주입하는 임의 TargetSchema — 러너는 이 필드 어휘를 소유하지 않는다.
const SCHEMA: TargetSchema = {
  id: 'test-generic-list.v1',
  fields: [
    { key: 'product_name', description: '품목의 이름', required: true, examples: ['타이레놀정500mg'] },
    { key: 'ingredient', description: '주성분 이름', required: false, examples: ['아세트아미노펜'] },
    { key: 'strength', description: '함량/규격', required: false, examples: ['500mg'] },
  ],
};

// CSV bytes(헤더 1행 + 데이터 3행). 마지막 행은 매핑 밖 열(비고)에만 값이 있어
// 행 자체는 비지 않지만 required(품명)가 비어 정규화에서 버려진다(소계/구분 행 방어).
const CSV = [
  '품명,성분,함량,비고',
  '타이레놀정500mg,아세트아미노펜,500mg,해열',
  '아모디핀정,암로디핀,5mg,혈압',
  ',,,소계',
].join('\n');
const BYTES = new TextEncoder().encode(CSV);

// 표본 시트명(profile)을 그대로 써서 inference 를 만드는 가짜 infer 팩토리.
function fakeInfer(columnConfidence = 0.9, overall = 0.92): InferStructureFn {
  return async (profile: StructureProfile, _targetSchema: TargetSchema) => {
    const sheetName = profile.sheets[0].sheetName;
    const inference: FileStructureInference = {
      sheets: [
        {
          sheetName,
          regions: [
            {
              startRow: 0,
              headerRow: 0,
              dataStartRow: 1,
              columns: [
                { sourceColumn: 0, targetField: 'product_name', confidence: 0.95 },
                { sourceColumn: 1, targetField: 'ingredient', confidence: columnConfidence },
                { sourceColumn: 2, targetField: 'strength', confidence: 0.9 },
              ],
              confidence: 0.9,
            },
          ],
          unmappedColumns: [],
        },
      ],
      confidence: overall,
      warnings: [],
    };
    return { inference, model: 'fake-model-v1' };
  };
}

describe('runStructuredFileUnderstanding · 파이프라인 (§3 · D1)', () => {
  it('decode→profile→infer→normalize→confidence: 전체 행을 정규화하고 빈 행은 버린다', async () => {
    const result = await runStructuredFileUnderstanding(BYTES, SCHEMA, { infer: fakeInfer() });

    // 데이터 3행 시도 · required(product_name) 빈 마지막 행 1건 skip → 레코드 2건
    expect(result.totalRows).toBe(3);
    expect(result.skipped).toBe(1);
    expect(result.records.map((r) => r.fields.product_name)).toEqual(['타이레놀정500mg', '아모디핀정']);
    expect(result.records[0].fields).toEqual({
      product_name: '타이레놀정500mg',
      ingredient: '아세트아미노펜',
      strength: '500mg',
    });
    expect(result.model).toBe('fake-model-v1');

    // 전부 임계값 이상 · required 충족 → 질문 없음
    expect(result.verdict.ok).toBe(true);
    expect(result.verdict.missingRequired).toEqual([]);
    expect(result.question).toBeNull();
  });

  it('열 신뢰도가 임계값 미만이면 verdict.ok=false + 낮은 항목만 묻는 QUESTION', async () => {
    const result = await runStructuredFileUnderstanding(BYTES, SCHEMA, { infer: fakeInfer(0.3) });

    // 레코드 정규화 자체는 신뢰도와 무관하게 그대로 수행된다
    expect(result.records.length).toBe(2);
    expect(result.verdict.ok).toBe(false);
    expect(result.verdict.lowConfidenceColumns.map((c) => c.targetField)).toEqual(['ingredient']);
    // 질문은 낮은 항목(주성분 이름)만 언급하고 required 는 채워졌으므로 언급하지 않는다
    expect(result.question).not.toBeNull();
    expect(result.question).toContain('주성분 이름');
    expect(result.question).not.toContain('품목의 이름');
  });

  it('targetSchema 는 호출자 주입값이 그대로 infer 로 전달된다(도메인 중립)', async () => {
    let seen: TargetSchema | null = null;
    const capturing: InferStructureFn = async (profile, targetSchema) => {
      seen = targetSchema;
      return fakeInfer()(profile, targetSchema);
    };
    await runStructuredFileUnderstanding(BYTES, SCHEMA, { infer: capturing });
    expect(seen).toBe(SCHEMA);
  });
});
