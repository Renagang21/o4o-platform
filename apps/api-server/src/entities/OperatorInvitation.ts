import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * operator_invitations — 운영자 초대 (WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1 §8)
 *
 * 관리자가 **미가입자**에게 서비스·역할을 지정해 보내는 초대. 초대 생성 시점에는
 * users / linked_accounts / service_memberships / role_assignments / service_credentials 를
 * **하나도 만들지 않는다**. 수락 시점에 Google Identity 로 users.id 가 확정된 뒤에만 부여가 일어난다.
 *
 * Token 계약: raw token 은 저장하지 않는다. `crypto.randomBytes(32)` 를 base64url 로 사용자에게 보내고
 * DB 에는 sha256 hex(`token_hash`) 만 둔다. 로그에도 raw token 을 남기지 않는다.
 *
 * `invited_email` 은 Identity Key 가 아니라 **수락 조건**이다 (§12). 이 값으로 users 를 조회하거나
 * 기존 계정을 자동 병합하지 않는다.
 */
export type OperatorInvitationStatus = 'pending' | 'accepted' | 'cancelled';

/**
 * index / unique / CHECK 는 전부 migration(1790125106065-CreateOperatorInvitations)이 정의한다.
 * 표현식 index(`lower(invited_email)`)는 decorator 로 표현할 수 없으므로 entity 에 중복 선언하지 않는다.
 */
@Entity('operator_invitations')
export class OperatorInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 초대 대상 이메일 — 저장은 입력 원문, 비교는 trim+lowercase (§12). */
  @Column({ name: 'invited_email', type: 'varchar', length: 255 })
  invitedEmail!: string;

  /** canonical `service_memberships.service_key` */
  @Column({ name: 'service_key', type: 'varchar', length: 64 })
  serviceKey!: string;

  /** service-prefixed role (예: 'kpa:operator') */
  @Column({ name: 'role', type: 'varchar', length: 64 })
  role!: string;

  /** sha256 hex of the raw invite token. raw token 은 DB 에 없다. */
  @Column({ name: 'token_hash', type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'pending' })
  status!: OperatorInvitationStatus;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  /** 초대한 관리자. 계정이 삭제되면 NULL 이 된다(초대 이력 자체는 남긴다). */
  @Column({ name: 'invited_by_user_id', type: 'uuid', nullable: true })
  invitedByUserId!: string | null;

  /** 수락으로 확정된 users.id. 확정 전에는 NULL. */
  @Column({ name: 'accepted_user_id', type: 'uuid', nullable: true })
  acceptedUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;
}
