/** Read-only synthetic display data. Never a licence/approval or a provisioning fallback. */
export const DEMO_PHARMACY_EXAMPLE = Object.freeze({
  name: 'O4O 체험 약국', representativeName: '체험 경영자',
  businessNumber: 'DEMO-BIZ-0001', licenseNumber: 'DEMO-LICENSE-0001',
  address: '가상시 체험구 데모로 1 (실재하지 않는 주소)',
  businessType: '소매업', businessItem: '약국',
  documentUrl: '/samples/demo-pharmacy-business.svg',
});

export async function demoPharmacyExample(db: { query(sql: string, params?: any[]): Promise<any[]> }, userId: string | undefined, organizationId: string | undefined) {
  if (!userId || !organizationId) return undefined;
  const [row] = await db.query(`SELECT EXISTS (
    SELECT 1 FROM demo_accounts d
    JOIN users u ON u.id=d.user_id
    JOIN organization_members om ON om.user_id=d.user_id AND om.organization_id=$2
    JOIN organizations o ON o.id=om.organization_id AND o.type='pharmacy' AND o."isActive"=true
    JOIN neture_pharmacy_memberships pm ON pm.organization_id=o.id AND pm.applicant_user_id=d.user_id
    WHERE d.user_id=$1 AND d.demo_type='STORE_OWNER' AND d.is_active=true
      AND u."isActive"=true AND u."isEmailVerified"=true AND u.status IN ('active','approved')
      AND om.role='owner' AND om.left_at IS NULL AND pm.status='active'
  ) AS allowed`, [userId, organizationId]);
  return row?.allowed === true ? DEMO_PHARMACY_EXAMPLE : undefined;
}
