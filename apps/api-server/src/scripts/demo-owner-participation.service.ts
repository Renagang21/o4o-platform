/** Approved STORE_OWNER-only repair. No credentials, roles, consent or ownership writes. */
import { createHash, randomUUID } from 'node:crypto';
import { PUBLIC_DEMO_ACCOUNTS } from '@o4o/auth-utils';

type Row = Record<string, any>;
type Client = { query(sql: string, params?: unknown[]): Promise<Row[]> };
const services = ['community', 'funding'] as const;
const businesses = ['carepharm', 'megapharm'] as const;
const migration = 'demo-owner-participation-v1';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stop = (code: string): never => { throw new Error(code); };

function requireActiveSingle(rows: Row[], code: string) {
  if (rows.length > 1 || rows.some(row=>row.status!=='active')) stop(code);
}

async function inventory(client: Client, lock: boolean) {
  const registry = await client.query(`SELECT d.user_id,u.email,u.status,u."isActive",u."isEmailVerified"
    FROM demo_accounts d JOIN users u ON u.id=d.user_id
    WHERE d.is_active AND d.demo_type='STORE_OWNER' ORDER BY d.user_id ${lock ? 'FOR UPDATE OF d,u' : ''}`);
  if (registry.length !== 1 || registry[0].email !== PUBLIC_DEMO_ACCOUNTS.find(a=>a.type==='STORE_OWNER')!.email)
    stop('AMBIGUOUS_OWNER_DEMO');
  const owner = registry[0];
  if (!owner.isActive || !owner.isEmailVerified || !['active','approved'].includes(owner.status)) stop('OWNER_NOT_ACTIVE');
  const organizations = await client.query(`SELECT om.id,om.organization_id,om.role,om.left_at,pm.id AS pharmacy_id,pm.status
    FROM organization_members om JOIN neture_pharmacy_memberships pm ON pm.organization_id=om.organization_id
    WHERE om.user_id=$1 AND om.role='owner' AND om.left_at IS NULL AND pm.status='active'
    ORDER BY om.id ${lock ? 'FOR UPDATE OF om,pm' : ''}`, [owner.user_id]);
  if (organizations.length !== 1) stop('AMBIGUOUS_APPROVED_DEMO_PHARMACY');
  const organization = organizations[0];
  const memberships = await client.query(`SELECT id,service_key,status,role FROM service_memberships
    WHERE user_id=$1 ORDER BY service_key,id ${lock ? 'FOR UPDATE' : ''}`, [owner.user_id]);
  if (!memberships.some(m=>m.service_key==='neture' && m.status==='active')) stop('MAIN_MEMBERSHIP_REQUIRED');
  const targets = await client.query(`SELECT id,key,status FROM semi_franchises WHERE key=ANY($1::text[])
    ORDER BY key ${lock ? 'FOR UPDATE' : ''}`, [businesses]);
  if (targets.length !== businesses.length || targets.some(b=>b.status!=='active')) stop('BUSINESS_NOT_READY');
  const participation = await client.query(`SELECT id,semi_franchise_id,organization_id,status FROM semi_franchise_memberships
    WHERE organization_id=$1 AND semi_franchise_id=ANY($2::uuid[]) ORDER BY semi_franchise_id,id ${lock ? 'FOR UPDATE' : ''}`,
    [organization.organization_id, targets.map(b=>b.id)]);
  for (const key of services) {
    const current = memberships.filter(m=>m.service_key===key);
    requireActiveSingle(current,'EXISTING_SERVICE_STATE_REQUIRES_REVIEW');
  }
  for (const target of targets) {
    const current = participation.filter(m=>m.semi_franchise_id===target.id);
    requireActiveSingle(current,'EXISTING_BUSINESS_STATE_REQUIRES_REVIEW');
  }
  const missingServices = services.filter(key=>!memberships.some(m=>m.service_key===key));
  const missingBusinesses = targets.filter(b=>!participation.some(m=>m.semi_franchise_id===b.id));
  // Inspection only: never move another Demo's supplier or invent a branch affiliation.
  const supplierCandidates = await client.query(`SELECT s.id,s.organization_id,s.status FROM neture_suppliers s
    JOIN organizations o ON o.id=s.organization_id AND o.type='supplier'
    JOIN organization_members om ON om.organization_id=o.id AND om.user_id=$1 AND om.role='owner' AND om.left_at IS NULL
    ORDER BY s.id`, [owner.user_id]);
  const branchCandidates = await client.query(`SELECT bm.id,bm.organization_id,bm.status FROM branch_memberships bm
    JOIN kpa_organizations ko ON ko.id=bm.organization_id
    WHERE bm.user_id=$1 AND bm.status='active' ORDER BY bm.id`, [owner.user_id]);
  const before = {registry,organizations,memberships,targets,participation,supplierCandidates,branchCandidates};
  return {owner,organization,targets,missingServices,missingBusinesses,before,
    digest:hash({migration,before,services,businesses})};
}

/** Plan on repeatable-read snapshot; apply only the exact approved before-image, atomically. */
export async function runDemoOwnerParticipation(client: Client, options: {apply?: boolean; expectedDigest?: string} = {}) {
  const apply=options.apply===true;
  if (apply && !/^[a-f0-9]{64}$/.test(options.expectedDigest ?? '')) stop('EXACT_PLAN_DIGEST_REQUIRED');
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  let committed=false;
  try {
    await client.query("SET LOCAL statement_timeout='20s'");
    await client.query("SET LOCAL lock_timeout='5s'");
    if (apply) await client.query("SELECT pg_advisory_xact_lock(hashtext('demo-owner-participation-v1'))");
    const plan=await inventory(client,apply);
    const summary={operation:migration,mode:apply?'apply':'plan',digest:plan.digest,
      services:services.map(key=>({key,action:plan.missingServices.includes(key)?'insert':'preserve'})),
      businesses:plan.targets.map(b=>({key:b.key,action:plan.missingBusinesses.some(m=>m.id===b.id)?'insert':'preserve'})),
      qualificationCandidates:{supplier:plan.before.supplierCandidates.length,branch:plan.before.branchCandidates.length},
      participationWrites:plan.missingServices.length+plan.missingBusinesses.length,
      deferred:['supplier: requires own Demo supplier qualification','kpa-branch: requires Demo branch affiliation',
        'cooperative: no new cooperative or speculative enrollment'],
      credentialsRolesConsentAndOwnershipPreserved:true};
    if (!apply) return summary;
    if (plan.digest !== options.expectedDigest) stop('BEFORE_IMAGE_CHANGED_REPLAN');
    if (summary.participationWrites===0) {
      await client.query('COMMIT');committed=true;return {...summary,verified:true,writes:0};
    }
    const [recovery]=await client.query("SELECT to_regclass('public.canonical_demo_repair_snapshots') IS NOT NULL AS ready");
    if (!recovery?.ready) stop('RECOVERY_TABLE_REQUIRED');
    const snapshotKey=migration+'-'+randomUUID();
    const serviceRows=await client.query(`INSERT INTO service_memberships (user_id,service_key,status,role)
      SELECT $1,key,'active',CASE WHEN key='community' THEN 'member' ELSE 'customer' END
      FROM unnest($2::text[]) AS target(key) RETURNING id`,[plan.owner.user_id,plan.missingServices]);
    const businessRows=await client.query(`INSERT INTO semi_franchise_memberships
      (semi_franchise_id,organization_id,status,applied_by,applied_at,decided_at,reason)
      SELECT id,$2,'active',$3,NOW(),NOW(),'Approved synthetic Store Owner Demo participation repair'
      FROM unnest($1::uuid[]) AS target(id) RETURNING id`,
      [plan.missingBusinesses.map(b=>b.id),plan.organization.organization_id,plan.owner.user_id]);
    const added=[...serviceRows.map(row=>({table:'service_memberships',id:row.id})),
      ...businessRows.map(row=>({table:'semi_franchise_memberships',id:row.id}))];
    // Snapshot and insert identities commit with the repaired rows. No sensitive fields leave the DB.
    await client.query(`INSERT INTO canonical_demo_repair_snapshots (migration,snapshot) VALUES ($1,$2::jsonb)`,
      [snapshotKey,JSON.stringify({operation:migration,before:plan.before,added,digest:plan.digest})]);
    const after=await inventory(client,true);
    if (after.missingServices.length || after.missingBusinesses.length) stop('POSTCHECK_FAILED');
    const unchanged=(rows:Row[],afterRows:Row[])=>rows.every(row=>afterRows.some(candidate=>JSON.stringify(candidate)===JSON.stringify(row)));
    if (!unchanged(plan.before.memberships,after.before.memberships) || !unchanged(plan.before.participation,after.before.participation)) stop('EXISTING_ROWS_CHANGED');
    await client.query('COMMIT');committed=true;
    return {...summary,verified:true,writes:added.length+1,recoveryFingerprint:hash(snapshotKey)};
  } finally {
    if (!committed) await client.query('ROLLBACK');
  }
}
