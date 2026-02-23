/**
 * RoleAssignment Shape (Type-only interface)
 *
 * 실제 TypeORM Entity 정의는 다음 위치에 있음:
 *   apps/api-server/src/modules/auth/entities/RoleAssignment.ts
 *
 * Organization-Core는 Auth module의 Entity를 DataSource에서 참조합니다.
 * 이 파일은 TypeScript 타입 안전성을 위한 인터페이스만 제공합니다.
 *
 * @see IR-O4O-ROLE-ASSIGNMENTS-SCHEMA-V1.md (Entity 이중 정의 해소)
 */
export interface RoleAssignment {
  id: string;
  userId: string;
  role: string;
  scopeType?: 'global' | 'organization';
  scopeId?: string;
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  assignedAt?: Date;
  assignedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
