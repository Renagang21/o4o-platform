import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('url_redirects')
@Index(['fromUrl'])
@Index(['toUrl'])
@Index(['statusCode'])
export class UrlRedirect {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 500 })
  fromUrl!: string;

  @Column({ type: 'varchar', length: 500 })
  toUrl!: string;

  @Column({ type: 'int', default: 301 })
  statusCode!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reason?: string; // 'permalink_change', 'manual', 'migration' 등

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  hitCount!: number; // 리다이렉트 사용 횟수

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy?: string; // 생성한 사용자 ID

  @Column({ type: 'text', nullable: true })
  notes?: string; // 추가 메모
}