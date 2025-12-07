/**
 * SupplierService
 *
 * 공급자 등록/승인/Offer 관리
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier, SupplierStatus } from '../entities/Supplier.entity.js';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>
  ) {}

  /**
   * 공급자 등록
   */
  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const supplier = this.supplierRepository.create({
      ...data,
      status: SupplierStatus.PENDING,
    });
    return await this.supplierRepository.save(supplier);
  }

  /**
   * 공급자 조회
   */
  async findById(id: string): Promise<Supplier | null> {
    return await this.supplierRepository.findOne({
      where: { id },
      relations: ['offers'],
    });
  }

  /**
   * 공급자 목록 조회
   */
  async findAll(filters?: {
    status?: SupplierStatus;
    search?: string;
  }): Promise<Supplier[]> {
    const query = this.supplierRepository.createQueryBuilder('supplier');

    if (filters?.status) {
      query.andWhere('supplier.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      query.andWhere(
        '(supplier.name ILIKE :search OR supplier.contactEmail ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return await query.getMany();
  }

  /**
   * 공급자 승인
   */
  async approveSupplier(id: string): Promise<Supplier> {
    const supplier = await this.findById(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    supplier.status = SupplierStatus.ACTIVE;
    return await this.supplierRepository.save(supplier);
  }

  /**
   * 공급자 일시 중단
   */
  async suspendSupplier(id: string): Promise<Supplier> {
    const supplier = await this.findById(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    supplier.status = SupplierStatus.SUSPENDED;
    return await this.supplierRepository.save(supplier);
  }

  /**
   * 공급자 업데이트
   */
  async updateSupplier(
    id: string,
    data: Partial<Supplier>
  ): Promise<Supplier> {
    const supplier = await this.findById(id);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    Object.assign(supplier, data);
    return await this.supplierRepository.save(supplier);
  }

  /**
   * 공급자 삭제
   */
  async deleteSupplier(id: string): Promise<void> {
    await this.supplierRepository.delete(id);
  }
}
