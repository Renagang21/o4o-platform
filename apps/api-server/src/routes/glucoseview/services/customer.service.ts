/**
 * GlucoseView Customer Service
 *
 * Phase C-2: Customer Management
 * Business logic for pharmacist-managed customer records
 *
 * Key Features:
 * - Customers are scoped to the pharmacist who registered them
 * - A patient can have records in multiple pharmacies
 * - Data sharing between pharmacies requires explicit consent
 */

import { DataSource, Repository, Like, ILike } from 'typeorm';
import { GlucoseViewCustomer } from '../entities/glucoseview-customer.entity.js';
import type {
  CustomerDto,
  CreateCustomerRequestDto,
  UpdateCustomerRequestDto,
  ListCustomersQueryDto,
  PaginatedResponse,
} from '../dto/index.js';

export class CustomerService {
  private customerRepository: Repository<GlucoseViewCustomer>;

  constructor(dataSource: DataSource) {
    this.customerRepository = dataSource.getRepository(GlucoseViewCustomer);
  }

  /**
   * List customers for a specific pharmacist
   */
  async listCustomers(
    pharmacistId: string,
    query: ListCustomersQueryDto
  ): Promise<PaginatedResponse<CustomerDto>> {
    const { search, sort_by = 'recent', page = 1, limit = 20 } = query;

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.pharmacist_id = :pharmacistId', { pharmacistId });

    // Search by name
    if (search) {
      queryBuilder.andWhere('customer.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    // Sorting
    switch (sort_by) {
      case 'frequent':
        queryBuilder.orderBy('customer.visit_count', 'DESC');
        break;
      case 'name':
        queryBuilder.orderBy('customer.name', 'ASC');
        break;
      case 'recent':
      default:
        queryBuilder.orderBy('customer.last_visit', 'DESC', 'NULLS LAST');
        queryBuilder.addOrderBy('customer.created_at', 'DESC');
        break;
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [customers, total] = await queryBuilder.getManyAndCount();

    return {
      data: customers.map(this.mapCustomerToDto),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single customer by ID (must belong to the pharmacist)
   */
  async getCustomerById(
    pharmacistId: string,
    customerId: string
  ): Promise<CustomerDto | null> {
    const customer = await this.customerRepository.findOne({
      where: {
        id: customerId,
        pharmacist_id: pharmacistId,
      },
    });

    return customer ? this.mapCustomerToDto(customer) : null;
  }

  /**
   * Create a new customer
   */
  async createCustomer(
    pharmacistId: string,
    dto: CreateCustomerRequestDto
  ): Promise<CustomerDto> {
    const customer = this.customerRepository.create({
      pharmacist_id: pharmacistId,
      name: dto.name,
      phone: dto.phone ? dto.phone.replace(/\D/g, '') : dto.phone,
      email: dto.email,
      birth_year: dto.birth_year,
      gender: dto.gender,
      kakao_id: dto.kakao_id,
      notes: dto.notes,
      last_visit: new Date(),
      visit_count: 1,
      sync_status: 'pending',
      data_sharing_consent: false,
    });

    const saved = await this.customerRepository.save(customer);
    return this.mapCustomerToDto(saved);
  }

  /**
   * Update an existing customer (must belong to the pharmacist)
   */
  async updateCustomer(
    pharmacistId: string,
    customerId: string,
    dto: UpdateCustomerRequestDto
  ): Promise<CustomerDto | null> {
    const customer = await this.customerRepository.findOne({
      where: {
        id: customerId,
        pharmacist_id: pharmacistId,
      },
    });

    if (!customer) {
      return null;
    }

    // Update only provided fields
    if (dto.name !== undefined) customer.name = dto.name;
    if (dto.phone !== undefined) customer.phone = dto.phone ? dto.phone.replace(/\D/g, '') : dto.phone;
    if (dto.email !== undefined) customer.email = dto.email;
    if (dto.birth_year !== undefined) customer.birth_year = dto.birth_year;
    if (dto.gender !== undefined) customer.gender = dto.gender;
    if (dto.kakao_id !== undefined) customer.kakao_id = dto.kakao_id;
    if (dto.notes !== undefined) customer.notes = dto.notes;

    const saved = await this.customerRepository.save(customer);
    return this.mapCustomerToDto(saved);
  }

  /**
   * Delete a customer (must belong to the pharmacist)
   */
  async deleteCustomer(
    pharmacistId: string,
    customerId: string
  ): Promise<boolean> {
    const result = await this.customerRepository.delete({
      id: customerId,
      pharmacist_id: pharmacistId,
    });

    return (result.affected ?? 0) > 0;
  }

  /**
   * Record a new visit for a customer
   */
  async recordVisit(
    pharmacistId: string,
    customerId: string,
    notes?: string
  ): Promise<CustomerDto | null> {
    const customer = await this.customerRepository.findOne({
      where: {
        id: customerId,
        pharmacist_id: pharmacistId,
      },
    });

    if (!customer) {
      return null;
    }

    customer.last_visit = new Date();
    customer.visit_count += 1;
    if (notes) {
      customer.notes = notes;
    }

    const saved = await this.customerRepository.save(customer);
    return this.mapCustomerToDto(saved);
  }

  /**
   * Get customer statistics for a pharmacist
   */
  async getCustomerStats(pharmacistId: string): Promise<{
    total: number;
    recentVisits: number;
    synced: number;
  }> {
    const total = await this.customerRepository.count({
      where: { pharmacist_id: pharmacistId },
    });

    // Customers visited in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentVisits = await this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.pharmacist_id = :pharmacistId', { pharmacistId })
      .andWhere('customer.last_visit >= :date', { date: sevenDaysAgo })
      .getCount();

    const synced = await this.customerRepository.count({
      where: {
        pharmacist_id: pharmacistId,
        sync_status: 'synced',
      },
    });

    return { total, recentVisits, synced };
  }

  /**
   * Map entity to DTO
   */
  private mapCustomerToDto(customer: GlucoseViewCustomer): CustomerDto {
    return {
      id: customer.id,
      pharmacist_id: customer.pharmacist_id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      birth_year: customer.birth_year,
      gender: customer.gender,
      kakao_id: customer.kakao_id,
      last_visit: customer.last_visit?.toISOString(),
      visit_count: customer.visit_count,
      sync_status: customer.sync_status,
      last_sync_at: customer.last_sync_at?.toISOString(),
      notes: customer.notes,
      data_sharing_consent: customer.data_sharing_consent,
      consent_date: customer.consent_date?.toISOString(),
      created_at: customer.created_at.toISOString(),
      updated_at: customer.updated_at.toISOString(),
    };
  }
}
