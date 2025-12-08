/**
 * NotificationService
 *
 * 알림/공지 관리 서비스
 */

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { NotificationDto, DocumentDto } from '../dto/index.js';

@Injectable()
export class NotificationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * 알림 목록 조회
   */
  async getNotifications(
    sellerId: string,
    filters?: { unreadOnly?: boolean; limit?: number }
  ): Promise<NotificationDto[]> {
    let query = `
      SELECT id, type, title, message, read, data, created_at as "createdAt"
      FROM sellerops_notifications
      WHERE seller_id = $1
    `;

    if (filters?.unreadOnly) {
      query += ` AND read = false`;
    }

    query += ` ORDER BY created_at DESC`;

    if (filters?.limit) {
      query += ` LIMIT ${filters.limit}`;
    }

    const notifications = await this.dataSource.query(query, [sellerId]);

    return notifications.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      data: n.data,
      createdAt: n.createdAt,
    }));
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(notificationId: string, sellerId: string): Promise<void> {
    await this.dataSource.query(`
      UPDATE sellerops_notifications
      SET read = true
      WHERE id = $1 AND seller_id = $2
    `, [notificationId, sellerId]);
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(sellerId: string): Promise<void> {
    await this.dataSource.query(`
      UPDATE sellerops_notifications
      SET read = true
      WHERE seller_id = $1
    `, [sellerId]);
  }

  /**
   * 알림 생성
   */
  async createNotification(
    sellerId: string,
    notification: {
      type: string;
      title: string;
      message: string;
      data?: Record<string, any>;
    }
  ): Promise<NotificationDto> {
    const result = await this.dataSource.query(`
      INSERT INTO sellerops_notifications (seller_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, type, title, message, read, data, created_at as "createdAt"
    `, [
      sellerId,
      notification.type,
      notification.title,
      notification.message,
      notification.data ? JSON.stringify(notification.data) : null,
    ]);

    const created = result[0];

    this.eventEmitter.emit('sellerops.notification.sent', {
      sellerId,
      notificationId: created.id,
    });

    return {
      id: created.id,
      type: created.type,
      title: created.title,
      message: created.message,
      read: created.read,
      data: created.data,
      createdAt: created.createdAt,
    };
  }

  /**
   * 공지/문서 목록 조회
   */
  async getDocuments(category?: string): Promise<DocumentDto[]> {
    let query = `
      SELECT id, title, category, content, created_at as "createdAt"
      FROM sellerops_documents
      WHERE is_published = true
    `;

    const params: any[] = [];
    if (category) {
      query += ` AND category = $1`;
      params.push(category);
    }

    query += ` ORDER BY order_index ASC, created_at DESC`;

    const documents = await this.dataSource.query(query, params);

    return documents.map((d: any) => ({
      id: d.id,
      title: d.title,
      category: d.category,
      content: d.content,
      createdAt: d.createdAt,
    }));
  }

  /**
   * 문서 상세 조회
   */
  async getDocumentById(documentId: string): Promise<DocumentDto | null> {
    const result = await this.dataSource.query(`
      SELECT id, title, category, content, created_at as "createdAt"
      FROM sellerops_documents
      WHERE id = $1 AND is_published = true
    `, [documentId]);

    if (!result.length) return null;

    const d = result[0];
    return {
      id: d.id,
      title: d.title,
      category: d.category,
      content: d.content,
      createdAt: d.createdAt,
    };
  }
}
