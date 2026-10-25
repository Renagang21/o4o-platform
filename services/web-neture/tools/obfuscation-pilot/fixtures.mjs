// Synthetic data only; no account, token, API or storage access.
export const validDraft = {
  name: '시험 제품',
  barcode: 'TEST-CODE',
  regulatoryType: 'HEALTH_FUNCTIONAL',
  offerDraft: { priceGeneral: 1500, consumerDetailDescription: '첫 줄\n둘째 줄', isFeatured: false },
};

export const parserInputs = [
  '', '   ', 'invalid json', '{}', 'null', '[1,2]', '"text"',
  JSON.stringify(validDraft),
  '```json\n' + JSON.stringify(validDraft) + '\n```',
  '설명\n' + JSON.stringify(validDraft) + '\n끝',
  JSON.stringify({ ...validDraft, supplierId: 'synthetic', masterId: 'synthetic', serviceKeys: ['synthetic'], stock: 10 }),
  JSON.stringify({ ...validDraft, name: 'X'.repeat(250), offerDraft: { priceGeneral: -1 } }),
  JSON.stringify({ ...validDraft, imageUrl: 'https://example.invalid/image.png', contentImageUrls: ['synthetic'] }),
  JSON.stringify({ ...validDraft, regulatoryType: 'UNKNOWN', unknownField: 'ignored' }),
];

export const loginInputs = [
  [null, ''],
  [undefined, '?returnTo=%2Fstore%3Fview%3Dguide'],
  [{ from: '/supplier/products' }, '?returnTo=/ignored'],
  [null, '?returnUrl=/community'],
  [null, '?redirect=/funding'],
  [null, '?returnTo=//example.invalid&returnUrl=/safe'],
  [{ from: '/\\example.invalid' }, '?returnTo=/safe'],
  [{ from: '' }, '?returnTo=/safe'],
  [{ from: 7 }, '?returnTo=/safe'],
];
