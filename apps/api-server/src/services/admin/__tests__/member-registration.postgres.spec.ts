import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource, Entity, PrimaryColumn } from 'typeorm';
import {
  PlatformStoreSlug,
  PlatformStoreSlugHistory,
} from '@o4o/platform-core/store-identity';
import { RoleAssignment } from '../../../modules/auth/entities/RoleAssignment.js';
jest.mock('../../../database/connection.js', () => ({
  AppDataSource: { getRepository: () => ({}) },
}));
import { MemberRegistrationService } from '../member-registration.service.js';
import { CentralMemberWorkspaceService } from '../central-member-workspace.service.js';
import { MemberLifecycleService } from '../member-lifecycle.service.js';
import { getNetureMainMembershipStatus } from '../../../modules/neture/services/neture-main-membership.js';
import {
  MEMBER_REGISTRATION_KEY,
  type MemberRegistrationType,
} from '@o4o/types';
import {canReadBusinessRegistrationDocument} from '../../../modules/neture-pharmacy/services/business-registration-document-access.js';
import { assertRegistrationDocument } from '../member-registration-data.js';
import { buildBusinessInfoUpdateStatement } from '../../../utils/business-info-write.js';
@Entity('users')
class User {
  @PrimaryColumn('uuid') id!: string;
}
const enabled = process.env.OPERATOR_INVITE_TEST_PORT === '55432';
(enabled ? describe : describe.skip)(
  'unified signup and member lifecycle — canonical disposable PostgreSQL',
  () => {
    let db: DataSource,
      registration: MemberRegistrationService,
      workspace: CentralMemberWorkspaceService,
      lifecycle: MemberLifecycleService;
    let actor: string, target: string, other: string;
    const business = {
      businessName: 'Synthetic pharmacy',
      businessNumber: '1234567890',
      representativeName: 'Synthetic owner',
      businessType: 'retail',
      businessItem: 'health',
      businessEntityType: 'individual',
      businessStartDate: '2020-01-01',
      zipCode: '12345',
      address: 'Synthetic address',
      addressDetail: 'Unit1',
      businessPhone: '021234567',
      contactName: 'Synthetic manager',
      contactPhone: '01012345678',
      contactEmail: 'contact@fixture.invalid',
      taxInvoiceEmail: 'invoice@fixture.invalid',
    };
    const reason = 'Synthetic registration review';
    const clean = () =>
      db.query(
        'TRUNCATE users,organizations,semi_franchises,action_logs,service_policy_documents,account_erasure_operations,account_erasure_community_evidence,account_erasure_audit_events CASCADE',
      );
    const version = async (id = target) =>
      (
        await db.query(
          `SELECT to_char("updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.US') AS version FROM users WHERE id=$1`,
          [id],
        )
      )[0].version as string;
    async function user() {
      const id = randomUUID();
      await db.query(
        `INSERT INTO users(id,email,name,nickname,phone,status,"isActive","isEmailVerified","businessInfo") VALUES($1,$2,'Synthetic member','Synthetic nick','01012345678','active',true,true,'{}')`,
        [id, id + '@fixture.invalid'],
      );
      return id;
    }
    async function submit(
      type: MemberRegistrationType,
      fields: Record<string, string> = {},
      id = target,
    ) {
      return registration.submit(id, {
        type,
        fields,
        name: 'Synthetic member',
        nickname: 'Synthetic nick',
        phone: '01012345678',
        version: await version(id),
      });
    }
    const approve = async (id = target) =>
      registration.decide(actor, id, {
        action: 'approve',
        version: await version(id),
        reason,
      });
    beforeAll(async () => {
      db = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 55432,
        username: 'agent',
        password: () => '',
        database: 'o4o_operator_invitation_fixture',
        entities: [
          User,
          RoleAssignment,
          PlatformStoreSlug,
          PlatformStoreSlugHistory,
        ],
      });
      await db.initialize();
      expect((await db.query('SELECT current_database() AS db'))[0].db).toBe(
        'o4o_operator_invitation_fixture',
      );
      expect(
        (
          await db.query(
            "SELECT to_regclass('public.account_erasure_operations') AS t",
          )
        )[0].t,
      ).toBeTruthy();
      registration = new MemberRegistrationService(db);
      workspace = new CentralMemberWorkspaceService(db);
      lifecycle = new MemberLifecycleService(db);
    });
    beforeEach(async () => {
      await clean();
      actor = await user();
      target = await user();
      other = await user();
      await db.query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','active')",
        [actor],
      );
      await db.query(
        "INSERT INTO platform_services(code,name) VALUES('neture','Synthetic main'),('kpa-society','Synthetic pharmacy') ON CONFLICT(code) DO NOTHING",
      );
      const role = randomUUID();
      await db.query(
        "INSERT INTO role_assignments(id,user_id,role,scope_type,is_active) VALUES($1,$2,'neture:operator','o4o-direct',true)",
        [role, actor],
      );
      await db.query(
        "INSERT INTO central_operation_menu_grants(assignment_id,menu_keys,admin_operations) VALUES($1,ARRAY['neture.members'],true)",
        [role],
      );
    });
    afterAll(async () => {
      if (db?.isInitialized) {
        await clean();
        await db.destroy();
      }
    });
    it.each([
      'other',
      'partner',
      'supplier',
      'pharmacist',
      'pharmacy_owner',
    ] as const)(
      'submits and approves %s once with current membership authority',
      async (type) => {
        if (type === 'pharmacy_owner') {
          const [org] = await db.query(
            `INSERT INTO organizations(name,code,type,"isActive") VALUES('Synthetic Pharmacy business',$1,'semi_franchise',true) RETURNING id`,
            ['default-' + randomUUID()],
          );
          await db.query(
            "INSERT INTO semi_franchises(key,name,organization_id,status) VALUES('pharmacy','Pharmacy',$1,'active')",
            [org.id],
          );
        }
        const fields =
          type === 'other'
            ? {}
            : type === 'pharmacist'
              ? { licenseNumber: 'fixture-license' }
              : type === 'pharmacy_owner'
                ? { ...business, licenseNumber: 'fixture-license' }
                : business;
        await submit(type, fields);
        expect(await getNetureMainMembershipStatus(db, target)).toBe('pending');
        expect(
          (await workspace.list(actor, 'pending', 1, '')).items.map(
            (r) => r.userId,
          ),
        ).toContain(target);
        await db.query('UPDATE users SET "isEmailVerified"=false WHERE id=$1', [
          target,
        ]);
        const result = await approve();
        expect(result.state).toBe('approved');
        expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
        const detail = await workspace.detail(actor, target);
        expect(detail.registration).toMatchObject({
          type,
          state: 'approved',
          fields,
        });
        expect(detail.member.emailVerified).toBe(true);
        const count = (
          await db.query('SELECT count(*)::int AS n FROM organizations')
        )[0].n;
        await approve();
        expect(
          (await db.query('SELECT count(*)::int AS n FROM organizations'))[0].n,
        ).toBe(count);
        if (type === 'pharmacy_owner') {
          expect(
            await db.query(
              'SELECT status FROM neture_pharmacy_memberships WHERE applicant_user_id=$1',
              [target],
            ),
          ).toEqual([{ status: 'active' }]);
          expect(
            (
              await db.query(
                'SELECT role FROM role_assignments WHERE user_id=$1 AND is_active',
                [target],
              )
            ).map((r) => r.role),
          ).toContain('neture:store_owner');
          expect(
            (
              await db.query(
                'SELECT count(*)::int AS n FROM platform_store_slugs',
              )
            )[0].n,
          ).toBe(1);
        }
        if (type === 'supplier') {
          expect(
            await db.query(
              'SELECT status FROM neture_suppliers WHERE user_id=$1',
              [target],
            ),
          ).toEqual([{ status: 'ACTIVE' }]);
          expect(
            (
              await db.query(
                'SELECT role FROM role_assignments WHERE user_id=$1 AND is_active',
                [target],
              )
            ).map((r) => r.role),
          ).toContain('neture:supplier');
        }
      },
    );
    it('lets an operator submit their own signup with a nickname only, keeping stored name and phone', async () => {
      // 2026-11-10: 다른 사람이 운영자 계정을 바꾸지 못하게 하는 보호는 본인 제출에 적용하지 않는다.
      await db.query("INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'supplier:operator',true)", [target]);
      await expect(registration.submit(target, { type: 'other', fields: {}, name: '', nickname: 'Operator nick', phone: '', version: await version(target) }))
        .resolves.toMatchObject({ saved: true, state: 'pending' });
      const [row] = await db.query('SELECT name,nickname,phone FROM users WHERE id=$1', [target]);
      expect(row).toEqual({ name: 'Synthetic member', nickname: 'Operator nick', phone: '01012345678' });
      await expect(registration.submit(target, { type: 'other', fields: {}, name: '', nickname: ' ', phone: '', version: await version(target) }))
        .rejects.toMatchObject({ code: 'INVALID_MEMBER_PROFILE' });
    });
    it('rejects before writing when an applicant forges reviewed state, privileged type or cross-type fields', async () => {
      await expect(
        submit('other', { licenseNumber: 'bad' }),
      ).rejects.toBeDefined();
      await expect(
        submit('platform:super_admin' as MemberRegistrationType, {}),
      ).rejects.toBeDefined();
      expect(
        (
          await db.query(
            `SELECT "businessInfo"->>$2 AS r FROM users WHERE id=$1`,
            [target, MEMBER_REGISTRATION_KEY],
          )
        )[0].r,
      ).toBeNull();
      expect(() =>
        buildBusinessInfoUpdateStatement(
          { root: { [MEMBER_REGISTRATION_KEY]: { state: 'approved' } } },
          target,
        ),
      ).toThrow('MEMBER_REGISTRATION_RESERVED_KEY');
      expect(() =>
        buildBusinessInfoUpdateStatement(
          { nested: { [MEMBER_REGISTRATION_KEY]: { state: 'approved' } } },
          target,
        ),
      ).toThrow('MEMBER_REGISTRATION_RESERVED_KEY');
    });
    it('rejects stale versions and nondelegated/self approvals, preserving pending state', async () => {
      const old = await version();
      await submit('other');
      await expect(
        registration.decide(actor, target, {
          action: 'approve',
          reason,
          version: old,
        }),
      ).rejects.toMatchObject({ code: 'MEMBER_CHANGED' });
      await expect(
        registration.decide(other, target, {
          action: 'approve',
          reason,
          version: await version(),
        }),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        registration.decide(actor, actor, {
          action: 'approve',
          reason,
          version: await version(actor),
        }),
      ).rejects.toMatchObject({ code: 'SELF_APPROVAL_FORBIDDEN' });
      expect((await registration.self(target)).registration?.state).toBe(
        'pending',
      );
    });
    it('does not revive a closed service membership by submitting a new signup', async () => {
      await db.query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','withdrawn')",
        [target],
      );
      await expect(submit('other')).rejects.toMatchObject({
        code: 'MEMBER_SERVICE_INACTIVE',
      });
    });
    it('keeps a rejected signup editable and prevents a member changing an approved type', async () => {
      await submit('other');
      await registration.decide(actor, target, {
        action: 'reject',
        reason,
        version: await version(),
      });
      expect(await getNetureMainMembershipStatus(db, target)).toBe('rejected');
      await submit('other');
      await approve();
      await expect(submit('supplier', business)).rejects.toMatchObject({
        code: 'REGISTRATION_ALREADY_APPROVED',
      });
    });
    it('serializes competing approvals without duplicate pharmacy/supplier records', async () => {
      await submit('supplier', business);
      const v = await version();
      const results = await Promise.allSettled([
        registration.decide(actor, target, {
          action: 'approve',
          version: v,
          reason,
        }),
        registration.decide(actor, target, {
          action: 'approve',
          version: v,
          reason,
        }),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(
        (
          await db.query(
            'SELECT count(*)::int AS n FROM neture_suppliers WHERE user_id=$1',
            [target],
          )
        )[0].n,
      ).toBe(1);
    });
    it('rolls back every approval write on a duplicate approved license', async () => {
      await submit('pharmacist', { licenseNumber: 'same-license' }, other);
      await approve(other);
      await submit('pharmacist', { licenseNumber: 'same-license' });
      await expect(approve()).rejects.toMatchObject({
        code: 'LICENSE_REVIEW_REQUIRED',
      });
      expect((await registration.self(target)).registration?.state).toBe(
        'pending',
      );
      expect(
        await db.query(
          'SELECT 1 FROM kpa_pharmacist_profiles WHERE user_id=$1',
          [target],
        ),
      ).toHaveLength(0);
    });
    it('keeps organization staff, role grants and other services byte-for-byte across termination and restoration', async () => {
      await submit('other');
      await approve();
      const [org] = await db.query(
        `INSERT INTO organizations(name,code,type,"isActive") VALUES('Synthetic employer',$1,'store',true) RETURNING id`,
        ['employer-' + randomUUID()],
      );
      await db.query(
        "INSERT INTO organization_members(organization_id,user_id,role,is_primary) VALUES($1,$2,'staff',true)",
        [org.id, target],
      );
      await db.query(
        "INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'kpa:store_member',true)",
        [target],
      );
      await db.query(
        "INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'lecture','active','customer')",
        [target],
      );
      const staff = await db.query(
        'SELECT row_to_json(m) AS row FROM organization_members m WHERE user_id=$1',
        [target],
      );
      const roles = await db.query(
        'SELECT row_to_json(r) AS row FROM role_assignments r WHERE user_id=$1',
        [target],
      );
      const service = await db.query(
        "SELECT row_to_json(s) AS row FROM service_memberships s WHERE user_id=$1 AND service_key='lecture'",
        [target],
      );
      await lifecycle.terminateAccess(actor, target, {
        reason,
        version: await version(),
      });
      expect(await getNetureMainMembershipStatus(db, target)).toBe('withdrawn');
      await lifecycle.restoreAccess(actor, target, {
        reason,
        version: await version(),
      });
      expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
      expect(
        await db.query(
          'SELECT row_to_json(m) AS row FROM organization_members m WHERE user_id=$1',
          [target],
        ),
      ).toEqual(staff);
      expect(
        await db.query(
          'SELECT row_to_json(r) AS row FROM role_assignments r WHERE user_id=$1',
          [target],
        ),
      ).toEqual(roles);
      expect(
        await db.query(
          "SELECT row_to_json(s) AS row FROM service_memberships s WHERE user_id=$1 AND service_key='lecture'",
          [target],
        ),
      ).toEqual(service);
    });
    it('restores legacy suspended membership without creating a role or changing common account flags', async () => {
      await db.query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','suspended')",
        [target],
      );
      await lifecycle.restoreAccess(actor, target, {
        reason,
        version: await version(),
      });
      expect(
        await db.query('SELECT 1 FROM role_assignments WHERE user_id=$1', [
          target,
        ]),
      ).toHaveLength(0);
      expect(
        (
          await db.query(
            'SELECT "isActive","isEmailVerified",status FROM users WHERE id=$1',
            [target],
          )
        )[0],
      ).toEqual({ isActive: true, isEmailVerified: true, status: 'active' });
    });
    it('never revives a globally blocked account through member restoration', async () => {
      await db.query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','withdrawn')",
        [target],
      );
      await db.query("UPDATE users SET status='suspended' WHERE id=$1", [
        target,
      ]);
      await expect(
        lifecycle.restoreAccess(actor, target, {
          reason,
          version: await version(),
        }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_ADMIN_REQUIRED' });
    });
    it('requires the applicant published-policy consent and binds it to the current application', async () => {
      const docs = [];
      for (const documentType of ['terms', 'privacy']) {
        const [doc] = await db.query(
          `INSERT INTO service_policy_documents(service_key,document_type,version,title,content,slug,status,published_at)
    VALUES('supplier',$1,2,'Synthetic policy','Synthetic published content',$2,'published',now()) RETURNING id`,
          [documentType, 'supplier-service-' + documentType],
        );
        docs.push({
          policyDocumentId: doc.id,
          documentType: documentType as 'terms' | 'privacy',
          version: 2,
        });
      }
      const prepared = await workspace.detail(actor, target);
      await workspace.correct(actor, target, {
        name: 'Synthetic member',
        nickname: 'Synthetic nick',
        phone: '01012345678',
        reason,
        version: prepared.member.version,
        registration: { type: 'supplier', fields: business },
      });
      expect((await registration.self(target)).canSubmit).toBe(true);
      await expect(approve()).rejects.toMatchObject({
        code: 'ENROLLMENT_POLICY_REQUIRED',
      });
      await expect(submit('supplier', business)).rejects.toBeDefined();
      await registration.submit(target, {
        type: 'supplier',
        fields: business,
        name: 'Synthetic member',
        nickname: 'Synthetic nick',
        phone: '01012345678',
        version: await version(),
        policyReferences: docs,
      });
      expect((await registration.self(target)).canSubmit).toBe(false);
      const [snapshot] = await db.query(
        `SELECT "businessInfo"->'o4oMembershipRegistrationV1' AS r FROM users WHERE id=$1`,
        [target],
      );
      await db.query(
        `UPDATE users SET "businessInfo"=jsonb_set("businessInfo"::jsonb,'{o4oMembershipRegistrationV1,requestId}',to_jsonb($2::text)) WHERE id=$1`,
        [target, randomUUID()],
      );
      await expect(approve()).rejects.toMatchObject({
        code: 'ENROLLMENT_POLICY_REQUIRED',
      });
      await db.query(
        `UPDATE users SET "businessInfo"=jsonb_set("businessInfo"::jsonb,'{o4oMembershipRegistrationV1,requestId}',to_jsonb($2::text)) WHERE id=$1`,
        [target, snapshot.r.requestId],
      );
      await approve();
      expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
    });
    it('rejects a document belonging to another member without changing the signup snapshot', async () => {
      const [doc] = await db.query(
        `INSERT INTO kyc_documents(user_id,"documentType","fileUrl","fileName") VALUES($1,'business_registration','gcs://fixture.invalid/private','synthetic.pdf') RETURNING id`,
        [other],
      );
      await expect(
        submit('supplier', {
          ...business,
          businessRegistrationDocumentId: doc.id,
        }),
      ).rejects.toMatchObject({ code: 'REGISTRATION_DOCUMENT_FORBIDDEN' });
      expect((await registration.self(target)).registration).toBeNull();
    });
    it('updates approved supplier business data in the same organization without changing its lifecycle', async () => {
      await submit('supplier', business);
      await approve();
      const before = await workspace.detail(actor, target),
        organization = (
          await db.query(
            'SELECT organization_id FROM neture_suppliers WHERE user_id=$1',
            [target],
          )
        )[0].organization_id;
      await workspace.correct(actor, target, {
        name: 'Corrected member',
        nickname: 'Corrected nick',
        phone: '01012345678',
        email: before.member.email,
        reason,
        version: before.member.version,
        evidenceConfirmed: true,
        businessVersion: before.registration?.businessVersion,
        registration: {
          type: 'supplier',
          fields: {
            ...business,
            representativeName: 'Corrected representative',
            address: 'Corrected address',
            addressDetail: 'Unit2',
            taxInvoiceEmail: 'corrected@fixture.invalid',
          },
        },
      });
      const [row] = await db.query(
        'SELECT s.status,s.organization_id,o.address,o.address_detail,o.metadata,s.representative_name,s.tax_invoice_email FROM neture_suppliers s JOIN organizations o ON o.id=s.organization_id WHERE s.user_id=$1',
        [target],
      );
      expect(row).toMatchObject({
        status: 'ACTIVE',
        organization_id: organization,
        address: 'Corrected address',
        representative_name: 'Corrected representative',
        tax_invoice_email: 'corrected@fixture.invalid',
      });
      expect(row.address_detail.detailAddress).toBe('Unit2');
      expect((await workspace.detail(actor, target)).registration?.state).toBe(
        'approved',
      );
    });
    it('reads live supplier fields through current ownership even when legacy user_id is null and rejects stale business writes', async () => {
      await submit('supplier', {
        ...business,
        managerEmail: 'manager@fixture.invalid',
      });
      await approve();
      const before = await workspace.detail(actor, target);
      await db.query(
        "UPDATE neture_suppliers SET user_id=NULL,manager_name='MyHome manager',contact_email='public@fixture.invalid' WHERE user_id=$1",
        [target],
      );
      const current = await workspace.detail(actor, target);
      expect(current.registration?.fields).toMatchObject({
        contactName: 'MyHome manager',
        managerEmail: 'manager@fixture.invalid',
        contactEmail: 'public@fixture.invalid',
        zipCode: '12345',
        addressDetail: 'Unit1',
      });
      await expect(
        workspace.correct(actor, target, {
          name: 'Stale draft',
          nickname: 'nick',
          phone: '01012345678',
          reason,
          version: current.member.version,
          businessVersion: before.registration?.businessVersion,
          registration: { type: 'supplier', fields: business },
        }),
      ).rejects.toMatchObject({ code: 'BUSINESS_CHANGED' });
      expect((await workspace.detail(actor, target)).member.name).toBe(
        'Synthetic member',
      );
      await db.query(
        'UPDATE organization_members SET left_at=now() WHERE user_id=$1',
        [target],
      );
      expect(
        (await workspace.detail(actor, target)).registration?.businessEditable,
      ).toBe(false);
      await expect(
        workspace.correct(actor, target, {
          name: 'Former owner edit',
          nickname: 'nick',
          phone: '01012345678',
          reason,
          version: current.member.version,
          businessVersion: current.registration?.businessVersion,
          registration: { type: 'supplier', fields: business },
        }),
      ).rejects.toMatchObject({ code: 'BUSINESS_CHANGED' });
      await workspace.correct(actor, target, {
        name: 'Common fields only',
        nickname: 'nick',
        phone: '01012345678',
        reason,
        version: current.member.version,
      });
      expect((await workspace.detail(actor, target)).member.name).toBe(
        'Common fields only',
      );
    });
    it.each(['pending', 'rejected'])(
      'preserves legacy main access without approving a %s pharmacist credential',
      async (state) => {
        await db.query(
          "INSERT INTO kpa_pharmacist_profiles(user_id,license_number,qualification_status,qualification_reason) VALUES($1,'legacy-license',$2,'Synthetic prior review')",
          [target, state],
        );
        expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
        const before = await workspace.detail(actor, target);
        await workspace.correct(actor, target, {
          name: 'Corrected legacy contact',
          nickname: 'Legacy nick',
          phone: '01012345678',
          reason,
          version: before.member.version,
          registration: {
            type: 'pharmacist',
            fields: { licenseNumber: 'legacy-license' },
          },
        });
        expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
        expect(
          (await workspace.list(actor, 'all', 1, '')).items.find(
            (r) => r.userId === target,
          )?.serviceStatus,
        ).toBe('active');
        expect(
          (
            await db.query(
              'SELECT qualification_status FROM kpa_pharmacist_profiles WHERE user_id=$1',
              [target],
            )
          )[0].qualification_status,
        ).toBe(state);
        await submit('pharmacist', { licenseNumber: 'legacy-license' });
        expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
        await registration.decide(actor, target, {
          action: 'reject',
          reason,
          version: await version(),
        });
        expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
      },
    );
    it('keeps legacy supplier application status separate from existing main access during contact correction', async () => {
      await submit('supplier', business);
      await approve();
      await db.query(`UPDATE users SET "businessInfo"='{}' WHERE id=$1`, [
        target,
      ]);
      await db.query(
        "UPDATE neture_suppliers SET status='PENDING' WHERE user_id=$1",
        [target],
      );
      const before = await workspace.detail(actor, target);
      await workspace.correct(actor, target, {
        name: 'Corrected legacy supplier',
        nickname: 'Supplier nick',
        phone: '01012345678',
        reason,
        version: before.member.version,
        registration: { type: 'supplier', fields: business },
      });
      expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
      expect(
        (
          await db.query(
            'SELECT status FROM neture_suppliers WHERE user_id=$1',
            [target],
          )
        )[0].status,
      ).toBe('PENDING');
    });
    it('authorizes a transferred supplier document through the current owner and denies the former uploader', async () => {
      const [doc] = await db.query(
        `INSERT INTO kyc_documents(user_id,"documentType","fileUrl","fileName") VALUES($1,'business_registration','gcs://fixture.invalid/private','synthetic.pdf') RETURNING id`,
        [target],
      );
      await submit('supplier', {
        ...business,
        businessRegistrationDocumentId: doc.id,
      });
      await approve();
      await assertRegistrationDocument(db, target, {
        businessRegistrationDocumentId: doc.id,
      });
      const [supplier] = await db.query(
        'SELECT organization_id FROM neture_suppliers WHERE user_id=$1',
        [target],
      );
      await db.query(
        'UPDATE neture_suppliers SET user_id=NULL WHERE organization_id=$1',
        [supplier.organization_id],
      );
      await db.query(
        "UPDATE organization_members SET user_id=$2 WHERE organization_id=$1 AND role='owner' AND left_at IS NULL",
        [supplier.organization_id, other],
      );
      await assertRegistrationDocument(db, other, {
        businessRegistrationDocumentId: doc.id,
      });
      expect(await canReadBusinessRegistrationDocument(db,other,doc.id)).toBe(true);
      expect(await canReadBusinessRegistrationDocument(db,target,doc.id)).toBe(false);
      await expect(
        assertRegistrationDocument(db, target, {
          businessRegistrationDocumentId: doc.id,
        }),
      ).rejects.toMatchObject({ code: 'REGISTRATION_DOCUMENT_FORBIDDEN' });
      const detail = await workspace.detail(actor, other);
      await workspace.correct(actor, other, {
        name: 'Current owner',
        nickname: 'Owner nick',
        phone: '01012345678',
        reason,
        version: detail.member.version,
        businessVersion: detail.registration?.businessVersion,
        registration: { type: 'supplier', fields: detail.registration!.fields },
      });
      expect(
        (await workspace.detail(actor, other)).registration?.fields
          .businessRegistrationDocumentId,
      ).toBe(doc.id);
    });
    it('confirms an unchanged contact address when the operator saves reviewed member information', async () => {
      await submit('other');
      await approve();
      await db.query('UPDATE users SET "isEmailVerified"=false WHERE id=$1', [
        target,
      ]);
      const before = await workspace.detail(actor, target);
      const result = await workspace.correct(actor, target, {
        name: 'Reviewed member',
        nickname: 'Reviewed nick',
        phone: '01012345678',
        email: before.member.email,
        evidenceConfirmed: true,
        reason,
        version: before.member.version,
        registration: { type: 'other', fields: {} },
      });
      expect(result.emailChanged).toBe(false);
      expect((await workspace.detail(actor, target)).member.emailVerified).toBe(
        true,
      );
      expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
    });
    it('keeps an already-usable legacy general member usable after an operator profile correction', async () => {
      const detail = await workspace.detail(actor, target);
      await workspace.correct(actor, target, {
        name: 'Corrected member',
        nickname: 'Corrected nick',
        phone: '01012345678',
        email: detail.member.email,
        reason,
        version: detail.member.version,
        evidenceConfirmed: true,
        registration: { type: 'other', fields: {} },
      });
      expect(await getNetureMainMembershipStatus(db, target)).toBe('active');
    });
    it('lists only provider names, public signup type, nickname and a unified member state', async () => {
      await submit('other');
      await approve();
      await db.query(
        'INSERT INTO linked_accounts("userId",provider,"providerId") VALUES($1,\'google\',\'private-provider-id\')',
        [target],
      );
      const row = (
        await workspace.list(actor, 'all', 1, 'Synthetic nick')
      ).items.find((r) => r.userId === target)!;
      expect(row).toMatchObject({
        nickname: 'Synthetic nick',
        registrationType: 'other',
        loginMethods: ['google'],
        serviceStatus: 'active',
      });
      expect(JSON.stringify(row)).not.toContain('private-provider-id');
    });
  },
);
