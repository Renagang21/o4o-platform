/**
 * Cafe24MemberLink Entity
 * WO-O4O-CAFE24-B2B-STORE-MEMBER-LOGIN-PILOT-V1 §4 · §5
 *
 * Cafe24 B2B 사업자의 **거래처 매장 회원 1명** ↔ **O4O 내부 매장 1개** 의 연결 원장.
 *
 * canonical external member key = (mall_id, shop_no, user_identifier)  [§4]
 *   → raw `user_identifier` 는 저장하지 않는다. client_id 를 포함해 SHA-256 한
 *     `member_hash` 만 둔다 (파생 규칙 SSOT = cafe24-member-identity.ts).
 *   → UNIQUE(mall_id, shop_no, member_hash) 가 §5 의 멱등 요구를 DB 층에서 보장한다:
 *     같은 회원 재로그인 시 user/organization 중복 생성 0, 다른 mall·shop 충돌 0.
 *
 * 의도적으로 만들지 않은 것:
 *   - Cafe24 회원 원장(이름/email/전화) 복제 — scope 자체를 받지 않는다 (§3)
 *   - Customer Access Token 저장 — identity 확인 1회에만 쓰고 버린다 (§10)
 *
 * 관계는 문자열 참조도 두지 않는다 (CLAUDE.md §2 ESM 규칙). FK 는 migration 이 소유한다.
 *
 * migration: 20270322000000-CreateCafe24MemberLinksAndSeedCafe24B2bService
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

export type Cafe24MemberLinkStatus = 'ACTIVE' | 'INACTIVE';

@Entity('cafe24_member_links')
@Unique('UQ_cafe24_member_links_mall_shop_hash', ['mallId', 'shopNo', 'memberHash'])
@Index('IDX_cafe24_member_links_user', ['userId'])
@Index('IDX_cafe24_member_links_org', ['organizationId'])
export class Cafe24MemberLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'mall_id', type: 'varchar', length: 64 })
  mallId!: string;

  @Column({ name: 'shop_no', type: 'int', default: 1 })
  shopNo!: number;

  /** sha256 hex(64) — (client_id, mall_id, shop_no, user_identifier) 파생. 원문 아님 */
  @Column({ name: 'member_hash', type: 'varchar', length: 64 })
  memberHash!: string;

  /** client_id namespace 지문 (D3 감사용). client_id 원문은 저장하지 않는다 */
  @Column({ name: 'client_namespace', type: 'varchar', length: 32 })
  clientNamespace!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** 이 회원의 O4O 매장 조직. 프로비저닝 완료 전에는 null */
  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 16, default: 'ACTIVE' })
  status!: Cafe24MemberLinkStatus;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
