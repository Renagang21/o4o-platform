import { businessOperationsRoutes } from '../business-operations.routes.js';
import { businessPolicyScope } from '../services/business-policy-scope.js';
import express from 'express';
import request from 'supertest';
import { ServicePolicyDocument } from '../../service-legal/entities/ServicePolicyDocument.entity.js';
import { ServiceLegalProfile } from '../../service-legal/entities/ServiceLegalProfile.entity.js';
import { computePolicyContentHash } from '../../policy-acceptance/policy-acceptance.service.js';
// Authentication is a test boundary; all business/role/policy authorization below uses the real database.
jest.mock('../../../middleware/auth.middleware.js', () => ({ authenticate: (_req: unknown, _res: unknown, next: () => void) => next(), requireAuth: (req: any, res: any, next: () => void) => req.user ? next() : res.sendStatus(401) }));
import { fixtureBusinessPolicies } from './fixtures/business-policies.js';
import { eventIndexState, transitionEventIndex } from '../operations/event-index-transition.js';
import { resolveCommunityWorkspace, listCommunityWorkspaces, createCommunityBoard } from '../../../services/community/community-workspace.service.js';
/**
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 — 실제 PostgreSQL 통합 검증 (WO §7)
 *
 * 실제 관계 · 권한 · 금액 · 상태 전이를 DB 에서 확인한다(코드 문자열 검사 아님).
 * 실행 조건: NETURE_PHARMACY_IT_DATABASE_URL = baseline + 모든 incremental migration 이 적용된 **격리** DB
 *   (예: docker postgres:15 → `npx tsx src/migrate.ts`). 운영 DB 에 절대 연결하지 않는다.
 * 미설정이면 skip — CI 에는 PostgreSQL 이 없다.
 */
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { PharmacyMembershipService, type PharmacyStoreProvisioner } from '../services/pharmacy-membership.service.js';
import { SemiFranchiseService } from '../services/semi-franchise.service.js';
import { getSupplyOption, listSupplyOptions } from '../services/supply-access.js';
import { SupplyProposalService } from '../services/supply-proposal.service.js';
import { SemiFranchiseEventService } from '../services/semi-franchise-event.service.js';
import { SemiFranchiseRecruitmentService } from '../services/semi-franchise-recruitment.service.js';
import { PharmacyCartService, type OrderCreator } from '../services/pharmacy-cart.service.js';
import { PharmacyPaymentService, type Bridger } from '../services/pharmacy-payment.service.js';
import { EventOfferService } from '../../../routes/kpa/services/event-offer.service.js';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';
import { cancelStoreOrderBeforePayment } from '../../../services/checkout/store-order-cancel.service.js';
import { policyAcceptanceService } from '../../policy-acceptance/policy-acceptance.service.js';
import { SupplierOrderService } from '../../neture/services/supplier-order.service.js';
import { resolveSemiFranchiseCommunityAccess } from '../services/semi-franchise-community-access.js';
import { resolveSemiFranchiseServiceAccess } from '../services/semi-franchise-service-access.js';
import { SemiFranchiseContentService } from '../services/semi-franchise-content.service.js';

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const DB_URL = process.env.NETURE_PHARMACY_IT_DATABASE_URL;
const d = DB_URL ? describe : describe.skip;
jest.setTimeout(60000);

let ds: DataSource;
const tag = randomUUID().slice(0, 8);
let seq = 0;
const uniq = (p: string) => `${p}-${tag}-${++seq}`;
const randomBizno = () => String(1000000000 + Math.floor(Math.random() * 8999999999)).slice(0, 10);

async function user(): Promise<string> {
  const [r] = await ds.query(`INSERT INTO users (email, status, "isActive", "isEmailVerified") VALUES ($1, 'active', true, true) RETURNING id`, [`${uniq('u')}@example.test`]);
  return r.id;
}
async function applicationProof(owner: string) {
  const [doc] = await ds.query(`INSERT INTO kyc_documents (user_id, "documentType", "fileUrl", "fileName")
    VALUES ($1, 'business_registration', 'gcs://local-it/synthetic.pdf', 'synthetic.pdf') RETURNING id`, [owner]);
  return { businessRegistrationDocumentId: doc.id, representativeName: 'TEST OWNER', businessType: 'TEST', businessCategory: 'TEST', address: 'SYNTHETIC ADDRESS', phone: '0212345678' };
}
async function role(userId: string, roleName: string) {
  await ds.query(`INSERT INTO role_assignments (user_id, role, is_active) VALUES ($1, $2, true)`, [userId, roleName]);
}
async function supplierWithProduct(opts: { price: number; serviceKeys?: string[]; stock?: number; track?: boolean; defaultSupplyEnabled?: boolean }) {
  const supplierUser = await user();
  const [org] = await ds.query(`INSERT INTO organizations (name, code, type) VALUES ($1, $2, 'supplier') RETURNING id`, [uniq('공급사'), uniq('sup')]);
  const [sup] = await ds.query(
    `INSERT INTO neture_suppliers (slug, status, user_id, organization_id, base_shipping_fee, free_shipping_threshold)
     VALUES ($1, 'ACTIVE', $2, $3, 3000, 50000) RETURNING id`,
    [uniq('sup'), supplierUser, org.id],
  );
  const [pm] = await ds.query(
    `INSERT INTO product_masters (name, regulatory_name, manufacturer_name) VALUES ($1, $1, 'M') RETURNING id`,
    [uniq('제품')],
  );
  const [spo] = await ds.query(
    `INSERT INTO supplier_product_offers (master_id, supplier_id, slug, price_general, approval_status, is_active,
       service_keys, track_inventory, stock_quantity, default_supply_enabled)
     VALUES ($1, $2, $3, $4, 'APPROVED', true, $5, $6, $7, $8) RETURNING id`,
    [pm.id, sup.id, uniq('spo'), opts.price, opts.serviceKeys ?? [], opts.track ?? false, opts.stock ?? 0, opts.defaultSupplyEnabled ?? false],
  );
  return { supplierUser, supplierId: sup.id as string, masterId: pm.id as string, offerId: spo.id as string };
}

const provisionerCalls: string[] = [];
const provisioner: PharmacyStoreProvisioner = {
  activate: async ({ organizationId }) => { provisionerCalls.push(`activate:${organizationId}`); },
  deactivate: async ({ organizationId }) => { provisionerCalls.push(`deactivate:${organizationId}`); },
};

/** checkoutService.createOrder 와 같은 계산(subtotal 합 + 배송비 스냅샷)으로 checkout_orders 행을 만든다. */
const sqlOrderCreator: OrderCreator = async (dto, manager) => {
  const subtotal = dto.items.reduce((s, it) => s + it.subtotal, 0);
  const shippingFee = dto.shippingFeeSnapshot ?? 0;
  const [o] = await manager.query(
    `INSERT INTO checkout_orders ("orderNumber", "buyerId", "sellerId", "supplierId", "sellerOrganizationId",
       subtotal, "shippingFee", "totalAmount", items, metadata, "shippingAddress")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb)
     RETURNING id, "orderNumber", "totalAmount", subtotal, "shippingFee"`,
    [uniq('ORD'), dto.buyerId, dto.sellerId, dto.supplierId, dto.sellerOrganizationId, subtotal, shippingFee,
      subtotal + shippingFee, JSON.stringify(dto.items), JSON.stringify(dto.metadata), JSON.stringify(dto.shippingAddress)],
  );
  return { id: o.id, orderNumber: o.orderNumber, totalAmount: o.totalAmount, subtotal: o.subtotal, shippingFee: o.shippingFee };
};

const bridged: string[] = [];
const bridger: Bridger = {
  async bridgeCheckoutOrderToNetureFulfillment({ checkoutOrderId }) {
    if (bridged.includes(checkoutOrderId)) return { bridged: false, skippedReason: 'ALREADY_BRIDGED' };
    bridged.push(checkoutOrderId);
    return { bridged: true, netureOrderId: randomUUID() };
  },
};

let membership: PharmacyMembershipService;
let sfs: SemiFranchiseService;
let proposals: SupplyProposalService;
let events: SemiFranchiseEventService;
let recruitments: SemiFranchiseRecruitmentService;
let cart: PharmacyCartService;
let payments: PharmacyPaymentService;
let operatorId: string;

/** 내 매장(약국) 신청 → 승인된 약국(매장). */
async function approvedPharmacy() {
  const owner = await user();
  const bizno = randomBizno();
  const row = await membership.apply(owner, { ...await applicationProof(owner), pharmacyName: uniq('약국'), businessNumber: bizno, pharmacistLicenseNumber: 'L-1' });
  await membership.decide(operatorId, row.id, 'approve');
  return { owner, orgId: row.organization_id as string, membershipId: row.id as string };
}

async function joinSemiFranchise(orgId: string, owner: string, key: string, sfOperator: string) {
  const sf = (await sfs.getByKey(key))!;
  const app = await sfs.apply(orgId, owner, key, { policyReferences: await fixtureBusinessPolicies(ds, key) });
  await sfs.decideMembership(sf, sfOperator, app.id, 'approve');
  return app.id as string;
}

d('Neture 약국 매장 commerce — 격리 PostgreSQL 통합 검증', () => {
  let pharmacyOperator: string;

  beforeAll(async () => {
    ds = new DataSource({ type: 'postgres', url: DB_URL, entities: [], synchronize: false, logging: false });
    await ds.initialize();
    membership = new PharmacyMembershipService(ds, provisioner);
    sfs = new SemiFranchiseService(ds);
    proposals = new SupplyProposalService(ds);
    events = new SemiFranchiseEventService(ds);
    recruitments = new SemiFranchiseRecruitmentService(ds);
    cart = new PharmacyCartService(ds, new EventOfferService(ds), sqlOrderCreator);
    payments = new PharmacyPaymentService(ds, bridger, () => 'test');
    operatorId = await user();
    await role(operatorId, 'neture:operator');
    pharmacyOperator = await user();
    await role(pharmacyOperator, 'neture:operator');
    await sfs.assignOperator('pharmacy', pharmacyOperator, operatorId);
    // 계약 게이트가 다른 테스트 데이터에 영향받지 않도록 캐시를 비운다.
    (policyAcceptanceService as any).publishedAgreementCache?.clear?.();
  });

  afterAll(async () => {
    if (ds?.isInitialized) await ds.destroy();
  });

  describe('독립 커뮤니티 · 사업 커뮤니티 공간', () => {
    it('독립 community 서비스 가입과 사업 가입을 분리하고, 담당 운영자·정지·종료를 원장에서 판정한다', async () => {
      const member = await approvedPharmacy();
      const independentKey = uniq('independent');
      const [independent] = await ds.query("INSERT INTO communities (slug,name,status) VALUES ($1,'Independent','active') RETURNING id", [independentKey]);
      const sfKey = uniq('biz-community');
      const sfCommunityKey = uniq('biz-forum');
      await sfs.create({ key: sfKey, name: 'Business', communityKey: sfCommunityKey });
      const otherOperator = await user();
      await role(otherOperator, 'neture:operator');
      await sfs.assignOperator(sfKey, pharmacyOperator, operatorId);
      const actor = { id: member.owner };
      // Retired per-community rows never grant access to the independent service.
      expect(await resolveCommunityWorkspace(ds, actor, independentKey)).toBeNull();
      expect(await resolveCommunityWorkspace(ds, actor, 'community')).toMatchObject({ allowed: false, canJoin: true });
      await ds.query("INSERT INTO community_memberships (community_id,user_id,status,role) VALUES ($1,$2,'active','member')", [independent.id, member.owner]);
      expect(await resolveCommunityWorkspace(ds, actor, independentKey)).toBeNull();
      expect(await resolveCommunityWorkspace(ds, actor, 'community')).toMatchObject({ allowed: false });
      await ds.query("INSERT INTO service_memberships(user_id,service_key,role,status) VALUES ($1,'community','member','active')", [member.owner]);
      expect(await resolveCommunityWorkspace(ds, actor, 'community')).toMatchObject({ allowed: true, forumStorageCodes: ['community'] });
      expect(await resolveCommunityWorkspace(ds, actor, independentKey)).toBeNull();
      expect(await resolveCommunityWorkspace(ds, actor, sfCommunityKey)).toMatchObject({ allowed: false, canJoin: false });
      expect(await listCommunityWorkspaces(ds, actor)).not.toEqual(expect.arrayContaining([expect.objectContaining({ communityKey: sfCommunityKey })]));
      const businessMembershipId = await joinSemiFranchise(member.orgId, member.owner, sfKey, pharmacyOperator);
      const business = (await resolveCommunityWorkspace(ds, actor, sfCommunityKey))!;
      expect(business.allowed).toBe(true);
      expect(business.forumStorageCodes).not.toEqual(['community']);
      expect(await resolveCommunityWorkspace(ds, { id: otherOperator }, sfCommunityKey)).toMatchObject({ allowed: false, canManage: false });
      const operator = (await resolveCommunityWorkspace(ds, { id: pharmacyOperator }, sfCommunityKey))!;
      expect(operator).toMatchObject({ allowed: true, canManage: true });
      const board = await createCommunityBoard(ds, operator, pharmacyOperator, { name: 'Members board' });
      expect((await ds.query('SELECT service_code FROM forum_category_requests WHERE id = $1', [board.id]))[0].service_code).toBe(operator.forumStorageCodes[0]);
      await expect(createCommunityBoard(ds, business, member.owner, { name: 'Forbidden' })).rejects.toThrow('COMMUNITY_OPERATOR_REQUIRED');
      await ds.query("UPDATE semi_franchise_memberships SET status = 'suspended' WHERE id = $1", [businessMembershipId]);
      expect(await resolveCommunityWorkspace(ds, actor, sfCommunityKey)).toMatchObject({ allowed: false });
      expect(await resolveCommunityWorkspace(ds, actor, 'community')).toMatchObject({ allowed: true });
      await ds.query("UPDATE service_memberships SET status='suspended' WHERE user_id=$1 AND service_key='community'", [member.owner]);
      expect(await resolveCommunityWorkspace(ds, actor, 'community')).toMatchObject({ allowed: false });
      await sfs.decideMembership((await sfs.getByKey(sfKey))!, pharmacyOperator, businessMembershipId, 'reactivate');
      expect(await resolveCommunityWorkspace(ds, actor, sfCommunityKey)).toMatchObject({ allowed: true });
      expect(await resolveCommunityWorkspace(ds, actor, 'community')).toMatchObject({ allowed: false });
      await ds.query("UPDATE semi_franchises SET status = 'closed' WHERE key = $1", [sfKey]);
      expect(await resolveCommunityWorkspace(ds, { id: pharmacyOperator }, sfCommunityKey)).toMatchObject({ kind: 'semi-franchise', allowed: false, canManage: false });
    });

    it('사업 포럼 주소는 기존 약사 포럼·독립 커뮤니티·개설 신청과 충돌할 수 없다', async () => {
      await expect(sfs.create({ key: uniq('bad'), name: 'Bad', communityKey: 'pharmacy' })).rejects.toMatchObject({ code: 'COMMUNITY_KEY_IN_USE' });
      const slug = uniq('reserved-community');
      await ds.query("INSERT INTO communities (slug,name,status) VALUES ($1,'Reserved','active')", [slug]);
      await expect(sfs.create({ key: uniq('bad'), name: 'Bad', communityKey: slug })).rejects.toMatchObject({ code: 'COMMUNITY_KEY_IN_USE' });
      const pendingSlug = uniq('pending-community');
      await ds.query("INSERT INTO community_creation_requests (requester_user_id,desired_slug,name,status) VALUES ($1,$2,'Pending','pending')", [operatorId, pendingSlug]);
      await expect(sfs.create({ key: uniq('bad'), name: 'Bad', communityKey: pendingSlug })).rejects.toMatchObject({ code: 'COMMUNITY_KEY_IN_USE' });
    });
  });

  // ─── 가입 · 권한 ────────────────────────────────────────────────────────
  describe('내 매장(약국) 신청 · 매장 게이트', () => {
    it('메인 확인·본인 증빙·신청 당시 조건을 각각 검증한다', async () => {
      const owner = await user();
      const proof = await applicationProof(owner);
      await ds.query(`UPDATE users SET "isEmailVerified" = false WHERE id = $1`, [owner]);
      await expect(membership.apply(owner, { ...proof, pharmacyName: uniq('약국'), businessNumber: randomBizno(), pharmacistLicenseNumber: 'L' }))
        .rejects.toMatchObject({ code: 'NETURE_MEMBERSHIP_REQUIRED' });
      await ds.query(`UPDATE users SET "isEmailVerified" = true WHERE id = $1`, [owner]);
      const other = await user();
      await expect(membership.apply(other, { ...proof, pharmacyName: uniq('약국'), businessNumber: randomBizno(), pharmacistLicenseNumber: 'L' }))
        .rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
      const pharmacy = await approvedPharmacy();
      const key = uniq('conditions');
      const sf = await sfs.create({ key, name: 'Synthetic conditions', registrationConditions: 'Original condition' });
      await expect(sfs.apply(pharmacy.orgId, pharmacy.owner, key)).rejects.toMatchObject({ code: 'CONDITIONS_REQUIRED' });
      await expect(sfs.apply(pharmacy.orgId, pharmacy.owner, key, { acceptedConditions: true, conditions: 'Stale condition' })).rejects.toMatchObject({ code: 'CONDITIONS_CHANGED' });
      await sfs.apply(pharmacy.orgId, pharmacy.owner, key, { acceptedConditions: true, conditions: 'Original condition', note: 'Synthetic note', policyReferences: await fixtureBusinessPolicies(ds, key) });
      expect((await sfs.listMemberships(sf))[0].application).toMatchObject({ conditions: 'Original condition', accepted: true, note: 'Synthetic note' });
      await sfs.update(key, { registrationConditions: 'Updated condition' });
      expect((await sfs.getByKey(key))?.registration_conditions).toBe('Updated condition');
    });

    it('신청(pending)은 매장 권한이 없고, 운영자 승인 후에만 매장이 열린다', async () => {
      const owner = await user();
      const bizno = randomBizno();
      const row = await membership.apply(owner, { ...await applicationProof(owner), pharmacyName: uniq('약국'), businessNumber: `${bizno.slice(0, 3)}-${bizno.slice(3, 5)}-${bizno.slice(5)}`, pharmacistLicenseNumber: 'L-9' });
      expect(row.status).toBe('pending');
      expect((await isStoreOwner(ds, owner, 'kpa')).isOwner).toBe(false);

      const approved = await membership.decide(operatorId, row.id, 'approve');
      expect(approved.status).toBe('active');
      const check = await isStoreOwner(ds, owner, 'kpa');
      expect(check.isOwner).toBe(true);
      expect(check.organizationId).toBe(row.organization_id);
      expect(provisionerCalls).toContain(`activate:${row.organization_id}`);

      // 같은 사업자번호로 다른 사용자가 진행 중 신청 불가
      const other = await user();
      await expect(membership.apply(other, { ...await applicationProof(other), pharmacyName: 'x', businessNumber: bizno, pharmacistLicenseNumber: 'L' }))
        .rejects.toMatchObject({ code: 'BUSINESS_NUMBER_IN_USE' });
      // 이미 가입한 사용자는 두 번째 약국을 만들 수 없다(약국 1 : 매장 1)
      await expect(membership.apply(owner, { ...await applicationProof(owner), pharmacyName: 'y', businessNumber: randomBizno(), pharmacistLicenseNumber: 'L' }))
        .rejects.toMatchObject({ code: 'ALREADY_APPLIED' });

      // 정지 → 매장 차단, 재활성 → 복구
      await membership.decide(operatorId, row.id, 'suspend', '테스트');
      expect((await isStoreOwner(ds, owner, 'kpa')).isOwner).toBe(false);
      expect(provisionerCalls).toContain(`deactivate:${row.organization_id}`);
      await membership.decide(operatorId, row.id, 'reactivate');
      expect((await isStoreOwner(ds, owner, 'kpa')).isOwner).toBe(true);
      // 허용되지 않은 전이
      await expect(membership.decide(operatorId, row.id, 'approve')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    });

    it('kpa-society 가입 + kpa:store_owner + 연결 조직이 있어도 내 매장(약국) 신청이 없으면 매장 권한이 없다(재해석 금지)', async () => {
      const legacy = await user();
      const [org] = await ds.query(`INSERT INTO organizations (name, code, type) VALUES ('옛약국', $1, 'pharmacy') RETURNING id`, [uniq('kpa-pharm')]);
      await ds.query(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [org.id, legacy]);
      await ds.query(`INSERT INTO platform_services (code, name) VALUES ('kpa-society', 'pharmacy') ON CONFLICT DO NOTHING`);
      await ds.query(`INSERT INTO organization_service_enrollments (organization_id, service_code, status) VALUES ($1, 'kpa-society', 'active')`, [org.id]);
      await ds.query(`INSERT INTO service_memberships (user_id, service_key, status) VALUES ($1, 'kpa-society', 'active')`, [legacy]);
      await role(legacy, 'kpa:store_owner');
      expect((await isStoreOwner(ds, legacy, 'kpa')).isOwner).toBe(false);
    });

    it('세미프랜차이즈 미가입이어도 매장은 열리지만 공급 옵션은 0이다', async () => {
      const p = await approvedPharmacy();
      await supplierWithProduct({ price: 10000, defaultSupplyEnabled: true });
      expect((await isStoreOwner(ds, p.owner, 'kpa')).isOwner).toBe(true);
      const list = await listSupplyOptions(ds, p.orgId);
      expect(list.total).toBe(0);
    });

    it('기본 승인은 세미프랜차이즈 가입을 자동 승인하지 않고, 비담당 운영자는 처리할 수 없다', async () => {
      const p = await approvedPharmacy();
      const app = await sfs.apply(p.orgId, p.owner, 'pharmacy', { policyReferences: await fixtureBusinessPolicies(ds, 'pharmacy') });
      expect(app.status).toBe('pending');
      const stranger = await user();
      await role(stranger, 'neture:operator');
      await expect(sfs.requireOperatorOf(stranger, 'pharmacy')).rejects.toMatchObject({ httpStatus: 403 });
      const sf = await sfs.requireOperatorOf(pharmacyOperator, 'pharmacy');
      expect((await sfs.decideMembership(sf, pharmacyOperator, app.id, 'approve')).status).toBe('active');
    });
  });

  describe('세미프랜차이즈 커뮤니티 접근', () => {
    it('가입 승인 = 이용, 정지 = 차단, 일반 커뮤니티 키는 판정 대상 아님, community_memberships 생성 0', async () => {
      const key = `cf-${tag}`;
      const op = await user();
      await role(op, 'neture:operator');
      await sfs.create({ key, name: 'C', communityKey: `community-${key}` });
      await sfs.assignOperator(key, op, operatorId);
      const p = await approvedPharmacy();
      const before = await resolveSemiFranchiseCommunityAccess(ds, p.owner, `community-${key}`);
      expect(before).toMatchObject({ semiFranchise: true, allowed: false });
      const mId = await joinSemiFranchise(p.orgId, p.owner, key, op);
      expect((await resolveSemiFranchiseCommunityAccess(ds, p.owner, `community-${key}`)).allowed).toBe(true);
      await sfs.decideMembership((await sfs.getByKey(key))!, op, mId, 'suspend');
      expect((await resolveSemiFranchiseCommunityAccess(ds, p.owner, `community-${key}`)).allowed).toBe(false);
      expect((await resolveSemiFranchiseCommunityAccess(ds, p.owner, 'pharmacy')).semiFranchise).toBe(false);
      const [cm] = await ds.query(`SELECT count(*)::int AS c FROM community_memberships WHERE user_id = $1`, [p.owner]);
      expect(cm.c).toBe(0);
    });
  });

  describe('pharmacy.neture.co.kr 이용 자격 (로그인 · handoff 공용 판정)', () => {
    it('기본 active ∧ pharmacy active 일 때만 허용 · 단계별 next · 기존 kpa-society 가입은 재해석하지 않는다', async () => {
      const access = (u: string) => resolveSemiFranchiseServiceAccess(ds, u, 'pharmacy');
      const owner = await user();
      expect(await access(owner)).toMatchObject({ allowed: false, next: 'apply_pharmacy', pharmacyMembershipStatus: null });

      const row = await membership.apply(owner, { ...await applicationProof(owner), pharmacyName: uniq('약국'), businessNumber: randomBizno(), pharmacistLicenseNumber: 'L-2' });
      expect(await access(owner)).toMatchObject({ allowed: false, next: 'pharmacy_pending', pharmacyMembershipStatus: 'pending' });
      await membership.decide(operatorId, row.id, 'approve');
      expect(await access(owner)).toMatchObject({ allowed: false, next: 'apply_semi_franchise', pharmacyMembershipStatus: 'active', semiFranchiseMembershipStatus: null });

      const sf = (await sfs.getByKey('pharmacy'))!;
      const app = await sfs.apply(row.organization_id, owner, 'pharmacy', { policyReferences: await fixtureBusinessPolicies(ds, 'pharmacy') });
      expect(await access(owner)).toMatchObject({ allowed: false, next: 'semi_franchise_pending', semiFranchiseMembershipStatus: 'pending' });
      await sfs.decideMembership(sf, pharmacyOperator, app.id, 'approve');
      expect(await access(owner)).toMatchObject({ allowed: true, next: null, pharmacyMembershipStatus: 'active', semiFranchiseMembershipStatus: 'active' });

      await sfs.decideMembership(sf, pharmacyOperator, app.id, 'suspend');
      expect(await access(owner)).toMatchObject({ allowed: false, next: 'semi_franchise_suspended' });
      await sfs.decideMembership(sf, pharmacyOperator, app.id, 'reactivate');
      expect((await access(owner)).allowed).toBe(true);

      // 내 매장(약국) 신청 정지 → 세미프랜차이즈 active 여도 차단
      await membership.decide(operatorId, row.id, 'suspend', '테스트');
      expect(await access(owner)).toMatchObject({ allowed: false, next: 'pharmacy_suspended' });
      await membership.decide(operatorId, row.id, 'reactivate');
      expect((await access(owner)).allowed).toBe(true);

      // 조직 탈퇴(left_at) 구성원은 자격 없음
      await ds.query(`UPDATE organization_members SET left_at = NOW() WHERE organization_id = $1 AND user_id = $2`, [row.organization_id, owner]);
      expect((await access(owner)).allowed).toBe(false);

      // 기존 kpa-society 가입 · 역할 · 연결 조직은 Neture 자격이 아니다
      const legacy = await user();
      const [org] = await ds.query(`INSERT INTO organizations (name, code, type) VALUES ('옛약국2', $1, 'pharmacy') RETURNING id`, [uniq('kpa-pharm')]);
      await ds.query(`INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')`, [org.id, legacy]);
      await ds.query(`INSERT INTO service_memberships (user_id, service_key, status) VALUES ($1, 'kpa-society', 'active')`, [legacy]);
      await role(legacy, 'kpa:store_owner');
      expect(await access(legacy)).toMatchObject({ allowed: false, next: 'apply_pharmacy' });
    });
  });

  describe('세미프랜차이즈 콘텐츠 자료함', () => {
    it('담당 운영자 작성 · 게시 → 가입 약국만 열람 · 사본, 미가입 · 보관은 비노출, 비담당 운영자 처리 불가', async () => {
      const key = `ct-${tag}`;
      const op = await user();
      await role(op, 'neture:operator');
      await sfs.create({ key, name: '콘텐츠 세미프랜차이즈' });
      await sfs.assignOperator(key, op, operatorId);
      const sf = await sfs.requireOperatorOf(op, key);
      await expect(sfs.requireOperatorOf(pharmacyOperator, key)).rejects.toMatchObject({ httpStatus: 403 });

      const svc = new SemiFranchiseContentService(ds, async (input) => {
        const [r] = await ds.query(
          `INSERT INTO o4o_asset_snapshots (organization_id, source_service, source_asset_id, asset_type, title, content_json, created_by)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING id`,
          [input.targetOrganizationId, input.sourceService, input.sourceAssetId, input.assetType, input.title,
            JSON.stringify(input.contentJson), input.createdBy],
        );
        return { snapshotId: r.id };
      });
      const created = await svc.operatorCreate(sf, op, { title: '판촉 가이드', summary: '요약', body: '<p>본문</p>', tags: ['가이드'] });
      const member = await approvedPharmacy();
      const outsider = await approvedPharmacy();
      await joinSemiFranchise(member.orgId, member.owner, key, op);

      // 초안은 가입 약국에도 보이지 않는다
      expect((await svc.pharmacyList(member.orgId)).total).toBe(0);
      await svc.operatorSetStatus(sf, op, created.id, 'publish');
      const list = await svc.pharmacyList(member.orgId, { sfKey: key });
      expect(list.items.map((c: any) => c.title)).toEqual(['판촉 가이드']);
      expect((await svc.pharmacyList(outsider.orgId)).total).toBe(0);
      await expect(svc.pharmacyGet(outsider.orgId, created.id)).rejects.toMatchObject({ httpStatus: 404 });
      await expect(svc.pharmacyCopy(outsider.orgId, outsider.owner, created.id)).rejects.toMatchObject({ httpStatus: 404 });

      const { snapshotId } = await svc.pharmacyCopy(member.orgId, member.owner, created.id);
      const [snap] = await ds.query(`SELECT organization_id, source_service, asset_type, content_json FROM o4o_asset_snapshots WHERE id = $1`, [snapshotId]);
      expect(snap).toMatchObject({ organization_id: member.orgId, source_service: 'semi-franchise', asset_type: 'content' });
      expect(snap.content_json).toMatchObject({ title: '판촉 가이드', semiFranchiseKey: key });

      // 원본 수정은 사본에 전파되지 않는다
      await svc.operatorUpdate(sf, op, created.id, { title: '판촉 가이드 v2' });
      const [snap2] = await ds.query(`SELECT title FROM o4o_asset_snapshots WHERE id = $1`, [snapshotId]);
      expect(snap2.title).toBe('판촉 가이드');

      // 보관하면 약국에 보이지 않지만 사본은 남는다
      await svc.operatorSetStatus(sf, op, created.id, 'archive');
      expect((await svc.pharmacyList(member.orgId)).total).toBe(0);
      const [still] = await ds.query(`SELECT count(*)::int AS c FROM o4o_asset_snapshots WHERE id = $1`, [snapshotId]);
      expect(still.c).toBe(1);

      // 가입 정지 → 다시 게시해도 보이지 않음
      await svc.operatorSetStatus(sf, op, created.id, 'publish');
      const [m] = await ds.query(`SELECT id FROM semi_franchise_memberships WHERE organization_id = $1 AND semi_franchise_id = $2`, [member.orgId, sf.id]);
      await sfs.decideMembership(sf, op, m.id, 'suspend');
      expect((await svc.pharmacyList(member.orgId)).total).toBe(0);
    });
  });

  // ─── 공급 제안 ──────────────────────────────────────────────────────────
  describe('공급 경로 판정', () => {
    let xOperator: string;
    beforeAll(async () => {
      xOperator = await user();
      await role(xOperator, 'neture:operator');
      await sfs.create({ key: `x-${tag}`, name: 'X 세미프랜차이즈' });
      await sfs.assignOperator(`x-${tag}`, xOperator, operatorId);
    });

    it('pharmacy 기본 공급은 명시적 게시 선택·가입을 따르고 legacy service_keys에서 자동 추론하지 않는다', async () => {
      const plain = await supplierWithProduct({ price: 12000, defaultSupplyEnabled: true });
      const designated = await supplierWithProduct({ price: 13000, serviceKeys: ['k-cosmetics'] });
      const unpublished = await supplierWithProduct({ price: 14000 });
      const member = await approvedPharmacy();
      const outsider = await approvedPharmacy();
      await joinSemiFranchise(member.orgId, member.owner, 'pharmacy', pharmacyOperator);

      const opt = await getSupplyOption(ds, member.orgId, 'default', plain.offerId);
      expect(opt).toMatchObject({ kind: 'default', semiFranchiseKey: 'pharmacy', unitPrice: 12000 });
      expect(await getSupplyOption(ds, member.orgId, 'default', designated.offerId)).toBeNull();
      expect(await getSupplyOption(ds, member.orgId, 'default', unpublished.offerId)).toBeNull();
      // Registration/legacy service keys do not choose publication; an explicit persisted choice does.
      await ds.query('UPDATE supplier_product_offers SET default_supply_enabled=true WHERE id=$1', [designated.offerId]);
      expect(await getSupplyOption(ds, member.orgId, 'default', designated.offerId)).toMatchObject({ unitPrice: 13000 });
      await ds.query('UPDATE supplier_product_offers SET default_supply_enabled=false WHERE id=$1', [designated.offerId]);
      expect(await getSupplyOption(ds, member.orgId, 'default', designated.offerId)).toBeNull();
      expect(await getSupplyOption(ds, outsider.orgId, 'default', plain.offerId)).toBeNull();
    });

    it('명시적 제안은 담당 운영자 승인 후에만, 가입 약국에만 보이고 같은 제품 복수 제안이 공존한다', async () => {
      const prod = await supplierWithProduct({ price: 20000 });
      const member = await approvedPharmacy();
      const nonMember = await approvedPharmacy();
      await joinSemiFranchise(member.orgId, member.owner, `x-${tag}`, xOperator);
      const sfX = (await sfs.getByKey(`x-${tag}`))!;

      const p1 = await proposals.supplierCreate(prod.supplierId, prod.supplierUser, { offerId: prod.offerId, semiFranchiseKey: `x-${tag}`, unitPrice: 18000 });
      const p2 = await proposals.supplierCreate(prod.supplierId, prod.supplierUser, { offerId: prod.offerId, semiFranchiseKey: `x-${tag}`, unitPrice: 17000 });
      expect(await getSupplyOption(ds, member.orgId, 'proposal', p1.id)).toBeNull(); // 승인 전
      // pharmacy 운영자는 X 의 제안을 처리할 수 없다(범위 밖 = 존재 비노출)
      const sfPharmacy = (await sfs.getByKey('pharmacy'))!;
      await expect(proposals.operatorDecide(sfPharmacy, pharmacyOperator, p1.id, 'approve')).rejects.toMatchObject({ httpStatus: 404 });

      await proposals.operatorDecide(sfX, xOperator, p1.id, 'approve');
      await proposals.operatorDecide(sfX, xOperator, p2.id, 'approve');
      const list = await listSupplyOptions(ds, member.orgId, { source: 'proposal' });
      const prices = list.items.filter((o) => o.offerId === prod.offerId).map((o) => o.unitPrice).sort();
      expect(prices).toEqual([17000, 18000]);
      expect(await getSupplyOption(ds, nonMember.orgId, 'proposal', p1.id)).toBeNull();

      // 가입 정지 → 전용 제안 차단
      const [m] = await ds.query(`SELECT id FROM semi_franchise_memberships WHERE organization_id = $1 AND semi_franchise_id = $2`, [member.orgId, sfX.id]);
      await sfs.decideMembership(sfX, xOperator, m.id, 'suspend');
      expect(await getSupplyOption(ds, member.orgId, 'proposal', p1.id)).toBeNull();
    });

    it('개별 약국 대상 제안은 그 약국에만 보인다', async () => {
      const prod = await supplierWithProduct({ price: 9000 });
      const a = await approvedPharmacy();
      const b = await approvedPharmacy();
      await joinSemiFranchise(a.orgId, a.owner, 'pharmacy', pharmacyOperator);
      await joinSemiFranchise(b.orgId, b.owner, 'pharmacy', pharmacyOperator);
      const sp = await proposals.supplierCreate(prod.supplierId, prod.supplierUser, { offerId: prod.offerId, semiFranchiseKey: 'pharmacy', targetOrganizationId: a.orgId, unitPrice: 8500 });
      await proposals.operatorDecide((await sfs.getByKey('pharmacy'))!, pharmacyOperator, sp.id, 'approve');
      expect(await getSupplyOption(ds, a.orgId, 'proposal', sp.id)).toMatchObject({ unitPrice: 8500 });
      expect(await getSupplyOption(ds, b.orgId, 'proposal', sp.id)).toBeNull();
    });

    it('2단계: 같은 제품의 복수 이벤트·취소 후 재신청 허용, 중복 원장이 있으면 인덱스 롤백 차단', async () => {
      const prod = await supplierWithProduct({ price: 10000 });
      const member = await approvedPharmacy();
      await joinSemiFranchise(member.orgId, member.owner, 'pharmacy', pharmacyOperator);
      const sf = (await sfs.getByKey('pharmacy'))!;
      const window = { startAt: new Date(Date.now() - 3600_000).toISOString(), endAt: new Date(Date.now() + 86400_000).toISOString() };
      try {
        await ds.transaction(m => transitionEventIndex(m, 'up'));
        expect(await eventIndexState(ds.manager)).toBe('phase-two');
        await ds.transaction(m => transitionEventIndex(m, 'up')); // repeatable
        const input = { offerId: prod.offerId, semiFranchiseKey: 'pharmacy', eventPrice: 8000, totalQuantity: 10, ...window };
        const a = await events.supplierCreate(prod.supplierId, prod.supplierUser, input);
        const b = await events.supplierCreate(prod.supplierId, prod.supplierUser, input);
        await events.operatorDecide(sf, pharmacyOperator, a.id, 'approve');
        await events.operatorDecide(sf, pharmacyOperator, b.id, 'approve');
        expect(await getSupplyOption(ds, member.orgId, 'event', a.id)).toMatchObject({ totalQuantity: 10 });
        expect(await getSupplyOption(ds, member.orgId, 'event', b.id)).toMatchObject({ totalQuantity: 10 });
        await events.supplierCancel(prod.supplierId, a.id);
        const c = await events.supplierCreate(prod.supplierId, prod.supplierUser, input);
        expect(c.id).not.toBe(a.id);
        expect(await getSupplyOption(ds, member.orgId, 'event', a.id)).toBeNull();
        expect(await getSupplyOption(ds, member.orgId, 'event', b.id)).not.toBeNull();
        await expect(ds.transaction(m => transitionEventIndex(m, 'down'))).rejects.toThrow('EVENT_INDEX_ROLLBACK_HAS_DUPLICATE_LISTINGS');
        expect(await eventIndexState(ds.manager)).toBe('phase-two');
      } finally {
        await ds.query('DELETE FROM organization_product_listings WHERE offer_id = $1', [prod.offerId]);
        await ds.transaction(m => transitionEventIndex(m, 'down'));
        expect(await eventIndexState(ds.manager)).toBe('phase-one');
      }
    });

    // WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1 1단계: idx_org_listing_unique_v2 전체 UNIQUE 유지 → 재신청 · 복수 이벤트는 명시 거절.
    //   2단계(부분 UNIQUE) 배포 때 이 기대값을 '재신청 가능 · 복수 승인 공존'으로 되돌린다.
    it('이벤트: 승인 후 노출 · 종료 후 같은 제품 재신청은 1단계에서 명시 거절(500 아님) · 가격 수정 경로 없음', async () => {
      const prod = await supplierWithProduct({ price: 10000 });
      const member = await approvedPharmacy();
      await joinSemiFranchise(member.orgId, member.owner, 'pharmacy', pharmacyOperator);
      const sf = (await sfs.getByKey('pharmacy'))!;
      const window = { startAt: new Date(Date.now() - 3600_000).toISOString(), endAt: new Date(Date.now() + 86400_000).toISOString() };

      await expect(events.supplierCreate(prod.supplierId, prod.supplierUser, { offerId: prod.offerId, semiFranchiseKey: 'pharmacy', eventPrice: 11000, ...window }))
        .rejects.toMatchObject({ code: 'INVALID_EVENT_PRICE' });
      const e1 = await events.supplierCreate(prod.supplierId, prod.supplierUser, { offerId: prod.offerId, semiFranchiseKey: 'pharmacy', eventPrice: 8000, ...window });
      expect(await getSupplyOption(ds, member.orgId, 'event', e1.id)).toBeNull();
      await events.operatorDecide(sf, pharmacyOperator, e1.id, 'approve');
      expect(await getSupplyOption(ds, member.orgId, 'event', e1.id)).toMatchObject({ unitPrice: 8000 });

      await events.supplierCancel(prod.supplierId, e1.id);
      expect(await getSupplyOption(ds, member.orgId, 'event', e1.id)).toBeNull();
      // 취소된 이벤트는 되살릴 수 없다(종료 단방향)
      await expect(events.operatorDecide(sf, pharmacyOperator, e1.id, 'approve')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });

      await expect(events.supplierCreate(prod.supplierId, prod.supplierUser, { offerId: prod.offerId, semiFranchiseKey: 'pharmacy', eventPrice: 7500, ...window }))
        .rejects.toMatchObject({ httpStatus: 409, code: 'EVENT_REAPPLY_NOT_YET_SUPPORTED' });
      const [cnt] = await ds.query(
        `SELECT count(*)::int AS n FROM organization_product_listings WHERE organization_id = $1 AND service_key = 'neture-event-offer' AND offer_id = $2`,
        [sf.organization_id, prod.offerId],
      );
      expect(cnt.n).toBe(1);
      // 다른 제품의 이벤트는 그대로 신청 · 승인된다
      const other = await supplierWithProduct({ price: 9000 });
      const e2 = await events.supplierCreate(other.supplierId, other.supplierUser, { offerId: other.offerId, semiFranchiseKey: 'pharmacy', eventPrice: 7000, ...window });
      await events.operatorDecide(sf, pharmacyOperator, e2.id, 'approve');
      expect(await getSupplyOption(ds, member.orgId, 'event', e2.id)).toMatchObject({ unitPrice: 7000 });
      expect(typeof (events as any).updatePrice).toBe('undefined');
    });

    it.each(['neture-pharmacy', 'kpa-society'])('미지정 %s 모집도 pharmacy 중복 생성 검사에 포함한다', async serviceKey => {
      const prod = await supplierWithProduct({ price: 15000 });
      const existing = await recruitments.supplierCreate(prod.supplierUser, [prod.supplierId], { masterId: prod.masterId, supplyUnitPrice: 13000 });
      await ds.query('UPDATE seller_recruitments SET semi_franchise_id = NULL, service_id = $2 WHERE id = $1', [existing.id, serviceKey]);
      await expect(recruitments.supplierCreate(prod.supplierUser, [prod.supplierId], { masterId: prod.masterId, semiFranchiseKey: 'pharmacy', supplyUnitPrice: 12000 }))
        .rejects.toMatchObject({ code: 'RECRUITMENT_ALREADY_EXISTS' });
      expect((await recruitments.supplierList(prod.supplierUser)).map(row => row.id)).toEqual([existing.id]);
    });

    it('약국 대상이 아닌 서비스의 미지정 모집은 pharmacy 중복으로 재해석하지 않는다', async () => {
      const prod = await supplierWithProduct({ price: 15000 });
      const foreign = await recruitments.supplierCreate(prod.supplierUser, [prod.supplierId], { masterId: prod.masterId, supplyUnitPrice: 13000 });
      await ds.query("UPDATE seller_recruitments SET semi_franchise_id = NULL, service_id = 'k-cosmetics' WHERE id = $1", [foreign.id]);
      const pharmacy = await recruitments.supplierCreate(prod.supplierUser, [prod.supplierId], { masterId: prod.masterId, supplyUnitPrice: 12000 });
      expect(pharmacy.id).not.toBe(foreign.id);
      expect((await recruitments.supplierList(prod.supplierUser)).map(row => row.id)).toEqual([pharmacy.id]);
    });

    it('모집: 조건 승인 → 약국 조직 참여 신청 → 공급자 승인 후 모집 공급가로 바로 주문 옵션이 생긴다', async () => {
      const prod = await supplierWithProduct({ price: 15000 });
      const member = await approvedPharmacy();
      await joinSemiFranchise(member.orgId, member.owner, 'pharmacy', pharmacyOperator);
      const sf = (await sfs.getByKey('pharmacy'))!;
      const rec = await recruitments.supplierCreate(prod.supplierUser, [prod.supplierId], { masterId: prod.masterId, semiFranchiseKey: 'pharmacy', supplyUnitPrice: 13000 });
      await expect(recruitments.pharmacyApply(member.orgId, member.owner, rec.id)).rejects.toMatchObject({ code: 'RECRUITMENT_NOT_AVAILABLE' });
      await recruitments.operatorDecide(sf, pharmacyOperator, rec.id, 'approve');
      await expect(recruitments.operatorDecide(sf, pharmacyOperator, rec.id, 'approve')).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
      const app = await recruitments.pharmacyApply(member.orgId, member.owner, rec.id);
      expect(await getSupplyOption(ds, member.orgId, 'recruitment', rec.id)).toBeNull();
      // 공급자 참여 승인(기존 approveApplication 의 상태 전이와 같은 결과)
      await ds.query(`UPDATE seller_recruitment_applications SET status = 'approved', decided_at = NOW() WHERE id = $1`, [app.id]);
      expect(await getSupplyOption(ds, member.orgId, 'recruitment', rec.id)).toMatchObject({ unitPrice: 13000, kind: 'recruitment' });
      const [opl] = await ds.query(`SELECT count(*)::int AS c FROM organization_product_listings WHERE organization_id = $1`, [member.orgId]);
      expect(opl.c).toBe(0); // 취급 등록(진열) 없이 주문 가능
    });
  });

  // ─── 주문 · 결제 ────────────────────────────────────────────────────────
  describe('주문 · 결제', () => {
    it('장바구니는 (구매자, 약국 조직) 단위 — A 약국에 담은 행을 B 약국 문맥에서 보거나 바꾸거나 주문할 수 없다', async () => {
      const prod = await supplierWithProduct({ price: 10000, defaultSupplyEnabled: true });
      const a = await approvedPharmacy();
      const b = await approvedPharmacy();
      await joinSemiFranchise(a.orgId, a.owner, 'pharmacy', pharmacyOperator);
      await joinSemiFranchise(b.orgId, b.owner, 'pharmacy', pharmacyOperator);
      const buyer = a.owner; // 내부 격리 검증용 호출. 실제 타 약국 접근은 route의 조직 권한 gate가 판정한다.
      const added = await cart.add(buyer, a.orgId, { kind: 'default', id: prod.offerId, quantity: 1 });

      expect(await cart.list(buyer, b.orgId)).toEqual([]);
      await expect(cart.updateQuantity(buyer, b.orgId, added.id, 5)).rejects.toMatchObject({ code: 'CART_ITEM_NOT_FOUND' });
      await cart.remove(buyer, b.orgId, added.id);
      await expect(cart.checkout(buyer, b.orgId)).rejects.toMatchObject({ code: 'CART_EMPTY' });
      // B 에서 같은 옵션을 담으면 A 행과 합쳐지지 않고 별도 행
      const addedB = await cart.add(buyer, b.orgId, { kind: 'default', id: prod.offerId, quantity: 2 });
      expect(addedB.id).not.toBe(added.id);

      const r = await cart.checkout(buyer, a.orgId);
      expect(r.failedItems).toEqual([]);
      const [o] = await ds.query(`SELECT "sellerOrganizationId", items FROM checkout_orders WHERE id = $1`, [r.createdOrders[0].orderId]);
      expect(o.sellerOrganizationId).toBe(a.orgId);
      expect(o.items[0].quantity).toBe(1);
      // A 주문 확정은 B 장바구니를 지우지 않는다
      expect(await cart.list(buyer, b.orgId)).toEqual([expect.objectContaining({ id: addedB.id, quantity: 2 })]);
    });

    it('미지정 모집은 pharmacy로 판정하고 다른 사업의 가입으로 신청·주문을 열지 않는다', async () => {
      const prod = await supplierWithProduct({ price: 20000 });
      const member = await approvedPharmacy();
      const outsider = await approvedPharmacy();
      const sf = (await sfs.getByKey('pharmacy'))!;
      await joinSemiFranchise(member.orgId, member.owner, 'pharmacy', pharmacyOperator);
      const otherKey = uniq('other-recruitment');
      await sfs.create({ key: otherKey, name: 'Other business' });
      await sfs.assignOperator(otherKey, pharmacyOperator, operatorId);
      await joinSemiFranchise(outsider.orgId, outsider.owner, otherKey, pharmacyOperator);
      const rec = await recruitments.supplierCreate(prod.supplierUser, [prod.supplierId], { masterId: prod.masterId, supplyUnitPrice: 12000 });
      await ds.query('UPDATE seller_recruitments SET semi_franchise_id = NULL WHERE id = $1', [rec.id]);
      await recruitments.operatorDecide(sf, pharmacyOperator, rec.id, 'approve');
      expect(await recruitments.pharmacyBrowse(member.orgId)).toEqual(expect.arrayContaining([expect.objectContaining({ id: rec.id, semiFranchiseKey: 'pharmacy' })]));
      expect(await recruitments.pharmacyBrowse(outsider.orgId)).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: rec.id })]));
      await expect(recruitments.pharmacyApply(outsider.orgId, outsider.owner, rec.id)).rejects.toMatchObject({ code: 'RECRUITMENT_NOT_AVAILABLE' });
      const application = await recruitments.pharmacyApply(member.orgId, member.owner, rec.id);
      await ds.query("UPDATE seller_recruitment_applications SET status = 'approved' WHERE id = $1", [application.id]);
      expect(await getSupplyOption(ds, member.orgId, 'recruitment', rec.id)).toMatchObject({ semiFranchiseKey: 'pharmacy', unitPrice: 12000 });
      expect(await getSupplyOption(ds, outsider.orgId, 'recruitment', rec.id)).toBeNull();
      await ds.query("UPDATE semi_franchise_memberships SET status = 'suspended' WHERE organization_id = $1 AND semi_franchise_id = $2", [member.orgId, sf.id]);
      expect(await getSupplyOption(ds, member.orgId, 'recruitment', rec.id)).toBeNull();
    });

    it('선택 제안 가격이 청구 가격이고, 수취 주체별로 결제 묶음이 나뉘며, 결제는 대응 · 금액 · 멱등을 검증한다', async () => {
      const prod = await supplierWithProduct({ price: 30000, defaultSupplyEnabled: true });
      const member = await approvedPharmacy();
      await joinSemiFranchise(member.orgId, member.owner, 'pharmacy', pharmacyOperator);
      const yKey = `y-${tag}`;
      const yOp = await user();
      await role(yOp, 'neture:operator');
      await sfs.create({ key: yKey, name: 'Y' });
      await sfs.assignOperator(yKey, yOp, operatorId);
      await joinSemiFranchise(member.orgId, member.owner, yKey, yOp);
      const sp = await proposals.supplierCreate(prod.supplierId, prod.supplierUser, { offerId: prod.offerId, semiFranchiseKey: yKey, unitPrice: 25000 });
      await proposals.operatorDecide((await sfs.getByKey(yKey))!, yOp, sp.id, 'approve');

      // 권한 없는 제안 담기 차단
      const outsider = await approvedPharmacy();
      await expect(cart.add(outsider.owner, outsider.orgId, { kind: 'proposal', id: sp.id, quantity: 1 }))
        .rejects.toMatchObject({ code: 'SUPPLY_OPTION_NOT_AVAILABLE' });

      await cart.add(member.owner, member.orgId, { kind: 'default', id: prod.offerId, quantity: 1 });
      await cart.add(member.owner, member.orgId, { kind: 'proposal', id: sp.id, quantity: 2 });
      // 클라이언트 가격 스냅샷 변조는 무시된다
      await ds.query(`UPDATE store_cart_items SET price_snapshot = 1 WHERE buyer_id = $1`, [member.owner]);
      const result = await cart.checkout(member.owner, member.orgId);
      expect(result.failedItems).toEqual([]);
      // pharmacy(미확정) · Y(미확정) 수취 주체는 서로 합치지 않는다 → 결제 묶음 2개
      expect(result.paymentGroups).toHaveLength(2);
      const yGroup = result.paymentGroups.find((g) => g.receiverKey === `undetermined:${yKey}`)!;
      const [yOrder] = await ds.query(`SELECT items, "totalAmount" FROM checkout_orders WHERE id = $1`, [yGroup.orderIds[0]]);
      expect(yOrder.items[0]).toMatchObject({ unitPrice: 25000, quantity: 2, metadata: { supplyKind: 'proposal', supplyProposalId: sp.id } });
      expect(Number(yOrder.totalAmount)).toBe(50000); // 50,000 ≥ 무료배송 기준

      // 같은 수취 주체로 결정되면 한 묶음이 된다
      await ds.query(`UPDATE semi_franchises SET payment_receiver_key = 'R1' WHERE key IN ('pharmacy', $1)`, [yKey]);
      await cart.add(member.owner, member.orgId, { kind: 'default', id: prod.offerId, quantity: 1 });
      await cart.add(member.owner, member.orgId, { kind: 'proposal', id: sp.id, quantity: 1 });
      const merged = await cart.checkout(member.owner, member.orgId);
      expect(merged.paymentGroups).toHaveLength(1);
      await ds.query(`UPDATE semi_franchises SET payment_receiver_key = NULL WHERE key IN ('pharmacy', $1)`, [yKey]);

      // 결제
      const prep = await payments.prepare(member.owner, member.orgId, yGroup.paymentGroupId);
      expect(prep.amount).toBe(50000);
      const again = await payments.prepare(member.owner, member.orgId, yGroup.paymentGroupId);
      expect(again).toMatchObject({ paymentId: prep.paymentId, reused: true }); // 중복 준비 재사용

      // 다른 묶음의 결제로 이 묶음을 완료할 수 없다
      const otherGroup = result.paymentGroups.find((g) => g !== yGroup)!;
      const otherPrep = await payments.prepare(member.owner, member.orgId, otherGroup.paymentGroupId);
      await expect(payments.confirm(member.owner, member.orgId, { paymentId: otherPrep.paymentId, paymentGroupId: yGroup.paymentGroupId }))
        .rejects.toMatchObject({ code: 'PAYMENT_NOT_FOUND' });
      // 다른 구매자는 확인할 수 없다
      await expect(payments.confirm(outsider.owner, outsider.orgId, { paymentId: prep.paymentId, paymentGroupId: yGroup.paymentGroupId }))
        .rejects.toMatchObject({ httpStatus: 404 });
      // 준비 후 금액이 바뀌면 거부
      await ds.query(`UPDATE checkout_orders SET "totalAmount" = "totalAmount" + 1 WHERE id = $1`, [yGroup.orderIds[0]]);
      await expect(payments.confirm(member.owner, member.orgId, { paymentId: prep.paymentId, paymentGroupId: yGroup.paymentGroupId }))
        .rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' });
      await ds.query(`UPDATE checkout_orders SET "totalAmount" = "totalAmount" - 1 WHERE id = $1`, [yGroup.orderIds[0]]);

      const ok = await payments.confirm(member.owner, member.orgId, { paymentId: prep.paymentId, paymentGroupId: yGroup.paymentGroupId });
      expect(ok).toMatchObject({ status: 'PAID', alreadyPaid: false, testPayment: true });
      const dup = await payments.confirm(member.owner, member.orgId, { paymentId: prep.paymentId, paymentGroupId: yGroup.paymentGroupId });
      expect(dup.alreadyPaid).toBe(true);
      expect(bridged.filter((id) => id === yGroup.orderIds[0])).toHaveLength(1); // 공급자 전달 1회
      const [paid] = await ds.query(`SELECT status::text, "paymentStatus"::text AS ps, metadata FROM checkout_orders WHERE id = $1`, [yGroup.orderIds[0]]);
      expect(paid).toMatchObject({ status: 'paid', ps: 'paid' });
      expect(paid.metadata.testPayment).toBe(true);
      await expect(payments.prepare(member.owner, member.orgId, yGroup.paymentGroupId)).rejects.toMatchObject({ code: 'ALREADY_PAID' });
    });

    it('live 모드 · 미설정 production 은 결제를 준비하지 않는다(키 부재를 성공으로 처리하지 않음)', async () => {
      const live = new PharmacyPaymentService(ds, bridger, () => 'live');
      await expect(live.prepare(randomUUID(), randomUUID(), randomUUID())).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_NOT_SELECTED' });
      const disabled = new PharmacyPaymentService(ds, bridger, () => 'disabled');
      await expect(disabled.prepare(randomUUID(), randomUUID(), randomUUID())).rejects.toMatchObject({ code: 'PAYMENT_NOT_CONFIGURED' });
    });

    it('이벤트: 장바구니 주문이 매장 한도 집계에 잡히고(D3), 결제 전 취소가 수량을 복원하며, 재고 부족은 차단된다', async () => {
      const prod = await supplierWithProduct({ price: 10000 });
      const member = await approvedPharmacy();
      await joinSemiFranchise(member.orgId, member.owner, 'pharmacy', pharmacyOperator);
      const sf = (await sfs.getByKey('pharmacy'))!;
      const ev = await events.supplierCreate(prod.supplierId, prod.supplierUser, {
        offerId: prod.offerId, semiFranchiseKey: 'pharmacy', eventPrice: 6000,
        startAt: new Date(Date.now() - 3600_000).toISOString(), endAt: new Date(Date.now() + 86400_000).toISOString(),
        totalQuantity: 10, perStoreLimit: 3, perOrderLimit: 3,
      });
      await events.operatorDecide(sf, pharmacyOperator, ev.id, 'approve');

      await cart.add(member.owner, member.orgId, { kind: 'event', id: ev.id, quantity: 2 });
      const first = await cart.checkout(member.owner, member.orgId);
      expect(first.failedItems).toEqual([]);
      const [l1] = await ds.query(`SELECT total_quantity FROM organization_product_listings WHERE id = $1`, [ev.id]);
      expect(l1.total_quantity).toBe(8);

      // 같은 약국이 2개 더 → 누적 4 > 한도 3 → 차단(장바구니 주문이 집계에 포함됨)
      await cart.add(member.owner, member.orgId, { kind: 'event', id: ev.id, quantity: 2 });
      const second = await cart.checkout(member.owner, member.orgId);
      expect(second.createdOrders).toHaveLength(0);
      expect(second.failedItems[0].code).toBe('PER_STORE_LIMIT_EXCEEDED');

      // 결제 전 취소 → 수량 복원(한 번만)
      const cancelled = await cancelStoreOrderBeforePayment(ds, { orderId: first.createdOrders[0].orderId, buyerId: member.owner, serviceKeys: ['neture-pharmacy'] });
      expect(cancelled.ok).toBe(true);
      await cancelStoreOrderBeforePayment(ds, { orderId: first.createdOrders[0].orderId, buyerId: member.owner, serviceKeys: ['neture-pharmacy'] });
      const [l2] = await ds.query(`SELECT total_quantity FROM organization_product_listings WHERE id = $1`, [ev.id]);
      expect(l2.total_quantity).toBe(10);

      // 재고 추적 제품의 재고 부족
      const scarce = await supplierWithProduct({ price: 5000, track: true, stock: 1, defaultSupplyEnabled: true });
      await cart.add(member.owner, member.orgId, { kind: 'default', id: scarce.offerId, quantity: 2 });
      const third = await cart.checkout(member.owner, member.orgId, {});
      expect(third.failedItems.some((f) => f.code === 'INSUFFICIENT_STOCK')).toBe(true);
    });

    it('공급자 주문 목록에 약국 주문이 보이고(구매 약국 · 테스트 결제 표시) 다른 공급자에게는 보이지 않는다', async () => {
      const a = await supplierWithProduct({ price: 1000 });
      const b = await supplierWithProduct({ price: 1000 });
      const buyer = await user();
      const [no] = await ds.query(
        `INSERT INTO neture_orders (order_number, user_id, status, service_key, metadata)
         VALUES ($1, $2, 'paid', 'neture-pharmacy', $3::jsonb) RETURNING id`,
        [uniq('NTR'), buyer, JSON.stringify({ buyerOrganizationName: '테스트약국', testPayment: true })],
      );
      await ds.query(
        `INSERT INTO neture.neture_order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES ($1, $2, 'x', 1, 1000, 1000)`,
        [no.id, a.offerId],
      );
      const svc = new SupplierOrderService(ds);
      const mine = await svc.listOrders(a.supplierId, { page: 1, limit: 20 });
      const row = mine.data.find((o: any) => o.id === no.id);
      expect(row).toMatchObject({ service_key: 'neture-pharmacy', buyer_organization_name: '테스트약국', test_payment: true });
      expect((await svc.getOrderKpi(a.supplierId)).total_orders).toBeGreaterThanOrEqual(1);
      const other = await svc.listOrders(b.supplierId, { page: 1, limit: 20 });
      expect(other.data.some((o: any) => o.id === no.id)).toBe(false);
    });

    it('세미프랜차이즈 가입이 정지되면 담아 둔 전용 상품도 주문할 수 없다', async () => {
      const prod = await supplierWithProduct({ price: 4000, defaultSupplyEnabled: true });
      const member = await approvedPharmacy();
      const mId = await joinSemiFranchise(member.orgId, member.owner, 'pharmacy', pharmacyOperator);
      await cart.add(member.owner, member.orgId, { kind: 'default', id: prod.offerId, quantity: 1 });
      await sfs.decideMembership((await sfs.getByKey('pharmacy'))!, pharmacyOperator, mId, 'suspend');
      const r = await cart.checkout(member.owner, member.orgId);
      expect(r.createdOrders).toHaveLength(0);
      expect(r.failedItems[0].code).toBe('SUPPLY_OPTION_NOT_AVAILABLE');
    });
  });
  describe('CarePharm 가입 → 공급 승인 → 선택 약국 결제 경계', () => {
    let care: Awaited<ReturnType<SemiFranchiseService['getByKey']>>;
    let careOperator: string;
    let scope: string;
    let references: Array<{ policyDocumentId: string; version: number; documentType: 'terms' | 'privacy' }>;
    beforeAll(async () => {
      careOperator = await user(); await role(careOperator, 'neture:carepharm_admin');
      await sfs.create({ key: 'carepharm', name: 'Synthetic Care business' });
      care = await sfs.getByKey('carepharm');
      scope = businessPolicyScope(care!.id);
      references = [];
      for (const type of ['terms', 'privacy'] as const) {
        const [doc] = await ds.query(`INSERT INTO service_policy_documents(service_key,document_type,title,content,slug,version,status,effective_date,published_at)
          VALUES($5,$1,$2,$3,$4,2,'published',CURRENT_DATE,NOW()) RETURNING id`, [type,`Synthetic ${type}`,`Synthetic exact ${type} body`,`${scope}-service-${type}`,scope]);
        references.push({ policyDocumentId: doc.id, version: 2, documentType: type });
      }
    });
    async function member() {
      const store = await approvedPharmacy();
      const application = await sfs.apply(store.orgId, store.owner, 'carepharm', { acceptedConditions: true, policyReferences: references });
      await sfs.decideMembership(care!, careOperator, application.id, 'approve');
      return { ...store, businessMembershipId: application.id };
    }
    async function order() {
      const pharmacy = await member();
      const product = await supplierWithProduct({ price: 12000, stock: 2, track: true });
      const proposal = await proposals.supplierCreate(product.supplierId, product.supplierUser, { offerId: product.offerId, semiFranchiseKey: 'carepharm', targetOrganizationId: pharmacy.orgId, unitPrice: 9000 });
      await proposals.operatorDecide(care!, careOperator, proposal.id, 'approve');
      await cart.add(pharmacy.owner, pharmacy.orgId, { kind: 'proposal', id: proposal.id, quantity: 2 });
      const checked = await cart.checkout(pharmacy.owner, pharmacy.orgId);
      expect(checked.failedItems).toEqual([]);
      return { ...pharmacy, ...product, proposal, group: checked.paymentGroups[0], orderId: checked.createdOrders[0].orderId };
    }
    it('requires CarePharm documents and never borrows pharmacy/another service consent', async () => {
      const pharmacy = await approvedPharmacy();
      await ds.query("UPDATE service_policy_documents SET status='draft' WHERE service_key=$1",[scope]);
      try { await expect(sfs.apply(pharmacy.orgId, pharmacy.owner, 'carepharm')).rejects.toHaveProperty('code', 'POLICY_UNAVAILABLE'); }
      finally { await ds.query("UPDATE service_policy_documents SET status='published' WHERE id=ANY($1::uuid[])", [references.map(r => r.policyDocumentId)]); }
      await expect(sfs.apply(pharmacy.orgId, pharmacy.owner, 'carepharm')).rejects.toHaveProperty('code', 'ENROLLMENT_POLICY_REQUIRED');
      await expect(sfs.apply(pharmacy.orgId, pharmacy.owner, 'carepharm', { policyReferences: references.map(r => ({ ...r, version: 1 })) })).rejects.toHaveProperty('code', 'POLICY_VERSION_MISMATCH');
      expect(await ds.query('SELECT 1 FROM semi_franchise_memberships WHERE semi_franchise_id=$1 AND organization_id=$2', [care!.id, pharmacy.orgId])).toEqual([]);
      expect(await ds.query("SELECT 1 FROM user_policy_acceptances WHERE user_id=$1 AND service_key=$2", [pharmacy.owner,scope])).toEqual([]);
    });
    it('stores exact version/hash and application evidence without requiring pharmacy cooperation membership', async () => {
      const pharmacy = await member();
      const [stored] = await ds.query("SELECT metadata->'semiFranchiseApplications'->'carepharm' AS application FROM organizations WHERE id=$1", [pharmacy.orgId]);
      expect(stored.application.applicationPolicies).toEqual(expect.arrayContaining([expect.objectContaining({ serviceKey: scope, version: 2, contentHash: computePolicyContentHash('Synthetic exact terms body'), acceptanceKind: 'agreement' })]));
      expect(await ds.query("SELECT 1 FROM semi_franchise_memberships sfm JOIN semi_franchises sf ON sf.id=sfm.semi_franchise_id WHERE sfm.organization_id=$1 AND sf.key='pharmacy'", [pharmacy.orgId])).toEqual([]);
      expect((await ds.query("SELECT meta FROM action_logs WHERE user_id=$1 AND service_key=$2 AND action_key='service:application_policy'", [pharmacy.owner,scope]))).toHaveLength(1);
    });
    it.each([null, 'pending', 'rejected', 'suspended', 'terminated'])('approves a designated pharmacy without exposing supply to CarePharm membership %s', async status => {
      const pharmacy = await approvedPharmacy(); const product = await supplierWithProduct({ price: 10000 });
      await joinSemiFranchise(pharmacy.orgId, pharmacy.owner, 'pharmacy', pharmacyOperator);
      if (status) await ds.query('INSERT INTO semi_franchise_memberships(semi_franchise_id,organization_id,status,applied_by) VALUES($1,$2,$3,$4)', [care!.id, pharmacy.orgId, status, pharmacy.owner]);
      const proposal=await proposals.supplierCreate(product.supplierId, product.supplierUser, { offerId: product.offerId, semiFranchiseKey: 'carepharm', targetOrganizationId: pharmacy.orgId, unitPrice: 8000 });
      await expect(proposals.operatorDecide(care!,careOperator,proposal.id,'approve')).resolves.toMatchObject({status:'approved'});
      expect(await getSupplyOption(ds,pharmacy.orgId,'proposal',proposal.id)).toBeNull();
      await expect(cart.add(pharmacy.owner,pharmacy.orgId,{kind:'proposal',id:proposal.id,quantity:1})).rejects.toHaveProperty('code','SUPPLY_OPTION_NOT_AVAILABLE');
    });
    it('does not let staff or an unrelated actor apply or withdraw for a pharmacy', async () => {
      const f=await member();const staff=await user();await role(staff,'kpa:store_member');
      await ds.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'staff')",[f.orgId,staff]);
      await expect(sfs.apply(f.orgId,staff,'carepharm',{policyReferences:references})).rejects.toHaveProperty('code','BUSINESS_APPLICANT_REQUIRED');
      await expect(sfs.withdraw(f.orgId,staff,'carepharm')).rejects.toHaveProperty('code','BUSINESS_APPLICANT_REQUIRED');
      await expect(sfs.withdraw(f.orgId,await user(),'carepharm')).rejects.toHaveProperty('code','BUSINESS_APPLICANT_REQUIRED');
      expect((await ds.query('SELECT status FROM semi_franchise_memberships WHERE id=$1',[f.businessMembershipId]))[0].status).toBe('active');
    });
    it('allows approval after target withdrawal while keeping the supply hidden', async () => {
      const pharmacy = await member(); const product = await supplierWithProduct({ price: 10000 });
      const proposal = await proposals.supplierCreate(product.supplierId, product.supplierUser, { offerId: product.offerId, semiFranchiseKey: 'carepharm', targetOrganizationId: pharmacy.orgId, unitPrice: 8000 });
      await sfs.withdraw(pharmacy.orgId, pharmacy.owner, 'carepharm');
      await expect(proposals.operatorDecide(care!, careOperator, proposal.id, 'approve')).resolves.toMatchObject({status:'approved'});
      expect(await getSupplyOption(ds,pharmacy.orgId,'proposal',proposal.id)).toBeNull();
    });
    it.each(['suspended', 'terminated'])('prepares existing orders after business membership becomes %s', async status => {
      const f = await order();
      await ds.query('UPDATE semi_franchise_memberships SET status=$2 WHERE id=$1', [f.businessMembershipId,status]);
      const prepared=await payments.prepare(f.owner,f.orgId,f.group.paymentGroupId);
      expect(prepared.amount).toBe(21000);
      await expect(payments.confirm(f.owner,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:f.group.paymentGroupId})).resolves.toMatchObject({status:'PAID'});
      expect(await getSupplyOption(ds,f.orgId,'proposal',f.proposal.id)).toBeNull();
    });
    it('completes an existing order after proposal termination', async () => {
      const f=await order(); const prepared=await payments.prepare(f.owner,f.orgId,f.group.paymentGroupId);
      await proposals.operatorDecide(care!,careOperator,f.proposal.id,'end');
      await expect(payments.confirm(f.owner,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:f.group.paymentGroupId})).resolves.toMatchObject({status:'PAID'});
      expect((await ds.query('SELECT "paymentStatus" FROM checkout_orders WHERE id=$1',[f.orderId]))[0].paymentStatus).toBe('paid');
      expect(bridged).toContain(f.orderId);
    });
    it.each(['business','offer','supplier','pharmacy'])('keeps order settlement independent of %s supply availability', async what => {
      const f=await order();const prepared=await payments.prepare(f.owner,f.orgId,f.group.paymentGroupId);
      if(what==='business')await ds.query("UPDATE semi_franchises SET status='closed' WHERE id=$1",[care!.id]);
      if(what==='offer')await ds.query('UPDATE supplier_product_offers SET is_active=false WHERE id=$1',[f.offerId]);
      if(what==='supplier')await ds.query("UPDATE neture_suppliers SET status='INACTIVE' WHERE id=$1",[f.supplierId]);
      if(what==='pharmacy')await ds.query("UPDATE neture_pharmacy_memberships SET status='suspended' WHERE organization_id=$1",[f.orgId]);
      try {
        const payment=payments.confirm(f.owner,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:f.group.paymentGroupId});
        if(what==='pharmacy')await expect(payment).rejects.toHaveProperty('code','STORE_ACCESS_REQUIRED');
        else await expect(payment).resolves.toMatchObject({status:'PAID'});
      } finally {if(what==='business')await ds.query("UPDATE semi_franchises SET status='active' WHERE id=$1",[care!.id]);}
      expect((await ds.query('SELECT status FROM o4o_payments WHERE id=$1',[prepared.paymentId]))[0].status).toBe(what==='pharmacy'?'CREATED':'PAID');
    });
    it('continues an existing order after membership is suspended between preparation and confirmation', async () => {
      const f=await order();const prepared=await payments.prepare(f.owner,f.orgId,f.group.paymentGroupId);
      await sfs.decideMembership(care!,careOperator,f.businessMembershipId,'suspend');
      await expect(payments.confirm(f.owner,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:f.group.paymentGroupId})).resolves.toMatchObject({status:'PAID'});
      expect((await ds.query('SELECT status FROM o4o_payments WHERE id=$1',[prepared.paymentId]))[0].status).toBe('PAID');
    });
    it('preserves approved staff payment access and checks current staff role on confirmation', async () => {
      const f=await order();const staff=await user();await role(staff,'kpa:store_member');
      await ds.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'staff')",[f.orgId,staff]);
      await cart.add(staff,f.orgId,{kind:'proposal',id:f.proposal.id,quantity:1});
      const checked=await cart.checkout(staff,f.orgId);const group=checked.paymentGroups[0];
      const prepared=await payments.prepare(staff,f.orgId,group.paymentGroupId);
      await ds.query("UPDATE role_assignments SET is_active=false WHERE user_id=$1 AND role='kpa:store_member'",[staff]);
      await expect(payments.confirm(staff,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:group.paymentGroupId})).rejects.toHaveProperty('code','STORE_ACCESS_REQUIRED');
      await ds.query("UPDATE role_assignments SET is_active=true WHERE user_id=$1 AND role='kpa:store_member'",[staff]);
      expect(await payments.confirm(staff,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:group.paymentGroupId})).toMatchObject({status:'PAID'});
    });
    it('binds a payment group to the selected pharmacy and current actor relationship', async () => {
      const f=await order(), other=await approvedPharmacy();
      await ds.query("INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",[other.orgId,f.owner]);
      await expect(payments.prepare(f.owner,other.orgId,f.group.paymentGroupId)).rejects.toHaveProperty('code','PAYMENT_GROUP_NOT_FOUND');
      await expect(payments.prepare(other.owner,f.orgId,f.group.paymentGroupId)).rejects.toHaveProperty('code','PAYMENT_GROUP_NOT_FOUND');
      await ds.query('UPDATE organization_members SET left_at=NOW() WHERE user_id=$1 AND organization_id=$2',[f.owner,f.orgId]);
      await expect(payments.prepare(f.owner,f.orgId,f.group.paymentGroupId)).rejects.toHaveProperty('code','STORE_ACCESS_REQUIRED');
    });
    it('preserves frozen price/shipping and a paid retry after source withdrawal, without reserving stock twice', async () => {
      const f=await order();
      // The lightweight creator does not reserve inventory; reproduce an already-reserved order explicitly.
      await ds.query('UPDATE supplier_product_offers SET reserved_quantity=stock_quantity WHERE id=$1',[f.offerId]);
      await ds.query('UPDATE supplier_product_offers SET price_general=99999 WHERE id=$1',[f.offerId]);
      await ds.query('UPDATE neture_suppliers SET base_shipping_fee=9900 WHERE id=$1',[f.supplierId]);
      const prepared=await payments.prepare(f.owner,f.orgId,f.group.paymentGroupId);
      expect(prepared.amount).toBe(21000);
      const paid=await payments.confirm(f.owner,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:f.group.paymentGroupId});
      expect(paid).toMatchObject({status:'PAID',alreadyPaid:false,testPayment:true});
      await proposals.operatorDecide(care!,careOperator,f.proposal.id,'end');
      await sfs.withdraw(f.orgId,f.owner,'carepharm');
      expect(await payments.confirm(f.owner,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:f.group.paymentGroupId})).toMatchObject({status:'PAID',alreadyPaid:true});
      expect(bridged.filter(id=>id===f.orderId)).toHaveLength(1);
      expect((await ds.query('SELECT reserved_quantity FROM supplier_product_offers WHERE id=$1',[f.offerId]))[0].reserved_quantity).toBe(2);
    });
    it('pays an existing order without waiting for an in-flight proposal termination', async () => {
      const f=await order(); const prepared=await payments.prepare(f.owner,f.orgId,f.group.paymentGroupId);
      const writer=ds.createQueryRunner();await writer.connect();await writer.startTransaction();
      let result: Promise<unknown>|undefined;
      try {
        await writer.query("UPDATE supply_proposals SET status='ended' WHERE id=$1",[f.proposal.id]);
        result=payments.confirm(f.owner,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:f.group.paymentGroupId}).then(()=>({success:true}),error=>({code:error.code}));
        expect(await result).toEqual({success:true});
        await writer.commitTransaction();
        expect((await ds.query('SELECT status FROM o4o_payments WHERE id=$1',[prepared.paymentId]))[0].status).toBe('PAID');
      } finally {if(writer.isTransactionActive)await writer.rollbackTransaction();await writer.release();if(result)await result;}
    });
    it('rejects a new order when withdrawal commits during checkout eligibility evaluation', async () => {
      const f=await order();await cart.add(f.owner,f.orgId,{kind:'proposal',id:f.proposal.id,quantity:1});
      const writer=ds.createQueryRunner();await writer.connect();await writer.startTransaction();
      let result: ReturnType<PharmacyCartService['checkout']> | undefined;
      try {
        await writer.query("UPDATE semi_franchise_memberships SET status='suspended' WHERE id=$1",[f.businessMembershipId]);
        result=cart.checkout(f.owner,f.orgId);
        let blocked=false;
        for(let i=0;i<100;i++) { blocked=(await writer.query('SELECT 1 FROM pg_locks WHERE NOT granted')).length>0;if(blocked)break;await new Promise(resolve=>setTimeout(resolve,10)); }
        expect(blocked).toBe(true);await writer.commitTransaction();
        expect(await result).toMatchObject({createdOrders:[],failedItems:[{code:'SUPPLY_OPTION_NOT_AVAILABLE'}]});
        expect((await ds.query('SELECT count(*)::int AS n FROM checkout_orders WHERE "buyerId"=$1',[f.owner]))[0].n).toBe(1);
        const prepared=await payments.prepare(f.owner,f.orgId,f.group.paymentGroupId);
        expect(await payments.confirm(f.owner,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:f.group.paymentGroupId})).toMatchObject({status:'PAID'});
      } finally { if(writer.isTransactionActive)await writer.rollbackTransaction();await writer.release();if(result)await result; }
    });
    it('holds checkout eligibility until its order commits, then permits later membership withdrawal', async () => {
      const f=await order();await cart.add(f.owner,f.orgId,{kind:'proposal',id:f.proposal.id,quantity:1});
      let signal!:()=>void, finish!:()=>void;
      const started=new Promise<void>(resolve=>{signal=resolve;});const release=new Promise<void>(resolve=>{finish=resolve;});
      const atomicCart=new PharmacyCartService(ds,new EventOfferService(ds),async(dto,manager)=>{
        const saved=await sqlOrderCreator(dto,manager);signal();await release;return saved;
      });
      const checkout=atomicCart.checkout(f.owner,f.orgId);await started;
      let withdrawn:Promise<unknown>|undefined;
      try {
        withdrawn=ds.query("UPDATE semi_franchise_memberships SET status='terminated' WHERE id=$1",[f.businessMembershipId]);
        let blocked=false;
        for(let i=0;i<100;i++){blocked=(await ds.query('SELECT 1 FROM pg_locks WHERE NOT granted')).length>0;if(blocked)break;await new Promise(resolve=>setTimeout(resolve,10));}
        expect(blocked).toBe(true);finish();
        const result=await checkout;await withdrawn;
        expect(result.failedItems).toEqual([]);expect(result.createdOrders).toHaveLength(1);
        const group=result.paymentGroups[0];const prepared=await payments.prepare(f.owner,f.orgId,group.paymentGroupId);
        expect(await payments.confirm(f.owner,f.orgId,{paymentId:prepared.paymentId,paymentGroupId:group.paymentGroupId})).toMatchObject({status:'PAID'});
      } finally { finish();await checkout;if(withdrawn)await withdrawn; }
    });
    it('serializes concurrent event reservations without lock upgrades or rejecting changed availability', async () => {
      const product = await supplierWithProduct({ price: 10000 });
      const first = await member(); const second = await member();
      const event = await events.supplierCreate(product.supplierId, product.supplierUser, {
        offerId: product.offerId, semiFranchiseKey: 'carepharm', eventPrice: 6000, totalQuantity: 10,
        startAt: new Date(Date.now() - 3600_000).toISOString(), endAt: new Date(Date.now() + 86400_000).toISOString(),
      });
      await events.operatorDecide(care!, careOperator, event.id, 'approve');
      for (const store of [first, second]) await cart.add(store.owner, store.orgId, { kind: 'event', id: event.id, quantity: 1 });
      const reserver = new EventOfferService(ds);
      let entered = 0, signal!: () => void, finish!: () => void;
      const started = new Promise<void>(resolve => { signal = resolve; });
      const release = new Promise<void>(resolve => { finish = resolve; });
      const concurrentCart = new PharmacyCartService(ds, {
        reserveEventOfferListing: async (runner, params) => {
          entered++;
          if (entered === 1) { signal(); await release; }
          return reserver.reserveEventOfferListing(runner, params);
        },
        incrementListingQuantity: (...args) => reserver.incrementListingQuantity(...args),
      }, sqlOrderCreator);
      const one = concurrentCart.checkout(first.owner, first.orgId); await started;
      let two: ReturnType<PharmacyCartService['checkout']> | undefined;
      try {
        two = concurrentCart.checkout(second.owner, second.orgId);
        let blocked = false;
        for (let i = 0; i < 100; i++) {
          blocked = (await ds.query('SELECT 1 FROM pg_locks WHERE NOT granted')).length > 0;
          if (blocked) break;
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(blocked).toBe(true); expect(entered).toBe(1); finish();
        const results = await Promise.all([one, two]);
        for (const result of results) { expect(result.failedItems).toEqual([]); expect(result.createdOrders).toHaveLength(1); }
        expect((await ds.query('SELECT total_quantity FROM organization_product_listings WHERE id=$1', [event.id]))[0].total_quantity).toBe(8);
      } finally { finish(); await one; if (two) await two; }
    });
    it.each(['supplier', 'offer'] as const)('orders event checkout locks after the %s lifecycle lock', async kind => {
      const product = await supplierWithProduct({ price: 10000 }); const store = await member();
      const event = await events.supplierCreate(product.supplierId, product.supplierUser, {
        offerId: product.offerId, semiFranchiseKey: 'carepharm', eventPrice: 6000, totalQuantity: 10,
        startAt: new Date(Date.now() - 3600_000).toISOString(), endAt: new Date(Date.now() + 86400_000).toISOString(),
      });
      await events.operatorDecide(care!, careOperator, event.id, 'approve');
      await cart.add(store.owner, store.orgId, { kind: 'event', id: event.id, quantity: 1 });
      const writer = ds.createQueryRunner(); await writer.connect(); await writer.startTransaction();
      let checkout: ReturnType<PharmacyCartService['checkout']> | undefined;
      try {
        // Same first row and listing update order as supplier deactivation/product rejection.
        if (kind === 'supplier') await writer.query('SELECT id FROM neture_suppliers WHERE id=$1 FOR UPDATE', [product.supplierId]);
        else await writer.query('SELECT id FROM supplier_product_offers WHERE id=$1 FOR UPDATE', [product.offerId]);
        checkout = cart.checkout(store.owner, store.orgId);
        let blocked = false;
        for (let i = 0; i < 100; i++) {
          blocked = (await writer.query('SELECT 1 FROM pg_locks WHERE NOT granted')).length > 0;
          if (blocked) break;
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        expect(blocked).toBe(true);
        // A checkout must not own the listing while waiting for the lifecycle's first row.
        await writer.query('SELECT id FROM organization_product_listings WHERE id=$1 FOR UPDATE NOWAIT', [event.id]);
        if (kind === 'supplier') await writer.query("UPDATE neture_suppliers SET status='INACTIVE' WHERE id=$1", [product.supplierId]);
        else await writer.query('UPDATE supplier_product_offers SET is_active=false WHERE id=$1', [product.offerId]);
        await writer.query('UPDATE organization_product_listings SET is_active=false WHERE id=$1', [event.id]);
        await writer.commitTransaction();
        expect(await checkout).toMatchObject({ createdOrders: [], failedItems: [{ code: 'SUPPLY_OPTION_NOT_AVAILABLE' }] });
        expect((await ds.query('SELECT total_quantity FROM organization_product_listings WHERE id=$1', [event.id]))[0].total_quantity).toBe(10);
      } finally { if (writer.isTransactionActive) await writer.rollbackTransaction(); await writer.release(); if (checkout) await checkout; }
    });
    it('rechecks store-owner agreements at prepare and confirm despite a warm middleware cache', async () => {
      const f = await order(); const ids: string[] = [];
      const publish = async (version: number) => {
        const [doc] = await ds.query(`INSERT INTO service_policy_documents(service_key,document_type,title,content,version,status,effective_date,published_at)
          VALUES('kpa-society','store_owner_agreement','Synthetic store agreement','Synthetic agreement body',$1,'published',CURRENT_DATE,NOW()) RETURNING id`, [version]);
        ids.push(doc.id); return doc.id;
      };
      const accept = (id: string, version: number) => policyAcceptanceService.recordAcceptance({ userId: f.owner, serviceKey: 'kpa-society', documentType: 'store_owner_agreement', policyDocumentId: id, version }, ds);
      try {
        policyAcceptanceService.invalidateAll();
        expect(await policyAcceptanceService.getPendingStoreOwnerAgreementsForUser(f.owner, 'kpa-society', ds)).toEqual([]);
        const first = await publish(1);
        await expect(payments.prepare(f.owner, f.orgId, f.group.paymentGroupId)).rejects.toMatchObject({ httpStatus: 428, code: 'STORE_OWNER_AGREEMENT_REQUIRED' });
        expect(await ds.query('SELECT id FROM o4o_payments WHERE "orderId"=$1', [f.group.paymentGroupId])).toEqual([]);
        await accept(first, 1);
        const prepared = await payments.prepare(f.owner, f.orgId, f.group.paymentGroupId);
        await ds.query("UPDATE service_policy_documents SET status='draft' WHERE id=$1", [first]);
        const second = await publish(2);
        await expect(payments.confirm(f.owner, f.orgId, { paymentId: prepared.paymentId, paymentGroupId: f.group.paymentGroupId })).rejects.toHaveProperty('code', 'STORE_OWNER_AGREEMENT_REQUIRED');
        expect((await ds.query('SELECT status FROM o4o_payments WHERE id=$1', [prepared.paymentId]))[0].status).toBe('CREATED');
        await accept(second, 2);
        expect(await payments.confirm(f.owner, f.orgId, { paymentId: prepared.paymentId, paymentGroupId: f.group.paymentGroupId })).toMatchObject({ status: 'PAID' });
      } finally {
        await ds.query('DELETE FROM user_policy_acceptances WHERE policy_document_id=ANY($1::uuid[])', [ids]);
        await ds.query('DELETE FROM service_policy_documents WHERE id=ANY($1::uuid[])', [ids]);
        policyAcceptanceService.invalidateAll();
      }
    });
    it('waits for an in-flight store agreement publication before confirming payment', async () => {
      const f = await order(); const prepared = await payments.prepare(f.owner, f.orgId, f.group.paymentGroupId);
      const writer = ds.createQueryRunner(); await writer.connect(); await writer.startTransaction();
      let docId: string | undefined; let result: Promise<unknown> | undefined;
      try {
        await writer.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['service-policy:kpa-society']);
        const [doc] = await writer.query(`INSERT INTO service_policy_documents(service_key,document_type,title,content,version,status,effective_date,published_at)
          VALUES('kpa-society','store_owner_agreement','Synthetic concurrent agreement','Synthetic body',1,'published',CURRENT_DATE,NOW()) RETURNING id`);
        docId = doc.id;
        result = payments.confirm(f.owner, f.orgId, { paymentId: prepared.paymentId, paymentGroupId: f.group.paymentGroupId }).then(() => ({ paid: true }), error => ({ code: error.code }));
        let blocked = false;
        for (let i = 0; i < 100; i++) { blocked = (await writer.query("SELECT 1 FROM pg_locks WHERE NOT granted AND locktype='advisory'")).length > 0; if (blocked) break; await new Promise(resolve => setTimeout(resolve, 10)); }
        expect(blocked).toBe(true); await writer.commitTransaction();
        expect(await result).toEqual({ code: 'STORE_OWNER_AGREEMENT_REQUIRED' });
        expect((await ds.query('SELECT status FROM o4o_payments WHERE id=$1', [prepared.paymentId]))[0].status).toBe('CREATED');
      } finally {
        if (writer.isTransactionActive) await writer.rollbackTransaction(); await writer.release(); if (result) await result;
        if (docId) await ds.query('DELETE FROM service_policy_documents WHERE id=$1', [docId]);
        policyAcceptanceService.invalidateAll();
      }
    });
    it('uses real legal controllers and current business roles for policy publication and stale-form rejection', async () => {
      const legalDs=new DataSource({type:'postgres',url:DB_URL,entities:[ServicePolicyDocument,ServiceLegalProfile],synchronize:false});await legalDs.initialize();
      const app=express();app.use(express.json());app.use((req,_res,next)=>{(req as any).user={id:req.get('X-Fixture-Actor'),roles:['neture:carepharm_admin']};next();});
      app.use('/neture',businessOperationsRoutes(legalDs));
      const endpoint='/neture/operator/semi-franchises/carepharm/legal/policies';const other=await user();await role(other,'neture:megapharm_admin');
      const reader=await user();await role(reader,'neture:carepharm_operator');
      try {
        expect((await request(app).get(endpoint).set('X-Fixture-Actor',reader)).status).toBe(200);
        expect((await request(app).post(endpoint).set('X-Fixture-Actor',reader).send({documentType:'terms',title:'Unauthorized'})).status).toBe(403);
        expect((await request(app).get(endpoint).set('X-Fixture-Actor',other)).status).toBe(403);
        const central=await user();await role(central,'neture:admin');
        expect((await request(app).get(endpoint).set('X-Fixture-Actor',central)).status).toBe(403);
        await sfs.assignOperator('carepharm',central,operatorId);
        expect((await request(app).get(endpoint).set('X-Fixture-Actor',central)).status).toBe(200);
        await ds.query("UPDATE semi_franchises SET status='closed' WHERE id=$1",[care!.id]);
        expect((await request(app).get(endpoint).set('X-Fixture-Actor',central)).status).toBe(404);
        await ds.query("UPDATE semi_franchises SET status='active' WHERE id=$1",[care!.id]);
        const current=references;
        for(const type of ['privacy','terms'] as const){
          const created=await request(app).post(endpoint).set('X-Fixture-Actor',careOperator).send({documentType:type,title:`Synthetic revised ${type}`,content:`Revised ${type}`,version:3,effectiveDate:'2026-01-01'});
          expect(created.status).toBe(201);
          expect(created.body.data.slug).toBe(`${scope}-service-${type}`);
          expect((await request(app).patch(`${endpoint}/${created.body.data.id}/publish`).set('X-Fixture-Actor',careOperator).send({action:'publish'})).status).toBe(200);
        }
        expect((await request(app).get('/neture/businesses/carepharm/legal/enrollment-policies')).body.data).toHaveLength(2);
        // Business policies allow their first version 1; no legacy CarePharm-only minimum applies.
        const fixed=await request(app).post(endpoint).set('X-Fixture-Actor',careOperator).send({documentType:'terms',title:'Synthetic fixed scope',slug:'neture-service-terms',version:4});expect(fixed.status).toBe(201);expect(fixed.body.data.slug).toBe(`${scope}-service-terms`);
        const pharmacy=await approvedPharmacy();
        await expect(sfs.apply(pharmacy.orgId,pharmacy.owner,'carepharm',{policyReferences:current})).rejects.toHaveProperty('code','POLICY_VERSION_MISMATCH');
        const old=current[0];
        expect((await request(app).put(`${endpoint}/${old.policyDocumentId}`).set('X-Fixture-Actor',careOperator).send({content:'Changed historic agreement'})).status).toBe(409);
        await ds.query('UPDATE role_assignments SET is_active=false WHERE user_id=$1',[careOperator]);
        expect((await request(app).get(endpoint).set('X-Fixture-Actor',careOperator)).status).toBe(403);
      } finally {await legalDs.destroy();}
    });
  });

});
