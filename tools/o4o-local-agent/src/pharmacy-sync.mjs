import { LocalPharmacySyncRepository as journal } from './local-db.mjs';
import { pharmacyDataset } from './pharmacy-data.mjs';
import { PHARMACY_FORMAT, PHARMACY_KINDS, validatePharmacyBundle } from './pharmacy-order-contract.mjs';

function validReply(data) {
  if (!data || !Array.isArray(data.accepted) || data.accepted.length>100 || !Array.isArray(data.changes) || data.changes.length>200
    || !Number.isSafeInteger(data.cursor) || data.cursor<0 || typeof data.more!=='boolean') throw Error('INVALID_SYNC_REPLY');
  for(const row of [...data.accepted,...data.changes]) {
    if(!['imported','user'].includes(row.lane) || !Number.isSafeInteger(row.version) || row.version<1 || !/^[a-zA-Z0-9_-]{16,80}$/.test(row.mutationId??''))throw Error('INVALID_SYNC_REPLY');
    if(row.entry) validatePharmacyBundle({format:PHARMACY_FORMAT,records:[row.entry]},{links:false});
    else if(!PHARMACY_KINDS.includes(row.kind)||!/^[A-Za-z0-9_-]{1,64}$/.test(row.id??''))throw Error('INVALID_SYNC_REPLY');
  }
  return data;
}
/** Existing outbound PC session only. No credentials, SQLite file, traces or manuals uploaded. */
export function createPharmacySync({ post, log = () => {}, now = Date.now }) {
  let running = false, last = -Infinity;
  async function tick(sessionToken, force = false) {
    if(running || (!force && now()-last<15000))return;
    running=true;last=now();
    try {
      const grants=await post('/api/local-agent/work-data/grants',{protocol:'server-authority-v1'},sessionToken);
      if(grants.status!==200 || !Array.isArray(grants.payload?.data))return;
      for(const grant of grants.payload.data) {
        if(typeof grant.epoch!=='string'||!/^[a-f0-9-]{36}$/i.test(grant.epoch)||typeof grant.owner!=='string'||!/^(user|organization):[A-Za-z0-9_-]{1,100}$/.test(grant.owner))continue;
        if(!['transferring','server'].includes(grant.storageMode))continue;
        const dataset=pharmacyDataset(grant.owner);
        journal.configure(dataset,grant.epoch,grant.storageMode);
        if(grant.transferError){journal.fail(dataset,'CONFLICT');continue;}
        // Yield to screen work after bounded batches. Further ticks continue the cursor/outbox.
        for(let batch=0;batch<3;batch++) {
          const pending=journal.pending(dataset);
          while(pending.length>1 && Buffer.byteLength(JSON.stringify(pending))>900*1024)pending.pop();
          for(const row of pending)validatePharmacyBundle({format:PHARMACY_FORMAT,records:[row.entry]},{links:false});
          const result=await post('/api/local-agent/work-data/sync',{protocol:'server-authority-v1',owner:grant.owner,epoch:grant.epoch,changes:pending,cursor:0},sessionToken);
          if(result.status!==200 || !result.payload?.success){
            journal.fail(dataset,result.status===409?'CONFLICT':result.status===403?'CONSENT_REQUIRED':'UNAVAILABLE');break;
          }
          const reply=validReply(result.payload.data);
          if(reply.changes.length)throw Error('SERVER_AUTHORITY_NO_DOWNLOAD');
          const outcome=journal.apply(dataset,grant.epoch,reply);
          if(outcome.conflicts)break;
          const state=journal.state(dataset);
          if(state.pending===0 && state.conflicts===0){
            if(grant.storageMode==='transferring'){
              const finished=await post('/api/local-agent/work-data/sync',{protocol:'server-authority-v1',owner:grant.owner,epoch:grant.epoch,changes:[],cursor:0,complete:true},sessionToken);
              if(finished.status!==200 || !finished.payload?.success || finished.payload.data?.storageMode!=='server'){journal.fail(dataset,'UNAVAILABLE');break;}
              journal.configure(dataset,grant.epoch,'server');
            }
            break;
          }
        }
      }
    }catch {log('업무 자료 동기화를 확인하지 못했습니다. 로컬 자료는 유지됩니다.');}
    finally{running=false;}
  }
  return {tick};
}
