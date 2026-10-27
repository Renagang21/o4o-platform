export interface PharmacyOrigin { program: string; source_key: string; collected_at: string }
export interface Product { id: string; name: string; program: string; program_code: string; barcode?: string; kind: 'dispensing'|'retail'|'unknown' }
export interface Pack { id: string; product_id: string; label: string; base_unit: string; units_per_pack: number; preferred?: boolean }
export interface Supplier { id: string; name: string; program_code?: string; common_company_id?: string; order_site_url?: string; enabled: boolean; priority?: 'primary'|'secondary'; payment_timing: 'deferred'|'at_order'|'unknown'; payment_required: boolean|null; payment_method?: string; terms_checked_at?: string; last_trade_at?: string }
export interface OrderLine { id: string; product_name: string; product_id?: string; supplier_id?: string; pack_id?: string; pack_label: string; pack_count: number|null }
export interface OrderSheet { id: string; title: string; lines: OrderLine[]; status: 'draft'|'prepared'|'handed_over'|'receipt_recorded'; receipt_reference?: string; receipt_at?: string }
export interface PharmacyDataMap {
 product: Product; pack: Pack; supplier: Supplier; sheet: OrderSheet;
 purchase: { document_type: 'purchase'|'order'|'return'; id: string; supplier_id: string; product_id: string; pack_id: string; pack_count: number; purchased_at: string };
 usage: { id: string; product_id: string; quantity: number; unit: string; period_from: string; period_to: string };
 sale: { id: string; product_id: string; quantity: number; unit: string; period_from: string; period_to: string };
 stock: { id: string; product_id: string; quantity: number|null; unit?: string; confidence: 'confirmed'|'program'|'estimated'|'unknown'; observed_at: string };
 availability: { id: string; product_id: string; supplier_id: string; pack_id: string; state: 'available'|'out_of_stock'|'unconfirmed'; observed_at: string; source: 'user_observed'; site_product_code?: string };
 balance: { id: string; supplier_id: string; purchases: number; unpaid: number; observed_at: string };
}
export type PharmacyKind = keyof PharmacyDataMap;
export type PharmacyEntry = { [K in PharmacyKind]: {kind: K; data: PharmacyDataMap[K]; origin?: PharmacyOrigin} }[PharmacyKind];
export interface PharmacyBundle { format: 'o4o-pharmacy-work-v1'; records: PharmacyEntry[] }
export const PHARMACY_FORMAT: 'o4o-pharmacy-work-v1';
export const PHARMACY_KINDS: readonly PharmacyKind[];
export const PHARMACY_LIMITS: Readonly<{ fileBytes: number; records: number; lines: number; requestLines: number }>;
export function validatePharmacyRecord<K extends PharmacyKind>(kind: K, input: unknown): PharmacyDataMap[K];
export function validatePharmacyBundle(value: unknown): PharmacyBundle;
export function validatePharmacyLinks(records: PharmacyEntry[]): void;
export function parsePharmacyBundle(text: string): PharmacyBundle;
export function groupOrderLines(sheet: OrderSheet): { supplierId: string; lines: OrderLine[] }[];
export function packTotal(pack: Pack, count: number): number;
export function orderPreparationRequest(bundle: PharmacyBundle, sheetId: string, supplierId: string, mode?: 'prepare'|'availability'): string;
