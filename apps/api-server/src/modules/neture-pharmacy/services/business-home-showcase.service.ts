import type { DataSource } from 'typeorm';
import { NeturePharmacyError } from '../constants.js';
import type { SemiFranchiseRow } from './semi-franchise.service.js';
import { resolveBusinessStoreAccess } from './business-store-access.js';
import { recordOperation } from '../../../services/operations/operation-audit.js';

type Setting = { hidden: boolean; position: number };
type Settings = { version: number; items: Record<string, Setting> };
type Candidate = { id: string; kind: 'product' | 'content'; title: string; summary: string | null; body: string | null; targetOrganizationId: string | null; createdAt: string };
const EMPTY: Settings = { version: 0, items: {} };
export function sortShowcase(items: Candidate[], settings: Settings, operator = false) {
  return items.map(item => ({ ...item, hidden: settings.items[item.id]?.hidden ?? false, position: settings.items[item.id]?.position ?? 1000 }))
    .filter(item => operator || !item.hidden)
    .sort((a, b) => a.position - b.position || String(b.createdAt).localeCompare(String(a.createdAt)) || a.id.localeCompare(b.id));
}

/** Approval stays in its original ledger. This is presentation metadata, never a supply entitlement. */
export class BusinessHomeShowcaseService {
  constructor(private readonly ds: DataSource) {}
  private async settings(sf: SemiFranchiseRow, exec: Pick<DataSource, 'query'> = this.ds): Promise<Settings> {
    const [row] = await exec.query(`SELECT metadata->'businessHomeShowcase'->$2 AS settings FROM organizations WHERE id=$1`, [sf.organization_id, sf.id]);
    return row?.settings ?? EMPTY;
  }
  private async candidates(sf: SemiFranchiseRow, organizationId: string | null, operator: boolean, exec: Pick<DataSource, 'query'> = this.ds): Promise<Candidate[]> {
    return exec.query(`SELECT 'product:'||sp.id AS id, 'product'::text AS kind, pm.name AS title,
        spo.business_short_description AS summary, NULL::text AS body,
        sp.target_organization_id AS "targetOrganizationId", sp.created_at::text AS "createdAt"
      FROM supply_proposals sp JOIN supplier_product_offers spo ON spo.id=sp.offer_id
      JOIN product_masters pm ON pm.id=spo.master_id
      JOIN neture_suppliers ns ON ns.id=spo.supplier_id
      WHERE sp.semi_franchise_id=$1 AND sp.status='approved' AND spo.approval_status='APPROVED'
        AND spo.is_active=true AND spo.deleted_at IS NULL AND ns.status='ACTIVE'
        AND COALESCE(pm.status,'ACTIVE')='ACTIVE'
        AND ($3::boolean OR sp.target_organization_id IS NULL OR sp.target_organization_id=$2::uuid)
      UNION ALL
      SELECT 'content:'||c.id, 'content', c.title, c.summary, c.body, NULL::uuid, c.published_at::text
      FROM semi_franchise_contents c WHERE c.semi_franchise_id=$1 AND c.status='published'
      ORDER BY "createdAt" DESC NULLS LAST, id`, [sf.id, organizationId, operator]);
  }
  async operatorList(sf: SemiFranchiseRow) {
    const settings = await this.settings(sf);
    return { businessKey: sf.key, version: settings.version, items: sortShowcase(await this.candidates(sf, null, true), settings, true) };
  }
  async history(sf: SemiFranchiseRow) {
    return this.ds.query(`SELECT a.user_id AS "actorId", u.name AS "actorName", a.action_key AS action, a.meta, a.created_at AS "createdAt"
      FROM action_logs a LEFT JOIN users u ON u.id=a.user_id WHERE a.service_key='neture' AND a.action_key IN ('business.showcase.update','business.content.status')
      AND a.meta->>'businessId'=$1 ORDER BY a.created_at DESC, a.id DESC LIMIT 50`, [sf.id]);
  }
  async update(sf: SemiFranchiseRow, actorId: string, input: Record<string, unknown>) {
    if (typeof input.id !== 'string' || !/^(product|content):[a-f0-9-]{36}$/i.test(input.id)
      || typeof input.hidden !== 'boolean' || !Number.isInteger(input.position) || Number(input.position)<0 || Number(input.position)>9999
      || !Number.isInteger(input.version) || Number(input.version)<0)
      throw new NeturePharmacyError(400, 'INVALID_SHOWCASE', '진열 항목과 순서를 확인해 주세요.');
    const itemId = input.id;
    const hidden = input.hidden;
    return this.ds.transaction(async manager => {
      // Lock the owning organization: another business on the same organization must not lose its settings.
      const [owner] = await manager.query(`SELECT metadata FROM organizations WHERE id=$1 FOR UPDATE`, [sf.organization_id]);
      if (!owner) throw new NeturePharmacyError(404, 'BUSINESS_NOT_FOUND', '운영 조직을 찾을 수 없습니다.');
      const [active] = await manager.query(`SELECT 1 FROM semi_franchises WHERE id=$1 AND status='active' FOR SHARE`, [sf.id]);
      if (!active) throw new NeturePharmacyError(409, 'BUSINESS_CLOSED', '운영 중인 사업만 진열을 변경할 수 있습니다.');
      const settings: Settings = owner.metadata?.businessHomeShowcase?.[sf.id] ?? { version: 0, items: {} };
      if (settings.version !== input.version) throw new NeturePharmacyError(409, 'SHOWCASE_CHANGED', '다른 처리가 반영되었습니다. 목록을 다시 조회해 주세요.');
      const candidate = (await this.candidates(sf, null, true, manager)).find(item => item.id === itemId);
      if (!candidate) throw new NeturePharmacyError(409, 'ITEM_NOT_AVAILABLE', '현재 승인·게시된 항목만 변경할 수 있습니다.');
      const before = settings.items[itemId] ?? { hidden: false, position: 1000 };
      const next = { hidden, position: Number(input.position) };
      settings.items[itemId] = next;
      settings.version += 1;
      await manager.query(`UPDATE organizations SET metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('businessHomeShowcase',
        COALESCE(metadata->'businessHomeShowcase','{}'::jsonb)||jsonb_build_object($2::text,$3::jsonb)) WHERE id=$1`,
      [sf.organization_id, sf.id, JSON.stringify(settings)]);
      await recordOperation(manager, 'neture', actorId, 'business.showcase.update', { businessId: sf.id, businessKey: sf.key, itemId: input.id, title: candidate.title, before, after: next, version: settings.version });
      return { version: settings.version };
    });
  }
  /** Login is required by the route. A personal cooperative grant never becomes a pharmacy purchase grant. */
  async memberList(sf: SemiFranchiseRow, userId: string, organizationId: string | null) {
    if (sf.status !== 'active') throw new NeturePharmacyError(404, 'BUSINESS_NOT_FOUND', '운영 중인 사업을 찾을 수 없습니다.');
    if (organizationId) {
      if (!(await resolveBusinessStoreAccess(this.ds, userId, organizationId, sf.key)).allowed)
        throw new NeturePharmacyError(403, 'MEMBERSHIP_REQUIRED', '선택 약국의 사업 가입 승인이 필요합니다.');
    } else {
      const [member] = await this.ds.query(`SELECT 1 FROM cooperative_memberships cm
        JOIN cooperatives c ON c.id=cm.cooperative_id AND c.status='active'
        JOIN users u ON u.id=cm.user_id AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved')
        WHERE cm.user_id=$1 AND cm.status='active' AND c.semi_franchise_id=$2
        LIMIT 1`, [userId, sf.id]);
      if (!member) throw new NeturePharmacyError(403, 'MEMBERSHIP_REQUIRED', '이 협업체의 가입 승인이 필요합니다.');
    }
    const items = sortShowcase(await this.candidates(sf, organizationId, false), await this.settings(sf)).slice(0, 60);
    // Introduction only: no negotiated price, supplier provenance, targeted pharmacy or file attachments.
    return { businessKey: sf.key, items: items.map(({ id, kind, title, summary, body }) => ({ id, kind, title, summary, body })) };
  }
}
