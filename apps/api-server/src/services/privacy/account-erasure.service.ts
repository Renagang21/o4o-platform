import { cooperativeAdminTransferRequired } from './cooperative-erasure-review.js';
import { createHash, randomUUID } from 'node:crypto';
import type { DataSource, EntityManager } from 'typeorm';
import type { AuthProvider } from '../../types/account-linking.js';
import { getNetureMainMembershipStatus } from '../../modules/neture/services/neture-main-membership.js';
import { CALENDAR_EXPIRY_SQL } from './calendar-retention.js';
import { ERASURE_WRITER_GAPS_SQL } from './erasure-writer-manifest.js';
import { CENTRAL_MENU_GRANT_OWNER_SQL } from './central-menu-grant-ownership.js';
import { CENTRAL_MENU_AUDIT_SUBJECT_SQL, minimizeCentralMenuAudit } from './central-menu-audit-evidence.js';

// CORE_CHANGE_REQUIRED — explicit code/local approval of WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1.
// Production account/file execution remains opt-in and requires its own approved rollout.
export class AccountErasureError extends Error {
  constructor(readonly code: string, readonly statusCode: number) { super(code); }
}
export type ErasureState = 'pending' | 'processing' | 'review_required' | 'retry_required' | 'completed';
export interface ErasureResult { operationId: string; state: ErasureState; erased: boolean; reviewCodes: string[]; reviewDueAt: string | null }
export interface PersonalStorage {
  generation(bucket: string, path: string, ownerId: string): Promise<string | null>;
  deleteGeneration(bucket: string, path: string, generation: string, ownerId: string): Promise<void>;
}
export interface ErasureOptions {
  enabled: boolean;
  inventoryReviewed?: boolean;
  systemYears?: 1 | 2;
  systemBasis?: string;
  personalBuckets: readonly string[];
  storage?: PersonalStorage;
}
type ErasureFileTask = {id:string;bucket:string;object_path:string;generation:string|null};
type Operation = { id: string; subject_id: string | null; subject_hash: string; requested_by_key: string; state: ErasureState; review_codes: string[]; review_due_at: Date };
const hash = (id: string) => createHash('sha256').update(id.toLowerCase()).digest('hex');
const quote = (s: string) => '"' + s.replace(/"/g, '""') + '"';
// Exhaustive legacy identity namespaces; recognizing stored data does not enable auth routes.
const AUTH_IDENTITY_NAMESPACES: Readonly<Record<AuthProvider,true>> = {email:true,google:true,kakao:true,naver:true,service:true};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** These are exclusively owned individual rows; business/shared/statutory rows are NOT in this list. */
const PRIVATE_OWNERS: Readonly<Record<string, readonly string[]>> = {
  linked_accounts: ['userId'], user_password_credentials: ['user_id'],
  email_verification_tokens: ['user_id'], password_reset_tokens: ['user_id'], auth_social_flows: ['user_id'],
  browser_session_revocations: ['user_id'], service_session_revocations: ['user_id'],
  handoff_tokens: ['user_id'], notifications: ['userId'],
  cafe24_member_links: ['user_id'], kpa_pharmacist_profiles: ['user_id'], kpa_student_profiles: ['user_id'],
  member_qualifications: ['user_id'], qualification_requests: ['user_id'], kyc_documents: ['user_id'],
  instructor_profiles: ['user_id'], forum_bookmark: ['userId'], forum_like: ['userId'],
  forum_notifications: ['userId'], forum_category_members: ['user_id'],
  assistant_method_sharing_consents:['user_id'], assistant_work_data_consents:['user_id'],
  assistant_run_frames: ['user_id'], assistant_procedural_patterns: ['user_id'], assistant_tasks: ['requested_by_user_id'],
  role_migration_log: ['user_id'], service_memberships: ['user_id'], role_assignments: ['user_id'],
  community_memberships: ['user_id'],
  service_operator_invitations: ['target_user_id', 'accepted_user_id'],
  cooperative_memberships: ['user_id'],
  cooperative_roles: ['user_id'],
  cooperative_management_events: ['actor_id', 'subject_id'],
};

export function calendarExpiry(created: Date, years: 1 | 2): Date {
  if (!Number.isFinite(created.getTime())) throw new AccountErasureError('INVALID_RETENTION_ANCHOR', 409);
  const local = new Date(created.getTime() + 9 * 3600_000);
  return new Date(Date.UTC(local.getUTCFullYear() + years, local.getUTCMonth(), local.getUTCDate(),
    local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds()) - 9 * 3600_000);
}

/** Durable orchestration. A reviewed manifest is required; unknown records are never silently erased or called completed. */
export class AccountErasureService {
  constructor(private readonly db: DataSource, private readonly options: ErasureOptions) {}

  private result(o: Operation): ErasureResult {
    return { operationId: o.id, state: o.state, erased: o.state === 'completed',
      reviewCodes: o.review_codes ?? [], reviewDueAt: o.state === 'completed' ? null : new Date(o.review_due_at).toISOString() };
  }
  private async ready(): Promise<void> {
    if (!this.options.enabled) throw new AccountErasureError('ACCOUNT_ERASURE_ROLLOUT_REQUIRED', 503);
    if(this.options.inventoryReviewed!==true)throw new AccountErasureError('PERSONAL_FILE_INVENTORY_REVIEW_REQUIRED',503);
    if (![1,2].includes(this.options.systemYears ?? 0) ||
        !/^[a-zA-Z0-9:_-]{1,100}$/.test(this.options.systemBasis ?? '')) {
      throw new AccountErasureError('ERASURE_SYSTEM_CLASSIFICATION_REQUIRED',503);
    }
    if (!(await this.capabilities()).enabled) throw new AccountErasureError('ACCOUNT_ERASURE_MIGRATION_REQUIRED', 503);
  }

  async capabilities():Promise<{enabled:boolean}> {
    if (!this.options.enabled || this.options.inventoryReviewed!==true || ![1,2].includes(this.options.systemYears ?? 0) ||
      !/^[a-zA-Z0-9:_-]{1,100}$/.test(this.options.systemBasis ?? '')) return {enabled:false};
    const [r]=await this.db.query(`SELECT to_regclass('public.account_erasure_operations') IS NOT NULL
      AND to_regclass('public.account_erasure_file_tasks') IS NOT NULL
      AND to_regclass('public.account_erasure_reference_keys') IS NOT NULL
      AND to_regclass('public.account_erasure_community_evidence') IS NOT NULL
      AND to_regclass('public.account_erasure_audit_events') IS NOT NULL
      AND to_regproc('public.account_erasure_write_fence') IS NOT NULL
      AND NOT EXISTS(${ERASURE_WRITER_GAPS_SQL})
      AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=to_regclass('public.account_erasure_reference_keys')
        AND conname='account_erasure_uuid_keys_only' AND contype='c' AND convalidated) AS ready`);
    return {enabled:r?.ready===true};
  }

  async request(userId: string, actorId: string): Promise<ErasureResult> {
    if (!UUID.test(userId)) throw new AccountErasureError('INVALID_USER_ID', 400);
    await this.ready();
    if (!UUID.test(actorId ?? '')) throw new AccountErasureError('AUTH_REQUIRED',401);
    // Avoid holding the global barrier behind another worker's storage transaction on a duplicate request.
    const [actor]=await this.db.query(`SELECT u.id FROM users u JOIN role_assignments ra ON ra.user_id=u.id
      WHERE u.id=$1 AND u."isActive"=true AND ra.role='platform:super_admin' AND ra.is_active=true
        AND ra.valid_from<=statement_timestamp() AND (ra.valid_until IS NULL OR ra.valid_until>=statement_timestamp())`,[actorId]);
    if(!actor)throw new AccountErasureError('FORBIDDEN',403);
    const [known]=await this.db.query('SELECT id FROM account_erasure_operations WHERE subject_hash=$1',[hash(userId)]);
    if(known)return this.resume(known.id,actorId);
    const operationId = await this.db.transaction(async m => {
      await m.query("SELECT pg_advisory_xact_lock(hashtextextended('o4o-account-erasure-writes',0))");
      await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [hash(userId)]);
      await this.assertActor(m,actorId);
      const [existing] = await m.query('SELECT * FROM account_erasure_operations WHERE subject_hash=$1 FOR UPDATE', [hash(userId)]);
      if (existing) return existing.id as string;
      const [user] = await m.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      if (!user) throw new AccountErasureError('USER_NOT_FOUND', 404);
      await this.assertTarget(m,userId);
      const active = await m.query("SELECT service_key FROM service_memberships WHERE user_id=$1 AND status='active' FOR UPDATE", [userId]);
      // Stage one is a scoped Operator action. Never silently suspend other services as Admin deletion.
      // Inactive/pending/rejected membership or historical events do not block erasure.
      if (active.length || await getNetureMainMembershipStatus(m,userId)==='active') throw new AccountErasureError('SERVICE_STOP_REQUIRED',409);
      const [o] = await m.query(`INSERT INTO account_erasure_operations(subject_id,subject_hash,requested_by_key,state)
        VALUES($1,$2,$3,'processing') RETURNING id`, [userId, hash(userId),actorId]);
      await m.query("SELECT set_config('o4o.erasure_operation',$1,true)", [o.id]);
      // Account security generation rotates atomically with the durable erasure fence.
      // This is a pending state, never the old deactivation-as-deletion success fallback.
      await m.query('UPDATE users SET "isActive"=false,"refreshTokenFamily"=$2 WHERE id=$1', [userId, randomUUID()]);
      await m.query("UPDATE account_erasure_operations SET state='pending' WHERE id=$1", [o.id]);
      await this.audit(m,o.id,hash(userId),actorId,'requested');
      return o.id as string;
    });
    return this.resume(operationId,actorId);
  }

  async get(operationId: string): Promise<ErasureResult> {
    if (!UUID.test(operationId)) throw new AccountErasureError('INVALID_OPERATION_ID', 400);
    await this.ready();
    const [o] = await this.db.query('SELECT * FROM account_erasure_operations WHERE id=$1', [operationId]);
    if (!o) throw new AccountErasureError('ERASURE_OPERATION_NOT_FOUND', 404);
    return this.result(o);
  }

  async resume(operationId: string, actorId: string): Promise<ErasureResult> {
    if (!UUID.test(operationId)) throw new AccountErasureError('INVALID_OPERATION_ID', 400);
    await this.ready();
    if (!UUID.test(actorId ?? '')) throw new AccountErasureError('AUTH_REQUIRED',401);
    try {
      // Claim, source manifest and DB cleanup are serialised by subject + operation locks.
      const prepared = await this.db.transaction(async m => {
        const [hint] = await m.query('SELECT subject_hash FROM account_erasure_operations WHERE id=$1', [operationId]);
        if (!hint) throw new AccountErasureError('ERASURE_OPERATION_NOT_FOUND', 404);
        await m.query("SELECT pg_advisory_xact_lock(hashtextextended('o4o-account-erasure-writes',0))");
        await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [hint.subject_hash]);
        await this.assertActor(m,actorId);
        const [o]: Operation[] = await m.query('SELECT * FROM account_erasure_operations WHERE id=$1 FOR UPDATE NOWAIT', [operationId]);
        if (o.state === 'completed') return false;
        await m.query("UPDATE account_erasure_operations SET state='processing',error_code=NULL,updated_at=now() WHERE id=$1", [operationId]);
        await m.query("SELECT set_config('o4o.erasure_operation',$1,true)", [operationId]);
        const [user] = await m.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [o.subject_id]);
        if (!user) throw new AccountErasureError('ERASURE_SOURCE_MISSING', 409);
        // Retire legacy contact hashes: a fresh account may reuse contact details.
        await m.query("DELETE FROM account_erasure_reference_keys WHERE operation_id=$1 AND key_kind='identity'",[operationId]);
        await this.captureReferenceKeys(m,operationId,o.subject_id!);
        const reviews = await this.reviewManifest(m, user);
        if (reviews.length) {
          await m.query("UPDATE account_erasure_operations SET state='review_required',review_codes=$2,updated_at=now() WHERE id=$1", [operationId, JSON.stringify(reviews)]);
          return false;
        }
        await this.prepareAvatar(m, operationId, user.avatar);
        await this.reviewPrivateFiles(m, operationId, o.subject_id!);
        // Keep source identities/credentials until file completion; retries never lose a manifest.
        await m.query("UPDATE account_erasure_operations SET state='pending',review_codes='[]',updated_at=now() WHERE id=$1", [operationId]);
        return true;
      });
      if (prepared) {
        await this.removeFiles(operationId,actorId);
        // First pass commits the generation manifest; second performs that exact deletion.
        await this.removeFiles(operationId,actorId);
        await this.finish(operationId,actorId);
      }
    } catch (e) {
      if((e as {code?:string}).code==='55P03')return this.get(operationId);
      if (e instanceof AccountErasureError && ['ERASURE_OPERATION_NOT_FOUND','INVALID_OPERATION_ID','FORBIDDEN','AUTH_REQUIRED'].includes(e.code)) throw e;
      const code = e instanceof AccountErasureError ? e.code : 'ERASURE_STEP_FAILED';
      // Never log a SQL error's detail, source profile or GCS path.
      const review = code.includes('REVIEW_REQUIRED') || ['SUPER_ADMIN_PROTECTED','DEMO_ACCOUNT_FORBIDDEN'].includes(code);
      await this.db.query(`UPDATE account_erasure_operations SET state=$3,error_code=$2,review_codes=$4,updated_at=now()
        WHERE id=$1 AND state<>'completed'`, [operationId, code,review ? 'review_required' : 'retry_required',JSON.stringify(review ? [code] : [])]);
    }
    return this.get(operationId);
  }

  private async tables(m: EntityManager): Promise<Array<{ schema_name: string; table_name: string; columns: string[] }>> {
    return m.query(`SELECT n.nspname AS schema_name,c.relname AS table_name,
      array_agg(a.attname::text ORDER BY a.attnum) AS columns FROM pg_class c
      JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
      WHERE c.relkind IN ('r','m') AND n.nspname IN ('public','neture','cosmetics') AND a.attnum>0 AND NOT a.attisdropped
      AND c.relname NOT IN ('users','o4o_schema_baselines','typeorm_migrations')
      AND c.relname NOT LIKE 'account_erasure_%' GROUP BY n.nspname,c.relname ORDER BY n.nspname,c.relname`);
  }

  private async captureReferenceKeys(m: EntityManager, operationId: string, userId: string): Promise<void> {
    const ids = new Set<string>([userId]);
    for (const t of await this.tables(m)) {
      const owners = t.schema_name === 'public' ? PRIVATE_OWNERS[t.table_name] : undefined;
      const where = t.schema_name === 'public' && t.table_name === 'central_operation_menu_grants'
        ? CENTRAL_MENU_GRANT_OWNER_SQL
        : owners?.filter(c => t.columns.includes(c)).map(c => `r.${quote(c)}::text=$1`).join(' OR ');
      if (!where || !t.columns.includes('id')) continue;
      const rows = await m.query(`SELECT r.id FROM public.${quote(t.table_name)} r WHERE ${where}`, [userId]);
      for (const r of rows) if (UUID.test(String(r.id))) ids.add(r.id);
    }
    for (const id of ids) await m.query(`INSERT INTO account_erasure_reference_keys(operation_id,reference_id,key_hash)
      VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [operationId,id,hash(id)]);
  }

  private async identityTokens(m: EntityManager, user: Record<string, unknown>): Promise<{ tokens: string[]; providers: { provider: string; id: string }[] }> {
    // These identify THIS subject. Actor/alias/provider values in arbitrary metadata
    // are not globally unique subject keys; their typed domain handlers require review.
    const tokens=new Set<string>([String(user.id),String(user.email)]);
    for(const r of await m.query(`SELECT k.reference_id FROM account_erasure_reference_keys k
      JOIN account_erasure_operations o ON o.id=k.operation_id WHERE o.subject_id=$1`,[user.id])) {
      if(r.reference_id)tokens.add(String(r.reference_id));
    }
    // Whitelisted typed subject identifiers; never guess identity from arbitrary metadata actors.
    const providers: { provider: string; id: string }[] = [];
    if(typeof user.provider_id==='string' && user.provider_id.length) {
      if(typeof user.provider==='string' && user.provider.length)providers.push({provider:user.provider,id:user.provider_id});
      else tokens.add(user.provider_id); // Unattributed legacy source requires domain review.
    }
    for(const linked of await m.query('SELECT provider,"providerId",email FROM linked_accounts WHERE "userId"=$1',[user.id])) {
      if(typeof linked.email==='string' && linked.email.length)tokens.add(linked.email);
      if(typeof linked.providerId==='string' && linked.providerId.length)providers.push({provider:linked.provider,id:linked.providerId});
    }
    return {tokens:[...tokens],providers};
  }

  private async reviewManifest(m: EntityManager, user: Record<string, unknown>, frozenTokens?: Awaited<ReturnType<AccountErasureService["identityTokens"]>>): Promise<string[]> {
    const identities = frozenTokens ?? await this.identityTokens(m,user);
    const tokens = identities.tokens;
    const localPart = "[:alnum:]_.!#$%&'*+/=?^`{|}~-";
    const patterns = tokens.filter(v=>v.length>=2).map(v => {
      const escaped=v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      // A unique email is not a substring identity: preserve another person's longer address.
      return v.includes('@') ? `(^|[^${localPart}])${escaped}(?![[:alnum:]-]|\\.[[:alnum:]-])`
        : UUID.test(v) ? escaped : `(^|[^[:alnum:]_.-])${escaped}($|[^[:alnum:]_.-])`;
    });
    const shortTokens=tokens.filter(v=>v.length<2);
    // Search attributed identifier values, not JSON column/key names or another actor’s profile.
    const leaf=(alias:string, attributionOnly=false)=>`jsonb_path_query_array(to_jsonb(${alias})
      ${attributionOnly ? "- ARRAY['assigned_by','granted_by']" : ''}
      - ARRAY['role','status','action','service_key','serviceKey','provider','mime_type','mimeType','asset_type','type'],
      '$.** ? (@.type() == "string")')`;
    // Provider IDs belong to a namespace. Unattributed copies still need domain review,
    // but an explicit different provider is another identity, even when the ID is equal.
    const providerPatterns=identities.providers.map(p=>({provider:p.provider,
      pattern:new RegExp(`(^|[^a-zA-Z0-9_.-])${p.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^a-zA-Z0-9_.-])`,'i')}));
    const providerCopies=(value:unknown):boolean => {
      if(typeof value==='string')return providerPatterns.some(p=>p.pattern.test(value));
      if(Array.isArray(value))return value.some(v=>providerCopies(v));
      if(value && typeof value==='object') {
        const object=value as Record<string,unknown>;
        // Only the typed providerId field belongs to this namespace. A storage/provider
        // column never scopes memo, contacts, sibling fields or nested identity objects.
        const namespace=typeof object.provider==='string' && Object.prototype.hasOwnProperty.call(AUTH_IDENTITY_NAMESPACES,object.provider) ? object.provider : undefined;
        return Object.entries(object).some(([key,v])=> {
          if(key==='provider')return false;
          if(['providerId','provider_id'].includes(key) && namespace && typeof v==='string')return providerPatterns.some(p=>p.provider===namespace && p.pattern.test(v));
          return providerCopies(v);
        });
      }
      return false;
    };
    const providerReview=async(table:string, exclusion:string, attributionOnly=false):Promise<boolean> => {
      if(!identities.providers.length)return false;
      // SQL boundaries remove short-ID timestamp candidates. A transaction cursor bounds
      // Node memory even when many genuine candidates require namespace/domain inspection.
      await m.query(`DECLARE erasure_provider_scan NO SCROLL CURSOR FOR
        SELECT (to_jsonb(r) ${attributionOnly ? "- ARRAY['assigned_by','granted_by']" : ''}) AS payload FROM ${table} r WHERE $1::text IS NOT NULL AND
        jsonb_path_query_array(to_jsonb(r) ${attributionOnly ? "- ARRAY['assigned_by','granted_by']" : ''},'$.** ? (@.type() == "string")')::text
        ~* ANY($2::text[]) ${exclusion}`,[user.id,identities.providers.map(p=>
          `(^|[^[:alnum:]_.-])${p.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}($|[^[:alnum:]_.-])`)]);
      try {
        for (;;) {
          const rows: {payload:unknown}[]=await m.query('FETCH FORWARD 64 FROM erasure_provider_scan');
          if(rows.some(r=>providerCopies(r.payload)))return true;
          if(rows.length<64)return false;
        }
      } finally { await m.query('CLOSE erasure_provider_scan'); }
    };
    const codes: string[] = [];
    const [otherUsers]=await m.query(`SELECT count(*)::int AS n FROM users r WHERE r.id<>$1
      AND (${leaf('r')}::text ~* ANY($2::text[]) OR ${leaf('r')} ?| $3::text[])`,[user.id,patterns,shortTokens]);
    if(otherUsers.n || await providerReview('public.users','AND r.id::text<>$1'))codes.push('REVIEW:public.users');
    const [soleAdmin] = await m.query(`SELECT count(*)::int AS n FROM community_memberships target
      WHERE target.user_id=$1 AND target.role='admin' AND target.status='active'
      AND NOT EXISTS(SELECT 1 FROM community_memberships other JOIN users u ON u.id=other.user_id
        WHERE other.community_id=target.community_id AND other.user_id<>$1 AND other.role='admin'
        AND other.status='active' AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved')
        AND EXISTS(SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='community' AND sm.status='active')
        AND NOT EXISTS(SELECT 1 FROM service_memberships sm WHERE sm.user_id=u.id AND sm.service_key='neture' AND sm.status IN ('suspended','withdrawn')))`, [user.id]);
    if (soleAdmin.n) codes.push('COMMUNITY_MANAGEMENT_TRANSFER_REQUIRED');
    if (await cooperativeAdminTransferRequired(m,user.id as string)) codes.push('COOPERATIVE_MANAGEMENT_TRANSFER_REQUIRED');
    for (const t of await this.tables(m)) {
      const table = `${quote(t.schema_name)}.${quote(t.table_name)}`;
      const owners = t.schema_name === 'public' ? PRIVATE_OWNERS[t.table_name] : undefined;
      let predicate = owners?.filter(c => t.columns.includes(c)).map(c => `r.${quote(c)}::text=$1`).join(' OR ');
      // Personal work copies cascade with the user's consent row; organizational
      // copies are reviewed independently and never erased as the grant actor's data.
      if(t.schema_name==='public' && t.table_name==='assistant_work_data_records')predicate="r.owner_key='user:'||$1::text";
      if (t.schema_name === 'public' && t.table_name === 'central_operation_menu_grants') {
        predicate = CENTRAL_MENU_GRANT_OWNER_SQL;
      }
      if (t.schema_name === 'public' && t.table_name === 'action_logs') {
        predicate = `COALESCE((${CENTRAL_MENU_AUDIT_SUBJECT_SQL}),false)`;
      }
      if (t.schema_name === 'public' && t.table_name === 'service_operator_invitations') {
        predicate = `(${predicate}) OR (r.target_user_id IS NULL AND lower(r.invited_email)=(SELECT lower(email) FROM users WHERE id::text=$1))`;
        // Typed invitation ownership: preserve peer invitations. The inviter FK is attribution only
        // and ON DELETE SET NULL clears it; token hashes/role names are not copied identities.
        const [other] = await m.query(`SELECT count(*)::int AS n FROM service_operator_invitations r
          WHERE NOT COALESCE((${predicate}),false) AND lower(r.invited_email)=ANY($2::text[])`, [user.id, tokens.map(v=>v.toLowerCase())]);
        if (other.n) codes.push('REVIEW:public.service_operator_invitations');
        continue;
      }
      // Null-only FK attribution can be cleared by the final FK action. Its JSON/free text
      // is still found by the full-row identity scan; business/branch records remain explicit reviews.
      if (t.table_name === 'community_membership_changes') {
        const [other] = await m.query(`SELECT count(*)::int AS n FROM community_membership_changes h
          JOIN community_memberships cm ON cm.id=h.membership_id WHERE cm.user_id<>$1
          AND h.actor_user_id IS DISTINCT FROM $1 AND (${leaf('h')}::text ~* ANY($2::text[])
          OR ${leaf('h')} ?| $3::text[])`, [user.id,patterns,shortTokens]);
        if (other.n || await providerReview(table, 'AND r.actor_user_id::text IS DISTINCT FROM $1 AND NOT EXISTS(SELECT 1 FROM community_memberships cm WHERE cm.id=r.membership_id AND cm.user_id::text=$1)')) codes.push('REVIEW:public.community_membership_changes');
        if (!this.options.systemYears || !this.options.systemBasis?.trim()) {
          const [h] = await m.query(`SELECT count(*)::int AS n FROM community_membership_changes h
            JOIN community_memberships cm ON cm.id=h.membership_id WHERE cm.user_id=$1 OR h.actor_user_id=$1`, [user.id]);
          if (h.n) codes.push('COMMUNITY_SYSTEM_CLASSIFICATION_REQUIRED');
        }
        continue;
      }
      // The grant belongs to user_id. assigned_by is attribution only and its
      // existing ON DELETE SET NULL FK clears it; every other field is still scanned.
      const roleAttribution = t.schema_name === 'public' && ['role_assignments','assistant_work_data_consents'].includes(t.table_name);
      const [r] = await m.query(`SELECT count(*)::int AS n FROM ${table} r
        WHERE $1::text IS NOT NULL AND (${leaf('r',roleAttribution)}::text ~* ANY($2::text[]) OR ${leaf('r',roleAttribution)} ?| $3::text[])
        ${predicate ? `AND NOT (${predicate})` : ''}`, [user.id, patterns,shortTokens]);
      if (r.n || await providerReview(table,predicate ? `AND NOT (${predicate})` : '',roleAttribution)) codes.push(`REVIEW:${t.schema_name}.${t.table_name}`);
    }
    // Verify the migration's writer fence on every scanned table and users, including tables added later.
    const [missing] = await m.query(`SELECT count(*)::int AS n FROM (${ERASURE_WRITER_GAPS_SQL}) missing`);
    if (missing.n) codes.push('WRITER_MANIFEST_REQUIRES_REFRESH');
    return codes;
  }

  private async separateCommunityEvidence(m: EntityManager, userId: string): Promise<void> {
    const rows = await m.query(`SELECT h.*,h.created_at::text AS created_at_exact,
      (isfinite(h.created_at) AND h.created_at<=statement_timestamp()) AS valid_anchor,
      cm.user_id AS target_user_id FROM community_membership_changes h
      JOIN community_memberships cm ON cm.id=h.membership_id WHERE cm.user_id=$1 OR h.actor_user_id=$1 FOR UPDATE OF h`, [userId]);
    for (const h of rows) {
      // Self withdrawal/system migration are not copied into a statutory operator archive.
      if (h.action === 'migration' || (h.action === 'withdraw' && h.actor_user_id === h.target_user_id)) continue;
      if (!this.options.systemYears || !this.options.systemBasis) throw new AccountErasureError('COMMUNITY_SYSTEM_CLASSIFICATION_REQUIRED', 409);
      const created = new Date(h.created_at);
      if (h.valid_anchor!==true || !Number.isFinite(created.getTime()) || created > new Date()) throw new AccountErasureError('INVALID_RETENTION_ANCHOR', 409);
      await m.query(`INSERT INTO account_erasure_community_evidence
        (source_event_id,community_id,subject_key,actor_key,action,before_role,after_role,before_status,after_status,occurred_at,expires_at,retention_years,policy_basis)
        SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,source_at,expiry,$11,$12
        FROM (SELECT $10::timestamptz AS source_at,$11::integer AS years) inputs
        CROSS JOIN LATERAL (SELECT ${CALENDAR_EXPIRY_SQL} AS expiry) duration
        WHERE expiry>statement_timestamp() ON CONFLICT(source_event_id) DO NOTHING`,
      [h.id,h.community_id,h.target_user_id,h.actor_user_id,h.action,h.before_role,h.after_role,h.before_status,h.after_status,h.created_at_exact,this.options.systemYears,this.options.systemBasis]);
    }
    // Both subject and actor erasure remove the identifying free-text live history; minimum evidence is independent.
    await m.query(`DELETE FROM community_membership_changes h USING community_memberships cm
      WHERE cm.id=h.membership_id AND (cm.user_id=$1 OR h.actor_user_id=$1)`, [userId]);
  }

  private async removePrivateRows(m: EntityManager, userId: string): Promise<void> {
    const tables = await this.tables(m);
    if (tables.some(t => t.schema_name === 'public' && t.table_name === 'action_logs')) {
      await minimizeCentralMenuAudit(m,userId,hash(userId));
    }
    // Remove only this subject's settings before role parents disappear or invitations
    // become retained anonymous events. A peer's invitation/grant remains untouched.
    if (tables.some(t => t.schema_name === 'public' && t.table_name === 'central_operation_menu_grants')) {
      await m.query(`DELETE FROM central_operation_menu_grants r WHERE ${CENTRAL_MENU_GRANT_OWNER_SQL}`, [userId]);
    }
    for (const [table, owners] of Object.entries(PRIVATE_OWNERS)) {
      const t = tables.find(x => x.schema_name === 'public' && x.table_name === table);
      if (!t) continue;
      let where = owners.filter(c => t.columns.includes(c)).map(c => `${quote(c)}::text=$1`).join(' OR ');
      if (table === 'service_operator_invitations') {
        where = `(${where}) OR invited_by_user_id::text=$1 OR (target_user_id IS NULL AND lower(invited_email)=(SELECT lower(email) FROM users WHERE id::text=$1))`;
        // Keep the time-limited event, not this subject's identity or delivery data.
        await m.query(`UPDATE service_operator_invitations SET
          status=CASE WHEN status='pending' THEN 'cancelled' ELSE status END,
          invited_email=NULL,token_hash=NULL,
          target_user_id=CASE WHEN target_user_id::text=$1 THEN NULL ELSE target_user_id END,
          accepted_user_id=CASE WHEN accepted_user_id::text=$1 THEN NULL ELSE accepted_user_id END,
          invited_by_user_id=CASE WHEN invited_by_user_id::text=$1 THEN NULL ELSE invited_by_user_id END
          WHERE ${where}`,[userId]);
        continue;
      }
      if (where) await m.query(`DELETE FROM public.${quote(table)} WHERE ${where}`, [userId]);
    }
  }

  private async prepareAvatar(m: EntityManager, operationId: string, avatar: unknown): Promise<void> {
    if (typeof avatar !== 'string' || !avatar) return;
    let url: URL;
    try { url = new URL(avatar); } catch { throw new AccountErasureError('PERSONAL_FILE_MANIFEST_REVIEW_REQUIRED', 409); }
    if (url.protocol !== 'https:') throw new AccountErasureError('PERSONAL_FILE_MANIFEST_REVIEW_REQUIRED', 409);
    if (url.hostname !== 'storage.googleapis.com') return; // provider URL is not an owned object
    const [bucket, ...parts] = url.pathname.slice(1).split('/');
    const path = decodeURIComponent(parts.join('/'));
    if (!this.options.personalBuckets.includes(bucket) || !path || path.includes('..') || url.search) {
      throw new AccountErasureError('PERSONAL_FILE_MANIFEST_REVIEW_REQUIRED', 409);
    }
    // A library/shared asset requires ownership/link review, never uploader-based deletion.
    const [used] = await m.query('SELECT count(*)::int AS n FROM media_assets WHERE url=$1 OR gcs_path=$2', [avatar,path]);
    if (used.n) throw new AccountErasureError('PERSONAL_FILE_SHARED_USAGE_REVIEW_REQUIRED', 409);
    const objectHash = createHash('sha256').update(`${bucket}/${path}`).digest('hex');
    await m.query(`INSERT INTO account_erasure_file_tasks(operation_id,object_hash,bucket,object_path)
      VALUES($1,$2,$3,$4) ON CONFLICT(operation_id,object_hash) DO NOTHING`, [operationId,objectHash,bucket,path]);
  }

  private async reviewPrivateFiles(m: EntityManager, operationId: string, userId: string): Promise<void> {
    const tables = await this.tables(m);
    for (const [name, owners] of Object.entries(PRIVATE_OWNERS)) {
      const t = tables.find(x => x.schema_name === 'public' && x.table_name === name);
      if (!t) continue;
      const fields = t.columns.filter(c => /(?:file|attachment|document|image|avatar|picture|path|url|metadata|payload|body|content)/i.test(c));
      if (!fields.length) continue;
      const where = owners.filter(c => t.columns.includes(c)).map(c => `${quote(c)}::text=$1`).join(' OR ');
      if (!where) continue;
      const rows = await m.query(`SELECT ${fields.map(quote).join(',')} FROM public.${quote(name)} WHERE ${where}`, [userId]);
      // Private credentials may contain provider URLs; owned GCS pointers/local attachments
      // must be reviewed before removing their only database manifest.
      for (const row of rows) for (const [field, value] of Object.entries(row)) {
        if (value == null || value === '' || (Array.isArray(value) && !value.length)) continue;
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        if (/storage\.googleapis\.com|(?:gcs|gs):\/\/|(?:^|\s)(?:uploads|media)\//i.test(text) ||
            /(?:file_?path|file_?url|attachment|gcs_?path)/i.test(field)) {
          throw new AccountErasureError('PRIVATE_ATTACHMENT_MANIFEST_REVIEW_REQUIRED', 409);
        }
      }
    }
    // Keep operationId in the signature to make the required manifest boundary explicit.
    if (!operationId) throw new AccountErasureError('INVALID_OPERATION_ID', 400);
  }

  private async assertTarget(m:EntityManager,userId:string):Promise<void> {
    const grants=await m.query(`SELECT id,
      (valid_until IS NULL OR valid_until>=statement_timestamp()) AS protected_grant
      FROM role_assignments WHERE user_id=$1 AND role='platform:super_admin' AND is_active=true FOR SHARE`,[userId]);
    // Scheduled unexpired grants stay protected: time alone must not activate one during irreversible work.
    if(grants.some((g:{protected_grant:boolean})=>g.protected_grant))throw new AccountErasureError('SUPER_ADMIN_PROTECTED',403);
    const demo=await m.query('SELECT user_id FROM demo_accounts WHERE user_id=$1 AND is_active FOR SHARE',[userId]);
    if(demo.length)throw new AccountErasureError('DEMO_ACCOUNT_FORBIDDEN',403);
  }

  private async assertActor(m:EntityManager,actorId:string):Promise<void> {
    const [actor]=await m.query(`SELECT u.id FROM users u JOIN role_assignments ra ON ra.user_id=u.id
      WHERE u.id=$1 AND u."isActive"=true AND ra.role='platform:super_admin' AND ra.is_active=true
        AND ra.valid_from<=statement_timestamp() AND (ra.valid_until IS NULL OR ra.valid_until>=statement_timestamp()) FOR SHARE OF u,ra`,[actorId]);
    if(!actor)throw new AccountErasureError('FORBIDDEN',403);
  }

  private async removeFiles(operationId: string,actorId: string): Promise<void> {
    await this.db.transaction(async m => {
      await this.assertActor(m,actorId);
      const [o] = await m.query('SELECT * FROM account_erasure_operations WHERE id=$1 FOR UPDATE', [operationId]);
      if (o.state === 'completed') return;
      await this.assertTarget(m,o.subject_id);
      const tasks = await m.query("SELECT * FROM account_erasure_file_tasks WHERE operation_id=$1 AND state IN ('pending','retry_required') FOR UPDATE", [operationId]);
      // One QueryRunner and the durable two-pass contract require sequential task processing.
      await tasks.reduce((pending:Promise<void>,task:ErasureFileTask) =>
        pending.then(() => this.removeFileTask(m,task,o.subject_id)),Promise.resolve());
    });
  }

  private async removeFileTask(m:EntityManager,task:ErasureFileTask,ownerId:string):Promise<void> {
    if (!this.options.storage) throw new AccountErasureError('PERSONAL_STORAGE_REQUIRED',503);
    const generation=task.generation ?? await this.options.storage.generation(task.bucket,task.object_path,ownerId);
    if(!task.generation && generation){
      // Persist in this transaction; external deletion happens only after this commit.
      await m.query("UPDATE account_erasure_file_tasks SET generation=$2,attempts=attempts+1 WHERE id=$1",[task.id,generation]);
      return;
    }
    if(generation)await this.options.storage.deleteGeneration(task.bucket,task.object_path,generation,ownerId);
    await m.query(`UPDATE account_erasure_file_tasks SET state=$2,bucket=NULL,object_path=NULL,generation=NULL,
      error_code=NULL,updated_at=now() WHERE id=$1`,[task.id,generation ? 'deleted':'already_absent']);
  }

  private async finish(operationId: string,actorId: string): Promise<void> {
    await this.db.transaction(async m => {
      const [hint] = await m.query('SELECT subject_hash FROM account_erasure_operations WHERE id=$1', [operationId]);
      await m.query("SELECT pg_advisory_xact_lock(hashtextextended('o4o-account-erasure-writes',0))");
      await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [hint.subject_hash]);
      await this.assertActor(m,actorId);
      const [o]: Operation[] = await m.query('SELECT * FROM account_erasure_operations WHERE id=$1 FOR UPDATE', [operationId]);
      if (o.state === 'completed') return;
      await m.query("UPDATE account_erasure_operations SET state='processing' WHERE id=$1", [operationId]);
      await m.query("SELECT set_config('o4o.erasure_operation',$1,true)", [operationId]);
      const [user] = await m.query('SELECT * FROM users WHERE id=$1 FOR UPDATE', [o.subject_id]);
      if (!user) throw new AccountErasureError('ERASURE_SOURCE_MISSING', 409);
      await this.assertTarget(m,o.subject_id!);
      const frozenTokens = await this.identityTokens(m,user);
      const codes = await this.reviewManifest(m,user,frozenTokens);
      const [f] = await m.query("SELECT count(*)::int AS n FROM account_erasure_file_tasks WHERE operation_id=$1 AND state NOT IN ('deleted','already_absent')", [operationId]);
      if (codes.length || f.n) throw new AccountErasureError('ERASURE_RESIDUAL_REVIEW_REQUIRED', 409);
      await this.separateCommunityEvidence(m,o.subject_id!);
      await this.removePrivateRows(m,o.subject_id!);
      if ((await this.reviewManifest(m,user,frozenTokens)).length) throw new AccountErasureError('ERASURE_RESIDUAL_REVIEW_REQUIRED',409);
      await m.query('DELETE FROM users WHERE id=$1', [o.subject_id]);
      await this.audit(m,operationId,o.subject_hash,actorId,'completed');
      // Only retired UUIDs fence a restore. Re-registration with a fresh UUID/contact is not a restore.
      await m.query("DELETE FROM account_erasure_reference_keys WHERE operation_id=$1 AND key_kind='identity'",[operationId]);
      await m.query('UPDATE account_erasure_reference_keys SET reference_id=NULL WHERE operation_id=$1', [operationId]);
      await m.query(`UPDATE account_erasure_operations SET state='completed',subject_id=NULL,review_codes='[]',
        error_code=NULL,completed_at=now(),expires_at=now()+interval '7 days',updated_at=now() WHERE id=$1`, [operationId]);
    });
  }

  private async audit(m:EntityManager,operationId:string,subjectHash:string,actorId:string,action:'requested'|'completed'):Promise<void> {
    const now=new Date();const years=this.options.systemYears!;
    await m.query(`INSERT INTO account_erasure_audit_events
      (operation_id,subject_hash,actor_key,action,occurred_at,expires_at,retention_years,policy_basis)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(operation_id,action) DO NOTHING`,
    [operationId,subjectHash,actorId,action,now,calendarExpiry(now,years),years,this.options.systemBasis]);
  }

  /** Explicit maintenance only. No scheduler/startup apply is registered by this WO. */
  async retentionReport(now = new Date(), apply = false): Promise<{ eligible: number; overdueReviews: number; deleted: number }> {
    await this.ready();
    if (!Number.isFinite(now.getTime())) throw new AccountErasureError('INVALID_RETENTION_ANCHOR',400);
    return this.db.transaction(async m => {
      const eligible = `expires_at <= $1 AND (hold_basis IS NULL OR hold_ended_at <= $1 OR
        (hold_review_at > $1 AND hold_until <= $1 AND hold_end_event IS NULL))`;
      const [counts] = await m.query(`SELECT count(*) FILTER(WHERE ${eligible})::int AS eligible,
        count(*) FILTER(WHERE hold_basis IS NOT NULL AND hold_review_at <= $1 AND hold_ended_at IS NULL)::int AS overdue
        FROM account_erasure_community_evidence`, [now]);
      const [auditCount]=await m.query('SELECT count(*)::int AS n FROM account_erasure_audit_events WHERE expires_at<=$1',[now]);
      let deleted = 0;
      if (apply) {
        const removed = await m.query(`DELETE FROM account_erasure_community_evidence WHERE ${eligible} RETURNING source_event_id`, [now]);
        // PostgreSQL TypeORM returns [rows,rowCount] for DELETE, unlike SELECT.
        deleted = Array.isArray(removed[0]) ? Number(removed[1]) : removed.length;
        const auditRemoved=await m.query('DELETE FROM account_erasure_audit_events WHERE expires_at<=$1 RETURNING id',[now]);
        deleted+=Array.isArray(auditRemoved[0])?Number(auditRemoved[1]):auditRemoved.length;
        await m.query("DELETE FROM account_erasure_operations WHERE state='completed' AND expires_at <= $1", [now]);
      }
      return { eligible: counts.eligible+auditCount.n, overdueReviews: counts.overdue, deleted };
    });
  }
}
