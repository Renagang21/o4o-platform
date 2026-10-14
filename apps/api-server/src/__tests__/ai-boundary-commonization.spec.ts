/** Existing response/schema contracts shared after whole-platform consumer review. No live provider or database. */
import { validateInjectedTargetSchema } from '../services/ai-tools/file-understanding/target-schema-validation.js';
import { parseBlogResponse } from '../services/ai-prompts/blog.js';
import { parseFlexibleResponse } from '../services/ai-prompts/flexible.js';
import { parseProductDetailResponse } from '../services/ai-prompts/productDetail.js';
import { parseStoreQrResponse } from '../services/ai-prompts/storeQr.js';
import { parseStoreSnsResponse } from '../services/ai-prompts/storeSns.js';
import { normalizeAiResponse } from '../services/ai-prompts/common.js';

const field = {
  key: 'item_key',
  description: 'Synthetic field',
  required: true,
};
const schema = { id: 'synthetic', fields: [field] };
it.each([
  [undefined, 'TARGET_SCHEMA_REQUIRED'],
  [false, 'TARGET_SCHEMA_REQUIRED'],
  [{ fields: [field] }, 'TARGET_SCHEMA_ID_INVALID'],
  [{ id: '  ', fields: [field] }, 'TARGET_SCHEMA_ID_INVALID'],
  [{ id: 'synthetic', fields: [] }, 'TARGET_SCHEMA_FIELDS_INVALID'],
  [{ id: 'synthetic', fields: {} }, 'TARGET_SCHEMA_FIELDS_INVALID'],
  [{ id: 'synthetic', fields: [null] }, 'TARGET_SCHEMA_FIELD_INVALID'],
  [
    { id: 'synthetic', fields: [{ ...field, key: '' }] },
    'TARGET_SCHEMA_FIELD_KEY_INVALID',
  ],
  [
    { id: 'synthetic', fields: [{ ...field, description: ' ' }] },
    'TARGET_SCHEMA_FIELD_DESC_INVALID',
  ],
  [
    { id: 'synthetic', fields: [{ ...field, required: 1 }] },
    'TARGET_SCHEMA_FIELD_REQUIRED_INVALID',
  ],
  [
    { id: 'synthetic', fields: [{ ...field, required: false }] },
    'TARGET_SCHEMA_NO_REQUIRED',
  ],
])('retains the schema error for %j', (input, code) => {
  expect(validateInjectedTargetSchema(input)).toEqual({ schema: null, code });
});
it('validates whitespace without rewriting descriptor values and filters examples by the existing type policy', () => {
  expect(
    validateInjectedTargetSchema({
      id: ' synthetic ',
      fields: [
        {
          ...field,
          key: ' key ',
          description: ' description ',
          examples: ['first', 1, ''],
        },
      ],
    }),
  ).toEqual({
    schema: {
      id: ' synthetic ',
      fields: [
        {
          key: ' key ',
          description: ' description ',
          required: true,
          examples: ['first', ''],
        },
      ],
    },
    code: null,
  });
  expect(validateInjectedTargetSchema(schema)).toEqual({
    schema: { id: 'synthetic', fields: [{ ...field, examples: undefined }] },
    code: null,
  });
});
const raw = 'alpha\nbeta\n\ngamma';
const fallback = '<p>alpha<br>beta</p><p>gamma</p>';
const base = {
  html: fallback,
  title: '',
  summary: '',
  bullets: [],
  shortText: '',
  longText: '',
};
describe.each([
  ['blog', parseBlogResponse],
  ['flexible', parseFlexibleResponse],
  ['product-detail', parseProductDetailResponse],
] as const)('%s parsing retains the plain content contract', (_name, parse) => {
  it('retains fallback and exactly the six public response fields', () => {
    expect(parse({}, raw)).toEqual(base);
    expect(Object.keys(parse({}, raw))).toEqual([
      'html',
      'title',
      'summary',
      'bullets',
      'shortText',
      'longText',
    ]);
  });
  it('retains validated fields while leaving short/long values to the specific output contract', () => {
    expect(
      parse(
        {
          html: '<p>Provided</p>',
          title: 'Title',
          summary: 'Summary',
          bullets: ['One'],
          shortText: 'Ignored short',
          longText: 'Ignored long',
          type: 'Ignored type',
        },
        raw,
      ),
    ).toEqual({
      html: '<p>Provided</p>',
      title: 'Title',
      summary: 'Summary',
      bullets: ['One'],
      shortText: '',
      longText: '',
    });
  });
  it('preserves legacy truthiness/type behavior without adding coercion', () => {
    expect(
      parse({ html: 0, title: 1, summary: false, bullets: 'invalid' }, raw),
    ).toEqual(base);
  });
});
describe.each([
  ['QR', parseStoreQrResponse],
  ['SNS', parseStoreSnsResponse],
] as const)('%s keeps its short/long response contract', (_name, parse) => {
  it('uses the complete HTML before synthesizing the short/long fallback', () => {
    expect(
      parse(
        {
          html: '<p>Provided</p>',
          title: 'Title',
          summary: 'Summary',
          bullets: ['One'],
          shortText: 'Brief',
          longText: 'Detail',
        },
        raw,
      ),
    ).toEqual({
      html: '<p>Provided</p>',
      title: 'Title',
      summary: 'Summary',
      bullets: ['One'],
      shortText: 'Brief',
      longText: 'Detail',
    });
  });
  it('keeps the exact ordered fallback and has no output type field', () => {
    expect(
      parse({ title: 'Title', shortText: 'Brief', longText: 'Detail' }, raw),
    ).toEqual({
      html: '<p><strong>Title</strong></p><p>Brief</p><p>Detail</p>',
      title: 'Title',
      summary: '',
      bullets: [],
      shortText: 'Brief',
      longText: 'Detail',
    });
    expect(parse({}, raw)).toEqual(base);
  });
});
it('keeps generic normalization distinct from the output-specific short/long policies', () => {
  expect(
    normalizeAiResponse(
      { shortText: 'Brief', longText: 'Detail' },
      raw,
      'output-type',
    ),
  ).toEqual({
    ...base,
    shortText: 'Brief',
    longText: 'Detail',
    type: 'output-type',
  });
});
