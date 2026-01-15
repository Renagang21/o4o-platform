/**
 * Partner Dashboard API DTOs
 * WO-PARTNER-DASHBOARD-API-BE-IMPLEMENTATION-V1
 */

// ========== Overview ==========
export interface PartnerOverviewDto {
  activeContentCount: number;
  activeEventCount: number;
  status: 'active' | 'inactive';
}

// ========== Targets ==========
export interface PartnerTargetDto {
  id: string;
  name: string;
  type: 'store' | 'region';
  serviceArea: string;
  address?: string;
  description?: string;
}

// ========== Content ==========
export interface PartnerContentDto {
  id: string;
  type: 'text' | 'image' | 'link';
  title: string;
  body?: string;
  url?: string;
  isActive: boolean;
  status: 'active' | 'inactive';
  createdAt: Date;
}

export interface CreatePartnerContentDto {
  type: 'text' | 'image' | 'link';
  title: string;
  body?: string;
  url?: string;
}

export interface UpdatePartnerContentDto {
  title?: string;
  body?: string;
  url?: string;
  isActive?: boolean;
}

// ========== Events ==========
export interface PartnerEventDto {
  id: string;
  name: string;
  period: {
    start: Date;
    end: Date;
  };
  region: string;
  targetScope: string;
  isActive: boolean;
  status: 'active' | 'scheduled' | 'ended';
}

export interface CreatePartnerEventDto {
  name: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  region: string;
  targetScope: string;
}

export interface UpdatePartnerEventDto {
  name?: string;
  startDate?: string;
  endDate?: string;
  region?: string;
  targetScope?: string;
  isActive?: boolean;
}

// ========== Status ==========
export interface PartnerStatusDto {
  contents: Array<{
    id: string;
    name: string;
    status: 'active' | 'inactive';
  }>;
  events: Array<{
    id: string;
    name: string;
    status: 'active' | 'ongoing' | 'ended';
  }>;
}
