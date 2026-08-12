/**
 * BranchDomainController — 분회 자체 도메인 연결
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §5
 *
 * 상태 전이:
 *   pending  — 운영자가 도메인 등록. DNS TXT(_o4o-branch-verify) 토큰 발급.
 *   verifying— 운영자가 DNS 설정 완료를 알림(검증 요청).
 *   active   — 서비스 관리자(kpa-branch:admin)가 실제 DNS/인증서 연결 후 활성화.
 *   failed / disabled — 실패·해제.
 *
 * 활성화를 admin 으로 제한하는 이유: 도메인 활성화는 Cloud Run 도메인 매핑·인증서 등
 * 인프라 작업을 수반한다. 운영자가 임의로 active 로 만들 수 있으면 해석 가능한
 * hostname 이 실제 인프라와 어긋난다. (인프라 자동화는 이번 범위 밖이다.)
 */
import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { AppDataSource } from '../../database/connection.js';
import { BranchDomain } from '../../routes/kpa-branch/entities/branch-domain.entity.js';

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

function serialize(d: BranchDomain) {
  return {
    id: d.id,
    organizationId: d.organization_id,
    hostname: d.hostname,
    isPrimary: d.is_primary,
    status: d.status,
    verification: { recordName: '_o4o-branch-verify', recordType: 'TXT', recordValue: d.verification_token },
    verifiedAt: d.verified_at,
    createdAt: d.created_at,
  };
}

export class BranchDomainController {
  /** GET /branches/:branchSlug/operator/domains */
  static async list(req: Request, res: Response) {
    const items = await AppDataSource.getRepository(BranchDomain).find({
      where: { organization_id: req.branch!.id },
      order: { created_at: 'DESC' },
    });
    return res.json({ success: true, data: items.map(serialize) });
  }

  /** POST /branches/:branchSlug/operator/domains */
  static async create(req: Request, res: Response) {
    const raw = String(req.body?.hostname ?? '').trim().toLowerCase();
    if (!HOSTNAME_RE.test(raw)) {
      return res.status(400).json({ success: false, error: '올바른 도메인 형식이 아닙니다.', code: 'INVALID_HOSTNAME' });
    }
    const repo = AppDataSource.getRepository(BranchDomain);
    const exists = await repo.findOne({ where: { hostname: raw } });
    if (exists) {
      return res.status(409).json({ success: false, error: '이미 등록된 도메인입니다.', code: 'DOMAIN_ALREADY_REGISTERED' });
    }
    const created = await repo.save(
      repo.create({
        organization_id: req.branch!.id,
        hostname: raw,
        status: 'pending',
        is_primary: false,
        verification_token: randomBytes(24).toString('hex'),
      }),
    );
    return res.status(201).json({ success: true, data: serialize(created) });
  }

  /** POST /branches/:branchSlug/operator/domains/:domainId/verify-request */
  static async requestVerification(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(BranchDomain);
    const domain = await repo.findOne({
      where: { id: req.params.domainId, organization_id: req.branch!.id },
    });
    if (!domain) {
      return res.status(404).json({ success: false, error: '도메인을 찾을 수 없습니다.', code: 'DOMAIN_NOT_FOUND' });
    }
    if (domain.status === 'active') {
      return res.json({ success: true, data: serialize(domain) });
    }
    await repo.update(domain.id, { status: 'verifying' });
    return res.json({ success: true, data: serialize(await repo.findOneOrFail({ where: { id: domain.id } })) });
  }

  /** DELETE /branches/:branchSlug/operator/domains/:domainId */
  static async remove(req: Request, res: Response) {
    const repo = AppDataSource.getRepository(BranchDomain);
    const domain = await repo.findOne({
      where: { id: req.params.domainId, organization_id: req.branch!.id },
    });
    if (!domain) {
      return res.status(404).json({ success: false, error: '도메인을 찾을 수 없습니다.', code: 'DOMAIN_NOT_FOUND' });
    }
    await repo.delete(domain.id);
    return res.json({ success: true, data: { id: domain.id } });
  }

  /** GET /admin/domains?status= — 서비스 관리자 전체 조회 */
  static async adminList(req: Request, res: Response) {
    const status = req.query.status as BranchDomain['status'] | undefined;
    const items = await AppDataSource.getRepository(BranchDomain).find({
      where: status ? { status } : {},
      order: { created_at: 'DESC' },
    });
    return res.json({ success: true, data: items.map(serialize) });
  }

  /** PATCH /admin/domains/:domainId/status — active/failed/disabled 전이 */
  static async adminSetStatus(req: Request, res: Response) {
    const next = req.body?.status as BranchDomain['status'];
    const allowed: BranchDomain['status'][] = ['active', 'failed', 'disabled'];
    if (!allowed.includes(next)) {
      return res.status(400).json({ success: false, error: 'status는 active/failed/disabled 중 하나여야 합니다.', code: 'INVALID_INPUT' });
    }
    const repo = AppDataSource.getRepository(BranchDomain);
    const domain = await repo.findOne({ where: { id: req.params.domainId } });
    if (!domain) {
      return res.status(404).json({ success: false, error: '도메인을 찾을 수 없습니다.', code: 'DOMAIN_NOT_FOUND' });
    }

    await AppDataSource.transaction(async (manager) => {
      const tx = manager.getRepository(BranchDomain);
      if (next === 'active' && req.body?.isPrimary) {
        // UQ_branch_domains_primary — 기존 primary 를 먼저 내린다.
        await tx.update({ organization_id: domain.organization_id, is_primary: true }, { is_primary: false });
        await tx.update(domain.id, { status: 'active', is_primary: true, verified_at: new Date() });
        return;
      }
      await tx.update(domain.id, {
        status: next,
        verified_at: next === 'active' ? new Date() : domain.verified_at,
        is_primary: next === 'active' ? domain.is_primary : false,
      });
    });

    return res.json({ success: true, data: serialize(await repo.findOneOrFail({ where: { id: domain.id } })) });
  }
}
