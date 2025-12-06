var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, Tree, TreeParent, TreeChildren } from 'typeorm';
let Category = class Category {
    id;
    name;
    slug;
    description;
    image;
    sortOrder;
    isActive;
    // SEO
    metaTitle;
    metaDescription;
    // 트리 구조를 위한 관계
    parent;
    children;
    count;
    // Relations
    posts;
    created_at;
    updated_at;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Category.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar' }),
    __metadata("design:type", String)
], Category.prototype, "name", void 0);
__decorate([
    Column({ type: 'varchar', unique: true }),
    __metadata("design:type", String)
], Category.prototype, "slug", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Category.prototype, "description", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Category.prototype, "image", void 0);
__decorate([
    Column({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Category.prototype, "sortOrder", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Category.prototype, "isActive", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Category.prototype, "metaTitle", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Category.prototype, "metaDescription", void 0);
__decorate([
    TreeParent(),
    __metadata("design:type", Category)
], Category.prototype, "parent", void 0);
__decorate([
    TreeChildren(),
    __metadata("design:type", Array)
], Category.prototype, "children", void 0);
__decorate([
    Column({ type: 'integer', default: 0 }),
    __metadata("design:type", Number)
], Category.prototype, "count", void 0);
__decorate([
    ManyToMany('Post', 'categories'),
    __metadata("design:type", Array)
], Category.prototype, "posts", void 0);
__decorate([
    CreateDateColumn({ name: 'createdAt' }),
    __metadata("design:type", Date)
], Category.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn({ name: 'updatedAt' }),
    __metadata("design:type", Date)
], Category.prototype, "updated_at", void 0);
Category = __decorate([
    Entity('categories'),
    Tree('nested-set')
], Category);
export { Category };
