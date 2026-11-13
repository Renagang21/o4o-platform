import { Client } from 'pg';
import { compareItem, numbersOf, SAMPLE_SQL, summarize, type SampleItem } from '../otc-translation-sample.service';

const item = (aiEn: string | null): SampleItem => ({
  masterId: '00000000-0000-4000-8000-000000000001', name: 'Fixture', bucket: 'pediatric',
  ko: '<p>성인 1회 2정, 1일 3회 복용합니다. 만 12세 미만은 복용하지 마십시오. 1일 최대 6정.</p>',
  savedEn: '<p>Adults: take 2 tablets 3 times a day. Do not take if under 12 years. Max 6 tablets per day.</p>',
  aiEn,
});

describe('OTC translation sample comparison', () => {
  it('numbers ignore markup, units, trailing zeros and the bare 1 of 1회 · 1일; English number words count', () => {
    expect(numbersOf('<td>2.0 g</td><td>0,5 mL</td><td>1/2정</td><td>1회</td>')).toEqual(['0.5', '1/2', '2']);
    expect(numbersOf('<p>Take two tablets twice a day, half a tablet for children</p>')).toEqual(['1/2', '2', '2']);
  });
  it('a faithful translation is ok', () => {
    expect(compareItem(item('<p>Adults take 2 tablets, 3 times daily. Do not use under age 12. Up to 6 tablets a day.</p>')))
      .toMatchObject({ verdict: 'ok', missingNumbers: [], extraNumbers: [], aiHangulLeft: false });
  });
  it('a dropped dose, a new number, weakened prohibition or leftover Korean needs a check', () => {
    expect(compareItem(item('<p>Adults take 2 tablets daily. Not recommended under 12. Max 6.</p>')))
      .toMatchObject({ verdict: 'check', missingNumbers: ['3'], aiProhibitions: 0 });
    expect(compareItem(item('<p>Take 2 tablets 3 times; do not use under 12; max 8 tablets.</p>')).extraNumbers).toEqual(['8']);
    expect(compareItem(item('<p>Take 2 tablets 3 times. Do not take under 12. Max 6 tablets. 복용</p>')).aiHangulLeft).toBe(true);
  });
  it('markup-only or blank output is a failed translation, not ok', () => {
    const noNumbers: SampleItem = { ...item(null), ko: '<p>상처 부위에 바르십시오.</p>', savedEn: '<p>Apply to the wound.</p>' };
    expect(compareItem({ ...noNumbers, aiEn: '<p></p>' }).verdict).toBe('failed');
    expect(compareItem({ ...noNumbers, aiEn: '   ' }).verdict).toBe('failed');
  });
  it('the source prohibition is checked even when the saved English uses an unlisted phrasing', () => {
    const reversed: SampleItem = { ...item(null), ko: '<p>만 12세 미만은 복용하지 마십시오.</p>', savedEn: '<p>Not for children under 12.</p>',
      aiEn: '<p>Suitable for children under 12.</p>' };
    expect(compareItem(reversed)).toMatchObject({ verdict: 'check', koProhibitions: 1, aiProhibitions: 0, savedProhibitions: 0 });
  });
  it('a missing translation fails and the summary counts it', () => {
    expect(summarize([item(null), item('<p>2 tablets 3 times. Do not use under 12. 6 max.</p>')])).toMatchObject({ total: 2, ok: 1, failed: 1 });
  });
});

// Real canonical schema on an owned loopback cluster only.
const url = process.env.OTC_SAMPLE_TEST_DATABASE_URL;
(url && /^postgres(ql)?:\/\/[^@]+@(127\.0\.0\.1|localhost):/.test(url) ? describe : describe.skip)('OTC sample SQL on the canonical schema', () => {
  it('selects ko/en canonical OTC pairs by bucket and stays read-only', async () => {
    const pg = new Client({ connectionString: url }); await pg.connect();
    try {
      await pg.query('BEGIN');
      const master = async (name: string) => (await pg.query(`INSERT INTO product_masters(barcode,regulatory_type,regulatory_name,name,manufacturer_name)
        VALUES($1,'일반의약품',$2,$2,'Fixture') RETURNING id`, [String(Math.random()).slice(2, 15), name])).rows[0].id;
      const add = (id: string, language: string, content: string, status = 'canonical') => pg.query(`INSERT INTO shared_product_descriptions
        (master_id,content,source_type,description_type,status,language) VALUES($1,$2,'mfds_drug_otc','STORE',$3,$4)`, [id, content, status, language]);
      const kid = await master('Kid'), cream = await master('Cream'), tab = await master('Tab'), only = await master('KoOnly');
      await add(kid, 'ko', '<p>만 12세 미만 복용 금지</p>'); await add(kid, 'en', '<p>under 12</p>');
      await add(cream, 'ko', '<p>환부에 바르십시오</p>'); await add(cream, 'en', '<p>apply</p>');
      await add(tab, 'ko', '<p>1회 1정</p>'); await add(tab, 'en', '<p>1 tablet</p>');
      await add(only, 'ko', '<p>1회 1정</p>'); await add(only, 'en', '<p>draft</p>', 'candidate');
      const rows = (await pg.query(SAMPLE_SQL, ['mfds_drug_otc', 10])).rows;
      expect(rows.map(r => [r.name, r.bucket])).toEqual(expect.arrayContaining([['Kid', 'pediatric'], ['Cream', 'nonoral'], ['Tab', 'general']]));
      expect(rows.find(r => r.name === 'KoOnly')).toBeUndefined();
      expect(rows.find(r => r.name === 'Kid')).toMatchObject({ ko: '<p>만 12세 미만 복용 금지</p>', savedEn: '<p>under 12</p>' });
    } finally { await pg.query('ROLLBACK'); await pg.end(); }
  });
});
