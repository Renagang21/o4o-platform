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

  /**
   * 시도에 사용된 이메일. **계정이 없는 시도도 기록할 수 있어야 하므로 `userId` 와 독립**이다.
   *
   * WO-O4O-AUTH-ACCOUNT-ACTIVITIES-EMAIL-MAPPING-V1
   *   DB 컬럼(`email varchar(255) NULL`)은 처음부터 존재했으나 **entity 에 선언이 없어**
   *   INSERT 에서 지정되지 않았다. 실측(2026-08-09): 전체 5,712행 중 컬럼이 채워진 행 **0건**
   *   (같은 값이 `details.email` 에는 5,712행 전부 존재).
   *   → 이메일 기준 감사·실패 분석을 컬럼으로 하면 **전량 누락**된다. `success` 와 동일한 유형의 미매핑이다.
   *
   *   신규 컬럼이 아니므로 **migration 불필요**(기존 DB 컬럼에 매핑만 추가).
   *   비밀번호·해시·토큰은 절대 담지 않는다.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

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
