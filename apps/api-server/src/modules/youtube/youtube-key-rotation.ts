import type { DataSource } from 'typeorm';
import type { Cell } from '../../scripts/encryption-key-rotation.js';

/** Only this feature's encrypted fields; compare-and-swap preserves active OAuth/upload changes. */
export async function collectYoutubeKeyCells(db:Pick<DataSource,'query'>):Promise<Cell[]> {
  const cells:Cell[]=[];
  const settings=await db.query(`SELECT key,value FROM settings WHERE type IN ('youtube-credential','youtube-oauth-state')`);
  for(const row of settings){
    const field=row.value?.cipher?'cipher':'verifier';let expected=row.value?.[field];if(typeof expected!=='string')continue;
    cells.push({locator:`settings:${row.key}:${field}`,ciphertext:expected,write:async next=>{
      const rows=await db.query(`UPDATE settings SET value=jsonb_set(value,ARRAY[$2],to_jsonb($3::text),true) WHERE key=$1 AND value->>$2=$4 RETURNING key`,[row.key,field,next,expected]);
      if(!rows.length)throw new Error('YOUTUBE_CREDENTIAL_CHANGED');expected=next;
    },readBack:async()=>{const [current]=await db.query('SELECT value->>$2 AS v FROM settings WHERE key=$1',[row.key,field]);return current?.v??null;}});
  }
  const jobs=await db.query(`SELECT id,instructions FROM automation_jobs WHERE status_note LIKE 'YOUTUBE:%'`);
  for(const row of jobs){
    let value:Record<string,unknown>;try{value=JSON.parse(row.instructions);}catch{continue;}
    let expected=value.sessionCipher;if(typeof expected!=='string')continue;
    cells.push({locator:`automation_jobs:${row.id}:sessionCipher`,ciphertext:expected,write:async next=>{
      const rows=await db.query(`UPDATE automation_jobs SET instructions=jsonb_set(instructions::jsonb,'{sessionCipher}',to_jsonb($2::text),true)::text WHERE id=$1 AND instructions::jsonb->>'sessionCipher'=$3 RETURNING id`,[row.id,next,expected]);
      if(!rows.length)throw new Error('YOUTUBE_UPLOAD_SESSION_CHANGED');expected=next;
    },readBack:async()=>{const [current]=await db.query("SELECT instructions::jsonb->>'sessionCipher' AS v FROM automation_jobs WHERE id=$1",[row.id]);return current?.v??null;}});
  }
  return cells;
}
