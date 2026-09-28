import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * CommunityMembership — 개체 단위 가입·역할
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3-3-1
 *
 * **운영자 판정은 `community_id` 일치가 아니다.** 승인된 일반 회원도 같은 `community_id` 를
 * 갖는다. 운영자는 `role='operator' AND status='active'` 일 때만이다 —
 * 이 구분이 없으면 회원이 운영 기능을 통과한다.
 *
 * 서비스 전체 역할(`community:admin`)과 다른 축이다. 개설 승인으로 첫 운영자가 될 때
 * 여기 행만 만들고 서비스 전체 역할은 주지 않는다(§3-3-2).
 */
export type CommunityMemberRole = 'operator' | 'member';
export type CommunityMemberStatus = 'pending' | 'active' | 'rejected' | 'withdrawn';

@Entity('community_memberships')
@Index(['communityId', 'userId'], { unique: true })
export class CommunityMembership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'community_id' })
  communityId: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 16, default: 'member' })
  role: CommunityMemberRole;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: CommunityMemberStatus;

  @Column({ type: 'uuid', name: 'approved_by_user_id', nullable: true })
  approvedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'approved_at', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
