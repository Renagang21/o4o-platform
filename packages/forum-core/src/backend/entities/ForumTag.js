var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
let ForumTag = class ForumTag {
    // Methods
    incrementUsage() {
        this.usageCount++;
    }
    decrementUsage() {
        this.usageCount = Math.max(0, this.usageCount - 1);
    }
    static generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], ForumTag.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], ForumTag.prototype, "name", void 0);
__decorate([
    Column({ type: 'varchar', length: 60, unique: true }),
    __metadata("design:type", String)
], ForumTag.prototype, "slug", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ForumTag.prototype, "description", void 0);
__decorate([
    Column({ type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], ForumTag.prototype, "color", void 0);
__decorate([
    Column({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumTag.prototype, "usageCount", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ForumTag.prototype, "isActive", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], ForumTag.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], ForumTag.prototype, "updatedAt", void 0);
ForumTag = __decorate([
    Entity('forum_tag'),
    Index(['name'])
], ForumTag);
export { ForumTag };
//# sourceMappingURL=ForumTag.js.map