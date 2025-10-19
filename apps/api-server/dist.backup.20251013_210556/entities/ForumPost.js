"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForumPost = exports.PostType = exports.PostStatus = void 0;
const typeorm_1 = require("typeorm");
const ForumCategory_1 = require("./ForumCategory");
const User_1 = require("./User");
var PostStatus;
(function (PostStatus) {
    PostStatus["DRAFT"] = "draft";
    PostStatus["PUBLISHED"] = "publish";
    PostStatus["PENDING"] = "pending";
    PostStatus["REJECTED"] = "rejected";
    PostStatus["ARCHIVED"] = "archived";
})(PostStatus || (exports.PostStatus = PostStatus = {}));
var PostType;
(function (PostType) {
    PostType["DISCUSSION"] = "discussion";
    PostType["QUESTION"] = "question";
    PostType["ANNOUNCEMENT"] = "announcement";
    PostType["POLL"] = "poll";
    PostType["GUIDE"] = "guide";
})(PostType || (exports.PostType = PostType = {}));
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
exports.ForumPost = ForumPost;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ForumPost.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], ForumPost.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 250, unique: true }),
    __metadata("design:type", String)
], ForumPost.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], ForumPost.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ForumPost.prototype, "excerpt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PostType, default: PostType.DISCUSSION }),
    __metadata("design:type", String)
], ForumPost.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PostStatus, default: PostStatus.PUBLISHED }),
    __metadata("design:type", String)
], ForumPost.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], ForumPost.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], ForumPost.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ForumPost.prototype, "isPinned", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], ForumPost.prototype, "isLocked", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], ForumPost.prototype, "allowComments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumPost.prototype, "viewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumPost.prototype, "commentCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], ForumPost.prototype, "likeCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], ForumPost.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ForumPost.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ForumPost.prototype, "publishedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ForumPost.prototype, "lastCommentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", String)
], ForumPost.prototype, "lastCommentBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ForumPost.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ForumPost.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ForumCategory_1.ForumCategory, { lazy: true }),
    (0, typeorm_1.JoinColumn)({ name: 'categoryId' }),
    __metadata("design:type", Promise)
], ForumPost.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'authorId' }),
    __metadata("design:type", User_1.User)
], ForumPost.prototype, "author", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'lastCommentBy' }),
    __metadata("design:type", User_1.User)
], ForumPost.prototype, "lastCommenter", void 0);
exports.ForumPost = ForumPost = __decorate([
    (0, typeorm_1.Entity)('forum_post'),
    (0, typeorm_1.Index)(['categoryId', 'status', 'isPinned', 'createdAt'])
], ForumPost);
//# sourceMappingURL=ForumPost.js.map