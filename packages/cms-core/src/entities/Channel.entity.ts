/**
 * Channel Entity
 *
 * WO-P4-CHANNEL-IMPLEMENT-P0: Content distribution channel
 *
 * Channels represent "where CMS content is displayed" - the output context
 * that connects CMS Slots to physical/virtual destinations (TV, kiosk, web, signage).
 *
 * Key Design:
 * - References CmsContentSlot via slotKey (loose coupling, not FK)
 * - CMS remains unaware of Channel (one-way dependency)
 * - Scope follows CMS pattern (organizationId + serviceKey)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ChannelType - Kind of output destination
 */
export type ChannelType = 'tv' | 'kiosk' | 'signage' | 'web';

/**
 * ChannelStatus - Operational state
 */
export type ChannelStatus = 'active' | 'inactive' | 'maintenance';

@Entity('channels')
@Index(['serviceKey', 'organizationId', 'status'])
@Index(['slotKey', 'status'])
@Index(['type', 'status'])
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ═══════════════════════════════════════════════════════════════
  // SCOPE (Who owns this channel?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'uuid', nullable: true })
  @Index()
  organizationId!: string | null;
  // null = platform-owned channel
  // uuid = organization-owned (pharmacy, branch, etc.)

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  serviceKey!: string | null;
  // null = cross-service channel
  // 'glycopharm', 'kpa', 'glucoseview', 'neture', 'k-cosmetics'

  // ═══════════════════════════════════════════════════════════════
  // IDENTITY (What is this channel?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 100 })
  name!: string;
  // Human-readable name: "강남약국 TV-1", "서울지부 로비 디스플레이"

  @Column({ type: 'varchar', length: 50, nullable: true })
  @Index()
  code!: string | null;
  // Machine-readable unique code: "GN-TV-001", "SEOUL-LOBBY-01"
  // Used for device binding and API identification

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ═══════════════════════════════════════════════════════════════
  // CHANNEL TYPE (What kind of output?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 30 })
  type!: ChannelType;
  // 'tv' | 'kiosk' | 'signage' | 'web'

  // ═══════════════════════════════════════════════════════════════
  // CMS BINDING (Where does content come from?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 100 })
  slotKey!: string;
  // References CmsContentSlot.slotKey
  // Examples: 'home-hero', 'store-tv-loop', 'intranet-hero'
  // NOT a foreign key - loose coupling by design

  // ═══════════════════════════════════════════════════════════════
  // STATUS (Is this channel active?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: ChannelStatus;
  // 'active' | 'inactive' | 'maintenance'

  // ═══════════════════════════════════════════════════════════════
  // DISPLAY OPTIONS (How should content be displayed?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 20, nullable: true })
  resolution!: string | null;
  // '1920x1080', '3840x2160', '1080x1920' (portrait)

  @Column({ type: 'varchar', length: 20, default: 'landscape' })
  orientation!: string;
  // 'landscape' | 'portrait'

  @Column({ type: 'boolean', default: true })
  autoplay!: boolean;
  // Auto-start content playback

  @Column({ type: 'int', nullable: true })
  refreshIntervalSec!: number | null;
  // How often to refresh content (null = no auto-refresh)

  @Column({ type: 'int', default: 10 })
  defaultDurationSec!: number;
  // Default display duration per content item (for loops)

  // ═══════════════════════════════════════════════════════════════
  // LOCATION (Where is this channel physically?)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;
  // Physical location: "1층 로비", "계산대 옆", "대기실"

  // ═══════════════════════════════════════════════════════════════
  // METADATA (Extensible properties)
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;
  // Device ID, MAC address, tags, custom properties
  // Example: { deviceId: 'SAMSUNG-TV-001', macAddress: '00:1A:2B:3C:4D:5E', tags: ['lobby', 'high-traffic'] }

  // ═══════════════════════════════════════════════════════════════
  // AUDIT
  // ═══════════════════════════════════════════════════════════════

  @Column({ type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
