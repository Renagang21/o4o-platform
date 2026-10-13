/** Approved Demo transition only. Identity UUIDs and existing business FKs stay intact. */
import { createHash, randomUUID } from 'node:crypto';
import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';
import { passwordCredentialService } from '../services/auth/password-credential.service.js';
import type { EntityManager, DataSource } from 'typeorm';
import { findStoreOrganizationCandidates } from '../utils/store-organization.resolver.js';
import { listSupplierCandidates, hasLegacySupplierIdentityPointer } from '../modules/neture/middleware/supplier-context.resolver.js';

type Row = Record<string, unknown>;
export interface DemoQueryClient { query(sql: string, params?: unknown[]): Promise<Row[]>; }
type Options = { apply?: boolean; expectedDigest?: string };
const types = PUBLIC_DEMO_ACCOUNTS.map(account => account.type);
export const DEMO_REQUIRED_MEMBERSHIPS = {
  STORE_OWNER: ['kpa-society','neture','lecture','community'],
  SUPPLIER: ['supplier','neture','lecture','community'],
  STORE_STAFF: ['kpa-society','neture','lecture','community'],
} as const;
const allowedRoles = { STORE_OWNER: 'neture:store_owner', SUPPLIER: 'neture:supplier', STORE_STAFF: 'kpa:store_member' } as const;
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (code: string): never => { throw new Error(code); };
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value);

/** Foundation provisioning must not replace the registry UUID during an email transition. */
export async function assertFoundationDemoProvisionIdentity(client: DemoQueryClient): Promise<void> {
  const rows = await client.query(`SELECT d.demo_type,u.email FROM demo_accounts d
    LEFT JOIN users u ON u.id=d.user_id WHERE d.is_active AND d.demo_type IN ('STORE_OWNER','SUPPLIER')
    ORDER BY d.demo_type`);
  for (const row of rows) {
    const target = PUBLIC_DEMO_ACCOUNTS.find(account => account.type === row.demo_type);
    if (!target || row.email !== target.email) fail('DEMO_IDENTITY_TRANSITION_REQUIRES_RECONCILE');
  }
}

async function inventory(client: DemoQueryClient, lock: boolean) {
  // pg's adapter returns row arrays, matching the existing credential service's raw-query contract.
  const passwordManager={query:client.query.bind(client)} as Pick<EntityManager,'query'>;
  const registry = await client.query(`SELECT d.id, d.user_id, d.demo_type FROM demo_accounts d
    WHERE d.is_active ORDER BY d.demo_type ${lock ? 'FOR UPDATE' : ''}`);
  for (const row of registry) if (!types.includes(row.demo_type as typeof types[number])) fail('UNKNOWN_ACTIVE_DEMO_TYPE');
  const source = new Map<string, Row>();
  for (const type of types) {
    const entries = registry.filter(row => row.demo_type === type);
    if (entries.length > 1 || (type !== 'STORE_STAFF' && entries.length !== 1)) fail('AMBIGUOUS_BASE_DEMO');
    if (entries.length) source.set(type, entries[0]);
  }
  const ids = registry.map(row => row.user_id);
  if (new Set(ids).size !== ids.length || ids.some(id => !uuid(id))) fail('INVALID_DEMO_IDENTITY');
  const users = await client.query(`SELECT id,email,status,"isActive","isEmailVerified","refreshTokenFamily"
    FROM users WHERE id = ANY($1::uuid[]) OR lower(email) = ANY($2::text[])
    ORDER BY id ${lock ? 'FOR UPDATE' : ''}`, [ids, PUBLIC_DEMO_ACCOUNTS.map(account => account.email)]);
  const scopeIds = users.map(row => row.id);
  const inactiveRegistry=await client.query('SELECT user_id,demo_type FROM demo_accounts WHERE user_id=ANY($1::uuid[]) AND NOT is_active ORDER BY user_id',[scopeIds]);
  if (inactiveRegistry.length) fail('INACTIVE_DEMO_REGISTRY_REQUIRES_REVIEW');
  const roles = await client.query(`SELECT id,user_id,role,is_active,valid_from,valid_until
    FROM role_assignments WHERE user_id = ANY($1::uuid[]) ORDER BY user_id,role,id
    ${lock ? 'FOR UPDATE' : ''}`, [scopeIds]);
  const providers = await client.query(`SELECT "userId" AS user_id,provider FROM linked_accounts
    WHERE "userId" = ANY($1::uuid[]) ORDER BY "userId",provider`, [scopeIds]);
  const passwords = await client.query(`SELECT user_id,password_hash,algo,password_changed_at
    FROM user_password_credentials WHERE user_id = ANY($1::uuid[]) ORDER BY user_id
    ${lock ? 'FOR UPDATE' : ''}`, [scopeIds]);
  const memberships = await client.query(`SELECT id,user_id,service_key,status FROM service_memberships
    WHERE user_id = ANY($1::uuid[]) ORDER BY user_id,service_key,id ${lock ? 'FOR UPDATE' : ''}`, [scopeIds]);
  const relationships = await client.query(`SELECT id,user_id,organization_id,role,left_at,is_primary
    FROM organization_members WHERE user_id = ANY($1::uuid[]) ORDER BY user_id,organization_id,id
    ${lock ? 'FOR UPDATE' : ''}`, [scopeIds]);
  const runtimeDb={query:client.query.bind(client)} as DataSource;
  const ownerId = source.get('STORE_OWNER')!.user_id;
  const ownerOrganizations = await client.query(`SELECT DISTINCT om.organization_id
    FROM organization_members om JOIN neture_pharmacy_memberships pm
      ON pm.organization_id = om.organization_id AND pm.status = 'active'
    WHERE om.user_id = $1 AND om.role = 'owner' AND om.left_at IS NULL
    ORDER BY om.organization_id`, [ownerId]);
  if (ownerOrganizations.length !== 1) fail('AMBIGUOUS_APPROVED_DEMO_STORE');
  const organizationId = ownerOrganizations[0].organization_id;
  if (!uuid(organizationId)) fail('INVALID_DEMO_STORE');
  const ownerRuntimeCandidates=await findStoreOrganizationCandidates(runtimeDb,String(ownerId),'kpa');
  if (ownerRuntimeCandidates.length!==1 || ownerRuntimeCandidates[0].organizationId!==organizationId || ownerRuntimeCandidates[0].memberRole!=='owner') fail('AMBIGUOUS_RUNTIME_DEMO_STORE');
  const storeState = await client.query(`SELECT id,organization_id,status,applicant_user_id FROM neture_pharmacy_memberships
    WHERE organization_id=$1 AND status='active' ORDER BY id ${lock ? 'FOR UPDATE' : ''}`, [organizationId]);
  const supplierLinks = await client.query(`SELECT id,user_id,organization_id,status FROM neture_suppliers
    WHERE organization_id IN
      (SELECT om.organization_id FROM organization_members om JOIN organizations o ON o.id=om.organization_id
        WHERE om.user_id=$1 AND om.left_at IS NULL AND om.role='owner' AND o.type='supplier')
    ORDER BY id ${lock ? 'FOR UPDATE' : ''}`, [source.get('SUPPLIER')!.user_id]);
  const supplierRuntimeCandidates=await listSupplierCandidates(runtimeDb,String(source.get('SUPPLIER')!.user_id));
  if (supplierRuntimeCandidates.length!==1 || supplierLinks.length!==1) fail('AMBIGUOUS_DEMO_SUPPLIER');
  if (supplierLinks[0].id!==supplierRuntimeCandidates[0].supplierId || supplierRuntimeCandidates[0].status!=='ACTIVE') fail('SUPPLIER_DATA_NOT_READY');
  const flags = await client.query(`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid='demo_accounts'::regclass AND conname='chk_demo_accounts_type'`);
  const history = await client.query(`SELECT name FROM typeorm_migrations WHERE name=ANY($1::text[]) ORDER BY name`,
    [['CreateAccountErasureOperations1791777540800','RetireLegacyErasureIdentityHashes1791795139475','AllowStoreStaffDemoAccounts1791810417566']]);
  const schemaReady = flags.length === 1 && String(flags[0].definition).includes("'STORE_STAFF'") &&
    history.some(row=>row.name==='AllowStoreStaffDemoAccounts1791810417566');
  const plans = [];
  for (const account of PUBLIC_DEMO_ACCOUNTS) {
    const base = source.get(account.type);
    const existing = users.filter(row => String(row.email).toLowerCase() === account.email);
    if (existing.length > 1 || (base && existing.some(row => row.id !== base.user_id))) fail('TARGET_IDENTITY_COLLISION');
    const user = base ? users.find(row => row.id === base.user_id) : existing[0];
    if (base && !user) fail('REGISTRY_USER_MISSING');
    if (user) {
      const intendedOrganization=account.type==='SUPPLIER'?supplierRuntimeCandidates[0].organizationId:organizationId;
      const intendedMemberRole=account.type==='STORE_STAFF'?'staff':'owner';
      if (relationships.some(row=>row.user_id===user.id && row.left_at===null &&
        (row.organization_id!==intendedOrganization || row.role!==intendedMemberRole))) fail('UNEXPECTED_DEMO_RUNTIME_RELATION');
      if (account.type!=='SUPPLIER' && await hasLegacySupplierIdentityPointer(runtimeDb,String(user.id))) fail('UNEXPECTED_DEMO_SUPPLIER_POINTER');
      if (!['active','approved'].includes(String(user.status)) || user.isActive !== true || user.isEmailVerified !== true) fail('ACCOUNT_NOT_READY');
      const activeRoles = roles.filter(row => row.user_id === user.id && row.is_active === true);
      // Only the registered owner may retire this observed legacy marker. Never permit it
      // on a target-only identity, supplier or staff, or accept other foreign roles.
      const legacyOwnerRoles = base && account.type === 'STORE_OWNER'
        ? activeRoles.filter(row => row.role === 'kpa:store_owner') : [];
      if (activeRoles.some(row => row.role !== allowedRoles[account.type] && row.role !== 'user' &&
        !legacyOwnerRoles.includes(row))) fail('PROTECTED_OR_FOREIGN_ROLE');
      if (providers.some(row => row.user_id === user.id)) fail('PROVIDER_IDENTITY_REQUIRES_REVIEW');
      if (account.type === 'STORE_STAFF') {
        if (relationships.some(row => row.user_id === user.id &&
          (row.organization_id !== organizationId || row.role !== 'staff' || row.left_at !== null))) fail('FOREIGN_STAFF_RELATIONSHIP');
        if (memberships.some(row => row.user_id === user.id && row.status !== 'active')) fail('STAFF_MEMBERSHIP_NOT_READY');
      } else if (!activeRoles.some(row => row.role === allowedRoles[account.type])) fail('BASE_DEMO_ROLE_MISSING');
    }
    const required=DEMO_REQUIRED_MEMBERSHIPS[account.type];
    if (user && memberships.some(row=>row.user_id===user.id && required.some(key=>key===row.service_key) && row.status!=='active')) fail('REQUIRED_DEMO_MEMBERSHIP_NOT_ACTIVE');
    const membershipReady=!!user && required.every(key=>memberships.some(row=>row.user_id===user.id && row.service_key===key && row.status==='active'));
    const passwordMatches = user ? await passwordCredentialService.verifyPassword(String(user.id),account.password,passwordManager) : false;
    const memberReady = !!user && relationships.some(row => row.user_id === user.id && row.organization_id === organizationId && row.role === 'staff' && row.left_at === null);
    const roleReady = !!user && roles.some(row => row.user_id === user.id && row.role === allowedRoles[account.type] && row.is_active === true &&
      new Date(String(row.valid_from)).getTime() <= Date.now() && (row.valid_until === null || new Date(String(row.valid_until)).getTime() >= Date.now()));
    if (user && account.type !== 'STORE_STAFF' && !roleReady) fail('BASE_DEMO_ROLE_NOT_EFFECTIVE');
    if (user && account.type === 'STORE_STAFF' && !roleReady && roles.some(row => row.user_id === user.id && row.role === allowedRoles.STORE_STAFF && row.is_active === true)) fail('STAFF_ROLE_NOT_EFFECTIVE');
    const retireRoleIds = base && account.type === 'STORE_OWNER' && user
      ? roles.filter(row=>row.user_id===user.id && row.is_active===true && row.role==='kpa:store_owner').map(row=>row.id) : [];
    plans.push({account,user,base,passwordMatches,memberReady,roleReady,membershipReady,retireRoleIds});
  }
  const before = {registry,users,roles,providers,passwords,memberships,relationships,storeState,supplierLinks,ownerRuntimeCandidates,supplierRuntimeCandidates,schema:flags,history};
  const intent = PUBLIC_DEMO_ACCOUNTS.map(account=>({type:account.type,email:account.email,passwordFingerprint:digest(account.password),requiredMemberships:DEMO_REQUIRED_MEMBERSHIPS[account.type],requiredRole:allowedRoles[account.type],retireRegisteredOwnerRole:account.type==='STORE_OWNER'?'kpa:store_owner':null}));
  const changed = plans.filter(plan => !plan.user || plan.user.email !== plan.account.email || !plan.passwordMatches ||
    !plan.base || !plan.membershipReady || plan.retireRoleIds.length>0 || (plan.account.type==='STORE_STAFF' && (!plan.memberReady || !plan.roleReady)));
  return {before,plans,changed,organizationId,schemaReady,digest:digest({before,intent})};
}

/** No row contents, identifiers or hashes are returned to CI logs/artifacts. */
export async function runDemoAccountReconcile(client: DemoQueryClient, options: Options = {}) {
  const passwordManager={query:client.query.bind(client)} as Pick<EntityManager,'query'>;
  const apply = options.apply === true;
  if (apply && !/^[a-f0-9]{64}$/.test(options.expectedDigest ?? '')) fail('EXACT_PLAN_DIGEST_REQUIRED');
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  let committed = false;
  try {
    await client.query("SET LOCAL statement_timeout='20s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    if (apply) await client.query("SELECT pg_advisory_xact_lock(hashtext('canonical-demo-account-reconcile'))");
    const plan = await inventory(client,apply);
    const summary = {mode:apply?'apply':'plan',digest:plan.digest,schemaReady:plan.schemaReady,
      schemaHistory:{privacyPreparation:plan.before.history.some(row=>row.name==='CreateAccountErasureOperations1791777540800'),
        legacyHashRetirement:plan.before.history.some(row=>row.name==='RetireLegacyErasureIdentityHashes1791795139475'),
        staffDemo:plan.before.history.some(row=>row.name==='AllowStoreStaffDemoAccounts1791810417566')},
      accounts:plan.plans.map(item=>({type:item.account.type,identity:item.user?'preserve':'create',registry:!!item.base,
        emailMatches:item.user?.email===item.account.email,passwordMatches:item.passwordMatches,membershipsReady:item.membershipReady,
        legacyOwnerRolesToRetire:item.retireRoleIds.length,
        staffRelation:item.account.type==='STORE_STAFF'?item.memberReady:undefined,
        staffRole:item.account.type==='STORE_STAFF'?item.roleReady:undefined})),
      changes:plan.changed.length,existingBusinessIdentitiesPreserved:true};
    if (!apply) return summary;
    if (plan.digest !== options.expectedDigest) fail('BEFORE_IMAGE_CHANGED_REPLAN');
    if (!plan.schemaReady) fail('STORE_STAFF_SCHEMA_MIGRATION_REQUIRED');
    if (!plan.changed.length) {
      await client.query('COMMIT');committed=true;return {...summary,verified:true,writes:0};
    }
    const recovery = await client.query("SELECT to_regclass('public.canonical_demo_repair_snapshots') IS NOT NULL AS ready");
    if (recovery[0]?.ready !== true) fail('RECOVERY_TABLE_REQUIRED');
    const audit = await client.query(`INSERT INTO canonical_demo_repair_snapshots (migration,snapshot)
      VALUES ($1,$2::jsonb) RETURNING id`, ['demo-accounts-'+randomUUID(),JSON.stringify({before:plan.before,digest:plan.digest})]);
    let writes = 1;
    for (const item of plan.changed) {
      let id = item.user?.id;
      if (!id) {
        const created = await client.query(`INSERT INTO users (email,name,status,"isActive","isEmailVerified")
          VALUES ($1,$2,'active',true,true) RETURNING id`, [item.account.email,'매장 직원 Demo']);
        id=created[0].id;writes++;
      } else if (item.user!.email !== item.account.email) {
        await client.query('UPDATE users SET email=$2 WHERE id=$1',[id,item.account.email]);writes++;
      }
      if (!item.passwordMatches) {
        await passwordCredentialService.setPassword(String(id),item.account.password,passwordManager);writes++;
      }
      // Credential/identity changes revoke all old access, refresh and handoff sessions atomically.
      await client.query('UPDATE users SET "refreshTokenFamily"=$2 WHERE id=$1',[id,randomUUID()]);writes++;
      if (item.retireRoleIds.length) {
        await client.query(`UPDATE role_assignments SET is_active=false,updated_at=now()
          WHERE id=ANY($1::uuid[]) AND user_id=$2 AND role='kpa:store_owner' AND is_active`,[item.retireRoleIds,id]);writes++;
      }
      if (item.account.type==='STORE_STAFF') {
        if (!item.base) {
          await client.query("INSERT INTO demo_accounts (user_id,demo_type,is_active) VALUES ($1,'STORE_STAFF',true)",[id]);writes++;
        }
        if (!item.memberReady) {
          await client.query("INSERT INTO organization_members (organization_id,user_id,role,is_primary) VALUES ($1,$2,'staff',true)",[plan.organizationId,id]);writes++;
        }
        if (!item.roleReady) {
          await client.query(`INSERT INTO role_assignments (user_id,role,is_active,valid_from,assigned_at,created_at,updated_at)
            VALUES ($1,'kpa:store_member',true,now(),now(),now(),now())`,[id]);writes++;
        }
      }
      for (const key of DEMO_REQUIRED_MEMBERSHIPS[item.account.type]) {
        if (!plan.before.memberships.some(row=>row.user_id===id && row.service_key===key)) {
          await client.query("INSERT INTO service_memberships (user_id,service_key,status) VALUES ($1,$2,'active')",[id,key]);writes++;
        }
      }
    }
    const after = await inventory(client,true);
    if (after.changed.length) fail('POST_APPLY_ACCOUNT_VERIFICATION_FAILED');
    for (const type of ['STORE_OWNER','SUPPLIER']) {
      if (after.plans.find(item=>item.account.type===type)!.user!.id !== plan.plans.find(item=>item.account.type===type)!.user!.id) fail('BUSINESS_IDENTITY_MOVED');
    }
    if (digest(after.before.supplierLinks)!==digest(plan.before.supplierLinks) || digest(after.before.storeState)!==digest(plan.before.storeState)) fail('BUSINESS_LINKS_CHANGED');
    await client.query('UPDATE canonical_demo_repair_snapshots SET snapshot=snapshot || $2::jsonb WHERE id=$1',
      [audit[0].id,JSON.stringify({after:after.before,afterDigest:after.digest,verified:true})]);writes++;
    await client.query('COMMIT');committed=true;
    return {...summary,afterDigest:after.digest,verified:true,writes};
  } finally {
    if (!committed) await client.query('ROLLBACK');
  }
}
