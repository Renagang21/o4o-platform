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

  // TEMPORARY FIX: select: false to avoid querying non-existent column in DB
  @Column({
    type: 'enum',
    enum: ['core', 'extension', 'standalone'],
    default: 'standalone',
    select: false
  })
  // @Index() // TEMPORARY: Disabled until type column is added to DB
  type!: 'core' | 'extension' | 'standalone';

  @Column({
    type: 'enum',
    enum: ['installed', 'active', 'inactive'],
    default: 'installed'
  })
  @Index()
  status!: 'installed' | 'active' | 'inactive';

  // TEMPORARY FIX: select: false to avoid querying non-existent column in DB
  @Column({ type: 'jsonb', nullable: true, select: false })
  dependencies?: Record<string, string>; // { "app-id": "version-range" }

  // TEMPORARY FIX: select: false to avoid querying non-existent column in DB
  @Column({ type: 'varchar', length: 50, default: 'local', select: false })
  source?: string; // 'local' for now, can be 'remote' later

  @CreateDateColumn()
  installedAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
