import { authClient } from '@o4o/auth-client';
export interface DescriptionEntry {
  key: string; name: string; manufacturer: string | null; category: string | null; content: string; summary?: string | null;
  descriptionType: 'B2B' | 'B2C' | 'STORE' | 'SUPPLIER_STORE'; language: 'ko' | 'en' | 'ja' | 'zh'; barcodes: string[];
  identifiers: { mfdsItemSeq?: string; statementNo?: string };
  source: { kind: 'government' | 'manufacturer' | 'user_contribution'; currentness: 'retrieved' | 'archived' | 'user'; checkedOn: string | null; references: Array<{ url: string; label?: string; sha256?: string }> };
}
export interface DescriptionTarget { id: string; name: string; barcode: string | null; manufacturer: string | null; matchedBy: string;
  canonical: { id: string; content: string; summary: string | null; revision: string } | null }
export interface IntakeDetail { authorContext?: { facts: string; factSource: string; reference: string; referenceSource: string; factsReviewed: boolean; reviewed: boolean } | null; id: string; status: string; revision: string; entry: DescriptionEntry; targets: DescriptionTarget[]; reviewNote: string | null }
export interface IntakeRow { id: string; name: string; status: string; source: DescriptionEntry['source']; descriptionType: string; language: string }
const base = '/admin/o4o-product-db/description-intake';
const data = async <T>(request: Promise<{ data: { success: boolean; data: T } }>) => (await request).data.data;
export const descriptionIntakeApi = {
  preview: (entries: DescriptionEntry[]) => data(authClient.api.post<{ success: boolean; data: { items: Array<{ entry: DescriptionEntry; targets: DescriptionTarget[] }>; excludedEmpty: number } }>(`${base}/preview`, { entries })),
  submit: (entries: DescriptionEntry[]) => data(authClient.api.post<{ success: boolean; data: { items: Array<{ id: string; replayed: boolean }>; excludedEmpty: number } }>(base, { entries })),
  list: (page: number, status: string) => data(authClient.api.get<{ success: boolean; data: { items: IntakeRow[]; total: number } }>(`${base}?${new URLSearchParams({ page: String(page), status })}`)),
  detail: (id: string) => data(authClient.api.get<{ success: boolean; data: IntakeDetail }>(`${base}/${id}`)),
  edit: (id: string, expectedRevision: string, content: string) => data(authClient.api.patch<{ success: boolean; data: IntakeDetail }>(`${base}/${id}`, { expectedRevision, content })),
  approve: (detail: IntakeDetail, targets: DescriptionTarget[], acknowledgeArchived: boolean) => data(authClient.api.post<{ success: boolean; data: IntakeDetail }>(`${base}/${detail.id}/approve`, {
    expectedRevision: detail.revision, acknowledgeArchived, targets: targets.map(t => ({ masterId: t.id, expectedCanonicalRevision: t.canonical?.revision ?? null })),
  })),
  reject: (detail: IntakeDetail, note: string) => data(authClient.api.post<{ success: boolean; data: IntakeDetail }>(`${base}/${detail.id}/reject`, { expectedRevision: detail.revision, note })),
};
