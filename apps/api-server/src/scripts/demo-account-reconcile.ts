/** Owner-only operations entry. Defaults to read-only plan; public targets come from one shared config. */
import { Client } from 'pg';
import { writeFileSync } from 'node:fs';
import { runDemoAccountReconcile } from './demo-account-reconcile.service.js';
import { readPassword, safeInventoryError } from '../../../../scripts/deployment/pharmacy-hub-qr-probes.mjs';

async function main() {
  const mode=process.env.DEMO_ACCOUNTS_MODE ?? 'plan';
  if (!['plan','apply'].includes(mode)) throw new Error('INVALID_OPERATION_MODE');
  if (!process.env.DB_USERNAME?.trim() || !process.env.DB_NAME?.trim()) throw new Error('DATABASE_BINDINGS_MISSING');
  const client = new Client({host:'127.0.0.1',port:55432,user:process.env.DB_USERNAME,
    database:process.env.DB_NAME,password:readPassword(),connectionTimeoutMillis:15000,
    ...(mode==='plan'?{options:'-c default_transaction_read_only=on'}:{})});
  try {
    await client.connect();
    const summary=await runDemoAccountReconcile({query:async(sql,params)=>(await client.query(sql,params)).rows},
      {apply:mode==='apply',expectedDigest:process.env.DEMO_ACCOUNTS_DIGEST});
    console.log(JSON.stringify(summary));
    // Same sanitized result in native Actions annotations, independently reviewable through the GitHub API.
    const notice=JSON.stringify(summary).replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
    console.log(`::notice title=Canonical Demo reconciliation::${notice}`);
    if(process.env.DEMO_ACCOUNTS_OUTPUT) writeFileSync(process.env.DEMO_ACCOUNTS_OUTPUT,JSON.stringify(summary,null,2),{mode:0o600});
  } finally {await client.end();}
}
main().catch(error=>{
  const code=typeof error?.message==='string' && /^[A-Z_]+$/.test(error.message)?error.message:'RECONCILE_FAILED';
  const failure={code,diagnostic:safeInventoryError(error,'demo-account-reconcile').code};
  console.error(JSON.stringify(failure));
  console.error(`::error title=Canonical Demo reconciliation::${JSON.stringify(failure)}`);
  process.exitCode=1;
});
