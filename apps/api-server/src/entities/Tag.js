var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany } from 'typeorm';
let Tag = class Tag {
    id;
    name;
    slug;
    description;
    count; // Number of posts using this tag
    meta;
    // Relations
    posts;
    created_at;
    updated_at;
    // Helper method to generate slug from name
    generateSlug() {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9가-힣]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }
    // Helper method to increment usage count
    incrementUsage() {
        this.count = (this.count || 0) + 1;
    }
    // Helper method to decrement usage count
    decrementUsage() {
        this.count = Math.max(0, (this.count || 0) - 1);
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Tag.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', unique: true, length: 100 }),
    __metadata("design:type", String)
], Tag.prototype, "name", void 0);
__decorate([
    Column({ type: 'varchar', unique: true, length: 100 }),
    __metadata("design:type", String)
], Tag.prototype, "slug", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Tag.prototype, "description", void 0);
__decorate([
    Column({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Tag.prototype, "count", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Tag.prototype, "meta", void 0);
__decorate([
    ManyToMany('Post', 'tags'),
    __metadata("design:type", Array)
], Tag.prototype, "posts", void 0);
__decorate([
    CreateDateColumn(),
    __metadata("design:type", Date)
], Tag.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn(),
    __metadata("design:type", Date)
], Tag.prototype, "updated_at", void 0);
Tag = __decorate([
    Entity('tags')
], Tag);
export { Tag };
