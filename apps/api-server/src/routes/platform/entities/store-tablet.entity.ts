/**
 * StoreTablet Entity
 *
 * WO-STORE-LOCAL-PRODUCT-DISPLAY-V1
 * WO-O4O-TABLET-IDLE-PLAYLIST-CONFIG-V1 — idle_playlist_items 컬럼 추가
 *
 * 매장에 등록된 태블릿 디바이스.
 * organization_id로 멀티테넌트 격리.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import type { StoreTabletDisplay } from './store-tablet-display.entity.js';

/**
 * Idle mode playlist item (tablet kiosk 자체 minimal player 가 재생).
 * Signage runtime 과 무관 — Tablet 단독 재생 항목 snapshot.
 */
export interface IdlePlaylistItemRecord {
  type: 'image' | 'video';
  url: string;
  /** image 전용. video 는 onEnded 로 자동 진행. default 5000ms */
  durationMs?: number;
}

@Entity({ name: 'store_tablets' })
export class StoreTablet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index('IDX_store_tablets_org')
  organizationId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * Idle playlist items snapshot (jsonb).
   *
   * 정책: 현재 device pairing 부재로 매장 단위 설정으로 운영.
   *   kiosk public API 는 해당 매장의 첫 active tablet row 의 값을 사용한다.
   *   추후 device pairing 도입 시 tablet 별 설정으로 자연스럽게 진화 가능.
   * 운영자 편집 UI 는 후속 WO 에서 도입.
   */
  @Column({
    name: 'idle_playlist_items',
    type: 'jsonb',
    nullable: true,
  })
  idlePlaylistItems?: IdlePlaylistItemRecord[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany('StoreTabletDisplay', 'tablet')
  displays?: StoreTabletDisplay[];
}
