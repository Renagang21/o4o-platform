/**
 * Role Entity — DB 기반 Role 카탈로그
 * WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1
 *
 * role_assignments의 role 문자열에 대한 메타데이터 정의.
 * RBAC SSOT는 여전히 role_assignments.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToMany,
  JoinTable
} from 'typeorm';
import type { Permission } from './Permission.js';

@Entity('roles')
@Index(['name'], { unique: true })
@Index(['isActive'])
@Index(['serviceKey'])
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Full prefixed role name (e.g., 'kpa:admin', 'glycopharm:pharmacy')
  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  // Display name for UI
  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;

  // Role description
  @Column({ type: 'text', nullable: true })
  description?: string;

  // Service key (e.g., 'kpa', 'neture', 'glycopharm')
  @Column({ name: 'service_key', type: 'varchar', length: 50, nullable: true })
  serviceKey?: string;

  // Role suffix (e.g., 'admin', 'operator', 'pharmacist')
  @Column({ name: 'role_key', type: 'varchar', length: 50, nullable: true })
  roleKey?: string;

  // Active status
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  // System role cannot be deleted
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  // Admin-level role (requires admin to assign/remove)
  @Column({ name: 'is_admin_role', type: 'boolean', default: false })
  isAdminRole!: boolean;

  // Whether operators can assign this role via MembershipConsole
  @Column({ name: 'is_assignable', type: 'boolean', default: true })
  isAssignable!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToMany('Permission', 'roles', { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' }
  })
  permissions!: Permission[];

  // Helper methods
  hasPermission(permissionKey: string): boolean {
    return this.permissions?.some(p => p.key === permissionKey && p.isActive) || false;
  }

  hasAnyPermission(permissionKeys: string[]): boolean {
    return permissionKeys.some(key => this.hasPermission(key));
  }

  hasAllPermissions(permissionKeys: string[]): boolean {
    return permissionKeys.every(key => this.hasPermission(key));
  }

  getActivePermissions(): Permission[] {
    return this.permissions?.filter(p => p.isActive) || [];
  }

  getPermissionKeys(): string[] {
    return this.getActivePermissions().map(p => p.key);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      serviceKey: this.serviceKey,
      roleKey: this.roleKey,
      isActive: this.isActive,
      isSystem: this.isSystem,
      isAdminRole: this.isAdminRole,
      isAssignable: this.isAssignable,
      permissions: this.getPermissionKeys(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
