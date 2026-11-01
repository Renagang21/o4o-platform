import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import express from 'express';
import request from 'supertest';
jest.mock('../../../database/connection.js', () => ({ AppDataSource: {} }));
import { centralOperationRequest } from '../../../middleware/central-operation-menu.middleware.js';
import { CentralMemberWorkspaceService } from '../central-member-workspace.service.js';

// Disposable local database only. Existing production credentials are never a fallback.
const url = process.env.MEMBER_WORKSPACE_TEST_DATABASE_URL;
const integration = url ? describe : describe.skip;
integration('central member workbench PostgreSQL authority, projection and correction', () => {
  const schema = `member_review_${randomUUID().replaceAll('-', '')}`;
  const admin = randomUUID(), reader = randomUUID(), target = randomUUID(), other = randomUUID();
  let db: DataSource, service: CentralMemberWorkspaceService;
  beforeAll(async () => {
    if (!['127.0.0.1', 'localhost'].includes(new URL(url!).hostname)) throw new Error('Use a disposable local database');
    const setup = new DataSource({ type: 'postgres', url }); await setup.initialize();
    await setup.query(`CREATE SCHEMA ${schema}`); await setup.destroy();
    db = new DataSource({ type: 'postgres', url, extra: { options: `-c search_path=${schema}` } }); await db.initialize();
    await db.query(`CREATE TABLE users(id uuid PRIMARY KEY,name text,nickname text,email text,phone text,status text,"isActive" boolean,"isEmailVerified" boolean,"createdAt" timestamp,"updatedAt" timestamp,"businessInfo" json);
      CREATE TABLE role_assignments(id uuid PRIMARY KEY,user_id uuid,role text,scope_type text,is_active boolean,valid_from timestamp,valid_until timestamp);
      CREATE TABLE service_memberships(user_id uuid,service_key text,status text);
      CREATE TABLE central_operation_menu_grants(assignment_id uuid,menu_keys text[]);
      CREATE TABLE kpa_pharmacist_profiles(user_id uuid,license_number text,qualification_status text,qualification_reason text,verified_at timestamp,verified_by uuid,updated_at timestamp);
      CREATE TABLE organizations(id uuid PRIMARY KEY,address text,phone text,metadata jsonb,name text,business_number text,"updatedAt" timestamp DEFAULT now());
      CREATE TABLE neture_pharmacy_memberships(id uuid PRIMARY KEY,organization_id uuid,applicant_user_id uuid,pharmacy_name text,business_number text,pharmacist_license_number text,status text,reason text,applied_at timestamp,decided_at timestamp,decided_by uuid,updated_at timestamp DEFAULT now());
      CREATE TABLE action_logs(id bigserial,service_key text,user_id uuid,action_key text,source text,status text,meta jsonb,created_at timestamp DEFAULT now());`);
    for (const id of [admin, reader, target, other]) await db.query(`INSERT INTO users VALUES($1,'합성 회원','합성 별칭',$2,NULL,'active',true,true,now(),now(),$3)`, [id, `${id}@example.test`, { licenseNumber: 'legacy-license', businessName: '과거 합성 사업장', internalFutureField: 'do-not-disclose' }]);
    await db.query(`INSERT INTO role_assignments(id,user_id,role,is_active) VALUES($1,$2,'platform:super_admin',true)`, [randomUUID(), admin]);
    const assignment = randomUUID();
    await db.query(`INSERT INTO role_assignments(id,user_id,role,scope_type,is_active) VALUES($1,$2,'neture:operator','o4o-direct',true)`, [assignment, reader]);
    await db.query(`INSERT INTO service_memberships VALUES($1,'neture','active')`, [reader]);
    await db.query(`INSERT INTO service_memberships VALUES($1,'neture','active')`, [target]);
    await db.query(`INSERT INTO central_operation_menu_grants VALUES($1,ARRAY['neture.members'])`, [assignment]);
    await db.query(`INSERT INTO kpa_pharmacist_profiles VALUES($1,'current-license','pending','private reason',NULL,NULL,now())`, [target]);
    const organization = randomUUID();
    await db.query(`INSERT INTO organizations VALUES($1,'합성 주소','fixture-phone',$2)`, [organization, { businessProfile: { representativeName: '합성 대표', businessType: '합성 업태', businessCategory: '합성 종목', businessRegistrationDocumentId: randomUUID(), internalFutureField: 'do-not-disclose' }, contactName: '합성 담당자', managerPhone: 'fixture-phone', contactEmail: 'contact@example.test', taxInvoiceEmail: 'tax@example.test' }]);
    const otherOrganization=randomUUID();
    await db.query(`INSERT INTO organizations(id,address,phone,metadata) SELECT $1,address,phone,metadata FROM organizations WHERE id=$2`,[otherOrganization,organization]);
    for (const id of [target, other]) await db.query(`INSERT INTO neture_pharmacy_memberships(id,organization_id,applicant_user_id,pharmacy_name,business_number,pharmacist_license_number,status,applied_at) VALUES($1,$2,$3,'합성 약국','fixture-business','application-license','pending',now())`, [randomUUID(), id===target?organization:otherOrganization, id]);
    service = new CentralMemberWorkspaceService(db);
  });
  afterAll(async () => { if (db?.isInitialized) { await db.query(`DROP SCHEMA ${schema} CASCADE`); await db.destroy(); } });
  it('lists task counts without duplicating members and scopes submissions to the selected applicant', async () => {
    const result = await service.list(admin, 'qualifications', 1, '');
    expect(result.counts.qualifications).toBe(1); expect(result.counts.pharmacies).toBe(2);
    expect(result.items.map((row: any) => row.userId)).toEqual([target]);
    const detail = await service.detail(admin, target);
    expect(detail.legacyLicense).toBe('legacy-license'); expect(detail.qualification.licenseNumber).toBe('current-license');
    expect(detail.legacyBusiness).toEqual({ name: '과거 합성 사업장' });
    expect(detail.pharmacies).toHaveLength(1); expect(detail.pharmacies[0].businessType).toBe('합성 업태');
    expect(JSON.stringify(detail)).not.toContain('do-not-disclose');
  });
  it('keeps member-only delegates out of private fields, tasks and protected administrator profiles', async () => {
    const detail = await service.detail(reader, target);
    expect(detail.qualification).toBeNull(); expect(detail.legacyLicense).toBeNull(); expect(detail.legacyBusiness).toBeNull(); expect(detail.pharmacies).toEqual([]);
    expect(JSON.stringify(detail)).not.toContain('current-license'); expect(JSON.stringify(detail)).not.toContain('fixture-business');
    await expect(service.list(reader, 'pharmacies', 1, '')).rejects.toMatchObject({ status: 403 });
    expect(detail.permissions.edit).toBe(true);
    await expect(service.correct(reader, admin, { name: '변경', nickname: '', phone: '', reason: '합성 사유', version: detail.member.version })).rejects.toMatchObject({ status: 403 });
  });
  it('lets a delegated pharmacy reviewer read a document but denies directory-only and non-Google sessions', async () => {
    const app = express();
    app.use((req: any, _res, next) => { req.user = { id: reader }; req.authMethod = req.header('x-method'); next(); });
    app.use(centralOperationRequest('neture', undefined, db));
    app.get('/api/v1/neture/operator/pharmacy-documents/:id', (_req, res) => res.type('pdf').send(Buffer.from('%PDF-1.7 synthetic')));
    const path = '/api/v1/neture/operator/pharmacy-documents/fixture';
    expect((await request(app).get(path).set('x-method', 'google')).status).toBe(403);
    await db.query(`UPDATE central_operation_menu_grants SET menu_keys=ARRAY['neture.members','neture.pharmacies'] WHERE assignment_id IN (SELECT id FROM role_assignments WHERE user_id=$1)`, [reader]);
    try {
      const response = await request(app).get(path).set('x-method', 'google');
      expect(response.status).toBe(200); expect(response.headers['content-type']).toContain('application/pdf');
      const scoped = await service.detail(reader, target);
      expect(scoped.pharmacies).toHaveLength(1); expect(scoped.legacyBusiness).toBeNull();
      expect((await request(app).get(path).set('x-method', 'password')).status).toBe(403);
      expect((await request(app).get(path+'/delete').set('x-method', 'google')).status).toBe(403);
    } finally {
      await db.query(`UPDATE central_operation_menu_grants SET menu_keys=ARRAY['neture.members'] WHERE assignment_id IN (SELECT id FROM role_assignments WHERE user_id=$1)`, [reader]);
    }
    expect((await request(app).get(path).set('x-method', 'google')).status).toBe(403);
  });
  it('corrects only basic fields with an audit record and rejects a stale version', async () => {
    const detail = await service.detail(admin, target);
    const input = { name: '정정 합성 회원', nickname: '정정 별칭', phone: '', reason: '본인 요청 확인', version: detail.member.version };
    await service.correct(admin, target, input);
    const after = await service.detail(admin, target);
    expect(after.member.name).toBe(input.name); expect(after.member.email).toBe(detail.member.email);
    expect(after.qualification.status).toBe('pending'); expect(after.history[0].action).toBe('member.profile_corrected');
    await expect(service.correct(admin, target, input)).rejects.toMatchObject({ status: 409 });
    expect((await service.detail(admin, target)).history.filter((row: any) => row.action === 'member.profile_corrected')).toHaveLength(1);
  });
  it('rechecks revoked central authority instead of trusting earlier detail permissions', async () => {
    await db.query(`UPDATE role_assignments SET is_active=false WHERE user_id=$1`, [reader]);
    await expect(service.detail(reader, target)).rejects.toMatchObject({ status: 403 });
  });
  it('rejects nonnumeric phone input instead of silently clearing a stored contact', async () => {
    const detail = await service.detail(admin, target);
    await expect(service.correct(admin, target, { name: '합성 회원', nickname: '', phone: 'not-a-phone', reason: '합성 사유', version: detail.member.version })).rejects.toMatchObject({ status: 400 });
  });
  it('does not expose business information from a different service as a Neture application', async () => {
    expect((await service.detail(admin, other)).legacyBusiness).toBeNull();
  });
  it('allows delegated basic member correction without account-status or erasure authority',async()=>{
    await db.query(`UPDATE role_assignments SET is_active=true WHERE user_id=$1`,[reader]);
    const detail=await service.detail(reader,other);
    await service.correct(reader,other,{name:'위임 정정 회원',nickname:'',phone:'',reason:'본인 요청 확인',version:detail.member.version});
    const after=await service.detail(reader,other);
    expect(after.member.name).toBe('위임 정정 회원');expect(after.member.accountStatus).toBe(detail.member.accountStatus);
    expect(after.permissions.manageAccount).toBe(false);expect(after.permissions.erase).toBe(false);
  });
  it('corrects pharmacy mirrors atomically and rejects stale, foreign, duplicate and ungranted writes',async()=>{
    const detail=await service.detail(admin,target), pharmacy=detail.pharmacies[0];
    const input={fields:{name:'정정 합성 약국',businessNumber:'1234567890',representativeName:'정정 합성 대표',businessType:'합성 업태',businessCategory:'합성 종목',address:'정정 합성 주소',phone:'0212345678',contactName:'합성 담당자',managerPhone:'01012345678',contactEmail:'contact@example.test',taxInvoiceEmail:'tax@example.test'},reason:'등록 자료 대조 확인',version:pharmacy.version,evidenceConfirmed:true as const};
    await expect(service.correctPharmacy(reader,target,pharmacy.id,input)).rejects.toMatchObject({status:403});
    await expect(service.correctPharmacy(admin,other,pharmacy.id,input)).rejects.toMatchObject({status:404});
    await service.correctPharmacy(admin,target,pharmacy.id,input);
    const after=(await service.detail(admin,target)).pharmacies[0];
    expect(after.name).toBe(input.fields.name);expect(after.businessNumber).toBe('1234567890');expect(after.representativeName).toBe('정정 합성 대표');
    expect(after.licenseNumber).toBe(pharmacy.licenseNumber);expect(after.status).toBe(pharmacy.status);expect(after.documentId).toBe(pharmacy.documentId);
    const [org]=await db.query(`SELECT name,business_number,metadata FROM organizations WHERE id=$1`,[pharmacy.organizationId]);
    expect(org.name).toBe(after.name);expect(org.business_number).toBe(after.businessNumber);expect(org.metadata.businessProfile.internalFutureField).toBe('do-not-disclose');
    await expect(service.correctPharmacy(admin,target,pharmacy.id,input)).rejects.toMatchObject({status:409});
    const foreign=(await service.detail(admin,other)).pharmacies[0];
    await expect(service.correctPharmacy(admin,other,foreign.id,{...input,version:foreign.version})).rejects.toMatchObject({code:'BUSINESS_NUMBER_IN_USE'});
  });
  it('corrects existing application business fields without altering license, roles or another service',async()=>{
    await db.query(`UPDATE users SET "businessInfo"=("businessInfo"::jsonb||'{"ceoName":"합성 과거 대표"}'::jsonb)::json WHERE id=$1`,[target]);
    const detail=await service.detail(admin,target);
    const fields={name:'정정 과거 사업장',businessNumber:'2345678901',representativeName:'과거 정정 대표',businessType:'업태',businessCategory:'종목',address:'주소',contactName:'담당자',managerPhone:'',taxInvoiceEmail:'',businessEntityType:'개인',businessStartDate:'2020-01-01',addressDetail:'상세'};
    await expect(service.correctLegacyBusiness(reader,target,{fields,reason:'합성 정정 사유',version:detail.member.version})).rejects.toMatchObject({status:403});
    await service.correctLegacyBusiness(admin,target,{fields,reason:'본인 요청 대조',version:detail.member.version});
    const after=await service.detail(admin,target);expect(after.legacyBusiness.name).toBe(fields.name);expect(after.legacyLicense).toBe('legacy-license');
    const [row]=await db.query(`SELECT "businessInfo",pg_typeof("businessInfo")::text AS "businessInfoType" FROM users WHERE id=$1`,[target]);expect(row.businessInfoType).toBe('json');expect(row.businessInfo.internalFutureField).toBe('do-not-disclose');expect(row.businessInfo.ceoName).toBe(fields.representativeName);
    await expect(service.correctLegacyBusiness(admin,target,{fields,reason:'합성 정정 사유',version:detail.member.version})).rejects.toMatchObject({status:409});
  });
  it('rejects only pending, nonprivileged registrations and records a reason',async()=>{
    let detail=await service.detail(admin,other);
    await expect(service.rejectRegistration(admin,other,{reason:'가입 심사 거부',version:detail.member.version})).rejects.toMatchObject({code:'NOT_PENDING_REGISTRATION'});
    await db.query(`UPDATE users SET status='pending',"updatedAt"=clock_timestamp() WHERE id=$1`,[other]);detail=await service.detail(admin,other);
    await expect(service.rejectRegistration(reader,other,{reason:'가입 심사 거부',version:detail.member.version})).rejects.toMatchObject({status:403});
    await service.rejectRegistration(admin,other,{reason:'가입 자료 확인 후 거부',version:detail.member.version});
    expect((await service.detail(admin,other)).member.accountStatus).toBe('rejected');
    await expect(service.rejectRegistration(admin,other,{reason:'중복 거부',version:detail.member.version})).rejects.toMatchObject({status:409});
  });

  it('rolls back both pharmacy and organization corrections when the audit write fails',async()=>{
    const before=(await service.detail(admin,target)).pharmacies[0];
    const fields=Object.fromEntries(['name','businessNumber','representativeName','businessType','businessCategory','address','phone','contactName','managerPhone','contactEmail','taxInvoiceEmail'].map(key=>[key,String(before[key]??'')]));
    fields.name='저장되면 안 되는 합성 약국';fields.businessNumber='9876543210';
    await db.query(`CREATE FUNCTION reject_correction_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_key='member.pharmacy_profile_corrected' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_correction_audit BEFORE INSERT ON action_logs FOR EACH ROW EXECUTE FUNCTION reject_correction_audit();`);
    try{
      await expect(service.correctPharmacy(admin,target,before.id,{fields,reason:'합성 롤백 검사',version:before.version,evidenceConfirmed:true})).rejects.toThrow('synthetic audit failure');
      const after=(await service.detail(admin,target)).pharmacies[0];expect(after.name).toBe(before.name);expect(after.businessNumber).toBe(before.businessNumber);expect(after.version).toBe(before.version);
      const [organization]=await db.query('SELECT name,business_number FROM organizations WHERE id=$1',[before.organizationId]);expect(organization.name).toBe(before.name);expect(organization.business_number).toBe(before.businessNumber);
    }finally{await db.query('DROP TRIGGER reject_correction_audit ON action_logs; DROP FUNCTION reject_correction_audit();');}
  });

});
