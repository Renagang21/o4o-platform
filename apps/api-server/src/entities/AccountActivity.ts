import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index
} from 'typeorm';
import type { User } from './User.js';

@Entity('account_activities')
@Index(['userId', 'createdAt'])
export class AccountActivity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  @ManyToOne('User', { onDelete: 'CASCADE', lazy: true })
  user!: Promise<User>;

  // DB column is 'action', Entity property is 'type'
  @Column({ name: 'action', type: 'varchar', length: 50 })
  type!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * 시도 결과. **실패 기록에는 반드시 false 를 명시해야 한다.**
   *
   * WO-O4O-AUTH-ACCOUNT-ACTIVITIES-SUCCESS-FLAG-FIX-V1
   *   DB 컬럼(`success boolean NOT NULL DEFAULT true`)은 처음부터 존재했으나 **entity 에 선언이 없어**
   *   INSERT 에서 한 번도 지정되지 않았고, 전 행이 기본값 `true` 로 저장됐다.
   *   실측(2026-08-09): 실패인데 `success=true` 인 행 **1,710건**, `success=false` 행 **0건**.
   *   → 이 컬럼으로 인증 실패를 집계하면 **전량 오집계**된다.
   *
   *   기본값을 남겨 두는 이유: 성공 이벤트만 기록하는 기존 writer
   *   (account-linking / guest token 등)의 동작을 바꾸지 않기 위해서다.
   *   신규 컬럼이 아니므로 **migration 불필요**(기존 DB 컬럼에 매핑만 추가).
   */
  @Column({ type: 'boolean', default: true })
  success!: boolean;

  // DB column is 'details', not 'metadata'
  @Column({ type: 'json', nullable: true })
  details?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
