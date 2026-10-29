/** Domain operations on existing Dataset storage. CLI and authenticated Main-to-PC commands share these operations. */
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { LocalPharmacyWorkspaceRepository, LocalPharmacySyncRepository, LocalMappingRepository, parseCsv, mapImportRows } from './local-db.mjs';
import { PHARMACY_FORMAT, PHARMACY_KINDS, PHARMACY_LIMITS, validatePharmacyBundle, validatePharmacyRecord, packTotal, sheetReceipts } from './pharmacy-order-contract.mjs';
const key = r => `${r.kind}:${r.data.id}`;
function scope(owner) {
  // Explicit owner selection on a locally trusted CLI; NOT an authentication or authorization token.
  if (typeof owner !== 'string' || !/^(user|organization):[A-Za-z0-9_-]{1,100}$/.test(owner)) throw Error('--owner user:<id> 또는 organization:<id>를 명시하세요.');
  return 'pharmacy_' + createHash('sha256').update(owner).digest('hex').slice(0, 48);
}
function merge(a, b) { return [...new Map([...a, ...b].map(r => [key(r), r])).values()]; }
function effective(state) { return validatePharmacyBundle({ format: PHARMACY_FORMAT, records: merge(state.imported, state.user) }, { batch: false }); }
function validateState(state) {
  // Original program copies remain separate from user-owned corrections. Re-import cannot erase corrections.
  const bundle = effective(state);
  // Byte/row limits apply to transfers, never the accumulated workspace.
  return bundle;
}
export function readPharmacyWorkspace(owner) {
  const state = LocalPharmacyWorkspaceRepository.read(scope(owner));
  return { revision: state.revision, bundle: effective(state), importedCount: state.imported.length, userCount: state.user.length };
}
export function importPharmacyRecords(owner, input, expectedRevision, mode = 'program') {
  if (!['program', 'user', 'restore'].includes(mode)) throw Error('가져오기 구분을 확인하세요.');
  // Validate each row first; references may point to records already present locally.
  if (input?.format !== PHARMACY_FORMAT || !Array.isArray(input.records) || input.records.length > PHARMACY_LIMITS.records || Object.keys(input).some(k => !['format', 'records'].includes(k))) throw Error('약국 업무 자료 형식을 확인하세요.');
  const incoming = input.records.map(r => ({ ...r, data: validatePharmacyRecord(r.kind, r.data) }));
  const state = LocalPharmacyWorkspaceRepository.update(scope(owner), expectedRevision, latest => {
    const next = { imported: latest.imported, user: latest.user };
    const imported=mode==='program'?incoming:mode==='restore'?incoming.filter(r=>r.origin):[];
    const user=mode==='user'?incoming:mode==='restore'?incoming.filter(r=>!r.origin):[];
    if (incoming.some(r => r.kind === 'availability' && r.data.source !== 'user_observed')) throw Error('검증된 Adapter 결과 자동 수집은 아직 연결되지 않았습니다. 직접 관찰 결과만 기록하세요.');
    if (mode === 'program' && incoming.some(r => !r.origin)) throw Error('프로그램 자료에는 원본 키·수집 시점이 필요합니다.');
    if (user.some(r => ['purchase', 'usage', 'sale', 'balance'].includes(r.kind))) throw Error('구매·사용량·판매·거래장 내역은 약국 프로그램 자료로 가져오세요.');
    const ids = new Set();
    for (const r of incoming) { if (ids.has(key(r))) throw Error('중복 행 식별자입니다.'); ids.add(key(r)); }
    // Reject source-key rebinding and older snapshots rather than silently duplicating/rewinding program records.
    const sourceKey = r => JSON.stringify([r.kind, r.origin?.program, r.origin?.source_key]);
    const originalsById = new Map(latest.imported.map(r => [key(r), r]));
    const originalsBySource = new Map(latest.imported.map(r => [sourceKey(r), r]));
    for (const r of imported) {
      const old = originalsById.get(key(r));
      const sameSource = originalsBySource.get(sourceKey(r));
      if (sameSource && key(sameSource) !== key(r)) throw Error('원본 행 키의 로컬 id가 바뀌었습니다. Mapping을 확인하세요.');
      if (old && (old.origin?.program !== r.origin?.program || old.origin?.source_key !== r.origin?.source_key || Date.parse(r.origin?.collected_at) < Date.parse(old.origin?.collected_at))) throw Error('원본 연결 변경 또는 과거 수집 자료입니다.');
    }
    for (const r of user) {
      const old = latest.user.find(v => key(v) === key(r));
      if (r.kind === 'sheet' && old) for (const receipt of sheetReceipts(old.data)) {
        const nextReceipt = sheetReceipts(r.data).find(v => v.supplier_id === receipt.supplier_id);
        const oldLines = old.data.lines.filter(l => l.supplier_id === receipt.supplier_id);
        const newLines = r.data.lines.filter(l => l.supplier_id === receipt.supplier_id);
        if (!isDeepStrictEqual(receipt, nextReceipt) || !isDeepStrictEqual(oldLines, newLines)) throw Error('접수 확인 시트의 거래처 증거·주문 행은 수정하지 않습니다. 새 시트를 작성하세요.');
      }
      if (r.kind === 'sheet' && old?.data.status === 'receipt_recorded' && !isDeepStrictEqual(old.data, r.data)) throw Error('접수 확인 시트는 수정하지 않습니다. 새 시트를 작성하세요.');
    }
    const currentPacks = new Map(effective(latest).records.filter(r => r.kind === 'pack').map(r => [r.data.id, r.data]));
    for (const r of incoming) if (r.kind === 'pack') {
      const previous = currentPacks.get(r.data.id);
      // Existing purchases refer to this identity. Changing its measure would rewrite historical quantities.
      if (previous && ['product_id', 'base_unit', 'units_per_pack'].some(field => previous[field] !== r.data[field])) throw Error('기존 포장의 상품·환산 기준은 바꾸지 않습니다. 새 포장 식별자로 구분하세요.');
    }
    next.imported = merge(next.imported, imported);
    next.user = merge(next.user, user);
    // Validate source lane even when a user override masks an imported row.
    validatePharmacyBundle({ format: PHARMACY_FORMAT, records: merge(next.user, next.imported) }, { batch: false });
    validateState(next); return next;
  }, incoming.map(r=>(mode==='program' || (mode==='restore' && r.origin)?'imported':'user')+':'+key(r)));
  return { revision: state.revision, records: effective(state).records.length, imported: state.imported.length, user: state.user.length };
}
export function pharmacySummary(owner) {
  const summary = LocalPharmacyWorkspaceRepository.summary(scope(owner));
  const sync=LocalPharmacySyncRepository.state(scope(owner));
  return { ...summary, sync:{pending:sync.pending,conflicts:sync.conflicts,lastSyncedAt:sync.synced_at??null,error:sync.error??null}, counts: Object.fromEntries(PHARMACY_KINDS.map(k => [k, summary.counts[k] ?? 0])), schema: 'pharmacy_rows_v1', externalExecutionSupported: false };
}
export function pharmacyRead(owner,options) { return LocalPharmacyWorkspaceRepository.snapshot(()=>({...pharmacyPage(owner,options),...pharmacySummary(owner)})); }
export function pharmacyPage(owner, options) { return LocalPharmacyWorkspaceRepository.page(scope(owner), options); }
export const pharmacyDataset = scope;

export function pharmacyPurchaseTotals(owner) {
  const { bundle } = readPharmacyWorkspace(owner);
  const packs = new Map(bundle.records.filter(r => r.kind === 'pack').map(r => [r.data.id, r.data]));
  return bundle.records.filter(r => r.kind === 'purchase' && r.data.document_type !== 'order').map(({ data }) => ({ ...data, base_quantity: packTotal(packs.get(data.pack_id), data.pack_count) * (data.document_type === 'return' ? -1 : 1), base_unit: packs.get(data.pack_id).base_unit }));
}

/** Stable source identities preserve leading zero codes. Never match by product name. */
export function pharmacyRecordId(kind, program, sourceKey) {
  return kind + '_' + createHash('sha256').update(JSON.stringify([program, sourceKey])).digest('hex').slice(0, 40);
}
/** Explicit column mapping only. Excel must be exported to UTF-8 CSV in the pharmacy program first. */
export function mapPharmacyCsv({ csvText, kind, program, keyColumn, columnMapping, collectedAt = new Date().toISOString() }) {
  if (!['product', 'pack', 'supplier', 'purchase', 'usage', 'sale', 'stock', 'balance'].includes(kind) || typeof program !== 'string' || !program.trim() || program.length > 64 || typeof keyColumn !== 'string') throw Error('영역·프로그램·원본 행 키 열을 지정하세요.');
  if (Object.values(columnMapping).includes('id')) throw Error('id는 원본 키에서 생성합니다. --key에 원본 키 열을 지정하세요.');
  let quoted = false;
  for (let i = 0; i < csvText.length; i++) if (csvText[i] === '"') {
    if (quoted && csvText[i + 1] === '"') i++; else quoted = !quoted;
  }
  if (quoted) throw Error('CSV 따옴표가 닫히지 않았습니다. 완전한 export 파일을 사용하세요.');
  const parsed = parseCsv(csvText);
  if (parsed.malformedRows > 0 || parsed.rows.length > PHARMACY_LIMITS.records) throw Error('CSV 행 구조·행 수를 확인하세요.');
  if (!parsed.header.includes(keyColumn) || Object.keys(columnMapping).some(k => !parsed.header.includes(k)) || new Set(parsed.header).size !== parsed.header.length || new Set(Object.values(columnMapping)).size !== Object.values(columnMapping).length) throw Error('CSV 열 이름과 중복 Mapping을 확인하세요.');
  const { mapped: rows } = mapImportRows(parsed.rows, columnMapping);
  const keys = new Set();
  return rows.map((row, i) => {
    const sourceKey = parsed.rows[i][keyColumn];
    if (typeof sourceKey !== 'string' || !sourceKey.trim() || keys.has(sourceKey)) throw Error('원본 행 키가 없거나 중복됩니다. 전표+행 번호 등 고유 키를 사용하세요.');
    keys.add(sourceKey);
    const data = { ...row, id: pharmacyRecordId(kind, program, sourceKey) };
    if (kind === 'product') data.program = program;
    for (const [field, value] of Object.entries(data)) {
      if (['product_id', 'pack_id', 'supplier_id'].includes(field)) data[field] = pharmacyRecordId(field.slice(0, -3), program, value);
      if (['units_per_pack', 'pack_count', 'quantity', 'purchases', 'unpaid'].includes(field)) {
        if (value === '' && kind === 'stock' && data.confidence === 'unknown') data[field] = null;
        else if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) throw Error(`수량·금액 열 형식을 명시적으로 정리하세요: ${field}`);
        else data[field] = Number(value);
      }
      if (['enabled', 'preferred', 'payment_required'].includes(field)) {
        if (value === 'true' || value === 'false') data[field] = value === 'true';
        else if (field === 'payment_required' && value === 'unknown') data[field] = null;
        else throw Error(`불리언 열은 true/false/unknown으로 정리하세요: ${field}`);
      }
    }
    return { kind, data: validatePharmacyRecord(kind, data), origin: { program, source_key: sourceKey, collected_at: collectedAt } };
  });
}

/** Mapping profiles reuse local_mappings, isolated by explicit pharmacy owner/program/kind. */
export function pharmacyMapping(owner, kind, program, profile, columnMapping) {
  const sourceType = scope(owner) + ':' + kind + ':' + program;
  if (typeof profile !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(profile)) throw Error('Mapping profile 식별자를 확인하세요.');
  if (columnMapping) { LocalMappingRepository.save({ sourceType, profileName: profile, columnMapping }); return columnMapping; }
  const saved = LocalMappingRepository.latest({ sourceType, profileName: profile });
  if (!saved) throw Error('해당 약국·프로그램·영역의 Mapping profile이 없습니다.');
  return saved;
}
