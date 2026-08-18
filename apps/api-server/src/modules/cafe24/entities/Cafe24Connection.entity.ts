/**
 * Cafe24Connection Entity
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §4
 *
 * Cafe24 쇼핑몰 1개(mall_id + shop_no)에 대한 **OAuth 연결정보만** 저장한다.
 * 상품·주문·회원 등 Cafe24 원장은 저장하지 않는다 (WO §2 — 원장 복제 금지).
 *
 * 의도적으로 만들지 않은 것:
 *   - External Provider / Commerce Account 같은 범용 외부계정 모델
 *   - organization_id / supplier_id / service_key 등 소유권 컬럼
 *     → "이 mall 을 어떤 O4O 주체가 소유하는가" 는 이번 단계에서 결정하지 않는다 (WO §5).
 *       Census 결과를 본 뒤 별도 WO 로 판정한다.
 *
 * token 은 평문 저장 금지 — `utils/crypto.ts` 의 encrypt/decrypt 를 재사용한다
 * (선례: routes/platform/store-policy.routes.ts 의 apiKey/apiSecret 저장).
 * client_secret 은 DB 에 저장하지 않는다 (환경 secret 전용).
 *
 * migration: 20270313000000-CreateCafe24Connections
 *
 * 관계는 문자열 참조도 두지 않는다 — 이 테이블은 어떤 O4O 엔티티도 소유하지 않는다
 * (CLAUDE.md §2 ESM 규칙).
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

/** 연결 상태 — DB CHECK 제약과 1:1 유지 */
export type Cafe24ConnectionStatus =
  /** access/refresh 유효 — 정상 사용 가능 */
  | 'ACTIVE'
  /** refresh token 만료 — 재승인 필요 */
  | 'EXPIRED'
  /** 운영자가 연결 해제 (이력은 남긴다) */
  | 'DISCONNECTED'
  /** 마지막 갱신/호출 실패 — last_error 참조 */
  | 'ERROR';

@Entity('cafe24_connections')
@Unique('UQ_cafe24_connections_mall_shop', ['mallId', 'shopNo'])
@Index('IDX_cafe24_connections_status', ['status'])
export class Cafe24Connection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Cafe24 쇼핑몰 ID (예: myshop) — API host 도출에 쓰인다 */
  @Column({ name: 'mall_id', type: 'varchar', length: 64 })
  mallId!: string;

  /** 멀티쇼핑몰 번호. 단일몰은 1 */
  @Column({ name: 'shop_no', type: 'int', default: 1 })
  shopNo!: number;

  /** AES-256-CBC 암호문 (utils/crypto.ts). 평문 저장 금지 */
  @Column({ name: 'access_token_enc', type: 'text' })
  accessTokenEnc!: string;

  /** AES-256-CBC 암호문. refresh 시 새 값으로 원자적 교체된다 */
  @Column({ name: 'refresh_token_enc', type: 'text' })
  refreshTokenEnc!: string;

  @Column({ name: 'access_token_expires_at', type: 'timestamptz' })
  accessTokenExpiresAt!: Date;

  @Column({ name: 'refresh_token_expires_at', type: 'timestamptz' })
  refreshTokenExpiresAt!: Date;

  /** 발급받은 scope 목록. 최소 권한 확인용 (WO §3) */
  @Column({ name: 'scopes', type: 'jsonb', default: () => `'[]'::jsonb` })
  scopes!: string[];

  @Column({ name: 'status', type: 'varchar', length: 24, default: 'ACTIVE' })
  status!: Cafe24ConnectionStatus;

  /** 마지막 실패 사유 — token 값은 절대 담지 않는다 */
  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  /** 마지막 성공적인 token 갱신 시각 */
  @Column({ name: 'last_refreshed_at', type: 'timestamptz', nullable: true })
  lastRefreshedAt!: Date | null;

  /** O4O 측에서 연결을 수행한 관리자 (감사용 · 소유권 아님) */
  @Column({ name: 'connected_by_user_id', type: 'uuid', nullable: true })
  connectedByUserId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
