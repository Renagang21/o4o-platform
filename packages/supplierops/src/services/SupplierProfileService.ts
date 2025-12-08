/**
 * Supplier Profile Service
 *
 * Manages supplier profile data
 */

export interface SupplierProfile {
  id: string;
  companyName: string;
  representativeName: string;
  email: string;
  phone: string;
  businessNumber: string;
  address: string;
  approvalStatus: 'pending' | 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export class SupplierProfileService {
  /**
   * Get supplier profile
   */
  async getProfile(supplierId: string): Promise<SupplierProfile> {
    // Demo data
    return {
      id: supplierId,
      companyName: '코스메틱스 코리아',
      representativeName: '김대표',
      email: 'contact@cosmetics-korea.com',
      phone: '02-1234-5678',
      businessNumber: '123-45-67890',
      address: '서울시 강남구 테헤란로 123',
      approvalStatus: 'active',
      createdAt: new Date(Date.now() - 30 * 86400000),
      updatedAt: new Date(),
    };
  }

  /**
   * Update supplier profile
   */
  async updateProfile(
    supplierId: string,
    data: Partial<SupplierProfile>
  ): Promise<SupplierProfile> {
    return {
      id: supplierId,
      companyName: data.companyName || '',
      representativeName: data.representativeName || '',
      email: data.email || '',
      phone: data.phone || '',
      businessNumber: data.businessNumber || '',
      address: data.address || '',
      approvalStatus: 'active',
      createdAt: new Date(Date.now() - 30 * 86400000),
      updatedAt: new Date(),
    };
  }
}
