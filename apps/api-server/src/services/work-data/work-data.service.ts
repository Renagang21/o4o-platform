import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';
import { randomUUID } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import { resolveTaskOwnership } from '../assistant/task-ownership.js';
import { assertAccount } from '../../modules/external-ai/adapters/adapter.js';
import { PHARMACY_FORMAT, PHARMACY_KINDS, validatePharmacyBundle, validatePharmacyLinks, sheetReceipts, type PharmacyEntry } from './contract.js';

type Db = Pick<DataSource | EntityManager, 'query'>;
export class WorkDataError extends Error {
  constructor(readonly code: string, readonly status = 400) { super(code); }
}
export interface WorkDataOwner { key: string; userId: string | null; organizationId: string | null }
export interface WorkDataMutation { lane: 'imported' | 'user'; entry: PharmacyEntry; expectedVersion: number; mutationId: string }
export interface WorkDataRow { lane: 'imported' | 'user'; entry: PharmacyEntry; version: number; mutationId: string }
const visibleLane = `(r.lane='user' OR NOT EXISTS(SELECT 1 FROM assistant_work_data_records u
  WHERE u.owner_key=r.owner_key AND u.lane='user' AND u.kind=r.kind AND u.id=r.id))`;
const effective = `r.owner_key=$1 AND ${visibleLane}`;
const key = (entry: PharmacyEntry) => entry.kind + ':' + entry.data.id;
const positive = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0;
const equal = (a: unknown, b: unknown) => JSON.stringify(sort(a)) === JSON.stringify(sort(b));
function sort(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k,sort(v)]));
  return value;
}
export function validateMutations(raw: unknown): WorkDataMutation[] {
  if (!Array.isArray(raw) || raw.length > 100 || Buffer.byteLength(JSON.stringify(raw)) > 1024 * 1024) throw new WorkDataError('WORK_DATA_BATCH_INVALID');
  const seen = new Set<string>();
  return raw.map(item => {
    if (!item || typeof item !== 'object' || Object.keys(item).some(k => !['lane','entry','expectedVersion','mutationId'].includes(k))
      || !['imported','user'].includes(item.lane) || !positive(item.expectedVersion)
      || typeof item.mutationId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(item.mutationId)) throw new WorkDataError('WORK_DATA_MUTATION_INVALID');
    let entry: PharmacyEntry;
    try { entry = validatePharmacyBundle({ format: PHARMACY_FORMAT, records: [item.entry] }, { links: false }).records[0]; }
    catch { throw new WorkDataError('WORK_DATA_RECORD_INVALID'); }
    if (item.lane === 'imported' && !entry.origin) throw new WorkDataError('WORK_DATA_ORIGIN_REQUIRED');
    if (item.lane === 'user' && ['purchase','usage','sale','balance'].includes(entry.kind)) throw new WorkDataError('WORK_DATA_PROGRAM_SOURCE_REQUIRED');
    const id = item.lane + ':' + key(entry);
    if (seen.has(id)) throw new WorkDataError('WORK_DATA_DUPLICATE_MUTATION');
    seen.add(id);
    return { lane: item.lane, entry, expectedVersion: item.expectedVersion, mutationId: item.mutationId };
  });
}
export async function assertWorkDataOwner(db: Db, userId: string, owner: WorkDataOwner, write: boolean): Promise<void> {
  await assertAccount(db, userId);
  if(await getNetureMainMembershipStatus(db,userId)!=='active')throw new WorkDataError('WORK_DATA_FORBIDDEN',403);
  if (owner.userId) {
    if (owner.userId !== userId || owner.key !== 'user:' + userId || owner.organizationId) throw new WorkDataError('WORK_DATA_FORBIDDEN',403);
    return;
  }
  if (!owner.organizationId || owner.key !== 'organization:' + owner.organizationId) throw new WorkDataError('WORK_DATA_FORBIDDEN',403);
  // Existing organization membership and owner role; no new role/grant hierarchy.
  const rows = await db.query(`SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 AND left_at IS NULL`,[owner.organizationId,userId]);
  if (!rows.length || (write && !rows.some(r => r.role === 'owner'))) throw new WorkDataError('WORK_DATA_FORBIDDEN',403);
}
export async function resolveWorkDataOwner(db: DataSource, userId: string, workScope?: unknown): Promise<WorkDataOwner> {
  const ownership = await resolveTaskOwnership(db, { userId, workScope });
  const owner: WorkDataOwner = ownership.scope === 'ORGANIZATION' && ownership.organizationId
    ? { key: 'organization:' + ownership.organizationId, userId: null, organizationId: ownership.organizationId }
    : { key: 'user:' + userId, userId, organizationId: null };
  await assertWorkDataOwner(db,userId,owner,false);
  return owner;
}
function ownerOf(row: any): WorkDataOwner { return {key:row.owner_key,userId:row.user_id,organizationId:row.organization_id}; }
function consentOf(row: any) {
  // Old API revisions update enabled only. Normalize those records during rollout
  // without granting local fallback or reviving a stopped server workspace.
  let storageMode=row?.storage_mode??'local';
  if(storageMode==='stopped' || (row && !row.enabled && storageMode!=='local'))storageMode='stopped';
  else if(row?.enabled && storageMode==='local')storageMode='transferring';
  return {enabled:!!row?.enabled && storageMode!=='stopped',epoch:row?.epoch??null,owner:row?.owner_key??null,
    updatedAt:row?.updated_at??null,storageMode,sourceDeviceId:row?.source_device_id??null,transferError:row?.transfer_error??null};
}
function assertServerReady(consent: ReturnType<typeof consentOf>) {
  if (!consent.enabled) throw new WorkDataError('WORK_DATA_CONSENT_REQUIRED',403);
  if (consent.storageMode!=='server') throw new WorkDataError('WORK_DATA_TRANSFERRING',409);
}
export class WorkDataService {
  constructor(readonly db: DataSource) {}
  async consent(userId: string, owner: WorkDataOwner, db: Db = this.db) {
    await assertWorkDataOwner(db,userId,owner,false);
    const [row] = await db.query('SELECT * FROM assistant_work_data_consents WHERE owner_key=$1',[owner.key]);
    const transferredRecords=row?.storage_mode==='transferring'?Number((await db.query('SELECT count(*)::int AS n FROM assistant_work_data_records WHERE owner_key=$1',[owner.key]))[0].n):undefined;
    return { ...consentOf(row), owner: owner.key, transferredRecords };
  }
  async setConsent(userId: string, owner: WorkDataOwner, enabled: boolean, sourceDeviceId: string | null = null) {
    if (typeof enabled !== 'boolean') throw new WorkDataError('WORK_DATA_CONSENT_INVALID');
    return this.db.transaction(async db => {
      await assertWorkDataOwner(db,userId,owner,true);
      // Serialize first grant with revoke/sync, including when the row is new.
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[owner.key]);
      const [old] = await db.query('SELECT * FROM assistant_work_data_consents WHERE owner_key=$1 FOR UPDATE',[owner.key]);
      const oldState=consentOf(old);
      if (sourceDeviceId!==null && !/^[a-f0-9-]{36}$/i.test(sourceDeviceId)) throw new WorkDataError('WORK_DATA_PC_SOURCE_INVALID');
      if (enabled && sourceDeviceId && oldState.storageMode==='stopped') throw new WorkDataError('WORK_DATA_NO_LOCAL_RETURN',409);
      if (enabled && old?.enabled && old.source_device_id && sourceDeviceId && old.source_device_id!==sourceDeviceId) throw new WorkDataError('WORK_DATA_PC_SOURCE_UNAVAILABLE',409);
      const storageMode=!enabled?(old && oldState.storageMode!=='local'?'stopped':'local')
        :oldState.enabled?oldState.storageMode:sourceDeviceId?'transferring':'server';
      const source=enabled?(oldState.storageMode==='stopped'?null:old?.source_device_id??sourceDeviceId):old?.source_device_id??null;
      const epoch = old && oldState.enabled === enabled ? old.epoch : randomUUID();
      const [row] = await db.query(`INSERT INTO assistant_work_data_consents(owner_key,user_id,organization_id,granted_by,epoch,enabled,storage_mode,source_device_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(owner_key) DO UPDATE SET enabled=excluded.enabled,epoch=excluded.epoch,
        granted_by=excluded.granted_by,storage_mode=excluded.storage_mode,source_device_id=excluded.source_device_id,transfer_error=NULL,updated_at=now() RETURNING *`,[owner.key,owner.userId,owner.organizationId,userId,epoch,enabled,storageMode,source]);
      if (!enabled || oldState.storageMode==='stopped') await db.query('DELETE FROM assistant_work_data_records WHERE owner_key=$1',[owner.key]);
      return consentOf(row);
    });
  }
  async transferFailed(userId:string,deviceId:string,ownerKey:unknown,epoch:unknown,code:string) {
    if(typeof ownerKey!=='string' || typeof epoch!=='string' || !/^[A-Z0-9_]{1,64}$/.test(code))return;
    const [consent]=await this.db.query('SELECT * FROM assistant_work_data_consents WHERE owner_key=$1 AND epoch::text=$2 AND source_device_id=$3',[ownerKey,epoch,deviceId]);
    if(!consent)return;
    await assertWorkDataOwner(this.db,userId,ownerOf(consent),true);
    await this.db.query(`UPDATE assistant_work_data_consents c SET transfer_error=$5 WHERE c.owner_key=$1 AND c.epoch::text=$2
      AND c.source_device_id=$3 AND c.enabled=true AND c.storage_mode IN ('transferring','server')
      AND EXISTS(SELECT 1 FROM local_agent_devices d WHERE d.id=$3 AND d.user_id=$4 AND d.status='active')`,[ownerKey,epoch,deviceId,userId,code]);
  }
  async grants(userId: string, deviceId?: string) {
    await assertAccount(this.db,userId);
    if(await getNetureMainMembershipStatus(this.db,userId)!=='active')throw new WorkDataError('WORK_DATA_FORBIDDEN',403);
    const rows = await this.db.query(`SELECT c.* FROM assistant_work_data_consents c WHERE c.enabled=true AND
      (c.user_id=$1 OR EXISTS(SELECT 1 FROM organization_members om WHERE om.organization_id=c.organization_id AND om.user_id=$1 AND om.role='owner' AND om.left_at IS NULL))`,[userId]);
    return rows.filter(row=>consentOf(row).enabled && row.source_device_id===deviceId).map(row => ({ owner:row.owner_key,epoch:row.epoch,storageMode:row.storage_mode,transferError:row.transfer_error??null }));
  }
  async query(userId: string, owner: WorkDataOwner, options: { kind?: string; after?: string; limit?: number } = {}) {
    return this.db.transaction(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[owner.key]);
    const consent = await this.consent(userId,owner,db);
    assertServerReady(consent);
    const {kind,after='',limit=200} = options;
    if ((kind !== undefined && !PHARMACY_KINDS.includes(kind as any)) || typeof after !== 'string' || after.length>100 || !Number.isSafeInteger(limit) || limit<1 || limit>500) throw new WorkDataError('WORK_DATA_PAGE_INVALID');
    const args: unknown[] = [owner.key,after,limit+1];
    const rows = await db.query(`SELECT r.lane,r.entry,r.version,r.mutation_id FROM assistant_work_data_records r WHERE ${effective}
      AND (r.kind||':'||r.id) COLLATE "C">$2 COLLATE "C" ${kind ? 'AND r.kind=$4' : ''} ORDER BY r.kind COLLATE "C",r.id COLLATE "C" LIMIT $3`,kind?[...args,kind]:args);
    const page=rows.slice(0,limit);
    while(page.length>1 && Buffer.byteLength(JSON.stringify(page))>900*1024)page.pop();
    const counts=await db.query(`SELECT r.kind,count(*)::int AS count,max(r.version) AS revision,max(r.updated_at) AS updated_at FROM assistant_work_data_records r WHERE ${effective} GROUP BY r.kind`,[owner.key]);
    return { location:'server', consent, revision:counts.reduce((max,row)=>Math.max(max,Number(row.revision)),0), records:page.map(r=>r.entry), versions:Object.fromEntries(page.map(r=>[key(r.entry),{lane:r.lane,version:Number(r.version)}])),
      next:rows.length>page.length?key(page.at(-1).entry):null, counts:Object.fromEntries(counts.map(r=>[r.kind,r.count])),
      updatedAt:counts.map(r=>new Date(r.updated_at).toISOString()).sort().at(-1)??null };
    });
  }
  async analysis(userId:string,owner:WorkDataOwner) {
    return this.db.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[owner.key]);
      const consent=await this.consent(userId,owner,db);
      assertServerReady(consent);
      // Work on normalized copies. Aggregate by unit; never add unlike measures.
      const movement=await db.query(`WITH e AS (SELECT r.kind,r.id,r.entry->'data' AS d FROM assistant_work_data_records r WHERE ${effective})
        SELECT e.kind,e.d->>'product_id' AS product_id,e.d->>'supplier_id' AS supplier_id,
        CASE WHEN e.kind='purchase' THEN e.d->>'document_type' ELSE e.kind END AS movement,
        CASE WHEN e.kind='purchase' THEN p.d->>'base_unit' ELSE e.d->>'unit' END AS unit,
        sum(CASE WHEN e.kind='purchase' THEN (e.d->>'pack_count')::numeric*(p.d->>'units_per_pack')::numeric*
          CASE WHEN e.d->>'document_type'='return' THEN -1 ELSE 1 END ELSE (e.d->>'quantity')::numeric END)::text AS quantity,
        min(COALESCE(e.d->>'period_from',e.d->>'purchased_at')) AS period_from,
        max(COALESCE(e.d->>'period_to',e.d->>'purchased_at')) AS period_to,count(*)::int AS rows
        FROM e LEFT JOIN e p ON p.kind='pack' AND p.id=e.d->>'pack_id'
        WHERE e.kind IN ('purchase','usage','sale') GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5 LIMIT 101`,[owner.key]);
      const catalog=await db.query(`SELECT r.kind,r.id,r.entry->'data'->>'name' AS name FROM assistant_work_data_records r WHERE ${effective}
        AND r.kind IN ('product','supplier') AND r.id=ANY($2::text[])`,[owner.key,[...new Set(movement.flatMap(r=>[r.product_id,r.supplier_id]).filter(Boolean))]]);
      return {location:'server',owner:owner.key,movement:movement.slice(0,100),catalog,truncated:movement.length>100,
        notice:'보관된 전체 기간의 자료 집계입니다. 프로그램 주문(order)은 구매 입고량과 별도이며 반품은 음수입니다. 집계만으로 현재 재고나 주문량을 확정하지 않습니다.'};
    });
  }
  async sync(userId: string, ownerKey: string, epoch: string, raw: unknown, cursor = 0, collector?: {deviceId:string;complete?:boolean}) {
    const changes=validateMutations(raw);
    if (!positive(cursor) || typeof ownerKey!=='string' || ownerKey.length>80 || typeof epoch!=='string') throw new WorkDataError('WORK_DATA_SYNC_INVALID');
    return this.db.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[ownerKey]);
      const [consent]=await db.query('SELECT * FROM assistant_work_data_consents WHERE owner_key=$1 FOR UPDATE',[ownerKey]);
      const state=consentOf(consent);
      if (!state.enabled || consent.epoch!==epoch) throw new WorkDataError('WORK_DATA_CONSENT_REQUIRED',403);
      const owner=ownerOf(consent);await assertWorkDataOwner(db,userId,owner,true);
      if (collector) {
        if (consent.source_device_id!==collector.deviceId) throw new WorkDataError('WORK_DATA_FORBIDDEN',403);
        if (state.storageMode==='server' && changes.some(c=>c.lane!=='imported')) throw new WorkDataError('WORK_DATA_NO_LOCAL_RETURN',409);
        if (collector.complete && (changes.length || state.storageMode!=='transferring')) {
          if (!(collector.complete && !changes.length && state.storageMode==='server')) throw new WorkDataError('WORK_DATA_TRANSFERRING',409);
        }
      } else assertServerReady(consentOf(consent));
      const accepted: {lane:string;kind:string;id:string;mutationId:string;version:number}[]=[],conflicts: {lane:string;kind:string;id:string;version:number}[]=[];
      for(const change of changes){
        const {lane,entry,expectedVersion,mutationId}=change;
        const [old]=await db.query('SELECT entry,version,mutation_id FROM assistant_work_data_records WHERE owner_key=$1 AND lane=$2 AND kind=$3 AND id=$4 FOR UPDATE',[ownerKey,lane,entry.kind,entry.data.id]);
        if(old?.mutation_id===mutationId && !equal(old.entry,entry))throw new WorkDataError('WORK_DATA_MUTATION_REUSED',409);
        if(old && equal(old.entry,entry)){accepted.push({lane,kind:entry.kind,id:entry.data.id,mutationId,version:Number(old.version)});continue;}
        if(Number(old?.version??0)!==expectedVersion) throw new WorkDataError('WORK_DATA_CONFLICT',409);
        let previous=old?.entry;
        if(entry.kind==='pack') { const [effectiveOld]=await db.query(`SELECT entry FROM assistant_work_data_records WHERE owner_key=$1 AND kind='pack' AND id=$2 ORDER BY CASE lane WHEN 'user' THEN 0 ELSE 1 END LIMIT 1`,[ownerKey,entry.data.id]); previous=effectiveOld?.entry??previous; }
        if(entry.kind==='product') {
          const duplicates=await db.query(`SELECT 1 FROM assistant_work_data_records r WHERE r.owner_key=$1 AND r.kind='product' AND r.id<>$2
            AND r.entry->'data'->>'program'=$3 AND r.entry->'data'->>'program_code'=$4
            AND (($5='imported' AND r.lane='imported') OR (${visibleLane})) LIMIT 1`,[ownerKey,entry.data.id,entry.data.program,entry.data.program_code,lane]);
          if(duplicates.length)throw new WorkDataError('WORK_DATA_PRODUCT_CODE_CONFLICT',409);
        }
        if(lane==='imported' && entry.origin){
          const duplicates=await db.query(`SELECT 1 FROM assistant_work_data_records WHERE owner_key=$1 AND lane='imported' AND kind=$2 AND id<>$3
            AND entry->'origin'->>'program'=$4 AND entry->'origin'->>'source_key'=$5 LIMIT 1`,[ownerKey,entry.kind,entry.data.id,entry.origin.program,entry.origin.source_key]);
          if(duplicates.length)throw new WorkDataError('WORK_DATA_SOURCE_CONFLICT',409);
        }
        assertReplacement(previous,entry,lane);
        await validateReferences(db,ownerKey,entry,changes);
        const [saved]=await db.query(`INSERT INTO assistant_work_data_records(owner_key,lane,kind,id,entry,mutation_id) VALUES($1,$2,$3,$4,$5::jsonb,$6)
          ON CONFLICT(owner_key,lane,kind,id) DO UPDATE SET entry=excluded.entry,mutation_id=excluded.mutation_id,
          version=nextval('assistant_work_data_version_seq'),updated_at=now() RETURNING version`,[ownerKey,lane,entry.kind,entry.data.id,JSON.stringify(entry),mutationId]);
        accepted.push({lane,kind:entry.kind,id:entry.data.id,mutationId,version:Number(saved.version)});
      }
      if (collector) {
        await db.query("UPDATE assistant_work_data_consents SET storage_mode=CASE WHEN $2 THEN 'server' ELSE storage_mode END,transfer_error=NULL,updated_at=now() WHERE owner_key=$1",[ownerKey,collector.complete===true]);
        return {accepted,conflicts,changes:[],cursor:0,more:false,storageMode:collector.complete?'server':state.storageMode};
      }
      return {accepted,conflicts,changes:[],cursor:0,more:false};
    });
  }
}
function assertReplacement(old: PharmacyEntry | undefined, next: PharmacyEntry, lane: string) {
  if(lane==='imported' && old?.origin && (old.origin.program!==next.origin?.program || old.origin.source_key!==next.origin?.source_key || Date.parse(old.origin.collected_at)>Date.parse(next.origin?.collected_at??''))) throw new WorkDataError('WORK_DATA_SOURCE_CONFLICT',409);
  if(old?.kind==='pack' && next.kind==='pack' && ['product_id','base_unit','units_per_pack'].some(k=>old.data[k]!==next.data[k])) throw new WorkDataError('WORK_DATA_PACK_CONFLICT',409);
  if(old?.kind==='sheet' && next.kind==='sheet') for(const receipt of sheetReceipts(old.data)){
    if(!equal(receipt,sheetReceipts(next.data).find(r=>r.supplier_id===receipt.supplier_id)) || !equal(old.data.lines.filter(l=>l.supplier_id===receipt.supplier_id),next.data.lines.filter(l=>l.supplier_id===receipt.supplier_id))) throw new WorkDataError('WORK_DATA_RECEIPT_CONFLICT',409);
  }
}
async function validateReferences(db: Db, owner: string, entry: PharmacyEntry, batch: WorkDataMutation[]) {
  if(entry.kind==='supplier' && !entry.data.enabled){
    const sheets=await db.query(`SELECT r.lane,r.entry FROM assistant_work_data_records r WHERE ${effective} AND r.kind='sheet' AND r.entry->'data'->>'status'='prepared'
      AND EXISTS(SELECT 1 FROM jsonb_array_elements(r.entry->'data'->'lines') l WHERE l->>'supplier_id'=$2) LIMIT 101`,[owner,entry.data.id]);
    for(const sheet of sheets){
      const replacement=batch.find(c=>c.lane==='user' && c.entry.kind==='sheet' && c.entry.data.id===sheet.entry.data.id)?.entry
        ?? (sheet.lane==='user'?sheet.entry:batch.find(c=>c.entry.kind==='sheet' && c.entry.data.id===sheet.entry.data.id)?.entry??sheet.entry);
      if(replacement.data.status==='prepared' && replacement.data.lines.some((line:{supplier_id?:string})=>line.supplier_id===entry.data.id))throw new WorkDataError('WORK_DATA_REFERENCE_CONFLICT',409);
    }
  }
  const needed=new Map<string,PharmacyEntry>();batch.forEach(c=>needed.set(key(c.entry),c.entry));needed.set(key(entry),entry);
  const refs=(e:PharmacyEntry)=>[e.data,...(e.kind==='sheet'?e.data.lines:[])].flatMap(d=>['product','pack','supplier'].flatMap(k=>d[k+'_id']?[[k,String(d[k+'_id'])]]:[]));
  for(let round=0;round<2;round++){
    const wanted=[...needed.values()].flatMap(refs).filter(([k,id])=>!needed.has(k+':'+id));
    if(!wanted.length)break;
    const keys=[...new Set(wanted.map(([k,id])=>k+':'+id))];
    const rows=await db.query(`SELECT r.entry FROM assistant_work_data_records r WHERE ${effective} AND r.kind||':'||r.id=ANY($2::text[])`,[owner,keys]);
    rows.forEach(r=>needed.set(key(r.entry),r.entry));
  }
  try {validatePharmacyLinks([...needed.values()]);} catch {throw new WorkDataError('WORK_DATA_REFERENCE_MISSING',409);}
}
