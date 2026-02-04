/**
 * OperatorNotificationSettings Entity
 * WO-O4O-OPERATOR-NOTIFICATION-EMAIL-MANAGEMENT-V1
 *
 * 서비스별 운영자 알림 이메일 설정 저장
 * - 운영자 이메일 (기본/보조)
 * - 알림 유형별 수신 설정
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 알림 유형별 수신 설정
 */
export interface NotificationTypeSettings {
  registrationRequest: boolean;   // 회원가입 신청
  partnerApplication: boolean;    // 파트너 신청
  supplierApplication: boolean;   // 공급자 신청
  contactInquiry: boolean;        // 문의 접수
  systemAlert: boolean;           // 시스템 알림
  dailyReport: boolean;           // 일일 리포트
  // 서비스별 추가 알림 타입
  serviceApplication?: boolean;   // 서비스 이용 신청 (GlucoseView, GlycoPharm 등)
}

@Entity('operator_notification_settings')
@Index(['serviceCode'], { unique: true })
export class OperatorNotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 서비스 코드 (서비스별 고유 설정)
   * 예: 'neture', 'glucoseview', 'glycopharm', 'k-cosmetics', 'kpa-society'
   */
  @Column({ type: 'varchar', length: 50, name: 'service_code' })
  serviceCode!: string;

  /**
   * 기본 운영자 이메일
   * 신청 알림 등 중요 알림 수신
   */
  @Column({ type: 'varchar', length: 255, name: 'operator_email' })
  operatorEmail!: string;

  /**
   * 보조 운영자 이메일 (선택)
   * CC로 함께 수신
   */
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'operator_email_secondary' })
  operatorEmailSecondary?: string;

  /**
   * 알림 유형별 수신 설정
   */
  @Column({ type: 'json', default: () => "'{}'" })
  notifications!: NotificationTypeSettings;

  /**
   * 설정 활성화 여부
   */
  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  /**
   * 마지막 알림 발송 시각
   */
  @Column({ type: 'timestamp', nullable: true, name: 'last_notification_at' })
  lastNotificationAt?: Date;

  /**
   * 설정을 수정한 사용자 ID
   */
  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * Default notification settings factory
   */
  static getDefaultNotifications(): NotificationTypeSettings {
    return {
      registrationRequest: true,
      partnerApplication: true,
      supplierApplication: true,
      contactInquiry: true,
      systemAlert: true,
      dailyReport: false,
      serviceApplication: true,
    };
  }
}
