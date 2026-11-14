import { api, API_BASE_URL } from "../lib/apiClient";
import type { PhotoInvoice } from "../../../../apps/api-server/src/services/transaction-ledger/photo-invoice";
export type { PhotoInvoice };
export interface LedgerInvoice {
  id: string;
  organization_id: string;
  state: "draft" | "confirmed" | "duplicate";
  invoice: PhotoInvoice;
  sources: Array<{ page: number; sha256: string }>;
  version: number;
  revision: string;
  issues: Array<{ path: string; code: string }>;
  warnings: Array<{ path: string; code: string }>;
  lineTotal: string | null;
  knownLineSubtotal: string;
  openUrl: string;
}
const base = API_BASE_URL + "/api/ai/transaction-ledger";
async function result<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  try {
    return (await promise).data.data;
  } catch (error) {
    const data = (error as { response?: { data?: { code?: string } } }).response
      ?.data;
    throw new Error(data?.code ?? "LEDGER_UNAVAILABLE");
  }
}
export const ledgerWorkspaces = () =>
  result<{ items: Array<{ id: string; name: string }> }>(
    api.get(base + "/workspaces"),
  );
export const ledgerGet = (organizationId: string, id: string) =>
  result<LedgerInvoice>(
    api.get(`${base}/${id}`, { params: { organizationId } }),
  );
export const ledgerList = (organizationId: string, after?: string) =>
  result<{
    items: Array<{
      id: string;
      state: string;
      sellerName: string | null;
      issuedOn: string | null;
      version: number;
    }>;
    next: string | null;
  }>(api.get(base, { params: { organizationId, after } }));
export const ledgerEnableServer = (organizationId: string) =>
  result(
    api.post(base + "/storage", { organizationId, serverStorageConsent: true }),
  );
export const ledgerSave = (
  row: LedgerInvoice,
  invoice: PhotoInvoice,
  images: Array<{ mimeType: string; base64: string }> = [],
  requestId: string = crypto.randomUUID(),
) =>
  result<LedgerInvoice>(
    api.post(base + "/prepare", {
      input: {
        workspaceId: "store:" + row.organization_id,
        invoice,
        requestId,
        invoiceId: row.id,
        expectedVersion: row.version,
      },
      images,
    }),
  );
export const ledgerConfirm = (
  row: LedgerInvoice,
  requestId: string,
  acknowledgeMissingOriginal: boolean,
  duplicateResolution?: string,
  duplicateReason?: string,
  programStatus = "unknown",
) =>
  result<LedgerInvoice>(
    api.post(`${base}/${row.id}/confirm`, {
      organizationId: row.organization_id,
      confirmation: {
        expectedVersion: row.version,
        expectedRevision: row.revision,
        requestId,
        acknowledgeMissingOriginal,
        ...(duplicateResolution
          ? { duplicateResolution, duplicateReason }
          : {}),
        programStatus,
      },
    }),
  );
export async function ledgerImage(
  organizationId: string,
  id: string,
  page: number,
  version: number,
) {
  return (
    await api.get(`${base}/${id}/images/${page}`, {
      params: { organizationId, version },
      responseType: "blob",
    })
  ).data as Blob;
}
