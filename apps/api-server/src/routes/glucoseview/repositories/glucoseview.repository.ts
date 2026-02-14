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

export class GlucoseViewRepository {
  private vendorRepo: Repository<GlucoseViewVendor>;
  private viewProfileRepo: Repository<GlucoseViewViewProfile>;
  private connectionRepo: Repository<GlucoseViewConnection>;

  constructor(dataSource: DataSource) {
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

}
