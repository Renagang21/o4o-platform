/**
 * PartnerClick Entity
 *
 * 모든 클릭 기록 저장
 *
 * 파트너 링크를 통한 모든 클릭을 추적합니다.
 * 이 데이터는 전환 추적 및 커미션 계산의 기초가 됩니다.
 *
 * @package @o4o/partner-core
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { Partner } from './Partner.entity.js';
import { PartnerLink } from './PartnerLink.entity.js';
import { PartnerConversion } from './PartnerConversion.entity.js';

@Entity('partner_clicks')
export class PartnerClick {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 파트너 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  partnerId!: string;

  /**
   * 링크 ID
   */
  @Index()
  @Column({ type: 'uuid' })
  linkId!: string;

  /**
   * 타겟 ID (상품/리스팅/페이지 ID)
   */
  @Index()
  @Column({ type: 'varchar', length: 255 })
  targetId!: string;

  /**
   * 제품 유형
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  productType?: string;

  /**
   * 방문자 세션 ID (익명 추적용)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sessionId?: string;

  /**
   * User Agent
   */
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * 참조 URL (Referrer)
   */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  referrer?: string;

  /**
   * IP 주소 (마스킹)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress?: string;

  /**
   * 디바이스 유형
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType?: string;

  /**
   * 브라우저
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  browser?: string;

  /**
   * 운영체제
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  os?: string;

  /**
   * 국가 (GeoIP)
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  country?: string;

  /**
   * 전환 여부
   */
  @Column({ type: 'boolean', default: false })
  converted!: boolean;

  /**
   * 전환 ID (전환 시 연결)
   */
  @Index()
  @Column({ type: 'uuid', nullable: true })
  conversionId?: string;

  /**
   * 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  // Relations
  @ManyToOne(() => Partner, (partner) => partner.clicks)
  @JoinColumn({ name: 'partnerId' })
  partner?: Partner;

  @ManyToOne(() => PartnerLink, (link) => link.clicks)
  @JoinColumn({ name: 'linkId' })
  link?: PartnerLink;

  @OneToOne(() => PartnerConversion, (conversion) => conversion.click)
  conversion?: PartnerConversion;
}
