/**
 * 원내 약품 Local Dataset — 브라우저 파싱·정규화·저장·조회 단위 테스트
 *
 * WO-O4O-HOSPITAL-DRUG-BROWSER-LOCAL-DATA-CONNECT-V1
 *
 * 실행: 저장소 루트에서
 *   npx vitest run --config services/web-neture/vitest.config.mjs
 *
 * 원내 파일이 서버로 가지 않고 브라우저에서 완결됨을 세운다: CSV/XLSX 를 SheetJS 로 파싱해
 * 표준 필드로 정규화하고, localStorage 에 담고, contains 매칭으로 조회한다.
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  clearLocalDataset,
  loadLocalDataset,
  makeDataset,
  matchLocalByResearchIngredients,
  parseDrugFile,
  queryLocalRows,
  renderLocalContextBlock,
  saveLocalDataset,
  type LocalDrugRow,
} from '../localDataset';

afterEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* ignore */
  }
});

function csvFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('parseDrugFile — 브라우저 파싱·정규화', () => {
  it('한글 헤더(제품명·성분·함량·제형·제조사)를 표준 필드로 정규화한다', async () => {
    const csv = ['제품명,성분,함량,제형,제조사', '타이레놀정,아세트아미노펜,500mg,정제,한국얀센', '아목시실린캡슐,아목시실린,250mg,캡슐,종근당'].join(
      '\n',
    );
    const out = await parseDrugFile(csvFile('원내약품.csv', csv));
    expect(out.missingNameColumn).toBe(false);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0]).toEqual({
      product_name: '타이레놀정',
      ingredient: '아세트아미노펜',
      strength: '500mg',
      dosage_form: '정제',
      manufacturer: '한국얀센',
    });
  });

  it('영문 헤더 별칭(name·ingredient·strength)도 인식한다', async () => {
    const csv = ['name,ingredient,strength', 'Tylenol,Acetaminophen,500mg'].join('\n');
    const out = await parseDrugFile(csvFile('drugs.csv', csv));
    expect(out.rows[0].product_name).toBe('Tylenol');
    expect(out.rows[0].ingredient).toBe('Acetaminophen');
  });

  it('제품명 열이 없으면 missingNameColumn 으로 알린다(연결 거부)', async () => {
    const csv = ['성분,함량', '아세트아미노펜,500mg'].join('\n');
    const out = await parseDrugFile(csvFile('bad.csv', csv));
    expect(out.missingNameColumn).toBe(true);
    expect(out.rows).toHaveLength(0);
  });

  it('제품명이 빈 행은 건너뛴다(skipped 집계)', async () => {
    const csv = ['제품명,성분', '타이레놀정,아세트아미노펜', ',성분만있음', '아목시실린,아목시실린'].join('\n');
    const out = await parseDrugFile(csvFile('gaps.csv', csv));
    expect(out.rows).toHaveLength(2);
    expect(out.skipped).toBe(1);
  });
});

describe('localStorage 저장·복원', () => {
  it('저장한 데이터셋을 그대로 복원한다(새로고침 후 유지)', () => {
    const rows: LocalDrugRow[] = [{ product_name: '타이레놀정', ingredient: '아세트아미노펜', strength: '500mg' }];
    const ds = makeDataset('원내약품.xlsx', rows);
    expect(saveLocalDataset(ds)).toEqual({ ok: true });

    const restored = loadLocalDataset();
    expect(restored?.count).toBe(1);
    expect(restored?.fileName).toBe('원내약품.xlsx');
    expect(restored?.rows[0].product_name).toBe('타이레놀정');
  });

  it('해제하면 복원값이 없다', () => {
    saveLocalDataset(makeDataset('x.csv', [{ product_name: 'A' }]));
    clearLocalDataset();
    expect(loadLocalDataset()).toBeNull();
  });

  it('손상·구버전 값은 null 로 무시한다', () => {
    localStorage.setItem('neture:hospital-drug:local-dataset:v1', '{ not json');
    expect(loadLocalDataset()).toBeNull();
    localStorage.setItem('neture:hospital-drug:local-dataset:v1', JSON.stringify({ v: 99, rows: [] }));
    expect(loadLocalDataset()).toBeNull();
  });
});

describe('queryLocalRows — contains 매칭', () => {
  const rows: LocalDrugRow[] = [
    { product_name: '타이레놀정500mg', ingredient: '아세트아미노펜', strength: '500mg' },
    { product_name: '아목시실린캡슐250mg', ingredient: '아목시실린', strength: '250mg' },
  ];

  it('제품명 부분일치로 찾는다', () => {
    expect(queryLocalRows(rows, ['타이레놀'])).toHaveLength(1);
  });

  it('성분명으로도 찾는다', () => {
    const found = queryLocalRows(rows, ['아세트아미노펜']);
    expect(found[0].product_name).toBe('타이레놀정500mg');
  });

  it('2글자 미만·매칭 없음은 빈 배열', () => {
    expect(queryLocalRows(rows, ['x'])).toHaveLength(0);
    expect(queryLocalRows(rows, ['존재하지않는약'])).toHaveLength(0);
  });
});

describe('matchLocalByResearchIngredients — 동일성분 결합', () => {
  const rows: LocalDrugRow[] = [
    { product_name: '타이레놀정', ingredient: '아세트아미노펜' },
    { product_name: '세토펜정', ingredient: '아세트아미노펜' },
    { product_name: '아목시실린캡슐', ingredient: '아목시실린' },
  ];

  it('research 본문에 등장한 성분과 같은 성분의 원내 행을 모은다', () => {
    const research = '타이레놀정의 주성분은 아세트아미노펜이며 해열·진통에 쓰입니다.';
    const found = matchLocalByResearchIngredients(rows, research);
    expect(found.map((r) => r.product_name).sort()).toEqual(['세토펜정', '타이레놀정']);
  });

  it('본문에 성분이 없으면 빈 배열', () => {
    expect(matchLocalByResearchIngredients(rows, '관련 정보가 없습니다.')).toHaveLength(0);
  });
});

describe('renderLocalContextBlock — 서버 renderLocalBlock 과 같은 형식', () => {
  it('매칭 결과를 건수·행으로 렌더한다', () => {
    const block = renderLocalContextBlock([{ product_name: '타이레놀정', ingredient: '아세트아미노펜', strength: '500mg' }], null);
    expect(block).toContain('[원내 약품] 1건 확인');
    expect(block).toContain('타이레놀정');
    expect(block).toContain('성분 아세트아미노펜');
  });

  it('매칭이 없으면 「찾지 못했습니다」', () => {
    expect(renderLocalContextBlock([], null)).toContain('찾지 못했습니다');
  });
});
