/**
 * RoleService — DB 기반 Role 카탈로그 관리
 * WO-O4O-ROLE-SYSTEM-DB-DESIGN-V1
 *
 * roles 테이블 CRUD + 검증.
 * RBAC SSOT(role_assignments)와 분리된 메타데이터 관리.
 */
import { isRetiredRoleValue, RetiredServiceError } from '../../../middleware/retired-service.middleware.js';
import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { Role } from '../entities/Role.js';
import logger from '../../../utils/logger.js';

export interface CreateRoleInput {
  name: string;
  displayName: string;
  description?: string;
  serviceKey: string;
  roleKey: string;
  isAdminRole?: boolean;
  isAssignable?: boolean;
}

export interface UpdateRoleInput {
  displayName?: string;
  description?: string;
  isAdminRole?: boolean;
  isAssignable?: boolean;
  isActive?: boolean;
}

export class RoleService {
  private repository: Repository<Role>;

  constructor() {
    this.repository = AppDataSource.getRepository(Role);
  }

  /**
   * Get role by full name (e.g., 'kpa:admin')
   */
  async getRoleByName(name: string): Promise<Role | null> {
    return this.repository.findOne({ where: { name, isActive: true } });
  }

  /**
   * Check if role name exists and is active
   */
  async isValidRole(name: string): Promise<boolean> {
    if (isRetiredRoleValue(name)) return false;
    const count = await this.repository.count({ where: { name, isActive: true } });
    return count > 0;
  }

  /**
   * Get all roles for a specific service
   */
  async getRolesByService(serviceKey: string): Promise<Role[]> {
    if (isRetiredRoleValue(serviceKey)) return [];
    return (await this.repository.find({
      where: { serviceKey, isActive: true },
      order: { name: 'ASC' },
    })).filter(r => !isRetiredRoleValue(r.serviceKey) && !isRetiredRoleValue(r.name));
  }

  /**
   * Get assignable roles for a service (operator console용)
   */
  async getAssignableRoles(serviceKey: string): Promise<Role[]> {
    if (isRetiredRoleValue(serviceKey)) return [];
    return (await this.repository.find({
      where: { serviceKey, isActive: true, isAssignable: true },
      order: { name: 'ASC' },
    })).filter(r => !isRetiredRoleValue(r.serviceKey) && !isRetiredRoleValue(r.name));
  }

  /**
   * Get all active roles
   */
  async getAllRoles(): Promise<Role[]> {
    return (await this.repository.find({
      where: { isActive: true },
      order: { serviceKey: 'ASC', name: 'ASC' },
    })).filter(r => !isRetiredRoleValue(r.serviceKey) && !isRetiredRoleValue(r.name));
  }

  /**
   * Create a new role (admin only)
   */
  async createRole(data: CreateRoleInput): Promise<Role> {
    if (isRetiredRoleValue(data.serviceKey) || isRetiredRoleValue(data.name)) throw new RetiredServiceError();
    const existing = await this.repository.findOne({ where: { name: data.name } });
    if (existing) {
      throw new Error(`Role '${data.name}' already exists`);
    }

    const role = this.repository.create({
      name: data.name,
      displayName: data.displayName,
      description: data.description,
      serviceKey: data.serviceKey,
      roleKey: data.roleKey,
      isAdminRole: data.isAdminRole ?? false,
      isAssignable: data.isAssignable ?? true,
      isSystem: false,
      isActive: true,
    });

    const saved = await this.repository.save(role);
    logger.info(`[RoleService] Created role: ${data.name}`);
    return saved;
  }

  /**
   * Update role metadata (admin only)
   */
  async updateRole(id: string, data: UpdateRoleInput): Promise<Role> {
    const role = await this.repository.findOne({ where: { id } });
    if (!role) {
      throw new Error('Role not found');
    }
    if (isRetiredRoleValue(role.serviceKey) || isRetiredRoleValue(role.name)) throw new RetiredServiceError();

    if (data.displayName !== undefined) role.displayName = data.displayName;
    if (data.description !== undefined) role.description = data.description;
    if (data.isAdminRole !== undefined) role.isAdminRole = data.isAdminRole;
    if (data.isAssignable !== undefined) role.isAssignable = data.isAssignable;
    if (data.isActive !== undefined) role.isActive = data.isActive;

    const saved = await this.repository.save(role);
    logger.info(`[RoleService] Updated role: ${role.name}`);
    return saved;
  }

  /**
   * Delete role (admin only, is_system 보호)
   */
  async deleteRole(id: string): Promise<void> {
    const role = await this.repository.findOne({ where: { id } });
    if (!role) {
      throw new Error('Role not found');
    }
    if (isRetiredRoleValue(role.serviceKey) || isRetiredRoleValue(role.name)) throw new RetiredServiceError();
    if (role.isSystem) {
      throw new Error('Cannot delete system role');
    }

    role.isActive = false;
    await this.repository.save(role);
    logger.info(`[RoleService] Deactivated role: ${role.name}`);
  }
}

export const roleService = new RoleService();
