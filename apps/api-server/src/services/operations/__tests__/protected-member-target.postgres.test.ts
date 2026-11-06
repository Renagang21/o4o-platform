import { Client } from 'pg';
import { assertOperatorMemberTarget, protectedMemberSql } from '../protected-member-target.js';
// Explicit loopback-only opt-in. No migrations, global env URL or production connection.
const suite=process.env.O4O_PROTECTED_MEMBER_PG==='1'?describe:describe.skip;
suite('Operator target protection with PostgreSQL 15',()=>{
 const client=new Client({host:'127.0.0.1',port:55459,user:'postgres',database:'postgres',ssl:false});
 const id='00000000-0000-4000-8000-000000000001';
 const db={query:async(sql:string,params?:unknown[])=>(await client.query(sql,params)).rows};
 beforeAll(async()=>{await client.connect();await client.query('CREATE TEMP TABLE role_assignments(user_id uuid,role text,is_active boolean,valid_from timestamptz,valid_until timestamptz)');});
 afterAll(async()=>client.end());
 beforeEach(async()=>{await client.query('TRUNCATE role_assignments');});
 it.each([
  ['platform:super_admin',true,null,null,true],
  ['platform:super_admin',false,null,null,false],
  ['platform:super_admin',true,'2999-01-01',null,false],
  ['platform:super_admin',true,null,'2000-01-01',false],
  ['neture:admin',true,null,null,false],
  ['platform:admin',true,null,null,false],
 ] as const)('evaluates actual active and valid role (%s,%s,%s,%s)',async(role,active,from,until,expected)=>{
  await client.query('INSERT INTO role_assignments VALUES($1,$2,$3,$4,$5)',[id,role,active,from,until]);
  expect((await db.query(`SELECT ${protectedMemberSql('$1::uuid')} AS protected`,[id]))[0].protected).toBe(expected);
  if(expected) await expect(assertOperatorMemberTarget(db as any,id)).rejects.toMatchObject({code:'ADMIN_ACCOUNT_PROTECTED'});
  else await expect(assertOperatorMemberTarget(db as any,id)).resolves.toBeUndefined();
 });
});
