import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ServiceAudiencePolicy
 *
 * WO-O4O-SERVICE-PHARMACY-AUDIENCE-POLICY-SETTINGS-V1
 *
 * 서비스(serviceKey)가 **약국 대상 서비스**(이용자가 약국인 서비스)인지 DB 로 관리한다.
 * 후속 WO(WO-O4O-DRUG-SERVICE-CONNECTION-GATE-V1)에서 의약품 제품의 서비스 연결 gate 기준값으로 참조한다.
 *
 * 원칙:
 *  - admin.neture.co.kr 전용 platform 설정(neture:admin). 일반 서비스 운영자 노출 대상 아님.
 *  - 본 WO 에서는 정책 저장/조회까지만. gate 실제 적용은 후속 WO.
 *  - 한 서비스 = 1 row (UNIQUE serviceKey).
 */
@Entity('service_audience_policies')
@Index(['serviceKey'], { unique: true })
export class ServiceAudiencePolicy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50, unique: true })
  serviceKey: string;

  /** 약국 대상 서비스 여부 (이용자가 약국). 의약품 서비스 연결 gate 기준. */
  @Column({ name: 'is_pharmacy_target_service', type: 'boolean', default: false })
  isPharmacyTargetService: boolean;

  @Column({ name: 'note', type: 'text', nullable: true })
  note: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
