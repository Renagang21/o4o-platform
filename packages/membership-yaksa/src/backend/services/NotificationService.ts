import { DataSource, Repository } from 'typeorm';

/**
 * Notification Type
 */
export type NotificationType =
  | 'verification-approved'
  | 'verification-rejected'
  | 'fee-reminder'
  | 'general';

/**
 * Notification DTO
 */
export interface CreateNotificationDto {
  memberId: string;
  type: NotificationType;
  message: string;
  detail?: Record<string, any>;
}

/**
 * Notification (간단 구현)
 *
 * 실제 DB 엔티티가 없는 버전
 * 향후 확장 시 yaksa_notifications 테이블 생성 가능
 */
export interface Notification {
  id: string;
  memberId: string;
  type: NotificationType;
  message: string;
  detail?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

/**
 * NotificationService
 *
 * 회원 알림 서비스
 *
 * Phase 2에서는 간단한 로그 기반 구현
 * Phase 3+에서 DB 저장 및 실시간 알림으로 확장 가능
 */
export class NotificationService {
  constructor(private dataSource: DataSource) {}

  /**
   * 알림 전송
   *
   * 현재 버전: 콘솔 로그 기록
   * 향후: DB 저장, 이메일, SMS, Push 등
   */
  async send(dto: CreateNotificationDto): Promise<void> {
    const notification: Notification = {
      id: this.generateId(),
      memberId: dto.memberId,
      type: dto.type,
      message: dto.message,
      detail: dto.detail,
      read: false,
      createdAt: new Date(),
    };

    // 현재는 로그로만 기록
    console.log('[Notification]', {
      type: dto.type,
      memberId: dto.memberId,
      message: dto.message,
      detail: dto.detail,
      timestamp: notification.createdAt.toISOString(),
    });

    // TODO Phase 3+: DB 저장
    // const notificationRepo = this.dataSource.getRepository(NotificationEntity);
    // await notificationRepo.save(notification);

    // TODO Phase 3+: 실시간 알림 전송
    // await this.sendRealtimeNotification(notification);

    // TODO Phase 3+: 이메일 알림
    // if (dto.type === 'verification-approved') {
    //   await this.sendEmailNotification(notification);
    // }
  }

  /**
   * 검증 승인 알림
   */
  async sendVerificationApproved(memberId: string, detail?: any): Promise<void> {
    await this.send({
      memberId,
      type: 'verification-approved',
      message: '자격 검증이 승인되었습니다.',
      detail,
    });
  }

  /**
   * 검증 거부 알림
   */
  async sendVerificationRejected(
    memberId: string,
    reason: string,
    detail?: any
  ): Promise<void> {
    await this.send({
      memberId,
      type: 'verification-rejected',
      message: `자격 검증이 반려되었습니다. 사유: ${reason}`,
      detail,
    });
  }

  /**
   * 연회비 알림
   */
  async sendFeeReminder(memberId: string, year: number, amount: number): Promise<void> {
    await this.send({
      memberId,
      type: 'fee-reminder',
      message: `${year}년도 연회비 납부가 필요합니다. (${amount.toLocaleString()}원)`,
      detail: { year, amount },
    });
  }

  /**
   * 일반 알림
   */
  async sendGeneral(memberId: string, message: string, detail?: any): Promise<void> {
    await this.send({
      memberId,
      type: 'general',
      message,
      detail,
    });
  }

  /**
   * ID 생성 (UUID 대체용)
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
