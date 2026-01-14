import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { NetureSupplier } from './NetureSupplier.entity.js';

/**
 * 콘텐츠 유형
 */
export enum ContentType {
  DESCRIPTION = 'description',  // 제품 설명 자료
  IMAGE = 'image',              // 이미지
  BANNER = 'banner',            // 배너 소재
  GUIDE = 'guide',              // 가이드 문구
}

/**
 * 콘텐츠 상태
 */
export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

/**
 * NetureSupplierContent - 공급자 콘텐츠 관리
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P1 §3.1
 *
 * 이 콘텐츠는 파트너/판매자가 참고 자료로 활용합니다.
 * 자동 적용되거나 강제 배포되지 않습니다.
 */
@Entity('neture_supplier_contents')
export class NetureSupplierContent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({
    type: 'enum',
    enum: ContentType,
    default: ContentType.DESCRIPTION,
  })
  type: ContentType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.DRAFT,
  })
  status: ContentStatus;

  @Column({ name: 'available_services', type: 'simple-array', nullable: true })
  availableServices: string[];

  @Column({ name: 'available_areas', type: 'simple-array', nullable: true })
  availableAreas: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date;

  @ManyToOne('NetureSupplier', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: NetureSupplier;
}
