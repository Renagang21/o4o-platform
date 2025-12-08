/**
 * Notifications Controller
 *
 * API: /api/v1/sellerops/notifications
 */

import { Controller, Get, Post, Param, Query, Req } from '@nestjs/common';
import { NotificationService } from '../services/NotificationService.js';
import type { NotificationDto, DocumentDto } from '../dto/index.js';

@Controller('api/v1/sellerops/notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string
  ): Promise<NotificationDto[]> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }

    const filters: any = {};
    if (unreadOnly !== undefined) {
      filters.unreadOnly = unreadOnly === 'true';
    }
    if (limit) {
      filters.limit = parseInt(limit);
    }

    return await this.notificationService.getNotifications(sellerId, filters);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any): Promise<void> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    await this.notificationService.markAsRead(id, sellerId);
  }

  @Post('read-all')
  async markAllAsRead(@Req() req: any): Promise<void> {
    const sellerId = req.user?.sellerId || req.query.sellerId;
    if (!sellerId) {
      throw new Error('Seller ID is required');
    }
    await this.notificationService.markAllAsRead(sellerId);
  }
}
