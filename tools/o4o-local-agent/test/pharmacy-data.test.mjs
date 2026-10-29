import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bootstrapLocalDb, closeLocalDb, SCHEMA_VERSION, LocalDatasetRepository, applyImport } from '../src/local-db.mjs';
import { createBackup, listBackups, restoreBackup } from '../src/local-db-backup.mjs';
import { PHARMACY_FORMAT, validatePharmacyBundle, orderPreparationRequest, packTotal } from '../src/pharmacy-order-contract.mjs';
import { importPharmacyRecords, readPharmacyWorkspace, pharmacySummary, pharmacyPurchaseTotals, mapPharmacyCsv } from '../src/pharmacy-data.mjs';
import { runDataCommand } from '../src/local-data-cli.mjs';
const owner = 'organization:fixture-a';
const stamp = '2026-10-27T00:00:00Z';
const origin = key => ({ program: 'fixture-program', source_key: key, collected_at: stamp });
const entry = (kind, data) => ({ kind, data, origin: origin(`${kind}-${data.id}`) });
const sample = () => ({ format: PHARMACY_FORMAT, records: [
  entry('product', { id: 'p1', name: '합성 상품', program: 'fixture-program', program_code: '0001', kind: 'dispensing' }),
  entry('pack', { id: 'k1', product_id: 'p1', label: '500정', base_unit: '정', units_per_pack: 500, preferred: true }),
  entry('supplier', { id: 's1', name: '합성 거래처', program_code: '001', enabled: true, order_site_url: 'https://example.com/order', payment_timing: 'deferred', payment_required: false }),
  entry('purchase', { document_type: 'purchase', id: 'b1', product_id: 'p1', supplier_id: 's1', pack_id: 'k1', pack_count: 2, purchased_at: stamp }),
  entry('usage', { id: 'u1', product_id: 'p1', quantity: 50, unit: '정', period_from: stamp, period_to: stamp }),
  entry('sale', { id: 'a1', product_id: 'p1', quantity: 1, unit: '포장', period_from: stamp, period_to: stamp }),
  entry('stock', { id: 't1', product_id: 'p1', quantity: null, confidence: 'unknown', observed_at: stamp }),
  entry('availability', { id: 'v1', product_id: 'p1', supplier_id: 's1', pack_id: 'k1', state: 'unconfirmed', source: 'user_observed', observed_at: stamp }),
  entry('balance', { id: 'z1', supplier_id: 's1', purchases: 100, unpaid: 50, observed_at: stamp }),
] });
let home;
beforeEach(() => { closeLocalDb(); home = fs.mkdtempSync(path.join(os.tmpdir(), 'o4o-pharmacy-')); process.env.O4O_AGENT_HOME = home; assert.equal(bootstrapLocalDb({ backup: (db, reason) => createBackup(db, reason) }).ready, true); });
afterEach(() => { closeLocalDb(); fs.rmSync(home, { recursive: true, force: true }); });
const importSample = () => importPharmacyRecords(owner, sample(), 0);
const sheet = (status = 'draft') => ({ kind: 'sheet', data: { id: 'sheet1', title: '합성 발주 초안', status, lines: [{ id: 'l1', product_id: 'p1', product_name: '합성 상품', supplier_id: 's1', pack_id: 'k1', pack_label: '500정', pack_count: 2 }] } });

test('normalized Dataset stores all program domains; repeated imports do not duplicate purchases', () => {
  assert.equal(SCHEMA_VERSION, 9); importSample(); importPharmacyRecords(owner, sample(), 1);
  assert.equal(pharmacySummary(owner).counts.purchase, 1);
  assert.equal(pharmacyPurchaseTotals(owner)[0].base_quantity, 1000);
  assert.equal(readPharmacyWorkspace(owner).bundle.records.find(r => r.kind === 'product').data.program_code, '0001');
});
test('source snapshots and user corrections remain separate and re-import preserves supplier terms', () => {
  importSample(); const s = sample().records.find(r => r.kind === 'supplier');
  importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: [{ kind: 'supplier', data: { ...s.data, payment_timing: 'at_order', payment_required: true, terms_checked_at: stamp } }] }, 1, 'user');
  importPharmacyRecords(owner, sample(), 2);
  const workspace = readPharmacyWorkspace(owner);
  assert.equal(workspace.importedCount, 9); assert.equal(workspace.userCount, 1);
  assert.equal(workspace.bundle.records.find(r => r.kind === 'supplier').data.payment_required, true);
});
test('owner isolation and stale revision protection across callers', () => {
  importSample(); assert.equal(readPharmacyWorkspace('organization:fixture-b').bundle.records.length, 0);
  assert.throws(() => importPharmacyRecords(owner, sample(), 0), /REVISION_CONFLICT/);
  assert.throws(() => readPharmacyWorkspace('fixture-a'), /owner/);
  assert.equal(readPharmacyWorkspace(owner).revision, 1);
});
test('invalid cross-product pack fails atomically and leaves all original records unchanged', () => {
  importSample(); const bad = sample(); bad.records.find(r => r.kind === 'purchase').data.product_id = 'other';
  assert.throws(() => importPharmacyRecords(owner, bad, 1), /연결|상품/);
  assert.equal(readPharmacyWorkspace(owner).revision, 1);
});
test('source key rebinding, id duplication and backward snapshots reject without mutation', () => {
  importSample(); const changed = sample(); changed.records.find(r => r.kind === 'purchase').data.id = 'b2';
  assert.throws(() => importPharmacyRecords(owner, changed, 1), /원본 행/);
  const past = sample(); past.records[0].origin.collected_at = '2026-10-26T00:00:00Z';
  assert.throws(() => importPharmacyRecords(owner, past, 1), /과거/);
  const duplicate = sample(); duplicate.records.push(duplicate.records[0]);
  assert.throws(() => importPharmacyRecords(owner, duplicate, 1), /중복/);
});
test('user lane cannot fabricate pharmacy-program purchase, usage, sales or balance rows', () => {
  importSample(); for (const kind of ['purchase', 'usage', 'sale', 'balance']) assert.throws(() => importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: sample().records.filter(r => r.kind === kind) }, 1, 'user'), /약국 프로그램/);
  assert.equal(readPharmacyWorkspace(owner).revision, 1);
});
test('blank draft works without inventory or history; preparing requires explicit supplier, pack and quantity', () => {
  const blank = { format: PHARMACY_FORMAT, records: [{ kind: 'sheet', data: { id: 'blank', title: '빈 시트', status: 'draft', lines: [] } }] };
  importPharmacyRecords(owner, blank, 0, 'user');
  const prepared = structuredClone(blank); prepared.records[0].data.status = 'prepared';
  assert.throws(() => validatePharmacyBundle(prepared), /빈 시트/);
  assert.equal(pharmacySummary(owner).counts.stock, 0);
});
test('sheet references, bounded request, COMMIT handover and receipt evidence', () => {
  importSample(); importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: [sheet('prepared')] }, 1, 'user');
  const bundle = readPharmacyWorkspace(owner).bundle;
  const request = orderPreparationRequest(bundle, 'sheet1', 's1');
  assert.match(request, /최종 제출·결제는 사용자가 직접/); assert.match(request, /결제 조건: deferred/);
  assert.match(orderPreparationRequest(bundle, 'sheet1', 's1', 'availability'), /수량 입력·주문은 하지/);
  const receipt = sheet('receipt_recorded');
  assert.throws(() => importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: [receipt] }, 2, 'user'), /접수번호/);
  receipt.data.receipt_reference = 'fixture-receipt'; receipt.data.receipt_at = stamp;
  importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: [receipt] }, 2, 'user');
  assert.equal(pharmacySummary(owner).counts.sheet, 1);
});
test('unknown inventory is not zero, no stock-derived suggestions; no match is not out of stock', () => {
  importSample(); const ws = readPharmacyWorkspace(owner);
  assert.equal(ws.bundle.records.find(r => r.kind === 'stock').data.quantity, null);
  assert.equal(ws.bundle.records.find(r => r.kind === 'availability').data.state, 'unconfirmed');
  const bad = sample(); bad.records.find(r => r.kind === 'stock').data.quantity = 0;
  assert.throws(() => validatePharmacyBundle(bad), /재고/);
});
test('strict fields, URLs, units, positive pack count and UTC timestamps', () => {
  for (const mutate of [b => b.records[0].data.patient_name = 'denied', b => b.records[2].data.order_site_url = 'https://example.com/?password=x', b => b.records[3].data.pack_count = 0, b => b.records[3].data.purchased_at = '2026-02-30T00:00:00Z', b => b.records[1].data.units_per_pack = -1]) {
    const bad = sample(); mutate(bad); assert.throws(() => validatePharmacyBundle(bad));
  }
  assert.throws(() => packTotal({ units_per_pack: 0 }, 1));
});
test('generic cloud dataset query and CSV replacement cannot access pharmacy workspace', () => {
  importSample(); const name = LocalDatasetRepository.list().find(r => r.name.startsWith('pharmacy_')).name;
  assert.throws(() => LocalDatasetRepository.search({ dataset: name, field: 'revision', value: '1' }), /owner/);
  assert.throws(() => applyImport({ csvText: 'a\n1', dataset: name, columnMapping: { a: 'revision' }, mode: 'replace' }), /reserved/);
  assert.equal(readPharmacyWorkspace(owner).revision, 1);
});
test('explicit CSV mapping preserves leading zero source codes and stable ids, projects away unselected columns', () => {
  const request = { csvText: '코드,이름,종류,환자메모\n0001,합성 상품,dispensing,절대반입금지\n', kind: 'product', program: 'fixture-program', keyColumn: '코드', columnMapping: { 코드: 'program_code', 이름: 'name', 종류: 'kind' }, collectedAt: stamp };
  const a = mapPharmacyCsv(request), b = mapPharmacyCsv(request);
  assert.equal(a[0].data.program_code, '0001'); assert.equal(a[0].data.id, b[0].data.id);
  assert.equal(JSON.stringify(a).includes('절대반입금지'), false);
  importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: a }, 0);
  assert.equal(pharmacySummary(owner).counts.product, 1);
});
test('CSV mapping rejects missing/duplicate columns, source keys, ambiguous numeric notation and malformed rows', () => {
  const base = { kind: 'product', program: 'fixture', keyColumn: '코드', columnMapping: { 코드: 'program_code', 이름: 'name', 종류: 'kind' } };
  assert.throws(() => mapPharmacyCsv({ ...base, csvText: '코드,이름,종류\n1,a,unknown\n1,b,unknown' }), /중복/);
  assert.throws(() => mapPharmacyCsv({ ...base, csvText: '코드,이름,종류\n1,a' }), /행 구조/);
  assert.throws(() => mapPharmacyCsv({ ...base, csvText: '코드,이름,이름\n1,a,b' }), /열 이름/);
});
test('CLI explicit import/export, revision guard and backup roundtrip preserve program copies', async () => {
  const file = path.join(home, 'input.json'), out = path.join(home, 'out.json'); fs.writeFileSync(file, JSON.stringify(sample()));
  const lines = []; const print = m => lines.push(m);
  assert.equal(await runDataCommand(['pharmacy', 'import', '--owner', owner, '--file', file, '--revision', '0'], print), 0);
  assert.equal(listBackups().length, 1);
  assert.equal(await runDataCommand(['pharmacy', 'export', '--owner', owner, '--out', out], print), 0);
  assert.equal(validatePharmacyBundle(JSON.parse(fs.readFileSync(out, 'utf8'))).records.length, 9);
  assert.equal(await runDataCommand(['pharmacy', 'export', '--owner', owner, '--out', out], print), 2); // never overwrite existing files
  assert.equal(await runDataCommand(['pharmacy', 'status', '--owner', owner], print), 0);
  assert.equal(lines.slice(0, 2).join('').includes('합성 상품'), false);
  const backup = createBackup((await import('../src/local-db.mjs')).openLocalDb(), 'manual');
  importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: [sheet()] }, 1, 'user');
  closeLocalDb(); restoreBackup(backup.id); bootstrapLocalDb({ backup: (db, reason) => createBackup(db, reason) });
  assert.equal(pharmacySummary(owner).counts.sheet, 0); assert.equal(pharmacySummary(owner).counts.purchase, 1);
});
test('program order rows do not count as received purchases; returns retain their distinct meaning', () => {
  const bundle = sample(); const purchase = bundle.records.find(r => r.kind === 'purchase');
  purchase.data.document_type = 'order'; importPharmacyRecords(owner, bundle, 0);
  assert.equal(pharmacyPurchaseTotals(owner).length, 0);
  purchase.data.document_type = 'return'; importPharmacyRecords(owner, bundle, 1);
  assert.equal(pharmacyPurchaseTotals(owner)[0].base_quantity, -1000);
});
test('CSV-derived product/pack/supplier/purchase ids join by program codes, not names', () => {
  const map = (kind, csvText, columnMapping) => mapPharmacyCsv({ kind, csvText, columnMapping, program: 'fixture', keyColumn: 'key', collectedAt: stamp });
  const records = [
    ...map('product', 'key,name,kind\n0001,합성 상품,dispensing', { key: 'program_code', name: 'name', kind: 'kind' }),
    ...map('pack', 'key,product,label,unit,count\n001,0001,500정,정,500', { product: 'product_id', label: 'label', unit: 'base_unit', count: 'units_per_pack' }),
    ...map('supplier', 'key,name,enabled,timing,required\n01,합성 거래처,true,deferred,false', { key: 'program_code', name: 'name', enabled: 'enabled', timing: 'payment_timing', required: 'payment_required' }),
    ...map('purchase', `key,product,pack,supplier,count,at,type\ninvoice1_line1,0001,001,01,2,${stamp},purchase`, { product: 'product_id', pack: 'pack_id', supplier: 'supplier_id', count: 'pack_count', at: 'purchased_at', type: 'document_type' }),
  ];
  importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records }, 0);
  assert.equal(pharmacyPurchaseTotals(owner)[0].base_quantity, 1000);
  assert.throws(() => map('pack', 'key,product,label,unit,count\n001,0001,500정,정,"1,000"', { product: 'product_id', label: 'label', unit: 'base_unit', count: 'units_per_pack' }), /형식을/);
});
test('saved Mapping profile is reused only within the same owner, source program and domain', async () => {
  const { pharmacyMapping } = await import('../src/pharmacy-data.mjs');
  const mapping = { 상품코드: 'program_code', 상품명: 'name' };
  pharmacyMapping(owner, 'product', 'fixture', 'product-v1', mapping);
  assert.deepEqual(pharmacyMapping(owner, 'product', 'fixture', 'product-v1'), mapping);
  assert.throws(() => pharmacyMapping('organization:fixture-b', 'product', 'fixture', 'product-v1'), /없습니다/);
  assert.throws(() => pharmacyMapping(owner, 'product', 'other-program', 'product-v1'), /없습니다/);
});

test('browser and standalone PC runtime resolve one pure contract; Docker includes only its two source files', async () => {
  const agent = await import('../src/pharmacy-order-contract.mjs');
  const browser = await import('../../../services/web-neture/src/lib/pharmacy/contract.mjs');
  assert.deepEqual(Object.keys(browser), Object.keys(agent));
  for (const key of Object.keys(agent)) assert.equal(browser[key], agent[key]);
  const docker = fs.readFileSync(new URL('../../../services/web-neture/Dockerfile', import.meta.url), 'utf8');
  assert.match(docker, /COPY tools\/o4o-local-agent\/src\/pharmacy-order-contract\.mjs tools\/o4o-local-agent\/src\/pharmacy-order-contract\.d\.mts \.\/tools\/o4o-local-agent\/src\//);
});

test('a directly confirmed receipt is retained; repeat automation and destructive edits require a new sheet', () => {
  importSample(); const confirmed = sheet('receipt_recorded'); confirmed.data.receipt_reference = 'fixture-receipt'; confirmed.data.receipt_at = stamp;
  importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: [confirmed] }, 1, 'user');
  assert.throws(() => orderPreparationRequest(readPharmacyWorkspace(owner).bundle, 'sheet1', 's1'), /새 주문 시트/);
  assert.throws(() => importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: [sheet('draft')] }, 2, 'user'), /접수 확인 시트/);
  assert.equal(readPharmacyWorkspace(owner).revision, 2);
});
test('reused Dataset importer preserves append-only batches even in the same millisecond', () => {
  const RealDate = globalThis.Date;
  globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [stamp])); } static now() { return RealDate.parse(stamp); } };
  try {
    const request = { csvText: 'code\nfirst', dataset: 'fixture_append', columnMapping: { code: 'code' } };
    applyImport(request); applyImport({ ...request, csvText: 'code\nsecond' });
    assert.equal(LocalDatasetRepository.get('fixture_append').row_count, 2);
    assert.deepEqual(LocalDatasetRepository.rows('fixture_append').map(r => r.code), ['first', 'second']);
  } finally { globalThis.Date = RealDate; }
});
test('fractional pack conversion does not introduce binary multiplication artifacts', () => {
  assert.equal(packTotal({ units_per_pack: 0.1 }, 3), 0.3);
  assert.equal(packTotal({ units_per_pack: 12.5 }, 2), 25);
  assert.throws(() => packTotal({ units_per_pack: 0.0000001 }, 2), /환산/);
});
test('legacy named datasets remain usable; only exact new scoped workspace names are reserved', () => {
  applyImport({ csvText: 'name\n합성 상품', dataset: 'pharmacy_products', columnMapping: { name: 'name' }, keyField: 'name' });
  assert.equal(LocalDatasetRepository.search({ dataset: 'pharmacy_products', field: 'name', value: '합성 상품' }).length, 1);
});
test('invalid files never echo raw content and incomplete CSV exports fail before writing', async () => {
  const file = path.join(home, 'invalid.json'); fs.writeFileSync(file, 'PRIVATE_RAW_MUST_NOT_ECHO');
  const output = []; assert.equal(await runDataCommand(['pharmacy', 'import', '--owner', owner, '--file', file, '--revision', '0'], m => output.push(m)), 2);
  assert.equal(output.join('').includes('PRIVATE_RAW_MUST_NOT_ECHO'), false);
  assert.equal(readPharmacyWorkspace(owner).revision, 0);
  assert.throws(() => mapPharmacyCsv({ csvText: 'code,name,kind\n1,"unclosed,unknown', kind: 'product', program: 'fixture', keyColumn: 'code', columnMapping: { code: 'program_code', name: 'name', kind: 'kind' } }), /따옴표/);
});

test('pack measure changes cannot retroactively rewrite purchase quantities in either source or user lane', () => {
  importSample(); const changed = sample(); changed.records.find(r => r.kind === 'pack').data.units_per_pack = 1000;
  assert.throws(() => importPharmacyRecords(owner, changed, 1), /새 포장 식별자/);
  const pack = changed.records.find(r => r.kind === 'pack');
  assert.throws(() => importPharmacyRecords(owner, { format: PHARMACY_FORMAT, records: [pack] }, 1, 'user'), /새 포장 식별자/);
  assert.equal(pharmacyPurchaseTotals(owner)[0].base_quantity, 1000);
  assert.equal(readPharmacyWorkspace(owner).revision, 1);
});

test('per-supplier receipts preserve evidence while allowing remaining supplier work',()=>{
  importSample(); const second={kind:'supplier',data:{...sample().records.find(r=>r.kind==='supplier').data,id:'s2'}};
  const work=sheet('handed_over'); work.data.lines.push({...work.data.lines[0],id:'l2',supplier_id:'s2'});
  work.data.receipts=[{supplier_id:'s1',reference:'receipt-a',confirmed_at:stamp}];
  importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[second,work]},1,'user');
  assert.throws(()=>orderPreparationRequest(readPharmacyWorkspace(owner).bundle,'sheet1','s1'),/접수/);
  assert.match(orderPreparationRequest(readPharmacyWorkspace(owner).bundle,'sheet1','s2'),/주문 준비/);
  const erased=structuredClone(work); erased.data.receipts=[];
  assert.throws(()=>importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[erased]},2,'user'),/접수 확인 시트/);
  const ambiguous=structuredClone(work);delete ambiguous.data.receipts;ambiguous.data.status='receipt_recorded';ambiguous.data.receipt_reference='ambiguous';ambiguous.data.receipt_at=stamp;
  assert.throws(()=>importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[ambiguous]},2,'user'),/거래처별/);
  work.data.receipts.push({supplier_id:'s2',reference:'receipt-b',confirmed_at:stamp});work.data.status='receipt_recorded';
  importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[work]},2,'user');
  assert.equal(readPharmacyWorkspace(owner).bundle.records.find(r=>r.kind==='sheet').data.receipts.length,2);
});

test('more than 10000 useful rows accumulate across bounded imports and remain pageable', async () => {
  const { pharmacyPage } = await import('../src/pharmacy-data.mjs');
  for (let batch=0;batch<3;batch++) {
    const records=Array.from({length:4000},(_,i)=>entry('product',{id:`p${batch*4000+i}`,name:'합성 상품',program:'fixture-program',program_code:String(batch*4000+i),kind:'dispensing'}));
    importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records},batch);
  }
  assert.equal(pharmacySummary(owner).counts.product,12000);
  let after='',total=0;
  do { const page=pharmacyPage(owner,{kind:'product',after,limit:500}); total+=page.records.length;after=page.next; } while(after);
  assert.equal(total,12000);
});

test('sync acknowledgement cannot erase a newer local edit; reordered JSON is equal', async () => {
  const { LocalPharmacySyncRepository: journal }=await import('../src/local-db.mjs');
  const { pharmacyDataset }=await import('../src/pharmacy-data.mjs');
  const dataset=pharmacyDataset(owner), epoch=crypto.randomUUID();
  importSample();journal.configure(dataset,epoch);
  const pending=journal.pending(dataset),original=pending.find(r=>r.entry.kind==='supplier');
  const replacement={kind:'supplier',data:{...original.entry.data,name:'교정 거래처'}};
  importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[replacement]},1,'user');
  const user=journal.pending(dataset).find(r=>r.lane==='user');
  importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[{...replacement,data:{...replacement.data,name:'두 번째 교정'}}]},2,'user');
  journal.apply(dataset,epoch,{accepted:[{lane:'user',kind:'supplier',id:'s1',mutationId:user.mutationId,version:3}],changes:[],cursor:3,more:false});
  const next=journal.pending(dataset).find(r=>r.lane==='user');
  assert.equal(next.entry.data.name,'두 번째 교정');assert.equal(next.expectedVersion,3);
  const reordered={origin:original.entry.origin,data:original.entry.data,kind:original.entry.kind};
  const applied=journal.apply(dataset,epoch,{accepted:[],changes:[{...original,entry:reordered,version:4}],cursor:4,more:false});
  assert.equal(applied.conflicts,0);
  journal.configure(dataset,crypto.randomUUID());
  assert.throws(()=>journal.apply(dataset,epoch,{accepted:[],changes:[],cursor:4,more:false}),/STALE_EPOCH/);
});


test('actual order entry accepts relative ReturnUrl but rejects credentials and external redirects', async()=>{
 const {normalizeOrderSiteUrl}=await import('../src/pharmacy-order-contract.mjs');
 assert.equal(normalizeOrderSiteUrl('https://order.geoweb.kr/Member/Login?ReturnUrl=%2f'),'https://order.geoweb.kr/Member/Login?ReturnUrl=%2f');
 for(const value of ['https://example.com/?token=secret','https://example.com/?ReturnUrl=https%3A%2F%2Fother.example.com','https://127.0.0.1/order','https://example.com/?ReturnUrl=%2F%2Fevil.example.com','https://example.com/?ReturnUrl=%2Flogin%3Ftoken%3Dx'])assert.throws(()=>normalizeOrderSiteUrl(value));
});

test('v8 migration preserves legacy and user lanes; malformed legacy rolls back with backup', async()=>{
 const {DatabaseSync}=await import('node:sqlite');
 const {MIGRATIONS}=await import('../src/local-db.mjs');
 const {pharmacyDataset}=await import('../src/pharmacy-data.mjs');
 for(const scenario of ['valid','malformed','cross-lane','dangling']){
  const malformed=['malformed','dangling'].includes(scenario);
  closeLocalDb();fs.rmSync(path.join(home,'local.db'),{force:true});
  const raw=new DatabaseSync(path.join(home,'local.db'));
  for(const migration of MIGRATIONS.filter(m=>m.version<=8)){
    migration.up(raw);raw.prepare('INSERT INTO local_schema_migrations(version,name,applied_at) VALUES(?,?,?)').run(migration.version,migration.name,stamp);
  }
  const dataset=pharmacyDataset(owner),legacy={revision:7,imported:sample().records,user:scenario==='malformed'?[{kind:'supplier',data:{}}]:[{kind:'supplier',data:{...sample().records[2].data,name:'이전 교정'}}]};
  if(scenario==='cross-lane' || scenario==='dangling'){legacy.imported=[sample().records.find(r=>r.kind==='stock')];legacy.user=scenario==='cross-lane'?[{kind:'product',data:sample().records[0].data}]:[];}
  raw.prepare('INSERT INTO local_datasets(name,fields,row_count,created_at,updated_at) VALUES(?,?,1,?,?)').run(dataset,'[]',stamp,stamp);
  raw.prepare('INSERT INTO local_dataset_rows(dataset,row_key,data,imported_at) VALUES(?,?,?,?)').run(dataset,'workspace',JSON.stringify(legacy),stamp);raw.close();
  const result=bootstrapLocalDb({backup:(db,reason)=>createBackup(db,reason)});
  assert.equal(result.ready,!malformed);assert.ok(listBackups().length>0);
  if(!malformed){const workspace=readPharmacyWorkspace(owner);assert.equal(workspace.revision,7);if(scenario==='cross-lane'){assert.equal(workspace.bundle.records.find(r=>r.kind==='stock').data.product_id,'p1');assert.equal(workspace.bundle.records.find(r=>r.kind==='product').data.id,'p1');}else assert.equal(workspace.bundle.records.find(r=>r.kind==='supplier').data.name,'이전 교정');}
  closeLocalDb();const check=new DatabaseSync(path.join(home,'local.db'),{readOnly:true});
  assert.deepEqual(JSON.parse(check.prepare('SELECT data FROM local_dataset_rows WHERE dataset=?').get(dataset).data),legacy);
  assert.equal(check.prepare('SELECT MAX(version) AS v FROM local_schema_migrations').get().v,malformed?8:9);check.close();
 }
});

test('background mirror uploads only current grants, retries safely, and stops after revocation',async()=>{
 const {createPharmacySync}=await import('../src/pharmacy-sync.mjs');
 const {LocalPharmacySyncRepository:journal}=await import('../src/local-db.mjs');
 const {pharmacyDataset}=await import('../src/pharmacy-data.mjs');
 importSample();let allowed=false,offline=false;const epoch=crypto.randomUUID(),calls=[];
 const worker=createPharmacySync({post:async(path,body)=>{
  calls.push({path,body});
  if(path.endsWith('grants'))return {status:200,payload:{data:allowed?[{owner,epoch}]:[]}};
  if(offline)return {status:0,payload:null};
  return {status:200,payload:{success:true,data:{accepted:body.changes.map((r,i)=>({lane:r.lane,kind:r.entry.kind,id:r.entry.data.id,mutationId:r.mutationId,version:i+1})),changes:[],cursor:9,more:false}}};
 }});
 await worker.tick('fixture',true);assert.equal(calls.length,1);
 allowed=true;offline=true;await worker.tick('fixture',true);assert.equal(journal.pending(pharmacyDataset(owner)).length,9);
 offline=false;await worker.tick('fixture',true);assert.equal(journal.pending(pharmacyDataset(owner)).length,0);
 const uploads=calls.filter(r=>r.path.endsWith('sync')).length;
 allowed=false;await worker.tick('fixture',true);assert.equal(calls.filter(r=>r.path.endsWith('sync')).length,uploads);
 assert.equal(calls.some(r=>JSON.stringify(r.body).includes('fixture-program') && !r.path.endsWith('sync')),false);
});

test('conflicting local edit is preserved and quarantined rather than automatically overwriting the server',async()=>{
 const {LocalPharmacySyncRepository:journal}=await import('../src/local-db.mjs');
 const {pharmacyDataset}=await import('../src/pharmacy-data.mjs');
 const dataset=pharmacyDataset(owner),epoch=crypto.randomUUID();importSample();journal.configure(dataset,epoch);
 const row=journal.pending(dataset).find(r=>r.entry.kind==='product');
 const result=journal.apply(dataset,epoch,{accepted:[],changes:[{...row,entry:{...row.entry,data:{...row.entry.data,name:'서버 교정'}},version:10}],cursor:10,more:false});
 assert.equal(result.conflicts,1);assert.equal(journal.state(dataset).conflicts,1);
 assert.equal(readPharmacyWorkspace(owner).bundle.records.find(r=>r.kind==='product').data.name,'합성 상품');
 assert.equal(journal.pending(dataset).some(r=>r.entry.kind==='product'),false);
 const purchase=journal.pending(dataset).find(r=>r.entry.kind==='purchase');
 journal.apply(dataset,epoch,{accepted:[],changes:[{...purchase,entry:{...purchase.entry,data:{...purchase.entry.data,pack_count:3}},version:11}],cursor:11,more:false});
 assert.equal(journal.state(dataset).conflicts,2);
 importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[purchase.entry]},readPharmacyWorkspace(owner).revision);
 assert.equal(journal.state(dataset).conflicts,1); // The unrelated product remains quarantined.
 const retried=journal.pending(dataset).find(r=>r.entry.kind==='purchase');assert.equal(retried.expectedVersion,11);assert.notEqual(retried.mutationId,purchase.mutationId);
 assert.equal(retried.entry.data.pack_count,purchase.entry.data.pack_count);
 importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[purchase.entry]},readPharmacyWorkspace(owner).revision);
 assert.equal(journal.pending(dataset).find(r=>r.entry.kind==='purchase').mutationId,retried.mutationId);
});

test('authenticated command contract reaches SQLite, backs up program imports, and returns only bounded typed data',async()=>{
 const {runAction}=await import('../src/handlers.mjs');
 const {pickPharmacyResult}=await import('../src/pharmacy-order-contract.mjs');
 const write=await runAction('local.data.pharmacy_write',{}, {owner,mode:'program',records:sample().records,expectedRevision:0});
 assert.equal(write.status,'success');assert.equal(write.data.revision,1);assert.ok(listBackups().length>0);
 const read=await runAction('local.data.pharmacy_read',{}, {owner,kind:'purchase',limit:1});
 assert.equal(read.status,'success');assert.equal(read.data.records.length,1);assert.equal(read.data.records[0].kind,'purchase');
 const clean=pickPharmacyResult({...read.data,credential:'must-not-pass',sync:{pending:0,conflicts:0,lastSyncedAt:null,error:'raw-detail'}});
 assert.equal('credential' in clean,false);assert.equal(clean.sync.error,null);
 const stale=await runAction('local.data.pharmacy_write',{}, {owner,mode:'user',records:[],expectedRevision:0});
 assert.equal(stale.status,'failed');assert.equal(stale.errorCode,'PHARMACY_REVISION_CONFLICT');
 assert.equal((await runAction('local.data.pharmacy_read',{}, {owner,sql:'SELECT 1'})).status,'denied');
 assert.equal((await runAction('local.data.pharmacy_read',{}, {owner:'user:other',limit:1})).data.records.length,0);
});

 test('mixed file restore commits cross-lane references once and rolls back all rows on invalid links',async()=>{
  const {runAction}=await import('../src/handlers.mjs');
  const product={kind:'product',data:sample().records[0].data};
  const stock=sample().records.find(r=>r.kind==='stock');
  const result=await runAction('local.data.pharmacy_write',{}, {owner,mode:'restore',records:[stock,product],expectedRevision:0});
  assert.equal(result.status,'success');assert.equal(readPharmacyWorkspace(owner).revision,1);
  assert.equal(readPharmacyWorkspace(owner).importedCount,1);assert.equal(readPharmacyWorkspace(owner).userCount,1);assert.ok(listBackups().length>0);
  const before=readPharmacyWorkspace(owner);
  const invalid={...stock,data:{...stock.data,id:'missing-stock',product_id:'missing-product'}};
  const failed=await runAction('local.data.pharmacy_write',{}, {owner,mode:'restore',records:[invalid,{kind:'product',data:{...product.data,id:'p2',program_code:'002'}}],expectedRevision:1});
  assert.notEqual(failed.status,'success');assert.deepEqual(readPharmacyWorkspace(owner),before);
 });

test('PC read keeps rows and summary revision in one SQLite snapshot across a concurrent writer',async()=>{
 const {openLocalDb}=await import('../src/local-db.mjs');const {DatabaseSync}=await import('node:sqlite');const {pharmacyDataset}=await import('../src/pharmacy-data.mjs');const {runAction}=await import('../src/handlers.mjs');
 importSample();const db=openLocalDb(),other=new DatabaseSync(path.join(home,'local.db'));const prepare=db.prepare.bind(db);let written=false;
 db.prepare=sql=>{const statement=prepare(sql);if(sql.startsWith('SELECT r.kind,r.id,r.payload')){const all=statement.all.bind(statement);statement.all=(...args)=>{const rows=all(...args);if(!written){written=true;other.exec('BEGIN IMMEDIATE');const supplier=sample().records.find(r=>r.kind==='supplier');supplier.data.name='동시 변경';other.prepare("UPDATE local_pharmacy_records SET payload=? WHERE dataset=? AND lane='imported' AND kind='supplier'").run(JSON.stringify(supplier),pharmacyDataset(owner));other.prepare('UPDATE local_pharmacy_workspaces SET revision=revision+1 WHERE dataset=?').run(pharmacyDataset(owner));other.exec('COMMIT');}return rows;};}return statement;};
 try{const read=await runAction('local.data.pharmacy_read',{}, {owner,kind:'supplier',limit:10});assert.equal(read.status,'success');assert.equal(read.data.records[0].data.name,'합성 거래처');assert.equal(read.data.revision,1);assert.throws(()=>importPharmacyRecords(owner,{format:PHARMACY_FORMAT,records:[{kind:'supplier',data:{...read.data.records[0].data,payment_timing:'at_order'}}]},read.data.revision,'user'),/REVISION_CONFLICT/);}finally{db.prepare=prepare;other.close();}
 assert.equal(readPharmacyWorkspace(owner).bundle.records.find(r=>r.kind==='supplier').data.name,'동시 변경');
});
