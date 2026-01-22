import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

/**
 * AppRegistry Entity
 *
 * "기능 단위 앱"(forum, digitalsignage 등)의 설치/활성 상태를 관리하는 레지스트리
 * 기존 apps 테이블(integration/block/shortcode 타입)과는 다른 목적
 */
@Entity('app_registry')
export class AppRegistry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  appId!: string; // e.g., 'forum', 'digitalsignage', 'dropshipping'

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  version!: string; // semver format

  @Column({ type: 'varchar', length: 50, nullable: true })
  previousVersion?: string; // for rollback support

  @Column({
    type: 'varchar',
    length: 20,
    default: 'standalone',
  })
  @Index()
  type!: 'core' | 'extension' | 'standalone';

  @Column({
    type: 'varchar',
    length: 20,
    default: 'installed'
  })
  @Index()
  status!: 'installed' | 'active' | 'inactive';

  @Column({ type: 'jsonb', nullable: true })
  dependencies?: Record<string, string>; // { "app-id": "version-range" }

  @Column({ type: 'varchar', length: 50, default: 'local' })
  source?: string; // 'local' for now, can be 'remote' later

  @CreateDateColumn()
  installedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
