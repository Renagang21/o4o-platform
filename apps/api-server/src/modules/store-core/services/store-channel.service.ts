/**
 * StoreChannelService
 * WO-O4O-STORE-CHANNEL-LIFECYCLE-V1
 *
 * Channel Lifecycle 관리: 상태 전이 (APPROVED ↔ SUSPENDED → TERMINATED)
 */

import type { DataSource } from 'typeorm';
import { OrganizationChannel } from '../entities/organization-channel.entity.js';

/** 허용되는 상태 전이 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  APPROVED: ['SUSPENDED', 'TERMINATED'],
  SUSPENDED: ['APPROVED', 'TERMINATED'],
  PENDING: ['APPROVED', 'SUSPENDED', 'TERMINATED'],
  REJECTED: ['APPROVED', 'TERMINATED'],
  // TERMINATED, EXPIRED: 전이 불가 (영구 종료)
};

export class StoreChannelService {
  constructor(private dataSource: DataSource) {}

  /**
   * 특정 매장의 채널 목록
   */
  async getStoreChannels(organizationId: string): Promise<OrganizationChannel[]> {
    const repo = this.dataSource.getRepository(OrganizationChannel);
    return repo.find({
      where: { organization_id: organizationId },
      order: { channel_type: 'ASC' },
    });
  }

  /**
   * Cross-store 채널 목록 (Operator용)
   */
  async getAllChannels(filters: {
    status?: string;
    channelType?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<{ channels: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const { status, channelType, search, page, limit } = filters;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (status) {
      conditions.push(`oc.status = $${idx++}`);
      params.push(status);
    }
    if (channelType) {
      conditions.push(`oc.channel_type = $${idx++}`);
      params.push(channelType);
    }
    if (search) {
      conditions.push(`(o.name ILIKE $${idx} OR o.code ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*)::int AS total
       FROM organization_channels oc
       JOIN organizations o ON o.id = oc.organization_id
       ${where}`,
      params,
    );
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const channels = await this.dataSource.query(
      `SELECT oc.id, oc.organization_id, oc.channel_type, oc.status,
              oc.approved_at, oc.created_at, oc.updated_at,
              o.name AS store_name, o.code AS store_code
       FROM organization_channels oc
       JOIN organizations o ON o.id = oc.organization_id
       ${where}
       ORDER BY oc.updated_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset],
    );

    return {
      channels: channels.map((c: any) => ({
        id: c.id,
        storeId: c.organization_id,
        storeName: c.store_name,
        storeCode: c.store_code,
        channelType: c.channel_type,
        status: c.status,
        approvedAt: c.approved_at,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
      pagination: { page, limit, total, totalPages },
    };
  }

  /**
   * Channel 상태 변경 (Lifecycle 전이)
   */
  async updateChannelStatus(
    channelId: string,
    organizationId: string,
    newStatus: string,
  ): Promise<OrganizationChannel> {
    const repo = this.dataSource.getRepository(OrganizationChannel);

    const channel = await repo.findOne({
      where: { id: channelId, organization_id: organizationId },
    });

    if (!channel) {
      throw new Error('CHANNEL_NOT_FOUND');
    }

    const allowed = VALID_TRANSITIONS[channel.status];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`INVALID_TRANSITION: ${channel.status} → ${newStatus}`);
    }

    channel.status = newStatus as any;
    if (newStatus === 'APPROVED') {
      channel.approved_at = new Date();
    }

    return repo.save(channel);
  }
}
