import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('login_attempts')
@Index(['email', 'ipAddress'])
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar' })
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent?: string;

  @Column({ type: 'boolean', default: false })
  successful: boolean;

  @Column({ type: 'varchar', nullable: true })
  failureReason?: string;

  @Column({ type: 'varchar', nullable: true })
  deviceId?: string;

  @Column({ type: 'varchar', nullable: true })
  location?: string;

  @CreateDateColumn()
  attemptedAt: Date;

  // Static method to check if account should be locked
  static shouldLockAccount(attempts: LoginAttempt[]): boolean {
    const recentAttempts = attempts.filter(
      attempt => !attempt.successful &&
      new Date().getTime() - attempt.attemptedAt.getTime() < 15 * 60 * 1000 // 15 minutes
    );
    return recentAttempts.length >= 5; // Lock after 5 failed attempts in 15 minutes
  }

  // Static method to get lock duration based on failed attempts
  static getLockDuration(failedAttempts: number): number {
    if (failedAttempts < 5) return 0;
    if (failedAttempts < 10) return 15 * 60 * 1000; // 15 minutes
    if (failedAttempts < 15) return 30 * 60 * 1000; // 30 minutes
    return 60 * 60 * 1000; // 1 hour for 15+ attempts
  }
}
