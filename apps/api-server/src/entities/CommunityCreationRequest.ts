import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * CommunityCreationRequest — 개설 신청
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3-2
 *
 * slug 는 **신청 시 · 승인 직전 2회** 검사한다. 그 사이 선점되면 관리자가 임의의 주소로
 * 개설하지 않고 `slug_conflict` 로 돌려 신청자에게 새 slug 를 요청한다.
 * DB 의 부분 UNIQUE(`WHERE status='pending'`)가 동시 신청까지 물리로 막는다.
 */
export type CommunityCreationRequestStatus = 'pending' | 'approved' | 'rejected' | 'slug_conflict';

@Entity('community_creation_requests')
export class CommunityCreationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'requester_user_id' })
  requesterUserId: string;

  @Column({ type: 'varchar', length: 64, name: 'desired_slug' })
  desiredSlug: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: CommunityCreationRequestStatus;

  @Column({ type: 'uuid', name: 'reviewed_by_user_id', nullable: true })
  reviewedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'reviewed_at', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'uuid', name: 'created_community_id', nullable: true })
  createdCommunityId: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
