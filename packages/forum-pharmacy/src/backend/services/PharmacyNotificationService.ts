/**
 * PharmacyNotificationService - 알림 서비스
 * WO-KPA-FORUM-PHARMACY-EXT-V1
 *
 * D. 의사소통 보조 기능 (Communication Assist)
 * - 승인 요청 알림
 * - 멘션 알림
 * - 약국/조직 게시판 활동 알림
 */

import type { DataSource } from 'typeorm';
import {
  PharmacyNotificationType,
  PharmacyNotification,
} from '../types/index.js';

/**
 * 알림 생성 DTO
 */
export interface CreateNotificationDto {
  type: PharmacyNotificationType;
  recipientId: string;
  postId?: string;
  commentId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * 약사 포럼 알림 서비스
 *
 * forum-core의 requireApproval, PostStatus와 연계하여
 * 약사 서비스 특화 알림 제공
 */
export class PharmacyNotificationService {
  private dataSource: DataSource | null = null;

  /**
   * 데이터소스 초기화
   */
  init(dataSource: DataSource): void {
    this.dataSource = dataSource;
  }

  /**
   * 승인 요청 알림 생성
   * - 게시글이 PENDING 상태가 될 때 관리자에게 알림
   */
  async createApprovalRequestNotification(
    postId: string,
    postTitle: string,
    authorName: string,
    approverIds: string[]
  ): Promise<void> {
    const message = `${authorName}님이 게시글 "${postTitle}"의 승인을 요청했습니다.`;

    for (const approverId of approverIds) {
      await this.createNotification({
        type: PharmacyNotificationType.APPROVAL_REQUEST,
        recipientId: approverId,
        postId,
        message,
        metadata: { authorName, postTitle },
      });
    }
  }

  /**
   * 승인 완료 알림 생성
   * - 게시글이 승인되었을 때 작성자에게 알림
   */
  async createApprovalCompleteNotification(
    postId: string,
    postTitle: string,
    authorId: string,
    approverName: string
  ): Promise<void> {
    const message = `게시글 "${postTitle}"이(가) 승인되었습니다.`;

    await this.createNotification({
      type: PharmacyNotificationType.APPROVAL_COMPLETE,
      recipientId: authorId,
      postId,
      message,
      metadata: { approverName, postTitle },
    });
  }

  /**
   * 반려 알림 생성
   * - 게시글이 반려되었을 때 작성자에게 알림
   */
  async createApprovalRejectedNotification(
    postId: string,
    postTitle: string,
    authorId: string,
    reason?: string
  ): Promise<void> {
    const message = reason
      ? `게시글 "${postTitle}"이(가) 반려되었습니다: ${reason}`
      : `게시글 "${postTitle}"이(가) 반려되었습니다.`;

    await this.createNotification({
      type: PharmacyNotificationType.APPROVAL_REJECTED,
      recipientId: authorId,
      postId,
      message,
      metadata: { reason, postTitle },
    });
  }

  /**
   * 멘션 알림 생성
   * - 댓글에서 @멘션될 때 해당 사용자에게 알림
   */
  async createMentionNotification(
    postId: string,
    commentId: string,
    mentionedUserId: string,
    mentionerName: string,
    postTitle: string
  ): Promise<void> {
    const message = `${mentionerName}님이 "${postTitle}" 게시글에서 회원님을 언급했습니다.`;

    await this.createNotification({
      type: PharmacyNotificationType.MENTION,
      recipientId: mentionedUserId,
      postId,
      commentId,
      message,
      metadata: { mentionerName, postTitle },
    });
  }

  /**
   * 약국 게시판 활동 알림 생성
   * - 약국 전용 게시판에 새 글/댓글 작성 시
   */
  async createPharmacyActivityNotification(
    pharmacyId: string,
    memberIds: string[],
    activityType: 'new_post' | 'new_comment',
    authorName: string,
    postId: string,
    postTitle: string
  ): Promise<void> {
    const message =
      activityType === 'new_post'
        ? `${authorName}님이 약국 게시판에 새 글을 작성했습니다: "${postTitle}"`
        : `${authorName}님이 약국 게시판 글에 댓글을 남겼습니다: "${postTitle}"`;

    for (const memberId of memberIds) {
      await this.createNotification({
        type: PharmacyNotificationType.PHARMACY_ACTIVITY,
        recipientId: memberId,
        postId,
        message,
        metadata: { pharmacyId, activityType, authorName, postTitle },
      });
    }
  }

  /**
   * 조직 게시판 활동 알림 생성
   * - 조직 게시판에 새 공지사항 작성 시
   */
  async createOrganizationActivityNotification(
    organizationId: string,
    memberIds: string[],
    authorName: string,
    postId: string,
    postTitle: string
  ): Promise<void> {
    const message = `${authorName}님이 새 공지사항을 작성했습니다: "${postTitle}"`;

    for (const memberId of memberIds) {
      await this.createNotification({
        type: PharmacyNotificationType.ORGANIZATION_ACTIVITY,
        recipientId: memberId,
        postId,
        message,
        metadata: { organizationId, authorName, postTitle },
      });
    }
  }

  /**
   * 알림 생성 (내부 메서드)
   */
  private async createNotification(dto: CreateNotificationDto): Promise<PharmacyNotification> {
    const notification: PharmacyNotification = {
      id: crypto.randomUUID(),
      type: dto.type,
      recipientId: dto.recipientId,
      postId: dto.postId,
      commentId: dto.commentId,
      message: dto.message,
      isRead: false,
      createdAt: new Date(),
      metadata: dto.metadata,
    };

    // TODO: 실제 데이터베이스 저장 로직
    // 현재는 메모리 기반 또는 이벤트 발행으로 대체
    console.log('[PharmacyNotification] Created:', notification.type, notification.message);

    return notification;
  }

  /**
   * 사용자의 읽지 않은 알림 조회
   */
  async getUnreadNotifications(
    userId: string,
    limit: number = 20
  ): Promise<PharmacyNotification[]> {
    // TODO: 실제 데이터베이스 조회 로직
    return [];
  }

  /**
   * 알림 읽음 처리
   */
  async markAsRead(notificationId: string): Promise<void> {
    // TODO: 실제 데이터베이스 업데이트 로직
    console.log('[PharmacyNotification] Marked as read:', notificationId);
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(userId: string): Promise<void> {
    // TODO: 실제 데이터베이스 업데이트 로직
    console.log('[PharmacyNotification] Marked all as read for user:', userId);
  }
}

// 싱글톤 인스턴스
export const pharmacyNotificationService = new PharmacyNotificationService();
