import type {AxiosInstance} from 'axios';
export interface SettlementNotificationJob {
  settlementId: string;
  state:
    | "pending"
    | "failed"
    | "delivered"
    | "legacy_unknown"
    | "not_applicable";
  attempts: number;
  deliveredCount: number;
  lastErrorCode: string | null;
  deliveredAt: string | null;
  updatedAt: string | null;
  supplierName?: string;
  periodStart?: string;
  periodEnd?: string;
}
export interface SettlementNotificationQueue {
  items: SettlementNotificationJob[];
  page: number;
  limit: number;
  total: number;
}
function job(data: any): data is SettlementNotificationJob {
  return (
    !!data &&
    typeof data.settlementId === "string" &&
    [
      "pending",
      "failed",
      "delivered",
      "legacy_unknown",
      "not_applicable",
    ].includes(data.state) &&
    Number.isInteger(data.attempts) &&
    data.attempts >= 0 &&
    Number.isInteger(data.deliveredCount) &&
    data.deliveredCount >= 0
  );
}
export function createSettlementNotificationApi(api:AxiosInstance) {
const settlementNotificationApi = {
  async get(id: string): Promise<SettlementNotificationJob> {
    const result = (
      await api.get(`/neture/admin/settlements/${id}/notification`)
    ).data;
    if (
      !result?.success ||
      !job(result.data) ||
      result.data.settlementId !== id
    )
      throw Error("SETTLEMENT_NOTIFICATION_UNAVAILABLE");
    return result.data;
  },
  async list(
    state: "pending" | "failed",
    page: number,
  ): Promise<SettlementNotificationQueue> {
    const result = (
      await api.get(
        `/neture/admin/settlements/notification-jobs?state=${state}&page=${page}&limit=10`,
      )
    ).data;
    const data = result?.data;
    if (
      !result?.success ||
      !Array.isArray(data?.items) ||
      !data.items.every((item: any) => job(item) && item.state === state) ||
      !Number.isInteger(data.total) ||
      data.total < 0 ||
      data.page !== page ||
      data.limit !== 10
    )
      throw Error("SETTLEMENT_NOTIFICATION_UNAVAILABLE");
    return data;
  },
  async retry(id: string): Promise<SettlementNotificationJob> {
    const result = (
      await api.post(`/neture/admin/settlements/${id}/notification/retry`, {})
    ).data;
    if (
      !result?.success ||
      !job(result.data) ||
      result.data.settlementId !== id
    )
      throw Error("SETTLEMENT_NOTIFICATION_UNAVAILABLE");
    return result.data;
  },
};
return settlementNotificationApi;
}
