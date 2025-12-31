/**
 * GlucoseView Service
 *
 * Phase C-1: GlucoseView API Implementation
 * Business logic for vendors, view profiles, and connections
 *
 * IMPORTANT: This service does NOT store or process raw CGM data.
 * It only manages metadata about vendors, display configurations, and connection status.
 */

import { DataSource } from 'typeorm';
import { GlucoseViewRepository } from '../repositories/glucoseview.repository.js';
import type {
  GlucoseViewVendorStatus,
  ViewProfileStatus,
  ConnectionStatus,
} from '../entities/index.js';
import type {
  VendorDto,
  ViewProfileDto,
  ConnectionDto,
  CreateVendorRequestDto,
  UpdateVendorRequestDto,
  ListVendorsQueryDto,
  CreateViewProfileRequestDto,
  UpdateViewProfileRequestDto,
  ListViewProfilesQueryDto,
  CreateConnectionRequestDto,
  UpdateConnectionRequestDto,
  ListConnectionsQueryDto,
  PaginatedResponse,
  PatientSummaryDto,
  PatientDetailDto,
  PatientInsightDto,
  PeriodSummaryDto,
  PeriodComparisonDto,
  ListPatientsQueryDto,
  PatientStatus,
  TrendDirection,
  InsightType,
  InsightSource,
} from '../dto/index.js';
import type {
  CgmPatientRow,
  CgmPatientSummaryRow,
  CgmGlucoseInsightRow,
} from '../repositories/glucoseview.repository.js';

export class GlucoseViewService {
  private repository: GlucoseViewRepository;

  constructor(dataSource: DataSource) {
    this.repository = new GlucoseViewRepository(dataSource);
  }

  // ============================================================================
  // Vendor Methods
  // ============================================================================

  async listVendors(query: ListVendorsQueryDto): Promise<PaginatedResponse<VendorDto>> {
    const { status, page = 1, limit = 20 } = query;

    const { vendors, total } = await this.repository.findAllVendors({
      status,
      page,
      limit,
    });

    return {
      data: vendors.map(this.mapVendorToDto),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async listActiveVendors(): Promise<PaginatedResponse<VendorDto>> {
    return this.listVendors({ status: 'active', page: 1, limit: 100 });
  }

  async getVendorById(id: string): Promise<VendorDto | null> {
    const vendor = await this.repository.findVendorById(id);
    return vendor ? this.mapVendorToDto(vendor) : null;
  }

  async createVendor(dto: CreateVendorRequestDto): Promise<VendorDto> {
    // Check for duplicate code
    const existing = await this.repository.findVendorByCode(dto.code);
    if (existing) {
      throw new Error('Vendor code already exists');
    }

    const vendor = await this.repository.createVendor({
      name: dto.name,
      code: dto.code,
      description: dto.description,
      logo_url: dto.logo_url,
      website_url: dto.website_url,
      supported_devices: dto.supported_devices || [],
      integration_type: dto.integration_type || 'manual',
      status: dto.status || 'planned',
      sort_order: dto.sort_order || 0,
    });

    return this.mapVendorToDto(vendor);
  }

  async updateVendor(id: string, dto: UpdateVendorRequestDto): Promise<VendorDto | null> {
    // Check if vendor exists
    const existing = await this.repository.findVendorById(id);
    if (!existing) {
      return null;
    }

    // Check for duplicate code if changing
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.repository.findVendorByCode(dto.code);
      if (duplicate) {
        throw new Error('Vendor code already exists');
      }
    }

    const vendor = await this.repository.updateVendor(id, dto);
    return vendor ? this.mapVendorToDto(vendor) : null;
  }

  async updateVendorStatus(id: string, status: GlucoseViewVendorStatus): Promise<VendorDto | null> {
    const vendor = await this.repository.updateVendor(id, { status });
    return vendor ? this.mapVendorToDto(vendor) : null;
  }

  // ============================================================================
  // View Profile Methods
  // ============================================================================

  async listViewProfiles(query: ListViewProfilesQueryDto): Promise<PaginatedResponse<ViewProfileDto>> {
    const { status, summary_level, chart_type, page = 1, limit = 20 } = query;

    const { profiles, total } = await this.repository.findAllViewProfiles({
      status,
      summary_level,
      chart_type,
      page,
      limit,
    });

    return {
      data: profiles.map(this.mapViewProfileToDto),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async listActiveViewProfiles(): Promise<PaginatedResponse<ViewProfileDto>> {
    return this.listViewProfiles({ status: 'active', page: 1, limit: 100 });
  }

  async getViewProfileById(id: string): Promise<ViewProfileDto | null> {
    const profile = await this.repository.findViewProfileById(id);
    return profile ? this.mapViewProfileToDto(profile) : null;
  }

  async createViewProfile(dto: CreateViewProfileRequestDto): Promise<ViewProfileDto> {
    // Check for duplicate code
    const existing = await this.repository.findViewProfileByCode(dto.code);
    if (existing) {
      throw new Error('View profile code already exists');
    }

    // If setting as default, clear other defaults
    if (dto.is_default) {
      await this.repository.clearDefaultProfile();
    }

    const profile = await this.repository.createViewProfile({
      name: dto.name,
      code: dto.code,
      description: dto.description,
      summary_level: dto.summary_level || 'standard',
      chart_type: dto.chart_type || 'daily',
      time_range_days: dto.time_range_days || 14,
      show_tir: dto.show_tir ?? true,
      show_average: dto.show_average ?? true,
      show_variability: dto.show_variability ?? false,
      target_low: dto.target_low || 70,
      target_high: dto.target_high || 180,
      status: dto.status || 'draft',
      is_default: dto.is_default || false,
      sort_order: dto.sort_order || 0,
    });

    return this.mapViewProfileToDto(profile);
  }

  async updateViewProfile(id: string, dto: UpdateViewProfileRequestDto): Promise<ViewProfileDto | null> {
    // Check if profile exists
    const existing = await this.repository.findViewProfileById(id);
    if (!existing) {
      return null;
    }

    // Check for duplicate code if changing
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.repository.findViewProfileByCode(dto.code);
      if (duplicate) {
        throw new Error('View profile code already exists');
      }
    }

    // If setting as default, clear other defaults
    if (dto.is_default && !existing.is_default) {
      await this.repository.clearDefaultProfile();
    }

    const profile = await this.repository.updateViewProfile(id, dto);
    return profile ? this.mapViewProfileToDto(profile) : null;
  }

  async updateViewProfileStatus(id: string, status: ViewProfileStatus): Promise<ViewProfileDto | null> {
    const profile = await this.repository.updateViewProfile(id, { status });
    return profile ? this.mapViewProfileToDto(profile) : null;
  }

  // ============================================================================
  // Connection Methods
  // ============================================================================

  async listConnections(query: ListConnectionsQueryDto): Promise<PaginatedResponse<ConnectionDto>> {
    const { pharmacy_id, vendor_id, status, page = 1, limit = 20 } = query;

    const { connections, total } = await this.repository.findAllConnections({
      pharmacy_id,
      vendor_id,
      status,
      page,
      limit,
    });

    return {
      data: connections.map(this.mapConnectionToDto),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getConnectionById(id: string): Promise<ConnectionDto | null> {
    const connection = await this.repository.findConnectionById(id);
    return connection ? this.mapConnectionToDto(connection) : null;
  }

  async createConnection(dto: CreateConnectionRequestDto): Promise<ConnectionDto> {
    // Check if connection already exists for this pharmacy-vendor pair
    if (dto.pharmacy_id) {
      const existing = await this.repository.findConnectionByPharmacyAndVendor(
        dto.pharmacy_id,
        dto.vendor_id
      );
      if (existing) {
        throw new Error('Connection already exists for this pharmacy and vendor');
      }
    }

    const connection = await this.repository.createConnection({
      pharmacy_id: dto.pharmacy_id,
      pharmacy_name: dto.pharmacy_name,
      vendor_id: dto.vendor_id,
      status: dto.status || 'pending',
      notes: dto.notes,
      config: dto.config || {},
    });

    // Re-fetch with relations
    const result = await this.repository.findConnectionById(connection.id);
    return this.mapConnectionToDto(result!);
  }

  async updateConnectionStatus(
    id: string,
    status: ConnectionStatus
  ): Promise<ConnectionDto | null> {
    const updateData: any = { status };

    // Set connected_at when status becomes active
    if (status === 'active') {
      updateData.connected_at = new Date();
      updateData.last_verified_at = new Date();
    }

    const connection = await this.repository.updateConnection(id, updateData);
    return connection ? this.mapConnectionToDto(connection) : null;
  }

  // ============================================================================
  // Mappers
  // ============================================================================

  private mapVendorToDto(vendor: any): VendorDto {
    return {
      id: vendor.id,
      name: vendor.name,
      code: vendor.code,
      description: vendor.description,
      logo_url: vendor.logo_url,
      website_url: vendor.website_url,
      supported_devices: vendor.supported_devices,
      integration_type: vendor.integration_type,
      status: vendor.status,
      sort_order: vendor.sort_order,
      created_at: vendor.created_at?.toISOString(),
      updated_at: vendor.updated_at?.toISOString(),
    };
  }

  private mapViewProfileToDto(profile: any): ViewProfileDto {
    return {
      id: profile.id,
      name: profile.name,
      code: profile.code,
      description: profile.description,
      summary_level: profile.summary_level,
      chart_type: profile.chart_type,
      time_range_days: profile.time_range_days,
      show_tir: profile.show_tir,
      show_average: profile.show_average,
      show_variability: profile.show_variability,
      target_low: profile.target_low,
      target_high: profile.target_high,
      status: profile.status,
      is_default: profile.is_default,
      sort_order: profile.sort_order,
      created_at: profile.created_at?.toISOString(),
      updated_at: profile.updated_at?.toISOString(),
    };
  }

  private mapConnectionToDto(connection: any): ConnectionDto {
    return {
      id: connection.id,
      pharmacy_id: connection.pharmacy_id,
      pharmacy_name: connection.pharmacy_name,
      vendor_id: connection.vendor_id,
      vendor: connection.vendor ? this.mapVendorToDto(connection.vendor) : undefined,
      status: connection.status,
      connected_at: connection.connected_at?.toISOString(),
      last_verified_at: connection.last_verified_at?.toISOString(),
      notes: connection.notes,
      config: connection.config,
      created_at: connection.created_at?.toISOString(),
      updated_at: connection.updated_at?.toISOString(),
    };
  }

  // ============================================================================
  // Patient Methods (CGM Summary Data - Read Only)
  // ============================================================================

  /**
   * List all patients with their latest summary
   * Returns data formatted for PatientListPage
   */
  async listPatients(query: ListPatientsQueryDto): Promise<PaginatedResponse<PatientSummaryDto>> {
    const { page = 1, limit = 20 } = query;

    const { patients, total } = await this.repository.findAllPatients({ page, limit });

    // For each patient, get their latest summary to determine status/trend
    const patientSummaries = await Promise.all(
      patients.map(async (patient) => {
        const summaries = await this.repository.findPatientSummaries(patient.id, 2);
        return this.mapPatientToSummaryDto(patient, summaries);
      })
    );

    return {
      data: patientSummaries,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get patient detail with summaries, insights, and comparison
   * Returns data formatted for PatientDetailPage
   */
  async getPatientById(id: string): Promise<PatientDetailDto | null> {
    const patient = await this.repository.findPatientById(id);
    if (!patient) {
      return null;
    }

    const summaries = await this.repository.findPatientSummaries(id, 2);
    const insights = await this.repository.findPatientInsights(id, 3);

    return this.mapPatientToDetailDto(patient, summaries, insights);
  }

  // ============================================================================
  // Patient Mappers
  // ============================================================================

  /**
   * Create alias from patient name (mask middle characters)
   */
  private createAlias(name: string): string {
    if (name.length <= 2) {
      return name[0] + 'O';
    }
    return name[0] + 'OO';
  }

  /**
   * Determine trend direction by comparing two summaries
   */
  private determineTrend(
    currentSummary: CgmPatientSummaryRow | undefined,
    previousSummary: CgmPatientSummaryRow | undefined
  ): TrendDirection {
    if (!currentSummary || !previousSummary) {
      return 'stable';
    }

    const statusOrder: Record<string, number> = { normal: 0, warning: 1, risk: 2 };
    const currentScore = statusOrder[currentSummary.status] ?? 1;
    const previousScore = statusOrder[previousSummary.status] ?? 1;

    if (currentScore < previousScore) {
      return 'improving';
    } else if (currentScore > previousScore) {
      return 'worsening';
    }
    return 'stable';
  }

  /**
   * Calculate period days from summary
   */
  private calculatePeriodDays(summary: CgmPatientSummaryRow | undefined): number {
    if (!summary) return 7;
    const start = new Date(summary.period_start);
    const end = new Date(summary.period_end);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Format date to YYYY-MM-DD
   */
  private formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  /**
   * Format date range for display (e.g., "12/15 ~ 12/21")
   */
  private formatDateRange(start: Date | string, end: Date | string): string {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
  }

  /**
   * Map patient + summaries to PatientSummaryDto (for list)
   */
  private mapPatientToSummaryDto(
    patient: CgmPatientRow,
    summaries: CgmPatientSummaryRow[]
  ): PatientSummaryDto {
    const currentSummary = summaries[0];
    const previousSummary = summaries[1];

    return {
      id: patient.id,
      alias: this.createAlias(patient.name),
      status: (currentSummary?.status as PatientStatus) || 'normal',
      periodDays: this.calculatePeriodDays(currentSummary),
      trend: this.determineTrend(currentSummary, previousSummary),
      lastUpdated: this.formatDate(currentSummary?.updated_at || patient.updated_at),
    };
  }

  /**
   * Map insight row to InsightDto
   */
  private mapInsightToDto(insight: CgmGlucoseInsightRow): PatientInsightDto {
    return {
      id: insight.id,
      type: insight.insight_type as InsightType,
      description: insight.description,
      source: insight.generated_by as InsightSource,
      referencePeriod: insight.reference_period || '',
    };
  }

  /**
   * Map summary row to PeriodSummaryDto
   */
  private mapSummaryToPeriodDto(summary: CgmPatientSummaryRow): PeriodSummaryDto {
    return {
      periodStart: this.formatDate(summary.period_start),
      periodEnd: this.formatDate(summary.period_end),
      status: summary.status as PatientStatus,
      summaryText: summary.summary_text || '',
    };
  }

  /**
   * Map patient + summaries + insights to PatientDetailDto
   */
  private mapPatientToDetailDto(
    patient: CgmPatientRow,
    summaries: CgmPatientSummaryRow[],
    insights: CgmGlucoseInsightRow[]
  ): PatientDetailDto {
    const currentSummary = summaries[0];
    const previousSummary = summaries[1];
    const trend = this.determineTrend(currentSummary, previousSummary);

    const result: PatientDetailDto = {
      id: patient.id,
      alias: this.createAlias(patient.name),
      registeredAt: this.formatDate(patient.registered_at),
      currentSummary: currentSummary
        ? this.mapSummaryToPeriodDto(currentSummary)
        : {
            periodStart: this.formatDate(new Date()),
            periodEnd: this.formatDate(new Date()),
            status: 'normal',
            summaryText: '데이터가 없습니다.',
          },
      insights: insights.map((i) => this.mapInsightToDto(i)),
    };

    // Add previous summary if exists
    if (previousSummary) {
      result.previousSummary = this.mapSummaryToPeriodDto(previousSummary);
    }

    // Add comparison if both summaries exist
    if (currentSummary && previousSummary) {
      result.comparison = {
        previousPeriod: this.formatDateRange(previousSummary.period_start, previousSummary.period_end),
        currentPeriod: this.formatDateRange(currentSummary.period_start, currentSummary.period_end),
        trend,
        description: this.generateComparisonDescription(currentSummary, previousSummary, trend),
      };
    }

    return result;
  }

  /**
   * Generate comparison description based on trend
   */
  private generateComparisonDescription(
    current: CgmPatientSummaryRow,
    previous: CgmPatientSummaryRow,
    trend: TrendDirection
  ): string {
    switch (trend) {
      case 'improving':
        return '이전 기간 대비 혈당 관리가 개선되었습니다.';
      case 'worsening':
        return '이전 기간 대비 혈당 변동이 증가했습니다. 주의가 필요합니다.';
      default:
        return '이전 기간과 유사한 상태를 유지하고 있습니다.';
    }
  }
}
