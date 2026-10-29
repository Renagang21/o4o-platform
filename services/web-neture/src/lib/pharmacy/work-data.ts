import { api, API_BASE_URL } from '../apiClient';
import { toHomeChatScope } from '../ai/home-chat';
import type { WorkScope } from '../work-scope';
import type { PharmacyEntry } from './order';

export interface WorkDataConsent { enabled: boolean; epoch: string | null; owner: string; updatedAt: string | null }
export interface WorkDataSnapshot {
  sync?: {pending:number;conflicts:number;lastSyncedAt:string|null;error:string|null};
  updatedAt?:string|null;
  location: 'pc' | 'server'; revision?: number; consent: WorkDataConsent;
  records: PharmacyEntry[]; next: string | null; counts: Record<string,number>;
  versions?: Record<string,{lane:'user'|'imported';version:number}>;
}
export async function workDataRequest<T>(action:string,workScope:WorkScope,body:Record<string,unknown>={}):Promise<T> {
  try {
    const response=await api.post(`${API_BASE_URL}/api/ai/work-data/${action}`,{...body,workScope:toHomeChatScope(workScope)},{timeout:45000});
    if(!response.data?.success)throw Error(response.data?.error ?? '자료를 확인하지 못했어요.');
    return response.data.data;
  } catch(error) {
    const message=(error as {response?:{data?:{error?:string}}})?.response?.data?.error;
    throw Error(message ?? (error instanceof Error?error.message:'자료를 확인하지 못했어요.'));
  }
}
/** Load working catalogs/sheets only. Histories stay paged on their storage host. */
export async function loadWorkingData(workScope:WorkScope,onProgress?:(count:number)=>void):Promise<WorkDataSnapshot> {
  let result:WorkDataSnapshot|undefined;
  const records:PharmacyEntry[]=[],versions:NonNullable<WorkDataSnapshot['versions']>={};
  for(const kind of ['product','supplier','pack','sheet']) {
    let after:string|null=null;
    do {
      const page:WorkDataSnapshot=await workDataRequest<WorkDataSnapshot>('read',workScope,{kind,after,limit:500});
      if(result && (page.location!==result.location || page.consent.epoch!==result.consent.epoch || page.revision!==result.revision))throw Error('자료가 바뀌었어요. 다시 불러와 주세요.');
      result=page;records.push(...page.records);Object.assign(versions,page.versions);onProgress?.(records.length);
      if(page.next===after && after)throw Error('자료의 다음 페이지를 확인하지 못했어요.');
      after=page.next;
    }while(after);
  }
  return {...result!,records,versions,next:null};
}
