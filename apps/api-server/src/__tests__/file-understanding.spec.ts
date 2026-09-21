/**
 * Generic File Understanding — 공통 Core capability 테스트 (WO §15-H)
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-GENERIC-FILE-UNDERSTANDING-V1
 *
 * 도메인 중립 fixture 만 사용한다. hospital-drug 실제 파일·특화 어휘를 쓰지 않는다.
 * Gemini 실호출(structure-inference.service)은 사용자 키로 별도 smoke — 여기서 호출하지 않는다.
 * 여기서는 계약 검증(validateInference)까지 포함해 순수 엔진 A/D/E/F/G 를 검증한다.
 */

import * as XLSX from 'xlsx';

import { decodeWorkbook } from '../services/ai-tools/file-understanding/decode.js';
import { profileWorkbook } from '../services/ai-tools/file-understanding/profile.js';
import { computeStructureFingerprint } from '../services/ai-tools/file-understanding/fingerprint.js';
import {
  evaluateConfidence,
  normalizeRows,
} from '../services/ai-tools/file-understanding/normalize.js';
import {
  parseInferenceJson,
  validateInference,
  type FileStructureInference,
  type TargetSchema,
} from '../services/ai-tools/file-understanding/contract.js';
import type { DecodedWorkbook } from '../services/ai-tools/file-understanding/decode.js';

// ── 도메인 중립 target schema (surface 가 주입하는 형태를 흉내낸 generic descriptor) ──
const SCHEMA: TargetSchema = {
  id: 'generic-catalog-v1',
  fields: [
    { key: 'code', description: '항목 코드', required: true, examples: ['A-001'] },
    { key: 'label', description: '항목 이름', required: true },
    { key: 'quantity', description: '수량(정수)', required: false, examples: ['10'] },
  ],
};

// 2-구역(sectionLabel) 레이아웃: 구역 제목 / 헤더 / 데이터 3자가 서로 다른 행.
function buildSectionMatrix(): string[][] {
  return [
    ['분류 A', '', ''], // row 0 — 구역 제목
    ['코드', '이름', '수량'], // row 1 — 헤더
    ['A-001', '알파', '10'], // row 2 — 데이터
    ['A-002', '베타', '20'], // row 3 — 데이터
    ['분류 B', '', ''], // row 4 — 구역 제목
    ['코드', '이름', '수량'], // row 5 — 헤더
    ['B-001', '감마', '5'], // row 6 — 데이터
    ['', '', ''], // row 7 — 빈 줄(required 없음 → skip)
  ];
}

function decodedFromMatrix(matrix: string[][], sheetName = 'Sheet1'): DecodedWorkbook {
  return { sourceFormat: 'xlsx', sheets: [{ sheetName, matrix }] };
}

function twoSectionInference(): FileStructureInference {
  return {
    confidence: 0.9,
    warnings: [],
    sheets: [
      {
        sheetName: 'Sheet1',
        unmappedColumns: [],
        regions: [
          {
            startRow: 0,
            endRow: 3,
            headerRow: 1,
            dataStartRow: 2,
            sectionLabel: '분류 A',
            confidence: 0.9,
            columns: [
              { sourceColumn: 0, sourceLabel: '코드', targetField: 'code', confidence: 0.95 },
              { sourceColumn: 1, sourceLabel: '이름', targetField: 'label', confidence: 0.9 },
              { sourceColumn: 2, sourceLabel: '수량', targetField: 'quantity', confidence: 0.85 },
            ],
          },
          {
            startRow: 4,
            endRow: 7,
            headerRow: 5,
            dataStartRow: 6,
            sectionLabel: '분류 B',
            confidence: 0.88,
            columns: [
              { sourceColumn: 0, sourceLabel: '코드', targetField: 'code', confidence: 0.95 },
              { sourceColumn: 1, sourceLabel: '이름', targetField: 'label', confidence: 0.9 },
              { sourceColumn: 2, sourceLabel: '수량', targetField: 'quantity', confidence: 0.85 },
            ],
          },
        ],
      },
    ],
  };
}

describe('decodeWorkbook (디코드 계층)', () => {
  it('BOM 없는 UTF-8 CSV 의 한글을 깨지지 않게 디코드한다', () => {
    const csv = '코드,이름,수량\nA-001,알파,10\n';
    const bytes = new TextEncoder().encode(csv);
    const decoded = decodeWorkbook(bytes);
    expect(decoded.sourceFormat).toBe('csv');
    expect(decoded.sheets[0].matrix[0]).toEqual(['코드', '이름', '수량']);
    expect(decoded.sheets[0].matrix[1]).toEqual(['A-001', '알파', '10']);
  });

  it('xlsx(PK) 바이너리를 magic-byte 로 판정한다', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['코드', '이름'],
      ['A-001', '알파'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const decoded = decodeWorkbook(bytes);
    expect(decoded.sourceFormat).toBe('xlsx');
    expect(decoded.sheets[0].matrix[0]).toEqual(['코드', '이름']);
  });
});

describe('profileWorkbook (계약 A)', () => {
  it('열 통계와 상단 표본만 산출한다', () => {
    const decoded = decodedFromMatrix(buildSectionMatrix());
    const profile = profileWorkbook(decoded, { sampleRows: 4 });
    const sheet = profile.sheets[0];
    expect(sheet.columnCount).toBe(3);
    expect(sheet.sampleRows).toHaveLength(4);
    // 코드 열(0): 전부 텍스트 → numericRatio 0
    expect(sheet.columnStats[0].numericRatio).toBe(0);
    // 수량 열(2): 값 있는 셀 중 숫자 비율 > 0
    expect(sheet.columnStats[2].numericRatio).toBeGreaterThan(0);
  });
});

describe('computeStructureFingerprint (계약 G)', () => {
  it('구조가 같으면 값이 달라도 같은 fingerprint 를 낸다', () => {
    const a = profileWorkbook(decodedFromMatrix(buildSectionMatrix()));
    const changed = buildSectionMatrix();
    changed[2][1] = '전혀-다른-값'; // 텍스트 shape 유지 → 지문 불변
    const b = profileWorkbook(decodedFromMatrix(changed));
    expect(computeStructureFingerprint(a)).toBe(computeStructureFingerprint(b));
  });

  it('열 개수가 다르면 fingerprint 가 달라진다', () => {
    const a = profileWorkbook(decodedFromMatrix(buildSectionMatrix()));
    const wider = buildSectionMatrix().map((row) => [...row, 'extra']);
    const b = profileWorkbook(decodedFromMatrix(wider));
    expect(computeStructureFingerprint(a)).not.toBe(computeStructureFingerprint(b));
  });
});

describe('normalizeRows (계약 F)', () => {
  it('dataStartRow 를 존중하고 sectionLabel 을 붙이며 빈 행을 건너뛴다', () => {
    const decoded = decodedFromMatrix(buildSectionMatrix());
    const result = normalizeRows(decoded, twoSectionInference(), SCHEMA);
    expect(result.records).toHaveLength(3); // A-001, A-002, B-001
    expect(result.skipped).toBe(1); // row 7 빈 줄
    expect(result.records[0]).toMatchObject({
      fields: { code: 'A-001', label: '알파', quantity: '10' },
      sectionLabel: '분류 A',
      sourceRow: 2,
    });
    expect(result.records[2]).toMatchObject({
      fields: { code: 'B-001' },
      sectionLabel: '분류 B',
    });
  });
});

describe('evaluateConfidence (계약 E)', () => {
  it('전부 임계값 이상이면 ok=true', () => {
    const verdict = evaluateConfidence(twoSectionInference(), SCHEMA, 0.6);
    expect(verdict.ok).toBe(true);
    expect(verdict.missingRequired).toHaveLength(0);
    expect(verdict.lowConfidenceColumns).toHaveLength(0);
  });

  it('낮은 열만 QUESTION 대상으로 골라낸다', () => {
    const inf = twoSectionInference();
    inf.sheets[0].regions[0].columns[1].confidence = 0.3; // label 열만 낮춤
    const verdict = evaluateConfidence(inf, SCHEMA, 0.6);
    expect(verdict.ok).toBe(false);
    expect(verdict.lowConfidenceColumns).toHaveLength(1);
    expect(verdict.lowConfidenceColumns[0].targetField).toBe('label');
  });

  it('required 필드가 매핑되지 않으면 missingRequired 로 보고한다', () => {
    const inf = twoSectionInference();
    // 모든 구역에서 code 매핑 제거
    for (const region of inf.sheets[0].regions) {
      region.columns = region.columns.filter((c) => c.targetField !== 'code');
    }
    const verdict = evaluateConfidence(inf, SCHEMA, 0.6);
    expect(verdict.missingRequired).toContain('code');
    expect(verdict.ok).toBe(false);
  });
});

describe('validateInference (계약 B/C 런타임 강제)', () => {
  it('schema 밖 targetField 를 unmappedColumns 로 강등한다', () => {
    const raw = {
      confidence: 0.8,
      sheets: [
        {
          sheetName: 'Sheet1',
          regions: [
            {
              startRow: 0,
              headerRow: 0,
              dataStartRow: 1,
              confidence: 0.8,
              columns: [
                { sourceColumn: 0, targetField: 'code', confidence: 0.9 },
                { sourceColumn: 3, sourceLabel: '공급사', targetField: 'vendor_code', confidence: 0.7 },
              ],
            },
          ],
          unmappedColumns: [],
        },
      ],
    };
    const inf = validateInference(raw, SCHEMA);
    const cols = inf.sheets[0].regions[0].columns;
    expect(cols.map((c) => c.targetField)).toEqual(['code']);
    expect(inf.sheets[0].unmappedColumns).toHaveLength(1);
    expect(inf.sheets[0].unmappedColumns[0]).toMatchObject({
      sourceColumn: 3,
      reason: 'unknown_target_field',
    });
  });

  it('dataStartRow 누락 시 headerRow+1 로 보정하고 confidence 를 clamp 한다', () => {
    const raw = {
      confidence: 2, // clamp → 1
      sheets: [
        {
          sheetName: 'Sheet1',
          regions: [
            { startRow: 0, headerRow: 2, columns: [{ sourceColumn: 0, targetField: 'code', confidence: -1 }] },
          ],
        },
      ],
    };
    const inf = validateInference(raw, SCHEMA);
    expect(inf.confidence).toBe(1);
    expect(inf.sheets[0].regions[0].dataStartRow).toBe(3);
    expect(inf.sheets[0].regions[0].columns[0].confidence).toBe(0);
  });
});

describe('parseInferenceJson', () => {
  it('코드펜스로 감싼 JSON 도 파싱한다', () => {
    const wrapped = '```json\n{"confidence":0.5,"sheets":[]}\n```';
    expect(parseInferenceJson(wrapped)).toEqual({ confidence: 0.5, sheets: [] });
  });
});
