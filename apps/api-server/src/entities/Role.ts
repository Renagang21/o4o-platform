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
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Role name (e.g., 'admin', 'vendor', 'customer')
  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  // Display name for UI
  @Column({ type: 'varchar', length: 100 })
  displayName!: string;

  // Role description
  @Column({ type: 'text', nullable: true })
  description?: string;

  // Active status
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // System role cannot be deleted
  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToMany('Permission', 'roles', { eager: true })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' }
  })
  permissions!: Permission[];

  @ManyToMany('User', 'roles')
  users?: any[];

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

  // Convert to simple object for API responses
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      isActive: this.isActive,
      isSystem: this.isSystem,
      permissions: this.getPermissionKeys(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}
