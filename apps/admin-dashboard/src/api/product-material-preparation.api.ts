import { authClient } from "@o4o/auth-client";
export interface MaterialPreparationRow {
  id: string;
  name: string;
  barcode: string | null;
  manufacturer: string | null;
  specification: string | null;
  storeCount: number;
  consultation: "structured" | "unclassified" | "missing";
  standardDescription: "ready" | "missing";
  consultationId: string | null;
  standardDescriptionId: string | null;
}
export interface MaterialPreparationPage {
  items: MaterialPreparationRow[];
  nextCursor: string | null;
  scanned: number;
  language: string;
}
const base = "/admin/o4o-product-db/description-intake/preparation";
export const materialPreparationApi = {
  list: async (query: {
    language: string;
    search: string;
    state: string;
    cursor?: string;
  }) =>
    (
      await authClient.api.get<{ data: MaterialPreparationPage }>(
        `${base}?${new URLSearchParams(query)}`,
      )
    ).data.data,
  request: async (body: {
    ids: string[];
    language: string;
    purpose: "CONSULTATION" | "STORE";
  }) =>
    (
      await authClient.api.post<{ data: { requestText: string } }>(
        `${base}/request`,
        body,
      )
    ).data.data,
};
