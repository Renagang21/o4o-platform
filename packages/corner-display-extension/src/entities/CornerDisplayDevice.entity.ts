/**
 * CornerDisplayDevice Entity
 *
 * Phase 2: 디바이스 → 코너 귀속 관계
 *
 * 핵심 원칙 (절대 규칙):
 * - "이 디바이스는 어떤 코너의 확장인가"를 정의
 * - 태블릿 = 코너의 물리적 확장 (POP)
 * - CornerDisplay 1 : N Device (단방향 귀속)
 * - 전환/선택 개념 완전 배제
 * - 하나의 Device는 하나의 CornerDisplay에만 귀속
 *
 * ❌ 금지된 개념:
 * - 디바이스 간 전환
 * - 우선순위/순서 필드
 * - 다중 코너 매핑
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { CornerDisplay } from './CornerDisplay.entity.js';

/**
 * 디바이스 타입
 * - Phase 1 DeviceType과 동일
 */
export type DeviceType = 'web' | 'mobile' | 'kiosk' | 'tablet' | 'signage';

@Entity('corner_display_devices')
@Index(['deviceId'], { unique: true }) // 하나의 디바이스는 하나의 코너에만 귀속
export class CornerDisplayDevice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 귀속된 코너 디스플레이 ID
   * - 이 디바이스가 "속한" 코너
   */
  @Column({ type: 'uuid' })
  @Index()
  cornerDisplayId!: string;

  /**
   * 디바이스 고유 식별자
   * - 예: 'tablet_001', 'kiosk_entrance_01'
   * - 물리적 디바이스 또는 논리적 식별자
   *
   * ⚠️ UNIQUE: 하나의 디바이스는 하나의 코너에만 귀속
   */
  @Column({ type: 'varchar', length: 100 })
  deviceId!: string;

  /**
   * 디바이스 타입
   */
  @Column({ type: 'varchar', length: 20 })
  deviceType!: DeviceType;

  /**
   * 디바이스 표시 이름 (운영자용)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  name?: string;

  /**
   * 이 디바이스가 해당 코너의 "주" 디바이스인지
   * - 코너당 하나의 primary device 권장
   * - UI 표시 및 통계 목적
   *
   * ⚠️ 전환/선택과 무관함
   */
  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  /**
   * 디바이스 상태
   * - 운영 관리용 (온라인/오프라인 추적)
   */
  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: 'active' | 'inactive' | 'maintenance';

  /**
   * 디바이스 메타데이터 (선택)
   * - 위치 정보, 하드웨어 스펙 등
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    location?: string;
    screenSize?: string;
    lastSeenAt?: string;
  };

  /**
   * 관계: ManyToOne → CornerDisplay
   * - CLAUDE.md ESM 규칙 준수: 문자열 기반 관계
   */
  @ManyToOne('CornerDisplay', 'devices')
  @JoinColumn({ name: 'cornerDisplayId' })
  cornerDisplay?: CornerDisplay;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
