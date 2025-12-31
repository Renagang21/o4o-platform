/**
 * GlucoseView Repository
 *
 * Phase C-1: GlucoseView API Implementation
 * Data access layer for vendors, view profiles, and connections
 */

import { DataSource, Repository } from 'typeorm';
import {
  GlucoseViewVendor,
  GlucoseViewViewProfile,
  GlucoseViewConnection,
} from '../entities/index.js';
import type {
  GlucoseViewVendorStatus,
  ViewProfileStatus,
  ConnectionStatus,
} from '../entities/index.js';

// Raw query result types for CGM tables
export interface CgmPatientRow {
  id: string;
  user_id: string;
  pharmacy_id: string | null;
  name: string;
  registered_at: Date;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CgmPatientSummaryRow {
  id: string;
  patient_id: string;
  period_start: Date;
  period_end: Date;
  status: string;
  avg_glucose: number;
  time_in_range: number;
  time_above_range: number | null;
  time_below_range: number | null;
  summary_text: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CgmGlucoseInsightRow {
  id: string;
  patient_id: string;
  insight_type: string;
  description: string;
  generated_by: string;
  reference_period: string | null;
  created_at: Date;
}

export class GlucoseViewRepository {
  private vendorRepo: Repository<GlucoseViewVendor>;
  private viewProfileRepo: Repository<GlucoseViewViewProfile>;
  private connectionRepo: Repository<GlucoseViewConnection>;
  private dataSource: DataSource;

  constructor(dataSource: DataSource) {
    this.dataSource = dataSource;
    this.vendorRepo = dataSource.getRepository(GlucoseViewVendor);
    this.viewProfileRepo = dataSource.getRepository(GlucoseViewViewProfile);
    this.connectionRepo = dataSource.getRepository(GlucoseViewConnection);
  }

  // ============================================================================
  // Vendor Methods
  // ============================================================================

  async findAllVendors(options: {
    status?: GlucoseViewVendorStatus;
    page?: number;
    limit?: number;
  }): Promise<{ vendors: GlucoseViewVendor[]; total: number }> {
    const { status, page = 1, limit = 20 } = options;

    const queryBuilder = this.vendorRepo.createQueryBuilder('vendor');

    if (status) {
      queryBuilder.andWhere('vendor.status = :status', { status });
    }

    queryBuilder
      .orderBy('vendor.sort_order', 'ASC')
      .addOrderBy('vendor.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [vendors, total] = await queryBuilder.getManyAndCount();
    return { vendors, total };
  }

  async findVendorById(id: string): Promise<GlucoseViewVendor | null> {
    return this.vendorRepo.findOne({ where: { id } });
  }

  async findVendorByCode(code: string): Promise<GlucoseViewVendor | null> {
    return this.vendorRepo.findOne({ where: { code } });
  }

  async createVendor(data: Partial<GlucoseViewVendor>): Promise<GlucoseViewVendor> {
    const vendor = this.vendorRepo.create(data);
    return this.vendorRepo.save(vendor);
  }

  async updateVendor(id: string, data: Partial<GlucoseViewVendor>): Promise<GlucoseViewVendor | null> {
    await this.vendorRepo.update(id, data);
    return this.findVendorById(id);
  }

  // ============================================================================
  // View Profile Methods
  // ============================================================================

  async findAllViewProfiles(options: {
    status?: ViewProfileStatus;
    summary_level?: string;
    chart_type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ profiles: GlucoseViewViewProfile[]; total: number }> {
    const { status, summary_level, chart_type, page = 1, limit = 20 } = options;

    const queryBuilder = this.viewProfileRepo.createQueryBuilder('profile');

    if (status) {
      queryBuilder.andWhere('profile.status = :status', { status });
    }
    if (summary_level) {
      queryBuilder.andWhere('profile.summary_level = :summary_level', { summary_level });
    }
    if (chart_type) {
      queryBuilder.andWhere('profile.chart_type = :chart_type', { chart_type });
    }

    queryBuilder
      .orderBy('profile.is_default', 'DESC')
      .addOrderBy('profile.sort_order', 'ASC')
      .addOrderBy('profile.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [profiles, total] = await queryBuilder.getManyAndCount();
    return { profiles, total };
  }

  async findViewProfileById(id: string): Promise<GlucoseViewViewProfile | null> {
    return this.viewProfileRepo.findOne({ where: { id } });
  }

  async findViewProfileByCode(code: string): Promise<GlucoseViewViewProfile | null> {
    return this.viewProfileRepo.findOne({ where: { code } });
  }

  async createViewProfile(data: Partial<GlucoseViewViewProfile>): Promise<GlucoseViewViewProfile> {
    const profile = this.viewProfileRepo.create(data);
    return this.viewProfileRepo.save(profile);
  }

  async updateViewProfile(
    id: string,
    data: Partial<GlucoseViewViewProfile>
  ): Promise<GlucoseViewViewProfile | null> {
    await this.viewProfileRepo.update(id, data);
    return this.findViewProfileById(id);
  }

  async clearDefaultProfile(): Promise<void> {
    await this.viewProfileRepo.update({ is_default: true }, { is_default: false });
  }

  // ============================================================================
  // Connection Methods
  // ============================================================================

  async findAllConnections(options: {
    pharmacy_id?: string;
    vendor_id?: string;
    status?: ConnectionStatus;
    page?: number;
    limit?: number;
  }): Promise<{ connections: GlucoseViewConnection[]; total: number }> {
    const { pharmacy_id, vendor_id, status, page = 1, limit = 20 } = options;

    const queryBuilder = this.connectionRepo
      .createQueryBuilder('connection')
      .leftJoinAndSelect('connection.vendor', 'vendor');

    if (pharmacy_id) {
      queryBuilder.andWhere('connection.pharmacy_id = :pharmacy_id', { pharmacy_id });
    }
    if (vendor_id) {
      queryBuilder.andWhere('connection.vendor_id = :vendor_id', { vendor_id });
    }
    if (status) {
      queryBuilder.andWhere('connection.status = :status', { status });
    }

    queryBuilder
      .orderBy('connection.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [connections, total] = await queryBuilder.getManyAndCount();
    return { connections, total };
  }

  async findConnectionById(id: string): Promise<GlucoseViewConnection | null> {
    return this.connectionRepo.findOne({
      where: { id },
      relations: ['vendor'],
    });
  }

  async findConnectionByPharmacyAndVendor(
    pharmacy_id: string,
    vendor_id: string
  ): Promise<GlucoseViewConnection | null> {
    return this.connectionRepo.findOne({
      where: { pharmacy_id, vendor_id },
      relations: ['vendor'],
    });
  }

  async createConnection(data: Partial<GlucoseViewConnection>): Promise<GlucoseViewConnection> {
    const connection = this.connectionRepo.create(data);
    return this.connectionRepo.save(connection);
  }

  async updateConnection(
    id: string,
    data: Partial<GlucoseViewConnection>
  ): Promise<GlucoseViewConnection | null> {
    await this.connectionRepo.update(id, data);
    return this.findConnectionById(id);
  }

  // ============================================================================
  // CGM Patient Methods (Read-only from cgm_* tables)
  // ============================================================================

  /**
   * Find all active patients with their latest summary
   */
  async findAllPatients(options: {
    page?: number;
    limit?: number;
  }): Promise<{ patients: CgmPatientRow[]; total: number }> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await this.dataSource.query<{ count: string }[]>(`
      SELECT COUNT(*) as count FROM cgm_patients WHERE is_active = true
    `);
    const total = parseInt(countResult[0]?.count || '0', 10);

    // Get patients
    const patients = await this.dataSource.query<CgmPatientRow[]>(`
      SELECT * FROM cgm_patients
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return { patients, total };
  }

  /**
   * Find patient by ID
   */
  async findPatientById(id: string): Promise<CgmPatientRow | null> {
    const result = await this.dataSource.query<CgmPatientRow[]>(`
      SELECT * FROM cgm_patients WHERE id = $1 AND is_active = true
    `, [id]);
    return result[0] || null;
  }

  /**
   * Find summaries for a patient, ordered by period_end DESC
   */
  async findPatientSummaries(patientId: string, limit = 2): Promise<CgmPatientSummaryRow[]> {
    return this.dataSource.query<CgmPatientSummaryRow[]>(`
      SELECT * FROM cgm_patient_summaries
      WHERE patient_id = $1
      ORDER BY period_end DESC
      LIMIT $2
    `, [patientId, limit]);
  }

  /**
   * Find latest summary for a patient
   */
  async findLatestPatientSummary(patientId: string): Promise<CgmPatientSummaryRow | null> {
    const result = await this.findPatientSummaries(patientId, 1);
    return result[0] || null;
  }

  /**
   * Find insights for a patient, ordered by created_at DESC
   */
  async findPatientInsights(patientId: string, limit = 3): Promise<CgmGlucoseInsightRow[]> {
    return this.dataSource.query<CgmGlucoseInsightRow[]>(`
      SELECT * FROM cgm_glucose_insights
      WHERE patient_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [patientId, limit]);
  }
}
