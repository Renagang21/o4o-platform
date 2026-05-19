import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-O4O-KPA-STORE-INFO-PHARMACY-OWNER-DATA-FIX-V1 (backfill)
 *
 * 기존 승인된 약국 경영자 계정의 organizations 테이블에
 * 약국 정보를 보정한다.
 *
 * 대상: organizations(type='pharmacy') 중 phone 또는 business_number가 NULL인 레코드
 *
 * 소스 우선순위:
 *   1. kpa_pharmacy_requests (경로 A — pharmacy-request 승인)
 *   2. users.businessInfo (경로 B — member.controller 승인)
 *
 * 멱등: COALESCE + NULLIF 조합으로 기존 값 보존 (NULL/빈 값만 채움)
 * down: no-op (덮어쓰지 않은 값만 채웠으므로 원복 불필요)
 */
export class BackfillKpaOrganizationPharmacyInfo20261023000000 implements MigrationInterface {
  name = 'BackfillKpaOrganizationPharmacyInfo20261023000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── Phase 1: kpa_pharmacy_requests 기반 보정 (경로 A) ───────────────
    const phaseARows: Array<{
      org_id: string;
      pharmacy_phone: string | null;
      business_number: string | null;
      owner_phone: string | null;
      tax_invoice_email: string | null;
    }> = await queryRunner.query(`
      SELECT DISTINCT ON (o.id)
        o.id AS org_id,
        pr.pharmacy_phone,
        pr.business_number,
        pr.owner_phone,
        pr.tax_invoice_email
      FROM organizations o
      JOIN organization_members om ON om.organization_id = o.id AND om.role = 'owner'
      JOIN kpa_pharmacy_requests pr ON pr.user_id = om.user_id AND pr.status = 'approved'
      WHERE o.type = 'pharmacy'
        AND (o.phone IS NULL OR o.phone = '' OR o.business_number IS NULL OR o.business_number = '')
      ORDER BY o.id, pr.approved_at DESC NULLS LAST
    `);

    console.log(`[BackfillKpaOrgPharmacyInfo] Phase A (pharmacy-request): ${phaseARows.length} orgs`);

    for (const row of phaseARows) {
      const meta: Record<string, string | null> = {};
      if (row.owner_phone) meta.ownerPhone = row.owner_phone;
      if (row.tax_invoice_email) meta.taxInvoiceEmail = row.tax_invoice_email;

      await queryRunner.query(
        `UPDATE organizations SET
           phone = COALESCE(NULLIF(phone, ''), $1),
           business_number = COALESCE(NULLIF(business_number, ''), $2),
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
         WHERE id = $4`,
        [
          row.pharmacy_phone || null,
          row.business_number || null,
          JSON.stringify(meta),
          row.org_id,
        ],
      );
    }

    // ─── Phase 2: users.businessInfo 기반 보정 (경로 B) ──────────────────
    // Phase 1에서 채우지 못한 organizations (kpa_pharmacy_requests 없는 계정)
    const phaseBRows: Array<{
      org_id: string;
      business_info: Record<string, any> | null;
    }> = await queryRunner.query(`
      SELECT DISTINCT ON (o.id)
        o.id AS org_id,
        u."businessInfo" AS business_info
      FROM organizations o
      JOIN organization_members om ON om.organization_id = o.id AND om.role = 'owner'
      JOIN users u ON u.id = om.user_id
      WHERE o.type = 'pharmacy'
        AND (o.phone IS NULL OR o.phone = '' OR o.business_number IS NULL OR o.business_number = '')
        AND u."businessInfo" IS NOT NULL
      ORDER BY o.id
    `);

    console.log(`[BackfillKpaOrgPharmacyInfo] Phase B (businessInfo): ${phaseBRows.length} orgs`);

    for (const row of phaseBRows) {
      const biz = row.business_info;
      if (!biz || typeof biz !== 'object') continue;

      const meta: Record<string, string | null> = {};
      if (biz.taxInvoiceEmail) meta.taxInvoiceEmail = biz.taxInvoiceEmail;
      if (biz.ceoName) meta.ceoName = biz.ceoName;
      if (biz.contactName) meta.contactName = biz.contactName;
      if (biz.managerPhone) meta.managerPhone = biz.managerPhone;

      const metaBiz = biz.metadata as Record<string, any> | null | undefined;
      const phoneValue: string | null =
        (metaBiz?.pharmacy_phone as string | undefined) || biz.phone || null;

      await queryRunner.query(
        `UPDATE organizations SET
           phone = COALESCE(NULLIF(phone, ''), $1),
           business_number = COALESCE(NULLIF(business_number, ''), $2),
           metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
         WHERE id = $4`,
        [
          phoneValue,
          biz.businessNumber || null,
          JSON.stringify(meta),
          row.org_id,
        ],
      );

      // 구조화 주소 보정
      if (biz.storeAddress?.baseAddress) {
        const flatAddress = [biz.storeAddress.baseAddress, biz.storeAddress.detailAddress]
          .filter(Boolean)
          .join(' ');
        await queryRunner.query(
          `UPDATE organizations SET
             address = COALESCE(NULLIF(address, ''), $1),
             address_detail = COALESCE(address_detail, $2::jsonb)
           WHERE id = $3`,
          [flatAddress, JSON.stringify(biz.storeAddress), row.org_id],
        );
      } else if (biz.address) {
        const flatAddress = [biz.address, biz.address2].filter(Boolean).join(' ').trim();
        await queryRunner.query(
          `UPDATE organizations SET
             address = COALESCE(NULLIF(address, ''), $1)
           WHERE id = $2`,
          [flatAddress, row.org_id],
        );
      }
    }

    const totalA = phaseARows.length;
    const totalB = phaseBRows.length;
    console.log(`[BackfillKpaOrgPharmacyInfo] Done: Phase A=${totalA}, Phase B=${totalB}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('[BackfillKpaOrgPharmacyInfo] down: no-op (값 보정만 수행, 원복 없음)');
  }
}
