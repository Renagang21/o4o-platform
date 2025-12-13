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
export var PostStatus;
(function (PostStatus) {
    PostStatus["DRAFT"] = "draft";
    PostStatus["PUBLISHED"] = "publish";
    PostStatus["PENDING"] = "pending";
    PostStatus["REJECTED"] = "rejected";
    PostStatus["ARCHIVED"] = "archived";
})(PostStatus || (PostStatus = {}));
export var PostType;
(function (PostType) {
    PostType["DISCUSSION"] = "discussion";
    PostType["QUESTION"] = "question";
    PostType["ANNOUNCEMENT"] = "announcement";
    PostType["POLL"] = "poll";
    PostType["GUIDE"] = "guide";
})(PostType || (PostType = {}));
let ForumPost = class ForumPost {
    // Note: OneToMany relationship with ForumComment removed to prevent circular dependency
    // Use ForumCommentRepository.find({ where: { postId: post.id } }) to get comments
    // Methods
    canUserView(userRole) {
        if (this.status !== PostStatus.PUBLISHED) {
            return ['admin', 'manager'].includes(userRole);
        }
        return true;
    }
    canUserEdit(userId, userRole) {
        if (['admin', 'manager'].includes(userRole))
            return true;
        if (this.authorId === userId && !this.isLocked)
            return true;
        return false;
    }
    canUserComment(userRole) {
        if (this.isLocked || !this.allowComments)
            return false;
        return true;
    }
    incrementViewCount() {
        this.viewCount++;
    }
    incrementCommentCount(userId) {
        this.commentCount++;
        this.lastCommentAt = new Date();
        this.lastCommentBy = userId;
    }
    decrementCommentCount() {
        this.commentCount = Math.max(0, this.commentCount - 1);
    }
    publish() {
        this.status = PostStatus.PUBLISHED;
        this.publishedAt = new Date();
    }
    generateSlug() {
        return this.title
            .toLowerCase()
            .replace(/[^a-z0-9가-힣\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 200);
    }
};
__decorate([
    PrimaryGeneratedColumn('uuid'),
    __metadata("design:type", String)
], ForumPost.prototype, "id", void 0);
__decorate([
    Column({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], ForumPost.prototype, "title", void 0);
__decorate([
    Column({ type: 'varchar', length: 250, unique: true }),
    __metadata("design:type", String)
], ForumPost.prototype, "slug", void 0);
__decorate([
    Column({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], ForumPost.prototype, "content", void 0);
__decorate([
    Column({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ForumPost.prototype, "excerpt", void 0);
__decorate([
    Column({ type: 'enum', enum: PostType, default: PostType.DISCUSSION }),
    __metadata("design:type", String)
], ForumPost.prototype, "type", void 0);
__decorate([
    Column({ type: 'enum', enum: PostStatus, default: PostStatus.PUBLISHED }),
    __metadata("design:type", String)
], ForumPost.prototype, "status", void 0);
__decorate([
    Column({ type: 'uuid' }),
    __metadata("design:type", String)
], ForumPost.prototype, "categoryId", void 0);
__decorate([
    Column({ name: 'author_id', type: 'uuid' }),
    __metadata("design:type", String)
], ForumPost.prototype, "authorId", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ForumPost.prototype, "organizationId", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ForumPost.prototype, "isOrganizationExclusive", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ForumPost.prototype, "isPinned", void 0);
__decorate([
    Column({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ForumPost.prototype, "isLocked", void 0);
__decorate([
    Column({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ForumPost.prototype, "allowComments", void 0);
__decorate([
    Column({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumPost.prototype, "viewCount", void 0);
__decorate([
    Column({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumPost.prototype, "commentCount", void 0);
__decorate([
    Column({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumPost.prototype, "likeCount", void 0);
__decorate([
    Column({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], ForumPost.prototype, "tags", void 0);
__decorate([
    Column({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], ForumPost.prototype, "metadata", void 0);
__decorate([
    Column({ name: 'published_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ForumPost.prototype, "publishedAt", void 0);
__decorate([
    Column({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ForumPost.prototype, "lastCommentAt", void 0);
__decorate([
    Column({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ForumPost.prototype, "lastCommentBy", void 0);
__decorate([
    CreateDateColumn({ name: 'created_at' }),
    __metadata("design:type", Date)
], ForumPost.prototype, "createdAt", void 0);
__decorate([
    UpdateDateColumn({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ForumPost.prototype, "updatedAt", void 0);
__decorate([
    ManyToOne('ForumCategory', { lazy: true }),
    JoinColumn({ name: 'categoryId' }),
    __metadata("design:type", Promise)
], ForumPost.prototype, "category", void 0);
__decorate([
    ManyToOne('User'),
    JoinColumn({ name: 'author_id' }),
    __metadata("design:type", Function)
], ForumPost.prototype, "author", void 0);
__decorate([
    ManyToOne('User', { nullable: true }),
    JoinColumn({ name: 'lastCommentBy' }),
    __metadata("design:type", Function)
], ForumPost.prototype, "lastCommenter", void 0);
__decorate([
    ManyToOne('Organization', { nullable: true }),
    JoinColumn({ name: 'organizationId' }),
    __metadata("design:type", Object)
], ForumPost.prototype, "organization", void 0);
ForumPost = __decorate([
    Entity('forum_post'),
    Index(['categoryId', 'status', 'isPinned', 'createdAt']),
    Index(['organizationId', 'status', 'createdAt'])
], ForumPost);
export { ForumPost };
//# sourceMappingURL=ForumPost.js.map