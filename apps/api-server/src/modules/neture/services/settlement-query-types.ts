/** Existing settlement read filters; no policy change. */
export const VALID_STATUSES = ['pending', 'calculated', 'approved', 'paid', 'cancelled'] as const;

export interface SettlementFilters {
  page: number;
  limit: number;
  status?: string;
}
