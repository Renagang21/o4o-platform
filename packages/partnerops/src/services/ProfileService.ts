/**
 * Profile Service
 *
 * 파트너 프로필 관리 서비스
 */

import type { DataSource } from 'typeorm';

export interface PartnerProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  socialLinks?: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileDto {
  userId: string;
  displayName: string;
  bio?: string;
}

export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  avatar?: string;
  socialLinks?: Record<string, string>;
}

export class ProfileService {
  constructor(private readonly dataSource?: DataSource) {}

  /**
   * 프로필 조회
   */
  async getProfile(tenantId: string, partnerId: string): Promise<PartnerProfile | null> {
    if (!this.dataSource) {
      return null;
    }

    try {
      const result = await this.dataSource.query(
        `SELECT id, user_id as "userId", display_name as "displayName",
                bio, avatar, social_links as "socialLinks", status,
                created_at as "createdAt", updated_at as "updatedAt"
         FROM partnerops_partners
         WHERE id = $1 AND tenant_id = $2`,
        [partnerId, tenantId]
      );
      return result[0] || null;
    } catch (error) {
      console.error('ProfileService getProfile error:', error);
      return null;
    }
  }

  /**
   * 사용자 ID로 프로필 조회
   */
  async getProfileByUserId(tenantId: string, userId: string): Promise<PartnerProfile | null> {
    if (!this.dataSource) {
      return null;
    }

    try {
      const result = await this.dataSource.query(
        `SELECT id, user_id as "userId", display_name as "displayName",
                bio, avatar, social_links as "socialLinks", status,
                created_at as "createdAt", updated_at as "updatedAt"
         FROM partnerops_partners
         WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );
      return result[0] || null;
    } catch (error) {
      console.error('ProfileService getProfileByUserId error:', error);
      return null;
    }
  }

  /**
   * 프로필 생성 (파트너 신청)
   */
  async createProfile(tenantId: string, dto: CreateProfileDto): Promise<PartnerProfile> {
    if (!this.dataSource) {
      return this.createEmptyProfile(dto);
    }

    try {
      const result = await this.dataSource.query(
        `INSERT INTO partnerops_partners
         (tenant_id, user_id, display_name, bio, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
         RETURNING id, user_id as "userId", display_name as "displayName",
                   bio, avatar, social_links as "socialLinks", status,
                   created_at as "createdAt", updated_at as "updatedAt"`,
        [tenantId, dto.userId, dto.displayName, dto.bio || null]
      );
      return result[0];
    } catch (error) {
      console.error('ProfileService createProfile error:', error);
      return this.createEmptyProfile(dto);
    }
  }

  /**
   * 프로필 수정
   */
  async updateProfile(tenantId: string, partnerId: string, dto: UpdateProfileDto): Promise<PartnerProfile> {
    if (!this.dataSource) {
      return this.createEmptyProfile({ userId: '', displayName: dto.displayName || '' });
    }

    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (dto.displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(dto.displayName);
      }
      if (dto.bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        values.push(dto.bio);
      }
      if (dto.avatar !== undefined) {
        updates.push(`avatar = $${paramIndex++}`);
        values.push(dto.avatar);
      }
      if (dto.socialLinks !== undefined) {
        updates.push(`social_links = $${paramIndex++}`);
        values.push(JSON.stringify(dto.socialLinks));
      }

      updates.push(`updated_at = NOW()`);
      values.push(partnerId, tenantId);

      const result = await this.dataSource.query(
        `UPDATE partnerops_partners
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
         RETURNING id, user_id as "userId", display_name as "displayName",
                   bio, avatar, social_links as "socialLinks", status,
                   created_at as "createdAt", updated_at as "updatedAt"`,
        values
      );
      return result[0];
    } catch (error) {
      console.error('ProfileService updateProfile error:', error);
      throw error;
    }
  }

  /**
   * 파트너 신청
   */
  async applyAsPartner(tenantId: string, userId: string, dto: CreateProfileDto): Promise<PartnerProfile> {
    return this.createProfile(tenantId, { ...dto, userId });
  }

  private createEmptyProfile(dto: CreateProfileDto): PartnerProfile {
    return {
      id: '',
      userId: dto.userId,
      displayName: dto.displayName,
      bio: dto.bio,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export const profileService = new ProfileService();
export default profileService;
