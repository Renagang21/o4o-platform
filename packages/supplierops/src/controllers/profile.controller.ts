/**
 * Profile Controller
 *
 * API: /api/v1/supplierops/profile
 *
 * Phase 9-B: Core 정렬 업데이트
 */

import { Controller, Get, Put, Req, Body } from '@nestjs/common';
import { SupplierProfileService } from '../services/SupplierProfileService.js';
import type { SupplierProfileDto, UpdateProfileDto } from '../dto/index.js';

@Controller('api/v1/supplierops/profile')
export class ProfileController {
  constructor(private readonly profileService: SupplierProfileService) {}

  @Get()
  async getProfile(@Req() req: any): Promise<SupplierProfileDto> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    const profile = await this.profileService.getProfile(supplierId);
    return {
      id: profile.id,
      name: profile.companyName, // Use companyName as name
      companyName: profile.companyName,
      representativeName: profile.representativeName,
      email: profile.email,
      phone: profile.phone,
      businessNumber: profile.businessNumber,
      address: profile.address,
      status: profile.approvalStatus, // Use approvalStatus as status
      approvalStatus: profile.approvalStatus,
    };
  }

  @Put()
  async updateProfile(
    @Req() req: any,
    @Body() dto: UpdateProfileDto
  ): Promise<SupplierProfileDto> {
    const supplierId = req.user?.supplierId || req.query.supplierId;
    if (!supplierId) {
      throw new Error('Supplier ID is required');
    }
    const profile = await this.profileService.updateProfile(supplierId, dto);
    return {
      id: profile.id,
      name: profile.companyName,
      companyName: profile.companyName,
      representativeName: profile.representativeName,
      email: profile.email,
      phone: profile.phone,
      businessNumber: profile.businessNumber,
      address: profile.address,
      status: profile.approvalStatus,
      approvalStatus: profile.approvalStatus,
    };
  }
}
