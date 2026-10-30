export type SettlementStatus = 'pending' | 'calculated' | 'approved' | 'paid' | 'cancelled';
export interface Settlement {
  id: string;
  supplier_id: string;
  supplier_name?: string;
  period_start: string;
  period_end: string;
  total_sales: number;
  platform_fee: number;
  supplier_amount: number;
  platform_fee_rate: number;
  order_count: number;
  status: SettlementStatus;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export interface SettlementOrder {
  order_id: string;
  supplier_sales_amount: number;
  order_number: string;
  order_status: string;
  orderer_name: string | null;
  order_date: string;
}
export interface SettlementDetail extends Settlement {
  orders: SettlementOrder[];
}
export interface SettlementKpi {
  pending_amount: number;
  paid_amount: number;
  total_amount: number;
  pending_count: number;
  paid_count: number;
}
export interface SettlementsResponse {
  data: Settlement[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
export interface AdminSettlementKpi {
  calculated_count: number;
  calculated_amount: number;
  approved_count: number;
  approved_amount: number;
  paid_count: number;
  paid_amount: number;
}
