import { PHARMACY_FORMAT, parsePharmacyBundle, validatePharmacyBundle, type PharmacyBundle, type PharmacyEntry } from './order';

const ARCHIVE_FORMAT = 'o4o-pharmacy-work-archive-v1';
export const PHARMACY_ARCHIVE_BYTES = 64 * 1024 * 1024;
const PART_BYTES = 850 * 1024, PART_ROWS = 1000, MAX_PARTS = 128;
const encoder = new TextEncoder();
const key = (entry: PharmacyEntry) => entry.kind + ':' + entry.data.id;
const bytes = (value: unknown) => encoder.encode(JSON.stringify(value)).byteLength;

/** Each part is independently valid and fits one existing authenticated PC command. */
export function pharmacyTransferParts(bundle: PharmacyBundle): PharmacyBundle[] {
  const valid = validatePharmacyBundle(bundle, { batch: false });
  const index = new Map(valid.records.map(entry => [key(entry), entry]));
  const sizes = new Map(valid.records.map(entry => [key(entry), bytes(entry) + 1]));
  const parts: PharmacyBundle[] = [];
  let current = new Map<string, PharmacyEntry>(), size = 100;
  function flush() {
    if (!current.size) return;
    parts.push({ format: PHARMACY_FORMAT, records: [...current.values()] });
    if (parts.length > MAX_PARTS) throw new Error('자료가 커요. 조회 범위를 나누어 보관해 주세요.');
    current = new Map(); size = 100;
  }
  function closure(entry: PharmacyEntry, rows: Map<string, PharmacyEntry>) {
    if (rows.has(key(entry))) return;
    rows.set(key(entry), entry);
    const data = entry.data as unknown as Record<string, unknown>;
    const references = [data, ...(entry.kind === 'sheet' ? entry.data.lines : [])] as Record<string, unknown>[];
    for (const row of references) for (const kind of ['product', 'pack', 'supplier']) {
      const id = row[kind + '_id'];
      if (typeof id === 'string') closure(index.get(kind + ':' + id)!, rows);
    }
  }
  for (const entry of valid.records) {
    const related = new Map<string, PharmacyEntry>(); closure(entry, related);
    let missing = [...related].filter(([id]) => !current.has(id));
    let added = missing.reduce((sum, [id]) => sum + sizes.get(id)!, 0);
    if (current.size + missing.length > PART_ROWS || size + added > PART_BYTES) {
      flush(); missing = [...related]; added = missing.reduce((sum, [id]) => sum + sizes.get(id)!, 0);
    }
    if (missing.length > PART_ROWS || added + 100 > PART_BYTES) throw new Error('연결 자료가 커요. 주문 시트의 범위를 나누어 주세요.');
    for (const [id, row] of missing) current.set(id, row);
    size += added;
  }
  flush();
  return parts.length ? parts : [{ format: PHARMACY_FORMAT, records: [] }];
}

/** One download; large workspaces contain bounded, self-contained transfer parts. */
export function pharmacyExportFile(bundle: PharmacyBundle): unknown {
  const parts = pharmacyTransferParts(bundle);
  const value = parts.length === 1 ? parts[0] : { format: ARCHIVE_FORMAT, parts };
  if (bytes(value) > PHARMACY_ARCHIVE_BYTES) throw new Error('자료가 커요. 조회 범위를 나누어 보관해 주세요.');
  return value;
}

export function parsePharmacyFile(text: string): PharmacyBundle {
  if (encoder.encode(text).byteLength > PHARMACY_ARCHIVE_BYTES) throw new Error('자료 파일은 64MB 이내로 준비해 주세요.');
  const value = JSON.parse(text);
  if (value?.format !== ARCHIVE_FORMAT) return parsePharmacyBundle(text);
  if (Object.keys(value).some(k => !['format', 'parts'].includes(k)) || !Array.isArray(value.parts) || !value.parts.length || value.parts.length > MAX_PARTS) throw new Error('자료 묶음 형식을 확인해 주세요.');
  const rows = new Map<string, PharmacyEntry>();
  for (const part of value.parts) {
    if (bytes(part) > PART_BYTES || part?.records?.length > PART_ROWS) throw new Error('자료 묶음의 크기를 확인해 주세요.');
    const valid = validatePharmacyBundle(part);
    for (const entry of valid.records) {
      const previous = rows.get(key(entry));
      if (previous && JSON.stringify(previous) !== JSON.stringify(entry)) throw new Error('자료 묶음의 중복 내용이 달라요. 원본 파일을 확인해 주세요.');
      rows.set(key(entry), entry);
    }
  }
  return validatePharmacyBundle({ format: PHARMACY_FORMAT, records: [...rows.values()] }, { batch: false });
}
