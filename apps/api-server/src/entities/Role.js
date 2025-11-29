var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToMany, JoinTable } from 'typeorm';
let Role = class Role {
    id;
    // Role name (e.g., 'admin', 'vendor', 'customer')
    name;
    // Display name for UI
    displayName;
    // Role description
    description;
    // Active status
    isActive;
    // System role cannot be deleted
    isSystem;
    createdAt;
    updatedAt;
    // Relations
    permissions;
    users;
    // Helper methods
    hasPermission(permissionKey) {
        return this.permissions?.some(p => p.key === permissionKey && p.isActive) || false;
    }
    hasAnyPermission(permissionKeys) {
        return permissionKeys.some(key => this.hasPermission(key));
    }
    hasAllPermissions(permissionKeys) {
        return permissionKeys.every(key => this.hasPermission(key));
    }
    getActivePermissions() {
        return this.permissions?.filter(p => p.isActive) || [];
    }
    getPermissionKeys() {
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
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Role.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], Role.prototype, "name", void 0);
__decorate([
    Column({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Role.prototype, "displayName", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Role.prototype, "description", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Role.prototype, "isActive", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Role.prototype, "isSystem", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], Role.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], Role.prototype, "updatedAt", void 0);
__decorate([
    ManyToMany('Permission', 'roles', { eager: true }),
    JoinTable({
        name: 'role_permissions',
        joinColumn: { name: 'role_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], Role.prototype, "permissions", void 0);
__decorate([
    ManyToMany('User', 'roles'),
    __metadata("design:type", Array)
], Role.prototype, "users", void 0);
Role = __decorate([
    Entity('roles'),
    Index(['name'], { unique: true }),
    Index(['isActive'])
], Role);
export { Role };
//# sourceMappingURL=Role.js.map