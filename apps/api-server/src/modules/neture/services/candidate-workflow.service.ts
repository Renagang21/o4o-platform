import { createHash } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { ProductCandidateService, type FindCandidatesFilter } from './product-candidate.service.js';
import { candidateIntakeSql, candidateUnsupportedIntakeSql, CANDIDATE_REVIEW_FLAGS } from './candidate-triage.js';
import { resolveOperatorScope, type ServiceScope } from '../../../utils/serviceScope.js';
import { PRODUCT_CANDIDATE_STATUSES, PRODUCT_CANDIDATE_SOURCE_TYPES } from '../entities/ProductCandidate.entity.js';

export class CandidateWorkflowError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
export type CandidateWorkflowAction = 'review' | 'hold' | 'archive' | 'reject';
export function candidateFilter(scope: ServiceScope, input: Record<string, unknown>): FindCandidatesFilter {
  if(input.serviceKey != null && typeof input.serviceKey!=='string') throw new CandidateWorkflowError(400,'INVALID_FILTER');
  for(const key of ['status','sourceType','queue','groupedStatus','reason']) if(input[key]!=null && typeof input[key]!=='string') throw new CandidateWorkflowError(400,'INVALID_FILTER');
  for(const key of ['all','includeShared','bulkOnly']) if(input[key]!=null && ![true,false,'true','false'].includes(input[key] as never)) throw new CandidateWorkflowError(400,'INVALID_FILTER');
  const resolved = resolveOperatorScope(scope,input);
  if (!resolved) throw new CandidateWorkflowError(400,'SERVICE_SCOPE_REQUIRED');
  const requested = typeof input.serviceKey === 'string' ? input.serviceKey.trim() : '';
  if (resolved.serviceKeys?.length === 0 || (requested && requested !== 'all' && resolved.serviceKeys && !resolved.serviceKeys.includes(requested))) throw new CandidateWorkflowError(403,'SERVICE_SCOPE_DENIED');
  if (input.status && !PRODUCT_CANDIDATE_STATUSES.includes(input.status as never)) throw new CandidateWorkflowError(400,'INVALID_STATUS');
  if (input.sourceType && !PRODUCT_CANDIDATE_SOURCE_TYPES.includes(input.sourceType as never)) throw new CandidateWorkflowError(400,'INVALID_SOURCE');
  if (input.queue && !['all','review','intake'].includes(String(input.queue))) throw new CandidateWorkflowError(400,'INVALID_QUEUE');
  if (input.reason && !['identifier_missing','registration_path_unavailable',...Object.keys(CANDIDATE_REVIEW_FLAGS)].includes(String(input.reason))) throw new CandidateWorkflowError(400,'INVALID_REASON');
  const groups = {before_registration:['pending','reviewing'],registered:['matched','linked','approved_new_master'],rejected:['rejected','merged','archived'],pending:['pending'],review_required:['reviewing']} as const;
  if (input.groupedStatus && !Object.hasOwn(groups,String(input.groupedStatus))) throw new CandidateWorkflowError(400,'INVALID_STATUS');
  const text = (key: string, max=200) => { const value=input[key]; if (value == null) return undefined; if (typeof value!=='string' || value.length>max) throw new CandidateWorkflowError(400,'INVALID_FILTER'); return value.trim() || undefined; };
  const serviceKey = requested && requested !== 'all' ? requested : undefined;
  return {
    serviceKey, scopeServiceKeys:resolved.serviceKeys,
    includeShared: (input.includeShared===true || input.includeShared==='true') && serviceKey==='neture' && resolved.serviceKeys?.includes('neture')===true,
    unregisteredOnly:input.groupedStatus==='before_registration',
    candidateStatus: input.status as FindCandidatesFilter['candidateStatus'],
    candidateStatuses: input.groupedStatus ? [...groups[String(input.groupedStatus) as keyof typeof groups]] : undefined,
    sourceType:input.sourceType as FindCandidatesFilter['sourceType'],sourceLabel:text('sourceLabel'),
    organizationId:text('organizationId'),search:text(input.search == null ? 'q' : 'search'),
    queue: input.queue === 'all' ? undefined : input.queue as FindCandidatesFilter['queue'],
    reason:text('reason'),
    bulkOnly:input.bulkOnly===true || input.bulkOnly==='true',
  };
}
export interface CandidateSelection {
  action: CandidateWorkflowAction;
  ids?: string[];
  cutoff?: string;
  expectedCount?: number;
  fingerprint?: string;
  note?: string;
}
const nextStatus = {review:'reviewing',hold:'reviewing',archive:'archived',reject:'rejected'} as const;
export class CandidateWorkflowService {
  constructor(private readonly db: DataSource) {}
  private validate(selection: CandidateSelection) {
    if (selection.note != null && (typeof selection.note!=='string' || selection.note.length>2000)) throw new CandidateWorkflowError(400,'INVALID_NOTE');
    if (!Object.hasOwn(nextStatus,selection.action)) throw new CandidateWorkflowError(400,'INVALID_ACTION');
    if (selection.ids != null && (!Array.isArray(selection.ids) || !selection.ids.length || selection.ids.length>100 || selection.ids.some(id => typeof id!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))) throw new CandidateWorkflowError(400,'INVALID_IDS');
  }
  private query(db: DataSource, filter: FindCandidatesFilter, selection: CandidateSelection, cutoff?: string) {
    const qb=new ProductCandidateService(db).candidateQuery(filter);
    qb.andWhere(selection.action==='review' ? "pc.candidate_status='pending'" : "pc.candidate_status IN ('pending','reviewing')");
    qb.andWhere('pc.matched_product_master_id IS NULL');
    if (selection.ids) qb.andWhere('pc.id IN (:...selectionIds)',{selectionIds:[...new Set(selection.ids)]});
    if (cutoff) qb.andWhere('pc.created_at <= :cutoff AND pc.updated_at <= :cutoff',{cutoff});
    return qb;
  }
  async summary(filter: FindCandidatesFilter) {
    const base=new ProductCandidateService(this.db).candidateQuery({...filter,queue:undefined}).orderBy();
    const counts=await base.clone().select('COUNT(*)::int','total').addSelect(`COUNT(*) FILTER (WHERE ${candidateIntakeSql('pc')})::int`,'intake').addSelect(`COUNT(*) FILTER (WHERE NOT ${candidateIntakeSql('pc')})::int`,'review').getRawOne();
    const sources=await base.clone().select('pc.source_label','sourceLabel').addSelect('COUNT(*)::int','count').groupBy('pc.source_label').orderBy('COUNT(*)','DESC').getRawMany();
    const reasonQuery=base.clone().andWhere("pc.candidate_status IN ('pending','reviewing')").andWhere('pc.matched_product_master_id IS NULL').select('COUNT(*)::int','total');
    for (const flag of Object.keys(CANDIDATE_REVIEW_FLAGS)) reasonQuery.addSelect(`COUNT(*) FILTER (WHERE pc.raw_payload->'reviewFlags' @> :flag_${flag}::jsonb)::int`,flag).setParameter(`flag_${flag}`,JSON.stringify([flag]));
    reasonQuery.addSelect(`COUNT(*) FILTER (WHERE ${candidateUnsupportedIntakeSql('pc')})::int`,'registration_path_unavailable').addSelect("COUNT(*) FILTER (WHERE pc.identifier_value IS NULL OR pc.identifier_value='')::int",'identifier_missing');
    const flags=await reasonQuery.getRawOne();
    return {total:Number(counts.total),intake:Number(counts.intake),review:Number(counts.review),sources,reasons:[{code:'registration_path_unavailable',label:'공공 수집 자료 등록 경로 미지원',count:Number(flags.registration_path_unavailable)},{code:'identifier_missing',label:'식별자 미등록',count:Number(flags.identifier_missing)},...Object.entries(CANDIDATE_REVIEW_FLAGS).map(([code,label])=>({code,label,count:Number(flags[code])})).filter(row=>row.count>0)]};
  }
  private fingerprint(rows: Array<{id:string; version:string}>, filter:FindCandidatesFilter, selection:CandidateSelection, actor:string, cutoff:string) {
    return createHash('sha256').update(JSON.stringify({actor,action:selection.action,filter,note:selection.note?.trim() ?? '',cutoff})).update(JSON.stringify(rows.map(row=>[row.id,row.version]).sort((a,b)=>a[0].localeCompare(b[0])))).digest('hex');
  }
  async preview(filter: FindCandidatesFilter, selection: CandidateSelection, actor:string) {
    this.validate(selection);
    const [{cutoff}]=await this.db.query('SELECT clock_timestamp()::text AS cutoff');
    const rows=await this.query(this.db,filter,selection,cutoff).select('pc.id','id').addSelect('pc.xmin::text','version').take(100001).getRawMany<{id:string;version:string}>();
    const count=rows.length;
    if (count>100000) throw new CandidateWorkflowError(400,'SELECTION_TOO_LARGE');
    return {count,cutoff,action:selection.action,fingerprint:this.fingerprint(rows,filter,selection,actor,cutoff)};
  }
  async execute(filter: FindCandidatesFilter, selection: CandidateSelection, actor: string) {
    this.validate(selection);
    const time=Date.parse(selection.cutoff ?? '');
    if (!Number.isFinite(time) || time>Date.now()+1000 || Date.now()-time>10*60*1000) throw new CandidateWorkflowError(409,'PREVIEW_EXPIRED');
    if (!Number.isSafeInteger(selection.expectedCount) || selection.expectedCount! < 1 || selection.expectedCount! > 100000) throw new CandidateWorkflowError(400,'INVALID_EXPECTED_COUNT');
    const note=selection.note?.trim();
    if ((selection.action==='hold' || selection.action==='reject') && !note) throw new CandidateWorkflowError(400,'REVIEW_NOTE_REQUIRED');
    return this.db.transaction(async manager=>{
      await manager.query("SET LOCAL lock_timeout='3s'");
      await manager.query("SET LOCAL statement_timeout='30s'");
      const transactionDb={getRepository:manager.getRepository.bind(manager)} as DataSource;
      const rows=await this.query(transactionDb,filter,selection,selection.cutoff).select('pc.id','id').addSelect('pc.xmin::text','version').take(100001).setLock('pessimistic_write').getRawMany<{id:string;version:string}>();
      if (rows.length!==selection.expectedCount || this.fingerprint(rows,filter,selection,actor,selection.cutoff!)!==selection.fingerprint) throw new CandidateWorkflowError(409,'SELECTION_CHANGED');
      const ids=rows.map(row=>row.id);
      const values=note ? {candidateStatus:nextStatus[selection.action],reviewNote:()=>"CASE WHEN COALESCE(review_note,'')='' THEN :workflowNote ELSE review_note || chr(10) || :workflowNote END",reviewedBy:actor,reviewedAt:new Date()} : {candidateStatus:nextStatus[selection.action],reviewedBy:actor,reviewedAt:new Date()};
      // One set-based update; no client-side loop over thousands of individual APIs.
      const result=await manager.getRepository('ProductCandidate').createQueryBuilder().update().set(values).setParameter('workflowNote',note ?? null).where('id = ANY(:ids)',{ids}).execute();
      if (result.affected!==ids.length) throw new CandidateWorkflowError(409,'SELECTION_CHANGED');
      return {updated:ids.length,status:nextStatus[selection.action]};
    });
  }
}
