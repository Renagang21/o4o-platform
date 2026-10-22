import type { DataSource } from 'typeorm';

type SignalKey = 'newOrders' | 'pendingTabletRequests' | 'pendingSalesRequests' | 'surveyRequests';
type Availability = 'available' | 'unavailable' | 'not_supported';

/** Numeric fields remain compatible; availability says which counts were actually read. */
export type StoreLiveSignals = Record<SignalKey, number> & {
  availability: Record<SignalKey, Availability>;
};

export async function loadStoreLiveSignals(db: Pick<DataSource, 'query'>, organizationId?: string): Promise<StoreLiveSignals> {
  const signals: StoreLiveSignals = {
    newOrders: 0, pendingTabletRequests: 0, pendingSalesRequests: 0, surveyRequests: 0,
    availability: {
      newOrders: 'unavailable', pendingTabletRequests: 'unavailable',
      pendingSalesRequests: 'not_supported', surveyRequests: 'not_supported',
    },
  };
  if (!organizationId) return signals;

  const read = async (key: SignalKey, sql: string) => {
    try {
      const rows = await db.query(sql, [organizationId]);
      const count = rows?.[0]?.count;
      if (Number.isSafeInteger(count) && count >= 0) {
        signals[key] = count;
        signals.availability[key] = 'available';
      }
    } catch { /* This source remains unavailable; other confirmed counts are preserved. */ }
  };
  await Promise.all([
    read('newOrders', `SELECT COUNT(*)::int AS count FROM checkout_orders
      WHERE "sellerOrganizationId" = $1 AND status = 'paid'`),
    read('pendingTabletRequests', `SELECT COUNT(*)::int AS count FROM tablet_interest_requests
      WHERE organization_id = $1 AND status = 'REQUESTED'`),
  ]);
  return signals;
}
