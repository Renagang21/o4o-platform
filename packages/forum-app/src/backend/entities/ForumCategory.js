var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
let ForumCategory = class ForumCategory {
    // Note: OneToMany relationship with ForumPost removed to prevent circular dependency
    // Use ForumPostRepository.find({ where: { categoryId: category.id } }) to get posts
    // Methods
    canUserAccess(userRole) {
        if (!this.isActive)
            return false;
        switch (this.accessLevel) {
            case 'all':
                return true;
            case 'member':
                return ['customer', 'business', 'affiliate', 'admin', 'manager'].includes(userRole);
            case 'business':
                return ['business', 'affiliate', 'admin', 'manager'].includes(userRole);
            case 'admin':
                return ['admin', 'manager'].includes(userRole);
            default:
                return false;
        }
    }
    canUserPost(userRole) {
        return this.canUserAccess(userRole);
    }
    incrementPostCount() {
        this.postCount++;
    }
    decrementPostCount() {
        this.postCount = Math.max(0, this.postCount - 1);
    }
    incrementCommentCount() {
        // 댓글 수는 별도로 관리하지 않음 (포스트 수만 관리)
    }
    decrementCommentCount() {
        // 댓글 수는 별도로 관리하지 않음 (포스트 수만 관리)
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], ForumCategory.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], ForumCategory.prototype, "name", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ForumCategory.prototype, "description", void 0);
__decorate([
    Column({ type: 'varchar', length: 200, unique: true }),
    __metadata("design:type", String)
], ForumCategory.prototype, "slug", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ForumCategory.prototype, "color", void 0);
__decorate([
    Column({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumCategory.prototype, "sortOrder", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ForumCategory.prototype, "isActive", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ForumCategory.prototype, "requireApproval", void 0);
__decorate([
    Column({ type: 'enum', enum: ['all', 'member', 'business', 'admin'], default: 'all' }),
    __metadata("design:type", String)
], ForumCategory.prototype, "accessLevel", void 0);
__decorate([
    Column({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumCategory.prototype, "postCount", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ForumCategory.prototype, "createdBy", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ForumCategory.prototype, "organizationId", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ForumCategory.prototype, "isOrganizationExclusive", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], ForumCategory.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], ForumCategory.prototype, "updatedAt", void 0);
__decorate([
    ManyToOne('User', { nullable: true }),
    JoinColumn({ name: 'createdBy' }),
    __metadata("design:type", Function)
], ForumCategory.prototype, "creator", void 0);
__decorate([
    ManyToOne('Organization', { nullable: true }),
    JoinColumn({ name: 'organizationId' }),
    __metadata("design:type", Object)
], ForumCategory.prototype, "organization", void 0);
ForumCategory = __decorate([
    Entity('forum_category'),
    Index(['isActive', 'sortOrder']),
    Index(['organizationId', 'isActive'])
], ForumCategory);
export { ForumCategory };
//# sourceMappingURL=ForumCategory.js.map