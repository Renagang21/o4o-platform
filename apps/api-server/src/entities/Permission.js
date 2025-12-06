var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var Permission_1;
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToMany } from 'typeorm';
let Permission = Permission_1 = class Permission {
    id;
    // Permission key (e.g., 'users.view', 'content.create')
    key;
    // Human-readable description
    description;
    // Permission category (e.g., 'users', 'content', 'admin')
    category;
    // App that owns this permission (nullable for system permissions)
    // TEMPORARY FIX: select: false to avoid querying non-existent column in DB
    appId;
    // Active status
    isActive;
    createdAt;
    updatedAt;
    // Relations
    roles;
    // Helper methods
    static parseKey(key) {
        const [category, action] = key.split('.');
        return { category, action };
    }
    getCategory() {
        return Permission_1.parseKey(this.key).category;
    }
    getAction() {
        return Permission_1.parseKey(this.key).action;
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Permission.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, unique: true }),
    __metadata("design:type", String)
], Permission.prototype, "key", void 0);
__decorate([
    Column({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Permission.prototype, "description", void 0);
__decorate([
    Column({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], Permission.prototype, "category", void 0);
__decorate([
    Column({ type: 'varchar', length: 100, nullable: true, select: false }),
    __metadata("design:type", String)
], Permission.prototype, "appId", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Permission.prototype, "isActive", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], Permission.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], Permission.prototype, "updatedAt", void 0);
__decorate([
    ManyToMany('Role', 'permissions'),
    __metadata("design:type", Array)
], Permission.prototype, "roles", void 0);
Permission = Permission_1 = __decorate([
    Entity('permissions'),
    Index(['key'], { unique: true }),
    Index(['category']),
    Index(['isActive'])
    // @Index(['appId']) // TEMPORARY: Disabled until appId column is added to DB
], Permission);
export { Permission };
