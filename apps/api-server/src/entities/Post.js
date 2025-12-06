var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
let Post = class Post {
    id;
    title;
    slug;
    content;
    excerpt;
    status;
    // Post type field for supporting custom post types
    type;
    // Phase 6: Multi-tenant support
    tenant_id;
    template;
    featured_media;
    comment_status;
    ping_status;
    sticky;
    // DEPRECATED: meta column removed from database schema (2025-11-06)
    // Database now uses normalized post_meta table for metadata storage
    // This TypeScript-only field maintains backward compatibility with legacy routes
    // TypeORM does not persist this field - always returns undefined/empty object
    // TODO Phase 3: Migrate all routes reading post.meta to use post_meta table
    meta = {};
    // Categories and Tags (Many-to-Many relationships)
    categories;
    tags;
    seo;
    // Role-based access control
    accessControl;
    // Hide from search engines (useful for restricted content)
    hideFromSearchEngines;
    author_id;
    author;
    created_at;
    updated_at;
    published_at;
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], Post.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Post.prototype, "title", void 0);
__decorate([
    Column({ type: 'varchar', unique: true, length: 255 }),
    __metadata("design:type", String)
], Post.prototype, "slug", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Post.prototype, "content", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Post.prototype, "excerpt", void 0);
__decorate([
    Column({
        type: 'enum',
        enum: ['draft', 'publish', 'private', 'trash'],
        default: 'draft'
    }),
    __metadata("design:type", String)
], Post.prototype, "status", void 0);
__decorate([
    Column({
        type: 'varchar',
        length: 50,
        default: 'post'
    }),
    __metadata("design:type", String)
], Post.prototype, "type", void 0);
__decorate([
    Column({
        type: 'varchar',
        length: 64,
        nullable: true,
        comment: 'Tenant identifier for multi-tenant isolation (NULL = global)'
    }),
    __metadata("design:type", Object)
], Post.prototype, "tenant_id", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Post.prototype, "template", void 0);
__decorate([
    Column({ type: 'varchar', nullable: true }),
    __metadata("design:type", String)
], Post.prototype, "featured_media", void 0);
__decorate([
    Column({
        type: 'enum',
        enum: ['open', 'closed'],
        default: 'open'
    }),
    __metadata("design:type", String)
], Post.prototype, "comment_status", void 0);
__decorate([
    Column({
        type: 'enum',
        enum: ['open', 'closed'],
        default: 'open'
    }),
    __metadata("design:type", String)
], Post.prototype, "ping_status", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Post.prototype, "sticky", void 0);
__decorate([
    ManyToMany('Category', 'posts', { nullable: true, cascade: true }),
    JoinTable({
        name: 'post_categories',
        joinColumn: { name: 'postId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'categoryId', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], Post.prototype, "categories", void 0);
__decorate([
    ManyToMany('Tag', 'posts', { nullable: true, cascade: true }),
    JoinTable({
        name: 'post_tag_relationships',
        joinColumn: { name: 'postId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
    }),
    __metadata("design:type", Array)
], Post.prototype, "tags", void 0);
__decorate([
    Column({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Post.prototype, "seo", void 0);
__decorate([
    Column({
        type: 'jsonb',
        default: () => "'{\"enabled\": false, \"allowedRoles\": [\"everyone\"], \"requireLogin\": false}'"
    }),
    __metadata("design:type", Object)
], Post.prototype, "accessControl", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], Post.prototype, "hideFromSearchEngines", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], Post.prototype, "author_id", void 0);
__decorate([
    ManyToOne('User'),
    JoinColumn({ name: 'author_id' }),
    __metadata("design:type", Function)
], Post.prototype, "author", void 0);
__decorate([
    CreateDateColumn({ name: 'createdAt' }),
    __metadata("design:type", Date)
], Post.prototype, "created_at", void 0);
__decorate([
    UpdateDateColumn({ name: 'updatedAt' }),
    __metadata("design:type", Date)
], Post.prototype, "updated_at", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Post.prototype, "published_at", void 0);
Post = __decorate([
    Entity('posts')
], Post);
export { Post };
