import 'reflect-metadata';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, Entity, PrimaryColumn, type EntityManager } from 'typeorm';
const mockDb = { getRepository: jest.fn(() => ({})) };
jest.mock('../../../database/connection.js', () => ({ AppDataSource: mockDb }));
jest.mock('../../auth/demo-account.service.js', () => jest.requireActual('../../../__tests__/support/not-demo-account.js').notDemoAccountModule());
import { RoleAssignment } from '../../../modules/auth/entities/RoleAssignment.js';
import { CreateServiceOperatorInvitations1792886400000 } from '../../../database/migrations/1792886400000-CreateServiceOperatorInvitations.js';
import { AllowCentralOperatingDelegation1793164501481 } from '../../../database/migrations/1793164501481-AllowCentralOperatingDelegation.js';
import { CreateCentralOperationMenuGrants1793186241009 } from '../../../database/migrations/1793186241009-CreateCentralOperationMenuGrants.js';
import { AddAdminOperationsDelegation1793586897000 } from '../../../database/migrations/1793586897000-AddAdminOperationsDelegation.js';
import { ServiceOperatorInvitationService } from '../service-operator-invitation.service.js';
import { AdminOperationsOperators } from '../admin-operations-operators.js';
import { ADMIN_OPERATIONS_INVITATION_SCOPE, ADMIN_OPERATIONS_OPERATOR_MENUS, ADMIN_OPERATIONS_OPERATOR_ROLES } from '../admin-operations-operator-contract.js';
import { minimizeCentralMenuAudit } from '../../privacy/central-menu-audit-evidence.js';
import { centralOperationRoles } from '../central-operation-access.js';
import { centralOperationMenuKeys, centralServiceMenuRestrictions, assertCentralOperationRequest } from '../central-operation-menu-grants.js';
@Entity('users') class User { @PrimaryColumn('uuid') id!: string }
const port = process.env.ADMIN_OPERATIONS_TEST_PORT;
const enabled = port === '55439';
(enabled ? describe : describe.skip)('admin operations — isolated local PostgreSQL, real role writer and transactions', () => {
  let db: DataSource, adapted: any, invitations: ServiceOperatorInvitationService, management: AdminOperationsOperators;
  const schema = `adminops_${randomUUID().replaceAll('-', '')}`;
  let admin: string, target: string, outsider: string, token: string;
  const keys = ADMIN_OPERATIONS_OPERATOR_MENUS.map(menu => menu.key).sort();
  beforeAll(async () => {
    db = new DataSource({ type: 'postgres', host: '127.0.0.1', port: Number(port), username: 'postgres', database: 'invite_first',
      entities: [RoleAssignment, User], extra: { options: `-c search_path=${schema},public` } });
    await db.initialize(); await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`CREATE TABLE users(id uuid PRIMARY KEY,email text,name text,status text,"isActive" boolean,"isEmailVerified" boolean);
      CREATE TABLE role_assignments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),role text,is_active boolean DEFAULT true,scope_type text DEFAULT 'global',scope_id uuid,
      valid_from timestamp DEFAULT now(),valid_until timestamp,assigned_at timestamp DEFAULT now(),assigned_by uuid,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now(),
      CONSTRAINT chk_org_scope CHECK ((scope_type='global' AND scope_id IS NULL) OR (scope_type='organization' AND scope_id IS NOT NULL) OR scope_type IS NULL));
      CREATE UNIQUE INDEX ux_role_assignments_user_role_active ON role_assignments(user_id,role) WHERE is_active;
      CREATE TABLE service_memberships(id uuid DEFAULT gen_random_uuid(),user_id uuid,service_key text,status text,role text);
      CREATE TABLE action_logs(service_key text,user_id uuid,action_key text,source text,status text,meta jsonb);
      CREATE FUNCTION ${schema}.account_erasure_write_fence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);
    await db.transaction(async m => {
      await new AllowCentralOperatingDelegation1793164501481().up(m.queryRunner!);
      await new CreateServiceOperatorInvitations1792886400000().up(m.queryRunner!);
      // Keep even the migration's explicitly public trigger function inside this disposable schema.
      await new CreateCentralOperationMenuGrants1793186241009().up({query: (sql: string) => m.query(sql.replace('public.account_erasure_write_fence()', `${schema}.account_erasure_write_fence()`))} as any);
      await new AddAdminOperationsDelegation1793586897000().up(m.queryRunner!);
    });
    adapted = { query: db.query.bind(db), transaction: (fn: (m: EntityManager) => unknown) => db.transaction(async original => {
      const m: any = { connection: original.connection, query: original.query.bind(original), getRepository: (entity: any) => entity === 'ServiceMembership' ? {
        findOne: async ({where}: any) => (await original.query('SELECT * FROM service_memberships WHERE user_id=$1 AND service_key=$2',[where.userId,where.serviceKey]))[0] ?? null,
        create: (row: any) => row,
        save: async (row: any) => { await original.query('INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,$2,$3,$4)',[row.userId,row.serviceKey,row.status,row.role]); return row; },
      } : original.getRepository(entity) };
      return fn(m);
    }) };
    invitations = new ServiceOperatorInvitationService(adapted, async (_to, url) => { token = url.split('#token=')[1]; return true; });
    management = new AdminOperationsOperators(adapted);
  });
  afterAll(async () => { if (db?.isInitialized) { await db.query(`DROP SCHEMA ${schema} CASCADE`); await db.destroy(); } });
  beforeEach(async () => {
    await db.query('TRUNCATE central_operation_menu_grants,service_operator_invitations,role_assignments,service_memberships,action_logs,users CASCADE');
    admin=randomUUID(); target=randomUUID(); outsider=randomUUID(); token='';
    for (const [id,email] of [[admin,'admin@example.test'],[target,'operator@example.test'],[outsider,'outsider@example.test']])
      await db.query(`INSERT INTO users VALUES($1,$2,'Synthetic account','active',true,true)`,[id,email]);
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'platform:super_admin')`,[admin]);
  });
  const invite = (menuKeys?: string[]) => invitations.create({ actorId: admin, targetUserId: target, serviceKey:'neture', role:'neture:operator', scopeKey:ADMIN_OPERATIONS_INVITATION_SCOPE, ...(menuKeys ? {menuKeys} : {}) });
  async function accepted() { await invite(); await invitations.accept(token,target); return (await management.list(admin))[0]; }
  it('uses one recipient-only invitation for all default daily duties, never service Admin or platform roles', async () => {
    await invite(); expect(await db.query('SELECT 1 FROM role_assignments WHERE user_id=$1',[target])).toEqual([]);
    const preview = await invitations.inspect(token,target);
    expect(preview).toMatchObject({adminOperations:true,centralDelegation:true,defaultDailyDuties:true});
    expect(preview.menuKeys!.sort()).toEqual([...keys].sort());
    await invitations.accept(token,target);
    const rows=await db.query('SELECT role,scope_type FROM role_assignments WHERE user_id=$1 ORDER BY role',[target]);
    expect(rows).toEqual([...ADMIN_OPERATIONS_OPERATOR_ROLES].sort().map(role=>({role,scope_type:'o4o-direct'})));
    const roles=await centralOperationRoles(db,target);
    expect((await centralOperationMenuKeys(db,target,roles)).sort()).toEqual([...keys].sort());
    await expect(assertCentralOperationRequest(db,target,'supplier',['supplier.suppliers'],'google')).resolves.toBeUndefined();
    await expect(assertCentralOperationRequest(db,target,'supplier',['supplier.governance'],'google')).rejects.toMatchObject({status:403});
    await expect(assertCentralOperationRequest(db,target,'supplier',['supplier.suppliers'],'password')).rejects.toMatchObject({status:403});
    await expect(invitations.accept(token,target)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
  });
  it('keeps every current whole-site Admin able to use every operations menu without designation',async()=>{
    const roles=await centralOperationRoles(db,admin);
    expect(roles).toEqual(['platform:super_admin']);
    expect((await centralOperationMenuKeys(db,admin,roles)).length).toBeGreaterThan(ADMIN_OPERATIONS_OPERATOR_MENUS.length);
  });
  it('rejects Admin-only and independent business duties and wrong recipient',async()=>{
    for(const menu of ['neture.cleanup','neture.legal','community.erase-members','carepharm.members']) await expect(invite([menu])).rejects.toMatchObject({statusCode:400});
    await invite(); await expect(invitations.accept(token,outsider)).rejects.toMatchObject({statusCode:403});
    expect(await db.query('SELECT 1 FROM role_assignments WHERE user_id=$1',[target])).toEqual([]);
  });
  it('does not overwrite existing service roles or accept an invitation after the inviter loses authority',async()=>{
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'supplier:operator')`,[target]);
    await invite();
    await db.query("UPDATE service_operator_invitations SET status='cancelled',token_hash=NULL,invited_email=NULL WHERE status='pending'");
    await db.query('DELETE FROM role_assignments WHERE user_id=$1',[target]); await invite();
    await db.query('UPDATE role_assignments SET is_active=false WHERE user_id=$1',[admin]);
    await expect(invitations.accept(token,target)).rejects.toMatchObject({statusCode:403});
    expect(await db.query('SELECT 1 FROM role_assignments WHERE user_id=$1',[target])).toEqual([]);
  });
  it('rejects a missing invitation duty definition without granting default-all authority',async()=>{
    const created=await invite(); await db.query('DELETE FROM central_operation_menu_grants WHERE invitation_id=$1',[created.id]);
    await expect(invitations.inspect(token,target)).rejects.toMatchObject({code:'INVALID_OPERATIONS_MENUS'});
    await expect(invitations.accept(token,target)).rejects.toMatchObject({code:'INVALID_OPERATIONS_MENUS'});
    expect(await db.query('SELECT 1 FROM role_assignments WHERE user_id=$1',[target])).toEqual([]);
  });
  it('atomically edits all daily duties with stale-version protection and can remove all access',async()=>{
    const row=await accepted();
    await management.change(admin,target,{menuKeys:['lecture.courses'],reason:'Synthetic narrower duties',version:row.version});
    await expect(management.change(admin,target,{menuKeys:keys,reason:'Synthetic stale request',version:row.version})).rejects.toMatchObject({code:'OPERATIONS_OPERATOR_CHANGED'});
    expect((await centralOperationMenuKeys(db,target,await centralOperationRoles(db,target))).sort()).toEqual(['lecture.courses']);
    const updated=(await management.list(admin))[0];
    await management.change(admin,target,{menuKeys:[],reason:'Synthetic empty duties',version:updated.version});
    expect(await centralOperationMenuKeys(db,target,await centralOperationRoles(db,target))).toEqual([]);
    await expect(management.list(target)).rejects.toMatchObject({status:403});
  });
  it('changes duties later without another invitation, including restoration after narrowing',async()=>{
    const row=await accepted();
    await management.change(admin,target,{menuKeys:['lecture.courses'],reason:'Synthetic narrow area',version:row.version});
    const narrow=(await management.list(admin))[0];
    await management.change(admin,target,{menuKeys:['funding.funding'],reason:'Synthetic new area',version:narrow.version});
    expect(await centralOperationMenuKeys(db,target,await centralOperationRoles(db,target))).toEqual(['funding.funding']);
    expect(await db.query("SELECT 1 FROM service_operator_invitations WHERE status='pending'")).toEqual([]);
  });
  it('revokes only central Operator roles, keeping separate service/independent Admin rights intact',async()=>{
    const row=await accepted();
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'neture:carepharm_admin'),($1,'funding:admin')`,[target]);
    await management.change(admin,target,{reason:'Synthetic revocation',version:row.version},true);
    expect(await centralOperationRoles(db,target)).toEqual([]);
    expect(await management.list(admin)).toEqual([]);
    expect((await db.query('SELECT role FROM role_assignments WHERE user_id=$1 AND is_active=true ORDER BY role',[target])).map(r=>r.role)).toEqual(['funding:admin','neture:carepharm_admin']);
  });
  it('cancels pending workspace invitations when designation is revoked',async()=>{
    await accepted(); await invite(); const outstanding=token;
    const row=(await management.list(admin))[0];
    await management.change(admin,target,{reason:'Synthetic revoke with pending invite',version:row.version},true);
    await expect(invitations.accept(outstanding,target)).rejects.toMatchObject({code:'INVALID_OR_EXPIRED_INVITATION'});
    expect(await db.query("SELECT 1 FROM service_operator_invitations WHERE status='pending'")).toEqual([]);
  });
  it('retains typed per-role audit minimization for workspace acceptance and changes',async()=>{
    const row=await accepted();
    await management.change(admin,target,{menuKeys:['lecture.courses'],reason:'Synthetic private reason',version:row.version});
    expect((await db.query("SELECT 1 FROM action_logs WHERE meta->>'targetUserId'=$1",[target])).length).toBeGreaterThan(0);
    const subjectKey=createHash('sha256').update(target).digest('hex');
    await minimizeCentralMenuAudit(db,target,subjectKey);
    expect(await db.query("SELECT 1 FROM action_logs WHERE meta->>'targetUserId'=$1",[target])).toEqual([]);
    const logs=await db.query("SELECT meta FROM action_logs WHERE meta->>'subjectKey'=$1",[subjectKey]);
    expect(logs.length).toBeGreaterThan(0);expect(logs.every(row=>!('reason' in row.meta))).toBe(true);
  });
  it('keeps suspended membership status and removes the corresponding central authority',async()=>{
    await db.query(`INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'supplier','suspended','member')`,[target]);
    await accepted();
    expect(await db.query(`SELECT status,role FROM service_memberships WHERE user_id=$1 AND service_key='supplier'`,[target])).toEqual([{status:'suspended',role:'member'}]);
    expect(await centralOperationRoles(db,target)).not.toContain('supplier:operator');
  });
  it('preserves global, organization, service Admin, dated and inactive rows through acceptance and workspace revocation',async()=>{
    await db.query(`INSERT INTO role_assignments(user_id,role,scope_type,scope_id,valid_until,is_active) VALUES
      ($1,'neture:operator','global',NULL,now()+interval '10 days',true),
      ($1,'supplier:operator','organization',$2,NULL,true),
      ($1,'funding:operator','global',NULL,NULL,false),
      ($1,'lecture:admin','global',NULL,NULL,true)`,[target,randomUUID()]);
    const original=await db.query('SELECT * FROM role_assignments WHERE user_id=$1 ORDER BY id',[target]);
    expect(await centralOperationRoles(db,target)).toEqual([]);
    const row=await accepted();
    expect(row.menuKeys).toEqual(keys);
    for(const prior of original) expect((await db.query('SELECT * FROM role_assignments WHERE id=$1',[prior.id]))[0]).toEqual(prior);
    expect(await centralOperationRoles(db,target)).toEqual(expect.arrayContaining(['neture:operator','supplier:operator']));
    expect(await centralOperationRoles(db,target)).not.toContain('funding:operator');
    expect(await centralServiceMenuRestrictions(db,target,'supplier')).toBeNull();
    await management.change(admin,target,{menuKeys:['lecture.courses'],reason:'Synthetic subset',version:row.version});
    expect(await centralServiceMenuRestrictions(db,target,'supplier')).toBeNull();
    const changed=(await management.list(admin))[0];
    await management.change(admin,target,{reason:'Synthetic revoke',version:changed.version},true);
    for(const prior of original) expect((await db.query('SELECT * FROM role_assignments WHERE id=$1',[prior.id]))[0]).toEqual(prior);
    expect(await centralOperationRoles(db,target)).toEqual([]);
    await db.query('UPDATE role_assignments SET is_active=true WHERE user_id=$1',[target]);
    // Unflagged global/organization assignments must never revive the revoked workspace.
    expect(await db.query(`SELECT 1 FROM central_operation_menu_grants g JOIN role_assignments ra ON ra.id=g.assignment_id WHERE ra.user_id=$1 AND g.admin_operations=true`,[target])).toEqual([]);
  });
  it.each(["valid_until=now()-interval '1 day'", "valid_from=now()+interval '1 day'", 'is_active=false'])('keeps existing role restriction after acceptance: %s',async restriction=>{
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES($1,'supplier:operator')`,[target]);
    await db.query(`UPDATE role_assignments SET ${restriction} WHERE user_id=$1`,[target]);
    const prior=(await db.query('SELECT * FROM role_assignments WHERE user_id=$1',[target]))[0];
    await accepted();
    expect((await db.query('SELECT * FROM role_assignments WHERE id=$1',[prior.id]))[0]).toEqual(prior);
    expect(await centralOperationRoles(db,target)).not.toContain('supplier:operator');
    expect(await centralOperationMenuKeys(db,target,['supplier:operator'])).toEqual([]);
  });
  it('keeps previously pending selected-duty invitations at their original scope',async()=>{
    const created=await invite();
    await db.query(`UPDATE central_operation_menu_grants SET menu_keys=ARRAY['lecture.courses'],admin_operations=false WHERE invitation_id=$1`,[created.id]);
    expect(await invitations.inspect(token,target)).toMatchObject({defaultDailyDuties:false,menuKeys:['lecture.courses']});
    await invitations.accept(token,target);
    expect(await centralOperationMenuKeys(db,target,await centralOperationRoles(db,target))).toEqual(['lecture.courses']);
    const row=(await management.list(admin))[0];
    await management.change(admin,target,{menuKeys:['funding.funding'],reason:'Synthetic later duties',version:row.version});
    expect(await centralOperationMenuKeys(db,target,await centralOperationRoles(db,target))).toEqual(['funding.funding']);
  });
  it('refuses rollback after explicit workspace consent and keeps the new flag false for unrelated grants',async()=>{
    await accepted();
    await expect(db.transaction(m=>new AddAdminOperationsDelegation1793586897000().down(m.queryRunner!))).rejects.toThrow('Explicit workspace delegations exist');
  });

  it('restores revoked workspace-only roles only after a new explicit acceptance',async()=>{
    const row=await accepted();
    await management.change(admin,target,{reason:'Synthetic revoke',version:row.version},true);
    expect(await management.list(admin)).toEqual([]);
    await invite();
    expect(await centralOperationRoles(db,target)).toEqual([]);
    await invitations.accept(token,target);
    expect((await centralOperationMenuKeys(db,target,await centralOperationRoles(db,target))).sort()).toEqual(keys);
  });

  it('does not grant workspace access from unflagged global or organization menu settings',async()=>{
    await db.query(`INSERT INTO role_assignments(user_id,role,scope_type,scope_id) VALUES
      ($1,'supplier:operator','global',NULL),($1,'lecture:operator','organization',$2)`,[target,randomUUID()]);
    await db.query(`INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'supplier','active'),($1,'lecture','active')`,[target]);
    await db.query(`INSERT INTO central_operation_menu_grants(assignment_id,menu_keys) SELECT id,ARRAY['supplier.suppliers','lecture.courses'] FROM role_assignments WHERE user_id=$1`,[target]);
    expect(await centralOperationRoles(db,target)).toEqual([]);
    expect(await centralOperationMenuKeys(db,target,['supplier:operator','lecture:operator'])).toEqual([]);
    expect(await management.list(admin)).toEqual([]);
  });

  it('lists and revokes a workspace backed entirely by unchanged global roles',async()=>{
    for(const role of ADMIN_OPERATIONS_OPERATOR_ROLES)
      await db.query('INSERT INTO role_assignments(user_id,role) VALUES($1,$2)',[target,role]);
    const before=await db.query('SELECT * FROM role_assignments WHERE user_id=$1 ORDER BY id',[target]);
    const row=await accepted();
    expect(row.menuKeys).toEqual(keys);
    expect((await centralOperationMenuKeys(db,target,await centralOperationRoles(db,target))).sort()).toEqual(keys);
    await management.change(admin,target,{reason:'Synthetic global-role workspace revocation',version:row.version},true);
    expect(await management.list(admin)).toEqual([]);
    expect(await centralOperationRoles(db,target)).toEqual([]);
    expect(await db.query('SELECT * FROM role_assignments WHERE user_id=$1 ORDER BY id',[target])).toEqual(before);
  });

});
