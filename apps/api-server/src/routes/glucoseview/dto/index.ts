/**
 * GlucoseView DTOs
 *
 * Phase C-1: GlucoseView API Implementation
 * Request/Response DTOs for vendors, view profiles, and connections
 */

import type {
  GlucoseViewVendorStatus,
  ViewProfileStatus,
  SummaryLevel,
  ChartType,
  ConnectionStatus,
} from '../entities/index.js';

// ============================================================================
// Vendor DTOs
// ============================================================================

export interface VendorDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  supported_devices: string[];
  integration_type: string;
  status: GlucoseViewVendorStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorRequestDto {
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  supported_devices?: string[];
  integration_type?: string;
  status?: GlucoseViewVendorStatus;
  sort_order?: number;
}

export interface UpdateVendorRequestDto {
  name?: string;
  code?: string;
  description?: string;
  logo_url?: string;
  website_url?: string;
  supported_devices?: string[];
  integration_type?: string;
  sort_order?: number;
}

export interface ListVendorsQueryDto {
  status?: GlucoseViewVendorStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// View Profile DTOs
// ============================================================================

export interface ViewProfileDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  summary_level: SummaryLevel;
  chart_type: ChartType;
  time_range_days: number;
  show_tir: boolean;
  show_average: boolean;
  show_variability: boolean;
  target_low: number;
  target_high: number;
  status: ViewProfileStatus;
  is_default: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateViewProfileRequestDto {
  name: string;
  code: string;
  description?: string;
  summary_level?: SummaryLevel;
  chart_type?: ChartType;
  time_range_days?: number;
  show_tir?: boolean;
  show_average?: boolean;
  show_variability?: boolean;
  target_low?: number;
  target_high?: number;
  status?: ViewProfileStatus;
  is_default?: boolean;
  sort_order?: number;
}

export interface UpdateViewProfileRequestDto {
  name?: string;
  code?: string;
  description?: string;
  summary_level?: SummaryLevel;
  chart_type?: ChartType;
  time_range_days?: number;
  show_tir?: boolean;
  show_average?: boolean;
  show_variability?: boolean;
  target_low?: number;
  target_high?: number;
  is_default?: boolean;
  sort_order?: number;
}

export interface ListViewProfilesQueryDto {
  status?: ViewProfileStatus;
  summary_level?: SummaryLevel;
  chart_type?: ChartType;
  page?: number;
  limit?: number;
}

// ============================================================================
// Connection DTOs
// ============================================================================

export interface ConnectionDto {
  id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  vendor_id: string;
  vendor?: VendorDto;
  status: ConnectionStatus;
  connected_at?: string;
  last_verified_at?: string;
  notes?: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateConnectionRequestDto {
  pharmacy_id?: string;
  pharmacy_name?: string;
  vendor_id: string;
  status?: ConnectionStatus;
  notes?: string;
  config?: Record<string, any>;
}

export interface UpdateConnectionRequestDto {
  pharmacy_name?: string;
  notes?: string;
  config?: Record<string, any>;
}

export interface ListConnectionsQueryDto {
  pharmacy_id?: string;
  vendor_id?: string;
  status?: ConnectionStatus;
  page?: number;
  limit?: number;
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface SingleResponse<T> {
  data: T;
}
