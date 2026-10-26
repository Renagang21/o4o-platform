import { randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import express from 'express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { PostgresAuthRateLimitStore, sharedAuthLimiter } from '../auth-rate-limit-store.js';
import { HardenAuthPrivacyReadiness1793010000000 } from '../../database/migrations/1793010000000-HardenAuthPrivacyReadiness.js';

const integration = process.env.O4O_ERASURE_TEST_PORT === '55469' ? describe : describe.skip;
integration('shared authentication limits — disposable PostgreSQL only', () => {
  let db: DataSource;
  const makeStore = () => new PostgresAuthRateLimitStore(async () => db);
  const children: ChildProcess[] = [];
  beforeAll(async () => {
    db = new DataSource({type:'postgres',host:'127.0.0.1',port:55469,username:'agent',database:'o4o_erasure_fixture',entities:[],synchronize:false});
    await db.initialize();
  });
  beforeEach(async () => { await db.query('TRUNCATE auth_rate_limit_counters'); });
  afterAll(async () => {
    for (const child of children) { if(child.connected)child.send('stop');child.kill('SIGTERM'); }
    if(db?.isInitialized){await db.query('TRUNCATE auth_rate_limit_counters');await db.destroy();}
  });

  const worker = (scope:string) => new Promise<{port:number}>((accept,reject) => {
    const root=resolve(__dirname,'../../../../..');
    const module=pathToFileURL(resolve(__dirname,'../auth-rate-limit-store.ts')).href;
    const code=`import {createRequire} from 'node:module';
      import {PostgresAuthRateLimitStore,sharedAuthLimiter} from ${JSON.stringify(module)};
      const require=createRequire(${JSON.stringify(root+'/package.json')});
      const {DataSource}=require('typeorm');const express=require('express');
      const db=new DataSource({type:'postgres',host:'127.0.0.1',port:55469,username:'agent',database:'o4o_erasure_fixture',entities:[],synchronize:false});await db.initialize();
      const app=express();app.post('/login',sharedAuthLimiter(new PostgresAuthRateLimitStore(async()=>db),{scope:${JSON.stringify(scope)},windowMs:900000,max:5,message:'limited',key:()=> 'same-fixture-ip',skipSuccessfulRequests:true}),(_req,res)=>res.status(401).json({success:false}));
      const server=app.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));process.on('message',m=>{if(m==='stop')server.close(async()=>{await db.destroy();process.exit(0);});});`;
    const child=spawn(process.execPath,['--import','tsx','--input-type=module','-e',code],{cwd:root,stdio:['ignore','ignore','pipe','ipc']});
    children.push(child);let stderr='';child.stderr?.on('data',data=>{stderr+=data;});
    child.once('message',message=>accept(message as {port:number}));child.once('error',reject);
    child.once('exit',code=>{if(code)reject(new Error('Isolated auth worker failed: '+stderr.slice(0,160)));});
  });

  it('two independent processes share failures; Google remains a separate bucket',async()=>{
    const scope='login-'+randomUUID();const a=await worker(scope),b=await worker(scope),google=await worker('google-'+randomUUID());
    const post=(port:number)=>fetch(`http://127.0.0.1:${port}/login`,{method:'POST'});
    for(let i=0;i<5;i++)expect((await post(a.port)).status).toBe(401);
    const blocked=await post(b.port);expect(blocked.status).toBe(429);
    expect((await blocked.json() as {code:string}).code).toBe('RATE_LIMITED');
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0);
    expect((await post(google.port)).status).toBe(401);
  },30_000);

  it('concurrent reserves across instances are atomic and store no raw identifier',async()=>{
    const a=makeStore(),b=makeStore();const key='private-identifier@fixture.invalid';
    const leases=await Promise.all(Array.from({length:32},(_,i)=>(i%2?a:b).reserve('parallel',key,60_000)));
    expect(leases.map(x=>x.hits).sort((a,b)=>a-b)).toEqual(Array.from({length:32},(_,i)=>i+1));
    const rows=await db.query('SELECT * FROM auth_rate_limit_counters');expect(rows).toHaveLength(1);
    expect(rows[0].key_digest).toMatch(/^[a-f0-9]{64}$/);expect(JSON.stringify(rows)).not.toContain(key);
    const first=leases.find(lease=>lease.hits===1)!;
    expect(first.resetAt.getTime()-first.now.getTime()).toBe(60_000);
  });

  it('success returns only its own reservation and preserves earlier failures',async()=>{
    const store=makeStore();const failed=await store.reserve('success','ip',60_000);
    const success=await store.reserve('success','ip',60_000);await store.release(success);
    expect((await store.reserve('success','ip',60_000)).hits).toBe(2);
    expect(failed.digest).toBe(success.digest);
  });

  it('a slow success from the old window cannot erase a new window failure',async()=>{
    const store=makeStore();const old=await store.reserve('expiry','ip',60_000);
    await db.query("UPDATE auth_rate_limit_counters SET reset_at=statement_timestamp()-interval '1 second' WHERE scope='expiry'");
    const fresh=await store.reserve('expiry','ip',60_000);expect(fresh.hits).toBe(1);
    await store.release(old);const [row]=await db.query("SELECT hits FROM auth_rate_limit_counters WHERE scope='expiry'");expect(row.hits).toBe(1);
  });

  it('missing store and database errors return 503 before the protected handler',async()=>{
    const store=new PostgresAuthRateLimitStore(async()=>{throw new Error('private backend detail');});
    const handler=jest.fn((_req,res)=>res.sendStatus(200));const app=express();
    app.post('/login',sharedAuthLimiter(store,{scope:'failure',windowMs:60_000,max:5,message:'limited',key:()=> 'ip'}),handler);
    const response=await request(app).post('/login');expect(response.status).toBe(503);
    expect(response.body.code).toBe('AUTH_RATE_LIMIT_UNAVAILABLE');expect(JSON.stringify(response.body)).not.toContain('private backend');expect(handler).not.toHaveBeenCalled();
  });

  it('a database lock is bounded and cannot become a memory-store bypass',async()=>{
    const store=makeStore();const lease=await store.reserve('locked','ip',60_000);const q=db.createQueryRunner();await q.startTransaction();
    try {
      await q.query('SELECT 1 FROM auth_rate_limit_counters WHERE scope=$1 AND key_digest=$2 FOR UPDATE',['locked',lease.digest]);
      await expect(store.reserve('locked','ip',60_000)).rejects.toMatchObject({code:'55P03'});
    } finally {await q.rollbackTransaction();await q.release();}
  },10_000);

  it('migration rollback refuses to discard an active security window',async()=>{
    await makeStore().reserve('rollback','ip',60_000);
    const q=db.createQueryRunner();await q.startTransaction();
    try{await expect(new HardenAuthPrivacyReadiness1793010000000().down(q)).rejects.toThrow('ACTIVE_AUTH_RATE_LIMIT_COUNTERS');}
    finally{await q.rollbackTransaction();await q.release();}
    expect((await db.query("SELECT hits FROM auth_rate_limit_counters WHERE scope='rollback'"))[0].hits).toBe(1);
  });
});
